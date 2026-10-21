# CI inicial — Issue #13

## Objetivo e escopo

[Issue #13](https://github.com/AlineRaquelC/gestor-diario/issues/13), technical-task,
prioridade alta, Sprint 1. Implementação em ci/sprint-1-validation, baseada em dev
limpa e atualizada no commit 2ec581e. Sprint com 14/15 Issues concluídas (93,3%);
#13 permanece aberta até integração. Sem funcionalidade de produto, alteração de
regra de negócio, atualização de dependências, Android build ou trabalho da Sprint 2.

Antes não havia workflow executável; .github/workflows/README.md descrevia CI futuro.
A implementação acrescenta o workflow CI e validações auditáveis, sem esconder a
dívida histórica nem deixar regressões novas passarem. Comandos, triggers, versões,
permissões e operação estão no [README do workflow](../../.github/workflows/README.md).

## Auditoria anterior à implementação — 21/10/2026

Auditoria após npm ci em cada pacote, com Node 24.21.0 e npm 11.19.0. Nenhuma
dependência/lockfile foi atualizada. Logs, fixtures e bancos ficaram somente em /tmp.

| Comando na base dev | Resultado real |
|---|---|
| Raiz: npm ci | aprovado |
| Raiz: npm run lint | exit 1; 3 erros e 10 warnings |
| Raiz: npm test -- --runInBand | exit 1; 20 suítes/322 testes aprovados, 12 suítes falharam na configuração |
| Raiz: npx tsc --noEmit --pretty false | exit 2; 11 diagnósticos |
| Backend: npm ci | aprovado |
| Backend: npm run db:migrate | aprovado em /tmp/gestor-issue13-audit/backend.db |
| Backend: npm run typecheck | aprovado |
| Backend: npm test | 278 testes aprovados em 11 suítes |
| Backend: npm run build | aprovado |

As 12 falhas globais Jest são as 11 suítes Vitest do backend mais App.test.tsx.
No App, a primeira falha atual é importação ESM do AsyncStorage sem transformação;
React Navigation ESM consta também das evidências anteriores. Essas falhas não
foram tratadas como testes aprovados. test:ci separa Vitest e exclui somente o
App.test.tsx exato; preserva a configuração global e todas as demais suítes mobile.

As instalações também informaram vulnerabilidades nas dependências travadas
(raiz: 56; backend: 5). Elas não foram corrigidas ou apresentadas como resolvidas
nesta Issue de CI; não foi executado npm update/audit fix. O CI inicial valida
instalação, lint, tipos e testes, sem declarar auditoria de dependências limpa.

## Identidade da dívida

TypeScript: 8 ocorrências TS2769 de StatusBar/backgroundColor, uma por tela:
CreateProjectScreen, EditProjectScreen, EditTaskScreen, HomeScreen, NewTaskScreen,
ProjectDetailsScreen, ProjectsScreen e TaskDetailsScreen. Mais 3 ocorrências
TS18048 em TaskDetailsScreen (task possivelmente undefined). Total **11 ocorrências
em 9 identidades**; a mensagem completa e a contagem constam no JSON versionado.

ESLint: 3 erros @typescript-eslint/no-unused-vars em backend/tests/tasks-update.test.ts,
para _project, _subtasks e _originalUpdated. Mais 10 warnings react-native/no-inline-styles:
CreateProjectScreen (2), EditProjectScreen (2), EditTaskScreen (1), HomeScreen (1),
NewTaskScreen (1), ProjectDetailsScreen (2) e TaskDetailsScreen (1). O número seis
registrado na #12 correspondia apenas ao lint de arquivos alterados, não ao global.
O job Mobile executa esse lint global também sobre o backend, que não possui script
lint próprio, sem excluir seus fontes/testes para esconder os três erros.

## Comparação e critérios de falha

Os wrappers iniciam o executável real instalado pelo lockfile usando o Node atual.
A saída é capturada e validada; falta de ferramenta, sinal, erro fatal, formato
inesperado ou status incoerente falham. Não há fallback para exit 0.

A comparação usa arquivo + código TS (ou regra/severidade ESLint) + mensagem
normalizada + contagem por identidade. Ignora linha/coluna, normaliza whitespace
e ordena sequências adjacentes de literais de união, preservando todos os membros.
Não há regex/wildcard de aceitação por arquivo, código ou mensagem. A baseline
não é simplesmente uma quantidade de erros tolerados.

11 conhecidos passam; 8 conhecidos passam; 11 conhecidos mais um novo falham.
Trocar um diagnóstico por outro mantendo o total também falha. Repetir um erro
conhecido além de sua contagem falha. O mesmo vale para warnings. Reduções não
exigem ampliar/reescrever a baseline; sua limpeza deve acompanhar a correção da
dívida para impedir retorno futuro. A geração inicial ocorreu a partir da auditoria;
não existe regeneração automática pelo CI.

A configuração TS mobile estende a raiz sem desligar strict ou regras existentes.
Exclui backend apenas porque ele possui compilador/configuração e job próprios,
ambos estritos. Exclui dependências/Pods como na base. Tipos Node do ambiente Jest
são explícitos, evitando depender de tipos ambientais transitivos dos imports do
backend. A configuração mobile reproduziu os mesmos 11 diagnósticos globais da base.

ESLint CI herda as regras existentes e acrescenta suporte de parser Node moderno
para .mjs/.cjs; seus scripts e configs também entram no lint. Nenhuma regra foi
desativada. O workflow não usa continue-on-error, não ignora retorno de teste e
não modifica TypeScript/ESLint para apagar diagnósticos.

## Execução

Jobs Mobile e Backend independentes em ubuntu-latest, com Node 24.21.0 e npm ci.
Cache npm por package-lock.json próprio; nenhum cache manual de node_modules/banco.
Triggers em PR para dev/main, push dev/main e disparo manual. Concurrency cancela
execuções antigas da mesma ref; timeout de 15 minutos por job. Permissão apenas
contents: read, sem persistir credenciais de checkout ou usar secrets customizados.

O backend migra banco descartável em runner.temp, com TASK_TIMEZONE explícito,
antes de typecheck, testes e build. Não lê arquivo SQLite versionado, não depende
de serviço externo e não usa banco pessoal. Não há APK/Gradle, branch protection,
merge automático, permissões administrativas ou publicação.

## Reprodução local dos jobs

Após nova instalação limpa por npm ci em cada pacote, todos os comandos equivalentes
aos jobs passaram: 16 testes dos validadores, lint:ci (3 erros/10 warnings conhecidos,
sem regressão), typecheck:ci (11 conhecidos, sem regressão) e 322 testes mobile em
20 suítes. Backend: migration em outro arquivo temporário, typecheck, 278 testes
em 11 suítes e build aprovados. Instalações não alteraram os lockfiles.

Os testes dos validadores executam as ferramentas reais e verificam exit 1 para
regressões; fixtures temporárias não entram no produto/Git. Restrições locais do
sandbox ao criar processos-filhos foram tratadas executando as validações com a
permissão apropriada, sem transformar EPERM em sucesso. O workflow em runner
GitHub não depende dessa permissão local.

YAML foi analisado localmente; diff --check aprovado. Nenhuma alteração em src/,
backend/src/, dependências ou regras de produto. docs/prompts continua ausente.
A conclusão operacional exige ainda observar **Mobile** e **Backend** no run real
do PR; sucesso local/validade sintática não substituem a execução do Actions.

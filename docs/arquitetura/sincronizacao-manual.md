# Sincronização manual — Issue #12 / RF20

## Estado consolidado — 2026-10-21

Issue #12 concluída; [PR #33](https://github.com/AlineRaquelC/gestor-diario/pull/33)
integrado em `dev`. Sprint 1: **15/15 = 100%, 0 Issues abertas**.
As seções seguintes preservam a auditoria e a execução anteriores ao merge;
menções a Issue aberta, revisão pendente ou outras Issues não iniciadas são
históricas e não representam o estado atual. Limites técnicos continuam válidos
conforme o [fechamento consolidado](../sprints/sprint-1.md).

## Registro histórico da implementação

## Auditoria e estratégia antes da implementação

Branch `feature/manual-sync`, criada de `dev` limpa e atualizada em 21/10/2026.
Issue aberta, RF20, prioridade alta, milestone nº 1 (Sprint 1).

O modelo Task está no TaskContext: o `id` de tarefas integradas já é o UUID da API;
legado pode usar IDs locais e somente texto `project`. Project está no
ProjectContext, com `id` local e `remoteId` opcional. `resolveProject` já consulta
por ID e provisiona apenas o projeto selecionado. Nenhuma identidade por nome é
segura. ProjectContext ainda persiste CRUD local; edição e exclusão de projetos
possuem regras divergentes nas telas (renomear/mover para Geral por texto).
TaskContext hidrata cache e mescla GET /tasks, preservando registros locais.
Subtarefas remotas têm `remote: true`; filhos locais são preservados pelo adapter.
Notes/History são consultados separadamente por taskId e ficam em memória.
API usa Services → Repositories → Drizzle → SQLite; GET operacional omite
soft-deleted. DELETE de projeto já bloqueia qualquer Task vinculada, inclusive
excluída. Não existe fallback Geral com identidade canônica.

Decisões para implementação:

1. Ação explícita em Configurações, com trava de concorrência e feedback real.
   Nenhum upload em background. Context orquestra services pelo cliente api.ts.
2. Ler local e remoto, reconciliar projetos antes de tarefas. Preservar IDs locais
   de projetos e salvar remoteId. Tasks migradas passam a usar ID canônico da API,
   conservando localId para rastreabilidade; tarefas já remotas mantêm seu ID.
3. API canônica para registros identificados após sucesso. Timestamps locais não
   são prova confiável de edição; divergências locais são preservadas em snapshots,
   antes da aplicação da versão do servidor. Sem last-write-wins inseguro.
4. Projeto sem remoteId: correlacionar somente por ID/clientId persistido, jamais
   por nome. Projeto com remoteId ausente no servidor: manter referência legada e
   sinalizar pendência, sem recriar. Tarefas dependentes locais permanecem intactas.
5. Task sem projeto identificável, datas inválidas ou vínculo indisponível: preservar
   e informar pendência. Não inventar projectId, datas nem associação por nome.
6. POSTs de migração precisam de clientId persistido **antes** do envio e único no
   SQLite: cobre timeout após commit e falha de persistência do remoteId. CRUD sem
   clientId mantém contrato anterior. Repetir clientId recupera o mesmo registro,
   inclusive tombstone, sem novo histórico/filhos. Uma migration aditiva é necessária.
7. GET de sincronização inclui tombstones de tarefas; GET normal permanece ativo.
   Task identificada excluída nunca é reenviada nem ressuscitada pelo cache.
8. Legado envia apenas campos do pai. Subtasks/Notes/History antigos não são
   recriados: conteúdo original fica preservado localmente. Filhos remotos não
   são reenviados. Importação identificada permite datas passadas válidas, sem
   mudar a validação de novas tarefas normais.
9. Ledger local conserva chaves de criação, vínculos confirmados e snapshots.
   Cada confirmação é persistida antes do próximo envio. Falha interrompe a execução,
   conserva cache/Context e não informa conclusão. Reexecução recupera por clientId.
10. Estado consolidado é escrito em AsyncStorage antes de publicar nos Contexts.
    Pendências são explícitas, sem sucesso completo falso. Cache original inválido
    bloqueia sincronização e sobrescrita.
11. Política única de exclusão de projeto: bloquear projetos com tarefas; para remoto,
    consultar DELETE da API, que inclui soft-deleted. Nunca mover tarefas para Geral.
    Telas usam IDs em contagens, renomeação e detalhes.

## Validações previstas

Testes específicos: projetos locais/remotos/homônimos/ausentes, tasks locais/remotas,
projectId, tombstones, filhos, conflitos, idempotência, respostas perdidas, falhas
parciais, download, cache, concorrência, offline e reabertura. Preservar suites
backend e mobile, comparar TypeScript com a base e executar lint/diff --check.
Android: inventário anterior, cenário controlado sem limpar dados, duas execuções,
offline/retorno, fechar/reabrir e restart da API. Resultados efetivos serão registrados
neste documento; roteiro não equivale a teste executado.

## Contrato implementado e persistência

`SettingsScreen → TaskContext.synchronizeManually → syncService → projectService /
taskService → apiRequest`. A URL Android continua `http://10.0.2.2:3000`. Os reads
iniciais existentes continuam lendo a API; não fazem upload nem acionam sync.
Home, Dashboard, Calendário e filtros continuam derivados dos mesmos Contexts.

`@taskflow:projects` conserva id local e remoteId; projetos baixados pela primeira
vez usam id remoto também como id local. `@taskflow:tasks` usa id canônico e
remoteId para dados remotos; localId registra a identidade anterior à migração.
projectId passa a apontar para o ID remoto confirmado. O texto project serve só
para exibição. Não se associam registros com base em título/nome nem se reescrevem
IDs de projetos locais utilizados por rotas/seletores.

`@taskflow:sync-ledger` contém entries por `project:<id local>` / `task:<localId ou
id>`, com clientId persistido antes do POST, remoteId confirmado e snapshots
locais por identidade. É apoio de recuperação em AsyncStorage, nunca enviado
integralmente à API. As confirmações intermediárias ficam no ledger mesmo se a
execução falha antes de publicar nos Contexts. Se a resposta do POST se perde ou
falha a gravação do remoteId, o clientId previamente persistido permite recuperar
o mesmo registro na API ou repetir o POST idempotente. O SQLite conserva chaves
únicas também após restart e soft-delete. As chaves não expiram nem são secrets.

Após reconciliação há nova leitura de Projects/Tasks. Só depois de confirmar essa
leitura se escrevem cache de projetos, cache de tarefas e, por último, ambos os
Contexts. AsyncStorage não oferece transação entre as duas chaves: se a segunda
escrita falha, a primeira pode conter projetos já confirmados, enquanto tarefas
e Contexts permanecem anteriores. Isso não remove registros/vínculos; o ledger
e clientIds permitem retomar. Não se declara sucesso nesse caso. Não há clear,
removeItem, substituição preventiva por arrays vazios ou limpeza de snapshots.

Travas imediatas bloqueiam sync duplicado, exclusão de projeto concorrente,
mutações de tarefas/filhos/notas e alterações locais de projetos durante sync.
A sincronização aguarda filas de persistência existentes e exige hidratação
segura dos dois caches. Aguarda também a janela de desfazer de exclusão de tarefa.
Erro/JSON inválido no cache preserva o conteúdo original e bloqueia sobrescrita.

## Conflitos, legado e limites do MVP

Tasks identificadas seguem o servidor, independentemente do updatedAt local.
Leituras comuns preservam divergências em syncSnapshot/syncSnapshots, inclusive
múltiplas versões sucessivas, antes de sobrescrever os campos operacionais.
O sync também as arquiva no ledger. Não se confia em timestamps antigos como
prova de edição local. Snapshots não entram em POST/PATCH e não criam histórico
remoto fictício. Não há interface de merge/restauração de snapshots neste MVP.

Projetos editados localmente recebem dirty. Só se envia PATCH se houver updatedAt
anterior confirmado e ele ainda coincidir com a API. PATCH envia expectedUpdatedAt;
o Service compara novamente dentro da transação e retorna 409 PROJECT_CONFLICT
se houve edição concorrente. Sem baseline confiável ou com divergência, servidor
prevalece e a versão local é arquivada. Não há sobrescrita silenciosa por relógio.

Projeto com remoteId ausente no servidor permanece com syncPending e referência
local. Não é recriado. Tarefas locais dependentes permanecem pendentes; tarefas
remotas disponíveis mantêm o vínculo real. UUID de Task antiga ausente também é
tratado conservadoramente como identidade remota indisponível, sem recriação.
Um UUID local sem prova de origem remota pode exigir reconciliação futura; o dado
é preservado. Identidades desconhecidas não são resolvidas por semelhança textual.

Sem projectId, projeto resolvido, título/prioridade/datas válidos, o legado fica
local com syncPending. Datas passadas válidas são enviadas por importação
identificada (clientId); o POST normal mantém a validação de início atual/futuro.
Não se fabricam datas nem se cria projeto Geral para acomodar registros incompletos.
Tarefas pendentes continuam nas visualizações locais cabíveis; nenhuma FK inválida
é enviada. O feedback distingue conclusão, pendências e falha, sem relatório complexo.

Filhos de tarefas já remotas não são reenviados. Tasks locais enviam somente pai;
subtarefas locais, lembretes e quaisquer campos legados adicionais são preservados
no cache e snapshot original. Notes/History integrados continuam nos endpoints
próprios e não são copiados; histórico novo contém somente o CREATED real da
importação. Não há migração automática de filhos antigos, fila offline complexa
ou reprodução de alterações offline. Falhas de rede interrompem o fluxo, preservam
Context/cache e não mostram conclusão. A próxima tentativa reutiliza identidades.

GET /tasks?includeDeleted=true retorna tombstones somente para o sync; a lista
operacional e o detalhe permanecem filtrados. Registro local com mesma identidade
de tombstone é arquivado e removido da coleção operacional, nunca restaurado por
upload. DELETE/RESTORE existentes e a janela de cinco segundos permanecem.

Política única de projeto: bloquear exclusão com dependentes, alinhada à API #3.
Dados remotos exigem DELETE confirmado; o backend considera Tasks soft-deleted.
No mobile, legado sem projectId impede exclusão conservadoramente até resolver
vínculos, pois não é seguro afirmar a qual projeto pertence. Não há reassociação
para Geral, cascata, alteração por nome ou remoção de referência com dependentes.
Nomes/cor/ícone permanecem editáveis; contagens e detalhes usam id/remoteId.

## Validação automatizada — 21/10/2026

Backend, dentro de backend/:

```bash
npm run db:migrate
npm run typecheck
npm test
npm run build
```

Todos aprovados: **278 testes em 11 suítes** (268 anteriores + 10 novos).
Migration aplicada também no banco de desenvolvimento, sem apagar dados.
O teste de upgrade existente passou a inserir as fixtures antigas via SQL do
schema antigo antes de usar o schema atual; preserva verificações integrais de
Tasks, Notes, Subtasks, histórico, FKs e reabertura. A migration aditiva é testada
em bancos limpos e existentes. Os testes HTTP precisam poder abrir portas locais;
no ambiente restrito, foram executados com a permissão apropriada.

Mobile, na raiz:

```bash
npm test -- --runInBand __tests__ --testPathIgnorePatterns=App.test.tsx --silent
npx eslint src/services src/context src/screens/SettingsScreen.tsx src/screens/CreateProjectScreen.tsx src/screens/ProjectsScreen.tsx src/screens/ProjectDetailsScreen.tsx src/screens/EditProjectScreen.tsx __tests__/syncService.test.ts __tests__/ManualSync.integration.test.tsx __tests__/TaskContext.integration.test.tsx __tests__/taskService.test.ts
npx tsc --noEmit
git diff --check
```

**322 testes em 20 suítes aprovados** (279 anteriores + 43 novos). São 28 casos
de reconciliação, 12 de integração Context/UI/cache e três de contrato HTTP mobile.
Uma expectativa anterior de sobrescrita remota foi ampliada para exigir também
a preservação da versão local em snapshot; suas demais verificações permanecem.
Cobertura inclui homônimos/IDs, projetos primeiro, vínculos, ausência remota,
legado inválido/incompleto, filhos locais, soft-delete, conflitos sucessivos,
POST confirmado com resposta perdida, falha ao persistir vínculo, download final,
offline, cache inválido, gravações parciais, trava, reabertura e exclusão segura.
As suítes anteriores de Dashboard, Calendário, filtros, exclusão/desfazer,
edição, status, subtarefas, Notes e History continuam aprovadas.

Lint alterado: zero erros e seis avisos de estilos inline já existentes nas três
telas de projetos. TypeScript global: **14 diagnósticos na base, 11 após alteração**;
comparação por arquivo/código/mensagem completa, ignorando posições, sem novo
diagnóstico. Foram eliminados três acessos possivelmente indefinidos nas telas
de projeto tocadas. Os 11 restantes e a incompatibilidade preexistente do Jest
global com App/React Navigation e suites Vitest permanecem fora do escopo.
Lint focado aprovado não significa lint global sem dívida. diff --check aprovado.

## Android real — 21/10/2026

AVD Pixel_7/API 36, app instalado, Metro da branch e API SQLite locais. Inventário
antes da preparação: **10 projetos / 36 tarefas no AsyncStorage**; cinco projetos
já com remoteId, 33 tarefas com projectId e três sem projectId. API: dez projetos
e 33 tarefas ativas. Nenhum dado existente foi apagado.

O legado não é criável pela UI integrada atual. A preparação controlada usou uma
cópia SQLite do cache com o app parado, transação e backup consistente incluindo
WAL. Foram verificados todos os registros anteriores e acrescentadas somente as
fixtures abaixo. Banco original e auxiliares ficaram preservados no dispositivo
e em /tmp; nenhum banco, dump, script ou captura entra no Git.

| Registro | Preparação | Resultado |
|---|---|---|
| Issue12 Legado A | projeto local id issue12-local-A, sem remoteId | criado na API, id local mantido e remoteId salvo |
| Issue12 Local A1 | Task local issue12-local-A1 ligada a A, início passado válido | criada na API, localId/remoteId/projectId coerentes |
| Filho legado preservado | filho local de A1, done=true | preservado localmente, sem cópia remota |
| Issue12 Remoto B | projeto criado na API com chave própria, cache vinculado | mesmo registro após todas as execuções |
| Issue12 Remota B1 | Task da API vinculada a B | mesmo registro após todas as execuções |

Primeira ação pela interface Configurações → Sincronizar: A e A1 apareceram na
API; B/B1 continuaram únicos. Resultado consolidado: **17 projetos / 35 tarefas
ativas na API**, **17 projetos / 38 tarefas no cache**. O crescimento adicional
de projetos corresponde aos projetos locais anteriores sem remoteId, preservados
como identidades distintas, sem fusão por nome. O feedback real informou
“Sincronização com 3 pendência(s). Dados locais preservados.” As pendências são
as três tarefas anteriores sem projectId; não houve falsa conclusão completa.

Fechar/reabrir e nova execução pela UI: comparação integral de Projects/Tasks da
API e das chaves @taskflow do cache sem diferenças. Nenhum registro duplicado.
A1 mantém projectId igual ao remoteId de A; id/remoteId canônicos e localId antigo
coerentes. A subtarefa local permanece com o mesmo id/título/done.

API parada, app reaberto e ação Sincronizar: mostrou “Falha na sincronização”,
orientando verificar conexão/backend. Comparação integral do cache com o anterior
sem diferenças: mesmos 17 projetos/38 tarefas, vínculos e conteúdo. Não apareceu
sucesso. A API foi reiniciada sobre o mesmo SQLite; nova sincronização pela UI
retomou, conservando integralmente os mesmos objetos da API e do cache.

Home mostrou os cards reais de A e B após consolidação. Calendário em 21/10
mostrou **duas tarefas**, A1 e B1, projetos corretos e seus badges existentes de
prazo próximo. Home → Filtrar e ordenar → Issue12 Legado A → Aplicar mostrou
somente A1; B1 ficou fora da lista. Filtrar/navegar não alterou Context persistido
nem API, confirmados pela comparação integral após os passos. Regras de #11,
#20 e #21 foram preservadas. Configurações segue a identidade visual existente.

Uma tentativa de automação na reabertura encontrou o bundle ainda carregando;
foi descartada como evidência de segunda execução. Os passos acima só foram
aprovados após o botão e o feedback real serem observados em cada execução.

Sem sincronização automática, background, WebSocket, autenticação, multiusuário,
backup cloud, merge visual ou implementação de CI #13. A Issue permanece aberta
até revisão/merge do PR para dev; não foi realizado merge automático.

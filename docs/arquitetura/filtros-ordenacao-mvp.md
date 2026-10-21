# Filtros e ordenação do MVP — Issue #21

## Escopo e rastreabilidade

[Issue #21](https://github.com/AlineRaquelC/gestor-diario/issues/21), PBI-10,
RF48/RF50. Implementação na branch `feature/task-filters-sorting`, baseada em
`dev` atualizada e limpa. Estado da Sprint conferido no GitHub em 20/10/2026:
15 Issues, 12 concluídas (80%), abertas #21, #12 e #13. A #21 permanece aberta
até integração; este documento não declara Sprint ou RF48 integralmente concluídos.

RF48 oficial inclui etiquetas; o recorte aprovado da Issue usa projetos/categorias
existentes, sem criar etiquetas. RF50 oferece prioridade, prazo e combinações dos
dois, com direção por critério. Não há filtros salvos, busca, favoritos, ordenação
manual, migração/sincronização (#12) ou CI (#13).

## Auditoria do Front e integração

Listagens encontradas: Home (lista geral em Para fazer/Concluídas), Calendário
(Dia/Semana/Mês), detalhes de projeto (tarefas de uma categoria). ProjectsScreen
contabiliza tarefas; detalhes/edição de tarefa também listam subtarefas, que não
são a lista geral. Antes desta Issue, não havia controles gerais de filtro ou
ordenação; somente recortes implícitos de conclusão, projeto e data do calendário.

A Home é a listagem geral apropriada. Recebe `TaskListControls` junto à lista;
seu TaskCard atual, cores, tipografia e navegação foram preservados. O componente
TaskCard compartilhado existente não fornecia controles de filtros. Nenhuma nova
rota ou dependência foi necessária. Detalhes de projeto e seu recorte legado por
nome permanecem sob a integridade geral da #12; não foram expandidos nesta Issue.

Fluxo: **API/cache → TaskContext.tasks operacional → helpers puros + useMemo →
renderização da Home**. Não há HTTP na tela, segunda coleção persistente, escrita
no Context/cache por filtragem, alteração de schema ou mudança no backend.

## Filtros e combinação

| Filtro | Opções | Valores/regra |
|---|---|---|
| Status | Todos, Pendentes, Parciais, Concluídas | all, todo, in_progress, completed |
| Prioridade | Todas, Alta, Média, Baixa | all, high, medium, low |
| Projeto | Todos os projetos, Sem projeto, projetos reais | projectId comparado a id/remoteId |
| Período | Todos, Hoje, Semana, Mês | dia local; semana de segunda a domingo |

Categorias se combinam por **interseção (AND)**: Projeto B + Alta + Parciais + Mês
seleciona somente tarefas que satisfazem os quatro critérios. Padrão: todos, sem
restrição, mantendo as seções existentes. O período da lista é independente do
seletor de período do Dashboard.

O painel mantém uma seleção em edição. Aplicar confirma; Cancelar e Voltar do
Android descartam mudanças ainda não aplicadas. Limpar filtros, na lista, e
Restaurar padrão, no painel, limpam filtros **e ordenação**. A indicação discreta
mostra quantidade de filtros ativos e/ou ordenação ativa. Estado é apenas de
apresentação em memória; não há preferência persistida.

Quando há tarefas disponíveis e a interseção é vazia: “Nenhuma tarefa encontrada
com esses filtros.” Sem cadastro: “Nenhuma tarefa cadastrada”. Carregamento e
falha de consulta mantêm os tratamentos anteriores; filtrar não dispara consulta.

## Identidade de projeto e legado

O ProjectContext fornece nomes e identidades. A seleção de projeto local aceita
`task.projectId === project.id` ou `project.remoteId` quando disponível; a seleção
de um remoteId também resolve o projeto correspondente. Nunca associa por nome.
Projetos homônimos permanecem distintos. remoteId ausente não corresponde a tarefa
sem projectId.

Como na edição existente, vínculos reais retornados nas tarefas que ainda não
constam no ProjectContext são opções de apresentação com seu projectId e nome
exibido. Isso não importa projetos, modifica IDs ou reconcilia dados. Um ID não
resolvido continua filtrável por igualdade exata. IDs inexistentes não causam erro.

Sem projeto significa ausência de projectId, mesmo que o legado possua texto em
`project`; não se infere identidade pelo nome. Tarefas locais antigas continuam
visíveis no modo Todos se já estiverem no Context. Status canônico prevalece sobre
done; para legado sem status, done serve de fallback. Reutiliza normalizeTaskStatus
para review → in_progress, sem inventar estado.

Soft-delete permanece responsabilidade da #10: usa exclusivamente tasks operacional,
sem consultar cache bruto, histórico ou retenção do desfazer. Removidas não
reaparecem ao aplicar, ordenar ou limpar. Apenas restauração confirmada no Context
pode recolocá-las na lista.

## Datas e ordenação

Filtro de período reutiliza taskCalendarDay, localDay e periodBounds das #11/#20:
dueDate válida, senão startDate válida. Sem ambas, fica fora dos períodos, mas
continua em Todos. YYYY-MM-DD é dia local sem deslocamento UTC; timestamps ISO
seguem o calendário local. Hoje usa o relógio da Home, atualizado a cada minuto
e ao retornar ao primeiro plano. Limites incluem primeiro e último dia.

Ordenações disponíveis:

- Prioridade: Alta → baixa (decrescente) ou Baixa → alta (crescente).
- Prazo: Mais próximo → mais distante (crescente) ou inverso (decrescente).
- Prioridade, depois prazo: prioridade decide primeiro; prazo desempata.
- Prazo, depois prioridade: prazo decide primeiro; prioridade desempata.

Nas combinações, cada direção é independente. Prioridade tem ranking explícito
high=3, medium=2, low=1, sem comparação alfabética nem associação com atraso.
Prioridades inválidas do legado ficam ao final do respectivo critério.

A ordenação por prazo usa **somente dueDate válida**, por dia local. Não fabrica
prazo a partir do início: prazo ausente/inválido fica ao final em ambas as direções.
Na combinação com prioridade principal, isso vale dentro de cada prioridade.
Empate em todos os critérios preserva o índice original da coleção operacional,
tornando a ordem estável para os mesmos dados, sem criar critério de negócio novo.

sortTasks ordena uma cópia com índices, sem alterar array ou objetos de entrada.
Com ordenação explícita, a Home usa uma única lista “Tarefas”, incluindo concluídas,
para respeitar a ordem global. Sem ordenação, preserva as seções Para fazer e
Concluídas. Cards e ações de abrir/concluir continuam os mesmos.

## Dashboard e Calendário

Dashboard e cards de projetos continuam recebendo tasks completo, com as regras
de #11: métricas por período próprio, atrasadas e projetos gerais. Filtrar a lista
não altera os indicadores. Nenhum componente de métrica recebe visibleTasks.

Calendário permanece integralmente na #20: seleção Dia/Semana/Mês, agrupamento
por horário, atraso e prazo próximo não recebem filtros da Home. Apenas helpers
já existentes de datas são reutilizados; suas implementações não foram alteradas.
Não há herança de seleção entre telas.

## Validação automatizada

Executado em 20/10/2026, na raiz:

```bash
npm test -- --runInBand --testPathIgnorePatterns '/backend/' '__tests__/App.test.tsx' --silent
npx eslint src/utils/taskFilters.ts src/components/TaskListControls.tsx src/screens/HomeScreen.tsx __tests__/taskFilters.test.ts __tests__/TaskFilters.integration.test.tsx
npx tsc --noEmit
git diff --check
```

- 279 testes em 18 suítes mobile aprovados, sendo 38 novos em duas suítes.
- Helpers: todos os status/prioridades, id/remoteId/sem projeto/IDs desconhecidos,
  homônimos, legado, datas inválidas/fallback/ISO, Hoje/Semana/Mês/Todos,
  limites de mês/ano, interseções, critérios individuais/combinados, direções,
  sem prazo, empate estável e entradas congeladas.
- UI com ProjectProvider e TaskProvider reais: abrir/editar/aplicar/cancelar,
  Voltar Android, limpar/restaurar, indicador, sem resultados, reatividade à
  meia-noite, ordenação global incluindo concluídas, Context e cache inalterados,
  ausência de chamadas de leitura/mutação ao filtrar e métricas preservadas.
- Exclusão confirmada no Context seguida de filtros/ordenação/limpeza não reaparece;
  restauração confirmada volta à lista. Suítes anteriores de exclusão/desfazer,
  Dashboard, Calendário e demais fluxos integrados preservadas.
- Lint: zero erros, um aviso preexistente de estilo inline no TaskCard da Home.
- TypeScript global: 14 erros antes e depois, mesmos arquivos/códigos/mensagens,
  normalizando posições e a ordem textual dos mesmos membros de união na
  mensagem do StatusBar. Nenhum diagnóstico novo nos arquivos adicionados.
- git diff --check aprovado; sem backend, dependências ou configuração alterados.

A execução focada exclui App.test.tsx e suites Vitest do backend, pelos conflitos
globais de Jest/ESM já documentados. Não equivale a declarar Jest global corrigido.

## Android — dados reais

Validação manual guiada por ADB em 20/10/2026, Pixel_7, Metro e API SQLite locais.
Foram iniciados o emulador e os dois serviços existentes, sem instalar dependências,
limpar o cache do aplicativo ou modificar o backend.

Dois projetos novos e quatro tarefas novas foram criados pela API e carregados
pelo fluxo real de leitura do TaskContext após reabrir o aplicativo:

| Tarefa | Projeto | Prioridade | Status | Prazo |
|---|---|---|---|---|
| Issue21 Alta pendente A | Issue21 Projeto A | Alta | Pendente | 20/10/2026 |
| Issue21 Media concluida A | Issue21 Projeto A | Média | Concluída | 20/10/2026 |
| Issue21 Baixa pendente B | Issue21 Projeto B | Baixa | Pendente | 25/10/2026 |
| Issue21 Alta parcial B | Issue21 Projeto B | Alta | Parcial | 31/10/2026 |

O painel mostrou os projetos retornados nas tarefas mesmo ainda ausentes no
ProjectContext local, preservando os respectivos projectIds, conforme a regra de
opções de apresentação. Dados anteriores do emulador foram mantidos.

Resultados pela interface:

- Projeto A mostrou suas duas tarefas; Projeto A + Pendentes mostrou somente Alta
  pendente A; Projeto A + Concluídas mostrou somente Media concluida A.
- Projeto B + Alta + Parciais mostrou somente Alta parcial B.
- Projeto B + Hoje ficou sem resultados; Semana mostrou somente Baixa pendente B;
  Mês mostrou Baixa pendente B e Alta parcial B.
- Projeto A + Alta + Concluídas exibiu a mensagem específica de ausência de
  resultados. Limpar filtros retornou à listagem geral e removeu o indicador.
- Captura inspecionada confirmou cores, chips, tipografia e ações do painel, sem
  redesenhar a Home ou a navegação.

Esses registros de teste permanecem somente no banco/cache de desenvolvimento;
roteiros, dumps e capturas não fazem parte do repositório.

Também aprovados no Android:

- Projeto B ordenado por prioridade alta → baixa e baixa → alta, com inversão
  real da ordem dos dois cards. Prazo crescente/decrescente também inverteu a
  ordem conforme 25/10 e 31/10. Prioridade, depois prazo, com direções independentes,
  manteve a precedência escolhida. Concluídas continuam incluídas quando cabíveis.
- Prioridade Alta sem restrição de projeto: percorrida a lista, sete tarefas com
  correspondência na API foram conferidas como HIGH, incluindo as duas novas de
  prioridade Alta. Registros locais anteriores foram preservados.
- Comparação integral de GET /tasks antes/depois de todas as operações de
  apresentação: os mesmos 33 registros, na mesma ordem e com todos os campos,
  inclusive updatedAt, inalterados.
- Calendário → Hoje continuou exibindo Outubro/2026, dois registros no dia 20,
  um no dia 25 e um no dia 31. Hoje manteve Alta pendente A e Media concluida A,
  incluindo concluída e badge PRAZO PRÓXIMO na pendente, sem herdar filtros.

O estado vazio também evita anunciar “Tudo em dia!” quando um filtro apenas
oculta tarefas pendentes existentes; há teste específico para esse caso e para
lista sem cadastro. A seleção não é persistida após encerrar o aplicativo.

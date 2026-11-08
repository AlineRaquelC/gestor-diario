# Issue #42 — refinamento técnico de metas e relatórios

08/11/2026 · [Issue #42](https://github.com/AlineRaquelC/gestor-diario/issues/42)
OPEN · PBI-17 parcial / RF22 parcial, RF46 e RF47 · Planning Poker **8**.
Somente decisões documentais; implementação e validação funcional pendentes.
Base `dev` limpa em `e97390d`; #39/#40/#41 CLOSED/completed.
[CI da base Mobile/Backend aprovada](https://github.com/AlineRaquelC/gestor-diario/actions/runs/42428305891).
Commit/push no máximo em **08/11/2026**; #43 e promoção dev → main fora desta etapa.

## Auditoria e regras de contagem

`src/utils/dashboard.ts` já oferece `dashboardMetrics`, `periodBounds`,
`localDay`, `isCompleted`, `isOverdue` e `percentage`. Home usa Tasks do Context,
seletor Hoje/Semana/Mês e relógio atualizado por minuto/foreground.
`TaskContext` hidrata AsyncStorage/API e remove tombstones da coleção ativa.
`taskService.fromApiTask` preserva datas civis no mapping; calendário/filtros
priorizam `dueDateKey` via `taskCalendarDay`, enquanto o dashboard usa
`localDay(dueDate) ?? localDay(startDate)`. Manter esta última regra no relatório,
sem modificar silenciosamente calendário, mapping ou filtros.

| Métrica | Decisão |
|---|---|
| Dia | Dia civil atual do dispositivo. |
| Semana | Segunda a domingo, inclusive, por `periodBounds('week', now)`. |
| Mês | Primeiro ao último dia civil, inclusive; sem intervalos UTC brutos. |
| Total | Tasks ativas com `localDay(dueDate) ?? localDay(startDate)` no período. Sem data válida, não entram. |
| Concluídas | `isCompleted(task)`: status canônico; `done` somente fallback legado. |
| Pendentes | Total menos concluídas; **inclui atrasadas**. |
| Atrasadas | Somente Tasks selecionadas no período para as quais `isOverdue(task, now)` é true: não concluída, dueDate válida anterior a hoje. |
| Progresso das Tasks | `percentage(completed, total)`; total zero resulta em 0%. |

**Diferença existente:** `dashboardMetrics.overdue` é global, explicitamente
documentado e testado em `__tests__/dashboard.test.ts` e
`docs/arquitetura/dashboard-dados-reais.md`. O relatório terá atraso por período;
Hoje, portanto, não terá atrasadas por essa definição civil. Não alterar a semântica
da Home nem de `isOverdue`. Na implementação, extrair seleção de período reutilizável
em `dashboard.ts`, consumida pelo dashboard e pelo relatório; reutilizar contagens,
`isCompleted`, `isOverdue` e `percentage`, sem segunda regra de seleção.

Um único objeto de relatório conterá período/limites, total, completed, pending,
overdue, taskProgress e goalProgress. Cards, texto e barras derivam desse objeto;
a tela não refaz filtros/contagens. Usa toda a coleção ativa do Context, sem herdar
busca, favoritas ou filtros da Home. Conclusão/reabertura, exclusão/undo e sync
recalculam pelo snapshot atual; atualizar relógio por minuto, foco e foreground.

## Metas e persistência

Modelo local `ProductivityGoals`: `daily`, `weekly`, `monthly` (`number | null`)
e `updatedAt` (ISO válido). Cada meta é independente e representa **quantidade
de Tasks concluídas pertencentes ao período**, não limite de criação ou tempo.
RF22 é parcial: não entrega tempo total nem limite máximo de tarefas cadastradas.
RF46/RF47 ficam restritos ao recorte desta Issue, sem declarar PBI-17 completo.

Aceitar apenas inteiros de **1 a 10.000**; rejeitar vazio ao salvar, zero, negativo,
decimal, texto e valor acima do limite. Ação explícita Remover meta grava null;
ausência de storage inicia os três valores null. Sem meta: “Meta não definida” e
“Definir meta”, sem usar zero implícito. Metas são objetivos recorrentes de cada
período atual, não registros históricos nem metas acumuladas entre períodos.

Progresso da meta = `min(100, percentage(completed, target))`; mostrar quantidade
real, por exemplo “3 de 5” e 60%; indicar meta atingida quando completed >= target,
inclusive excedente sem esconder a contagem. Não confundir com taskProgress;
atingimento depende da contagem, não do arredondamento do percentual.

Persistência em AsyncStorage, chave dedicada `@taskflow:productivity-goals:v1`,
envelope `{version: 1, goals}`. Validar versão, shape, inteiros/null e updatedAt.
Reutilizar padrão de leituras/escritas serializadas de `savedTaskFilterService`,
com serviço próprio. JSON inválido/versão desconhecida/falha de leitura não deve
ser convertido em defaults graváveis nem sobrescrito automaticamente. Mostrar
erro com tentativa novamente; bloquear gravação até leitura válida. Falha de escrita
preserva edição pendente e último estado confirmado, sem anunciar sucesso.
Após reabrir, recuperar metas confirmadas. Sem backend, migration, dependência
ou sincronização de metas; preferência apenas neste dispositivo.

## Relatório e UI mínima

Nova tela “Metas e relatórios”, acessível por ação em Configurações e rota no stack
existente. Preservar BottomNavigation e Home. Reusar padrão Hoje/Semana/Mês
(`DashboardPeriod` today/week/month) e mapear explicitamente para daily/weekly/monthly.
Oferecer edição/remoção da meta do período, cards Total/Concluídas/Pendentes/Atrasadas,
progresso das Tasks, progresso da meta, texto e barras.

Texto determinístico, sem IA: “Neste mês, 12 de 20 tarefas foram concluídas.
Há 8 pendentes, sendo 3 atrasadas.” Barras nativas em Views, labels/valores acessíveis,
escala comum pelo total, sem biblioteca. Explicitar que atrasadas são subconjunto
das pendentes, sem empilhar como categorias exclusivas nem somar as três barras.
Todos os valores vêm do mesmo objeto. Período vazio: quatro contagens zero,
“Nenhuma tarefa neste período.”, gráfico vazio e sem divisão por zero.
Com meta 5 e nenhuma concluída, manter “0 de 5”, 0%.

Contar cada ocorrência recorrente materializada como Task independente. Não contar
RecurrenceSeries, projetar futuras, materializar por navegação nem ampliar janela.
Estado carregando/erro deve distinguir hidratação de ausência real de Tasks.
Offline usa snapshot/cache disponível com indicação da disponibilidade; não inventa
dados ausentes. Não usar History/completedAt: uma Task concluída antes ou depois
do período conta pelo prazo/estado atual, não pela data em que foi concluída.

## Blocos e arquivos previstos (ainda não implementados)

| Bloco | Camadas e arquivos |
|---|---|
| T01 — modelo/persistência + helpers | [MOBILE] novo `src/models/productivityGoals.ts`; [PERSISTÊNCIA LOCAL] novo `src/services/productivityGoalsService.ts`, padrão de `src/services/savedTaskFilterService.ts`; [UTIL] extrair seleção em `src/utils/dashboard.ts` sem mudar contrato da Home. |
| T02 — relatório compartilhado | [UTIL] novo `src/utils/productivity.ts`, usando seleção/helpers existentes para objeto único/texto/progresso; [MOBILE] consumir `TaskContext.tasks`, sem alterar contratos do Context ou API. |
| T03 — UI | [UI] nova `src/screens/ProductivityScreen.tsx`, acesso em `src/screens/SettingsScreen.tsx` e rota em `src/navigation/AppNavigator.tsx`; reutilizar padrões de `HomeScreen.tsx`, tema e componentes nativos. |
| T04 — regressão/Android/fechamento | [TEST] ampliar `__tests__/dashboard.test.ts`, novos testes de produtividade, storage e integração da tela; [DOC] este arquivo e `docs/sprints/sprint-2.md`, evidências reais e PR para dev somente após autorização de implementação. |

Backend não é necessário: dados reais já disponíveis no Context; sem endpoint ou
schema novo. Auditar regressão de `src/utils/taskFilters.ts`, `src/utils/calendar.ts`
e recorrência, sem prever alteração funcional dessas camadas.

## Testes e aceite futuros

- Helpers: dia/semana/mês, limites inclusivos, mês/ano, fevereiro comum/bissexto,
  datas locais/invalidas, fallback startDate, precedência dueDate, vazio;
  status prevalece sobre done, pendentes/atrasadas por período, concluída vencida
  fora do atraso, reabertura, tombstone/undo e ocorrências materializadas independentes.
  Regressão mantém atraso global da Home e verifica ausência de projeção/materialização.
- Metas: três períodos, salvar/reabrir/remover independentemente, valores inválidos,
  JSON/versão/storage falhos sem sobrescrita, concorrência de gravação, progresso
  abaixo/igual/acima de 100%, null e meta com período vazio.
- Relatório/UI: mesmo objeto alimenta cards/texto/barras; seletor consistente,
  acessibilidade, erros e loading; Context atualizado por concluir/reabrir;
  relatório independente de busca/favoritas/filtros, relógio virando o dia.
- Android: definir diária/semanal/mensal; fechar/reabrir e conferir persistência;
  alternar Hoje/Semana/Mês; confrontar contagens com Tasks reais; concluir uma e
  verificar atualização; reabrir e verificar reversão; vazio; conferir texto/barras.
  Sem limpeza em massa ou criação artificial excessiva de dados.
- Na implementação: test:ci-scripts, lint:ci, typecheck:ci, test:ci, diff --check,
  Android debug/release e CI; sem ampliar baselines. Backend somente se afetado.
  Neste refinamento documental, apenas diff --check; não repetir regressão funcional.

## Estimativa e riscos

**8 pontos permanecem defensáveis**, reaproveitando Context/helpers e persistência
local, com gráfico nativo e sem backend. Prazo termina hoje: iniciar só após revisão
e autorização; o refinamento não garante capacidade para concluir implementação,
Android e CI antes do freeze. Storage inválido, fronteiras civis, diferença entre
atraso global/por período e confusão de meta versus conclusão exigem testes focados.
Dados refletem apenas snapshot atual disponível, não analytics histórico por eventos;
tempo/esforço, BI, exportação, backup e cronômetro ficam fora. Não alterar pontuação
da Issue, criar Tasks adicionais ou iniciar #43 automaticamente.

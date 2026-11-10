# Issue #58 — refinamento técnico da ativação por edição

**10/11/2026 — manutenção pós-Sprint 2; somente auditoria e plano.**
Issue [#58](https://github.com/AlineRaquelC/gestor-diario/issues/58)
confirmada **OPEN**, com labels bug, frontend, backend e test. Base `dev`
atualizada por `git pull`, árvore limpa, commit
`cad7d9b33d70650e5d1847ce56970a853fc62dfd`.
Branch documental: `docs/refine-58-recurrence-edit`; PR para `dev`, sem merge
automático. A data deste registro é a data solicitada para o refinamento.

Fontes: Issue #58, [registro da #40](../sprints/sprint-2-issue-40.md),
[Sprint 2](../sprints/sprint-2.md) e código referenciado abaixo.
Os registros da Sprint 2 permanecem históricos; esta manutenção não a reabre.
Não implementa correção, migration ou branch funcional; não altera Pixel 7,
dados do app, #43 ou Sprint 3. Não cria massa de teste.

## Diagnóstico confirmado por inspeção

Há uma lacuna de orquestração em
[`TaskContext`](../../src/context/TaskContext.tsx): `activateTaskRecurrence`
usa `mutateRule`, que publica e persiste somente a Task vinculada e o resumo
da série. Não chama `materializeRecurrences` nem `getTasks`.

A tela chama a operação correta; não se limita a alterar texto local.
No backend, `activate` cria a série e vincula a Task original atomicamente,
mas não gera as próximas ocorrências. Isso é coerente com o contrato separado
de materialização. O problema é a ausência da sequência posterior no Context.
O sintoma observado na apresentação é explicado por esse caminho; não houve
reprodução no dispositivo nesta execução nem inspeção do banco do Pixel 7.

## Comparação dos fluxos reais

| Etapa | A: nova Task recorrente | B: Task existente sem série → recorrente |
| --- | --- | --- |
| Tela | `NewTaskScreen` envia `recurrenceInput` e requestId para `addTask` | `EditTaskScreen` identifica `recurrenceChanged`; sem seriesId chama `activateTaskRecurrence` |
| Serviço/endpoint | `taskService.createTask`: `POST /recurrence-series` | `recurrenceService.activateRecurrence`: `POST /recurrence-series/from-task/:taskId` |
| Backend | `create`: série + primeira Task nova em transação | `activate`: série + vínculo na mesma Task; preserva ID, estado, filhos, reminders e histórico anterior; acrescenta evento UPDATED |
| Resposta HTTP | `{ series, firstOccurrence }`, sem lote futuro | `{ series, firstOccurrence }`, sem lote futuro |
| Primeira publicação | `addTask`: atualiza tasksRef/setTasks, revision e persiste primeira Task confirmada | `mutateRule`: atualiza tasksRef/setTasks, revision e persiste Task confirmada via persistConfirmed |
| Materialização | `POST /recurrence-series/materialize`, via `materializeRecurrences` | Ausente |
| Download | `GET /tasks`, via `getTasks` | Ausente |
| Snapshot final | `mergeReadTasks`, persistTasks, tasksRef/setTasks | Apenas snapshot anterior com Task original vinculada |
| Reminders | Reconciliação com snapshot final após persistência; escopo autoritativo condicionado aos guards | persistConfirmed considera apenas a Task original e mudança no fingerprint; não conhece futuras |
| Calendário | Recebe Tasks futuras do Context | Recebe só a Task original, apesar da regra confirmada |

Fontes: [NewTaskScreen](../../src/screens/NewTaskScreen.tsx),
[EditTaskScreen](../../src/screens/EditTaskScreen.tsx),
[taskService](../../src/services/taskService.ts),
[recurrenceService](../../src/services/recurrenceService.ts),
[rotas](../../backend/src/routes/recurrence-series.ts) e
[serviço backend](../../backend/src/services/recurrence-series.ts).
Task sem recorrência é criada por `POST /tasks`; alterações comuns usam
`PATCH /tasks/:id`, cujo payload não transporta regra nem vínculo de série.
Se houver alterações comuns e de regra, a tela tenta os dois comandos e trata
sucesso parcial. Preservar esse comportamento sem ampliar escopo nesta Issue.

### activateTaskRecurrence e edição

O [editor](../../src/components/TaskRecurrenceEditor.tsx) cria draft com
`originalFrequency: NONE`, `seriesId: null`, requestId estável e fuso dos
reminders existentes ou do dispositivo quando a Task nunca teve série.
Ao salvar DAILY, WEEKLY ou MONTHLY, a tela usa ativação. O journal
`@taskflow:recurrence-requests:v1` é persistido antes do POST, preservando
clientId para retry de resposta incerta.

Backend `activate` verifica clientId antes de criar, deriva template da Task
canônica, cria RecurrenceSeries com `materializedThrough = dueDate`, vincula
`recurrenceSeriesId` e `occurrenceKey = dueDate` e retorna a Task canônica.
Não cria cópia da Task original. A função do Context devolve hoje somente
`{ series, cacheSaved }`; não expõe falha de atualização das ocorrências.

Se já existe seriesId com frequência NONE, a tela usa
`changeRecurrenceRule` → `PATCH /recurrence-series/:id`, com revisão otimista
`expectedUpdatedAt`. Esse fluxo também não materializa imediatamente.
Cobrir a reativação NONE → frequência no plano genérico, sem criar outra série
e sem retroagir `materializedThrough`: regras editadas afetam apenas slots
ainda não materializados. DAILY → WEEKLY, WEEKLY → MONTHLY e → NONE devem
preservar as Tasks existentes, inclusive datas editadas e exclusões.

## Cache, Context, detalhes e calendário

`persistTasks` serializa escritas em `@taskflow:tasks`; existe também efeito de
persistência ao mudar `tasks`. `mergeReadTasks` concilia por ID remoto, preserva
dados locais/filhos e não substitui Task mais recente por GET antigo.
`mutationRevision`, `updating`, `dataGuard.activeTasks` e `dataGuard.syncing`
coordenam mutações e leituras. O snapshot atual não contém futuras Tasks porque
elas nem foram materializadas por esse caminho; não há evidência de descarte
de um lote já criado como causa primária.

[TaskDetailsScreen](../../src/screens/TaskDetailsScreen.tsx) lê a Task do Context
e mostra `recurrenceLabel(task.recurrence.frequency)`. O resumo da série já
veio confirmado da API, por isso exibe “Diariamente”. Regra persistida não
significa que existam Tasks futuras materializadas.

[CalendarScreen](../../src/screens/CalendarScreen.tsx) calcula contagens e listas
com `taskCountsByDay(tasks)` e `tasksForDay(tasks, selected)`, do Context.
Não consulta séries nem expande ocorrências virtuais. Usa resumos carregados
apenas para aviso de cobertura. Navegar no calendário não materializa.

Startup e foreground já executam materialização → GET → merge → persistência
→ publicação → scheduler, sob guards. Sync manual também materializa antes do
download, incluindo tombstones. Esses caminhos permitem recuperação posterior
online; foreground pode ser adiado por operação/undo em andamento e pode falhar.
Não prometer recuperação imediata offline nem geração ao simples navegar.

## Frequências, identidade e reminders

A lacuna afeta igualmente **NONE → DAILY/WEEKLY/MONTHLY**, tanto a primeira
ativação sem recurrenceSeriesId quanto a reativação de série NONE já vinculada.
Usar uma correção genérica, sem três patches por frequência.

O [domínio](../../backend/src/domain/recurrence/index.ts) limita a geração a
hoje → hoje + 31 dias inclusive, no fuso da série, após a cobertura confirmada.
DAILY é civil; WEEKLY usa a fase da âncora; MONTHLY limita o dia ao fim do mês,
sem drift. Testar datas com slot futuro dentro da janela; zero slots elegíveis
é resultado válido, por exemplo âncora além do horizonte.

Idempotência já é garantida por transação `immediate`, clientId único da série,
busca de slot incluindo tombstones e constraint
`UNIQUE(recurrenceSeriesId, occurrenceKey)` em
[tasks](../../backend/src/database/schema/tasks.ts). O
[repository](../../backend/src/repositories/tasks.ts) usa onConflictDoNothing;
não recria filhos/History quando não inseriu uma nova Task. Não alterar schema,
chaves, cobertura ou política de exclusão para resolver a orquestração.

Ativação preserva reminders e IDs da Task original, exige o mesmo fuso e copia
somente offsets para o template. Materialização cria reminders próprios por
nova Task. O [scheduler](../../src/services/reminderScheduler.ts) usa identidade
`task-reminder:<taskId>:<reminderId>` e reconcilia Tasks confirmadas, sem gerar
ocorrências. Repetir materialização não deve recriar reminders nem alarmes.
Reconciliar snapshot final depois de persistido; não reconciliar de modo
autoritativo uma lista parcial, obsoleta ou com cache falho. Não alterar política
de lembretes vencidos, precisão de alarmes ou permissões nesta correção.

## Plano mínimo de correção futura

1. Extrair do caminho recorrente de `addTask` um helper interno ao Context para
   atualizar a janela e publicar Tasks confirmadas. Reutilizar na criação e
   na ativação; aplicar também à reativação de série NONE com frequência ativa.
   Manter `mutateRule` como mutação de regra: não gerar ao desativar para NONE.
2. Após confirmação da ativação, manter Task/série em memória e persistir o
   snapshot inicial antes da etapa recuperável. Incrementar revision e manter
   lock/guard durante a operação. Não reenviar ativação já confirmada.
3. Executar uma materialização controlada e depois `getTasks`; conciliar com
   `tasksRef.current` via `mergeReadTasks`, filtrando deletedIds/tombstones.
   Persistir snapshot, atualizar tasksRef/setTasks e reconciliar reminders.
   Em cache falho, conservar o snapshot remoto em memória e informar pendência,
   sem iniciar novos alarmes dependentes desse cache.
4. Verificar revision/guards antes e depois dos awaits, especialmente escrita
   do cache. Não publicar GET obsoleto nem sobrescrever mutações concorrentes;
   se revisão mudou durante escrita, restaurar cache do snapshot atual como
   no lifecycle existente. Scheduler autoritativo somente com snapshot completo
   e sem mutação concorrente. O helper deve respeitar a própria operação ativa,
   sem bloquear a si mesmo pelo contador activeTasks.
5. Retornar estado explícito de materialização/refresh pendente, cache e
   scheduling, e a revisão mais recente da série confirmada pelo snapshot
   quando disponível. Materialização avança updatedAt da série: não deixar o
   draft com revisão antiga para uma edição seguinte.
6. `EditTaskScreen` apenas consome resultado e mostra aviso: “Recorrência salva;
   atualização das ocorrências pendente. Tente atualizar quando houver conexão.”
   Não copiar HTTP, merge/cache ou scheduler para a tela. Reutilizar/adaptar
   feedback existente da criação quando adequado.

Falha na materialização ou GET após série confirmada é sucesso parcial:
preservar série e Task, reportar pendência, recuperar em próximo startup,
foreground ou sync manual. Não desfazer série nem repetir POST para aparentar
atomicidade entre comandos separados. Falha antes da confirmação da ativação
mantém retry pelo mesmo requestId. Falha de cache é distinta de falha HTTP.
O serviço coalesce materializações simultâneas: testar ativação enquanto uma
materialização anterior está em voo para não tratar lote iniciado antes da
nova série como cobertura suficiente. Se necessário, aguardar esse lote e
executar uma passagem posterior à confirmação, sem retries ilimitados.

Camadas previstas: `src/context/TaskContext.tsx` (helper/contrato),
`src/screens/EditTaskScreen.tsx` (feedback), possivelmente
`src/models/reminderPresentation.ts` (mensagem compartilhada) e
`src/services/recurrenceService.ts` (somente se teste comprovar necessidade no
coalescing). NewTask reutiliza a operação existente. Backend, calendário,
schema e Android nativo não precisam de alteração funcional pela causa atual.

## Testes planejados e regressão

| Camada | Cobertura necessária |
| --- | --- |
| TaskContext.integration | Parametrizar NONE/sem seriesId → DAILY/WEEKLY/MONTHLY; confirmar sequência ativar → persistir → materializar → GET → merge/cache/publicação → scheduler; futuras no Context e helpers do calendário |
| TaskContext.integration | Reativar série NONE mantendo seriesId; cache igual ao snapshot; remount/restart e foreground repetidos; mesma identidade e quantidade; revisão da série atualizada |
| TaskContext.integration | Falha de materialização, GET e cache após ativação confirmada; não repetir POST, não rollback, pendência explícita, recuperação posterior; revision/guards contra GET antigo e exclusão concorrente; materialização já em voo |
| EditTaskScreen.integration | Operação correta nas três frequências; feedback de atualização pendente e cache/scheduler; retry da confirmação incerta com mesmo requestId; manter tratamento separado de alteração comum e regra |
| Backend recurrence-api | Ativação + materialização repetida nas três frequências, sem nova série/Task original; UNIQUE, filhos/History/reminders estáveis, tombstone não renasce; usar SQLite temporário isolado |
| Scheduler e calendário | Snapshot confirmado publicado alimenta listas/contagens reais; nenhuma expansão virtual; reminders da origem preservados, novos IDs próprios e nenhum agendamento duplicado após refresh/foreground |
| Regressão | Criação já recorrente e criação NONE; DAILY → WEEKLY, WEEKLY → MONTHLY, recorrência → NONE; preservar Tasks materializadas e cobertura; exclusão/undo/tombstones e reminders |

Lacuna atual: Context testa criação DAILY com materialização, persistência,
calendário e falhas parciais; edição testa chamada/retry de ativação com Context
mockado. Backend testa ativação preservando Task e gera futuras em chamada
explícita separada. Isso não verifica a orquestração real após edição.
Testes existentes de mudança de regra esperam nenhuma materialização imediata;
preservar essa expectativa nas trocas de frequência já ativas e na desativação,
acrescentando cobertura específica para reativação NONE.

Na implementação futura: testes direcionados acima, depois gates vigentes
`test:ci-scripts`, `lint:ci`, `typecheck:ci`, `test:ci`, backend
typecheck/test/build e `git diff --check`; CI Mobile/Backend verdes, sem ampliar
baselines. Nenhum teste funcional novo ou correção foi executado neste
refinamento documental; validação local deste PR é documental.

## Validação Android futura e limpeza obrigatória

Para cada DAILY, WEEKLY e MONTHLY, criar Task técnica sem recorrência, salvar,
editar para frequência, salvar, conferir label nos detalhes e ocorrências reais
nos próximos slots elegíveis do calendário dentro da janela. Usar horário
futuro quando houver reminders. Conferir mesma Task original, série/chave e
reminders; fechar/reabrir app; background → foreground; refresh/sync repetidos;
conferir quantidade/identidades e ausência de alarmes duplicados. Incluir falha
de conexão após ativação, aviso de pendência e recuperação online.
Executar também as transições/regressões da tabela. Registrar evidência por
frequência; não declarar Android aprovado com base apenas em testes Jest.

**Antes do merge da correção**, toda Task criada exclusivamente para teste
automatizado/manual, reprodução, Android ou QA da #58 deve ser removida pelo
fluxo canônico seguro. Usar ambiente isolado nos automatizados. Nas séries
técnicas, desativar geração e excluir as ocorrências técnicas pelo fluxo
canônico; verificar tombstones, ausência de regeneração, Home sem massa técnica
e nenhum reminder técnico agendado após cancelamento/reconciliação. Registrar
essa verificação no PR antes de liberá-lo para merge. Não apagar dados úteis,
não fazer SQL/AsyncStorage direto para limpeza e não confundir excluir uma
ocorrência com desativar série. Nenhuma limpeza geral foi feita nesta execução.
A Home zerada para Sprint 3 é trabalho separado após a correção.

## Planning Poker e encaminhamento

**Sugestão: 5 pontos**, sem alterar estimativa/Issue automaticamente. A causa
é pequena e não exige migration, mas o helper compartilhado, sucesso parcial,
revisão/guards/cache, coalescing, reativação NONE e testes Android nas três
frequências/reminders elevam o risco além de uma troca local de chamada.
3 pontos caberiam em uma simples sequência já encapsulada e coberta, condição
que o código atual não atende. Pontos não equivalem a dias.

Próxima execução funcional, somente quando autorizada: branch
`fix/58-recurrence-edit-materialization` a partir de `dev`, PR para `dev`,
CI verde, Android e limpeza técnica comprovados antes do merge. Este PR
documental referencia #58 sem fechá-la, não inicia implementação nem Sprint 3.

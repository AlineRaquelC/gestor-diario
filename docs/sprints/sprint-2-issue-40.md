# Refinamento técnico — Issue #40: tarefas recorrentes

## 1. Estado, fontes e recorte

**29/10/2026 — proposta técnica para revisão; implementação não iniciada.**
Issue [#40](https://github.com/AlineRaquelC/gestor-diario/issues/40) OPEN,
**Planning Poker 8**, origem **PBI-13 / RF08**. O prazo máximo de commit/push é
**08/11/2026**. Pontos não equivalem a dias nem comprovam capacidade disponível.

Preparação em `dev` limpa e atualizada no commit
`04e0037f76f4ba74247f5f8ce567ce85d8b17431`. A dependência
[#39](https://github.com/AlineRaquelC/gestor-diario/issues/39) está CLOSED/completed,
integrada pelo [PR #46](https://github.com/AlineRaquelC/gestor-diario/pull/46).
A [CI dessa base](https://github.com/AlineRaquelC/gestor-diario/actions/runs/40920291492)
concluiu Mobile e Backend com sucesso. Referência vigente: 513 testes mobile em
28 suítes, 317 backend em 13 suítes e 16 dos validadores CI. Não são testes de
recorrência. T12 de lembretes foi aprovada; não substitui a validação da #40.

Fontes lidas integralmente: Issue #40, [Sprint 2](sprint-2.md),
[Plano de Entregas](../backlog/entregas.md) e
[Requisitos oficiais](../requisitos/requisitos-oficiais.md#rf08--página-2).
RF08 exige repetição diária, semanal ou mensal e geração automática de ocorrências
futuras. Horizonte, fim de mês, escopo da edição e mecanismo de geração abaixo
são propostas de engenharia, não texto adicional do requisito oficial.

O recorte contempla Não repetir, Diariamente, Semanalmente e Mensalmente;
persistir/editar regra; identidade e geração idempotentes; reabertura e sync sem
duplicação; calendário real; compatibilidade com os lembretes da #39.

Ficam fora intervalos a cada N períodos, múltiplos dias da semana, feriados, dias
úteis, última sexta do mês, dependências entre Tasks, notificações avançadas e
regras independentes de repetição dos reminders. RF43–RF45 e REQ114–REQ116 não
são entregues por esta Issue. Não declarar PBI-13 integralmente concluído.

Este refinamento não cria código funcional, migration, banco, dependência ou
feature branch de implementação. O documento fica em branch `docs/`. Não inicia
#41 nem autoriza promoção `dev` → `main`.

## 2. Auditoria da arquitetura atual

A busca por `recurrence`, `recorr`, `series`, `occurrence`, `parentTask`,
`templateTask` e `generatedTask` em `src`, `backend/src`, `backend/drizzle`,
`specs` e `android/app/src` não encontrou conceito funcional de recorrência.
Não há regra, série, template recorrente, vínculo de ocorrência, gerador,
constraint de ocorrência ou contrato HTTP de recorrência. Menções em requisitos
e planejamento não representam implementação.

| Código auditado | Estado confirmado e consequência |
|---|---|
| [Task](../../src/context/TaskContext.tsx#L43) | Tem IDs local/remoto/clientId, datas civis auxiliares, status/progresso, subtarefas e reminders. Sem campos de série/ocorrência. Task é a unidade de navegação e operação. |
| [Schema Task](../../backend/src/database/schema/tasks.ts) e [reminders](../../backend/src/database/schema/task-reminders.ts) | `tasks` possui ID UUID, clientId único, projeto por FK, dias textuais, HH:mm opcional, status/done/progress, soft delete e fuso dos reminders. `task_reminders` pertence a Task, com IDs e offsets próprios. |
| [Migrations](../../backend/drizzle/meta/_journal.json) | Apenas 0000–0003; 0003 adicionou reminders. Não há tabelas/colunas de recorrência. Migrations antigas devem permanecer intactas. |
| [Validação HTTP](../../backend/src/schemas/tasks.ts) | Zod strict rejeita campos desconhecidos. Recorrência hoje não é aceita pelo POST/PATCH. PATCH parcial e `clientId` exclusivo de criação devem continuar explícitos. |
| [Task service backend](../../backend/src/services/tasks.ts) | CREATE/PATCH/DELETE/RESTORE e History em transações; datas comparadas com hoje em `TASK_TIMEZONE`; retries por clientId são resolvidos antes da validação temporal. Não gera Tasks ao concluir ou consultar. |
| [Task repository](../../backend/src/repositories/tasks.ts) | UUIDs por Task/reminder; transação SQLite `immediate`; joins de projeto e coleções reais; tombstones na consulta de sync. `triggerAt` é derivado na leitura, não uma coluna da Task nem um estado de série. |
| [History](../../backend/src/database/schema/task-history.ts), [subtarefas](../../backend/src/database/schema/subtasks.ts), [notas](../../backend/src/database/schema/notes.ts) | Todos vinculados a Task por ID/FK. History tem enum restrito. Copiar IDs de filhos ou History entre ocorrências violaria identidade; séries não podem usar seu ID no campo taskId do histórico. |
| [taskService mobile](../../src/services/taskService.ts) | Mapping reconstrói IDs remotos, chaves YYYY-MM-DD e reminders confirmados; DTOs não têm recorrência. `toApiTaskUpdate` distingue campo omitido; importação por clientId não inclui subtarefas legadas. |
| [TaskContext](../../src/context/TaskContext.tsx#L223) | API confirma antes de cache/scheduler. Startup/foreground consultam Tasks; filas/guards evitam leituras antigas sobre mutações. Conclusão/exclusão suprimem triggers; restore e subtarefas reconciliam. Sem geração no mount, render ou callback de conclusão. |
| [syncService](../../src/services/syncService.ts) | Sync manual: ledger de clientId persistido antes de upload, conciliação por IDs, snapshots de conflito e download final consolidado com tombstones. Task remota ausente não é recriada. Scheduler é chamado pelo Context somente após persistir o resultado. |
| [CalendarScreen](../../src/screens/CalendarScreen.tsx) e [helpers](../../src/utils/calendar.ts) | Listas/contagens derivadas de Tasks do Context; card abre taskId real. Não há fetch nem expansão virtual na tela. `taskCalendarDay` usa ISO dueDate/fallback startDate; ainda não prioriza `dueDateKey`. |
| [Helpers de período](../../src/utils/dashboard.ts) | Dias locais e semana segunda–domingo; métricas contam Tasks reais. Acrescentar templates à coleção tasks contaminaria contagens. |
| [Domínio Reminder](../../backend/src/domain/reminders/index.ts) e [modelo mobile](../../src/models/reminder.ts) | Offsets canônicos, IANA, dias civis, limite cinco e rejeição de local time ambíguo/inexistente. Novo reminder manual vencido é rejeitado; configuração existente pode permanecer vencida sem disparo retroativo. Legado é evidência separada. |
| [Scheduler](../../src/services/reminderScheduler.ts) e [adaptador Android](../../android/app/src/main/java/com/gerenciadortarefas/reminders/TaskReminderStore.kt) | Só Tasks/reminders confirmados; identidade `task-reminder:<taskId>:<reminderId>`; journal e fila; ignora concluídas/excluídas/triggers vencidos. Android usa AlarmManager inexato e recovery de registros existentes; não conhece séries nem gera Tasks no boot. |
| [Exclusão](../../src/hooks/useTaskDeletion.ts) e [restore](../../src/context/TaskContext.tsx#L444) | DELETE é lógico, com History. Undo é janela mobile de 5s; backend retorna undoUntil null e restaura mesma Task. A janela não deve virar regra de geração nem ser alterada incidentalmente. |

## 3. Decisão de arquitetura: série × ocorrência

| Critério | A — mover data da mesma Task | B — série gera Tasks independentes | C — ocorrências virtuais |
|---|---|---|---|
| Identidade | Um ID representa execuções diferentes; não identifica cada ocorrência | ID próprio por Task e vínculo estável com série | Exige identidade virtual e materialização quando houver interação |
| Histórico | Datas/status sobrepostos; conclusão passada perde representação própria | History por Task, sem misturar execuções | Necessita histórico/exceções fora do modelo atual |
| Conclusão individual | Concluir altera a próxima execução do mesmo registro | Cada ocorrência conclui/reabre independentemente | Exige camada persistente de exceções para status |
| Edição | Difícil distinguir mudança de regra de mudança da execução | Operação de Task distinta da edição explícita da série | Exige aplicar exceções sobre projeções |
| Delete/undo | Excluir remove a única representação da rotina | Tombstone por ocorrência; parar repetição é ação distinta | Exclusão precisa de exceção persistida para não reaparecer |
| Calendário | Não mostra simultaneamente futuras Tasks reais | Reutiliza taskId, contagens e navegação atuais | Precisa misturar registros e projeções sem duplicar |
| Reminders | Mesmo ID reagendado, sem coexistência por ocorrência | Reminder IDs próprios, scheduler existente por Task | Scheduler rejeita identidades não confirmadas; requer materialização |
| Sync | Mover data é mutação conflituosa sobre um único registro | Backend gera, cliente baixa Tasks e vínculos | Precisa sincronizar regra mais exceções e projeções |
| Offline | Só última data persistida | Tasks materializadas e journal já disponíveis | Projeção offline não equivale a Task/trigger confirmado |
| Idempotência | Repetir conclusão pode avançar data duas vezes | UNIQUE por série/slot e transação impedem duplicação | Exige conciliar identidade virtual com Task materializada |
| Complexidade | Poucas colunas, mas altera semântica de todo o lifecycle | Nova entidade e geração; reaproveita fluxos existentes | Mais estados e contratos novos em calendário, sync e scheduler |
| Prazo | Atalho inadequado para o aceite completo | Melhor ajuste ao recorte, com limites explícitos | Risco alto para Planning Poker 8 e prazo 08/11 |

**Recomendação: alternativa B.** Série persiste regra e conteúdo-base; ocorrências
são Tasks normais materializadas no backend. A série não aparece como Task,
não recebe status de conclusão e não entra no scheduler. Concluir uma ocorrência
não move sua data e não é condição para gerar a próxima.

A escolha decorre dos contratos auditados: calendário, History, subtarefas,
soft delete, sync e scheduler já operam por Task ID. Não depende de adoção de
biblioteca nova. Materialização deve ser limitada por janela, nunca infinita.

## 4. Onde persistir a regra

| Modelo | Avaliação |
|---|---|
| A — colunas em Task | Duplicar frequência/template por ocorrência cria múltiplas autoridades; usar uma Task como fonte torna exclusão/edição dessa Task um risco para toda a rotina. |
| B — apenas recurrence_series | Boa entidade para regra/template, mas ainda precisa de vínculo e unicidade em Tasks geradas. Sozinha não identifica suas ocorrências. |
| C — recurrence_rules separada | Regra 1:1 sem reutilização independente introduz tabela/join sem benefício no recorte. Não há RRULEs compartilhadas a atender. |
| D — híbrido | Uma `recurrence_series` com regra/template e metadados mínimos em Task. Separa autoridade da série do estado individual da ocorrência. |

**Recomendação: D, `recurrence_series` + vínculo/chave em `tasks`.** É a
persistência da alternativa B de arquitetura, não uma combinação com ocorrências
virtuais. Não criar uma tabela de regras além da série nem uma Task escondida de
template. O conteúdo-base é interno à recorrência; não implementa o catálogo de
modelos reutilizáveis de RF36/PBI-20.

## 5. Modelo tipado mínimo proposto

Representação conceitual, ainda sem schema ou DTO implementado:

```ts
type RecurrenceFrequency = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
type RecurrenceRule = { frequency: RecurrenceFrequency };

type RecurrenceTemplate = {
  title: string;
  description: string | null;
  projectId: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  time: string | null;                 // HH:mm; obrigatório se houver reminders
  startOffsetDays: number;             // dueDate - startDate, em dias civis
  subtasks: { title: string }[];
  reminders: { offsetMinutes: number }[];
};

type RecurrenceSeries = {
  id: string;
  clientId: string;                    // identidade durável da criação/retry
  rule: RecurrenceRule;
  timeZone: string;                    // IANA da série, inclusive sem reminders
  anchorDate: string;                  // YYYY-MM-DD da regra vigente
  template: RecurrenceTemplate;
  createdAt: string;
  updatedAt: string;
};

type OccurrenceLink = {
  seriesId: string;
  occurrenceKey: string;               // YYYY-MM-DD nominal do slot
};
```

No banco, frequency pode ser coluna da série; `rule` é agrupamento do contrato,
não outra cópia da frequência. Preferir colunas para frequência, fuso, âncora,
projectId/FK e campos simples do template; coleções-base de títulos de subtarefas
e offsets podem ser JSON estritamente validado para evitar novas tabelas nesta
Sprint. A representação TypeScript não exige armazenar o objeto inteiro como JSON.
A implementação deve manter uma só autoridade por campo e não esconder projectId
em JSON sem FK. Coleções do template não contêm IDs nem estado de Reminder real.

| Dado | Necessidade / invariantes |
|---|---|
| series.id | UUID atribuído uma vez; entidade independente de qualquer Task gerada. |
| series.clientId | UNIQUE e obrigatório na criação da série; request key persistida antes do POST. Retry recupera a mesma série e primeira Task. |
| frequency | Enum de domínio; labels visuais mapeadas somente na UI. NONE desativa geração. Task comum não exige criar série NONE. |
| timeZone | Define hoje e resolução de horário da série. Não inferir do fuso atual em cada geração nem do TASK_TIMEZONE do servidor. |
| anchorDate | Primeiro dia nominal da regra vigente e referência do dia da semana/dia do mês. Não armazenar weekday/monthDay redundantes. |
| startOffsetDays | Duração em dias civis inteiros não negativos; permite preservar distância início/prazo sem duplicar duas âncoras. |
| template.projectId | FK por ID; projeto renomeado/homônimo não muda associação. Projeto inválido deve gerar erro, não fallback por nome. |
| Task.seriesId + occurrenceKey | Ambos null em Task comum, ambos preenchidos em ocorrência; FK para série, UNIQUE dos dois campos inclusive em Tasks excluídas. Vínculo é somente leitura no PATCH normal. |
| updatedAt | Revisão otimista da série: editar com versão conhecida; conflito explícito, sem last-write-wins silencioso. Reaproveitar timestamp monotônico, sem campo version duplicado neste recorte. |

Não adicionar `parentTaskId`, `templateTaskId`, `generatedTask`, `generatedFrom`
ou uma string composta duplicando `seriesId + occurrenceKey`. Não exigir UUID
matematicamente derivado: identidade determinística do slot e UUID persistido
resolvem papéis diferentes. `triggerAt` continua derivado por Reminder, nunca na
regra nem no template.

## 6. Identidade, idempotência e geração

A chave lógica de ocorrência é **(seriesId, dia nominal YYYY-MM-DD)**. Para série
S, o slot 2026-11-05 é único mesmo se título, projeto, horário ou prazo da Task
forem editados depois. `occurrenceKey` é imutável; dueDate é a data efetiva editável.
Séries diferentes podem gerar no mesmo dia sem colisão. Não usar título, projeto,
descrição, nomes ou posição em array como identidade.

Cada Task recebe UUID próprio uma única vez. Cada subtarefa e Reminder da
ocorrência recebe ID próprio, com taskId da nova Task; status inicial PENDING,
done false, progress 0, subtarefas pendentes e favorite false. Copiar título,
descrição, prioridade, projectId, horário e offsets do template; não copiar status,
IDs, triggerAt, notas de execução ou eventos de History da Task que originou a série.
Alterar/concluir essa Task não altera automaticamente o template.

Ao ativar recorrência em uma Task já existente pela edição, criar a série e
vincular **a mesma Task** como ocorrência inicial em uma transação, preservando
Task ID, filhos, reminders e History. Não criar uma cópia da Task de origem.
O dia nominal inicial é o dueDate dessa Task; uma âncora histórica pode definir
a fase das próximas ocorrências sem gerar todo o backlog desde sua criação.
Se já houver vínculo, editar a série existente por ID, sem criar outra em retry.

A proteção definitiva é a constraint UNIQUE no SQLite e a transação `immediate`,
não um `some()` no mobile nem o UUID sozinho. Na geração, tentar inserir o slot;
se já existir, devolver/reconhecer a Task existente sem atualizar seu conteúdo,
status, filhos, reminders ou History. Tombstone também ocupa a chave: excluir não
permite regenerar a mesma ocorrência. RESTORE recupera o mesmo Task ID e filhos.
Conflito de inserção não deve executar `INSERT OR REPLACE`.

`clientId` resolve o retry de criação da série. A unicidade série/slot resolve a
geração, inclusive por dois clientes, reboot, concorrência ou resposta perdida.
Não sobrecarregar o clientId de Tasks de importação para representar série.
O backend deriva série/slot; o cliente não pode forjar ocorrência pelo POST comum.

**Responsável recomendado: backend.** Um comando idempotente de materialização
por intervalo valida a regra, calcula os slots e persiste Task + filhos + reminders
+ CREATED atomicamente. Commit antes de resposta; retry não fabrica novos eventos.
Queries GET permanecem sem efeitos colaterais. Não criar Tasks dentro do render,
do receiver Android ou do scheduler de notificações.

Proposta operacional a validar: geração inicial e reposição automática ao abrir
online, voltar ao foreground e sincronizar manualmente; janela de **90 dias civis**
a partir de hoje na zona da série. Calendário pode pedir o intervalo visível via
Context/service antes de recarregar o snapshot; a tela não cria nem mantém uma
segunda coleção de ocorrências. Cada comando deve ter intervalo/lote limitado;
navegar para futuro distante não exige materializar todos os dias intermediários.
A escolha de 90 dias não é exigência de RF08 e precisa de medição de volume.

Não há cron, worker de recorrência, geração autônoma offline ou garantia infinita
com app/backend desligados na arquitetura atual. Tasks já materializadas e journal
continuam disponíveis offline. Fora da janela carregada, mostrar indisponibilidade
da consulta em vez de afirmar calendário vazio. Geração automática em background
sem contato com backend não está comprovada e exigiria outro contrato.

## 7. Datas, regra e edição: política recomendada

| Tema | Proposta para validação do recorte |
|---|---|
| Diária | Avançar dias civis na zona da série, nunca somar 24h ao instante UTC. |
| Semanal | Dia da semana da âncora; avançar sete dias civis, não depender da definição visual de começo de semana. |
| Mensal | Usar dia da âncora, limitado ao último dia do mês de destino; cada resultado parte da âncora, não do mês já truncado. 31/01 → 28/02 → 31/03 em 2027; 31/01 → 29/02 em 2028. |
| Datas próprias | dueDate nominal do slot; startDate = dueDate - startOffsetDays. Sobreposição entre ocorrências é permitida; não criar detecção de conflitos. |
| Mudança de fuso do aparelho | Preservar IANA salvo na série; snapshot do Reminder da ocorrência usa esse fuso, quando houver offsets. Não mudar silenciosamente durante viagem. |
| Horário inexistente/ambíguo | Reutilizar rejeição do domínio da #39. Nenhum ajuste silencioso de hora, escolha arbitrária de offset ou novo pacote de datas. |
| Editar Task | Edita somente a ocorrência, mantém série/key imutáveis e usa lifecycle normal. Não propaga conclusão, filhos ou alterações a outras Tasks. |
| Editar regra | Comando separado da edição comum, com escopo explícito “novas ocorrências ainda não geradas”. Altera regra/template para slots novos a partir da âncora efetiva informada; nunca reescreve Tasks existentes ou suas exceções. |
| Trocar frequência | seriesId permanece; atualizar frequency/anchorDate explicitamente, com conflito por updatedAt. UNIQUE impede duplicar slots que já existiam. Histórico anterior continua nas Tasks reais. |
| Não repetir | Task comum permanece sem vínculo. Em série existente, frequency NONE interrompe novas gerações; Tasks materializadas permanecem, com seus lifecycles/reminders. Sem active flag redundante. |
| Excluir Task | Exclui só ocorrência, com confirmação/undo atuais e tombstone preservado. Não para a série nem apaga outras Tasks. |
| Encerrar série | Selecionar Não repetir e explicar que Tasks já criadas permanecem. Não implementar exclusão em lote ou editor avançado “esta e todas as seguintes” por acidente. |

O helper `shiftMonth` atual é navegação de calendário: aplicado sucessivamente em
31/01, perde o dia original após fevereiro. Não deve virar algoritmo de geração.
O domínio de recorrência precisa de aritmética de datas civis a partir da âncora,
com testes próprios de ano bissexto, mudança de ano e intervalo válido.

O escopo de edição recomendado simplifica a Sprint, mas significa que mudar regra
hoje não altera ocorrências futuras **já materializadas** na janela de 90 dias.
A UI precisa dizer isso antes de salvar. Se o aceite exigir editar/cancelar também
esse conjunto, será necessário outro desenho de revisão/exceções e reconciliação
em lote. Não declarar esse comportamento amplo atendido pelo modelo mínimo.

## 8. Compatibilidade com reminders, sync e calendário

**Reminders são por ocorrência.** Copiar apenas offsets do template; novos IDs e
triggerAt calculado pela data/HH:mm/IANA da Task. Limite cinco continua sendo por
Task, não por série inteira. Nenhuma regra de repetição própria de Reminder é
introduzida. Concluir/excluir/restore de uma ocorrência usa o pipeline da #39;
reabrir/recuperar agenda apenas o que ainda for futuro.

Há um ponto que impede reutilizar cegamente o POST atual: depois de período
offline, uma Task ainda futura pode ter antecedência já vencida. O CREATE manual
rejeita novo reminder vencido e `TASK_TIMEZONE` pode divergir da zona da série.
Geração interna de snapshots de uma regra antes persistida precisa de contrato
próprio, sem enfraquecer validação de entrada do usuário.

Recomendação a validar: não gerar backlog de Tasks cujo horário já passou; para
slot ainda futuro, preservar offsets da regra, inclusive os cujo trigger venceu,
e agendar somente triggers futuros pelo scheduler existente. A materialização
interna deve validar estrutura, IANA e resolução temporal com o domínio, sem
simular um `previous` falso, sem deslocar horário e sem fabricar clientId para
contornar validações. Essa semântica ainda não existe no backend e é um gate de
implementação, não uma capacidade confirmada da #39. Sem horário e sem reminders,
o corte de geração pode usar o dia civil da série. Horários inexistentes/ambíguos
causam erro explícito no lote atômico; não persistir meia ocorrência.

Um erro de geração não deve apagar Tasks existentes. Falha de rede depois do
commit permite repetir o comando idempotente; falha de cache mantém confirmação
remota e informa reconciliação local pendente, sem novo POST de Task avulsa.

O mobile deve executar geração antes da leitura final consolidada. Mapping/cache
precisam transportar vínculo de ocorrência e resumo canônico da série; adicionar
esses campos à comparação de sync/snapshots, sem importar projeções como novas
Tasks locais. A regra vem da série remota, não de cópias divergentes por ocorrência.
Em sync repetida, atualizar por Task ID; tombstones têm precedência. Scheduler só
recebe snapshot confirmado e persistido, mantendo guards da #39.

No calendário, usar Tasks reais do Context com navegação por ID. Revisar a leitura
do dia canônico: `taskCalendarDay` hoje ignora `dueDateKey`, o que pode deslocar o
dia quando ISO do cache foi criado em outro fuso. Priorizar chaves civis canônicas
para ocorrências integradas e preservar fallback legado. Não expandir série em
`tasksForDay`, `taskCountsByDay`, métricas ou render, pois duplicaria Tasks.

## 9. Persistência e API a decompor na implementação

Mudanças propostas, ainda não realizadas:

- Uma migration nova após 0003: série, FK de projeto, vínculo/key nullable em Task,
  UNIQUE incluindo tombstones, CHECK de pareamento dos campos e enum frequency.
  Tasks existentes permanecem sem série; não inferir por títulos/datas parecidos.
- Criação de série/primeira ocorrência em transação e com clientId durável;
  endpoint de regra separado do PATCH de ocorrência; comando de materialização
  por intervalo separado de GET. Nomes de rotas/DTOs serão detalhados após aceite
  das políticas, mantendo GET/POST/PATCH/RESTORE atuais compatíveis.
- Usar CREATED da Task materializada com metadata de série/key. Editar a regra
  deve registrar UPDATED com metadata de escopo e antes/depois no History da Task
  usada para solicitar a edição, validando vínculo por ID. Não inserir seriesId
  no campo taskId nem inventar ações fora do enum atual sem decisão de schema.
- Regra, lote e proteção de unicidade precisam compartilhar transação e revisão.
  A geração lê a regra vigente sob lock; falha de filhos/reminders/History reverte
  a ocorrência/lote. Não apagar dados ou regravar execuções para resolver conflito.
- Ensaiar banco vazio, upgrade 0003 → novo schema, foreign_key_check e dados
  preservados, inclusive legados/clientId/tombstones. Rollback destrutivo não é
  rotina de produção: backup antes da migration; eventual reversão deve preservar
  Tasks como independentes e exigir plano explícito para metadados de série.

## 10. Plano técnico e evidência futura

| Etapa proposta | Resultado verificável / dependência |
|---|---|
| T01 — contrato e domínio | Aceite das políticas desta proposta; funções puras de slots/chaves, dia/mês/ano/fuso. Nenhum código antes da autorização de implementação. |
| T02 — persistência | Migration aditiva, UNIQUE/FKs, repositório e testes de upgrade/preservação; depende T01. |
| T03 — geração/API | Série/retry, materialização atômica, concorrência, rule edit/NONE, History e validação separada de snapshots; depende T02. |
| T04 — mapping/cache/sync | DTOs canônicos, ledger, snapshots e geração antes da consolidação; depende T03. |
| T05 — UI | Quatro opções em Nova/Editar, indicação de série/escopo, erro/pendência e regra persistida; sem redesenhar telas ou criar catálogo de modelos. |
| T06 — calendário/lifecycle | Datas civis, navegação por Task ID, geração em pontos controlados e reconciliação pelo scheduler existente; depende T04–T05. |
| T07 — regressão integrada | Matriz abaixo, baselines e CI; sem notificações reais em Jest. |
| T08 — Android e documentação | Massa isolada, reabrir, sync repetida, editar regra/ocorrência e lembretes; aceite manual antes de PR final. |

| Grupo de testes propostos | Casos necessários |
|---|---|
| Domínio | NONE; DAILY em virada de dia/ano; WEEKLY sem trocar weekday; MONTHLY em 28/29/30/31, ano bissexto e retorno ao dia original; mesma âncora gera mesmos slots. |
| Identidade | Séries homônimas/projetos homônimos distintos; mesmo slot não duplica; editar dueDate não muda key; concorrência de dois geradores e resposta perdida preservam IDs. |
| Persistência | Regra/Task/filhos/reminders/History atômicos; rollback em falha; constraints, banco vazio, upgrade e dados anteriores intactos. |
| Edição | Campo omitido não cria/para série; editar só ocorrência; editar regra somente em novos slots; conflito updatedAt; NONE impede geração sem apagar Tasks. |
| Lifecycle | Concluir/reabrir independente; excluir/undo mesma Task; tombstone não regenera; concluir subtarefas reconcilia sem gerar duplicata. |
| Reminders | Offsets copiados com IDs próprios; triggerAt por data/fuso; cinco por Task; offset 0/1440; snapshot gerado tardiamente e trigger vencido; ambiguidade/gap; sem falso sucesso. |
| Sync/offline | Montar app e sincronizar repetidamente; ledger/retry; falha intermediária/cache; snapshot consolidado antes do scheduler; offline não gera Tasks ou IDs fictícios. |
| Calendário | Todas as frequências em dia/semana/mês; quantidade real, ordem e rota corretas; cache em outro fuso; janela não carregada não vira vazio confirmado. |
| Android | Regra persistida após reabertura, calendário real, sync repetida sem duplicação, notificação de ocorrência futura e cancelamento individual; limitações da #39 preservadas. |

Na implementação, executar validadores CI, lint/typecheck mobile sem ampliar
baselines e suíte mobile completa; migration/typecheck/test/build backend;
assembleDebug/assembleRelease com Hermes, New Architecture e Codegen; diff check.
Não instalar bibliotecas nem alterar baselines para resolver o planejamento.

## 11. Riscos e conclusão do refinamento

| Risco | Tratamento / decisão antes de implementar |
|---|---|
| Janela de geração versus edição | Validar que “editar regra” afeta apenas slots ainda não materializados. Se precisar alterar futuras já criadas, rever desenho e estimativa antes de começar. |
| Volume e horizonte offline | Validar 90 dias e geração por intervalo; medir Tasks/reminders/tempo de lote. Não prometer geração ilimitada com app/backend desligados. |
| Reminders já vencidos na materialização | Aprovar o contrato interno de snapshot; provar que POST manual continua bloqueando inválidos e scheduler nunca publica vencidos. |
| Mudança de data/fuso | Separar chave nominal, data efetiva e instante do reminder; preservar zona e testar DST/meses curtos. |
| Exclusão/stop versus geração | Tombstone ocupa slot; NONE interrompe novas inserções. Não recriar exclusões nem apagar outras ocorrências. |
| Prazo até 08/11 | Planejar uma camada por vez; 8 pontos mantidos, sem converter em promessa de prazo. Reestimar/reduzir recorte somente com decisão explícita se gates excederem a capacidade. |

**Arquitetura recomendada:** série persistida independente, gerando Tasks reais;
**persistência recomendada:** híbrido `recurrence_series` + série/key em Task.
A recomendação é compatível com os contratos atuais e evita reimplementar o
scheduler da #39. Ainda requer validação das políticas de edição, janela e
materialização tardia descritas acima antes de considerar o recorte Ready para
implementação. O refinamento não altera o aceite da Issue nem marca funcionalidades
como entregues. #40 permanece OPEN; PBI-13 permanece parcialmente coberto.

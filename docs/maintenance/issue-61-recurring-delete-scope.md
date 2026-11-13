# Issue #61 — escopos de exclusão recorrente

**10/11/2026 — refinamento técnico; nenhuma implementação.**
Issue [#61](https://github.com/AlineRaquelC/gestor-diario/issues/61) confirmada
**OPEN**. Preparação: `git switch dev`, `git pull`, `git status` e
`git branch --show-current`; `dev` atualizada, árvore limpa, base
`19e1e6b7aff885830b155de4078eaa36b57662a9`. Branch somente documental:
`docs/refine-61-recurring-delete-scope`; PR para `dev`, sem merge automático.

Fontes: corpo da Issue, [refinamento/aceite da #58](issue-58-recurrence-edit.md),
[arquitetura/entrega da #40](../sprints/sprint-2-issue-40.md) e arquivos abaixo.
A #58 está concluída; #43 permanece fora do escopo e Sprint 3 não foi iniciada.
Nenhum acesso ou alteração aos dados do Pixel, schema, migration, endpoint,
modal, Context ou código funcional nesta execução. Decisões abaixo são propostas
para implementação posterior autorizada, não contratos já disponíveis.

## 1. Auditoria do comportamento atual

| Camada/fonte | Comportamento confirmado |
| --- | --- |
| [useTaskDeletion](../../src/hooks/useTaskDeletion.ts) | Alert genérico Excluir tarefa?; chama deleteTask(id), sem conhecer escopo recorrente; lock local contra duplo envio. |
| [TaskContext](../../src/context/TaskContext.tsx) | deleteTask usa lock, activeTasks, prepareSuppression antes do DELETE; publica remoção por ID, incrementa mutationRevision/searchRevision, registra deletedIds, persiste cache e oferece Undo por 5 segundos. |
| [taskService](../../src/services/taskService.ts) | DELETE /tasks/:id; restore por POST /tasks/:id/restore. Regra/vínculo não são editáveis pelo PATCH normal de Task. |
| [TasksService](../../backend/src/services/tasks.ts) | DELETE em transação immediate: altera deletedAt/updatedAt e insere History DELETE. Não atualiza RecurrenceSeries nem apaga reminders, Notes ou filhos. Repetição de DELETE retorna 404 sem novo History. |
| [TasksRepository](../../backend/src/repositories/tasks.ts) e [schema](../../backend/src/database/schema/tasks.ts) | Tasks ativas filtradas por deletedAt; includeDeleted=true inclui tombstones; findOccurrence inclui excluídas; UNIQUE(recurrenceSeriesId, occurrenceKey) protege todos os slots. |
| [recurrence service backend](../../backend/src/services/recurrence-series.ts) e [domínio](../../backend/src/domain/recurrence/index.ts) | Materialização em transação immediate, janela hoje até hoje+31 inclusive; NONE interrompe geração, preservando Tasks; slot tombstonado não é reinserido. update permite voltar de NONE a frequência ativa. |
| [RecurrenceSeries schema](../../backend/src/database/schema/recurrence-series.ts) | Tem frequency, anchorDate, firstOccurrenceKey e materializedThrough; não tem limite final ou deletedAt. NONE não distingue pausa de exclusão. |
| [recurrenceService mobile](../../src/services/recurrenceService.ts) | get/update/activate/materialize; não existe comando de exclusão de série. Materialização concorrente é coalescida e pode aguardar passagem posterior a mutação. |
| [scheduler](../../src/services/reminderScheduler.ts) | Journal durável, suppress por Task, cancelamento nativo confirmado e compensação quando o DELETE falha; identidade task-reminder:taskId:reminderId. Backend não cancela alarms do aparelho. |
| [sync](../../src/services/syncService.ts) | Sync explícita materializa e consulta tombstones, não recria ocorrência remota ausente e não importa Task vinculada a série como Task comum. |
| [CalendarScreen](../../src/screens/CalendarScreen.tsx) e [helpers](../../src/utils/calendar.ts) | Home/calendário leem Tasks do mesmo Context; calendário usa dueDateKey/datas efetivas, sem geração virtual. |

**Somente esta funciona no caminho confirmado:** exclui só a Task, série segue
ativa; vínculo/chave e histórico permanecem no tombstone; outras ocorrências e
reminders ficam intactos; nova materialização não recria o slot. Restore recupera
a mesma Task/filhos/IDs/reminders, registra RESTORE e o Context reconcilia alarms.
Undo é oportunidade local de 5s; backend não impõe esse prazo e já permite restore
por ID fora da janela. Não transformar esse prazo em regra do gerador.

**Lacunas relevantes:**

- Restore atual não consulta término/exclusão de série; precisará respeitar os
  novos estados para não reabrir ocorrências removidas em lote.
- Falha incerta após DELETE (resposta perdida) hoje compensa scheduling sem
  confirmar tombstone. Repetição pode retornar 404 mesmo com exclusão aplicada.
  Na #61, distinguir falha definitiva de confirmação incerta antes de compensar.
- Startup/foreground usam GET ativo e mergeReadTasks preserva IDs locais ausentes
  da leitura. Exclusão remota feita por outro cliente ou após resposta perdida
  pode deixar cache antigo até sync com tombstones; não interpretar ausência em
  GET ativo como restore nem esperar restart para completar o lote.
- Supressão/Undo não são operação de lote. Reutilizar as políticas de identidade,
  journal e compensação, sem chamar deleteTask N vezes e criar N janelas de Undo.

## 2. Semântica dos três escopos

A referência de ordenação é **occurrenceKey nominal imutável** no fuso da série,
não dueDate editável, instante UTC, data atual ou posição visual. Se uma Task foi
movida no calendário, a exclusão segue a posição original na série. A UI deve
explicar essa regra quando data efetiva diferir do slot nominal.

- **Somente esta:** Task selecionada por ID. Não muda regra ou limites da série.
- **Esta e as próximas:** inclui a selecionada e todas as Tasks da mesma série
  com occurrenceKey >= chave selecionada; anteriores (< chave) permanecem.
  Inclui concluídas e datas individualmente movidas quando pertencem ao intervalo
  nominal; confirmação deve avisar que tarefas concluídas no intervalo também
  serão removidas. Slots ainda não materializados no intervalo nunca nascem.
- **Toda a série:** todas as Tasks ativas desse seriesId, incluindo anteriores,
  concluídas e exceções movidas, além de impedir qualquer nova geração.

Nunca usar título/projeto ou exigir que a chave ainda corresponda à regra atual:
um slot legítimo já materializado pode vir de regra/âncora anterior. Pertencer à
série significa vínculo/chave persistidos na Task canônica selecionada.

## 3. Comparação de alternativas

| Alternativa | Impacto e migration | Risco/idempotência/compatibilidade | Decisão |
| --- | --- | --- | --- |
| A — mover anchorDate/materializedThrough | Sem migration, mas altera fase ou cobertura | Âncora não expressa fim; mexer na cobertura pode gerar lacunas/backfill, inclusive MONTHLY; não bloqueia futuro indefinido | Rejeitar |
| B — limite civil persistido de término | Migration aditiva nullable; domínio limita geração | Representa o fim, compara slots de qualquer frequência; dados antigos com null preservam semântica; exige guard em editar/restore | Recomendar para futuras |
| C — frequency=NONE + DELETEs a partir da chave | Sem migration; seguro para interrupção enquanto permanecer NONE | Não distingue pausa de exclusão. Reativação atual permite nascerem novos slots além da janela; passado sem estado explícito e restore continuam permissivos | Insuficiente como término durável isolado |
| D — tombstones de futuras + bloqueio | Tombstones somente das materializadas já são necessários | Sem um bloqueio persistido, inventar tombstones para futuro infinito é inviável. Tombstones não substituem limite | Usar apenas como parte de B |
| E — guardar encerramento apenas em metadata de History | Pode evitar coluna | Estado operacional passa a depender de varrer eventos/JSON ligados a Tasks; índices, replay e validação ficam frágeis e indiretos; History deixa de ser somente auditoria | Rejeitar como autoridade |
| F — NONE e impedir reativação de toda série NONE | Sem migration | Quebra séries antigas pausadas e reativação válida da #58; não distingue exclusão total de simples Não repetir | Rejeitar |

**Recomendação: migration pequena justificada, sem executá-la agora.** Não há
campo atual que modele término irreversível sem sobrecarregar âncora, cobertura,
History ou o significado já existente de NONE.

### Campos propostos e invariantes

1. `endBeforeOccurrenceKey: string | null` na série (banco
   `end_before_occurrence_key`): limite civil **exclusivo** YYYY-MM-DD. null =
   sem fim; em “esta e próximas” recebe a chave selecionada. Materializar somente
   slot < limite. Não subtrair um dia, evitando underflow no primeiro dia
   suportado e ambiguidades de until inclusivo.
2. `deletedAt: string | null` na série (`deleted_at`): tombstone da entidade para
   “toda a série”, distinto de frequência NONE. Registra exclusão total e impede
   editar, reativar, gerar ou restaurar suas ocorrências. Preserva FK e clientId.

Duas propriedades representam estados diferentes: término preservando passado e
exclusão total. Não adicionar tabela de regras, flags redundantes, novo status de
Task ou ledger backend só para esta operação. Para all, marcar deletedAt e
frequency=NONE atomicamente; preservar eventual limite anterior. Para future,
conservar frequência/âncora e definir limite; se já estava NONE, continua NONE.
A frequência identifica a regra histórica; limite/deletedAt governam geração.

O limite é monotônico: novo corte pode antecipar (`min(limite atual, chave)`),
nunca ampliar/apagar por PATCH comum. Trocar DAILY/WEEKLY/MONTHLY ou NONE não
remove o limite. Série totalmente excluída não reabre por endpoint comum.
Criar outra série é ação futura explícita, não restore silencioso desta Issue.

`materializedThrough` continua cobertura, nunca marcador de término. Não reduzir
cobertura quando excluir. Mesmo se cobertura já passou do corte, o gerador deve
checar limite/tombstone em toda execução. Com janela vazia após corte, não gerar
nem avançar revision sem necessidade. Nenhum backfill do passado é introduzido.

### Impacto da migration futura

Adicionar as duas colunas nullable, defaults null, sem backfill destrutivo;
CHECK estrutural/validação civil no domínio para limite e timestamp válido para
deletedAt. Não alterar migrations anteriores, keys, FKs ou UNIQUE dos slots.
Validar upgrade de banco existente, bootstrap vazio e journal/snapshot Drizzle.
Séries antigas, inclusive NONE e as já limpas manualmente, recebem null/null:
não inferir término retroativo por título ou frequência.

Atualizar tipos/DTOs, resumos de recorrência nos joins de Tasks, mapper/cache,
normalização e preserveRecurrence para incluir campos e respeitar revisão.
Cache legado sem campos normaliza para null; migrar servidor antes do cliente
novo e não permitir clientes antigos enviar apagamento desses campos.
Cliente antigo pode mostrar texto histórico da frequência, mas backend precisa
impedir geração/restore indevidos. Rejeições de edição serão explícitas.
Nenhum schema ou arquivo de migration é criado neste refinamento.

## 4. Matriz de decisão

| Scope | Série | Tasks já materializadas | Futuras não materializadas | Tombstones | Reminders | Undo |
| --- | --- | --- | --- | --- | --- | --- |
| Somente esta | Inalterada | Soft delete só do taskId selecionado | Gerador continua, pula slot excluído | Task ocupa mesma série/chave | Cancelar somente da Task | Sim, 5s local, respeitando série/corte atuais |
| Esta e próximas | endBeforeOccurrenceKey = chave selecionada ou corte anterior mais restrito | Soft delete das ativas com chave >= corte; anteriores mantidas | Slots >= corte proibidos, inclusive após trocar frequência/reativar NONE | Preservar antigos e criar só para Tasks existentes removidas | Cancelar só das removidas; preservar anteriores | Não nesta Issue |
| Toda a série | deletedAt preenchido + NONE | Soft delete de todas as ativas do seriesId | Nenhuma pode nascer | Série e Tasks preservadas como tombstones | Cancelar das removidas, sem reset global | Não nesta Issue |

Limite/soft delete são genéricos para DAILY/WEEKLY/MONTHLY. Não criar três
algoritmos de exclusão nem tombstones artificiais para slots ainda inexistentes.

## 5. API proposta

Preservar `DELETE /tasks/:id` e `POST /tasks/:id/restore` para ocorrência única.
Novo comando **`POST /recurrence-series/:seriesId/deletions`**, body estrito:

```json
{
  "scope": "future",
  "taskId": "uuid-da-task-selecionada",
  "occurrenceKey": "2026-11-17",
  "expectedUpdatedAt": "2026-11-10T13:00:00.000Z"
}
```

Scope permite somente `future` ou `all`. Exigir taskId/chave também para all,
pois a intenção foi originada numa ocorrência e o servidor deve confirmar essa
associação. Cliente não define condição SQL, data arbitrária ou lista de IDs a
apagar. Seleção final é derivada pelo backend do seriesId e slot confirmado.

Resposta 200, inclusive repetição satisfeita:

```ts
{
  series: RecurrenceSeries; // regra, limite, deletedAt e revisão confirmados
  scope: 'future' | 'all';
  fromOccurrenceKey: string | null; // future: chave pedida; all: null
  tombstones: Array<{
    id: string; recurrenceSeriesId: string; occurrenceKey: string;
    deletedAt: string; updatedAt: string;
    // DTO confirmado inclui reminders/identidade necessários à reconciliação
  }>;
  deletedCount: number; // novos soft deletes neste comando; retry: 0
  alreadyApplied: boolean;
}
```

Retornar todos os tombstones do escopo, inclusive anteriores, para eliminar
cache antigo em retry; não só as Tasks que ainda estavam ativas. Preferir DTO
confirmado de Task com reminders já existente a uma identidade de alarm nova.
Não responder 204 a um lote cujo cliente precisa reconciliar IDs. Volume depende
da massa materializada finita; testar limites SQLite/HTTP e processamento em
chunks dentro da mesma transação, sem limite silencioso de exclusão. Não usar
paginação parcial de exclusão nem devolver amostra como snapshot completo.

**Por que POST:** é comando de exclusão com alcance, origem e precondição,
produzindo tombstones de vários recursos; não é DELETE físico da coleção.
`DELETE /recurrence-series/:id` simples seria adequado só a all, mas levaria a
contratos diferentes e DELETE com body/query de escopo fácil de interpretar
errado. `PATCH` de frequência isolado também não expressa apagar Tasks.
GET nunca gera nem apaga. Esta decisão não exige endpoint de preview:
a UI pode confirmar alcance sem prometer uma contagem exata sujeita a corridas.

### Validação e respostas

- 400: scope/campos extra/timestamp/chave inválidos, formato civil impossível.
- 404: série ou Task inexistente; não localizar por título.
- 409: Task não pertence à série, chave não corresponde à Task, revisão
  incompatível, estado inconsistente ou tentativa de restore/edição proibida.
- Ler a Task incluindo tombstone para validar retry. Task já excluída ainda tem
  associação válida; uma chave de série antiga continua válida após edição.
- Validar estado da série: deletedAt bloqueia comandos novos de edição/future;
  all já aplicado pode ser respondido sem mutação. Série NONE não excluída pode
  receber future/all normalmente. Nunca aceitar from não comprovado pela Task.
- Checar revisão otimista dentro da transação; materialização muda updatedAt.
  Em conflito real, reconsultar e pedir nova confirmação; não reenviar lote com
  revisão nova silenciosamente se o alcance mudou.

### Idempotência e resposta perdida

Operações são monotônicas, sem reativação implícita. Validar identidade/input
antes de reconhecer repetição. Se all já tombstonou a série e todas as suas
Tasks estão excluídas, retornar 200/alreadyApplied e tombstones sem novos eventos.
Se o corte atual já é <= chave pedida e todo o escopo está tombstonado, future
retorna 200 mesmo com revisão antiga: nenhuma nova mutação é necessária. Uma
série all já excluída satisfaz também retry future daquela origem sem reabri-la.
Para qualquer mudança adicional, exigir revisão corrente. Se o estado afirma
fim/exclusão mas há ativas proibidas, reportar conflito/inconsistência, não
mascarar como sucesso ou apagar dados com precondição velha.

DELETE individual mantém 404 operacional no retry: idempotência de efeito,
sem novo History, não promessa de status HTTP idêntico. Serviço mobile deve
confirmar tombstone por leitura canônica antes de compensar após resposta
incerta; não agendar novamente uma Task já excluída. Restore de Task já ativa
mantém 409 sem mutação. Não adicionar idempotency table: corte/tombstone e
resposta de estado já dão recuperação determinística para o lote.

## 6. Transação, concorrência e History

Backend é a autoridade. Um único comando deve, sob transação SQLite
`immediate`, validar origem/revisão, capturar conjunto canônico, atualizar limite
ou tombstone da série, soft-deletar Tasks ativas do escopo, registrar History e
construir resposta confirmada. Timestamps de série/Tasks devem avançar de forma
monotônica frente às revisões atuais, mesmo com relógio igual. Se qualquer passo
falhar, rollback integral.
Não compor PATCH de série + N DELETEs HTTP do cliente: isso permite estado parcial.

Materialização e deleção usam a mesma política transacional: se materialização
confirmou primeiro, a exclusão inclui o lote; se exclusão confirmou primeiro,
o gerador lê corte/deletedAt e não gera o intervalo proibido. Evitar qualquer
leitura de série fora da transação usada para decidir geração. Transações em
processos distintos também devem respeitar o lock SQLite, não só mutex JS.

Locks locais por série/operação (além de taskId), dataGuard e mutationRevision
bloqueiam duplo clique, sync, edição/restore local e publicação de GET antigo.
Locks ficam ativos até persistência/reconciliação; liberá-los em finally.
Invalidar Undo individual pendente da mesma série antes de um lote; não permitir
que um snackbar antigo restaure dentro de um intervalo recém-excluído.
Outro cliente continua possível: precondições e backend decidem, não a UI.

History permanece por Task: um DELETE por Task que mudou de ativa a excluída,
com deletedAt, seriesId, occurrenceKey, scope e chave do corte no metadata.
Registrar UPDATED na Task de origem com antes/depois dos campos da série,
reutilizando padrão da alteração de regra e enum existente. Operação all pode
usar a origem tombstonada para o evento; FK continua válida. Retry satisfeito
não acrescenta eventos. Se apenas o limite mudar e não houver Task ativa,
a alteração de regra ainda recebe evento na origem. Não criar sistema novo
de histórico de série. Notes, subtasks, reminders e History antigos não são
apagados. Leituras operacionais podem ocultar excluídas; preservação não exige
criar uma nova tela de histórico nesta Issue.

## 7. Restore e Undo

Undo apenas para “somente esta”, mantendo a janela local de 5 segundos.
Backend restore deve consultar série dentro da transação e rejeitar se
series.deletedAt != null ou occurrenceKey >= endBeforeOccurrenceKey. Task
anterior ao corte pode ser restaurada, com as mesmas regras atuais de projeto
e reminders. Troca de dueDate não permite contornar a chave nominal.
Sem Undo em lote, sem restore da série nesta Issue; confirmação do lote informa
que não há Desfazer. Não prometer rollback de série por snackbar individual.
Esses guards são necessários também para chamadas diretas de API/clientes
antigos, não apenas para esconder o botão na UI.

## 8. Reminders, Context, cache e recuperação

Transação do backend não engloba alarms Android. Distinguir exclusão remota
confirmada, cache persistido e cancelamento local confirmado/pendente. Não
reabrir Tasks ou série quando só cache/alarm falhar.

Orquestração no Context/service, UI só solicita scope:

1. Adquirir lock, validar origem canônica e disponibilidade de cache, aguardar
   escrita anterior e registrar intenção local durável antes do comando.
2. Suprimir reminders conhecidos do conjunto local afetado com o scheduler
   existente, preservando os de anteriores/outras séries. Não tratar cache
   parcial como lista completa de afetadas; backend pode retornar IDs novos.
3. Executar comando transacional. Erro definitivo sem commit compensa apenas
   as supressões provisórias. Resposta incerta mantém intenção e supressão,
   informa pendência e recupera via retry idempotente/leitura com tombstones;
   não fingir falha definitiva nem sucesso de cancelamento ainda não confirmado.
4. Aplicar resposta numa única publicação: remover todos os IDs tombstonados,
   atualizar resumo da série nas mantidas, deletedIds e revisões de busca.
   Usar também o predicado canônico de escopo para impedir GET em voo de
   reintroduzir Task do intervalo; não substituir toda a lista pela lista parcial
   retornada. Persistir snapshot e publicar tasksRef/setTasks de forma coerente.
5. Reconciliar cancelamentos por Task ID usando DTOs tombstonados confirmados,
   incluindo ocorrências não presentes no cache anterior. Reaproveitar journal,
   detecção de registros órfãos e inspeção nativa. Não executar cancelAll nem
   reconcile(escopo parcial, true), que poderia afetar alarms de Tasks mantidas.
   Serializar cancelamentos; preservar agendas das anteriores e de outras séries.
6. Retornar cacheSaved/scheduling e pendência de recuperação. Se cancelamento
   local falhar, manter retry durável e aviso explícito; não restaurar o lote.
   Concluir journal apenas após estado remoto/cache/cancelamentos conhecidos.

Persistência inicial de intenção é necessária para crash/resposta perdida; pode
ser journal local versionado específico do comando, sem schema/tabela backend.
Não reaproveitar cegamente o journal de criação de recorrência com outro payload.
Falha ao gravar intenção antes do POST bloqueia a operação. Isso não exige criar
um mecanismo geral de sync offline ou aceitar exclusão sem backend disponível.

No sucesso, resposta de mutação basta para Home/calendário sumirem imediatamente,
sem N GETs nem restart. Uma materialização de controle seguida de **uma leitura
consolidada com tombstones** confirma o estado; failure não desfaz a exclusão.
Ler `GET /tasks?includeDeleted=true` já existente, mergear tombstones antes da
filtragem visual, sob guard de revisão. Usar essa leitura também na recuperação
pendente e nos refreshes de lifecycle necessários para observar exclusão por
outro cliente; não disparar uploads/sync manual completa no foreground.
Apenas GET ativo + merge atual não elimina registros ausentes do cache.
Preservar Tasks legadas locais e dados de outras entidades nesse ajuste.

Startup/foreground recuperam intenções pendentes e tombstones antes de permitir
reagendamento das Tasks afetadas. Revisar preserveRecurrence para que resumo
antigo não apague limite/deletedAt mais recente. Observar série diretamente
quando all não deixa nenhuma Task para carregar seu resumo. GET de série por ID
incluindo tombstone fica disponível para retry; listagem operacional pode ocultar
excluídas e `includeDeleted=true` deve expô-las para reconciliação. Retry por
clientId de criação/ativação nunca fabrica outra série quando encontra tombstone.

## 9. UI, copy e acessibilidade propostas

Task sem recurrenceSeriesId mantém o fluxo simples atual. Task recorrente abre
**“Excluir tarefa recorrente”**, com radio/opções e um único botão final
**“Excluir”**; seleção inicial “Somente esta ocorrência”, Cancelar sempre visível.

| Opção | Descrição de alcance |
| --- | --- |
| Somente esta ocorrência | Remove só esta tarefa. As demais e a repetição continuam. Desfazer disponível por 5 segundos. |
| Esta e as próximas | Remove esta e as seguintes da série, inclusive as já criadas/concluídas no intervalo. As anteriores permanecem. Sem Desfazer. |
| Toda a série | Remove todas as tarefas desta série, inclusive anteriores e concluídas, e impede novas ocorrências. Sem Desfazer. |

Seleção não dispara mutação. O próprio botão final no modal é confirmação
explícita; mudar label para “Excluir esta e as próximas”/“Excluir toda a série”
quando selecionado e exibir o aviso destrutivo correspondente. Não empilhar
segundo Alert de confirmação por padrão. Contagem opcional só se canônica;
nunca mostrar quantidade obtida de cache parcial como total da série.
Em data movida, explicar “A ordem segue a ocorrência original de DD/MM”.
Cancelar, Back e dismiss não alteram dados. Enquanto envia, impedir novo envio
ou troca de scope; erro conserva a seleção e distingue confirmação incerta.

Container com accessibilityViewIsModal, título com role header, opções com
accessibilityRole radio e accessibilityState checked, labels completos de
alcance, ação final role button/destructive e Cancelar role button. Mover foco
para título ao abrir, anunciar resultado/erro, devolver foco ao acionador ao
cancelar ou a destino válido após excluir. Testar TalkBack, texto ampliado e
ordem de navegação; não depender somente de cor ou gesto para cancelar.

## 10. Plano de testes futuro

| Camada | Casos obrigatórios |
| --- | --- |
| Migration | Banco vazio e upgrade da base 0004, nulls antigos, CHECKs/FKs/UNIQUE/IDs e dados anteriores preservados; executar duas vezes pelo migrator sem reescrita destrutiva |
| Domínio/materialização | Todas as frequências × três scopes; slot exatamente no corte excluído, anterior permitido, anchor antigo, chave nominal vs dueDate movida, fim de mês/DST e primeiro dia suportado; janela após corte vazia; nenhuma geração após all |
| API/SQLite | future mantém anteriores, remove selecionada e posteriores inclusive concluídas; all remove todas ativas; one preserva demais; série NONE prévia; tombstones anteriores; escopo só por ID; campos inválidos, chave forjada e outra série rejeitados |
| Idempotência | Repetir cada scope; 404 individual sem novo History, 200 lote satisfeito; resposta perdida; zero duplicação de eventos/filhos/reminders; all após future, future antecipando corte e tentativa de ampliar corte |
| Concorrência | Materialize primeiro/depois de lote, conexões separadas quando viável, duplo clique, Task editada/movida/restaurada enquanto lote começa; revisão stale, corte mudando e all simultâneo; injetar falha em History/Task/série para provar rollback total |
| Restore | one + Undo mesmo ID/filhos; Undo expira; série NONE normal não bloqueia restore indevidamente; restore anterior ao corte permitido; >= corte e série all rejeitados; snackbar antigo invalidado |
| Context/cache | Uma publicação coerente, deletedIds, série atualizada nas mantidas, nenhuma Task alheia removida; GET atrasado antes/durante persistência; cache parcial, cache falho, crash com intenção, retry, restart, foreground e sync com tombstones |
| Reminders | Cancelar só removidas por scope, manter anteriores/outras séries; Task não carregada localmente, registro nativo órfão, journal/cache indisponível, falha de cancelamento/compensação e resposta incerta; retry sem alarms duplicados/orfãos |
| UI/acessibilidade | Três opções só para recorrente, não recorrente simples, Cancelar/Back/dismiss, sem dupla confirmação, busy, alcance claro, sem Undo em lote, TalkBack/foco/texto ampliado |
| Regressão | Criação/ativação via edição da #58, trocas entre frequências, pausa/reativação NONE antiga, Tasks já materializadas/movidas, dados legados, favoritos/projetos/Notes, calendário e sync |

Executar gates vigentes na implementação: 16 validadores CI, lint/typecheck
Mobile sem ampliar baselines, suíte Mobile, Backend typecheck/test/build,
migration em ambiente isolado, Android debug/release conforme gates vigentes e
`git diff --check`. Não declarar aprovação antecipada ou reutilizar números da
#58 como cobertura da #61. Neste PR documental validar diff e links; regressão
funcional não é necessária sem implementação.

## 11. Roteiro Android futuro e limpeza

Para DAILY, WEEKLY e MONTHLY, validar os três scopes. Reutilizar uma série
controlada por frequência quando possível: primeiro one com Undo, depois one
sem Undo; a seguir future numa chave intermediária; por fim all numa anterior
mantida. Isso reduz a três séries, mas não dispensa verificar todos os nove
pares frequência/scope. Se janela mensal só tiver duas ocorrências, usar relógio
controlado/ambiente de QA apropriado para cobrir a posterior já materializada;
não alterar relógio/dados úteis do Pixel sem autorização, nem alegar cobertura
manual de três slots quando só existem dois. Testes isolados cobrem horizonte
estendido; massa extra somente se necessária e identificada por IDs.

Em cada scope, conferir Home/calendário imediatamente, reminders removidos e
preservados, materializar novamente, fechar/reabrir, foreground e sync; confirmar
que one não renasce, future preserva anteriores e não gera >= corte, e all não
gera nada. Testar ocorrências com data movida, erro/retry e TalkBack. Registrar
IDs, chaves e evidência real. Nenhuma validação Android foi feita neste refinamento.

**DoD obrigatória antes do merge funcional:** inventariar/backup da QA61 por
IDs, encerrar séries técnicas, excluir Tasks técnicas canonicamente, preservar
tombstones/History, reconciliar reminders/cache, provar Home e calendário sem
QA61 após lifecycle/materialização. Não apagar dados úteis, Projects, filtros,
metas ou séries alheias. Nenhuma massa é criada nesta execução. A limpeza geral
para zerar Home antes da Sprint 3 é etapa separada, após conclusão da #61.

## 12. Estimativa e encaminhamento

**Planning Poker sugerido: 8 pontos**, sem alterar Issue automaticamente.
Além da UI, há dois estados persistidos, migration compatível, domínio, comando
transacional com precondições/retry, guards de restore, journal/recuperação,
cancelamentos seletivos, lifecycle com tombstones e validação Android nas três
frequências. 5 pontos subestimariam esses riscos; não é apenas somar opções a
um Alert. Pontos não equivalem a dias.

Implementação futura deverá tocar camadas auditadas de domínio/schema/DTOs,
repositories/services/routes, Context/recurrenceService/mappers, hook de
exclusão/UX e testes; scheduler só se faltar operação seletiva reutilizável.
Evitar redesign do calendário, refatoração geral de sync, autenticação/perfis,
purge físico ou reabertura de série em lote. Não alterar #43 nem iniciar Sprint 3.
Este refinamento só adiciona este documento. Issue #61 segue OPEN; PR documental
referencia a Issue sem Closes e sem merge automático.

## 13. Implementação funcional — 10/11/2026

Este registro sucede o refinamento acima. Implementação na branch
`feature/61-recurring-delete-scope`, a partir de `dev` limpa/atualizada no merge
`5d0927163696dafb94bcbcdc8c3379afe7184c2c`. O refinamento permanece como histórico
das decisões; os contratos e limites efetivos desta etapa estão abaixo.

### Testes antes da correção

A suíte API recebeu primeiro os três cenários DAILY. Resultado anterior à
implementação: **single aprovado; future/all falharam com 404 esperado 200**;
72 testes aprovados e 2 falhas na suíte então existente. Tudo em SQLite em
memória, sem massa de QA no aparelho. A matriz foi ampliada às três frequências.

### Migration e domínio

Migration **0005_recurring_delete_scope**, somente dois ALTER TABLE ADD nullable:
`end_before_occurrence_key` e `deleted_at`. Snapshot/journal Drizzle atualizados;
CHECKs rejeitam corte civil/timestamp inválidos; sem rebuild de tabela ou
reescrita de migrations anteriores. Séries antigas recebem null/null e não são
encerradas implicitamente. Testes cobrem bootstrap, upgrade da 0004, execução
repetida, preservação de Tasks/tombstones, foreign keys e integridade SQLite.

Domínio/modelo/DTOs/resumos transportam os campos novos. Cache legado sem esses
campos continua equivalente a null; preserveRecurrence respeita a revisão.
Gerador filtra slots >= endBeforeOccurrenceKey e ignora série com deletedAt;
materializedThrough não é reduzido. Restore individual consulta série e rejeita
Task no intervalo encerrado ou série excluída; anteriores ao corte continuam
restauráveis. Patch de regra não aceita apagar/ampliar os campos de término.

### API e transação

Contrato implementado: **POST /recurrence-series/:seriesId/deletions**, body
estrito `{ scope: 'future' | 'all', taskId, occurrenceKey, expectedUpdatedAt }`.
Single preserva DELETE /tasks/:id e sua política 404 em repetição sem novo efeito.
Servidor confirma Task incluindo tombstone, série/chave e revisão; não usa título.

Future define limite exclusivo e soft-deleta selecionada/posteriores pela chave
nominal. All define deletedAt + NONE e soft-deleta todas as ativas da série.
Uma transação immediate engloba série, Tasks e History. Erro reverte tudo.
History tem DELETE só nas Tasks que mudaram, e UPDATED na origem para a série;
Notes, filhos e reminders históricos permanecem vinculados. Nenhum purge.

Resposta inclui série, scope, fromOccurrenceKey, tombstones canônicos do escopo,
deletedCount e alreadyApplied. Retry satisfeito retorna 200, contagem 0 e não
acrescenta eventos. Corte pode antecipar, nunca ampliar. Materialização posterior
não repõe slots proibidos; estado inconsistente é rejeitado antes de mutação.
Timestamps avançam monotonicamente, sem depender de múltiplos spreads de lotes.

### Context, cache, sync e reminders

`deleteRecurringTask` coordena locks, confirmação da série, intenção durável,
supressão seletiva, API, publicação/persistência e cancelamento final. O journal
`@taskflow:recurrence-deletions:v1` guarda intenção antes do POST; escopo diferente
não sobrescreve operação incerta da mesma série. Resposta perdida recupera pelo
mesmo comando idempotente no startup, foreground ou sync manual.

O Context aplica a resposta em uma publicação, atualiza resumo nas mantidas,
deletedIds, mutationRevision/searchRevision e cache. O limite confirmado também
retira registros antigos incompatíveis do cache, mesmo em retry com corte mais
restrito já aplicado. Lote invalida Undo pendente e não oferece Undo próprio.
Falha de cache/cancelamento não restaura série ou Tasks confirmadas: retorna
pendência e mantém intenção para recuperação. Conflito definitivo reconcilia
leitura canônica e permite nova confirmação, sem repetir com alcance diferente
silenciosamente. Mutações ficam bloqueadas enquanto a exclusão estiver incerta.

Startup/foreground e refresh recorrente consultam Tasks incluindo tombstones;
a sync manual continua sem importar/recriar ocorrências remotas. Fingerprint de
sync inclui corte/exclusão da série. GET antigo não sobrepõe mutação confirmada.
Home e calendário usam o mesmo snapshot, sem geração ou exclusão na UI.

Scheduler ganhou `suspendMany`, reutilizado por `suspend`: uma intenção/journal e
cancelamentos limitados aos Task IDs afetados. Nenhum cancelAll ou snapshot
parcial autoritativo. Reminders de anteriores/outras séries são preservados;
registros nativos órfãos desses IDs também são cancelados. Falhas permanecem
visíveis e recuperáveis. Exclusão individual mantém Undo de 5s quando DELETE
confirma; resposta incerta confirmada depois por tombstone não oferece Undo que
poderia restaurar exclusão anterior de outro cliente.

### UI e acessibilidade

Hook compartilhado abre `RecurringDeleteDialog` em Detalhes/Edição só para Task
recorrente. Radio options: Somente esta ocorrência, Esta e as próximas, Toda a
série; botão final destrutivo de alcance explícito e Cancelar. Não há confirmação
dupla. Texto informa concluídas/anteriores e ausência de Undo em lote; data movida
explica a chave original. Não recorrente mantém o Alert simples existente.

Modal com foco no título, retorno ao acionador ao cancelar, roles/labels/checked,
lock contra cliques repetidos e conteúdo rolável para texto ampliado. O aceite
TalkBack/Android real ainda é pendente, sem inferência a partir de Jest.

### Verificações automatizadas

- **733 testes Mobile / 38 suítes**, incluindo Context/cache, modal, scheduler,
  journal, resposta perdida, double click, conflito, restart, foreground e sync.
- **476 testes Backend / 17 suítes**: matriz das três frequências × três scopes,
  materialização de controle/avanço do relógio, idempotência, validação de input,
  chaves nominais/datas movidas, corte antecipado, restore, concorrência e rollback.
- **17 validadores CI** aprovados. O validador adicional protege a normalização
  da impressão truncada da união barStyle do RN: a nova UI alterou a ordem que
  TypeScript usa nos mesmos erros legados. Ajuste limitado ao diagnóstico,
  preservando detecção de mudança de propriedade/tamanho; baselines não alteradas.
- Lint: 10 diagnósticos conhecidos / baseline 13 (3 erros e 7 warnings).
  TypeScript: 11 conhecidos / baseline 11, sem ampliação.
- Backend typecheck/build e `git diff --check` aprovados.
- Android assembleDebug/assembleRelease aprovados; não equivalem a aceite manual.

### Preparação Android e limites de aceite

Pixel_7 existente, serial emulator-5554. Migration local aplicada depois de backup
consistente em `/tmp/gestor-diario-demo-backup/issue-61-android-preparation/`.
Comparação integral das linhas de Projects, Tasks, Subtasks, Notes, History,
Reminders e séries: todas preservadas; novos campos null nas séries antigas.
**15 Tasks ativas preservadas; zero QA61**. API local atualizada com build novo.
APK debug instalado com -r, preservando dados; API/Metro e reverses preparados.
Nenhuma criação de QA ou execução de escopo destrutivo no Pixel nesta etapa.

**Android manual PENDENTE.** Roteiro enxuto para a usuária:

| Frequência / série técnica futura | Sequência controlada |
| --- | --- |
| DAILY / QA61 Daily | Criar recorrente com slots suficientes; single + Undo, single sem Undo e materialização; future em chave intermediária preservando anterior; all na anterior mantida |
| WEEKLY / QA61 Weekly | Mesma sequência, conferindo semanas e chave nominal |
| MONTHLY / QA61 Monthly | Single + Undo; future no próximo mês preservando a primeira; all na mantida. Janela pode só ter duas ocorrências: não alegar teste manual de posterior adicional sem existir; se necessário usar massa complementar mínima explicitamente inventariada |

Em cada escopo: Home/calendário imediatos, reminders corretos, materialização
posterior, restart, foreground e sync sem renascimento/duplicação. Testar
Cancelar/Back, TalkBack, texto ampliado, data movida e falha/retry quando possível.
Não mudar relógio do Pixel nem estender janela de produção para fabricar cenário.
Casos de mais slots mensais estão cobertos em ambiente automatizado isolado.

### Limpeza obrigatória e próximo passo

Nenhuma massa QA61 persistente foi criada automaticamente nesta execução. Testes
usam storage em memória e SQLite em memória/temporário. Antes do merge funcional,
a usuária deve aprovar Android e registrar inventário/backup/limpeza de toda QA61
criada manualmente: encerrar séries, remover Tasks canonicamente, preservar
History/tombstones, cancelar reminders e conferir Home/calendário sem resíduos
após restart/foreground/materialização. Sem limpeza geral das 15 Tasks mantidas.

Planning Poker **8** preservado. PR para dev com Closes #61, **sem merge** nesta
etapa; Issue continua OPEN. #43 intacta e Sprint 3 não iniciada. Sem promessa de
Undo em lote, restore de série ou funcionalidade além dos escopos aprovados.

## 14. Investigação da validação manual de all — 12/11/2026

Foi relatado que selecionar uma ocorrência intermediária de **QA61 Daily All**
e excluir **Toda a série** preservou anteriores, comportamento de future.
A investigação não reproduziu esse defeito no código atual. Nenhuma correção
funcional de query, Context ou escopo foi aplicada sem evidência.

### Evidência persistida da reprodução (leitura somente)

Banco local: backend/data/gestor-diario.db. Série
`8cd7cb3b-0268-4064-bc43-d5ad9158c8a2` (**QA61 Daily All**):
frequency NONE, deletedAt **2026-11-12T12:50:28.738Z**, corte null.
History identifica origem **21/11/2026**, Task
`1ce8fe22-fdc6-48d8-b0f7-10849c944c80`, scope all.
As **32 Tasks** estão soft-deleted no mesmo timestamp, inclusive as **9 anteriores**
à origem. Zero Task ativa dessa série. History e tombstones preservados.

As três Tasks QA61 ainda ativas pertencem à **outra série**, **QA61Daily**,
`74e3df90-80a5-45f5-8774-04bfdf619bad`, encerrada por future com corte
16/11/2026. São 13/11, 14/11 e 15/11; sua preservação é correta.
Isso é uma possível explicação visual, ainda não confirmação da causa do relato.
Sem captura do estado do Context no momento relatado, não é possível atribuir
a falha a mobile/cache nem afirmar que os títulos foram confundidos.

IDs efetivamente tombstonados no banco da reprodução (não são IDs de resposta
HTTP capturada; nenhuma mutação da massa QA foi executada nesta investigação):

| occurrenceKey | Task ID |
| --- | --- |
| 2026-11-12 | bf2fe850-7c03-49ad-8083-3b4eee05b8ba |
| 2026-11-13 | b0577c20-955f-4be5-b5d8-b241381d92e7 |
| 2026-11-14 | b4779200-b1c4-41c2-bab2-453817be3750 |
| 2026-11-15 | cffb246e-0120-42db-94c3-12f414d09b61 |
| 2026-11-16 | b521703a-7256-4729-ac6e-0051b8751bca |
| 2026-11-17 | 6f33a995-3fc1-4d11-a805-a6785c812f77 |
| 2026-11-18 | b94722fd-39cf-489c-8b6c-bcc692699e95 |
| 2026-11-19 | d7339e0b-2cfc-4148-8e31-c87bd4cc46ec |
| 2026-11-20 | 8693da56-2a5f-463c-b4ed-e3553f1d3c02 |
| 2026-11-21 | 1ce8fe22-fdc6-48d8-b0f7-10849c944c80 |
| 2026-11-22 | 46259eb9-90bd-483d-a853-e99b6072d4f7 |
| 2026-11-23 | 54323897-c80f-405d-be7f-79328f37717e |
| 2026-11-24 | 93080a34-ce52-49af-81df-39578f06e974 |
| 2026-11-25 | cb6c7451-81f6-4f19-9518-a8961dff1481 |
| 2026-11-26 | 24306769-de87-49c0-8918-df77263240c5 |
| 2026-11-27 | 9bdcbfd6-7a5d-41d1-869e-6e4259fad881 |
| 2026-11-28 | 6b336af2-ea6e-4265-b6d5-4c42047636f3 |
| 2026-11-29 | 56381bdc-88b1-4eac-8346-a298bbd81b16 |
| 2026-11-30 | 637a0e0b-7887-4b29-aefc-bcc25ce76553 |
| 2026-12-01 | cb4c01cb-f06d-4389-8066-7c695f5d9058 |
| 2026-12-02 | af6c4ce5-9622-4d54-a947-34250bdff09e |
| 2026-12-03 | 6a82be5f-d45c-4c1d-9d74-bc58bae96379 |
| 2026-12-04 | 3880fa13-342c-4283-9645-2b4fd0c9d414 |
| 2026-12-05 | 3f3db43a-113a-4f00-8b47-9685fc0605a2 |
| 2026-12-06 | 726019ec-201e-4cb2-bc49-735bdcf507d3 |
| 2026-12-07 | 7ae337f2-9967-435b-8660-94cb6eefa381 |
| 2026-12-08 | 73359beb-d9d8-431e-ad2c-c10cc71a980c |
| 2026-12-09 | f6a43785-4dde-467f-b54d-dca691f297f5 |
| 2026-12-10 | 24a7d221-a51e-45b8-8b1a-39d2d6f0fc0f |
| 2026-12-11 | 860b70b4-1450-4518-95fd-98782f75f306 |
| 2026-12-12 | 92b98af5-762c-4d90-b785-84604245bd8e |
| 2026-12-13 | 0528f2ae-d94d-4bab-ac02-d64fb22be769 |

### Auditoria de seleção, transação e reminders

TasksRepository.findBySeries usa exclusivamente WHERE recurrence_series_id = id,
sem filtro de occurrenceKey. deleteOccurrences filtra por chave somente em future;
all seleciona todas, ignora tombstones já aplicados na mutação e retorna todos os
tombstones do escopo. Série, Tasks e History ficam na mesma transação immediate.
All persiste deletedAt + NONE; materializeLocked retorna sem gerar quando
series.deletedAt está preenchido. Future e exclusão individual não foram alterados.

TaskContext calcula supressão provisória sem corte em all. A publicação combina
IDs retornados com todas as Tasks locais da série cujo resumo confirma deletedAt,
remove esses IDs de tasks/cache e envia todos a suspendMany. Nenhum cancelAll.
Reminders históricos persistidos não são purgados; cancelamento local usa IDs de
Task. A regressão verifica que os cinco IDs, inclusive D1/D2, entram nas duas
chamadas de supressão/cancelamento, sem incluir a Task alheia. Não foi feita
inspeção de alarms reais do Android nesta etapa.

### Regressões explícitas de ocorrência intermediária

API/SQLite: três novos testes DAILY/WEEKLY/MONTHLY, cada um com exatamente cinco
snapshots persistidos D1–D5 e origem D3. All retorna os cinco IDs, deletedCount 5,
fromOccurrenceKey null e deletedAt; nenhuma ativa sobra. Outra série permanece.
History anterior, filhos e reminders persistidos são preservados. Retry retorna
alreadyApplied/contagem zero sem modificar o snapshot, e materialização após
avanço do relógio gera zero Tasks dessa série.

Mobile: três novos testes DAILY/WEEKLY/MONTHLY com cinco ocorrências e origem D3,
verificando payload all, remoção dos cinco IDs de Context/cache, journal concluído
e cancelamento incluindo anteriores, preservando Task alheia.

**Resultado antes de qualquer correção funcional:** suíte API com novas regressões
**85/85 aprovadas**. Não houve vermelho funcional. A primeira execução falhou
por restrição de porta local do sandbox/Supertest e foi repetida com permissão;
isso não constitui reprodução do bug. Não alegar correção red/green deste relato.
O aceite Android continua pendente de esclarecimento/reprodução da divergência.

### Validação desta investigação

- Mobile: **736 testes / 38 suítes** aprovados.
- Backend: **479 testes / 17 suítes** aprovados, incluindo migration/rollback.
- Backend typecheck e build aprovados.
- Lint: 3 erros e 7 warnings legados, 10/baseline 13, sem regressão.
- Typecheck mobile: 11/baseline 11, sem regressão. Baselines intactas.
- Migration executada em banco novo isolado em /tmp, sem tocar a base QA.

Nenhuma massa Android persistente criada, removida ou recriada. QA61 atual
preservada para investigação. Após aceite manual, permanece obrigatória a
limpeza canônica da massa antes do merge, preservando History/tombstones.
Issue #61 permanece aberta, PR #63 existente sem merge, sem nova Issue/PR e
sem início da Sprint 3.

- 17 validadores CI aprovados; Android assembleDebug/assembleRelease aprovados.
- git diff --check aprovado. Estes gates não substituem o aceite Android manual.

## 15. Aceite final e limpeza QA61 — 13/11/2026

Este registro sucede as pendências das seções anteriores. Aceite manual
confirmado pela usuária: **Somente esta ocorrência aprovado; Esta e as próximas
aprovado; Toda a série aprovado; reteste isolado de scope=all aprovado**.
Nenhuma falha funcional confirmada no comportamento final. A observação anterior
foi causada por séries QA diferentes, visualmente semelhantes, não por falha de all.

| Frequência | single | future | all | Evidência |
| --- | --- | --- | --- | --- |
| DAILY | aprovado | aprovado | aprovado, inclusive reteste isolado | Manual confirmado pela usuária e regressões |
| WEEKLY | aprovado | aprovado | aprovado | Automatizada; sem alegar execução manual |
| MONTHLY | aprovado | aprovado | aprovado | Automatizada; sem alegar execução manual |

Migration **0005_recurring_delete_scope** aprovada: `endBeforeOccurrenceKey`
limita nominalmente future; `deletedAt` na RecurrenceSeries encerra all.
Single mantém Undo individual; future/all não oferecem Undo. Reminders são
reconciliados seletivamente, preservando histórico, tombstones e dados alheios.

### Inventário, backup e execução canônica

Backup anterior à limpeza em
`/tmp/gestor-diario-demo-backup/issue-61-final-cleanup/`: banco consistente
`backend-before.db`, `inventory-before.json` com IDs, occurrenceKeys, timestamps,
Tasks/tombstones, séries e History; `android-before.tar` com AsyncStorage e
registros nativos. Backup posterior, respostas HTTP e capturas XML ficam no
mesmo diretório. Artefatos locais não são versionados.

Identificação cruzada por recurrenceSeriesId, IDs/chaves, timestamps e títulos;
96 Tasks vinculadas, todas já tombstonadas antes desta execução, 197 eventos
History e zero task_reminders persistidos nessas Tasks:

| recurrenceSeriesId | Título | Criação UTC | Slots / Tasks | Estado anterior |
| --- | --- | --- | --- | --- |
| 74e3df90-80a5-45f5-8774-04bfdf619bad | QA61Daily | 2026-11-12T12:42:21.050Z | 12/11–13/12/2026 / 32 | DAILY, corte 13/11, zero ativas |
| 8cd7cb3b-0268-4064-bc43-d5ad9158c8a2 | QA61 Daily All | 2026-11-12T12:48:27.617Z | 12/11–13/12/2026 / 32 | NONE, deletedAt 12:50:28.738Z em 12/11 |
| ba99c3ed-89cf-4558-9595-922d5e044794 | QA61 ALL Teste Final | 2026-11-12T13:18:06.965Z | 12/11–13/12/2026 / 32 | NONE, deletedAt 13:18:45.077Z em 12/11 |

Após backup, POST canônico `/recurrence-series/:id/deletions` com scope all,
Task/chave persistidas e expectedUpdatedAt encerrou a primeira série: HTTP 200,
deletedCount 0 (nenhuma Task ativa restante). Agora as três têm NONE e deletedAt.
Nenhuma série QA61 pode materializar novas Tasks. Sem purge físico, sem nova
massa, sem exclusão de History ou alteração de outras séries.

### Cache, reminders, lifecycle e materialização de controle

Pixel_7 / emulator-5554: abertura normal, refresh, background → foreground e
force-stop seguido de abertura completa executados. Reconciliação pelos fluxos
existentes do app, sem apagar AsyncStorage. Home e calendário sem QA61 nas
capturas; cache final com **16 Tasks, zero QA61**, igual ao total ativo canônico.
Journal de reminders vazio (`entries: {}`, `suspended: []`), registro nativo
`task_reminders.xml` vazio e nenhum alarm do app no dumpsys alarm inspecionado.
Nenhum cancelAll global necessário ou executado.

POST de materialização individual nas três séries após encerramento retornou
`created: []` em todas: **zero novas QA61**. Preservadas as 16 Tasks ativas,
os 96 tombstones QA61 e History. Nenhuma limpeza geral pré-Sprint 3 executada.

### Gates e encerramento autorizado

Totais anteriores à investigação: **733 Mobile / 38 suítes; 476 Backend / 17
suítes**. Após as seis regressões da seção 14, os totais finais são **736 Mobile /
38 suítes e 479 Backend / 17 suítes**; não reduzir a contagem registrada.
17 validadores CI, migration, Android debug/release e diff check aprovados nos
gates registrados. CI do head funcional 8b0bd50: run 43225063280, success.
O commit documental final requer nova CI antes do merge, seguida de CI real em
dev após merge. Planning Poker 8. #43 permanece OPEN e intocada; Sprint 3 não
iniciada. Limpeza geral pré-Sprint 3 permanece separada.

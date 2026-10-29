# Refinamento técnico — Issue #39: lembretes e notificações locais confiáveis

Execuções de T03–T05 e T06–T09 registradas ao final deste documento.

Execução de T01/T02: [contrato temporal e gate Android](sprint-2-issue-39-gate.md).
O registro de refinamento abaixo preserva o contexto e as decisões anteriores à execução.

## 1. Estado e limites

**23/10/2026 — refinamento técnico concluído; proposta em revisão.** Issue
[#39](https://github.com/AlineRaquelC/gestor-diario/issues/39) aberta, com implementação
funcional ainda não iniciada e Planning Poker **13**, inalterado. Base: `dev`
limpa/atualizada em `666ef496b364ffeecfcb9e1d6368b34ecbb334ae`. A auditoria não
modificou código, bibliotecas ou migrations. As decisões abaixo são recomendações
de refinamento; compatibilidade nativa e precisão ainda não foram validadas em
build/dispositivo.

Origem preservada: **PBI-13, RF15 e RF16**, conforme [Sprint 2](sprint-2.md),
[Entregas](../backlog/entregas.md) e [Requisitos oficiais](../requisitos/requisitos-oficiais.md).
Ficam fora recorrência (#40), RF43–RF45 completos, REQ114–REQ116 completos,
escalonamento, silêncio complexo e políticas por prioridade. Sem autenticação,
biometria, limpeza de dados ou promoção `dev → main`.

Data alvo atualizada: **08/11/2026**, último dia para **commit/push**,
conforme prorrogação informada pelo professor em 29/10/2026.

## 2. Auditoria do código atual

| Camada / arquivo | Evidência e consequência |
|---|---|
| `src/screens/NewTaskScreen.tsx` | `REMINDER_OPTIONS`: 15 min antes, 30 min antes, 1 hora antes, No horário, 1 dia antes. Estado `reminders: string[]`; permite adicionar vários valores diferentes e remover por índice. Envia esse estado ao `addTask`, não diretamente ao Android. |
| `src/screens/EditTaskScreen.tsx` | Não mantém estado/controles de lembretes nem envia `reminders` no `saveChanges`. Valida formato HH:mm e ordem dos dias, mas não instante futuro de disparo. Envia datas/horário/status mesmo quando inalterados: a futura validação deve comparar valores efetivos, não mera presença no PATCH. |
| `src/context/TaskContext.tsx` | `Task.reminders?: string[]`. Cache `@taskflow:tasks` em AsyncStorage; hidratação e fila de escrita protegem cache inválido. `mergeReadTasks`, `updateTask`, `restoreTask` e `mutateSubtask` preservam lembretes locais. `addTask` espera API antes de publicar; falha de cache após commit retorna warning, sem repetir POST. Não existe scheduler. |
| `src/services/taskService.ts` | `ApiTask` não contém reminders. **Nem `toApiTask` nem `toApiTaskUpdate` serializam o campo**. `fromApiTask` usa somente `draft?.reminders`; GET remoto isolado não o reconstrói. `createTask` conserva o draft; PATCH pode usar o cache atual. |
| `src/services/syncService.ts` | `preserveTask` força `reminders: local.reminders`; `taskFields` não inclui lembretes. Importação usa `clientId`/ledger estáveis e não envia reminders. Esse comportamento preserva legado, mas não serve como merge de lembretes canônicos: um futuro `[]` remoto não pode ressuscitar itens locais. |
| `src/hooks/useTaskDeletion.ts`, TaskContext | Confirmação → DELETE remoto → remoção/cache → janela local de undo de 5s. RESTORE preserva o mesmo ID. **O limite de 5s é mobile**; backend mantém `undoUntil: null` e não impõe essa expiração. Não mudar a regra da #10 incidentalmente. |
| `backend/src/routes/tasks.ts`, `controllers/tasks.ts`, `schemas/tasks.ts` | POST/PATCH/GET/DELETE/RESTORE já existem. Zod `strictObject` rejeita campo desconhecido; enviar reminders hoje não os persiste e deve produzir 400. PATCH preserva campos omitidos e aceita `time: null`. Não há endpoints de reminders. |
| `backend/src/services/tasks.ts` | Valida dias YYYY-MM-DD, início/prazo/projeto e estados; `TASK_TIMEZONE` padrão America/Sao_Paulo define o hoje do backend. Não combina dueDate/time para validar disparo. Criação/edição/histórico/delete/restore usam transações; retry por clientId é resolvido antes da validação de criação. |
| `backend/src/repositories/tasks.ts` | Joins de projeto e consultas de subtarefas; transação SQLite síncrona `immediate`. `findAll(includeDeleted)` fornece tombstones para sync. Não há agregação de reminders. Alguns retornos de create/retry/tombstone são registros crus, importantes na futura padronização da resposta. |
| `backend/src/database/schema/tasks.ts`, `index.ts` | Task tem startDate/dueDate textuais, time opcional, status/done/progress/deletedAt, sem reminders/fuso de lembrete. SQLite canônico fica no backend, não no mobile. Foreign keys são habilitadas em `database/index.ts`. |
| `backend/drizzle/0000_*`, `0001_*`, `0002_*`, `meta/_journal.json` | Cinco tabelas funcionais iniciais; 0001 amplia ações do histórico, 0002 adiciona clientId único. Nenhuma tabela/coluna de reminders. Migrations preservadas durante a auditoria. |
| `package.json`, `backend/package.json` | RN **0.87.1**, React 19.2.3, AsyncStorage 3.x; backend Express/Zod/Drizzle/better-sqlite3. **Sem biblioteca de notificações locais** e sem resolvedor de data/fuso dedicado. |
| `android/` | minSdk 24, compileSdk 37, targetSdk 36, Kotlin 2.2.0, Gradle 9.4.1, New Architecture e Hermes habilitados. Plugin RN instalado declara AGP 9.2.1; conferir versão efetiva no futuro build. Manifest do app declara INTERNET; não há canais, permissionamento de notificação ou receivers próprios de agendamento. MainApplication/MainActivity são o bootstrap RN. |

**Achados A–E confirmados.** Hoje lembretes são UI/cache, sem persistência
canônica API/SQLite, cálculo de trigger ou entrega Android comprovada.

### Testes atuais auditados, sem reexecutar funcionalidades novas

- Mobile: `taskService.test.ts`, `taskUpdateService.test.ts`, `NewTaskScreen.integration.test.tsx`, `EditTaskScreen.integration.test.tsx`, `TaskContext.integration.test.tsx`, `TaskDeletion.integration.test.tsx`, `syncService.test.ts` e `ManualSync.integration.test.tsx`. Há provas de preservação de strings locais, importação sem reminders, IDs/retry, cache falho e DELETE/RESTORE. Não comprovam agendamento.
- Backend: `tasks.test.ts`, `tasks-update.test.ts`, `tasks-delete-restore.test.ts`, `task-draft-subtasks.test.ts`, `manual-sync.test.ts`, `database.test.ts`; schema/routes/services/repositories e migrações existentes. Cobrem transações, rollback de histórico, datas, identidade, tombstones e filhos, sem entidade reminder.
- Nenhum teste Android de notificação ou compatibilidade de biblioteca foi executado neste refinamento. Os 352 testes/22 suítes e CI verde da base continuam referência do MVP, não evidência da #39 implementada.

## 3. Modelo funcional recomendado

**Manter múltiplos lembretes por Task.** RF15 não exige cardinalidade única e a UI
já admite vários. Reduzir para um retiraria capacidade silenciosamente; uma coleção
curta com substituição atômica tem custo controlável. Propor até **cinco itens por
Task**, equivalente ao máximo atual de cinco presets distintos; é limite
operacional proposto para revisão, não texto do requisito oficial.

Modelo conceitual (não código implementado):

```text
Reminder
  id: UUID do servidor
  taskId: UUID canônico da Task
  offsetMinutes: inteiro seguro >= 0
  createdAt, updatedAt: UTC

Task (campos adicionais propostos)
  reminderTimeZone: IANA | null
  reminders: Reminder[]
```

- Persistir **apenas offsetMinutes**, sem amount/unit/texto redundantes no domínio. amount/unit são estado tipado do seletor, convertido uma vez: minutos × 1, horas × 60, dias × 1440. Quantidade inteira positiva; No horário é o caso explícito zero. Rejeitar fração, negativo, unidade desconhecida, overflow ou instante fora do calendário suportado; não arredondar silenciosamente.
- Presets correspondem a **15, 30, 60, 0 e 1440**. Formatar label a partir do número; o texto traduzido não participa de identidade ou cálculo. Normalizar 60 minutos e 1 hora como o mesmo offset; duplicata é erro, não dois disparos.
- O formulário pode oferecer quantidade/unidade no seletor existente para antecedência configurável, conservando os presets e a lista compacta. Não redesenhar telas.
- `taskId` não vem de nomes, projeto ou título. O servidor cria UUIDs; ao salvar uma coleção, preserva o ID dos offsets que já existem para a mesma Task. Alterar offset equivale a remover um item e criar outro; um retry da mesma coleção não gera IDs novos.
- `triggerAt` é **derivado**, retornado em UTC pelo backend e usado pelo adaptador, não um segundo campo editável/coluna de domínio. Estado de permissão/agendamento/entrega pertence ao dispositivo, nunca ao Reminder canônico.

## 4. Data/hora base e fuso: decisão proposta

**Âncora = dueDate + time**, pois RF16 relaciona a notificação ao prazo. startDate
continua sujeito às regras existentes, incluindo dueDate >= startDate; não é a
âncora e não impede um lembrete de ocorrer antes do início quando a antecedência
for válida. Não associar a startDate apenas porque o formulário mostra Início.

1. Ao configurar os primeiros lembretes, capturar o **IANA do aparelho** como `reminderTimeZone`; persistir junto à Task. Não usar o fuso do processo Node para interpretar essa âncora.
2. A Task sem horário continua permitida **sem lembretes**. Com lembretes, exigir HH:mm válido: “Defina um horário para configurar lembretes.” Não inventar 09:00, meia-noite ou 23:59.
3. Resolver o dia literal YYYY-MM-DD e HH:mm nesse IANA; converter o instante resultante para UTC; subtrair duração absoluta `offsetMinutes × 60000`.
4. **Um dia de antecedência = 24h**, não “mesmo horário no dia civil anterior”. Na transição de DST, mostrar essa semântica no seletor/ajuda de dias; recorrência civil é problema separado da #40.
5. Mudança do fuso do aparelho **não move um agendamento já confirmado**: ele fica ancorado no IANA registrado. Mostrar o fuso de referência na seção de lembretes, sobretudo se diferente do atual. Não substituir o IANA silenciosamente ao editar título ou reabrir.
6. Para recapturar o fuso sem adicionar um editor avançado de fusos: remover todos os lembretes, salvar e configurar novamente; o novo conjunto usa o fuso atual. Uma mudança explícita de fuso enviada no contrato é uma edição temporal completa.
7. Aplicar as regras IANA de DST da data futura. Horário local inexistente **ou ambíguo** deve ser rejeitado com explicação para escolher outro horário, em vez de escolher automaticamente um offset UTC.
8. Datas impossíveis, IANA inválido, HH:mm incorreto ou estouro são erro estrutural mesmo em registros inativos. Comparar instantes, não strings ISO com fusos distintos.

**Cuidado com o cache atual:** `mobileDate` transforma dia remoto em ISO de
meia-noite local; `calendarDate` usa o fuso atual. Após viagem, reutilizar um ISO
antigo pode mudar o dia. A implementação deverá conservar a chave canônica
`dueDateKey: YYYY-MM-DD` no mapeamento/cache para reminders e submissões inalteradas;
no formulário, usar a chave original se o dia não foi editado. Não derivar o prazo
de um ISO antigo reinterpretado nem refatorar globalmente o calendário nesta Issue.
A validação de início/hoje existente do backend continua separada e preservada.

### Algoritmo reutilizável/testável

Contrato de domínio: `resolveReminderSchedule(dueDateKey, time, timeZone,
offsetMinutes, now) → anchorAt, triggerAt | erro`. Relógio injetável. Backend é a
autoridade; UI faz pré-validação equivalente com as mesmas fixtures. Isolar em
helpers de domínio, sem React/HTTP/Android. Usar resolvedor IANA comprovado, sem
implementar fusos por offset fixo; a escolha/compatibilidade do motor de fuso é um
gate técnico antes de codificar. Node e Hermes devem concordar nas fixtures de
DST. A seleção e integração de um resolvedor IANA permanecem pendentes.

```text
validar estrutura e resolver data/hora no IANA sem ambiguidade
anchorAt = instante UTC de dueDateKey + time no IANA
triggerAt = anchorAt - offsetMinutes * 60000
para novo/agendamento alterado: exigir triggerAt > now
para reconciliação de existente: se triggerAt <= now, marcar expirado e não agendar
```

“Futuro” é estritamente maior: igualdade não vale. Não introduzir um lead time
mínimo arbitrário; verificar de novo imediatamente antes da chamada nativa. Se o
instante passou durante o POST, a configuração pode estar salva, mas o disparo
fica expirado/não agendado, com mensagem e sem repetir a criação.

### Casos A–F do gap

Exemplo com **now = 24/10/2026 09:00 em America/Sao_Paulo = 12:00Z**:

| Caso | Entrada | Decisão |
|---|---|---|
| A: tarefa hoje, horário passado | 24/10 08:45; offset 0 | Rejeitar configuração nova/alterada: “O horário da tarefa já passou. Escolha um horário futuro para o lembrete.” |
| B: tarefa futura hoje, antecedência passada | 24/10 09:10; 15 min → 08:55 | Rejeitar: “O lembrete precisa ser agendado para um horário futuro. Reduza a antecedência ou altere o horário da tarefa.” |
| C: No horário | 24/10 09:01; offset 0 | Disparo 09:01; aceitar. 09:00 igual a now deve falhar. |
| D: 1 dia antes | 25/10 09:00 − 1440 min = 24/10 09:00 | Falhar por igualdade; 25/10 09:10 gera 24/10 09:10 e passa. |
| E: tarefa futura | 26/10 10:00; 60 min | Aceitar 26/10 09:00, sujeito à segunda verificação antes do agendamento. |
| F: reminder antigo expirado | Editar descrição, sem mudar configuração/âncora | Permitir PATCH; conservar registro expirado, não gerar disparo retroativo. Mostrar “Este lembrete já passou e não será reagendado.” |

No backend, avaliar o **estado final mesclado** do PATCH. Novo offset exige futuro;
se dueDate/time/fuso mudar de fato, validar todos os offsets mantidos. Remover
itens é permitido mesmo que tenham expirado. Omitir reminders conserva a coleção;
[] remove todos. Valor temporal repetido e inalterado no PATCH não conta como
reagendamento. Concluir/excluir/reabrir não deve falhar por reminder histórico
expirado; reabertura agenda somente futuros. Leitura, restore e retry idempotente
não revalidam passado como se fossem uma nova configuração.

## 5. Persistência: comparação e escolha

| Alternativa | Vantagens | Custo/limitação |
|---|---|---|
| A: campos/JSON em Task | Menos tabela/join | Escalar único perde múltiplos; JSON exige validação em bloco e não garante FK/unicidade por Reminder; dificulta IDs estáveis e consultas/testes de integridade. |
| B: `task_reminders` | Relação 1:N explícita, UUID por item, FK/unique/check, preservação no restore e cópia futura por ocorrência | Nova migration, agregação de leitura e operações transacionais; custo real a incluir nos 13 pontos. |

**Recomendar B**, coerente com os filhos existentes (subtasks/notes) e a UI múltipla.
Proposta de schema, **sem criar migration agora**:

- `task_reminders`: id TEXT PK UUID, task_id TEXT NOT NULL FK tasks.id **ON DELETE RESTRICT**, offset_minutes INTEGER NOT NULL CHECK inteiro >= 0, created_at/updated_at UTC. UNIQUE(task_id, offset_minutes), também servindo à consulta por Task. Validar limites de inteiro e até cinco itens na aplicação.
- `tasks.reminder_time_zone`: TEXT nullable; obrigatório/validado quando a coleção final não estiver vazia; [] limpa o fuso. O vínculo é da Task e partilhado pelos seus lembretes.
- Sem `enabled`, delivery status, token, ID Android ou recorrência no schema. Concluída/excluída desativa operacionalmente, mantendo configuração para reabertura/restore.
- Soft delete **não apaga filhos**. Remover explicitamente um reminder apaga somente essa linha; remoção física de Task não é introduzida. FK restrict mantém padrão atual e exige política própria se hard delete vier no futuro.
- Migration futura aditiva: Tasks existentes sem lembretes, fuso null; preservar dados/histórico/Notes/Subtasks e clientId. Testar banco vazio, upgrade de 0002 e reaplicação pelo migrator; não editar migrations antigas nem atribuir datas/fusos a legado silenciosamente.

## 6. API recomendada

**Estender POST /tasks e PATCH /tasks/:id** com a coleção, sem endpoints dedicados
nesta Sprint. Permite validar prazo/horário/lembretes e salvar tudo atomicamente,
como a criação de subtarefas já faz. Endpoints próprios exigiriam coordenação de
várias gravações para uma edição e aumentariam a superfície de falhas.

Exemplo parcial de request (campos usuais de Task continuam existentes):

```json
{
  "dueDate": "2026-10-26",
  "time": "10:00",
  "reminderTimeZone": "America/Sao_Paulo",
  "reminders": [{ "offsetMinutes": 15 }, { "offsetMinutes": 60 }]
}
```

Resposta agregada de POST/PATCH/GET/lista/restore/importação/retry:

```json
{
  "id": "uuid-task",
  "reminderTimeZone": "America/Sao_Paulo",
  "reminders": [
    { "id": "uuid-reminder", "taskId": "uuid-task", "offsetMinutes": 15,
      "createdAt": "2026-10-23T15:00:00Z", "updatedAt": "2026-10-23T15:00:00Z",
      "triggerAt": "2026-10-26T12:45:00Z" }
  ]
}
```

Os UUIDs acima são ilustrativos. A resposta real conterá **todos** os itens
confirmados; o exemplo abrevia o segundo. triggerAt é derivado; passado pode ser
retornado em leitura, sem criação de nova notificação. Sem agendamento Android
feito pelo servidor.

- POST sem reminders equivale a []; exigir fuso/horário para coleção não vazia. PATCH omitido conserva; [] remove; null/strings visuais falham. `reminderTimeZone` omitido usa o existente para edições; com primeira coleção precisa ser explícito. Não aceitar fuso ausente por fallback no timezone Node.
- Request aceita somente offsets; servidor associa à Task do endpoint, gera IDs para novos offsets e preserva os demais. Não confiar em taskId/reminderId arbitrários enviados no corpo.
- Zod valida forma, offsets inteiros/únicos e cardinalidade; service valida configuração temporal final, fuso, passado e estado; repository executa comandos. Datas/horário mantêm os contratos atuais. 400 `VALIDATION_ERROR` com mensagem de domínio compreensível, 404 `TASK_NOT_FOUND`, erros de projeto existentes e 500 em falha inesperada. Erros de permissão Android pertencem ao dispositivo, fora do contrato de erros da API.
- Transação `immediate`: Task + diff da coleção + fuso + histórico UPDATED/CREATED. Se qualquer gravação/histórico falhar, rollback total. Desestruturar a coleção antes de enviar campos a `tasks`: não espalhar array como coluna.
- `findAll` agrega filhos em lote como subtasks; incluir reminders também nos tombstones. Padronizar create sem filhos, retry por clientId e restore para não retornarem uma forma sem a coleção. Remoção explícita deve voltar [] e prevalecer sobre cache.
- Retry de criação por clientId já existente retorna o mesmo conjunto/IDs antes da validação temporal; não recriar reminder se agora expirou. Reutilizar a identidade/ledger existente também para recuperação de POST de Nova Tarefa com resposta perdida; hoje o POST comum não envia essa chave. Não reenviar POST cegamente nem criar um framework de filas offline.
- Atualizações sucessivas com o mesmo conjunto preservam IDs. Concorrência continua a política atual da Task; não introduzir sincronização automática/merge distribuído. Identidade estável e snapshot conservam divergências sem reativá-las.

## 7. Android: evidências, recomendação e limites

Fontes primárias consultadas em 23/10/2026; páginas `main` são mutáveis. Nenhum
pacote foi instalado, nem houve build de compatibilidade ou notificação real.
A seleção da biblioteca permanece pendente do gate T02 no projeto real.

### Candidato técnico: `react-native-notify-kit`, sujeito ao gate T02

O [repositório oficial do fork](https://github.com/marcocrupi/react-native-notify-kit)
se apresenta como continuação mantida do Notifee, Apache-2.0. O
[Notifee original](https://github.com/invertase/notifee) está arquivado desde
07/04/2026; não recomendar sua adoção nova só por familiaridade.

A [matriz do fork](https://docs.page/marcocrupi/react-native-notify-kit/react-native/environment-support)
exige New Architecture, aceita RN >=0.73 e API >=24 e documenta validações em
0.85.3/0.88. Isso é aderência documental, **não prova em RN 0.87.1**. A
[versão em main](https://raw.githubusercontent.com/marcocrupi/react-native-notify-kit/main/packages/react-native/package.json)
é 10.9.0; não equivale a confirmar versão publicada/pinada para este app. Antes
de implementar, validar release publicada e fixá-la, compilar debug/release com
Hermes, AGP/Gradle/SDK do projeto e testar cold start/background. Não baixar main
como dependência nem alterar a arquitetura para acomodar pacote incompatível.

O [guia de triggers](https://docs.page/marcocrupi/react-native-notify-kit/react-native/triggers)
oferece timestamp, ID explícito, enumeração, atualização e cancelamento. Documenta
limite de 50 triggers Android e default exato via AlarmManager. O adaptador deve
tratar capacidade/falhas explicitamente, sem descartar itens ou criar agendamento
parcial anunciado como completo. Essa indicação do SDK precisa ser medida no gate,
não generalizada para todo AlarmManager. Usar somente triggers one-shot na #39.

O fork documenta recuperação nativa de futuros após reboot no
[README](https://github.com/marcocrupi/react-native-notify-kit#trigger-notification-reliability),
mas isso **não comprova** o comportamento desta combinação. Testar reboot normal
sem abrir o app, permissão revogada, trigger expirado, ausência de duplicatas e
manifest final; se falhar, bloquear conclusão ou registrar/revisar viabilidade
conforme o aceite, sem prometer recuperação apenas por existir receiver.

### Alternativas consideradas

| Opção | Avaliação |
|---|---|
| Notifee original | API conhecida, porém arquivado; não recomendado para nova integração neste prazo. |
| `expo-notifications` | Alternativa mantida, mas o [guia oficial](https://docs.expo.dev/bare/installing-expo-modules/) exige adicionar/configurar Expo modules em app RN existente. Maior mudança de infraestrutura que o projeto CLI atual; reavaliar se o fork falhar, conversão do app fora do escopo do refinamento. |
| TurboModule Kotlin + AlarmManager/NotificationManager | Controle direto sem biblioteca de alto nível; exige construir/testar bridge, armazenamento/receivers/reboot/permissões. Risco/custo alto até o freeze. Alternativa posterior, não implementação paralela antecipada. |
| `react-native-push-notification` | [Repositório arquivado](https://github.com/zo0r/react-native-push-notification); evitar nova adoção. |
| Timers JS / FCM | Timer depende do processo; FCM não é scheduler local autônomo e introduziria servidor/push. Não atendem este recorte. |

### Precisão e alarmes exatos

A precisão necessária será determinada em T02 com evidências do projeto real.
Alarmes exatos e sua permissão ainda não constituem decisão fechada; sua adoção
depende de necessidade demonstrada. As opções abaixo são propostas para avaliação.

A [orientação Android](https://developer.android.com/develop/background-work/services/alarms)
explica que alarmes inexatos podem atrasar e que exatos devem atender necessidade
visível de precisão. **Inferência de produto deste refinamento:** manter No horário
e 15/30 min antes como experiência temporal confiável não é compatível com aceitar
silenciosamente atraso da ordem de uma hora. Recomendar, para revisão, one-shot
`SET_EXACT_AND_ALLOW_WHILE_IDLE` com acesso `SCHEDULE_EXACT_ALARM` quando exigido,
checado antes de agendar. A precisão não é escolhida por ser default da biblioteca.

Não usar `USE_EXACT_ALARM`, `SET_ALARM_CLOCK`, full-screen intent, FGS permanente
ou pedido de exceção de bateria por conveniência. Alarmes exatos também sofrem
restrições de idle/OEM e não prometem entrega em segundo exato. Se o produto
aceitar explicitamente timing aproximado, preferir modo inexato e remover o acesso
extra; essa mudança de expectativa exige revisão, não fallback silencioso.

### Permissões e configuração mínima proposta

- API 33+: `POST_NOTIFICATIONS`, solicitada em contexto ao configurar lembrete, não no Login. Recusa não bloqueia o resto do app nem apaga a configuração. Fonte: [Android — permissão](https://developer.android.com/develop/ui/compose/notifications/notification-permission).
- API 26+: canal estável `task-reminders`, nome amigável, importância padrão; verificar bloqueio do app/canal. Sem som/vibração por prioridade. Fonte: [Android — canais](https://developer.android.com/develop/ui/compose/notifications/channels).
- API 31+ no modo exato: verificar capacidade especial; no target atual não presumir concessão. [Android 14](https://developer.android.com/about/versions/14/changes/schedule-exact-alarms) restringe concessão inicial. Sem acesso: configuração salva, **não agendado por permissão**; orientar ação consciente, nunca abrir ajustes automaticamente ou informar sucesso total.
- `RECEIVE_BOOT_COMPLETED` para recuperação de futuros se comprovada. WAKE_LOCK pode ser necessário internamente ao SDK; não é permissão runtime a pedir ao usuário.
- Auditar **manifest mesclado**, pois o [manifest do fork](https://raw.githubusercontent.com/marcocrupi/react-native-notify-kit/main/packages/react-native/android/src/main/AndroidManifest.xml) inclui permissões/componentes além do app atual. Remover declarações desnecessárias se o pacote permitir; não solicitar acesso à política de Não Perturbe, FGS, localização, contatos ou outros recursos fora da #39.
- Background/processo morto normalmente não deve depender de JS vivo. Remover da tela de recentes, matar processo, **Forçar parada**, reboot e app em estado restrito são cenários distintos. Não prometer entrega após force-stop, aparelho desligado ou bloqueio do usuário. Ao voltar, reconciliar futuros, sem disparo retroativo.

## 8. Identidade, reconciliação e prevenção de duplicatas

```text
Task UUID + Reminder UUID
  → notificationId = "task-reminder:<taskId>:<reminderId>"
  → trigger one-shot nesse aparelho
```

Nenhum ID aleatório novo em render, GET, sync ou boot; não usar título/nome/índice.
SDK aceita string; se a versão escolhida a converter em inteiro internamente,
verificar colisões e cancelamento no gate, sem inventar hash truncado no app.
Idempotência é **por instalação/dispositivo**, não promessa de entrega global
exatamente uma vez entre vários aparelhos.

Propor journal local derivado e versionado, separado de `@taskflow:tasks`, com
notificationId, identidade canônica, assinatura temporal, estado e erro. Não é
fonte canônica de configuração. A assinatura inclui dueDateKey, time, IANA, offset
e triggerAt; **não inclui updatedAt, title, description ou project**.

Reconciliação serial por Task, usando os locks existentes e uma fila do adaptador:

1. A partir de snapshot confirmado, determinar itens elegíveis: Task ativa/não concluída, Reminder tipado confirmado, trigger futuro e permissões válidas.
2. Comparar com journal e triggers nativos. Mesmo ID/assinatura pendente = nenhuma chamada de recriação. Nunca “cancelar tudo e criar tudo”.
3. Removido, concluído, tombstone ou temporalmente alterado: registrar cancelamento pendente e cancelar somente IDs afetados. Antes de substituir horário, confirmar remoção anterior; falha não pode criar dois agendamentos.
4. Registrar desejo antes da ação nativa; agendar novo ID ou atualizar o mesmo se suportado sem duplicação; confirmar consulta nativa antes de marcar agendado. Se a API nativa não expuser dados suficientes para reconciliar crash entre chamada/journal, resolver isso no gate; não presumir atomicidade.
5. Expirado/entregue: não rearmar em reabertura/sync. Nova edição temporal explícita pode criar nova versão futura. Falhas ficam pendentes para retry local, sem reenviar POST/PATCH canônico já confirmado.
6. Reconciliar na inicialização após hidratação segura, retorno ao foreground/permissões, confirmação de mutações e sync consolidada. Não cancelar por lista parcial, GET falho ou cache ilegível; tombstone/ausência em snapshot completo confirmado é diferente de rede indisponível.

Payload sugerido: “Gestor Diário” / “Você tem uma tarefa próxima do prazo”, com
taskId em data. Assim título/descrição/projeto não exigem reagendar nem exibem
conteúdo antigo/sensível. Abrir usa o ID canônico pela rota existente quando a
navegação estiver pronta. Agendamento confirmado não prova entrega.

## 9. Ciclo de vida: edição, soft delete, undo e status

| Evento | Persistência / efeito Android recomendado |
|---|---|
| Criar Task | Validar → POST confirmado → cache/journal seguros → agendar uma vez por Reminder. Sem ID remoto confirmado, não agendar. |
| Mudar dueDate/time/fuso de fato | Validar coleção final; após PATCH confirmado, cancelar anteriores e agendar novos futuros. Se valores forem iguais, não tocar no scheduler. |
| Adicionar/remover reminder | Atualizar coleção atomicamente; só cancelar/remarcar diff. Mesmo conjunto enviado novamente conserva IDs e triggers. |
| Mudar title/description/project/priority | Sem alteração da assinatura temporal, nenhuma chamada de cancelamento/reagendamento. |
| Confirmar exclusão na UI | Propor cancelamento **provisório imediato** e journal de intenção antes do DELETE, para reduzir corrida com disparo durante rede lenta. Sem anunciar exclusão antes do servidor. Se preparação segura falhar, não iniciar DELETE; mostrar erro. |
| DELETE falha/offline | Task segue existente; desfazer intenção e reconciliar somente triggers ainda futuros. Não gerar disparo retroativo por lembrete que venceu durante a tentativa; informar estado real. |
| DELETE confirma | Manter configuração no SQLite (soft delete), concluir cancelamentos, remover Task da UI/cache conforme fluxo atual; janela local de undo continua 5s após confirmação remota. Falha Android após commit não é falha do DELETE: registrar pendência explícita, não repetir exclusão. |
| DESFAZER/RESTORE | Chamar restore dentro da janela **sem esperar scheduler lento**; depois de confirmação, mesmo Task/Reminder ID, agendar apenas futuros. Se RESTORE falhar, manter cancelado. Preservar início/expiração da janela e política do servidor. |
| Concluir Task | Cancelar provisoriamente durante ação explícita e definitivamente após confirmação; conservar configuração. Falha da API restaura só futuros. |
| Concluir por última subtarefa | Reconciliar o status confirmado devolvido pelo backend também em `mutateSubtask`, não somente no botão Concluir. |
| Reabrir ou regressão de progresso | Reconciliar apenas futuros com mesmos IDs; expirados permanecem inativos, sem alerta imediato. Não impedir reabertura por configuração histórica. |
| Remover todos reminders | PATCH [] + fuso null; cancelar todos os IDs dessa Task, sem afetar outras. |

API/SQLite e Android **não compartilham transação**. Há janela de corrida até a
confirmação do cancelamento e o SO pode já ter entregue o alerta. Falha persistente
de cancelamento é erro observável e risco bloqueante da validação, não “sucesso”.
Journal pendente deve sobreviver a crash e ser reconciliado. Não alterar DELETE,
restore, status ou undo existentes para esconder falha nativa.

## 10. Offline, cache e sincronização manual

Ordem normal: validar no domínio → preflight de permissões, sem bloquear salvar
Task se recusadas → confirmar API → publicar estado canônico/cache → persistir
desejo no journal → reconciliar Android → retorno discriminando **salvo / cache /
agendamento**. Erro nativo não pode transformar commit já feito em “nada foi salvo”.

- API offline ao criar/editar lembrete: nenhuma configuração nova é canônica nem agendada. Manter draft e explicar “Não foi possível confirmar o salvamento do lembrete.” Conservar agenda confirmada anterior, salvo supressão provisória de concluir/excluir, que deve ser compensada.
- API confirmou e cache falhou: não repetir POST; avisar que configuração existe no servidor. Se não houver estado local durável seguro, deixar agendamento pendente, não alegar agendado. Recarregar para recuperar.
- API confirmou e permissão/SDK/journal falhou: “Tarefa salva, mas o lembrete não foi agendado neste aparelho.” Expor motivo e recuperação local; nunca regravar a Task só para tentar scheduler.
- Offline com configuração **já confirmada e armazenada com segurança**: agenda nativa continua; pode reconciliar futuros desse snapshot, sem enviar alteração de negócio. Rede não é exigência do disparo local.
- Limite explícito: um dispositivo offline não sabe de exclusão remota feita em outro ambiente. Não prometer cancelamento distribuído sem comunicação; sincronizar manualmente/atualizar antes de confirmar coerência remota.
- Retorno canônico `reminders: []` prevalece. Remover preservações cegas em fromApiTask/Context/sync para coleções tipadas; não usar cache como autoridade sobre o campo novo.
- Cache antigo `string[]` vai para apoio legado separado (`legacyReminders`/snapshot versionado), sem apagá-lo nem tratá-lo como configuração confirmada. Labels conhecidos podem ser oferecidos como proposta de conversão, **somente mediante revisão/salvamento explícito do usuário**; rótulos desconhecidos preservados, não interpretados por regex livre.
- Na sync, tipados confirmados são lidos com IDs; server vence conforme regra vigente, preservando snapshots divergentes. Incluir coleção/fuso na comparação de campos de domínio; excluir journal Android dos uploads.
- Importação de Task legada por clientId não promove strings a reminders automaticamente. Manter três Tasks sem projectId pendentes, sem associação por nome. Nenhuma limpeza em massa.
- Só reconciliar a sync após downloads finais e cache consolidado confirmados; falha intermediária não cancela/recria agendas com snapshot parcial. Tombstones cancelam, retry mantém mesmos IDs, [] remove e sync repetida é no-op para agenda idêntica.

## 11. Preparação limitada para recorrência (#40)

Cada ocorrência futura será uma **Task com ID próprio**, com cópia dos offsets e
fuso da regra pertinente e **novos Reminder IDs daquela ocorrência**. A assinatura
e o notificationId já incluem Task, logo não colidem entre ocorrências. Geração
idempotente da ocorrência pertence à #40. Na #39, somente one-shot: não usar repeat
nativo, tabela de séries, RRULE ou regras independentes de recorrência. Assim
conclusão/exclusão de uma ocorrência não cancela lembretes de outra.

## 12. Matriz de testes proposta

Nenhuma notificação real em Jest/Vitest: relógio, resolvedor de fuso, HTTP, storage
e adapter nativo injetados/mockados. A matriz descreve validações planejadas, ainda não executadas.

| ID | Camada | Cenário / prova necessária |
|---|---|---|
| U01 | Domínio | Converter minutos/horas/dias e presets 15/30/60/0/1440; labels somente apresentação. |
| U02 | Domínio | Zero especial, negativos, frações, strings, unidade inválida, overflow, offset duplicado e limite proposto de cinco. |
| U03 | Domínio | dueDate + time + IANA → UTC correto; startDate diferente não muda a âncora. |
| U04 | Domínio | Sem time com/sem reminders, dia inválido, HH:mm e IANA inválidos. |
| U05 | Domínio | Casos A–F, igualdade com now e validação de todos os offsets afetados. |
| U06 | Domínio | DST: gap e horário duplicado rejeitados; 1 dia como 24h; fixtures Node/Hermes equivalentes. |
| U07 | Mapeamento | Dia canônico preservado no cache após mudar fuso; não reinterpretar ISO local como outro prazo. |
| U08 | Mapeamento | POST/PATCH serializam tipados; omitido/[]; leitura devolve canônico e não ressuscita cache antigo. |
| U09 | Context/UI | Nova/Editar exibem/adicionam/removem/salvam múltiplos; preservar #39/13 e visual aprovado; erro não mostra sucesso antecipado. |
| U10 | Adapter | ID estável, duas reconciliações/reabertura/sync idênticas não duplicam; título/projeto não reagendam. |
| U11 | Adapter | Temporal alterado cancela anterior; cancel falho não cria segundo trigger; retry apenas local. |
| U12 | Adapter | Remoção/DELETE/conclusão, compensação de falha, undo/restore, última subtarefa e reabertura futura/expirada. |
| U13 | Adapter | API confirmou + cache/journal/SDK falhou: estado discriminado, sem repetir POST; crash entre journal/SDK/consulta. |
| U14 | Sync | clientId/retry/resposta perdida, tombstone, [], snapshots, strings legadas, três pendências preservadas e nenhum upload de estado Android. |
| U15 | Adapter | Limite de triggers, permissão/canal negado/revogado e segundo clock-check após POST lento. |
| B01 | Backend | Criar Task com múltiplos reminders → GET/listagem/SQLite com mesmos IDs e fuso. |
| B02 | Backend | PATCH omitido conserva; substituição diff adiciona/remove; conjunto repetido mantém IDs; zero itens limpa fuso. |
| B03 | Backend | FK/unique/check; Task inexistente, nenhum vínculo a outra Task por IDs do corpo. |
| B04 | Backend | Forma/offset/time/fuso e casos A–F; PATCH efetivamente igual não revalida histórico como novo. |
| B05 | Backend | Falha no segundo Reminder ou histórico desfaz Task/coleção/fuso integralmente. |
| B06 | Backend | Soft delete mantém filhos; GET operacional oculta, sync inclui tombstones; RESTORE recupera configuração sem validar passado como criação. |
| B07 | Backend | Retry por clientId retorna conjunto original, inclusive se trigger venceu; não duplica filhos/histórico. |
| B08 | Banco | Migration futura em vazio e upgrade de 0002 preserva Tasks/Notes/Subtasks/History/IDs; reaplicação segura e foreign_key_check. |
| A01 | Android | Build debug/release RN 0.87.1/Hermes/SDK 37-target 36; API 24/26/31/33+ conforme ambiente disponível, Pixel 7 target principal. |
| A02 | Android | Autorizar/negar/revogar notificações e alarmes exatos; canal bloqueado; nenhuma solicitação de permissões estranhas. |
| A03 | Android | Disparo foreground/background, tela bloqueada, Doze, processo morto normalmente e retirada dos recentes; distinguir force-stop. |
| A04 | Android | Editar dueDate/time/offset, conferir retirada anterior e único futuro em dumpsys/consulta; editar título não reagenda. |
| A05 | Android | Excluir/cancelar confirmação/undo antes dos 5s e erro de rede; mesmos IDs após RESTORE; nada retroativo. |
| A06 | Android | Concluir/reabrir por Task e subtarefas, conservando só futuros. |
| A07 | Android | Fechar/reabrir app e sync repetida; ausência de duplicatas; configuração/pendências corretas após falha de cache/SDK. |
| A08 | Android | Reboot normal **sem abrir app**, reboot com trigger vencido, permissões revogadas e recuperação após abrir; sem prometer o não observado. |
| A09 | Android | Troca de fuso/DST/relógio manual; IANA ancorado e política explícita; nenhum rearm retroativo pela reconciliação. |
| A10 | Android | Offline de API mantém agenda confirmada; POST/PATCH falho não agenda draft; avisos distinguem salvo/agendado. |

Além da matriz: quatro comandos CI mobile, checks backend, `git diff --check` e
CI verde sem ampliar baselines; Android em massa isolada, sem apagar dados úteis.
Capturas/logs somente temporários, não versionados.

## 13. Decomposição técnica vinculada à Issue #39

Arquivos abaixo são **prováveis e futuros**. As tasks estão planejadas e ainda não iniciadas; permanecem
subordinadas à #39 e não alteram seus pontos automaticamente.

| ID / categoria / título | Objetivo | Arquivos/camadas prováveis | Dependência | Critério de conclusão futuro |
|---|---|---|---|---|
| T01 [ARQ] Fechar contrato de domínio/tempo | Fechar cardinalidade, IANA ancorado, expectativa de precisão e algoritmo A–F | Este documento; tipos Task; helpers de domínio mobile/backend | Revisão deste refinamento e autorização de início | Decisões aceitas, fixtures temporais equivalentes e nenhuma ambiguidade sobre passado/sem horário. |
| T02 [ANDROID] Gate de compatibilidade e permissões | Determinar a precisão necessária e validar release candidata no projeto, manifest e reboot; modo exato somente com necessidade demonstrada | package.json/lock, android/, adapter de prova na futura branch | T01; aprovação de início e integração da biblioteca | RN 0.87.1/New Architecture, build debug/release, canal, agendamento, consulta/identidade, cancelamento/reagendamento, background, processo encerrado, permissões e reboot quando aplicável comprovados; falha exige registro e avaliação de alternativa antes de schema/backend. |
| T03 [BANCO] Schema e migration aditiva | Persistir coleção/fuso sem perder legado | backend/src/database/schema/, backend/drizzle/ | T01 e T02 concluídos | Migration nova, constraints/upgrade/rollback testados; antigas inalteradas. |
| T04 [BACK] Repositório/agregação | CRUD da coleção e respostas completas | repositories/tasks.ts, futuro repository de reminders | T03 | find/create/update/retry/lista/tombstones/restore devolvem mesmos IDs e coleção canônica. |
| T05 [BACK] Contrato/validação/transação | Estender POST/PATCH e preservar lifecycle/history | schemas/tasks.ts, services/tasks.ts, controllers/tasks.ts, error-handler | T04 + helper T01 | Erros claros, diff atômico, retry idempotente e casos A–F; sem endpoints extras. |
| T06 [MOBILE] Tipos, mapping e cache legado | Canonicalizar tipados sem destruir strings antigas | models/reminder.ts proposto, TaskContext.tsx, taskService.ts | T05 | GET/PATCH/POST corretos, [] autoritativo, dueDateKey/fuso íntegros, legacy separado. |
| T07 [ANDROID] Adaptador e journal | Agendar/reconciliar/cancelar com identidade | services/reminderScheduler.ts proposto, storage derivado, index.js/native config se necessário | T02 + T06 | Mesmo snapshot é no-op; falhas/limites/poder de permissão explícitos; sem timer JS ou dependência de rede para disparar. |
| T08 [MOBILE] Integrar todos os lifecycles | Ligar persistência confirmada ao scheduler e compensações | TaskContext.tsx, useTaskDeletion.ts somente se necessário | T07 | Create/edit/delete/undo/status/subtasks/read/reopen corretos; janela da #10 preservada e sem POST repetido. |
| T09 [MOBILE] Compatibilizar sync | Preservar identidade/snapshots e cancelar tombstones | syncService.ts, TaskContext.tsx, importLocalTask | T06 + T08 | Sync repetida não muda agenda; legado não vira configuração nem some; agenda só após consolidação. |
| T10 [MOBILE] Reutilizar Nova/Editar | Seleção estruturada e feedback salvo/agendado | NewTaskScreen.tsx, EditTaskScreen.tsx, componente simples se útil | T08–T09 | Múltiplos visíveis/editáveis; controles atuais preservados; fuso/erros claros; sem redesenho. |
| T11 [TEST] Automatizar matriz | Cobrir U01–U15 e B01–B08 com falhas/crash | __tests__/, backend/tests/ | T01 e T02 concluídos; cobertura incremental por camada, consolidada após T10 | Fixtures determinísticas, mocks sem notificações reais, regressão e CI verdes. |
| T12 [TEST] Validar Android integrado | Executar A01–A10 e registrar limites reais | Pixel 7, build debug/release e evidências temporárias | T10–T11 | Fluxos, persistência, permissões, background, reboot e ausência de duplicação demonstrados; impedimentos não declarados aprovados. |
| T13 [DOC] Contrato, evidências e PR da feature | Atualizar documentação e critérios somente do entregue | docs/arquitetura/, docs/sprints/ e Issue #39 | T12 | PR revisável para dev, testes/limites registrados, #39 só concluída após DoD e merge, branch removida quando seguro. |

### Ordem futura aprovada

T01 e T02 precedem o desenvolvimento das demais camadas. O gate T02 é uma
validação futura no projeto real, ainda pendente; a biblioteca permanece candidata.
Falha no gate exige registro e avaliação de alternativa antes de schema/backend.

1. **T01 — contrato de domínio e regras temporais:** fechamento do modelo e das regras A–F.
2. **T02 — gate Android de compatibilidade:** precisão necessária, release candidata, RN 0.87.1/New Architecture, debug/release, canal, agendamento, consulta/identidade, cancelamento, reagendamento, background, processo encerrado, permissões e reboot quando aplicável.
3. **T03 — schema/migration**, após conclusão de T01 e T02.
4. **T04 — repository.**
5. **T05 — API/backend.**
6. **T06 — tipos/mapping/cache.**
7. **T07 — scheduler/journal.**
8. **T08 — lifecycle.**
9. **T09 — sync.**
10. **T10 — UI.**
11. **T11 — testes automatizados:** cobertura incremental nas camadas após os gates, com consolidação da matriz U/B.
12. **T12 — Android integrado:** validação da matriz A.
13. **T13 — documentação/fechamento:** evidências e PR revisado, sem merge automático.

Estado: todas as tasks permanecem planejadas, sem implementação iniciada.

## 14. Riscos, mitigação e avaliação dos 13 pontos

| Risco | Nível | Mitigação / gate |
|---|---|---|
| Compatibilidade do fork com RN 0.87.1/AGP 9.2.1/SDK 37 | Alto | Release publicada fixada e build/device em T02; peer range não é certificação. Não trocar stack silenciosamente. |
| Background/Doze/OEM e reboot | Alto | Testes reais separados de processo morto/force-stop; validar receiver/manifest final e futuros one-shot; registrar falhas. |
| Precisão/alarmes exatos/acesso revogado | Alto | Justificar pela antecedência curta; aprovação explícita da expectativa; check de capacidade e sem fallback inexato anunciado como exato. |
| Fusos/DST e ISO local antigo | Alto | IANA persistido, dueDateKey, resolvedor comprovado, fixtures idênticas e rejeição de ambiguidade. |
| Duplicação/crash entre API, cache e Android | Alto | IDs canônicos, diff/journal durável, fila e consulta nativa, estados separados; não alegar transação entre sistemas. |
| Offline/resposta perdida | Alto | API primeiro para negócio, clientId existente, recuperação e retry apenas de agendamento após commit; nunca agendar draft. |
| Soft delete/undo e corrida com entrega | Alto | Supressão provisória/compensação, RESTORE iniciado dentro da janela, falhas observáveis e testes; não prolongar os 5s. |
| Schema/contrato e legado | Médio | Migration aditiva testada, [] autoritativo, snapshots, nenhum parsing/upload automático de strings. |
| Limite de triggers/múltiplos | Médio | Medir limite real no SDK escolhido; no máximo cinco por Task proposto; avisar capacidade sem descartar silenciosamente. |
| Compatibilidade futura com #40 | Médio | One-shot por ocorrência/Task ID; copiar offsets com novos Reminder IDs; não construir séries agora. |
| UI/textos | Baixo | Reutilizar padrão aprovado e formatar labels de valores, sem redesign. |
| Prazo atualizado / freeze 08/11 | Alto | Gate Android cedo; evitar implementação paralela de alternativas; renegociar com evidência se T02/T01 não fecharem. |

**13 pontos continuam a estimativa oficial.** A auditoria mostra trabalho completo
em domínio/fuso, banco, API, cache/sync, lifecycle e Android, não apenas conexão da
UI a uma biblioteca. É uma estimativa **otimista/de alto risco**, plausível apenas
se compatibilidade/precisão e motor temporal forem aprovados rapidamente. Não há
evidência suficiente para substituí-la por outro número. Falhas nos gates exigem
registro e reestimativa aprovada, preservando cardinalidade, segurança, aceite e
DoD. A prontidão da #39 para desenvolvimento depende da revisão desses gates;
a implementação permanece não iniciada.

## 15. Resultado do refinamento

Resultado: refinamento técnico documentado na branch `docs/refine-39-reminders`,
com registro em `docs(sprint): refina arquitetura de lembretes` e PR para `dev`,
sem merge automático. Requisitos oficiais, Sprint Goal, Planning Poker e estado
da Issue permanecem preservados. A decomposição técnica está registrada neste
documento, sem novas Issues no GitHub. Dependências, migrations e arquivos
funcionais permanecem inalterados. A implementação da Issue #39 continua pendente.

## Execução T03–T05 — 26/10/2026

Etapa na branch `feature/39-reminders`, após o segundo gate Android aprovado
com limitações. T01 e a política de alarmes inexatos permanecem vigentes.
T06–T13 continuam pendentes; esta etapa não integra cache, formulários,
TaskContext, scheduler, lifecycle ou sync.

### Schema e migration (T03)

Migration aditiva `0003_task_reminders.sql`, sem modificar 0000–0002:

- `task_reminders`: UUID próprio `id`, `task_id`, `offset_minutes`, `created_at`
  e `updated_at`, seguindo timestamps UTC e nomes SQLite do backend.
- FK `tasks.id ON DELETE RESTRICT`; unique `(task_id, offset_minutes)`; check
  de inteiro não negativo e limite seguro para conversão em milissegundos.
- Triggers de INSERT e mudança de `task_id` protegem o limite de cinco itens
  por Task também em gravações diretas no SQLite.
- `tasks.reminder_time_zone` nullable concentra o IANA compartilhado. Coleção
  não vazia exige fuso explícito na primeira configuração; edições podem usar
  o persistido. `[]` limpa o fuso, permitindo recapturá-lo na configuração seguinte.
  Validade IANA e coerência com data/hora são responsabilidade do service.
- Tasks antigas ficam com fuso null e `reminders: []`. Nenhuma string do cache
  mobile é interpretada, importada ou promovida a domínio. Os dados legados
  locais, inclusive as três pendências sem projeto, não foram modificados.

`reminders-migration.test.ts` usa arquivos SQLite em diretórios temporários:
instala somente 0000–0002, insere Task excluída e dados em Projects, Subtasks,
Notes e History, aplica 0003 e compara os campos anteriores integralmente,
incluindo IDs/clientId/deletedAt. Também testa banco vazio, reaplicação do
migrator e `foreign_key_check`. Nenhum teste usa o banco pessoal.

### Repository e identidade (T04)

`TasksRepository` agrega reminders ordenados por offset crescente em detalhe,
lista, tombstones e retry. A lista consulta filhos em lote e os agrupa por Task.
Sem configuração, retorna sempre `[]`. `triggerAt` UTC é calculado na leitura,
inclusive para registros expirados, sem persistir um segundo instante canônico.

O diff remove somente offsets ausentes e gera UUID somente para offsets novos.
Offsets mantidos conservam ID e timestamps, inclusive com ordem de entrada
invertida. A API recebe somente offsets e rejeita IDs/taskId/timestamps no
payload; não permite mover um reminder de outra Task.

DELETE continua lógico e não remove linhas de reminders. RESTORE conserva
Task ID, Reminder IDs, fuso e configuração, sem exigir que disparos históricos
voltem a ser futuros. Retry de POST por `clientId` resolve a identidade antes
da validação temporal de criação e retorna os reminders persistidos, inclusive
após vencimento ou soft delete, sem duplicar Task, filhos ou History.

### Contrato e transações (T05)

POST/PATCH usam o contrato agregado existente, sem novos endpoints:

```json
{
  "time": "10:00",
  "reminderTimeZone": "America/Sao_Paulo",
  "reminders": [{ "offsetMinutes": 15 }, { "offsetMinutes": 60 }]
}
```

Os demais campos obrigatórios de criação continuam exigidos. POST sem
reminders equivale a `[]`. PATCH omitido preserva a coleção; `[]` remove tudo;
coleção enviada aplica diff. POST, PATCH, GET lista/detalhe e RESTORE retornam
reminders com `id`, `taskId`, `offsetMinutes`, timestamps UTC e `triggerAt` derivado.
Nenhuma label visual pertence ao payload canônico.

Zod valida array, itens estritos, máximo cinco, inteiro seguro não negativo e
unicidade. O service valida o estado final mesclado com **a implementação de
T01**, agora em `backend/src/domain/reminders/index.ts`; o caminho mobile
`src/domain/reminders/index.ts` reexporta essa fonte pura, sem mudar suas regras.
Não há nova dependência ou integração de mapping/cache. O backend compila essa
mesma fonte no build, e os 33 testes mobile de T01 continuam usando-a.

Âncora continua `dueDate + time` no IANA persistido; 1440 minutos são 24h
absolutas. Gap/overlap são rejeitados. Novos offsets e mudança efetiva de
âncora exigem futuro estrito. GET/RESTORE/retry e edição que mantém offsets
expirados não aplicam validação de passado como nova configuração. Remoção de
expirados e conclusão permanecem permitidas.

Transações SQLite `immediate` incluem Task, subtarefas de criação, diff de
reminders, fuso e History. Falha de insert ou de History desfaz o conjunto
inteiro. Mudança efetiva integra `UPDATED`; nenhum evento novo foi criado.
PATCH idêntico conserva IDs, timestamps e History, sem atualização fictícia.

### Evidência automatizada

- B01: múltiplos reminders, zero, cinco itens, ordem e GET vazio.
- B02: PATCH omitido/[]/diff/repetido, IDs/timestamps e recaptura de fuso.
- B03: FK, unique, check, cardinalidade, hard delete restrito, isolamento entre
  Tasks, IDs de outro pai rejeitados e Task inexistente.
- B04: A–F, antecedência de 24h, fuso inválido, horário ausente/inválido,
  Sao Paulo/Kathmandu, DST Nova York/Lord Howe e retenção de expirados.
- B05: rollback de criação com filhos e reminders; falha no insert após remoção
  do diff; falha no History restaura Task, fuso e coleção inteira.
- B06: soft delete/restore de configuração já expirada.
- B07: clientId/retry com resposta repetida, vencimento e tombstone.
- B08: banco vazio, upgrade isolado, dados preservados e foreign key check.

Validação: 317 testes backend em 13 suítes; 385 testes mobile em 23 suítes;
16 testes dos validadores CI. Migration em banco temporário, typecheck backend,
build, lint CI e typecheck mobile aprovados. Mantidos 3 erros/7 warnings de
lint e 11 diagnósticos TypeScript conhecidos, sem ampliar baselines.

## Execução T06–T09 — 26/10/2026

Integração na mesma branch `feature/39-reminders`, preservando o backend de
T03–T05 e o domínio temporal de T01. A Issue permanece aberta. T10 (formulários
e feedback visual), T12 (validação Android final em dispositivo) e T13 continuam
pendentes. Não houve alteração visual em Nova/Editar, TaskDetails, Home ou Calendar.

### Tipos, mapping e cache (T06)

`src/models/reminder.ts` define `Reminder`, `ApiReminder` e `ReminderInput` de
acordo com o retorno real do backend: ID próprio, Task ID, offset, timestamps e
`triggerAt`. `Task` agora suporta coleção tipada, `reminderTimeZone` e os dias
literais `dueDateKey`/`startDateKey`, evitando reinterpretar o dia de um ISO antigo
após viagem. Atualização que repete o mesmo ISO conserva a chave civil recebida;
um dia efetivamente editado é serializado como novo dia.

O cache continua em `@taskflow:tasks`. Hidratação detecta `string[]`, move as
labels para `legacyReminders` e usa `reminders: []`, sem interpretar nomes ou
converter presets. Cache canônico valida coleção, identidade, offsets e
timestamps. Conteúdo inválido ou falha de leitura bloqueia a regravação do cache
original. Não há limpeza de dados nem promoção das três tarefas legadas sem projeto.

`fromApiTask` usa sempre os reminders remotos; `[]` é autoritativo. Evidência
legada permanece separada nas leituras, mutações, restore e sync. O marcador
local `remindersConfirmed` só é produzido pelo mapping de resposta remota e fica
persistido no cache; nunca faz parte do contrato HTTP. Cache antigo sem essa
confirmação não se torna fonte de novas agendas.

POST/PATCH serializam somente `{ offsetMinutes }` e `reminderTimeZone` quando
presentes. PATCH omitido não envia coleção; `[]` é remoção explícita. IDs,
timestamps, flags locais, snapshots e journal não são enviados. Importação por
clientId conserva a identidade existente e não promove labels legadas.

`VisualReminderDraft` é a fronteira temporária para a UI antiga de Nova Tarefa:
strings são preservadas como evidência local e omitidas no POST canônico. Não são
configuração de notificação. T10 substituirá essa fronteira por controles tipados.
`deviceReminderTimeZone()` obtém e valida o IANA do aparelho sem fallback Node.
A pré-validação usa o mesmo `validateReminderChange` de T01, sem nova semântica;
POST com clientId delega a decisão temporal ao backend, que distingue retry de
uma nova criação mesmo depois do vencimento.

### Scheduler, journal e infraestrutura nativa (T07)

`src/services/reminderScheduler.ts` concentra a lógica Android fora do Context.
Recebe somente Tasks remotas confirmadas, resolve o instante pelo domínio T01 e
confere a equivalência com `triggerAt` da API. Estado concluído, tombstone,
remoção e vencimento produzem cancelamento. Novos triggers exigem futuro e são
rechecados depois da gravação do journal, imediatamente antes da chamada nativa.

Identidade única: `task-reminder:<taskId>:<reminderId>`. A assinatura contém dia
civil, hora, IANA, offset e triggerAt; não inclui título, descrição, projeto,
prioridade ou timestamps de atualização. Mesmo snapshot consulta/confirma a agenda
sem cancelar/reagendar triggers iguais. A fila serial também protege chamadas
concorrentes. Cancelamentos são confirmados por consulta antes de substituições;
falha interrompe o lote e mantém intenção para retry local.

Journal versionado em `@taskflow:reminder-journal:v1`, separado de Tasks e do
ledger de sync. Persiste identidade, assinatura, instante, estado, erro e
supressão provisória por Task. A ordem é intenção durável → operação nativa →
consulta → confirmação durável. Se a resposta de schedule se perder, a próxima
consulta reconhece o mesmo ID/instante e não duplica o trigger. Registro inválido
não é sobrescrito. Retry offline usa apenas esse journal, conservando supressões
incertas até uma nova confirmação remota.

Resultados expostos ao Context e aos callers: `not_required`, `scheduled`,
`pending`, `unavailable` e `error`. `cacheSaved` é independente do resultado do
scheduler. Edição irrelevante conserva o último resultado conhecido, inclusive
indisponibilidade, sem produzir falso sucesso. Esses dados serão consumidos pela
UI em T10; esta etapa não adiciona mensagens ou solicitações visuais de permissão.

O módulo definitivo chama-se `NativeTaskReminders`; classes Kotlin
`TaskReminderModule`, `TaskReminderPackage`, `TaskReminderStore`,
`TaskReminderAlarmReceiver` e `TaskReminderRecoveryReceiver`, no pacote
`com.gerenciadortarefas.reminders`. Spec/Codegen usam `TaskRemindersSpec`.
Foram removidos Activity debug, componente `src/dev/ReminderGate.tsx`, registro
React e restrições de IDs da prova. Documentação/evidências do gate permanecem
como histórico técnico, não como uma tela operacional da aplicação atual.

Registro nativo contém somente ID técnico e trigger UTC. Notificação genérica:
“Gestor Diário” / “Você tem uma tarefa próxima do prazo.” Não armazena título,
descrição ou projeto. Mantidos `setAndAllowWhileIdle` inexato e a consulta de
permissão global/canal; nenhuma permissão de exact alarm foi introduzida.
Recovery por reboot/atualização/abertura rearma somente futuros e descarta
vencidos, sem publicar durante recovery. Entrega normal do AlarmManager continua
separada dessa recuperação, conforme a política aprovada no segundo gate.

### Lifecycle e operações confirmadas (T08)

- Create: validar → POST confirmado → estado/cache → journal/reconciliação.
  Falha de API não agenda draft. Falha local depois do commit retorna o resultado
  separado e nunca reenvia POST/PATCH para recuperar Android.
- Update: usa a resposta remota e compara assinatura efetiva. Mudança temporal
  reconcilia diff; título/descrição/projeto/prioridade não tocam na agenda.
- Cache falhou após confirmação: não arma configuração nova sem snapshot durável;
  tenta suprimir agendas obsoletas e retorna pendência/erro explícito.
- DELETE e conclusão explícita: intenção de supressão e cancelamento provisório
  antes da API. Falha na preparação impede enviar a operação. Falha da API
  compensa a partir da configuração anterior confirmada, somente para futuros.
  Erro de compensação permanece observável junto ao erro da operação.
- DELETE confirmado conserva a configuração canônica no backend e a agenda
  cancelada. Undo continua com cinco segundos a partir da confirmação remota.
  Após DELETE não há segunda rodada de scheduler bloqueando o undo.
  RESTORE é enviado dentro da janela sem aguardar scheduler; após resposta,
  mesmos IDs e somente futuros podem voltar a ser armados.
- Reabertura e add/toggle/remove de subtarefas usam o status efetivo da resposta.
  Última subtarefa concluída cancela triggers. Configuração histórica expirada
  não impede conclusão, restore ou reabertura.
- Startup aguarda hidratação segura e GET completo; detalhe reconcilia somente
  seu escopo. GET atrasado não desfaz mutações confirmadas e não libera supressão
  durante operação em andamento. Foreground atualiza um snapshot completo antes
  de reconciliar; falha de rede usa somente o journal confirmado, sem inferir
  exclusão a partir de lista parcial ou cache ilegível.

### Sincronização (T09)

`syncService` normaliza legado, usa reminders/fuso remotos e conserva snapshots
divergentes. Comparação ordenada inclui IDs, Task IDs e offsets, sem usar
createdAt/updatedAt como conflito artificial. Dias civis preservados participam
da comparação. Nenhuma preservação cega de `local.reminders` permanece.

O resultado inclui `reminderSnapshot`, extraído da leitura remota final com
tombstones. Somente após downloads/uploads necessários, consolidação e gravação
de ambos os caches o Context entrega esse snapshot completo ao scheduler. Erro
intermediário não cancela/recria triggers. Ausência em consulta parcial não é
exclusão; tombstone ou ausência em snapshot completo confirmado podem cancelar.
Sync repetida conserva IDs e um único trigger; `[]` remoto remove configuração
local tipada sem ressuscitar evidência legada. Journal nunca entra nos uploads.

### Evidências e limites

Testes Jest usam módulo nativo mockado; não publicam notificações reais. Cobrem
mapping, cache antigo/novo, coleção vazia autoritativa, datas/fuso, omitido/[],
identidade determinística, diff, fila, journal, crash após schedule, retry,
cancelamento falho, permissão, expiração, create/update/delete/restore/status,
subtarefas, startup/foreground, sync repetida, tombstone e falha intermediária.

Android `:app:assembleDebug :app:assembleRelease`: **BUILD SUCCESSFUL** nas quatro
ABIs padrão. Codegen gera `NativeTaskRemindersSpec` e a integração C++
`TaskRemindersSpec`; Hermes e `newArchEnabled=true` mantidos. Nenhuma alteração de
toolchain ou dependência foi necessária. Builds comprovam compilação/empacotamento;
a repetição final dos cenários de entrega, Doze e permissões em dispositivo
permanece T12.

Mantidas as limitações do segundo gate: alarmes inexatos podem atrasar, sem SLA
de minuto; recovery não publica vencidos. Não existe transação conjunta entre API,
AsyncStorage e AlarmManager. A janela até confirmar cancelamento permanece real;
falha de journal/cancelamento não é tratada como sucesso. Offline não revela
exclusões feitas remotamente em outro aparelho; a próxima leitura completa
reconcilia esse estado.

Validação local desta etapa: **447 testes mobile em 27 suítes** (62 novos),
**317 testes backend em 13 suítes** e **16 testes dos validadores CI** aprovados.
Lint mantém 3 erros/7 warnings conhecidos; TypeScript mobile mantém os 11
diagnósticos conhecidos. Baselines não foram ampliadas. Migration aplicada em
SQLite temporário, typecheck/build backend e `git diff --check` aprovados.
As quatro migrations existentes e o código backend permanecem inalterados.

### Atualização de cronograma — 29/10/2026

O professor prorrogou a data máxima de commit e push para **08/11/2026**.
O prazo anterior de **01/11/2026** foi substituído. A validação Android manual
e o fechamento da Issue #39 continuam sendo etapas separadas.

## T10 — interface e experiência de lembretes

Nova Tarefa e Editar Tarefa usam `ReminderInput[]`, com `offsetMinutes` como
configuração. O seletor compartilhado mantém os presets 0, 15, 30, 60 e 1440,
formata os valores em um helper e permite personalizados em minutos, horas e
dias usando a conversão do domínio. Quantidades inválidas, overflow, duplicatas
e mais de cinco lembretes são impedidos na interface. A lista segue ordem
crescente de antecedência, com remoção individual e controles acessíveis de 44px.

A primeira configuração captura o fuso IANA do aparelho. A edição preserva o
fuso salvo e as datas civis canônicas, inclusive com cache originado em outro
fuso. O PATCH omite reminders/fuso quando não foram alterados; remover todos
envia `reminders: []` e `reminderTimeZone: null`. Configurações de tarefas
concluídas continuam visíveis. Strings legadas são apenas informação e exigem
nova seleção manual para ativar notificações.

Antes de criar ou editar, o domínio valida horário, data, fuso e antecedências.
Alterar prazo/horário revalida a configuração existente sem exigir toque nos
lembretes. Lembretes exigem horário HH:mm válido; não há substituição silenciosa
durante validação. Sem lembretes, não se exige fuso nem permissão.

No Android 13+, POST_NOTIFICATIONS é consultada/solicitada somente ao adicionar
o primeiro lembrete. Negação permite persistir e explica que notificações estão
desativadas. O feedback de criação/edição distingue confirmação de agendamento,
configuração desnecessária e pendência/indisponibilidade/erro. Falha de cache
continua informada, inclusive junto com falha de scheduler, sem repetir POST/PATCH.

Testes usam apenas mocks, sem notificações reais. A regressão mobile contém
**500 testes em 28 suítes** (53 novos); backend mantém **317 testes em 13 suítes**.
Os 16 testes dos scripts CI, lint e TypeScript passaram sem ampliar baselines:
3 erros/7 warnings ESLint conhecidos e 11 diagnósticos TypeScript conhecidos.
Typecheck e build backend, assembleDebug/assembleRelease com Hermes, Codegen e
New Architecture e `git diff --check` aprovados. Os builds verificam compilação
e empacotamento; a validação funcional com a pessoa usuária no Pixel 7 permanece
**T12 pendente**. T13, PR final, merge e fechamento da Issue #39 não executados.

O milestone Sprint 2 e as referências de cronograma das Issues #39–#43 foram
atualizados para **08/11/2026**, preservando escopo e critérios de aceite.

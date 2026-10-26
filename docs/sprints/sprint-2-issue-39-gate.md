# Issue #39 — contrato temporal e gate Android (T01/T02)

O código de prova descrito aqui foi convertido em infraestrutura de produção
em T07. Activity/tela debug e nomes Gate foram removidos; a reprodução abaixo
refere-se aos commits históricos do gate. Estado atual: [execução T06–T09](sprint-2-issue-39.md#execução-t06t09--26102026).

## Escopo da etapa

Base `dev` em `c1bbcd36733e51295972442c33503383508f06cc`; branch
`feature/39-reminders`. A Issue permanece aberta, com Planning Poker 13.
Esta etapa cobre exclusivamente domínio temporal e prova nativa isolada.
Schema, migrations, backend/API, mapping/cache, scheduler definitivo, lifecycle,
sync e integração dos formulários permanecem pendentes de T03–T13.

## T01 — contrato implementado

- `src/domain/reminders/index.ts`: domínio sem React, HTTP ou Android.
- `Reminder` possui identidade própria, referência à Task, `offsetMinutes` e
  timestamps; nenhuma label, unidade visual ou estado de permissão é canônico.
  O tipo atual de Task permanece inalterado até T06.
- Até **cinco** offsets inteiros não negativos, únicos, ordenados crescentemente.
  Entradas duplicadas são rejeitadas, inclusive 60 minutos e 1 hora. A normalização
  não modifica o array recebido. Quantidades convertidas exigem inteiro positivo;
  zero representa explicitamente “No horário”. Overflow não é arredondado.
- Base: dia civil `YYYY-MM-DD` de `dueDate`, horário `HH:mm` e IANA explícito.
  `startDate` não participa do cálculo. Intervalo civil suportado: 1900–9999.
- Motor: `Intl.DateTimeFormat.formatToParts`, com regras IANA do runtime.
  Offsets anteriores/posteriores à data são candidatos; round-trip civil detecta
  gaps e overlaps, ambos rejeitados. Nenhum offset UTC fixo é assumido.
  Atualizações da base IANA do sistema podem alterar regras futuras; a equivalência
  Node/Hermes faz parte do gate, não da identidade de um lembrete.
- `triggerAt = anchorAt - offsetMinutes × 60000`; um dia corresponde a 24h
  decorridas, inclusive em DST. O relógio é injetado; igualdade a `now` é passado.
- `resolveReminderSchedule` calcula também o estado expirado, permitindo leitura
  e reconciliação sem disparo retroativo. `validateReminderChange` valida o estado
  final mesclado: nova âncora valida todos os offsets; offset novo exige futuro;
  manter/remover offset expirado é permitido. Os resultados expirados não são
  elegíveis para agendamento. A rechecagem imediatamente antes da chamada nativa
  pertence ao adaptador futuro.
- `sameReminderTiming` compara valores temporais efetivos e offsets normalizados,
  sem título, descrição, projeto ou timestamps de atualização. Preservar IDs ao
  persistir offsets existentes permanece responsabilidade futura de repository.

### Evidência automatizada

33 testes determinísticos em `__tests__/reminderDomain.test.ts`: U01–U06,
minutos/horas/dias, zero, múltiplos, limites, duplicados, valores inválidos,
Sao Paulo/Kathmandu, gap/overlap de Nova York, meia hora de Lord Howe, dia
inexistente em Apia, DST com duração absoluta de 24h e os casos A–F.
Nenhum teste unitário agenda notificações reais.

## T02 — infraestrutura da prova

Candidato publicado: `react-native-notify-kit` **10.9.0**, versão exata no lock.
Instalação concluída; integração definitiva condicionada ao resultado abaixo.
Referências: [suporte de ambiente](https://docs.page/marcocrupi/react-native-notify-kit/react-native/environment-support)
e [triggers](https://docs.page/marcocrupi/react-native-notify-kit/react-native/triggers).
A faixa declarada pelo fornecedor não substitui o build neste projeto.

`ReminderGateActivity` existe somente no source set debug. A entrada React
`src/dev/ReminderGate.tsx` é registrada somente com `__DEV__`, sem rota na aplicação,
sem TaskContext e sem persistência de negócio. A prova cria canal próprio e usa
um único ID: `task-reminder:gate-task:gate-reminder`. Agendar novamente substitui
esse mesmo ID; cancelar afeta somente esse ID.

Modo testado: `SET_AND_ALLOW_WHILE_IDLE` **inexato**. O manifest remove as
permissões herdadas `SCHEDULE_EXACT_ALARM`, `ACCESS_NOTIFICATION_POLICY` e
`FOREGROUND_SERVICE`, desnecessárias à prova. Notificações dependem da permissão
normal `POST_NOTIFICATIONS` em Android recente. A prova consulta a permissão e
recusa confirmar agendamento quando não autorizada.

Alarmes inexatos podem atrasar sob batching/Doze/restrições do fabricante;
[Android não garante precisão de minuto](https://developer.android.com/develop/background-work/services/alarms).
O gate não estabelece alarmes exatos como requisito. Precisão observada e
aceitabilidade para RF15/RF16 precisam permanecer explícitas no resultado.

## Resultado do gate

### Evidências obtidas

- Instalação npm e autolinking concluídos; versão exata 10.9.0, RN 0.87.1.
- `:app:assembleDebug :app:assembleRelease`: **BUILD SUCCESSFUL**, quatro ABIs
  padrão, sem alterar toolchain ou código do fornecedor. Avisos existentes de
  Gradle/KSP permanecem; não foram necessárias adaptações para forçar o build.
- Pixel_7 virtual, Android API 36, Hermes/Fabric (`fabric: true`). APK debug
  instalado com atualização, sem apagar dados; Metro operacional.
- Fixtures Hermes: Sao Paulo `1792843260000`, Kathmandu `1792811760000`, iguais
  ao Node; gap e overlap de Nova York rejeitados.
- Permissão inicial -1; negativa no diálogo retornou 0. Tentativa de agendamento
  negada retornou erro compreensível, sem trigger. Nova solicitação/concessão
  retornou 1; `settings.android.alarm` permaneceu 0 (sem acesso exato).
- Dois agendamentos consecutivos com o mesmo ID resultaram em um único trigger,
  consultável com `getTriggerNotifications`; tipo de alarme 1 (inexato).
- Cancelamento retornou lista vazia; reagendamento conservou a identidade.
- Foreground: solicitado para 23/10/2026 **20:35:55.967Z**, publicado em
  **20:36:41.044Z** (`date` nativo `1792787801044`): atraso **45,077 segundos**.
  Depois do disparo, lista de triggers vazia e uma notificação exibida. Isso
  comprova entrega, mas não precisão de minuto nem SLA sob Doze.

- Background: solicitado para **21:19:44.031Z**, publicado em **21:20:29.082Z**
  (45,051 s de atraso), processo vivo fora de primeiro plano.
- Remoção dos recentes: tentativas de gesto/teclado não confirmaram a retirada
  da Activity da lista de tarefas. O disparo observado nesse ensaio não é
  contabilizado como aprovação desse cenário.
- Processo encerrado normalmente com `am kill` após Home: PID ausente antes do
  disparo. Entrega solicitada para **21:52:21.097Z**, publicada em
  **21:53:06.894Z** (45,797 s), antes da abertura manual do app. Após reabrir,
  nenhum trigger pendente e uma notificação exibida.
- Permissão revogada por `pm revoke`: estado 0, nenhuma notificação pendente;
  tentativa seguinte recusada. Concessão posterior reconhecida como estado 1.
- `force-stop`: ausência de entrega enquanto parado na janela observada de 90 s.
  **Ao reabrir**, a configuração vencida foi publicada: solicitada para
  **21:54:38.053Z**, exibida em **21:55:11.068Z**, durante a inicialização.
  Esse resultado não representa suporte a force-stop.
- Reboot normal: `sys.boot_completed=1`; entrega verificada sem abertura manual
  do app. Solicitada para **21:56:26.734Z**, publicada em **21:56:43.772Z**
  (17,038 s). Reinicialização e cache nativo recuperaram o disparo futuro.
- APK release instalado com atualização e aberto pela MainActivity: Login normal,
  sem erro AndroidRuntime. APK debug restaurado, sem limpar dados.
- Ao final da sequência principal: nenhum trigger nem notificação exibida do gate.
  Somente o ID próprio foi cancelado; Tasks/Projects permaneceram intactos.

### Decisão: NO-GO para o candidato/configuração 10.9.0

A compatibilidade de build, canal, permissão, ID, consulta, substituição,
cancelamento e entrega sem processo JavaScript foi comprovada. A reprovação
ocorre pela **política de recuperação de disparos vencidos**, incompatível com a
regra de T01 de conservar expirados sem gerar disparo retroativo.

Na distribuição instalada, `android/src/main/java/app/notifee/core/NotifeeAlarmManager.java`
define `STALE_TRIGGER_GRACE_PERIOD_MS` em 24 horas. O método
`handleStaleNonRepeatingTrigger` publica uma notificação vencida dentro dessa
janela durante recuperação e depois remove a linha. A política não é um parâmetro
exposto no trigger testado. `InitProvider` verifica reboot no startup, e
`RebootBroadcastReceiver` também executa a recuperação, antes do controle da
camada JavaScript. Apenas filtrar expirados no futuro scheduler JS não garante
que a publicação nativa já não tenha ocorrido.

No Android 15+, [sair do estado force-stopped provoca BOOT_COMPLETED](https://developer.android.com/about/versions/15/behavior-changes-all#stopped-state),
coerente com a recuperação observada ao reabrir no Android 16. A restrição normal
do sistema enquanto force-stopped não é o motivo da reprovação; o motivo é o
catch-up nativo sem a política de expiração do projeto.

Atrasos de 17–46 s também foram observados no modo inexato. Eles não comprovam
SLA de minuto, funcionamento sob Doze prolongado ou em outros fabricantes.
A necessidade de precisão continua decisão explícita; alarmes exatos não foram
ativados e não corrigiriam, por si, a política de recuperação vencida.

Ao final do primeiro gate, o pacote e a Activity foram mantidos como prova
reproduzível, sem aprovação para integração definitiva. A substituição e a
remoção do pacote são descritas no segundo gate abaixo. A prova não está nas rotas nem no build
release como Activity; não constitui o scheduler T07. Nenhuma adaptação do código
do fornecedor ou receiver complexo foi introduzida para contornar o resultado.
T01 está concluída nesta etapa; T02 foi executado e não libera T03–T05.

### Alternativas registradas após o primeiro gate

1. Adaptador Android controlado pelo projeto, com AlarmManager e NotificationCompat:
   validar expiração no receiver antes de publicar, IDs estáveis e reconciliação
   explícita. Exige novo gate de bridge/New Architecture, debug/release e
   permissões; não foi implementado no primeiro gate.
2. Release de biblioteca com política de expiração/recuperação configurável e
   comprovada antes de publicar. Uma atualização ou configuração precisa passar
   novamente pelo gate; não há aprovação para fork ou patch silencioso.

Trocar apenas para WorkManager não é considerado correção demonstrada: trabalhos
adiados também exigem política de expiração e outro teste de precisão/background.
Nenhuma alternativa foi instalada automaticamente.

## Validações da etapa

- Domínio: 33 testes novos aprovados; mobile: **385 testes em 23 suítes**.
- Validadores CI: **16 testes aprovados**.
- Lint: **3 erros/7 warnings conhecidos**, sem regressão.
- TypeScript: **11 diagnósticos conhecidos**, sem regressão.
- Baselines, workflows, telas, TaskContext, serviços, backend e migrations intactos.
- `git diff --check` aprovado; nenhuma integração funcional da Issue #39 concluída.

## Segundo gate — adaptador Android controlado

### Arquitetura e isolamento

Prova própria em `android/app/src/main/java/com/gerenciadortarefas/remindergate/`:

- `ReminderGateStore.kt`: registro JSON em SharedPreferences privado
  `project_reminder_gate`, com `notificationId`, `triggerAt` UTC em milissegundos
  e payload fixo `Gate de lembretes`. Commit síncrono antes de confirmar o
  agendamento; nenhum título ou descrição de Task é armazenado.
- `ReminderAlarmReceiver.kt`: recebe exclusivamente a entrega explícita do
  AlarmManager, consulta o registro atual e publica via NotificationCompat e
  NotificationManager. Consome o registro e registra horário/atraso nativo.
  Não carrega JS nem depende de Metro para publicar.
- `ReminderRecoveryReceiver.kt`: BOOT_COMPLETED e MY_PACKAGE_REPLACED chamam
  recuperação sem publicação. Futuros são reagendados; vencidos (`<= agora`)
  são cancelados e removidos. A abertura das Activities também recupera,
  cobrindo o retorno de stopped em versões anteriores ao Android 15.
- `ReminderGateModule.kt` e `ReminderGatePackage.kt`: TurboModule próprio,
  com interface gerada por Codegen a partir de `specs/NativeReminderGate.ts`.
  Métodos assíncronos `schedule(id, triggerAt)`, `cancel(id)` e `getScheduled()`;
  respostas JSON incluem registros e disponibilidade da publicação.

A identidade do PendingIntent inclui componente explícito, action e URI com o
ID completo, sem hash sujeito a colisões. Reagendamento usa o mesmo PendingIntent;
notificações usam o ID completo como tag. Cancelamento remove somente esse
PendingIntent, registro e notificação. As operações nativas são sincronizadas.
A entrega lê o horário atual do registro, protegendo também contra um broadcast
antigo já enfileirado após reagendamento para um horário futuro.

Entrega normal e recuperação têm políticas distintas. Uma entrega normal pode
chegar depois de `triggerAt` por atraso do Android. A recuperação nunca publica
um registro vencido. A recuperação não roda em `Application.onCreate`, pois esse
método também é executado quando o alarme inicia um processo morto.

Modo inicial: `setAndAllowWhileIdle(RTC_WAKEUP)`, inexato, sem acesso especial de
exact alarm. A consulta de permissão inclui bloqueio global e do canal; agendar
sem publicação autorizada rejeita a Promise. Revogação entre consulta e entrega
é revalidada no receiver, que descarta o registro sem publicar.

`ReminderGateActivity` continua exclusiva de debug, registrada fora da navegação
normal, sem TaskContext. A infraestrutura nativa compila também em release para
validar Codegen/linkagem. RN 0.87.1, Hermes e `newArchEnabled=true` preservados.
Nenhum schema, migration, backend, repository, cache, lifecycle, sync ou UI de
Task participa deste gate. T01 e seus testes permanecem intactos.

### Critérios de precisão

RF15 define antecedência configurável em minutos, horas ou dias; RF16 exige
notificação local próxima do prazo, inclusive em segundo plano. Não há SLA
numérico nesses requisitos. O gate separa a correção de identidade/recuperação
da precisão de entrega: os ensaios inexatos indicam proximidade no dispositivo
observado, mas não autorizam prometer entrega no minuto configurado.

Conforme a [documentação Android de alarmes](https://developer.android.com/develop/background-work/services/alarms),
alarmes inexatos são agrupados e podem sofrer atraso adicional por economia de
bateria. Se o produto exigir precisão estrita, será necessário um gate específico
de alarmes exatos. Isso implicaria avaliar `SCHEDULE_EXACT_ALARM`, consultar
`canScheduleExactAlarms()`, conduzir a pessoa ao acesso especial de alarmes e
lembretes e tratar recusa/revogação sem afirmar precisão exata. Esse acesso não
foi solicitado nem adotado como permissão definitiva nesta prova.

### Ensaios no Pixel 7 virtual (API 36)

Tempos abaixo usam milissegundos UTC medidos no receiver; não são tempos de
renderização do JS. Evidência nativa e snapshots estão em
[`evidence/issue39-native-gate.txt`](evidence/issue39-native-gate.txt).

| Cenário | triggerAt | Publicação nativa | Atraso |
| --- | ---: | ---: | ---: |
| Foreground, mesmo ID agendado duas vezes | 1792795832048 | 1792795877047 | 44,999 s |
| Background (Home) | 1792795953949 | 1792795998966 | 45,017 s |
| Processo ausente e tela apagada | 1792796078633 | 1792796124391 | 45,758 s |
| Reagendamento, entrega única de T2 | 1792796448819 | 1792796458364 | 9,545 s |
| Release final, processo encerrado com am kill | 1792800999720 | 1792801131134 | 131,414 s |

No ensaio de processo ausente, `am kill` manteve o PID debug vivo. O encerramento
foi confirmado com `run-as ... kill -9 6005`, PID vazio e `stopped=false`, antes
do horário solicitado. O receiver publicou no novo PID 6480 sem abertura de
Activity nem inicialização de JS. A tela estava apagada; não havia credencial de
bloqueio seguro configurada. Isso não equivale a validar todos os modos de
keyguard/Doze de um dispositivo físico.

Cancelamento: trigger `1792796206649` persistido, cancelado pelo JS; registro
vazio imediatamente e nenhuma notificação após o horário original mais a janela
de atraso observada. Reagendamento: T1 `1792796326533` substituído por T2 na tabela;
consulta retorna apenas um registro. Nenhuma entrega de T1; uma entrega de T2,
seguida de registro vazio. As referências à action em históricos/estatísticas do
`dumpsys alarm` não são contadas como alarmes ativos.

Force-stop: trigger `1792796573934` criado e aplicativo parado antes do horário.
Nenhuma notificação enquanto parado. Ao reabrir, BOOT_COMPLETED executou
`recovery discarded` em `1792796663387`, com registro vazio e nenhuma publicação.
Esse é o cenário bloqueante que reprovou o candidato anterior; a prova própria
não publicou o registro vencido.

O primeiro ensaio de reboot com trigger `1792796867082` confirmou rearmamento
pelo BOOT_COMPLETED em `1792796724571`, sem Activity/JS. A coleta inicial ocorreu
antes de o receiver de boot executar. O usuário Android já estava
`RUNNING_UNLOCKED`; acordar/desbloquear a tela não abriu o aplicativo. A janela
de observação terminou sem entrega, e a abertura da Activity em `1792796941649`
descartou corretamente o registro vencido. Esse ensaio **não é aprovação de
entrega após reboot**. A repetição aguarda a publicação nativa antes de abrir o
app, evitando confundir término prematuro de observação com falha do receiver.

Permissões: negar no diálogo retornou `denied`; a tentativa seguinte rejeitou com
`Notifications unavailable; schedule refused`, `usable=false` e lista vazia.
Conceder no diálogo retornou `granted`, reconhecido pela consulta nativa. Revogar
POST_NOTIFICATIONS via `pm revoke` após agendar `1792797220254` encerrou o processo;
o receiver iniciou nativamente e registrou `delivery denied` em `1792797265959`,
consumindo o registro sem publicar. A permissão foi restaurada para continuar os
ensaios. Permissão de notificação e acesso exato permanecem estados distintos.

Cancelamento isolado: registros `gate-reminder` (`1792797346939`) e
`gate-reminder-other` (`1792797469155`) coexistiram com dois alarmes ativos.
Cancelar o primeiro preservou somente o segundo registro/alarme. Após o prazo
original do primeiro, nenhuma notificação apareceu; o segundo ainda estava
pendente e foi cancelado separadamente.

Reboot repetido: ID principal `1792797471137` e outro ID `1792797593321`
agendados; reboot iniciado antes do prazo principal. BOOT_COMPLETED, em
`1792797503848`, descartou o principal já vencido e rearmou somente o outro,
ainda futuro. Não publicou durante recovery. Sem abrir nenhuma Activity, o
receiver publicou o futuro em `1792797613322`: **20,001 s de atraso**. A primeira
abertura da Activity ocorreu depois, em `1792797633988`. O registro ficou vazio.
Isso comprova recuperação seletiva e entrega futura sem JS em execução.

Fixtures de timezone no Hermes foram repetidos: Sao Paulo `1792843260000`,
Kathmandu `1792811760000`; gap/overlap de Nova York rejeitados pelo mesmo botão
de prova preservado de T01. Nenhuma mudança no domínio foi necessária.

### Regressão e compatibilidade

Regressão repetida após remover `react-native-notify-kit` e suas dependências
exclusivas do package/lock:

- `npm run test:ci-scripts`: 16 testes aprovados.
- `npm run lint:ci`: 3 erros/7 warnings conhecidos; sem regressão.
- `npm run typecheck:ci`: 11 diagnósticos conhecidos; sem regressão.
- `npm run test:ci`: 385 testes, 23 suítes aprovadas, incluindo os 33 testes de T01.
- Baselines, domínio, testes de domínio, backend e migrations não foram alterados.

Toolchain preservada: RN 0.87.1, Hermes/Fabric/New Architecture, AGP 9.2.1,
Gradle 9.4.1, Kotlin 2.2.0, JDK 17, compile SDK/build tools 37, target SDK 36,
min SDK 24 e NDK 27.1.12297006. Codegen gera a spec Java e a integração C++ do
TurboModule durante o build; arquivos gerados não são versionados.

A remoção do candidato anterior inclui os imports/ações específicos da antiga
prova e as exclusões de permissões que eram herdadas do pacote. A Activity e o
componente de desenvolvimento foram reaproveitados para a prova própria. Não
houve patch em node_modules, fork ou patch-package. As evidências do primeiro
gate permanecem como histórico técnico.

Os builds finais `:app:assembleDebug :app:assembleRelease :app:lintDebug`, já sem
o pacote reprovado, terminaram com **BUILD SUCCESSFUL** em 2m52s, nas quatro ABIs
padrão. Lint Android: **0 erros, 19 warnings existentes**; avisos de depreciação
de Gradle/delegates e recursos do template continuam presentes. Manifest release
contém POST_NOTIFICATIONS e RECEIVE_BOOT_COMPLETED; não contém permissão de exact
alarm. Autolinking não inclui mais o candidato anterior.

### Limitações e decisão

**GO COM LIMITAÇÕES** para a infraestrutura Android controlada desta prova,
sem iniciar T03. A aprovação cobre identidade, consulta, substituição,
cancelamento, permissão, receivers sem JS e recuperação seletiva. Não aprova o
scheduler definitivo, integrações de Task, schema ou migration.

- Alarmes inexatos, sem exact alarm. Entregas concluídas no ensaio principal
  tiveram atrasos de 9,545–45,758 s; reboot seletivo, 20,001 s. O release final
  atingiu **131,414 s** (2m11,414s), confirmando atraso significativo. Isso não define
  SLA: no primeiro reboot ainda não havia entrega 74,567 s após `triggerAt`,
  quando a abertura da Activity descartou o registro. Não há promessa de minuto.
- Os requisitos RF15/RF16 não especificam SLA numérico. Os resultados permitem
  prosseguir com a infraestrutura para notificações aproximadas próximas do
  prazo, mantendo essa limitação explícita. Um requisito de minuto estrito não
  está validado e exigirá gate separado de exact alarm; não foi assumido nem
  habilitado silenciosamente.
- Reabrir a Activity após o horário descarta um registro ainda pendente, inclusive
  quando o atraso veio do Android. É a política explícita de recuperação desta
  prova, que prioriza não publicar vencidos. Entrega normal do AlarmManager tem
  caminho separado e registra o atraso efetivo.
- Evidência restrita ao Pixel_7 virtual/API 36. Não cobre dispositivo físico,
  outros fabricantes, Doze prolongado, keyguard com credencial, mudança manual
  de relógio, corrupção/falha de disco ou os lifecycles de T08/T09.
- O registro nativo e as entradas de desenvolvimento são somente do gate. Não
  contêm dados de Tasks e não representam persistência de negócio.

T01 foi preservada. T03 e todas as integrações posteriores continuam pendentes.

### Reprodução da prova

Com Metro ativo, instalar o APK debug e abrir a Activity isolada:

```sh
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb reverse tcp:8081 tcp:8081
adb shell am start -n com.gerenciadortarefas/.ReminderGateActivity
adb logcat -s ProjectReminderGate ReactNativeJS AndroidRuntime
```

Os botões agendam em 60/180 segundos, substituem o ID principal, consultam o
registro e cancelam. O segundo ID sintético serve somente à prova de isolamento.
O botão de permissão usa o diálogo normal do Android.

Para force-stop, agendar, executar
`adb shell am force-stop com.gerenciadortarefas`, esperar vencer, conferir notificações e então abrir a
Activity normal/prova. Conferir `recovery discarded`, lista vazia e ausência de
publicação. Para reboot, agendar futuro, executar `adb reboot` e acompanhar
BOOT_COMPLETED/AlarmManager sem abrir o app. Aguardar a entrega efetiva; uma
janela fixa curta é insuficiente para concluir falha de um alarme inexato.
Cancelar os dois IDs sintéticos ao encerrar, preservando os dados do aplicativo.

### Instalação e repetição com os APKs finais

Após remover a biblioteca, o AVD existente precisou ser iniciado novamente,
sem apagar dados. O boot frio apresentou um diálogo de System UI sem resposta;
o harness aguardou boot completo e a tela da prova antes de contar ensaios.
Falhas de preparação do dispositivo não são contadas como schedule/entrega.

O APK debug final foi instalado com atualização e abriu normalmente. A repetição
bloqueante agendou `1792800750788`, confirmou PID ausente após force-stop e nenhuma
notificação depois de vencer. Ao abrir pela MainActivity, a recuperação descartou
o registro em `1792800804564`. A tela de login normal apareceu, sem publicação;
registro vazio. Evidência complementar em
[`evidence/issue39-native-gate-final.txt`](evidence/issue39-native-gate-final.txt).

O APK release final foi instalado com atualização, preservando o registro futuro
`1792800999720`. Abriu a tela de login pela MainActivity. Depois de Home e
`am kill`, o PID ficou ausente e o package permaneceu `stopped=false`.
A entrega release ocorreu no novo PID 4704, em `1792801131134`, antes de qualquer
abertura manual posterior: **131,414 s de atraso**. O AlarmManager mostrou janela
inexata de 2m11,123s, compatível com a entrega observada. O receiver publicou sem
processo JS anterior e sem depender de Metro; a notificação do sistema contém os
mesmos triggerAt/deliveredAt. A necessidade de compromisso de minuto não está
satisfeita por esse modo; o GO limitado cobre notificações aproximadas e os
critérios funcionais de infraestrutura, sem aprovar um SLA mais estrito de RF16.

O APK debug foi restaurado sem limpar dados. Os dois IDs sintéticos foram
cancelados, a consulta final ficou vazia e a Activity normal foi aberta novamente.
`git diff --check` aprovado. Branch `feature/39-reminders`; T03 não iniciada.

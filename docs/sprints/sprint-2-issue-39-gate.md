# Issue #39 — contrato temporal e gate Android (T01/T02)

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

O pacote e a Activity permanecem nesta branch como prova reproduzível, sem
aprovação para integração definitiva. A prova não está nas rotas nem no build
release como Activity; não constitui o scheduler T07. Nenhuma adaptação do código
do fornecedor ou receiver complexo foi introduzida para contornar o resultado.
T01 está concluída nesta etapa; T02 foi executado e não libera T03–T05.

### Alternativas para um próximo gate

1. Adaptador Android controlado pelo projeto, com AlarmManager e NotificationCompat:
   validar expiração no receiver antes de publicar, IDs estáveis e reconciliação
   explícita. Exige novo gate de bridge/New Architecture, debug/release e
   permissões; não foi implementado nesta etapa.
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

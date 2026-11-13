# Sprint 3 — proposta de recorte para revisão

**13/11/2026 · PROPOSTA, não Sprint iniciada.** Não define datas, milestone,
compromisso definitivo, Issues funcionais ou autorização de implementação.
Entrega 3 é maior que uma Sprint; PBIs 25–35 não cabem integralmente neste plano.
Única alteração deste PR: este documento. Nenhum requisito oficial é modificado.

## 1. Estado inicial e fontes

Sprint 1 concluída; Sprint 2 core concluído (37 pontos, quatro Issues), Entrega 2
parcial. Manutenções #58 e #61 confirmadas no GitHub CLOSED/completed nesta
consulta; #43 OPEN, PBI-19, Entrega 2, sem implementação. Base `dev` em
`3f59e9874c10c54b0fabfd3423fb2b5665ae854e`, árvore limpa antes desta proposta.
[CI da base Mobile/Backend success](https://github.com/AlineRaquelC/gestor-diario/actions/runs/43423503595).
Referência após #61: 736 testes Mobile/38 suítes, 479 Backend/17 suítes e
17 validadores; números registrados, sem reexecução funcional nesta auditoria.

Recorrência via edição e exclusão single/future/all implementadas. Limpeza final
pré-Sprint 3 concluída: Home/cache/backend com zero Tasks ativas, calendário sem
resíduos, zero séries geradoras e zero alarms técnicos. Consulta SQLite somente
leitura nesta auditoria reconfirmou zero Tasks ativas e zero séries geradoras.
History/tombstones, Projects, Notes/Subtasks, ledger, filtro Semanais e meta semanal
15 preservados. Evidências operacionais locais, não versionadas, em
`/tmp/gestor-diario-demo-backup/pre-sprint-3-final-cleanup/pre-delete-final/`.
Não criar massa nesta auditoria nem abrir fluxos de materialização para planejar.

Fontes obrigatórias lidas: [requisitos oficiais](../requisitos/requisitos-oficiais.md),
[Product Backlog](../backlog/backlog-produto.md), [entregas](../backlog/entregas.md),
[Sprint 2](sprint-2.md), [DoD](../processo/definition-of-done.md),
[Git Flow](../processo/git-flow.md) e [README](../../README.md). Fontes adicionais:
[gate da #43](sprint-2-issue-43.md), [manutenção #61](../maintenance/issue-61-recurring-delete-scope.md),
manifest/Gradle, schema e código real apontados abaixo. O freeze de 08/11 nos
registros da Sprint 2 é histórico; não se presume nova data acadêmica para Sprint 3.
Este PR documental foi explicitamente solicitado em 13/11.

## 2. Rastreabilidade da Entrega 3

RFs são os 80 primeiros enunciados do catálogo; REQs adicionais **não recebem
classificação funcional/não funcional inventada**. A tabela conserva o agrupamento
PBI da seção 5.2 de entregas; o apêndice transcreve cada enunciado correspondente,
separando RFs de REQs. Resumos e recortes abaixo são decisões propostas, não
substitutos do texto oficial.

| PBI | Capacidade | RFs | REQs contextuais/adicionais |
|---|---|---|---|
| 25 | Voz, câmera, OCR, QR e NFC | RF28, RF29, RF30, RF75 | REQ141–REQ146 |
| 26 | GPS, mapas, geofencing | RF31, RF32, RF62, RF76 | REQ093, REQ133, REQ147–REQ150 |
| 27 | Integrações Android/sistema | RF73, RF74 | REQ094–REQ100, REQ107, REQ108, REQ129–REQ132, REQ151–REQ158 |
| 28 | Uso e conectividade | — | REQ134–REQ140 |
| 29 | Sensores ambientais, movimento, saúde | — | REQ159–REQ174 |
| 30 | Biometria e tarefas sensíveis | — | REQ175–REQ180 |
| 31 | Contexto pessoal/social/ambiental | — | REQ181–REQ202 |
| 32 | Segurança, privacidade, resiliência | — | REQ203–REQ220 |
| 33 | Saúde, acessibilidade, regras locais | — | REQ221–REQ228 |
| 34 | Energia, rede, auditoria, contingência | — | REQ229–REQ246 |
| 35 | Continuação/repetições oficiais | — | REQ247–REQ276 |

Sobreposições existentes, sem correção silenciosa: REQ100 aparece em PBI-27 na
matriz de entregas, mas em PBI-14/PBI-12 na seção 9 do backlog; REQ129–REQ132
estão também em PBI-24, Entrega 2; REQ192 também em PBI-16. Registrar vínculo
cruzado no refinamento, sem duplicar entrega/pontos ou deslocar requisitos.
RF75 (assistente do sistema) não é entregue só por SpeechRecognizer dentro do app.
REQ094 (associar tag NFC) não é igual a REQ146 (criar a partir de dados NFC).
RF29 (anexo local) não é igual a REQ143/144 (entrada OCR revisável).
RF30 inclui barcode/associação a item/local; QR estruturado sozinho é recorte.

## 3. Arquitetura real e reutilização

- [TaskContext](../../src/context/TaskContext.tsx),
  [NewTaskScreen](../../src/screens/NewTaskScreen.tsx) e
  [taskService](../../src/services/taskService.ts): criação canônica já exige
  projeto válido, título, datas e prioridade. Entradas externas devem preencher
  rascunho revisável; salvar continua passando por addTask e validações atuais.
- API Node/Express, services/repositories, SQLite/Drizzle: Tasks, Projects,
  Notes/Subtasks, History, RecurrenceSeries e reminders existentes. Sem entidades
  atuais de localização, anexo binário ou proteção por biometria/perfil no
  [schema Task](../../backend/src/database/schema/tasks.ts). Não armazenar URI
  local no servidor como se fosse anexo compartilhável.
- AsyncStorage conserva cache, ledger/snapshots, filtros e metas. Não vira segunda
  fonte de verdade; não criar outro CRUD de Task para voz/QR.
- [NativeTaskReminders](../../specs/NativeTaskReminders.ts) e implementação Kotlin
  provam o caminho de integração nativa. RN 0.87.1, New Architecture/Hermes ativos;
  nova biblioteca/ponte deve provar Codegen, ABI e debug/release. Só o módulo de
  reminders está presente; voz/câmera/OCR/mapa/biometria não estão instalados.
- [Manifest](../../android/app/src/main/AndroidManifest.xml): INTERNET,
  POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED; sem CAMERA, RECORD_AUDIO ou localização.
  [Gradle](../../android/build.gradle): minSdk 24, compileSdk 37, targetSdk 36.
  MainActivity singleTask/launcher, sem rota externa de criação pronta.
- Scheduler atual usa alarms inexatos e recuperação boot/package update; isso
  **não equivale** a lembretes configuráveis de REQ154 nem a geofencing.
- Login é placeholder. Nenhuma autenticação de conta, autorização backend ou
  isolamento de perfil pode ser inferido de uma futura tela biométrica.

Preferir adaptadores pequenos por recurso e formulário existente. Não construir
Context Engine genérico, coleta contínua, servidor de sensores ou IA remota.
Agrupar infraestrutura apenas quando há contrato e lifecycle realmente comuns.

## 4. Hardware auditado: capacidade não é comprovação de mundo físico

Leitura ADB em 13/11: serial emulator-5554, AVD Pixel_7; modelo real reportado
`sdk_gphone64_x86_64`, SDK 36 (Android 16). Não é evidência de um Pixel 7 físico.
Comandos: getprop SDK/model, pm list features, dumpsys sensorservice,
query-services RecognitionService, dumpsys biometric e `adb emu sensor status`.
Nenhuma permissão concedida, cadastro biométrico ou sensor alterado nesta auditoria.

| Recurso | Evidência neste AVD | O que pode ser validado / limite |
|---|---|---|
| Microfone/fala | feature microphone; serviços AiAiSpeechRecognitionService e GoogleTTSRecognitionService encontrados | Integração do microfone do host e fala pt-BR ainda precisam de gate; presença do serviço não prova modelo/idioma/offline |
| Câmera | camera/front/autofocus declarados | Cena virtual ou webcam permite pipeline e QR conhecido; foco/iluminação em telefone físico não comprovados |
| GPS/rede | location.gps/network declarados | Coordenadas/rotas simuladas; não comprova precisão real, entrada/saída física ou consumo em viagem |
| Fingerprint | feature fingerprint; dumpsys biometric modalidade 2 | Simular toque/cadastro para fluxo BiometricPrompt; não prova resistência ou sensor físico; face/íris não declarados |
| NFC | nenhuma feature NFC | Sem comprovação de leitura RF; exige aparelho físico NFC e tags. Parser NDEF isolado não entrega leitura |
| Bluetooth/Wi-Fi/telefonia | features declaradas | Estado lógico/intents podem ser testados; pares Bluetooth, redes/operadora e chamadas reais exigem prova adicional |
| Sensores | Goldfish e sensores virtuais derivados | Injeção valida fluxo lógico; não transforma temperatura/umidade do AVD em sensores disponíveis num Pixel físico |

O emulador fornece controles de câmera, localização e fingerprint, mas a evidência
deve dizer **simulado** quando for o caso ([documentação Android](https://developer.android.com/studio/run/emulator-extended-controls)).

## 5. Matriz de viabilidade por PBI

Tamanhos são estimativas preliminares por **recorte**, não soma do PBI inteiro.
Qualquer bloco acima de 13 deve ser decomposto antes de virar Issue. CORE e
STRETCH nesta matriz são propostas condicionadas à revisão/gates; restantes ADIAR.
Permissões detalhadas na seção 10. Backend “existente” significa usar o CRUD atual,
sem endpoint fictício para sensor local.

| PBI | Capacidade avaliada | Requisitos | Dependências Android | Hardware | Permissões | Backend necessário | Banco/migration | Risco técnico | Valor demonstrável | Tamanho | Recomendação Sprint 3 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | Voz; QR; OCR; foto; NFC separados | RF28–30/RF75; REQ141–146 | SpeechRecognizer; CameraX/ZXing; Tesseract; NfcAdapter | mic/câmera simuláveis; NFC físico | áudio/câmera; NFC normal | CRUD existente para voz/QR/OCR; anexo requer contrato próprio | voz/QR/OCR transitórios: nenhuma; anexo exige metadados/arquivo | alto para OCR/modelos; médio-alto fala/QR | criar Task após revisão | voz 8; QR 8; OCR 13; anexo 8–13; NFC 8 | CORE voz/QR; STRETCH OCR; ADIAR anexo/NFC/assistente |
| 26 | localização → mapa → entrada/saída/permanência/raio | RF31/32/62/76; REQ093/133/147–150 | LocationManager; SDK de mapa; geofences/background | GPS simulado, campo físico posterior | COARSE/FINE; background e notificações no geofence | persistência/DTOs; scheduler local | localização: colunas ou tabela vinculada; geofence: configuração/journal | alto, bateria, background, privacidade | mapa e evento contextual | localização 5; mapa 5; entrada 8; saída 5; permanência 5; raio 3 | ADIAR; decompor e validar antes de compromisso |
| 27 | atalho; calendário; widgets; intents/eventos | RF73/74; REQs na seção 2 | ShortcutManager, Calendar intents/provider; receivers | launcher/calendário no AVD; rádio físico se necessário | atalho/intents sem runtime; calendário direto exige READ/WRITE | atalho/intent: existente; eventos remotos exigem integração real | atalho/export intent: nenhuma; import idempotente exige mapping | baixo-médio atalho, alto comunicações | abrir criação; exportar evento confirmado | atalho 3; export 5; import 8; widget 8; redes/reboot 5–8 cada | CORE atalho; STRETCH export; ADIAR demais |
| 28 | bateria/rede/armazenamento/uso/padrões | REQ134–140 | BatteryManager, ConnectivityManager, StatFs; ActivityRecognition se aplicável | estados simulados; distância real não provada | NETWORK_STATE normal; movimento runtime conforme API | local; sync reutiliza API, não novo servidor | regras locais; sem migration se só preferências; histórico de gatilhos requer contrato | médio para sinais simples, alto inferência/serviços externos | alertas configuráveis | bateria 5; rede 5; espaço 5; inatividade 5; padrões 8; clima/trânsito 13+ decomposto | ADIAR, não são parte do Goal escolhido |
| 29 | sensores ambientais/movimento/saúde separados | REQ159–174 | SensorManager, LocationManager; saúde exige provedor | alguns simulados; saúde/ar/IR ausentes | sensores comuns sem runtime; localização/atividade/saúde condicionais | local; não criar backend de telemetria | preferências/journal local; novas séries de dados só com justificativa | alto para inferências e ausentes | demonstrar regra só se sensor existe | 5–8 por sinal; sono/quedas requerem decomposição | ADIAR; nenhum sensor indisponível no core |
| 30 | digital; face; íris; voz; assinatura; local+bio | REQ175–180 | AndroidX BiometricPrompt/Keystore; outros não equivalentes | digital simulada; face/íris não disponíveis | USE_BIOMETRIC normal; demais conforme recurso | prompt local não autentica API; proteção remota exige PBI-16 | flag sensível e política a refinar; criptografia/migration só com modelo de ameaça | alto: bypass por busca/cache/API/notifications | acesso local condicionado, sem alegar conta segura | digital 8–13; demais decompor | ADIAR; não usar #43 como atalho |
| 31 | uso/fadiga/social/ambiente/idioma/fuso | REQ181–202 | sinais locais e APIs/provedores externos por contexto | muitos sem sensor padronizado | uso global exige acesso especial; mic/localização se usados | local quando suficiente; APIs externas só após licença/custo | configurações locais; dados inferidos exigem modelo | alto, inferência sem evidência | poucos contextos objetivos | 5–8 por contexto simples; demais decompor | ADIAR; nenhuma inferência emocional prometida |
| 32 | energia/rede/segurança/consentimento/contingência | REQ203–220 | permissões, lifecycle, conectividade/armazenamento | AVD para falhas lógicas | por sinal; nunca solicitar pacote amplo | regras locais; auth/auditoria remota exige PBI-16 | sem migration no core; auditoria sensível exige modelo | alto se declarado genericamente entregue | negar/revogar de forma segura | 3–8 por política; sistema completo >13 | ADIAR PBI; consentimento/revogação do core obrigatórios, sem aceite integral |
| 33 | saúde/a11y/i18n/regras locais | REQ221–228 | AccessibilityManager, Locale; dados externos confiáveis | AVD testa TalkBack/região; saúde não | nenhuma para locale/a11y; saúde conforme provedor | local; legislação/alertas dependem fonte | preferências; tabelas de regras só se selecionadas | médio-alto | formato/acesso compreensível | 3–5 por recorte simples; saúde decompor | ADIAR PBI; acessibilidade da UI core permanece DoD |
| 34 | energia/desempenho/rede/auditoria/recuperação | REQ229–246 | mesmo conjunto técnico de 32, com IDs próprios | simulação de falhas; campo posterior | conforme sinal | local/servidor apenas quando necessário | sem banco genérico de contextos nesta Sprint | alto por duplicação de escopo | políticas explícitas e recuperáveis | 3–8 por política; total >13 | ADIAR; preservar IDs repetidos |
| 35 | contextos oficiais adicionais/repetidos | REQ247–276 | reuso apenas com mesma semântica e testes | depende de cada contexto | conforme sinal | idem 31–34, não backend novo automático | idem, sem migration nesta auditoria | alto se contar duplicatas como novas entregas | rastreabilidade sem inflar progresso | estimar por recorte, nunca PBI inteiro | ADIAR; manter catálogo integral |

## 6. Avaliação detalhada dos candidatos de hardware

### PBI-25: cinco capacidades independentes

**Voz — CORE condicional, 8.** Microfone → SpeechRecognizer → texto editável →
confirmação explícita → addTask. RF28; REQ141/142. Propor uma Task por comando,
título transcrito e interpretação simples documentada de data/prioridade quando
não ambígua (por exemplo “amanhã”, “prioridade alta”); pré-visualizar tudo e exigir
correção dos campos não resolvidos. Projeto sempre escolhido por ID existente.
Não interpretar texto como autorização para salvar, executar ou excluir. REQ141
permanece parcial se não houver interpretação de comando, apenas ditado.
Sem gravar áudio, sem histórico de áudio e sem streaming contínuo/background.
O sistema pode usar serviço remoto: informar antes de gravar e não prometer
privacidade/offline local sem teste. RF75/assistente externo adiado.

Caminho preferido: ponte Kotlin pequena para API do sistema, respeitando thread
principal, destroy/cancel e visibilidade de RecognitionService no manifest;
reutiliza padrão de módulo existente, sem copiar scheduler. Serviço instalado não
é biblioteca embutida nem garantia livre/offline. Gate verifica disponibilidade,
idioma, política do provedor e restrição de custo/software da fonte. Se falhar,
não substituir silenciosamente por nuvem paga ou apresentar texto digitado como
validação de voz ([SpeechRecognizer](https://developer.android.com/reference/android/speech/SpeechRecognizer)).

**Foto/anexo — ADIAR, 8–13 por primeiro recorte.** RF29 exige armazenamento local
persistente da imagem vinculada à Task. Não existe infraestrutura de anexos: PBI-24
é dependência parcial, não pacote inteiro obrigatório. Definir arquivo privado,
metadados, retenção, recuperação, exclusão lógica/Undo e URI inválida após reinstalar.
API pode guardar só metadados se realmente necessário; servidor não lê caminho
privado do Android. Exige modelo aditivo futuro e política de sync, sem migration
agora. Não contar imagem temporária de OCR como atendimento de RF29.

**OCR — STRETCH S1, 13.** Foto de lista → OCR livre local → revisão/edição →
seleção de um item → criação canônica. REQ143/144 parcialmente cobertos no primeiro
recorte (não prometer importação automática em lote de toda lista). Reutilizar
CameraX se o core QR passar; imagem temporária apagada após cancelamento/conclusão,
sem anexo persistido. Candidato: Tesseract4Android/Tesseract Apache-2.0, com modelo
linguístico licenciado; gate inclui escrita impressa versus manuscrita, modelo
pt-BR, ABI x86_64/arm64, páginas de memória Android, tamanho do APK e latência.
Manuscrito não tem acurácia prometida. Sem serviço OCR pago; ML Kit não será
presumido “livre” só por não cobrar. Nenhuma biblioteca instalada nesta proposta
([repositório oficial](https://github.com/adaptech-cz/Tesseract4Android)).
Se integração/modelo exceder 13, decompor captura/OCR/revisão e adiar o restante.

**QR — CORE condicional, 8.** Câmera → decoder → parser estrito de payload
estruturado/versionado → formulário editável → confirmação → addTask. REQ145;
RF30 parcial. Propor JSON de título/descrição/data/prioridade com limites; schema
exato fica no refinamento. Rejeitar campos desconhecidos, payload enorme, datas
inválidas e versões não suportadas. Não aceitar IDs remotos/projetos arbitrários,
HTML executável ou abrir URL automaticamente. Uma criação confirmada por vez,
sem duplicar após callback, rotação ou retorno ao app. Associação persistente a
item/local e barcode linear ficam fora; não declarar RF30 integral.

Candidato livre: [ZXing core Apache-2.0](https://github.com/zxing/zxing) para decoder
com [CameraX](https://developer.android.com/media/camera/camerax), ponte nativa
compatível com RN atual. ZXing não entrega sozinho captura/preview React Native.
O repositório ZXing está em modo de manutenção; não usar o app externo Barcode
Scanner, que a própria fonte declara incompatível com Android 14. A recomendação
é avaliar só o decoder core embutido, com prova no API36 e revisão de manutenção
no G2; não presumir suporte pelo nome da biblioteca.
QR não exige migration nem servidor de imagens: somente os campos existentes da
Task persistem. Cena virtual com imagem conhecida valida o pipeline Android;
telefone físico ainda é necessário para alegar qualidade de captura em campo.

**NFC — ADIAR, 8.** REQ146 cria a partir de dados estruturados; REQ094 associa tag
física. NfcAdapter/NDEF, validação de payload, cancelamento e confirmação; permissão
NFC normal, feature opcional e hardware disponível/desligado tratados. AVD sem NFC:
exige dispositivo físico/tag antes de compromisso. Não usar parser mock como
aceite físico ([Android NFC](https://developer.android.com/develop/connectivity/nfc/nfc)).

### PBI-26: localização e mapa não são geofencing

| Recorte futuro | Origem e limite | Dependência/persistência proposta | Tamanho / decisão |
|---|---|---|---|
| A. Salvar localização na Task | RF31 parcial, sem reminder nem restrição de conclusão REQ093 | obter coordenada foreground; lat/lon/precisão e DTO/cache em schema novo | 5 / ADIAR |
| B. Mostrar Tasks em mapa | RF32; não basta abrir uma única coordenada para atestar todos os marcadores | depende de A; renderizador livre e provedor de tiles com termos/limites e custo verificados; cache/licença | 5 / ADIAR |
| C. Reminder ao entrar | RF31/RF62/REQ150 | depende A; registro canônico da regra, geofence/journal local, recuperação e notificações | 8 / ADIAR |
| D. Reminder ao sair | RF31/RF62/REQ149 | mesma infraestrutura de C, evento EXIT testado separadamente | 5 / ADIAR |
| E. Permanência | REQ148 | DWELL/tempo configurável, limites e duração confiável | 5 / ADIAR |
| F. Raio configurável | REQ147 | validação e persistência do raio; depende A/C | 3 / ADIAR |

REQ093 (só concluir estando no local), REQ133 (local+horário) e RF76
(local+histórico de uso) são regras adicionais, não atendidas por salvar lat/lon.
Ordem segura A → B → C → D/E/F após refinamento, sem somar tudo numa Issue.
Geo API escolhida deve respeitar a restrição de software livre/gratuito da fonte;
SDK Google Play services não se torna aberto por ser gratuito. Decidir provedor
antes de compromisso. Background exige permissões escalonadas, recuperação de
registro após reboot e teste de restrições do sistema; não prometer entrega
imediata. AVD permite eventos simulados, não prova precisão/latência de campo
([geofencing Android](https://developer.android.com/develop/sensors-and-location/location/geofencing),
[localização em background](https://developer.android.com/develop/sensors-and-location/location/background)).

### PBI-27: separar integração pública de acesso restrito

| Recurso | Requisitos | Viabilidade / recorte |
|---|---|---|
| Atalho de criação no launcher | RF73 | CORE C3; abre formulário, não salva automaticamente; widget RF74 é outro item |
| Widget de Tasks do dia | RF74 | ADIAR; snapshot, atualização/boot, tombstones e privacidade precisam contrato |
| Calendário do sistema | REQ096/097/155 | import seletivo 8, vínculo/idempotência/READ_CALENDAR; export revisável via ACTION_INSERT 5 (STRETCH S2), sem prometer detectar gravação; eventos reminder 155 separado |
| Conectividade/rede específica | REQ152/153 | ADIAR; ConnectivityManager não prova acesso a SSID; permissões/restrições Wi-Fi específicas, negação e reconexão |
| Reboot/eventos do sistema | REQ154 | recuperação de alarms já existe; nova regra configurável de reminder é diferente. Avaliar 5, sem duplicar receiver |
| Bluetooth/proximidade | REQ095/151 | ADIAR; feature no AVD não prova encontro real de dispositivos. Permissões SCAN/CONNECT e hardware pareado em campo |
| Compartilhar/receber intent | suporte futuro PBI-24; sem RF novo inventado | ACTION_SEND/recebimento exigem contrato validado, não executar conteúdo externo; não contar como REQ097 ou REQ100 |
| E-mail/redes abertas | REQ098/099/131/132/156/157 | ADIAR; requer provedor aberto real, consentimento, credenciais/limites e disponibilidade; ACTION_SENDTO não é reminder automático |
| Contatos/chamadas | REQ129/130/158 | picker de contato pode reduzir permissão; chamada iniciada por usuário não atende reminder de chamada. Leitura de chamadas/SMS sofre restrições; sem prometer acesso irrestrito |
| Teclado/gestos/NLP | REQ107/108/100 | teclas físicas/gestos configuráveis 3–5 cada, ADIAR; NLP cruza PBI-14/12, recorte de voz não atesta todo REQ100 |

[Common intents](https://developer.android.com/guide/components/intents-common)
suporta delegar criação de evento; não garante que o usuário salvou. Importação ou
escrita direta no Calendar Provider tem permissões e idempotência diferentes.
[Default handlers](https://developer.android.com/guide/topics/permissions/default-handlers)
restringe permissões de SMS/call log; este app não é handler padrão.
[Permissões Wi-Fi](https://developer.android.com/develop/connectivity/wifi/wifi-permissions)
variam por operação/versão; observar conectividade não autoriza rastrear redes.

### PBI-28: mapear todos os triggers sem confundir sinal com automação

| Requisito | Trigger | Facilidade / dependências e decisão |
|---|---|---|
| REQ134 | clima/trânsito/eventos | difícil: APIs abertas reais, licença, rede, localização e custo; ADIAR |
| REQ135 | distância/movimento | difícil: atividade/localização/steps; passos ausentes no AVD, bateria; ADIAR |
| REQ136 | nível de bateria | sinal simples via BatteryManager, simulação possível; regra e reminder ainda precisam preferências e idempotência; 5, ADIAR |
| REQ137 | conectividade/Wi-Fi | transporte simples; política de sync exige PBI-16 apenas se automática; 5, ADIAR |
| REQ138 | espaço disponível | StatFs simples; limpeza automática de backups depende PBI-15 e não pode apagar dados úteis; 5, ADIAR |
| REQ139 | inatividade no próprio app | timestamp local simples, sem UsageStats de outros apps; alertas e lifecycle 5, ADIAR |
| REQ140 | padrões de conclusão | depende histórico/política e janela de amostra; métricas atuais são snapshot, não analytics; 8, ADIAR |

### PBI-29: sensor a sensor, sem comprovação fictícia

| Requisito | Sensor/evento oficial | Ambiente atual | Limite para aceite / decisão |
|---|---|---|---|
| REQ159 | luz | Goldfish light ativo | simulação de lux, sem prova física; ADIAR |
| REQ160 | proximidade | Goldfish proximity ativo | valor simulado não prova chamada atendida; ADIAR |
| REQ161 | pressão/subir escadas | Goldfish pressure ativo | pressão não equivale a algoritmo de escadas validado; ADIAR |
| REQ162 | temperatura ambiente | Goldfish ambient temperature ativo | simulado; não inferir termômetro físico ou usar temperatura da bateria como substituto; ADIAR |
| REQ163 | umidade | Goldfish humidity ativo | simulado, não provado em telefone físico; ADIAR |
| REQ164 | qualidade do ar | sensor não listado | hardware/provedor externo necessário; ADIAR |
| REQ165 | batimentos | heart-rate disabled; sem sensor no inventário | wearable/provedor real e permissão de saúde; ADIAR |
| REQ166 | passos | step counter/detector não listados | ACTIVITY_RECOGNITION quando exigida e sensor real; ADIAR |
| REQ167 | sono | não listado | dados autorizados de provedor/wearable, não sensor Android genérico; ADIAR |
| REQ168 | localização alta precisão | GPS simulado | FINE e disponibilidade/precisão real não comprovadas; ADIAR |
| REQ169 | localização baixa precisão | location.network declarado | COARSE e escolha aproximada testáveis logicamente; economia real não provada; ADIAR |
| REQ170 | movimento/quedas | acelerômetro/giroscópio simulados | algoritmo validado e segurança; não alegar detecção de queda médica; ADIAR |
| REQ171 | rotação | orientation e rotation vectors virtuais | rotação simulável, regra de reminder distinta da orientação padrão; ADIAR |
| REQ172 | campo magnético | Goldfish magnetometer ativo | bússola simulada, campo real não provado; ADIAR |
| REQ173 | pressão atmosférica | mesmo barômetro Goldfish de REQ161 | infraestrutura reutilizável, sem apagar rastreabilidade; ADIAR |
| REQ174 | infravermelho | sensor não listado | proximidade não prova sensor IR acessível; ADIAR |

[SensorManager](https://developer.android.com/develop/sensors-and-location/sensors/sensors_overview)
permite consultar sensor em runtime e tratar ausência. Recursos declarados no AVD
não autorizam prometer saúde, emoção ou contexto social a partir de inferências.

### PBI-30: seis requisitos, não uma feature “biometria”

| Requisito | Capacidade | Decisão |
|---|---|---|
| REQ175 | impressão digital/acesso sensível | primeiro recorte futuro: AndroidX BiometricPrompt, checar canAuthenticate, cadastro, cancelamento/lockout e relock ao background; 8–13, ADIAR |
| REQ176 | reconhecimento facial | API biométrica pode aceitar modalidades elegíveis; não força face nem prova hardware inexistente no AVD; ADIAR |
| REQ177 | íris | não disponível; prompt genérico não comprova íris; ADIAR |
| REQ178 | voz autenticadora | SpeechRecognizer transcreve, não verifica identidade; replay/modelo biométrico exigem projeto próprio; ADIAR |
| REQ179 | assinatura | gesto capturado não equivale a assinatura autenticada; integridade/auditoria próprias; ADIAR |
| REQ180 | localização+biometria | depende política de localização e proteção sensível; não somar sem decomposição; ADIAR |

[BiometricPrompt](https://developer.android.com/identity/sign-in/biometric-auth)
viabiliza confirmação **local**. Não cria conta, senha, token ou autorização na
API. Prompt sozinho não protege texto já exposto em Home/busca/Notes/cache/
notificações; flag sensível e fronteiras de acesso precisam modelo de ameaça.
O servidor atual não autentica: proteção contra acesso direto requer PBI-16,
sem vender bloqueio visual como criptografia/segurança backend. Não depende
necessariamente de perfis #43 para um bloqueio local limitado, mas não resolve #43.

### PBI-31–35: agrupar por infraestrutura, preservar semântica

31: REQ181–184 uso/atenção/emoção; 185–191 social/físico/transporte/local/clima/
trânsito/eventos; 192 disponibilidade; 193/194 segurança/privacidade;
195–200 acessibilidade/idioma/fuso/calendário/cultura/legislação; 201/202 saúde/
emergência. 32: REQ203–212 recursos/rede, 213–217 auditoria/transparência/
consentimento/revogação, 218–220 recuperação/offline/emergência.
33: REQ221 saúde, 222 acessibilidade, 223/224 região/unidades, 225/226 cultura/
legislação, 227/228 alertas/emergência. 34/35 repetem vários desses temas com
IDs próprios (texto integral no apêndice).

Reuso futuro: adaptador de rede para disponibilidade/custo de dados; observador
local de bateria; helper de locale; permissões e lifecycle por recurso. Isso não
justifica motor universal, telemetria indiscriminada ou dezenas de regras nesta
Sprint. Consentimento/revogação e a11y das features selecionadas são obrigações
de qualidade; não significam todos esses PBIs ou requisitos de lembretes completos.

## 7. #43 e dívida das entregas anteriores

**Decisão proposta C: permanecer no backlog**, não core nem stretch desta Sprint.
[Issue #43](https://github.com/AlineRaquelC/gestor-diario/issues/43): OPEN, 13 pontos,
PBI-19/Entrega 2. Core anterior concluído atende só uma condição do gate; continua
faltando isolamento persistido/transversal, bootstrap/migration, API escopada,
caches/ledger por perfil e scheduler coerente. A auditoria real confirma raízes
Tasks/Projects/Series globais, sem profileId; #58/#61 não mudaram isso.
Alternativa B do NO-GO (proprietário nas raízes) exige próximo refinamento e
regressão. Não implementar namespace só local, não fechar/mover milestone e não
considerar Home vazia como prova de isolamento. Não há dependência da #43 para
voz/QR/atalho propostos.

| PBI 12–24 | Estado remanescente | Dependência para proposta |
|---|---|---|
| 12 | planejado: priorização/customização | nenhuma; usar prioridades atuais |
| 13 | parcial: RF08/15/16 no recorte; RF43–45/REQ114–116 não integrais; #58/#61 estabilizam recorrência | reutilizar scheduler/recorrência, não ampliar |
| 14 | parcial: busca sem etiquetas; drag and drop pendente | nenhuma; não criar etiquetas para QR |
| 15 | planejado: backup/import/export no produto | backup operacional atual não entrega PBI; necessário só se importar arquivos/backups, fora do core |
| 16 | planejado: sync automática/API segura/múltiplos servidores | core usa sync manual existente; proteção sensível remota precisaria dele |
| 17 | parcial: metas por quantidade, sem tempo/analytics históricos | nenhuma; padrões REQ140 dependeriam de histórico analítico |
| 18 | planejado no backlog; rótulos/foco existentes não entregam todo tema/a11y | DoD acessível em novas telas obrigatória, sem puxar PBI inteiro |
| 19 | planejado/#43 NO-GO | nenhuma; permanece backlog |
| 20 | planejado: modelos/dependências/duplicação | nenhuma; não importar Task recorrente/modelo por QR |
| 21 | planejado: tempo/esforço/cronômetro/conflitos | nenhuma |
| 22 | planejado: lote/arquivo/campos customizados | nenhuma; QR uma Task; OCR stretch um item selecionado |
| 23 | planejado: feriados/prazos úteis/revisão | nenhuma; datas civis existentes, sem motor de feriados |
| 24 | planejado: anexos/áudio/links/compartilhamento | foto anexa dependeria de recorte de anexos; voz não grava áudio e QR não persiste imagem |

Dívida técnica: lint/TS baselineados e App.test.tsx excluído do CI não estão
corrigidos por CI verde. Não ampliar baselines. README ainda cita 697 Mobile/37
suítes, 456 Backend/17 e estado anterior a #58/#61. **Não editar agora**: atualização
planejada em C4 ou PR documental separado após seleção aprovada. Também revisar
menções históricas a Tasks legadas versus estado zerado, preservando evidências.

## 8. Core proposto, capacidade e Goal

**Sprint Goal proposto:** “Criar tarefas no Android por voz, QR estruturado e
atalho do sistema, com revisão antes de salvar e preservação do fluxo canônico.”
Não promete automação por contexto físico que este recorte não entrega.

Capacidade conservadora **21 pontos**, não velocidade prevista: Sprint 2 teve 37
no core, porém Android nativo/permissões/hardware trazem risco diferente. Reservar
margem de calendário para gates, integração e demonstração; duração, disponibilidade
da equipe e data de apresentação ainda não informadas. Estimativas incluem testes,
lifecycle, acessibilidade e limpeza QA; nenhuma Issue proposta acima de 13.
Reestimar em Planning Poker 1/2/3/5/8/13 antes do compromisso. Se gates falharem,
reduzir/rever o plano com aprovação; não compensar automaticamente com stretch.

| Candidato (não Issue criada) | Origem / entrega exata | Dependências | Poker |
|---|---|---|---|
| C1 — Criação assistida por voz revisável | PBI-25 RF28, REQ141/142 no limite descrito; serviço de fala → texto → formulário → confirmação; sem assistente RF75 | gate G1, projeto e addTask atuais; permissões/lifecycle no próprio item | 8 |
| C2 — Criar a partir de QR estruturado | PBI-25 REQ145, RF30 parcial; decoder/parser validado → formulário → confirmação; sem barcode/associação persistente | gate G2; mesmo contrato simples de rascunho de C1, sem novo framework | 8 |
| C3 — Atalho Android “Nova tarefa” | PBI-27 RF73; configuração/adição de atalho conforme launcher suportado e navegação cold/warm para formulário; sem widget | gate G3; hidratação de Tasks/Projects antes de apresentar formulário | 3 |
| C4 — Evidências, rastreabilidade e README atualizados | enabler documental, sem novo requisito oficial; relatório da seleção final e limites; não substitui testes/DoD de C1–C3 | C1–C3 validados, números CI reais e aprovação documental | 2 |
| **Total proposto** | **3 funcionais + 1 documental; 4 futuras Issues no máximo** | **não autoriza criação nesta etapa** | **21** |

As três funções convergem no formulário atual e não necessitam backend novo nem
migration. Persistência final continua API → SQLite; texto/QR temporário não
precisa coluna source. Regras compartilhadas limitam-se a rascunho validado e
confirmação; não há dependência circular entre bridges de voz/câmera/atalho.
Cada função mantém criação manual disponível quando hardware/permissão falhar.

## 9. Stretch: no máximo dois, fora do compromisso

| Item | Recorte e condição | Poker |
|---|---|---|
| S1 — Foto → OCR local revisável | REQ143/144 parciais; gate G4 e C2 estabilizado; um item selecionado por criação, sem anexo/lote. Só avaliar após core Done e margem real | 13 |
| S2 — Exportação revisável ao calendário Android | REQ097; intent ACTION_INSERT com campos reais, cancelamento e ausência de handler; não confirma persistência do evento, sem READ/WRITE_CALENDAR para esta alternativa; gate G5 | 5 |

Não somar 18 pontos ao compromisso de 21, não iniciar dois stretch em paralelo e
não presumir ambos cabíveis. #43 não é stretch desta proposta. Localização,
geofencing, sensores, biometria e demais contextos permanecem adiados.

## 10. Permissões, dados e ausência de hardware

| Candidato/recurso | Permissão Android / tipo | Negação, revogação e minimização |
|---|---|---|
| C1 voz | RECORD_AUDIO runtime; INTERNET já existe se provedor usa rede; queries RecognitionService é visibilidade, não permissão | solicitar ao tocar microfone; negar mantém texto manual; permanente abre Configurações só por ação explícita, sem loop. Cancelar reconhecimento no background e checar novamente ao voltar; sem guardar áudio |
| C2 QR / S1 OCR / câmera própria | CAMERA runtime; feature opcional | negar mantém criação manual; não perguntar repetidamente se bloqueada. Encerrar sessão/câmera no background; limpar imagens temporárias; dados privados do app sem permissão ampla de armazenamento |
| C3 atalho | nenhuma runtime; suporte do launcher/ShortcutManager | launcher indisponível ou pin recusado não bloqueia app; tratar API 24 e 25/26+ com compatibilidade explícita |
| S2 calendário via intent | nenhuma runtime de calendário para delegar UI | resolver handler, informar indisponível/cancelado; não declarar evento salvo. Import/provider direto futuro: READ_CALENDAR/WRITE_CALENDAR runtime conforme operação |
| localização futura | ACCESS_COARSE_LOCATION/ACCESS_FINE_LOCATION runtime; ACCESS_BACKGROUND_LOCATION separada se background necessário | permitir aproximada quando suficiente; não forçar precisa, tratar GPS desligado/timeout/revogação; foreground antes de background; não pedir agora |
| reminder futuro | POST_NOTIFICATIONS runtime API 33+ já suportada | negar não cria sucesso de notificação; reconciliar seletivamente; nenhum cancelAll |
| NFC futuro | NFC normal; feature opcional | tratar adaptador ausente/desligado; sem dialog runtime inventado |
| biometria futura | USE_BIOMETRIC normal, AndroidX compatibilidade minSdk | ausência/cadastro/lockout/cancelamento; nunca fallback que expõe dado supostamente protegido |
| sensores/rede futuros | luz/pressão/gyro comuns sem runtime; ACCESS_NETWORK_STATE normal; ACTIVITY_RECOGNITION runtime para passos/atividade onde exigida | consultar disponibilidade real; sensores de saúde/provedor exigem permissões específicas por versão; não substituir sinal indisponível por inferência |
| Bluetooth/Wi-Fi futuros | BLUETOOTH_SCAN/CONNECT e NEARBY_WIFI_DEVICES runtime conforme API/operação; localização pode continuar necessária | acesso a SSID não é garantido pelo estado conectado; não solicitar tudo preventivamente |

Permissões não substituem consentimento informado sobre uso/transmissão. Cancelar
não salva Task. REQ215/216 e repetições 241/242/267/268 são referências para
consentimento/revogação, mas a conformidade do core não atesta todos os lembretes
contextuais do enunciado. [Fluxo oficial de permissões](https://developer.android.com/training/permissions/requesting).

## 11. Ordem, gates técnicos e critérios Android

Primeiro, após revisão e autorização de início futura: resolver G1/G2 em ordem de
risco, dentro do refinamento de C1/C2 e orçamento proposto, sem features invisíveis
ou dados QA permanentes. Depois C1 → C2 → C3 → C4. C2 pode reutilizar contrato de
rascunho, mas não depende do serviço SpeechRecognizer. Só avançar stretch após
core Done, G4/G5 e capacidade revisada. Nenhum gate funcional foi executado por
esta auditoria: apenas inventário/disponibilidade estática e consultas de fontes.

| Gate | GO necessário antes da implementação correspondente | NO-GO / ação |
|---|---|---|
| G1 fala | confirmar isRecognitionAvailable; pt-BR via microfone real do host; edição/confirmar; suporte/limites on-device; erro/offline/consentimento; bridge RN e build debug/release | serviço listado não basta; sem teste de áudio/privacidade/custo, manter C1 condicional e revisar Goal/capacidade |
| G2 QR | escolher versões CameraX/ZXing e licenças, provar preview+decode no Android API36, compatibilidade minSdk24/RN New Architecture, build/ABI, fixture QR captável pelo AVD; definir schema/tamanho | decode só em Jest não é gate Android; rejeitar biblioteca incompatível e replanejar antes de comprometer |
| G3 atalho | launcher/ShortcutManager compatível, cold/warm/singleTask sem criação duplicada, fluxo quando projetos não carregaram, minSdk24 fallback | não declarar RF73 entregue se só botão interno; recusa de pin e ausência suportadas |
| G4 OCR | biblioteca/modelo/licenças/idioma, APK/ABI/build incluindo requisitos de memória, captura e texto editável com acurácia observada; imagem temporária removível | sem resultado Android verificável, adiar; não anunciar manuscrito funcional por usar OCR |
| G5 calendário | ACTION_INSERT resolvido por app compatível, dados/datas/fuso revisados, retorno/cancelamento sem falso salvo | sem handler, informar e manter Task intacta; adiar stretch se não demonstrável |
| G6 localização/geofence futuro | modelo persistido, backend/DTO, provedor/licença, permissões foreground/background e eventos reais/simulados claramente separados; background/reboot comprovados | sem hardware/campo quando exigido ou sem prova background, não entrar no core; não prometer timing exato |
| G7 biometria futuro | canAuthenticate, cadastro/lockout, prompt real, fronteiras Home/busca/cache/Notes/notificações e política de relock; proteção local versus remota explícita | prompt isolado não é segurança de tarefas sensíveis; manter adiado |

Um gate verifica a solução durante refinamento autorizado; não exige que a feature
inteira exista antes de iniciar a própria Issue. Estimativas incluem essa prova.
Falha de gate deve produzir evidência e replanejamento, nunca expansão silenciosa.

| Futuro item | Caminho feliz Android | Negação / indisponibilidade | Restart e lifecycle |
|---|---|---|---|
| C1 voz | falar comando pt-BR, editar texto/campos e confirmar; uma Task persistida, Home/calendário/sync coerentes | mic negado/bloqueado, sem recognizer/modelo/idioma, offline/timeout/no-match; nada salvo implicitamente | interromper captura no background; callbacks antigos não salvam; restart não duplica nem reinicia gravação |
| C2 QR | cena/webcam conhecida → decode real → revisão → Task; QR inválido/grande/versão desconhecida rejeitado | câmera negada/ausente/em uso; payload não cria projeto/ID nem executa URL | liberar câmera, cancelar sessão, callback repetido não duplica; restart conserva só Task confirmada |
| C3 atalho | pin/configurar quando suportado; abrir formulário cold e warm; confirmar Task pelo fluxo atual | launcher sem suporte/pin recusado; permissões de mic/câmera não são exigidas para formulário manual | intent entregue uma vez com Context hidratado; restart/foreground não repetem ação de salvar |
| C4 documental | confrontar evidências Android reais dos itens, números CI e demo limpa | registrar cenário não executado; sem simulação apresentada como físico | rastrear limpeza após lifecycle dos itens; não exige criar outra Task |
| S1 OCR se selecionado | imagem lista → texto revisado → um item confirmado | sem câmera/modelo/espaço, texto vazio/ruim, negação | cleanup temporário, cancelamento no background, restart sem resíduo ou auto-save |
| S2 calendário se selecionado | abrir evento com dados corretos para usuário confirmar no app externo | handler ausente/cancelamento; nenhum sucesso de gravação presumido | retorno/foreground não exporta duas vezes, Task intacta |

Todos os itens funcionais futuros: validação Android real com evidência distinguindo
AVD/hardware físico, cenário feliz, erro, negação quando aplicável, ausência de
hardware, persistência/restart e foreground. Sem afirmar execução manual apenas
por Jest. API indisponível mantém política atual de erro/pendência, sem cache
enganosamente marcado como salvo. Testes automatizados relevantes de parser,
locks/lifecycle/contrato e regressões; DoD e CI Mobile/Backend, lint/typecheck sem
ampliar baselines, Android debug/release quando código nativo afetado e diff check.

## 12. Regra de massa QA, riscos e decisão pendente

**Toda Task criada exclusivamente para QA deve ser removida antes do merge da
respectiva Issue.** Inventariar IDs/clientIds/seriesId/occurrenceKeys, fazer backup,
encerrar séries técnicas pelo fluxo canônico, soft-deletar Tasks, preservar
History/tombstones, cancelar/reconciliar apenas reminders desses IDs e remover
imagens/artefatos QA. Reabrir/foreground/sync/materializar e provar ausência na
Home/calendário. Não limpar Projects/filtros/metas/ledger nem AsyncStorage inteiro.
Home inicia zerada; cada PR deve devolver o ambiente sem massa técnica.

| Risco | Tratamento proposto |
|---|---|
| Serviço de fala existe mas não reconhece pt-BR/offline | G1 antes de compromisso; consentimento sobre rede e fallback manual explícito |
| Biblioteca antiga quebra RN 0.87/Gradle/ABI | G2/G4; versão/licença verificadas, builds e teste Android antes de expansão |
| QR/voz externos introduzem conteúdo inválido | parser limitado, revisão obrigatória e validação canônica, sem executar URLs/ações |
| Task duplicada por callback/intent/retry | locks/consumo de sessão e identidade atual; testes de retorno/restart, sem nova API desnecessária |
| Câmera/OCR retém imagem pessoal | temporário privado mínimo, cleanup no cancelamento; anexo RF29 separado |
| Prazo/capacidade desconhecidos | 21 preliminares, buffer, gates e reestimativa antes da Sprint; não iniciar implicitamente |
| Confundir simulação com hardware real | tabelas de evidência e gates; sem NFC/saúde no core |
| Backlog enorme/repetido virar compromisso implícito | apêndice preserva enunciados, matriz limita seleção e declara parcialidade |
| Baseline verde esconder dívida antiga | não ampliar baselines; README atualizado em item posterior, sem alegar saneamento total |

Itens ainda **não selecionados**: foto anexa, barcode/associação persistente,
assistentes de voz, NFC, toda localização/geofencing, widgets/importação de
calendário, comunicações/rede específica/reboot configurável, PBI-28/29/30 e
contextos PBI-31–35 fora das obrigações de qualidade do recorte; PBIs 12–24
remanescentes e #43. OCR e exportação de calendário são apenas stretch possíveis.

Próxima decisão humana: revisar Goal, 21 pontos, escopo/limites de voz/QR e
hardware disponível, prazo e capacidade. Só depois formalizar sprint-3.md,
Issues/milestone e início em instrução própria. Este PR não faz isso, não tem
Closes #43 e não autoriza merge automático.

## 13. Verificação desta proposta documental

Apêndice comparado programaticamente com o catálogo: 168 vínculos com enunciados
exatos. Links internos existentes e diff sem erros de whitespace. Somente este
arquivo deve aparecer no commit. Não executados testes funcionais, captura de
voz/câmera, gates de integração ou builds nesta auditoria documental. CI do PR
será evidência de regressão da base, não aceite das features propostas.

## Apêndice A — requisitos oficiais por PBI, transcrição literal

Fonte única dos enunciados: [catálogo oficial](../requisitos/requisitos-oficiais.md).
Cada ID abaixo mantém texto original; sobreposições de PBIs não significam novo
requisito. As tabelas analíticas anteriores não substituem estes enunciados.

### PBI-25

**RFs:**

- **RF28:** O aplicativo deve permitir a criação de tarefas por comando de voz, utilizando o microfone do dispositivo e reconhecimento de fala disponível no sistema.
- **RF29:** O aplicativo deve permitir a captura de uma foto como anexo de uma tarefa, utilizando a câmera do dispositivo, com armazenamento local da imagem.
- **RF30:** O aplicativo deve permitir a leitura de código de barras ou QR code para associar uma tarefa a um item ou local, utilizando a câmera do dispositivo.
- **RF75:** O aplicativo deve permitir a integração com assistentes de voz do sistema para criação de tarefas por comando, quando disponível.

**REQs:**

- **REQ141:** O aplicativo deve permitir a criação de tarefas com base em comandos de voz em linguagem natural, com confirmação antes de salvar.
- **REQ142:** O aplicativo deve permitir a correção de transcrições de voz antes de criar a tarefa, com edição textual.
- **REQ143:** O aplicativo deve permitir a criação de tarefas com base em fotos de listas escritas, utilizando reconhecimento óptico de caracteres livre.
- **REQ144:** O aplicativo deve permitir a correção de textos reconhecidos por OCR antes de criar as tarefas, com edição.
- **REQ145:** O aplicativo deve permitir a criação de tarefas com base em QR codes que contenham informações estruturadas.
- **REQ146:** O aplicativo deve permitir a criação de tarefas com base em NFC que contenham informações estruturadas.

### PBI-26

**RFs:**

- **RF31:** O aplicativo deve permitir a definição de localização geográfica para uma tarefa, utilizando o GPS do dispositivo, com opção de lembrete ao chegar ou sair do local.
- **RF32:** O aplicativo deve permitir a visualização das tarefas em um mapa, com marcadores para tarefas que possuem localização associada.
- **RF62:** O aplicativo deve permitir a configuração de lembretes por localização, com base em geofencing e notificações ao entrar ou sair de áreas definidas.
- **RF76:** O aplicativo deve permitir a configuração de lembretes inteligentes que consideram a localização e o histórico de uso.

**REQs:**

- **REQ093:** O aplicativo deve permitir a criação de tarefas com dependência de localização, sendo concluídas apenas quando a pessoa estiver no local definido.
- **REQ133:** O aplicativo deve permitir a criação de tarefas com base em localização e horário, como chegar ao trabalho pela manhã.
- **REQ147:** O aplicativo deve permitir a configuração de lembretes por aproximação de locais específicos, com raio configurável.
- **REQ148:** O aplicativo deve permitir a configuração de lembretes por permanência prolongada em um local, como permanecer no trabalho por muitas horas.
- **REQ149:** O aplicativo deve permitir a configuração de lembretes por saída de um local, como lembrar de comprar algo ao sair de casa.
- **REQ150:** O aplicativo deve permitir a configuração de lembretes por entrada em um local, como registrar tarefas ao chegar ao escritório.

### PBI-27

**RFs:**

- **RF73:** O aplicativo deve permitir a configuração de atalhos rápidos na tela inicial do Android para criação de tarefas.
- **RF74:** O aplicativo deve permitir a criação de widgets simples para exibir as tarefas do dia, utilizando componentes nativos do Android.

**REQs:**

- **REQ094:** O aplicativo deve permitir a leitura de etiquetas NFC para associar tarefas a objetos físicos, quando o dispositivo suportar.
- **REQ095:** O aplicativo deve permitir a configuração de lembretes por proximidade de outros dispositivos Bluetooth, quando disponível.
- **REQ096:** O aplicativo deve permitir a criação de tarefas com base em eventos do calendário do sistema, com importação seletiva.
- **REQ097:** O aplicativo deve permitir a exportação de tarefas para o calendário do sistema, com criação de eventos.
- **REQ098:** O aplicativo deve permitir a configuração de lembretes por e- mail local, sem custo, utilizando servidor de correio aberto.
- **REQ099:** O aplicativo deve permitir a configuração de lembretes por mensagens em redes abertas, sem custo, quando disponíveis.
- **REQ100:** O aplicativo deve permitir a criação de tarefas com base em comandos de texto em linguagem natural simples, com interpretação de datas e prioridades.
- **REQ107:** O aplicativo deve permitir a configuração de atalhos de teclado para ações frequentes, quando houver teclado físico.
- **REQ108:** O aplicativo deve permitir a configuração de gestos personalizados para ações rápidas, como deslizar para concluir.
- **REQ129:** O aplicativo deve permitir a criação de tarefas com anexos de contatos, com integração à agenda do sistema.
- **REQ130:** O aplicativo deve permitir a configuração de lembretes por chamada telefônica, sem custo, utilizando serviços abertos.
- **REQ131:** O aplicativo deve permitir a configuração de lembretes por mensagens instantâneas em redes abertas, quando disponíveis.
- **REQ132:** O aplicativo deve permitir a configuração de lembretes por publicações em redes sociais abertas, quando disponíveis.
- **REQ151:** O aplicativo deve permitir a configuração de lembretes por proximidade de outros dispositivos, como conectar ao computador e sincronizar.
- **REQ152:** O aplicativo deve permitir a configuração de lembretes por conexão a redes específicas, como sincronizar ao conectar à rede doméstica.
- **REQ153:** O aplicativo deve permitir a configuração de lembretes por desconexão de redes específicas, como salvar dados ao sair da rede corporativa.
- **REQ154:** O aplicativo deve permitir a configuração de lembretes por eventos do sistema, como reinicialização do dispositivo.
- **REQ155:** O aplicativo deve permitir a configuração de lembretes por eventos de calendário do sistema, como reuniões agendadas.
- **REQ156:** O aplicativo deve permitir a configuração de lembretes por eventos de e-mail local, sem custo, quando disponíveis.
- **REQ157:** O aplicativo deve permitir a configuração de lembretes por eventos de mensagens abertas, quando disponíveis.
- **REQ158:** O aplicativo deve permitir a configuração de lembretes por eventos de chamadas telefônicas, sem custo, quando disponíveis.

### PBI-28

**RFs:** nenhum neste agrupamento.

**REQs:**

- **REQ134:** O aplicativo deve permitir a configuração de lembretes contextuais que consideram clima, trânsito ou eventos locais, utilizando APIs abertas.
- **REQ135:** O aplicativo deve permitir a criação de tarefas com base em sensores de movimento, como registrar uma tarefa após caminhar determinada distância.
- **REQ136:** O aplicativo deve permitir a configuração de lembretes baseados em níveis de bateria, como evitar tarefas pesadas com bateria baixa.
- **REQ137:** O aplicativo deve permitir a configuração de lembretes baseados em conectividade, como sincronizar apenas em redes Wi-Fi.
- **REQ138:** O aplicativo deve permitir a configuração de lembretes baseados em armazenamento disponível, como limpar backups quando o espaço estiver baixo.
- **REQ139:** O aplicativo deve permitir a configuração de lembretes baseados em uso do aplicativo, como revisar tarefas após longos períodos de inatividade.
- **REQ140:** O aplicativo deve permitir a configuração de lembretes baseados em padrões de conclusão, como sugerir pausas em horários de baixa produtividade.

### PBI-29

**RFs:** nenhum neste agrupamento.

**REQs:**

- **REQ159:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de luz, como ajustar tema conforme iluminação.
- **REQ160:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de proximidade, como pausar tarefas ao atender o telefone.
- **REQ161:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de pressão, como registrar tarefas após subir escadas.
- **REQ162:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de temperatura, como sugerir pausas em ambientes quentes.
- **REQ163:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de umidade, como ajustar tarefas em dias secos.
- **REQ164:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de qualidade do ar, como evitar tarefas pesadas em dias poluídos.
- **REQ165:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de batimentos cardíacos, como sugerir pausas em momentos de estresse.
- **REQ166:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de passos, como registrar tarefas após atingir metas de caminhada.
- **REQ167:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de sono, como sugerir tarefas leves após noites mal dormidas.
- **REQ168:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de localização de alta precisão, como registrar tarefas em locais exatos.
- **REQ169:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de localização de baixa precisão, como economizar bateria.
- **REQ170:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de movimento do dispositivo, como detectar quedas e sugerir tarefas de recuperação.
- **REQ171:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de rotação, como ajustar orientação da tela.
- **REQ172:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de campo magnético, como detectar bússola e sugerir tarefas de navegação.
- **REQ173:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de pressão atmosférica, como ajustar tarefas em mudanças de clima.
- **REQ174:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de luz infravermelha, como detectar presença e ajustar tarefas.

### PBI-30

**RFs:** nenhum neste agrupamento.

**REQs:**

- **REQ175:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de impressão digital, como autenticar e acessar tarefas sensíveis.
- **REQ176:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de reconhecimento facial, como autenticar e acessar tarefas sensíveis.
- **REQ177:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de íris, como autenticar e acessar tarefas sensíveis.
- **REQ178:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de voz, como autenticar e acessar tarefas sensíveis.
- **REQ179:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de assinatura, como autenticar e assinar tarefas concluídas.
- **REQ180:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de localização combinada com biometria, como acessar tarefas apenas em locais seguros.

### PBI-31

**RFs:** nenhum neste agrupamento.

**REQs:**

- **REQ181:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de tempo de uso, como limitar o acesso a tarefas após longos períodos.
- **REQ182:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de fadiga digital, como sugerir pausas com base no tempo de tela.
- **REQ183:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de atenção, como detectar distração e sugerir retomada de tarefas.
- **REQ184:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de emoção, como ajustar tarefas conforme o estado emocional.
- **REQ185:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto social, como evitar notificações em reuniões.
- **REQ186:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto físico, como ajustar tarefas conforme a iluminação e o ruído.
- **REQ187:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de transporte, como sugerir tarefas leves no trânsito.
- **REQ188:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de localização e tempo, como sugerir tarefas específicas em determinados horários e locais.
- **REQ189:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de clima, como sugerir tarefas internas em dias chuvosos.
- **REQ190:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de trânsito, como sugerir tarefas alternativas em congestionamentos.
- **REQ191:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de eventos locais, como sugerir tarefas relacionadas a feiras ou palestras.
- **REQ192:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de disponibilidade de serviços, como sincronizar quando o servidor local estiver acessível.
- **REQ193:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de segurança, como bloquear tarefas sensíveis em redes públicas.
- **REQ194:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de privacidade, como ocultar detalhes de tarefas em notificações públicas.
- **REQ195:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de acessibilidade, como ajustar notificações conforme recursos ativos.
- **REQ196:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de idioma, como ajustar textos conforme o idioma do sistema.
- **REQ197:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de fuso horário, como ajustar prazos em viagens.
- **REQ198:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de calendário, como ajustar tarefas conforme feriados locais.
- **REQ199:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de cultura, como ajustar tarefas conforme costumes locais.
- **REQ200:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de legislação, como ajustar prazos conforme regras locais.
- **REQ201:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de saúde pública, como ajustar tarefas conforme alertas sanitários.
- **REQ202:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de emergência, como suspender tarefas não essenciais em situações críticas.

### PBI-32

**RFs:** nenhum neste agrupamento.

**REQs:**

- **REQ203:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de energia, como reduzir sincronizações em modo de economia.
- **REQ204:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de desempenho, como adiar tarefas pesadas em dispositivos lentos.
- **REQ205:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de armazenamento, como compactar dados quando o espaço estiver baixo.
- **REQ206:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de memória, como liberar recursos quando a memória estiver baixa.
- **REQ207:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de rede, como priorizar sincronizações em redes rápidas.
- **REQ208:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de latência, como adiar sincronizações em redes lentas.
- **REQ209:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de custo de dados, como sincronizar apenas em redes sem custo.
- **REQ210:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de roaming, como evitar sincronizações fora da rede local.
- **REQ211:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de segurança de rede, como bloquear sincronizações em redes não confiáveis.
- **REQ212:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de privacidade de rede, como anonimizar metadados em redes públicas.
- **REQ213:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de conformidade, como registrar auditorias de acesso a tarefas sensíveis.
- **REQ214:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de transparência, como informar quais dados foram acessados.
- **REQ215:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de consentimento, como solicitar autorização antes de acessar sensores.
- **REQ216:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de revogação, como desativar acessos quando o consentimento for retirado.
- **REQ217:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de auditoria, como registrar todas as alterações em tarefas sensíveis.
- **REQ218:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de recuperação, como restaurar dados após falhas.
- **REQ219:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de contingência, como operar offline quando a rede falhar.
- **REQ220:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de emergência, como priorizar tarefas críticas em situações de risco.

### PBI-33

**RFs:** nenhum neste agrupamento.

**REQs:**

- **REQ221:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de saúde, como ajustar tarefas conforme indicadores de bem-estar.
- **REQ222:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de acessibilidade, como adaptar notificações conforme recursos ativos.
- **REQ223:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de internacionalização, como adaptar formatos de data e hora conforme a região.
- **REQ224:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de localização, como adaptar unidades de medida conforme o país.
- **REQ225:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de cultura, como adaptar saudações e mensagens conforme costumes locais.
- **REQ226:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de legislação, como adaptar prazos conforme feriados e regras locais.
- **REQ227:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de saúde pública, como adaptar tarefas conforme alertas sanitários.
- **REQ228:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de emergência, como suspender tarefas não essenciais em situações críticas.

### PBI-34

**RFs:** nenhum neste agrupamento.

**REQs:**

- **REQ229:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de energia, como reduzir sincronizações em modo de economia.
- **REQ230:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de desempenho, como adiar tarefas pesadas em dispositivos lentos.
- **REQ231:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de armazenamento, como compactar dados quando o espaço estiver baixo.
- **REQ232:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de memória, como liberar recursos quando a memória estiver baixa.
- **REQ233:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de rede, como priorizar sincronizações em redes rápidas.
- **REQ234:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de latência, como adiar sincronizações em redes lentas.
- **REQ235:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de custo de dados, como sincronizar apenas em redes sem custo.
- **REQ236:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de roaming, como evitar sincronizações fora da rede local.
- **REQ237:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de segurança de rede, como bloquear sincronizações em redes não confiáveis.
- **REQ238:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de privacidade de rede, como anonimizar metadados em redes públicas.
- **REQ239:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de conformidade, como registrar auditorias de acesso a tarefas sensíveis.
- **REQ240:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de transparência, como informar quais dados foram acessados.
- **REQ241:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de consentimento, como solicitar autorização antes de acessar sensores.
- **REQ242:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de revogação, como desativar acessos quando o consentimento for retirado.
- **REQ243:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de auditoria, como registrar todas as alterações em tarefas sensíveis.
- **REQ244:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de recuperação, como restaurar dados após falhas.
- **REQ245:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de contingência, como operar offline quando a rede falhar.
- **REQ246:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de emergência, como priorizar tarefas críticas em situações de risco.

### PBI-35

**RFs:** nenhum neste agrupamento.

**REQs:**

- **REQ247:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de saúde, como ajustar tarefas conforme indicadores de bem-estar.
- **REQ248:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de acessibilidade, como adaptar notificações conforme recursos ativos.
- **REQ249:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de internacionalização, como adaptar formatos de data e hora conforme a região.
- **REQ250:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de localização, como adaptar unidades de medida conforme o país.
- **REQ251:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de cultura, como adaptar saudações e mensagens conforme costumes locais.
- **REQ252:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de legislação, como adaptar prazos conforme feriados e regras locais.
- **REQ253:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de saúde pública, como adaptar tarefas conforme alertas sanitários.
- **REQ254:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de emergência, como suspender tarefas não essenciais em situações críticas.
- **REQ255:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de energia, como reduzir sincronizações em modo de economia.
- **REQ256:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de desempenho, como adiar tarefas pesadas em dispositivos lentos.
- **REQ257:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de armazenamento, como compactar dados quando o espaço estiver baixo.
- **REQ258:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de memória, como liberar recursos quando a memória estiver baixa.
- **REQ259:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de rede, como priorizar sincronizações em redes rápidas.
- **REQ260:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de latência, como adiar sincronizações em redes lentas.
- **REQ261:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de custo de dados, como sincronizar apenas em redes sem custo.
- **REQ262:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de roaming, como evitar sincronizações fora da rede local.
- **REQ263:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de segurança de rede, como bloquear sincronizações em redes não confiáveis.
- **REQ264:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de privacidade de rede, como anonimizar metadados em redes públicas.
- **REQ265:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de conformidade, como registrar auditorias de acesso a tarefas sensíveis.
- **REQ266:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de transparência, como informar quais dados foram acessados.
- **REQ267:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de consentimento, como solicitar autorização antes de acessar sensores.
- **REQ268:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de revogação, como desativar acessos quando o consentimento for retirado.
- **REQ269:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de auditoria, como registrar todas as alterações em tarefas sensíveis.
- **REQ270:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de recuperação, como restaurar dados após falhas.
- **REQ271:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de contingência, como operar offline quando a rede falhar.
- **REQ272:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de emergência, como priorizar tarefas críticas em situações de risco.
- **REQ273:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de saúde, como ajustar tarefas conforme indicadores de bem-estar.
- **REQ274:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de acessibilidade, como adaptar notificações conforme recursos ativos.
- **REQ275:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de internacionalização, como adaptar formatos de data e hora conforme a região.
- **REQ276:** O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de localização, como adaptar unidades de medida conforme o país.

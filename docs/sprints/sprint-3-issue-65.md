# Issue #65 — refinamento de voz e Gate G1

**27/11/2026 · G1 = GO COM RESTRIÇÕES** no Moto G23. A decisão atual e a
implementação funcional estão nas seções 12 e 13. Os registros de NO-GO
abaixo descrevem os testes anteriores.

**17/11/2026 · G1 = NO-GO para implementação funcional no ambiente testado.**
Arquitetura mínima proposta abaixo; viabilidade de captura pela API comprovada,
mas transcrição pt-BR pelo microfone do host e integração da nova ponte RN ainda
não comprovadas. Não substituir essas evidências por texto digitado ou mocks.
**Estado da Sprint corrigido em 17/11/2026:** Sprint 3 **EM ANDAMENTO**,
de **16/11/2026 a 27/11/2026**, conforme informação da usuária.
Ver [registro vigente da Sprint 3](sprint-3.md). O início da Sprint não remove
o bloqueio funcional da #65 nem altera o resultado G1 = NO-GO.
Este documento não autoriza implementação.

#65 permanece OPEN no backlog da Sprint, com 8 pontos preliminares e T01–T08
bloqueados pelo G1. #66 (8), #67 (3) e #68 (2) permanecem OPEN.
O core originalmente proposto de 21 pontos precisa ser reavaliado rapidamente
após os gates técnicos; nenhuma substituição automática da #65.
#43 permanece OPEN, fora do core da Sprint 3.

## 1. Base, escopo e requisitos

- [Issue #65](https://github.com/AlineRaquelC/gestor-diario/issues/65): OPEN,
  Planning Poker preliminar 8; sem alteração nesta execução.
- [Proposta](sprint-3-proposal.md), especialmente seções 3, 6, 8, 10–12,
  integrada pelo [PR #64](https://github.com/AlineRaquelC/gestor-diario/pull/64).
- Preparação: `git switch dev`, `git pull`, `git status`; dev atualizada,
  working tree clean, SHA `7d2adc3ff879a26a172c4b158dd6cd02cb80a7ba`.
  Depois criada apenas a branch documental `docs/refine-65-voice`.
- [Requisitos oficiais](../requisitos/requisitos-oficiais.md), preservados:
  RF28 — criação por comando de voz usando microfone/reconhecimento do sistema;
  REQ141 — linguagem natural com confirmação antes de salvar;
  REQ142 — correção textual da transcrição antes de criar.
- Origem: PBI-25. Ditado isolado não comprova interpretação de linguagem natural.
  RF75/assistente Android externo permanece fora do recorte.
- #66–#68 e #43 não alteradas; nenhum milestone, feature branch ou Task criado.
  Nenhuma alteração de código, dependências, schema ou documento oficial.

## 2. G1 executado: método e evidências

Ambiente: AVD Pixel_7, serial `emulator-5554`, modelo
`sdk_gphone64_x86_64`, Android 16/API 36. Não é um Pixel físico.
Locale do sistema no probe: `en-US`; intent de fala explicitamente `pt-BR`.

Foi necessário um APK temporário **separado**, pacote `gate.voice`,
minSdk24/targetSdk36, Java + API Android, sem React Native, banco, HTTP próprio,
armazenamento de áudio ou acesso ao gestor. Ele consulta capacidades e registra
somente eventos/estados; não grava buffer de áudio, nem texto reconhecido em log.
Foi compilado em /tmp, instalado e **desinstalado ao final**; nenhum spike entrou
no repositório. Rede do AVD temporariamente desligada no teste offline e restaurada
por trap; Wi-Fi e dados móveis confirmados em 1 ao final.

Comandos de inventário:

```sh
adb devices -l
adb shell getprop ro.build.version.sdk
adb shell pm list features
adb shell cmd package query-services --brief -a android.speech.RecognitionService
adb shell settings get secure voice_recognition_service
adb emu avd name
```

Serviços listados:

- `com.google.android.tts/com.google.android.apps.speech.tts.googletts.service.GoogleTTSRecognitionService`
  (padrão configurado);
- `com.google.android.as/com.google.android.apps.miphone.aiai.app.AiAiSpeechRecognitionService`.

O probe usa o padrão e, separadamente, `createOnDeviceSpeechRecognizer`.
Não fixa componente Google no produto. Listar AiAi não prova que cada sessão
foi atendida por esse componente: não houve atribuição por rastreamento de rede.

| Verificação real | Resultado | Limite |
|---|---|---|
| `isRecognitionAvailable` | true | serviço não equivale a idioma/resultado |
| `isOnDeviceRecognitionAvailable` | true | não equivale a modelo pt-BR instalado |
| `checkRecognitionSupport` padrão/on-device | installed=[en-US], pending=[], pt-BR em supported, online=[] | consulta do padrão também emitiu erro 14 e respostas repetidas; não tomar uma consulta como garantia |
| Início pt-BR com rede e permissão | ready → beginning → positiveRms → end → error=7 | nenhum resultado final reconhecido; sem comando humano de referência comprovado |
| On-device explícito pt-BR | error=13 (LANGUAGE_UNAVAILABLE) | bloqueio real de idioma/modelo no estado atual |
| Sem rede, preferOffline=true | Wi-Fi=0, dados=0, Active default network: none; ready → error=13 | offline pt-BR falhou; não prova que todo provedor sempre exige rede |
| Sem RECORD_AUDIO | error=9 | API devolveu INSUFFICIENT_PERMISSIONS |
| Diálogo runtime concedido | permissionResult=[0], granted=true | concessão no spike, não no gestor |
| Primeira negação no diálogo | permissionResult=[-1], rationale=true | formulário manual futuro deve continuar disponível |
| Segunda negação/bloqueio | USER_SET e USER_FIXED; nova solicitação devolveu [-1], rationale=false | equivalente observado de “não perguntar novamente” no API36 |
| Revogação após concessão | permission=-1; nova tentativa error=9 | revogação via pm apenas no spike; não foi testada durante captura ativa |
| Cancelamento explícito | ready/beginning → explicit cancel → cancel/destroy | sem resultado final no intervalo observado |
| Home durante captura | ready/beginning → pause → cancel/destroy | teste de onPause, sem ponte RN/navegação do produto |
| Componente inexistente | error=10 (TOO_MANY_REQUESTS) | não houve false global nem desativação dos serviços reais; não confundir código com prova de ausência |
| Remoção | adb uninstall gate.voice: Success; pacote ausente | aplicação do gestor não reinstalada/limpa |

Trechos do log do dispositivo (relógio do AVD; não presumir fuso do host):

```text
11-17 14:01:34 mode=inspect available=true onDevice=true locale=en-US permission=-1
11-17 14:02:13 error=9 late=false
11-17 14:03:15 permissionResult=[0] rationale=false
11-17 14:03:47 startListening pt-BR
11-17 14:03:47 ready
11-17 14:03:48 beginning
11-17 14:03:50 positiveRms
11-17 14:03:53 end
11-17 14:03:53 error=7 late=false
11-17 14:04:15 mode localListen: error=13 late=false
11-17 14:04:30 mode preferOffline: ready; error=13 late=false
11-17 14:05:07 pause; cancel/destroy
11-17 14:05:09 após revogação: error=9 late=false
```

Artefatos locais removíveis: `/tmp/voice-g1/` (não são dependência do PR).
Para preservar evidência mesmo sem /tmp, os resultados relevantes estão acima.
Checksums SHA-256:

| Artefato | SHA-256 |
|---|---|
| src/gate/voice/Probe.java | 725a19822f8b06dad19219a229e166039b3b11d1d9f7d7caca7f4cac464e11dd |
| AndroidManifest.xml | 0e472e5fe2f91e667935bb613f6c31fca2d04a68fff1c60542587bb6dfba1124 |
| evidence.log | a98877491a98c78785cc951a9247097571d5e2b251e08a453b6883a2b46a1060 |
| offline.log | 10e28a04ec5701185d07bca331c5aa9ef9a107b2f5a75b70e50a1030d341316e |
| build-base.log | fa6f7a8936aeff0ff7c956f3a41e027765257e9afefc274cb5071372e089c4b9 |

### Microfone e limitações de áudio

`android.hardware.microphone` presente e `hw.audioInput=yes` no AVD.
Callbacks beginning e RMS positivo confirmam atividade no pipeline de captura,
mas não identificam a origem acústica nem comprovam inteligibilidade do microfone
do host. Não houve fala pt-BR conhecida correlacionada com resultado final.
Não se declarou reconhecimento de frase, partial ou confidence bem-sucedidos:
nenhum desses resultados foi obtido. Sem arquivo de áudio.

Foi solicitada colaboração para uma frase de referência; na ausência de evidência
de fala humana no teste, ela não foi substituída por texto injetado. A validação
de microfone real continua aberta.

### Debug/release e Codegen

Na base limpa, executado em android:

```sh
./gradlew assembleDebug assembleRelease --offline --console=plain
```

**BUILD SUCCESSFUL**, 1m04s, 438 tasks (48 executadas, 390 up-to-date).
Codegen do app e bundle Hermes release constaram como UP-TO-DATE.
New Architecture=true, Hermes=true, RN 0.87.1, Kotlin 2.2.0,
minSdk24/compileSdk37/targetSdk36 confirmados nos arquivos do projeto.
Release usa a configuração de assinatura debug existente; não é publicação.

Isso confirma o toolchain/base existente, **não** compila uma ponte de voz que
ainda não existe. O APK isolado valida somente a API Java do sistema.
Novo spec, Codegen, ligação Kotlin/JS, eventos e builds com a ponte são pendências
explícitas do G1; não declarar compatibilidade final só pelos builds da base.
API24, aparelho físico/arm64 e release com voz não foram executados.

## 3. Decisão do gate e critérios de reabertura

**G1 = NO-GO para iniciar implementação funcional agora.** A API é candidata
plausível, mas faltam evidências obrigatórias. Não é GO com restrições, porque
pt-BR real e ponte RN/build com voz são condições centrais da proposta.

Para reexecutar G1 em refinamento autorizado:

1. Disponibilizar pt-BR no provedor com decisão explícita sobre download/modelo
   e rede; não baixar modelo nem substituir serviço silenciosamente.
2. Confirmar microfone do host/telefone com frase conhecida, final pt-BR editável
   e cancelamento; distinguir ruído/RMS de reconhecimento.
3. Repetir online/offline com a mesma frase e documentar comportamento do provedor.
   Offline pode ser indisponível no recorte, desde que isso seja explicitamente
   aceito; não é permitido anunciar offline sem prova.
4. Provar em spike removível a ponte TurboModule/Codegen RN 0.87.1/Hermes,
   inclusive assembleDebug/assembleRelease. Não exige a feature inteira.
5. Validar o caminho isRecognitionAvailable=false/serviço ausente em ambiente
   controlado. A tentativa com componente inexistente retornou 10, não um teste
   completo desse caminho.
6. Revisar privacidade/termos/custo do serviço selecionado e o aviso antes da
   captura. API Android disponível não comprova que o provedor Google é software
   livre, gratuito em qualquer condição ou exclusivamente local.

Não improvisar IA remota, serviço pago, ditado simulado ou outra feature.
Goal/capacidade permanecem condicionais; nenhuma Issue foi atualizada.

## 4. Arquitetura mínima proposta

Fluxo: toque no microfone → informação sobre provedor/transmissão →
RECORD_AUDIO no contexto de uso → SpeechRecognizer pt-BR →
resultado final → parser local determinístico → rascunho revisável em
[NewTaskScreen](../../src/screens/NewTaskScreen.tsx) → salvar explicitamente →
[addTask](../../src/context/TaskContext.tsx) → serviço/API/SQLite existentes.

O callback nativo não importa nem chama addTask. Reconhecimento e parser não têm
acesso a persistência. Nenhuma Task é criada ao terminar fala ou ao navegar.
O botão Salvar e as validações canônicas continuam sendo a única entrada de criação.

### Escolha de integração

| Opção | RN/New Architecture/Hermes e APIs | Dependências/licença/manutenção | Decisão |
|---|---|---|---|
| Kotlin próprio com TurboModule e spec Codegen | segue padrão NativeTaskReminders já existente; chamadas Android na main thread; API básica atende min24; recursos API31/33 com guardas | sem pacote npm de voz ou modelo embutido; manutenção interna; termos do provedor separados da API | preferida, condicionada à prova da ponte |
| NativeModule legado próprio | integração legada não é a opção mínima coerente com o projeto atual | código adicional para compatibilidade, sem ganho no recorte | não escolher como arquitetura nova |
| @react-native-voice/voice | repositório inclui Codegen, mas não houve prova em RN0.87.1/API36/Hermes/min24 | MIT; projeto se declara deprecated/archived; traz wrapper e dependências | não adotar para este recorte |
| expo-speech-recognition | alternativa mantida indicada pelo projeto acima; compatibilidade exata requer spike | MIT; peer Expo e infraestrutura Expo Modules, ausentes hoje | não adicionar infraestrutura sem necessidade |

Fontes: [RN 0.87 Turbo Native Modules](https://reactnative.dev/docs/0.87/turbo-native-modules-introduction),
[voice](https://github.com/react-native-voice/voice),
[manifesto voice](https://github.com/react-native-voice/voice/blob/master/package.json),
[manifesto expo-speech-recognition](https://github.com/jamsch/expo-speech-recognition/blob/main/package.json).
Versões/compatibilidade declaradas não substituem build; nenhuma dependência instalada.

Contrato nativo futuro pequeno: capabilities(), start(sessionId, locale),
cancel(sessionId), dispose(); evento tipado contendo sessionId, tipo,
alternativas finais/partial, scores opcionais ou código de erro.
Usar tipos suportados pelo Codegen do projeto e validar schema antes de avançar.
Uma instância/uma sessão ativa; registrar/liberar listeners junto ao lifecycle.
Manifest futuro: RECORD_AUDIO, feature microphone opcional e queries para
android.speech.RecognitionService (visibilidade de pacote). Não pedir microfone
ao abrir o app ou o formulário manual.

### Privacidade

A documentação da [API Android](https://developer.android.com/reference/android/speech/SpeechRecognizer)
adverte que a implementação pode transmitir áudio para servidores.
Neste ambiente não foi auditado tráfego nem comprovado processamento local.
A UI futura deve informar **antes** da captura: “O serviço de reconhecimento do
Android pode enviar sua fala ao provedor para transcrição. Você pode continuar
digitando.” Oferecer decisão explícita, sem captura antecipada.

Sem arquivo, histórico de áudio, log de transcrição ou telemetria de conteúdo.
Rascunho apenas em memória; não persistir source=voice, áudio ou confidence no
banco. Sem streaming contínuo/background. Não apresentar EXTRA_PREFER_OFFLINE
como garantia: [RecognizerIntent](https://developer.android.com/reference/android/speech/RecognizerIntent)
define opções dependentes da implementação. On-device explícito só em API31+
e após verificar disponibilidade **e** idioma/modelo; sem fallback remoto oculto.

## 5. Lifecycle, permissão e concorrência

Máquina de estados proposta: idle → requestingPermission → starting →
listening → processing → draftReady ou error → idle.
cancelled/disposed invalidam a geração da sessão antes de cancelar/destruir.

- Lock adquirido antes de solicitar permissão; segundo toque não abre outra sessão.
- Todas as operações SpeechRecognizer na main thread; listener antes de start.
- sessionId/generation monotônico em JS e Kotlin; eventos antigos são ignorados.
- Apenas primeiro evento final ou erro encerra sessão. Partial só apresenta feedback.
  Callback duplicado não aplica rascunho duas vezes; nenhum callback salva Task.
- Esperar terminal para reiniciar a mesma instância; após cancelar, destruir a
  instância anterior antes de criar outra, sem sessões sobrepostas.
- Cancelar no AppState background/inactive, blur do app, saída/blur da rota,
  onHostPause, destruição da Activity e invalidação do módulo.
  Cleanup idempotente, cancel/destroy e remoção de listeners/timers.
- Ao retornar ao foreground, não reiniciar captura; revalidar permissão/disponibilidade.
  Rascunho já aplicado pode continuar editável enquanto a tela existir.
- Rotação: MainActivity atualmente trata orientation/screenSize em configChanges.
  Não iniciar por render/rotação. Se Activity for recriada, invalidar sessão e
  exigir novo toque; não recuperar gravação nem salvar automaticamente.
- Captura em andamento cancelada pelo usuário preserva campos manuais e não
  aplica partial. Resultado tardio após cancelar é descartado.
- Não sobrescrever edições feitas durante captura: congelar versão inicial dos
  campos e pedir aplicação/revisão quando houver conflito.
- RECORD_AUDIO: negar mantém formulário; revogar limpa sessão. Bloqueio permanente
  oferece Configurações somente por ação explícita, sem repetir prompt em loop.
  Rationale=false sozinho não distingue primeira solicitação de bloqueio:
  considerar histórico local de solicitação e resultado, sem presumir permissão.

Garantias acima são projeto para implementação/testes. O spike só comprovou
cancel explícito/onPause e estados de permissão; rotação, blur RN, callbacks
duplicados e recriação não foram declarados aprovados.

## 6. Transcrição e VoiceTaskDraft

Contrato conceitual TypeScript, sem código implementado:

```ts
type VoiceTaskDraft = {
  rawTranscript: string;
  title?: string;
  description?: string;
  startDate?: string; // data civil YYYY-MM-DD, sem inventar horário
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  confidence?: number; // score do provedor, se válido/disponível
  ambiguities: string[];
};
```

Entrada: resultado final, locale pt-BR e referência injetável
`{now, timeZone}`; nunca relógio global oculto nos testes.
Score ausente/-1 vira undefined, não zero ou garantia de interpretação.
Priorizar alternativa final principal; múltiplas alternativas divergentes geram
revisão, não seleção silenciosa de campos sensíveis. Não salvar partial.

Parser puro, local, determinístico, limitado a 500 caracteres por comando no
primeiro recorte. Rejeitar vazio/excesso com mensagem, sem truncar silenciosamente.
Normalizar espaços/case para reconhecer marcadores, preservando texto original.
Gramática inicial: título livre seguido de marcador terminal inequívoco de data
“hoje”/“amanhã” e/ou “prioridade baixa/média/alta”. Não interpretar URLs,
comandos de exclusão, recorrência, projeto por nome, horas ou datas complexas.

Exemplo com referência 17/11/2026, America/Sao_Paulo:
“Comprar leite amanhã prioridade alta” →
title “Comprar leite”, dueDate “2026-11-18”, priority high;
startDate/description não inferidos. Exibir data resolvida para revisão.
Data relativa resolve por dia civil local, incluindo virada de mês/ano/fuso;
não somar 24h em milissegundos. Não mudar horário/lembrete/recorrência.

Dois marcadores de data/prioridade conflitantes, título vazio ou expressão fora
da gramática: conservar texto seguro (por padrão, transcrição inteira como
título), não remover trechos nem sugerir campo ambíguo, preencher ambiguities
e exigir revisão. “Amanhã ou sexta”, “banco amanhã” sem contexto seguro e
“alta” fora de marcador não autorizam inferência silenciosa.
Palavra reconhecida com baixa confiança deve gerar aviso, nunca autosave.

Campos ausentes preservam valores visíveis atuais do formulário; datas inválidas
ou prazo anterior ao início permanecem sujeitos à validação canônica.
Não declarar REQ141 integral se a implementação acabar limitada a transcrição.

### Project e formulário

Usar o projectId atualmente selecionado, validado contra Projects hidratados.
Se ausente/inválido, seleção manual obrigatória. Nunca escolher/criar Project
por nome falado. NewTaskScreen hoje inicializa defaultProject usando ID de Geral
ou primeiro projeto; a voz não amplia essa regra nem resolve carregamento por nome.
Revalidar existência do ID ao salvar.

Reutilizar título/descrição/datas/prioridade, seletores e fluxo handleSubmit
existentes, inclusive lock de submissão. Sem segundo formulário ou CRUD.
Resumo dos campos propostos fica editável e acessível; Salvar continua explícito.

## 7. Erros e fallback

Códigos conferidos na API e no android.jar local do SDK37; tratar números
desconhecidos com erro genérico recuperável. Não emitir mensagens cruas do provedor.

| Código | Mensagem futura | Conduta |
|---|---|---|
| 1 ERROR_NETWORK_TIMEOUT | A conexão demorou. Tente novamente ou digite. | terminar sessão; retry explícito |
| 2 ERROR_NETWORK | Não foi possível conectar ao serviço de voz. | manter manual; sem troca oculta de provedor |
| 3 ERROR_AUDIO | Não foi possível acessar o microfone. | liberar recursos; orientar uso manual |
| 4 ERROR_SERVER | O serviço de voz está indisponível agora. | terminar; retry explícito |
| 5 ERROR_CLIENT | Não foi possível concluir a captura. | se cancelamento próprio, não alarmar usuário |
| 6 ERROR_SPEECH_TIMEOUT | Não ouvimos uma fala. | permitir nova tentativa |
| 7 ERROR_NO_MATCH | Não foi possível entender. Tente novamente ou digite. | nenhum rascunho automático |
| 8 ERROR_RECOGNIZER_BUSY | O reconhecimento está ocupado. | manter lock até cleanup; sem retry em loop |
| 9 ERROR_INSUFFICIENT_PERMISSIONS | Microfone não autorizado. Você pode digitar. | revisar permissão; Configurações se bloqueada |
| 10 ERROR_TOO_MANY_REQUESTS | O serviço limitou as tentativas. Aguarde e tente depois. | não reiniciar automaticamente |
| 11 ERROR_SERVER_DISCONNECTED | A conexão com o serviço de voz foi encerrada. | cleanup e manual |
| 12 ERROR_LANGUAGE_NOT_SUPPORTED | Este serviço não suporta português do Brasil. | bloquear captura nesse modo; manual |
| 13 ERROR_LANGUAGE_UNAVAILABLE | Português do Brasil não está disponível neste serviço agora. | informar modelo/idioma; sem download automático |
| 14 ERROR_CANNOT_CHECK_SUPPORT | Não foi possível confirmar o suporte do serviço. | consulta inconclusiva; registrar estado, não provar suporte |
| 15 ERROR_CANNOT_LISTEN_TO_DOWNLOAD_EVENTS | Não foi possível acompanhar o modelo de voz. | se esse recurso futuro for usado, informar limitação |
| outro/exception/serviço ausente | Não foi possível iniciar o reconhecimento de voz. | não travar formulário; cleanup |

Nem todos os códigos foram provocados: resultados reais estão na seção 2.
Não fazer retry automático de captura. Erro de voz não limpa campos já digitados,
não bloqueia Salvar manual e não altera Tasks existentes.
Botões com rótulos TalkBack, estado de escuta textual e anúncio acessível de erro,
sem depender somente de animação/cor; feedback parcial não deve anunciar a cada token.

## 8. Riscos, testes, QA e Planning Poker

Risco principal **alto até reabrir G1**: modelo pt-BR ausente, fala humana não
comprovada e ponte ainda não testada. Após provas, risco esperado médio-alto:
dependência do provedor, permissões/lifecycle, diversidade Android e interpretações.
RMS não mede acurácia. Score não garante semântica. Serviço Google instalado não
equivale a SDK livre embutido. Nenhum backend novo é necessário.

**Manter 8 pontos como estimativa preliminar condicional**, não compromisso.
Inclui ponte pequena, parser restrito, formulário e testes. O NO-GO não justifica
inflar pontos para esconder incerteza: primeiro resolver/replanejar o gate.
Se for necessário trocar motor, embutir modelo offline, oferecer gramática ampla
ou ampliar compatibilidade, reestimar/decompor antes da autorização. Não alterar
pontuação/Issue automaticamente; sem datas/capacidade de Sprint assumidas.

Testes automatizados futuros:

- parser: exemplo, acentos, espaços, vazio/limite, virada de dia/mês/ano e fuso,
  ambiguidades/conflitos, confidence ausente, texto que se parece com comando;
- state machine/controller: duplo toque, partial/final repetidos, sessão antiga,
  cancel, navegação, AppState/blur e unmount; nenhuma chamada addTask nos callbacks;
- permissões: concedida/negada/revogada/bloqueada; serviço/idioma indisponível;
- formulário: não sobrescrever edição, Project por ID/hidratação, revisar/editar,
  cancel sem criação, confirmação única usa addTask e validações existentes;
- integração nativa: main thread, listener/cleanup idempotente e eventos tardios;
  Codegen/builds debug/release com ponte; não ampliar baselines existentes.

Android futuro: comando conhecido pt-BR pelo microfone, final e edição,
confirmação/persistência/Home/calendário quando aplicável, negação/revogação,
offline/no-match, cancel, background/foco/rotação/reentrada/cold restart,
ausência de serviço/modelo e release. AVD explicitamente simulado; físico
necessário antes de alegar qualidade de captura de dispositivo.

Nesta execução não houve Task nem massa QA; o spike não conhece addTask/API.
Home zerada é estado informado de entrada; não foi aberto fluxo do gestor nem
reconsultado banco para inferir isso de testes de voz. Futuro QA: inicialmente
zero Tasks (somente rascunhos/cancelamentos); após autorização, uma Task manual
de referência sem recorrência/lembrete, com IDs/clientIds registrados.
Remover toda massa criada para #65 antes do merge e confirmar Home/calendário/API
sem resíduo; preservar dados anteriores, history e demais entidades.

## 9. Plano futuro T01–T08 — bloqueado pelo G1

Esta decomposição serve para revisão; **não iniciar agora**, mesmo sem código de
feature no spike. Só executar após evidências de G1 aceitas e autorização explícita.

| Bloco | Entrega proposta | Verificação |
|---|---|---|
| T01 — ponte/native voice service | spec TurboModule + Kotlin mínimo e capabilities/start/cancel/dispose | Codegen, main thread, eventos tipados, debug/release |
| T02 — permissões/lifecycle | RECORD_AUDIO contextual, visibilidade de serviço, lock/sessionId e cleanup | negação/revogação/bloqueio, foco/rota/background |
| T03 — parser VoiceTaskDraft | gramática determinística pt-BR e datas civis com referência injetada | testes puros e ambiguidades |
| T04 — integração formulário | pré-preencher NewTaskScreen com revisão e projectId válido | nenhum save por callback, submissão canônica única |
| T05 — erros/acessibilidade | mensagens/fallback/aviso pré-captura e TalkBack | manual sempre disponível |
| T06 — testes automatizados | parser/controller/formulário/contrato/regressões | CI real, lint/typecheck sem ampliar baseline |
| T07 — Android manual | matriz de fala real, erro, rede, lifecycle e release | evidências identificadas como AVD/físico |
| T08 — limpeza QA/documentação | remover massa, registrar limites e testes reais | diff check, links, Home/calendário sem resíduos |

A Sprint 3 já está em andamento; este refinamento não autoriza implementar a
#65 enquanto o G1 permanecer NO-GO, criar milestone/Issues técnicas ou executar
stretch. #43 permanece pendência da Entrega 2, fora do core.
Refinamento integrado pelo PR #69; esta correção de estado é somente documental,
sem fechamento da #65 ou alteração das evidências e conclusões do gate.

## 10. Reexecução do G1 em 24/11/2026

**G1 = NO-GO.** A [Issue #65](https://github.com/AlineRaquelC/gestor-diario/issues/65)
permanece aberta, com 8 pontos bloqueados e replanejados conforme o
[registro vigente da Sprint](sprint-3.md#decisão-de-replanejamento-em-24112026).
A evidência de 17/11 permanece registrada acima.

No AVD Pixel_7/API 36, o reconhecedor padrão e o serviço on-device estavam
acessíveis. O provedor padrão era GoogleTTSRecognitionService e o serviço
on-device era AiAiSpeechRecognitionService. A consulta listou `pt-BR` entre
os modelos baixáveis, com apenas `en-US` instalado e nenhum download pendente.
Nenhum modelo foi baixado. O diagnóstico padrão com rede ativa chegou a
`ready`, `beginning` e RMS positivo com o microfone do host desativado.
Sem rede, o diagnóstico on-device retornou `LANGUAGE_UNAVAILABLE` (13).

O bloqueio central é a falta de um resultado final textual utilizável em
pt-BR a partir de fala real. Por isso, a implementação funcional continua
bloqueada e a prova da ponte RN/TurboModule/Codegen fica adiada até haver
uma transcrição válida. Texto digitado, mocks, simulação e serviço pago
continuam fora das alternativas autorizadas.

A Sprint segue para o G3, sem novas tentativas no mesmo AVD. Caso haja acesso
a um Android físico antes do fechamento, cabe uma última revalidação isolada
com fala real pt-BR, sem interromper a #67 e fora do compromisso da Sprint.
A #65 só volta à avaliação para implementação se o G1 reunir evidência
suficiente para GO ou GO COM RESTRIÇÕES, com autorização separada para iniciar.

## 11. Recuperação do G1 no Moto G23 em 27/11/2026

Spike local `spike/65-voice-physical-g1`, criado a partir da `dev` sincronizada
em `7099f905faf1b9833678f53cbb539eeafca11a7a`. Alvo físico `0082429976`,
Moto G23, Android 14/API 34, arm64-v8a. A sondagem instalada separadamente
confirmou disponibilidade de SpeechRecognizer, SpeechRecognizer on-device
e Activity para RecognizerIntent. O serviço padrão configurado é
GoogleTTSRecognitionService. O Android também lista AiAiSpeechRecognitionService
e resolve o intent para GoogleTTSActivity. A consulta on-device informou
`installed=[pt-BR]`, nenhuma instalação pendente e nenhuma língua online nessa
consulta. O APK de diagnóstico não recebeu RECORD_AUDIO. Nenhum modelo foi
baixado.

O release de prova usa o pacote isolado `com.gerenciadortarefas.voiceg1`,
React Native/Hermes e um TurboModule Codegen para o SpeechRecognizer on-device.
A solicitação usa `LANGUAGE_MODEL_FREE_FORM` e `pt-BR`. O app pede
RECORD_AUDIO somente ao iniciar a captura e entrega só o resultado final a um
campo editável em memória. Possui cancelamento, timeout, descarte de callbacks
de sessão encerrada e contagem de resultados finais. Nenhum buffer de áudio é
armazenado. O spike não possui formulário de tarefa, integração com API,
gravador, parser ou acesso aos dados do Gestor Diário.

A redação oficial foi conferida em [requisitos oficiais](../requisitos/requisitos-oficiais.md).
RF28 exige voz pelo microfone e reconhecimento do sistema; REQ141 exige
interpretação em linguagem natural e confirmação antes de salvar; REQ142 exige
correção textual da transcrição antes da criação. A tela de prova valida a ponte
e a edição; a interpretação determinística e a confirmação canônica pertencem
à implementação funcional posterior a uma decisão do Gate.

A captura humana ainda está pendente. Presença de modelo, resolução da Activity
e build não comprovam transcrição, passagem do resultado pela ponte ou
funcionamento offline. Testar primeiro a API on-device. Considerar
RecognizerIntent como fallback apenas após tentativas limitadas e autorização
para o possível processamento remoto. Nenhuma Task ou Project de QA foi criado.

### Preparação verificada

O release arm64-v8a foi instalado e abriu em cold start no Moto G23.
A interface React Native exibiu “Pronto para testar” com o TurboModule
disponível e zero resultados finais. O APK não carrega permissão INTERNET
e inclui o bundle Hermes. Isso comprova o carregamento do spike sem Metro;
a promessa com transcrição humana ainda precisa ser exercitada. O APK
nativo de diagnóstico foi removido e o Gestor Diário permaneceu instalado.
A consulta de Tasks após a preparação retornou uma lista vazia.

O Gradle aprovou `:app:assembleRelease` e `:app:testDebugUnitTest` (10
testes JVM existentes). Os guardas de CI locais, lint, TypeScript e Jest
(828 testes em 43 suítes) passaram sem ampliação de baselines.
`git diff --check` passou. O spike permaneceu local, sem PR, push ou merge.

## 12. Decisão final do Gate G1 — GO COM RESTRIÇÕES

A responsável pelo projeto testou o release isolado no Moto G23, Android 14,
API 34, arm64-v8a. Os cenários abaixo são resultados manuais informados pela
responsável. Os registros de preparação e as verificações técnicas do Codex
estão na seção 11.

| Cenário manual do spike | Resultado informado |
|---|---|
| Transcrever “Comprar pão amanhã” em pt-BR | PASS |
| Entregar o resultado pela ponte nativa ao React Native | PASS |
| Transcrever “Entregar trabalho da faculdade na segunda-feira, prioridade alta” | PASS |
| Editar a transcrição de prioridade alta para média | PASS |
| Nova captura com “Estudar engenharia de software amanhã” | PASS |
| Capturas consecutivas sem reinicialização | PASS, sem duplicação no teste posterior |
| Cancelar | PASS, transcrição anterior e contador preservados |
| Captura sem fala | PASS, exibiu “Nenhuma transcrição reconhecida” |
| “Comprar pão amanhã” com Wi-Fi e dados móveis desativados | PASS, offline no Moto G23 |

Houve diferença entre contadores em duas evidências fotográficas iniciais,
sem causa confirmada. O teste consecutivo posterior passou. Nenhuma contagem,
transcrição literal de retorno, imagem ou log foi reconstruído.

O aparelho físico com modelo pt-BR instalado superou a ausência de transcrição
pt-BR real que bloqueava os NO-GO anteriores. O release com bundle Hermes e
a abertura em cold start sem Metro foram verificados diretamente pelo Codex.
A responsável confirmou o resultado real no campo editável do React Native.
O GO se limita a Android API 31+ com serviço on-device e modelo pt-BR
disponíveis. A comprovação offline cobre o Moto G23 testado. A solução usa
somente o reconhecedor on-device e mantém o formulário manual disponível
em caso de incompatibilidade, modelo ausente ou permissão negada.

## 13. Implementação funcional — Issue #65

A feature parte de `dev` em `7099f905`. O spike está preservado localmente
em `f29744b`. A feature reutiliza o contrato Codegen e a sessão Android
on-device validados, com nomes de produção. A interface do spike fica na
branch de prova. Não há dependência nova, envio de áudio ao backend ou
gravação de arquivo de áudio.

- **RF28:** ação **Criar por voz** em Nova Tarefa. Verificação do serviço
  antes da permissão. O TurboModule inicia somente SpeechRecognizer
  on-device com `pt-BR`, aceita apenas o resultado final e encerra a captura
  por conclusão, erro, cancelamento, tempo limite ou saída do app.
- **REQ142:** a transcrição fica em memória no formulário, com original
  visível após edição. **Interpretar e preencher** usa o texto editado.
  Cancelamento e erros preservam a transcrição anterior e os campos.
- **REQ141:** interpretação determinística local. O usuário aplica o texto
  explicitamente, revisa título, prazo e prioridade e confirma por
  **Criar tarefa**. A gravação fica no `addTask` canônico. Projeto,
  início, horário, lembretes, recorrência e subtarefas conservam o valor
  do formulário. Prazo anterior ao início é sinalizado e preserva o
  prazo anterior. A prova física da feature segue pendente.

### Gramática de prazo e prioridade

Reconhece qualificadores no fim da frase, em qualquer ordem com relação à
prioridade. Datas relativas usam o dia civil local e uma referência injetada
nos testes. Dia da semana significa a próxima ocorrência estritamente
futura, inclusive sete dias quando a referência cai no mesmo dia da semana.
As datas brasileiras aceitas são `d/M` e `d/M/yyyy`, com preenchimento
opcional de zeros. Sem ano, usa o ano corrente. Datas passadas ou inválidas,
alternativas e qualificadores repetidos preservam a frase como título
revisável e exibem um aviso. A prioridade reconhece **baixa**, **média** e
**alta**. Datas, horários ou comandos fora da gramática ficam para revisão
manual. O limite da interpretação é de 500 caracteres.

### Validação física da feature — aguardando execução

| Cenário | Estado pré-validação |
|---|---|
| Frase simples e frase com prazo/prioridade | NOT TESTABLE nesta etapa. Depende de voz humana no release da feature. |
| Conferir formulário preenchido, editar a transcrição e reaplicar | NOT TESTABLE nesta etapa. Aguardando teste físico. |
| Corrigir campos manualmente, cancelar sem persistência | NOT TESTABLE nesta etapa. Aguardando teste físico. |
| Criar uma única tarefa e confirmar na Home, Calendário, API e após reabertura | NOT TESTABLE nesta etapa. Aguardando teste físico. |
| Reconhecer e interpretar offline | NOT TESTABLE nesta etapa. Aguardando teste físico da feature. Voltar à LAN antes de salvar. |
| Testar silêncio, cancelamento, negação de permissão e fallback manual | NOT TESTABLE nesta etapa. Aguardando teste físico. |
| Regressão do fluxo manual, QR V1 e atalho Android | NOT TESTABLE nesta etapa. Aguardando teste físico. |

Usar o prefixo `QA65` em qualquer título persistido, sem recorrência ou
lembrete. Após a conferência, excluir os registros criados pelo teste apenas
pelo app. Verificar Home, Calendário, API, alarmes e notificações. Preservar
histórico, tombstones e Projects existentes. O reconhecimento e o parser
podem ser avaliados com a rede desligada. A persistência segue o comportamento
do app e deve ser testada com a API local alcançável.

### Verificação automatizada da feature

Passaram 17 testes dos validadores, lint e TypeScript sem regressão,
856 testes Mobile em 45 suítes (28 casos novos de voz), 10 testes JVM
existentes, `assembleDebug`, `assembleRelease` e `git diff --check`.
No Backend passaram migrações em SQLite temporário, typecheck, 479 testes
em 17 suítes e build. Os testes de interface simulam a resposta da ponte
para verificar a revisão e a persistência canônica; a transcrição real
da feature é uma etapa separada.

## 14. Validação física final — 27/11/2026

A responsável pelo projeto executou a validação da implementação definitiva no
Moto G23, Android 14/API 34, com release Hermes. Os resultados desta tabela
foram informados pela responsável.

| Cenário manual | Resultado |
|---|---|
| “Comprar pão amanhã” | PASS. Título interpretado corretamente e prazo em 28/11/2026. |
| “Entregar trabalho da faculdade na segunda-feira, prioridade alta” | PASS. Título interpretado corretamente, prazo em 30/11/2026 e prioridade alta. |
| Edição da transcrição e nova interpretação | PASS. Troca de segunda-feira por amanhã e de alta por média aplicada corretamente. |
| Correção no formulário canônico | PASS. Título, descrição, prazo e prioridade editáveis. |
| Cancelar captura | PASS. Rascunho preservado. |
| Cancelar formulário | PASS. Sem criação involuntária. |
| Criar explicitamente `QA65 Estudar engenharia de software` | PASS. Uma tarefa na Home e no Calendário, persistente após reabertura. |
| Offline: “Comprar material escolar depois de amanhã, prioridade baixa” | PASS. Reconhecimento e interpretação em pt-BR, prazo em 29/11/2026 e prioridade baixa. |
| Ausência de fala e permissão negada | PASS. Erros tratados e criação manual disponível. |
| Regressões manual, QR Code e atalho Android | PASS. Criação manual aprovada na repetição via USB. |
| Exclusão de tarefas QA e reabertura | PASS. Home e Calendário limpos, sem reaparecimento. |

RF28, REQ141 e REQ142 foram atendidos no recorte implementado. A prova física
cobre este Moto G23 com serviço on-device e modelo pt-BR instalado. Vale a
restrição de compatibilidade do G1. O cenário offline exercitou voz e parser.
A persistência foi validada com comunicação disponível com a API.

### Comunicação durante a validação

Após o teste offline, o Moto G23 retornou `No route to host` na conexão Wi-Fi
com o notebook, cujo IP permaneceu `192.168.18.169`. O backend seguiu ativo,
a API respondeu a partir do notebook e o SQLite passou no `quick_check`.
A primeira tentativa manual não gerou registro na API ou no banco. A origem
exata da falha Wi-Fi não foi determinada.

O Codex confirmou HTTP 200 diretamente pelo aparelho via ADB reverse e
confirmou o acesso no próprio Gestor Diário com a busca remota. O APK
temporário usou `127.0.0.1:3000` e política de HTTP limitada a loopback,
somente na cópia de QA. A responsável repetiu com sucesso a criação manual
e concluiu as regressões nesse ambiente. As configurações versionadas
e o APK anterior foram preservados.

### Verificações diretas do Codex e limpeza

O Codex confirmou a tarefa de voz ativa na API e no SQLite durante o teste.
O título armazenado foi `QA65  estudar engenharia de software` e o ID foi
`d753d194-db10-4235-b71f-d7ee893a97b9`. Após a limpeza informada, a API
retornou zero Tasks ativas e a lista de Projects permaneceu idêntica à
referência. Uma consulta somente leitura confirmou os tombstones e o histórico
da tarefa de voz e de `QA65 Regressão manual`
(`240f7285-8912-4b26-a156-6017323b9147`). Home e Calendário estavam vazios e
o aparelho retornou zero alarmes ou notificações do app.

O APK USB temporário tinha SHA-256
`097562847e6f087e3cdfb8d5cdc2e915524e0846382944382b5359445145cdb9`.
O Codex restaurou o APK anterior por atualização, sem limpar dados, removeu
o pacote de spike e retirou o encaminhamento USB. Os resultados automatizados
estão registrados separadamente na seção 13.

# Issue #65 — refinamento de voz e Gate G1

**17/11/2026 · G1 = NO-GO para implementação funcional no ambiente testado.**
Arquitetura mínima proposta abaixo; viabilidade de captura pela API comprovada,
mas transcrição pt-BR pelo microfone do host e integração da nova ponte RN ainda
não comprovadas. Não substituir essas evidências por texto digitado ou mocks.
Sprint 3 não iniciada. Este documento não autoriza implementação.

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

Não iniciar Sprint 3, criar milestone/Issues técnicas ou executar stretch por
causa deste refinamento. #43 permanece pendência da Entrega 2. PR somente
documental para dev, sem merge automático e sem palavras de fechamento da #65.

# Issue #66 — refinamento de QR estruturado e Gate G2

**17/11/2026 · G2 = GO COM RESTRIÇÕES para a solução candidata no AVD testado.**
Sprint 3 **EM ANDAMENTO, 16/11/2026 → 27/11/2026**.
**Atualização funcional:** implementação autorizada na branch
`feature/66-structured-qr-task`; detalhes e validações na seção 10.
**Android manual da usuária PENDENTE; #66 OPEN; sem merge.**
As seções 1–9 preservam o registro histórico do refinamento/G2 anterior à
implementação. O resultado e as restrições do gate não foram alterados.
Este registro é refinamento técnico; não entrega nem autoriza automaticamente
a implementação funcional da #66.

## 1. Base, requisitos e limites

- [Issue #66](https://github.com/AlineRaquelC/gestor-diario/issues/66): OPEN,
  8 pontos preliminares; sem edição nesta execução.
- Preparação: git switch dev, git pull e git status; dev atualizada e limpa em
  `535e930b9bd7d3ee0ea59a520b72f7952efb2043`.
- Fontes: [Sprint vigente](sprint-3.md),
  [proposta histórica](sprint-3-proposal.md),
  [requisitos oficiais](../requisitos/requisitos-oficiais.md).
- PBI-25/REQ145: criar tarefas a partir de QR com informações estruturadas.
- RF30 inclui barcode/QR para associar tarefa a item/local. A #66 cobre somente
  **QR estruturado → rascunho → revisão → confirmação → Task canônica**.
  Não declarar RF30 integralmente entregue.
- Fora: barcode linear, associação persistente a item/local, URLs/deep links
  automáticos, automações sem confirmação, migration e servidor de imagens.
- O texto da Issue ainda contém a nota antiga de Sprint não iniciada; para o
  calendário prevalece sprint-3.md e a correção da usuária. Issue não alterada.
- #65 permanece OPEN/G1 NO-GO; #67/#68 OPEN; #43 OPEN e fora do core.
  Nenhuma dessas Issues foi alterada.

## 2. Alternativas e candidata

**Candidata preferida:** CameraX 1.5.3 (camera-camera2, camera-lifecycle,
camera-view; core transitivo) + ZXing core 3.5.4, com adaptador Kotlin pequeno.
Versões fixadas no spike, sem alteração de package.json/Gradle no repositório.
1.5.3 é uma versão estável publicada, não a mais recente: a página oficial já
lista CameraX 1.6.2. Trocar versão requer revalidar o conjunto; não transferir a
prova deste gate automaticamente para outra versão.

| Opção | Licença/manutenção | Dependências e tamanho | RN/offline/Google |
|---|---|---|---|
| A — CameraX + ZXing core | AndroidX Apache-2.0; camera-core também declara BSD/libyuv no POM. ZXing Apache-2.0, modo de manutenção | AARs AndroidX e JAR Java; sem modelo ML; soma/impacto final no APK ainda precisa de baseline equivalente | ponte própria Codegen; decode local, sem Google Play Services |
| B — VisionCamera + scanner pronto | VisionCamera MIT e plugin MIT; projeto ativo, versão consultada 5.2.4 | Nitro Modules/Image e plugin de scanner; infraestrutura adicional ao app atual | integração moderna via Nitro, porém RN0.87.1 exato não testado; scanner atual usa ML Kit |
| C — ML Kit barcode | SDK sujeito aos termos Google; não presumir licença livre por gratuidade | bundled: aproximadamente 2,4 MB; unbundled: aproximadamente 200 KB mais download | processamento de barcode no dispositivo; unbundled depende de Play Services/modelo, bundled inclui modelo; bridge RN ainda necessária |
| D — CameraX + ZXing-C++ | Apache-2.0 no decoder; projeto com bindings Android | acrescenta C++/JNI, build/empacotamento por ABI e licenças do conjunto escolhido | local e sem Play Services obrigatório; maior superfície nativa para este recorte |

Preferir A se o gate real aprovar: mantém câmera e decoder explícitos, evita
infraestrutura Nitro/ML e resolve o recorte QR único. Manutenção limitada do
ZXing Java é risco aceito para revisão, não promessa de roadmap ativo.
Não usar o app externo Barcode Scanner (sem suporte Android14); decoder core
embutido é um artefato distinto.

Fontes primárias consultadas:
[CameraX versões](https://developer.android.com/jetpack/androidx/releases/camera),
[AndroidX licença](https://github.com/androidx/androidx/blob/androidx-main/LICENSE.txt),
[ZXing e manutenção](https://github.com/zxing/zxing),
[licença ZXing 3.5.4](https://github.com/zxing/zxing/blob/zxing-3.5.4/LICENSE),
[VisionCamera manifesto](https://github.com/mrousavy/react-native-vision-camera/blob/main/packages/react-native-vision-camera/package.json),
[scanner VisionCamera](https://visioncamera.margelo.com/docs/barcode-scanner),
[ML Kit Android](https://developers.google.com/ml-kit/vision/barcode-scanning/android),
[ZXing-C++](https://github.com/zxing-cpp/zxing-cpp).

### Compatibilidade verificada e limites

RN 0.87.1, New Architecture/Hermes ativos, Kotlin 2.2.0,
minSdk24, targetSdk36, compileSdk37. Manifestos dos AARs CameraX1.5.3 declaram
minSdk23, compatível com o mínimo24 do projeto. camera-core inclui bibliotecas
JNI para x86_64 e arm64-v8a, entre outras; ZXing core é Java.
Disponibilidade de artefatos não equivale a execução em ambas as ABIs.

## 3. Spike e evidências reais

Spike removível em `/tmp/qr-g2/`, baseado em cópia da dev com node_modules
existente referenciado, applicationId separado `gate.qr66`.
Entrada JS substituída por tela técnica que chama o módulo e compara o resultado;
não inicializa Contexts/serviços de Tasks ou Projects e não acessa o backend.
Preview técnico em Activity Android, não tela final de produto.
Nenhum código experimental/dependência do spike integra este PR.

AVD Pixel_7, modelo sdk_gphone64_x86_64, API36/x86_64.
Features camera, camera.any, camera.front e autofocus presentes.
Câmera traseira virtualscene; frontal emulated. CameraManager/provider expõem
frontal ID1 e traseira ID10 no ambiente consultado.
Não alegar Pixel físico ou webcam real testada. Webcam pode ser configurada no
emulador em sessão própria; esta execução utiliza cena virtual controlada.

QR de referência gerado localmente, sem dado pessoal:

```json
{"version":1,"title":"QA66 QR","dueDate":"2026-11-20","priority":"medium"}
```

Data futura válida em relação ao teste de 17/11. PNG usado somente como textura
da cena virtual via adb emu virtualscene-image wall/table; não é imagem enviada
ao decoder por arquivo. O decoder recebe frames do ImageAnalysis.
O literal no JS é usado somente para comparar o retorno da câmera, não como
fonte do resultado. Nenhuma Task QA66 foi criada.

### Resultados observados

| Verificação | Evidência real | Limite |
|---|---|---|
| Traseira CameraX | bind rear=true, frame 1280x960, rotation=90, preview=STREAMING | cena virtual, sem qualidade óptica física comprovada |
| Frontal CameraX | bind rear=false, frame 1920x1440, rotation=270, preview=STREAMING | frontal emulada; sem QR conhecido nessa câmera |
| CAMERA concedida | diálogo runtime: permissionResult=[0], câmera iniciou | permissão somente no pacote do spike |
| Primeira negação | permissionResult=[-1], rationale=true; scanner sem frames | fallback do formulário do produto ainda será implementado |
| Negação permanente | segunda negação: USER_SET/USER_FIXED, granted=false; nova solicitação [-1], rationale=false | UI Android16 não exibe checkbox literal “não perguntar novamente” |
| Revogação/retorno | pm revoke após concessão; novo create permission=-1/rationale=true e prompt | revogação durante frame ativo não testada |
| Background/foreground | frontal: unbind/pause/IDLE, depois novo bind/STREAMING | spike retoma no onResume; produto deverá exigir retomada explícita |
| QR conhecido | DECODE do payload exato por ImageAnalysis/ZXing, em debug e release | enquadramento foi ajustado nos controles da cena virtual |
| Retorno RN release | bridge returning payload; G2_JS_EXACT=true, hermes=true | tela técnica, sem integração ao formulário final |
| Offline | Wi-Fi=0, dados=0, Active default network: none; decode no frame1 e JS_EXACT=true | fixture conhecida no AVD, não benchmark amplo |
| Cancelar | user cancel → unbind/pause/destroy; JS exibiu “Error: Scanner cancelado” | mensagem técnica do spike; produto usará retorno normal de cancelamento |
| Sem QR | frames continuam sem resultado, sem Task | tratamento visual/timeout final pertence à implementação |
| Limpeza | uninstall gate.qr66: Success; pacote ausente; Active Camera Clients=[] | gestor não reinstalado e dados não acessados |

Trechos do log do dispositivo (horário do AVD, sem presumir fuso do host):

```text
11-17 15:32:08 permissionResult=[0] rationale=false
11-17 15:32:09 frame=1 size=1280x960 rotation=90
11-17 15:32:09 preview=STREAMING
11-17 15:42:35 DECODE payload={"version":1,"title":"QA66 QR","dueDate":"2026-11-20","priority":"medium"}
11-17 15:43:22 bound gen=1 rear=false
11-17 15:43:22 frame=1 size=1920x1440 rotation=270
11-17 15:43:24 unbind; pause; preview=IDLE
11-17 15:43:25 bound gen=3 rear=false; preview=STREAMING
11-17 15:43:29 create permission=-1 rationale=true
11-17 15:55:30 bridge returning payload={"version":1,"title":"QA66 QR","dueDate":"2026-11-20","priority":"medium"}
11-17 15:55:30 G2_JS_EXACT=true payload={"version":1,"title":"QA66 QR","dueDate":"2026-11-20","priority":"medium"} hermes=true
11-17 15:56:13 DECODE payload={"version":1,"title":"QA66 QR","dueDate":"2026-11-20","priority":"medium"} frame=1
11-17 15:56:13 G2_JS_EXACT=true payload={"version":1,"title":"QA66 QR","dueDate":"2026-11-20","priority":"medium"} hermes=true
11-17 15:57:14 user cancel; unbind; pause; preview=IDLE; destroy
```

### Builds com as dependências e ponte do spike

```sh
./gradlew assembleDebug assembleRelease -PreactNativeArchitectures=x86_64,arm64-v8a --console=plain
# Após correções do isolamento, repetição final com cache:
./gradlew assembleDebug assembleRelease -PreactNativeArchitectures=x86_64,arm64-v8a --offline --console=plain
```

Build inicial: debug produzido; release falhou ao resolver React fora do root
Metro na cópia com node_modules symlink. Adicionado watchFolder/nodeModulesPaths
somente no Metro do spike. Reexecução: **BUILD SUCCESSFUL em 1m36s,
422 tasks, 186 executadas/236 up-to-date**.

Uma tentativa auxiliar de girar PlanarYUVLuminanceSource gerava
UnsupportedOperationException quando não havia QR. Foi removida no spike;
o decoder QR faz sua própria detecção de orientação. Build final dos APKs
testados: **BUILD SUCCESSFUL em 30s, 422 tasks, 33 executadas/389 up-to-date**.
Não levar o código experimental sem revisão para o produto; os cenários de
crop/stride/rotação continuam na matriz de testes da feature.

Codegen gerou NativeQrGateSpec.java e artefatos C++/JNI; Kotlin compilado.
O módulo implementa o spec TurboModule e retorna uma Promise para o JS.
Release executado com Hermes no API36/x86_64, sem Metro.
AAPT confirmou minSdk24/targetSdk36/compileSdk37; APKs contêm libs Hermes,
CameraX e integração RN para arm64-v8a e x86_64. **arm64 foi compilado/empacotado,
não executado em aparelho físico; API24 também não foi executado.**
Release usa a chave debug existente no template; não é artefato de publicação.

Tamanhos do spike com duas ABIs: debug 92.799.614 bytes; release 42.279.656 bytes.
São APKs de teste incluindo RN/dependências da base, **não** delta de CameraX
ou tamanho final da feature. Medir delta com baseline equivalente posteriormente.

### Privacidade e limpeza do experimento

Textura QR carregada na cena virtual; orientação/posição ajustadas pelo controle
local do emulador. Houve enquadramentos incompletos/fora da cena antes do decode:
frames sem QR não são sucesso. A prova final foi câmera → decode → JS exato.
Nenhum buffer foi injetado no decoder nem string usada como resultado nativo.

APK temporário desinstalado. Texturas wall/table restauradas aos defaults,
velocidade virtual zerada, posição retornada à origem e rotação relativa desfeita.
Wi-Fi/dados restabelecidos (1/1); sem cliente ativo de câmera ao final.
Capturas técnicas da cena não entram no PR; arquivos temporários do AVD foram
removidos. A fixture PNG e logs de teste sem dados pessoais ficam removíveis em
/tmp/qr-g2; não são dependência do documento.

| Artefato local | SHA-256 |
|---|---|
| payload.txt | 7bd9c60e60a20e9739336062c16cd953d29c9c698a53f3e23c648a0a7a97377d |
| reference.png | d56b3c5bc1f0a778477a7e2d0dfa409626d4f07e1b35dadafc8035491e38a7b8 |
| evidence.log | 99224916cb47e679f94c2c1ae9a8ee1114692ee4f13064e44226645d3dead28c |
| offline.log | 7c541b337d51984f2ca5bb3aec1df8feb15d2a170656818864e857b63a4a1a2d |
| build-final.log | 0cc95c62fd728ce01a6ca59d92878918657878420adcbcab0b7540daacd664d5 |
| app-debug.apk | d36d22f420b9e99946237a09338dd43142ccf84850d7a61b3f99e42b65257f6d |
| app-release.apk | 449749d5c6d6d06e236ed052f242e7ac6cac5b947eabdacb1fa2617e950d48b5 |
| specs/NativeQrGate.ts | 1b1dec543f759526e289e40454531570f94a229c0db0de7e719d35709c95b3f0 |
| QrProbeActivity.kt | 97275e91b4a5dbf6d7f4937171cd368777d321dfcc0ecd9a01c5301d1d5265a1 |
| QrGateModule.kt | 8d236c849b5fd56e2b3cf7a4366aebe55ce863822ec3c21284b02b0e4e724707 |

## 4. Arquitetura mínima proposta

Toque “Escanear QR Code” no formulário existente → CAMERA contextual →
Activity scanner/PreviewView CameraX → ImageAnalysis → ZXing (somente QR_CODE)
→ payload textual em memória → parser estrito → ExternalTaskDraft →
NewTaskScreen editável → revisão → Salvar explícito → addTask existente.

Uma Activity Android dedicada aberta por TurboModule evita criar Native View
Fabric só para esse recorte. O PreviewView fica dentro da Activity; somente
payload/erro/cancelamento cruza a ponte. Sem frames em JS, Native View custom
ou frame processor Worklet. Se for escolhida preview embutida no RN, será outra
arquitetura e deverá provar Fabric/Codegen e lifecycle antes de avançar.

Spec Codegen proposto: startScan(sessionId): Promise<string>,
cancel(sessionId): Promise<void>; capabilities se necessário.
Uma Promise por sessão, retorno terminal único. Eventos de status apenas se
necessários, tipados com sessionId; não expor stream de frames ao JS.
Registrar/remover ActivityEventListener e invalidar pending Promise no dispose.
Integração usa o padrão de TurboModule existente no projeto, com main thread
para câmera/UI e worker limitado para decode.

### Permissão e fallback

CAMERA declarada no Manifest, feature opcional, permissão solicitada somente
ao escanear. Negação mantém o formulário manual e os campos já digitados.
Primeira negação pode apresentar justificativa; bloqueio permanente oferece
Configurações somente por ação explícita, sem loop de prompts.
Rationale=false sozinho não distingue primeira solicitação de bloqueio:
considerar histórico de solicitação e resultado.

Revalidar permissão e disponibilidade ao retornar. Revogação encerra sessão,
não preserva acesso autorizado por memória. Câmera ausente/ocupada ou erro do
provider gera mensagem e retry explícito; não bloquear criação manual.
Não competir continuamente com outro app pela câmera.

### Privacidade

Processar Y-plane/frame localmente; sem HTTP, upload, foto, galeria, arquivo,
snapshot, log de conteúdo pessoal ou cache de imagem. Fechar cada ImageProxy
em finally e descartar buffers após decode/cancelamento.
Após leitura, conservar apenas payload textual e rascunho em memória até
confirmação/cancelamento. O log do spike contém somente fixture pública QA66;
produto não deverá registrar payloads reais. source/rawPayload não vão ao banco.

## 5. Payload candidato — requer revisão

Formato conceitual, não contrato definitivo publicado:

```json
{
  "version": 1,
  "title": "Comprar material",
  "description": "Buscar na loja",
  "startDate": "2026-11-19",
  "dueDate": "2026-11-20",
  "priority": "high"
}
```

Whitelist de chaves: version/title/description/startDate/dueDate/priority.
Não aceitar projectId, nomes de projeto como autoridade, IDs de Task,
status, recorrência, lembretes, URLs de ação ou campos de integração.
Project é o já selecionado no formulário, validado contra Projects hidratados
por ID canônico; se ausente/inválido, exigir seleção manual.

Validação proposta:

1. Máximo **2048 bytes UTF-8** antes de JSON.parse; rejeitar vazio/excesso,
   sem truncamento ou descompressão. Limitar também antes de cruzar a ponte.
2. JSON objeto raiz, não null/array; version obrigatório, inteiro exatamente1.
3. Chaves desconhecidas, duplicadas e perigosas (__proto__/constructor/prototype)
   rejeitadas. JSON.parse sozinho não detecta duplicação: prever leitor/tokenizador
   limitado que sinalize chaves repetidas, sem regex improvisada sobre JSON.
4. title obrigatório string trim de 1–120 caracteres; description opcional string
   até1000; sem coerção de números/booleanos/objetos ou null como vazio.
5. startDate/dueDate opcionais: strings YYYY-MM-DD, data gregoriana real, incluindo
   anos bissextos; não aceitar normalização automática de 31/02, timezone ou horário.
   startDate<=dueDate se ambos presentes; datas ausentes preservam valores visíveis.
   A regra canônica sobre datas passadas e prazo/início continua válida no formulário.
6. priority opcional, somente low/medium/high; ausência preserva valor atual.
7. Construir draft novo campo a campo, sem spread/merge arbitrário no estado.
   Campos são texto literal em TextInput, sem HTML, eval, WebView ou auto-link.
   Não abrir URL/deep link nem executar comando; JSON válido não é autorização.

## 6. Contrato ExternalTaskDraft e formulário

```ts
type ExternalTaskDraft = {
  source: 'qr'; // discriminador apenas em memória; ampliar só quando necessário
  rawPayload?: string; // memória temporária, remover após aplicação/cancelamento
  title?: string;
  description?: string;
  startDate?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  warnings: string[];
};
```

Parser independente do scanner, puro/testável, retorna sucesso com draft ou erro
estruturado; não importa addTask. Compartilhável futuramente com voz/OCR,
sem criar framework ou depender da #65 para entregar QR.
Reutilizar [NewTaskScreen](../../src/screens/NewTaskScreen.tsx) e
[TaskContext/addTask](../../src/context/TaskContext.tsx); nenhum segundo CRUD,
endpoint, tabela ou migration. Nenhuma coluna source=qr.
Aplicar rascunho somente após confirmação de uso da leitura, preservando edição
anterior ou pedindo confirmação para sobrescrever. Formulário final continua
editável; Salvar passa por validações e lock canônicos.

## 7. Duplicação e lifecycle

Uma sessão ativa identificada por sessionId/generation; lock antes de abrir
permissão/scanner, segundo toque não abre outra Activity.
KEEP_ONLY_LATEST e um worker evitam fila ilimitada. Converter Y-plane respeitando
rowStride/pixelStride/rotation/crop; sempre fechar ImageProxy.

Após QR válido, consumir resultado por compare-and-set, pausar/unbind scanner e
esperar decisão do usuário; só um draft. Callback duplicado/tardio ou de geração
antiga é descartado. QR inválido apresenta erro e retry explícito, sem inundar
mensagens por frame. Nunca chamar addTask a partir de callback.

Blur/background/navegação/cancelamento: invalidar geração antes de clearAnalyzer,
unbind e liberar executor/listener. Foreground não deve reabrir captura
automaticamente; verificar permissão e exigir retomada explícita.
Rotação/recriação cancela a sessão ou mantém estado consumido de forma controlada,
sem reprocessar o mesmo resultado; escolha final deve ter teste.
No scanner nativo, onPause/onDestroy fazem cleanup idempotente; React host também
deve cancelar pending sessão quando sair da rota ou invalidar o módulo.
Salvar duas vezes usa o lock existente; final de scanner nunca significa salvar.

## 8. Erros, acessibilidade e testes futuros

| Caso | Mensagem proposta / ação |
|---|---|
| Texto comum/QR vazio/JSON inválido | “Este QR não contém dados de tarefa válidos.”; tentar novamente |
| Versão desconhecida | “Versão de QR não suportada.”; manual/retry |
| Payload grande | “Este QR excede o tamanho permitido.”; não truncar |
| Campos obrigatórios ausentes/tipo incorreto | Informar campo inválido; nenhum draft parcial silencioso |
| Campo extra/ID externo/chave duplicada | “Este QR contém campos não suportados.”; rejeitar |
| Data/prioridade inválida | Mensagem específica e novo scan/manual; nada salvo |
| Câmera negada/bloqueada/revogada | Explicar permissão, oferecer manual/Configurações contextual |
| Câmera ausente/ocupada/erro | “Câmera indisponível. Você pode digitar a tarefa.” |
| Decoder sem leitura/QR ilegível | Feedback estável, orientação de enquadramento e tentar novamente |
| Cancelamento | Voltar ao formulário anterior sem limpar campos ou criar Task |

Botão com accessibilityLabel “Escanear QR Code”, instrução textual, feedback
“QR lido, revise os dados”, erro anunciado sem depender só de cor. Alternativa
manual sempre disponível; não anunciar a cada frame.

Testes planejados: payload válido/exato; vazio/texto/JSON inválido; versão/tipos;
limite em bytes inclusive UTF-8 multibyte; campos extras/chaves duplicadas;
datas impossíveis/bissextos/ordem/fuso e prioridade; projeto arbitrário rejeitado;
parser não executa URL/HTML/código; permissão negada/bloqueada/revogada;
câmera ausente/ocupada; múltiplos frames/callbacks/duplo toque; rotação/retorno;
cancelamento preserva campos; confirmar aplica draft e Salvar chama addTask uma
única vez. Regressões de formulário, Projects, Home/calendário e sync quando aplicável.

## 9. Decisão, Poker, Sprint e plano

**G2 = GO COM RESTRIÇÕES.** A solução candidata comprovou câmera, decode
controlado, payload exato, retorno JS/Hermes, lifecycle mínimo, permissões e
builds debug/release com as dependências. A operação offline foi comprovada no
AVD. Isso permite considerar #66 candidata tecnicamente viável para implementação
prioritária, **após revisão das restrições e autorização**, sem início automático.

Restrições exatas:

1. Evidência de execução restrita a Android16/API36/x86_64 em AVD. arm64 e API24
   têm prova de build/compatibilidade de Manifest, mas não execução real.
   Antes de alegar qualidade em campo, validar dispositivo físico, foco/luz,
   orientação, desempenho e demais versões Android suportadas.
2. Payload/limites e contrato ExternalTaskDraft são propostas para revisão.
   Parser seguro, formulário, confirmação e addTask não foram implementados,
   testados ou dados como Done neste gate.
3. Lifecycle comprovado é mínimo: background/retorno/cancelamento. Produção
   precisa de retomada explícita, cancel de rota/módulo, tratamento de câmera
   ocupada, revogação durante captura, rotação/recriação e callbacks concorrentes.
   O spike não substitui os testes de T05/T07/T08.
4. Prova vale para CameraX1.5.3 + ZXing core3.5.4 e Activity Android com
   TurboModule/Promise. Outra versão, Native View Fabric ou outra biblioteca
   exige validação própria. Preservar avisos Apache/BSD e revisar manutenção
   limitada do ZXing e dependências antes da adoção definitiva.

**Risco residual médio**, sobretudo integração ao formulário, lifecycle e
diversidade Android; o risco de viabilidade câmera/decode/ponte diminuiu com a
prova real. Não há motivo técnico observado para backend/migration.

Como a Sprint já está em andamento até 27/11 e #65 segue G1 NO-GO,
recomenda-se priorizar a decisão de implementação da #66 e reavaliar rapidamente
Goal/capacidade dos **21 pontos originais**. O G2 aprovado com restrições não
recupera os 8 pontos bloqueados da voz nem garante o core inteiro.
Nenhuma substituição automática de Issue; nenhuma implementação funcional iniciada.

**Recomendação preliminar: manter 8 pontos**, condicionada ao gate e à gramática
restrita de JSON; câmera/bridge, permissões/lifecycle, parser, integração, QA e
acessibilidade cabem no recorte, sem backend/migration. Se exigir Native View
Fabric, leitura contínua/lote, suporte ampliado ou decoder alternativo, reestimar
antes de autorizar; não editar a Issue automaticamente.

| Bloco futuro | Entrega |
|---|---|
| T01 — câmera/permissões | Manifest opcional, preview e estados de acesso |
| T02 — decoder QR | ZXing somente QR_CODE, frames locais e resultado único |
| T03 — parser versionado | Contrato revisado, whitelist/limites/tipos/datas |
| T04 — ExternalTaskDraft/formulário | Rascunho editável, Project por ID, addTask apenas no Salvar |
| T05 — lifecycle/concorrência | Sessão única, cancel/cleanup e descarte de callbacks antigos |
| T06 — segurança/acessibilidade | Conteúdo inerte, erros compreensíveis, TalkBack/manual |
| T07 — testes automatizados | Parser, controller, formulário e regressões/CI |
| T08 — Android manual/limpeza/documentação | Matriz Android, evidências, remover QA66 e atualizar rastreabilidade |

São blocos para revisão, sem Issues técnicas criadas ou autorização automática
de execução. Nenhuma Task criada no gate. Na futura implementação, toda Task
QA66 deve ser removida antes do merge, com IDs registrados e verificação de
Home/calendário/API sem resíduo; preservar dados anteriores e history.
Home zerada é referência informada, não inferida do spike isolado.

## 10. Implementação funcional — 17/11/2026

Implementação explicitamente autorizada após integração do G2 pelo PR #71.
Base dev limpa/atualizada em `ddf4fb78a51c8abd2a3cadd0a5d1063ed195376e`.
Somente #66; #65/G1, #67, #68 e #43 não alteradas.
Planning Poker mantido em **8 pontos**. Não é declaração de Done.

### Dependências efetivas e arquitetura

Em android/app/build.gradle, versões fixas:

- androidx.camera:camera-camera2:1.5.3;
- androidx.camera:camera-lifecycle:1.5.3;
- androidx.camera:camera-view:1.5.3;
- com.google.zxing:core:3.5.4;
- JUnit4.13.2 somente para testes JVM.

Sem mudança de pacote npm, backend, endpoint ou migration. Avisos Apache-2.0 e
BSD/libyuv incluídos em assets/qr-third-party-notices.txt dentro do APK.
Não houve troca para CameraX1.6.x.

NativeQrScanner é um TurboModule com spec TypeScript/Codegen:
startScan(sessionId): Promise<string> e cancel(sessionId): Promise<void>.
String vazia representa cancelamento normal, não QR válido.
QrScannerActivity é não exportada, usa PreviewView/CameraX ImageAnalysis e
worker único com KEEP_ONLY_LATEST. Preferência pela traseira; frontal disponível
como fallback quando não houver traseira.
QrFrameDecoder habilita **somente QR_CODE**, copia luminância respeitando
rowStride/pixelStride/crop/posição do ByteBuffer e fecha ImageProxy em finally.
Não envia frames ao JS.

ScanSessionStore entrega um terminal por ID. Registro nativo associa Activity
por referência fraca; cancel, geração antiga, Activity duplicada e dispose não
podem entregar resultado à sessão nova. O controller JS invalida o ID antes
do cancel nativo; a UI também invalida a geração ao sair da rota/desmontar.

O teste real revelou que resolver a Promise durante finish da Activity do
scanner podia perder o diálogo de confirmação. A entrega foi corrigida para
aguardar onHostResume da Activity React, mantendo lock até o terminal entregue;
destroy/cancel descarta resultado pendente. O cenário foi repetido no AVD.

### CAMERA, lifecycle e falhas

Manifest declara CAMERA e câmera/autofocus como features opcionais.
Nenhuma solicitação ao iniciar app ou NewTaskScreen. Somente a ação “Escanear
QR Code” verifica novamente a permissão e solicita quando necessário.
Negação mantém manual; bloqueio não repete prompts em loop e oferece
Configurações somente por ação explícita. Concessão nas Configurações é
revalidada; revogação é checada antes de abrir e novamente na Activity.

Perda de foco, onPause, rotação/recriação e onDestroy encerram a captura,
clearAnalyzer/unbind e invalidam sessão. Não retoma automaticamente no
foreground. A pausa da ReactActivity causada pelo próprio scanner não é
confundida com navegação para outra rota; a Activity scanner controla o
background, enquanto blur/unmount da rota cancela pelo JS.
Provider ausente, câmera inexistente/ocupada, bind/analyzer com falha e permissão
revogada retornam mensagem compreensível; cancelamento retorna normalmente.
Novo start é recusado se o host não estiver retomado.

### Payload V1 efetivo

Schema formal no tipo StructuredQrV1, whitelist QR_V1_FIELDS, constantes de limite
e validação runtime em [structuredQr.ts](../../src/domain/structuredQr.ts).

```json
{
  "version": 1,
  "title": "Comprar material",
  "description": "Buscar na loja",
  "startDate": "2026-11-20",
  "dueDate": "2026-11-20",
  "priority": "medium"
}
```

| Campo/regra | Política implementada |
|---|---|
| Payload | máximo2048 bytes UTF-8; vazio/excesso rejeitado antes de parse profundo |
| JSON | objeto raiz; não array/null/texto comum; sintaxe JSON válida |
| Chaves | whitelist exata; desconhecidas/internas/de autoridade rejeitadas |
| Duplicatas | scanner léxico de strings/profundidade detecta chaves raiz repetidas, inclusive escapadas; sem regex sobre JSON |
| version | obrigatório, número exatamente1; ausente/futuro rejeitado |
| title | obrigatório, string com trim, 1–120 unidades UTF-16; inválido rejeita leitura |
| description | opcional string, até1000 unidades UTF-16; trim; tipo/excesso rejeita leitura |
| startDate/dueDate | opcionais YYYY-MM-DD, data gregoriana real, sem horário/fuso; inválida/passada omitida com warning |
| Ordem das datas | se ambas vierem invertidas, omitir ambas e avisar; não corrigir silenciosamente |
| priority | opcional low/medium/high; desconhecida omitida com warning, preservando prioridade atual |
| Project | não permitido no QR; preservado/selecionado pelo ID canônico do formulário |

Os limites de título/descrição são limites adicionais da importação QR, sem
alterar o requisito ou as validações canônicas existentes. O título continua
obrigatório ao salvar. Datas civis são convertidas localmente, sem parse UTC
ou soma de24h. Se a combinação com datas já presentes no formulário ficar
inválida, preservar as datas atuais e mostrar aviso, sem ajustar prazo/início.

Esta decisão refina a proposta original: datas/prioridade inválidas permitem
**draft parcial com warnings**, conforme autorização da implementação;
versão/estrutura/título/descrição inválidos e campos extras rejeitam a leitura.
Todos os campos válidos continuam sujeitos à revisão e validação canônica.

### ExternalTaskDraft e NewTaskScreen

[ExternalTaskDraft](../../src/models/externalTaskDraft.ts) contém somente
título/descrição/datas/prioridade opcionais e warnings; sem source no banco,
rawPayload, Project ou qualquer autoridade interna.
Parser puro não importa API/storage/addTask.

[TaskQrImport](../../src/components/TaskQrImport.tsx) acrescenta botão e feedback
ao formulário existente. Após leitura válida, exige **“Usar dados”** antes
de substituir campos correspondentes, inclusive os já preenchidos. Cancelar
essa confirmação preserva a edição anterior. Campos ausentes/omitidos preservam
valores atuais. Projeto, horário, status, recorrência, lembretes e subtarefas
não são importados nem alterados pelo QR.

Depois de aplicar, a pessoa pode editar/apagar/corrigir ou sair pelo Cancelar.
**Só o botão canônico “Criar tarefa” de NewTaskScreen chama addTask**, mantendo
Context → serviço HTTP → API → SQLite existentes.
Ler QR ou confirmar uso do rascunho nunca cria Task.
O botão de criação fica indisponível enquanto a leitura/confirmação está pendente.

### Privacidade e acessibilidade

Sem upload, arquivo de foto/frame, galeria, QR bruto em storage/backend ou log
de payload. Apenas texto temporário cruza a ponte e é transformado em draft;
conteúdo ativo permanece texto inerte, sem URL/deep link/HTML/JavaScript executado.
Avisos de erro não incluem o payload bruto.

Botão RN com accessibilityLabel/Role/Hint/State; feedback textual com live region;
scanner com instrução textual, título acessível e botão nativo Cancelar de pelo
menos48dp. API de heading usa ViewCompat para respeitar minSdk24.
Criação manual disponível sem câmera; mensagens não dependem apenas de cor.

### Verificações automatizadas

| Verificação | Resultado |
|---|---|
| Mobile test:ci-scripts | 17 validadores aprovados |
| Mobile test:ci | 821 testes / 42 suítes aprovados |
| Mobile typecheck:ci | 11 diagnósticos conhecidos; nenhuma regressão |
| Mobile lint:ci | 3 erros/7 warnings conhecidos; sem novos diagnósticos |
| JVM nativo | 5 testes / 2 classes aprovados: QR real UTF-8, plano com stride/crop/padding, orientação, rejeição de linear/blank e terminal único concorrente |
| Backend typecheck, test e build | aprovados; 479 testes / 17 suítes; sem mudança de backend |
| assembleDebug/assembleRelease | aprovados com dependências reais, Codegen/New Architecture/Hermes, x86_64 e arm64-v8a empacotados |
| git diff --check / links locais | verificados antes do commit |

ESLint ignora somente android/**/build/**, pois os novos testes JVM geram
relatórios HTML com JS que não é código de produto. Nenhum baseline ampliado.
O teste de URL hostil contém supressão localizada e explicada de no-script-url
somente na fixture textual, nunca em execução de conteúdo.

Cobertura nova: V1/opcionais, JSON/texto/vazio/versões, UTF-8 e limites,
campos internos/desconhecidos/duplicados, datas/prioridades/warnings; sessão
concorrente, cancel e resultado tardio; UI sem prompt ao abrir, negação,
Configurações explícitas, confirmação/edição, preservação de Project, retry,
blur e chamada canônica única após botão de criação.

### Android automatizável e massa QA

Validação automatizada do app real no Pixel_7/API36/x86_64; **não equivale à
aprovação manual da usuária**. AVD existente iniciado sem wipe de dados.
Fixtures conhecidas de QR ficam apenas no host/cena virtual em /tmp/qr66-qa.
Não são arquivos no armazenamento do app e não entram no APK.

Nenhuma Task QA66 foi criada; o roteiro automatizado parou antes do botão
“Criar tarefa”. O rascunho transitório foi descartado ao sair da tela.
Consultas GET da API antes e depois: **zero Tasks, nenhuma QA66**.

| Cenário automatizado no app real | Resultado observado |
|---|---|
| Abrir app/Nova Tarefa | Nenhum prompt CAMERA ao abrir; ação QR visível |
| Negar CAMERA | Mensagem compreensível e formulário manual preservado |
| Conceder e ler fixture | Preview CameraX, decode local e diálogo “Usar dados do QR Code?” após retorno |
| Aplicar e editar | Título QA66 QR, descrição e prazo20/11 preenchidos; título editado para QA66 edited; nenhum Save |
| Cancelar nova importação | Campos editados preservados, sem sobrescrita |
| Versão99 | Mensagem “Versão de QR Code não suportada”, sem aplicar draft |
| Background/foreground | Câmera liberada; formulário retomado com campos preservados e sem reabrir scanner |
| Cancelar scanner | Retorno normal ao formulário, sem erro de cancelamento |
| Limpeza | Rascunho descartado, Home zerada, GET/tasks vazio e Active Camera Clients=[] |

A troca de textura na cena virtual pode manter um primeiro frame da imagem
anterior; a prova da versão inválida foi feita após renovar os frames com a
preview ativa e reenquadrar a fixture. Não foi tratada string mockada como decode.
Texturas e pose da câmera virtual foram restauradas. O AVD ficou preparado
com APK debug e Metro existente, na Home sem QA. **Android manual PENDENTE.**

Limitações preservadas: arm64 compilado/empacotado, sem aparelho físico;
API24 sem AVD disponível (apenas Pixel_7/API36 configurado), sem smoke executado.
O release mantém a política existente de cleartext=false e API de desenvolvimento
HTTP10.0.2.2:3000; a Home reportou erro de conexão nesse modo. Não foi alterada
a política de rede/backend para ampliar escopo. No debug, com cleartext=true
já existente, a Home consultou a API e mostrou “Nenhuma tarefa cadastrada”.
Leitura/preenchimento local
não dependem de rede; persistência real/Home/calendário ainda exigem validação
manual no ambiente de desenvolvimento/API alcançável, sem declarar aprovação.

### Roteiro Android manual da usuária — todos PENDENTES

| Passo | Verificação |
|---|---|
| T01 | Abrir Nova Tarefa; nenhum prompt CAMERA ao abrir |
| T02 | Tocar Escanear QR Code |
| T03 | Conceder CAMERA no contexto do uso |
| T04 | Ler QR V1 válido conhecido; nenhuma criação automática |
| T05 | Confirmar uso dos dados e conferir campos/Project |
| T06 | Editar campo importado e conferir valores finais |
| T07 | Tocar Criar tarefa uma única vez, com API alcançável |
| T08 | Confirmar persistência, Home/calendário e reentrada |
| T09 | Ler QR inválido, versão futura, dados inválidos e campos extras |
| T10 | Cancelar scanner/confirmacão; preservar campos anteriores |
| T11 | Negar/bloquear/revogar CAMERA; manual continua disponível |
| T12 | Background/foreground/foco/rotação/reentrada, sem reabrir captura ou duplicar |

**Antes do merge futuro:** remover qualquer Task/reminder QA66 criada pela
validação manual, registrar IDs, conferir Home/calendário/API sem resíduos,
preservar Tasks reais e history; nenhum arquivo QR técnico persistido no app.
Não marcar esta matriz como aprovada por causa de Jest/JVM/automação ADB.
Sem merge automático ou fechamento da #66 nesta execução.

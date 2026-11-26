# Issue #67 — atalho Android e Gate G3

**24/11/2026 · G3 = GO COM RESTRIÇÕES.** Refinamento técnico da [Issue #67](https://github.com/AlineRaquelC/gestor-diario/issues/67), PBI-27 e RF73, 3 pontos. O atalho abre o formulário existente. A implementação funcional e a validação manual final em Android físico ficam para a etapa seguinte.

## Base e ambiente

- `dev` limpa e sincronizada em `091077afdc67229ae4fae6d9da9757fb6a6c6da7`.
- React Native 0.87.1, New Architecture e Hermes ativos. minSdk 24, targetSdk 36, compileSdk 37. `MainActivity` é `singleTask`. A rota inicial é `Login` e a rota de criação é `NovaTarefa`.
- `ProjectProvider` envolve `TaskProvider`, que envolve o navegador. A tela usa o projeto `Geral` ou o primeiro projeto pelo ID resolvido no estado existente.
- AVD Pixel_7, Android 16/API 36, x86_64, Pixel Launcher (`com.google.android.apps.nexuslauncher`). Sem telefone, AVD API 24 ou AVD API 25.
- Spike em cópia removível do app, com applicationId `gate.shortcut.g3`. Nenhum código do spike integra este PR documental.

## Alternativas e compatibilidade

| Opção | API 24 | API 25 | API 26+ | Cold/warm e manutenção |
|---|---|---|---|---|
| Static, via XML | Sem suporte | Launcher compatível exibe no ícone | Disponível em launcher compatível | Publicação simples. O primeiro intent recebe `NEW_TASK` e `CLEAR_TASK`; apontar direto para MainActivity pode destruir o estado warm. Preservá-lo exigiria Activity intermediária. |
| Dynamic, via `ShortcutManager.addDynamicShortcuts` | Retornar antes de chamar a API | Disponível no menu do ícone em launcher compatível | Mesmo fluxo, com opções de fixação conforme o launcher | Um ID estável e intent explícito, com controle de flags, dão suporte a cold e warm. Publicar com parcimônia e tratar limite de chamadas, falha de publicação ou indisponibilidade. |
| Pinned, via `requestPinShortcut` | Sem API nativa de pin | Sem API nativa de solicitação de pin | Requer `isRequestPinShortcutSupported` e confirmação do usuário | Usa o mesmo intent cold/warm. Adiciona pedido, tratamento da recusa e manutenção do ícone fixado. O retorno do pedido não é confirmação de que foi fixado. |

Escolha para o recorte: **um atalho dinâmico “Nova tarefa”**, publicado no ícone do app via API nativa, com possibilidade de fixação oferecida pelo launcher. A solução dispensa solicitação de pin pelo app, biblioteca adicional e permissão runtime. Remoção do atalho, launcher sem superfície compatível ou API abaixo de 25 deixam a criação manual disponível. A API 25 oferece o atalho no menu do ícone, sem promessa de pin direto pelo app.

Fontes: [gerenciamento de atalhos e flags](https://developer.android.com/develop/ui/compose/system/shortcuts/managing-shortcuts), [ShortcutManager](https://developer.android.com/reference/android/content/pm/ShortcutManager), [criação e pin](https://developer.android.com/develop/ui/compose/system/shortcuts/creating-shortcuts).

## Contrato de entrada e navegação

1. O atalho envia um `ACTION_VIEW` explícito para `MainActivity`, com destino fixo e flags `CLEAR_TOP | SINGLE_TOP`. O Kotlin aceita somente a ação e o URI exatos, sem payload de Task ou Project e sem intent-filter público para o esquema.
2. No cold start, a Activity normaliza a solicitação antes de iniciar o RN. No warm start, `onNewIntent` atualiza o intent da mesma Activity e delega a `super`. Cada acionamento aceito recebe ID de entrega gerado pelo app.
3. React Native usa `Linking.getInitialURL()` para bootstrap e `Linking.addEventListener('url', ...)` para warm. O intent mais recente fica na Activity para cobrir entrega antes de o listener estar pronto. Na retomada, JS também pode consultá-lo. O ID impede que consulta inicial, retomada e evento consumam o mesmo acionamento mais de uma vez.
4. O navegador retém uma solicitação até `onReady`, `projects.hydrated` e `!tasks.loading`. O estado de hidratação vem dos Contexts, sem temporizador nem segunda consulta. Em cold start, o Login atual é visual e a prova monta Home → NovaTarefa, permitindo voltar à Home. Em warm start, abre o formulário sobre a rota atual. Se o formulário já estiver no topo, consome a solicitação preservando o rascunho. Se a rota está abaixo de outra na pilha, o spike tem um caminho para voltar à instância existente com `popTo`. Esse caminho específico ficou sem teste em runtime.
5. O atalho não executa `addTask`, não cria projeto, e não preenche título ou outros campos. A tela continua usando o botão Criar tarefa e suas validações atuais.

Configurar apenas a árvore declarativa de linking do React Navigation seria curto, mas não proveria, por si só, a barreira dos Contexts nem a política de duplicação. Um TurboModule de caixa de entrada daria controle explícito, mas acrescentaria um contrato e Codegen sem necessidade observada no caminho com Linking. O reconhecimento do URI serve apenas para navegação, sem autoridade de gravação.

## Hidratação e recuperação

`ProjectProvider` carrega o AsyncStorage e encerra a tentativa informando `hydrated` e `readError`. O `TaskProvider` hidrata o cache e executa a carga inicial remota. Seu `loading` volta a falso inclusive em falhas. A barreira usa ambos os Contexts e deixa a validação canônica do envio no formulário. Cache de projetos ilegível precisa de retorno compreensível para a navegação normal. Uma lista válida vazia mantém a seleção/criação manual de Project existente no formulário. Na implementação, evitar replay após recriação e manter a deduplicação com memória limitada.

## Evidência do spike

O release com bundle Hermes foi instalado sem Metro. O Pixel Launcher exibiu
“Nova tarefa” no menu do ícone do spike e o Android confirmou o ID dinâmico
`new-task`. Os acionamentos abaixo foram feitos pela interface do launcher.
ADB ajudou a operar e observar a interface, sem substituir o atalho por
intents injetados.

| Teste | Resultado | Evidência |
|---|---|---|
| G3-T01 — cold start | PASS | Processo encerrado antes do toque. A Activity recebeu o intent inicial, JS enfileirou a ação e consumiu após a barreira dos Contexts, partindo de Login. Abriu NovaTarefa. |
| G3-T02 — warm na Home | PASS | A mesma Activity recebeu o intent e JS abriu NovaTarefa a partir de Home. |
| G3-T03 — warm em outra rota | PASS | Do calendário, o atalho abriu NovaTarefa. Cancelar voltou ao calendário. |
| G3-T04 — repetição | PASS | Dois novos acionamentos com o formulário aberto preservaram o título digitado. Um único Cancelar voltou à Home. O dumpsys mostrou um único ActivityRecord e o log repetiu a mesma identidade de Activity. |
| G3-T05 — cancelar/voltar | PASS | Cancelar após cold start voltou à Home. No warm, preservou a rota anterior. |
| G3-T06 — reentrada | PASS | Após cancelar, novo toque no launcher abriu novamente o formulário. |
| G3-T07 — Projects | PASS | O consumo cold registrou sete projetos após prontidão. O formulário exibiu Geral selecionado. |
| G3-T08 — criação automática | PASS | Nenhum envio pelo formulário. A API retornou uma lista vazia antes e depois e os projetos remotos ficaram iguais. |
| G3-T09 — API/launcher sem suporte | NÃO TESTÁVEL para API antiga/launcher incompatível | Somente API 36 com Pixel Launcher disponível. O cenário de remoção passou: após limpar os atalhos do pacote isolado, o formulário manual continuou abrindo. Recusa de pin não se aplica à estratégia dinâmica. |

O cold start registrou a ação na Activity antes da fila JS. A fila foi
consumida cerca de 2,4 segundos depois, já com sete projetos e a carga inicial
de Tasks encerrada. Esse intervalo é uma observação do teste, sem configurar
uma espera no app. Nos cinco acionamentos warm, todos os eventos chegaram à
mesma instância da Activity e tiveram um consumo JS por acionamento.

## Builds e limites da decisão

`assembleDebug` e `assembleRelease` passaram com o spike Android em Kotlin,
New Architecture e Hermes ativos. Codegen da base foi executado. A prova
usou o Linking existente e dispensou um spec novo. Ambos os APKs empacotaram
x86_64 e arm64-v8a. O release rodou em x86_64 com bundle embutido.
ARM físico e API 24/25 permanecem sem execução.

A guarda de API preserva minSdk 24. A publicação começa na API 25 e a
visibilidade depende do launcher. Ficam para a implementação a validação
manual final em Android físico, o teste de launcher incompatível ou API
antiga quando disponíveis e os testes de restauração de Activity e falha de
hidratação. A integração técnica está apta a avançar sob essas restrições.

O pacote experimental foi desinstalado, a Home de apresentação ficou limpa,
Tasks QA e Projects QA ficaram em zero e a cópia temporária foi descartada.

## Plano do recorte funcional

1. Publicar o atalho dinâmico com ID estável, guarda de API e tratamento de indisponibilidade. Preservar o launcher e a criação manual.
2. Reusar Linking e os Contexts, com retenção até prontidão, consumo único e preservação de rascunho. Validar restauração de Activity, retorno e erro de hidratação.
3. Cobrir publicação, ausência/remoção, intents repetidos e navegação com testes. Gerar debug e release e repetir o roteiro manual em dispositivo Android físico antes do merge funcional.

A #65 segue bloqueada pelo G1. A #68 continua responsável pela consolidação final.

## Implementação funcional — 26/11/2026

PBI-27 · RF73 · [Issue #67](https://github.com/AlineRaquelC/gestor-diario/issues/67) · 3 pontos.
Branch `feature/67-android-task-shortcut`, a partir de `dev` em `5d3a69c`.

### Arquitetura e critérios de aceite

- Kotlin publica um atalho dinâmico “Nova tarefa” (`new-task`) a partir da API
  25, consultando antes os atalhos já habilitados, a capacidade e o limite de
  publicação. Serviço ausente, falha ou limite deixam o fluxo manual disponível.
- O launcher envia `ACTION_VIEW` e `gestordiario://shortcut/new-task` a
  `MainActivity`, com `CLEAR_TOP | SINGLE_TOP`. A Activity permanece
  `singleTask` e o esquema permanece sem filtro público. A validação é literal.
  A Activity encaminha ao RN uma URL interna com um contador por processo, sem
  extras ou dados de Task/Project. Na recriação, o Bundle só recupera o mesmo
  ID do processo atual. A restauração de fragments usa a factory do
  react-native-screens já distribuído com o app.
- O listener de Linking, a consulta inicial e a consulta na retomada retêm o
  último acionamento. A navegação espera `onReady`, `projects.hydrated` e
  `!tasks.loading`. Um único número em memória registra até onde os acionamentos
  foram consumidos. O Login visual permite a pilha Home → NovaTarefa para essa
  entrada específica. Em warm, o navegador preserva a rota de origem e usa
  `popTo` para a instância já existente abaixo do topo.
- Erro de leitura dos Contexts exibe um alerta e mantém a rota atual. Uma lista
  válida vazia abre o fluxo existente de seleção/criação manual de Project. O
  atalho não grava dados. Só “Criar tarefa” executa o `addTask` canônico.
- Revisão e validação manual em Android físico estão pendentes. A Issue
  permanece aberta e a validação física é obrigatória antes do merge.

### Testes e builds

| Verificação | Resultado |
|---|---|
| Validadores dos scripts CI | 17 aprovados |
| Mobile Jest | 828 testes em 43 suítes |
| Backend | Migrações em SQLite temporário, typecheck, 479 testes em 17 suítes e build aprovados |
| JVM Android | 10 testes em 3 suítes, incluindo 5 do atalho |
| Lint Mobile | 10 diagnósticos conhecidos de 13 no baseline, sem regressão |
| Typecheck Mobile | 11 diagnósticos conhecidos de 11 no baseline, sem regressão |
| Gradle / diff | `assembleDebug`, `assembleRelease`, `:app:testDebugUnitTest` e `git diff --check` aprovados |

RN 0.87.1, New Architecture, Hermes e Codegen existente no grafo do Gradle.
O APK informa minSdk 24 e contém arm64-v8a, armeabi-v7a, x86 e x86_64.
O release usa a assinatura de desenvolvimento vigente. O APK foi inspecionado
com `aapt` e `apksigner`, instalado no AVD e executado com bundle embutido.

- Variante `release`, 71.417.168 bytes, sem Metro.
- Caminho local absoluto `/home/aline/Área de trabalho/DispositivosMoveis/GerenciadorTarefas/android/app/build/outputs/apk/release/app-release.apk`.
- SHA-256 `d44573682636491b5db8d720824ce8e12df223f8ba2ebe3b428c925f543ae1f4`.

### Roteiro em Android físico — pendente

1. Instale o APK release de teste. Em USB com depuração habilitada, use
   `adb install -r /caminho/do/app-release.apk`. Abra o app uma vez para publicar
   o atalho. Pressione o ícone e procure “Nova tarefa”.
2. Encerre o app pela tela de recentes e toque no atalho. Quando disponível,
   use `adb shell am stop-app com.gerenciadortarefas` em segundo plano e
   confirme que `adb shell pidof com.gerenciadortarefas` não retorna PID.
   Confirme o Project no formulário e cancele para voltar à Home.
3. Abra o calendário, vá para o launcher e acione o atalho. Digite um título
   de rascunho. Acione novamente e confira que o título permanece. Cancele
   uma vez, volte ao calendário e acione de novo para obter um formulário limpo.
4. Confirme que nenhuma tarefa surgiu até aqui. Preencha uma única Task
   `QA67 Físico`, sem recorrência nem lembrete, usando um Project já vinculado
   à API. Compare os Projects ativos antes e depois do teste.
   Toque em “Criar tarefa” uma vez. Reabra o app e confira o mesmo registro no
   app e na API.
5. Anote `id` e `clientId` da Task na API. Exclua pelo app, aguarde expirar
   a opção Desfazer e confira Home, calendário, lembretes e `GET /tasks`.
   Preserve os projetos existentes e o histórico da exclusão.

A configuração versionada continua em `http://10.0.2.2:3000` para o emulador.
Para o aparelho na mesma rede local do computador, aplique o [procedimento
existente](../arquitetura/integracao-criacao-tarefas.md#execução-android) em uma
cópia de trabalho para QA. Use o IP privado do computador em
`src/services/api.ts` e no domínio permitido de
`android/app/src/release/res/xml/release_network_security_config.xml`.
Inicie a API local com `npm run dev` em `backend/` na porta 3000 e permita
acesso somente a partir da rede de teste. Gere `./gradlew assembleRelease`
nessa cópia e instale esse APK. Mantenha os ajustes locais de IP fora da branch.

### Android real no emulador

Pixel_7, Android 16/API 36, x86_64, Pixel Launcher, package
`com.gerenciadortarefas`. ADB automatizou gestos e capturou a UI e o estado
Android. Os acionamentos de Nova tarefa foram feitos por toque no menu real
do launcher.

| Teste | Resultado | Evidência |
|---|---|---|
| T01 — publicação | PASS | Menu do ícone exibiu “Nova tarefa”. ShortcutService confirmou `new-task` dinâmico. |
| T02 — cold start | PASS | Processo encerrado com `am stop-app`. O toque abriu NovaTarefa após hidratação e Cancelar voltou à Home. |
| T03 — warm Home | PASS | Abriu o formulário com a mesma Activity e Cancelar voltou à Home. |
| T04 — warm Calendário | PASS | O formulário abriu sobre o Calendário e Cancelar retornou à rota de origem. |
| T05 — rascunho | PASS | O título digitado permaneceu após voltar pelo atalho. |
| T06 — formulário abaixo de outra rota | PASS | APK debug com lista vazia simulada em uma chave de cache. Pelo app, NovaTarefa → CriarProjeto → toque no launcher → mesmo rascunho em NovaTarefa. Um Cancelar voltou à Home. Cache original restaurado byte a byte. |
| T07 — repetição | PASS | Toques consecutivos mantiveram o mesmo rascunho. Um único Cancelar saiu do formulário. |
| T08 — cancelar e reentrar | PASS | Novo acionamento após cancelar abriu um formulário limpo. |
| T09 — hidratação | PASS | Release abriu com Geral selecionado e a API acessível. Jest verificou a espera individual por navegação, Projects e Tasks. |
| T10 — falha de hidratação | PASS | Com Wi-Fi e dados temporariamente desligados, a carga de Tasks falhou e o alerta apareceu sobre o Login visual. A rede foi restaurada. Jest também cobriu erro de leitura de Projects. |
| T11 — recriação | PASS | Mudança de idioma por app gerou relançamento, destroy e create no mesmo PID. O Login voltou sem replay. Um novo toque abriu o formulário. Idioma original restaurado. |
| T12 — indisponibilidade | PASS | Remoção do único atalho pelo ShortcutService no AVD. Abertura pelo ícone e formulário pelo botão + funcionaram. A reabertura republicou o atalho. |
| T13 — nenhuma criação automática | PASS | GET /tasks vazio após abrir, repetir e cancelar, antes de confirmar. |
| T14 — confirmação e persistência | PASS | Uma confirmação pela UI produziu um registro. O mesmo ID reapareceu na API e no app após encerrar e reabrir o processo. |
| T15 — regressão manual e QR | PASS | No release, o botão + abriu o formulário. CameraX leu um QR V1 na cena virtual. “Usar dados” preencheu o título QA67 QR e Cancelar voltou à Home com a API vazia. Pose, texturas e permissão originais restauradas. |

API 24/25, launcher incompatível e ABIs físicas permanecem sem execução.
Guarda mínima e indisponibilidade do serviço têm cobertura JVM. A API 36
x86_64 é a única executada no AVD. O teste QR na cena virtual
mede o caminho de frames CameraX, sem avaliar a óptica de hardware físico.

### Limpeza QA

A única Task persistida nesta execução foi `QA67 Atalho`,
`id=268203a7-97be-4cbb-b0a4-4ae1d4accb24`, `clientId=null`.
A exclusão pelo app removeu o registro da lista ativa e manteve o tombstone.
O AVD voltou à Home com “Nenhuma tarefa cadastrada”. Calendário e alarmes
ficaram sem resíduos da massa QA67. `GET /tasks` voltou a `[]` e
`GET /projects` permaneceu idêntico à leitura inicial. Zero Tasks QA67 ativas
e zero Projects criados para QA. O registro físico futuro deve repetir a
limpeza antes do merge.

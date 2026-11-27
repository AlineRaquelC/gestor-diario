# Sprint 3 — Gestor Diário

## Período e estado vigente

- Período planejado de 16/11/2026 a 27/11/2026.
- Em 27/11, as três funcionalidades do core estão concluídas, validadas e
  integradas em `dev`. São **19 de 21 pontos concluídos**.
- A #68 reúne os 2 pontos restantes. A projeção é **21 pontos após aprovação
  documental e integração da #68**. A Sprint segue em consolidação.
- A [proposta de 13/11](sprint-3-proposal.md) e a formalização pelo
  [PR #70](https://github.com/AlineRaquelC/gestor-diario/pull/70) registram o
  planejamento. A Sprint 3 é um recorte da Entrega 3.

## Sprint Goal original

“Criar tarefas no Android por voz, QR estruturado e atalho do sistema, com
revisão antes de salvar e preservação do fluxo canônico.”

**Goal atendido no recorte validado.** O release Android demonstrou voz e QR
com rascunho revisável, e atalho do launcher para o mesmo formulário. A
persistência usa o fluxo canônico mediante confirmação explícita. A recuperação
do G1 viabilizou a voz nesse recorte. O encerramento formal depende da #68.

## Backlog da Sprint e Planning Poker

| Item | Issue / PR funcional | Pontos | Estado em 27/11 |
|---|---|---:|---|
| C1 — Voz | [#65](https://github.com/AlineRaquelC/gestor-diario/issues/65) / [PR #76](https://github.com/AlineRaquelC/gestor-diario/pull/76) | 8 | Concluída, integrada em `dev` |
| C2 — QR | [#66](https://github.com/AlineRaquelC/gestor-diario/issues/66) / [PR #72](https://github.com/AlineRaquelC/gestor-diario/pull/72) | 8 | Concluída, integrada em `dev` |
| C3 — Atalho Android | [#67](https://github.com/AlineRaquelC/gestor-diario/issues/67) / [PR #75](https://github.com/AlineRaquelC/gestor-diario/pull/75) | 3 | Concluída, integrada em `dev` |
| C4 — Consolidação documental | [#68](https://github.com/AlineRaquelC/gestor-diario/issues/68) | 2 | Em consolidação, aguardando aprovação documental e integração |
| **Core original** | **4 itens** | **21** | **19 concluídos, 2 pendentes** |

## Decisão de replanejamento em 24/11/2026

Registro histórico da decisão de 24/11, anterior à recuperação do G1.

A #65 permanece aberta no backlog com seus 8 pontos bloqueados pelo G1
NO-GO. Esses pontos ficam fora da expectativa de entrega desta Sprint.
Nenhum stretch substitui automaticamente a voz. A Sprint prossegue com
a #67 e depois com a #68. O forecast é de **13 pontos** se ambas forem
concluídas, incluindo os 8 pontos já entregues da #66, frente aos **21 pontos
originalmente propostos**.

O [G1 reexecutado](sprint-3-issue-65.md#10-reexecução-do-g1-em-24112026)
manteve NO-GO pela falta de transcrição final de fala real em pt-BR. As
tarefas T01–T08 seguem bloqueadas. Uma última revalidação isolada com fala
real poderá ocorrer se houver acesso a um Android físico antes do fechamento.
Ela fica fora do compromisso atual e pode ocorrer sem interromper a #67.
A #65 só reabre tecnicamente com evidência suficiente para G1 GO ou GO COM
RESTRIÇÕES. A implementação funcional depende de autorização separada.

Na #66, a usuária aprovou anteriormente o teste manual em Android físico.
A validação complementar em emulador confirmou o release sem Metro,
a persistência pela API e o mesmo registro após reabrir o app. A massa de
QA foi removida, com Home limpa e zero tarefas de QA ativas.
A consolidação final das evidências fica para a #68.

**Próximo gate autorizado: G3 — Issue #67 — Atalho Android para criação de nova tarefa.**

Após integrar este replanejamento, o G3 deverá avaliar ShortcutManager,
minSdk 24 e o comportamento em API 24, 25 e 26+, além da escolha entre
atalho dinâmico e fixado. Deve verificar MainActivity com `singleTask`,
React Navigation, cold start, warm start, hidratação de Projects e estado,
prevenção de tela ou Task duplicada e launcher sem suporte.
O G3 permanece pendente.

## Recuperação do Gate G1 em 27/11/2026

O Moto G23 (Android 14/API 34, arm64-v8a) tinha o modelo pt-BR instalado.
A responsável pelo projeto confirmou fala real, resultado editável via
React Native e funcionamento offline no release do spike. O **G1 passou
de NO-GO a GO COM RESTRIÇÕES**. Depois, a implementação definitiva foi
validada fisicamente no mesmo aparelho e integrada pelo PR #76. O histórico
do AVD e as duas provas físicas estão no [registro da #65](sprint-3-issue-65.md).

## Rastreabilidade de requisitos

| Item e PBI | Requisito oficial e estado | Testes e evidências |
|---|---|---|
| C1 / PBI-25 | [RF28](../requisitos/requisitos-oficiais.md#rf28--página-5), criação por voz via microfone e reconhecimento do sistema. [REQ141](../requisitos/requisitos-oficiais.md#req141--página-18), linguagem natural com confirmação antes de salvar. [REQ142](../requisitos/requisitos-oficiais.md#req142--página-18), correção textual antes de criar. Atendidos no recorte. | [Parser](../../__tests__/taskVoice.test.ts), [formulário e ponte](../../__tests__/NewTaskVoice.integration.test.tsx), [manual físico](sprint-3-issue-65.md#14-validação-física-final--27112026). |
| C2 / PBI-25 | [REQ145](../requisitos/requisitos-oficiais.md#req145--página-18) atendido para criação a partir de QR estruturado V1. [RF30](../requisitos/requisitos-oficiais.md#rf30--página-5) parcial. Leitura de barcode linear e associação persistente a item ou local continuam fora do recorte. | [Parser](../../__tests__/structuredQr.test.ts), [fluxo QR](../../__tests__/NewTaskQr.integration.test.tsx), [decoder JVM](../../android/app/src/test/java/com/gerenciadortarefas/qr/QrFrameDecoderTest.kt), [manual físico](sprint-3-issue-66.md#validação-física-complementar--27112026). |
| C3 / PBI-27 | [RF73](../requisitos/requisitos-oficiais.md#rf73--página-10) atendido no recorte de atalho dinâmico **Nova tarefa** no launcher Android. | [Navegação](../../__tests__/NewTaskShortcut.integration.test.tsx), [guarda e entrega JVM](../../android/app/src/test/java/com/gerenciadortarefas/NewTaskShortcutTest.kt), [manual físico](sprint-3-issue-67.md#validação-física-final--27112026). |
| C4 / #68 | Enabler de documentação e rastreabilidade, sem novo requisito oficial. | README, este registro, links e execução do CI documental. |

PBI-25 e PBI-27 ficam parcialmente entregues. As outras capacidades
listadas no [backlog da Entrega 3](../backlog/backlog-produto.md) seguem
com seus escopos próprios.

## Evidências e CI

| Item | Gate e evidência em emulador | Evidência física |
|---|---|---|
| #65 | G1 NO-GO em 17 e 24/11 no Pixel_7/API 36, sem transcrição pt-BR válida de fala real. G1 GO COM RESTRIÇÕES em 27/11 no Moto G23. | Spike e release definitivo com reconhecimento local, ponte RN, edição, cancelamento, interpretação e regressões. A responsável validou reconhecimento/interpretação offline e persistência com a API alcançável. |
| #66 | G2 GO COM RESTRIÇÕES no spike do AVD, com CameraX/ZXing e QR em cena virtual. G2 GO para integração do recorte validado. | A responsável aprovou leitura, edição, confirmação e, na prova complementar do Moto G23, rotação física, reentrada e cancelamento sem duplicação. Recriação da Activity ficou sem comprovação. |
| #67 | G3 GO COM RESTRIÇÕES, com Pixel Launcher em AVD API 36/x86_64, cold/warm start, reentrada e teste de duplicação. | A responsável aprovou o atalho no launcher Motorola em API 34, a preservação do rascunho e a criação explícita com persistência. |

| Issue | CI do PR | CI pós-merge em dev |
|---|---|---|
| #65 | [#93](https://github.com/AlineRaquelC/gestor-diario/actions/runs/46031039563), Mobile e Backend aprovados | [#94](https://github.com/AlineRaquelC/gestor-diario/actions/runs/46035538365), Mobile e Backend aprovados |
| #66 | [#83](https://github.com/AlineRaquelC/gestor-diario/actions/runs/45409848429), Mobile e Backend aprovados | [#84](https://github.com/AlineRaquelC/gestor-diario/actions/runs/45411296298), Mobile e Backend aprovados |
| #67 | [#90](https://github.com/AlineRaquelC/gestor-diario/actions/runs/45995952319), Mobile e Backend aprovados | [#91](https://github.com/AlineRaquelC/gestor-diario/actions/runs/45996408875), Mobile e Backend aprovados |

O incremento funcional em `dev` (`c1298e73`) e a verificação local da
#68 registram 17 testes dos validadores, 856 Mobile em 45 suítes, 479
Backend em 17 suítes e 10 JVM em 3 suítes. Lint e TypeScript passaram
sem ampliar baselines. Backend passou em migração SQLite isolada,
typecheck, testes e build. Os builds Android debug e release passaram
nas validações funcionais. O workflow GitHub Actions executa Mobile e
Backend. A prova JVM e os APKs foram verificados separadamente.

### Limitações de compatibilidade e conectividade

- Voz on-device exige API 31+, serviço compatível e modelo pt-BR.
  Reconhecimento offline comprovado no Moto G23. A API precisa estar
  alcançável para persistir ou sincronizar remotamente.
- O atalho dinâmico exige API 25+ e launcher compatível. API 24/25 e
  launchers incompatíveis seguem sem validação em execução.
- O QR V1 foi testado em câmera física e em cena virtual, em registros
  separados. O cenário de rotação não comprova recriação da Activity.
- Após o teste offline da #65, o Wi-Fi retornou `No route to host`.
  O backend permaneceu ativo, o SQLite estava íntegro e a causa exata
  ficou inconclusiva. USB com ADB reverse e release isolado em
  `127.0.0.1:3000` retornou HTTP 200 e permitiu concluir as regressões.
  O APK anterior foi restaurado e o encaminhamento removido. A
  configuração versionada do emulador foi preservada.

## Fora do core

- [#43 — Base de perfis locais](https://github.com/AlineRaquelC/gestor-diario/issues/43)
  permanece **OPEN**, pendência da Entrega 2 e **fora do core da Sprint 3**.
  Sem alteração de escopo, estado ou milestone nesta formalização.
- S1/OCR e S2/exportação ao calendário permanecem possibilidades históricas de
  stretch, sem Issues criadas por esta execução e sem inclusão nos 21 pontos.
- Demais itens adiados da proposta continuam fora; requisitos oficiais intactos.

## Riscos e acompanhamento

| Risco | Tratamento |
|---|---|
| Serviço ou modelo indisponível para voz | Verificar disponibilidade e preservar o formulário manual. A demonstração offline requer modelo pt-BR instalado. |
| Comunicação LAN intermitente | Usar a configuração isolada por USB quando a LAN estiver indisponível. |
| Dependências nativas incompatíveis | Provar versões/licenças e builds RN/New Architecture em refinamento autorizado |
| Captura/transmissão e permissões | Informação antes de capturar, consentimento contextual e fallback manual |
| Callback/intent duplica criação | Sessão única, revisão e confirmação; fluxo addTask canônico |
| Evidência simulada confundida com dispositivo físico | Identificar AVD/hardware e limites em cada validação |
| Documentação antecipar entregas | Registrar somente estado real e cobertura parcial dos requisitos |

## Definition of Done

Aplica-se a [DoD oficial](../processo/definition-of-done.md), sem redução.
Para cada recorte:

- critérios de aceite e regras de negócio atendidos, com limites RF/REQ explícitos;
- integração e persistência canônicas quando aplicáveis, sem criação automática
  por callback de voz/QR ou atalho;
- testes automatizados pertinentes e fluxo Android manual validado; evidências
  identificadas como AVD ou hardware físico;
- permissões, erros, cancelamento, lifecycle, acessibilidade e ausência de
  duplicação verificados; builds debug/release quando houver mudança nativa;
- CI aprovado, lint/TypeScript sem novos problemas nem ampliação de baselines;
- documentação/Issue atualizadas, rastreabilidade para PRs/testes, revisão e merge
  na branch correta; um PR apenas documental não conclui a funcionalidade;
- links e git diff --check aprovados; nenhuma massa QA remanescente.

Encerrar a Sprint exige Goal atendido ou formalmente revisado, itens concluídos
ou replanejados, incremento integrado/validado e documentação/demonstração
coerentes com a DoD. A aprovação e a integração da #68 ainda estão pendentes.

## Regra de limpeza QA

Toda Task criada exclusivamente para QA deve ser removida antes do merge da
respectiva Issue. Planejar massa mínima, registrar IDs/clientIds e, se aplicável,
seriesId/occurrenceKeys; preservar registros anteriores, history/tombstones,
Projects e demais entidades. Confirmar Home/calendário/API sem resíduos da massa
técnica, sem usar exclusão indiscriminada para aparentar limpeza.

Em 24/11, a Home foi conferida no emulador e a API retornou zero tarefas
ativas. No fechamento técnico de C1–C3, Home e Calendário foram conferidos
no Moto G23, sem resíduos, alarmes ou notificações de QA. A #68 confirmou
novamente API sem tarefas ativas, Projects iguais à referência e SQLite
íntegro, com 7 tombstones e 18 eventos de histórico QA65–QA67 preservados.
A consolidação usou consultas somente leitura no ambiente de QA.

## Histórico documental

- 13/11: [proposta de recorte](sprint-3-proposal.md), integrada pelo PR #64.
- 16/11: início da Sprint, informado pela usuária e registrado nesta correção.
- 17/11: Issues #65–#68 formalizadas; refinamento/G1 da #65 integrado pelo PR #69.
- 17/11: correção do estado para EM ANDAMENTO, período 16–27/11; preservados
  G1 NO-GO, Issues abertas e core preliminar sujeito a reavaliação.
- 17/11: [G2 da #66](sprint-3-issue-66.md) GO COM RESTRIÇÕES em spike removível;
  #66 candidata tecnicamente viável para implementação prioritária após revisão
  e autorização. Sem implementação funcional, substituição automática da #65 ou
  mudança dos 21 pontos originais; reavaliação do core continua necessária.
- 17/11: implementação funcional da #66 autorizada e preparada em branch própria,
  conforme [registro técnico, seção10](sprint-3-issue-66.md#10-implementação-funcional--17112026).
  Testes automatizados/builds executados; validação Android manual e merge
  pendentes. #65 não substituída; #67/#68 e #43 não alteradas.
- 24/11: #66 integrada em `dev` pelo PR #72 com G2 GO. G1 reexecutado e
  mantido em NO-GO, com replanejamento registrado acima.
- 27/11: #67, #65 e a prova complementar da #66 concluídas no Moto G23.
  #65 e #67 integradas em `dev`. #66 encerrada após a validação complementar.
- 27/11: #68 em consolidação com 19 pontos concluídos e os 2 documentais
  pendentes de aprovação e integração.

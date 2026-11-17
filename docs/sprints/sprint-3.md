# Sprint 3 — Gestor Diário

## Período e estado vigente

- **Início:** 16/11/2026.
- **Término:** 27/11/2026.
- **Estado em 17/11/2026: EM ANDAMENTO**, conforme correção informada pela usuária.
- **Core originalmente proposto:** 21 pontos; estimativas preliminares.
- Nenhum milestone criado nesta formalização; #65–#68 estão sem milestone.
- Nenhuma feature implementada pela formalização documental do PR #70.

Este é o registro vigente da Sprint. A [proposta de 13/11](sprint-3-proposal.md)
permanece como histórico do planejamento, sem substituir ou alterar requisitos.
As afirmações recentes de “Sprint 3 não iniciada” foram corrigidas: o início
informado é 16/11, embora as Issues e os gates tenham sido registrados depois.
Início da Sprint não significa aceite dos gates ou conclusão das funcionalidades.

## Sprint Goal atual/proposto

“Criar tarefas no Android por voz, QR estruturado e atalho do sistema, com
revisão antes de salvar e preservação do fluxo canônico.”

Goal herdado da proposta e **sujeito a revisão rápida após os gates técnicos**.
O G1 NO-GO da voz coloca esse objetivo em risco; não declarar o Goal atendido
ou prometer entrega integral dos 21 pontos. A Sprint não equivale à Entrega 3
completa, nem declara PBIs integralmente atendidos por recortes.

## Backlog da Sprint e Planning Poker

Estados OPEN conferidos no GitHub em 17/11/2026.

| Item | Issue | Origem / limite | Pontos preliminares | Estado atual |
|---|---|---|---:|---|
| C1 — voz | [#65 — Criação assistida de tarefas por voz](https://github.com/AlineRaquelC/gestor-diario/issues/65) | PBI-25; RF28, REQ141/142; sem RF75 | 8 | OPEN — funcionalmente bloqueada por G1 NO-GO |
| C2 — QR | [#66 — Criar tarefa a partir de QR Code estruturado](https://github.com/AlineRaquelC/gestor-diario/issues/66) | PBI-25; REQ145, RF30 parcial | 8 | OPEN — implementação funcional em feature/66-structured-qr-task; G2 GO COM RESTRIÇÕES; Android manual PENDENTE |
| C3 — atalho Android | [#67 — Atalho Android para criação de nova tarefa](https://github.com/AlineRaquelC/gestor-diario/issues/67) | PBI-27; RF73; sem widgets | 3 | OPEN — G3 pendente |
| C4 — documentação/rastreabilidade | [#68 — Atualizar evidências, rastreabilidade e README](https://github.com/AlineRaquelC/gestor-diario/issues/68) | Enabler documental; sem novo requisito oficial | 2 | OPEN — consolidação final depende dos resultados C1–C3 |
| **Total originalmente proposto** | **4 Issues** | **3 funcionais + 1 documental** | **21** | **Reavaliação rápida necessária após os gates** |

**#65 permanece no backlog da Sprint neste momento**, com 8 pontos preliminares,
porém funcionalmente bloqueada. Não a remover, substituir ou iniciar
automaticamente. O início da Sprint não converte estimativas em entrega garantida.
Qualquer ajuste de Goal, escopo, pontos ou seleção requer decisão explícita
apoiada nas evidências dos gates, preservando a DoD.

## Gates e impacto no plano

| Gate | Estado em 17/11 | Evidência / condição para avançar |
|---|---|---|
| G1 — voz / #65 | **NO-GO** | [Refinamento da #65](sprint-3-issue-65.md), integrado pelo [PR #69](https://github.com/AlineRaquelC/gestor-diario/pull/69); critérios de reabertura preservados |
| G2 — QR / #66 | **GO COM RESTRIÇÕES**, 17/11 | [Refinamento da #66](sprint-3-issue-66.md): CameraX/ZXing, câmera/decode/payload exato, TurboModule/Hermes, offline e builds; execução restrita ao AVD/API36/x86_64; parser/formulário ainda propostos |
| G3 — atalho / #67 | Pendente; não executado nesta formalização | ShortcutManager/launcher, API24/25/26+, React Navigation, singleTask, cold/warm start e hidratação |
| Consolidação / #68 | Pendente | Resultados reais, rastreabilidade, limites e números finais de testes/CI; sem afirmar conclusão antes da validação |

O G1 comprovou disponibilidade do SpeechRecognizer, início do pipeline e estados
de RECORD_AUDIO. Não comprovou frase pt-BR final pelo microfone real do host;
on-device pt-BR retornou LANGUAGE_UNAVAILABLE, offline pt-BR não foi comprovado.
A ponte RN/TurboModule/Codegen com voz ainda não foi validada; provedor,
privacidade e eventual transmissão exigem decisão explícita.
**O resultado do G1 permanece inalterado. T01–T08 da #65 continuam bloqueados.**
Não baixar modelo automaticamente, simular voz por texto ou trocar de provedor
para contornar o gate.

Como a Sprint já começou, reavaliar rapidamente o core de 21 pontos e o Goal
após os gates, considerando o prazo de 27/11 e capacidade real. Não compensar
o bloqueio automaticamente com outra Issue ou stretch.

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
| G1 impede a voz prevista no Goal | Manter #65 bloqueada, registrar evidências e decidir reabertura/replanejamento explicitamente |
| Prazo já em curso com G2/G3 pendentes | Reavaliar rapidamente seleção/capacidade após os gates; sem assumir velocidade ou entrega integral |
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
coerentes com a DoD. Esta formalização não encerra Sprint ou Issues.

## Regra de limpeza QA

Toda Task criada exclusivamente para QA deve ser removida antes do merge da
respectiva Issue. Planejar massa mínima, registrar IDs/clientIds e, se aplicável,
seriesId/occurrenceKeys; preservar registros anteriores, history/tombstones,
Projects e demais entidades. Confirmar Home/calendário/API sem resíduos da massa
técnica, sem usar exclusão indiscriminada para aparentar limpeza.

Home zerada é a referência informada de entrada; não foi revalidada no dispositivo
por esta correção. Na formalização integrada pelo PR #70 não houve Task,
captura Android, gate ou feature executados. O G2 posterior está registrado
no refinamento da #66 e não criou Task. A regra de QA vale para futuras
validações autorizadas.

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

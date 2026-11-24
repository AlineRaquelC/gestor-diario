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

## Sprint Goal original

“Criar tarefas no Android por voz, QR estruturado e atalho do sistema, com
revisão antes de salvar e preservação do fluxo canônico.”

O G1 NO-GO compromete o atendimento integral do Goal pela indisponibilidade
da voz. A avaliação final do Goal fica para o fechamento da Sprint na #68.
A Sprint cobre recortes da Entrega 3 e de seus PBIs.

## Backlog da Sprint e Planning Poker

Estado do incremento em 24/11/2026.

| Item | Issue | Origem / limite | Pontos preliminares | Estado atual |
|---|---|---|---:|---|
| C1 — voz | [#65 — Criação assistida de tarefas por voz](https://github.com/AlineRaquelC/gestor-diario/issues/65) | PBI-25; RF28, REQ141/142; sem RF75 | 8 | OPEN — 8 pontos bloqueados / replanejados por Gate G1 NO-GO |
| C2 — QR | [#66 — Criar tarefa a partir de QR Code estruturado](https://github.com/AlineRaquelC/gestor-diario/issues/66) | PBI-25; REQ145, RF30 parcial | 8 | Concluída no incremento, G2 GO e [PR #72](https://github.com/AlineRaquelC/gestor-diario/pull/72) integrado em `dev` |
| C3 — atalho Android | [#67 — Atalho Android para criação de nova tarefa](https://github.com/AlineRaquelC/gestor-diario/issues/67) | PBI-27; RF73; sem widgets | 3 | OPEN — G3 pendente |
| C4 — documentação/rastreabilidade | [#68 — Atualizar evidências, rastreabilidade e README](https://github.com/AlineRaquelC/gestor-diario/issues/68) | Enabler documental; sem novo requisito oficial | 2 | OPEN — consolidação final depende dos resultados C1–C3 |
| **Total originalmente proposto** | **4 Issues** | **3 funcionais + 1 documental** | **21** | **Referência original preservada** |

## Decisão de replanejamento em 24/11/2026

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
| Prazo já em curso com G3 pendente | Reavaliar rapidamente seleção/capacidade após os gates; sem assumir velocidade ou entrega integral |
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

Em 24/11, a Home foi conferida no emulador e a API retornou zero tarefas
ativas. A atualização documental não criou Tasks nem massa de QA.

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

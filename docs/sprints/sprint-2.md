# Sprint 2 — Gestor Diário

## Identificação e datas

- **Formalização:** 23/10/2026; estado: planejada, nenhuma Issue iniciada.
- **Janela operacional atualizada:** 23/10/2026 → 08/11/2026.
- **Milestone:** [Sprint 2](https://github.com/AlineRaquelC/gestor-diario/milestone/2), data alvo **08/11/2026**.
- **Freeze absoluto / data máxima para commit e push:** **08/11/2026**.
- **Apresentação:** **08/11/2026**; a data máxima de commit/push também passou a 08/11 por decisão do professor.
- **Branch desta documentação:** `docs/plan-sprint-2`; PR exclusivamente para `dev`, sem merge automático.

Esta documentação registra o planejamento da Sprint 2 e suas Issues no GitHub.
No momento da formalização, as Issues estavam planejadas e a implementação
funcional ainda não havia sido iniciada. Aplicativo, backend, banco, dependências
e migrations permaneceram inalterados; a promoção `dev → main` ficou fora do escopo.

## Sprint Goal

Tornar o Gestor Diário mais proativo e rápido no uso cotidiano,
adicionando recorrência, lembretes e notificações confiáveis,
recursos de localização rápida de tarefas e acompanhamento de metas,
preservando a estabilidade do MVP integrado.

## Contexto após a Sprint 1

- [Sprint 1](sprint-1.md): **15/15 Issues concluídas, 100%, nenhuma aberta**, confirmado no milestone nº 1 em 23/10/2026.
- Polimento visual das Fases 1, 2 e 3 encerrado e integrado em `dev`: Home/filtros/ordenação (PR #36), formulários/detalhes de tarefa (PR #37) e telas restantes (PR #38). Validação técnica e visual Android concluída.
- Base desta formalização: `dev` limpa e atualizada em `a96af2495d146d0fbc5115d0ead4d2cad9655cba`, integração do PR #38.
- [CI da base](https://github.com/AlineRaquelC/gestor-diario/actions/runs/39967136926): **Mobile e Backend aprovados**. Referência mobile: 352 testes em 22 suítes; 16 testes dos validadores; lint com 3 erros/7 warnings conhecidos e TypeScript com 11 diagnósticos conhecidos, sem regressão e sem ampliar baselines.
- Arquitetura vigente: React Native → Context/State → services HTTP → API Node.js → services/repositories → Drizzle/SQLite. AsyncStorage é cache/apoio local; identidades e reconciliação existentes devem ser preservadas.
- Três tarefas legadas sem `projectId` continuam locais, com pendências explícitas. Não associar por nome, apagar ou migrar silenciosamente para aparentar sincronização completa.
- O gap de horário/antecedência no passado já está [registrado na Entrega 2](../backlog/entregas.md); passa a integrar o recorte de lembretes da Issue #39.

## Entrega 2 não equivale à Sprint 2

A [Entrega 2](../backlog/entregas.md) contém **PBIs 12–24** e é maior que uma
Sprint. O [Product Backlog](../backlog/backlog-produto.md) e os
[requisitos oficiais](../requisitos/requisitos-oficiais.md) permanecem intactos.
Esta Sprint seleciona apenas quatro recortes principais e um stretch condicionado,
compatíveis com um incremento demonstrável dentro do prazo.

Somente trabalho pronto/refinado e compatível com a capacidade pode iniciar.
As Issues registram requisitos, aceite e limites; a decomposição técnica será feita
**uma Issue por vez, antes de sua implementação**, sem Tasks técnicas detalhadas
no planejamento inicial. O planejamento não declara automaticamente todos os recortes
Ready nem todos os PBIs de origem integralmente cobertos.

## Escopo, ordem e Planning Poker

| Ordem | Issue | Origem selecionada | Planning Poker | Compromisso | Estado |
|---|---|---|---:|---|---|
| 1 | [#39 — Lembretes e notificações locais confiáveis](https://github.com/AlineRaquelC/gestor-diario/issues/39) | PBI-13; RF15/RF16 | 13 | Core; prioridade alta dentro da Sprint | Planejada; não iniciada |
| 2 | [#40 — Tarefas recorrentes diária, semanal e mensal](https://github.com/AlineRaquelC/gestor-diario/issues/40) | PBI-13; RF08 | 8 | Core | Planejada; não iniciada |
| 3 | [#41 — Busca de tarefas, favoritos e filtros salvos](https://github.com/AlineRaquelC/gestor-diario/issues/41) | PBI-14; RF13/RF49/RF51 | 8 | Core | Planejada; não iniciada |
| 4 | [#42 — Metas e relatórios de produtividade](https://github.com/AlineRaquelC/gestor-diario/issues/42) | PBI-17; RF22/RF46/RF47 | 8 | Core | Planejada; não iniciada |
| 5 | [#43 — [Stretch] Base de perfis locais](https://github.com/AlineRaquelC/gestor-diario/issues/43) | PBI-19; RF33/RF34, cobertura parcial | 13 | Stretch, fora do compromisso | Planejada; não iniciada |

**Core planejado: 13 + 8 + 8 + 8 = 37 pontos. Stretch: 13 pontos adicionais,
fora do cálculo do compromisso principal.** Pontos são estimativas relativas de
Planning Poker fornecidas para este plano, não dias nem prova de velocidade.
Não há capacidade histórica demonstrada que garanta 37 pontos na janela curta;
acompanhar risco e renegociar explicitamente o recorte se necessário, sem estender
o freeze ou reduzir a DoD. A prioridade alta de #39 é interna à Sprint e não muda
a prioridade original do PBI no Product Backlog.

### 1. Lembretes e notificações — #39

Antecedência configurável em minutos, horas e dias; persistência; agendamento local
Android e funcionamento em segundo plano conforme viabilidade Android. Editar deve
reagendar, concluir/excluir quando aplicável deve invalidar notificações indevidas,
e o fluxo não pode duplicar agendamentos.

Para tarefa de hoje, horário passado deve ser rejeitado quando inviabilizar o
agendamento; horário menos antecedência não pode resultar em disparo passado.
Apresentar erro compreensível e validar na camada adequada ao fluxo persistido,
não somente no formulário. Não declarar agendamento bem-sucedido se falhar.

É a **primeira implementação prevista**, após aprovação de início. Fora: escalonamento avançado,
silêncio complexo, políticas por prioridade e REQ114–REQ116 completos; não declarar
RF43–RF45 ou PBI-13 integralmente entregues por este recorte.

### 2. Recorrência — #40

Opções Não repetir, Diariamente, Semanalmente e Mensalmente; persistir e editar
regra; gerar ocorrências futuras automaticamente e de forma determinística.
Não duplicar ao gerar, reabrir ou sincronizar; calendário deve refletir as datas.
Políticas de limite/fim de mês devem ficar explícitas no refinamento específico.
Ocorrências devem ser compatíveis com os lembretes estabilizados. Recorrência
complexa/personalizada está fora.

### 3. Busca, favoritos e filtros salvos — #41

Busca textual em tempo real em título, descrição e observações reais, com resultado
atualizado enquanto digita e composição com os filtros existentes. **Não há sistema
de etiquetas implementado**: não inventá-lo para completar RF13; registrar essa
cobertura parcial.

Marcar/desmarcar favorito, persistir e oferecer acesso rápido às favoritas, com
estado mantido após reabrir. Salvar combinação dos filtros atuais, nomeá-la,
aplicá-la depois e excluí-la. Usar IDs estáveis para filtros e referências;
projetos homônimos permanecem distintos. Exemplos de nomes: Urgentes, Marketing
desta semana, Pendentes e Faculdade; não são novos tipos de filtro.

**RF14 (ordenação manual por drag and drop) está fora. PBI-14 não será declarado
integralmente concluído por esta Issue.** Preservar filtros e ordenação atuais.

### 4. Metas e relatórios — #42

Metas diária, semanal e mensal persistidas; progresso, concluídas, pendentes e
atrasadas calculados com Tasks reais; recorte por período; relatório textual e
gráfico de barras simples. Reutilizar dashboard/helpers atuais, sem métricas
fictícias ou biblioteca pesada quando solução simples for suficiente. A definição
de contagem/períodos deve ficar explícita antes da implementação. Não ampliar
para BI, exportação, cronômetro ou demais requisitos do PBI-17 não selecionados.

## Dependências

| Item | Dependência / gate |
|---|---|
| #39 | Arquitetura atual de Task/API/SQLite; base da experiência temporal e notificações. |
| #40 | #39 concluída ou suficientemente estabilizada com comportamento/contrato temporal testado, para compatibilidade com lembretes. |
| #41 | Funcionalmente independente de #39/#40; depende dos dados reais e deve preservar os filtros existentes. |
| #42 | Dashboard/helpers e dados reais disponíveis; manter consistência com as ocorrências e estados das Tasks. |
| #43 | Core #39–#42 concluído ou com risco operacional praticamente zero antes do freeze, além de isolamento seguro refinado. |

A ordem operacional é **#39 → #40 → #41 → #42**, embora #41 não dependa
funcionalmente de #39/#40. O stretch não deve disputar capacidade com o core.

## Stretch Goal — #43: base de perfis locais

**Fora do compromisso principal; 13 pontos.** Iniciar somente se #39–#42 estiverem
concluídas ou com risco operacional praticamente zero antes do freeze.

Primeiro recorte: criar perfil local com nome e representação visual simples/inicial,
persistir, selecionar perfil ativo, alternar e preservar seleção após reiniciar.
Preparar e avaliar de forma segura isolamento efetivo de Tasks/Projects por perfil,
considerando cache, API e sincronização. Não expor alternância que misture ou vaze
dados existentes. Se segurança ampliar demais o escopo, registrar e adiar para
refinamento posterior; **não entregar implementação parcial perigosa**.

RF33 inclui tarefas compartilhadas/atribuição, e RF34 exige dados isolados e
configurações independentes. Esta base não representa cumprimento integral desses
requisitos nem do PBI-19. Compartilhamento avançado fica fora.

## Autenticação e biometria: limites explícitos

- **Login atual é visual/placeholder:** Entrar navega para Home. Não transformar o fluxo em autenticação online nesta Sprint.
- Sem login online, e-mail/senha, JWT, sessão, backend auth, conta em servidor, cadastro ou recuperação de senha.
- **RF79:** autenticação simples e segura da API pertence ao **PBI-16**, fora do escopo desta Sprint.
- **REQ175–REQ180:** pertencem à **Entrega 3 / PBI-30**: impressão digital, reconhecimento facial, íris, voz, assinatura e localização + biometria. Implementação fora do escopo desta Sprint.
- Perfis locais são distintos de autenticação online; biometria permanece fora do escopo.

## Fora do compromisso da Sprint 2

Os itens abaixo **continuam na Entrega 2 e no backlog**, sem remoção ou mudança de
requisitos. O planejamento não declara toda a Entrega 2 entregue.

| PBI | Escopo fora do compromisso |
|---|---|
| PBI-12 | Priorização inteligente/customizada. |
| PBI-15 | Importação, exportação e backup. |
| PBI-16 | Sincronização automática, autenticação da API e múltiplos servidores. |
| PBI-18 | Tema e personalização adicional. |
| PBI-20 | Duplicação, modelos e dependências. |
| PBI-21 | Cronômetro, esforço e conflitos. |
| PBI-22 | Operações em lote e campos personalizados. |
| PBI-23 | Feriados, prazos úteis e revisão semanal. |
| PBI-24 | Anexos, áudio, links e impressão. |

Também ficam fora: RF14, etiquetas novas, recorrência personalizada, notificações
avançadas/silêncio complexo e demais requisitos dos PBIs selecionados que não
constam no recorte. PBI-19 é apenas stretch condicionado, sem compartilhamento
avançado ou isolamento inseguro.

## Riscos e capacidade

| Risco | Tratamento planejado |
|---|---|
| Janela curta para 37 pontos, sem velocidade comprovada | Limitar trabalho em andamento; refinar uma Issue por vez; priorizar #39; registrar e renegociar qualquer redução de recorte antes do freeze. Stretch não conta como entrega obrigatória. |
| Restrições Android, permissão e execução em segundo plano | Validar cedo em Android; registrar viabilidade e erros reais; não prometer disparo que não foi comprovado. Escolha técnica somente no refinamento da Issue. |
| Horário/antecedência passados e limites de período | Testes determinísticos, mensagens claras e validação na camada adequada; seguir datas/fuso da arquitetura vigente. |
| Duplicação em recorrência/sync ou troca de identidade | Idempotência, IDs estáveis, reabertura/sync repetidos e regressão com homônimos. |
| Busca em observações e persistência dos novos estados | Usar dados realmente persistidos; validar integração necessária sem inventar etiquetas ou dados. |
| Metas/relatórios com contagens inconsistentes | Reutilizar helpers; confrontar texto, barras e progresso com a mesma massa real. |
| Perfis expondo/misturando dados | Gate de segurança antes de alternância; adiar se o isolamento seguro exceder capacidade. |
| Legado e dívida técnica já conhecida | Preservar três pendências e dados locais, exclusão explícita de App.test.tsx no CI e baselines atuais; não confundir CI verde com dívida zerada. |
| Freeze ou regressão tardia | Regressão em 30/10, fechamento em 31/10; 08/11 apenas buffer/freeze; respeitar a data máxima de commit/push em 08/11. |

## Estratégia de testes e validação

- **#39:** minutos/horas/dias, hoje/horário passado, disparo passado pela antecedência, futuro válido, limites de data/fuso, reagendamento, conclusão/exclusão/undo quando aplicável, duplicação, persistência e erros/permissões Android.
- **#40:** todas as frequências/edição, limites de dia/semana/mês e fim de mês, geração determinística, reabertura/sync idempotentes, calendário e compatibilidade com lembretes.
- **#41:** título/descrição/observações, digitação e combinação com filtros, vazios, favoritos persistidos, salvar/aplicar/excluir filtros, IDs estáveis e homônimos; regressão de filtros/ordenação.
- **#42:** metas e reabertura, dados reais/vazios, concluídas/pendentes/atrasadas, limites dos períodos, texto/barras/progresso coerentes e conclusão/reabertura refletidas.
- **#43, condicionada ao atendimento do gate:** criação/seleção/alternância/reinício e prova de isolamento/preservação dos dados. A validação exige isolamento efetivo, sem vazamento de dados.
- Validar manualmente no Android cada recorte implementado; persistência e API/SQLite quando necessários. Usar massa isolada, sem limpar tarefas/projetos existentes.
- Executar `npm run test:ci-scripts`, `npm run lint:ci`, `npm run typecheck:ci`, `npm run test:ci` e `git diff --check`; backend estrito e suas verificações quando afetado. Manter CI Mobile/Backend verdes, sem ampliar baselines ou alterar exclusões para ocultar regressões.
- A validação do planejamento se baseia no CI verde do MVP. Os testes das funcionalidades propostas permanecem pendentes de implementação e execução; não há evidência de aceite dessas funcionalidades.

## Plano diário operacional

| Data de 2026 | Foco planejado |
|---|---|
| 23/10 | Planejamento, milestone e cinco Issues; revisão de dependências/capacidade. Implementação funcional ainda não iniciada. |
| 24/10 | Após aprovação de início, refinar #39 e iniciar o desenvolvimento principal; validar cedo viabilidade Android e regras temporais. |
| 25/10 | Prosseguir #39, persistência, reagendamento, erros e testes. |
| 26/10 | Estabilizar/concluir #39 conforme DoD; refinar #40 somente com dependência temporal atendida. |
| 27/10 | Desenvolvimento de #40 e validação de idempotência/calendário. |
| 28/10 | #41 na ordem planejada, preservando filtros/IDs. |
| 29/10 | #42 e integração do core; rever capacidade e riscos. #43 apenas se o gate estiver comprovadamente atendido. |
| 30/10 | Regressão integrada Android, persistência, API/banco quando necessários e CI. |
| 31/10 | Documentação, fechamento e promoção final planejada, sujeita a aprovação específica/revisão; meta original, posteriormente prorrogada para 08/11. Promoção `dev → main` fora do escopo da formalização. |
| 08/11 | Buffer/freeze; evitar desenvolvimento normal. Data máxima para commit/push; depois disso nenhuma alteração no repositório. |
| 02–07/11 | Janela adicional para implementação e validação, documentação e preparação da demonstração; commits/push permitidos até 08/11. |
| 08/11 | Apresentação do incremento efetivamente validado; coincide com o novo limite de commit/push. |

A distribuição diária é uma previsão condicionada à aprovação de início e ao
cumprimento da DoD. Ajustes de recorte devem refletir explicitamente risco e
capacidade, preservando o freeze. Uma promoção futura depende de aprovação
específica e do mesmo limite de prazo; permanece fora do escopo da formalização.

## Definition of Done da Sprint

Uma Issue somente é concluída quando:

- [ ] Critérios de aceite do recorte atendidos, sem declarar o PBI completo indevidamente.
- [ ] Android validado com fluxo principal e erros relevantes.
- [ ] Persistência validada quando necessária, incluindo reabertura.
- [ ] API/banco integrados e validados quando necessários.
- [ ] Testes adicionados/atualizados; testes existentes continuam passando.
- [ ] Lint/typecheck sem regressão; baselines não ampliadas; `git diff --check` aprovado.
- [ ] CI Mobile e Backend verdes.
- [ ] Documentação atualizada e limites conhecidos explícitos.
- [ ] PR revisado e mergeado em `dev`.
- [ ] Branch removida quando seguro.

Referências: [DoD do projeto](../processo/definition-of-done.md) e
[Git Flow](../processo/git-flow.md). O incremento da Sprint só é encerrado com
resultado rastreável do Goal/core, ou replanejamento explícito de itens não
concluídos, preservando riscos e pendências. Stretch não é condição para cumprir
os 37 pontos planejados do core.

## Estado do planejamento e práticas do repositório

- As cinco Issues permanecem abertas e **não iniciadas**. A formalização é documental, sem feature branch, instalação de dependências ou execução de migrations.
- O desenvolvimento futuro segue o Git Flow: base `dev` limpa/atualizada, branch por Issue, Conventional Commits e PR para `dev` com referência à Issue, critérios e evidências. Integração por revisão, sem merge automático ou desenvolvimento direto em `dev`/`main`.
- As labels existentes e o milestone nº 2 identificam a Sprint. `priority-high` em #39, `priority-medium` no restante do core e `priority-low` no stretch. Nenhuma label nova foi criada.
- **Dados de teste preservados.** A limpeza para apresentação fica para depois da Sprint 2, mediante aprovação específica e respeitando a data limite do freeze; alterações posteriores ao freeze estão excluídas.
- Resultado da formalização: planejamento documentado e Issues registradas; implementação funcional e promoção `dev → main` permanecem fora do escopo.

### Atualização de cronograma — 29/10/2026

O professor prorrogou a data máxima de commit e push para **08/11/2026**.
O prazo anterior de **01/11/2026** foi substituído. A validação Android manual
e o fechamento da Issue #39 continuam sendo etapas separadas.

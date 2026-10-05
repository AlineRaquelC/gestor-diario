# Plano de Entregas — Gestor Diário

## 1. Identificação

- **Produto:** Gestor Diário
- **Base de requisitos:** `docs/requisitos/requisitos-oficiais.md`
- **Base de planejamento:** `docs/backlog/backlog-produto.md`
- **Plataforma:** Android
- **Mobile:** React Native + TypeScript
- **Backend atual:** Node.js + TypeScript / Express
- **Método de trabalho:** Scrum, Git/GitHub, Pull Requests, CI/CD e documentação versionada

> **Importante:** a divisão em três entregas é uma **decisão de planejamento do projeto** para organizar a execução dos requisitos oficiais. Ela não substitui o documento de requisitos e não deve ser apresentada como uma divisão definida pelo professor.

---

# 2. Estratégia geral de evolução

O projeto será desenvolvido de forma incremental, evoluindo de um núcleo funcional de gerenciamento de tarefas para recursos de produtividade, automação, sincronização avançada e, por fim, integrações com hardware e contexto do dispositivo.

A estratégia é:

```text
Entrega 1
MVP funcional e integrado
        ↓
Entrega 2
Produtividade, automação e sincronização avançada
        ↓
Entrega 3
Hardware, Android e contexto do dispositivo
```

Cada entrega deve resultar em um incremento executável, demonstrável e versionado.

---

# 3. Entrega 1 — MVP funcional e integrado

## Status atual — 2026-10-04

**Sprint 1 EM ANDAMENTO: 15 Issues planejadas, 11 concluídas, 4 pendentes; 11/15 = 73,3%.**

Fonte: consulta direta às 15 Issues do milestone Sprint 1 e aos PRs mergeados em `dev` no [GitHub](https://github.com/AlineRaquelC/gestor-diario/issues?q=milestone%3A%22Sprint+1%22), em 2026-10-04. Os estados coincidem com os esperados; não houve divergência. Referência integrada: PR #29, commit `5ccf2b99625def77701a36a8f58e9e0997b4dfd7`.

| Issue | Entrega realizada | PR integrado em dev |
|---|---|---|
| [#1](https://github.com/AlineRaquelC/gestor-diario/issues/1) | Base técnica da mini API Node.js — Concluída | [#14](https://github.com/AlineRaquelC/gestor-diario/pull/14) |
| [#2](https://github.com/AlineRaquelC/gestor-diario/issues/2) | Schema SQLite e migrations — Concluída | [#15](https://github.com/AlineRaquelC/gestor-diario/pull/15) |
| [#3](https://github.com/AlineRaquelC/gestor-diario/issues/3) | Gerenciar projetos — Concluída | [#16](https://github.com/AlineRaquelC/gestor-diario/pull/16) |
| [#4](https://github.com/AlineRaquelC/gestor-diario/issues/4) | Criar e persistir tarefas — Concluída | [#17](https://github.com/AlineRaquelC/gestor-diario/pull/17) |
| [#5](https://github.com/AlineRaquelC/gestor-diario/issues/5) | Consultar e visualizar tarefas — Concluída | [#23](https://github.com/AlineRaquelC/gestor-diario/pull/23) |
| [#6](https://github.com/AlineRaquelC/gestor-diario/issues/6) | Editar tarefas — Concluída | [#24](https://github.com/AlineRaquelC/gestor-diario/pull/24) |
| [#7](https://github.com/AlineRaquelC/gestor-diario/issues/7) | Status, conclusão e histórico — Concluída | [#25](https://github.com/AlineRaquelC/gestor-diario/pull/25) |
| [#8](https://github.com/AlineRaquelC/gestor-diario/issues/8) | Subtarefas e progresso — Concluída | [#26](https://github.com/AlineRaquelC/gestor-diario/pull/26) |
| [#9](https://github.com/AlineRaquelC/gestor-diario/issues/9) | Múltiplas observações — Concluída | [#27](https://github.com/AlineRaquelC/gestor-diario/pull/27) |
| [#11](https://github.com/AlineRaquelC/gestor-diario/issues/11) | Dashboard com dados reais — Concluída | [#28](https://github.com/AlineRaquelC/gestor-diario/pull/28) |
| [#20](https://github.com/AlineRaquelC/gestor-diario/issues/20) | Calendário do MVP — Concluída | [#29](https://github.com/AlineRaquelC/gestor-diario/pull/29) |

Pendentes (Issues abertas):

- [#10](https://github.com/AlineRaquelC/gestor-diario/issues/10): exclusão lógica com confirmação e desfazer.
- [#12](https://github.com/AlineRaquelC/gestor-diario/issues/12): sincronização manual geral e migração/reconciliação dos dados locais legados.
- [#13](https://github.com/AlineRaquelC/gestor-diario/issues/13): pipeline CI inicial.
- [#21](https://github.com/AlineRaquelC/gestor-diario/issues/21): filtros e ordenação completos do MVP.

#11 e #20 foram priorizadas antes de #10 para preparar um incremento visual demonstrável para a apresentação de 2026-10-05 pela manhã. Isso altera a ordem de execução, não o escopo nem o estado das Issues. #10 continua pendente; Sprint 1 e Entrega 1 permanecem em andamento.

Funcionalidades demonstráveis: projetos na API, criação/consulta/listagem/detalhes/edição de tarefas, status, conclusão/reabertura, histórico, subtarefas e progresso, múltiplas observações, dashboard e calendário reais. Dados novos persistem em SQLite; AsyncStorage apoia cache e offline parcial. Validação Android registrada nos documentos de integração. A Entrega 1 não está concluída: permanecem #10, #12, #13 e #21.

## Status histórico em 2026-10-03 — Entrega 1

**Em andamento.** Sprint 1 refinada: 4/15 Issues concluídas (26,7%); próxima: #5 — Consultar e visualizar tarefas, ainda não iniciada.

Concluídos: base da API Node.js (#1 / PR #14), SQLite + Drizzle + migrations (#2 / PR #15), CRUD de projetos (#3 / PR #16) e criação de tarefas integrada Android → API → SQLite (#4 / PR #17).
Teste manual Android aprovado para criação, persistência, cache após reabertura e rejeição correta com backend desligado.
Consulta/edição/exclusão de Tasks e sincronização geral permanecem pendentes. Os demais escopos e a divisão das entregas são preservados.

PBI-05 (RF06/RF07) e PBI-10 (RF48/RF50) passaram a fazer parte formal do trabalho rastreado da Sprint 1 após auditoria/refinamento, via [#20 — Calendário do MVP](https://github.com/AlineRaquelC/gestor-diario/issues/20) e [#21 — Filtros e ordenação](https://github.com/AlineRaquelC/gestor-diario/issues/21). Nenhum requisito foi criado pela auditoria: os itens já pertenciam ao MVP, com escopo, prioridade e divisão das entregas preservados.

O planejamento inicial possuía 13 Issues e registrava 4/13 = 30,8%. O novo percentual 4/15 = 26,7% resulta da formalização desses dois itens, não de perda de trabalho. A Entrega 1 continua em andamento. Integridade de projetos foi absorvida em #6/#12; nenhuma terceira Issue será criada neste refinamento.

## 3.1 Objetivo

Entregar o núcleo funcional do Gestor Diário, consolidando o fluxo principal de gerenciamento de tarefas e estabelecendo a primeira integração entre o aplicativo React Native, a mini API Node.js e a camada de persistência em banco de dados.

## 3.2 Resultado esperado

Ao final da Entrega 1, a pessoa usuária deverá conseguir:

- criar tarefas;
- editar tarefas;
- excluir tarefas com confirmação;
- desfazer exclusão por curto período;
- controlar o status da tarefa;
- consultar histórico básico de alterações;
- visualizar tarefas por dia, semana e mês;
- criar subtarefas;
- acompanhar progresso por subtarefas;
- registrar múltiplas observações;
- organizar tarefas por projetos/etiquetas;
- visualizar indicadores no dashboard;
- filtrar e ordenar tarefas;
- sincronizar manualmente com um servidor local Node.js.

## 3.3 PBIs da Entrega 1

| PBI | Capacidade | Requisitos de origem | Áreas |
|---|---|---|---|
| **PBI-01** | Criar tarefa com dados obrigatórios e validação | RF01 | Front / Backend / Banco |
| **PBI-02** | Editar tarefa e registrar última modificação | RF03 | Front / Backend / Banco |
| **PBI-03** | Excluir tarefa com confirmação e desfazer | RF04 | Front / Backend / Banco |
| **PBI-04** | Controlar status e histórico da tarefa | RF05, RF17 | Front / Backend / Banco |
| **PBI-05** | Visualizar tarefas por dia, semana e mês | RF06, RF07 | Front |
| **PBI-06** | Criar subtarefas e calcular progresso | RF09, RF10 | Front / Backend / Banco |
| **PBI-07** | Registrar múltiplas observações por tarefa | RF11 | Front / Backend / Banco |
| **PBI-08** | Organizar tarefas em projetos/etiquetas | RF12 | Front / Backend / Banco |
| **PBI-09** | Exibir dashboard de produtividade | RF23 | Front / Backend |
| **PBI-10** | Filtrar e ordenar tarefas | RF48, RF50 | Front / Backend |
| **PBI-11** | Sincronizar manualmente com servidor Node.js | RF20 | Front / Backend / Banco |

## 3.4 Enablers técnicos obrigatórios

Os itens abaixo são necessários para viabilizar os PBIs da Entrega 1, mas são decisões de engenharia do projeto e não requisitos textuais do professor.

| ID | Item | Área |
|---|---|---|
| **TEC-01** | Estruturar a mini API Node.js | Backend |
| **TEC-02** | Definir e documentar o banco de dados do MVP | Banco / Arquitetura |
| **TEC-03** | Modelar Task, Project/Tag, Subtask, Note e History | Banco / Backend |
| **TEC-04** | Criar camada de services HTTP no mobile | Front / Arquitetura |
| **TEC-05** | Definir estratégia AsyncStorage ↔ servidor | Arquitetura |
| **TEC-06** | Reaplicar validações de negócio no backend | Backend |
| **TEC-07** | Padronizar tratamento de erros da API | Backend / Front |
| **TEC-08** | Adicionar testes mínimos do CRUD e regras críticas | Testes |
| **TEC-09** | Configurar CI inicial para TypeScript, lint e testes | DevOps |
| **TEC-10** | Manter rastreabilidade requisito → PBI → Issue → PR → teste | Documentação / DevOps |

## 3.5 Arquitetura alvo da Entrega 1

```text
React Native
    ↓
Context / State
    ↓
Services HTTP
    ↓
API REST
    ↓
Node.js
    ↓
Banco de Dados
```

O `AsyncStorage` pode permanecer como persistência local/cache, desde que a arquitetura defina claramente a fonte de verdade e o comportamento de sincronização.

## 3.6 Critérios de conclusão da Entrega 1

A Entrega 1 somente deve ser considerada concluída quando:

- [ ] PBIs 01 a 11 atendidos ou formalmente aceitos como concluídos;
- [ ] aplicação Android executando sem erro bloqueante;
- [ ] mini API Node.js executando;
- [ ] banco definido e persistindo dados do MVP;
- [ ] CRUD principal integrado de ponta a ponta;
- [ ] sincronização manual funcionando;
- [ ] persistência local preservada quando aplicável;
- [ ] regras críticas de datas e validação atendidas;
- [ ] testes mínimos executados;
- [ ] CI inicial funcionando;
- [ ] documentação atualizada;
- [ ] código versionado por Pull Request conforme o fluxo do projeto.

---

# 4. Entrega 2 — Produtividade, automação e sincronização avançada

## 4.1 Objetivo

Evoluir o núcleo funcional com recursos de produtividade, recorrência, notificações, personalização, backup, relatórios, automação e sincronização mais robusta.

## 4.2 Escopo funcional

A Entrega 2 será composta pelos seguintes PBIs:

| PBI | Capacidade | Requisitos de origem |
|---|---|---|
| **PBI-12** | Priorização inteligente e prioridades personalizadas | RF02, RF24, RF63, RF64, RF65, REQ120–REQ122 |
| **PBI-13** | Tarefas recorrentes, lembretes e notificações | RF08, RF15, RF16, RF43, RF44, RF45, REQ114–REQ116 |
| **PBI-14** | Busca, ordenação manual, filtros salvos e favoritos | RF13, RF14, RF49, RF51 |
| **PBI-15** | Exportar/importar dados, backup, integridade e migração | RF18, RF19, RF58, RF59, RF60, RF61, RF77, RF78 |
| **PBI-16** | Sincronização automática, API segura e múltiplos servidores | RF21, RF79, RF80, REQ081, REQ192 |
| **PBI-17** | Metas, relatórios e métricas locais | RF22, RF46, RF47, REQ084, REQ085, REQ111 |
| **PBI-18** | Tema, acessibilidade e personalização visual | RF25, RF26, RF27, RF71, RF72, REQ112 |
| **PBI-19** | Perfis locais e tarefas compartilhadas | RF33, RF34 |
| **PBI-20** | Duplicação, modelos e dependências entre tarefas | RF35, RF36, RF37, REQ117–REQ119 |
| **PBI-21** | Linha do tempo, estimativas, cronômetro e conflitos de agenda | RF38, RF39, RF40, RF41, RF42, REQ123–REQ126 |
| **PBI-22** | Operações em lote, arquivamento e campos personalizados | RF66, RF67, RF68, RF69, RF70, REQ109, REQ110 |
| **PBI-23** | Prazos úteis, feriados, atrasos e revisão semanal | REQ086–REQ092, REQ113 |
| **PBI-24** | Anexos, links, áudio, compartilhamento e impressão | RF52–RF57, REQ102–REQ106, REQ127–REQ132 |

## Gap observado / item para refinamento — Sprint 2 / PBI-13

Observação do teste manual, vinculada ao planejamento da Entrega 2, PBI-13 (RF15/RF16): ao criar uma tarefa para o dia atual, o aplicativo ainda pode permitir horário já passado. Com lembrete de 15 minutos antes, horário da tarefa menos antecedência também pode resultar em disparo no passado.

Pontos a refinar na Sprint 2:

- tarefa do dia atual deve utilizar horário futuro quando aplicável;
- antecedência do lembrete não deve produzir disparo no passado;
- UI deve apresentar mensagem compreensível;
- validação deverá existir na camada adequada quando o recurso for persistido.

Este é um gap observado / item para refinamento, não um novo requisito oficial, compromisso da Sprint 1 ou funcionalidade implementada. Requisitos, prioridades e divisão das entregas permanecem preservados.

## 4.3 Resultado esperado

Ao final da Entrega 2, o Gestor Diário deverá possuir uma experiência mais completa de produtividade, com:

- automação de prioridade;
- recorrência;
- lembretes e notificações locais;
- busca e favoritos;
- filtros salvos;
- exportação/importação;
- backup e restauração;
- sincronização automática;
- métricas, metas e relatórios;
- acessibilidade e personalização;
- perfis e compartilhamento local;
- dependências e modelos;
- controle de tempo e conflitos de agenda;
- operações em lote e arquivamento.

## 4.4 Critérios de conclusão da Entrega 2

- [ ] PBIs 12 a 24 concluídos ou formalmente aceitos;
- [ ] funcionalidades integradas à arquitetura definida na Entrega 1;
- [ ] sincronização automática validada;
- [ ] backup/restauração testados;
- [ ] notificações e recorrência testadas em Android;
- [ ] testes e CI atualizados;
- [ ] documentação e rastreabilidade mantidas.

---

# 5. Entrega 3 — Hardware, Android e contexto do dispositivo

## 5.1 Objetivo

Implementar os recursos avançados que dependem de hardware, APIs Android, sensores, biometria, localização, integração com o sistema operacional e adaptação contextual.

## 5.2 Escopo funcional

| PBI | Capacidade | Requisitos de origem |
|---|---|---|
| **PBI-25** | Voz, câmera, OCR, QR Code e NFC | RF28, RF29, RF30, RF75, REQ141–REQ146 |
| **PBI-26** | GPS, mapas, geofencing e lembretes por localização | RF31, RF32, RF62, RF76, REQ093, REQ133, REQ147–REQ150 |
| **PBI-27** | Integrações Android, calendário, rede e eventos do sistema | RF73, RF74, REQ094–REQ100, REQ107, REQ108, REQ129–REQ132, REQ151–REQ158 |
| **PBI-28** | Automação por contexto de uso e conectividade | REQ134–REQ140 |
| **PBI-29** | Sensores ambientais, movimento e saúde | REQ159–REQ174 |
| **PBI-30** | Biometria e acesso contextual a tarefas sensíveis | REQ175–REQ180 |
| **PBI-31** | Adaptação por contexto pessoal, social e ambiental | REQ181–REQ202 |
| **PBI-32** | Segurança, privacidade, resiliência e contexto operacional | REQ203–REQ220 |
| **PBI-33** | Saúde, acessibilidade, internacionalização e regras locais contextuais | REQ221–REQ228 |
| **PBI-34** | Energia, desempenho, rede, consentimento, auditoria e contingência | REQ229–REQ246 |
| **PBI-35** | Requisitos contextuais repetidos presentes no trecho oficial | REQ247–REQ276 |

## 5.3 Resultado esperado

Ao final da Entrega 3, o Gestor Diário deverá incorporar, conforme viabilidade e priorização dos requisitos:

- comandos de voz;
- captura de imagem;
- OCR;
- QR Code e NFC;
- GPS e mapas;
- geofencing;
- integrações com Android;
- sensores ambientais e de movimento;
- biometria;
- automações contextuais;
- requisitos de segurança, privacidade, resiliência, acessibilidade e internacionalização associados ao uso do dispositivo.

## 5.4 Critérios de conclusão da Entrega 3

- [ ] PBIs 25 a 35 concluídos ou formalmente aceitos;
- [ ] permissões Android tratadas corretamente;
- [ ] recursos de hardware testados em dispositivo compatível;
- [ ] tratamento de ausência/indisponibilidade de sensores implementado quando aplicável;
- [ ] requisitos de segurança e privacidade revisados;
- [ ] build Android validado;
- [ ] documentação final atualizada.

---

# 6. Dependências entre entregas

A divisão segue uma dependência progressiva:

```text
Entrega 1
Core + API + Banco
       ↓
Entrega 2
Produtividade + automação + sincronização avançada
       ↓
Entrega 3
Hardware + contexto + integrações Android
```

### Dependências principais

- A Entrega 2 depende da arquitetura e da persistência definidas na Entrega 1.
- A sincronização automática da Entrega 2 depende da sincronização manual e da API criadas na Entrega 1.
- Recursos contextuais da Entrega 3 podem reutilizar regras, serviços e persistência construídos nas Entregas 1 e 2.
- Requisitos de segurança e privacidade devem ser considerados desde a Entrega 1, ainda que alguns PBIs específicos estejam posicionados na Entrega 3.

---

# 7. Distribuição por área técnica

| Área | Entrega 1 | Entrega 2 | Entrega 3 |
|---|---|---|---|
| **Front-end** | Fluxo principal, dashboard, calendário, projetos, filtros | Produtividade, relatórios, personalização, anexos | Mapas, sensores, contexto, integrações Android |
| **Backend** | CRUD, validações, histórico, sincronização manual | Automação, relatórios, backup, sincronização automática | Processamento contextual, segurança e integrações |
| **Banco** | Task, Project/Tag, Subtask, Note, History | Recorrência, perfis, templates, backup, preferências | Dados contextuais, auditoria, sensores quando aplicável |
| **Hardware/Android** | Sem escopo central obrigatório | Notificações e recursos Android complementares | GPS, câmera, voz, QR, NFC, biometria, sensores |
| **DevOps** | Repositório, branches, PRs, CI inicial | Evolução do CI e validações | Build final, segurança e validação de artefatos |
| **Testes** | CRUD, regras críticas e integração básica | Recorrência, backup, sincronização e produtividade | Hardware, permissões e contexto |

---

# 8. Relação com Sprints

As entregas são maiores que uma única Sprint.

A execução será feita por Sprints, selecionando apenas PBIs que estejam prontos conforme a Definition of Ready.

A primeira Sprint deverá ser definida em `docs/sprints/sprint-1.md` usando os itens prioritários da Entrega 1 e considerando o estado real do código já existente.

Não se deve assumir que todos os PBIs da Entrega 1 caberão em uma única Sprint sem decomposição e estimativa.

---

# 9. Definition of Done por entrega

Uma entrega somente deve ser marcada como concluída quando:

- [ ] escopo previsto foi implementado ou formalmente renegociado;
- [ ] critérios de aceite foram atendidos;
- [ ] build Android executa;
- [ ] persistência e integrações relacionadas funcionam;
- [ ] testes relevantes foram executados;
- [ ] não há erro bloqueante conhecido;
- [ ] documentação foi atualizada;
- [ ] requisitos estão rastreados até PBIs/Issues/PRs/testes;
- [ ] código foi integrado pelo fluxo Git definido;
- [ ] incremento está demonstrável.

---

# 10. Próximos passos do planejamento inicial — histórico

Após versionar este arquivo:

1. criar/atualizar `docs/sprints/sprint-1.md`;
2. selecionar os PBIs reais da Sprint 1 com base no estado atual do código;
3. decompor os PBIs selecionados em Issues/User Stories/Tasks;
4. definir a arquitetura da mini API Node.js;
5. definir o banco de dados do MVP;
6. configurar o primeiro pipeline de CI da Sprint 1.

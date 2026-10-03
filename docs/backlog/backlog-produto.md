# Product Backlog — Gestor Diário

## 1. Identificação

- **Produto:** Gestor Diário
- **Fonte dos requisitos:** `docs/requisitos/requisitos-oficiais.md`
- **Origem:** exclusivamente as páginas **1 a 35** do PDF fornecido pelo professor
- **Plataforma:** Android
- **Mobile:** React Native + TypeScript
- **Backend previsto:** Node.js
- **Arquitetura prevista:** Mobile → Services/Context → API REST → Node.js → Banco de Dados
- **Método de trabalho:** Scrum, Git/GitHub, Pull Requests, integração contínua e entrega contínua

> **Importante:** os requisitos são oficiais; a transformação em PBIs/User Stories, a prioridade, a divisão em três entregas e o status abaixo são **decisões de planejamento do projeto**. Este arquivo não substitui `requisitos-oficiais.md`; ele organiza os requisitos para execução ágil e mantém referência aos IDs de origem.

---

## 2. Objetivo do produto

Disponibilizar um aplicativo móvel de gerenciamento de tarefas que permita à pessoa usuária criar, organizar, acompanhar e concluir atividades, evoluindo de um núcleo funcional para recursos de produtividade, sincronização com uma mini API Node.js e, posteriormente, integrações com hardware e contexto do dispositivo.

---

## 3. Critério de priorização

| Prioridade | Significado no projeto |
|---|---|
| **Alta** | Necessário para o núcleo funcional/MVP e para a primeira integração Mobile + API + Banco |
| **Média** | Evolução de produtividade, automação, personalização, backup e sincronização avançada |
| **Baixa** | Recursos avançados de hardware, sensores, contexto e integrações específicas do dispositivo |

> **Baixa prioridade não significa requisito dispensável.** Significa apenas que o item foi posicionado para uma entrega posterior.

### Status utilizados

| Status | Significado |
|---|---|
| **Concluído** | Trabalho correspondente concluído e validado |
| **Parcial — Integrado** | Parte do fluxo integrada Mobile → API → SQLite; demais critérios pendentes |
| **Em andamento** | Base técnica disponível, com trabalho restante |
| **Parcial — Mobile** | Há implementação conhecida no aplicativo, mas ainda falta validar critérios oficiais e/ou integrar API/Banco |
| **A validar** | Existe indício de implementação, mas deve ser confirmado no código/testes |
| **Planejado** | Ainda não entrou em implementação |
| **Bloqueado por arquitetura** | Depende da definição/implementação de API, banco ou integração técnica |

---

# 4. Visão consolidada do Product Backlog

| PBI | User Story / Capacidade | Requisitos de origem | Área principal | Prioridade | Entrega | Status atual |
|---|---|---|---|---|---|---|
| **PBI-01** | Criar tarefa com dados obrigatórios e validação | RF01 | Front / Backend / Banco | Alta | 1 | Concluído |
| **PBI-02** | Editar tarefa e registrar última modificação | RF03 | Front / Backend / Banco | Alta | 1 | Parcial — Mobile |
| **PBI-03** | Excluir tarefa com confirmação e desfazer | RF04 | Front / Backend / Banco | Alta | 1 | Parcial — Mobile |
| **PBI-04** | Controlar status e histórico da tarefa | RF05, RF17 | Front / Backend / Banco | Alta | 1 | Parcial — Mobile |
| **PBI-05** | Visualizar tarefas por dia, semana e mês | RF06, RF07 | Front | Alta | 1 | A validar |
| **PBI-06** | Criar subtarefas e calcular progresso | RF09, RF10 | Front / Backend / Banco | Alta | 1 | Parcial — Mobile |
| **PBI-07** | Registrar múltiplas observações por tarefa | RF11 | Front / Backend / Banco | Alta | 1 | Planejado |
| **PBI-08** | Organizar tarefas em projetos/etiquetas | RF12 | Front / Backend / Banco | Alta | 1 | Parcial — Integrado |
| **PBI-09** | Exibir dashboard de produtividade | RF23 | Front / Backend | Alta | 1 | Parcial — Mobile |
| **PBI-10** | Filtrar e ordenar tarefas | RF48, RF50 | Front / Backend | Alta | 1 | A validar |
| **PBI-11** | Sincronizar manualmente com servidor Node.js | RF20 | Front / Backend / Banco | Alta | 1 | Em andamento |
| **PBI-12** | Priorização inteligente e prioridades personalizadas | RF02, RF24, RF63, RF64, RF65, REQ120–REQ122 | Front / Backend / Banco | Média | 2 | Planejado |
| **PBI-13** | Tarefas recorrentes, lembretes e notificações | RF08, RF15, RF16, RF43, RF44, RF45, REQ114–REQ116 | Front / Backend / Banco / Android | Média | 2 | Planejado |
| **PBI-14** | Busca, ordenação manual, filtros salvos e favoritos | RF13, RF14, RF49, RF51 | Front / Backend / Banco | Média | 2 | Planejado |
| **PBI-15** | Exportar/importar dados, backup, integridade e migração | RF18, RF19, RF58, RF59, RF60, RF61, RF77, RF78 | Front / Backend / Banco | Média | 2 | Planejado |
| **PBI-16** | Sincronização automática, API segura e múltiplos servidores | RF21, RF79, RF80, REQ081, REQ192 | Front / Backend / Banco / DevOps | Média | 2 | Planejado |
| **PBI-17** | Metas, relatórios e métricas locais | RF22, RF46, RF47, REQ084, REQ085, REQ111 | Front / Backend / Banco | Média | 2 | Planejado |
| **PBI-18** | Tema, acessibilidade e personalização visual | RF25, RF26, RF27, RF71, RF72, REQ112 | Front / Banco / Android | Média | 2 | Planejado |
| **PBI-19** | Perfis locais e tarefas compartilhadas | RF33, RF34 | Front / Backend / Banco | Média | 2 | Planejado |
| **PBI-20** | Duplicação, modelos e dependências entre tarefas | RF35, RF36, RF37, REQ117–REQ119 | Front / Backend / Banco | Média | 2 | Planejado |
| **PBI-21** | Linha do tempo, estimativas, cronômetro e conflitos de agenda | RF38, RF39, RF40, RF41, RF42, REQ123–REQ126 | Front / Backend / Banco | Média | 2 | Planejado |
| **PBI-22** | Operações em lote, arquivamento e campos personalizados | RF66, RF67, RF68, RF69, RF70, REQ109, REQ110 | Front / Backend / Banco | Média | 2 | Planejado |
| **PBI-23** | Prazos úteis, feriados, atrasos e revisão semanal | REQ086–REQ092, REQ113 | Front / Backend / Banco | Média | 2 | Planejado |
| **PBI-24** | Anexos, links, áudio, compartilhamento e impressão | RF52–RF57, REQ102–REQ106, REQ127–REQ132 | Front / Backend / Banco / Android | Média | 2 | Planejado |
| **PBI-25** | Comandos de voz, câmera, OCR, QR Code e NFC | RF28, RF29, RF30, RF75, REQ141–REQ146 | Front / Hardware / Android | Baixa | 3 | Planejado |
| **PBI-26** | GPS, mapa, geofencing e lembretes por localização | RF31, RF32, RF62, RF76, REQ093, REQ133, REQ147–REQ150 | Front / Hardware / Backend / Banco | Baixa | 3 | Planejado |
| **PBI-27** | Integrações Android, calendário, rede e eventos do sistema | RF73, RF74, REQ094–REQ100, REQ107, REQ108, REQ129–REQ132, REQ151–REQ158 | Front / Android / Hardware / Backend | Baixa | 3 | Planejado |
| **PBI-28** | Automação por contexto de uso e conectividade | REQ134–REQ140 | Front / Backend / Android | Baixa | 3 | Planejado |
| **PBI-29** | Sensores ambientais, movimento e saúde | REQ159–REQ174 | Hardware / Android / Backend | Baixa | 3 | Planejado |
| **PBI-30** | Biometria e acesso contextual a tarefas sensíveis | REQ175–REQ180 | Hardware / Segurança / Android | Baixa | 3 | Planejado |
| **PBI-31** | Adaptação por contexto pessoal, social e ambiental | REQ181–REQ202 | Hardware / Backend / Front | Baixa | 3 | Planejado |
| **PBI-32** | Segurança, privacidade, resiliência e contexto operacional | REQ203–REQ220 | Backend / Banco / Segurança / Android | Baixa | 3 | Planejado |
| **PBI-33** | Saúde, acessibilidade, internacionalização e regras locais contextuais | REQ221–REQ228 | Front / Backend / Hardware | Baixa | 3 | Planejado |
| **PBI-34** | Energia, desempenho, rede, consentimento, auditoria e contingência | REQ229–REQ246 | Backend / Banco / Android / Segurança | Baixa | 3 | Planejado |
| **PBI-35** | Requisitos contextuais repetidos de saúde, acessibilidade, internacionalização e infraestrutura | REQ247–REQ276 | Front / Backend / Hardware / Segurança | Baixa | 3 | Planejado |

---

# 5. Entrega 1 — MVP

## Objetivo

Entregar o núcleo funcional do Gestor Diário e a primeira integração real entre o aplicativo React Native, a mini API Node.js e a camada de persistência em banco de dados.

## Escopo funcional da Entrega 1

### PBI-01 — Criar tarefa

**User Story**  
Como pessoa usuária, quero criar uma tarefa informando seus dados principais para registrar uma atividade que preciso realizar.

**Origem:** RF01  
**Prioridade:** Alta  
**Áreas:** Front / Backend / Banco

**Critérios de aceite derivados do requisito:**

- permitir informar título;
- permitir informar descrição;
- permitir informar data de início;
- permitir informar prazo final;
- permitir informar prioridade;
- validar campos obrigatórios;
- apresentar mensagens de erro claras;
- persistir os dados da tarefa.

**Status atual:** criação integrada Android → API → SQLite concluída (Issue #4, PR #17), com validação manual aprovada e cache preservado.

---

### PBI-02 — Editar tarefa

**User Story**  
Como pessoa usuária, quero editar uma tarefa cadastrada para manter seus dados atualizados.

**Origem:** RF03  
**Prioridade:** Alta  
**Áreas:** Front / Backend / Banco

**Critérios de aceite:**

- permitir alterar os dados da tarefa;
- incluir prioridade, prazo, descrição e status;
- registrar data/hora da última modificação;
- refletir a alteração imediatamente nas telas relacionadas;
- persistir a alteração.

**Situação inicial:** edição funcional no mobile; última modificação e persistência via API/Banco ainda precisam ser confirmadas/implementadas.

---

### PBI-03 — Excluir tarefa e desfazer

**User Story**  
Como pessoa usuária, quero excluir uma tarefa com segurança para remover atividades que não preciso mais acompanhar.

**Origem:** RF04  
**Prioridade:** Alta  
**Áreas:** Front / Backend / Banco

**Critérios de aceite:**

- solicitar confirmação antes da exclusão;
- remover a tarefa das listagens;
- permitir desfazer a exclusão por curto período;
- utilizar armazenamento temporário para viabilizar o desfazer;
- manter consistência entre mobile, API e banco.

**Situação inicial:** exclusão com confirmação existe no mobile; o recurso de desfazer ainda é um gap conhecido.

---

### PBI-04 — Status e histórico

**User Story**  
Como pessoa usuária, quero controlar o estado de uma tarefa e consultar seu histórico para acompanhar sua evolução.

**Origem:** RF05, RF17  
**Prioridade:** Alta  
**Áreas:** Front / Backend / Banco

**Critérios de aceite:**

- suportar estados concluída, parcial e pendente conforme a especificação;
- atualizar imediatamente a lista após mudança de estado;
- registrar histórico de conclusão;
- registrar criação, edição, conclusão e exclusão com data/hora.

**Situação inicial:** o mobile possui controle de status, mas os estados oficiais e o histórico completo precisam ser alinhados ao requisito.

---

### PBI-05 — Visualizações diária, semanal e mensal

**User Story**  
Como pessoa usuária, quero visualizar minhas tarefas por diferentes períodos para organizar melhor minha rotina.

**Origem:** RF06, RF07  
**Prioridade:** Alta  
**Área:** Front

**Critérios de aceite:**

- visão diária;
- agrupamento diário por manhã, tarde e noite usando o horário da tarefa;
- visão semanal;
- visão mensal;
- destaque visual de prazos próximos;
- destaque visual de tarefas atrasadas;
- utilização de componentes de calendário quando aplicável.

**Situação inicial:** deve ser validada no aplicativo atual antes de marcar como concluída.

---

### PBI-06 — Subtarefas e progresso

**User Story**  
Como pessoa usuária, quero dividir uma tarefa em subtarefas e acompanhar seu percentual de conclusão.

**Origem:** RF09, RF10  
**Prioridade:** Alta  
**Áreas:** Front / Backend / Banco

**Critérios de aceite:**

- adicionar subtarefas a uma tarefa;
- acompanhar conclusão individual;
- persistir subtarefas;
- calcular automaticamente o percentual da tarefa com base nas subtarefas concluídas.

**Situação inicial:** funcionalidade conhecida no mobile; integração e cálculo devem ser validados ponta a ponta.

---

### PBI-07 — Observações da tarefa

**User Story**  
Como pessoa usuária, quero registrar múltiplas observações em uma tarefa para guardar informações complementares ao longo do tempo.

**Origem:** RF11  
**Prioridade:** Alta  
**Áreas:** Front / Backend / Banco

**Critérios de aceite:**

- adicionar múltiplas anotações;
- manter cada anotação separada;
- registrar data de criação da observação;
- persistir as observações.

**Situação inicial:** a descrição simples da tarefa não substitui integralmente este requisito.

---

### PBI-08 — Projetos/etiquetas

**User Story**  
Como pessoa usuária, quero categorizar tarefas em projetos ou etiquetas para organizar minhas atividades.

**Origem:** RF12  
**Prioridade:** Alta  
**Áreas:** Front / Backend / Banco

**Critérios de aceite:**

- associar tarefa a projeto ou etiqueta;
- permitir categorias personalizadas;
- filtrar por categoria;
- preservar vínculo após edição;
- persistir as relações.

**Status atual:** parcialmente integrado. CRUD de projetos na API/SQLite concluído (Issue #3, PR #16), com vínculo remoto na criação de tarefas. Integração geral do gerenciamento mobile e demais critérios do PBI permanecem pendentes.

---

### PBI-09 — Dashboard de produtividade

**User Story**  
Como pessoa usuária, quero visualizar indicadores de produtividade para acompanhar meu desempenho.

**Origem:** RF23  
**Prioridade:** Alta  
**Áreas:** Front / Backend

**Critérios de aceite:**

- mostrar tarefas concluídas;
- mostrar tarefas atrasadas;
- mostrar tarefas pendentes;
- permitir análise por período;
- calcular os indicadores a partir dos dados reais.

**Situação inicial:** dashboard existe no mobile; deve ser alinhado aos indicadores oficiais e à fonte de dados definitiva.

---

### PBI-10 — Filtros e ordenação

**User Story**  
Como pessoa usuária, quero filtrar e ordenar tarefas para localizar rapidamente o que preciso executar.

**Origem:** RF48, RF50  
**Prioridade:** Alta  
**Áreas:** Front / Backend

**Critérios de aceite:**

- filtrar por status;
- filtrar por prioridade;
- filtrar por etiqueta;
- filtrar por projeto;
- filtrar por período;
- ordenar por múltiplos critérios;
- suportar direção ascendente e descendente.

**Situação inicial:** deve ser validada no código atual.

---

### PBI-11 — Sincronização manual com Node.js

**User Story**  
Como pessoa usuária, quero sincronizar minhas tarefas com um servidor local para manter os dados persistidos também fora do aplicativo.

**Origem:** RF20  
**Prioridade:** Alta  
**Áreas:** Front / Backend / Banco

**Critérios de aceite:**

- existir servidor local baseado em Node.js;
- comunicação por requisições HTTP;
- persistência no servidor em arquivo ou banco de dados aberto;
- permitir sincronização manual;
- tratar sucesso e falha de sincronização;
- não perder os dados locais em caso de indisponibilidade do servidor.

**Status atual:** em andamento. API, SQLite e comunicação HTTP para criação de tarefas disponíveis; sincronização manual/geral ainda não implementada.

---

# 6. Itens técnicos necessários à Entrega 1

Os itens abaixo são **enablers técnicos de planejamento**. Eles não são apresentados como requisitos textuais do professor, mas são necessários para implementar e demonstrar os PBIs da Entrega 1.

| ID técnico | Item | Área | Prioridade | Status |
|---|---|---|---|---|
| **TEC-01** | Estruturar a mini API Node.js do Gestor Diário | Backend | Alta | Concluído |
| **TEC-02** | Definir e documentar o banco de dados do MVP | Banco / Arquitetura | Alta | Concluído |
| **TEC-03** | Modelar Task, Project/Tag, Subtask, Note e History | Banco / Backend | Alta | Concluído |
| **TEC-04** | Criar camada `services` no mobile para comunicação HTTP | Front / Arquitetura | Alta | Em andamento |
| **TEC-05** | Definir estratégia entre AsyncStorage e servidor para evitar duas fontes de verdade conflitantes | Arquitetura | Alta | Em andamento |
| **TEC-06** | Implementar validações de negócio também no backend | Backend | Alta | Em andamento |
| **TEC-07** | Implementar tratamento padronizado de erros da API | Backend / Front | Alta | Em andamento |
| **TEC-08** | Adicionar testes mínimos do CRUD e regras críticas | Testes | Alta | Em andamento |
| **TEC-09** | Configurar CI inicial para TypeScript/lint/testes | DevOps | Alta | Planejado |
| **TEC-10** | Manter documentação e rastreabilidade requisito → PBI → Issue → PR → teste | Documentação / DevOps | Alta | Em andamento |

---

TEC-04 a TEC-08 avançaram no fluxo de projetos/criação de tarefas; seus escopos gerais permanecem em andamento. A Entrega 1 continua em andamento; a Sprint 1 registra 4/13 Issues concluídas (30,8%).

# 7. Entrega 2 — Produtividade, automação e sincronização avançada

## Objetivo

Evoluir o núcleo do aplicativo com recursos de busca, recorrência, lembretes, automação, relatórios, personalização, backup e sincronização mais robusta.

### Escopo planejado

- **PBI-12:** priorização inteligente e prioridades personalizadas;
- **PBI-13:** recorrência, lembretes e notificações;
- **PBI-14:** busca, ordenação manual, filtros salvos e favoritos;
- **PBI-15:** importação/exportação, backup, integridade e migração;
- **PBI-16:** sincronização automática, resolução de conflitos, API segura e múltiplos servidores;
- **PBI-17:** metas, relatórios e métricas locais;
- **PBI-18:** tema, acessibilidade e personalização visual;
- **PBI-19:** perfis locais e tarefas compartilhadas;
- **PBI-20:** duplicação, modelos e dependências;
- **PBI-21:** tempo, cronômetro, esforço e conflitos de agenda;
- **PBI-22:** operações em lote, arquivamento e campos personalizados;
- **PBI-23:** prazos úteis, feriados, atrasos e revisão semanal;
- **PBI-24:** anexos, links, áudio, compartilhamento e impressão.

---

# 8. Entrega 3 — Hardware, Android e contexto do dispositivo

## Objetivo

Implementar os recursos avançados dependentes de hardware, APIs Android, sensores, biometria, localização e adaptação contextual.

### Escopo planejado

- **PBI-25:** voz, câmera, OCR, QR Code e NFC;
- **PBI-26:** GPS, mapas e geofencing;
- **PBI-27:** integrações Android, calendário, rede e eventos do sistema;
- **PBI-28:** automação por contexto de uso e conectividade;
- **PBI-29:** sensores ambientais, movimento e saúde;
- **PBI-30:** biometria e acesso contextual;
- **PBI-31:** adaptação por contexto pessoal, social e ambiental;
- **PBI-32:** segurança, privacidade, resiliência e contexto operacional;
- **PBI-33:** saúde, acessibilidade, internacionalização e regras locais;
- **PBI-34:** energia, desempenho, rede, consentimento, auditoria e contingência;
- **PBI-35:** requisitos contextuais repetidos presentes no trecho oficial.

---

# 9. Rastreabilidade dos requisitos adicionais REQ081–REQ276

Os requisitos adicionais permanecem preservados no catálogo oficial. Para execução ágil, foram agrupados em PBIs relacionados, sem alterar o texto de origem.

| Requisitos | PBI relacionado | Entrega |
|---|---|---|
| REQ081 | PBI-16 — conflito de sincronização | 2 |
| REQ082–REQ085 | PBI-15 / PBI-17 — manutenção, armazenamento e métricas/privacidade | 2 |
| REQ086–REQ092 | PBI-23 — notificações por calendário útil, feriados, atrasos e revisão | 2 |
| REQ093 | PBI-26 — localização | 3 |
| REQ094–REQ099 | PBI-27 — NFC, Bluetooth, calendário, e-mail e redes abertas | 3 |
| REQ100–REQ101 | PBI-14 / PBI-12 — linguagem natural e sugestão de etiquetas | 2 |
| REQ102–REQ106 | PBI-24 — anexos e visualização | 2 |
| REQ107–REQ108 | PBI-27 — atalhos/gestos | 3 |
| REQ109–REQ110 | PBI-22 — campos personalizados e validação | 2 |
| REQ111–REQ113 | PBI-17 / PBI-18 / PBI-23 — relatórios, temas e prazos relativos | 2 |
| REQ114–REQ116 | PBI-13 — notificações e escalonamento de lembretes | 2 |
| REQ117–REQ119 | PBI-20 — dependências | 2 |
| REQ120–REQ122 | PBI-12 — prioridade calculada e reorganização | 2 |
| REQ123–REQ126 | PBI-21 — esforço, limites e pausas | 2 |
| REQ127–REQ132 | PBI-24 — links, contatos e comunicação | 2 |
| REQ133–REQ140 | PBI-26 / PBI-28 — contexto de localização, clima, movimento, bateria e conectividade | 3 |
| REQ141–REQ146 | PBI-25 — voz, OCR, QR e NFC | 3 |
| REQ147–REQ150 | PBI-26 — geofencing e permanência em locais | 3 |
| REQ151–REQ158 | PBI-27 — dispositivos, redes e eventos do sistema | 3 |
| REQ159–REQ174 | PBI-29 — sensores ambientais, movimento e saúde | 3 |
| REQ175–REQ180 | PBI-30 — biometria e acesso sensível | 3 |
| REQ181–REQ202 | PBI-31 — contexto pessoal, social, físico e ambiental | 3 |
| REQ203–REQ220 | PBI-32 — segurança, privacidade, disponibilidade e emergência | 3 |
| REQ221–REQ228 | PBI-33 — saúde, acessibilidade, internacionalização e legislação | 3 |
| REQ229–REQ246 | PBI-34 — energia, desempenho, armazenamento, rede, auditoria e contingência | 3 |
| REQ247–REQ276 | PBI-35 — continuação/repetição dos requisitos contextuais do trecho oficial | 3 |

---

# 10. Definition of Ready — referência para entrada em Sprint

Um PBI está pronto para entrar em uma Sprint quando:

- [ ] possui requisitos de origem identificados;
- [ ] possui User Story/capacidade claramente descrita;
- [ ] possui critérios de aceite suficientes;
- [ ] dependências principais foram identificadas;
- [ ] área técnica responsável está indicada;
- [ ] não há dúvida de escopo que impeça implementação;
- [ ] tamanho é compatível com a Sprint ou foi decomposto em tarefas.

---

# 11. Definition of Done — referência do Product Backlog

Um item somente deve ser marcado como concluído quando:

- [ ] critérios de aceite atendidos;
- [ ] implementação funcional no Android;
- [ ] validações de negócio aplicadas onde necessário;
- [ ] persistência funcionando;
- [ ] integração com API/Banco validada quando fizer parte do item;
- [ ] testes relevantes executados;
- [ ] sem erro bloqueante conhecido;
- [ ] código versionado em branch adequada;
- [ ] commit segue Conventional Commits;
- [ ] Pull Request revisado;
- [ ] documentação/rastreabilidade atualizada;
- [ ] integrado à branch definida no fluxo de desenvolvimento.

---

# 12. Próxima etapa

Após versionar este Product Backlog:

1. criar `docs/backlog/entregas.md` com o detalhamento das três entregas;
2. criar/atualizar `docs/sprints/sprint-1.md` somente com os PBIs selecionados para a primeira Sprint;
3. decompor os PBIs da Sprint 1 em Issues/User Stories/Tasks;
4. definir a arquitetura da mini API Node.js e do banco;
5. criar branches e Pull Requests seguindo o processo documentado.


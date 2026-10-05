# Sprint 1 — Gestor Diário

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

### Resultados técnicos já entregues

Mini API Node.js + TypeScript, Express, validação Zod, SQLite, Drizzle ORM e migrations; CRUD de projetos na API; Tasks create/read/update; status, conclusão/reabertura e histórico; Subtasks e progresso automático; Notes; Dashboard e Calendário Dia/Semana/Mês com dados reais.

Arquitetura utilizada:

```text
React Native + TypeScript
    ↓
Context / State
    ↓
Services HTTP
    ↓
API REST Node.js / Express
    ↓
Services / Repositories
    ↓
Drizzle ORM
    ↓
SQLite

AsyncStorage
    ↓
cache/apoio local durante a transição
```

Tarefas novas dos fluxos integrados já operam Mobile → API → SQLite. AsyncStorage permanece como cache/apoio; isso não significa sincronização geral pronta. O gerenciamento geral de projetos no mobile continua sujeito à reconciliação da #12.

### Validação e dívidas conhecidas

- Backend: 258 testes em 9 arquivos, typecheck e build aprovados no [registro de Notes](../arquitetura/integracao-observacoes.md).
- Mobile: 216 testes focados em 14 suítes aprovados; lint dos quatro arquivos de código/testes do calendário com zero erros e zero avisos; `git diff --check` aprovado. Evidências no [Calendário](../arquitetura/calendario-mvp.md) e na revisão do PR #29.
- Android validado nos fluxos integrados, incluindo Dia/Semana/Mês, detalhes, edição de data sem reload, vazio e persistência após reabertura. Resultados anteriores registrados, sem reexecução nesta atualização documental.
- Permanecem os mesmos 14 erros globais TypeScript preexistentes, sem novo diagnóstico no calendário.
- Jest global legado: conflito com testes Vitest do backend e ESM de React Navigation em App.test.tsx; os testes focados acima passam.
- Quatro alertas moderados conhecidos na cadeia do Drizzle Kit e avisos/dívidas de lint preexistentes em outras telas, conforme [status/histórico](../arquitetura/integracao-status-historico.md) e [subtarefas](../arquitetura/integracao-subtarefas-progresso.md). Lint focado limpo não equivale a lint global limpo.

### Tarefas legadas e offline

Tarefas antigas criadas na fase Front-only podem existir exclusivamente no AsyncStorage. Podem ser exibidas, mas algumas mutações remotas podem falhar por não existir registro correspondente no SQLite/API. Migração e reconciliação pertencem à #12; não foram implementadas agora.

Há tratamento de falhas/offline nos fluxos implementados, preservando dados disponíveis e informando falhas remotas. O comportamento offline é parcial e não garante novas mutações remotas sem API ou sincronização geral.

---

## 1. Identificação

- **Produto:** Gestor Diário
- **Entrega associada:** Entrega 1 — MVP
- **Status:** Em andamento
- **Base documental:** `docs/requisitos/requisitos-oficiais.md`, `docs/backlog/backlog-produto.md` e `docs/backlog/entregas.md`
- **Plataforma:** Android
- **Mobile:** React Native + TypeScript
- **Backend atual:** Node.js + TypeScript / Express
- **Banco de dados:** SQLite / Drizzle ORM / migrations
- **Persistência local existente:** AsyncStorage
- **Fluxo de desenvolvimento:** Issue → Branch → Commit → Pull Request → `dev` → testes/CI → Pull Request → `main`

> **Nota de rastreabilidade:** o conteúdo desta Sprint é uma **decisão de planejamento do projeto**. Os requisitos de origem vêm exclusivamente das páginas 1 a 35 do documento fornecido pelo professor. A Sprint não altera nem substitui os requisitos oficiais.

---

## Status histórico em 2026-10-03 — após refinamento

- **Sprint refinada:** 15 Issues planejadas, 4 concluídas e 11 pendentes.
- **Progresso formal naquele momento:** 4/15 = **26,7%**.
- **Concluídas:** #1 (PR #14), #2 (PR #15), #3 (PR #16) e #4 (PR #17).
- **Próxima:** #5 — Consultar e visualizar tarefas; ainda não iniciada.
- Base da API Node.js concluída, com `GET /health` funcionando.
- SQLite + Drizzle + migrations concluídos.
- CRUD de projetos concluído.
- Criação de tarefas integrada mobile → API → SQLite concluída.
- **Teste manual Android aprovado**, conforme [registro de integração](../arquitetura/integracao-criacao-tarefas.md#validação-manual-android--2026-10-03).
- Entrega 1 permanece em andamento. O planejamento original abaixo é preservado como referência histórica e complementado pelo refinamento; seus critérios não representam a conclusão de toda a Sprint.

### Dívidas técnicas e funcionalidades pendentes naquele momento

- 14 erros globais preexistentes de TypeScript no mobile.
- Falhas antigas da configuração global do Jest.
- Quatro alertas moderados conhecidos do Drizzle Kit.
- GET/PATCH/DELETE de Tasks ainda não implementados.
- Sincronização geral ainda não implementada; reabertura restaura o cache AsyncStorage.

Esses itens permanecem registrados, sem correções nesta atualização documental.

---

## Refinamento formal do Sprint Backlog — status histórico em 2026-10-03

O planejamento inicial possuía **13 Issues**. Com #1–#4 concluídas, o status anterior era **4/13 = 30,8%**. Após a [auditoria do Front-end do MVP](../auditorias/auditoria-front-mvp.md), foram formalizados dois itens que **já pertenciam à Entrega 1 — MVP**:

| Issue adicionada | PBI | Requisitos | Status |
|---|---|---|---|
| [#20 — Complementar visualizações do calendário do MVP](https://github.com/AlineRaquelC/gestor-diario/issues/20) | PBI-05 — Visualizar tarefas por dia, semana e mês | RF06/RF07 | Pendente — não iniciada |
| [#21 — Completar filtros e ordenação do MVP](https://github.com/AlineRaquelC/gestor-diario/issues/21) | PBI-10 — Filtrar e ordenar tarefas | RF48/RF50 | Pendente — não iniciada |

**Novo total: 15 Issues; concluídas: 4; progresso formal: 4/15 = 26,7%.** A redução de **30,8% para 26,7% não representa perda de trabalho**: a auditoria identificou dois itens do MVP ainda não representados no Sprint Backlog. Trata-se de refinamento do planejamento, sem novo requisito e sem alteração da prioridade ou divisão das entregas.

A **Issue #5 continua sendo a próxima implementação**, ainda não iniciada. Ordem geral: #5 → #6 → #7 → #8 → #9 → #10 → #11 → #20 (calendário) → #21 (filtros) → #12 → #13. Calendário/filtros podem ser executados em outra ordem após #5 se suas dependências forem respeitadas; #20 coordena regras de atrasadas/períodos com #11 quando compartilhadas. O CI pode começar antes e evoluir durante a Sprint.

### Decisões de preservação e integridade

- Decisão de calendário **aprovada para planejamento**: conectar Calendário às tarefas reais, preservando identidade visual, navegação e componentes existentes aproveitáveis. Não escolher nova biblioteca por preferência técnica nem redesenhar o Front.
- Calendário: mês com indicadores e seleção de dia; semana com 7 dias e navegação; dia selecionado com Manhã/Tarde/Noite pelo horário; destaques de atraso/prazo próximo preservando prioridade; dados de TaskContext/API, sem mocks. Critérios completos na [Issue #20](https://github.com/AlineRaquelC/gestor-diario/issues/20) e no [planejamento de Issues](sprint-1-issues.md).
- Filtros/ordenação: critérios de RF48/RF50 conforme a [Issue #21](https://github.com/AlineRaquelC/gestor-diario/issues/21), usando dados reais, identidade por ID quando disponível e componentes atuais, sem modificar permanentemente a ordem armazenada.
- **Não criar terceira Issue de integridade de projetos.** Trabalho absorvido em **#6 + #12**: #6 tratará projectId, projeto ativo, updatedAt, UX e reabertura; #12 tratará identidades estáveis, dados locais antigos, projetos removidos, tarefas vinculadas, política única de exclusão e consistência AsyncStorage/API.
- Nenhuma política foi alterada no código; não houve implementação de calendário/filtros ou correção de Front neste refinamento.

### Evolução do escopo selecionado

A tabela e as exclusões originais abaixo registram o planejamento inicial. **PBI-05 e PBI-10 passam a integrar formalmente o trabalho rastreado da Sprint 1 por #20/#21**, superando suas exclusões originais mediante este replanejamento explícito. PBI-07 continua com a rastreabilidade já existente na Issue #9; este refinamento não altera esse item.

---

## 2. Sprint Goal

> **Entregar um MVP integrado do Gestor Diário, conectando o fluxo principal já existente no aplicativo React Native a uma mini API Node.js e a um banco de dados, com persistência, validações, histórico mínimo, sincronização manual e uma base inicial de testes e integração contínua.**

O objetivo principal da Sprint não é adicionar grande quantidade de novas telas, mas transformar o protótipo funcional atual em um incremento tecnicamente integrado e demonstrável.

---

## 3. Contexto de início da Sprint

O aplicativo mobile já possui implementação conhecida para parte relevante do fluxo principal.

### Funcionalidades existentes no mobile e que devem ser auditadas

- criação de tarefas;
- visualização de detalhes da tarefa;
- edição de tarefas;
- conclusão de tarefas;
- exclusão com confirmação;
- descrição;
- data de início;
- prazo;
- horário;
- prioridade;
- status;
- subtarefas;
- projetos;
- criação de projetos;
- detalhes de projeto;
- edição de projetos;
- exclusão de projetos;
- escolha de cor e ícone do projeto;
- vínculo tarefa ↔ projeto;
- dashboard/Home;
- navegação principal;
- persistência local com AsyncStorage.

### Regras já adicionadas no mobile

- uma nova tarefa não deve aceitar data inicial anterior à data atual;
- o prazo não deve ser anterior à data de início.

### Lacunas estruturais conhecidas no início da Sprint

- mini API Node.js ainda não integrada;
- banco de dados ainda não definido/implementado;
- camada de services HTTP ainda precisa ser criada ou validada;
- estratégia AsyncStorage ↔ API ↔ banco ainda precisa ser formalmente definida;
- histórico de alterações ainda precisa ser implementado conforme requisitos selecionados;
- desfazer exclusão ainda é um gap conhecido;
- CI inicial ainda precisa ser configurada;
- testes e erros pré-existentes de Jest/TypeScript/lint precisam ser auditados sem refatoração indiscriminada;
- configuração Android de release ainda utiliza assinatura de debug temporária e não faz parte da solução final de distribuição.

---

# 4. Escopo selecionado inicialmente da Sprint 1

A Sprint 1 seleciona apenas parte da Entrega 1. Os demais PBIs da Entrega 1 permanecem no Product Backlog para Sprints posteriores.

| PBI | Capacidade | Origem | Área | Prioridade | Situação inicial |
|---|---|---|---|---|---|
| **PBI-01** | Criar tarefa com dados obrigatórios e validação | RF01 | Front / Backend / Banco | Alta | Parcial — Mobile |
| **PBI-02** | Editar tarefa e registrar última modificação | RF03 | Front / Backend / Banco | Alta | Parcial — Mobile |
| **PBI-03** | Excluir tarefa com confirmação e desfazer | RF04 | Front / Backend / Banco | Alta | Parcial — Mobile |
| **PBI-04** | Controlar status e histórico da tarefa | RF05, RF17 | Front / Backend / Banco | Alta | Parcial — Mobile |
| **PBI-06** | Criar subtarefas e calcular progresso | RF09, RF10 | Front / Backend / Banco | Alta | Parcial — Mobile |
| **PBI-08** | Organizar tarefas em projetos/etiquetas | RF12 | Front / Backend / Banco | Alta | Parcial — Mobile |
| **PBI-09** | Exibir dashboard de produtividade | RF23 | Front / Backend | Alta | Parcial — Mobile |
| **PBI-11** | Sincronizar manualmente com servidor Node.js | RF20 | Front / Backend / Banco | Alta | Bloqueado por arquitetura |

## PBIs da Entrega 1 fora do compromisso inicial — histórico

Os seguintes itens continuam importantes, mas não fazem parte do compromisso inicial da Sprint 1:

| PBI | Motivo para permanecer no backlog |
|---|---|
| **PBI-05** — Visualização diária, semanal e mensal | requer refinamento funcional específico do calendário e pode ampliar o escopo do primeiro incremento integrado |
| **PBI-07** — Múltiplas observações | não é necessário para validar o primeiro fluxo fim a fim Mobile → API → Banco |
| **PBI-10** — Filtros e ordenação | evolução de consulta após consolidação do CRUD e persistência integrada |

> Caso a Sprint termine com capacidade disponível e todos os itens comprometidos estejam concluídos, PBIs adicionais só devem entrar após novo planejamento, sem alterar retroativamente o compromisso original.

---

# 5. Critérios de aceite por PBI

## PBI-01 — Criar tarefa

**Como pessoa usuária, quero criar uma tarefa para registrar uma atividade que preciso realizar.**

### Critérios de aceite

- [ ] informar título;
- [ ] informar descrição;
- [ ] informar data de início;
- [ ] informar prazo;
- [ ] informar prioridade;
- [ ] validar campos obrigatórios;
- [ ] impedir nova tarefa com data inicial anterior ao dia atual;
- [ ] impedir prazo anterior à data inicial;
- [ ] enviar a criação para a API;
- [ ] persistir a tarefa no banco;
- [ ] refletir a nova tarefa imediatamente no estado do aplicativo;
- [ ] manter comportamento local coerente com a estratégia de sincronização definida.

---

## PBI-02 — Editar tarefa

**Como pessoa usuária, quero editar uma tarefa para manter seus dados atualizados.**

### Critérios de aceite

- [ ] editar título, descrição, datas, horário, prioridade, projeto e status quando aplicável;
- [ ] persistir a alteração na API/banco;
- [ ] registrar `updatedAt`/última modificação;
- [ ] refletir a alteração imediatamente nos detalhes e demais telas relacionadas;
- [ ] preservar fluxo de navegação sem duplicação indevida de telas;
- [ ] tratar recurso inexistente e erro de servidor de forma compreensível.

---

## PBI-03 — Excluir tarefa e desfazer

**Como pessoa usuária, quero excluir uma tarefa com segurança e poder desfazer a ação por curto período.**

### Critérios de aceite

- [ ] pedir confirmação antes de excluir;
- [ ] remover a tarefa das listagens após confirmação;
- [ ] permitir desfazer a exclusão por um curto período definido pela implementação;
- [ ] manter armazenamento temporário suficiente para restaurar a tarefa;
- [ ] refletir exclusão/restauração na API e no banco;
- [ ] evitar inconsistência entre cache local e servidor;
- [ ] após expirar o período de desfazer, considerar a exclusão efetiva.

---

## PBI-04 — Status e histórico

**Como pessoa usuária, quero controlar o estado da tarefa e acompanhar seu histórico.**

### Critérios de aceite

- [ ] suportar os estados exigidos pelo requisito oficial selecionado;
- [ ] manter coerência entre `status` e indicadores de conclusão;
- [ ] registrar eventos relevantes de criação, edição, mudança de status e exclusão/restauração quando aplicável;
- [ ] persistir o histórico no banco;
- [ ] disponibilizar histórico pela API;
- [ ] refletir mudanças de status no dashboard e nas telas relacionadas.

---

## PBI-06 — Subtarefas e progresso

**Como pessoa usuária, quero dividir tarefas em subtarefas para acompanhar o progresso da atividade.**

### Critérios de aceite

- [ ] criar subtarefas;
- [ ] editar/remover subtarefas quando suportado pelo fluxo atual;
- [ ] marcar subtarefas como concluídas ou pendentes;
- [ ] persistir subtarefas na API/banco;
- [ ] calcular o percentual de progresso com base nas subtarefas;
- [ ] apresentar progresso de forma consistente nas telas relevantes.

---

## PBI-08 — Projetos/etiquetas

**Como pessoa usuária, quero organizar tarefas em projetos ou categorias para manter minhas atividades agrupadas.**

### Critérios de aceite

- [ ] criar projeto/categoria;
- [ ] editar projeto/categoria;
- [ ] excluir projeto/categoria com tratamento das tarefas vinculadas;
- [ ] permitir vínculo de tarefa a projeto/categoria;
- [ ] persistir projetos e vínculos no banco;
- [ ] usar identificador estável no backend/banco para relacionamentos;
- [ ] evitar deixar tarefas órfãs após exclusão de projeto;
- [ ] manter cor/ícone como atributos de apresentação quando existentes no modelo atual.

---

## PBI-09 — Dashboard

**Como pessoa usuária, quero visualizar indicadores das minhas tarefas para acompanhar meu progresso.**

### Critérios de aceite

- [ ] apresentar dados reais, não mocks;
- [ ] exibir indicadores de tarefas concluídas, pendentes e atrasadas quando aplicável;
- [ ] atualizar automaticamente após criação, edição, conclusão ou exclusão;
- [ ] utilizar os dados integrados definidos pela arquitetura;
- [ ] tratar carregamento e falha de comunicação sem quebrar a Home.

---

## PBI-11 — Sincronização manual

**Como pessoa usuária, quero sincronizar manualmente minhas tarefas com um servidor local Node.js para manter os dados persistidos fora do dispositivo.**

### Critérios de aceite

- [ ] existir uma mini API Node.js executável localmente;
- [ ] existir banco de dados persistente para os dados do MVP;
- [ ] o mobile possuir camada de serviço HTTP separada das telas;
- [ ] existir ação ou fluxo de sincronização manual compatível com o requisito;
- [ ] definir e documentar qual fonte de dados prevalece em caso de divergência;
- [ ] tratar indisponibilidade do servidor sem perda silenciosa dos dados locais;
- [ ] apresentar resultado da sincronização ao usuário;
- [ ] validar comunicação em ambiente Android/emulador.

---

# 6. Enablers técnicos comprometidos na Sprint

Os itens abaixo são necessários para que os PBIs funcionais sejam entregues com qualidade e integração real.

| ID | Enabler | Área | Resultado esperado |
|---|---|---|---|
| **TEC-01** | Estruturar a mini API Node.js | Backend | servidor local executável e organizado |
| **TEC-02** | Definir e documentar o banco do MVP | Banco / Arquitetura | decisão técnica registrada antes da implementação |
| **TEC-03** | Modelar entidades do MVP | Banco / Backend | Task, Project/Tag, Subtask e History; demais entidades somente se necessárias ao escopo |
| **TEC-04** | Criar camada de services HTTP no mobile | Front / Arquitetura | telas não fazem chamadas HTTP diretamente |
| **TEC-05** | Definir estratégia AsyncStorage ↔ servidor | Arquitetura | fonte de verdade, cache/offline e sincronização documentados |
| **TEC-06** | Reaplicar validações no backend | Backend | regras críticas não dependem apenas do front |
| **TEC-07** | Padronizar erros da API | Backend / Front | respostas HTTP e mensagens consistentes |
| **TEC-08** | Criar testes mínimos | Testes | CRUD e regras críticas validados |
| **TEC-09** | Configurar CI inicial | DevOps | lint/typecheck/testes executados automaticamente quando aplicável |
| **TEC-10** | Manter rastreabilidade | Documentação / DevOps | requisito → PBI → Issue → branch → PR → teste |

---

# 7. Decomposição inicial por área técnica

## 7.1 Front-end / Mobile

- auditar as telas existentes contra os critérios desta Sprint;
- corrigir gaps sem reescrever o aplicativo;
- criar/validar `services/` para comunicação HTTP;
- integrar Contexts com a estratégia definida para API/cache;
- criar tratamento de loading, sucesso e erro;
- implementar desfazer exclusão;
- alinhar status aos valores oficiais selecionados;
- garantir atualização do dashboard;
- preservar navegação atual validada;
- validar comportamento em Android.

## 7.2 Backend / Mini API

- definir estrutura Node.js adequada ao tamanho do projeto;
- criar configuração de servidor local;
- implementar endpoints mínimos necessários para Tasks, Projects, Subtasks, History e sincronização;
- aplicar validações de negócio;
- padronizar respostas e códigos HTTP;
- separar responsabilidades entre rotas/controllers/services/repositories conforme a arquitetura escolhida;
- documentar como executar a API.

## 7.3 Banco de dados

Antes da implementação, registrar a decisão de tecnologia do banco.

O modelo mínimo da Sprint deve atender:

- Task;
- Project/Tag;
- Subtask;
- History;
- relacionamentos necessários;
- timestamps de criação e atualização;
- integridade referencial compatível com a tecnologia escolhida.

Não duplicar atributos apenas para reproduzir estruturas temporárias do front se houver modelo relacional/estrutural mais estável.

## 7.4 DevOps

- manter desenvolvimento na branch `dev`;
- criar Issues antes das novas implementações;
- utilizar branches por trabalho;
- Conventional Commits no padrão `tipo(escopo): descrição`;
- Pull Requests para integração;
- configurar CI inicial de forma incremental;
- não versionar secrets;
- documentar variáveis de ambiente por arquivo de exemplo quando necessário.

## 7.5 Testes

Cobrir inicialmente:

- criação de tarefa válida;
- rejeição de payload inválido;
- validação de datas;
- edição;
- mudança de status;
- exclusão/restauração;
- subtarefas/progresso;
- projeto e vínculo com tarefa;
- recurso inexistente;
- persistência após reinício da API/banco;
- integração manual Mobile ↔ API;
- regressão básica do fluxo Android.

---

# 8. Decisões de arquitetura obrigatórias antes da implementação do backend

Antes de iniciar o código da API, deverão ser registradas decisões para:

1. tecnologia/framework Node.js a ser utilizada;
2. banco de dados do MVP;
3. estratégia de migrations/schema;
4. identificadores das entidades;
5. estratégia de relacionamento Task ↔ Project;
6. estratégia AsyncStorage ↔ API ↔ Banco;
7. comportamento offline;
8. resolução de divergências na sincronização manual;
9. formato padrão de erros;
10. configuração de URL da API no Android/emulador.

Essas decisões devem ser simples e proporcionais ao escopo acadêmico do projeto.

---

# 9. Definition of Ready — Sprint 1

Uma Issue só entra em desenvolvimento quando:

- [ ] está vinculada a um PBI/TEC da Sprint;
- [ ] possui objetivo claro;
- [ ] possui descrição suficiente;
- [ ] possui critérios de aceite quando funcional;
- [ ] área técnica está identificada;
- [ ] dependências relevantes estão conhecidas;
- [ ] arquitetura necessária já foi decidida quando aplicável;
- [ ] não exige requisito inventado fora da documentação oficial.

---

# 10. Definition of Done — Sprint 1

Um item somente é considerado concluído quando:

- [ ] critérios de aceite atendidos;
- [ ] código implementado e executável;
- [ ] sem erro bloqueante introduzido pela alteração;
- [ ] testes relevantes executados;
- [ ] validações de backend implementadas quando aplicável;
- [ ] persistência validada quando aplicável;
- [ ] documentação atualizada;
- [ ] Issue referenciada na branch/PR;
- [ ] commit segue Conventional Commits;
- [ ] Pull Request revisado;
- [ ] integração realizada em `dev`;
- [ ] CI relacionada ao item está verde ou eventual falha pré-existente está documentada;
- [ ] comportamento validado no Android quando o item impacta o mobile.

---

# 11. Definition of Done da Sprint

A Sprint 1 pode ser encerrada quando:

- [ ] PBIs comprometidos foram concluídos ou formalmente renegociados;
- [ ] mini API Node.js está executável;
- [ ] banco do MVP está definido, documentado e persistindo dados;
- [ ] fluxo principal funciona de ponta a ponta;
- [ ] criar tarefa persiste via API/banco;
- [ ] editar tarefa persiste via API/banco;
- [ ] status e progresso permanecem consistentes;
- [ ] excluir/desfazer funciona conforme critério definido;
- [ ] projetos e vínculos persistem;
- [ ] dashboard usa dados reais;
- [ ] sincronização manual foi demonstrada;
- [ ] AsyncStorage e servidor não funcionam como fontes conflitantes sem regra definida;
- [ ] testes mínimos da API/regras críticas foram executados;
- [ ] CI inicial existe e está documentada;
- [ ] aplicativo executa no Android sem erro bloqueante causado pela Sprint;
- [ ] documentação e rastreabilidade estão atualizadas;
- [ ] incremento está demonstrável ao professor.

---

# 12. Fora do escopo no planejamento inicial — histórico

O refinamento acima inclui explicitamente PBI-05/PBI-10 via #20/#21; as exclusões desses itens abaixo são históricas, não o escopo vigente. Os demais itens conservam seu planejamento, inclusive a rastreabilidade já existente de PBI-07 na #9.

Lista original, sujeita a replanejamento explícito:

- visualização semanal/mensal completa do PBI-05;
- múltiplas observações do PBI-07;
- filtros/ordenação completos do PBI-10;
- recorrência;
- notificações avançadas;
- backup/importação/exportação;
- sincronização automática;
- relatórios avançados;
- câmera;
- GPS;
- QR Code;
- NFC;
- sensores;
- biometria;
- hardware contextual;
- APK final de produção;
- assinatura definitiva de release.

---

# 13. Riscos da Sprint

| Risco | Impacto | Tratamento |
|---|---|---|
| Integrar API pode quebrar fluxo mobile já funcional | Alto | criar camada de services e migrar incrementalmente |
| AsyncStorage e servidor virarem duas fontes conflitantes | Alto | decidir estratégia antes da integração |
| Escopo de PBIs ainda ser grande | Alto | decompor em Issues pequenas e renegociar sem esconder trabalho |
| Erros pré-existentes de Jest/TypeScript/lint | Médio | separar falhas anteriores das introduzidas pela Sprint |
| Relação por nome de projeto gerar inconsistência | Médio | usar identificador estável no backend/banco |
| API local não ser acessível pelo emulador Android | Médio | documentar host/configuração específica do Android |
| Banco escolhido ser complexo demais para o MVP | Médio | priorizar solução simples e justificável |
| Desfazer exclusão exigir estratégia de soft delete/retention | Médio | decidir comportamento antes de implementar |

---

# 14. Estratégia de execução

Ordem recomendada:

```text
Documentação / arquitetura
        ↓
Issues da Sprint 1
        ↓
Banco + modelo
        ↓
Mini API Node.js
        ↓
Testes da API
        ↓
Services HTTP no mobile
        ↓
Integração incremental dos Contexts
        ↓
Correções dos gaps funcionais da Sprint
        ↓
Sincronização manual
        ↓
Dashboard integrado
        ↓
CI + regressão
        ↓
Demonstração do incremento
```

---

# 15. Demonstração planejada da Sprint

Ao final da Sprint, a demonstração deverá preferencialmente seguir este fluxo:

1. iniciar banco/backend;
2. iniciar aplicativo Android;
3. mostrar dashboard carregando dados reais;
4. criar um projeto;
5. criar uma tarefa vinculada ao projeto;
6. mostrar validação de datas/prioridade;
7. abrir detalhes;
8. editar a tarefa;
9. criar/concluir subtarefas e mostrar progresso;
10. mudar status da tarefa;
11. demonstrar persistência após recarregar/reabrir;
12. excluir e demonstrar desfazer dentro do período definido;
13. executar sincronização manual;
14. mostrar que os dados permanecem no banco;
15. mostrar rapidamente o pipeline/PRs/documentação da Sprint.

---

# 16. Métricas de acompanhamento

Durante a Sprint podem ser acompanhados:

- PBIs concluídos / comprometidos;
- Issues concluídas / planejadas;
- PRs abertos e integrados;
- testes executados;
- falhas de CI;
- bugs bloqueantes;
- cobertura funcional dos critérios de aceite;
- itens renegociados e motivo.

Não utilizar quantidade de commits ou linhas de código como métrica de produtividade individual.

---

# 17. Próximos passos do planejamento inicial — histórico

1. revisar o escopo da Sprint 1 no repositório;
2. criar as decisões de arquitetura necessárias para API e banco;
3. decompor cada PBI/TEC comprometido em Issues pequenas e rastreáveis;
4. estimar as Issues;
5. criar milestone/identificação da Sprint 1 no GitHub;
6. configurar o primeiro CI mínimo;
7. iniciar a implementação pela arquitetura aprovada, sem refazer o front que já funciona.


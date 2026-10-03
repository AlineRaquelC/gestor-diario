# Planejamento de Issues — Sprint 1 — Gestor Diário

## 1. Objetivo

Este documento transforma o escopo da **Sprint 1** em trabalho executável no GitHub.

A intenção é garantir rastreabilidade entre:

```text
Requisito
  ↓
User Story / PBI
  ↓
GitHub Issue
  ↓
Branch
  ↓
Commit
  ↓
Pull Request
  ↓
Teste
```

As Issues abaixo devem ser criadas antes do início da implementação do backend.

---

## 2. Milestone

Criar o milestone:

```text
Sprint 1
```

Descrição sugerida:

> Entregar o núcleo funcional do Gestor Diário com mobile React Native, mini API Node.js, SQLite, persistência, integração inicial e fluxo principal de gerenciamento de tarefas.

---

## 3. Labels recomendadas

### Área

```text
frontend
backend
database
devops
documentation
test
```

### Tipo

```text
user-story
technical-task
bug
```

### Prioridade

```text
priority-high
priority-medium
priority-low
```

### Sprint

```text
sprint-1
```

---

# 4. Issues da Sprint 1

## ISSUE #1 — Base técnica da mini API Node.js

**Status:** Concluída — PR #14.

### Tipo

`technical-task`

### Labels

```text
backend
devops
test
sprint-1
priority-high
```

### Objetivo

Criar a estrutura inicial do backend conforme as ADRs aprovadas.

### Stack aprovada

```text
Node.js
TypeScript
Express
Zod
Drizzle ORM
better-sqlite3
SQLite
Drizzle Kit
Vitest
Supertest
```

### Critérios de aceite

- [x] diretório `backend/` criado;
- [x] `package.json` próprio do backend;
- [x] TypeScript configurado;
- [x] estrutura básica de camadas criada;
- [x] servidor Express inicia localmente;
- [x] endpoint simples de health check responde;
- [x] scripts de desenvolvimento e teste definidos;
- [x] `.env.example` criado sem secrets;
- [x] `.gitignore` revisado;
- [x] documentação de execução atualizada.

### Branch sugerida

```text
feature/backend-foundation
```

---

## ISSUE #2 — Implementar schema SQLite e migrations iniciais

**Status:** Concluída — PR #15.

### Tipo

`technical-task`

### Labels

```text
backend
database
test
sprint-1
priority-high
```

### Objetivo

Criar o schema inicial do SQLite com base no modelo de dados aprovado.

### Entidades

```text
Project
Task
Subtask
Note
TaskHistory
```

### Critérios de aceite

- [x] tabelas criadas por migration;
- [x] chaves primárias definidas;
- [x] relacionamentos definidos;
- [x] timestamps definidos;
- [x] constraints principais aplicadas;
- [x] migration executa em banco vazio;
- [x] banco de desenvolvimento não é versionado indevidamente;
- [x] estratégia de banco de testes preparada.

### Branch sugerida

```text
feature/database-schema
```

---

## ISSUE #3 — Gerenciar projetos

**Status:** Concluída — PR #16.

### Requisito de origem

`RF12`

### Tipo

`user-story`

### Labels

```text
frontend
backend
database
test
sprint-1
priority-high
```

### User Story

> Como usuário, quero organizar minhas tarefas em projetos para manter minhas atividades separadas por contexto.

### Estado atual

O mobile já possui criação, edição, detalhes e exclusão de projetos com persistência local.

A Sprint deve preservar esse comportamento e integrá-lo progressivamente à API.

### Critérios de aceite

- [x] listar projetos;
- [x] criar projeto;
- [x] visualizar projeto;
- [x] editar projeto;
- [x] excluir projeto com tratamento seguro das tarefas vinculadas;
- [x] nome, descrição, cor e ícone persistidos;
- [x] vínculo baseado em identificador no backend;
- [x] integração com SQLite;
- [x] erros tratados;
- [x] testes de API;
- [x] mobile continua funcional.

### Endpoints esperados

```text
POST   /projects
GET    /projects
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id
```

### Branch sugerida

```text
feature/projects-crud
```

---

## ISSUE #4 — Criar e persistir tarefas

**Status:** Concluída — PR #17.

### Requisito de origem

`RF01`

### Tipo

`user-story`

### Labels

```text
frontend
backend
database
test
sprint-1
priority-high
```

### User Story

> Como usuário, quero criar uma tarefa para registrar uma atividade que preciso realizar.

### Critérios de aceite

- [x] título obrigatório;
- [x] descrição suportada;
- [x] projeto válido;
- [x] data inicial;
- [x] prazo;
- [x] horário quando informado;
- [x] prioridade;
- [x] status inicial;
- [x] `startDate` não pode ser anterior ao dia atual na criação;
- [x] `dueDate` não pode ser anterior a `startDate`;
- [x] tarefa persistida no SQLite;
- [x] resposta HTTP adequada;
- [x] mobile exibe a nova tarefa;
- [x] cache local permanece consistente;
- [x] testes de validação e endpoint.

### Endpoint principal

```text
POST /tasks
```

### Branch sugerida

```text
feature/tasks-create
```

---

## ISSUE #5 — Consultar e visualizar tarefas

**Status:** Pendente — próxima Issue; ainda não iniciada.

### Tipo

`user-story`

### Labels

```text
frontend
backend
database
test
sprint-1
priority-high
```

### User Story

> Como usuário, quero visualizar minhas tarefas e seus detalhes para acompanhar minhas atividades.

### Critérios de aceite

- [ ] listar tarefas;
- [ ] consultar tarefa por ID;
- [ ] detalhes exibem dados persistidos;
- [ ] projeto relacionado disponível;
- [ ] subtarefas carregadas quando aplicável;
- [ ] progresso calculado corretamente;
- [ ] recurso inexistente retorna 404;
- [ ] mobile não usa conteúdo hardcoded para dados persistentes.

### Endpoints

```text
GET /tasks
GET /tasks/:id
```

### Branch sugerida

```text
feature/tasks-read
```

---

## ISSUE #6 — Editar tarefas

**Status:** Pendente.

### Requisito de origem

`RF03`

### Tipo

`user-story`

### Labels

```text
frontend
backend
database
test
sprint-1
priority-high
```

### User Story

> Como usuário, quero editar uma tarefa para manter suas informações atualizadas.

### Critérios de aceite

- [ ] campos editáveis persistem;
- [ ] validações de datas permanecem;
- [ ] projeto atualizado continua válido;
- [ ] `updatedAt` é atualizado;
- [ ] alteração aparece imediatamente no mobile;
- [ ] histórico registra alteração relevante;
- [ ] fluxo Editar → Salvar → Detalhes permanece correto;
- [ ] testes de endpoint.

### Endpoint

```text
PATCH /tasks/:id
```

### Branch sugerida

```text
feature/tasks-update
```

### Refinamento após auditoria do MVP

Critérios adicionais, preservando todos os critérios anteriores:

- [ ] ao alterar o projeto da tarefa, atualizar o vínculo por projectId;
- [ ] não depender somente do nome do projeto;
- [ ] projeto selecionado deve existir e estar ativo;
- [ ] updatedAt deve ser atualizado;
- [ ] preservar UX atual da EditTaskScreen;
- [ ] evitar inconsistência entre project e projectId;
- [ ] validar integração após fechar/reabrir.

Decisão: o trabalho de integridade local de projetos sugerido pela auditoria será absorvido em #6 e #12. Não criar terceira Issue de projetos nem alterar a política no código nesta etapa de planejamento.

---

## ISSUE #7 — Status, conclusão e histórico da tarefa

**Status:** Pendente.

### Requisitos de origem

```text
RF05
RF17
```

### Tipo

`user-story`

### Labels

```text
frontend
backend
database
test
sprint-1
priority-high
```

### User Story

> Como usuário, quero atualizar o estado de uma tarefa e consultar sua atividade para acompanhar seu progresso.

### Estados-alvo

```text
PENDING
PARTIAL
COMPLETED
```

### Critérios de aceite

- [ ] alteração de status persistida;
- [ ] conclusão refletida no dashboard;
- [ ] `done` mantido consistente durante a migração;
- [ ] eventos relevantes registrados em `TaskHistory`;
- [ ] histórico de criação;
- [ ] histórico de edição;
- [ ] histórico de mudança de status;
- [ ] histórico de conclusão/reabertura;
- [ ] histórico exibido a partir de dados reais quando a tela estiver integrada;
- [ ] testes de regras de negócio.

### Branch sugerida

```text
feature/task-status-history
```

---

## ISSUE #8 — Gerenciar subtarefas e calcular progresso

**Status:** Pendente.

### Requisitos de origem

```text
RF09
RF10
```

### Tipo

`user-story`

### Labels

```text
frontend
backend
database
test
sprint-1
priority-high
```

### User Story

> Como usuário, quero dividir tarefas em subtarefas e acompanhar o percentual concluído.

### Critérios de aceite

- [ ] adicionar subtarefa;
- [ ] alterar conclusão;
- [ ] remover subtarefa;
- [ ] subtarefas persistidas;
- [ ] progresso calculado a partir das subtarefas;
- [ ] progresso entre 0 e 100;
- [ ] progresso atualizado imediatamente;
- [ ] tarefa sem subtarefas segue regra definida no modelo;
- [ ] testes.

### Branch sugerida

```text
feature/subtasks-progress
```

---

## ISSUE #9 — Implementar múltiplas observações por tarefa

**Status:** Pendente.

### Requisito de origem

`RF11`

### Tipo

`user-story`

### Labels

```text
frontend
backend
database
test
sprint-1
priority-medium
```

### User Story

> Como usuário, quero registrar observações em uma tarefa para manter informações adicionais ao longo do tempo.

### Critérios de aceite

- [ ] criar nota;
- [ ] listar notas da tarefa;
- [ ] editar nota quando permitido;
- [ ] excluir nota;
- [ ] registrar data de criação;
- [ ] diferenciar `Task.description` de `Note`;
- [ ] persistir no SQLite;
- [ ] testes.

### Branch sugerida

```text
feature/task-notes
```

---

## ISSUE #10 — Excluir tarefa com confirmação e desfazer

**Status:** Pendente.

### Requisito de origem

`RF04`

### Tipo

`user-story`

### Labels

```text
frontend
backend
database
test
sprint-1
priority-high
```

### User Story

> Como usuário, quero excluir uma tarefa com segurança e poder desfazer a exclusão por um curto período.

### Critérios de aceite

- [ ] confirmação antes da exclusão;
- [ ] exclusão lógica implementada;
- [ ] tarefa deixa de aparecer nas listagens normais;
- [ ] janela de desfazer definida;
- [ ] restaurar tarefa dentro da janela;
- [ ] histórico registra DELETE e RESTORE;
- [ ] persistência consistente;
- [ ] testes.

### Branch sugerida

```text
feature/task-delete-undo
```

---

## ISSUE #11 — Dashboard com dados reais

**Status:** Pendente.

### Requisito de origem

`RF23`

### Tipo

`user-story`

### Labels

```text
frontend
backend
test
sprint-1
priority-high
```

### User Story

> Como usuário, quero visualizar um resumo das minhas tarefas para entender rapidamente minha situação atual.

### Indicadores mínimos

```text
pendentes
concluídas
atrasadas
progresso
projetos
```

### Critérios de aceite

- [ ] indicadores calculados com dados reais;
- [ ] atualização após criar tarefa;
- [ ] atualização após editar;
- [ ] atualização após concluir;
- [ ] atualização após excluir/restaurar;
- [ ] tarefas atrasadas identificadas corretamente;
- [ ] cards de projeto usam dados reais;
- [ ] sem números hardcoded nas informações principais.

### Branch sugerida

```text
feature/dashboard-real-data
```

---

## ISSUE #12 — Implementar sincronização manual Mobile ↔ API

**Status:** Pendente.

### Requisito de origem

`RF20`

### Tipo

`user-story`

### Labels

```text
frontend
backend
database
test
sprint-1
priority-high
```

### User Story

> Como usuário, quero sincronizar manualmente meus dados com o servidor local para manter as informações persistidas entre mobile e API.

### Critérios de aceite

- [ ] camada `src/services/` no mobile;
- [ ] cliente HTTP centralizado;
- [ ] `taskService`;
- [ ] `projectService`;
- [ ] Contexts não fazem HTTP diretamente nas telas;
- [ ] API acessível pelo emulador Android;
- [ ] projetos sincronizados;
- [ ] tarefas sincronizadas;
- [ ] dados locais existentes preservados durante migração;
- [ ] falha de rede tratada;
- [ ] AsyncStorage continua funcionando como apoio local;
- [ ] teste manual fechar/reabrir;
- [ ] documentação do fluxo de sincronização.

### Branch sugerida

```text
feature/manual-sync
```

### Refinamento após auditoria do MVP

Critérios adicionais, preservando todos os critérios anteriores:

- [ ] sincronizar projetos utilizando identificadores estáveis;
- [ ] manter remoteId/projectId coerentes;
- [ ] não usar apenas nome como identidade;
- [ ] tratar projetos locais antigos sem vínculo remoto;
- [ ] definir comportamento para projeto removido no servidor;
- [ ] preservar tarefas vinculadas;
- [ ] evitar projetos/tarefas órfãos;
- [ ] definir política única de exclusão de projeto no mobile;
- [ ] manter AsyncStorage consistente com API após sincronização.

Decisão: a integridade geral de projetos será absorvida em #6 e #12, sem terceira Issue. A política única de exclusão deverá ser definida no trabalho futuro; nenhuma política foi alterada no código neste refinamento.

---

## ISSUE #13 — Pipeline CI inicial

**Status:** Pendente.

### Tipo

`technical-task`

### Labels

```text
devops
test
sprint-1
priority-high
```

### Objetivo

Criar validação automática inicial para mobile e backend.

### Critérios de aceite

- [ ] workflow GitHub Actions criado;
- [ ] checkout;
- [ ] instalação reprodutível;
- [ ] TypeScript validado;
- [ ] lint executado quando configurado;
- [ ] testes executados;
- [ ] backend validado separadamente quando criado;
- [ ] nenhum secret exposto;
- [ ] pipeline executa em PR;
- [ ] falhas bloqueantes ficam visíveis.

### Branch sugerida

```text
ci/sprint-1-validation
```

---

## ISSUE #20 — Complementar visualizações do calendário do MVP

**GitHub:** [Issue #20](https://github.com/AlineRaquelC/gestor-diario/issues/20). **Status:** Pendente — não iniciada.

### Requisitos de origem

RF06 e RF07.

### PBI

PBI-05 — Visualizar tarefas por dia, semana e mês.

### Tipo e planejamento

`user-story` — Front-end, prioridade alta, milestone Sprint 1.
Labels: `frontend`, `test`, `sprint-1`, `user-story`, `priority-high`.
Status: pendente, não iniciada. Item já pertencente à Entrega 1 — MVP, formalizado após a auditoria do Front; nenhum requisito novo foi criado.

### User Story

Como usuário, quero visualizar minhas tarefas por dia, semana e mês para organizar melhor minha rotina e identificar tarefas próximas do prazo ou atrasadas.

### Decisão de calendário aprovada para planejamento

Preservar identidade visual atual, navegação atual, componentes já existentes quando aproveitáveis e a decisão anterior de conectar Calendário às tarefas reais. Não escolher nova biblioteca por preferência técnica nem redesenhar o Front.

**Visão mensal:** exibir calendário do mês; dias com tarefas possuem indicador visual; selecionar um dia permite visualizar suas tarefas.

**Visão semanal:** exibir os 7 dias da semana, permitir navegação entre semanas e apresentar tarefas correspondentes aos dias.

**Visão diária:** apresentar tarefas da data selecionada agrupadas por Manhã, Tarde e Noite, utilizando o horário da tarefa.

**Destaques:** tarefa atrasada e tarefa com prazo próximo; preservar os indicadores visuais de prioridade existentes.

**Dados:** Tasks reais de TaskContext/API, sem mocks ou valores hardcoded como fonte operacional.

### Critérios de aceite

- [ ] visualização diária;
- [ ] agrupamento manhã/tarde/noite;
- [ ] visualização semanal;
- [ ] navegação entre semanas;
- [ ] visualização mensal;
- [ ] indicador de dias com tarefas;
- [ ] seleção de dia mostra tarefas reais;
- [ ] destaque de prazo próximo;
- [ ] destaque de tarefa atrasada;
- [ ] dados reais;
- [ ] estados vazios;
- [ ] identidade visual preservada;
- [ ] teste Android;
- [ ] testes focados de data/período.

### Dependências

- #5 — Consultar e visualizar tarefas.
- #11 — Dashboard com dados reais, quando houver regra compartilhada de atrasadas/períodos.

A ordem geral prevê calendário após #11 e antes de sincronização manual/CI. Pode ser ajustada após #5 conforme as dependências. Limites dos períodos e janela de prazo próximo devem ser explicitados no refinamento técnico futuro, sem inventar regra oficial ou implementar nesta etapa.

### Fora de escopo

- Google Calendar;
- calendário externo;
- recorrência;
- notificações;
- troca desnecessária de biblioteca;
- funcionalidades da Entrega 2/3.

### Branch sugerida futura

`feature/calendar-mvp`

### Rastreabilidade

`docs/auditorias/auditoria-front-mvp.md` (F19–F24), `docs/sprints/sprint-1.md` e `docs/sprints/sprint-1-issues.md`.

---

## ISSUE #21 — Completar filtros e ordenação do MVP

**GitHub:** [Issue #21](https://github.com/AlineRaquelC/gestor-diario/issues/21). **Status:** Pendente — não iniciada.

### Requisitos de origem

RF48 e RF50.

### PBI

PBI-10 — Filtrar e ordenar tarefas.

### Tipo e planejamento

`user-story` — Front-end, prioridade alta, milestone Sprint 1.
Labels: `frontend`, `test`, `sprint-1`, `user-story`, `priority-high`.
Status: pendente, não iniciada. Item já pertencente à Entrega 1 — MVP, formalizado após a auditoria do Front; nenhum requisito novo foi criado.

### User Story

Como usuário, quero filtrar e ordenar minhas tarefas para localizar rapidamente as atividades relevantes.

### Critérios de aceite

- [ ] filtrar por status;
- [ ] filtrar por prioridade;
- [ ] filtrar por projeto/categoria;
- [ ] filtrar por período quando aplicável;
- [ ] usar dados reais;
- [ ] permitir combinações coerentes de filtros;
- [ ] tratar estado sem resultados;
- [ ] ordenar por critérios coerentes com RF50;
- [ ] definir direção crescente/decrescente quando aplicável;
- [ ] ordenação não modifica permanentemente os dados armazenados;
- [ ] evitar uso do nome do projeto como identidade quando ID estiver disponível;
- [ ] preservar componentes/telas atuais;
- [ ] testes focados;
- [ ] teste Android.

Critérios de ordenação devem contemplar prioridade/prazo e combinação coerente, conforme RF50. RF48 permanece integralmente preservado no catálogo oficial; este planejamento usa projeto/categoria sem criar um sistema novo de etiquetas nem declarar o requisito inteiro concluído.

### Dependências

- Principal: #5 — Consultar e visualizar tarefas.
- Coordenar coerência de projectId com #6/#12, aproveitando identificadores quando disponíveis.

A ordem geral prevê filtros após calendário e antes de sincronização manual/CI. Pode ser ajustada após #5 conforme as dependências técnicas.

### Fora de escopo

- filtros salvos;
- busca avançada;
- favoritos;
- drag-and-drop;
- recursos posicionados na Entrega 2.

### Branch sugerida futura

`feature/task-filters-sorting`

### Rastreabilidade

`docs/auditorias/auditoria-front-mvp.md` (F36/F40–F44), `docs/sprints/sprint-1.md` e `docs/sprints/sprint-1-issues.md`.

---

# 5. Ordem sugerida de execução

```text
#1 Base técnica da API — concluída (PR #14)
#2 Schema SQLite / migrations — concluída (PR #15)
#3 Projects CRUD — concluída (PR #16)
#4 Tasks Create — concluída (PR #17)
#5 Consultar e visualizar tarefas — próxima, não iniciada
#6 Editar tarefas
#7 Status + History
#8 Subtasks + Progress
#9 Notes
#10 Delete + Undo
#11 Dashboard com dados reais
#20 Calendário do MVP
#21 Filtros e ordenação do MVP
#12 Sincronização manual
#13 CI / refinamentos finais
```

O CI pode começar antes e ser ampliado ao longo da Sprint. #20/#21 dependem de #5 e podem ser executadas em outra ordem após essa dependência, se tecnicamente necessário. #20 coordena regras compartilhadas de atrasadas/períodos com #11; #21 coordena identidade de projeto com #6/#12 quando disponível, sem exigir a sincronização geral antes de filtros locais.

O planejamento inicial tinha 13 Issues (4/13 = 30,8%). Após auditoria/refinamento, passa a 15 (4/15 = 26,7%). A redução percentual não representa perda de trabalho: dois itens já pertencentes à Entrega 1 foram formalizados. Integridade de projetos foi absorvida em #6/#12; não criar terceira Issue.

---

# 6. Regra para implementação

Antes de desenvolver qualquer Issue:

```text
Issue criada
    ↓
Branch criada a partir de dev
    ↓
Implementação
    ↓
Testes
    ↓
Commit
    ↓
PR para dev
```

Não implementar diretamente em `dev`.

---

# 7. Definition of Done

Todas as Issues estão sujeitas ao documento:

```text
docs/processo/definition-of-done.md
```

---

# 8. Observação sobre o mobile existente

Diversas funcionalidades de Front já estão implementadas.

Isso não significa reescrever essas telas.

A implementação deverá:

1. auditar a funcionalidade existente;
2. preservar o que funciona;
3. remover dados hardcoded quando necessário;
4. integrar gradualmente com Services/API;
5. manter AsyncStorage durante a transição;
6. corrigir apenas os gaps necessários.

---

# 9. Resultado esperado da Sprint

Ao final, deverá ser possível demonstrar um fluxo semelhante a:

```text
Abrir Gestor Diário
       ↓
Criar projeto
       ↓
Criar tarefa
       ↓
Definir data e prioridade
       ↓
Adicionar subtarefas
       ↓
Editar
       ↓
Alterar status
       ↓
Consultar progresso/histórico
       ↓
Sincronizar com Node.js
       ↓
Persistir no SQLite
       ↓
Fechar e reabrir
       ↓
Dados continuam consistentes
```

---

## Status

**Sprint 1 em andamento — 4/15 Issues concluídas (26,7%), após refinamento.**

Issues #1 → PR #14, #2 → PR #15, #3 → PR #16 e #4 → PR #17 concluídas.
Issues #5 a #13, #20 e #21 permanecem pendentes. Próxima: #5 — Consultar e visualizar tarefas, ainda não iniciada. Planejamento inicial: 13 Issues; histórico de 30,8% preservado acima.

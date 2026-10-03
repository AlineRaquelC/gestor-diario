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

# 5. Ordem sugerida de execução

```text
1. Base técnica da API
2. Schema SQLite / migrations
3. Projects CRUD
4. Tasks Create
5. Tasks Read
6. Tasks Update
7. Status + History
8. Subtasks + Progress
9. Notes
10. Delete + Undo
11. Dashboard com dados reais
12. Sincronização manual
13. CI / refinamentos finais
```

O CI pode começar antes e ser ampliado ao longo da Sprint.

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

**Sprint 1 em andamento — 4/13 Issues concluídas (30,8%).**

Issues #1 → PR #14, #2 → PR #15, #3 → PR #16 e #4 → PR #17 concluídas.
Issues #5 a #13 permanecem pendentes. Próxima: #5 — Consultar e visualizar tarefas.

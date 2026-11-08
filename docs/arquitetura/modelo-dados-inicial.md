# Modelo de Dados Inicial — Gestor Diário

## 1. Objetivo

Este documento define o **modelo lógico inicial de dados** do projeto **Gestor Diário**.

O objetivo é estabelecer, antes da escolha do banco de dados e da implementação da mini API Node.js:

- entidades principais;
- atributos;
- tipos lógicos;
- obrigatoriedade;
- relacionamentos;
- regras de integridade;
- comportamento de exclusão;
- histórico;
- estratégia inicial de sincronização;
- compatibilidade com o mobile já existente.

Este documento é **independente de tecnologia de banco**.  
A escolha do SGBD será registrada posteriormente em `docs/decisoes/`.

---

## 2. Escopo

O modelo cobre principalmente a **Entrega 1 — MVP** e a **Sprint 1**.

Entidades principais:

```text
Project
Task
Subtask
Note
TaskHistory
```

Entidades futuras, como lembretes avançados, recorrência, anexos, perfis, sensores e dados de hardware, não fazem parte deste modelo inicial.

---

## 3. Visão geral dos relacionamentos

```text
Project
  1
  │
  │ possui
  │
  N
Task
  1
  ├────────────── N Subtask
  │
  ├────────────── N Note
  │
  └────────────── N TaskHistory
```

Representação resumida:

```text
Project 1:N Task
Task    1:N Subtask
Task    1:N Note
Task    1:N TaskHistory
```

---

# 4. Entidade Project

## 4.1 Finalidade

Representa um projeto ou categoria utilizada para organizar tarefas.

Exemplos:

```text
Faculdade
Desenvolvimento
Marketing
Geral
```

---

## 4.2 Campos

| Campo | Tipo lógico | Obrigatório | Regra |
|---|---|---:|---|
| id | UUID/String | Sim | Identificador único e imutável |
| name | String | Sim | Nome visível do projeto |
| description | String/Text | Não | Descrição opcional |
| color | String | Sim | Cor em formato compatível com o mobile |
| icon | String | Sim | Emoji ou identificador de ícone |
| createdAt | DateTime | Sim | Data de criação |
| updatedAt | DateTime | Sim | Última atualização |
| deletedAt | DateTime/null | Não | Reservado para exclusão lógica futura, caso adotada |

---

## 4.3 Regras

- `name` não pode ser vazio;
- `id` não deve mudar após criação;
- alterar o nome do projeto não deve quebrar vínculos com tarefas;
- tarefas devem se relacionar com projeto por `projectId`, e não pelo nome;
- cor e ícone são atributos visuais persistidos;
- o projeto especial `Geral`, se mantido como fallback, deve ser tratado por identificador e não apenas por texto.

---

## 4.4 Exemplo lógico

```json
{
  "id": "project-001",
  "name": "Faculdade",
  "description": "Atividades acadêmicas",
  "color": "#8B5CF6",
  "icon": "🎓",
  "createdAt": "2026-10-02T10:00:00.000Z",
  "updatedAt": "2026-10-02T10:00:00.000Z"
}
```

---

# 5. Entidade Task

## 5.1 Finalidade

Representa uma tarefa cadastrada pelo usuário.

---

## 5.2 Campos

| Campo | Tipo lógico | Obrigatório | Regra |
|---|---|---:|---|
| id | UUID/String | Sim | Identificador único |
| title | String | Sim | Não pode ser vazio |
| description | String/Text | Não | Descrição principal |
| projectId | UUID/String | Sim | FK lógica para Project |
| startDate | Date | Sim | Data inicial |
| dueDate | Date | Sim | Prazo |
| time | Time/String | Não | Horário da tarefa |
| priority | Enum | Sim | LOW, MEDIUM, HIGH |
| status | Enum | Sim | PENDING, PARTIAL, COMPLETED |
| done | Boolean | Sim | Compatibilidade temporária com mobile atual |
| progress | Integer | Sim | 0 a 100, preferencialmente calculado |
| favorite | Boolean | Não | Preparação para requisito posterior |
| createdAt | DateTime | Sim | Data de criação |
| updatedAt | DateTime | Sim | Última alteração |
| deletedAt | DateTime/null | Não | Exclusão lógica para permitir desfazer |
| undoUntil | DateTime/null | Não | Janela de desfazer exclusão |

---

## 5.3 Prioridade

Valores canônicos:

```text
LOW
MEDIUM
HIGH
```

Mapeamento para o mobile atual:

```text
low    → LOW
medium → MEDIUM
high   → HIGH
```

---

## 5.4 Status

Valores-alvo para aderência ao requisito funcional:

```text
PENDING
PARTIAL
COMPLETED
```

O mobile atual utiliza:

```text
todo
in_progress
review
completed
```

Durante a transição, será necessário definir um mapeamento sem quebrar as telas existentes.

Mapeamento inicial sugerido:

```text
todo        → PENDING
in_progress → PARTIAL
review      → PARTIAL
completed   → COMPLETED
```

A manutenção de `review` como status independente poderá ser reavaliada futuramente.

---

## 5.5 Regra do campo done

O campo `done` existe atualmente no mobile.

Na arquitetura alvo:

```text
status = COMPLETED
```

deve ser a informação canônica.

Durante a migração:

```text
done = true
```

deverá permanecer consistente com:

```text
status = COMPLETED
```

No futuro, `done` poderá ser removido se deixar de ser necessário.

---

## 5.6 Regras de datas

Para criação de nova tarefa:

```text
startDate >= data atual
```

E sempre:

```text
dueDate >= startDate
```

Uma tarefa criada corretamente pode se tornar atrasada naturalmente com o passar do tempo.

O sistema não deve alterar ou excluir automaticamente tarefas vencidas.

---

## 5.7 Progresso

Se a tarefa possuir subtarefas:

```text
progress =
(subtarefas concluídas / total de subtarefas) * 100
```

Exemplo:

```text
4 subtarefas
2 concluídas

progress = 50
```

Se não houver subtarefas, o comportamento será:

```text
status = COMPLETED → progress = 100
demais status       → progress = 0
```

Essa regra poderá ser refinada posteriormente.

---

## 5.8 Exemplo lógico

```json
{
  "id": "task-001",
  "title": "Finalizar documentação",
  "description": "Finalizar documentação da Sprint 1",
  "projectId": "project-001",
  "startDate": "2026-10-02",
  "dueDate": "2026-10-04",
  "time": "18:00",
  "priority": "HIGH",
  "status": "PARTIAL",
  "done": false,
  "progress": 50,
  "createdAt": "2026-10-02T10:30:00.000Z",
  "updatedAt": "2026-10-02T12:00:00.000Z",
  "deletedAt": null,
  "undoUntil": null
}
```

---

# 6. Entidade Subtask

## 6.1 Finalidade

Representa uma etapa menor vinculada a uma tarefa.

---

## 6.2 Campos

| Campo | Tipo lógico | Obrigatório | Regra |
|---|---|---:|---|
| id | UUID/String | Sim | Identificador único |
| taskId | UUID/String | Sim | FK lógica para Task |
| title | String | Sim | Nome da subtarefa |
| done | Boolean | Sim | Estado de conclusão |
| createdAt | DateTime | Sim | Data de criação |
| updatedAt | DateTime | Sim | Última alteração |

---

## 6.3 Regras

- toda subtarefa pertence a uma tarefa existente;
- `title` não pode ser vazio;
- alteração de `done` deve atualizar o progresso da tarefa;
- excluir a tarefa deve remover ou invalidar suas subtarefas conforme a estratégia de persistência escolhida.

---

## 6.4 Exemplo

```json
{
  "id": "subtask-001",
  "taskId": "task-001",
  "title": "Revisar requisitos",
  "done": true,
  "createdAt": "2026-10-02T10:40:00.000Z",
  "updatedAt": "2026-10-02T11:20:00.000Z"
}
```

---

# 7. Entidade Note

## 7.1 Finalidade

Permite que uma tarefa possua múltiplas observações independentes.

Isso é diferente do campo:

```text
Task.description
```

A descrição representa o texto principal da tarefa.

As notas representam registros adicionais criados ao longo do tempo.

---

## 7.2 Campos

| Campo | Tipo lógico | Obrigatório | Regra |
|---|---|---:|---|
| id | UUID/String | Sim | Identificador único |
| taskId | UUID/String | Sim | FK lógica para Task |
| content | String/Text | Sim | Conteúdo da observação |
| createdAt | DateTime | Sim | Data de criação |
| updatedAt | DateTime | Sim | Última alteração |

---

## 7.3 Exemplo

```json
{
  "id": "note-001",
  "taskId": "task-001",
  "content": "Professor pediu revisão dos critérios de aceite.",
  "createdAt": "2026-10-02T13:00:00.000Z",
  "updatedAt": "2026-10-02T13:00:00.000Z"
}
```

---

# 8. Entidade TaskHistory

## 8.1 Finalidade

Registra eventos importantes relacionados a uma tarefa.

---

## 8.2 Campos

| Campo | Tipo lógico | Obrigatório | Regra |
|---|---|---:|---|
| id | UUID/String | Sim | Identificador único |
| taskId | UUID/String | Sim | Referência à tarefa |
| action | Enum/String | Sim | Tipo do evento |
| metadata | JSON/Text | Não | Informações adicionais |
| createdAt | DateTime | Sim | Momento do evento |

---

## 8.3 Ações iniciais

```text
CREATED
UPDATED
STATUS_CHANGED
COMPLETED
REOPENED
DELETED
RESTORED
PROJECT_CHANGED
```

---

## 8.4 Exemplo

```json
{
  "id": "history-001",
  "taskId": "task-001",
  "action": "STATUS_CHANGED",
  "metadata": {
    "from": "PENDING",
    "to": "PARTIAL"
  },
  "createdAt": "2026-10-02T14:00:00.000Z"
}
```

---

# 9. Exclusão de tarefas

O requisito da Entrega 1 inclui confirmação e possibilidade de desfazer.

Por isso, a primeira estratégia recomendada é **exclusão lógica temporária**.

Fluxo:

```text
Usuário solicita exclusão
        ↓
Confirma exclusão
        ↓
deletedAt = agora
undoUntil = agora + janela de desfazer
        ↓
Task deixa de aparecer nas listagens normais
        ↓
Usuário pode restaurar durante a janela
```

Se restaurar:

```text
deletedAt = null
undoUntil = null
```

E gerar histórico:

```text
RESTORED
```

Depois da janela, a exclusão física poderá ocorrer futuramente por rotina de limpeza.

A duração exata da janela de desfazer deverá ser definida como regra de negócio.

---

# 10. Exclusão de projetos

Um projeto não pode ser excluído deixando tarefas sem vínculo válido.

O comportamento atual do mobile utiliza `Geral` como categoria de fallback.

A estratégia inicial proposta é:

```text
Excluir Project
      ↓
Localizar tarefas vinculadas
      ↓
Reatribuir para Project "Geral"
      ↓
Excluir projeto
```

Antes da implementação no backend, deve existir um projeto fallback válido com identificador conhecido.

Exemplo:

```text
GENERAL_PROJECT_ID
```

O nome `"Geral"` não deve ser usado como chave lógica.

Esta regra deverá ser registrada também em decisão arquitetural caso seja mantida.

---

# 11. Integridade referencial

As relações deverão respeitar:

```text
Task.projectId      → Project.id
Subtask.taskId      → Task.id
Note.taskId         → Task.id
TaskHistory.taskId  → Task.id
```

Não deve ser possível:

- criar tarefa com projeto inexistente;
- criar subtarefa para tarefa inexistente;
- criar nota para tarefa inexistente;
- deixar tarefa apontando para projeto removido;
- persistir status ou prioridade fora dos valores permitidos.

---

# 12. IDs

A aplicação atual utiliza IDs baseados em:

```text
Date.now().toString()
```

Isso funciona localmente, mas não é ideal para integração com servidor.

A arquitetura alvo deve utilizar identificadores independentes do dispositivo.

Preferência lógica:

```text
UUID
```

A tecnologia exata será definida junto ao banco/API.

Durante a migração, IDs antigos devem continuar sendo aceitos para evitar perda de dados locais.

---

# 13. Datas e horários

Para evitar ambiguidades:

### Datas

```text
YYYY-MM-DD
```

Exemplo:

```text
2026-10-02
```

### Data/hora de auditoria

Formato recomendado:

```text
ISO 8601 / UTC
```

Exemplo:

```text
2026-10-02T14:30:00.000Z
```

### Horário da tarefa

Pode ser representado inicialmente como:

```text
HH:mm
```

Exemplo:

```text
18:30
```

A API e o mobile devem definir claramente a conversão para horário local.

---

# 14. Campos de auditoria

Entidades principais devem possuir:

```text
createdAt
updatedAt
```

Quando aplicável:

```text
deletedAt
```

O backend será responsável por manter esses valores consistentes.

---

# 15. Sincronização local ↔ servidor

A aplicação já possui dados locais em AsyncStorage.

A integração deverá preservar esses dados.

Cada registro deverá possuir pelo menos:

```text
id
updatedAt
```

para permitir identificar versões durante sincronização.

Em uma fase posterior podem ser adicionados campos como:

```text
syncStatus
lastSyncedAt
version
```

Possíveis valores:

```text
PENDING
SYNCED
CONFLICT
```

Esses campos não são obrigatórios para a primeira implementação caso a sincronização manual simples consiga funcionar sem eles.

---

# 16. Fonte de verdade

Durante a transição:

```text
AsyncStorage
```

continua preservando dados locais.

Depois da integração completa do MVP:

```text
Banco do servidor
```

será a fonte persistente principal.

O AsyncStorage passa a atuar principalmente como:

- cache local;
- apoio offline;
- recuperação rápida do estado.

Não devem existir duas fontes de verdade independentes sem estratégia de reconciliação.

---

# 17. Compatibilidade com o modelo atual do mobile

## Task atual

O mobile utiliza campos semelhantes a:

```text
id
title
description
project
time
priority
status
done
startDate
dueDate
subtasks
reminders
```

Modelo alvo:

```text
id
title
description
projectId
time
priority
status
done
progress
startDate
dueDate
createdAt
updatedAt
deletedAt
undoUntil
```

Subtarefas passam a poder existir como entidade persistida própria.

---

## Project atual

O mobile utiliza:

```text
id
name
description
color
icon
```

Modelo alvo acrescenta:

```text
createdAt
updatedAt
```

---

# 18. Estratégia de migração incremental

A migração deve acontecer em etapas.

### Etapa A

Manter o mobile funcionando como está.

```text
Context
↓
AsyncStorage
```

### Etapa B

Introduzir Services.

```text
Context
↓
Service
↓
AsyncStorage/API
```

### Etapa C

Introduzir `projectId` mantendo temporariamente `project`.

```text
Task
├── projectId
└── project (compatibilidade)
```

### Etapa D

Migrar as telas para usar o relacionamento correto.

### Etapa E

Remover campos redundantes somente depois de todos os consumidores estarem adaptados.

---

# 19. Modelo ER conceitual

```text
┌──────────────────┐
│     PROJECT      │
├──────────────────┤
│ id PK            │
│ name             │
│ description      │
│ color            │
│ icon             │
│ createdAt        │
│ updatedAt        │
└────────┬─────────┘
         │ 1
         │
         │ N
┌────────▼─────────┐
│       TASK       │
├──────────────────┤
│ id PK            │
│ projectId FK     │
│ title            │
│ description      │
│ startDate        │
│ dueDate          │
│ time             │
│ priority         │
│ status           │
│ done             │
│ progress         │
│ createdAt        │
│ updatedAt        │
│ deletedAt        │
│ undoUntil        │
└───┬─────┬─────┬──┘
    │     │     │
    │     │     │
    │1    │1    │1
    │     │     │
    │N    │N    │N
    ▼     ▼     ▼

SUBTASK  NOTE  TASK_HISTORY
```

---

# 20. Regras resumidas de integridade

## Project

```text
name != vazio
id = único
```

## Task

```text
title != vazio
projectId existente
priority ∈ {LOW, MEDIUM, HIGH}
status ∈ {PENDING, PARTIAL, COMPLETED}
startDate >= hoje na criação
dueDate >= startDate
progress entre 0 e 100
```

## Subtask

```text
taskId existente
title != vazio
```

## Note

```text
taskId existente
content != vazio
```

## TaskHistory

```text
taskId válido ou referência histórica preservada
action != vazio
createdAt obrigatório
```

---

# 21. Entidades fora do MVP inicial

As entidades abaixo serão modeladas posteriormente, quando seus PBIs entrarem em desenvolvimento:

```text
Reminder
Recurrence
Attachment
UserProfile
SavedFilter
Template
TaskDependency
TimeTracking
Location
NotificationPreference
SyncConflict
Backup
HardwareContext
```

Elas não devem ser criadas antecipadamente sem necessidade.

---

# 22. Decisões pendentes

Antes da implementação do banco ainda será necessário decidir:

1. tecnologia do banco;
2. ORM/query builder ou acesso direto;
3. estratégia de migrations;
4. formato de IDs;
5. política definitiva de soft delete;
6. duração da janela de desfazer;
7. política para exclusão do projeto;
8. política de conflitos de sincronização;
9. necessidade de `syncStatus`;
10. necessidade de autenticação no MVP.

Essas decisões deverão ser registradas em:

```text
docs/decisoes/
```

---

# 23. Próxima decisão técnica

Com o modelo lógico definido, o próximo passo é comparar opções de banco compatíveis com:

- Node.js;
- mini API;
- projeto acadêmico;
- execução local;
- simplicidade;
- testes;
- migrations;
- persistência relacional.

A escolha deverá ser documentada por uma decisão arquitetural antes da implementação.

---

## Status

**Modelo de dados inicial definido.**

Próximo passo:

> Avaliar e selecionar o banco de dados para a mini API do Gestor Diário.

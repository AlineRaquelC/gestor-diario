# Arquitetura Inicial — Gestor Diário

## 1. Objetivo

Este documento registra a arquitetura inicial planejada para o projeto **Gestor Diário**.

A arquitetura deve permitir a evolução incremental do aplicativo mobile já existente para uma solução composta por:

- aplicativo React Native;
- persistência local;
- mini API REST em Node.js;
- banco de dados;
- testes;
- integração contínua;
- entrega contínua.

A implementação será feita de forma gradual, preservando o código mobile que já funciona.

---

## 2. Escopo desta arquitetura

Esta arquitetura corresponde principalmente à **Entrega 1 — MVP** e à evolução planejada para a **Sprint 1**.

Ela não define ainda:

- banco de dados definitivo;
- autenticação definitiva;
- infraestrutura de produção;
- recursos de hardware;
- sensores;
- câmera;
- GPS;
- biometria;
- deploy em nuvem.

Esses itens serão definidos em etapas posteriores.

---

## 3. Tecnologias principais

### Mobile

- React Native
- TypeScript
- React Navigation
- AsyncStorage
- Android

### Backend

- Node.js
- API REST
- TypeScript, caso compatível com a implementação escolhida

### Banco

O banco de dados ainda será definido na etapa de arquitetura da mini API.

A escolha deverá considerar:

- simplicidade;
- compatibilidade com Node.js;
- facilidade de demonstração;
- persistência local do servidor;
- baixo custo de manutenção;
- adequação ao MVP acadêmico.

---

## 4. Estado atual do aplicativo

Atualmente, o mobile funciona com uma arquitetura simplificada:

```text
Telas React Native
        ↓
Contexts
        ↓
AsyncStorage
```

Os principais Contexts atuais são:

```text
TaskContext
ProjectContext
```

Eles concentram o estado das tarefas e projetos e fazem persistência local com `AsyncStorage`.

Essa arquitetura continuará válida durante a transição para a API.

---

## 5. Arquitetura alvo do MVP

A arquitetura planejada para o MVP será:

```text
┌─────────────────────────────────────┐
│          APP REACT NATIVE           │
│                                     │
│  Screens                            │
│     ↓                               │
│  Contexts                           │
│     ↓                               │
│  Services                           │
│     ↓                               │
│  API Client                         │
└───────────────┬─────────────────────┘
                │ HTTP / JSON
                ▼
┌─────────────────────────────────────┐
│            API NODE.JS              │
│                                     │
│  Routes                             │
│     ↓                               │
│  Controllers                        │
│     ↓                               │
│  Services                           │
│     ↓                               │
│  Repositories                       │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│          BANCO DE DADOS             │
│                                     │
│  Tasks                              │
│  Projects                           │
│  Subtasks                           │
│  Notes                              │
│  History                            │
└─────────────────────────────────────┘
```

---

## 6. Responsabilidades por camada

### 6.1 Screens

Responsáveis pela interface e interação com o usuário.

Exemplos:

- Home;
- Nova Tarefa;
- Detalhes da Tarefa;
- Editar Tarefa;
- Projetos;
- Criar Projeto;
- Editar Projeto;
- Detalhes do Projeto;
- Calendário.

As telas não deverão conter diretamente:

- chamadas HTTP;
- regras complexas de negócio;
- acesso direto ao banco;
- lógica de persistência remota.

---

### 6.2 Contexts

Os Contexts continuarão responsáveis por disponibilizar o estado da aplicação para as telas.

Exemplos:

```text
TaskContext
ProjectContext
```

Durante a transição, os Contexts poderão:

1. manter estado em memória;
2. chamar os Services;
3. atualizar o estado após resposta da API;
4. persistir cache local no AsyncStorage.

O objetivo é evitar que as telas conheçam detalhes da API.

---

### 6.3 Services do mobile

Será criada uma camada de serviços entre Contexts e API.

Estrutura sugerida:

```text
src/
└── services/
    ├── api.ts
    ├── taskService.ts
    └── projectService.ts
```

Responsabilidades:

- montar requisições HTTP;
- enviar dados;
- receber respostas;
- tratar erros básicos de comunicação;
- padronizar endpoints;
- evitar chamadas HTTP espalhadas pelas telas.

Fluxo:

```text
Screen
  ↓
Context
  ↓
Service
  ↓
API
```

---

## 7. Papel do AsyncStorage

O `AsyncStorage` já funciona no aplicativo e será preservado.

Na arquitetura final do MVP, ele não deverá competir com o servidor como uma segunda fonte de verdade independente.

### Estratégia planejada

Inicialmente:

```text
AsyncStorage = persistência local atual
```

Depois da integração com a API:

```text
Servidor/Banco = fonte principal persistente

AsyncStorage = cache local / apoio offline / recuperação de estado
```

A migração deverá ser gradual para evitar perda dos dados existentes.

---

## 8. Sincronização

A primeira integração deverá priorizar **sincronização manual**.

Fluxo inicial:

```text
Usuário solicita sincronização
        ↓
Mobile consulta dados locais
        ↓
Service envia/consulta API
        ↓
API valida dados
        ↓
Banco persiste alterações
        ↓
API devolve estado atualizado
        ↓
Context atualiza o mobile
        ↓
AsyncStorage atualiza cache
```

Sincronização automática periódica fica para evolução posterior.

---

## 9. Backend Node.js

A mini API deverá possuir separação mínima de responsabilidades.

Estrutura prevista:

```text
backend/
└── src/
    ├── routes/
    ├── controllers/
    ├── services/
    ├── repositories/
    ├── models/
    ├── middlewares/
    ├── database/
    ├── app.ts
    └── server.ts
```

A estrutura poderá ser simplificada se necessário, desde que permaneça clara.

---

## 10. Rotas iniciais previstas

### Tasks

```text
POST   /tasks
GET    /tasks
GET    /tasks/:id
PATCH  /tasks/:id
DELETE /tasks/:id
```

### Projects

```text
POST   /projects
GET    /projects
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id
```

Rotas adicionais somente deverão ser criadas quando houver necessidade real do backlog.

---

## 11. Modelo lógico inicial

### Project

Campos mínimos previstos:

```text
id
name
description
color
icon
createdAt
updatedAt
```

Relacionamento:

```text
Project 1 ───── N Task
```

---

### Task

Campos mínimos previstos:

```text
id
title
description
projectId
startDate
dueDate
time
priority
status
done
createdAt
updatedAt
```

---

### Subtask

```text
id
taskId
title
done
createdAt
updatedAt
```

Relacionamento:

```text
Task 1 ───── N Subtask
```

---

### Note

Para suportar observações múltiplas:

```text
id
taskId
content
createdAt
updatedAt
```

Relacionamento:

```text
Task 1 ───── N Note
```

---

### TaskHistory

Para registrar alterações relevantes:

```text
id
taskId
action
createdAt
metadata
```

Exemplos de ações:

```text
CREATED
UPDATED
COMPLETED
REOPENED
DELETED
```

Relacionamento:

```text
Task 1 ───── N TaskHistory
```

---

## 12. Identificação de projeto

O código mobile atual utiliza, em alguns pontos, o nome do projeto associado à tarefa.

Na arquitetura com banco e API, o relacionamento deverá evoluir para:

```text
Task.projectId
```

em vez de usar apenas:

```text
Task.project
```

Essa mudança deverá ser feita de forma incremental, evitando quebrar o front já existente.

Durante a transição pode ser necessário manter temporariamente:

```text
projectId
project
```

até todas as telas estarem adaptadas.

---

## 13. Regras de negócio principais

As regras deverão ser validadas no mobile e novamente no backend.

### Task

- título obrigatório;
- projeto válido;
- prioridade válida;
- status válido;
- data de início válida;
- nova tarefa não pode iniciar antes da data atual;
- prazo não pode ser anterior à data de início;
- exclusão deve seguir o comportamento definido pelo backlog;
- tarefas concluídas devem refletir corretamente no progresso.

### Project

- nome obrigatório;
- identificação única;
- tratamento seguro ao excluir projeto;
- tarefas vinculadas não podem ficar em estado inconsistente.

---

## 14. Tratamento de erros

A API deverá retornar códigos HTTP coerentes.

Exemplos:

```text
200 OK
201 Created
204 No Content
400 Bad Request
404 Not Found
409 Conflict
500 Internal Server Error
```

O mobile deverá:

- informar falhas relevantes ao usuário;
- evitar encerrar a aplicação;
- manter consistência do estado;
- evitar sobrescrever dados locais silenciosamente em caso de falha.

---

## 15. Configuração por ambiente

Endereços da API, portas e demais valores configuráveis não devem ficar espalhados pelas telas.

A configuração deverá ficar centralizada.

Exemplo futuro:

```text
src/services/api.ts
```

ou em configuração de ambiente apropriada.

Credenciais, tokens ou secrets nunca deverão ser versionados.

---

## 16. Estrutura prevista do repositório

A estrutura poderá evoluir para:

```text
gestor-diario/
│
├── android/
├── ios/
├── src/
│   ├── components/
│   ├── context/
│   ├── navigation/
│   ├── screens/
│   └── services/
│
├── backend/
│   └── src/
│
├── docs/
│   ├── requisitos/
│   ├── backlog/
│   ├── sprints/
│   ├── arquitetura/
│   ├── processo/
│   └── decisoes/
│
├── .github/
│   └── workflows/
│
├── README.md
└── CONTRIBUTING.md
```

O aplicativo React Native permanecerá na raiz enquanto uma reorganização não for tecnicamente necessária.

---

## 17. Git e fluxo de integração

Branches principais:

```text
main
dev
```

Fluxo:

```text
Issue
  ↓
feature/*
  ↓
commit
  ↓
Pull Request
  ↓
dev
  ↓
CI/Testes
  ↓
Pull Request
  ↓
main
```

Commits seguem:

```text
tipo(escopo): descrição
```

Exemplos:

```text
feat(tasks): adiciona endpoint de criação
fix(storage): corrige persistência local
docs(architecture): documenta arquitetura inicial
test(tasks): adiciona testes do CRUD
ci(api): adiciona validação da API
```

---

## 18. Integração contínua

A primeira pipeline deverá evoluir gradualmente para validar:

### Mobile

```text
TypeScript
Lint
Testes
```

### Backend

```text
Instalação de dependências
TypeScript
Lint
Testes
```

Em etapas posteriores:

```text
Build Android
APK
Entrega contínua
```

---

## 19. Segurança

O repositório não deverá conter:

```text
.env
.env.*
*.jks
*.keystore
key.properties
local.properties
tokens
senhas
chaves privadas
credenciais
```

Exceção de desenvolvimento já documentada:

```text
android/app/debug.keystore
```

A configuração atual que utiliza assinatura de debug para release é temporária e deverá ser substituída antes da geração final do APK.

---

## 20. Decisões ainda pendentes

Ainda deverão ser decididos:

- banco de dados;
- biblioteca/framework HTTP da API;
- biblioteca de acesso ao banco;
- estratégia exata de sincronização;
- política de conflitos de sincronização;
- estratégia final offline;
- autenticação, caso necessária;
- assinatura Android de produção;
- deploy, caso necessário.

Essas decisões deverão ser registradas em:

```text
docs/decisoes/
```

---

## 21. Princípios da arquitetura

A implementação deverá seguir estes princípios:

1. não quebrar funcionalidades existentes;
2. mudanças pequenas e incrementais;
3. telas não acessam API diretamente;
4. regras críticas validadas também no backend;
5. banco não é acessado diretamente pelo mobile;
6. evitar duplicação de fontes de verdade;
7. manter rastreabilidade com backlog e Issues;
8. código deve permanecer demonstrável ao final de cada Sprint;
9. novas tecnologias somente serão adicionadas quando necessárias;
10. simplicidade tem prioridade sobre complexidade arquitetural desnecessária.

---

## 22. Evolução planejada

### Estado atual

```text
React Native
    ↓
Contexts
    ↓
AsyncStorage
```

### Sprint 1 / MVP

```text
React Native
    ↓
Contexts
    ↓
Services
    ↓
API REST
    ↓
Node.js
    ↓
Banco

AsyncStorage → cache/persistência local
```

### Evoluções posteriores

```text
Notificações
Recorrência
Sincronização automática
Anexos
Câmera
GPS
Voz
Sensores
Biometria
Outras integrações Android
```

---

## 23. Status

**Arquitetura inicial definida.**

Próxima decisão arquitetural:

> Definir a tecnologia de banco de dados e a estratégia inicial de implementação da mini API Node.js antes do início do desenvolvimento do backend.

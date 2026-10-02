# ADR-002 — Stack Técnica da Mini API Node.js

## Status

**Aceito**

## Data

2026-10-02

## Projeto

**Gestor Diário**

---

## 1. Contexto

O projeto **Gestor Diário** utilizará uma mini API Node.js para integrar o aplicativo React Native a um banco SQLite na primeira entrega.

A arquitetura definida anteriormente é:

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
SQLite
```

A primeira entrega deve priorizar:

- simplicidade;
- clareza arquitetural;
- baixo custo de configuração;
- fácil execução local;
- fácil demonstração;
- facilidade de testes;
- rastreabilidade com GitHub Issues e CI;
- possibilidade de evolução futura.

O backend não deve introduzir complexidade maior do que a necessária para o MVP.

---

## 2. Decisão

A stack da mini API da primeira entrega será:

```text
Node.js
TypeScript
Express
Zod
Drizzle ORM
SQLite
better-sqlite3
Drizzle Kit
Vitest
Supertest
```

Ferramentas complementares previstas:

```text
cors
dotenv
```

A adoção de qualquer dependência adicional deverá ser justificada pela necessidade real do backlog.

---

# 3. Componentes escolhidos

## 3.1 Node.js

### Responsabilidade

Executar a aplicação backend.

### Motivos

- requisito tecnológico do projeto;
- amplo ecossistema;
- integração direta com TypeScript;
- bom suporte a APIs REST;
- fácil execução local;
- boa integração com ferramentas de CI.

---

## 3.2 TypeScript

### Responsabilidade

Adicionar tipagem estática ao backend.

### Motivos

- o mobile já utiliza TypeScript;
- reduz inconsistências entre camadas;
- melhora manutenção;
- facilita DTOs, schemas e contratos;
- ajuda na refatoração;
- permite compartilhar conceitos de tipos entre mobile e backend no futuro.

---

# 4. Framework HTTP

## Escolha

**Express**

### Responsabilidade

- definir rotas HTTP;
- receber requisições;
- aplicar middlewares;
- encaminhar requisições aos controllers;
- retornar respostas HTTP.

---

## 4.1 Motivos da escolha

Express foi escolhido porque:

- possui curva de aprendizado baixa;
- é amplamente conhecido;
- possui grande quantidade de documentação;
- é suficiente para a mini API;
- funciona bem com TypeScript;
- integra facilmente com Supertest;
- não impõe arquitetura complexa;
- permite demonstrar claramente Routes → Controllers → Services → Repositories.

---

## 4.2 Alternativa avaliada: Fastify

Fastify também seria tecnicamente adequado.

### Vantagens

- bom desempenho;
- arquitetura moderna;
- validação e serialização bem integradas;
- bom suporte a plugins.

### Motivo para não escolher na primeira entrega

O desempenho adicional não é um requisito importante do MVP.

Para esta entrega, simplicidade e familiaridade possuem maior peso.

A escolha poderá ser revisada futuramente sem alterar os princípios arquiteturais do projeto.

---

# 5. Validação de dados

## Escolha

**Zod**

### Responsabilidade

Validar dados recebidos pela API.

Exemplos:

- body;
- params;
- query string;
- enums;
- datas;
- campos obrigatórios.

---

## 5.1 Uso esperado

Exemplo conceitual:

```text
Request
   ↓
Zod Schema
   ↓
Controller
```

Dados inválidos devem ser rejeitados antes de chegar às regras principais de negócio.

---

## 5.2 Motivos

- integração simples com TypeScript;
- schemas legíveis;
- inferência de tipos;
- bom uso para DTOs;
- adequado ao tamanho do projeto.

---

# 6. Persistência

## Banco

**SQLite**

Definido na:

```text
ADR-001 — Escolha do Banco de Dados da Primeira Entrega
```

---

# 7. ORM / Camada de acesso ao banco

## Escolha

**Drizzle ORM**

### Responsabilidade

- modelar tabelas;
- executar consultas;
- manter tipagem;
- apoiar migrations;
- reduzir SQL espalhado pelo código;
- permitir uma camada Repository mais organizada.

---

## 7.1 Motivos da escolha

Drizzle foi escolhido por ser:

- leve;
- fortemente tipado;
- adequado a TypeScript;
- compatível com SQLite;
- menos intrusivo que ORMs mais pesados;
- adequado a um backend pequeno;
- compatível com migrations por Drizzle Kit;
- próximo do modelo relacional e SQL.

A escolha busca manter o banco compreensível durante a disciplina.

---

## 7.2 Alternativa avaliada: Prisma

### Vantagens

- excelente experiência de desenvolvimento;
- migrations;
- client tipado;
- ampla documentação.

### Motivo para não escolher nesta primeira entrega

Para uma mini API com SQLite, Prisma adicionaria mais infraestrutura e geração de client do que o projeto necessita inicialmente.

Poderia ser utilizado, mas a prioridade desta entrega é manter a stack enxuta.

---

## 7.3 Alternativa avaliada: SQL direto / driver puro

### Vantagens

- mínimo de abstração;
- controle total das consultas.

### Desvantagens

- maior risco de SQL espalhado;
- migrations teriam que ser organizadas separadamente;
- menor padronização;
- maior trabalho manual para tipagem.

Por isso, não será a opção principal.

---

# 8. Driver SQLite

## Escolha

**better-sqlite3**

### Responsabilidade

Fornecer acesso ao arquivo SQLite utilizado pelo backend.

### Motivos

- simples;
- apropriado para execução local;
- integração direta com Drizzle;
- bom desempenho para o escopo;
- reduz complexidade assíncrona desnecessária no acesso local ao arquivo.

O uso síncrono do driver é aceitável para a carga prevista do MVP acadêmico.

---

# 9. Migrations

## Escolha

**Drizzle Kit**

### Responsabilidade

- gerar migrations;
- versionar alterações do schema;
- permitir reconstrução do banco;
- manter histórico do modelo físico.

Fluxo esperado:

```text
Schema TypeScript
       ↓
Drizzle Kit
       ↓
Migration SQL
       ↓
SQLite
```

Migrations devem ser versionadas no Git.

O arquivo local de banco de desenvolvimento poderá ser ignorado quando apropriado.

---

# 10. Testes

## 10.1 Test runner

**Vitest**

### Motivos

- simples;
- rápido;
- bom suporte a TypeScript;
- configuração pequena;
- adequado para testes unitários e integração.

---

## 10.2 Teste HTTP

**Supertest**

### Responsabilidade

Testar endpoints sem depender manualmente de navegador ou cliente REST.

Exemplos:

```text
POST /tasks
GET /tasks
PATCH /tasks/:id
DELETE /tasks/:id
```

---

## 10.3 Estratégia de testes

O backend deverá possuir pelo menos:

```text
testes de validação
testes de services
testes de endpoints principais
```

Quando necessário:

```text
SQLite de teste separado
```

ou:

```text
SQLite temporário / em memória
```

A decisão final será feita na configuração de testes.

---

# 11. CORS

## Escolha

**cors**

Durante desenvolvimento, a API deverá permitir comunicação com o ambiente mobile conforme necessário.

A política não deve ser deixada irrestrita em uma eventual implantação pública sem revisão.

---

# 12. Variáveis de ambiente

## Escolha

**dotenv**

Será utilizado apenas para configurações que devam variar por ambiente.

Exemplos possíveis:

```text
PORT
DATABASE_PATH
NODE_ENV
```

Nenhum `.env` deverá ser versionado.

Deverá existir, quando necessário:

```text
.env.example
```

sem valores secretos.

---

# 13. Arquitetura do backend

Estrutura inicial planejada:

```text
backend/
├── src/
│   ├── config/
│   ├── database/
│   │   ├── schema/
│   │   ├── migrations/
│   │   └── index.ts
│   │
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── schemas/
│   ├── middlewares/
│   ├── errors/
│   ├── app.ts
│   └── server.ts
│
├── tests/
├── drizzle.config.ts
├── package.json
├── tsconfig.json
└── .env.example
```

A estrutura pode ser ajustada durante implementação caso haja motivo técnico claro.

---

# 14. Responsabilidades por camada

## Routes

Responsáveis por:

- método HTTP;
- endpoint;
- middlewares;
- controller correspondente.

Não devem conter regras de negócio.

---

## Controllers

Responsáveis por:

- receber request;
- extrair dados validados;
- chamar service;
- construir response HTTP.

Não devem acessar SQLite diretamente.

---

## Services

Responsáveis por:

- regras de negócio;
- validações que dependam do domínio;
- coordenação entre repositories;
- histórico;
- regras de exclusão;
- regras de status;
- progresso.

---

## Repositories

Responsáveis por:

- consultas;
- insert;
- update;
- delete;
- acesso ao Drizzle/SQLite.

A camada Repository isola o restante da aplicação da tecnologia de persistência.

---

## Schemas

Responsáveis por validação Zod.

Exemplos:

```text
createTaskSchema
updateTaskSchema
createProjectSchema
```

---

## Middlewares

Responsáveis por preocupações transversais.

Exemplos futuros:

```text
tratamento de erros
validação
logging
autenticação
```

Somente os necessários serão criados.

---

# 15. Fluxo de uma requisição

Exemplo:

```text
POST /tasks
     ↓
Route
     ↓
Zod Validation
     ↓
TaskController
     ↓
TaskService
     ↓
ProjectRepository (validar projeto)
     ↓
TaskRepository
     ↓
SQLite
     ↓
TaskHistory
     ↓
Response 201
```

---

# 16. Endpoints iniciais

## Projects

```text
POST   /projects
GET    /projects
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id
```

---

## Tasks

```text
POST   /tasks
GET    /tasks
GET    /tasks/:id
PATCH  /tasks/:id
DELETE /tasks/:id
```

---

## Subtasks

A definição exata poderá utilizar recursos aninhados.

Exemplo previsto:

```text
POST   /tasks/:taskId/subtasks
PATCH  /tasks/:taskId/subtasks/:id
DELETE /tasks/:taskId/subtasks/:id
```

---

## Notes

Exemplo previsto:

```text
POST   /tasks/:taskId/notes
GET    /tasks/:taskId/notes
PATCH  /tasks/:taskId/notes/:id
DELETE /tasks/:taskId/notes/:id
```

---

## History

Inicialmente:

```text
GET /tasks/:taskId/history
```

O histórico será criado automaticamente pelas regras de negócio, e não por endpoint público de criação.

---

# 17. Respostas HTTP

Padrão esperado:

```text
200 OK
201 Created
204 No Content
400 Bad Request
404 Not Found
409 Conflict
500 Internal Server Error
```

Erros devem possuir resposta consistente.

Exemplo conceitual:

```json
{
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "Tarefa não encontrada."
  }
}
```

---

# 18. Validações principais

## Project

```text
name obrigatório
color válida
icon definido quando exigido pelo modelo
```

---

## Task

```text
title obrigatório
projectId existente
priority válida
status válido
startDate válida
startDate >= hoje na criação
dueDate >= startDate
```

---

## Subtask

```text
taskId existente
title obrigatório
```

---

## Note

```text
taskId existente
content obrigatório
```

---

# 19. IDs

A estratégia preferencial será:

```text
UUID
```

A biblioteca exata para geração poderá ser escolhida durante implementação, preferindo recursos nativos/plataforma quando possível.

IDs existentes do mobile devem ser tratados com compatibilidade durante a migração.

---

# 20. Scripts previstos

O `backend/package.json` deverá possuir scripts equivalentes a:

```text
dev
build
start
typecheck
test
test:run
db:generate
db:migrate
```

Os nomes definitivos podem ser ajustados de acordo com as ferramentas instaladas.

---

# 21. Desenvolvimento local

Fluxo esperado:

Terminal 1:

```text
backend API
```

Terminal 2:

```text
Metro / React Native
```

Terminal 3, quando necessário:

```text
Android build / adb
```

A API deverá ter URL configurável no mobile.

Emulador Android não deve utilizar `localhost` para acessar diretamente o host sem considerar a rede especial do emulador.

Esse detalhe será documentado durante a integração mobile/API.

---

# 22. CI inicial do backend

Pipeline previsto:

```text
Checkout
   ↓
npm ci
   ↓
TypeScript
   ↓
Lint
   ↓
Testes
```

Migrations poderão ser testadas em banco temporário.

Nenhum banco real de desenvolvimento deverá ser exigido no CI.

---

# 23. Dependências previstas

## Produção

```text
express
zod
drizzle-orm
better-sqlite3
cors
dotenv
```

---

## Desenvolvimento

```text
typescript
tsx
drizzle-kit
vitest
supertest
@types/node
@types/express
@types/cors
@types/supertest
@types/better-sqlite3
```

A lista deverá ser confirmada durante a criação efetiva do backend.

Pacotes desnecessários não devem ser instalados antecipadamente.

---

# 24. O que não será utilizado agora

Nesta primeira versão da API, não há necessidade de:

```text
NestJS
microserviços
GraphQL
Redis
mensageria
Kubernetes
Docker obrigatório
autenticação complexa
cloud
serverless
```

Essas tecnologias só deverão ser adicionadas se o backlog criar necessidade real.

---

# 25. Consequências positivas

A stack escolhida oferece:

- baixa complexidade inicial;
- bom suporte a TypeScript;
- arquitetura didática;
- banco relacional simples;
- validação clara;
- migrations;
- testes automatizados;
- facilidade de execução local;
- possibilidade de evolução futura.

---

# 26. Consequências negativas

A equipe deverá considerar:

- Express exige que a arquitetura seja organizada manualmente;
- SQLite possui limitações de escala e concorrência;
- better-sqlite3 utiliza acesso síncrono;
- Drizzle exige aprendizado inicial;
- algumas decisões poderão precisar ser revistas em uma futura implantação maior.

Essas limitações são aceitáveis para a primeira entrega.

---

# 27. Alternativas rejeitadas nesta etapa

```text
Fastify
Prisma
SQL direto sem camada
NestJS
PostgreSQL
MySQL/MariaDB
```

Nenhuma delas é considerada inadequada tecnicamente.

Elas apenas não foram escolhidas por não oferecerem vantagem suficiente para o escopo atual em comparação ao aumento de complexidade.

---

# 28. Segurança

A API não deverá versionar:

```text
.env
arquivos SQLite de desenvolvimento quando contiverem dados locais
tokens
senhas
credenciais
chaves privadas
```

O `.gitignore` do backend deverá ser revisado durante sua criação.

---

# 29. Logging

Na primeira implementação, logging poderá utilizar mecanismos simples.

Não será adicionada biblioteca avançada de observabilidade sem necessidade.

Erros não devem imprimir secrets.

---

# 30. Documentação da API

Na primeira entrega, a API deverá ser documentada no repositório.

Formato mínimo:

```text
Método
Endpoint
Objetivo
Request
Response
Erros
```

Swagger/OpenAPI poderá ser considerado posteriormente, mas não é obrigatório para iniciar o MVP.

---

# 31. Próximo passo

Com esta ADR aceita, o próximo passo será:

1. finalizar documentação de processo;
2. transformar a Sprint 1 em GitHub Issues;
3. criar CI inicial;
4. criar a estrutura `backend/`;
5. instalar somente as dependências aprovadas;
6. criar schema/migrations;
7. iniciar o CRUD de Projects;
8. iniciar o CRUD de Tasks.

---

## Resultado

Stack aprovada para a primeira entrega:

```text
Node.js
+ TypeScript
+ Express
+ Zod
+ Drizzle ORM
+ better-sqlite3
+ SQLite
+ Drizzle Kit
+ Vitest
+ Supertest
```

**Status: ACEITO**

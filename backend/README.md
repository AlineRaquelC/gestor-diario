# Mini API — Gestor Diário

Mini API da Sprint 1, com base técnica (Issue #1), schema SQLite (Issue #2)
CRUD de projetos (Issue #3), criação (Issue #4), consulta (Issue #5), edição (#6)
e status/histórico de tarefas (#7), conforme as ADRs 001 e 002.

## Desenvolvimento local

Use Node.js 24 LTS e npm. A API tem dependências e lockfile próprios.

Em um banco local novo ou ainda não migrado, execute a partir da raiz do repositório:

```bash
cd backend
npm install
npm run db:migrate
npm run dev
```

`npm run db:migrate` prepara/aplica o schema SQLite. `npm run dev` apenas
inicia a API; não executa migrations automaticamente. Um banco novo sem migration
pode causar HTTP 500 ao acessar Projects/Tasks. Aplique as migrations antes de
usá-lo.

O servidor usa `PORT=3000` por padrão. Opcionalmente, copie `.env.example`
para `.env` e ajuste `PORT`, `NODE_ENV` e `DATABASE_PATH`; `.env` não é versionado.
Uma porta inválida impede a inicialização com uma mensagem de erro.

Health check: <http://localhost:3000/health> (ajuste a porta se necessário).

```bash
curl http://localhost:3000/health
```

Resposta: HTTP 200 com `{"status":"ok"}`.

## Validação e build

```bash
npm run typecheck
npm test
npm run build
npm start
```

`npm test` executa o Vitest uma vez; `npm run test:watch` permite acompanhar
alterações. O build gera `dist/`, ignorado pelo Git. `npm start` executa esse
build e requer `npm run build` antes.

## Estrutura

`createApp(db)` em `app.ts` configura Express, CORS, JSON e rotas sem abrir uma porta
ou conectar ao banco; os testes injetam uma conexão isolada.
`server.ts` carrega a configuração de ambiente, abre a conexão e inicia o servidor;
fecha a conexão ao receber SIGINT/SIGTERM.
O health check usa uma rota e um controller, sem regra de negócio adicional.
O teste HTTP utiliza Vitest e Supertest.

`database/` contém a conexão, o schema e o executor de migrations.
O CRUD de projetos segue Route → Controller → Service → Repository → Drizzle → SQLite.
A criação de tarefas está integrada ao mobile; não há sincronização geral.

## SQLite e migrations

A persistência usa Drizzle ORM e better-sqlite3. Execute os comandos dentro de
`backend/`. `DATABASE_PATH` configura o arquivo SQLite; o padrão é
`./data/gestor-diario.db`, relativo ao diretório de execução. O diretório pai
é criado pela conexão. Os bancos locais e seus arquivos auxiliares são ignorados.

```bash
npm run db:generate
npm run db:migrate
```

`db:generate` usa Drizzle Kit para gerar SQL e metadados em `drizzle/` a partir
de `src/database/schema/`. SQL e metadados devem ser versionados.
`db:migrate` aplica as migrations pendentes pelo migrator do Drizzle ORM;
a conexão ativa `PRAGMA foreign_keys = ON`. A API não aplica migrations
automaticamente ao iniciar; execute `db:migrate` antes de usar o banco.

O schema cria `projects`, `tasks`, `subtasks`, `notes` e `task_history`.
Os IDs são TEXT (UUID ou strings existentes), fornecidos pela aplicação.
Datas de tarefa são TEXT em `YYYY-MM-DD`; horário opcional é TEXT em `HH:mm`.
Timestamps são TEXT em ISO 8601 UTC. `created_at` e `updated_at` recebem
por padrão `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`; a aplicação deverá manter
`updated_at` nas alterações. Os timestamps opcionais ficam NULL até serem usados.
A validação dos formatos, das datas e das regras de status/progresso permanece
na futura camada de Service, sem triggers ou histórico automático nesta Issue.

Campos obrigatórios possuem NOT NULL. CHECKs restringem prioridade, status e
ações do histórico, progresso inteiro entre 0 e 100, booleanos a 0/1 e nomes,
títulos e conteúdo de notas não vazios. `favorite` permanece opcional conforme o modelo, com default
false. `status`, `done` e `progress` iniciam em PENDING, false e 0.
Metadata é JSON serializado em TEXT pelo Drizzle.

Todas as FKs usam `ON DELETE RESTRICT` e `ON UPDATE NO ACTION`: exclusões
físicas de registros com dependentes falham. Isso preserva dados para a futura
exclusão lógica/desfazer; reatribuição de projetos e eventual limpeza exigirão
tratamento explícito em outra Issue. Não há cascades destrutivos.

Os testes abrem um SQLite `:memory:` exclusivo por caso, aplicam as migrations
versionadas e fecham a conexão ao terminar. Não usam o arquivo de desenvolvimento.
Para validar o comando em banco vazio sem alterar esse arquivo:

```bash
DATABASE_PATH=:memory: npm run db:migrate
```

Para recuperação de um banco local existente, preserve uma cópia do arquivo
com as conexões fechadas antes de aplicar futuras migrations. Não há comando
de rollback automático; um banco vazio pode ser reconstruído com `db:migrate`.


## API de projetos

As respostas usam propriedades camelCase (`createdAt`, `updatedAt`, `deletedAt`).
Projetos novos recebem UUID gerado por `crypto.randomUUID()` e timestamps ISO 8601
UTC no Service. IDs string existentes também são aceitos nas consultas.

| Método | Endpoint | Sucesso | Comportamento |
|---|---|---|---|
| POST | `/projects` | 201 | Cria e retorna o projeto |
| GET | `/projects` | 200 | Retorna um array de projetos ativos |
| GET | `/projects/:id` | 200 | Retorna o projeto ativo |
| PATCH | `/projects/:id` | 200 | Atualiza campos enviados e retorna o projeto |
| DELETE | `/projects/:id` | 204 | Exclui logicamente, sem corpo de resposta |

Criar projeto:

```bash
curl -i http://localhost:3000/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"Faculdade","description":"Atividades acadêmicas","color":"#8B5CF6","icon":"🎓"}'
```

Exemplo de resposta (201):

```json
{
  "id": "0e059f31-cc73-451f-8c43-dc7c253f50c3",
  "name": "Faculdade",
  "description": "Atividades acadêmicas",
  "color": "#8B5CF6",
  "icon": "🎓",
  "createdAt": "2026-10-02T12:00:00.000Z",
  "updatedAt": "2026-10-02T12:00:00.000Z",
  "deletedAt": null
}
```

Listar e consultar (200; listagem retorna um array, consulta retorna um objeto):

```bash
curl http://localhost:3000/projects
curl http://localhost:3000/projects/0e059f31-cc73-451f-8c43-dc7c253f50c3
```

Editar (200, com o objeto atualizado):

```bash
curl -X PATCH http://localhost:3000/projects/0e059f31-cc73-451f-8c43-dc7c253f50c3 \
  -H 'Content-Type: application/json' -d '{"name":"Estudos","description":null}'
```

Excluir (204 sem corpo, quando não houver dependências):

```bash
curl -i -X DELETE http://localhost:3000/projects/0e059f31-cc73-451f-8c43-dc7c253f50c3
```

Zod exige `name`, `color` e `icon` como strings não vazias na criação; espaços
nas extremidades desses campos são removidos. `description` é opcional, aceita
string ou null (null limpa a descrição). PATCH aceita somente esses quatro campos,
exige ao menos um deles e atualiza `updatedAt`. Campos desconhecidos são rejeitados,
inclusive tentativas de alterar IDs ou timestamps. IDs devem ser strings não vazias.
Não há validação de formato hexadecimal de cor: o modelo permite strings compatíveis
com o mobile, sem definir um formato exclusivo.

DELETE verifica todas as tarefas vinculadas, inclusive as excluídas logicamente.
Se houver alguma, retorna 409 `PROJECT_HAS_TASKS`, sem reassociar ou alterar tarefas.
A verificação e a exclusão acontecem na mesma transação SQLite IMMEDIATE para impedir
que outra conexão grave uma dependência entre as duas operações.
Sem dependências, define `deletedAt` e `updatedAt` com o mesmo timestamp e preserva
a linha física. Listagem omite projetos excluídos; consulta, PATCH e DELETE retornam
404 para eles. Não há endpoint de restauração nesta Issue.

Erros possuem o formato:

```json
{"error":{"code":"PROJECT_NOT_FOUND","message":"Projeto não encontrado."}}
```

- 400 `VALIDATION_ERROR`: payload/ID inválido, PATCH vazio ou JSON malformado.
- 404 `PROJECT_NOT_FOUND`: projeto inexistente ou excluído.
- 409 `PROJECT_HAS_TASKS`: exclusão bloqueada por tarefas vinculadas.
- 500 `INTERNAL_ERROR`: falha inesperada, sem expor detalhes internos.

Os testes de API usam Supertest com SQLite `:memory:` novo e migrations aplicadas
antes de cada caso. A exclusão e os conflitos são conferidos também no banco.


## Criar tarefas — POST /tasks

`POST /tasks` cria e retorna a tarefa persistida (HTTP 201). DELETE
de tarefas permanece para sua Issue específica. Exemplo de request:

```json
{
  "title": "Finalizar documentação",
  "description": "Entrega da Sprint 1",
  "projectId": "ID_DO_PROJETO_ATIVO",
  "startDate": "2026-10-02",
  "dueDate": "2026-10-04",
  "time": "18:00",
  "priority": "HIGH",
  "status": "PENDING"
}
```

Use datas atuais/futuras ao executar o exemplo. `description` e `time` são
opcionais; `status` omitido recebe PENDING. Prioridades: LOW, MEDIUM, HIGH.
Status: PENDING, PARTIAL, COMPLETED. Horário, quando informado, usa HH:mm.
Zod rejeita título/ID vazio, enums inválidos e campos desconhecidos.
O Service verifica datas reais YYYY-MM-DD, início >= hoje e prazo >= início;
o dia atual usa `TASK_TIMEZONE` (padrão America/Sao_Paulo), sem truncar a data UTC.
Projetos inexistentes ou logicamente excluídos retornam 404 PROJECT_NOT_FOUND.
Validação do projeto e inserção usam uma transação IMMEDIATE.

Exemplo de resposta (201):

```json
{
  "id": "46d5a6a2-62a7-4b36-b558-98d72a3b3c0b",
  "title": "Finalizar documentação",
  "description": "Entrega da Sprint 1",
  "projectId": "ID_DO_PROJETO_ATIVO",
  "startDate": "2026-10-02",
  "dueDate": "2026-10-04",
  "time": "18:00",
  "priority": "HIGH",
  "status": "PENDING",
  "done": false,
  "progress": 0,
  "favorite": false,
  "createdAt": "2026-10-02T12:00:00.000Z",
  "updatedAt": "2026-10-02T12:00:00.000Z",
  "deletedAt": null,
  "undoUntil": null
}
```

IDs usam crypto.randomUUID(). Status PENDING/PARTIAL inicia com done=false e
progress=0. Se COMPLETED for solicitado, done=true e progress=100 mantêm a
coerência do modelo para tarefas sem subtarefas. POST grava CREATED atomicamente,
sem fabricar eventos para tarefas antigas.
Erros seguem o formato existente: 400 VALIDATION_ERROR (payload/data/regra inválida),
404 PROJECT_NOT_FOUND (projeto inválido) e 500 INTERNAL_ERROR (falha inesperada).

Integração Android: ver [configuração mobile](../docs/arquitetura/integracao-criacao-tarefas.md).


## Consultar tarefas — GET /tasks e GET /tasks/:id

Consulta segue Route → Controller → Service → Repository → Drizzle → SQLite.
Não há filtros gerais nem paginação nesta etapa.

```bash
curl http://localhost:3000/tasks
curl http://localhost:3000/tasks/ID_DA_TAREFA
```

`GET /tasks` retorna HTTP 200 e array de tarefas com `deletedAt = null`.
Banco vazio retorna `[]`. A ordem estável por criação/ID é interna à consulta;
não implementa controles de ordenação do MVP (Issue #21).
`GET /tasks/:id` retorna HTTP 200 e um objeto com os mesmos campos persistidos
retornados pelo POST, acrescidos de `project` (projeto relacionado) e `subtasks`
(subtarefas já existentes no SQLite). IDs string existentes são aceitos.

Exemplo de resposta de detalhe (200; a lista contém objetos deste formato):

```json
{
  "id": "task-001",
  "title": "Finalizar documentação",
  "description": null,
  "projectId": "project-001",
  "startDate": "2026-10-03",
  "dueDate": "2026-10-04",
  "time": "18:00",
  "priority": "HIGH",
  "status": "PENDING",
  "done": false,
  "progress": 0,
  "favorite": false,
  "createdAt": "2026-10-03T12:00:00.000Z",
  "updatedAt": "2026-10-03T12:00:00.000Z",
  "deletedAt": null,
  "undoUntil": null,
  "project": {
    "id": "project-001",
    "name": "Faculdade",
    "description": null,
    "color": "#8B5CF6",
    "icon": "🎓",
    "createdAt": "2026-10-03T12:00:00.000Z",
    "updatedAt": "2026-10-03T12:00:00.000Z",
    "deletedAt": null
  },
  "subtasks": []
}
```

`projectId` continua sendo o vínculo principal; `project` é informação derivada
do relacionamento, sem cópia do nome na tabela de tarefas. O projeto pode ser
exibido mesmo se tiver exclusão lógica em dados antigos; o join não oculta a tarefa.
O adapter apresenta “Projeto indisponível” se essa informação não estiver disponível.
O CRUD atual de projetos impede exclusão de projetos com tarefas vinculadas.

Subtarefas consultadas possuem id, taskId, title, done, createdAt e updatedAt.
Não há CRUD remoto de subtarefas (#8). `progress`, `done` e `status` são lidos como
persistidos, sem recálculo ou alteração durante GET; a regra definitiva fica em #8.

Tarefa inexistente ou logicamente excluída retorna HTTP 404:

```json
{"error":{"code":"TASK_NOT_FOUND","message":"Tarefa não encontrada."}}
```

Falha inesperada retorna HTTP 500 no padrão existente:

```json
{"error":{"code":"INTERNAL_ERROR","message":"Erro interno do servidor."}}
```

A migração continua explícita: `npm run db:migrate` antes de `npm run dev`.
Veja o [contrato de consulta/cache no mobile](../docs/arquitetura/integracao-consulta-tarefas.md).

## Editar tarefas — PATCH /tasks/:id

Atualização segue Route → Controller → Service → Repository → Drizzle → SQLite.
O payload é parcial: aceita `title`, `description`, `projectId`, `startDate`,
`dueDate`, `time`, `priority` e `status`. Campos omitidos permanecem inalterados.
`description: null` e `time: null` limpam os valores opcionais. Título e projectId
não podem ser vazios; prioridade/status e HH:mm seguem os enums/formatos de POST.
Campos desconhecidos, payload vazio e tentativas de alterar IDs/timestamps são rejeitados.

```bash
curl -i -X PATCH http://localhost:3000/tasks/ID_DA_TAREFA \
  -H 'Content-Type: application/json' \
  -d '{"title":"Documentação revisada","priority":"HIGH","projectId":"ID_DO_PROJETO_ATIVO"}'
```

Resposta HTTP 200: objeto completo no formato de GET /tasks/:id, com os campos
atualizados, projeto relacionado e subtarefas persistidas. Exemplo abreviado:

```json
{
  "id": "task-001",
  "title": "Documentação revisada",
  "projectId": "project-002",
  "priority": "HIGH",
  "createdAt": "2026-10-03T12:00:00.000Z",
  "updatedAt": "2026-10-03T13:00:00.000Z"
}
```

`projectId` é a identidade do vínculo e deve apontar para projeto existente e ativo.
O nome retornado em `project` é derivado do relacionamento. Cada edição confirmada
atualiza `updatedAt` em ISO UTC (inclusive edições rápidas); `createdAt` não muda.

Datas devem ser dias reais YYYY-MM-DD. O Service combina os campos enviados com
os atuais e sempre exige `dueDate >= startDate`. Início antigo no passado pode
ser preservado, inclusive quando reenviado sem mudar o dia. Se o dia de início
for alterado, deve ser hoje ou futuro em `TASK_TIMEZONE` (America/Sao_Paulo por padrão).

- HTTP 400: `{"error":{"code":"VALIDATION_ERROR","message":"O prazo não pode ser anterior à data de início."}}`
  (a mensagem varia conforme a validação).
- HTTP 404, tarefa ausente/excluída: `{"error":{"code":"TASK_NOT_FOUND","message":"Tarefa não encontrada."}}`.
- HTTP 404, projeto ausente/excluído: `{"error":{"code":"PROJECT_NOT_FOUND","message":"Projeto não encontrado."}}`.
- HTTP 500: padrão `INTERNAL_ERROR` existente, sem detalhes internos.

A edição e seus eventos são gravados na mesma transação IMMEDIATE. UPDATED usa
metadata.fields para os campos comuns efetivamente alterados; status possui evento
semântico próprio, conforme abaixo. Subtarefas não são editadas neste PATCH (#8).

Veja a [integração de edição/cache](../docs/arquitetura/integracao-edicao-tarefas.md).

## Status e histórico — Issue #7

PENDING/PARTIAL implicam done=false; COMPLETED implica done=true e progress=100.
O Service reaplica essa coerência em todo PATCH. Regra temporária até #8:
ao reabrir, progresso 100 é reduzido a 0; valores intermediários permanecem.
Não calcula proporções nem altera subtarefas. Status igual ao atual não gera
transição; payload sem mudanças relevantes não fabrica UPDATED.

| Operação | Evento | Metadata |
|---|---|---|
| POST confirmado | CREATED | `{}` |
| Campos comuns alterados | UPDATED | `{"fields":["title"]}` |
| PENDING ↔ PARTIAL | STATUS_CHANGED | `{"from":"PENDING","to":"PARTIAL"}` |
| PENDING/PARTIAL → COMPLETED | COMPLETED | from/to |
| COMPLETED → PENDING/PARTIAL | REOPENED | from/to |

PATCH misto pode produzir um UPDATED (sem status em fields) e um evento semântico
de transição. Não duplica STATUS_CHANGED com COMPLETED/REOPENED. Falha na gravação
obrigatória de histórico desfaz a tarefa e os demais eventos da transação.
Não há backfill de CREATED/UPDATED. PROJECT_CHANGED não é emitido: troca de projeto
continua registrada em UPDATED; DELETED/RESTORED ficam em #10.

```bash
curl -X PATCH http://localhost:3000/tasks/ID_DA_TAREFA \
  -H 'Content-Type: application/json' -d '{"status":"COMPLETED"}'
curl http://localhost:3000/tasks/ID_DA_TAREFA/history
```

GET /tasks/:id/history retorna HTTP 200 e eventos em ordem crescente de createdAt,
desempatados por ID. Eventos do mesmo PATCH podem compartilhar timestamp; o
desempate não significa precedência semântica entre eles. Sem eventos: `[]`.
Tarefa ausente ou soft-deleted: HTTP 404 TASK_NOT_FOUND, no padrão existente.
Exemplo de resposta:

```json
[
  {
    "id": "history-001",
    "taskId": "task-001",
    "action": "COMPLETED",
    "metadata": {"from":"PARTIAL","to":"COMPLETED"},
    "createdAt": "2026-10-04T12:30:00.000Z"
  }
]
```

Metadata é JSON com dados do evento, sem textos de interface ou dados fictícios.
Veja [integração de status/histórico](../docs/arquitetura/integracao-status-historico.md).

# Mini API — Gestor Diário

Mini API da Sprint 1, com base técnica (Issue #1), schema SQLite (Issue #2)
e CRUD de projetos (Issue #3), conforme as ADRs 001 e 002.

## Desenvolvimento local

Use Node.js 24 LTS e npm. A API tem dependências e lockfile próprios.

A partir da raiz do repositório:

```bash
cd backend
npm install
npm run db:migrate
npm run dev
```

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
Não há integração mobile ou sincronização.

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

# Mini API — Gestor Diário

Mini API da Sprint 1, com base técnica (Issue #1) e schema SQLite (Issue #2), conforme as ADRs 001 e 002.

## Desenvolvimento local

Use Node.js 24 LTS e npm. A API tem dependências e lockfile próprios.

A partir da raiz do repositório:

```bash
cd backend
npm install
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

`app.ts` configura Express, CORS, JSON e rotas sem abrir uma porta.
`server.ts` carrega a configuração de ambiente e inicia o servidor.
O health check usa uma rota e um controller, sem regra de negócio adicional.
O teste HTTP utiliza Vitest e Supertest.

`database/` contém a conexão, o schema e o executor de migrations.
Os diretórios `services`, `repositories`, `schemas`, `middlewares` e `errors`
estão reservados para evolução nas próximas Issues.
Ainda não há CRUD nem integração mobile.

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

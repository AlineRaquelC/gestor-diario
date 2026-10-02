# Mini API — Gestor Diário

Fundação da mini API da Sprint 1 (Issue #1), conforme a ADR-002.

## Desenvolvimento local

Use Node.js 24 LTS e npm. A API tem dependências e lockfile próprios.

A partir da raiz do repositório:

```bash
cd backend
npm install
npm run dev
```

O servidor usa `PORT=3000` por padrão. Opcionalmente, copie `.env.example`
para `.env` e ajuste `PORT` e `NODE_ENV`; `.env` não é versionado.
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

Os diretórios `database`, `services`, `repositories`, `schemas`, `middlewares`
e `errors` são reservados com `.gitkeep` para evolução nas próximas Issues.
Esta fundação não contém banco, schema, migrations, CRUD nem integração mobile.

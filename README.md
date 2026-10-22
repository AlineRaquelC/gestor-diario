# Gestor Diário

Aplicativo acadêmico Android para organizar e acompanhar tarefas, desenvolvido em React Native e integrado progressivamente a uma API Node.js com persistência SQLite.

## Status atual — 2026-10-21

**Sprint 1 — fechamento técnico concluído: 15/15 Issues concluídas — 100%.**

A Sprint havia sido apresentada/entregue anteriormente; os gargalos técnicos
remanescentes foram concluídos posteriormente, em 21/10/2026. Não existem Issues
abertas no milestone Sprint 1. Rastreabilidade completa no [fechamento](docs/sprints/sprint-1.md).
A conclusão da Sprint não implica aceite integral de todos os PBIs da Entrega 1.

## Funcionalidades atuais

- API Node.js, SQLite, Drizzle ORM e migrations; CRUD de projetos na API.
- Criação, consulta/listagem, detalhes e edição de tarefas integradas.
- Status, conclusão/reabertura e histórico persistido.
- Exclusão com confirmação, soft delete, desfazer em 5s e restore (#10 / PR #31).
- Filtros combináveis e ordenação por prioridade/prazo (#21 / PR #32).
- CI inicial integrado (#13 / PR #34).
- Subtarefas com progresso automático e múltiplas observações independentes da descrição.
- Dashboard com indicadores reais e calendário Dia/Semana/Mês alimentados pelo TaskContext.
- Persistência de dados novos Mobile → API → SQLite; AsyncStorage como cache/apoio local.
- Tratamento de falhas/offline nos fluxos implementados e testes manuais Android registrados.
- Sincronização manual em Configurações → Sincronizar, com projetos antes de tarefas,
  preservação do legado, identidades persistentes e pendências explícitas.

O comportamento offline é parcial: falhas preservam dados e não confirmam envio.
A API é canônica para registros identificados; AsyncStorage conserva cache,
vínculos e snapshots de versões locais. Registros antigos sem projeto identificável
ou dados válidos permanecem locais e pendentes, sem associação por nome. Consulte
[a política e as evidências de sincronização](docs/arquitetura/sincronizacao-manual.md).

## Tecnologias

React Native + TypeScript, Node.js + TypeScript, Express, Zod, Drizzle ORM, SQLite, AsyncStorage, Services HTTP, Contexts, testes backend (Vitest/Supertest) e mobile (Jest), Git/GitHub.

## Arquitetura atual

```text
React Native
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

## Validação e dívidas técnicas

- Backend: migrations, typecheck e build aprovados; **278 testes em 11 suítes**.
- Mobile: **322 testes em 20 suítes** no fluxo atual do CI.
- Issue #13 concluída, PR #34 integrado. GitHub Actions executa em PR/push de
  `dev`/`main`: **Mobile ✅ / Backend ✅** na
  [execução real do PR #34](https://github.com/AlineRaquelC/gestor-diario/actions/runs/39618412835).
- O CI bloqueia regressões novas em relação às dívidas explicitamente baselineadas:
  11 diagnósticos TypeScript (9 identidades), 3 erros e 10 warnings ESLint históricos.
  Backend permanece estrito. CI verde não significa ausência de erros no projeto.
- A dívida específica de `App.test.tsx`/Jest (imports ESM não transformados,
  AsyncStorage/React Navigation) permanece; o teste tem exclusão explícita no CI.
- Alertas conhecidos de dependências permanecem, incluindo a cadeia Drizzle Kit.
- Offline parcial; três Tasks legadas sem `projectId` preservadas localmente,
  com pendências informadas pela UI. Filhos legados não são migrados automaticamente.
- Sem sincronização automática, autenticação real ou recursos da Entrega 2.

Esses limites não são Issues abertas dentre as 15 da Sprint 1. As evidências de
execução são as já registradas nos PRs/documentos; esta atualização é documental,
sem reexecutar testes funcionais ou declarar dívidas corrigidas.

Evidências e operação: [RF20](docs/arquitetura/sincronizacao-manual.md) e
[CI inicial](docs/arquitetura/ci-inicial.md).

## Como executar

Consulte a [execução do backend](backend/README.md) e a [integração Android](docs/arquitetura/integracao-criacao-tarefas.md) para executar localmente.

Para reproduzir os checks mobile:

```bash
npm ci
npm run test:ci-scripts
npm run lint:ci
npm run typecheck:ci
npm run test:ci
```

Triggers, jobs, banco temporário e limites estão no [README do workflow](.github/workflows/README.md).

## Metodologia e branches

Scrum, backlog, Sprints e Pull Requests. `dev` integra o desenvolvimento; `main` recebe promoção por PR após revisão. `feature/*`, `fix/*` e `docs/*` isolam os trabalhos. O workflow CI valida Mobile e Backend separadamente; não publica nem gera APK. O fechamento documental usa PR para `dev`, sem merge automático ou promoção para `main`.

## Estrutura

```text
src/                 telas, navegação, componentes, Contexts e Services HTTP
backend/             API, services, repositories, schema e migrations
__tests__/           testes mobile
android/ e ios/      projetos nativos
docs/                requisitos, backlog, arquitetura, sprints e decisões
```

## Histórico anterior ao fechamento

Em 21/10/2026, antes do merge de #34, o topo registrava 14/15 = 93,3%,
com #13 aguardando revisão/merge. Esse retrato foi superado pelo fechamento técnico.

## Status histórico em 2026-10-03

O planejamento inicial registrava 4/13 = 30,8%. Após a auditoria/refinamento que formalizou calendário (#20) e filtros (#21), passou a 4/15 = 26,7%; #5 era a próxima Issue. A redução percentual refletia aumento do backlog rastreado, sem perda de trabalho. Esses valores são históricos; não representam o estado atual.

## Documentação

- [Requisitos oficiais](docs/requisitos/requisitos-oficiais.md)
- [Backlog do produto](docs/backlog/backlog-produto.md)
- [Plano de entregas](docs/backlog/entregas.md)
- [Sprint 1 e estado atual](docs/sprints/sprint-1.md)
- [Issues e PRs da Sprint 1](docs/sprints/sprint-1-issues.md)
- [Arquitetura inicial (histórico)](docs/arquitetura/arquitetura-inicial.md)
- [Decisões](docs/decisoes/README.md)
- [Processo de desenvolvimento](docs/processo/processo-desenvolvimento.md)
- [Auditoria inicial](docs/auditoria-inicial.md)
- [Contribuição](CONTRIBUTING.md)

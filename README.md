# Gestor Diário

Aplicativo acadêmico Android para organizar e acompanhar tarefas, desenvolvido em React Native e integrado progressivamente a uma API Node.js com persistência SQLite.

## Status atual — 2026-10-21

**Sprint 1 em andamento: 14/15 Issues concluídas — 93,3%.** #12 integrada pelo
PR #33. #13 (CI inicial) está implementada nesta branch e aguarda revisão
do PR e merge; permanece aberta. Não há merge automático.

## Funcionalidades atuais

- API Node.js, SQLite, Drizzle ORM e migrations; CRUD de projetos na API.
- Criação, consulta/listagem, detalhes e edição de tarefas integradas.
- Status, conclusão/reabertura e histórico persistido.
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

- Backend: migrations, typecheck, build e 278 testes aprovados.
- Mobile: 322 testes focados aprovados em 20 suítes; lint alterado sem erros,
  com seis avisos inline preexistentes. `git diff --check` aprovado.
- TypeScript: 14 diagnósticos na base e 11 após a alteração, sem diagnóstico novo.
- Evidências Android e limites constam no [registro do RF20](docs/arquitetura/sincronizacao-manual.md).
- Jest global legado (Vitest do backend/ESM de React Navigation), demais dívidas
  globais de lint/TypeScript e alertas conhecidos do Drizzle Kit permanecem fora
  deste escopo. CI inicial da #13 está descrito no [registro de CI](docs/arquitetura/ci-inicial.md).
- CI mobile valida a dívida auditada: 11 diagnósticos TypeScript e 3 erros/10
  warnings globais de ESLint. Novas identidades/ocorrências falham; verde não
  significa ausência de dívida. Backend permanece estrito.

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

Scrum, backlog, Sprints e Pull Requests. `dev` integra o desenvolvimento; `main` recebe promoção por PR após revisão. `feature/*`, `fix/*` e `docs/*` isolam os trabalhos. O workflow CI valida Mobile e Backend separadamente; não publica nem gera APK. Esta implementação abre PR para `dev`, sem merge automático ou promoção para `main`.

## Estrutura

```text
src/                 telas, navegação, componentes, Contexts e Services HTTP
backend/             API, services, repositories, schema e migrations
__tests__/           testes mobile
android/ e ios/      projetos nativos
docs/                requisitos, backlog, arquitetura, sprints e decisões
```

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

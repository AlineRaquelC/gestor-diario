# Gestor Diário

Aplicativo acadêmico Android para organizar e acompanhar tarefas, desenvolvido em React Native e integrado progressivamente a uma API Node.js com persistência SQLite.

## Status atual — 08/11/2026

- **Sprint 1:** 15/15 Issues concluídas, 100% ([fechamento](docs/sprints/sprint-1.md)).
- **Sprint 2 core:** #39–#42 concluídas, integradas em `dev` e promovidas para
  `main` pelo [PR #55](https://github.com/AlineRaquelC/gestor-diario/pull/55) —
  **4/4 Issues, 37/37 pontos, 100%** ([fechamento e evidências](docs/sprints/sprint-2.md)).
- **Stretch #43:** gate técnico NO-GO, não implementada e OPEN. Seus 13 pontos
  ficam fora do core entregue; adiada por segurança/integridade.

A Sprint 2 concluiu o core selecionado da Entrega 2, não a Entrega 2 inteira.
O core concluído foi promovido de `dev` para `main` pelo PR #55 em 08/11/2026,
após revisão e CI verde. `main` contém o estado estável da Sprint 2; `dev` permanece
como branch de integração.

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

Recortes da Sprint 2:

- Lembretes configuráveis e notificações locais Android, conforme a
  [política implementada](docs/sprints/sprint-2-issue-39.md).
- Recorrência diária/semanal/mensal com ocorrências materializadas pelo backend,
  janela até hoje + 31 dias inclusive, sem backfill (#40 / PR #48).
- Busca por título, descrição e observações persistidas, favoritos e filtros salvos
  (#41 / PR #50); etiquetas e drag and drop permanecem fora.
- Metas diária/semanal/mensal por quantidade concluída e relatórios com texto e
  barras simples (#42 / PR #52); sem tempo total de execução.

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

- Referência final da Sprint 2: **697 testes mobile / 37 suítes**, **456 backend /
  17 suítes** e **16 validadores CI aprovados**; backend typecheck/build aprovados.
- Android assembleDebug/assembleRelease aprovados no fechamento da #42, com
  Hermes, New Architecture e Codegen; validação manual Android registrada.
- [CI pós-merge de main — execução 42488972344](https://github.com/AlineRaquelC/gestor-diario/actions/runs/42488972344):
  **completed / success — Mobile ✅ / Backend ✅**, no merge do PR #55,
  commit `403ef114e1c7f21229a85f1522c6d6e58662ebe4`.
  GitHub Actions valida PR/push de `dev`/`main`.
- Lint/TypeScript sem regressão nem ampliação de baselines: 3 erros/7 warnings
  conhecidos no lint (10 diagnósticos / baseline 13); TS 11 / baseline 11.
  Backend permanece estrito. CI verde não significa ausência de dívida técnica.
- A dívida específica de `App.test.tsx`/Jest (imports ESM não transformados,
  AsyncStorage/React Navigation) permanece; o teste tem exclusão explícita no CI.
- Alertas conhecidos de dependências permanecem, incluindo a cadeia Drizzle Kit.
- Offline parcial; três Tasks legadas sem `projectId` preservadas localmente,
  com pendências informadas pela UI. Filhos legados não são migrados automaticamente.
- Sincronização automática e autenticação real permanecem fora. Login é visual,
  sem JWT, conta online ou biometria. Recortes da Entrega 2 foram implementados,
  mas a entrega completa continua parcial; perfis locais não foram implementados.

Essas dívidas não representam Issues reabertas do core concluído. As evidências de
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

Scrum, backlog, Sprints e Pull Requests. `dev` integra o desenvolvimento; `main` mantém o estado estável. `feature/*`, `fix/*` e `docs/*` isolam os trabalhos. O workflow CI valida Mobile e Backend separadamente; não publica nem gera APK. Documentação segue o mesmo fluxo de PR; promoções de `dev` para `main` são realizadas por PR após revisão e CI.

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
- [Sprint 1 — fechamento histórico](docs/sprints/sprint-1.md)
- [Sprint 2 — core concluído e stretch adiada](docs/sprints/sprint-2.md)
- [Issues e PRs da Sprint 1](docs/sprints/sprint-1-issues.md)
- [Arquitetura inicial (histórico)](docs/arquitetura/arquitetura-inicial.md)
- [Decisões](docs/decisoes/README.md)
- [Processo de desenvolvimento](docs/processo/processo-desenvolvimento.md)
- [Auditoria inicial](docs/auditoria-inicial.md)
- [Contribuição](CONTRIBUTING.md)

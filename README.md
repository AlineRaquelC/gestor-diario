# Gestor Diário

Aplicativo acadêmico Android para organizar e acompanhar tarefas, desenvolvido em React Native e integrado progressivamente a uma API Node.js com persistência SQLite.

## Status atual — 2026-10-04

**Sprint 1 em andamento: 11/15 Issues concluídas — 73,3%.** Estado conferido diretamente no GitHub; Entrega 1 permanece em andamento.

Concluídas: #1, #2, #3, #4, #5, #6, #7, #8, #9, #11 e #20. Pendentes: #10 (exclusão lógica + desfazer), #12 (sincronização manual geral e reconciliação de dados legados), #13 (CI inicial) e #21 (filtros e ordenação completos).

#11 e #20 foram priorizadas antes de #10 para a demonstração de 05/10/2026, sem mudança de escopo. Não há sincronização geral pronta.

## Funcionalidades atuais

- API Node.js, SQLite, Drizzle ORM e migrations; CRUD de projetos na API.
- Criação, consulta/listagem, detalhes e edição de tarefas integradas.
- Status, conclusão/reabertura e histórico persistido.
- Subtarefas com progresso automático e múltiplas observações independentes da descrição.
- Dashboard com indicadores reais e calendário Dia/Semana/Mês alimentados pelo TaskContext.
- Persistência de dados novos Mobile → API → SQLite; AsyncStorage como cache/apoio local.
- Tratamento de falhas/offline nos fluxos implementados e testes manuais Android registrados.

O comportamento offline é parcial. Tarefas antigas da fase Front-only podem existir apenas no AsyncStorage: podem ser exibidas, mas mutações remotas podem falhar sem registro correspondente na API/SQLite. Reconciliação e gerenciamento geral de projetos no mobile pertencem à #12.

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

- Backend: 258 testes em 9 arquivos, typecheck e build aprovados no [registro de observações](docs/arquitetura/integracao-observacoes.md).
- Mobile: 216 testes focados em 14 suítes aprovados. Lint dos quatro arquivos de código/testes do calendário: zero erros e zero avisos; `git diff --check` aprovado. [Evidências do calendário](docs/arquitetura/calendario-mvp.md).
- Android: fluxos integrados validados, incluindo calendário, navegação para detalhes, mudança de data sem reload, vazio e persistência após reabertura.
- Permanecem 14 erros globais TypeScript preexistentes, sem novo diagnóstico no calendário; falhas do Jest global legado (Vitest do backend/ESM de React Navigation); quatro alertas moderados conhecidos do Drizzle Kit e dívidas/avisos de lint em outras telas registrados nos documentos de integração. Lint focado limpo não representa lint global limpo.

Resultados registrados nas integrações e revisão do PR #29; não reexecutados nesta atualização exclusivamente documental. CI inicial continua pendente (#13).

## Como executar

Consulte a [execução do backend](backend/README.md) e a [integração Android](docs/arquitetura/integracao-criacao-tarefas.md) para executar localmente.

## Metodologia e branches

Scrum, backlog, Sprints e Pull Requests. `dev` integra o desenvolvimento; `main` recebe promoção por PR após revisão. `feature/*`, `fix/*` e `docs/*` isolam os trabalhos. CI/CD permanece planejado. Esta preparação documental abre PR para `dev`, sem merge automático ou promoção para `main`.

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

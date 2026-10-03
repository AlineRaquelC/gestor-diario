# Gestor Diário

Aplicativo mobile para criação, organização, acompanhamento e gerenciamento de tarefas, desenvolvido em React Native e integrado progressivamente a uma mini API Node.js.

## Sobre o projeto
Projeto acadêmico de gerenciamento de tarefas para Android. Atualmente o código contém telas de tarefas e projetos e persistência local; a API Node.js já integra a criação de tarefas ao SQLite.

## Objetivo
Organizar tarefas e acompanhar o desenvolvimento do projeto com documentação, versionamento e entregas revisadas.

## Tecnologias
- React Native
- TypeScript
- Node.js
- Android
- AsyncStorage
- Git
- GitHub

## Arquitetura
Criação de tarefas: React Native → Context → Services HTTP → API REST Node.js → Drizzle → SQLite.
AsyncStorage permanece como cache local; consulta remota de tarefas e sincronização geral ainda estão pendentes.

## Metodologia
Scrum, Sprints, backlog, Git, GitHub, Pull Requests e CI/CD planejado.

## Branches
- main: versão estável/demonstrável.
- dev: integração do desenvolvimento.
- feature/*: funcionalidades.
- fix/*: correções.
- docs/*: documentação.

## Estrutura
```text
.
├── App.tsx / index.js / app.json
├── src/
│   ├── screens/
│   ├── navigation/
│   ├── components/
│   └── context/
├── android/
├── ios/
├── __tests__/
├── docs/
│   ├── prompts/
│   ├── requisitos/
│   ├── backlog/
│   ├── arquitetura/
│   ├── sprints/
│   └── decisoes/
├── .github/
│   ├── workflows/
│   └── pull_request_template.md
├── CONTRIBUTING.md
└── package.json / package-lock.json
```

## Como executar
O fluxo de criação e persistência foi validado manualmente no Android Emulator. Consulte a [execução do backend](backend/README.md) e a [integração Android](docs/arquitetura/integracao-criacao-tarefas.md) para executar localmente.

Comando de inspeção validado na raiz, com dependências já instaladas:
```sh
npm ls --depth=0
```

Testes, TypeScript e lint foram executados e falharam; consultar a auditoria antes de considerar o projeto estável.

## Status do projeto

Sprint 1 em andamento — 30,8% (4/13 Issues concluídas).

Concluído:

- base da API Node.js;
- SQLite + Drizzle + migrations;
- CRUD de projetos;
- criação de tarefas integrada Android → API → SQLite.

Próximo:

- consulta e visualização de tarefas (Issue #5).

## Documentação
- [Requisitos oficiais](docs/requisitos/requisitos-oficiais.md)
- [Backlog do produto](docs/backlog/backlog-produto.md)
- [Arquitetura inicial](docs/arquitetura/arquitetura-inicial.md)
- [Sprint 1](docs/sprints/sprint-1.md)
- [Decisões](docs/decisoes/README.md)
- [Processo de desenvolvimento](docs/processo/processo-desenvolvimento.md)
- [Auditoria inicial](docs/auditoria-inicial.md)
- [Contribuição](CONTRIBUTING.md)

# Gestor Diário

Aplicativo mobile para criação, organização, acompanhamento e gerenciamento de tarefas, desenvolvido em React Native e integrado progressivamente a uma mini API Node.js.

## Sobre o projeto
Projeto acadêmico de gerenciamento de tarefas para Android. Atualmente o código contém telas de tarefas e projetos e persistência local; a API é planejada.

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
Planejada: Mobile → API REST → Backend Node.js → Banco.
Atualmente: React Native → Context → AsyncStorage. Banco de dados será definido na etapa de arquitetura da mini API.

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
Ainda não há comando de execução do aplicativo validado em dispositivo nesta auditoria. Não foi gerado APK. O funcionamento não está confirmado.

Comando de inspeção validado na raiz, com dependências já instaladas:
```sh
npm ls --depth=0
```

Testes, TypeScript e lint foram executados e falharam; consultar a auditoria antes de considerar o projeto estável.

## Status
Sprint 1 — Em desenvolvimento.

## Documentação
- [Requisitos oficiais](docs/requisitos/requisitos-oficiais.md)
- [Backlog do produto](docs/backlog/backlog-produto.md)
- [Arquitetura inicial](docs/arquitetura/arquitetura-inicial.md)
- [Sprint 1](docs/sprints/sprint-1.md)
- [Decisões](docs/decisoes/README.md)
- [Processo de desenvolvimento](docs/processo-desenvolvimento.md)
- [Auditoria inicial](docs/auditoria-inicial.md)
- [Contribuição](CONTRIBUTING.md)

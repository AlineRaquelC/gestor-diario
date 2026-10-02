# Processo de desenvolvimento

Utilizar Scrum, backlog priorizado, Sprints e documentação versionada.

```text
Requisito → User Story → Issue → Branch → Commit → Pull Request
→ Review → dev → Testes / CI → Pull Request → main
```

## Branches
- `main`: versão estável/demonstrável.
- `dev`: integração do desenvolvimento.
- `feature/*`: funcionalidades.
- `fix/*`: correções.
- `docs/*`: documentação.

Preferir Pull Requests para integração em dev e exigir revisão para main. Planejar Issues, Labels, Milestones e Projects com rastreabilidade ao requisito e Sprint, após confirmação do backlog.

## Conventional Commits
Tipos: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`.

Exemplos:
```text
feat: adiciona criação de tarefas
fix: corrige persistência de projetos
docs: adiciona requisitos oficiais do Gestor Diário
test: adiciona testes de tarefas
refactor: simplifica componente existente
ci: adiciona pipeline de integração contínua
chore: configura estrutura inicial do repositório
```

CI/CD será preparado progressivamente; nenhum pipeline completo ou APK integra esta etapa.

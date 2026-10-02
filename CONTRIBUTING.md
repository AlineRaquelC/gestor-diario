# Contribuindo com o Gestor Diário

Não trabalhar diretamente em `main`. Criar uma branch a partir de `dev`, com prefixo `feature/`, `fix/` ou `docs/`, conforme o trabalho. Usar Conventional Commits e vincular alterações à Issue correspondente quando existir.

Abrir Pull Request para `dev`, descrever o comportamento e os testes, revisar antes do merge e atualizar a documentação quando necessário. Após testes e revisão, promover de `dev` para `main` por Pull Request.

Nunca versionar credenciais, arquivos de ambiente, caches ou builds. Consultar o [processo de desenvolvimento](docs/processo-desenvolvimento.md) e a [auditoria inicial](docs/auditoria-inicial.md).

## Conventional Commits

Formato oficial: `tipo(escopo): descrição`. O escopo é opcional: `tipo: descrição` também é aceito. Tipos iniciais: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`.

```text
feat(tasks): adiciona criação de tarefas
feat(projects): adiciona gerenciamento de projetos
fix(navigation): corrige fluxo após edição
fix(storage): corrige persistência local
docs(requirements): documenta requisitos oficiais
docs(backlog): atualiza backlog da sprint
test(tasks): adiciona testes de tarefas
ci(android): adiciona validação do Android
chore(repo): configura estrutura do repositório
```

Commit previsto para esta configuração: `chore(repo): organiza projeto Gestor Diário e configura repositório`.

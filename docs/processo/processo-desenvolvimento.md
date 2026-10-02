# Processo de Desenvolvimento — Gestor Diário

## 1. Objetivo

Este documento define o processo de desenvolvimento adotado no projeto **Gestor Diário**, garantindo rastreabilidade entre requisitos, backlog, implementação, testes e entregas.

O processo utiliza práticas de desenvolvimento ágil, versionamento Git, Pull Requests e integração contínua.

---

## 2. Fluxo de trabalho

```text
Requisito
   ↓
Product Backlog Item / User Story
   ↓
GitHub Issue
   ↓
Task técnica
   ↓
Branch
   ↓
Implementação
   ↓
Commit
   ↓
Pull Request
   ↓
Review
   ↓
dev
   ↓
Testes / CI
   ↓
Pull Request
   ↓
main
```

---

## 3. Papéis dos artefatos

### Requisitos
Fonte oficial do que o sistema deve atender.

### Product Backlog
Organiza os requisitos em itens de trabalho priorizados.

### Sprint Backlog
Seleciona os itens comprometidos para uma Sprint.

### GitHub Issues
Representam o trabalho executável e rastreável.

### Branches
Isolam alterações.

### Commits
Registram pequenas unidades de mudança.

### Pull Requests
Permitem revisão, validação e integração.

### CI
Executa verificações automáticas.

---

## 4. Estratégia de branches

- `main`: versão estável e demonstrável;
- `dev`: integração do desenvolvimento;
- `feature/*`: novas funcionalidades;
- `fix/*`: correções;
- `docs/*`: documentação;
- `test/*`: testes;
- `ci/*`: automações e CI/CD.

---

## 5. Fluxo de uma funcionalidade

1. selecionar uma Issue;
2. criar branch a partir de `dev`;
3. implementar em pequenas mudanças;
4. executar testes locais;
5. criar commits seguindo Conventional Commits;
6. fazer push da branch;
7. abrir Pull Request para `dev`;
8. revisar alterações;
9. aguardar CI;
10. fazer merge em `dev`;
11. validar incremento integrado;
12. ao final da Sprint, abrir PR de `dev` para `main`.

---

## 6. Convenção de commits

Formato:

```text
tipo(escopo): descrição
```

Tipos aceitos:

```text
feat
fix
docs
test
refactor
chore
ci
```

Exemplos:

```text
feat(tasks): adiciona criação de tarefas
fix(storage): corrige persistência local
docs(backlog): atualiza planejamento da sprint
test(api): adiciona testes de endpoints
ci(api): adiciona pipeline do backend
chore(repo): ajusta configuração do projeto
```

---

## 7. Pull Requests

Todo PR deve conter:

- descrição da mudança;
- Issue relacionada;
- tipo de alteração;
- testes realizados;
- checklist;
- evidências quando necessário.

Não devem ser feitos merges em `main` sem validação.

---

## 8. Critérios para integração em dev

Uma alteração pode ser integrada em `dev` quando:

- atende o escopo da Issue;
- não possui erro bloqueante;
- testes aplicáveis passam;
- CI está aprovado;
- documentação relevante foi atualizada;
- não contém secrets;
- código foi revisado.

---

## 9. Integração de dev para main

A branch `main` representa a versão estável.

O merge `dev → main` deve ocorrer quando:

- os itens planejados da Sprint estiverem concluídos ou formalmente replanejados;
- o incremento estiver funcional;
- testes principais estiverem aprovados;
- build Android estiver validado quando aplicável;
- documentação estiver atualizada.

---

## 10. Rastreabilidade

A rastreabilidade esperada é:

```text
RF/REQ
  ↓
PBI
  ↓
Sprint
  ↓
Issue
  ↓
Branch
  ↓
Commit
  ↓
PR
  ↓
Teste
```

Sempre que possível, Issues e PRs devem referenciar os respectivos PBIs/requisitos.

---

## 11. Segurança

Antes de commits e pushes:

- revisar `git status`;
- confirmar `.gitignore`;
- verificar ausência de `.env`;
- verificar ausência de tokens;
- verificar ausência de chaves privadas;
- verificar ausência de keystores de produção;
- evitar bancos locais com dados pessoais.

---

## 12. Documentação

Alterações relevantes devem atualizar, quando necessário:

- requisitos;
- backlog;
- Sprint;
- arquitetura;
- ADRs;
- README;
- documentação da API.

---

## 13. Testes

O projeto deverá evoluir com:

- testes unitários;
- testes de integração;
- testes de endpoints;
- validação TypeScript;
- lint;
- testes manuais do fluxo Android.

---

## 14. CI/CD

A integração contínua deverá validar progressivamente:

```text
npm ci
↓
TypeScript
↓
lint
↓
testes
```

No futuro:

```text
build Android
↓
artefato APK
```

A entrega contínua será introduzida de forma incremental.

---

## 15. Regra principal

Nenhuma automação ou refatoração deve comprometer a estabilidade do incremento atual.

Mudanças devem ser pequenas, rastreáveis e reversíveis.

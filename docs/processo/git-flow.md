# Git Flow — Gestor Diário

## 1. Objetivo

Este documento define o fluxo Git oficial do projeto **Gestor Diário**.

O objetivo é manter histórico claro, facilitar revisão e evitar desenvolvimento direto em branches estáveis.

---

## 2. Branches permanentes

### main

Representa a versão estável e demonstrável.

Regras:

- não desenvolver diretamente em `main`;
- alterações devem chegar por Pull Request;
- deve permanecer funcional;
- utilizada como referência de entrega.

### dev

Representa a branch de integração.

Regras:

- novas funcionalidades chegam por PR;
- deve permanecer utilizável;
- recebe branches de feature, fix, docs, test e ci;
- ao final da Sprint, pode gerar PR para `main`.

---

## 3. Branches temporárias

### Feature

```text
feature/<issue>-<descricao>
```

Exemplo:

```text
feature/23-create-project-api
```

### Fix

```text
fix/<issue>-<descricao>
```

Exemplo:

```text
fix/41-task-date-validation
```

### Docs

```text
docs/<issue>-<descricao>
```

### Test

```text
test/<issue>-<descricao>
```

### CI

```text
ci/<issue>-<descricao>
```

Quando ainda não existir Issue, evitar criar branch de implementação; primeiro registrar o trabalho.

---

## 4. Criação de branch

Fluxo:

```bash
git switch dev
git pull
git switch -c feature/23-create-project-api
```

---

## 5. Desenvolvimento

Durante o desenvolvimento:

```bash
git status
git add <arquivos>
git commit -m "feat(projects): adiciona criação de projeto na API"
```

Evitar commits gigantes.

Preferir commits pequenos e coerentes.

---

## 6. Push

```bash
git push -u origin feature/23-create-project-api
```

Depois abrir PR para:

```text
dev
```

---

## 7. Pull Request

O PR deve:

- referenciar a Issue;
- explicar o que mudou;
- informar testes;
- usar template do projeto;
- passar CI;
- não conter secrets.

---

## 8. Merge

Preferir estratégia que preserve histórico limpo.

O método exato de merge pode ser definido nas configurações do repositório.

Após merge:

```bash
git switch dev
git pull
git branch -d feature/23-create-project-api
```

A branch remota também pode ser removida após merge.

---

## 9. Fluxo da Sprint

```text
feature/fix/docs/test/ci
        ↓
       dev
        ↓
integração + testes
        ↓
       main
```

---

## 10. Hotfix

Caso uma correção urgente seja necessária em versão já estável:

```text
main
 ↓
fix/hotfix-...
 ↓
PR para main
 ↓
sincronizar também com dev
```

Esse fluxo deverá ser usado apenas quando houver necessidade real.

---

## 11. Commits

Formato oficial:

```text
tipo(escopo): descrição
```

Tipos:

```text
feat
fix
docs
test
refactor
chore
ci
```

---

## 12. Regras de segurança

Nunca versionar:

- `.env`;
- tokens;
- senhas;
- chaves privadas;
- keystores de produção;
- `key.properties`;
- `local.properties`;
- bancos locais contendo dados sensíveis.

---

## 13. Regra principal

`main` e `dev` não são áreas de experimentação.

O desenvolvimento ocorre em branches temporárias e é integrado por Pull Request.

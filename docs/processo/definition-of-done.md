# Definition of Done — Gestor Diário

## 1. Objetivo

A **Definition of Done (DoD)** estabelece as condições mínimas para que um item seja considerado concluído no projeto **Gestor Diário**.

Marcar uma tarefa como concluída sem atender estes critérios não significa que o incremento esteja pronto.

---

## 2. Definition of Done de User Story / PBI

Uma User Story ou PBI pode ser considerada concluída quando:

- [ ] critérios de aceite atendidos;
- [ ] regras de negócio implementadas;
- [ ] funcionalidade integrada às camadas necessárias;
- [ ] código compila;
- [ ] sem erro bloqueante conhecido;
- [ ] testes aplicáveis executados;
- [ ] TypeScript sem erro novo relacionado à alteração;
- [ ] lint sem erro novo relacionado à alteração;
- [ ] fluxo principal testado manualmente quando aplicável;
- [ ] documentação atualizada;
- [ ] Issue atualizada;
- [ ] commits seguem o padrão oficial;
- [ ] Pull Request criado;
- [ ] Pull Request revisado;
- [ ] CI aprovado;
- [ ] merge realizado na branch correta.

---

## 3. DoD para Front-end Mobile

Além dos critérios gerais:

- [ ] tela utiliza dados reais, não mockados;
- [ ] navegação funciona;
- [ ] estados de loading/erro são tratados quando aplicável;
- [ ] validações de formulário funcionam;
- [ ] alterações persistem conforme arquitetura vigente;
- [ ] testado no Android;
- [ ] interface não apresenta regressão funcional grave.

---

## 4. DoD para Backend

- [ ] endpoint implementado;
- [ ] validação de entrada;
- [ ] regra de negócio na camada apropriada;
- [ ] controller sem acesso direto ao banco;
- [ ] service sem lógica HTTP desnecessária;
- [ ] repository responsável pela persistência;
- [ ] códigos HTTP coerentes;
- [ ] erros tratados;
- [ ] testes de endpoint ou service quando aplicável;
- [ ] documentação da API atualizada.

---

## 5. DoD para Banco

- [ ] schema atualizado;
- [ ] migration criada;
- [ ] migration executa em banco limpo;
- [ ] relacionamentos válidos;
- [ ] constraints necessárias;
- [ ] rollback/recuperação considerada quando aplicável;
- [ ] banco de teste separado;
- [ ] arquivo de banco local não versionado quando não for necessário.

---

## 6. DoD para documentação

- [ ] conteúdo revisado;
- [ ] caminho correto;
- [ ] terminologia consistente;
- [ ] rastreabilidade preservada;
- [ ] commit `docs(...)`;
- [ ] push realizado;
- [ ] links internos válidos quando aplicável.

---

## 7. DoD para DevOps / CI

- [ ] workflow versionado;
- [ ] sintaxe válida;
- [ ] pipeline executado;
- [ ] falhas são visíveis;
- [ ] não expõe secrets;
- [ ] comandos reproduzem validações locais;
- [ ] documentação de execução atualizada.

---

## 8. DoD da Sprint

A Sprint poderá ser encerrada quando:

- [ ] Sprint Goal atendido ou formalmente revisado;
- [ ] PBIs comprometidos concluídos ou replanejados;
- [ ] incremento integrado em `dev`;
- [ ] testes principais aprovados;
- [ ] documentação atualizada;
- [ ] nenhuma pendência bloqueante sem registro;
- [ ] demonstração preparada;
- [ ] PR `dev → main` criado quando houver entrega estável;
- [ ] versão em `main` demonstrável.

---

## 9. Critérios que não podem ser ignorados

Um item não está Done se:

- funciona apenas com dados mockados quando deveria persistir;
- depende de alteração manual não documentada;
- quebra fluxo já existente;
- contém secret;
- não está versionado;
- não atende critério de aceite;
- não foi integrado;
- não foi minimamente validado.

---

## 10. Definition of Done da primeira entrega

Para a primeira entrega do Gestor Diário, além dos critérios anteriores:

- [ ] aplicativo Android executa;
- [ ] criação e gerenciamento principal de tarefas funciona;
- [ ] projetos funcionam;
- [ ] persistência local funciona;
- [ ] mini API Node.js executa;
- [ ] SQLite inicializa por migrations;
- [ ] CRUD principal da API funciona;
- [ ] integração mobile ↔ API funciona no fluxo selecionado;
- [ ] sincronização manual prevista para o MVP está validada;
- [ ] CI inicial está ativo;
- [ ] documentação de execução está atualizada;
- [ ] nenhuma credencial foi versionada.

---

## 11. Regra principal

**Done significa integrado, validado, documentado e rastreável.**

Código escrito isoladamente não é suficiente.

# ADR-001 — Escolha do Banco de Dados da Primeira Entrega

## Status

**Aceito**

## Data

2026-10-02

## Projeto

**Gestor Diário**

---

## 1. Contexto

O projeto **Gestor Diário** será desenvolvido como uma aplicação mobile em React Native integrada a uma mini API Node.js.

A arquitetura inicial prevista para o MVP é:

```text
React Native
    ↓
Contexts
    ↓
Services
    ↓
API REST
    ↓
Node.js
    ↓
Banco de Dados
```

Na primeira entrega, o objetivo é disponibilizar um incremento funcional e demonstrável, com persistência de dados no servidor e integração progressiva entre mobile, API e banco.

O modelo de dados inicial já contempla principalmente:

- Project;
- Task;
- Subtask;
- Note;
- TaskHistory.

Os relacionamentos previstos são majoritariamente relacionais:

```text
Project 1:N Task
Task    1:N Subtask
Task    1:N Note
Task    1:N TaskHistory
```

A escolha do banco deve priorizar simplicidade, facilidade de execução local, baixo custo de configuração e compatibilidade com Node.js.

---

## 2. Decisão

Para a **primeira entrega do Gestor Diário**, será utilizado:

# SQLite

O SQLite será o banco relacional inicial da mini API Node.js.

A decisão vale para a primeira entrega e para o MVP inicial.

Ela poderá ser revisada futuramente caso o projeto passe a exigir:

- múltiplos usuários simultâneos;
- maior concorrência;
- execução distribuída;
- servidor de banco independente;
- deploy em ambiente de produção;
- escalabilidade maior.

---

## 3. Alternativas avaliadas

### 3.1 SQLite

#### Vantagens

- banco relacional;
- funciona em arquivo local;
- não exige instalação de servidor de banco separado;
- configuração simples;
- adequado para projetos acadêmicos e MVPs;
- fácil de executar localmente;
- simples de incluir em testes;
- compatível com Node.js;
- adequado ao modelo relacional definido;
- reduz dependências externas na demonstração;
- facilita a execução da API em uma única máquina.

#### Desvantagens

- menor capacidade de concorrência quando comparado a bancos cliente-servidor;
- não é a melhor opção para cenários distribuídos;
- possui limitações para alta escala;
- exige planejamento de migração caso o projeto cresça significativamente.

---

### 3.2 PostgreSQL

#### Vantagens

- banco relacional robusto;
- alta confiabilidade;
- recursos avançados;
- adequado para aplicações maiores;
- excelente suporte a integridade relacional;
- ampla utilização profissional.

#### Desvantagens para a primeira entrega

- exige servidor de banco;
- configuração mais extensa;
- demanda gerenciamento de usuário, senha, porta e serviço;
- aumenta a quantidade de componentes necessários para demonstração;
- adiciona complexidade que não é necessária para o MVP inicial.

---

### 3.3 MySQL / MariaDB

#### Vantagens

- bancos relacionais amplamente utilizados;
- boa integração com Node.js;
- suporte a aplicações cliente-servidor.

#### Desvantagens para a primeira entrega

- também exige serviço de banco independente;
- necessita configuração adicional;
- não oferece vantagem relevante sobre SQLite para o escopo atual;
- adiciona complexidade operacional ao MVP.

---

## 4. Critérios utilizados

A decisão considerou:

| Critério | SQLite | PostgreSQL | MySQL/MariaDB |
|---|---|---|---|
| Simplicidade para o MVP | Alta | Média | Média |
| Instalação adicional | Não | Sim | Sim |
| Banco relacional | Sim | Sim | Sim |
| Compatibilidade com Node.js | Sim | Sim | Sim |
| Facilidade de demonstração local | Alta | Média | Média |
| Adequação ao modelo inicial | Alta | Alta | Alta |
| Escalabilidade futura | Baixa/Média | Alta | Alta |
| Complexidade operacional | Baixa | Média/Alta | Média/Alta |

Para a primeira entrega, os critérios de maior peso são:

1. simplicidade;
2. execução local;
3. facilidade de demonstração;
4. aderência ao modelo relacional;
5. menor quantidade de serviços externos;
6. baixo risco de configuração.

---

## 5. Consequências da decisão

### Consequências positivas

A adoção do SQLite permite que a arquitetura inicial fique próxima de:

```text
Mobile React Native
        ↓
API REST Node.js
        ↓
SQLite
```

Sem a necessidade de executar separadamente:

```text
servidor PostgreSQL
ou
servidor MySQL/MariaDB
```

Isso simplifica:

- configuração do ambiente;
- demonstração para o professor;
- testes;
- desenvolvimento local;
- automação futura no CI;
- onboarding do projeto.

---

### Consequências negativas

A equipe deve considerar que SQLite não representa necessariamente a solução definitiva para um cenário de produção com grande concorrência.

Se houver necessidade futura, poderá ocorrer migração para outro SGBD.

Por isso:

- regras de negócio não devem ficar acopladas ao SQLite;
- acesso ao banco deve ficar isolado em camada própria;
- controllers não devem executar SQL diretamente;
- migrations devem ser utilizadas;
- identificadores e relacionamentos devem ser modelados de forma portável.

---

## 6. Diretriz arquitetural

O backend deverá preservar separação de responsabilidades:

```text
Routes
  ↓
Controllers
  ↓
Services
  ↓
Repositories
  ↓
SQLite
```

O banco não deverá ser acessado diretamente pelas rotas ou pelo aplicativo mobile.

O React Native nunca acessará o arquivo SQLite do backend diretamente.

Fluxo correto:

```text
React Native
    ↓
HTTP / JSON
    ↓
API Node.js
    ↓
Repository
    ↓
SQLite
```

---

## 7. Persistência local do mobile

O SQLite da API não substitui diretamente o `AsyncStorage` que já existe no mobile.

Durante a primeira entrega:

```text
SQLite
```

será a persistência do servidor.

E:

```text
AsyncStorage
```

continuará sendo a persistência/cache local do aplicativo.

A estratégia deverá evoluir para:

```text
Banco SQLite do servidor = fonte persistente principal

AsyncStorage = cache local / apoio offline
```

A sincronização será introduzida de forma gradual.

---

## 8. Localização prevista do banco

O arquivo físico do SQLite deverá ficar dentro da estrutura do backend, em diretório apropriado.

Exemplo conceitual:

```text
backend/
├── src/
│   └── ...
└── data/
    └── gestor-diario.db
```

A localização definitiva será determinada durante a implementação da API.

Arquivos de banco gerados localmente devem ser avaliados antes de serem versionados.

Quando apropriado, o banco de desenvolvimento poderá ser ignorado pelo Git e recriado por migrations/seeds.

---

## 9. Migrations

A implementação deverá utilizar algum mecanismo de migration.

Objetivos:

- criar tabelas de forma reproduzível;
- alterar schema de forma controlada;
- permitir reconstrução do banco;
- facilitar testes;
- evitar alterações manuais não rastreadas.

A biblioteca de migrations/ORM ainda não foi escolhida.

Ela será definida na próxima decisão arquitetural da stack do backend.

---

## 10. Estrutura mínima prevista

O banco deverá suportar inicialmente as tabelas equivalentes a:

```text
projects
tasks
subtasks
notes
task_history
```

Relacionamentos:

```text
projects.id
    ↓
tasks.project_id

tasks.id
    ↓
subtasks.task_id

tasks.id
    ↓
notes.task_id

tasks.id
    ↓
task_history.task_id
```

---

## 11. Integridade

O banco deverá garantir, quando tecnicamente possível:

- chaves primárias;
- relacionamentos válidos;
- tipos coerentes;
- campos obrigatórios;
- timestamps;
- integridade entre tarefas e projetos;
- integridade entre tarefas e subtarefas;
- integridade entre tarefas e notas;
- integridade entre tarefas e histórico.

As regras de negócio também deverão ser validadas pela camada de serviço da API.

---

## 12. Testes

O SQLite deverá permitir testes isolados.

Estratégias possíveis:

- banco temporário;
- arquivo específico para testes;
- banco em memória quando suportado pela biblioteca escolhida.

Os testes não devem alterar o banco utilizado para demonstração/desenvolvimento.

---

## 13. Segurança

O SQLite não deve armazenar secrets do projeto.

Não devem ser salvos no banco ou repositório:

- tokens de GitHub;
- senhas de ambiente;
- chaves privadas;
- keystores;
- credenciais externas.

Configurações sensíveis deverão permanecer fora do versionamento.

---

## 14. Migração futura

Caso futuramente seja necessário migrar para PostgreSQL ou outro SGBD, a arquitetura deve permitir substituir principalmente:

```text
Repository / camada de persistência
```

sem exigir reescrita das telas React Native ou das regras centrais do sistema.

Por isso, evitar código como:

```text
Controller → SQL diretamente
```

Preferir:

```text
Controller
   ↓
Service
   ↓
Repository
   ↓
Banco
```

---

## 15. Escopo da decisão

Esta ADR decide somente:

> **SQLite será o banco da primeira entrega do Gestor Diário.**

Ela ainda não decide:

- ORM;
- query builder;
- driver SQLite;
- biblioteca de migrations;
- estrutura definitiva dos repositories;
- estratégia de seed;
- autenticação;
- deploy;
- banco de produção futuro.

Essas decisões serão documentadas separadamente.

---

## 16. Próxima decisão

A próxima ADR deverá definir a stack técnica da mini API Node.js.

Itens a decidir:

- Node.js + TypeScript;
- framework HTTP;
- biblioteca de validação;
- ORM/query builder ou driver;
- migrations;
- estrutura de testes;
- scripts de desenvolvimento.

---

## 17. Resultado

Decisão aprovada:

```text
Primeira Entrega / MVP
        ↓
Node.js API REST
        ↓
SQLite
```

**Status: ACEITO**

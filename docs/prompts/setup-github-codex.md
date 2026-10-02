# GESTOR DIÁRIO — ORGANIZAÇÃO INICIAL, DOCUMENTAÇÃO, GIT E GITHUB

Atue como:

- Engenheiro de Software
- DevOps Engineer
- Especialista em Git/GitHub
- Scrum Master técnico
- Arquiteto de Software

Você está trabalhando diretamente no meu projeto acadêmico.

==================================================
1. IDENTIDADE OFICIAL DO PROJETO
==================================================

Nome oficial do aplicativo:

GESTOR DIÁRIO

Nome do repositório GitHub:

gestor-diario

Visibilidade do repositório:

PUBLIC

IMPORTANTE:

O nome "TaskFlow" NÃO é oficial e não deve ser usado como nome do projeto, aplicativo, documentação ou repositório.

O nome correto definido pelo documento do professor é:

Gestor Diário

Se existirem referências a "TaskFlow" apenas em documentação, textos de interface ou arquivos que possam ser alterados com segurança, substitua por "Gestor Diário".

NÃO altere package names, applicationId Android, namespaces, identificadores internos ou caminhos técnicos se isso puder quebrar o projeto.

Diferencie:

Nome exibido ao usuário:
Gestor Diário

Nome do repositório:
gestor-diario

Identificadores técnicos internos:
podem permanecer como estão quando a alteração representar risco desnecessário.

==================================================
2. CONTEXTO DO PROJETO
==================================================

O projeto é um aplicativo mobile de gerenciamento de tarefas.

Tecnologias determinadas para o projeto:

- React Native
- TypeScript
- Android
- Node.js
- API REST
- banco de dados a ser definido posteriormente
- Git
- GitHub
- GitHub Actions posteriormente

O projeto será desenvolvido utilizando:

- Scrum
- backlog
- Sprints
- Issues
- branches
- commits padronizados
- Pull Requests
- code review
- integração contínua
- entrega contínua
- documentação versionada

O projeto completo deverá futuramente conter:

- aplicação mobile;
- mini API Node.js;
- banco de dados;
- persistência local;
- integração mobile ↔ API;
- CI/CD;
- documentação;
- testes.

PORÉM:

NESTA ETAPA NÃO DESENVOLVA A API, O BANCO OU NOVAS FUNCIONALIDADES.

==================================================
3. OBJETIVO DESTA ETAPA
==================================================

Nesta etapa quero SOMENTE:

1. auditar o projeto local existente;
2. confirmar que ele está funcional antes de reorganizar qualquer coisa;
3. corrigir o nome oficial onde for seguro;
4. organizar a documentação inicial;
5. revisar/criar o .gitignore;
6. verificar ou inicializar Git;
7. criar o repositório público no GitHub;
8. configurar o remote;
9. publicar a branch main;
10. criar e publicar a branch dev;
11. preparar estrutura para gestão ágil;
12. preparar estrutura futura para CI/CD;
13. fazer o primeiro commit organizado;
14. deixar o repositório limpo e sincronizado.

NÃO implemente novas funcionalidades.

==================================================
4. PRIMEIRO: AUDITORIA OBRIGATÓRIA
==================================================

ANTES DE ALTERAR QUALQUER ARQUIVO, analise o projeto.

Verifique:

- diretório atual;
- package.json;
- package-lock.json;
- src/;
- screens/;
- navigation/;
- components/;
- context/;
- services/, se existir;
- android/;
- README.md;
- .gitignore;
- arquivos de configuração;
- documentação já existente;
- dependências;
- estado atual do Git;
- existência de .git;
- remotes;
- branches;
- possíveis secrets;
- arquivos de build indevidamente presentes.

Execute inicialmente:

pwd
git status
git branch -a
git remote -v

Se o projeto ainda não estiver inicializado em Git, apenas registre isso na auditoria.

Também verifique:

node --version
npm --version
git --version
gh --version

Antes de modificar qualquer coisa, apresente um resumo curto contendo:

1. estrutura atual encontrada;
2. situação atual do Git;
3. remote existente, se houver;
4. branches existentes;
5. nome técnico atual do projeto;
6. possíveis riscos encontrados;
7. arquivos que pretende criar;
8. arquivos que pretende modificar.

Depois prossiga automaticamente apenas com mudanças seguras.

==================================================
5. REGRA PRINCIPAL: NÃO QUEBRAR O PROJETO
==================================================

O projeto React Native já possui funcionalidades implementadas.

NÃO:

- reescreva a aplicação;
- reorganize toda a arquitetura;
- mova arquivos sem necessidade;
- renomeie namespaces Android;
- altere applicationId;
- altere Gradle sem necessidade;
- remova dependências;
- apague código funcional.

Faça sempre a menor mudança segura possível.

Prioridade:

1. preservar funcionamento;
2. organizar versionamento;
3. organizar documentação;
4. preparar processo.

==================================================
6. ESTRUTURA FUTURA DO REPOSITÓRIO
==================================================

O projeto completo deverá futuramente poder evoluir para algo semelhante a:

gestor-diario/
│
├── mobile/
│
├── backend/
│
├── docs/
│   ├── requisitos/
│   ├── backlog/
│   ├── arquitetura/
│   ├── sprints/
│   ├── decisoes/
│   └── atas/
│
├── .github/
│   ├── workflows/
│   ├── ISSUE_TEMPLATE/
│   └── pull_request_template.md
│
├── README.md
├── CONTRIBUTING.md
└── .gitignore

MAS ATENÇÃO:

O React Native já existe na estrutura atual.

NÃO mova agora todo o projeto para uma pasta /mobile se isso puder quebrar:

- Gradle;
- Metro;
- imports;
- caminhos relativos;
- scripts npm;
- Android;
- configuração de build.

Se mover representar risco, mantenha a aplicação na raiz nesta etapa.

A arquitetura acima é uma direção futura, não uma obrigação imediata.

==================================================
7. DOCUMENTAÇÃO
==================================================

Crie:

docs/

Com a seguinte estrutura inicial:

docs/
├── requisitos/
│   └── requisitos-oficiais.md
│
├── backlog/
│   └── backlog-produto.md
│
├── arquitetura/
│   └── arquitetura-inicial.md
│
├── sprints/
│   └── sprint-1.md
│
├── decisoes/
│   └── README.md
│
└── processo-desenvolvimento.md

==================================================
8. DOCUMENTO DE REQUISITOS
==================================================

O arquivo:

docs/requisitos/requisitos-oficiais.md

deve deixar claro que:

- Nome oficial: Gestor Diário
- Plataforma: Android
- Mobile: React Native
- Backend: Node.js
- Tema: gerenciamento de tarefas

Os requisitos oficiais são provenientes APENAS das páginas 1 a 35 do documento fornecido pelo professor.

NÃO invente requisitos.

Se o PDF oficial estiver disponível no ambiente, utilize-o.

Se NÃO estiver disponível:

NÃO tente reconstruir requisitos de memória.

Nesse caso crie o documento com:

- identificação do projeto;
- origem dos requisitos;
- aviso de que o conteúdo integral será incluído depois;
- estrutura pronta para inserção.

Não misture requisitos de outros alunos ou páginas posteriores à página 35.

==================================================
9. BACKLOG
==================================================

Crie:

docs/backlog/backlog-produto.md

Nesta etapa NÃO crie centenas de Issues automaticamente.

O arquivo deve explicar:

- origem do backlog;
- requisitos oficiais;
- divisão futura em entregas;
- priorização;
- rastreabilidade.

Utilize esta estrutura:

| ID | Requisito/User Story | Prioridade | Entrega | Área | Status |
|----|------------------------|-----------|---------|------|--------|

Áreas possíveis:

- Front
- Backend
- Banco
- Hardware
- DevOps
- Documentação
- Testes

Se o backlog completo não estiver disponível no repositório, não invente conteúdo.

==================================================
10. SPRINT 1
==================================================

Crie:

docs/sprints/sprint-1.md

O documento deve inicialmente conter:

# Sprint 1

## Objetivo

Entregar o núcleo funcional do Gestor Diário, integrando progressivamente aplicação mobile, mini API e persistência.

## Status

Em desenvolvimento.

## Escopo

Registrar somente funcionalidades que já estão confirmadas no projeto/documentação.

## Definition of Done

Preparar seção para:

- funcionalidade implementada;
- critérios de aceite atendidos;
- testes executados;
- código versionado;
- PR realizado;
- documentação atualizada;
- build funcional.

NÃO invente funcionalidades.

==================================================
11. ARQUITETURA
==================================================

Crie:

docs/arquitetura/arquitetura-inicial.md

Documente a arquitetura planejada:

React Native
       ↓
Context / Services
       ↓
API REST
       ↓
Node.js
       ↓
Banco de Dados

Também documente que atualmente existe persistência local no aplicativo.

Não escolha o banco ainda.

Registre:

"Banco de dados será definido na etapa de arquitetura da mini API."

==================================================
12. PROCESSO DE DESENVOLVIMENTO
==================================================

Crie:

docs/processo-desenvolvimento.md

Documente o fluxo:

Requisito
   ↓
User Story
   ↓
Issue
   ↓
Branch
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

Documente também:

main
= versão estável/demonstrável

dev
= integração do desenvolvimento

feature/*
= funcionalidades

fix/*
= correções

docs/*
= documentação

==================================================
13. CONVENÇÃO DE COMMITS
==================================================

Utilize Conventional Commits.

Tipos:

feat:
fix:
docs:
test:
refactor:
chore:
ci:

Exemplos:

feat: adiciona criação de tarefas

fix: corrige persistência de projetos

docs: adiciona requisitos oficiais do Gestor Diário

test: adiciona testes de tarefas

ci: adiciona pipeline de integração contínua

chore: configura estrutura inicial do repositório

==================================================
14. README PRINCIPAL
==================================================

Crie ou atualize README.md.

Título:

# Gestor Diário

Descrição:

Aplicativo mobile para criação, organização, acompanhamento e gerenciamento de tarefas, desenvolvido em React Native e integrado progressivamente a uma mini API Node.js.

Criar seções:

## Sobre o projeto

## Objetivo

## Tecnologias

Inicialmente:

- React Native
- TypeScript
- Node.js
- Android
- AsyncStorage
- Git
- GitHub

Não adicione banco até que seja definido.

## Arquitetura

Mobile
→ API REST
→ Backend Node.js
→ Banco

## Metodologia

- Scrum
- Sprints
- backlog
- Git
- GitHub
- Pull Requests
- CI/CD

## Branches

main
dev
feature/*
fix/*
docs/*

## Estrutura

Documentar a estrutura REAL encontrada.

## Como executar

Documentar somente comandos realmente validados no projeto.

## Status

Sprint 1 — Em desenvolvimento.

## Documentação

Adicionar links para /docs.

==================================================
15. CONTRIBUTING
==================================================

Crie:

CONTRIBUTING.md

Explique resumidamente:

- não trabalhar diretamente em main;
- criar branch;
- utilizar Conventional Commits;
- abrir Pull Request;
- revisar antes do merge;
- atualizar documentação quando necessário.

==================================================
16. PULL REQUEST TEMPLATE
==================================================

Crie:

.github/pull_request_template.md

Com:

# Descrição

Explique resumidamente a alteração.

## User Story / Issue

Referência:

Closes #

ou

Relacionado a #

## Tipo de alteração

- [ ] Feature
- [ ] Bugfix
- [ ] Refactor
- [ ] Documentação
- [ ] Teste
- [ ] DevOps

## Testes realizados

Descreva os testes executados.

## Checklist

- [ ] Código compilando
- [ ] Testes executados
- [ ] Critérios de aceite atendidos
- [ ] Sem secrets
- [ ] Documentação atualizada
- [ ] Sem código temporário desnecessário
- [ ] PR pronto para revisão

==================================================
17. GITHUB ACTIONS
==================================================

Crie apenas a pasta:

.github/workflows/

Nesta etapa NÃO crie ainda um pipeline complexo.

Se quiser adicionar apenas um README explicando os workflows futuros, pode fazê-lo.

Pipelines futuros:

- TypeScript
- lint
- testes
- backend
- build
- Android

NÃO gere APK nesta etapa.

==================================================
18. .GITIGNORE
==================================================

Revise cuidadosamente o .gitignore.

Garanta que NÃO sejam versionados:

node_modules/
.env
.env.*
*.jks
*.keystore
local.properties
android/.gradle/
android/app/build/
build/
dist/
coverage/
*.log
arquivos temporários
arquivos pessoais da IDE
tokens
credenciais
senhas
chaves privadas

Preserve os arquivos necessários ao React Native.

ANTES de executar:

git add .

verifique o que será incluído.

==================================================
19. SEGURANÇA
==================================================

Procure possíveis:

- tokens;
- senhas;
- PAT do GitHub;
- chaves privadas;
- credenciais;
- .env;
- keystores;
- secrets.

Se encontrar um secret real:

NÃO FAÇA PUSH.

PARE e me informe o arquivo e o tipo de problema, sem imprimir o secret completo.

==================================================
20. GITHUB CLI
==================================================

Verifique:

gh --version

Depois:

gh auth status

Se estiver autenticado, continue.

Se NÃO estiver autenticado:

PARE nesse ponto e peça para eu executar:

gh auth login

Não peça token pelo chat.

Depois que a autenticação for concluída, continue.

==================================================
21. VERIFICAR SE O REPOSITÓRIO JÁ EXISTE
==================================================

Antes de criar qualquer repositório, verifique se:

gestor-diario

já existe na conta GitHub autenticada.

Se existir:

NÃO crie duplicado.

Analise se ele corresponde a este projeto e informe.

Se não existir, continue.

==================================================
22. CRIAR REPOSITÓRIO GITHUB
==================================================

Crie um repositório:

Nome:

gestor-diario

Visibilidade:

PUBLIC

Descrição:

Aplicativo mobile de gerenciamento de tarefas desenvolvido em React Native, integrado a uma mini API Node.js, aplicando práticas de desenvolvimento ágil, CI/CD e persistência de dados.

IMPORTANTE:

Não inicialize o GitHub com arquivos que possam entrar em conflito com os arquivos locais.

O projeto local deve ser a fonte inicial.

==================================================
23. GIT LOCAL
==================================================

Verifique antes se existe:

.git

Se NÃO existir:

git init

Defina:

main

como branch principal:

git branch -M main

Se já existir Git:

NÃO reinicialize desnecessariamente.

==================================================
24. REMOTE
==================================================

Configure:

origin

para o repositório:

gestor-diario

Verifique:

git remote -v

Se já existir origin apontando para outro projeto:

NÃO sobrescreva silenciosamente.

Informe antes.

==================================================
25. PRIMEIRO COMMIT
==================================================

Antes:

git status

Revise cuidadosamente os arquivos.

Certifique-se de que NÃO entram:

- node_modules;
- .env;
- builds;
- secrets;
- arquivos locais;
- caches.

Depois:

git add .

Revise novamente:

git status

Faça o primeiro commit organizado.

Mensagem:

chore: organiza projeto Gestor Diário e configura repositório

Esse commit pode conter:

- código funcional existente;
- README;
- documentação;
- .gitignore;
- CONTRIBUTING;
- templates GitHub;
- configurações necessárias.

==================================================
26. PUBLICAR MAIN
==================================================

Faça push:

git push -u origin main

Verifique se terminou corretamente.

==================================================
27. CRIAR DEV
==================================================

Depois de main publicada:

git switch -c dev

Publique:

git push -u origin dev

Ao final, permaneça na branch:

dev

==================================================
28. PROTEÇÃO DAS BRANCHES
==================================================

Se for possível configurar com segurança:

MAIN:

- exigir Pull Request;
- impedir push direto quando possível;
- exigir branch atualizada quando apropriado.

DEV:

- preferir Pull Requests para integração.

Se não puder configurar automaticamente:

NÃO force.

Informe como configurar manualmente.

==================================================
29. GESTÃO ÁGIL NO GITHUB
==================================================

Nesta etapa NÃO crie centenas de Issues.

Apenas prepare o repositório para posteriormente utilizar:

- Issues;
- Labels;
- Milestones;
- Projects;
- Pull Requests.

Crie, se for simples e seguro, labels básicas:

frontend
backend
database
hardware
devops
documentation
test
bug
enhancement
sprint-1

Não transforme ainda todo o backlog em Issues.

==================================================
30. NÃO DESENVOLVER AINDA
==================================================

É expressamente proibido nesta etapa:

- implementar a mini API;
- escolher/criar banco;
- criar endpoints;
- implementar novas telas;
- alterar regras de negócio;
- criar autenticação;
- implementar sensores;
- implementar câmera;
- implementar GPS;
- implementar biometria;
- criar notificações;
- gerar APK;
- implementar pipeline completo;
- refatorar todo o projeto.

Nossa etapa atual é:

DOCUMENTAÇÃO
+
ORGANIZAÇÃO
+
GIT
+
GITHUB
+
PROCESSO

==================================================
31. VALIDAÇÃO FINAL
==================================================

Ao terminar, execute:

git status

git branch -a

git remote -v

git log --oneline --decorate -5

Confirme também que:

- main existe;
- dev existe;
- main foi enviada;
- dev foi enviada;
- origin está correto;
- working tree está limpa;
- repositório é público;
- nenhum secret foi enviado.

==================================================
32. RELATÓRIO FINAL
==================================================

Ao concluir, apresente:

# Relatório — Configuração inicial Gestor Diário

## GitHub

Nome:
gestor-diario

URL:
[informar URL real]

Visibilidade:
Public

## Git

Branch principal:
main

Branch de desenvolvimento:
dev

Remote:
origin

## Commit inicial

Hash:
[hash]

Mensagem:
[mensagem]

## Estrutura

Mostrar árvore resumida do projeto.

## Documentação criada

Listar arquivos.

## Segurança

Informar resultado da verificação de secrets.

## Git Status

Mostrar resultado resumido.

## Branches

Mostrar resultado.

## Remote

Mostrar resultado.

## Pendências

Informar somente pendências reais.

## Próxima etapa recomendada

NÃO executar.

Apenas registrar:

"Transformar a Entrega 1 do backlog em Issues/User Stories/Tasks e definir a arquitetura da mini API Node.js e do banco de dados."

==================================================
REGRA FINAL
==================================================

Não avance para desenvolvimento.

Ao terminar Git + GitHub + documentação:

PARE.

Não implemente API.

Não implemente banco.

Não implemente novas funcionalidades.

Comece agora pela AUDITORIA DO PROJETO E DO ESTADO ATUAL DO GIT.

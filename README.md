# Gestor Diário

Aplicativo acadêmico Android para organizar e acompanhar tarefas, desenvolvido em React Native e integrado a uma API Node.js com persistência SQLite.

## Status atual — 27/11/2026

- **Sprint 1:** 15/15 Issues concluídas, 100% ([fechamento](docs/sprints/sprint-1.md)).
- **Sprint 2 core:** #39–#42 concluídas, integradas em `dev` e promovidas para
  `main` pelo [PR #55](https://github.com/AlineRaquelC/gestor-diario/pull/55) —
  **4/4 Issues, 37/37 pontos, 100%** ([fechamento e evidências](docs/sprints/sprint-2.md)).
- **Sprint 3:** encerrada em 27/11/2026 com **21/21 pontos**, 100% do
  escopo planejado. Voz (#65), QR estruturado (#66), atalho Android (#67)
  e consolidação documental (#68) foram concluídos e integrados em `dev`.
  [Fechamento e rastreabilidade da Sprint 3](docs/sprints/sprint-3.md)
- **#43:** perfis locais, pendência da Entrega 2. Permanece aberta, com gate
  NO-GO e fora do core da Sprint 3. [Issue #43](https://github.com/AlineRaquelC/gestor-diario/issues/43)

`main` contém a base estável promovida no fechamento do core da Sprint 2.
`dev` contém o incremento da Sprint 3 e as correções de manutenção posteriores
àquele fechamento. Os recortes selecionados da Entrega 2 e da Entrega 3
cobrem parte de cada entrega.

## Funcionalidades atuais

- API Node.js, SQLite, Drizzle ORM e migrations; CRUD de projetos na API.
- Criação, consulta/listagem, detalhes e edição de tarefas integradas.
- Status, conclusão/reabertura e histórico persistido.
- Exclusão com confirmação, soft delete, desfazer em 5s e restore (#10 / PR #31).
- Filtros combináveis e ordenação por prioridade/prazo (#21 / PR #32).
- CI inicial integrado (#13 / PR #34).
- Subtarefas com progresso automático e múltiplas observações independentes da descrição.
- Dashboard com indicadores reais e calendário Dia/Semana/Mês alimentados pelo TaskContext.
- Persistência de dados novos Mobile → API → SQLite; AsyncStorage como cache/apoio local.
- Tratamento de falhas/offline nos fluxos implementados e testes manuais Android registrados.
- Sincronização manual em Configurações → Sincronizar, com projetos antes de tarefas,
  preservação do legado, identidades persistentes e pendências explícitas.

O comportamento offline é parcial: falhas preservam dados e não confirmam envio.
A API é canônica para registros identificados; AsyncStorage conserva cache,
vínculos e snapshots de versões locais. Registros antigos sem projeto identificável
ou dados válidos permanecem locais e pendentes, sem associação por nome. Consulte
[a política e as evidências de sincronização](docs/arquitetura/sincronizacao-manual.md).

Recortes da Sprint 2:

- Lembretes configuráveis e notificações locais Android, conforme a
  [política implementada](docs/sprints/sprint-2-issue-39.md).
- Recorrência diária/semanal/mensal com ocorrências materializadas pelo backend,
  janela até hoje + 31 dias inclusive, sem backfill (#40 / PR #48).
- Busca por título, descrição e observações persistidas, favoritos e filtros salvos
  (#41 / PR #50); etiquetas e drag and drop permanecem fora.
- Metas diária/semanal/mensal por quantidade concluída e relatórios com texto e
  barras simples (#42 / PR #52); sem tempo total de execução.

### Criação de tarefas no Android

| Entrada | Fluxo e evidência |
|---|---|
| Manual | Em **Nova Tarefa**, informe os campos, selecione o Project e confirme em **Criar tarefa**. |
| Voz | **Criar por voz** usa o SpeechRecognizer on-device em pt-BR. Revise ou edite a transcrição e toque em **Interpretar e preencher**. O parser local interpreta título, prazo e prioridade quando inequívocos. [Issue #65](https://github.com/AlineRaquelC/gestor-diario/issues/65) · [PR #76](https://github.com/AlineRaquelC/gestor-diario/pull/76) · [evidências](docs/sprints/sprint-3-issue-65.md#14-validação-física-final--27112026) |
| QR Code | **Escanear QR Code** lê um payload estruturado V1 com CameraX e ZXing. Confirme o uso dos dados e revise o formulário. [Issue #66](https://github.com/AlineRaquelC/gestor-diario/issues/66) · [PR #72](https://github.com/AlineRaquelC/gestor-diario/pull/72) · [evidências](docs/sprints/sprint-3-issue-66.md#validação-física-complementar--27112026) |
| Atalho | Pressione o ícone do app e escolha **Nova tarefa**. O atalho abre o mesmo formulário com o app fechado ou em execução. [Issue #67](https://github.com/AlineRaquelC/gestor-diario/issues/67) · [PR #75](https://github.com/AlineRaquelC/gestor-diario/pull/75) · [evidências](docs/sprints/sprint-3-issue-67.md#validação-física-final--27112026) |

Todos os caminhos usam **Criar tarefa** para confirmar a persistência pelo fluxo
canônico. O reconhecimento e a interpretação foram validados offline no Moto
G23 com modelo pt-BR instalado. A criação remota e a sincronização exigem
comunicação com a API.

Em `dev`, a manutenção pós-Sprint 2 permite ativar recorrência na edição de
uma tarefa avulsa e excluir instâncias recorrentes com escopo explícito.
[Ativação por edição (#58)](docs/maintenance/issue-58-recurrence-edit.md) ·
[Escopos de exclusão (#61)](docs/maintenance/issue-61-recurring-delete-scope.md)

## Tecnologias

React Native 0.87.1 com TypeScript, Hermes, New Architecture e Codegen.
Android usa Kotlin, SpeechRecognizer, CameraX/ZXing e ShortcutManager.
A API usa Node.js, TypeScript, Express, Zod, Drizzle ORM e SQLite.
AsyncStorage mantém o cache mobile. Os testes usam Jest, Vitest/Supertest e
JUnit. GitHub Actions executa os checks Mobile e Backend.

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

## Validação e compatibilidade

A referência funcional de `dev` é o merge do PR #76, com **856 testes Mobile
em 45 suítes**, **479 testes Backend em 17 suítes** e **17 testes dos validadores
de CI**. A verificação local inclui **10 testes JVM em 3 suítes**. Os builds
Android debug e release passaram na validação funcional. Mobile e Backend
passaram no [CI pós-merge #94](https://github.com/AlineRaquelC/gestor-diario/actions/runs/46035538365).
A [matriz da Sprint 3](docs/sprints/sprint-3.md#evidências-e-ci) identifica
CI de PR, pós-merge, emulador e testes no Moto G23/API 34.

| Recurso | Compatibilidade e limite |
|---|---|
| Aplicativo Android | `minSdk 24`, `targetSdk 36`, `compileSdk 37`. |
| Voz | API 31+ com reconhecedor on-device compatível e modelo pt-BR instalado. A prova offline é do Moto G23/API 34. |
| QR V1 | Requer câmera e permissão contextual. RF30 parcial. A rotação física e a reentrada foram validadas. A recriação da Activity ficou sem comprovação. |
| Atalho | API 25+ e launcher compatível. API 24/25 e launchers incompatíveis seguem sem validação em execução. |

Lint e TypeScript passaram sem regressão frente às baselines explícitas.
Permanecem os diagnósticos conhecidos, a exclusão pontual de `App.test.tsx`
no Jest/CI e os alertas de dependências registrados. Login visual, ausência de
sincronização automática e limites do cache continuam documentados.
[Sincronização e legado](docs/arquitetura/sincronizacao-manual.md) ·
[Workflow e baselines](.github/workflows/README.md)

## Como executar

Use Node.js 24.21.0, a versão reproduzida pelo CI, npm, JDK 17 e o toolchain
Android do projeto. Configure o SDK Android no ambiente, com SDK 37, Build Tools
37.0.0 e NDK 27.1.12297006. [Configuração Gradle](android/build.gradle) ·
[Backend e SQLite](backend/README.md)

### API local

A partir da raiz, em um terminal dedicado:

```bash
cd backend
npm ci
npm run db:migrate
npm run dev
```

A API usa a porta 3000 por padrão. Aplique migrations no banco configurado
para o ambiente. Confirme a inicialização com `curl -fsS http://127.0.0.1:3000/health`.

### Emulador Android

Inicie o emulador. Na raiz, instale as dependências e abra o Metro:

```bash
npm ci
npm start
```

Em outro terminal, execute `npm run android`. A configuração versionada
usa `http://10.0.2.2:3000` para chegar ao host a partir do emulador.
Para um APK com bundle embutido que roda sem Metro, execute
`./gradlew assembleRelease` em `android/`. O artefato fica em
`android/app/build/outputs/apk/release/app-release.apk`.
[Integração Android e API](docs/arquitetura/integracao-criacao-tarefas.md#execução-android)

### Dispositivo físico e demonstração via USB

Use uma cópia de trabalho isolada para o APK de demonstração. Via Wi-Fi,
configure o IP privado do notebook em `src/services/api.ts` e como único
host HTTP permitido no XML de rede release
(`android/app/src/release/res/xml/release_network_security_config.xml`).
O aparelho e o notebook precisam ter comunicação na rede de teste.

Como alternativa, com depuração USB autorizada, identifique o serial com
`adb devices -l` e execute os comandos abaixo, substituindo
`SERIAL_DO_APARELHO` pelo serial físico:

```bash
adb -s SERIAL_DO_APARELHO reverse tcp:3000 tcp:3000
adb -s SERIAL_DO_APARELHO reverse --list
```

Para essa cópia USB, use `http://127.0.0.1:3000` como URL da API e
`127.0.0.1` como único host HTTP permitido no XML release. Gere novamente
o APK da cópia e instale com `adb -s SERIAL_DO_APARELHO install CAMINHO_DO_APK`.
Se já houver uma instalação com assinatura compatível, use
`adb -s SERIAL_DO_APARELHO install -r CAMINHO_DO_APK` para preservar os dados. Confirme a resposta da API e a comunicação no próprio app.
Ao terminar, remova o encaminhamento com
`adb -s SERIAL_DO_APARELHO reverse --remove tcp:3000`. Mantenha IPs,
políticas temporárias e APKs de QA fora do Git. [Prova USB e incidente Wi-Fi](docs/sprints/sprint-3-issue-65.md#comunicação-durante-a-validação)

### Checks locais

```bash
npm run test:ci-scripts
npm run lint:ci
npm run typecheck:ci
npm run test:ci
git diff --check
```

No backend, execute a migração com `DATABASE_PATH` apontando para um SQLite
temporário, depois `npm run typecheck`, `npm test` e `npm run build`.
Os testes JVM usam `./gradlew :app:testDebugUnitTest` em `android/`.
[Execução do CI e bancos de teste](.github/workflows/README.md)

## Metodologia e branches

Scrum, backlog, Sprints e Pull Requests. `dev` integra o desenvolvimento; `main` mantém o estado estável. `feature/*`, `fix/*` e `docs/*` isolam os trabalhos. O workflow CI valida Mobile e Backend separadamente; não publica nem gera APK. Documentação segue o mesmo fluxo de PR; promoções de `dev` para `main` são realizadas por PR após revisão e CI.

## Estrutura

```text
src/                 telas, navegação, componentes, Contexts e Services HTTP
backend/             API, services, repositories, schema e migrations
__tests__/           testes mobile
android/ e ios/      projetos nativos
docs/                requisitos, backlog, arquitetura, sprints e decisões
```

## Histórico anterior ao fechamento

Em 21/10/2026, antes do merge de #34, o topo registrava 14/15 = 93,3%,
com #13 aguardando revisão/merge. Esse retrato foi superado pelo fechamento técnico.

## Status histórico em 2026-10-03

O planejamento inicial registrava 4/13 = 30,8%. Após a auditoria/refinamento que formalizou calendário (#20) e filtros (#21), passou a 4/15 = 26,7%; #5 era a próxima Issue. A redução percentual refletia aumento do backlog rastreado, sem perda de trabalho. Esses valores são históricos; não representam o estado atual.

## Documentação

- [Requisitos oficiais](docs/requisitos/requisitos-oficiais.md)
- [Backlog do produto](docs/backlog/backlog-produto.md)
- [Plano de entregas](docs/backlog/entregas.md)
- [Sprint 1 — fechamento histórico](docs/sprints/sprint-1.md)
- [Sprint 2 — core concluído e stretch adiada](docs/sprints/sprint-2.md)
- [Sprint 3 — incremento e rastreabilidade](docs/sprints/sprint-3.md)
- [Issues e PRs da Sprint 1](docs/sprints/sprint-1-issues.md)
- [Arquitetura inicial (histórico)](docs/arquitetura/arquitetura-inicial.md)
- [Decisões](docs/decisoes/README.md)
- [Processo de desenvolvimento](docs/processo/processo-desenvolvimento.md)
- [Auditoria inicial](docs/auditoria-inicial.md)
- [Contribuição](CONTRIBUTING.md)

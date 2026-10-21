# CI — Sprint 1

[Issue #13](https://github.com/AlineRaquelC/gestor-diario/issues/13). Workflow
[ci.yml](ci.yml), com jobs independentes **Mobile** e **Backend**. Os checks
obrigatórios falham com exit diferente de zero; não há continue-on-error.

Aciona em pull_request para dev/main, push em dev/main e workflow_dispatch.
Execuções antigas da mesma ref são canceladas. Permissão somente contents: read;
checkout sem persistir credenciais. Sem secrets customizados ou permissões de escrita.
Cada job tem timeout de 15 minutos, runner ubuntu-latest e cache npm por lockfile.
Não se cacheiam node_modules nem SQLite; não há Gradle, emulador ou geração de APK.

Node **24.21.0** nos dois jobs: versão exata validada localmente, compatível com
Node >=22.11.0 da raiz, React Native travado (^22.13 / ^24.3 / >=26) e Node >=24 <25
do backend. Instalações usam somente npm ci e os dois lockfiles existentes.
Actions verificadas nas releases oficiais: [checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1)
e [setup-node v7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0).

| Job | Etapas após checkout/setup-node |
|---|---|
| Mobile | npm ci → test:ci-scripts → lint:ci → typecheck:ci → test:ci |
| Backend | npm ci em backend/ → db:migrate → typecheck → test → build |

## Mobile e baselines

- `npm run lint:ci`: ESLint real em todo o repositório, incluindo fontes/testes
  backend e scripts CI. A configuração CI herda a original e habilita sintaxe
  moderna Node apenas nos arquivos .mjs/.cjs. A baseline registra **3 erros
  preexistentes e 10 warnings** por arquivo/regra/severidade/mensagem/ocorrências.
  Warning novo, erro novo ou repetição adicional falha, mesmo com total igual.
- `npm run typecheck:ci`: executa tsc --noEmit --pretty false com a configuração
  mobile que herda a raiz. Apenas backend é separado, pois tem typecheck estrito
  no outro job. Mantém descoberta de .ts/.tsx da raiz; tipos Node explícitos dão
  suporte ao ambiente Jest, sem depender de imports do backend. Baseline: **11
  diagnósticos / 9 identidades**, preservando arquivo, código TS e mensagem completa.
- Posições de linha/coluna são ignoradas. Whitespace e ordem de literais adjacentes
  de união são normalizados; nenhum membro ou conteúdo de mensagem é removido.
- As baselines são [typescript-baseline.json](../ci/typescript-baseline.json) e
  [eslint-baseline.json](../ci/eslint-baseline.json). Não usam wildcard. Reduções
  passam; atualizações exigem revisão. Ao corrigir uma dívida, remova/reduza sua
  entrada para impedir que retorne. CI nunca regrava ou amplia a baseline.
- `npm run test:ci-scripts`: testes dos próprios validadores, incluindo execução
  real de TypeScript/ESLint em fixtures temporárias. Comprovam que quantidade
  igual não esconde diagnóstico trocado, ocorrências extras ou falhas da ferramenta.
- `npm run test:ci`: usa o preset original e a descoberta normal do Jest. Executa
  todas as suítes mobile válidas, incluindo novos testes futuros. Exclui somente
  backend/ (Vitest, executado no job próprio), node_modules (padrão) e o caminho
  exato **__tests__/App.test.tsx**. Este último tem dívida de importação ESM de
  dependências não transformadas pelo Jest; a auditoria atual falha em AsyncStorage,
  e os registros anteriores também apontam React Navigation. Não exclui features
  nem outras suítes de integração. O comando global npm test permanece disponível,
  com sua falha histórica documentada.

Check verde significa **nenhuma regressão frente à dívida explícita**, e não
TypeScript/lint globais sem dívida. Erro de execução, configuração inválida,
saída desconhecida, novo diagnóstico ou teste falhando torna o job vermelho.

## Backend

Todos os comandos são estritos. Na etapa Migrate database, DATABASE_PATH aponta para
`${{ runner.temp }}/gestor-diario-ci/backend.db`, criado pela conexão/migrations;
TASK_TIMEZONE=America/Sao_Paulo. Não utiliza banco versionado nem .env pessoal.
Os testes mantêm seus bancos isolados. Build gera dist/ apenas no runner.

## Reproduzir e interpretar

```bash
npm ci
npm run test:ci-scripts
npm run lint:ci
npm run typecheck:ci
npm run test:ci
cd backend
npm ci
DATABASE_PATH=/tmp/gestor-diario-ci/backend.db TASK_TIMEZONE=America/Sao_Paulo npm run db:migrate
npm run typecheck
npm test
npm run build
```

Abra o check vermelho no PR e leia a etapa com falha. Baselines mostram a identidade
nova e a quantidade excedente; falhas de ferramenta nunca viram sucesso. Não remova
checks, amplie exclusões ou adicione dívida à baseline apenas para obter verde.
O workflow não altera proteção de branches nem faz merge/publicação.

Auditoria, identidades da dívida e resultados: [CI inicial](../../docs/arquitetura/ci-inicial.md).

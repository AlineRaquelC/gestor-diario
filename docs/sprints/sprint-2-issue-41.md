# Refinamento técnico curto — Issue #41

## Estado e recorte — 07/11/2026

Base auditada: `dev` limpa/atualizada em `3fa5970`; #39 e #40 CLOSED/completed,
integradas pelos PRs #46/#48. [CI de dev aprovada](https://github.com/AlineRaquelC/gestor-diario/actions/runs/42404995166).
[#41](https://github.com/AlineRaquelC/gestor-diario/issues/41) OPEN, **Planning Poker 8**,
T01–T04 implementados. **T05 Android manual aprovada em 07/11/2026 pela usuária**,
com regressão/builds já aprovados. Onze cenários funcionais registrados abaixo;
homônimos permanecem cobertos automaticamente por projectId, sem massa artificial.
O refinamento original está preservado abaixo; o registro de execução ao final
descreve o estado atual. [PR #50](https://github.com/AlineRaquelC/gestor-diario/pull/50)
OPEN para dev, aguardando revisão/merge. Issue permanece OPEN até integração,
sem merge automático.
Prazo máximo de commit/push: **08/11/2026**. #42 não iniciada; sem `dev → main`.
Fontes: Issue #41, [Sprint 2](sprint-2.md), [Entrega 2/PBI-14](../backlog/entregas.md#42-escopo-funcional)
e [RF13/RF49/RF51 oficiais](../requisitos/requisitos-oficiais.md#rf13--página-3).

Entregar busca em título/descrição/observações persistidas, favoritos por Task e
salvar/nomear/aplicar/excluir combinações dos filtros existentes. RF13 terá título,
descrição e observações atendidos; **etiquetas continuam fora**. RF14/drag and drop,
busca avançada/natural, novos filtros e PBI-14 completo não são entregues.

## Auditoria que determina as decisões

| Área real | Estado encontrado / consequência |
|---|---|
| `src/screens/HomeScreen.tsx` | Sem busca/favoritas; usa `sortTasks(filterTasks(...))`. Métricas do dashboard são independentes da lista. TaskCard funcional é interno à Home; `src/components/TaskCard.tsx` está vazio. Alterar o card usado, sem extração obrigatória/redesenho. |
| `src/utils/taskFilters.ts` e `TaskListControls.tsx` | TaskFilters = status, priority, projectId, period. TaskSorting está no mesmo utilitário e permanece separado. projectId aceita null (todos), string vazia (legado sem projeto) e ID; filterTasks resolve project.id ou remoteId e, sem projeto disponível, compara o ID exato. |
| `backend/drizzle/0000_legal_the_captain.sql` / schema/tasks | favorite já existe: integer/boolean, default false, CHECK 0/1; coluna permite null. **Sem migration nova.** Normalizar null histórico como false na saída, sem reescrever dados. |
| Backend Tasks repository/service/schema | Repository seleciona/spread da Task, incluindo favorite; atualização genérica suporta campos tipados. `updateTaskSchema` estrito ainda **não aceita favorite**; create define false. API já expõe o campo. History usa UPDATED com metadata.fields. |
| TaskContext / taskService / syncService | ApiTask declara favorite:boolean, mas Task/fromApiTask/toApiTaskUpdate/taskFields ainda o ignoram. Cache `@taskflow:tasks` e merges canônicos devem passar a preservá-lo; ausência em cache antigo significa false, sem PATCH automático. |
| Notes / noteService | Notes são tabela/CRUD separados; Context mantém Notes confirmadas por Task, fora do cache persistido de Tasks. Ler Notes por Task durante busca causaria N+1 e cobertura parcial. Mutação de Note atualiza updatedAt da Task. |

## Busca e contrato escolhido

**GET `/tasks/search?q=<texto>` → 200 `ApiTask[]` canônicas**, sem Notes no payload,
um resultado por Task; rota literal registrada antes de `/:id`. q deve ser string
escalar; array/objeto inválido → 400 no padrão atual. Trim; omitido/vazio retorna
Tasks ativas como GET /tasks. No mobile, vazio não faz requisição: remove somente
a restrição textual. Nenhum GET gera ocorrências ou modifica dados.

Uma consulta parametrizada combina title, description (null como vazio) e
**EXISTS em notes por notes.taskId = tasks.id**; sempre tasks.deletedAt IS NULL.
Notes de Tasks excluídas não participam. Reutilizar montagem canônica e consultas
em lote de subtarefas/reminders do repository; não chamar findById/GET Notes por
resultado. EXISTS evita duplicatas quando várias Notes correspondem. Sem FTS,
ranking, dependência ou migration; adotar varredura simples e verificar custo
com o volume real nos testes de T01.

Normalização mínima compartilhada: `trim().toLowerCase()` e substring literal,
sem remover acentos (AÇÃO corresponde a ação; acao não precisa corresponder).
A auditoria em SQLite :memory: confirmou que LOWER nativo transforma AÇÃO em
`aÇÃo`; sozinho não atende essa comparação. Registrar função determinística
simples de comparação (retorno 0/1) no `openDatabase`, com normalização JavaScript e includes,
usada no predicado SQL/EXISTS com parâmetros. `%`/`_` são caracteres literais;
não montar SQL com o texto. Fallback local reutiliza a mesma normalização.

Serviço mobile mapeia ApiTask[] por fromApiTask; resultado mantém IDs para limitar
a lista. Context mescla apenas Tasks retornadas, preservando revisões mais novas,
exclusões locais e filhos; **nunca substitui a coleção/cache inteiro pelo subconjunto**
nem reconcilia o scheduler com snapshot parcial. A Task encontrada por Note abre
Detalhes por Task ID. Atualizar busca ao retornar à Home e após mutação confirmada
de Task/Note ou sync; não criar ciclo de novas consultas pelo próprio merge.

**Debounce 300 ms**, com sequência da intenção incrementada imediatamente a cada
mudança de texto, limpeza, saída da tela ou invalidação. Antes de publicar resultado,
erro ou merge, conferir sequência/query/revisão; resposta de “mar” não substitui
“marketing”. Não exigir cancelamento HTTP para garantir correção; apiRequest já
tem timeout. Queries iguais após trim podem reutilizar o estado confirmado.

Ordem: Tasks permitidas pela busca ∩ Favoritas (quando ativo) → **filterTasks()**
com TaskFilters atuais → **sortTasks()** atual. Não duplicar filtros/ordenação;
sem alterar métricas nem agrupamento padrão de pendentes/concluídas da Home.

Estados: vazio, digitando/debounce, carregando, resultados, nenhum resultado e
falha. Na nova query, não apresentar resultado antigo como confirmado para ela.
Erro nunca limpa Tasks/cache nem é apresentado como “nenhuma tarefa encontrada”.
Sem API, permitir fallback explícito em título/descrição das Tasks carregadas:
“Busca local em título e descrição. Observações indisponíveis sem conexão.”
Não usar Notes parciais para prometer busca offline completa; sem fila offline
complexa. Se fallback não encontrar, indicar “Nenhuma tarefa local encontrada”,
com aviso de cobertura limitada e ação Tentar novamente.

## Favoritos

Reutilizar **PATCH `/tasks/:id` `{favorite: boolean}` → ApiTask**. Estender somente
o schema de update, tipagem/mapping/payload e fingerprint de sync. `false` também
precisa ser serializado; rejeitar tipo inválido. Reutilizar History **UPDATED**,
metadata.fields contendo favorite, sem action novo; operação sem mudança não
gera evento extra. Não alterar create/template de RecurrenceSeries: favoritar
uma ocorrência muda apenas essa Task; novas ocorrências continuam não favoritas.

UI chama updateTask do Context e aguarda confirmação; bloquear repetição por Task.
API falhou: preservar estrela anterior e informar erro. API confirmou/cache falhou:
mostrar estrela confirmada e aviso de cache, sem repetir PATCH. getTasks, detalhe,
restore, respostas de filhos, reabertura e sync devem manter favorite canônico;
cache antigo sem campo → false. Task apenas local sem identidade confirmada:
explicar necessidade de sincronizar antes de favoritar, sem associar por nome.

Chip **Favoritas** na Home, selected e título de seção dedicado, restringe a mesma
lista e combina com busca/filtros; não integra TaskFilters nem filtros salvos.
Estrela funcional monocromática (não emoji) no TaskCard interno, selecionada/não
selecionada, label “Favoritar/Remover dos favoritos: <título>”, alvo ≥44 dp,
stopPropagation para não abrir Detalhes. Não exigir mudança adicional em Details.

## Filtros salvos, identidade e persistência

`SavedTaskFilter = {id, name, filters: TaskFilters, createdAt, updatedAt}`.
**Somente TaskFilters**: não salvar query, TaskSorting ou chip Favoritas. ID local
opaco gerado uma vez, independente do nome, seguindo o padrão local existente
(timestamp + aleatoriedade, verificar colisão); sem dependência nova. Nome com
trim, obrigatório; nomes iguais permitidos, registros distintos por ID.

AsyncStorage **`@taskflow:saved-task-filters:v1`**, envelope `{version:1, items:[]}`,
serviço/hook dedicado. Preferência local, fora do sync/backup de Tasks; sem tabela
ou endpoint. Validar versão, enums, IDs/timestamps e snapshot; não gravar antes da
hidratação nem sobrescrever conteúdo inválido silenciosamente. Serializar escritas;
confirmar salvar/excluir somente após persistência; falha mantém estado anterior.

Salvar snapshot dos filtros aplicados; desabilitar **Salvar filtro** se
activeFilterCount = 0. Períodos today/week/month continuam relativos ao momento de
aplicação, não viram datas fixas. Aplicar substitui TaskFilters por uma cópia do
snapshot, mantendo query, sorting e Favoritas. Excluir remove apenas o registro;
não altera Tasks/Projects nem filtros ativos, mesmo se aquele snapshot foi aplicado.

projectId armazena o ID selecionado, nunca nome. Preservar IDs locais/remotos e
os significados null/''; resolver rótulo/seleção por project.id **ou remoteId**
(o seletor atual só procura seu options.id). Homônimos não se fundem. Referência
não resolvida: mostrar “Projeto indisponível”, permitir aplicar o ID exato/excluir;
nunca substituir por nome ou por Todos. Tasks com esse mesmo ID ainda podem ser
filtradas; nenhuma correspondência produz vazio explícito.

## UX, testes e execução

Home: campo **Buscar tarefas**, chip **Favoritas**, controles atuais **Filtrar /
Ordenar** e acesso compacto **Filtros salvos** (modal com nome, Salvar, Aplicar,
Excluir). Manter polimento/BottomNavigation. Limpar filtros/ordenação preserva seu
comportamento atual; query e Favoritas têm ações próprias, sem resets implícitos.

| Bloco | Entrega e testes planejados |
|---|---|
| T01 — Busca backend + mobile | Título, descrição, Note real, trim, substring, caixa/acentos, literais %/_, q inválido/vazio, sem resultado, Tasks excluídas, sem N+1/duplicação; debounce, resposta/erro antigo ignorado, cache preservado, falha/fallback e invalidação após Notes. |
| T02 — Favoritos end-to-end | false→true→false, UPDATED, repetição sem evento, erro API/cache, reabertura/sync/merges, somente uma ocorrência da série; fixtures antigas normalizadas sem upload. |
| T03 — Filtros salvos locais | Criar/nomear/persistir/reabrir/aplicar/excluir; ID estável, nomes iguais, storage inválido/falha, hidratação, snapshot copiado, filtro vazio, período relativo, IDs local/remoto, homônimos e projeto indisponível; query/sorting/Favoritas intactos. |
| T04 — Home integrada | Busca + cada status/prioridade/projeto/período, sortTasks preservado, chip Favoritas, controles salvos/estrela acessíveis, navegação para Task correta, nenhum resultado distinto de erro; dashboard/calendário/#39/#40 preservados. |
| T05 — Regressão, Android e fechamento | Validadores/lint/typecheck/test mobile, backend typecheck/test/build, debug/release, diff check e CI sem ampliar baselines. Android: título, descrição, Note real, busca+filtro, favorito, reabrir, Favoritas, salvar/aplicar/excluir filtro e homônimos se massa segura. Não limpar dados em lote; PR final só após aceite. |

Camadas reais prováveis (nomes novos são proposta):

- **[BACK]** database/index.ts; schemas/tasks.ts, routes/tasks.ts, controllers/tasks.ts,
  services/tasks.ts, repositories/tasks.ts; reutilizar schema/notes.ts e Notes existentes.
- **[MOBILE]** context/TaskContext.tsx, services/taskService.ts, services/syncService.ts;
  novo hook de busca; preservar services/noteService.ts e semântica de Notes.
- **[UI]** screens/HomeScreen.tsx (inclui TaskCard), components/TaskListControls.tsx;
  modal compacto novo para filtros salvos; utils/taskFilters.ts reutilizado.
- **[PERSISTÊNCIA LOCAL]** novos models/savedTaskFilter.ts e services/savedTaskFilterService.ts;
  normalização de favorite no cache vigente de Tasks, sem migration SQL.
- **[TEST]** backend/tests/tasks.test.ts, task-history.test.ts, notes.test.ts e busca;
  __tests__/TaskFilters.integration.test.tsx, DashboardHome.integration.test.tsx,
  TaskContext.integration.test.tsx, taskService/taskUpdateService/syncService e testes dos novos hooks/serviço local.
- **[DOC]** este registro e sprint-2.md; resultado Android/DoD somente após execução.

**8 pontos continuam defensáveis** pelo reuso do schema, filtros, History e cache;
busca em Notes, concorrência, estado canônico e testes são o trabalho principal.
O prazo 08/11 é risco de capacidade, não motivo para omitir Notes ou validação.
Observar custo da varredura/volume e falhas de rede/storage, sem introduzir FTS,
sync de preferências ou arquitetura offline agora. Nenhuma alteração de estimativa
ou da Issue remota, migration, dependência, Task/Issue adicional ou código funcional
foi feita neste refinamento. Revisar este documento antes de autorizar T01–T05.


## Execução T01–T03 — 07/11/2026

Base `dev` atualizada e limpa em `68300bc` (PR documental #49), branch
`feature/41-search-favorites-filters`. Somente T01–T03 autorizados; **T04 e T05
não concluídos nem iniciados como etapas finais**. Controles mínimos na Home
foram incluídos para provar os fluxos, sem redesenho. #41 continua OPEN,
Planning Poker 8; #42 não iniciada; sem dev → main ou PR final.

### T01 — busca textual end-to-end

GET `/tasks/search?q=...` registrado antes de /:id. Query string escalar com trim;
array/objeto/parâmetro desconhecido rejeitado como 400. Vazia/ausente retorna a
lista normal ativa; o serviço mobile não chama search se vazia. Predicado SQL
parametrizado inclui título, descrição e EXISTS em Notes reais; exclui Tasks
soft-deleted, incluindo matches só em suas Notes. Resultados canônicos completos,
sem duplicar Task por múltiplas Notes ou match em mais de um campo; montagem de
subtarefas/reminders em lote, sem N+1. Função SQLite task_contains usa o helper
compartilhado JavaScript, substring literal e lowercase Unicode, preservando acentos.
Sem FTS, migration ou dependência nova; custo de varredura permanece limite conhecido.

Mobile usa fromApiTask, debounce 300 ms e tokens de intenção/revisão para ignorar
resposta/erro antigo antes de publicar resultados ou fazer merge. Query vazia
retorna imediatamente às Tasks do Context. Busca parcial não substitui a coleção
inteira/cache nem dispara materialização/reconciliação de scheduler. Atualização
após mutações confirmadas de Task/Note, sync e retorno/foco/foreground; sair da
Home invalida debounce. Composição: resultado permitido pela busca ∩ Favoritas →
filterTasks → sortTasks, preservando dashboard, agrupamento e navegação por Task ID.
Erro mantém Tasks/cache e exibe fallback claramente limitado a título/descrição;
Notes não são anunciadas como pesquisadas offline. Etiquetas continuam fora de RF13.

### T02 — favoritos end-to-end

Coluna existente reutilizada, PATCH aceita apenas boolean real, resposta normaliza
null legado como false. History usa UPDATED/fields favorite somente se mudou;
patch repetido sem alteração não gera novo evento. Task.favorite mapeado nas
leituras/payloads, cache antigo normalizado false e fingerprint/merge de sync
preservando o valor canônico. toggleFavorite no Context espera PATCH antes de
confirmar, com bloqueio por Task. API falhou: estado anterior; API confirmou/cache
falhou: estado confirmado com aviso, sem repetir. Task somente local exige sync.

Estrela funcional/acessível no card interno da Home, alvo 44 dp, selected/busy e
stopPropagation; chip Favoritas dedicado compõe busca/filtros. Não foi necessário
alterar Details. Favoritar ocorrência altera somente aquela Task, sem série/vizinhas.

### T03 — filtros salvos locais

SavedTaskFilter contém id opaco estável, name com trim obrigatório e limite 80,
filters copiado com somente status/priority/projectId/period, createdAt e updatedAt.
Nomes iguais são permitidos; query/sorting/Favoritas não entram no snapshot.
AsyncStorage @taskflow:saved-task-filters:v1 com versão, validação de registros,
IDs/enums/timestamps e escritas serializadas. JSON inválido não é sobrescrito;
falha de gravação não anuncia sucesso nem remove configurações anteriores.

Modal compacto na Home: salvar atual (bloqueado sem critério), listar, aplicar,
excluir e erro de storage. Aplicar troca só TaskFilters, sem alterar query/sorting/
Favoritas. Excluir remove só o registro, preservando filtro ativo e Tasks/Projects.
Project ID é mantido, incluindo semântica null/legado vazio e aliases local/remoto;
rótulos/seleção reconhecem ambos. Homônimos não são fundidos; indisponível permanece
com ID exato e aviso. Preferências locais, sem endpoint/tabela/sync de filtros.

### Evidências desta etapa

| Verificação | Resultado |
|---|---|
| npm run test:ci-scripts | 16 aprovados |
| npm run lint:ci | Sem regressão; 3 erros/7 warnings conhecidos, 10 diagnósticos / baseline 13 |
| npm run typecheck:ci | Sem regressão; 11 diagnósticos conhecidos / baseline 11 |
| npm run test:ci | 643 testes / 34 suítes aprovadas (39 novos testes sobre 604) |
| Backend npm run typecheck / npm test / npm run build | Aprovados; 456 testes / 17 suítes (21 novos sobre 435) |
| git diff --check | Aprovado |
| Android debug/release e aceite manual | Adiados para T05; nenhuma alteração nativa |

Novos testes cobrem busca por campos/Notes, caixa/acentos/literais/trim, queries
inválidas/vazias, homônimos/tombstones/duplicação; debounce/concorrência/retorno,
merge parcial sem scheduler, Note invalidando resultados, fallback/cache;
favorito/PATCH/History/isolamento/reabertura/sync/API/cache/busy; filtro salvo,
identidade/nomes iguais/snapshot/JSON/storage/projetos e aplicação/exclusão sem
alterar query/sorting/Favoritas. Fixtures antigas explicitam favorite false; o teste
que rejeitava favorite no PATCH foi atualizado para rejeitar tipo não booleano.

A CI será executada na própria branch por workflow_dispatch após o push, sem abrir
PR final. A aprovação destes checks não equivale à validação Android/T05 ou ao
polimento T04. Pendências: revisão/ajustes finais de UX em T04, regressão/Android,
documentação final e PR em T05, somente após nova autorização.


## T04 — integração e polimento final (07/11/2026)

Home preserva dashboard, Projetos Ativos e navegação. A área de tarefas agrupa
campo de busca, chips Favoritas/Filtros salvos e controles Filtrar/Ordenar em um
painel compacto, com quebra de linha e alvos de toque de pelo menos 44 dp.
Busca tem foco destacado, teclado adequado, placeholder e Limpar busca; limpar
restaura imediatamente as Tasks normais sem alterar filtros/sorting/Favoritas.
ScrollView mantém ações tocáveis com teclado aberto e permite dispensá-lo ao rolar.

Durante debounce/requisição, a lista anterior permanece visível com “Atualizando
resultados…”, sem ser anunciada como resposta confirmada da nova consulta. Tokens
continuam ignorando respostas/erros antigos. Falha mantém Context/cache; fallback
local limita-se a título/descrição. Se a mesma query já teve resposta confirmada,
inclusive por Note, esses resultados são preservados com aviso explícito. Uma
query diferente que falha não herda os resultados da anterior como correspondências.

Favoritas é acesso visível, com selected claro; estrela preenchida/vazia fica à
direita do card e tem spinner/busy por Task. Toque na estrela interrompe propagação;
card continua abrindo o ID correto. API falhou preserva estado; cache falhou após
confirmação não exige reenviar. Uma ocorrência favorita não altera série/vizinhas.

Modal de filtros salvos tem cabeçalho/fechar, resumo dos critérios atuais e de cada
snapshot, nome com trim/limite 80, ações Aplicar/Excluir separadas e estados de
carregamento/erro. Sem critérios, Salvar filtro atual permanece indisponível.
Somente status/priority/projectId/period persistem; aplicar/excluir não modifica
query/sorting/Favoritas nem Tasks/Projects. Projetos homônimos continuam por ID;
referência indisponível não troca por nome e pode ser aplicada/excluída com aviso.
Nomes iguais continuam permitidos e distinguíveis por IDs estáveis.

Seis testes integrados adicionais cobrem limpar preservando preferências,
retenção de resultados confirmados inclusive por Note durante atualização/falha,
favorito sem navegação acidental e busca combinada simultaneamente com status,
prioridade, projeto, período, sorting e Favoritas; Task somente local pesquisável
por título/descrição com aviso, sem inventar correspondência de Notes; cache com
ID canônico sem remoteId não é confundido com legado local.

## T05 — regressão e Android manual aprovados (07/11/2026)

### Verificações executadas

| Verificação | Resultado final |
|---|---|
| npm run test:ci-scripts | 16 aprovados |
| npm run lint:ci | Sem regressão: 3 erros/7 warnings conhecidos, 10 diagnósticos / baseline 13 |
| npm run typecheck:ci | Sem regressão: 11 diagnósticos conhecidos / baseline 11 |
| npm run test:ci | **649 testes / 34 suítes aprovadas** |
| Backend npm run typecheck | Aprovado |
| Backend npm test | **456 testes / 17 suítes aprovadas** |
| Backend npm run build | Aprovado |
| Android assembleDebug / assembleRelease | Aprovados, Hermes/New Architecture habilitados e tarefas Codegen verificadas |
| git diff --check | Aprovado |

A suíte mobile cobre criação, edição, Details, calendário, projetos, recorrência,
reminders, sync, filtros/ordenação, conclusão e delete/undo. Baselines, migrations,
dependências e workflows não foram ampliados/alterados. Regressão automatizada
não substitui o aceite manual: a aprovação Android abaixo foi informada pela
usuária em 07/11/2026. CI Mobile/Backend do head anterior confirmada; a CI do novo
commit exclusivamente documental será conferida no PR #50 após o push.

### Ambiente Android e preservação

Pixel_7 existente, emulator-5554, boot concluído. API /health e Metro /status
respondem; endpoint real /tasks/search responde 200. APK debug atualizado por
`adb install -r`, sem uninstall, pm clear, limpeza de AsyncStorage ou userdata.
Porta Metro 8081 encaminhada por adb reverse. App abre; Home e painel de tarefas
renderizam no aparelho. Cópias preventivas do SQLite e dos dados privados do app
ficam em /tmp, fora do Git, junto das capturas/hierarquias usadas no smoke visual.

Na preparação anterior à validação manual, após instalação, a comparação de
todas as linhas por ID com o backup confirmou
preservação de **18 Projects, 151 Tasks, 5 Notes, 22 Subtasks e 34 Reminders**;
foreign_key_check vazio. Há dois grupos de projetos homônimos no banco vigente;
não foi criada massa nova nem feita exclusão em lote. Busca e abertura de controles
no smoke são ações de leitura; nenhuma estrela ou configuração salva foi alterada
para aparentar aprovação dos testes de persistência.

### T05 Android manual aprovada em 07/11/2026

**Fonte do aceite:** validação executada e concluída pela usuária, conforme
resultados informados nesta sessão. Este registro não apresenta automação ou
smoke do agente como substitutos da execução manual.

| Cenário | Resultado manual informado | Estado |
|---|---|---|
| 1 — Busca por título | Task encontrada por trecho do título. | Aprovado |
| 2 — Busca por descrição | Task encontrada por termo da descrição. | Aprovado |
| 3 — Busca por observação | Task encontrada por termo de Note real persistida. | Aprovado |
| 4 — Busca + filtro | Combinação da busca com filtro existente validada. | Aprovado |
| 5 — Favoritar/desfavoritar | Marcação e remoção de favorito validadas. | Aprovado |
| 6 — Acesso Favoritas | Acesso rápido às Tasks favoritas validado. | Aprovado |
| 7 — Persistência de favorito | Favorito mantido após fechar/reabrir o app. | Aprovado |
| 8 — Criar filtro salvo | Combinação de TaskFilters nomeada e salva. | Aprovado |
| 9 — Aplicar filtro salvo | Snapshot salvo aplicado posteriormente. | Aprovado |
| 10 — Persistência de filtro salvo | Configuração mantida após reabrir o app. | Aprovado |
| 11 — Excluir filtro salvo | Configuração salva excluída. | Aprovado |

**Projetos homônimos:** o cenário manual específico não foi reproduzido com massa
artificial. A cobertura permanece automatizada por projectId estável, preservando
IDs locais/remotos e distinguindo projetos de mesmo nome. Não foram criados
projetos fictícios apenas para esse teste final; não registrar esse cenário como
aprovação manual que não ocorreu.

**Descrição não é Note:** Nova Tarefa possui o campo Description/Descrição.
Notes/Observações persistidas são entidades separadas, adicionadas após a criação
na tela de Detalhes. Busca em descrição e em observação real foram aprovadas
separadamente. O fluxo não foi alterado nesta Issue. O placeholder atual da
descrição ainda diz “Adicione detalhes, contexto ou observações...”; ajustar essa
redação pode ser melhoria futura de UX, sem implementação ou nova feature agora.

T05 concluída no recorte validado. A Issue #41 continua OPEN, aguardando revisão
e merge do PR #50 em dev. Este fechamento documental da validação não autoriza
merge, início da #42 ou promoção dev → main.

### Escopo e encaminhamento

RF13 parcial: **título, descrição e observações atendidos; etiquetas não
implementadas**. RF49 com preferências locais em AsyncStorage; RF51 com favorito
por Task, sem favorito de série. Busca literal sem ranking/fuzzy ou remoção de
acentos; Notes dependem do backend, com resultados anteriores identificados quando
retidos. No smoke visual, foi identificado legado somente local, visível na Home
mas ausente no backend. Tasks reconhecidamente locais (sem remoteId, vínculo de série ou ID canônico UUID)
também podem corresponder por título/descrição, com aviso explícito; não se inventa busca em Notes nem se muda vínculo
ou faz upload automático. Tasks canônicas continuam restritas à resposta da API.
SavedFilters não sincronizam, não incluem query/sorting/Favoritas e não
são modelos de Task. PBI-14 inteiro e RF14/drag and drop não estão concluídos.

PR #50 OPEN: feature/41-search-favorites-filters → dev, com Closes #41 e
T05 Android manual aprovada em 07/11/2026 registrada na descrição. Não fechar #41 antes do merge, habilitar
merge automático, remover a branch, iniciar #42 ou promover dev → main.
Prazo máximo de commit/push mantido em 08/11/2026.

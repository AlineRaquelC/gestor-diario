# Issue #43 — refinamento técnico e gate de segurança

08/11/2026 · [#43](https://github.com/AlineRaquelC/gestor-diario/issues/43) OPEN ·
PBI-19 / RF33–RF34 parciais · Planning Poker **13** · stretch não iniciado.
**Decisão: NO-GO para implementação no restante de 08/11/2026.** O isolamento
exige mudanças coordenadas em banco/API, sync, Contexts e scheduler, além de
migração/bootstrap e regressão Android. Não expor alternância parcial.

Base auditada: `dev` limpa em `2d23931fbeb811bce0e52c2cf90d1c369b6f2aa4`;
#39/#40/#41/#42 CLOSED/completed: core **4/4, 37/37 pontos (100%)**.
[CI pós-merge #52 Mobile/Backend aprovada](https://github.com/AlineRaquelC/gestor-diario/actions/runs/42483127495).
Prazo máximo de commit/push: **08/11/2026**, sem extensão presumida.
Esta auditoria não modifica dados, aplicação, schema, migrations ou configuração.

## Evidências da implementação atual

| Fonte real | Fronteira encontrada |
|---|---|
| `App.tsx`, `src/context/TaskContext.tsx`, `ProjectContext.tsx` | Providers únicos ao redor da navegação; caches `@taskflow:tasks` e `@taskflow:projects`, hidratação independente, sem profileId. Tasks guarda também Notes, History, undo, refs e operações em curso. |
| `src/services/api.ts`, `taskService.ts`, `projectService.ts` | URL única e requisições sem escopo de perfil; listagens, detalhes por ID, PATCH/DELETE/restore/history e criação não carregam proprietário. |
| `backend/src/database/schema/{projects,tasks,recurrence-series}.ts` | Raízes globais, IDs/clientIds e vínculos por projeto/série, sem perfil. SQLite único (`backend/src/database/config.ts`). |
| `backend/src/repositories/tasks.ts`, `projects.ts` | Listas e acesso por ID filtram exclusão quando aplicável, não perfil. Busca usa título/descrição e EXISTS em Notes reais, igualmente global. |
| `backend/src/services/{notes,subtasks}.ts`, respectivas rotas | Filho validado com taskId e existência da Task; isso impede trocar o pai do filho, mas não valida proprietário/perfil. History segue Task ID. |
| `src/services/syncService.ts`, `TaskContext.synchronizeManually` | Materializa globalmente, baixa projetos e Tasks (inclusive tombstones), importa pendências, usa ledger global `@taskflow:sync-ledger`, persiste/publica Contexts e reconcilia scheduler como snapshot completo. Não recebe perfil. |
| `src/services/recurrenceService.ts`, backend `services/recurrence-series.ts` | Promise de materialização compartilhada no mobile; materializeAll percorre todas as séries, template aponta a projectId. Não há escopo para impedir criação cruzada. |
| `src/services/reminderScheduler.ts`, Android `TaskReminderStore.kt` | Journal global `@taskflow:reminder-journal:v1`, IDs por task/reminder; prefs nativas `task_reminders`, recuperação em boot/package update, sem perfil. |
| `savedTaskFilterService.ts`, `productivityGoalsService.ts` | Chaves globais versionadas; filtros guardam projectId estável, metas são locais, mas nenhuma preferência tem namespace por perfil. |
| `SettingsScreen.tsx`, `LoginScreen.tsx`, `AppNavigator.tsx` | Configurações tem sync/metas; Login é placeholder, Entrar navega para Home. Não há cadastro, sessão nem rota de perfil. |

## Comparação das alternativas

| Arquitetura | Segurança/compatibilidade | Migration e API | Sync e esforço/risco |
|---|---|---|---|
| A — namespace só em AsyncStorage | **Insuficiente**: cache separado não impede download global, busca ou mutação por ID de outro perfil. Não preserva isolamento após sync. | Sem migration; API atual continua global. | Mudança local pequena, mas risco crítico. Rejeitada como solução. |
| B — proprietário persistido em raízes | **Direção recomendada para próximo refinamento**: perfil conhecido no servidor, IDs estáveis, Tasks/Projects/séries do mesmo proprietário; filhos derivados do pai. Preserva identidades existentes via bootstrap explícito. | Migration nova aditiva/possível reconstrução SQLite para constraints compostas; profiles e profileId nas três raízes, DTO/rotas/repos/services revisados. | Sync e todas as leituras/mutações com escopo; caches/preferências e transição coordenados. Impacto amplo e alto risco de regressão hoje. |
| C — armazenamento completamente separado por perfil | Seguro somente se **inclui banco/backend**, não apenas storage mobile. DB legado permanece Principal; novos bancos vazios. | Seleção de DB por registro validado, nunca caminho livre enviado pelo cliente; lifecycle/pool/migrations por DB e adaptação API. | Ledger/cache/scheduler também separados/coordenados. Reestruturação operacional grande; não é atalho para hoje. |
| D — sandbox de aplicativo Android distinto por perfil | Isolamento pelo sistema pode existir em instalações/usuários separados, mas não entrega criação/alternância interna exigida na #43. | Exige provisionamento e backend separado/escopado; sem reaproveitamento simples da UI atual. | Não atende ao recorte no mesmo app. Rejeitada como substituição. |

Perfil local significa **isolamento funcional no mesmo app/dispositivo**, não
identidade autenticada de servidor multiusuário. Não protege contra acesso físico
ao banco/app nem requisições deliberadamente forjadas. RF79, JWT, contas online,
biometria, recuperação e autenticação fictícia ficam fora. RF33 inclui
compartilhamento/atribuição, não entregue por esta base; RF34 exige também dados e
configurações independentes. Não declarar RF33/RF34/PBI-19 integrais.

## Arquitetura necessária antes de um GO futuro

### Identidade, API e banco (alternativa B)

- `LocalProfile`: UUID estável, name validado, visual simples (iniciais/cor existente),
  createdAt e updatedAt. Persistir catálogo local versionado e activeProfileId
  separado, sempre por ID. Registro backend correspondente é domínio de organização,
  não conta ou autenticação. Nomes iguais não fundem identidades.
- Persistir profileId em **projects, tasks e recurrence_series** e transportar no
  DTO/cache/sync. Registro profiles define existência. Preferir API com escopo explícito
  `/profiles/:profileId/...`; validar ID conhecido em middleware e exigir escopo em
  listagem/detalhe/mutação/restore/history/search, inclusive tombstones e retries.
  Não aceitar proprietário arbitrário do body para reatribuir registro; ID válido
  de outro perfil não deve permitir ler ou alterar seus dados no escopo atual.
- Task–Project e Series–Project precisam de igualdade de proprietário. Planejar
  UNIQUE(profileId,id) e FKs compostas (Task.profileId,projectId) → Project e
  (Task.profileId,recurrenceSeriesId) → Series, mais regra transacional de coerência
  com template. Manter IDs originais e UNIQUE(seriesId,occurrenceKey), inclusive
  tombstones. Revisar clientId/idempotência por escopo sem remover garantias existentes.
- Notes, Subtasks, History e Reminders canônicos podem derivar propriedade da Task,
  sem coluna redundante se toda operação validar o pai no perfil antes do filho.
  **Hoje as rotas não fazem essa validação de perfil**, portanto não estão prontas.
- Série mantém proprietário persistido, não derivação por nome ou Task ocasional.
  materializeAll deve exigir perfil; criação/ativação/edição/lista/detalhe e
  materialização individual validam dono/projeto e propagam perfil às novas Tasks.
  O coalescing mobile precisa ser por perfil; preservar janela 31 dias, sem backfill.
- Search deve aplicar predicado de perfil na Task antes de título/descrição/EXISTS
  Notes. GET /tasks, Projects, includeDeleted e todas as resoluções por ID seguem
  a mesma fronteira. Não basta filtrar o resultado no frontend.

### Legado, bootstrap e novo perfil

Nada será atribuído nesta execução. Futuramente, inventariar e fazer backup antes
de uma migration nova, sem editar migration antiga. Criar perfil **Principal** com
ID determinístico/reservado persistido e, em transação, atribuir todas as raízes
existentes (incluindo tombstones e séries) a ele. Filhos mantêm taskId, seus IDs e
conteúdo; vínculos continuam os mesmos. Não dividir por nome nem criar cópias.
Pré-condições: detectar catálogo parcialmente inicializado ou raízes já atribuídas;
se inconsistente, interromper sem reatribuição silenciosa. Reexecutar bootstrap
completo deve ser no-op. Exigir banco vazio/upgrade, foreign_key_check, counts/IDs/
conteúdos preservados e rollback testados antes de publicação.

No mobile, migração de chaves usa journal/marker de etapas: validar origem, gravar
cópia com namespace Principal, reler/verificar, publicar catálogo/seleção só após
confirmação; conservar origem até confirmação e nunca substituir JSON inválido.
Preservar aliases localId/remoteId/clientId, pendências e snapshots/ledger atuais,
sem upload implícito dos três legados não resolvidos. Não pressupor que o mobile
possa atribuir dados globais compartilhados sem configuração explícita do domínio
legado do servidor; essa implantação precisa ser acordada no próximo refinamento.

Novo perfil nasce sem Tasks/Projects/Notes do anterior; preferências vazias/null.
`NewTaskScreen` exige projeto, mas já oferece “+ Criar projeto” quando lista vazia;
**não é necessário criar Geral automaticamente**. A seleção atual procura Geral por
nome como conveniência dentro da lista; isso não pode ser usado para identidade,
bootstrap ou associação entre perfis. Criar projeto no escopo ativo antes da Task.

### Caches, sync e troca coerente

Chaves separadas por profileId para Tasks, Projects, ledger, SavedFilters e Goals.
Filhos em memória, history, undo, erros, resultados de busca e seleção de filtros
precisam ser descartados/resetados na fronteira, sem apagar persistência do perfil
anterior. Goals não persistem métricas; relatório calcula apenas Tasks do perfil.
SavedFilters de A nunca listados/aplicados em B, conservando projectId e homônimos.

A troca exige coordenador no topo dos Providers e **snapshot composto**; setters
independentes de Projects/Tasks não demonstram atomicidade. Fluxo proposto:

1. Validar destino e catálogo; manter A como ativo confirmado.
2. Bloquear mutações e navegação de dados; aguardar/encerrar filas, sync, undo e
   escritas de A. Capturar profileId+geração em cada request; cancelar/ignorar respostas
   antigas e manter gravação sempre no namespace original. `dataGuard` atual não
   cobre mudança de perfil nem todo callback/background.
3. Carregar e validar cache/preferências de B em staging; API/sync somente com escopo B,
   sem publicar partes. Nenhum frame pode mostrar A com cabeçalho B.
4. Preparar scheduler conforme política abaixo; persistir intenção/seleção com
   recuperação de crash, sem tratar AsyncStorage multi-chave como transação SQLite.
5. Publicar conjunto coerente e activeProfileId juntos; desmontar estado de telas
   anteriores/resetar stack. Desbloquear somente com snapshot consistente.

Falha antes da confirmação mantém A e seus dados/seleção; falha parcial de storage
ou crash exige recuperar journal para um único perfil confirmado na inicialização.
Não limpar A nem exibir B ativo com dados A. Falha de cache B não pode virar lista
vazia “bem-sucedida”. Sync deve receber perfil imutável, baixar/importar somente seu
conjunto, validar projectId e manter ledger por perfil; troca bloqueada enquanto
transação/filas de sync não concluírem. Defaults globais nas novas rotas seriam falha.

### Notificações: risco crítico, sem afirmar vazamento de título inexistente

A implementação real entrega **“Gestor Diário” / “Você tem uma tarefa próxima do
prazo.”**, sem título da Task e sem deep link no builder atual. Portanto, não há
evidência de exposição de título nessa implementação. Alarmes, IDs e journal são
entretanto globais, inclusive recuperação sem JS no boot. Eventos de perfil inativo
podem revelar existência/horário de atividade, e reconciliar um snapshot só de B
com `complete=true` pode cancelar alarmes de A indevidamente.

Para o recorte futuro, direção mínima proposta: manter reminders canônicos vinculados
às Tasks do dispositivo e permitir alarmes genéricos de todos os perfis, **sem conteúdo
ou navegação para outro perfil**. Exige scheduler global separado da coleção de UI,
registro de propriedade e união autoritativa de snapshots por perfil; namespaces
locais isolados não bastam. É uma proposta, não política aprovada de privacidade.
Se o isolamento esperado inclui esconder até existência/horário de eventos inativos,
o gate permanece fechado até implementar somente-perfil-ativo também no nativo,
boot, troca/rollback, cancelamento e notificações já exibidas. Expor títulos no futuro
reabre obrigatoriamente esse gate. Nenhuma dessas mudanças é autorizada agora.

## Matriz GO/NO-GO para hoje

“Não” significa que a entrega segura integrada, com regressão e Android antes do
freeze, não está demonstrada; não é estimativa em horas nem impossibilidade técnica.

| Componente | Alteração necessária | Risco | Pode ser concluído hoje? |
|---|---|---|---|
| Profiles | Catálogo/registro, IDs e seleção durável | Bootstrap parcial | Isolado é pequeno; conjunto seguro não |
| Tasks | Proprietário em DB/DTO/cache e escopo em toda operação | Leitura/mutação cruzada | Não |
| Projects | Proprietário e vínculo coerente com Task/série | Associação cruzada | Não |
| Notes | Validar perfil da Task em todas as rotas | Conteúdo por ID exposto | Não demonstrado |
| Subtasks | Pai escopado e status atualizado no perfil correto | Mutação cruzada | Não demonstrado |
| History | Leitura/registro pelo pai escopado | Histórico exposto | Não demonstrado |
| Reminders | Propriedade/snapshot global ou política ativa também nativa | Cancelamento cruzado/privacidade | Não |
| Recurrence | Série proprietária, materialização por perfil | Geração no perfil errado | Não |
| Search | Predicado de proprietário também no resultado por Notes | Vazamento de conteúdo | Não demonstrado |
| Sync | Upload/download/ledger e respostas em curso por perfil | Mistura persistente | Não |
| SavedFilters | Namespace, bootstrap e projectId conservado | Filtro de A em B | Pequeno isoladamente; não libera GO |
| Goals | Namespace/bootstrap, sem métricas persistidas | Configuração/relatório cruzado | Pequeno isoladamente; não libera GO |
| Cache | Staging composto, filas/geração e recuperação | Frames/stale writes cruzados | Não |
| UI | Perfis por Configurações, cabeçalho ativo, reset de stack | Cabeçalho incompatível com dados | Só após isolamento; não |
| Migration | Nova migration, constraints, bootstrap/recovery e backup | Perda/reatribuição de legado | Não demonstrado |
| Android | Dois perfis, restart/sync/boot/alarme e falha de troca | Regressão do core no freeze | Não |

## Decisão, próximos passos e estimativa

**NO-GO hoje.** A precondição de core pronto foi atendida, mas não demonstra
segurança de perfis. API/search/sync/materialização globais são bloqueadores
concretos. O trabalho necessário é transversal e não há evidência de capacidade
para implementação, migration segura, regressão e Android no restante do freeze.
Não entregar só nome ativo, filtro visual ou cache separado; não iniciar feature.

**13 pontos continuam defensáveis como estimativa provisória do recorte**, pela
complexidade e incerteza de isolamento; não comprovam viabilidade hoje. Reestimar
após fechar política de notifications e estratégia de implantação/legado. Se o
escopo exigir scheduler somente-perfil-ativo, a estimativa pode aumentar. Não
alterar Planning Poker ou Issue automaticamente; #43 segue OPEN, adiada para
refinamento/planejamento futuro. NO-GO do stretch não reduz os 100% do core.

Próximos passos, sem Tasks/Issues adicionais nesta execução: confirmar fronteira
de servidor e política de notificações; detalhar alternativa B, bootstrap e recovery;
só então novo gate/autorização. Sem decomposição de execução para hoje.

Antes de GO futuro, testes obrigatórios: bootstrap idempotente/rollback e preservação
integral de dados; criar/nomear/selecionar/restart/IDs; Tasks/Projects A↔B isolados;
Notes/Subtasks/History inclusive IDs estrangeiros; séries/materialização/retry;
reminders/boot/privacidade/cancelamento; busca por Notes; sync duplo/offline/resposta
antiga; filtros/metas isolados, falha de troca e recuperação entre etapas de storage.
Android: A com Task/Project A e B com Task/Project B; alternar/reabrir/sync sem mistura,
sem limpar massa atual, e verificar notificações com outro perfil ativo.

UI futura mínima: Configurações → Perfis (lista, criar, selecionar/alternar), perfil
ativo em Settings/header, sem BottomNavigation nova ou autenticação no Login.
Excluir perfil e renomear ficam fora do primeiro recorte. Sem fotos obrigatórias.

Validação desta etapa documental: `git diff --check`; regressão funcional não
repetida, pois nenhum código/dado foi alterado. PR documental para dev, sem merge
automático. Sem migration, implementação, mudança de cache/sync, autenticação ou
dev → main. Fontes: Issue #43, Sprint 2, requisitos oficiais RF33/RF34 e arquivos
citados na auditoria; não houve consulta ou edição de dados de produção.

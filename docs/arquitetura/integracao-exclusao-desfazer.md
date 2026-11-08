# Exclusão com confirmação e desfazer — Issue #10

## Estado consolidado — 2026-10-21

Issue #10 concluída; [PR #31](https://github.com/AlineRaquelC/gestor-diario/pull/31)
integrado em `dev`. Sprint 1: **15/15 = 100%, 0 Issues abertas**.
As seções seguintes preservam a auditoria e a execução anteriores ao merge;
menções a Issue aberta, revisão pendente ou outras Issues não iniciadas são
históricas e não representam o estado atual. Limites técnicos continuam válidos
conforme o [fechamento consolidado](../sprints/sprint-1.md).

## Registro histórico da implementação

RF04, [Issue #10](https://github.com/AlineRaquelC/gestor-diario/issues/10),
branch `feature/task-delete-undo`, PR para `dev`. A Issue permanece aberta até o
merge. Progresso formal preservado: 11/15 (73,3%); #12, #13 e #21 não iniciadas.

## Estado anterior e arquitetura

Detalhes e Edição já exibiam confirmação, mas TaskContext.deleteTask removia
somente o registro em memória/cache. Não havia DELETE remoto nem desfazer.
Task já possuía deletedAt/undoUntil; GET normal já filtrava deletedAt preenchido.

Fluxo atual: Screen → useTaskDeletion → TaskContext → taskService → apiRequest →
Routes → Controller → TasksService → TasksRepository → Drizzle/SQLite.
Nenhuma tela faz fetch. Confirmações existentes foram aproveitadas; Cancelar
não chama API nem altera estado. Somente confirmação remota remove a tarefa.

## Contrato HTTP

| Endpoint | Sucesso | Erros previstos |
|---|---|---|
| DELETE /tasks/:id | 200, {id, deletedAt, updatedAt} | 404 TASK_NOT_FOUND para inexistente ou já excluída |
| POST /tasks/:id/restore | 200, Task completa com project/subtasks | 404 TASK_NOT_FOUND; 409 TASK_NOT_DELETED para tarefa ativa; 404 PROJECT_NOT_FOUND para projeto indisponível |

Falhas inesperadas seguem 500 INTERNAL_ERROR e o envelope de erro atual.
DELETE repetido não muda timestamp nem duplica histórico. RESTORE repetido não
produz outro evento. Não há retry automático. POST restore não exige payload.

DELETE define deletedAt no backend com timestamp ISO UTC atual, preservando
monotonicidade mínima de 1 ms em relação a updatedAt anterior. Atualiza updatedAt
com o mesmo valor. RESTORE limpa deletedAt e mantém ID/createdAt e demais campos;
atualiza somente updatedAt e limpa undoUntil. Não recria uma Task.

GET /tasks omite excluídas. GET /tasks/:id, histórico, notas e operações de
subtarefas mantêm a política operacional de 404 para pai soft-deleted. Após
restauração, os mesmos endpoints voltam a disponibilizar os dados preservados.

## Histórico, migration e relações

Cada alteração de Task e seu evento são atômicos na mesma transação SQLite
IMMEDIATE. Falha no histórico desfaz a alteração integralmente.

- DELETE grava action=DELETE e metadata.deletedAt com o timestamp da exclusão.
- RESTORE grava action=RESTORE e metadata.deletedAt com a exclusão que desfez.
- Eventos têm UUID, taskId e createdAt reais; não são disfarçados como UPDATED.

O modelo inicial previa DELETED/RESTORED. Para atender aos nomes DELETE/RESTORE
solicitados na #10, a migration 0001 amplia a constraint de task_history e conserva
os valores antigos, sem backfill ou renomear eventos anteriores. A cópia da tabela
de histórico preserva registros/FKs; nenhum registro de Task é removido fisicamente.
Upgrade com dados existentes e foreign_key_check estão cobertos por teste.

Subtasks, Notes e History não são apagados ou modificados por DELETE/RESTORE.
Todos preservam IDs/taskId; projectId, campos, datas, status, prioridade e progresso
permanecem. Restore valida projeto ativo conforme a regra existente de edição;
se indisponível, mantém exclusão e vínculo, sem recriar/sincronizar projetos.

## Janela de desfazer e concorrência

Janela mobile de **5 segundos após confirmação da API**, controlada no Context.
Feedback global em App exibe “Tarefa excluída” e ação “DESFAZER”, inclusive após
navegar para Home. Expiração oculta a oportunidade; não envia outra requisição,
não agenda limpeza e não faz hard delete. undoUntil fica null: a janela pertence
somente à UX, e a API restore não impõe prazo de retenção. Não há tela de lixeira.
Essa decisão substitui a proposta inicial de prazo persistido no modelo de dados.

Somente uma oportunidade ativa. Nova exclusão confirmada substitui a anterior;
se falhar, preserva a oportunidade anterior até seu prazo original. Timer e cópia
temporária pertencem à tarefa correta. Context valida ID e prazo também no clique,
inclusive se o app ficou em segundo plano. Restore iniciado dentro do prazo pode
terminar depois dele. Reiniciar o app não reabre a oportunidade de desfazer.

Refs bloqueiam cliques repetidos na confirmação/feedback. Context bloqueia DELETE/
RESTORE simultâneos e compartilha a trava da tarefa com edição/status/filhos/notas.
Resposta GET individual antiga não ressuscita tarefa excluída; updatedAt continua
protegendo versões restauradas contra leituras antigas. Restore reintegra a resposta
remota por ID e conserva subtarefas/lembretes exclusivamente locais já associados,
sem enviá-los ao servidor. Notes/History permanecem em seus mapas por taskId.

A ordem dos hooks de EditTaskScreen foi corrigida para que a remoção da Task do
Context não provoque render com menos hooks durante a exclusão. Sem essa correção,
o retorno antecipado preexistente impediria o fluxo seguro pela tela de Edição.

## Cache, offline e legado

Estado e cache seguem somente respostas confirmadas. DELETE falhou: tarefa fica
visível e erro é informado. RESTORE falhou: tarefa fica excluída e erro é informado;
ação pode ser tentada novamente enquanto o prazo original permitir. Cache é salvo
na fila AsyncStorage existente. Falha de escrita após confirmação remota produz
aviso separado, sem repetir a operação nem fingir que o servidor falhou. Nessa
situação, reabertura pode usar cache antigo: a reconciliação geral continua na #12.

Não há migração/upload de tarefa antiga exclusivamente local. DELETE retorna
404 e o mobile informa que a tarefa pode existir só no dispositivo ou já estar
excluída; conserva o registro local, sem sucesso falso. Ausência de um ID no GET
continua sem ser interpretada como comando geral de exclusão: sync de mudanças
externas/dispositivos e reconciliação de legado pertencem à #12.

Sem backend, não há remoção/restauração otimista, fila offline ou sucesso fictício.
Timeout/resposta perdida após commit remoto mantém a limitação de confirmação já
existente: não há retry silencioso nem sincronização automática nesta Issue.

## Home, Dashboard, Calendário e projetos

Regras e arquivos de Dashboard/Calendário não foram alterados. Ambos derivam seus
valores de TaskContext: remoção/restauração confirmadas recalculam listas, contagens
e indicadores. Listas de projetos também consomem a mesma coleção. Nenhuma regra
de datas/filtros/ordenação ou integridade geral de projetos foi implementada.

## Validação automatizada

Backend: db:migrate, typecheck, npm test e build aprovados. **268 testes, 10 suites**,
incluindo os 258 anteriores e 10 novos. Cobertura: DELETE válido/inexistente/repetido,
timestamps, GET operacional, relações preservadas, DELETE/RESTORE reais, restore
válido/inexistente/ativo/repetido, projeto indisponível, rollback nas duas operações,
SQLite em arquivo/reabertura e upgrade da migration com dados anteriores.

Mobile: **241 testes, 16 suites**, incluindo os 216 anteriores. Comando focado:

```bash
npm test -- --runInBand __tests__ --testPathIgnorePatterns=App.test.tsx --silent
```

Confirmação nas duas telas, Cancelar, API pendente/falha, cliques repetidos,
feedback/ação, restore, janela/expiração, troca de oportunidade, callback de ID antigo,
resposta GET antiga, cache/reabertura/falha, offline/legado e recálculo dos helpers de
Dashboard/Calendário. Suites anteriores de Home/Calendário permanecem aprovadas.
Jest global antigo continua incompatível com suites Vitest backend/App; sem mudança
da configuração geral (#13). Nenhuma dependência foi instalada.

Lint dos arquivos alterados: zero erros e dois avisos inline preexistentes.
TypeScript global: mesmos 14 erros da base, comparados por arquivo/código/mensagem
completa, ignorando apenas posições. Dívidas não relacionadas foram preservadas.
`git diff --check` aprovado.

## Android — 2026-10-19

AVD Pixel_7/emulator-5554, API SQLite local migrada, Metro com bundle da branch.
Tarefa nova criada pela interface: Issue10-Android,
ID `43e281f4-30b1-4824-b45b-e4cc67937f47`, projeto Apresentacao, prazo 19/10/2026.
Duas subtarefas do rascunho persistidas e uma Note criada nos Detalhes.

1. Calendário exibiu a tarefa; Home mostrou 0/1 e uma pendente.
2. Excluir abriu confirmação Cancelar/Excluir. Após confirmar, Home passou a
   0/0 e zero pendentes; feedback exibiu Tarefa excluída e DESFAZER.
3. DESFAZER acionado dentro da janela restaurou a tarefa; Home voltou a 0/1 e
   Calendário voltou a mostrar uma tarefa no dia, sem reload.
4. Detalhes manteve duas subtarefas e a Note. Atividade exibiu Tarefa excluída e
   Tarefa restaurada com timestamps reais. API confirmou mesmo ID, dois filhos,
   uma nota e CREATED, UPDATED, DELETE, RESTORE.
5. Backend desligado: confirmar nova exclusão mostrou Não foi possível excluir.
   Task permaneceu em Detalhes e Calendário; nenhum feedback falso de sucesso.
6. API religada: comparação integral de Task, Notes e History com snapshot antes
   da tentativa offline não encontrou diferenças.
7. Segunda exclusão confirmada, sem desfazer: Home voltou a 0/0, card do projeto
   voltou de 1/11 a 1/10 e Calendário mostrou zero tarefas no dia após a janela.
8. Force-stop e reabertura: Home manteve 0/0 e Calendário continuou sem tarefa
   no dia. SQLite confirmou o mesmo ID com deletedAt preenchido, undoUntil null,
   duas subtarefas, uma nota e cinco eventos (incluindo o segundo DELETE).

Contagens são evidência deste cenário, não constantes da aplicação. Bancos,
snapshots/dumps e auxiliares temporários não são versionados.

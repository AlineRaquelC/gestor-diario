# Integração de subtarefas e progresso — Issue #8

RF09/RF10, [Issue #8](https://github.com/AlineRaquelC/gestor-diario/issues/8).
Branch feature/8-subtasks-progress, a partir de dev com #1–#7 integradas.
Sprint: 15 Issues, 7 concluídas (46,7%). #8 permanece aberta até revisão/merge.

## Contrato e arquitetura

Route → Controller → SubtasksService → SubtasksRepository → Drizzle → SQLite.
Schema subtasks existente: id, taskId (FK), title, done, createdAt, updatedAt.
Nenhuma migration, dependência ou alteração de schema necessária.

| Endpoint | Payload | Sucesso |
|---|---|---|
| POST /tasks/:taskId/subtasks | title obrigatório, trim não vazio | 201 |
| PATCH /tasks/:taskId/subtasks/:subtaskId | done boolean e/ou title | 200 |
| DELETE /tasks/:taskId/subtasks/:subtaskId | sem payload | 200 |

Resposta comum: `{ "task": { ...tarefa completa, subtasks: [...] } }`.
Traz IDs/timestamps gerados no servidor, projeto derivado e progress/status/done/
updatedAt confirmados do pai. GET /tasks e GET /tasks/:id mantêm o mesmo contrato.
DELETE físico do filho, sem alterar outras subtarefas ou implementar exclusão do pai.

Zod valida IDs string não vazios, payloads estritos, título trim e PATCH não vazio.
400 VALIDATION_ERROR; pai ausente/soft-deleted: 404 TASK_NOT_FOUND;
filho ausente/de outro pai: 404 SUBTASK_NOT_FOUND. Erro inesperado: 500 INTERNAL_ERROR.

## Progresso e coerência

Com filhos: `Math.round(concluídos / total * 100)`, calculado exclusivamente pelo
backend nas mutações. 0 → PENDING/done=false; 1–99 → PARTIAL/done=false;
100 → COMPLETED/done=true. Exemplos: 1/3=33; 2/3=67; 1/4=25; 3/4=75.
Adicionar pendente a 3/3 produz 75/PARTIAL e reabre; desmarcar também reabre.
Remover recalcula restantes; ao remover último, usa o status atual do pai:
COMPLETED → 100/true; PENDING ou PARTIAL → 0/false.

Sem filhos, status continua editável como #7, com progress 100 ou 0.
A regra temporária de preservar percentuais intermediários sem filhos da #7
é substituída pela regra do modelo. GET não reescreve registros antigos.

O botão Concluir/Reabrir existente envia PATCH /tasks/:id. Com filhos, COMPLETED
marca todos done=true; PENDING marca todos done=false. Após isso o pai é calculado.
Seleção PARTIAL preserva filhos parciais existentes; ao reabrir uma tarefa
COMPLETED por PARTIAL, todos ficam pendentes e o estado calculado é PENDING.
Não inventa uma escolha arbitrária de filhos para obter progresso parcial.
PATCH de campos comuns também recalcula pelo estado real dos filhos.

## Atomicidade, timestamps e histórico

POST/PATCH/DELETE de filho, atualização do pai e eventos compartilham transação
IMMEDIATE. Concluir/reabrir todos também ocorre atomicamente na transação do PATCH.
Falha de pai ou histórico desfaz filhos, pai e eventos. createdAt permanece;
updatedAt de filhos alterados e pai é atualizado de forma monotônica em ISO UTC.
DELETE atualiza pai; filho removido deixa de possuir registro/timestamp.

Mutação efetiva de filho registra um UPDATED com fields=[subtasks,progress].
Se muda estado, registra exatamente um STATUS_CHANGED, COMPLETED ou REOPENED,
seguindo #7. PATCH idêntico de filho não gera eventos nem timestamps falsos.
Conclusão/reabertura coletiva registra UPDATED pelos filhos efetivamente alterados
e um evento semântico de transição, sem duplicação. Sem novos tipos de evento,
sem backfill fictício. Atividade continua consumindo o histórico real da #7.

## Mobile, cache e legado

EditTaskScreen/TaskDetailsScreen → TaskContext → taskService → cliente apiRequest.
Serviço expõe createSubtask, updateSubtask e deleteSubtask. Context oferece
addSubtask, toggleSubtask e removeSubtask. Telas preservam layout/cores/navegação/
componentes; ações de filhos na edição são confirmadas imediatamente pela API,
independentes do botão de salvar campos gerais. O PATCH do pai não envia array
local de filhos que poderia sobrescrever a resposta remota.

Estado e AsyncStorage só mudam após confirmação, por ID, sem duplicatas. Operações
do mesmo pai são protegidas contra concorrência com mutações de filho/status;
outras tarefas continuam utilizáveis. Tela desabilita o item em andamento e
protege salvamento simultâneo. Falha da API informa erro e mantém dados anteriores.
Cache falha após confirmação: warning, sem repetir POST/PATCH/DELETE.

Filhos confirmados recebem marca remote no cache (não faz parte do schema/API).
Merge por ID usa valores remotos e remove filhos remotos que a API já removeu;
preserva filhos exclusivamente locais, inclusive após GET com array vazio.
Dados antigos sem marca cujo ID aparece na API passam a ser reconhecidos como
remotos. IDs antigos não confirmados permanecem locais, sem upload silencioso.
Tentar alterar/remover individualmente filho somente local informa essa limitação,
sem apagá-lo. A hidratação não faz upload de filhos antigos.

O rascunho de Nova Tarefa envia os títulos em `subtasks` no POST /tasks. Pai,
filhos e CREATED são criados atomicamente pelo TasksService, usando os repositories
existentes. A resposta inclui os filhos persistidos, com UUIDs novos; o adapter
substitui os IDs temporários, sem misturar o rascunho com a resposta e duplicar filhos.
A ordem do rascunho é mantida por timestamps consecutivos de criação. O schema
SQLite não mudou e PATCH do pai continua rejeitando arrays de subtarefas.

Para tarefas que já ficaram com filhos somente locais, concluir/reabrir pelo pai
continua passando pela API. Somente após confirmar o PATCH coletivo, o Context
aplica `done` confirmado também aos filhos exclusivamente locais da própria tarefa
no estado e no cache. Filhos remotos mantêm exatamente os valores retornados pela
API. Isso altera dados reais de `subtasks[].done`, e não apenas a barra visual.
Não envia filhos antigos ao servidor, não modifica outras tarefas e não cria
histórico remoto fictício para dados locais. Falha no PATCH preserva toda a versão
anterior; falha no cache após sucesso gera warning sem repetir a requisição.
Esses filhos antigos continuam identificados como locais: persistência remota,
edição individual e reconciliação definitiva permanecem limitadas pela #12.
Tarefas novas não têm essa limitação no fluxo do rascunho: os filhos são remotos
já na resposta da criação. Sync geral, fila offline e migração em massa continuam
fora do escopo.

## Validação

Backend: migrations existentes, typecheck e build aprovados. 225 testes em
8 arquivos aprovados: os 215 casos anteriores foram preservados, com 10 regressões
de criação do rascunho, conclusão/reabertura e rollback. Dois casos
anteriores tiveram expectativas atualizadas porque exigiam a regra temporária
de progress da #7, substituída por RF10. Cobertura inclui título/UUID/timestamps,
ownership/soft-delete, arredondamento, remoção do último filho, conclusão coletiva,
histórico e rollback de filhos/pai/eventos.

Mobile: 124 testes focados em 8 arquivos aprovados (116 anteriores + 8 regressões).
Serviços, Context e telas cobrem mapping, erro HTTP/offline, concorrência,
cache/reabertura, exclusão sem ressuscitar filho remoto, preservação de legado
local e uso da operação remota pelas interfaces existentes.
As novas regressões usam Nova Tarefa, Context e service reais com transporte/storage
isolados: quatro filhos do rascunho → 2/4 → checkbox Home ou botão Detalhes →
4/4, 100%, COMPLETED; reabrir → 0/4, 0%, PENDING. Cobrem cache/reabertura, offline,
UUIDs sem duplicação e filhos locais atualizados somente após confirmação, sem upload.

TypeScript global: mesmos 14 erros antes/depois, comparados por arquivo/código/
mensagem ignorando deslocamento de linhas. Lint dos serviços, Context e testes
alterados aprovado. Nas duas telas alteradas permanecem 14 erros de hooks
condicionais em EditTaskScreen e dois avisos inline existentes; os cinco erros
de EditProjectScreen não alterada mantêm a dívida global conhecida de 19.
Jest global antigo e quatro alertas moderados conhecidos do Drizzle Kit continuam
registrados, sem correção fora do escopo ou instalação de dependências.

HTTP local: health/lista/detalhe/histórico 200; POST tarefa 201; PATCH pai 200;
POST filho 201; PATCH/DELETE filho 200. Payload inválido 400 VALIDATION_ERROR;
filho inexistente 404 SUBTASK_NOT_FOUND. Pai ausente/soft-deleted e ownership
também cobertos pelos testes HTTP com SQLite isolado.

## Android — 2026-10-04

AVD Pixel_7 existente, emulator-5554, Metro conectado ao app instalado. Boot
recuperado após aguardar System UI; sem wipe. Tarefa criada pela interface:
b2e7579d-17f0-4ec4-9354-9aad41797324, Issue8-Android-Subtarefas,
projeto Desenvolvimento, CREATED real 2026-10-04T14:35:23.112Z.

1. Adicionadas Subtarefa 1–4 no campo existente da EditTaskScreen; UUIDs remotos
   retornados e persistidos: 0/4, 0%, PENDING/done=false.
2. Marcadas individualmente em Detalhes: 1/4=25%, 2/4=50%, 3/4=75%, todas PARTIAL;
   4/4=100%, COMPLETED/done=true. Cada percentual foi confirmado na UI e por GET.
3. Desmarcada Subtarefa 4 na edição: 3/4=75%, PARTIAL/done=false.
4. Removida Subtarefa 1 concluída: 2/3=67%. Adicionada Subtarefa 5 pendente:
   2/4=50%. Durante a automação ADB, um toque adicional desmarcou Subtarefa 2
   (33%); ao marcar novamente, restaurou 67% antes da adição, sem evento fictício.
5. Botão Concluir em Detalhes marcou todas: 4/4=100%, COMPLETED/true. Reabrir
   marcou todas pendentes: 0/4=0%, PENDING/false. GET confirmou filhos e pai.
6. Atividade exibiu datas reais, UPDATED e transições STATUS_CHANGED, COMPLETED
   e REOPENED coerentes; sem eventos específicos inventados nem duplicação da
   mesma transição. UPDATED e evento semântico do mesmo PATCH são eventos distintos.
7. Force-stop/reabertura confirmou os quatro filhos restantes (2,3,4,5), 0%,
   PENDING/false. GET retornou objeto idêntico ao snapshot anterior.
8. API desligada com conexão recusada: marcar em Detalhes, adicionar e remover
   na edição mostraram “Não foi possível alterar a subtarefa”, preservando filhos
   e estado confirmado. Nenhuma confirmação falsa ou remoção local foi aplicada.
9. Novo force-stop/reabertura offline confirmou cache preservado; tarefa/detalhes
   disponíveis e falha de consulta independente. Rascunho rejeitado não virou filho.
10. API restaurada: GET da tarefa e do histórico retornaram 200 e objetos
    exatamente iguais aos snapshots anteriores às três tentativas offline.

Arquivos SQLite, dumps ADB, snapshots e auxiliares ficaram fora do versionamento.

## Correção do bug manual — rascunho de Nova Tarefa

Antes da correção, foi criada pela UI a tarefa Issue8-Repro-Atual
(`dcad444c-f6c8-4d2b-9ad6-238a9efc5ded`) com quatro filhos no rascunho.
GET retornava `subtasks: []`, enquanto Detalhes mostrava os quatro filhos locais.
Home e Detalhes chamavam o mesmo toggleTask: a API concluía somente o pai conhecido,
e o merge preservava os filhos pendentes do cache. Nos dois caminhos foi observado
COMPLETED/100% com contador 0/4. A causa estava na omissão dos filhos no POST e
na preservação do rascunho local após criar o pai, não no cálculo remoto por RF10.

Após a correção, a tarefa Issue8-Fix-Rascunho
(`0a93f8ca-8deb-416c-8717-e2c73fd276d9`, CREATED 2026-10-04T18:07:02.618Z)
foi criada pela Nova Tarefa com Draft 1–4 antes do salvamento. A resposta da API
já continha os quatro UUIDs persistidos, na ordem do rascunho, sem IDs locais duplicados.

- Marcar Draft 1 e 2 em Detalhes: 2/4, 50%, PARTIAL/done=false na UI e no GET.
- Concluir pelo checkbox da Home: 4/4, 100%, COMPLETED/done=true; os quatro filhos
  estavam feitos na API e os quatro checkboxes foram conferidos em Detalhes.
- Reabrir pelo mesmo checkbox: 0/4, 0%, PENDING/done=false e todos pendentes.
- Marcar novamente dois filhos e concluir pelo botão de Detalhes: 4/4, 100%,
  COMPLETED/done=true, todos feitos. Reabrir: 0/4, 0%, PENDING/done=false.
- Force-stop e reabertura do aplicativo: os quatro filhos, 0/4 e estado PENDING
  permaneceram visíveis e confirmados por GET.

Layout, navegação, checkbox da Home e botões Concluir/Reabrir foram preservados.
Não houve upload geral de filhos antigos. As regressões automatizadas também
cobrem filhos locais/mistos acompanhando a ação coletiva somente após confirmação,
e falha da API preservando seus valores anteriores e o cache.

Nenhuma observação #9, exclusão/desfazer #10, dashboard #11, sync #12,
CI #13, calendário #20 ou filtro/ordenação #21 foi implementado.

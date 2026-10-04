# Integração de observações — Issue #9

RF11, [Issue #9](https://github.com/AlineRaquelC/gestor-diario/issues/9).
Branch `feature/9-task-notes`, criada de dev com #1–#8 integradas. Sprint: 15
Issues planejadas, 8 concluídas (53,3%); #9 permanece aberta até revisão/merge.
Os critérios da Issue foram preservados. Não há requisito adicional de título,
categoria, cor, prioridade, anexos ou busca textual em observações.

## Description e Note

Task.description continua sendo o texto principal, único, editado no formulário
da tarefa. Note possui ID próprio, taskId, content, createdAt e updatedAt; várias
notas independentes podem ser registradas ao longo do tempo. Não há conversão,
duplicação automática ou remoção da descrição. Histórico também é uma coleção
independente de eventos, sem confundir suas entradas com Notes.

## Backend e contrato

Route → NotesController → NotesService → NotesRepository → Drizzle → SQLite.
Reutiliza backend/src/database/schema/notes.ts e a FK existente para Tasks,
sem alterar schema/migrations nem instalar dependências.

| Endpoint | Sucesso | Resposta |
|---|---|---|
| GET /tasks/:taskId/notes | 200 | Note[]; sem notas: [] |
| POST /tasks/:taskId/notes | 201 | Note |
| PATCH /tasks/:taskId/notes/:noteId | 200 | Note |
| DELETE /tasks/:taskId/notes/:noteId | 200 | id, taskId, updatedAt do pai |

POST/PATCH aceitam somente content string, trim não vazio. Zod rejeita payload
vazio, tipos inválidos e campos desconhecidos; IDs são strings não vazias.
Não permite alterar identidade, vínculo ou timestamps pelo payload.
400 VALIDATION_ERROR; pai inexistente/soft-deleted: 404 TASK_NOT_FOUND;
nota inexistente/de outra tarefa: 404 NOTE_NOT_FOUND. Falhas inesperadas:
500 INTERNAL_ERROR. O repository consulta/atualiza/exclui por taskId + noteId.

GET usa createdAt crescente, desempate pelo ID; edição não muda essa ordem.
UUID/timestamps ISO UTC são gerados no backend. POST: createdAt=updatedAt.
PATCH: createdAt preservado e updatedAt monotônico, mesmo em chamadas rápidas.
DELETE remove fisicamente apenas a Note, sem excluir Task ou outras notas.

Toda mutação confirmada atualiza Task.updatedAt com o mesmo timestamp devolvido
pela API e registra um único UPDATED com fields=[notes]. Não muda Task.createdAt,
description, status, progress ou done. Note, pai e evento usam a transação
IMMEDIATE compartilhada; falha no pai/histórico desfaz a mutação. Não há NOTE_*,
histórico fictício/retroativo ou novos eventos de exclusão de tarefas.
Reenvios deliberados de PATCH são novas gravações; não há retry automático.

## Mobile e interface

TaskDetailsScreen → TaskNotesSection → TaskContext → noteService → apiRequest.
Modelo Note em src/models/note.ts; taskNotes é um mapa separado no Context,
sem embutir notas em Task.description ou aumentar GET /tasks. A lista é carregada
ao abrir Detalhes e mantém ordem cronológica. Respostas antigas não sobrescrevem
mutações confirmadas; IDs reais substituem registros por ID, sem duplicação.

A seção Observações fica entre Subtarefas e Atividade, usando os mesmos tons,
cards e espaçamentos. As demais seções, navegação, formulários e botões foram
preservados. Campo multiline e Adicionar observação; cada nota mostra conteúdo
e createdAt real em pt-BR no fuso do dispositivo. Edição inline com conteúdo
atual, Salvar/Cancelar; confirmação Cancelar/Excluir antes da exclusão.

Loading, vazio (“Nenhuma observação registrada.”) e erro são independentes.
Erro de notas não esconde a tarefa nem interfere na consulta do histórico.
Não são criadas notas fictícias; description permanece visível separadamente.
Criar/editar/excluir aguardam a API antes de alterar a coleção; o texto só é
limpo após sucesso e permanece em falha. Há trava imediata contra envio duplicado
e concorrência da mesma tarefa com mutações de notas/subtarefas/status.

Sucesso atualiza Task.updatedAt no estado e cache AsyncStorage, acionando a
consulta existente do histórico. Falha do cache após confirmação retorna warning
sem repetir a mutação remota nem reverter a Note confirmada.

## Cache, offline e tarefas antigas

Notas confirmadas ficam em memória durante a sessão, preservadas quando GET ou
mutação falha. Não são persistidas no AsyncStorage nesta Issue: ao reiniciar,
GET recupera as Notes do SQLite; reinício offline informa falha sem inventar notas.
O cache de Tasks existente permanece e a tarefa continua acessível.
Mutações são online: falha não mostra sucesso, não apaga/edita a nota confirmada
e conserva o texto digitado. Não há upload, fila offline ou sincronização geral.

Tarefa antiga existente somente no dispositivo recebe mensagem de que Notes
exigem tarefa persistida na API; o rascunho é preservado. Não se migram tarefas
locais nem description. A sincronização geral continua na #12.
Não se adicionam Notes em Nova Tarefa/Editar Tarefa: description continua independente.

## Validações automáticas

Backend: npm run db:migrate, npm run typecheck, npm test e npm run build.
Migrations/typecheck/build aprovados; **258 testes em 9 arquivos**, incluindo
os 225 anteriores e 33 testes de Notes com SQLite isolado e HTTP real.
Cobrem payloads, trim, UUID/timestamps, ownership/soft-delete, múltiplas notas,
ordem, timestamps do pai, histórico e rollback nas três mutações.

Mobile: **151 testes focados em 10 arquivos**, preservando os 124 anteriores
e adicionando 27 testes de serviços, Context e Detalhes. Fixtures anteriores
receberam somente suporte para a consulta independente de Notes, sem remover
expectativas de histórico ou conclusão/subtarefas.

```bash
npm test -- --runInBand __tests__/taskService.test.ts __tests__/taskUpdateService.test.ts __tests__/taskHistoryService.test.ts __tests__/subtaskService.test.ts __tests__/TaskContext.integration.test.tsx __tests__/EditTaskScreen.integration.test.tsx __tests__/TaskDetailsHistory.integration.test.tsx __tests__/TaskDraftCompletion.integration.test.tsx __tests__/noteService.test.ts __tests__/TaskNotes.integration.test.tsx --silent
```

Lint dos arquivos alterados: zero erros; um aviso inline preexistente em Detalhes.
TypeScript global: mesmos 14 erros antes/depois, comparados por arquivo/código/
mensagem completa, ignorando somente números de linha. Erros condicionais de
hooks conhecidos, demais avisos inline, falhas antigas de Jest global e quatro
alertas moderados conhecidos do Drizzle Kit permanecem sem correção nesta Issue.

## Android e HTTP

Validação em 2026-10-04, AVD Pixel_7/emulator-5554, aplicativo existente e Metro
com bundle da branch atual. O System UI recuperou após selecionar Wait durante
o boot; não houve wipe. API antiga foi reiniciada para carregar os endpoints novos.

1. Tarefa criada pelo formulário: Issue9-Android-Observacoes,
   id bd45e0d1-6fe0-47c1-b700-38f05e54dde8; description vazia, PENDING/0/false.
   Detalhes exibiu “Nenhuma observação registrada.”, sem mudar as demais seções.
2. Criadas pela UI “Primeira observacao de teste.” e “Segunda observacao.”
   (entrada de texto ADB sem acentos). Ambas apareceram independentes, com
   createdAt visível em pt-BR, IDs e timestamps reais confirmados por GET.
3. Primeira editada para “Primeira observacao editada.”. createdAt permaneceu
   2026-10-04T19:23:13.478Z; updatedAt passou a 2026-10-04T19:24:18.540Z.
4. Excluir observação abriu confirmação Cancelar/Excluir; somente a segunda
   foi removida após confirmação. A primeira permaneceu na UI e em GET Notes.
5. Force-stop/reabertura: Home e Detalhes recuperaram a tarefa; GET Notes
   carregou novamente a primeira nota, preservando conteúdo e data original.
6. API desligada, conexão recusada: criar “Offline nova observacao.” informou
   erro, manteve o texto digitado e não criou nota. Editar para “Offline edicao
   rejeitada.” informou erro e manteve texto no editor; Cancelar mostrou o
   conteúdo confirmado. Excluir, após confirmação, informou erro e preservou
   a nota visível. A tarefa e Atividade continuaram acessíveis.
7. API restaurada: Task, Notes e History foram comparados integralmente ao
   snapshot anterior ao offline, sem diferenças. Uma nota confirmada permanece.
   Histórico real: CREATED e quatro UPDATED(fields=[notes]) das duas criações,
   edição e exclusão; nenhum evento das tentativas offline ou duplicação.

HTTP adicional com tarefa isolada: health 200; POST Task 201; lista/detalhe/history
200; GET Notes 200/[]; POST Note 201; PATCH Note 200/400/404; DELETE Note 200;
nota/pai inexistentes 404. SQLite/ownership/soft-delete/atomicidade também foram
validados pelos testes backend, sem modificar dados pessoais existentes.

Testes Android/HTTP aprovados. API foi restaurada após offline; Metro e emulador
iniciados para a validação foram encerrados, preservando o AVD. Arquivos de banco,
snapshots, dumps ADB e auxiliares ficaram fora do versionamento. Nenhuma Issue
#10–#13, #20 ou #21 foi implementada; nenhuma correção de dívida antiga foi feita.

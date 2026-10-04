# Integração de status e histórico — Issue #7

RF05/RF17, [Issue #7](https://github.com/AlineRaquelC/gestor-diario/issues/7).
Implementação na branch feature/7-task-status-history, a partir de dev com #1–#6
integradas. A Sprint possui 15 Issues, 6 concluídas (40%); #7 permanece aberta
até revisão/merge. Não altera o planejamento nem declara conclusão antecipada.

## Estados e compatibilidade

| Mobile canônico | Backend |
|---|---|
| todo | PENDING |
| in_progress | PARTIAL |
| completed | COMPLETED |

review é somente um valor legado de entrada. Na hidratação do cache, é convertido
para in_progress, preservando ID, demais campos e subtarefas; adapters de criação
e edição continuam aceitando review e enviam PARTIAL. Nenhuma tarefa é descartada
por esse valor e nenhum quarto estado é criado. Seletores de Nova/Editar Tarefa
mantêm componentes, estilos e os rótulos atuais das três opções restantes.

O status é canônico: COMPLETED implica done=true; PENDING/PARTIAL implicam
done=false. POST e todo PATCH reaplicam essa coerência no Service. O cache também
é normalizado para os estados oficiais, sem modificar timestamps nem inventar
eventos durante hidratação. A API permanece autoridade dos dados remotos.

## Progresso temporário até #8

Concluir define progress=100, inclusive com filhos existentes, sem alterá-los.
Ao reabrir, 100 é reduzido a 0; valores intermediários são preservados.
Para evitar dados legados abertos mostrando 100, essa normalização também ocorre
em PATCH e na hidratação/leitura do mobile. Não calcula proporção de subtarefas
nem supõe dados remotos inexistentes. A regra definitiva por filhos permanece
na #8; progress parcial persistido continua sendo exibido.

## Eventos e atomicidade

| Operação | Evento | Metadata |
|---|---|---|
| Criação nova | CREATED | {} |
| Campos comuns efetivamente alterados | UPDATED | fields com nomes dos campos |
| PENDING ↔ PARTIAL | STATUS_CHANGED | from/to |
| PENDING/PARTIAL → COMPLETED | COMPLETED | from/to |
| COMPLETED → PENDING/PARTIAL | REOPENED | from/to |

PATCH usa /tasks/:id, sem endpoint redundante de status. Estado repetido não
produz evento falso; reenvio sem mudanças relevantes não duplica UPDATED.
PATCH misto gera um UPDATED com campos comuns, excluindo status, e um evento
semântico de transição. Não duplica COMPLETED/REOPENED com STATUS_CHANGED.
Troca de projeto continua em UPDATED.fields; PROJECT_CHANGED não é emitido nesta
Issue, evitando duplicação. DELETED/RESTORED pertencem à #10.

Route → Controller → Service → Repository → Drizzle → SQLite. Service escolhe
eventos, atualiza updatedAt e controla transações. Repository concentra inserção
e consulta de task_history. POST + CREATED e PATCH + todos seus eventos utilizam
a mesma transação IMMEDIATE. Falha de histórico desfaz tarefa e eventos do PATCH
misto. createdAt da tarefa permanece; updatedAt continua monotônico em ISO UTC.
Não há schema/migration nova nem instalação de dependências.

## Consulta

GET /tasks/:id/history retorna HTTP 200 e array de eventos com id, taskId, action,
metadata JSON e createdAt real. Ordem crescente por createdAt, desempate por ID;
eventos de um mesmo PATCH compartilham timestamp e não têm precedência semântica
entre si. Tarefa ativa sem eventos retorna []; ausente/soft-deleted retorna
404 TASK_NOT_FOUND no padrão existente. Sem paginação desnecessária.

Nenhum backfill: tarefas anteriores podem não ter CREATED; UPDATED existente da
#6 é consultado sem recriação. Metadata guarda dados estruturados, sem nomes de
pessoas fictícias ou textos de interface.

## Mobile e Atividade

Home/Detalhes → TaskContext.toggleTask → updateTask → taskService → PATCH.
Concluir envia completed; reabrir pelo botão envia todo. O seletor de edição
permite também in_progress. Estado/cache mudam somente após resposta confirmada.
Concorrência por tarefa e proteção contra GET antigo da #6 são preservadas.
Home/Detalhes atualizam reativamente, sem implementar dashboard completo.

Detalhes → TaskContext.loadTaskHistory → taskService.getTaskHistory → cliente
apiRequest → GET histórico. Context mantém cache de histórico em memória por ID
e impede resposta antiga de sobrescrever consulta mais recente. A tela consulta
ao abrir e ao mudar updatedAt, sem fetch direto. Não adiciona sincronização geral.

A seção Atividade mantém posição, estrutura e estilos de ActivityRow. Cada linha
traduz action/metadata e formata createdAt real no fuso do dispositivo. Foram
removidos apenas os eventos fixos “Configurar ambiente”, “Criar backlog” e “por Aline”.
Sem eventos: “Nenhuma atividade registrada.”. Há loading e mensagem independente
para falha de histórico; a tarefa continua visível. Eventos já carregados podem
permanecer em memória durante falha, sem indicar confirmação de consulta nova.
Histórico não é persistido no AsyncStorage nesta etapa: após reiniciar offline,
exibe falha de consulta, sem fabricar eventos para preencher a seção.

Falha no PATCH informa erro e mantém estado/cache da tarefa confirmada, sem
conclusão falsa. Sem fila offline ou upload de tarefas antigas somente locais
(#12). Cache de tarefas continua AsyncStorage e preserva status/done/progress
após reabertura. Falha de escrita após confirmação remota é avisada, sem repetir
PATCH. Subtarefas continuam locais, com updateTaskLocal existente e sem CRUD
remoto; observações, delete/restore, dashboard completo, sync, calendário e
filtros não foram antecipados.

## Validações automáticas — 2026-10-04

Backend, em backend/:

```bash
npm run db:migrate
npm run typecheck
npm test
npm run build
```

Migrations/typecheck/build aprovados; 178 testes em 6 arquivos aprovados.
Os 155 casos anteriores foram mantidos, ajustando somente expectativas que
exigiam ausência de CREATED ou UPDATED para status, agora substituídas pelas
regras desta Issue. Mais 23 casos cobrem transições, no-op, PATCH misto, coerência,
histórico vazio/404/ordem/metadata e rollback de criação/edição.

Mobile, na raiz:

```bash
npm test -- --runInBand __tests__/taskService.test.ts __tests__/taskUpdateService.test.ts __tests__/taskHistoryService.test.ts __tests__/TaskContext.integration.test.tsx __tests__/EditTaskScreen.integration.test.tsx __tests__/TaskDetailsHistory.integration.test.tsx --silent
```

90 testes em 6 arquivos aprovados, incluindo os 65 anteriores, normalização de
review, conclusão/reabertura/cache/reinício, histórico real/vazio/erro, datas reais,
ausência de atividade fictícia e proteção contra respostas atrasadas.

TypeScript global: mesmos 14 erros antes/depois, comparados por arquivo/código/
mensagem ignorando somente números de linha. Lint de serviços, Context, modelos
e testes alterados aprovado. Nas telas alteradas permanecem 14 erros de hooks
condicionais em EditTaskScreen e quatro avisos inline preexistentes; com os cinco
erros de EditProjectScreen não alterada, a dívida conhecida continua 19.
Falhas antigas do Jest global e quatro alertas moderados conhecidos do Drizzle
Kit permanecem registrados, sem correção fora de escopo.

## Android — validação manual via ADB

AVD Pixel_7 existente, emulator-5554. Metro iniciado com npm start. Primeiro boot
travou; o AVD foi reiniciado com renderização por software, sem wipe de dados,
e o System UI recuperou após aguardar. A API antiga já aberta precisou ser
reiniciada para executar a branch atual; a tarefa criada antes dessa reinicialização
continuou legitimamente com histórico vazio, sem backfill.

Tarefa validada: 53b9c352-2357-474b-a1ce-69a56c3163d5, projeto Desenvolvimento.

1. Criada na Nova Tarefa como Issue7-Android-Validada: CREATED exibido em Atividade
   com createdAt 2026-10-04T10:59:04.578Z.
2. Selecionado Em andamento na edição: PENDING → PARTIAL, STATUS_CHANGED
   2026-10-04T11:03:53.127Z, com from/to reais na tela.
3. Botão Concluir: COMPLETED, done=true, progress=100 e evento
   2026-10-04T11:06:25.643Z. GET confirmou estado e três eventos, sem duplicação.
4. Force-stop/reabertura: Home mostrou a tarefa em Concluídas; Detalhes manteve
   Concluída/100% e consultou histórico real.
5. Botão Reabrir: PENDING, done=false, progress=0, REOPENED
   2026-10-04T11:08:20.405Z.
6. Editados título para Issue7-Android-Editada e descrição para
   Validacao-UPDATED-Issue7: um UPDATED 2026-10-04T11:11:13.641Z com fields
   [title, description]. Os cinco eventos foram exibidos e confirmados por GET.
7. Backend desligado (conexão recusada): tentativa de concluir mostrou
   “Não foi possível alterar o status”; permaneceu A fazer/0%, sem sucesso falso.
8. Force-stop/reabertura offline preservou a tarefa editada no cache da Home;
   Detalhes permaneceu disponível, com falha independente de consulta da atividade.

Após restaurar a API, GET /health, /tasks, /tasks/:id e /tasks/:id/history
retornaram 200; tarefa e histórico permaneceram exatamente iguais aos registrados
antes da tentativa offline. Validação HTTP adicional confirmou POST 201,
PATCH de conclusão 200, PATCH vazio 400 e tarefa inexistente 404, com eventos
CREATED/COMPLETED reais.

Calendário/filtros e funcionalidades de Issues posteriores não foram testados
ou implementados. Arquivos SQLite, dumps, capturas e auxiliares do teste ficaram
fora do versionamento.

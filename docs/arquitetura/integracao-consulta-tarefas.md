# Consulta de tarefas — integração (Issue #5)

Fluxo: SQLite → TasksRepository → TasksService → TasksController → GET /tasks
ou GET /tasks/:id → taskService/api → TaskContext → Home/TaskDetailsScreen.
A implementação ocorre em `feature/5-tasks-read`, com PR para `dev`; a Issue
permanece aberta até integração. O progresso formal da Sprint não é alterado.

## Contrato de leitura

GET /tasks retorna 200 com array de tarefas ativas; banco vazio retorna [].
GET /tasks/:id retorna 200 ou 404 TASK_NOT_FOUND (inexistente/excluída logicamente).
Campos de Task seguem o POST existente, com `project` e `subtasks` derivados
do banco. Não há novo schema/migration, filtros gerais ou paginação.
`projectId` continua sendo a identidade do vínculo; nome/cor/ícone vêm do join,
sem sincronizar a lista geral do ProjectContext. O relacionamento por nome nas
outras telas continua uma limitação registrada para #6/#12.

O adapter compartilhado traduz LOW/MEDIUM/HIGH em low/medium/high e
PENDING/PARTIAL/COMPLETED em todo/in_progress/completed. Mantém datas de calendário
YYYY-MM-DD como ISO local, compatível com as telas atuais. `review` continua
compatível em dados locais e mapeado para PARTIAL na criação; decisão na #7.

## Cache e fonte dos dados

TaskContext começa vazio, sem tarefas de exemplo como fonte operacional.

1. Lê e hidrata `@taskflow:tasks`, preservando a chave e os registros antigos.
2. Consulta GET /tasks uma vez ao montar o provider.
3. Usa ID para atualizar os registros confirmados pela API e adicionar novos,
   mantendo um registro por ID. Campos remotos confirmados prevalecem.
4. Mantém registros que existem apenas no cache, inclusive diante de `[]` remoto.
   Ausência na lista não é tratada como instrução de exclusão nesta Issue.
5. Persiste a lista resultante na fila de AsyncStorage existente.

Falha de rede/HTTP não apaga o cache. Falha de leitura/JSON inválido preserva o
conteúdo original e bloqueia sua sobrescrita nesta sessão, mesmo se a API responder;
os dados remotos ainda podem ser exibidos. Falha de escrita é informada.
Não há upload automático dos registros antigos, comparação de versões, resolução
de conflitos, exclusão reconciliada, fila offline ou sincronização bidirecional.
A política completa é #12. Alterações locais antigas de campos remotos não são
enviadas; na próxima leitura confirmada esses campos refletem novamente o servidor.

Uma resposta GET atrasada não remove tarefas novas inseridas durante a consulta:
a leitura atualiza a lista corrente, preservando os demais IDs.

## Subtarefas e progresso temporários

A consulta carrega subtarefas já persistidas em SQLite, sem criação/edição/exclusão
remota. Lista remota de subtarefas não vazia é exibida; lista vazia/ausente preserva
subtarefas locais da mesma tarefa. Lembretes locais também permanecem no cache.
Ainda não há dados remotos criados por CRUD de subtarefas; implementação será #8.

`progress`, `status` e `done` vêm do valor persistido sem recálculo no GET.
Detalhes usam `progress` persistido quando disponível; tarefas locais antigas sem
esse campo mantêm o cálculo existente pelas subtarefas. Não se recalcula progresso
remoto a partir de filhos somente locais. A definição e integração completas de
conclusão/subtarefas ficam em #7/#8. Os controles locais anteriores são preservados.

## Loading, erro e vazio

Home mostra “Carregando tarefas…” durante hidratação/consulta e continua exibindo
cache já carregado. Erro é apresentado junto à lista preservada; sem erro e sem
pendentes, utiliza o estado vazio existente. Não se altera layout, navegação,
identidade visual, cards fixos de projetos, data/saudação ou recortes do dashboard.

Detalhes utilizam o registro do Context/cache. Se não estiver disponível após a
consulta inicial e houver ID string válido, solicitam `loadTaskById` ao Context,
que chama o service GET /tasks/:id; telas não chamam fetch. Exibem loading, erro ou
ausência no componente de retorno existente, sem alterar o layout da tarefa.
A seção Atividade continua ilustrativa e fixa; não representa histórico real (#7).

## Execução e validação

```bash
cd backend
npm run db:migrate
npm run typecheck
npm test
npm run build
npm run dev
```

Metro na raiz: `npm start`. Android Emulator usa `http://10.0.2.2:3000`,
centralizado em `src/services/api.ts`. Nenhuma dependência nova foi instalada.

Testes focados mobile:

```bash
npm test -- --runInBand __tests__/taskService.test.ts __tests__/TaskContext.integration.test.tsx
```

Backend testa banco vazio, lista ativa, soft-delete, detalhe 200/404, campos SQLite,
projectId, subtarefas persistidas e progress sem recálculo, além de POST/GET e health.
Mobile testa endpoints/mapping, cache/hidratação, sucesso remoto, indisponibilidade,
não duplicação, lista vazia, falhas HTTP/leitura/escrita e resposta GET atrasada.
Os 14 erros globais de TypeScript mobile foram comparados antes/depois: os mesmos
arquivos/códigos/mensagens, somente deslocamentos de linhas nas telas alteradas.
As falhas antigas do Jest global e quatro alertas moderados conhecidos do Drizzle
Kit continuam registrados, sem correção ou instalação nesta Issue.

Não foram antecipadas #6–#12, #20 ou #21. O dashboard completo, calendário e
filtros/ordenação permanecem no planejamento existente.

## Resultados registrados — 2026-10-03

- Backend: `db:migrate`, `typecheck`, `build` aprovados; 110 testes em 4 arquivos aprovados.
- HTTP local: health 200; POST /tasks 201; GET /tasks 200; detalhe existente 200;
  inexistente 404 TASK_NOT_FOUND. Soft-delete e erro 500 cobertos pelos testes.
- Mobile: 37 testes focados em 2 arquivos aprovados; lint dos arquivos alterados
  sem erros, com dois avisos preexistentes de estilos inline em Home/Detalhes.
- TypeScript global: 14 erros antes/depois, mesmas mensagens normalizadas,
  sem erro novo. Jest global antigo não foi corrigido nesta etapa.

### Android Emulator — interação guiada por ADB

O emulador `emulator-5554` estava conectado e o Metro já estava ativo na porta
8081; ambos foram utilizados, sem instalar dependências ou alterar configuração.
O backend foi iniciado após aplicar as migrations de desenvolvimento.

1. Criação pelo formulário atual: tarefa `Issue5-Android-Leitura`, confirmação
   de sucesso e registro SQLite retornado por GET, com UUID e projectId remoto.
2. Tarefa presente na Home; detalhes exibiram título, descrição, projeto Geral,
   datas, horário, prioridade, status e progress=0, sem redesenho.
3. Force-stop e reabertura: tarefa permaneceu na lista.
4. Para comprovar a consulta remota além do cache, foi criada somente pela API
   a tarefa `Issue5-Remota-SemCache`; após nova reabertura apareceu na Home.
5. Backend desligado, com conexão local recusada; force-stop/reabertura mostrou
   a mensagem de falha de consulta e manteve todas as 9 tarefas do cache,
   inclusive as duas tarefas de validação. Nenhuma lista/cache foi apagada.
6. Banco SQLite vazio separado em `/tmp`, com migrations aplicadas: GET /tasks
   retornou 200 []; na reabertura Android não houve erro de consulta e os
   registros locais anteriores continuaram visíveis, conforme a política desta Issue.

O caso de banco remoto vazio preservou o cache do emulador deliberadamente;
não foi feito reset dos dados locais. Cache vazio + resposta vazia foi coberto
nos testes focados, sem tarefas iniciais de exemplo. Bancos e arquivos auxiliares
da validação não são versionados. As tarefas de validação permanecem apenas
no banco/cache locais. O backend temporário foi encerrado ao terminar; o Metro
que já estava ativo foi preservado. Calendário/filtros não foram testados ou implementados.

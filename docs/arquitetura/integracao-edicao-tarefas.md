# Integração de edição de tarefas — Issue #6

Requisito RF03, Issue [#6 — Editar tarefas](https://github.com/AlineRaquelC/gestor-diario/issues/6).
Complementa a criação (#4) e a consulta (#5), sem mudar schema, dependências,
layout, componentes, navegação ou decisões do calendário. A Issue continua aberta
até integração; esta documentação não declara a Sprint concluída.

## Contrato e arquitetura

`EditTaskScreen → TaskContext → taskService → apiRequest → PATCH /tasks/:id →
Controller → Service → Repository → Drizzle → SQLite`.

O PATCH aceita somente title, description, projectId, startDate, dueDate, time,
priority e status. Zod rejeita payload vazio, campos desconhecidos, título/ID
vazio, enums inválidos e horário fora de HH:mm. Description/time podem ser
limpos com null. Campos ausentes, createdAt, favorite e demais dados persistidos
permanecem preservados; updatedAt é atualizado em ISO UTC, inclusive em gravações
rápidas (mínimo de 1 ms após o timestamp anterior).

Sucesso retorna HTTP 200 com a tarefa completa, projeto derivado por relacionamento
e subtarefas persistidas, no contrato de GET. Tarefa ausente ou soft-deleted:
404 TASK_NOT_FOUND / “Tarefa não encontrada.”. Projeto ausente/soft-deleted:
404 PROJECT_NOT_FOUND. Payload/regra inválida: 400 VALIDATION_ERROR. Falha
inesperada segue INTERNAL_ERROR existente. Não há acesso ao banco no Controller.

## Datas e status

O Service valida os dias reais YYYY-MM-DD usando o estado atual combinado com
o payload parcial. Sempre exige prazo >= início. Um início antigo no passado
pode ser preservado, mesmo quando reenviado com o mesmo dia; quando o dia de
início muda, deve ser hoje ou futuro no TASK_TIMEZONE do backend (padrão
America/Sao_Paulo). Isso permite editar tarefas antigas sem forçar mudança de início.
O mobile mantém sua conversão existente entre ISO e dia no fuso do dispositivo,
com validação equivalente no salvar; a API é a autoridade final.

Mapeamentos reutilizados: low/medium/high ↔ LOW/MEDIUM/HIGH;
todo/in_progress/completed ↔ PENDING/PARTIAL/COMPLETED. A compatibilidade existente
review → PARTIAL permanece; a semântica de review pertence à #7. Ao mudar status
explicitamente, done acompanha COMPLETED; sem subtarefas persistidas, usa a regra
existente de progresso 100/0. Não recalcula o progresso de subtarefas (#8).

## Projeto por identidade

A seleção usa ID do ProjectContext, nunca igualdade de nome. Antes do PATCH,
o Context reutiliza a resolução da #4: remoteId quando disponível, consulta por
ID local quando necessário e provisionamento somente do projeto selecionado
quando ele ainda não existe remotamente. O remoteId obtido é guardado no
ProjectContext; não há sincronização geral ou associação por nome.

O payload envia o ID remoto em projectId. A API valida o projeto ativo na mesma
transação da edição. A resposta atualiza projectId e o nome de exibição derivado
de project, evitando manter o vínculo antigo ao trocar projeto. Projetos homônimos
continuam distintos. Se o projeto remoto atual ainda não consta no ProjectContext,
o seletor preserva essa opção real com seu ID/nome retornados pela API, sem
importar/sincronizar uma lista de projetos. Tarefas antigas somente locais sem
registro remoto não são enviadas automaticamente: migração/sincronização fica em #12.

## Confirmação, estado e cache

updateTask aguarda a resposta da API antes de substituir a tarefa por ID no
estado e persistir no AsyncStorage. Não cria duplicatas nem faz update otimista.
Uma consulta GET antiga em andamento não substitui uma edição confirmada com
updatedAt mais recente. A hidratação/cache e leitura remota da #5 são mantidas.

A tela mantém os campos, DateTimePickers, cores e navegação existentes. Durante
o envio, Salvar fica desabilitado e mostra “Salvando…”. Sucesso aparece somente
após resposta; confirmação do usuário retorna para Detalhes, refletindo também
na Home. Se PATCH falha, a tela informa erro, mantém o formulário e não navega
como se estivesse salvo; estado/cache da tarefa anterior ficam preservados.
Não há fila offline, retry automático de PATCH ou sincronização bidirecional (#12).

Se a API confirma e a escrita no cache falha, o estado exibe a versão confirmada
e o aviso distingue salvamento remoto de falha local, sem repetir a operação.
Se o provisionamento do projeto for confirmado antes de um PATCH falhar, seu
remoteId pode permanecer no cache de projetos; isso não confirma edição da tarefa.

## Subtarefas e histórico: limite desta Issue

Subtarefas editadas na tela permanecem locais e só são aplicadas após confirmação
do PATCH principal. Não entram no payload e não há CRUD remoto (#8). Resposta
remota sem filhos preserva os filhos locais, conforme o adapter da #5. As operações
locais já existentes em Detalhes/Editar Projeto usam updateTaskLocal, preservando
seu comportamento sem transformá-las em PATCH de subtarefas ou sync de projetos.

Para rastreabilidade mínima do critério da #6, cada PATCH persistido grava somente
UPDATED na tabela task_history existente, com taskId, createdAt e metadata.fields
(nomes dos campos efetivamente alterados, sem copiar conteúdo). Atualização e
evento são atômicos na mesma transação SQLite IMMEDIATE; falha no evento desfaz
a atualização. Reenvio sem alteração de valores pode registrar fields vazio.
Não são gerados CREATED, STATUS_CHANGED, COMPLETED, REOPENED, DELETED ou RESTORED.
Não há tela/endpoint de histórico; a seção Atividade fixa existente foi preservada
e não representa este evento real. O sistema completo permanece em #7/#10.

## Validações automáticas

Backend, a partir de backend/:

```bash
npm run db:migrate
npm run typecheck
npm test
npm run build
```

Mobile, a partir da raiz, sem alterar configuração global:

```bash
npm test -- --runInBand __tests__/taskService.test.ts __tests__/taskUpdateService.test.ts __tests__/TaskContext.integration.test.tsx __tests__/EditTaskScreen.integration.test.tsx --silent
```

- Migrations, typecheck e build backend aprovados; 155 testes em 5 arquivos aprovados
  (110 anteriores + 45 de atualização).
- Mobile: 65 testes focados em 4 arquivos aprovados, incluindo adapters, PATCH
  parcial, projeto por ID, confirmação/erro da tela, cache/reabertura, falha de
  escrita, requisições concorrentes, GET antigo e ausência de duplicatas.
- HTTP local: health 200; POST 201; lista 200; detalhe 200; PATCH parcial 200;
  PATCH inválido 400; PATCH inexistente 404 TASK_NOT_FOUND; POST → PATCH → GET
  confirmado. Soft-delete, projeto inativo, datas e rollback cobertos com SQLite
  isolado nos testes.
- TypeScript mobile: os mesmos 14 erros globais antes/depois, comparados por
  arquivo/código/mensagem ignorando apenas deslocamento de linha.
- Lint dos serviços/contexto e testes alterados aprovado. Nas telas alteradas,
  persistem 19 erros preexistentes de hooks condicionais (14 EditTaskScreen,
  5 EditProjectScreen) e 4 avisos de estilos inline; comparação com dev não
  identificou novos erros. Não foram refatoradas telas para resolver essa dívida.
- Falhas antigas do Jest global e quatro alertas moderados conhecidos do Drizzle
  Kit permanecem registrados. Nenhuma dependência foi instalada.

## Android Emulator — validação manual via ADB

Foi utilizado emulator-5554 e Metro já ativo, após aplicar migrations. Na tarefa
remota fc18dd8e-19b3-4974-bf4e-6a154449663c:

1. Editados título para Issue6-Android-Editada, descrição para
   Validacao-Issue6-Descricao, prioridade para Alta, prazo para 05/10/2026 e
   projeto de Geral para Desenvolvimento, mantendo início 03/10/2026.
2. Salvar mostrou “Salvando…” e depois confirmação de sucesso. Detalhes e Home
   exibiram imediatamente os valores novos, usando a apresentação existente.
3. Force-stop e reabertura mantiveram a edição na Home/Detalhes. GET /tasks/:id
   confirmou os mesmos campos no SQLite, projectId remoto
   5cbf2df5-63a3-42f1-94ad-b0b5a1526262, createdAt preservado
   2026-10-03T23:42:06.291Z e updatedAt 2026-10-04T01:31:41.890Z.
4. API desligada e conexão recusada: tentativa de trocar título para
   Issue6-OFFLINE-NAO-SALVAR mostrou “Não foi possível salvar”, sem confirmação
   de sucesso nem navegação automática.
5. Novo force-stop/reabertura ainda offline: Home informou falha de consulta
   e manteve o cache; Detalhes exibiu a última versão confirmada, incluindo
   título, descrição, prioridade, prazo e projeto anteriores à tentativa rejeitada.
6. API restaurada; GET retornou objeto idêntico ao registrado antes da falha.
   Também validado POST → PATCH parcial → GET em uma tarefa de teste pela API.

Não foram testados/implementados calendário, filtros, dashboard completo,
sincronização geral ou funcionalidades de Issues posteriores.

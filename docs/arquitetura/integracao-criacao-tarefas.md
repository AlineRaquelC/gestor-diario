# Criação de tarefas — integração inicial (Issue #4)

Fluxo: NewTaskScreen → TaskContext → taskService → POST /tasks → Controller →
Service → Repository → Drizzle/SQLite. A tela mantém seu layout e validações.
Este registro descreve o estado da Issue #4; operações locais anteriores continuam
locais naquela etapa. A evolução de leitura na Issue #5 está documentada em
[integracao-consulta-tarefas.md](integracao-consulta-tarefas.md). Não há sincronização
geral ou mudanças do dashboard completo.

## Execução Android

Dentro de backend/, execute npm run db:migrate e npm run dev. Na raiz, execute
npm start e abra o app de desenvolvimento no emulador. A URL está centralizada
em src/services/api.ts: http://10.0.2.2:3000. Esse endereço acessa o host Linux
pelo Android Emulator; localhost apontaria para o próprio emulador.
Para dispositivo físico, altere somente API_BASE_URL para o IP LAN do host,
com a porta 3000 acessível. HTTP é para desenvolvimento local.
TASK_TIMEZONE do backend deve corresponder ao calendário utilizado pelo usuário;
o padrão é America/Sao_Paulo. Datas são serializadas pelo adapter com componentes
locais, sem usar toISOString().slice(0, 10).

## Projeto e adapter

A seleção da tela usa o ID do ProjectContext, preservando o nome para apresentação.
Como projetos locais antigos ainda não existem no servidor, taskService consulta
/projects/:id e, somente se receber 404, cria **apenas o projeto selecionado** por
POST /projects. O ID retornado fica em Project.remoteId e no AsyncStorage para
reutilização. Se remoteId já existe, ele é usado diretamente; erro 404 de um
projeto remoto excluído é apresentado, sem recriação automática. Não há associação
por nome nem sincronização da lista inteira. A criação de projeto pode permanecer
no servidor se a criação da tarefa falhar; seu ID é reutilizado ao tentar novamente.

Prioridades: low/medium/high ↔ LOW/MEDIUM/HIGH. Status: todo → PENDING,
in_progress/review → PARTIAL, completed → COMPLETED. Na volta, PARTIAL vira
in_progress (review não é um status separado no backend). Datas YYYY-MM-DD são
convertidas em ISO local para preservar compatibilidade com as telas atuais.
Subtarefas e lembretes continuam somente no cache; não são enviados ao POST.

## Cache e falhas

Não há inserção otimista: a tarefa retornada pela API é o registro final, com
seu UUID. TaskContext atualiza o estado e persiste @taskflow:tasks antes de retornar
sucesso. A hidratação protege dados anteriores e as escritas são enfileiradas.
Reabrir o app restaura o cache sem exigir GET /tasks. ProjectProvider envolve
TaskProvider para disponibilizar o projeto selecionado e seu ID remoto.

A tela bloqueia envios concorrentes e mostra erro sem navegar se a API falhar.
Não há retry automático ou fila offline. Timeout/falha de conexão informa que
não foi possível confirmar o salvamento; uma resposta perdida depois de um commit
no servidor pode exigir conferência manual, pois idempotência/sincronização geral
não fazem parte desta Issue. Falha de cache após sucesso remoto é informada como
aviso de tarefa já salva; não é tratada como falha do POST para evitar duplicação.

## Validações focadas

Na raiz:

```bash
npm test -- --runInBand __tests__/taskService.test.ts __tests__/TaskContext.integration.test.tsx
```

Os testes cobrem mapeamento, datas locais, chamadas HTTP, falhas, criação única,
AsyncStorage e reabertura. O Jest global e o TypeScript do mobile já possuíam
falhas em telas/testes antigos antes desta Issue; não foram refatorados aqui.

## Validação manual Android — 2026-10-03

Teste realizado no **Android Emulator**, conforme resultados confirmados:

- Backend iniciado localmente, com migrations SQLite aplicadas.
- `GET /health` funcionando.
- Criação de projeto funcionando.
- Criação de tarefa pelo aplicativo funcionando; `POST /tasks` persistindo no SQLite.
- Tarefa visível na Home após a criação.
- Após force-stop/fechar e reabrir o aplicativo, a tarefa permaneceu pelo cache; AsyncStorage preservado.
- Com o backend desligado, a tentativa de criação foi rejeitada corretamente e o aplicativo informou erro.
- Nenhuma falsa confirmação de salvamento.

**Resultado:** teste manual aprovado para o fluxo de criação da Issue #4.
A reabertura valida o cache local; GET de Tasks e sincronização geral continuam pendentes.
As [dívidas técnicas registradas na Sprint](../sprints/sprint-1.md#dívidas-técnicas-e-funcionalidades-pendentes) permanecem sem correção nesta tarefa.

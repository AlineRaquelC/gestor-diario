# Auditoria Front-end — MVP

## Resumo executivo

Auditoria documental de 2026-10-03, sobre `dev` no commit `f70e8bbaeaa5bc5ed89cabdef8bf538d8f338650`, antes da Issue #5. **Nenhum código, tela, biblioteca, configuração ou fluxo foi alterado.** A Issue #5 permanece não iniciada.

O Front possui formulários e fluxos locais relevantes de tarefas/projetos, detalhes, subtarefas, confirmação de exclusão e cache. A criação de tarefas usa a API e já possui validação manual Android registrada. O MVP ainda tem gaps reais em desfazer, histórico, observações, calendário de tarefas, filtros, ordenação, indicadores por período e integridade dos vínculos de projetos.

A existência de tela não foi usada como prova de atendimento: `CalendarScreen.tsx` é uma tela provisória “Nova Tarefa”; a seção Atividade usa eventos fixos; cards de projetos da Home são fixos. Essas constatações não autorizam reconstruir o Front.

### Fontes e método

Fontes oficiais lidas integralmente:

- [Requisitos oficiais](../requisitos/requisitos-oficiais.md).
- [Product Backlog](../backlog/backlog-produto.md).
- [Entregas](../backlog/entregas.md).
- [Sprint 1](../sprints/sprint-1.md).

Escopo de julgamento: **Entrega 1, PBIs 01–11**; RF01, RF03–RF07, RF09–RF12, RF17, RF20, RF23, RF48 e RF50, mais identidade e critérios transversais do planejamento. PBI-05 e PBI-10 pertencem ao MVP, embora fora do compromisso inicial da Sprint 1; PBI-07 consta fora da seleção inicial da Sprint, mas tem Issue #9 planejada. A auditoria não altera esse planejamento.

Foram inspecionados todos os arquivos de `src/screens`, `src/components`, `src/context`, `src/services`, `App.tsx`, navegação, registro do app, metadados de identidade Android/iOS e testes mobile existentes. Busca por filtros/ordenação/notas/undo/loading complementou a leitura dos fluxos. As evidências citam arquivo, linha e símbolo/conteúdo no snapshot auditado.

**Limites:** análise estática, sem executar app, backend, migrations, build ou testes nesta tarefa. “ATENDIDO” indica cobertura demonstrável no código para a capacidade específica do Front; não certifica o PBI inteiro, estabilidade global ou integração ainda não implementada. O teste Android anterior é evidência histórica explicitamente confirmada, sem extrapolação para os demais fluxos.

Não se avaliam como gaps do MVP autenticação, notificações, recorrência, tema, acessibilidade avançada, favoritos, busca textual, arrastar e soltar, hardware ou recursos das Entregas 2/3. Login e Configurações foram inspecionados por sua navegação, sem impor autenticação ou funcionalidades dessas entregas.

## Cobertura geral

Unidade da métrica: cada linha F01–F52 da matriz detalhada; itens têm peso igual e não representam número de requisitos nem de Issues.

| Classificação | Quantidade |
|---|---:|
| ATENDIDO | 21 |
| PARCIALMENTE ATENDIDO | 16 |
| NÃO ATENDIDO | 15 |
| Total de itens de Front auditados | 52 |

**Cobertura estrita:** 21/52 = 40,4% integralmente atendidos. **Cobertura aproximada ponderada:** (ATENDIDO + 0,5 × PARCIAL)/total = **55,8%**. O peso 0,5 é uma convenção desta auditoria, não uma medida de esforço restante. Não é uma cobertura de testes.

Essas métricas **não substituem o progresso formal da Sprint: 4/13 = 30,8%**, nem modificam o status das Issues #1–#4 concluídas e #5–#13 pendentes. Entrega 1 continua em andamento. Três responsabilidades exclusivas de Backend/Banco são classificadas separadamente como NÃO APLICÁVEL AO FRONT e excluídas dos cálculos.

### Síntese por PBI — somente parcela de Front

| PBI | Requisito | Status do Front | Fundamentação |
|---|---|---|---|
| PBI-01 | RF01 | ATENDIDO | Formulário, campos, validações, mensagens e criação integrada; ressalvas do horário/hidratação registradas transversalmente |
| PBI-02 | RF03 | PARCIALMENTE ATENDIDO | Campos editáveis localmente; falta última modificação e há incoerência de projectId |
| PBI-03 | RF04 | PARCIALMENTE ATENDIDO | Exclusão e confirmação existem; desfazer ausente |
| PBI-04 | RF05/RF17 | PARCIALMENTE ATENDIDO | Conclusão reativa; estados divergentes e histórico fixo |
| PBI-05 | RF06/RF07 | PARCIALMENTE ATENDIDO | Lista com horário; sem recorte diário, agrupamentos, semana/mês ou destaques calculados |
| PBI-06 | RF09/RF10 | ATENDIDO | Criar/remover/marcar e calcular proporção de subtarefas localmente; regra sem subtarefas exige alinhamento |
| PBI-07 | RF11 | NÃO ATENDIDO | Não há notas independentes datadas |
| PBI-08 | RF12 | PARCIALMENTE ATENDIDO | CRUD visual local e recorte por categoria; problemas de vínculo e exclusão |
| PBI-09 | RF23 | PARCIALMENTE ATENDIDO | Contagens reativas coexistem com mocks; falta atraso/período |
| PBI-10 | RF48/RF50 | PARCIALMENTE ATENDIDO | Recortes implícitos por conclusão/projeto; filtros completos e ordenação ausentes |
| PBI-11 | RF20 | PARCIALMENTE ATENDIDO | HTTP/cache disponíveis para criar; fluxo manual geral ausente |

As ressalvas de integração não rebaixam isoladamente uma capacidade visual/local atendida. Exemplo: F10 atende edição dos campos localmente mesmo sem PATCH; F11 não atende timestamp e F32 só atende parcialmente o vínculo.

## Matriz requisito/PBI x Front

| PBI | Requisito | Funcionalidade | Status | Evidência no código | Gap | Ação recomendada |
|---|---|---|---|---|---|---|
| Transversal | Identificação do produto | F01 — Nome visível Android | ATENDIDO | [app.json:3](../../app.json#L3) — displayName Gestor Diário; strings.xml e Login concordam | Nenhum no Android | Preservar identificadores técnicos |
| PBI-01 | RF01 | F02 — Criação de tarefas | ATENDIDO | [src/screens/NewTaskScreen.tsx:290](../../src/screens/NewTaskScreen.tsx#L290) — handleSubmit aguarda addTask e apresenta sucesso/erro | Nenhum no fluxo auditado da criação | Preservar fluxo da Issue #4 |
| PBI-01 | RF01 | F03 — Título obrigatório | ATENDIDO | [src/screens/NewTaskScreen.tsx:292](../../src/screens/NewTaskScreen.tsx#L292) — trim, validação e Alert | Nenhum | Preservar |
| PBI-01 | RF01 | F04 — Descrição | ATENDIDO | [src/screens/NewTaskScreen.tsx:531](../../src/screens/NewTaskScreen.tsx#L531) — TextInput multiline e envio de description | Nenhum para descrição simples | Não confundir com notas RF11 |
| PBI-01 | RF01 | F05 — Data de início | ATENDIDO | [src/screens/NewTaskScreen.tsx:644](../../src/screens/NewTaskScreen.tsx#L644) — DateTimePicker, minimumDate hoje e validação no envio | Nenhum na criação | Preservar DateTimePicker |
| PBI-01 | RF01 | F06 — Prazo | ATENDIDO | [src/screens/NewTaskScreen.tsx:699](../../src/screens/NewTaskScreen.tsx#L699) — DateTimePicker, minimumDate e validação prazo >= início | Nenhum na criação | Preservar DateTimePicker |
| PBI-01/02 | Campo do planejamento | F07 — Horário | PARCIALMENTE ATENDIDO | [src/screens/NewTaskScreen.tsx:743](../../src/screens/NewTaskScreen.tsx#L743) — TextInput livre, time enviado à API e exibido em detalhes | Sem validação local HH:mm; edição local aceita texto inválido | Complementar validação no fluxo da #6; manter controle atual |
| PBI-01 | RF01 | F08 — Prioridade | ATENDIDO | [src/screens/NewTaskScreen.tsx:29](../../src/screens/NewTaskScreen.tsx#L29) — Baixa, Média e Alta selecionáveis; adapter LOW/MEDIUM/HIGH | Nenhum para níveis do MVP | Preservar opções |
| PBI-01 | RF01 | F09 — Validações e mensagens na criação | ATENDIDO | [src/screens/NewTaskScreen.tsx:290](../../src/screens/NewTaskScreen.tsx#L290) — Alerts para título, projeto, início, prazo e falha da API | Validação de horário fica em F07 | Preservar feedback existente |
| PBI-02 | RF03 | F10 — Edição visual/local dos campos | ATENDIDO | [src/screens/EditTaskScreen.tsx:314](../../src/screens/EditTaskScreen.tsx#L314) — saveChanges atualiza título, descrição, datas, horário, prioridade, projeto, status e subtarefas | Integração PATCH é pendência separada; identidade do vínculo em F32 | Integrar via #6 sem redesenhar formulário |
| PBI-02 | RF03 | F11 — Última modificação | NÃO ATENDIDO | [src/context/TaskContext.tsx:468](../../src/context/TaskContext.tsx#L468) — updateTask apenas mescla campos; saveChanges não grava updatedAt | Timestamp da criação remota fica desatualizado após edição; sem apresentação da última alteração | Tratar na #6 e #7 |
| PBI-01/02 | Consulta do planejamento | F12 — Detalhes de tarefa | PARCIALMENTE ATENDIDO | [src/screens/TaskDetailsScreen.tsx:31](../../src/screens/TaskDetailsScreen.tsx#L31) — Busca no Context e exibe campos, status e subtarefas | Atividade fixa, sem leitura remota; progresso sem subtarefas incoerente | Manter tela; complementar #5/#7/#8 |
| PBI-03 | RF04 | F13 — Exclusão local de tarefa | ATENDIDO | [src/context/TaskContext.tsx:432](../../src/context/TaskContext.tsx#L432) — deleteTask remove por ID; telas voltam à Home | Exclusão remota separada, ainda pendente | Integrar #10 preservando ações atuais |
| PBI-03 | RF04 | F14 — Confirmação de exclusão | ATENDIDO | [src/screens/TaskDetailsScreen.tsx:146](../../src/screens/TaskDetailsScreen.tsx#L146) — Alert com Cancelar e Excluir; também na edição | Nenhum na confirmação | Preservar |
| PBI-03 | RF04 | F15 — Desfazer exclusão | NÃO ATENDIDO | [src/context/TaskContext.tsx:432](../../src/context/TaskContext.tsx#L432) — Remoção direta do array; edição diz ação não pode ser desfeita | Sem retenção, janela ou ação de restauração | Issue #10 existente |
| PBI-04 | RF05 | F16 — Alternar conclusão e atualizar lista | ATENDIDO | [src/context/TaskContext.tsx:403](../../src/context/TaskContext.tsx#L403) — toggleTask altera done/status e Context atualiza consumidores | Histórico e coerência com subtarefas são itens separados | Preservar interação; completar #7/#8 |
| PBI-04 | RF05 | F17 — Estados oficiais | PARCIALMENTE ATENDIDO | [src/screens/EditTaskScreen.tsx:58](../../src/screens/EditTaskScreen.tsx#L58) — todo/in_progress/review/completed; adapter tem três estados oficiais | Revisão se perde no POST; pendente/parcial usam outros rótulos | Decidir semântica na #7; aguardando decisão |
| PBI-04 | RF17 | F18 — Histórico real na interface | NÃO ATENDIDO | [src/screens/TaskDetailsScreen.tsx:487](../../src/screens/TaskDetailsScreen.tsx#L487) — ActivityRow com eventos e horários fixos para qualquer tarefa | Nenhuma coleção/evento real de histórico no mobile | Issue #7; preservar seção Atividade |
| PBI-05 | RF06 | F19 — Visualização diária | PARCIALMENTE ATENDIDO | [src/screens/HomeScreen.tsx:38](../../src/screens/HomeScreen.tsx#L38) — Home lista pendentes/concluídas com horário | Sem recorte por data; Hoje/Progresso de hoje usam todas as tarefas | Complementar PBI-05 e #11 sem trocar layout |
| PBI-05 | RF06 | F20 — Agrupamento manhã/tarde/noite | NÃO ATENDIDO | [src/screens/HomeScreen.tsx:237](../../src/screens/HomeScreen.tsx#L237) — pendingTasks.map sem agrupamento por horário | Períodos do dia inexistentes | Complementar solução atual do PBI-05 |
| PBI-05 | RF07 | F21 — Visualização semanal | NÃO ATENDIDO | [src/screens/CalendarScreen.tsx:5](../../src/screens/CalendarScreen.tsx#L5) — Rota abre placeholder Nova Tarefa/Voltar | Nenhuma semana ou lista semanal implementada nessa rota | Confirmar decisão de calendário e complementar PBI-05 |
| PBI-05 | RF07 | F22 — Visualização mensal | NÃO ATENDIDO | [src/screens/CalendarScreen.tsx:5](../../src/screens/CalendarScreen.tsx#L5) — Sem grade de mês ou consulta de tarefas | Selecionar data no formulário não constitui visão mensal de tarefas | Complementar PBI-05 mantendo solução aprovada |
| PBI-05 | RF07 | F23 — Destaque de prazo próximo | NÃO ATENDIDO | [src/screens/TaskDetailsScreen.tsx:293](../../src/screens/TaskDetailsScreen.tsx#L293) — Prazo usa accent vermelho constante | Sem comparação de datas ou janela de proximidade | Definir janela e completar PBI-05 sem alterar identidade visual |
| PBI-05 | RF07 | F24 — Destaque de tarefa atrasada | NÃO ATENDIDO | [src/screens/HomeScreen.tsx:42](../../src/screens/HomeScreen.tsx#L42) — Urgentes são prioridade high; cards não comparam dueDate com hoje | Nenhuma indicação calculada de atraso | #11 para indicador; PBI-05 para calendário |
| PBI-06 | RF09 | F25 — Criar e remover subtarefas | ATENDIDO | [src/screens/EditTaskScreen.tsx:279](../../src/screens/EditTaskScreen.tsx#L279) — handleAddSubtask/removeSubtask; criação também suporta lista | Persistência remota é separada; rename individual não existe e não é exigência de RF09 | Integrar na #8 preservando controles |
| PBI-06 | RF09 | F26 — Acompanhar conclusão individual | ATENDIDO | [src/screens/TaskDetailsScreen.tsx:118](../../src/screens/TaskDetailsScreen.tsx#L118) — toggleSubtask atualiza done; UI Feita/Pendente | Nenhum no fluxo local individual | Preservar; integrar #8 |
| PBI-06 | RF10 | F27 — Percentual a partir de subtarefas | ATENDIDO | [src/screens/TaskDetailsScreen.tsx:61](../../src/screens/TaskDetailsScreen.tsx#L61) — round(doneCount/subtasks.length*100), barra e contador reativos | RF10 atendido para tarefas com subtarefas; regra sem subtarefas em F28 | Preservar cálculo e validar #8 |
| PBI-06/04 | RF10/RF05; regra Sprint | F28 — Coerência status/progresso | PARCIALMENTE ATENDIDO | [src/screens/TaskDetailsScreen.tsx:67](../../src/screens/TaskDetailsScreen.tsx#L67) — Sem subtarefas resulta 0%; toggleTask independente dos filhos | Tarefa concluída pode mostrar 0%/Em progresso; 100% não conclui status | Decidir regra nas #7/#8 |
| PBI-07 | RF11 | F29 — Múltiplas observações datadas | NÃO ATENDIDO | [src/context/TaskContext.tsx:33](../../src/context/TaskContext.tsx#L33) — Task possui description, subtasks e reminders; nenhuma coleção de notas | Sem adicionar/listar notas independentes ou createdAt por observação | Issue #9 existente |
| PBI-08 | RF12 | F30 — Criar projeto/categoria | ATENDIDO | [src/screens/CreateProjectScreen.tsx:59](../../src/screens/CreateProjectScreen.tsx#L59) — Nome obrigatório, descrição, cor, ícone, preview e addProject | Backend geral é separado | Preservar formulário |
| PBI-08 | RF12 | F31 — Editar projeto | ATENDIDO | [src/screens/EditProjectScreen.tsx:124](../../src/screens/EditProjectScreen.tsx#L124) — Edita nome, descrição, cor e ícone; propaga renomeação por nome | Integridade por identidade em F32/F34; atualização remota pendente | Preservar tela; integrar #12 |
| PBI-08 | RF12 | F32 — Vínculo tarefa → projeto | PARCIALMENTE ATENDIDO | [src/services/taskService.ts:39](../../src/services/taskService.ts#L39) — Criação guarda projectId remoto; edição/listas usam project nome | Trocar categoria na edição não atualiza projectId; nomes iguais mesclam tarefas | #6/#12 e correção de integridade de projetos |
| PBI-08 | RF12 | F33 — Detalhes/listagem de projeto | ATENDIDO | [src/screens/ProjectDetailsScreen.tsx:68](../../src/screens/ProjectDetailsScreen.tsx#L68) — Lista tarefas da categoria, dados, contadores e links para detalhes | Consulta usa nome; integridade é classificada em F32 | Preservar apresentação |
| PBI-08 | RF12; segurança Sprint | F34 — Exclusão segura de projeto | PARCIALMENTE ATENDIDO | [src/screens/ProjectDetailsScreen.tsx:88](../../src/screens/ProjectDetailsScreen.tsx#L88) — Confirmação existe; detalhes remove projeto direto; edição move nomes para Geral | Dois caminhos divergentes; tarefas órfãs e IDs antigos; Geral pode não existir | Decidir política; correção específica, integrar #12 |
| PBI-08 | Planejamento RF12 | F35 — Cor e ícone de projeto | ATENDIDO | [src/screens/CreateProjectScreen.tsx:17](../../src/screens/CreateProjectScreen.tsx#L17) — Paletas/ícones selecionáveis, preview e armazenamento no Context | Nenhum para atributos de apresentação | Preservar cores e componentes |
| PBI-08/10 | RF12/RF48 | F36 — Filtro por projeto/categoria | PARCIALMENTE ATENDIDO | [src/screens/ProjectDetailsScreen.tsx:68](../../src/screens/ProjectDetailsScreen.tsx#L68) — Detalhe de projeto filtra task.project === project.name | Recorte por categoria existe; sem filtro geral estável por ID/etiqueta | Complementar PBI-10; decidir uso de projetos como categorias |
| PBI-09 | RF23 | F37 — Contagens de pendentes/concluídas | ATENDIDO | [src/screens/HomeScreen.tsx:34](../../src/screens/HomeScreen.tsx#L34) — filters sobre Context; percentagem calculada e reativa | Recorte de período e dados iniciais são itens separados | Preservar cálculos e completar #11 |
| PBI-09 | RF23 | F38 — Dashboard completo com dados reais | PARCIALMENTE ATENDIDO | [src/screens/HomeScreen.tsx:187](../../src/screens/HomeScreen.tsx#L187) — Tarefas do Context; cards de projetos fixos 7/15, 3/8, 2/6 | Projetos mockados, data/saudação fixas e seeds no primeiro uso | Issue #11; separar exemplos dos dados efetivos |
| PBI-09 | RF23 | F39 — Estatísticas por período e atrasadas | NÃO ATENDIDO | [src/screens/HomeScreen.tsx:34](../../src/screens/HomeScreen.tsx#L34) — Cálculos globais; Urgentes por prioridade | Sem período selecionável/recorte diário e sem quantidade atrasada | Issue #11 existente |
| PBI-10 | RF48 | F40 — Filtro por status | PARCIALMENTE ATENDIDO | [src/screens/HomeScreen.tsx:34](../../src/screens/HomeScreen.tsx#L34) — Separação done/!done | Sem seleção de pendente/parcial/concluída; revisão não filtrável | Complementar PBI-10 e decisão #7 |
| PBI-10 | RF48 | F41 — Filtro por prioridade | NÃO ATENDIDO | [src/screens/HomeScreen.tsx:42](../../src/screens/HomeScreen.tsx#L42) — Contagem Urgentes não filtra lista | Sem controle para selecionar prioridades | Complementar PBI-10 |
| PBI-10 | RF48 | F42 — Filtro por etiqueta | NÃO ATENDIDO | [src/context/TaskContext.tsx:33](../../src/context/TaskContext.tsx#L33) — Modelo só possui project/projectId; sem tags | Sem etiqueta ou filtro correspondente | Decidir se categoria/projeto cobre alternativa RF12 e como cumprir RF48 |
| PBI-10 | RF48 | F43 — Filtro por período | NÃO ATENDIDO | [src/screens/HomeScreen.tsx:237](../../src/screens/HomeScreen.tsx#L237) — Listas sem predicate de datas | Nenhum filtro de intervalo | Complementar PBI-10 |
| PBI-10 | RF50 | F44 — Ordenação com critérios/direção | NÃO ATENDIDO | [src/screens/HomeScreen.tsx:237](../../src/screens/HomeScreen.tsx#L237) — map preserva ordem do array; sem sort/controlador | Sem prioridade/prazo ou direção ascendente/descendente | Complementar PBI-10; não adicionar drag-and-drop de Entrega 2 |
| Transversal | TEC-07; UX Sprint | F45 — Loading de criação/hidratação | PARCIALMENTE ATENDIDO | [src/screens/NewTaskScreen.tsx:1307](../../src/screens/NewTaskScreen.tsx#L1307) — Botão desabilitado com saving e texto Salvando; addTask verifica hydrated | Home/Projetos mostram seeds antes de hidratar; sem loading/retry geral | #5/#12: aproveitar estados atuais; sem novo desenho |
| Transversal | RF01/TEC-07 | F46 — Erros de rede e armazenamento | PARCIALMENTE ATENDIDO | [src/screens/NewTaskScreen.tsx:427](../../src/screens/NewTaskScreen.tsx#L427) — Alert de erro remoto/aviso de cache; apiRequest timeout 15s | Erros de hidratação/CRUD local só console; sucesso local antes da escrita | Completar feedback nas #6/#10/#12 |
| Transversal | UX do planejamento | F47 — Estados vazios e não encontrado | PARCIALMENTE ATENDIDO | [src/screens/TaskDetailsScreen.tsx:36](../../src/screens/TaskDetailsScreen.tsx#L36) — Tarefa ausente, Sem descrição, Sem subtarefas; Home e projeto vazio | Lista de projetos vazia sem mensagem; hidratação pode parecer ausência | Completar #5/#12 preservando componentes |
| Transversal | TEC-05/RF20 | F48 — Persistência local | PARCIALMENTE ATENDIDO | [src/context/TaskContext.tsx:346](../../src/context/TaskContext.tsx#L346) — AsyncStorage hidrata e salva; tarefas com fila de escrita | Outras mutações não aguardam gravação; JSON sem validação; erro de leitura pode sobrescrever cache com seeds | Tratar recuperação/feedback na #12; preservar chaves/dados |
| PBI-01/11 | RF01/RF20 | F49 — Integração de criação API | ATENDIDO | [src/services/taskService.ts:66](../../src/services/taskService.ts#L66) — POST /tasks; GET de projeto e POST seletivo; adapter e UUID remoto | Nenhum no fluxo #4; não representa sync geral | Preservar services e criação confirmada |
| PBI-11 | RF20 | F50 — Sincronização manual geral | NÃO ATENDIDO | [src/services/taskService.ts:51](../../src/services/taskService.ts#L51) — Só resolveProject/createTask; nenhum botão/fluxo de sync | Sem reconciliar servidor/cache, progresso ou resultado de sync | Issue #12 existente |
| Transversal | RF20; validação Sprint | F51 — Fechar/reabrir e consistência | PARCIALMENTE ATENDIDO | [src/context/TaskContext.tsx:346](../../src/context/TaskContext.tsx#L346) — Restaura cache; teste manual anterior confirmou criação e reabertura | Sem comprovação atual de todos os CRUDs; reabertura não reconcilia edições/exclusões com SQLite | Manter evidência confirmada; validar #6/#10/#12 |
| Transversal | Fluxos do planejamento | F52 — Navegação existente | PARCIALMENTE ATENDIDO | [src/navigation/AppNavigator.tsx:60](../../src/navigation/AppNavigator.tsx#L60) — Stack, IDs nas rotas, bottom navigation e goBack/reset | Calendário/Config abrem Nova Tarefa; risco de hooks condicionais nas edições | Preservar stack; complementar PBI-05 e validar #6/#12 |

### Responsabilidades fora da avaliação do Front

| PBI | Requisito | Funcionalidade | Status | Evidência no código | Gap | Ação recomendada |
|---|---|---|---|---|---|---|
| PBI-01/TEC-02/03 | RF01; planejamento | Aplicar migrations e garantir schema SQLite | NÃO APLICÁVEL AO FRONT | [README backend](../../backend/README.md#sqlite-e-migrations) | Responsabilidade de Backend/Banco | Manter execução explícita de db:migrate |
| PBI-02/03 | RF03/RF04 | Implementar endpoints PATCH/DELETE de Tasks | NÃO APLICÁVEL AO FRONT | [API atual](../../backend/README.md#criar-tarefas--post-tasks) documenta somente POST | Endpoints pendentes, sem inferir que telas locais não existem | Issues #6/#10; conectar Front quando disponíveis |
| PBI-04/06/07 | RF17/RF09/RF11 | Persistir histórico/subtarefas/notas no servidor | NÃO APLICÁVEL AO FRONT | [Integração atual](../arquitetura/integracao-criacao-tarefas.md#projeto-e-adapter) | Persistência remota ainda pendente; UI avaliada na matriz | Issues #7/#8/#9 |

## Funcionalidades atendidas

Itens classificados ATENDIDO: F01, F02, F03, F04, F05, F06, F08, F09, F10, F13, F14, F16, F25, F26, F27, F30, F31, F33, F35, F37, F49.

Criação integrada, campos principais, prioridades, validações da criação, edição local dos campos, exclusão local com confirmação, conclusão reativa, subtarefas individuais e cálculo proporcional já têm implementação concreta. Projetos têm formulários de criação/edição, cor/ícone, listagem e detalhes. Esses controles e a identidade visual devem ser preservados.

## Funcionalidades parcialmente atendidas

Itens classificados PARCIALMENTE ATENDIDO: F07, F12, F17, F19, F28, F32, F34, F36, F38, F40, F45, F46, F47, F48, F51, F52.

Os gaps são específicos: semântica de status, vínculo por nome/ID, coerência progresso/conclusão, recorte temporal, mocks, filtros implícitos, feedback de armazenamento, estados durante hidratação e consistência local/remota. Complementar esses pontos não exige substituir telas ou navegação.

## Funcionalidades não atendidas

Itens classificados NÃO ATENDIDO: F11, F15, F18, F20, F21, F22, F23, F24, F29, F39, F41, F42, F43, F44, F50.

Ausentes: timestamp atualizado, desfazer, histórico real, grupos manhã/tarde/noite, visões semanal/mensal, destaques calculados de prazo/atraso, múltiplas observações, estatísticas por período/atrasadas, filtros de prioridade/etiqueta/período, ordenação e sincronização manual geral. A matriz diferencia um controle ausente de uma simples integração backend pendente.

## Identidade/nome do aplicativo

- `app.json:2`: `name = GerenciadorTarefas` é identificador técnico registrado por `index.js:8`; não é o nome de exibição.
- `app.json:3`: `displayName = Gestor Diário`.
- `android/app/src/main/res/values/strings.xml:2`: `app_name = Gestor Diário`; Manifest usa `@string/app_name` na aplicação e Activity.
- `src/screens/LoginScreen.tsx:27`: título visível **Gestor Diário**.
- `@taskflow:tasks` e `@taskflow:projects` são chaves internas de armazenamento, não marca visível. Não devem ser renomeadas pela auditoria.
- `MainActivity.kt` e `com.gerenciadortarefas`, nomes de projeto/package e AppRegistry são técnicos. Não há texto visível TaskFlow/GerenciadorTarefas nos componentes Android inspecionados.
- Achado adicional fora da métrica Android: `ios/GerenciadorTarefas/Info.plist:9–10` mantém `CFBundleDisplayName = GerenciadorTarefas`; `LaunchScreen.storyboard:19` tem label visível com esse nome antigo. São textos de exibição iOS incorretos, não apenas identificadores. iOS fica fora da plataforma oficial do MVP e não gera exigência/ticket do MVP nesta auditoria.

## Calendário

A solução concreta presente é **`@react-native-community/datetimepicker`**, usada em `NewTaskScreen.tsx:644/699` e `EditTaskScreen.tsx:616/653`, com `mode="date"` e `display="default"`. Criação limita início a hoje, limita prazo ao início e ajusta prazo quando necessário; edição permite preservar início passado e restringe prazo ao início. Isso atende seleção de datas nos formulários.

`CalendarScreen.tsx:5–23` não contém calendário de tarefas: exporta função chamada `NewTaskScreen`, mostra “Nova Tarefa” e botão Voltar. A navegação aponta efetivamente para esse arquivo. Não foram encontrados controles semanal/mensal ou outra biblioteca de calendário em `src`/`package.json`. O histórico Git disponível para esse arquivo tem o commit de organização `48bc0e0`; não comprova uma implementação semanal/mensal anterior.

A decisão de calendário informada pelo responsável é preservada. A auditoria consegue comprovar os pickers atuais, mas **não consegue identificar no snapshot a implementação da visão de calendário previamente decidida**. Isso não prova que a decisão foi revogada nem autoriza escolher outra biblioteca. Antes de complementar PBI-05, confirmar a referência dessa decisão/artefato e reutilizar a solução aprovada.

Gaps: visualização por data, agrupamento por horário, semana/mês e destaques de proximidade/atraso. Colorir sempre o campo Prazo de vermelho não atende uma indicação baseada na situação da tarefa. Recomendar apenas complemento da solução existente, com janela de “prazo próximo” definida no refinamento; o requisito não informa um número de dias.

## Navegação

`App.tsx` mantém ProjectProvider acima de TaskProvider e AppNavigator. `AppNavigator.tsx` usa NavigationContainer/native stack sem header padrão; BottomNavigation oferece Hoje, Calendário, NovaTarefa, Projetos e Config. IDs de tarefa/projeto são parâmetros dos detalhes. Login troca para Home; editar salva e volta; exclusões de tarefa fazem reset para Home.

Rotas de detalhe/edição reais existem; não há motivo para trocar a navegação. Calendar/Settings são placeholders “Nova Tarefa”. Login contém ações de conta/recuperação sem handler, mas autenticação não integra a Entrega 1 e não é critério de reprovação.

Risco estático: `EditTaskScreen.tsx:115–154` e `EditProjectScreen.tsx:84–105` retornam quando recurso não existe antes dos hooks de estado. Se a existência mudar durante a vida do componente (por exemplo, hidratação ou exclusão), a ordem/quantidade de hooks pode mudar. Não foi reproduzido nesta auditoria; validar no trabalho já previsto, sem refatoração preventiva ampla.

## Dashboard

Contagens de tarefas, concluídas, pendentes e urgentes vêm de `TaskContext`; alterações locais provocam renderização. Urgentes significa prioridade alta, não atraso. Não há cálculo por data, atrasadas ou escolha de período.

Os três cards de Projetos Ativos usam nomes/ícones/cores e valores fixos (`7/15`, `3/8`, `2/6`), independentes de ProjectContext. Data “Domingo, 20 de setembro” e saudação “Bom dia, Aline!” também são fixas. “Progresso de hoje” calcula sobre todas as tarefas. No primeiro uso, Contexts iniciam com exemplos datados de setembro de 2026, que podem ser gravados como dados locais; em cache existente eles são substituídos ao hidratar.

Preservar cards, cores e interações, substituindo futuramente só as fontes/cálculos conforme Issue #11. A barra `40%` na prévia de edição de projeto (`EditProjectScreen.tsx:430`) é ilustrativa de preview, distinta de um indicador operacional; não foi contada como falha separada de RF23.

## Projetos

CreateProject valida nome e permite descrição/cor/ícone; EditProject altera esses campos e tenta preservar tarefas ao renomear, atualizando seu nome de projeto. Projects/ProjectDetails exibem dados do Context e contadores calculados por categoria.

Problemas locais de integridade, mesmo antes de backend:

- Projetos com nomes iguais são permitidos; listagem e detalhes filtram por nome, podendo misturar tarefas.
- Nova tarefa recebe ID remoto; edição muda apenas `project`, preservando `projectId` antigo.
- Excluir em detalhes remove projeto sem tratar tarefas. Excluir na edição move `project` para “Geral”, sem atualizar `projectId` nem garantir que Geral exista.
- Renomear/excluir projeto e alterar tarefas são escritas em Contexts/chaves distintos, sem transação local.

O CRUD de projetos da API já concluído não implica que todos esses controles mobile usem os endpoints. `ProjectContext` continua local; provisioning remoto ocorre apenas na criação de tarefa. A futura política para projetos com tarefas exige decisão: o backend documentado bloqueia com 409, enquanto um caminho local promete mover para Geral.

## Tarefas

NewTask oferece título, descrição, datas, horário, prioridades, categoria, status inicial, subtarefas e lembretes. `handleSubmit` valida e aguarda criação remota; sucesso só vem após resposta da API, com aviso específico se cache falhar. Lembretes são funcionalidade existente preservada e fora da avaliação do MVP.

EditTask tem formulário funcional e salva em Context; data de prazo tem mínimo do início e alterações de início ajustam prazo. O submit da edição não reaplica comparação de datas/validação de horário nem grava `updatedAt`. Alert de sucesso local é emitido antes de confirmar escrita AsyncStorage; não deve ser interpretado como sucesso de PATCH.

TaskDetails exibe dados reais da tarefa e fallback de ausente/sem descrição. A seção Atividade, em contraste, exibe eventos fixos sem vínculo ao ID. A consulta API continua pendente na #5; essa auditoria não a inicia. Há escolha por nome na edição e escolha por ID na criação: precisam convergir no futuro sem alterar a UX de seleção.

## Subtarefas

Nova/edição adicionam e removem itens; edição/detalhes permitem marcar individualmente. A edição não altera diretamente o título de uma subtarefa existente; RF09 exige definição/acompanhamento, não exige explicitamente renomear, portanto isso não virou gap adicional inventado.

O detalhe recalcula percentual por itens feitos e atualiza barra/contador. Os dados ficam em cache; adapter preserva `draft.subtasks`, sem enviá-los no POST. Sem subtarefas, detalhe sempre calcula 0%, inclusive para tarefa concluída; completar/reabrir pai não altera os filhos. Essa regra deve ser alinhada nas #7/#8, mantendo controles e cálculo proporcional existentes.

## Observações

Não há modelo/coleção de notas independentes nem UI para múltiplas anotações datadas. O placeholder da descrição menciona “observações”, mas um campo simples não atende RF11. Atividade mockada também não constitui observação criada pelo usuário. Completar a Issue #9 existente, sem abrir duplicata nem retirar a descrição atual.

## Filtros e ordenação

Home separa done e não done; detalhe de projeto restringe por nome de categoria. São recortes implícitos, sem controles gerais para status, prioridade, etiqueta ou intervalo. Não há `sort` ou seleção de critérios/direção no mobile. A ordem é a do array de tarefas.

RF12 aceita projeto **ou** etiqueta como categorização, atendida parcialmente pelos projetos; RF48 menciona etiqueta e projeto no conjunto de filtros. Registrar a decisão necessária sobre essa semântica, sem inventar que toda a gestão de etiquetas de Entrega 2 seja obrigatória aqui. RF50 exige critérios/direção; não exige drag-and-drop (RF14, Entrega 2).

## Loading/erros/estados vazios

Criação tem `saving`, bloqueio de botão, texto “Salvando...”, trava de concorrência e Alerts. `apiRequest` propaga erro HTTP e limita espera a 15s; não há retry automático. Outros controles do formulário/Cancelar continuam ativos durante envio; avaliar em validação futura navegação enquanto request está em andamento.

TaskContext impede `addTask` antes da hidratação dos dois Contexts. Home/Projetos não esperam hidratação nem mostram erro/retry: exemplos podem aparecer temporariamente como dados. NewTask inicializa `defaultProject` uma vez a partir do estado naquele momento; se cache alterar IDs após montar, a seleção pode ficar inválida até selecionar novamente.

Há vazios para pendências, tarefas de um projeto, subtarefas e ausência de projetos no formulário; tarefas/projetos não encontrados têm retorno seguro de navegação. A listagem de projetos simplesmente fica vazia sem mensagem quando não há projetos. Falhas de leitura/escrita geral do cache ficam em console, e confirmação de edição/criação de projeto não aguarda armazenamento.

O parse JSON dos Contexts não valida shape. Em falha de leitura/parse, finally marca hydrated e o effect pode gravar os dados iniciais sobre o cache anterior. Isso é risco inferido diretamente do fluxo, sem simulação de corrupção nesta etapa. Retenção/recuperação e feedback devem ser tratados no escopo de preservação de dados da #12.

## Integração API atual

Fluxo concreto: `NewTaskScreen → TaskContext.addTask → resolveProject → createTask → apiRequest`. Host Android é `http://10.0.2.2:3000`. `resolveProject` reutiliza remoteId ou consulta ID local; só em 404 provisiona o projeto selecionado. `createTask` faz POST e usa UUID/valores da resposta. Prioridades/status/datas são adaptados, subtarefas/lembretes permanecem locais.

Não há GET de Tasks, PATCH/DELETE de Tasks, serviço geral de projetos ou fluxo manual de sincronização. `ApiTask.progress`, deletedAt/undoUntil não se tornam funcionalidades de Front por existirem no tipo da resposta.

### Evidência manual e testes existentes

[Registro confirmado da Issue #4](../arquitetura/integracao-criacao-tarefas.md#validação-manual-android--2026-10-03): Android Emulator, backend local migrado, health, projeto, tarefa, POST/SQLite, Home, force-stop/fechar/reabrir com cache preservado, tentativa rejeitada com backend desligado e nenhuma falsa confirmação de salvamento. Não extrapolar esse resultado para edição/exclusão/sync ou todas as combinações do formulário.

Os arquivos `__tests__/taskService.test.ts` e `__tests__/TaskContext.integration.test.tsx` contêm testes de mapping/HTTP, offline, timeout, cache/reabertura, falha de cache e concorrência. Foram lidos; não reexecutados nesta tarefa. Não cobrem toda a UX de todas as telas.

Dívidas mantidas conforme documentação da Sprint: **14 erros globais preexistentes de TypeScript mobile**, falhas antigas da configuração global do Jest, **quatro alertas moderados conhecidos do Drizzle Kit**, GET/PATCH/DELETE de Tasks e sincronização geral pendentes. Não houve correção nem nova contagem experimental dessas dívidas.

## Conflitos identificados

### C1 — CONFLITO IDENTIFICADO: exclusão irreversível

**Implementação atual:** remoção direta no Context; edição informa “Esta ação não pode ser desfeita” (`EditTaskScreen.tsx:1191`).

**Requisito:** RF04 pede confirmação e possibilidade de desfazer por curto período.

**Impacto:** perda imediata local; nenhum caminho de recuperação pela UI.

**Recomendação:** definir janela/retenção e complementar a Issue #10 mantendo confirmação/ações atuais. **Aguardando decisão.**

### C2 — CONFLITO IDENTIFICADO: estados e perda de revisão

**Implementação atual:** quatro estados locais; `review` e `in_progress` viram PARTIAL e voltam como `in_progress` (`taskService.ts:14–16`).

**Requisito:** RF05 pede concluída, parcial e pendente; Issue #7 seleciona PENDING/PARTIAL/COMPLETED.

**Impacto:** escolher “Em revisão” na criação resulta “Em andamento” após resposta; UX/semântica não se conservam.

**Recomendação:** decidir representação de revisão e equivalência dos rótulos na #7, preservando fluxos aprovados e dados antigos. **Aguardando decisão.**

### C3 — CONFLITO IDENTIFICADO: atividade fixa como histórico

**Implementação atual:** mesmos eventos, autores e horários em qualquer tarefa (`TaskDetailsScreen.tsx:487–505`).

**Requisito:** RF17 exige alterações reais com data/hora; RF05 exige histórico de conclusão.

**Impacto:** interface apresenta atividade que não comprova eventos da tarefa selecionada.

**Recomendação:** manter seção e conectá-la ao histórico real na #7, distinguindo vazio de exemplo. **Aguardando decisão.**

### C4 — CONFLITO IDENTIFICADO: Hoje e calendário não representam períodos

**Implementação atual:** Home intitulada Hoje conta todas as tarefas e tem data fixa; Calendario abre placeholder.

**Requisito:** RF06 exige dia e períodos do dia; RF07 semana/mês com proximidade e atraso; RF23 estatísticas por período.

**Impacto:** rótulos não correspondem ao recorte dos dados; navegação não entrega calendário de tarefas.

**Recomendação:** confirmar artefato da decisão de calendário e complementar solução aprovada no PBI-05; corrigir fonte/recorte na #11. **Aguardando decisão.**

### C5 — CONFLITO IDENTIFICADO: preservação de vínculo e exclusão de projetos

**Implementação atual:** nome usado nas consultas; troca de categoria deixa projectId antigo; exclusão por detalhes deixa tarefas, por edição move nomes para Geral sem garantir categoria/ID.

**Requisito:** RF12 categoriza e filtra tarefas; planejamento do PBI-08 exige vínculo persistido e ausência de tarefas órfãs. API documentada bloqueia exclusão de projeto com tarefas.

**Impacto:** tarefas podem desaparecer da categoria ou aparecer em projetos homônimos; cache e relação remota divergem.

**Recomendação:** decidir política única e preservar seleção visual, usando identidade estável e tratamento explícito dos vínculos. **Aguardando decisão.**

### C6 — CONFLITO IDENTIFICADO: última modificação ausente

**Implementação atual:** edição apenas mescla campos; updatedAt remoto não é atualizado pelo fluxo local.

**Requisito:** RF03 exige registro da data/hora da última modificação.

**Impacto:** timestamp pode continuar sendo o da criação, embora a tarefa tenha mudado.

**Recomendação:** tratar na #6, com apresentação consistente nos detalhes quando refinada. **Aguardando decisão.**

### C7 — CONFLITO IDENTIFICADO: conclusão e progresso incompatíveis

**Implementação atual:** concluída sem subtarefas mostra 0%/Em progresso; conclusão do pai independe da lista de filhos.

**Requisito:** RF10 exige percentual pelas subtarefas; critérios das #7/#8 exigem coerência e regra para ausência de subtarefas.

**Impacto:** indicadores simultâneos de conclusão e progresso discordam; resposta progress da API é ignorada.

**Recomendação:** decidir regra para ausência de subtarefas e relação entre conclusão e filhos; preservar cálculo existente quando há filhos. **Aguardando decisão.**

## Issues recomendadas

Nenhuma Issue foi criada. Consulta ao GitHub confirmou #1–#4 fechadas e #5–#13 abertas. Comparação com [planejamento existente](../sprints/sprint-1-issues.md) evita duplicatas. Títulos abaixo em “existentes” identificam o trabalho já planejado, não novos tickets.

### Trabalho nas Issues existentes — sem duplicar

| Issue / título existente | PBI/requisito | Motivo concreto / complemento recomendado | Front/Backend/Banco | Prioridade | Dependências |
|---|---|---|---|---|---|
| #5 — Consultar e visualizar tarefas | PBI-01/02; consulta Sprint | Conectar dados de consulta, tratar loading/ausente/erro mantendo detalhes; conferir seeds | Front + Backend + Banco | Alta | #1–#4 concluídas; não iniciada nesta auditoria |
| #6 — Editar tarefas | PBI-02 / RF03 | PATCH, updatedAt, validações e atualizar projectId ao trocar categoria; validar hooks/retorno | Front + Backend + Banco | Alta | #5 e política C5 |
| #7 — Status, conclusão e histórico da tarefa | PBI-04 / RF05/RF17 | Decidir estados C2, usar histórico real C3 e alinhar C7 | Front + Backend + Banco | Alta | #5/#6; decisão de status |
| #8 — Gerenciar subtarefas e calcular progresso | PBI-06 / RF09/RF10 | Integrar dados já editáveis e decidir regra sem filhos C7 | Front + Backend + Banco | Alta | #5/#7 |
| #9 — Implementar múltiplas observações por tarefa | PBI-07 / RF11 | UI e dados de notas independentes datadas ausentes | Front + Backend + Banco | Média na Issue existente; PBI Alta | #5 e contrato de notas |
| #10 — Excluir tarefa com confirmação e desfazer | PBI-03 / RF04 | Retenção/janela/ação de desfazer ausentes; manter Alert | Front + Backend + Banco | Alta | #5/#7 e decisão C1 |
| #11 — Dashboard com dados reais | PBI-09 / RF23 | Cards, recortes/data e atrasadas; preservar cards atuais | Front + Backend; Banco como fonte | Alta | #5 e atualizações #6–#10 |
| #12 — Implementar sincronização manual Mobile ↔ API | PBI-11/08 / RF20/RF12 | Sync de projetos/tarefas, feedback, proteção do cache e identidade; sem duplicar integração geral | Front + Backend + Banco | Alta | #5–#10 e política C5 |
| #13 — Pipeline CI inicial | TEC-09 | Validação global já planejada; dívidas conhecidas continuam registradas | Front + Backend + DevOps | Alta | Diagnóstico das falhas preexistentes; nenhuma correção nesta auditoria |

### Novas sugestões para gaps sem ticket equivalente

| Título sugerido | PBI/requisito relacionado | Motivo | Front/Backend/Banco | Prioridade | Dependências |
|---|---|---|---|---|---|
| Complementar visualizações do calendário do MVP preservando a solução aprovada | PBI-05 / RF06/RF07 | F19–F24: dia/agrupamento, semana/mês e destaques não cobertos integralmente pelas #1–#13 | Front; consumir dados de Tasks já disponíveis, sem novo schema presumido | Alta no backlog da Entrega 1; fora da seleção inicial da Sprint | Confirmar decisão/artefato de calendário; #5; coordenar atraso/recorte com #11 |
| Completar filtros e ordenação do MVP nos componentes atuais | PBI-10 / RF48/RF50 | F36/F40–F44: faltam filtros explícitos e critérios/direção; #11 não cobre filtragem/ordenação completas | Front; Backend/Banco somente se contrato de consulta exigir | Alta no backlog da Entrega 1; fora da seleção inicial da Sprint | #5; decisão sobre etiquetas/categorias; usar dados e navegação existentes |
| Corrigir integridade local de projetos e unificar exclusão com tarefas vinculadas | PBI-08 / RF12; critérios de vínculo/segurança Sprint | F32/F34: detalhes e edição excluem de formas divergentes, relação por nome mistura homônimos e deixa órfãs; bug local específico além do CRUD backend #3 concluído | Front (Contexts/telas); Backend/Banco apenas para alinhamento da política existente | Alta | Decisão C5; coordenar mudança de categoria na #6 e integração geral na #12; não duplicar implementação de CRUD/sync |

Se a correção de integridade local for explicitamente incorporada aos critérios de #6/#12 durante refinamento, absorver ali e **não abrir o terceiro ticket**. Nenhum número novo é atribuído antes dessa decisão. Loading/erros/cache/progresso/histórico/desfazer/notas já foram associados às Issues existentes e não geram tickets genéricos duplicados.

### Validação e preservação desta entrega documental

Apenas `docs/auditorias/auditoria-front-mvp.md` é criado. Revisão de contagens da matriz, links de arquivos e `git diff --check` são as validações desta documentação. Não há alteração do backlog, progresso formal, requisitos, código, bibliotecas ou calendário. Não há merge automático. Após entregar o PR, encerrar sem iniciar #5.

## Resultado do refinamento

Após esta auditoria, foram criadas no milestone Sprint 1 as Issues [#20 — Complementar visualizações do calendário do MVP](https://github.com/AlineRaquelC/gestor-diario/issues/20) (PBI-05 / RF06/RF07) e [#21 — Completar filtros e ordenação do MVP](https://github.com/AlineRaquelC/gestor-diario/issues/21) (PBI-10 / RF48/RF50). Calendário e filtros agora possuem rastreabilidade formal; já pertenciam à Entrega 1, sem requisito novo.

A decisão de calendário está aprovada para planejamento: mês com indicadores/seleção de dia, semana com 7 dias/navegação, dia com Manhã/Tarde/Noite pelo horário, destaques de atraso/prazo próximo e Tasks reais de TaskContext/API; identidade visual, navegação e componentes aproveitáveis serão preservados, sem troca desnecessária de biblioteca. Isso registra a decisão posterior ao achado da auditoria, sem reescrever suas evidências históricas.

Integridade de projetos foi **absorvida em #6/#12**: projectId/projeto ativo/updatedAt/UX/reabertura na edição; identidades estáveis, vínculos remotos/locais, projetos removidos, preservação de tarefas, política única de exclusão e consistência API/AsyncStorage na sincronização. **Não criar terceira Issue de projetos.** A política será definida no trabalho futuro, sem alteração de código agora.

Sprint refinada: **15 Issues, 4 concluídas, 4/15 = 26,7%**. O histórico anterior **13 Issues, 4/13 = 30,8%** permanece na auditoria. A redução percentual representa refinamento do planejamento, não perda de trabalho. As métricas do Front (52 itens, 21 atendidos, 16 parciais, 15 não atendidos e 55,8% ponderados) permanecem inalteradas: **nenhuma correção de Front foi implementada ainda**. #5 continua próxima e não iniciada.

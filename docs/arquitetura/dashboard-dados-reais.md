# Dashboard com dados reais — Issue #11

## Escopo e fonte de dados

RF23 / PBI-09: resumo de tarefas pendentes, concluídas e atrasadas por período.
A Home deriva os valores de `TaskContext.tasks` e `ProjectContext.projects`.
Não há segunda coleção de tarefas, chamadas HTTP na Home, endpoint de dashboard,
alteração de schema ou dependência nova. Layout, cards, cores, navegação e listas
existentes foram preservados; apenas um seletor compacto de período foi acrescentado.

## Períodos do MVP

O requisito não define o campo ou os limites exatos do recorte. Foi adotada a
interpretação operacional por **prazo**, sem inferir quando uma tarefa foi concluída:

- Hoje: data local atual.
- Semana: segunda-feira a domingo, inclusive.
- Mês: primeiro ao último dia do mês local, inclusive.
- Data de inclusão: `dueDate`; se ausente ou inválida, `startDate` válida.
- Sem ambas as datas válidas: excluída dos indicadores por período, sem apagar a tarefa.

Pendentes e concluídas usam o estado canônico da tarefa; `done` é fallback para
registros legados sem status. Progresso = `round(concluídas / total * 100)`; total
zero produz 0%. Esse percentual representa conclusão do conjunto, independentemente
do progresso interno por subtarefas de cada tarefa. O título muda com o período.
Não foi criado `completedAt`; não se trata de medir conclusões ocorridas no período.

## Atrasadas e listas

Atrasada = tarefa não concluída com `dueDate` válida anterior a hoje. Prioridade
alta não significa atraso; horário não muda a comparação por dia.

O card **Atrasadas mostra o total geral**, independentemente do período selecionado,
para manter vencidas visíveis também em Hoje (um recorte estrito de prazos de hoje
não conteria tarefas atrasadas). A interface explicita: “Por prazo · Atrasadas e
projetos: total geral”. Pendentes, concluídas e progresso seguem o período.
As listas Para fazer e Concluídas mantêm seu conjunto global existente; não são
visualizações de calendário ou filtros gerais.

## Projetos

Os cards apresentam nome, ícone e cor do ProjectContext; contagens vêm de tarefas
reais. Relacionamento por `task.projectId === project.remoteId` ou `project.id`,
nunca por nome. IDs não resolvidos e tarefas antigas sem vínculo não são associados
artificialmente. Projetos com mesmo nome continuam independentes.

Contagens por projeto são gerais: concluídas / total e percentual com proteção
contra divisão por zero. A Home mostra até três projetos com tarefas vinculadas,
na ordem inversa do Context (que acrescenta novos projetos ao final). A seleção é
determinística e mantém novos projetos de apresentação visíveis. “Ver todos” mantém
a navegação existente. Sem projetos relevantes, há estado vazio; durante hidratação,
há mensagem de carregamento. Não são exibidos os exemplos fixos antigos.

## Relógio, timezone e legado

Data em pt-BR e saudação sem usuário fictício: 05:00–11:59 Bom dia; 12:00–17:59
Boa tarde; demais horários Boa noite. Usa somente o relógio local do dispositivo,
atualizado a cada minuto e ao retornar ao primeiro plano.

Datas `YYYY-MM-DD` são interpretadas pelos componentes locais, sem parsing UTC que
deslocaria o dia no Brasil. ISO timestamps são convertidos ao calendário local.
Datas inválidas são ignoradas. Cache e dados legados permanecem sob as regras dos
Contexts; esta Issue não faz sincronização ou migração. Números refletem o conjunto
API/cache disponível, que pode incluir tarefas exclusivamente locais.

## Reatividade e limites

Cada render deriva novamente as métricas dos Contexts: criação, edição, mudança de
projeto, conclusão, reabertura e alteração de subtarefas atualizam o resumo após
confirmação nos fluxos já existentes. Mudanças na coleção também recalculam valores.
Os testes simulam remoção/restauração da coleção; a integração E2E de exclusão e
restauração será validada na #10, que não foi implementada aqui.

A #12 continua responsável pela sincronização geral e pelos projetos legados.
A #20 implementará calendário diário/semanal/mensal; o seletor desta Home apenas
recorta indicadores. #21 permanece responsável por filtros e ordenação gerais.
Nenhuma Issue posterior foi antecipada, e #11 não foi marcada como concluída.

## Validação automatizada

- 183 testes mobile focados aprovados em 12 suites: 151 anteriores e 32 novos.
- Helpers: datas, saudações, limites semana/mês/ano, ano bissexto, atraso independente
  da prioridade, contagens, percentuais, legado, IDs de projetos e reatividade.
- Home integrada: vazio, Context atualizado, chips, títulos, relógio e limite de cards.
- Lint dos quatro arquivos de código/testes alterados: zero erros; um aviso inline
  preexistente do TaskCard preservado.
- TypeScript global: mesmos 14 erros, comparados com a base ignorando apenas posições.
- Migrations existentes aplicadas com sucesso; GET /health retornou 200.
- Auditoria dos hardcodes antigos da Home: nenhum exemplo operacional permanece.

As dívidas gerais de TypeScript, hooks condicionais em outras telas, Jest global
antigo e alertas conhecidos do Drizzle Kit não foram corrigidas.

## Android — dados reais

Validação em Android Emulator Pixel_7, API SQLite local e Metro, em 04/10/2026:

- Projeto `Apresentacao` criado pela UI; tarefas A e B criadas pela UI, prazo hoje.
- B concluída pela Home; A concluída e reaberta pelo checkbox existente.
- Projeto passou de 1/5 (20%) para 2/5 (40%) ao concluir A, retornando a 1/5 ao reabrir.
- Registros adicionais persistidos pela API distinguiram períodos; uma tarefa histórica
  de teste foi preparada somente no SQLite, sem alterar regras que proíbem criar tarefas
  já vencidas. Todas foram lidas pela API; não foram usados mocks operacionais.
- Com A e B concluídas: Hoje 5/17 (29%), Semana 5/19 (26%), Mês 5/23 (22%), quatro
  atrasadas. Valores conferidos contra o conjunto API/cache, incluindo legado preservado.
- Reabrir A atualizou imediatamente Mês para 4/23 (17%) e o card do projeto para 1/5.
- Editar o título de A pela UI refletiu o valor confirmado imediatamente nos Detalhes.
- Force-stop e reabertura com a API atual preservaram A pendente, B concluída e o
  projeto em 1/5; Hoje exibiu 4/17 (24%), 13 pendentes e quatro atrasadas.

Durante o teste foi reiniciado um processo antigo da API, que ainda executava uma
versão anterior à integração de Notes. Com a API atual, o endpoint de observações
existente retornou 200; não foi necessária correção de backend.

Esses totais são evidência do cenário executado, não constantes da aplicação.

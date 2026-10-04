# Calendário do MVP — Issue #20

## Escopo

RF06 / RF07, PBI-05: visualizar tarefas reais por dia, semana e mês, com
agrupamento por horário e destaques temporais. CalendarScreen substitui o
placeholder, preservando a rota Calendario e BottomNavigation ativa nessa rota.
Usa React Native e Date nativos, sem biblioteca, dependência ou alteração backend.
A tela segue cores, cards arredondados, tipografia e espaçamentos do aplicativo.

## Dados e datas

Fonte única: TaskContext, alimentado por API/cache. Não há fetch na tela, mocks,
segunda coleção persistente ou endpoint de calendário.

Data operacional: dueDate válida; se ausente/inválida em legado, startDate válida.
Sem ambas as datas válidas, a tarefa fica fora do calendário, sem ser apagada ou
migrada. Datas YYYY-MM-DD usam componentes locais, sem new Date(string) em UTC;
timestamps ISO são convertidos ao calendário local. Reutiliza localDay,
periodBounds, isCompleted e isOverdue do Dashboard da #11.

## Visões e seleção

Mês é a visão inicial, favorecendo a apresentação. O calendário mensal usa
Dom–Sáb, células vazias para alinhamento, todos os dias reais do mês e pontos nos
dias com tarefas (incluindo concluídas). Selecionar um dia mostra suas tarefas
abaixo. Navegação anterior/próxima mantém o número do dia quando possível,
limitando-o ao último dia válido do novo mês.

Semana usa segunda-feira a domingo, como o Dashboard. Mostra sete dias com
indicadores, navegação em intervalos de sete dias e seleção de dia. A visão Dia
permite navegar um dia por vez. Os três modos compartilham a data selecionada.

Hoje tem contorno roxo; selecionado tem preenchimento roxo. Ao selecionar outro
dia, hoje continua identificado. O botão Hoje retorna à data local atual. O relógio
é atualizado a cada minuto e ao retornar ao primeiro plano, sem substituir
silenciosamente uma seleção feita pelo usuário.

## Horários e apresentação

Dia agrupa por HH:mm válido:

- Manhã: 05:00–11:59.
- Tarde: 12:00–17:59.
- Noite: 18:00–04:59.
- Sem horário: ausente ou inválido.

Ordenação apenas para apresentação: horário crescente, sem horário ao final;
não modifica arrays do Context ou dados persistidos. Grupos vazios não ocupam
espaço. Tarefas concluídas continuam visíveis, com check/texto suavizado/status.
Cada card mostra título, horário, projeto de exibição e prioridade, mantendo as
cores do aplicativo. Pressionar um card navega para DetalheTarefa com taskId real.

## Atraso e prazo próximo

Atrasada: tarefa não concluída com dueDate válida anterior a hoje, independente de
prioridade ou horário, conforme a #11. Badge vermelho ATRASADA.

RF07 não especifica uma janela numérica de proximidade. **3 dias é uma convenção
técnica do MVP até refinamento futuro**, não um novo requisito oficial:

tarefa não concluída com dueDate entre hoje e hoje + 3 dias corridos, inclusive,
excluindo atrasadas. Badge âmbar PRAZO PRÓXIMO. O fallback startDate posiciona a
tarefa, mas não fabrica um prazo para os badges. Concluídas não recebem esses badges.

## Reatividade, loading, vazio e erro

Indicadores e listas são derivados novamente dos Contexts a cada render. Criar,
editar (inclusive data), concluir e reabrir refletem o estado confirmado, sem
reload manual. Projetos usam o texto disponível na tarefa; não há sincronização
nova de projetos. Loading de Tasks tem mensagem própria; falha de leitura preserva
as tarefas disponíveis. Dia, semana e mês sem tarefas têm estados vazios reais.

## Limites

A #21 continua responsável por filtros de projeto/prioridade/status e ordenação
geral. Seleção de data e ordem por horário pertencem à apresentação do calendário.
Não foram antecipadas #10, #12, #13, notificações, recorrência ou calendário externo.
Legado não é migrado; a sincronização geral continua na #12. Nenhum schema,
endpoint backend ou dependência foi alterado. A Issue permanece aberta até o merge.

## Testes automatizados

216 testes mobile focados aprovados: 183 anteriores preservados e 33 novos de
helpers/tela. Cobertura: janeiro/fevereiro/ano bissexto, limites de mês/ano, datas
locais, semana segunda–domingo, dueDate/fallback/legado inválido, grupos/ordenação,
indicadores, prazo próximo/atraso/concluídas, vazio/loading/erro, seleção versus
hoje, navegação para detalhes e reatividade após mudanças no Context.

Lint dos quatro arquivos de código/testes alterados: zero erros e zero avisos.
TypeScript global: mesmos 14 erros comparados à base, ignorando apenas posições.
Dívidas antigas de hooks em outras telas, Jest global e Drizzle Kit preservadas.

## Android manual

Validado em 04/10/2026, Pixel_7 Android Emulator, API SQLite e Metro:

- Cinco tarefas novas criadas pela API no projeto Apresentacao: hoje 09:00,
  14:00 e 19:00; amanhã 09:00; futura no mesmo mês 15:00.
- Home → Calendário abriu Mês, com grade alinhada, hoje/selecionado e pontos reais.
  Selecionar amanhã mostrou a tarefa correspondente. Navegação Outubro ↔ Novembro
  aprovada. Semana exibiu segunda–domingo e navegou entre 28/09–04/10 e 05/10–11/10.
- Dia mostrou 09:00 em Manhã, 14:00 em Tarde e 19:00 em Noite, além de Sem horário
  para registros já existentes. Concluídas permaneceram visíveis.
- Card do calendário abriu Detalhes com o ID correto. Pela edição existente, o prazo
  de Issue20-Noite foi alterado de 04/10 para 05/10. Voltar ao calendário atualizou
  imediatamente hoje de 20 para 19 tarefas e amanhã de 4 para 5, sem reload.
  GET /tasks/:id confirmou dueDate=2026-10-05.
- A tarefa histórica Issue11-C-Atrasada recebeu ATRASADA. Os cards com prazo hoje/
  amanhã receberam PRAZO PRÓXIMO; nenhuma regra da API foi relaxada para testar atraso.
- Inspeção visual da captura confirmou a identidade do app e a grade de sete colunas.

Contagens refletem API/cache desse cenário, incluindo legado preservado; não são
constantes operacionais. As tarefas de teste são dados locais ignorados pelo Git.

# Base visual — Gestor Diário

Tokens em `src/styles/theme.ts`, adotados pela Home, seus controles e pelas
telas de Nova/Editar/Detalhes da Tarefa. Na Fase 3, também cobrem Projetos,
Detalhes/Criar/Editar Projeto, Calendário, Configurações e Login. A BottomNavigation
conserva sua implementação.

- Roxo principal `#5C4DFF`, apoio `#EEECFF`; fundo `#F8F9FD`, cards brancos.
- Texto principal `#242139`, secundário `#616779`, borda `#DDE0EA`.
- Danger `#BD3048`, warning `#AD6409`, success `#19734D`, com fundos suaves.
- Radius: 8 / 12 / 16. Spacing: 4 / 8 / 12 / 16 / 24 / 32.
- Títulos 24–26, seções 16–18, cards 14–16 e apoio 11–13; sem fonte externa.
- Emojis somente como ícones de projeto escolhidos pelo usuário. O símbolo ✓
  permanece como feedback funcional de seleção/conclusão.
- Cards brancos compactos, faixa de prioridade e metadados legíveis; concluídas
  usam fundo neutro e texto riscado sem reduzir a opacidade de todo o card.
- Controles com alvo mínimo de 44px, seleção acessível e CTA primário roxo.
  Chips ativos são informativos; Limpar restaura filtros e ordenação juntos.
- Filtros e ordenação têm painéis separados; projetos usam lista por ID acessada
  pelo seletor. Voltar na lista mantém o rascunho; cancelar descarta ao reabrir.

Na Fase 2, Nova/Editar Tarefa compartilham `taskFormStyles`: campos com borda
neutra, superfície branca, radius 12 e altura mínima 48; labels legíveis e datas
lado a lado. Projeto usa seletor por ID com lista em linhas e ícone escolhido,
sem opção sem projeto porque o vínculo continua obrigatório. Prioridade usa
texto/borda/fundo suave; status usa segmentos com seleção acessível.

Ações primárias roxas e secundárias neutras têm altura mínima 48 e estado disabled
visível. A zona de perigo usa fundo suave, texto danger e mantém confirmação/undo.
Detalhes agrupa informações em grid sobre uma superfície única, sem sombras por
célula; progresso, subtarefas, Notes e atividade usam seções simples e os tokens
existentes. Histórico usa marcadores geométricos, sem emojis decorativos.

Na Fase 3, Projetos conserva o grid de duas colunas e as métricas existentes, com
superfícies simples, labels legíveis e cores/ícones reais dos projetos. Formulários
de projeto reutilizam os estilos da Fase 2; ícone/cor têm estado selecionado
acessível e cores mantêm o check. A zona de perigo usa dangerSoft/danger.
Calendário mantém sua estrutura: hoje com contorno, seleção preenchida, indicadores
pequenos e alerta compacto. Configurações apresenta somente a sincronização real,
com feedback success/warning/danger e pendências explícitas. Login adota inputs e
CTA consistentes, sem implementar autenticação ou ações novas nos links.

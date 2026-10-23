# Base visual — Gestor Diário

Tokens em `src/styles/theme.ts`, adotados pela Home, seus controles e pelas
telas de Nova/Editar/Detalhes da Tarefa. As demais telas e a BottomNavigation
conservam sua implementação.

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

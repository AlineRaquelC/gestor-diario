# Base visual — Gestor Diário

Tokens em `src/styles/theme.ts`, adotados nesta fase apenas pela Home e seus
controles. As demais telas e a BottomNavigation conservam sua implementação.

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

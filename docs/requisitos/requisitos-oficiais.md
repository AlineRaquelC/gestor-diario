# Requisitos Oficiais — Gestor Diário

## Identificação

- **Aplicativo:** Gestor Diário
- **Fonte:** documento `alunos-temas-requisitos.pdf`
- **Escopo considerado:** exclusivamente as páginas **1 a 35** do PDF, correspondentes ao projeto Gestor Diário.
- **Plataforma indicada no documento:** Android
- **Tecnologias indicadas no documento:** React Native e Node.js
- **Restrição tecnológica indicada no documento:** uso de bibliotecas, APIs e softwares livres, gratuitos ou de código aberto, sem custo de instalação ou uso.

## Nota de rastreabilidade

A introdução do documento informa que seriam apresentados **80 requisitos funcionais**, seguidos de **pelo menos 10 requisitos não funcionais**, sem identificação explícita de categoria nos parágrafos. Nas páginas 1–35, entretanto, foram encontrados **276 enunciados iniciados por “O aplicativo deve...”**.

Para não inferir uma classificação que o PDF não identifica individualmente:

- os **80 primeiros** enunciados são catalogados como `RF01` a `RF80`, conforme a ordem declarada pelo próprio documento;
- os enunciados seguintes são preservados, em ordem, como `REQ081` a `REQ276`, **sem forçar classificação funcional/não funcional**;
- a justificativa pedagógica que segue cada enunciado (“Esse requisito é...”) foi omitida aqui para manter este arquivo focado no requisito em si;
- o trecho oficial contém repetições literais: foram identificados **26 enunciados distintos repetidos**, totalizando **49 ocorrências repetidas além da primeira**. Elas foram mantidas para preservar a rastreabilidade com o PDF.

> **Importante:** este arquivo registra o conteúdo oficial em ordem de aparição. Priorização, divisão em entregas, User Stories, critérios de aceite e decisões técnicas pertencem ao backlog e aos documentos de planejamento, não a este catálogo.

---

## Requisitos funcionais declarados pelo documento — RF01 a RF80

### RF01 — Página 1

O aplicativo deve permitir que a pessoa usuária crie uma tarefa diária informando título, descrição, data de início, prazo final e nível de prioridade, com validação de campos obrigatórios e mensagens de erro claras.

### RF02 — Página 1

O aplicativo deve oferecer um mecanismo de priorização automática que ordene as tarefas com base em prazo, prioridade declarada e tempo estimado de conclusão, recalculando a ordem sempre que houver alteração.

### RF03 — Página 1

O aplicativo deve permitir a edição completa de qualquer tarefa já cadastrada, incluindo alteração de prioridade, prazo, descrição e status, com registro da data e hora da última modificação.

### RF04 — Página 1

O aplicativo deve permitir a exclusão de tarefas, com confirmação prévia e possibilidade de desfazer a exclusão por um curto período, utilizando armazenamento temporário.

### RF05 — Página 2

O aplicativo deve permitir a marcação de tarefas como concluídas, parciais ou pendentes, com atualização imediata da lista e registro do histórico de conclusão.

### RF06 — Página 2

O aplicativo deve oferecer uma visualização diária das tarefas, agrupadas por período do dia, como manhã, tarde e noite, com base no horário definido para cada tarefa.

### RF07 — Página 2

O aplicativo deve oferecer uma visualização semanal e mensal das tarefas, com indicação visual de prazos próximos e tarefas atrasadas, utilizando componentes de calendário.

### RF08 — Página 2

O aplicativo deve permitir a criação de tarefas recorrentes, com regras de repetição diária, semanal ou mensal, e geração automática das ocorrências futuras.

### RF09 — Página 2

O aplicativo deve permitir a definição de subtarefas dentro de uma tarefa principal, com acompanhamento individual do progresso de cada subtarefa.

### RF10 — Página 2

O aplicativo deve calcular automaticamente o percentual de conclusão de uma tarefa com base em suas subtarefas concluídas.

### RF11 — Página 2

O aplicativo deve permitir a anexação de observações em texto a cada tarefa, com suporte a múltiplas anotações e data de criação.

### RF12 — Página 3

O aplicativo deve permitir a categorização de tarefas em projetos ou etiquetas personalizadas, com filtros por categoria.

### RF13 — Página 3

O aplicativo deve permitir a busca textual por tarefas, considerando título, descrição, etiquetas e observações, com resultados atualizados em tempo real.

### RF14 — Página 3

O aplicativo deve permitir a ordenação manual das tarefas por arrastar e soltar, com persistência da ordem definida pela pessoa usuária.

### RF15 — Página 3

O aplicativo deve permitir a definição de lembretes por tarefa, com antecedência configurável em minutos, horas ou dias.

### RF16 — Página 3

O aplicativo deve enviar notificações locais quando uma tarefa estiver próxima do prazo, mesmo com o aplicativo em segundo plano.

### RF17 — Página 3

O aplicativo deve registrar o histórico de alterações de cada tarefa, incluindo criação, edição, conclusão e exclusão, com data e hora.

### RF18 — Página 3

O aplicativo deve permitir a exportação das tarefas em formato de texto estruturado e em formato de planilha aberta, sem custo, para backup local.

### RF19 — Página 3

O aplicativo deve permitir a importação de tarefas a partir de arquivos previamente exportados, com validação de integridade e mesclagem com os dados existentes.

### RF20 — Página 4

O aplicativo deve permitir a sincronização manual das tarefas com um servidor local baseado em Node.js, utilizando requisições HTTP e armazenamento em arquivo ou banco de dados aberto.

### RF21 — Página 4

O aplicativo deve permitir a sincronização automática periódica com o servidor local, respeitando a disponibilidade de rede e evitando consumo excessivo de dados.

### RF22 — Página 4

O aplicativo deve permitir o cadastro de metas diárias, como número máximo de tarefas ou tempo total de execução, com acompanhamento do progresso.

### RF23 — Página 4

O aplicativo deve exibir um painel com estatísticas de produtividade, como tarefas concluídas, atrasadas e pendentes, por período.

### RF24 — Página 4

O aplicativo deve permitir a definição de prioridades personalizadas, com nomes e cores configuráveis, além dos níveis padrão.

### RF25 — Página 4

O aplicativo deve permitir a alteração de tema claro e escuro, com persistência da preferência da pessoa usuária.

### RF26 — Página 4

O aplicativo deve permitir a configuração de tamanho de fonte e contraste para acessibilidade, com aplicação imediata em toda a interface.

### RF27 — Página 5

O aplicativo deve permitir o uso de leitor de tela, com rótulos descritivos em todos os componentes interativos.

### RF28 — Página 5

O aplicativo deve permitir a criação de tarefas por comando de voz, utilizando o microfone do dispositivo e reconhecimento de fala disponível no sistema.

### RF29 — Página 5

O aplicativo deve permitir a captura de uma foto como anexo de uma tarefa, utilizando a câmera do dispositivo, com armazenamento local da imagem.

### RF30 — Página 5

O aplicativo deve permitir a leitura de código de barras ou QR code para associar uma tarefa a um item ou local, utilizando a câmera do dispositivo.

### RF31 — Página 5

O aplicativo deve permitir a definição de localização geográfica para uma tarefa, utilizando o GPS do dispositivo, com opção de lembrete ao chegar ou sair do local.

### RF32 — Página 5

O aplicativo deve permitir a visualização das tarefas em um mapa, com marcadores para tarefas que possuem localização associada.

### RF33 — Página 5

O aplicativo deve permitir a criação de tarefas compartilhadas entre múltiplos perfis locais no mesmo dispositivo, com atribuição de responsáveis.

### RF34 — Página 5

O aplicativo deve permitir a alternância entre perfis locais, com dados isolados por perfil e configurações independentes.

### RF35 — Página 6

O aplicativo deve permitir a duplicação de uma tarefa existente, incluindo subtarefas e etiquetas, com ajuste automático de datas.

### RF36 — Página 6

O aplicativo deve permitir a criação de modelos de tarefas reutilizáveis, com aplicação rápida em novos dias.

### RF37 — Página 6

O aplicativo deve permitir a definição de dependências entre tarefas, impedindo a conclusão de uma tarefa enquanto suas predecessoras não forem concluídas.

### RF38 — Página 6

O aplicativo deve permitir a visualização de tarefas em formato de linha do tempo, com duração estimada e prazos.

### RF39 — Página 6

O aplicativo deve permitir a estimativa de tempo para cada tarefa e o registro do tempo real gasto, com comparação posterior.

### RF40 — Página 6

O aplicativo deve permitir o início e a pausa de um cronômetro associado a uma tarefa, com registro de múltiplos intervalos.

### RF41 — Página 6

O aplicativo deve permitir a definição de horários de início e fim para tarefas, com validação de conflitos de agenda.

### RF42 — Página 6

O aplicativo deve permitir a visualização de conflitos de agenda e sugerir realocação de tarefas com base em prioridades.

### RF43 — Página 7

O aplicativo deve permitir a criação de lembretes recorrentes para tarefas recorrentes, com regras independentes.

### RF44 — Página 7

O aplicativo deve permitir a configuração de sons e vibração para notificações, com opções por prioridade.

### RF45 — Página 7

O aplicativo deve permitir a silenciar notificações de tarefas de baixa prioridade em determinados horários.

### RF46 — Página 7

O aplicativo deve permitir a definição de metas semanais e mensais, com acompanhamento visual de progresso.

### RF47 — Página 7

O aplicativo deve permitir a geração de relatórios simples em formato de texto e gráficos de barras, sem custo, para análise pessoal.

### RF48 — Página 7

O aplicativo deve permitir a filtragem de tarefas por status, prioridade, etiqueta, projeto e período.

### RF49 — Página 7

O aplicativo deve permitir a criação de filtros salvos, com aplicação rápida posteriormente.

### RF50 — Página 7

O aplicativo deve permitir a ordenação de tarefas por múltiplos critérios, como prioridade e prazo, com direção ascendente ou descendente.

### RF51 — Página 7

O aplicativo deve permitir a marcação de tarefas favoritas, com acesso rápido em uma seção dedicada.

### RF52 — Página 8

O aplicativo deve permitir a criação de tarefas com anexos de arquivos de texto, com visualização interna.

### RF53 — Página 8

O aplicativo deve permitir a criação de tarefas com anexos de áudio gravados pelo microfone, com reprodução interna.

### RF54 — Página 8

O aplicativo deve permitir a transcrição automática de áudios anexados, utilizando serviços livres ou bibliotecas de código aberto.

### RF55 — Página 8

O aplicativo deve permitir a criação de tarefas a partir de compartilhamento de texto de outros aplicativos, com pré- preenchimento de campos.

### RF56 — Página 8

O aplicativo deve permitir o compartilhamento de uma tarefa com outros aplicativos, em formato de texto estruturado.

### RF57 — Página 8

O aplicativo deve permitir a impressão de uma lista de tarefas por meio de serviços de impressão disponíveis no sistema, sem custo.

### RF58 — Página 8

O aplicativo deve permitir a criação de backup automático local em pasta acessível, com rotação de arquivos antigos.

### RF59 — Página 8

O aplicativo deve permitir a restauração de backup com seleção de data e mesclagem segura.

### RF60 — Página 8

O aplicativo deve permitir a verificação de integridade dos dados armazenados, com detecção de inconsistências e correção assistida.

### RF61 — Página 9

O aplicativo deve permitir a migração de dados entre versões do aplicativo, com preservação de informações.

### RF62 — Página 9

O aplicativo deve permitir a configuração de lembretes por localização, com base em geofencing e notificações ao entrar ou sair de áreas definidas.

### RF63 — Página 9

O aplicativo deve permitir a definição de prioridades dinâmicas que aumentam automaticamente conforme o prazo se aproxima.

### RF64 — Página 9

O aplicativo deve permitir a sugestão automática de prazos com base no histórico de conclusão de tarefas semelhantes.

### RF65 — Página 9

O aplicativo deve permitir a detecção de tarefas negligenciadas e sugerir reagendamento ou divisão em subtarefas.

### RF66 — Página 9

O aplicativo deve permitir a criação de tarefas em lote a partir de uma lista de texto colada, com interpretação de linhas e campos.

### RF67 — Página 9

O aplicativo deve permitir a edição em lote de tarefas selecionadas, alterando prioridade, etiqueta ou prazo de uma só vez.

### RF68 — Página 9

O aplicativo deve permitir a exclusão em lote de tarefas concluídas ou antigas, com confirmação e resumo.

### RF69 — Página 10

O aplicativo deve permitir a visualização de tarefas arquivadas, com opção de restauração para a lista ativa.

### RF70 — Página 10

O aplicativo deve permitir a configuração de regras de arquivamento automático de tarefas concluídas após determinado período.

### RF71 — Página 10

O aplicativo deve permitir a personalização de cores e ícones para etiquetas e prioridades, com persistência.

### RF72 — Página 10

O aplicativo deve permitir a criação de temas personalizados, com exportação e importação de configurações.

### RF73 — Página 10

O aplicativo deve permitir a configuração de atalhos rápidos na tela inicial do Android para criação de tarefas.

### RF74 — Página 10

O aplicativo deve permitir a criação de widgets simples para exibir as tarefas do dia, utilizando componentes nativos do Android.

### RF75 — Página 10

O aplicativo deve permitir a integração com assistentes de voz do sistema para criação de tarefas por comando, quando disponível.

### RF76 — Página 10

O aplicativo deve permitir a configuração de lembretes inteligentes que consideram a localização e o histórico de uso.

### RF77 — Página 10

O aplicativo deve permitir a exportação de relatórios em formato de planilha aberta, com gráficos e tabelas.

### RF78 — Página 11

O aplicativo deve permitir a importação de tarefas de arquivos de planilha aberta, com mapeamento de colunas.

### RF79 — Página 11

O aplicativo deve permitir a sincronização com servidor local por meio de API aberta, com autenticação simples e segura.

### RF80 — Página 11

O aplicativo deve permitir a configuração de múltiplos servidores locais, com alternância entre ambientes.

---

## Demais requisitos presentes nas páginas 1–35 — REQ081 a REQ276

Os itens abaixo continuam fazendo parte do trecho oficial analisado, mas o PDF não fornece marcação individual que permita classificá-los com segurança como funcionais ou não funcionais. Por isso, a categoria permanece neutra (`REQ`).

### REQ081 — Página 11

O aplicativo deve permitir a resolução de conflitos de sincronização com base em data de modificação e prioridade.

### REQ082 — Página 11

O aplicativo deve permitir a execução de rotinas de manutenção automática, como limpeza de backups antigos e reorganização de dados.

### REQ083 — Página 11

O aplicativo deve permitir a configuração de limites de armazenamento e alertas quando o espaço estiver próximo do esgotamento.

### REQ084 — Página 11

O aplicativo deve permitir a coleta de métricas de uso anônimas e locais, sem envio externo, para análise pessoal.

### REQ085 — Página 11

O aplicativo deve permitir a desativação completa de qualquer coleta de métricas, com respeito à privacidade.

### REQ086 — Página 11

O aplicativo deve permitir a configuração de perfis de notificação distintos para dias úteis e fins de semana.

### REQ087 — Página 12

O aplicativo deve permitir a criação de tarefas com prazo baseado em dias úteis, pulando fins de semana e feriados configuráveis.

### REQ088 — Página 12

O aplicativo deve permitir a configuração de feriados personalizados para o cálculo de prazos.

### REQ089 — Página 12

O aplicativo deve permitir a visualização de tarefas atrasadas com destaque visual e opções rápidas de reagendamento.

### REQ090 — Página 12

O aplicativo deve permitir a criação de tarefas com prazo indefinido e prioridade variável, com acompanhamento separado.

### REQ091 — Página 12

O aplicativo deve permitir a configuração de regras de conclusão automática para tarefas cujo prazo expirou e que não foram concluídas.

### REQ092 — Página 12

O aplicativo deve permitir a revisão semanal das tarefas, com sugestões de melhoria e reorganização.

### REQ093 — Página 12

O aplicativo deve permitir a criação de tarefas com dependência de localização, sendo concluídas apenas quando a pessoa estiver no local definido.

### REQ094 — Página 12

O aplicativo deve permitir a leitura de etiquetas NFC para associar tarefas a objetos físicos, quando o dispositivo suportar.

### REQ095 — Página 12

O aplicativo deve permitir a configuração de lembretes por proximidade de outros dispositivos Bluetooth, quando disponível.

### REQ096 — Página 13

O aplicativo deve permitir a criação de tarefas com base em eventos do calendário do sistema, com importação seletiva.

### REQ097 — Página 13

O aplicativo deve permitir a exportação de tarefas para o calendário do sistema, com criação de eventos.

### REQ098 — Página 13

O aplicativo deve permitir a configuração de lembretes por e- mail local, sem custo, utilizando servidor de correio aberto.

### REQ099 — Página 13

O aplicativo deve permitir a configuração de lembretes por mensagens em redes abertas, sem custo, quando disponíveis.

### REQ100 — Página 13

O aplicativo deve permitir a criação de tarefas com base em comandos de texto em linguagem natural simples, com interpretação de datas e prioridades.

### REQ101 — Página 13

O aplicativo deve permitir a sugestão automática de etiquetas com base no conteúdo da tarefa, utilizando regras simples.

### REQ102 — Página 13

O aplicativo deve permitir a criação de tarefas com anexos de múltiplos arquivos, com gerenciamento de espaço e visualização.

### REQ103 — Página 13

O aplicativo deve permitir a configuração de políticas de retenção de anexos, com remoção automática após período.

### REQ104 — Página 13

O aplicativo deve permitir a visualização de anexos de imagem em tela cheia, com zoom e rotação.

### REQ105 — Página 14

O aplicativo deve permitir a visualização de anexos de áudio com controle de reprodução e velocidade.

### REQ106 — Página 14

O aplicativo deve permitir a visualização de anexos de texto com busca interna e destaque de termos.

### REQ107 — Página 14

O aplicativo deve permitir a configuração de atalhos de teclado para ações frequentes, quando houver teclado físico.

### REQ108 — Página 14

O aplicativo deve permitir a configuração de gestos personalizados para ações rápidas, como deslizar para concluir.

### REQ109 — Página 14

O aplicativo deve permitir a criação de tarefas com campos personalizados definidos pela pessoa usuária, como texto, número ou data.

### REQ110 — Página 14

O aplicativo deve permitir a validação de campos personalizados com regras definidas pela pessoa usuária.

### REQ111 — Página 14

O aplicativo deve permitir a criação de relatórios personalizados com base em campos e filtros escolhidos.

### REQ112 — Página 14

O aplicativo deve permitir a configuração de temas sazonais automáticos, com base na data do sistema.

### REQ113 — Página 14

O aplicativo deve permitir a criação de tarefas com prazos relativos, como daqui a três dias, com conversão automática.

### REQ114 — Página 15

O aplicativo deve permitir a configuração de notificações silenciosas para tarefas de baixa prioridade, com agrupamento.

### REQ115 — Página 15

O aplicativo deve permitir a configuração de lembretes com repetição em intervalos, como a cada duas horas, até a conclusão.

### REQ116 — Página 15

O aplicativo deve permitir a configuração de lembretes com escalonamento de prioridade, aumentando a frequência conforme o prazo se aproxima.

### REQ117 — Página 15

O aplicativo deve permitir a criação de tarefas com dependência de outras tarefas e notificação quando as predecessoras forem concluídas.

### REQ118 — Página 15

O aplicativo deve permitir a visualização de um grafo simples de dependências entre tarefas, com layout automático.

### REQ119 — Página 15

O aplicativo deve permitir a configuração de regras de conclusão automática de tarefas dependentes quando as predecessoras forem concluídas.

### REQ120 — Página 15

O aplicativo deve permitir a criação de tarefas com prioridade calculada com base em múltiplos fatores, como prazo, esforço e importância.

### REQ121 — Página 15

O aplicativo deve permitir a configuração de pesos para os fatores de prioridade, com ajuste fino pela pessoa usuária.

### REQ122 — Página 15

O aplicativo deve permitir a simulação de cenários de reorganização de tarefas, com visualização de impactos nos prazos.

### REQ123 — Página 16

O aplicativo deve permitir a criação de tarefas com estimativa de esforço em horas e acompanhamento do progresso.

### REQ124 — Página 16

O aplicativo deve permitir a configuração de limites diários de esforço, com alertas ao ultrapassar.

### REQ125 — Página 16

O aplicativo deve permitir a configuração de períodos de descanso obrigatórios entre tarefas, com bloqueio temporário.

### REQ126 — Página 16

O aplicativo deve permitir a configuração de lembretes de pausa durante tarefas longas, com sugestões de alongamento.

### REQ127 — Página 16

O aplicativo deve permitir a criação de tarefas com anexos de links externos, com abertura no navegador padrão.

### REQ128 — Página 16

O aplicativo deve permitir a verificação de disponibilidade de links anexados, com alerta em caso de falha.

### REQ129 — Página 16

O aplicativo deve permitir a criação de tarefas com anexos de contatos, com integração à agenda do sistema.

### REQ130 — Página 16

O aplicativo deve permitir a configuração de lembretes por chamada telefônica, sem custo, utilizando serviços abertos.

### REQ131 — Página 16

O aplicativo deve permitir a configuração de lembretes por mensagens instantâneas em redes abertas, quando disponíveis.

### REQ132 — Página 17

O aplicativo deve permitir a configuração de lembretes por publicações em redes sociais abertas, quando disponíveis.

### REQ133 — Página 17

O aplicativo deve permitir a criação de tarefas com base em localização e horário, como chegar ao trabalho pela manhã.

### REQ134 — Página 17

O aplicativo deve permitir a configuração de lembretes contextuais que consideram clima, trânsito ou eventos locais, utilizando APIs abertas.

### REQ135 — Página 17

O aplicativo deve permitir a criação de tarefas com base em sensores de movimento, como registrar uma tarefa após caminhar determinada distância.

### REQ136 — Página 17

O aplicativo deve permitir a configuração de lembretes baseados em níveis de bateria, como evitar tarefas pesadas com bateria baixa.

### REQ137 — Página 17

O aplicativo deve permitir a configuração de lembretes baseados em conectividade, como sincronizar apenas em redes Wi-Fi.

### REQ138 — Página 17

O aplicativo deve permitir a configuração de lembretes baseados em armazenamento disponível, como limpar backups quando o espaço estiver baixo.

### REQ139 — Página 17

O aplicativo deve permitir a configuração de lembretes baseados em uso do aplicativo, como revisar tarefas após longos períodos de inatividade.

### REQ140 — Página 17

O aplicativo deve permitir a configuração de lembretes baseados em padrões de conclusão, como sugerir pausas em horários de baixa produtividade.

### REQ141 — Página 18

O aplicativo deve permitir a criação de tarefas com base em comandos de voz em linguagem natural, com confirmação antes de salvar.

### REQ142 — Página 18

O aplicativo deve permitir a correção de transcrições de voz antes de criar a tarefa, com edição textual.

### REQ143 — Página 18

O aplicativo deve permitir a criação de tarefas com base em fotos de listas escritas, utilizando reconhecimento óptico de caracteres livre.

### REQ144 — Página 18

O aplicativo deve permitir a correção de textos reconhecidos por OCR antes de criar as tarefas, com edição.

### REQ145 — Página 18

O aplicativo deve permitir a criação de tarefas com base em QR codes que contenham informações estruturadas.

### REQ146 — Página 18

O aplicativo deve permitir a criação de tarefas com base em NFC que contenham informações estruturadas.

### REQ147 — Página 18

O aplicativo deve permitir a configuração de lembretes por aproximação de locais específicos, com raio configurável.

### REQ148 — Página 18

O aplicativo deve permitir a configuração de lembretes por permanência prolongada em um local, como permanecer no trabalho por muitas horas.

### REQ149 — Página 18

O aplicativo deve permitir a configuração de lembretes por saída de um local, como lembrar de comprar algo ao sair de casa.

### REQ150 — Página 19

O aplicativo deve permitir a configuração de lembretes por entrada em um local, como registrar tarefas ao chegar ao escritório.

### REQ151 — Página 19

O aplicativo deve permitir a configuração de lembretes por proximidade de outros dispositivos, como conectar ao computador e sincronizar.

### REQ152 — Página 19

O aplicativo deve permitir a configuração de lembretes por conexão a redes específicas, como sincronizar ao conectar à rede doméstica.

### REQ153 — Página 19

O aplicativo deve permitir a configuração de lembretes por desconexão de redes específicas, como salvar dados ao sair da rede corporativa.

### REQ154 — Página 19

O aplicativo deve permitir a configuração de lembretes por eventos do sistema, como reinicialização do dispositivo.

### REQ155 — Página 19

O aplicativo deve permitir a configuração de lembretes por eventos de calendário do sistema, como reuniões agendadas.

### REQ156 — Página 19

O aplicativo deve permitir a configuração de lembretes por eventos de e-mail local, sem custo, quando disponíveis.

### REQ157 — Página 19

O aplicativo deve permitir a configuração de lembretes por eventos de mensagens abertas, quando disponíveis.

### REQ158 — Página 19

O aplicativo deve permitir a configuração de lembretes por eventos de chamadas telefônicas, sem custo, quando disponíveis.

### REQ159 — Página 20

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de luz, como ajustar tema conforme iluminação.

### REQ160 — Página 20

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de proximidade, como pausar tarefas ao atender o telefone.

### REQ161 — Página 20

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de pressão, como registrar tarefas após subir escadas.

### REQ162 — Página 20

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de temperatura, como sugerir pausas em ambientes quentes.

### REQ163 — Página 20

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de umidade, como ajustar tarefas em dias secos.

### REQ164 — Página 20

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de qualidade do ar, como evitar tarefas pesadas em dias poluídos.

### REQ165 — Página 20

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de batimentos cardíacos, como sugerir pausas em momentos de estresse.

### REQ166 — Página 20

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de passos, como registrar tarefas após atingir metas de caminhada.

### REQ167 — Página 21

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de sono, como sugerir tarefas leves após noites mal dormidas.

### REQ168 — Página 21

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de localização de alta precisão, como registrar tarefas em locais exatos.

### REQ169 — Página 21

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de localização de baixa precisão, como economizar bateria.

### REQ170 — Página 21

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de movimento do dispositivo, como detectar quedas e sugerir tarefas de recuperação.

### REQ171 — Página 21

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de rotação, como ajustar orientação da tela.

### REQ172 — Página 21

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de campo magnético, como detectar bússola e sugerir tarefas de navegação.

### REQ173 — Página 21

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de pressão atmosférica, como ajustar tarefas em mudanças de clima.

### REQ174 — Página 21

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de luz infravermelha, como detectar presença e ajustar tarefas.

### REQ175 — Página 22

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de impressão digital, como autenticar e acessar tarefas sensíveis.

### REQ176 — Página 22

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de reconhecimento facial, como autenticar e acessar tarefas sensíveis.

### REQ177 — Página 22

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de íris, como autenticar e acessar tarefas sensíveis.

### REQ178 — Página 22

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de voz, como autenticar e acessar tarefas sensíveis.

### REQ179 — Página 22

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de assinatura, como autenticar e assinar tarefas concluídas.

### REQ180 — Página 22

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de localização combinada com biometria, como acessar tarefas apenas em locais seguros.

### REQ181 — Página 22

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de tempo de uso, como limitar o acesso a tarefas após longos períodos.

### REQ182 — Página 22

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de fadiga digital, como sugerir pausas com base no tempo de tela.

### REQ183 — Página 22

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de atenção, como detectar distração e sugerir retomada de tarefas.

### REQ184 — Página 23

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de emoção, como ajustar tarefas conforme o estado emocional.

### REQ185 — Página 23

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto social, como evitar notificações em reuniões.

### REQ186 — Página 23

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto físico, como ajustar tarefas conforme a iluminação e o ruído.

### REQ187 — Página 23

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de transporte, como sugerir tarefas leves no trânsito.

### REQ188 — Página 23

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de localização e tempo, como sugerir tarefas específicas em determinados horários e locais.

### REQ189 — Página 23

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de clima, como sugerir tarefas internas em dias chuvosos.

### REQ190 — Página 23

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de trânsito, como sugerir tarefas alternativas em congestionamentos.

### REQ191 — Página 24

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de eventos locais, como sugerir tarefas relacionadas a feiras ou palestras.

### REQ192 — Página 24

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de disponibilidade de serviços, como sincronizar quando o servidor local estiver acessível.

### REQ193 — Página 24

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de segurança, como bloquear tarefas sensíveis em redes públicas.

### REQ194 — Página 24

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de privacidade, como ocultar detalhes de tarefas em notificações públicas.

### REQ195 — Página 24

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de acessibilidade, como ajustar notificações conforme recursos ativos.

### REQ196 — Página 24

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de idioma, como ajustar textos conforme o idioma do sistema.

### REQ197 — Página 24

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de fuso horário, como ajustar prazos em viagens.

### REQ198 — Página 24

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de calendário, como ajustar tarefas conforme feriados locais.

### REQ199 — Página 25

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de cultura, como ajustar tarefas conforme costumes locais.

### REQ200 — Página 25

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de legislação, como ajustar prazos conforme regras locais.

### REQ201 — Página 25

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de saúde pública, como ajustar tarefas conforme alertas sanitários.

### REQ202 — Página 25

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de emergência, como suspender tarefas não essenciais em situações críticas.

### REQ203 — Página 25

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de energia, como reduzir sincronizações em modo de economia.

### REQ204 — Página 25

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de desempenho, como adiar tarefas pesadas em dispositivos lentos.

### REQ205 — Página 25

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de armazenamento, como compactar dados quando o espaço estiver baixo.

### REQ206 — Página 26

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de memória, como liberar recursos quando a memória estiver baixa.

### REQ207 — Página 26

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de rede, como priorizar sincronizações em redes rápidas.

### REQ208 — Página 26

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de latência, como adiar sincronizações em redes lentas.

### REQ209 — Página 26

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de custo de dados, como sincronizar apenas em redes sem custo.

### REQ210 — Página 26

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de roaming, como evitar sincronizações fora da rede local.

### REQ211 — Página 26

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de segurança de rede, como bloquear sincronizações em redes não confiáveis.

### REQ212 — Página 26

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de privacidade de rede, como anonimizar metadados em redes públicas.

### REQ213 — Página 26

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de conformidade, como registrar auditorias de acesso a tarefas sensíveis.

### REQ214 — Página 27

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de transparência, como informar quais dados foram acessados.

### REQ215 — Página 27

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de consentimento, como solicitar autorização antes de acessar sensores.

### REQ216 — Página 27

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de revogação, como desativar acessos quando o consentimento for retirado.

### REQ217 — Página 27

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de auditoria, como registrar todas as alterações em tarefas sensíveis.

### REQ218 — Página 27

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de recuperação, como restaurar dados após falhas.

### REQ219 — Página 27

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de contingência, como operar offline quando a rede falhar.

### REQ220 — Página 27

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de emergência, como priorizar tarefas críticas em situações de risco.

### REQ221 — Página 28

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de saúde, como ajustar tarefas conforme indicadores de bem-estar.

### REQ222 — Página 28

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de acessibilidade, como adaptar notificações conforme recursos ativos.

### REQ223 — Página 28

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de internacionalização, como adaptar formatos de data e hora conforme a região.

### REQ224 — Página 28

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de localização, como adaptar unidades de medida conforme o país.

### REQ225 — Página 28

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de cultura, como adaptar saudações e mensagens conforme costumes locais.

### REQ226 — Página 28

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de legislação, como adaptar prazos conforme feriados e regras locais.

### REQ227 — Página 28

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de saúde pública, como adaptar tarefas conforme alertas sanitários.

### REQ228 — Página 28

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de emergência, como suspender tarefas não essenciais em situações críticas.

### REQ229 — Página 29

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de energia, como reduzir sincronizações em modo de economia.

### REQ230 — Página 29

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de desempenho, como adiar tarefas pesadas em dispositivos lentos.

### REQ231 — Página 29

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de armazenamento, como compactar dados quando o espaço estiver baixo.

### REQ232 — Página 29

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de memória, como liberar recursos quando a memória estiver baixa.

### REQ233 — Página 29

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de rede, como priorizar sincronizações em redes rápidas.

### REQ234 — Página 29

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de latência, como adiar sincronizações em redes lentas.

### REQ235 — Página 29

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de custo de dados, como sincronizar apenas em redes sem custo.

### REQ236 — Página 30

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de roaming, como evitar sincronizações fora da rede local.

### REQ237 — Página 30

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de segurança de rede, como bloquear sincronizações em redes não confiáveis.

### REQ238 — Página 30

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de privacidade de rede, como anonimizar metadados em redes públicas.

### REQ239 — Página 30

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de conformidade, como registrar auditorias de acesso a tarefas sensíveis.

### REQ240 — Página 30

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de transparência, como informar quais dados foram acessados.

### REQ241 — Página 30

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de consentimento, como solicitar autorização antes de acessar sensores.

### REQ242 — Página 30

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de revogação, como desativar acessos quando o consentimento for retirado.

### REQ243 — Página 30

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de auditoria, como registrar todas as alterações em tarefas sensíveis.

### REQ244 — Página 31

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de recuperação, como restaurar dados após falhas.

### REQ245 — Página 31

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de contingência, como operar offline quando a rede falhar.

### REQ246 — Página 31

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de emergência, como priorizar tarefas críticas em situações de risco.

### REQ247 — Página 31

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de saúde, como ajustar tarefas conforme indicadores de bem-estar.

### REQ248 — Página 31

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de acessibilidade, como adaptar notificações conforme recursos ativos.

### REQ249 — Página 31

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de internacionalização, como adaptar formatos de data e hora conforme a região.

### REQ250 — Página 31

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de localização, como adaptar unidades de medida conforme o país.

### REQ251 — Página 32

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de cultura, como adaptar saudações e mensagens conforme costumes locais.

### REQ252 — Página 32

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de legislação, como adaptar prazos conforme feriados e regras locais.

### REQ253 — Página 32

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de saúde pública, como adaptar tarefas conforme alertas sanitários.

### REQ254 — Página 32

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de emergência, como suspender tarefas não essenciais em situações críticas.

### REQ255 — Página 32

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de energia, como reduzir sincronizações em modo de economia.

### REQ256 — Página 32

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de desempenho, como adiar tarefas pesadas em dispositivos lentos.

### REQ257 — Página 32

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de armazenamento, como compactar dados quando o espaço estiver baixo.

### REQ258 — Página 32

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de memória, como liberar recursos quando a memória estiver baixa.

### REQ259 — Página 33

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de rede, como priorizar sincronizações em redes rápidas.

### REQ260 — Página 33

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de latência, como adiar sincronizações em redes lentas.

### REQ261 — Página 33

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de custo de dados, como sincronizar apenas em redes sem custo.

### REQ262 — Página 33

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de roaming, como evitar sincronizações fora da rede local.

### REQ263 — Página 33

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de segurança de rede, como bloquear sincronizações em redes não confiáveis.

### REQ264 — Página 33

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de privacidade de rede, como anonimizar metadados em redes públicas.

### REQ265 — Página 33

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de conformidade, como registrar auditorias de acesso a tarefas sensíveis.

### REQ266 — Página 34

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de transparência, como informar quais dados foram acessados.

### REQ267 — Página 34

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de consentimento, como solicitar autorização antes de acessar sensores.

### REQ268 — Página 34

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de revogação, como desativar acessos quando o consentimento for retirado.

### REQ269 — Página 34

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de auditoria, como registrar todas as alterações em tarefas sensíveis.

### REQ270 — Página 34

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de recuperação, como restaurar dados após falhas.

### REQ271 — Página 34

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de contingência, como operar offline quando a rede falhar.

### REQ272 — Página 34

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de emergência, como priorizar tarefas críticas em situações de risco.

### REQ273 — Página 34

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de saúde, como ajustar tarefas conforme indicadores de bem-estar.

### REQ274 — Página 35

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de acessibilidade, como adaptar notificações conforme recursos ativos.

### REQ275 — Página 35

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de internacionalização, como adaptar formatos de data e hora conforme a região.

### REQ276 — Página 35

O aplicativo deve permitir a configuração de lembretes por eventos de sensores de contexto de localização, como adaptar unidades de medida conforme o país.

---

## Próxima etapa de documentação

A partir deste catálogo, criar separadamente:

1. `docs/requisitos/rastreabilidade.md` — requisito → User Story → Issue → Task → Branch → PR → Teste;
2. `docs/backlog/backlog-produto.md` — priorização e transformação dos requisitos em backlog;
3. `docs/backlog/entregas.md` — divisão em Entrega 1, Entrega 2 e Entrega 3;
4. `docs/sprints/sprint-1.md` — escopo efetivo da primeira Sprint.

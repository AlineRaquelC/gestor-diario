# Sprint 1 — Gestor Diário

## 1. Identificação

- **Produto:** Gestor Diário
- **Entrega associada:** Entrega 1 — MVP
- **Status:** Em planejamento / preparação técnica
- **Base documental:** `docs/requisitos/requisitos-oficiais.md`, `docs/backlog/backlog-produto.md` e `docs/backlog/entregas.md`
- **Plataforma:** Android
- **Mobile:** React Native + TypeScript
- **Backend previsto:** Node.js
- **Banco de dados:** a definir na decisão de arquitetura da Sprint
- **Persistência local existente:** AsyncStorage
- **Fluxo de desenvolvimento:** Issue → Branch → Commit → Pull Request → `dev` → testes/CI → Pull Request → `main`

> **Nota de rastreabilidade:** o conteúdo desta Sprint é uma **decisão de planejamento do projeto**. Os requisitos de origem vêm exclusivamente das páginas 1 a 35 do documento fornecido pelo professor. A Sprint não altera nem substitui os requisitos oficiais.

---

## 2. Sprint Goal

> **Entregar um MVP integrado do Gestor Diário, conectando o fluxo principal já existente no aplicativo React Native a uma mini API Node.js e a um banco de dados, com persistência, validações, histórico mínimo, sincronização manual e uma base inicial de testes e integração contínua.**

O objetivo principal da Sprint não é adicionar grande quantidade de novas telas, mas transformar o protótipo funcional atual em um incremento tecnicamente integrado e demonstrável.

---

## 3. Contexto de início da Sprint

O aplicativo mobile já possui implementação conhecida para parte relevante do fluxo principal.

### Funcionalidades existentes no mobile e que devem ser auditadas

- criação de tarefas;
- visualização de detalhes da tarefa;
- edição de tarefas;
- conclusão de tarefas;
- exclusão com confirmação;
- descrição;
- data de início;
- prazo;
- horário;
- prioridade;
- status;
- subtarefas;
- projetos;
- criação de projetos;
- detalhes de projeto;
- edição de projetos;
- exclusão de projetos;
- escolha de cor e ícone do projeto;
- vínculo tarefa ↔ projeto;
- dashboard/Home;
- navegação principal;
- persistência local com AsyncStorage.

### Regras já adicionadas no mobile

- uma nova tarefa não deve aceitar data inicial anterior à data atual;
- o prazo não deve ser anterior à data de início.

### Lacunas estruturais conhecidas no início da Sprint

- mini API Node.js ainda não integrada;
- banco de dados ainda não definido/implementado;
- camada de services HTTP ainda precisa ser criada ou validada;
- estratégia AsyncStorage ↔ API ↔ banco ainda precisa ser formalmente definida;
- histórico de alterações ainda precisa ser implementado conforme requisitos selecionados;
- desfazer exclusão ainda é um gap conhecido;
- CI inicial ainda precisa ser configurada;
- testes e erros pré-existentes de Jest/TypeScript/lint precisam ser auditados sem refatoração indiscriminada;
- configuração Android de release ainda utiliza assinatura de debug temporária e não faz parte da solução final de distribuição.

---

# 4. Escopo selecionado da Sprint 1

A Sprint 1 seleciona apenas parte da Entrega 1. Os demais PBIs da Entrega 1 permanecem no Product Backlog para Sprints posteriores.

| PBI | Capacidade | Origem | Área | Prioridade | Situação inicial |
|---|---|---|---|---|---|
| **PBI-01** | Criar tarefa com dados obrigatórios e validação | RF01 | Front / Backend / Banco | Alta | Parcial — Mobile |
| **PBI-02** | Editar tarefa e registrar última modificação | RF03 | Front / Backend / Banco | Alta | Parcial — Mobile |
| **PBI-03** | Excluir tarefa com confirmação e desfazer | RF04 | Front / Backend / Banco | Alta | Parcial — Mobile |
| **PBI-04** | Controlar status e histórico da tarefa | RF05, RF17 | Front / Backend / Banco | Alta | Parcial — Mobile |
| **PBI-06** | Criar subtarefas e calcular progresso | RF09, RF10 | Front / Backend / Banco | Alta | Parcial — Mobile |
| **PBI-08** | Organizar tarefas em projetos/etiquetas | RF12 | Front / Backend / Banco | Alta | Parcial — Mobile |
| **PBI-09** | Exibir dashboard de produtividade | RF23 | Front / Backend | Alta | Parcial — Mobile |
| **PBI-11** | Sincronizar manualmente com servidor Node.js | RF20 | Front / Backend / Banco | Alta | Bloqueado por arquitetura |

## PBIs da Entrega 1 fora desta Sprint

Os seguintes itens continuam importantes, mas não fazem parte do compromisso inicial da Sprint 1:

| PBI | Motivo para permanecer no backlog |
|---|---|
| **PBI-05** — Visualização diária, semanal e mensal | requer refinamento funcional específico do calendário e pode ampliar o escopo do primeiro incremento integrado |
| **PBI-07** — Múltiplas observações | não é necessário para validar o primeiro fluxo fim a fim Mobile → API → Banco |
| **PBI-10** — Filtros e ordenação | evolução de consulta após consolidação do CRUD e persistência integrada |

> Caso a Sprint termine com capacidade disponível e todos os itens comprometidos estejam concluídos, PBIs adicionais só devem entrar após novo planejamento, sem alterar retroativamente o compromisso original.

---

# 5. Critérios de aceite por PBI

## PBI-01 — Criar tarefa

**Como pessoa usuária, quero criar uma tarefa para registrar uma atividade que preciso realizar.**

### Critérios de aceite

- [ ] informar título;
- [ ] informar descrição;
- [ ] informar data de início;
- [ ] informar prazo;
- [ ] informar prioridade;
- [ ] validar campos obrigatórios;
- [ ] impedir nova tarefa com data inicial anterior ao dia atual;
- [ ] impedir prazo anterior à data inicial;
- [ ] enviar a criação para a API;
- [ ] persistir a tarefa no banco;
- [ ] refletir a nova tarefa imediatamente no estado do aplicativo;
- [ ] manter comportamento local coerente com a estratégia de sincronização definida.

---

## PBI-02 — Editar tarefa

**Como pessoa usuária, quero editar uma tarefa para manter seus dados atualizados.**

### Critérios de aceite

- [ ] editar título, descrição, datas, horário, prioridade, projeto e status quando aplicável;
- [ ] persistir a alteração na API/banco;
- [ ] registrar `updatedAt`/última modificação;
- [ ] refletir a alteração imediatamente nos detalhes e demais telas relacionadas;
- [ ] preservar fluxo de navegação sem duplicação indevida de telas;
- [ ] tratar recurso inexistente e erro de servidor de forma compreensível.

---

## PBI-03 — Excluir tarefa e desfazer

**Como pessoa usuária, quero excluir uma tarefa com segurança e poder desfazer a ação por curto período.**

### Critérios de aceite

- [ ] pedir confirmação antes de excluir;
- [ ] remover a tarefa das listagens após confirmação;
- [ ] permitir desfazer a exclusão por um curto período definido pela implementação;
- [ ] manter armazenamento temporário suficiente para restaurar a tarefa;
- [ ] refletir exclusão/restauração na API e no banco;
- [ ] evitar inconsistência entre cache local e servidor;
- [ ] após expirar o período de desfazer, considerar a exclusão efetiva.

---

## PBI-04 — Status e histórico

**Como pessoa usuária, quero controlar o estado da tarefa e acompanhar seu histórico.**

### Critérios de aceite

- [ ] suportar os estados exigidos pelo requisito oficial selecionado;
- [ ] manter coerência entre `status` e indicadores de conclusão;
- [ ] registrar eventos relevantes de criação, edição, mudança de status e exclusão/restauração quando aplicável;
- [ ] persistir o histórico no banco;
- [ ] disponibilizar histórico pela API;
- [ ] refletir mudanças de status no dashboard e nas telas relacionadas.

---

## PBI-06 — Subtarefas e progresso

**Como pessoa usuária, quero dividir tarefas em subtarefas para acompanhar o progresso da atividade.**

### Critérios de aceite

- [ ] criar subtarefas;
- [ ] editar/remover subtarefas quando suportado pelo fluxo atual;
- [ ] marcar subtarefas como concluídas ou pendentes;
- [ ] persistir subtarefas na API/banco;
- [ ] calcular o percentual de progresso com base nas subtarefas;
- [ ] apresentar progresso de forma consistente nas telas relevantes.

---

## PBI-08 — Projetos/etiquetas

**Como pessoa usuária, quero organizar tarefas em projetos ou categorias para manter minhas atividades agrupadas.**

### Critérios de aceite

- [ ] criar projeto/categoria;
- [ ] editar projeto/categoria;
- [ ] excluir projeto/categoria com tratamento das tarefas vinculadas;
- [ ] permitir vínculo de tarefa a projeto/categoria;
- [ ] persistir projetos e vínculos no banco;
- [ ] usar identificador estável no backend/banco para relacionamentos;
- [ ] evitar deixar tarefas órfãs após exclusão de projeto;
- [ ] manter cor/ícone como atributos de apresentação quando existentes no modelo atual.

---

## PBI-09 — Dashboard

**Como pessoa usuária, quero visualizar indicadores das minhas tarefas para acompanhar meu progresso.**

### Critérios de aceite

- [ ] apresentar dados reais, não mocks;
- [ ] exibir indicadores de tarefas concluídas, pendentes e atrasadas quando aplicável;
- [ ] atualizar automaticamente após criação, edição, conclusão ou exclusão;
- [ ] utilizar os dados integrados definidos pela arquitetura;
- [ ] tratar carregamento e falha de comunicação sem quebrar a Home.

---

## PBI-11 — Sincronização manual

**Como pessoa usuária, quero sincronizar manualmente minhas tarefas com um servidor local Node.js para manter os dados persistidos fora do dispositivo.**

### Critérios de aceite

- [ ] existir uma mini API Node.js executável localmente;
- [ ] existir banco de dados persistente para os dados do MVP;
- [ ] o mobile possuir camada de serviço HTTP separada das telas;
- [ ] existir ação ou fluxo de sincronização manual compatível com o requisito;
- [ ] definir e documentar qual fonte de dados prevalece em caso de divergência;
- [ ] tratar indisponibilidade do servidor sem perda silenciosa dos dados locais;
- [ ] apresentar resultado da sincronização ao usuário;
- [ ] validar comunicação em ambiente Android/emulador.

---

# 6. Enablers técnicos comprometidos na Sprint

Os itens abaixo são necessários para que os PBIs funcionais sejam entregues com qualidade e integração real.

| ID | Enabler | Área | Resultado esperado |
|---|---|---|---|
| **TEC-01** | Estruturar a mini API Node.js | Backend | servidor local executável e organizado |
| **TEC-02** | Definir e documentar o banco do MVP | Banco / Arquitetura | decisão técnica registrada antes da implementação |
| **TEC-03** | Modelar entidades do MVP | Banco / Backend | Task, Project/Tag, Subtask e History; demais entidades somente se necessárias ao escopo |
| **TEC-04** | Criar camada de services HTTP no mobile | Front / Arquitetura | telas não fazem chamadas HTTP diretamente |
| **TEC-05** | Definir estratégia AsyncStorage ↔ servidor | Arquitetura | fonte de verdade, cache/offline e sincronização documentados |
| **TEC-06** | Reaplicar validações no backend | Backend | regras críticas não dependem apenas do front |
| **TEC-07** | Padronizar erros da API | Backend / Front | respostas HTTP e mensagens consistentes |
| **TEC-08** | Criar testes mínimos | Testes | CRUD e regras críticas validados |
| **TEC-09** | Configurar CI inicial | DevOps | lint/typecheck/testes executados automaticamente quando aplicável |
| **TEC-10** | Manter rastreabilidade | Documentação / DevOps | requisito → PBI → Issue → branch → PR → teste |

---

# 7. Decomposição inicial por área técnica

## 7.1 Front-end / Mobile

- auditar as telas existentes contra os critérios desta Sprint;
- corrigir gaps sem reescrever o aplicativo;
- criar/validar `services/` para comunicação HTTP;
- integrar Contexts com a estratégia definida para API/cache;
- criar tratamento de loading, sucesso e erro;
- implementar desfazer exclusão;
- alinhar status aos valores oficiais selecionados;
- garantir atualização do dashboard;
- preservar navegação atual validada;
- validar comportamento em Android.

## 7.2 Backend / Mini API

- definir estrutura Node.js adequada ao tamanho do projeto;
- criar configuração de servidor local;
- implementar endpoints mínimos necessários para Tasks, Projects, Subtasks, History e sincronização;
- aplicar validações de negócio;
- padronizar respostas e códigos HTTP;
- separar responsabilidades entre rotas/controllers/services/repositories conforme a arquitetura escolhida;
- documentar como executar a API.

## 7.3 Banco de dados

Antes da implementação, registrar a decisão de tecnologia do banco.

O modelo mínimo da Sprint deve atender:

- Task;
- Project/Tag;
- Subtask;
- History;
- relacionamentos necessários;
- timestamps de criação e atualização;
- integridade referencial compatível com a tecnologia escolhida.

Não duplicar atributos apenas para reproduzir estruturas temporárias do front se houver modelo relacional/estrutural mais estável.

## 7.4 DevOps

- manter desenvolvimento na branch `dev`;
- criar Issues antes das novas implementações;
- utilizar branches por trabalho;
- Conventional Commits no padrão `tipo(escopo): descrição`;
- Pull Requests para integração;
- configurar CI inicial de forma incremental;
- não versionar secrets;
- documentar variáveis de ambiente por arquivo de exemplo quando necessário.

## 7.5 Testes

Cobrir inicialmente:

- criação de tarefa válida;
- rejeição de payload inválido;
- validação de datas;
- edição;
- mudança de status;
- exclusão/restauração;
- subtarefas/progresso;
- projeto e vínculo com tarefa;
- recurso inexistente;
- persistência após reinício da API/banco;
- integração manual Mobile ↔ API;
- regressão básica do fluxo Android.

---

# 8. Decisões de arquitetura obrigatórias antes da implementação do backend

Antes de iniciar o código da API, deverão ser registradas decisões para:

1. tecnologia/framework Node.js a ser utilizada;
2. banco de dados do MVP;
3. estratégia de migrations/schema;
4. identificadores das entidades;
5. estratégia de relacionamento Task ↔ Project;
6. estratégia AsyncStorage ↔ API ↔ Banco;
7. comportamento offline;
8. resolução de divergências na sincronização manual;
9. formato padrão de erros;
10. configuração de URL da API no Android/emulador.

Essas decisões devem ser simples e proporcionais ao escopo acadêmico do projeto.

---

# 9. Definition of Ready — Sprint 1

Uma Issue só entra em desenvolvimento quando:

- [ ] está vinculada a um PBI/TEC da Sprint;
- [ ] possui objetivo claro;
- [ ] possui descrição suficiente;
- [ ] possui critérios de aceite quando funcional;
- [ ] área técnica está identificada;
- [ ] dependências relevantes estão conhecidas;
- [ ] arquitetura necessária já foi decidida quando aplicável;
- [ ] não exige requisito inventado fora da documentação oficial.

---

# 10. Definition of Done — Sprint 1

Um item somente é considerado concluído quando:

- [ ] critérios de aceite atendidos;
- [ ] código implementado e executável;
- [ ] sem erro bloqueante introduzido pela alteração;
- [ ] testes relevantes executados;
- [ ] validações de backend implementadas quando aplicável;
- [ ] persistência validada quando aplicável;
- [ ] documentação atualizada;
- [ ] Issue referenciada na branch/PR;
- [ ] commit segue Conventional Commits;
- [ ] Pull Request revisado;
- [ ] integração realizada em `dev`;
- [ ] CI relacionada ao item está verde ou eventual falha pré-existente está documentada;
- [ ] comportamento validado no Android quando o item impacta o mobile.

---

# 11. Definition of Done da Sprint

A Sprint 1 pode ser encerrada quando:

- [ ] PBIs comprometidos foram concluídos ou formalmente renegociados;
- [ ] mini API Node.js está executável;
- [ ] banco do MVP está definido, documentado e persistindo dados;
- [ ] fluxo principal funciona de ponta a ponta;
- [ ] criar tarefa persiste via API/banco;
- [ ] editar tarefa persiste via API/banco;
- [ ] status e progresso permanecem consistentes;
- [ ] excluir/desfazer funciona conforme critério definido;
- [ ] projetos e vínculos persistem;
- [ ] dashboard usa dados reais;
- [ ] sincronização manual foi demonstrada;
- [ ] AsyncStorage e servidor não funcionam como fontes conflitantes sem regra definida;
- [ ] testes mínimos da API/regras críticas foram executados;
- [ ] CI inicial existe e está documentada;
- [ ] aplicativo executa no Android sem erro bloqueante causado pela Sprint;
- [ ] documentação e rastreabilidade estão atualizadas;
- [ ] incremento está demonstrável ao professor.

---

# 12. Fora do escopo desta Sprint

Não implementar nesta Sprint, salvo replanejamento explícito:

- visualização semanal/mensal completa do PBI-05;
- múltiplas observações do PBI-07;
- filtros/ordenação completos do PBI-10;
- recorrência;
- notificações avançadas;
- backup/importação/exportação;
- sincronização automática;
- relatórios avançados;
- câmera;
- GPS;
- QR Code;
- NFC;
- sensores;
- biometria;
- hardware contextual;
- APK final de produção;
- assinatura definitiva de release.

---

# 13. Riscos da Sprint

| Risco | Impacto | Tratamento |
|---|---|---|
| Integrar API pode quebrar fluxo mobile já funcional | Alto | criar camada de services e migrar incrementalmente |
| AsyncStorage e servidor virarem duas fontes conflitantes | Alto | decidir estratégia antes da integração |
| Escopo de PBIs ainda ser grande | Alto | decompor em Issues pequenas e renegociar sem esconder trabalho |
| Erros pré-existentes de Jest/TypeScript/lint | Médio | separar falhas anteriores das introduzidas pela Sprint |
| Relação por nome de projeto gerar inconsistência | Médio | usar identificador estável no backend/banco |
| API local não ser acessível pelo emulador Android | Médio | documentar host/configuração específica do Android |
| Banco escolhido ser complexo demais para o MVP | Médio | priorizar solução simples e justificável |
| Desfazer exclusão exigir estratégia de soft delete/retention | Médio | decidir comportamento antes de implementar |

---

# 14. Estratégia de execução

Ordem recomendada:

```text
Documentação / arquitetura
        ↓
Issues da Sprint 1
        ↓
Banco + modelo
        ↓
Mini API Node.js
        ↓
Testes da API
        ↓
Services HTTP no mobile
        ↓
Integração incremental dos Contexts
        ↓
Correções dos gaps funcionais da Sprint
        ↓
Sincronização manual
        ↓
Dashboard integrado
        ↓
CI + regressão
        ↓
Demonstração do incremento
```

---

# 15. Demonstração planejada da Sprint

Ao final da Sprint, a demonstração deverá preferencialmente seguir este fluxo:

1. iniciar banco/backend;
2. iniciar aplicativo Android;
3. mostrar dashboard carregando dados reais;
4. criar um projeto;
5. criar uma tarefa vinculada ao projeto;
6. mostrar validação de datas/prioridade;
7. abrir detalhes;
8. editar a tarefa;
9. criar/concluir subtarefas e mostrar progresso;
10. mudar status da tarefa;
11. demonstrar persistência após recarregar/reabrir;
12. excluir e demonstrar desfazer dentro do período definido;
13. executar sincronização manual;
14. mostrar que os dados permanecem no banco;
15. mostrar rapidamente o pipeline/PRs/documentação da Sprint.

---

# 16. Métricas de acompanhamento

Durante a Sprint podem ser acompanhados:

- PBIs concluídos / comprometidos;
- Issues concluídas / planejadas;
- PRs abertos e integrados;
- testes executados;
- falhas de CI;
- bugs bloqueantes;
- cobertura funcional dos critérios de aceite;
- itens renegociados e motivo.

Não utilizar quantidade de commits ou linhas de código como métrica de produtividade individual.

---

# 17. Próximos passos após versionar este documento

1. revisar o escopo da Sprint 1 no repositório;
2. criar as decisões de arquitetura necessárias para API e banco;
3. decompor cada PBI/TEC comprometido em Issues pequenas e rastreáveis;
4. estimar as Issues;
5. criar milestone/identificação da Sprint 1 no GitHub;
6. configurar o primeiro CI mínimo;
7. iniciar a implementação pela arquitetura aprovada, sem refazer o front que já funciona.


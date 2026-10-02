# Diagnóstico da estrutura duplicada

Data: 2026-10-01. Classificação: A — cópia redundante do template inicial.

## Projeto principal
A raiz do workspace contém `App.tsx` com TaskProvider, ProjectProvider e AppNavigator, além de `src/` com a aplicação de tarefas/projetos e persistência local.

## Comparação integral dos arquivos de projeto
A pasta `GerenciadorTarefas/` contém 53 arquivos de projeto: Android, iOS, template App.tsx, package.json/lock, teste e configurações. Não possui `src/` nem Git próprio. Foram comparados os bytes de todos os arquivos de projeto, excluindo dependências e artefatos gerados. Dos 53, 46 são idênticos à raiz e 7 diferem. Não existem arquivos exclusivos da cópia.

| Arquivo diferente | Diagnóstico |
|---|---|
| App.tsx | Cópia contém NewAppScreen do template; raiz contém providers e navegação da aplicação. Cópia coincide com o commit inicial. |
| package.json | Cópia coincide com o commit inicial; raiz adicionou AsyncStorage, datetimepicker, React Navigation e screens, além de atualizar safe-area-context. Scripts npm são iguais. |
| package-lock.json | Ambos usam o mesmo nome técnico; lock da raiz registra as dependências adicionais. Lock da cópia também difere do inicial, sem aplicação exclusiva associada. |
| app.json | Mesmo nome técnico; raiz passou a exibir Gestor Diário. |
| android/app/src/main/res/values/strings.xml | Apenas nome exibido corrigido na raiz. |
| README.md | Template na cópia; documentação do projeto na raiz. |
| .gitignore | Template na cópia; regras de segurança e organização na raiz. |

Android, iOS, Metro, TypeScript, Babel, Jest, teste do template, configurações de formatação e demais arquivos comuns são idênticos. As keystores são idênticas e a principal coincide com o commit inicial.

## Datas observadas
Datas de modificação locais, que não comprovam a origem: os arquivos centrais da cópia foram modificados em 20/09/2026; App.tsx da raiz em 21/09; package.json e lock da raiz em 29/09. Metro e TypeScript da raiz são de 18/09. Nomes exibidos e documentação da raiz foram atualizados em 01/10.

## Referências
Não foram encontradas dependências diretas da aplicação principal sobre a pasta aninhada em scripts npm, imports, Metro ou Gradle. Ocorrências do nome técnico no Android e em `ios/GerenciadorTarefas/` são referências internas legítimas, não à cópia na raiz.

TypeScript utiliza `**/*.ts` e `**/*.tsx` e não exclui a cópia; logo pode incluí-la implicitamente. Jest também a descobre e já apresentou colisão entre os dois package.json. Metro usa configuração padrão sem referência explícita à cópia. Ignorar no Git não muda o comportamento dessas ferramentas.

## Recomendação
Preservar a pasta no disco nesta etapa e ignorar `/GerenciadorTarefas/` no Git. Antes de eventual remoção, criar backup verificado fora da árvore da aplicação, confirmar que os 53 arquivos continuam sem conteúdo exclusivo e obter autorização. Após retirar a cópia da árvore, repetir Jest, TypeScript e lint; isso pode resolver a colisão, mas não as demais falhas já registradas.

Nenhuma pasta foi removida, configuração de build alterada ou operação de staging/publicação realizada.

## Tratamento executado — 2026-10-02

Backup criado em `/home/aline/Área de trabalho/DispositivosMoveis/GerenciadorTarefas-template-backup`, fora do repositório. Comparação integral de nomes, diretórios, links e SHA-256 dos arquivos confirmou igualdade: 30.370 entradas, incluindo 26.266 arquivos e dependências. Somente depois dessa verificação a pasta interna foi removida; a raiz principal foi preservada.

Package.json continua válido e suas dependências coincidem com o lockfile. Os 17 arquivos TSX de src e os arquivos principais Android permanecem presentes. Não foi necessário npm install.

Após remoção: Jest deixou de apresentar colisão, mas mantém o erro anterior de ES modules do React Navigation; TypeScript mantém incompatibilidades de StatusBar e valores possivelmente undefined; lint mantém 19 erros e 10 avisos. Não foram observadas novas falhas atribuíveis à remoção. Execução Android/build não foi validada.

Checagem de segurança encontrou somente a debug.keystore permitida. Não houve correspondências nos padrões pesquisados para tokens GitHub/AWS, chaves privadas ou atribuições literais de credenciais. O backup, fora da raiz Git, não integra o versionamento. A regra que ignora a antiga pasta foi preservada para impedir reinclusão acidental.

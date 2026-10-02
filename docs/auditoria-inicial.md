# Auditoria inicial — 2026-10-01

## Estrutura e Git antes das alterações
Aplicação na raiz com Android, iOS, src/screens, src/navigation, src/components e src/context. Services e backend ausentes. Documentação existente: apenas docs/prompts/setup-github-codex.md. Cópia de template em GerenciadorTarefas/, não rastreada; nenhuma estrutura foi movida ou excluída.

Git inicializado, branch main, commit 02ff8fa (Initial commit), sem remotes. Alterações anteriores em App.tsx, package.json e package-lock.json; src/, docs/ e GerenciadorTarefas/ não rastreados.

Nome técnico: GerenciadorTarefas; package name, applicationId, namespaces e chaves locais serão preservados.

## Ambiente
Node v24.21.0; npm 11.19.0; Git 2.43.0; GitHub CLI 2.45.0. React Native 0.87.1, React 19.2.3, TypeScript 6.0.3. npm ls --depth=0 concluiu sem dependências ausentes. package-lock.json presente.

## Validação anterior a mudanças
- npm test -- --runInBand: falhou no teste da aplicação raiz ao importar React Navigation (ES modules). Colisão de nomes com a cópia aninhada; somente o teste do template aninhado passou.
- ./node_modules/.bin/tsc --noEmit: falhou, incluindo uso de backgroundColor em StatusBar e project possivelmente undefined.
- npm run lint: falhou com 19 erros e 10 avisos, incluindo Hooks condicionais nas telas de edição.

O funcionamento do aplicativo não está confirmado. Build e execução em dispositivo não foram validados; nenhum APK foi gerado. Não alterar regras de negócio ou refatorar para ocultar essas falhas nesta etapa.

## Segurança e artefatos
Caches e builds Android presentes localmente e ignorados. Não encontrados PDF oficial, arquivos .env, .pem ou .jks fora das dependências nos padrões pesquisados. Busca inicial por padrões de PAT GitHub, AWS e chaves privadas não encontrou correspondências. Isso não certifica ausência de todo tipo de segredo.

A chave padrão `android/app/debug.keystore` é uma exceção de desenvolvimento autorizada. Sua cópia aninhada é idêntica. A variante release usa temporariamente debug signing, pendência para a entrega final. Gradle e as chaves foram preservados. Ver [decisão de assinatura](decisoes/assinatura-android.md) e [comparação da estrutura](diagnostico-estrutura-duplicada.md).

## Pendências
Confirmar funcionamento após resolver as falhas existentes,  obter páginas 1 a 35 do PDF oficial e concluir a etapa GitHub após autenticação. Não implementar API, banco ou novas funcionalidades.

## Atualização — 2026-10-02

Cópia aninhada removida após backup integral verificado no diretório pai. A colisão Jest desapareceu; as demais falhas conhecidas permanecem, sem mudanças funcionais. Somente a debug.keystore padrão foi encontrada na nova checagem de arquivos sensíveis. A autenticação estava inválida nessa verificação e foi concluída posteriormente com autorização pelo navegador. Nenhum staging, commit ou push foi executado nesta etapa.

# Decisão — Assinatura Android

Data: 2026-10-01. Status: adotada para desenvolvimento; assinatura final pendente.

## Evidências
`android/app/debug.keystore` já está versionada e coincide com a chave do commit inicial. A cópia em `GerenciadorTarefas/android/app/debug.keystore` é idêntica byte a byte. Ambas apresentam o alias e a identidade padrão Android Debug e podem ser abertas com a senha pública do template. Não foram encontrados outros keystores ou arquivos de assinatura de produção na árvore inspecionada, excluindo dependências e metadados Git.

## Decisão
- `debug.keystore` é uma chave de desenvolvimento, não um secret de produção.
- Preservar a chave principal e a configuração Gradle nesta etapa.
- Permitir no Git apenas a exceção `android/app/debug.keystore`; a cópia aninhada permanece local e ignorada.
- A configuração atual de `buildTypes.release` usa `signingConfigs.debug`. Isso é temporário e constitui pendência técnica, não uma assinatura adequada para entrega final.

## Risco e ação futura
Uma variante release assinada com a chave pública de debug não oferece a proteção de identidade necessária para distribuição final. Antes da entrega final/APK definitivo, configurar assinatura própria de release e armazenamento seguro da chave e das credenciais. Não criar a chave nem modificar `signingConfigs` nesta etapa.

Release keystore, senhas, `key.properties`, tokens e secrets nunca deverão entrar no Git. Manter também `.env`, `.env.*`, `.jks`, demais `.keystore`, `local.properties` e chaves privadas ignorados. A exceção é limitada à chave padrão de debug da raiz.

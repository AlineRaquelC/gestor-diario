# Arquitetura inicial — Gestor Diário

## Estado atual
Aplicativo React Native com TypeScript na raiz. `App.tsx` compõe os providers de tarefas e projetos e o navegador. `src/screens/` contém as telas; `src/components/`, componentes compartilhados; `src/navigation/`, as rotas; `src/context/`, o estado e a persistência local via AsyncStorage. Não há camada `services/` nem backend implementado.

As chaves internas de armazenamento existentes são preservadas para manter acesso aos dados locais. A tela de login apenas navega para a Home; não representa autenticação real.

## Arquitetura planejada
```text
React Native
       ↓
Context / Services
       ↓
API REST
       ↓
Node.js
       ↓
Banco de Dados
```

Banco de dados será definido na etapa de arquitetura da mini API.

A integração remota é futura. A aplicação permanece na raiz para preservar Gradle, Metro, imports e scripts. Pastas `mobile/` e `backend/` são uma direção futura, sem migração nesta etapa. A cópia redundante do template foi removida em 02/10/2026 após backup integral verificado fora do repositório; ver o diagnóstico da estrutura duplicada.

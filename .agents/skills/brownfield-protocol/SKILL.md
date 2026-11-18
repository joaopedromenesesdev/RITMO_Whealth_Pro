---
name: brownfield-protocol
description: Protocolo obrigatorio de 9 fases para auditoria, analise e evolucao segura de sistemas existentes (Whealth Planner Pro). Toda alteracao DEVE passar por todas as 9 fases.
---

# Skill: Protocolo Brownfield (9 Fases Obrigatórias)

Para TODA e QUALQUER alteração no projeto (independente do tamanho), o agente DEVE seguir e exibir sequencialmente as 9 fases:

1. **Fase 1 — Project Auditor**: Auditoria da estrutura e arquivos envolvidos.
2. **Fase 2 — Current State Analyst**: Mapeamento funcional do componente afetado.
3. **Fase 3 — Architect Review**: Avaliação do impacto arquitetural e estabilidade.
4. **Fase 4 — Security Review**: Auditoria de segurança e dados sensíveis.
5. **Fase 5 — Migration Planner**: Plano de execução incremental.
6. **Fase 6 — Development**: Implementação pela cadeia: Motivo -> Implementação -> Teste -> Revisão.
7. **Fase 7 — QA Regression**: Testes de não regressão do sistema legado.
8. **Fase 8 — Security Auditor**: Teste de vazamento e inspeção de rede.
9. **Fase 9 — Release**: Checklist final de liberação segura.

## Combinação com Skills Especializadas (Sob Demanda)

Em vez de aplicar regras genéricas, combine este protocolo com as skills compatíveis conforme o escopo da tarefa (lendo o `SKILL.md` apenas das que se aplicarem):

- **Investigação de bugs/falhas (Fases 1–2):** ativar `systematic-debugging` antes de propor qualquer correção.
- **Implementação de código JS/UI (Fase 6):** ativar `clean-code`; se houver prototipação visual interativa, combinar com `generative_ui`.
- **Banco Supabase / PostgreSQL / RLS / Auth (Fases 3–4, 6 e 8):** ativar `supabase`, `supabase-postgres-best-practices` e `database-security` (mantendo postura defensiva/somente leitura salvo confirmação explícita).
- **Segurança Client-Side, Auth, Banco ou Frontend (Fases 4 e 8):** ativar obrigatoriamente `client-security-gate`.
- **Testes e validação no navegador (Fases 6–8):** ativar `javascript-testing-patterns` (rodando `node tests/tributario_engine.test.js`) e `chrome-devtools` / `a11y-debugging` / `cookie-debugging` quando aplicável.
- **Arquitetura React / React Native (apenas em projetos/migrações dessa stack):** ativar `frontend-architecture`.

## Exit Gates Obrigatórios

- **Gate Fase 5 (Plano ➔ Implementação):** parar e aguardar aprovação explícita do usuário antes de editar arquivos sempre que a tarefa envolver SQL/migrations, Auth, regras de segurança ou tocar em mais de 2 arquivos.
- **Gate Fase 7 (QA Regression):** bloquear avanço para a Fase 8 se `node tests/tributario_engine.test.js` falhar.
- **Gate Fase 8 (Security & Browser Audit):** uso obrigatório de `chrome-devtools` (F12) em alterações de `.html`, `.css` ou `.js` de interface, exigindo zero erros de console e ausência de respostas inesperadas `401`/`403`/`500`.

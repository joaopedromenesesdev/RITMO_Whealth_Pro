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

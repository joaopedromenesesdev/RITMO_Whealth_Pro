# 🛡️ Diretrizes e Regras do Projeto — Whealth Planner Pro

Este arquivo define os protocolos obrigatórios que o agente AI (Antigravity) deve seguir em todas as tarefas e conversas neste projeto.

---

## 📌 PROTOCOLO BROWNFIELD OBRIGATÓRIO (9 FASES EM TODAS AS ALTERAÇÕES)

Toda e qualquer solicitação de alteração, ajuste de interface ou nova funcionalidade (por menor que seja) **DEVE OBRIGATORIAMENTE passar por TODAS as 9 FASES** do Protocolo Brownfield em sequência, exibindo o relatório com o progresso de cada fase antes de concluir a tarefa.

### Regra Principal
* **Nunca reescreva um sistema funcional sem justificativa.**
* **Sempre busque a menor mudança segura que melhora o sistema.**
* **Toda alteração deve passar por todas as 9 fases sem suprimir etapas.**

---

### Fases de Execução Obrigatórias (1 a 9):

1. **FASE 1 — PROJECT AUDITOR**: Auditoria da estrutura, arquivos, tecnologias e dependências impactadas.
2. **FASE 2 — CURRENT STATE ANALYST**: Mapeamento do estado atual e fluxo afetado.
3. **FASE 3 — ARCHITECT REVIEW**: Avaliação do impacto arquitetural e riscos de regressão.
4. **FASE 4 — SECURITY REVIEW**: Auditoria de segurança, permissões e dados sensíveis.
5. **FASE 5 — MIGRATION PLANNER**: Plano de execução seguro minucioso.
6. **FASE 6 — DEVELOPMENT**: Implementação guiada pela cadeia: *Motivo ➔ Implementação ➔ Teste ➔ Revisão*.
7. **FASE 7 — QA REGRESSION**: Validação de não regressão das funcionalidades legadas.
8. **FASE 8 — SECURITY AUDITOR**: Verificação de integridade e vazamentos no F12.
9. **FASE 9 — RELEASE**: Confirmação final e liberação segura.

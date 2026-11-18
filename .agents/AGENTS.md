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

---

## 🧩 Matriz de Combinação: Brownfield + Skills (Carregamento Sob Demanda)

Para manter o contexto enxuto (*progressive disclosure*), o agente NÃO deve carregar todas as skills de uma vez — deve ativar (lendo o respectivo `SKILL.md`) apenas as skills aplicáveis ao tipo de tarefa dentro de cada fase:

| Tipo de Tarefa / Domínio | Fases Onde Atuar | Skills Combinadas ao Protocolo |
| :--- | :--- | :--- |
| **Bugs, falhas em testes ou comportamento inesperado** | Fases 1, 2, 6, 7 | `systematic-debugging` (investigar causa raiz antes de corrigir) |
| **Código JS/HTML/CSS (lógica, refatoração, UI)** | Fase 6 | `clean-code` (nomes claros, funções curtas, sem duplicação) |
| **Testes unitários e regressão JS** | Fases 6, 7 | `javascript-testing-patterns` + execução de `node tests/tributario_engine.test.js` |
| **Banco, SQL, Migrations, RLS, Auth ou Edge Functions** | Fases 3, 4, 6, 8 | `supabase` + `supabase-postgres-best-practices` + `database-security` (modo defensivo/leitura; confirmar antes de qualquer comando ativo) |
| **Segurança Client-Side, Auth, Banco ou Frontend** | Fases 4, 8 | `client-security-gate` (carregamento obrigatório: zero segredos no cliente, RLS sem `true` aberto e anti-XSS) |
| **Inspeção visual, F12, cookies/sessão ou acessibilidade** | Fases 2, 7, 8 | `chrome-devtools` (e `cookie-debugging` / `a11y-debugging` quando pertinente) |
| **Protótipos/previews antes de editar UI** | Fases 5, 6 | `generative_ui` (quando solicitado ou útil para validar layout com o usuário) |
| **Planejamento de migração para React / React Native** | Fases 1, 3, 5 | `frontend-architecture` *(não aplicar no legado Vanilla HTML/JS atual)* |

---

## 🚦 Exit Gates Obrigatórios (Portões de Bloqueio)

Nenhuma fase subsequente pode iniciar sem cumprir o critério do gate correspondente:

1. **Gate Fase 5 (Plano ➔ Implementação):** Parar obrigatoriamente e aguardar **aprovação explícita do usuário** antes de editar qualquer arquivo sempre que a tarefa envolver SQL/migrations, Auth, regras de segurança ou modificar **mais de 2 arquivos**.
2. **Gate Fase 7 (QA Regression):** É **proibido avançar para a Fase 8** se `node tests/tributario_engine.test.js` apresentar qualquer falha (inclusive validação sintática `vm.Script` ou Secret Scanner).
3. **Gate Fase 8 (Security & Browser Audit):** Sempre que houver alteração em `.html`, `.css` ou `.js` de interface, é **obrigatório** inspecionar via `chrome-devtools` (F12), exigindo **zero erros no Console** e **ausência de falhas inesperadas de rede (`401`/`403`/`500`)** antes de seguir para a Fase 9.

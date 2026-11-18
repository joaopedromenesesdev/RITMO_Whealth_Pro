---
name: client-security-gate
description: "Gate obrigatorio de seguranca defensiva para Frontend Vanilla JS + Supabase (Zero Segredos no Cliente, Blindagem de RLS e Protecao XSS). Ativar nas Fases 4 e 8 do Brownfield Protocol."
risk: safe
---

# Client Security Gate (Frontend Vanilla JS + Supabase)

Skill de auditoria defensiva obrigatoria nas **Fases 4 (Security Review)** e **8 (Security Auditor)** para qualquer alteracao em frontend (`.html`, `.css`, `.js`), autenticacao ou banco (`supabase/`).

---

## Regras Obrigatorias (Bloqueantes)

### 1. Zero Segredos no Cliente
- **Proibido** inserir `service_role`, tokens privados (`sbp_`, `sk_*`, `sb_secret_*`), chaves privadas (`BEGIN PRIVATE KEY`), `APP_PEPPER` ou listas estaticas de privilegios (`MASTER_UIDS`) em qualquer arquivo `.js` ou `.html` servido ao navegador.
- Toda verificacao de privilegio administrativo (`master`), envio autenticado de e-mail ou manipulacao com chave privilegiada deve residir exclusivamente em **Edge Functions** (`supabase/functions/`) ou em **politicas RLS / funcoes `SECURITY DEFINER`** no PostgreSQL.
- *Excecao controlada de legado:* `APP_PEPPER` (em `script/db.js`) e `MASTER_UIDS_AUTORIZADOS` (em `auth.js`, `db.js`, `tributario_engine.js`) estao marcados para migracao gradual; **e estritamente proibido replicar ou criar novas referencias estaticas** desses padroes no cliente.

### 2. Blindagem de Row Level Security (RLS)
- Toda tabela criada ou alterada em `supabase/migrations/*.sql` DEVE conter explicitamente:
  ```sql
  ALTER TABLE public.<tabela> ENABLE ROW LEVEL SECURITY;
  ```
- **Proibido** criar politicas permissivas abertas como `USING (true)` ou `WITH CHECK (true)` para as roles `anon` ou `authenticated` sem restricao vinculada ao titular autenticado (`auth.uid() = user_id`) ou checagem server-side equivalente (`public.is_master() is true`).
- Revogar privilegios amplos da role `anon` (`REVOKE ALL ON ... FROM anon;`) em tabelas e RPCs administrativas ou que exponham PII/dados financeiros.

### 3. Protecao Contra XSS (DOM Seguro)
- **Proibido** usar `innerHTML`, `outerHTML` ou `insertAdjacentHTML` com dados vindos do Supabase, URL/querystring ou inputs do usuario sem sanitizacao estrita via helper dedicado (`escapeHTML`).
- Sempre preferir `textContent`, `.value` ou construcao programatica de nos (`document.createElement` + `appendChild`) e anexar eventos com `addEventListener` em vez de atributos inline (`onclick="..."`, `oninput="..."`) contendo valores dinamicos.

---

## Checklist de Verificacao (Fases 4 e 8)
- [ ] Nenhum segredo, token privado ou `service_role` novo presente em `script/*.js` ou `*.html`.
- [ ] Toda migration SQL nova/alterada habilita RLS e nao usa `USING (true)` / `WITH CHECK (true)` aberto para `anon`/`authenticated`.
- [ ] Nenhuma interpolacao dinamica nao escapada em `innerHTML` nem handlers inline com dados do usuario/banco.
- [ ] Execucao de `node tests/tributario_engine.test.js` aprovada com zero falhas (incluindo `vm.Script` e Secret Scanner).

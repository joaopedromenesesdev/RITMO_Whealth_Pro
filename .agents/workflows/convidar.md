---
description: Workflow padronizado de onboarding de assessores (/convidar) para geração segura em lote de links diretos de ativação via Supabase Auth Admin API, decisão automática entre invite e recovery e validação de perfis em public.profiles via supabase_mcp.
---

# ✉️ Workflow `/convidar` — Onboarding Seguro de Assessores (Whealth Planner Pro)

Este workflow padroniza a geração em lote (1 ou N assessores) de links diretos de ativação (`action_link`) via Supabase Auth Admin API (`POST https://dogyopoylekiqsahadlc.supabase.co/auth/v1/admin/generate_link`), garantindo decisão automática entre convite novo (`invite`) e reemissão para convite expirado (`recovery`), validação do perfil `assessor` em `public.profiles` e proteção estrita da `Secret key`.

> **Regras Obrigatórias de Segurança (Bloqueantes — Zero-Leakage):**
> 1. **Nunca gravar a `Secret key` em disco:** é proibido salvar a `Secret key` em `.env`, scripts temporários, arquivos `.md`, `.js`, `.json` ou qualquer caminho do repositório.
> 2. **Nunca imprimir a `Secret key`:** jamais exibir a chave em `stdout`, `stderr`, logs de erro, `console.log` ou respostas no chat.
> 3. **Execução 100% em memória:** trafegar a chave exclusivamente via variável de ambiente efêmera da sessão (`SUPABASE_SECRET_KEY`) e removê-la imediatamente após a execução.
> 4. **Zero-Leakage no Git:** nunca commitar e-mails reais, `action_link`s ou credenciais no repositório.

---

## Pré-requisitos (Entradas da Invocação)

Antes de iniciar, confirme com o operador:

1. **Lista de assessores** (1 ou mais registros) contendo:
   - `full_name`: nome completo do assessor;
   - `email`: e-mail corporativo/pessoal que será usado no login (normalizar com `trim().toLowerCase()`).
2. **`Secret key` do projeto Supabase (`dogyopoylekiqsahadlc`)**:
   - Obtida pelo operador em **Supabase Dashboard → Project Settings → API Keys**.
   - Se a chave não estiver presente na variável de ambiente efêmera da sessão, solicitar ao operador para injetá-la apenas em memória (sem persistir em arquivo).
3. **Parâmetros fixos do projeto:**
   - **Project ID (`supabase_mcp`):** `dogyopoylekiqsahadlc`
   - **Endpoint Auth Admin:** `POST https://dogyopoylekiqsahadlc.supabase.co/auth/v1/admin/generate_link`
   - **URL de redirecionamento (`redirect_to`):** `https://joaopedromenesesdev.github.io/RITMO_Whealth_Pro/login.html`

---

## Etapa 1 — Consulta Prévia (`supabase_mcp`) e Decisão Automática (`invite` vs `recovery`)

1. **Validação de entrada:** antes de montar o SQL, normalize cada e-mail (`trim().toLowerCase()`) e valide que todos obedecem a um formato de e-mail válido (sem aspas simples ou caracteres de controle).
2. **Consulta somente leitura via `supabase_mcp` (`execute_sql`):** invoque `execute_sql` com `project_id: "dogyopoylekiqsahadlc"` substituindo os placeholders pelos e-mails normalizados do lote:

```sql
SELECT
  u.id,
  lower(u.email) AS email,
  p.full_name,
  p.role,
  u.invited_at,
  u.email_confirmed_at,
  u.last_sign_in_at,
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE lower(u.email) = ANY (ARRAY[
  'assessor1@exemplo.com',
  'assessor2@exemplo.com'
]);
```

3. **Matriz de decisão automática por assessor:**

| Estado encontrado em `auth.users` / `public.profiles` | `type` selecionado | Comportamento esperado |
| :--- | :--- | :--- |
| **Não existe** em `auth.users` | `"invite"` | Cria o usuário em `auth.users` com `raw_user_meta_data.full_name`, aciona o trigger `public.handle_new_user()` (criando perfil `role = 'assessor'`) e retorna o `action_link` de ativação. |
| **Já existe** em `auth.users`, com `email_confirmed_at IS NULL` ou `last_sign_in_at IS NULL` (convite expirado/pendente) | `"recovery"` | Evita erro de usuário já registrado e gera novo `action_link` para o assessor definir sua senha em `login.html`. |
| **Já existe** e já está **ativo** (`email_confirmed_at IS NOT NULL` e `last_sign_in_at IS NOT NULL`) | **Confirmar com operador** | Alertar que o assessor já ativou a conta; gerar `"recovery"` apenas se o operador confirmar explicitamente que deseja redefinição de senha. |

---

## Etapa 2 — Geração dos Links em Memória via Node (Lote de 1 ou N Assessores)

Execute a chamada diretamente em memória com Node.js (Node 18+, usando `fetch` nativo, sem criar arquivos no disco e sem imprimir `SUPABASE_SECRET_KEY`).

### Regras do Payload e Headers

- **URL:** `https://dogyopoylekiqsahadlc.supabase.co/auth/v1/admin/generate_link`
- **Método:** `POST`
- **Headers:**
  - `Content-Type: application/json`
  - `apikey: <SUPABASE_SECRET_KEY>`
  - `Authorization: Bearer <SUPABASE_SECRET_KEY>` **apenas** quando a chave for um JWT legado (iniciado por `eyJ`). Para a nova `Secret key` opaca (`sb_secret_...`), enviar **somente** no header `apikey` para evitar rejeição `Invalid JWT` no gateway.
- **Corpo JSON por assessor:**
  ```json
  {
    "type": "invite",
    "email": "assessor@exemplo.com",
    "redirect_to": "https://joaopedromenesesdev.github.io/RITMO_Whealth_Pro/login.html",
    "data": {
      "full_name": "Nome Completo do Assessor"
    }
  }
  ```

### Comando de Execução Segura em Memória (PowerShell + Node)

> Substitua o array `batch` em memória pelos assessores classificados na Etapa 1. A variável `$env:SUPABASE_SECRET_KEY` é lida apenas da sessão atual e removida no bloco `finally`.

```powershell
try {
  # A Secret key deve estar carregada apenas na variável de ambiente efêmera da sessão:
  # $env:SUPABASE_SECRET_KEY = Read-Host "Cole a Supabase Secret key" -MaskInput
  if (-not $env:SUPABASE_SECRET_KEY) {
    throw "SUPABASE_SECRET_KEY não definida na sessão atual."
  }

  $script = @'
const ENDPOINT = "https://dogyopoylekiqsahadlc.supabase.co/auth/v1/admin/generate_link";
const REDIRECT_TO = "https://joaopedromenesesdev.github.io/RITMO_Whealth_Pro/login.html";
const secretKey = (process.env.SUPABASE_SECRET_KEY || "").trim();

if (!secretKey) {
  console.error("ERRO: SUPABASE_SECRET_KEY ausente em memória.");
  process.exit(1);
}

const batch = [
  // { email: "assessor1@exemplo.com", full_name: "Nome Completo 1", type: "invite" },
  // { email: "assessor2@exemplo.com", full_name: "Nome Completo 2", type: "recovery" }
];

const headers = {
  "Content-Type": "application/json",
  "apikey": secretKey
};

// Compatibilidade: apenas chaves JWT legadas (eyJ...) usam Authorization Bearer
if (secretKey.startsWith("eyJ")) {
  headers["Authorization"] = `Bearer ${secretKey}`;
}

(async () => {
  const results = [];

  for (const item of batch) {
    const email = String(item.email || "").trim().toLowerCase();
    const full_name = String(item.full_name || "").trim();
    const type = item.type === "recovery" ? "recovery" : "invite";

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({
        type,
        email,
        redirect_to: REDIRECT_TO,
        data: { full_name }
      })
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      results.push({
        email,
        full_name,
        type,
        ok: false,
        status: res.status,
        error: body.msg || body.message || body.error_description || "Falha na geração do link"
      });
      continue;
    }

    results.push({
      email,
      full_name,
      type,
      ok: true,
      user_id: body.id || body.user?.id || null,
      action_link: body.action_link || body.properties?.action_link || null
    });
  }

  // Saída controlada: imprime apenas o resultado dos assessores (nunca headers ou secretKey)
  console.log(JSON.stringify(results, null, 2));
})();
'@

  $script | node
} finally {
  Remove-Item Env:SUPABASE_SECRET_KEY -ErrorAction SilentlyContinue
}
```

---

## Etapa 3 — Validação do Perfil `assessor` em `public.profiles` (`supabase_mcp`)

Imediatamente após a execução da Etapa 2, valide no banco via `supabase_mcp` (`execute_sql` com `project_id: "dogyopoylekiqsahadlc"`) que cada assessor teve o perfil criado/mantido corretamente pelo trigger `public.handle_new_user()`:

```sql
SELECT
  u.id,
  lower(u.email) AS email,
  p.full_name,
  p.role,
  u.invited_at,
  u.email_confirmed_at,
  u.last_sign_in_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE lower(u.email) = ANY (ARRAY[
  'assessor1@exemplo.com',
  'assessor2@exemplo.com'
])
ORDER BY u.created_at DESC;
```

**Critérios obrigatórios de aprovação:**

- [ ] Todos os assessores processados existem simultaneamente em `auth.users` e `public.profiles` (mesmo `id`).
- [ ] A coluna `public.profiles.role` está preenchida estritamente como **`assessor`** (nunca `NULL` nem promovida indevidamente para `master`).
- [ ] A coluna `public.profiles.full_name` reflete o nome completo informado (sem valor genérico como `'-'` ou `'Assessor'`).
- [ ] Em caso de divergência (ex.: perfil não criado ou `full_name` vazio), reportar explicitamente ao operador antes de executar qualquer correção DML.

---

## Etapa 4 — Entrega Final (Tabela Markdown de `action_link`s)

Entregue o resultado consolidado em uma tabela Markdown pronta para cópia e envio individual aos assessores:

| Assessor | E-mail | Tipo | Perfil (`public.profiles`) | Link Direto de Ativação (`action_link`) |
| :--- | :--- | :--- | :--- | :--- |
| Nome Completo 1 | `assessor1@exemplo.com` | `invite` | `assessor` (validado) | `<action_link>` |
| Nome Completo 2 | `assessor2@exemplo.com` | `recovery` | `assessor` (validado) | `<action_link>` |

### Checklist Final de Encerramento

- [ ] Confirmar que `SUPABASE_SECRET_KEY` foi removida da memória/sessão e não aparece em nenhum log ou saída.
- [ ] Confirmar que nenhum arquivo temporário foi criado no workspace (`git status` limpo).
- [ ] Orientar o operador de que cada `action_link` é de **uso único** e tem validade temporária; evitar ferramentas que façam pré-visualização automática de URL (que podem consumir o token antes do clique) e, caso expire, basta reexecutar `/convidar` (que escolherá `type: "recovery"` automaticamente).

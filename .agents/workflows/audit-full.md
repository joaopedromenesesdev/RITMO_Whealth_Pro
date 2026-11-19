---
description: Workflow padronizado de auditoria completa e somente leitura (/audit-full) combinando advisories do Supabase MCP (security e performance) e inspeção das telas ativas na porta 5501 via Chrome DevTools MCP.
---

# 🛡️ Workflow `/audit-full` — Auditoria Completa Somente Leitura (Banco + Frontend F12)

Este workflow executa uma varredura defensiva **100% somente leitura (read-only)** nas camadas de banco de dados (Supabase) e interface web (Chrome DevTools na porta `5501`), sem alterar arquivos locais nem estado de produção.

> **Restrição Estrita:** Este workflow opera exclusivamente em modo de leitura e diagnóstico. Nenhum comando `apply_migration`, `execute_sql` mutável (DDL/DML) ou edição de arquivo deve ser executado durante o `/audit-full`.

---

## Etapa 1 — Auditoria do Projeto Supabase (`dogyopoylekiqsahadlc`) via `supabase_mcp`

Utilize o servidor MCP `supabase_mcp` apontando para o `project_id` **`dogyopoylekiqsahadlc`**:

1. **Advisors de Segurança (`security`):**
   - Invocar `get_advisors` com `project_id: "dogyopoylekiqsahadlc"` e `type: "security"`.
   - Analisar alertas de RLS desabilitado, políticas excessivamente permissivas, funções `SECURITY DEFINER` sem `search_path` fixo, views expostas ou tabelas acessíveis à role `anon`.
2. **Advisors de Performance (`performance`):**
   - Invocar `get_advisors` com `project_id: "dogyopoylekiqsahadlc"` e `type: "performance"`.
   - Analisar índices ausentes em chaves estrangeiras, políticas RLS com reavaliação por linha (`auth.uid()` sem `(select auth.uid())`) ou índices duplicados/não utilizados.

---

## Etapa 2 — Inspeção das Telas Ativas na Porta `5501` via `chrome-devtools` MCP

Utilize o servidor MCP `chrome-devtools` para inspecionar a aplicação servida localmente em `http://127.0.0.1:5501` (ou `http://localhost:5501`):

1. **Descoberta e Navegação das Páginas Ativas:**
   - Invocar `list_pages` para listar as abas abertas na porta `5501` (como `login.html`, `index.html`, `patrimonio.html`, `familiar.html`, `evolucao.html`, `tributario.html`, `nova_simulacao.html`, `termos_privacidade.html`).
   - Selecionar (`select_page`) ou navegar (`navigate_page`) pelas telas ativas na porta `5501`.
2. **Auditoria de Console (`console.error`):**
   - Invocar `list_console_messages` (e `get_console_message` quando houver ocorrências).
   - Reportar qualquer `console.error`, exceção JavaScript não tratada ou violação de Content Security Policy (CSP) / Subresource Integrity (SRI).
3. **Auditoria de Rede (`400`, `401`, `403`, `500`):**
   - Invocar `list_network_requests` (e `get_network_request` para detalhes).
   - Filtrar e reportar imediatamente qualquer requisição HTTP que retorne status **`400`**, **`401`**, **`403`** ou **`500`** (ou falhas de CORS/rede).

---

## Etapa 3 — Relatório Consolidado de Auditoria

Ao concluir as Etapas 1 e 2, apresente um relatório estruturado contendo:

1. **Resumo Supabase (`dogyopoylekiqsahadlc`):** listagem classificada por severidade (`ERROR`, `WARN`, `INFO`) para `security` e `performance`.
2. **Resumo Browser F12 (Porta `5501`):** tabela por tela auditada indicando contagem de `console.error` e respostas HTTP `400`/`401`/`403`/`500`.
3. **Plano de Ação Recomendado:** sugestões cirúrgicas de correção (sem aplicá-las automaticamente sem aprovação do usuário).

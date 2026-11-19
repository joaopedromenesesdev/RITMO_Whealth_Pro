---
description: Workflow padronizado de liberação segura (/release) com validação da suíte de 428 testes, auditoria de escopo Git, commit atômico com pre-commit hook e sincronização controlada com origin/main.
---

# 🚀 Workflow `/release` — Liberação Segura (Whealth Planner Pro)

Este workflow padroniza as Fases 7 a 9 do **Protocolo Brownfield** para garantir que nenhuma alteração seja commitada ou publicada na `main` sem passar pelos portões determinísticos de regressão e segurança.

---

## Passo 1 — Gate de Regressão e Segurança (`428/428`)

Execute a suíte completa de testes unitários, validação sintática (`vm.Script`) e **Secret Scanner** client-side:

```powershell
node tests/tributario_engine.test.js
```

**Critério de bloqueio (Exit Gate):**
- O resumo final deve exibir `Total: 428 | Passados: 428 | Falhas: 0` (ou total superior caso novos testes tenham sido adicionados, sempre com `Falhas: 0`).
- O Teste 42 (`vm.Script`) e o Teste 43 (`Secret Scanner`) devem exibir `[PASS]`.
- Se houver qualquer falha (`exitCode != 0`), **interrompa o release imediatamente** e retorne à Fase 6.

---

## Passo 2 — Auditoria de Escopo Git

Verifique o estado da árvore de trabalho e o resumo das alterações antes de preparar o stage:

```powershell
git status
git diff --stat
```

**Verificações obrigatórias:**
- Confirmar que apenas os arquivos estritamente pertencentes ao escopo da tarefa foram modificados ou criados.
- Garantir ausência de arquivos temporários, dumps, `.env` ou artefatos de debug não rastreados.

---

## Passo 3 — Commit Atômico (Validado pelo Hook `.git/hooks/pre-commit`)

Adicione exclusivamente os arquivos auditados do escopo e realize o commit atômico seguindo o padrão Conventional Commits:

```powershell
git add <arquivos-do-escopo>
git commit -m "<tipo>(<escopo>): <descrição concisa>"
```

- O hook `.git/hooks/pre-commit` executará automaticamente `node tests/tributario_engine.test.js` antes de selar o commit.
- É **estritamente proibido** utilizar `--no-verify` para contornar o hook de pre-commit.

---

## Passo 4 — Sincronização com `origin/main` (Somente Após Autorização Explícita)

> **ATENÇÃO:** Nunca execute `git push` ou merge em `main` sem autorização explícita do usuário na conversa atual.

Após receber confirmação explícita do usuário para publicar na `main`:

```powershell
git fetch origin
git status -sb
git push origin main
```

Confirme ao final o hash do commit publicado e a paridade entre `main` e `origin/main`.

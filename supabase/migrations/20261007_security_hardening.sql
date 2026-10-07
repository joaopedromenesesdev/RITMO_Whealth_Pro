-- =============================================================================
-- MIGRAÇÃO DE HARDENING DE SEGURANÇA (2026-10-07)
-- Whealth Planner Pro (Pace Capital)
-- Executável de forma idempotente no Supabase SQL Editor
-- =============================================================================

-- 1. SEC-11: Desativar auto-promoção de role 'master' por e-mail no trigger handle_new_user
-- Perfis novos são criados exclusivamente com role 'assessor'.
-- Masters são promovidos exclusivamente por administradores via SQL ou console.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_role text := 'assessor';
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'Assessor'),
    v_role
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer set search_path = public;


-- 2. SEC-05: Minimizar dados retornados na validação pública de convites
-- Remove vazamento de PII (created_by, email_restrito, used_by) para o perfil anon
create or replace function public.validar_convite(p_token text)
returns jsonb as $$
declare
  v_invite public.invites%rowtype;
begin
  if p_token is null or trim(p_token) = '' then
    return jsonb_build_object('valid', false, 'message', 'Nenhum código de convite fornecido.');
  end if;

  select * into v_invite from public.invites where id = trim(p_token) limit 1;
  if not found then
    return jsonb_build_object('valid', false, 'message', 'Link de convite inválido ou não encontrado.');
  end if;

  if v_invite.used then
    return jsonb_build_object('valid', false, 'message', 'Este link de convite já foi utilizado por outro usuário.');
  end if;

  -- Checagem de expiração temporal (TTL de 7 dias)
  if now() > coalesce(v_invite.expires_at, v_invite.created_at + interval '7 days') then
    return jsonb_build_object('valid', false, 'message', 'Este link de convite expirou (validade máxima de 7 dias).');
  end if;

  -- Retorno seguro mínimo: apenas status de validade e data de expiração
  return jsonb_build_object(
    'valid', true,
    'invite', jsonb_build_object(
      'expires_at', coalesce(v_invite.expires_at, v_invite.created_at + interval '7 days')
    )
  );
end;
$$ language plpgsql security definer set search_path = public;


-- 3. SEC-06: Validação de email_restrito no consumo de convites
create or replace function public.consumir_convite(p_token text, p_email text)
returns jsonb as $$
declare
  v_count int;
begin
  update public.invites
  set used = true,
      used_at = now(),
      used_by = trim(p_email)
  where id = trim(p_token) 
    and used = false
    and (email_restrito is null or lower(trim(email_restrito)) = lower(trim(p_email)))
    and now() <= coalesce(expires_at, created_at + interval '7 days');

  get diagnostics v_count = row_count;
  if v_count > 0 then
    return jsonb_build_object('success', true);
  else
    return jsonb_build_object('success', false, 'message', 'Convite inválido, expirado, já utilizado ou não destinado a este e-mail.');
  end if;
end;
$$ language plpgsql security definer set search_path = public;


-- 4. SEC-12: Endurecimento de auditoria (audit_logs)
-- Impede inserção com user_id nulo por clientes autenticados
drop policy if exists "Usuários podem registrar eventos de auditoria" on public.audit_logs;
create policy "Usuários podem registrar eventos de auditoria"
  on public.audit_logs for insert
  with check (auth.uid() = user_id);


-- 5. SEC-13: Restrição defensiva de tamanho máximo para prints de suporte (máx 3.5 MB)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chk_suporte_print_tamanho'
  ) then
    alter table public.suporte_chamados
      add constraint chk_suporte_print_tamanho
      check (print_imagem is null or length(print_imagem) <= 3500000) not valid;
  end if;
end $$;


-- 6. Higiene de permissões: revoga execução anônima em RPC de expurgo de dados LGPD
revoke execute on function public.solicitar_exclusao_meus_dados() from anon;

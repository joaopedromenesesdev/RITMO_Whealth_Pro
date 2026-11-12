-- =============================================================================
-- HARDENING DE BANCO SEM REGRESSAO FUNCIONAL (AUDIT LOGS, CONSTRAINTS, TRIGGERS)
-- =============================================================================
-- Execute este script no Supabase Dashboard -> SQL Editor.
-- Objetivo:
-- 1. Criar public.audit_logs (append-only) e trigger server-side em relatorios.
-- 2. Garantir funcionamento transacional integro de solicitar_exclusao_meus_dados().
-- 3. Aplicar limites defensivos (CHECK constraints) em public.relatorios.
-- 4. Blindar public.suporte_chamados contra spoofing de e-mail e flood no banco.
-- 5. Higienizar role 'admin' ociosa em public.profiles caso nao haja usuarios nela.
-- =============================================================================

-- 1. TABELA public.audit_logs (APPEND-ONLY)
create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  relatorio_id text,
  acao text not null check (char_length(acao) between 1 and 80),
  detalhes jsonb default '{}'::jsonb check (detalhes is null or pg_column_size(detalhes) <= 65536),
  created_at timestamptz default now()
);

create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);
create index if not exists idx_audit_logs_relatorio_id on public.audit_logs(relatorio_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);

alter table public.audit_logs enable row level security;

revoke all on public.audit_logs from public, anon;
grant select, insert on public.audit_logs to authenticated;

drop policy if exists "Usuários podem ver seus próprios logs ou master ver todos" on public.audit_logs;
create policy "Usuários podem ver seus próprios logs ou master ver todos"
  on public.audit_logs for select
  using (auth.uid() = user_id or public.is_master() is true);

drop policy if exists "Usuários podem registrar eventos de auditoria" on public.audit_logs;
create policy "Usuários podem registrar eventos de auditoria"
  on public.audit_logs for insert
  with check (auth.uid() = user_id);

-- Garante imutabilidade: nenhuma policy de UPDATE ou DELETE para clientes autenticados
drop policy if exists "Ninguem atualiza audit_logs" on public.audit_logs;
drop policy if exists "Ninguem remove audit_logs" on public.audit_logs;


-- 2. TRIGGER DE AUDITORIA AUTOMATICA EM public.relatorios
create or replace function public.fn_relatorios_audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_relatorio_id text;
  v_acao text;
  v_user_existe boolean := false;
begin
  v_actor := coalesce(
    auth.uid(),
    case when tg_op = 'DELETE' then old.user_id else new.user_id end
  );
  v_relatorio_id := case when tg_op = 'DELETE' then old.id::text else new.id::text end;
  v_acao := case
    when tg_op = 'INSERT' then 'CRIAR'
    when tg_op = 'UPDATE' then 'ATUALIZAR'
    when tg_op = 'DELETE' then 'EXCLUIR'
    else tg_op
  end;

  if v_actor is not null then
    select exists(select 1 from auth.users where id = v_actor) into v_user_existe;
  end if;

  insert into public.audit_logs (user_id, relatorio_id, acao, detalhes)
  values (
    case when v_user_existe then v_actor else null end,
    v_relatorio_id,
    v_acao,
    jsonb_build_object(
      'origem', 'db_trigger',
      'operacao', tg_op,
      'owner_id', case when tg_op = 'DELETE' then old.user_id else new.user_id end
    )
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists trg_relatorios_audit_log on public.relatorios;
create trigger trg_relatorios_audit_log
  after insert or update or delete on public.relatorios
  for each row execute function public.fn_relatorios_audit_trigger();


-- 3. FUNCAO LGPD public.solicitar_exclusao_meus_dados() (TRANSACIONAL COM audit_logs)
create or replace function public.solicitar_exclusao_meus_dados()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_relatorios_removidos integer := 0;
begin
  if v_user_id is null then
    return json_build_object('success', false, 'message', 'Usuário não autenticado.');
  end if;

  delete from public.relatorios where user_id = v_user_id;
  get diagnostics v_relatorios_removidos = row_count;

  insert into public.audit_logs (user_id, acao, detalhes)
  values (
    v_user_id,
    'EXCLUSAO_CONTA_LGPD',
    jsonb_build_object('relatorios_expurgados', v_relatorios_removidos, 'data', now())
  );

  return json_build_object(
    'success', true,
    'message', 'Dados expurgados com sucesso em conformidade com a LGPD.',
    'relatorios_removidos', v_relatorios_removidos
  );
end;
$$;

revoke all on function public.solicitar_exclusao_meus_dados() from public, anon;
grant execute on function public.solicitar_exclusao_meus_dados() to authenticated;


-- 4. CONSTRAINTS DE INTEGRIDADE E TAMANHO EM public.relatorios
do $$
begin
  if to_regclass('public.relatorios') is not null then
    if not exists (select 1 from pg_constraint where conname = 'chk_relatorios_nome_cliente_len') then
      alter table public.relatorios
        add constraint chk_relatorios_nome_cliente_len
        check (char_length(nome_cliente) <= 200) not valid;
    end if;

    if not exists (select 1 from pg_constraint where conname = 'chk_relatorios_nome_assessor_len') then
      alter table public.relatorios
        add constraint chk_relatorios_nome_assessor_len
        check (nome_assessor is null or char_length(nome_assessor) <= 200) not valid;
    end if;

    if not exists (select 1 from pg_constraint where conname = 'chk_relatorios_dados_completos_obj') then
      alter table public.relatorios
        add constraint chk_relatorios_dados_completos_obj
        check (dados_completos is null or jsonb_typeof(dados_completos) = 'object') not valid;
    end if;

    if not exists (select 1 from pg_constraint where conname = 'chk_relatorios_dados_completos_size') then
      alter table public.relatorios
        add constraint chk_relatorios_dados_completos_size
        check (dados_completos is null or pg_column_size(dados_completos) <= 524288) not valid;
    end if;

    begin
      alter table public.relatorios validate constraint chk_relatorios_nome_cliente_len;
      alter table public.relatorios validate constraint chk_relatorios_nome_assessor_len;
      alter table public.relatorios validate constraint chk_relatorios_dados_completos_obj;
      alter table public.relatorios validate constraint chk_relatorios_dados_completos_size;
    exception when others then
      raise notice 'Constraints de relatorios ativas para novos registros; algum registro legado nao validado: %', sqlerrm;
    end;
  end if;
end $$;


-- 5. BLINDAGEM DE public.suporte_chamados (ANTI-SPOOFING E RATE LIMIT NO BANCO)
create or replace function public.fn_suporte_chamados_blindagem()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_jwt_email text;
  v_recentes integer := 0;
begin
  if current_setting('role', true) = 'service_role' then
    return new;
  end if;

  if v_uid is null then
    raise exception 'Usuário não autenticado para registrar chamado.' using errcode = '42501';
  end if;

  -- Ancora user_id e email diretamente no token JWT autenticado
  new.user_id := v_uid;
  v_jwt_email := nullif(trim(coalesce(auth.jwt()->>'email', '')), '');
  if v_jwt_email is not null then
    new.assessor_email := v_jwt_email;
  end if;

  -- Impede forjar status fechado/administrativo na criacao
  new.status := 'aberto';

  -- Rate limit atomico no servidor: maximo 5 chamados a cada 10 minutos
  select count(*) into v_recentes
  from public.suporte_chamados
  where user_id = v_uid
    and created_at >= (now() - interval '10 minutes');

  if v_recentes >= 5 then
    raise exception 'Limite de solicitações de suporte atingido. Aguarde alguns minutos.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

do $$
begin
  if to_regclass('public.suporte_chamados') is not null then
    drop trigger if exists trg_suporte_chamados_blindagem on public.suporte_chamados;
    create trigger trg_suporte_chamados_blindagem
      before insert on public.suporte_chamados
      for each row execute function public.fn_suporte_chamados_blindagem();

    if not exists (select 1 from pg_constraint where conname = 'chk_suporte_assunto_len') then
      alter table public.suporte_chamados
        add constraint chk_suporte_assunto_len
        check (assunto is null or char_length(assunto) <= 250) not valid;
    end if;

    if not exists (select 1 from pg_constraint where conname = 'chk_suporte_mensagem_len') then
      alter table public.suporte_chamados
        add constraint chk_suporte_mensagem_len
        check (mensagem is null or char_length(mensagem) <= 5000) not valid;
    end if;

    begin
      alter table public.suporte_chamados validate constraint chk_suporte_assunto_len;
      alter table public.suporte_chamados validate constraint chk_suporte_mensagem_len;
      if exists (select 1 from pg_constraint where conname = 'chk_suporte_print_tamanho') then
        alter table public.suporte_chamados validate constraint chk_suporte_print_tamanho;
      end if;
    exception when others then
      raise notice 'Constraints de suporte_chamados ativas para novos registros: %', sqlerrm;
    end;
  end if;
end $$;


-- 6. HIGIENE DE ROLE OCIOSA 'admin' EM public.profiles (SOMENTE SE ZERO USUARIOS)
do $$
declare
  v_admin_count integer := 0;
begin
  if to_regclass('public.profiles') is not null then
    select count(*) into v_admin_count from public.profiles where role = 'admin';
    if v_admin_count = 0 then
      alter table public.profiles drop constraint if exists profiles_role_check;
      alter table public.profiles add constraint profiles_role_check check (role in ('master', 'assessor'));
    end if;
  end if;
end $$;

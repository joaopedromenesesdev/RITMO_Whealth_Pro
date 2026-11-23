-- =============================================================================
-- MIGRACAO: SISTEMA DE CONTABILIZACAO E GESTAO DE VENDAS (USABILIDADE + DASHBOARD)
-- Projeto Supabase: dogyopoylekiqsahadlc (Whealth Planner Pro - Pace Capital)
-- Data: 2026-11-23
-- Idempotente: Executavel com seguranca multiplas vezes no Supabase SQL Editor
--
-- OBJETIVOS:
-- 1. Criar tabela public.vendas com modelo hibrido 1:N (vinculada a relatorio
--    ou venda avulsa sem relatorio), validacoes CHECK e indices de FK/consulta.
-- 2. Habilitar RLS rigoroso (zero acesso anon, isolamento por user_id e acesso
--    completo para usuarios Master via public.is_master()).
-- 3. Criar trigger BEFORE INSERT/UPDATE anti-spoofing e anti-IDOR
--    (impede assessor de lancar venda para outro usuario ou vincular relatorio alheio).
-- 4. Criar trigger AFTER INSERT/UPDATE/DELETE para auditoria automatica em
--    public.audit_logs (append-only).
-- 5. Atualizar public.obter_metricas_usabilidade_master() com metricas de vendas
--    por assessor e atualizar public.solicitar_exclusao_meus_dados() (LGPD).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TABELA public.vendas (MODELO HIBRIDO 1:N)
-- -----------------------------------------------------------------------------
create table if not exists public.vendas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  relatorio_id uuid references public.relatorios(id) on delete set null,
  nome_cliente text not null,
  nome_assessor text,
  produto text not null,
  valor_venda numeric(18,2) not null default 0,
  data_venda date not null default current_date,
  observacao text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Constraints defensivas de integridade e tamanho (idempotentes)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'chk_vendas_nome_cliente_len') then
    alter table public.vendas
      add constraint chk_vendas_nome_cliente_len
      check (char_length(trim(nome_cliente)) between 1 and 200);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_vendas_nome_assessor_len') then
    alter table public.vendas
      add constraint chk_vendas_nome_assessor_len
      check (nome_assessor is null or char_length(nome_assessor) <= 200);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_vendas_produto_len') then
    alter table public.vendas
      add constraint chk_vendas_produto_len
      check (char_length(trim(produto)) between 1 and 120);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_vendas_valor_nao_negativo') then
    alter table public.vendas
      add constraint chk_vendas_valor_nao_negativo
      check (valor_venda >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_vendas_observacao_len') then
    alter table public.vendas
      add constraint chk_vendas_observacao_len
      check (observacao is null or char_length(observacao) <= 1000);
  end if;
end $$;

-- Indices para chaves estrangeiras e ordenacao/filtros frequentes
create index if not exists idx_vendas_user_id
  on public.vendas (user_id);

create index if not exists idx_vendas_relatorio_id
  on public.vendas (relatorio_id)
  where relatorio_id is not null;

create index if not exists idx_vendas_data_venda
  on public.vendas (data_venda desc, created_at desc);

create index if not exists idx_vendas_created_by
  on public.vendas (created_by)
  where created_by is not null;

-- -----------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS) E PRINCIPIO DO MENOR PRIVILEGIO
-- -----------------------------------------------------------------------------
alter table public.vendas enable row level security;

revoke all on table public.vendas from public, anon;
grant select, insert, update, delete on table public.vendas to authenticated;
revoke truncate, trigger, references, maintain on table public.vendas from authenticated;

drop policy if exists "Usuarios podem ver suas proprias vendas ou master ve todas" on public.vendas;
create policy "Usuarios podem ver suas proprias vendas ou master ve todas"
  on public.vendas
  for select
  to authenticated
  using ((select auth.uid()) = user_id or public.is_master() is true);

drop policy if exists "Usuarios podem criar vendas proprias ou master cria para equipe" on public.vendas;
create policy "Usuarios podem criar vendas proprias ou master cria para equipe"
  on public.vendas
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id or public.is_master() is true);

drop policy if exists "Usuarios podem atualizar suas proprias vendas ou master atualiza todas" on public.vendas;
create policy "Usuarios podem atualizar suas proprias vendas ou master atualiza todas"
  on public.vendas
  for update
  to authenticated
  using ((select auth.uid()) = user_id or public.is_master() is true)
  with check ((select auth.uid()) = user_id or public.is_master() is true);

drop policy if exists "Usuarios podem excluir suas proprias vendas ou master exclui todas" on public.vendas;
create policy "Usuarios podem excluir suas proprias vendas ou master exclui todas"
  on public.vendas
  for delete
  to authenticated
  using ((select auth.uid()) = user_id or public.is_master() is true);

-- -----------------------------------------------------------------------------
-- 3. TRIGGER BEFORE INSERT/UPDATE: BLINDAGEM ANTI-SPOOFING E ANTI-IDOR
-- -----------------------------------------------------------------------------
create or replace function public.fn_vendas_blindagem()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_master boolean := false;
  v_rel_owner uuid;
begin
  if current_setting('role', true) = 'service_role' then
    new.updated_at := now();
    return new;
  end if;

  if v_uid is null then
    raise exception 'Usuario nao autenticado para registrar ou alterar vendas.'
      using errcode = '42501';
  end if;

  v_is_master := public.is_master() is true;

  -- Assessor comum nao pode forjar nem transferir user_id de outro usuario
  if not v_is_master then
    new.user_id := v_uid;
  elsif new.user_id is null then
    new.user_id := v_uid;
  end if;

  -- Normalizacao defensiva dos campos textuais
  new.nome_cliente := trim(coalesce(new.nome_cliente, ''));
  new.produto := trim(coalesce(new.produto, ''));
  if new.nome_assessor is not null then
    new.nome_assessor := nullif(trim(new.nome_assessor), '');
  end if;
  if new.observacao is not null then
    new.observacao := nullif(trim(new.observacao), '');
  end if;
  new.valor_venda := coalesce(new.valor_venda, 0);
  new.data_venda := coalesce(new.data_venda, current_date);

  -- Validacao anti-IDOR: se vinculada a relatorio, verifica existencia e ownership
  if new.relatorio_id is not null then
    select r.user_id
      into v_rel_owner
    from public.relatorios r
    where r.id = new.relatorio_id;

    if not found then
      raise exception 'Relatorio vinculado nao encontrado.'
        using errcode = '23503';
    end if;

    if not v_is_master and v_rel_owner is distinct from v_uid then
      raise exception 'Acesso negado: nao e permitido vincular venda a relatorio de outro assessor.'
        using errcode = '42501';
    end if;
  end if;

  if tg_op = 'INSERT' then
    new.created_by := v_uid;
    new.created_at := coalesce(new.created_at, now());
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_vendas_blindagem on public.vendas;
create trigger trg_vendas_blindagem
  before insert or update on public.vendas
  for each row execute function public.fn_vendas_blindagem();

revoke execute on function public.fn_vendas_blindagem() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. TRIGGER AFTER INSERT/UPDATE/DELETE: AUDITORIA AUTOMATICA EM audit_logs
-- -----------------------------------------------------------------------------
create or replace function public.fn_vendas_audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_owner uuid;
  v_venda_id text;
  v_relatorio_id text;
  v_acao text;
  v_produto text;
  v_valor numeric(18,2);
  v_user_existe boolean := false;
begin
  if to_regclass('public.audit_logs') is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  v_owner := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
  v_actor := coalesce(auth.uid(), v_owner);
  v_venda_id := case when tg_op = 'DELETE' then old.id::text else new.id::text end;
  v_relatorio_id := case
    when tg_op = 'DELETE' then coalesce(old.relatorio_id::text, old.id::text)
    else coalesce(new.relatorio_id::text, new.id::text)
  end;
  v_produto := case when tg_op = 'DELETE' then old.produto else new.produto end;
  v_valor := case when tg_op = 'DELETE' then old.valor_venda else new.valor_venda end;
  v_acao := case
    when tg_op = 'INSERT' then 'CRIAR_VENDA'
    when tg_op = 'UPDATE' then 'ATUALIZAR_VENDA'
    when tg_op = 'DELETE' then 'EXCLUIR_VENDA'
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
      'venda_id', v_venda_id,
      'owner_id', v_owner,
      'produto', v_produto,
      'valor_venda', v_valor
    )
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists trg_vendas_audit_log on public.vendas;
create trigger trg_vendas_audit_log
  after insert or update or delete on public.vendas
  for each row execute function public.fn_vendas_audit_trigger();

revoke execute on function public.fn_vendas_audit_trigger() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. ATUALIZAR RPC obter_metricas_usabilidade_master() COM METRICAS DE VENDAS
-- -----------------------------------------------------------------------------
create or replace function public.obter_metricas_usabilidade_master()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res jsonb;
begin
  if auth.uid() is null or public.is_master() is not true then
    raise exception 'Acesso negado: apenas usuarios Master autenticados podem consultar metricas de usabilidade.';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'id', coalesce(p.id, u.id),
      'email', coalesce(p.email, u.email),
      'full_name', coalesce(
        nullif(nullif(nullif(trim(p.full_name), ''), '-'), 'Assessor'),
        nullif(nullif(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), '-'), 'Assessor'),
        initcap(replace(split_part(coalesce(p.email, u.email, ''), '@', 1), '.', ' ')),
        'Assessor'
      ),
      'role', case
        when coalesce(p.id, u.id) in (
          '130e3598-89b9-4702-a4cc-2c5923fa3a66'::uuid,
          '5ec2da93-ed07-43f8-9089-6d285a092156'::uuid,
          '469dfeab-5fd6-4159-97a2-aa1fee6e7dcb'::uuid
        ) then 'master'
        else coalesce(p.role, 'assessor')
      end,
      'created_at', coalesce(p.created_at, u.created_at),
      'ultimo_acesso', coalesce(p.ultimo_acesso, u.last_sign_in_at, p.updated_at),
      'last_sign_in_at', u.last_sign_in_at,
      'email_confirmed_at', u.email_confirmed_at,
      'total_relatorios', coalesce(r_stats.total_relatorios, 0),
      'total_patrimonio', coalesce(r_stats.total_patrimonio, 0),
      'ultimo_relatorio_em', r_stats.ultimo_relatorio_em,
      'total_vendas', coalesce(v_stats.total_vendas, 0),
      'valor_total_vendas', coalesce(v_stats.valor_total_vendas, 0),
      'ultima_venda_em', v_stats.ultima_venda_em
    )
    order by coalesce(p.ultimo_acesso, u.last_sign_in_at, p.created_at, u.created_at) desc nulls last
  ) into v_res
  from auth.users u
  full outer join public.profiles p on p.id = u.id
  left join lateral (
    select
      count(r.id) as total_relatorios,
      coalesce(sum(r.total_patrimonio), 0) as total_patrimonio,
      max(r.data_criacao) as ultimo_relatorio_em
    from public.relatorios r
    where r.user_id = coalesce(p.id, u.id)
  ) r_stats on true
  left join lateral (
    select
      count(v.id) as total_vendas,
      coalesce(sum(v.valor_venda), 0) as valor_total_vendas,
      max(v.created_at) as ultima_venda_em
    from public.vendas v
    where v.user_id = coalesce(p.id, u.id)
  ) v_stats on true;

  return coalesce(v_res, '[]'::jsonb);
end;
$$;

revoke all on function public.obter_metricas_usabilidade_master() from public, anon;
grant execute on function public.obter_metricas_usabilidade_master() to authenticated;

-- -----------------------------------------------------------------------------
-- 6. ATUALIZAR FUNCAO LGPD solicitar_exclusao_meus_dados() (INCLUI public.vendas)
-- -----------------------------------------------------------------------------
create or replace function public.solicitar_exclusao_meus_dados()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_relatorios_removidos integer := 0;
  v_vendas_removidas integer := 0;
begin
  if v_user_id is null then
    return json_build_object('success', false, 'message', 'Usuario nao autenticado.');
  end if;

  delete from public.vendas where user_id = v_user_id;
  get diagnostics v_vendas_removidas = row_count;

  delete from public.relatorios where user_id = v_user_id;
  get diagnostics v_relatorios_removidos = row_count;

  if to_regclass('public.audit_logs') is not null then
    insert into public.audit_logs (user_id, acao, detalhes)
    values (
      v_user_id,
      'EXCLUSAO_CONTA_LGPD',
      jsonb_build_object(
        'relatorios_expurgados', v_relatorios_removidos,
        'vendas_expurgadas', v_vendas_removidas,
        'data', now()
      )
    );
  end if;

  return json_build_object(
    'success', true,
    'message', 'Dados expurgados com sucesso em conformidade com a LGPD.',
    'relatorios_removidos', v_relatorios_removidos,
    'vendas_removidas', v_vendas_removidas
  );
end;
$$;

revoke all on function public.solicitar_exclusao_meus_dados() from public, anon;
grant execute on function public.solicitar_exclusao_meus_dados() to authenticated;

-- -----------------------------------------------------------------------------
-- 7. RECARREGAR SCHEMA CACHE DO POSTGREST IMEDIATAMENTE
-- -----------------------------------------------------------------------------
notify pgrst, 'reload schema';

-- =============================================================================
-- MIGRACAO: COMISSIONAMENTO DE VENDAS (MAG 57% / POB 70%) E SEGURO DE VIDA
-- Projeto Supabase: dogyopoylekiqsahadlc (Whealth Planner Pro - Pace Capital)
-- Data: 2026-11-25
-- Idempotente: Executavel com seguranca multiplas vezes no Supabase SQL Editor
--
-- OBJETIVOS:
-- 1. Adicionar colunas opcionais de comissionamento (MAG/POB), percentual e
--    valor calculado da comissao na tabela public.vendas.
-- 2. Garantir integridade via CHECK constraints (MAG=57%, POB=70% ou NULL).
-- 3. Derivar percentual_comissao e valor_comissao no trigger server-side
--    fn_vendas_blindagem() para impedir adulteracao via cliente/REST.
-- 4. Atualizar auditoria em fn_vendas_audit_trigger() e metricas na RPC
--    obter_metricas_usabilidade_master().
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. NOVAS COLUNAS E CONSTRAINTS EM public.vendas (IDEMPOTENTE)
-- -----------------------------------------------------------------------------
alter table public.vendas
  add column if not exists comissionamento text,
  add column if not exists percentual_comissao numeric(5,2),
  add column if not exists valor_comissao numeric(18,2) not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'chk_vendas_comissionamento_valido') then
    alter table public.vendas
      add constraint chk_vendas_comissionamento_valido
      check (comissionamento is null or comissionamento in ('MAG', 'POB'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_vendas_percentual_comissao_valido') then
    alter table public.vendas
      add constraint chk_vendas_percentual_comissao_valido
      check (percentual_comissao is null or percentual_comissao in (57.00, 70.00));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_vendas_valor_comissao_nao_negativo') then
    alter table public.vendas
      add constraint chk_vendas_valor_comissao_nao_negativo
      check (valor_comissao >= 0);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2. ATUALIZAR TRIGGER BEFORE INSERT/UPDATE: DERIVACAO SERVER-SIDE DA COMISSAO
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
  v_comiss text;
begin
  if current_setting('role', true) = 'service_role' then
    new.valor_venda := greatest(0, coalesce(new.valor_venda, 0));
    v_comiss := nullif(upper(trim(coalesce(new.comissionamento, ''))), '');
    new.comissionamento := v_comiss;
    if v_comiss = 'MAG' then
      new.percentual_comissao := 57.00;
      new.valor_comissao := round((new.valor_venda * 57.00) / 100.0, 2);
    elsif v_comiss = 'POB' then
      new.percentual_comissao := 70.00;
      new.valor_comissao := round((new.valor_venda * 70.00) / 100.0, 2);
    else
      new.percentual_comissao := null;
      new.valor_comissao := 0;
    end if;
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

  -- Normalizacao defensiva dos campos textuais e numericos
  new.nome_cliente := trim(coalesce(new.nome_cliente, ''));
  new.produto := trim(coalesce(new.produto, ''));
  if new.nome_assessor is not null then
    new.nome_assessor := nullif(trim(new.nome_assessor), '');
  end if;
  if new.observacao is not null then
    new.observacao := nullif(trim(new.observacao), '');
  end if;
  new.valor_venda := greatest(0, coalesce(new.valor_venda, 0));
  new.data_venda := coalesce(new.data_venda, current_date);

  -- Normalizacao e calculo autoritativo de comissionamento (MAG=57%, POB=70% ou NULL)
  v_comiss := nullif(upper(trim(coalesce(new.comissionamento, ''))), '');
  if v_comiss is not null and v_comiss not in ('MAG', 'POB') then
    raise exception 'Comissionamento invalido. Opcoes permitidas: MAG ou POB.'
      using errcode = '22023';
  end if;

  new.comissionamento := v_comiss;
  if v_comiss = 'MAG' then
    new.percentual_comissao := 57.00;
    new.valor_comissao := round((new.valor_venda * 57.00) / 100.0, 2);
  elsif v_comiss = 'POB' then
    new.percentual_comissao := 70.00;
    new.valor_comissao := round((new.valor_venda * 70.00) / 100.0, 2);
  else
    new.percentual_comissao := null;
    new.valor_comissao := 0;
  end if;

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

revoke execute on function public.fn_vendas_blindagem() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. ATUALIZAR TRIGGER AFTER INSERT/UPDATE/DELETE: AUDITORIA COM COMISSIONAMENTO
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
  v_comissionamento text;
  v_percentual numeric(5,2);
  v_valor_comissao numeric(18,2);
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
  v_comissionamento := case when tg_op = 'DELETE' then old.comissionamento else new.comissionamento end;
  v_percentual := case when tg_op = 'DELETE' then old.percentual_comissao else new.percentual_comissao end;
  v_valor_comissao := case when tg_op = 'DELETE' then old.valor_comissao else new.valor_comissao end;
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
      'valor_venda', v_valor,
      'comissionamento', v_comissionamento,
      'percentual_comissao', v_percentual,
      'valor_comissao', v_valor_comissao
    )
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke execute on function public.fn_vendas_audit_trigger() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. ATUALIZAR RPC obter_metricas_usabilidade_master() COM TOTAL DE COMISSOES
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
      'valor_total_comissao', coalesce(v_stats.valor_total_comissao, 0),
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
      coalesce(sum(v.valor_comissao), 0) as valor_total_comissao,
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
-- 5. RECARREGAR SCHEMA CACHE DO POSTGREST IMEDIATAMENTE
-- -----------------------------------------------------------------------------
notify pgrst, 'reload schema';

-- =============================================================================
-- SCHEMAS & POLÍTICAS DE SEGURANÇA (RLS) PARA SUPABASE / POSTGRESQL
-- Whealth Planner Pro (Pace Capital) - Atualizado com Proteção RLS e RPCs
-- =============================================================================

-- FUNÇÃO DE CHECAGEM DE ROLE MASTER (SECURITY DEFINER com search_path seguro)
create or replace function public.is_master()
returns boolean as $$
begin
  return (
    auth.uid() = '130e3598-89b9-4702-a4cc-2c5923fa3a66'::uuid
    or exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'master'
    )
  );
end;
$$ language plpgsql security definer set search_path = public stable;


-- 1. TABELA DE PERFIS DE USUÁRIOS (PROFILES)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role text default 'assessor' check (role in ('master', 'assessor')),
  ultimo_acesso timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Índices para profiles
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_ultimo_acesso on public.profiles(ultimo_acesso desc);

-- Ativar RLS em profiles
alter table public.profiles enable row level security;

-- Políticas de RLS em profiles
drop policy if exists "Usuários podem ler seus próprios dados de perfil" on public.profiles;
create policy "Usuários podem ler seus próprios dados de perfil"
  on public.profiles for select
  using (auth.uid() = id or public.is_master());

drop policy if exists "Usuários podem atualizar seus próprios dados de perfil" on public.profiles;
create policy "Usuários podem atualizar seus próprios dados de perfil"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id and (
      role = (select p.role from public.profiles p where p.id = auth.uid()) or public.is_master()
    )
  );

-- Trigger para criar perfil automaticamente no cadastro (Role determinada estritamente no servidor)
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_role text := 'assessor';
begin
  -- Atribuição padrão como 'assessor'. Privilégio 'master' é atribuído exclusivamente
  -- por administradores existentes via SQL ou painel de controle (sem auto-promoção por e-mail)
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. TABELA DE CONVITES DE ACESSO (INVITES) COM EXPIRAÇÃO TEMPORAL (TTL 7 DIAS)
create table if not exists public.invites (
  id text primary key,
  email_restrito text,
  used boolean default false,
  used_at timestamptz,
  used_by text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '7 days')
);

-- Índices para invites
create index if not exists idx_invites_created_by on public.invites(created_by);
create index if not exists idx_invites_used on public.invites(used);
create index if not exists idx_invites_expires_at on public.invites(expires_at);

-- Ativar RLS em invites
alter table public.invites enable row level security;

-- Limpa políticas antigas
drop policy if exists "Permitir validação pública de convites não utilizados" on public.invites;
drop policy if exists "Apenas usuários master podem criar novos convites" on public.invites;
drop policy if exists "Permitir marcar convite como usado" on public.invites;

-- Apenas Masters podem consultar a tabela completa de convites diretamente
create policy "Masters podem ler todos os convites"
  on public.invites for select
  using (public.is_master());

-- Apenas Masters podem criar novos convites
create policy "Apenas usuários master podem criar novos convites"
  on public.invites for insert
  with check (public.is_master());

-- Apenas Masters podem atualizar convites diretamente
create policy "Apenas masters podem atualizar convites diretamente"
  on public.invites for update
  using (public.is_master());

-- Função RPC Segura para Validação Pública de Convite (Com Checagem de Expiração de 7 dias)
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

  -- Retorno seguro mínimo: apenas status de validade e data de expiração (sem vazar PII / email_restrito / created_by)
  return jsonb_build_object(
    'valid', true,
    'invite', jsonb_build_object(
      'expires_at', coalesce(v_invite.expires_at, v_invite.created_at + interval '7 days')
    )
  );
end;
$$ language plpgsql security definer set search_path = public;

-- Função RPC Segura para Consumir Convite no Cadastro (Rejeita Convites Expirados e Valida Destinatário)
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


-- 3. TABELA DE RELATÓRIOS E SIMULAÇÕES (RELATORIOS)
create table if not exists public.relatorios (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  nome_cliente text not null,
  nome_assessor text,
  total_patrimonio numeric(18,2) default 0 check (total_patrimonio >= 0),
  prejuizo_tributario numeric(18,2) default 0 check (prejuizo_tributario >= 0),
  dados_completos jsonb default '{}'::jsonb,
  data_criacao timestamptz default now(),
  updated_at timestamptz default now()
);

-- Índices para buscas rápidas
create index if not exists idx_relatorios_user_id on public.relatorios(user_id);
create index if not exists idx_relatorios_data_criacao on public.relatorios(data_criacao desc);
create index if not exists idx_relatorios_nome_cliente on public.relatorios using gin (to_tsvector('portuguese', nome_cliente));

-- Ativar RLS em relatorios
alter table public.relatorios enable row level security;

-- Políticas de RLS em relatorios
drop policy if exists "Usuários podem ver apenas seus próprios relatórios" on public.relatorios;
create policy "Usuários podem ver apenas seus próprios relatórios"
  on public.relatorios for select
  using (auth.uid() = user_id or public.is_master());

drop policy if exists "Usuários podem criar relatórios para si mesmos" on public.relatorios;
create policy "Usuários podem criar relatórios para si mesmos"
  on public.relatorios for insert
  with check (auth.uid() = user_id);

drop policy if exists "Usuários podem atualizar seus próprios relatórios" on public.relatorios;
create policy "Usuários podem atualizar seus próprios relatórios"
  on public.relatorios for update
  using (auth.uid() = user_id or public.is_master())
  with check (auth.uid() = user_id or public.is_master());

drop policy if exists "Usuários podem deletar seus próprios relatórios" on public.relatorios;
create policy "Usuários podem deletar seus próprios relatórios"
  on public.relatorios for delete
  using (auth.uid() = user_id or public.is_master());


-- 4. TABELA DE AUDITORIA E COMPLIANCE (AUDIT_LOGS)
create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  relatorio_id text,
  acao text not null, -- 'CRIAR', 'ATUALIZAR', 'EXCLUIR', 'EXPORTAR_PDF'
  detalhes jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Índices em audit_logs
create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);
create index if not exists idx_audit_logs_relatorio_id on public.audit_logs(relatorio_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "Usuários podem ver seus próprios logs ou master ver todos" on public.audit_logs;
create policy "Usuários podem ver seus próprios logs ou master ver todos"
  on public.audit_logs for select
  using (auth.uid() = user_id or public.is_master());

drop policy if exists "Usuários podem registrar eventos de auditoria" on public.audit_logs;
create policy "Usuários podem registrar eventos de auditoria"
  on public.audit_logs for insert
  with check (auth.uid() = user_id);


-- 5. FUNÇÃO PARA EXPURGO E EXCLUSÃO DE DADOS (LGPD Art. 18, VI)
create or replace function public.solicitar_exclusao_meus_dados()
returns json as $$
declare
  v_user_id uuid := auth.uid();
  v_relatorios_removidos integer := 0;
  v_vendas_removidas integer := 0;
begin
  if v_user_id is null then
    return json_build_object('success', false, 'message', 'Usuário não autenticado.');
  end if;

  -- Remove todas as vendas e relatórios do titular
  delete from public.vendas where user_id = v_user_id;
  get diagnostics v_vendas_removidas = row_count;

  delete from public.relatorios where user_id = v_user_id;
  get diagnostics v_relatorios_removidos = row_count;

  -- Registra evento de auditoria de conformidade
  insert into public.audit_logs (user_id, acao, detalhes)
  values (
    v_user_id,
    'EXCLUSAO_CONTA_LGPD',
    json_build_object(
      'relatorios_expurgados', v_relatorios_removidos,
      'vendas_expurgadas', v_vendas_removidas,
      'data', now()
    )
  );

  return json_build_object(
    'success', true,
    'message', 'Dados expurgados com sucesso em conformidade com a LGPD.',
    'relatorios_removidos', v_relatorios_removidos,
    'vendas_removidas', v_vendas_removidas
  );
end;
$$ language plpgsql security definer set search_path = public;

-- =============================================================================
-- 6. TABELA DE CHAMADOS DE SUPORTE (ATENDIMENTO CORPORATIVO PACE CAPITAL)
-- =============================================================================
create table if not exists public.suporte_chamados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  assessor_nome text not null,
  assessor_email text not null,
  tipo text not null,
  assunto text not null,
  mensagem text not null,
  status text default 'aberto' check (status in ('aberto', 'em_analise', 'resolvido')),
  pagina_origem text,
  print_imagem text,
  created_at timestamptz default now()
);

-- Garantir adição de colunas caso a tabela já exista previamente (Migração idempotente)
alter table public.suporte_chamados add column if not exists pagina_origem text;
alter table public.suporte_chamados add column if not exists print_imagem text;

-- Restrição defensiva de tamanho máximo para print anexado (máximo 3.5 MB)
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

-- Revoga execução anônima de função LGPD sensível
revoke execute on function public.solicitar_exclusao_meus_dados() from anon;

-- Índices de busca e auditoria
create index if not exists idx_suporte_chamados_user on public.suporte_chamados(user_id);
create index if not exists idx_suporte_chamados_status on public.suporte_chamados(status);

-- Ativar RLS
alter table public.suporte_chamados enable row level security;

-- Políticas de RLS
drop policy if exists "Assessores podem registrar chamados de suporte" on public.suporte_chamados;
create policy "Assessores podem registrar chamados de suporte"
  on public.suporte_chamados for insert
  with check (auth.uid() = user_id);

drop policy if exists "Assessores podem ler seus próprios chamados" on public.suporte_chamados;
create policy "Assessores podem ler seus próprios chamados"
  on public.suporte_chamados for select
  using (auth.uid() = user_id or public.is_master());

drop policy if exists "Master pode atualizar status dos chamados" on public.suporte_chamados;
create policy "Master pode atualizar status dos chamados"
  on public.suporte_chamados for update
  using (public.is_master())
  with check (public.is_master());

-- =============================================================================
-- 7. TABELA DE VENDAS REALIZADAS (MODELO HIBRIDO 1:N)
-- =============================================================================
create table if not exists public.vendas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  relatorio_id uuid references public.relatorios(id) on delete set null,
  nome_cliente text not null check (char_length(trim(nome_cliente)) between 1 and 200),
  nome_assessor text check (nome_assessor is null or char_length(nome_assessor) <= 200),
  produto text not null check (char_length(trim(produto)) between 1 and 120),
  valor_venda numeric(18,2) not null default 0 check (valor_venda >= 0),
  comissionamento text check (comissionamento is null or comissionamento in ('MAG', 'POB')),
  percentual_comissao numeric(5,2) check (percentual_comissao is null or percentual_comissao in (57.00, 70.00)),
  valor_comissao numeric(18,2) not null default 0 check (valor_comissao >= 0),
  data_venda date not null default current_date,
  observacao text check (observacao is null or char_length(observacao) <= 1000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vendas_user_id on public.vendas(user_id);
create index if not exists idx_vendas_relatorio_id on public.vendas(relatorio_id) where relatorio_id is not null;
create index if not exists idx_vendas_data_venda on public.vendas(data_venda desc, created_at desc);
create index if not exists idx_vendas_created_by on public.vendas(created_by) where created_by is not null;

alter table public.vendas enable row level security;

revoke all on table public.vendas from public, anon;
grant select, insert, update, delete on table public.vendas to authenticated;
revoke truncate, trigger, references, maintain on table public.vendas from authenticated;

drop policy if exists "Usuarios podem ver suas proprias vendas ou master ve todas" on public.vendas;
create policy "Usuarios podem ver suas proprias vendas ou master ve todas"
  on public.vendas for select to authenticated
  using ((select auth.uid()) = user_id or public.is_master() is true);

drop policy if exists "Usuarios podem criar vendas proprias ou master cria para equipe" on public.vendas;
create policy "Usuarios podem criar vendas proprias ou master cria para equipe"
  on public.vendas for insert to authenticated
  with check ((select auth.uid()) = user_id or public.is_master() is true);

drop policy if exists "Usuarios podem atualizar suas proprias vendas ou master atualiza todas" on public.vendas;
create policy "Usuarios podem atualizar suas proprias vendas ou master atualiza todas"
  on public.vendas for update to authenticated
  using ((select auth.uid()) = user_id or public.is_master() is true)
  with check ((select auth.uid()) = user_id or public.is_master() is true);

drop policy if exists "Usuarios podem excluir suas proprias vendas ou master exclui todas" on public.vendas;
create policy "Usuarios podem excluir suas proprias vendas ou master exclui todas"
  on public.vendas for delete to authenticated
  using ((select auth.uid()) = user_id or public.is_master() is true);

-- =============================================================================
-- 8. PAINEL DE USABILIDADE E MÉTRICAS MASTER (SISTEMA DE USUÁRIOS MASTER)
-- =============================================================================
create or replace function public.registrar_acesso_usuario()
returns void as $$
begin
  if auth.uid() is not null then
    update public.profiles
    set ultimo_acesso = now(),
        updated_at = now()
    where id = auth.uid();
  end if;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.registrar_acesso_usuario() to authenticated;

create or replace function public.obter_metricas_usabilidade_master()
returns jsonb as $$
declare
  v_res jsonb;
begin
  if auth.uid() is null or public.is_master() is not true then
    raise exception 'Acesso negado: apenas usuários Master podem consultar métricas de usabilidade.';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'id', coalesce(p.id, u.id),
      'email', coalesce(p.email, u.email),
      'full_name', coalesce(
        nullif(nullif(p.full_name, ''), '-'),
        nullif(nullif(u.raw_user_meta_data->>'full_name', ''), '-'),
        initcap(replace(split_part(coalesce(p.email, u.email), '@', 1), '.', ' '))
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
$$ language plpgsql security definer set search_path = public;

revoke all on function public.obter_metricas_usabilidade_master() from public, anon;
grant execute on function public.obter_metricas_usabilidade_master() to authenticated;




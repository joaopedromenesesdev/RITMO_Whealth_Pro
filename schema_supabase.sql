-- =============================================================================
-- SCHEMAS & POLÍTICAS DE SEGURANÇA (RLS) PARA SUPABASE / POSTGRESQL
-- Whealth Planner Pro (Pace Capital) - Atualizado com Proteção RLS e RPCs
-- =============================================================================

-- FUNÇÃO DE CHECAGEM DE ROLE MASTER (SECURITY DEFINER para evitar recursão no RLS)
create or replace function public.is_master()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'master'
  );
end;
$$ language plpgsql security definer stable;


-- 1. TABELA DE PERFIS DE USUÁRIOS (PROFILES)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role text default 'assessor' check (role in ('master', 'assessor')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Índices para profiles
create index if not exists idx_profiles_role on public.profiles(role);

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
  v_master_emails text[] := array[
    'joaopedromeneses129@gmail.com',
    'willians.novais@pacecapital.com.br',
    'willians.novais@pacecapital.com'
  ];
begin
  -- Atribuição de privilégio Master controlada no servidor (ignora manipulação no client)
  if lower(trim(new.email)) = any(v_master_emails) then
    v_role := 'master';
  else
    v_role := 'assessor';
  end if;

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
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. TABELA DE CONVITES DE ACESSO (INVITES)
create table if not exists public.invites (
  id text primary key,
  email_restrito text,
  used boolean default false,
  used_at timestamptz,
  used_by text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Índices para invites
create index if not exists idx_invites_created_by on public.invites(created_by);
create index if not exists idx_invites_used on public.invites(used);

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

-- Função RPC Segura para Validação Pública de Convite (Sem expor lista da tabela)
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

  return jsonb_build_object('valid', true, 'invite', to_jsonb(v_invite));
end;
$$ language plpgsql security definer;

-- Função RPC Segura para Consumir Convite no Cadastro
create or replace function public.consumir_convite(p_token text, p_email text)
returns jsonb as $$
declare
  v_count int;
begin
  update public.invites
  set used = true,
      used_at = now(),
      used_by = trim(p_email)
  where id = trim(p_token) and used = false;

  get diagnostics v_count = row_count;
  if v_count > 0 then
    return jsonb_build_object('success', true);
  else
    return jsonb_build_object('success', false, 'message', 'Convite inválido ou já utilizado.');
  end if;
end;
$$ language plpgsql security definer;


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
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Usuários podem deletar seus próprios relatórios" on public.relatorios;
create policy "Usuários podem deletar seus próprios relatórios"
  on public.relatorios for delete
  using (auth.uid() = user_id);


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
  with check (auth.uid() = user_id or (user_id is null and auth.role() = 'authenticated'));


-- 5. FUNÇÃO PARA EXPURGO E EXCLUSÃO DE DADOS (LGPD Art. 18, VI)
create or replace function public.solicitar_exclusao_meus_dados()
returns json as $$
declare
  v_user_id uuid := auth.uid();
  v_relatorios_removidos integer := 0;
begin
  if v_user_id is null then
    return json_build_object('success', false, 'message', 'Usuário não autenticado.');
  end if;

  -- Remove todos os relatórios e simulações do titular
  delete from public.relatorios where user_id = v_user_id;
  get diagnostics v_relatorios_removidos = row_count;

  -- Registra evento de auditoria de conformidade
  insert into public.audit_logs (user_id, acao, detalhes)
  values (
    v_user_id,
    'EXCLUSAO_CONTA_LGPD',
    json_build_object('relatorios_expurgados', v_relatorios_removidos, 'data', now())
  );

  return json_build_object(
    'success', true,
    'message', 'Dados expurgados com sucesso em conformidade com a LGPD.',
    'relatorios_removidos', v_relatorios_removidos
  );
end;
$$ language plpgsql security definer;

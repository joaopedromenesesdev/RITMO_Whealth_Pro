// auth.js - Gerenciamento de Autenticação do Supabase (Pace Capital)

// Lista de UIDs opacos com privilégio Master garantido (Zero-Leakage: sem exposição de e-mails no código)
const MASTER_UIDS_AUTORIZADOS = [
  "130e3598-89b9-4702-a4cc-2c5923fa3a66",
  "5ec2da93-ed07-43f8-9089-6d285a092156",
  "469dfeab-5fd6-4159-97a2-aa1fee6e7dcb"
];
if (typeof window !== "undefined") {
  window.MASTER_UIDS_AUTORIZADOS = MASTER_UIDS_AUTORIZADOS;

  // Fallback defensivo caso auth.js carregue sem snapshot previo em __PACE_INITIAL_AUTH__
  if (window.location && !window.__PACE_INITIAL_AUTH__) {
    window.__PACE_INITIAL_AUTH__ = {
      hash: window.location.hash || "",
      search: window.location.search || "",
      pathname: window.location.pathname || ""
    };
  }
}

// Verifica se o usuário atual é Master.
// Fonte de verdade: profiles.role (lido do banco em authObterUsuario) ou UID Master autorizado.
function authIsMaster(user) {
  if (!user) return false;
  if (user.id && MASTER_UIDS_AUTORIZADOS.includes(String(user.id).trim())) {
    return true;
  }
  return user.role === "master" || user.profile_role === "master";
}
if (typeof window !== "undefined") {
  window.authIsMaster = authIsMaster;
}

// Registra o último acesso do usuário (Supabase RPC + Profiles + LocalStorage Fallback)
async function authRegistrarUltimoAcesso(user, force = false) {
  if (!user || !user.id) return;
  const agoraIso = new Date().toISOString();

  // Salva no registro local de usabilidade (útil para fallback e atualização imediata)
  try {
    const rawMap = localStorage.getItem("pace_usabilidade_acessos");
    const map = rawMap ? JSON.parse(rawMap) : {};
    map[user.id] = {
      id: user.id,
      email: user.email || "",
      full_name: user.user_metadata?.full_name || user.full_name || "",
      role: authIsMaster(user) ? "master" : "assessor",
      ultimo_acesso: agoraIso
    };
    localStorage.setItem("pace_usabilidade_acessos", JSON.stringify(map));
  } catch (e) { }

  // Evita múltiplos updates remotos na mesma aba a cada troca de página (exceto no login explícito)
  try {
    if (!force && sessionStorage.getItem("pace_acesso_registrado_sessao") === user.id) {
      return;
    }
    sessionStorage.setItem("pace_acesso_registrado_sessao", user.id);
  } catch (e) { }

  const client = getSupabase();
  if (!client) return;

  try {
    const { error: rpcErr } = await client.rpc("registrar_acesso_usuario");
    if (rpcErr) {
      // Fallback caso a migration de ultimo_acesso ainda não tenha sido aplicada: atualiza updated_at
      await client
        .from("profiles")
        .update({ updated_at: agoraIso })
        .eq("id", user.id);
    }
  } catch (err) {
    console.warn("[authRegistrarUltimoAcesso] Aviso ao registrar acesso:", err);
  }
}
if (typeof window !== "undefined") {
  window.authRegistrarUltimoAcesso = authRegistrarUltimoAcesso;
}

// Verifica se o e-mail é válido para cadastro (qualquer e-mail com link de convite ativo)
function authValidarEmailPermitido(email, activeInvite = null) {
  if (!email || !email.includes("@")) return false;
  const emailLower = email.toLowerCase().trim();

  // Se o Master restringiu a um e-mail específico, valida se é o mesmo
  if (activeInvite && activeInvite.email_restrito && activeInvite.email_restrito !== emailLower) {
    return false;
  }

  return true;
}

// --- GERENCIAMENTO DE CONVITES (Supabase + LocalStorage Fallback) ---
function authObterConvites() {
  try {
    const raw = localStorage.getItem("pace_invite_tokens");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function authSalvarConvites(convites) {
  localStorage.setItem("pace_invite_tokens", JSON.stringify(convites));
}

const PAGINAS_SISTEMA_EXTENSIONLESS = [
  "/index",
  "/login",
  "/patrimonio",
  "/familiar",
  "/evolucao",
  "/tributario",
  "/nova_simulacao"
];

// Verifica se o caminho atual corresponde a pagina de login (com ou sem extensao .html no GitHub Pages)
function authEhPaginaLogin(pathnameOverride) {
  const rawPath = typeof pathnameOverride === "string"
    ? pathnameOverride
    : (typeof window !== "undefined" && window.location ? (window.location.pathname || "") : "");
  const cleanPath = rawPath.toLowerCase().replace(/\/+$/, "");
  return cleanPath.endsWith("/login.html") || cleanPath.endsWith("/login") || cleanPath === "login.html" || cleanPath === "login";
}

// Helper universal para obter a URL absoluta de login.html em qualquer ambiente (GitHub Pages, localhost, subpastas)
function authObterBaseUrlLogin(hrefOverride) {
  try {
    const rawHref = typeof hrefOverride === "string"
      ? hrefOverride
      : (typeof window !== "undefined" && window.location ? window.location.href : "");
    if (!rawHref) return "login.html";
    const url = new URL(rawHref);
    let pathname = url.pathname || "/";
    const lowerPath = pathname.toLowerCase();
    const ehPaginaSemExtensao = PAGINAS_SISTEMA_EXTENSIONLESS.some(p => lowerPath.endsWith(p));
    if (pathname.endsWith(".html") || ehPaginaSemExtensao) {
      const lastSlashIndex = pathname.lastIndexOf("/");
      pathname = (lastSlashIndex !== -1 ? pathname.substring(0, lastSlashIndex + 1) : "/") + "login.html";
    } else if (pathname.endsWith("/")) {
      pathname = pathname + "login.html";
    } else {
      pathname = pathname + "/login.html";
    }
    const origin = url.origin && url.origin !== "null" ? url.origin : "";
    if (!origin && rawHref.startsWith("file:")) {
      return "file://" + pathname;
    }
    return `${origin}${pathname}`;
  } catch (e) {
    return "login.html";
  }
}

// Helper interno: verifica se o convite ultrapassou o período de validade (7 dias)
function authConviteExpirou(invite) {
  if (!invite) return false;
  if (invite.expires_at) {
    return new Date(invite.expires_at).getTime() < Date.now();
  }
  if (invite.created_at) {
    // Retrocompatibilidade para convites legados sem expires_at explícito (7 dias)
    const criado = new Date(invite.created_at).getTime();
    return (Date.now() - criado) > (7 * 24 * 60 * 60 * 1000);
  }
  return false;
}

// Gerar novo token de convite com alta entropia criptográfica (uso exclusivo Master com expiração de 7 dias)
function authGerarConvite(emailRestrito = null) {
  let randomHex = "";
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    randomHex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  } else {
    randomHex = Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  }
  const token = "pace_inv_" + randomHex;
  const convites = authObterConvites();

  const now = new Date();
  const expiresAt = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)).toISOString(); // 7 dias

  const novoConvite = {
    id: token,
    created_at: now.toISOString(),
    expires_at: expiresAt,
    used: false,
    used_at: null,
    used_by: null,
    email_restrito: emailRestrito ? emailRestrito.toLowerCase().trim() : null
  };

  convites.push(novoConvite);
  authSalvarConvites(convites);

  // Tenta persistir no Supabase se cliente estiver disponível
  if (window.supabaseClient) {
    window.supabaseClient.from('invites').insert([{
      id: token,
      email_restrito: novoConvite.email_restrito,
      expires_at: expiresAt,
      used: false
    }]).then(({ error }) => {
      if (error) console.warn("[authGerarConvite] Aviso ao registrar no Supabase:", error.message);
      else console.log("[authGerarConvite] Convite persistido no Supabase com TTL de 7 dias:", token);
    }).catch(err => console.warn(err));
  }

  // Monta a URL de cadastro garantindo apontamento direto para login.html
  const loginUrl = authObterBaseUrlLogin();
  return {
    token,
    url: `${loginUrl}?invite=${token}`,
    invite: novoConvite
  };
}

// Validar token de convite (Suporte a Supabase RPC, Query Direta, LocalStorage e Validação Estrutural com Checagem de Expiração)
async function authValidarConvite(token) {
  if (!token) return { valid: false, message: "Nenhum código de convite fornecido." };

  const cleanToken = token.trim();

  // 1. Consulta remota no Supabase via RPC seguro ou Query direta
  const client = getSupabase();
  if (client) {
    try {
      // Tenta via RPC seguro primeiro (impede listagem pública da tabela)
      const { data: rpcRes, error: rpcErr } = await client.rpc("validar_convite", { p_token: cleanToken });
      if (!rpcErr && rpcRes && typeof rpcRes === "object" && typeof rpcRes.valid === "boolean") {
        if (rpcRes.valid && rpcRes.invite && authConviteExpirou(rpcRes.invite)) {
          return { valid: false, message: "Este link de convite expirou (validade máxima de 7 dias excedida)." };
        }
        return rpcRes;
      }

      // Fallback para consulta direta por ID exato
      const { data, error } = await client
        .from("invites")
        .select("*")
        .eq("id", cleanToken)
        .maybeSingle();

      if (data) {
        if (data.used) {
          return { valid: false, message: "Este link de convite já foi utilizado por outro usuário." };
        }
        if (authConviteExpirou(data)) {
          return { valid: false, message: "Este link de convite expirou (validade máxima de 7 dias excedida)." };
        }
        return { valid: true, invite: data };
      }
    } catch (e) {
      console.warn("[authValidarConvite] Erro/Aviso ao consultar Supabase:", e);
    }
  }

  // Sem fallback via LocalStorage: tokens locais podem ser forjados pelo próprio navegador.
  // A validação é exclusivamente server-side (RPC validar_convite).
  return { valid: false, message: "Link de convite inválido, expirado ou não encontrado." };
}

// Consumir token após cadastro bem sucedido
function authConsumirConvite(token, emailUsado) {
  const convites = authObterConvites();
  const idx = convites.findIndex(c => c.id === token);
  if (idx !== -1) {
    convites[idx].used = true;
    convites[idx].used_at = new Date().toISOString();
    convites[idx].used_by = emailUsado;
    authSalvarConvites(convites);
  }

  if (window.supabaseClient) {
    // Tenta via RPC primeiro
    window.supabaseClient.rpc('consumir_convite', { p_token: token, p_email: emailUsado })
      .then(({ data, error }) => {
        if (error || (data && data.success === false)) {
          // Fallback para update direto se o usuário for master
          window.supabaseClient.from('invites').update({
            used: true,
            used_at: new Date().toISOString(),
            used_by: emailUsado
          }).eq('id', token);
        }
      }).catch(err => console.warn(err));
  }
}

// Expor funções de convite globalmente para o global_ui.js
if (typeof window !== "undefined") {
  window.authObterConvites = authObterConvites;
  window.authSalvarConvites = authSalvarConvites;
  window.authGerarConvite = authGerarConvite;
  window.authValidarConvite = authValidarConvite;
  window.authConsumirConvite = authConsumirConvite;
}

// Garante que o cliente do supabase esteja disponível
function getSupabase() {
  if (typeof window === "undefined") return null;
  if (window.supabaseClient) return window.supabaseClient;
  if (typeof supabaseClient !== 'undefined' && supabaseClient) return supabaseClient;
  if (window.supabase && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return window.supabaseClient;
  }
  return null;
}

// Normaliza o nome de exibicao sem sobrescrever por placeholder "Assessor"
function authFormatarNomeUsuario(email, ...candidatos) {
  for (const cand of candidatos) {
    const val = String(cand || "").trim();
    if (val && val !== "-" && val.toLowerCase() !== "assessor") {
      return val;
    }
  }
  const cleanEmail = String(email || "").trim();
  if (cleanEmail && cleanEmail.includes("@")) {
    const alias = cleanEmail.split("@")[0];
    const partes = alias
      .split(/[._-]/)
      .filter(Boolean)
      .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());
    if (partes.length > 0) return partes.join(" ");
    return alias || "Assessor";
  }
  return "Assessor";
}

// Verifica se o usuário atual está logado (retorna promessa com dados do user e sua role oficial)
async function authObterUsuario() {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data: { session }, error } = await client.auth.getSession();
    if (error) throw error;
    if (!session || !session.user) return null;

    // Obtém a role oficial da tabela profiles (garantia server-side)
    try {
      const { data: profile } = await client
        .from("profiles")
        .select("role, full_name")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profile) {
        session.user.role = profile.role;
        session.user.profile_role = profile.role;
      }

      const nomeNormalizado = authFormatarNomeUsuario(
        session.user.email,
        session.user.user_metadata?.full_name,
        profile?.full_name
      );
      if (nomeNormalizado && nomeNormalizado !== "Assessor") {
        session.user.user_metadata = session.user.user_metadata || {};
        session.user.user_metadata.full_name = nomeNormalizado;
      }

      // Garante promoção imediata para contas Master autorizadas via perfil ou UID opaco
      if (authIsMaster(session.user)) {
        session.user.role = "master";
        session.user.profile_role = "master";
        if (profile && profile.role !== "master") {
          client.from("profiles").update({ role: "master" }).eq("id", session.user.id).then(() => {}).catch(() => {});
        }
      }
    } catch (pErr) {
      console.warn("[authObterUsuario] Aviso ao obter profile do Supabase:", pErr);
      if (authIsMaster(session.user)) {
        session.user.role = "master";
        session.user.profile_role = "master";
      }
    }

    // Registra o acesso do usuário de forma assíncrona (sem bloquear a navegação)
    authRegistrarUltimoAcesso(session.user, false);

    return session.user;
  } catch (e) {
    console.error("Erro ao obter sessão:", e);
    return null;
  }
}

// Efetuar Login
async function authEntrar(email, password) {
  const client = getSupabase();
  if (!client) throw new Error("Cliente Supabase não configurado.");

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  try {
    sessionStorage.removeItem("pace_auth_action_pending");
    localStorage.removeItem("pace_user_cache");
  } catch (e) { }
  if (data && data.user) {
    authRegistrarUltimoAcesso(data.user, true);
  }
  return data;
}

// Criar Conta (bloqueando injeção client-side de role)
async function authCadastrar(email, password, metadata = {}) {
  const client = getSupabase();
  if (!client) throw new Error("Cliente Supabase não configurado.");

  // Remove qualquer tentativa de ditar role pelo cliente (determinado exclusivamente no servidor)
  const safeMetadata = { ...metadata };
  delete safeMetadata.role;

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: safeMetadata
    }
  });
  if (error) throw error;
  return data;
}

// Fazer Logout (Sair)
async function authSair() {
  const client = getSupabase();
  if (client) {
    await client.auth.signOut();
  }
  try {
    localStorage.removeItem("pace_user_cache");
    localStorage.removeItem("pace_invite_tokens");
    // Remove backups locais de relatórios (dados patrimoniais) ao encerrar a sessão
    Object.keys(localStorage)
      .filter(k => k.startsWith("relatorios_backup_"))
      .forEach(k => localStorage.removeItem(k));
  } catch (e) { }
  if (typeof sessionStorage !== "undefined") sessionStorage.clear();
  if (typeof window !== "undefined") window.location.href = "login.html";
}

// Tradutor universal de mensagens de erro do Supabase para Português
function authTraduzirMensagemErro(rawMsg) {
  if (!rawMsg || typeof rawMsg !== "string") {
    return "Ocorreu um erro ao processar a solicitação. Por favor, tente novamente.";
  }

  const msgLower = rawMsg.toLowerCase().trim();

  if (msgLower.includes("auth session missing")) {
    return "Nenhuma sessão de ativação ou recuperação de senha foi encontrada. Isso ocorre se você não acessou pelo link enviado ou se o link já foi consumido/expirou. Por favor, solicite um novo acesso ao administrador.";
  }
  if (msgLower.includes("invalid login credentials")) {
    return "E-mail ou senha inválidos. Por favor, tente novamente.";
  }
  if (msgLower.includes("email not confirmed")) {
    return "Seu e-mail foi cadastrado, mas ainda não foi verificado. Por favor, confirme o e-mail na sua caixa de entrada.";
  }
  if (msgLower.includes("user already registered")) {
    return "Este endereço de e-mail já está cadastrado no sistema.";
  }
  const matchCooldown = msgLower.match(/for security purposes,\s*you can only request this after\s*(\d+)\s*seconds?/);
  if (matchCooldown) {
    return `Por segurança, aguarde ${matchCooldown[1]} segundos antes de solicitar um novo e-mail.`;
  }
  if (
    msgLower.includes("over_request_rate_limit") ||
    msgLower.includes("over_email_rate_limit") ||
    msgLower.includes("over email rate limit") ||
    msgLower.includes("request rate limit reached") ||
    msgLower.includes("too many requests") ||
    msgLower.includes("rate limit")
  ) {
    return "Muitas tentativas em pouco tempo. Por favor, aguarde alguns minutos antes de tentar novamente ou peça suporte ao administrador.";
  }
  if (
    msgLower.includes("otp_expired") ||
    msgLower.includes("token has expired") ||
    msgLower.includes("link is invalid") ||
    msgLower.includes("token is expired") ||
    msgLower.includes("email link is invalid or has expired")
  ) {
    return "O link de ativação ou redefinição de senha expirou ou já foi utilizado. Por favor, clique em 'Esqueceu sua senha?' abaixo para gerar um novo link ou contate o administrador.";
  }
  if (msgLower.includes("new password should be different")) {
    return "A nova senha deve ser diferente da senha antiga.";
  }
  if (msgLower.includes("password should be at least")) {
    return "A senha deve conter no mínimo 8 caracteres.";
  }
  if (msgLower.includes("user not found")) {
    return "Se o endereço de e-mail informado estiver cadastrado na plataforma, as instruções serão enviadas em instantes. Verifique também a caixa de spam.";
  }
  if (msgLower.includes("invalid format") || msgLower.includes("invalid email")) {
    return "Endereço de e-mail em formato inválido.";
  }

  return rawMsg;
}

/**
 * Analisa parametros de autenticacao vindos do hash/query preservados antes do SDK limpar a URL.
 */
function authAnalisarParametrosUrlAuth(hashOverride, searchOverride, pendingOverride) {
  const initial = (typeof window !== "undefined" && window.__PACE_INITIAL_AUTH__) || {};
  const winHash = (typeof window !== "undefined" && window.location) ? (window.location.hash || "") : "";
  const winSearch = (typeof window !== "undefined" && window.location) ? (window.location.search || "") : "";

  const rawHash = typeof hashOverride === "string" ? hashOverride : (initial.hash || winHash);
  const rawSearch = typeof searchOverride === "string" ? searchOverride : (initial.search || winSearch);

  let pending = pendingOverride;
  if (pending === undefined && typeof sessionStorage !== "undefined") {
    try {
      pending = sessionStorage.getItem("pace_auth_action_pending") || "";
    } catch (e) {
      pending = "";
    }
  }

  const hashParams = new URLSearchParams(rawHash.startsWith("#") ? rawHash.slice(1) : rawHash);
  const searchParams = new URLSearchParams(rawSearch.startsWith("?") ? rawSearch.slice(1) : rawSearch);

  const errorCode = hashParams.get("error_code") || searchParams.get("error_code") || "";
  const error = hashParams.get("error") || searchParams.get("error") || "";
  const errorDescription = hashParams.get("error_description") || searchParams.get("error_description") || "";
  const type = (hashParams.get("type") || searchParams.get("type") || searchParams.get("auth_flow") || "").toLowerCase();
  const tokenHash = (hashParams.get("token_hash") || searchParams.get("token_hash") || "").trim();
  const hasTokenHash = Boolean(tokenHash);
  const hasAccessToken = hashParams.has("access_token") || searchParams.has("access_token");
  const hasCode = searchParams.has("code");

  const hasError = Boolean(error || errorCode || errorDescription);
  const isInvite = !hasError && (type === "invite" || pending === "invite");
  const isRecovery = !hasError && (type === "recovery" || pending === "recovery");
  const needsPasswordSetup = !hasError && (isInvite || isRecovery || hasAccessToken || hasTokenHash);

  return {
    rawHash,
    rawSearch,
    error,
    errorCode,
    errorDescription,
    type,
    tokenHash,
    hasTokenHash,
    hasAccessToken,
    hasCode,
    hasError,
    isInvite,
    isRecovery,
    needsPasswordSetup
  };
}

/**
 * Converte erros de callback da URL do Supabase em mensagem amigavel e precisa.
 */
function authFormatarMensagemErroUrl(urlInfo) {
  if (!urlInfo || !urlInfo.hasError) return "";
  const textoCombinado = [urlInfo.errorCode, urlInfo.errorDescription, urlInfo.error]
    .filter(Boolean)
    .join(" ");
  const traduzido = authTraduzirMensagemErro(textoCombinado);
  if (traduzido !== textoCombinado) {
    return traduzido;
  }
  return "Não foi possível validar o link de ativação/redefinição. Solicite um novo link ao administrador ou use 'Esqueceu sua senha?'.";
}

/**
 * Monta URL absoluta de destino para login.html preservando estado de convite, recuperacao ou erro.
 */
function authConstruirRedirectLoginComAuth(loginBaseUrl, urlInfo) {
  const info = urlInfo || authAnalisarParametrosUrlAuth();
  const base = loginBaseUrl || authObterBaseUrlLogin();
  const searchParams = new URLSearchParams(info.rawSearch.startsWith("?") ? info.rawSearch.slice(1) : info.rawSearch);
  if (info.isInvite && !searchParams.has("auth_flow")) {
    searchParams.set("auth_flow", "invite");
  } else if (info.isRecovery && !searchParams.has("auth_flow")) {
    searchParams.set("auth_flow", "recovery");
  }
  const queryStr = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const hashStr = info.rawHash ? (info.rawHash.startsWith("#") ? info.rawHash : `#${info.rawHash}`) : "";
  return `${base}${queryStr}${hashStr}`;
}

// Solicitar redefinição de senha (envio de e-mail)
async function authSolicitarRecuperacaoSenha(email) {
  const client = getSupabase();
  if (!client) throw new Error("Cliente Supabase não configurado.");

  const redirectUrl = authObterBaseUrlLogin();
  const { data, error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl
  });
  if (error) throw error;
  return data;
}

// Redefinir senha do usuário autenticado via token de recuperação
async function authRedefinirSenha(novaSenha) {
  const client = getSupabase();
  if (!client) throw new Error("Cliente Supabase não configurado.");

  const { data, error } = await client.auth.updateUser({ password: novaSenha });
  if (error) throw error;
  return data;
}

// Expor globalmente
if (typeof window !== "undefined") {
  window.authFormatarNomeUsuario = authFormatarNomeUsuario;
  window.authTraduzirMensagemErro = authTraduzirMensagemErro;
  window.authAnalisarParametrosUrlAuth = authAnalisarParametrosUrlAuth;
  window.authFormatarMensagemErroUrl = authFormatarMensagemErroUrl;
  window.authConstruirRedirectLoginComAuth = authConstruirRedirectLoginComAuth;
  window.authSolicitarRecuperacaoSenha = authSolicitarRecuperacaoSenha;
  window.authRedefinirSenha = authRedefinirSenha;
}

// Guarda de Rotas para ser executada no início das páginas protegidas
async function authProtegerRota() {
  const user = await authObterUsuario();
  if (!user) {
    const search = window.location.search || "";
    const loginUrl = authObterBaseUrlLogin();
    window.location.href = `${loginUrl}${search}`;
    return null;
  }
  return user;
}

function authLimparPendenciaAtivacao() {
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem("pace_auth_action_pending");
    }
  } catch (e) { }
  if (typeof window !== "undefined" && window.__PACE_INITIAL_AUTH__) {
    window.__PACE_INITIAL_AUTH__.hash = "";
    window.__PACE_INITIAL_AUTH__.search = "";
  }
}

// Código específico para a página login.html
if (typeof document !== "undefined") {
document.addEventListener("DOMContentLoaded", async () => {
  const authForm = document.getElementById("auth-form");
  if (!authForm) return; // Não está na tela de login

  const title = document.getElementById("login-title");
  const subtitle = document.getElementById("login-subtitle");
  const groupFullname = document.getElementById("group-fullname");
  const fullnameInput = document.getElementById("fullname");
  const emailInput = document.getElementById("email");
  const groupEmail = emailInput ? emailInput.closest(".input-group") : null;
  const groupPassword = document.getElementById("group-password");
  const labelPassword = document.getElementById("label-password");
  const passwordInput = document.getElementById("password");
  const forgotPasswordWrap = document.getElementById("forgot-password-wrap");
  const linkForgotPassword = document.getElementById("link-forgot-password");
  const groupConfirmPassword = document.getElementById("group-confirm-password");
  const confirmPasswordInput = document.getElementById("confirm-password");
  const btnSubmit = document.getElementById("btn-submit");
  const btnText = document.getElementById("btn-text");
  const btnSpinner = document.getElementById("btn-spinner");
  const toggleArea = document.getElementById("auth-toggle");
  const authBackLogin = document.getElementById("auth-back-login");
  const linkBackLogin = document.getElementById("link-back-login");
  const alertDiv = document.getElementById("auth-alert");

  let isForgotPass = false;
  let isResetMode = false;
  let isSignUp = false;
  let activeInvite = null;
  let inviteToken = null;
  let pendingTokenHash = "";
  let pendingTokenType = "recovery";

  // Funções de alteração de modo de UI
  function setModeLogin() {
    isForgotPass = false;
    isResetMode = false;
    pendingTokenHash = "";
    authLimparPendenciaAtivacao();
    if (window.history && window.history.replaceState && window.location && (
      window.location.search.includes("auth_flow=") ||
      window.location.search.includes("token_hash=") ||
      window.location.search.includes("type=") ||
      window.location.hash
    )) {
      window.history.replaceState(null, null, window.location.pathname);
    }
    if (title) title.textContent = "Bem-vindo de volta";
    if (subtitle) subtitle.textContent = "Entre com suas credenciais para acessar seus planejamentos.";
    if (groupEmail) groupEmail.classList.remove("hidden");
    if (emailInput) {
      emailInput.setAttribute("required", "required");
      if (!activeInvite) emailInput.removeAttribute("readonly");
    }
    if (groupPassword) groupPassword.classList.remove("hidden");
    if (labelPassword) labelPassword.textContent = "Senha";
    if (passwordInput) {
      passwordInput.setAttribute("required", "required");
      passwordInput.placeholder = "••••••••";
      passwordInput.value = "";
    }
    if (forgotPasswordWrap) forgotPasswordWrap.classList.remove("hidden");
    if (groupConfirmPassword) groupConfirmPassword.classList.add("hidden");
    if (confirmPasswordInput) {
      confirmPasswordInput.removeAttribute("required");
      confirmPasswordInput.value = "";
    }
    if (groupFullname) groupFullname.classList.add("hidden");
    const groupTermos = document.getElementById("group-termos");
    if (groupTermos) groupTermos.classList.add("hidden");
    if (btnText) btnText.textContent = "Entrar na plataforma";
    if (authBackLogin) authBackLogin.classList.add("hidden");
    if (alertDiv) alertDiv.classList.add("hidden");
  }

  function setModeForgot() {
    isForgotPass = true;
    isResetMode = false;
    authLimparPendenciaAtivacao();
    if (title) title.textContent = "Recuperar Senha";
    if (subtitle) subtitle.textContent = "Informe seu e-mail cadastrado para receber o link de redefinição.";
    if (groupEmail) groupEmail.classList.remove("hidden");
    if (emailInput) {
      emailInput.setAttribute("required", "required");
      emailInput.removeAttribute("readonly");
    }
    if (groupPassword) groupPassword.classList.add("hidden");
    if (passwordInput) passwordInput.removeAttribute("required");
    if (groupConfirmPassword) groupConfirmPassword.classList.add("hidden");
    if (confirmPasswordInput) confirmPasswordInput.removeAttribute("required");
    if (groupFullname) groupFullname.classList.add("hidden");
    const groupTermos = document.getElementById("group-termos");
    if (groupTermos) groupTermos.classList.add("hidden");
    if (btnText) btnText.textContent = "Enviar E-mail de Recuperação";
    if (authBackLogin) authBackLogin.classList.remove("hidden");
    if (alertDiv) alertDiv.classList.add("hidden");
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  }

  let isInviteActivation = false;

  function setModeReset(isInvite = false) {
    isForgotPass = false;
    isResetMode = true;
    isInviteActivation = isInvite;
    if (title) title.textContent = isInvite ? "Ativar sua Conta" : "Redefinir sua Senha";
    if (subtitle) subtitle.textContent = isInvite
      ? "Defina uma senha de acesso para entrar na plataforma."
      : "Crie uma nova senha de acesso para sua conta.";
    if (groupEmail) groupEmail.classList.add("hidden");
    if (emailInput) emailInput.removeAttribute("required");
    if (groupPassword) groupPassword.classList.remove("hidden");
    if (labelPassword) labelPassword.textContent = isInvite ? "Criar Senha" : "Nova Senha";
    if (passwordInput) {
      passwordInput.setAttribute("required", "required");
      passwordInput.placeholder = "Digite sua senha (mín. 8 caracteres)";
      passwordInput.value = "";
    }
    if (forgotPasswordWrap) forgotPasswordWrap.classList.add("hidden");
    if (groupConfirmPassword) groupConfirmPassword.classList.remove("hidden");
    if (confirmPasswordInput) {
      confirmPasswordInput.setAttribute("required", "required");
      confirmPasswordInput.placeholder = "Confirme sua senha";
      confirmPasswordInput.value = "";
    }
    if (groupFullname) groupFullname.classList.add("hidden");
    const groupTermos = document.getElementById("group-termos");
    if (groupTermos) groupTermos.classList.add("hidden");
    if (btnText) btnText.textContent = isInvite ? "Ativar Conta e Entrar" : "Atualizar Senha";
    if (authBackLogin) authBackLogin.classList.remove("hidden");
    if (alertDiv) alertDiv.classList.add("hidden");
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  }

  // Eventos de clique para alternar modos
  if (linkForgotPassword) {
    linkForgotPassword.addEventListener("click", setModeForgot);
  }
  if (linkBackLogin) {
    linkBackLogin.addEventListener("click", setModeLogin);
  }

  // Escuta de eventos do Supabase Auth para ativacao por convite e recuperacao de senha
  const client = getSupabase();
  if (client) {
    client.auth.onAuthStateChange((event) => {
      if (isResetMode) return;
      if (event === "PASSWORD_RECOVERY") {
        setModeReset(false);
      } else if (event === "SIGNED_IN") {
        const currentInfo = authAnalisarParametrosUrlAuth();
        if (currentInfo.isInvite) {
          setModeReset(true);
        } else if (currentInfo.isRecovery) {
          setModeReset(false);
        }
      }
    });
  }

  // Analisa snapshot inicial da URL (preservado antes do SDK limpar o hash)
  const urlInfo = authAnalisarParametrosUrlAuth();

  if (urlInfo.hasError) {
    authLimparPendenciaAtivacao();
    if (alertDiv) {
      alertDiv.className = "auth-alert error";
      alertDiv.textContent = authFormatarMensagemErroUrl(urlInfo);
      alertDiv.classList.remove("hidden");
    }
  } else if (urlInfo.needsPasswordSetup) {
    if (urlInfo.hasTokenHash) {
      const validTypes = ["invite", "recovery", "email", "magiclink"];
      pendingTokenHash = urlInfo.tokenHash;
      pendingTokenType = validTypes.includes(urlInfo.type)
        ? urlInfo.type
        : (urlInfo.isInvite ? "invite" : "recovery");
    }
    setModeReset(urlInfo.isInvite);
  }

  // Cadastro direto desativado na interface (administração centralizada de usuários via Supabase)
  if (toggleArea) {
    toggleArea.classList.add("hidden");
  }

  // Envio do formulário (com throttle defensivo contra força bruta / cliques múltiplos)
  let ultimoEnvioAuth = 0;
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const agora = Date.now();
    if (agora - ultimoEnvioAuth < 1500) {
      return; // Throttle defensivo
    }
    ultimoEnvioAuth = agora;

    btnSubmit.disabled = true;
    btnSpinner.classList.remove("hidden");
    btnText.style.opacity = "0.7";
    alertDiv.classList.add("hidden");

    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value : "";
    const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : "";
    const fullname = fullnameInput ? fullnameInput.value.trim() : "";

    try {
      if (isForgotPass) {
        // Solicitação de E-mail de Recuperação
        if (!email || !email.includes("@")) {
          throw new Error("Por favor, informe um endereço de e-mail válido.");
        }

        await authSolicitarRecuperacaoSenha(email);

        alertDiv.className = "auth-alert success";
        alertDiv.textContent = "Se o e-mail estiver cadastrado, você receberá um link com as instruções de redefinição de senha em alguns instantes. Verifique também a caixa de spam.";
        alertDiv.classList.remove("hidden");

      } else if (isResetMode) {
        // Atualização da Nova Senha (mínimo 8 caracteres e complexidade)
        if (!password || password.length < 8) {
          throw new Error("A nova senha deve possuir pelo menos 8 caracteres.");
        }
        if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
          throw new Error("A nova senha deve conter pelo menos uma letra e um número para sua segurança.");
        }
        if (password !== confirmPassword) {
          throw new Error("As senhas digitadas não coincidem. Por favor, confirme a nova senha exatamente igual.");
        }

        const clientAuth = getSupabase();
        if (!clientAuth) {
          throw new Error("Cliente Supabase não configurado.");
        }

        // Consome token_hash apenas no submit explicito do usuario (imune a scanners de e-mail)
        if (pendingTokenHash) {
          const validTypes = ["invite", "recovery", "email", "magiclink"];
          const otpType = validTypes.includes(pendingTokenType) ? pendingTokenType : "recovery";
          const { data: otpData, error: otpError } = await clientAuth.auth.verifyOtp({
            token_hash: pendingTokenHash,
            type: otpType
          });
          if (otpError) throw otpError;
          pendingTokenHash = "";
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, null, window.location.pathname);
          }
          if (!otpData || (!otpData.session && !otpData.user)) {
            throw new Error("Auth session missing!");
          }
        } else {
          const userSession = await authObterUsuario();
          if (!userSession) {
            throw new Error("Auth session missing!");
          }
        }

        await authRedefinirSenha(password);
        authLimparPendenciaAtivacao();

        try {
          sessionStorage.clear();
          localStorage.removeItem("pace_user_cache");
        } catch (e) { }

        const authenticatedUser = await authObterUsuario();
        if (authenticatedUser) {
          await authRegistrarUltimoAcesso(authenticatedUser, true);
        }

        alertDiv.className = "auth-alert success";
        alertDiv.textContent = isInviteActivation
          ? "Conta ativada com sucesso! Acessando a plataforma..."
          : "Senha definida com sucesso! Acessando a plataforma...";
        alertDiv.classList.remove("hidden");

        // Limpa hash e query da URL e redireciona para a plataforma autenticada
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, null, window.location.pathname);
        }

        setTimeout(() => {
          window.location.href = "index.html";
        }, 1500);

      } else if (isSignUp) {
        // Validação de e-mail válido
        if (!authValidarEmailPermitido(email, activeInvite)) {
          throw new Error("Por favor, informe um endereço de e-mail válido para concluir seu cadastro.");
        }

        if (activeInvite && activeInvite.email_restrito && activeInvite.email_restrito !== email.toLowerCase()) {
          throw new Error(`Este convite foi gerado exclusivamente para o e-mail: ${activeInvite.email_restrito}`);
        }

        // Validação obrigatória de senha forte (mínimo 8 caracteres + complexidade)
        if (!password || password.length < 8) {
          throw new Error("A senha de acesso deve possuir pelo menos 8 caracteres.");
        }
        if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
          throw new Error("A senha deve conter pelo menos uma letra e um número.");
        }

        // Validação obrigatória de consentimento LGPD
        const checkTermos = document.getElementById("check-termos");
        if (checkTermos && !checkTermos.checked) {
          throw new Error("Você precisa concordar com os Termos de Uso e a Política de Privacidade (LGPD) para concluir seu cadastro.");
        }

        // O role é atribuído de forma segura exclusivamente no servidor pelo PostgreSQL
        await authCadastrar(email, password, {
          full_name: fullname,
          termos_aceitos_em: new Date().toISOString()
        });

        // Marcar convite como consumido
        if (inviteToken) {
          authConsumirConvite(inviteToken, email);
        }

        alertDiv.className = "auth-alert success";
        alertDiv.textContent = "Conta criada com sucesso! Redirecionando para o login...";
        alertDiv.classList.remove("hidden");

        setTimeout(() => {
          window.location.href = "login.html";
        }, 2000);
      } else {
        await authEntrar(email, password);
        sessionStorage.clear();
        window.location.href = "index.html";
      }
    } catch (err) {
      console.error(err);
      alertDiv.className = "auth-alert error";
      alertDiv.textContent = authTraduzirMensagemErro(err ? err.message : null);
      alertDiv.classList.remove("hidden");
    } finally {
      btnSubmit.disabled = false;
      btnSpinner.classList.add("hidden");
      btnText.style.opacity = "1";
    }
  });

  // Redireciona apenas se já estiver autenticado e NÃO estiver em fluxo de ativação/redefinição/erro
  if (!urlInfo.needsPasswordSetup && !urlInfo.hasError && !inviteToken) {
    authObterUsuario().then(user => {
      if (user && !isResetMode) {
        window.location.href = "index.html";
      }
    });
  }

  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
});
}

// Toggle e Fechamento do Dropdown de Usuário
if (typeof window !== "undefined") {
  window.toggleUserDropdown = function (e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById("user-dropdown-menu");
    const trigger = document.getElementById("user-dropdown-trigger");
    if (dropdown) {
      const isShowing = dropdown.classList.contains("show");
      if (isShowing) {
        dropdown.classList.remove("show");
        if (trigger) trigger.classList.remove("active");
      } else {
        dropdown.classList.add("show");
        if (trigger) trigger.classList.add("active");
      }
    }
  };

  window.closeUserDropdown = function () {
    const dropdown = document.getElementById("user-dropdown-menu");
    const trigger = document.getElementById("user-dropdown-trigger");
    if (dropdown) dropdown.classList.remove("show");
    if (trigger) trigger.classList.remove("active");
  };
}

if (typeof document !== "undefined") {
  document.addEventListener("click", (e) => {
    const wrap = document.getElementById("user-dropdown-wrap");
    if (wrap && !wrap.contains(e.target) && typeof window !== "undefined" && window.closeUserDropdown) {
      window.closeUserDropdown();
    }
  });
}

// Renderizar informações do usuário na navbar (Dropdown Unificado)
function renderizarNavAuth(user) {
  const navbar = document.querySelector(".navbar");
  if (!navbar || !user) return;

  // Remove btn-limpar avulso do menu de links se ainda existir
  const btnLimpar = navbar.querySelector(".btn-limpar");
  if (btnLimpar) btnLimpar.remove();

  const email = user.email || "";
  const shortEmail = email.split("@")[0];
  const userDisplayName = authFormatarNomeUsuario(email, user.user_metadata?.full_name, user.full_name, shortEmail);
  const isMaster = authIsMaster(user);

  // Iniciais para o Avatar
  const nameParts = userDisplayName.trim().split(" ");
  const initials = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : userDisplayName.substring(0, 2).toUpperCase();

  // Salva no cache local para hidratação ultra-rápida (0ms) nas próximas trocas de tela
  try {
    localStorage.setItem("pace_user_cache", JSON.stringify({
      id: user.id || "",
      email: email,
      full_name: userDisplayName,
      role: isMaster ? "master" : "assessor"
    }));
  } catch (e) { }

  let wrapDiv = document.getElementById("user-dropdown-wrap");
  const isUpdate = !!wrapDiv;

  if (!wrapDiv) {
    wrapDiv = document.createElement("div");
    wrapDiv.id = "user-dropdown-wrap";
    wrapDiv.className = "user-dropdown-wrap";
  }

  wrapDiv.innerHTML = `
    <button type="button" class="user-dropdown-trigger" id="user-dropdown-trigger" onclick="window.toggleUserDropdown(event)" title="${window.escapeHTML(email)}">
      <div class="user-avatar-circle">${window.escapeHTML(initials)}</div>
      <span class="user-dropdown-name">${window.escapeHTML(userDisplayName)}</span>
      ${isMaster ? '<span class="badge-master">MASTER</span>' : ''}
      <svg class="dropdown-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
    </button>

    <div class="user-dropdown-menu" id="user-dropdown-menu">
      <div class="ud-header">
        <div class="ud-user-name">${window.escapeHTML(userDisplayName)}</div>
        <div class="ud-user-email">${window.escapeHTML(email)}</div>
      </div>
      ${isMaster ? `
      <a href="javascript:void(0)" onclick="if (typeof window.abrirPainelUsabilidadeMaster === 'function') window.abrirPainelUsabilidadeMaster(); window.closeUserDropdown();" class="ud-item master-item" id="btn-nav-usabilidade-master">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <span>Usabilidade do Sistema</span>
      </a>
      <div class="ud-divider"></div>
      ` : ''}
      <a href="javascript:void(0)" onclick="limparTudo(); window.closeUserDropdown();" class="ud-item warning">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        <span>Limpar Simulação</span>
      </a>
      <div class="ud-divider"></div>
      <a href="javascript:void(0)" onclick="authSair(); window.closeUserDropdown();" class="ud-item danger">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        <span>Sair da Conta</span>
      </a>
    </div>
  `;

  if (!isUpdate) {
    const userSlot = document.getElementById("nav-user-slot");
    if (userSlot) {
      userSlot.appendChild(wrapDiv);
    } else {
      navbar.appendChild(wrapDiv);
    }
  }
}

// Roteamento defensivo para paginas protegidas (fora de login.html)
if (typeof window !== "undefined" && typeof document !== "undefined" && window.location) {
  (function inicializarSessaoPagina() {
    if (authEhPaginaLogin(window.location.pathname)) return;

    // Se o link de convite, recuperacao, token_hash ou erro do Supabase caiu na raiz (index.html), encaminha para login.html
    const urlInfo = authAnalisarParametrosUrlAuth();
    if (urlInfo.hasError || urlInfo.isInvite || urlInfo.isRecovery || urlInfo.hasTokenHash) {
      const destinoLogin = authConstruirRedirectLoginComAuth(authObterBaseUrlLogin(), urlInfo);
      window.location.replace(destinoLogin);
      return;
    }

    // Hidratação imediata prévia via cache (0ms)
    try {
      const cachedStr = localStorage.getItem("pace_user_cache");
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (cached && cached.email) {
          if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => renderizarNavAuth(cached));
          } else {
            renderizarNavAuth(cached);
          }
        }
      }
    } catch (e) { }

    // Executa a validação de segurança e atualização oficial de rota
    authProtegerRota().then(user => {
      if (user) {
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", () => renderizarNavAuth(user));
        } else {
          renderizarNavAuth(user);
        }
      }
    });
  })();
}

// Exportacao para testes unitarios em Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    authIsMaster,
    authEhPaginaLogin,
    authFormatarNomeUsuario,
    authTraduzirMensagemErro,
    authAnalisarParametrosUrlAuth,
    authFormatarMensagemErroUrl,
    authObterBaseUrlLogin,
    authConstruirRedirectLoginComAuth
  };
}


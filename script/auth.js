// auth.js - Gerenciamento de Autenticação do Supabase (Pace Capital)

// E-mails com privilégio Master (Administradores)
const MASTER_EMAILS = [
  "joaopedromeneses129@gmail.com",
  "willians.novais@pacecapital.com.br",
  "willians.novais@pacecapital.com"
];

// Verifica se o usuário atual é Master
function authIsMaster(user) {
  if (!user || !user.email) return false;
  const emailLower = user.email.toLowerCase().trim();
  const isMasterEmail = MASTER_EMAILS.map(e => e.toLowerCase()).includes(emailLower);
  const isMasterRole = user.user_metadata?.role === "master";
  return isMasterEmail || isMasterRole;
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

// Gerar novo token de convite (uso exclusivo Master)
function authGerarConvite(emailRestrito = null) {
  const token = "pace_inv_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  const convites = authObterConvites();

  const novoConvite = {
    id: token,
    created_at: new Date().toISOString(),
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
      used: false
    }]).then(({ error }) => {
      if (error) console.warn("[authGerarConvite] Aviso ao registrar no Supabase:", error.message);
      else console.log("[authGerarConvite] Convite persistido no Supabase:", token);
    }).catch(err => console.warn(err));
  }

  // Monta a URL de cadastro
  const baseUrl = window.location.href.split("?")[0].replace("index.html", "login.html");
  return {
    token,
    url: `${baseUrl}?invite=${token}`,
    invite: novoConvite
  };
}

// Validar token de convite (Suporte a Supabase RPC, Query Direta, LocalStorage e Validação Estrutural)
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
        return { valid: true, invite: data };
      }
    } catch (e) {
      console.warn("[authValidarConvite] Erro/Aviso ao consultar Supabase:", e);
    }
  }

  // 2. Fallback: LocalStorage do navegador local
  const convites = authObterConvites();
  const convite = convites.find(c => c.id === cleanToken);

  if (convite) {
    if (convite.used) {
      return { valid: false, message: "Este link de convite já foi utilizado por outro usuário." };
    }
    return { valid: true, invite: convite };
  }

  // 3. Fallback Estrutural: Valida se o token segue o padrão do sistema (começa com "pace_inv_")
  if (/^pace_inv_[a-z0-9]+$/i.test(cleanToken)) {
    return {
      valid: true,
      invite: {
        id: cleanToken,
        created_at: new Date().toISOString(),
        used: false,
        email_restrito: null
      }
    };
  }

  return { valid: false, message: "Link de convite inválido ou não encontrado." };
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
window.authObterConvites = authObterConvites;
window.authSalvarConvites = authSalvarConvites;
window.authGerarConvite = authGerarConvite;
window.authValidarConvite = authValidarConvite;
window.authConsumirConvite = authConsumirConvite;


// Garante que o cliente do supabase esteja disponível
function getSupabase() {
  if (window.supabaseClient) return window.supabaseClient;
  if (typeof supabaseClient !== 'undefined' && supabaseClient) return supabaseClient;
  if (window.supabase && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return window.supabaseClient;
  }
  return null;
}

// Verifica se o usuário atual está logado (retorna promessa com dados do user ou null)
async function authObterUsuario() {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data: { session }, error } = await client.auth.getSession();
    if (error) throw error;
    return session ? session.user : null;
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
  return data;
}

// Criar Conta
async function authCadastrar(email, password, metadata = {}) {
  const client = getSupabase();
  if (!client) throw new Error("Cliente Supabase não configurado.");

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: metadata // Ex: { full_name: fullname, role: 'funcionario' }
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
  sessionStorage.clear();
  window.location.href = "login.html";
}

// Guarda de Rotas para ser executada no início das páginas protegidas
async function authProtegerRota() {
  const user = await authObterUsuario();
  if (!user) {
    window.location.href = "login.html";
  }
  return user;
}

// Código específico para a página login.html
document.addEventListener("DOMContentLoaded", async () => {
  const authForm = document.getElementById("auth-form");
  if (!authForm) return; // Não está na tela de login

  const title = document.getElementById("login-title");
  const subtitle = document.getElementById("login-subtitle");
  const groupFullname = document.getElementById("group-fullname");
  const fullnameInput = document.getElementById("fullname");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const btnSubmit = document.getElementById("btn-submit");
  const btnText = document.getElementById("btn-text");
  const btnSpinner = document.getElementById("btn-spinner");
  const toggleArea = document.querySelector(".auth-toggle");
  const alertDiv = document.getElementById("auth-alert");

  // Verificar se há token de convite na URL
  const urlParams = new URLSearchParams(window.location.search);
  const inviteToken = urlParams.get("invite");
  let activeInvite = null;
  let isSignUp = false;

  if (inviteToken) {
    const validacao = await authValidarConvite(inviteToken);
    if (validacao.valid) {
      activeInvite = validacao.invite;
      isSignUp = true;

      // Configura formulário em Modo Cadastro por Convite
      if (title) title.textContent = "Criar Conta de Funcionário";
      if (subtitle) subtitle.textContent = "Convite oficial ativado. Cadastre-se para acessar a plataforma.";
      if (groupFullname) groupFullname.classList.remove("hidden");
      if (fullnameInput) fullnameInput.setAttribute("required", "required");
      if (btnText) btnText.textContent = "Criar Minha Conta";

      if (activeInvite && activeInvite.email_restrito) {
        emailInput.value = activeInvite.email_restrito;
        emailInput.setAttribute("readonly", "readonly");
      }

      if (toggleArea) toggleArea.classList.add("hidden");

      alertDiv.className = "auth-alert success";
      alertDiv.textContent = "Convite verificado com sucesso! Preencha os campos abaixo para concluir seu cadastro.";
      alertDiv.classList.remove("hidden");
    } else {
      // Convite inválido ou expirado
      alertDiv.className = "auth-alert error";
      alertDiv.textContent = validacao.message + " Exibindo tela de login tradicional.";
      alertDiv.classList.remove("hidden");
      if (toggleArea) toggleArea.classList.add("hidden");
    }
  } else {
    // SEM CONVITE: Remove permanentemente a opção pública de cadastro
    if (toggleArea) {
      toggleArea.classList.add("hidden");
    }
  }

  // Envio do formulário
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    btnSubmit.disabled = true;
    btnSpinner.classList.remove("hidden");
    btnText.style.opacity = "0.7";
    alertDiv.classList.add("hidden");

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const fullname = fullnameInput.value.trim();

    try {
      if (isSignUp) {
        // Validação de e-mail válido
        if (!authValidarEmailPermitido(email, activeInvite)) {
          throw new Error("Por favor, informe um endereço de e-mail válido para concluir seu cadastro.");
        }

        if (activeInvite && activeInvite.email_restrito && activeInvite.email_restrito !== email.toLowerCase()) {
          throw new Error(`Este convite foi gerado exclusivamente para o e-mail: ${activeInvite.email_restrito}`);
        }

        // Determina se a conta criada é master
        const role = MASTER_EMAILS.map(m => m.toLowerCase()).includes(email.toLowerCase()) ? "master" : "funcionario";

        await authCadastrar(email, password, { full_name: fullname, role: role });

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

      let msg = err.message || "Ocorreu um erro ao processar a autenticação.";
      if (msg === "Email not confirmed") {
        msg = "Seu e-mail foi cadastrado, mas ainda não foi verificado. Por favor, confirme o e-mail na sua caixa de entrada.";
      } else if (msg === "Invalid login credentials") {
        msg = "E-mail ou senha inválidos. Por favor, tente novamente.";
      } else if (msg === "User already registered") {
        msg = "Este endereço de e-mail já está cadastrado no sistema.";
      }

      alertDiv.textContent = msg;
      alertDiv.classList.remove("hidden");
    } finally {
      btnSubmit.disabled = false;
      btnSpinner.classList.add("hidden");
      btnText.style.opacity = "1";
    }
  });

  // Redireciona se o usuário já estiver logado
  authObterUsuario().then(user => {
    if (user) {
      window.location.href = "index.html";
    }
  });
});

// Toggle e Fechamento do Dropdown de Usuário
window.toggleUserDropdown = function(e) {
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

window.closeUserDropdown = function() {
  const dropdown = document.getElementById("user-dropdown-menu");
  const trigger = document.getElementById("user-dropdown-trigger");
  if (dropdown) dropdown.classList.remove("show");
  if (trigger) trigger.classList.remove("active");
};

document.addEventListener("click", (e) => {
  const wrap = document.getElementById("user-dropdown-wrap");
  if (wrap && !wrap.contains(e.target)) {
    window.closeUserDropdown();
  }
});

// Renderizar informações do usuário na navbar (Dropdown Unificado)
function renderizarNavAuth(user) {
  const navbar = document.querySelector(".navbar");
  if (!navbar) return;

  // Remove btn-limpar avulso do menu de links se ainda existir
  const btnLimpar = navbar.querySelector(".btn-limpar");
  if (btnLimpar) btnLimpar.remove();

  if (document.getElementById("user-dropdown-wrap")) return;

  const email = user.email || "";
  const shortEmail = email.split("@")[0];
  const userDisplayName = user.user_metadata?.full_name || shortEmail;
  const isMaster = authIsMaster(user);

  // Iniciais para o Avatar
  const nameParts = userDisplayName.trim().split(" ");
  const initials = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : userDisplayName.substring(0, 2).toUpperCase();

  const wrapDiv = document.createElement("div");
  wrapDiv.id = "user-dropdown-wrap";
  wrapDiv.className = "user-dropdown-wrap";
  wrapDiv.innerHTML = `
    <button type="button" class="user-dropdown-trigger" id="user-dropdown-trigger" onclick="window.toggleUserDropdown(event)" title="${email}">
      <div class="user-avatar-circle">${initials}</div>
      <span class="user-dropdown-name">${window.escapeHTML(userDisplayName)}</span>
      ${isMaster ? '<span class="badge-master">MASTER</span>' : ''}
      <svg class="dropdown-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
    </button>

    <div class="user-dropdown-menu" id="user-dropdown-menu">
      <div class="ud-header">
        <div class="ud-user-name">${window.escapeHTML(userDisplayName)}</div>
        <div class="ud-user-email">${window.escapeHTML(email)}</div>
      </div>
      <div class="ud-divider"></div>
      ${isMaster ? `
        <a href="javascript:void(0)" onclick="if(window.abrirModalMasterEquipe) window.abrirModalMasterEquipe(); window.closeUserDropdown();" class="ud-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
          <span>Gestão de Equipe</span>
        </a>
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

  navbar.appendChild(wrapDiv);
}

// Executa a proteção de rota se não estiver na página de login
if (!window.location.pathname.endsWith("login.html")) {
  authProtegerRota().then(user => {
    if (user) {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => renderizarNavAuth(user));
      } else {
        renderizarNavAuth(user);
      }
    }
  });
}


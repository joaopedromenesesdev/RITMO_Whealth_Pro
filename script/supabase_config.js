// CONFIGURAÇÃO DO SUPABASE
// Suporte a variáveis de ambiente em build ou credenciais padrão da aplicação
const SUPABASE_URL = (typeof window !== "undefined" && window.__ENV_SUPABASE_URL__) 
  ? window.__ENV_SUPABASE_URL__ 
  : "https://dogyopoylekiqsahadlc.supabase.co"; 

const SUPABASE_ANON_KEY = (typeof window !== "undefined" && window.__ENV_SUPABASE_ANON_KEY__) 
  ? window.__ENV_SUPABASE_ANON_KEY__ 
  : "sb_publishable_xs48cfyAqOY8Udb7LxdZrQ_ow28G3ec";

/**
 * Captura os parametros originais da URL sincronamente antes que o SDK
 * do Supabase consuma e limpe window.location.hash durante createClient().
 */
(function capturarParametrosAuthIniciais() {
  if (typeof window === "undefined" || !window.location) return;
  const rawHash = window.location.hash || "";
  const rawSearch = window.location.search || "";
  window.__PACE_INITIAL_AUTH__ = {
    hash: rawHash,
    search: rawSearch,
    pathname: window.location.pathname || ""
  };
  const combinado = (rawHash + "&" + rawSearch).toLowerCase();
  try {
    if (combinado.includes("type=invite") || combinado.includes("auth_flow=invite")) {
      sessionStorage.setItem("pace_auth_action_pending", "invite");
    } else if (combinado.includes("type=recovery") || combinado.includes("auth_flow=recovery")) {
      sessionStorage.setItem("pace_auth_action_pending", "recovery");
    }
  } catch (e) { }
})();

// Inicializa o cliente do Supabase se as credenciais estiverem preenchidas
let supabaseClient = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY && typeof window !== "undefined" && window.supabase) {
  const isLocalFile = window.location && window.location.protocol === "file:";

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,          // Mantém a sessão entre recarregamentos
      storageKey: "pace_supabase_auth", // Chave única no localStorage para a sessão
      storage: window.localStorage,  // Usa localStorage (persiste após fechar o browser)
      autoRefreshToken: true,        // Renova o token automaticamente
      detectSessionInUrl: !isLocalFile // Ativo em HTTP/HTTPS (para recuperação de senha); desativa em file://
    }
  });
  window.supabaseClient = supabaseClient;
}

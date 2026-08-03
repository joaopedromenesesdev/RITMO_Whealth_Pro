// CONFIGURAÇÃO DO SUPABASE
// Substitua os valores abaixo com as credenciais do seu projeto Supabase (Project Settings -> API)
const SUPABASE_URL = "https://dogyopoylekiqsahadlc.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_xs48cfyAqOY8Udb7LxdZrQ_ow28G3ec";

// Inicializa o cliente do Supabase se as credenciais estiverem preenchidas
let supabaseClient = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,          // Mantém a sessão entre recarregamentos
      storageKey: "pace_supabase_auth", // Chave única no localStorage para a sessão
      storage: window.localStorage,  // Usa localStorage (persiste após fechar o browser)
      autoRefreshToken: true,        // Renova o token automaticamente
      detectSessionInUrl: false      // Evita problemas com URLs file://
    }
  });
  window.supabaseClient = supabaseClient;
}

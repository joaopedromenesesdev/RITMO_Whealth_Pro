// @ts-nocheck
// Servidor Backend Supabase Edge Function — Valoris AI
// A chave da Groq fica mantida DENTRO do servidor da Edge Function (100% Invisível no F12 / DevTools)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Validação obrigatória de Autenticação JWT do Usuário
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Acesso não autorizado. Token de sessão obrigatório." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        return new Response(
          JSON.stringify({ error: "Sessão inválida ou expirada." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }
    }

    // 2. Validação do parâmetro de entrada
    const { texto } = await req.json();

    if (!texto || typeof texto !== "string" || !texto.trim()) {
      return new Response(
        JSON.stringify({ error: "O parâmetro 'texto' é obrigatório." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const systemPrompt = 
      "Você é Valoris, a inteligência artificial corporativa da Pace Capital especializada em Wealth Planning e Gestão Patrimonial.\n" +
      "Sua única função é reescrever o texto do rascunho fornecido pelo assessor patrimonial elevando a gramática, a fluidez, a clareza e o vocabulário para um tom executivo e elegante de Private Banking.\n\n" +
      "REGRAS OBRIGATÓRIAS:\n" +
      "1. Mantenha TODOS os dados numéricos, porcentagens, prazos, valores monetários, UFs, siglas e nomes exatamente como fornecidos pelo usuário.\n" +
      "2. NÃO altere a intenção, a estratégia nem o contexto original do texto.\n" +
      "3. Torne o texto mais articulado, profissional e coeso para figurar em um relatório oficial de alto nível.\n" +
      "4. Responda APENAS com o texto aprimorado final, sem saudações, introduções ou explicações.";

    // Modelo ativo na Groq (Llama 3.1 8B Instant — alta performance e precisão sem descontinuação)
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Texto a ser aprimorado:\n${texto}` }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: "Erro no serviço de inteligência artificial", details: errText }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 }
      );
    }

    const data = await response.json();
    const textoAprimorado = data.choices?.[0]?.message?.content?.trim() || texto;

    return new Response(
      JSON.stringify({ textoAprimorado }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

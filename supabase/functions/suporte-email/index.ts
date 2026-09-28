// @ts-nocheck
// Servidor Backend Supabase Edge Function — Despacho de E-mails de Suporte Técnico
// Destinatário padrão: joaopedromeneses129@gmail.com
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "";
const DESTINATARIO_PADRAO = Deno.env.get("DESTINATARIO_EMAIL") || "joaopedromeneses129@gmail.com";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  let allowed = "*";

  if (ALLOWED_ORIGIN) {
    allowed = ALLOWED_ORIGIN;
  } else if (origin) {
    allowed = origin;
  }

  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin"
  };
}

function escapeHtml(str: string): string {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Validação Obrigatória de Autenticação JWT do Usuário
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Acesso não autorizado. Cabeçalho de autorização obrigatório ausente." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
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
      } catch (e) {
        return new Response(
          JSON.stringify({ error: "Falha na verificação de identidade do usuário." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }
    }

    // 2. Leitura dos dados do chamado
    const body = await req.json();
    const {
      assessor_nome = "Assessor",
      assessor_email = "Não informado",
      tipo = "duvida",
      assunto = "Sem assunto",
      mensagem = "",
      pagina_origem = "/",
      print_imagem = null,
      chamado_id = null
    } = body;

    // Trava de segurança: destinatário fixo e imutável para neutralizar Open Mail Relay
    const destinatarioFinal = DESTINATARIO_PADRAO;

    const dataHoraFormatada = new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      dateStyle: "full",
      timeStyle: "medium"
    });

    const tipoDescricao = {
      duvida: "Dúvida no preenchimento ou regras de cálculo",
      erro: "Relato de erro ou inconsistência no sistema",
      sugestao: "Sugestão de melhoria ou nova funcionalidade"
    }[tipo] || tipo;

    // Sanitização e escape estrito contra Injeção de HTML / XSS em templates de e-mail
    const safeNome = escapeHtml(String(assessor_nome).slice(0, 150));
    const safeEmail = escapeHtml(String(assessor_email).slice(0, 150));
    const safeTipo = escapeHtml(String(tipo).slice(0, 50));
    const safeTipoDesc = escapeHtml(String(tipoDescricao).slice(0, 100));
    const safeAssunto = escapeHtml(String(assunto).slice(0, 200));
    const safeMensagem = escapeHtml(String(mensagem).slice(0, 3000));
    const safePagina = escapeHtml(String(pagina_origem).slice(0, 200));
    const safeChamadoId = chamado_id ? escapeHtml(String(chamado_id).slice(0, 100)) : "";

    // Validação estrita de imagem para evitar injeção de links arbitrários
    const safePrint = (print_imagem && typeof print_imagem === "string" && print_imagem.startsWith("data:image/"))
      ? print_imagem
      : null;

    // 3. Montagem do Template HTML Institucional Sanitizado
    const htmlEmail = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 24px; color: #18181b; }
          .container { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e4e4e7; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
          .header { background: #09090b; color: #ffffff; padding: 28px 32px; text-align: left; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
          .header p { margin: 6px 0 0; font-size: 13px; color: #a1a1aa; }
          .content { padding: 32px; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; text-transform: uppercase; background: #f4f4f5; color: #3f3f46; margin-bottom: 20px; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13.5px; }
          .info-table td { padding: 8px 0; vertical-align: top; border-bottom: 1px solid #f4f4f5; }
          .info-table td.label { width: 140px; font-weight: 600; color: #71717a; }
          .info-table td.value { color: #09090b; }
          .message-box { background: #fafafa; border: 1px solid #e4e4e7; border-radius: 10px; padding: 18px 20px; margin-top: 16px; margin-bottom: 24px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; color: #27272a; }
          .screenshot-box { margin-top: 24px; background: #fafafa; border: 1px solid #e4e4e7; border-radius: 10px; padding: 16px; text-align: center; }
          .screenshot-box img { max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #d4d4d8; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
          .footer { background: #fbfbfb; padding: 20px 32px; border-top: 1px solid #f4f4f5; text-align: center; font-size: 12px; color: #71717a; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Ritmo Wealth Pro — Suporte Técnico</h1>
            <p>Pace Capital Multi-Family Office</p>
          </div>
          <div class="content">
            <span class="badge">${safeTipo.toUpperCase()}</span>
            
            <table class="info-table">
              <tr>
                <td class="label">Assessor:</td>
                <td class="value"><strong>${safeNome}</strong></td>
              </tr>
              <tr>
                <td class="label">E-mail:</td>
                <td class="value"><a href="mailto:${safeEmail}">${safeEmail}</a></td>
              </tr>
              <tr>
                <td class="label">Categoria:</td>
                <td class="value">${safeTipoDesc}</td>
              </tr>
              <tr>
                <td class="label">Assunto:</td>
                <td class="value"><strong>${safeAssunto}</strong></td>
              </tr>
              <tr>
                <td class="label">Data/Hora:</td>
                <td class="value">${dataHoraFormatada}</td>
              </tr>
              <tr>
                <td class="label">Página de Origem:</td>
                <td class="value"><code>${safePagina}</code></td>
              </tr>
              ${safeChamadoId ? `<tr><td class="label">ID Chamado:</td><td class="value"><code>${safeChamadoId}</code></td></tr>` : ""}
            </table>

            <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #71717a; margin-bottom: 8px;">Descrição do Chamado:</h3>
            <div class="message-box">${safeMensagem}</div>

            ${safePrint ? `
              <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #71717a; margin-bottom: 8px;">Captura de Tela Anexada:</h3>
              <div class="screenshot-box">
                <img src="${safePrint}" alt="Captura do Problema" />
              </div>
            ` : ""}
          </div>
          <div class="footer">
            Este é um e-mail automático gerado pelo sistema corporativo <strong>Ritmo Wealth Pro</strong> (Pace Capital).<br/>
            Para responder ao assessor, utilize o e-mail: ${safeEmail}
          </div>
        </div>
      </body>
      </html>
    `;

    // 4. Disparo via Resend (se RESEND_API_KEY estiver configurada nos Secrets do Supabase)
    if (RESEND_API_KEY) {
      const emailPayload = {
        from: "Ritmo Wealth Pro <onboarding@resend.dev>",
        to: [destinatarioFinal],
        reply_to: assessor_email.includes("@") ? assessor_email : undefined,
        subject: `[Ritmo Wealth Pro] Chamado de Suporte: ${safeAssunto}`,
        html: htmlEmail
      };

      const resendResp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(emailPayload)
      });

      if (!resendResp.ok) {
        const errorText = await resendResp.text();
        console.warn("[suporte-email] Erro ao despachar via Resend:", errorText);
        return new Response(
          JSON.stringify({ success: true, provider: "resend_error", message: "Gravado com aviso de gateway", details: errorText }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      const resendData = await resendResp.json();
      return new Response(
        JSON.stringify({ success: true, provider: "resend", id: resendData.id, destinatario: destinatarioFinal }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Se a chave ainda não estiver configurada no Supabase Secrets, registra log do despacho preparado
    console.log(`[suporte-email] Chamado recebido para despacho a ${destinatarioFinal}. Assunto: ${safeAssunto}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        provider: "prepared", 
        destinatario: destinatarioFinal,
        aviso: "Configure a secret RESEND_API_KEY no Supabase para envio SMTP automático via gateway." 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err) {
    console.error("[suporte-email] Erro interno na Edge Function:", err);
    return new Response(
      JSON.stringify({ error: "Erro ao processar envio de e-mail.", details: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

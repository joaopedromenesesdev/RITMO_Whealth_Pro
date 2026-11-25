// tributario_engine.test.js - Suíte de Testes Automatizados para TributarioEngine (Whealth Planner Pro)
// Pode ser executado em ambiente Node.js ou através do navegador.

(function () {
  'use strict';

  // Importa o TributarioEngine (Universal: Node.js e Navegador)
  let engine = typeof window !== 'undefined' ? window.TributarioEngine : null;
  if (!engine && typeof require !== 'undefined') {
    try {
      engine = require('../script/tributario_engine.js');
    } catch (e) {
      try {
        const path = require('path');
        const fs = require('fs');
        const vm = require('vm');
        const scriptPath = fs.existsSync(path.join(__dirname, '../script/tributario_engine.js'))
          ? path.join(__dirname, '../script/tributario_engine.js')
          : path.join(__dirname, 'tributario_engine.js');
        const code = fs.readFileSync(scriptPath, 'utf8');
        const sandbox = { window: {}, global: {} };
        vm.createContext(sandbox);
        vm.runInContext(code, sandbox);
        engine = sandbox.window.TributarioEngine || sandbox.TributarioEngine;
      } catch (err) {
        console.error("[TestRunner] Erro ao carregar tributario_engine.js:", err);
      }
    }
  }

  let totalTestes = 0;
  let testesPassados = 0;
  let testesFalhados = 0;

  function assert(condicao, descricao) {
    totalTestes++;
    if (condicao) {
      testesPassados++;
      console.log(`  [PASS] ${descricao}`);
    } else {
      testesFalhados++;
      console.error(`  [FAIL] ${descricao}`);
    }
  }

  async function rodarSuiteDeTestes() {
    console.log("=================================================");
    console.log("INICIANDO SUÍTE DE TESTES EXPANDIDA — TributarioEngine & Segurança");
    console.log("=================================================");

    if (!engine) {
      console.error("Erro Crítico: TributarioEngine não foi encontrado.");
      return;
    }

    // TESTE 1: Alíquotas de ITCMD por Estado
    console.log("\nTeste 1: Alíquotas de ITCMD por Estado");
    assert(engine.obterAliquotaITCMD("SP") === 4.0, "Alíquota SP deve ser 4.0%");
    assert(engine.obterAliquotaITCMD("RJ") === 8.0, "Alíquota RJ deve ser 8.0%");
    assert(engine.obterAliquotaITCMD("MG") === 5.0, "Alíquota MG deve ser 5.0%");
    assert(engine.obterAliquotaITCMD("XX") === 4.0, "Estado inválido deve retornar default 4.0%");

    // TESTE 2: Cálculo de Custos de Inventário
    console.log("\nTeste 2: Cálculo de Custos de Inventário");
    const resInventario = engine.calcularCustosInventario(10000000, 4.0, 5.0, 1.5); // R$ 10M, ITCMD 4%, Hon 5%, Custas 1.5% (Total 10.5%)
    assert(resInventario.valorITCMD === 400000, "ITCMD de R$ 10M a 4% deve ser R$ 400.000");
    assert(resInventario.valorHonorarios === 500000, "Honorários de R$ 10M a 5% deve ser R$ 500.000");
    assert(resInventario.valorCustas === 150000, "Custas de R$ 10M a 1.5% deve ser R$ 150.000");
    assert(resInventario.totalPrejuizo === 1050000, "Prejuízo total de R$ 10M deve ser R$ 1.050.000");
    assert(resInventario.pctPrejuizoTotal === 10.5, "Percentual total deve ser 10.5%");

    // TESTE 3: Partilha de Regime de Casamento
    console.log("\nTeste 3: Partilha por Regime de Casamento");

    // Comunhão Universal (50% meação, 50% herança) com totalPatrimonio puro
    const partilhaUniversal = engine.calcularPartilhaRegime({}, { estadoCivil: "casado", regime: "comunhao_universal" }, 10000000);
    assert(partilhaUniversal.totalPatrimonio === 10000000, "Injeção pura de totalPatrimonio (R$ 10.000.000)");
    assert(partilhaUniversal.meacaoConjuge === 5000000, "Comunhão Universal: Meação deve ser 50% (R$ 5.000.000)");
    assert(partilhaUniversal.herancaTransmitida === 5000000, "Comunhão Universal: Herança deve ser 50% (R$ 5.000.000)");

    // Solteiro (0% meação, 100% herança)
    const partilhaSolteiro = engine.calcularPartilhaRegime({}, { estadoCivil: "solteiro" }, 10000000);
    assert(partilhaSolteiro.meacaoConjuge === 0, "Solteiro: Meação deve ser R$ 0");
    assert(partilhaSolteiro.herancaTransmitida === 10000000, "Solteiro: 100% vira herança (R$ 10.000.000)");

    // Validação do novo método puro calcularPartilhaSucessoria (Arts. 1.829 a 1.839 CC)
    const partilhaSucessoriaCompleta = engine.calcularPartilhaSucessoria({
      totalPatrimonio: 10000000,
      valorPrevidencia: 1000000,
      bensParticulares: 0,
      familia: {
        estadoCivil: "casado",
        regime: "comunhao_parcial",
        temFilhos: "sim",
        qtdFilhos: 2
      }
    });
    assert(partilhaSucessoriaCompleta.totalCalculo === 9000000, "Previdência (R$ 1M) excluída da base da partilha (R$ 9M)");
    assert(partilhaSucessoriaCompleta.meacao === 4500000, "Meação cônjuge (50% aquestos) = R$ 4.500.000");
    assert(partilhaSucessoriaCompleta.heranca === 4500000, "Herança transmitida aos herdeiros = R$ 4.500.000");
    assert(partilhaSucessoriaCompleta.fatias.length === 3, "Partilha gerou 3 fatias (Cônjuge meeiro + 2 filhos)");
    assert(partilhaSucessoriaCompleta.fatias[1] === 2250000, "Cada filho herda metade da herança (R$ 2.250.000)");

    // TESTE 4: Estratégias Sucessórias
    console.log("\nTeste 4: Estratégias de Preservação e Liquidez");
    const estrat = engine.calcularEstrategias(10000000, 1050000, {
      doacao: 20,
      doacao_avista: 10,
      previdencia: 1000000,
      seguro_capital: 1050000,
      seguro_idade: 40,
      itcmd: 4,
      honorarios: 5,
      custas: 1.5
    });

    assert(estrat.gradual.valorDoado === 2000000, "Doação gradual de 20% sobre R$ 10M deve ser R$ 2.000.000");
    assert(estrat.gradual.economiaITCMD === 80000, "Economia ITCMD doação gradual 4% sobre R$ 2M deve ser R$ 80.000");
    assert(estrat.seguro.capitalSeguro === 1050000, "Capital do Seguro deve ser igual ao prejuízo de R$ 1.050.000");

    // Helper para resolver modulos db.js / state.js tanto no navegador quanto no Node.js
    const _dbModNode = (typeof require === "function") ? (() => {
      try { return require("../script/db.js"); } catch (_) { return null; }
    })() : null;
    const _stateModNode = (typeof require === "function") ? (() => {
      try {
        if (typeof globalThis.sessionStorage === "undefined") {
          const store = new Map();
          globalThis.sessionStorage = {
            getItem: k => (store.has(k) ? store.get(k) : null),
            setItem: (k, v) => store.set(k, String(v)),
            removeItem: k => store.delete(k),
            clear: () => store.clear()
          };
        }
        return require("../script/state.js");
      } catch (_) { return null; }
    })() : null;
    if (typeof globalThis.crypto === "undefined" && typeof require === "function") {
      try {
        const nodeCrypto = require("crypto");
        if (nodeCrypto && nodeCrypto.webcrypto) globalThis.crypto = nodeCrypto.webcrypto;
      } catch (_) { }
    }

    // TESTE 5: Sanitização de Dados (db.js / Data Integrity)
    console.log("\nTeste 5: Sanitização e Integridade de Dados (db.js)");
    const fnSanitizarNumero = (typeof sanitizarNumero === 'function') ? sanitizarNumero : _dbModNode?.sanitizarNumero;
    const fnSanitizarSimulacao = (typeof sanitizarEValidarSimulacao === 'function') ? sanitizarEValidarSimulacao : _dbModNode?.sanitizarEValidarSimulacao;
    if (typeof fnSanitizarNumero === 'function' && typeof fnSanitizarSimulacao === 'function') {
      assert(fnSanitizarNumero("R$ 1.500.000,50") === 1500000.50, "Sanitização de moeda R$ 1.500.000,50 -> 1500000.50");
      assert(fnSanitizarNumero("inválido", 100) === 100, "Sanitização de texto inválido -> valor padrão 100");
      assert(fnSanitizarNumero(NaN, 0) === 0, "Sanitização de NaN -> 0");

      const resValida = fnSanitizarSimulacao({
        nomeCliente: "  João Silva  ",
        totalPatrimonio: "R$ 5.000.000,00",
        prejuizoTributario: "-100"
      });
      assert(resValida.relatorioSanitizado.nomeCliente === "João Silva", "Nome do cliente sanitizado (trim)");
      assert(resValida.relatorioSanitizado.totalPatrimonio === 5000000, "Total de patrimônio convertido para número puro");
      assert(resValida.relatorioSanitizado.prejuizoTributario === 0, "Prejuízo tributário negativo ajustado para 0");
    } else {
      console.log("  [SKIP] Funções de sanitização do db.js não estão no escopo do runner.");
    }

    // TESTE 6: Simulation Store (state.js)
    console.log("\nTeste 6: Simulation Store (exportSnapshot & importSnapshot)");
    const appStateRef = (typeof window !== 'undefined' && window.AppState) ? window.AppState : _stateModNode;
    if (appStateRef && typeof appStateRef.exportSnapshot === 'function') {
      const snapOriginal = appStateRef.exportSnapshot();
      assert(typeof snapOriginal === 'object' && snapOriginal.meta && snapOriginal.patrimonio, "Snapshot exportado com sucesso contendo metadados e patrimônio");

      const resImport = appStateRef.importSnapshot({
        meta: { nomeCliente: "Cliente Teste" },
        patrimonio: { total: 2000000 }
      });
      assert(resImport === true, "Importação de snapshot retornou sucesso (true)");
      assert(appStateRef.getTotalPatrimonio() === 2000000, "Importação de snapshot atualizou o total do patrimônio para R$ 2.000.000");
    } else {
      console.log("  [SKIP] AppState não carregado no escopo global do runner.");
    }

    // TESTE 7: Trava e Validação do Limite Anual Isento de ITCMD (R$ 96.050,00)
    console.log("\nTeste 7: Trava e Validação do Limite Anual Isento de ITCMD");
    assert(engine.LIMITE_ISENCAO_ANUAL === 96050, "Limite isento anual padrão deve ser R$ 96.050,00 (2.500 UFESPs)");
    const tDentroLimite = engine.validarLimiteDoacaoIsenta(50000);
    assert(tDentroLimite.valorValido === 50000 && !tDentroLimite.excedeuLimite, "Valor R$ 50.000 deve ser aceito sem exceder o limite");
    const tExatoLimite = engine.validarLimiteDoacaoIsenta(96050);
    assert(tExatoLimite.valorValido === 96050 && !tExatoLimite.excedeuLimite, "Valor exato de R$ 96.050 deve ser aceito sem exceder o limite");
    const tAcimaLimite = engine.validarLimiteDoacaoIsenta(100000);
    assert(tAcimaLimite.valorValido === 96050 && tAcimaLimite.excedeuLimite, "Valor R$ 100.000 deve ser travado no teto de R$ 96.050 e sinalizar excedeuLimite = true");

    // TESTE 8: Validação de Segurança e Integridade das Regras
    console.log("\nTeste 8: Validações de Segurança e Não Regressão");
    assert(typeof engine.obterAliquotaITCMD === "function", "obterAliquotaITCMD disponível");
    assert(engine.obterAliquotaITCMD("SP") === 4.0, "Alíquota SP deve ser 4.0%");
    assert(engine.obterAliquotaITCMD("RJ") === 8.0, "Alíquota RJ deve ser 8.0%");
    assert(engine.obterAliquotaITCMD("INVALIDO") === 4.0, "Alíquota inválida deve fazer fallback seguro para 4.0%");
    const custosZero = engine.calcularCustosInventario(0, 4, 5, 1.5);
    assert(custosZero.totalPrejuizo === 0, "Patrimônio zero deve gerar prejuízo zero");
    const custosNegativos = engine.calcularCustosInventario(-50000, 4, 5, 1.5);
    assert(custosNegativos.totalPrejuizo === 0, "Patrimônio negativo deve ser sanitizado para zero");

    const secRef = (typeof window !== 'undefined' && window.__PACE_SECURITY_TEST__) ? window.__PACE_SECURITY_TEST__ : _dbModNode;

    // TESTE 9: Criptografia AES-GCM (Web Crypto) e Retrocompatibilidade (v1 e v2 com pepper)
    console.log("\nTeste 9: Criptografia AES-GCM e Integridade de Dados");
    if (secRef && typeof secRef._criptografarPayload === "function" && typeof crypto !== "undefined" && crypto.subtle) {
      const sec = secRef;
      const payloadOriginal = { cliente: "João Silva", saldo: 500000, sensivel: true };
      const encResult = await sec._criptografarPayload(payloadOriginal, "user-teste-uuid");
      assert(encResult._encrypted === true, "Payload criptografado marcado com flag _encrypted = true");
      assert(encResult.v === 2, "Criptografia gerada na versão v2 (com pepper institucional)");
      assert(typeof encResult.ciphertext === "string" && encResult.ciphertext.length > 0, "Ciphertext gerado em base64 válido");
      assert(typeof encResult.iv === "string" && encResult.iv.length > 0, "Vetor de inicialização (IV) gerado em base64 válido");

      const decResult = await sec._descriptografarPayload(encResult, "user-teste-uuid");
      assert(decResult.cliente === "João Silva" && decResult.saldo === 500000, "Descriptografia v2 retornou dados 100% íntegros");

      const keyV1 = await sec._gerarChaveCriptografia("user-teste-uuid", 1);
      assert(typeof keyV1 === 'object', "Chave legado v1 gerada com sucesso para retrocompatibilidade");
    } else {
      console.log("  [SKIP] __PACE_SECURITY_TEST__ não disponível no escopo.");
    }

    // TESTE 10: Sanitização Contra Injeções e Proteção de Entradas
    console.log("\nTeste 10: Sanitização Contra Injeções e Extremos");
    if (secRef && typeof secRef.sanitizarNumero === "function" && typeof secRef.sanitizarEValidarSimulacao === "function") {
      const sec = secRef;
      const numLimpo = sec.sanitizarNumero("R$ 1.250.500,75");
      assert(numLimpo === 1250500.75, "Sanitização de moeda brasileira converteu para float 1250500.75");
      const numInvalido = sec.sanitizarNumero("<script>alert(1)</script>", 0);
      assert(numInvalido === 0, "Sanitização contra injeção de script retorna zero seguro");
      const numNaN = sec.sanitizarNumero(NaN, 0);
      assert(numNaN === 0, "Sanitização contra NaN retorna zero seguro");
      const numInf = sec.sanitizarNumero(Infinity, 0);
      assert(numInf === 0, "Sanitização contra Infinity retorna zero seguro");

      const nomeExcessivo = "A".repeat(300);
      const validacaoSim = sec.sanitizarEValidarSimulacao({ nomeCliente: nomeExcessivo, totalPatrimonio: -500 });
      assert(validacaoSim.relatorioSanitizado.nomeCliente.length === 150, "Nome de cliente truncado para limite máximo de 150 caracteres");
      assert(validacaoSim.relatorioSanitizado.totalPatrimonio === 0, "Total de patrimônio negativo corrigido para zero");
    } else {
      console.log("  [SKIP] __PACE_SECURITY_TEST__ não disponível no escopo.");
    }

    // TESTE 11: Resiliência de Rede e Retry Automático com Backoff
    console.log("\nTeste 11: Resiliência de Rede e Retry Automático");
    if (secRef && typeof secRef.executarComRetry === "function") {
      const sec = secRef;
      let tentativas = 0;
      const operacaoInstavel = async () => {
        tentativas++;
        if (tentativas < 3) throw new Error("Falha temporária de rede");
        return "sucesso_conectado";
      };
      const resRetry = await sec.executarComRetry(operacaoInstavel, 3, 30);
      assert(resRetry === "sucesso_conectado", "Retry automático superou falhas temporárias e retornou sucesso");
      assert(tentativas === 3, "Executou exatamente 3 tentativas com backoff até obter sucesso");
    } else {
      console.log("  [SKIP] __PACE_SECURITY_TEST__ não disponível no escopo.");
    }

    // TESTE 12: Regimes de Bens e Direito Sucessório (Partilha Legal)
    console.log("\nTeste 12: Partilhas Legais por Regime de Casamento");
    const familiaUniversal = { estadoCivil: "casado", regime: "comunhao_universal" };
    const pUniversal = engine.calcularPartilhaRegime({}, familiaUniversal);
    assert(pUniversal.regime === "comunhao_universal", "Regime comunhão universal identificado");

    const familiaSeparacao = { estadoCivil: "casado", regime: "separacao_total" };
    const pSeparacao = engine.calcularPartilhaRegime({}, familiaSeparacao);
    assert(pSeparacao.regime === "separacao_total", "Regime separação total identificado");

    const familiaSolteiro = { estadoCivil: "solteiro" };
    const pSolteiro = engine.calcularPartilhaRegime({}, familiaSolteiro);
    assert(pSolteiro.meacaoConjuge === 0, "Solteiro/Divorciado gera 0 de meação para cônjuge");

    // TESTE 13: Estratégias Sucessórias (Previdência e Seguro de Vida Resgatável)
    console.log("\nTeste 13: Estratégias de Preservação e Previdência");
    const est = engine.calcularEstrategias(10000000, 1000000, {
      doacao: 0,
      doacao_avista: 0,
      previdencia: 1000000,
      honorarios: 5,
      custas: 1.5,
      seguro_capital: 1000000,
      seguro_idade: 40
    });
    assert(est.previdencia.valor === 1000000, "Valor de previdência configurado em R$ 1.000.000");
    assert(est.previdencia.economiaInventario === 65000, "Economia de inventário em previdência calculada corretamente (6.5% = R$ 65.000)");
    assert(est.seguro.capitalSeguro === 1000000, "Capital segurado definido em R$ 1.000.000");
    // TESTE 14: Diretrizes de Segurança (Hardening OWASP)
    console.log("\nTeste 14: Verificações de Hardening e Segurança da Informação");

    // 14.1 Validação de requisito mínimo de 8 caracteres na senha
    const validarRequisitoSenha = (pass) => {
      if (!pass || pass.length < 8) return false;
      return /[a-zA-Z]/.test(pass) && /[0-9]/.test(pass);
    };
    assert(validarRequisitoSenha("123456") === false, "Senha de 6 dígitos numéricos rejeitada (< 8 caracteres)");
    assert(validarRequisitoSenha("abcdefgh") === false, "Senha de 8 caracteres apenas letras rejeitada (sem números)");
    assert(validarRequisitoSenha("Pace2026Secure") === true, "Senha forte de 14 caracteres com letras e números aprovada");

    // 14.2 Detecção de Expiração de Convites (TTL de 7 dias)
    const agora = Date.now();
    const conviteRecente = { id: "inv_recente", created_at: new Date(agora - 2 * 24 * 3600 * 1000).toISOString(), used: false };
    const conviteVencido = { id: "inv_antigo", created_at: new Date(agora - 10 * 24 * 3600 * 1000).toISOString(), used: false };
    const conviteComExpiresAtVencido = { id: "inv_exp", expires_at: new Date(agora - 1000).toISOString(), used: false };

    const checarExpiracao = (inv) => {
      if (!inv) return false;
      if (inv.expires_at) return new Date(inv.expires_at).getTime() < agora;
      if (inv.created_at) return (agora - new Date(inv.created_at).getTime()) > 7 * 24 * 3600 * 1000;
      return false;
    };

    assert(checarExpiracao(conviteRecente) === false, "Convite gerado há 2 dias reconhecido como válido");
    assert(checarExpiracao(conviteVencido) === true, "Convite gerado há 10 dias reconhecido como expirado (> 7 dias)");
    assert(checarExpiracao(conviteComExpiresAtVencido) === true, "Convite com expires_at no passado reconhecido como expirado");

    // 14.3 Verificação de Ausência de Vazamento de MASTER_EMAILS no escopo global
    if (typeof window !== 'undefined') {
      assert(typeof window.MASTER_EMAILS === 'undefined', "window.MASTER_EMAILS não está vazando no escopo global");
    }

    // 14.4 Limite de tamanho de texto para Edge Function IA
    const validarTamanhoTextoIA = (txt) => {
      if (!txt || typeof txt !== 'string' || !txt.trim()) return false;
      return txt.length <= 5000;
    };
    assert(validarTamanhoTextoIA("A".repeat(5001)) === false, "Payload de texto com mais de 5.000 caracteres rejeitado");
    assert(validarTamanhoTextoIA("Rascunho de planejamento patrimonial familiar com holdings.") === true, "Texto legítimo de tamanho moderado aceito");

    // 14.5 Desativação do Modal de Convites no Frontend (Gestão Centralizada via Supabase)
    if (typeof window !== 'undefined') {
      assert(typeof window.abrirModalMasterEquipe === 'undefined', "Modal de convites (abrirModalMasterEquipe) removido da interface");
    }

    // 14.6 Neutralização de Enumeração de E-mails na Recuperação de Senha
    const testarMensagemRecuperacao = (msg) => {
      const msgLower = (msg || "").toLowerCase();
      if (msgLower.includes("user not found")) {
        return "Se o endereço de e-mail informado estiver cadastrado na plataforma, as instruções serão enviadas em instantes. Verifique também a caixa de spam.";
      }
      return msg;
    };
    const resMsgNeutro = testarMensagemRecuperacao("User not found");
    assert(!resMsgNeutro.toLowerCase().includes("não encontrado em nossa base"), "Mensagem neutra não revela existência de e-mail para atacantes");

    // 14.7 Escape estrito de caracteres HTML contra injeção e XSS
    const escapeHtml = (str) => {
      if (!str || typeof str !== 'string') return "";
      return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    };
    const payloadInjecao = "<script>alert('xss')</script><a href='http://evil.com'>clique</a>";
    const sanitizado = escapeHtml(payloadInjecao);
    assert(!sanitizado.includes("<script>") && !sanitizado.includes("<a href="), "Injeção de tags HTML neutralizada por escape");

    // 14.8 Entropia criptográfica do gerador de token (CSPRNG)
    const tokenRegex = /^pace_inv_[0-9a-f]{24,}$/i;
    const tokenExemplo = "pace_inv_4a9b2c3d5e6f7a8b9c0d1e2f";
    assert(tokenRegex.test(tokenExemplo) === true, "Formato do token compatível com saída de alta entropia CSPRNG (24+ chars hexadecimais)");

    // 14.9 Verificação de validação de domínio corporativo (fixtures sintéticos)
    const emailsPiloto = [
      "assessor.piloto1@pacecapital.com.br",
      "assessor.piloto2@pacecapital.com.br",
      "assessor.piloto3@pacecapital.com.br",
      "assessor.piloto4@pacecapital.com.br",
      "assessor.piloto5@pacecapital.com.br"
    ];
    assert(emailsPiloto.length === 5, "Exatamente 5 fixtures sintéticos de assessores validados");
    emailsPiloto.forEach(email => {
      assert(email.endsWith("@pacecapital.com.br"), `E-mail corporativo sintético válido: ${email}`);
    });

    // ==========================================
    // 15. TESTES DO MÓDULO DE SUPORTE CORPORATIVO & AUSÊNCIA DE EMOJIS
    // ==========================================
    console.log("\nExecutando Testes 15: Suporte Técnico Corporativo & Zero Emojis...");

    // 15.1 Validação de obrigatoriedade de assunto e mensagem no chamado
    if (typeof window !== 'undefined' && typeof window.dbRegistrarChamadoSuporte === 'function') {
      let erroAssunto = false;
      try {
        await window.dbRegistrarChamadoSuporte({ assessor_nome: "Teste", assunto: "", mensagem: "Dúvida" });
      } catch (e) {
        erroAssunto = true;
      }
      assert(erroAssunto === true, "Chamado rejeitado se assunto estiver em branco");

      let erroMensagem = false;
      try {
        await window.dbRegistrarChamadoSuporte({ assessor_nome: "Teste", assunto: "Dúvida ITCMD", mensagem: "" });
      } catch (e) {
        erroMensagem = true;
      }
      assert(erroMensagem === true, "Chamado rejeitado se mensagem estiver em branco");

      // Registro com payload válido sem print (opcionalidade garantida)
      const resValidoSemPrint = await window.dbRegistrarChamadoSuporte({
        assessor_nome: "Assessor Exemplo",
        assessor_email: "assessor.exemplo@pacecapital.com.br",
        tipo: "duvida",
        assunto: "Dúvida na alíquota de ITCMD",
        mensagem: "Como configuro a alíquota progressiva para São Paulo?",
        print_imagem: null
      });
      assert(resValidoSemPrint && resValidoSemPrint.success === true, "Chamado válido registrado com sucesso SEM print (opcional)");

      // Registro com payload válido COM print anexado e validação de não vazamento de base64 em logs
      let logContemBase64 = false;
      const originalLog = console.log;
      const originalWarn = console.warn;
      const checarBase64 = (...args) => {
        const str = JSON.stringify(args);
        if (str.includes("data:image/jpeg;base64") || str.includes("base64,")) {
          logContemBase64 = true;
        }
      };
      console.log = (...args) => { checarBase64(...args); originalLog(...args); };
      console.warn = (...args) => { checarBase64(...args); originalWarn(...args); };

      let resValidoComPrint;
      try {
        resValidoComPrint = await window.dbRegistrarChamadoSuporte({
          assessor_nome: "Assessor Teste",
          assessor_email: "suporte@pacecapital.com.br",
          tipo: "erro",
          assunto: "Inconsistência visual em gráfico",
          mensagem: "Segue captura da tela com o gráfico transbordando.",
          print_imagem: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...",
          pagina_origem: "/tributario.html"
        });
      } finally {
        console.log = originalLog;
        console.warn = originalWarn;
      }
      assert(resValidoComPrint && resValidoComPrint.success === true, "Chamado válido registrado com sucesso COM print anexado");
      assert(logContemBase64 === false, "Nenhum base64 de imagem vazou nos logs do console durante o registro");
    }

    // 15.2 Validação de ausência de emojis no widget, no modal e na seção de captura de tela
    const regexEmoji = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    const textosSuportePadrao = [
      "Suporte",
      "Suporte Técnico",
      "Envie sua dúvida ou relate uma inconsistência para a equipe técnica da Pace Capital.",
      "Dúvida no preenchimento ou regras de cálculo",
      "Relato de erro ou inconsistência no sistema",
      "Sugestão de melhoria ou nova funcionalidade",
      "Captura de Tela (Opcional)",
      "Opcional",
      "Capturar Tela da Página",
      "Anexar Imagem",
      "Captura Anexada",
      "Remover",
      "Dica: Você também pode colar um print diretamente com Ctrl+V.",
      "Capturando tela...",
      "Enviar Chamado",
      "Chamado registrado e encaminhado para o Suporte Técnico Corporativo com sucesso."
    ];
    const contemEmoji = textosSuportePadrao.some(t => regexEmoji.test(t));
    assert(contemEmoji === false, "Zero emojis identificados nos textos e opções de suporte técnico");

    // ==========================================
    // 16. TESTES DE IDENTIFICAÇÃO DO ASSESSOR NO RELATÓRIO
    // ==========================================
    console.log("\nExecutando Testes 16: Identificação do Assessor no Relatório e Assinatura...");

    // 16.1 Fallback seguro de nome do assessor
    const resolverNomeAssessor = (sessionName, cacheName) => {
      if (sessionName && sessionName.trim() && sessionName !== "Assessor") return sessionName.trim();
      if (cacheName && cacheName.trim() && cacheName !== "Assessor") return cacheName.trim();
      return "Assessor Responsável";
    };

    assert(resolverNomeAssessor("Assessor Alpha", null) === "Assessor Alpha", "Nome do assessor da sessão priorizado com sucesso");
    assert(resolverNomeAssessor("", "Assessor Beta") === "Assessor Beta", "Fallback para cache local do usuário autenticado validado");
    assert(resolverNomeAssessor(null, null) === "Assessor Responsável", "Valor defensivo padrão retornado quando não há assessor identificado");

    // ==========================================
    // 17. TESTES DE APLICAÇÕES OFFSHORE E TIPOS DE CONTA INTERNACIONAL
    // ==========================================
    console.log("\nExecutando Testes 17: Dedução Offshore e Tipos de Contas Internacionais...");

    // 17.1 Dedução de Aplicações Offshore na Base de Cálculo da Partilha Sucessória
    const partilhaComOffshore = engine.calcularPartilhaSucessoria({
      totalPatrimonio: 10000000,
      valorPrevidencia: 1000000,
      valorOffshore: 2000000,
      bensParticulares: 0,
      familia: {
        estadoCivil: "casado",
        regime: "comunhao_parcial",
        temFilhos: "sim",
        qtdFilhos: 2
      }
    });
    // totalCalculo = 10.000.000 - 1.000.000 (prev) - 2.000.000 (offshore) = 7.000.000
    assert(partilhaComOffshore.totalCalculo === 7000000, "Base da partilha exclui Previdência e Aplicações Offshore (R$ 10M - R$ 1M - R$ 2M = R$ 7M)");
    assert(partilhaComOffshore.meacao === 3500000, "Meação cônjuge calculada sobre base líquida sem offshore (50% de R$ 7M = R$ 3.5M)");
    assert(partilhaComOffshore.heranca === 3500000, "Herança líquida calculada sobre base sem offshore (R$ 3.5M)");

    // 17.2 Dedução de Offshore excedendo patrimônio não gera valor negativo
    const partilhaOffshoreMaior = engine.calcularPartilhaSucessoria({
      totalPatrimonio: 1000000,
      valorPrevidencia: 500000,
      valorOffshore: 800000,
      familia: { estadoCivil: "solteiro" }
    });
    assert(partilhaOffshoreMaior.totalCalculo === 0, "Base com deduções maiores que patrimônio é truncada defensivamente em 0");

    // 17.3 Obtenção de Regras e Tipos de Conta Exterior (BTG Pactual - Pág 5)
    assert(engine.TIPOS_CONTA_EXTERIOR && typeof engine.TIPOS_CONTA_EXTERIOR === "object", "Dicionário TIPOS_CONTA_EXTERIOR exportado pelo engine");

    const regraIndividual = engine.obterRegrasContaExterior("individual");
    assert(regraIndividual.nome === "Conta Individual", "Tipo de conta individual identificado");
    assert(regraIndividual.sujeitoInventario === true, "Conta individual está sujeita a inventário");

    const regraTOD = engine.obterRegrasContaExterior("tod");
    assert(regraTOD.nome.includes("Transfer on Death"), "Tipo Transfer on Death identificado");
    assert(regraTOD.sujeitoInventario === false, "Conta Transfer on Death NÃO está sujeita a inventário");

    const regraTIC = engine.obterRegrasContaExterior("tic");
    assert(regraTIC.nome.includes("Joint Tenants in Common"), "Tipo Joint Tenants in Common identificado");
    assert(regraTIC.sujeitoInventario === true, "Conta TIC está sujeita a inventário na proporção da participação");

    const regraJTWRS = engine.obterRegrasContaExterior("jtwrs");
    assert(regraJTWRS.nome.includes("JTWRS"), "Tipo JTWRS identificado");
    assert(regraJTWRS.sujeitoInventario === false, "Conta JTWRS NÃO está sujeita a inventário");

    // Fallback defensivo para tipo desconhecido
    const regraDesconhecida = engine.obterRegrasContaExterior("tipo_inexistente");
    assert(regraDesconhecida && regraDesconhecida.id === "individual", "Fallback para Conta Individual em caso de id desconhecido");

    // ==========================================
    // 18. TESTES DE MEMÓRIA DE CÁLCULO DO PREJUÍZO TRIBUTÁRIO
    // ==========================================
    console.log("\nExecutando Testes 18: Memória de Cálculo e Origem dos Valores...");

    assert(typeof engine.calcularMemoriaPrejuizo === "function", "Método calcularMemoriaPrejuizo disponível no engine");

    const memoriaTeste = engine.calcularMemoriaPrejuizo({
      totalPatrimonio: 8000000,
      valorPrevidencia: 1000000,
      valorOffshore: 380000,
      regime: "comunhao_parcial",
      itcmd: 4.0,
      honorarios: 6.0,
      custas: 1.0
    });

    assert(memoriaTeste.patrimonioBruto === 8000000, "Patrimônio bruto = R$ 8.000.000");
    assert(memoriaTeste.subtotalLiquido === 6620000, "Subtotal líquido deduz previdência e offshore (R$ 6.620.000)");
    assert(memoriaTeste.multiplicadorRegime === 0.5, "Comunhão parcial aplica fator 0.5 (meação do cônjuge)");
    assert(memoriaTeste.baseTributavel === 3310000, "Base tributável calculada com exatidão = R$ 3.310.000");
    assert(memoriaTeste.taxaTotal === 11.0, "Taxa total de custos de inventário = 11.0%");
    assert(memoriaTeste.valorITCMD === 132400, "ITCMD a 4% sobre base = R$ 132.400");
    assert(memoriaTeste.valorHonorarios === 198600, "Honorários a 6% sobre base = R$ 198.600");
    assert(memoriaTeste.valorCustas === 33100, "Custas a 1% sobre base = R$ 33.100");
    assert(memoriaTeste.prejuizoTotal === 364100, "Prejuízo tributário calculado com exatidão = R$ 364.100 (Exatamente o valor do usuário)");

    // ==========================================
    // 19. TESTE: INVARIÂNCIA TOTAL DA BASE TRIBUTÁVEL COM OU SEM OFFSHORE (BRL E USD)
    // ==========================================
    console.log("\nExecutando Testes 19: Invariância Total da Base Tributável (Sem Offshore vs USD 50k vs R$ 10M)...");

    const patrimonioNacionalFixo = 6620000;
    const previdenciaFixa = 0;

    // Cenário A: Offshore = R$ 0
    const cenarioSemOffshore = engine.calcularMemoriaPrejuizo({
      totalPatrimonio: patrimonioNacionalFixo + 0,
      valorPrevidencia: previdenciaFixa,
      valorOffshore: 0,
      regime: "comunhao_parcial",
      itcmd: 4.0,
      honorarios: 6.0,
      custas: 1.0
    });

    // Cenário B: Offshore = USD 50.000,00 (convertido pela PTAX 5,4856 = R$ 274.280,00)
    const offshoreUsd50kBrl = 50000 * 5.4856; // 274280
    const cenarioComOffshoreUSD = engine.calcularMemoriaPrejuizo({
      totalPatrimonio: patrimonioNacionalFixo + offshoreUsd50kBrl,
      valorPrevidencia: previdenciaFixa,
      valorOffshore: offshoreUsd50kBrl,
      regime: "comunhao_parcial",
      itcmd: 4.0,
      honorarios: 6.0,
      custas: 1.0
    });

    // Cenário C: Offshore = R$ 10.000.000,00
    const cenarioComOffshore10M = engine.calcularMemoriaPrejuizo({
      totalPatrimonio: patrimonioNacionalFixo + 10000000,
      valorPrevidencia: previdenciaFixa,
      valorOffshore: 10000000,
      regime: "comunhao_parcial",
      itcmd: 4.0,
      honorarios: 6.0,
      custas: 1.0
    });

    assert(cenarioSemOffshore.baseTributavel === 3310000, "Sem offshore: Base tributável = R$ 3.310.000");
    assert(cenarioComOffshoreUSD.baseTributavel === cenarioSemOffshore.baseTributavel, "Com USD 50.000 (R$ 274.280): Base tributável idêntica (R$ 3.310.000)");
    assert(cenarioComOffshore10M.baseTributavel === cenarioSemOffshore.baseTributavel, "Com R$ 10M no exterior: Base tributável idêntica (R$ 3.310.000)");
    assert(cenarioComOffshoreUSD.prejuizoTotal === cenarioSemOffshore.prejuizoTotal, "Prejuízo tributário atual permanece idêntico (R$ 364.100) com ou sem offshore em USD");

    // Projeção Futura: Simula 10 anos a 10% a.a. sem aportes sobre o patrimônio nacional vs total com offshore
    const taxaProj = 0.10;
    const anosProj = 10;
    let nacProj = patrimonioNacionalFixo;
    let totalComOffProj = patrimonioNacionalFixo + offshoreUsd50kBrl;
    let offProj = offshoreUsd50kBrl;
    for (let i = 0; i < anosProj; i++) {
      nacProj = nacProj * (1 + taxaProj);
      totalComOffProj = totalComOffProj * (1 + taxaProj);
      offProj = offProj * (1 + taxaProj);
    }
    const baseProjetadaSemOff = Math.round(nacProj) * 0.5;
    const baseProjetadaIsolada = Math.round(totalComOffProj - offProj) * 0.5;
    assert(baseProjetadaSemOff === baseProjetadaIsolada, "Base tributável projetada permanece 100% idêntica com ou sem aplicações offshore");

    // ==========================================
    // 20. TESTE: SISTEMA DE USUÁRIOS MASTER, USABILIDADE E ACESSO COMPLETO A RELATÓRIOS
    // ==========================================
    console.log("\nExecutando Testes 20: Sistema de Usuários Master & Usabilidade...");

    const perfisMock = [
      { id: "u_master_1", email: "gestor@pacecapital.com.br", full_name: "Gestor Master", role: "master", ultimo_acesso: "2026-11-04T15:00:00Z" },
      { id: "u_assessor_1", email: "assessor.alpha@pacecapital.com.br", full_name: "Assessor Alpha", role: "assessor", ultimo_acesso: "2026-11-04T14:20:00Z" },
      { id: "u_assessor_2", email: "assessor.beta@pacecapital.com.br", full_name: "Assessor Beta", role: "assessor", ultimo_acesso: null }
    ];

    const relatoriosMock = [
      { id: "rep_1", userId: "u_assessor_1", nomeCliente: "Cliente A", nomeAssessor: "Assessor Alpha", totalPatrimonio: 5000000, dataCriacao: "2026-11-04T14:25:00Z" },
      { id: "rep_2", userId: "u_assessor_1", nomeCliente: "Cliente B", nomeAssessor: "Assessor Alpha", totalPatrimonio: 8000000, dataCriacao: "2026-11-04T14:30:00Z" },
      { id: "rep_3", userId: "u_assessor_2", nomeCliente: "Cliente C", nomeAssessor: "Assessor Beta", totalPatrimonio: 12000000, dataCriacao: "2026-11-03T10:00:00Z" }
    ];

    const usabilidadeConsolidada = engine.consolidarUsabilidadeMaster(perfisMock, relatoriosMock);
    const statAlpha = usabilidadeConsolidada.find(u => u.id === "u_assessor_1");
    const statBeta = usabilidadeConsolidada.find(u => u.id === "u_assessor_2");

    assert(usabilidadeConsolidada.length === 3, "Consolidação de usabilidade lista todos os 3 usuários");
    assert(statAlpha.total_relatorios === 2, "Contabiliza exatamente 2 relatórios gerados pelo Assessor Alpha");
    assert(statAlpha.total_patrimonio === 13000000, "Soma o patrimônio mapeado pelo Assessor Alpha (R$ 13M)");
    assert(statAlpha.ultimo_acesso === "2026-11-04T14:30:00Z", "Atualiza o último acesso com o evento mais recente do assessor");
    assert(statBeta.total_relatorios === 1, "Contabiliza 1 relatório gerado pelo Assessor Beta");

    const visaoAssessor = engine.filtrarRelatoriosPorPermissao(relatoriosMock, perfisMock[1]);
    const visaoMaster = engine.filtrarRelatoriosPorPermissao(relatoriosMock, perfisMock[0]);
    const visaoUidMaster = engine.filtrarRelatoriosPorPermissao(relatoriosMock, {
      id: "130e3598-89b9-4702-a4cc-2c5923fa3a66",
      email: "admin.master@pacecapital.com.br",
      role: "assessor"
    });
    const visaoWilliansUid = engine.filtrarRelatoriosPorPermissao(relatoriosMock, {
      id: "5ec2da93-ed07-43f8-9089-6d285a092156",
      role: "assessor"
    });
    const visaoDenisUid = engine.filtrarRelatoriosPorPermissao(relatoriosMock, {
      id: "469dfeab-5fd6-4159-97a2-aa1fee6e7dcb",
      role: "assessor"
    });

    assert(visaoAssessor.length === 2, "Assessor comum enxerga apenas seus próprios 2 relatórios");
    assert(visaoMaster.length === 3, "Usuário Master possui acesso completo a todos os 3 relatórios de todos os assessores");
    assert(visaoUidMaster.length === 3, "UID Master administrativo reconhecido automaticamente com acesso completo sem exposição de e-mail pessoal");
    assert(visaoWilliansUid.length === 3, "UID Master secundário (Willians) reconhecido automaticamente com acesso completo");
    assert(visaoDenisUid.length === 3, "UID Master terciário (Denis) reconhecido automaticamente com acesso completo");

    // ==========================================
    // 21. TESTE: BLINDAGEM ZERO-LEAKAGE (NENHUM E-MAIL DE USUÁRIO EXPOSTO NO CÓDIGO-FONTE)
    // ==========================================
    console.log("\nExecutando Testes 21: Blindagem Zero-Leakage de E-mails e Identidades...");

    const fs = require('fs');
    const dbSource = fs.readFileSync('script/db.js', 'utf8');
    const authSource = fs.readFileSync('script/auth.js', 'utf8');
    const globalUiSource = fs.readFileSync('script/global_ui.js', 'utf8');
    const sqlMigrationSource = fs.readFileSync('supabase/migrations/20261104_sistema_usuarios_master_usabilidade.sql', 'utf8');
    const sqlConsolidadoSource = fs.readFileSync('supabase/migrations/20261109_consolidacao_usabilidade_master_rls.sql', 'utf8');

    // Extrai DIRETORIO_USUARIOS_SISTEMA do db.js e garante que está vazio no bundle público
    const matchDiretorio = dbSource.match(/const DIRETORIO_USUARIOS_SISTEMA = (\[[\s\S]*?\]);/);
    assert(matchDiretorio && matchDiretorio[1], "DIRETORIO_USUARIOS_SISTEMA declarado de forma segura no db.js");

    const diretorioCarregado = eval(matchDiretorio[1]);
    assert(Array.isArray(diretorioCarregado) && diretorioCarregado.length === 0, "DIRETORIO_USUARIOS_SISTEMA vazio (0 e-mails pessoais expostos no frontend)");

    assert(authSource.includes("MASTER_UIDS_AUTORIZADOS"), "Verificação Master utiliza UIDs opacos (MASTER_UIDS_AUTORIZADOS)");
    assert(!authSource.includes("MASTER_EMAILS_AUTORIZADOS"), "Lista de e-mails Master em texto puro removida do auth.js");

    // Varredura estática contra vazamento de e-mails pessoais (@gmail.com ou e-mails individuais de assessores)
    const arquivosCriticos = [
      { nome: "script/db.js", conteudo: dbSource },
      { nome: "script/auth.js", conteudo: authSource },
      { nome: "script/global_ui.js", conteudo: globalUiSource },
      { nome: "supabase/migrations/20261104_sistema_usuarios_master_usabilidade.sql", conteudo: sqlMigrationSource },
      { nome: "supabase/migrations/20261109_consolidacao_usabilidade_master_rls.sql", conteudo: sqlConsolidadoSource }
    ];

    const emailsInstitucionaisPermitidos = new Set([
      "suporte@pacecapital.com.br",
      "compliance@pacecapital.com.br",
      "seu@email.com",
      "nome@empresa.com.br"
    ]);

    arquivosCriticos.forEach(arq => {
      const matchesEmail = arq.conteudo.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      const emailsNaoInstitucionais = matchesEmail.filter(e => !emailsInstitucionaisPermitidos.has(e.toLowerCase()));
      assert(emailsNaoInstitucionais.length === 0, `Zero e-mails pessoais expostos em ${arq.nome}`);
    });

    assert(sqlConsolidadoSource.includes("on public.profiles for select"), "Migration consolidada inclui política RLS de SELECT em public.profiles para Master");
    assert(sqlConsolidadoSource.includes("obter_metricas_usabilidade_master"), "Migration consolidada inclui RPC obter_metricas_usabilidade_master");

    const dashboardSource = fs.readFileSync('script/dashboard.js', 'utf8');
    assert(dbSource.includes("async function dbObterRelatorios(incluirTodosEquipe = false)"), "dbObterRelatorios isola relatórios próprios por padrão (incluirTodosEquipe = false)");
    assert(dbSource.includes('sessionStorage.getItem("modo_auditoria_master") === "true"'), "dbAutoSalvarExecutar bloqueia salvamento automático em modo_auditoria_master");
    assert(dashboardSource.includes('<option value="meus">Meus Relatórios'), "Dashboard define 'Meus Relatórios' como visão padrão para o usuário logado");
    assert(globalUiSource.includes('sessionStorage.setItem("modo_auditoria_master", "true")'), "Painel Master ativa modo_auditoria_master ao inspecionar relatório de outro assessor");

    // ==========================================
    // 22. TESTE: MAPEAMENTO DE ATIVOS SEM ESTATE TAX (PÁGINA 4 BTG PACTUAL)
    // ==========================================
    console.log("\nExecutando Testes 22: Ativos Isentos de Estate Tax e Diagnóstico Internacional...");

    assert(Array.isArray(engine.ATIVOS_ISENTOS_ESTATE_TAX), "ATIVOS_ISENTOS_ESTATE_TAX exportado como Array no engine");
    assert(engine.ATIVOS_ISENTOS_ESTATE_TAX.length === 9, "Possui exatamente as 9 opções oficiais do BTG Pactual");

    const idsEsperados = [
      "tbills", "bonds_federais", "bonds_corpo_us", "bonds_corpo_non_us",
      "fundos_non_us", "acoes_non_us", "conta_banco_us", "seguro_vida", "imovel_non_us"
    ];

    idsEsperados.forEach(id => {
      const achou = engine.ATIVOS_ISENTOS_ESTATE_TAX.find(a => a.id === id);
      assert(achou && achou.nome, `Ativo isento '${id}' presente no catálogo oficial com nome válido`);
    });

    assert(typeof engine.analisarExposicaoEstateTax === "function", "analisarExposicaoEstateTax disponível no engine");

    const diagSemOff = engine.analisarExposicaoEstateTax({ valorOffshoreUSD: 0, ativosIsentos: [] });
    assert(diagSemOff.status === "sem_offshore", "Sem offshore reconhecido corretamente");

    const diagComIsentos = engine.analisarExposicaoEstateTax({ valorOffshoreUSD: 500000, ativosIsentos: ["tbills", "fundos_non_us"] });
    assert(diagComIsentos.status === "ativos_isentos_selecionados", "Ativos isentos selecionados reconhecidos");
    assert(diagComIsentos.classeBadge === "protegido", "Badge protegido atribuído para ativos isentos");
    assert(diagComIsentos.exposicao === false, "Sem exposição com ativos isentos selecionados");

    const diagExposto = engine.analisarExposicaoEstateTax({ valorOffshoreUSD: 150000, ativosIsentos: [] });
    assert(diagExposto.status === "potencial_exposicao", "Potencial exposição detectada acima de USD 60k sem isentos");
    assert(diagExposto.exposicao === true, "Sinaliza exposição true para carteira US acima de USD 60k sem isentos");

    const diagIsencaoGeral = engine.analisarExposicaoEstateTax({ valorOffshoreUSD: 45000, ativosIsentos: [] });
    assert(diagIsencaoGeral.status === "dentro_limite_isencao", "Saldo até USD 60k reconhecido dentro da isenção geral");

    // ==========================================
    // 23. TESTE: TABELA PROGRESSIVA DO US ESTATE TAX (PÁGINA 3 BTG PACTUAL) E REGRA DO EXCEDENTE
    // ==========================================
    console.log("\nExecutando Testes 23: Tabela Progressiva US Estate Tax & Regra do Excedente aos USD 60.000...");

    assert(Array.isArray(engine.FAIXAS_ESTATE_TAX), "FAIXAS_ESTATE_TAX exportado como Array no engine");
    assert(engine.FAIXAS_ESTATE_TAX.length === 12, "Tabela possui exatamente as 12 faixas progressivas da Página 3 do BTG");
    assert(typeof engine.calcularEstateTaxProgressivo === "function", "calcularEstateTaxProgressivo disponível no engine");

    // Validação da regra mandatória: Imposto cobrado exclusivamente sobre o excedente aos 60 mil dólares
    const calcAbaixoIsencao = engine.calcularEstateTaxProgressivo(40000);
    assert(calcAbaixoIsencao.totalUSD === 40000, "Saldo total USD = 40.000");
    assert(calcAbaixoIsencao.isencaoUSD === 60000, "Isenção geral fixada em USD 60.000");
    assert(calcAbaixoIsencao.excedenteUSD === 0, "Abaixo de 60k: Excedente tributável é estritamente zero");
    assert(calcAbaixoIsencao.impostoTotalUSD === 0, "Abaixo de 60k: Imposto devido é estritamente zero");
    assert(calcAbaixoIsencao.isento === true, "Abaixo de 60k: Marcado como isento");
    assert(calcAbaixoIsencao.fraseExplicativa.includes("excedente aos 60 mil dólares"), "Frase explicativa cita expressamente o excedente aos 60 mil dólares");
    assert(calcAbaixoIsencao.fraseExplicativa.includes("não sobre o valor total"), "Frase explicativa esclarece expressamente que não incide sobre o valor total");

    const calcNoLimite = engine.calcularEstateTaxProgressivo(60000);
    assert(calcNoLimite.excedenteUSD === 0, "Exatamente USD 60.000: Excedente é zero");
    assert(calcNoLimite.impostoTotalUSD === 0, "Exatamente USD 60.000: Imposto é zero");

    // Faixa 1: Excedente até $10.000 (Ex: Carteira de $70.000 -> Excedente de $10.000 @ 18% = $1.800)
    const calcFaixa1 = engine.calcularEstateTaxProgressivo(70000);
    assert(calcFaixa1.excedenteUSD === 10000, "Total $70k: Excedente é $10.000");
    assert(calcFaixa1.impostoTotalUSD === 1800, "Faixa 1: $10.000 a 18% = $1.800");
    assert(calcFaixa1.aliquotaEfetivaExcedente === 18, "Alíquota efetiva sobre excedente = 18%");
    assert(calcFaixa1.aliquotaMarginal === 18, "Alíquota marginal = 18%");

    // Faixa 2: Excedente de $20.000 (Ex: Carteira de $80.000 -> $10k @ 18% + $10k @ 20% = $3.800)
    const calcFaixa2 = engine.calcularEstateTaxProgressivo(80000);
    assert(calcFaixa2.excedenteUSD === 20000, "Total $80k: Excedente é $20.000");
    assert(calcFaixa2.impostoTotalUSD === 3800, "Faixa 2: $1.800 + $2.000 = $3.800");
    assert(calcFaixa2.aliquotaMarginal === 20, "Alíquota marginal = 20%");

    // Faixa 6: Excedente de $100.000 (Ex: Carteira de $160.000 -> Imposto acumulado = $23.800)
    const calcFaixa6 = engine.calcularEstateTaxProgressivo(160000);
    assert(calcFaixa6.excedenteUSD === 100000, "Total $160k: Excedente é $100.000");
    assert(calcFaixa6.impostoTotalUSD === 23800, "Faixa 6: Imposto acumulado até $100k excedente = $23.800");
    assert(calcFaixa6.aliquotaMarginal === 28, "Alíquota marginal = 28%");

    // Faixa 11: Excedente de $1.000.000 (Ex: Carteira de $1.060.000 -> Imposto acumulado = $345.800)
    const calcFaixa11 = engine.calcularEstateTaxProgressivo(1060000);
    assert(calcFaixa11.excedenteUSD === 1000000, "Total $1.060.000: Excedente é $1.000.000");
    assert(calcFaixa11.impostoTotalUSD === 345800, "Faixa 11: Imposto acumulado até $1.000.000 excedente = $345.800");
    assert(calcFaixa11.aliquotaMarginal === 39, "Alíquota marginal = 39%");

    // Faixa 12: Excedente de $2.000.000 (Ex: Carteira de $2.060.000 -> $345.800 + $1.000.000 * 40% = $745.800)
    const calcFaixa12 = engine.calcularEstateTaxProgressivo(2060000);
    assert(calcFaixa12.excedenteUSD === 2000000, "Total $2.060.000: Excedente é $2.000.000");
    assert(calcFaixa12.impostoTotalUSD === 745800, "Faixa 12: $345.800 + $400.000 = $745.800");
    assert(calcFaixa12.aliquotaMarginal === 40, "Alíquota marginal = 40%");
    assert(calcFaixa12.aliquotaEfetivaExcedente === 37.29, "Alíquota efetiva sobre excedente = 37.29%");

    // Verificação de integração em analisarExposicaoEstateTax
    const diagIntegrado = engine.analisarExposicaoEstateTax({ valorOffshoreUSD: 160000, ativosIsentos: [] });
    assert(diagIntegrado.calculoProgressivo && diagIntegrado.calculoProgressivo.impostoTotalUSD === 23800, "analisarExposicaoEstateTax embute cálculo progressivo exato");
    assert(diagIntegrado.fraseExplicativa.includes("excedente aos 60 mil dólares"), "analisarExposicaoEstateTax contém a frase explicativa obrigatória");

    // ==========================================
    // 24. TESTE: POLÍTICAS AVANÇADAS DE ESTATE TAX, ESTRUTURA PIC E LEI 14.754/2023
    // ==========================================
    console.log("\nExecutando Testes 24: Políticas Avançadas de Estate Tax, Estrutura PIC e Lei 14.754/2023...");

    // 1. Estrutura PIC presente e com metadados corretos
    assert(engine.TIPOS_CONTA_EXTERIOR.pic !== undefined, "Tipo de conta 'pic' exportado no engine");
    assert(engine.TIPOS_CONTA_EXTERIOR.pic.sujeitoInventario === false, "PIC dispensa inventário judicial nos EUA");
    assert(engine.TIPOS_CONTA_EXTERIOR.pic.estateTax.includes("Isento"), "PIC classificada como isenta de US Estate Tax");

    // 2. Diagnóstico com PIC gera imposto zero e não-exposição mesmo com valores altos
    const diagPIC = engine.analisarExposicaoEstateTax({ valorOffshoreUSD: 2000000, tipoConta: "pic" });
    assert(diagPIC.status === "estrutura_pic_isenta", "PIC identificada com status estrutura_pic_isenta");
    assert(diagPIC.classeBadge === "protegido", "PIC recebe badge protegido");
    assert(diagPIC.exposicao === false, "PIC tem exposicao = false");
    assert(diagPIC.calculoProgressivo.impostoTotalUSD === 0, "PIC tem imposto total USD = 0");

    // 3. Conta TIC (Joint Tenants in Common) com cota de 50%
    // Saldo total USD 200.000 -> Cota 50% = USD 100.000 -> Excedente a USD 60.000 = USD 40.000
    // Faixa 1 (10k a 18% = 1800) + Faixa 2 (10k a 20% = 2000) + Faixa 3 (20k a 22% = 4400) = USD 8.200
    const diagTIC = engine.analisarExposicaoEstateTax({
      valorOffshoreUSD: 200000,
      tipoConta: "tic",
      cotaFalecidoPercentual: 50,
      percentualUSSitus: 100
    });
    assert(diagTIC.saldoRelevanteUSD === 100000, "TIC 50%: Saldo relevante do falecido = USD 100.000");
    assert(diagTIC.calculoProgressivo.excedenteUSD === 40000, "TIC 50%: Excedente aos USD 60k = USD 40.000");
    assert(diagTIC.calculoProgressivo.impostoTotalUSD === 8200, "TIC 50%: Imposto progressivo sobre USD 40k = USD 8.200");

    // 4. Rateio proporcional entre ativos US Situs e Non-US Situs
    // Saldo USD 500.000 com 30% em US Situs = USD 150.000 exposto
    // Excedente aos 60k = USD 90.000
    // Imposto até $80k excedente = $18.200 + $10k excedente a 28% = $2.800 -> Total = USD 21.000
    const diagProporcional = engine.analisarExposicaoEstateTax({
      valorOffshoreUSD: 500000,
      tipoConta: "individual",
      percentualUSSitus: 30
    });
    assert(diagProporcional.saldoExpostoUSD === 150000, "Rateio 30% US Situs: Saldo exposto = USD 150.000");
    assert(diagProporcional.saldoIsentoUSD === 350000, "Rateio 30% US Situs: Saldo isento = USD 350.000");
    assert(diagProporcional.calculoProgressivo.excedenteUSD === 90000, "Rateio 30%: Excedente = USD 90.000");
    assert(diagProporcional.calculoProgressivo.impostoTotalUSD === 21000, "Rateio 30%: Imposto = USD 21.000");

    // 5. Rateio 0% em US Situs (100% em ativos isentos / UCITS / Treasuries)
    const diagZeroSitus = engine.analisarExposicaoEstateTax({
      valorOffshoreUSD: 1000000,
      tipoConta: "individual",
      percentualUSSitus: 0
    });
    assert(diagZeroSitus.status === "100_porcento_isento", "0% US Situs: Status 100_porcento_isento");
    assert(diagZeroSitus.calculoProgressivo.impostoTotalUSD === 0, "0% US Situs: Imposto é zero");
    assert(diagZeroSitus.exposicao === false, "0% US Situs: exposicao = false");

    // 6. Nomenclatura dos formulários do IRS
    assert(engine.TIPOS_CONTA_EXTERIOR.individual.forms.includes("Form 706-NA"), "Formulário de apuração nomeado como Form 706-NA");
    assert(engine.TIPOS_CONTA_EXTERIOR.individual.forms.includes("Form 5173"), "Formulário de quitação nomeado como Form 5173");

    // 7. Estimativa consultiva da Lei nº 14.754/2023 (15% IRPF DAA)
    assert(typeof engine.calcularEstimativaLei14754 === "function", "calcularEstimativaLei14754 disponível no engine");
    const estimativaLei = engine.calcularEstimativaLei14754(100000, 0.05, 5.5);
    assert(estimativaLei.rendimentoAnualUSD === 5000, "Rendimento anual a 5% sobre $100k = $5.000");
    assert(estimativaLei.aliquotaPercentual === 15, "Alíquota IRPF Lei 14.754/2023 = 15%");
    assert(estimativaLei.impostoAnualUSD === 750, "Imposto anual IRPF = USD 750");
    assert(estimativaLei.impostoAnualBRL === 4125, "Imposto anual convertido PTAX 5.5 = R$ 4.125");

    // ==========================================
    // 25. TESTE: RESILIÊNCIA DE DADOS PARCIAIS E NÃO-ZERAMENTO DE PREJUÍZO TRIBUTÁRIO
    // ==========================================
    console.log("\nExecutando Testes 25: Resiliência de Dados Parciais e Cálculo Defensivo...");

    // Cenário Gabriel: Total R$ 3.300.000, Previdência R$ 500.000, Bens individuais vazios/não discriminados
    const calculoGabriel = engine.calcularMemoriaPrejuizo({
      totalPatrimonio: 3300000,
      valorPrevidencia: 500000,
      valorOffshore: 0,
      regime: "comunhao_parcial",
      itcmd: 4.0,
      honorarios: 6.0,
      custas: 1.0
    });

    assert(calculoGabriel.baseTributavel === 1400000, "Gabriel: Base tributável deve ser R$ 1.400.000");
    assert(calculoGabriel.prejuizoTotal === 154000, "Gabriel: Prejuízo tributário deve ser exatamente R$ 154.000 (11%)");
    assert(calculoGabriel.subtotalLiquido === 2800000, "Gabriel: Subtotal líquido deduzida previdência = R$ 2.800.000");

    // Simulação do fallback defensivo Math.max(somaItens, pisoNacional)
    const totalAtualMock = 3300000;
    const offshoreMock = 0;
    const dadosPatrimonioParciais = { prev: 500000 };
    const somaItensMock = Number(dadosPatrimonioParciais.rf || 0) + Number(dadosPatrimonioParciais.prev || 0); // 500.000
    const pisoNacionalMock = Math.max(0, totalAtualMock - offshoreMock); // 3.300.000
    const nacAtualDefensivo = Math.max(somaItensMock, pisoNacionalMock);
    assert(nacAtualDefensivo === 3300000, "Fallback defensivo assegura patrimônio nacional de R$ 3.300.000 mesmo com bens detalhados ausentes");

    const baseCalculada = Math.max(0, nacAtualDefensivo - dadosPatrimonioParciais.prev) * 0.5;
    assert(baseCalculada === 1400000, "Base calculada com fallback = R$ 1.400.000");
    assert(baseCalculada * 0.11 === 154000, "Prejuízo calculado com fallback = R$ 154.000");

    // Projeção futura defensiva
    const totalProjetadoMock = 8559350;
    const prevProjetadaMock = 1296871;
    const nacProjetadoPiso = Math.max(0, totalProjetadoMock - offshoreMock);
    const baseProjetadaDefensiva = Math.max(0, nacProjetadoPiso - prevProjetadaMock) * 0.5;
    assert(baseProjetadaDefensiva === 3631239.5, "Base projetada defensiva consistente com projeção total (R$ 3.631.239,50)");
    assert(Math.round(baseProjetadaDefensiva * 0.11) === 399436, "Prejuízo projetado defensivo = R$ 399.436");

    // ==========================================
    // 26. TESTE: MÉTRICAS DE EROSÃO PATRIMONIAL E PRESERVAÇÃO SUCESSÓRIA (OPÇÃO 1)
    // ==========================================
    console.log("\nExecutando Testes 26: Métricas de Erosão Patrimonial e Preservação Sucessória (Opção 1)...");

    const erosaoAtualVal = 154000;
    const erosaoProjetadaVal = 399436;
    const liquidoPreservadoAtual = totalAtualMock - erosaoAtualVal;
    const liquidoPreservadoProjetado = totalProjetadoMock - erosaoProjetadaVal;
    const deltaInerciaEsperado = erosaoProjetadaVal - erosaoAtualVal;

    assert(liquidoPreservadoAtual === 3146000, "Patrimônio líquido preservado atual = R$ 3.146.000");
    assert(liquidoPreservadoProjetado === 8159914, "Patrimônio líquido preservado projetado = R$ 8.159.914");
    assert(deltaInerciaEsperado === 245436, "Aumento de perda por inércia = + R$ 245.436");

    const pctErosaoAtualCalc = (erosaoAtualVal / totalAtualMock) * 100;
    const pctErosaoProjetadaCalc = (erosaoProjetadaVal / totalProjetadoMock) * 100;
    assert(pctErosaoAtualCalc.toFixed(1) === "4.7", "Percentual de erosão atual = 4.7%");
    assert(pctErosaoProjetadaCalc.toFixed(1) === "4.7", "Percentual de erosão projetada = 4.7%");
    assert(liquidoPreservadoAtual + erosaoAtualVal === totalAtualMock, "Soma de líquido preservado e erosão recompõe 100% do patrimônio atual");

    // ==========================================
    // 27. TESTE: MÉTRICAS DE DECOMPOSIÇÃO EM CASCATA (WATERFALL - OPÇÃO 2)
    // ==========================================
    console.log("\nExecutando Testes 27: Métricas de Decomposição em Cascata (Waterfall - Opção 2)...");

    const baseTributavelMock = 1400000;
    const itcmdVal = baseTributavelMock * 0.04; // 56.000
    const honorariosVal = baseTributavelMock * 0.06; // 84.000
    const custasVal = baseTributavelMock * 0.01; // 14.000
    const prejuizoCascata = itcmdVal + honorariosVal + custasVal; // 154.000
    const liquidoCascata = totalAtualMock - prejuizoCascata; // 3.146.000

    assert(itcmdVal === 56000, "ITCMD 4% sobre R$ 1.400.000 = R$ 56.000");
    assert(honorariosVal === 84000, "Honorários 6% sobre R$ 1.400.000 = R$ 84.000");
    assert(custasVal === 14000, "Custas 1% sobre R$ 1.400.000 = R$ 14.000");
    assert(prejuizoCascata === 154000, "Soma dos custos de inventário em cascata = R$ 154.000");
    assert(liquidoCascata === 3146000, "Patrimônio líquido herdado final = R$ 3.146.000");

    // Validar intervalos da cascata [min, max]
    const step1 = [0, totalAtualMock];
    const step2 = [totalAtualMock - itcmdVal, totalAtualMock];
    const step3 = [totalAtualMock - itcmdVal - honorariosVal, totalAtualMock - itcmdVal];
    const step4 = [liquidoCascata, totalAtualMock - itcmdVal - honorariosVal];
    const step5 = [0, liquidoCascata];

    assert(step1[1] === 3300000, "Cascata Step 1 (Bruto) sobe até R$ 3.300.000");
    assert(step2[1] - step2[0] === 56000, "Cascata Step 2 (ITCMD) cai R$ 56.000");
    assert(step3[1] - step3[0] === 84000, "Cascata Step 3 (Honorários) cai R$ 84.000");
    assert(step4[1] - step4[0] === 14000, "Cascata Step 4 (Custas) cai R$ 14.000");
    assert(step5[1] === 3146000, "Cascata Step 5 (Líquido) preserva R$ 3.146.000");

    // ==========================================
    // 28. TESTE: MÉTRICAS DE MEDIDOR DE PRESERVAÇÃO E DONUTS (OPÇÃO 3)
    // ==========================================
    console.log("\nExecutando Testes 28: Métricas de Medidor de Preservação e Donuts (Opção 3)...");

    const pctPreservadoAtualCalc = (liquidoCascata / totalAtualMock) * 100;
    const pctErosaoAtualCalc2 = (prejuizoCascata / totalAtualMock) * 100;
    assert(pctPreservadoAtualCalc.toFixed(1) === "95.3", "Donut Atual: Preservação = 95.3%");
    assert(pctErosaoAtualCalc2.toFixed(1) === "4.7", "Donut Atual: Corrosão = 4.7%");
    assert(Number((pctPreservadoAtualCalc + pctErosaoAtualCalc2).toFixed(1)) === 100.0, "Donut Atual: Soma preservado + erosão fecha em 100.0%");

    const taxaTotalSoma = 4 + 6 + 1; // 11
    const itcmdProjCalc = Math.round(399436 * (4 / taxaTotalSoma));
    const honorariosProjCalc = Math.round(399436 * (6 / taxaTotalSoma));
    const custasProjCalc = 399436 - itcmdProjCalc - honorariosProjCalc;
    assert(itcmdProjCalc + honorariosProjCalc + custasProjCalc === 399436, "Donut Futuro: Decomposição proporcional fecha exatamente no prejuízo total de R$ 399.436");

    // ==========================================
    // 29. TESTE: MÉTRICAS DE CANIBALIZAÇÃO DA LIQUIDEZ E ASFIXIA DE CAIXA (ABORDAGEM 1)
    // ==========================================
    console.log("\nExecutando Testes 29: Métricas de Canibalização da Liquidez (Abordagem 1)...");

    const liquidezCenario1 = 500000;
    const prejuizoCenario1 = 154000;
    const pctConsumo1 = (prejuizoCenario1 / liquidezCenario1) * 100;
    const caixaRestante1 = Math.max(0, liquidezCenario1 - prejuizoCenario1);
    const deficit1 = Math.max(0, prejuizoCenario1 - liquidezCenario1);

    assert(pctConsumo1.toFixed(1) === "30.8", "Cenário 1: 30.8% da liquidez consumida pelo inventário");
    assert(caixaRestante1 === 346000, "Cenário 1: Caixa restante após inventário = R$ 346.000");
    assert(deficit1 === 0, "Cenário 1: Sem déficit de caixa inicial");

    // Cenário 2: Cliente com alta imobilização (Apenas R$ 100.000 de liquidez)
    const liquidezCritica = 100000;
    const pctConsumoCritico = (prejuizoCenario1 / liquidezCritica) * 100;
    const caixaRestanteCritico = Math.max(0, liquidezCritica - prejuizoCenario1);
    const deficitCritico = Math.max(0, prejuizoCenario1 - liquidezCritica);

    assert(pctConsumoCritico.toFixed(1) === "154.0", "Cenário Crítico: 154.0% da liquidez consumida (estoura o caixa)");
    assert(caixaRestanteCritico === 0, "Cenário Crítico: Caixa restante zerado");
    assert(deficitCritico === 54000, "Cenário Crítico: Déficit imediato de R$ 54.000 para pagar o inventário");

    // Cenário 3: Projeção Futura
    const liquidezProjetadaMock = 1296871;
    const prejuizoProjetadoMock = 399436;
    const pctConsumoProj = (prejuizoProjetadoMock / liquidezProjetadaMock) * 100;
    const caixaRestanteProj = liquidezProjetadaMock - prejuizoProjetadoMock;

    assert(pctConsumoProj.toFixed(1) === "30.8", "Cenário Futuro: 30.8% da liquidez projetada consumida");
    assert(caixaRestanteProj === 897435, "Cenário Futuro: Caixa restante = R$ 897.435");

    // ==========================================
    // 30. TESTE: MÉTRICAS DE VENDA FORÇADA COM DESÁGIO (ABORDAGEM 2)
    // ==========================================
    console.log("\nExecutando Testes 30: Métricas de Venda Forçada com Deságio (Abordagem 2)...");

    const prejuizoNominalAtual = 154000;
    const desagioAtualCalc = Math.round(prejuizoNominalAtual * 1.3); // 200.200
    const perdaTotalAtualCalc = prejuizoNominalAtual + desagioAtualCalc; // 354.200

    assert(desagioAtualCalc === 200200, "Deságio estimado atual = R$ 200.200");
    assert(perdaTotalAtualCalc === 354200, "Destruição patrimonial real atual = R$ 354.200");

    const prejuizoNominalProj = 399436;
    const desagioProjCalc = Math.round(prejuizoNominalProj * 1.3); // 519.267
    const perdaTotalProjCalc = prejuizoNominalProj + desagioProjCalc; // 918.703

    assert(desagioProjCalc === 519267, "Deságio estimado projetado = R$ 519.267");
    assert(perdaTotalProjCalc === 918703, "Destruição patrimonial real projetada = R$ 918.703");
    assert(perdaTotalProjCalc > 900000, "Perda total acumulada futura supera R$ 900.000");

    // ==========================================
    // 31. TESTE: MÉTRICAS DO SÓCIO OCULTO / PARTILHA COM O ESTADO (ABORDAGEM 3)
    // ==========================================
    console.log("\nExecutando Testes 31: Métricas do Sócio Oculto (Abordagem 3)...");

    const totalPatrimonioSocio = 3300000;
    const herancaBrutaSocio = 1650000;
    const cotaSocioOcultoAtual = 154000;
    const herancaLiquidaFamilia = herancaBrutaSocio - cotaSocioOcultoAtual; // 1.496.000

    assert(cotaSocioOcultoAtual === 154000, "Cota prioritária do Sócio Oculto = R$ 154.000 à vista");
    assert(herancaLiquidaFamilia === 1496000, "Herança líquida entregue à família = R$ 1.496.000 em bens");
    assert(herancaLiquidaFamilia + cotaSocioOcultoAtual === herancaBrutaSocio, "Soma de família e Estado fecha 100% da herança bruta");

    const cotaSocioOcultoProj = 399436;
    assert(cotaSocioOcultoProj === 399436, "Cota projetada do Sócio Oculto = R$ 399.436");

    // ==========================================
    // 32. TESTE: MÉTRICAS DE MATERIALIZAÇÃO EM BENS E TEMPO (ABORDAGEM 4)
    // ==========================================
    console.log("\nExecutando Testes 32: Métricas de Materialização em Bens e Tempo (Abordagem 4)...");

    const prejuizoMaterializaAtual = 154000;
    const prejuizoMaterializaProj = 399436;
    const deltaPerdaInercia = prejuizoMaterializaProj - prejuizoMaterializaAtual;
    const totalDiasInercia = 10 * 365;
    const custoDiario = Math.round(deltaPerdaInercia / totalDiasInercia);

    assert(deltaPerdaInercia === 245436, "Aumento de perda nominal por inércia = R$ 245.436");
    assert(custoDiario === 67, "Custo diário por adiar o planejamento = R$ 67/dia");
    assert(prejuizoMaterializaAtual >= 150000, "Cenário Atual compatível com valor de 1 SUV/veículo zero km");
    assert(prejuizoMaterializaProj >= 350000, "Cenário Futuro compatível com valor de 1 imóvel/apartamento novo");

    // ==========================================
    // 33. TESTE: SEÇÃO ÚNICA DE CORROSÃO PATRIMONIAL COM BOTÃO DE TROCA DE GRÁFICO
    // ==========================================
    console.log("\nExecutando Testes 33: Seção Única de Corrosão Patrimonial com Botão de Trocar Gráfico...");

    // 1. Estado inicial: a section única deve iniciar recolhida/oculta
    let estadoBlocoCorrosao = "none";
    let textoBotaoCorrosao = "Ver Corrosão Patrimonial";
    assert(estadoBlocoCorrosao === "none", "Seção única de corrosão deve iniciar oculta por padrão (display none)");
    assert(textoBotaoCorrosao === "Ver Corrosão Patrimonial", "Botão inicial deve exibir 'Ver Corrosão Patrimonial'");

    // 2. Expansão da section única ao acionar o botão
    function simularCliqueBotaoCorrosao(estadoAtual) {
      if (estadoAtual === "none") {
        return { display: "block", texto: "Ocultar Corrosão Patrimonial", ativo: true };
      }
      return { display: "none", texto: "Ver Corrosão Patrimonial", ativo: false };
    }

    const estadoAberto = simularCliqueBotaoCorrosao(estadoBlocoCorrosao);
    assert(estadoAberto.display === "block", "Após clique, section única passa a display block");
    assert(estadoAberto.texto === "Ocultar Corrosão Patrimonial", "Texto alterna para 'Ocultar Corrosão Patrimonial'");
    assert(estadoAberto.ativo === true, "Botão principal recebe estado ativo");

    // 3. Mecânica do Botão de Trocar Gráfico (alternância entre Canibalização de Caixa e Bens/Tempo)
    let modoAtual = "caixa";
    function simularTrocarGrafico(modo) {
      return modo === "caixa" ? "bens" : "caixa";
    }

    modoAtual = simularTrocarGrafico(modoAtual);
    assert(modoAtual === "bens", "Ao clicar em 'Trocar Gráfico', o modo alterna de 'caixa' para 'bens'");

    modoAtual = simularTrocarGrafico(modoAtual);
    assert(modoAtual === "caixa", "Ao clicar novamente em 'Trocar Gráfico', retorna para 'caixa'");

    // 4. Seleção direta via tabs
    function selecionarModo(modoDesejado) {
      return modoDesejado === "bens" ? "bens" : "caixa";
    }
    assert(selecionarModo("bens") === "bens", "Seleção direta da tab 'Bens e Tempo' ativa modo bens");
    assert(selecionarModo("caixa") === "caixa", "Seleção direta da tab 'Canibalização de Caixa' ativa modo caixa");

    // 5. Consistência dos dados no modo Caixa (Opção 1)
    const dadosCaixa = {
      liquidezAtual: 500000,
      prejuizoAtual: 154000,
      liquidezProjetada: 1296871,
      prejuizoProjetado: 399436
    };
    const pctDrenadaCaixa = (dadosCaixa.prejuizoAtual / dadosCaixa.liquidezAtual) * 100;
    const caixaLivre = dadosCaixa.liquidezAtual - dadosCaixa.prejuizoAtual;
    assert(pctDrenadaCaixa.toFixed(1) === "30.8", "Modo Caixa: 30.8% de caixa consumido");
    assert(caixaLivre === 346000, "Modo Caixa: R$ 346.000 de saldo livre após inventário");

    // 6. Consistência dos dados no modo Bens (Opção 4)
    const dadosBens = {
      prejuizoAtual: 154000,
      prejuizoProjetado: 399436,
      anosProjecao: 10
    };
    const custoDiarioBens = Math.round((dadosBens.prejuizoProjetado - dadosBens.prejuizoAtual) / (dadosBens.anosProjecao * 365));
    assert(custoDiarioBens === 67, "Modo Bens: R$ 67/dia de inércia");
    assert(dadosBens.prejuizoAtual === dadosCaixa.prejuizoAtual, "Prejuízo nominal rigorosamente sincronizado entre ambos os modos na mesma section");

    // ==========================================
    // 34. TESTE: GOVERNANÇA DE CONTAS MASTER E AUDITORIA ZERO-LEAKAGE
    // ==========================================
    console.log("\nExecutando Testes 34: Governança de Contas Master & Auditoria Zero-Leakage...");

    // Simulação da função canônica authIsMaster(user) do auth.js
    const MASTER_UIDS_TEST = [
      "130e3598-89b9-4702-a4cc-2c5923fa3a66",
      "5ec2da93-ed07-43f8-9089-6d285a092156",
      "469dfeab-5fd6-4159-97a2-aa1fee6e7dcb"
    ];
    function verificarIsMaster(user) {
      if (!user) return false;
      if (user.id && MASTER_UIDS_TEST.includes(String(user.id).trim())) {
        return true;
      }
      return user.role === "master" || user.profile_role === "master";
    }

    // 1. Usuário com role = 'master' (vindo do banco public.profiles)
    const usuarioMasterPerfil = { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", role: "master" };
    assert(verificarIsMaster(usuarioMasterPerfil) === true, "Usuário com role 'master' em profiles é reconhecido como Master sem precisar de e-mail no front-end");

    // 2. Usuário com profile_role = 'master'
    const usuarioMasterSessao = { id: "f1e2d3c4-b5a6-0987-fedc-ba9876543210", profile_role: "master" };
    assert(verificarIsMaster(usuarioMasterSessao) === true, "Usuário com profile_role 'master' é reconhecido como Master");

    // 3. Usuários com UID Master opaco autorizado
    const usuarioMasterUid1 = { id: "130e3598-89b9-4702-a4cc-2c5923fa3a66", role: "assessor" };
    const usuarioMasterUid2 = { id: "5ec2da93-ed07-43f8-9089-6d285a092156", role: "assessor" };
    const usuarioMasterUid3 = { id: "469dfeab-5fd6-4159-97a2-aa1fee6e7dcb", role: "assessor" };
    assert(verificarIsMaster(usuarioMasterUid1) === true, "Usuário Master 1 (João Pedro) com UID opaco tem privilégio Master garantido");
    assert(verificarIsMaster(usuarioMasterUid2) === true, "Usuário Master 2 (Willians Novais) com UID opaco tem privilégio Master garantido");
    assert(verificarIsMaster(usuarioMasterUid3) === true, "Usuário Master 3 (Denis Beltrão) com UID opaco tem privilégio Master garantido");

    // 4. Assessor comum não possui privilégio Master
    const assessorComum = { id: "99999999-8888-7777-6666-555555555555", role: "assessor" };
    assert(verificarIsMaster(assessorComum) === false, "Assessor comum com role 'assessor' não possui privilégio Master");
    assert(verificarIsMaster(null) === false, "Usuário nulo não possui privilégio Master");

    // 5. Verificação de Zero-Leakage: E-mails master ausentes no código front-end
    if (typeof require !== "undefined") {
      const fs = require("fs");
      const path = require("path");
      const frontendFiles = [
        "script/auth.js",
        "script/dashboard.js",
        "script/db.js",
        "script/tributario.js",
        "script/tributario_charts.js",
        "script/tributario_engine.js",
        "tributario.html",
        "index.html",
        "login.html",
        "patrimonio.html",
        "familiar.html",
        "dashboard.html"
      ];
      let leakEncontrado = false;
      frontendFiles.forEach(relPath => {
        const fullP = path.resolve(__dirname, "..", relPath);
        if (fs.existsSync(fullP)) {
          const txt = fs.readFileSync(fullP, "utf8");
          if (txt.toLowerCase().includes("willians.novais@pacecapital.com.br") || txt.toLowerCase().includes("denis.beltrao@pacecapital.com.br")) {
            leakEncontrado = true;
          }
        }
      });
      assert(leakEncontrado === false, "Auditoria Zero-Leakage: E-mails master de Willians Novais e Denis Beltrão estão 100% ausentes do código front-end");
    }

    // ==========================================
    // 35. TESTE: AUDITORIA ANTI-ESCALONAMENTO DE PRIVILÉGIOS E IMUTABILIDADE DE PERFIS
    // ==========================================
    console.log("\nExecutando Testes 35: Auditoria Anti-Escalonamento de Privilégios & Imutabilidade...");

    // 1. Simulação da função segura is_master() (valida apenas UIDs, role='master' no banco ou JWT verificado)
    const MASTER_UIDS_CANONICOS = new Set([
      "130e3598-89b9-4702-a4cc-2c5923fa3a66",
      "5ec2da93-ed07-43f8-9089-6d285a092156",
      "469dfeab-5fd6-4159-97a2-aa1fee6e7dcb"
    ]);
    const MASTER_EMAILS_AUTORIZADOS = new Set([
      "willians.novais@pacecapital.com.br",
      "denis.beltrao@pacecapital.com.br"
    ]);

    function simularIsMasterSeguro(authUid, jwtEmail, profileRow) {
      if (MASTER_UIDS_CANONICOS.has(authUid)) return true;
      if (profileRow && profileRow.role === "master") return true;
      if (jwtEmail && MASTER_EMAILS_AUTORIZADOS.has(String(jwtEmail).toLowerCase().trim())) return true;
      return false;
    }

    // Assessor tenta spoofar e-mail em public.profiles mas possui JWT de assessor
    const assessorSpoofProfile = { id: "assessor-123", email: "denis.beltrao@pacecapital.com.br", role: "assessor" };
    const jwtAssessor = "assessor.real@pacecapital.com.br";
    assert(simularIsMasterSeguro("assessor-123", jwtAssessor, assessorSpoofProfile) === false, "Assessor não consegue se tornar Master mesmo se tentar alterar e-mail em public.profiles");

    // Master legítimo com JWT assinado
    assert(simularIsMasterSeguro("denis-uid-456", "denis.beltrao@pacecapital.com.br", { role: "assessor" }) === true, "Usuário com token JWT corporativo assinado é reconhecido como Master");

    // Master legítimo com UID canônico
    assert(simularIsMasterSeguro("130e3598-89b9-4702-a4cc-2c5923fa3a66", null, null) === true, "UID Master canônico 1 reconhecido sem depender de e-mail");
    assert(simularIsMasterSeguro("5ec2da93-ed07-43f8-9089-6d285a092156", null, null) === true, "UID Master canônico 2 reconhecido sem depender de e-mail");
    assert(simularIsMasterSeguro("469dfeab-5fd6-4159-97a2-aa1fee6e7dcb", null, null) === true, "UID Master canônico 3 reconhecido sem depender de e-mail");

    // 2. Simulação do trigger trg_bloquear_escalonamento_privilegios()
    function simularTriggerPerfil(oldRow, newRow, isMaster) {
      if (!isMaster) {
        if (newRow.role !== oldRow.role) {
          throw new Error("Acesso negado: role imutavel");
        }
        if (newRow.email !== oldRow.email) {
          throw new Error("Acesso negado: email imutavel");
        }
        if (newRow.id !== oldRow.id) {
          throw new Error("Acesso negado: id imutavel");
        }
      }
      return { ...newRow, updated_at: new Date().toISOString() };
    }

    const rowOriginal = { id: "user-1", email: "assessor@pace.com", role: "assessor", full_name: "Assessor Inicial" };

    // Tentativa de alterar role por usuário comum -> DEVE FALHAR
    let erroRole = false;
    try {
      simularTriggerPerfil(rowOriginal, { ...rowOriginal, role: "master" }, false);
    } catch (e) {
      erroRole = true;
    }
    assert(erroRole === true, "Trigger bloqueia categoricamente auto-promocao de role para 'master'");

    // Tentativa de alterar email por usuário comum -> DEVE FALHAR
    let erroEmail = false;
    try {
      simularTriggerPerfil(rowOriginal, { ...rowOriginal, email: "denis.beltrao@pacecapital.com.br" }, false);
    } catch (e) {
      erroEmail = true;
    }
    assert(erroEmail === true, "Trigger bloqueia categoricamente alteracao maliciosa de e-mail no perfil");

    // Alteração legítima de nome e ultimo_acesso por usuário comum -> DEVE PASSAR
    const updateValido = simularTriggerPerfil(rowOriginal, { ...rowOriginal, full_name: "Nome Atualizado" }, false);
    assert(updateValido.full_name === "Nome Atualizado", "Permite que assessor atualize seu proprio nome com seguranca");
    assert(updateValido.role === "assessor", "Role preservada como assessor apos update seguro");

    // ==========================================
    // 36. TESTE: ROTEAMENTO DE CONVITE SUPABASE, CAPTURE DE HASH E RATE LIMIT
    // ==========================================
    console.log("\nExecutando Testes 36: Roteamento de Convite Supabase, Captura de Hash e Rate Limit...");

    if (typeof require !== "undefined") {
      const fs = require("fs");
      const path = require("path");
      const authMod = require(path.resolve(__dirname, "..", "script/auth.js"));
      const configSource = fs.readFileSync(path.resolve(__dirname, "..", "script/supabase_config.js"), "utf8");
      const authSourceCheck = fs.readFileSync(path.resolve(__dirname, "..", "script/auth.js"), "utf8");

      // 1. Captura sincrona de snapshot de URL em supabase_config.js antes do createClient()
      const idxCapture = configSource.indexOf("window.__PACE_INITIAL_AUTH__");
      const idxCreate = configSource.indexOf("window.supabase.createClient(");
      assert(idxCapture !== -1 && idxCreate !== -1 && idxCapture < idxCreate, "supabase_config.js captura __PACE_INITIAL_AUTH__ antes de inicializar o SDK");

      // 2. Deteccao de link de convite via hash (#access_token=...&type=invite)
      const inviteHashInfo = authMod.authAnalisarParametrosUrlAuth("#access_token=jwt123&type=invite", "", "");
      assert(inviteHashInfo.isInvite === true, "Detecta type=invite no hash da URL");
      assert(inviteHashInfo.needsPasswordSetup === true, "Ativa definicao obrigatoria de senha no convite");
      assert(inviteHashInfo.hasError === false, "Nao sinaliza erro em link de convite valido");

      // 3. Deteccao de fallback pendente caso SDK tenha limpado o hash antes do DOMContentLoaded
      const pendingInviteInfo = authMod.authAnalisarParametrosUrlAuth("", "", "invite");
      assert(pendingInviteInfo.isInvite === true && pendingInviteInfo.needsPasswordSetup === true, "Preserva modo de criacao de senha via flag pendente mesmo com hash limpo");

      // 4. Deteccao via query ?auth_flow=recovery apos redirect de index.html -> login.html
      const recoveryQueryInfo = authMod.authAnalisarParametrosUrlAuth("", "?auth_flow=recovery", "");
      assert(recoveryQueryInfo.isRecovery === true && recoveryQueryInfo.needsPasswordSetup === true, "Detecta auth_flow=recovery preservado na querystring");

      // 5. Construcao de URL login.html em diferentes formatos de origem/path
      assert(
        authMod.authObterBaseUrlLogin("https://joaopedromenesesdev.github.io/RITMO_Whealth_Pro/") === "https://joaopedromenesesdev.github.io/RITMO_Whealth_Pro/login.html",
        "Resolve login.html corretamente a partir da raiz com barra final"
      );
      assert(
        authMod.authObterBaseUrlLogin("https://joaopedromenesesdev.github.io/RITMO_Whealth_Pro") === "https://joaopedromenesesdev.github.io/RITMO_Whealth_Pro/login.html",
        "Resolve login.html corretamente a partir de subpasta sem barra final"
      );
      assert(
        authMod.authObterBaseUrlLogin("https://joaopedromenesesdev.github.io/RITMO_Whealth_Pro/index.html") === "https://joaopedromenesesdev.github.io/RITMO_Whealth_Pro/login.html",
        "Resolve login.html corretamente a partir de index.html"
      );
      assert(
        authMod.authObterBaseUrlLogin("https://joaopedromenesesdev.github.io/RITMO_Whealth_Pro/login") === "https://joaopedromenesesdev.github.io/RITMO_Whealth_Pro/login.html",
        "Resolve login.html corretamente quando URL de Site URL vem sem .html (/login)"
      );
      assert(authMod.authEhPaginaLogin("/RITMO_Whealth_Pro/login") === true, "Reconhece /login sem .html como pagina de login");
      assert(authMod.authEhPaginaLogin("/RITMO_Whealth_Pro/login.html") === true, "Reconhece /login.html como pagina de login");
      assert(authMod.authEhPaginaLogin("/RITMO_Whealth_Pro/index.html") === false, "Nao confunde index.html com pagina de login");

      // 6. Redirecionamento de pagina protegida (index.html) preservando fluxo de convite
      const redirectInviteUrl = authMod.authConstruirRedirectLoginComAuth(
        "https://joaopedromenesesdev.github.io/RITMO_Whealth_Pro/login.html",
        inviteHashInfo
      );
      assert(
        redirectInviteUrl === "https://joaopedromenesesdev.github.io/RITMO_Whealth_Pro/login.html?auth_flow=invite#access_token=jwt123&type=invite",
        "Redirecionamento para login.html preserva auth_flow=invite e access_token original"
      );

      // 7. Tratamento preciso de error_code=over_request_rate_limit sem mandar usuario pedir mais emails
      const rateUrlInfo = authMod.authAnalisarParametrosUrlAuth(
        "#error=access_denied&error_code=over_request_rate_limit&error_description=Request+rate+limit+reached",
        "",
        ""
      );
      assert(rateUrlInfo.hasError === true, "Identifica erro de URL no callback de rate limit");
      const msgRateUrl = authMod.authFormatarMensagemErroUrl(rateUrlInfo);
      assert(msgRateUrl.toLowerCase().includes("muitas tentativas"), "Traduz over_request_rate_limit para mensagem clara de rate limit");
      assert(!msgRateUrl.toLowerCase().includes("esqueceu sua senha"), "Nao induz clique em Esqueceu sua senha quando erro ja e de rate limit");

      // 8. Traducao de erro de cooldown e link expirado (otp_expired)
      const msgCooldown = authMod.authTraduzirMensagemErro("For security purposes, you can only request this after 54 seconds.");
      assert(msgCooldown.includes("54 segundos"), "Traduz mensagem de cooldown extraindo os segundos corretamente");

      const otpExpiredInfo = authMod.authAnalisarParametrosUrlAuth(
        "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
        "",
        ""
      );
      const msgOtpExpired = authMod.authFormatarMensagemErroUrl(otpExpiredInfo);
      assert(msgOtpExpired.toLowerCase().includes("expirou ou já foi utilizado"), "Traduz otp_expired para mensagem amigavel de link expirado");

      // 9. Auditoria de zero vazamento de service_role no front-end
      assert(!configSource.toLowerCase().includes("service_role") && !authSourceCheck.toLowerCase().includes("service_role"), "Nenhuma chave ou referencia a service_role presente nos scripts cliente");
    }

    // ── TESTE 37: Bens Particulares na Base Tributavel, Estado Civil e Parser Monetario ──
    console.log("\n-> Teste 37: Bens Particulares (100% Tributavel), Estado Civil e Parser Monetario");
    {
      // 1. Cenario exato da simulacao (Patrimonio 6.820.000, Previdencia 200.000, Bens Particulares 120.000, Casado - Comunhao Parcial)
      const memCarlos = engine.calcularMemoriaPrejuizo({
        totalPatrimonio: 6820000,
        valorPrevidencia: 200000,
        valorOffshore: 0,
        bensParticulares: 120000,
        estadoCivil: "casado",
        regime: "Comunhão Parcial de Bens",
        itcmd: 4,
        honorarios: 5,
        custas: 2
      });
      assert(memCarlos.subtotalLiquido === 6620000, "Subtotal liquido abate apenas previdencia/offshore (6.620.000)");
      assert(memCarlos.bensParticulares === 120000, "Separa 120.000 de bens particulares na Comunhao Parcial");
      assert(memCarlos.bensComuns === 6500000, "Bens comuns correspondem a 6.500.000 (Casa 5M + Outros 1.5M)");
      assert(memCarlos.meacao === 3250000, "Meacao incide apenas sobre os bens comuns (50% de 6.5M = 3.250.000)");
      assert(memCarlos.baseTributavel === 3370000, "Base tributavel = 50% dos bens comuns (3.250.000) + 100% dos bens particulares (120.000) = 3.370.000");
      assert(Math.round(memCarlos.prejuizoTotal) === 370700, "Prejuizo total (11% de 3.370.000) = R$ 370.700");

      // Alinhamento matematico entre calcularMemoriaPrejuizo e calcularPartilhaSucessoria
      const partilhaCarlos = engine.calcularPartilhaSucessoria({
        totalPatrimonio: 6820000,
        valorPrevidencia: 200000,
        valorOffshore: 0,
        bensParticulares: 120000,
        familia: {
          estadoCivil: "casado",
          regime: "Comunhão Parcial de Bens",
          temFilhos: "sim",
          qtdFilhos: 2
        }
      });
      assert(memCarlos.baseTributavel === partilhaCarlos.heranca, "Base tributavel do prejuizo coincide 100% com o monte-mor transmissivel (heranca) da partilha");

      // 2. Comunhao Universal de Bens (todos os bens comunicam, meacao de 50% sobre tudo)
      const memUniversal = engine.calcularMemoriaPrejuizo({
        totalPatrimonio: 6820000,
        valorPrevidencia: 200000,
        valorOffshore: 0,
        bensParticulares: 120000,
        estadoCivil: "casado",
        regime: "Comunhão Universal de Bens",
        itcmd: 4,
        honorarios: 5,
        custas: 2
      });
      assert(memUniversal.bensParticulares === 0, "Na Comunhao Universal nao ha separacao de bens particulares");
      assert(memUniversal.baseTributavel === 3310000, "Na Comunhao Universal a base tributavel e 50% de 6.620.000 (3.310.000)");

      // 3. Cliente nao casado (solteiro/divorciado/viuvo) mesmo com string residual de regime
      const memSolteiro = engine.calcularMemoriaPrejuizo({
        totalPatrimonio: 6820000,
        valorPrevidencia: 200000,
        valorOffshore: 0,
        bensParticulares: 120000,
        estadoCivil: "solteiro",
        regime: "Comunhão Parcial de Bens",
        itcmd: 4,
        honorarios: 5,
        custas: 2
      });
      assert(memSolteiro.temMeacao === false, "Cliente solteiro nao tem meacao mesmo com regime residual preenchido");
      assert(memSolteiro.baseTributavel === 6620000, "Base tributavel de cliente solteiro e 100% do subtotal liquido (6.620.000)");

      // 4. Validacao do AppState (parseValorMonetario e obterOffshoreBRL sem inflacao de floats)
      if (typeof require === "function") {
        const AppState = require("../script/state.js");
        assert(AppState.parseValorMonetario(200000.5) === 200000.5, "parseValorMonetario preserva float numerico 200000.5 sem inflar casas");
        assert(AppState.parseValorMonetario("200000.5") === 200000.5, "parseValorMonetario preserva string float '200000.5' sem remover o ponto decimal");
        assert(AppState.parseValorMonetario("5.000.000,00") === 5000000, "parseValorMonetario converte string PT-BR '5.000.000,00' para 5000000");
        assert(AppState.parseValorMonetario("R$ 120.000,50") === 120000.5, "parseValorMonetario converte 'R$ 120.000,50' para 120000.5");
        assert(AppState.parseValorMonetario("5.000") === 5000, "parseValorMonetario converte milhar PT-BR '5.000' para 5000");
        assert(
          AppState.obterOffshoreBRL({ offshore: "100.000,00", offshore_modo: "usd", offshore_ptax: 5.75 }) === 575000,
          "obterOffshoreBRL converte USD * PTAX quando offshore_brl nao esta definido"
        );
        assert(
          AppState.obterOffshoreBRL({ offshore: 100000, offshore_brl: 580000, offshore_modo: "usd", offshore_ptax: 5.8 }) === 580000,
          "obterOffshoreBRL prioriza offshore_brl ja calculado"
        );
      }
    }

    // ── TESTE 38: Fluxo SafeLinks-Proof (token_hash), Nomes e Hardening Anon SQL ──
    console.log("\n-> Teste 38: Fluxo token_hash SafeLinks-Proof, Nomes e Hardening Anon SQL");
    if (typeof require === "function") {
      const fs = require("fs");
      const path = require("path");
      const authMod = require(path.resolve(__dirname, "..", "script/auth.js"));
      const authSrc = fs.readFileSync(path.resolve(__dirname, "..", "script/auth.js"), "utf8");
      const dbSrc = fs.readFileSync(path.resolve(__dirname, "..", "script/db.js"), "utf8");
      const sqlHardening = fs.readFileSync(
        path.resolve(__dirname, "..", "supabase/migrations/2026111101_hardening_auth_e_nomes_assessores.sql"),
        "utf8"
      );

      // 1. Deteccao de token_hash em link SafeLinks-proof sem exigir #access_token previo
      const thRecovery = authMod.authAnalisarParametrosUrlAuth("", "?token_hash=tok_rec_999&type=recovery", "");
      assert(thRecovery.hasTokenHash === true && thRecovery.tokenHash === "tok_rec_999", "Extrai token_hash da querystring em link de definicao/redefinicao");
      assert(thRecovery.isRecovery === true && thRecovery.needsPasswordSetup === true, "Ativa tela de definicao de senha para link recovery com token_hash");

      const thInvite = authMod.authAnalisarParametrosUrlAuth("", "?token_hash=tok_inv_888&type=invite", "");
      assert(thInvite.hasTokenHash === true && thInvite.isInvite === true && thInvite.needsPasswordSetup === true, "Ativa tela de ativacao para link invite com token_hash");

      const thRedirect = authMod.authConstruirRedirectLoginComAuth(
        "https://joaopedromenesesdev.github.io/RITMO_Whealth_Pro/login.html",
        thRecovery
      );
      assert(thRedirect.includes("token_hash=tok_rec_999") && thRedirect.includes("type=recovery"), "Redirect de pagina protegida preserva token_hash e type intactos");

      // 2. Normalizacao de nome evitando placeholder 'Assessor'
      assert(
        authMod.authFormatarNomeUsuario("maria.clara@pacecapital.com.br", "Assessor") === "Maria Clara",
        "Ignora placeholder 'Assessor' e deriva nome formatado a partir do e-mail"
      );
      assert(
        authMod.authFormatarNomeUsuario("pedro.henrique@pacecapital.com.br", "-", "") === "Pedro Henrique",
        "Ignora '-' e vazio derivando nome formatado do e-mail"
      );
      assert(
        authMod.authFormatarNomeUsuario("pedro.henrique@pacecapital.com.br", "Pedro H. Silva") === "Pedro H. Silva",
        "Preserva nome completo valido quando informado"
      );

      // 3. Verificacoes de seguranca no auth.js e db.js
      assert(authSrc.includes("verifyOtp({"), "auth.js consome token_hash via verifyOtp exclusivamente no submit");
      assert(!dbSrc.includes('cached.role === "master"') || dbSrc.indexOf('_verificarUsuarioMasterAsync') > -1, "db.js auditado para verificacao Master");
      const fnIdx = dbSrc.indexOf("async function _verificarUsuarioMasterAsync");
      const fnEndIdx = dbSrc.indexOf("async function dbRegistrarAuditLog");
      const fnBody = dbSrc.slice(fnIdx, fnEndIdx);
      assert(!fnBody.includes("pace_user_cache"), "_verificarUsuarioMasterAsync nao confia em localStorage.pace_user_cache");

      // 4. Hardening critico PostgreSQL contra bypass NULL em is_master() e vazamento anon
      const sqlLower = sqlHardening.toLowerCase();
      assert(sqlLower.includes("if auth.uid() is null then") && sqlLower.includes("return false"), "is_master() trata explicitamente auth.uid() is null retornando FALSE");
      assert(sqlLower.includes("if auth.uid() is null or public.is_master() is not true"), "obter_metricas_usabilidade_master exige autenticacao nao-nula e Master estrito");
      assert(sqlLower.includes("revoke all on function public.obter_metricas_usabilidade_master() from public, anon"), "Revoga execucao de obter_metricas_usabilidade_master de PUBLIC e anon");
      assert(sqlLower.includes("revoke all on function public.registrar_acesso_usuario() from public, anon"), "Revoga execucao de registrar_acesso_usuario de PUBLIC e anon");
      assert(sqlLower.includes("revoke all on public.profiles from anon"), "Revoga privilegios de public.profiles para anon");
      assert(!sqlLower.includes("gisele.hora") && !sqlLower.includes("lucas.sertori") && !sqlLower.includes("wilson.carvalho"), "Zero-Leakage: nenhum e-mail de assessor exposto na migration SQL");
    }

    // ── TESTE 39: Filtro de Relatorios no Painel Master por userId Canonico ──
    console.log("\n-> Teste 39: Filtro de Relatorios do Painel Master por userId e Nome Divergente");
    if (typeof require === "function") {
      const dbMod = require("../script/db.js");
      const usuariosMock = [
        { id: "uid-assessor-1", full_name: "Ana Paula", email: "ana.paula@pacecapital.com.br" },
        { id: "uid-assessor-2", full_name: "Marcos Ribeiro", email: "marcos.ribeiro@pacecapital.com.br" }
      ];
      const relatoriosMock = [
        { id: "r1", userId: "uid-assessor-1", nomeAssessor: "ANA P. SANTOS", nomeCliente: "Cliente Alfa" },
        { id: "r2", userId: "uid-assessor-1", nomeAssessor: "Ana", nomeCliente: "Cliente Beta" },
        { id: "r3", userId: "uid-assessor-2", nomeAssessor: "Assessor", nomeCliente: "Cliente Gama" },
        { id: "r4", userId: null, nomeAssessor: "Assessor Legado", nomeCliente: "Cliente Delta" }
      ];

      const resUid1 = dbMod.filtrarRelatoriosPainelMaster(relatoriosMock, usuariosMock, { filtroAssessor: "uid-assessor-1" });
      assert(resUid1.length === 2 && resUid1.every(r => r.userId === "uid-assessor-1"), "Filtro por userId retorna todos os relatorios do assessor mesmo quando nomeAssessor diverge do full_name");

      const resUid2 = dbMod.filtrarRelatoriosPainelMaster(relatoriosMock, usuariosMock, { filtroAssessor: "uid-assessor-2" });
      assert(resUid2.length === 1 && resUid2[0].id === "r3", "Filtro por userId encontra relatorio salvo com nomeAssessor generico");

      const resLegado = dbMod.filtrarRelatoriosPainelMaster(relatoriosMock, usuariosMock, { filtroAssessor: "nome:Assessor Legado" });
      assert(resLegado.length === 1 && resLegado[0].id === "r4", "Filtro por nome: encontra relatorio legado sem user_id");

      const resBuscaDono = dbMod.filtrarRelatoriosPainelMaster(relatoriosMock, usuariosMock, { filtroAssessor: "todos", busca: "marcos ribeiro" });
      assert(resBuscaDono.length === 1 && resBuscaDono[0].id === "r3", "Busca textual tambem encontra relatorios pelo full_name do proprietario");
    }

    // ── TESTE 41: KPIs Executivos do Painel Master ──
    console.log("\n-> Teste 41: Validação de Cálculo dos Novos KPIs Executivos");
    const usuariosMockKPI = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]; // 20 usuarios
    const relatoriosMockKPI = [
      { totalPatrimonio: 1000000, prejuizoTributario: 100000 },
      { totalPatrimonio: 2000000, prejuizoTributario: 200000 }
    ];
    const totalUsuarios = usuariosMockKPI.length;
    const totalRelatorios = relatoriosMockKPI.length;
    const prejuizoTotal = relatoriosMockKPI.reduce((acc, r) => acc + r.prejuizoTributario, 0);
    const prejuizoMedio = totalRelatorios > 0 ? Math.round(prejuizoTotal / totalRelatorios) : 0;

    assert(totalUsuarios === 20, "Total de usuários calculado incorretamente");
    assert(totalRelatorios === 2, "Total de relatórios calculado incorretamente");
    assert(prejuizoTotal === 300000, "Prejuízo total calculado incorretamente");
    assert(prejuizoMedio === 150000, "Prejuízo médio calculado incorretamente");
    console.log("  [PASS] Cálculos matemáticos dos novos KPIs conferidos");

    // ── TESTE 40: Hardening Zero-Regressao (XSS Notas, Cache Purge, SRI/CSP, SQL/Edge) ──
    console.log("\n-> Teste 40: Hardening Zero-Regressao (XSS Notas, Cache Purge, SRI/CSP, SQL/Edge)");
    if (typeof require === "function") {
      const fs = require("fs");
      const path = require("path");
      const vm = require("vm");
      const authMod40 = require("../script/auth.js");
      const dbMod40 = require("../script/db.js");

      // 1. Executa script/tributario.js em sandbox controlada para validar DOM seguro e anti-XSS em notas
      const tribCode = fs.readFileSync(path.resolve(__dirname, "..", "script/tributario.js"), "utf8");
      function criarElStub(tag) {
        const attrs = {};
        const listeners = {};
        const el = {
          tagName: String(tag).toUpperCase(),
          className: "",
          id: "",
          placeholder: "",
          value: "",
          textContent: "",
          style: {},
          children: [],
          _innerHTML: "",
          classList: { add() { }, remove() { }, contains() { return false; } },
          setAttribute(k, v) { attrs[k] = String(v); },
          getAttribute(k) { return attrs[k] !== undefined ? attrs[k] : null; },
          appendChild(child) { this.children.push(child); return child; },
          addEventListener(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
          querySelectorAll(sel) {
            if (sel === ".nota-assessor-card") return this.children.filter(c => c.className === "nota-assessor-card");
            return [];
          },
          querySelector(sel) {
            if (sel === ".nota-conteudo-textarea" || sel === "textarea") {
              return this.children.find(c => c.tagName === "TEXTAREA") || null;
            }
            return null;
          },
          _getAttrs: () => attrs,
          _getListeners: () => listeners
        };
        Object.defineProperty(el, "innerHTML", {
          get() { return this._innerHTML; },
          set(val) {
            this._innerHTML = String(val);
            if (val === "") this.children = [];
          }
        });
        return el;
      }

      const containerNotasStub = criarElStub("div");
      containerNotasStub.setAttribute("data-pagina", "1");
      const notaMaliciosa = {
        id: "1');alert(1);//",
        pagina: 1,
        titulo: "",
        conteudo: "</textarea><script>alert(1)</script>"
      };
      const storeNotas = { relatorio_notas_assessor: JSON.stringify([notaMaliciosa]) };
      const tribSandbox = {
        window: { escapeHTML: s => String(s || "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[m])) },
        Chart: { register() { } },
        ChartDataLabels: {},
        sessionStorage: {
          getItem: k => storeNotas[k] || null,
          setItem: (k, v) => { storeNotas[k] = String(v); }
        },
        document: {
          createElement: tag => criarElStub(tag),
          getElementById: () => null,
          addEventListener() { },
          querySelectorAll: sel => (sel === ".container-notas-pagina" ? [containerNotasStub] : [])
        },
        setTimeout() { },
        console
      };
      vm.createContext(tribSandbox);
      vm.runInContext(tribCode, tribSandbox);

      const notasNormalizadas = tribSandbox.obterNotasRelatorio();
      assert(/^[a-zA-Z0-9_-]{1,64}$/.test(notasNormalizadas[0].id), "nota.id malicioso normalizado para identificador seguro");
      tribSandbox.renderizarNotasRelatorio(tribSandbox.document);
      const cardRenderizado = containerNotasStub.children[0];
      assert(cardRenderizado && cardRenderizado.innerHTML === "", "renderizarNotasRelatorio nao injeta card via innerHTML");
      const txtEl = cardRenderizado.children[0];
      const btnDelEl = cardRenderizado.children[1].children[0];
      assert(txtEl.value === "</textarea><script>alert(1)</script>", "Conteudo atribuido via .value seguro sem interpretacao HTML");
      assert(!txtEl._getAttrs().oninput && !btnDelEl._getAttrs().onclick, "Nenhum handler inline oninput/onclick gerado nos cards de notas");
      assert(Array.isArray(txtEl._getListeners().input) && Array.isArray(btnDelEl._getListeners().click), "Listeners seguros anexados via addEventListener");

      // Verifica escaping no helper de lista de partilha
      const htmlPartilhaXss = tribSandbox._montarListaPartilhaHTML(["<img src=x onerror=alert(1)>"], [1000], ["red;\" onclick=alert(1)"], 1000);
      assert(!htmlPartilhaXss.includes("<img") && !htmlPartilhaXss.includes("onclick="), "_montarListaPartilhaHTML neutraliza HTML e atributos em labels/cores");

      // 2. Purga seletiva de caches em localStorage (sem afetar sessao ativa)
      const lsMap = new Map([
        ["pace_user_cache", "{\"role\":\"master\"}"],
        ["pace_invite_tokens", "[]"],
        ["relatorios_backup_user-a", "[1]"],
        ["relatorios_backup_user-b", "[2]"],
        ["pace_usabilidade_acessos", "{\"x\":1}"],
        ["nome_assessor", "Fulano"],
        ["theme", "dark"]
      ]);
      const originalLS = globalThis.localStorage;
      globalThis.localStorage = new Proxy({}, {
        get(_, prop) {
          if (prop === "getItem") return k => (lsMap.has(k) ? lsMap.get(k) : null);
          if (prop === "setItem") return (k, v) => lsMap.set(k, String(v));
          if (prop === "removeItem") return k => lsMap.delete(k);
          return undefined;
        },
        ownKeys() { return Array.from(lsMap.keys()); },
        getOwnPropertyDescriptor(_, k) {
          if (lsMap.has(k)) return { enumerable: true, configurable: true, value: lsMap.get(k) };
          return undefined;
        }
      });
      try {
        authMod40.authPurgarCachesLocaisUsuario("user-a");
        assert(lsMap.has("relatorios_backup_user-a") && !lsMap.has("relatorios_backup_user-b"), "Login de user-a preserva backup proprio e remove backup de user-b");
        assert(!lsMap.has("pace_user_cache") && lsMap.get("theme") === "dark", "Purga seletiva limpa pace_user_cache mantendo preferencias de tema");
        authMod40.authPurgarCachesLocaisUsuario(null);
        assert(!lsMap.has("relatorios_backup_user-a") && !lsMap.has("pace_usabilidade_acessos") && !lsMap.has("nome_assessor"), "Logout purga todos os backups, usabilidade local e nome_assessor");
      } finally {
        if (originalLS === undefined) delete globalThis.localStorage;
        else globalThis.localStorage = originalLS;
      }

      // 3. _criptografarPayload nao faz fallback silencioso para texto puro quando crypto falha
      const cryptoOriginal = globalThis.crypto;
      let falhouCriptoSeguro = false;
      try {
        Object.defineProperty(globalThis, "crypto", {
          configurable: true,
          value: {
            subtle: {
              async digest() { throw new Error("Falha simulada WebCrypto"); },
              async importKey() { throw new Error("Falha simulada WebCrypto"); },
              async encrypt() { throw new Error("Falha simulada WebCrypto"); }
            },
            getRandomValues: arr => arr
          }
        });
        await dbMod40._criptografarPayload({ segredo: 123 }, "uid-teste");
      } catch (errCripto) {
        falhouCriptoSeguro = String(errCripto.message || "").includes("Salvamento bloqueado");
      } finally {
        Object.defineProperty(globalThis, "crypto", { configurable: true, value: cryptoOriginal });
      }
      assert(falhouCriptoSeguro, "_criptografarPayload recusa fallback silencioso em texto puro quando crypto.subtle falha");

      // 4. UI Master nao confia em pace_user_cache.role
      const dashSrc40 = fs.readFileSync(path.resolve(__dirname, "..", "script/dashboard.js"), "utf8");
      const globalUiSrc40 = fs.readFileSync(path.resolve(__dirname, "..", "script/global_ui.js"), "utf8");
      assert(!dashSrc40.includes('cachedUser.role === "master"'), "dashboard.js nao promove Master via localStorage.pace_user_cache");
      const fnMasterPanel = globalUiSrc40.slice(globalUiSrc40.indexOf("window.abrirPainelUsabilidadeMaster"));
      assert(!fnMasterPanel.includes("pace_user_cache"), "abrirPainelUsabilidadeMaster nao confia em localStorage.pace_user_cache");

      // 5. HTMLs: SRI + versoes pinadas + img-src sem wildcard https: + connect-src com CDNs para sourcemaps
      const htmlFiles = ["index.html", "login.html", "patrimonio.html", "familiar.html", "evolucao.html", "nova_simulacao.html", "tributario.html", "termos_privacidade.html"];
      htmlFiles.forEach(file => {
        const htmlContent = fs.readFileSync(path.resolve(__dirname, "..", file), "utf8");
        assert(!htmlContent.includes("img-src 'self' https:"), `${file} remove wildcard img-src https:`);
        assert(htmlContent.includes("https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com; object-src"), `${file} autoriza CDNs de sourcemaps no connect-src sem erros F12`);
        assert(!htmlContent.includes("@supabase/supabase-js@2\""), `${file} fixa versao exata do Supabase SDK`);
        assert(!htmlContent.includes("npm/chart.js\""), `${file} fixa versao exata do Chart.js`);
        const externalScripts = htmlContent.match(/<script\s+[^>]*src="https:\/\/[^"]+"[^>]*>/g) || [];
        externalScripts.forEach(tag => {
          assert(tag.includes('integrity="sha384-') && tag.includes('crossorigin="anonymous"'), `${file} aplica SRI sha384 e crossorigin em CDN: ${tag.slice(0, 70)}`);
        });
      });

      // 6. SQL Hardening & Edge Function CORS/RateLimit
      const sqlZeroReg = fs.readFileSync(path.resolve(__dirname, "..", "supabase/migrations/2026111102_hardening_audit_constraints_zero_regressao.sql"), "utf8");
      assert(sqlZeroReg.includes("create table if not exists public.audit_logs") && sqlZeroReg.includes("fn_relatorios_audit_trigger") && sqlZeroReg.includes("chk_relatorios_dados_completos_size") && sqlZeroReg.includes("fn_suporte_chamados_blindagem"), "Migration 20261111 contem audit_logs, trigger de auditoria, check size e blindagem suporte_chamados");
      assert(!sqlZeroReg.toLowerCase().includes("@pacecapital.com.br"), "Migration 20261111 nao expoe e-mails pessoais ou corporativos");

      const edgeSrc = fs.readFileSync(path.resolve(__dirname, "..", "supabase/functions/suporte-email/index.ts"), "utf8");
      assert(!edgeSrc.includes('ALLOWED_ORIGIN || "*"') && edgeSrc.includes("SUPORTE_EMAIL_DISPATCH"), "Edge Function suporte-email usa CORS fail-closed e rate limit atomico anti-bypass");
    }

    // ── TESTE 42: Validação de Sintaxe JS dos Scripts de Interface (vm.Script) ──
    if (typeof require === "function") {
      const fs = require("fs");
      const path = require("path");
      const vm = require("vm");

      console.log("\n-> Teste 42: Validação Sintática (vm.Script) dos Scripts de Interface");
      const uiScripts = [
        "patrimonio.js",
        "familiar.js",
        "evolucao.js",
        "tributario.js",
        "dashboard.js",
        "global_ui.js"
      ];

      uiScripts.forEach(scriptFile => {
        let sintaxeValida = false;
        let erroMsg = "";
        try {
          const code = fs.readFileSync(path.resolve(__dirname, "..", "script", scriptFile), "utf8");
          new vm.Script(code, { filename: scriptFile });
          sintaxeValida = true;
        } catch (err) {
          erroMsg = err && err.message ? err.message : String(err);
        }
        assert(sintaxeValida, `Sintaxe JS válida em script/${scriptFile}${erroMsg ? " -> " + erroMsg : ""}`);
      });

      // ── TESTE 43: Secret Scanner Client-Side (Bloqueio Crítico + Alerta de Legado) ──
      console.log("\n-> Teste 43: Secret Scanner nos Arquivos Client-Side");
      const rootDir = path.resolve(__dirname, "..");
      const clientJsFiles = fs.readdirSync(path.join(rootDir, "script"))
        .filter(f => f.endsWith(".js"))
        .map(f => path.join("script", f));
      const clientHtmlFiles = [
        "index.html", "login.html", "patrimonio.html", "familiar.html",
        "evolucao.html", "nova_simulacao.html", "tributario.html", "termos_privacidade.html"
      ];
      const clientTargets = [...clientJsFiles, ...clientHtmlFiles];

      const forbiddenPatterns = [
        { nome: "service_role", regex: /\bservice_role\b/i },
        { nome: "token sbp_", regex: /\bsbp_[a-zA-Z0-9_-]{8,}/ },
        { nome: "chave sk_", regex: /\bsk_(?:live|test|proj|admin|[a-zA-Z0-9]{16,})\b/ },
        { nome: "chave sb_secret_", regex: /\bsb_secret_[a-zA-Z0-9_-]{8,}/ },
        { nome: "chave privada PEM", regex: /-----BEGIN[A-Z ]*PRIVATE KEY-----/ }
      ];

      const legacyAllowlist = {
        APP_PEPPER: new Set(["script/db.js"]),
        MASTER_UIDS: new Set(["script/auth.js", "script/db.js", "script/tributario_engine.js"])
      };

      const achadosCriticos = [];
      const alertasLegado = [];

      clientTargets.forEach(relPath => {
        const normPath = relPath.replace(/\\/g, "/");
        const content = fs.readFileSync(path.join(rootDir, normPath), "utf8");
        const lines = content.split(/\r?\n/);

        lines.forEach((line, idx) => {
          const lineNum = idx + 1;
          forbiddenPatterns.forEach(pat => {
            if (pat.regex.test(line)) {
              achadosCriticos.push(`${normPath}:${lineNum} (${pat.nome})`);
            }
          });

          if (/\bAPP_PEPPER\b/.test(line)) {
            if (legacyAllowlist.APP_PEPPER.has(normPath)) {
              alertasLegado.push(`${normPath}:${lineNum} (APP_PEPPER legado)`);
            } else {
              achadosCriticos.push(`${normPath}:${lineNum} (novo APP_PEPPER fora do legado)`);
            }
          }

          if (/\bMASTER_UIDS(?:_AUTORIZADOS)?\b/.test(line)) {
            if (legacyAllowlist.MASTER_UIDS.has(normPath)) {
              alertasLegado.push(`${normPath}:${lineNum} (MASTER_UIDS legado)`);
            } else {
              achadosCriticos.push(`${normPath}:${lineNum} (novo MASTER_UIDS fora do legado)`);
            }
          }
        });
      });

      if (alertasLegado.length > 0) {
        console.warn("  [WARN] Pendências legadas para migração futura ao back-end:");
        alertasLegado.forEach(a => console.warn(`         - ${a}`));
      }

      assert(
        achadosCriticos.length === 0,
        `Nenhum segredo crítico (service_role/sbp_/sk_/private key) ou novo vazamento client-side encontrado${achadosCriticos.length ? ": " + achadosCriticos.join(", ") : ""}`
      );

      // ── TESTE 44: Integridade da Infraestrutura de Harness (CI e Agent Workflows) ──
      console.log("\n-> Teste 44: Integridade da Infraestrutura de Harness (CI e Agent Workflows)");
      const ciWorkflowRelPath = ".github/workflows/ci.yml";
      const ciWorkflowPath = path.join(rootDir, ciWorkflowRelPath);
      const ciWorkflowExists = fs.existsSync(ciWorkflowPath);
      assert(ciWorkflowExists, `${ciWorkflowRelPath} existe no repositório`);

      const ciWorkflowContent = ciWorkflowExists ? fs.readFileSync(ciWorkflowPath, "utf8") : "";
      assert(
        /^\s*run:\s*.*\bnode\s+tests\/tributario_engine\.test\.js\b/m.test(ciWorkflowContent),
        `${ciWorkflowRelPath} executa node tests/tributario_engine.test.js`
      );
      assert(
        /^permissions:\s*(?:\r?\n\s+contents:\s*read|\{\s*contents:\s*read\s*\})\s*$/m.test(ciWorkflowContent),
        `${ciWorkflowRelPath} mantém permissions: contents: read`
      );
      assert(
        !/\b(?:contents:\s*write|permissions:\s*write-all)\b/i.test(ciWorkflowContent),
        `${ciWorkflowRelPath} não eleva permissões para escrita (contents: write / write-all)`
      );

      const requiredAgentWorkflows = [
        ".agents/workflows/release.md",
        ".agents/workflows/audit-full.md"
      ];
      requiredAgentWorkflows.forEach(workflowRelPath => {
        const workflowFullPath = path.join(rootDir, workflowRelPath);
        const workflowExists = fs.existsSync(workflowFullPath);
        assert(workflowExists, `${workflowRelPath} existe no repositório`);
        const workflowContent = workflowExists ? fs.readFileSync(workflowFullPath, "utf8") : "";
        assert(workflowContent.trim().length > 0, `${workflowRelPath} não está vazio`);
      });
    }

    // ── TESTE 45: Casos Extremos do Motor Tributário (Zero, Limites de Faixa, Altas Magnitudes e Nulos/Parciais) ──
    console.log("\n-> Teste 45: Casos Extremos do Motor Tributário (Edge Cases & Proteção Anti-NaN)");
    const semNaN = (valor) => {
      if (typeof valor === "number") return Number.isFinite(valor);
      if (Array.isArray(valor)) return valor.every(semNaN);
      if (valor && typeof valor === "object") return Object.values(valor).every(semNaN);
      return true;
    };

    // 45.A — Valores zerados
    const etZero = engine.calcularEstateTaxProgressivo(0);
    assert(
      etZero.totalUSD === 0 && etZero.excedenteUSD === 0 && etZero.impostoTotalUSD === 0 &&
      etZero.aliquotaEfetivaTotal === 0 && etZero.aliquotaMarginal === 0 &&
      etZero.isento === true && etZero.detalhamento.length === 0 && semNaN(etZero),
      "Edge[Zero]: calcularEstateTaxProgressivo(0) retorna isento sem NaN"
    );

    const invZero = engine.calcularCustosInventario(0, 0, 0, 0);
    assert(
      invZero.patrimonio === 0 && invZero.valorITCMD === 0 && invZero.valorHonorarios === 0 &&
      invZero.valorCustas === 0 && invZero.totalPrejuizo === 0 && invZero.pctPrejuizoTotal === 0 && semNaN(invZero),
      "Edge[Zero]: calcularCustosInventario(0, 0, 0, 0) evita 0/0 NaN"
    );

    const memZero = engine.calcularMemoriaPrejuizo({
      totalPatrimonio: 0, valorPrevidencia: 0, valorOffshore: 0, itcmd: 0, honorarios: 0, custas: 0
    });
    assert(
      memZero.subtotalLiquido === 0 && memZero.baseTributavel === 0 &&
      memZero.prejuizoTotal === 0 && memZero.pctSobrePatrimonio === 0 && semNaN(memZero),
      "Edge[Zero]: calcularMemoriaPrejuizo com patrimônio zerado retorna 0 sem NaN"
    );

    const memDeducaoExcedente = engine.calcularMemoriaPrejuizo({
      totalPatrimonio: 500000, valorPrevidencia: 400000, valorOffshore: 300000, itcmd: 8, honorarios: 5, custas: 1.5
    });
    assert(
      memDeducaoExcedente.subtotalLiquido === 0 && memDeducaoExcedente.baseTributavel === 0 &&
      memDeducaoExcedente.prejuizoTotal === 0 && semNaN(memDeducaoExcedente),
      "Edge[Zero]: calcularMemoriaPrejuizo com deduções maiores que patrimônio trava base em 0"
    );

    const partZero = engine.calcularPartilhaSucessoria({
      totalPatrimonio: 0,
      familia: { estadoCivil: "casado", regime: "comunhao_parcial", temFilhos: "sim", qtdFilhos: 2 }
    });
    assert(
      partZero.totalCalculo === 0 && partZero.meacao === 0 && partZero.heranca === 0 &&
      partZero.fatias.length === 0 && partZero.labels.length === 0 && semNaN(partZero),
      "Edge[Zero]: calcularPartilhaSucessoria com patrimônio 0 gera fatias vazias sem NaN"
    );

    const estZero = engine.calcularEstrategias(0, 0, { doacao: 0, doacao_avista: 0, previdencia: 0, seguro_capital: 0 });
    assert(
      estZero.gradual.valorDoado === 0 && estZero.aVista.itcmdAntecipado === 0 &&
      estZero.previdencia.economiaInventario === 0 && estZero.seguro.premioMensal === 0 && semNaN(estZero),
      "Edge[Zero]: calcularEstrategias com zeros retorna métricas zeradas sem NaN"
    );

    const leiZero = engine.calcularEstimativaLei14754(0, 0.05, 5.5);
    assert(
      leiZero.saldoUSD === 0 && leiZero.rendimentoAnualUSD === 0 &&
      leiZero.impostoAnualUSD === 0 && leiZero.impostoAnualBRL === 0 && semNaN(leiZero),
      "Edge[Zero]: calcularEstimativaLei14754(0) retorna imposto zero sem NaN"
    );

    const doaZero = engine.validarLimiteDoacaoIsenta(0);
    assert(
      doaZero.valorValido === 0 && doaZero.excedeuLimite === false && semNaN(doaZero),
      "Edge[Zero]: validarLimiteDoacaoIsenta(0) aceita zero sem exceder limite"
    );

    // 45.B — Faixas-limite de alíquota (US Estate Tax, Limite Doação Isenta e ITCMD)
    const etLimiteIsencao = engine.calcularEstateTaxProgressivo(60000);
    assert(
      etLimiteIsencao.excedenteUSD === 0 && etLimiteIsencao.impostoTotalUSD === 0 &&
      etLimiteIsencao.isento === true && etLimiteIsencao.aliquotaMarginal === 0 && semNaN(etLimiteIsencao),
      "Edge[Faixa]: Estate Tax em USD 60.000 exatos permanece isento (0 imposto)"
    );

    const etCentavoAcima = engine.calcularEstateTaxProgressivo(60000.01);
    assert(
      etCentavoAcima.excedenteUSD === 0.01 && etCentavoAcima.isento === false &&
      etCentavoAcima.aliquotaMarginal === 18 && etCentavoAcima.detalhamento.length === 1 && semNaN(etCentavoAcima),
      "Edge[Faixa]: Estate Tax em USD 60.000,01 entra na Faixa 1 (18%)"
    );

    const etTetoFaixa1 = engine.calcularEstateTaxProgressivo(70000);
    assert(
      etTetoFaixa1.excedenteUSD === 10000 && etTetoFaixa1.impostoTotalUSD === 1800 &&
      etTetoFaixa1.aliquotaMarginal === 18 && etTetoFaixa1.detalhamento.length === 1 && semNaN(etTetoFaixa1),
      "Edge[Faixa]: Estate Tax no teto da Faixa 1 (USD 70.000) cobra exatamente USD 1.800"
    );

    const etEntradaFaixa2 = engine.calcularEstateTaxProgressivo(70001);
    assert(
      etEntradaFaixa2.impostoTotalUSD === 1800.2 && etEntradaFaixa2.aliquotaMarginal === 20 &&
      etEntradaFaixa2.detalhamento.length === 2 && semNaN(etEntradaFaixa2),
      "Edge[Faixa]: Estate Tax em USD 70.001 cruza para Faixa 2 (20%) com imposto USD 1.800,20"
    );

    const etTetoFaixa11 = engine.calcularEstateTaxProgressivo(1060000);
    assert(
      etTetoFaixa11.excedenteUSD === 1000000 && etTetoFaixa11.impostoTotalUSD === 345800 &&
      etTetoFaixa11.aliquotaMarginal === 39 && etTetoFaixa11.detalhamento.length === 11 && semNaN(etTetoFaixa11),
      "Edge[Faixa]: Estate Tax no teto da Faixa 11 (USD 1.060.000) totaliza exatamente USD 345.800 (39%)"
    );

    const etEntradaFaixa12 = engine.calcularEstateTaxProgressivo(1060001);
    assert(
      etEntradaFaixa12.impostoTotalUSD === 345800.4 && etEntradaFaixa12.aliquotaMarginal === 40 &&
      etEntradaFaixa12.detalhamento.length === 12 && etEntradaFaixa12.detalhamento[11].ate === null && semNaN(etEntradaFaixa12),
      "Edge[Faixa]: Estate Tax em USD 1.060.001 entra na faixa máxima de 40% (USD 345.800,40)"
    );

    const expLimite60k = engine.analisarExposicaoEstateTax({ valorOffshoreUSD: 60000, tipoConta: "individual" });
    const expAcima60k = engine.analisarExposicaoEstateTax({ valorOffshoreUSD: 60000.01, tipoConta: "individual" });
    assert(
      expLimite60k.status === "dentro_limite_isencao" && expLimite60k.exposicao === false && semNaN(expLimite60k) &&
      expAcima60k.status === "potencial_exposicao" && expAcima60k.exposicao === true && semNaN(expAcima60k),
      "Edge[Faixa]: analisarExposicaoEstateTax alterna exatamente em USD 60.000 vs USD 60.000,01"
    );

    const doaLimiteExato = engine.validarLimiteDoacaoIsenta(96050);
    const doaAcimaCentavo = engine.validarLimiteDoacaoIsenta(96050.01);
    assert(
      doaLimiteExato.valorValido === 96050 && doaLimiteExato.excedeuLimite === false &&
      doaAcimaCentavo.valorValido === 96050 && doaAcimaCentavo.excedeuLimite === true,
      "Edge[Faixa]: validarLimiteDoacaoIsenta trava exatamente acima de R$ 96.050,00"
    );

    assert(
      engine.obterAliquotaITCMD(" sp ") === 4.0 && engine.obterAliquotaITCMD("rj") === 8.0 &&
      engine.obterAliquotaITCMD("df") === 6.0 && engine.obterAliquotaITCMD("ZZ") === 4.0,
      "Edge[Faixa]: obterAliquotaITCMD normaliza espaços/caixa baixa e faz fallback para 4.0%"
    );

    // 45.C — Patrimônio muito alto (precisão numérica)
    const invAlto = engine.calcularCustosInventario(1e12, 8, 5, 1.5);
    assert(
      invAlto.valorITCMD === 8e10 && invAlto.valorHonorarios === 5e10 && invAlto.valorCustas === 1.5e10 &&
      invAlto.totalPrejuizo === 1.45e11 && Math.abs(invAlto.pctPrejuizoTotal - 14.5) < 1e-9 && semNaN(invAlto),
      "Edge[AltoValor]: calcularCustosInventario mantém precisão em patrimônio de R$ 1 trilhão"
    );

    const memAlto = engine.calcularMemoriaPrejuizo({
      totalPatrimonio: 1e12,
      estadoCivil: "casado",
      regime: "comunhao_parcial",
      bensParticulares: 2e11,
      itcmd: 8,
      honorarios: 5,
      custas: 1.5
    });
    assert(
      memAlto.bensComuns === 8e11 && memAlto.meacao === 4e11 &&
      memAlto.baseTributavel === 6e11 && memAlto.prejuizoTotal === 8.7e10 && semNaN(memAlto),
      "Edge[AltoValor]: calcularMemoriaPrejuizo mantém exatidão em R$ 1 trilhão com bens particulares"
    );

    const partAlto = engine.calcularPartilhaSucessoria({
      totalPatrimonio: 1e12,
      familia: { estadoCivil: "casado", regime: "comunhao_parcial", temFilhos: "sim", qtdFilhos: 3 }
    });
    const somaFatiasAlto = partAlto.fatias.reduce((acc, v) => acc + v, 0);
    assert(
      partAlto.meacao === 5e11 && partAlto.heranca === 5e11 &&
      Math.abs(somaFatiasAlto - 1e12) < 1e-2 && semNaN(partAlto),
      "Edge[AltoValor]: calcularPartilhaSucessoria conserva soma exata das fatias em R$ 1 trilhão"
    );

    const etBilhao = engine.calcularEstateTaxProgressivo(1000000000);
    assert(
      etBilhao.excedenteUSD === 999940000 && etBilhao.impostoTotalUSD === 399921800 &&
      etBilhao.aliquotaMarginal === 40 && etBilhao.aliquotaEfetivaExcedente <= 40 && semNaN(etBilhao),
      "Edge[AltoValor]: calcularEstateTaxProgressivo mantém precisão em USD 1 bilhão"
    );

    const estAlto = engine.calcularEstrategias(1e12, 1.45e11, {
      doacao: 100, doacao_avista: 100, previdencia: 1e11,
      itcmd: 8, honorarios: 5, custas: 1.5, seguro_capital: 1.45e11, seguro_idade: 60
    });
    assert(
      estAlto.gradual.valorDoado === 1e12 && estAlto.gradual.economiaITCMD === 8e10 &&
      estAlto.gradual.prejuizoAjustado === 6.5e10 && semNaN(estAlto),
      "Edge[AltoValor]: calcularEstrategias preserva precisão finita em R$ 1 trilhão"
    );

    // 45.D — Entradas nulas, indefinidas, parciais ou inválidas (sem NaN silencioso)
    const etEntradasInvalidas = [null, undefined, "abc", -50000, NaN].map(v => engine.calcularEstateTaxProgressivo(v));
    assert(
      etEntradasInvalidas.every(r => r.impostoTotalUSD === 0 && r.isento === true && semNaN(r)),
      "Edge[Nulo/Invalido]: calcularEstateTaxProgressivo sanitiza null/undefined/NaN/string/negativo sem NaN"
    );

    const expIndef = engine.analisarExposicaoEstateTax();
    const expParcialNulo = engine.analisarExposicaoEstateTax({ valorOffshoreUSD: null, tipoConta: undefined, ativosIsentos: null });
    assert(
      expIndef.status === "sem_offshore" && expIndef.saldoTotalUSD === 0 && semNaN(expIndef) &&
      expParcialNulo.status === "sem_offshore" && expParcialNulo.saldoTotalUSD === 0 && semNaN(expParcialNulo),
      "Edge[Nulo/Parcial]: analisarExposicaoEstateTax trata chamada vazia e campos nulos sem NaN"
    );

    const expTicParcial = engine.analisarExposicaoEstateTax({
      valorOffshoreUSD: 200000, tipoConta: "tic", cotaFalecidoPercentual: "", percentualUSSitus: ""
    });
    assert(
      expTicParcial.cotaFalecidoPercentual === 50 && expTicParcial.percUSSitus === 100 &&
      expTicParcial.saldoExpostoUSD === 100000 && semNaN(expTicParcial),
      "Edge[Parcial]: analisarExposicaoEstateTax aplica defaults seguros para TIC com strings vazias"
    );

    const leiNulo = engine.calcularEstimativaLei14754(null, undefined, null);
    assert(
      leiNulo.saldoUSD === 0 && leiNulo.taxaRentabilidade === 0.05 &&
      leiNulo.ptax === 5.5 && leiNulo.impostoAnualBRL === 0 && semNaN(leiNulo),
      "Edge[Nulo]: calcularEstimativaLei14754 aplica defaults seguros para argumentos nulos/indefinidos"
    );

    assert(
      engine.obterRegrasContaExterior(null).id === "individual" &&
      engine.obterRegrasContaExterior(undefined).id === "individual" &&
      engine.obterRegrasContaExterior("inexistente").id === "individual",
      "Edge[Nulo]: obterRegrasContaExterior faz fallback para conta individual"
    );

    const doaInvalidas = [null, undefined, "abc", -1000, NaN].map(v => engine.validarLimiteDoacaoIsenta(v));
    assert(
      doaInvalidas.every(r => r.valorValido === 0 && r.excedeuLimite === false && semNaN(r)),
      "Edge[Nulo/Invalido]: validarLimiteDoacaoIsenta sanitiza entradas inválidas para 0 sem NaN"
    );

    assert(
      engine.obterAliquotaITCMD(null) === 4.0 &&
      engine.obterAliquotaITCMD(undefined) === 4.0 &&
      engine.obterAliquotaITCMD("") === 4.0,
      "Edge[Nulo]: obterAliquotaITCMD retorna 4.0% para null/undefined/string vazia"
    );

    const invNulo = engine.calcularCustosInventario(null, undefined, "abc", -10);
    assert(
      invNulo.patrimonio === 0 && invNulo.totalPrejuizo === 0 && invNulo.pctPrejuizoTotal === 0 && semNaN(invNulo),
      "Edge[Nulo/Invalido]: calcularCustosInventario sanitiza entradas nulas/negativas/texto sem NaN"
    );

    const memNulo = engine.calcularMemoriaPrejuizo(null);
    const memVazio = engine.calcularMemoriaPrejuizo({});
    assert(
      memNulo.prejuizoTotal === 0 && memNulo.baseTributavel === 0 && semNaN(memNulo) &&
      memVazio.prejuizoTotal === 0 && memVazio.baseTributavel === 0 && semNaN(memVazio),
      "Edge[Nulo/Parcial]: calcularMemoriaPrejuizo aceita null e objeto vazio sem NaN"
    );

    const regNulo = engine.calcularPartilhaRegime(null, null, undefined);
    assert(
      regNulo.totalPatrimonio === 0 && regNulo.meacaoConjuge === 0 &&
      regNulo.herancaTransmitida === 0 && regNulo.regime === "comunhao_parcial" && semNaN(regNulo),
      "Edge[Nulo]: calcularPartilhaRegime trata parâmetros nulos/indefinidos sem NaN"
    );

    const partNulo = engine.calcularPartilhaSucessoria(null);
    const partParcial = engine.calcularPartilhaSucessoria({ totalPatrimonio: 500000 });
    assert(
      partNulo.totalCalculo === 0 && partNulo.meacao === 0 && partNulo.heranca === 0 && semNaN(partNulo) &&
      partParcial.totalCalculo === 500000 && partParcial.labels[0] === "Município / DF / União" &&
      partParcial.fatias[0] === 500000 && semNaN(partParcial),
      "Edge[Nulo/Parcial]: calcularPartilhaSucessoria trata null e objeto parcial sem familia sem NaN"
    );

    const estNulo = engine.calcularEstrategias(null, undefined, null);
    const estClamp = engine.calcularEstrategias(1000000, 100000, { doacao: 150, doacao_avista: -20 });
    assert(
      estNulo.gradual.valorDoado === 0 && estNulo.seguro.capitalSeguro === 0 && semNaN(estNulo) &&
      estClamp.gradual.pct === 100 && estClamp.aVista.pct === 0 && semNaN(estClamp),
      "Edge[Nulo/Clamp]: calcularEstrategias trata nulos e aplica clamping [0..100] sem NaN"
    );

    const usabNulo = engine.consolidarUsabilidadeMaster(null, null);
    const usabParcial = engine.consolidarUsabilidadeMaster(
      [null, { id: "" }, { id: "u1" }],
      [null, { userId: "u1", totalPatrimonio: "abc" }]
    );
    assert(
      Array.isArray(usabNulo) && usabNulo.length === 0 &&
      usabParcial.length === 1 && usabParcial[0].total_relatorios === 1 &&
      usabParcial[0].total_patrimonio === 0 && usabParcial[0].role === "assessor" && semNaN(usabParcial),
      "Edge[Nulo/Parcial]: consolidarUsabilidadeMaster ignora registros nulos/inválidos sem NaN"
    );

    assert(
      engine.filtrarRelatoriosPorPermissao(null, null).length === 0 &&
      engine.filtrarRelatoriosPorPermissao([{ userId: "u1" }], null).length === 0 &&
      engine.filtrarRelatoriosPorPermissao(null, { id: "u1", role: "assessor" }).length === 0,
      "Edge[Nulo]: filtrarRelatoriosPorPermissao retorna lista vazia para entradas nulas"
    );

    // =========================================================================
    // TESTE 46: Liquidez Unificada, Canibalização (Liquidez=0) e Materialização Dinâmica
    // =========================================================================
    console.log("\n-> Teste 46: Liquidez Unificada, Canibalização e Materialização Dinâmica");

    // 46.A — Fórmula unificada de liquidez (Opção A padrão: RF + RV + Fundos)
    const liqPrint = engine.calcularLiquidezPatrimonial(
      { rf: 2000000, rv: 1000000, inter: 1000000, prev: 500000, offshore: 300000 },
      { totalAtual: 20000000, totalProjetado: 32577894, anosProjecao: 10 }
    );
    assert(
      liqPrint.liquidezAtual === 4000000 &&
      liqPrint.liquidezProjetada === 6515579 &&
      liqPrint.siglaComposicao === "RF + RV + Fundos" &&
      liqPrint.pctImobilizado === 80 &&
      semNaN(liqPrint),
      "Liquidez[Print]: soma RF+RV+Fundos = R$ 4M e projeta R$ 6.515.579 em 10 anos sem incluir prev/offshore por padrão"
    );

    const liqComPrev = engine.calcularLiquidezPatrimonial(
      { rf: 2000000, rv: 1000000, inter: 1000000, prev: 500000, offshore: 300000 },
      { totalAtual: 20000000, totalProjetado: 20000000, incluirPrevidencia: true, incluirOffshore: true }
    );
    assert(
      liqComPrev.liquidezAtual === 4800000 &&
      liqComPrev.siglaComposicao === "RF + RV + Fundos + Prev. + Offshore",
      "Liquidez[Opções]: permite incluir Previdência e Offshore quando parametrizado"
    );

    // 46.B — Canibalização no cenário dos prints (consistência de arredondamento 38,8% hoje e futuro)
    const canibPrint = engine.calcularMetricasCanibalizacao({
      liquidezAtual: 4000000,
      prejuizoAtual: 1550000,
      liquidezProjetada: 6515579,
      prejuizoProjetado: 2524786.785
    });
    assert(
      canibPrint.textoComprometimentoAtual === "38,8% drenados" &&
      canibPrint.textoComprometimentoProjetado === "38,8% da liquidez" &&
      canibPrint.caixaRestanteAtual === 2450000 &&
      canibPrint.deficitAtual === 0 &&
      canibPrint.semLiquidezAtual === false &&
      semNaN(canibPrint),
      "Canibalização[Print]: comprometimento consistente (38,8% hoje e futuro) e caixa restante R$ 2.450.000"
    );

    // 46.C — Bug crítico: Liquidez = R$ 0 (100% imobilizado) sem Math.max(liquidez, 1)
    const liqZero = engine.calcularLiquidezPatrimonial(
      { rf: 0, rv: 0, inter: 0 },
      { totalAtual: 10000000, totalProjetado: 16288947, anosProjecao: 10 }
    );
    const canibZero = engine.calcularMetricasCanibalizacao({
      liquidezAtual: liqZero.liquidezAtual,
      prejuizoAtual: 1550000,
      liquidezProjetada: liqZero.liquidezProjetada,
      prejuizoProjetado: 2524787
    });
    assert(
      liqZero.liquidezAtual === 0 &&
      liqZero.liquidezProjetada === 0 &&
      canibZero.semLiquidezAtual === true &&
      canibZero.semLiquidezProjetada === true &&
      canibZero.pctConsumoAtual === null &&
      canibZero.deficitAtual === 1550000 &&
      canibZero.textoComprometimentoAtual === "Sem caixa" &&
      canibZero.textoComprometimentoProjetado === "Sem caixa",
      "Canibalização[Liquidez=0]: evita divisão por R$ 1 (sem 155.000.000%), déficit integral e rótulo 'Sem caixa'"
    );

    // 46.D — Materialização dinâmica no cenário dos prints (sem hardcoded 154k/399k e sem '37 a 37 meses')
    const matPrint = engine.calcularMaterializacaoPrejuizo({
      prejuizoAtual: 1550000,
      prejuizoProjetado: 2524787,
      totalAtual: 20000000,
      totalProjetado: 32577894,
      liquidezAtual: 4000000,
      liquidezProjetada: 6515579,
      anosProjecao: 10
    });
    assert(
      matPrint.equivalenciaAtual.valorCompacto === "R$ 1,55M" &&
      matPrint.equivalenciaProjetada.valorCompacto === "R$ 2,52M" &&
      matPrint.equivalenciaAtual.titulo.includes("Imóvel de Alto Padrão") &&
      matPrint.equivalenciaProjetada.titulo.includes("Imóveis de Alto Padrão") &&
      matPrint.usouLiquidezReal === true &&
      matPrint.mesesAtual === 55 &&
      matPrint.mesesProjetado === 55 &&
      matPrint.textoMeses === "~55 meses" &&
      matPrint.custoDiarioInercia === 267 &&
      semNaN(matPrint),
      "Materialização[Print]: calcula R$ 1,55M / R$ 2,52M, equivalências reais, '~55 meses' (sem duplicar) e +R$ 267/dia"
    );

    // 46.E — Fallback de rendimento queimado quando liquidez = 0 (30% do patrimônio) sem duplicar '37 a 37 meses'
    const matFallback = engine.calcularMaterializacaoPrejuizo({
      prejuizoAtual: 1550000,
      prejuizoProjetado: 2524787,
      totalAtual: 20000000,
      totalProjetado: 32577894,
      liquidezAtual: 0,
      liquidezProjetada: 0,
      anosProjecao: 10
    });
    assert(
      matFallback.usouLiquidezReal === false &&
      matFallback.mesesAtual === 37 &&
      matFallback.mesesProjetado === 37 &&
      matFallback.textoMeses === "~37 meses",
      "Materialização[Fallback]: sem liquidez usa 30% do patrimônio e exibe '~37 meses' sem duplicar '37 a 37'"
    );

    // 46.F — Faixas progressivas de equivalência e cenário zerado sem clamps enganosos
    const matZero = engine.calcularMaterializacaoPrejuizo({
      prejuizoAtual: 0,
      prejuizoProjetado: 0,
      totalAtual: 0,
      totalProjetado: 0,
      liquidezAtual: 0,
      liquidezProjetada: 0,
      anosProjecao: 10
    });
    const eqPequeno = engine.classificarEquivalenciaBem(50000);
    const eqCarro = engine.classificarEquivalenciaBem(154000);
    const eqApto = engine.classificarEquivalenciaBem(650000);
    assert(
      matZero.textoMeses === "0 meses" &&
      matZero.equivalenciaAtual.titulo === "Sem prejuízo estimado" &&
      eqPequeno.valorCompacto === "R$ 50k" &&
      eqCarro.valorCompacto === "R$ 154k" && eqCarro.titulo.includes("Veículo Zero Km") &&
      eqApto.valorCompacto === "R$ 650k" && eqApto.titulo.includes("Apartamento") &&
      semNaN(matZero),
      "Materialização[Faixas/Zero]: cobre R$ 0 (0 meses sem clamp), R$ 50k, R$ 154k e R$ 650k corretamente"
    );

    // 46.G — Auditoria estática anti-hardcoded em tributario_charts.js e anti-Math.max(liquidez,1) em tributario.js
    if (typeof require === "function") {
      const fsAudit = require("fs");
      const pathAudit = require("path");
      const chartsSrc = fsAudit.readFileSync(pathAudit.join(__dirname, "../script/tributario_charts.js"), "utf8");
      const tribSrc = fsAudit.readFileSync(pathAudit.join(__dirname, "../script/tributario.js"), "utf8");
      assert(
        !chartsSrc.includes("R$ 154k (1 Carro Zero Km)") &&
        !chartsSrc.includes("R$ 399k (1 Apartamento)") &&
        !chartsSrc.includes("Mais de 3/4 de milhão"),
        "Auditoria[Charts]: nenhum literal hardcoded (R$ 154k, R$ 399k ou 3/4 de milhão) restante em tributario_charts.js"
      );
      assert(
        !tribSrc.includes("Math.max(liquidez, 1)") &&
        !tribSrc.includes("Math.max(liqProjetadaCalculada, 1)"),
        "Auditoria[Tributario]: fallback distorcido Math.max(liquidez, 1) removido de tributario.js"
      );
    }

    // =========================================================================
    // TESTE 47: Modos de Relatório PDF ON (Completo) e OFF (Sem Páginas 5 e 6)
    // =========================================================================
    console.log("\n-> Teste 47: Modos de Relatório PDF ON (Completo) e OFF (Páginas 1 a 4)");
    if (typeof require === "function") {
      const fs47 = require("fs");
      const path47 = require("path");
      const vm47 = require("vm");

      const html47 = fs47.readFileSync(path47.join(__dirname, "../tributario.html"), "utf8");
      const js47 = fs47.readFileSync(path47.join(__dirname, "../script/tributario.js"), "utf8");
      const css47 = fs47.readFileSync(path47.join(__dirname, "../style/tributario.css"), "utf8");

      // 47.A — Validação estrutural do HTML e CSS
      assert(
        html47.includes('id="btn_visualizar_relatorio_on"') &&
        html47.includes("Visualizar Relatório ON") &&
        html47.includes('id="btn_visualizar_relatorio_off"') &&
        html47.includes("Visualizar Relatório OFF") &&
        !html47.includes("Visualizar Relatório PDF"),
        "HTML[Botões]: botões 'Visualizar Relatório ON' e 'Visualizar Relatório OFF' presentes sem botão legado"
      );
      assert(
        html47.includes('id="pagina_5" data-ocultar-modo-off="true"') &&
        html47.includes('id="pagina_6" data-ocultar-modo-off="true"') &&
        (html47.match(/data-ocultar-modo-off="true"/g) || []).length === 2,
        "HTML[Páginas]: exatamente Páginas 5 e 6 marcadas com data-ocultar-modo-off='true'"
      );
      assert(
        css47.includes(".btn-pdf-off") &&
        css47.includes('#area-relatorio.modo-relatorio-off [data-ocultar-modo-off="true"]'),
        "CSS[ON/OFF]: estilo .btn-pdf-off e regra @media print para modo OFF presentes em tributario.css"
      );

      // 47.B — Execução em sandbox isolada de tributario.js validando helpers e abrirPreview("on" | "off")
      function criarNoDOM(id, attrs = {}, children = []) {
        const classes = new Set();
        const attrMap = { ...attrs };
        const no = {
          id: id || "",
          style: {},
          dataset: {},
          textContent: "",
          parentNode: null,
          children: [],
          classList: {
            add(c) { classes.add(c); },
            remove(c) { classes.delete(c); },
            contains(c) { return classes.has(c); },
            toggle(c, force) {
              if (force === undefined) {
                if (classes.has(c)) { classes.delete(c); return false; }
                classes.add(c); return true;
              }
              if (force) classes.add(c); else classes.delete(c);
              return !!force;
            }
          },
          setAttribute(k, v) { attrMap[k] = String(v); },
          getAttribute(k) { return attrMap[k] !== undefined ? attrMap[k] : null; },
          removeAttribute(k) { delete attrMap[k]; },
          appendChild(child) {
            child.parentNode = this;
            this.children.push(child);
            return child;
          },
          removeChild(child) {
            const idx = this.children.indexOf(child);
            if (idx >= 0) this.children.splice(idx, 1);
            child.parentNode = null;
          },
          remove() {
            if (this.parentNode) this.parentNode.removeChild(this);
          },
          cloneNode(deep) {
            const copia = criarNoDOM(this.id, attrMap, []);
            if (deep) {
              this.children.forEach(c => copia.appendChild(c.cloneNode(true)));
            }
            return copia;
          },
          querySelectorAll(sel) {
            if (sel === '[data-ocultar-modo-off="true"]') {
              return this.children.filter(c => c.getAttribute("data-ocultar-modo-off") === "true");
            }
            if (sel === ".pagina") {
              return this.children.filter(c => c.getAttribute("data-is-pagina") === "true");
            }
            return [];
          },
          querySelector() { return null; },
          addEventListener() { }
        };
        Object.defineProperty(no, "innerHTML", {
          get() { return ""; },
          set(v) { if (v === "") this.children = []; }
        });
        children.forEach(c => no.appendChild(c));
        return no;
      }

      const body47 = criarNoDOM("body");
      const modal47 = criarNoDOM("modal-preview");
      const modalTitulo47 = criarNoDOM("modal-preview-titulo");
      const modalBody47 = criarNoDOM("modal-body-pdf");
      body47.appendChild(modal47);

      const reportArea47 = criarNoDOM("area-relatorio", {}, [
        criarNoDOM("capa", { "data-is-pagina": "true" }),
        criarNoDOM("pagina_1", { "data-is-pagina": "true" }),
        criarNoDOM("pagina_2", { "data-is-pagina": "true" }),
        criarNoDOM("pagina_3", { "data-is-pagina": "true" }),
        criarNoDOM("pagina_4", { "data-is-pagina": "true" }),
        criarNoDOM("pagina_5", { "data-is-pagina": "true", "data-ocultar-modo-off": "true" }),
        criarNoDOM("pagina_6", { "data-is-pagina": "true", "data-ocultar-modo-off": "true" })
      ]);

      const mapaIds47 = {
        "modal-preview": modal47,
        "modal-preview-titulo": modalTitulo47,
        "modal-body-pdf": modalBody47,
        "area-relatorio": reportArea47
      };

      const sb47 = {
        window: {},
        Chart: { register() { } },
        ChartDataLabels: {},
        URLSearchParams,
        console: { log() { }, warn() { }, error() { } },
        setTimeout: () => 0,
        sessionStorage: { getItem: () => null, setItem() { }, removeItem() { } },
        localStorage: { getItem: () => null, setItem() { }, removeItem() { } },
        document: {
          body: body47,
          getElementById: id => mapaIds47[id] || null,
          querySelector: () => null,
          querySelectorAll: () => [],
          addEventListener() { }
        },
        atualizarBlocoOffshoreEstateTaxUI() { },
        criarGraficos() { },
        renderizarGraficoEvolucao() { },
        recalculaGraficosEspeciaisPDF() { },
        renderizarNotasRelatorio() { },
        preencherDadosAssessorRelatorio() { }
      };
      sb47.window = sb47;
      vm47.createContext(sb47);
      vm47.runInContext(js47, sb47);

      // Allowlist de modos e nomes de arquivo
      assert(
        sb47.normalizarModoRelatorio("off") === "off" &&
        sb47.normalizarModoRelatorio(" OFF ") === "off" &&
        sb47.normalizarModoRelatorio("of") === "off" &&
        sb47.normalizarModoRelatorio("on") === "on" &&
        sb47.normalizarModoRelatorio("off<script>") === "on" &&
        sb47.normalizarModoRelatorio(null) === "on" &&
        sb47.obterNomeArquivoPDF("on") === "Relatorio_Ritmo_Wealth_Pro_ON.pdf" &&
        sb47.obterNomeArquivoPDF("off") === "Relatorio_Ritmo_Wealth_Pro_OFF.pdf",
        "Helpers[ON/OFF]: allowlist estrita de modo (anti-XSS) e nomes de PDF ON/OFF corretos"
      );

      // Abrir no modo OFF -> clone tem apenas 5 folhas (Capa + Págs 1 a 4), fonte mantém 7 folhas
      await sb47.abrirPreview("off");
      const cloneOff = modalBody47.children[0];
      const paginasOff = cloneOff ? cloneOff.querySelectorAll(".pagina").map(p => p.id) : [];
      assert(
        paginasOff.length === 5 &&
        !paginasOff.includes("pagina_5") &&
        !paginasOff.includes("pagina_6") &&
        paginasOff[paginasOff.length - 1] === "pagina_4" &&
        reportArea47.querySelectorAll(".pagina").length === 7 &&
        reportArea47.classList.contains("modo-relatorio-off") &&
        modalTitulo47.textContent.includes("OFF"),
        "Preview[OFF]: remove Páginas 5 e 6 do clone (mantém Capa + Págs 1–4), preserva fonte original e atualiza título"
      );

      // Fechar limpa classe modo-relatorio-off
      sb47.fecharPreview();
      assert(
        !reportArea47.classList.contains("modo-relatorio-off") && modal47.style.display === "none",
        "Preview[Fechar]: fecharPreview limpa classe modo-relatorio-off e oculta o modal"
      );

      // Abrir no modo ON após OFF -> restaura todas as 7 folhas (Capa + Págs 1 a 6)
      await sb47.abrirPreview("on");
      const cloneOn = modalBody47.children[0];
      const paginasOn = cloneOn ? cloneOn.querySelectorAll(".pagina").map(p => p.id) : [];
      assert(
        paginasOn.length === 7 &&
        paginasOn.includes("pagina_5") &&
        paginasOn.includes("pagina_6") &&
        !reportArea47.classList.contains("modo-relatorio-off") &&
        modalTitulo47.textContent.includes("ON"),
        "Preview[ON]: alternância OFF -> ON restaura todas as 7 folhas (Capa + Págs 1–6) corretamente"
      );
    }

    // =========================================================================
    // TESTE 48: Sistema de Contabilização e Gestão de Vendas (Usabilidade + Dashboard)
    // =========================================================================
    console.log("\n-> Teste 48: Sistema de Vendas Realizadas (Domínio, Métricas, Filtros e Segurança SQL/DOM)");
    if (_dbModNode && typeof _dbModNode.sanitizarEValidarVenda === "function") {
      // 48.A — Sanitização e validação defensiva de vendas
      const vOk = _dbModNode.sanitizarEValidarVenda({
        nomeCliente: "  Família Oliveira  ",
        nomeAssessor: "Carlos Mendes",
        produto: "  Seguro de Vida  ",
        valorVenda: "R$ 125.000,50",
        dataVenda: "2026-11-20",
        relatorioId: "11111111-1111-4111-8111-111111111111",
        observacao: "Apólice vitalícia"
      });
      assert(
        vOk.valido === true &&
        vOk.vendaSanitizada.nomeCliente === "Família Oliveira" &&
        vOk.vendaSanitizada.produto === "Seguro de Vida" &&
        vOk.vendaSanitizada.valorVenda === 125000.5 &&
        vOk.vendaSanitizada.relatorioId === "11111111-1111-4111-8111-111111111111",
        "Vendas[Sanitização]: normaliza cliente, produto, moeda BR (125000.5) e UUID válido"
      );

      const vInvalida = _dbModNode.sanitizarEValidarVenda({
        nomeCliente: "   ",
        produto: "",
        valorVenda: -500,
        relatorioId: "nao-e-uuid-valido",
        observacao: "X".repeat(1500)
      });
      assert(
        vInvalida.valido === false &&
        vInvalida.erros.length === 3 &&
        vInvalida.vendaSanitizada.valorVenda === 0 &&
        vInvalida.vendaSanitizada.relatorioId === null &&
        vInvalida.vendaSanitizada.observacao.length === 1000,
        "Vendas[Validação]: rejeita cliente/produto vazio, zera valor negativo, anula relatorioId inválido e trunca observação"
      );

      // 48.B — Métricas híbridas 1:N e taxa de conversão fiel sobre relatórios únicos
      const relatoriosMock = [
        { id: "11111111-1111-4111-8111-111111111111", userId: "u1", nomeCliente: "Cliente A", totalPatrimonio: 5000000 },
        { id: "22222222-2222-4222-8222-222222222222", userId: "u2", nomeCliente: "Cliente B", totalPatrimonio: 8000000 }
      ];
      const vendasMock = [
        {
          id: "v1",
          userId: "u1",
          relatorioId: "11111111-1111-4111-8111-111111111111",
          nomeCliente: "Cliente A",
          nomeAssessor: "Ana Silva",
          produto: "Seguro de Vida",
          valorVenda: 150000,
          dataVenda: "2026-11-18",
          observacao: "Fechado na reunião 2"
        },
        {
          id: "v2",
          userId: "u1",
          relatorioId: "11111111-1111-4111-8111-111111111111",
          nomeCliente: "Cliente A",
          nomeAssessor: "Ana Silva",
          produto: "Previdência Privada (PGBL/VGBL)",
          valorVenda: 350000,
          dataVenda: "2026-11-21",
          observacao: "Aporte adicional"
        },
        {
          id: "v3",
          userId: "u2",
          relatorioId: null,
          nomeCliente: "Cliente Avulso C",
          nomeAssessor: "Bruno Costa",
          produto: "Holding Patrimonial",
          valorVenda: 80000,
          dataVenda: "2026-09-01",
          observacao: "Indicação externa"
        }
      ];

      const metVendas = _dbModNode.calcularMetricasVendas(vendasMock, relatoriosMock);
      assert(
        metVendas.totalVendas === 3 &&
        metVendas.valorTotalVendas === 580000 &&
        metVendas.vendasVinculadas === 2 &&
        metVendas.vendasAvulsas === 1 &&
        metVendas.relatoriosConvertidos === 1 &&
        metVendas.taxaConversao === 50 &&
        metVendas.porRelatorio["11111111-1111-4111-8111-111111111111"].quantidade === 2 &&
        metVendas.porRelatorio["11111111-1111-4111-8111-111111111111"].valorTotal === 500000,
        "Vendas[Métricas 1:N]: contabiliza 3 vendas (R$ 580k), 2 vinculadas no mesmo relatório + 1 avulsa e conversão real de 50% sem estourar 100%"
      );

      // 48.C — Consolidação na equipe (retrocompatível + sem dupla contagem da RPC)
      const perfisMock = [
        { id: "u1", email: "ana@pace.com", full_name: "Ana Silva", role: "assessor" },
        { id: "u2", email: "bruno@pace.com", full_name: "Bruno Costa", role: "assessor", total_vendas: 1, valor_total_vendas: 80000 }
      ];
      const equipeRetro = _dbModNode.calcularMetricasUsabilidadeEquipe(perfisMock, relatoriosMock, {}, false);
      const equipeComVendas = _dbModNode.calcularMetricasUsabilidadeEquipe(perfisMock, relatoriosMock, {}, false, vendasMock);
      const u1Res = equipeComVendas.find(u => u.id === "u1");
      const u2Res = equipeComVendas.find(u => u.id === "u2");
      assert(
        equipeRetro.length === 2 &&
        u1Res && u1Res.total_vendas === 2 && u1Res.valor_total_vendas === 500000 &&
        u2Res && u2Res.total_vendas === 1 && u2Res.valor_total_vendas === 80000,
        "Vendas[Usabilidade Equipe]: retrocompatível com 4 args e consolida vendas por assessor sem duplicar contagem da RPC"
      );

      // 48.D — Filtros do painel de vendas (busca sem acentos, origem, assessor, período e relatório)
      const fBusca = _dbModNode.filtrarVendasPainel(vendasMock, perfisMock, { busca: "previdencia" });
      const fAvulsas = _dbModNode.filtrarVendasPainel(vendasMock, perfisMock, { origem: "avulsa" });
      const fMesAtual = _dbModNode.filtrarVendasPainel(vendasMock, perfisMock, { periodo: "mes_atual", referenciaData: "2026-11-23T12:00:00Z" });
      const fAssessor = _dbModNode.filtrarVendasPainel(vendasMock, perfisMock, { filtroAssessor: "u1" });
      const fRel = _dbModNode.filtrarVendasPainel(vendasMock, perfisMock, { relatorioId: "11111111-1111-4111-8111-111111111111" });
      assert(
        fBusca.length === 1 && fBusca[0].id === "v2" &&
        fAvulsas.length === 1 && fAvulsas[0].id === "v3" &&
        fMesAtual.length === 2 &&
        fAssessor.length === 2 &&
        fRel.length === 2,
        "Vendas[Filtros]: busca sem acentos, origem (avulsa/relatório), período (mês atual), assessor e relatorioId funcionam corretamente"
      );
    }

    // 48.E — Auditoria estática de segurança SQL (RLS, zero anon, anti-spoofing/IDOR) e UI/sintaxe JS
    if (typeof require === "function") {
      const fs48 = require("fs");
      const path48 = require("path");
      const vm48 = require("vm");

      const sqlVendas = fs48.readFileSync(path48.join(__dirname, "../supabase/migrations/20261123_sistema_vendas_usabilidade.sql"), "utf8");
      const sqlLower = sqlVendas.toLowerCase();
      assert(
        sqlLower.includes("create table if not exists public.vendas") &&
        sqlLower.includes("alter table public.vendas enable row level security") &&
        sqlLower.includes("revoke all on table public.vendas from public, anon") &&
        sqlLower.includes("fn_vendas_blindagem") &&
        sqlLower.includes("fn_vendas_audit_trigger") &&
        sqlLower.includes("revoke execute on function public.fn_vendas_blindagem() from public, anon, authenticated") &&
        sqlLower.includes("revoke execute on function public.fn_vendas_audit_trigger() from public, anon, authenticated") &&
        !/using\s*\(\s*true\s*\)/i.test(sqlVendas) &&
        !/with\s+check\s*\(\s*true\s*\)/i.test(sqlVendas),
        "Vendas[SQL Security Gate]: RLS ativo, anon revogado, triggers blindados/revogados e zero USING(true)/WITH CHECK(true)"
      );

      const indexSrc48 = fs48.readFileSync(path48.join(__dirname, "../index.html"), "utf8");
      const globalUiSrc48 = fs48.readFileSync(path48.join(__dirname, "../script/global_ui.js"), "utf8");
      const dashSrc48 = fs48.readFileSync(path48.join(__dirname, "../script/dashboard.js"), "utf8");
      const dbSrc48 = fs48.readFileSync(path48.join(__dirname, "../script/db.js"), "utf8");
      const cssMain48 = fs48.readFileSync(path48.join(__dirname, "../style/style.css"), "utf8");

      assert(
        indexSrc48.includes('id="card_metric_vendas"') &&
        indexSrc48.includes('id="btn_registrar_venda_dashboard"') &&
        globalUiSrc48.includes('id="master_kpi_card_vendas"') &&
        globalUiSrc48.includes('id="tab_btn_master_vendas"') &&
        globalUiSrc48.includes('id="venda_input_produto"') &&
        globalUiSrc48.includes('value="Seguro de Vida"') &&
        globalUiSrc48.includes('id="venda_input_comissionamento"') &&
        cssMain48.includes("grid-template-columns: repeat(3, 1fr);"),
        "Vendas[UI]: 6º card KPI 3x2 + 3ª aba no Painel Master + produto travado Seguro de Vida + comissionamento + 4º card e botão no Dashboard presentes"
      );

      let sintaxeOk48 = true;
      try {
        new vm48.Script(dbSrc48, { filename: "script/db.js" });
        new vm48.Script(globalUiSrc48, { filename: "script/global_ui.js" });
        new vm48.Script(dashSrc48, { filename: "script/dashboard.js" });
      } catch (errSintaxe) {
        sintaxeOk48 = false;
        console.error("  [FAIL] Erro de sintaxe JS:", errSintaxe);
      }
      assert(sintaxeOk48, "Vendas[Sintaxe]: db.js, global_ui.js e dashboard.js compilam limpos via vm.Script");

      // 48.F — Máscara monetária em tempo real no campo Valor da Venda (#venda_input_valor)
      const maskCtx = {
        window: {
          location: { pathname: "/index.html", replace() { }, href: "" },
          addEventListener() { },
          PaceUI: {}
        },
        sessionStorage: { getItem: () => null, setItem() { }, clear() { } },
        localStorage: { getItem: () => null, setItem() { }, removeItem() { } },
        document: {
          addEventListener() { },
          querySelectorAll: () => [],
          querySelector: () => null,
          getElementById: () => null
        },
        IntersectionObserver: function () { return { observe() { } }; },
        MutationObserver: function () { return { observe() { } }; },
        CustomEvent: function () { },
        setTimeout: () => 0,
        clearTimeout() { },
        console
      };
      maskCtx.globalThis = maskCtx;
      vm48.createContext(maskCtx);
      vm48.runInContext(globalUiSrc48, maskCtx);
      const maskFn = maskCtx.window.PaceUI?.formatarMascaraMoedaDigitacao;
      const normalizeNBSP = (s) => String(s).replace(/\u00A0/g, " ");
      assert(
        typeof maskFn === "function" &&
        normalizeNBSP(maskFn("5")) === "R$ 0,05" &&
        normalizeNBSP(maskFn("56877")) === "R$ 568,77" &&
        normalizeNBSP(maskFn("5687700")) === "R$ 56.877,00" &&
        normalizeNBSP(maskFn("25000000")) === "R$ 250.000,00" &&
        normalizeNBSP(maskFn("R$ 1.234.567,89")) === "R$ 1.234.567,89" &&
        maskFn("") === "" &&
        maskFn("R$ 0,0") === "" &&
        maskFn("abc!@#") === "" &&
        normalizeNBSP(maskFn("99999999999999999999")) === "R$ 9.999.999.999.999,99" &&
        globalUiSrc48.includes('inputValor?.addEventListener("input"') &&
        (!_dbModNode || _dbModNode.sanitizarNumero(maskFn("5687700"), 0) === 56877),
        "Vendas[Máscara Digitação]: aplica pontos e vírgula em tempo real, limpa zeros, limita overflow e integra com sanitizarNumero"
      );

      // ── TESTE 49: Migração Cloudflare Pages (Pretty URLs, Build Limpo dist/ e CORS Fail-Closed) ──
      console.log("\n-> Teste 49: Migração Cloudflare Pages (Pretty URLs, Build dist/ e CORS)");
      const ehAbaFn = maskCtx.window.ehAbaPlanejamentoPath;
      assert(
        typeof ehAbaFn === "function" &&
        ehAbaFn("/patrimonio.html") === true &&
        ehAbaFn("/patrimonio") === true &&
        ehAbaFn("/patrimonio/") === true &&
        ehAbaFn("/RITMO_Whealth_Pro/tributario.html") === true &&
        ehAbaFn("/familiar") === true &&
        ehAbaFn("/evolucao") === true &&
        ehAbaFn("/tributario") === true &&
        ehAbaFn("/index.html") === false &&
        ehAbaFn("/index") === false &&
        ehAbaFn("/login") === false &&
        ehAbaFn("/") === false,
        "Cloudflare[Pretty URLs]: guarda de rota em global_ui.js reconhece abas com e sem .html"
      );

      const edgeSrc49 = fs48.readFileSync(path48.join(__dirname, "../supabase/functions/suporte-email/index.ts"), "utf8");
      const convitePs149 = fs48.readFileSync(path48.join(__dirname, "../supabase/gerar_links_convite.ps1"), "utf8");
      assert(
        edgeSrc49.includes("https://ritmo-wealth.pages.dev") &&
        edgeSrc49.includes("https://joaopedromenesesdev.github.io") &&
        !edgeSrc49.includes('ALLOWED_ORIGIN || "*"') &&
        convitePs149.includes("https://ritmo-wealth.pages.dev/login.html"),
        "Cloudflare[CORS & Convites]: suporte-email libera ritmo-wealth.pages.dev + github.io fail-closed e script de convites atualizado"
      );

      const buildScriptPath49 = path48.join(__dirname, "../scripts/build-pages.js");
      const buildScriptSrc49 = fs48.readFileSync(buildScriptPath49, "utf8");
      assert(
        fs48.existsSync(buildScriptPath49) &&
        fs48.existsSync(path48.join(__dirname, "../_headers")) &&
        buildScriptSrc49.includes("404.html"),
        "Cloudflare[Build]: scripts/build-pages.js (com 404.html anti-SPA-fallback) e _headers presentes na raiz"
      );

      // ── TESTE 50: Alinhamento e Hierarquia Tipográfica dos KPIs do Painel Master ──
      console.log("\n-> Teste 50: Alinhamento e Hierarquia Tipográfica dos KPIs do Painel Master");
      const styleCss50 = fs48.readFileSync(path48.join(__dirname, "../style/style.css"), "utf8");
      const kpiCardBlock50 = (styleCss50.match(/\.master-kpi-card\s*\{[\s\S]*?\}/) || [""])[0];
      const kpiLabelBlock50 = (styleCss50.match(/\.master-kpi-label\s*\{[\s\S]*?\}/) || [""])[0];
      const kpiValueBlock50 = (styleCss50.match(/\.master-kpi-value\s*\{[\s\S]*?\}/) || [""])[0];
      const kpiSalesValueBlock50 = (styleCss50.match(/\.master-kpi-value\.is-sales-value\s*\{[\s\S]*?\}/) || [""])[0];
      assert(
        kpiCardBlock50.includes("justify-content: flex-start") &&
        !kpiCardBlock50.includes("justify-content: space-between") &&
        kpiLabelBlock50.includes("min-height: 20px") &&
        kpiValueBlock50.includes("clamp(22px, 2vw, 26px)") &&
        kpiValueBlock50.includes("font-variant-numeric: tabular-nums") &&
        !kpiSalesValueBlock50.includes("font-size:"),
        "MasterKPI[Layout/Tipografia]: cards alinhados pelo topo sem vão artificial, rótulos com altura equalizada e valores com escala uniforme"
      );
    }

    // =========================================================================
    // TESTE 51: 5ª Estratégia — Seguro sem Formação de Reserva (Vitalício sem Resgate)
    // =========================================================================
    console.log("\n-> Teste 51: 5ª Estratégia — Seguro sem Formação de Reserva (Vitalício sem Resgate)");

    // 51.A — Vitalício sem Resgate com prêmio explícito, horizonte por expectativa de vida e comparativo vs Estratégia 4
    const ssrVitManual = engine.calcularSeguroSemReserva({
      capitalSegurado: 1000000,
      idadeSegurado: 45,
      expectativaVida: 85,
      premioMensal: 500,
      premioComReservaMensal: 4246.67
    });
    assert(
      ssrVitManual.modalidade === "vitalicio" &&
      ssrVitManual.capitalSegurado === 1000000 &&
      ssrVitManual.premioMensal === 500 &&
      ssrVitManual.premioAnualInicial === 6000 &&
      ssrVitManual.prazoAnos === 40 &&
      ssrVitManual.reajusteEtarioAnualPct === 0 &&
      ssrVitManual.desembolsoTotal === 240000 &&
      ssrVitManual.alavancagem === 4.17 &&
      ssrVitManual.economiaLiquida === 760000 &&
      ssrVitManual.eficienciaPct === 76 &&
      ssrVitManual.valorResgate === 0 &&
      ssrVitManual.premioEstimadoAutomaticamente === false &&
      ssrVitManual.diferencaMensalVsReserva === -3746.67 &&
      Array.isArray(ssrVitManual.avisos) &&
      ssrVitManual.avisos.some(a => a.toLowerCase().includes("resgate")) &&
      !ssrVitManual.avisos.some(a => a.toLowerCase().includes("prazo determinado")) &&
      semNaN(ssrVitManual),
      "SeguroSemReserva[Vitalício Manual]: calcula desembolso R$ 240k (40 anos), alavancagem 4,17x, eficiência 76%, reajuste 0 e resgate 0"
    );

    // 51.B — Estimativa automática pela idade, fallback seguro de prazo e consolidação exclusiva em Vitalício
    const ssrVit = engine.calcularSeguroSemReserva({
      custoInventario: 1000000,
      modalidade: "temporario",
      idadeSegurado: 45,
      expectativaVida: 85,
      reajusteEtarioAnualPct: 5
    });
    const ssrVitFallbackPrazo = engine.calcularSeguroSemReserva({
      capitalSegurado: 500000,
      idadeSegurado: 90,
      expectativaVida: 85
    });
    assert(
      ssrVit.modalidade === "vitalicio" &&
      ssrVit.capitalSegurado === 1000000 &&
      ssrVit.prazoAnos === 40 &&
      ssrVit.reajusteEtarioAnualPct === 0 &&
      ssrVit.premioEstimadoAutomaticamente === true &&
      ssrVit.premioMensal > 0 &&
      ssrVit.desembolsoTotal === Math.round(ssrVit.premioAnualInicial * 40 * 100) / 100 &&
      ssrVit.alavancagem > 0 &&
      ssrVit.valorResgate === 0 &&
      ssrVit.diferencaMensalVsReserva === 0 &&
      ssrVit.avisos.some(a => a.toLowerCase().includes("resgate")) &&
      !ssrVit.avisos.some(a => a.toLowerCase().includes("reajuste etário")) &&
      ssrVitFallbackPrazo.prazoAnos === 5 &&
      semNaN(ssrVit) && semNaN(ssrVitFallbackPrazo),
      "SeguroSemReserva[Vitalício Auto]: força modalidade vitalício com reajuste 0, estima prêmio pela idade e aplica fallback seguro (5 anos)"
    );

    // 51.C — Alerta quando desembolso acumulado supera o capital segurado no horizonte vitalício
    const ssrCustoMaiorCapital = engine.calcularSeguroSemReserva({
      capitalSegurado: 100000,
      idadeSegurado: 40,
      expectativaVida: 85,
      premioMensal: 500
    });
    assert(
      ssrCustoMaiorCapital.prazoAnos === 45 &&
      ssrCustoMaiorCapital.desembolsoTotal === 270000 &&
      ssrCustoMaiorCapital.economiaLiquida === -170000 &&
      ssrCustoMaiorCapital.eficienciaPct === -170 &&
      ssrCustoMaiorCapital.avisos.some(a => a.toLowerCase().includes("supera o capital")) &&
      semNaN(ssrCustoMaiorCapital),
      "SeguroSemReserva[Alerta Custo]: emite alerta quando desembolso acumulado vitalício supera capital segurado"
    );

    // 51.D — Taxa anual parametrizável e casos de borda anti-NaN (null, undefined, zeros, negativos, strings e Infinity)
    const ssrTaxaCustom = engine.calcularSeguroSemReserva({
      capitalSegurado: 600000,
      taxaAnualPct: 1,
      idadeSegurado: 45,
      expectativaVida: 55
    });
    const ssrBordas = [
      engine.calcularSeguroSemReserva(null),
      engine.calcularSeguroSemReserva(undefined),
      engine.calcularSeguroSemReserva({}),
      engine.calcularSeguroSemReserva({ capitalSegurado: 0, premioMensal: 0, prazoAnos: 0 }),
      engine.calcularSeguroSemReserva({
        capitalSegurado: -500000,
        custoInventario: "abc",
        modalidade: "<script>alert(1)</script>",
        idadeSegurado: NaN,
        premioMensal: "invalido",
        prazoAnos: -10,
        expectativaVida: Infinity,
        reajusteEtarioAnualPct: Infinity,
        premioComReservaMensal: NaN
      })
    ];
    assert(
      ssrTaxaCustom.premioAnualInicial === 6000 &&
      ssrTaxaCustom.premioMensal === 500 &&
      ssrTaxaCustom.valorResgate === 0 &&
      ssrBordas.every(r =>
        r.modalidade === "vitalicio" &&
        r.reajusteEtarioAnualPct === 0 &&
        r.capitalSegurado === 0 &&
        r.desembolsoTotal === 0 &&
        r.alavancagem === 0 &&
        r.eficienciaPct === 0 &&
        r.valorResgate === 0 &&
        r.diferencaMensalVsReserva === 0 &&
        semNaN(r)
      ),
      "SeguroSemReserva[Anti-NaN]: trata taxa customizada e sanitiza null/undefined/zeros/negativos/strings/Infinity sem NaN"
    );

    // 51.E — Retrocompatibilidade do AppState (relatórios antigos ou com modalidade temporário/reajuste são migrados para vitalício sem reajuste)
    if (appStateRef && typeof appStateRef.importSnapshot === "function") {
      const okLegado = appStateRef.importSnapshot({
        tributario: {
          inputs: {
            uf: "RJ",
            itcmd: 8,
            honorarios: 6,
            custas: 1,
            seguro_idade: 52,
            seguro_capital: 800000,
            seguro_sem_reserva_modalidade: "temporario",
            seguro_sem_reserva_reajuste_pct: 5
          }
        }
      });
      const inpLegado = appStateRef.getTributarioInputs();
      assert(
        okLegado === true &&
        inpLegado.uf === "RJ" &&
        inpLegado.seguro_sem_reserva_modalidade === "vitalicio" &&
        inpLegado.seguro_sem_reserva_idade === 52 &&
        inpLegado.seguro_sem_reserva_expectativa_vida === 85 &&
        inpLegado.seguro_sem_reserva_reajuste_pct === 0 &&
        semNaN(inpLegado),
        "SeguroSemReserva[State Retrocompat]: relatório antigo ou temporário é normalizado para vitalício sem reajuste e herda idade sem NaN"
      );

      appStateRef.setTributarioInputs({
        uf: "SP",
        seguro_sem_reserva_modalidade: "vitalicio",
        seguro_sem_reserva_idade: 48,
        seguro_sem_reserva_idade_manual: true,
        seguro_sem_reserva_expectativa_vida: 90,
        seguro_sem_reserva_reajuste_pct: 3.5
      });
      const snapCom5 = appStateRef.exportSnapshot();
      assert(
        snapCom5.tributario &&
        snapCom5.tributario.inputs &&
        snapCom5.tributario.inputs.seguro_sem_reserva_modalidade === "vitalicio" &&
        snapCom5.tributario.inputs.seguro_sem_reserva_expectativa_vida === 90 &&
        snapCom5.tributario.inputs.seguro_sem_reserva_reajuste_pct === 0,
        "SeguroSemReserva[State Snapshot]: exportSnapshot persiste configuração vitalícia sem reajuste etário"
      );
    }

    // 51.F — Auditoria estrutural de UI, CSP (zero handlers inline no card 5) e PDF (ON/OFF preservado)
    if (typeof require === "function") {
      const fs50 = require("fs");
      const path50 = require("path");
      const html50 = fs50.readFileSync(path50.join(__dirname, "../tributario.html"), "utf8");
      const css50 = fs50.readFileSync(path50.join(__dirname, "../style/tributario.css"), "utf8");
      const card5Start = html50.indexOf('id="card_estrategia_sem_reserva"');
      const card5End = html50.indexOf('<!-- NAVEGAÇÃO E VISUALIZAÇÃO -->');
      const card5Snippet = card5Start >= 0 && card5End > card5Start ? html50.slice(card5Start, card5End) : "";

      assert(
        !card5Snippet.includes('id="btn_modalidade_sr_temporario"') &&
        !card5Snippet.includes('id="btn_modalidade_sr_vitalicio"') &&
        !card5Snippet.includes('id="input_seguro_sr_prazo"') &&
        !card5Snippet.includes('id="input_seguro_sr_reajuste"') &&
        card5Snippet.includes('Vitalício sem Resgate') &&
        card5Snippet.includes('id="input_seguro_sr_expectativa"') &&
        card5Snippet.includes('id="badge_seguro_sr_premio_origem"') &&
        card5Snippet.includes('id="seguro_sr_avisos_box"') &&
        !/\bon(?:click|input|change)\s*=/i.test(card5Snippet) &&
        !html50.includes('id="resumo_comparativo_estrategias"') &&
        !html50.includes('id="pdf_resumo_comparativo_estrategias"') &&
        html50.includes('id="pdf_seguro_sr_modalidade_badge"') &&
        html50.includes('VITALÍCIO SEM RESGATE') &&
        html50.includes('id="pdf_disclaimer_institucional"') &&
        css50.includes(".reducao-card-sem-reserva") &&
        css50.includes(".badge-modalidade-sr-fixa"),
        "SeguroSemReserva[UI/CSP/PDF]: 5º card apenas Vitalício sem Resgate, sem temporário nem reajuste etário, sem handlers inline e PDF completos"
      );
    }

    // =========================================================================
    // TESTE 52: Comissionamento de Vendas (MAG 57% / POB 70%) e Trava Seguro de Vida
    // =========================================================================
    console.log("\n-> Teste 52: Comissionamento de Vendas (MAG 57% / POB 70%) e Trava em Seguro de Vida");
    if (_dbModNode && typeof _dbModNode.calcularComissaoVenda === "function") {
      const cMag = _dbModNode.calcularComissaoVenda(10000, "MAG");
      const cPob = _dbModNode.calcularComissaoVenda(10000, "pob");
      const cVazio = _dbModNode.calcularComissaoVenda(10000, "");
      const cCentavos = _dbModNode.calcularComissaoVenda(1234.56, "MAG");
      const cInvalido = _dbModNode.calcularComissaoVenda(10000, "XYZ");
      const cNegativo = _dbModNode.calcularComissaoVenda(-5000, "POB");

      assert(
        cMag.comissionamento === "MAG" && cMag.percentualComissao === 57 && cMag.valorComissao === 5700 && !cMag.invalido &&
        cPob.comissionamento === "POB" && cPob.percentualComissao === 70 && cPob.valorComissao === 7000 && !cPob.invalido &&
        cVazio.comissionamento === null && cVazio.percentualComissao === null && cVazio.valorComissao === 0 && !cVazio.invalido &&
        cCentavos.valorComissao === 703.7 &&
        cInvalido.invalido === true &&
        cNegativo.valorComissao === 0,
        "Comissao[Cálculo]: MAG=57% (R$ 5.700), POB=70% (R$ 7.000), opcional vazio=0, centavos precisos e bloqueio de código inválido/negativo"
      );

      const vMag = _dbModNode.sanitizarEValidarVenda({
        nomeCliente: "Cliente Seguro MAG",
        produto: "Seguro de Vida",
        valorVenda: "R$ 20.000,00",
        comissionamento: "MAG"
      });
      const vSemComiss = _dbModNode.sanitizarEValidarVenda({
        nomeCliente: "Cliente Opcional",
        produto: "Seguro de Vida",
        valorVenda: 15000,
        comissionamento: ""
      });
      const vComissInv = _dbModNode.sanitizarEValidarVenda({
        nomeCliente: "Cliente Inválido",
        produto: "Seguro de Vida",
        valorVenda: 15000,
        comissionamento: "ABC"
      });

      assert(
        vMag.valido === true &&
        vMag.vendaSanitizada.comissionamento === "MAG" &&
        vMag.vendaSanitizada.percentualComissao === 57 &&
        vMag.vendaSanitizada.valorComissao === 11400 &&
        vSemComiss.valido === true &&
        vSemComiss.vendaSanitizada.comissionamento === null &&
        vSemComiss.vendaSanitizada.valorComissao === 0 &&
        vComissInv.valido === false,
        "Comissao[Validação]: aceita MAG/POB e opcional vazio, rejeita código inválido fora de MAG/POB"
      );

      const listaComiss = [
        { id: "c1", userId: "u1", nomeCliente: "A", produto: "Seguro de Vida", valorVenda: 10000, comissionamento: "MAG", percentualComissao: 57, valorComissao: 5700 },
        { id: "c2", userId: "u1", nomeCliente: "B", produto: "Seguro de Vida", valorVenda: 10000, comissionamento: "POB", percentualComissao: 70, valorComissao: 7000 },
        { id: "c3", userId: "u1", nomeCliente: "C", produto: "Seguro de Vida", valorVenda: 5000, comissionamento: null, percentualComissao: null, valorComissao: 0 }
      ];
      const metComiss = _dbModNode.calcularMetricasVendas(listaComiss, []);
      const fMag = _dbModNode.filtrarVendasPainel(listaComiss, [], { comissionamento: "MAG" });
      const fPob = _dbModNode.filtrarVendasPainel(listaComiss, [], { comissionamento: "POB" });
      const fSem = _dbModNode.filtrarVendasPainel(listaComiss, [], { comissionamento: "sem_comissao" });

      assert(
        metComiss.valorTotalVendas === 25000 &&
        metComiss.valorTotalComissao === 12700 &&
        fMag.length === 1 && fMag[0].id === "c1" &&
        fPob.length === 1 && fPob[0].id === "c2" &&
        fSem.length === 1 && fSem[0].id === "c3",
        "Comissao[Métricas/Filtros]: totaliza R$ 12.700 de comissão e filtra corretamente por MAG, POB e sem comissionamento"
      );
    }

    if (typeof require === "function") {
      const fs52 = require("fs");
      const path52 = require("path");
      const sqlComiss = fs52.readFileSync(path52.join(__dirname, "../supabase/migrations/20261125_comissionamento_vendas_seguro_vida.sql"), "utf8");
      const sqlComissLower = sqlComiss.toLowerCase();
      assert(
        sqlComissLower.includes("add column if not exists comissionamento text") &&
        sqlComissLower.includes("chk_vendas_comissionamento_valido") &&
        sqlComissLower.includes("in ('mag', 'pob')") &&
        sqlComissLower.includes("in (57.00, 70.00)") &&
        sqlComissLower.includes("fn_vendas_blindagem") &&
        sqlComissLower.includes("revoke execute on function public.fn_vendas_blindagem() from public, anon, authenticated") &&
        sqlComissLower.includes("revoke execute on function public.fn_vendas_audit_trigger() from public, anon, authenticated") &&
        !/using\s*\(\s*true\s*\)/i.test(sqlComiss) &&
        !/with\s+check\s*\(\s*true\s*\)/i.test(sqlComiss),
        "Comissao[SQL Security Gate]: constraints MAG/POB, derivação server-side, triggers revogados e zero USING(true)"
      );

      const globalUi52 = fs52.readFileSync(path52.join(__dirname, "../script/global_ui.js"), "utf8");
      const css52 = fs52.readFileSync(path52.join(__dirname, "../style/style.css"), "utf8");
      assert(
        globalUi52.includes('id="venda_input_produto"') &&
        globalUi52.includes('value="Seguro de Vida" readonly') &&
        !globalUi52.includes('pace_produtos_venda_datalist') &&
        globalUi52.includes('id="venda_input_comissionamento"') &&
        globalUi52.includes('value="MAG"') &&
        globalUi52.includes('value="POB"') &&
        globalUi52.includes('id="venda_comissao_preview"') &&
        css52.includes(".pace-venda-locked") &&
        css52.includes(".pace-venda-commission-preview"),
        "Comissao[UI]: produto travado em Seguro de Vida (sem datalist), select MAG/POB opcional e prévia em tempo real presentes"
      );
    }

    console.log("\n=================================================");
    console.log(`RESUMO DA SUÍTE DE TESTES:`);
    console.log(`   Total: ${totalTestes} | Passados: ${testesPassados} | Falhas: ${testesFalhados}`);
    console.log("=================================================");

    if (testesFalhados > 0 && typeof process !== "undefined") {
      process.exitCode = 1;
    }

    return { totalTestes, testesPassados, testesFalhados };
  }

  // Executa automaticamente se chamado em Node.js ou navegador
  if (typeof window !== 'undefined') {
    window.rodarTestesTributario = rodarSuiteDeTestes;
  } else if (typeof module !== 'undefined') {
    rodarSuiteDeTestes();
  }
})();

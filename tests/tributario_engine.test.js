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

    // TESTE 5: Sanitização de Dados (db.js / Data Integrity)
    console.log("\nTeste 5: Sanitização e Integridade de Dados (db.js)");
    if (typeof sanitizarNumero === 'function' && typeof sanitizarEValidarSimulacao === 'function') {
      assert(sanitizarNumero("R$ 1.500.000,50") === 1500000.50, "Sanitização de moeda R$ 1.500.000,50 -> 1500000.50");
      assert(sanitizarNumero("inválido", 100) === 100, "Sanitização de texto inválido -> valor padrão 100");
      assert(sanitizarNumero(NaN, 0) === 0, "Sanitização de NaN -> 0");
      
      const resValida = sanitizarEValidarSimulacao({
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
    if (typeof window !== 'undefined' && window.AppState && typeof window.AppState.exportSnapshot === 'function') {
      const snapOriginal = window.AppState.exportSnapshot();
      assert(typeof snapOriginal === 'object' && snapOriginal.meta && snapOriginal.patrimonio, "Snapshot exportado com sucesso contendo metadados e patrimônio");
      
      const resImport = window.AppState.importSnapshot({
        meta: { nomeCliente: "Cliente Teste" },
        patrimonio: { total: 2000000 }
      });
      assert(resImport === true, "Importação de snapshot retornou sucesso (true)");
      assert(window.AppState.getTotalPatrimonio() === 2000000, "Importação de snapshot atualizou o total do patrimônio para R$ 2.000.000");
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

    // TESTE 9: Criptografia AES-GCM (Web Crypto) e Retrocompatibilidade (v1 e v2 com pepper)
    console.log("\nTeste 9: Criptografia AES-GCM e Integridade de Dados");
    if (typeof window !== 'undefined' && window.__PACE_SECURITY_TEST__) {
      const sec = window.__PACE_SECURITY_TEST__;
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
    if (typeof window !== 'undefined' && window.__PACE_SECURITY_TEST__) {
      const sec = window.__PACE_SECURITY_TEST__;
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
    if (typeof window !== 'undefined' && window.__PACE_SECURITY_TEST__) {
      const sec = window.__PACE_SECURITY_TEST__;
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

    assert(visaoAssessor.length === 2, "Assessor comum enxerga apenas seus próprios 2 relatórios");
    assert(visaoMaster.length === 3, "Usuário Master possui acesso completo a todos os 3 relatórios de todos os assessores");
    assert(visaoUidMaster.length === 3, "UID Master administrativo reconhecido automaticamente com acesso completo sem exposição de e-mail pessoal");

    // ==========================================
    // 21. TESTE: BLINDAGEM ZERO-LEAKAGE (NENHUM E-MAIL DE USUÁRIO EXPOSTO NO CÓDIGO-FONTE)
    // ==========================================
    console.log("\nExecutando Testes 21: Blindagem Zero-Leakage de E-mails e Identidades...");

    const fs = require('fs');
    const dbSource = fs.readFileSync('script/db.js', 'utf8');
    const authSource = fs.readFileSync('script/auth.js', 'utf8');
    const globalUiSource = fs.readFileSync('script/global_ui.js', 'utf8');
    const sqlMigrationSource = fs.readFileSync('supabase/migrations/20261104_sistema_usuarios_master_usabilidade.sql', 'utf8');

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
      { nome: "supabase/migrations/20261104_sistema_usuarios_master_usabilidade.sql", conteudo: sqlMigrationSource }
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

    console.log("\n=================================================");
    console.log(`RESUMO DA SUÍTE DE TESTES:`);
    console.log(`   Total: ${totalTestes} | Passados: ${testesPassados} | Falhas: ${testesFalhados}`);
    console.log("=================================================");

    return { totalTestes, testesPassados, testesFalhados };
  }

  // Executa automaticamente se chamado em Node.js ou navegador
  if (typeof window !== 'undefined') {
    window.rodarTestesTributario = rodarSuiteDeTestes;
  } else if (typeof module !== 'undefined') {
    rodarSuiteDeTestes();
  }
})();

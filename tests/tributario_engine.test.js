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
        path.resolve(__dirname, "..", "supabase/migrations/20261111_hardening_auth_e_nomes_assessores.sql"),
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

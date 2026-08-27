// tributario_engine.test.js - Suíte de Testes Automatizados para TributarioEngine (Whealth Planner Pro)
// Pode ser executado em ambiente Node.js ou através do navegador.

(function () {
  'use strict';

  // Importa o TributarioEngine se em Node.js
  let engine = typeof window !== 'undefined' ? window.TributarioEngine : null;
  if (!engine && typeof require !== 'undefined') {
    // Para execução em ambiente de teste Node.js
    try {
      const fs = require('fs');
      const vm = require('vm');
      const code = fs.readFileSync(__dirname + '/tributario_engine.js', 'utf8');
      const sandbox = { window: {} };
      vm.createContext(sandbox);
      vm.runInContext(code, sandbox);
      engine = sandbox.window.TributarioEngine;
    } catch (e) {
      console.error("[TestRunner] Erro ao carregar tributario_engine.js:", e);
    }
  }

  let totalTestes = 0;
  let testesPassados = 0;
  let testesFalhados = 0;

  function assert(condicao, descricao) {
    totalTestes++;
    if (condicao) {
      testesPassados++;
      console.log(`  ✅ [PASS] ${descricao}`);
    } else {
      testesFalhados++;
      console.error(`  ❌ [FAIL] ${descricao}`);
    }
  }

  async function rodarSuiteDeTestes() {
    console.log("=================================================");
    console.log("🧪 INICIANDO SUÍTE DE TESTES EXPANDIDA — TributarioEngine & Segurança");
    console.log("=================================================");

    if (!engine) {
      console.error("❌ Erro Crítico: TributarioEngine não foi encontrado.");
      return;
    }

    // TESTE 1: Alíquotas de ITCMD por Estado
    console.log("\n📋 Teste 1: Alíquotas de ITCMD por Estado");
    assert(engine.obterAliquotaITCMD("SP") === 4.0, "Alíquota SP deve ser 4.0%");
    assert(engine.obterAliquotaITCMD("RJ") === 8.0, "Alíquota RJ deve ser 8.0%");
    assert(engine.obterAliquotaITCMD("MG") === 5.0, "Alíquota MG deve ser 5.0%");
    assert(engine.obterAliquotaITCMD("XX") === 4.0, "Estado inválido deve retornar default 4.0%");

    // TESTE 2: Cálculo de Custos de Inventário
    console.log("\n📋 Teste 2: Cálculo de Custos de Inventário");
    const resInventario = engine.calcularCustosInventario(10000000, 4.0, 5.0, 1.5); // R$ 10M, ITCMD 4%, Hon 5%, Custas 1.5% (Total 10.5%)
    assert(resInventario.valorITCMD === 400000, "ITCMD de R$ 10M a 4% deve ser R$ 400.000");
    assert(resInventario.valorHonorarios === 500000, "Honorários de R$ 10M a 5% deve ser R$ 500.000");
    assert(resInventario.valorCustas === 150000, "Custas de R$ 10M a 1.5% deve ser R$ 150.000");
    assert(resInventario.totalPrejuizo === 1050000, "Prejuízo total de R$ 10M deve ser R$ 1.050.000");
    assert(resInventario.pctPrejuizoTotal === 10.5, "Percentual total deve ser 10.5%");

    // TESTE 3: Partilha de Regime de Casamento
    console.log("\n📋 Teste 3: Partilha por Regime de Casamento");
    
    // Comunhão Universal (50% meação, 50% herança)
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem("total_patrimonio", "10000000");
    
    const partilhaUniversal = engine.calcularPartilhaRegime({}, { estadoCivil: "casado", regime: "comunhao_universal" });
    if (partilhaUniversal.totalPatrimonio > 0) {
      assert(partilhaUniversal.meacaoConjuge === partilhaUniversal.totalPatrimonio * 0.5, "Comunhão Universal: Meação deve ser 50%");
      assert(partilhaUniversal.herancaTransmitida === partilhaUniversal.totalPatrimonio * 0.5, "Comunhão Universal: Herança deve ser 50%");
    }

    // Solteiro (0% meação, 100% herança)
    const partilhaSolteiro = engine.calcularPartilhaRegime({}, { estadoCivil: "solteiro" });
    assert(partilhaSolteiro.meacaoConjuge === 0, "Solteiro: Meação deve ser R$ 0");

    // TESTE 4: Estratégias Sucessórias
    console.log("\n📋 Teste 4: Estratégias de Preservação e Liquidez");
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
    console.log("\n📋 Teste 5: Sanitização e Integridade de Dados (db.js)");
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
      console.log("  ℹ️ [SKIP] Funções de sanitização do db.js não estão no escopo do runner.");
    }

    // TESTE 6: Simulation Store (state.js)
    console.log("\n📋 Teste 6: Simulation Store (exportSnapshot & importSnapshot)");
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
      console.log("  ℹ️ [SKIP] AppState não carregado no escopo global do runner.");
    }

    // TESTE 7: Trava e Validação do Limite Anual Isento de ITCMD (R$ 96.050,00)
    console.log("\n📋 Teste 7: Trava e Validação do Limite Anual Isento de ITCMD");
    assert(engine.LIMITE_ISENCAO_ANUAL === 96050, "Limite isento anual padrão deve ser R$ 96.050,00 (2.500 UFESPs)");
    const tDentroLimite = engine.validarLimiteDoacaoIsenta(50000);
    assert(tDentroLimite.valorValido === 50000 && !tDentroLimite.excedeuLimite, "Valor R$ 50.000 deve ser aceito sem exceder o limite");
    const tExatoLimite = engine.validarLimiteDoacaoIsenta(96050);
    assert(tExatoLimite.valorValido === 96050 && !tExatoLimite.excedeuLimite, "Valor exato de R$ 96.050 deve ser aceito sem exceder o limite");
    const tAcimaLimite = engine.validarLimiteDoacaoIsenta(100000);
    assert(tAcimaLimite.valorValido === 96050 && tAcimaLimite.excedeuLimite, "Valor R$ 100.000 deve ser travado no teto de R$ 96.050 e sinalizar excedeuLimite = true");
    
    // TESTE 8: Validação de Segurança e Integridade das Regras
    console.log("\n📋 Teste 8: Validações de Segurança e Não Regressão");
    assert(typeof engine.obterAliquotaITCMD === "function", "obterAliquotaITCMD disponível");
    assert(engine.obterAliquotaITCMD("SP") === 4.0, "Alíquota SP deve ser 4.0%");
    assert(engine.obterAliquotaITCMD("RJ") === 8.0, "Alíquota RJ deve ser 8.0%");
    assert(engine.obterAliquotaITCMD("INVALIDO") === 4.0, "Alíquota inválida deve fazer fallback seguro para 4.0%");
    const custosZero = engine.calcularCustosInventario(0, 4, 5, 1.5);
    assert(custosZero.totalPrejuizo === 0, "Patrimônio zero deve gerar prejuízo zero");
    const custosNegativos = engine.calcularCustosInventario(-50000, 4, 5, 1.5);
    assert(custosNegativos.totalPrejuizo === 0, "Patrimônio negativo deve ser sanitizado para zero");

    // TESTE 9: Criptografia AES-GCM (Web Crypto) e Retrocompatibilidade (v1 e v2 com pepper)
    console.log("\n📋 Teste 9: Criptografia AES-GCM e Integridade de Dados");
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
      console.log("  ℹ️ [SKIP] __PACE_SECURITY_TEST__ não disponível no escopo.");
    }

    // TESTE 10: Sanitização Contra Injeções e Proteção de Entradas
    console.log("\n📋 Teste 10: Sanitização Contra Injeções e Extremos");
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
      console.log("  ℹ️ [SKIP] __PACE_SECURITY_TEST__ não disponível no escopo.");
    }

    // TESTE 11: Resiliência de Rede e Retry Automático com Backoff
    console.log("\n📋 Teste 11: Resiliência de Rede e Retry Automático");
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
      console.log("  ℹ️ [SKIP] __PACE_SECURITY_TEST__ não disponível no escopo.");
    }

    // TESTE 12: Regimes de Bens e Direito Sucessório (Partilha Legal)
    console.log("\n📋 Teste 12: Partilhas Legais por Regime de Casamento");
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
    console.log("\n📋 Teste 13: Estratégias de Preservação e Previdência");
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
    assert(est.seguro.premioAnual > 0 && est.seguro.premioMensal > 0, "Prêmio anual e mensal do seguro de vida calculados com sucesso");

    console.log("\n=================================================");
    console.log(`📊 RESUMO DA SUÍTE DE TESTES:`);
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

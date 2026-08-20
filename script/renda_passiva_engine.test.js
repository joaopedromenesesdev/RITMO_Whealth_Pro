// =============================================================================
// renda_passiva_engine.test.js
// Suíte de Testes Automatizados para RendaPassivaEngine
// Whealth Planner Pro — Ritmo Wealth Pro
// =============================================================================

(function () {
  'use strict';

  function rodarTestesRendaPassiva() {
    console.log("\n=================================================");
    console.log("🧪 SUÍTE DE TESTES — RendaPassivaEngine");
    console.log("=================================================");

    const engine = window.RendaPassivaEngine;
    if (!engine) {
      console.error("❌ Erro: RendaPassivaEngine não encontrado no window.");
      return;
    }

    let passados = 0;
    let total = 0;

    function assert(cond, desc) {
      total++;
      if (cond) {
        passados++;
        console.log(`  ✅ [PASS] ${desc}`);
      } else {
        console.error(`  ❌ [FAIL] ${desc}`);
      }
    }

    // TESTE 1: Acumulação Básica sem Aportes
    console.log("\n📋 Teste 1: Acumulação sem aportes (Patrimônio R$ 1.000.000, 10 anos, 10% a.a.)");
    const resAcum1 = engine.calcularAcumulacao({
      patrimonioAtual: 1000000,
      aporteMensal: 0,
      rentabilidadeAnual: 0.10,
      inflacaoAnual: 0.05,
      idadeAtual: 50,
      idadeAposentadoria: 60
    });
    // 1.000.000 * (1.10)^10 ≈ 2.593.742
    assert(resAcum1.anosAcumulacao === 10, "Anos de acumulação deve ser 10");
    assert(Math.abs(resAcum1.patrimonioNominal - 2593742) < 500, "Patrimônio nominal aos 60 anos deve ser aprox. R$ 2.593.742");
    assert(resAcum1.patrimonioReal < resAcum1.patrimonioNominal, "Patrimônio real descontada a inflação deve ser menor que o nominal");

    // TESTE 2: Desacumulação — Cenário 1 (Preservação) vs Cenário 2 (Consumo)
    console.log("\n📋 Teste 2: Desacumulação (R$ 8.000.000 dos 60 aos 95 anos, 10% rentab., 5% inflação)");
    const resDesac = engine.calcularDesacumulacao({
      patrimonioAcumulado: 8000000,
      rentabilidadeAnual: 0.10,
      inflacaoAnual: 0.05,
      idadeInicio: 60,
      idadeFinal: 95
    });

    assert(resDesac.taxaReal > 0.045 && resDesac.taxaReal < 0.048, "Taxa real (Fisher) deve ser aprox. 4.76% a.a.");
    assert(resDesac.preservacao.rendaMensalReal > 0, "Renda mensal de preservação deve ser positiva");
    assert(resDesac.consumo.rendaMensalReal > resDesac.preservacao.rendaMensalReal, "Renda mensal com consumo deve ser maior que a renda com preservação");
    assert(resDesac.consumo.anos === 35, "Anos de desacumulação deve ser 35 (95 - 60)");
    assert(resDesac.consumo.evolucaoAnual[resDesac.consumo.evolucaoAnual.length - 1].patrimonioNominal === 0, "No final dos 95 anos, patrimônio com consumo deve se aproximar de zero");

    // TESTE 3: Simulação de 3 Cenários Macro
    console.log("\n📋 Teste 3: Simulação de Cenários Macro (Conservador, Base, Otimista)");
    const resCenarios = engine.simularCenarios({
      patrimonioAtual: 5000000,
      aporteMensal: 10000,
      idadeAtual: 45,
      idadeAposentadoria: 60,
      idadeFinal: 90
    });

    assert(resCenarios.conservador && resCenarios.base && resCenarios.otimista, "Deve conter os 3 cenários");
    assert(resCenarios.otimista.resumo.patrimonioAposentadoria > resCenarios.base.resumo.patrimonioAposentadoria, "Cenário Otimista deve render mais que o Base");
    assert(resCenarios.base.resumo.patrimonioAposentadoria > resCenarios.conservador.resumo.patrimonioAposentadoria, "Cenário Base deve render mais que o Conservador");

    console.log(`\n📊 RendaPassivaEngine: ${passados}/${total} testes passaram com sucesso!`);
  }

  window.rodarTestesRendaPassiva = rodarTestesRendaPassiva;
})();

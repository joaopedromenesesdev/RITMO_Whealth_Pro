// =============================================================================
// carteira_engine.test.js
// Suíte de Testes Automatizados para CarteiraEngine
// Whealth Planner Pro — Ritmo Wealth Pro
// =============================================================================

(function () {
  'use strict';

  function rodarTestesCarteira() {
    console.log("\n=================================================");
    console.log("🧪 SUÍTE DE TESTES — CarteiraEngine");
    console.log("=================================================");

    const engine = window.CarteiraEngine;
    if (!engine) {
      console.error("❌ Erro: CarteiraEngine não encontrado no window.");
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

    const ativosMock = [
      engine.criarAtivo({
        instituicao: 'BTG Pactual',
        nome: 'CDB BTG 110% CDI',
        classe: 'cdi',
        indexador: '110% CDI',
        valorAtual: 4000000,
        rentAno: 0.12,
        dataVencimento: '2029-12-31'
      }),
      engine.criarAtivo({
        instituicao: 'XP Investimentos',
        nome: 'NTN-B IPCA + 6%',
        classe: 'ipca',
        indexador: 'IPCA + 6%',
        taxa: 0.06,
        valorAtual: 2500000,
        rentAno: 0.105,
        dataVencimento: '2035-05-15'
      }),
      engine.criarAtivo({
        instituicao: 'BTG Pactual',
        nome: 'CDB Prefixado 13%',
        classe: 'prefixado',
        indexador: 'Prefixado 13%',
        taxa: 0.13,
        valorAtual: 1000000,
        rentAno: 0.13,
        dataVencimento: '2030-01-01'
      })
    ];

    // TESTE 1: Consolidação por Instituição com Rentabilidade Ponderada
    console.log("\n📋 Teste 1: Consolidação Multi-Instituição (BTG e XP)");
    const resCons = engine.consolidarPorInstituicao(ativosMock);
    assert(resCons.instituicoes.length === 2, "Devem ser agrupadas 2 instituições (BTG e XP)");
    assert(resCons.total.saldoAtual === 7500000, "Saldo total consolidado deve ser R$ 7.500.000");

    const instBTG = resCons.instituicoes.find(i => i.instituicao === 'BTG Pactual');
    assert(instBTG.saldoAtual === 5000000, "Saldo BTG deve ser R$ 5.000.000");
    // Ponderado BTG: (4M * 0.12 + 1M * 0.13) / 5M = 0.61 / 5 = 0.122 (12.20%)
    assert(Math.abs(instBTG.rentAno - 0.122) < 0.001, "Rentabilidade ano BTG ponderada deve ser 12.20%");

    // TESTE 2: Composição por Classe de Indexador
    console.log("\n📋 Teste 2: Composição por Classe (CDI, IPCA, Prefixado)");
    const resComp = engine.composicaoPorClasse(ativosMock);
    assert(resComp.composicao.length === 3, "Devem ser 3 classes ativas");
    const cdiComp = resComp.composicao.find(c => c.classe === 'cdi');
    assert(Math.abs(cdiComp.percentual - 53.33) < 0.1, "CDI deve representar aprox. 53.33% (4M/7.5M)");

    // TESTE 3: Simulação de Sensibilidade (Selic 10%, IPCA 4.5%)
    console.log("\n📋 Teste 3: Simulação de Papéis no Vencimento");
    const resSim = engine.simularCarteira(ativosMock, { selic: 0.10, ipca: 0.045 });
    assert(resSim.totalAtual === 7500000, "Total atual simulado deve ser R$ 7.500.000");
    assert(resSim.totalProjetado > resSim.totalAtual, "Total projetado nos vencimentos deve ser maior que o atual");
    assert(resSim.totalProjetadoReal < resSim.totalProjetado, "Total projetado real (descontada a inflação) deve ser menor que o nominal");

    // TESTE 4: Movimentações do Período
    console.log("\n📋 Teste 4: Movimentações do Período");
    const resMov = engine.calcularMovimentacoes({
      saldoInicial: 10000000,
      aportes: 300000,
      resgates: 100000,
      rendimentos: 90000
    });
    assert(resMov.saldoFinal === 10290000, "Saldo final deve ser R$ 10.290.000 (10M + 300k - 100k + 90k)");

    console.log(`\n📊 CarteiraEngine: ${passados}/${total} testes passaram com sucesso!`);
  }

  window.rodarTestesCarteira = rodarTestesCarteira;
})();

// =============================================================================
// carteira_engine.js
// Motor de Carteira de Investimentos — Consolidação, Indexadores e Vencimentos
// Whealth Planner Pro — Ritmo Wealth Pro
// =============================================================================
// Motor puro de cálculo (sem dependência de DOM).
// =============================================================================

(function (window) {
  'use strict';

  // ─── CONSTANTES DE CLASSIFICAÇÃO ──────────────────────────────────────
  const CLASSES_ATIVO = [
    'cdi', 'ipca', 'prefixado', 'multimercado', 'renda_variavel',
    'fii', 'coe', 'previdencia', 'internacional', 'caixa'
  ];

  const LABELS_CLASSE = {
    cdi: 'Pós-fixado / CDI',
    ipca: 'Inflação / IPCA',
    prefixado: 'Prefixado',
    multimercado: 'Multimercado',
    renda_variavel: 'Renda Variável',
    fii: 'Fundos Imobiliários',
    coe: 'Estruturadas / COE',
    previdencia: 'Previdência',
    internacional: 'Internacional',
    caixa: 'Caixa'
  };

  const FAIXAS_VENCIMENTO = [
    { label: 'Até 1 ano', minMeses: 0, maxMeses: 12 },
    { label: '1 a 2 anos', minMeses: 12, maxMeses: 24 },
    { label: '2 a 3 anos', minMeses: 24, maxMeses: 36 },
    { label: '3 a 5 anos', minMeses: 36, maxMeses: 60 },
    { label: 'Mais de 5 anos', minMeses: 60, maxMeses: Infinity }
  ];

  const CarteiraEngine = {

    CLASSES_ATIVO,
    LABELS_CLASSE,
    FAIXAS_VENCIMENTO,

    // ─── CONSOLIDAÇÃO POR INSTITUIÇÃO ──────────────────────────────────
    // Recebe um array de ativos e agrupa por instituição, calculando
    // rentabilidade ponderada pelo saldo.
    //
    // Ativo: {
    //   instituicao, nome, tipo, emissor, dataAplicacao, dataVencimento,
    //   valorAplicado, valorAtual, indexador, taxa, taxaBase,
    //   liquidez, classe, tributacao, fgc, rentMes, rentAno, rent12m, rent24m
    // }
    // ───────────────────────────────────────────────────────────────────

    consolidarPorInstituicao(ativos = []) {
      const mapa = {};
      let saldoGlobal = 0;

      ativos.forEach(ativo => {
        const inst = ativo.instituicao || 'Outros';
        if (!mapa[inst]) {
          mapa[inst] = {
            instituicao: inst,
            saldoAtual: 0,
            ativos: [],
            // Para cálculo ponderado
            _somaRentMesPond: 0,
            _somaRentAnoPond: 0,
            _somaRent12mPond: 0,
            _somaRent24mPond: 0
          };
        }

        const saldo = Number(ativo.valorAtual) || 0;
        mapa[inst].saldoAtual += saldo;
        mapa[inst].ativos.push(ativo);
        mapa[inst]._somaRentMesPond += (Number(ativo.rentMes) || 0) * saldo;
        mapa[inst]._somaRentAnoPond += (Number(ativo.rentAno) || 0) * saldo;
        mapa[inst]._somaRent12mPond += (Number(ativo.rent12m) || 0) * saldo;
        mapa[inst]._somaRent24mPond += (Number(ativo.rent24m) || 0) * saldo;
        saldoGlobal += saldo;
      });

      // Calcula rentabilidade ponderada para cada instituição
      const resultado = Object.values(mapa).map(inst => ({
        instituicao: inst.instituicao,
        saldoAtual: Math.round(inst.saldoAtual * 100) / 100,
        qtdAtivos: inst.ativos.length,
        rentMes: inst.saldoAtual > 0 ? Math.round(inst._somaRentMesPond / inst.saldoAtual * 10000) / 10000 : 0,
        rentAno: inst.saldoAtual > 0 ? Math.round(inst._somaRentAnoPond / inst.saldoAtual * 10000) / 10000 : 0,
        rent12m: inst.saldoAtual > 0 ? Math.round(inst._somaRent12mPond / inst.saldoAtual * 10000) / 10000 : 0,
        rent24m: inst.saldoAtual > 0 ? Math.round(inst._somaRent24mPond / inst.saldoAtual * 10000) / 10000 : 0,
        ativos: inst.ativos
      }));

      // Total consolidado
      const total = {
        instituicao: 'Total',
        saldoAtual: Math.round(saldoGlobal * 100) / 100,
        qtdAtivos: ativos.length,
        rentMes: saldoGlobal > 0 ? Math.round(resultado.reduce((s, i) => s + i.rentMes * i.saldoAtual, 0) / saldoGlobal * 10000) / 10000 : 0,
        rentAno: saldoGlobal > 0 ? Math.round(resultado.reduce((s, i) => s + i.rentAno * i.saldoAtual, 0) / saldoGlobal * 10000) / 10000 : 0,
        rent12m: saldoGlobal > 0 ? Math.round(resultado.reduce((s, i) => s + i.rent12m * i.saldoAtual, 0) / saldoGlobal * 10000) / 10000 : 0,
        rent24m: saldoGlobal > 0 ? Math.round(resultado.reduce((s, i) => s + i.rent24m * i.saldoAtual, 0) / saldoGlobal * 10000) / 10000 : 0
      };

      return { instituicoes: resultado, total };
    },

    // ─── COMPOSIÇÃO POR CLASSE DE ATIVO ─────────────────────────────────
    // Agrupa os ativos por classe (CDI, IPCA, Prefixado, etc.)
    // Retorna valor e percentual de cada classe.
    // ────────────────────────────────────────────────────────────────────

    composicaoPorClasse(ativos = []) {
      const mapa = {};
      let total = 0;

      CLASSES_ATIVO.forEach(classe => {
        mapa[classe] = { classe, label: LABELS_CLASSE[classe], valor: 0, percentual: 0, ativos: [] };
      });

      ativos.forEach(ativo => {
        const classe = ativo.classe || 'caixa';
        const chave = CLASSES_ATIVO.includes(classe) ? classe : 'caixa';
        const saldo = Number(ativo.valorAtual) || 0;
        mapa[chave].valor += saldo;
        mapa[chave].ativos.push(ativo);
        total += saldo;
      });

      // Calcula percentuais
      Object.values(mapa).forEach(item => {
        item.valor = Math.round(item.valor * 100) / 100;
        item.percentual = total > 0 ? Math.round(item.valor / total * 10000) / 100 : 0;
      });

      // Filtra classes com valor > 0 para exibição
      const composicao = Object.values(mapa).filter(c => c.valor > 0);

      return { composicao, total: Math.round(total * 100) / 100 };
    },

    // ─── MOVIMENTAÇÕES DO PERÍODO ───────────────────────────────────────
    // Calcula saldo final considerando aportes, resgates e rendimentos.
    //
    // movimentacoes: {
    //   saldoInicial, aportes, resgates, rendimentos
    // }
    // ────────────────────────────────────────────────────────────────────

    calcularMovimentacoes({
      saldoInicial = 0,
      aportes = 0,
      resgates = 0,
      rendimentos = 0
    } = {}) {
      const saldoFinal = saldoInicial + aportes - resgates + rendimentos;
      return {
        saldoInicial: Math.round(saldoInicial * 100) / 100,
        aportes: Math.round(aportes * 100) / 100,
        resgates: Math.round(resgates * 100) / 100,
        rendimentos: Math.round(rendimentos * 100) / 100,
        saldoFinal: Math.round(saldoFinal * 100) / 100
      };
    },

    // ─── CRONOGRAMA DE VENCIMENTOS ──────────────────────────────────────
    // Agrupa ativos por faixa temporal e por ano-calendário.
    // ────────────────────────────────────────────────────────────────────

    cronogramaVencimentos(ativos = []) {
      const hoje = new Date();
      const porFaixa = FAIXAS_VENCIMENTO.map(f => ({ ...f, valor: 0, ativos: [] }));
      const porAno = {};
      let semVencimento = { label: 'Sem vencimento / Liquidez', valor: 0, ativos: [] };

      ativos.forEach(ativo => {
        const saldo = Number(ativo.valorAtual) || 0;

        if (!ativo.dataVencimento) {
          semVencimento.valor += saldo;
          semVencimento.ativos.push(ativo);
          return;
        }

        const vencimento = new Date(ativo.dataVencimento);
        const diffMs = vencimento.getTime() - hoje.getTime();
        const diffMeses = diffMs / (1000 * 60 * 60 * 24 * 30.44);
        const anoVenc = vencimento.getFullYear();

        // Agrupa por faixa
        for (const faixa of porFaixa) {
          if (diffMeses >= faixa.minMeses && diffMeses < faixa.maxMeses) {
            faixa.valor += saldo;
            faixa.ativos.push(ativo);
            break;
          }
        }

        // Agrupa por ano
        if (!porAno[anoVenc]) {
          porAno[anoVenc] = { ano: anoVenc, valor: 0, ativos: [] };
        }
        porAno[anoVenc].valor += saldo;
        porAno[anoVenc].ativos.push(ativo);
      });

      // Arredonda valores
      porFaixa.forEach(f => { f.valor = Math.round(f.valor * 100) / 100; });
      Object.values(porAno).forEach(a => { a.valor = Math.round(a.valor * 100) / 100; });
      semVencimento.valor = Math.round(semVencimento.valor * 100) / 100;

      return {
        porFaixa: porFaixa.filter(f => f.valor > 0),
        porAno: Object.values(porAno).sort((a, b) => a.ano - b.ano),
        semVencimento
      };
    },

    // ─── SIMULAÇÃO DE SENSIBILIDADE A JUROS E INFLAÇÃO ──────────────────
    // Recalcula o retorno estimado de cada ativo com base em novas
    // premissas de Selic e IPCA.
    //
    // premissas: { selic, ipca }
    // ────────────────────────────────────────────────────────────────────

    simularSensibilidade(ativos = [], premissas = { selic: 0.10, ipca: 0.045 }) {
      return ativos.map(ativo => {
        const saldo = Number(ativo.valorAtual) || 0;
        const taxa = Number(ativo.taxa) || 0;
        const taxaBase = Number(ativo.taxaBase) || 0;
        const classe = ativo.classe || 'caixa';
        const indexador = (ativo.indexador || '').toLowerCase();

        let rentabilidadeAnualEstimada = 0;

        // Calcula rentabilidade conforme o indexador
        if (indexador.includes('cdi') || classe === 'cdi') {
          // Ex: 110% CDI → taxa = 1.10, rentabilidade = selic * 1.10
          // Ex: CDI + 2% → taxaBase = selic, taxa = 0.02
          if (taxa > 1 || (taxa > 0 && taxa < 5 && !indexador.includes('+'))) {
            // Percentual do CDI (ex: 110% CDI → taxa = 110 ou 1.10)
            const pctCDI = taxa > 5 ? taxa / 100 : taxa;
            rentabilidadeAnualEstimada = premissas.selic * pctCDI;
          } else {
            // CDI + spread
            rentabilidadeAnualEstimada = premissas.selic + taxa;
          }
        } else if (indexador.includes('ipca') || classe === 'ipca') {
          // IPCA + X% → rentabilidade nominal ≈ (1+IPCA)×(1+taxa)-1
          rentabilidadeAnualEstimada = (1 + premissas.ipca) * (1 + taxa) - 1;
        } else if (indexador.includes('pre') || classe === 'prefixado') {
          // Prefixado: taxa fixa, sem variação com premissas
          rentabilidadeAnualEstimada = taxa;
        } else if (indexador.includes('selic')) {
          // Selic + X%
          rentabilidadeAnualEstimada = premissas.selic + taxa;
        } else {
          // Default: usa a taxa informada
          rentabilidadeAnualEstimada = taxa || premissas.selic * 0.95;
        }

        // Projeta o valor no vencimento
        let valorProjetado = saldo;
        let anosAteVencimento = 0;

        if (ativo.dataVencimento) {
          const hoje = new Date();
          const vencimento = new Date(ativo.dataVencimento);
          anosAteVencimento = Math.max(0, (vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
          valorProjetado = saldo * Math.pow(1 + rentabilidadeAnualEstimada, anosAteVencimento);
        }

        // Valor em poder de compra de hoje
        const valorReal = anosAteVencimento > 0
          ? valorProjetado / Math.pow(1 + premissas.ipca, anosAteVencimento)
          : valorProjetado;

        return {
          ...ativo,
          rentabilidadeEstimada: Math.round(rentabilidadeAnualEstimada * 10000) / 10000,
          valorProjetado: Math.round(valorProjetado * 100) / 100,
          valorProjetadoReal: Math.round(valorReal * 100) / 100,
          anosAteVencimento: Math.round(anosAteVencimento * 100) / 100
        };
      });
    },

    // ─── SIMULAÇÃO DA CARTEIRA COMPLETA ──────────────────────────────────
    // Aplica a sensibilidade sobre todos os ativos e retorna a
    // tabela de projeção consolidada.
    // ────────────────────────────────────────────────────────────────────

    simularCarteira(ativos = [], premissas = { selic: 0.10, ipca: 0.045 }) {
      const simulados = this.simularSensibilidade(ativos, premissas);

      const totalAtual = simulados.reduce((s, a) => s + (Number(a.valorAtual) || 0), 0);
      const totalProjetado = simulados.reduce((s, a) => s + a.valorProjetado, 0);
      const totalProjetadoReal = simulados.reduce((s, a) => s + a.valorProjetadoReal, 0);

      return {
        ativos: simulados,
        totalAtual: Math.round(totalAtual * 100) / 100,
        totalProjetado: Math.round(totalProjetado * 100) / 100,
        totalProjetadoReal: Math.round(totalProjetadoReal * 100) / 100,
        premissas
      };
    },

    // ─── RENTABILIDADE VS BENCHMARKS ─────────────────────────────────────
    // Compara a rentabilidade da carteira contra indicadores de referência.
    //
    // carteira: { rentMes, rentAno, rent12m, rent24m }
    // benchmarks: { cdi, ipca, ibovespa, ipcaMais6 }
    // ────────────────────────────────────────────────────────────────────

    compararBenchmarks(carteira = {}, benchmarks = {}) {
      const periodos = ['rentMes', 'rentAno', 'rent12m', 'rent24m'];
      const labelsperiodo = {
        rentMes: 'Mês',
        rentAno: 'Ano',
        rent12m: '12 meses',
        rent24m: '24 meses'
      };

      const comparacao = periodos.map(p => ({
        periodo: labelsperiodo[p],
        carteira: Number(carteira[p]) || 0,
        cdi: Number(benchmarks.cdi?.[p]) || 0,
        ipca: Number(benchmarks.ipca?.[p]) || 0,
        ibovespa: Number(benchmarks.ibovespa?.[p]) || 0,
        ipcaMais6: Number(benchmarks.ipcaMais6?.[p]) || 0
      }));

      return comparacao;
    },

    // ─── CENÁRIOS MACROECONÔMICOS (3 cenários) ──────────────────────────
    // Recalcula toda a carteira sob 3 premissas diferentes.
    // ────────────────────────────────────────────────────────────────────

    simularCenariosCarteira(ativos = [], cenarios = null) {
      const cenariosDefault = cenarios || {
        conservador: { selic: 0.085, ipca: 0.055 },
        base: { selic: 0.10, ipca: 0.045 },
        otimista: { selic: 0.12, ipca: 0.035 }
      };

      const resultados = {};
      Object.entries(cenariosDefault).forEach(([nome, premissas]) => {
        resultados[nome] = this.simularCarteira(ativos, premissas);
      });

      return resultados;
    },

    // ─── UTILITÁRIO: CRIAR ATIVO PADRÃO ─────────────────────────────────
    // Helper para criar um objeto de ativo com todos os campos.
    // ────────────────────────────────────────────────────────────────────

    criarAtivo(dados = {}) {
      return {
        id: dados.id || 'ativo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        instituicao: dados.instituicao || '',
        nome: dados.nome || '',
        tipo: dados.tipo || '',
        emissor: dados.emissor || '',
        dataAplicacao: dados.dataAplicacao || '',
        dataVencimento: dados.dataVencimento || '',
        valorAplicado: Number(dados.valorAplicado) || 0,
        valorAtual: Number(dados.valorAtual) || 0,
        indexador: dados.indexador || '',
        taxa: Number(dados.taxa) || 0,
        taxaBase: Number(dados.taxaBase) || 0,
        liquidez: dados.liquidez || 'No vencimento',
        classe: dados.classe || 'caixa',
        tributacao: dados.tributacao || '',
        fgc: dados.fgc || false,
        rentMes: Number(dados.rentMes) || 0,
        rentAno: Number(dados.rentAno) || 0,
        rent12m: Number(dados.rent12m) || 0,
        rent24m: Number(dados.rent24m) || 0
      };
    }
  };

  // Expõe globalmente
  window.CarteiraEngine = CarteiraEngine;

})(window);

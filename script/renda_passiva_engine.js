// =============================================================================
// renda_passiva_engine.js
// Motor Financeiro de Renda Passiva — Acumulação e Desacumulação
// Whealth Planner Pro — Ritmo Wealth Pro
// =============================================================================
// Motor puro de cálculo (sem dependência de DOM).
// Todas as funções recebem parâmetros e retornam objetos de resultado.
// =============================================================================

(function (window) {
  'use strict';

  const RendaPassivaEngine = {

    // ─── FASE 1: ACUMULAÇÃO ────────────────────────────────────────────────
    // Calcula a evolução do patrimônio desde a idade atual até a idade de
    // aposentadoria, com juros compostos mensais, aportes e inflação.
    //
    // Parâmetros:
    //   patrimonioAtual   - Patrimônio financeiro atual em R$
    //   aporteMensal      - Aporte mensal em R$
    //   rentabilidadeAnual - Rentabilidade nominal anual (ex: 0.10 = 10%)
    //   inflacaoAnual     - Inflação anual esperada (ex: 0.05 = 5%)
    //   idadeAtual        - Idade atual do cliente
    //   idadeAposentadoria - Idade para reduzir/parar de trabalhar
    //   receitasAdicionais - Array de { idade, valor, descricao } receitas futuras
    //   retiradasExtraordinarias - Array de { idade, valor, descricao } retiradas futuras
    //
    // Retorna:
    //   { patrimonioNominal, patrimonioReal, evolucaoAnual[], mesesAcumulacao }
    // ────────────────────────────────────────────────────────────────────────

    calcularAcumulacao({
      patrimonioAtual = 0,
      aporteMensal = 0,
      rentabilidadeAnual = 0.10,
      inflacaoAnual = 0.05,
      idadeAtual = 50,
      idadeAposentadoria = 60,
      receitasAdicionais = [],
      retiradasExtraordinarias = []
    } = {}) {
      const anosAcumulacao = Math.max(0, idadeAposentadoria - idadeAtual);
      const mesesAcumulacao = anosAcumulacao * 12;

      // Taxas mensais
      const taxaMensal = Math.pow(1 + rentabilidadeAnual, 1 / 12) - 1;
      const inflacaoMensal = Math.pow(1 + inflacaoAnual, 1 / 12) - 1;

      let patrimonioNominal = patrimonioAtual;
      const evolucaoAnual = [];

      // Registro do ano 0
      evolucaoAnual.push({
        idade: idadeAtual,
        ano: 0,
        patrimonioNominal: patrimonioAtual,
        patrimonioReal: patrimonioAtual,
        aporteAcumulado: 0,
        rendimentoAcumulado: 0
      });

      let aporteAcumuladoTotal = 0;

      for (let ano = 1; ano <= anosAcumulacao; ano++) {
        const idadeNoAno = idadeAtual + ano;

        // Aplica 12 meses de juros compostos + aportes
        for (let mes = 0; mes < 12; mes++) {
          const rendimento = patrimonioNominal * taxaMensal;
          patrimonioNominal += rendimento + aporteMensal;
          aporteAcumuladoTotal += aporteMensal;
        }

        // Receitas adicionais no ano
        receitasAdicionais.forEach(r => {
          if (r.idade === idadeNoAno) {
            patrimonioNominal += (r.valor || 0);
          }
        });

        // Retiradas extraordinárias no ano
        retiradasExtraordinarias.forEach(r => {
          if (r.idade === idadeNoAno) {
            patrimonioNominal -= (r.valor || 0);
            if (patrimonioNominal < 0) patrimonioNominal = 0;
          }
        });

        // Patrimônio real (em valores de hoje)
        const fatorInflacao = Math.pow(1 + inflacaoAnual, ano);
        const patrimonioReal = patrimonioNominal / fatorInflacao;

        evolucaoAnual.push({
          idade: idadeNoAno,
          ano,
          patrimonioNominal: Math.round(patrimonioNominal * 100) / 100,
          patrimonioReal: Math.round(patrimonioReal * 100) / 100,
          aporteAcumulado: Math.round(aporteAcumuladoTotal * 100) / 100,
          rendimentoAcumulado: Math.round((patrimonioNominal - patrimonioAtual - aporteAcumuladoTotal) * 100) / 100
        });
      }

      const ultimoAno = evolucaoAnual[evolucaoAnual.length - 1];

      return {
        patrimonioNominal: ultimoAno.patrimonioNominal,
        patrimonioReal: ultimoAno.patrimonioReal,
        evolucaoAnual,
        mesesAcumulacao,
        anosAcumulacao,
        aporteTotal: aporteAcumuladoTotal,
        rendimentoTotal: ultimoAno.rendimentoAcumulado
      };
    },

    // ─── FASE 2: DESACUMULAÇÃO ─────────────────────────────────────────────
    // Calcula a renda passiva mensal possível a partir do patrimônio acumulado,
    // em dois cenários:
    //   Cenário 1: Preservação do Capital (renda perpétua)
    //   Cenário 2: Consumo Gradual (anuidade até idade final)
    //
    // Parâmetros:
    //   patrimonioAcumulado - Patrimônio no início da fase de renda
    //   rentabilidadeAnual  - Rentabilidade nominal anual esperada
    //   inflacaoAnual       - Inflação anual esperada
    //   idadeInicio         - Idade de início da renda (aposentadoria)
    //   idadeFinal          - Idade até quando projetar (ex: 95 anos)
    //
    // Retorna:
    //   { preservacao: { rendaMensal, rendaReal }, consumo: { rendaMensal, rendaReal, evolucaoAnual[] } }
    // ────────────────────────────────────────────────────────────────────────

    calcularDesacumulacao({
      patrimonioAcumulado = 0,
      rentabilidadeAnual = 0.10,
      inflacaoAnual = 0.05,
      idadeInicio = 60,
      idadeFinal = 95
    } = {}) {
      // Rentabilidade real: (1 + nominal) / (1 + inflação) - 1
      const taxaReal = (1 + rentabilidadeAnual) / (1 + inflacaoAnual) - 1;
      const taxaRealMensal = Math.pow(1 + taxaReal, 1 / 12) - 1;
      const taxaNominalMensal = Math.pow(1 + rentabilidadeAnual, 1 / 12) - 1;

      // ──────────────────────────────────────────────────────────────────────
      // CENÁRIO 1 — PRESERVAÇÃO DO CAPITAL
      // Renda = Patrimônio × taxa_real_mensal
      // O patrimônio se mantém intacto em termos reais para sempre.
      // ──────────────────────────────────────────────────────────────────────
      const rendaPreservacaoReal = patrimonioAcumulado * taxaRealMensal;
      const rendaPreservacaoNominal = patrimonioAcumulado * taxaNominalMensal;

      // ──────────────────────────────────────────────────────────────────────
      // CENÁRIO 2 — CONSUMO GRADUAL (Anuidade / PMT)
      // PMT = PV × r / (1 - (1+r)^(-n))
      // Onde: PV = patrimônio, r = taxa real mensal, n = meses restantes
      // A renda é corrigida pela inflação a cada ano, consumindo o principal.
      // ──────────────────────────────────────────────────────────────────────
      const anosDesacumulacao = Math.max(1, idadeFinal - idadeInicio);
      const mesesDesacumulacao = anosDesacumulacao * 12;

      let rendaConsumoReal = 0;
      if (taxaRealMensal > 0) {
        rendaConsumoReal = patrimonioAcumulado * taxaRealMensal /
          (1 - Math.pow(1 + taxaRealMensal, -mesesDesacumulacao));
      } else if (taxaRealMensal === 0) {
        // Sem juros reais, simplesmente divide o patrimônio pelo tempo
        rendaConsumoReal = patrimonioAcumulado / mesesDesacumulacao;
      } else {
        // Taxa real negativa (inflação > rentabilidade)
        rendaConsumoReal = patrimonioAcumulado * taxaRealMensal /
          (1 - Math.pow(1 + taxaRealMensal, -mesesDesacumulacao));
      }

      // Evolução anual do patrimônio durante a fase de consumo
      const evolucaoConsumo = [];
      let patrimonioRestante = patrimonioAcumulado;
      const rendaMensalReal = rendaConsumoReal;

      evolucaoConsumo.push({
        idade: idadeInicio,
        ano: 0,
        patrimonioNominal: patrimonioAcumulado,
        patrimonioReal: patrimonioAcumulado,
        rendaMensalNominal: rendaMensalReal,
        rendaMensalReal: rendaMensalReal
      });

      for (let ano = 1; ano <= anosDesacumulacao; ano++) {
        const idadeNoAno = idadeInicio + ano;
        const fatorInflacao = Math.pow(1 + inflacaoAnual, ano);

        // Renda mensal nominal (corrigida pela inflação)
        const rendaNominalMensal = rendaMensalReal * fatorInflacao;

        // Simula 12 meses de rendimento - retirada
        for (let mes = 0; mes < 12; mes++) {
          const rendimento = patrimonioRestante * taxaNominalMensal;
          patrimonioRestante += rendimento - rendaNominalMensal;
          if (patrimonioRestante < 0) patrimonioRestante = 0;
        }

        const patrimonioReal = patrimonioRestante / fatorInflacao;

        evolucaoConsumo.push({
          idade: idadeNoAno,
          ano,
          patrimonioNominal: Math.round(patrimonioRestante * 100) / 100,
          patrimonioReal: Math.round(patrimonioReal * 100) / 100,
          rendaMensalNominal: Math.round(rendaNominalMensal * 100) / 100,
          rendaMensalReal: Math.round(rendaMensalReal * 100) / 100
        });
      }

      return {
        taxaReal: Math.round(taxaReal * 10000) / 10000,
        taxaRealMensal: Math.round(taxaRealMensal * 100000000) / 100000000,

        preservacao: {
          rendaMensalNominal: Math.round(rendaPreservacaoNominal * 100) / 100,
          rendaMensalReal: Math.round(rendaPreservacaoReal * 100) / 100,
          descricao: 'Renda perpétua sem consumir o principal (em valores reais)'
        },

        consumo: {
          rendaMensalReal: Math.round(rendaConsumoReal * 100) / 100,
          rendaMensalNominalInicial: Math.round(rendaConsumoReal * 100) / 100,
          meses: mesesDesacumulacao,
          anos: anosDesacumulacao,
          evolucaoAnual: evolucaoConsumo,
          descricao: `Renda corrigida pela inflação dos ${idadeInicio} aos ${idadeFinal} anos, consumindo o patrimônio gradualmente`
        }
      };
    },

    // ─── SIMULAÇÃO COMPLETA (Acumulação + Desacumulação) ───────────────────
    // Combina ambas as fases numa única chamada.
    // ────────────────────────────────────────────────────────────────────────

    simularCompleto({
      patrimonioAtual = 0,
      aporteMensal = 0,
      rentabilidadeAnual = 0.10,
      inflacaoAnual = 0.05,
      idadeAtual = 50,
      idadeAposentadoria = 60,
      idadeFinal = 95,
      receitasAdicionais = [],
      retiradasExtraordinarias = []
    } = {}) {
      // Fase 1: Acumula
      const acumulacao = this.calcularAcumulacao({
        patrimonioAtual,
        aporteMensal,
        rentabilidadeAnual,
        inflacaoAnual,
        idadeAtual,
        idadeAposentadoria,
        receitasAdicionais,
        retiradasExtraordinarias
      });

      // Fase 2: Desacumula
      const desacumulacao = this.calcularDesacumulacao({
        patrimonioAcumulado: acumulacao.patrimonioNominal,
        rentabilidadeAnual,
        inflacaoAnual,
        idadeInicio: idadeAposentadoria,
        idadeFinal
      });

      // Linha do tempo unificada (para gráfico contínuo)
      const linhaDoTempo = [
        ...acumulacao.evolucaoAnual.map(p => ({
          ...p,
          fase: 'acumulacao'
        })),
        ...desacumulacao.consumo.evolucaoAnual.slice(1).map(p => ({
          ...p,
          fase: 'desacumulacao'
        }))
      ];

      return {
        acumulacao,
        desacumulacao,
        linhaDoTempo,
        resumo: {
          patrimonioHoje: patrimonioAtual,
          patrimonioAposentadoria: acumulacao.patrimonioNominal,
          patrimonioAposentadoriaReal: acumulacao.patrimonioReal,
          rendaPreservacao: desacumulacao.preservacao.rendaMensalReal,
          rendaConsumo: desacumulacao.consumo.rendaMensalReal,
          taxaReal: desacumulacao.taxaReal,
          idadeAtual,
          idadeAposentadoria,
          idadeFinal
        }
      };
    },

    // ─── CENÁRIOS MACROECONÔMICOS ──────────────────────────────────────────
    // Simula 3 cenários (Conservador, Base, Otimista) de uma só vez.
    // ────────────────────────────────────────────────────────────────────────

    simularCenarios({
      patrimonioAtual = 0,
      aporteMensal = 0,
      idadeAtual = 50,
      idadeAposentadoria = 60,
      idadeFinal = 95,
      cenarios = null
    } = {}) {
      const cenariosDefault = cenarios || {
        conservador: { selic: 0.085, ipca: 0.055, rentabilidade: 0.08 },
        base: { selic: 0.10, ipca: 0.045, rentabilidade: 0.10 },
        otimista: { selic: 0.12, ipca: 0.035, rentabilidade: 0.12 }
      };

      const resultados = {};

      Object.entries(cenariosDefault).forEach(([nome, premissas]) => {
        resultados[nome] = this.simularCompleto({
          patrimonioAtual,
          aporteMensal,
          rentabilidadeAnual: premissas.rentabilidade,
          inflacaoAnual: premissas.ipca,
          idadeAtual,
          idadeAposentadoria,
          idadeFinal
        });
        resultados[nome].premissas = premissas;
      });

      return resultados;
    }
  };

  // Expõe globalmente
  window.RendaPassivaEngine = RendaPassivaEngine;

})(window);

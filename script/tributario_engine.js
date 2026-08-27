// tributario_engine.js - Motor de Cálculo Tributário e Sucessório (Whealth Planner Pro)
// Contém todas as regras de alíquotas estaduais (ITCMD), partilha de regimes de bens e estratégias de liquidez.

(function (window) {
  'use strict';

  // Tabela de Alíquotas Médias / Progressivas do ITCMD por Estado
  const ALIQUOTAS_ITCMD_ESTADOS = {
    SP: 4.0,   // São Paulo (fixo 4% - simulação de reforma pode ir até 8%)
    RJ: 8.0,   // Rio de Janeiro (progressivo 4% a 8%)
    MG: 5.0,   // Minas Gerais (progressivo até 5%)
    RS: 6.0,   // Rio Grande do Sul (progressivo até 6%)
    SC: 8.0,   // Santa Catarina (progressivo até 8%)
    PR: 4.0,   // Paraná (fixo 4%)
    BA: 8.0,   // Bahia (progressivo até 8%)
    DF: 6.0,   // Distrito Federal (progressivo 4% a 6%)
    GO: 8.0,   // Goiás (progressivo até 8%)
    CE: 8.0,   // Ceará (progressivo até 8%)
    PE: 8.0,   // Pernambuco (progressivo até 8%)
    ES: 4.0    // Espírito Santo (fixo 4%)
  };

  const TributarioEngine = {
    // Limite de isenção anual legal do ITCMD (2.500 UFESPs / SP como padrão de referência nacional)
    LIMITE_ISENCAO_ANUAL: 96050,

    // Valida e aplica trava ao valor anual de doação isenta
    validarLimiteDoacaoIsenta(valor) {
      const num = Math.max(0, Number(valor) || 0);
      const excedeu = num > this.LIMITE_ISENCAO_ANUAL;
      return {
        valorValido: excedeu ? this.LIMITE_ISENCAO_ANUAL : num,
        excedeuLimite: excedeu,
        limiteMaximo: this.LIMITE_ISENCAO_ANUAL
      };
    },

    // Obter alíquota estimada do ITCMD por Estado
    obterAliquotaITCMD(uf) {
      if (!uf) return 4.0;
      const ufUpper = String(uf).toUpperCase().trim();
      return ALIQUOTAS_ITCMD_ESTADOS[ufUpper] !== undefined ? ALIQUOTAS_ITCMD_ESTADOS[ufUpper] : 4.0;
    },

    // Calcular custo bruto do inventário (ITCMD + Honorários + Custas)
    calcularCustosInventario(totalPatrimonio, aliquotaITCMD, pctHonorarios, pctCustas) {
      const patrimonio = Math.max(0, Number(totalPatrimonio) || 0);
      const itcmdPct = Math.max(0, Number(aliquotaITCMD) || 0) / 100;
      const honorariosPct = Math.max(0, Number(pctHonorarios) || 0) / 100;
      const custasPct = Math.max(0, Number(pctCustas) || 0) / 100;

      const valorITCMD = patrimonio * itcmdPct;
      const valorHonorarios = patrimonio * honorariosPct;
      const valorCustas = patrimonio * custasPct;

      const totalPrejuizo = valorITCMD + valorHonorarios + valorCustas;
      const pctPrejuizoTotal = patrimonio > 0 ? (totalPrejuizo / patrimonio) * 100 : 0;

      return {
        patrimonio,
        valorITCMD,
        valorHonorarios,
        valorCustas,
        totalPrejuizo,
        pctPrejuizoTotal
      };
    },

    // Calcular partilha de bens (Meação vs. Herança)
    calcularPartilhaRegime(dadosPatrimonio, familia) {
      const regime = familia.regime || "comunhao_parcial";
      const totalPatrimonio = Number(sessionStorage.getItem("total_patrimonio")) || 0;

      let meacaoConjuge = 0;
      let herancaTransmitida = 0;

      if (familia.estadoCivil !== "casado") {
        // Solteiro / Divorciado / Viúvo: 100% vira herança
        meacaoConjuge = 0;
        herancaTransmitida = totalPatrimonio;
      } else {
        switch (regime) {
          case "comunhao_universal":
            // 50% meação, 50% herança
            meacaoConjuge = totalPatrimonio * 0.5;
            herancaTransmitida = totalPatrimonio * 0.5;
            break;

          case "separacao_total":
            // 0% meação, 100% herança (cônjuge concorre com filhos)
            meacaoConjuge = 0;
            herancaTransmitida = totalPatrimonio;
            break;

          case "comunhao_parcial":
          default:
            // Bens adquiridos na constância do casamento (meação 50%) + bens particulares (herança)
            const bensParticulares = Number(dadosPatrimonio.bens_particulares) || 0;
            const bensComuns = Math.max(0, totalPatrimonio - bensParticulares);
            
            meacaoConjuge = bensComuns * 0.5;
            herancaTransmitida = (bensComuns * 0.5) + bensParticulares;
            break;
        }
      }

      return {
        totalPatrimonio,
        regime,
        meacaoConjuge,
        herancaTransmitida
      };
    },

    // Calcular as 4 Estratégias de Preservação e Liquidez Sucessória
    calcularEstrategias(totalPatrimonio, prejuizoBruto, inputs) {
      const patrimonio = Math.max(0, Number(totalPatrimonio) || 0);
      const prejuizo = Math.max(0, Number(prejuizoBruto) || 0);

      // 1. Doação Gradual em Vida (Aproveita isenção de ITCMD até limite anual)
      const pctDoacaoGradual = Math.min(100, Math.max(0, Number(inputs.doacao) || 0));
      const valorDoadoGradual = patrimonio * (pctDoacaoGradual / 100);
      const economiaITCMDGradual = valorDoadoGradual * ((Number(inputs.itcmd) || 4) / 100);
      const prejuizoAjustadoGradual = Math.max(0, prejuizo - economiaITCMDGradual);

      // 2. Doação à Vista com Reserva de Usufruto
      const pctDoacaoAVista = Math.min(100, Math.max(0, Number(inputs.doacao_avista) || 0));
      const valorDoadoAVista = patrimonio * (pctDoacaoAVista / 100);
      // Na doação à vista paga-se ITCMD antecipado (geralmente com desconto de usufruto de 1/3 em alguns estados)
      const itcmdAntecipado = valorDoadoAVista * ((Number(inputs.itcmd) || 4) / 100) * 0.67;

      // 3. Previdência Privada (VGBL/PGBL sem inventário)
      const valorPrevidencia = Math.max(0, Number(inputs.previdencia) || 0);
      // Previdência transmite direto aos beneficiários sem custas judiciais e sem honorários
      const economiaInventarioPrev = valorPrevidencia * (((Number(inputs.honorarios) || 5) + (Number(inputs.custas) || 1.5)) / 100);

      // 4. Seguro Sucessão (Alavancagem de Liquidez em 120 parcelas)
      const capitalSeguro = Math.max(0, Number(inputs.seguro_capital) || prejuizo);
      const idadeSegurado = Number(inputs.seguro_idade) || 40;
      
      // Estimativa aproximada de taxa de seguro de vida resgatável/sucessório (~0.8% a 1.8% a.a. dependendo da idade)
      const taxaAnualSeguro = 0.008 + Math.max(0, (idadeSegurado - 30) * 0.0003);
      const premioAnual = capitalSeguro * taxaAnualSeguro;
      const premioMensal = premioAnual / 12;

      return {
        gradual: {
          pct: pctDoacaoGradual,
          valorDoado: valorDoadoGradual,
          economiaITCMD: economiaITCMDGradual,
          prejuizoAjustado: prejuizoAjustadoGradual
        },
        aVista: {
          pct: pctDoacaoAVista,
          valorDoado: valorDoadoAVista,
          itcmdAntecipado
        },
        previdencia: {
          valor: valorPrevidencia,
          economiaInventario: economiaInventarioPrev
        },
        seguro: {
          capitalSeguro,
          idadeSegurado,
          premioAnual,
          premioMensal
        }
      };
    }
  };

  window.TributarioEngine = TributarioEngine;
})(window);

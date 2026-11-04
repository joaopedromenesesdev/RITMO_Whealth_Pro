// tributario_engine.js - Motor de Cálculo Tributário e Sucessório (Whealth Planner Pro)
// Contém todas as regras de alíquotas estaduais (ITCMD), partilha de regimes de bens e estratégias de liquidez.

(function (global) {
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
    calcularPartilhaRegime(dadosPatrimonio, familia, totalPatrimonio = 0) {
      const dp = dadosPatrimonio || {};
      const fam = familia || {};
      const regime = fam.regime || "comunhao_parcial";
      const total = Number(totalPatrimonio) || Number(dp.totalPatrimonio) || 0;

      let meacaoConjuge = 0;
      let herancaTransmitida = 0;

      if (fam.estadoCivil !== "casado") {
        // Solteiro / Divorciado / Viúvo: 100% vira herança
        meacaoConjuge = 0;
        herancaTransmitida = total;
      } else {
        switch (regime) {
          case "comunhao_universal":
            // 50% meação, 50% herança
            meacaoConjuge = total * 0.5;
            herancaTransmitida = total * 0.5;
            break;

          case "separacao_total":
            // 0% meação, 100% herança (cônjuge concorre com filhos)
            meacaoConjuge = 0;
            herancaTransmitida = total;
            break;

          case "comunhao_parcial":
          default:
            // Bens adquiridos na constância do casamento (meação 50%) + bens particulares (herança)
            const bensParticulares = Number(dp.bens_particulares) || 0;
            const bensComuns = Math.max(0, total - bensParticulares);
            
            meacaoConjuge = bensComuns * 0.5;
            herancaTransmitida = (bensComuns * 0.5) + bensParticulares;
            break;
        }
      }

      return {
        totalPatrimonio: total,
        regime,
        meacaoConjuge,
        herancaTransmitida
      };
    },

    // Calcular partilha sucessória completa (Código Civil Brasileiro - Arts. 1.829 a 1.839)
    // Função pura: recebe parâmetros sem efeitos colaterais e sem dependência de DOM ou storage
    calcularPartilhaSucessoria(parametros) {
      const params = parametros || {};
      const fam = params.familia || {};

      const totalNum = Math.max(0, Number(params.totalPatrimonio) || 0);
      const prevNum = Math.max(0, Number(params.valorPrevidencia) || 0);
      const bensParticularesNum = Math.max(0, Number(params.bensParticulares) || 0);

      // Previdência não entra em inventário (isenta da partilha judicial)
      const totalCalculo = Math.max(0, totalNum - prevNum);

      const casado = String(fam.estadoCivil || "").toLowerCase() === "casado";
      const temFilhos = String(fam.temFilhos || "").toLowerCase() === "sim";
      const qtdFilhos = Number(fam.qtdFilhos) || 0;
      const possuiPais = String(fam.possuiPais || "").toLowerCase() === "sim";
      const qtdPais = Number(fam.qtdPais) || 0;
      const possuiColaterais = String(fam.possuiColaterais || "").toLowerCase() === "sim";
      const qtdColaterais = Number(fam.qtdColaterais) || 0;

      const regimeNorm = String(fam.regime || "comunhao_parcial")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/_/g, " ");

      const comunhaoUniversal = regimeNorm.includes("comunhao universal");
      const separacaoTotal = regimeNorm.includes("separacao total");
      const comunhaoParcial = regimeNorm.includes("comunhao parcial") || regimeNorm.includes("participacao final") || regimeNorm.includes("aquestos");
      const comunhao = comunhaoParcial || comunhaoUniversal;

      let bensComuns = 0;
      let bensParticularesCalculo = 0;

      if (casado) {
        if (comunhaoUniversal) {
          bensComuns = totalCalculo;
          bensParticularesCalculo = 0;
        } else if (comunhaoParcial) {
          bensParticularesCalculo = Math.min(totalCalculo, bensParticularesNum);
          bensComuns = Math.max(0, totalCalculo - bensParticularesCalculo);
        } else if (separacaoTotal) {
          bensComuns = 0;
          bensParticularesCalculo = totalCalculo;
        } else {
          bensComuns = totalCalculo;
          bensParticularesCalculo = 0;
        }
      } else {
        bensComuns = 0;
        bensParticularesCalculo = totalCalculo;
      }

      // Meação (somente sobre bens comuns)
      let meacao = 0;
      if (casado && comunhao) {
        meacao = bensComuns * 0.5;
      }

      // Divisão da Herança dos Bens Comuns
      const herancaComuns = bensComuns * (casado && comunhao ? 0.5 : 1);
      let cHerancaComuns = 0;
      let filhosComuns = 0;
      let paisComuns = 0;
      let colateraisComuns = 0;
      let uniaoComuns = 0;

      if (temFilhos && qtdFilhos > 0) {
        if (casado && comunhao) {
          cHerancaComuns = 0;
          filhosComuns = herancaComuns;
        } else if (casado && !separacaoTotal) {
          const quotaConjuge = qtdFilhos >= 3 ? herancaComuns * 0.25 : herancaComuns / (qtdFilhos + 1);
          cHerancaComuns = quotaConjuge;
          filhosComuns = herancaComuns - cHerancaComuns;
        } else {
          cHerancaComuns = 0;
          filhosComuns = herancaComuns;
        }
      } else if (possuiPais && qtdPais > 0) {
        if (casado) {
          cHerancaComuns = herancaComuns / (qtdPais + 1);
          paisComuns = herancaComuns - cHerancaComuns;
        } else {
          cHerancaComuns = 0;
          paisComuns = herancaComuns;
        }
      } else if (casado) {
        cHerancaComuns = herancaComuns;
      } else if (possuiColaterais && qtdColaterais > 0) {
        colateraisComuns = herancaComuns;
      } else {
        uniaoComuns = herancaComuns;
      }

      // Divisão da Herança dos Bens Particulares
      const herancaParticulares = bensParticularesCalculo;
      let cHerancaParticulares = 0;
      let filhosParticulares = 0;
      let paisParticulares = 0;
      let colateraisParticulares = 0;
      let uniaoParticulares = 0;

      if (temFilhos && qtdFilhos > 0) {
        if (casado && (comunhaoParcial || separacaoTotal)) {
          const quotaConjuge = herancaParticulares / (qtdFilhos + 1);
          cHerancaParticulares = quotaConjuge;
          filhosParticulares = herancaParticulares - cHerancaParticulares;
        } else {
          cHerancaParticulares = 0;
          filhosParticulares = herancaParticulares;
        }
      } else {
        if (casado && comunhaoParcial) {
          cHerancaParticulares = herancaParticulares;
          filhosParticulares = 0;
        } else if (possuiPais && qtdPais > 0) {
          if (casado) {
            cHerancaParticulares = herancaParticulares / (qtdPais + 1);
            paisParticulares = herancaParticulares - cHerancaParticulares;
          } else {
            cHerancaParticulares = 0;
            paisParticulares = herancaParticulares;
          }
        } else if (casado) {
          cHerancaParticulares = herancaParticulares;
        } else if (possuiColaterais && qtdColaterais > 0) {
          colateraisParticulares = herancaParticulares;
        } else {
          uniaoParticulares = herancaParticulares;
        }
      }

      // Montagem de quotas, fatias e labels estruturados
      const labels = [];
      const fatias = [];

      const totalHerancaConjuge = cHerancaComuns + cHerancaParticulares;
      const totalConjuge = meacao + totalHerancaConjuge;
      if (totalConjuge > 0) {
        labels.push("Cônjuge (Meação + Herança)");
        fatias.push(totalConjuge);
      }

      const totalFilhos = filhosComuns + filhosParticulares;
      if (totalFilhos > 0 && qtdFilhos > 0) {
        const quotaPorFilho = totalFilhos / qtdFilhos;
        for (let i = 1; i <= qtdFilhos; i++) {
          labels.push(`Filho ${i}`);
          fatias.push(quotaPorFilho);
        }
      }

      const totalPais = paisComuns + paisParticulares;
      if (totalPais > 0 && qtdPais > 0) {
        const quotaPorPai = totalPais / qtdPais;
        for (let i = 1; i <= qtdPais; i++) {
          labels.push(qtdPais === 2 ? (i === 1 ? "Pai" : "Mãe") : "Ascendente");
          fatias.push(quotaPorPai);
        }
      }

      const totalColaterais = colateraisComuns + colateraisParticulares;
      if (totalColaterais > 0 && qtdColaterais > 0) {
        const quotaPorColateral = totalColaterais / qtdColaterais;
        for (let i = 1; i <= qtdColaterais; i++) {
          labels.push(`Colateral ${i}`);
          fatias.push(quotaPorColateral);
        }
      }

      const totalUniao = uniaoComuns + uniaoParticulares;
      if (totalUniao > 0) {
        labels.push("Município / DF / União");
        fatias.push(totalUniao);
      }

      const heranca = totalCalculo - meacao;

      return {
        totalCalculo,
        meacao,
        heranca,
        fatiaConjugeTotal: totalConjuge,
        labels,
        fatias,
        detalhes: {
          bensComuns,
          bensParticulares: bensParticularesCalculo,
          cHerancaComuns,
          cHerancaParticulares,
          filhosComuns,
          filhosParticulares,
          paisComuns,
          paisParticulares,
          colateraisComuns,
          colateraisParticulares,
          uniaoComuns,
          uniaoParticulares
        }
      };
    },

    // Calcular as 4 Estratégias de Preservação e Liquidez Sucessória
    calcularEstrategias(totalPatrimonio, prejuizoBruto, inputs) {
      const patrimonio = Math.max(0, Number(totalPatrimonio) || 0);
      const prejuizo = Math.max(0, Number(prejuizoBruto) || 0);
      const inp = inputs || {};

      // 1. Doação Gradual em Vida (Aproveita isenção de ITCMD até limite anual)
      const pctDoacaoGradual = Math.min(100, Math.max(0, Number(inp.doacao) || 0));
      const valorDoadoGradual = patrimonio * (pctDoacaoGradual / 100);
      const economiaITCMDGradual = valorDoadoGradual * ((Number(inp.itcmd) || 4) / 100);
      const prejuizoAjustadoGradual = Math.max(0, prejuizo - economiaITCMDGradual);

      // 2. Doação à Vista com Reserva de Usufruto
      const pctDoacaoAVista = Math.min(100, Math.max(0, Number(inp.doacao_avista) || 0));
      const valorDoadoAVista = patrimonio * (pctDoacaoAVista / 100);
      // Na doação à vista paga-se ITCMD antecipado (geralmente com desconto de usufruto de 1/3 em alguns estados)
      const itcmdAntecipado = valorDoadoAVista * ((Number(inp.itcmd) || 4) / 100) * 0.67;

      // 3. Previdência Privada (VGBL/PGBL sem inventário)
      const valorPrevidencia = Math.max(0, Number(inp.previdencia) || 0);
      // Previdência transmite direto aos beneficiários sem custas judiciais e sem honorários
      const economiaInventarioPrev = valorPrevidencia * (((Number(inp.honorarios) || 5) + (Number(inp.custas) || 1.5)) / 100);

      // 4. Seguro Sucessão (Alavancagem de Liquidez em 120 parcelas)
      const capitalSeguro = Math.max(0, Number(inp.seguro_capital) || prejuizo);
      const idadeSegurado = Number(inp.seguro_idade) || 40;
      
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

  // Exposição Universal (Compatível com Navegador e Node.js / Test Runners)
  global.TributarioEngine = TributarioEngine;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TributarioEngine;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));

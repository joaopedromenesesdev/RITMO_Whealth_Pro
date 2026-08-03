# 💼 Pace Capital — Wealth Planner Pro

[![Status](https://img.shields.io/badge/Status-Ativo-emerald.svg)]()
[![Stack](https://img.shields.io/badge/Tech-HTML5%20%7C%20JavaScript%20ES6%2B%20%7C%20CSS3-blue.svg)]()
[![Database](https://img.shields.io/badge/Backend-Supabase%20(v2)-3ECF8E.svg)]()
[![Charts](https://img.shields.io/badge/Visualization-Chart.js-FF6384.svg)]()

> **Plataforma web avançada para assessores e planejadores patrimoniais realizarem diagnósticos de liquidez sucessória, inventário de ativos, cálculos de prejuízo tributário/ITCMD, simulação de evolução patrimonial e geração automatizada de relatórios executivos em PDF.**

---

## 📋 Sumário
- [Visão Geral](#-visão-geral)
- [Funcionalidades Principais](#-funcionalidades-principais)
- [Arquitetura e Tecnologias](#-arquitetura-e-tecnologias)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Guia de Instalação e Configuração](#-guia-de-instalação-e-configuração)
- [Esquema do Banco de Dados (Supabase)](#-esquema-do-banco-de-dados-supabase)
- [Fluxo de Trabalho do Assessor](#-fluxo-de-trabalho-do-assessor)
- [Resiliência & Backup Offline](#-resiliência--backup-offline)
- [Licença e Créditos](#-licença-e-créditos)

---

## 🌌 Visão Geral

O **Wealth Planner Pro** foi desenvolvido para transformar o processo de planejamento patrimonial e sucessório em uma experiência visual, precisa e de alto valor percebido para o cliente. 

O sistema permite que assessores de investimentos analisem a composição patrimonial do cliente (bens móveis, imóveis, participação societária e ativos financeiros), simulem os custos de um eventual inventário (ITCMD, honorários advocatícios, custas judiciais e cartorárias) e proponham **4 estratégias de preservação e liquidez**:
1. **Doação Gradual em Vida** (Aproveitando limites anuais de isenção do ITCMD).
2. **Doação à Vista** (Com apuração de incidência do ITCMD).
3. **Previdência Privada** (Análise de limite isento de IOF de R$ 600.000/ano, imposto excedente e alertas comportamentais de herança).
4. **Seguro Sucessão** (Liquidez imediata via alavancagem com amortização em 120 parcelas).

---

## ✨ Funcionalidades Principais

- 🔑 **Autenticação & Controle de Acesso**: Sistema de login/cadastro via Supabase Auth com persistência de sessão e guards de rotas protegidas.
- 📊 **Dashboard Executivo**: Métricas globais (relatórios gerados, patrimônio total analisado, prejuízo tributário consolidado, média por cliente) e busca com filtros inteligentes.
- 📁 **Gestão de Simulações**: Criação, edição, clonagem, exportação e exclusão de planejamentos patrimoniais por cliente.
- 💰 **Inventário Patrimonial**: Detalhamento em Renda Fixa, Renda Variável, Fundos, Previdência Privada, Offshore, Imóveis, Participações Societárias e Bens/Passivos.
- 👨‍👩‍👧‍👦 **Estrutura Familiar e Regimes de Bens**: Suporte a Comunhão Parcial, Comunhão Universal, Separação Total e Participação Final nos Aquestos com segregação dinâmica de meação vs. herança e herdeiros necessários.
- 📈 **Simulador de Evolução Patrimonial**: Projeção de crescimento compostos em horizonte temporal (com taxas de retorno configuráveis, aportes e inflação) comparando cenário atual vs. projetado via Chart.js.
- ⚖️ **Motor Tributário & ITCMD por Estado**: Cálculo automatizado do ITCMD considerando alíquotas estaduais (SP, RJ, MG, RS, SC, PR, BA, DF, etc.) e simulação de impactos da Reforma Tributária.
- 📄 **Gerador de Relatórios PDF Profissional**: Impressão client-side em layout corporativo de 5 páginas com visualização em modal preview (Capa, Resumo Executivo com Análise Narrativa, Evolução e Família, Detalhamento Sucessório, Gráficos de Alocação e Estratégias de Preservação).

---

## 🛠️ Arquitetura e Tecnologias

- **Core Frontend**: HTML5 Semântico, JavaScript ES6+ (arquitetura modular sem frameworks pesados, garantindo alta performance).
- **Design System & Estilização**: CSS3 Vanilla modularizado (`style/`), utilizando variáveis CSS, paletas tailormade corporativas, glassmorphism, gradientes e animações suaves.
- **Visualização de Dados**: [Chart.js](https://www.chartjs.org/) + `chartjs-plugin-datalabels` para renderização de gráficos em Canvas.
- **Iconografia**: [Lucide Icons](https://lucide.dev/).
- **Backend as a Service**: [Supabase JS v2](https://supabase.com/) (Autenticação JWT + PostgreSQL database).
- **Relatório PDF**: Engine HTML-to-Canvas (`html2pdf.js` / window.print) otimizado com quebra de páginas estrita (`.pagina.nova-pagina`).

---

## 📂 Estrutura do Projeto

```
d:\projeto_BTG/
├── index.html               # Dashboard principal com métricas e lista de simulações
├── login.html               # Tela de login e cadastro de assessores
├── nova_simulacao.html      # Formulário de criação/inicialização de novo relatório
├── patrimonio.html          # Módulo 1: Inventário e alocação de bens
├── familiar.html            # Módulo 2: Estrutura familiar e regime de bens
├── evolucao.html            # Módulo 3: Projeção de evolução patrimonial
├── tributario.html          # Módulo 4: Análise de prejuízo tributário e relatório PDF
├── teste_agentes.html       # Suíte de testes e simulações internas
├── img/                     # Favicon e ativos gráficos
├── script/                  # Lógica de JavaScript modularizada
│   ├── auth.js              # Controle de autenticação e proteção de rotas
│   ├── dashboard.js         # Lógica do dashboard, estatísticas e listagem
│   ├── db.js                # Camada de abstração de dados (Supabase + LocalStorage)
│   ├── global_ui.js         # Utilitários de UI (toasts, botões, modais)
│   ├── patrimonio.js        # Formatação e cálculos do inventário de bens
│   ├── script_evolucao.js   # Algoritmo de projeção e gráficos de evolução
│   ├── script_familiar.js   # Regras de regime de casamento e herdeiros
│   ├── supabase_config.js   # Credenciais de conexão do Supabase
│   ├── theme.js             # Gerenciamento de tema (claro/escuro)
│   └── tributario.js        # Motor tributário (ITCMD, estratégias e PDF engine)
└── style/                   # Arquivos de estilização CSS
    ├── dashboard.css
    ├── evolucao.css
    ├── familiar.css
    ├── login.css
    ├── patrimonio.css
    ├── style.css            # Estilos globais e componentes base
    └── tributario.css       # Estilos da página tributária e impressão PDF
```

---

## 🚀 Guia de Instalação e Configuração

### Pré-requisitos
Nenhum compilador ou runtime como Node.js é estritamente obrigatório para rodar a aplicação frontend, pois todos os scripts são carregados via CDN / ES modules. Recomendamos utilizar qualquer servidor web HTTP simples (como Live Server no VSCode, Nginx, Apache ou Python `http.server`).

### Step 1: Clonar o Repositório
```bash
git clone https://github.com/joaopedromenesesdev/Whealth-Planner-Pro.git
cd Whealth-Planner-Pro
```

### Step 2: Configurar o Supabase
1. Crie um projeto no [Supabase](https://supabase.com/).
2. Obtenha a **URL do projeto** e a **chave anônima (`anon key`)**.
3. Abra o arquivo `script/supabase_config.js` e insira suas credenciais:

```javascript
const SUPABASE_URL = "SUA_SUPABASE_URL_AQUI";
const SUPABASE_ANON_KEY = "SUA_SUPABASE_ANON_KEY_AQUI";

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### Step 3: Executar Localmente
Abra o arquivo `index.html` ou `login.html` no seu navegador através de um servidor local:
```bash
# Exemplo usando Python HTTP Server:
python -m http.server 8000
```
Acesse `http://localhost:8000/login.html`.

---

## 🗄️ Esquema do Banco de Dados (Supabase)

Execute o seguinte script SQL no **SQL Editor** do seu projeto Supabase para criar a tabela de simulações e habilitar as políticas de segurança por linha (RLS):

```sql
-- Criação da tabela de simulações
CREATE TABLE public.simulacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome_cliente TEXT NOT NULL,
    nome_assessor TEXT,
    total_patrimonio NUMERIC(15,2) DEFAULT 0.00,
    prejuizo_tributario NUMERIC(15,2) DEFAULT 0.00,
    dados_completos JSONB DEFAULT '{}'::jsonb,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.simulacoes ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS (Cada assessor só lê, edita e deleta suas próprias simulações)
CREATE POLICY "Permitir leitura de simulações próprias" 
ON public.simulacoes FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Permitir inserção de simulações próprias" 
ON public.simulacoes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Permitir atualização de simulações próprias" 
ON public.simulacoes FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Permitir exclusão de simulações próprias" 
ON public.simulacoes FOR DELETE 
USING (auth.uid() = user_id);
```

---

## 🔄 Fluxo de Trabalho do Assessor

1. **Autenticação**: O assessor realiza login em `login.html`.
2. **Nova Simulação**: No Dashboard (`index.html`), clica em **"Novo Relatório"**, informando o nome do cliente e dados iniciais.
3. **Patrimônio (`patrimonio.html`)**: Preenche os valores dos ativos financeiros, bens imóveis, empresas e dívidas.
4. **Estrutura Familiar (`familiar.html`)**: Define o estado civil, regime de casamento, presença de cônjuge e herdeiros necessários.
5. **Evolução Patrimonial (`evolucao.html`)**: Define a taxa de juros real anual esperada, inflação e horizonte de projeção (anos).
6. **Análise Tributária & PDF (`tributario.html`)**:
   - Seleciona o estado (UF) do inventário.
   - Ajusta honorários advocatícios e custas cartorárias.
   - Analisa o impacto tributário do ITCMD e visualiza as 4 estratégias de preservação.
   - Clica em **"Visualizar Relatório PDF"** para abrir o modal de preview e efetuar o download/impressão do relatório completo de 5 páginas.

---

## 🛡️ Resiliência & Backup Offline

O sistema possui um mecanismo de **dupla camada de dados** gerenciado pelo módulo `script/db.js`:
- **Camada Primária**: Supabase (Nuvem em tempo real).
- **Camada de Backup Local**: `LocalStorage` com as chaves `relatorios_backup_${userId}` e `patrimonio_dados`.

Caso ocorra instabilidade de rede ou o Supabase fique temporariamente inacessível, o assessor continua conseguindo navegar, simular e gerar relatórios sem perda de dados. Assim que a conexão é reestabelecida, os dados são sincronizados com a nuvem.

---

## 📄 Licença e Créditos

Desenvolvido para **Pace Capital** / **Whealth Planner Pro**. Todos os direitos reservados.

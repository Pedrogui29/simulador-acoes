# 🚀 Simulador de Mercado de Ações (Rust + WebAssembly)

Este projeto é um simulador de mercado financeiro de alta performance desenvolvido como parte do curso. Ele utiliza **Rust** para o processamento matemático pesado (cálculo de indicadores, regressão linear) e **WebAssembly** para rodar essa lógica no navegador com velocidade nativa.

![Simulador Screenshot](./screenshot.png)

## 📋 Funcionalidades

### 1. Simulação em Tempo Real
- Geração de preços estocástica (Random Walk) processada em Rust.
- Atualização fluida a 60fps via integração Wasm-JS.

### 2. Análise Técnica (Core em Rust)
O motor financeiro foi escrito inteiramente em Rust para garantir segurança de memória e performance:
- **SMA (Média Móvel Simples):** Identificação de tendências de médio prazo.
- **RSI (Índice de Força Relativa):** Oscilador para identificar zonas de sobrecompra/sobrevenda.
- **Volatilidade (Desvio Padrão):** Cálculo estatístico de risco em tempo real.
- **Regressão Linear:** Algoritmo preditivo que projeta a tendência do preço para os próximos 5 segundos.

### 3. Home Broker Interativo
- Carteira fictícia com saldo inicial de R$ 10.000,00.
- Execução de ordens de Compra e Venda instantâneas.
- Cálculo automático de Patrimônio (Saldo + Posição em Ações).

## 🛠️ Tecnologias Utilizadas

- **Rust:** Lógica de negócios e matemática financeira.
- **WebAssembly (wasm-bindgen):** Interface de comunicação binária entre Rust e JS.
- **JavaScript (ES6+):** Manipulação do DOM e orquestração.
- **Chart.js:** Renderização de gráficos interativos.
- **Vite/Python:** Servidor de desenvolvimento.

## 🚀 Como Rodar o Projeto

### Pré-requisitos
- Rust e Cargo instalados.
- Ferramenta `wasm-pack` (`cargo install wasm-pack`).
- Python 3 (para servidor local).

### Passo a Passo

1. **Compilar o Código Rust:**
   Gera os binários .wasm otimizados para web.
   ```bash
   wasm-pack build --target web
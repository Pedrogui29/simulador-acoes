use wasm_bindgen::prelude::*;
use js_sys;

#[wasm_bindgen]
pub struct Stock {
    symbol: String,
    price: f64,
    history: Vec<f64>, // Onde guardo o passado
}

#[wasm_bindgen]
impl Stock {
    pub fn new(symbol: String, start_price: f64) -> Stock {
        let mut history = Vec::new();
        history.push(start_price); // Começa com o preço inicial

        Stock {
            symbol,
            price: start_price,
            history,
        }
    }

    pub fn symbol(&self) -> String {
        self.symbol.clone()
    }

    pub fn price(&self) -> f64 {
        self.price
    }

    // Essa função envia o array completo para o JS desenhar o gráfico
    pub fn history(&self) -> Vec<f64> {
        self.history.clone()
    }

    pub fn update_price(&mut self) {
        // Simulação de volatilidade
        let change = (js_sys::Math::random() - 0.5) * 2.0; 
        self.price += change;
        
        // Adiciona ao histórico
        self.history.push(self.price);

        // OTIMIZAÇÃO DE MEMÓRIA: Mantém apenas os últimos 50 pontos
        // requisito de performance do projeto
        if self.history.len() > 50 {
            self.history.remove(0);
        }
    }
    pub fn calculate_sma(&self, period: usize) -> Vec<f64> {
        if self.history.len() < period {
            // Não há dados suficientes, retorna vetor vazio
            return Vec::new();
        }

        let mut sma_values = Vec::new();
        
        // Iteramos do ponto onde podemos calcular a primeira média
        for i in period..=self.history.len() {
            // Seleciona o subconjunto de dados (ex: últimos 10)
            let window = &self.history[i - period..i];
            
            // Soma todos os valores no subconjunto
            let sum: f64 = window.iter().sum();
            
            // Calcula a média e armazena
            let sma = sum / (period as f64);
            sma_values.push(sma);
        }

        sma_values
    }


    /// Calcula o Índice de Força Relativa (RSI)
    pub fn calculate_rsi(&self, period: usize) -> Vec<f64> {
        if self.history.len() <= period {
            return Vec::new();
        }

        let mut rsi_values = Vec::new();
        
        // Começamos o cálculo a partir do momento que temos dados suficientes
        for i in period..self.history.len() {
            let window = &self.history[i - period..=i]; // Janela atual + anterior
            
            let mut gains = 0.0;
            let mut losses = 0.0;

            // Analisa as variações dentro desta janela
            for j in 1..window.len() {
                let change = window[j] - window[j - 1];
                if change > 0.0 {
                    gains += change;
                } else {
                    losses += change.abs();
                }
            }

            let avg_gain = gains / period as f64;
            let avg_loss = losses / period as f64;

            if avg_loss == 0.0 {
                rsi_values.push(100.0); // Se não caiu nada, força máxima
            } else {
                let rs = avg_gain / avg_loss;
                let rsi = 100.0 - (100.0 / (1.0 + rs));
                rsi_values.push(rsi);
            }
        }

        rsi_values
    }

    /// Calcula a Volatilidade (Desvio Padrão) dos últimos 'period' pontos
    pub fn calculate_volatility(&self, period: usize) -> f64 {
        if self.history.len() < period {
            return 0.0;
        }

        // 1. Pegamos a janela de dados recente
        let start_index = self.history.len() - period;
        let window = &self.history[start_index..];

        // 2. Calculamos a média (simples) desta janela
        let sum: f64 = window.iter().sum();
        let mean = sum / period as f64;

        // 3. Calculamos a Variância: soma de (x - média)²
        let variance_sum: f64 = window.iter()
            .map(|price| {
                let diff = mean - price;
                diff * diff
            })
            .sum();

        let variance = variance_sum / period as f64;

        // 4. Desvio Padrão é a raiz quadrada da variância
        variance.sqrt()
    }
}

use wasm_bindgen::prelude::*;
use js_sys;

#[wasm_bindgen]
pub struct Stock {
    symbol: String,
    price: f64,
    history: Vec<f64>, // Onde guardaremos o passado
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
        // Isso atende ao requisito de performance do projeto
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
}
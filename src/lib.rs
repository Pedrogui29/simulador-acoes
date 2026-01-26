use wasm_bindgen::prelude::*;
use js_sys;
use std::collections::BTreeMap;
use serde::{Serialize, Deserialize};

// 1. Estrutura da Ação (Stock)
#[wasm_bindgen]
pub struct Stock {
    symbol: String,
    price: f64,
    history: Vec<f64>,
}

// 2. Estrutura auxiliar para guardar Qtd e Preço Médio (Holding)
#[derive(Serialize, Deserialize)]
pub struct Holding {
    pub shares: i32,
    pub avg_price: f64, 
}

// 3. Estrutura da Carteira (Wallet)
#[wasm_bindgen]
pub struct Wallet {
    balance: f64,
    // Mapa: "PETR4" -> { shares: 10, avg_price: 30.50 }
    holdings: BTreeMap<String, Holding>, 
}

#[wasm_bindgen]
impl Wallet {
    pub fn new(initial_balance: f64) -> Wallet {
        Wallet {
            balance: initial_balance,
            holdings: BTreeMap::new(),
        }
    }

    pub fn balance(&self) -> f64 {
        self.balance
    }

    // Retorna o JSON para montar a tabela no JS
    pub fn get_holdings_json(&self) -> String {
        serde_json::to_string(&self.holdings).unwrap_or_else(|_| "{}".to_string())
    }

    // Pega a quantidade de ações de um símbolo específico
    pub fn shares_of(&self, symbol: String) -> i32 {
        self.holdings.get(&symbol).map(|h| h.shares).unwrap_or(0)
    }

    // Pega o total de ações (soma de todas)
    pub fn shares(&self) -> i32 {
        self.holdings.values().map(|h| h.shares).sum()
    }

    // Compra Ação (Lógica Nova: Com Símbolo e Preço Médio)
    pub fn buy_stock(&mut self, symbol: String, price: f64) -> bool {
        if self.balance < price { return false; }
        
        self.balance -= price;
        
        let holding = self.holdings.entry(symbol).or_insert(Holding { shares: 0, avg_price: 0.0 });
        
        // Cálculo de Preço Médio Ponderado
        let total_cost = (holding.shares as f64 * holding.avg_price) + price;
        holding.shares += 1;
        holding.avg_price = total_cost / holding.shares as f64;
        
        true
    }

    // Venda Ação (Lógica Nova: Com Símbolo)
    pub fn sell_stock(&mut self, symbol: String, price: f64) -> bool {
        if let Some(holding) = self.holdings.get_mut(&symbol) {
            if holding.shares > 0 {
                self.balance += price;
                holding.shares -= 1;
                if holding.shares == 0 {
                    self.holdings.remove(&symbol);
                }
                return true;
            }
        }
        false
    }
}

// 4. Implementação da Ação (Stock)
#[wasm_bindgen]
impl Stock {
    pub fn new(symbol: String, start_price: f64) -> Stock {
        let mut history = Vec::new();
        history.push(start_price); 

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

    pub fn history(&self) -> Vec<f64> {
        self.history.clone()
    }

    pub fn update_price(&mut self) {
        let change = (js_sys::Math::random() - 0.5) * 2.0; 
        self.price += change;
        self.history.push(self.price);

        if self.history.len() > 50 {
            self.history.remove(0);
        }
    }

    pub fn calculate_sma(&self, period: usize) -> Vec<f64> {
        if self.history.len() < period {
            return Vec::new();
        }
        let mut sma_values = Vec::new();
        for i in period..=self.history.len() {
            let window = &self.history[i - period..i];
            let sum: f64 = window.iter().sum();
            sma_values.push(sum / (period as f64));
        }
        sma_values
    }

    pub fn calculate_rsi(&self, period: usize) -> Vec<f64> {
        if self.history.len() <= period {
            return Vec::new();
        }
        let mut rsi_values = Vec::new();
        for i in period..self.history.len() {
            let window = &self.history[i - period..=i];
            let mut gains = 0.0;
            let mut losses = 0.0;
            for j in 1..window.len() {
                let change = window[j] - window[j - 1];
                if change > 0.0 { gains += change; } else { losses += change.abs(); }
            }
            let avg_gain = gains / period as f64;
            let avg_loss = losses / period as f64;
            if avg_loss == 0.0 {
                rsi_values.push(100.0);
            } else {
                let rs = avg_gain / avg_loss;
                rsi_values.push(100.0 - (100.0 / (1.0 + rs)));
            }
        }
        rsi_values
    }

    pub fn calculate_volatility(&self, period: usize) -> f64 {
        if self.history.len() < period { return 0.0; }
        let start_index = self.history.len() - period;
        let window = &self.history[start_index..];
        let sum: f64 = window.iter().sum();
        let mean = sum / period as f64;
        let variance_sum: f64 = window.iter().map(|price| {
            let diff = mean - price;
            diff * diff
        }).sum();
        (variance_sum / period as f64).sqrt()
    }

    pub fn predict_trend(&self, steps: usize) -> Vec<f64> {
        let n = self.history.len();
        if n < 2 { return Vec::new(); }
        let mut sum_x = 0.0;
        let mut sum_y = 0.0;
        let mut sum_xy = 0.0;
        let mut sum_xx = 0.0;
        for (i, &price) in self.history.iter().enumerate() {
            let x = i as f64;
            sum_x += x;
            sum_y += price;
            sum_xy += x * price;
            sum_xx += x * x;
        }
        let n_f64 = n as f64;
        let slope = (n_f64 * sum_xy - sum_x * sum_y) / (n_f64 * sum_xx - sum_x * sum_x);
        let intercept = (sum_y - slope * sum_x) / n_f64;
        
        let mut predicted_prices = Vec::new();
        for i in 1..=steps {
            let future_x = (n + i - 1) as f64;
            // 👇 AQUI ESTAVA O ERRO! Adicionei o 'let'
            let predicted_y = slope * future_x + intercept; 
            predicted_prices.push(predicted_y);
        }
        predicted_prices
    }
}
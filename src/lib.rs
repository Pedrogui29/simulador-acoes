use wasm_bindgen::prelude::*;
use js_sys;
use std::collections::BTreeMap;
use serde::{Serialize, Deserialize};

// --- SIMULAÇÃO DE TIPOS DO SUBSTRATE ---
// AccountData: estrutura padrão para guardar dados de conta
#[derive(Serialize, Deserialize)]
pub struct AccountData {
    pub shares: i32,
    pub avg_price: f64, 
}

// 1. Estrutura da Ação (Stock) 
#[wasm_bindgen]
pub struct Stock {
    symbol: String,
    price: f64,
    history: Vec<f64>,
}

// 2. O PALLET 
// PalletAssets seguindo o padrão de nomenclatura de módulos do Substrate
#[wasm_bindgen]
pub struct PalletAssets {
    // Balance: saldo
    free_balance: f64,
    // Storage: onde os dados persistem na blockchain
    account_store: BTreeMap<String, AccountData>, 
}

#[wasm_bindgen]
impl PalletAssets {
    // Construtor (Simula o Genesis Config da chain)
    pub fn new(initial_balance: f64) -> PalletAssets {
        PalletAssets {
            free_balance: initial_balance,
            account_store: BTreeMap::new(),
        }
    }

    // --- VIEW FUNCTIONS (Leitura de estado) ---

    pub fn get_balance(&self) -> f64 {
        self.free_balance
    }

    // Retorna o estado do Storage em JSON para o Frontend
    pub fn get_portfolio_json(&self) -> String {
        serde_json::to_string(&self.account_store).unwrap_or_else(|_| "{}".to_string())
    }

    pub fn balance_of(&self, symbol: String) -> i32 {
        self.account_store.get(&symbol).map(|h| h.shares).unwrap_or(0)
    }

    // Helper para o JS calcular patrimônio total (On-chain logic)
    pub fn calculate_total_wealth(&self, symbol: String, current_price: f64) -> f64 {
        let shares = self.balance_of(symbol);
        self.free_balance + (shares as f64 * current_price)
    }

    // --- EXTRINSICS (Chamadas de transação que alteram o estado) ---

    /// Transação: Comprar Ativo
    /// Signed Extrinsic
    pub fn call_buy(&mut self, symbol: String, price: f64) -> bool {
        // 1. Verify (Ensure Balance)
        if self.free_balance < price { 
            return false; 
        }
        
        // 2. Execute (State Transition)
        self.free_balance -= price;
        
        let data = self.account_store.entry(symbol).or_insert(AccountData { shares: 0, avg_price: 0.0 });
        
        // Lógica de Preço Médio
        let total_cost = (data.shares as f64 * data.avg_price) + price;
        data.shares += 1;
        data.avg_price = total_cost / data.shares as f64;
        
        true // Evento de sucesso implícito
    }

    /// Transação: Vender Ativo
    pub fn call_sell(&mut self, symbol: String, price: f64) -> bool {
        if let Some(data) = self.account_store.get_mut(&symbol) {
            if data.shares > 0 {
                self.free_balance += price;
                data.shares -= 1;
                
                // Pruning (Limpeza de storage se conta zerar)
                if data.shares == 0 {
                    self.account_store.remove(&symbol);
                }
                return true;
            }
        }
        false
    }
}

// 3. Implementação da Ação (Stock) 
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
            let predicted_y = slope * future_x + intercept; 
            predicted_prices.push(predicted_y);
        }
        predicted_prices
    }
}
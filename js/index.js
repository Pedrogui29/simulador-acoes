import init, { Stock, Wallet } from "../pkg/rust_webpack_template.js";

const MARKET_DATA = [
    { symbol: "PETR4", name: "Petrobras", startPrice: 30.00 },
    { symbol: "VALE3", name: "Vale", startPrice: 65.50 },
    { symbol: "ITUB4", name: "Itaú Unibanco", startPrice: 28.90 },
    { symbol: "MGLU3", name: "Magalu", startPrice: 4.20 },
    { symbol: "WEGE3", name: "Weg Motors", startPrice: 38.15 },
    { symbol: "BBAS3", name: "Banco do Brasil", startPrice: 55.00 }
];

let globalWallet = null;
let simulationInterval = null;
let currentStock = null;
let charts = { price: null, rsi: null };

async function startApp() {
    await init();
    globalWallet = Wallet.new(10000.00);
    atualizarSaldoGlobal();
    renderHomeScreen();

    // Botão Voltar do Trade -> Home
    document.getElementById('btn-back').onclick = () => {
        stopSimulation();
        switchScreen('home-screen');
        atualizarSaldoGlobal();
    };

    // Botão Abrir Carteira -> Wallet
    document.getElementById('btn-open-wallet').onclick = () => {
        stopSimulation();
        renderWalletTable(); // 👈 Gera a tabela
        switchScreen('wallet-screen');
    };

    // Botão Voltar da Carteira -> Home
    document.getElementById('btn-back-wallet').onclick = () => {
        switchScreen('home-screen');
    };
}

// Função auxiliar para trocar telas
function switchScreen(screenId) {
    ['home-screen', 'trading-screen', 'wallet-screen'].forEach(id => {
        document.getElementById(id).style.display = (id === screenId) ? 'block' : 'none';
    });
}

function renderWalletTable() {
    const tbody = document.getElementById('wallet-table-body');
    const emptyMsg = document.getElementById('wallet-empty-msg');
    tbody.innerHTML = '';

    // Pega o JSON do Rust e converte para Objeto JS
    // O Rust retorna algo como: { "PETR4": { "shares": 10, "avg_price": 30.0 } }
    const holdings = JSON.parse(globalWallet.get_holdings_json());
    const symbols = Object.keys(holdings);

    if (symbols.length === 0) {
        emptyMsg.style.display = 'block';
        return;
    } else {
        emptyMsg.style.display = 'none';
    }

    symbols.forEach(symbol => {
        const item = holdings[symbol];
        const totalInvestido = item.shares * item.avg_price;

        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #333';
        row.innerHTML = `
            <td style="padding: 12px; font-weight: bold; color: #2196F3;">${symbol}</td>
            <td style="padding: 12px;">${item.shares}</td>
            <td style="padding: 12px;">R$ ${item.avg_price.toFixed(2)}</td>
            <td style="padding: 12px; color: #4caf50;">R$ ${totalInvestido.toFixed(2)}</td>
        `;
        tbody.appendChild(row);
    });
}

function renderHomeScreen() {
    const container = document.getElementById('cards-container');
    container.innerHTML = ''; 

    MARKET_DATA.forEach(stockInfo => {
        const card = document.createElement('div');
        card.className = 'stock-card';
        card.innerHTML = `
            <div class="card-symbol">${stockInfo.symbol}</div>
            <div class="card-name">${stockInfo.name}</div>
            <div style="margin-top: 10px; font-weight: bold; color: #4caf50;">R$ ${stockInfo.startPrice.toFixed(2)}</div>
        `;
        card.onclick = () => openStockDetail(stockInfo);
        container.appendChild(card);
    });
}

function openStockDetail(stockInfo) {
    switchScreen('trading-screen');
    document.getElementById('current-ticker').innerText = stockInfo.symbol;
    startSimulation(stockInfo.symbol, stockInfo.startPrice);
}

function startSimulation(symbol, startPrice) {
    currentStock = Stock.new(symbol, startPrice);
    initCharts();
    setupTradingButtons(symbol); // Passamos o simbolo agora

    simulationInterval = setInterval(() => {
        currentStock.update_price();
        updateUI(symbol);
    }, 1000);
}

function stopSimulation() {
    if (simulationInterval) clearInterval(simulationInterval);
}

function setupTradingButtons(symbol) {
    const btnBuy = document.getElementById("btn-buy");
    const btnSell = document.getElementById("btn-sell");

    const newBtnBuy = btnBuy.cloneNode(true);
    const newBtnSell = btnSell.cloneNode(true);
    btnBuy.parentNode.replaceChild(newBtnBuy, btnBuy);
    btnSell.parentNode.replaceChild(newBtnSell, btnSell);

    newBtnBuy.onclick = () => {
        // Agora passamos o Símbolo para a Wallet saber qual ação é
        if (globalWallet.buy_stock(symbol, currentStock.price())) {
            updateUI(symbol); 
        } else {
            alert("Saldo insuficiente!");
        }
    };

    newBtnSell.onclick = () => {
        if (globalWallet.sell_stock(symbol, currentStock.price())) {
            updateUI(symbol);
        } else {
            alert("Sem ações desta empresa para vender!");
        }
    };
}

function initCharts() {
    if (charts.price) charts.price.destroy();
    if (charts.rsi) charts.rsi.destroy();

    const ctxPrice = document.getElementById('stockChart').getContext('2d');
    charts.price = new Chart(ctxPrice, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'Preço', data: [], borderColor: '#2196F3', borderWidth: 2, pointRadius: 0, tension: 0.1, fill: true, backgroundColor: 'rgba(33, 150, 243, 0.1)' },
                { label: 'SMA (10)', data: [], borderColor: '#FF5722', borderWidth: 2, pointRadius: 0, spanGaps: true },
                { label: 'Previsão', data: [], borderColor: '#FFC107', borderDash: [5, 5], borderWidth: 2, pointRadius: 0 }
            ]
        },
        options: { 
            responsive: true, maintainAspectRatio: false, animation: false,
            plugins: { legend: { display: true, labels: { color: '#e0e0e0' } }, tooltip: { enabled: true } },
            scales: { x: { display: false }, y: { position: 'right', ticks: { color: '#e0e0e0' }, grid: { color: '#444' } } } 
        }
    });

    const ctxRSI = document.getElementById('rsiChart').getContext('2d');
    charts.rsi = new Chart(ctxRSI, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'RSI (14)', data: [], borderColor: '#9C27B0', borderWidth: 2, pointRadius: 0 }] },
        options: { 
            responsive: true, maintainAspectRatio: false, animation: false,
            plugins: { legend: { display: false } },
            scales: { x: { display: true, ticks: { color: '#e0e0e0' }, grid: { display: false } }, y: { min: 0, max: 100, position: 'right', ticks: { color: '#e0e0e0' }, grid: { color: '#444' } } } 
        }
    });
}

function updateUI(symbol) {
    const price = currentStock.price();
    const history = Array.from(currentStock.history());
    const sma = Array.from(currentStock.calculate_sma(10));
    const rsi = Array.from(currentStock.calculate_rsi(14));
    
    let volatility = 0.0;
    if (typeof currentStock.calculate_volatility === 'function') volatility = currentStock.calculate_volatility(20);

    let prediction = [];
    if (typeof currentStock.predict_trend === 'function') prediction = Array.from(currentStock.predict_trend(5));

    // Display
    const display = document.getElementById("stock-display");
    display.innerHTML = `
        <span style="font-weight: bold;">${currentStock.symbol()}</span>
        <span style="color: ${price >= 30 ? '#4caf50' : '#f44336'}">R$ ${price.toFixed(2)}</span>
        <span style="color: #ce93d8">RSI: ${rsi.length > 0 ? rsi[rsi.length-1].toFixed(1) : "..."}</span>
        <span style="color: orange">Volat: ${volatility.toFixed(3)}</span>
    `;

    // Atualiza a quantidade específica daquela ação
    document.getElementById("wallet-shares").innerText = globalWallet.shares_of(symbol);
    
    // Total Patrimônio (Saldo + Valor da ação atual * quantidade dela)
    // Nota: O ideal seria somar todas, mas aqui simplificamos
    const totalPatrimony = globalWallet.balance() + (globalWallet.shares_of(symbol) * price);
    
    document.getElementById("wallet-total").innerText = `R$ ${totalPatrimony.toFixed(2)}`;
    atualizarSaldoGlobal();

    const totalPoints = history.length + prediction.length;
    const labels = Array.from({length: totalPoints}, (_, i) => i);
    
    charts.price.data.labels = labels;
    charts.price.data.datasets[0].data = history;
    const smaPadding = new Array(history.length - sma.length).fill(null);
    charts.price.data.datasets[1].data = smaPadding.concat(sma);
    const predPadding = new Array(history.length).fill(null);
    charts.price.data.datasets[2].data = predPadding.concat(prediction);
    charts.price.update();

    charts.rsi.data.labels = labels.slice(0, history.length);
    const rsiPadding = new Array(history.length - rsi.length).fill(null);
    charts.rsi.data.datasets[0].data = rsiPadding.concat(rsi);
    charts.rsi.update();
}

function atualizarSaldoGlobal() {
    const el = document.getElementById("global-balance");
    if(el) el.innerText = `R$ ${globalWallet.balance().toFixed(2)}`;
}

startApp().catch(console.error);
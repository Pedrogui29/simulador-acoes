import init, { Stock } from "../pkg/rust_webpack_template.js";

async function run() {
    await init();

    const symbol = "PETR4";
    const startPrice = 30.00;
    const acao = Stock.new(symbol, startPrice);
    const display = document.getElementById("stock-display");
    
    // --- Configuração dos Gráficos ---
    // 1. Gráfico de Preço (Principal)
    const ctxPrice = document.getElementById('stockChart').getContext('2d');
    const priceChart = new Chart(ctxPrice, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Preço (R$)',
                    data: [],
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                    pointRadius: 0,
                    borderWidth: 2
                },
                {
                    label: 'SMA (10)',
                    data: [],
                    borderColor: 'rgb(255, 99, 132)',
                    borderWidth: 2,
                    pointRadius: 0,
                    spanGaps: true
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: false,
            scales: { x: { display: false } },
            plugins: { title: { display: true, text: 'Evolução do Preço' } }
        }
    });

    // 2. Gráfico de RSI (Secundário)
    const ctxRSI = document.getElementById('rsiChart').getContext('2d');
    const rsiChart = new Chart(ctxRSI, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'RSI (14)',
                data: [],
                borderColor: 'purple',
                borderWidth: 2,
                pointRadius: 0,
                spanGaps: true
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: false,
            scales: {
                x: { display: false },
                y: { min: 0, max: 100 } // RSI é sempre 0-100
            },
            plugins: { title: { display: true, text: 'Índice de Força Relativa (RSI)' } }
        }
    });

    // --- Loop de Atualização ---
    setInterval(() => {
        acao.update_price();
        const preco = acao.price();
        
        // --- BLOCO DE DEPURAÇÃO DA VOLATILIDADE ---
        let volatility = 0.0;
        
        // 1. Verificamos se a função existe no objeto Rust
        if (typeof acao.calculate_volatility === 'function') {
            // 2. Tentamos calcular
            volatility = acao.calculate_volatility(20);
            console.log("Status Volatilidade:", volatility);
        } else {
            console.error("ERRO CRÍTICO: O Wasm não tem a função 'calculate_volatility'. Recompilação necessária!");
        }
        // ------------------------------------------

        // Convertendo dados do Rust
        const history = Array.from(acao.history());
        const sma = Array.from(acao.calculate_sma(10));
        const rsi = Array.from(acao.calculate_rsi(14));

        // Atualiza Texto (Painel Completo)
        if(display) {
            display.innerHTML = `
                <span style="margin-right: 15px; font-weight: bold;">Ação: ${symbol}</span>
                <span style="margin-right: 15px; color: ${preco >= startPrice ? 'green' : 'red'}">
                    Preço: R$ ${preco.toFixed(2)}
                </span>
                <span style="margin-right: 15px; color: purple">
                    RSI: ${rsi.length > 0 ? rsi[rsi.length-1].toFixed(1) : "..."}
                </span>
                <span style="color: orange; font-weight: bold;">
                    Volatilidade: ${volatility.toFixed(3)}
                </span>
            `;
        }

        const labels = Array.from({length: history.length}, (_, i) => i);

        // Atualiza Gráfico de Preço
        priceChart.data.labels = labels;
        priceChart.data.datasets[0].data = history;
        
        const smaPadding = new Array(history.length - sma.length).fill(null);
        priceChart.data.datasets[1].data = smaPadding.concat(sma);
        priceChart.update();

        // Atualiza Gráfico de RSI
        rsiChart.data.labels = labels;
        const rsiPadding = new Array(history.length - rsi.length).fill(null);
        rsiChart.data.datasets[0].data = rsiPadding.concat(rsi);
        
        // Adiciona linhas de referência (30 e 70) visualmente se quiser, mas o básico está aqui
        rsiChart.update();

    }, 1000);
}

run().catch(console.error);
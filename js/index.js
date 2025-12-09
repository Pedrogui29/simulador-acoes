import init, { Stock, Wallet } from "../pkg/rust_webpack_template.js";

async function run() {
    await init();

    const symbol = "PETR4";
    const startPrice = 30.00;
    
    // 1. Instanciamos a Ação e a Carteira
    const acao = Stock.new(symbol, startPrice);
    const carteira = Wallet.new(10000.00); // Começamos com 10 mil

    // Referências HTML
    const display = document.getElementById("stock-display");
    const elBalance = document.getElementById("wallet-balance");
    const elShares = document.getElementById("wallet-shares");
    const elTotal = document.getElementById("wallet-total");
    
    // --- Configuração dos Botões ---
    document.getElementById("btn-buy").onclick = () => {
        const precoAtual = acao.price();
        if (carteira.buy_stock(precoAtual)) {
            console.log(`Comprou 1 ação a R$ ${precoAtual.toFixed(2)}`);
            atualizarPainelCarteira(); // Atualiza visualmente na hora
        } else {
            alert("Saldo insuficiente!");
        }
    };

    document.getElementById("btn-sell").onclick = () => {
        const precoAtual = acao.price();
        if (carteira.sell_stock(precoAtual)) {
            console.log(`Vendeu 1 ação a R$ ${precoAtual.toFixed(2)}`);
            atualizarPainelCarteira();
        } else {
            alert("Você não tem ações para vender!");
        }
    };

    // Função auxiliar para atualizar o HTML da carteira
    function atualizarPainelCarteira() {
        const precoAtual = acao.price();
        elBalance.innerText = `R$ ${carteira.balance().toFixed(2)}`;
        elShares.innerText = carteira.shares();
        
        const patrimonio = carteira.total_value(precoAtual);
        elTotal.innerText = `R$ ${patrimonio.toFixed(2)}`;
        
        // Cor do patrimônio: Verde se lucrou (>10k), Vermelho se prejuízo (<10k)
        elTotal.style.color = patrimonio >= 10000 ? "blue" : "red";
    }

    // --- Configuração dos Gráficos (Chart.js) ---
    // (Mantenha seus gráficos de Preço e RSI exatamente como já estavam configurados)
    const ctxPrice = document.getElementById('stockChart').getContext('2d');
    const priceChart = new Chart(ctxPrice, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'Preço', data: [], borderColor: 'rgb(75, 192, 192)', borderWidth: 2, pointRadius: 0, tension: 0.1 },
                { label: 'SMA (10)', data: [], borderColor: 'rgb(255, 99, 132)', borderWidth: 2, pointRadius: 0, spanGaps: true }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, animation: false, scales: { x: { display: false } } }
    });

    const ctxRSI = document.getElementById('rsiChart').getContext('2d');
    const rsiChart = new Chart(ctxRSI, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'RSI (14)', data: [], borderColor: 'purple', borderWidth: 2, pointRadius: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, animation: false, scales: { x: { display: false }, y: { min: 0, max: 100 } } }
    });

    // --- Loop Principal ---
    setInterval(() => {
        // 1. Atualiza Ação (Rust)
        acao.update_price();
        const preco = acao.price();
        
        // 2. Atualiza Indicadores (Rust)
        // Verificação de segurança caso o Wasm não tenha atualizado
        let volatility = 0.0;
        if (typeof acao.calculate_volatility === 'function') {
            volatility = acao.calculate_volatility(20);
        }
        
        const history = Array.from(acao.history());
        const sma = Array.from(acao.calculate_sma(10));
        const rsi = Array.from(acao.calculate_rsi(14));

        // 3. Atualiza Display Principal
        if(display) {
            display.innerHTML = `
                <span style="margin-right: 15px; font-weight: bold;">Ação: ${symbol}</span>
                <span style="margin-right: 15px; color: ${preco >= 30.00 ? 'green' : 'red'}">Preço: R$ ${preco.toFixed(2)}</span>
                <span style="margin-right: 15px; color: purple">RSI: ${rsi.length > 0 ? rsi[rsi.length-1].toFixed(1) : "..."}</span>
                <span style="color: orange; font-weight: bold;">Volatilidade: ${volatility.toFixed(3)}</span>
            `;
        }

        // 4. Atualiza a Carteira (pois o Patrimônio muda com o preço da ação)
        atualizarPainelCarteira();

        // 5. Atualiza Gráficos
        const labels = Array.from({length: history.length}, (_, i) => i);
        
        priceChart.data.labels = labels;
        priceChart.data.datasets[0].data = history;
        const smaPadding = new Array(history.length - sma.length).fill(null);
        priceChart.data.datasets[1].data = smaPadding.concat(sma);
        priceChart.update();

        rsiChart.data.labels = labels;
        const rsiPadding = new Array(history.length - rsi.length).fill(null);
        rsiChart.data.datasets[0].data = rsiPadding.concat(rsi);
        rsiChart.update();

    }, 1000);
}

run().catch(console.error);
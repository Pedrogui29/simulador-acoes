import init, { Stock } from "../pkg/rust_webpack_template.js";

async function run() {
    await init();

    const symbol = "PETR4";
    const startPrice = 30.00;
    const acao = Stock.new(symbol, startPrice);
    const display = document.getElementById("stock-display");
    
    // --- 1. Configuração do Gráfico ---
    const ctx = document.getElementById('stockChart').getContext('2d');
    
    const stockChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [], // Começa vazio
            datasets: [
                {
                    label: `${symbol} (Preço)`,
                    data: [],
                    borderColor: 'rgb(75, 192, 192)', // Verde
                    tension: 0.1,
                    pointRadius: 0, // Sem bolinhas no preço
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false, // Desliga animação para atualizar rápido
            scales: {
                x: { display: false } // Esconde eixo X
            }
        }
    });

    // --- 2. Loop de Atualização ---
    setInterval(() => {
        // 1. Processamento Rust
        acao.update_price();
        const preco = acao.price();
        
        // CONVERTER DADOS RUST PARA JS PURO (Evita bugs de TypedArray)
        // O Array.from garante que temos uma lista simples que o Chart.js entende bem
        const novoHistorico = Array.from(acao.history()); 
        const smaValues = Array.from(acao.calculate_sma(10));

        // 2. Atualizar Display de Texto
        const mensagem = `Ação: ${symbol} | Preço: R$ ${preco.toFixed(2)}`;
        if (display) {
            display.innerText = mensagem;
            display.style.color = preco >= startPrice ? "green" : "red";
        }

        // 3. Atualizar Gráfico
        const novosLabels = Array.from({length: novoHistorico.length}, (_, i) => i);
        stockChart.data.labels = novosLabels;
        
        // Dataset 0: Preço
        stockChart.data.datasets[0].data = novoHistorico;

        // Dataset 1: SMA (Criar se não existir ou atualizar)
        if (stockChart.data.datasets.length < 2) {
            stockChart.data.datasets.push({
                label: `SMA (10 períodos)`,
                data: [],
                borderColor: 'rgb(255, 99, 132)', // Vermelho
                borderWidth: 2,
                pointRadius: 0, // Linha limpa
                spanGaps: true  // <--- IMPORTANTE: Conecta a linha mesmo com falhas
            });
        }

        // Lógica de Alinhamento (Padding)
        // Se temos 50 preços e 40 médias, precisamos de 10 nulls no começo da média
        const diferenca = novoHistorico.length - smaValues.length;
        const nullPadding = new Array(diferenca).fill(null);
        
        // Junta os nulls com os valores da média
        stockChart.data.datasets[1].data = nullPadding.concat(smaValues);
        
        // Renderiza
        stockChart.update();

        // Log para garantir que está vivo
        if (smaValues.length > 0) {
            console.log(`SMA: ${smaValues.length} pontos | Último: ${smaValues[smaValues.length-1].toFixed(2)}`);
        }

    }, 1000);
}

run().catch(console.error);
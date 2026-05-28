// 1. Configuração e Inicialização do Back4app com as chaves extraídas do seu print
Parse.initialize("8NsxyCIEgCa0pjslAhRr8GLikfh8VpEnaKfOY209", "Lbpfu3yxxHTrqTxPc82nlOXGrP4ZfxhXq92QERqc");
Parse.serverURL = "https://parseapi.back4app.com/";

// Instanciando a Classe 'Transacao'
const Transacao = Parse.Object.extend("Transacao");

// Capturando os elementos necessários da árvore DOM
const form = document.getElementById('transaction-form');
const tableBody = document.getElementById('transaction-table-body');
const formTitle = document.getElementById('form-title');
const cancelBtn = document.getElementById('cancel-btn');

// Instâncias globais para manipulação dinâmica dos gráficos
let barChart, doughnutChart;

// --- CONSUMO DE API PÚBLICA EXTERNA (AwesomeAPI) ---
async function fetchQuotes() {
    try {
        const response = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL');
        const data = await response.json();
        
        // Renderiza os valores da API externa nos cards informativos superiores
        document.getElementById('usd-price').innerText = `R$ ${parseFloat(data.USDBRL.bid).toFixed(2)}`;
        document.getElementById('eur-price').innerText = `R$ ${parseFloat(data.EURBRL.bid).toFixed(2)}`;
        document.getElementById('btc-price').innerText = `R$ ${parseFloat(data.BTCBRL.bid).toFixed(0)}`;
    } catch (error) {
        console.error("Erro ao carregar cotações externas:", error);
    }
}

// --- CONFIGURAÇÃO E INICIALIZAÇÃO DO CHART.JS ---
function initCharts() {
    const ctxBar = document.getElementById('barChart').getContext('2d');
    barChart = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: ['Entradas', 'Saídas'],
            datasets: [{
                data: [0, 0],
                backgroundColor: ['#10b981', '#ef4444'],
                borderWidth: 0,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { 
                y: { grid: { color: '#374151' }, ticks: { color: '#9ca3af' } }, 
                x: { ticks: { color: '#9ca3af' } } 
            }
        }
    });

    const ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');
    doughnutChart = new Chart(ctxDoughnut, {
        type: 'doughnut',
        data: {
            labels: ['Alimentação', 'Lazer', 'Transporte', 'Outros'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: ['#f59e0b', '#3b82f6', '#ec4899', '#6b7280'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#9ca3af', boxWidth: 12 } } }
        }
    });
}

// --- ATUALIZAÇÃO DOS GRÁFICOS COM DADOS DO BACK4APP ---
function updateDashboardMetrics(items) {
    let totalEntradas = 0;
    let totalSaidas = 0;
    let categoriasDespesas = { 'Alimentação': 0, 'Lazer': 0, 'Transporte': 0, 'Outros': 0 };

    items.forEach(item => {
        const valor = item.get('valor');
        const tipo = item.get('tipo');
        const cat = item.get('categoria');

        if (tipo === 'Entrada') {
            totalEntradas += valor;
        } else {
            totalSaidas += valor;
            if (categoriasDespesas.hasOwnProperty(cat)) {
                categoriasDespesas[cat] += valor;
            } else {
                categoriasDespesas['Outros'] += valor;
            }
        }
    });

    // Atualiza o elemento de Saldo Geral
    const saldoGeral = totalEntradas - totalSaidas;
    const balanceEl = document.getElementById('balance-total');
    balanceEl.innerText = `R$ ${saldoGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    balanceEl.className = saldoGeral >= 0 ? "font-bold text-emerald-400" : "font-bold text-red-400";

    // Injeta novos dados estruturados nos gráficos e redesenha na tela
    barChart.data.datasets[0].data = [totalEntradas, totalSaidas];
    barChart.update();

    doughnutChart.data.datasets[0].data = Object.values(categoriasDespesas);
    doughnutChart.update();
}

// --- LÓGICA E OPERAÇÕES DO CRUD ---

// 1. READ (Buscar do Back4app e listar na tabela)
async function loadTransactions() {
    tableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-500">Buscando registros no Back4app...</td></tr>`;
    const query = new Parse.Query(Transacao);
    query.descending("createdAt");

    try {
        const results = await query.find();
        tableBody.innerHTML = "";

        if (results.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-500">Nenhum dado encontrado. Crie o primeiro acima!</td></tr>`;
        }

        results.forEach(item => {
            const id = item.id;
            const desc = item.get('descricao');
            const val = item.get('valor');
            const tipo = item.get('tipo');
            const cat = item.get('categoria');

            const tr = document.createElement('tr');
            tr.className = "hover:bg-gray-700/30 transition";
            tr.innerHTML = `
                <td class="p-4 font-medium">${desc}</td>
                <td class="p-4 text-gray-400">${cat}</td>
                <td class="p-4">
                    <span class="px-2 py-0.5 rounded text-xs font-semibold ${tipo === 'Entrada' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}">
                        ${tipo}
                    </span>
                </td>
                <td class="p-4 font-semibold ${tipo === 'Entrada' ? 'text-emerald-400' : 'text-gray-200'}">
                    R$ ${val.toFixed(2)}
                </td>
                <td class="p-4 text-center space-x-3">
                    <button onclick="editTransaction('${id}', '${desc}', ${val}, '${tipo}', '${cat}')" class="text-blue-400 hover:text-blue-300 transition text-xs font-semibold">Editar</button>
                    <button onclick="deleteTransaction('${id}')" class="text-red-400 hover:text-red-300 transition text-xs font-semibold">Excluir</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        updateDashboardMetrics(results);

    } catch (error) {
        console.error("Erro na busca do Back4app:", error);
        tableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-400">Erro na comunicação com Back4app.</td></tr>`;
    }
}

// 2. CREATE / UPDATE (Salvar ou alterar dados)
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('transaction-id').value;
    const desc = document.getElementById('desc').value;
    const val = parseFloat(document.getElementById('val').value);
    const tipo = document.getElementById('type').value;
    const cat = document.getElementById('category').value;

    let transacaoObj = new Transacao();
    if (id) transacaoObj.set("id", id); // Se houver ID na fila, o Parse entende como Update

    transacaoObj.set("descricao", desc);
    transacaoObj.set("valor", val);
    transacaoObj.set("tipo", tipo);
    transacaoObj.set("categoria", cat);

    try {
        await transacaoObj.save();
        form.reset();
        resetFormState();
        loadTransactions();
    } catch (error) {
        alert("Erro ao salvar dados: " + error.message);
    }
});

// Preparação dos dados para Edição (Pre-Update)
window.editTransaction = function(id, desc, val, tipo, cat) {
    document.getElementById('transaction-id').value = id;
    document.getElementById('desc').value = desc;
    document.getElementById('val').value = val;
    document.getElementById('type').value = tipo;
    document.getElementById('category').value = cat;

    formTitle.innerText = "Editar Movimentação";
    cancelBtn.classList.remove('hidden');
}

cancelBtn.addEventListener('click', () => {
    form.reset();
    resetFormState();
});

function resetFormState() {
    document.getElementById('transaction-id').value = "";
    formTitle.innerText = "Nova Movimentação";
    cancelBtn.classList.add('hidden');
}

// 3. DELETE (Remover permanentemente)
window.deleteTransaction = async function(id) {
    if (confirm("Excluir definitivamente este registro?")) {
        const query = new Parse.Query(Transacao);
        try {
            const obj = await query.get(id);
            await obj.destroy();
            loadTransactions();
        } catch (error) {
            alert("Erro ao excluir do Back4app: " + error.message);
        }
    }
}

// --- BOOTSTRAP DE INICIALIZAÇÃO ---
window.onload = function() {
    fetchQuotes();
    initCharts();
    loadTransactions();
    
    // Atualiza a API externa automaticamente em background de 30 em 30 segundos
    setInterval(fetchQuotes, 30000);
};
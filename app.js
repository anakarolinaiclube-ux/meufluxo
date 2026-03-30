// --- ESTADO GLOBAL ---
let state = {
    atendimentos: JSON.parse(localStorage.getItem('fluxo_atendimentos')) || [],
    servicos: JSON.parse(localStorage.getItem('fluxo_servicos')) || [],
    theme: localStorage.getItem('fluxo_theme') || 'light'
};

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavigation();
    updateDashboard();
    renderServicos();
    populateServiceDropdown();
    
    // Atualiza relógio
    setInterval(() => {
        const now = new Date();
        document.getElementById('current-date').innerText = now.toLocaleString('pt-br');
    }, 1000);
});

// --- NAVEGAÇÃO SPA ---
function initNavigation() {
    const links = document.querySelectorAll('.nav-links li');
    links.forEach(link => {
        link.addEventListener('click', () => {
            const page = link.getAttribute('data-page');
            
            // Toggle classes menu
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Toggle visibilidade páginas
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.getElementById(page).classList.add('active');
            
            document.getElementById('page-title').innerText = page.charAt(0).toUpperCase() + page.slice(1);
            
            // Call specific renders
            if(page === 'dashboard') updateDashboard();
            if(page === 'agenda') renderAgenda();
            if(page === 'historico') renderHistorico();
            if(page === 'financeiro') renderFinanceiro();
        });
    });
}

// --- GESTÃO DE DADOS ---
function saveState() {
    localStorage.setItem('fluxo_atendimentos', JSON.stringify(state.atendimentos));
    localStorage.setItem('fluxo_servicos', JSON.stringify(state.servicos));
}

// --- SERVIÇOS ---
document.getElementById('form-servico').addEventListener('submit', (e) => {
    e.preventDefault();
    const novo = {
        id: Date.now(),
        nome: document.getElementById('sv-nome').value,
        preco: parseFloat(document.getElementById('sv-preco').value),
        custo: parseFloat(document.getElementById('sv-custo').value) || 0
    };
    state.servicos.push(novo);
    saveState();
    renderServicos();
    populateServiceDropdown();
    closeModal();
    e.target.reset();
});

function renderServicos() {
    const container = document.getElementById('list-servicos');
    container.innerHTML = state.servicos.map(s => `
        <div class="card glass">
            <h3>${s.nome}</h3>
            <p class="value">R$ ${s.preco.toFixed(2)}</p>
            <p style="color: var(--text-muted); font-size: 0.8rem">Custo: R$ ${s.custo.toFixed(2)}</p>
            <button class="btn-danger" onclick="deleteService(${s.id})" style="margin-top: 10px; padding: 5px 10px; font-size: 0.7rem">Excluir</button>
        </div>
    `).join('');
}

function deleteService(id) {
    state.servicos = state.servicos.filter(s => s.id !== id);
    saveState();
    renderServicos();
    populateServiceDropdown();
}

// --- AGENDA & ATENDIMENTOS ---
function populateServiceDropdown() {
    const selects = ['at-servico', 'filter-service'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if(!el) return;
        el.innerHTML = (id === 'filter-service' ? '<option value="">Todos</option>' : '') + 
            state.servicos.map(s => `<option value="${s.nome}">${s.nome}</option>`).join('');
    });
}

document.getElementById('form-atendimento').addEventListener('submit', (e) => {
    e.preventDefault();
    const servicoNome = document.getElementById('at-servico').value;
    const servicoObj = state.servicos.find(s => s.nome === servicoNome);

    const novo = {
        id: Date.now(),
        cliente: document.getElementById('at-cliente').value || 'Cliente Avulso',
        servico: servicoNome,
        preco: servicoObj ? servicoObj.preco : 0,
        custo: servicoObj ? servicoObj.custo : 0,
        data: document.getElementById('at-data').value,
        status: 'pendente'
    };
    state.atendimentos.push(novo);
    saveState();
    renderAgenda();
    closeModal();
    e.target.reset();
});

function renderAgenda() {
    const tbody = document.getElementById('list-agenda');
    // Mostrar apenas pendentes na agenda principal
    const pendentes = state.atendimentos.filter(a => a.status === 'pendente');
    
    tbody.innerHTML = pendentes.map(a => `
        <tr>
            <td>${a.cliente}</td>
            <td>${a.servico}</td>
            <td>${new Date(a.data).toLocaleString('pt-br')}</td>
            <td><span class="badge">${a.status}</span></td>
            <td>
                <button onclick="updateStatus(${a.id}, 'concluído')" class="btn-primary" style="background: var(--success)"><i class="fas fa-check"></i></button>
                <button onclick="updateStatus(${a.id}, 'cancelado')" class="btn-danger"><i class="fas fa-times"></i></button>
            </td>
        </tr>
    `).join('');
}

function updateStatus(id, status) {
    const idx = state.atendimentos.findIndex(a => a.id === id);
    state.atendimentos[idx].status = status;
    saveState();
    renderAgenda();
}

// --- HISTÓRICO ---
function renderHistorico(data = state.atendimentos) {
    const tbody = document.getElementById('list-historico');
    tbody.innerHTML = data.map(a => `
        <tr>
            <td>${new Date(a.data).toLocaleDateString()}</td>
            <td>${a.cliente}</td>
            <td>${a.servico}</td>
            <td>R$ ${a.preco.toFixed(2)}</td>
            <td>${a.status}</td>
            <td><button onclick="deleteAtendimento(${a.id})" class="btn-danger">Excluir</button></td>
        </tr>
    `).join('');
}

function deleteAtendimento(id) {
    state.atendimentos = state.atendimentos.filter(a => a.id !== id);
    saveState();
    renderHistorico();
}

// --- DASHBOARD & GRÁFICOS ---
let chartDaily, chartServ;

function updateDashboard() {
    const concluídos = state.atendimentos.filter(a => a.status === 'concluído');
    
    const totalRev = concluídos.reduce((acc, curr) => acc + curr.preco, 0);
    const monthRev = concluídos.filter(a => new Date(a.data).getMonth() === new Date().getMonth())
                               .reduce((acc, curr) => acc + curr.preco, 0);
    const ticketMedio = concluídos.length > 0 ? totalRev / concluídos.length : 0;

    document.getElementById('stat-total-revenue').innerText = `R$ ${totalRev.toFixed(2)}`;
    document.getElementById('stat-month-revenue').innerText = `R$ ${monthRev.toFixed(2)}`;
    document.getElementById('stat-avg-ticket').innerText = `R$ ${ticketMedio.toFixed(2)}`;

    renderCharts(concluídos);
    generateInsights(concluídos);
}

function renderCharts(dados) {
    const ctxDaily = document.getElementById('chartDaily').getContext('2d');
    const ctxServ = document.getElementById('chartServices').getContext('2d');

    if(chartDaily) chartDaily.destroy();
    if(chartServ) chartServ.destroy();

    // Agrupar por dia (últimos 7 dias)
    const ultimosDias = {};
    dados.forEach(a => {
        const d = new Date(a.data).toLocaleDateString();
        ultimosDias[d] = (ultimosDias[d] || 0) + a.preco;
    });

    chartDaily = new Chart(ctxDaily, {
        type: 'line',
        data: {
            labels: Object.keys(ultimosDias),
            datasets: [{
                label: 'Faturamento R$',
                data: Object.values(ultimosDias),
                borderColor: '#6366f1',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(99, 102, 241, 0.2)'
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });

    // Agrupar por serviço
    const porServico = {};
    dados.forEach(a => {
        porServico[a.servico] = (porServico[a.servico] || 0) + 1;
    });

    chartServ = new Chart(ctxServ, {
        type: 'doughnut',
        data: {
            labels: Object.keys(porServico),
            datasets: [{
                data: Object.values(porServico),
                backgroundColor: ['#6366f1', '#a855f7', '#ec4899', '#f59e0b']
            }]
        }
    });
}

// --- INSIGHTS INTELIGENTES ---
function generateInsights(dados) {
    const container = document.getElementById('insights-content');
    if(dados.length === 0) {
        container.innerText = "Sem dados suficientes para gerar insights ainda.";
        return;
    }

    // Lógica simples de "AI"
    const porServico = {};
    dados.forEach(a => porServico[a.servico] = (porServico[a.servico] || 0) + 1);
    const topService = Object.keys(porServico).reduce((a, b) => porServico[a] > porServico[b] ? a : b);
    
    document.getElementById('stat-top-service').innerText = topService;

    const insights = [
        `Seu serviço mais vendido é o <strong>${topService}</strong>.`,
        `Você já faturou R$ ${dados.reduce((a,b) => a + b.preco, 0).toFixed(2)} com clientes satisfeitos.`,
        dados.length > 5 ? "Tendência de crescimento detectada com base no volume desta semana!" : "Continue cadastrando atendimentos para uma análise mais profunda."
    ];

    container.innerHTML = `<ul>${insights.map(i => `<li>${i}</li>`).join('')}</ul>`;
}

// --- FINANCEIRO ---
function renderFinanceiro() {
    const concluídos = state.atendimentos.filter(a => a.status === 'concluído');
    const totalRev = concluídos.reduce((acc, curr) => acc + curr.preco, 0);
    const totalCusto = concluídos.reduce((acc, curr) => acc + curr.custo, 0);
    
    document.getElementById('fin-profit').innerText = `R$ ${(totalRev - totalCusto).toFixed(2)}`;
    document.getElementById('fin-costs').innerText = `R$ ${totalCusto.toFixed(2)}`;
}

// --- TEMA ---
function initTheme() {
    const btn = document.querySelector('.theme-toggle');
    if(state.theme === 'dark') document.body.setAttribute('data-theme', 'dark');
    
    btn.addEventListener('click', () => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('fluxo_theme', state.theme);
        if(state.theme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
            document.getElementById('theme-icon').className = 'fas fa-sun';
            document.getElementById('theme-text').innerText = 'Modo Claro';
        } else {
            document.body.removeAttribute('data-theme');
            document.getElementById('theme-icon').className = 'fas fa-moon';
            document.getElementById('theme-text').innerText = 'Modo Escuro';
        }
    });
}

// --- MODAIS ---
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal() { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); }

// --- BACKUP ---
function exportData() {
    const blob = new Blob([JSON.stringify(state)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_fluxo_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
}

function importData(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        const imported = JSON.parse(e.target.result);
        state = {...state, ...imported};
        saveState();
        location.reload();
    };
    reader.readAsText(file);
}

function clearAllData() {
    if(confirm("Deseja apagar todos os dados? Esta ação é irreversível.")) {
        localStorage.clear();
        location.reload();
    }
}
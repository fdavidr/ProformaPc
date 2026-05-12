// ==================== MÓDULO DE ESTADÍSTICAS ====================

let estadisticasCity = null;
let estadisticasYear = new Date().getFullYear();
let estadisticasMonth = null;
const chartInstances = {};

function openEstadisticas() {
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('inventorySection').style.display = 'none';
    document.getElementById('salesSection').style.display = 'none';
    document.getElementById('estadisticasSection').style.display = 'block';
    setActiveMenuButton('estadisticasBtn');

    // Si es vendedor, fijar ciudad a la suya y ocultar selector
    const cityRow = document.getElementById('estadisticasCityRow');
    if (appData.userRole === 'vendedor' && appData.loggedSeller) {
        estadisticasCity = appData.loggedSeller.city;
        if (cityRow) cityRow.style.display = 'none';
    } else {
        estadisticasCity = null;
        if (cityRow) cityRow.style.display = '';
    }

    renderEstadisticasCityButtons();
    renderEstadisticasYearFilter();
    renderEstadisticasMonthFilter();
    renderEstadisticas();
}

function renderEstadisticasCityButtons() {
    const container = document.getElementById('estadisticasCityButtons');
    if (!container) return;
    container.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.className = 'city-selector' + (estadisticasCity === null ? ' active' : '');
    allBtn.textContent = '🌐 Todas';
    allBtn.onclick = () => { estadisticasCity = null; renderEstadisticasCityButtons(); renderEstadisticas(); };
    container.appendChild(allBtn);

    (appData.inventories || []).forEach(inv => {
        const btn = document.createElement('button');
        btn.className = 'city-selector' + (estadisticasCity === inv.id ? ' active' : '');
        btn.textContent = inv.name;
        btn.dataset.city = inv.id;
        btn.onclick = () => { estadisticasCity = inv.id; renderEstadisticasCityButtons(); renderEstadisticas(); };
        container.appendChild(btn);
    });
}

function renderEstadisticasYearFilter() {
    const select = document.getElementById('estadisticasYearFilter');
    if (!select) return;

    const years = new Set();
    years.add(new Date().getFullYear());
    (appData.pdfHistory || []).forEach(e => {
        if (e.type === 'notaventa') {
            const parts = e.date.split(',')[0].trim().split('/');
            if (parts.length === 3) years.add(parseInt(parts[2]));
        }
    });

    const currentVal = select.value;
    select.innerHTML = '<option value="">Todos los años</option>';
    Array.from(years).sort((a, b) => b - a).forEach(y => {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (String(y) === String(estadisticasYear) || (!estadisticasYear && currentVal === String(y))) opt.selected = true;
        select.appendChild(opt);
    });

    if (estadisticasYear && !currentVal) {
        select.value = estadisticasYear;
    }
}

function renderEstadisticasMonthFilter() {
    const select = document.getElementById('estadisticasMonthFilter');
    if (!select) return;
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    select.innerHTML = '<option value="">Todos los meses</option>';
    monthNames.forEach((name, i) => {
        const opt = document.createElement('option');
        opt.value = i + 1;
        opt.textContent = name;
        if (estadisticasMonth === i + 1) opt.selected = true;
        select.appendChild(opt);
    });
    // Disable month filter if no year selected
    select.disabled = !estadisticasYear;
    select.style.opacity = estadisticasYear ? '1' : '0.45';
    select.title = estadisticasYear ? '' : 'Selecciona un año primero';
}

function getFilteredSalesForStats() {
    return (appData.pdfHistory || []).filter(e => {
        if (e.type !== 'notaventa' || e.cancelled) return false;
        // Si es vendedor, mostrar solo sus propias ventas
        if (appData.userRole === 'vendedor' && appData.loggedSeller) {
            if (!(e.seller && e.seller.name === appData.loggedSeller.name)) return false;
        }
        if (estadisticasCity && e.city !== estadisticasCity) return false;
        const parts = e.date.split(',')[0].trim().split('/');
        if (parts.length === 3) {
            if (estadisticasYear && parseInt(parts[2]) !== estadisticasYear) return false;
            if (estadisticasMonth && parseInt(parts[1]) !== estadisticasMonth) return false;
        }
        return true;
    });
}

function destroyChart(id) {
    if (chartInstances[id]) {
        chartInstances[id].destroy();
        delete chartInstances[id];
    }
}

function renderEstadisticas() {
    const sales = getFilteredSalesForStats();
    renderKPICards(sales);
    renderTopProducts(sales);
    renderTopClientsByFrequency(sales);
    renderTopClientsByVolume(sales);
    renderPaymentMethods(sales);
    renderMonthlySales(sales);
}

function renderKPICards(sales) {
    const el = document.getElementById('estadisticasKPIs');
    if (!el) return;
    const totalVentas = sales.length;
    const totalIngresos = sales.reduce((s, e) => s + (e.total || 0), 0);
    const totalUnidades = sales.reduce((s, e) => s + (e.items ? e.items.reduce((q, i) => q + (i.quantity || 0), 0) : 0), 0);
    const avgTicket = totalVentas > 0 ? totalIngresos / totalVentas : 0;

    el.innerHTML = `
        <div class="kpi-card kpi-blue">
            <div class="kpi-icon">🧾</div>
            <div class="kpi-value">${totalVentas}</div>
            <div class="kpi-label">Ventas realizadas</div>
        </div>
        <div class="kpi-card kpi-green">
            <div class="kpi-icon">💰</div>
            <div class="kpi-value">Bs ${totalIngresos.toFixed(2)}</div>
            <div class="kpi-label">Ingresos totales</div>
        </div>
        <div class="kpi-card kpi-orange">
            <div class="kpi-icon">📦</div>
            <div class="kpi-value">${totalUnidades}</div>
            <div class="kpi-label">Unidades vendidas</div>
        </div>
        <div class="kpi-card kpi-purple">
            <div class="kpi-icon">📊</div>
            <div class="kpi-value">Bs ${avgTicket.toFixed(2)}</div>
            <div class="kpi-label">Ticket promedio</div>
        </div>
    `;
}

function renderTopProducts(sales) {
    const counts = {};
    sales.forEach(sale => {
        (sale.items || []).forEach(item => {
            const product = appData.products.find(p => p.id === item.id);
            const name = product ? product.name : (item.name || `Prod. #${item.id}`);
            counts[name] = (counts[name] || 0) + (item.quantity || 0);
        });
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    renderHorizontalBar('topProducts', 'chartTopProducts', sorted,
        v => `${v} uds`,
        ['#3498db', '#2980b9', '#1abc9c', '#16a085', '#2ecc71'],
        'Unidades vendidas'
    );
}

function renderTopClientsByFrequency(sales) {
    const counts = {};
    sales.forEach(sale => {
        const name = (sale.client && sale.client.name) ? sale.client.name : String(sale.client || '—');
        counts[name] = (counts[name] || 0) + 1;
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    renderHorizontalBar('topClientsFreq', 'chartTopClientsFreq', sorted,
        v => `${v} compras`,
        ['#27ae60', '#2ecc71', '#f1c40f', '#f39c12', '#e67e22'],
        'Número de compras'
    );
}

function renderTopClientsByVolume(sales) {
    const totals = {};
    sales.forEach(sale => {
        const name = (sale.client && sale.client.name) ? sale.client.name : String(sale.client || '—');
        totals[name] = (totals[name] || 0) + (sale.total || 0);
    });

    const sorted = Object.entries(totals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k, v]) => [k, parseFloat(v.toFixed(2))]);

    renderHorizontalBar('topClientsVol', 'chartTopClientsVol', sorted,
        v => `Bs ${v.toFixed(2)}`,
        ['#e67e22', '#d35400', '#e74c3c', '#c0392b', '#9b59b6'],
        'Volumen (Bs)'
    );
}

function renderHorizontalBar(chartId, canvasId, sorted, tooltipFn, colors, label) {
    destroyChart(chartId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const emptyEl = ctx.parentElement.querySelector('.chart-empty');

    if (!sorted.length) {
        if (emptyEl) emptyEl.style.display = 'flex';
        return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    const labels = sorted.map(([name]) => name.length > 22 ? name.substring(0, 22) + '…' : name);
    const data = sorted.map(([, v]) => v);

    chartInstances[chartId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label,
                data,
                backgroundColor: colors.slice(0, data.length),
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => ` ${tooltipFn(ctx.parsed.x)}` } }
            },
            scales: {
                x: { beginAtZero: true, grid: { color: '#f0f0f0' }, ticks: { font: { size: 11 } } },
                y: { grid: { display: false }, ticks: { font: { size: 11 } } }
            }
        }
    });
}

function renderPaymentMethods(sales) {
    const counts = {};
    sales.forEach(sale => {
        const pm = (sale.paymentMethod || '').toUpperCase() || 'SIN ESPECIFICAR';
        const key = pm === 'EFECTIVO' ? 'Efectivo'
            : pm === 'TRANSFERENCIA BANCARIA' ? 'Transferencia'
            : pm === 'CHEQUE' ? 'Cheque'
            : 'Sin Especificar';
        counts[key] = (counts[key] || 0) + 1;
    });

    const colorMap = {
        'Efectivo': '#27ae60',
        'Transferencia': '#2980b9',
        'Cheque': '#8e44ad',
        'Sin Especificar': '#95a5a6'
    };

    const entries = Object.entries(counts).filter(([, v]) => v > 0);
    destroyChart('paymentMethods');
    const ctx = document.getElementById('chartPaymentMethods');
    if (!ctx) return;
    const emptyEl = ctx.parentElement.querySelector('.chart-empty');

    if (!entries.length) {
        if (emptyEl) emptyEl.style.display = 'flex';
        return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    const total = entries.reduce((s, [, v]) => s + v, 0);
    chartInstances.paymentMethods = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: entries.map(([k]) => k),
            datasets: [{
                data: entries.map(([, v]) => v),
                backgroundColor: entries.map(([k]) => colorMap[k] || '#bdc3c7'),
                hoverOffset: 10,
                borderWidth: 3,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 14, usePointStyle: true } },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${ctx.parsed} ventas (${((ctx.parsed / total) * 100).toFixed(1)}%)`
                    }
                }
            }
        }
    });
}

function renderMonthlySales(sales) {
    destroyChart('monthlySales');
    const ctx = document.getElementById('chartMonthlySales');
    const cardFull = document.getElementById('monthlySalesCard');
    if (!ctx) return;

    // Hide the monthly chart when a specific month is selected (not useful)
    if (estadisticasMonth) {
        if (cardFull) cardFull.style.display = 'none';
        return;
    }
    if (cardFull) cardFull.style.display = '';

    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    let months = [];

    if (estadisticasYear) {
        months = monthNames.map((m, i) => ({
            label: `${m} ${estadisticasYear}`,
            key: `${estadisticasYear}-${String(i + 1).padStart(2, '0')}`
        }));
    } else {
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
                key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            });
        }
    }

    const byMonth = {};
    months.forEach(m => { byMonth[m.key] = 0; });
    sales.forEach(sale => {
        const parts = sale.date.split(',')[0].trim().split('/');
        if (parts.length === 3) {
            const key = `${parts[2]}-${parts[1].padStart(2, '0')}`;
            if (byMonth[key] !== undefined) byMonth[key] += (sale.total || 0);
        }
    });

    const data = months.map(m => parseFloat(byMonth[m.key].toFixed(2)));
    const emptyEl = ctx.parentElement.querySelector('.chart-empty');

    if (data.every(v => v === 0)) {
        if (emptyEl) emptyEl.style.display = 'flex';
        return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    chartInstances.monthlySales = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months.map(m => m.label),
            datasets: [{
                label: 'Ventas (Bs)',
                data,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.08)',
                borderWidth: 2.5,
                pointBackgroundColor: '#3498db',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => ` Bs ${ctx.parsed.y.toFixed(2)}` } }
            },
            scales: {
                x: { grid: { color: '#f0f0f0' }, ticks: { font: { size: 11 }, maxRotation: 45 } },
                y: {
                    beginAtZero: true,
                    grid: { color: '#f0f0f0' },
                    ticks: { font: { size: 11 }, callback: v => `Bs ${v}` }
                }
            }
        }
    });
}

window.openEstadisticas = openEstadisticas;
window.renderEstadisticas = renderEstadisticas;

// ==================== MÓDULO DE GASTOS ====================

function initGastoForm() {
    // Establecer fecha de hoy
    const today = new Date().toISOString().split('T')[0];
    const gastoDateEl = document.getElementById('gastoDate');
    if (gastoDateEl) gastoDateEl.value = today;

    // Poblar el select de ciudad con los inventarios
    const citySelect = document.getElementById('gastoCity');
    if (citySelect && appData.inventories) {
        citySelect.innerHTML = '';
        appData.inventories.forEach(inv => {
            const opt = document.createElement('option');
            opt.value = inv.id;
            opt.textContent = inv.name;
            citySelect.appendChild(opt);
        });
        // Preseleccionar ciudad del vendedor si corresponde
        if (appData.userRole === 'vendedor' && appData.loggedSeller) {
            citySelect.value = appData.loggedSeller.city;
            citySelect.disabled = true;
            citySelect.style.opacity = '0.6';
        } else {
            citySelect.disabled = false;
            citySelect.style.opacity = '1';
        }
    }

    // Poblar el select de vendedor
    const sellerSelect = document.getElementById('gastoSeller');
    if (sellerSelect && appData.sellers) {
        sellerSelect.innerHTML = '<option value="">— Sin vendedor —</option>';
        appData.sellers.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.name;
            opt.textContent = s.name;
            sellerSelect.appendChild(opt);
        });
        if (appData.userRole === 'vendedor' && appData.loggedSeller) {
            sellerSelect.value = appData.loggedSeller.name;
            sellerSelect.disabled = true;
            sellerSelect.style.opacity = '0.6';
        } else {
            sellerSelect.disabled = false;
            sellerSelect.style.opacity = '1';
        }
    }

    renderGastosList();
}

async function saveGasto() {
    const conceptEl = document.getElementById('gastoConcept');
    const amountEl = document.getElementById('gastoAmount');
    const categoryEl = document.getElementById('gastoCategory');
    const cityEl = document.getElementById('gastoCity');
    const dateEl = document.getElementById('gastoDate');
    const notesEl = document.getElementById('gastoNotes');

    const concept = conceptEl ? conceptEl.value.trim().toUpperCase() : '';
    const amount = parseFloat(amountEl ? amountEl.value : 0) || 0;

    if (!concept) {
        alert('El concepto/descripción es obligatorio');
        return;
    }
    if (amount <= 0) {
        alert('El monto debe ser mayor a 0');
        return;
    }

    const dateVal = dateEl ? dateEl.value : '';
    let dateStr = new Date().toLocaleString('es-BO');
    if (dateVal) {
        const [y, m, d] = dateVal.split('-');
        const timeStr = new Date().toLocaleTimeString('es-BO');
        dateStr = `${d}/${m}/${y}, ${timeStr}`;
    }

    if (!Array.isArray(appData.gastos)) appData.gastos = [];

    const gasto = {
        id: Date.now(),
        type: 'gasto',
        concept,
        amount,
        category: categoryEl ? categoryEl.value : 'Otros',
        city: cityEl ? cityEl.value : (appData.inventories[0] ? appData.inventories[0].id : ''),
        seller: (document.getElementById('gastoSeller') || {}).value || '',
        date: dateStr,
        paymentMethod: (document.getElementById('gastoPaymentMethod') || {}).value || 'EFECTIVO',
        notes: notesEl ? notesEl.value.trim().toUpperCase() : ''
    };

    appData.gastos.unshift(gasto);

    await saveData();

    // Limpiar formulario
    if (conceptEl) conceptEl.value = '';
    if (amountEl) amountEl.value = '';
    if (notesEl) notesEl.value = '';
    if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];

    renderGastosList();

    // Actualizar tabla de movimientos si está abierta
    if (typeof filterSalesByMonth === 'function') filterSalesByMonth();

    alert('✅ Gasto registrado correctamente');
}

function renderGastosList() {
    const container = document.getElementById('gastoRecentList');
    if (!container) return;

    let gastos = Array.isArray(appData.gastos) ? appData.gastos : [];

    // Vendedor solo ve sus propios gastos
    if (appData.userRole === 'vendedor' && appData.loggedSeller) {
        gastos = gastos.filter(g => g.seller === appData.loggedSeller.name);
    }

    const last10 = gastos.slice(0, 10);

    if (last10.length === 0) {
        container.innerHTML = '<p style="color:#7f8c8d; text-align:center; padding:15px;">No hay gastos registrados aún.</p>';
        return;
    }

    let html = '<div style="display:flex; flex-direction:column; gap:8px;">';
    last10.forEach(g => {
        const cityName = appData.inventories.find(i => i.id === g.city)?.name || g.city || '';
        html += `
        <div style="background:#fff; border:1px solid #e0e0e0; border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
            <div style="flex:1; min-width:0;">
                <div style="font-weight:bold; font-size:13px; color:#2c3e50; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${g.concept}</div>
                <div style="font-size:11px; color:#7f8c8d; margin-top:2px;">${g.category} · ${cityName} · ${g.date}</div>
                ${g.notes ? `<div style="font-size:11px; color:#95a5a6; margin-top:2px; font-style:italic;">${g.notes}</div>` : ''}
            </div>
            <div style="text-align:right; flex-shrink:0;">
                <div style="font-size:15px; font-weight:bold; color:#e67e22;">Bs ${g.amount.toFixed(2)}</div>
                <button onclick="deleteGasto(${g.id})" style="margin-top:4px; background:none; border:1px solid #e74c3c; color:#e74c3c; border-radius:4px; padding:2px 7px; font-size:11px; cursor:pointer;">🗑 Eliminar</button>
            </div>
        </div>`;
    });
    html += '</div>';

    if (gastos.length > 10) {
        html += `<p style="text-align:center; color:#7f8c8d; font-size:11px; margin-top:8px;">Mostrando los últimos 10 de ${gastos.length} gastos</p>`;
    }

    container.innerHTML = html;
}

async function deleteGasto(id) {
    if (!confirm('¿Eliminar este gasto?')) return;
    if (!Array.isArray(appData.gastos)) appData.gastos = [];
    appData.gastos = appData.gastos.filter(g => g.id !== id);
    await saveData();
    renderGastosList();
    if (typeof filterSalesByMonth === 'function') filterSalesByMonth();
}

// Exponer globalmente
window.initGastoForm = initGastoForm;
window.saveGasto = saveGasto;
window.renderGastosList = renderGastosList;
window.deleteGasto = deleteGasto;

// ==================== GESTIÓN DE EMPRESA ====================

function openCompanySettings() {
    document.getElementById('modalCompanyName').value = appData.company.name || '';
    document.getElementById('modalCompanySlogan').value = appData.company.slogan || '';
    document.getElementById('modalCompanyNit').value = appData.company.nit || '';
    
    const preview = document.getElementById('logoPreview');
    const placeholder = document.getElementById('logoPlaceholder');
    const removeBtn = document.getElementById('logoRemoveBtn');
    if (appData.company.logo) {
        preview.src = appData.company.logo;
        preview.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
        if (removeBtn) removeBtn.style.display = 'block';
    } else {
        preview.style.display = 'none';
        preview.src = '';
        if (placeholder) placeholder.style.display = 'block';
        if (removeBtn) removeBtn.style.display = 'none';
    }
    const bg = appData.company.pdfHeaderBgColor || '#7037CD';
    const txt = appData.company.pdfHeaderTextColor || '#FFFFFF';
    document.getElementById('modalPdfHeaderBg').value = bg;
    document.getElementById('modalPdfHeaderText').value = txt;
    updatePdfPreview();
    // Reset to first tab
    switchSettingsTab('empresa', document.querySelector('.settings-tab'));
    renderModalInventoryList();
    openModal('companyModal');
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        // Validar tamaño (máximo 500KB)
        if (file.size > 500000) {
            alert('El logo es muy grande. Máximo 500KB. Intenta con una imagen más pequeña o comprimida.');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            // Convertir PNG transparente a fondo blanco para compatibilidad con PDF
            convertTransparentToWhite(e.target.result, (convertedImage) => {
                // Comprimir logo (200x200 px máximo)
                if (typeof window.compressImage === 'function') {
                    window.compressImage(convertedImage, 200, 200, (compressedImage) => {
                        document.getElementById('logoPreview').src = compressedImage;
                        document.getElementById('logoPreview').style.display = 'block';
                        const ph = document.getElementById('logoPlaceholder');
                        if (ph) ph.style.display = 'none';
                        const rb = document.getElementById('logoRemoveBtn');
                        if (rb) rb.style.display = 'block';
                    });
                } else {
                    document.getElementById('logoPreview').src = convertedImage;
                    document.getElementById('logoPreview').style.display = 'block';
                    const ph = document.getElementById('logoPlaceholder');
                    if (ph) ph.style.display = 'none';
                    const rb = document.getElementById('logoRemoveBtn');
                    if (rb) rb.style.display = 'block';
                }
            });
        };
        reader.readAsDataURL(file);
    }
}

function saveCompanySettings() {
    const name = document.getElementById('modalCompanyName').value.trim();
    const slogan = document.getElementById('modalCompanySlogan').value.trim();
    const nit = document.getElementById('modalCompanyNit').value.trim();
    const logoPreview = document.getElementById('logoPreview');

    appData.company.name = name || 'Nombre de la Empresa';
    appData.company.slogan = slogan || 'Eslogan de la empresa';
    appData.company.nit = nit;
    appData.company.pdfHeaderBgColor   = document.getElementById('modalPdfHeaderBg').value   || '#7037CD';
    appData.company.pdfHeaderTextColor = document.getElementById('modalPdfHeaderText').value || '#FFFFFF';
    
    if (logoPreview.style.display !== 'none' && logoPreview.src) {
        appData.company.logo = logoPreview.src;
    }
    
    saveData();
    updateUI();
    closeModal('companyModal');
    
    alert('Configuración guardada correctamente');
}

// Función para convertir transparencia a fondo blanco
function convertTransparentToWhite(base64, callback) {
    const img = new Image();
    img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        // Rellenar con blanco primero
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Dibujar imagen encima
        ctx.drawImage(img, 0, 0);
        
        // Convertir a JPEG (sin transparencia)
        const result = canvas.toDataURL('image/jpeg', 0.95);
        callback(result);
    };
    img.src = base64;
}

// ==================== GESTIÓN DE INVENTARIOS DESDE EL MODAL ====================

function renderModalInventoryList() {
    const list = document.getElementById('modalInventoryList');
    const countSpan = document.getElementById('modalInventoryCount');
    const addRow = document.getElementById('modalAddInventoryRow');
    if (!list) return;

    countSpan.textContent = appData.inventories.length;
    addRow.style.display = appData.inventories.length >= 4 ? 'none' : 'flex';
    list.innerHTML = '';

    appData.inventories.forEach(inv => {
        const row = document.createElement('div');
        row.id = `invRow_${inv.id}`;
        row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; background:#f8f9fa; border-radius:7px; padding:7px 12px; gap:8px;';
        row.innerHTML = `
            <span id="invName_${inv.id}" style="font-weight:600; color:#2c3e50; flex:1;">${inv.name}</span>
            <input id="invInput_${inv.id}" type="text" value="${inv.name}" maxlength="30"
                style="display:none; flex:1; padding:5px 8px; border:2px solid #e0e0e0; border-radius:6px; font-size:14px;"
                onkeydown="if(event.key==='Enter') confirmRenameInventory('${inv.id}'); if(event.key==='Escape') cancelRenameInventory('${inv.id}');">
            <div style="display:flex; gap:6px; align-items:center;">
                <button id="invEditBtn_${inv.id}" onclick="startRenameInventory('${inv.id}')"
                    style="background:none; border:none; color:#2980b9; cursor:pointer; font-size:15px; line-height:1;" title="Editar nombre">✏️</button>
                <button id="invSaveBtn_${inv.id}" onclick="confirmRenameInventory('${inv.id}')"
                    style="display:none; background:none; border:none; color:#27ae60; cursor:pointer; font-size:15px; line-height:1;" title="Guardar">✔️</button>
                <button id="invCancelBtn_${inv.id}" onclick="cancelRenameInventory('${inv.id}')"
                    style="display:none; background:none; border:none; color:#e67e22; cursor:pointer; font-size:15px; line-height:1;" title="Cancelar">✖️</button>
                ${appData.inventories.length > 1
                    ? `<button onclick="deleteInventoryFromModal('${inv.id}')" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size:16px; line-height:1;" title="Eliminar inventario">🗑</button>`
                    : '<span style="font-size:11px; color:#999;">Principal</span>'}
            </div>
        `;
        list.appendChild(row);
    });
}

function startRenameInventory(id) {
    document.getElementById(`invName_${id}`).style.display = 'none';
    document.getElementById(`invInput_${id}`).style.display = 'block';
    document.getElementById(`invInput_${id}`).focus();
    document.getElementById(`invEditBtn_${id}`).style.display = 'none';
    document.getElementById(`invSaveBtn_${id}`).style.display = 'block';
    document.getElementById(`invCancelBtn_${id}`).style.display = 'block';
}

function cancelRenameInventory(id) {
    const inv = appData.inventories.find(i => i.id === id);
    if (!inv) return;
    document.getElementById(`invInput_${id}`).value = inv.name;
    document.getElementById(`invName_${id}`).style.display = 'block';
    document.getElementById(`invInput_${id}`).style.display = 'none';
    document.getElementById(`invEditBtn_${id}`).style.display = 'block';
    document.getElementById(`invSaveBtn_${id}`).style.display = 'none';
    document.getElementById(`invCancelBtn_${id}`).style.display = 'none';
}

async function confirmRenameInventory(id) {
    const inv = appData.inventories.find(i => i.id === id);
    if (!inv) return;
    const newName = document.getElementById(`invInput_${id}`).value.trim();
    if (!newName) { alert('El nombre no puede estar vacío.'); return; }
    inv.name = newName;
    await saveData();
    renderModalInventoryList();
    if (typeof generateInventoryFilters === 'function') generateInventoryFilters();
}

async function addInventoryFromModal() {
    const input = document.getElementById('modalNewInventoryName');
    const name = input.value.trim();
    if (createInventory(name)) {
        input.value = '';
        await saveData();
        renderModalInventoryList();
        // Actualizar selector en sección inventario si está abierta
        if (typeof generateInventoryFilters === 'function') generateInventoryFilters();
    }
}

async function deleteInventoryFromModal(id) {
    if (appData.inventories.length <= 1) {
        alert('Debe existir al menos un inventario.');
        return;
    }
    const inv = appData.inventories.find(i => i.id === id);
    if (!inv) return;
    if (!confirm(`¿Eliminar el inventario "${inv.name}"? Se perderán todos los datos de stock asociados.`)) return;

    appData.inventories = appData.inventories.filter(i => i.id !== id);
    appData.products.forEach(p => { if (p.stock) delete p.stock[id]; });
    await saveData();
    renderModalInventoryList();
    if (typeof generateInventoryFilters === 'function') generateInventoryFilters();
}

// Exponer funciones globalmente
window.openCompanySettings = openCompanySettings;
window.handleLogoUpload = handleLogoUpload;
window.saveCompanySettings = saveCompanySettings;
window.convertTransparentToWhite = convertTransparentToWhite;
window.addInventoryFromModal = addInventoryFromModal;
window.deleteInventoryFromModal = deleteInventoryFromModal;

// ==================== SETTINGS TABS ====================
function switchSettingsTab(tabId, clickedBtn) {
    document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.settings-tab').forEach(b => b.classList.remove('active'));
    const panel = document.getElementById('settingsTab-' + tabId);
    if (panel) panel.classList.add('active');
    if (clickedBtn) clickedBtn.classList.add('active');
}

function updatePdfPreview() {
    const bg = document.getElementById('modalPdfHeaderBg').value;
    const txt = document.getElementById('modalPdfHeaderText').value;
    const preview = document.getElementById('pdfHeaderPreview');
    const bgLabel = document.getElementById('bgColorLabel');
    const txtLabel = document.getElementById('textColorLabel');
    if (preview) { preview.style.background = bg; preview.style.color = txt; }
    if (bgLabel) bgLabel.textContent = bg;
    if (txtLabel) txtLabel.textContent = txt;
}

function removeLogo() {
    const preview = document.getElementById('logoPreview');
    const placeholder = document.getElementById('logoPlaceholder');
    const removeBtn = document.getElementById('logoRemoveBtn');
    const fileInput = document.getElementById('logoInput');
    preview.src = '';
    preview.style.display = 'none';
    if (placeholder) placeholder.style.display = 'block';
    if (removeBtn) removeBtn.style.display = 'none';
    if (fileInput) fileInput.value = '';
    appData.company.logo = null;
}

window.switchSettingsTab = switchSettingsTab;
window.updatePdfPreview = updatePdfPreview;
window.removeLogo = removeLogo;
window.startRenameInventory = startRenameInventory;
window.cancelRenameInventory = cancelRenameInventory;
window.confirmRenameInventory = confirmRenameInventory;

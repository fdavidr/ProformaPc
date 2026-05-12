// ==================== GESTIÓN DE EMPRESA ====================

function openCompanySettings() {
    document.getElementById('modalCompanyName').value = appData.company.name || '';
    document.getElementById('modalCompanySlogan').value = appData.company.slogan || '';
    document.getElementById('modalCompanyNit').value = appData.company.nit || '';
    document.getElementById('modalAdminRecoveryEmail').value = appData.company.adminRecoveryEmail || '';
    
    if (appData.company.logo) {
        document.getElementById('logoPreview').src = appData.company.logo;
        document.getElementById('logoPreview').style.display = 'block';
    } else {
        const preview = document.getElementById('logoPreview');
        preview.style.display = 'none';
        preview.src = '';
    }
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
                    });
                } else {
                    document.getElementById('logoPreview').src = convertedImage;
                    document.getElementById('logoPreview').style.display = 'block';
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
    const adminRecoveryEmail = document.getElementById('modalAdminRecoveryEmail').value.trim();
    const logoPreview = document.getElementById('logoPreview');

    if (adminRecoveryEmail) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(adminRecoveryEmail)) {
            alert('Ingrese un correo electrónico válido para recuperación');
            return;
        }
    }
    
    appData.company.name = name || 'Nombre de la Empresa';
    appData.company.slogan = slogan || 'Eslogan de la empresa';
    appData.company.nit = nit;
    appData.company.adminRecoveryEmail = adminRecoveryEmail;
    
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
        row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; background:#f8f9fa; border-radius:7px; padding:7px 12px;';
        row.innerHTML = `
            <span style="font-weight:600; color:#2c3e50;">${inv.name}</span>
            ${appData.inventories.length > 1
                ? `<button onclick="deleteInventoryFromModal('${inv.id}')" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size:16px; line-height:1;" title="Eliminar inventario">🗑</button>`
                : '<span style="font-size:11px; color:#999;">Principal</span>'}
        `;
        list.appendChild(row);
    });
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

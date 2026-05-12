// ==================== FUNCIONES UTILITARIAS ====================

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function updateUI() {
    document.getElementById('companyName').textContent = appData.company.name;
    document.getElementById('companySlogan').textContent = appData.company.slogan;
    const companyNitEl = document.getElementById('companyNit');
    if (companyNitEl) {
        if (appData.company.nit) {
            companyNitEl.textContent = 'NIT: ' + appData.company.nit;
            companyNitEl.style.display = 'block';
        } else {
            companyNitEl.textContent = '';
            companyNitEl.style.display = 'none';
        }
    }
    if (appData.company.logo) {
        document.getElementById('companyLogo').src = appData.company.logo;
        // Sincronizar logo móvil
        const mobileLogoEl = document.getElementById('companyLogoMobile');
        if (mobileLogoEl) mobileLogoEl.src = appData.company.logo;
    }
    // Sincronizar nombre empresa en topbar móvil
    const mobileNameEl = document.getElementById('companyNameMobile');
    if (mobileNameEl) mobileNameEl.textContent = appData.company.name;

    document.getElementById('quoteNumber').textContent = 'Nº ' + appData.currentQuoteNumber;
    // Sincronizar número de documento en topbar móvil
    const mobileBadge = document.getElementById('quoteNumberMobile');
    if (mobileBadge) mobileBadge.textContent = 'Nº ' + appData.currentQuoteNumber;
    updateDocumentNumber();
    
    // Ocultar/mostrar botones según rol
    const configBtn = document.getElementById('configBtn');
    const inventoryBtn = document.getElementById('inventoryBtn');
    const salesBtn = document.getElementById('salesBtn');
    const estadisticasBtn = document.getElementById('estadisticasBtn');
    const productActionBtn = document.getElementById('productActionBtn');
    const thSalesCosto = document.getElementById('thSalesCosto');
    const thSalesGanancia = document.getElementById('thSalesGanancia');
    const cardCostoTotal = document.getElementById('cardCostoTotalSales');
    const cardGanancia = document.getElementById('cardGananciaLiquidaSales');
    
    if (appData.userRole === 'vendedor') {
        // Vendedor ve: Operaciones, Movimientos, Estadísticas
        if (configBtn) configBtn.style.display = 'none';
        if (inventoryBtn) inventoryBtn.style.display = 'none';
        if (salesBtn) salesBtn.style.display = '';
        if (estadisticasBtn) estadisticasBtn.style.display = '';
        if (productActionBtn) productActionBtn.style.display = 'none';
        // Ocultar costo y ganancia
        if (thSalesCosto) thSalesCosto.style.display = 'none';
        if (thSalesGanancia) thSalesGanancia.style.display = 'none';
        if (cardCostoTotal) cardCostoTotal.style.display = 'none';
        if (cardGanancia) cardGanancia.style.display = 'none';
        
        // Bloquear campo de vendedor y establecer vendedor logueado
        if (appData.loggedSeller) {
            const sellerInput = document.getElementById('sellerSelect');
            
            if (sellerInput) {
                sellerInput.value = appData.loggedSeller.name;
                sellerInput.disabled = true;
                sellerInput.style.backgroundColor = '#e9ecef';
                sellerInput.style.cursor = 'not-allowed';
                sellerInput.classList.add('valid-selection');
            }
            
            // Establecer vendedor actual automáticamente
            appData.currentSeller = appData.loggedSeller;
        }
    } else {
        // Admin ve todo
        if (configBtn) configBtn.style.display = '';
        if (inventoryBtn) inventoryBtn.style.display = '';
        if (salesBtn) salesBtn.style.display = '';
        if (estadisticasBtn) estadisticasBtn.style.display = '';
        if (productActionBtn) productActionBtn.style.display = '';
        if (thSalesCosto) thSalesCosto.style.display = '';
        if (thSalesGanancia) thSalesGanancia.style.display = '';
        if (cardCostoTotal) cardCostoTotal.style.display = '';
        if (cardGanancia) cardGanancia.style.display = '';
        
        // Admin puede cambiar vendedor
        const sellerInput = document.getElementById('sellerSelect');
        
        if (sellerInput) {
            sellerInput.disabled = false;
            sellerInput.style.backgroundColor = '';
            sellerInput.style.cursor = '';
        }
    }
}

// Cerrar autocompletado al hacer clic fuera
document.addEventListener('click', function(e) {
    if (!e.target.closest('.autocomplete-container')) {
        document.querySelectorAll('.autocomplete-list').forEach(list => {
            list.classList.remove('active');
        });
    }
});

// Número efectivo de Nota de Venta según ciudad activa (Cochabamba usa currentSaleNumber)
function getEffectiveSaleNumber() {
    const cityId = appData.selectedSaleCity;
    if (!cityId || cityId === 'cochabamba') return appData.currentSaleNumber;
    return (appData.currentSaleNumbers && appData.currentSaleNumbers[cityId]) || 100000;
}

function setEffectiveSaleNumber(cityId, value) {
    if (!cityId || cityId === 'cochabamba') {
        appData.currentSaleNumber = value;
    } else {
        if (!appData.currentSaleNumbers) appData.currentSaleNumbers = {};
        appData.currentSaleNumbers[cityId] = value;
    }
}

// Actualizar número de documento según el tipo
function updateDocumentNumber() {
    const quoteNumberEl = document.getElementById('quoteNumber');
    const mobileBadge = document.getElementById('quoteNumberMobile');
    let numText = '';
    if (quoteNumberEl) {
        if (appData.documentType === 'cotizacion') {
            numText = 'Nº ' + appData.currentQuoteNumber;
        } else if (appData.documentType === 'notaventa') {
            numText = 'Nº ' + getEffectiveSaleNumber();
        } else if (appData.documentType === 'notaentrega') {
            numText = 'Nº ' + appData.currentDeliveryNumber;
        }
        quoteNumberEl.textContent = numText;
    }
    if (mobileBadge && numText) mobileBadge.textContent = numText;
}

// Actualizar botón activo del menú
function setActiveMenuButton(buttonId) {
    // Remover clase activa de todos los botones del sidebar
    document.querySelectorAll('.btn-sidebar').forEach(btn => {
        btn.classList.remove('active-menu');
    });
    
    // Agregar clase activa al botón seleccionado
    const activeButton = document.getElementById(buttonId);
    if (activeButton) {
        activeButton.classList.add('active-menu');
    }
}

// Mostrar contenido principal y ocultar secciones
function showMainContent() {
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('inventorySection').style.display = 'none';
    document.getElementById('salesSection').style.display = 'none';
    document.getElementById('estadisticasSection').style.display = 'none';
    setActiveMenuButton('documentsBtn');
}

// ==================== FUNCIONES DE EXPORTACIÓN/IMPORTACIÓN ====================

function exportData() {
    try {
        // Crear objeto con todos los datos
        const dataToExport = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            data: {
                company: appData.company,
                inventories: appData.inventories,
                clients: appData.clients,
                sellers: appData.sellers,
                products: appData.products,
                pdfHistory: appData.pdfHistory,
                gastos: appData.gastos,
                terms: appData.terms,
                currentQuoteNumber: appData.currentQuoteNumber,
                currentSaleNumber: appData.currentSaleNumber,
                currentSaleNumbers: appData.currentSaleNumbers || {},
                currentDeliveryNumber: appData.currentDeliveryNumber
            }
        };
        
        // Convertir a JSON
        const jsonString = JSON.stringify(dataToExport, null, 2);
        
        // Crear Blob
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        // Crear enlace de descarga
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Nombre del archivo con fecha
        const fecha = new Date().toISOString().split('T')[0];
        a.download = `ProformaBackup_${fecha}.json`;
        
        // Descargar
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('✅ Datos exportados exitosamente');
    } catch (error) {
        alert('Error al exportar los datos: ' + error.message);
    }
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Confirmar antes de importar
    if (!confirm('⚠️ ¿Desea importar estos datos?\n\nEsto REEMPLAZARÁ todos los datos actuales (clientes, vendedores, productos, historial).\n\n✅ Haga clic en OK para continuar\n❌ Haga clic en Cancelar para abortar')) {
        event.target.value = ''; // Limpiar input
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Validar estructura
            if (!importedData.data) {
                throw new Error('Archivo inválido: falta estructura de datos');
            }
            
            // Importar datos
            if (importedData.data.company) appData.company = importedData.data.company;
            if (importedData.data.inventories) appData.inventories = importedData.data.inventories;
            if (importedData.data.clients) appData.clients = importedData.data.clients;
            if (importedData.data.sellers) appData.sellers = importedData.data.sellers;
            if (importedData.data.products) appData.products = importedData.data.products;
            if (importedData.data.pdfHistory) appData.pdfHistory = importedData.data.pdfHistory;
            if (importedData.data.gastos) appData.gastos = importedData.data.gastos;
            if (importedData.data.terms) appData.terms = importedData.data.terms;
            if (importedData.data.currentQuoteNumber) appData.currentQuoteNumber = importedData.data.currentQuoteNumber;
            if (importedData.data.currentSaleNumber) appData.currentSaleNumber = importedData.data.currentSaleNumber;
            if (importedData.data.currentSaleNumbers) appData.currentSaleNumbers = importedData.data.currentSaleNumbers;
            if (importedData.data.currentDeliveryNumber) appData.currentDeliveryNumber = importedData.data.currentDeliveryNumber;
            
            // Guardar en localStorage
            await saveData();
            
            // Actualizar UI
            updateUI();
            
            alert('✅ Datos importados exitosamente\n\n' +
                  `Clientes: ${appData.clients.length}\n` +
                  `Vendedores: ${appData.sellers.length}\n` +
                  `Productos: ${appData.products.length}\n` +
                  `Historial: ${appData.pdfHistory.length}`);
            
        } catch (error) {
            alert('Error al importar los datos: ' + error.message);
        }
        
        // Limpiar input para permitir reimportar el mismo archivo
        event.target.value = '';
    };
    
    reader.onerror = function() {
        alert('Error al leer el archivo');
        event.target.value = '';
    };
    
    reader.readAsText(file);
}

// Exponer funciones globalmente
window.openModal = openModal;
window.closeModal = closeModal;
window.updateUI = updateUI;
window.updateDocumentNumber = updateDocumentNumber;

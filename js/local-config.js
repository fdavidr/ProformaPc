// ==================== ALMACENAMIENTO LOCAL (SIN FIREBASE) ====================
// Los datos se persisten en data/appdata.json a través del servidor Express local.
// Iniciar el servidor con: node server.js  →  abrir http://localhost:3000

const API_BASE = '/api';

const DOCUMENT_COUNTER_FIELDS = {
    cotizacion: 'currentQuoteNumber',
    notaventa: 'currentSaleNumber',
    notaentrega: 'currentDeliveryNumber'
};

// ==================== INICIALIZACIÓN ====================

async function initFirebase() {
    // Sin Firebase. Verificar que el servidor local esté respondiendo.
    try {
        const res = await fetch(`${API_BASE}/data`, { method: 'HEAD' }).catch(() => null);
        if (!res) {
            console.warn('Servidor local no disponible — usando localStorage como respaldo.');
        }
    } catch (_) { /* ignorar */ }
    return true;
}

// ==================== IMÁGENES ====================
// En modo local las imágenes se almacenan como base64 directamente en el
// objeto del producto. No se necesita un cache separado.

function saveProductImageToCache(productId, base64) {
    // No-op: la imagen viaja dentro del objeto producto
}

function getProductImageFromCache(productId) {
    return null;
}

function hydrateProductImagesFromCache(products) {
    // No-op: las imágenes están incrustadas en el objeto producto
}

async function uploadProductImageToStorage(productId, base64Image) {
    // Sin Firebase Storage: devolver la imagen base64 tal cual
    return base64Image;
}

// ==================== PERSISTENCIA ====================

async function saveAllData(appData) {
    const dataToSave = {
        admin:                appData.admin || null,
        company:              { ...appData.company },
        inventories:          appData.inventories          || [],
        clients:              appData.clients              || [],
        sellers:              appData.sellers              || [],
        products:             appData.products             || [],
        pdfHistory:           appData.pdfHistory           || [],
        gastos:               appData.gastos               || [],
        currentQuoteNumber:   appData.currentQuoteNumber,
        currentSaleNumber:    appData.currentSaleNumber,
        currentSaleNumbers:   appData.currentSaleNumbers   || {},
        currentDeliveryNumber: appData.currentDeliveryNumber,
        terms:                appData.terms,
        documentType:         appData.documentType,
        lastUpdated:          new Date().toISOString()
    };

    try {
        const response = await fetch(`${API_BASE}/data`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(dataToSave)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        // Mantener una copia en localStorage como respaldo ante reinicios del servidor
        try { localStorage.setItem('proformaAppData', JSON.stringify(dataToSave)); } catch (_) {}
        return true;
    } catch (err) {
        console.error('Error guardando en servidor — usando localStorage:', err.message);
        try {
            localStorage.setItem('proformaAppData', JSON.stringify(dataToSave));
            return true;
        } catch (e) {
            console.error('Error guardando en localStorage:', e.message);
            return false;
        }
    }
}

async function loadAllData() {
    // Intentar cargar desde el servidor local primero
    try {
        const response = await fetch(`${API_BASE}/data`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data) {
            // Actualizar respaldo en localStorage
            try { localStorage.setItem('proformaAppData', JSON.stringify(data)); } catch (_) {}
            return data;
        }
    } catch (err) {
        console.warn('No se pudo cargar desde servidor — intentando localStorage:', err.message);
    }

    // Fallback: localStorage (útil si el servidor aún no arrancó o hay datos previos)
    const localStr = localStorage.getItem('proformaAppData');
    if (localStr) {
        try { return JSON.parse(localStr); } catch (_) {}
    }

    return null;
}

// ==================== CONTADORES DE DOCUMENTOS ====================
// En modo local no hay sincronización multi-dispositivo.
// pdf.js actualiza appData[counter] = reservedNumber.next después de generar el PDF,
// por lo que cada llamada a reserveDocumentNumber lee el valor correcto.

async function reserveDocumentNumber(documentType, cityId) {
    let localCurrent;

    if (documentType === 'notaventa' && cityId && cityId !== 'cochabamba') {
        localCurrent = (appData.currentSaleNumbers && appData.currentSaleNumbers[cityId]) || 100000;
    } else {
        const counterField = DOCUMENT_COUNTER_FIELDS[documentType];
        if (!counterField) return null;
        localCurrent = appData[counterField] || 100000;
    }

    return {
        number: localCurrent,
        next:   localCurrent + 1,
        source: 'local'
    };
}

async function syncDocumentCounters() {
    return false; // sin sincronización multi-dispositivo
}

function startCountersSync() {
    // No-op en modo local
}

function stopCountersSync() {
    // No-op en modo local
}

// ==================== EXPONER GLOBALMENTE ====================
window.initFirebase              = initFirebase;
window.saveAllData               = saveAllData;
window.loadAllData               = loadAllData;
window.isFirebaseEnabled         = () => false;
window.reserveDocumentNumber     = reserveDocumentNumber;
window.syncDocumentCounters      = syncDocumentCounters;
window.startCountersSync         = startCountersSync;
window.stopCountersSync          = stopCountersSync;
window.uploadProductImageToStorage  = uploadProductImageToStorage;
window.saveProductImageToCache      = saveProductImageToCache;
window.getProductImageFromCache     = getProductImageFromCache;
window.hydrateProductImagesFromCache = hydrateProductImagesFromCache;

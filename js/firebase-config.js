// ==================== CONFIGURACIÓN DE FIREBASE ====================

// INSTRUCCIONES DE CONFIGURACIÓN:
// 1. Ve a https://console.firebase.google.com/
// 2. Crea un nuevo proyecto o selecciona uno existente
// 3. Ve a "Configuración del proyecto" > "General"
// 4. En "Tus aplicaciones" > "Web", copia la configuración
// 5. Reemplaza los valores de firebaseConfig con los tuyos

const firebaseConfig = {
    apiKey: "AIzaSyD1wsVXoeHCnnxJRr7yIShqpwS_2dd_4fY",
    authDomain: "ciam-6631a.firebaseapp.com",
    projectId: "ciam-6631a",
    storageBucket: "ciam-6631a.firebasestorage.app",
    messagingSenderId: "575414511596",
    appId: "1:575414511596:web:0e4ac0599a7e96583002c9"
};

// Inicializar Firebase (solo si está configurado)
let db = null;
let storage = null;
let isFirebaseEnabled = false;
const FIREBASE_PRODUCTS_CHUNK_SIZE = 20;
const DOCUMENT_COUNTER_FIELDS = {
    cotizacion: 'currentQuoteNumber',
    notaventa: 'currentSaleNumber',
    notaentrega: 'currentDeliveryNumber'
};
let countersSyncInterval = null;

function initFirebase() {
    try {
        // Inicializar Firebase
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        storage = firebase.storage();
        isFirebaseEnabled = true;
        return true;
    } catch (error) {
        isFirebaseEnabled = false;
        return false;
    }
}

// Sube una imagen base64 a Firebase Storage y retorna la URL pública.
// Si Firebase no está disponible, retorna la misma imagen base64 como fallback.
async function uploadProductImageToStorage(productId, base64Image) {
    if (!isFirebaseEnabled || !storage) {
        return base64Image;
    }
    try {
        const ref = storage.ref(`product-images/${productId}`);
        await ref.putString(base64Image, 'data_url');
        const url = await ref.getDownloadURL();
        return url;
    } catch (error) {
        console.error('Error al subir imagen a Firebase Storage:', error);
        return base64Image;
    }
}

// ==================== CACHE DE IMÁGENES EN BASE64 ====================
// Cache separado del appData para no inflar Firestore ni el localStorage principal.
// Clave: productId (string), Valor: base64 data URL.

const IMAGE_CACHE_KEY = 'proformaImageCache';

function saveProductImageToCache(productId, base64) {
    try {
        const cache = JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY) || '{}');
        cache[String(productId)] = base64;
        localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
    } catch (e) { /* ignorar errores de cuota */ }
}

function getProductImageFromCache(productId) {
    try {
        const cache = JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY) || '{}');
        return cache[String(productId)] || null;
    } catch (e) {
        return null;
    }
}

// Para cada producto con URL de Storage, reemplaza product.image con el base64 del cache.
// Operación síncrona — solo usa localStorage.
function hydrateProductImagesFromCache(products) {
    (products || []).forEach(product => {
        if (product.image && product.image.startsWith('http')) {
            const cached = getProductImageFromCache(product.id);
            if (cached) {
                product.image = cached;
            }
        }
    });
}

// ==================== FUNCIONES DE BASE DE DATOS ====================

function createLocalCachePayload(data) {
    return {
        ...data,
        products: (data.products || []).map(product => ({
            ...product,
            // Conservar URLs de Storage; solo eliminar base64 para reducir tamaño del cache
            image: (product.image && product.image.startsWith('data:')) ? '' : (product.image || '')
        })),
        pdfHistory: (data.pdfHistory || []).slice(0, 150)
    };
}

function saveLocalCacheSafe(data) {
    try {
        localStorage.setItem('proformaAppData', JSON.stringify(data));
        return true;
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            try {
                const compactData = createLocalCachePayload(data);
                localStorage.setItem('proformaAppData', JSON.stringify(compactData));
                return true;
            } catch (compactError) {
                return false;
            }
        }

        return false;
    }
}

async function saveProductsInChunks(products) {
    if (!isFirebaseEnabled) {
        return false;
    }

    const productsCollection = db.collection('proformaProducts');
    const chunks = [];

    // Conservar URLs de Firebase Storage en Firestore; solo eliminar base64 para evitar
    // superar el límite de 1MB por documento.
    const productsForStorage = products.map(p => ({
        ...p,
        image: (p.image && p.image.startsWith('data:')) ? '' : (p.image || '')
    }));

    for (let i = 0; i < productsForStorage.length; i += FIREBASE_PRODUCTS_CHUNK_SIZE) {
        chunks.push(productsForStorage.slice(i, i + FIREBASE_PRODUCTS_CHUNK_SIZE));
    }

    const existingChunksSnapshot = await productsCollection.get();
    const existingChunkIds = existingChunksSnapshot.docs.map(doc => doc.id);

    for (let index = 0; index < chunks.length; index++) {
        await productsCollection.doc(`chunk_${index}`).set({
            index,
            items: chunks[index],
            updatedAt: new Date().toISOString()
        });
    }

    const validChunkIds = new Set(chunks.map((_, index) => `chunk_${index}`));
    for (const chunkId of existingChunkIds) {
        if (!validChunkIds.has(chunkId)) {
            await productsCollection.doc(chunkId).delete();
        }
    }

    return true;
}

async function loadProductsFromChunks() {
    if (!isFirebaseEnabled) {
        return [];
    }

    const snapshot = await db.collection('proformaProducts').orderBy('index').get();
    if (snapshot.empty) {
        return [];
    }

    const products = [];
    snapshot.forEach(doc => {
        const chunkData = doc.data();
        if (Array.isArray(chunkData.items)) {
            products.push(...chunkData.items);
        }
    });

    return products;
}

async function reserveDocumentNumber(documentType, cityId) {
    let counterField;
    let localCurrent;

    if (documentType === 'notaventa' && cityId && cityId !== 'cochabamba') {
        counterField = `currentSaleNumber_${cityId}`;
        localCurrent = (appData.currentSaleNumbers && appData.currentSaleNumbers[cityId]) || 100000;
    } else {
        counterField = DOCUMENT_COUNTER_FIELDS[documentType];
        if (!counterField) return null;
        localCurrent = appData[counterField] || 100000;
    }

    if (!isFirebaseEnabled) {
        return {
            number: localCurrent,
            next: localCurrent + 1,
            source: 'local'
        };
    }

    try {
        const appDocRef = db.collection('proformaApp').doc('appData');
        const result = await db.runTransaction(async transaction => {
            const snapshot = await transaction.get(appDocRef);
            const existingData = snapshot.exists ? snapshot.data() : {};
            const currentNumber = existingData[counterField] || localCurrent;
            const nextNumber = currentNumber + 1;

            transaction.set(appDocRef, {
                [counterField]: nextNumber,
                lastUpdated: new Date().toISOString()
            }, { merge: true });

            return {
                number: currentNumber,
                next: nextNumber,
                source: 'firebase'
            };
        });

        return result;
    } catch (error) {
        return {
            number: localCurrent,
            next: localCurrent + 1,
            source: 'fallback'
        };
    }
}

async function syncDocumentCounters() {
    if (!isFirebaseEnabled) {
        return false;
    }

    try {
        const doc = await db.collection('proformaApp').doc('appData').get();
        if (!doc.exists) {
            return false;
        }

        const data = doc.data();
        let hasChanges = false;

        Object.values(DOCUMENT_COUNTER_FIELDS).forEach(field => {
            if (typeof data[field] === 'number' && data[field] > (appData[field] || 0)) {
                appData[field] = data[field];
                hasChanges = true;
            }
        });

        // Sync per-city sale numbers
        if (data.currentSaleNumbers && typeof data.currentSaleNumbers === 'object') {
            if (!appData.currentSaleNumbers) appData.currentSaleNumbers = {};
            Object.entries(data.currentSaleNumbers).forEach(([cid, num]) => {
                if (typeof num === 'number' && num > (appData.currentSaleNumbers[cid] || 0)) {
                    appData.currentSaleNumbers[cid] = num;
                    hasChanges = true;
                }
            });
        }

        if (hasChanges && typeof updateDocumentNumber === 'function') {
            updateDocumentNumber();
        }

        return hasChanges;
    } catch (error) {
        return false;
    }
}

function startCountersSync() {
    if (countersSyncInterval) {
        clearInterval(countersSyncInterval);
    }

    syncDocumentCounters();
    countersSyncInterval = setInterval(() => {
        syncDocumentCounters();
    }, 10000);
}

function stopCountersSync() {
    if (countersSyncInterval) {
        clearInterval(countersSyncInterval);
        countersSyncInterval = null;
    }
}

// Elimina las imágenes base64 de los productos dentro de los items del historial
// para mantener el tamaño del documento Firestore por debajo del límite de 1MB.
// Las URLs de Firebase Storage se conservan (son cadenas cortas).
function stripImagesFromHistoryItems(historyArray) {
    return (historyArray || []).map(entry => ({
        ...entry,
        items: (entry.items || []).map(item => ({
            ...item,
            product: item.product ? {
                ...item.product,
                image: (item.product.image && item.product.image.startsWith('data:')) ? '' : (item.product.image || '')
            } : item.product
        }))
    }));
}

// Función para guardar todos los datos de la aplicación
async function saveAllData(appData) {
    // Limitar cotizaciones a 10 y mantener todas las ventas y entregas
    let limitedHistory = appData.pdfHistory || [];
    const cotizaciones = limitedHistory.filter(entry => entry.type === 'cotizacion');
    const ventas = limitedHistory.filter(entry => entry.type === 'notaventa');
    const entregas = limitedHistory.filter(entry => entry.type === 'notaentrega');
    
    // Ordenar cotizaciones por ID descendente (más recientes primero) y tomar las 10 más recientes
    const sortedCotizaciones = cotizaciones.sort((a, b) => b.id - a.id);
    const limitedCotizaciones = sortedCotizaciones.slice(0, 10);
    
    // Combinar cotizaciones limitadas con todas las ventas y entregas, y ordenar por ID
    // Eliminar imágenes de productos en items del historial para no superar el límite de 1MB de Firestore
    limitedHistory = stripImagesFromHistoryItems(
        [...limitedCotizaciones, ...ventas, ...entregas].sort((a, b) => b.id - a.id)
    );
    
    const dataToSave = {
        company: { ...appData.company },
        inventories: appData.inventories || [],
        clients: appData.clients || [],
        sellers: appData.sellers || [],
        products: appData.products || [],
        pdfHistory: limitedHistory,
        gastos: appData.gastos || [],
        currentQuoteNumber: appData.currentQuoteNumber,
        currentSaleNumber: appData.currentSaleNumber,
        currentSaleNumbers: appData.currentSaleNumbers || {},
        currentDeliveryNumber: appData.currentDeliveryNumber,
        terms: appData.terms,
        documentType: appData.documentType,
        productsUpdatedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
    };

    // Intentar guardar en Firebase primero
    if (isFirebaseEnabled) {
        try {
            await saveProductsInChunks(dataToSave.products || []);

            const firebasePayload = {
                ...dataToSave,
                products: [],
                productsStorage: 'chunks',
                productsCount: (dataToSave.products || []).length,
                // Campo dedicado que SOLO se actualiza cuando los productos se guardan
                // exitosamente en chunks. `lastUpdated` lo sobreescribe reserveDocumentNumber
                // cada vez que se crea un documento, invalidando la comparación de timestamps.
                productsUpdatedAt: dataToSave.lastUpdated
            };

            const appDocRef = db.collection('proformaApp').doc('appData');
            await db.runTransaction(async transaction => {
                const snapshot = await transaction.get(appDocRef);
                const existingData = snapshot.exists ? snapshot.data() : {};

                // Merge pdfHistory: combinar entradas del servidor con las locales para evitar
                // que guardados concurrentes de dos vendedores se sobreescriban entre sí.
                const existingHistory = existingData.pdfHistory || [];
                const localHistory = firebasePayload.pdfHistory || [];
                const mergedMap = new Map();
                // Primero las del servidor, luego las locales (las locales tienen prioridad
                // para reflejar cambios recientes como anulaciones o facturado)
                existingHistory.forEach(entry => mergedMap.set(entry.id, entry));
                localHistory.forEach(entry => mergedMap.set(entry.id, entry));
                let mergedHistory = Array.from(mergedMap.values()).sort((a, b) => b.id - a.id);
                // Aplicar límite de 10 cotizaciones
                const mCotizaciones = mergedHistory.filter(e => e.type === 'cotizacion').slice(0, 10);
                const mVentas = mergedHistory.filter(e => e.type === 'notaventa');
                const mEntregas = mergedHistory.filter(e => e.type === 'notaentrega');
                firebasePayload.pdfHistory = [...mCotizaciones, ...mVentas, ...mEntregas]
                    .sort((a, b) => b.id - a.id);

                // Merge gastos: local es autoritativo (preserva eliminaciones).
                // Solo se agregan gastos del servidor creados DESPUÉS del más reciente
                // local (adiciones concurrentes de otro dispositivo).
                const existingGastos = existingData.gastos || [];
                const localGastos = firebasePayload.gastos || [];
                const localGastoIds = new Set(localGastos.map(g => g.id));
                const newestLocalGastoId = localGastos.length > 0
                    ? Math.max(...localGastos.map(g => g.id))
                    : Date.now();
                const concurrentServerGastos = existingGastos.filter(
                    g => !localGastoIds.has(g.id) && g.id > newestLocalGastoId
                );
                firebasePayload.gastos = [...localGastos, ...concurrentServerGastos]
                    .sort((a, b) => b.id - a.id);

                firebasePayload.currentQuoteNumber = Math.max(
                    firebasePayload.currentQuoteNumber || 100000,
                    existingData.currentQuoteNumber || 100000
                );
                firebasePayload.currentSaleNumber = Math.max(
                    firebasePayload.currentSaleNumber || 100000,
                    existingData.currentSaleNumber || 100000
                );
                firebasePayload.currentDeliveryNumber = Math.max(
                    firebasePayload.currentDeliveryNumber || 100000,
                    existingData.currentDeliveryNumber || 100000
                );

                // Merge per-city sale numbers
                const localCityNums = firebasePayload.currentSaleNumbers || {};
                const existingCityNums = existingData.currentSaleNumbers || {};
                const mergedCityNums = {};
                new Set([...Object.keys(localCityNums), ...Object.keys(existingCityNums)]).forEach(cid => {
                    mergedCityNums[cid] = Math.max(localCityNums[cid] || 100000, existingCityNums[cid] || 100000);
                });
                firebasePayload.currentSaleNumbers = mergedCityNums;

                transaction.set(appDocRef, firebasePayload, { merge: true });
            });

            appData.currentQuoteNumber = firebasePayload.currentQuoteNumber;
            appData.currentSaleNumber = firebasePayload.currentSaleNumber;
            appData.currentDeliveryNumber = firebasePayload.currentDeliveryNumber;
            appData.currentSaleNumbers = firebasePayload.currentSaleNumbers || {};
            // Sincronizar historial y gastos fusionados de vuelta al estado local
            appData.pdfHistory = firebasePayload.pdfHistory;
            dataToSave.pdfHistory = firebasePayload.pdfHistory;
            appData.gastos = firebasePayload.gastos;
            dataToSave.gastos = firebasePayload.gastos;
            // Sincronizar productsUpdatedAt para que localStorage lo tenga
            dataToSave.productsUpdatedAt = firebasePayload.productsUpdatedAt;

            // Guardar cache local sin bloquear si hay límite de espacio
            saveLocalCacheSafe(dataToSave);
            return true;
        } catch (error) {
            // Fallo en Firebase — guardar solo en localStorage como respaldo
        }
    }

    // Guardar en localStorage (si Firebase falla o no está disponible)
    try {
        if (saveLocalCacheSafe(dataToSave)) {
            return true;
        }

        throw new Error('No se pudo guardar en localStorage');
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            alert('Espacio de almacenamiento lleno. Eliminando datos antiguos...');
            // Reducir ventas y entregas si hay problemas de espacio
            const ventas = appData.pdfHistory.filter(entry => entry.type === 'notaventa')
                .sort((a, b) => b.id - a.id)
                .slice(0, 50); // Solo mantener 50 ventas más recientes
            const entregas = appData.pdfHistory.filter(entry => entry.type === 'notaentrega')
                .sort((a, b) => b.id - a.id)
                .slice(0, 30); // Solo mantener 30 entregas más recientes
            dataToSave.pdfHistory = [...limitedCotizaciones, ...ventas, ...entregas].sort((a, b) => b.id - a.id);
            saveLocalCacheSafe(dataToSave);
        }
        return false;
    }
}

// Función para cargar todos los datos
async function loadAllData() {
    let firebaseData = null;
    
    // Intentar cargar desde Firebase primero
    if (isFirebaseEnabled) {
        try {
            const doc = await db.collection('proformaApp').doc('appData').get();
            if (doc.exists) {
                firebaseData = doc.data();

                if (firebaseData.productsStorage === 'chunks') {
                    const chunksProducts = await loadProductsFromChunks();
                    const firebaseUpdatedAt = firebaseData.productsUpdatedAt || '';

                    // Cargar productos de localStorage para comparar
                    let localProducts = [];
                    let localUpdatedAt = '';
                    try {
                        const localStr = localStorage.getItem('proformaAppData');
                        if (localStr) {
                            const localData = JSON.parse(localStr);
                            localProducts = localData.products || [];
                            localUpdatedAt = localData.productsUpdatedAt || localData.lastUpdated || '';
                        }
                    } catch (e) { /* ignorar */ }

                    if (localProducts.length > 0 && chunksProducts.length > 0) {
                        if (firebaseUpdatedAt > localUpdatedAt) {
                            // Firebase fue actualizado desde OTRO dispositivo—usar sus productos.
                            // Agregar también productos que solo existan en localStorage
                            // (aún no sincronizados) y restaurar imágenes locales.
                            const chunkMap = new Map(chunksProducts.map(p => [p.id, p]));
                            const localMap = new Map(localProducts.map(p => [p.id, p]));
                            const onlyLocal = localProducts.filter(p => !chunkMap.has(p.id));
                            // Restaurar imágenes de localStorage a los productos de Firebase
                            const merged = chunksProducts.map(p => {
                                const lp = localMap.get(p.id);
                                return lp && lp.image ? { ...p, image: lp.image } : p;
                            });
                            firebaseData.products = [...merged, ...onlyLocal];
                        } else {
                            // localStorage es igual o más reciente → este dispositivo guardó de último.
                            // Agregar productos que solo existan en Firebase (de otro dispositivo).
                            const localMap = new Map(localProducts.map(p => [p.id, p]));
                            const onlyInFirebase = chunksProducts.filter(p => !localMap.has(p.id));
                            firebaseData.products = [...localProducts, ...onlyInFirebase];
                        }
                    } else if (localProducts.length > 0) {
                        firebaseData.products = localProducts;
                    } else {
                        firebaseData.products = chunksProducts;
                    }
                } else {
                    firebaseData.products = firebaseData.products || [];
                }

                // Fusionar con localStorage para recuperar ventas que fallaron al guardarse en Firebase
                const localStr = localStorage.getItem('proformaAppData');
                if (localStr) {
                    try {
                        const localData = JSON.parse(localStr);
                        const localHistory = localData.pdfHistory || [];
                        const fbHistory = firebaseData.pdfHistory || [];
                        if (localHistory.length > fbHistory.length ||
                            (localHistory.length > 0 && fbHistory.length > 0 &&
                             localHistory[0].id > fbHistory[0].id)) {
                            // localStorage tiene entradas más recientes → fusionar
                            const mergedMap = new Map();
                            fbHistory.forEach(e => mergedMap.set(e.id, e));
                            localHistory.forEach(e => mergedMap.set(e.id, e));
                            firebaseData.pdfHistory = Array.from(mergedMap.values())
                                .sort((a, b) => b.id - a.id);
                        }
                    } catch (e) { /* ignorar errores de parseo */ }
                }

                // Guardar en localStorage como cache (sin romper la carga por límites)
                saveLocalCacheSafe(firebaseData);
                return firebaseData;
            } else {
                // No hay datos en Firebase
            }
        } catch (error) {
            // Error cargando desde Firebase — intentar localStorage
        }
    }
    
    // Cargar desde localStorage si Firebase no tiene datos o falló
    const localDataStr = localStorage.getItem('proformaAppData');
    if (localDataStr) {
        try {
            const localData = JSON.parse(localDataStr);
            
            return localData;
        } catch (e) {
            // Error parseando localStorage
        }
    }

    return null;
}

// Exponer funciones globalmente
window.initFirebase = initFirebase;
window.saveAllData = saveAllData;
window.loadAllData = loadAllData;
window.isFirebaseEnabled = () => isFirebaseEnabled;
window.reserveDocumentNumber = reserveDocumentNumber;
window.syncDocumentCounters = syncDocumentCounters;
window.startCountersSync = startCountersSync;
window.stopCountersSync = stopCountersSync;
window.uploadProductImageToStorage = uploadProductImageToStorage;
window.saveProductImageToCache = saveProductImageToCache;
window.getProductImageFromCache = getProductImageFromCache;
window.hydrateProductImagesFromCache = hydrateProductImagesFromCache;

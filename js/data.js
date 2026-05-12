// ==================== ESTRUCTURA DE DATOS GLOBAL ====================
let appData = {
    // Credenciales del administrador (configuradas en el primer arranque)
    // passwordHash: SHA-256 hex de la contraseña
    // securityQuestions: array de { question, answerHash }
    admin: null,

    company: {
        name: 'Nombre de la Empresa',
        slogan: 'Eslogan de la empresa',
        nit: '',
        adminRecoveryEmail: '',
        logo: ''
    },
    inventories: [
        { id: 'cochabamba', name: 'Cochabamba' },
        { id: 'santacruz', name: 'Santa Cruz' }
    ],
    clients: [],
    sellers: [],
    products: [],
    quotes: [],
    pdfHistory: [],
    gastos: [],
    currentQuoteNumber: 100000,
    currentSaleNumber: 100000,
    currentSaleNumbers: {},
    currentDeliveryNumber: 100000,
    currentClient: null,
    currentSeller: null,
    currentProduct: null,
    currentQuoteItems: [],
    documentType: 'cotizacion',
    selectedSaleCity: 'cochabamba',
    userRole: null,
    loggedSeller: null,
    terms: {
        cotizacion: [
            'Precios sujetos a cambio sin previo aviso',
            'Validez de la cotización: 15 días',
            'Formas de pago: efectivo, transferencia o tarjeta',
            'Tiempo de entrega: según disponibilidad'
        ],
        notaventa: [
            'Producto vendido sin garantía',
            'No se aceptan devoluciones',
            'Revisión del producto antes de retirarlo',
            'El cliente acepta el producto en las condiciones presentadas'
        ],
        notaentrega: [
            'El receptor confirma la recepción de los productos en buen estado',
            'Cualquier daño debe ser reportado en el momento de la entrega',
            'Esta nota de entrega no constituye factura ni comprobante de pago',
            'Conservar este documento para futuras consultas'
        ]
    }
};

// ==================== FUNCIONES DE PERSISTENCIA ====================
async function loadData() {
    try {
        // Intentar cargar desde Firebase/localStorage
        const saved = await loadAllData();
        
        if (saved) {
            // Cargar credenciales del administrador
            if (saved.admin) appData.admin = saved.admin;

            // Cargar datos de la empresa
            if (saved.company) {
                appData.company = saved.company;
            }
            
            // Cargar listas de datos
            if (saved.clients) appData.clients = saved.clients;
            if (saved.sellers) appData.sellers = saved.sellers;
            if (saved.products) {
                appData.products = saved.products;
                // Restaurar imágenes base64 desde el cache local para productos con URL de Storage
                hydrateProductImagesFromCache(appData.products);
            }
            if (saved.pdfHistory) appData.pdfHistory = saved.pdfHistory;
            if (saved.gastos) appData.gastos = saved.gastos;
            
            // Cargar inventarios
            if (saved.inventories) {
                appData.inventories = saved.inventories;
            }
            
            // Migrar productos antiguos al nuevo formato si es necesario
            migrateProductsToNewFormat();
            
            // Cargar números de documentos
            if (saved.currentQuoteNumber) appData.currentQuoteNumber = saved.currentQuoteNumber;
            if (saved.currentSaleNumber) appData.currentSaleNumber = saved.currentSaleNumber;
            if (saved.currentDeliveryNumber) appData.currentDeliveryNumber = saved.currentDeliveryNumber;
            if (saved.currentSaleNumbers) appData.currentSaleNumbers = saved.currentSaleNumbers;
            
            // Cargar términos
            if (saved.terms) appData.terms = saved.terms;
        }
    } catch (e) {
    }
}

async function saveData() {
    return await saveAllData(appData);
}

// ==================== FUNCIONES DE GESTIÓN DE INVENTARIOS ====================

// Migrar productos del formato antiguo (stockCochabamba, stockSantaCruz) al nuevo formato (stock object)
function migrateProductsToNewFormat() {
    appData.products.forEach(product => {
        // Si el producto tiene el formato antiguo, migrarlo
        if (product.stockCochabamba !== undefined || product.stockSantaCruz !== undefined) {
            if (!product.stock) {
                product.stock = {};
            }
            
            // Migrar stocks
            if (product.stockCochabamba !== undefined) {
                product.stock['cochabamba'] = product.stockCochabamba;
                delete product.stockCochabamba;
            }
            
            if (product.stockSantaCruz !== undefined) {
                product.stock['santacruz'] = product.stockSantaCruz;
                delete product.stockSantaCruz;
            }
        }
        
        // Asegurar que existe el objeto stock
        if (!product.stock) {
            product.stock = {};
        }
        
        // Inicializar stocks para todos los inventarios si no existen
        appData.inventories.forEach(inventory => {
            if (product.stock[inventory.id] === undefined) {
                product.stock[inventory.id] = 0;
            }
        });
    });
}

// Crear un nuevo inventario
function createInventory(name) {
    if (!name || name.trim() === '') {
        alert('El nombre del inventario es obligatorio');
        return false;
    }
    
    if (appData.inventories.length >= 4) {
        alert('No se pueden crear más de 4 inventarios');
        return false;
    }
    
    // Crear ID a partir del nombre
    const id = name.toLowerCase().replace(/\s+/g, '');
    
    // Verificar que no exista ya
    if (appData.inventories.some(inv => inv.id === id)) {
        alert('Ya existe un inventario con ese nombre');
        return false;
    }
    
    // Agregar nuevo inventario
    appData.inventories.push({
        id: id,
        name: name.trim()
    });
    
    // Agregar stock = 0 para todos los productos en este nuevo inventario
    appData.products.forEach(product => {
        if (!product.stock) {
            product.stock = {};
        }
        product.stock[id] = 0;
    });
    
    return true;
}

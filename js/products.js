// ==================== GESTIÓN DE PRODUCTOS ====================

function filterProducts(query) {
    const list = document.getElementById('productList');
    const input = document.getElementById('productSelect');
    list.innerHTML = '';
    
    // Si el campo está vacío, remover la validación visual y limpiar producto actual
    if (!query || query.trim() === '') {
        input.classList.remove('valid-selection');
        appData.currentProduct = null;
        document.getElementById('productActionBtn').textContent = 'Nuevo Producto';
        document.getElementById('productActionBtn').className = 'btn btn-warning';
    }
    
    if (!query) {
        appData.products.forEach(product => {
            addProductToList(product, list);
        });
    } else {
        const filtered = appData.products.filter(p => 
            p.description.toLowerCase().includes(query.toLowerCase()) ||
            (p.code && p.code.toLowerCase().includes(query.toLowerCase()))
        );
        filtered.forEach(product => {
            addProductToList(product, list);
        });
    }
    
    if (list.children.length > 0) {
        list.classList.add('active');
    }
}

function showProductList() {
    filterProducts('');
}

function addProductToList(product, list) {
    const div = document.createElement('div');
    div.className = 'autocomplete-item';
    div.textContent = (product.code ? product.code + ' - ' : '') + product.description;
    div.onclick = () => selectProduct(product);
    list.appendChild(div);
}

function selectProduct(product) {
    appData.currentProduct = product;
    const input = document.getElementById('productSelect');
    input.value = product.description;
    input.classList.add('valid-selection');
    document.getElementById('productList').classList.remove('active');
    document.getElementById('productPrice').value = product.price || 0;
    document.getElementById('productActionBtn').textContent = 'Modificar Producto';
    document.getElementById('productActionBtn').className = 'btn btn-warning';
}

function handleProductAction() {
    // Generar campos de stock dinámicamente
    generateStockFields();
    
    if (appData.currentProduct) {
        document.getElementById('productModalTitle').textContent = 'Modificar Producto';
        document.getElementById('modalProductCode').value = appData.currentProduct.code || '';
        document.getElementById('modalProductDescription').value = appData.currentProduct.description;
        document.getElementById('modalProductPrice').value = appData.currentProduct.price || 0;
        document.getElementById('modalProductCost').value = appData.currentProduct.cost || 0;
        
        // Cargar stocks para cada inventario
        appData.inventories.forEach(inventory => {
            const stockInput = document.getElementById(`modalProductStock_${inventory.id}`);
            if (stockInput) {
                const stockValue = appData.currentProduct.stock && appData.currentProduct.stock[inventory.id]
                    ? appData.currentProduct.stock[inventory.id]
                    : 0;
                stockInput.value = stockValue;
            }
        });
        
        if (appData.currentProduct.image) {
            document.getElementById('productImagePreview').src = appData.currentProduct.image;
            document.getElementById('productImagePreview').style.display = 'block';
        }
    } else {
        document.getElementById('productModalTitle').textContent = 'Nuevo Producto';
        document.getElementById('modalProductCode').value = '';
        document.getElementById('modalProductDescription').value = '';
        document.getElementById('modalProductPrice').value = 0;
        document.getElementById('modalProductCost').value = 0;
        
        // Inicializar todos los stocks en 0
        appData.inventories.forEach(inventory => {
            const stockInput = document.getElementById(`modalProductStock_${inventory.id}`);
            if (stockInput) {
                stockInput.value = 0;
            }
        });
        
        document.getElementById('productImagePreview').style.display = 'none';
    }
    openModal('productModal');
}

// Generar campos de stock dinámicamente según inventarios disponibles
function generateStockFields() {
    const container = document.getElementById('stockFieldsContainer');
    container.innerHTML = '';
    
    appData.inventories.forEach(inventory => {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = `Stock ${inventory.name}`;
        
        const input = document.createElement('input');
        input.type = 'number';
        input.id = `modalProductStock_${inventory.id}`;
        input.min = '0';
        input.step = '0.01';
        input.value = '0';
        
        formGroup.appendChild(label);
        formGroup.appendChild(input);
        container.appendChild(formGroup);
    });
}

function handleProductImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        // Validar tamaño (máximo 500KB)
        if (file.size > 500000) {
            alert('La imagen es muy grande. Máximo 500KB. Intenta con una imagen más pequeña o comprimida.');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            // Comprimir imagen antes de guardar
            compressImage(e.target.result, 300, 300, (compressedImage) => {
                document.getElementById('productImagePreview').src = compressedImage;
                document.getElementById('productImagePreview').style.display = 'block';
            });
        };
        reader.readAsDataURL(file);
    }
}

// Función para comprimir imágenes
function compressImage(base64, maxWidth, maxHeight, callback) {
    const img = new Image();
    img.onload = function() {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calcular nuevas dimensiones manteniendo aspecto
        if (width > height) {
            if (width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
            }
        } else {
            if (height > maxHeight) {
                width *= maxHeight / height;
                height = maxHeight;
            }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Comprimir a JPEG con calidad 0.7 (70%)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        callback(compressedBase64);
    };
    img.src = base64;
}

async function saveProduct() {
    const description = document.getElementById('modalProductDescription').value.trim();
    if (!description) {
        alert('La descripción es obligatoria');
        return;
    }

    const code = document.getElementById('modalProductCode').value.trim();
    
    // Validar código duplicado
    if (code) {
        const duplicateProduct = appData.products.find(p => 
            p.code.toLowerCase() === code.toLowerCase() && 
            (!appData.currentProduct || p.id !== appData.currentProduct.id)
        );
        
        if (duplicateProduct) {
            alert(`El código "${code}" ya está en uso por otro producto: ${duplicateProduct.description}`);
            return;
        }
    }

    // Recopilar stocks de todos los inventarios
    const stock = {};
    appData.inventories.forEach(inventory => {
        const stockInput = document.getElementById(`modalProductStock_${inventory.id}`);
        if (stockInput) {
            stock[inventory.id] = parseFloat(stockInput.value) || 0;
        }
    });
    
    const product = {
        id: appData.currentProduct ? appData.currentProduct.id : Date.now(),
        code: code,
        description: description,
        price: parseFloat(document.getElementById('modalProductPrice').value) || 0,
        cost: parseFloat(document.getElementById('modalProductCost').value) || 0,
        stock: stock,
        registrationDate: appData.currentProduct ? appData.currentProduct.registrationDate : new Date().toISOString(),
        image: ''
    };

    const imgPreview = document.getElementById('productImagePreview');
    if (imgPreview.style.display !== 'none' && imgPreview.src) {
        if (imgPreview.src.startsWith('data:')) {
            // Nueva imagen base64: guardar en cache local ANTES de subir a Storage
            const base64ToUpload = imgPreview.src;
            saveProductImageToCache(product.id, base64ToUpload);
            const confirmBtn = document.querySelector('#productModal .btn-primary');
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.textContent = 'Subiendo imagen...';
            }
            try {
                product.image = await uploadProductImageToStorage(product.id, base64ToUpload);
            } finally {
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = 'Confirmar';
                }
            }
        } else {
            // Ya es una URL de Storage, conservar
            product.image = imgPreview.src;
        }
    }

    if (appData.currentProduct) {
        const index = appData.products.findIndex(p => p.id === appData.currentProduct.id);
        appData.products[index] = product;
    } else {
        appData.products.push(product);
    }

    appData.currentProduct = product;
    saveData();
    selectProduct(product);
    closeModal('productModal');
    
    // Si la sección de inventario está visible, recargar datos
    const inventorySection = document.getElementById('inventorySection');
    if (inventorySection && inventorySection.style.display === 'block') {
        loadInventoryData();
    }
}

// Exponer funciones globalmente
window.filterProducts = filterProducts;
window.selectProduct = selectProduct;
window.handleProductAction = handleProductAction;
window.handleProductImageUpload = handleProductImageUpload;
window.saveProduct = saveProduct;
window.compressImage = compressImage;

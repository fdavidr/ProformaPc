// ==================== GESTIÓN DE COTIZACIONES ====================

// Generar botones de ciudad dinámicamente según inventarios
function generateCitySelectorButtons() {
    const container = document.getElementById('citySelectorButtons');
    if (!container) return;
    
    container.innerHTML = '';
    
    appData.inventories.forEach((inventory, index) => {
        const button = document.createElement('button');
        button.className = 'btn btn-primary city-selector' + (index === 0 ? ' active' : '');
        button.dataset.city = inventory.id;
        button.onclick = () => selectSaleCity(inventory.id);
        
        // Agregar nombre completo y iniciales como data attributes
        const initials = inventory.name.substring(0, 2).toUpperCase();
        button.dataset.fullName = inventory.name;
        button.dataset.initials = initials;
        
        // Crear span para nombre completo y span para iniciales
        const fullNameSpan = document.createElement('span');
        fullNameSpan.className = 'city-full-name';
        fullNameSpan.textContent = inventory.name;
        
        const initialsSpan = document.createElement('span');
        initialsSpan.className = 'city-initials';
        initialsSpan.textContent = initials;
        
        button.appendChild(fullNameSpan);
        button.appendChild(initialsSpan);
        
        container.appendChild(button);
    });
    
    // Establecer ciudad por defecto
    if (appData.inventories.length > 0) {
        appData.selectedSaleCity = appData.inventories[0].id;
    }

    // Generar select para móvil
    const mobileContainer = document.getElementById('citySelectorMobile');
    if (mobileContainer) {
        mobileContainer.innerHTML = '';
        const select = document.createElement('select');
        select.id = 'citySelectorSelect';
        select.style.cssText = 'width:100%; padding:9px 12px; border:2px solid #3498db; border-radius:8px; font-size:15px; font-weight:600; color:#2c3e50; background:#fff; cursor:pointer; outline:none;';
        appData.inventories.forEach(inventory => {
            const opt = document.createElement('option');
            opt.value = inventory.id;
            opt.textContent = inventory.name;
            if (inventory.id === appData.selectedSaleCity) opt.selected = true;
            select.appendChild(opt);
        });
        select.addEventListener('change', () => selectSaleCity(select.value));
        mobileContainer.appendChild(select);
    }
}

function setDocumentType(type) {
    appData.documentType = type;
    document.querySelectorAll('.type-toggle .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    // Marcar el botón clickeado como activo buscando por data attribute
    const clickedBtn = document.querySelector(`.type-toggle .btn[onclick*="'${type}'"]`);
    if (clickedBtn) clickedBtn.classList.add('active');

    // Mostrar/ocultar formulario de gasto vs formulario de documento
    const quoteFormBody = document.getElementById('quoteFormBody');
    const gastoFormSection = document.getElementById('gastoFormSection');
    if (type === 'gasto') {
        if (quoteFormBody) quoteFormBody.style.display = 'none';
        if (gastoFormSection) { gastoFormSection.style.display = 'block'; }
        if (typeof initGastoForm === 'function') initGastoForm();
        const citySelector = document.getElementById('citySelectorContainer');
        if (citySelector) citySelector.style.display = 'none';
        return;
    } else {
        if (quoteFormBody) quoteFormBody.style.display = 'block';
        if (gastoFormSection) gastoFormSection.style.display = 'none';
    }

    // Mostrar campo de método de pago solo en Nota de Venta
    const paymentMethodGroup = document.getElementById('salePaymentMethodGroup');
    if (paymentMethodGroup) {
        paymentMethodGroup.style.display = type === 'notaventa' ? 'block' : 'none';
    }

    // Actualizar número mostrado
    updateDocumentNumber();
    
    // Actualizar texto del botón de agregar producto
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
        if (type === 'cotizacion') {
            addProductBtn.textContent = 'Agregar a Cotización';
        } else if (type === 'notaventa') {
            addProductBtn.textContent = 'Agregar a Nota de Venta';
        } else if (type === 'notaentrega') {
            addProductBtn.textContent = 'Agregar a Nota de Entrega';
        }
    }
    
    // Mostrar/ocultar selector de ciudad solo para nota de venta
    const citySelector = document.getElementById('citySelectorContainer');
    if (type === 'notaventa') {
        // Generar botones de ciudad dinámicamente
        generateCitySelectorButtons();
        
        citySelector.style.display = 'block';
        
        // Si es vendedor, bloquear selección y establecer su ciudad
        if (appData.userRole === 'vendedor' && appData.loggedSeller) {
            appData.selectedSaleCity = appData.loggedSeller.city;
            document.querySelectorAll('.city-selector').forEach(btn => {
                btn.classList.remove('active');
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
                if (btn.dataset.city === appData.loggedSeller.city) {
                    btn.classList.add('active');
                }
            });
            // Bloquear también el select móvil
            const mobileSelect = document.getElementById('citySelectorSelect');
            if (mobileSelect) {
                mobileSelect.value = appData.loggedSeller.city;
                mobileSelect.disabled = true;
                mobileSelect.style.opacity = '0.5';
                mobileSelect.style.cursor = 'not-allowed';
            }
        } else {
            // Admin puede seleccionar cualquier ciudad
            document.querySelectorAll('.city-selector').forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            });
        }
    } else {
        citySelector.style.display = 'none';
    }
    
    loadTerms();
}

function selectSaleCity(city) {
    appData.selectedSaleCity = city;
    
    // Actualizar botones activos
    document.querySelectorAll('.city-selector').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.city === city) {
            btn.classList.add('active');
        }
    });

    // Sincronizar select móvil
    const mobileSelect = document.getElementById('citySelectorSelect');
    if (mobileSelect) mobileSelect.value = city;

    // Actualizar numeración mostrada según la ciudad seleccionada
    updateDocumentNumber();
}

function loadTerms() {
    const terms = appData.terms[appData.documentType];
    let loadedCount = 0;
    
    for (let i = 0; i < 4; i++) {
        const textarea = document.getElementById('term' + (i + 1));
        if (textarea) {
            textarea.value = terms[i] || '';
            loadedCount++;
        }
    }
    
    return loadedCount === 4;
}

function saveTerms() {
    const terms = [];
    for (let i = 1; i <= 4; i++) {
        const textarea = document.getElementById('term' + i);
        if (textarea) {
            terms.push(textarea.value);
        }
    }
    appData.terms[appData.documentType] = terms;
    saveData();
}

function initTermsListeners() {
    for (let i = 1; i <= 4; i++) {
        const textarea = document.getElementById('term' + i);
        if (textarea) {
            // Remover listener anterior si existe
            const newTextarea = textarea.cloneNode(true);
            textarea.parentNode.replaceChild(newTextarea, textarea);
            
            // Agregar nuevo listener
            let timeout;
            newTextarea.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    saveTerms();
                }, 500);
            });
        }
    }
}

// Función para forzar recarga de términos con reintentos
function forceLoadTermsWithRetry() {
    let attempts = 0;
    const maxAttempts = 10;
    
    const tryLoad = () => {
        attempts++;
        const success = loadTerms();
        
        if (success) {
            initTermsListeners();
            return;
        }
        
        if (attempts < maxAttempts) {
            setTimeout(tryLoad, 100);
        }
    };
    
    tryLoad();
}

function addProductToQuote() {
    if (!appData.currentProduct) {
        alert('Seleccione un producto');
        return;
    }

    // Asegurar que el array existe
    if (!Array.isArray(appData.currentQuoteItems)) {
        appData.currentQuoteItems = [];
    }

    const quantity = parseFloat(document.getElementById('productQuantity').value) || 1;
    const price = parseFloat(document.getElementById('productPrice').value) || 0;
    const discount = parseFloat(document.getElementById('productDiscount').value) || 0;
    const discountType = document.getElementById('discountType').value;

    let discountAmount = 0;
    let subtotal = 0;
    
    if (discountType === '%') {
        // Descuento porcentual: se aplica al total
        discountAmount = (price * quantity * discount) / 100;
        subtotal = (price * quantity) - discountAmount;
    } else {
        // Descuento en Bs: se aplica por unidad antes de multiplicar
        const priceWithDiscount = price - discount;
        subtotal = priceWithDiscount * quantity;
        discountAmount = discount * quantity;
    }

    const item = {
        id: appData.currentProduct.id, // Usar el ID original del producto
        product: appData.currentProduct,
        quantity: quantity,
        price: price,
        discount: discount,
        discountType: discountType,
        discountAmount: discountAmount,
        subtotal: subtotal
    };

    appData.currentQuoteItems.push(item);
    renderQuoteItems();
    calculateTotals();

    // Resetear formulario
    document.getElementById('productSelect').value = '';
    document.getElementById('productSelect').classList.remove('valid-selection');
    document.getElementById('productQuantity').value = 1;
    document.getElementById('productDiscount').value = 0;
    document.getElementById('productPrice').value = 0;
    appData.currentProduct = null;
    document.getElementById('productActionBtn').textContent = 'Nuevo Producto';
    document.getElementById('productActionBtn').className = 'btn btn-warning';
}

function renderQuoteItems() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    // Asegurar que el array existe
    if (!Array.isArray(appData.currentQuoteItems)) {
        appData.currentQuoteItems = [];
        return;
    }

    appData.currentQuoteItems.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.draggable = true;
        tr.dataset.index = index;
        tr.innerHTML = `
            <td><img src="${item.product.image || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'25\' height=\'25\'%3E%3Crect fill=\'%23ecf0f1\' width=\'25\' height=\'25\'/%3E%3C/svg%3E'}" class="product-image" alt=""></td>
            <td>${index + 1}</td>
            <td>${item.product.code || '-'}</td>
            <td>${item.product.description}</td>
            <td>${item.quantity}</td>
            <td>Bs ${item.price.toFixed(2)}</td>
            <td>${item.discount} ${item.discountType}</td>
            <td>Bs ${item.subtotal.toFixed(2)}</td>
            <td><button class="btn btn-delete" onclick="removeQuoteItem(${item.id})">Eliminar</button></td>
        `;
        
        // Eventos de drag & drop
        tr.addEventListener('dragstart', handleDragStart);
        tr.addEventListener('dragover', handleDragOver);
        tr.addEventListener('drop', handleDrop);
        tr.addEventListener('dragend', handleDragEnd);
        
        tbody.appendChild(tr);
    });
}

let draggedElement = null;

function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    
    if (this !== draggedElement) {
        this.classList.add('drag-over');
    }
    return false;
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    if (draggedElement !== this) {
        const draggedIndex = parseInt(draggedElement.dataset.index);
        const targetIndex = parseInt(this.dataset.index);
        
        // Reordenar el array
        const [movedItem] = appData.currentQuoteItems.splice(draggedIndex, 1);
        appData.currentQuoteItems.splice(targetIndex, 0, movedItem);
        
        // Re-renderizar
        renderQuoteItems();
        calculateTotals();
    }
    
    return false;
}

function handleDragEnd(e) {
    // Limpiar estilos
    document.querySelectorAll('.products-table tbody tr').forEach(tr => {
        tr.classList.remove('dragging', 'drag-over');
    });
}

function removeQuoteItem(itemId) {
    appData.currentQuoteItems = appData.currentQuoteItems.filter(item => item.id !== itemId);
    renderQuoteItems();
    calculateTotals();
}

function calculateTotals() {
    let subtotal = 0;
    let totalDiscount = 0;

    // Asegurar que el array existe
    if (Array.isArray(appData.currentQuoteItems)) {
        appData.currentQuoteItems.forEach(item => {
            subtotal += item.price * item.quantity;
            totalDiscount += item.discountAmount;
        });
    }

    const total = subtotal - totalDiscount;

    const subtotalAmount = document.getElementById('subtotalAmount');
    const discountAmountElem = document.getElementById('discountAmount');
    const totalAmount = document.getElementById('totalAmount');
    
    if (subtotalAmount) subtotalAmount.textContent = 'Bs ' + subtotal.toFixed(2);
    if (discountAmountElem) discountAmountElem.textContent = 'Bs ' + totalDiscount.toFixed(2);
    if (totalAmount) totalAmount.textContent = 'Bs ' + total.toFixed(2);
}

function newQuote() {
    if (confirm('¿Desea crear una nueva cotización? Se perderán los datos actuales no guardados.')) {
        appData.currentClient = null;
        appData.currentSeller = null;
        appData.currentProduct = null;
        appData.currentQuoteItems = [];

        document.getElementById('clientSelect').value = '';
        document.getElementById('clientSelect').classList.remove('valid-selection');
        document.getElementById('clientActionBtn').textContent = 'Agregar Cliente';
        document.getElementById('clientActionBtn').className = 'btn btn-success';

        document.getElementById('sellerSelect').value = '';
        document.getElementById('sellerSelect').classList.remove('valid-selection');
        document.getElementById('sellerActionBtn').textContent = 'Agregar Vendedor';
        document.getElementById('sellerActionBtn').className = 'btn btn-success';

        document.getElementById('productSelect').value = '';
        document.getElementById('productSelect').classList.remove('valid-selection');
        document.getElementById('productQuantity').value = 1;
        document.getElementById('productDiscount').value = 0;
        document.getElementById('productPrice').value = 0;
        document.getElementById('productActionBtn').textContent = 'Nuevo Producto';
        document.getElementById('productActionBtn').className = 'btn btn-warning';

        // Restablecer fecha a hoy
        const dateInput = document.getElementById('pdfDate');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        renderQuoteItems();
        calculateTotals();
    }
}

// Exponer funciones globalmente
window.setDocumentType = setDocumentType;
window.selectSaleCity = selectSaleCity;
window.addProductToQuote = addProductToQuote;
window.removeQuoteItem = removeQuoteItem;
window.newQuote = newQuote;

// ==================== GESTIÓN DE VENDEDORES ====================

function filterSellers(query) {
    // Si es vendedor, no permitir búsqueda
    if (appData.userRole === 'vendedor') {
        return;
    }
    
    const list = document.getElementById('sellerList');
    list.innerHTML = '';
    
    if (!query) {
        appData.sellers.forEach(seller => {
            addSellerToList(seller, list);
        });
    } else {
        const filtered = appData.sellers.filter(s => 
            s.name.toLowerCase().includes(query.toLowerCase())
        );
        filtered.forEach(seller => {
            addSellerToList(seller, list);
        });
    }
    
    if (list.children.length > 0) {
        list.classList.add('active');
    }
}

function showSellerList() {
    // Si es vendedor, no mostrar lista
    if (appData.userRole === 'vendedor') {
        return;
    }
    filterSellers('');
}

function addSellerToList(seller, list) {
    const div = document.createElement('div');
    div.className = 'autocomplete-item';
    div.textContent = seller.name + (seller.phone ? ' - ' + seller.phone : '');
    div.onclick = () => selectSeller(seller);
    list.appendChild(div);
}

function selectSeller(seller) {
    // Si es vendedor, no permitir cambio
    if (appData.userRole === 'vendedor') {
        return;
    }
    
    appData.currentSeller = seller;
    const input = document.getElementById('sellerSelect');
    input.value = seller.name;
    input.classList.add('valid-selection');
    document.getElementById('sellerList').classList.remove('active');
    document.getElementById('sellerActionBtn').textContent = 'Editar Vendedor';
    document.getElementById('sellerActionBtn').className = 'btn btn-warning';
}

function handleSellerAction() {
    // Restringir solo a administrador
    if (appData.userRole !== 'admin') {
        alert('Solo el administrador puede gestionar vendedores');
        return;
    }
    
    // Generar opciones de ciudad dinámicamente
    generateCityOptions();
    
    if (appData.currentSeller) {
        document.getElementById('sellerModalTitle').textContent = 'Editar Vendedor';
        document.getElementById('modalSellerName').value = appData.currentSeller.name;
        document.getElementById('modalSellerPhone').value = appData.currentSeller.phone || '';
        document.getElementById('modalSellerUsername').value = appData.currentSeller.username || '';
        document.getElementById('modalSellerPassword').value = appData.currentSeller.password || '';
        document.getElementById('modalSellerCity').value = appData.currentSeller.city || (appData.inventories[0] ? appData.inventories[0].id : 'cochabamba');
    } else {
        document.getElementById('sellerModalTitle').textContent = 'Agregar Vendedor';
        document.getElementById('modalSellerName').value = '';
        document.getElementById('modalSellerPhone').value = '';
        document.getElementById('modalSellerUsername').value = '';
        document.getElementById('modalSellerPassword').value = '';
        document.getElementById('modalSellerCity').value = appData.inventories[0] ? appData.inventories[0].id : 'cochabamba';
    }
    openModal('sellerModal');
}

// Generar opciones de ciudad dinámicamente según inventarios disponibles
function generateCityOptions() {
    const select = document.getElementById('modalSellerCity');
    select.innerHTML = '';
    
    appData.inventories.forEach(inventory => {
        const option = document.createElement('option');
        option.value = inventory.id;
        option.textContent = inventory.name;
        select.appendChild(option);
    });
}

function saveSeller() {
    const name = document.getElementById('modalSellerName').value.trim();
    const username = document.getElementById('modalSellerUsername').value.trim();
    const password = document.getElementById('modalSellerPassword').value.trim();
    const city = document.getElementById('modalSellerCity').value;
    
    if (!name) {
        alert('El nombre es obligatorio');
        return;
    }
    
    if (!username) {
        alert('El usuario es obligatorio');
        return;
    }
    
    if (!password) {
        alert('La contraseña es obligatoria');
        return;
    }

    // Validar que el usuario no exista (excepto si es edición)
    const existingSeller = appData.sellers.find(s => 
        s.username === username && s.id !== (appData.currentSeller ? appData.currentSeller.id : null)
    );
    if (existingSeller) {
        alert('El usuario ya existe');
        return;
    }

    const seller = {
        id: appData.currentSeller ? appData.currentSeller.id : Date.now(),
        name: name,
        phone: document.getElementById('modalSellerPhone').value,
        username: username,
        password: password,
        city: city
    };

    if (appData.currentSeller) {
        const index = appData.sellers.findIndex(s => s.id === appData.currentSeller.id);
        appData.sellers[index] = seller;
    } else {
        appData.sellers.push(seller);
    }

    appData.currentSeller = seller;
    saveData();
    selectSeller(seller);
    closeModal('sellerModal');
}

// Exponer funciones globalmente
window.filterSellers = filterSellers;
window.selectSeller = selectSeller;
window.handleSellerAction = handleSellerAction;
window.saveSeller = saveSeller;

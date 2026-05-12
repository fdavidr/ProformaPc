// ==================== GESTIÓN DE CLIENTES ====================

function filterClients(query) {
    const list = document.getElementById('clientList');
    const input = document.getElementById('clientSelect');
    list.innerHTML = '';
    
    // Si el campo está vacío, remover la validación visual y limpiar cliente actual
    if (!query || query.trim() === '') {
        input.classList.remove('valid-selection');
        appData.currentClient = null;
        document.getElementById('clientActionBtn').textContent = 'Agregar Cliente';
        document.getElementById('clientActionBtn').className = 'btn btn-success';
    }
    
    if (!query) {
        appData.clients.forEach(client => {
            addClientToList(client, list);
        });
    } else {
        const filtered = appData.clients.filter(c => 
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            (c.company && c.company.toLowerCase().includes(query.toLowerCase()))
        );
        filtered.forEach(client => {
            addClientToList(client, list);
        });
    }
    
    if (list.children.length > 0) {
        list.classList.add('active');
    }
}

function showClientList() {
    filterClients('');
}

function addClientToList(client, list) {
    const div = document.createElement('div');
    div.className = 'autocomplete-item';
    div.textContent = client.name.toUpperCase() + (client.company ? ' - ' + client.company.toUpperCase() : '');
    div.onclick = () => selectClient(client);
    list.appendChild(div);
}

function selectClient(client) {
    appData.currentClient = client;
    const input = document.getElementById('clientSelect');
    input.value = client.name.toUpperCase();
    input.classList.add('valid-selection');
    document.getElementById('clientList').classList.remove('active');
    document.getElementById('clientActionBtn').textContent = 'Editar Cliente';
    document.getElementById('clientActionBtn').className = 'btn btn-warning';
}

function handleClientAction() {
    if (appData.currentClient) {
        // Modo edición
        document.getElementById('clientModalTitle').textContent = 'Editar Cliente';
        document.getElementById('modalClientName').value = appData.currentClient.name;
        document.getElementById('modalClientPhone').value = appData.currentClient.phone || '';
        document.getElementById('modalClientCI').value = appData.currentClient.ci || '';
        document.getElementById('modalClientCompany').value = appData.currentClient.company || '';
    } else {
        // Modo agregar
        document.getElementById('clientModalTitle').textContent = 'Agregar Cliente';
        document.getElementById('modalClientName').value = '';
        document.getElementById('modalClientPhone').value = '';
        document.getElementById('modalClientCI').value = '';
        document.getElementById('modalClientCompany').value = '';
    }
    openModal('clientModal');
}

function saveClient() {
    const name = document.getElementById('modalClientName').value.trim();
    if (!name) {
        alert('El nombre es obligatorio');
        return;
    }

    const client = {
        id: appData.currentClient ? appData.currentClient.id : Date.now(),
        name: name,
        phone: document.getElementById('modalClientPhone').value,
        ci: document.getElementById('modalClientCI').value,
        company: document.getElementById('modalClientCompany').value
    };

    if (appData.currentClient) {
        // Actualizar existente
        const index = appData.clients.findIndex(c => c.id === appData.currentClient.id);
        appData.clients[index] = client;
    } else {
        // Agregar nuevo
        appData.clients.push(client);
    }

    appData.currentClient = client;
    saveData();
    selectClient(client);
    closeModal('clientModal');
}

// Exponer funciones globalmente
window.filterClients = filterClients;
window.selectClient = selectClient;
window.handleClientAction = handleClientAction;
window.saveClient = saveClient;

// ==================== AUTENTICACIÓN ====================

function togglePasswordVisibility() {
    const pwd = document.getElementById('password');
    const btn = document.getElementById('togglePasswordBtn');
    if (!pwd || !btn) return;
    if (pwd.type === 'password') {
        pwd.type = 'text';
        btn.textContent = '🙈';
        btn.style.color = '#3498db';
    } else {
        pwd.type = 'password';
        btn.textContent = '👁';
        btn.style.color = '#aaa';
    }
}

function initLogin() {
    // Limpiar listener anterior para evitar duplicados si initLogin se llama más de una vez
    const form = document.getElementById('loginForm');
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        let isValid = false;
        let userRole = null;
        let sellerData = null;

        // Verificar credenciales de administrador (almacenadas con hash)
        if (appData.admin && username === appData.admin.username) {
            const passwordHash = await sha256(password);
            if (passwordHash === appData.admin.passwordHash) {
                isValid = true;
                userRole = 'admin';
            }
        }

        // Verificar vendedores (contraseña en texto plano, como antes)
        if (!isValid) {
            const seller = appData.sellers.find(s =>
                s.username === username && s.password === password
            );
            if (seller) {
                isValid = true;
                userRole = 'vendedor';
                sellerData = seller;
            }
        }

        if (isValid) {
            appData.userRole = userRole;
            appData.loggedSeller = sellerData;

            if (userRole === 'vendedor' && sellerData) {
                appData.selectedSaleCity = sellerData.city;
            }

            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('app').style.display = 'block';

            setTimeout(() => init(), 0);
        } else {
            const errorDiv = document.getElementById('loginError');
            errorDiv.textContent = 'Usuario o contraseña incorrectos';
            errorDiv.classList.remove('hidden');
        }
    });
}

function handleForgotPassword() {
    openRecoveryScreen();
}

function logout() {
    if (confirm('¿Está seguro de cerrar sesión?')) {
        saveData();

        if (typeof stopCountersSync === 'function') {
            stopCountersSync();
        }

        appData.userRole = null;
        appData.loggedSeller = null;
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        document.getElementById('loginError').classList.add('hidden');
    }
}

// Exponer funciones globalmente
window.logout = logout;
window.handleForgotPassword = handleForgotPassword;

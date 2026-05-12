// ==================== INICIALIZACIÓN DE LA APLICACIÓN ====================

async function init() {
    // Los datos ya fueron cargados en DOMContentLoaded
    // Solo actualizar UI y configuraciones
    updateUI();
    
    // Forzar carga de términos con reintentos automáticos
    forceLoadTermsWithRetry();
    
    initPdfDatePicker();
    
    // Inicializar conversión automática a mayúsculas
    initUppercaseInputs();
    
    // Mostrar selector de documentos por defecto
    const typeToggle = document.querySelector('.type-toggle');
    if (typeToggle) {
        typeToggle.style.display = 'flex';
    }
    
    // Establecer botón de Documentos como activo por defecto
    if (typeof setActiveMenuButton === 'function') {
        setActiveMenuButton('documentsBtn');
    }

    // Sincronizar contadores de documentos entre múltiples equipos
    if (typeof startCountersSync === 'function') {
        startCountersSync();
    }
}

// ==================== MENÚ MÓVIL ====================
function openMobileMenu() {
    const sidebar = document.getElementById('appSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.add('mobile-open');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
    const sidebar = document.getElementById('appSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Cerrar sidebar al navegar en móvil
function closeMobileMenuOnNav() {
    if (window.innerWidth <= 768) closeMobileMenu();
}

window.openMobileMenu = openMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.closeMobileMenuOnNav = closeMobileMenuOnNav;

// ==================== MAYÚSCULAS ====================
// Inicializar conversión automática a mayúsculas para todos los inputs de texto
function initUppercaseInputs() {
    // Convertir a mayúsculas en tiempo real para inputs de texto y textareas
    const convertToUppercase = (event) => {
        const input = event.target;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        
        input.value = input.value.toUpperCase();
        
        // Restaurar posición del cursor
        input.setSelectionRange(start, end);
    };
    
    // Función para verificar si un input debe ser excluido
    const shouldExcludeInput = (input) => {
        // Excluir campos de contraseña
        if (input.type === 'password') return true;
        
        // Excluir campos del login (username y password están en #loginScreen)
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen && loginScreen.contains(input)) return true;
        
        // Excluir textareas de términos y condiciones
        if (input.id && ['term1', 'term2', 'term3', 'term4'].includes(input.id)) return true;
        
        return false;
    };
    
    // Agregar listener a todos los inputs de texto existentes
    const textInputs = document.querySelectorAll('input[type="text"], input[type="email"], textarea');
    textInputs.forEach(input => {
        if (!shouldExcludeInput(input)) {
            input.addEventListener('input', convertToUppercase);
        }
    });
    
    // Observer para inputs dinámicos que se agreguen después
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // Element node
                    // Si el nodo es un input o textarea
                    if ((node.tagName === 'INPUT' && (node.type === 'text' || node.type === 'email')) || node.tagName === 'TEXTAREA') {
                        if (!shouldExcludeInput(node)) {
                            node.addEventListener('input', convertToUppercase);
                        }
                    }
                    // Buscar inputs dentro del nodo agregado
                    const inputs = node.querySelectorAll('input[type="text"], input[type="email"], textarea');
                    inputs.forEach(input => {
                        if (!shouldExcludeInput(input)) {
                            input.addEventListener('input', convertToUppercase);
                        }
                    });
                }
            });
        });
    });
    
    // Observar cambios en el documento
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Inicializar selector de fecha para PDF
function initPdfDatePicker() {
    const dateInput = document.getElementById('pdfDate');
    if (!dateInput) return;
    
    // Establecer fecha actual por defecto
    const today = new Date();
    dateInput.value = today.toISOString().split('T')[0];
    
    // Fecha mínima: 1 de enero de 2025
    const minDateStr = '2025-01-01';

    // Establecer límites
    dateInput.min = minDateStr;
    dateInput.max = today.toISOString().split('T')[0];
    
    // Validar en tiempo real
    dateInput.addEventListener('change', function() {
        const selectedDate = new Date(this.value + 'T00:00:00');
        const minDate = new Date(minDateStr + 'T00:00:00');
        const maxDate = new Date(today.toISOString().split('T')[0] + 'T00:00:00');
        
        if (selectedDate < minDate) {
            alert('La fecha no puede ser anterior al 1 de enero de 2025');
            this.value = today.toISOString().split('T')[0];
        } else if (selectedDate > maxDate) {
            alert('No se pueden seleccionar fechas futuras');
            this.value = today.toISOString().split('T')[0];
        }
    });
}

// Inicializar el sistema de login cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async function() {
    // 1. Verificar licencia antes de cualquier otra cosa
    try {
        const licRes  = await fetch('/api/license');
        const licData = await licRes.json();
        if (!licData.valid) {
            document.getElementById('activationScreen').style.display = 'flex';
            document.getElementById('loginScreen').style.display      = 'none';
            return;
        }
    } catch (e) {
        document.getElementById('activationScreen').style.display = 'flex';
        document.getElementById('loginScreen').style.display      = 'none';
        return;
    }

    // Licencia válida → iniciar la app
    await startApp();
});

// Flujo post-licencia: cargar datos, verificar admin y mostrar pantalla correcta
async function startApp() {
    // 2. Inicializar capa de datos (local, sin Firebase)
    if (typeof initFirebase === 'function') {
        await initFirebase();
    }

    // 3. Cargar datos guardados
    await loadData();

    // 4. Si no hay admin configurado → mostrar configuración inicial
    if (!appData.admin || !appData.admin.username) {
        openSetupScreen();
        return;
    }

    // 5. Admin existe → inicializar login normalmente
    initLogin();
}

window.startApp = startApp;

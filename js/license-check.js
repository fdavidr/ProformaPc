// ==================== ACTIVACIÓN DE LICENCIA ====================

// Formatea la clave automáticamente mientras el usuario escribe: CIAM-XXXX-XXXX-XXXX
function formatLicenseKey(input) {
    let val = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.length > 4)  val = val.slice(0, 4)  + '-' + val.slice(4);
    if (val.length > 9)  val = val.slice(0, 9)  + '-' + val.slice(9);
    if (val.length > 14) val = val.slice(0, 14) + '-' + val.slice(14);
    if (val.length > 19) val = val.slice(0, 19); // máx: CIAM-XXXX-XXXX-XXXX
    input.value = val;
}

async function activateLicense() {
    const keyInput = document.getElementById('licenseKeyInput');
    const errorDiv = document.getElementById('licenseError');
    const btn      = document.getElementById('activateBtn');

    errorDiv.style.display = 'none';
    btn.disabled    = true;
    btn.textContent = 'Verificando...';

    const key = ((keyInput && keyInput.value) || '').trim().toUpperCase();
    if (!key) {
        _showLicenseError('Ingrese una clave de licencia');
        btn.disabled = false; btn.textContent = 'Activar';
        return;
    }

    try {
        const res  = await fetch('/api/license/activate', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ key })
        });
        const data = await res.json();
        if (data.ok) {
            document.getElementById('activationScreen').style.display = 'none';
            // Ejecutar el flujo completo: cargar datos → verificar admin → setup o login
            await startApp();
        } else {
            _showLicenseError(data.error || 'Clave inválida. Verifique e intente nuevamente.');
        }
    } catch (e) {
        _showLicenseError('No se pudo conectar con el servidor local.');
    } finally {
        btn.disabled    = false;
        btn.textContent = 'Activar';
    }
}

function _showLicenseError(msg) {
    const div = document.getElementById('licenseError');
    if (div) { div.textContent = msg; div.style.display = 'block'; }
}

window.activateLicense  = activateLicense;
window.formatLicenseKey = formatLicenseKey;

// ==================== CONFIGURACIÓN INICIAL Y RECUPERACIÓN ====================

const SECURITY_QUESTIONS = [
    '¿Cuál es el nombre de tu primera mascota?',
    '¿En qué ciudad naciste?',
    '¿Cuál es el nombre de tu madre?',
    '¿Cuál fue el nombre de tu primera escuela?',
    '¿Cuál es tu película favorita de la infancia?',
    '¿Cuál es el apellido de tu mejor amigo de la infancia?'
];

// ── Utilidades ────────────────────────────────────────────

// Hash SHA-256 usando Web Crypto API (disponible en todos los navegadores modernos)
async function sha256(text) {
    const msgBuffer = new TextEncoder().encode(text.trim().toLowerCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function showSetupError(msg) {
    const el = document.getElementById('setupError');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function hideSetupError() {
    const el = document.getElementById('setupError');
    if (el) el.style.display = 'none';
}

// ── Pantalla de Configuración Inicial ────────────────────

function openSetupScreen() {
    _renderSetupQuestions();
    document.getElementById('setupScreen').style.display = 'flex';
    document.getElementById('loginScreen').style.display  = 'none';
    document.getElementById('app').style.display          = 'none';
}

function _renderSetupQuestions() {
    const container = document.getElementById('setupQuestionsContainer');
    if (!container) return;
    container.innerHTML = '';
    SECURITY_QUESTIONS.forEach((q, i) => {
        container.innerHTML += `
        <div style="margin-bottom:14px;">
            <label style="display:block; font-size:13px; color:#555; margin-bottom:5px;">
                ${i + 1}. ${q}
            </label>
            <input type="text" id="setupQ${i}" placeholder="Su respuesta" maxlength="80"
                   style="width:100%; padding:9px 12px; border:1.5px solid #ddd; border-radius:6px;
                          font-size:13px; box-sizing:border-box; outline:none;"
                   onfocus="this.style.borderColor='#27ae60'" onblur="this.style.borderColor='#ddd'">
        </div>`;
    });
}

async function saveSetup() {
    hideSetupError();

    const username = (document.getElementById('setupUsername').value || '').trim();
    const password = (document.getElementById('setupPassword').value || '');
    const confirm  = (document.getElementById('setupPasswordConfirm').value || '');

    if (!username) { showSetupError('El nombre de usuario es obligatorio.'); return; }
    if (username.length < 3) { showSetupError('El usuario debe tener al menos 3 caracteres.'); return; }
    if (password.length < 6) { showSetupError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (password !== confirm) { showSetupError('Las contraseñas no coinciden.'); return; }

    // Validar que todas las respuestas estén completas
    for (let i = 0; i < SECURITY_QUESTIONS.length; i++) {
        const ans = (document.getElementById(`setupQ${i}`).value || '').trim();
        if (!ans) {
            showSetupError(`Responda la pregunta ${i + 1}: "${SECURITY_QUESTIONS[i]}"`);
            return;
        }
    }

    const btn = document.getElementById('setupSaveBtn');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
        const passwordHash = await sha256(password);

        // Hashear cada respuesta (insensible a mayúsculas/espacios al inicio y fin)
        const securityQuestions = [];
        for (let i = 0; i < SECURITY_QUESTIONS.length; i++) {
            const ans = document.getElementById(`setupQ${i}`).value.trim();
            const answerHash = await sha256(ans);
            securityQuestions.push({ question: SECURITY_QUESTIONS[i], answerHash });
        }

        appData.admin = { username, passwordHash, securityQuestions };
        await saveData();

        document.getElementById('setupScreen').style.display = 'none';
        document.getElementById('loginScreen').style.display  = 'flex';

        // Pre-llenar el usuario en el login para comodidad
        const usernameInput = document.getElementById('username');
        if (usernameInput) usernameInput.value = username;

        initLogin();
    } catch (e) {
        showSetupError('Error guardando la configuración. Intente nuevamente.');
        console.error('Error en saveSetup:', e);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar y Continuar';
    }
}

// ── Pantalla de Recuperación de Contraseña ────────────────

function openRecoveryScreen() {
    if (!appData.admin || !appData.admin.securityQuestions) {
        alert('No hay preguntas de seguridad configuradas.');
        return;
    }

    _renderRecoveryQuestions();

    // Resetear estado
    document.getElementById('recoveryStep1').style.display = 'block';
    document.getElementById('recoveryStep2').style.display = 'none';
    const err1 = document.getElementById('recoveryError');
    const err2 = document.getElementById('recoveryError2');
    if (err1) err1.style.display = 'none';
    if (err2) err2.style.display = 'none';

    document.getElementById('recoveryScreen').style.display = 'flex';
}

function closeRecovery() {
    document.getElementById('recoveryScreen').style.display = 'none';
}

function _renderRecoveryQuestions() {
    const container = document.getElementById('recoveryQuestionsContainer');
    if (!container) return;
    container.innerHTML = '';
    const questions = appData.admin.securityQuestions;
    questions.forEach((sq, i) => {
        container.innerHTML += `
        <div style="margin-bottom:14px;">
            <label style="display:block; font-size:13px; color:#555; margin-bottom:5px; font-weight:500;">
                ${i + 1}. ${sq.question}
            </label>
            <input type="text" id="recoveryA${i}" placeholder="Su respuesta" maxlength="80"
                   style="width:100%; padding:9px 12px; border:1.5px solid #ddd; border-radius:6px;
                          font-size:13px; box-sizing:border-box; outline:none;"
                   onfocus="this.style.borderColor='#2c3e50'" onblur="this.style.borderColor='#ddd'">
        </div>`;
    });
}

async function verifySecurityAnswers() {
    const errorEl = document.getElementById('recoveryError');
    if (errorEl) errorEl.style.display = 'none';

    const questions = appData.admin.securityQuestions;
    let correct = 0;

    for (let i = 0; i < questions.length; i++) {
        const ans = (document.getElementById(`recoveryA${i}`).value || '').trim();
        if (!ans) continue;
        const hash = await sha256(ans);
        if (hash === questions[i].answerHash) correct++;
    }

    if (correct >= 4) {
        // Pasa al paso 2
        document.getElementById('recoveryStep1').style.display = 'none';
        document.getElementById('recoveryStep2').style.display = 'block';
        document.getElementById('newPassword').value        = '';
        document.getElementById('newPasswordConfirm').value = '';
    } else {
        const remaining = 4 - correct;
        if (errorEl) {
            errorEl.textContent = `Respondió correctamente ${correct} de 6 preguntas. Necesita al menos 4. Verifique ${remaining} respuesta${remaining > 1 ? 's' : ''} más.`;
            errorEl.style.display = 'block';
        }
    }
}

async function saveNewPassword() {
    const errorEl = document.getElementById('recoveryError2');
    if (errorEl) errorEl.style.display = 'none';

    const newPwd  = (document.getElementById('newPassword').value || '');
    const confirm = (document.getElementById('newPasswordConfirm').value || '');

    if (newPwd.length < 6) {
        if (errorEl) { errorEl.textContent = 'La contraseña debe tener al menos 6 caracteres.'; errorEl.style.display = 'block'; }
        return;
    }
    if (newPwd !== confirm) {
        if (errorEl) { errorEl.textContent = 'Las contraseñas no coinciden.'; errorEl.style.display = 'block'; }
        return;
    }

    try {
        appData.admin.passwordHash = await sha256(newPwd);
        await saveData();
        closeRecovery();
        alert('Contraseña actualizada correctamente. Inicie sesión con su nueva contraseña.');
    } catch (e) {
        if (errorEl) { errorEl.textContent = 'Error guardando la nueva contraseña.'; errorEl.style.display = 'block'; }
    }
}

// Exponer globalmente
window.openSetupScreen        = openSetupScreen;
window.saveSetup              = saveSetup;
window.openRecoveryScreen     = openRecoveryScreen;
window.closeRecovery          = closeRecovery;
window.verifySecurityAnswers  = verifySecurityAnswers;
window.saveNewPassword        = saveNewPassword;

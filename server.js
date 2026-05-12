// ==================== SERVIDOR LOCAL ====================
// Sistema de Cotizaciones y Ventas — Modo PC Local
// Ejecutar con: node server.js  |  Acceder en: http://localhost:3000

const express  = require('express');
const fs       = require('fs');
const path     = require('path');
const crypto   = require('crypto');
const { machineIdSync } = require('node-machine-id');

const app  = express();
const PORT = 3000;
const HOST = '127.0.0.1'; // solo acceso local

// ── Rutas ─────────────────────────────────────────────────
// En producción (exe pkg): __dirname = snapshot virtual del exe (read-only)
// Los datos van en el directorio del exe (externo, escribible)
const IS_PKG        = typeof process.pkg !== 'undefined';
const BASE_DIR      = IS_PKG ? path.dirname(process.execPath) : __dirname;
const DATA_DIR      = path.join(BASE_DIR, 'data');
const DATA_FILE     = path.join(DATA_DIR, 'appdata.json');
const LICENSE_FILE  = path.join(DATA_DIR, 'license.json');
const LICENSES_FILE = path.join(__dirname, 'licenses.json'); // bundled read-only

// Crear carpeta de datos si no existe
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Sistema de Licencias ───────────────────────────────────
// Secreto embebido en el binario — usado para firmar la activación
const LICENSE_SECRET = 'Ci@mPr0f0rma_2026#SecK3y$L0calApp!';

function getMachineId() {
    try { return machineIdSync({ original: true }); }
    catch (e) { return 'fb-' + require('os').hostname() + '-' + require('os').userInfo().username; }
}

function computeSignature(key, machineId) {
    return crypto.createHmac('sha256', LICENSE_SECRET)
        .update(`${key}::${machineId}::CIAM`)
        .digest('hex');
}

function isLicenseValid() {
    try {
        if (!fs.existsSync(LICENSE_FILE)) return false;
        const lic = JSON.parse(fs.readFileSync(LICENSE_FILE, 'utf8'));
        if (!lic.key || !lic.machineId || !lic.signature) return false;
        if (lic.machineId !== getMachineId()) return false;
        return lic.signature === computeSignature(lic.key, lic.machineId);
    } catch (e) { return false; }
}

// ── Middleware ────────────────────────────────────────────
app.use(express.json({ limit: '200mb' }));
app.use(express.static(__dirname)); // sirve HTML/CSS/JS (desde snapshot en pkg)

// ── API: Licencia ─────────────────────────────────────────
app.get('/api/license', (req, res) => {
    res.json({ valid: isLicenseValid() });
});

app.post('/api/license/activate', (req, res) => {
    try {
        const key = ((req.body && req.body.key) || '').trim().toUpperCase();
        if (!key) return res.json({ ok: false, error: 'Ingrese una clave de licencia' });

        const validKeys = JSON.parse(fs.readFileSync(LICENSES_FILE, 'utf8'));
        if (!validKeys.includes(key)) {
            return res.json({ ok: false, error: 'Clave de licencia inválida' });
        }

        const machineId = getMachineId();
        const signature = computeSignature(key, machineId);
        const licData   = { key, machineId, signature, activatedAt: new Date().toISOString() };
        fs.writeFileSync(LICENSE_FILE, JSON.stringify(licData, null, 2), 'utf8');
        console.log(`Licencia activada: ${key} | Máquina: ${machineId.slice(0, 12)}...`);
        res.json({ ok: true });
    } catch (e) {
        console.error('Error activando licencia:', e.message);
        res.status(500).json({ ok: false, error: 'Error interno del servidor' });
    }
});

// ── API: Datos ─────────────────────────────────────────────
app.get('/api/data', (req, res) => {
    try {
        if (fs.existsSync(DATA_FILE)) {
            res.setHeader('Content-Type', 'application/json');
            res.send(fs.readFileSync(DATA_FILE, 'utf8'));
        } else {
            res.json(null);
        }
    } catch (e) {
        console.error('Error al leer datos:', e.message);
        res.status(500).json({ error: 'Error al leer datos' });
    }
});

app.post('/api/data', (req, res) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 2), 'utf8');
        res.json({ ok: true });
    } catch (e) {
        console.error('Error al guardar datos:', e.message);
        res.status(500).json({ error: 'Error al guardar datos' });
    }
});

app.get('/api/backup', (req, res) => {
    try {
        if (!fs.existsSync(DATA_FILE)) return res.status(404).json({ error: 'No hay datos' });
        const fecha = new Date().toISOString().slice(0, 10);
        res.setHeader('Content-Disposition', `attachment; filename="backup_${fecha}.json"`);
        res.setHeader('Content-Type', 'application/json');
        fs.createReadStream(DATA_FILE).pipe(res);
    } catch (e) {
        res.status(500).json({ error: 'Error generando backup' });
    }
});

// ── Inicio ─────────────────────────────────────────────────
app.listen(PORT, HOST, () => {
    const licensed = isLicenseValid();
    console.log('==========================================');
    console.log('  Sistema de Cotizaciones y Ventas');
    console.log('==========================================');
    console.log(`  URL:       http://localhost:${PORT}`);
    console.log(`  Datos en:  ${DATA_DIR}`);
    console.log(`  Licencia:  ${licensed ? '✓ Válida' : '✗ Pendiente de activación'}`);
    console.log('  Ctrl+C para detener.');
    console.log('==========================================\n');
});

// ==================== SCRIPT DE CONSTRUCCIÓN ====================
// Genera ProformaPC.exe listo para distribución:
//   1. Copia archivos al directorio dist/
//   2. Ofusca todos los archivos JavaScript
//   3. Compila a ejecutable con pkg
//
// Uso:  node build.js
// Resultado: build/ProformaPC.exe  (+ carpeta build/data/ para los datos)

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const OUT  = path.join(ROOT, 'build');

const JS_FILES = [
    'js/local-config.js',
    'js/license-check.js',
    'js/setup.js',
    'js/data.js',
    'js/utils.js',
    'js/auth.js',
    'js/company.js',
    'js/clients.js',
    'js/sellers.js',
    'js/products.js',
    'js/inventory.js',
    'js/gastos.js',
    'js/sales.js',
    'js/quotes.js',
    'js/pdf.js',
    'js/history.js',
    'js/estadisticas.js',
    'js/app.js'
];

// ── 1. Preparar dist/ ────────────────────────────────────
console.log('\n[ 1/4 ] Preparando directorio dist/...');
if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true });
fs.mkdirSync(path.join(DIST, 'js'),  { recursive: true });
fs.mkdirSync(path.join(DIST, 'css'), { recursive: true });
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// Copiar archivos estáticos
['index.html', 'licenses.json', 'server.js'].forEach(f => {
    fs.copyFileSync(path.join(ROOT, f), path.join(DIST, f));
});
fs.readdirSync(path.join(ROOT, 'css')).forEach(f => {
    fs.copyFileSync(path.join(ROOT, 'css', f), path.join(DIST, 'css', f));
});

// package.json para dist/ (solo dependencias de producción + config pkg)
const distPkg = {
    name: 'proformapc',
    version: '1.0.0',
    main: 'server.js',
    pkg: {
        assets: ['index.html', 'css/**/*', 'js/**/*', 'licenses.json'],
        targets: ['node18-win-x64']
    },
    dependencies: {
        express:          '^4.18.2',
        'node-machine-id': '^1.1.12'
    }
};
fs.writeFileSync(path.join(DIST, 'package.json'), JSON.stringify(distPkg, null, 2));

console.log('  ✓ Archivos base copiados');

// ── 2. Ofuscar JavaScript ─────────────────────────────────
console.log('\n[ 2/4 ] Ofuscando JavaScript...');
let obfuscator;
try {
    obfuscator = require('javascript-obfuscator');
} catch (e) {
    console.error('ERROR: javascript-obfuscator no encontrado. Ejecute: npm install');
    process.exit(1);
}

const OBF_OPTIONS = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.5,
    numbersToExpressions: true,
    simplify: true,
    stringArrayShuffle: true,
    splitStrings: true,
    splitStringsChunkLength: 8,
    stringArrayThreshold: 0.75,
    identifierNamesGenerator: 'hexadecimal'
};

JS_FILES.forEach(file => {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const result = obfuscator.obfuscate(src, OBF_OPTIONS);
    fs.writeFileSync(path.join(DIST, file), result.getObfuscatedCode(), 'utf8');
    console.log('  ✓ ' + file);
});

// ── 3. Instalar dependencias en dist/ ─────────────────────
console.log('\n[ 3/4 ] Instalando dependencias de producción en dist/...');
execSync('npm install --production --silent', { cwd: DIST, stdio: 'inherit' });
console.log('  ✓ Dependencias instaladas');

// ── 4. Compilar ejecutable ────────────────────────────────
console.log('\n[ 4/4 ] Compilando ProformaPC.exe (puede tardar 1-2 minutos)...');
const exePath = path.join(OUT, 'ProformaPC.exe');
try {
    execSync(
        `npx pkg dist/server.js --config dist/package.json --output "${exePath}" --targets node18-win-x64`,
        { cwd: ROOT, stdio: 'inherit' }
    );
    console.log('\n==========================================');
    console.log('  ✓ ProformaPC.exe generado exitosamente');
    console.log(`  Ubicación: ${exePath}`);
    console.log('\n  Para distribuir: entregue solo ProformaPC.exe');
    console.log('  Los datos se guardarán en la carpeta data/');
    console.log('  junto al ejecutable en la PC del cliente.');
    console.log('==========================================\n');
} catch (e) {
    console.error('\nERROR compilando. Verifique que pkg esté instalado:');
    console.error('  npm install (en la carpeta del proyecto)');
    process.exit(1);
}

// Limpiar dist/ temporal
fs.rmSync(DIST, { recursive: true });
console.log('  (dist/ temporal eliminado)\n');

#!/usr/bin/env node
/**
 * FitTracker Build Script
 * Prepara los assets para producción.
 * Variables de entorno:
 *   NODE_ENV=production          — activa minificación
 *   PRODUCTION_BACKEND_URL=https://api.midominio.com  — inyecta URL en config.js
 */

const fs   = require('fs');
const path = require('path');

const wwwDir      = path.join(__dirname, '..', 'www');
const isProd      = process.env.NODE_ENV === 'production';
const prodBackend = process.env.PRODUCTION_BACKEND_URL || '';

console.log('[BUILD] FitTracker build iniciado...');
console.log(`[BUILD] Modo: ${isProd ? 'production' : 'development'}`);
if (prodBackend) console.log(`[BUILD] Backend URL: ${prodBackend}`);

// ── 1. Inyectar URL de producción en config.js ──────────────────
if (prodBackend) {
  const configPath = path.join(wwwDir, 'config.js');
  let cfg = fs.readFileSync(configPath, 'utf8');
  cfg = cfg.replace(/'__PRODUCTION_BACKEND_URL__'/, `'${prodBackend}'`);
  fs.writeFileSync(configPath, cfg, 'utf8');
  console.log(`[OK] config.js → PRODUCTION_BACKEND_URL inyectada`);
}

// ── 2. Minificación básica de JS ─────────────────────────────────
const jsFiles = [
  'config.js', 'db.js', 'sync.js', 'api.js', 'sw.js',
  'notifications.js', 'personalization.js', 'streaks.js',
  'assets/ml/vision-service.js',
  'assets/ml/food-detector.js',
  'assets/ml/pose-analyzer.js',
  'assets/ml/progress-tracker.js',
];

jsFiles.forEach(file => {
  const filePath = path.join(wwwDir, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`[WARN] No encontrado: ${file}`);
    return;
  }
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalSize = Buffer.byteLength(content, 'utf8');

    if (isProd) {
      content = content.replace(/\/\*[\s\S]*?\*\//g, '');  // block comments
      content = content.replace(/^\s*\/\/.*$/gm, '');       // line comments
      content = content.replace(/\n\s*\n/g, '\n');          // empty lines
    }

    fs.writeFileSync(filePath, content, 'utf8');
    const newSize = Buffer.byteLength(content, 'utf8');
    const pct     = (((originalSize - newSize) / originalSize) * 100).toFixed(0);
    console.log(`[OK] ${file.padEnd(45)} ${(newSize/1024).toFixed(1)} KB${isProd ? ` (-${pct}%)` : ''}`);
  } catch (err) {
    console.error(`[ERROR] ${file}: ${err.message}`);
  }
});

// ── 3. Verificar archivos críticos ───────────────────────────────
console.log('\n[CHECK] Archivos críticos:');
const critical = [
  'index.html', 'manifest.json', 'config.js',
  'db.js', 'sync.js', 'api.js', 'sw.js',
  'assets/ml/vision-service.js',
];

let allOk = true;
critical.forEach(file => {
  const filePath = path.join(wwwDir, file);
  if (fs.existsSync(filePath)) {
    const kb = (fs.statSync(filePath).size / 1024).toFixed(1);
    console.log(`  ✓ ${file} (${kb} KB)`);
  } else {
    console.error(`  ✗ ${file} — FALTA`);
    allOk = false;
  }
});

if (!allOk) {
  console.error('\n[ERROR] Faltan archivos críticos — build incompleto');
  process.exit(1);
}

console.log('\n[BUILD] ✅ Build completo.');
if (!prodBackend) {
  console.log('[INFO] Para producción:');
  console.log('  PRODUCTION_BACKEND_URL=https://api.tudominio.com NODE_ENV=production npm run build');
  console.log('  Luego: npm run build:android');
}

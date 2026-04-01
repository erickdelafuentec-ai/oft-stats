const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8080;
const DATA_FILE = path.join(__dirname, 'data.json');
const INDEX_FILE = path.join(__dirname, 'index.html');

// ── Utilidades ──────────────────────────────────────────────
function leerDatos() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      return raw ? JSON.parse(raw) : {};
    }
  } catch (e) {
    console.error('Error leyendo datos:', e.message);
  }
  return {};
}

function guardarDatos(datos) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(datos, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error guardando datos:', e.message);
    return false;
  }
}

// ── Middleware ───────────────────────────────────────────────
app.use(express.json({ limit: '5mb' }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Servir archivos (IMPORTANTE)
app.use(express.static(__dirname));

// ── Rutas ────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(INDEX_FILE);
});

// Health (IMPORTANTE PARA EL FRONTEND)
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Obtener datos
app.get('/api/datos', (req, res) => {
  res.json(leerDatos());
});

// Guardar datos
app.post('/api/datos', (req, res) => {
  const datos = req.body || {};
  const ok = guardarDatos(datos);

  if (!ok) {
    return res.status(500).json({ ok: false });
  }

  // WebSocket broadcast
  const msg = JSON.stringify({ tipo: 'actualizacion', datos });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });

  res.json({ ok: true });
});

// ── WebSocket ────────────────────────────────────────────────
wss.on('connection', (ws, req) => {
  console.log('Cliente conectado');

  ws.send(JSON.stringify({
    tipo: 'inicial',
    datos: leerDatos()
  }));

  ws.on('close', () => console.log('Cliente desconectado'));
});

// ── Inicio ───────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
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

// ============================================================
// STORAGE — con respaldo en memoria para Railway (fs efímero)
// ============================================================
let memoriaCache = {};

function leerDatos() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = raw ? JSON.parse(raw) : {};
      memoriaCache = parsed;
      return parsed;
    }
  } catch (e) {
    console.error('Error leyendo datos:', e.message);
  }
  return memoriaCache;
}

function guardarDatos(datos) {
  // Siempre actualizar memoria
  memoriaCache = datos || {};
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(memoriaCache, null, 2), 'utf8');
  } catch (e) {
    // En Railway el FS puede ser de solo lectura en algunos casos
    console.warn('No se pudo guardar en disco (usando memoria):', e.message);
  }
  return true;
}

// ============================================================
// MIDDLEWARES
// ============================================================
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.static(__dirname));

// ============================================================
// RUTAS
// ============================================================
app.get('/', (req, res) => {
  if (!fs.existsSync(INDEX_FILE)) {
    return res.status(500).send('Error: index.html no encontrado');
  }
  res.sendFile(INDEX_FILE);
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'oft-stats-clinico', timestamp: new Date().toISOString() });
});

app.get('/api/datos', (req, res) => {
  res.json(leerDatos());
});

app.post('/api/datos', (req, res) => {
  const datos = req.body || {};
  guardarDatos(datos);

  // Broadcast a todos los clientes WebSocket conectados
  const msg = JSON.stringify({ tipo: 'actualizacion', datos });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try { client.send(msg); } catch (e) {}
    }
  });

  res.json({ ok: true });
});

// ============================================================
// WEBSOCKET
// ============================================================
wss.on('connection', (ws) => {
  console.log('Cliente WebSocket conectado');

  // Enviar datos actuales al conectarse
  try {
    ws.send(JSON.stringify({ tipo: 'inicial', datos: leerDatos() }));
  } catch (e) {}

  ws.on('close', () => console.log('Cliente desconectado'));
  ws.on('error', () => {});
});

// ============================================================
// INICIO
// ============================================================
// Cargar datos al iniciar para poblar memoriaCache
leerDatos();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`OFT-STATS servidor corriendo en puerto ${PORT}`);
});

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// ── Utilidades de datos ──────────────────────────────────────
function leerDatos() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {}
  return {};
}

function guardarDatos(datos) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(datos), 'utf8');
  } catch (e) {
    console.error('Error guardando datos:', e.message);
  }
}

// ── Middleware ───────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// CORS permisivo para la red local
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── API REST ─────────────────────────────────────────────────
// Obtener todos los datos
app.get('/api/datos', (req, res) => {
  res.json(leerDatos());
});

// Guardar todos los datos (reemplaza completo)
app.post('/api/datos', (req, res) => {
  const datos = req.body;
  guardarDatos(datos);
  // Broadcast a todos los clientes WebSocket conectados
  const msg = JSON.stringify({ tipo: 'actualizacion', datos });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
  res.json({ ok: true });
});

// Health check para Railway
app.get('/health', (req, res) => res.json({ status: 'ok', clientes: wss.clients.size }));

// ── WebSocket ────────────────────────────────────────────────
wss.on('connection', (ws, req) => {
  console.log('Cliente conectado:', req.socket.remoteAddress);
  // Enviar datos actuales al nuevo cliente
  ws.send(JSON.stringify({ tipo: 'inicial', datos: leerDatos() }));

  ws.on('close', () => console.log('Cliente desconectado'));
  ws.on('error', (err) => console.error('WS error:', err.message));
});

// ── Inicio ───────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`✅ OFT-STATS Server corriendo en puerto ${PORT}`);
});

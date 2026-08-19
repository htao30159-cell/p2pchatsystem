const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { 
    origin: '*', 
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3000;
const connections = new Map();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ok',
    connectedPeers: connections.size,
    timestamp: Date.now()
  });
});

// WebSocket
io.on('connection', (socket) => {
  const peerId = socket.id;
  connections.set(peerId, { id: peerId, connectedAt: Date.now() });

  console.log(`✅ Peer connected: ${peerId} (Total: ${connections.size})`);

  // Broadcast to all clients
  io.emit('peer-connected', {
    peerId: peerId,
    totalPeers: connections.size
  });

  // Direct messaging
  socket.on('send-message', (data) => {
    if (connections.has(data.to)) {
      io.to(data.to).emit('receive-message', {
        from: data.from,
        content: data.content,
        timestamp: data.timestamp || Date.now()
      });
      console.log(`💬 Message: ${data.from} → ${data.to}`);
    }
  });

  socket.on('disconnect', () => {
    connections.delete(peerId);
    console.log(`❌ Peer disconnected: ${peerId} (Total: ${connections.size})`);
    io.emit('peer-disconnected', {
      peerId: peerId,
      totalPeers: connections.size
    });
  });

  socket.on('error', (err) => {
    console.error(`Socket error: ${err}`);
  });
});

// Start server
server.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🌐 P2P Chat System Running');
  console.log('='.repeat(50));
  console.log(`✅ http://localhost:${PORT}`);
  console.log(`📡 WS: ws://localhost:${PORT}`);
  console.log('='.repeat(50) + '\n');
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close();
  process.exit(0);
});

module.exports = server;

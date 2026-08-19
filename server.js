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
  transports: ['websocket', 'polling'],
  serveClient: true
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

app.get('/test', (req, res) => {
  res.send('Server is running!');
});

app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ok',
    server: 'running',
    connectedPeers: connections.size,
    timestamp: Date.now()
  });
});

// WebSocket Events
io.on('connection', (socket) => {
  const peerId = socket.id;
  connections.set(peerId, { id: peerId, connectedAt: Date.now() });

  console.log(`✅ [CONNECT] Peer ${peerId} connected (Total: ${connections.size})`);

  // Send connection confirmation
  socket.emit('connection-success', {
    peerId: peerId,
    message: 'Connected to server'
  });

  // Broadcast new connection to all
  io.emit('peer-connected', {
    peerId: peerId,
    totalPeers: connections.size
  });

  // Handle direct messages
  socket.on('send-message', (data) => {
    console.log(`💬 [MESSAGE] From: ${data.from}, To: ${data.to}`);
    if (connections.has(data.to)) {
      io.to(data.to).emit('receive-message', {
        from: data.from,
        content: data.content,
        timestamp: data.timestamp || Date.now()
      });
    } else {
      socket.emit('error', { message: 'Peer not found' });
    }
  });

  socket.on('disconnect', () => {
    connections.delete(peerId);
    console.log(`❌ [DISCONNECT] Peer ${peerId} disconnected (Total: ${connections.size})`);
    io.emit('peer-disconnected', {
      peerId: peerId,
      totalPeers: connections.size
    });
  });

  socket.on('error', (error) => {
    console.error(`❌ [ERROR] ${error}`);
  });
});

// Error handling
server.on('error', (err) => {
  console.error('Server error:', err);
});

// Start server
server.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🌐 P2P Chat System - Server Started');
  console.log('='.repeat(60));
  console.log(`✅ HTTP:  http://localhost:${PORT}`);
  console.log(`📡 WS:    ws://localhost:${PORT}`);
  console.log(`🔧 Test:  http://localhost:${PORT}/test`);
  console.log(`📊 Status: http://localhost:${PORT}/api/status`);
  console.log('='.repeat(60) + '\n');
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = server;

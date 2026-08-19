const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { 
    origin: '*', 
    methods: ['GET', 'POST'],
    transports: ['websocket', 'polling']
  }
});

const PORT = process.env.PORT || 3000;

// Store active connections
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

// WebSocket connection handling
io.on('connection', (socket) => {
  const peerId = socket.id;
  connections.set(peerId, {
    id: peerId,
    connectedAt: Date.now(),
    socket: socket
  });

  console.log(`✅ Peer connected: ${peerId}`);
  console.log(`📊 Total connected: ${connections.size}`);

  // Notify all clients of new connection
  io.emit('peer-connected', {
    peerId: peerId,
    totalPeers: connections.size
  });

  // Handle direct messages
  socket.on('send-message', (data) => {
    const { to, from, content, timestamp } = data;
    
    if (connections.has(to)) {
      io.to(to).emit('receive-message', {
        from,
        content,
        timestamp: timestamp || Date.now()
      });
      console.log(`💬 Message: ${from} → ${to}`);
    } else {
      socket.emit('error', { message: 'Peer not found' });
    }
  });

  // Handle broadcast messages
  socket.on('broadcast-message', (data) => {
    socket.broadcast.emit('receive-message', {
      from: data.from,
      content: data.content,
      timestamp: data.timestamp || Date.now()
    });
    console.log(`📢 Broadcast from ${data.from}`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    connections.delete(peerId);
    console.log(`❌ Peer disconnected: ${peerId}`);
    console.log(`📊 Total connected: ${connections.size}`);
    
    io.emit('peer-disconnected', {
      peerId: peerId,
      totalPeers: connections.size
    });
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error(`❌ Socket error from ${peerId}:`, error);
  });
});

// Start server
server.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🌐 P2P Chat System - Server Running');
  console.log('='.repeat(60));
  console.log(`✅ Access at: http://localhost:${PORT}`);
  console.log(`📡 WebSocket: ws://localhost:${PORT}`);
  console.log(`📊 API Status: http://localhost:${PORT}/api/status`);
  console.log('='.repeat(60) + '\n');
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {\n    console.error(`❌ Port ${PORT} is already in use!`);\n    console.error('Try a different port: PORT=4000 npm start');\n  } else {\n    console.error('Server error:', err);\n  }\n  process.exit(1);\n});

process.on('SIGTERM', () => {\n  console.log('🛑 Server shutting down...');\n  server.close(() => {\n    console.log('✅ Server closed');\n    process.exit(0);\n  });\n});

module.exports = server;

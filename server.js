const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 3000;

// Store active peers and their connection info
const peers = new Map();
const rooms = new Map();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// REST API for peer discovery
app.get('/api/peers', (req, res) => {
  const peerList = Array.from(peers.values()).map(peer => ({
    id: peer.id,
    address: peer.address,
    port: peer.port,
    publicKey: peer.publicKey,
    timestamp: peer.timestamp
  }));
  res.json({ peers: peerList, count: peerList.length });
});

app.post('/api/register', (req, res) => {
  const { address, port, publicKey } = req.body;
  
  if (!address || !port) {
    return res.status(400).json({ error: 'Missing address or port' });
  }

  const peerId = uuidv4();
  const peerInfo = {
    id: peerId,
    address,
    port,
    publicKey: publicKey || null,
    timestamp: Date.now(),
    clientIp: req.ip
  };

  peers.set(peerId, peerInfo);

  // Auto-cleanup after 5 minutes of inactivity
  setTimeout(() => {
    if (peers.has(peerId)) {
      peers.delete(peerId);
      console.log(`Peer ${peerId} expired`);
    }
  }, 300000);

  console.log(`✅ Peer registered: ${peerId} at ${address}:${port}`);
  res.json({ 
    id: peerId, 
    message: 'Peer registered successfully',
    peers: Array.from(peers.values()).map(p => ({
      id: p.id,
      address: p.address,
      port: p.port
    }))
  });
});

app.post('/api/unregister', (req, res) => {
  const { peerId } = req.body;
  
  if (!peerId) {
    return res.status(400).json({ error: 'Missing peerId' });
  }

  if (peers.has(peerId)) {
    peers.delete(peerId);
    console.log(`✅ Peer unregistered: ${peerId}`);
    res.json({ message: 'Peer unregistered successfully' });
  } else {
    res.status(404).json({ error: 'Peer not found' });
  }
});

// WebSocket for real-time signaling and messaging
io.on('connection', (socket) => {
  console.log(`🔗 Client connected: ${socket.id}`);

  // Join a room for group messaging
  socket.on('join-room', (roomId, peerId, callback) => {
    socket.join(roomId);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, []);
    }
    
    const roomPeers = rooms.get(roomId);
    roomPeers.push({ peerId, socketId: socket.id });
    rooms.set(roomId, roomPeers);

    console.log(`👤 Peer ${peerId} joined room ${roomId}`);
    
    // Notify others in the room
    socket.to(roomId).emit('peer-joined', {
      peerId,
      socketId: socket.id,
      roomPeers: roomPeers.map(p => p.peerId)
    });

    if (callback) {
      callback({
        success: true,
        roomPeers: roomPeers.map(p => p.peerId)
      });
    }
  });

  // Signal exchange for WebRTC connections
  socket.on('signal', (data) => {
    const { to, signal } = data;
    io.to(to).emit('signal', {
      from: socket.id,
      signal
    });
  });

  // Direct peer-to-peer messaging
  socket.on('message', (data) => {
    const { to, from, content } = data;
    io.to(to).emit('message', {
      from,
      content,
      timestamp: Date.now()
    });
    console.log(`💬 Message from ${from} to ${to.substring(0, 8)}...`);
  });

  // Broadcast to room
  socket.on('room-message', (data) => {
    const { roomId, peerId, content } = data;
    socket.to(roomId).emit('room-message', {
      peerId,
      content,
      timestamp: Date.now()
    });
    console.log(`📢 Room message from ${peerId} in ${roomId}`);
  });

  // Heartbeat to keep peer alive
  socket.on('heartbeat', (peerId) => {
    if (peers.has(peerId)) {
      const peerInfo = peers.get(peerId);
      peerInfo.timestamp = Date.now();
      peers.set(peerId, peerInfo);
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
    
    // Remove from rooms
    for (const [roomId, roomPeers] of rooms.entries()) {
      const filtered = roomPeers.filter(p => p.socketId !== socket.id);
      if (filtered.length === 0) {
        rooms.delete(roomId);
        console.log(`🚪 Room deleted: ${roomId}`);
      } else {
        rooms.set(roomId, filtered);
        socket.to(roomId).emit('peer-left', { socketId: socket.id });
      }
    }
  });
});

server.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🌐 P2P Chat System - Signaling Server');
  console.log('='.repeat(50));
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket: ws://localhost:${PORT}`);
  console.log(`📋 API: http://localhost:${PORT}/api/peers`);
  console.log('='.repeat(50) + '\n');
});

module.exports = app;

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
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const peers = {};

io.on('connection', (socket) => {
  console.log('✅ Connected:', socket.id);
  peers[socket.id] = socket;

  // Tell client their ID
  socket.emit('your-id', socket.id);

  // Tell all clients about this new connection
  io.emit('peers-update', Object.keys(peers));

  socket.on('message', (msg) => {
    console.log('Message:', msg);
    if (peers[msg.to]) {
      peers[msg.to].emit('message', {
        from: socket.id,
        text: msg.text
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Disconnected:', socket.id);
    delete peers[socket.id];
    io.emit('peers-update', Object.keys(peers));
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

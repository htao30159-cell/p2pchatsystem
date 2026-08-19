# P2P Chat System - Modern UI

A sleek, modern peer-to-peer chat application with a beautiful web interface. Real-time messaging between peers using WebSockets and signaling server.

## 🎨 Features

- **Modern UI** - Gradient design with glassmorphism effects
- **Real-time Chat** - Instant message delivery between peers
- **Peer Discovery** - Automatic peer detection and connection
- **Direct Messaging** - Send messages to specific peers
- **Group Chat** - Room-based messaging for multiple peers
- **Responsive Design** - Works on desktop and mobile
- **Status Indicators** - Real-time connection status
- **Message History** - Chat history per peer
- **Beautiful Animations** - Smooth transitions and effects

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Start Server

```bash
npm start
```

Server runs on `http://localhost:3000`

### Access Chat Interface

Open your browser and navigate to:
```
http://localhost:3000
```

## 📱 User Interface

### Sidebar
- **Peer ID** - Your unique identifier
- **Connect to Peer** - Manual peer connection
- **Discover** - Find available peers
- **Online Peers** - List of connected peers
- **Status Indicator** - Connection status

### Chat Area
- **Chat Header** - Shows selected peer
- **Message Display** - All messages with timestamps
- **Message Input** - Send messages with Enter or button
- **Empty State** - Friendly prompts when no chat selected

## 🔌 How to Use

### 1. Start the Server
```bash
npm start
```

### 2. Open Multiple Browser Windows
Open `http://localhost:3000` in different browser tabs/windows to simulate multiple clients.

### 3. Connect Peers
- Each tab gets a unique Peer ID
- Click "Connect" to manually connect peers, or
- Click "Discover" to find available peers

### 4. Select a Peer and Chat
- Click on a peer in the sidebar
- Type your message and press Enter or click Send
- Messages appear in real-time

## 🎯 API Endpoints

### GET `/api/peers`
Get all registered peers

```bash
curl http://localhost:3000/api/peers
```

### POST `/api/register`
Register a new peer

```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "address": "192.168.1.100",
    "port": 5000
  }'
```

### POST `/api/unregister`
Unregister a peer

```bash
curl -X POST http://localhost:3000/api/unregister \
  -H "Content-Type: application/json" \
  -d '{"peerId": "uuid"}'
```

## 🔌 WebSocket Events

### Server → Client

**peer-joined**
```javascript
{ peerId, socketId, roomPeers }
```

**message**
```javascript
{ from, content, timestamp }
```

**room-message**
```javascript
{ peerId, content, timestamp }
```

**signal**
```javascript
{ from, signal }
```

**peer-left**
```javascript
{ socketId }
```

### Client → Server

**join-room**
```javascript
socket.emit('join-room', roomId, peerId, callback)
```

**message**
```javascript
socket.emit('message', { to, from, content })
```

**room-message**
```javascript
socket.emit('room-message', { roomId, peerId, content })
```

**signal**
```javascript
socket.emit('signal', { to, signal })
```

## 🎨 Design Features

- **Gradient Backgrounds** - Modern purple gradient
- **Glassmorphism** - Frosted glass effect cards
- **Smooth Animations** - Slide-in messages, hover effects
- **Responsive Layout** - Adapts to all screen sizes
- **Status Indicators** - Color-coded connection status
- **Dark Mode Ready** - Can be extended with theme support

## 📊 Color Scheme

- **Primary**: `#667eea` (Blue-Purple)
- **Secondary**: `#764ba2` (Purple)
- **Success**: `#4ade80` (Green)
- **Error**: `#ef4444` (Red)
- **Background**: Gradient + Transparent overlays

## 🔒 Security Notes

For production deployment, consider:
- [ ] Enable HTTPS/WSS encryption
- [ ] Implement message signing
- [ ] Add user authentication
- [ ] Rate limiting
- [ ] Input validation
- [ ] End-to-end encryption

## 📦 Dependencies

```json
{
  "express": "^4.18.2",
  "socket.io": "^4.5.4",
  "uuid": "^9.0.0"
}
```

## 🚀 Deployment

### Local Network

1. Find your machine's IP:
```bash
# macOS/Linux
ifconfig | grep "inet "

# Windows
ipconfig
```

2. Access from another device:
```
http://<your-ip>:3000
```

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t p2p-chat .
docker run -p 3000:3000 p2p-chat
```

## 📝 Example Workflow

1. **Terminal 1**: Start server
   ```bash
   npm start
   ```

2. **Browser Tab 1**: Open `http://localhost:3000` (Peer A)
3. **Browser Tab 2**: Open `http://localhost:3000` (Peer B)

4. **In Peer B**: 
   - Note Peer A's ID
   - Click "Discover" to see peers

5. **In Peer A**:
   - See Peer B in the list
   - Click Peer B to start chat

6. **Chat**: Send messages back and forth!

## 🎯 Future Enhancements

- [ ] File sharing
- [ ] Voice/Video calls (WebRTC)
- [ ] End-to-end encryption (libsodium.js)
- [ ] Message persistence (IndexedDB)
- [ ] User profiles and avatars
- [ ] Emoji reactions
- [ ] Message search
- [ ] Dark mode toggle
- [ ] Read receipts
- [ ] Typing indicators

## 📄 License

MIT

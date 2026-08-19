const net = require('net');
const dgram = require('dgram');
const EventEmitter = require('events');
const crypto = require('crypto');

/**
 * P2P Chat Peer Node
 * Handles direct peer-to-peer connections using TCP and UDP
 */
class P2PPeer extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.peerId = options.peerId || crypto.randomBytes(16).toString('hex');
    this.address = options.address || 'localhost';
    this.tcpPort = options.tcpPort || 5000;
    this.udpPort = options.udpPort || 5001;
    this.signalServer = options.signalServer || 'http://localhost:3000';
    
    this.connections = new Map(); // peerId -> socket
    this.tcpServer = null;
    this.udpServer = null;
    this.messageQueue = [];
    
    console.log(`🧑 Peer initialized: ${this.peerId}`);
  }

  /**
   * Start TCP server for reliable message delivery
   */
  startTcpServer() {
    return new Promise((resolve, reject) => {
      this.tcpServer = net.createServer((socket) => {
        const remoteAddr = `${socket.remoteAddress}:${socket.remotePort}`;
        console.log(`📨 TCP connection from ${remoteAddr}`);

        socket.on('data', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message, socket);
          } catch (e) {
            console.error('Failed to parse message:', e.message);
          }
        });

        socket.on('error', (err) => {
          console.error(`TCP error from ${remoteAddr}:`, err.message);
          this.emit('error', err);
        });

        socket.on('end', () => {
          console.log(`TCP connection closed: ${remoteAddr}`);
        });
      });

      this.tcpServer.listen(this.tcpPort, this.address, () => {
        console.log(`✅ TCP Server listening on ${this.address}:${this.tcpPort}`);
        resolve();
      });

      this.tcpServer.on('error', reject);
    });
  }

  /**
   * Start UDP server for low-latency messaging
   */
  startUdpServer() {
    return new Promise((resolve, reject) => {
      this.udpServer = dgram.createSocket('udp4');

      this.udpServer.on('message', (buffer, rinfo) => {
        try {
          const message = JSON.parse(buffer.toString());
          console.log(`📡 UDP message from ${rinfo.address}:${rinfo.port}:`, message.type);
          this.handleMessage(message, null, rinfo);
        } catch (e) {
          console.error('Failed to parse UDP message:', e.message);
        }
      });

      this.udpServer.on('error', reject);

      this.udpServer.bind(this.udpPort, this.address, () => {
        console.log(`✅ UDP Server listening on ${this.address}:${this.udpPort}`);
        resolve();
      });
    });
  }

  /**
   * Connect to another peer via TCP
   */
  connectToPeer(peerId, address, port) {
    return new Promise((resolve, reject) => {
      if (this.connections.has(peerId)) {
        return resolve(this.connections.get(peerId));
      }

      const socket = net.createConnection(port, address, () => {
        console.log(`🔗 Connected to peer ${peerId} at ${address}:${port}`);
        this.connections.set(peerId, socket);

        socket.on('data', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message, socket);
          } catch (e) {
            console.error('Failed to parse peer message:', e.message);
          }
        });

        socket.on('error', (err) => {
          console.error(`Connection error with ${peerId}:`, err.message);
          this.connections.delete(peerId);
          reject(err);
        });

        socket.on('end', () => {
          console.log(`Connection closed with peer ${peerId}`);
          this.connections.delete(peerId);
        });

        resolve(socket);
      });

      socket.on('error', reject);
    });
  }

  /**
   * Send message to a peer via TCP
   */
  async sendToPeer(peerId, message) {
    try {
      const payload = JSON.stringify({
        from: this.peerId,
        type: message.type || 'message',
        content: message.content || message,
        timestamp: Date.now()
      });

      let socket = this.connections.get(peerId);
      
      if (!socket) {
        console.warn(`No connection to ${peerId}, queuing message`);
        this.messageQueue.push({ peerId, message });
        return false;
      }

      socket.write(payload);
      console.log(`📤 Sent message to ${peerId}`);
      return true;
    } catch (error) {
      console.error(`Failed to send message to ${peerId}:`, error.message);
      return false;
    }
  }

  /**
   * Broadcast message to all connected peers
   */
  broadcast(message) {
    let sentCount = 0;
    for (const [peerId] of this.connections) {
      if (this.sendToPeer(peerId, message)) {
        sentCount++;
      }
    }
    console.log(`📢 Broadcasted to ${sentCount} peers`);
    return sentCount;
  }

  /**
   * Send message via UDP (connectionless, low-latency)
   */
  sendViaUdp(address, port, message) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        from: this.peerId,
        type: message.type || 'message',
        content: message.content || message,
        timestamp: Date.now()
      });

      this.udpServer.send(payload, 0, payload.length, port, address, (err) => {
        if (err) {
          console.error(`UDP send error:`, err.message);
          reject(err);
        } else {
          console.log(`📡 Sent UDP message to ${address}:${port}`);
          resolve();
        }
      });
    });
  }

  /**
   * Handle incoming messages
   */
  handleMessage(message, socket, rinfo) {
    console.log(`📩 Message from ${message.from}:`, message.type);
    
    this.emit('message', {
      from: message.from,
      type: message.type,
      content: message.content,
      timestamp: message.timestamp
    });
  }

  /**
   * Get list of connected peers
   */
  getConnectedPeers() {
    return Array.from(this.connections.keys());
  }

  /**
   * Close all connections and servers
   */
  async shutdown() {
    console.log('🛑 Shutting down peer...');
    
    for (const [peerId, socket] of this.connections) {
      socket.destroy();
      this.connections.delete(peerId);
    }

    if (this.tcpServer) {
      this.tcpServer.close();
    }

    if (this.udpServer) {
      this.udpServer.close();
    }

    console.log('✅ Peer shutdown complete');
  }

  /**
   * Register with signal server
   */
  async registerWithServer() {
    try {
      const response = await fetch(`${this.signalServer}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: this.address,
          port: this.tcpPort,
          publicKey: crypto.randomBytes(32).toString('hex')
        })
      });

      const data = await response.json();
      console.log(`✅ Registered with signal server: ${data.id}`);
      return data;
    } catch (error) {
      console.error('Failed to register with signal server:', error.message);
    }
  }

  /**
   * Get peer list from signal server
   */
  async getPeerList() {
    try {
      const response = await fetch(`${this.signalServer}/api/peers`);
      const data = await response.json();
      console.log(`📋 Discovered ${data.count} peers`);
      return data.peers;
    } catch (error) {
      console.error('Failed to get peer list:', error.message);
      return [];
    }
  }
}

module.exports = P2PPeer;

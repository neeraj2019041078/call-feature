const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

io.on('connection', socket => {
  console.log(`🔌 User connected: ${socket.id}`);

  socket.on('join', roomId => {
    socket.join(roomId);
    console.log(`📥 User ${socket.id} joined room: ${roomId}`);
    socket.to(roomId).emit('user-joined', socket.id);
  });

  socket.on('call-request', ({ roomId }) => {
    console.log(`📞 Call request from ${socket.id} to room ${roomId}`);
    socket.to(roomId).emit('incoming-call', { from: socket.id });
  });

  socket.on('call-accepted', ({ roomId }) => {
    console.log(`✅ Call accepted in room ${roomId}`);
    socket.to(roomId).emit('call-accepted');
  });

  socket.on('offer', ({ offer, roomId }) => {
    socket.to(roomId).emit('offer', { offer });
  });

  socket.on('answer', ({ answer, roomId }) => {
    socket.to(roomId).emit('answer', { answer });
  });

  socket.on('ice-candidate', ({ candidate, roomId }) => {
    socket.to(roomId).emit('ice-candidate', { candidate });
  });

  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

server.listen(3001, () => {
  console.log('🚀 Socket.IO signaling server running on port 3001');
});

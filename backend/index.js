const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const users = {}; // roomId => { [socket.id]: userType }

io.on('connection', socket => {
  console.log(`🔌 Connected: ${socket.id}`);

  socket.on('join', ({ roomId, userType }) => {
    socket.join(roomId);
    users[socket.id] = { roomId, userType };
    console.log(`📥 ${userType} joined ${roomId}`);
  });

  socket.on('start-call', ({ roomId, from }) => {
    console.log(`📞 Call initiated from ${from} in room ${roomId}`);
    socket.to(roomId).emit('incoming-call', { from });
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
    console.log(`❌ Disconnected: ${socket.id}`);
    delete users[socket.id];
  });
});

server.listen(3001, () => {
  console.log('🚀 Server running on port 3001');
});

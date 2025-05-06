const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();

// Enable CORS for your frontend (Netlify app)
app.use(cors({
  origin: ['https://snazzy-peony-5b17e4.netlify.app'], // Your Netlify app URL
  methods: ['GET', 'POST']
}));

const server = http.createServer(app);

// Initialize Socket.IO server
const io = new Server(server, {
  cors: {
    origin: '*', // Allowing all for development
    methods: ['GET', 'POST']
  }
});

io.on('connection', socket => {
  console.log(`🔌 User connected: ${socket.id}`);

  // Join a room
  socket.on('join', roomId => {
    socket.join(roomId);
    console.log(`📥 User ${socket.id} joined room: ${roomId}`);
    socket.to(roomId).emit('user-joined', socket.id);  // Notify others in the room
  });

  // Handle the offer sent by admin (for peer connection setup)
  socket.on('offer', ({ offer, roomId }) => {
    console.log(`📡 Offer from ${socket.id} to room ${roomId}`);
    socket.to(roomId).emit('offer', { offer }); // Send offer to room
  });

  // Handle the answer from guest
  socket.on('answer', ({ answer, roomId }) => {
    console.log(`📡 Answer from ${socket.id} to room ${roomId}`);
    socket.to(roomId).emit('answer', { answer }); // Send answer to admin
  });

  // Handle ICE candidates (network details for peer connection)
  socket.on('ice-candidate', ({ candidate, roomId }) => {
    console.log(`📡 ICE candidate from ${socket.id} to room ${roomId}`);
    socket.to(roomId).emit('ice-candidate', { candidate }); // Send ICE candidate to room
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

// Start the server on port 3001
server.listen(3001, () => {
  console.log('🚀 Socket.IO signaling server running on port 3001');
});

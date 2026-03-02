const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Routes
const authRoute = require('./routes/auth');
const tasksRoute = require('./routes/tasks');
const meetingsRoute = require('./routes/meetings');
const chatRoute = require('./routes/chat');
const messageRoute = require('./routes/messages');
const userRoute = require('./routes/users');

dotenv.config();

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
  process.exit(1);
});


const app = express();
const allowedOrigins = (origin, callback) => {
  // 1. Allow mobile apps & local dev (curl, etc.)
  if (!origin) return callback(null, true);

  // 2. Allow local environments
  const isLocal = origin.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/);

  // 3. Allow specified Production URL from ENV
  const isProd = process.env.CLIENT_URL && origin === process.env.CLIENT_URL;

  // 4. Fallback for common deployment subdomains (safety during setup)
  const isCommonHost = origin.includes('.vercel.app') ||
    origin.includes('.render.com') ||
    origin.includes('.netlify.app');

  if (isLocal || isProd || isCommonHost) {
    return callback(null, true);
  }

  callback(new Error('Not allowed by CORS'));
};

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Middleware
app.use(cors({
  origin: allowedOrigins,
  exposedHeaders: ['auth-token'],
}));
app.use(express.json());

// Simple Logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Main Routes
app.use('/api/auth', authRoute);
app.use('/api/tasks', tasksRoute);
app.use('/api/meetings', meetingsRoute);
app.use('/api/chats', chatRoute);
app.use('/api/messages', messageRoute);
const resourceRoute = require('./routes/resources');

// ... existing routes ...
app.use('/api/users', userRoute);
app.use('/api/resources', resourceRoute);
app.use('/uploads', express.static('uploads'));

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/connected-desk', {
  serverSelectionTimeoutMS: 5000
})
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Track state
const onlineUsers = new Map(); // socketId -> userId
const whiteboardStates = new Map(); // room -> array of actions

// Socket.io
io.on('connection', (socket) => {
  console.log('Connected to socket.io');

  socket.on('setup', (userData) => {
    if (!userData || !userData._id) return;
    socket.join(userData._id.toString());
    onlineUsers.set(socket.id, userData._id.toString());
    io.emit('online_users', Array.from(new Set(onlineUsers.values())));
    console.log("User joined user room:", userData._id);
    socket.emit('connected');
  });

  socket.on('join_chat', (room) => {
    socket.join(room);
    console.log('User joined room: ' + room);
  });

  socket.on('new_message', (newMessageRecieved) => {
    var chat = newMessageRecieved.chatId;

    if (!chat.users) return console.log('chat.users not defined');

    chat.users.forEach(user => {
      if (user._id == newMessageRecieved.sender._id) return;
      socket.in(user._id).emit('message_received', newMessageRecieved);
    });
  });

  // Broadcast message edit to all chat room members
  socket.on('message_edited', (data) => {
    // data: { chatId, message }
    socket.to(data.chatId).emit('message_edited', data.message);
  });

  // Broadcast message delete to all chat room members
  socket.on('message_deleted', (data) => {
    // data: { chatId, messageId }
    socket.to(data.chatId).emit('message_deleted', data.messageId);
  });

  // Broadcast pin toggle to all chat room members
  socket.on('message_pinned', (data) => {
    // data: { chatId, message }
    socket.to(data.chatId).emit('message_pinned', data.message);
  });

  socket.on('mark_as_read', (data) => {
    // data: { chatId, user, userIds }
    // Broadcast to the chat room for real-time seen indicators
    socket.to(data.chatId).emit('mark_as_read', data);

    // Also broadcast to each user's personal room to update their Dashboards/Sidebars
    if (data.userIds) {
      data.userIds.forEach(uid => {
        socket.in(uid).emit('mark_as_read', data);
      });
    }
  });

  socket.on("typing", (data) => {
    // data can be a room string (old) or { room, username }
    const room = typeof data === 'string' ? data : data.room;
    const username = typeof data === 'object' ? data.username : '';
    socket.in(room).emit("typing", { username });
  });
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  // --- Video Call Signaling ---
  socket.on("call_user", (data) => {
    // data: { userToCall: userId, signalData: signal, from: senderId, name: senderName }
    io.to(data.userToCall).emit("call_user", {
      signal: data.signalData,
      from: data.from,
      name: data.name
    });
  });

  socket.on("answer_call", (data) => {
    // data: { to: callerId, signal: signalData }
    io.to(data.to).emit("call_accepted", data.signal);
  });

  socket.on("end_call", (data) => {
    io.to(data.to).emit("end_call");
  });

  // --- Whiteboard Collaboration ---
  socket.on('join-whiteboard', (room) => {
    socket.join(room);
    console.log(`User joined whiteboard room: ${room}`);
    // Send existing history to the new joiner
    if (whiteboardStates.has(room)) {
      socket.emit('whiteboard-history', whiteboardStates.get(room));
    }
  });

  socket.on('draw-line', (data) => {
    const { room } = data;
    if (room) {
      if (!whiteboardStates.has(room)) {
        whiteboardStates.set(room, []);
      }
      whiteboardStates.get(room).push(data);
      // Optional: Limit history to prevent memory bloat (e.g., 3000 segments)
      if (whiteboardStates.get(room).length > 3000) {
        whiteboardStates.get(room).shift();
      }
    }
    // Broadcast to everyone in the room except sender
    socket.to(room).emit('draw-line', data);
  });

  socket.on('clear-board', (data) => {
    if (data.room) {
      whiteboardStates.set(data.room, []);
    }
    socket.to(data.room).emit('clear-board');
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    io.emit('online_users', Array.from(new Set(onlineUsers.values())));
    console.log('User disconnected:', socket.id);
  });
});

app.get('/', (req, res) => {
  res.send('Connected Desk API is running');
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

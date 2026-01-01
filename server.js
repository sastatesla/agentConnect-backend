const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);
const onlineUsers = new Map(); // userId -> socketId

// Validate Environment Variables
if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined.");
  process.exit(1);
}
if (!process.env.MONGO_URI) {
  console.error("FATAL ERROR: MONGO_URI is not defined.");
  process.exit(1);
}

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || '*', // Determine in .env
    methods: ["GET", "POST"]
  },
});

// Security Middleware
app.use(helmet());

// Performance Middleware
app.use(compression());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
});
app.use(limiter);

// Logging
app.use(morgan('combined')); // Standard Apache combined log output

app.use(cors({
  origin: process.env.CLIENT_URL || '*', // Determine in .env
}));
app.use(express.json());

// Remove old global logger in favor of Morgan
// app.use((req, res, next) => { ... });

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/chats', require('./routes/chatRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

// Serve static files from 'uploads' directory
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Basic Route
app.get('/', (req, res) => {
  res.send('API is running');
});

const Chat = require('./models/Chat');
const Notification = require('./models/Notification');
const Post = require('./models/Post');

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);


  // Setup user room for notifications
  socket.on('setup', (userData) => {
    if (userData?._id) {
      const userId = userData._id.toString();
      socket.join(userId);
      onlineUsers.set(userId, socket.id);
      io.emit('user_online', userId);
      io.emit('online_users', Array.from(onlineUsers.keys()));
      console.log(`User ${userId} joined their personal room`);
      socket.emit('connected');
    }
  });

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('send_message', async (data) => {
    // data: { chatId, senderId, content, participants (if new chat), postId }
    try {
      const { chatId, senderId, content, participants, postId, media, location } = data;
      console.log('Socket send_message received:', { chatId, senderId, hasContent: !!content, postId, hasMedia: !!media, hasLocation: !!location });

      let chat;

      let postDetails = null;
      if (postId) {
        try {
          postDetails = await Post.findById(postId).populate('author', 'name photoUrl isBroker');
        } catch (e) { console.error("Post fetch error", e); }
      }

      if (chatId) {
        chat = await Chat.findById(chatId).populate('participants');
        if (chat) {
          chat.messages.push({ sender: senderId, content, post: postId, media, location });
          chat.lastMessageAt = Date.now();
          await chat.save();
        }
      } else if (participants) {
        // Create new chat
        chat = await Chat.create({
          participants,
          messages: [{ sender: senderId, content, post: postId, media, location }]
        });
        chat = await Chat.findById(chat._id).populate('participants');
      }

      if (chat) {
        const roomId = chat._id.toString();
        socket.join(roomId);

        const newMessage = {
          _id: chat.messages[chat.messages.length - 1]._id,
          sender: senderId,
          content,
          post: postDetails,
          media,
          location,
          createdAt: new Date(),
          chatId: chat._id
        };

        // Emit to the chat room
        io.to(roomId).emit('receive_message', newMessage);

        // Create Notifications for other participants
        chat.participants.forEach(async (participant) => {
          if (participant._id.toString() === senderId) return;

          // Create Notification in DB
          const notif = await Notification.create({
            recipient: participant._id,
            sender: senderId,
            recipient: participant._id,
            sender: senderId,
            type: 'message',
            content: content ? `New message: ${content.substring(0, 30)}...` : (media ? 'Sent a file' : 'Shared location'),
            relatedId: chat._id,
            onModel: 'Chat'
          });

          // Populate sender for realtime data
          await notif.populate('sender', 'name photoUrl');

          // Emit to recipient's personal room
          io.to(participant._id.toString()).emit('new_notification', notif);
        });
      }

      socket.on('mark_read', ({ chatId, readerId }) => {
        // Notify room that messages were read
        io.to(chatId).emit('messages_read', { chatId, readerId });
      });

      socket.on('typing', ({ chatId, senderId }) => {
        socket.to(chatId).emit('user_typing', { chatId, senderId });
      });

      socket.on('stop_typing', ({ chatId, senderId }) => {
        socket.to(chatId).emit('user_stop_typing', { chatId, senderId });
      });

    } catch (err) {
      console.error('Socket Error:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Remove user from onlineUsers
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        io.emit('user_offline', userId);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log(`MongoDB Connected: ${process.env.MONGO_URI}`))
  .catch(err => console.log('MongoDB Connection Error:', err));

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

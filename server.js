const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const morgan = require('morgan');
const { rateLimit } = require('express-rate-limit');
const mongoose = require('mongoose');
const config = require('./src/config');
const { initSocket } = require('./src/services/socketService');
const { errorMiddleware } = require('./src/middleware/errorMiddleware');
const path = require('path');

const app = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);

// Basic Environment Validation is now handled in config/index.js

// Initialize Socket.io
const io = initSocket(httpServer);

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
  origin: config.clientUrl,
}));
app.use(express.json());

// Remove old global logger in favor of Morgan
// app.use((req, res, next) => { ... });

// Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/posts', require('./src/routes/postRoutes'));
app.use('/api/chats', require('./src/routes/chatRoutes'));
app.use('/api/upload', require('./src/routes/uploadRoutes'));
app.use('/api/notifications', require('./src/routes/notificationRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));

// Serve static files from 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Basic Route
app.get('/', (req, res) => {
  res.send('API is running');
});


// Connect to MongoDB
mongoose.connect(config.mongoUri)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB Connection Error:', err));

// Global Error Handler
app.use(errorMiddleware);

const PORT = config.port;

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running in ${config.env} mode on port ${PORT}`);
});

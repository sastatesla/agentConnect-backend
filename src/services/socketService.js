const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');
const Chat = require('../models/Chat');
const Notification = require('../models/Notification');
const Post = require('../models/Post');
const User = require('../models/User');

const onlineUsers = new Map(); // userId -> socketId

const initSocket = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: config.clientUrl,
            methods: ["GET", "POST"]
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    // Authentication Middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.token;
            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            const decoded = jwt.verify(token, config.jwtSecret);
            const user = await User.findById(decoded.id).select('-password');
            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }

            socket.user = user;
            next();
        } catch (err) {
            console.error('Socket Auth Error:', err.message);
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.user._id.toString();
        console.log(`User connected: ${socket.id} (User: ${userId})`);

        // Automatically join personal room on connection
        socket.join(userId);
        onlineUsers.set(userId, socket.id);

        // Broadcast online status
        io.emit('user_online', userId);
        io.emit('online_users', Array.from(onlineUsers.keys()));

        socket.on('join_room', (roomId) => {
            socket.join(roomId);
            console.log(`User ${userId} joined room ${roomId}`);
        });

        socket.on('send_message', async (data) => {
            try {
                const { chatId, content, participants, postId, media, location } = data;
                const senderId = socket.user._id;

                let chat;
                let postDetails = null;

                if (postId) {
                    try {
                        postDetails = await Post.findById(postId).populate('author', 'name photoUrl isBroker');
                    } catch (e) {
                        console.error("Post fetch error", e);
                    }
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

                    io.to(roomId).emit('receive_message', newMessage);

                    // Create Notifications
                    chat.participants.forEach(async (participant) => {
                        const pId = participant._id.toString();
                        if (pId === senderId.toString()) return;

                        const notif = await Notification.create({
                            recipient: participant._id,
                            sender: senderId,
                            type: 'message',
                            content: content ? content.substring(0, 50) + (content.length > 50 ? '...' : '') : (media ? 'Sent a file' : 'Shared location'),
                            relatedId: chat._id,
                            onModel: 'Chat'
                        });

                        await notif.populate('sender', 'name photoUrl');
                        io.to(pId).emit('new_notification', notif);
                    });
                }
            } catch (err) {
                console.error('Socket send_message error:', err);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        socket.on('mark_read', ({ chatId, readerId }) => {
            io.to(chatId).emit('messages_read', { chatId, readerId });
        });

        socket.on('typing', ({ chatId }) => {
            socket.to(chatId).emit('user_typing', { chatId, senderId: userId });
        });

        socket.on('stop_typing', ({ chatId }) => {
            socket.to(chatId).emit('user_stop_typing', { chatId, senderId: userId });
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            onlineUsers.delete(userId);
            io.emit('user_offline', userId);
            io.emit('online_users', Array.from(onlineUsers.keys()));
        });
    });

    return io;
};

module.exports = { initSocket, onlineUsers };

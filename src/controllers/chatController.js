const Chat = require('../models/Chat');
const User = require('../models/User');
const Post = require('../models/Post');
const { successResponse } = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { catchAsync } = require('../middleware/errorMiddleware');

// @desc    Get user chats
// @route   GET /api/chats
// @access  Private
const getChats = catchAsync(async (req, res) => {
    const chats = await Chat.find({
        participants: { $in: [req.user.id] }
    })
        .populate('participants', 'name photoUrl isOnline lastSeen')
        .sort({ lastMessageAt: -1 })
        .lean();

    const chatsWithDetails = chats.map(chat => {
        const messages = chat.messages || [];
        const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        const unreadCount = messages.filter(m => m.sender.toString() !== req.user.id && !m.read).length;

        return {
            ...chat,
            messages: undefined,
            latestMessage,
            unreadCount
        };
    });

    successResponse(res, chatsWithDetails, 'Chats fetched successfully');
});

// @desc    Mark chat messages as read
// @route   PUT /api/chats/:id/read
// @access  Private
const markChatRead = catchAsync(async (req, res) => {
    const chat = await Chat.findById(req.params.id);
    if (!chat) throw new ApiError('Chat not found', 404);

    let updated = false;
    chat.messages.forEach(msg => {
        if (msg.sender.toString() !== req.user.id && !msg.read) {
            msg.read = true;
            updated = true;
        }
    });

    if (updated) {
        await chat.save();
    }

    successResponse(res, { updated }, 'Chat marked as read');
});

// @desc    Get messages for a specific chat
// @route   GET /api/chats/:id
// @access  Private
const getChatMessages = catchAsync(async (req, res) => {
    const chat = await Chat.findById(req.params.id)
        .populate('participants', 'name photoUrl')
        .populate({
            path: 'messages.post',
            populate: { path: 'author', select: 'name photoUrl isBroker' }
        });

    if (!chat) throw new ApiError('Chat not found', 404);

    if (!chat.participants.some(p => p._id.toString() === req.user.id)) {
        throw new ApiError('Not authorized', 401);
    }

    successResponse(res, chat, 'Messages fetched successfully');
});

// @desc    Initiate a chat (or return existing)
// @route   POST /api/chats/initiate
// @access  Private
const initiateChat = catchAsync(async (req, res) => {
    const { participantId } = req.body;

    if (!participantId) {
        throw new ApiError('Participant ID required', 400);
    }

    let chat = await Chat.findOne({
        participants: { $all: [req.user.id, participantId] }
    }).populate('participants', 'name email photoUrl isOnline lastSeen isBroker');

    if (chat) {
        return successResponse(res, chat, 'Existing chat found');
    }

    const newChat = await Chat.create({
        participants: [req.user._id, participantId],
        messages: []
    });

    const fullChat = await Chat.findOne({ _id: newChat._id }).populate('participants', 'name email photoUrl isOnline lastSeen isBroker');

    successResponse(res, fullChat, 'Chat initiated successfully', 201);
});

module.exports = {
    getChats,
    getChatMessages,
    initiateChat,
    markChatRead
};

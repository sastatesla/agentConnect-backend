const Chat = require('../models/Chat');
const User = require('../models/User');
const Post = require('../models/Post');

// @desc    Get user chats
// @route   GET /api/chats
// @access  Private
const getChats = async (req, res) => {
    try {
        const chats = await Chat.find({
            participants: { $in: [req.user.id] }
        })
            .populate('participants', 'name photoUrl isOnline lastSeen')
            .sort({ lastMessageAt: -1 })
            .lean();

        const chatsWithDetails = chats.map(chat => {
            const messages = chat.messages || [];
            const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;

            // Count unread messages where sender is NOT current user
            const unreadCount = messages.filter(m => m.sender.toString() !== req.user.id && !m.read).length;

            return {
                ...chat,
                messages: undefined, // Don't send all messages in list view
                latestMessage,
                unreadCount
            };
        });

        res.status(200).json(chatsWithDetails);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Mark chat messages as read
// @route   PUT /api/chats/:id/read
// @access  Private
const markChatRead = async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        // Update all messages sent by OTHERS to read
        // Since messages are embedded, we iterate
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

        res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get messages for a specific chat
// @route   GET /api/chats/:id
// @access  Private
const getChatMessages = async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id)
            .populate('participants', 'name photoUrl')
            .populate({
                path: 'messages.post',
                populate: { path: 'author', select: 'name photoUrl isBroker' }
            });

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        // Ensure user is participant
        if (!chat.participants.some(p => p._id.toString() === req.user.id)) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        res.status(200).json(chat);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
}

// @desc    Initiate a chat (or return existing)
// @route   POST /api/chats/initiate
// @access  Private
const initiateChat = async (req, res) => {
    try {
        const { participantId } = req.body;

        if (!participantId) {
            return res.status(400).json({ message: 'Participant ID required' });
        }

        // Check if chat exists
        let chat = await Chat.findOne({
            participants: { $all: [req.user.id, participantId] }
        }).populate('participants', 'name email photoUrl isOnline lastSeen isBroker'); // Populate existing chat too

        if (chat) {
            return res.status(200).json(chat);
        }

        const newChat = await Chat.create({
            participants: [req.user._id, participantId],
            messages: []
        });

        const fullChat = await Chat.findOne({ _id: newChat._id }).populate('participants', 'name email photoUrl isOnline lastSeen isBroker');

        res.status(201).json(fullChat);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
}

module.exports = {
    getChats,
    getChatMessages,
    initiateChat,
    markChatRead
};

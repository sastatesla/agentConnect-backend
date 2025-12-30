const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    media: [{
        url: String,
        type: { type: String, enum: ['image', 'video'] }
    }],
    location: {
        lat: Number,
        lng: Number,
        address: String
    },
    read: { type: Boolean, default: false }
}, { timestamps: true });

const chatSchema = new mongoose.Schema({
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    messages: [messageSchema],
    lastMessageAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);

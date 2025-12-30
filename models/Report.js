const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    target: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    reason: {
        type: String,
        enum: ['closed', 'spam', 'fake', 'duplicate', 'other'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
        default: 'pending'
    },
    adminNotes: { type: String }
}, { timestamps: true });

// Prevent duplicate reports from same user for same post (optional, but good practice)
reportSchema.index({ reporter: 1, target: 1 }, { unique: true });

module.exports = mongoose.model('Report', reportSchema);

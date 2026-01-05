const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    serviceType: {
        type: String,
        required: true,
        enum: ['business_inquiry', 'partnership', 'career', 'book_shoot']
    },
    details: {
        type: Map,
        of: String
    },
    status: {
        type: String,
        enum: ['pending', 'contacted', 'in_progress', 'completed', 'cancelled'],
        default: 'pending'
    },
    notes: String, // Admin notes for internal tracking
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);

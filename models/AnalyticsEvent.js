const mongoose = require('mongoose');

const analyticsEventSchema = new mongoose.Schema({
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional: User who performed the action
    eventType: {
        type: String,
        enum: ['view', 'save', 'share', 'interest_shown', 'call_click', 'message_click'],
        required: true
    },
    metadata: {
        source: String,    // utm_source
        medium: String,    // utm_medium
        campaign: String,  // utm_campaign
        platform: String,  // 'mobile', 'web'
        userAgent: String
    }
}, { timestamps: true });

// Time-series indexing support
analyticsEventSchema.index({ postId: 1, eventType: 1, createdAt: -1 });

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);

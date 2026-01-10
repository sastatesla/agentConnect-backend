const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    title: { type: String, required: true, index: 'text' },
    body: { type: String, required: true, index: 'text' }, // Store HTML/Rich Text
    type: { type: String, required: true }, // e.g., Residential, Commercial
    location: { type: String, required: true }, // City/State
    price: { type: Number }, // Price in default currency (INR)
    priceUnit: {
        type: String,
        enum: ['per_unit', 'per_sqft', 'per_yard', 'per_bigha', 'per_acre', 'per_month', 'per_year'],
        default: 'per_unit'
    },
    tags: [{ type: String }], // Search tags
    images: [{ type: String }], // Array of image URLs
    links: [{ title: String, url: String }], // External links
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    views: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'draft', 'sold', 'rented', 'archived'], default: 'active' },
    boostScore: { type: Number, default: 0, index: -1 }, // Higher score = higher rank
    coordinates: { // For pinning location on map
        lat: { type: Number },
        lng: { type: Number }
    },
    // Interaction Counters for fast analytics
    shareCount: { type: Number, default: 0 },
    interestCount: { type: Number, default: 0 },
    saveCount: { type: Number, default: 0 },
    connectCount: { type: Number, default: 0 },
}, { timestamps: true });

// Compound index for filtering
postSchema.index({ location: 1, type: 1 });

module.exports = mongoose.model('Post', postSchema);

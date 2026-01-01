const mongoose = require('mongoose');

const citySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, index: true },
    count: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('City', citySchema);

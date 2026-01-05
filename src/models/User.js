const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    photoUrl: { type: String, default: '' },
    isBroker: { type: Boolean, default: false },
    licenseNumber: { type: String, default: '' },
    userType: {
        type: String,
        enum: ['Seller', 'Buyer', 'Broker', 'Lender', 'User'],
        default: 'User'
    },
    bio: { type: String, default: '' },
    phone: { type: String, default: '' },
    location: { type: String, default: '' }, // Location Served
    dealsIn: { type: String, default: '' }, // e.g. "Residential, Commercial"
    socialLinks: {
        instagram: { type: String, default: '' },
        linkedin: { type: String, default: '' },
        facebook: { type: String, default: '' },
        twitter: { type: String, default: '' },
    },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

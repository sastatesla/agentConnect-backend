const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    phone: { type: String, required: true },
    otp: { type: String, required: true },
    isUsed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, index: { expires: '5m' } } // Expires in 5 minutes
});

module.exports = mongoose.model('OTP', otpSchema);

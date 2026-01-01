const User = require('../models/User');
const OTP = require('../models/OTP');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendWhatsAppOTP } = require('../services/whatsappService');
const { generateSecureOTP, normalizePhone } = require('../utils/otpUtils');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, email, password, isBroker, licenseNumber } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please add all fields' });
        }

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            isBroker,
            licenseNumber: isBroker ? licenseNumber : '',
        });

        if (user) {
            res.status(201).json({
                user: {
                    _id: user.id,
                    name: user.name,
                    email: user.email,
                    isBroker: user.isBroker,
                },
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    console.log("Backend: loginUser called with body:", req.body);
    try {
        const { email, password } = req.body;

        // Check for user email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (await bcrypt.compare(password, user.password)) {
            res.json({
                user: {
                    _id: user.id,
                    name: user.name,
                    email: user.email,
                    isBroker: user.isBroker,
                },
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private (To be implemented with middleware)
const getMe = async (req, res) => {
    // Placeholder for now
    res.status(200).json({ message: 'User data display' });
};

// @desc    Send OTP to phone
// @route   POST /api/auth/phone/send-otp
// @access  Public
const sendPhoneOTP = async (req, res) => {
    try {
        const phone = normalizePhone(req.body.phone);
        if (!phone) {
            return res.status(400).json({ message: 'Please provide a phone number' });
        }

        // Generate secure 6-digit OTP
        const otp = generateSecureOTP();

        // Save OTP to DB (upsert and reset isUsed to false)
        await OTP.findOneAndUpdate(
            { phone },
            { otp, isUsed: false, createdAt: new Date() },
            { upsert: true, new: true }
        );

        // Send via WhatsApp
        const sent = await sendWhatsAppOTP(phone, 'User', otp);

        if (sent) {
            res.status(200).json({ message: 'OTP sent successfully' });
        } else {
            res.status(500).json({ message: 'Failed to send OTP via WhatsApp' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Verify OTP and login/register
// @route   POST /api/auth/phone/verify-otp
// @access  Public
const verifyPhoneOTP = async (req, res) => {
    try {
        const phone = normalizePhone(req.body.phone);
        const { otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({ message: 'Please provide phone and OTP' });
        }

        // Check OTP (must match and NOT be used)
        const otpRecord = await OTP.findOne({ phone, otp, isUsed: false });
        if (!otpRecord) {
            return res.status(400).json({ message: 'Invalid, expired, or already used OTP' });
        }

        // Mark as used immediately for one-time use safety
        otpRecord.isUsed = true;
        await otpRecord.save();

        // Find or create user
        let user = await User.findOne({ phone });

        if (!user) {
            // Create user with placeholder name and dummy password (since phone is primary)
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(Math.random().toString(36), salt);

            user = await User.create({
                name: `User_${phone.slice(-4)}`,
                email: `${phone}@placeholder.com`, // Email is required in model
                password: hashedPassword,
                phone: phone,
            });
        }

        res.json({
            user: {
                _id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                isBroker: user.isBroker,
            },
            token: generateToken(user._id),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getMe,
    sendPhoneOTP,
    verifyPhoneOTP,
};

const User = require('../models/User');
const OTP = require('../models/OTP');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { successResponse } = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { catchAsync } = require('../middleware/errorMiddleware');
const { sendWhatsAppOTP } = require('../services/whatsappService');
const { generateSecureOTP, normalizePhone } = require('../utils/otpUtils');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = catchAsync(async (req, res) => {
    const { name, email, password, isBroker, licenseNumber } = req.body;

    if (!name || !email || !password) {
        throw new ApiError('Please add all fields', 400);
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
        throw new ApiError('User already exists', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
        name,
        email,
        password: hashedPassword,
        isBroker,
        licenseNumber: isBroker ? licenseNumber : '',
    });

    if (user) {
        successResponse(res, {
            user: { _id: user.id, name: user.name, email: user.email, isBroker: user.isBroker },
            token: generateToken(user._id)
        }, 'User registered successfully', 201);
    } else {
        throw new ApiError('Invalid user data', 400);
    }
});

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = catchAsync(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError('User not found', 404);
    }

    if (await bcrypt.compare(password, user.password)) {
        successResponse(res, {
            user: { _id: user.id, name: user.name, email: user.email, isBroker: user.isBroker },
            token: generateToken(user._id)
        }, 'Login successful');
    } else {
        throw new ApiError('Invalid credentials', 400);
    }
});

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
const sendPhoneOTP = catchAsync(async (req, res) => {
    const phone = normalizePhone(req.body.phone);
    if (!phone) {
        throw new ApiError('Please provide a phone number', 400);
    }

    const otp = generateSecureOTP();

    await OTP.findOneAndUpdate(
        { phone },
        { otp, isUsed: false, createdAt: new Date() },
        { upsert: true, new: true }
    );

    const sent = await sendWhatsAppOTP(phone, 'User', otp);
    if (sent) {
        successResponse(res, null, 'OTP sent successfully');
    } else {
        throw new ApiError('Failed to send OTP via WhatsApp', 500);
    }
});

// @desc    Verify OTP and login/register
// @route   POST /api/auth/phone/verify-otp
// @access  Public
const verifyPhoneOTP = catchAsync(async (req, res) => {
    const phone = normalizePhone(req.body.phone);
    const { otp } = req.body;

    if (!phone || !otp) {
        throw new ApiError('Please provide phone and OTP', 400);
    }

    const otpRecord = await OTP.findOne({ phone, otp, isUsed: false });
    if (!otpRecord) {
        throw new ApiError('Invalid, expired, or already used OTP', 400);
    }

    otpRecord.isUsed = true;
    await otpRecord.save();

    let user = await User.findOne({ phone });
    if (!user) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(Math.random().toString(36), salt);

        user = await User.create({
            name: `User_${phone.slice(-4)}`,
            email: `${phone}@placeholder.com`,
            password: hashedPassword,
            phone: phone,
        });
    }

    successResponse(res, {
        user: { _id: user.id, name: user.name, email: user.email, phone: user.phone, isBroker: user.isBroker },
        token: generateToken(user._id)
    }, 'OTP verified successfully');
});

module.exports = {
    registerUser,
    loginUser,
    getMe,
    sendPhoneOTP,
    verifyPhoneOTP,
};

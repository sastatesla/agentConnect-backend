const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, sendPhoneOTP, verifyPhoneOTP } = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', getMe);
router.post('/phone/send-otp', sendPhoneOTP);
router.post('/phone/verify-otp', verifyPhoneOTP);

module.exports = router;

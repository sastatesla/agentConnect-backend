const express = require('express');
const router = express.Router();
const { getUserProfile, updateUserProfile, getUserAnalytics, getPublicProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);
router.get('/analytics', protect, getUserAnalytics);
router.get('/:id/public', getPublicProfile);

module.exports = router;

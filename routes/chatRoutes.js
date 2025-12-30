const express = require('express');
const router = express.Router();
const { getChats, getChatMessages, initiateChat, markChatRead } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // All chat routes need auth

router.route('/').get(getChats);
router.route('/initiate').post(initiateChat);
router.route('/:id').get(getChatMessages);
router.route('/:id/read').put(markChatRead);

module.exports = router;

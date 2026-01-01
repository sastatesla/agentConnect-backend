const express = require('express');
const router = express.Router();
const {
    getPosts,
    createPost,
    getPost,
    toggleSavePost,
    incrementPostView,
    searchLocation,
    updatePostStatus,
    boostPost,
    reportPost,
    updatePost,
    getCities,
    trackInteraction
} = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(getPosts).post(protect, createPost);
router.get('/cities/top', getCities);
router.get('/location/search', searchLocation);
router.post('/:id/track', trackInteraction);
router.route('/:id').get(getPost).put(protect, updatePost);
router.route('/:id/save').put(protect, toggleSavePost);
router.route('/:id/view').put(incrementPostView);
router.route('/:id/status').put(protect, updatePostStatus);
router.route('/:id/boost').post(protect, boostPost);
router.route('/:id/report').post(protect, reportPost);

module.exports = router;

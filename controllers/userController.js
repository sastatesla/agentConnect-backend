const User = require('../models/User');
const Post = require('../models/Post');

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.name = req.body.name || user.name;
        user.bio = req.body.bio || user.bio;
        user.phone = req.body.phone || user.phone;
        user.location = req.body.location || user.location;
        user.dealsIn = req.body.dealsIn || user.dealsIn;
        if (req.body.photoUrl) user.photoUrl = req.body.photoUrl;
        if (req.body.licenseNumber) user.licenseNumber = req.body.licenseNumber;

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            isBroker: updatedUser.isBroker,
            photoUrl: updatedUser.photoUrl,
            bio: updatedUser.bio,
            phone: updatedUser.phone,
            location: updatedUser.location,
            dealsIn: updatedUser.dealsIn,
            licenseNumber: updatedUser.licenseNumber,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get user analytics
// @route   GET /api/users/analytics
// @access  Private
const getUserAnalytics = async (req, res) => {
    try {
        const userId = req.user.id;

        // Count posts by type and status
        const totalListed = await Post.countDocuments({ author: userId });
        const totalSold = await Post.countDocuments({ author: userId, status: 'sold' });
        const totalRented = await Post.countDocuments({ author: userId, status: 'rented' });

        // Count by Type logic - Case insensitive or exact? Assuming exact based on CreatePost
        // Usually Types are "Residential", "Commercial", "Land", "Industrial"
        const residential = await Post.countDocuments({
            author: userId,
            type: { $regex: 'Residential', $options: 'i' }
        });
        const commercial = await Post.countDocuments({
            author: userId,
            type: { $regex: 'Commercial', $options: 'i' }
        });

        res.json({
            totalListed,
            totalSold,
            totalRented,
            residential,
            commercial
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get public user profile by ID
// @route   GET /api/users/:id/public
// @access  Public
const getPublicProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error(error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getUserProfile,
    updateUserProfile,
    getUserAnalytics,
    getPublicProfile
};

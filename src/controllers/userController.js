const User = require('../models/User');
const Post = require('../models/Post');
const { successResponse } = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { catchAsync } = require('../middleware/errorMiddleware');
const { normalizePhone } = require('../utils/otpUtils');

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = catchAsync(async (req, res) => {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) throw new ApiError('User not found', 404);
    successResponse(res, user, 'Profile fetched successfully');
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = catchAsync(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) throw new ApiError('User not found', 404);

    user.name = req.body.name || user.name;
    user.bio = req.body.bio || user.bio;
    user.phone = req.body.phone ? normalizePhone(req.body.phone) : user.phone;
    user.location = req.body.location || user.location;
    user.dealsIn = req.body.dealsIn || user.dealsIn;
    if (req.body.photoUrl) user.photoUrl = req.body.photoUrl;
    if (req.body.licenseNumber) user.licenseNumber = req.body.licenseNumber;

    const updatedUser = await user.save();

    successResponse(res, {
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
    }, 'Profile updated successfully');
});

// @desc    Get user analytics
// @route   GET /api/users/analytics
// @access  Private
const getUserAnalytics = catchAsync(async (req, res) => {
    const userId = req.user.id;

    // Use aggregation for DRYness/efficiency
    const stats = await Post.aggregate([
        { $match: { author: userId } },
        {
            $group: {
                _id: null,
                totalListed: { $sum: 1 },
                totalSold: { $sum: { $cond: [{ $eq: ["$status", "sold"] }, 1, 0] } },
                totalRented: { $sum: { $cond: [{ $eq: ["$status", "rented"] }, 1, 0] } },
                residential: { $sum: { $cond: [{ $regexMatch: { input: "$type", regex: "Residential", options: "i" } }, 1, 0] } },
                commercial: { $sum: { $cond: [{ $regexMatch: { input: "$type", regex: "Commercial", options: "i" } }, 1, 0] } }
            }
        }
    ]);

    const result = stats[0] || {
        totalListed: 0,
        totalSold: 0,
        totalRented: 0,
        residential: 0,
        commercial: 0
    };

    successResponse(res, result, 'Analytics fetched successfully');
});

// @desc    Get public user profile by ID
// @route   GET /api/users/:id/public
// @access  Public
const getPublicProfile = catchAsync(async (req, res) => {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) throw new ApiError('User not found', 404);
    successResponse(res, user, 'Public profile fetched successfully');
});

module.exports = {
    getUserProfile,
    updateUserProfile,
    getUserAnalytics,
    getPublicProfile
};

const Notification = require('../models/Notification');
const { successResponse } = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { catchAsync } = require('../middleware/errorMiddleware');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = catchAsync(async (req, res) => {
    const notifications = await Notification.find({ recipient: req.user.id })
        .sort({ createdAt: -1 })
        .populate('sender', 'name photoUrl')
        .limit(20);

    successResponse(res, notifications, 'Notifications fetched successfully');
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = catchAsync(async (req, res) => {
    const notification = await Notification.findById(req.params.id);

    if (!notification) throw new ApiError('Notification not found', 404);

    if (notification.recipient.toString() !== req.user.id) {
        throw new ApiError('Not authorized', 401);
    }

    notification.isRead = true;
    await notification.save();

    successResponse(res, notification, 'Notification marked as read');
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = catchAsync(async (req, res) => {
    await Notification.updateMany(
        { recipient: req.user.id, isRead: false },
        { $set: { isRead: true } }
    );
    successResponse(res, null, 'All notifications marked as read');
});

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead
};

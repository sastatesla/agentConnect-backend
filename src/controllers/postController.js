const mongoose = require('mongoose');
const Post = require('../models/Post');
const Report = require('../models/Report');
const City = require('../models/City');
const { successResponse } = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { catchAsync } = require('../middleware/errorMiddleware');
const QueryHelper = require('../utils/queryHelper');

// @desc    Get all posts
// @route   GET /api/posts
// @access  Public
const getPosts = catchAsync(async (req, res) => {
    const { location, type, search, author, savedBy, page = 1, limit = 10, status, intent, category } = req.query;

    // Build initial match query
    let matchQuery = {};

    if (status && status !== 'all') {
        matchQuery.status = status;
    } else if (!status) {
        matchQuery.status = 'active';
    }

    if (location) {
        matchQuery.location = { $regex: location, $options: 'i' };
    }

    // Type Filtering (Intent & Category)
    if (intent && category) {
        matchQuery.type = `${intent} - ${category}`;
    } else if (intent) {
        matchQuery.type = { $regex: `^${intent}`, $options: 'i' };
    } else if (category) {
        matchQuery.type = { $regex: `${category}$`, $options: 'i' };
    } else if (type && type !== 'All') {
        matchQuery.type = type; // Legacy support or direct type match
    }
    if (author) {
        matchQuery.author = new mongoose.Types.ObjectId(author);
    }
    if (savedBy) {
        matchQuery.savedBy = { $in: [new mongoose.Types.ObjectId(savedBy)] };
    }

    const fieldsToSearch = ['title', 'body', 'tags', 'location', 'type'];

    // Build pipeline using QueryHelper
    const pipeline = QueryHelper.build([{ $match: matchQuery }])
        .addStage(QueryHelper.search(search, fieldsToSearch)[0])
        .get();

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Get total count (for original query without pagination)
    const totalMatch = await Post.aggregate([...pipeline, { $count: 'total' }]);
    const total = totalMatch.length > 0 ? totalMatch[0].total : 0;

    // Add sort and pagination
    pipeline.push(...QueryHelper.sort('boostScore', 'desc'));
    pipeline.push(...QueryHelper.sort('createdAt', 'desc'));
    pipeline.push(...QueryHelper.paginate(pageNum, limitNum));

    const posts = await Post.aggregate(pipeline);

    // Populate after aggregation
    await Post.populate(posts, {
        path: 'author',
        select: 'name photoUrl isBroker licenseNumber'
    });

    successResponse(res, {
        posts,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        total
    }, 'Posts fetched successfully');
});

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
const createPost = catchAsync(async (req, res) => {
    const { title, body, type, location, images, price, links, tags, city } = req.body;

    if (!title || !body || !type || !location) {
        throw new ApiError('Please add all fields', 400);
    }

    const post = await Post.create({
        title,
        body,
        type,
        location,
        price: price || 0,
        images: images || [],
        links: links || [],
        tags: tags || [],
        author: req.user.id,
        city: city
    });

    if (city || location) {
        const cityName = city || location.split(',')[0].trim();
        if (cityName) {
            await City.findOneAndUpdate(
                { name: cityName },
                { $inc: { count: 1 }, $set: { lastActive: new Date() } },
                { upsert: true, new: true }
            );
        }
    }

    successResponse(res, post, 'Post created successfully', 201);
});

// @desc    Update a post
// @route   PUT /api/posts/:id
// @access  Private
const updatePost = catchAsync(async (req, res) => {
    const post = await Post.findById(req.params.id);

    if (!post) {
        throw new ApiError('Post not found', 404);
    }

    if (post.author.toString() !== req.user.id) {
        throw new ApiError('Not authorized', 401);
    }

    const { title, body, type, location, price, priceUnit, images, links, tags } = req.body;

    post.title = title || post.title;
    post.body = body || post.body;
    post.type = type || post.type;
    post.location = location || post.location;
    post.price = price !== undefined ? price : post.price;
    post.priceUnit = priceUnit || post.priceUnit;
    post.images = images || post.images;
    post.links = links || post.links;
    post.tags = tags || post.tags;

    const updatedPost = await post.save();
    successResponse(res, updatedPost, 'Post updated successfully');
});

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Public
const getPost = catchAsync(async (req, res) => {
    const post = await Post.findById(req.params.id).populate(
        'author',
        'name photoUrl isBroker licenseNumber'
    );

    if (!post) {
        throw new ApiError('Post not found', 404);
    }

    successResponse(res, post, 'Post fetched successfully');
});

// @desc    Toggle save post
// @route   PUT /api/posts/:id/save
// @access  Private
const toggleSavePost = catchAsync(async (req, res) => {
    const post = await Post.findById(req.params.id);

    if (!post) {
        throw new ApiError('Post not found', 404);
    }

    if (!req.user) {
        throw new ApiError('User not found', 401);
    }

    const index = post.savedBy.indexOf(req.user.id);
    const isSaved = index === -1;

    if (isSaved) {
        post.savedBy.push(req.user.id);
    } else {
        post.savedBy.splice(index, 1);
    }

    await post.save();
    successResponse(res, { isSaved }, isSaved ? 'Post saved' : 'Post unsaved');
});

// @desc    Increment post views
// @route   PUT /api/posts/:id/view
// @access  Public
const incrementPostView = catchAsync(async (req, res) => {
    const post = await Post.findByIdAndUpdate(
        req.params.id,
        { $inc: { views: 1 } },
        { new: true }
    );
    if (!post) {
        throw new ApiError('Post not found', 404);
    }
    successResponse(res, post, 'View incremented');
});

// @desc    Search location (Proxy for Nominatim)
// @route   GET /api/posts/location/search
// @access  Public
const searchLocation = catchAsync(async (req, res) => {
    const { q } = req.query;
    if (!q) throw new ApiError('Query required', 400);

    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`, {
        headers: {
            'User-Agent': 'AgentConnect-StudentProject/1.0'
        }
    });

    if (!response.ok) throw new ApiError('Failed to fetch location data', 500);

    const data = await response.json();
    successResponse(res, data, 'Location results fetched');
});

// @desc    Update post status (Owner only)
// @route   PUT /api/posts/:id/status
// @access  Private
const updatePostStatus = catchAsync(async (req, res) => {
    const { status } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
        throw new ApiError('Post not found', 404);
    }

    if (post.author.toString() !== req.user.id) {
        throw new ApiError('Not authorized', 401);
    }

    post.status = status;
    await post.save();
    successResponse(res, post, `Post status updated to ${status}`);
});

// @desc    Boost a post
// @route   POST /api/posts/:id/boost
// @access  Private
const boostPost = catchAsync(async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) {
        throw new ApiError('Post not found', 404);
    }

    if (post.author.toString() !== req.user.id) {
        throw new ApiError('Not authorized', 401);
    }

    post.boostScore = (post.boostScore || 0) + 10;
    await post.save();
    successResponse(res, { boostScore: post.boostScore }, 'Post boosted successfully');
});



// @desc    Report a post
// @route   POST /api/posts/:id/report
// @access  Private
const reportPost = catchAsync(async (req, res) => {
    const { reason } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
        throw new ApiError('Post not found', 404);
    }

    const existingReport = await Report.findOne({
        reporter: req.user.id,
        target: req.params.id
    });

    if (existingReport) {
        throw new ApiError('You have already reported this post', 400);
    }

    await Report.create({
        reporter: req.user.id,
        target: req.params.id,
        reason
    });

    successResponse(res, null, 'Report submitted successfully', 201);
});

// @desc    Get top cities
// @route   GET /api/posts/cities/top
// @access  Public
const getCities = catchAsync(async (req, res) => {
    const cities = await City.find().sort({ count: -1 }).limit(20);
    successResponse(res, cities, 'Top cities fetched');
});

// @desc    Track post interaction
// @route   POST /api/posts/:id/track
// @access  Public
const trackInteraction = catchAsync(async (req, res) => {
    const { type } = req.body;
    const update = {};

    if (type === 'view') update.$inc = { views: 1 };
    else if (type === 'share') update.$inc = { shareCount: 1 };
    else if (type === 'connect') update.$inc = { connectCount: 1 };
    else if (type === 'save') update.$inc = { saveCount: 1 };
    else throw new ApiError('Invalid interaction type', 400);

    const post = await Post.findByIdAndUpdate(req.params.id, update, { new: true });

    if (!post) throw new ApiError('Post not found', 404);

    successResponse(res, {
        stats: {
            views: post.views,
            shares: post.shareCount,
            connects: post.connectCount,
            saves: post.saveCount
        }
    }, 'Interaction tracked successfully');
});

module.exports = {
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
};

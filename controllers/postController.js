const Post = require('../models/Post');
const Report = require('../models/Report');
const City = require('../models/City');

// @desc    Get all posts
// @route   GET /api/posts
// @access  Public (or Private?) - Let's make it Public for viewing
const getPosts = async (req, res) => {
    try {
        const { location, type, search, author, savedBy, page = 1, limit = 10, status } = req.query;
        let query = {};

        // Default to active posts only, unless specific status requested or viewing own/saved lists where custom status logic might apply
        // Use status query param to override
        if (status) {
            if (status !== 'all') query.status = status;
        } else {
            // Default behavior for Feed: Only show active
            // If just fetching by author (public profile), also active usually.
            // If savedBy is used, maybe we want to see them even if sold? 
            // The prompt asks for FeedScreen specifically. 
            // Let's safe-filter to 'active' by default.
            query.status = 'active';
        }

        if (location) {
            query.location = { $regex: location, $options: 'i' };
        }
        if (type && type !== 'All') {
            query.type = type;
        }
        if (search) {
            // Escape special characters to prevent regex errors
            const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedSearch, 'i');
            query.$or = [
                { title: regex },
                { body: regex },
                { tags: regex },
                { location: regex },
                { type: regex }
            ];
        }
        if (author) {
            query.author = author;
        }
        if (savedBy) {
            query.savedBy = { $in: [savedBy] };
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const total = await Post.countDocuments(query);
        const posts = await Post.find(query)
            .populate('author', 'name photoUrl isBroker licenseNumber')
            .populate('author', 'name photoUrl isBroker licenseNumber')
            .sort({ boostScore: -1, createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        res.status(200).json({
            posts,
            page: pageNum,
            pages: Math.ceil(total / limitNum),
            total
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
const createPost = async (req, res) => {
    try {
        const { title, body, type, location, images, price, links, tags, city } = req.body;

        if (!title || !body || !type || !location) {
            return res.status(400).json({ message: 'Please add all fields' });
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
            city: city // Optional: Save city in Post too if schema allows, otherwise just ignored. 
            // Ideally, we should add 'city' to Post schema for easier filtering later.
        });

        // Update City Count
        if (city || location) {
            // Priority: Explicit city from frontend > Naive split
            const cityName = city || location.split(',')[0].trim();

            if (cityName) {
                await City.findOneAndUpdate(
                    { name: cityName },
                    { $inc: { count: 1 }, $set: { lastActive: new Date() } },
                    { upsert: true, new: true }
                );
            }
        }

        res.status(201).json(post);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update a post
// @route   PUT /api/posts/:id
// @access  Private
const updatePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Check ownership
        if (post.author.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const { title, body, type, location, price, images, links, tags } = req.body;

        post.title = title || post.title;
        post.body = body || post.body;
        post.type = type || post.type;
        post.location = location || post.location;
        post.price = price !== undefined ? price : post.price;
        post.images = images || post.images;
        post.links = links || post.links;
        post.tags = tags || post.tags;

        const updatedPost = await post.save();
        res.json(updatedPost);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Public
const getPost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).populate(
            'author',
            'name photoUrl isBroker licenseNumber'
        );

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Toggle save post
// @route   PUT /api/posts/:id/save
// @access  Private
const toggleSavePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Check if valid user
        if (!req.user) {
            return res.status(401).json({ message: 'User not found' });
        }

        const index = post.savedBy.indexOf(req.user.id);

        if (index === -1) {
            // Not saved, so save it
            post.savedBy.push(req.user.id);
        } else {
            // Saved, so unsave it
            post.savedBy.splice(index, 1);
        }

        await post.save();
        res.status(200).json(post);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Increment post views
// @route   PUT /api/posts/:id/view
// @access  Public
const incrementPostView = async (req, res) => {
    try {
        const post = await Post.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true }
        );
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Search location (Proxy for Nominatim)
// @route   GET /api/posts/location/search
// @access  Public
const searchLocation = async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: 'Query required' });

    // Use built-in fetch if available (Node 18+), otherwise fallback or use https
    // Assuming Node 18+ for this modern stack
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`, {
            headers: {
                'User-Agent': 'AgentConnect-StudentProject/1.0'
            }
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Location proxy error:", error);
        res.status(500).json({ message: 'Failed to fetch location data' });
    }
};

// @desc    Update post status (Owner only)
// @route   PUT /api/posts/:id/status
// @access  Private
const updatePostStatus = async (req, res) => {
    try {
        const { status } = req.body; // 'active', 'draft', 'sold', etc.
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Check ownership
        if (post.author.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        post.status = status;
        await post.save();
        res.status(200).json(post);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Boost a post
// @route   POST /api/posts/:id/boost
// @access  Private
const boostPost = async (req, res) => {
    try {
        // In a real app, integrate payment here.
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Check ownership
        if (post.author.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        post.boostScore = (post.boostScore || 0) + 10;
        await post.save();
        res.json({ message: 'Post boosted!', boostScore: post.boostScore });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};



// @desc    Report a post
// @route   POST /api/posts/:id/report
// @access  Private
const reportPost = async (req, res) => {
    try {
        const { reason } = req.body;
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Check if already reported
        const existingReport = await Report.findOne({
            reporter: req.user.id,
            target: req.params.id
        });

        if (existingReport) {
            return res.status(400).json({ message: 'You have already reported this post' });
        }

        await Report.create({
            reporter: req.user.id,
            target: req.params.id,
            reason
        });

        res.status(201).json({ message: 'Report submitted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get top cities
// @route   GET /api/posts/cities/top
// @access  Public
const getCities = async (req, res) => {
    try {
        // Return top 20 cities by count
        const cities = await City.find().sort({ count: -1 }).limit(20);
        res.json(cities);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Track post interaction
// @route   POST /api/posts/:id/track
// @access  Public
const trackInteraction = async (req, res) => {
    try {
        const { type } = req.body; // 'view', 'share', 'connect', 'save'
        const update = {};

        if (type === 'view') update.$inc = { views: 1 };
        else if (type === 'share') update.$inc = { shareCount: 1 };
        else if (type === 'connect') update.$inc = { connectCount: 1 };
        else if (type === 'save') update.$inc = { saveCount: 1 };
        else return res.status(400).json({ message: 'Invalid interaction type' });

        const post = await Post.findByIdAndUpdate(req.params.id, update, { new: true });

        if (!post) return res.status(404).json({ message: 'Post not found' });

        res.json({
            success: true,
            stats: {
                views: post.views,
                shares: post.shareCount,
                connects: post.connectCount,
                saves: post.saveCount
            }
        });
    } catch (error) {
        console.error("Track error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

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

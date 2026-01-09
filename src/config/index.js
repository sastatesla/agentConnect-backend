const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const config = {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    mongoUri: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    clientUrl: process.env.CLIENT_URL || '*',
    neodoveApiKey: process.env.NEODOVE_API_KEY,
    neodoveCampaignName: process.env.NEODOVE_CAMPAIGN_NAME || 'user_verification',
    gmapApiKey: process.env.GMAP_API_KEY,
};

// Validate critical configurations
const requiredConfigs = ['MONGO_URI', 'JWT_SECRET'];
requiredConfigs.forEach(key => {
    if (!process.env[key]) {
        console.warn(`[CONFIG WARNING]: ${key} is not defined in environment variables.`);
    }
});

module.exports = config;

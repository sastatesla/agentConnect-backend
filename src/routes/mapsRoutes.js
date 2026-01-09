const express = require('express');
const router = express.Router();
const mapsService = require('../services/mapsService');

// @desc    Get Place Autocomplete Predictions
// @route   GET /api/maps/places/autocomplete
router.get('/places/autocomplete', async (req, res, next) => {
    try {
        const { input, sessiontoken } = req.query;

        if (!input) {
            return res.status(400).json({ message: 'Input is required' });
        }

        const predictions = await mapsService.getPlacePredictions(input, sessiontoken);
        res.json(predictions);
    } catch (error) {
        next(error);
    }
});

// @desc    Get Place Details
// @route   GET /api/maps/places/details
router.get('/places/details', async (req, res, next) => {
    try {
        const { placeId, sessiontoken } = req.query;

        if (!placeId) {
            return res.status(400).json({ message: 'Place ID is required' });
        }

        const details = await mapsService.getPlaceDetails(placeId, sessiontoken);
        res.json(details);
    } catch (error) {
        next(error);
    }
});

// @desc    Geocode Address
// @route   GET /api/maps/geocode
router.get('/geocode', async (req, res, next) => {
    try {
        const { address } = req.query;

        if (!address) {
            return res.status(400).json({ message: 'Address is required' });
        }

        const result = await mapsService.geocode(address);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

module.exports = router;

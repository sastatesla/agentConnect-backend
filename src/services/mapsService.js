const axios = require('axios');
const config = require('../config');

class MapsService {
    constructor() {
        this.apiKey = config.gmapApiKey;
        this.baseUrl = 'https://maps.googleapis.com/maps/api';
    }

    /**
     * Autocomplete for places
     * @param {string} input 
     * @param {string} sessiontoken 
     * @returns {Promise<Array>}
     */
    async getPlacePredictions(input, sessiontoken) {
        if (!input) return [];

        try {
            const response = await axios.get(`${this.baseUrl}/place/autocomplete/json`, {
                params: {
                    input,
                    key: this.apiKey,
                    sessiontoken,
                    // You can add more constraints here like specific country components if needed
                    // components: 'country:in'
                }
            });

            if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
                console.error('[MapsService] Autocomplete Error:', response.data);
                throw new Error(response.data.error_message || 'Maps API Error');
            }

            return response.data.predictions || [];
        } catch (error) {
            console.error('[MapsService] Network Error:', error.message);
            throw error;
        }
    }

    /**
     * Get Place Details
     * @param {string} placeId 
     * @param {string} sessiontoken 
     * @returns {Promise<Object>}
     */
    async getPlaceDetails(placeId, sessiontoken) {
        if (!placeId) return null;

        try {
            const response = await axios.get(`${this.baseUrl}/place/details/json`, {
                params: {
                    place_id: placeId,
                    key: this.apiKey,
                    sessiontoken,
                    fields: 'name,geometry,formatted_address,address_components'
                }
            });

            if (response.data.status !== 'OK') {
                console.error('[MapsService] Details Error:', response.data);
                throw new Error(response.data.error_message || 'Maps API Error');
            }

            return response.data.result;
        } catch (error) {
            console.error('[MapsService] Network Error:', error.message);
            throw error;
        }
    }

    /**
     * Geocode an address
     * @param {string} address 
     * @returns {Promise<Object>}
     */
    async geocode(address) {
        try {
            const response = await axios.get(`${this.baseUrl}/geocode/json`, {
                params: {
                    address,
                    key: this.apiKey
                }
            });

            if (response.data.status !== 'OK') {
                // ZERO_RESULTS is common for geocoding
                if (response.data.status === 'ZERO_RESULTS') return null;
                console.error('[MapsService] Geocode Error:', response.data);
                throw new Error(response.data.error_message || 'Maps API Error');
            }

            return response.data.results[0];

        } catch (error) {
            console.error('[MapsService] Network Error:', error.message);
            throw error;
        }
    }
}

module.exports = new MapsService();

const express = require('express');
const router = express.Router();
const { createLead, getMyLeads } = require('../controllers/leadController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', createLead);
router.get('/my', getMyLeads);

module.exports = router;

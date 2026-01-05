const Lead = require('../models/Lead');

exports.createLead = async (req, res) => {
    try {
        const { serviceType, details } = req.body;

        const lead = new Lead({
            user: req.user._id,
            serviceType,
            details
        });

        await lead.save();
        res.status(201).json({ success: true, data: lead });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getMyLeads = async (req, res) => {
    try {
        const leads = await Lead.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json({ success: true, count: leads.length, data: leads });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

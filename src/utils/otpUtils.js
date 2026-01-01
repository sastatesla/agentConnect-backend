const crypto = require('crypto');

const generateSecureOTP = () => {
    return crypto.randomInt(100000, 999999).toString();
};

const normalizePhone = (phone) => {
    if (!phone) return null;
    return phone.startsWith('+') ? phone : `+91${phone}`;
};

module.exports = {
    generateSecureOTP,
    normalizePhone
};

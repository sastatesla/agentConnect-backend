const axios = require('axios');

const sendWhatsAppOTP = async (phone, userName, otp) => {
    const apiKey = process.env.NEODOVE_API_KEY;
    const campaignName = process.env.NEODOVE_CAMPAIGN_NAME || 'user_verification';
    const url = 'https://backend.api-wa.co/campaign/neodove/api/v2';

    try {
        console.log(`Sending OTP ${otp} to ${phone} via NeoDove...`);

        const payload = {
            apiKey: apiKey,
            campaignName: campaignName,
            destination: phone,
            userName: userName || 'User',
            source: 'AgentConnect App',
            templateParams: [otp],
            buttons: [
                {
                    type: "button",
                    sub_type: "copy_code",
                    index: 0,
                    parameters: [
                        {
                            type: "text",
                            text: otp
                        }
                    ]
                }
            ]
        };

        const response = await axios.post(url, payload);

        if (response.status === 200) {
            console.log('WhatsApp message sent successfully', response);
            return true;
        } else {
            console.error('NeoDove API Error:', response.data);
            return false;
        }
    } catch (error) {
        console.error('WhatsApp Service Error:', error.response?.data || error.message);
        return false;
    }
};

module.exports = { sendWhatsAppOTP };

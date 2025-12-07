const twilio = require('twilio');

module.exports = async (req, res) => {
    // إعدادات CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
        const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
        const TWILIO_API_KEY = process.env.TWILIO_API_KEY;
        const TWILIO_API_SECRET = process.env.TWILIO_API_SECRET;
        const TWILIO_TWIML_APP_SID = process.env.TWILIO_TWIML_APP_SID;

        // التحقق من وجود المتغيرات
        console.log('Generating token with:');
        console.log('Account SID:', TWILIO_ACCOUNT_SID ? 'Set (length: ' + TWILIO_ACCOUNT_SID.length + ')' : 'Missing');
        console.log('API Key:', TWILIO_API_KEY ? 'Set (starts with: ' + TWILIO_API_KEY.substring(0, 6) + ')' : 'Missing');
        console.log('API Secret:', TWILIO_API_SECRET ? 'Set (length: ' + TWILIO_API_SECRET.length + ')' : 'Missing');
        console.log('TwiML App SID:', TWILIO_TWIML_APP_SID ? 'Set' : 'Missing');

        const identity = 'link_call_user_' + Date.now();
        
        const AccessToken = twilio.jwt.AccessToken;
        const VoiceGrant = AccessToken.VoiceGrant;
        
        const token = new AccessToken(
            TWILIO_ACCOUNT_SID,
            TWILIO_API_KEY,
            TWILIO_API_SECRET,
            { 
                identity: identity,
                ttl: 3600
            }
        );

        const voiceGrant = new VoiceGrant({
            outgoingApplicationSid: TWILIO_TWIML_APP_SID,
            incomingAllow: true,
        });

        token.addGrant(voiceGrant);

        res.status(200).json({
            token: token.toJwt(),
            identity: identity
        });
    } catch (error) {
        console.error('خطأ في توليد Token:', error);
        res.status(500).json({ 
            error: 'فشل في توليد Token',
            details: error.message 
        });
    }
};

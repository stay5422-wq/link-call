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
        const TWILIO_API_KEY = process.env.TWILIO_API_KEY;
        const TWILIO_API_SECRET = process.env.TWILIO_API_SECRET;
        const TWILIO_TWIML_APP_SID = process.env.TWILIO_TWIML_APP_SID;

        // التحقق من وجود المتغيرات المطلوبة
        if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY || !TWILIO_API_SECRET || !TWILIO_TWIML_APP_SID) {
            console.error('Missing environment variables!');
            console.log('TWILIO_ACCOUNT_SID:', TWILIO_ACCOUNT_SID ? 'Set' : 'MISSING');
            console.log('TWILIO_API_KEY:', TWILIO_API_KEY ? 'Set' : 'MISSING');
            console.log('TWILIO_API_SECRET:', TWILIO_API_SECRET ? 'Set' : 'MISSING');
            console.log('TWILIO_TWIML_APP_SID:', TWILIO_TWIML_APP_SID ? 'Set' : 'MISSING');
            return res.status(500).json({ 
                error: 'Server configuration error - missing credentials'
            });
        }

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

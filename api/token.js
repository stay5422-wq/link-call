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

        console.log('=== Token Generation Debug ===');
        console.log('TWILIO_ACCOUNT_SID:', TWILIO_ACCOUNT_SID ? `${TWILIO_ACCOUNT_SID.substring(0, 10)}...` : 'MISSING');
        console.log('TWILIO_API_KEY:', TWILIO_API_KEY ? `${TWILIO_API_KEY.substring(0, 10)}...` : 'MISSING');
        console.log('TWILIO_API_SECRET:', TWILIO_API_SECRET ? 'Set' : 'MISSING');
        console.log('TWILIO_TWIML_APP_SID:', TWILIO_TWIML_APP_SID ? 'Set' : 'MISSING');

        // التحقق من وجود المتغيرات المطلوبة
        if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY || !TWILIO_API_SECRET || !TWILIO_TWIML_APP_SID) {
            console.error('Missing required environment variables!');
            return res.status(500).json({ 
                error: 'Server configuration error - missing credentials',
                details: {
                    accountSid: !!TWILIO_ACCOUNT_SID,
                    apiKey: !!TWILIO_API_KEY,
                    apiSecret: !!TWILIO_API_SECRET,
                    twimlApp: !!TWILIO_TWIML_APP_SID
                }
            });
        }

        const identity = 'link_call_user_' + Date.now();
        
        const AccessToken = twilio.jwt.AccessToken;
        const VoiceGrant = AccessToken.VoiceGrant;
        
        // استخدام API Key و API Secret
        const token = new AccessToken(
            TWILIO_ACCOUNT_SID,
            TWILIO_API_KEY,
            TWILIO_API_SECRET,
            { 
                identity: identity,
                ttl: 3600
            }
        );
        
        console.log('Token created successfully for identity:', identity);

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

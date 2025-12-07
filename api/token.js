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
        const TWILIO_TWIML_APP_SID = process.env.TWILIO_TWIML_APP_SID;

        if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_TWIML_APP_SID) {
            return res.status(500).json({ error: 'Missing credentials' });
        }

        const identity = 'link_call_user_' + Date.now();
        
        // استخدام ClientCapability بدلاً من AccessToken
        const capability = new twilio.jwt.ClientCapability({
            accountSid: TWILIO_ACCOUNT_SID,
            authToken: TWILIO_AUTH_TOKEN,
            ttl: 14400
        });
        
        // السماح بالمكالمات الصادرة
        capability.addScope(
            new twilio.jwt.ClientCapability.OutgoingClientScope({
                applicationSid: TWILIO_TWIML_APP_SID
            })
        );
        
        // السماح بالمكالمات الواردة
        capability.addScope(
            new twilio.jwt.ClientCapability.IncomingClientScope(identity)
        );

        res.status(200).json({
            token: capability.toJwt(),
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

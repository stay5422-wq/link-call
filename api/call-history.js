const twilio = require('twilio');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
        const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
        
        if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
            console.error('Missing Twilio credentials');
            return res.status(500).json({ error: 'Server configuration error' });
        }
        
        const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
        const calls = await twilioClient.calls.list({ limit: 50 });
        
        const callsData = calls.map(call => ({
            sid: call.sid,
            from: call.from,
            to: call.to,
            status: call.status,
            duration: call.duration,
            startTime: call.startTime,
            endTime: call.endTime,
            direction: call.direction
        }));
        
        res.status(200).json({ calls: callsData });
    } catch (error) {
        console.error('خطأ في جلب سجل المكالمات:', error);
        res.status(500).json({ error: error.message });
    }
};

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
        
        const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
        const recordings = await twilioClient.recordings.list({ limit: 50 });
        
        const recordingsData = recordings.map(recording => ({
            sid: recording.sid,
            callSid: recording.callSid,
            duration: recording.duration,
            dateCreated: recording.dateCreated,
            uri: recording.uri
        }));
        
        res.status(200).json({ recordings: recordingsData });
    } catch (error) {
        console.error('خطأ في جلب التسجيلات:', error);
        res.status(500).json({ error: error.message });
    }
};

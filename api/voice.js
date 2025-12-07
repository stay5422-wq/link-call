const twilio = require('twilio');

module.exports = async (req, res) => {
    // إعدادات CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
        
        const twiml = new twilio.twiml.VoiceResponse();
        
        const dial = twiml.dial({
            callerId: TWILIO_PHONE_NUMBER,
            record: 'record-from-answer-dual',
            recordingStatusCallback: '/api/recording-status',
            recordingStatusCallbackEvent: 'completed'
        });
        
        if (req.body.To) {
            dial.number(req.body.To);
        } else {
            dial.client('default_client');
        }

        res.setHeader('Content-Type', 'text/xml');
        res.status(200).send(twiml.toString());
    } catch (error) {
        console.error('خطأ في voice:', error);
        res.status(500).json({ error: error.message });
    }
};

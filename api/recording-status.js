module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        console.log('تم إكمال التسجيل:', req.body.RecordingSid);
        console.log('مدة التسجيل:', req.body.RecordingDuration);
        console.log('رابط التسجيل:', req.body.RecordingUrl);
        res.status(200).send('OK');
    } catch (error) {
        console.error('خطأ في recording-status:', error);
        res.status(500).json({ error: error.message });
    }
};

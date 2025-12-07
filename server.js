const express = require('express');
const twilio = require('twilio');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// إعدادات Twilio - من Environment Variables فقط
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_TWIML_APP_SID = process.env.TWILIO_TWIML_APP_SID;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_API_KEY = process.env.TWILIO_API_KEY;
const TWILIO_API_SECRET = process.env.TWILIO_API_SECRET;

// تهيئة عميل Twilio
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));

// توليد Token للعميل
app.get('/token', (req, res) => {
    try {
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

        res.json({
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
});

// TwiML للمكالمات الصادرة
app.post('/voice', (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    
    const dial = twiml.dial({
        callerId: TWILIO_PHONE_NUMBER,
        record: 'record-from-answer-dual', // تسجيل المكالمة تلقائياً
        recordingStatusCallback: '/recording-status',
        recordingStatusCallbackEvent: 'completed'
    });
    
    // إذا كان هناك رقم في الطلب
    if (req.body.To) {
        dial.number(req.body.To);
    } else {
        // للمكالمات الواردة
        dial.client('default_client');
    }

    res.type('text/xml');
    res.send(twiml.toString());
});

// معالجة حالة التسجيل
app.post('/recording-status', (req, res) => {
    console.log('تم إكمال التسجيل:', req.body.RecordingSid);
    console.log('مدة التسجيل:', req.body.RecordingDuration);
    console.log('رابط التسجيل:', req.body.RecordingUrl);
    res.sendStatus(200);
});

// بدء تسجيل مكالمة نشطة
app.post('/start-recording', async (req, res) => {
    try {
        const { callSid } = req.body;
        
        const recording = await twilioClient.calls(callSid)
            .recordings
            .create({
                recordingChannels: 'dual',
                recordingStatusCallback: '/recording-status',
                recordingStatusCallbackEvent: ['completed']
            });
        
        res.json({
            success: true,
            recordingSid: recording.sid
        });
    } catch (error) {
        console.error('خطأ في بدء التسجيل:', error);
        res.status(500).json({ error: 'فشل في بدء التسجيل' });
    }
});

// جلب قائمة التسجيلات
app.get('/recordings', async (req, res) => {
    try {
        const recordings = await twilioClient.recordings.list({ limit: 50 });
        
        const recordingsData = recordings.map(recording => ({
            sid: recording.sid,
            callSid: recording.callSid,
            duration: recording.duration,
            dateCreated: recording.dateCreated,
            uri: recording.uri
        }));
        
        res.json({ recordings: recordingsData });
    } catch (error) {
        console.error('خطأ في جلب التسجيلات:', error);
        res.json({ recordings: [] }); // إرجاع قائمة فارغة بدلاً من خطأ
    }
});

// جلب رابط تسجيل محدد
app.get('/recording/:sid', async (req, res) => {
    try {
        const { sid } = req.params;
        const recording = await twilioClient.recordings(sid).fetch();
        
        // رابط التسجيل الكامل
        const recordingUrl = `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`;
        
        res.json({
            url: recordingUrl,
            duration: recording.duration,
            dateCreated: recording.dateCreated
        });
    } catch (error) {
        console.error('خطأ في جلب التسجيل:', error);
        res.status(500).json({ error: 'فشل في جلب التسجيل' });
    }
});

// حذف تسجيل
app.delete('/recording/:sid', async (req, res) => {
    try {
        const { sid } = req.params;
        await twilioClient.recordings(sid).remove();
        
        res.json({ success: true, message: 'تم حذف التسجيل بنجاح' });
    } catch (error) {
        console.error('خطأ في حذف التسجيل:', error);
        res.status(500).json({ error: 'فشل في حذف التسجيل' });
    }
});

// جلب سجل المكالمات
app.get('/call-history', async (req, res) => {
    try {
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
        
        res.json({ calls: callsData });
    } catch (error) {
        console.error('خطأ في جلب سجل المكالمات:', error);
        res.json({ calls: [] }); // إرجاع قائمة فارغة بدلاً من خطأ
    }
});

// بدء الخادم
app.listen(PORT, () => {
    console.log(`\n✅ الخادم يعمل على http://localhost:${PORT}`);
    console.log(`📱 رقم Twilio: ${TWILIO_PHONE_NUMBER}`);
    console.log(`\n⚠️  تأكد من تعيين بياناتك في ملف server.js:\n`);
    console.log(`   - TWILIO_ACCOUNT_SID`);
    console.log(`   - TWILIO_AUTH_TOKEN`);
    console.log(`   - TWILIO_TWIML_APP_SID\n`);
});

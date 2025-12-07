// معلومات Twilio
const TWILIO_PHONE_NUMBER = '+13204336644'; // رقمك السحابي من Twilio
let twilioDevice;
let currentConnection;
let callStartTime;
let callTimer;
let isRecording = false;

// عناصر الواجهة
const displayNumber = document.getElementById('display-number');
const dialpad = document.getElementById('dialpad');
const callScreen = document.getElementById('call-screen');
const callHistoryList = document.getElementById('call-history-list');
const contactsList = document.getElementById('contacts-list');
const recordingsList = document.getElementById('recordings-list');
const settingsPanel = document.getElementById('settings-panel');
const callBtn = document.getElementById('call-btn');
const endCallBtn = document.getElementById('end-call-btn');
const muteBtn = document.getElementById('mute-btn');
const holdBtn = document.getElementById('hold-btn');
const connectionStatus = document.getElementById('connection-status');
const statusText = document.getElementById('status-text');
const callNumber = document.getElementById('call-number');
const callStatus = document.getElementById('call-status');
const callDuration = document.getElementById('call-duration');
const recordingStatus = document.getElementById('recording-status');
const recordingsContainer = document.getElementById('recordings-container');

// أزرار القائمة الجانبية
const dialpadBtn = document.getElementById('dialpad-btn');
const callHistoryBtn = document.getElementById('call-history-btn');
const contactsBtn = document.getElementById('contacts-btn');
const recordingsBtn = document.getElementById('recordings-btn');
const settingsBtn = document.getElementById('settings-btn');

// تحقق من وجود الأزرار
console.log('Buttons loaded:', {
    dialpadBtn: !!dialpadBtn,
    callHistoryBtn: !!callHistoryBtn,
    contactsBtn: !!contactsBtn,
    recordingsBtn: !!recordingsBtn,
    settingsBtn: !!settingsBtn
});

// المتغيرات
let phoneNumber = '';
let isMuted = false;
let isOnHold = false;
let recordings = [];

// تهيئة التطبيق
async function initializeApp() {
    try {
        // جلب التوكن من الخادم
        const baseUrl = window.location.origin;
        const response = await fetch(`${baseUrl}/token`);
        const data = await response.json();
        
        if (!data.token) {
            throw new Error('لم يتم الحصول على التوكن');
        }

        // تهيئة Twilio Device باستخدام setup للإصدار 1.x
        Twilio.Device.setup(data.token, {
            codecPreferences: ['opus', 'pcmu'],
            fakeLocalDTMF: true,
            enableRingingState: true,
            debug: true,
            answerOnBridge: true,
            closeProtection: true
        });
        
        twilioDevice = Twilio.Device;

        // معالجة الأحداث
        twilioDevice.on('ready', () => {
            console.log('Twilio Device جاهز');
            updateConnectionStatus('connected', 'متصل بـ Twilio');
        });

        twilioDevice.on('error', (error) => {
            console.error('خطأ في Twilio:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            console.error('Full error:', JSON.stringify(error, null, 2));
            updateConnectionStatus('error', 'خطأ في الاتصال: ' + (error.message || 'Unknown error'));
        });

        twilioDevice.on('connect', (conn) => {
            console.log('تم الاتصال بنجاح');
            currentConnection = conn;
            startCallTimer();
            updateCallStatus('متصل');
            
            // بدء التسجيل تلقائياً
            startRecording();
        });

        twilioDevice.on('disconnect', () => {
            console.log('تم إنهاء المكالمة');
            endCall();
        });

        twilioDevice.on('incoming', (conn) => {
            console.log('مكالمة واردة من:', conn.parameters.From);
            handleIncomingCall(conn);
        });

        // تحميل التسجيلات المحفوظة
        loadRecordings();

    } catch (error) {
        console.error('خطأ في التهيئة:', error);
        updateConnectionStatus('error', 'فشل الاتصال بالخادم');
        alert('تأكد من تشغيل الخادم على المنفذ 3000');
    }
}

// تحديث حالة الاتصال
function updateConnectionStatus(status, message) {
    connectionStatus.className = `connection-status ${status}`;
    statusText.textContent = message;
}

// تحديث حالة المكالمة
function updateCallStatus(status) {
    callStatus.textContent = status;
}

// إضافة رقم إلى الشاشة
function addDigit(digit) {
    phoneNumber += digit;
    displayNumber.textContent = phoneNumber;
    updateDeleteButton();
}

// حذف آخر رقم
function deleteDigit() {
    phoneNumber = phoneNumber.slice(0, -1);
    displayNumber.textContent = phoneNumber || '';
    updateDeleteButton();
}

// تحديث زر الحذف
function updateDeleteButton() {
    const deleteBtn = document.getElementById('delete-btn');
    if (deleteBtn) {
        if (phoneNumber.length > 0) {
            deleteBtn.classList.remove('hidden');
        } else {
            deleteBtn.classList.add('hidden');
        }
    }
}

// إجراء مكالمة
function makeCall() {
    if (!phoneNumber) {
        alert('الرجاء إدخال رقم الهاتف');
        return;
    }

    if (!twilioDevice) {
        alert('جاري الاتصال بالخادم...');
        return;
    }

    console.log('إجراء مكالمة إلى:', phoneNumber);
    
    try {
        // إجراء المكالمة
        const params = {
            To: phoneNumber,
            From: TWILIO_PHONE_NUMBER
        };
        
        currentConnection = twilioDevice.connect(params);
        
        // إظهار شاشة المكالمة
        dialpad.classList.add('hidden');
        callScreen.classList.remove('hidden');
        callNumber.textContent = phoneNumber;
        updateCallStatus('جاري الاتصال...');
        
    } catch (error) {
        console.error('خطأ في المكالمة:', error);
        alert('فشل إجراء المكالمة');
    }
}

// معالجة المكالمات الواردة
function handleIncomingCall(connection) {
    currentConnection = connection;
    const incomingNumber = connection.parameters.From;
    
    if (confirm(`مكالمة واردة من ${incomingNumber}\nهل تريد الرد؟`)) {
        connection.accept();
        dialpad.classList.add('hidden');
        callScreen.classList.remove('hidden');
        callNumber.textContent = incomingNumber;
        phoneNumber = incomingNumber;
    } else {
        connection.reject();
    }
}

// إنهاء المكالمة
function endCall() {
    if (currentConnection) {
        currentConnection.disconnect();
        currentConnection = null;
    }
    
    stopCallTimer();
    stopRecording();
    
    // العودة إلى لوحة الأرقام
    callScreen.classList.add('hidden');
    dialpad.classList.remove('hidden');
    
    // مسح الرقم
    phoneNumber = '';
    displayNumber.textContent = '';
    callDuration.textContent = '00:00';
    
    isMuted = false;
    isOnHold = false;
}

// بدء عداد المكالمة
function startCallTimer() {
    callStartTime = Date.now();
    callTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        callDuration.textContent = `${minutes}:${seconds}`;
    }, 1000);
}

// إيقاف عداد المكالمة
function stopCallTimer() {
    if (callTimer) {
        clearInterval(callTimer);
        callTimer = null;
    }
}

// كتم الصوت
function toggleMute() {
    if (!currentConnection) return;
    
    isMuted = !isMuted;
    currentConnection.mute(isMuted);
    
    muteBtn.style.background = isMuted ? '#f44336' : '#f5f5f5';
    muteBtn.style.color = isMuted ? 'white' : 'black';
}

// إيقاف مؤقت
function toggleHold() {
    if (!currentConnection) return;
    
    isOnHold = !isOnHold;
    
    if (isOnHold) {
        currentConnection.mute(true);
        updateCallStatus('في الانتظار');
    } else {
        currentConnection.mute(isMuted);
        updateCallStatus('متصل');
    }
    
    holdBtn.style.background = isOnHold ? '#ff9800' : '#f5f5f5';
    holdBtn.style.color = isOnHold ? 'white' : 'black';
}

// بدء التسجيل
async function startRecording() {
    if (!currentConnection) return;
    
    try {
        const callSid = currentConnection.parameters.CallSid;
        const response = await fetch('http://localhost:3000/start-recording', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ callSid })
        });
        
        const data = await response.json();
        
        if (data.success) {
            isRecording = true;
            recordingStatus.classList.remove('hidden');
            console.log('بدأ التسجيل:', data.recordingSid);
        }
    } catch (error) {
        console.error('خطأ في بدء التسجيل:', error);
    }
}

// إيقاف التسجيل
async function stopRecording() {
    if (!isRecording) return;
    
    recordingStatus.classList.add('hidden');
    isRecording = false;
    
    // إعادة تحميل قائمة التسجيلات
    setTimeout(() => loadRecordings(), 2000);
}

// تحميل التسجيلات
async function loadRecordings() {
    try {
        const baseUrl = window.location.origin;
        const response = await fetch(`${baseUrl}/recordings`);
        const data = await response.json();
        
        recordings = data.recordings || [];
        displayRecordings();
        updateRecordingsBadge(recordings.length);
        
    } catch (error) {
        console.error('خطك في تحميل التسجيلات:', error);
    }
}

// تحديث عدد التسجيلات في الشارة
function updateRecordingsBadge(count) {
    const badge = document.getElementById('recordings-badge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

// عرض التسجيلات
function displayRecordings() {
    recordingsContainer.innerHTML = '';
    
    if (recordings.length === 0) {
        recordingsContainer.innerHTML = '<p style="text-align: center; color: #666;">لا توجد تسجيلات</p>';
        return;
    }
    
    recordings.forEach((recording, index) => {
        const item = document.createElement('div');
        item.className = 'recording-item';
        
        const date = new Date(recording.dateCreated);
        const formattedDate = date.toLocaleString('ar-EG');
        
        item.innerHTML = `
            <div class="recording-info">
                <div class="recording-number">${recording.callSid}</div>
                <div class="recording-date">${formattedDate} - ${recording.duration} ثانية</div>
            </div>
            <div class="recording-controls">
                <button class="play-btn" onclick="playRecording('${recording.sid}')">▶️ تشغيل</button>
                <button class="download-btn" onclick="downloadRecording('${recording.sid}')">⬇️ تحميل</button>
            </div>
        `;
        
        recordingsContainer.appendChild(item);
    });
}

// تشغيل التسجيل
async function playRecording(recordingSid) {
    try {
        const baseUrl = window.location.origin;
        const response = await fetch(`${baseUrl}/recording/${recordingSid}`);
        const data = await response.json();
        
        if (data.url) {
            const audio = new Audio(data.url);
            audio.play();
        }
    } catch (error) {
        console.error('خطأ في تشغيل التسجيل:', error);
        alert('فشل تشغيل التسجيل');
    }
}

// تحميل التسجيل
async function downloadRecording(recordingSid) {
    try {
        const baseUrl = window.location.origin;
        const response = await fetch(`${baseUrl}/recording/${recordingSid}`);
        const data = await response.json();
        
        if (data.url) {
            const a = document.createElement('a');
            a.href = data.url;
            a.download = `recording_${recordingSid}.mp3`;
            a.click();
        }
    } catch (error) {
        console.error('خطأ في تحميل التسجيل:', error);
        alert('فشل تحميل التسجيل');
    }
}

// معالجة أزرار لوحة الأرقام
document.querySelectorAll('.num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const digit = btn.dataset.num;
        addDigit(digit);
        
        // إرسال DTMF أثناء المكالمة
        if (currentConnection) {
            currentConnection.sendDigits(digit);
        }
    });
});

// معالجة أزرار التحكم
callBtn.addEventListener('click', makeCall);
endCallBtn.addEventListener('click', endCall);
muteBtn.addEventListener('click', toggleMute);
holdBtn.addEventListener('click', toggleHold);

// دالة لإخفاء جميع الأقسام
function hideAllSections() {
    dialpad.classList.add('hidden');
    callHistoryList.classList.add('hidden');
    contactsList.classList.add('hidden');
    recordingsList.classList.add('hidden');
    settingsPanel.classList.add('hidden');
}

// دالة لإزالة التفعيل من جميع أزرار القائمة
function removeAllActiveStates() {
    dialpadBtn.classList.remove('active');
    callHistoryBtn.classList.remove('active');
    contactsBtn.classList.remove('active');
    recordingsBtn.classList.remove('active');
    settingsBtn.classList.remove('active');
}

// معالجة أزرار القائمة
if (dialpadBtn) {
    dialpadBtn.addEventListener('click', () => {
        console.log('Dialpad clicked');
        hideAllSections();
        removeAllActiveStates();
        dialpad.classList.remove('hidden');
        dialpadBtn.classList.add('active');
    });
}

if (callHistoryBtn) {
    callHistoryBtn.addEventListener('click', () => {
        console.log('Call history clicked');
        hideAllSections();
        removeAllActiveStates();
        callHistoryList.classList.remove('hidden');
        callHistoryBtn.classList.add('active');
        loadCallHistory();
    });
}

if (contactsBtn) {
    contactsBtn.addEventListener('click', () => {
        console.log('Contacts clicked');
        hideAllSections();
        removeAllActiveStates();
        contactsList.classList.remove('hidden');
        contactsBtn.classList.add('active');
        loadContacts();
    });
}

if (recordingsBtn) {
    recordingsBtn.addEventListener('click', () => {
        console.log('Recordings clicked');
        hideAllSections();
        removeAllActiveStates();
        recordingsList.classList.remove('hidden');
        recordingsBtn.classList.add('active');
        loadRecordings();
    });
}

if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
        console.log('Settings clicked');
        hideAllSections();
        removeAllActiveStates();
        settingsPanel.classList.remove('hidden');
        settingsBtn.classList.add('active');
    });
}

// زر تسجيل الخروج
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if (confirm('هل تريد تسجيل الخروج؟')) {
            sessionStorage.removeItem('isLoggedIn');
            sessionStorage.removeItem('username');
            window.location.href = 'login.html';
        }
    });
}

// ===== إدارة الموظفين =====

// التحقق من صلاحية الوصول
function checkAdminAccess() {
    const username = sessionStorage.getItem('username');
    return username === 'akram';
}

// إخفاء/إظهار قسم الموظفين حسب الصلاحية
const employeesSection = document.getElementById('employees-section');
if (employeesSection) {
    if (!checkAdminAccess()) {
        employeesSection.style.display = 'none';
    }
}

// جلب الموظفين من localStorage
function getEmployees() {
    const employees = localStorage.getItem('employees');
    return employees ? JSON.parse(employees) : [];
}

// حفظ الموظفين في localStorage
function saveEmployees(employees) {
    localStorage.setItem('employees', JSON.stringify(employees));
}

// عرض قائمة الموظفين
function loadEmployeesList() {
    if (!checkAdminAccess()) return;
    
    const container = document.getElementById('employees-list-container');
    if (!container) return;
    
    const employees = getEmployees();
    
    if (employees.length === 0) {
        container.innerHTML = '<p class="no-employees">لا يوجد موظفين مضافين</p>';
        return;
    }
    
    container.innerHTML = employees.map(emp => `
        <div class="employee-card">
            <div class="employee-header">
                <div class="employee-info">
                    <h6>${emp.fullname}</h6>
                    <span class="employee-username">@${emp.username}</span>
                </div>
                <button class="delete-employee-btn" onclick="deleteEmployee('${emp.username}')" title="حذف">🗑️</button>
            </div>
            <div class="employee-permissions">
                <span class="permissions-label">الصلاحيات:</span>
                <div class="permissions-tags">
                    ${emp.permissions.map(p => `<span class="permission-tag">${getPermissionLabel(p)}</span>`).join('')}
                </div>
            </div>
        </div>
    `).join('');
}

// الحصول على تسمية الصلاحية بالعربي
function getPermissionLabel(permission) {
    const labels = {
        'make_calls': '📞 مكالمات',
        'view_history': '📋 السجل',
        'view_recordings': '🎙️ تسجيلات',
        'manage_contacts': '👥 جهات الاتصال'
    };
    return labels[permission] || permission;
}

// إضافة موظف جديد
const addEmployeeBtn = document.getElementById('add-employee-btn');
if (addEmployeeBtn) {
    addEmployeeBtn.addEventListener('click', () => {
        if (!checkAdminAccess()) {
            alert('ليس لديك صلاحية للوصول لهذه الميزة!');
            return;
        }
        
        const username = document.getElementById('emp-username').value.trim();
        const password = document.getElementById('emp-password').value.trim();
        const fullname = document.getElementById('emp-fullname').value.trim();
        
        if (!username || !password || !fullname) {
            alert('الرجاء ملء جميع الحقول!');
            return;
        }
        
        // التحقق من عدم تكرار اسم المستخدم
        const employees = getEmployees();
        if (employees.some(emp => emp.username === username)) {
            alert('اسم المستخدم موجود بالفعل!');
            return;
        }
        
        // جمع الصلاحيات المحددة
        const permissionCheckboxes = document.querySelectorAll('.emp-permission:checked');
        const permissions = Array.from(permissionCheckboxes).map(cb => cb.value);
        
        if (permissions.length === 0) {
            alert('الرجاء تحديد صلاحية واحدة على الأقل!');
            return;
        }
        
        // إضافة الموظف الجديد
        const newEmployee = {
            username,
            password,
            fullname,
            permissions,
            createdAt: new Date().toISOString()
        };
        
        employees.push(newEmployee);
        saveEmployees(employees);
        
        // تنظيف النموذج
        document.getElementById('emp-username').value = '';
        document.getElementById('emp-password').value = '';
        document.getElementById('emp-fullname').value = '';
        document.querySelectorAll('.emp-permission').forEach(cb => {
            cb.checked = cb.value === 'make_calls';
        });
        
        // تحديث القائمة
        loadEmployeesList();
        
        alert('تم إضافة الموظف بنجاح! ✅');
    });
}

// حذف موظف
function deleteEmployee(username) {
    if (!checkAdminAccess()) {
        alert('ليس لديك صلاحية للوصول لهذه الميزة!');
        return;
    }
    
    if (!confirm(`هل تريد حذف الموظف ${username}؟`)) {
        return;
    }
    
    let employees = getEmployees();
    employees = employees.filter(emp => emp.username !== username);
    saveEmployees(employees);
    loadEmployeesList();
    
    alert('تم حذف الموظف بنجاح! ✅');
}

// جعل الدالة متاحة عالمياً
window.deleteEmployee = deleteEmployee;

// تحميل قائمة الموظفين عند فتح الإعدادات
if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
        loadEmployeesList();
    });
}

// تحميل القائمة عند تحميل الصفحة
loadEmployeesList();

// عرض معلومات المستخدم في الهيدر
function displayUserInfo() {
    const username = sessionStorage.getItem('username');
    const fullname = sessionStorage.getItem('fullname');
    const role = sessionStorage.getItem('userRole');
    
    const headerUsername = document.getElementById('header-username');
    const headerRole = document.getElementById('header-role');
    
    if (headerUsername) {
        headerUsername.textContent = fullname || username || 'مستخدم';
    }
    
    if (headerRole) {
        const roleText = role === 'admin' ? '👑 مطور رئيسي' : '👨‍💼 موظف';
        headerRole.textContent = roleText;
    }
}

// تحميل معلومات المستخدم عند فتح الصفحة
displayUserInfo();

// زر تسجيل الخروج في الهيدر
const logoutHeaderBtn = document.getElementById('logout-header-btn');
if (logoutHeaderBtn) {
    logoutHeaderBtn.addEventListener('click', () => {
        if (confirm('هل تريد تسجيل الخروج؟')) {
            sessionStorage.removeItem('isLoggedIn');
            sessionStorage.removeItem('username');
            sessionStorage.removeItem('userRole');
            sessionStorage.removeItem('fullname');
            sessionStorage.removeItem('permissions');
            window.location.href = 'login.html';
        }
    });
}

// معالجة زر الحذف
const deleteBtn = document.getElementById('delete-btn');
if (deleteBtn) {
    deleteBtn.addEventListener('click', deleteDigit);
}

// معالجة لوحة المفاتيح
document.addEventListener('keydown', (e) => {
    if (e.key >= '0' && e.key <= '9' || e.key === '*' || e.key === '#') {
        addDigit(e.key);
        if (currentConnection) {
            currentConnection.sendDigits(e.key);
        }
    } else if (e.key === 'Backspace') {
        deleteDigit();
    } else if (e.key === 'Enter') {
        if (!currentConnection) {
            makeCall();
        }
    } else if (e.key === 'Escape') {
        if (currentConnection) {
            endCall();
        }
    }
});

// تحميل سجل المكالمات
async function loadCallHistory() {
    try {
        const baseUrl = window.location.origin;
        const response = await fetch(`${baseUrl}/call-history`);
        const data = await response.json();
        
        const container = document.getElementById('call-history-container');
        container.innerHTML = '';
        
        if (!data.calls || data.calls.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📞</div>
                    <p>لا توجد مكالمات حتى الآن</p>
                </div>
            `;
            return;
        }
        
        data.calls.forEach(call => {
            const date = new Date(call.startTime);
            const formattedDate = date.toLocaleString('ar-EG');
            const duration = call.duration ? `${call.duration} ثانية` : 'لم تكتمل';
            
            const callType = call.direction === 'inbound' ? '📥 واردة' : '📤 صادرة';
            const statusColor = call.status === 'completed' ? '#4ECDC4' : '#FF6B6B';
            
            const item = document.createElement('div');
            item.className = 'call-item';
            item.innerHTML = `
                <div class="call-item-info">
                    <div class="call-item-number">${call.to}</div>
                    <div class="call-item-details">
                        <span class="call-item-type">${callType}</span>
                        <span>${formattedDate}</span>
                        <span style="color: ${statusColor}">${duration}</span>
                    </div>
                </div>
                <div class="call-item-actions">
                    <button class="play-btn" onclick="dialNumber('${call.to}')">📞 اتصال</button>
                </div>
            `;
            container.appendChild(item);
        });
    } catch (error) {
        console.error('خطأ في تحميل سجل المكالمات:', error);
    }
}

// تحميل جهات الاتصال
function loadContacts() {
    const container = document.getElementById('contacts-container');
    
    // مثال توضيحي - يمكن حفظ جهات الاتصال في localStorage
    const contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
    
    container.innerHTML = '';
    
    if (contacts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👥</div>
                <p>لا توجد جهات اتصال</p>
                <button class="add-contact-btn-empty" onclick="addContact()">إضافة جهة اتصال</button>
            </div>
        `;
        return;
    }
    
    contacts.forEach(contact => {
        const item = document.createElement('div');
        item.className = 'contact-item';
        const initial = contact.name.charAt(0).toUpperCase();
        
        item.innerHTML = `
            <div class="contact-avatar">${initial}</div>
            <div class="contact-info">
                <div class="contact-name">${contact.name}</div>
                <div class="contact-phone">${contact.phone}</div>
            </div>
            <div class="contact-actions">
                <button class="contact-call-btn" onclick="callContact('${contact.phone}')" title="اتصال">📞</button>
            </div>
        `;
        container.appendChild(item);
    });
}

// إضافة جهة اتصال
function addContact() {
    const name = prompt('أدخل اسم جهة الاتصال:');
    if (!name) return;
    
    const phone = prompt('أدخل رقم الهاتف:');
    if (!phone) return;
    
    const contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
    contacts.push({ name, phone });
    localStorage.setItem('contacts', JSON.stringify(contacts));
    
    loadContacts();
}

// الاتصال بجهة اتصال
function callContact(phone) {
    phoneNumber = phone;
    displayNumber.textContent = phone;
    makeCall();
}

// الاتصال برقم
function dialNumber(number) {
    // التبديل إلى لوحة المفاتيح
    hideAllSections();
    removeAllActiveStates();
    dialpad.classList.remove('hidden');
    dialpadBtn.classList.add('active');
    
    // ملء الرقم
    phoneNumber = number;
    displayNumber.textContent = number;
}

// معالجة زر إضافة جهة اتصال
const addContactBtn = document.getElementById('add-contact-btn');
if (addContactBtn) {
    addContactBtn.addEventListener('click', addContact);
}

// البحث في جهات الاتصال
const contactSearch = document.getElementById('contact-search');
if (contactSearch) {
    contactSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
        const filtered = contacts.filter(c => 
            c.name.toLowerCase().includes(searchTerm) || 
            c.phone.includes(searchTerm)
        );
        
        const container = document.getElementById('contacts-container');
        container.innerHTML = '';
        
        filtered.forEach(contact => {
            const item = document.createElement('div');
            item.className = 'contact-item';
            const initial = contact.name.charAt(0).toUpperCase();
            
            item.innerHTML = `
                <div class="contact-avatar">${initial}</div>
                <div class="contact-info">
                    <div class="contact-name">${contact.name}</div>
                    <div class="contact-phone">${contact.phone}</div>
                </div>
                <div class="contact-actions">
                    <button class="contact-call-btn" onclick="callContact('${contact.phone}')" title="اتصال">📞</button>
                </div>
            `;
            container.appendChild(item);
        });
    });
}

// تهيئة التطبيق عند التحميل
initializeApp();

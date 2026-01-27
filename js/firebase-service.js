// js/firebase-service.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { FIREBASE_CONFIG, GOOGLE_SCRIPT_URL } from "./config.js";
import { dataState, updateDataState, updateLocalState, saveToLocalStorage, loadFromLocalStorage, globalState } from "./state.js";
import { updateSyncUI, showToast, showLoading, hideLoading } from "./utils.js";
import { refreshUI } from "./ui-render.js";

// Initialize Firebase
const app = initializeApp(FIREBASE_CONFIG);
const db = getDatabase(app);
const dbRef = ref(db, 'school_data/wany_data');

export async function syncData() {
    if (globalState.sheetQueue.length > 0) {
        processSheetQueue();
        return;
    }

    updateSyncUI('Checking...', 'yellow');

    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (data && data.subjects) {
            console.log("🚀 Loaded from Firebase Realtime DB");
            updateDataState(data);
            saveToLocalStorage();
            refreshUI();
            updateSyncUI('Online (Firebase)', 'green');
        } else {
            console.warn("Firebase Empty -> Fetching Sheet...");
            fetchFromGoogleSheet();
        }
    }, (error) => {
        console.error("Firebase Error:", error);
        fetchFromGoogleSheet();
    });
}

async function fetchFromGoogleSheet() {
    try {
        updateSyncUI('Syncing Sheet...', 'yellow');
        const response = await fetch(GOOGLE_SCRIPT_URL + "?action=getData&t=" + Date.now());
        const result = await response.json();
        
        if (result.subjects || result.status === 'success') {
            updateDataState(result.data || result);
            saveToLocalStorage();
            refreshUI();
            
            // Sync Sheet -> Firebase
            set(dbRef, dataState);
            updateSyncUI('Online (Sheet Synced)', 'green');
        }
    } catch (error) {
        console.error("Sheet Error:", error);
        updateSyncUI('Offline', 'red');
        loadFromLocalStorage();
        refreshUI();
    }
}

export async function saveAndRefresh(payload) {
    if(payload.action === 'login') {
        showLoading("กำลังตรวจสอบข้อมูล...");
        try {
            const res = await fetch(GOOGLE_SCRIPT_URL, { method:'POST', body:JSON.stringify(payload) });
            hideLoading();
            return await res.json();
        } catch(e) {
            hideLoading();
            return {status:'error'};
        }
    }

    // Hybrid Flow
    updateLocalState(payload);
    refreshUI();
    saveToLocalStorage();

    set(dbRef, dataState).then(() => {
        console.log("✅ Saved to Firebase");
        showToast("บันทึกข้อมูลเรียบร้อย", "bg-green-600"); 
    }).catch((err) => {
        console.error("Firebase Write Error", err);
    });

    addToSheetQueue(payload);
    return {status:'success'};
}

function addToSheetQueue(payload) {
    globalState.sheetQueue.push(payload);
    processSheetQueue();
}

async function processSheetQueue() {
    if (globalState.isSendingSheet || globalState.sheetQueue.length === 0) return;
    globalState.isSendingSheet = true;

    const payload = globalState.sheetQueue[0];
    updateSyncUI('Saving to Sheet...', 'yellow');

    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        console.log("✅ Synced to Google Sheet:", payload.action);
        globalState.sheetQueue.shift();
    } catch (error) {
        console.error("❌ Google Sheet Sync Failed:", error);
        updateSyncUI('Sheet Retry...', 'red');
        await new Promise(r => setTimeout(r, 3000));
    }

    globalState.isSendingSheet = false;
    
    if (globalState.sheetQueue.length > 0) {
        processSheetQueue();
    } else {
        updateSyncUI('Online (All Synced)', 'green');
    }
}

// ฟังก์ชันสำหรับ Backup ข้อมูลทั้งหมดไปยัง Google Sheet
// ในไฟล์ js/firebase-service.js

export async function backupToGoogleSheet() {
    console.log("Starting Backup to Google Sheet...");
    
    // 1. เตรียมข้อมูลที่จะส่ง (Payload)
    // ดึงข้อมูลล่าสุดจาก dataState โดยตรงเพื่อให้แน่ใจว่าเป็นปัจจุบันที่สุด
    const payload = {
        action: 'backup', // บอก Server ว่านี่คือการสำรองข้อมูล
        timestamp: new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }),
        data: {
            students: dataState.students,
            scores: dataState.scores,
            tasks: dataState.tasks,
            // 🟢 ส่วนสำคัญ: ตรวจสอบว่าส่งข้อมูลการเช็คชื่อครบถ้วน
            attendance: dataState.attendance.map(a => ({
                id: a.id || `${a.studentId}_${a.date}`,
                studentId: a.studentId,
                classId: a.classId,
                date: a.date,   // ต้องเป็น YYYY-MM-DD
                status: a.status,
                timestamp: a.timestamp || new Date().toISOString()
            }))
        }
    };

    // 2. ตรวจสอบว่ามี URL ของ Script หรือยัง
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwQNjMSE06u5xO4dtyipa5P-YzoaicppubdwlUgMpaX4L4TUjk3-xY2PRnzhS42AxZe/exec"; 
    // **สำคัญ:** อย่าลืมเปลี่ยนตรงนี้เป็น URL จริงของคุณ (ที่ลงท้ายด้วย /exec)

    if (SCRIPT_URL === "URL_ของ_GOOGLE_APPS_SCRIPT_ของคุณ") {
        alert("กรุณาใส่ URL ของ Google Apps Script ในไฟล์ firebase-service.js ก่อนครับ");
        return;
    }

    try {
        // 3. ส่งข้อมูลไปยัง Google Sheet
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // สำคัญ: Google Script บังคับใช้ no-cors ในบางกรณี
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // 4. บันทึกวันที่ Backup ล่าสุดลงเครื่อง
        const todayStr = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })).toDateString();
        localStorage.setItem('last_backup_date', todayStr);
        
        console.log("Backup command sent successfully.");
        // เนื่องจาก no-cors เราจะเช็ค response.ok ไม่ได้ แต่ถ้ารหัสผ่านบรรทัดนี้มาได้ถือว่าส่งออกแล้ว
        
    } catch (error) {
        console.error("Backup Failed:", error);
        alert("เกิดข้อผิดพลาดในการสำรองข้อมูล: " + error.message);
    }
}
// ใน js/firebase-service.js (เพิ่มต่อท้าย)

export async function restoreFromGoogleSheet() {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwQNjMSE06u5xO4dtyipa5P-YzoaicppubdwlUgMpaX4L4TUjk3-xY2PRnzhS42AxZe/exec"; // ⚠️ ใส่ URL ใหม่ที่ Deploy แล้ว

    if (confirm("⚠️ คำเตือน: การกระทำนี้จะดึงข้อมูลจาก Google Sheet มา 'ทับ' ข้อมูลปัจจุบันทั้งหมดในระบบ\n\nใช้กรณีที่คุณแก้ไขข้อมูลใน Excel/Sheet แล้วต้องการนำเข้าระบบ\n\nยืนยันหรือไม่?")) {
        
        // 1. ดึงข้อมูล
        try {
            // ใช้ no-cors ไม่ได้สำหรับการอ่านค่ากลับ (ต้อง setup CORS หรือใช้เทคนิค JSONP แต่ใน Apps Script Web App แบบ Simple, fetch ปกติจะติด CORS)
            // วิธีแก้: ใน Apps Script ให้ return JSON ปกติ แต่ client อาจจะต้องใช้ proxy หรือตั้งค่า header ให้ถูก
            // แต่เพื่อความง่ายที่สุด เราจะใช้ fetch แบบปกติ ถ้าติด CORS จะอ่าน body ไม่ได้
            
            // หมายเหตุ: การดึงข้อมูลจาก Google Script ผ่าน Client-side JS มักติด CORS
            // วิธีที่ง่ายที่สุดคือคุณต้องแก้ doPost ให้ return JSON และ Apps Script ต้อง Deploy แบบ "Execute as Me" และ "Who has access: Anyone"
            
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'restore' })
                // ไม่ใส่ mode: 'no-cors' เพราะเราต้องการอ่าน response
            });

            const json = await response.json();

            if (json.result === 'success' && json.data) {
                console.log("ได้รับข้อมูลจาก Sheet:", json.data);

                // 2. อัปเดตข้อมูลลง dataState (Local Memory)
                // แปลงข้อมูลบางอย่างให้ตรง format (เช่น ID ต้องเป็น string/number)
                if(json.data.students) dataState.students = json.data.students;
                if(json.data.scores) dataState.scores = json.data.scores;
                if(json.data.tasks) dataState.tasks = json.data.tasks;
                
                // 🟢 ส่วนสำคัญ: Attendance
                if(json.data.attendance) {
                    dataState.attendance = json.data.attendance.map(a => ({
                        ...a,
                        date: a.date.substring(0,10) // ตัดเวลาทิ้งเอาแค่วันที่
                    }));
                }

                // 3. บันทึกลง LocalStorage
                localStorage.setItem('wany_data_backup', JSON.stringify(dataState));

                // 4. บันทึกทับลง Firebase (เพื่อให้เป็นข้อมูลปัจจุบันถาวร)
                // เราจะใช้การ loop save หรือส่งก้อนใหญ่ ขึ้นอยู่กับโครงสร้าง แต่เพื่อความชัวร์เราจะอัปเดต Local ก่อน
                // แล้วสั่ง syncData แบบ Push (ถ้ามี) หรือให้ระบบ Auto Sync ทำงานต่อ
                
                // ในที่นี้เราจะ Refresh หน้าจอเพื่อให้เห็นข้อมูลใหม่ทันที
                alert("กู้คืนข้อมูลจาก Google Sheet สำเร็จ! \nระบบจะรีโหลดหน้าจอเพื่อแสดงข้อมูลล่าสุด");
                location.reload();

            } else {
                throw new Error("Script returned error or no data");
            }

        } catch (error) {
            console.error(error);
            alert("ไม่สามารถดึงข้อมูลได้ (อาจติด CORS หรือ URL ผิด): " + error.message);
        }
    }
}




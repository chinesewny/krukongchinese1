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
    const SCRIPT_URL = "URL_ของ_GOOGLE_APPS_SCRIPT_ของคุณ"; 
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


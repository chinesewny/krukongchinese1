// js/firebase-service.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { FIREBASE_CONFIG, GOOGLE_SCRIPT_URL } from "./config.js";
import { dataState, updateDataState, updateLocalState, saveToLocalStorage, loadFromLocalStorage, globalState } from "./state.js";
import { updateSyncUI, showToast, showLoading, hideLoading } from "./utils.js";
import { refreshUI } from "./ui-render.js"; // จะสร้างไฟล์นี้ในขั้นถัดไป

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
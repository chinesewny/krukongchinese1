// js/main.js
import { syncData, saveAndRefresh } from "./firebase-service.js";
import { dataState, globalState, saveToLocalStorage, loadFromLocalStorage } from "./state.js";
import { refreshUI, renderScoreRoster, renderAttRoster, renderGradeReport, updateScanTaskDropdown, renderStudentDashboard } from "./ui-render.js"; // Import render functions
import { getThaiDateISO, formatThaiDate, calGrade, showToast, showLoading, hideLoading } from "./utils.js";
import { PERIODS } from "./config.js";

// --- Calculation Logic (Shared) ---
export function calculateScores(studentId, classId, tasks) {
    let total = 0, midterm = 0, final = 0;
    let chapStudentSum = Array(20).fill(0); 
    let chapMaxSum = Array(20).fill(0);     
    
    const cls = dataState.classes.find(c => c.id == classId);
    let subjectConfig = Array(20).fill(10); 
    if(cls) {
        const sub = dataState.subjects.find(s => s.id == cls.subjectId);
        if(sub && sub.scoreConfig && sub.scoreConfig.length > 0) {
             subjectConfig = [...sub.scoreConfig, ...Array(20).fill(10)].slice(0, 20);
        }
    }

    const classTasks = tasks.filter(t => t.classId == classId);
    
    classTasks.forEach(task => {
        const scoreRecord = dataState.scores.find(s => s.studentId == studentId && s.taskId == task.id);
        let score = scoreRecord ? Number(scoreRecord.score) : 0;
        if (isNaN(score)) score = 0; 
        
        let taskMax = Number(task.maxScore) || 10; 

        if (task.category === 'midterm') { midterm += score; total += score; }
        else if (task.category === 'final') { final += score; total += score; }
        else if (task.category === 'accum') {
            if (task.chapter) {
                let chaps = Array.isArray(task.chapter) ? task.chapter : String(task.chapter).split(',');
                const validChaps = chaps.filter(ch => { const idx = Number(ch) - 1; return idx >= 0 && idx < 20; });

                if (validChaps.length > 0) {
                    const scoreShare = score / validChaps.length;
                    const maxShare = taskMax / validChaps.length;
                    validChaps.forEach(ch => { const idx = Number(ch) - 1; chapStudentSum[idx] += scoreShare; chapMaxSum[idx] += maxShare; });
                }
            } else { total += score; }
        } else { total += score; }
    });
    
    let chapScores = chapStudentSum.map((sumScore, idx) => {
        const sumMax = chapMaxSum[idx];
        const targetMax = Number(subjectConfig[idx]) || 10; 
        if (sumMax === 0) return 0; 
        return (sumScore / sumMax) * targetMax;
    });

    const accumTotal = chapScores.reduce((a, b) => a + b, 0);
    total += accumTotal;
    
    return { total, midterm, final, chapScores };
}


// --- Global Functions (Expose to Window for HTML onclick) ---

window.switchMainTab = function(t) { 
    document.getElementById('section-admin').classList.add('hidden'); 
    document.getElementById('section-student').classList.add('hidden'); 
    document.getElementById(`section-${t}`).classList.remove('hidden'); 
    // ... (logic เดิมในการสลับปุ่ม active)
}

window.switchAdminSubTab = function(t) {
    document.querySelectorAll('.admin-panel').forEach(p=>p.classList.add('hidden')); 
    document.getElementById(`admin-panel-${t}`).classList.remove('hidden'); 
    // ... (logic เดิมในการปรับปุ่ม menu)
    refreshUI();
}

window.handleLogout = function(force=false) {
    if(force || confirm("ออกจากระบบ?")) { 
        showLoading("กำลังออกจากระบบ...");
        localStorage.removeItem('wany_admin_session'); 
        localStorage.removeItem('wany_data_backup'); 
        localStorage.removeItem('current_student_code'); 
        setTimeout(() => location.reload(), 500);
    } 
}

window.handleStudentLogin = async function() {
    // ... (copy logic from original script)
}

window.saveSubjectConfig = function() {
     const subId = document.getElementById('config-subject-id').value;
     saveAndRefresh({ action: 'updateSubjectConfig', id: subId, config: globalState.tempConfig });
     document.getElementById('subject-config-modal').classList.add('hidden');
     showToast("บันทึกโครงสร้างคะแนนแล้ว");
}

// ... คุณต้อง expose ฟังก์ชันอื่นๆ ที่ HTML เรียกใช้ เช่น:
// window.openEmailModal, window.saveUserEmail, window.setScoreMode, 
// window.setAttMode, window.printOfficialReport, window.exportGradeCSV ฯลฯ
// มาไว้ที่นี่ทั้งหมด

// --- Initialization ---

window.addEventListener('DOMContentLoaded', () => {
    syncData();
    
    if(document.getElementById('att-date-input')) document.getElementById('att-date-input').value = getThaiDateISO();
    
    // Init other things
    loadFromLocalStorage();
    refreshUI();
    
    // Setup Event Listeners (Form submits, inputs, etc.)
    // ... Copy event listeners from initEventListeners() here ...
    
    // Check Login Session
    const adminSession = localStorage.getItem('wany_admin_session');
    const studentCode = localStorage.getItem('current_student_code');

    if (adminSession) {
        window.switchMainTab('admin');
        document.getElementById('admin-login-wrapper').classList.add('hidden'); 
        document.getElementById('admin-content-wrapper').classList.remove('hidden'); 
    } else if (studentCode) {
        window.switchMainTab('student');
        document.getElementById('student-login-wrapper').classList.add('hidden');
        document.getElementById('student-dashboard').classList.remove('hidden');
    }

    setInterval(syncData, 5000);
});
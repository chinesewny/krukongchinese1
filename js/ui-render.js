// js/ui-render.js
import { dataState, globalState } from "./state.js";
import { saveAndRefresh } from "./firebase-service.js";
import { calculateScores } from "./main.js"; // ต้องย้าย calculateScores มาไว้ main หรือ utils (ผมแนะนำไว้ main เพื่อความง่ายในการเรียกใช้ข้ามไฟล์)
import { calGrade, formatThaiDate, getThaiDateISO, showToast } from "./utils.js";

// --- Functions to Export ---

export function refreshUI() {
    refreshDropdowns();
    renderSubjectList();
    renderScheduleList();
    
    if(!document.getElementById('admin-panel-scan').classList.contains('hidden')) { updateScanTaskDropdown(); renderScoreRoster(); }
    if(!document.getElementById('admin-panel-report').classList.contains('hidden')) { renderGradeReport(); }
    if(!document.getElementById('admin-panel-homework').classList.contains('hidden')) { renderIncomingSubmissions(); }
    if(!document.getElementById('admin-panel-attendance').classList.contains('hidden')) { renderAttRoster(); }
    if(!document.getElementById('admin-panel-material').classList.contains('hidden')) { renderAdminMaterials(); }
    
    // Update Inbox Badge logic...
    let count = 0; 
    dataState.submissions.forEach(sub => { 
        if(!dataState.scores.some(sc => sc.taskId == sub.taskId && sc.studentId == sub.studentId)) count++; 
    }); 
    const badge = document.getElementById('badge-homework'); 
    count > 0 ? (badge.classList.remove('hidden'), badge.textContent = count > 99 ? '99+' : count) : badge.classList.add('hidden');

    if(!document.getElementById('student-dashboard').classList.contains('hidden')) {
         const code = localStorage.getItem('current_student_code');
         if(code) { renderStudentDashboard(code); }
    }
}

// ... (ใส่ฟังก์ชัน Render อื่นๆ ทั้งหมดที่นี่ เช่น renderSubjectList, renderScheduleList, renderScoreRoster, renderStudentDashboard ฯลฯ)
// อย่าลืม export ฟังก์ชันที่ต้องใช้ในไฟล์อื่น

// ตัวอย่าง Helper ภายในไฟล์
function refreshDropdowns() { 
    const setOpts = (id, list) => { 
        const el=document.getElementById(id); 
        if(!el) return; 
        const cur=el.value; 
        el.innerHTML='<option value="">-- เลือก --</option>'; 
        list.forEach(i=>{ const o=document.createElement('option'); o.value=i.id; o.textContent=i.name; el.appendChild(o); }); 
        el.value=cur; 
    }; 
    setOpts('class-subject-ref', dataState.subjects); 
    setOpts('student-class', dataState.classes); 
    // ...
}

export function renderSubjectList() { /* ... code ... */ }
export function renderScheduleList() { /* ... code ... */ }
export function renderAttRoster() { /* ... code ... */ }
export function renderScoreRoster() { /* ... code ... */ }
export function renderGradeReport() { /* ... code ... */ }
export function renderIncomingSubmissions() { /* ... code ... */ }
export function renderAdminMaterials() { /* ... code ... */ }
export function renderStudentDashboard(code) { /* ... code ... */ }
export function updateScanTaskDropdown() { /* ... code ... */ }


// ... คัดลอกฟังก์ชัน render ทั้งหมดมาวางที่นี่ ...

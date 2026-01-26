import { dataState, globalState } from "./state.js";
import { calculateScores, calGrade, formatThaiDate, getThaiDateISO, showToast } from "./utils.js";

// --- 1. Helper Functions (Dropdowns & Checkboxes) ---

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
    setOpts('scan-class-select', dataState.classes); 
    setOpts('task-subject-filter', dataState.subjects); 
    setOpts('att-class-select', dataState.classes); 
    setOpts('mat-subject', dataState.subjects); 
    setOpts('sch-class', dataState.classes); 
    setOpts('report-subject', dataState.subjects); 
    setOpts('exam-class-select', dataState.classes);
    
    // เพิ่ม Dropdown สำหรับฟอร์มสร้างงานแบบแยกประเภท
    setOpts('task-subject-accum', dataState.subjects); 
    setOpts('task-subject-exam', dataState.subjects);  
}

// ฟังก์ชันสร้าง Checkbox ห้องเรียนสำหรับฟอร์มงานเก็บคะแนน (3.1)
export function renderTaskClassCheckboxesAccum() {
    const subId = document.getElementById('task-subject-accum').value; 
    const container = document.getElementById('task-class-accum'); 
    if(!container) return;
    container.innerHTML = ''; 
    dataState.classes.filter(c => c.subjectId == subId).forEach(c => { 
        const lbl = document.createElement('label'); 
        lbl.className = "flex items-center gap-2 p-2 rounded hover:bg-white/10 cursor-pointer"; 
        lbl.innerHTML = `<input type="checkbox" value="${c.id}" class="accent-yellow-500 w-4 h-4 rounded"><span class="text-xs text-white/80">${c.name}</span>`; 
        container.appendChild(lbl); 
    }); 
}

// ฟังก์ชันสร้าง Checkbox ช่องคะแนนสำหรับฟอร์มงานเก็บคะแนน (3.1)
export function renderTaskChapterCheckboxesAccum() {
    const subId = document.getElementById('task-subject-accum').value; 
    const container = document.getElementById('task-chapter-accum'); 
    if(!container) return;
    container.innerHTML = ''; 
    if(!subId) return; 
    const subj = dataState.subjects.find(s => s.id == subId);
    const config = (subj && subj.scoreConfig && subj.scoreConfig.length > 0) ? subj.scoreConfig : Array(5).fill(10);
    config.forEach((maxScore, index) => { 
        const div = document.createElement('div');
        div.className = "flex items-center gap-1 bg-black/20 px-2 py-1 rounded border border-white/10 cursor-pointer hover:bg-white/10";
        div.innerHTML = `
            <input type="checkbox" id="chap-acc-${index+1}" value="${index+1}" class="chapter-checkbox accent-yellow-400 w-3 h-3">
            <label for="chap-acc-${index+1}" class="text-[10px] text-white cursor-pointer select-none">Ch.${index+1} <span class="text-white/50">(${maxScore})</span></label>
        `;
        container.appendChild(div); 
    }); 
}

// ฟังก์ชันสร้าง Checkbox ห้องเรียนสำหรับฟอร์มสอบ (3.2)
export function renderTaskClassCheckboxesExam() {
    const subId = document.getElementById('task-subject-exam').value; 
    const container = document.getElementById('task-class-exam'); 
    if(!container) return;
    container.innerHTML = ''; 
    dataState.classes.filter(c => c.subjectId == subId).forEach(c => { 
        const lbl = document.createElement('label'); 
        lbl.className = "flex items-center gap-2 p-2 rounded hover:bg-white/10 cursor-pointer"; 
        lbl.innerHTML = `<input type="checkbox" value="${c.id}" class="accent-red-500 w-4 h-4 rounded"><span class="text-xs text-white/80">${c.name}</span>`; 
        container.appendChild(lbl); 
    }); 
}

// ผูกฟังก์ชันเข้ากับ window เพื่อให้เรียกใช้จาก HTML หรือ main.js ได้
window.renderTaskClassCheckboxesAccum = renderTaskClassCheckboxesAccum;
window.renderTaskChapterCheckboxesAccum = renderTaskChapterCheckboxesAccum;
window.renderTaskClassCheckboxesExam = renderTaskClassCheckboxesExam;

// --- 2. ส่วนการจัดการ UI อื่นๆ (คงเดิม) ---

function updateInboxBadge() { 
    let count = 0; 
    dataState.submissions.forEach(sub => { if(!dataState.scores.find(sc => sc.taskId == sub.taskId && sc.studentId == sub.studentId)) count++; }); 
    const badge = document.getElementById('inbox-badge'); 
    if(badge) { badge.textContent = count; badge.classList.toggle('hidden', count === 0); } 
}

// ... [ฟังก์ชันอื่นๆ เช่น renderSubjectList, renderGradeReport คงเดิมตามไฟล์ที่แนบมา] ...

// --- 3. Main Refresh Function ---
export function refreshUI() {
    refreshDropdowns();
    renderSubjectList();
    renderScheduleList();
    
    // ตรวจสอบ Panel ที่เปิดอยู่เพื่อ Re-render ข้อมูล
    const panels = [
        { id: 'admin-panel-scan', fn: () => { updateScanTaskDropdown(); renderScoreRoster(); } },
        { id: 'admin-panel-report', fn: renderGradeReport },
        { id: 'admin-panel-homework', fn: renderIncomingSubmissions },
        { id: 'admin-panel-attendance', fn: renderAttRoster },
        { id: 'admin-panel-material', fn: renderAdminMaterials },
        { id: 'admin-panel-exam', fn: renderExamPanel }
    ];

    panels.forEach(p => {
        const el = document.getElementById(p.id);
        if(el && !el.classList.contains('hidden')) p.fn();
    });
    
    updateInboxBadge();

    const stdDash = document.getElementById('student-dashboard');
    if(stdDash && !stdDash.classList.contains('hidden')) {
         const code = localStorage.getItem('current_student_code');
         if(code) { renderStudentDashboard(code); }
    }
}

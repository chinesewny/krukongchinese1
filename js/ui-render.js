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
    setOpts('task-subject-accum', dataState.subjects); 
    setOpts('task-subject-exam', dataState.subjects);  
}

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
        div.innerHTML = `<input type="checkbox" id="chap-acc-${index+1}" value="${index+1}" class="chapter-checkbox accent-yellow-400 w-3 h-3"><label for="chap-acc-${index+1}" class="text-[10px] text-white cursor-pointer select-none">Ch.${index+1} <span class="text-white/50">(${maxScore})</span></label>`;
        container.appendChild(div); 
    }); 
}

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

window.renderTaskClassCheckboxesAccum = renderTaskClassCheckboxesAccum;
window.renderTaskChapterCheckboxesAccum = renderTaskChapterCheckboxesAccum;
window.renderTaskClassCheckboxesExam = renderTaskClassCheckboxesExam;

// --- 2. Render Functions (Admin & Student) ---

export function renderSubjectList() {
    const div = document.getElementById('subject-list-container'); 
    if(!div) return;
    div.innerHTML = '';
    dataState.subjects.forEach(s => {
        const el = document.createElement('div');
        el.className = "p-3 bg-white/5 rounded-lg border border-white/5 cursor-pointer hover:bg-white/10 transition-all flex justify-between items-center";
        const config = s.scoreConfig || []; 
        const slots = config.length > 0 ? `${config.length} ช่อง` : 'ค่าเริ่มต้น (5)';
        el.innerHTML = `<div><div class="font-bold text-sm text-white">${s.name}</div><div class="text-xs text-white/50">โครงสร้างคะแนน: ${slots}</div></div><i class="fa-solid fa-gear text-white/30"></i>`;
        el.onclick = () => window.openSubjectConfig(s.id); 
        div.appendChild(el);
    });
}

export function renderScheduleList() { 
    const div = document.getElementById('schedule-list'); 
    if(!div) return;
    div.innerHTML = ''; 
    if(!dataState.schedules) return; 
    const days = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์']; 
    const sorted = [...dataState.schedules].sort((a,b) => (a.day - b.day) || (a.period - b.period)); 
    sorted.forEach(s => { 
        const clsName = dataState.classes.find(c=>c.id==s.classId)?.name || '?'; 
        const row = document.createElement('div'); 
        row.className = "flex justify-between items-center text-xs text-white/70 bg-white/5 p-2 rounded border border-white/5"; 
        row.innerHTML = `<span>${days[s.day]} คาบ ${s.period}</span> <span class="text-yellow-400 font-bold">${clsName}</span>`; 
        div.appendChild(row); 
    }); 
}

/** 🟢 คืนค่าฟังก์ชันที่หายไป: แสดงรายการเนื้อหาบทเรียนสำหรับ Admin **/
export function renderAdminMaterials() { 
    const div = document.getElementById('admin-mat-list'); 
    if(!div) return;
    div.innerHTML = ''; 
    dataState.materials.forEach(m => { 
        const sub = dataState.subjects.find(s=>s.id == m.subjectId)?.name || '-'; 
        const el = document.createElement('div'); 
        el.className = "bg-white/5 p-3 rounded-xl border border-white/10 flex justify-between items-center mb-2"; 
        el.innerHTML = `<div><div class="text-[10px] text-yellow-400 font-bold uppercase">${sub}</div><div class="font-bold text-sm text-white truncate max-w-[200px]"><a href="${m.link}" target="_blank" class="hover:underline hover:text-blue-400">${m.title}</a></div></div><i class="fa-solid fa-link text-white/20"></i>`; 
        div.appendChild(el); 
    }); 
}

export function renderAttRoster() { 
    const cid = document.getElementById('att-class-select').value;
    const div = document.getElementById('att-roster-grid');
    const date = document.getElementById('att-date-input').value; 
    if(!div) return;
    div.innerHTML = ''; 
    if(!cid) return; 
    let p=0, l=0, a=0, act=0; 
    
    dataState.students.filter(s => s.classId == cid).sort((a,b)=>Number(a.no)-Number(b.no)).forEach(s => { 
        const log = dataState.attendance.find(att => att.studentId==s.id && (att.date == date || (att.date && att.date.substring(0,10) == date))); 
        const st = log ? log.status : 'none'; 
        if(st=='มา') p++; if(st=='ลา') l++; if(st=='ขาด') a++; if(st=='กิจกรรม') act++;
        
        let c = 'status-none';
        if(st=='มา') c = 'status-done';
        else if(st=='ลา') c = 'bg-yellow-500/20 border-yellow-500 text-yellow-500';
        else if(st=='ขาด') c = 'bg-red-500/20 border-red-500 text-red-500';
        else if(st=='กิจกรรม') c = 'bg-orange-500/20 border-orange-500 text-orange-400';

        const el = document.createElement('div'); 
        el.className = `status-box ${c} p-3 flex flex-col items-center justify-center cursor-pointer border hover:scale-105 transition-transform`; 
        el.onclick = () => { if(globalState.attMode) window.saveAndRefresh({action:'addAttendance', studentId:s.id, classId:cid, date:date, status:globalState.attMode}); else showToast("เลือกสถานะก่อนคลิก", "bg-yellow-600"); }; 
        el.innerHTML = `<div class="text-xs opacity-70">No. ${s.no}</div><div class="font-bold text-center text-sm">${s.name}</div><div class="text-[10px] mt-1 font-bold uppercase">${st!=='none'?st:'-'}</div>`; 
        div.appendChild(el); 
    }); 
    document.getElementById('stat-present').textContent = p; 
    document.getElementById('stat-leave').textContent = l; 
    document.getElementById('stat-absent').textContent = a; 
    document.getElementById('stat-activity').textContent = act;
}

// ... [ฟังก์ชัน renderScoreRoster, updateScanTaskDropdown, renderGradeReport คงเดิมตามต้นฉบับ] ...

export function renderStudentDashboard(studentCode) {
    const studentRecords = dataState.students.filter(s => String(s.code) === String(studentCode));
    if (studentRecords.length === 0) return;
    const s = studentRecords[0];
    
    const nameEl = document.getElementById('std-dash-name');
    if(nameEl) nameEl.textContent = s.name;
    const classEl = document.getElementById('std-dash-class');
    if(classEl) classEl.textContent = dataState.classes.find(c => c.id == s.classId)?.name || '-';

    const container = document.getElementById('std-subjects-container'); 
    if(!container) return;
    container.innerHTML = '';
    const today = getThaiDateISO();

    studentRecords.forEach(rec => {
        const cls = dataState.classes.find(c => c.id == rec.classId);
        if (!cls) return;
        const sub = dataState.subjects.find(x => x.id == cls.subjectId);
        if (!sub) return;

        // ดึงงานโดยใช้ classId เป็นหลักเพื่อป้องกันงานหาย
        const tasks = dataState.tasks.filter(t => t.classId == rec.classId);
        const { total, midterm, final } = calculateScores(rec.id, rec.classId, tasks);
        const grade = calGrade(total);

        const card = document.createElement('div');
        card.className = "p-5 glass-ios rounded-3xl border border-white/10 mb-4 animate-fade-in";
        card.innerHTML = `<h3 class="font-bold text-lg text-white mb-2">${sub.name}</h3><div class="flex justify-between text-xs text-blue-200"><span>คะแนนรวม: ${total.toFixed(1)}</span><span>เกรด: ${grade}</span></div>`;
        container.appendChild(card);
    });
}

// --- 3. Main Refresh Function ---

export function refreshUI() {
    refreshDropdowns();
    renderSubjectList();
    renderScheduleList();
    
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
    const code = localStorage.getItem('current_student_code');
    if(code) renderStudentDashboard(code);
}

// ผูกฟังก์ชันเข้ากับ window เพิ่มเติมเพื่อป้องกัน ReferenceError
window.refreshUI = refreshUI;

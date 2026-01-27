import { dataState, globalState } from "./state.js";
import { calculateScores, calGrade, formatThaiDate, getThaiDateISO, showToast } from "./utils.js";

// --- 1. Helper Functions (Dropdowns & Checkboxes) ---

function refreshDropdowns() { 
    const setOpts = (id, list) => { 
        const el = document.getElementById(id); 
        if(!el) return; 
        const cur = el.value; 
        el.innerHTML = '<option value="">-- เลือก --</option>'; 
        list.forEach(i => { 
            const o = document.createElement('option'); 
            o.value = i.id; 
            o.textContent = i.name; 
            el.appendChild(o); 
        }); 
        el.value = cur; 
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
    
    // Dropdowns สำหรับฟอร์มสร้างงานแบบแยกประเภท 3.1 และ 3.2
    setOpts('task-subject-accum', dataState.subjects); 
    setOpts('task-subject-exam', dataState.subjects);  
}

// --- ฟังก์ชันสำหรับโครงสร้างใหม่ (3.1 และ 3.2) ---

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

// --- 🟢 แก้ปัญหา SyntaxError: เพิ่มฟังก์ชันชื่อเดิมกลับเข้าไปเพื่อรองรับ main.js ---

export function renderTaskClassCheckboxes() { renderTaskClassCheckboxesAccum(); }
export function renderTaskChapterCheckboxes() { renderTaskChapterCheckboxesAccum(); }

export function renderConfigSlots() {
    const container = document.getElementById('config-slots-container');
    if(!container) return;
    container.innerHTML = '';
    let total = 0;
    if (globalState.tempConfig) {
        globalState.tempConfig.forEach((score, idx) => {
            total += Number(score);
            const div = document.createElement('div');
            div.className = "flex items-center gap-2 mb-2 animate-fade-in";
            div.innerHTML = `
                <span class="text-white text-xs w-8 font-bold">CH.${idx+1}</span>
                <input type="number" value="${score}" 
                    onchange="window.updateTempConfig(${idx}, this.value)" 
                    class="flex-1 glass-input rounded-lg px-2 py-2 text-center text-sm font-bold text-yellow-400">
                <button onclick="window.removeConfigSlot(${idx})" class="text-red-400 hover:text-red-300 p-2">
                    <i class="fa-solid fa-trash-can"></i>
                </button>`;
            container.appendChild(div);
        });
    }
    const totalEl = document.getElementById('config-total-score');
    if(totalEl) totalEl.textContent = total;
}

// --- ส่วนการผูกฟังก์ชัน (Window Binding) ใน js/ui-render.js ---

window.renderTaskClassCheckboxesAccum = renderTaskClassCheckboxesAccum;
window.renderTaskChapterCheckboxesAccum = renderTaskChapterCheckboxesAccum;
window.renderTaskClassCheckboxesExam = renderTaskClassCheckboxesExam;
window.renderConfigSlots = renderConfigSlots;

// 🟢 เพิ่มบรรทัดนี้เพื่อให้ระบบหาฟังก์ชันเจอ
window.updateScanTaskDropdown = updateScanTaskDropdown; 
window.renderScoreRoster = renderScoreRoster;

// --- 2. Render Functions (Admin) ---

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

export function updateScanTaskDropdown() { 
    const cid = document.getElementById('scan-class-select').value; 
    const el = document.getElementById('scan-task-select'); 
    if(!el) return;
    const currentTaskId = el.value; 
    el.innerHTML = '<option value="">-- เลือกงาน --</option>'; 
    dataState.tasks.filter(t => t.classId == cid).reverse().forEach(t => { 
        const o=document.createElement('option'); 
        o.value=t.id; 
        o.textContent=`${t.name} (Max ${t.maxScore})`; 
        el.appendChild(o); 
    }); 
    if(currentTaskId) el.value = currentTaskId; 
}

export function renderScoreRoster() { 
    const cid = document.getElementById('scan-class-select').value;
    const taskId = document.getElementById('scan-task-select').value;
    const div = document.getElementById('score-roster-grid'); 
    if(!div) return;
    div.innerHTML = ''; 
    if(!cid || !taskId) return; 
    
    dataState.students.filter(s => s.classId == cid).sort((a,b)=>Number(a.no)-Number(b.no)).forEach(s => { 
        const sc = dataState.scores.find(x => x.studentId == s.id && x.taskId == taskId), val = sc ? sc.score : '-'; 
        const el = document.createElement('div'); 
        el.className = `status-box ${sc ? 'status-done' : 'status-none'} p-2 flex flex-col items-center justify-center cursor-pointer`; 
        el.onclick = () => { 
            globalState.pendingScore = { s, t: dataState.tasks.find(t=>t.id==taskId) }; 
            document.getElementById('score-modal').classList.remove('hidden'); 
            document.getElementById('modal-task-name').textContent = globalState.pendingScore.t.name; 
            document.getElementById('modal-student-name').textContent = s.name; 
            document.getElementById('modal-max-score').textContent = globalState.pendingScore.t.maxScore; 
            document.getElementById('modal-score-input').value = val == '-' ? '' : val; 
            setTimeout(() => document.getElementById('modal-score-input').focus(), 100); 
        };
        el.innerHTML = `<div class="text-xs opacity-70">No. ${s.no}</div><div class="font-bold text-center text-xs truncate w-full">${s.name}</div><div class="text-xl font-bold mt-1">${val}</div>`; 
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
        el.className = `status-box ${c} p-3 flex flex-col items-center justify-center cursor-pointer border hover:scale-105 transition-transform shadow-sm`; 
        el.onclick = () => { 
            if(globalState.attMode) window.saveAndRefresh({action:'addAttendance', studentId:s.id, classId:cid, date:date, status:globalState.attMode}); 
            else showToast("เลือกสถานะก่อนคลิก", "bg-yellow-600");
        }; 
        el.innerHTML = `<div class="text-xs opacity-70">No. ${s.no}</div><div class="font-bold text-center text-sm">${s.name}</div><div class="text-[10px] mt-1 font-bold uppercase">${st!=='none'?st:'-'}</div>`; 
        div.appendChild(el); 
    }); 
    document.getElementById('stat-present').textContent = p; 
    document.getElementById('stat-leave').textContent = l; 
    document.getElementById('stat-absent').textContent = a; 
    document.getElementById('stat-activity').textContent = act;
}

export function renderGradeReport() { 
    const cid = document.getElementById('report-class').value;
    const thead = document.getElementById('report-table-header');
    const tbody = document.getElementById('report-table-body'); 
    if(!tbody) return;
    tbody.innerHTML = ''; thead.innerHTML = '';
    
    if(!cid) return; 
    
    const cls = dataState.classes.find(c => c.id == cid);
    const subj = dataState.subjects.find(s => s.id == cls.subjectId);
    const config = (subj && subj.scoreConfig && subj.scoreConfig.length > 0) ? subj.scoreConfig : Array(5).fill(10);
    
    let hHTML = `<th class="px-2 py-4 text-center">#</th><th class="px-2 py-4 text-left min-w-[150px]">ชื่อ-นามสกุล</th>`;
    config.forEach((m, i) => hHTML += `<th class="px-1 py-4 text-center text-yellow-400">CH${i+1}<br><span class="text-[9px] opacity-50">(${m})</span></th>`);
    hHTML += `<th class="px-1 py-4 text-center text-blue-400">กลาง</th><th class="px-1 py-4 text-center text-red-400">ปลาย</th><th class="px-2 py-4 text-center text-white font-bold bg-white/10">รวม</th><th class="px-2 py-4 text-center">เกรด</th>`;
    thead.innerHTML = hHTML;

    const tasks = dataState.tasks.filter(t => t.classId == cid);
    
    dataState.students.filter(s => s.classId == cid).sort((a,b)=>Number(a.no)-Number(b.no)).forEach((s, idx) => { 
        const { chapScores, midterm, final, total, midtermRaw, midtermHelp, finalRaw, finalHelp } = calculateScores(s.id, cid, tasks);
        const grade = calGrade(total);
        
        const tr = document.createElement('tr'); 
        tr.className = "hover:bg-white/5 transition-colors"; 
        
        let html = `<td class="text-center text-white/50">${s.no||idx+1}</td><td class="px-2 py-3 text-white text-xs">${s.name}</td>`;
        chapScores.slice(0, config.length).forEach(score => {
            let roundedScore = Math.round(Number(score)); 
            html += `<td class="text-center text-yellow-400 font-mono">${roundedScore}</td>`;
        });
        
        let midDisplay = Number(midterm).toFixed(0);
        if (midtermHelp > 0) {
            midDisplay = `<div class="flex flex-col items-center leading-tight"><span class="font-bold">${midtermRaw}</span><span class="text-[9px] text-green-400 font-bold">+${midtermHelp}</span></div>`;
        }

        let finalDisplay = Number(final).toFixed(0);
        if (finalHelp > 0) {
            finalDisplay = `<div class="flex flex-col items-center leading-tight"><span class="font-bold">${finalRaw}</span><span class="text-[9px] text-green-400 font-bold">+${finalHelp}</span></div>`;
        }

        html += `<td class="text-center text-blue-400 font-bold">${midDisplay}</td><td class="text-center text-red-400 font-bold">${finalDisplay}</td><td class="text-center font-bold text-white bg-white/10 text-lg">${Number(total).toFixed(1)}</td><td class="text-center text-green-400 font-bold text-xl drop-shadow-md">${grade}</td>`;
        
        tr.innerHTML = html; 
        tbody.appendChild(tr); 
    }); 
}

export function renderExamPanel() {
    const panel = document.getElementById('admin-panel-exam');
    if (!panel || panel.classList.contains('hidden')) return;

    const classSelect = document.getElementById('exam-class-select');
    if(classSelect && classSelect.options.length <= 1) { 
        classSelect.innerHTML = '<option value="">-- เลือกห้องเรียน --</option>';
        dataState.classes.forEach(c => {
            const o = document.createElement('option');
            o.value = c.id;
            o.textContent = c.name;
            classSelect.appendChild(o);
        });
    }

    const classId = classSelect.value;
    const tbody = document.getElementById('exam-table-body');
    const maxInput = document.getElementById('exam-max-score');
    if(!tbody) return;
    tbody.innerHTML = '';

    if (!classId) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center py-10 text-white/30">กรุณาเลือกห้องเรียน</td></tr>';
        return;
    }

    const type = globalState.currentExamType || 'midterm';
    let task = dataState.tasks.find(t => t.classId == classId && t.category === type);
    
    if (task) {
        if(maxInput) maxInput.value = task.maxScore;
    } else {
        if(maxInput) maxInput.value = type === 'midterm' ? 20 : 30;
    }

    const students = dataState.students.filter(s => s.classId == classId).sort((a, b) => Number(a.no) - Number(b.no));
    
    if(students.length === 0) {
         tbody.innerHTML = '<tr><td colspan="3" class="text-center py-10 text-white/30">ไม่พบนักเรียนในห้องนี้</td></tr>';
         return;
    }

    students.forEach(s => {
        let scoreVal = '';
        if (task) {
            const sc = dataState.scores.find(x => x.studentId == s.id && x.taskId == task.id);
            if (sc) scoreVal = sc.score;
        }

        const tr = document.createElement('tr');
        tr.className = "hover:bg-white/5 transition-colors border-b border-white/5 last:border-0";
        tr.innerHTML = `<td class="px-4 py-3 text-center text-white/50">${s.no}</td><td class="px-4 py-3 text-white"><div class="font-bold text-sm">${s.name}</div><div class="text-[10px] text-white/30">${s.code}</div></td><td class="px-4 py-3 text-center"><input type="number" value="${scoreVal}" onblur="window.saveExamScore('${s.id}', this.value)" onkeydown="if(event.key==='Enter') this.blur()" class="w-24 glass-input rounded-lg px-2 py-2 text-center font-bold text-yellow-400 focus:bg-white/10 outline-none text-lg" placeholder="-"></td>`;
        tbody.appendChild(tr);
    });
}

export function renderIncomingSubmissions() { 
    const container = document.getElementById('incoming-list'); 
    if(!container) return;
    container.innerHTML = ''; 
    let pending = dataState.submissions.filter(sub => !dataState.scores.some(sc => sc.taskId == sub.taskId && sc.studentId == sub.studentId));
    pending.sort((a,b) => new Date(b.timestampISO) - new Date(a.timestampISO)); 
    if(pending.length === 0) { container.innerHTML = '<div class="text-center text-white/50 py-10">ไม่มีงานที่รอตรวจ</div>'; return; } 
    const groups = {};
    pending.forEach(sub => { const key = `${sub.taskId}|${sub.link}`; if (!groups[key]) { groups[key] = { taskId: sub.taskId, link: sub.link, comment: sub.comment, timestampISO: sub.timestampISO, students: [] }; } const s = dataState.students.find(st => st.id == sub.studentId); if(s) groups[key].students.push(s); });
    Object.values(groups).forEach(group => {
        const task = dataState.tasks.find(t => t.id == group.taskId); if(!task || group.students.length === 0) return;
        group.students.sort((a,b) => Number(a.no) - Number(b.no));
        const names = group.students.map(s => `<span class="text-yellow-400 font-bold">${s.name} (No.${s.no})</span>`).join(', ');
        const studentIdsStr = group.students.map(s => s.id).join(',');
        const div = document.createElement('div'); div.className = "bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col gap-3"; 
        div.innerHTML = `<div class="flex justify-between items-start"><div><span class="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-0.5 rounded font-bold">${dataState.classes.find(c=>c.id==group.students[0].classId)?.name || '-'}</span><h4 class="font-bold text-white text-sm mt-1">${task.name}</h4><div class="text-xs text-white/70 mt-1 leading-relaxed"><i class="fa-solid fa-users text-blue-400 mr-1"></i> ${names}</div></div><a href="${group.link}" target="_blank" class="text-blue-400 text-xs hover:underline flex-shrink-0"><i class="fa-solid fa-link"></i> เปิดงาน</a></div>${group.comment ? `<div class="bg-black/20 p-2 rounded text-xs text-white/70 border-l-2 border-blue-500">"${group.comment}"</div>` : ''}<div class="flex gap-2 items-center pt-2 border-t border-white/5"><input id="grade-group-${group.taskId}-${group.link.replace(/[^a-zA-Z0-9]/g, '')}" type="number" class="glass-input rounded px-2 py-1 text-xs w-20 text-center" placeholder="Max ${task.maxScore}"><button onclick="window.submitGroupGrade('${studentIdsStr}', '${group.taskId}', '${task.maxScore}', 'grade-group-${group.taskId}-${group.link.replace(/[^a-zA-Z0-9]/g, '')}')" class="btn-blue px-3 py-1 rounded text-xs font-bold shadow-lg">ให้คะแนนกลุ่ม</button><button onclick="window.returnGroupWork('${studentIdsStr}', '${group.taskId}')" class="btn-yellow px-3 py-1 rounded text-xs">ส่งคืน</button></div>`; 
        container.appendChild(div); 
    });
}

function updateInboxBadge() { 
    let count = 0; 
    dataState.submissions.forEach(sub => { if(!dataState.scores.find(sc => sc.taskId == sub.taskId && sc.studentId == sub.studentId)) count++; }); 
    const badge = document.getElementById('badge-homework'); 
    if(badge) { badge.textContent = count; badge.classList.toggle('hidden', count === 0); } 
}

// --- 3. Render Functions (Student Dashboard) ---
// --- แก้ไขฟังก์ชันนี้ใน js/ui-render.js ---

export function renderStudentDashboard(studentCode) {
    const studentRecords = dataState.students.filter(s => String(s.code) === String(studentCode));
    if (studentRecords.length === 0) return;
    const mainProfile = studentRecords[0];
    
    // ตรวจสอบอีเมล
    if (!mainProfile.email || mainProfile.email === "") { window.openEmailModal('student'); }
    
    const nameEl = document.getElementById('std-dash-name');
    if(nameEl) nameEl.textContent = mainProfile.name;
    const classEl = document.getElementById('std-dash-class');
    if(classEl) classEl.textContent = [...new Set(studentRecords.map(s => dataState.classes.find(c => c.id == s.classId)?.name))].filter(Boolean).join(', ');

    const container = document.getElementById('std-subjects-container'); 
    if(!container) return;
    container.innerHTML = '';
    const today = getThaiDateISO();

    studentRecords.forEach(s => {
        const currentClass = dataState.classes.find(c => c.id == s.classId);
        if (!currentClass) return;
        const subj = dataState.subjects.find(sub => sub.id == currentClass.subjectId);
        if (!subj) return;

        const tasks = dataState.tasks.filter(t => t.classId == s.classId);
        const { midterm, final, total } = calculateScores(s.id, s.classId, tasks); 
        const grade = calGrade(total);
        const atts = dataState.attendance.filter(a => a.studentId == s.id);
        
        let p=0, l=0, a=0, act=0;
        atts.forEach(att => { 
            if(att.status == 'มา') p++; else if(att.status == 'ลา') l++; else if(att.status == 'ขาด') a++; else if(att.status == 'กิจกรรม') act++; 
        });

        // ส่วนแสดงเนื้อหาบทเรียน
        const subjectMaterials = dataState.materials.filter(m => m.subjectId == subj.id);
        let matHTML = '';
        if (subjectMaterials.length > 0) {
            matHTML = `<div class="mt-4 border-t border-white/10 pt-4"><h4 class="text-[10px] font-bold text-white/40 mb-2 uppercase tracking-widest">📚 เนื้อหาบทเรียน</h4><div class="grid grid-cols-1 gap-2">`;
            subjectMaterials.forEach(m => {
                matHTML += `<a href="${m.link}" target="_blank" class="bg-white/5 p-2 rounded-lg flex items-center justify-between hover:bg-white/10 border border-white/5"><span class="text-xs text-white/80 truncate">${m.title}</span><i class="fa-solid fa-arrow-up-right-from-square text-[10px] text-white/30"></i></a>`;
            });
            matHTML += `</div></div>`;
        }

        const card = document.createElement('div');
        card.className = "flex flex-col gap-6 p-5 bg-gradient-to-r from-blue-900/40 to-blue-600/20 rounded-2xl border border-blue-500/30 mb-6 shadow-xl animate-fade-in";
        
        let contentHTML = `
        <div class="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl shadow-lg text-white">📚</div>
                <div><h2 class="text-xl font-bold text-white">${subj.name}</h2><p class="text-blue-200 text-sm">ห้องเรียน: ${currentClass.name} | เกรด: <span class="text-yellow-400 font-bold">${grade}</span></p></div>
            </div>
            <div class="flex gap-4 bg-black/20 p-3 rounded-xl">
                <div class="text-center px-4 border-r border-white/10"><div class="text-[10px] text-white/50 uppercase">กลางภาค</div><div class="mt-1 text-lg text-blue-300 font-bold">${midterm}</div></div>
                <div class="text-center px-4"><div class="text-[10px] text-white/50 uppercase">ปลายภาค</div><div class="mt-1 text-lg text-red-300 font-bold">${final}</div></div>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="glass-ios p-5 rounded-2xl border border-white/10">
                <h3 class="text-sm font-bold text-white mb-4 flex items-center"><i class="fa-solid fa-user-clock mr-2 text-green-400"></i>การเข้าเรียน</h3>
                <div class="grid grid-cols-4 gap-2 text-center">
                    <div class="bg-green-500/10 p-2 rounded-xl border border-green-500/20"><div class="text-xl font-bold text-green-400">${p}</div><div class="text-[9px] text-white/50 uppercase">มา</div></div>
                    <div class="bg-yellow-500/10 p-2 rounded-xl border border-yellow-500/20"><div class="text-xl font-bold text-yellow-400">${l}</div><div class="text-[9px] text-white/50 uppercase">ลา</div></div>
                    <div class="bg-red-500/10 p-2 rounded-xl border border-red-500/20"><div class="text-xl font-bold text-red-400">${a}</div><div class="text-[9px] text-white/50 uppercase">ขาด</div></div>
                    <div class="bg-orange-500/10 p-2 rounded-xl border border-orange-500/20"><div class="text-xl font-bold text-orange-400">${act}</div><div class="text-[9px] text-white/50 uppercase">กิจกรรม</div></div>
                </div>
            </div>
            <div class="glass-ios p-5 rounded-2xl border border-white/10">
                <h3 class="text-sm font-bold text-white mb-4 flex items-center"><i class="fa-solid fa-list-check mr-2 text-yellow-400"></i>สถานะงาน</h3>
                <div class="space-y-2 max-h-60 overflow-y-auto pr-1">`;

        const sortedTasks = [...tasks].sort((a,b) => (a.dueDateISO > b.dueDateISO ? 1 : -1));
        if (sortedTasks.length === 0) { contentHTML += `<div class="text-center text-xs text-white/30 py-4">ไม่มีงานค้าง</div>`; }

        sortedTasks.forEach(t => {
            const sc = dataState.scores.find(x => x.studentId == s.id && x.taskId == t.id);
            const submission = dataState.submissions.find(x => x.studentId == s.id && x.taskId == t.id);
            const isLate = t.dueDateISO < today;
            
            let bg = "bg-white/5"; 
            let st = `<span class="text-[10px] text-white/30">รอส่ง</span>`;
            let btn = ''; // 🟢 ตัวแปรสำหรับปุ่มส่งงาน

            if (sc) { 
                bg="bg-green-500/10"; 
                st=`<span class="text-[10px] text-green-400 font-bold">ตรวจแล้ว (${sc.score})</span>`; 
            } else if (submission) { 
                bg="bg-blue-500/10"; 
                st=`<span class="text-[10px] text-blue-300">รอตรวจ</span>`; 
            } else {
                // กรณีที่ยังไม่มีคะแนนและยังไม่ส่งงาน
                if (isLate) { 
                    bg="bg-red-500/10"; 
                    st=`<span class="text-[10px] text-red-400 font-bold">เลยกำหนด</span>`; 
                }
                // 🟢 เพิ่มปุ่มส่งงานตรงนี้
                btn = `<button onclick="window.openSubmitModal('${t.id}', '${s.id}', '${t.name}')" class="ml-2 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] text-white border border-white/5 transition-all shadow-sm">ส่งงาน</button>`;
            }

            contentHTML += `<div class="flex items-center justify-between p-2 rounded-lg border border-white/5 ${bg}">
                <span class="text-xs text-white truncate flex-1 mr-2">${t.name}</span>
                <div class="flex items-center gap-2">${st}${btn}</div>
            </div>`;
        });
        
        contentHTML += `</div></div></div> ${matHTML}`; 
        card.innerHTML = contentHTML; 
        container.appendChild(card);
    });
}

// --- 4. Main Refresh Function ---

export function refreshUI() {
    refreshDropdowns();
    renderSubjectList();
    renderScheduleList();
    
    const panels = [
        { id: 'admin-panel-scan', fn: () => { window.updateScanTaskDropdown(); window.renderScoreRoster(); } },
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

window.refreshUI = refreshUI;



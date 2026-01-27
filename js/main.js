// 🟢 เพิ่ม backupToGoogleSheet ในการ import
import { syncData, saveAndRefresh, backupToGoogleSheet } from './firebase-service.js';
import { dataState, globalState, loadFromLocalStorage, updateLocalState, saveToLocalStorage } from "./state.js";
import { 
    refreshUI, 
    renderScoreRoster, 
    renderAttRoster, 
    renderGradeReport, 
    updateScanTaskDropdown, 
    renderStudentDashboard, 
    renderConfigSlots, 
    renderTaskClassCheckboxesAccum, 
    renderTaskChapterCheckboxesAccum, 
    renderTaskClassCheckboxesExam,
    renderIncomingSubmissions, 
    renderAdminMaterials, 
    renderExamPanel 
} from "./ui-render.js";
import { getThaiDateISO, formatThaiDate, calGrade, showToast, showLoading, hideLoading, calculateScores } from "./utils.js";
import { PERIODS } from "./config.js";

// --- Global Functions (Exposed to Window for HTML onclick) ---
window.saveAndRefresh = saveAndRefresh;

// 🛠 ฟังก์ชันสลับแท็บหลัก
window.switchMainTab = function(t) { 
    document.getElementById('section-admin').classList.add('hidden'); 
    document.getElementById('section-student').classList.add('hidden'); 
    document.getElementById(`section-${t}`).classList.remove('hidden'); 
    
    const btnA = document.getElementById('tab-btn-admin');
    const btnS = document.getElementById('tab-btn-student');

    if(t === 'admin'){ 
        btnA.className="px-6 py-2 rounded-full text-sm font-bold bg-white text-blue-900 shadow-lg transition-all"; 
        btnS.className="px-6 py-2 rounded-full text-sm font-bold text-white/50 hover:text-white transition-all"; 
    } else { 
        btnS.className="px-6 py-2 rounded-full text-sm font-bold bg-white text-blue-900 shadow-lg transition-all"; 
        btnA.className="px-6 py-2 rounded-full text-sm font-bold text-white/50 hover:text-white transition-all"; 
    }
}

// 🛠 ฟังก์ชันสลับเมนูย่อยของ Admin
window.switchAdminSubTab = function(t) {
    document.querySelectorAll('.admin-panel').forEach(p=>p.classList.add('hidden')); 
    document.getElementById(`admin-panel-${t}`).classList.remove('hidden'); 
    
    document.querySelectorAll('.menu-btn').forEach(b => { b.className="menu-btn glass-ios hover:bg-white/10 text-white/70 rounded-2xl py-3 font-bold"; }); 
    const activeBtn = document.getElementById(`menu-${t}`); 
    if(activeBtn) activeBtn.className="menu-btn btn-blue rounded-2xl py-3 font-bold shadow-lg text-white"; 
    
    if(t === 'exam') {
        renderExamPanel();
    } else {
        refreshUI();
    }
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
    const inputId = document.getElementById('student-login-id').value.trim();
    if (!inputId) return alert("กรุณากรอกรหัสนักเรียน");
    
    if (dataState.students.length === 0) {
        showLoading("กำลังโหลดฐานข้อมูล...");
        await new Promise(r => setTimeout(r, 1000));
    }

    const student = dataState.students.find(s => String(s.code) === String(inputId) || String(s.id) === String(inputId));
    hideLoading();

    if (student) {
        localStorage.setItem('current_student_code', student.code);
        document.getElementById('student-login-wrapper').classList.add('hidden');
        document.getElementById('student-dashboard').classList.remove('hidden');
        renderStudentDashboard(student.code);
        showToast(`ยินดีต้อนรับ ${student.name}`);
    } else {
        showToast("ไม่พบรายชื่อนี้ในระบบ", "bg-red-600 border-red-400", "fa-solid fa-circle-xmark text-2xl");
    }
}

// --- Email Modal Functions ---
window.openEmailModal = function(role) {
    document.getElementById('email-modal').classList.remove('hidden');
    document.getElementById('email-modal-role').value = role;
    const closeBtn = document.getElementById('btn-close-email');
    let currentEmail = "";
    if (role === 'admin') { currentEmail = localStorage.getItem('admin_email') || ""; } 
    else { const code = localStorage.getItem('current_student_code'); const s = dataState.students.find(x => x.code == code); if(s && s.email) currentEmail = s.email; }
    document.getElementById('user-email-input').value = currentEmail;
    if (!currentEmail) { closeBtn.classList.add('hidden'); } else { closeBtn.classList.remove('hidden'); }
}

window.saveUserEmail = async function() {
    const emailInput = document.getElementById('user-email-input');
    const email = emailInput.value.trim();
    const role = document.getElementById('email-modal-role').value;
    
    if(!email.includes('@')) return alert("รูปแบบอีเมลไม่ถูกต้อง");
    showLoading("กำลังบันทึกอีเมล...");

    try {
        let payload = { action: 'updateEmail', email: email };
        if (role === 'admin') {
            localStorage.setItem('admin_email', email);
            await new Promise(r => setTimeout(r, 500)); 
        } else {
            const code = localStorage.getItem('current_student_code');
            const s = dataState.students.find(x => x.code == code);
            if (s) {
                payload.studentId = s.id;
                await saveAndRefresh(payload);
            } else {
                throw new Error("Student not found");
            }
        }
        document.getElementById('email-modal').classList.add('hidden');
        showToast("บันทึกข้อมูลเรียบร้อย");
    } catch (error) {
        alert("บันทึกไม่สำเร็จ: " + error.message);
    } finally {
        hideLoading();
    }
}

// --- Subject Config Functions ---
window.openSubjectConfig = function(subjectId) {
    document.getElementById('subject-config-modal').classList.remove('hidden');
    document.getElementById('config-subject-id').value = subjectId;
    const sub = dataState.subjects.find(s => s.id == subjectId);
    document.getElementById('config-subject-name').textContent = sub ? sub.name : '-';
    
    globalState.tempConfig = (sub && sub.scoreConfig && sub.scoreConfig.length > 0) ? [...sub.scoreConfig] : [10,10,10,10,10];
    renderConfigSlots();
}

window.addConfigSlot = function() {
    globalState.tempConfig.push(10);
    renderConfigSlots();
}

window.removeConfigSlot = function(idx) {
    globalState.tempConfig.splice(idx, 1);
    renderConfigSlots();
}

window.updateTempConfig = function(idx, val) {
    globalState.tempConfig[idx] = Number(val);
    renderConfigSlots();
}

window.saveSubjectConfig = function() {
    const subId = document.getElementById('config-subject-id').value;
    saveAndRefresh({ action: 'updateSubjectConfig', id: subId, config: globalState.tempConfig });
    document.getElementById('subject-config-modal').classList.add('hidden');
    showToast("บันทึกโครงสร้างคะแนนแล้ว");
}

// --- Score & Attendance Functions ---
window.setScoreMode = function(m) { 
    globalState.scoreMode = m; 
    document.querySelectorAll('.btn-score').forEach(b => { 
        b.classList.remove('btn-score-active'); 
        if(b.textContent == m) b.classList.add('btn-score-active'); 
    }); 
    if(m=='manual') document.getElementById('btn-score-manual').classList.add('btn-score-active'); 
    else document.getElementById('btn-score-manual').classList.remove('btn-score-active'); 
    document.getElementById('scan-score-input').focus(); 
}

window.setAttMode = function(mode) {
    globalState.attMode = mode; 
    
    ['present','leave','absent','activity'].forEach(t => { 
        const el = document.getElementById(`btn-att-${t}`);
        if(el) el.classList.remove(`btn-att-active-${t}`); 
    });
    
    let btnMap = { 'มา': 'present', 'ลา': 'leave', 'ขาด': 'absent', 'กิจกรรม': 'activity' };
    let btnId = btnMap[mode];
    
    if(btnId) {
        const activeBtn = document.getElementById(`btn-att-${btnId}`);
        if(activeBtn) activeBtn.classList.add(`btn-att-active-${btnId}`);
    }
    
    document.getElementById('att-scan-input').focus();
    showToast(`โหมดเช็คชื่อ: ${mode}`, "bg-blue-600");
}

window.closeScoreModal = function() {
    document.getElementById('score-modal').classList.add('hidden');
    document.getElementById('scan-score-input').value = '';
    setTimeout(()=>document.getElementById('scan-score-input').focus(), 100);
}

window.useSmartClass = function() { 
    if(globalState.smartClassId) { 
        document.getElementById('att-class-select').value = globalState.smartClassId; 
        renderAttRoster(); 
    } 
}

window.searchIndividual = function(keyword) {
    const container = document.getElementById('individual-search-results');
    container.innerHTML = '';
    if(!keyword) { container.classList.add('hidden'); return; }
    const results = dataState.students.filter(s => s.name.includes(keyword) || String(s.code).includes(keyword) || String(s.no) == keyword);
    if(results.length > 0) {
        container.classList.remove('hidden');
        results.forEach(s => {
            const div = document.createElement('div');
            div.className = "p-3 hover:bg-white/10 cursor-pointer text-white border-b border-white/5 last:border-0";
            div.innerHTML = `<div class="font-bold text-sm">${s.name}</div><div class="text-xs text-white/50">${s.code}</div>`;
            div.onclick = () => { 
                document.getElementById('individual-result-container').classList.remove('hidden');
                document.getElementById('ind-name').textContent = s.name;
                document.getElementById('ind-id').textContent = s.code;
                document.getElementById('ind-class').textContent = dataState.classes.find(c=>c.id==s.classId)?.name || '-';

                const tasks = dataState.tasks.filter(t => t.classId == s.classId);
                const { total, midterm, final } = calculateScores(s.id, s.classId, tasks);
                document.getElementById('ind-gpa').textContent = calGrade(total);
                document.getElementById('ind-score-mid').textContent = midterm || '-';
                document.getElementById('ind-score-final').textContent = final || '-';

                const atts = dataState.attendance.filter(a => a.studentId == s.id);
                let p=0, l=0, a=0, act=0, aDates=[];
                atts.forEach(att => {
                    if(att.status === 'มา') p++;
                    else if(att.status === 'ลา') l++;
                    else if(att.status === 'ขาด') { a++; aDates.push(formatThaiDate(att.date)); }
                    else if(att.status === 'กิจกรรม') act++;
                });

                document.getElementById('ind-att-present').textContent = p;
                document.getElementById('ind-att-leave').textContent = l;
                document.getElementById('ind-att-absent').textContent = a;
                document.getElementById('ind-att-activity').textContent = act;
                
                const absentDiv = document.getElementById('ind-absent-dates');
                absentDiv.innerHTML = aDates.length > 0 ? aDates.map(d => `<span class="inline-block bg-red-500/20 text-red-200 px-1.5 py-0.5 rounded text-[10px] mr-1 mb-1">${d}</span>`).join('') : '<span class="text-green-400/60 text-xs">ไม่มีประวัติการขาดเรียน</span>';

                const allTasks = tasks;
                const submittedIds = [];
                dataState.scores.forEach(sc => { if(sc.studentId == s.id) submittedIds.push(sc.taskId); });
                dataState.submissions.forEach(sub => { if(sub.studentId == s.id) submittedIds.push(sub.taskId); });
                
                const uniqueSubmitted = [...new Set(submittedIds)];
                const totalCount = allTasks.length;
                const doneCount = uniqueSubmitted.filter(id => allTasks.find(t => t.id == id)).length;
                const percent = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

                document.getElementById('ind-work-progress-text').textContent = `${percent}%`;
                document.getElementById('ind-work-bar').style.width = `${percent}%`;

                const missingListDiv = document.getElementById('ind-missing-list');
                missingListDiv.innerHTML = '';
                const missingTasks = allTasks.filter(t => !uniqueSubmitted.includes(t.id));
                
                if (missingTasks.length > 0) {
                    missingTasks.forEach(t => {
                        const el = document.createElement('div');
                        el.className = "bg-white/5 p-2 rounded border-l-2 border-red-400 flex items-center justify-between";
                        el.innerHTML = `<span class="text-xs text-white/80 truncate">${t.name}</span><span class="text-xs text-red-400">ยังไม่ส่ง</span>`;
                        missingListDiv.appendChild(el);
                    });
                } else {
                    missingListDiv.innerHTML = `<div class="text-center py-2 text-green-400 text-xs"><i class="fa-solid fa-check-circle mr-1"></i>ส่งงานครบแล้ว</div>`;
                }

                container.classList.add('hidden'); 
                document.getElementById('individual-search').value = '';
            };
            container.appendChild(div);
        });
    } else { container.classList.add('hidden'); }
}

// --- Submission Functions ---
window.openSubmitModal = function(taskId, studentId, taskName) {
    document.getElementById('submit-modal').classList.remove('hidden');
    document.getElementById('submit-task-id').value = taskId;
    document.getElementById('submit-student-id').value = studentId;
    document.getElementById('submit-modal-title').textContent = taskName;
    document.getElementById('submit-link-input').value = '';
    document.getElementById('submit-comment-input').value = '';
    document.getElementById('friend-selector-container').innerHTML = '';
    const student = dataState.students.find(s => s.id == studentId);
    if(student) {
        const friends = dataState.students.filter(s => s.classId == student.classId && s.id != studentId);
        const container = document.getElementById('friend-selector-container');
        friends.forEach(f => {
            const div = document.createElement('div');
            div.className = "friend-item flex items-center gap-2 p-2 hover:bg-white/5 rounded cursor-pointer";
            div.innerHTML = `<input type="checkbox" value="${f.id}" class="friend-checkbox accent-blue-500"><span class="text-xs text-white/80">${f.name}</span>`;
            container.appendChild(div);
        });
    }
}

window.submitGroupGrade = async function(studentIdsStr, taskId, max, inputId) { 
    const val = document.getElementById(inputId).value; 
    if(val === '') return alert("กรุณาใส่คะแนน"); 
    if(Number(val) > Number(max)) return alert("คะแนนเกินค่าเต็ม"); 
    const sids = studentIdsStr.split(','); 
    for (const sid of sids) updateLocalState({ action:'addScore', studentId: sid, taskId: taskId, score: val }); 
    refreshUI();
    sids.forEach(sid => saveAndRefresh({ action:'addScore', studentId: sid, taskId: taskId, score: val })); 
    showToast(`บันทึกคะแนนกลุ่มเรียบร้อย`, "bg-green-600");
}

window.returnGroupWork = async function(studentIdsStr, taskId) { 
    const reason = prompt("ระบุเหตุผลที่ส่งคืน (สมาชิกทุกคนจะเห็นข้อความนี้):"); 
    if(reason) { 
        const sids = studentIdsStr.split(','); 
        for (const sid of sids) updateLocalState({ action:'returnForRevision', studentId: sid, taskId: taskId, comment: reason }); 
        refreshUI();
        sids.forEach(sid => saveAndRefresh({ action:'returnForRevision', studentId: sid, taskId: taskId, comment: reason })); 
        showToast("ส่งคืนงานเรียบร้อย", "bg-yellow-600");
    } 
}

// --- NEW EXAM FUNCTIONS (Import CSV & Grading) ---

window.setExamTab = function(type) {
    globalState.currentExamType = type;
    
    const btnMid = document.getElementById('tab-exam-mid');
    const btnFinal = document.getElementById('tab-exam-final');
    
    if(type === 'midterm') {
        btnMid.className = "px-6 py-2 rounded-lg text-sm font-bold bg-blue-600 text-white shadow-lg transition-all";
        btnFinal.className = "px-6 py-2 rounded-lg text-sm font-bold text-white/50 hover:text-white transition-all";
    } else {
        btnFinal.className = "px-6 py-2 rounded-lg text-sm font-bold bg-red-600 text-white shadow-lg transition-all";
        btnMid.className = "px-6 py-2 rounded-lg text-sm font-bold text-white/50 hover:text-white transition-all";
    }
    
    renderExamPanel();
}

window.renderExamPanel = renderExamPanel;

window.updateExamConfig = async function() {
    const classId = document.getElementById('exam-class-select').value;
    const max = document.getElementById('exam-max-score').value;
    const type = globalState.currentExamType || 'midterm';
    
    if(!classId) return alert("กรุณาเลือกห้องเรียน");
    
    let task = dataState.tasks.find(t => t.classId == classId && t.category === type);
    const subId = dataState.classes.find(c => c.id == classId).subjectId;
    
    const name = type === 'midterm' ? 'สอบกลางภาค' : 'สอบปลายภาค';
    
    if(task) {
        alert(`บันทึกค่าคะแนนเต็ม (${max}) สำหรับ ${name} เรียบร้อย`);
        task.maxScore = max; 
        saveToLocalStorage(); 
    } else {
        await saveAndRefresh({
            action: 'addTask',
            id: Date.now(),
            classIds: [classId],
            subjectId: subId,
            category: type,
            chapter: [],
            name: name,
            maxScore: max,
            dueDateISO: getThaiDateISO()
        });
        showToast("สร้างรายการสอบเรียบร้อย");
    }
    renderExamPanel();
}

window.saveExamScore = function(studentId, val) {
    const classId = document.getElementById('exam-class-select').value;
    const type = globalState.currentExamType || 'midterm';
    const task = dataState.tasks.find(t => t.classId == classId && t.category === type);
    
    if(!task) return alert("กรุณากดบันทึกตั้งค่าคะแนนเต็มก่อน");
    if(val !== '' && Number(val) > Number(task.maxScore)) return alert("คะแนนเกินค่าเต็ม");
    
    updateLocalState({ action: 'addScore', studentId: studentId, taskId: task.id, score: val });
    saveAndRefresh({ action: 'addScore', studentId: studentId, taskId: task.id, score: val });
}

window.processExamCSV = function() {
    const fileInput = document.getElementById('exam-csv-input');
    const file = fileInput.files[0];
    if (!file) return;

    const classId = document.getElementById('exam-class-select').value;
    const type = globalState.currentExamType || 'midterm';
    const task = dataState.tasks.find(t => t.classId == classId && t.category === type);

    if(!task) return alert("ไม่พบรายการสอบ กรุณาตั้งค่าคะแนนเต็มก่อน");

    const reader = new FileReader();
    reader.onload = async function(e) {
        const text = e.target.result;
        const rows = text.split('\n');
        let successCount = 0;
        let errorCount = 0;

        showLoading("กำลังนำเข้าคะแนน...");

        for (let row of rows) {
            const cols = row.split(',').map(c => c.trim().replace(/"/g, ''));
            if(cols.length < 2) continue;

            const code = cols[0];
            const score = cols[1];
            
            const student = dataState.students.find(s => String(s.code) === String(code) && s.classId == classId);
            
            if (student && !isNaN(score) && score !== "") {
                if(Number(score) <= Number(task.maxScore)) {
                    updateLocalState({ action: 'addScore', studentId: student.id, taskId: task.id, score: score });
                    successCount++;
                } else {
                    errorCount++; 
                }
            } else {
                errorCount++; 
            }
        }

        saveToLocalStorage();
        refreshUI();
        renderExamPanel(); 
        hideLoading();
        
        fileInput.value = '';
        document.getElementById('csv-file-name').textContent = "- ยังไม่เลือกไฟล์ -";
        
        alert(`นำเข้าสำเร็จ ${successCount} รายการ\n(ไม่พบข้อมูล/ผิดพลาด ${errorCount} รายการ)`);
        
        if(successCount > 0) {
            showToast("ข้อมูลถูกบันทึกเรียบร้อย", "bg-green-600");
             saveAndRefresh({ action: 'keepAlive' }); 
        }
    };
    reader.readAsText(file);
}

// --- Report Functions ---
window.printOfficialReport = function() {
    window.print();
}

// --- CSV Exports ---
window.exportGradeCSV = function() {
    const classId = document.getElementById('report-class').value;
    if (!classId) return alert("กรุณาเลือกห้องเรียนก่อนดาวน์โหลด CSV");
    
    const mode = document.querySelector('input[name="reportType"]:checked').value;
    const currentClass = dataState.classes.find(c => c.id == classId);
    const subj = dataState.subjects.find(s => s.id == currentClass.subjectId);
    const students = dataState.students.filter(s => s.classId == classId).sort((a, b) => Number(a.no) - Number(b.no));
    const tasks = dataState.tasks.filter(t => t.classId == classId);
    
    let csvContent = "\uFEFF"; 
    
    if (mode === 'summary') {
        const config = (subj && subj.scoreConfig && subj.scoreConfig.length > 0) ? subj.scoreConfig : Array(5).fill(10);
        let headerRow = ["เลขที่", "รหัสนักเรียน", "ชื่อ-นามสกุล"];
        config.forEach((m, i) => headerRow.push(`CH${i+1} (${m})`));
        headerRow.push("กลางภาค", "ปลายภาค", "รวม", "เกรด");
        csvContent += headerRow.join(",") + "\n";
        
        students.forEach(s => {
            const { chapScores, midterm, final, total } = calculateScores(s.id, classId, tasks);
            let row = [s.no, `"${s.code}"`, `"${s.name}"`];
            chapScores.slice(0, config.length).forEach(sc => row.push(Math.round(sc)));
            row.push(midterm, final, Number(total).toFixed(1), calGrade(total));
            csvContent += row.join(",") + "\n";
        });
    } else {
        let headerRow = ["เลขที่", "รหัสนักเรียน", "ชื่อ-นามสกุล"];
        const accumTasks = tasks.filter(t => t.category === 'accum').sort((a,b) => a.id - b.id);
        accumTasks.forEach(t => headerRow.push(`"${t.name} (${t.maxScore})"`));
        headerRow.push("กลางภาค", "ปลายภาค", "รวม", "เกรด");
        csvContent += headerRow.join(",") + "\n";
        
        students.forEach(s => {
            let row = [s.no, `"${s.code}"`, `"${s.name}"`];
            accumTasks.forEach(t => {
                const sc = dataState.scores.find(x => x.studentId == s.id && x.taskId == t.id);
                row.push(sc ? sc.score : 0);
            });
            const { midterm, final, total } = calculateScores(s.id, classId, tasks);
            row.push(midterm, final, Number(total).toFixed(1), calGrade(total));
            csvContent += row.join(",") + "\n";
        });
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Grade_${mode}_${currentClass.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.exportAttendanceCSV = function() {
    const cid = document.getElementById('att-class-select').value;
    if (!cid) return alert("กรุณาเลือกห้องเรียนก่อน");

    const currentClass = dataState.classes.find(c => c.id == cid);
    const students = dataState.students.filter(s => s.classId == cid).sort((a, b) => Number(a.no) - Number(b.no));
    const uniqueDates = [...new Set(dataState.attendance.filter(a => a.classId == cid).map(a => a.date))].sort();

    let csvContent = "\uFEFF"; 
    let headerRow = ["เลขที่", "รหัสนักเรียน", "ชื่อ-นามสกุล"];
    
    uniqueDates.forEach(d => headerRow.push(`"${formatThaiDate(d)}"`));
    headerRow.push("มา", "ลา", "ขาด", "กิจกรรม", "เปอร์เซ็นต์การมา");
    csvContent += headerRow.join(",") + "\n";

    students.forEach(s => {
        let row = [s.no, `"${s.code}"`, `"${s.name}"`];
        let p=0, l=0, a=0, act=0;

        uniqueDates.forEach(d => {
            const log = dataState.attendance.find(att => att.studentId == s.id && att.date == d);
            const status = log ? log.status : "-";
            row.push(status);
            if(status=='มา') p++; else if(status=='ลา') l++; else if(status=='ขาด') a++; else if(status=='กิจกรรม') act++;
        });

        const totalDays = uniqueDates.length || 1;
        const percent = Math.round(((p+act)/totalDays)*100);
        row.push(p, l, a, act, `${percent}%`);
        csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Attendance_${currentClass.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 🛠 เชื่อมต่อฟังก์ชัน UI ที่จำเป็น
window.renderTaskClassCheckboxes = renderTaskClassCheckboxesAccum;
window.renderTaskChapterCheckboxes = renderTaskChapterCheckboxesAccum;
window.updateTempConfig = updateTempConfig;
window.removeConfigSlot = removeConfigSlot;
window.updateScanTaskDropdown = updateScanTaskDropdown; 
window.renderScoreRoster = renderScoreRoster;

// 🟢 NEW FUNCTION: Manual Sync Button Logic
window.handleManualBackup = async function() {
    if (confirm("ต้องการตรวจสอบและซิงค์ข้อมูลกับ Google Sheet เดี๋ยวนี้หรือไม่?")) {
        showLoading("กำลังซิงค์ข้อมูล...");
        try {
            await syncData(); // ดึงข้อมูลล่าสุดจาก Firebase
            if (typeof backupToGoogleSheet === 'function') {
                await backupToGoogleSheet(); // ส่งข้อมูลไป Google Sheet (ถ้ามีฟังก์ชันนี้)
                showToast("ซิงค์ข้อมูลกับ Google Sheet เรียบร้อย", "bg-green-600");
            } else {
                console.warn("backupToGoogleSheet function not found in firebase-service.js");
                showToast("ดึงข้อมูลล่าสุดเรียบร้อย (ไม่พบฟังก์ชัน Backup)", "bg-blue-600");
            }
        } catch (e) {
            console.error("Sync Error:", e);
            showToast("เกิดข้อผิดพลาดในการซิงค์", "bg-red-600");
        } finally {
            hideLoading();
            refreshUI();
        }
    }
}

// --- 3. Event Listeners & Init ---

function initEventListeners() {
    // 1. ค้นหารายชื่อเพื่อน
    const friendSearch = document.getElementById('friend-search');
    if (friendSearch) {
        friendSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.friend-item').forEach(item => { 
                item.style.display = item.textContent.toLowerCase().includes(term) ? 'flex' : 'none'; 
            });
        });
    }

    // 2. การกด Enter บันทึกอีเมล
    const emailInput = document.getElementById('user-email-input');
    if (emailInput) {
        emailInput.onkeydown = (e) => { 
            if(e.key === 'Enter') { e.preventDefault(); window.saveUserEmail(); }
        };
    }

    // 3. จัดการเลือกไฟล์ CSV
    const csvInput = document.getElementById('exam-csv-input');
    if (csvInput) {
        csvInput.addEventListener('change', (e) => {
           const file = e.target.files[0];
           if(file) {
               document.getElementById('csv-file-name').textContent = file.name;
               document.getElementById('csv-file-name').className = "text-xs text-center text-green-400 font-bold mb-2";
               const btn = document.getElementById('btn-process-csv');
               if(btn) {
                   btn.classList.remove('pointer-events-none', 'bg-white/10', 'text-white/50');
                   btn.classList.add('bg-green-600', 'text-white', 'hover:bg-green-500');
               }
           }
       });
    }

    // 4. ฟอร์มส่งงาน
    const formSubmitWork = document.getElementById('form-submit-work');
    if (formSubmitWork) {
        formSubmitWork.onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-final');
            const originalText = btn.innerHTML;
            btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังส่ง...';
            const tid = document.getElementById('submit-task-id').value;
            const sid = document.getElementById('submit-student-id').value;
            const link = document.getElementById('submit-link-input').value;
            const comment = document.getElementById('submit-comment-input').value;
            const checkboxes = document.querySelectorAll('.friend-checkbox:checked');
            let allStudentIds = [sid]; 
            checkboxes.forEach(cb => allStudentIds.push(cb.value));
            try {
                await saveAndRefresh({ action: 'submitTask', taskId: tid, studentIds: allStudentIds, link: link, comment: comment });
                document.getElementById('submit-modal').classList.add('hidden');
                const s = dataState.students.find(x => x.id == sid);
                if(s) renderStudentDashboard(s.code);
            } catch(err) { alert("เกิดข้อผิดพลาด"); } 
            finally { btn.disabled = false; btn.innerHTML = originalText; }
        };
    }

    // 5. ล็อกอินแอดมิน
    const adminLoginForm = document.getElementById('admin-login-form');
    if (adminLoginForm) {
        adminLoginForm.onsubmit = async (e) => { 
            e.preventDefault(); 
            const u=document.getElementById('admin-username').value;
            const p=document.getElementById('admin-password').value; 
            const res = await saveAndRefresh({action:'login', username:u, password:p}); 
            if(res.status=='success'){ 
                localStorage.setItem('wany_admin_session', res.token); 
                window.switchMainTab('admin');
                document.getElementById('admin-login-wrapper').classList.add('hidden'); 
                document.getElementById('admin-content-wrapper').classList.remove('hidden'); 
                refreshUI();
            } else alert("รหัสผ่านไม่ถูกต้อง"); 
        };
    }

    // 6. ฟอร์มงานเก็บคะแนน (3.1)
    const formTaskAccum = document.getElementById('form-task-accum');
    if (formTaskAccum) {
        formTaskAccum.onsubmit = (e) => { 
            e.preventDefault(); 
            const subId = document.getElementById('task-subject-accum').value;
            const classCbs = document.querySelectorAll('#task-class-accum input:checked'); 
            const chapCbs = document.querySelectorAll('#task-chapter-accum .chapter-checkbox:checked'); 
            if(!subId) return alert("กรุณาเลือกวิชา");
            if(classCbs.length === 0) return alert("กรุณาเลือกห้องเรียน"); 
            if(chapCbs.length === 0) return alert("กรุณาเลือกช่องคะแนน (Chapter)"); 
            
            // 🟢 ปรับเวลาให้เป็น GMT+7 (ประเทศไทย)
            const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
            d.setDate(d.getDate() + 7);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const dueDate = `${year}-${month}-${day}`;

            saveAndRefresh({ 
                action: 'addTask', id: Date.now(), 
                classIds: Array.from(classCbs).map(c => c.value), 
                subjectId: subId, category: 'accum', 
                chapter: Array.from(chapCbs).map(cb => cb.value), 
                name: document.getElementById('task-name-accum').value, 
                maxScore: document.getElementById('task-max-accum').value, 
                dueDateISO: dueDate 
            }); 
            e.target.reset(); 
            document.querySelectorAll('#task-chapter-accum .chapter-checkbox').forEach(c => c.checked = false);
            showToast("สร้างงานเก็บคะแนนเรียบร้อย");
        };
    }

    // 7. ฟอร์มงานสอบ (3.2)
    const formTaskExam = document.getElementById('form-task-exam');
    if (formTaskExam) {
        formTaskExam.onsubmit = (e) => { 
            e.preventDefault(); 
            const subId = document.getElementById('task-subject-exam').value;
            const classCbs = document.querySelectorAll('#task-class-exam input:checked'); 
            const category = document.getElementById('task-category-exam').value;
            if(!subId) return alert("กรุณาเลือกวิชา");
            if(classCbs.length === 0) return alert("กรุณาเลือกห้องเรียน"); 
            const names = { 'midterm': 'สอบกลางภาค', 'special_mid': 'คะแนนช่วยกลางภาค', 'final': 'สอบปลายภาค', 'special_final': 'คะแนนช่วยปลายภาค' };
            saveAndRefresh({ 
                action: 'addTask', id: Date.now(), 
                classIds: Array.from(classCbs).map(c => c.value), 
                subjectId: subId, category: category, chapter: [], 
                name: names[category], 
                maxScore: document.getElementById('task-max-exam').value, 
                dueDateISO: getThaiDateISO() 
            }); 
            e.target.reset(); 
            showToast(`สร้างรายการ ${names[category]} เรียบร้อย`);
        };
    }

    // 8. Event เปลี่ยนวิชา
    const subAccum = document.getElementById('task-subject-accum');
    if (subAccum) { subAccum.onchange = () => { window.renderTaskClassCheckboxesAccum(); window.renderTaskChapterCheckboxesAccum(); }; }
    const subExam = document.getElementById('task-subject-exam');
    if (subExam) { subExam.onchange = () => { window.renderTaskClassCheckboxesExam(); }; }

    // 9. ตารางสอน
    const formSchedule = document.getElementById('form-schedule');
    if (formSchedule) {
        formSchedule.onsubmit = (e) => { 
            e.preventDefault(); 
            saveAndRefresh({ action:'addSchedule', id:Date.now(), day: document.getElementById('sch-day').value, period: document.getElementById('sch-period').value, classId: document.getElementById('sch-class').value }); 
        };
    }

    // 10. รายงาน
    const reportSub = document.getElementById('report-subject');
    if (reportSub) {
        reportSub.onchange = () => { 
             const subId = reportSub.value; 
             const classSelect = document.getElementById('report-class'); 
             if(!classSelect) return;
             classSelect.innerHTML = '<option value="">-- เลือกห้อง --</option>'; 
             document.getElementById('report-table-body').innerHTML = ''; 
             if(!subId) return; 
             dataState.classes.filter(c => c.subjectId == subId).forEach(c => { 
                const o = document.createElement('option'); o.value = c.id; o.textContent = c.name; classSelect.appendChild(o); 
             }); 
        };
    }

    // 11. ให้คะแนน
    const scanClass = document.getElementById('scan-class-select');
    if (scanClass) {
        scanClass.onchange = () => { 
            window.updateScanTaskDropdown(); 
            window.renderScoreRoster(); 
        };
    }
    const scanTask = document.getElementById('scan-task-select');
    if (scanTask) {
        scanTask.onchange = () => {
            window.renderScoreRoster();
        };
    }

    // 12. เช็คชื่อ
    const attClass = document.getElementById('att-class-select');
    if (attClass) attClass.onchange = renderAttRoster;
    const attDate = document.getElementById('att-date-input');
    if (attDate) attDate.onchange = renderAttRoster;

    // 13. จัดการข้อมูล
    const fSub = document.getElementById('form-subject'); if(fSub) fSub.onsubmit = (e) => { e.preventDefault(); saveAndRefresh({ action:'addSubject', id:Date.now(), name:document.getElementById('subject-name').value }); e.target.reset(); };
    const fCls = document.getElementById('form-class'); if(fCls) fCls.onsubmit = (e) => { e.preventDefault(); saveAndRefresh({ action:'addClass', id:Date.now(), name:document.getElementById('class-name').value, subjectId:document.getElementById('class-subject-ref').value }); e.target.reset(); };
    const fStd = document.getElementById('form-student'); if(fStd) fStd.onsubmit = (e) => { e.preventDefault(); saveAndRefresh({ action: 'addStudent', id: Date.now(), classId: document.getElementById('student-class').value, no: document.getElementById('student-no').value, code: document.getElementById('student-id').value, name: document.getElementById('student-name').value }); e.target.reset(); };
    
    // 14. บันทึก Modal
    const btnSaveScore = document.getElementById('btn-modal-save');
    if (btnSaveScore) {
        btnSaveScore.onclick = () => { 
            const val = document.getElementById('modal-score-input').value; 
            const {s,t} = globalState.pendingScore; 
            if(Number(val) > Number(t.maxScore)) return alert("เกินคะแนนเต็ม"); 
            saveAndRefresh({action:'addScore', studentId:s.id, taskId:t.id, score:val}); 
            window.closeScoreModal(); 
            showToast("บันทึกแล้ว"); 
        };
    }

    // 15. สแกนเช็คชื่อ
    const attScan = document.getElementById('att-scan-input');
    if (attScan) {
        attScan.onkeydown = (e) => { 
            if(e.key === 'Enter') { 
                const val = e.target.value.trim(); 
                const cid = document.getElementById('att-class-select').value; 
                const date = document.getElementById('att-date-input').value; 
                const mode = globalState.attMode || 'มา'; 
                if(!cid) { alert("กรุณาเลือกห้องก่อน"); e.target.value=''; return; } 
                const s = dataState.students.find(st => (String(st.code) == val || String(st.no) == val) && st.classId == cid); 
                if(s) { 
                    saveAndRefresh({ action:'addAttendance', studentId:s.id, classId:cid, date:date, status:mode }); 
                    showToast(`${s.name} : ${mode}`, "bg-green-600"); 
                } else { 
                    showToast(`ไม่พบรหัส: ${val}`, "bg-red-600"); 
                } 
                e.target.value = ''; 
            } 
        };
    }

    // 16. กด Enter บันทึกคะแนนใน Modal
    const modalScoreInput = document.getElementById('modal-score-input');
    if (modalScoreInput) {
        modalScoreInput.onkeydown = (e) => { 
            if (e.key === 'Enter') { 
                e.preventDefault(); 
                const btnSave = document.getElementById('btn-modal-save');
                if (btnSave) btnSave.click(); 
            } 
        };
    }

    // 17. สแกนคะแนนหน้าหลัก
    const scanScoreInput = document.getElementById('scan-score-input');
    if (scanScoreInput) {
        scanScoreInput.onkeydown = (e) => { 
            if(e.key === 'Enter') { 
                const val = e.target.value.trim(); 
                const cid = document.getElementById('scan-class-select').value; 
                if(!cid) return; 
                const s = dataState.students.find(st => (String(st.code) == val || String(st.no) == val) && st.classId == cid); 
                if(s) { 
                    const tid = document.getElementById('scan-task-select').value; 
                    const t = dataState.tasks.find(x=>x.id==tid); 
                    if(t) { 
                        if(globalState.scoreMode !== 'manual') { 
                            if(Number(globalState.scoreMode) > Number(t.maxScore)) { alert("คะแนนที่เลือกเกินคะแนนเต็ม!"); } 
                            else { saveAndRefresh({action:'addScore', studentId:s.id, taskId:t.id, score:globalState.scoreMode}); showToast(`${s.name} : ${globalState.scoreMode} คะแนน`); } 
                        } else { 
                            globalState.pendingScore = { s, t }; 
                            document.getElementById('score-modal').classList.remove('hidden'); 
                            document.getElementById('modal-task-name').textContent = t.name; 
                            document.getElementById('modal-student-name').textContent = s.name; 
                            document.getElementById('modal-max-score').textContent = t.maxScore; 
                            const sc = dataState.scores.find(x => x.studentId == s.id && x.taskId == t.id); 
                            document.getElementById('modal-score-input').value = sc ? sc.score : ''; 
                            setTimeout(() => document.getElementById('modal-score-input').focus(), 100); 
                        } 
                        e.target.value = ''; 
                    } 
                } else { showToast("ไม่พบนักเรียน", "bg-red-600"); e.target.value = ''; } 
            } 
        };
    }
}

// --- 4. Auto Backup Scheduler ---
function startAutoSyncScheduler() {
    setInterval(() => {
        // 🟢 ตรวจสอบเวลาประเทศไทยสำหรับการ Auto Backup
        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
        const hours = now.getHours();
        const minutes = now.getMinutes();
        if (hours === 0 && minutes <= 1) {
            const lastBackup = localStorage.getItem('last_backup_date');
            const todayStr = now.toDateString();
            if (lastBackup !== todayStr) {
                // 🟢 Uncomment เพื่อเปิดใช้งาน Auto Backup
                if (typeof backupToGoogleSheet === 'function') {
                    backupToGoogleSheet();
                }
            }
        }
    }, 60000); 
}

// --- 5. Main Initialization ---
window.addEventListener('DOMContentLoaded', () => {
    syncData(); 
    loadFromLocalStorage(); 
    refreshUI();
    
    if(document.getElementById('att-date-input')) document.getElementById('att-date-input').value = getThaiDateISO();
    
    initEventListeners();
    startAutoSyncScheduler();
    
    const c = document.getElementById('score-buttons-container'); 
    if(c) { 
        c.innerHTML=''; 
        [5,6,7,8,9,10].forEach(i => { 
            const b = document.createElement('button'); 
            b.textContent=i; 
            b.className="btn-score py-2 rounded-lg border border-white/20 bg-white/5 text-white hover:bg-white/10"; 
            b.onclick=()=>window.setScoreMode(i); 
            c.appendChild(b); 
        }); 
    }

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
    } else {
        window.switchMainTab('student');
    }
    
    setInterval(() => {
        if(!dataState.schedules) return; 
        
        // 🟢 ตรวจสอบเวลาประเทศไทยสำหรับการเช็คคาบเรียน
        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
        const day = now.getDay(); 
        const timeStr = now.toTimeString().slice(0,5); 
        
        let currentPeriod = PERIODS.find(p => timeStr >= p.start && timeStr <= p.end); 
        const banner = document.getElementById('smart-att-banner'); 
        if(currentPeriod && dataState.schedules) { 
            const match = dataState.schedules.find(s => s.day == day && s.period == currentPeriod.p); 
            if(match) { 
                const cls = dataState.classes.find(c => c.id == match.classId); 
                if(cls) { 
                    banner.classList.remove('hidden'); 
                    document.getElementById('smart-period').textContent = currentPeriod.p; 
                    document.getElementById('smart-class-name').textContent = cls.name; 
                    globalState.smartClassId = cls.id; 
                    return; 
                } 
            } 
        } 
        banner.classList.add('hidden'); globalState.smartClassId = null; 
    }, 60000);
});

window.downloadExamTemplate = function() {
    const classId = document.getElementById('exam-class-select').value;
    if (!classId) return alert("กรุณาเลือกห้องเรียนก่อนดาวน์โหลดแม่แบบ");

    const students = dataState.students
        .filter(s => s.classId == classId)
        .sort((a, b) => Number(a.no) - Number(b.no));

    if (students.length === 0) return alert("ไม่พบรายชื่อนักเรียนในห้องนี้");

    const currentClass = dataState.classes.find(c => c.id == classId);
    const type = globalState.currentExamType === 'final' ? 'Final' : 'Midterm';

    let csvContent = "\uFEFF"; 
    csvContent += "รหัสนักเรียน,คะแนน,ชื่อ-นามสกุล (สำหรับตรวจสอบ)\n"; 

    students.forEach(s => {
        csvContent += `"${s.code}","",${s.name}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Template_${type}_${currentClass.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

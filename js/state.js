// js/state.js
export let dataState = { 
    subjects:[], classes:[], students:[], tasks:[], scores:[], 
    attendance:[], materials:[], submissions:[], returns:[], schedules:[] 
};

export const globalState = {
    scoreMode: 'manual',
    attMode: null,
    pendingScore: null,
    smartClassId: null,
    currentConfig: [],
    tempConfig: [],
    sheetQueue: [],
    isSendingSheet: false
};

export function updateDataState(newData) {
    // อัพเดทข้อมูลทับ dataState เดิม
    Object.assign(dataState, newData);
}

// อัพเดทเฉพาะจุด
export function updateLocalState(p) {
    if(p.action === 'addSubject') dataState.subjects.push({id:p.id, name:p.name});
    if(p.action === 'updateSubjectConfig') { const s = dataState.subjects.find(x=>x.id==p.id); if(s) s.scoreConfig = p.config; }
    if(p.action === 'addClass') dataState.classes.push({id:p.id, name:p.name, subjectId:p.subjectId});
    if(p.action === 'addStudent') dataState.students.push({id:p.id, classId:p.classId, no:p.no, code:p.code, name:p.name});
    if(p.action === 'updateEmail') { const s = dataState.students.find(x=>x.id==p.studentId); if(s) s.email = p.email; }
    if(p.action === 'addTask') { p.classIds.forEach((cid, idx) => { const chapStr = Array.isArray(p.chapter) ? p.chapter.join(',') : p.chapter; dataState.tasks.push({ id: Number(p.id) + idx, classId: cid, subjectId: p.subjectId, category: p.category, chapter: chapStr, name: p.name, maxScore: p.maxScore, dueDateISO: p.dueDateISO }); }); }
    if(p.action === 'addScore') { const idx = dataState.scores.findIndex(s => s.studentId == p.studentId && s.taskId == p.taskId); if(idx >= 0) dataState.scores[idx].score = p.score; else dataState.scores.push({studentId:p.studentId, taskId:p.taskId, score:p.score}); if(dataState.returns) dataState.returns = dataState.returns.filter(r => !(r.studentId == p.studentId && r.taskId == p.taskId)); }
    if(p.action === 'addAttendance') { const idx = dataState.attendance.findIndex(a => a.studentId == p.studentId && a.date == p.date); if(idx >= 0) dataState.attendance[idx].status = p.status; else dataState.attendance.push({studentId:p.studentId, classId:p.classId, date:p.date, status:p.status}); }
    if(p.action === 'addMaterial') dataState.materials.push({id:p.id, subjectId:p.subjectId, title:p.title, link:p.link, type:p.type});
    if(p.action === 'addSchedule') dataState.schedules.push({ id:p.id, day:p.day, period:p.period, classId:p.classId });
    if(p.action === 'returnForRevision') { dataState.submissions = dataState.submissions.filter(s => !(s.studentId == p.studentId && s.taskId == p.taskId)); if(!dataState.returns) dataState.returns = []; dataState.returns.push({taskId:p.taskId, studentId:p.studentId, comment:p.comment, timestampISO: new Date().toISOString()}); }
    if(p.action === 'submitTask') { p.studentIds.forEach(sid => { dataState.submissions = dataState.submissions.filter(s => !(s.studentId == sid && s.taskId == p.taskId)); if(dataState.returns) dataState.returns = dataState.returns.filter(r => !(r.studentId == sid && r.taskId == p.taskId)); dataState.submissions.push({taskId:p.taskId, studentId:sid, link:p.link, timestampISO: new Date().toISOString(), comment: p.comment}); }); }
}

export function saveToLocalStorage() { 
    localStorage.setItem('wany_data_backup', JSON.stringify({ timestamp: new Date().getTime(), data: dataState })); 
}

export function loadFromLocalStorage() { 
    const b = localStorage.getItem('wany_data_backup'); 
    if(b) { 
        const p = JSON.parse(b); 
        if(new Date().getTime() - p.timestamp < 1800000) Object.assign(dataState, p.data); 
    } 
}
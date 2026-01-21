import { dataState } from "./state.js";

export function getThaiDateISO() { 
    const d=new Date(); 
    const u=d.getTime()+(d.getTimezoneOffset()*60000); 
    const b=new Date(u+(7*3600000)); 
    return b.toISOString().slice(0,10); 
}

export function formatThaiDate(dateString) { 
    if (!dateString) return "-"; 
    const date = new Date(dateString); 
    if (isNaN(date.getTime())) return "-"; 
    return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }).format(date); 
}

export function calGrade(s) { 
    if(s>=80)return 4; if(s>=75)return 3.5; if(s>=70)return 3; if(s>=65)return 2.5; 
    if(s>=60)return 2; if(s>=55)return 1.5; if(s>=50)return 1; return 0; 
}

export function showToast(m,c,icon){ 
    const t=document.getElementById('toast-notification'); 
    if(!t) return;
    document.getElementById('toast-message').textContent=m; 
    
    const i = t.querySelector('i');
    if(i) i.className = icon || "fa-solid fa-circle-check text-2xl";

    const theme = c || "bg-gradient-to-r from-green-600 to-teal-600 border-green-400/50";
    t.className=`fixed bottom-10 left-1/2 -translate-x-1/2 text-white px-8 py-4 rounded-full shadow-2xl z-50 flex items-center gap-3 translate-y-20 opacity-0 font-bold border ${theme} toast-show`; 
    setTimeout(()=>t.classList.remove('toast-show'),3000); 
}

export function showLoading(text="กำลังประมวลผล...") {
    const overlay = document.getElementById('loading-overlay');
    if(overlay) {
        document.getElementById('loading-text').textContent = text;
        overlay.classList.remove('hidden');
    }
}

export function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if(overlay) overlay.classList.add('hidden');
}

export function updateSyncUI(text, color) {
    const statusIcon = document.querySelector('.fa-wifi');
    if(statusIcon) {
        statusIcon.className = color === 'green' ? "fa-solid fa-wifi" : "fa-solid fa-wifi text-red-400 animate-pulse";
        if(statusIcon.nextSibling) statusIcon.nextSibling.textContent = " " + text;
        statusIcon.parentElement.className = `text-xs text-${color}-400 font-bold transition-all`;
    }
}

// ย้าย Logic คำนวณคะแนนมาไว้ที่นี่เพื่อให้เรียกใช้ได้ทุกที่
// js/utils.js

export function calculateScores(studentId, classId, tasks) {
    let total = 0, midterm = 0, final = 0, special = 0; // เพิ่มตัวแปร special
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

        if (task.category === 'midterm') { midterm += score; }
        else if (task.category === 'final') { final += score; }
        else if (task.category === 'special') { 
            // เก็บสะสมคะแนนพิเศษ (สูงสุด 3 คะแนนตามเงื่อนไข)
            special += score; 
        }
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
    
    // จำกัดคะแนนพิเศษไม่เกิน 3 คะแนน
    let remainingSpecial = Math.min(special, 3);

    let chapScores = chapStudentSum.map((sumScore, idx) => {
        const sumMax = chapMaxSum[idx];
        const targetMax = Number(subjectConfig[idx]) || 10; 
        if (sumMax === 0) return 0; 
        
        let calculated = (sumScore / sumMax) * targetMax;

        // เงื่อนไข: ถ้านำไปช่วยคะแนนเก็บที่น้อยกว่า 13
        if (remainingSpecial > 0 && calculated < 13) {
            let space = 13 - calculated;
            let add = Math.min(remainingSpecial, space);
            calculated += add;
            remainingSpecial -= add;
        }

        return calculated;
    });

    // เงื่อนไข: คะแนนปลายภาค (บวกเพิ่มแต่ไม่เกินคะแนนเต็ม 30)
    if (remainingSpecial > 0) {
        let finalMax = 30; // ปลายภาคเต็ม 30 ตามที่คุณระบุ
        let space = finalMax - final;
        let add = Math.min(remainingSpecial, space);
        final += add;
        remainingSpecial -= add;
    }

    // คำนวณผลรวมใหม่
    total += chapScores.reduce((a, b) => a + b, 0) + midterm + final;
    
    return { total, midterm, final, chapScores };
}


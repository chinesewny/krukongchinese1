// js/utils.js

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
    document.getElementById('toast-message').textContent=m; 
    
    const i = t.querySelector('i');
    if(i) i.className = icon || "fa-solid fa-circle-check text-2xl";

    const theme = c || "bg-gradient-to-r from-green-600 to-teal-600 border-green-400/50";
    t.className=`fixed bottom-10 left-1/2 -translate-x-1/2 text-white px-8 py-4 rounded-full shadow-2xl z-50 flex items-center gap-3 translate-y-20 opacity-0 font-bold border ${theme} toast-show`; 
    setTimeout(()=>t.classList.remove('toast-show'),3000); 
}

export function showLoading(text="กำลังประมวลผล...") {
    const overlay = document.getElementById('loading-overlay');
    document.getElementById('loading-text').textContent = text;
    overlay.classList.remove('hidden');
}

export function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

export function updateSyncUI(text, color) {
    const statusIcon = document.querySelector('.fa-wifi');
    if(statusIcon) {
        statusIcon.className = color === 'green' ? "fa-solid fa-wifi" : "fa-solid fa-wifi text-red-400 animate-pulse";
        if(statusIcon.nextSibling) statusIcon.nextSibling.textContent = " " + text;
        statusIcon.parentElement.className = `text-xs text-${color}-400 font-bold transition-all`;
    }
}
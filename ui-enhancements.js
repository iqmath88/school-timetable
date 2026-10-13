/* Masar 0.9.14.8 — independent progressive interface enhancement. */
(()=>{'use strict';
const toggle=document.getElementById('sidebarCompactToggle');
const setCompact=(compact)=>{document.body.classList.toggle('sidebar-compact',compact);if(toggle){toggle.setAttribute('aria-pressed',String(compact));toggle.textContent=compact?'☷ توسيع القائمة':'☷ طي القائمة';toggle.title=compact?'توسيع القائمة':'طي القائمة';}};
try{setCompact(localStorage.getItem('masar-sidebar-compact')==='1')}catch(_){setCompact(false)}
if(toggle)toggle.addEventListener('click',()=>{const next=!document.body.classList.contains('sidebar-compact');setCompact(next);try{localStorage.setItem('masar-sidebar-compact',next?'1':'0')}catch(_){}});
// Provide a one-click focused table view without touching timetable data or print markup.
const focus=document.createElement('button');focus.type='button';focus.className='table-focus-toggle';focus.textContent='⛶ توسيع الجدول';focus.setAttribute('aria-pressed','false');focus.title='توسيع مساحة عرض الجدول';
const main=document.querySelector('.workspace-top');if(main){main.appendChild(focus);focus.addEventListener('click',()=>{const active=document.body.classList.toggle('table-focus');focus.setAttribute('aria-pressed',String(active));focus.textContent=active?'⊟ العودة للعرض العادي':'⛶ توسيع الجدول';});}
})();

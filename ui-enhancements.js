/* Masar 0.9.15.1 — independent progressive interface enhancement. */
(()=>{'use strict';
const toggle=document.getElementById('sidebarCompactToggle');
const setCompact=(compact)=>{document.body.classList.toggle('sidebar-compact',compact);if(toggle){toggle.setAttribute('aria-pressed',String(compact));toggle.textContent=compact?'☷ توسيع القائمة':'☷ طي القائمة';toggle.title=compact?'توسيع القائمة':'طي القائمة';}};
try{setCompact(localStorage.getItem('masar-sidebar-compact')==='1')}catch(_){setCompact(false)}
if(toggle)toggle.addEventListener('click',()=>{const next=!document.body.classList.contains('sidebar-compact');setCompact(next);try{localStorage.setItem('masar-sidebar-compact',next?'1':'0')}catch(_){}});
// Provide a one-click focused table view without touching timetable data or print markup.
const focus=document.createElement('button');focus.type='button';focus.className='table-focus-toggle';focus.textContent='⛶ توسيع الجدول';focus.setAttribute('aria-pressed','false');focus.title='توسيع مساحة عرض الجدول';
const main=document.querySelector('.workspace-top');if(main){main.appendChild(focus);focus.addEventListener('click',()=>{const active=document.body.classList.toggle('table-focus');focus.setAttribute('aria-pressed',String(active));focus.textContent=active?'⊟ العودة للعرض العادي':'⛶ توسيع الجدول';});}
})();

/* Mobile-first navigation: one primary menu; progressive, non-destructive controls. */
(()=>{'use strict';
const mq=window.matchMedia('(max-width: 780px)');
const menu=document.getElementById('menuToggle');
const backdrop=document.getElementById('sidebarBackdrop');
const sidebar=document.getElementById('sidebar');
const summary=document.getElementById('summary');
if(menu){menu.setAttribute('aria-controls','sidebar');menu.setAttribute('aria-label','فتح قائمة الأقسام');}
if(sidebar)sidebar.setAttribute('aria-label','قائمة أقسام مسار');
// Make the statistics available on demand on small screens without changing underlying content.
const statsToggle=document.createElement('button');statsToggle.type='button';statsToggle.id='mobileStatsToggle';statsToggle.className='mobile-stats-toggle secondary';statsToggle.textContent='▦ عرض مؤشرات المدرسة';statsToggle.setAttribute('aria-controls','summary');statsToggle.setAttribute('aria-expanded','false');
if(summary){summary.before(statsToggle);statsToggle.addEventListener('click',()=>{const opened=document.body.classList.toggle('mobile-stats-open');statsToggle.setAttribute('aria-expanded',String(opened));statsToggle.textContent=opened?'▦ إخفاء المؤشرات':'▦ عرض مؤشرات المدرسة';});}
// Escape closes the menu; no persistent changes to school data.
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('sidebar-open')){document.body.classList.remove('sidebar-open');if(backdrop)backdrop.hidden=true;if(menu){menu.setAttribute('aria-expanded','false');menu.focus();}}});
function sync(){if(!mq.matches){document.body.classList.remove('sidebar-open');if(backdrop)backdrop.hidden=true;if(menu)menu.setAttribute('aria-expanded','false');}}
if(mq.addEventListener)mq.addEventListener('change',sync);else if(mq.addListener)mq.addListener(sync);
})();

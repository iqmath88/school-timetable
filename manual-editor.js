/* مسار — التعديل اليدوي المحسّن في مساحة العمل (v0.9.23.0)
   نقل/تبديل بضغطتين، إضافة حصة في خانة فارغة، حذف حصة، تثبيت، وتراجع شامل. */
(function(){
'use strict';
let sel=null; // {id}
const dayName=id=>db.days.find(d=>d.id===id)?.name||'';
const remaining=a=>Math.max(0,(+a.weeklyPeriods||0)-db.timetable.filter(e=>e.assignmentId===a.id).length);
const label=a=>{const su=db.subjects.find(x=>x.id===a.subjectId),t=db.teachers.find(x=>x.id===a.teacherId),se=db.sections.find(x=>x.id===a.sectionId),g=se&&db.stages.find(x=>x.id===se.stageId);return `${su?.name||'—'} — ${t?.name||'—'} — ${g?.name||''} ${se?.name||''}`.trim()};
function view(){const v=document.querySelector('#ttWorkspaceView');const t=v&&v.querySelector('table.focused');return t?{v,t,mode:t.dataset.mode,id:t.dataset.id}:null}
function toast(m,l,undo){if(typeof dndToast==='function')dndToast(m,l,undo);else alert(m)}

/* ---- أدوات التحديد والنقل بضغطتين ---- */
function clearMarks(){const w=view();if(!w)return;w.t.querySelectorAll('.dnd-ok,.dnd-warn,.dnd-bad,.dnd-src').forEach(c=>c.classList.remove('dnd-ok','dnd-warn','dnd-bad','dnd-src'));const b=document.getElementById('mvBanner');if(b)b.remove()}
function startMove(id){
  const w=view(),e=db.timetable.find(x=>x.id===id);if(!w||!e)return;
  if(e.locked)return alert('الحصة مثبتة. افتح التثبيت أولاً.');
  sel={id,map:new Map()};clearMarks();
  w.t.querySelector(`td[data-entry="${id}"]`)?.classList.add('dnd-src');
  w.t.querySelectorAll('td[data-slot]').forEach(c=>{const [d,p]=c.dataset.slot.split('|'),ev=dndEvaluate(w.mode,w.id,e,d,+p);if(!ev)return;sel.map.set(c,ev);c.classList.add('dnd-'+ev.level)});
  const b=document.createElement('div');b.id='mvBanner';b.className='mv-banner';b.innerHTML=`<span>اختر الخانة الهدف لـ <b></b></span><span class="lg"><i class="ok"></i>متاح <i class="warn"></i>بتحذير <i class="bad"></i>ممنوع</span><button type="button" class="secondary">إلغاء</button>`;
  b.querySelector('b').textContent=manualLabel(e);b.querySelector('button').onclick=()=>{sel=null;clearMarks()};
  w.v.before(b);
}
/* التقاط النقر قبل بقية المعالجات أثناء وضع النقل */
document.addEventListener('click',ev=>{
  if(!sel)return;const w=view();if(!w){sel=null;return}
  const td=ev.target.closest&&ev.target.closest('td[data-slot]');if(!td||!w.t.contains(td))return;
  ev.preventDefault();ev.stopPropagation();
  const e=sel.map.get(td);
  if(!e){ if(td.dataset.entry===sel.id){sel=null;clearMarks();} return }
  if(e.level==='bad'){toast('⛔ '+e.errors.join('، '),'bad');return}
  sel=null;clearMarks();dndCommit(e);
},true);

/* ---- ورقة خيارات الحصة (بديلة للقديمة) ---- */
window.lessonSheet=function(id){
  const e=db.timetable.find(x=>x.id===id);if(!e)return;
  const o=document.createElement('div');o.className='edit-overlay';
  o.innerHTML=`<div class="edit-card"><div class="edit-head"><h3>خيارات الحصة</h3><button class="icon-close" type="button" aria-label="إغلاق">×</button></div><div class="notice"></div><div class="actions"><button id="shMv">↔ نقل / تبديل (اضغط الخانة الهدف)</button><button class="secondary" id="shLock">${e.locked?'🔓 فتح التثبيت':'🔒 تثبيت الحصة'}</button><button class="secondary" id="shList">نقل/تبديل بالقوائم</button><button class="danger" id="shDel">🗑 حذف الحصة</button><button class="secondary" id="shClose">إغلاق</button></div><p class="muted">يمكنك أيضاً سحب الحصة (على الجوال: اضغط مطولاً ثم اسحب).</p></div>`;
  o.querySelector('.notice').textContent=manualLabel(e);
  document.body.appendChild(o);const close=()=>o.remove();
  o.querySelector('.icon-close').onclick=close;o.querySelector('#shClose').onclick=close;
  o.querySelector('#shMv').onclick=()=>{close();startMove(id)};
  o.querySelector('#shLock').onclick=()=>{close();toggleTimetableLock(id)};
  o.querySelector('#shList').onclick=()=>{close();moveTimetableEntry(id)};
  o.querySelector('#shDel').onclick=()=>{close();deleteLesson(id)};
};

/* ---- حذف حصة ---- */
function deleteLesson(id){
  const e=db.timetable.find(x=>x.id===id);if(!e)return;
  if(e.locked)return alert('الحصة مثبتة. افتح التثبيت أولاً.');
  if(!confirm('حذف الحصة؟\n'+manualLabel(e)+'\nستعود إلى الحصص غير المجدولة ويمكن إضافتها من خانة فارغة.'))return;
  if(!preserveTimetable('قبل حذف حصة يدوياً'))return;
  const oldT=structuredClone(db.timetable),oldH=structuredClone(db.manualHistory||[]);
  db.timetable=db.timetable.filter(x=>x.id!==id);
  db.manualHistory??=[];db.manualHistory.push({id:uid('edit'),at:new Date().toISOString(),type:'حذف حصة',before:[],after:[],warnings:[],op:'delete',entry:{...e}});
  if(db.manualHistory.length>100)db.manualHistory.shift();
  if(!save()){db.timetable=oldT;db.manualHistory=oldH;alert('تعذر الحفظ، تمت الاستعادة.');return}
  workspaceTT();toast('✓ حُذفت الحصة','ok',true);
}

/* ---- إضافة حصة في خانة فارغة ---- */
function addLessonSheet(dayId,period){
  const w=view();if(!w)return;
  const pool=db.assignments.filter(a=>remaining(a)>0&&(w.mode==='teacher'?a.teacherId===w.id:a.sectionId===w.id));
  const o=document.createElement('div');o.className='edit-overlay';
  o.innerHTML=`<div class="edit-card"><div class="edit-head"><h3>إضافة حصة</h3><button class="icon-close" type="button" aria-label="إغلاق">×</button></div><div class="notice">${esc(dayName(dayId))} — الحصة ${period}</div>${pool.length?`<div class="field"><label>اختر من الحصص غير المجدولة</label><select id="adA">${pool.map(a=>`<option value="${esc(a.id)}">${esc(label(a))} (متبقي ${remaining(a)})</option>`).join('')}</select></div>${w.mode==='teacher'?'':''}<div id="adMsg" class="muted"></div><div class="actions"><button id="adOk">إضافة</button><button class="secondary" id="adCancel">إلغاء</button></div>`:'<div class="empty">لا توجد حصص غير مجدولة لهذا العرض (كل التكليفات مكتملة).</div><div class="actions"><button class="secondary" id="adCancel">إغلاق</button></div>'}</div>`;
  document.body.appendChild(o);const close=()=>o.remove();o.querySelector('.icon-close').onclick=close;o.querySelector('#adCancel').onclick=close;
  if(!pool.length)return;
  const draftEntry=()=>{const a=db.assignments.find(x=>x.id===o.querySelector('#adA').value);return {id:uid('lesson'),assignmentId:a.id,sectionId:a.sectionId,subjectId:a.subjectId,teacherId:a.teacherId,dayId,period:+period,locked:false}};
  const check=entry=>{db.timetable.push(entry);let r;try{r=manualValidate([{id:entry.id,dayId,period:+period}])}finally{db.timetable.pop()}return r};
  const upd=()=>{const r=check(draftEntry());o.querySelector('#adMsg').textContent=r.errors.length?'⛔ '+r.errors.join('، '):r.warnings.length?'⚠️ '+r.warnings.join('، '):'✓ لا تعارض';};
  o.querySelector('#adA').onchange=upd;upd();
  o.querySelector('#adOk').onclick=()=>{
    const entry=draftEntry(),r=check(entry);
    if(r.errors.length)return alert('لا يمكن الإضافة:\n'+r.errors.join('\n'));
    if(r.warnings.length&&!confirm('⚠️ تحذيرات:\n'+r.warnings.join('\n')+'\n\nإضافة رغم التحذير؟'))return;
    if(!preserveTimetable('قبل إضافة حصة يدوياً'))return;
    const oldT=structuredClone(db.timetable),oldH=structuredClone(db.manualHistory||[]);
    db.timetable.push(entry);
    db.manualHistory??=[];db.manualHistory.push({id:uid('edit'),at:new Date().toISOString(),type:'إضافة حصة',before:[],after:[],warnings:r.warnings,op:'add',entryId:entry.id});
    if(db.manualHistory.length>100)db.manualHistory.shift();
    if(!save()){db.timetable=oldT;db.manualHistory=oldH;alert('تعذر الحفظ، تمت الاستعادة.');return}
    close();workspaceTT();toast('✓ أُضيفت الحصة','ok',true);
  };
}

/* ---- تغليف مساحة العمل ---- */
const origWS=window.workspaceTT;
window.workspaceTT=function(){
  sel=null;origWS();
  const host=document.querySelector('#workspace');if(!host||!document.querySelector('#ttWorkspaceView'))return;
  const n=host.querySelector('.notice');
  if(n)n.innerHTML='<b>التعديل اليدوي:</b> اختر <b>جدول شعبة</b> أو <b>جدول مدرس</b>. • اضغط حصة ← «نقل/تبديل» ثم اضغط الخانة الهدف (أخضر متاح، أصفر بتحذير، أحمر ممنوع). • اضغط خانة فارغة (—) لإضافة حصة غير مجدولة. • من نافذة الحصة: تثبيت أو حذف. • السحب والإفلات يعمل أيضاً. • «تراجع» يلغي آخر تعديل بما فيه الإضافة والحذف.';
  if(document.querySelector('#ttMode')?.value==='school'&&n)n.innerHTML+=' <b>(في عرض المدرسة كاملة اختر شعبة أو مدرساً للتعديل.)</b>';
  const v=document.querySelector('#ttWorkspaceView');
  if(!v.dataset.addBound){v.dataset.addBound='1';v.addEventListener('click',ev=>{
    if(sel)return;const td=ev.target.closest&&ev.target.closest('td.tt-empty[data-slot]');if(!td)return;
    const [d,p]=td.dataset.slot.split('|');addLessonSheet(d,+p)})}
};
/* ---- تراجع شامل: يدعم الإضافة والحذف ---- */
const origUndo=window.undoManual;
window.undoManual=function(){
  const h=db.manualHistory&&db.manualHistory.at(-1);
  if(h&&h.op==='delete'){
    if(db.timetable.some(x=>x.dayId===h.entry.dayId&&+x.period===+h.entry.period&&(x.sectionId===h.entry.sectionId||x.teacherId===h.entry.teacherId)))return alert('لا يمكن التراجع: الخانة صارت مشغولة.');
    db.timetable.push({...h.entry});db.manualHistory.pop();save();workspaceTT();return}
  if(h&&h.op==='add'){db.timetable=db.timetable.filter(x=>x.id!==h.entryId);db.manualHistory.pop();save();workspaceTT();return}
  return origUndo.apply(this,arguments);
};
/* CSS */
const st=document.createElement('style');st.textContent=`.mv-banner{position:sticky;top:76px;z-index:30;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;padding:10px 14px;margin:8px 0;border-radius:12px;background:#561228;color:#fff;box-shadow:0 8px 24px #0004}.mv-banner .lg i{display:inline-block;width:12px;height:12px;border-radius:3px;margin:0 8px 0 3px;vertical-align:middle}.mv-banner .lg .ok{background:#2F6B4F}.mv-banner .lg .warn{background:#D7A94B}.mv-banner .lg .bad{background:#B3261E}.mv-banner button{background:#fff!important;color:#561228!important}td.tt-empty[data-slot]{cursor:copy}td.tt-empty[data-slot]:hover{outline:2px dashed #B8893B;outline-offset:-3px}`;
document.head.appendChild(st);
window.MASAR_MANUAL={addLessonSheet,deleteLesson,startMove,remaining};
if(page==='workspaceTT')render();
})();

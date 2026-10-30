/* مسار — التعديل اليدوي المحسّن في مساحة العمل (v0.9.23.0)
   نقل/تبديل بضغطتين، إضافة حصة في خانة فارغة، حذف حصة، تثبيت، وتراجع شامل. */
(function(){
'use strict';
let sel=null; // {id}
const dayName=id=>db.days.find(d=>d.id===id)?.name||'';
const remaining=a=>Math.max(0,(+a.weeklyPeriods||0)-db.timetable.filter(e=>e.assignmentId===a.id).length);
const label=a=>{const su=db.subjects.find(x=>x.id===a.subjectId),t=db.teachers.find(x=>x.id===a.teacherId),se=db.sections.find(x=>x.id===a.sectionId),g=se&&db.stages.find(x=>x.id===se.stageId);return `${su?.name||'—'} — ${t?.name||'—'} — ${g?.name||''} ${se?.name||''}`.trim()};
function view(){const v=document.querySelector('#ttWorkspaceView');if(!v)return null;const t=v.querySelector('table.focused');if(t)return {v,t,mode:t.dataset.mode,id:t.dataset.id};const sc=v.querySelector('table.compact-timetable');return sc?{v,t:sc,mode:'school',id:''}:null}
/* ---- ترقيم خلايا عرض المدرسة كاملة وتلوين المشكلات ---- */
function annotate(){
  const w=view();if(!w)return;
  if(w.mode==='school'&&!w.t.dataset.ann){
    w.t.dataset.ann='1';
    const secs=db.sections.slice().sort((a,b)=>(db.stages.find(g=>g.id===a.stageId)?.order||0)-(db.stages.find(g=>g.id===b.stageId)?.order||0)||(a.order||0)-(b.order||0));
    const days=db.days.filter(d=>d.active).sort((a,b)=>a.order-b.order);
    const rows=[...w.t.querySelectorAll('tbody tr.day-row')];let k=0;
    for(const d of days)for(let p=1;p<=d.periods;p++){const tr=rows[k++];if(!tr)break;
      [...tr.children].filter(c=>c.tagName==='TD').forEach((td,i)=>{const sec=secs[i];if(!sec)return;
        const e=db.timetable.find(x=>x.sectionId===sec.id&&x.dayId===d.id&&x.period===p);
        if(td.classList.contains('tt-off'))return;
        td.dataset.slot=d.id+'|'+p;td.dataset.section=sec.id;
        if(e&&td.classList.contains('lesson')){td.dataset.entry=e.id;td.classList.add('interactive')}});}
  }
  w.t.querySelectorAll('td[data-entry]').forEach(td=>{const e=db.timetable.find(x=>x.id===td.dataset.entry);if(!e)return;td.classList.remove('cell-red','cell-orange');const r=validateTimetableMove(e,e.dayId,e.period);if(r&&(r.level==='red'||r.level==='orange')){td.classList.add('cell-'+r.level);td.title=r.message||''}});
}
function toast(m,l,undo){if(typeof dndToast==='function')dndToast(m,l,undo);else alert(m)}

/* ---- أدوات التحديد والنقل بضغطتين ---- */
function clearMarks(){const w=view();if(!w)return;w.t.querySelectorAll('.dnd-ok,.dnd-warn,.dnd-bad,.dnd-src').forEach(c=>c.classList.remove('dnd-ok','dnd-warn','dnd-bad','dnd-src'));const b=document.getElementById('mvBanner');if(b)b.remove();w.t.classList.remove('mv-school')}
function startMove(id){
  const w=view(),e=db.timetable.find(x=>x.id===id);if(!w||!e)return;
  if(e.locked)return alert('الحصة مثبتة. افتح التثبيت أولاً.');
  sel={id,map:new Map()};clearMarks();
  w.t.querySelector(`td[data-entry="${id}"]`)?.classList.add('dnd-src');
  const school=w.mode==='school';
  w.t.querySelectorAll(school?`td[data-slot][data-section="${e.sectionId}"]`:'td[data-slot]').forEach(c=>{const [d,p]=c.dataset.slot.split('|'),ev=dndEvaluate(school?'section':w.mode,school?e.sectionId:w.id,e,d,+p);if(!ev)return;sel.map.set(c,ev);c.classList.add('dnd-'+ev.level)});
  if(school)w.t.classList.add('mv-school');
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
  o.innerHTML=`<div class="edit-card"><div class="edit-head"><h3>خيارات الحصة</h3><button class="icon-close" type="button" aria-label="إغلاق">×</button></div><div class="notice"></div><div class="actions"><button id="shMv">↔ نقل / تبديل (اضغط الخانة الهدف)</button><button class="secondary" id="shLock">${e.locked?'🔓 فتح التثبيت':'🔒 تثبيت الحصة'}</button><button class="secondary" id="shTeach">👤 تغيير مدرس الحصة</button><button class="secondary" id="shList">نقل/تبديل بالقوائم</button><button class="danger" id="shDel">🗑 حذف الحصة</button><button class="secondary" id="shClose">إغلاق</button></div><p class="muted">يمكنك أيضاً سحب الحصة (على الجوال: اضغط مطولاً ثم اسحب).</p></div>`;
  o.querySelector('.notice').textContent=manualLabel(e);
  document.body.appendChild(o);const close=()=>o.remove();
  o.querySelector('.icon-close').onclick=close;o.querySelector('#shClose').onclick=close;
  o.querySelector('#shMv').onclick=()=>{close();startMove(id)};
  o.querySelector('#shLock').onclick=()=>{close();toggleTimetableLock(id)};
  o.querySelector('#shTeach').onclick=()=>{close();changeTeacher(id)};
  o.querySelector('#shList').onclick=()=>{close();moveTimetableEntry(id)};
  o.querySelector('#shDel').onclick=()=>{close();deleteLesson(id)};
};

/* ---- حذف حصة ---- */
async function deleteLesson(id){
  const e=db.timetable.find(x=>x.id===id);if(!e)return;
  if(e.locked)return alert('الحصة مثبتة. افتح التثبيت أولاً.');
  if(!(await masarConfirm('حذف الحصة؟\n'+manualLabel(e)+'\nستعود إلى الحصص غير المجدولة ويمكن إضافتها من خانة فارغة.')))return;
  if(!preserveTimetable('قبل حذف حصة يدوياً'))return;
  const oldT=structuredClone(db.timetable),oldH=structuredClone(db.manualHistory||[]);
  db.timetable=db.timetable.filter(x=>x.id!==id);
  db.manualHistory??=[];db.manualHistory.push({id:uid('edit'),at:new Date().toISOString(),type:'حذف حصة',before:[],after:[],warnings:[],op:'delete',entry:{...e}});
  if(db.manualHistory.length>100)db.manualHistory.shift();
  if(!save()){db.timetable=oldT;db.manualHistory=oldH;alert('تعذر الحفظ، تمت الاستعادة.');return}
  workspaceTT();toast('✓ حُذفت الحصة','ok',true);
}

/* ---- إضافة حصة في خانة فارغة ---- */
function addLessonSheet(dayId,period,secId){
  const w=view();if(!w)return;
  const pool=db.assignments.filter(a=>remaining(a)>0&&(w.mode==='teacher'?a.teacherId===w.id:a.sectionId===(secId||w.id)));
  const o=document.createElement('div');o.className='edit-overlay';
  o.innerHTML=`<div class="edit-card"><div class="edit-head"><h3>إضافة حصة</h3><button class="icon-close" type="button" aria-label="إغلاق">×</button></div><div class="notice">${esc(dayName(dayId))} — الحصة ${period}${secId?' — '+esc((db.stages.find(g=>g.id===db.sections.find(x=>x.id===secId)?.stageId)?.name||'')+' '+(db.sections.find(x=>x.id===secId)?.name||'')):''}</div>${pool.length?`<div class="field"><label>اختر من الحصص غير المجدولة</label><select id="adA">${pool.map(a=>`<option value="${esc(a.id)}">${esc(label(a))} (متبقي ${remaining(a)})</option>`).join('')}</select></div>${w.mode==='teacher'?'':''}<div id="adMsg" class="muted"></div><div class="actions"><button id="adOk">إضافة</button><button class="secondary" id="adCancel">إلغاء</button></div>`:'<div class="empty">لا توجد حصص غير مجدولة لهذا العرض (كل التكليفات مكتملة).</div><div class="actions"><button class="secondary" id="adCancel">إغلاق</button></div>'}</div>`;
  document.body.appendChild(o);const close=()=>o.remove();o.querySelector('.icon-close').onclick=close;o.querySelector('#adCancel').onclick=close;
  if(!pool.length)return;
  const draftEntry=()=>{const a=db.assignments.find(x=>x.id===o.querySelector('#adA').value);return {id:uid('lesson'),assignmentId:a.id,sectionId:a.sectionId,subjectId:a.subjectId,teacherId:a.teacherId,dayId,period:+period,locked:false}};
  const check=entry=>{db.timetable.push(entry);let r;try{r=manualValidate([{id:entry.id,dayId,period:+period}])}finally{db.timetable.pop()}return r};
  const upd=()=>{const r=check(draftEntry());o.querySelector('#adMsg').textContent=r.errors.length?'⛔ '+r.errors.join('، '):r.warnings.length?'⚠️ '+r.warnings.join('، '):'✓ لا تعارض';};
  o.querySelector('#adA').onchange=upd;upd();
  o.querySelector('#adOk').onclick=async ()=>{
    const entry=draftEntry(),r=check(entry);
    if(r.errors.length)return alert('لا يمكن الإضافة:\n'+r.errors.join('\n'));
    if(r.warnings.length&&!(await masarConfirm('⚠️ تحذيرات:\n'+r.warnings.join('\n')+'\n\nإضافة رغم التحذير؟')))return;
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
  if(n)n.innerHTML=n.innerHTML.replace(/\(في عرض المدرسة كاملة.*?\)/,'<b>(عرض المدرسة كاملة قابل للتعديل: اضغط أي حصة.)</b>');
  const um=document.querySelector('#manualUndo');
  if(um&&!document.querySelector('#mePartial')){
    um.insertAdjacentHTML('afterend','<button class="secondary" id="meProblems">⚠ المشكلات والحلول</button><button class="secondary" id="mePartial">↻ إعادة توزيع جزئي</button>');
    document.querySelector('#meProblems').onclick=showProblems;document.querySelector('#mePartial').onclick=partialSheet;
    const pb=document.querySelector('#ttProblems');if(pb)pb.onclick=showProblems;
  }
  new MutationObserver(annotate).observe(v,{childList:true});annotate();
  if(!v.dataset.addBound){v.dataset.addBound='1';v.addEventListener('click',ev=>{
    if(sel)return;const w=view();
    const empty=ev.target.closest&&ev.target.closest('td.tt-empty[data-slot]');
    if(empty){const [d,p]=empty.dataset.slot.split('|');addLessonSheet(d,+p,empty.dataset.section||'');return}
    if(w&&w.mode==='school'){const l=ev.target.closest&&ev.target.closest('td.lesson[data-entry]');if(l)lessonSheet(l.dataset.entry)}})}
};
/* ---- تراجع شامل: يدعم الإضافة والحذف ---- */
const origUndo=window.undoManual;
window.undoManual=function(){
  const h=db.manualHistory&&db.manualHistory.at(-1);
  if(h&&h.op==='delete'){
    if(db.timetable.some(x=>x.dayId===h.entry.dayId&&+x.period===+h.entry.period&&(x.sectionId===h.entry.sectionId||x.teacherId===h.entry.teacherId)))return alert('لا يمكن التراجع: الخانة صارت مشغولة.');
    db.timetable.push({...h.entry});db.manualHistory.pop();save();workspaceTT();return}
  if(h&&h.op==='teacher'){const u=h.undo,e=db.timetable.find(x=>x.id===h.entryId);if(!e)return alert('الحصة غير موجودة.');
    e.assignmentId=u.lesson.assignmentId;e.teacherId=u.lesson.teacherId;
    const cur=db.assignments.find(x=>x.id===u.A.id);if(cur)Object.assign(cur,u.A);else db.assignments.push({...u.A});
    if(u.A2){const c2=db.assignments.find(x=>x.id===u.A2.id);if(c2)Object.assign(c2,u.A2)}else if(u.createdId)db.assignments=db.assignments.filter(x=>x.id!==u.createdId);
    db.manualHistory.pop();save();workspaceTT();return}
  if(h&&h.op==='add'){db.timetable=db.timetable.filter(x=>x.id!==h.entryId);db.manualHistory.pop();save();workspaceTT();return}
  return origUndo.apply(this,arguments);
};

/* ---- تغيير مدرس الحصة (مع تقسيم التكليف ليبقى التدقيق سليماً) ---- */
function changeTeacher(id){
  const e=db.timetable.find(x=>x.id===id);if(!e)return;
  const A=db.assignments.find(x=>x.id===e.assignmentId);if(!A)return alert('تكليف الحصة غير موجود.');
  const S=window.MASAR_SCHOOLDAY;
  const rows=db.teachers.filter(t=>t.id!==e.teacherId).map(t=>{
    const v=manualValidate([{id:e.id,dayId:e.dayId,period:e.period,teacherId:t.id}]);
    const errors=[...v.errors],warnings=[...v.warnings];
    if(S&&!S.teachesOn(t.id,e.dayId))errors.push('لا يدرّس في هذا اليوم (مفرّغ/متعاقد)');
    const same=db.assignments.some(a=>a.teacherId===t.id&&a.subjectId===e.subjectId);
    return {t,errors,warnings,same,level:errors.length?2:warnings.length?1:0};
  }).sort((a,b)=>a.level-b.level||(b.same-a.same)||String(a.t.name).localeCompare(String(b.t.name),'ar'));
  const o=document.createElement('div');o.className='edit-overlay';
  o.innerHTML=`<div class="edit-card"><div class="edit-head"><h3>تغيير مدرس الحصة</h3><button class="icon-close" type="button" aria-label="إغلاق">×</button></div><div class="notice"></div><div class="notice warning">يُنقل هذا الدرس وحده إلى المدرس الجديد (تُقسَّم الحصص الأسبوعية للتكليف بينهما). ★ = يدرّس المادة نفسها.</div><div class="me-list">${rows.map((r,i)=>`<label class="me-row lv${r.level}"><input type="radio" name="mt" value="${r.t.id}" ${r.level===2?'disabled':''}><span>${r.same?'★ ':''}${esc(r.t.name)}</span><small>${r.level===2?'⛔ '+esc(r.errors.join('، ')):r.level===1?'⚠️ '+esc(r.warnings.join('، ')):'✓ متاح'}</small></label>`).join('')}</div><div class="actions"><button id="ctOk">تأكيد التغيير</button><button class="secondary" id="ctNo">إلغاء</button></div></div>`;
  o.querySelector('.notice').textContent=manualLabel(e);
  document.body.appendChild(o);const close=()=>o.remove();o.querySelector('.icon-close').onclick=close;o.querySelector('#ctNo').onclick=close;
  o.querySelector('#ctOk').onclick=async ()=>{
    const pick=o.querySelector('input[name=mt]:checked');if(!pick)return alert('اختر مدرساً.');
    const r=rows.find(x=>x.t.id===pick.value);
    if(r.warnings.length&&!(await masarConfirm('⚠️ تحذيرات:\n'+r.warnings.join('\n')+'\n\nمتابعة؟')))return;
    if(!preserveTimetable('قبل تغيير مدرس حصة'))return;
    const snap={t:structuredClone(db.timetable),a:structuredClone(db.assignments),h:structuredClone(db.manualHistory||[])};
    const before={lesson:{assignmentId:e.assignmentId,teacherId:e.teacherId},A:{...A},A2:null,createdId:null,removedA:false};
    let A2=db.assignments.find(x=>x.id!==A.id&&x.sectionId===A.sectionId&&x.subjectId===A.subjectId&&x.teacherId===r.t.id);
    if(A2)before.A2={...A2};else{A2={...A,id:uid('asg'),teacherId:r.t.id,weeklyPeriods:0};db.assignments.push(A2);before.createdId=A2.id}
    A.weeklyPeriods=(+A.weeklyPeriods||0)-1;A2.weeklyPeriods=(+A2.weeklyPeriods||0)+1;
    e.assignmentId=A2.id;e.teacherId=r.t.id;
    if(A.weeklyPeriods<=0){db.assignments=db.assignments.filter(x=>x.id!==A.id);before.removedA=true}
    db.manualHistory??=[];db.manualHistory.push({id:uid('edit'),at:new Date().toISOString(),type:'تغيير مدرس حصة',before:[],after:[],warnings:r.warnings,op:'teacher',entryId:e.id,undo:before});
    if(!save()){db.timetable=snap.t;db.assignments=snap.a;db.manualHistory=snap.h;return alert('تعذر الحفظ، تمت الاستعادة.')}
    close();workspaceTT();toast('✓ غُيّر مدرس الحصة','ok',true);
  };
}

/* ---- قائمة المشكلات والحلول ---- */
function problems(){
  const out=[];
  for(const e of db.timetable){const r=validateTimetableMove(e,e.dayId,e.period);if(r&&(r.level==='red'||r.level==='orange'))out.push({e,level:r.level,msg:r.message||''})}
  out.sort((a,b)=>(a.level==='red'?0:1)-(b.level==='red'?0:1));
  const missing=db.assignments.filter(a=>remaining(a)>0);
  return {lessons:out,missing};
}
function suggestFor(e){
  const res=[];const days=db.days.filter(d=>d.active).sort((a,b)=>a.order-b.order);
  for(const d of days){const sec=db.sections.find(x=>x.id===e.sectionId);for(let p=1;p<=sectionDayPeriods(sec,d);p++){
    if(d.id===e.dayId&&p===e.period)continue;const ev=dndEvaluate('section',e.sectionId,e,d.id,p);
    if(ev&&ev.level==='ok')res.push({ev,day:d.name,p})}}
  return res.slice(0,4);
}
function goTo(secId,entryId){
  window.ttPreferred={mode:'section',id:secId};page='workspaceTT';render();
  setTimeout(()=>{const td=document.querySelector(`td[data-entry="${entryId}"]`);td&&td.scrollIntoView({block:'center'});td&&td.classList.add('dnd-src');if(entryId)lessonSheet(entryId)},60);
}
function showProblems(){
  const P=problems();
  const o=document.createElement('div');o.className='edit-overlay';
  o.innerHTML=`<div class="edit-card me-wide"><div class="edit-head"><h3>المشكلات والحلول</h3><button class="icon-close" type="button" aria-label="إغلاق">×</button></div><div class="notice">${P.lessons.filter(x=>x.level==='red').length} خطأ — ${P.lessons.filter(x=>x.level==='orange').length} تحذير — ${P.missing.reduce((n,a)=>n+remaining(a),0)} حصة غير مجدولة</div><div class="me-list">${P.lessons.slice(0,150).map((x,i)=>`<div class="me-prob ${x.level}"><div><b>${esc(manualLabel(x.e))}</b><br><small>${esc(x.msg)}</small></div><div class="actions"><button class="secondary" data-sg="${i}">حلول مقترحة</button><button class="secondary" data-open="${i}">فتح</button></div><div class="me-sg" id="sg${i}"></div></div>`).join('')||'<div class="empty">لا توجد مشكلات في الحصص المجدولة ✓</div>'}${P.missing.length?'<h4>حصص غير مجدولة</h4>'+P.missing.map(a=>`<div class="me-prob orange"><div>${esc(label(a))}<br><small>متبقي ${remaining(a)}</small></div></div>`).join(''):''}</div><div class="actions"><button class="secondary" id="prClose">إغلاق</button></div></div>`;
  document.body.appendChild(o);const close=()=>o.remove();o.querySelector('.icon-close').onclick=close;o.querySelector('#prClose').onclick=close;
  o.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{const x=P.lessons[+b.dataset.open];close();goTo(x.e.sectionId,x.e.id)});
  o.querySelectorAll('[data-sg]').forEach(b=>b.onclick=()=>{const i=+b.dataset.sg,x=P.lessons[i],box=o.querySelector('#sg'+i);const sg=suggestFor(x.e);
    box.innerHTML=sg.length?sg.map((s,j)=>`<button data-ap="${i}|${j}">${esc(s.day)} / ${s.p} — ${esc(s.ev.type)}</button>`).join(' '):'<small>لا يوجد موضع بلا تعارض داخل هذه الشعبة. جرّب تغيير المدرس أو نقلاً بتحذير.</small>';
    box.querySelectorAll('[data-ap]').forEach(a=>a.onclick=async()=>{const [ii,jj]=a.dataset.ap.split('|').map(Number);const ev=suggestFor(P.lessons[ii].e)[jj];close();if(ev&&(await dndCommit(ev.ev)))showProblems()})});
}

/* ---- إعادة توزيع جزئي ---- */
function partialSheet(){
  const o=document.createElement('div');o.className='edit-overlay';
  const secs=db.sections.map(s=>`<option value="${s.id}">${esc((db.stages.find(g=>g.id===s.stageId)?.name||'')+' '+s.name)}</option>`).join('');
  const tea=db.teachers.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('');
  o.innerHTML=`<div class="edit-card"><div class="edit-head"><h3>إعادة توزيع جزئي</h3><button class="icon-close" type="button" aria-label="إغلاق">×</button></div><div class="notice">تُبقى كل الحصص كما هي، ويُعاد توزيع المحدَّد فقط (مع الحصص ذات الأخطاء). الحصص المثبتة لا تُمسّ. إن لم يجد المحرك حلاً يبقى جدولك الحالي كما هو.</div>
  <div class="field"><label>ما الذي يُعاد توزيعه؟</label><select id="paScope"><option value="problems">الحصص ذات المشكلات فقط</option><option value="section">كل حصص شعبة</option><option value="teacher">كل حصص مدرس</option><option value="all">كل الحصص غير المثبتة</option></select></div>
  <div class="field" id="paSecW" hidden><select id="paSec">${secs}</select></div><div class="field" id="paTeaW" hidden><select id="paTea">${tea}</select></div>
  <div id="paInfo" class="muted"></div><div class="actions"><button id="paGo">بدء إعادة التوزيع</button><button class="secondary" id="paNo">إلغاء</button></div></div>`;
  document.body.appendChild(o);const close=()=>o.remove();o.querySelector('.icon-close').onclick=close;o.querySelector('#paNo').onclick=close;
  const Q=s=>o.querySelector(s);
  const freed=()=>{const sc=Q('#paScope').value,locked=e=>e.locked||db.fixedLessons.some(f=>f.assignmentId===e.assignmentId&&f.dayId===e.dayId&&+f.period===+e.period);
    const red=new Set(problems().lessons.filter(x=>x.level==='red').map(x=>x.e.id));
    return db.timetable.filter(e=>!locked(e)&&(red.has(e.id)||sc==='all'||(sc==='section'&&e.sectionId===Q('#paSec').value)||(sc==='teacher'&&e.teacherId===Q('#paTea').value)))};
  const upd=()=>{Q('#paSecW').hidden=Q('#paScope').value!=='section';Q('#paTeaW').hidden=Q('#paScope').value!=='teacher';Q('#paInfo').textContent='سيُعاد توزيع '+freed().length+' حصة من أصل '+db.timetable.length+'، وتبقى '+(db.timetable.length-freed().length)+' كما هي.'};
  ['#paScope','#paSec','#paTea'].forEach(s=>Q(s).onchange=upd);upd();
  Q('#paGo').onclick=()=>{
    const fr=new Set(freed().map(e=>e.id));
    window.__regenKeep=db.timetable.filter(e=>!fr.has(e.id)).map(e=>({assignmentId:e.assignmentId,dayId:e.dayId,period:e.period}));
    close();page='generator';render();startGeneration();
  };
}
window.masarGenDb=function(){const c=structuredClone(db);const keep=window.__regenKeep;window.__regenKeep=null;
  if(keep&&keep.length){const have=new Set((c.fixedLessons||[]).map(f=>f.assignmentId+'|'+f.dayId+'|'+f.period));c.fixedLessons=(c.fixedLessons||[]).slice();keep.forEach(k=>{const key=k.assignmentId+'|'+k.dayId+'|'+k.period;if(!have.has(key)){have.add(key);c.fixedLessons.push({id:uid('fix'),...k})}})}
  return c};

/* CSS */
const st=document.createElement('style');st.textContent=`.mv-banner{position:sticky;top:76px;z-index:30;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;padding:10px 14px;margin:8px 0;border-radius:12px;background:#561228;color:#fff;box-shadow:0 8px 24px #0004}.mv-banner .lg i{display:inline-block;width:12px;height:12px;border-radius:3px;margin:0 8px 0 3px;vertical-align:middle}.mv-banner .lg .ok{background:#2F6B4F}.mv-banner .lg .warn{background:#D7A94B}.mv-banner .lg .bad{background:#B3261E}.mv-banner button{background:#fff!important;color:#561228!important}td.cell-red{outline:2px solid #B3261E!important;outline-offset:-2px;background-image:linear-gradient(#b3261e22,#b3261e22)}td.cell-orange{outline:2px solid #D7A94B!important;outline-offset:-2px}.mv-school td[data-slot]:not(.dnd-ok):not(.dnd-warn):not(.dnd-bad):not(.dnd-src){opacity:.35}.me-list{max-height:55vh;overflow:auto;display:grid;gap:8px;margin:10px 0}.me-row{display:grid;grid-template-columns:auto 1fr;gap:4px 8px;padding:8px 10px;border:1px solid var(--line);border-radius:12px}.me-row small{grid-column:2}.me-row.lv2{opacity:.5}.me-row.lv1 small{color:#8a5a00}.me-prob{display:grid;gap:6px;padding:10px;border-radius:12px;border:1px solid var(--line);border-inline-start:5px solid #D7A94B}.me-prob.red{border-inline-start-color:#B3261E}.me-sg{display:flex;flex-wrap:wrap;gap:6px}.me-wide{width:min(760px,96vw)}td.tt-empty[data-slot]{cursor:copy}td.tt-empty[data-slot]:hover{outline:2px dashed #B8893B;outline-offset:-3px}`;
document.head.appendChild(st);
window.MASAR_MANUAL={addLessonSheet,deleteLesson,startMove,remaining};
if(page==='workspaceTT')render();
})();

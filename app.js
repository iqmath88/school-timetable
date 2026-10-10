const KEY='school-timetable-v01';
const stageDefaults=[['الأول',1,'#587B9B'],['الثاني',2,'#6F8F72'],['الثالث',3,'#9A7B60'],['الرابع',4,'#7D7398'],['الخامس',5,'#A16F78'],['السادس',6,'#557F83']];
const defaultDays=[['الأحد',7,true],['الاثنين',7,true],['الثلاثاء',6,true],['الأربعاء',7,true],['الخميس',5,true],['الجمعة',0,false],['السبت',0,false]];
const seed=()=>({version:'0.9.8.8',school:{name:'',year:'2026-2027'},days:defaultDays.map((x,i)=>({id:'d'+i,name:x[0],periods:x[1],active:x[2],order:i+1})),stages:stageDefaults.map(x=>({id:'g'+x[1],name:x[0],order:x[1],color:x[2]})),sections:[],subjects:[],teachers:[],assignments:[],teacherRules:{},fixedLessons:[],timetable:[],manualHistory:[],stageLoads:{},stageDayPeriods:{},subjectRules:{},printSettings:{title:'جدول الحصص الأسبوعية',startDate:'',changeReasons:'',footer:'',showColors:true,printMode:'color',theme:'formal',logo:'',logoPosition:'center',showTeachers:true,showNotes:true,showSignatures:true,density:'compact',signature1:'منظّم الجدول',signature2:'معاون المدير',signature3:'مدير المدرسة'}});
function migrate(x){x=x||seed();x.version='0.9.8.8';x.teacherRules=x.teacherRules||{};x.fixedLessons=x.fixedLessons||[];x.timetable=x.timetable||[];x.stageLoads=x.stageLoads||{};x.stageDayPeriods=x.stageDayPeriods||{};x.subjectRules=x.subjectRules||{};x.printSettings={title:'جدول الحصص الأسبوعية',startDate:'',changeReasons:'',footer:'',showColors:true,printMode:'color',theme:'formal',logo:'',logoPosition:'center',showTeachers:true,showNotes:true,showSignatures:true,density:'compact',signature1:'منظّم الجدول',signature2:'معاون المدير',signature3:'مدير المدرسة',...(x.printSettings||{})};x.manualHistory=x.manualHistory||[];x.teachers=x.teachers||[];x.assignments=x.assignments||[];return x}
function load(){try{return migrate(JSON.parse(localStorage.getItem(KEY)))}catch{return seed()}}
let db=load(),page='school';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),uid=p=>p+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function save(){localStorage.setItem(KEY,JSON.stringify(db));renderSummary()}
// Keep a recoverable copy before every operation that could discard a generated timetable.
const RECOVERY_KEY=KEY+'-recovery';
function preserveTimetable(reason){
 if(!Array.isArray(db.timetable)||!db.timetable.length)return true;
 try{localStorage.setItem(RECOVERY_KEY,JSON.stringify({savedAt:new Date().toISOString(),reason,data:db}));return true}
 catch(err){alert('تعذر حفظ نسخة الاسترجاع. صدّر نسخة احتياطية قبل المتابعة.');return false}
}
function downloadRecovery(){
 const raw=localStorage.getItem(RECOVERY_KEY);if(!raw)return alert('لا توجد نسخة استرجاع محفوظة على هذا الجهاز.');
 const obj=JSON.parse(raw),blob=new Blob([JSON.stringify(obj.data,null,2)],{type:'application/json'}),a=document.createElement('a');
 a.href=URL.createObjectURL(blob);a.download='school-timetable-recovery-'+(obj.savedAt||'').slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

const pages=[['school','1. المدرسة'],['days','2. الأيام والحصص'],['sections','3. المراحل والشعب'],['subjects','4. المواد'],['teachers','5. المدرسون'],['loads','6. حصص المراحل'],['assignments','7. إدارة التكليفات'],['audit','8. تدقيق التكليفات'],['constraints','7. قيود المدرسين'],['fixed','8. الحصص المثبتة'],['feasibility','9. فحص الجدوى'],['generator','10. توليد الجدول'],['workspaceTT','11. مساحة عمل الجدول'],['gapDiagnosis','12. تشخيص الفراغات'],['printSetup','13. التصميم والطباعة']];
function nav(){$('#steps').innerHTML=pages.map(x=>`<button class="step ${page===x[0]?'active':''}" data-p="${x[0]}">${x[1]}</button>`).join('');document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{page=b.dataset.p;render()})}
function completeness(){let c=[!!db.school.name,db.days.some(d=>d.active&&d.periods>0),db.sections.length,db.subjects.length,db.teachers.length,db.assignments.length];return Math.round(c.filter(Boolean).length/c.length*100)}
function renderSummary(){if(!$('#summary'))return;let configured=db.teachers.filter(t=>db.teacherRules[t.id]).length;$('#summary').innerHTML=`<div class="cards"><div class="stat">اكتمال البيانات<b>${completeness()}%</b></div><div class="stat">الشعب<b>${db.sections.length}</b></div><div class="stat">المواد<b>${db.subjects.length}</b></div><div class="stat">المدرسون<b>${db.teachers.length}</b></div><div class="stat">قيود مضبوطة<b>${configured}</b></div><div class="stat">حصص مثبتة<b>${db.fixedLessons.length}</b></div></div><div class="progress" style="margin-top:12px"><i style="width:${completeness()}%"></i></div>`}
function render(){nav();renderSummary();({school,days,sections,subjects,teachers,loads,assignments,audit,constraints,fixed,feasibility,generator,workspaceTT,gapDiagnosis,printSetup}[page])()}
function school(){$('#workspace').innerHTML=`<h2>إعداد المدرسة</h2><div class="grid"><div class="field"><label>اسم المدرسة</label><input id="schoolName" value="${esc(db.school.name)}"></div><div class="field"><label>العام الدراسي</label><input id="schoolYear" value="${esc(db.school.year)}"></div></div><div class="actions"><button id="saveSchool">حفظ الإعدادات</button><button class="secondary" id="importBtn">استيراد نسخة احتياطية</button><button class="secondary" id="recoveryBtn">تنزيل نسخة الاسترجاع المحلية</button><button class="danger" id="resetBtn">إعادة ضبط المشروع</button></div>`;$('#saveSchool').onclick=()=>{db.school.name=$('#schoolName').value.trim();db.school.year=$('#schoolYear').value.trim();save()};$('#importBtn').onclick=()=>$('#importFile').click();$('#recoveryBtn').onclick=downloadRecovery;$('#resetBtn').onclick=()=>{if(confirm('سيتم حذف جميع البيانات المحلية. هل أنت متأكد؟')){if(!preserveTimetable('إعادة ضبط المشروع'))return;db=seed();save();render()}}}
function sectionDayPeriods(sec,day){const x=db.stageDayPeriods?.[sec.stageId]?.[day.id];return day.active?Math.max(0,Math.min(day.periods,Number.isFinite(+x)&&x!==undefined?+x:day.periods)):0}
function dayCapacity(sec){return db.days.reduce((n,d)=>n+sectionDayPeriods(sec,d),0)}
function days(){$('#workspace').innerHTML=`<h2>أيام الدوام وعدد الحصص</h2><div class="notice">يمكن أن يختلف عدد الحصص من يوم إلى آخر.</div><table><thead><tr><th>اليوم</th><th>دوام</th><th>عدد الحصص</th></tr></thead><tbody>${db.days.sort((a,b)=>a.order-b.order).map(d=>`<tr><td>${d.name}</td><td><input type="checkbox" data-active="${d.id}" ${d.active?'checked':''}></td><td><input type="number" min="0" max="12" data-periods="${d.id}" value="${d.periods}"></td></tr>`).join('')}</tbody></table><h3>تخصيص عدد الحصص حسب المرحلة واليوم</h3><div class="notice">العدد العام هو الحد الأعلى. مثال: الثلاثاء 7 حصص للمدرسة، و6 لبقية المراحل، و7 للسادس.</div><div class="tt-wrap"><table><thead><tr><th>المرحلة</th>${db.days.filter(d=>d.active).map(d=>`<th>${esc(d.name)}</th>`).join('')}</tr></thead><tbody>${db.stages.map(g=>`<tr><th>${esc(g.name)}</th>${db.days.filter(d=>d.active).map(d=>`<td><input class="stage-period-input" type="number" min="0" max="${d.periods}" data-stage-day="${g.id}|${d.id}" value="${db.stageDayPeriods[g.id]?.[d.id]??d.periods}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>`;document.querySelectorAll('[data-stage-day]').forEach(x=>x.onchange=()=>{const [g,d]=x.dataset.stageDay.split('|');const max=db.days.find(v=>v.id===d).periods;db.stageDayPeriods[g]??={};db.stageDayPeriods[g][d]=Math.min(max,Math.max(0,+x.value||0));if(db.timetable.length){if(!confirm('تغيير حصص المرحلة سيمسح الجدول المولد. هل تريد المتابعة بعد حفظ نسخة استرجاع؟')){days();return}if(!preserveTimetable('تغيير حصص المرحلة')){days();return}}db.timetable=[];save();days()});document.querySelectorAll('[data-active]').forEach(x=>x.onchange=()=>{db.days.find(d=>d.id===x.dataset.active).active=x.checked;save()});document.querySelectorAll('[data-periods]').forEach(x=>x.onchange=()=>{let d=db.days.find(d=>d.id===x.dataset.periods);d.periods=Math.max(0,+x.value||0);d.active=d.periods>0;save();days()})}
function sections(){let rows=db.sections.slice().sort((a,b)=>(db.stages.find(g=>g.id===a.stageId)?.order||0)-(db.stages.find(g=>g.id===b.stageId)?.order||0)||a.order-b.order);$('#workspace').innerHTML=`<h2>المراحل والشعب</h2><div class="grid"><div class="field"><label>المرحلة</label><select id="stage">${db.stages.sort((a,b)=>a.order-b.order).map(g=>`<option value="${g.id}">${g.name}</option>`).join('')}</select></div><div class="field"><label>اسم الشعبة</label><input id="sectionName" placeholder="مثال: أ"></div></div><div class="actions"><button id="addSection">إضافة شعبة</button></div><table><thead><tr><th>المرحلة</th><th>الشعبة</th><th></th></tr></thead><tbody>${rows.length?rows.map(s=>{let g=db.stages.find(x=>x.id===s.stageId);return `<tr><td><span class="stage-dot" style="background:${g.color}"></span>${g.name}</td><td>${esc(s.name)}</td><td><button class="danger" data-del-section="${s.id}">حذف</button></td></tr>`}).join(''):`<tr><td colspan="3" class="empty">لم تضف شعب بعد</td></tr>`}</tbody></table>`;$('#addSection').onclick=()=>{let name=$('#sectionName').value.trim(),stageId=$('#stage').value;if(!name)return;if(db.sections.some(s=>s.stageId===stageId&&s.name===name))return alert('هذه الشعبة موجودة');let max=Math.max(0,...db.sections.filter(s=>s.stageId===stageId).map(s=>s.order));db.sections.push({id:uid('sec'),stageId,name,order:max+1});save();sections()};document.querySelectorAll('[data-del-section]').forEach(b=>b.onclick=()=>{if(db.assignments.some(a=>a.sectionId===b.dataset.delSection))return alert('لا يمكن حذف شعبة مرتبطة بتكليف');db.sections=db.sections.filter(s=>s.id!==b.dataset.delSection);save();sections()})}
function simpleTable(arr,heads,row,type){return `<table><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}<th></th></tr></thead><tbody>${arr.length?arr.map(x=>`<tr>${row(x).map(c=>`<td>${c}</td>`).join('')}<td><button class="danger" data-del-${type}="${x.id}">حذف</button></td></tr>`).join(''):`<tr><td colspan="${heads.length+1}" class="empty">لا توجد بيانات</td></tr>`}</tbody></table>`}
function delWire(type,collection,rerender,ref){document.querySelectorAll(`[data-del-${type}]`).forEach(b=>b.onclick=()=>{let id=b.dataset['del'+type[0].toUpperCase()+type.slice(1)];if(db.assignments.some(a=>a[ref]===id))return alert('لا يمكن الحذف لأنه مرتبط بتكليف');db[collection]=db[collection].filter(x=>x.id!==id);save();rerender()})}

function openEditModal(title, fields, onSave){
  const overlay=document.createElement('div'); overlay.className='edit-overlay';
  overlay.innerHTML=`<div class="edit-card" role="dialog" aria-modal="true"><div class="edit-head"><h3>${esc(title)}</h3><button type="button" class="icon-close" aria-label="إغلاق">×</button></div><div class="edit-fields"></div><div class="actions"><button type="button" class="save-edit">حفظ التعديلات</button><button type="button" class="secondary cancel-edit">إلغاء</button></div></div>`;
  const host=overlay.querySelector('.edit-fields');
  fields.forEach(f=>{
    const wrap=document.createElement('div');wrap.className='field';
    const label=document.createElement('label');label.textContent=f.label;wrap.appendChild(label);
    const input=document.createElement(f.type==='textarea'?'textarea':'input');
    input.dataset.key=f.key;
    if(f.type&&f.type!=='textarea')input.type=f.type;
    input.value=f.value??'';
    if(f.placeholder)input.placeholder=f.placeholder;
    wrap.appendChild(input);host.appendChild(wrap);
  });
  document.body.appendChild(overlay);
  const close=()=>overlay.remove();
  overlay.querySelector('.icon-close').onclick=close;
  overlay.querySelector('.cancel-edit').onclick=close;
  overlay.onclick=e=>{if(e.target===overlay)close()};
  overlay.querySelector('.save-edit').onclick=()=>{
    const values={};overlay.querySelectorAll('[data-key]').forEach(i=>values[i.dataset.key]=i.value);
    if(onSave(values)!==false)close();
  };
}
function editTeacher(id){
  const t=db.teachers.find(x=>x.id===id);if(!t)return;
  openEditModal('تعديل بيانات المدرس',[
    {key:'name',label:'الاسم الكامل',value:t.name},
    {key:'specialty',label:'التخصص',value:t.specialty||''},
    {key:'notes',label:'ملاحظات',value:t.notes||'',type:'textarea'}
  ],v=>{
    v.name=v.name.trim();if(!v.name){alert('اسم المدرس مطلوب');return false}
    if(db.teachers.some(x=>x.id!==t.id&&x.name===v.name)){alert('يوجد مدرس بهذا الاسم');return false}
    t.name=v.name;t.specialty=v.specialty.trim();t.notes=v.notes.trim();db.timetable=[];save();teachers();
  });
}
function editSubject(id){
  const s=db.subjects.find(x=>x.id===id);if(!s)return;
  openEditModal('تعديل المادة',[
    {key:'name',label:'اسم المادة',value:s.name},
    {key:'color',label:'لون المادة',value:s.color||'#DCE8F2',type:'color'}
  ],v=>{
    v.name=v.name.trim();if(!v.name){alert('اسم المادة مطلوب');return false}
    if(db.subjects.some(x=>x.id!==s.id&&x.name===v.name)){alert('توجد مادة بهذا الاسم');return false}
    s.name=v.name;s.color=v.color;db.timetable=[];save();subjects();
  });
}

function editSubjectRule(id){
 const sub=db.subjects.find(x=>x.id===id);if(!sub)return;const r=db.subjectRules[id]||{};
 const overlay=document.createElement('div');overlay.className='edit-overlay';overlay.innerHTML=`<div class="edit-card"><div class="edit-head"><h3>قيود مادة ${esc(sub.name)}</h3><button class="icon-close" id="srClose">×</button></div><div class="edit-fields"><label><input type="checkbox" id="srFirst" ${r.noFirst?'checked':''}> منع الحصة الأولى</label><label><input type="checkbox" id="srLast" ${r.noLast?'checked':''}> منع آخر حصة فعلية للشعبة</label><label><input type="checkbox" id="srRepeat" ${r.noRepeat?'checked':''}> منع تكرار المادة في اليوم</label><div class="field"><label>النوع</label><select id="srStrict"><option value="hard" ${r.strict!=='soft'?'selected':''}>إلزامي</option><option value="soft" ${r.strict==='soft'?'selected':''}>تفضيلي</option></select></div><div class="field"><label>المرحلة</label><select id="srStage"><option value="">كل المراحل</option>${db.stages.map(g=>`<option value="${g.id}" ${r.stageId===g.id?'selected':''}>${esc(g.name)}</option>`).join('')}</select></div></div><div class="actions"><button id="srSave">حفظ القيود</button><button class="secondary" id="srCancel">إلغاء</button></div></div>`;document.body.appendChild(overlay);overlay.querySelector('#srClose').onclick=overlay.querySelector('#srCancel').onclick=()=>overlay.remove();overlay.querySelector('#srSave').onclick=()=>{db.subjectRules[id]={noFirst:overlay.querySelector('#srFirst').checked,noLast:overlay.querySelector('#srLast').checked,noRepeat:overlay.querySelector('#srRepeat').checked,strict:overlay.querySelector('#srStrict').value,stageId:overlay.querySelector('#srStage').value};db.timetable=[];save();overlay.remove();subjects()};
}
function subjects(){
  $('#workspace').innerHTML=`<h2>المواد الدراسية</h2><div class="grid"><div class="field"><label>اسم المادة</label><input id="subjectName"></div><div class="field"><label>لون المادة</label><input id="subjectColor" type="color" value="#DCE8F2"></div></div><div class="actions"><button id="addSubject">إضافة مادة</button></div>
  <table><thead><tr><th>الاسم</th><th>اللون</th><th>الإجراءات</th></tr></thead><tbody>${db.subjects.length?db.subjects.map(x=>`<tr><td>${esc(x.name)}</td><td><span class="tag" style="background:${x.color}">${x.color}</span></td><td><button class="secondary edit-visible" data-edit-sub="${x.id}">✏️ تعديل</button> <button class="secondary" data-rule-sub="${x.id}">قيود الجدولة</button> <button class="danger" data-del-sub="${x.id}">حذف</button></td></tr>`).join(''):'<tr><td colspan="3" class="empty">لا توجد مواد</td></tr>'}</tbody></table>`;
  $('#addSubject').onclick=()=>{let name=$('#subjectName').value.trim();if(!name)return;if(db.subjects.some(x=>x.name===name))return alert('المادة موجودة');db.subjects.push({id:uid('sub'),name,color:$('#subjectColor').value});db.timetable=[];save();subjects()};
  document.querySelectorAll('[data-edit-sub]').forEach(b=>b.onclick=()=>editSubject(b.dataset.editSub));
  document.querySelectorAll('[data-del-sub]').forEach(b=>b.onclick=()=>{if(db.assignments.some(a=>a.subjectId===b.dataset.delSub))return alert('لا يمكن حذف مادة مرتبطة بتكليف');db.subjects=db.subjects.filter(x=>x.id!==b.dataset.delSub);db.timetable=[];save();subjects()});
document.querySelectorAll('[data-rule-sub]').forEach(b=>b.onclick=()=>editSubjectRule(b.dataset.ruleSub));}
function teachers(){
  $('#workspace').innerHTML=`<h2>المدرسون</h2><div class="grid"><div class="field"><label>الاسم الكامل</label><input id="teacherName"></div><div class="field"><label>التخصص</label><input id="teacherSpec"></div><div class="field"><label>ملاحظات</label><input id="teacherNotes"></div></div><div class="actions"><button id="addTeacher">إضافة مدرس</button></div><h3>إدخال جماعي</h3><div class="notice">كل مدرس في سطر، وافصل الاسم والتخصص والملاحظات بـ Tab أو فاصلة.</div><div class="field"><textarea id="bulkTeachers"></textarea></div><div class="actions"><button id="bulkAdd">إضافة القائمة</button></div>
  <table><thead><tr><th>الاسم</th><th>التخصص</th><th>ملاحظات</th><th>الإجراءات</th></tr></thead><tbody>${db.teachers.length?db.teachers.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.specialty||'')}</td><td>${esc(x.notes||'')}</td><td><button class="secondary edit-visible" data-edit-tea="${x.id}">✏️ تعديل</button> <button class="danger" data-del-tea="${x.id}">حذف</button></td></tr>`).join(''):'<tr><td colspan="4" class="empty">لا يوجد مدرسون</td></tr>'}</tbody></table>`;
  function add(n,s='',no=''){n=n.trim();if(!n||db.teachers.some(t=>t.name===n))return false;db.teachers.push({id:uid('tea'),name:n,specialty:s.trim(),notes:no.trim()});return true}
  $('#addTeacher').onclick=()=>{if(add($('#teacherName').value,$('#teacherSpec').value,$('#teacherNotes').value)){db.timetable=[];save();teachers()}else alert('الاسم فارغ أو مكرر')};
  $('#bulkAdd').onclick=()=>{let n=0;$('#bulkTeachers').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).forEach(line=>{let p=line.includes('\t')?line.split('\t'):line.split(',');if(add(p[0]||'',p[1]||'',p.slice(2).join(' ')))n++});db.timetable=[];save();alert(`تمت إضافة ${n} مدرس`);teachers()};
  document.querySelectorAll('[data-edit-tea]').forEach(b=>b.onclick=()=>editTeacher(b.dataset.editTea));
  document.querySelectorAll('[data-del-tea]').forEach(b=>b.onclick=()=>{if(db.assignments.some(a=>a.teacherId===b.dataset.delTea))return alert('لا يمكن حذف مدرس مرتبط بتكليف');db.teachers=db.teachers.filter(x=>x.id!==b.dataset.delTea);delete db.teacherRules[b.dataset.delTea];db.timetable=[];save();teachers()});
}

function loadFor(stageId,subjectId){return +(db.stageLoads[stageId+'|'+subjectId]||0)}
function loads(){
 const stages=db.stages.slice().sort((a,b)=>a.order-b.order);
 $('#workspace').innerHTML=`<h2>عدد حصص المواد حسب المرحلة</h2><div class="notice">أدخل العدد الأسبوعي مرة واحدة لكل مادة ومرحلة. الرقم صفر يعني أن المادة غير مقررة لهذه المرحلة. يمكن تخصيص عدد مختلف عند التكليف.</div><div class="tt-wrap"><table class="load-matrix"><thead><tr><th>المادة</th>${stages.map(g=>`<th style="border-top:5px solid ${g.color}">${esc(g.name)}</th>`).join('')}</tr></thead><tbody>${db.subjects.map(sub=>`<tr><th>${esc(sub.name)}</th>${stages.map(g=>`<td><input type="number" min="0" max="20" data-load="${g.id}|${sub.id}" value="${loadFor(g.id,sub.id)}"></td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="actions"><button id="saveLoads">حفظ خطة الحصص</button></div>`;
 $('#saveLoads').onclick=()=>{document.querySelectorAll('[data-load]').forEach(i=>db.stageLoads[i.dataset.load]=Math.max(0,Math.min(20,+i.value||0)));save();alert('حُفظت خطة الحصص. لا تتغير التكليفات القديمة تلقائياً.')};
}
function assignments(){
 const teachers=[...db.teachers].sort((a,b)=>a.name.localeCompare(b.name,'ar'));
 const selected=window.assignTeacher&&db.teachers.some(t=>t.id===window.assignTeacher)?window.assignTeacher:teachers[0]?.id;
 const auditTarget=window.auditTarget||null; if(auditTarget?.teacherId)window.assignTeacher=auditTarget.teacherId;
 const stages=[...db.stages].sort((a,b)=>a.order-b.order);
 const count=t=>db.assignments.filter(a=>a.teacherId===t.id).length;
 const hours=t=>db.assignments.filter(a=>a.teacherId===t.id).reduce((n,a)=>n+(+a.weeklyPeriods||0),0);
 const assigned=teachers.filter(t=>count(t)).length;
 $('#workspace').innerHTML=`<h2>إدارة تكليفات المدرسين</h2><div class="notice">اختر المدرس من الفهرس، ثم أضف له مواداً وشعباً متعددة. التخصص لا يمنع تكليف المدرس بمادة أخرى.</div>
 <div class="assignment-stats"><div>المدرسون <b>${teachers.length}</b></div><div>المكلفون <b>${assigned}</b></div><div>غير المكلفين <b>${teachers.length-assigned}</b></div><div>إجمالي التكليفات <b>${db.assignments.length}</b></div></div>
 <div class="assignment-layout"><aside class="teacher-index"><div class="field"><label>بحث باسم المدرس أو تخصصه</label><input id="asSearch" placeholder="بحث سريع..."></div><div class="field"><label>فرز المدرسين</label><select id="asSort"><option value="name">الاسم أبجدياً</option><option value="spec">التخصص ثم الاسم</option></select></div><div class="field"><label>حالة التكليف</label><select id="asStatus"><option value="all">الجميع</option><option value="assigned">المكلفون</option><option value="unassigned">غير المكلفين</option></select></div><div id="asTeacherList" class="teacher-list"></div></aside>
 <section class="assignment-editor"><div id="asSelected"></div><div class="assignment-form"><h3>إضافة تكليفات متعددة</h3><div class="grid"><div class="field"><label>المادة</label><select id="asSubject">${db.subjects.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></div><div class="field"><label>المرحلة</label><select id="asStage">${stages.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></div></div><div class="field"><label>الشعب (يمكن اختيار أكثر من شعبة)</label><div id="asSections" class="pick-list"></div></div><div class="grid"><div class="field"><label>عدد الحصص الأسبوعية</label><input id="asPeriods" type="number" min="1" max="20" placeholder="من خطة المرحلة"></div><div class="field"><label>خطة المرحلة</label><div id="asSuggested" class="hint"></div></div></div><div class="actions"><button id="asAddDraft">إضافة إلى قائمة المراجعة</button><button id="asSaveDraft" class="secondary">حفظ التكليفات المختارة</button></div><div id="asDraft" class="draft-list"></div></div><h3>تكليفات المدرس الحالية</h3><div id="asCurrent"></div></section></div>`;
 let draft=[],tid=selected;
 const list=$('#asTeacherList'),current=$('#asCurrent'),head=$('#asSelected');
 function stageName(id){return db.stages.find(x=>x.id===id)?.name||'—'}
 function sectionName(id){let x=db.sections.find(x=>x.id===id);return x?stageName(x.stageId)+' '+x.name:'—'}
 function paintList(){let term=$('#asSearch').value.trim().toLocaleLowerCase('ar'),sort=$('#asSort').value,status=$('#asStatus').value;let a=teachers.filter(t=>(status==='all'||(status==='assigned'?count(t)>0:count(t)===0))&&(t.name.toLocaleLowerCase('ar').includes(term)||(t.specialty||'').toLocaleLowerCase('ar').includes(term)));a.sort((x,y)=>sort==='spec'?(x.specialty||'').localeCompare(y.specialty||'','ar')||x.name.localeCompare(y.name,'ar'):x.name.localeCompare(y.name,'ar'));list.innerHTML=a.map(t=>`<button class="teacher-row ${tid===t.id?'chosen':''}" data-tid="${t.id}"><strong>${esc(t.name)}</strong><small>${esc(t.specialty||'دون تخصص')} · ${hours(t)} حصة · ${count(t)?count(t)+' تكليف':'غير مكلف'}</small></button>`).join('')||'<div class="empty">لا توجد نتائج</div>';list.querySelectorAll('[data-tid]').forEach(b=>b.onclick=()=>{tid=b.dataset.tid;window.assignTeacher=tid;draft=[];paintList();paintTeacher()})}
 function paintTeacher(){let t=db.teachers.find(x=>x.id===tid);head.innerHTML=t?`<div class="selected-teacher"><h3>${esc(t.name)}</h3><span>${esc(t.specialty||'دون تخصص')} · ${hours(t)} حصة أسبوعياً</span></div>`:'<div class="notice warning">أضف مدرسين أولاً</div>';const a=db.assignments.filter(x=>x.teacherId===tid);current.innerHTML=a.length?`<div class="tt-wrap"><table><thead><tr><th>المادة</th><th>الشعبة</th><th>الحصص</th><th>إجراءات</th></tr></thead><tbody>${a.map(x=>`<tr><td>${esc(db.subjects.find(y=>y.id===x.subjectId)?.name||'—')}</td><td>${esc(sectionName(x.sectionId))}</td><td>${x.weeklyPeriods}</td><td><button class="secondary" data-edit-a="${x.id}">تعديل</button> <button class="danger" data-del-a="${x.id}">حذف</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="notice">هذا المدرس غير مكلف بعد.</div>';current.querySelectorAll('[data-edit-a]').forEach(b=>b.onclick=()=>assignmentEditDialog(b.dataset.editA));current.querySelectorAll('[data-del-a]').forEach(b=>b.onclick=()=>{if(!confirm('حذف هذا التكليف؟'))return;db.fixedLessons=db.fixedLessons.filter(f=>f.assignmentId!==b.dataset.delA);db.assignments=db.assignments.filter(a=>a.id!==b.dataset.delA);db.timetable=[];save();assignments()})}
 function sections(){let stage=$('#asStage').value;$('#asSections').innerHTML=db.sections.filter(x=>x.stageId===stage).sort((a,b)=>a.order-b.order).map(x=>`<label><input type="checkbox" value="${x.id}"> ${esc(x.name)}</label>`).join('')||'<span class="hint">لا توجد شعب لهذه المرحلة</span>';suggest()}
 function suggest(){let n=loadFor($('#asStage').value,$('#asSubject').value);$('#asSuggested').textContent=n?n+' حصص أسبوعياً':'غير محدد: أدخل العدد يدوياً أو من حصص المراحل';$('#asPeriods').value=n||''}
 function paintDraft(){$('#asDraft').innerHTML=draft.length?`<h4>مراجعة قبل الحفظ (${draft.length})</h4><div class="tt-wrap"><table><thead><tr><th>المادة</th><th>الشعبة</th><th>الحصص</th><th></th></tr></thead><tbody>${draft.map((x,i)=>`<tr><td>${esc(db.subjects.find(z=>z.id===x.subjectId)?.name||'')}</td><td>${esc(sectionName(x.sectionId))}</td><td>${x.weeklyPeriods}</td><td><button class="danger" data-draft="${i}">إزالة</button></td></tr>`).join('')}</tbody></table></div>`:'';document.querySelectorAll('[data-draft]').forEach(b=>b.onclick=()=>{draft.splice(+b.dataset.draft,1);paintDraft()})}
 $('#asSearch').oninput=paintList;$('#asSort').onchange=paintList;$('#asStatus').onchange=paintList;$('#asStage').onchange=sections;$('#asSubject').onchange=suggest;
 $('#asAddDraft').onclick=()=>{if(!tid)return alert('اختر مدرساً');let subjectId=$('#asSubject').value,weeklyPeriods=+$('#asPeriods').value,ids=[...document.querySelectorAll('#asSections input:checked')].map(x=>x.value);if(!ids.length)return alert('اختر شعبة واحدة على الأقل');if(!Number.isInteger(weeklyPeriods)||weeklyPeriods<1||weeklyPeriods>20)return alert('أدخل عدد حصص صحيحاً من 1 إلى 20');let n=0;ids.forEach(sectionId=>{if(db.assignments.some(a=>a.subjectId===subjectId&&a.sectionId===sectionId)||draft.some(a=>a.subjectId===subjectId&&a.sectionId===sectionId))return;draft.push({teacherId:tid,subjectId,sectionId,weeklyPeriods});n++});paintDraft();if(!n)alert('هذه المادة مكلفة مسبقاً لهذه الشعب، أو موجودة في قائمة المراجعة')};
 $('#asSaveDraft').onclick=()=>{if(!draft.length)return alert('أضف تكليفات إلى قائمة المراجعة أولاً');let n=0;draft.forEach(a=>{if(!db.assignments.some(x=>x.subjectId===a.subjectId&&x.sectionId===a.sectionId)){db.assignments.push({id:uid('asg'),...a});n++}});if(n){db.timetable=[];save()}draft=[];alert('تم حفظ '+n+' تكليف');assignments()};
 sections();paintList();paintTeacher();
 if(auditTarget){
   if(auditTarget.stageId && $('#asStage')){$('#asStage').value=auditTarget.stageId;sections()}
   if(auditTarget.subjectId && $('#asSubject')){$('#asSubject').value=auditTarget.subjectId;suggest()}
   if(auditTarget.sectionId){const chk=[...document.querySelectorAll('#asSections input')].find(x=>x.value===auditTarget.sectionId);if(chk)chk.checked=true}
   window.auditTarget=null;
 }
}
// Read-only assignment audit. Stage loads define the planned weekly periods per subject.
const auditState={stage:'all',section:'all',status:'all',teacher:'all'};
function auditRows(){
 const result=[];
 const byPair=new Map();
 db.assignments.forEach(a=>{const k=a.sectionId+'|'+a.subjectId;if(!byPair.has(k))byPair.set(k,[]);byPair.get(k).push(a)});
 const stages=[...db.stages].sort((a,b)=>a.order-b.order);
 stages.forEach(g=>{
  db.sections.filter(sec=>sec.stageId===g.id).sort((a,b)=>(a.order||0)-(b.order||0)).forEach(sec=>{
   const subjectIds=new Set(db.subjects.filter(sub=>loadFor(g.id,sub.id)>0).map(x=>x.id));
   db.assignments.filter(a=>a.sectionId===sec.id).forEach(a=>subjectIds.add(a.subjectId));
   [...subjectIds].forEach(subjectId=>{
    const sub=db.subjects.find(x=>x.id===subjectId);
    const as=byPair.get(sec.id+'|'+subjectId)||[];
    const planned=loadFor(g.id,subjectId),assigned=as.reduce((n,a)=>n+(+a.weeklyPeriods||0),0);
    const status=as.length>1?'duplicate':planned===0?'unplanned':assigned<planned?'missing':assigned>planned?'extra':'ok';
    result.push({stage:g,section:sec,subject:sub,subjectId,planned,assigned,difference:assigned-planned,status,assignments:as,capacity:dayCapacity(sec)});
   });
  });
 });
 return result;
}
function audit(){
 const all=auditRows(),stages=[...db.stages].sort((a,b)=>a.order-b.order);
 const sections=db.sections.filter(x=>auditState.stage==='all'||x.stageId===auditState.stage);
 if(auditState.section!=='all'&&!sections.some(x=>x.id===auditState.section))auditState.section='all';
 const filtered=all.filter(x=>(auditState.stage==='all'||x.stage.id===auditState.stage)&&(auditState.section==='all'||x.section.id===auditState.section)&&(auditState.status==='all'||x.status===auditState.status)&&(auditState.teacher==='all'||x.assignments.some(a=>a.teacherId===auditState.teacher)));
 const totals=filtered.reduce((o,x)=>(o.planned+=x.planned,o.assigned+=x.assigned,o.missing+=Math.max(0,x.planned-x.assigned),o.extra+=Math.max(0,x.assigned-x.planned),o),{planned:0,assigned:0,missing:0,extra:0});
 const names={ok:'مكتمل',missing:'نقص',extra:'زيادة',duplicate:'تكليف مكرر',unplanned:'بلا خطة مقررة'};
 const opts=(items,sel,label)=>`<option value="all">${label}</option>`+items.map(x=>`<option value="${esc(x.id)}" ${sel===x.id?'selected':''}>${esc(x.name)}</option>`).join('');
 const teacherName=id=>db.teachers.find(t=>t.id===id)?.name||'مدرس غير موجود';
 const bySection=sections.filter(sec=>auditState.section==='all'||auditState.section===sec.id).map(sec=>{const rows=all.filter(x=>x.section.id===sec.id);const planned=rows.reduce((n,x)=>n+x.planned,0),assigned=rows.reduce((n,x)=>n+x.assigned,0);return {sec,planned,assigned,capacity:dayCapacity(sec),missing:rows.reduce((n,x)=>n+Math.max(0,x.planned-x.assigned),0)}});
 $('#workspace').innerHTML=`<div class="audit-screen"><div class="audit-heading"><div><h2>تدقيق التكليفات والحصص</h2><p>تقرير قراءة فقط: يقارن خطة حصص المراحل بالتكليفات المحفوظة، ولا يغير الجدول المولّد.</p></div><div class="actions"><button class="secondary" id="auditCSV">تصدير CSV</button><button class="secondary" id="auditPrint">طباعة التقرير</button></div></div>
 <div class="audit-filters"><div class="field"><label>المرحلة</label><select id="auditStage">${opts(stages,auditState.stage,'جميع المراحل')}</select></div><div class="field"><label>الشعبة</label><select id="auditSection">${opts(sections,auditState.section,'جميع الشعب')}</select></div><div class="field"><label>الحالة</label><select id="auditStatus">${[['all','جميع الحالات'],['missing','النقص فقط'],['extra','الزيادة فقط'],['duplicate','التكليف المكرر'],['unplanned','بلا خطة مقررة'],['ok','المكتمل']].map(([id,n])=>`<option value="${id}" ${auditState.status===id?'selected':''}>${n}</option>`).join('')}</select></div><div class="field"><label>المدرس</label><select id="auditTeacher">${opts([...db.teachers].sort((a,b)=>a.name.localeCompare(b.name,'ar')),auditState.teacher,'جميع المدرسين')}</select></div></div>
 <div class="audit-cards"><div>الحصص المخططة<b>${totals.planned}</b></div><div>الحصص المكلفة<b>${totals.assigned}</b></div><div class="audit-warn">النقص<b>${totals.missing}</b></div><div>الزيادة<b>${totals.extra}</b></div><div>صفوف التدقيق<b>${filtered.length}</b></div></div>
 <div class="notice">المصدر: «حصص المراحل» هو العدد المخطط لكل مادة وشعبة. «إدارة التكليفات» هي الحصص المكلفة فعلياً. إذا كانت الخطة غير مدخلة، تظهر التكليفات تحت «بلا خطة مقررة» ولا يمكن الحكم على اكتمالها. فرق سعة الجدول اليومي يظهر مستقلاً أدناه.</div>
 <h3>ملخص الشعب والسعة الأسبوعية</h3><div class="tt-wrap"><table><thead><tr><th>المرحلة / الشعبة</th><th>المخطط</th><th>المكلف</th><th>سعة الجدول</th><th>نقص المواد</th><th>ملاحظة</th></tr></thead><tbody>${bySection.map(x=>`<tr><td>${esc(stages.find(g=>g.id===x.sec.stageId)?.name||'—')} / ${esc(x.sec.name)}</td><td>${x.planned}</td><td>${x.assigned}</td><td>${x.capacity}</td><td>${x.missing}</td><td>${x.planned!==x.capacity?'الخطة تختلف عن سعة الجدول':x.assigned!==x.capacity?'التكليفات تختلف عن السعة':'متطابق مع السعة'}</td></tr>`).join('')||'<tr><td colspan="6">لا توجد شعب</td></tr>'}</tbody></table></div>
 <h3>تفاصيل المواد والتكليفات</h3><div class="tt-wrap"><table class="audit-table"><thead><tr><th>المرحلة / الشعبة</th><th>المادة</th><th>المخطط</th><th>المكلف</th><th>الفرق</th><th>المدرس / المدرسون</th><th>الحالة</th><th>المعالجة</th></tr></thead><tbody>${filtered.map(x=>`<tr><td>${esc(x.stage.name)} / ${esc(x.section.name)}</td><td>${esc(x.subject?.name||'مادة محذوفة')}</td><td>${x.planned}</td><td>${x.assigned}</td><td>${x.difference>0?'+':''}${x.difference}</td><td>${esc(x.assignments.map(a=>teacherName(a.teacherId)).join('، ')||'غير مكلف')}</td><td><span class="audit-pill ${x.status}">${names[x.status]}</span></td><td><button class="secondary audit-fix" data-stage="${esc(x.stage.id)}" data-section="${esc(x.section.id)}" data-subject="${esc(x.subjectId)}" data-teacher="${esc(x.assignments[0]?.teacherId||'')}">فتح التكليفات</button></td></tr>`).join('')||'<tr><td colspan="8">لا توجد نتائج وفق المرشحات الحالية.</td></tr>'}</tbody></table></div>
 <h3>نصاب المدرسين عبر جميع المراحل</h3><div class="tt-wrap"><table><thead><tr><th>المدرس</th><th>التخصص</th><th>التكليفات</th><th>الحصص الأسبوعية</th><th>الشعب والمواد</th><th>إجراء</th></tr></thead><tbody>${[...db.teachers].sort((a,b)=>a.name.localeCompare(b.name,'ar')).filter(t=>auditState.teacher==='all'||t.id===auditState.teacher).map(t=>{const as=db.assignments.filter(a=>a.teacherId===t.id);return `<tr><td>${esc(t.name)}</td><td>${esc(t.specialty||'—')}</td><td>${as.length}</td><td>${as.reduce((n,a)=>n+(+a.weeklyPeriods||0),0)}</td><td>${esc(as.map(a=>{const sec=db.sections.find(x=>x.id===a.sectionId);const stage=stages.find(g=>g.id===sec?.stageId);return (stage?.name||'—')+' / '+(sec?.name||'—')+' — '+(db.subjects.find(s=>s.id===a.subjectId)?.name||'—')+' ('+a.weeklyPeriods+')'}).join('، ')||'غير مكلف')}</td><td><button class="secondary audit-teacher" data-teacher="${esc(t.id)}">تكليفات المدرس</button></td></tr>`}).join('')}</tbody></table></div></div>`;
 ['stage','section','status','teacher'].forEach(key=>{$('#audit'+key[0].toUpperCase()+key.slice(1)).onchange=e=>{auditState[key]=e.target.value;if(key==='stage')auditState.section='all';audit()}});
 document.querySelectorAll('.audit-fix').forEach(b=>b.onclick=()=>{window.auditTarget={stageId:b.dataset.stage,sectionId:b.dataset.section,subjectId:b.dataset.subject,teacherId:b.dataset.teacher||null};if(!window.auditTarget.teacherId){window.auditTarget.teacherId=db.teachers[0]?.id||null}if(window.auditTarget.teacherId)window.assignTeacher=window.auditTarget.teacherId;page='assignments';render()});
 document.querySelectorAll('.audit-teacher').forEach(b=>b.onclick=()=>{window.assignTeacher=b.dataset.teacher;page='assignments';render()});
 $('#auditCSV').onclick=()=>{const rows=[['المرحلة','الشعبة','المادة','المخطط','المكلف','الفرق','المدرسون','الحالة'],...filtered.map(x=>[x.stage.name,x.section.name,x.subject?.name||'',x.planned,x.assigned,x.difference,x.assignments.map(a=>teacherName(a.teacherId)).join(' / '),names[x.status]])];const csv='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='assignment-audit.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000)};
 $('#auditPrint').onclick=()=>window.print();
}
function defaultRule(tid){let unavailable={};db.days.filter(d=>d.active).forEach(d=>unavailable[d.id]=[]);return {teacherId:tid,unavailable,preferred:[],avoid:[],maxDaily:7,consecutive:'neutral'}}
function rule(tid){if(!db.teacherRules[tid])db.teacherRules[tid]=defaultRule(tid);return db.teacherRules[tid]}
function constraints(){if(!db.teachers.length){$('#workspace').innerHTML='<h2>قيود المدرسين</h2><div class="notice warning">أضف المدرسين أولاً.</div>';return}let tid=(window.constraintTeacher&&db.teachers.some(t=>t.id===window.constraintTeacher))?window.constraintTeacher:db.teachers[0].id;window.constraintTeacher=tid;let r=rule(tid),maxP=Math.max(0,...db.days.filter(d=>d.active).map(d=>d.periods));let grid=`<div class="slot-grid" style="--periods:${maxP}"><div class="slot-head">اليوم</div>${Array.from({length:maxP},(_,i)=>`<div class="slot-head">${i+1}</div>`).join('')}${db.days.filter(d=>d.active).map(d=>`<div class="slot-head">${d.name}</div>${Array.from({length:maxP},(_,i)=>i<d.periods?`<div class="slot ${(r.unavailable[d.id]||[]).includes(i+1)?'unavailable':'available'}" data-slot="${d.id}|${i+1}">${(r.unavailable[d.id]||[]).includes(i+1)?'غير متاح':'متاح'}</div>`:`<div>—</div>`).join('')}`).join('')}</div>`;let pref=Array.from({length:maxP},(_,i)=>{let p=i+1,state=r.preferred.includes(p)?'preferred':r.avoid.includes(p)?'avoid':'';return `<button class="pref ${state}" data-pref="${p}">الحصة ${p}: ${state==='preferred'?'مفضلة':state==='avoid'?'تجنب':'عادية'}</button>`}).join('');$('#workspace').innerHTML=`<h2>قيود وتفضيلات المدرسين</h2><div class="field"><label>المدرس</label><select id="constraintTeacher">${db.teachers.map(t=>`<option value="${t.id}" ${t.id===tid?'selected':''}>${esc(t.name)}</option>`).join('')}</select></div><h3>التوفر الأسبوعي</h3><div class="notice">اضغط أي حصة للتبديل بين متاح وغير متاح. اضغط اسم اليوم لتعطيل/إتاحة اليوم بالكامل.</div><div class="actions">${db.days.filter(d=>d.active).map(d=>`<button class="secondary" data-daytoggle="${d.id}">${d.name}: ${(r.unavailable[d.id]||[]).length>=d.periods?'غير متاح':'متاح جزئياً/كلياً'}</button>`).join('')}</div><div class="availability">${grid}</div><h3>تفضيل أرقام الحصص</h3><div class="pref-grid">${pref}</div><div class="grid" style="margin-top:18px"><div class="field"><label>الحد الأعلى المفضل للحصص اليومية</label><input id="maxDaily" type="number" min="1" max="12" value="${r.maxDaily}"></div><div class="field"><label>الحد الأدنى في يوم التدريس (0 = لا يوجد)</label><input id="minDaily" type="number" min="0" max="12" value="${r.minDaily||0}"></div><div class="field"><label>الحصص المتتالية</label><select id="consecutive"><option value="neutral" ${r.consecutive==='neutral'?'selected':''}>لا تفضيل</option><option value="prefer" ${r.consecutive==='prefer'?'selected':''}>أفضل المتتالية</option><option value="avoid" ${r.consecutive==='avoid'?'selected':''}>أفضل عدم التتالي</option></select></div></div><div class="actions"><button id="saveRules">حفظ القيود</button></div>`;$('#constraintTeacher').onchange=e=>{window.constraintTeacher=e.target.value;constraints()};document.querySelectorAll('[data-slot]').forEach(x=>x.onclick=()=>{let [d,p]=x.dataset.slot.split('|');p=+p;r.unavailable[d]=r.unavailable[d]||[];r.unavailable[d]=r.unavailable[d].includes(p)?r.unavailable[d].filter(v=>v!==p):[...r.unavailable[d],p];save();constraints()});document.querySelectorAll('[data-daytoggle]').forEach(x=>x.onclick=()=>{let d=db.days.find(z=>z.id===x.dataset.daytoggle);r.unavailable[d.id]=(r.unavailable[d.id]||[]).length>=d.periods?[]:Array.from({length:d.periods},(_,i)=>i+1);save();constraints()});document.querySelectorAll('[data-pref]').forEach(x=>x.onclick=()=>{let p=+x.dataset.pref;if(r.preferred.includes(p)){r.preferred=r.preferred.filter(v=>v!==p);r.avoid.push(p)}else if(r.avoid.includes(p)){r.avoid=r.avoid.filter(v=>v!==p)}else r.preferred.push(p);save();constraints()});$('#saveRules').onclick=()=>{r.maxDaily=Math.max(1,+$('#maxDaily').value||1);r.minDaily=Math.max(0,+$('#minDaily').value||0);if(r.minDaily>r.maxDaily)return alert('الحد الأدنى أكبر من الحد الأعلى');r.consecutive=$('#consecutive').value;save();alert('تم حفظ قيود المدرس')}}
function fixed(){if(!db.assignments.length){$('#workspace').innerHTML='<h2>الحصص المثبتة</h2><div class="notice warning">أضف التكليفات أولاً.</div>';return}let active=db.days.filter(d=>d.active);let label=a=>{let t=db.teachers.find(x=>x.id===a.teacherId),s=db.subjects.find(x=>x.id===a.subjectId),se=db.sections.find(x=>x.id===a.sectionId),g=se&&db.stages.find(x=>x.id===se.stageId);return `${t?.name||'—'} — ${s?.name||'—'} — ${g?.name||''} ${se?.name||''}`};$('#workspace').innerHTML=`<h2>الحصص المثبتة</h2><div class="notice">الحصة المثبتة ستبقى في موقعها عند التوليد لاحقاً.</div><div class="grid"><div class="field"><label>التكليف</label><select id="fAssignment">${db.assignments.map(a=>`<option value="${a.id}">${esc(label(a))}</option>`).join('')}</select></div><div class="field"><label>اليوم</label><select id="fDay">${active.map(d=>`<option value="${d.id}">${d.name}</option>`).join('')}</select></div><div class="field"><label>الحصة</label><input id="fPeriod" type="number" min="1" value="1"></div></div><div class="actions"><button id="addFixed">تثبيت الحصة</button></div>${db.fixedLessons.map(f=>{let a=db.assignments.find(x=>x.id===f.assignmentId),d=db.days.find(x=>x.id===f.dayId);return `<div class="lock-card"><b>${a?esc(label(a)):'تكليف محذوف'}</b><div class="muted">${d?.name||'—'} — الحصة ${f.period}</div><div class="actions"><button class="danger" data-del-fixed="${f.id}">إلغاء التثبيت</button></div></div>`}).join('')||'<div class="empty">لا توجد حصص مثبتة</div>'}`;$('#addFixed').onclick=()=>{let assignmentId=$('#fAssignment').value,dayId=$('#fDay').value,period=+$('#fPeriod').value,d=db.days.find(x=>x.id===dayId),a=db.assignments.find(x=>x.id===assignmentId);if(!d||period<1||period>d.periods)return alert('رقم الحصة غير صالح لهذا اليوم');let r=rule(a.teacherId);if((r.unavailable[dayId]||[]).includes(period))return alert('لا يمكن التثبيت: المدرس غير متاح في هذا الوقت');let conflict=db.fixedLessons.find(f=>f.dayId===dayId&&f.period===period&&(()=>{let fa=db.assignments.find(x=>x.id===f.assignmentId);return fa&&(fa.teacherId===a.teacherId||fa.sectionId===a.sectionId)})());if(conflict)return alert('تعارض: المدرس أو الشعبة لديه حصة مثبتة في هذا الوقت');db.fixedLessons.push({id:uid('fix'),assignmentId,dayId,period});save();fixed()};document.querySelectorAll('[data-del-fixed]').forEach(b=>b.onclick=()=>{db.fixedLessons=db.fixedLessons.filter(x=>x.id!==b.dataset.delFixed);save();fixed()})}


function assignmentEditDialog(id){
  const a=db.assignments.find(x=>x.id===id); if(!a)return;
  const opts=db.sections.slice().sort((x,y)=>(db.stages.find(g=>g.id===x.stageId)?.order||0)-(db.stages.find(g=>g.id===y.stageId)?.order||0)||x.order-y.order);
  const box=document.createElement('div');box.className='edit-overlay';
  box.innerHTML=`<div class="edit-card"><h3>تعديل التكليف</h3>
  <div class="field"><label>المدرس</label><select id="eTeacher">${db.teachers.map(x=>`<option value="${x.id}" ${x.id===a.teacherId?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div>
  <div class="field"><label>المادة</label><select id="eSubject">${db.subjects.map(x=>`<option value="${x.id}" ${x.id===a.subjectId?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div>
  <div class="field"><label>الشعبة</label><select id="eSection">${opts.map(x=>{let g=db.stages.find(v=>v.id===x.stageId);return `<option value="${x.id}" ${x.id===a.sectionId?'selected':''}>${g?.name||''} ${esc(x.name)}</option>`}).join('')}</select></div>
  <div class="field"><label>الحصص الأسبوعية</label><input id="eWeekly" type="number" min="1" max="20" value="${a.weeklyPeriods}"></div>
  <div class="actions"><button id="saveEA">حفظ التعديل</button><button class="secondary" id="cancelEA">إلغاء</button></div></div>`;
  document.body.appendChild(box);
  box.querySelector('#cancelEA').onclick=()=>box.remove();
  box.querySelector('#saveEA').onclick=()=>{let teacherId=box.querySelector('#eTeacher').value,subjectId=box.querySelector('#eSubject').value,sectionId=box.querySelector('#eSection').value,weeklyPeriods=+box.querySelector('#eWeekly').value;if(weeklyPeriods<1)return alert('عدد الحصص غير صالح');if(db.assignments.some(x=>x.id!==a.id&&x.teacherId===teacherId&&x.subjectId===subjectId&&x.sectionId===sectionId))return alert('يوجد تكليف مطابق');a.teacherId=teacherId;a.subjectId=subjectId;a.sectionId=sectionId;a.weeklyPeriods=weeklyPeriods;db.fixedLessons=db.fixedLessons.filter(f=>f.assignmentId!==a.id);db.timetable=[];save();box.remove();assignments()};
}

function analyzeFeasibility(){
  const issues=[];
  const push=(level,title,detail,code)=>issues.push({level,title,detail,code});
  const activeDays=db.days.filter(d=>d.active&&d.periods>0);
  

  if(!db.school.name) push('red','اسم المدرسة غير محدد','أكمل إعداد المدرسة قبل إنشاء الجدول.','SCHOOL_NAME');
  if(!activeDays.length) push('red','لا توجد أيام دوام','فعّل يوماً واحداً على الأقل وحدد عدد حصصه.','NO_DAYS');
  if(!db.sections.length) push('red','لا توجد شعب','أضف الشعب التي سيُنشأ لها الجدول.','NO_SECTIONS');
  if(!db.subjects.length) push('red','لا توجد مواد','أضف المواد الدراسية.','NO_SUBJECTS');
  if(!db.teachers.length) push('red','لا يوجد مدرسون','أضف الكادر التدريسي.','NO_TEACHERS');
  if(!db.assignments.length) push('red','لا توجد تكليفات','أضف تكليفات المدرسين قبل التوليد.','NO_ASSIGNMENTS');

  db.sections.forEach(sec=>{
    const g=db.stages.find(x=>x.id===sec.stageId);
    const assigned=db.assignments.filter(a=>a.sectionId===sec.id).reduce((s,a)=>s+(+a.weeklyPeriods||0),0);
    const weeklyCapacity=dayCapacity(sec);
    if(assigned>weeklyCapacity) push('red',`سعة الشعبة غير كافية: ${g?.name||''} ${sec.name}`,`مطلوب ${assigned} حصة أسبوعياً بينما سعة الدوام ${weeklyCapacity} فقط.`,`SECTION_CAPACITY:${sec.id}`);
    else if(assigned<weeklyCapacity && assigned>0) push('orange',`الشعبة لديها حصص غير موزعة: ${g?.name||''} ${sec.name}`,`التكليفات الحالية ${assigned} من أصل ${weeklyCapacity} خانة أسبوعية.`,`SECTION_GAP:${sec.id}`);
    else if(assigned===0) push('orange',`لا توجد تكليفات للشعبة: ${g?.name||''} ${sec.name}`,'لن يمكن تكوين جدول كامل لهذه الشعبة.',`SECTION_EMPTY:${sec.id}`);
  });

  db.teachers.forEach(t=>{
    const required=db.assignments.filter(a=>a.teacherId===t.id).reduce((s,a)=>s+(+a.weeklyPeriods||0),0);
    if(!required)return;
    const r=rule(t.id);
    let available=0,availableDays=0;
    activeDays.forEach(d=>{
      const n=Math.max(0,d.periods-(r.unavailable[d.id]||[]).filter(p=>p>=1&&p<=d.periods).length);
      available+=n;if(n>0)availableDays++;
    });
    if(required>available) push('red',`توفر المدرس غير كافٍ: ${t.name}`,`مطلوب منه ${required} حصة، لكن قيوده تسمح بـ ${available} خانة فقط.`,`TEACHER_CAPACITY:${t.id}`);
    const maxDaily=Math.max(1,+r.maxDaily||99);
    if(required>availableDays*maxDaily) push('red',`الحد اليومي يمنع تكليفات ${t.name}`,`مطلوب ${required} حصة، وأقصى سعة وفق ${availableDays} أيام × ${maxDaily} حصص = ${availableDays*maxDaily}.`,`TEACHER_DAILY:${t.id}`);
  });

  db.assignments.forEach(a=>{
    const t=db.teachers.find(x=>x.id===a.teacherId),su=db.subjects.find(x=>x.id===a.subjectId),se=db.sections.find(x=>x.id===a.sectionId);
    if(!t||!su||!se){push('red','تكليف ببيانات مفقودة','يوجد تكليف مرتبط بمدرس أو مادة أو شعبة محذوفة.',`BROKEN:${a.id}`);return}
    const r=rule(t.id);
    let possibleDays=0;
    activeDays.forEach(d=>{if(d.periods-(r.unavailable[d.id]||[]).filter(p=>p<=d.periods).length>0)possibleDays++});
    if(a.weeklyPeriods>possibleDays && possibleDays>0){
      const repeats=a.weeklyPeriods-possibleDays;
      push('orange',`تكرار يومي ضروري: ${su.name} — ${se.name}`,`${t.name}: المادة تحتاج ${a.weeklyPeriods} حصص، والمدرس متاح في ${possibleDays} أيام فقط؛ يلزم على الأقل ${repeats} تكرار إضافي عبر الأيام.`,`REPEAT:${a.id}`);
    }
    if(possibleDays===0) push('red',`لا يوجد يوم متاح للتكليف: ${su.name}`,`${t.name} غير متاح في أي يوم دوام لهذا التكليف.`,`NO_DAY:${a.id}`);
    const sr=db.subjectRules[a.subjectId]||{},scopeOk=!sr.stageId||sr.stageId===se.stageId;
    if(scopeOk&&sr.strict!=='soft'){
      let allowed=0,allowedDays=0;
      activeDays.forEach(d=>{const cap=sectionDayPeriods(se,d);let count=0;for(let p=1;p<=cap;p++)if(!(sr.noFirst&&p===1)&&!(sr.noLast&&p===cap)&&!(r.unavailable[d.id]||[]).includes(p))count++;allowed+=count;if(count)allowedDays++});
      if(a.weeklyPeriods>allowed)push('red',`قيود المادة تمنع التكليف: ${su.name} — ${se.name}`,`المطلوب ${a.weeklyPeriods} والمتاح ${allowed} خانات فقط.`,`SUBJECT_CAP:${a.id}`);
      if(false&&sr.noRepeat&&a.weeklyPeriods>allowedDays)push('red',`تكرار ممنوع لمادة ${su.name}`,`المطلوب ${a.weeklyPeriods} حصص لكن الأيام الممكنة ${allowedDays} فقط.`,`SUBJECT_REPEAT:${a.id}`);
    }

  });

  db.fixedLessons.forEach(f=>{
    const a=db.assignments.find(x=>x.id===f.assignmentId),d=db.days.find(x=>x.id===f.dayId);
    if(!a||!d){push('red','حصة مثبتة غير صالحة','الحصة مرتبطة بتكليف أو يوم غير موجود.',`FIX_BROKEN:${f.id}`);return}
    const t=db.teachers.find(x=>x.id===a.teacherId),r=rule(a.teacherId);
    if(!d.active||f.period>sectionDayPeriods(db.sections.find(s=>s.id===a.sectionId)||{stageId:''},d)) push('red','حصة مثبتة خارج الدوام',`${t?.name||'مدرس'} — ${d.name} الحصة ${f.period}.`,`FIX_OUT:${f.id}`);
    if((r.unavailable[d.id]||[]).includes(f.period)) push('red','حصة مثبتة في وقت غير متاح',`${t?.name||'مدرس'} غير متاح في ${d.name} الحصة ${f.period}.`,`FIX_UNAVAILABLE:${f.id}`);
  });

  for(let i=0;i<db.fixedLessons.length;i++)for(let j=i+1;j<db.fixedLessons.length;j++){
    const x=db.fixedLessons[i],y=db.fixedLessons[j];
    if(x.dayId!==y.dayId||x.period!==y.period)continue;
    const ax=db.assignments.find(a=>a.id===x.assignmentId),ay=db.assignments.find(a=>a.id===y.assignmentId);
    if(ax&&ay&&ax.teacherId===ay.teacherId) push('red','تعارض حصص مثبتة للمدرس',`يوجد للمدرس نفسه حصتان مثبتتان في الوقت نفسه.`,`FIX_TEACHER:${x.id}:${y.id}`);
    if(ax&&ay&&ax.sectionId===ay.sectionId) push('red','تعارض حصص مثبتة للشعبة','توجد للشعبة نفسها حصتان مثبتتان في الوقت نفسه.',`FIX_SECTION:${x.id}:${y.id}`);
  }

  const unique=[]; const seen=new Set();
  issues.forEach(i=>{if(!seen.has(i.code)){seen.add(i.code);unique.push(i)}});
  return unique;
}
// Diagnostic checks are advisory unless a hard mathematical contradiction is proven.
function generationDiagnostics(result){
 const found=[];const add=(severity,title,detail,where)=>found.push({severity,title,detail,where});
 const active=db.days.filter(d=>d.active&&d.periods>0).sort((a,b)=>a.order-b.order);
 const tuesday=active.find(d=>/الثلاثاء/.test(d.name));
 if(tuesday){
  // School-specific policy: sixth stage has 7 Tuesday periods; other stages have 6.
  db.stages.forEach(g=>{
   const isSixth=g.order===6||/السادس/.test(g.name);const expected=isSixth?7:6;
   const actual=db.stageDayPeriods?.[g.id]?.[tuesday.id]??tuesday.periods;
   if(actual!==expected)add('warning',`اختلاف حصص الثلاثاء — ${g.name}`,`المسجل ${actual} حصص، بينما السياسة التي حددتها للمدرسة ${expected} حصص. افتح «الأيام والحصص» وصحح المرحلة. هذا اختلاف في الإعداد، وليس إثباتاً بأنه سبب فشل البحث.`,'days');
  });
 }
 const daysById=new Map(active.map(d=>[d.id,d]));
 db.sections.forEach(sec=>{
  const g=db.stages.find(x=>x.id===sec.stageId),name=`${g?.name||''} ${sec.name}`;
  const required=db.assignments.filter(a=>a.sectionId===sec.id).reduce((v,a)=>v+(+a.weeklyPeriods||0),0);
  const capacity=active.reduce((v,d)=>v+sectionDayPeriods(sec,d),0);
  if(required>capacity)add('block',`زيادة حصص الشعبة ${name}`,`المطلوب ${required} والسعة ${capacity}؛ يلزم تعديل التكليفات أو عدد الحصص.`,'assignments');
  else if(required<capacity)add('info',`فراغات نهاية اليوم — ${name}`,`هناك ${capacity-required} خانة غير مكلفة أسبوعياً؛ يجب أن تقع في نهايات الأيام، لا بين الحصص.`,'days');
 });
 db.teachers.forEach(t=>{
  const required=db.assignments.filter(a=>a.teacherId===t.id).reduce((v,a)=>v+(+a.weeklyPeriods||0),0);if(!required)return;
  const r=rule(t.id);let available=0;
  for(const d of active){let n=0;for(let period=1;period<=d.periods;period++)if(!(r.unavailable?.[d.id]||[]).includes(period))n++;available+=Math.min(n,Math.max(1,+r.maxDaily||99));}
  if(required>available)add('block',`نصاب غير قابل للتوزيع — ${t.name}`,`المطلوب ${required} حصة، والحد الأقصى المتاح بعد القيود اليومية ${available}.`,'constraints');
 });
 db.assignments.forEach(a=>{
  const sec=db.sections.find(x=>x.id===a.sectionId),t=db.teachers.find(x=>x.id===a.teacherId),sub=db.subjects.find(x=>x.id===a.subjectId);if(!sec||!t||!sub)return;
  const sr=db.subjectRules?.[a.subjectId]||{};if(sr.strict==='soft'||(sr.stageId&&sr.stageId!==sec.stageId))return;
  const r=rule(t.id);let slots=0,possibleDays=0;
  for(const d of active){const cap=sectionDayPeriods(sec,d);let n=0;for(let period=1;period<=cap;period++)if(!(sr.noFirst&&period===1)&&!(sr.noLast&&period===cap)&&!(r.unavailable?.[d.id]||[]).includes(period))n++;slots+=n;if(n)possibleDays++;}
  const required=+a.weeklyPeriods;
  if(required>possibleDays){add('warning',`تكرار ضروري — ${sub.name} / ${t.name}`,`الشعبة ${db.stages.find(g=>g.id===sec.stageId)?.name||''} ${sec.name}: ${required} حصص خلال ${possibleDays} أيام متاحة فقط. يلزم تكرار ${required-possibleDays} حصة على الأقل في يوم أو أكثر. سيسمح المحرك بالتكرار الضروري تلقائياً، دون تغيير قيود المدرس.`, 'constraints');}
  const dailyLimit=Math.max(1,+r.maxDaily||99);
  const perDay=active.map(d=>{const cap=sectionDayPeriods(sec,d);let count=0;for(let period=1;period<=cap;period++)if(!(sr.noFirst&&period===1)&&!(sr.noLast&&period===cap)&&!(r.unavailable?.[d.id]||[]).includes(period))count++;return Math.min(count,dailyLimit)});
  if(required>perDay.reduce((x,y)=>x+y,0))add('block',`استحالة توزيع — ${sub.name} / ${t.name}`,`الشعبة ${sec.name}: المطلوب ${required} والمتاح بعد احتساب الحد اليومي والقيود ${perDay.reduce((x,y)=>x+y,0)}. الإجراء: خفف قيد المدرس أو المادة.`, 'constraints');
  if(+a.weeklyPeriods>slots||false)add('block',`قيد المادة يمنع التكليف — ${sub.name}`,`${t.name}، ${db.stages.find(g=>g.id===sec.stageId)?.name||''} ${sec.name}: مطلوب ${a.weeklyPeriods} حصة، المتاح ${slots} خانة في ${possibleDays} أيام.`,'subjects');
 });
 if(result&&!result.ok&&['time','nodes','exhausted'].includes(result.reason))add('warning','لم يثبت استحالة الجدول',`المحرك توقف بعد ${result.nodes||0} عقدة، وأفضل عمق ${result.bestDepth||0} من ${result.total||'—'}. انتهاء البحث لا يثبت أن البيانات مستحيلة. راجع التنبيهات ثم أعد المحاولة.`,'feasibility');
 return found;
}
function diagnosticHtml(result){if(!result||result.ok)return '';
 const issues=generationDiagnostics(result);
 const colors={block:'🔴',warning:'🟠',info:'🔵'};
 return `<section class="generation-report"><h3>مساعد تشخيص فشل التوليد — إجراءات مقترحة</h3><p class="muted">لا يغير المساعد أي تكليف أو قيد دون موافقتك. الفحص يميز بين الخطأ المانع، واختلاف الإعدادات، والملاحظات. لا يعتبر انتهاء المهلة دليلاً على استحالة الجدول.</p>${issues.length?issues.map(x=>`<div class="issue ${x.severity==='block'?'red':'orange'}"><div class="issue-icon">${colors[x.severity]}</div><div style="flex:1"><b>${esc(x.title)}</b><div class="muted">${esc(x.detail)}</div><button type="button" class="secondary diagnostic-jump" data-target="${x.where}">فتح الإعداد المعني</button></div></div>`).join(''):'<div class="notice">لم يكشف الفحص السريع سبباً حاسماً. قد يكون التعارض مركباً أو خوارزمية البحث لم تصل إلى حل.</div>'}</section>`;
}
function wireDiagnostics(){document.querySelectorAll('.diagnostic-jump').forEach(b=>b.onclick=()=>{page=b.dataset.target;render()})}
function feasibility(){
  const issues=analyzeFeasibility(),reds=issues.filter(x=>x.level==='red').length,oranges=issues.filter(x=>x.level==='orange').length;
  const green=reds===0;
  const item=i=>`<div class="issue ${i.level}"><div class="issue-icon">${i.level==='red'?'🔴':'🟠'}</div><div><b>${esc(i.title)}</b><div class="muted">${esc(i.detail)}</div></div></div>`;
  $('#workspace').innerHTML=`<h2>فحص إمكانية إنشاء الجدول</h2><div class="notice">هذا الفحص لا يولد الجدول. وظيفته اكتشاف الاستحالات والتنازلات المتوقعة قبل تشغيل محرك التوليد.</div>
  <div class="feas-head ${green?'ok':'bad'}"><div class="feas-score">${green?'✓':'!'}</div><div><h3>${green?'يمكن الانتقال إلى التوليد':'توجد مشاكل يجب معالجتها'}</h3><div>${reds} أخطاء مانعة — ${oranges} تحذيرات</div></div></div>
  ${green&&oranges===0?'<div class="issue green"><div class="issue-icon">🟢</div><div><b>البيانات سليمة</b><div class="muted">لم يكتشف الفحص الحالي مشكلة تمنع إنشاء جدول صالح.</div></div></div>':''}
  ${issues.map(item).join('')}
  <div class="actions"><button id="rerun">إعادة الفحص</button>${green?'<button class="secondary" id="goGenerate">الانتقال إلى التوليد الآلي</button>':''}</div>`;
  $('#rerun').onclick=feasibility;
  if($('#goGenerate')) $('#goGenerate').onclick=()=>{page='generator';render()};
}


function teacherShort(name){return String(name||'').trim().split(/\s+/).slice(0,2).join(' ')}
function slotKey(dayId,period){return dayId+'|'+period}
// Generation runs in generator-worker.js; do not run backtracking on the UI thread.
let generationWorker=null;
let generationCancel=null;
function startGeneration(){
 if(generationWorker)return;
 const blockers=analyzeFeasibility().filter(x=>x.level==='red');
 if(blockers.length){alert('عالج الأخطاء المانعة أولاً');return;}
 if(db.timetable.length&&!confirm('سيبقى الجدول الحالي محفوظاً حتى ينجح إنشاء جدول جديد. متابعة؟'))return;
 const button=$('#generateBtn'),status=$('#generationProgress');
 button.disabled=true;button.textContent='جاري التوليد...';
 const began=Date.now();let finished=false,lastUpdate=Date.now(),lastProgress={nodes:0,bestDepth:0,total:0,placed:0},phase='تشغيل المحرك';
 let worker;try{worker=new Worker('generator-worker.js?v=0980')}catch(err){button.disabled=false;button.textContent='توليد الجدول تلقائياً';window.generationReport={ok:false,reason:'worker-error',message:'تعذر تشغيل ملف المحرك: '+String(err),seconds:'0'};generator();return}generationWorker=worker;
 const tick=setInterval(()=>{if(finished)return;const elapsed=Date.now()-began;
   if(elapsed>195000){finish({ok:false,reason:'time',...lastProgress,message:`أوقف مراقب السلامة المحرك بعد 195 ثانية. آخر مرحلة: ${phase}. لم تتغير البيانات.`});return}
   if(status)status.textContent=`${phase} — ${Math.round(elapsed/1000)} ثانية — عقد ${lastProgress.nodes} — أفضل عمق ${lastProgress.bestDepth} من ${lastProgress.total||'—'}. ${Date.now()-lastUpdate>7000?'المحرك مشغول بالحساب، يمكن إيقافه.':''}`;
 },500);
 generationCancel=()=>finish({ok:false,reason:'cancelled',...lastProgress,message:'أوقفت التوليد. بقي الجدول السابق محفوظاً.'});
 const stop=$('#stopGenerate');if(stop){stop.hidden=false;stop.onclick=()=>generationCancel()}
 const finish=result=>{if(finished)return;finished=true;clearInterval(tick);worker.terminate();generationWorker=null;generationCancel=null;
   if(result.ok&&!result.reused){db.timetable=result.entries.map((e,i)=>({...e,id:'ent_'+Date.now().toString(36)+'_'+i}));save();}
   window.generationReport={...result,seconds:((Date.now()-began)/1000).toFixed(1)};
   if(page==='generator')generator();
 };
 worker.onmessage=e=>{const data=e.data||{};lastUpdate=Date.now();if(data.type==='phase'){phase=data.phase||phase;return}if(data.type==='progress'){phase='البحث عن توزيع متوافق';lastProgress={nodes:data.nodes||0,bestDepth:data.bestDepth||0,total:data.total||0,placed:data.placed||0};return}if(data.type==='result')finish(data.result)};
 worker.onerror=e=>finish({ok:false,reason:'worker-error',message:'حدث خطأ في عامل التوليد. تأكد من رفع ملف generator-worker.js إلى GitHub.'});
 try{worker.postMessage({type:'start',db:structuredClone(db)})}catch(err){finish({ok:false,reason:'exception',message:'فشل إرسال البيانات إلى المحرك: '+String(err)})}
}

function scheduleQuality(){
  if(!db.timetable.length)return {score:0,repeats:0,avoid:0,gaps:0};
  let repeats=0,avoid=0,gaps=0;
  db.assignments.forEach(a=>{const by={};db.timetable.filter(e=>e.assignmentId===a.id).forEach(e=>by[e.dayId]=(by[e.dayId]||0)+1);Object.values(by).forEach(n=>{if(n>1)repeats+=n-1})});
  db.timetable.forEach(e=>{if(rule(e.teacherId).avoid.includes(e.period))avoid++});
  db.teachers.forEach(t=>db.days.filter(d=>d.active).forEach(d=>{const ps=db.timetable.filter(e=>e.teacherId===t.id&&e.dayId===d.id).map(e=>e.period).sort((a,b)=>a-b);if(ps.length>1)gaps+=Math.max(...ps)-Math.min(...ps)+1-ps.length}));
  const score=Math.max(0,100-repeats*5-avoid*2-gaps*2);
  return {score,repeats,avoid,gaps};
}

function timetableIssues(){
  let warnings=0;
  db.assignments.forEach(a=>{
    const es=db.timetable.filter(e=>e.assignmentId===a.id),days={};
    es.forEach(e=>days[e.dayId]=(days[e.dayId]||0)+1);
    Object.values(days).forEach(n=>{if(n>1)warnings+=n-1});
  });
  return warnings;
}
function timetableTable(stageIds=null, groupedPrint=false){
  if(!db.timetable.length)return '<div class="empty">لم يتم توليد جدول بعد.</div>';
  const secs=db.sections.filter(s=>!stageIds||stageIds.includes(s.stageId)).sort((a,b)=>(db.stages.find(g=>g.id===a.stageId)?.order||0)-(db.stages.find(g=>g.id===b.stageId)?.order||0)||a.order-b.order);
  // Actual content-based widths, rather than distributing columns across the paper.
  // Use short teacher names exactly as displayed, and cap long labels to wrap.
  const columnWidths=secs.map(sec=>{
    const labels=[(db.stages.find(g=>g.id===sec.stageId)?.name||'')+' '+sec.name];
    for(const e of db.timetable){if(e.sectionId!==sec.id)continue;
      labels.push(db.subjects.find(x=>x.id===e.subjectId)?.name||'');
      labels.push(teacherShort(db.teachers.find(x=>x.id===e.teacherId)?.name));
    }
    const approx=Math.max(...labels.map(x=>Array.from(String(x||'')).length*6.1));
    return Math.max(78,Math.min(112,Math.ceil(approx+13)));
  });
  const tableWidth=50+columnWidths.reduce((a,b)=>a+b,0);
  const maxP=Math.max(...db.days.filter(d=>d.active).map(d=>d.periods));
  let rows='';
  db.days.filter(d=>d.active).sort((a,b)=>a.order-b.order).forEach(d=>{
    for(let p=1;p<=d.periods;p++){
      rows+=`<tr class="day-row day-${d.id}">${p===1?`<th scope="rowgroup" rowspan="${d.periods}" class="day-label day-${d.id}"><span class="vertical-day">${esc(d.name)}</span></th>`:''}<th class="period-number">${p}</th>`+secs.map(sec=>{
        const e=db.timetable.find(x=>x.sectionId===sec.id&&x.dayId===d.id&&x.period===p);
        if(p>sectionDayPeriods(sec,d))return '<td class="tt-off">—</td>';if(!e)return '<td class="tt-empty">—</td>';
        const su=db.subjects.find(x=>x.id===e.subjectId),t=db.teachers.find(x=>x.id===e.teacherId);
        return `<td class="lesson" style="background:${db.stages.find(g=>g.id===sec.stageId)?.color||'#eef4fa'}22;border-top:3px solid ${db.stages.find(g=>g.id===sec.stageId)?.color||'#a0aec0'}"><b>${esc(su?.name||'—')}</b><small>${esc(teacherShort(t?.name))}</small></td>`;
      }).join('')+'</tr>';
    }
  });
  return `<div class="tt-wrap"><table class="timetable compact-timetable" dir="rtl" style="--compact-width:${tableWidth}px"><colgroup><col class="day-col" ><col class="period-col" >${secs.map((_,i)=>`<col class="subject-col">`).join('')}</colgroup><thead>${groupedPrint?`<tr class="stage-groups"><th rowspan="2" class="vertical-heading"><span>اليوم</span></th><th rowspan="2" class="vertical-heading"><span>الحصة</span></th>${db.stages.slice().sort((a,b)=>a.order-b.order).filter(g=>secs.some(x=>x.stageId===g.id)).map(g=>`<th class="stage-group-title" colspan="${secs.filter(x=>x.stageId===g.id).length}">${esc(stageDisplayName(g))}</th>`).join('')}</tr><tr class="section-names">${secs.map(s=>`<th class="section-title">${esc(s.name)}</th>`).join('')}</tr>`:`<tr><th class="vertical-heading"><span>اليوم</span></th><th class="vertical-heading"><span>الحصة</span></th>${secs.map(s=>{let g=db.stages.find(x=>x.id===s.stageId);return `<th style="border-top:4px solid ${g?.color||'#888'}">${g?.name||''} ${esc(s.name)}</th>`}).join('')}</tr>`}</thead><tbody>${rows}</tbody></table></div>`;
}
function generator(){
  const issues=analyzeFeasibility(),reds=issues.filter(x=>x.level==='red').length;
  const warnings=timetableIssues(),q=scheduleQuality();
  $('#workspace').innerHTML=`<h2>التوليد الآلي للجدول</h2>
  ${reds?`<div class="notice error">يوجد ${reds} خطأ مانع في فحص الجدوى. لن يبدأ المحرك قبل معالجتها.</div>`:`<div class="notice">المحرك يطبق الحصص المثبتة أولاً، ثم يستخدم MRV + Backtracking مع تقييم للتفضيلات وتوزيع المواد.</div>`}
  <div class="actions"><button id="generateBtn" ${reds?'disabled':''}>${db.timetable.length?'إعادة توليد الجدول':'توليد الجدول تلقائياً'}</button><button class="secondary" id="checkBtn">فتح فحص الجدوى</button>${db.timetable.length?'<button class="danger" id="clearTT">مسح الجدول</button>':''}</div>
  ${db.timetable.length?`<div class="quality-grid"><div><b>${q.score}/100</b><span>جودة الجدول</span></div><div><b>${q.repeats}</b><span>تكرار يومي</span></div><div><b>${q.gaps}</b><span>فراغات المدرسين</span></div><div><b>${q.avoid}</b><span>حصص غير مفضلة</span></div></div><div class="generation-status"><b>الجدول الحالي:</b> ${db.timetable.length} حصة — ${warnings} تحذيرات توزيع.</div>`:''}
  <div id="generationProgress" class="notice" aria-live="polite">${generationWorker?'التوليد جارٍ...':'جاهز للتوليد'}</div><button id="stopGenerate" class="danger" ${generationWorker?'':'hidden'}>إيقاف التوليد</button>
  ${window.generationReport?`<div class="generation-report"><b>نتيجة آخر محاولة:</b> ${esc(window.generationReport.message)}<br>السبب: ${esc(({nodes:'بلوغ حد المحاولات',time:'انتهاء الوقت المحدد',exhausted:'استنفاد البحث',cancelled:'إيقاف يدوي',exception:'خطأ برمجي','worker-error':'خطأ تشغيل العامل'})[window.generationReport.reason]||'نجاح')} — الزمن: ${window.generationReport.seconds} ثانية — العقد: ${window.generationReport.nodes||0} — أفضل عمق: ${window.generationReport.bestDepth||0} من ${window.generationReport.total||'—'}</div>`:''}
  ${diagnosticHtml(window.generationReport)}
  ${timetableTable()}`;
  wireDiagnostics();
  $('#checkBtn').onclick=()=>{page='feasibility';render()};
  if($('#generateBtn')){$('#generateBtn').disabled=!!generationWorker||!!reds;$('#generateBtn').onclick=startGeneration;}
  if(generationWorker&&$('#stopGenerate'))$('#stopGenerate').onclick=()=>generationCancel?.();
  if($('#clearTT'))$('#clearTT').onclick=()=>{if(confirm('مسح الجدول المولد؟ سيتم حفظ نسخة استرجاع أولاً.')){if(!preserveTimetable('مسح الجدول'))return;db.timetable=[];save();generator()}};
}


function ttEntryInfo(e){
  const su=db.subjects.find(x=>x.id===e.subjectId),t=db.teachers.find(x=>x.id===e.teacherId),se=db.sections.find(x=>x.id===e.sectionId),g=se&&db.stages.find(x=>x.id===se.stageId);
  return {subject:su?.name||'—',teacher:teacherShort(t?.name),section:g?g.name+' '+se.name:'—',color:g?.color||'#eef4fa'};
}
function validateTimetableMove(e,dayId,period){
  const d=db.days.find(x=>x.id===dayId);
  if(!d||!d.active||period<1||period>sectionDayPeriods(db.sections.find(s=>s.id===e.sectionId)||{stageId:''},d))return {level:'red',message:'الخانة خارج أوقات الدوام.'};
  const sr=db.subjectRules[e.subjectId]||{},stageId=db.sections.find(s=>s.id===e.sectionId)?.stageId;const applicable=!sr.stageId||sr.stageId===stageId;const cap=sectionDayPeriods(db.sections.find(s=>s.id===e.sectionId),d);if(applicable&&sr.strict!=='soft'&&((sr.noFirst&&period===1)||(sr.noLast&&period===cap)))return {level:'red',message:'الحصة تخالف قيد المادة الإلزامي.'};if(false&&applicable&&sr.strict!=='soft'&&sr.noRepeat&&db.timetable.some(x=>x.id!==e.id&&x.sectionId===e.sectionId&&x.subjectId===e.subjectId&&x.dayId===dayId))return {level:'red',message:'تكرار المادة في اليوم ممنوع.'};
  const r=rule(e.teacherId);
  if((r.unavailable[dayId]||[]).includes(period))return {level:'red',message:'المدرس غير متاح في هذا الوقت.'};
  if(db.timetable.some(x=>x.id!==e.id&&x.teacherId===e.teacherId&&x.dayId===dayId&&x.period===period))return {level:'red',message:'المدرس لديه حصة أخرى في هذا الوقت.'};
  if(db.timetable.some(x=>x.id!==e.id&&x.sectionId===e.sectionId&&x.dayId===dayId&&x.period===period))return {level:'red',message:'الشعبة لديها حصة أخرى في هذا الوقت.'};
  const daily=db.timetable.filter(x=>x.id!==e.id&&x.teacherId===e.teacherId&&x.dayId===dayId).length;
  if(daily>=Math.max(1,+r.maxDaily||99))return {level:'red',message:'النقل يتجاوز الحد اليومي للمدرس.'};
  const warnings=[];
  if(r.avoid.includes(period))warnings.push('وقت غير مفضل للمدرس');
  if(db.timetable.some(x=>x.id!==e.id&&x.assignmentId===e.assignmentId&&x.dayId===dayId))warnings.push('ستتكرر المادة للشعبة في اليوم نفسه');
  return warnings.length?{level:'orange',message:warnings.join('، ')}:{level:'green',message:'الحركة سليمة'};
}
function manualLabel(e){const i=ttEntryInfo(e),d=db.days.find(x=>x.id===e.dayId);return `${i.section} | ${i.subject} | ${i.teacher} | ${d?.name||''} / ${e.period}`}
function manualValidate(changes){
 const ids=new Set(changes.map(x=>x.id)),draft=db.timetable.map(e=>({...e,...(changes.find(c=>c.id===e.id)||{})}));
 const errors=[],warnings=[];
 for(const change of changes){
  const e=draft.find(x=>x.id===change.id),original=db.timetable.find(x=>x.id===change.id);
  if(!e||!original){errors.push('حصة غير موجودة');continue}
  if(original.locked||db.fixedLessons.some(f=>f.assignmentId===original.assignmentId&&f.dayId===original.dayId&&f.period===original.period)){errors.push('الحصة مثبتة ويجب فك تثبيتها أولاً');continue}
  const day=db.days.find(d=>d.id===e.dayId),sec=db.sections.find(x=>x.id===e.sectionId),r=rule(e.teacherId);
  if(!day||!sec||!day.active||e.period<1||e.period>sectionDayPeriods(sec,day)){errors.push('خارج أوقات دوام الشعبة');continue}
  if((r.unavailable?.[e.dayId]||[]).includes(e.period)){errors.push('المدرس غير متاح');continue}
  if(draft.some(x=>x.id!==e.id&&x.teacherId===e.teacherId&&x.dayId===e.dayId&&x.period===e.period)){errors.push('تعارض في جدول المدرس');continue}
  if(draft.some(x=>x.id!==e.id&&x.sectionId===e.sectionId&&x.dayId===e.dayId&&x.period===e.period)){errors.push('تعارض في جدول الشعبة');continue}
  const daily=draft.filter(x=>x.teacherId===e.teacherId&&x.dayId===e.dayId).length;
  if(daily>Math.max(1,+r.maxDaily||99))errors.push('تجاوز الحد اليومي للمدرس');
  const sr=db.subjectRules[e.subjectId]||{},applicable=!sr.stageId||sr.stageId===sec.stageId;
  if(applicable&&sr.strict!=='soft'&&((sr.noFirst&&e.period===1)||(sr.noLast&&e.period===sectionDayPeriods(sec,day))))errors.push('مخالفة قيد المادة الإلزامي');
  const repeats=draft.filter(x=>x.id!==e.id&&x.sectionId===e.sectionId&&x.subjectId===e.subjectId&&x.dayId===e.dayId).length;
  if(repeats){warnings.push('تكرار المادة في يوم واحد؛ تحقق من الضرورة حسب الأيام المتاحة')}
  if((r.avoid||[]).includes(e.period))warnings.push('وقت غير مفضل للمدرس');
 }
 return {errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
}
function commitManual(changes,type){
 const check=manualValidate(changes);if(check.errors.length)return alert('تعذر التعديل:\n'+check.errors.join('\n'));
 if(check.warnings.length&&!confirm('تحذيرات:\n'+check.warnings.join('\n')+'\nهل تريد المتابعة؟'))return false;
 const before=changes.map(c=>{const e=db.timetable.find(x=>x.id===c.id);return {id:e.id,dayId:e.dayId,period:e.period}});
 changes.forEach(c=>Object.assign(db.timetable.find(e=>e.id===c.id),c));
 db.manualHistory??=[];db.manualHistory.push({id:uid('edit'),at:new Date().toISOString(),type,before,after:changes.map(c=>({...c}))});
 if(db.manualHistory.length>100)db.manualHistory.shift();save();workspaceTT();return true;
}
function undoManual(){const h=db.manualHistory?.at(-1);if(!h)return alert('لا توجد تعديلات للتراجع');
 const changes=h.before.map(x=>({...x}));const check=manualValidate(changes);
 if(check.errors.length)return alert('لا يمكن التراجع بسبب تعارض جديد: '+check.errors.join('، '));
 changes.forEach(c=>Object.assign(db.timetable.find(e=>e.id===c.id),c));db.manualHistory.pop();save();workspaceTT();
}
function moveTimetableEntry(id){
 const e=db.timetable.find(x=>x.id===id);if(!e)return;
 const o=document.createElement('div');o.className='edit-overlay';
 o.innerHTML=`<div class="edit-card"><div class="edit-head"><h3>المحرر اليدوي للحصص</h3><button class="icon-close" type="button">×</button></div>
 <div class="notice">${esc(manualLabel(e))}</div>
 <div class="field"><label>نوع التعديل</label><select id="mvType"><option value="move">نقل إلى خانة فارغة</option><option value="swap">تبديل مع حصة أخرى</option></select></div>
 <div class="field"><label>اليوم الجديد</label><select id="mvDay">${db.days.filter(d=>d.active).sort((a,b)=>a.order-b.order).map(d=>`<option value="${d.id}" ${d.id===e.dayId?'selected':''}>${esc(d.name)}</option>`).join('')}</select></div>
 <div class="field"><label>الحصة الجديدة</label><select id="mvPeriod"></select></div>
 <div class="field" id="mvSectionWrap" hidden><label>الشعبة التي تحتوي الحصة الثانية</label><select id="mvSection">${db.sections.map(sec=>`<option value="${sec.id}" ${sec.id===e.sectionId?'selected':''}>${esc((db.stages.find(g=>g.id===sec.stageId)?.name||'')+' '+sec.name)}</option>`).join('')}</select></div>
 <div id="mvStatus" aria-live="polite"></div><div class="actions"><button id="mvSave">تأكيد التعديل</button><button class="secondary" id="mvCancel">إلغاء</button></div></div>`;
 document.body.appendChild(o);const type=o.querySelector('#mvType'),day=o.querySelector('#mvDay'),per=o.querySelector('#mvPeriod'),section=o.querySelector('#mvSection'),status=o.querySelector('#mvStatus'),saveBtn=o.querySelector('#mvSave');
 const proposal=()=>{const target=db.timetable.find(x=>x.sectionId===section.value&&x.dayId===day.value&&x.period===+per.value);if(type.value==='swap')return target&&target.id!==e.id?[{id:e.id,dayId:target.dayId,period:target.period},{id:target.id,dayId:e.dayId,period:e.period}]:null;return !db.timetable.some(x=>x.sectionId===e.sectionId&&x.dayId===day.value&&x.period===+per.value&&x.id!==e.id)?[{id:e.id,dayId:day.value,period:+per.value}]:null};
 function check(){const changes=proposal(),v=changes?manualValidate(changes):{errors:[type.value==='swap'?'اختر حصة أخرى موجودة للتبديل':'الخانة مشغولة؛ استخدم التبديل'],warnings:[]};status.innerHTML=`<div class="move-check ${v.errors.length?'red':v.warnings.length?'orange':'green'}">${esc(v.errors.length?'⛔ '+v.errors.join('، '):v.warnings.length?'⚠️ '+v.warnings.join('، '):'✓ التعديل ممكن دون تعارض')}</div>`;saveBtn.disabled=!!v.errors.length}
 function periods(){const d=db.days.find(x=>x.id===day.value),sec=db.sections.find(x=>x.id===section.value);const max=type.value==='swap'?sectionDayPeriods(sec,d):sectionDayPeriods(db.sections.find(x=>x.id===e.sectionId),d);per.innerHTML=Array.from({length:max},(_,i)=>`<option value="${i+1}" ${d.id===e.dayId&&i+1===e.period?'selected':''}>الحصة ${i+1}</option>`).join('');check()}
 type.onchange=()=>{o.querySelector('#mvSectionWrap').hidden=type.value!=='swap';periods()};day.onchange=periods;section.onchange=periods;per.onchange=check;periods();
 const close=()=>o.remove();o.querySelector('.icon-close').onclick=close;o.querySelector('#mvCancel').onclick=close;
 saveBtn.onclick=()=>{const changes=proposal();if(changes&&commitManual(changes,type.value==='swap'?'تبديل حصتين':'نقل حصة'))close()};
}
function toggleTimetableLock(id){
  const e=db.timetable.find(x=>x.id===id);if(!e)return;e.locked=!e.locked;
  const i=db.fixedLessons.findIndex(f=>f.assignmentId===e.assignmentId&&f.dayId===e.dayId&&f.period===e.period);
  if(e.locked&&i<0)db.fixedLessons.push({id:uid('fix'),assignmentId:e.assignmentId,dayId:e.dayId,period:e.period});
  if(!e.locked&&i>=0)db.fixedLessons.splice(i,1);
  save();workspaceTT();
}
function focusedTimetable(mode,id){
  const days=db.days.filter(d=>d.active).sort((a,b)=>a.order-b.order),max=Math.max(...days.map(d=>d.periods));let rows='';
  for(let p=1;p<=max;p++)rows+=`<tr><th>الحصة ${p}</th>`+days.map(d=>{if(p>d.periods||(mode==='section'&&p>sectionDayPeriods(db.sections.find(s=>s.id===id),d)))return '<td class="tt-off">—</td>';const e=db.timetable.find(x=>(mode==='teacher'?x.teacherId===id:x.sectionId===id)&&x.dayId===d.id&&x.period===p);if(!e)return '<td class="tt-empty">—</td>';const l=ttEntryInfo(e);return `<td class="lesson interactive" data-entry="${e.id}" style="background:${l.color}"><b>${esc(l.subject)}</b><small>${esc(mode==='teacher'?l.section:l.teacher)}</small>${e.locked?'<span class="lock-mark">🔒</span>':''}</td>`}).join('')+'</tr>';
  return `<div class="tt-wrap"><table class="timetable focused"><thead><tr><th>الحصة</th>${days.map(d=>`<th class="day-label day-${d.id}">${d.name}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
}
function timetableIssueCounts(){
  let errors=0,warnings=0;db.timetable.forEach(e=>{const v=validateTimetableMove(e,e.dayId,e.period);if(v.level==='red')errors++;else if(v.level==='orange')warnings++});return {errors,warnings};
}

function timetableGapReport(){
 const days=db.days.filter(d=>d.active).sort((a,b)=>a.order-b.order);
 const result=[];
 const by=(key,id,d)=>db.timetable.filter(e=>e[key]===id&&e.dayId===d.id).map(e=>e.period).sort((a,b)=>a-b);
 db.teachers.forEach(t=>days.forEach(d=>{
   const ps=by('teacherId',t.id,d);if(ps.length<2)return;
   const r=rule(t.id);
   for(let n=ps[0]+1;n<ps[ps.length-1];n++)if(!ps.includes(n)){
     const left=Math.max(...ps.filter(x=>x<n)),right=Math.min(...ps.filter(x=>x>n));
     const unavailable=(r.unavailable?.[d.id]||[]).includes(n);
     const possible=db.assignments.filter(a=>a.teacherId===t.id).filter(a=>!db.timetable.some(e=>e.sectionId===a.sectionId&&e.dayId===d.id&&e.period===n));
     result.push({kind:'teacher',id:t.id,dayId:d.id,period:n,level:unavailable?'constraint':possible.length?'movable':'blocked',reason:unavailable?'الحصة محظورة في قيود هذا المدرس':possible.length?`توجد ${possible.length} تكليفات لشعب غير مشغولة بهذه الخانة، لكن نقل أي حصة يتطلب فحص بقية القيود`:'جميع الشعب المرتبطة بتكليفات المدرس مشغولة في هذه الخانة',left,right});
   }
 }));
 db.sections.forEach(sec=>days.forEach(d=>{
   const ps=by('sectionId',sec.id,d),assigned=db.assignments.filter(a=>a.sectionId===sec.id).reduce((n,a)=>n+(+a.weeklyPeriods||0),0);
   const cap=dayCapacity(sec);
   for(let n=1;n<=sectionDayPeriods(sec,d);n++)if(!ps.includes(n)){
     const atEnd=ps.length===0||n>ps[ps.length-1],before=ps.length&&n<ps[0];
     const candidate=db.assignments.filter(a=>a.sectionId===sec.id).filter(a=>!db.timetable.some(e=>e.teacherId===a.teacherId&&e.dayId===d.id&&e.period===n)&&!(rule(a.teacherId).unavailable?.[d.id]||[]).includes(n));
     const reason=assigned<cap?`الشعبة لديها ${cap-assigned} خانات أسبوعية تزيد على حصص التكليف؛ لا يمكن الجزم أن هذه الخانة بعينها ناتجة عن النقص`:
       candidate.length?`توجد ${candidate.length} تكليفات بمدرسين متاحين نظرياً، لكن جميع حصصها موزعة حالياً في أوقات أخرى`:'لا يوجد مدرس مكلف بالشعبة متاح في هذه الخانة وفق الانشغال والقيود الحالية';
     result.push({kind:'section',id:sec.id,dayId:d.id,period:n,level:assigned<cap?'capacity':candidate.length?'movable':'blocked',reason,atEnd,before,internal:!atEnd&&!before});
   }
 }));
 return result;
}
function gapDiagnosis(){
 if(!db.timetable.length){$('#workspace').innerHTML='<h2>تشخيص الفراغات</h2><div class="empty">ولّد الجدول أولاً.</div>';return}
 const gaps=timetableGapReport(),internal=gaps.filter(x=>x.kind==='teacher'),section=gaps.filter(x=>x.kind==='section');
 const teachers=[...new Set(internal.map(x=>x.id))].length;
 const dayName=id=>db.days.find(d=>d.id===id)?.name||'—';
 const name=g=>g.kind==='teacher'?db.teachers.find(x=>x.id===g.id)?.name:(()=>{const sec=db.sections.find(x=>x.id===g.id),stage=db.stages.find(x=>x.id===sec?.stageId);return `${stage?.name||''} ${sec?.name||''}`})();
 $('#workspace').innerHTML=`<h2>التشخيص التفصيلي لفراغات الجدول</h2><div class="notice">نميز بين فراغ داخل دوام المدرس وخانة فارغة للشعبة. الأسباب أدناه تفسيرات مستندة إلى الانشغال والقيود الحالية، وليست إثباتاً أن الجدول مستحيل أو أن النقل سينجح.</div><div class="quality-grid"><div><b>${internal.length}</b><span>فراغات بين حصص المدرسين</span></div><div><b>${teachers}</b><span>مدرسون لديهم فراغات</span></div><div><b>${section.length}</b><span>خانات فارغة للشعب</span></div></div>
 <div class="workspace-toolbar"><div class="field"><label>نوع الفراغ</label><select id="gapKind"><option value="teacher">فراغات المدرسين بين الحصص</option><option value="section">الخانات الفارغة للشعب</option></select></div><div class="field"><label>المدرس / الشعبة</label><select id="gapPerson"></select></div><div class="field"><label>اليوم</label><select id="gapDay"><option value="">كل الأيام</option>${daysForGaps().map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select></div></div><div id="gapRows"></div>`;
 const kind=$('#gapKind'),person=$('#gapPerson'),day=$('#gapDay');
 function refreshPeople(){const ids=[...new Set(gaps.filter(g=>g.kind===kind.value).map(g=>g.id))];person.innerHTML='<option value="">الجميع</option>'+ids.map(id=>{const g=gaps.find(g=>g.kind===kind.value&&g.id===id);return `<option value="${esc(id)}">${esc(name(g))}</option>`}).join('');refresh()}
 function refresh(){const selected=gaps.filter(g=>g.kind===kind.value&&(!person.value||g.id===person.value)&&(!day.value||g.dayId===day.value));$('#gapRows').innerHTML=selected.length?selected.map(g=>`<div class="gap-diagnostic"><div><b>${esc(name(g))}</b> — ${esc(dayName(g.dayId))}، الحصة ${g.period}<div class="muted">${g.kind==='teacher'?`فراغ داخلي بين الحصتين ${g.left} و${g.right}. `:g.internal?'فراغ داخل حصص الشعبة. ':'خانة فارغة في بداية اليوم أو نهايته. '}${esc(g.reason)}</div></div><button class="secondary" data-gap-kind="${g.kind}" data-gap-id="${esc(g.id)}">عرض الجدول</button></div>`).join(''):'<div class="empty">لا توجد فراغات مطابقة للتصفية.</div>';document.querySelectorAll('[data-gap-kind]').forEach(btn=>btn.onclick=()=>{window.ttPreferred={mode:btn.dataset.gapKind,id:btn.dataset.gapId};page='workspaceTT';render()})}
 kind.onchange=refreshPeople;person.onchange=refresh;day.onchange=refresh;refreshPeople();
}
function daysForGaps(){return db.days.filter(d=>d.active).sort((a,b)=>a.order-b.order)}
function workspaceTT(){
 if(!db.timetable.length){$('#workspace').innerHTML='<h2>مساحة عمل الجدول</h2><div class="empty">أنشئ الجدول أولاً.</div>';return}
 const pref=window.ttPreferred||{mode:'school'},counts=timetableIssueCounts();
 $('#workspace').innerHTML=`<h2>مساحة عمل الجدول</h2><div class="workspace-toolbar"><div class="field"><label>نوع العرض</label><select id="ttMode"><option value="school">المدرسة كاملة</option><option value="teacher">جدول مدرس</option><option value="section">جدول شعبة</option></select></div><div class="field" id="ttEntityWrap"></div><button class="secondary" id="manualUndo">تراجع عن آخر تعديل</button><button class="secondary" id="manualLog">سجل التعديلات</button><button class="secondary" id="gapGo">تشخيص الفراغات</button><button class="problems-btn" id="ttProblems">${counts.errors} أخطاء — ${counts.warnings} تحذيرات</button><button class="secondary" id="ttPrint">طباعة العرض الحالي</button><button class="secondary" id="ttPrintAllTeachers">طباعة بطاقات جميع المدرسين</button></div><div class="notice">اختر المدرس أو الشعبة. اضغط على الحصة لنقلها أو تبديلها أو تثبيتها. الطباعة تتبع العرض المختار.</div><div id="ttWorkspaceView"></div>`;
 const mode=$('#ttMode'),wrap=$('#ttEntityWrap'),view=$('#ttWorkspaceView');mode.value=pref.mode;
 function bindCells(){document.querySelectorAll('#ttWorkspaceView [data-entry]').forEach(td=>td.onclick=()=>{const e=db.timetable.find(x=>x.id===td.dataset.entry),l=ttEntryInfo(e);if(confirm(`${l.subject} — ${l.teacher}\nموافق = نقل الحصة\nإلغاء = خيارات القفل`))moveTimetableEntry(e.id);else if(confirm(e.locked?'فتح القفل؟':'تثبيت الحصة؟'))toggleTimetableLock(e.id)})}
 function draw(){const m=mode.value;window.ttPreferred={mode:m};if(m==='school'){wrap.innerHTML='';view.innerHTML=timetableTable();return}
 const list=m==='teacher'?db.teachers.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar')):db.sections.slice().sort((a,b)=>(db.stages.find(g=>g.id===a.stageId)?.order||0)-(db.stages.find(g=>g.id===b.stageId)?.order||0)||a.name.localeCompare(b.name,'ar'));
 wrap.innerHTML=`<label>${m==='teacher'?'المدرس':'الشعبة'}</label><select id="ttEntity">${list.map(x=>{const g=db.stages.find(v=>v.id===x.stageId);return `<option value="${esc(x.id)}">${esc(m==='teacher'?x.name:(g?.name||'')+' '+x.name)}</option>`}).join('')}</select>`;
 const sel=$('#ttEntity');if(pref.mode===m&&list.some(x=>x.id===pref.id))sel.value=pref.id;
 const redraw=()=>{window.ttPreferred={mode:m,id:sel.value};view.innerHTML=focusedTimetable(m,sel.value);bindCells()};sel.onchange=redraw;redraw()}
 mode.onchange=draw;draw();$('#gapGo').onclick=()=>{page='gapDiagnosis';render()};$('#ttProblems').onclick=()=>alert(`${counts.errors} أخطاء — ${counts.warnings} تحذيرات`);
 $('#manualUndo').onclick=undoManual;$('#manualLog').onclick=()=>alert((db.manualHistory||[]).slice(-15).reverse().map(h=>`${new Date(h.at).toLocaleString('ar-IQ')} — ${h.type} (${h.before.length} حصة)`).join('\n')||'لا توجد تعديلات بعد');$('#ttPrint').onclick=()=>printSelectedTimetable(window.ttPreferred);$('#ttPrintAllTeachers').onclick=printAllTeacherCards;
}
function formalHeader(label){const p=db.printSettings;return `<div class="formal-head"><div class="formal-side">جمهورية العراق<br>وزارة التربية<br><small>العام الدراسي: ${esc(db.school.year||'—')}</small></div><div class="formal-center">${p.logo&&p.logoPosition==='center'?`<img class="school-logo" src="${p.logo}" alt="شعار المدرسة">`:''}<h1>${esc(db.school.name||'اسم المدرسة')}</h1><h2>${esc(p.title||'جدول الحصص الأسبوعية')}</h2><h3>${esc(label)}</h3></div><div class="formal-side">${p.logo&&p.logoPosition==='left'?`<img class="school-logo" src="${p.logo}" alt="شعار المدرسة">`:''}تاريخ بدء التطبيق<br><b>${esc(p.startDate||'____ / ____ / ____')}</b>${p.logo&&p.logoPosition==='right'?`<img class="school-logo" src="${p.logo}" alt="شعار المدرسة">`:''}</div></div>`}
function formalFooter(){const p=db.printSettings;return `<footer class="print-footer">${p.showNotes?`<div class="print-reasons"><strong>أسباب تغيير الجدول والملاحظات:</strong><p>${esc(p.changeReasons||'—')}</p>${p.footer?`<p>${esc(p.footer)}</p>`:''}</div>`:''}${p.showSignatures?`<div class="print-signatures">${[p.signature1,p.signature2,p.signature3].map(x=>`<div><b>${esc(x)}</b><span>التوقيع: ______________</span></div>`).join('')}</div>`:''}</footer>`}
function printPresentationClass(){const p=db.printSettings;return `${p.printMode==='bw'?'print-bw':''} ${p.showColors?'':'no-colors'} ${p.showTeachers?'':'hide-teachers'} density-${p.density||'compact'} theme-${p.theme||'formal'}`}
function teacherCard(teacherId){
 const teacher=db.teachers.find(t=>t.id===teacherId);if(!teacher)return '';
 const p=db.printSettings,days=db.days.filter(d=>d.active).sort((a,b)=>a.order-b.order);
 const lessons=db.timetable.filter(e=>e.teacherId===teacherId),max=Math.max(1,...days.map(d=>d.periods));
 const activeDays=new Set(lessons.map(e=>e.dayId)).size;
 const subjects=[...new Set(lessons.map(e=>db.subjects.find(s=>s.id===e.subjectId)?.name).filter(Boolean))];
 const specialty=teacher.specialization||teacher.specialty||teacher.subject||subjects.join('، ')||'—';
 const free=days.filter(d=>!lessons.some(e=>e.dayId===d.id)).map(d=>d.name).join('، ')||'لا يوجد';
 const rows=Array.from({length:max},(_,i)=>{const period=i+1;return `<tr><th class="tc-period">${period}</th>${days.map(d=>{if(period>d.periods)return '<td class="tc-off">—</td>';const e=lessons.find(e=>e.dayId===d.id&&e.period===period);if(!e)return '<td class="tc-empty"></td>';const sub=db.subjects.find(s=>s.id===e.subjectId)?.name||'—';return `<td class="tc-lesson"><strong>${esc(sub)}</strong><span>${esc(exportSectionName(e.sectionId))}</span></td>`}).join('')}</tr>`}).join('');
 return `<article class="teacher-card ${p.printMode==='bw'?'tc-bw':''}" dir="rtl"><div class="tc-head"><div class="tc-side">جمهورية العراق<br>وزارة التربية<br><small>العام الدراسي ${esc(db.school.year||'—')}</small></div><div class="tc-brand">${p.logo?`<img src="${p.logo}" alt="شعار المدرسة">`:''}<div class="tc-school">${esc(db.school.name||'اسم المدرسة')}</div><h1>بطاقة الجدول الأسبوعي للمدرس</h1><div class="tc-subtitle">وثيقة تنظيم الحصص الأسبوعية</div></div><div class="tc-side tc-left">تاريخ بدء التطبيق<br><b>${esc(p.startDate||'غير محدد')}</b></div></div><div class="tc-person"><div><span class="tc-label">اسم المدرس</span><h2>${esc(teacher.name)}</h2><div class="tc-specialty"><b>الاختصاص:</b> ${esc(specialty)}</div></div><div class="tc-stats"><div><b>${lessons.length}</b><span>حصة أسبوعياً</span></div><div><b>${activeDays}</b><span>أيام التدريس</span></div><div class="tc-free"><b>${esc(free)}</b><span>يوم / أيام التفرغ</span></div></div></div><table class="tc-table"><thead><tr><th>الحصة</th>${days.map(d=>`<th>${esc(d.name)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table><div class="tc-reasons"><b>أسباب تغيير الجدول والملاحظات:</b><span>${esc(p.changeReasons||'—')}${p.footer?' — '+esc(p.footer):''}</span></div><div class="tc-signatures">${[p.signature1,p.signature2,p.signature3].map(x=>`<div><b>${esc(x||'—')}</b><span>التوقيع: ______________</span></div>`).join('')}</div><div class="tc-bottom">${esc(db.school.name||'')} · ${esc(db.school.year||'')}</div></article>`;
}
function teacherCardCSS(){return `
@page{size:A4 landscape;margin:7mm}*{box-sizing:border-box}html,body{margin:0;background:#fff;color:#142c46;font-family:Tahoma,Arial,sans-serif;direction:rtl}body{padding:0}.teacher-card{width:100%;height:190mm;max-height:190mm;overflow:hidden;display:flex;flex-direction:column;break-after:page;page-break-after:always;background:white}.teacher-card:last-child{break-after:auto;page-break-after:auto}.tc-head{display:grid;grid-template-columns:1fr 2.5fr 1fr;align-items:center;background:#102C50;color:#fff;border-bottom:3px solid #C8A65A;min-height:34mm;padding:3mm 6mm}.tc-side{font-size:10px;line-height:1.9}.tc-left{text-align:left}.tc-brand{text-align:center}.tc-brand img{width:12mm;height:12mm;object-fit:contain;vertical-align:middle}.tc-school{font-size:17px;color:#E7CB8E;font-weight:800}.tc-brand h1{font-size:22px;line-height:1.4;margin:1mm 0;font-weight:900}.tc-subtitle{font-size:10px;color:#e1e8f1}.tc-person{display:flex;justify-content:space-between;align-items:center;gap:8mm;background:#FAF8F3;border:1px solid #E5D9BE;padding:3mm 5mm;margin:3mm 0;min-height:26mm}.tc-label{font-size:10px;color:#6a7687}.tc-person h2{font-size:21px;margin:1mm 0 2mm}.tc-specialty{font-size:11px}.tc-stats{display:flex;gap:2mm}.tc-stats>div{border:1px solid #D6DCE5;background:white;min-width:26mm;max-width:44mm;padding:2mm;text-align:center;border-radius:3px}.tc-stats b{display:block;font-size:17px;color:#102C50}.tc-stats span{display:block;font-size:9px;color:#64748b}.tc-stats .tc-free b{font-size:11px;min-height:20px}.tc-table{border-collapse:collapse;table-layout:fixed;width:100%;flex:1;min-height:0}.tc-table th,.tc-table td{border:1px solid #c8d0d9;text-align:center;vertical-align:middle;padding:1.5mm 1mm}.tc-table thead th{background:#173c63;color:#fff;font-size:12px;height:12mm;border-color:#C8A65A}.tc-table thead th:first-child{width:19mm}.tc-period{background:#edf1f6;font-size:13px;font-weight:900;width:19mm}.tc-lesson{background:#f3f0fa}.tc-lesson strong{display:block;font-size:13px;line-height:1.35;color:#152e49}.tc-lesson span{display:block;font-size:10px;color:#53647a;margin-top:1mm}.tc-empty{background:#fff}.tc-off{background:#f0f1f3;color:#a1a8b2}.tc-reasons{display:flex;gap:4mm;align-items:center;border-top:2px solid #C8A65A;padding:2mm 3mm;font-size:10px;min-height:10mm}.tc-reasons span{color:#53647a}.tc-signatures{display:grid;grid-template-columns:repeat(3,1fr);text-align:center;padding:2mm 0 1mm;min-height:17mm}.tc-signatures b{display:block;font-size:11px}.tc-signatures span{display:block;font-size:9px;color:#64748b;margin-top:3mm}.tc-bottom{font-size:8px;color:#8994a3;text-align:center;border-top:1px solid #e3e8ee;padding-top:1mm}.tc-bw,.tc-bw *{color:#000!important}.tc-bw .tc-head{background:#e0e0e0!important;border-bottom:3px solid #555!important}.tc-bw .tc-school,.tc-bw .tc-subtitle{color:#000!important}.tc-bw .tc-person{background:#f5f5f5!important;border-color:#888!important}.tc-bw .tc-table thead th{background:#d5d5d5!important;color:#000!important;border-color:#666!important}.tc-bw .tc-lesson{background:#f0f0f0!important}.tc-bw .tc-period{background:#e6e6e6!important}.tc-bw .tc-reasons{border-color:#555!important}@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}body{margin:0!important}}`}
function printTeacherCards(ids){const html=ids.map(teacherCard).filter(Boolean).join('');if(!html)return alert('لا توجد بطاقات مدرسين للطباعة');const w=window.open('','_blank');if(!w)return alert('اسمح بفتح النوافذ المنبثقة للطباعة');w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>بطاقات الجداول الأسبوعية للمدرسين</title><style>${teacherCardCSS()}</style></head><body>${html}<script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`);w.document.close()}
function printAllTeacherCards(){const ids=db.teachers.filter(t=>db.timetable.some(e=>e.teacherId===t.id)).sort((a,b)=>a.name.localeCompare(b.name,'ar')).map(t=>t.id);printTeacherCards(ids)}
function printSelectedTimetable(pick){
 const p=db.printSettings;const label=pick.mode==='teacher'?db.teachers.find(x=>x.id===pick.id)?.name:pick.mode==='section'?(()=>{const sec=db.sections.find(x=>x.id===pick.id),g=db.stages.find(x=>x.id===sec?.stageId);return (g?.name||'')+' '+(sec?.name||'')})():'المدرسة كاملة';
 if(pick.mode==='teacher'){printTeacherCards([pick.id]);return;}
 const table=pick.mode==='school'?timetableTable():focusedTimetable(pick.mode,pick.id);if(pick.mode==='school'){const html=printDocument();const w=window.open('','_blank');if(!w)return alert('اسمح بفتح النوافذ المنبثقة للطباعة');w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>الجدول المدرسي</title><style>${printCSS()}</style></head><body>${html}<script>window.onload=()=>setTimeout(()=>window.print(),350)<\/script></body></html>`);w.document.close();return;}
 const html=`<article class="print-sheet ${printPresentationClass()}">${formalHeader(label)}${table}${formalFooter()}</article>`;
 const w=window.open('','_blank');if(!w)return alert('اسمح بفتح النوافذ المنبثقة للطباعة');
 w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(label)}</title><style>${printCSS()}</style></head><body>${html}<script>window.onload=()=>setTimeout(()=>window.print(),350)<\/script></body></html>`);w.document.close();
}

function stageGroups(){const stages=db.stages.slice().sort((a,b)=>a.order-b.order);return [{title:'المرحلة المتوسطة — الأول والثاني والثالث المتوسط',ids:stages.slice(0,3).map(g=>g.id)},{title:'المرحلة الإعدادية — الرابع والخامس والسادس العلمي',ids:stages.slice(3,6).map(g=>g.id)}]}
function stageDisplayName(g){return (g.order<=3?g.name+' المتوسط':g.name+' العلمي')}
function sheetMarkup(title,ids){
 const p=db.printSettings;
 return `<article class="print-sheet school-print-page ${printPresentationClass()}">${formalHeader(title)}${timetableTable(ids,true)}${formalFooter()}</article>`;
}
function printDocument(){return stageGroups().map(g=>sheetMarkup(g.title,g.ids)).join('')}
function printCSS(){return `
@page{size:A3 landscape;margin:5mm}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff;color:#19334e;direction:rtl;font-family:Tahoma,Arial,sans-serif}
.print-sheet{width:100%;margin:0;padding:0;break-inside:avoid;page-break-inside:avoid;overflow:hidden}
.school-print-page{break-after:page;page-break-after:always;max-height:287mm}
.school-print-page:last-child{break-after:auto;page-break-after:auto}
.print-meta{display:flex;justify-content:space-between;font-size:9px;line-height:1.3}
.print-heading{text-align:center;padding:2px 0 4px}
.print-heading h1{font-size:16px;margin:0 0 2px}
.print-heading h2{font-size:13px;margin:1px}
.print-heading h3{font-size:12px;margin:1px}
.tt-wrap{overflow:visible!important;border:0!important;margin:0!important;padding:0!important}
table.compact-timetable{direction:rtl;width:100%!important;min-width:0!important;max-width:100%!important;table-layout:fixed!important;border-collapse:collapse!important;border-spacing:0!important;margin:3px 0!important;font-size:9px}
table.compact-timetable col.day-col{width:28px!important}
table.compact-timetable col.period-col{width:28px!important}
table.compact-timetable col.subject-col{width:auto!important}
table.compact-timetable th,table.compact-timetable td{border:1px solid #c4ced8!important;text-align:center!important;vertical-align:middle!important;padding:1px 2px!important;line-height:1.08!important;overflow-wrap:anywhere!important;word-break:normal!important;white-space:normal!important;border-radius:0!important}
table.compact-timetable thead th{background:#e8eef5!important;color:#193c60!important;font-weight:800!important;font-size:8px!important}
table.compact-timetable th.day-label{width:26px!important;min-width:26px!important;max-width:26px!important;padding:0!important;position:relative!important;vertical-align:middle!important}
table.compact-timetable th.day-label .vertical-day{display:inline-block!important;writing-mode:vertical-rl!important;-webkit-writing-mode:vertical-rl!important;transform:rotate(180deg)!important;font-weight:900!important;font-size:14px!important;line-height:1!important;white-space:nowrap!important;letter-spacing:0!important;margin:auto!important}
table.compact-timetable th.period-number{width:24px!important;min-width:24px!important;max-width:24px!important;padding:1px!important;font-size:10px!important;font-weight:900!important}
table.compact-timetable td.lesson{min-width:0!important;max-width:none!important;padding:1px 2px!important;border-top-width:1px!important}
table.compact-timetable td.lesson b{display:block!important;font-size:8px!important;font-weight:800!important;line-height:1.12!important}
table.compact-timetable td.lesson small{display:block!important;font-size:7px!important;color:#40546b!important;margin-top:0!important;line-height:1.12!important;overflow-wrap:anywhere!important}
.vertical-heading{height:54px!important;width:26px!important;padding:0!important;vertical-align:middle!important}.vertical-heading span{display:inline-block!important;writing-mode:vertical-rl!important;transform:rotate(180deg)!important;font-weight:900!important;font-size:11px!important;white-space:nowrap!important}.day-label.day-d0{background:#dceafa!important}.day-label.day-d1{background:#e0f1e5!important}.day-label.day-d2{background:#fff0d9!important}.day-label.day-d3{background:#eee5fa!important}.day-label.day-d4{background:#fbe5eb!important}
.print-footer{border-top:1px solid #aebac8;margin-top:4px;padding:2px;font-size:8px;white-space:pre-wrap}.print-footer p{margin:1px}
/* v0.9.8.2 formal academic print identity */
.formal-head{display:grid;grid-template-columns:1fr 2fr 1fr;align-items:center;gap:8px;border-bottom:2px solid #c4a468;padding:3px 6px 6px;margin-bottom:4px;min-height:64px;color:#172f4b}
.formal-side{font-size:10px;line-height:1.65;font-weight:600}.formal-side:last-child{text-align:left}.formal-side small{font-size:9px}.formal-center{text-align:center}.formal-center h1{font-size:20pt;margin:0 0 1px;font-weight:900}.formal-center h2{font-size:27pt;margin:0;font-weight:900;line-height:1.15}.formal-center h3{font-size:16pt;margin:2px 0 0;color:#50637a;font-weight:700}.school-logo{display:block;width:44px;height:44px;object-fit:contain;margin:0 auto 2px}
.print-footer{border-top:1px solid #c4a468!important;margin-top:6px!important;padding:5px!important;font-size:9px!important;white-space:normal!important}.print-reasons p{margin:2px 0}.print-signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;text-align:center;margin-top:8px}.print-signatures b,.print-signatures span{display:block}.print-signatures span{margin-top:5px;color:#526277}
.hide-teachers td.lesson small{display:none!important}.density-medium table.compact-timetable td,.density-medium table.compact-timetable th{padding:3px!important;line-height:1.2!important}.density-wide table.compact-timetable td,.density-wide table.compact-timetable th{padding:5px!important;line-height:1.35!important}
/* v0.9.8.8: unmistakable navy/gold formal print identity */
.theme-formal .formal-head{border-bottom:4px solid #C8A65A!important;background:#102C50!important;color:#FFFFFF!important;padding:9px 13px!important;border-radius:2px 2px 0 0!important}
.theme-formal .formal-head .formal-side,.theme-formal .formal-head .formal-center h1,.theme-formal .formal-head .formal-center h2,.theme-formal .formal-head .formal-center h3,.theme-formal .formal-head small{color:#FFFFFF!important}
.theme-formal .formal-head .formal-center h1{color:#E7CB8E!important}
.theme-formal .formal-head .formal-center h2{color:#FFFFFF!important}
.theme-formal table.compact-timetable thead th{background:#102C50!important;color:#FFFFFF!important;border-color:#C8A65A!important;border-bottom:3px solid #C8A65A!important}
.theme-formal table.compact-timetable thead th.vertical-heading{background:#183C65!important}
.theme-formal table.compact-timetable td.lesson{border-color:#C6D0D9!important;background:#FAF8F3!important}
.theme-formal table.compact-timetable tr:nth-child(even) td.lesson{background:#F1F4F7!important}
.theme-formal table.compact-timetable td.lesson b{color:#102C50!important}
.theme-formal table.compact-timetable th.period-number{background:#E8EDF2!important;color:#102C50!important}
.theme-formal table.compact-timetable th.day-label{background:#DFE8F0!important;color:#102C50!important;border-right:3px solid #C8A65A!important}
.theme-formal .print-footer{border-top:3px solid #C8A65A!important;color:#102C50!important}
.theme-formal .print-signatures b,.theme-formal .print-reasons strong{color:#102C50!important}
.theme-formal .print-signatures{border-top:1px solid #E4D5B3!important;padding-top:6px!important}
/* Dedicated grayscale output, scoped to the selected print mode (not screen UI). */
.print-bw,.print-bw *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
.print-bw .formal-head{background:#fff!important;color:#000!important;border:2px solid #222!important;border-bottom:3px solid #000!important;border-radius:0!important}
.print-bw .formal-head .formal-side,.print-bw .formal-head .formal-center h1,.print-bw .formal-head .formal-center h2,.print-bw .formal-head .formal-center h3,.print-bw .formal-head small{color:#000!important}
.print-bw table.compact-timetable thead th,.print-bw table.compact-timetable thead th.vertical-heading{background:#e5e5e5!important;color:#000!important;border:1px solid #444!important;border-bottom:2px solid #111!important}
.print-bw table.compact-timetable td.lesson,.print-bw table.compact-timetable tr:nth-child(even) td.lesson{background:#fff!important;border-color:#888!important}
.print-bw table.compact-timetable tr:nth-child(even) td.lesson{background:#f4f4f4!important}
.print-bw table.compact-timetable td.lesson b,.print-bw table.compact-timetable td.lesson small{color:#000!important}
.print-bw table.compact-timetable th.period-number{background:#eee!important;color:#000!important;border-color:#888!important}
.print-bw table.compact-timetable th.day-label{background:#e6e6e6!important;color:#000!important;border-color:#555!important;border-right:2px solid #333!important}
.print-bw .print-footer{border-top:2px solid #333!important;color:#000!important}
.print-bw .print-signatures{border-top:1px solid #888!important}
.print-bw .print-signatures b,.print-bw .print-signatures span,.print-bw .print-reasons strong{color:#000!important}
.theme-minimal table.compact-timetable td.lesson{background:#fff!important}.theme-minimal table.compact-timetable thead th{background:#eee!important;color:#333!important}
.lock-mark{display:none!important}.no-colors .lesson{background:#fff!important}
/* v0.9.8.8: grouped grade headings and readable A3 hierarchy */
.school-print-page .formal-head{min-height:0!important;padding:5px 12px!important;margin-bottom:3px!important;grid-template-columns:1fr 2.8fr 1fr!important}
.school-print-page .formal-center h1{font-size:20pt!important;line-height:1.05!important;margin:0!important}
.school-print-page .formal-center h2{font-size:27pt!important;line-height:1.08!important;margin:0!important}
.school-print-page .formal-center h3{font-size:16pt!important;line-height:1.05!important;margin:0!important}
.school-print-page .formal-side{font-size:10px!important;line-height:1.35!important}
.school-print-page .school-logo{width:30px!important;height:30px!important;margin-bottom:0!important}
.school-print-page table.compact-timetable thead tr.stage-groups th{height:24px!important;padding:3px 2px!important;font-size:12px!important;background:#102C50!important;color:#fff!important;border-left:2px solid #C8A65A!important;border-right:2px solid #C8A65A!important}
.school-print-page table.compact-timetable thead tr.section-names th{height:19px!important;font-size:11px!important;background:#24466D!important;color:#fff!important;border-bottom:2px solid #C8A65A!important}
.school-print-page table.compact-timetable td.lesson b{font-size:9.5px!important;line-height:1.15!important;font-weight:900!important}
.school-print-page table.compact-timetable td.lesson small{font-size:8.4px!important;line-height:1.12!important;color:#485568!important}
.school-print-page table.compact-timetable tbody tr:has(.day-label) td,.school-print-page table.compact-timetable tbody tr:has(.day-label) th{border-top:2px solid #102C50!important}
.school-print-page table.compact-timetable tbody td,.school-print-page table.compact-timetable tbody th{height:16px!important;padding:1px 2px!important}
.school-print-page .print-footer{margin-top:3px!important;padding:2px 4px!important;font-size:8px!important}
.school-print-page .print-signatures{margin-top:3px!important;padding-top:3px!important}
.school-print-page .print-signatures span{margin-top:1px!important}
.school-print-page.print-bw table.compact-timetable thead tr.stage-groups th{background:#d6d6d6!important;color:#000!important;border-color:#555!important}
.school-print-page.print-bw table.compact-timetable thead tr.section-names th{background:#ededed!important;color:#000!important;border-color:#555!important}
.school-print-page.print-bw table.compact-timetable tbody tr:has(.day-label) td,.school-print-page.print-bw table.compact-timetable tbody tr:has(.day-label) th{border-top:2px solid #333!important}
.school-print-page.print-bw .formal-center h1,.school-print-page.print-bw .formal-center h2{color:#000!important}
/* v0.9.8.9: stronger visual hierarchy without changing timetable data */
.school-print-page{display:flex!important;flex-direction:column!important;min-height:0!important}
.school-print-page .formal-head{padding:8px 14px!important;margin-bottom:5px!important;min-height:93px!important}
.school-print-page .formal-center h1{font-size:20pt!important;line-height:1.13!important}
.school-print-page .formal-center h2{font-size:27pt!important;line-height:1.14!important;margin:2px 0!important}
.school-print-page .formal-center h3{font-size:15pt!important;line-height:1.15!important}
.school-print-page .formal-side{font-size:11px!important;line-height:1.55!important}
.school-print-page table.compact-timetable{margin:4px 0 5px!important}
.school-print-page table.compact-timetable thead tr.stage-groups th.stage-group-title{height:27px!important;font-size:13px!important;font-weight:900!important;border-inline-start:3px solid #C8A65A!important}
.school-print-page table.compact-timetable thead tr.section-names th{height:23px!important;font-size:12px!important;font-weight:900!important}
.school-print-page table.compact-timetable tbody td,.school-print-page table.compact-timetable tbody th{height:19px!important;padding:2px 2px!important}
.school-print-page table.compact-timetable td.lesson b{font-size:11px!important;line-height:1.14!important;font-weight:900!important;letter-spacing:0!important}
.school-print-page table.compact-timetable td.lesson small{font-size:9.4px!important;line-height:1.13!important;margin-top:1px!important;color:#43546A!important}
.school-print-page table.compact-timetable tbody tr:has(.day-label)>td,.school-print-page table.compact-timetable tbody tr:has(.day-label)>th{border-top:3px solid #C8A65A!important}
.school-print-page table.compact-timetable th.day-label{border-left:2px solid #C8A65A!important}
.school-print-page table.compact-timetable th.period-number{font-size:11px!important}
.school-print-page .print-footer{margin-top:5px!important;padding:5px 7px!important;font-size:10px!important}
.school-print-page .print-signatures{margin-top:6px!important;padding-top:6px!important;gap:20px!important}
.school-print-page .print-signatures b{font-size:11px!important}
.school-print-page .print-signatures span{margin-top:5px!important;font-size:9px!important}
.school-print-page.print-bw table.compact-timetable tbody tr:has(.day-label)>td,.school-print-page.print-bw table.compact-timetable tbody tr:has(.day-label)>th{border-top:3px solid #444!important}
.school-print-page.print-bw table.compact-timetable thead tr.stage-groups th.stage-group-title{border-inline-start-color:#555!important}
@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}

`}


function openPrintSheets(){
 if(!db.timetable.length)return alert('لا يوجد جدول للطباعة');
 const w=window.open('','_blank');if(!w)return alert('اسمح بفتح النوافذ المنبثقة للطباعة');
 w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>طباعة جداول المراحل</title><style>${printCSS()}</style></head><body>${printDocument()}<script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script></body></html>`);w.document.close();
}
function printSetup(){
 const p=db.printSettings;
 $('#workspace').innerHTML=`<h2>الطباعة وتصدير الصور</h2><div class="grid"><div class="field"><label>عنوان الجدول</label><input id="prTitle" value="${esc(p.title)}"></div><div class="field"><label>تاريخ بدء تطبيق الجدول</label><input id="prDate" type="date" value="${esc(p.startDate)}"></div></div><div class="field"><label>أسباب تغيير الجدول</label><textarea id="prReasons" rows="2">${esc(p.changeReasons)}</textarea></div><div class="field"><label>ملاحظات إضافية</label><textarea id="prFooter" rows="2">${esc(p.footer)}</textarea></div><div class="field"><label for="prPrintMode">نمط طباعة PDF</label><select id="prPrintMode"><option value="color">ملون — كحلي وذهبي</option><option value="bw">أسود وأبيض — اقتصادي وواضح</option></select></div><label><input id="prColors" type="checkbox" ${p.showColors?'checked':''}> إظهار ألوان المراحل</label><div class="field"><label>أسلوب الألوان</label><select id="prTheme"><option value="soft" ${(p.theme||'soft')==='soft'?'selected':''}>هادئ ومريح للقراءة</option><option value="contrast" ${p.theme==='contrast'?'selected':''}>تباين مرتفع</option></select></div><div class="actions"><button id="prSave">حفظ الإعدادات</button><button id="prPrint">طباعة المتوسطة والإعدادية (صفحتان A3 أفقي)</button></div><h3>تصدير الصور PNG</h3><div class="grid"><div class="field"><label>نوع الجدول</label><select id="imgType"><option value="all">المدرسة كاملة — صورة واحدة</option><option value="middle">المتوسطة — صورة واحدة</option><option value="high">الإعدادية — صورة واحدة</option><option value="stage">مرحلة واحدة</option><option value="teacher">جدول مدرس</option><option value="section">جدول شعبة</option></select></div><div class="field" id="imgChoiceWrap" hidden><label>الاختيار</label><select id="imgChoice"></select></div></div><div class="actions"><button id="imgSave">حفظ الصورة PNG</button><span id="imgStatus" class="muted" aria-live="polite"></span></div><div class="notice">الصور تشمل جميع الحصص بالألوان مع اسم المدرسة والسنة الدراسية، دون أقفال. للطباعة: صفحة واحدة لجميع شعب المتوسطة، وصفحة واحدة لجميع شعب الإعدادية، بقياس A3 أفقي.</div>${db.timetable.length?'<div class="unified-preview"><p class="muted">معاينة الصفحتين: المتوسطة ثم الإعدادية، باستخدام قالب الطباعة نفسه.</p><iframe id="printPreviewFrame" title="معاينة الطباعة الرسمية"></iframe></div>':'<div class="empty">استورد أو أنشئ الجدول أولاً.</div>'}`;
 const designUI=`<section class="design-options"><h3>الهوية الرسمية وشعار المدرسة</h3><div class="grid"><div class="field"><label>النمط البصري</label><select id="prDesignTheme"><option value="formal">رسمي أكاديمي (كحلي وذهبي)</option><option value="minimal">رسمي مبسط</option><option value="soft">ألوان المراحل</option></select></div><div class="field"><label>موضع الشعار</label><select id="prLogoPosition"><option value="center">منتصف الرأس</option><option value="right">يمين الرأس</option><option value="left">يسار الرأس</option><option value="none">إخفاء الشعار</option></select></div><div class="field"><label>كثافة الخلايا</label><select id="prDensity"><option value="compact">مضغوط</option><option value="medium">متوسط</option><option value="wide">واسع</option></select></div></div><div class="field"><label>رفع شعار المدرسة (PNG أو JPG، بحد أقصى 1 ميغابايت)</label><input id="prLogoFile" type="file" accept="image/png,image/jpeg"><div id="prLogoPreview">${p.logo?`<img class="logo-preview" src="${p.logo}" alt="معاينة شعار المدرسة">`:'لا يوجد شعار مرفوع'}</div><button type="button" class="secondary" id="prRemoveLogo">إزالة الشعار</button></div><div class="design-toggles"><label><input type="checkbox" id="prTeachers"> إظهار أسماء المدرسين</label><label><input type="checkbox" id="prNotes"> إظهار الملاحظات</label><label><input type="checkbox" id="prSignatures"> إظهار التواقيع</label></div><div class="grid"><div class="field"><label>التوقيع الأول</label><input id="prSig1"></div><div class="field"><label>التوقيع الثاني</label><input id="prSig2"></div><div class="field"><label>التوقيع الثالث</label><input id="prSig3"></div></div><div class="notice">الإعدادات تُحفظ ضمن نسخة JSON الاحتياطية، ولا تؤثر في توزيع الحصص أو القيود.</div></section>`;
 $('#workspace').insertAdjacentHTML('afterbegin',designUI);
 const previewFrame=$('#printPreviewFrame');if(previewFrame){previewFrame.srcdoc='<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+printCSS()+'</style></head><body>'+printDocument()+'</body></html>';}

 $('#prPrintMode').value=p.printMode==='bw'?'bw':'color';$('#prDesignTheme').value=p.theme||'formal';$('#prLogoPosition').value=p.logoPosition||'center';$('#prDensity').value=p.density||'compact';$('#prTeachers').checked=p.showTeachers!==false;$('#prNotes').checked=p.showNotes!==false;$('#prSignatures').checked=p.showSignatures!==false;$('#prSig1').value=p.signature1||'منظّم الجدول';$('#prSig2').value=p.signature2||'معاون المدير';$('#prSig3').value=p.signature3||'مدير المدرسة';
 $('#prLogoFile').onchange=()=>{const file=$('#prLogoFile').files[0];if(!file)return;if(!['image/png','image/jpeg'].includes(file.type)||file.size>1048576){alert('اختر صورة PNG أو JPG بحجم لا يتجاوز 1 ميغابايت');$('#prLogoFile').value='';return}const reader=new FileReader();reader.onload=()=>{p.logo=String(reader.result);$('#prLogoPreview').innerHTML=`<img class="logo-preview" src="${p.logo}" alt="معاينة الشعار">`;save()};reader.readAsDataURL(file)};
 $('#prRemoveLogo').onclick=()=>{p.logo='';$('#prLogoFile').value='';$('#prLogoPreview').textContent='لا يوجد شعار مرفوع';save()};
 const store=()=>{p.title=$('#prTitle').value.trim()||'جدول الحصص الأسبوعية';p.startDate=$('#prDate').value;p.changeReasons=$('#prReasons').value;p.footer=$('#prFooter').value;p.showColors=$('#prColors').checked;p.printMode=$('#prPrintMode').value;p.theme=$('#prDesignTheme').value;p.logoPosition=$('#prLogoPosition').value;p.density=$('#prDensity').value;p.showTeachers=$('#prTeachers').checked;p.showNotes=$('#prNotes').checked;p.showSignatures=$('#prSignatures').checked;p.signature1=$('#prSig1').value.trim();p.signature2=$('#prSig2').value.trim();p.signature3=$('#prSig3').value.trim();save()};
 $('#prPrintMode').onchange=()=>{const frame=$('#printPreviewFrame');if(frame){const previous=p.printMode;p.printMode=$('#prPrintMode').value;frame.srcdoc='<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>'+printCSS()+'</style></head><body>'+printDocument()+'</body></html>';p.printMode=previous}};$('#prSave').onclick=()=>{store();printSetup()};$('#prPrint').onclick=()=>{store();openPrintSheets()};
 const type=$('#imgType'),choice=$('#imgChoice'),wrap=$('#imgChoiceWrap');
 function refreshChoice(){const v=type.value;wrap.hidden=!['stage','teacher','section'].includes(v);let list=v==='stage'?db.stages.slice().sort((a,b)=>a.order-b.order):v==='teacher'?db.teachers.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar')):db.sections.slice().sort((a,b)=>(db.stages.find(g=>g.id===a.stageId)?.order||0)-(db.stages.find(g=>g.id===b.stageId)?.order||0)||a.order-b.order);choice.innerHTML=list.map(x=>`<option value="${x.id}">${esc(v==='stage'?stageDisplayName(x):v==='section'?exportSectionName(x.id):x.name)}</option>`).join('')};type.onchange=refreshChoice;refreshChoice();
 $('#imgSave').onclick=async()=>{store();if(!db.timetable.length)return alert('لا يوجد جدول للتصدير');const btn=$('#imgSave');btn.disabled=true;$('#imgStatus').textContent='جارٍ تجهيز الصورة...';try{await exportSchedulePNG(type.value,choice.value);$('#imgStatus').textContent='تم تجهيز الصورة؛ تحقق من التنزيلات أو قائمة المشاركة.'}catch(e){$('#imgStatus').textContent='تعذر التصدير: '+e.message}finally{btn.disabled=false}};
}
// Shared display helper: available to print setup and PNG renderer.
function exportSectionName(id){const sec=db.sections.find(x=>x.id===id);if(!sec)return '—';const stage=db.stages.find(g=>g.id===sec.stageId);return (stage?stageDisplayName(stage):'مرحلة')+' '+sec.name;}
const exportPalettes={g1:['#E7F0F9','#244E78','#587B9B'],g2:['#E8F3E9','#315F3B','#6F8F72'],g3:['#F7EEE3','#785332','#9A7B60'],g4:['#EEEAF7','#59477E','#7D7398'],g5:['#FAEBEF','#85445A','#A16F78'],g6:['#E4F2F1','#27616A','#557F83']};
async function exportSchedulePNG(mode,id){
 const stages=mode==='all'?db.stages.map(x=>x.id):mode==='middle'?['g1','g2','g3']:mode==='high'?['g4','g5','g6']:mode==='stage'?[id]:null;
 const sec=mode==='section'?db.sections.filter(x=>x.id===id):db.sections.filter(x=>!stages||stages.includes(x.stageId));
 const sections=mode==='teacher'?[]:sec.slice().sort((a,b)=>(db.stages.find(g=>g.id===a.stageId)?.order||0)-(db.stages.find(g=>g.id===b.stageId)?.order||0)||a.order-b.order);
 const focus=mode==='teacher'||mode==='section',days=db.days.filter(d=>d.active).sort((a,b)=>a.order-b.order);
 const headings=focus?days:sections;
 const rows=focus?Array.from({length:Math.max(...days.map(d=>d.periods))},(_,i)=>({period:i+1})):days.flatMap(day=>Array.from({length:day.periods},(_,i)=>({day,period:i+1})));
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)throw new Error('المتصفح لا يدعم الرسم');ctx.direction='rtl';
 const font=(size,bold=false)=>`${bold?'700':'400'} ${size}px Tahoma,Arial,sans-serif`;
 const measure=(str,size,bold=false)=>{ctx.font=font(size,bold);return ctx.measureText(String(str||'')).width};
 const wrap=(str,max,size,bold=false)=>{let lines=[''];for(const word of String(str||'—').split(/\s+/)){let i=lines.length-1,test=lines[i]?lines[i]+' '+word:word;if(measure(test,size,bold)<=max||!lines[i])lines[i]=test;else lines.push(word)}return lines};
 const focusW=focus?150:0,dayW=focus?0:26,periodW=24,baseFont=focus?17:13,teacherFont=focus?14:11;
 const colWidths=headings.map(item=>{if(focus)return focusW;const entries=db.timetable.filter(e=>e.sectionId===item.id);const widest=Math.max(measure(exportSectionName(item.id),14,true),...entries.map(e=>Math.max(measure(db.subjects.find(s=>s.id===e.subjectId)?.name||'',baseFont,true),measure(teacherShort(db.teachers.find(t=>t.id===e.teacherId)?.name),teacherFont))));return Math.max(66,Math.min(110,Math.ceil(widest+10)))});
 const margin=24,tableW=dayW+periodW+colWidths.reduce((a,b)=>a+b,0),width=tableW+margin*2,headH=52,topH=175,footH=db.printSettings.showSignatures?112:70;
 const rowHeights=rows.map(r=>{let h=31;headings.forEach(item=>{const day=focus?item:r.day,sectionId=mode==='section'?id:item.id;const e=db.timetable.find(e=>e.dayId===day.id&&e.period===r.period&&(mode==='teacher'?e.teacherId===id:e.sectionId===sectionId));if(!e)return;const ci=headings.indexOf(item),w=colWidths[ci]-14;const sub=db.subjects.find(s=>s.id===e.subjectId)?.name||'—',t=db.teachers.find(t=>t.id===e.teacherId)?.name||'—';const subLines=wrap(sub,w,baseFont,true).length,teachLines=db.printSettings.showTeachers===false?0:wrap(mode==='teacher'?exportSectionName(e.sectionId):teacherShort(t),w,teacherFont).length;h=Math.max(h,5+subLines*(baseFont+1)+teachLines*(teacherFont+1))});return h});
 const height=topH+headH+rowHeights.reduce((a,b)=>a+b,0)+footH;
 if(width>9000||height>9000||width*height>50000000)throw new Error('الصورة كبيرة لهذا الجهاز؛ جرّب تصدير مرحلة واحدة.');
 canvas.width=width;canvas.height=height;const c=canvas.getContext('2d');c.direction='rtl';c.fillStyle='#fff';c.fillRect(0,0,width,height);
 const box=(x,y,w,h,bg,border='#B9C8D8')=>{c.fillStyle=bg;c.fillRect(x,y,w,h);c.strokeStyle=border;c.lineWidth=1;c.strokeRect(x+.5,y+.5,w-1,h-1)};
 const text=(str,x,y,size=17,color='#17324D',bold=false)=>{c.direction='rtl';c.font=font(size,bold);c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.fillText(String(str||'—'),x,y)};
 const lines=(str,x,y,w,size,bold,color,step)=>{const ls=wrap(str,w,size,bold);ls.forEach((line,i)=>text(line,x,y+i*step,size,color,bold));return ls.length*step};
 const title=mode==='all'?'المدرسة كاملة':mode==='middle'?'المرحلة المتوسطة':mode==='high'?'المرحلة الإعدادية':mode==='stage'?stageDisplayName(db.stages.find(x=>x.id===id)):mode==='teacher'?db.teachers.find(x=>x.id===id)?.name:exportSectionName(id);
 text(db.school.name||'اسم المدرسة',width/2,38,30,'#17324D',true);text(db.printSettings.title||'جدول الحصص الأسبوعية',width/2,80,24,'#274F77',true);text(title,width/2,116,22,'#415A70',true);text(`العام الدراسي: ${db.school.year||'—'} | تاريخ بدء التطبيق: ${db.printSettings.startDate||'غير محدد'}`,width/2,151,15,'#475569');
 if(db.printSettings.logo&&db.printSettings.logoPosition!=='none'){try{const img=new Image();img.src=db.printSettings.logo;await new Promise((resolve,reject)=>{if(img.complete&&img.naturalWidth)return resolve();img.onload=resolve;img.onerror=reject});const x=db.printSettings.logoPosition==='center'?width/2-22:db.printSettings.logoPosition==='right'?width-82:38;c.drawImage(img,x,5,44,44)}catch(e){/* Continue exporting without invalid logo */}}
 c.strokeStyle='#C4A468';c.lineWidth=2;c.beginPath();c.moveTo(margin,topH-6);c.lineTo(width-margin,topH-6);c.stroke();
 const tableTop=topH;let right=width-margin;
 if(!focus){right-=dayW;box(right,tableTop,dayW,headH,'#E8EEF5');c.save();c.translate(right+dayW/2,tableTop+headH/2);c.rotate(-Math.PI/2);text('اليوم',0,0,13,'#17324D',true);c.restore()}
 right-=periodW;box(right,tableTop,periodW,headH,'#E8EEF5');c.save();c.translate(right+periodW/2,tableTop+headH/2);c.rotate(-Math.PI/2);text('الحصة',0,0,13,'#17324D',true);c.restore();
 headings.forEach((item,i)=>{const w=colWidths[i];right-=w;const pal=focus?null:exportPalettes[item.stageId];box(right,tableTop,w,headH,pal?pal[0]:'#E8EEF5',pal?pal[2]:'#B9C8D8');lines(focus?item.name:exportSectionName(item.id),right+w/2,tableTop+headH/2-7,w-10,14,true,pal?pal[1]:'#17324D',17)});
 let yy=tableTop+headH;const dayColors=['#DCE9F8','#E2F1E5','#FFF0DA','#EEE7F9','#FBE8ED'];
 rows.forEach((r,ri)=>{const rh=rowHeights[ri];let xx=width-margin;
 if(!focus){xx-=dayW;if(r.period===1){const start=ri,total=rows.slice(start,start+r.day.periods).reduce((sum,_,j)=>sum+rowHeights[start+j],0);box(xx,yy,dayW,total,dayColors[days.findIndex(d=>d.id===r.day.id)]||'#EAF1F8');c.save();c.translate(xx+dayW/2,yy+total/2);c.rotate(-Math.PI/2);text(r.day.name,0,0,20,'#24466C',true);c.restore()}}
 xx-=periodW;box(xx,yy,periodW,rh,ri%2?'#F2F6FA':'#EAF0F6');text(String(r.period),xx+periodW/2,yy+rh/2,13,'#334155',true);
 headings.forEach((item,i)=>{const w=colWidths[i];xx-=w;const day=focus?item:r.day,secId=mode==='section'?id:item.id;const e=db.timetable.find(e=>e.dayId===day.id&&e.period===r.period&&(mode==='teacher'?e.teacherId===id:e.sectionId===secId));const section=mode==='teacher'?db.sections.find(s=>s.id===e?.sectionId):mode==='section'?db.sections.find(s=>s.id===id):item;const pal=exportPalettes[section?.stageId]||['#F4F7FA','#334155','#64748B'];const off=mode==='teacher'?r.period>day.periods:r.period>sectionDayPeriods(section,day);box(xx,yy,w,rh,off?'#F1F3F6':e?(db.printSettings.theme==='contrast'?'#FFFFFF':pal[0]):ri%2?'#FAFBFC':'#FFFFFF',e?pal[2]:'#D4DCE5');if(e){const sub=db.subjects.find(s=>s.id===e.subjectId)?.name||'—',teacher=db.teachers.find(t=>t.id===e.teacherId)?.name||'—';const t=mode==='teacher'?exportSectionName(e.sectionId):teacherShort(teacher),subLines=wrap(sub,w-8,baseFont,true),tLines=db.printSettings.showTeachers===false?[]:wrap(t,w-8,teacherFont),total=subLines.length*(baseFont+1)+tLines.length*(teacherFont+3),first=yy+(rh-total)/2+baseFont/2+2;subLines.forEach((line,k)=>text(line,xx+w/2,first+k*(baseFont+1),baseFont,'#182D43',true));tLines.forEach((line,k)=>text(line,xx+w/2,first+subLines.length*(baseFont+1)+k*(teacherFont+1),teacherFont,'#475569'))}else if(off)text('—',xx+w/2,yy+rh/2,15,'#9AA5B1')});yy+=rh});
 if(db.printSettings.showNotes!==false){text(`أسباب تغيير الجدول: ${db.printSettings.changeReasons||'—'}`,width/2,height-footH+20,14,'#475569');if(db.printSettings.footer)text(db.printSettings.footer,width/2,height-footH+42,12,'#475569')}
 if(db.printSettings.showSignatures!==false){const labels=[db.printSettings.signature1||'منظّم الجدول',db.printSettings.signature2||'معاون المدير',db.printSettings.signature3||'مدير المدرسة'];labels.forEach((label,i)=>{const x=width*(i+1)/4;text(label,x,height-37,13,'#17324D',true);text('التوقيع: __________',x,height-17,11,'#475569')})}
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('فشل إنشاء PNG')),'image/png'));const filename='school-timetable-'+mode+(id?'-'+id:'')+'.png';const file=typeof File==='function'?new File([blob],filename,{type:'image/png'}):null;
 if(file&&navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:'جدول الحصص'});return}catch(e){if(e.name==='AbortError')return}}
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
}

$('#exportBtn').onclick=()=>{let blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='school-timetable-v0.9.8.3-backup.json';a.click();URL.revokeObjectURL(a.href)};
$('#importFile').onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{try{const incoming=migrate(JSON.parse(r.result));
 if(!Array.isArray(incoming.sections)||!Array.isArray(incoming.assignments)||!Array.isArray(incoming.timetable))throw Error('بيانات غير مكتملة');
 const oldCount=db.timetable?.length||0,newCount=incoming.timetable.length;
 if(oldCount>0&&newCount===0&&!confirm('تحذير: النسخة المستوردة لا تحتوي أي حصة موزعة، بينما جدولك الحالي يحتوي '+oldCount+' حصة. هل تريد استبداله رغم ذلك؟'))return;
 if(oldCount>0&&!preserveTimetable('استيراد نسخة احتياطية'))return;
 db=incoming;save();render();alert('تم الاستيراد بنجاح — الحصص الموزعة: '+newCount)}catch{alert('ملف غير صالح')}};r.readAsText(f)};
render();
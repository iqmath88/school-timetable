const KEY='school-timetable-v01';
const stageDefaults=[['الأول',1,'#587B9B'],['الثاني',2,'#6F8F72'],['الثالث',3,'#9A7B60'],['الرابع',4,'#7D7398'],['الخامس',5,'#A16F78'],['السادس',6,'#557F83']];
const defaultDays=[['الأحد',7,true],['الاثنين',7,true],['الثلاثاء',6,true],['الأربعاء',7,true],['الخميس',5,true],['الجمعة',0,false],['السبت',0,false]];
const seed=()=>({version:'0.9.0',school:{name:'',year:'2026-2027'},days:defaultDays.map((x,i)=>({id:'d'+i,name:x[0],periods:x[1],active:x[2],order:i+1})),stages:stageDefaults.map(x=>({id:'g'+x[1],name:x[0],order:x[1],color:x[2]})),sections:[],subjects:[],teachers:[],assignments:[],teacherRules:{},fixedLessons:[],timetable:[],stageLoads:{},stageDayPeriods:{},subjectRules:{},printSettings:{title:'جدول الحصص الأسبوعية',startDate:'',changeReasons:'',footer:'',showColors:true}});
function migrate(x){x=x||seed();x.version='0.9.0';x.teacherRules=x.teacherRules||{};x.fixedLessons=x.fixedLessons||[];x.timetable=x.timetable||[];x.stageLoads=x.stageLoads||{};x.stageDayPeriods=x.stageDayPeriods||{};x.subjectRules=x.subjectRules||{};x.printSettings={title:'جدول الحصص الأسبوعية',startDate:'',changeReasons:'',footer:'',showColors:true,...(x.printSettings||{})};x.teachers=x.teachers||[];x.assignments=x.assignments||[];return x}
function load(){try{return migrate(JSON.parse(localStorage.getItem(KEY)))}catch{return seed()}}
let db=load(),page='school';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),uid=p=>p+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function save(){localStorage.setItem(KEY,JSON.stringify(db));renderSummary()}
const pages=[['school','1. المدرسة'],['days','2. الأيام والحصص'],['sections','3. المراحل والشعب'],['subjects','4. المواد'],['teachers','5. المدرسون'],['loads','6. حصص المراحل'],['assignments','7. إدارة التكليفات'],['constraints','7. قيود المدرسين'],['fixed','8. الحصص المثبتة'],['feasibility','9. فحص الجدوى'],['generator','10. توليد الجدول'],['workspaceTT','11. مساحة عمل الجدول'],['gapDiagnosis','12. تشخيص الفراغات'],['printSetup','13. الطباعة والحفظ']];
function nav(){$('#steps').innerHTML=pages.map(x=>`<button class="step ${page===x[0]?'active':''}" data-p="${x[0]}">${x[1]}</button>`).join('');document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{page=b.dataset.p;render()})}
function completeness(){let c=[!!db.school.name,db.days.some(d=>d.active&&d.periods>0),db.sections.length,db.subjects.length,db.teachers.length,db.assignments.length];return Math.round(c.filter(Boolean).length/c.length*100)}
function renderSummary(){if(!$('#summary'))return;let configured=db.teachers.filter(t=>db.teacherRules[t.id]).length;$('#summary').innerHTML=`<div class="cards"><div class="stat">اكتمال البيانات<b>${completeness()}%</b></div><div class="stat">الشعب<b>${db.sections.length}</b></div><div class="stat">المواد<b>${db.subjects.length}</b></div><div class="stat">المدرسون<b>${db.teachers.length}</b></div><div class="stat">قيود مضبوطة<b>${configured}</b></div><div class="stat">حصص مثبتة<b>${db.fixedLessons.length}</b></div></div><div class="progress" style="margin-top:12px"><i style="width:${completeness()}%"></i></div>`}
function render(){nav();renderSummary();({school,days,sections,subjects,teachers,loads,assignments,constraints,fixed,feasibility,generator,workspaceTT,gapDiagnosis,printSetup}[page])()}
function school(){$('#workspace').innerHTML=`<h2>إعداد المدرسة</h2><div class="grid"><div class="field"><label>اسم المدرسة</label><input id="schoolName" value="${esc(db.school.name)}"></div><div class="field"><label>العام الدراسي</label><input id="schoolYear" value="${esc(db.school.year)}"></div></div><div class="actions"><button id="saveSchool">حفظ الإعدادات</button><button class="secondary" id="importBtn">استيراد نسخة احتياطية</button><button class="danger" id="resetBtn">إعادة ضبط المشروع</button></div>`;$('#saveSchool').onclick=()=>{db.school.name=$('#schoolName').value.trim();db.school.year=$('#schoolYear').value.trim();save()};$('#importBtn').onclick=()=>$('#importFile').click();$('#resetBtn').onclick=()=>{if(confirm('سيتم حذف جميع البيانات المحلية. هل أنت متأكد؟')){db=seed();save();render()}}}
function sectionDayPeriods(sec,day){const x=db.stageDayPeriods?.[sec.stageId]?.[day.id];return day.active?Math.max(0,Math.min(day.periods,Number.isFinite(+x)&&x!==undefined?+x:day.periods)):0}
function dayCapacity(sec){return db.days.reduce((n,d)=>n+sectionDayPeriods(sec,d),0)}
function days(){$('#workspace').innerHTML=`<h2>أيام الدوام وعدد الحصص</h2><div class="notice">يمكن أن يختلف عدد الحصص من يوم إلى آخر.</div><table><thead><tr><th>اليوم</th><th>دوام</th><th>عدد الحصص</th></tr></thead><tbody>${db.days.sort((a,b)=>a.order-b.order).map(d=>`<tr><td>${d.name}</td><td><input type="checkbox" data-active="${d.id}" ${d.active?'checked':''}></td><td><input type="number" min="0" max="12" data-periods="${d.id}" value="${d.periods}"></td></tr>`).join('')}</tbody></table><h3>تخصيص عدد الحصص حسب المرحلة واليوم</h3><div class="notice">العدد العام هو الحد الأعلى. مثال: الثلاثاء 7 حصص للمدرسة، و6 لبقية المراحل، و7 للسادس.</div><div class="tt-wrap"><table><thead><tr><th>المرحلة</th>${db.days.filter(d=>d.active).map(d=>`<th>${esc(d.name)}</th>`).join('')}</tr></thead><tbody>${db.stages.map(g=>`<tr><th>${esc(g.name)}</th>${db.days.filter(d=>d.active).map(d=>`<td><input class="stage-period-input" type="number" min="0" max="${d.periods}" data-stage-day="${g.id}|${d.id}" value="${db.stageDayPeriods[g.id]?.[d.id]??d.periods}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>`;document.querySelectorAll('[data-stage-day]').forEach(x=>x.onchange=()=>{const [g,d]=x.dataset.stageDay.split('|');const max=db.days.find(v=>v.id===d).periods;db.stageDayPeriods[g]??={};db.stageDayPeriods[g][d]=Math.min(max,Math.max(0,+x.value||0));db.timetable=[];save();days()});document.querySelectorAll('[data-active]').forEach(x=>x.onchange=()=>{db.days.find(d=>d.id===x.dataset.active).active=x.checked;save()});document.querySelectorAll('[data-periods]').forEach(x=>x.onchange=()=>{let d=db.days.find(d=>d.id===x.dataset.periods);d.periods=Math.max(0,+x.value||0);d.active=d.periods>0;save();days()})}
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
}
function defaultRule(tid){let unavailable={};db.days.filter(d=>d.active).forEach(d=>unavailable[d.id]=[]);return {teacherId:tid,unavailable,preferred:[],avoid:[],maxDaily:7,consecutive:'neutral'}}
function rule(tid){if(!db.teacherRules[tid])db.teacherRules[tid]=defaultRule(tid);return db.teacherRules[tid]}
function constraints(){if(!db.teachers.length){$('#workspace').innerHTML='<h2>قيود المدرسين</h2><div class="notice warning">أضف المدرسين أولاً.</div>';return}let tid=(window.constraintTeacher&&db.teachers.some(t=>t.id===window.constraintTeacher))?window.constraintTeacher:db.teachers[0].id;window.constraintTeacher=tid;let r=rule(tid),maxP=Math.max(0,...db.days.filter(d=>d.active).map(d=>d.periods));let grid=`<div class="slot-grid" style="--periods:${maxP}"><div class="slot-head">اليوم</div>${Array.from({length:maxP},(_,i)=>`<div class="slot-head">${i+1}</div>`).join('')}${db.days.filter(d=>d.active).map(d=>`<div class="slot-head">${d.name}</div>${Array.from({length:maxP},(_,i)=>i<d.periods?`<div class="slot ${(r.unavailable[d.id]||[]).includes(i+1)?'unavailable':'available'}" data-slot="${d.id}|${i+1}">${(r.unavailable[d.id]||[]).includes(i+1)?'غير متاح':'متاح'}</div>`:`<div>—</div>`).join('')}`).join('')}</div>`;let pref=Array.from({length:maxP},(_,i)=>{let p=i+1,state=r.preferred.includes(p)?'preferred':r.avoid.includes(p)?'avoid':'';return `<button class="pref ${state}" data-pref="${p}">الحصة ${p}: ${state==='preferred'?'مفضلة':state==='avoid'?'تجنب':'عادية'}</button>`}).join('');$('#workspace').innerHTML=`<h2>قيود وتفضيلات المدرسين</h2><div class="field"><label>المدرس</label><select id="constraintTeacher">${db.teachers.map(t=>`<option value="${t.id}" ${t.id===tid?'selected':''}>${esc(t.name)}</option>`).join('')}</select></div><h3>التوفر الأسبوعي</h3><div class="notice">اضغط أي حصة للتبديل بين متاح وغير متاح. اضغط اسم اليوم لتعطيل/إتاحة اليوم بالكامل.</div><div class="actions">${db.days.filter(d=>d.active).map(d=>`<button class="secondary" data-daytoggle="${d.id}">${d.name}: ${(r.unavailable[d.id]||[]).length>=d.periods?'غير متاح':'متاح جزئياً/كلياً'}</button>`).join('')}</div><div class="availability">${grid}</div><h3>تفضيل أرقام الحصص</h3><div class="pref-grid">${pref}</div><div class="grid" style="margin-top:18px"><div class="field"><label>الحد الأعلى المفضل للحصص اليومية</label><input id="maxDaily" type="number" min="1" max="12" value="${r.maxDaily}"></div><div class="field"><label>الحصص المتتالية</label><select id="consecutive"><option value="neutral" ${r.consecutive==='neutral'?'selected':''}>لا تفضيل</option><option value="prefer" ${r.consecutive==='prefer'?'selected':''}>أفضل المتتالية</option><option value="avoid" ${r.consecutive==='avoid'?'selected':''}>أفضل عدم التتالي</option></select></div></div><div class="actions"><button id="saveRules">حفظ القيود</button></div>`;$('#constraintTeacher').onchange=e=>{window.constraintTeacher=e.target.value;constraints()};document.querySelectorAll('[data-slot]').forEach(x=>x.onclick=()=>{let [d,p]=x.dataset.slot.split('|');p=+p;r.unavailable[d]=r.unavailable[d]||[];r.unavailable[d]=r.unavailable[d].includes(p)?r.unavailable[d].filter(v=>v!==p):[...r.unavailable[d],p];save();constraints()});document.querySelectorAll('[data-daytoggle]').forEach(x=>x.onclick=()=>{let d=db.days.find(z=>z.id===x.dataset.daytoggle);r.unavailable[d.id]=(r.unavailable[d.id]||[]).length>=d.periods?[]:Array.from({length:d.periods},(_,i)=>i+1);save();constraints()});document.querySelectorAll('[data-pref]').forEach(x=>x.onclick=()=>{let p=+x.dataset.pref;if(r.preferred.includes(p)){r.preferred=r.preferred.filter(v=>v!==p);r.avoid.push(p)}else if(r.avoid.includes(p)){r.avoid=r.avoid.filter(v=>v!==p)}else r.preferred.push(p);save();constraints()});$('#saveRules').onclick=()=>{r.maxDaily=Math.max(1,+$('#maxDaily').value||1);r.consecutive=$('#consecutive').value;save();alert('تم حفظ قيود المدرس')}}
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
      if(sr.noRepeat&&a.weeklyPeriods>allowedDays)push('red',`تكرار ممنوع لمادة ${su.name}`,`المطلوب ${a.weeklyPeriods} حصص لكن الأيام الممكنة ${allowedDays} فقط.`,`SUBJECT_REPEAT:${a.id}`);
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
 let worker;try{worker=new Worker('generator-worker.js?v=090')}catch(err){button.disabled=false;button.textContent='توليد الجدول تلقائياً';window.generationReport={ok:false,reason:'worker-error',message:'تعذر تشغيل ملف المحرك: '+String(err),seconds:'0'};generator();return}generationWorker=worker;
 const tick=setInterval(()=>{if(finished)return;const elapsed=Date.now()-began;
   if(elapsed>45000){finish({ok:false,reason:'time',...lastProgress,message:`أوقف مراقب السلامة المحرك بعد 45 ثانية. آخر مرحلة: ${phase}. لم تتغير البيانات.`});return}
   if(status)status.textContent=`${phase} — ${Math.round(elapsed/1000)} ثانية — عقد ${lastProgress.nodes} — أفضل عمق ${lastProgress.bestDepth} من ${lastProgress.total||'—'}. ${Date.now()-lastUpdate>7000?'المحرك مشغول بالحساب، يمكن إيقافه.':''}`;
 },500);
 generationCancel=()=>finish({ok:false,reason:'cancelled',...lastProgress,message:'أوقفت التوليد. بقي الجدول السابق محفوظاً.'});
 const stop=$('#stopGenerate');if(stop){stop.hidden=false;stop.onclick=()=>generationCancel()}
 const finish=result=>{if(finished)return;finished=true;clearInterval(tick);worker.terminate();generationWorker=null;generationCancel=null;
   if(result.ok){db.timetable=result.entries.map((e,i)=>({...e,id:'ent_'+Date.now().toString(36)+'_'+i}));save();}
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
function timetableTable(){
  if(!db.timetable.length)return '<div class="empty">لم يتم توليد جدول بعد.</div>';
  const secs=db.sections.slice().sort((a,b)=>(db.stages.find(g=>g.id===a.stageId)?.order||0)-(db.stages.find(g=>g.id===b.stageId)?.order||0)||a.order-b.order);
  const maxP=Math.max(...db.days.filter(d=>d.active).map(d=>d.periods));
  let rows='';
  db.days.filter(d=>d.active).sort((a,b)=>a.order-b.order).forEach(d=>{
    for(let p=1;p<=d.periods;p++){
      rows+=`<tr class="day-row day-${d.id}"><th class="day-label day-${d.id}">${p===1?d.name:''}</th><th>الحصة ${p}</th>`+secs.map(sec=>{
        const e=db.timetable.find(x=>x.sectionId===sec.id&&x.dayId===d.id&&x.period===p);
        if(p>sectionDayPeriods(sec,d))return '<td class="tt-off">—</td>';if(!e)return '<td class="tt-empty">—</td>';
        const su=db.subjects.find(x=>x.id===e.subjectId),t=db.teachers.find(x=>x.id===e.teacherId);
        return `<td class="lesson" style="background:${db.stages.find(g=>g.id===sec.stageId)?.color||'#eef4fa'}22;border-top:3px solid ${db.stages.find(g=>g.id===sec.stageId)?.color||'#a0aec0'}"><b>${esc(su?.name||'—')}</b><small>${esc(teacherShort(t?.name))}${e.locked?' 🔒':''}</small></td>`;
      }).join('')+'</tr>';
    }
  });
  return `<div class="tt-wrap"><table class="timetable"><thead><tr><th>اليوم</th><th>الحصة</th>${secs.map(s=>{let g=db.stages.find(x=>x.id===s.stageId);return `<th style="border-top:4px solid ${g?.color||'#888'}">${g?.name||''} ${esc(s.name)}</th>`}).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
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
  ${timetableTable()}`;
  $('#checkBtn').onclick=()=>{page='feasibility';render()};
  if($('#generateBtn')){$('#generateBtn').disabled=!!generationWorker||!!reds;$('#generateBtn').onclick=startGeneration;}
  if(generationWorker&&$('#stopGenerate'))$('#stopGenerate').onclick=()=>generationCancel?.();
  if($('#clearTT'))$('#clearTT').onclick=()=>{if(confirm('مسح الجدول المولد؟')){db.timetable=[];save();generator()}};
}


function ttEntryInfo(e){
  const su=db.subjects.find(x=>x.id===e.subjectId),t=db.teachers.find(x=>x.id===e.teacherId),se=db.sections.find(x=>x.id===e.sectionId),g=se&&db.stages.find(x=>x.id===se.stageId);
  return {subject:su?.name||'—',teacher:teacherShort(t?.name),section:g?g.name+' '+se.name:'—',color:g?.color||'#eef4fa'};
}
function validateTimetableMove(e,dayId,period){
  const d=db.days.find(x=>x.id===dayId);
  if(!d||!d.active||period<1||period>sectionDayPeriods(db.sections.find(s=>s.id===e.sectionId)||{stageId:''},d))return {level:'red',message:'الخانة خارج أوقات الدوام.'};
  const sr=db.subjectRules[e.subjectId]||{},stageId=db.sections.find(s=>s.id===e.sectionId)?.stageId;const applicable=!sr.stageId||sr.stageId===stageId;const cap=sectionDayPeriods(db.sections.find(s=>s.id===e.sectionId),d);if(applicable&&sr.strict!=='soft'&&((sr.noFirst&&period===1)||(sr.noLast&&period===cap)))return {level:'red',message:'الحصة تخالف قيد المادة الإلزامي.'};if(applicable&&sr.strict!=='soft'&&sr.noRepeat&&db.timetable.some(x=>x.id!==e.id&&x.sectionId===e.sectionId&&x.subjectId===e.subjectId&&x.dayId===dayId))return {level:'red',message:'تكرار المادة في اليوم ممنوع.'};
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
function moveTimetableEntry(id){
  const e=db.timetable.find(x=>x.id===id);if(!e)return;const info=ttEntryInfo(e),o=document.createElement('div');o.className='edit-overlay';
  o.innerHTML=`<div class="edit-card"><div class="edit-head"><h3>نقل الحصة</h3><button type="button" class="icon-close">×</button></div>
  <div class="notice">${esc(info.subject)} — ${esc(info.teacher)} — ${esc(info.section)}</div>
  <div class="field"><label>اليوم</label><select id="mvDay">${db.days.filter(d=>d.active).sort((a,b)=>a.order-b.order).map(d=>`<option value="${d.id}" ${d.id===e.dayId?'selected':''}>${d.name}</option>`).join('')}</select></div>
  <div class="field"><label>الحصة</label><select id="mvPeriod"></select></div><div id="mvStatus"></div>
  <div class="actions"><button id="mvSave">تنفيذ النقل</button><button class="secondary" id="mvCancel">إلغاء</button></div></div>`;
  document.body.appendChild(o);const day=o.querySelector('#mvDay'),per=o.querySelector('#mvPeriod'),status=o.querySelector('#mvStatus'),saveBtn=o.querySelector('#mvSave');
  function check(){const v=validateTimetableMove(e,day.value,+per.value);status.innerHTML=`<div class="move-check ${v.level}">${v.level==='red'?'🔴':v.level==='orange'?'🟠':'🟢'} ${esc(v.message)}</div>`;saveBtn.disabled=v.level==='red'}
  function periods(){const d=db.days.find(x=>x.id===day.value);per.innerHTML=Array.from({length:sectionDayPeriods(db.sections.find(s=>s.id===e.sectionId),d)},(_,i)=>`<option value="${i+1}" ${d.id===e.dayId&&i+1===e.period?'selected':''}>الحصة ${i+1}</option>`).join('');check()}
  day.onchange=periods;per.onchange=check;periods();const close=()=>o.remove();o.querySelector('.icon-close').onclick=close;o.querySelector('#mvCancel').onclick=close;
  saveBtn.onclick=()=>{const v=validateTimetableMove(e,day.value,+per.value);if(v.level==='red')return alert(v.message);if(v.level==='orange'&&!confirm(v.message+' — هل تريد المتابعة؟'))return;e.dayId=day.value;e.period=+per.value;save();close();workspaceTT()};
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
 $('#workspace').innerHTML=`<h2>مساحة عمل الجدول</h2><div class="workspace-toolbar"><div class="field"><label>نوع العرض</label><select id="ttMode"><option value="school">المدرسة كاملة</option><option value="teacher">جدول مدرس</option><option value="section">جدول شعبة</option></select></div><div class="field" id="ttEntityWrap"></div><button class="secondary" id="gapGo">تشخيص الفراغات</button><button class="problems-btn" id="ttProblems">${counts.errors} أخطاء — ${counts.warnings} تحذيرات</button><button class="secondary" id="ttPrint">طباعة العرض الحالي</button></div><div class="notice">اختر المدرس أو الشعبة. اضغط على الحصة لنقلها أو تثبيتها. الطباعة تتبع العرض المختار.</div><div id="ttWorkspaceView"></div>`;
 const mode=$('#ttMode'),wrap=$('#ttEntityWrap'),view=$('#ttWorkspaceView');mode.value=pref.mode;
 function bindCells(){document.querySelectorAll('#ttWorkspaceView [data-entry]').forEach(td=>td.onclick=()=>{const e=db.timetable.find(x=>x.id===td.dataset.entry),l=ttEntryInfo(e);if(confirm(`${l.subject} — ${l.teacher}\nموافق = نقل الحصة\nإلغاء = خيارات القفل`))moveTimetableEntry(e.id);else if(confirm(e.locked?'فتح القفل؟':'تثبيت الحصة؟'))toggleTimetableLock(e.id)})}
 function draw(){const m=mode.value;window.ttPreferred={mode:m};if(m==='school'){wrap.innerHTML='';view.innerHTML=timetableTable();return}
 const list=m==='teacher'?db.teachers.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar')):db.sections.slice().sort((a,b)=>(db.stages.find(g=>g.id===a.stageId)?.order||0)-(db.stages.find(g=>g.id===b.stageId)?.order||0)||a.name.localeCompare(b.name,'ar'));
 wrap.innerHTML=`<label>${m==='teacher'?'المدرس':'الشعبة'}</label><select id="ttEntity">${list.map(x=>{const g=db.stages.find(v=>v.id===x.stageId);return `<option value="${esc(x.id)}">${esc(m==='teacher'?x.name:(g?.name||'')+' '+x.name)}</option>`}).join('')}</select>`;
 const sel=$('#ttEntity');if(pref.mode===m&&list.some(x=>x.id===pref.id))sel.value=pref.id;
 const redraw=()=>{window.ttPreferred={mode:m,id:sel.value};view.innerHTML=focusedTimetable(m,sel.value);bindCells()};sel.onchange=redraw;redraw()}
 mode.onchange=draw;draw();$('#gapGo').onclick=()=>{page='gapDiagnosis';render()};$('#ttProblems').onclick=()=>alert(`${counts.errors} أخطاء — ${counts.warnings} تحذيرات`);
 $('#ttPrint').onclick=()=>printSelectedTimetable(window.ttPreferred);
}
function printSelectedTimetable(pick){
 const p=db.printSettings;const label=pick.mode==='teacher'?db.teachers.find(x=>x.id===pick.id)?.name:pick.mode==='section'?(()=>{const sec=db.sections.find(x=>x.id===pick.id),g=db.stages.find(x=>x.id===sec?.stageId);return (g?.name||'')+' '+(sec?.name||'')})():'المدرسة كاملة';
 const table=pick.mode==='school'?timetableTable():focusedTimetable(pick.mode,pick.id);
 const html=`<article class="print-sheet ${p.showColors?'':'no-colors'}"><div class="print-meta"><span>تاريخ بدء التطبيق: <b>${esc(p.startDate||'غير محدد')}</b></span><span>العام الدراسي: <b>${esc(db.school.year)}</b></span></div><header class="print-heading"><h1>${esc(db.school.name||'اسم المدرسة')}</h1><h2>${esc(p.title||'جدول الحصص الأسبوعية')}</h2><h3>${esc(label)}</h3></header>${table}<footer class="print-footer"><strong>أسباب تغيير الجدول:</strong><p>${esc(p.changeReasons||'—')}</p>${p.footer?`<p>${esc(p.footer)}</p>`:''}</footer></article>`;
 const w=window.open('','_blank');if(!w)return alert('اسمح بفتح النوافذ المنبثقة للطباعة');
 w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(label)}</title><style>${printCSS()}</style></head><body>${html}<script>window.onload=()=>setTimeout(()=>window.print(),350)<\/script></body></html>`);w.document.close();
}

function printSetup(){
 const p=db.printSettings;
 $('#workspace').innerHTML=`<h2>إعداد الطباعة والحفظ</h2><div class="grid"><div class="field"><label>عنوان الجدول</label><input id="prTitle" value="${esc(p.title)}"></div><div class="field"><label>تاريخ بدء تطبيق الجدول</label><input id="prDate" type="date" value="${esc(p.startDate)}"></div></div><div class="field"><label>أسباب تغيير الجدول (ذيل الصفحة)</label><textarea id="prReasons" rows="3">${esc(p.changeReasons)}</textarea></div><div class="field"><label>ملاحظات إضافية في الذيل</label><textarea id="prFooter" rows="2">${esc(p.footer)}</textarea></div><label><input id="prColors" type="checkbox" ${p.showColors?'checked':''}> طباعة بألوان المراحل</label><div class="actions"><button id="prSave">حفظ الإعدادات</button><button id="prPrint">طباعة / حفظ PDF</button></div><div class="notice">اختر A3 أفقي من إعدادات الطابعة للجداول الكبيرة، ثم اختر حفظ كملف PDF عند الحاجة. تعتمد دقة الإخراج على خيارات المتصفح والطابعة.</div>${db.timetable.length?'<div class="print-preview">'+printDocument()+'</div>':'<div class="empty">أنشئ الجدول أولاً لعرض المعاينة.</div>'}`;
 const store=()=>{p.title=$('#prTitle').value.trim()||'جدول الحصص الأسبوعية';p.startDate=$('#prDate').value;p.changeReasons=$('#prReasons').value;p.footer=$('#prFooter').value;p.showColors=$('#prColors').checked;save()};
 $('#prSave').onclick=()=>{store();printSetup()};$('#prPrint').onclick=()=>{store();if(!db.timetable.length)return alert('لا يوجد جدول للطباعة');const html=printDocument();const win=window.open('','_blank');if(!win)return alert('اسمح بفتح النافذة المنبثقة للطباعة');win.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(p.title)}</title><style>${printCSS()}</style></head><body>${html}<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);win.document.close()};
}
function printDocument(){const p=db.printSettings;return `<article class="print-sheet ${p.showColors?'':'no-colors'}"><div class="print-meta"><span>تاريخ بدء التطبيق: <b>${esc(p.startDate||'غير محدد')}</b></span><span>العام الدراسي: <b>${esc(db.school.year)}</b></span></div><header class="print-heading"><h1>${esc(db.school.name||'اسم المدرسة')}</h1><h2>${esc(p.title)}</h2></header>${timetableTable()}<footer class="print-footer"><strong>أسباب تغيير الجدول:</strong><p>${esc(p.changeReasons||'—')}</p>${p.footer?`<p>${esc(p.footer)}</p>`:''}</footer></article>`}
function printCSS(){return ` .day-row.day-d0>th,.day-label.day-d0{background:#dceafa!important}.day-row.day-d1>th,.day-label.day-d1{background:#e0f1e5!important}.day-row.day-d2>th,.day-label.day-d2{background:#fff0d9!important}.day-row.day-d3>th,.day-label.day-d3{background:#eee5fa!important}.day-row.day-d4>th,.day-label.day-d4{background:#fbe5eb!important} @page{size:A3 landscape;margin:10mm}*{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;direction:rtl;color:#18324d;margin:0}.print-sheet{width:100%}.print-meta{display:flex;justify-content:space-between;font-size:12px}.print-heading{text-align:center;padding:12px 0}.print-heading h1{margin:0;font-size:23px}.print-heading h2{font-size:18px;margin:8px}.tt-wrap{overflow:visible}table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:10px}th,td{border:1px solid #9eaebe;padding:5px 3px;text-align:center;overflow-wrap:anywhere}th{background:#e9eef4}td b,td small{display:block}td small{font-size:9px}.print-footer{border-top:2px solid #72869a;margin-top:16px;padding:8px;font-size:12px;white-space:pre-wrap}.no-colors .lesson,.no-colors th{background:#fff!important;border-top-color:#888!important}@media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`}

$('#exportBtn').onclick=()=>{let blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='school-timetable-v0.8.4-backup.json';a.click();URL.revokeObjectURL(a.href)};
$('#importFile').onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{try{db=migrate(JSON.parse(r.result));save();render();alert('تم الاستيراد بنجاح')}catch{alert('ملف غير صالح')}};r.readAsText(f)};
render();
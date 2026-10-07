const KEY='school-timetable-v01';
const stageDefaults=[['الأول',1,'#587B9B'],['الثاني',2,'#6F8F72'],['الثالث',3,'#9A7B60'],['الرابع',4,'#7D7398'],['الخامس',5,'#A16F78'],['السادس',6,'#557F83']];
const defaultDays=[['الأحد',7,true],['الاثنين',7,true],['الثلاثاء',6,true],['الأربعاء',7,true],['الخميس',5,true],['الجمعة',0,false],['السبت',0,false]];
const seed=()=>({version:'0.5',school:{name:'',year:'2026-2027'},days:defaultDays.map((x,i)=>({id:'d'+i,name:x[0],periods:x[1],active:x[2],order:i+1})),stages:stageDefaults.map(x=>({id:'g'+x[1],name:x[0],order:x[1],color:x[2]})),sections:[],subjects:[],teachers:[],assignments:[],teacherRules:{},fixedLessons:[],timetable:[]});
function migrate(x){x=x||seed();x.version='0.5';x.teacherRules=x.teacherRules||{};x.fixedLessons=x.fixedLessons||[];x.timetable=x.timetable||[];x.teachers=x.teachers||[];x.assignments=x.assignments||[];return x}
function load(){try{return migrate(JSON.parse(localStorage.getItem(KEY)))}catch{return seed()}}
let db=load(),page='school';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),uid=p=>p+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function save(){localStorage.setItem(KEY,JSON.stringify(db));renderSummary()}
const pages=[['school','1. المدرسة'],['days','2. الأيام والحصص'],['sections','3. المراحل والشعب'],['subjects','4. المواد'],['teachers','5. المدرسون'],['assignments','6. التكليفات'],['constraints','7. قيود المدرسين'],['fixed','8. الحصص المثبتة'],['feasibility','9. فحص الجدوى'],['generator','10. توليد الجدول']];
function nav(){$('#steps').innerHTML=pages.map(x=>`<button class="step ${page===x[0]?'active':''}" data-p="${x[0]}">${x[1]}</button>`).join('');document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{page=b.dataset.p;render()})}
function completeness(){let c=[!!db.school.name,db.days.some(d=>d.active&&d.periods>0),db.sections.length,db.subjects.length,db.teachers.length,db.assignments.length];return Math.round(c.filter(Boolean).length/c.length*100)}
function renderSummary(){if(!$('#summary'))return;let configured=db.teachers.filter(t=>db.teacherRules[t.id]).length;$('#summary').innerHTML=`<div class="cards"><div class="stat">اكتمال البيانات<b>${completeness()}%</b></div><div class="stat">الشعب<b>${db.sections.length}</b></div><div class="stat">المواد<b>${db.subjects.length}</b></div><div class="stat">المدرسون<b>${db.teachers.length}</b></div><div class="stat">قيود مضبوطة<b>${configured}</b></div><div class="stat">حصص مثبتة<b>${db.fixedLessons.length}</b></div></div><div class="progress" style="margin-top:12px"><i style="width:${completeness()}%"></i></div>`}
function render(){nav();renderSummary();({school,days,sections,subjects,teachers,assignments,constraints,fixed,feasibility,generator}[page])()}
function school(){$('#workspace').innerHTML=`<h2>إعداد المدرسة</h2><div class="grid"><div class="field"><label>اسم المدرسة</label><input id="schoolName" value="${esc(db.school.name)}"></div><div class="field"><label>العام الدراسي</label><input id="schoolYear" value="${esc(db.school.year)}"></div></div><div class="actions"><button id="saveSchool">حفظ الإعدادات</button><button class="secondary" id="importBtn">استيراد نسخة احتياطية</button><button class="danger" id="resetBtn">إعادة ضبط المشروع</button></div>`;$('#saveSchool').onclick=()=>{db.school.name=$('#schoolName').value.trim();db.school.year=$('#schoolYear').value.trim();save()};$('#importBtn').onclick=()=>$('#importFile').click();$('#resetBtn').onclick=()=>{if(confirm('سيتم حذف جميع البيانات المحلية. هل أنت متأكد؟')){db=seed();save();render()}}}
function days(){$('#workspace').innerHTML=`<h2>أيام الدوام وعدد الحصص</h2><div class="notice">يمكن أن يختلف عدد الحصص من يوم إلى آخر.</div><table><thead><tr><th>اليوم</th><th>دوام</th><th>عدد الحصص</th></tr></thead><tbody>${db.days.sort((a,b)=>a.order-b.order).map(d=>`<tr><td>${d.name}</td><td><input type="checkbox" data-active="${d.id}" ${d.active?'checked':''}></td><td><input type="number" min="0" max="12" data-periods="${d.id}" value="${d.periods}"></td></tr>`).join('')}</tbody></table>`;document.querySelectorAll('[data-active]').forEach(x=>x.onchange=()=>{db.days.find(d=>d.id===x.dataset.active).active=x.checked;save()});document.querySelectorAll('[data-periods]').forEach(x=>x.onchange=()=>{let d=db.days.find(d=>d.id===x.dataset.periods);d.periods=Math.max(0,+x.value||0);d.active=d.periods>0;save();days()})}
function sections(){let rows=db.sections.slice().sort((a,b)=>(db.stages.find(g=>g.id===a.stageId)?.order||0)-(db.stages.find(g=>g.id===b.stageId)?.order||0)||a.order-b.order);$('#workspace').innerHTML=`<h2>المراحل والشعب</h2><div class="grid"><div class="field"><label>المرحلة</label><select id="stage">${db.stages.sort((a,b)=>a.order-b.order).map(g=>`<option value="${g.id}">${g.name}</option>`).join('')}</select></div><div class="field"><label>اسم الشعبة</label><input id="sectionName" placeholder="مثال: أ"></div></div><div class="actions"><button id="addSection">إضافة شعبة</button></div><table><thead><tr><th>المرحلة</th><th>الشعبة</th><th></th></tr></thead><tbody>${rows.length?rows.map(s=>{let g=db.stages.find(x=>x.id===s.stageId);return `<tr><td><span class="stage-dot" style="background:${g.color}"></span>${g.name}</td><td>${esc(s.name)}</td><td><button class="danger" data-del-section="${s.id}">حذف</button></td></tr>`}).join(''):`<tr><td colspan="3" class="empty">لم تضف شعب بعد</td></tr>`}</tbody></table>`;$('#addSection').onclick=()=>{let name=$('#sectionName').value.trim(),stageId=$('#stage').value;if(!name)return;if(db.sections.some(s=>s.stageId===stageId&&s.name===name))return alert('هذه الشعبة موجودة');let max=Math.max(0,...db.sections.filter(s=>s.stageId===stageId).map(s=>s.order));db.sections.push({id:uid('sec'),stageId,name,order:max+1});save();sections()};document.querySelectorAll('[data-del-section]').forEach(b=>b.onclick=()=>{if(db.assignments.some(a=>a.sectionId===b.dataset.delSection))return alert('لا يمكن حذف شعبة مرتبطة بتكليف');db.sections=db.sections.filter(s=>s.id!==b.dataset.delSection);save();sections()})}
function simpleTable(arr,heads,row,type){return `<table><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}<th></th></tr></thead><tbody>${arr.length?arr.map(x=>`<tr>${row(x).map(c=>`<td>${c}</td>`).join('')}<td><button class="danger" data-del-${type}="${x.id}">حذف</button></td></tr>`).join(''):`<tr><td colspan="${heads.length+1}" class="empty">لا توجد بيانات</td></tr>`}</tbody></table>`}
function delWire(type,collection,rerender,ref){document.querySelectorAll(`[data-del-${type}]`).forEach(b=>b.onclick=()=>{let id=b.dataset['del'+type[0].toUpperCase()+type.slice(1)];if(db.assignments.some(a=>a[ref]===id))return alert('لا يمكن الحذف لأنه مرتبط بتكليف');db[collection]=db[collection].filter(x=>x.id!==id);save();rerender()})}
function subjects(){
  $('#workspace').innerHTML=`<h2>المواد الدراسية</h2><div class="grid"><div class="field"><label>اسم المادة</label><input id="subjectName"></div><div class="field"><label>لون المادة</label><input id="subjectColor" type="color" value="#DCE8F2"></div></div><div class="actions"><button id="addSubject">إضافة مادة</button></div>
  <table><thead><tr><th>الاسم</th><th>اللون</th><th>الإجراءات</th></tr></thead><tbody>${db.subjects.length?db.subjects.map(x=>`<tr><td>${esc(x.name)}</td><td><span class="tag" style="background:${x.color}">${x.color}</span></td><td><button class="secondary" data-edit-sub="${x.id}">تعديل</button> <button class="danger" data-del-sub="${x.id}">حذف</button></td></tr>`).join(''):'<tr><td colspan="3" class="empty">لا توجد مواد</td></tr>'}</tbody></table>`;
  $('#addSubject').onclick=()=>{let name=$('#subjectName').value.trim();if(!name)return;if(db.subjects.some(x=>x.name===name))return alert('المادة موجودة');db.subjects.push({id:uid('sub'),name,color:$('#subjectColor').value});db.timetable=[];save();subjects()};
  document.querySelectorAll('[data-edit-sub]').forEach(b=>b.onclick=()=>{let x=db.subjects.find(v=>v.id===b.dataset.editSub);let name=prompt('اسم المادة',x.name);if(name===null)return;name=name.trim();if(!name)return alert('اسم المادة مطلوب');if(db.subjects.some(v=>v.id!==x.id&&v.name===name))return alert('يوجد مادة بهذا الاسم');let color=prompt('لون المادة بصيغة HEX',x.color);if(color===null)return;x.name=name;if(/^#[0-9a-f]{6}$/i.test(color.trim()))x.color=color.trim();db.timetable=[];save();subjects()});
  document.querySelectorAll('[data-del-sub]').forEach(b=>b.onclick=()=>{if(db.assignments.some(a=>a.subjectId===b.dataset.delSub))return alert('لا يمكن حذف مادة مرتبطة بتكليف');db.subjects=db.subjects.filter(x=>x.id!==b.dataset.delSub);db.timetable=[];save();subjects()});
}
function teachers(){
  $('#workspace').innerHTML=`<h2>المدرسون</h2><div class="grid"><div class="field"><label>الاسم الكامل</label><input id="teacherName"></div><div class="field"><label>التخصص</label><input id="teacherSpec"></div><div class="field"><label>ملاحظات</label><input id="teacherNotes"></div></div><div class="actions"><button id="addTeacher">إضافة مدرس</button></div><h3>إدخال جماعي</h3><div class="notice">كل مدرس في سطر، وافصل الاسم والتخصص والملاحظات بـ Tab أو فاصلة.</div><div class="field"><textarea id="bulkTeachers"></textarea></div><div class="actions"><button id="bulkAdd">إضافة القائمة</button></div>
  <table><thead><tr><th>الاسم</th><th>التخصص</th><th>ملاحظات</th><th>الإجراءات</th></tr></thead><tbody>${db.teachers.length?db.teachers.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.specialty||'')}</td><td>${esc(x.notes||'')}</td><td><button class="secondary" data-edit-tea="${x.id}">تعديل</button> <button class="danger" data-del-tea="${x.id}">حذف</button></td></tr>`).join(''):'<tr><td colspan="4" class="empty">لا يوجد مدرسون</td></tr>'}</tbody></table>`;
  function add(n,s='',no=''){n=n.trim();if(!n||db.teachers.some(t=>t.name===n))return false;db.teachers.push({id:uid('tea'),name:n,specialty:s.trim(),notes:no.trim()});return true}
  $('#addTeacher').onclick=()=>{if(add($('#teacherName').value,$('#teacherSpec').value,$('#teacherNotes').value)){db.timetable=[];save();teachers()}else alert('الاسم فارغ أو مكرر')};
  $('#bulkAdd').onclick=()=>{let n=0;$('#bulkTeachers').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).forEach(line=>{let p=line.includes('\t')?line.split('\t'):line.split(',');if(add(p[0]||'',p[1]||'',p.slice(2).join(' ')))n++});db.timetable=[];save();alert(`تمت إضافة ${n} مدرس`);teachers()};
  document.querySelectorAll('[data-edit-tea]').forEach(b=>b.onclick=()=>{let t=db.teachers.find(x=>x.id===b.dataset.editTea);let name=prompt('الاسم الكامل',t.name);if(name===null)return;name=name.trim();if(!name)return alert('الاسم مطلوب');if(db.teachers.some(x=>x.id!==t.id&&x.name===name))return alert('يوجد مدرس بهذا الاسم');let sp=prompt('التخصص',t.specialty||'');if(sp===null)return;let no=prompt('الملاحظات',t.notes||'');if(no===null)return;t.name=name;t.specialty=sp.trim();t.notes=no.trim();db.timetable=[];save();teachers()});
  document.querySelectorAll('[data-del-tea]').forEach(b=>b.onclick=()=>{if(db.assignments.some(a=>a.teacherId===b.dataset.delTea))return alert('لا يمكن حذف مدرس مرتبط بتكليف');db.teachers=db.teachers.filter(x=>x.id!==b.dataset.delTea);delete db.teacherRules[b.dataset.delTea];db.timetable=[];save();teachers()});
}
function assignments(){
  let opts=db.sections.slice().sort((a,b)=>(db.stages.find(g=>g.id===a.stageId)?.order||0)-(db.stages.find(g=>g.id===b.stageId)?.order||0)||a.order-b.order);
  $('#workspace').innerHTML=`<h2>تكليفات المدرسين</h2><div class="grid"><div class="field"><label>المدرس</label><select id="aTeacher">${db.teachers.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></div><div class="field"><label>المادة</label><select id="aSubject">${db.subjects.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></div><div class="field"><label>الشعبة</label><select id="aSection">${opts.map(s=>{let g=db.stages.find(x=>x.id===s.stageId);return `<option value="${s.id}">${g.name} ${esc(s.name)}</option>`}).join('')}</select></div><div class="field"><label>الحصص الأسبوعية</label><input id="aWeekly" type="number" min="1" max="20" value="4"></div></div><div class="actions"><button id="addAssignment">إضافة تكليف</button></div>
  <table><thead><tr><th>المدرس</th><th>المادة</th><th>الشعبة</th><th>الحصص/أسبوع</th><th>الإجراءات</th></tr></thead><tbody>${db.assignments.length?db.assignments.map(a=>{let t=db.teachers.find(x=>x.id===a.teacherId),su=db.subjects.find(x=>x.id===a.subjectId),se=db.sections.find(x=>x.id===a.sectionId),g=se&&db.stages.find(x=>x.id===se.stageId);return `<tr><td>${esc(t?.name||'—')}</td><td>${esc(su?.name||'—')}</td><td>${g?g.name+' '+esc(se.name):'—'}</td><td>${a.weeklyPeriods}</td><td><button class="secondary" data-edit-a="${a.id}">تعديل</button> <button class="danger" data-del-a="${a.id}">حذف</button></td></tr>`}).join(''):`<tr><td colspan="5" class="empty">لا توجد تكليفات</td></tr>`}</tbody></table>`;
  $('#addAssignment').onclick=()=>{let teacherId=$('#aTeacher').value,subjectId=$('#aSubject').value,sectionId=$('#aSection').value,weeklyPeriods=+$('#aWeekly').value;if(!teacherId||!subjectId||!sectionId||weeklyPeriods<1)return alert('أكمل البيانات');if(db.assignments.some(a=>a.teacherId===teacherId&&a.subjectId===subjectId&&a.sectionId===sectionId))return alert('هذا التكليف موجود');db.assignments.push({id:uid('asg'),teacherId,subjectId,sectionId,weeklyPeriods});db.timetable=[];save();assignments()};
  document.querySelectorAll('[data-edit-a]').forEach(b=>b.onclick=()=>assignmentEditDialog(b.dataset.editA));
  document.querySelectorAll('[data-del-a]').forEach(b=>b.onclick=()=>{db.fixedLessons=db.fixedLessons.filter(x=>x.assignmentId!==b.dataset.delA);db.assignments=db.assignments.filter(a=>a.id!==b.dataset.delA);db.timetable=[];save();assignments()});
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
  const weeklyCapacity=activeDays.reduce((s,d)=>s+d.periods,0);

  if(!db.school.name) push('red','اسم المدرسة غير محدد','أكمل إعداد المدرسة قبل إنشاء الجدول.','SCHOOL_NAME');
  if(!activeDays.length) push('red','لا توجد أيام دوام','فعّل يوماً واحداً على الأقل وحدد عدد حصصه.','NO_DAYS');
  if(!db.sections.length) push('red','لا توجد شعب','أضف الشعب التي سيُنشأ لها الجدول.','NO_SECTIONS');
  if(!db.subjects.length) push('red','لا توجد مواد','أضف المواد الدراسية.','NO_SUBJECTS');
  if(!db.teachers.length) push('red','لا يوجد مدرسون','أضف الكادر التدريسي.','NO_TEACHERS');
  if(!db.assignments.length) push('red','لا توجد تكليفات','أضف تكليفات المدرسين قبل التوليد.','NO_ASSIGNMENTS');

  db.sections.forEach(sec=>{
    const g=db.stages.find(x=>x.id===sec.stageId);
    const assigned=db.assignments.filter(a=>a.sectionId===sec.id).reduce((s,a)=>s+(+a.weeklyPeriods||0),0);
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
  });

  db.fixedLessons.forEach(f=>{
    const a=db.assignments.find(x=>x.id===f.assignmentId),d=db.days.find(x=>x.id===f.dayId);
    if(!a||!d){push('red','حصة مثبتة غير صالحة','الحصة مرتبطة بتكليف أو يوم غير موجود.',`FIX_BROKEN:${f.id}`);return}
    const t=db.teachers.find(x=>x.id===a.teacherId),r=rule(a.teacherId);
    if(!d.active||f.period>d.periods) push('red','حصة مثبتة خارج الدوام',`${t?.name||'مدرس'} — ${d.name} الحصة ${f.period}.`,`FIX_OUT:${f.id}`);
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
function generateTimetable(){
  const blockers=analyzeFeasibility().filter(x=>x.level==='red');
  if(blockers.length) return {ok:false,message:`يوجد ${blockers.length} خطأ مانع. عالجها من فحص الجدوى أولاً.`};

  const slots=[];
  db.days.filter(d=>d.active&&d.periods>0).sort((a,b)=>a.order-b.order).forEach(d=>{
    for(let p=1;p<=d.periods;p++)slots.push({dayId:d.id,period:p,dayOrder:d.order});
  });
  const entries=[],teacherBusy=new Set(),sectionBusy=new Set(),asgCount={},asgDays={};
  db.assignments.forEach(a=>{asgCount[a.id]=0;asgDays[a.id]={}});

  function canPlace(a,sl){
    const r=rule(a.teacherId),k=slotKey(sl.dayId,sl.period);
    if((r.unavailable[sl.dayId]||[]).includes(sl.period))return false;
    if(teacherBusy.has(a.teacherId+'|'+k)||sectionBusy.has(a.sectionId+'|'+k))return false;
    const daily=entries.filter(e=>e.teacherId===a.teacherId&&e.dayId===sl.dayId).length;
    if(daily>=Math.max(1,+r.maxDaily||99))return false;
    return true;
  }
  function place(a,sl,locked=false){
    const k=slotKey(sl.dayId,sl.period);
    entries.push({id:uid('ent'),assignmentId:a.id,teacherId:a.teacherId,subjectId:a.subjectId,sectionId:a.sectionId,dayId:sl.dayId,period:sl.period,locked});
    teacherBusy.add(a.teacherId+'|'+k);sectionBusy.add(a.sectionId+'|'+k);
    asgCount[a.id]++;asgDays[a.id][sl.dayId]=(asgDays[a.id][sl.dayId]||0)+1;
  }
  // fixed first
  for(const f of db.fixedLessons){
    const a=db.assignments.find(x=>x.id===f.assignmentId),d=db.days.find(x=>x.id===f.dayId);
    if(!a||!d)return {ok:false,message:'توجد حصة مثبتة غير صالحة.'};
    const sl={dayId:f.dayId,period:f.period,dayOrder:d.order};
    if(!canPlace(a,sl))return {ok:false,message:'تعذر تطبيق إحدى الحصص المثبتة بسبب تعارض أو قيد.'};
    place(a,sl,true);
  }

  // remaining lesson units, hardest first
  let units=[];
  db.assignments.forEach(a=>{
    for(let i=asgCount[a.id];i<a.weeklyPeriods;i++)units.push(a);
  });
  const possibleCount=a=>slots.filter(sl=>canPlace(a,sl)).length;
  units.sort((a,b)=>possibleCount(a)-possibleCount(b));

  function score(a,sl){
    const r=rule(a.teacherId); let s=0;
    const sameDay=asgDays[a.id][sl.dayId]||0;
    if(sameDay)s+=1000*sameDay; // strongly avoid repeated subject/section same day
    if(r.preferred.includes(sl.period))s-=35;
    if(r.avoid.includes(sl.period))s+=35;
    const teacherDay=entries.filter(e=>e.teacherId===a.teacherId&&e.dayId===sl.dayId);
    if(teacherDay.length){
      const adjacent=teacherDay.some(e=>Math.abs(e.period-sl.period)===1);
      if(r.consecutive==='prefer'&&adjacent)s-=20;
      if(r.consecutive==='avoid'&&adjacent)s+=20;
      const ps=teacherDay.map(e=>e.period).concat(sl.period).sort((x,y)=>x-y);
      s+=(Math.max(...ps)-Math.min(...ps)+1-ps.length)*12; // gaps
    }
    s+=teacherDay.length*4; // load spreading
    s+=sl.period*.2;
    return s;
  }

  let nodes=0,limit=180000;
  function solve(idx){
    if(idx>=units.length)return true;
    if(++nodes>limit)return false;
    // dynamic MRV: choose remaining unit with fewest candidates
    let best=idx,bestC=null;
    for(let i=idx;i<units.length;i++){
      const a=units[i],c=slots.filter(sl=>canPlace(a,sl));
      if(!bestC||c.length<bestC.length){best=i;bestC=c;if(c.length===0)break}
    }
    [units[idx],units[best]]=[units[best],units[idx]];
    const a=units[idx],cands=(best===idx&&bestC?bestC:slots.filter(sl=>canPlace(a,sl))).sort((x,y)=>score(a,x)-score(a,y));
    for(const sl of cands){
      place(a,sl,false);
      if(solve(idx+1))return true;
      const e=entries.pop(),k=slotKey(e.dayId,e.period);
      teacherBusy.delete(a.teacherId+'|'+k);sectionBusy.delete(a.sectionId+'|'+k);
      asgCount[a.id]--;asgDays[a.id][sl.dayId]--; if(!asgDays[a.id][sl.dayId])delete asgDays[a.id][sl.dayId];
    }
    [units[idx],units[best]]=[units[best],units[idx]];
    return false;
  }
  const ok=solve(0);
  if(!ok)return {ok:false,message:nodes>limit?'لم يصل المحرك إلى حل ضمن حد البحث. جرّب تخفيف القيود أو راجع فحص الجدوى.':'تعذر إيجاد جدول يحقق جميع القيود الحالية.'};
  db.timetable=entries;save();
  return {ok:true,message:`تم إنشاء ${entries.length} حصة بنجاح.`,nodes};
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
      rows+=`<tr><th>${p===1?d.name:''}</th><th>الحصة ${p}</th>`+secs.map(sec=>{
        const e=db.timetable.find(x=>x.sectionId===sec.id&&x.dayId===d.id&&x.period===p);
        if(!e)return '<td class="tt-empty">—</td>';
        const su=db.subjects.find(x=>x.id===e.subjectId),t=db.teachers.find(x=>x.id===e.teacherId);
        return `<td class="lesson" style="background:${su?.color||'#eef4fa'}"><b>${esc(su?.name||'—')}</b><small>${esc(teacherShort(t?.name))}${e.locked?' 🔒':''}</small></td>`;
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
  ${timetableTable()}`;
  $('#checkBtn').onclick=()=>{page='feasibility';render()};
  if($('#generateBtn'))$('#generateBtn').onclick=()=>{
    if(db.timetable.length&&!confirm('سيتم استبدال الجدول الحالي. هل تريد المتابعة؟'))return;
    const b=$('#generateBtn');b.disabled=true;b.textContent='جاري التوليد...';
    setTimeout(()=>{const r=generateTimetable();alert(r.message);generator()},30);
  };
  if($('#clearTT'))$('#clearTT').onclick=()=>{if(confirm('مسح الجدول المولد؟')){db.timetable=[];save();generator()}};
}

$('#exportBtn').onclick=()=>{let blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='school-timetable-v0.5-backup.json';a.click();URL.revokeObjectURL(a.href)};
$('#importFile').onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{try{db=migrate(JSON.parse(r.result));save();render();alert('تم الاستيراد بنجاح')}catch{alert('ملف غير صالح')}};r.readAsText(f)};
render();
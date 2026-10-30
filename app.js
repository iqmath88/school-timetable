const APP_VERSION='0.9.35.0-stable';
const KEY='school-timetable-v01';
const stageDefaults=[['الأول',1,'#587B9B'],['الثاني',2,'#6F8F72'],['الثالث',3,'#9A7B60'],['الرابع',4,'#7D7398'],['الخامس',5,'#A16F78'],['السادس',6,'#557F83']];
const defaultDays=[['الأحد',7,true],['الاثنين',7,true],['الثلاثاء',6,true],['الأربعاء',7,true],['الخميس',5,true],['الجمعة',0,false],['السبت',0,false]];
const seed=()=>({version:APP_VERSION,school:{name:'',year:'2026-2027',type:'secondary'},days:defaultDays.map((x,i)=>({id:'d'+i,name:x[0],periods:x[1],active:x[2],order:i+1})),stages:stageDefaults.map(x=>({id:'g'+x[1],name:x[0],order:x[1],color:x[2]})),sections:[],subjects:[],teachers:[],assignments:[],teacherRules:{},fixedLessons:[],timetable:[],manualHistory:[],stageLoads:{},stageDayPeriods:{},subjectRules:{},advancedRules:[],printSettings:{title:'جدول الحصص الأسبوعية',startDate:'',changeReasons:'',footer:'',showColors:true,printMode:'color',theme:'formal',logo:'',logoPosition:'center',showTeachers:true,showNotes:true,showSignatures:true,density:'compact',signature1:'منظّم الجدول',signature2:'معاون المدير',signature3:'مدير المدرسة'}});
function migrate(x){x=x||seed();for(const k of ['days','stages','sections','subjects','teachers','assignments','fixedLessons','timetable','advancedRules'])if(x[k]!==undefined&&!Array.isArray(x[k]))throw Error('بنية غير صالحة: '+k);const okColor=c=>/^#[0-9a-f]{3,8}$/i.test(String(c||''));(x.stages||[]).forEach(g=>{g.name=String(g.name??'');if(!okColor(g.color))g.color='#587B9B'});(x.subjects||[]).forEach(u=>{u.name=String(u.name??'');if(!okColor(u.color))u.color='#F3EBDD'});(x.days||[]).forEach(d=>{d.name=String(d.name??'')});x.school=x.school||{};if(!['primary','secondary','middle','preparatory'].includes(x.school.type))x.school.type='secondary';x.version=APP_VERSION;x.teacherRules=x.teacherRules||{};x.fixedLessons=x.fixedLessons||[];x.timetable=x.timetable||[];x.stageLoads=x.stageLoads||{};x.stageDayPeriods=x.stageDayPeriods||{};x.subjectRules=x.subjectRules||{};x.advancedRules=x.advancedRules||[];x.printSettings={title:'جدول الحصص الأسبوعية',startDate:'',changeReasons:'',footer:'',showColors:true,printMode:'color',theme:'formal',logo:'',logoPosition:'center',showTeachers:true,showNotes:true,showSignatures:true,density:'compact',signature1:'منظّم الجدول',signature2:'معاون المدير',signature3:'مدير المدرسة',...(x.printSettings||{})};if(x.printSettings.logo&&!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+\/=]+$/.test(x.printSettings.logo))x.printSettings.logo='';x.manualHistory=x.manualHistory||[];x.teachers=x.teachers||[];x.assignments=x.assignments||[];enforceStatusBlocked(x);return x}
function load(){try{return migrate(JSON.parse(MStore.getItem(KEY)))}catch{return seed()}}
let db=load(),page='school';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),uid=p=>p+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function syncStatusFromRules(tid,d){
 /* قيود المدرس ← حالته: لمن حالته مفرّغ/متعاقد، يوم التدريس هو أي يوم فيه حصة متاحة واحدة على الأقل، واليوم المحجوب كلياً ليس يوم تدريس.
    تُستدعى بعد أي تعديل لقيود المدرس فتتحدث الحالة وأيام التدريس تلقائياً. (والاتجاه المعاكس: enforceStatusBlocked). */
 d=d||db;const s=(d.teacherStatus||{})[tid],r=(d.teacherRules||{})[tid];if(!s||!r||!s.type||s.type==='regular')return '';
 r.unavailable=r.unavailable||{};const act=d.days.filter(x=>x.active&&x.periods>0),was=new Set(s.days||[]),teach=[],blocked=[];
 for(const day of act){const un=new Set((r.unavailable[day.id]||[]).map(Number));let all=true;for(let p=1;p<=day.periods;p++)if(!un.has(p)){all=false;break}(all?blocked:teach).push(day.id)}
 s.days=[...(s.days||[]).filter(x=>!act.some(y=>y.id===x)),...teach];r.statusBlocked=blocked;
 const nm=id=>(d.days.find(x=>x.id===id)||{}).name||id;const added=teach.filter(x=>!was.has(x)),removed=[...was].filter(x=>act.some(y=>y.id===x)&&!teach.includes(x));
 const who=((d.teachers||[]).find(t=>t.id===tid)||{}).name||'المدرس',st={released:'مفرّغ',contract:'متعاقد'}[s.type]||s.type;
 const out=[];if(added.length)out.push('أُضيف '+added.map(nm).join('، ')+' إلى أيام تدريس '+who+' ('+st+')');if(removed.length)out.push('أُزيل '+removed.map(nm).join('، ')+' من أيام تدريس '+who+' ('+st+')');
 return out.join(' · ')}
function enforceStatusBlocked(d){
 /* حالة المدرس (مفرّغ/متعاقد + أيام التدريس) تُترجم إلى «عدم إتاحة». إن ضاعت الترجمة (بتعديل لاحق للقيود) تُستعاد هنا، فلا يُوضع مدرس في يوم لا يدرّس فيه. */
 let n=0;try{const rules=d&&d.teacherRules;if(!rules)return 0;const act=new Map((d.days||[]).filter(x=>x.active&&x.periods>0).map(x=>[x.id,x.periods]));
  for(const t of Object.keys(rules)){const r=rules[t];if(!r||!Array.isArray(r.statusBlocked)||!r.statusBlocked.length)continue;r.unavailable=r.unavailable||{};
   for(const day of r.statusBlocked){const per=act.get(day);if(!per)continue;const cur=new Set((r.unavailable[day]||[]).map(Number));let miss=false;for(let p=1;p<=per;p++)if(!cur.has(p)){cur.add(p);miss=true}
    if(miss){r.unavailable[day]=[...cur].sort((a,b)=>a-b);n++}}}}catch(e){}
 return n}
function save(){try{enforceStatusBlocked(db);MStore.setItem(KEY,JSON.stringify(db));const w=readWorkspaces();if(w.items.length>1){const active=w.items.find(x=>x.id===w.active);if(active){active.data=structuredClone(db);if(!writeWorkspaces(w))return false}}renderSummary();return true}catch(err){alert('فشل حفظ بيانات المدرسة على الجهاز. صدّر نسخة احتياطية الآن؛ لا تعتمد على استمرار هذه الجلسة.');return false}}
// Every change that makes the generated timetable invalid goes through here: confirm, keep a recovery copy, then clear.
async function invalidateTimetable(reason){if(!Array.isArray(db.timetable)||!db.timetable.length)return true;if(!(await masarConfirm('هذا التغيير سيمسح الجدول المولد ('+db.timetable.length+' حصة) ويلزم إعادة التوليد.\nسيُحفظ نسخة استرجاع قبل المسح. هل تريد المتابعة؟')))return false;if(!preserveTimetable(reason))return false;db.timetable=[];db.manualHistory=[];return true}
// Keep a recoverable copy before every operation that could discard a generated timetable.
const RECOVERY_KEY=KEY+'-recovery';
function preserveTimetable(reason){
 if(!db)return true;
 try{MStore.setItem(RECOVERY_KEY,JSON.stringify({savedAt:new Date().toISOString(),reason,data:db}));if(!snapshotState('تلقائية: '+reason,'before-change'))return false;return true}
 catch(err){alert('تعذر حفظ نسخة الاسترجاع. صدّر نسخة احتياطية قبل المتابعة.');return false}
}
function downloadRecovery(){
 const raw=MStore.getItem(RECOVERY_KEY);if(!raw)return alert('لا توجد نسخة استرجاع محفوظة على هذا الجهاز.');
 const obj=JSON.parse(raw),blob=new Blob([JSON.stringify(obj.data,null,2)],{type:'application/json'}),a=document.createElement('a');
 a.href=URL.createObjectURL(blob);a.download='masar-recovery-'+(obj.savedAt||'').slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}


// Data protection is deliberately local and opt-in; exported JSON is the durable backup.
const BACKUP_DATE_KEY=KEY+'-last-external-backup';
const BACKUP_SNOOZE_KEY=KEY+'-backup-reminder-dismissed';
function downloadJsonData(data,filename){
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
}
function exportSafeBackup(){
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 downloadJsonData(db,'masar-backup-'+stamp+'.json');
 try{MStore.setItem(BACKUP_DATE_KEY,new Date().toISOString());MStore.removeItem(BACKUP_SNOOZE_KEY)}catch(e){}
 if(page==='schoolSettings')schoolSettings();
}
function backupIsDue(){
 if(!db.sections.length&&!db.teachers.length&&!db.assignments.length)return false;
 let last;try{last=MStore.getItem(BACKUP_DATE_KEY)}catch(e){}
 return !last||Date.now()-new Date(last).getTime()>7*86400000;
}
function backupReminder(){
 if(!backupIsDue()||document.getElementById('masar-backup-reminder'))return;
 try{if(Date.now()-new Date(MStore.getItem(BACKUP_SNOOZE_KEY)).getTime()<86400000)return}catch(e){}
 const n=document.createElement('div');n.id='masar-backup-reminder';n.className='backup-reminder';
 n.setAttribute('role','status');n.innerHTML='<div><strong>حماية بيانات المدرسة</strong><p>مرّ وقت على آخر تصدير احتياطي، أو لم يُصدّر ملف بعد. احتفظ بنسخة خارج المتصفح.</p></div><div class="backup-reminder-actions"><button type="button" id="backupReminderExport">تصدير نسخة الآن</button><button type="button" class="secondary" id="backupReminderLater">تذكيري غداً</button></div>';
 document.body.appendChild(n);
 n.querySelector('#backupReminderExport').onclick=()=>{exportSafeBackup();n.remove()};
 n.querySelector('#backupReminderLater').onclick=()=>{try{MStore.setItem(BACKUP_SNOOZE_KEY,new Date().toISOString())}catch(e){}n.remove()};
}
async function requestPersistentStorage(){
 const status=document.getElementById('storageProtectionStatus');
 if(!navigator.storage||!navigator.storage.persist){if(status)status.textContent='المتصفح لا يدعم طلب التخزين الدائم.';return}
 try{
  const granted=await navigator.storage.persist();
  if(status)status.textContent=granted?'وافق المتصفح على حماية التخزين من التنظيف التلقائي. لا تزال النسخة الخارجية ضرورية.':'لم يمنح المتصفح التخزين الدائم. احفظ نسخة احتياطية خارج الجهاز.';
 }catch(e){if(status)status.textContent='تعذر طلب التخزين الدائم: '+String(e)}
}
async function showStorageProtection(){
 const status=document.getElementById('storageProtectionStatus');if(!status)return;
 try{const persistent=await navigator.storage?.persisted?.();status.textContent=persistent?'التخزين الدائم: مفعّل (لا يحمي من حذف بيانات Safari).':'التخزين الدائم: غير مؤكد. اطلبه بالزر إذا كان مدعوماً.'}
 catch(e){status.textContent='لا يمكن تحديد حالة التخزين على هذا المتصفح.'}
}

// v0.9.15.8: independent local snapshots of the full school state.
const SNAPSHOT_KEY=KEY+'-timetable-versions-v1';
const SNAPSHOT_LIMIT=8;
function readVersions(){
 try{const value=JSON.parse(MStore.getItem(SNAPSHOT_KEY)||'[]');return Array.isArray(value)?value.filter(v=>v&&v.id&&v.data&&Array.isArray(v.data.timetable)):[]}
 catch(e){return []}
}
function snapshotState(label,reason='manual'){
 const current=readVersions(),record={
  id:uid('version'),label:String(label||'نسخة جدول').slice(0,100),
  createdAt:new Date().toISOString(),reason,lessonCount:db.timetable.length,
  data:(()=>{const c=structuredClone(db);if(c.printSettings)c.printSettings.logo='';return c})()
 };
 const next=[record,...current].slice(0,SNAPSHOT_LIMIT);
 try{MStore.setItem(SNAPSHOT_KEY,JSON.stringify(next));return true}
 catch(e){alert('تعذر حفظ نسخة الجدول: مساحة التخزين المحلية غير كافية. صدّر نسخة JSON إلى الملفات قبل المتابعة.');return false}
}
function timetableVersionDiff(a,b){
 const key=x=>String(x.assignmentId||'')+'|'+String(x.sectionId||'')+'|'+String(x.teacherId||'')+'|'+String(x.subjectId||'');
 const group=arr=>{const map=new Map();for(const e of arr){const k=key(e);if(!map.has(k))map.set(k,[]);map.get(k).push(String(e.dayId)+'#'+e.period)}
  for(const v of map.values())v.sort();return map};
 const old=group(a),now=group(b);let removed=0,added=0,changed=0;
 for(const k of new Set([...old.keys(),...now.keys()])){
  const left=old.get(k)||[],right=now.get(k)||[];
  const l=new Map(),r=new Map();for(const x of left)l.set(x,(l.get(x)||0)+1);for(const x of right)r.set(x,(r.get(x)||0)+1);
  let common=0;for(const [x,n] of l)common+=Math.min(n,r.get(x)||0);
  const oldOnly=left.length-common,newOnly=right.length-common;
  changed+=Math.min(oldOnly,newOnly);removed+=Math.max(0,oldOnly-newOnly);added+=Math.max(0,newOnly-oldOnly);
 }
 return {changed,removed,added};
}
// Named independent workspaces; the active workspace remains in the original KEY for compatibility.
const WORKSPACE_KEY=KEY+'-workspaces-v1';
function readWorkspaces(){try{const v=JSON.parse(MStore.getItem(WORKSPACE_KEY)||'null');return v&&Array.isArray(v.items)?v:{active:'main',items:[{id:'main',label:'الجدول الأساسي',data:null}]}}catch{return {active:'main',items:[{id:'main',label:'الجدول الأساسي',data:null}]}}}
function writeWorkspaces(v){try{MStore.setItem(WORKSPACE_KEY,JSON.stringify(v));return true}catch(e){alert('تعذر حفظ مساحة العمل. قد تكون مساحة Safari ممتلئة؛ صدّر نسخة JSON أولاً.');return false}}
function workspaceUI(){const v=readWorkspaces();return `<section class="backup-protection glass-surface" id="workspacesPanel"><h3>مساحات عمل الجداول المستقلة</h3><p>أنشئ نسخة تجريبية مستقلة، وغيّر حصصها وتكليفاتها دون تعديل النسخة الأصلية. التبديل يحفظ الحالية أولاً؛ يُنصح بتصدير نسخ JSON خارج Safari.</p><div class="actions"><button type="button" id="duplicateWorkspace">إنشاء نسخة من الجدول الحالي</button><button type="button" class="secondary" id="saveWorkspaceNow">حفظ مساحة العمل الحالية</button></div><div class="versions-list">${v.items.map(w=>`<article class="version-item"><strong>${esc(w.label)}</strong> ${w.id===v.active?'— النشطة':''}<small> · ${w.id===v.active?db.timetable.length:(w.data?.timetable?.length||0)} حصة</small><div class="actions">${w.id!==v.active?`<button class="secondary" data-switch-workspace="${esc(w.id)}">فتح النسخة</button>`:''}<button class="secondary" data-export-workspace="${esc(w.id)}">تصدير JSON</button>${w.id!=='main'&&w.id!==v.active?`<button class="danger" data-delete-workspace="${esc(w.id)}">حذف</button>`:''}</div></article>`).join('')}</div></section>`}
function wireWorkspaces(){const create=document.getElementById('duplicateWorkspace');if(!create)return;
 create.onclick=async ()=>{const label=(await masarPrompt('اسم نسخة العمل الجديدة','نسخة تجريبية'));if(label===null)return;const v=readWorkspaces();if(v.items.length>=5)return alert('الحد الحالي خمس مساحات عمل؛ صدّر نسخة قبل حذف غير الضروري.');const id=uid('workspace');const next=structuredClone(v);next.items.find(w=>w.id===next.active).data=structuredClone(db);next.items.push({id,label:label.trim().slice(0,80)||'نسخة جديدة',data:structuredClone(db)});next.active=id;if(!writeWorkspaces(next))return;schoolSettings();alert('تم إنشاء نسخة مستقلة وتفعيلها. عدّل خطة الحصص في هذه النسخة فقط.');};
 document.getElementById('saveWorkspaceNow').onclick=()=>{const v=readWorkspaces();v.items.find(w=>w.id===v.active).data=structuredClone(db);if(writeWorkspaces(v))alert('حُفظت مساحة العمل الحالية.')};
 document.querySelectorAll('[data-switch-workspace]').forEach(b=>b.onclick=async ()=>{const v=readWorkspaces(),target=v.items.find(w=>w.id===b.dataset.switchWorkspace);if(!target?.data)return alert('لا توجد بيانات محفوظة لهذه النسخة.');if(!(await masarConfirm('سيتم حفظ النسخة الحالية ثم فتح «'+target.label+'». متابعة؟')))return;const previous=structuredClone(db);v.items.find(w=>w.id===v.active).data=previous;const next=migrate(structuredClone(target.data));const old=db;db=next;if(!save()){db=old;return}v.active=target.id;if(!writeWorkspaces(v)){db=old;save();return}render();alert('تم فتح «'+target.label+'».')});
 document.querySelectorAll('[data-export-workspace]').forEach(b=>b.onclick=()=>{const v=readWorkspaces(),w=v.items.find(x=>x.id===b.dataset.exportWorkspace);if(w)downloadJsonData(w.id===v.active?db:w.data,'masar-workspace-'+w.id+'.json')});
 document.querySelectorAll('[data-delete-workspace]').forEach(b=>b.onclick=async ()=>{const v=readWorkspaces(),w=v.items.find(x=>x.id===b.dataset.deleteWorkspace);if(!w||!(await masarConfirm('حذف نسخة «'+w.label+'» من هذا الجهاز؟')))return;v.items=v.items.filter(x=>x.id!==w.id);if(writeWorkspaces(v))schoolSettings()});
}
function versionsUI(){
 const versions=readVersions();
 return `<section class="backup-protection glass-surface" id="versionsPanel"><h3>نسخ الجداول والمقارنة</h3><p>احفظ نسخاً مسماة من بيانات المدرسة والجدول، وقارنها ثم استعد أي نسخة بعد تأكيدك. النسخ المحلية محدودة بثمانٍ؛ صدّر المهم منها إلى ملف خارج المتصفح.</p>
 <div class="actions"><button type="button" id="createVersion">حفظ نسخة جديدة</button><button type="button" class="secondary" id="exportVersionHistory">تصدير سجل النسخ JSON</button></div>
 <div class="versions-list">${versions.length?versions.map(v=>`<article class="version-item" data-version="${esc(v.id)}"><div class="version-title"><strong>${esc(v.label)}</strong><small>${esc(new Date(v.createdAt).toLocaleString('ar-IQ'))} · ${v.lessonCount} حصة</small></div><div class="actions"><button type="button" class="secondary version-compare">مقارنة بالحالي</button><button type="button" class="secondary version-export">تصدير النسخة</button><button type="button" class="version-restore">استعادة</button><button type="button" class="danger version-delete">حذف</button></div><div class="version-diff" aria-live="polite"></div></article>`).join(''):'<p>لا توجد نسخ محفوظة بعد.</p>'}</div></section>`;
}
function wireVersions(){
 const create=document.getElementById('createVersion');
 if(!create)return;
 create.onclick=async ()=>{const name=(await masarPrompt('اسم النسخة (مثلاً: جدول معتمد قبل التعديل)',`جدول ${new Date().toLocaleDateString('ar-IQ')}`));if(name===null)return;if(snapshotState(name))schoolSettings()};
 document.getElementById('exportVersionHistory').onclick=()=>{
  const list=readVersions();if(!list.length)return alert('لا توجد نسخ محفوظة.');
  downloadJsonData({type:'masar-version-history',version:1,exportedAt:new Date().toISOString(),versions:list},'masar-timetable-versions-'+new Date().toISOString().slice(0,10)+'.json');
 };
 document.querySelectorAll('.version-item[data-version]').forEach(row=>{
  const id=row.dataset.version;
  const get=()=>readVersions().find(v=>v.id===id);
  row.querySelector('.version-compare').onclick=()=>{
   const v=get();if(!v)return;
   const diff=timetableVersionDiff(v.data.timetable||[],db.timetable||[]);
   const configurationChanged=JSON.stringify([v.data.assignments,v.data.teacherRules,v.data.days,v.data.stageDayPeriods,v.data.advancedRules,v.data.fixedLessons])!==JSON.stringify([db.assignments,db.teacherRules,db.days,db.stageDayPeriods,db.advancedRules,db.fixedLessons]);
   row.querySelector('.version-diff').textContent=`النسخة: ${v.lessonCount} حصة، الحالي: ${db.timetable.length} حصة. حصص تغيّر موعدها: ${diff.changed}، أضيفت: ${diff.added}، حُذفت: ${diff.removed}. ${configurationChanged?'تنبيه: تغيّرت التكليفات أو القيود أو الأيام أيضاً.':'التكليفات والقيود الأساسية متطابقة.'}`;
  };
  row.querySelector('.version-export').onclick=()=>{const v=get();if(v)downloadJsonData(v.data,'masar-version-'+v.createdAt.slice(0,10)+'-'+v.id+'.json')};
  row.querySelector('.version-restore').onclick=async ()=>{
   const v=get();if(!v)return;
   if(!(await masarConfirm(`استعادة "${v.label}"؟ ستستبدل جميع بيانات المدرسة الحالية، وليس الجدول فقط. سنحفظ نسخة من الوضع الحالي قبل الاستعادة.`)))return;
   if(!snapshotState('قبل استعادة '+v.label,'before-restore'))return;
   const previous=db;
   try{db=migrate(structuredClone(v.data));if(!db.printSettings.logo&&previous&&previous.printSettings)db.printSettings.logo=previous.printSettings.logo||'';if(!save()){db=previous;return}schoolSettings();alert('تمت الاستعادة. يُنصح بتصدير نسخة احتياطية خارج المتصفح.')}
   catch(e){db=previous;alert('تعذرت الاستعادة: '+String(e))}
  };
  row.querySelector('.version-delete').onclick=async ()=>{
   const v=get();if(!v||!(await masarConfirm('حذف النسخة "'+v.label+'" نهائياً من هذا المتصفح؟')))return;
   try{MStore.setItem(SNAPSHOT_KEY,JSON.stringify(readVersions().filter(x=>x.id!==id)));schoolSettings()}
   catch(e){alert('تعذر حذف النسخة: '+String(e))}
  };
 });
}

function backupProtectionUI(){
 const last=(()=>{try{return MStore.getItem(BACKUP_DATE_KEY)}catch(e){return null}})();
 return `<section class="backup-protection glass-surface"><h3>حماية بيانات المدرسة</h3><p>يُحفظ العمل في هذا المتصفح. حذف بيانات Safari أو تبديل الجهاز قد يفقد النسخة المحلية؛ احفظ ملف JSON خارج الجهاز بانتظام.</p><p><strong>آخر تصدير بدأ من التطبيق:</strong> ${last?esc(new Date(last).toLocaleString('ar-IQ')):'لا يوجد تصدير مسجل'}</p><p class="backup-disclaimer">التاريخ يعني بدء تنزيل الملف، وليس تأكيد حفظه في «الملفات» أو iCloud.</p><div class="actions"><button type="button" id="backupNow">تصدير نسخة مؤرخة</button><button type="button" class="secondary" id="storagePersist">طلب تخزين دائم</button></div><p id="storageProtectionStatus" role="status"></p></section>`;
}
function wireBackupProtection(){
 const b=document.getElementById('backupNow');if(b)b.onclick=exportSafeBackup;
 const p=document.getElementById('storagePersist');if(p)p.onclick=requestPersistentStorage;
 showStorageProtection();
}

const pages=[['school','لوحة التحكم'],['liveBoard','الدوام اليومي والشواغر'],['schoolSettings','إعدادات المدرسة'],['days','2. الأيام والحصص'],['sections','3. المراحل والشعب'],['subjects','4. المواد'],['teachers','5. المدرسون'],['loads','6. حصص المراحل'],['assignments','7. إدارة التكليفات'],['audit','8. تدقيق التكليفات'],['matrix','مصفوفة الحصص'],['constraints','9. قيود المدرسين'],['advanced','10. القيود المتقدمة'],['fixed','11. الحصص المثبتة'],['feasibility','12. فحص الجدوى'],['generator','13. توليد الجدول'],['workspaceTT','14. مساحة عمل الجدول'],['gapDiagnosis','15. تشخيص الفراغات'],['printSetup','16. التصميم والطباعة']];
const navigationGroups=[
 ['الإعداد الأساسي',['school','schoolSettings','days','sections','subjects','loads']],
 ['إدارة الدوام اليومي',['liveBoard']],
 ['المدرسون والتكليفات',['teachers','assignments','matrix','audit']],
 ['القيود',['constraints','advanced','fixed']],
 ['التوليد والتشخيص',['feasibility','generator','gapDiagnosis']],
 ['الجداول والطباعة',['workspaceTT','printSetup']]
];
const glassIcons={school:'✧',liveBoard:'◷',schoolSettings:'⚙',days:'◷',sections:'▦',subjects:'◈',loads:'▤',teachers:'♙',assignments:'⇄',matrix:'▦',audit:'✓',constraints:'⛭',advanced:'◇',fixed:'♧',feasibility:'◎',generator:'✦',gapDiagnosis:'⌕',workspaceTT:'▦',printSetup:'▧'};
function closeMobileMenu(){document.body.classList.remove('sidebar-open');const toggle=document.getElementById('menuToggle'),shade=document.getElementById('sidebarBackdrop');if(toggle)toggle.setAttribute('aria-expanded','false');if(shade)shade.hidden=true}
const NAV_GROUP_KEY='masar-nav-group-v1';
let navOpenGroup=(()=>{try{return Math.max(0,Math.min(navigationGroups.length-1,Number(sessionStorage.getItem(NAV_GROUP_KEY))||0))}catch(e){return 0}})();
function glassSidebar(){const side=document.getElementById('sideNavigation');if(!side)return;
 const currentGroup=navigationGroups.findIndex(g=>g[1].includes(page));
 if(currentGroup>=0&&navOpenGroup===-2)navOpenGroup=currentGroup;
 side.innerHTML=navigationGroups.map((group,i)=>{const open=navOpenGroup===i;const active=group[1].includes(page);return `<div class="side-group ${open?'group-open':''}"><button type="button" class="side-group-trigger ${active?'group-active':''}" data-nav-group="${i}" aria-expanded="${open}" aria-controls="nav-group-${i}" title="${group[0]}"><span class="glass-icon group-symbol" aria-hidden="true">${['✧','◷','♙','⛭','✦','▤'][i]||'•'}</span><span class="group-label">${group[0]}</span><span class="group-chevron" aria-hidden="true">${open?'⌄':'‹'}</span></button><div class="side-group-items" id="nav-group-${i}" ${open?'':'hidden'}>${group[1].map(id=>{const item=pages.find(p=>p[0]===id);const label=item[1].replace(/^\d+\.\s*/, '');return `<button type="button" title="${label}" aria-label="${label}" class="side-link ${page===id?'selected':''}" data-side-page="${id}" ${page===id?'aria-current="page"':''}><span class="glass-icon side-icon" aria-hidden="true">${glassIcons[id]||'◇'}</span><span>${label}</span>${page===id?'<span class="side-active-dot"></span>':''}</button>`}).join('')}</div></div>`}).join('');
 side.querySelectorAll('[data-nav-group]').forEach(btn=>btn.onclick=()=>{const i=+btn.dataset.navGroup;navOpenGroup=navOpenGroup===i?-1:i;try{sessionStorage.setItem(NAV_GROUP_KEY,String(navOpenGroup))}catch(e){};glassSidebar()});
 side.querySelectorAll('[data-side-page]').forEach(btn=>btn.onclick=()=>{page=btn.dataset.sidePage;closeMobileMenu();render();window.scrollTo({top:0,behavior:'smooth'})});
 const toggle=document.getElementById('menuToggle'),shade=document.getElementById('sidebarBackdrop');if(toggle&&!toggle.dataset.bound){toggle.dataset.bound='1';toggle.onclick=()=>{const open=!document.body.classList.contains('sidebar-open');document.body.classList.toggle('sidebar-open',open);toggle.setAttribute('aria-expanded',String(open));if(shade)shade.hidden=!open}}if(shade&&!shade.dataset.bound){shade.dataset.bound='1';shade.onclick=closeMobileMenu}
}

let navLastPage=null;
function nav(){
 const activeGroup=navigationGroups.findIndex(g=>g[1].includes(page));
 if(navLastPage!==page&&activeGroup>=0){navOpenGroup=activeGroup;navLastPage=page;}
 glassSidebar();
 const group=navigationGroups.find(g=>g[1].includes(page))||navigationGroups[0];
 const selector=document.getElementById('sectionSelector');
 if(selector){selector.innerHTML=navigationGroups.map((g,i)=>`<option value="${i}" ${g===group?'selected':''}>${g[0]}</option>`).join('');selector.onchange=()=>{page=navigationGroups[+selector.value][1][0];render()}}
 $('#steps').innerHTML=group[1].map(id=>{const item=pages.find(x=>x[0]===id);return `<button class="step ${page===id?'active':''}" data-p="${id}" aria-current="${page===id?'page':'false'}">${item[1].replace(/^\d+\.\s*/, '')}</button>`}).join('');
 document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{page=b.dataset.p;render()});
 const current=document.getElementById('currentPage');if(current)current.textContent=(pages.find(x=>x[0]===page)||[])[1]?.replace(/^\d+\.\s*/, '')||'';
}

function completeness(){let c=[!!db.school.name,db.days.some(d=>d.active&&d.periods>0),db.sections.length,db.subjects.length,db.teachers.length,db.assignments.length];return Math.round(c.filter(Boolean).length/c.length*100)}
function renderSummary(){if(!$('#summary'))return;let configured=db.teachers.filter(t=>db.teacherRules[t.id]).length;$('#summary').innerHTML=`<div class="cards"><div class="stat">اكتمال البيانات<b>${completeness()}%</b></div><div class="stat">الشعب<b>${db.sections.length}</b></div><div class="stat">المواد<b>${db.subjects.length}</b></div><div class="stat">المدرسون<b>${db.teachers.length}</b></div><div class="stat">قيود مضبوطة<b>${configured}</b></div><div class="stat">حصص مثبتة<b>${db.fixedLessons.length}</b></div></div><div class="progress" style="margin-top:12px"><i style="width:${completeness()}%"></i></div>`}
function render(){nav();renderSummary();document.body.classList.toggle('dashboard-page',page==='school');(({school,liveBoard,schoolSettings,days,sections,subjects,teachers,loads,assignments,audit,matrix,constraints,advanced,fixed,feasibility,generator,workspaceTT,gapDiagnosis,printSetup})[page]||(window.masarPages&&window.masarPages[page])||school)()}
// Independent dashboard verification is ephemeral and tied to the exact input snapshot.
let homeAudit=null;
function homeAuditSignature(){return JSON.stringify([db.timetable,db.assignments,db.teacherRules,db.subjectRules,db.advancedRules,db.fixedLessons,db.days,db.stageDayPeriods]);}
async function runHomeAudit(){
 const btn=document.getElementById('homeAuditButton');
 if(btn){btn.disabled=true;btn.textContent='جارٍ فحص سلامة الجدول…'}
 const signature=homeAuditSignature();
 const expected=db.assignments.reduce((n,a)=>n+Math.max(0,+a.weeklyPeriods||0),0);
 const actual=db.timetable.length;
 let result;
 try{result=await validateLocalCandidate(structuredClone(db.timetable))}
 catch(e){result={ok:false,reason:'تعذر تشغيل المدقق: '+String(e)}}
 homeAudit={signature,passed:!!result.ok&&actual===expected,reason:result.reason||'',checkedAt:new Date().toLocaleString('ar-IQ'),expected,actual};
 if(page==='school')school();
}
function school(){
 const assigned=db.assignments.reduce((n,a)=>n+Math.max(0,+a.weeklyPeriods||0),0);
 const placed=db.timetable.length;
 const teacherCount=db.teachers.length, sectionCount=db.sections.length;
 const missing=Math.max(0,assigned-placed),extra=Math.max(0,placed-assigned);
 const state=placed===0?'لم يتم إنشاء جدول بعد':placed===assigned?'اكتمل العدد المطلوب — بانتظار التدقيق':'الجدول غير مكتمل';
 const status=placed===0?'neutral':placed===assigned?'ready':'attention';
 const teacherRules=Object.values(db.teacherRules||{}).filter(Boolean).length;
 const auditCurrent=homeAudit&&homeAudit.signature===homeAuditSignature()?homeAudit:null;
 const auditText=placed===0?'لا يوجد جدول للتدقيق':auditCurrent?(auditCurrent.passed?'اجتاز التدقيق المستقل':'لم يجتز التدقيق المستقل'):'لم يُفحص الجدول الحالي';
 const auditClass=placed===0?'neutral':auditCurrent?(auditCurrent.passed?'pass':'fail'):'pending';
 const auditDetail=auditCurrent?(auditCurrent.passed?'فحص بتاريخ '+auditCurrent.checkedAt:(auditCurrent.reason||'يوجد اختلاف أو مخالفة تستدعي المراجعة')):'اضغط على زر الفحص للحصول على نتيجة موثقة للجدول الحالي.';

 const actions=[['liveBoard','◷','الدوام اليومي والشواغر','متابعة الحصة الحالية والمدرسين المتاحين'],['feasibility','◎','فحص الجدوى','فحص القيود والسعة'],['generator','✦','توليد الجدول','تشغيل محرك الجدولة'],['workspaceTT','▦','مساحة عمل الجدول','التعديل والتبادل اليدوي'],['gapDiagnosis','⌕','التشخيص','فحص الفراغات والمشكلات'],['printSetup','▧','الطباعة والتصميم','تصدير الجداول'],['schoolSettings','⚙','إعدادات المدرسة','الاسم والنسخ الاحتياطية']];
 $('#workspace').innerHTML=`<div class="home-dash">
 <div class="home-hero glass-surface"><div class="home-hero-text"><div class="home-kicker">✦ مركز التحكم المدرسي</div><h2>${esc(db.school.name||'مرحباً بك في نيبور')}</h2><p>العام الدراسي ${esc(db.school.year||'—')} · إدارة المدرسة من مكان واحد</p><div class="home-status ${status}"><span class="home-status-dot"></span>${esc(state)}</div></div><div class="home-hero-symbol" aria-hidden="true">▦</div></div>
 <div class="home-metrics" aria-label="مؤشرات الجدول">
 <div class="home-metric glass-surface"><span>الحصص المطلوبة</span><strong>${assigned}</strong><small>وفق التكليفات</small></div>
 <div class="home-metric glass-surface"><span>الحصص المجدولة</span><strong>${placed}</strong><small>من ${assigned}</small></div>
 <div class="home-metric glass-surface"><span>الشعب</span><strong>${sectionCount}</strong><small>شعبة مسجلة</small></div>
 <div class="home-metric glass-surface"><span>المدرسون</span><strong>${teacherCount}</strong><small>${teacherRules} قيود مدرسين مسجلة</small></div>
 </div>
 <div class="home-progress glass-surface"><div class="home-progress-head"><b>تغطية الحصص</b><span>${assigned?Math.min(100,Math.round(placed/assigned*100)):0}%</span></div><div class="home-track"><i style="width:${assigned?Math.min(100,placed/assigned*100):0}%"></i></div><p>${assigned===0?'أدخل تكليفات المدرسين أولاً.':missing?'متبقي '+missing+' حصة غير مجدولة.':extra?'هناك '+extra+' حصة إضافية مقارنة بالتكليفات.':'اكتمل عدد الحصص. يجب تشغيل المدقق المستقل للتأكد من سلامة القيود.'}</p></div>
 <section class="home-audit glass-surface" aria-label="سلامة الجدول"><div class="home-audit-heading"><div><h3>سلامة الجدول <span class="home-audit-tag ${auditClass}">${esc(auditText)}</span></h3><p>${esc(auditDetail)}</p></div><button type="button" id="homeAuditButton" ${placed?'':'disabled'}>فحص سلامة الجدول</button></div><div class="home-audit-facts"><span>اكتمال التوزيع: <strong>${assigned?Math.round(100*placed/assigned):0}%</strong></span><span>نتيجة التدقيق: <strong>${auditCurrent?(auditCurrent.passed?'ناجح':'غير ناجح'):'غير متاحة'}</strong></span></div></section>
 <div class="home-section-head"><div><h3>الوصول السريع</h3><p>اختر العملية المطلوبة للانتقال إلى أدواتها مباشرة</p></div></div>
 <div class="home-actions">${actions.map(a=>`<button type="button" class="home-action glass-surface" data-home-page="${a[0]}"><span class="home-action-icon" aria-hidden="true">${a[1]}</span><span class="home-action-text"><strong>${a[2]}</strong><small>${a[3]}</small></span><span class="home-action-arrow" aria-hidden="true">←</span></button>`).join('')}</div>
 <div class="home-note"><span aria-hidden="true">ⓘ</span><p><strong>معلومة مهمة:</strong> اكتمال عدد الحصص لا يعني اجتياز جميع القيود. افتح «مساحة عمل الجدول» ثم شغّل «تدقيق الجدول وتصدير الشهادة» للتحقق المستقل.</p></div>
 </div>`;
 const homeAuditButton=document.getElementById('homeAuditButton');if(homeAuditButton)homeAuditButton.onclick=runHomeAudit;
 document.querySelectorAll('[data-home-page]').forEach(b=>b.onclick=()=>{page=b.dataset.homePage;render();window.scrollTo({top:0,behavior:'smooth'})});
}
function schoolSettings(){$('#workspace').innerHTML=`<h2>إعداد المدرسة</h2>${backupProtectionUI()}${workspaceUI()}${versionsUI()}<div class="grid"><div class="field"><label>اسم المدرسة</label><input id="schoolName" value="${esc(db.school.name)}"></div><div class="field"><label>العام الدراسي</label><input id="schoolYear" value="${esc(db.school.year)}"></div><div class="field"><label>نوع المدرسة</label><select id="schoolType"><option value="primary" ${schoolType()==='primary'?'selected':''}>ابتدائية (الأول–السادس الابتدائي)</option><option value="secondary" ${schoolType()==='secondary'?'selected':''}>ثانوية (الأول–الثالث المتوسط والرابع–السادس الإعدادي)</option><option value="middle" ${schoolType()==='middle'?'selected':''}>متوسطة فقط (الأول–الثالث المتوسط)</option><option value="preparatory" ${schoolType()==='preparatory'?'selected':''}>إعدادية فقط (الرابع–السادس الإعدادي)</option></select></div></div><div class="notice">تغيير نوع المدرسة يعدّل مسميات الصفوف والتصدير فقط، ولا يحذف الشعب أو التكليفات أو الحصص. للمدرسة المتوسطة أو الإعدادية فقط، يجب أن تكون المراحل المسجلة مطابقة لطبيعة المدرسة.</div><div class="actions"><button id="saveSchool">حفظ الإعدادات</button><label class="secondary masar-import-label" for="importFile" role="button" tabindex="0">استيراد نسخة احتياطية JSON</label><button class="secondary" id="recoveryBtn">تنزيل نسخة الاسترجاع المحلية</button><button class="danger" id="resetBtn">إعادة ضبط المشروع</button></div>`;wireBackupProtection();wireWorkspaces();wireVersions();$('#saveSchool').onclick=()=>{db.school.name=$('#schoolName').value.trim();db.school.year=$('#schoolYear').value.trim();db.school.type=$('#schoolType').value;save();schoolSettings()};$('#recoveryBtn').onclick=downloadRecovery;$('#resetBtn').onclick=async ()=>{if((await masarConfirm('سيتم حذف جميع البيانات المحلية. هل أنت متأكد؟'))){if(!preserveTimetable('إعادة ضبط المشروع'))return;db=seed();if(save())render()}}}
function sectionDayPeriods(sec,day){const x=db.stageDayPeriods?.[sec.stageId]?.[day.id];return day.active?Math.max(0,Math.min(day.periods,Number.isFinite(+x)&&x!==undefined?+x:day.periods)):0}
function dayCapacity(sec){return db.days.reduce((n,d)=>n+sectionDayPeriods(sec,d),0)}
function days(){$('#workspace').innerHTML=`<h2>أيام الدوام وعدد الحصص</h2><div class="notice">يمكن أن يختلف عدد الحصص من يوم إلى آخر.</div><table><thead><tr><th>اليوم</th><th>دوام</th><th>عدد الحصص</th></tr></thead><tbody>${db.days.sort((a,b)=>a.order-b.order).map(d=>`<tr><td>${esc(d.name)}</td><td><input type="checkbox" data-active="${d.id}" ${d.active?'checked':''}></td><td><input type="number" min="0" max="12" data-periods="${d.id}" value="${d.periods}"></td></tr>`).join('')}</tbody></table><h3>تخصيص عدد الحصص حسب المرحلة واليوم</h3><div class="notice">العدد العام هو الحد الأعلى. مثال: الثلاثاء 7 حصص للمدرسة، و6 لبقية المراحل، و7 للسادس.</div><div class="tt-wrap"><table><thead><tr><th>المرحلة</th>${db.days.filter(d=>d.active).map(d=>`<th>${esc(d.name)}</th>`).join('')}</tr></thead><tbody>${db.stages.map(g=>`<tr><th>${esc(g.name)}</th>${db.days.filter(d=>d.active).map(d=>`<td><input class="stage-period-input" type="number" min="0" max="${d.periods}" data-stage-day="${g.id}|${d.id}" value="${db.stageDayPeriods[g.id]?.[d.id]??d.periods}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>`;document.querySelectorAll('[data-stage-day]').forEach(x=>x.onchange=async ()=>{const [g,d]=x.dataset.stageDay.split('|');const max=db.days.find(v=>v.id===d).periods;if(!(await invalidateTimetable('تغيير حصص المرحلة'))){days();return}db.stageDayPeriods[g]??={};db.stageDayPeriods[g][d]=Math.min(max,Math.max(0,+x.value||0));save();days()});document.querySelectorAll('[data-active]').forEach(x=>x.onchange=async ()=>{if(!(await invalidateTimetable('تغيير أيام الدوام'))){days();return}db.days.find(d=>d.id===x.dataset.active).active=x.checked;save()});document.querySelectorAll('[data-periods]').forEach(x=>x.onchange=async ()=>{if(!(await invalidateTimetable('تغيير عدد الحصص'))){days();return}let d=db.days.find(d=>d.id===x.dataset.periods);d.periods=Math.max(0,+x.value||0);d.active=d.periods>0;save();days()})}
function sections(){let rows=db.sections.slice().sort((a,b)=>(db.stages.find(g=>g.id===a.stageId)?.order||0)-(db.stages.find(g=>g.id===b.stageId)?.order||0)||a.order-b.order);$('#workspace').innerHTML=`<h2>المراحل والشعب</h2><div class="grid"><div class="field"><label>المرحلة</label><select id="stage">${db.stages.sort((a,b)=>a.order-b.order).map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></div><div class="field"><label>اسم الشعبة</label><input id="sectionName" placeholder="مثال: أ"></div></div><div class="actions"><button id="addSection">إضافة شعبة</button></div><table><thead><tr><th>المرحلة</th><th>الشعبة</th><th></th></tr></thead><tbody>${rows.length?rows.map(s=>{let g=db.stages.find(x=>x.id===s.stageId);return `<tr><td><span class="stage-dot" style="background:${g.color}"></span>${esc(g.name)}</td><td>${esc(s.name)}</td><td><button class="danger" data-del-section="${s.id}">حذف</button></td></tr>`}).join(''):`<tr><td colspan="3" class="empty">لم تضف شعب بعد</td></tr>`}</tbody></table>`;$('#addSection').onclick=()=>{let name=$('#sectionName').value.trim(),stageId=$('#stage').value;if(!name)return;if(db.sections.some(s=>s.stageId===stageId&&s.name===name))return alert('هذه الشعبة موجودة');let max=Math.max(0,...db.sections.filter(s=>s.stageId===stageId).map(s=>s.order));db.sections.push({id:uid('sec'),stageId,name,order:max+1});save();sections()};document.querySelectorAll('[data-del-section]').forEach(b=>b.onclick=()=>{if(db.assignments.some(a=>a.sectionId===b.dataset.delSection))return alert('لا يمكن حذف شعبة مرتبطة بتكليف');db.sections=db.sections.filter(s=>s.id!==b.dataset.delSection);save();sections()})}
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
    t.name=v.name;t.specialty=v.specialty.trim();t.notes=v.notes.trim();save();teachers();
  });
}
function editSubject(id){
  const s=db.subjects.find(x=>x.id===id);if(!s)return;
  openEditModal('تعديل المادة',[
    {key:'name',label:'اسم المادة',value:s.name},
    {key:'color',label:'لون المادة',value:s.color||'#F3EBDD',type:'color'}
  ],v=>{
    v.name=v.name.trim();if(!v.name){alert('اسم المادة مطلوب');return false}
    if(db.subjects.some(x=>x.id!==s.id&&x.name===v.name)){alert('توجد مادة بهذا الاسم');return false}
    s.name=v.name;s.color=v.color;save();subjects();
  });
}

function editSubjectRule(id){
 const sub=db.subjects.find(x=>x.id===id);if(!sub)return;const r=db.subjectRules[id]||{};
 const overlay=document.createElement('div');overlay.className='edit-overlay';overlay.innerHTML=`<div class="edit-card"><div class="edit-head"><h3>قيود مادة ${esc(sub.name)}</h3><button class="icon-close" id="srClose">×</button></div><div class="edit-fields"><label><input type="checkbox" id="srFirst" ${r.noFirst?'checked':''}> منع الحصة الأولى</label><label><input type="checkbox" id="srLast" ${r.noLast?'checked':''}> منع آخر حصة فعلية للشعبة</label><label><input type="checkbox" id="srRepeat" ${r.noRepeat?'checked':''}> منع تكرار المادة في اليوم</label><div class="field"><label>النوع</label><select id="srStrict"><option value="hard" ${r.strict!=='soft'?'selected':''}>إلزامي</option><option value="soft" ${r.strict==='soft'?'selected':''}>تفضيلي</option></select></div><div class="field"><label>المرحلة</label><select id="srStage"><option value="">كل المراحل</option>${db.stages.map(g=>`<option value="${g.id}" ${r.stageId===g.id?'selected':''}>${esc(g.name)}</option>`).join('')}</select></div></div><div class="actions"><button id="srSave">حفظ القيود</button><button class="secondary" id="srCancel">إلغاء</button></div></div>`;document.body.appendChild(overlay);overlay.querySelector('#srClose').onclick=overlay.querySelector('#srCancel').onclick=()=>overlay.remove();overlay.querySelector('#srSave').onclick=async ()=>{if(!(await invalidateTimetable('تغيير قيود المادة')))return;db.subjectRules[id]={noFirst:overlay.querySelector('#srFirst').checked,noLast:overlay.querySelector('#srLast').checked,noRepeat:overlay.querySelector('#srRepeat').checked,strict:overlay.querySelector('#srStrict').value,stageId:overlay.querySelector('#srStage').value};save();overlay.remove();subjects()};
}
function subjects(){
  $('#workspace').innerHTML=`<h2>المواد الدراسية</h2><div class="grid"><div class="field"><label>اسم المادة</label><input id="subjectName"></div><div class="field"><label>لون المادة</label><input id="subjectColor" type="color" value="#F3EBDD"></div></div><div class="actions"><button id="addSubject">إضافة مادة</button></div>
  <table><thead><tr><th>الاسم</th><th>اللون</th><th>الإجراءات</th></tr></thead><tbody>${db.subjects.length?db.subjects.map(x=>`<tr><td>${esc(x.name)}</td><td><span class="tag" style="background:${x.color}">${x.color}</span></td><td><button class="secondary edit-visible" data-edit-sub="${x.id}">✏️ تعديل</button> <button class="secondary" data-rule-sub="${x.id}">قيود الجدولة</button> <button class="danger" data-del-sub="${x.id}">حذف</button></td></tr>`).join(''):'<tr><td colspan="3" class="empty">لا توجد مواد</td></tr>'}</tbody></table>`;
  $('#addSubject').onclick=()=>{let name=$('#subjectName').value.trim();if(!name)return;if(db.subjects.some(x=>x.name===name))return alert('المادة موجودة');db.subjects.push({id:uid('sub'),name,color:$('#subjectColor').value});save();subjects()};
  document.querySelectorAll('[data-edit-sub]').forEach(b=>b.onclick=()=>editSubject(b.dataset.editSub));
  document.querySelectorAll('[data-del-sub]').forEach(b=>b.onclick=()=>{if(db.assignments.some(a=>a.subjectId===b.dataset.delSub))return alert('لا يمكن حذف مادة مرتبطة بتكليف');db.subjects=db.subjects.filter(x=>x.id!==b.dataset.delSub);save();subjects()});
document.querySelectorAll('[data-rule-sub]').forEach(b=>b.onclick=()=>editSubjectRule(b.dataset.ruleSub));}
function teachers(){
  $('#workspace').innerHTML=`<h2>المدرسون</h2><div class="grid"><div class="field"><label>الاسم الكامل</label><input id="teacherName"></div><div class="field"><label>التخصص</label><input id="teacherSpec"></div><div class="field"><label>ملاحظات</label><input id="teacherNotes"></div></div><div class="actions"><button id="addTeacher">إضافة مدرس</button></div><h3>إدخال جماعي</h3><div class="notice">كل مدرس في سطر، وافصل الاسم والتخصص والملاحظات بـ Tab أو فاصلة.</div><div class="field"><textarea id="bulkTeachers"></textarea></div><div class="actions"><button id="bulkAdd">إضافة القائمة</button></div>
  <table><thead><tr><th>الاسم</th><th>التخصص</th><th>ملاحظات</th><th>الإجراءات</th></tr></thead><tbody>${db.teachers.length?db.teachers.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.specialty||'')}</td><td>${esc(x.notes||'')}</td><td><button class="secondary edit-visible" data-edit-tea="${x.id}">✏️ تعديل</button> <button class="danger" data-del-tea="${x.id}">حذف</button></td></tr>`).join(''):'<tr><td colspan="4" class="empty">لا يوجد مدرسون</td></tr>'}</tbody></table>`;
  function add(n,s='',no=''){n=n.trim();if(!n||db.teachers.some(t=>t.name===n))return false;db.teachers.push({id:uid('tea'),name:n,specialty:s.trim(),notes:no.trim()});return true}
  $('#addTeacher').onclick=()=>{if(add($('#teacherName').value,$('#teacherSpec').value,$('#teacherNotes').value)){save();teachers()}else alert('الاسم فارغ أو مكرر')};
  $('#bulkAdd').onclick=()=>{let n=0;$('#bulkTeachers').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).forEach(line=>{let p=line.includes('\t')?line.split('\t'):line.split(',');if(add(p[0]||'',p[1]||'',p.slice(2).join(' ')))n++});save();alert(`تمت إضافة ${n} مدرس`);teachers()};
  document.querySelectorAll('[data-edit-tea]').forEach(b=>b.onclick=()=>editTeacher(b.dataset.editTea));
  document.querySelectorAll('[data-del-tea]').forEach(b=>b.onclick=()=>{if(db.assignments.some(a=>a.teacherId===b.dataset.delTea))return alert('لا يمكن حذف مدرس مرتبط بتكليف');db.teachers=db.teachers.filter(x=>x.id!==b.dataset.delTea);delete db.teacherRules[b.dataset.delTea];save();teachers()});
}

function loadFor(stageId,subjectId){return +(db.stageLoads[stageId+'|'+subjectId]||0)}
function loads(){
 const stages=db.stages.slice().sort((a,b)=>a.order-b.order);
 const subjects=db.subjects;
 const rowTotal=sub=>stages.reduce((n,g)=>n+loadFor(g.id,sub.id),0);
 const stageTotal=g=>subjects.reduce((n,sub)=>n+loadFor(g.id,sub.id),0);
 $('#workspace').innerHTML=`<h2>عدد حصص المواد حسب المرحلة</h2><div class="notice">أدخل العدد الأسبوعي لكل مادة ومرحلة. عند الحفظ تُطابَق تكليفات الشعب مع الخطة، حتى لو كانت الخطة محفوظة سابقاً. الرقم صفر يعني أن المادة غير مقررة لهذه المرحلة.</div><div class="tt-wrap"><table class="load-matrix" id="stageLoadMatrix"><thead><tr><th>المادة</th>${stages.map(g=>`<th style="border-top:5px solid ${g.color}">${esc(g.name)}</th>`).join('')}<th>مجموع المادة</th></tr></thead><tbody>${subjects.map(sub=>`<tr><th>${esc(sub.name)}</th>${stages.map(g=>`<td><input type="number" min="0" max="20" data-load="${g.id}|${sub.id}" value="${loadFor(g.id,sub.id)}"></td>`).join('')}<td class="load-total" data-subject-total="${sub.id}">${rowTotal(sub)}</td></tr>`).join('')}<tr class="load-totals-row"><th>مجموع الحصص الأسبوعية لكل مرحلة</th>${stages.map(g=>`<th data-stage-total="${g.id}">${stageTotal(g)}</th>`).join('')}<th data-load-grand-total>${stages.reduce((n,g)=>n+stageTotal(g),0)}</th></tr></tbody></table></div><div class="notice">مجموع كل مرحلة يمثل نصاب شعبة واحدة وفق خطة المواد، ولا يُضرب بعدد الشعب. مجموع المادة يجمع قيمها عبر المراحل للمقارنة فقط.</div><div class="actions"><button id="saveLoads">حفظ خطة الحصص</button></div>`;
 const inputs=[...document.querySelectorAll('#stageLoadMatrix [data-load]')];
 const numberOf=i=>Math.max(0,Math.min(20,Number(i.value)||0));
 const updateTotals=()=>{
  const sums=new Map(stages.map(g=>[g.id,0]));const subjectSums=new Map(subjects.map(sub=>[sub.id,0]));
  inputs.forEach(i=>{const [stageId,subjectId]=i.dataset.load.split('|');const n=numberOf(i);sums.set(stageId,(sums.get(stageId)||0)+n);subjectSums.set(subjectId,(subjectSums.get(subjectId)||0)+n)});
  stages.forEach(g=>{const el=document.querySelector('[data-stage-total="'+g.id+'"]');if(el)el.textContent=sums.get(g.id)||0});
  subjects.forEach(sub=>{const el=document.querySelector('[data-subject-total="'+sub.id+'"]');if(el)el.textContent=subjectSums.get(sub.id)||0});
  const grand=document.querySelector('[data-load-grand-total]');if(grand)grand.textContent=[...sums.values()].reduce((n,v)=>n+v,0);
 };
 inputs.forEach(i=>i.addEventListener('input',updateTotals));
 $('#saveLoads').onclick=async ()=>{
  const next={...db.stageLoads};inputs.forEach(i=>next[i.dataset.load]=numberOf(i));
  // Reconcile saved stage quotas with existing assignments even when the quota
  // was already saved in an earlier version (legacy inconsistent state).
  const changed=inputs.filter(i=>{
   const [stageId,subjectId]=i.dataset.load.split('|'),quota=numberOf(i);
   if(quota!==loadFor(stageId,subjectId))return true;
   return db.sections.some(sec=>sec.stageId===stageId&&(
    db.assignments.filter(a=>a.sectionId===sec.id&&a.subjectId===subjectId)
     .reduce((n,a)=>n+(Number(a.weeklyPeriods)||0),0)!==quota));
  });
  if(!changed.length){alert('خطة الحصص والتكليفات متطابقة؛ لا توجد تغييرات.');return}
  const proposed=new Map(), problems=[];
  for(const i of changed){const [stageId,subjectId]=i.dataset.load.split('|'),quota=numberOf(i);
   for(const sec of db.sections.filter(x=>x.stageId===stageId)){
    const as=db.assignments.filter(a=>a.sectionId===sec.id&&a.subjectId===subjectId);
    if(as.length>1){problems.push('أكثر من تكليف للمادة في الشعبة '+sec.name);continue}
    if(as.length===1)proposed.set(as[0].id,quota);
    else if(quota>0)problems.push('لا يوجد تكليف للمادة في الشعبة '+sec.name+'؛ أضفه أولاً من إدارة التكليفات');
   }
  }
  if(problems.length){alert('لا يمكن تطبيق الخطة تلقائياً:\n'+problems.slice(0,12).join('\n'));return}
  const excess=[],deficit=[];
  for(const [id,quota] of proposed){const entries=db.timetable.filter(e=>e.assignmentId===id),locked=entries.filter(e=>e.locked),a=db.assignments.find(x=>x.id===id);
   if(locked.length>quota){problems.push('عدد الحصص المثبتة أكبر من النصاب الجديد للتكليف '+id);continue}
   if(entries.length>quota){const removable=entries.filter(e=>!e.locked).sort((x,y)=>String(y.dayId).localeCompare(String(x.dayId))||y.period-x.period);excess.push(...removable.slice(0,entries.length-quota))}
   if(entries.length<quota)deficit.push({a,missing:quota-entries.length});
  }
  if(problems.length){alert('لا يمكن تعديل حصص مثبتة:\n'+problems.join('\n'));return}
  const delta=[...proposed].filter(([id,q])=>+db.assignments.find(a=>a.id===id).weeklyPeriods!==q).length;
  const msg='ستُحدّث خطة المواد وتكليفات '+delta+' شعبة/مادة.\nستُزال '+excess.length+' حصة زائدة من الجدول الحالي، وستبقى '+deficit.reduce((n,x)=>n+x.missing,0)+' حصة غير موزعة تحتاج إلى استكمال التوليد.\nسيُحفظ الجدول الأصلي كنسخة استرجاع. هل توافق؟';
  if(!(await masarConfirm(msg)))return;
  if(!preserveTimetable('تغيير حصص المراحل مع التكليفات والجدول'))return;
  const original=structuredClone(db);
  db.stageLoads=next;
  for(const [id,quota] of proposed){const a=db.assignments.find(x=>x.id===id);if(a)a.weeklyPeriods=quota}
  const removed=new Set(excess.map(e=>e.id));db.timetable=db.timetable.filter(e=>!removed.has(e.id));
  // Remove fixed lesson references only for entries removed by the quota reduction.
  const removedSlots=new Set(excess.map(e=>e.assignmentId+'|'+e.dayId+'|'+e.period));
  db.fixedLessons=db.fixedLessons.filter(f=>!removedSlots.has(f.assignmentId+'|'+f.dayId+'|'+f.period));
  db.manualHistory=[];
  if(!save()){db=original;return}
  loads();alert('حُفظت التغييرات على خطة المواد والتكليفات والجدول المشترك. '+(deficit.length?'توجد حصص ناقصة؛ افتح التدقيق ثم استكمل توزيعها.':'راجع التدقيق قبل اعتماد الجدول.'));
 };
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
 function paintTeacher(){let t=db.teachers.find(x=>x.id===tid);head.innerHTML=t?`<div class="selected-teacher"><h3>${esc(t.name)}</h3><span>${esc(t.specialty||'دون تخصص')} · ${hours(t)} حصة أسبوعياً</span></div>`:'<div class="notice warning">أضف مدرسين أولاً</div>';const a=db.assignments.filter(x=>x.teacherId===tid);current.innerHTML=a.length?`<div class="tt-wrap"><table><thead><tr><th>المادة</th><th>الشعبة</th><th>الحصص</th><th>إجراءات</th></tr></thead><tbody>${a.map(x=>`<tr><td>${esc(db.subjects.find(y=>y.id===x.subjectId)?.name||'—')}</td><td>${esc(sectionName(x.sectionId))}</td><td>${x.weeklyPeriods}</td><td><button class="secondary" data-edit-a="${x.id}">تعديل</button> <button class="danger" data-del-a="${x.id}">حذف</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="notice">هذا المدرس غير مكلف بعد.</div>';current.querySelectorAll('[data-edit-a]').forEach(b=>b.onclick=()=>assignmentEditDialog(b.dataset.editA));current.querySelectorAll('[data-del-a]').forEach(b=>b.onclick=async ()=>{if(!(await masarConfirm('حذف هذا التكليف؟')))return;if(!(await invalidateTimetable('حذف تكليف')))return;db.fixedLessons=db.fixedLessons.filter(f=>f.assignmentId!==b.dataset.delA);db.assignments=db.assignments.filter(a=>a.id!==b.dataset.delA);save();assignments()})}
 function sections(){let stage=$('#asStage').value;$('#asSections').innerHTML=db.sections.filter(x=>x.stageId===stage).sort((a,b)=>a.order-b.order).map(x=>`<label><input type="checkbox" value="${x.id}"> ${esc(x.name)}</label>`).join('')||'<span class="hint">لا توجد شعب لهذه المرحلة</span>';suggest()}
 function suggest(){let n=loadFor($('#asStage').value,$('#asSubject').value);$('#asSuggested').textContent=n?n+' حصص أسبوعياً':'غير محدد: أدخل العدد يدوياً أو من حصص المراحل';$('#asPeriods').value=n||''}
 function paintDraft(){$('#asDraft').innerHTML=draft.length?`<h4>مراجعة قبل الحفظ (${draft.length})</h4><div class="tt-wrap"><table><thead><tr><th>المادة</th><th>الشعبة</th><th>الحصص</th><th></th></tr></thead><tbody>${draft.map((x,i)=>`<tr><td>${esc(db.subjects.find(z=>z.id===x.subjectId)?.name||'')}</td><td>${esc(sectionName(x.sectionId))}</td><td>${x.weeklyPeriods}</td><td><button class="danger" data-draft="${i}">إزالة</button></td></tr>`).join('')}</tbody></table></div>`:'';document.querySelectorAll('[data-draft]').forEach(b=>b.onclick=()=>{draft.splice(+b.dataset.draft,1);paintDraft()})}
 $('#asSearch').oninput=paintList;$('#asSort').onchange=paintList;$('#asStatus').onchange=paintList;$('#asStage').onchange=sections;$('#asSubject').onchange=suggest;
 $('#asAddDraft').onclick=()=>{if(!tid)return alert('اختر مدرساً');let subjectId=$('#asSubject').value,weeklyPeriods=+$('#asPeriods').value,ids=[...document.querySelectorAll('#asSections input:checked')].map(x=>x.value);if(!ids.length)return alert('اختر شعبة واحدة على الأقل');if(!Number.isInteger(weeklyPeriods)||weeklyPeriods<1||weeklyPeriods>20)return alert('أدخل عدد حصص صحيحاً من 1 إلى 20');let n=0;ids.forEach(sectionId=>{if(db.assignments.some(a=>a.subjectId===subjectId&&a.sectionId===sectionId)||draft.some(a=>a.subjectId===subjectId&&a.sectionId===sectionId))return;draft.push({teacherId:tid,subjectId,sectionId,weeklyPeriods});n++});paintDraft();if(!n)alert('هذه المادة مكلفة مسبقاً لهذه الشعب، أو موجودة في قائمة المراجعة')};
 $('#asSaveDraft').onclick=async ()=>{if(!draft.length)return alert('أضف تكليفات إلى قائمة المراجعة أولاً');if(draft.some(a=>!db.assignments.some(x=>x.subjectId===a.subjectId&&x.sectionId===a.sectionId))&&!(await invalidateTimetable('إضافة تكليفات')))return;let n=0;draft.forEach(a=>{if(!db.assignments.some(x=>x.subjectId===a.subjectId&&x.sectionId===a.sectionId)){db.assignments.push({id:uid('asg'),...a});n++}});if(n)save();draft=[];alert('تم حفظ '+n+' تكليف');assignments()};
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
// Read-only Lumia-inspired section x subject assignment matrix; no changes to school data.
function matrix(){
 const stages=[...db.stages].sort((a,b)=>a.order-b.order),secs=[...db.sections].sort((a,b)=>{const x=stages.findIndex(g=>g.id===a.stageId),y=stages.findIndex(g=>g.id===b.stageId);return x-y||(a.order||0)-(b.order||0)});
 const subs=db.subjects,expected=db.assignments.reduce((n,a)=>n+Math.max(0,+a.weeklyPeriods||0),0);
 const savedSize=MStore.getItem('masar-matrix-size')||'medium',size=['compact','medium','large'].includes(savedSize)?savedSize:'medium';
 const selectedStage=MStore.getItem('masar-matrix-stage')||'all',stage=selectedStage==='all'||stages.some(g=>g.id===selectedStage)?selectedStage:'all';
 const selectedSection=MStore.getItem('masar-matrix-section')||'all';
 const stageSecs=secs.filter(x=>stage==='all'||x.stageId===stage),section=selectedSection==='all'||stageSecs.some(x=>x.id===selectedSection)?selectedSection:'all';
 const visible=stageSecs.filter(x=>section==='all'||x.id===section);
 const cols=visible.map(sec=>{const as=db.assignments.filter(a=>a.sectionId===sec.id);return {sec,as,total:as.reduce((n,a)=>n+(+a.weeklyPeriods||0),0),capacity:dayCapacity(sec)}});
 const allCols=secs.map(sec=>({sec,total:db.assignments.filter(a=>a.sectionId===sec.id).reduce((n,a)=>n+(+a.weeklyPeriods||0),0),capacity:dayCapacity(sec)}));
 const mismatch=allCols.filter(c=>c.total>c.capacity).length;
 $('#workspace').innerHTML=`<div class="matrix-head"><div><h2>مصفوفة توزيع الحصص</h2><p class="muted">اختر المرحلة أو الشعبة، واضغط على أي خلية لمعرفة تفاصيل تكليفها.</p></div><div class="actions"><button id="matrixAudit" class="secondary">تدقيق التكليفات</button><button id="matrixDiagnose">فحص الجدوى</button></div></div>
 <div class="matrix-controls"><label>المرحلة<select id="matrixStage"><option value="all">كل المراحل</option>${stages.map(g=>`<option value="${esc(g.id)}" ${stage===g.id?'selected':''}>${esc(g.name)}</option>`).join('')}</select></label><label>الشعبة<select id="matrixSection"><option value="all">كل الشعب</option>${stageSecs.map(x=>`<option value="${esc(x.id)}" ${section===x.id?'selected':''}>${esc(stages.find(g=>g.id===x.stageId)?.name||'')} — ${esc(x.name)}</option>`).join('')}</select></label><div class="matrix-size-control"><span>حجم الخلايا</span><div role="group" aria-label="حجم خلايا المصفوفة">${[['compact','مضغوط'],['medium','متوسط'],['large','كبير']].map(([id,label])=>`<button type="button" data-matrix-size="${id}" class="${size===id?'active':''}" aria-pressed="${size===id}">${label}</button>`).join('')}</div></div></div>
 <div class="matrix-kpis"><div>الشعب المعروضة <b>${cols.length} / ${secs.length}</b></div><div>المواد <b>${subs.length}</b></div><div>الحصص المكلفة <b>${expected}</b></div><div>تجاوز السعة <b>${mismatch}</b></div></div>
 <div class="tt-wrap matrix-scroll matrix-size-${size}" tabindex="0" aria-label="مصفوفة توزيع الحصص، مرر أفقياً لعرض باقي الشعب"><table class="matrix-table"><thead><tr><th>المادة / الشعبة</th>${cols.map(c=>`<th style="border-top:4px solid ${esc(stages.find(g=>g.id===c.sec.stageId)?.color||'#496e87')}">${esc(stages.find(g=>g.id===c.sec.stageId)?.name||'')}<small>${esc(c.sec.name)}</small></th>`).join('')}</tr></thead><tbody>${subs.map(sub=>`<tr><th>${esc(sub.name)}</th>${cols.map(c=>{const a=c.as.filter(x=>x.subjectId===sub.id),n=a.reduce((v,x)=>v+(+x.weeklyPeriods||0),0),planned=loadFor(c.sec.stageId,sub.id),bad=planned>0&&n!==planned;return `<td class="${bad?'matrix-alert':n?'matrix-set':''}"><button type="button" class="matrix-cell" data-sub="${esc(sub.id)}" data-sec="${esc(c.sec.id)}" aria-label="${esc(sub.name)}، ${esc(c.sec.name)}، المكلف ${n} والمخطط ${planned}">${n||'—'}${bad?'<span class="matrix-mark">!</span>':''}</button></td>`}).join('')}</tr>`).join('')}<tr class="matrix-total"><th>المجموع / السعة</th>${cols.map(c=>`<td class="${c.total>c.capacity?'matrix-alert':''}">${c.total} / ${c.capacity}</td>`).join('')}</tr></tbody></table></div><div id="matrixDetails" class="matrix-details" hidden aria-live="polite"></div><div class="notice">مطابقة أعداد الحصص لا تثبت إمكانية التوليد؛ يجب فحص قيود المدرسين وتدقيق الجدول النهائي.</div>`;
 $('#matrixAudit').onclick=()=>{page='audit';render()};$('#matrixDiagnose').onclick=()=>{page='feasibility';render()};
 $('#matrixStage').onchange=e=>{MStore.setItem('masar-matrix-stage',e.target.value);MStore.setItem('masar-matrix-section','all');matrix()};
 $('#matrixSection').onchange=e=>{MStore.setItem('masar-matrix-section',e.target.value);matrix()};
 document.querySelectorAll('[data-matrix-size]').forEach(btn=>btn.onclick=()=>{MStore.setItem('masar-matrix-size',btn.dataset.matrixSize);const wrap=document.querySelector('.matrix-scroll');wrap.classList.remove('matrix-size-compact','matrix-size-medium','matrix-size-large');wrap.classList.add('matrix-size-'+btn.dataset.matrixSize);document.querySelectorAll('[data-matrix-size]').forEach(b=>{const on=b===btn;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))})});
 document.querySelectorAll('.matrix-cell').forEach(btn=>btn.onclick=()=>{const sub=db.subjects.find(x=>x.id===btn.dataset.sub),sec=db.sections.find(x=>x.id===btn.dataset.sec);if(!sub||!sec)return;const assignments=db.assignments.filter(a=>a.subjectId===sub.id&&a.sectionId===sec.id),planned=loadFor(sec.stageId,sub.id),actual=assignments.reduce((v,a)=>v+(+a.weeklyPeriods||0),0),details=$('#matrixDetails');details.hidden=false;details.innerHTML=`<div class="matrix-detail-head"><strong>${esc(sub.name)} — ${esc(stages.find(g=>g.id===sec.stageId)?.name||'')} / ${esc(sec.name)}</strong><button type="button" id="matrixCloseDetails" class="secondary">إغلاق ×</button></div><p>المخطط: <b>${planned}</b> | المكلف: <b>${actual}</b> | الفرق: <b>${actual-planned}</b></p>${assignments.length?`<ul>${assignments.map(a=>`<li>${esc(db.teachers.find(t=>t.id===a.teacherId)?.name||'مدرس غير معروف')} — ${+a.weeklyPeriods||0} حصة</li>`).join('')}</ul>`:'<p>لا توجد تكليفات لهذه المادة في هذه الشعبة.</p>'}<button type="button" id="matrixGoAssignments">فتح إدارة التكليفات</button>`;$('#matrixCloseDetails').onclick=()=>details.hidden=true;$('#matrixGoAssignments').onclick=()=>{page='assignments';render()};details.scrollIntoView({block:'nearest',behavior:'smooth'})});
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
 <h3>ملخص الشعب والسعة الأسبوعية</h3><div class="tt-wrap"><table><thead><tr><th>المرحلة / الشعبة</th><th>المخطط</th><th>المكلف</th><th>سعة الجدول</th><th>نقص المواد</th><th>ملاحظة</th></tr></thead><tbody>${bySection.map(x=>`<tr><td>${esc(stages.find(g=>g.id===x.sec.stageId)?.name||'—')} / ${esc(x.sec.name)}</td><td>${x.planned}</td><td>${x.assigned}</td><td>${x.capacity}</td><td>${x.missing}</td><td>${x.planned!==x.capacity?'الخطة تختلف عن سعة الجدول':x.assigned!==x.capacity?'التكليفات تختلف عن السعة':'متطابق مع السعة'}</td></tr>`).join('')||'<tr><td colspan="6">لا توجد شعب</td></tr>'}</tbody><tfoot><tr class="audit-totals-row"><th>المجموع</th><th>${bySection.reduce((n,x)=>n+x.planned,0)}</th><th>${bySection.reduce((n,x)=>n+x.assigned,0)}</th><th>${bySection.reduce((n,x)=>n+x.capacity,0)}</th><th>${bySection.reduce((n,x)=>n+x.missing,0)}</th><th>—</th></tr></tfoot></table></div>
 <h3>تفاصيل المواد والتكليفات</h3><div class="tt-wrap"><table class="audit-table"><thead><tr><th>المرحلة / الشعبة</th><th>المادة</th><th>المخطط</th><th>المكلف</th><th>الفرق</th><th>المدرس / المدرسون</th><th>الحالة</th><th>المعالجة</th></tr></thead><tbody>${filtered.map(x=>`<tr><td>${esc(x.stage.name)} / ${esc(x.section.name)}</td><td>${esc(x.subject?.name||'مادة محذوفة')}</td><td>${x.planned}</td><td>${x.assigned}</td><td>${x.difference>0?'+':''}${x.difference}</td><td>${esc(x.assignments.map(a=>teacherName(a.teacherId)).join('، ')||'غير مكلف')}</td><td><span class="audit-pill ${x.status}">${names[x.status]}</span></td><td><button class="secondary audit-fix" data-stage="${esc(x.stage.id)}" data-section="${esc(x.section.id)}" data-subject="${esc(x.subjectId)}" data-teacher="${esc(x.assignments[0]?.teacherId||'')}">فتح التكليفات</button></td></tr>`).join('')||'<tr><td colspan="8">لا توجد نتائج وفق المرشحات الحالية.</td></tr>'}</tbody><tfoot><tr class="audit-totals-row"><th colspan="2">المجموع وفق المرشحات</th><th>${totals.planned}</th><th>${totals.assigned}</th><th>${totals.assigned-totals.planned}</th><th colspan="3">—</th></tr></tfoot></table></div>
 <h3>نصاب المدرسين عبر جميع المراحل</h3><div class="tt-wrap"><table><thead><tr><th>المدرس</th><th>التخصص</th><th>التكليفات</th><th>الحصص الأسبوعية</th><th>الشعب والمواد</th><th>إجراء</th></tr></thead><tbody>${[...db.teachers].sort((a,b)=>a.name.localeCompare(b.name,'ar')).filter(t=>auditState.teacher==='all'||t.id===auditState.teacher).map(t=>{const as=db.assignments.filter(a=>a.teacherId===t.id);return `<tr><td>${esc(t.name)}</td><td>${esc(t.specialty||'—')}</td><td>${as.length}</td><td>${as.reduce((n,a)=>n+(+a.weeklyPeriods||0),0)}</td><td>${esc(as.map(a=>{const sec=db.sections.find(x=>x.id===a.sectionId);const stage=stages.find(g=>g.id===sec?.stageId);return (stage?.name||'—')+' / '+(sec?.name||'—')+' — '+(db.subjects.find(s=>s.id===a.subjectId)?.name||'—')+' ('+a.weeklyPeriods+')'}).join('، ')||'غير مكلف')}</td><td><button class="secondary audit-teacher" data-teacher="${esc(t.id)}">تكليفات المدرس</button></td></tr>`}).join('')}</tbody></table></div></div>`;
 ['stage','section','status','teacher'].forEach(key=>{$('#audit'+key[0].toUpperCase()+key.slice(1)).onchange=e=>{auditState[key]=e.target.value;if(key==='stage')auditState.section='all';audit()}});
 document.querySelectorAll('.audit-fix').forEach(b=>b.onclick=()=>{window.auditTarget={stageId:b.dataset.stage,sectionId:b.dataset.section,subjectId:b.dataset.subject,teacherId:b.dataset.teacher||null};if(!window.auditTarget.teacherId){window.auditTarget.teacherId=db.teachers[0]?.id||null}if(window.auditTarget.teacherId)window.assignTeacher=window.auditTarget.teacherId;page='assignments';render()});
 document.querySelectorAll('.audit-teacher').forEach(b=>b.onclick=()=>{window.assignTeacher=b.dataset.teacher;page='assignments';render()});
 $('#auditCSV').onclick=()=>{const rows=[['المرحلة','الشعبة','المادة','المخطط','المكلف','الفرق','المدرسون','الحالة'],...filtered.map(x=>[x.stage.name,x.section.name,x.subject?.name||'',x.planned,x.assigned,x.difference,x.assignments.map(a=>teacherName(a.teacherId)).join(' / '),names[x.status]])];const csv='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='assignment-audit.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000)};
 $('#auditPrint').onclick=()=>window.print();
}
function defaultRule(tid){let unavailable={};db.days.filter(d=>d.active).forEach(d=>unavailable[d.id]=[]);return {teacherId:tid,unavailable,preferred:[],avoid:[],maxDaily:7,consecutive:'neutral'}}
function rule(tid){if(!db.teacherRules[tid])db.teacherRules[tid]=defaultRule(tid);return db.teacherRules[tid]}
function constraints(){if(!db.teachers.length){$('#workspace').innerHTML='<h2>قيود المدرسين</h2><div class="notice warning">أضف المدرسين أولاً.</div>';return}let tid=(window.constraintTeacher&&db.teachers.some(t=>t.id===window.constraintTeacher))?window.constraintTeacher:db.teachers[0].id;window.constraintTeacher=tid;let r=rule(tid),maxP=Math.max(0,...db.days.filter(d=>d.active).map(d=>d.periods));let grid=`<div class="slot-grid" style="--periods:${maxP}"><div class="slot-head">اليوم</div>${Array.from({length:maxP},(_,i)=>`<div class="slot-head">${i+1}</div>`).join('')}${db.days.filter(d=>d.active).map(d=>`<div class="slot-head">${esc(d.name)}</div>${Array.from({length:maxP},(_,i)=>i<d.periods?`<div class="slot ${(r.unavailable[d.id]||[]).includes(i+1)?'unavailable':'available'}${(r.statusBlocked||[]).includes(d.id)?' status-day':''}" data-slot="${d.id}|${i+1}">${(r.unavailable[d.id]||[]).includes(i+1)?'غير متاح':'متاح'}</div>`:`<div>—</div>`).join('')}`).join('')}</div>`;let pref=Array.from({length:maxP},(_,i)=>{let p=i+1,state=r.preferred.includes(p)?'preferred':r.avoid.includes(p)?'avoid':'';return `<button class="pref ${state}" data-pref="${p}">الحصة ${p}: ${state==='preferred'?'مفضلة':state==='avoid'?'تجنب':'عادية'}</button>`}).join('');$('#workspace').innerHTML=`<h2>قيود وتفضيلات المدرسين</h2><div class="field"><label>المدرس</label><select id="constraintTeacher">${db.teachers.map(t=>`<option value="${t.id}" ${t.id===tid?'selected':''}>${esc(t.name)}</option>`).join('')}</select></div>${teacherAssignmentsPanel(tid)}<h3>التوفر الأسبوعي</h3><div class="notice">اضغط أي حصة للتبديل بين متاح وغير متاح. اضغط اسم اليوم لتعطيل/إتاحة اليوم بالكامل.</div><div class="actions">${db.days.filter(d=>d.active).map(d=>`<button class="secondary" data-daytoggle="${d.id}">${esc(d.name)}: ${(r.unavailable[d.id]||[]).length>=d.periods?'غير متاح':'متاح جزئياً/كلياً'}</button>`).join('')}</div><div class="availability">${grid}</div><h3>تفضيل أرقام الحصص</h3><div class="pref-grid">${pref}</div><div class="grid" style="margin-top:18px"><div class="field"><label>الحد الأعلى المفضل للحصص اليومية</label><input id="maxDaily" type="number" min="1" max="12" value="${r.maxDaily}"></div><div class="field"><label>الحد الأدنى في يوم التدريس (0 = لا يوجد)</label><input id="minDaily" type="number" min="0" max="12" value="${r.minDaily||0}"></div><div class="field"><label>الحصص المتتالية</label><select id="consecutive"><option value="neutral" ${r.consecutive==='neutral'?'selected':''}>لا تفضيل</option><option value="prefer" ${r.consecutive==='prefer'?'selected':''}>أفضل المتتالية</option><option value="avoid" ${r.consecutive==='avoid'?'selected':''}>أفضل عدم التتالي</option></select></div></div><div class="actions"><button id="saveRules">حفظ القيود</button></div>`;$('#constraintTeacher').onchange=e=>{window.constraintTeacher=e.target.value;constraints()};{const st=(db.teacherStatus||{})[tid];if(st&&st.type&&st.type!=='regular'){const g=document.querySelector('#workspace .slot-grid');if(g)g.insertAdjacentHTML('beforebegin','<div class="notice" id="statusSyncNote">ℹ️ حالة هذا المدرس: <b>'+esc(({released:'مفرّغ',contract:'متعاقد'})[st.type]||st.type)+'</b>. أيام تدريسه تتزامن تلقائياً مع قيوده: فتح أي خانة في يوم محجوب يضيف اليوم إلى أيام تدريسه، وحجب كل حصص اليوم يزيله منها. الأيام المظلّلة محجوبة الآن بحكم حالته.</div>')}}document.querySelectorAll('[data-slot]').forEach(x=>x.onclick=()=>{let [d,p]=x.dataset.slot.split('|');p=+p;r.unavailable[d]=r.unavailable[d]||[];r.unavailable[d]=r.unavailable[d].includes(p)?r.unavailable[d].filter(v=>v!==p):[...r.unavailable[d],p];const m=syncStatusFromRules(tid);save();constraints();if(m)alert(m)});document.querySelectorAll('[data-daytoggle]').forEach(x=>x.onclick=()=>{let d=db.days.find(z=>z.id===x.dataset.daytoggle);r.unavailable[d.id]=(r.unavailable[d.id]||[]).length>=d.periods?[]:Array.from({length:d.periods},(_,i)=>i+1);const m=syncStatusFromRules(tid);save();constraints();if(m)alert(m)});document.querySelectorAll('[data-pref]').forEach(x=>x.onclick=()=>{let p=+x.dataset.pref;if(r.preferred.includes(p)){r.preferred=r.preferred.filter(v=>v!==p);r.avoid.push(p)}else if(r.avoid.includes(p)){r.avoid=r.avoid.filter(v=>v!==p)}else r.preferred.push(p);save();constraints()});$('#saveRules').onclick=()=>{r.maxDaily=Math.max(1,+$('#maxDaily').value||1);r.minDaily=Math.max(0,+$('#minDaily').value||0);if(r.minDaily>r.maxDaily)return alert('الحد الأدنى أكبر من الحد الأعلى');r.consecutive=$('#consecutive').value;save();alert('تم حفظ قيود المدرس')}}

function advanced(){
 const opts=(arr,all='الكل')=>`<option value="">${all}</option>`+arr.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
 const active=db.days.filter(d=>d.active&&d.periods);
 const label=r=>{let t=db.teachers.find(x=>x.id===r.teacherId),sec=db.sections.find(x=>x.id===r.sectionId),st=db.stages.find(x=>x.id===(r.stageId||sec?.stageId)),sub=db.subjects.find(x=>x.id===r.subjectId),day=db.days.find(x=>x.id===r.dayId);return [({section:'الشعبة',teacher:'المدرس',subject:'المادة'})[r.target],t?.name,st?.name,sec?.name,sub?.name,day?.name,`الحصص ${r.from}–${r.to}`,r.mode==='allow'?'مسموحة فقط':'ممنوعة',r.strict==='soft'?'تفضيلي':'إلزامي'].filter(Boolean).join(' — ')};
 $('#workspace').innerHTML=`<h2>مركز القيود المتقدمة</h2><div class="notice">احصر أو امنع أوقات شعبة أو مدرس أو مادة. يمكن تخصيص المدرس لمرحلة أو شعبة. القيود الإلزامية يطبقها المحرك أثناء التوليد، والتفضيلية تؤثر في ترتيب الاختيارات. إضافة القيد لا تمس الجدول المعتمد حتى تطلب إعادة التوليد.</div>
 <div class="grid"><div class="field"><label>القيد على</label><select id="arTarget"><option value="section">شعبة / مرحلة</option><option value="teacher">مدرس</option><option value="subject">مادة</option></select></div>
 <div class="field"><label>نوع القيد</label><select id="arMode"><option value="allow">السماح في النطاق فقط</option><option value="block">منع النطاق</option></select></div>
 <div class="field"><label>المرحلة (اختياري)</label><select id="arStage">${opts(db.stages,'جميع المراحل')}</select></div>
 <div class="field"><label>الشعبة (اختياري)</label><select id="arSection">${opts(db.sections,'جميع الشعب ضمن المرحلة')}</select></div>
 <div class="field"><label>المدرس</label><select id="arTeacher">${opts(db.teachers,'اختر المدرس')}</select></div>
 <div class="field"><label>المادة</label><select id="arSubject">${opts(db.subjects,'اختر المادة')}</select></div>
 <div class="field"><label>اليوم</label><select id="arDay">${opts(active,'جميع أيام الدوام')}</select></div>
 <div class="field"><label>من الحصة</label><input id="arFrom" type="number" min="1" max="12" value="4"></div>
 <div class="field"><label>إلى الحصة</label><input id="arTo" type="number" min="1" max="12" value="6"></div>
 <div class="field"><label>الأهمية</label><select id="arStrict"><option value="hard">إلزامي</option><option value="soft">تفضيلي</option></select></div></div>
 <div class="actions"><button id="arAdd">إضافة القيد</button><button class="secondary" id="arCheck">فحص تعارضات القيود</button></div><div id="arReport"></div>
 <h3>القيود المسجلة (${db.advancedRules.length})</h3>${db.advancedRules.map(r=>`<div class="lock-card"><b>${esc(label(r))}</b><div class="actions"><button class="danger" data-ar-del="${esc(r.id)}">حذف القيد</button></div></div>`).join('')||'<div class="empty">لم تضف قيوداً بعد.</div>'}`;
 $('#arAdd').onclick=()=>{let val=id=>$('#'+id).value,r={id:uid('ar'),target:val('arTarget'),mode:val('arMode'),stageId:val('arStage'),sectionId:val('arSection'),teacherId:val('arTeacher'),subjectId:val('arSubject'),dayId:val('arDay'),from:+val('arFrom'),to:+val('arTo'),strict:val('arStrict')};if(!Number.isInteger(r.from)||!Number.isInteger(r.to)||r.from<1||r.to<r.from||r.to>12)return alert('نطاق الحصص غير صحيح');if(r.target==='teacher'&&!r.teacherId||r.target==='subject'&&!r.subjectId||r.target==='section'&&!r.sectionId&&!r.stageId)return alert('اختر المدرس أو المادة أو المرحلة/الشعبة');if(r.sectionId&&r.stageId&&db.sections.find(x=>x.id===r.sectionId)?.stageId!==r.stageId)return alert('الشعبة لا تنتمي للمرحلة المختارة');db.advancedRules.push(r);save();advanced()};
 document.querySelectorAll('[data-ar-del]').forEach(b=>b.onclick=async ()=>{if(!(await masarConfirm('حذف القيد؟')))return;db.advancedRules=db.advancedRules.filter(r=>r.id!==b.dataset.arDel);save();advanced()});
 $('#arCheck').onclick=()=>{let errors=[];for(const r of db.advancedRules.filter(x=>x.strict!=='soft')){for(const sec of db.sections.filter(x=>!r.sectionId||r.sectionId===x.id).filter(x=>!r.stageId||r.stageId===x.stageId)){if(r.target==='teacher'||r.target==='subject')continue;for(const d of active.filter(x=>!r.dayId||r.dayId===x.id)){let cap=Math.min(d.periods,+(db.stageDayPeriods?.[sec.stageId]?.[d.id]??d.periods));let n=Array.from({length:cap},(_,i)=>i+1).filter(p=>r.mode==='allow'?p>=r.from&&p<=r.to:!(p>=r.from&&p<=r.to)).length;if(n===0)errors.push(`${sec.name} — ${esc(d.name)}: لا توجد حصص مسموحة`);}}}$('#arReport').innerHTML=errors.length?`<div class="notice warning">${errors.map(esc).join('<br>')}</div>`:'<div class="notice">لم يُكتشف منع كامل ليوم شعبة. قد توجد تعارضات أخرى تُكتشف عند التوليد.</div>'};
}

function fixed(){if(!db.assignments.length){$('#workspace').innerHTML='<h2>الحصص المثبتة</h2><div class="notice warning">أضف التكليفات أولاً.</div>';return}let active=db.days.filter(d=>d.active);let label=a=>{let t=db.teachers.find(x=>x.id===a.teacherId),s=db.subjects.find(x=>x.id===a.subjectId),se=db.sections.find(x=>x.id===a.sectionId),g=se&&db.stages.find(x=>x.id===se.stageId);return `${t?.name||'—'} — ${s?.name||'—'} — ${g?.name||''} ${se?.name||''}`};$('#workspace').innerHTML=`<h2>الحصص المثبتة</h2><div class="notice">الحصة المثبتة ستبقى في موقعها عند التوليد لاحقاً.</div><div class="grid"><div class="field"><label>التكليف</label><select id="fAssignment">${db.assignments.map(a=>`<option value="${a.id}">${esc(label(a))}</option>`).join('')}</select></div><div class="field"><label>اليوم</label><select id="fDay">${active.map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select></div><div class="field"><label>الحصة</label><input id="fPeriod" type="number" min="1" value="1"></div></div><div class="actions"><button id="addFixed">تثبيت الحصة</button></div>${db.fixedLessons.map(f=>{let a=db.assignments.find(x=>x.id===f.assignmentId),d=db.days.find(x=>x.id===f.dayId);return `<div class="lock-card"><b>${a?esc(label(a)):'تكليف محذوف'}</b><div class="muted">${d?.name||'—'} — الحصة ${f.period}</div><div class="actions"><button class="danger" data-del-fixed="${f.id}">إلغاء التثبيت</button></div></div>`}).join('')||'<div class="empty">لا توجد حصص مثبتة</div>'}`;$('#addFixed').onclick=()=>{let assignmentId=$('#fAssignment').value,dayId=$('#fDay').value,period=+$('#fPeriod').value,d=db.days.find(x=>x.id===dayId),a=db.assignments.find(x=>x.id===assignmentId);if(!d||period<1||period>d.periods)return alert('رقم الحصة غير صالح لهذا اليوم');let r=rule(a.teacherId);if((r.unavailable[dayId]||[]).includes(period))return alert('لا يمكن التثبيت: المدرس غير متاح في هذا الوقت');let conflict=db.fixedLessons.find(f=>f.dayId===dayId&&f.period===period&&(()=>{let fa=db.assignments.find(x=>x.id===f.assignmentId);return fa&&(fa.teacherId===a.teacherId||fa.sectionId===a.sectionId)})());if(conflict)return alert('تعارض: المدرس أو الشعبة لديه حصة مثبتة في هذا الوقت');db.fixedLessons.push({id:uid('fix'),assignmentId,dayId,period});save();fixed()};document.querySelectorAll('[data-del-fixed]').forEach(b=>b.onclick=()=>{db.fixedLessons=db.fixedLessons.filter(x=>x.id!==b.dataset.delFixed);save();fixed()})}


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
  box.querySelector('#saveEA').onclick=async ()=>{let teacherId=box.querySelector('#eTeacher').value,subjectId=box.querySelector('#eSubject').value,sectionId=box.querySelector('#eSection').value,weeklyPeriods=+box.querySelector('#eWeekly').value;if(weeklyPeriods<1)return alert('عدد الحصص غير صالح');if(db.assignments.some(x=>x.id!==a.id&&x.teacherId===teacherId&&x.subjectId===subjectId&&x.sectionId===sectionId))return alert('يوجد تكليف مطابق');if(!(await invalidateTimetable('تعديل تكليف')))return;a.teacherId=teacherId;a.subjectId=subjectId;a.sectionId=sectionId;a.weeklyPeriods=weeklyPeriods;db.fixedLessons=db.fixedLessons.filter(f=>f.assignmentId!==a.id);save();box.remove();assignments()};
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
    if(!d.active||f.period>sectionDayPeriods(db.sections.find(s=>s.id===a.sectionId)||{stageId:''},d)) push('red','حصة مثبتة خارج الدوام',`${t?.name||'مدرس'} — ${esc(d.name)} الحصة ${f.period}.`,`FIX_OUT:${f.id}`);
    if((r.unavailable[d.id]||[]).includes(f.period)) push('red','حصة مثبتة في وقت غير متاح',`${t?.name||'مدرس'} غير متاح في ${esc(d.name)} الحصة ${f.period}.`,`FIX_UNAVAILABLE:${f.id}`);
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
// Read-only direct diagnostics. Never mutates timetable, assignments or rules.

// Exact maximum-flow necessary-condition test for each teacher. Unlike summing
// per-assignment openings, it counts every real time slot only once and respects
// the teacher's daily maximum. A deficit is a mathematically proven blocker.
function teacherCombinedCapacityDiagnostics(){
 const out=[],days=db.days.filter(d=>d.active&&d.periods>0).sort((a,b)=>a.order-b.order);
 const hardRules=(db.advancedRules||[]).filter(r=>r.strict!=='soft');
 for(const t of db.teachers){
  const aa=db.assignments.filter(a=>a.teacherId===t.id&&+a.weeklyPeriods>0);
  const demand=aa.reduce((v,a)=>v+(+a.weeklyPeriods),0);if(!demand)continue;
  const tr=db.teacherRules?.[t.id]||{};
  const slots=[];for(const d of days)for(let p=1;p<=d.periods;p++)if(!(tr.unavailable?.[d.id]||[]).includes(p))slots.push({day:d,period:p});
  const n=2+aa.length+slots.length+days.length,source=0,sink=n-1;
  const g=Array.from({length:n},()=>[]);
  function edge(a,b,c){const f={to:b,cap:c,rev:g[b].length},r={to:a,cap:0,rev:g[a].length};g[a].push(f);g[b].push(r)}
  const baseA=1,baseS=baseA+aa.length,baseD=baseS+slots.length;
  aa.forEach((a,i)=>edge(source,baseA+i,+a.weeklyPeriods));
  slots.forEach((sl,j)=>{const di=days.findIndex(d=>d.id===sl.day.id);edge(baseS+j,baseD+di,1)});
  days.forEach((d,i)=>edge(baseD+i,sink,+tr.maxDaily>0?+tr.maxDaily:d.periods));
  aa.forEach((a,i)=>{
   const sec=db.sections.find(x=>x.id===a.sectionId);if(!sec)return;
   const sr=db.subjectRules?.[a.subjectId]||{},hard=sr.strict!=='soft'&&(!sr.stageId||sr.stageId===sec.stageId);
   slots.forEach((sl,j)=>{
    const cap=sectionDayPeriods(sec,sl.day),p=sl.period;if(p>cap) return;
    if(hard&&(sr.noFirst&&p===1||sr.noLast&&p===cap))return;
    if(hardRules.some(r=>advancedDiagnosticMatch(r,a,sec,sl.day.id,p)&&((r.mode==='allow'&&(p<+r.from||p>+r.to))||(r.mode!=='allow'&&p>=+r.from&&p<=+r.to))))return;
    edge(baseA+i,baseS+j,1);
   });
  });
  let flow=0;while(true){const parent=Array(n).fill(null),queue=[source];parent[source]=[-1,-1];
   for(let h=0;h<queue.length&&parent[sink]===null;h++){const u=queue[h];for(let k=0;k<g[u].length;k++){const e=g[u][k];if(e.cap>0&&parent[e.to]===null){parent[e.to]=[u,k];queue.push(e.to)}}}
   if(parent[sink]===null)break;let v=sink;while(v!==source){const [u,k]=parent[v];g[u][k].cap--;g[v][g[u][k].rev].cap++;v=u}flow++;
  }
  if(flow<demand){const reachable=new Set([source]),queue=[source];for(let h=0;h<queue.length;h++){const u=queue[h];for(const e of g[u])if(e.cap>0&&!reachable.has(e.to)){reachable.add(e.to);queue.push(e.to)}}
   const affected=aa.filter((a,i)=>reachable.has(baseA+i));
   out.push({teacher:t.name,teacherId:t.id,required:demand,available:flow,deficit:demand-flow,assignments:affected.map(a=>({assignmentId:a.id,sectionId:a.sectionId,subjectId:a.subjectId,weeklyPeriods:+a.weeklyPeriods}))});
  }
 }
 return out;
}


// Hall's theorem diagnostic: each section at a given period requires a DISTINCT teacher.
// Maximum matching exposes a concrete group of sections with fewer eligible teachers.
// This is a proven blocker independent of the backtracking generator.
function concurrentSectionDiagnostics(){
 const issues=[],days=db.days.filter(d=>d.active&&d.periods>0).sort((a,b)=>a.order-b.order);
 const hardRules=(db.advancedRules||[]).filter(r=>r.strict!=='soft');
 const sectionName=sec=>(db.stages.find(g=>g.id===sec.stageId)?.name||sec.stageId)+' '+sec.name;
 function eligible(a,sec,day,p){
  const tr=db.teacherRules?.[a.teacherId]||{},sr=db.subjectRules?.[a.subjectId]||{};
  if((tr.unavailable?.[day.id]||[]).includes(p))return false;
  const hard=sr.strict!=='soft'&&(!sr.stageId||sr.stageId===sec.stageId),cap=sectionDayPeriods(sec,day);
  if(hard&&(sr.noFirst&&p===1||sr.noLast&&p===cap))return false;
  return !hardRules.some(r=>advancedDiagnosticMatch(r,a,sec,day.id,p)&&((r.mode==='allow'&&(p<+r.from||p>+r.to))||(r.mode!=='allow'&&p>=+r.from&&p<=+r.to)));
 }
 for(const day of days)for(let p=1;p<=day.periods;p++){
  const sections=db.sections.filter(sec=>sectionDayPeriods(sec,day)>=p);
  const choices=sections.map(sec=>[...new Set(db.assignments.filter(a=>a.sectionId===sec.id&&+a.weeklyPeriods>0&&eligible(a,sec,day,p)).map(a=>a.teacherId))]);
  const owner=new Map();function match(i,seen){for(const tid of choices[i]){if(seen.has(tid))continue;seen.add(tid);const j=owner.get(tid);if(j===undefined||match(j,seen)){owner.set(tid,i);return true}}return false}
  const unmatched=[];for(let i=0;i<sections.length;i++)if(!match(i,new Set()))unmatched.push(i);
  if(!unmatched.length)continue;
  // Alternating reachable sections form a Hall-deficient witness.
  const affected=new Set(unmatched),queue=[...unmatched];for(let h=0;h<queue.length;h++)for(const tid of choices[queue[h]]){const j=owner.get(tid);if(j!==undefined&&!affected.has(j)){affected.add(j);queue.push(j)}}
  const group=[...affected],eligibleTeachers=[...new Set(group.flatMap(i=>choices[i]))];
  const alternatives=[];for(const i of group)for(const a of db.assignments){if(a.sectionId!==sections[i].id||+a.weeklyPeriods<=0||eligibleTeachers.includes(a.teacherId))continue;
   const tr=db.teacherRules?.[a.teacherId]||{};
   if((tr.unavailable?.[day.id]||[]).includes(p)&&!alternatives.some(x=>x.teacherId===a.teacherId))alternatives.push({teacherId:a.teacherId,teacher:db.teachers.find(t=>t.id===a.teacherId)?.name||a.teacherId,section:sectionName(sections[i]),subject:db.subjects.find(x=>x.id===a.subjectId)?.name||a.subjectId});
  }
  const names=eligibleTeachers.map(id=>db.teachers.find(t=>t.id===id)?.name||id);
  issues.push({level:'block',title:`تعارض توقيت مثبت — ${day.name}، الحصة ${p}`,detail:`تحتاج ${group.length} شعب (${group.map(i=>sectionName(sections[i])).join('، ')}) إلى ${group.length} مدرسين مختلفين في الوقت نفسه، لكن المسموح لهم وفق القيود ${eligibleTeachers.length} فقط: ${names.join('، ')}. العجز ${group.length-eligibleTeachers.length} مدرس/حصة.`,where:'teachers',ruleIds:[],fix:alternatives.length?`افتح الحصة ${p} يوم ${day.name} لأحد المدرسين المكلفين بالشعب المتأثرة، مثل ${alternatives.slice(0,5).map(a=>`${a.teacher} (${a.subject}، ${a.section})`).join(' أو ')}. ثم أعد الفحص والتوليد. هذا تعديل مقترح يحتاج موافقتك ولا يضمن وحده حل جميع التعارضات.`:'راجع تكليفات الشعب المتأثرة أو قيود المواد/المدرسين لهذه الحصة؛ يلزم إضافة مدرس متاح واحد على الأقل.',witness:{dayId:day.id,period:p,sectionIds:group.map(i=>sections[i].id),teacherIds:eligibleTeachers,alternatives}});
 }
 return issues;
}

function directGenerationDiagnostics(){
 const issues=concurrentSectionDiagnostics(),active=db.days.filter(d=>d.active&&d.periods>0);
 const add=(level,title,detail,where,ruleIds=[],fix='')=>issues.push({level,title,detail,where,ruleIds:Array.isArray(ruleIds)?ruleIds:[],fix:fix||(typeof ruleIds==='string'?ruleIds:'')});
 const rules=(db.advancedRules||[]).filter(r=>r.strict!=='soft');
 for(const x of teacherCombinedCapacityDiagnostics())add('block',`تعارض مركب مؤكد — ${x.teacher}`,`مطلوب ${x.required} حصة، لكن توزيع التكليفات معاً على الفترات المختلفة والحد اليومي لا يسمح إلا بـ ${x.available}؛ العجز ${x.deficit} حصة.`, 'teachers',[],`راجع أيام وفترات عدم الإتاحة أو القيود المتقدمة لتكليفات المدرس ${x.teacher}، أو أعد توزيع بعض التكليفات. لا يُعدّل التطبيق أي قيد تلقائياً.`);
 const stageName=id=>db.stages.find(g=>g.id===id)?.name||'مرحلة غير معروفة';
 for(const sec of db.sections){
  const assigned=db.assignments.filter(a=>a.sectionId===sec.id&&+a.weeklyPeriods>0);
  const required=assigned.reduce((n,a)=>n+(+a.weeklyPeriods||0),0);
  let totalCap=0,engineCap=0;
  for(const day of active){
   const cap=sectionDayPeriods(sec,day);totalCap+=cap;
   const possible=[];
   for(let p=1;p<=cap;p++){
    if(assigned.some(a=>!rules.some(r=>advancedDiagnosticMatch(r,a,sec,day.id,p)&&((r.mode==='allow'&&(p<r.from||p>r.to))||(r.mode==='block'&&p>=r.from&&p<=r.to)))))possible.push(p);
   }
   // Current generator builds contiguous daily prefixes, so an unavailable first slot blocks later slots.
   let prefix=0;for(let p=1;p<=cap;p++){if(!possible.includes(p))break;prefix++}
   engineCap+=prefix;
   const targeted=rules.filter(r=>r.target==='section'&&(!r.sectionId||r.sectionId===sec.id)&&(!r.stageId||r.stageId===sec.stageId)&&(!r.dayId||r.dayId===day.id));
   if(targeted.length&&possible.length&&prefix<possible.length){
    add('limitation',`قيد نطاق لا يدعمه التوليد الحالي — ${stageName(sec.stageId)} ${sec.name}`,`${day.name}: توجد حصص مسموحة (${possible.join('، ')}) بعد خانة ممنوعة. المحرك الحالي يبدأ دوام الشعبة من الحصة الأولى ولا يستطيع القفز إلى الحصة الرابعة. هذا القيد قد يمنع التوليد؛ يلزم دعم البداية المتأخرة أو تغيير النطاق.`, 'advanced',targeted.map(r=>r.id));
   }
  }
  if(required>totalCap)add('block',`تجاوز سعة الشعبة — ${stageName(sec.stageId)} ${sec.name}`,`المطلوب ${required} حصة أسبوعياً والسعة ${totalCap}.`,'assignments');
  if(required>engineCap&&rules.some(r=>r.target==='section'&&(!r.sectionId||r.sectionId===sec.id)&&(!r.stageId||r.stageId===sec.stageId)))add('block',`قيود الشعبة تتجاوز قدرة المحرك — ${stageName(sec.stageId)} ${sec.name}`,`المطلوب ${required} حصة، وأقصى ما يسمح به نمط الدوام المتصل الحالي ${engineCap} حصة.`, 'advanced');
 }
 for(const a of db.assignments.filter(a=>+a.weeklyPeriods>0)){
  const sec=db.sections.find(s=>s.id===a.sectionId),t=db.teachers.find(t=>t.id===a.teacherId),sub=db.subjects.find(s=>s.id===a.subjectId);
  if(!sec||!t||!sub){add('block','تكليف بمرجع مفقود',`التكليف ${a.id||'غير معروف'} يشير إلى شعبة أو مدرس أو مادة غير موجودة.`,'assignments');continue}
  const tr=db.teacherRules?.[t.id]||{},sr=db.subjectRules?.[sub.id]||{};
  let possible=0;const perDay=[];
  for(const day of active){let n=0,cap=sectionDayPeriods(sec,day);for(let p=1;p<=cap;p++){
   if((tr.unavailable?.[day.id]||[]).includes(p))continue;
   if(sr.strict!=='soft'&&(!sr.stageId||sr.stageId===sec.stageId)&&((sr.noFirst&&p===1)||(sr.noLast&&p===cap)))continue;
   if(rules.some(r=>advancedDiagnosticMatch(r,a,sec,day.id,p)&&((r.mode==='allow'&&(p<r.from||p>r.to))||(r.mode==='block'&&p>=r.from&&p<=r.to))))continue;
   n++;
  }possible+=n;perDay.push(Math.min(n,Math.max(1,+tr.maxDaily||99)))}
  const limit=perDay.reduce((x,y)=>x+y,0),need=+a.weeklyPeriods;
  if(need>limit)add('block',`تكليف غير قابل للتوزيع — ${sub.name} / ${t.name}`,`${stageName(sec.stageId)} ${sec.name}: مطلوب ${need} حصص والمتاح ${limit} بعد القيود اليومية والقيود الإلزامية.`, 'advanced',rules.filter(r=>r.target!=='section'&&(!r.teacherId||r.teacherId===t.id)&&(!r.subjectId||r.subjectId===sub.id)).map(r=>r.id));
 }
 for(const t of db.teachers){const need=db.assignments.filter(a=>a.teacherId===t.id).reduce((n,a)=>n+(+a.weeklyPeriods||0),0);if(!need)continue;const tr=db.teacherRules?.[t.id]||{};let cap=0;for(const d of active){let n=0;for(let p=1;p<=d.periods;p++)if(!(tr.unavailable?.[d.id]||[]).includes(p))n++;cap+=Math.min(n,Math.max(1,+tr.maxDaily||99))}if(need>cap)add('block',`نصاب المدرس يتجاوز التوفر — ${t.name}`,`مطلوب ${need} حصة، والمتاح ${cap} فقط وفق قيود المدرس.`,'constraints')}
 {const seen=new Set(issues.map(x=>x.title));deepDiagnosis().forEach(x=>{if(!seen.has(x.title)&&!(x.level==='block'&&x.title.startsWith('المدرس ')&&issues.some(y=>y.level==='block'&&y.title.includes('نصاب المدرس يتجاوز التوفر')&&y.title.includes(x.title.slice(8).split(':')[0]))))issues.push(x)})}
 for(const t of db.teachers){const i=teacherLoadInfo(t.id);if(i.cap&&i.need<=i.cap&&i.need/i.cap>=0.85)add('warn','نصاب مرتفع جداً — '+t.name,teacherLoadText(i),'constraints',i.cap<i.open?'ارفع الحد الأعلى اليومي لهذا المدرس'+(i.mn?' أو خفّف حدّه الأدنى':'')+'، أو أتح له حصصاً إضافية، أو وزّع جزءاً من تكليفاته.':'أتح له حصصاً أو أياماً إضافية، أو وزّع جزءاً من تكليفاته على مدرس آخر.')}
 if(!issues.some(x=>x.level==='block'||x.level==='limitation')&&!issues.some(x=>x.level==='warn'))add('info','لا يوجد تعارض مباشر مثبت','لم تكشف الفحوص الحسابية سبباً حاسماً. قد يكون هناك تعارض مركب أو انتهاء مهلة البحث؛ هذه النتيجة لا تضمن إمكانية التوليد.','generator');
 return issues;
}
function advancedDiagnosticMatch(r,a,sec,dayId,p){return (!r.dayId||r.dayId===dayId)&&(!r.stageId||r.stageId===sec.stageId)&&(!r.sectionId||r.sectionId===sec.id)&&(r.target!=='teacher'||r.teacherId===a.teacherId)&&(r.target!=='subject'||r.subjectId===a.subjectId)}

// ===== التحليل التفصيلي: تدفق أقصى (Max-Flow) يثبت استحالة التوزيع ويحدد المجموعة المسببة =====
function slotAllowedFor(a,sec,day,p){
 const t=db.teacherRules?.[a.teacherId]||{},sr=db.subjectRules?.[a.subjectId]||{},cap=sectionDayPeriods(sec,day);
 if(p>cap)return false;
 if((t.unavailable?.[day.id]||[]).some(x=>+x===+p))return false;
 if(sr.strict!=='soft'){if(sr.noFirst&&p===1)return false;if(sr.noLast&&p===cap)return false}
 return !(db.advancedRules||[]).some(r=>r.strict!=='soft'&&advancedDiagnosticMatch(r,a,sec,day.id,p)&&((r.mode==='allow'&&(p<r.from||p>r.to))||(r.mode==='block'&&p>=r.from&&p<=r.to)));
}
// items: [{need, slots:[slotIndex...]}]; slotDay: dayIndex per slot; dayCap: capacity per day. Returns flow and the starved set (Hall violator).
function flowCheck(items,slotDay,dayCap){
 const nI=items.length,nS=slotDay.length,nD=dayCap.length,S=0,T=1,I0=2,S0=2+nI,D0=2+nI+nS,N=D0+nD;
 const g=Array.from({length:N},()=>[]),E=[];
 const add=(u,v,c)=>{g[u].push(E.length);E.push({v,c});g[v].push(E.length);E.push({v:u,c:0})};
 items.forEach((it,i)=>{add(S,I0+i,it.need);it.slots.forEach(k=>add(I0+i,S0+k,1))});
 slotDay.forEach((d,k)=>add(S0+k,D0+d,1));dayCap.forEach((c,d)=>add(D0+d,T,c));
 let flow=0;
 for(;;){const lv=Array(N).fill(-1);lv[S]=0;const q=[S];for(let h=0;h<q.length;h++){const u=q[h];for(const id of g[u])if(E[id].c>0&&lv[E[id].v]<0){lv[E[id].v]=lv[u]+1;q.push(E[id].v)}}
  if(lv[T]<0)break;const it=Array(N).fill(0);
  const dfs=(u,f)=>{if(u===T)return f;for(;it[u]<g[u].length;it[u]++){const id=g[u][it[u]],e=E[id];if(e.c>0&&lv[e.v]===lv[u]+1){const r=dfs(e.v,Math.min(f,e.c));if(r>0){e.c-=r;E[id^1].c+=r;return r}}}return 0};
  for(let f;(f=dfs(S,1e9))>0;)flow+=f}
 const seen=Array(N).fill(false);seen[S]=true;const q=[S];for(let h=0;h<q.length;h++)for(const id of g[q[h]])if(E[id].c>0&&!seen[E[id].v]){seen[E[id].v]=true;q.push(E[id].v)}
 const need=items.reduce((n,x)=>n+x.need,0);
 return {flow,need,starved:items.map((_,i)=>i).filter(i=>seen[I0+i]&&items[i].need>0),slotsSeen:slotDay.filter((_,k)=>seen[S0+k]).length};
}
function deepDiagnosis(){
 const out=[],active=db.days.filter(d=>d.active&&d.periods>0).sort((a,b)=>a.order-b.order);
 const stageName=id=>db.stages.find(g=>g.id===id)?.name||'';
 const lbl=a=>{const su=db.subjects.find(x=>x.id===a.subjectId),t=db.teachers.find(x=>x.id===a.teacherId);return (su?.name||'مادة')+' / '+(t?.name||'مدرس')};
 const add=(level,title,detail,where,fix)=>out.push({level,title,detail,where,fix,ruleIds:[]});
 // (1) كل شعبة: هل تتسع مواد الشعبة للخانات المسموحة لها؟ (ويكشف خانة لا يستطيع أي مدرس ملأها)
 for(const sec of db.sections){
  const as=db.assignments.filter(a=>a.sectionId===sec.id&&+a.weeklyPeriods>0);if(!as.length)continue;
  const slots=[],slotDay=[];active.forEach((d,di)=>{for(let p=1;p<=sectionDayPeriods(sec,d);p++){slots.push({d,p});slotDay.push(di)}});
  const items=as.map(a=>({need:+a.weeklyPeriods,slots:slots.map((s,k)=>slotAllowedFor(a,sec,s.d,s.p)?k:-1).filter(k=>k>=0)}));
  const name=stageName(sec.stageId)+' '+sec.name;
  items.forEach((it,i)=>{if(it.slots.length<it.need)add('block',`تكليف لا يجد خانات كافية — ${name}`,`${lbl(as[i])}: يحتاج ${it.need} حصة وله ${it.slots.length} خانة مسموحة فقط (بعد قيود المدرس والمادة والقيود المتقدمة).`,'constraints','أتح للمدرس أو للمادة خانات إضافية في هذه الشعبة، أو خفّف عدد الحصص.')});
  const required=items.reduce((n,x)=>n+x.need,0);if(required>slots.length)continue;
  const r=flowCheck(items,slotDay,active.map(()=>99));
  if(r.flow<r.need){const bad=r.starved.map(i=>lbl(as[i])),sum=r.starved.reduce((n,i)=>n+items[i].need,0);
   add('block',`الشعبة ${name} لا يمكن توزيعها رياضياً`,`المواد (${bad.join('، ')}) تحتاج معاً ${sum} حصة، لكن الخانات المسموحة لها مجتمعة ${r.slotsSeen} فقط. هذا تعارض مثبت لا يحله تغيير ترتيب البحث.`,'constraints','أتح خانات أكثر لمدرسي هذه المواد، أو أزل قيد «أول/آخر حصة» عن بعضها، أو انقل جزءاً من حصصها لمدرس آخر.')}
  const dead=[];active.forEach(d=>{const f=slots.find(x=>x.d===d&&x.p>1&&!as.some(a=>slotAllowedFor(a,sec,x.d,x.p))&&slots.some(y=>y.d===d&&y.p>x.p));if(f)dead.push(d.name+' (من الحصة '+f.p+')')});
  if(dead.length)add('warn',`خانات لا يملؤها أي مدرس — ${name}`,`في ${dead.join('، ')}: لا توجد مادة في هذه الشعبة يستطيع مدرسها الحضور. المحرك يملأ اليوم متصلاً من الحصة الأولى، فكل ما بعد هذه الخانة في ذلك اليوم سيتعطل.`,'constraints','أتح أحد مدرسي الشعبة في هذه الحصص، أو قلّل حصص تلك الأيام لهذه الشعبة.');;
 }
 // (2) كل مدرس: هل تتسع حصصه للخانات المتاحة مع حده اليومي؟
 for(const t of db.teachers){
  const as=db.assignments.filter(a=>a.teacherId===t.id&&+a.weeklyPeriods>0);if(!as.length)continue;
  const tr=db.teacherRules?.[t.id]||{},mx=Math.max(1,+tr.maxDaily||99);
  const slots=[],slotDay=[],map=new Map();
  active.forEach((d,di)=>{const top=Math.max(0,...db.sections.map(sec=>sectionDayPeriods(sec,d)));for(let p=1;p<=top;p++){map.set(di+'|'+p,slots.length);slots.push({d,p});slotDay.push(di)}});
  const items=as.map(a=>{const sec=db.sections.find(s=>s.id===a.sectionId);const ok=new Set();if(sec)slots.forEach((s,k)=>{if(slotAllowedFor(a,sec,s.d,s.p))ok.add(k)});return {need:+a.weeklyPeriods,slots:[...ok]}});
  const r=flowCheck(items,slotDay,active.map(()=>mx));
  if(r.flow<r.need){const bad=r.starved.map(i=>lbl(as[i]));
   add('block',`المدرس ${t.name}: نصابه لا يتسع لأوقاته`,`يحتاج ${r.need} حصة، وأقصى ما يمكن وضعه حسب أوقات إتاحته وحده اليومي (${mx>50?'بلا حد':mx}) هو ${r.flow} حصة. المواد المتأثرة: ${bad.join('، ')}.`,'teachers','أتح له أياماً أو حصصاً إضافية، أو ارفع حده اليومي، أو انقل جزءاً من تكليفاته لمدرس آخر.')}
 }
 // (3) الأكثر تقييداً: أي تكليف تقترب خاناته المسموحة من حصصه
 const tight=[];
 for(const a of db.assignments.filter(a=>+a.weeklyPeriods>0)){const sec=db.sections.find(s=>s.id===a.sectionId);if(!sec)continue;let n=0;active.forEach(d=>{for(let p=1;p<=sectionDayPeriods(sec,d);p++)if(slotAllowedFor(a,sec,d,p))n++});
  if(n>=+a.weeklyPeriods&&n<+a.weeklyPeriods*1.5)tight.push({a,sec,n,ratio:n/+a.weeklyPeriods})}
 tight.sort((x,y)=>x.ratio-y.ratio).slice(0,5).forEach(x=>add('warn',`تكليف مقيّد جداً — ${stageName(x.sec.stageId)} ${x.sec.name}`,`${lbl(x.a)}: ${x.a.weeklyPeriods} حصة مقابل ${x.n} خانة مسموحة فقط. هذا النوع هو أكثر ما يُطيل البحث ويُفشل التوليد.`,'constraints','وسّع خانات المدرس أو المادة قليلاً ليصبح للمحرك هامش للمناورة.'));
 return out;
}

// ===== التشخيص الدقيق بالاختبار التجريبي: يعيد التوليد على نسخ مخففة لتحديد القيد المسبب بالضبط =====
let probeAbort=false;const probeWorkers=new Set();
function probeRun(c,ms){return new Promise(res=>{if(probeAbort)return res({ok:false,aborted:true});let w;try{w=new Worker('generator-worker.js?v='+APP_VERSION)}catch(e){return res({ok:false,error:true})}
 probeWorkers.add(w);let to;const done=r=>{clearTimeout(to);probeWorkers.delete(w);try{w.terminate()}catch(e){}res(r)};to=setTimeout(()=>done({ok:false,timeout:true}),ms+10000);
 w.onmessage=e=>{if(e.data.type==='result')done(e.data.result)};w.onerror=()=>done({ok:false,error:true});w.postMessage({type:'start',db:c,deadlineMs:ms})})}
function probeClone(){const c=JSON.parse(JSON.stringify({...db,timetable:[],printSettings:{}}));return c}
const tName=id=>db.teachers.find(t=>t.id===id)?.name||'مدرس';
const dayName=id=>db.days.find(d=>d.id===id)?.name||id;
function fixedLabel(id){const f=db.fixedLessons.find(x=>x.id===id),a=f&&db.assignments.find(x=>x.id===f.assignmentId);if(!a)return id;const sec=db.sections.find(s=>s.id===a.sectionId);return `${db.subjects.find(s=>s.id===a.subjectId)?.name||''} / ${tName(a.teacherId)} — ${db.stages.find(g=>g.id===sec?.stageId)?.name||''} ${sec?.name||''} — ${dayName(f.dayId)} حصة ${f.period}`}
const teachersWith=fn=>db.teachers.filter(t=>db.assignments.some(a=>a.teacherId===t.id&&+a.weeklyPeriods>0)&&fn(db.teacherRules?.[t.id]||{})).map(t=>t.id);
const PROBE_GROUPS=[
 {id:'fixed',name:'الحصص المثبتة',items:()=>db.fixedLessons.map(f=>f.id),apply:(c,ids)=>{c.fixedLessons=c.fixedLessons.filter(f=>!ids.includes(f.id))},label:fixedLabel},
 {id:'unavail',name:'أوقات عدم إتاحة المدرسين',items:()=>teachersWith(r=>Object.values(r.unavailable||{}).some(a=>a.length)),apply:(c,ids)=>ids.forEach(id=>{c.teacherRules[id].unavailable={};syncStatusFromRules(id,c)}),label:tName},
 {id:'subject',name:'قيود المواد (أول/آخر حصة ومنع التكرار)',items:()=>Object.keys(db.subjectRules||{}).filter(id=>{const r=db.subjectRules[id];return r&&(r.noFirst||r.noLast||r.noRepeat)&&r.strict!=='soft'}),apply:(c,ids)=>ids.forEach(id=>{c.subjectRules[id]={}}),label:id=>db.subjects.find(s=>s.id===id)?.name||id},
 {id:'daily',name:'الحدود اليومية للمدرسين',items:()=>teachersWith(r=>(+r.maxDaily||99)<7||(+r.minDaily||0)>0),apply:(c,ids)=>ids.forEach(id=>{c.teacherRules[id].maxDaily=99;c.teacherRules[id].minDaily=0}),label:tName},
 {id:'adv',name:'القيود المتقدمة',items:()=>(db.advancedRules||[]).filter(r=>r.strict!=='soft').map(r=>r.id),apply:(c,ids)=>{c.advancedRules=c.advancedRules.filter(r=>!ids.includes(r.id))},label:id=>{const r=db.advancedRules.find(x=>x.id===id);return r?.name||r?.title||id}}];
async function probeTry(g,ids,ms){const c=probeClone();g.apply(c,ids);return (await probeRun(c,ms)).ok===true}
async function probeNarrow(g,items,ms,log){let cur=items;while(cur.length>1&&!probeAbort){log(`تضييق نطاق «${g.name}»: ${cur.length} عنصراً متبقياً...`);const h=Math.ceil(cur.length/2),A=cur.slice(0,h),B=cur.slice(h);const [ra,rb]=await Promise.all([probeTry(g,A,ms),probeTry(g,B,ms)]);if(ra)cur=A;else if(rb)cur=B;else break}return cur}
async function probeRefineDays(ids,ms,log){const rel=new Map();ids.forEach(id=>rel.set(id,new Set(Object.keys(db.teacherRules[id].unavailable||{}).filter(d=>(db.teacherRules[id].unavailable[d]||[]).length))));
 const build=()=>{const c=probeClone();rel.forEach((set,id)=>{set.forEach(d=>{c.teacherRules[id].unavailable[d]=[]});syncStatusFromRules(id,c)});return c};
 for(const [id,set] of rel)for(const d of [...set]){if(probeAbort)break;log(`فحص هل يلزم فتح ${dayName(d)} لـ ${tName(id)}...`);set.delete(d);if((await probeRun(build(),ms)).ok!==true)set.add(d)}
 return rel}
function probeIssueHtml(i){return `<div class="issue red"><div class="issue-icon">🔎</div><div><b>${esc(i.title)}</b><p>${esc(i.detail)}</p><div class="diag-fix">💡 الحل المقترح: ${esc(i.fix)}</div></div></div>`}
async function runProbeDiagnosis(){
 const box=$('#probeResult');if(!box)return;probeAbort=false;const ms=30000;
 const log=t=>{const l=box.querySelector('.probe-log');if(l)l.textContent=t};
 box.innerHTML='<div class="notice"><span class="probe-log">بدء الاختبار التجريبي...</span> <button type="button" class="danger" id="probeStop">إيقاف</button></div><div class="probe-out"></div>';
 $('#probeStop').onclick=()=>{probeAbort=true;probeWorkers.forEach(w=>{try{w.terminate()}catch(e){}});log('أُوقف الاختبار.')};
 const out=box.querySelector('.probe-out'),issues=[];
 const groups=PROBE_GROUPS.map(g=>({g,items:g.items()})).filter(x=>x.items.length);
 log('فحص كل مجموعة قيود بالتوازي (حتى 20 ثانية لكل فحص)...');
 const [base,...res]=await Promise.all([probeRun(probeClone(),ms),...groups.map(async x=>({...x,ok:await probeTry(x.g,x.items,ms)}))]);
 if(probeAbort)return;
 if(base.ok){log('انتهى.');out.innerHTML='<div class="notice">نجح التوليد في الاختبار التجريبي بدون أي تعديل. أعد الضغط على «توليد الجدول» (البحث عشوائي جزئياً وقد ينجح في محاولة أخرى).</div>';return}
 const solving=res.filter(x=>x.ok);
 if(!solving.length){log('انتهى.');out.innerHTML='<div class="notice error">لم يُحلّ التوليد بتخفيف أي مجموعة قيود وحدها خلال '+ms/1000+' ثانية. التعارض متشابك بين أكثر من مجموعة، أو أن المشكلة صعبة الحل بالوقت المحدد. جرّب تخفيف مجموعتين معاً يدوياً، أو أعد التشخيص بعد تقليل القيود.</div>';return}
 for(const x of solving){if(probeAbort)break;const set=await probeNarrow(x.g,x.items,ms,log);const names=set.map(id=>x.g.label(id));
  let detail=`عند تخفيف «${x.g.name}» لـ: ${names.join('، ')} نجح التوليد عند التخفيف، بينما لم ينجح الاختبار الأساسي ضمن مهلة الفحص (ليس إثباتاً لاستحالة القيود الأصلية). `+(set.length>1?'القيد مشترك بين هؤلاء مجتمعين؛ فتحه لأحدهم وحده لم يكفِ في الاختبار.':'');
  let fix='خفّف هذا القيد أو غيّر موعده.',title=`قيد مؤثر في صعوبة التوليد: ${x.g.name}`;
  if(x.g.id==='unavail'){const rel=await probeRefineDays(set,ms,log);const parts=[];rel.forEach((days,id)=>{if(days.size)parts.push(`${tName(id)}: ${[...days].map(dayName).join(' + ')}`)});
   if(parts.length){detail=`أدق نتيجة: إغلاق هذه الأيام قد يكون مؤثراً في تعثر البحث — ${parts.join(' ؛ ')}. عند فتحها (مع بقاء بقية قيودهم) نجح التوليد في الاختبار.`;fix='أتح هؤلاء المدرسين في الأيام المذكورة (ولو لبعض الحصص)، أو وزّع جزءاً من تكليفاتهم على مدرس آخر.'}}
  if(x.g.id==='fixed')fix='غيّر موعد هذه الحصة المثبتة أو ألغِ تثبيتها، ثم ثبّتها من مساحة العمل بعد نجاح التوليد.';
  if(x.g.id==='daily')fix='ارفع الحد الأقصى اليومي أو أزل الحد الأدنى لهؤلاء المدرسين.';
  if(x.g.id==='subject')fix='اجعل قيد المادة تفضيلياً (غير إلزامي) أو ألغِ «أول/آخر حصة/منع التكرار» لهذه المادة.';
  issues.push({title,detail,fix})}
 log('انتهى.');out.innerHTML=issues.map(probeIssueHtml).join('')+'<p class="muted">نتيجة تجريبية: كل فحص محدود بـ '+ms/1000+' ثانية، فقد يكون تعارضاً أعمق خارج هذا النطاق.</p>'}

// ===== حمل المدرس: يوحّد أرقام صفحة القيود والتشخيص =====
function teacherLoadInfo(tid){const as=db.assignments.filter(a=>a.teacherId===tid&&+a.weeklyPeriods>0),need=as.reduce((n,a)=>n+(+a.weeklyPeriods||0),0),tr=db.teacherRules?.[tid]||{},mx=Math.max(1,+tr.maxDaily||99),mn=+tr.minDaily||0;
 const secs=as.map(a=>db.sections.find(s=>s.id===a.sectionId)).filter(Boolean);const per=[];let grid=0,open=0,cap=0,cap2=0;
 db.days.filter(d=>d.active&&d.periods>0).sort((a,b)=>a.order-b.order).forEach(d=>{const un=tr.unavailable?.[d.id]||[],top=secs.length?Math.max(...secs.map(s=>sectionDayPeriods(s,d))):d.periods;let g=0,f=0;for(let p=1;p<=d.periods;p++)if(!un.includes(p)){g++;if(p<=top)f++}grid+=g;open+=f;cap+=Math.min(f,mx);cap2+=Math.min(f,mx+1);per.push({day:d.name,grid:g,open:f})});
 return {as,need,mx,mn,grid,open,cap,cap2,per,pct:cap?Math.round(need/cap*100):(need?999:0)}}
function teacherLoadText(i){const mxt=i.mx>50?'بلا حد':i.mx;return `الخانات المتاحة في الشبكة: ${i.grid}${i.open<i.grid?` (القابلة للاستخدام ضمن حصص شعبه: ${i.open})`:''} — ${i.per.map(x=>x.day+' '+x.open).join(' · ')}. بحدّه اليومي (${mxt})${i.mn?` وحدّه الأدنى (${i.mn}) الذي يُلزمه بالتدريس كل يوم`:''} يتسع فعلياً لـ ${i.cap} حصة، والمطلوب ${i.need} حصة، أي نسبة إشغال ${i.pct}% (${i.pct>100?'لا يتسع':i.pct>=85?'مرتفع'+(i.pct===100?' جداً — بلا أي مرونة':'')+' ويصعّب التوليد':i.pct>=70?'متوسط':'مريح'}؛ كلما انخفضت النسبة كان الجدول أسهل).`+(i.cap<i.open&&i.pct>=85?` رفع حدّه اليومي إلى ${i.mx+1} يرفع الاستيعاب إلى ${i.cap2} فتنخفض نسبة الإشغال إلى ${i.cap2?Math.round(i.need/i.cap2*100):0}%.`:'')}
function teacherAssignmentsPanel(tid){const i=teacherLoadInfo(tid);
 const rows=i.as.map(a=>{const sec=db.sections.find(s=>s.id===a.sectionId),g=db.stages.find(x=>x.id===sec?.stageId);return `<tr><td>${esc(g?.name||'')} ${esc(sec?.name||'')}</td><td>${esc(db.subjects.find(s=>s.id===a.subjectId)?.name||'')}</td><td>${esc(a.weeklyPeriods)}</td></tr>`}).join('');
 const cls=i.need>i.cap?'error':i.pct>=85?'warning':'';
 return `<h3>تكليفات المدرس</h3>${i.as.length?`<div style="overflow-x:auto"><table><thead><tr><th>الشعبة</th><th>المادة</th><th>الحصص أسبوعياً</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><th colspan="2">المجموع</th><th>${i.need}</th></tr></tfoot></table></div>`:'<div class="notice">لا توجد تكليفات لهذا المدرس.</div>'}${i.as.length?`<div class="notice ${cls}">${esc(teacherLoadText(i))}</div>`:''}`}
function showDirectDiagnostics(){
 const issues=directGenerationDiagnostics();window.lastDirectDiagnosis={version:APP_VERSION,createdAt:new Date().toISOString(),issues,lastGeneration:window.generationReport||null};
 const target=$('#directDiagnosisResult');if(!target)return;
 const cnt=l=>issues.filter(x=>x.level===l).length;target.innerHTML=`<div class="diag-summary"><span class="d-block">🔴 ${cnt('block')} مانع</span><span class="d-lim">🟠 ${cnt('limitation')} حد وظيفي</span><span class="d-warn">🟡 ${cnt('warn')} تحذير</span></div><div class="notice">تم فحص ${db.sections.length} شعبة و${db.assignments.length} تكليف و${(db.advancedRules||[]).length} قيد متقدم دون تعديل البيانات.</div>`+issues.map(x=>`<div class="issue ${x.level==='block'?'red':'orange'}"><div class="issue-icon">${x.level==='block'?'🔴':x.level==='limitation'?'🟠':x.level==='warn'?'🟡':'🔵'}</div><div style="flex:1"><b>${esc(x.title)}</b><div class="muted">${esc(x.detail)}</div>${x.ruleIds?.length?`<small>معرفات القيود: ${esc(x.ruleIds.join('، '))}</small><br>`:''}${x.fix?`<div class="diag-fix">💡 الحل المقترح: ${esc(x.fix)}</div>`:''}<button type="button" class="secondary direct-diagnostic-jump" data-target="${x.where}">فتح الإعداد المعني</button></div></div>`).join('');
 document.querySelectorAll('.direct-diagnostic-jump').forEach(b=>b.onclick=()=>{page=b.dataset.target;render()});
}
function exportDirectDiagnostics(){if(!window.lastDirectDiagnosis)showDirectDiagnostics();const data=JSON.stringify(window.lastDirectDiagnosis,null,2),url=URL.createObjectURL(new Blob([data],{type:'application/json;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='masar-diagnosis.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}

// Read-only slot audit. This is a local diagnostic, NOT a proof of global unsatisfiability.
// Explicitly count *why* a candidate is unavailable; these are local explanations only.
function explainSlotCandidate(a,sec,day,p,occupiedTeachers,scheduledByAssignment){
 const reasons=[],rule=db.teacherRules?.[a.teacherId]||{},subjectRule=db.subjectRules?.[a.subjectId]||{};
 const capacity=sectionDayPeriods(sec,day);
 if(p>capacity)reasons.push('الحصة خارج دوام الشعبة');
 if((rule.unavailable?.[day.id]||[]).some(x=>+x===+p))reasons.push('المدرس مستثنى من هذا الوقت');
 if(occupiedTeachers.has(a.teacherId))reasons.push('المدرس مشغول في الوقت نفسه');
 if(subjectRule.strict!=='soft'&&subjectRule.noFirst&&p===1)reasons.push('المادة ممنوعة من الحصة الأولى');
 if(subjectRule.strict!=='soft'&&subjectRule.noLast&&p===capacity)reasons.push('المادة ممنوعة من الحصة الأخيرة');
 if((db.advancedRules||[]).some(r=>r.strict!=='soft'&&advancedDiagnosticMatch(r,a,sec,day.id,p)&&((r.mode==='allow'&&(p<+r.from||p>+r.to))||(r.mode==='block'&&p>=+r.from&&p<=+r.to))))reasons.push('قيد متقدم يمنع هذه الحصة');
 const scheduled=scheduledByAssignment.get(a.id)||0;
 if(scheduled>=+a.weeklyPeriods)reasons.push('اكتمل نصاب هذا التكليف');
 return reasons;
}
function slotAudit(dayId,period){
 const day=db.days.find(d=>d.id===dayId);
 const assignments=db.assignments.filter(a=>+a.weeklyPeriods>0);
 const activeSections=db.sections.filter(sec=>day&&period<=sectionDayPeriods(sec,day));
 const entries=(db.timetable||[]).filter(e=>e.dayId===dayId&&+e.period===period);
 const occupiedTeachers=new Map(),occupiedSections=new Map(),issues=[];
 const scheduledByAssignment=new Map();for(const e of db.timetable||[])scheduledByAssignment.set(e.assignmentId,(scheduledByAssignment.get(e.assignmentId)||0)+1);
 for(const e of entries){
  const tn=db.teachers.find(t=>t.id===e.teacherId)?.name||e.teacherId;
  const sn=db.sections.find(x=>x.id===e.sectionId)?.name||e.sectionId;
  if(occupiedTeachers.has(e.teacherId))issues.push({kind:'teacher-clash',level:'block',teacher:tn,section:sn,detail:'المدرس موجود في حصتين في الوقت نفسه',where:'workspaceTT'});
  if(occupiedSections.has(e.sectionId))issues.push({kind:'section-clash',level:'block',teacher:tn,section:sn,detail:'الشعبة لها حصتان في الوقت نفسه',where:'workspaceTT'});
  occupiedTeachers.set(e.teacherId,e);occupiedSections.set(e.sectionId,e);
 }
 const teacherRows=db.teachers.map(t=>{
  const relevant=assignments.filter(a=>a.teacherId===t.id);
  if(!relevant.length)return null;
  const r=db.teacherRules?.[t.id]||{};
  const unavailable=(r.unavailable?.[dayId]||[]).some(p=>+p===+period);
  const occupied=occupiedTeachers.has(t.id);
  const options=relevant.filter(a=>{
   const sec=db.sections.find(x=>x.id===a.sectionId);
   if(!sec||!day||period>sectionDayPeriods(sec,day))return false;
   return slotAllowedFor(a,sec,day,period);
  });
  const remaining=relevant.reduce((n,a)=>n+Math.max(0,+a.weeklyPeriods||0)-(db.timetable||[]).filter(e=>e.assignmentId===a.id).length,0);
  return {id:t.id,name:t.name,unavailable,occupied,possibleAssignments:options.length,remaining,load:relevant.reduce((n,a)=>n+(+a.weeklyPeriods||0),0)};
 }).filter(Boolean);
 const unfilled=activeSections.filter(sec=>!occupiedSections.has(sec.id));
 const sectionAnalysis=[];
 for(const sec of unfilled){
  const relevant=assignments.filter(a=>a.sectionId===sec.id);
  const options=[],blocked=[];
  for(const a of relevant){
   const reasons=explainSlotCandidate(a,sec,day,period,occupiedTeachers,scheduledByAssignment);
   const teacher=db.teachers.find(t=>t.id===a.teacherId)?.name||a.teacherId;
   const subject=db.subjects.find(x=>x.id===a.subjectId)?.name||a.subjectId;
   const item={teacher,subject,assignmentId:a.id,reasons};
   if(reasons.length)blocked.push(item);else options.push(item);
  }
  sectionAnalysis.push({section:sec.name,sectionId:sec.id,eligible:options,blocked});
  if(!options.length)issues.push({kind:'no-local-candidate',level:'warn',section:sec.name,detail:relevant.length?'لا يوجد تكليف متبقٍ مؤهل لهذه الخانة. راجع الأسباب المفصلة دون تعديل القيود تلقائياً.':'لا يوجد تكليف مرتبط بهذه الشعبة.',where:'assignments'});
 }
 const fixed=(db.fixedLessons||[]).filter(e=>e.dayId===dayId&&+e.period===period).map(e=>({
  teacher:db.teachers.find(t=>t.id===e.teacherId)?.name||e.teacherId||'—',
  section:db.sections.find(x=>x.id===e.sectionId)?.name||e.sectionId||'—'
 }));
 return {applicationVersion:APP_VERSION,createdAt:new Date().toISOString(),scope:'single-slot-local-audit',day:day?.name||'',dayId,period,
  expectedLessons:assignments.reduce((n,a)=>n+(+a.weeklyPeriods||0),0),
  scheduledLessons:(db.timetable||[]).length,
  occupiedLessons:entries.length,activeSections:activeSections.length,unfilledSections:unfilled.length,
  availableTeachers:teacherRows.filter(x=>!x.unavailable&&!x.occupied).length,
  teacherRows,fixed,issues,sectionAnalysis,
  interpretation:'هذا فحص موضعي للقيود والخانات الحالية، وليس إثباتاً لاستحالة توليد جدول كامل أو تحديداً وحيداً لسبب فشل البحث.'};
}
// v0.9.16.2: read-only, evidence-linked repair suggestions.
// The app never relaxes a mandatory constraint automatically.
function suggestSlotRepairs(report){
 const proposals=[];
 const push=(priority,title,detail,impact,kind,sectionId,teacherId)=>proposals.push({priority,title,detail,impact,kind,sectionId,teacherId,automatic:false});
 for(const x of report.sectionAnalysis||[]){
  if(x.eligible.length){
   push(1,'مراجعة تكليف متاح للشعبة '+x.section,'توجد '+x.eligible.length+' تكليفات مؤهلة موضعياً؛ جرّب وضع أحدها في الخانة بعد التحقق من الجدول الكامل.','لا يغير أي قيد؛ قد يتطلب نقل حصة أخرى.', 'eligible',x.sectionId);
   continue;
  }
  const all=x.blocked||[];
  if(!all.length){push(2,'إكمال تكليفات الشعبة '+x.section,'لا توجد تكليفات مرتبطة بهذه الشعبة.','يتطلب مراجعة بيانات التكليفات، وقد يزيد إجمالي الحصص.','assignment',x.sectionId);continue;}
  const counts=new Map();
  for(const a of all)for(const reason of a.reasons||[])counts.set(reason,(counts.get(reason)||0)+1);
  const top=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,3);
  for(const [reason,count] of top){
   const isBusy=reason==='المدرس مشغول في الوقت نفسه';
   const isComplete=reason==='اكتمل نصاب هذا التكليف';
   push(isBusy?1:isComplete?3:2,(isBusy?'دراسة تبديل حصص':'مراجعة قيد أو نصاب')+' — '+x.section,
    'السبب: '+reason+' ('+count+' من '+all.length+' تكليفات). '+(isBusy?'افحص إمكانية نقل الحصة المتزامنة إلى خانة أخرى.':isComplete?'لا تُضف حصة تتجاوز النصاب دون مراجعة التكليف.':'افحص القيد المقابل في إعدادات المدرس أو المادة قبل أي تعديل.'),
    isBusy?'قد يؤثر في مدرس وشعبة أخرى؛ يحتاج تحققاً من كامل الجدول.':isComplete?'تعديل النصاب يغيّر مجموع الحصص المطلوبة.':'تخفيف القيد قد يخالف تفضيلات أو شروط المدرسة؛ يتطلب موافقة صريحة.',
    isBusy?'swap':isComplete?'load':'constraint',x.sectionId);
  }
 }
 return proposals.sort((a,b)=>a.priority-b.priority).slice(0,24);
}
function repairSuggestionsUI(report){
 const suggestions=suggestSlotRepairs(report);
 return `<details class="slot-repair-panel" open><summary>حلول مقترحة ومعاينة أثرها (${suggestions.length})</summary><p class="muted">المقترحات مبنية على فحص موضعي فقط. لا يُنفّذ أي تعديل تلقائياً، ولا تضمن هذه المقترحات إمكان توليد الجدول الكامل.</p>${suggestions.length?suggestions.map((x,i)=>`<article class="slot-repair-item"><strong>${i+1}. ${esc(x.title)}</strong><p>${esc(x.detail)}</p><p><b>الأثر المتوقع:</b> ${esc(x.impact)}</p><small>الأولوية ${x.priority} · معاينة فقط · دون تعديل البيانات</small></article>`).join(''):'<div class="notice">لم تُكتشف حاجة إلى حل موضعي بناءً على البيانات الحالية. لا يعني ذلك أن التوليد الكامل مضمون.</div>'}</details>`;
}
// v0.9.16.3: sandboxed one-lesson move preview. No mutation until explicit approval.
function candidateSlotMoves(report){
 const day=db.days.find(d=>d.id===report.dayId),period=report.period;
 if(!day||!db.timetable?.length)return [];
 const result=[];
 for(const section of report.sectionAnalysis||[]){
  if(!section.eligible.length)continue;
  const sec=db.sections.find(x=>x.id===section.sectionId);if(!sec)continue;
  const entries=db.timetable.filter(e=>e.sectionId===sec.id&&!(e.dayId===day.id&&+e.period===+period));
  for(const e of entries){
   const assignment=db.assignments.find(a=>a.id===e.assignmentId);
   if(!assignment||!slotAllowedFor(assignment,sec,day,period))continue;
   const changes=[{id:e.id,dayId:day.id,period}];
   const check=manualValidate(changes);
   if(check.errors.length)continue;
   const fromDay=db.days.find(d=>d.id===e.dayId);
   result.push({id:e.id,sectionId:sec.id,section:sec.name,teacher:db.teachers.find(t=>t.id===e.teacherId)?.name||'—',subject:db.subjects.find(x=>x.id===e.subjectId)?.name||'—',fromDay:fromDay?.name||'—',fromDayId:e.dayId,fromPeriod:e.period,toDayId:day.id,toPeriod:period,warnings:check.warnings,changes});
   if(result.length>=24)return result;
  }
 }
 return result;
}
function movePreviewUI(report){
 const options=candidateSlotMoves(report);
 window.slotMovePreview={createdAt:Date.now(),dayId:report.dayId,period:report.period,options};
 return `<details class="slot-repair-panel" open><summary>تجربة نقل حصة دون تعديل الجدول (${options.length})</summary><p class="muted">هذه عمليات نقل إلى شعبة فارغة في الحصة المختارة، وليست تبديلاً شاملاً أو إعادة توليد. المعاينة لا تغير البيانات؛ ويُعاد فحص التعارضات عند التنفيذ.</p>${options.length?options.map((o,i)=>`<article class="slot-repair-item"><strong>${esc(o.section)} — ${esc(o.subject)}</strong><p>المدرس: ${esc(o.teacher)}</p><p>من ${esc(o.fromDay)} / الحصة ${o.fromPeriod} ← إلى ${esc(report.day)} / الحصة ${report.period}</p><p>ستصبح الخانة الأصلية فارغة. ${o.warnings.length?'تحذيرات: '+esc(o.warnings.join('، ')):'لم يظهر تعارض في الفحص اليدوي الأولي.'}</p><button type="button" class="secondary slot-preview-apply" data-preview-index="${i}">مراجعة النقل واعتماده</button></article>`).join(''):'<div class="notice">لم يُعثر على نقل مباشر صالح مبدئياً. قد يتطلب الحل تبادلاً متعدد الحصص أو إعادة توزيع أوسع.</div>'}</details>`;
}
function wireMovePreviews(){
 document.querySelectorAll('.slot-preview-apply').forEach(button=>button.onclick=async ()=>{
  const preview=window.slotMovePreview,index=Number(button.dataset.previewIndex);
  const option=preview?.options?.[index];
  if(!option)return alert('انتهت صلاحية المعاينة؛ أعد تشغيل الفحص.');
  const original=db.timetable.find(e=>e.id===option.id);
  if(!original||original.dayId!==option.fromDayId||+original.period!==+option.fromPeriod)return alert('تغير الجدول منذ المعاينة؛ أعد تشغيل الفحص.');
  const section=db.sections.find(x=>x.id===option.sectionId),day=db.days.find(d=>d.id===option.toDayId),assignment=db.assignments.find(a=>a.id===original.assignmentId);
  if(!section||!day||!assignment||!slotAllowedFor(assignment,section,day,option.toPeriod))return alert('تغيرت القيود منذ المعاينة.');
  const changes=[{id:original.id,dayId:option.toDayId,period:option.toPeriod}],check=manualValidate(changes);
  if(check.errors.length)return alert('لم يعد النقل صالحاً: '+check.errors.join('، '));
  const warning=check.warnings.length?'\nتحذيرات: '+check.warnings.join('، '):'';
  if(!(await masarConfirm(`نقل ${option.subject} للشعبة ${option.section} من ${option.fromDay} / ${option.fromPeriod} إلى ${day.name} / ${option.toPeriod}؟\nستبقى الخانة الأصلية فارغة.${warning}\nسيُحفظ وضع الجدول قبل النقل.`)))return;
  if(!preserveTimetable('قبل تجربة نقل حصة إلى '+day.name+' '+option.toPeriod))return;
  const before=structuredClone(db.timetable),history=structuredClone(db.manualHistory||[]);
  Object.assign(original,changes[0]);
  db.manualHistory??=[];db.manualHistory.push({id:uid('edit'),at:new Date().toISOString(),type:'نقل بعد المعاينة',before:[{id:original.id,dayId:option.fromDayId,period:option.fromPeriod}],after:changes});
  if(db.manualHistory.length>100)db.manualHistory.shift();
  if(!save()){db.timetable=before;db.manualHistory=history;return}
  window.slotMovePreview=null;
  alert('تم النقل وحفظ نسخة سابقة. راجع الجدول كاملاً قبل اعتماده.');
  document.getElementById('auditSlotRun')?.click();
 });
}


// v0.9.16.4: atomic two-lesson exchange within the SAME section.
// Both positions remain occupied; no mutation occurs during preview.
function candidateLessonSwaps(report){
 const targetDay=db.days.find(d=>d.id===report.dayId),period=+report.period;
 if(!targetDay||!db.timetable?.length)return [];
 const options=[];
 // Exchange two occupied cells, one in the inspected period. No empty source is created.
 for(const a of db.timetable.filter(e=>e.dayId===report.dayId&&+e.period===period)){
  if(a.locked)continue;
  const sec=db.sections.find(x=>x.id===a.sectionId);if(!sec)continue;
  const assignmentA=db.assignments.find(x=>x.id===a.assignmentId);if(!assignmentA)continue;
  for(const b of db.timetable.filter(e=>e.sectionId===a.sectionId&&e.id!==a.id)){
   if(b.locked)continue;
   const oldDay=db.days.find(x=>x.id===b.dayId),assignmentB=db.assignments.find(x=>x.id===b.assignmentId);
   if(!oldDay||!assignmentB)continue;
   if(!slotAllowedFor(assignmentA,sec,oldDay,+b.period)||!slotAllowedFor(assignmentB,sec,targetDay,period))continue;
   const changes=[{id:a.id,dayId:b.dayId,period:+b.period},{id:b.id,dayId:a.dayId,period:+a.period}];
   const check=manualValidate(changes);
   if(check.errors.length)continue;
   options.push({aId:a.id,bId:b.id,aDayId:a.dayId,aPeriod:+a.period,bDayId:b.dayId,bPeriod:+b.period,section:sec.name,
    aSubject:db.subjects.find(x=>x.id===a.subjectId)?.name||'—',bSubject:db.subjects.find(x=>x.id===b.subjectId)?.name||'—',
    aTeacher:db.teachers.find(x=>x.id===a.teacherId)?.name||'—',bTeacher:db.teachers.find(x=>x.id===b.teacherId)?.name||'—',
    aDay:targetDay.name,bDay:oldDay.name,warnings:check.warnings});
   if(options.length>=30)return options;
  }
 }
 return options;
}
function lessonSwapUI(report){
 const options=candidateLessonSwaps(report);
 window.slotSwapPreview={options};
 return `<details class="slot-repair-panel" open><summary>تبادل حصتين دون إنشاء فراغ (${options.length})</summary><p class="muted">يعرض التبادل حصتين مشغولتين من الشعبة نفسها، ويختبر الموضعين معاً. لا يغيّر الجدول قبل موافقتك. لا يشمل التبادل متعدد الشعب أو أكثر من حصتين.</p>${options.length?options.map((o,i)=>`<article class="slot-repair-item"><strong>${esc(o.section)} — تبادل ${esc(o.aSubject)} مع ${esc(o.bSubject)}</strong><p>${esc(o.aTeacher)}: ${esc(o.aDay)} / ${o.aPeriod} ← ${esc(o.bDay)} / ${o.bPeriod}</p><p>${esc(o.bTeacher)}: ${esc(o.bDay)} / ${o.bPeriod} ← ${esc(o.aDay)} / ${o.aPeriod}</p><p>تبقى الخانتان مشغولتين. ${o.warnings.length?'تحذيرات: '+esc(o.warnings.join('، ')):'لا توجد تحذيرات من فحص التعديل اليدوي.'}</p><button type="button" class="secondary slot-swap-apply" data-swap-index="${i}">مراجعة التبادل واعتماده</button></article>`).join(''):'<div class="notice">لا يوجد تبادل ثنائي صالح مبدئياً في هذه الحصة. قد تحتاج معالجة أكثر من حصتين أو أكثر من شعبة.</div>'}</details>`;
}
function wireLessonSwaps(){
 document.querySelectorAll('.slot-swap-apply').forEach(button=>button.onclick=async ()=>{
  const option=window.slotSwapPreview?.options?.[Number(button.dataset.swapIndex)];
  if(!option)return alert('المعاينة غير متاحة. أعد تشغيل الفحص.');
  const a=db.timetable.find(x=>x.id===option.aId),b=db.timetable.find(x=>x.id===option.bId);
  if(!a||!b||a.dayId!==option.aDayId||+a.period!==option.aPeriod||b.dayId!==option.bDayId||+b.period!==option.bPeriod)return alert('تغير الجدول منذ المعاينة. أعد الفحص.');
  const sec=db.sections.find(x=>x.id===a.sectionId),dayA=db.days.find(x=>x.id===a.dayId),dayB=db.days.find(x=>x.id===b.dayId);
  const asA=db.assignments.find(x=>x.id===a.assignmentId),asB=db.assignments.find(x=>x.id===b.assignmentId);
  if(!sec||b.sectionId!==sec.id||!dayA||!dayB||!asA||!asB||!slotAllowedFor(asA,sec,dayB,+b.period)||!slotAllowedFor(asB,sec,dayA,+a.period))return alert('لم يعد التبادل متوافقاً مع القيود. أعد الفحص.');
  const changes=[{id:a.id,dayId:b.dayId,period:+b.period},{id:b.id,dayId:a.dayId,period:+a.period}];
  const check=manualValidate(changes);
  if(check.errors.length)return alert('تعارض يمنع التبادل: '+check.errors.join('، '));
  const extra=check.warnings.length?'\nتحذيرات: '+check.warnings.join('، '):'';
  if(!(await masarConfirm(`تبادل الحصتين للشعبة ${option.section}؟\n${option.aSubject}: ${option.aDay}/${option.aPeriod} إلى ${option.bDay}/${option.bPeriod}\n${option.bSubject}: ${option.bDay}/${option.bPeriod} إلى ${option.aDay}/${option.aPeriod}${extra}\nلن تُترك خانة فارغة. سيتم حفظ نسخة استرجاع.`)))return;
  if(!preserveTimetable('قبل تبادل حصتين للشعبة '+option.section))return;
  const before=structuredClone(db.timetable),history=structuredClone(db.manualHistory||[]);
  Object.assign(a,changes[0]);Object.assign(b,changes[1]);
  db.manualHistory??=[];
  db.manualHistory.push({id:uid('edit'),at:new Date().toISOString(),type:'تبادل حصتين بعد المعاينة',before:[{id:a.id,dayId:option.aDayId,period:option.aPeriod},{id:b.id,dayId:option.bDayId,period:option.bPeriod}],after:changes});
  if(db.manualHistory.length>100)db.manualHistory.shift();
  if(!save()){db.timetable=before;db.manualHistory=history;return}
  window.slotSwapPreview=null;alert('تم تبادل الحصتين مع الحفاظ على إشغال الخانتين. راجع الجدول قبل الاعتماد.');
  document.getElementById('auditSlotRun')?.click();
 });
}


// v0.9.16.5: a three-lesson cycle within one section; all occupied cells stay occupied.
// The whole proposed state is validated before showing or applying it.
function threeCycleCandidates(report){
 const out=[],target=db.timetable.filter(e=>e.dayId===report.dayId&&+e.period===+report.period&&!e.locked);
 const sections=new Map();for(const e of db.timetable){if(!sections.has(e.sectionId))sections.set(e.sectionId,[]);sections.get(e.sectionId).push(e)}
 for(const a of target){
  const pool=(sections.get(a.sectionId)||[]).filter(e=>e.id!==a.id&&!e.locked);
  const sec=db.sections.find(x=>x.id===a.sectionId);if(!sec)continue;
  for(let i=0;i<pool.length;i++)for(let j=i+1;j<pool.length;j++){
   const b=pool[i],c=pool[j];
   for(const order of [[b,c],[c,b]]){
    const [second,third]=order;
    // a->second's slot, second->third's slot, third->a's slot
    const original=[a,second,third];
    const changes=original.map((e,k)=>({id:e.id,dayId:original[(k+1)%3].dayId,period:+original[(k+1)%3].period}));
    if(new Set(changes.map(x=>x.dayId+'|'+x.period)).size!==3)continue;
    if(original.some((e,k)=>{
      const assignment=db.assignments.find(x=>x.id===e.assignmentId),day=db.days.find(x=>x.id===changes[k].dayId);
      return !assignment||!day||!slotAllowedFor(assignment,sec,day,changes[k].period);
    }))continue;
    const validation=manualValidate(changes);if(validation.errors.length)continue;
    out.push({ids:original.map(x=>x.id),original:original.map(e=>({id:e.id,dayId:e.dayId,period:+e.period})),changes,section:sec.name,
      lessons:original.map((e,k)=>({subject:db.subjects.find(x=>x.id===e.subjectId)?.name||'—',teacher:db.teachers.find(x=>x.id===e.teacherId)?.name||'—',from:db.days.find(x=>x.id===e.dayId)?.name+' / '+e.period,to:db.days.find(x=>x.id===changes[k].dayId)?.name+' / '+changes[k].period})),warnings:validation.warnings});
    if(out.length>=12)return out;
   }
  }
 }
 return out;
}
function threeCycleUI(report){
 const options=threeCycleCandidates(report);window.threeCyclePreview={options};
 return `<details class="slot-repair-panel"><summary>سلسلة تبديل ثلاث حصص دون فراغ (${options.length})</summary><p class="muted">معاينة ثلاثة تغييرات مترابطة داخل الشعبة نفسها. تُفحص جميع الخانات قبل التنفيذ ولا تتغير بيانات المدرسة أثناء المعاينة.</p>${options.length?options.map((o,i)=>`<article class="slot-repair-item"><strong>${esc(o.section)}</strong>${o.lessons.map(x=>`<p>${esc(x.subject)} — ${esc(x.teacher)}: ${esc(x.from)} ← ${esc(x.to)}</p>`).join('')}<p>${o.warnings.length?'تحذيرات: '+esc(o.warnings.join('، ')):'لا توجد تحذيرات من الفحص اليدوي.'}</p><button type="button" class="secondary three-cycle-apply" data-cycle-index="${i}">مراجعة السلسلة واعتمادها</button></article>`).join(''):'<div class="notice">لم يُعثر على سلسلة ثلاثية صالحة في هذه الحصة وفق القيود المفحوصة. هذا لا يثبت استحالة الإصلاح.</div>'}</details>`;
}
function wireThreeCycles(){
 document.querySelectorAll('.three-cycle-apply').forEach(button=>button.onclick=async ()=>{
  const option=window.threeCyclePreview?.options?.[+button.dataset.cycleIndex];if(!option)return alert('انتهت صلاحية المعاينة. أعد الفحص.');
  const current=option.original.map(x=>db.timetable.find(e=>e.id===x.id));
  if(current.some((e,i)=>!e||e.dayId!==option.original[i].dayId||+e.period!==option.original[i].period))return alert('تغيرت الحصص منذ المعاينة. أعد الفحص.');
  if(new Set(current.map(x=>x.sectionId)).size!==1)return alert('تغيرت الشعبة. أعد الفحص.');
  const sec=db.sections.find(x=>x.id===current[0].sectionId);
  if(!sec||current.some((e,i)=>{
    const a=db.assignments.find(x=>x.id===e.assignmentId),day=db.days.find(x=>x.id===option.changes[i].dayId);
    return !a||!day||!slotAllowedFor(a,sec,day,option.changes[i].period);
  }))return alert('تغيرت القيود. أعد الفحص.');
  const check=manualValidate(option.changes);if(check.errors.length)return alert('تعارض يمنع التعديل: '+check.errors.join('، '));
  const summary=option.lessons.map(x=>x.subject+': '+x.from+' إلى '+x.to).join('\n');
  if(!(await masarConfirm('تأكيد تدوير ثلاث حصص للشعبة '+option.section+'؟\n'+summary+'\n'+(check.warnings.length?'تحذيرات: '+check.warnings.join('، ')+'\n':'')+'ستُحفظ نسخة استرجاع قبل التنفيذ.')))return;
  if(!preserveTimetable('قبل تدوير ثلاث حصص للشعبة '+option.section))return;
  const before=structuredClone(db.timetable),history=structuredClone(db.manualHistory||[]);
  for(const change of option.changes)Object.assign(db.timetable.find(e=>e.id===change.id),change);
  db.manualHistory??=[];db.manualHistory.push({id:uid('edit'),at:new Date().toISOString(),type:'سلسلة تدوير ثلاث حصص',before:option.original,after:option.changes.map(x=>({...x}))});
  if(db.manualHistory.length>100)db.manualHistory.shift();
  if(!save()){db.timetable=before;db.manualHistory=history;return}
  window.threeCyclePreview=null;alert('تم تدوير الحصص الثلاث مع الحفاظ على إشغال مواقعها. راجع الجدول قبل الاعتماد.');
  document.getElementById('auditSlotRun')?.click();
 });
}


// v0.9.16.6: simultaneous cross-section time exchanges.
// A lesson retains its section, subject and teacher; only day/period change.
function crossSectionExchangeCandidates(report){
 const timetable=db.timetable||[],out=[];
 const targets=timetable.filter(e=>e.dayId===report.dayId&&+e.period===+report.period&&!e.locked);
 const fixed=e=>(db.fixedLessons||[]).some(f=>f.assignmentId===e.assignmentId&&f.dayId===e.dayId&&+f.period===+e.period);
 const positionFree=(sectionId,dayId,period,exceptId)=>!timetable.some(x=>x.id!==exceptId&&x.sectionId===sectionId&&x.dayId===dayId&&+x.period===+period);
 let examined=0;
 for(const a of targets){
  if(fixed(a))continue;
  const secA=db.sections.find(x=>x.id===a.sectionId),asA=db.assignments.find(x=>x.id===a.assignmentId);
  if(!secA||!asA)continue;
  for(const b of timetable){
   if(++examined>25000)return out;
   if(out.length>=12)return out;
   if(a.id===b.id||a.sectionId===b.sectionId||b.locked||fixed(b))continue;
   if(a.dayId===b.dayId&&+a.period===+b.period)continue;
   const secB=db.sections.find(x=>x.id===b.sectionId),asB=db.assignments.find(x=>x.id===b.assignmentId);
   const dayA=db.days.find(x=>x.id===a.dayId),dayB=db.days.find(x=>x.id===b.dayId);
   if(!secB||!asB||!dayA||!dayB)continue;
   // Both destination section cells must be empty. This avoids any third lesson being displaced.
   if(!positionFree(a.sectionId,b.dayId,+b.period,a.id)||!positionFree(b.sectionId,a.dayId,+a.period,b.id))continue;
   if(!slotAllowedFor(asA,secA,dayB,+b.period)||!slotAllowedFor(asB,secB,dayA,+a.period))continue;
   const changes=[{id:a.id,dayId:b.dayId,period:+b.period},{id:b.id,dayId:a.dayId,period:+a.period}];
   const check=manualValidate(changes);
   if(check.errors.length)continue;
   out.push({original:[{id:a.id,dayId:a.dayId,period:+a.period},{id:b.id,dayId:b.dayId,period:+b.period}],changes,
    lessons:[a,b].map((e,i)=>({section:db.sections.find(x=>x.id===e.sectionId)?.name||'—',subject:db.subjects.find(x=>x.id===e.subjectId)?.name||'—',teacher:db.teachers.find(x=>x.id===e.teacherId)?.name||'—',from:(i?dayB:dayA).name+' / '+e.period,to:(i?dayA:dayB).name+' / '+(i?+a.period:+b.period)})),warnings:check.warnings});
  }
 }
 return out;
}
function crossSectionExchangeUI(report){
 const options=crossSectionExchangeCandidates(report);window.crossSectionPreview={options};
 return `<details class="slot-repair-panel"><summary>تبادل مواعيد حصتين بين شعبتين (${options.length})</summary><p class="muted">تُبدّل مواعيد حصتين من شعبتين مختلفتين، مع إبقاء كل مادة ومدرس في شعبته الأصلية. لا تتغير أعداد الحصص، لكن تتغير مواقع الفراغات في الشعبتين. تُفحص قيود المدرسين والشعبتين قبل الاعتماد.</p>${options.length?options.map((o,i)=>`<article class="slot-repair-item"><strong>${esc(o.lessons[0].section)} ↔ ${esc(o.lessons[1].section)}</strong>${o.lessons.map(x=>`<p>${esc(x.subject)} — ${esc(x.teacher)} (${esc(x.section)}): ${esc(x.from)} ← ${esc(x.to)}</p>`).join('')}<p>${o.warnings.length?'تحذيرات: '+esc(o.warnings.join('، ')):'اجتاز الفحص الموضعي دون تحذيرات.'}</p><button type="button" class="secondary cross-section-apply" data-cross-index="${i}">معاينة التغيير واعتماده</button></article>`).join(''):'<div class="notice">لا يوجد تبادل صالح وفق الفحص الحالي. هذا لا يثبت استحالة معالجة التعارض.</div>'}</details>`;
}
function wireCrossSectionExchanges(){
 document.querySelectorAll('.cross-section-apply').forEach(button=>button.onclick=async ()=>{
  const option=window.crossSectionPreview?.options?.[+button.dataset.crossIndex];if(!option)return alert('المعاينة غير متاحة. أعد الفحص.');
  const current=option.original.map(x=>db.timetable.find(e=>e.id===x.id));
  if(current.some((e,i)=>!e||e.dayId!==option.original[i].dayId||+e.period!==option.original[i].period||e.locked))return alert('تغير الجدول منذ المعاينة. أعد الفحص.');
  if(current[0].sectionId===current[1].sectionId)return alert('لم تعد الحصتان من شعبتين مختلفتين.');
  const fixed=e=>(db.fixedLessons||[]).some(f=>f.assignmentId===e.assignmentId&&f.dayId===e.dayId&&+f.period===+e.period);
  if(current.some(fixed))return alert('إحدى الحصتين مثبتة.');
  if(current.some((e,i)=>db.timetable.some(x=>x.id!==e.id&&x.sectionId===e.sectionId&&x.dayId===option.changes[i].dayId&&+x.period===+option.changes[i].period)))return alert('أصبحت إحدى الخانتين مشغولة. أعد الفحص.');
  if(current.some((e,i)=>{
   const a=db.assignments.find(x=>x.id===e.assignmentId),sec=db.sections.find(x=>x.id===e.sectionId),day=db.days.find(x=>x.id===option.changes[i].dayId);
   return !a||!sec||!day||!slotAllowedFor(a,sec,day,option.changes[i].period);
  }))return alert('تغيرت القيود منذ المعاينة.');
  const check=manualValidate(option.changes);if(check.errors.length)return alert('تعارض يمنع التبديل: '+check.errors.join('، '));
  const summary=option.lessons.map(x=>x.section+' — '+x.subject+': '+x.from+' إلى '+x.to).join('\n');
  if(!(await masarConfirm('اعتماد تبادل موعدي الحصتين بين الشعبتين؟\n'+summary+'\nقد تنتقل مواقع الفراغات، ولن تتغير التكليفات.\n'+(check.warnings.length?'تحذيرات: '+check.warnings.join('، ')+'\n':'')+'ستُحفظ نسخة استرجاع قبل التنفيذ.')))return;
  if(!preserveTimetable('قبل تبادل مواعيد حصتين بين شعبتين'))return;
  const before=structuredClone(db.timetable),history=structuredClone(db.manualHistory||[]);
  for(const change of option.changes)Object.assign(db.timetable.find(e=>e.id===change.id),change);
  db.manualHistory??=[];db.manualHistory.push({id:uid('edit'),at:new Date().toISOString(),type:'تبادل مواعيد بين شعبتين',before:option.original.map(x=>({...x})),after:option.changes.map(x=>({...x}))});
  if(db.manualHistory.length>100)db.manualHistory.shift();
  if(!save()){db.timetable=before;db.manualHistory=history;return}
  window.crossSectionPreview=null;alert('تم التبادل. راجع الفراغات وجدولي المدرسين والشعبتين قبل اعتماد الجدول.');
  document.getElementById('auditSlotRun')?.click();
 });
}

function slotAuditControls(){
 const days=db.days.filter(d=>d.active&&+d.periods>0);
 const wed=days.find(d=>d.name.includes('الأربع'))||days[0];
 return `<section class="generation-report" id="slotAuditPanel"><h3>فحص تعارض يوم وحصة محددين</h3>
 <p class="muted">ابدأ بالأربعاء، الحصة السادسة، للتحقق من الحالة التي ظهرت في بيانات المدرسة. يعرض الفحص عدد الحصص والقيود المحلية ولا يغير الجدول أو التكليفات.</p>
 <div class="actions"><label>اليوم <select id="auditDay">${days.map(d=>`<option value="${esc(d.id)}" ${d.id===wed?.id?'selected':''}>${esc(d.name)}</option>`).join('')}</select></label><label>الحصة <select id="auditPeriod">${Array.from({length:Math.max(1,Math.max(...days.map(d=>+d.periods)))},(_,i)=>`<option value="${i+1}" ${i===5?'selected':''}>${i+1}</option>`).join('')}</select></label><button type="button" id="auditSlotRun">فحص الحصة</button><button type="button" class="secondary" id="auditSlotExport">تصدير تقرير JSON</button></div>
 <div id="auditSlotResult" aria-live="polite"></div></section>`;
}
function wireSlotAudit(){
 const run=document.getElementById('auditSlotRun'),exportBtn=document.getElementById('auditSlotExport');
 if(!run)return;
 run.onclick=()=>{
  const d=document.getElementById('auditDay').value,p=+document.getElementById('auditPeriod').value;
  const report=slotAudit(d,p);report.suggestions=suggestSlotRepairs(report);window.lastSlotAudit=report;
  const target=document.getElementById('auditSlotResult');
  target.innerHTML=`<div class="notice"><b>${esc(report.day)} — الحصة ${report.period}</b><div>التكليفات الأسبوعية المطلوبة: ${report.expectedLessons} · الحصص المحفوظة: ${report.scheduledLessons}</div><div>الشعب التي تعمل في هذه الحصة: ${report.activeSections} · حصص موزعة: ${report.occupiedLessons} · شعب بلا حصة: ${report.unfilledSections}</div><div>مدرسون غير مشغولين وغير محظورين في هذا الوقت: ${report.availableTeachers}</div></div>
  ${report.fixed.length?`<div class="notice">الحصص المثبتة: ${report.fixed.map(x=>esc(x.teacher)+' — '+esc(x.section)).join('، ')}</div>`:''}
  ${report.issues.length?report.issues.map(x=>`<div class="issue ${x.level==='block'?'red':'orange'}"><div><b>${x.level==='block'?'تعارض مثبت في الجدول الحالي':'ملاحظة موضعية'}: ${esc(x.section||x.teacher||'')}</b><p>${esc(x.detail)}</p></div></div>`).join(''):'<div class="notice">لم يرصد الفحص الموضعي تعارضاً مباشراً في الحصص المحفوظة لهذه الخانة. هذا لا يثبت إمكان التوليد الكامل.</div>'}
  ${repairSuggestionsUI(report)}
  ${movePreviewUI(report)}
  ${lessonSwapUI(report)}
  ${threeCycleUI(report)}
  ${crossSectionExchangeUI(report)}
  <details><summary>تحليل أسباب عدم توفر التكليفات للشعب الفارغة (${report.sectionAnalysis.length})</summary><div class="slot-section-analysis">${report.sectionAnalysis.map(x=>`<div class="slot-analysis-item"><strong>${esc(x.section)}</strong><p>تكليفات مؤهلة الآن: ${x.eligible.length} · تكليفات غير مؤهلة: ${x.blocked.length}</p>${x.blocked.map(a=>`<p>${esc(a.teacher)} — ${esc(a.subject)}: ${a.reasons.map(esc).join('، ')}</p>`).join('')}</div>`).join('')}</div></details>
  <details><summary>عرض حالة المدرسين (${report.teacherRows.length})</summary><div class="tt-wrap"><table><thead><tr><th>المدرس</th><th>متاح في هذه الحصة</th><th>مشغول</th><th>تكليفات مؤهلة محلياً</th></tr></thead><tbody>${report.teacherRows.map(t=>`<tr><td>${esc(t.name)}</td><td>${t.unavailable?'لا':'نعم'}</td><td>${t.occupied?'نعم':'لا'}</td><td>${t.possibleAssignments}</td></tr>`).join('')}</tbody></table></div></details>
  <p class="muted">${esc(report.interpretation)}</p>`;
  wireMovePreviews();wireLessonSwaps();wireThreeCycles();wireCrossSectionExchanges();
 };
 exportBtn.onclick=()=>{run.click();if(window.lastSlotAudit)downloadJsonData(window.lastSlotAudit,'masar-slot-audit-'+new Date().toISOString().slice(0,10)+'.json')};
}

function fullTimetableAudit(){
 const lessons=db.timetable||[], assignments=db.assignments||[], issues=[],teacherSlots=new Map(),sectionSlots=new Map(),counts=new Map(),teacherDays=new Map();
 const add=(level,type,detail,entry)=>issues.push({level,type,detail,entryId:entry?.id||null});
 const key=(...parts)=>parts.join('|');
 for(const e of lessons){
  const a=assignments.find(x=>x.id===e.assignmentId),sec=db.sections.find(x=>x.id===e.sectionId),day=db.days.find(x=>x.id===e.dayId),teacher=db.teachers.find(x=>x.id===e.teacherId);
  if(!a||!sec||!day||!teacher){add('error','مرجع مفقود','حصة مرتبطة بتكليف أو شعبة أو يوم أو مدرس غير موجود',e);continue}
  if(a.sectionId!==e.sectionId||a.teacherId!==e.teacherId||a.subjectId!==e.subjectId)add('error','عدم تطابق التكليف','بيانات الحصة لا تطابق التكليف المسجل',e);
  if(!day.active||+e.period<1||+e.period>sectionDayPeriods(sec,day))add('error','خارج الدوام',manualLabel(e),e);
  const tk=key(e.teacherId,e.dayId,e.period),sk=key(e.sectionId,e.dayId,e.period);
  if(teacherSlots.has(tk))add('error','تعارض مدرس',manualLabel(e)+' مع '+manualLabel(teacherSlots.get(tk)),e);else teacherSlots.set(tk,e);
  if(sectionSlots.has(sk))add('error','تعارض شعبة',manualLabel(e)+' مع '+manualLabel(sectionSlots.get(sk)),e);else sectionSlots.set(sk,e);
  counts.set(e.assignmentId,(counts.get(e.assignmentId)||0)+1);
  const td=key(e.teacherId,e.dayId);teacherDays.set(td,(teacherDays.get(td)||0)+1);
  if(!slotAllowedFor(a,sec,day,+e.period))add('error','قيد إلزامي','الحصة تخالف قيد وقت إلزامياً: '+manualLabel(e),e);
 }
 const quotas=assignments.map(a=>{const expected=Math.max(0,+a.weeklyPeriods||0),actual=counts.get(a.id)||0; if(actual!==expected)add('error','نصاب التكليف',`التكليف ${a.id}: المطلوب ${expected} والموزع ${actual}`);return {assignmentId:a.id,teacherId:a.teacherId,sectionId:a.sectionId,subjectId:a.subjectId,expected,actual,difference:expected-actual}});
 for(const t of db.teachers){const max=Math.max(1,+rule(t.id).maxDaily||99);for(const day of db.days){const actual=teacherDays.get(key(t.id,day.id))||0;if(actual>max)add('error','نصاب يومي',`${t.name} — ${day.name}: ${actual} حصص والحد ${max}`)}}
 const gaps=[];for(const sec of db.sections)for(const day of db.days.filter(x=>x.active)){const cap=sectionDayPeriods(sec,day);for(let period=1;period<=cap;period++)if(!sectionSlots.has(key(sec.id,day.id,period)))gaps.push({sectionId:sec.id,section:sec.name,dayId:day.id,day:day.name,period})}
 const errors=issues.filter(x=>x.level==='error').length,expected=quotas.reduce((n,q)=>n+q.expected,0),actual=lessons.length;
 return {version:APP_VERSION,checkedAt:new Date().toISOString(),expectedLessons:expected,actualLessons:actual,errors,gaps:gaps.length,valid:errors===0&&actual===expected,issues,quotas,gapDetails:gaps,interpretation:'الفحص يتحقق من التعارضات والنصاب والقيود المحلية والفراغات. اجتيازه لا يثبت صحة كل القواعد المتقدمة أو قابلية توليد جدول جديد.'};
}
function fullTimetableAuditUI(){return `<section class="generation-report"><h3>التدقيق الشامل للجدول الحالي</h3><p class="muted">يفحص كل الحصص المحفوظة: تعارضات المدرسين والشعب، النصاب الأسبوعي، أوقات الدوام، القيود الإلزامية، والفراغات. لا يغيّر البيانات.</p><div class="actions"><button type="button" id="fullAuditRun">تدقيق الجدول كاملاً</button><button type="button" class="secondary" id="fullAuditExport">تنزيل تقرير التدقيق JSON</button></div><div id="fullAuditResult" aria-live="polite"></div></section>`}
function wireFullTimetableAudit(){const run=document.getElementById('fullAuditRun'),exportBtn=document.getElementById('fullAuditExport');if(!run)return;run.onclick=()=>{const r=fullTimetableAudit();window.lastFullTimetableAudit=r;document.getElementById('fullAuditResult').innerHTML=`<div class="notice"><b>${r.valid?'اجتاز الفحوص المنفذة':'يحتاج الجدول إلى مراجعة'}</b><p>الحصص المطلوبة: ${r.expectedLessons} · المحفوظة: ${r.actualLessons} · المشكلات: ${r.errors} · الفراغات: ${r.gaps}</p><p class="muted">${esc(r.interpretation)}</p></div><details open><summary>المشكلات المكتشفة (${r.issues.length})</summary><div class="slot-section-analysis">${r.issues.slice(0,120).map(x=>`<div class="slot-analysis-item"><b>${esc(x.type)}</b><p>${esc(x.detail)}</p></div>`).join('')||'<p>لم تُكتشف مشكلات ضمن الفحوص المنفذة.</p>'}${r.issues.length>120?'<p>التقرير JSON يحتوي بقية المشكلات.</p>':''}</div></details><details><summary>الفراغات (${r.gaps})</summary><div class="slot-section-analysis">${r.gapDetails.slice(0,100).map(x=>`<p>${esc(x.section)} — ${esc(x.day)} — الحصة ${x.period}</p>`).join('')}${r.gaps>100?'<p>التقرير JSON يحتوي بقية الفراغات.</p>':''}</div></details>`};exportBtn.onclick=()=>{run.click();downloadJsonData(window.lastFullTimetableAudit,'masar-full-audit-'+new Date().toISOString().slice(0,10)+'.json')}}
function diagnosticControls(){return `<section class="generation-report"><h3>تشخيص أسباب عدم توليد الجدول</h3><p class="muted">يفحص التزامن الإجباري للشعب في كل حصة بنظرية المطابقة الرياضية، ثم يتحقق من القيود والتكليفات وسعة المدرسين. ويعرض موقع التعارض والأسماء وخيارات الإصلاح دون تغيير البيانات. لا يغير الجدول المحفوظ.</p><div class="actions"><button type="button" id="directDiagnosisBtn">تشخيص الآن</button><button type="button" class="secondary" id="directDiagnosisExport">تنزيل تقرير التشخيص JSON</button></div><div class="notice">إذا انتهى وقت التوليد دون حل، يمكنك تشغيل اختبارات تخفيف القيود. نجاح نسخة مخففة يحدد قيوداً مؤثرة لكنه لا يثبت أن النسخة الأصلية مستحيلة؛ ولن تُعدّل بياناتك.</div><div class="actions"><button type="button" id="probeBtn">🔎 تشخيص دقيق بالاختبار التجريبي</button></div><div class="actions"><button type="button" id="smartCapacityBtn">🧠 فحص ذكي لسعة الشعب والمدرسين</button></div><div id="smartCapacityResult"></div><div id="probeResult"></div><div id="directDiagnosisResult"></div>${slotAuditControls()}${fullTimetableAuditUI()}</section>`}
function wireDirectDiagnostics(){wireSlotAudit();wireFullTimetableAudit();if($('#smartCapacityBtn'))$('#smartCapacityBtn').onclick=runSmartCapacityDiagnosis;if($('#directDiagnosisBtn'))$('#directDiagnosisBtn').onclick=showDirectDiagnostics;if($('#probeBtn'))$('#probeBtn').onclick=runProbeDiagnosis;if($('#directDiagnosisExport'))$('#directDiagnosisExport').onclick=exportDirectDiagnostics}
function generationDiagnostics(result){
 const found=[];const add=(severity,title,detail,where,teacherId)=>found.push({severity,title,detail,where,teacherId:teacherId||''});
 const active=db.days.filter(d=>d.active&&d.periods>0).sort((a,b)=>a.order-b.order);
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
  if(required>available)add('block',`نصاب غير قابل للتوزيع — ${t.name}`,`المطلوب ${required} حصة، والحد الأقصى المتاح بعد القيود اليومية ${available}.`,'constraints',t.id);
 });
 db.assignments.forEach(a=>{
  const sec=db.sections.find(x=>x.id===a.sectionId),t=db.teachers.find(x=>x.id===a.teacherId),sub=db.subjects.find(x=>x.id===a.subjectId);if(!sec||!t||!sub)return;
  const sr=db.subjectRules?.[a.subjectId]||{};if(sr.strict==='soft'||(sr.stageId&&sr.stageId!==sec.stageId))return;
  const r=rule(t.id);let slots=0,possibleDays=0;
  for(const d of active){const cap=sectionDayPeriods(sec,d);let n=0;for(let period=1;period<=cap;period++)if(!(sr.noFirst&&period===1)&&!(sr.noLast&&period===cap)&&!(r.unavailable?.[d.id]||[]).includes(period))n++;slots+=n;if(n)possibleDays++;}
  const required=+a.weeklyPeriods;
  if(required>possibleDays){add('warning',`تكرار ضروري — ${sub.name} / ${t.name}`,`الشعبة ${db.stages.find(g=>g.id===sec.stageId)?.name||''} ${sec.name}: ${required} حصص خلال ${possibleDays} أيام متاحة فقط. يلزم تكرار ${required-possibleDays} حصة على الأقل في يوم أو أكثر. سيسمح المحرك بالتكرار الضروري تلقائياً، دون تغيير قيود المدرس.`, 'constraints',t.id);}
  const dailyLimit=Math.max(1,+r.maxDaily||99);
  const perDay=active.map(d=>{const cap=sectionDayPeriods(sec,d);let count=0;for(let period=1;period<=cap;period++)if(!(sr.noFirst&&period===1)&&!(sr.noLast&&period===cap)&&!(r.unavailable?.[d.id]||[]).includes(period))count++;return Math.min(count,dailyLimit)});
  if(required>perDay.reduce((x,y)=>x+y,0))add('block',`استحالة توزيع — ${sub.name} / ${t.name}`,`الشعبة ${sec.name}: المطلوب ${required} والمتاح بعد احتساب الحد اليومي والقيود ${perDay.reduce((x,y)=>x+y,0)}. الإجراء: خفف قيد المدرس أو المادة.`, 'constraints',t.id);
  if(+a.weeklyPeriods>slots||false)add('block',`قيد المادة يمنع التكليف — ${sub.name}`,`${t.name}، ${db.stages.find(g=>g.id===sec.stageId)?.name||''} ${sec.name}: مطلوب ${a.weeklyPeriods} حصة، المتاح ${slots} خانة في ${possibleDays} أيام.`,'subjects');
 });
 if(result&&!result.ok&&['time','nodes','exhausted'].includes(result.reason))add('warning','لم يثبت استحالة الجدول',`المحرك توقف بعد ${result.nodes||0} عقدة، وأفضل عمق ${result.bestDepth||0} من ${result.total||'—'}. انتهاء البحث لا يثبت أن البيانات مستحيلة. راجع التنبيهات ثم أعد المحاولة.`,'feasibility');
 return found;
}
function smartCapacityHtml(result){
 const d=result?.diagnostics||{}, sf=d.sectionFlowFailures||[], tf=d.flowFailures||[], af=d.assignmentDiagnostics||[];
 const aname=id=>{const a=db.assignments.find(x=>x.id===id);if(!a)return 'تكليف غير معروف';const t=db.teachers.find(x=>x.id===a.teacherId),sub=db.subjects.find(x=>x.id===a.subjectId);return `${sub?.name||'مادة'} — ${t?.name||'مدرس'} (${a.weeklyPeriods} حصص)`};
 const secname=id=>{const s=db.sections.find(x=>x.id===id),g=db.stages.find(x=>x.id===s?.stageId);return `${g?.name||''} ${s?.name||''}`};
 let html='';
 for(const x of sf){const jobs=x.assignmentIds||[];html+=`<div class="issue red"><div class="issue-icon">🔴</div><div style="flex:1"><b>عجز مثبت في سعة ${esc(secname(x.sectionId))}</b><p>المطلوب ${x.required} حصة؛ أقصى ما تسمح به شبكة الخانات الحالية ${x.maximumFlow}؛ العجز ${x.shortfall}. هذا الحد ناتج عن قيود التكليفات وليس سعة الصف العامة.</p><details><summary>عرض المواد والمدرسين المرتبطين بالفحص (${jobs.length})</summary><ul>${jobs.map(id=>`<li>${esc(aname(id))}</li>`).join('')}</ul><p>هذه قائمة التكليفات الداخلة في الحساب، وليست إثباتاً بأن جميعها سبب التعارض.</p></details><div class="diag-fix"><b>مقترح الفحص:</b> راجع إتاحة المدرسين لهذه الشعبة وقواعد منع التكرار والقيود المتقدمة. لا يمكن تحديد أقل تغيير مضمون من نتيجة التدفق وحدها؛ يجب اختبار كل تعديل افتراضياً ثم إعادة الفحص.</div><button class="secondary diagnostic-jump" data-target="assignments">فتح التكليفات</button> <button class="secondary diagnostic-jump" data-target="constraints">فتح قيود المدرسين</button></div></div>`}
 for(const x of tf){html+=`<div class="issue red"><div class="issue-icon">🔴</div><div style="flex:1"><b>عجز سعة المدرس ${esc(x.teacher)}</b><p>مطلوب ${x.required}؛ أقصى توزيع ${x.maximumFlow}؛ العجز ${x.shortfall}.</p><details><summary>التكليفات (${(x.assignmentIds||[]).length})</summary><ul>${(x.assignmentIds||[]).map(id=>`<li>${esc(aname(id))}</li>`).join('')}</ul></details><div class="diag-fix">راجع أيام وحصص عدم الإتاحة والحد اليومي، ثم اختبر أي تعديل قبل اعتماده.</div><button class="secondary diagnostic-jump" data-target="constraints">فتح القيود</button></div></div>`}
 for(const x of af){html+=`<div class="issue red"><div class="issue-icon">🔴</div><div><b>تكليف لا يمتلك خانات كافية</b><p>${esc(x.teacher||'')} — ${esc(x.section||'')}؛ مطلوب ${x.required}، متاح ${x.available}.</p></div></div>`}
 return html;
}
function runSmartCapacityDiagnosis(){
 const targets=['smartCapacityResult','smartCapacityFeasResult'].map(id=>document.getElementById(id)).filter(Boolean);
 if(!targets.length)return;targets.forEach(t=>t.innerHTML='<div class="notice">جارٍ تحليل سعة المدرسين والشعب دون تعديل البيانات...</div>');
 let worker;try{worker=new Worker('generator-worker.js?v='+APP_VERSION)}catch(e){targets.forEach(t=>t.textContent='تعذر تشغيل محرك التشخيص: '+e);return}
 let done=false;const finish=r=>{if(done)return;done=true;clearTimeout(timer);worker.terminate();window.smartCapacityReport={version:APP_VERSION,checkedAt:new Date().toISOString(),result:r};const body=smartCapacityHtml(r);targets.forEach(t=>t.innerHTML=`<div class="generation-report"><b>${r.ok?'🟢 لم يُكتشف عجز في فحوص السعة الضرورية':'🔴 نتيجة فحص السعة'}</b><p>${esc(r.message||r.reason||'')}</p>${body||'<p>لا يثبت اجتياز هذه الفحوص أن الجدول الكامل قابل للتوليد.</p>'}<button class="secondary" type="button" id="exportSmartCapacity">تصدير التقرير JSON</button> <button class="secondary" type="button" id="smartRepairBtn">اختبار بدائل يوم التفرغ</button><div id="smartRepairResult"></div></div>`);document.querySelectorAll('#exportSmartCapacity').forEach(b=>b.onclick=()=>{const blob=new Blob([JSON.stringify(window.smartCapacityReport,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='masar-capacity-diagnosis.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)});wireDiagnostics();document.querySelectorAll('#smartRepairBtn').forEach(b=>b.onclick=runSmartRepairSuggestions)};
 const timer=setTimeout(()=>finish({ok:false,reason:'timeout',message:'انتهت مهلة فحص السعة دون نتيجة حاسمة؛ لا يعني ذلك وجود تعارض.'}),12000);
 worker.onmessage=e=>{if(e.data?.type==='result')finish(e.data.result)};worker.onerror=()=>finish({ok:false,reason:'worker-error',message:'خطأ أثناء تشغيل فحص السعة.'});worker.postMessage({type:'start',db:structuredClone(db),deadlineMs:10000,diagnosticOnly:true});
}
// Counterfactual diagnosis: evaluate moving a whole-day teacher absence without editing school data.
function smartCandidateCheck(data){return new Promise(resolve=>{
 let w,done=false;try{w=new Worker('generator-worker.js?v='+APP_VERSION)}catch(e){resolve({ok:false,reason:'worker-error'});return}
 const finish=r=>{if(done)return;done=true;clearTimeout(timer);w.terminate();resolve(r)};
 const timer=setTimeout(()=>finish({ok:false,reason:'timeout'}),12000);
 w.onmessage=e=>{if(e.data?.type==='result')finish(e.data.result)};
 w.onerror=()=>finish({ok:false,reason:'worker-error'});
 w.postMessage({type:'start',db:data,deadlineMs:10000,diagnosticOnly:true});
})}
async function runSmartRepairSuggestions(){
 const host=document.getElementById('smartRepairResult');if(!host)return;
 const baseline=window.smartCapacityReport?.result;
 if(!baseline||baseline.ok){host.innerHTML='<div class="notice">شغّل فحص السعة أولاً. لا توجد مشكلة مثبتة للاختبار في النتيجة الحالية.</div>';return}
 const ids=new Set();for(const f of baseline.diagnostics?.sectionFlowFailures||[])for(const id of f.assignmentIds||[]){const a=db.assignments.find(x=>x.id===id);if(a)ids.add(a.teacherId)}
 for(const f of baseline.diagnostics?.flowFailures||[])for(const id of f.assignmentIds||[]){const a=db.assignments.find(x=>x.id===id);if(a)ids.add(a.teacherId)}
 for(const f of baseline.diagnostics?.assignmentDiagnostics||[]){const a=db.assignments.find(x=>x.id===f.assignmentId);if(a)ids.add(a.teacherId)}
 const candidates=[];for(const tid of ids){const rule=db.teacherRules?.[tid];if(!rule)continue;
 for(const oldDay of db.days.filter(d=>d.active&&d.periods>0)){
 const absent=rule.unavailable?.[oldDay.id]||[];if(absent.length!==oldDay.periods||!Array.from({length:oldDay.periods},(_,i)=>i+1).every(p=>absent.includes(p)))continue;
 for(const newDay of db.days.filter(d=>d.active&&d.periods>0&&d.id!==oldDay.id)){
 const newAbsent=rule.unavailable?.[newDay.id]||[];if(newAbsent.length===newDay.periods)continue;
 candidates.push({tid,oldDay,newDay});
 }
 }}
 if(!candidates.length){host.innerHTML='<div class="notice">لم يُعثر على يوم تفرغ كامل قابل للنقل بين تكليفات الشعبة. راجع القيود الجزئية يدوياً.</div>';return}
 host.innerHTML='<div class="notice">جارٍ اختبار '+candidates.length+' بديلاً افتراضياً دون تغيير البيانات. قد يستغرق ذلك بعض الوقت...</div>';
 const findings=[];for(let i=0;i<candidates.length;i++){
 const c=candidates[i],copy=structuredClone(db),r=copy.teacherRules[c.tid];
 // Preserve existing partial unavailability on the old day? A day-off move means restore the old day entirely.
 r.unavailable[c.oldDay.id]=[];r.unavailable[c.newDay.id]=Array.from({length:c.newDay.periods},(_,j)=>j+1);syncStatusFromRules(c.tid,copy);
 const result=await smartCandidateCheck(copy);
 const oldShortfall=(baseline.diagnostics?.sectionFlowFailures||[]).reduce((v,f)=>v+(f.shortfall||0),0);
 const newShortfall=(result.diagnostics?.sectionFlowFailures||[]).reduce((v,f)=>v+(f.shortfall||0),0);
 const cleared=!!result.ok;findings.push({teacherId:c.tid,teacher:db.teachers.find(t=>t.id===c.tid)?.name||'',from:c.oldDay.name,to:c.newDay.name,passedNecessaryChecks:cleared,reason:result.reason||'',shortfall:newShortfall,originalShortfall:oldShortfall});
 host.innerHTML='<div class="notice">اختُبر '+(i+1)+' من '+candidates.length+' بدائل...</div>';
 }
 findings.sort((a,b)=>Number(b.passedNecessaryChecks)-Number(a.passedNecessaryChecks)||a.shortfall-b.shortfall||a.teacher.localeCompare(b.teacher,'ar'));findings.forEach((f,i)=>{f.rank=i+1;f.evidence=f.passedNecessaryChecks?'اجتاز فحص السعة فقط؛ يحتاج اختبار التوليد الكامل':'لم يثبت إزالة العجز';f.changeCount=1});
 window.smartRepairReport={version:APP_VERSION,checkedAt:new Date().toISOString(),baseline,findings};
 host.innerHTML='<div class="generation-report"><b>نتائج اختبار نقل يوم التفرغ (دون تعديل البيانات)</b><p>الترتيب وفق اجتياز فحوص السعة، ثم أقل عجز متبقٍ. جميع البدائل تغير قيداً واحداً. لا يُعتبر أي بديل حلاً معتمداً قبل توليد الجدول الكامل والتحقق المستقل منه.</p>'+findings.map(f=>`<div class="issue ${f.passedNecessaryChecks?'green':'orange'}"><div><b>الترتيب ${f.rank} — ${esc(f.teacher)}: ${esc(f.from)} ← ${esc(f.to)}</b><p>${f.passedNecessaryChecks?'اجتاز فحوص السعة الضرورية':'ما زالت توجد موانع أو لم يحسم الاختبار ('+esc(f.reason)+')'}</p></div></div>`).join('')+'<button id="exportSmartRepairs" class="secondary">تصدير المقترحات JSON</button></div>';
 document.getElementById('exportSmartRepairs').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(window.smartRepairReport,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='masar-repair-scenarios.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)};
}
function diagnosticHtml(result){if(!result||result.ok)return '';
 const ac=result.diagnostics?.assignmentDiagnostics||[];
 const capacityHtml=ac.length?`<div class="notice warning"><b>تكليفات مستحيلة حسابياً ضمن الخانات المسموحة:</b>${ac.map(x=>`<div>المدرس ${esc(x.teacher||'—')} — الشعبة ${esc(x.section||'—')}: مطلوب ${x.required}، المتاح ${x.available}. <b>الحل:</b> افتح حصصاً إضافية لهذا المدرس أو خفف قيد المادة/القيد المتقدم أو أعد توزيع التكليف.</div>`).join('')}</div>`:'';
 const issues=generationDiagnostics(result);
 const capacityDetails=smartCapacityHtml(result);
 const colors={block:'🔴',warning:'🟠',info:'🔵'};
 return `<section class="generation-report"><h3>مساعد تشخيص فشل التوليد — إجراءات مقترحة</h3>${capacityHtml}${capacityDetails}<p class="muted">لا يغير المساعد أي تكليف أو قيد دون موافقتك. الفحص يميز بين الخطأ المانع، واختلاف الإعدادات، والملاحظات. لا يعتبر انتهاء المهلة دليلاً على استحالة الجدول.</p>${issues.length?issues.map(x=>`<div class="issue ${x.severity==='block'?'red':'orange'}"><div class="issue-icon">${colors[x.severity]}</div><div style="flex:1"><b>${esc(x.title)}</b><div class="muted">${esc(x.detail)}</div><button type="button" class="secondary diagnostic-jump" data-target="${x.where}" data-teacher="${esc(x.teacherId||'')}">${x.teacherId?'فتح قيود «'+esc((db.teachers.find(t=>t.id===x.teacherId)||{}).name||'المدرس')+'»':'فتح الإعداد المعني'}</button></div></div>`).join(''):'<div class="notice">لم يكشف الفحص السريع سبباً حاسماً. قد يكون التعارض مركباً أو خوارزمية البحث لم تصل إلى حل.</div>'}</section>`;
}
function wireDiagnostics(){document.querySelectorAll('.diagnostic-jump').forEach(b=>b.onclick=()=>{if(b.dataset.teacher&&db.teachers.some(t=>t.id===b.dataset.teacher))window.constraintTeacher=b.dataset.teacher;page=b.dataset.target;render();window.scrollTo({top:0})})}
function feasibility(){
  const issues=analyzeFeasibility(),reds=issues.filter(x=>x.level==='red').length,oranges=issues.filter(x=>x.level==='orange').length;
  const green=reds===0;
  const item=i=>`<div class="issue ${i.level}"><div class="issue-icon">${i.level==='red'?'🔴':'🟠'}</div><div><b>${esc(i.title)}</b><div class="muted">${esc(i.detail)}</div></div></div>`;
  $('#workspace').innerHTML=`<h2>فحص إمكانية إنشاء الجدول</h2><div class="notice">هذا الفحص لا يولد الجدول. وظيفته اكتشاف الاستحالات والتنازلات المتوقعة قبل تشغيل محرك التوليد.</div>
  <div class="feas-head ${green?'ok':'bad'}"><div class="feas-score">${green?'✓':'!'}</div><div><h3>${green?'يمكن الانتقال إلى التوليد':'توجد مشاكل يجب معالجتها'}</h3><div>${reds} أخطاء مانعة — ${oranges} تحذيرات</div></div></div>
  ${green&&oranges===0?'<div class="issue green"><div class="issue-icon">🟢</div><div><b>البيانات سليمة</b><div class="muted">لم يكتشف الفحص الحالي مشكلة تمنع إنشاء جدول صالح.</div></div></div>':''}
  ${issues.map(item).join('')}
  <div class="actions"><button id="smartCapacityFeasBtn" class="secondary">🧠 فحص سعة الشعب والمدرسين</button></div><div id="smartCapacityFeasResult"></div><div class="actions"><button id="rerun">إعادة الفحص</button>${green?'<button class="secondary" id="goGenerate">الانتقال إلى التوليد الآلي</button>':''}</div>`;
  $('#rerun').onclick=feasibility;$('#smartCapacityFeasBtn').onclick=runSmartCapacityDiagnosis;
  if($('#goGenerate')) $('#goGenerate').onclick=()=>{page='generator';render()};
}


function teacherShort(name){return String(name||'').trim().split(/\s+/).slice(0,2).join(' ')}
// Print-only compact teacher label. Resolve collisions among different teachers.
function printTeacherLabels(){
 const byId=new Map(), groups=new Map();
 for(const t of db.teachers){
  const parts=String(t.name||'').trim().split(/\s+/).filter(Boolean);
  const short=parts.length>1?`${parts[0]} ${Array.from(parts[1])[0]}.`:(parts[0]||'—');
  byId.set(t.id,short);
  if(!groups.has(short))groups.set(short,[]);
  groups.get(short).push(t);
 }
 for(const [label,teachers] of groups){
  if(teachers.length<2)continue;
  for(const t of teachers){
   const parts=String(t.name||'').trim().split(/\s+/).filter(Boolean);
   byId.set(t.id,parts.length>2?`${parts[0]} ${parts[1]} ${Array.from(parts[2])[0]}.`:parts.join(' '));
  }
 }
 // Never leave two distinct teachers with the same printed label.
 const secondGroups=new Map();
 for(const [id,label] of byId){if(!secondGroups.has(label))secondGroups.set(label,[]);secondGroups.get(label).push(id)}
 for(const [label,ids] of secondGroups){if(ids.length>1)ids.forEach(id=>byId.set(id,db.teachers.find(t=>t.id===id)?.name||label))}
 return byId;
}
function slotKey(dayId,period){return dayId+'|'+period}
// Generation runs in generator-worker.js; do not run backtracking on the UI thread.
let generationWorker=null;
let generationCancel=null;
// All timetable generation runs locally in a dedicated Web Worker.
// No school data is sent to a remote solver service.
function validateLocalCandidate(entries){return new Promise(resolve=>{
 let w=new Worker('candidate-validator.js?v='+APP_VERSION),done=false;
 const timer=setTimeout(()=>{if(!done){done=true;w.terminate();resolve({ok:false,reason:'انتهت مهلة التدقيق المستقل'})}},30000);
 w.onmessage=e=>{if(done)return;done=true;clearTimeout(timer);w.terminate();resolve(e.data)};
 w.onerror=()=>{if(done)return;done=true;clearTimeout(timer);w.terminate();resolve({ok:false,reason:'تعذر تشغيل المدقق المستقل'})};
 w.postMessage({db:structuredClone(db),entries});
})}
async function startGeneration(){
 if(generationWorker)return;
 {const pre=directGenerationDiagnostics().filter(x=>x.level==='block');if(pre.length){showDirectDiagnostics();$('#directDiagnosisResult')?.scrollIntoView?.({behavior:'smooth'});alert('لن يبدأ التوليد: وُجد '+pre.length+' سبب مانع مؤكد. راجع التشخيص أدناه وعالجها أولاً.');return}}
 const blockers=analyzeFeasibility().filter(x=>x.level==='red');
 if(blockers.length){alert('عالج الأخطاء المانعة أولاً');return;}
 if(db.timetable.length&&!(await masarConfirm('سيبقى الجدول الحالي محفوظاً حتى ينجح إنشاء جدول جديد. متابعة؟')))return;
 const button=$('#generateBtn'),status=$('#generationProgress');
 button.disabled=true;button.textContent='جاري التوليد...';
 const began=Date.now();let finished=false,lastUpdate=Date.now(),lastProgress={nodes:0,bestDepth:0,total:0,placed:0},phase='تشغيل المحرك';
 let worker;try{worker=new Worker('generator-worker.js?v='+APP_VERSION)}catch(err){button.disabled=false;button.textContent='توليد الجدول تلقائياً';window.generationReport={ok:false,reason:'worker-error',message:'تعذر تشغيل ملف المحرك: '+String(err),seconds:'0'};generator();return}generationWorker=worker;
 const tick=setInterval(()=>{if(finished)return;const elapsed=Date.now()-began;
   if(elapsed>255000){finish({ok:false,reason:'time',...lastProgress,message:`أوقف مراقب السلامة المحرك بعد 255 ثانية. آخر مرحلة: ${phase}. لم تتغير البيانات.`});return}
   if(status)status.textContent=`${phase} — ${Math.round(elapsed/1000)} ثانية — عقد ${lastProgress.nodes} — أفضل عمق ${lastProgress.bestDepth} من ${lastProgress.total||'—'}. ${Date.now()-lastUpdate>7000?'المحرك مشغول بالحساب، يمكن إيقافه.':''}`;
 },500);
 generationCancel=()=>finish({ok:false,reason:'cancelled',...lastProgress,message:'أوقفت التوليد. بقي الجدول السابق محفوظاً.'});
 const stop=$('#stopGenerate');if(stop){stop.hidden=false;stop.onclick=()=>generationCancel()}
 const finish=async result=>{if(finished)return;finished=true;clearInterval(tick);worker.terminate();generationWorker=null;generationCancel=null;
   if(result.ok&&!result.reused){
     const verification=await validateLocalCandidate(result.entries);
     if(!verification.ok)result={ok:false,reason:'validation-failed',message:'رفض المدقق المستقل الجدول: '+(verification.reason||'مخالفة للقيود'),nodes:result.nodes,bestDepth:result.bestDepth,total:result.total};
     else{if(!preserveTimetable('قبل استبدال الجدول بجدول جديد'))result={ok:false,reason:'backup-failed',message:'لم تُستبدل الحصص: تعذر حفظ نسخة استرجاع قبل التوليد.'};
     else{const previous=db.timetable;db.manualHistory=[];db.timetable=result.entries.map((e,i)=>({...e,id:'ent_'+Date.now().toString(36)+'_'+i}));if(!save()){db.timetable=previous;result={ok:false,reason:'storage-failed',message:'لم يُحفظ الجدول الجديد بسبب خطأ في التخزين.'}}}}
   }
   window.generationReport={...result,seconds:((Date.now()-began)/1000).toFixed(1)};
   if(!result.ok&&['exception','worker-error','validation-failed','storage-failed','backup-failed'].includes(result.reason)&&window.MasarLog)MasarLog.add('generate',result.reason+': '+String(result.message||'').slice(0,300));
   if(page==='generator')generator();
 };
 worker.onmessage=e=>{const data=e.data||{};lastUpdate=Date.now();if(data.type==='phase'){phase=data.phase||phase;return}if(data.type==='progress'){phase='البحث عن توزيع متوافق';lastProgress={nodes:data.nodes||0,bestDepth:data.bestDepth||0,total:data.total||0,placed:data.placed||0};return}if(data.type==='result')finish(data.result)};
 worker.onerror=e=>finish({ok:false,reason:'worker-error',message:'حدث خطأ في عامل التوليد. تأكد من رفع ملف generator-worker.js إلى GitHub.'});
 try{worker.postMessage({type:'start',db:(window.masarGenDb?window.masarGenDb():structuredClone(db)),deadlineMs:240000})}catch(err){finish({ok:false,reason:'exception',message:'فشل إرسال البيانات إلى المحرك: '+String(err)})}
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
  const shortPrintNames=printTeacherLabels();
  let rows='',totalRows=0;
  db.days.filter(d=>d.active).sort((a,b)=>a.order-b.order).forEach(d=>{
    // In print, drop trailing periods that are empty for every section on this day (they only waste paper).
    let eff=d.periods;if(groupedPrint){let last=0;for(let p=1;p<=d.periods;p++)if(secs.some(sec=>db.timetable.some(x=>x.sectionId===sec.id&&x.dayId===d.id&&x.period===p)))last=p;eff=Math.max(1,last)}
    totalRows+=eff;
    for(let p=1;p<=eff;p++){
      rows+=`<tr class="day-row day-${d.id}">${p===1?`<th scope="rowgroup" rowspan="${eff}" class="day-label day-${d.id}"><span class="vertical-day">${esc(d.name)}</span></th>`:''}<th class="period-number">${p}</th>`+secs.map(sec=>{
        const e=db.timetable.find(x=>x.sectionId===sec.id&&x.dayId===d.id&&x.period===p);
        if(p>sectionDayPeriods(sec,d))return '<td class="tt-off">—</td>';if(!e)return '<td class="tt-empty">—</td>';
        const su=db.subjects.find(x=>x.id===e.subjectId),t=db.teachers.find(x=>x.id===e.teacherId);
        return `<td class="lesson" style="background:${db.stages.find(g=>g.id===sec.stageId)?.color||'#eef4fa'}22;border-top:3px solid ${db.stages.find(g=>g.id===sec.stageId)?.color||'#a0aec0'}"><span class="lesson-inline"><b>${esc(su?.name||'—')}</b><span class="lesson-sep"> / </span><small>${esc(shortPrintNames.get(t?.id)||'—')}</small></span></td>`;
      }).join('')+'</tr>';
    }
  });
  const rowH=groupedPrint?Math.max(6.6,Math.min(7.2,Math.round(218/Math.max(1,totalRows)*10)/10)):6.6;return `<div class="tt-wrap"><table class="timetable compact-timetable" dir="rtl" style="--compact-width:${tableWidth}px;--row-h:${rowH}mm"><colgroup><col class="day-col" ><col class="period-col" >${secs.map((_,i)=>`<col class="subject-col">`).join('')}</colgroup><thead>${groupedPrint?`<tr class="stage-groups"><th rowspan="2" colspan="2" class="corner-cell">&nbsp;</th>${db.stages.slice().sort((a,b)=>a.order-b.order).filter(g=>secs.some(x=>x.stageId===g.id)).map(g=>`<th class="stage-group-title" colspan="${secs.filter(x=>x.stageId===g.id).length}">${esc(stageDisplayName(g))}</th>`).join('')}</tr><tr class="section-names">${secs.map(s=>`<th class="section-title">${esc(s.name)}</th>`).join('')}</tr>`:`<tr><th class="vertical-heading"><span>اليوم</span></th><th class="vertical-heading"><span>الحصة</span></th>${secs.map(s=>{let g=db.stages.find(x=>x.id===s.stageId);return `<th style="border-top:4px solid ${g?.color||'#888'}">${esc(g?stageDisplayName(g):'')} ${esc(s.name)}</th>`}).join('')}</tr>`}</thead><tbody>${rows}</tbody></table></div>`;
}
function generator(){
  const issues=analyzeFeasibility(),reds=issues.filter(x=>x.level==='red').length;
  const warnings=timetableIssues(),q=scheduleQuality();
  const expected=db.assignments.reduce((n,a)=>n+Math.max(0,+a.weeklyPeriods||0),0);
  const count=db.timetable.length;
  const complete=expected>0&&count===expected;
  const stateLabel=generationWorker?'جارٍ التوليد':reds?'توجد أخطاء مانعة':count===0?'لم يتم توليد جدول':complete?'جدول مكتمل عددياً — يحتاج تدقيقاً':'جدول غير مكتمل';
  $('#workspace').innerHTML=`<div class="gen-dashboard">
    <div class="gen-hero"><div><span class="gen-eyebrow">مركز التوليد والتشخيص</span><h2>إنشاء الجدول المدرسي</h2><p>ابدأ بالفحص، ثم التوليد، وراجع النتيجة قبل اعتمادها.</p></div><div class="gen-state ${reds?'is-blocked':complete?'is-complete':''}"><span class="gen-state-dot"></span>${stateLabel}</div></div>
    <div class="gen-metrics"><div><strong>${count}<small> / ${expected}</small></strong><span>الحصص الموزعة</span></div><div><strong>${reds}</strong><span>أخطاء فحص الجدوى</span></div><div><strong>${warnings}</strong><span>تحذيرات التوزيع</span></div><div><strong>${db.sections.length}</strong><span>الشعب</span></div></div>
    <div class="gen-actions"><button id="generateBtn" ${reds?'disabled':''}>${db.timetable.length?'إعادة توليد الجدول':'توليد الجدول'}</button><button class="secondary" id="checkBtn">فحص الجدوى</button><button class="secondary" id="verifyTTBtn">تدقيق وتصدير الشهادة</button>${db.timetable.length?'<button class="danger" id="clearTT">مسح الجدول</button>':''}</div>
    <div id="generationProgress" class="gen-progress" aria-live="polite">${generationWorker?'التوليد جارٍ...':reds?'عالج الأخطاء المانعة قبل التوليد.':complete?'اكتمل عدد الحصص؛ استخدم التدقيق المستقل للتحقق من صحة الجدول.':'يمكنك فحص القيود ثم بدء التوليد.'}</div><button id="stopGenerate" class="danger" ${generationWorker?'':'hidden'}>إيقاف التوليد</button>
    ${window.generationReport?`<section class="gen-last-report"><b>آخر محاولة:</b> ${esc(window.generationReport.message||'لا توجد تفاصيل')} <small>السبب: ${esc(window.generationReport.reason||'—')} · الزمن: ${esc(window.generationReport.seconds||'—')} ثانية · أفضل عمق: ${window.generationReport.bestDepth||0} / ${window.generationReport.total||'—'}</small></section>`:''}
    <div class="gen-section-title"><h3>التشخيص والحلول</h3><span>افتح التفاصيل عند الحاجة</span></div>
    <details class="gen-details" ${reds||window.generationReport&&!window.generationReport.ok?'open':''}><summary>فحص المشكلات والقيود المؤثرة <span>عرض التقرير والاختبارات</span></summary><div class="gen-details-body">${reds?`<div class="notice error">يوجد ${reds} خطأ مانع في فحص الجدوى.</div>`:''}${diagnosticControls()}${diagnosticHtml(window.generationReport)}</div></details>
    ${db.timetable.length?`<details class="gen-details"><summary>مؤشرات جودة التوزيع <span>مؤشرات إرشادية وليست شهادة صلاحية</span></summary><div class="gen-details-body"><div class="quality-grid"><div><b>${q.score}/100</b><span>مؤشر الجودة</span></div><div><b>${q.repeats}</b><span>تكرار يومي</span></div><div><b>${q.gaps}</b><span>فراغات المدرسين</span></div><div><b>${q.avoid}</b><span>حصص غير مفضلة</span></div></div><p class="muted">لا تعني درجة الجودة وجود مخالفات إلزامية؛ يعتمد التحقق على المدقق المستقل.</p></div></details>`:''}
    <details class="gen-details"><summary>معلومات المحرك <span>التشغيل المحلي وحدود الفحص</span></summary><div class="gen-details-body"><p>محرك مجاني يعمل داخل المتصفح باستخدام البحث والتراجع. لا تُرسل بيانات المدرسة إلى خادم خارجي. انتهاء المهلة لا يثبت استحالة الجدول.</p></div></details>
    <div class="gen-section-title"><h3>معاينة الجدول</h3><span>تظهر الحصص المحفوظة أدناه</span></div>${timetableTable()}
  </div>`;
  wireDiagnostics();wireDirectDiagnostics();if(window.generationReport&&!window.generationReport.ok&&!window.generationReport.reused)showDirectDiagnostics();
  $('#checkBtn').onclick=()=>{page='feasibility';render()};
  $('#verifyTTBtn').onclick=async()=>{const entries=structuredClone(db.timetable||[]),expected=db.assignments.reduce((n,a)=>n+Math.max(0,+a.weeklyPeriods||0),0);const result=await validateLocalCandidate(entries);const report={applicationVersion:APP_VERSION,checkedAt:new Date().toISOString(),school:db.school?.name,expectedLessons:expected,actualLessons:entries.length,valid:!!result.ok&&entries.length===expected,reason:result.ok?'اجتاز الجدول التدقيق المستقل':result.reason,validator:result.ok?'passed':'failed',generationReport:window.generationReport||null};const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='masar-verification-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);alert(report.valid?'نجح تدقيق '+entries.length+' حصة. تم تصدير التقرير.':'لم ينجح التدقيق: '+report.reason+'؛ تم تصدير تقرير الفحص.');};
  if($('#generateBtn')){$('#generateBtn').disabled=!!generationWorker||!!reds;$('#generateBtn').onclick=startGeneration;}
  if(generationWorker&&$('#stopGenerate'))$('#stopGenerate').onclick=()=>generationCancel?.();
  if($('#clearTT'))$('#clearTT').onclick=async ()=>{if((await masarConfirm('مسح الجدول المولد؟ سيتم حفظ نسخة استرجاع أولاً.'))){if(!preserveTimetable('مسح الجدول'))return;db.timetable=[];save();generator()}};
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
  if((r.unavailable?.[e.dayId]||[]).includes(e.period)){warnings.push('المدرس غير متاح');continue}
  if(draft.some(x=>x.id!==e.id&&x.teacherId===e.teacherId&&x.dayId===e.dayId&&x.period===e.period)){warnings.push('تعارض في جدول المدرس');continue}
  if(draft.some(x=>x.id!==e.id&&x.sectionId===e.sectionId&&x.dayId===e.dayId&&x.period===e.period)){warnings.push('تعارض في جدول الشعبة');continue}
  const daily=draft.filter(x=>x.teacherId===e.teacherId&&x.dayId===e.dayId).length;
  if(daily>Math.max(1,+r.maxDaily||99))warnings.push('تجاوز الحد اليومي للمدرس');
  const sr=db.subjectRules[e.subjectId]||{},applicable=!sr.stageId||sr.stageId===sec.stageId;
  if(applicable&&sr.strict!=='soft'&&((sr.noFirst&&e.period===1)||(sr.noLast&&e.period===sectionDayPeriods(sec,day))))warnings.push('مخالفة قيد المادة الإلزامي');
  const repeats=draft.filter(x=>x.id!==e.id&&x.sectionId===e.sectionId&&x.subjectId===e.subjectId&&x.dayId===e.dayId).length;
  if(repeats){warnings.push('تكرار المادة في يوم واحد؛ تحقق من الضرورة حسب الأيام المتاحة')}
  if((r.avoid||[]).includes(e.period))warnings.push('وقت غير مفضل للمدرس');
 }
 return {errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
}
function recordManualConflict(type,changes,warnings){
 if(!warnings.length)return;
 db.manualConflictLog??=[];
 db.manualConflictLog.push({id:uid('conflict'),at:new Date().toISOString(),type,
  changes:changes.map(x=>({...x})),warnings:[...new Set(warnings)]});
 if(db.manualConflictLog.length>250)db.manualConflictLog.shift();
}
async function commitManual(changes,type,extraWarnings=[]){
 const check=manualValidate(changes);
 if(check.errors.length){alert('لا يمكن تنفيذ التعديل:\n'+check.errors.join('\n'));return false}
 const warnings=[...new Set([...check.warnings,...extraWarnings])];
 if(warnings.length&&!(await masarConfirm('⚠️ تحذيرات وتعارضات:\n'+warnings.join('\n')+'\n\nهل تريد الحفظ رغم التعارض وتسجيله؟')))return false;
 if(!preserveTimetable('قبل تعديل يدوي: '+type))return false;
 const oldTimetable=structuredClone(db.timetable),oldHistory=structuredClone(db.manualHistory||[]),oldLog=structuredClone(db.manualConflictLog||[]);
 const before=changes.map(c=>{const e=db.timetable.find(x=>x.id===c.id);return {id:e.id,dayId:e.dayId,period:e.period}});
 changes.forEach(c=>Object.assign(db.timetable.find(e=>e.id===c.id),c));
 db.manualHistory??=[];db.manualHistory.push({id:uid('edit'),at:new Date().toISOString(),type,before,after:changes.map(c=>({...c})),warnings});
 if(db.manualHistory.length>100)db.manualHistory.shift();
 recordManualConflict(type,changes,warnings);
 if(!save()){db.timetable=oldTimetable;db.manualHistory=oldHistory;db.manualConflictLog=oldLog;alert('تعذر حفظ التعديل، تمت استعادة البيانات في الذاكرة.');return false}
 workspaceTT();return true;
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
 saveBtn.onclick=async ()=>{const changes=proposal();if(changes&&(await commitManual(changes,type.value==='swap'?'تبديل حصتين':'نقل حصة')))close()};
}

// Batch editor: all proposed moves are validated against the same final timetable.
function batchManualEditor(){
 if(!db.timetable.length)return alert('أنشئ الجدول أولاً.');
 const o=document.createElement('div');o.className='edit-overlay batch-overlay';
 const days=db.days.filter(d=>d.active).sort((a,b)=>a.order-b.order);
 const teacherOpts=db.teachers.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar')).map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');
 o.innerHTML=`<div class="edit-card batch-card"><div class="edit-head"><h3>محرر التعديلات المتعددة</h3><button type="button" class="icon-close">×</button></div>
 <p class="muted">اختر مدرساً وحصته، وأضف عدة حصص إلى قائمة التعديل. حدد موعداً جديداً لكل حصة، ثم افحص النتيجة النهائية قبل الحفظ. لا تتغير البيانات حتى تضغط «اعتماد جميع التعديلات».</p>
 <div class="batch-pick"><div class="field"><label>المدرس</label><select id="batchTeacher">${teacherOpts}</select></div><div class="field"><label>الحصة الحالية</label><select id="batchEntry"></select></div><button type="button" id="batchAdd" class="secondary">إضافة الحصة</button></div>
 <div id="batchRows" class="batch-rows"></div><div id="batchStatus" aria-live="polite"></div>
 <div class="actions"><button id="batchCheck" type="button" class="secondary">فحص جميع التعديلات</button><button id="batchSave" type="button" disabled>اعتماد جميع التعديلات</button><button id="batchCancel" type="button" class="secondary">إلغاء</button></div></div>`;
 document.body.appendChild(o);
 const $b=q=>o.querySelector(q),picked=new Map(),teacher=$b('#batchTeacher'),entry=$b('#batchEntry'),rows=$b('#batchRows'),status=$b('#batchStatus'),saveBtn=$b('#batchSave');
 const close=()=>o.remove();$b('.icon-close').onclick=close;$b('#batchCancel').onclick=close;
 function entries(){const list=db.timetable.filter(e=>e.teacherId===teacher.value).sort((a,b)=>days.findIndex(d=>d.id===a.dayId)-days.findIndex(d=>d.id===b.dayId)||a.period-b.period);
 entry.innerHTML=list.map(e=>`<option value="${esc(e.id)}">${esc(manualLabel(e))}</option>`).join('');$b('#batchAdd').disabled=!list.length}
 teacher.onchange=entries;entries();
 function invalidate(){saveBtn.disabled=true;status.textContent='عدّلت الخيارات؛ أعد الفحص قبل الاعتماد.'}
 function proposal(){return [...picked.values()].map(x=>({id:x.id,dayId:x.dayId,period:+x.period}))}
 function renderRows(){
  rows.innerHTML=[...picked.values()].map((x,i)=>{const original=db.timetable.find(e=>e.id===x.id);
   const d=db.days.find(y=>y.id===x.dayId),sec=db.sections.find(y=>y.id===original.sectionId);
   const max=d?sectionDayPeriods(sec,d):0;
   return `<div class="batch-row" data-batch-id="${esc(x.id)}"><div class="batch-row-title"><b>${i+1}. ${esc(manualLabel(original))}</b><button type="button" class="secondary batch-remove">إزالة</button></div><div class="batch-fields"><label>اليوم الجديد<select class="batch-day">${days.map(day=>`<option value="${esc(day.id)}" ${day.id===x.dayId?'selected':''}>${esc(day.name)}</option>`).join('')}</select></label><label>الحصة الجديدة<select class="batch-period">${Array.from({length:max},(_,j)=>`<option value="${j+1}" ${j+1===+x.period?'selected':''}>${j+1}</option>`).join('')}</select></label></div></div>`
  }).join('')||'<div class="notice">لم تُضف أي حصة بعد.</div>';
  rows.querySelectorAll('.batch-row').forEach(r=>{const x=picked.get(r.dataset.batchId),day=r.querySelector('.batch-day'),period=r.querySelector('.batch-period');
   day.onchange=()=>{x.dayId=day.value;const d=db.days.find(y=>y.id===x.dayId),original=db.timetable.find(e=>e.id===x.id),sec=db.sections.find(y=>y.id===original.sectionId);x.period=Math.min(+x.period,sectionDayPeriods(sec,d));renderRows();invalidate()};
   period.onchange=()=>{x.period=+period.value;invalidate()};
   r.querySelector('.batch-remove').onclick=()=>{picked.delete(x.id);renderRows();invalidate()};
  });
 }
 $b('#batchAdd').onclick=()=>{const e=db.timetable.find(x=>x.id===entry.value);if(!e)return;if(e.locked||db.fixedLessons.some(f=>f.assignmentId===e.assignmentId&&f.dayId===e.dayId&&f.period===e.period))return alert('هذه الحصة مثبتة ولا يمكن تعديلها.');
 if(picked.has(e.id))return alert('الحصة موجودة بالفعل في القائمة.');
 picked.set(e.id,{id:e.id,dayId:e.dayId,period:e.period});renderRows();invalidate()};
 function check(){if(!picked.size){status.innerHTML='<div class="move-check red">أضف حصة واحدة على الأقل.</div>';saveBtn.disabled=true;return false}
  const changes=proposal(),v=manualValidate(changes);
  status.innerHTML=`<div class="move-check ${v.errors.length?'red':v.warnings.length?'orange':'green'}">${esc(v.errors.length?'⛔ '+v.errors.join('، '):v.warnings.length?'⚠️ '+v.warnings.join('، '):'✓ التعديلات متوافقة في الفحص الحالي')}</div>`;
  saveBtn.disabled=!!v.errors.length;return !v.errors.length}
 $b('#batchCheck').onclick=check;
 saveBtn.onclick=async ()=>{if(!check())return;const changes=proposal();if((await commitManual(changes,'تعديل متعدد ('+changes.length+' حصص)')))close()};
 renderRows();
}

function toggleTimetableLock(id){
  const e=db.timetable.find(x=>x.id===id);if(!e)return;e.locked=!e.locked;
  const i=db.fixedLessons.findIndex(f=>f.assignmentId===e.assignmentId&&f.dayId===e.dayId&&f.period===e.period);
  if(e.locked&&i<0)db.fixedLessons.push({id:uid('fix'),assignmentId:e.assignmentId,dayId:e.dayId,period:e.period});
  if(!e.locked&&i>=0)db.fixedLessons.splice(i,1);
  save();workspaceTT();
}
// ===== السحب والإفلات لتعديل الحصص يدوياً (جدول المدرس/الشعبة) — يعتمد على manualValidate نفسه =====
function dndToast(msg,level,undo){let t=document.getElementById('ttToast');if(!t){t=document.createElement('div');t.id='ttToast';t.setAttribute('role','status');t.setAttribute('aria-live','polite');document.body.appendChild(t)}
 t.className='tt-toast '+(level||'ok');t.innerHTML=`<span></span>${undo?'<button type="button" class="tt-toast-undo">تراجع</button>':''}`;t.firstChild.textContent=msg;t.hidden=false;
 if(undo)t.querySelector('.tt-toast-undo').onclick=()=>{t.hidden=true;undoManual()};clearTimeout(t._h);t._h=setTimeout(()=>{t.hidden=true},undo?7000:4500)}
function dndGapWarning(changes){const draft=db.timetable.map(e=>({...e,...(changes.find(c=>c.id===e.id)||{})}));const secs=new Set(),touched=new Set();changes.forEach(c=>{const e=db.timetable.find(x=>x.id===c.id);if(e){secs.add(e.sectionId);touched.add(e.sectionId+'|'+e.dayId);touched.add(e.sectionId+'|'+c.dayId)}});
 for(const k of touched){const [sid,did]=k.split('|'),ps=draft.filter(x=>x.sectionId===sid&&x.dayId===did).map(x=>x.period).sort((a,b)=>a-b);if(ps.length&&ps.some((p,i)=>p!==i+1))return 'يترك فراغاً داخل يوم الشعبة'}return ''}
function dndAdvanced(changes){const errors=[],warnings=[];for(const c of changes){const e0=db.timetable.find(x=>x.id===c.id),a=e0&&db.assignments.find(x=>x.id===e0.assignmentId),sec=e0&&db.sections.find(x=>x.id===e0.sectionId);if(!a||!sec)continue;
  for(const r of db.advancedRules||[]){const hit=advancedDiagnosticMatch(r,a,sec,c.dayId,c.period)&&((r.mode==='allow'&&(c.period<r.from||c.period>r.to))||(r.mode==='block'&&c.period>=r.from&&c.period<=r.to));if(hit)(r.strict==='soft'?warnings:errors).push(r.strict==='soft'?'يخالف قيداً متقدماً تفضيلياً':'يخالف قيداً متقدماً إلزامياً')}}
 return {errors:[...new Set(errors)],warnings:[...new Set(warnings)]}}
function dndEvaluate(mode,viewId,e,dayId,period){
 const inView=x=>(mode==='teacher'?x.teacherId===viewId:x.sectionId===viewId)&&x.dayId===dayId&&x.period===period;let target=db.timetable.find(inView);
 if(target&&target.id===e.id)return null;
 // في عرض المدرس: الخانة الفارغة عنده قد تكون مشغولة بحصة أخرى لشعبة الحصة؛ فالنقل إليها يعني تبديلها مع تلك الحصة
 if(!target&&mode==='teacher')target=db.timetable.find(x=>x.id!==e.id&&x.sectionId===e.sectionId&&x.dayId===dayId&&x.period===period);
 const changes=target?[{id:e.id,dayId,period},{id:target.id,dayId:e.dayId,period:e.period}]:[{id:e.id,dayId,period}],v=manualValidate(changes),adv=dndAdvanced(changes),gap=dndGapWarning(changes);
 const errors=[...v.errors],warnings=[...v.warnings,...adv.errors,...adv.warnings,...(gap?[gap]:[])];
 return {changes,type:target?'تبديل حصتين':'نقل حصة',errors,warnings,level:errors.length?'bad':warnings.length?'warn':'ok'}}
async function dndCommit(ev){
 const advanced=dndAdvanced(ev.changes);
 const warnings=[...new Set([...ev.warnings,...advanced.errors,...advanced.warnings])];
 if(!(await commitManual(ev.changes,ev.type,warnings)))return false;
 dndToast((warnings.length?'⚠️ ':'✓ ')+ev.type+(warnings.length?' — تم تسجيل التحذيرات':''),warnings.length?'warn':'ok',true);
 return true;
}
function lessonSheet(id){const e=db.timetable.find(x=>x.id===id);if(!e)return;const o=document.createElement('div');o.className='edit-overlay';
 o.innerHTML=`<div class="edit-card"><div class="edit-head"><h3>خيارات الحصة</h3><button class="icon-close" type="button" aria-label="إغلاق">×</button></div><div class="notice">${esc(manualLabel(e))}</div><div class="notice">لنقل الحصة اسحبها إلى خانة أخرى (على الجوال: اضغط مطولاً ثم اسحب).</div><div class="actions"><button id="shLock">${e.locked?'🔓 فتح التثبيت':'🔒 تثبيت الحصة'}</button><button class="secondary" id="shMove">نقل/تبديل بالقوائم</button><button class="secondary" id="shClose">إغلاق</button></div></div>`;
 document.body.appendChild(o);const close=()=>o.remove();o.querySelector('.icon-close').onclick=close;o.querySelector('#shClose').onclick=close;o.querySelector('#shLock').onclick=()=>{close();toggleTimetableLock(id)};o.querySelector('#shMove').onclick=()=>{close();moveTimetableEntry(id)}}
function enableTimetableDnD(root){
 const table=root.querySelector('table.focused');if(!table)return;const mode=table.dataset.mode,viewId=table.dataset.id;let st=null,hold=null;
 const clear=()=>{table.querySelectorAll('.dnd-ok,.dnd-warn,.dnd-bad,.dnd-hover,.dnd-src').forEach(c=>c.classList.remove('dnd-ok','dnd-warn','dnd-bad','dnd-hover','dnd-src'));if(st?.ghost)st.ghost.remove();document.body.classList.remove('dnd-active')};
 const slotOf=el=>{const td=el?.closest?.('td[data-slot]');return td&&table.contains(td)?td:null};
 const begin=(td,e,x,y)=>{const ghost=document.createElement('div');ghost.className='dnd-ghost';ghost.textContent=td.querySelector('b')?.textContent||'حصة';document.body.appendChild(ghost);
  st={td,e,ghost,map:new Map(),over:null,x,y};td.classList.add('dnd-src');document.body.classList.add('dnd-active');
  table.querySelectorAll('td[data-slot]').forEach(c=>{const [d,p]=c.dataset.slot.split('|'),ev=dndEvaluate(mode,viewId,e,d,+p);if(!ev)return;st.map.set(c,ev);c.classList.add('dnd-'+ev.level)});move(x,y)};
 const move=(x,y)=>{if(!st)return;st.x=x;st.y=y;st.ghost.style.left=x+'px';st.ghost.style.top=y+'px';const el=document.elementFromPoint?.(x,y),c=slotOf(el);
  if(st.over&&st.over!==c)st.over.classList.remove('dnd-hover');st.over=c;if(c&&st.map.has(c)){c.classList.add('dnd-hover');const ev=st.map.get(c);dndToast((ev.level==='bad'?'⛔ '+ev.errors.join('، '):ev.level==='warn'?'⚠️ '+ev.warnings.join('، '):'✓ '+ev.type+' إلى هذه الخانة'),ev.level==='bad'?'bad':ev.level==='warn'?'warn':'ok')}
  if(y<90)window.scrollBy(0,-14);else if(y>window.innerHeight-90)window.scrollBy(0,14)};
 const end=(drop)=>{if(!st)return;const ev=drop&&st.over?st.map.get(st.over):null;clear();const was=st;st=null;window._dndJustDragged=Date.now();
  if(ev){if(ev.level==='bad')dndToast('⛔ '+ev.errors.join('، '),'bad');else dndCommit(ev)}else{const t=document.getElementById('ttToast');if(t)t.hidden=true}};
 table.querySelectorAll('td.lesson[data-entry]').forEach(td=>{
  td.addEventListener('pointerdown',ev=>{if(ev.button>0)return;const e=db.timetable.find(x=>x.id===td.dataset.entry);if(!e)return;const x0=ev.clientX,y0=ev.clientY,touch=ev.pointerType&&ev.pointerType!=='mouse';
   if(e.locked){hold=null;return}
   const startDrag=()=>{try{td.setPointerCapture?.(ev.pointerId)}catch(_){}begin(td,e,x0,y0)};
   if(!touch){hold={x0,y0,mouse:true,start:startDrag};return}
   hold={x0,y0,timer:setTimeout(()=>{hold.timer=null;startDrag()},320),start:startDrag}});
  td.addEventListener('pointermove',ev=>{if(st){ev.preventDefault();move(ev.clientX,ev.clientY);return}
   if(hold){const dx=Math.abs(ev.clientX-hold.x0),dy=Math.abs(ev.clientY-hold.y0);if(hold.mouse){if(dx+dy>5){const h=hold;hold=null;h.start()}}else if(dx+dy>10){clearTimeout(hold.timer);hold=null}}});
  const up=ev=>{if(hold?.timer)clearTimeout(hold.timer);hold=null;if(st){ev.preventDefault();end(ev.type==='pointerup')}};
  td.addEventListener('pointerup',up);td.addEventListener('pointercancel',up);
  td.addEventListener('click',ev=>{if(Date.now()-(window._dndJustDragged||0)<400)return;const e=db.timetable.find(x=>x.id===td.dataset.entry);if(!e)return;lessonSheet(e.id)});
  td.addEventListener('contextmenu',ev=>{if(st||hold)ev.preventDefault()})});
 document.addEventListener('touchmove',function tm(ev){if(!document.body.classList.contains('dnd-active')){if(!document.body.contains(table))document.removeEventListener('touchmove',tm);return}ev.preventDefault()},{passive:false});
 document.addEventListener('keydown',function kd(ev){if(!document.body.contains(table)){document.removeEventListener('keydown',kd);return}if(ev.key==='Escape'&&st)end(false)})}

function focusedTimetable(mode,id){
  const days=db.days.filter(d=>d.active).sort((a,b)=>a.order-b.order),max=Math.max(...days.map(d=>d.periods));let rows='';
  for(let p=1;p<=max;p++)rows+=`<tr><th>الحصة ${p}</th>`+days.map(d=>{if(p>d.periods||(mode==='section'&&p>sectionDayPeriods(db.sections.find(s=>s.id===id),d)))return '<td class="tt-off">—</td>';const e=db.timetable.find(x=>(mode==='teacher'?x.teacherId===id:x.sectionId===id)&&x.dayId===d.id&&x.period===p);if(!e)return `<td class="tt-empty" data-slot="${d.id}|${p}">—</td>`;const l=ttEntryInfo(e);return `<td class="lesson interactive" data-entry="${e.id}" data-slot="${d.id}|${p}" style="background:${l.color}"><b>${esc(l.subject)}</b><small>${esc(mode==='teacher'?l.section:l.teacher)}</small>${e.locked?'<span class="lock-mark">🔒</span>':''}</td>`}).join('')+'</tr>';
  return `<div class="tt-wrap"><table class="timetable focused" data-mode="${mode}" data-id="${esc(id)}"><thead><tr><th>الحصة</th>${days.map(d=>`<th class="day-label day-${d.id}">${esc(d.name)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
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
function liveBoard(){
 const days=db.days.filter(d=>d.active&&d.periods>0);
 if(!db.timetable.length){$('#workspace').innerHTML=`<h2>الدوام اليومي والشواغر</h2><div class="notice warning">لا يوجد جدول مولّد بعد. أنشئ الجدول أولاً حتى يمكن عرض الدروس الحالية والمدرسين الشاغرين.</div><div class="actions"><button id="liveGoGenerator">الانتقال إلى توليد الجدول</button></div>`;$('#liveGoGenerator').onclick=()=>{page='generator';render()};return}
 const prev=window.liveBoardSelection||{};
 const dayId=days.some(d=>d.id===prev.dayId)?prev.dayId:days[0]?.id;
 const day=days.find(d=>d.id===dayId)||days[0];
 const maxP=day?.periods||1;const period=Math.max(1,Math.min(maxP,+prev.period||1));
 const key=`${dayId}|${period}`;
 const entries=db.timetable.filter(e=>e.dayId===dayId&&+e.period===period);
 const labelSection=id=>{const sec=db.sections.find(x=>x.id===id),stage=db.stages.find(x=>x.id===sec?.stageId);return `${stage?.name||''} ${sec?.name||'شعبة محذوفة'}`.trim()};
 const teacherName=id=>db.teachers.find(t=>t.id===id)?.name||'مدرس غير معروف';
 const subjectName=id=>db.subjects.find(x=>x.id===id)?.name||'مادة غير معروفة';
 const scheduledTeachers=new Set(entries.map(e=>e.teacherId));
 const available=db.teachers.filter(t=>!scheduledTeachers.has(t.id)&&!((db.teacherRules?.[t.id]?.unavailable?.[dayId]||[]).map(Number).includes(period)));
 const unavailable=db.teachers.filter(t=>(db.teacherRules?.[t.id]?.unavailable?.[dayId]||[]).map(Number).includes(period));
 const sectionRows=db.sections.slice().sort((a,b)=>{const sa=db.stages.find(x=>x.id===a.stageId),sb=db.stages.find(x=>x.id===b.stageId);return (sa?.order||0)-(sb?.order||0)||String(a.name).localeCompare(String(b.name),'ar')}).map(sec=>{
  const e=entries.find(x=>x.sectionId===sec.id);const teacher=e?teacherName(e.teacherId):'';
  return `<article class="live-lesson ${e?'is-running':'is-empty'}"><div class="live-section">${esc(labelSection(sec.id))}</div>${e?`<div class="live-subject">${esc(subjectName(e.subjectId))}</div><div class="live-teacher">${esc(teacher)}</div>`:'<div class="live-free">لا توجد حصة مسجلة</div>'}</article>`;
 }).join('');
 $('#workspace').innerHTML=`<style>
 .live-toolbar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:14px 0}.live-toolbar .field{margin:0}.live-counters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:14px 0}.live-counter{padding:15px;border:1px solid var(--line,#dce4eb);border-radius:14px;background:var(--surface,#fff)}.live-counter b{display:block;font-size:1.8rem;margin-top:4px}.live-sections{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:10px}.live-lesson{border:1px solid var(--line,#dce4eb);border-radius:13px;padding:12px;min-height:100px}.live-lesson.is-running{border-inline-start:4px solid #16877d;background:rgba(22,135,125,.07)}.live-lesson.is-empty{border-style:dashed;opacity:.82}.live-section{font-weight:800}.live-subject{margin-top:8px;font-weight:700}.live-teacher,.live-free{font-size:.88rem;color:var(--muted,#667085);margin-top:5px}.live-list{display:flex;flex-wrap:wrap;gap:8px}.live-chip{padding:8px 10px;border-radius:10px;background:var(--surface,#f4f7f9);border:1px solid var(--line,#dce4eb)}.live-chip small{display:block;color:var(--muted,#667085)}@media(max-width:560px){.live-toolbar{grid-template-columns:1fr}.live-counters{grid-template-columns:1fr 1fr}.live-counters .live-counter:last-child{grid-column:1/-1}}
 </style><h2>لوحة الدوام اليومي والشواغر</h2><p class="muted">اختر اليوم ورقم الحصة لمشاهدة الدروس المسجلة والشعب التي لديها حصة، والمدرسين الذين لا يظهر لهم تكليف في هذه الفترة.</p>
 <div class="live-toolbar"><div class="field"><label for="liveDay">اليوم</label><select id="liveDay">${days.map(d=>`<option value="${d.id}" ${d.id===dayId?'selected':''}>${esc(d.name)}</option>`).join('')}</select></div><div class="field"><label for="livePeriod">رقم الحصة</label><select id="livePeriod">${Array.from({length:maxP},(_,i)=>`<option value="${i+1}" ${i+1===period?'selected':''}>الحصة ${i+1}</option>`).join('')}</select></div></div>
 <div class="notice">الفترة المختارة: <strong>${esc(day?.name||'—')} — الحصة ${period}</strong>. هذه النسخة تعتمد اختيار اليوم والحصة يدوياً؛ لا تُظهر توقيتاً تلقائياً لأن أوقات بدء وانتهاء الحصص غير معرفة حالياً في بيانات المشروع.</div>
 <div class="live-counters"><div class="live-counter">الشعب التي لديها درس<b>${new Set(entries.map(e=>e.sectionId)).size}</b></div><div class="live-counter">المدرسون المشغولون<b>${scheduledTeachers.size}</b></div><div class="live-counter">المدرسون المتاحون وفق الجدول<b>${available.length}</b></div></div>
 <h3>الدروس لجميع الشعب</h3><div class="live-sections">${sectionRows||'<div class="empty">لا توجد شعب مسجلة.</div>'}</div>
 <h3 style="margin-top:22px">المدرسون الشاغرون في هذه الحصة</h3><p class="muted">الأسماء التالية لا تظهر لها حصة في الجدول في الفترة المختارة، ولا يوجد قيد عدم توافر مسجل لها.</p><div class="live-list">${available.map(t=>`<span class="live-chip">${esc(t.name)}<small>متاح حسب الجدول</small></span>`).join('')||'<div class="empty">لا يوجد مدرسون متاحون وفق البيانات الحالية.</div>'}</div>
 <h3 style="margin-top:22px">مدرسون غير متاحين حسب القيود</h3><div class="live-list">${unavailable.map(t=>`<span class="live-chip">${esc(t.name)}<small>قيد عدم توافر مسجل</small></span>`).join('')||'<span class="muted">لا توجد قيود عدم توافر لهذه الفترة.</span>'}</div>
 <div class="actions" style="margin-top:18px"><button id="liveRefresh" class="secondary">تحديث العرض</button><button id="livePrint">طباعة كشف الحصة</button></div>`;
 const update=()=>{window.liveBoardSelection={dayId:$('#liveDay').value,period:+$('#livePeriod').value};liveBoard()};
 $('#liveDay').onchange=()=>{window.liveBoardSelection={dayId:$('#liveDay').value,period:1};liveBoard()};$('#livePeriod').onchange=update;$('#liveRefresh').onclick=liveBoard;
 $('#livePrint').onclick=()=>{const content=$('#workspace').innerHTML;const w=window.open('','_blank');if(!w)return alert('يرجى السماح بفتح نافذة الطباعة.');w.document.write(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>كشف الحصة</title><style>body{font-family:Arial,sans-serif;padding:20px}button,select,.live-toolbar,.actions{display:none!important}.live-sections{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.live-lesson{border:1px solid #999;padding:10px;break-inside:avoid}h2,h3{color:#173552} .live-counter{display:inline-block;border:1px solid #999;padding:10px;margin:5px}.live-counters{display:flex;gap:10px}.live-chip{display:inline-block;border:1px solid #aaa;padding:6px;margin:4px}</style><h1>${esc(db.school.name||'المدرسة')}</h1><h2>كشف الدوام — ${esc(day?.name||'')} / الحصة ${period}</h2>${content}<script>window.onload=()=>window.print()<\/script></html>`);w.document.close()};
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
 $('#workspace').innerHTML=`<h2>مساحة عمل الجدول</h2><div class="workspace-toolbar"><div class="field"><label>نوع العرض</label><select id="ttMode"><option value="school">المدرسة كاملة</option><option value="teacher">جدول مدرس</option><option value="section">جدول شعبة</option></select></div><div class="field" id="ttEntityWrap"></div><button class="secondary" id="manualBatch">تعديل متعدد بين المدرسين</button><button class="secondary" id="manualUndo">تراجع عن آخر تعديل</button><button class="secondary" id="manualLog">سجل التعديلات</button><button class="secondary" id="manualConflicts">سجل تعارضات التعديل</button><button class="secondary" id="gapGo">تشخيص الفراغات</button><button class="problems-btn" id="ttProblems">${counts.errors} أخطاء — ${counts.warnings} تحذيرات</button><button class="secondary" id="ttImage">حفظ العرض كصورة PNG</button><span id="ttImageStatus" class="muted" aria-live="polite"></span><button class="secondary" id="ttPrint">طباعة العرض الحالي</button><button class="secondary" id="ttPrintAllTeachers">طباعة بطاقات جميع المدرسين</button></div><div class="notice">اختر المدرس أو الشعبة. اسحب الحصة إلى خانة أخرى لنقلها (أو فوق حصة لتبديلهما) — على الجوال اضغط مطولاً ثم اسحب. اضغط الحصة لتثبيتها أو لخيارات أخرى. الطباعة تتبع العرض المختار.</div><div id="ttWorkspaceView"></div>`;
 const mode=$('#ttMode'),wrap=$('#ttEntityWrap'),view=$('#ttWorkspaceView');mode.value=pref.mode;
 function bindCells(){enableTimetableDnD(view)}
 function draw(){const m=mode.value;window.ttPreferred={mode:m};if(m==='school'){wrap.innerHTML='';view.innerHTML=timetableTable();return}
 const list=m==='teacher'?db.teachers.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar')):db.sections.slice().sort((a,b)=>(db.stages.find(g=>g.id===a.stageId)?.order||0)-(db.stages.find(g=>g.id===b.stageId)?.order||0)||a.name.localeCompare(b.name,'ar'));
 wrap.innerHTML=`<label>${m==='teacher'?'المدرس':'الشعبة'}</label><select id="ttEntity">${list.map(x=>{const g=db.stages.find(v=>v.id===x.stageId);return `<option value="${esc(x.id)}">${esc(m==='teacher'?x.name:(g?.name||'')+' '+x.name)}</option>`}).join('')}</select>`;
 const sel=$('#ttEntity');if(pref.mode===m&&list.some(x=>x.id===pref.id))sel.value=pref.id;
 const redraw=()=>{window.ttPreferred={mode:m,id:sel.value};view.innerHTML=focusedTimetable(m,sel.value);bindCells()};sel.onchange=redraw;redraw()}
 mode.onchange=draw;draw();$('#ttImage').onclick=async()=>{const pick=window.ttPreferred||{mode:'school'};const btn=$('#ttImage'),status=$('#ttImageStatus');if((pick.mode==='teacher'||pick.mode==='section')&&!pick.id){status.textContent='اختر المدرس أو الشعبة أولاً';return}btn.disabled=true;status.textContent='جارٍ إعداد الصورة…';try{await exportSchedulePNG(pick.mode==='school'?'all':pick.mode,pick.id||'');status.textContent='تم إرسال الصورة للتنزيل أو المشاركة.'}catch(e){status.textContent='تعذر حفظ الصورة: '+String(e.message||e)}finally{btn.disabled=false}};$('#gapGo').onclick=()=>{page='gapDiagnosis';render()};$('#ttProblems').onclick=()=>alert(`${counts.errors} أخطاء — ${counts.warnings} تحذيرات`);
 $('#manualBatch').onclick=batchManualEditor;$('#manualUndo').onclick=undoManual;$('#manualConflicts').onclick=()=>{
 const log=db.manualConflictLog||[];
 alert(log.slice(-30).reverse().map(x=>`${new Date(x.at).toLocaleString('ar-IQ')} — ${x.type}\n${x.warnings.join('، ')}`).join('\n\n')||'لا توجد تعارضات مسجلة.');
 };
 $('#manualLog').onclick=()=>alert((db.manualHistory||[]).slice(-15).reverse().map(h=>`${new Date(h.at).toLocaleString('ar-IQ')} — ${h.type} (${h.before.length} حصة)`).join('\n')||'لا توجد تعديلات بعد');$('#ttPrint').onclick=()=>printSelectedTimetable(window.ttPreferred);$('#ttPrintAllTeachers').onclick=printAllTeacherCards;
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
function paperPageCSS(base){const want=(db.printSettings&&db.printSettings.paper)==='A3'?'A3':'A4';
 if(base==='A3')return want==='A3'?'@page{size:420mm 297mm;margin:4mm}':'@page{size:297mm 210mm;margin:3mm}html{zoom:.7071}';
 return want==='A4'?'@page{size:A4 landscape;margin:7mm}':'@page{size:420mm 297mm;margin:8mm}html{zoom:1.4142}'}
function teacherCardCSS(){return `
${paperPageCSS('A4')}*{box-sizing:border-box}html,body{margin:0;background:#fff;color:#142c46;font-family:Tahoma,Arial,sans-serif;direction:rtl}body{padding:0}.teacher-card{width:100%;height:190mm;max-height:190mm;overflow:hidden;display:flex;flex-direction:column;break-after:page;page-break-after:always;background:white}.teacher-card:last-child{break-after:auto;page-break-after:auto}.tc-head{display:grid;grid-template-columns:1fr 2.5fr 1fr;align-items:center;background:#102C50;color:#fff;border-bottom:3px solid #B8893B;min-height:34mm;padding:3mm 6mm}.tc-side{font-size:10px;line-height:1.9}.tc-left{text-align:left}.tc-brand{text-align:center}.tc-brand img{width:12mm;height:12mm;object-fit:contain;vertical-align:middle}.tc-school{font-size:17px;color:#F0DDB0;font-weight:800}.tc-brand h1{font-size:22px;line-height:1.4;margin:1mm 0;font-weight:900}.tc-subtitle{font-size:10px;color:#e1e8f1}.tc-person{display:flex;justify-content:space-between;align-items:center;gap:8mm;background:#FAF8F3;border:1px solid #E5D9BE;padding:3mm 5mm;margin:3mm 0;min-height:26mm}.tc-label{font-size:10px;color:#6a7687}.tc-person h2{font-size:21px;margin:1mm 0 2mm}.tc-specialty{font-size:11px}.tc-stats{display:flex;gap:2mm}.tc-stats>div{border:1px solid #D6DCE5;background:white;min-width:26mm;max-width:44mm;padding:2mm;text-align:center;border-radius:3px}.tc-stats b{display:block;font-size:17px;color:#102C50}.tc-stats span{display:block;font-size:9px;color:#64748b}.tc-stats .tc-free b{font-size:11px;min-height:20px}.tc-table{border-collapse:collapse;table-layout:fixed;width:100%;flex:1;min-height:0}.tc-table th,.tc-table td{border:1px solid #c8d0d9;text-align:center;vertical-align:middle;padding:1.5mm 1mm}.tc-table thead th{background:#7B1E3A;color:#fff;font-size:12px;height:12mm;border-color:#B8893B}.tc-table thead th:first-child{width:19mm}.tc-period{background:#edf1f6;font-size:13px;font-weight:900;width:19mm}.tc-lesson{background:#f3f0fa}.tc-lesson strong{display:block;font-size:13px;line-height:1.35;color:#152e49}.tc-lesson span{display:block;font-size:10px;color:#53647a;margin-top:1mm}.tc-empty{background:#fff}.tc-off{background:#f0f1f3;color:#a1a8b2}.tc-reasons{display:flex;gap:4mm;align-items:center;border-top:2px solid #B8893B;padding:2mm 3mm;font-size:10px;min-height:10mm}.tc-reasons span{color:#53647a}.tc-signatures{display:grid;grid-template-columns:repeat(3,1fr);text-align:center;padding:2mm 0 1mm;min-height:17mm}.tc-signatures b{display:block;font-size:11px}.tc-signatures span{display:block;font-size:9px;color:#64748b;margin-top:3mm}.tc-bottom{font-size:8px;color:#8994a3;text-align:center;border-top:1px solid #e3e8ee;padding-top:1mm}.tc-bw,.tc-bw *{color:#000!important}.tc-bw .tc-head{background:#e0e0e0!important;border-bottom:3px solid #555!important}.tc-bw .tc-school,.tc-bw .tc-subtitle{color:#000!important}.tc-bw .tc-person{background:#f5f5f5!important;border-color:#888!important}.tc-bw .tc-table thead th{background:#d5d5d5!important;color:#000!important;border-color:#666!important}.tc-bw .tc-lesson{background:#f0f0f0!important}.tc-bw .tc-period{background:#e6e6e6!important}.tc-bw .tc-reasons{border-color:#555!important}@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}body{margin:0!important}}`}
function printTeacherCards(ids){const html=ids.map(teacherCard).filter(Boolean).join('');if(!html)return alert('لا توجد بطاقات مدرسين للطباعة');const w=window.open('','_blank');if(!w)return alert('اسمح بفتح النوافذ المنبثقة للطباعة');w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>بطاقات الجداول الأسبوعية للمدرسين</title><style>${teacherCardCSS()+premiumTeacherCSS()}</style></head><body>${html}<script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`);w.document.close()}
function printAllTeacherCards(){const ids=db.teachers.filter(t=>db.timetable.some(e=>e.teacherId===t.id)).sort((a,b)=>a.name.localeCompare(b.name,'ar')).map(t=>t.id);printTeacherCards(ids)}
function printSelectedTimetable(pick){
 const p=db.printSettings;const label=pick.mode==='teacher'?db.teachers.find(x=>x.id===pick.id)?.name:pick.mode==='section'?(()=>{const sec=db.sections.find(x=>x.id===pick.id),g=db.stages.find(x=>x.id===sec?.stageId);return (g?stageDisplayName(g):'')+' '+(sec?.name||'')})():'المدرسة كاملة';
 if(pick.mode==='teacher'){printTeacherCards([pick.id]);return;}
 const table=pick.mode==='school'?timetableTable():focusedTimetable(pick.mode,pick.id);if(pick.mode==='school'){const html=printDocument();const w=window.open('','_blank');if(!w)return alert('اسمح بفتح النوافذ المنبثقة للطباعة');w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>الجدول المدرسي</title><style>${printCSS()+premiumPrintCSS()}</style></head><body>${html}<script>window.onload=()=>setTimeout(()=>window.print(),350)<\/script></body></html>`);w.document.close();return;}
 const html=`<article class="print-sheet ${printPresentationClass()}">${formalHeader(label)}${table}${formalFooter()}</article>`;
 const w=window.open('','_blank');if(!w)return alert('اسمح بفتح النوافذ المنبثقة للطباعة');
 w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(label)}</title><style>${printCSS()+premiumPrintCSS()}</style></head><body>${html}<script>window.onload=()=>setTimeout(()=>window.print(),350)<\/script></body></html>`);w.document.close();
}

function schoolType(){return db.school?.type||'secondary'}
function stageGroups(){const stages=db.stages.slice().sort((a,b)=>a.order-b.order),type=schoolType();
 if(type==='primary')return [{title:'الصفوف الابتدائية — الأول إلى الثالث',ids:stages.slice(0,3).map(g=>g.id)},{title:'الصفوف الابتدائية — الرابع إلى السادس',ids:stages.slice(3).map(g=>g.id)}].filter(x=>x.ids.length);
 if(type==='middle')return [{title:'المرحلة المتوسطة',ids:stages.map(g=>g.id)}];
 if(type==='preparatory')return [{title:'المرحلة الإعدادية',ids:stages.map(g=>g.id)}];
 return [{title:'المرحلة المتوسطة — الأول والثاني والثالث المتوسط',ids:stages.slice(0,3).map(g=>g.id)},{title:'المرحلة الإعدادية — الرابع والخامس والسادس العلمي',ids:stages.slice(3,6).map(g=>g.id)}]}
function stageDisplayName(g){if(!g)return 'مرحلة غير معروفة';const t=schoolType(),n=String(g.name||'');if(/ابتدائ|المتوسط|الإعدادي|العلمي/.test(n))return n;return n+' '+(t==='primary'?'الابتدائي':t==='middle'?'المتوسط':t==='preparatory'?'الإعدادي':g.order<=3?'المتوسط':'العلمي')}
function schoolGroupName(i){return stageGroups()[i]?.title||'مجموعة غير متاحة'}
function sheetMarkup(title,ids){
 const p=db.printSettings;
 return `<article class="print-sheet school-print-page ${printPresentationClass()}">${formalHeader(title)}${timetableTable(ids,true)}${formalFooter()}</article>`;
}
function printDocument(){return stageGroups().map(g=>sheetMarkup(g.title,g.ids)).join('')}
function printCSS(){return `
${paperPageCSS('A3')}
*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
html,body{margin:0!important;padding:0!important;background:white!important;color:#2B1B22;font-family:Tahoma,Arial,sans-serif;direction:rtl}
@media print{html,body{width:412mm!important;height:auto!important;overflow:visible!important} .print-sheet.school-print-page{position:static!important;contain:none!important}}
.print-sheet.school-print-page{display:block!important;box-sizing:border-box!important;width:100%!important;height:auto!important;max-height:none!important;min-height:0!important;margin:0!important;padding:0!important;overflow:visible!important;break-after:auto!important;page-break-after:auto!important;break-inside:auto!important;page-break-inside:auto!important}
@media print{.print-sheet.school-print-page + .print-sheet.school-print-page{break-before:page!important;page-break-before:always!important}}
.school-print-page .formal-head{display:grid!important;grid-template-columns:1fr 2.7fr 1fr!important;align-items:center!important;gap:3mm!important;height:23mm!important;min-height:23mm!important;max-height:23mm!important;margin:0 0 2mm!important;padding:1mm 4mm!important;overflow:hidden!important;background:#102C50!important;color:#fff!important;border-bottom:.65mm solid #B8893B!important}
.school-print-page .formal-center{text-align:center!important}
.school-print-page .formal-center h1{font-size:14pt!important;line-height:1.15!important;margin:0!important;color:#F0DDB0!important}
.school-print-page .formal-center h2{font-size:18pt!important;line-height:1.15!important;margin:0!important;color:white!important}
.school-print-page .formal-center h3{font-size:9pt!important;line-height:1.15!important;margin:0!important;color:white!important}
.school-print-page .formal-side,.school-print-page .formal-side small{font-size:8px!important;line-height:1.4!important;color:white!important}
.school-print-page .formal-side:last-child{text-align:left!important}
.school-print-page .school-logo{width:9mm!important;height:9mm!important;object-fit:contain!important}
.school-print-page .tt-wrap{display:block!important;overflow:hidden!important;border:0!important;margin:0!important;padding:0!important;width:100%!important;height:auto!important}
.school-print-page table.compact-timetable{direction:rtl!important;display:table!important;table-layout:fixed!important;border-collapse:collapse!important;border-spacing:0!important;width:100%!important;min-width:0!important;max-width:100%!important;height:auto!important;margin:0!important}
.school-print-page table.compact-timetable col.day-col{width:7mm!important}
.school-print-page table.compact-timetable col.period-col{width:7mm!important}
.school-print-page table.compact-timetable col.subject-col{width:auto!important}
.school-print-page table.compact-timetable th,.school-print-page table.compact-timetable td{border:0.25mm solid #bcc7d2!important;box-sizing:border-box!important;text-align:center!important;vertical-align:middle!important;overflow:hidden!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important;border-radius:0!important}
.school-print-page table.compact-timetable thead{display:table-header-group!important}
.school-print-page table.compact-timetable thead tr.stage-groups{height:5mm!important}
.school-print-page table.compact-timetable thead tr.section-names{height:5mm!important}
.school-print-page table.compact-timetable thead th{height:5mm!important;min-height:5mm!important;max-height:5mm!important;padding:0 .3mm!important;background:#102C50!important;color:white!important;font-size:9px!important;line-height:1.05!important;font-weight:800!important;border-color:#B8893B!important}
.school-print-page table.compact-timetable thead tr.section-names th{background:#24466D!important}
.school-print-page table.compact-timetable .vertical-heading{width:7mm!important;padding:0!important}
.school-print-page table.compact-timetable .vertical-heading span{writing-mode:vertical-rl!important;transform:rotate(180deg)!important;display:inline-block!important;font-size:9px!important}
.school-print-page table.compact-timetable tbody tr{height:var(--row-h,6.6mm)!important;break-inside:avoid!important;page-break-inside:avoid!important}
.school-print-page table.compact-timetable tbody th,.school-print-page table.compact-timetable tbody td{height:var(--row-h,6.6mm)!important;padding:0 .12mm!important;line-height:1!important;font-size:8.3px!important}
.school-print-page table.compact-timetable .day-label{width:7mm!important;padding:0!important}
.school-print-page table.compact-timetable .vertical-day{display:inline-block!important;writing-mode:vertical-rl!important;transform:rotate(180deg)!important;white-space:nowrap!important;font-size:11px!important;font-weight:900!important}
.school-print-page table.compact-timetable .period-number{width:7mm!important;background:#e8eef5!important;font-size:9px!important;font-weight:900!important}
.school-print-page table.compact-timetable td.lesson b{display:block!important;margin:0!important;font-size:10px!important;line-height:1.08!important;font-weight:800!important}
.school-print-page table.compact-timetable td.lesson small{display:inline!important;margin:0!important;font-size:11.8px!important;line-height:1.1!important;font-weight:700!important;color:#26374a!important}
.school-print-page table.compact-timetable td.lesson .lesson-inline{display:block!important;text-align:center!important;line-height:1.12!important;overflow-wrap:normal!important;word-break:normal!important}
.school-print-page table.compact-timetable td.lesson .lesson-inline b{display:inline!important;font-size:12.4px!important;line-height:1.1!important;font-weight:900!important}
.school-print-page table.compact-timetable td.lesson .lesson-sep{display:inline!important;font-size:10px!important;font-weight:600!important}
.school-print-page.hide-teachers td.lesson .lesson-sep{display:none!important}
.school-print-page table.compact-timetable tbody tr:has(.day-label)>td,.school-print-page table.compact-timetable tbody tr:has(.day-label)>th{border-top:.5mm solid #B8893B!important}
.school-print-page .print-footer{display:block!important;height:17mm!important;min-height:17mm!important;max-height:17mm!important;overflow:hidden!important;margin:2mm 0 0!important;padding:1mm 2mm!important;border-top:.4mm solid #B8893B!important;font-size:8px!important;line-height:1.1!important}
.school-print-page .print-reasons p{margin:.5mm 0!important}
.school-print-page .print-signatures{display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:4mm!important;text-align:center!important;margin-top:2mm!important}
.school-print-page .print-signatures b{display:block!important;font-size:9px!important}
.school-print-page .print-signatures span{display:block!important;font-size:8px!important;margin-top:1.5mm!important}
.school-print-page .print-signatures b{font-size:10px!important}
.school-print-page .print-signatures{margin-top:4mm!important}
.school-print-page .print-reasons{min-height:13mm!important;border:.3mm solid #9fb3c8!important;border-radius:1.2mm!important;padding:1.4mm 2.4mm!important;margin-top:2mm!important}
.school-print-page th.corner-cell{background:#102C50!important;border:.2mm solid #fff!important}
.school-print-page.hide-teachers td.lesson small{display:none!important}
.school-print-page.print-bw .formal-head{background:#e5e5e5!important;border-color:#555!important}
.school-print-page.print-bw .formal-center h1,.school-print-page.print-bw .formal-center h2,.school-print-page.print-bw .formal-center h3,.school-print-page.print-bw .formal-side,.school-print-page.print-bw .formal-side small{color:#000!important}
.school-print-page.print-bw table.compact-timetable thead th{background:#dedede!important;color:#000!important;border-color:#555!important}
.school-print-page.print-bw table.compact-timetable td.lesson{background:#fff!important}
.school-print-page.print-bw table.compact-timetable td.lesson b,.school-print-page.print-bw table.compact-timetable td.lesson small{color:#000!important}
`}


function openPrintSheets(){
 if(!db.timetable.length)return alert('لا يوجد جدول للطباعة');
 const w=window.open('','_blank');if(!w)return alert('اسمح بفتح النوافذ المنبثقة للطباعة');
 w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>طباعة جداول المراحل</title><style>${printCSS()+premiumPrintCSS()}</style></head><body>${printDocument()}<script>window.onload=()=>setTimeout(()=>window.print(),650)<\/script></body></html>`);w.document.close();
}
function premiumPrintCSS(){return `
/* MASAR PREMIUM ACADEMIC | print-only enhancements */
@media screen{body{background:#e9edf2!important}.print-sheet{filter:drop-shadow(0 10px 24px #102c5020)}}
.school-print-page .formal-head{background:#102C50!important;border-bottom:1mm solid #B8893B!important;box-shadow:inset 0 -1.2mm 0 #173b62!important}
.school-print-page .formal-center h1{color:#EAD6A4!important;font-weight:900!important;letter-spacing:.2px!important}
.school-print-page .formal-center h2{font-weight:900!important;letter-spacing:.1px!important}
.school-print-page .formal-center h3{font-weight:700!important;color:#F6F0E5!important}
.school-print-page table.compact-timetable thead th{background:#102C50!important;border-color:#B8893B!important;color:#fff!important}
.school-print-page table.compact-timetable thead tr.section-names th{background:#244669!important}
.school-print-page table.compact-timetable tbody th,.school-print-page table.compact-timetable tbody td{border-color:#b7c3d0!important}
.school-print-page table.compact-timetable .period-number{background:#e5ebf3!important;color:#173552!important}
.school-print-page table.compact-timetable td.lesson .lesson-inline b{color:#132d4a!important;font-weight:900!important}
.school-print-page .print-footer{border-top:.6mm solid #B8893B!important;color:#2B1B22!important}
.school-print-page .print-reasons{border-color:#d4c29a!important;background:#fbfaf7!important}
.school-print-page .print-signatures b{color:#173552!important;font-weight:900!important}
.school-print-page.print-bw .formal-head{background:#e8e8e8!important;box-shadow:none!important;border-color:#444!important}
.school-print-page.print-bw .formal-center h1,.school-print-page.print-bw .formal-center h2,.school-print-page.print-bw .formal-center h3{color:#111!important}
.school-print-page.print-bw .print-reasons{background:#fff!important;border-color:#888!important}
`;}
function premiumTeacherCSS(){return `
/* Teacher cards: premium editorial accents, no change to timetable data */
.teacher-card{border-top:1.1mm solid #B8893B!important}
.teacher-card .tc-head{background:#102C50!important;border-bottom:.8mm solid #B8893B!important}
.teacher-card .tc-head *{text-shadow:none!important}
.teacher-card table th{font-weight:900!important}
.teacher-card .tc-off{background:#f0f2f5!important;color:#8c98a7!important}
.teacher-card.tc-bw{border-top-color:#555!important}
.teacher-card.tc-bw .tc-head{background:#e5e5e5!important;border-bottom-color:#555!important}
`;}

/* v0.9.16.8: print-only layouts; no timetable data changes. */
function printScopeDocument(scope,id){
 if(scope==='school')return printDocument();
 if(scope==='middle'||scope==='high'){const g=stageGroups()[scope==='middle'?0:1];return g?sheetMarkup(g.title,g.ids):''}
 if(scope==='stage'){const g=db.stages.find(x=>x.id===id);return g?sheetMarkup('جدول '+stageDisplayName(g),[g.id]):''}
 if(scope==='section'){
  const sec=db.sections.find(x=>x.id===id);if(!sec)return '';
  return `<article class="print-sheet school-print-page print-single-section ${printPresentationClass()}">${formalHeader('جدول '+exportSectionName(id))}${focusedTimetable('section',id)}${formalFooter()}</article>`;
 }
 return '';
}
function scopedPrintCSS(scope){return printCSS()+premiumPrintCSS()+(scope==='section'?`
@page{size:A4 landscape;margin:8mm}
.print-single-section{width:100%!important;min-height:0!important;height:auto!important;max-height:none!important;padding:0!important}
.print-single-section .formal-head{height:27mm!important;min-height:27mm!important}
.print-single-section .tt-wrap{width:100%!important;overflow:visible!important;margin:4mm 0!important}
.print-single-section table.timetable.focused{width:100%!important;min-width:0!important;table-layout:fixed!important;border-collapse:collapse!important}
.print-single-section table.timetable.focused th,.print-single-section table.timetable.focused td{border:1px solid #9aaabd!important;text-align:center!important;padding:2mm!important;height:15mm!important;font-size:13px!important}
.print-single-section table.timetable.focused thead th{background:#102C50!important;color:white!important;font-size:14px!important}
.print-single-section table.timetable.focused td.lesson b{display:block!important;font-size:15px!important}
.print-single-section table.timetable.focused td.lesson small{display:block!important;font-size:12px!important}
.print-single-section .print-footer{height:auto!important;min-height:22mm!important;max-height:none!important;overflow:visible!important}
`:scope==='stage'?`
.school-print-page table.compact-timetable thead th{font-size:12px!important}
.school-print-page table.compact-timetable tbody td.lesson b{font-size:13px!important}
.school-print-page table.compact-timetable tbody td.lesson small{font-size:12px!important}
`:'');}
function openScopedPrint(scope,id){
 if(!db.timetable.length)return alert('لا يوجد جدول للطباعة');
 if(scope==='teacher')return printTeacherCards([id]);
 const html=printScopeDocument(scope,id);if(!html)return alert('اختر مرحلة أو شعبة صالحة');
 const w=window.open('','_blank');if(!w)return alert('اسمح بفتح النوافذ المنبثقة للطباعة');
 w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>طباعة جدول نيبور</title><style>${scopedPrintCSS(scope)}</style></head><body>${html}<script>window.onload=()=>setTimeout(()=>window.print(),650)<\/script></body></html>`);w.document.close();
}
function printSetup(){
 const p=db.printSettings;
 $('#workspace').innerHTML=`<h2>الطباعة وتصدير الصور</h2><div class="grid"><div class="field"><label>عنوان الجدول</label><input id="prTitle" value="${esc(p.title)}"></div><div class="field"><label>تاريخ بدء تطبيق الجدول</label><input id="prDate" type="date" value="${esc(p.startDate)}"></div></div><div class="field"><label>أسباب تغيير الجدول</label><textarea id="prReasons" rows="2">${esc(p.changeReasons)}</textarea></div><div class="field"><label>ملاحظات إضافية</label><textarea id="prFooter" rows="2">${esc(p.footer)}</textarea></div><div class="field"><label for="prPrintMode">نمط طباعة PDF</label><select id="prPrintMode"><option value="color">ملون — كحلي وذهبي</option><option value="bw">أسود وأبيض — اقتصادي وواضح</option></select></div><label><input id="prColors" type="checkbox" ${p.showColors?'checked':''}> إظهار ألوان المراحل</label><div class="field"><label>أسلوب الألوان</label><select id="prTheme"><option value="soft" ${(p.theme||'soft')==='soft'?'selected':''}>هادئ ومريح للقراءة</option><option value="contrast" ${p.theme==='contrast'?'selected':''}>تباين مرتفع</option></select></div><div class="actions"><button id="prSave">حفظ الإعدادات</button><button id="prPrint">طباعة مجموعات المدرسة (A3 أفقي)</button><button id="prPDF" class="secondary">تنزيل / حفظ PDF</button></div><div class="notice">زر حفظ PDF يفتح نافذة الطباعة؛ على iPad اختر مشاركة معاينة الطباعة ثم «حفظ في الملفات» لحفظ ملف PDF. لا توجد حاجة لاختيار طابعة.</div><h3>تصدير الصور PNG</h3><div class="grid"><div class="field"><label>نوع الجدول</label><select id="imgType"><option value="all">المدرسة كاملة — صورة واحدة</option><option value="middle">المتوسطة — صورة واحدة</option><option value="high">الإعدادية — صورة واحدة</option><option value="stage">مرحلة واحدة</option><option value="teacher">جدول مدرس</option><option value="section">جدول شعبة</option></select></div><div class="field" id="imgChoiceWrap" hidden><label>الاختيار</label><select id="imgChoice"></select></div></div><div class="actions"><button id="imgSave">حفظ الصورة PNG</button><span id="imgStatus" class="muted" aria-live="polite"></span></div><div class="notice">الصور تشمل جميع الحصص بالألوان مع اسم المدرسة والسنة الدراسية، دون أقفال. للطباعة: تُقسّم صفحات الطباعة وفق نوع المدرسة المختار، بقياس A3 أفقي.</div>${db.timetable.length?'<div class="unified-preview"><p class="muted">معاينة الصفحتين: المتوسطة ثم الإعدادية، باستخدام قالب الطباعة نفسه.</p><iframe id="printPreviewFrame" title="معاينة الطباعة الرسمية"></iframe></div>':'<div class="empty">استورد أو أنشئ الجدول أولاً.</div>'}`;
 const excelUI=`<section class="print-scope-panel"><h3>تصدير Excel بصيغة XLSX</h3><div class="grid"><div class="field"><label>نطاق ملف Excel</label><select id="excelMode"><option value="complete">ملف شامل: المدرسة والمراحل والمدرسون والشعب والتكليفات</option><option value="school">المدرسة والمراحل</option><option value="middle">المجموعة الأولى</option>${stageGroups()[1]?'<option value="high">المجموعة الثانية</option>':''}<option value="stage">مرحلة محددة</option><option value="section">شعبة محددة</option><option value="teacher">مدرس محدد</option><option value="teachers">جميع المدرسين — أوراق مستقلة</option><option value="sections">جميع الشعب — أوراق مستقلة</option><option value="assignments">التكليفات والأنصبة</option></select></div><div class="field" id="excelChoiceWrap" hidden><label>اختر</label><select id="excelChoice"></select></div></div><div class="actions"><button type="button" id="excelDownload">تنزيل ملف Excel (.xlsx)</button><span class="muted" id="excelStatus" aria-live="polite"></span></div><p class="muted">تصدير محلي دون إنترنت أو تعديل بيانات الجدول، مع أوراق عربية من اليمين إلى اليسار.</p></section>`;
 $('#workspace').insertAdjacentHTML('beforeend',excelUI);
 const wordUI=`<section class="print-scope-panel"><h3>تصدير Word قابل للتحرير (.docx)</h3><div class="grid"><div class="field"><label>الجدول المطلوب</label><select id="wordScope"><option value="school">جداول المدرسة كاملة</option><option value="middle">المجموعة الأولى</option>${stageGroups()[1]?'<option value="high">المجموعة الثانية</option>':''}<option value="stage">مرحلة محددة</option><option value="section">شعبة محددة</option><option value="teacher">مدرس محدد</option></select></div><div class="field" id="wordEntityWrap" hidden><label>الاختيار</label><select id="wordEntity"></select></div></div><div class="actions"><button type="button" id="wordDownload">تنزيل جدول Word (.docx)</button><span id="wordStatus" class="muted" aria-live="polite"></span></div><p class="muted">ملف Word فعلي قابل للتحرير، يحافظ على الكحلي والذهبي وألوان المراحل والجداول، مع اتجاه الكتابة من اليمين إلى اليسار. قد تختلف أبعاد بعض الخلايا قليلاً بحسب إصدار Word.</p></section>`;
 $('#workspace').insertAdjacentHTML('beforeend',wordUI);
 const wordScope=$('#wordScope'),wordEntity=$('#wordEntity'),wordEntityWrap=$('#wordEntityWrap');
 function refreshWord(){const mode=wordScope.value;wordEntityWrap.hidden=!['stage','section','teacher'].includes(mode);const items=mode==='stage'?db.stages.slice().sort((a,b)=>a.order-b.order):mode==='section'?db.sections.slice().sort((a,b)=>(db.stages.find(g=>g.id===a.stageId)?.order||0)-(db.stages.find(g=>g.id===b.stageId)?.order||0)||a.order-b.order):mode==='teacher'?db.teachers.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar')):[];wordEntity.innerHTML=items.map(x=>`<option value="${esc(x.id)}">${esc(mode==='stage'?stageDisplayName(x):mode==='section'?exportSectionName(x.id):x.name)}</option>`).join('')}
 wordScope.onchange=refreshWord;refreshWord();
 $('#wordDownload').onclick=()=>{const status=$('#wordStatus');try{store();if(!db.timetable.length)throw Error('لا يوجد جدول للتصدير');if(!window.MasarWord)throw Error('ملف تصدير Word غير محمّل');window.MasarWord.download({html:wordScope.value==='teacher'?teacherCard(wordEntity.value):printScopeDocument(wordScope.value,wordEntity.value),mode:wordScope.value,school:db.school,settings:db.printSettings});status.textContent='تم تجهيز ملف Word. تحقق من التنزيلات.'}catch(err){status.textContent='تعذر تصدير Word: '+(err.message||err)}};

 const excelMode=$('#excelMode'),excelChoice=$('#excelChoice'),excelWrap=$('#excelChoiceWrap');
 function refreshExcel(){const mode=excelMode.value;excelWrap.hidden=!['stage','section','teacher'].includes(mode);const items=mode==='stage'?db.stages.slice().sort((a,b)=>a.order-b.order):mode==='section'?db.sections.slice().sort((a,b)=>(db.stages.find(g=>g.id===a.stageId)?.order||0)-(db.stages.find(g=>g.id===b.stageId)?.order||0)||a.order-b.order):mode==='teacher'?db.teachers.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar')):[];excelChoice.innerHTML=items.map(x=>`<option value="${esc(x.id)}">${esc(mode==='stage'?stageDisplayName(x):mode==='section'?exportSectionName(x.id):x.name)}</option>`).join('')}
 excelMode.onchange=refreshExcel;refreshExcel();
 $('#excelDownload').onclick=()=>{const status=$('#excelStatus');try{if(!window.MasarExcel)throw Error('مكوّن Excel غير محمّل');const count=window.MasarExcel.download(db,excelMode.value,excelChoice.value);status.textContent='تم تجهيز '+count+' ورقة عمل للتنزيل.'}catch(e){status.textContent='تعذر التصدير: '+e.message}};
 const importPanel=document.createElement('section');importPanel.className='print-scope-panel';importPanel.innerHTML=`<h3>استيراد جدول Excel والتحقق قبل الحفظ</h3><p class="muted">صدّر جدولاً من هذا الإصدار ثم عدّل عمودي dayId وperiod في ورقة MASAR_IMPORT فقط. لا تغير المعرفات أو تضف أو تحذف حصصاً. الاستيراد لا يغيّر التكليفات.</p><input id="masarExcelFile" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"><div class="actions"><button type="button" id="masarExcelCheck">فحص ومعاينة ملف Excel</button><button type="button" id="masarExcelApply" disabled>تطبيق التغييرات بعد الموافقة</button></div><div id="masarExcelImportReport" class="notice" aria-live="polite"></div>`;
 $('#workspace').appendChild(importPanel);
 let pendingExcel=null;
 $('#masarExcelFile').onchange=()=>{pendingExcel=null;$('#masarExcelApply').disabled=true;$('#masarExcelImportReport').textContent='اختر فحص الملف قبل الاستيراد.'};
 $('#masarExcelCheck').onclick=async()=>{const report=$('#masarExcelImportReport');pendingExcel=null;$('#masarExcelApply').disabled=true;try{
  const file=$('#masarExcelFile').files[0];if(!file)throw Error('اختر ملف Excel أولاً');if(file.size>30*1024*1024)throw Error('الملف أكبر من 30 ميغابايت');
  const rows=await window.MasarExcelImport.read(file);const current=new Map(db.timetable.map(e=>[String(e.id),e]));if(rows.length!==current.size)throw Error('عدد الحصص لا يطابق الجدول الحالي: '+rows.length+' مقابل '+current.size);
  const seen=new Set(),candidate=[];for(const row of rows){const [id,assignmentId,teacherId,sectionId,subjectId,dayId,period,locked]=row.map(x=>String(x??'').trim());if(!id||seen.has(id))throw Error('معرف حصة مكرر أو فارغ: '+id);seen.add(id);const old=current.get(id);if(!old)throw Error('حصة غير معروفة: '+id);if([assignmentId,teacherId,sectionId,subjectId].some((x,i)=>x!==String([old.assignmentId,old.teacherId,old.sectionId,old.subjectId][i])))throw Error('تم تغيير بيانات التكليف للحصة '+id);if(!/^\d+$/.test(period)||+period<1)throw Error('رقم حصة غير صحيح للحصة '+id);if((locked==='1')!==!!old.locked)throw Error('لا يجوز تعديل قفل الحصة '+id);candidate.push({...old,dayId,period:+period})}
  const changes=candidate.filter(e=>{const old=current.get(String(e.id));return old.dayId!==e.dayId||+old.period!==+e.period});
  for(const e of changes){const old=current.get(String(e.id));if(old.locked||db.fixedLessons.some(f=>f.assignmentId===old.assignmentId&&f.dayId===old.dayId&&+f.period===+old.period))throw Error('محاولة تغيير حصة مثبتة: '+e.id)}
  const slots=new Set();for(const e of candidate){const d=db.days.find(x=>x.id===e.dayId),sec=db.sections.find(x=>x.id===e.sectionId);if(!d||!d.active||!sec||e.period>sectionDayPeriods(sec,d))throw Error('حصة خارج الدوام: '+e.id);for(const key of ['teacherId','sectionId']){const k=key+':'+e[key]+':'+e.dayId+':'+e.period;if(slots.has(k))throw Error('تعارض '+(key==='teacherId'?'مدرس':'شعبة')+' عند '+e.dayId+' / '+e.period);slots.add(k)}}
  const check=await validateLocalCandidate(candidate);if(!check.ok)throw Error('لم يجتز الجدول المدقق المستقل: '+String(check.reason||check.message||'قيود غير مستوفاة'));
  pendingExcel={candidate,changes,baseline:JSON.stringify(db.timetable)};report.textContent='اجتاز الفحص. إجمالي الحصص: '+candidate.length+'؛ الحصص المتغيرة: '+changes.length+'. لن تُطبق التغييرات إلا بعد الضغط على زر التطبيق.';$('#masarExcelApply').disabled=changes.length===0;
 }catch(err){report.textContent='رفض الاستيراد: '+(err.message||err)}};
 $('#masarExcelApply').onclick=async ()=>{if(!pendingExcel)return;const report=$('#masarExcelImportReport');if(JSON.stringify(db.timetable)!==pendingExcel.baseline){report.textContent='تغير الجدول منذ الفحص؛ أعد الفحص.';return}if(!(await masarConfirm('سيتم استبدال مواقع '+pendingExcel.changes.length+' حصة بعد تنزيل نسخة احتياطية JSON. هل توافق؟')))return;
  try{const backup=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),url=URL.createObjectURL(backup),link=document.createElement('a');link.href=url;link.download='masar-before-excel-import-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  const previous=structuredClone(db.timetable);db.timetable=pendingExcel.candidate;db.manualHistory??=[];db.manualHistory.push({id:uid('edit'),at:new Date().toISOString(),type:'excel-import',before:pendingExcel.changes.map(e=>{const old=previous.find(x=>x.id===e.id);return {id:e.id,dayId:old.dayId,period:old.period}}),after:pendingExcel.changes.map(e=>({id:e.id,dayId:e.dayId,period:e.period}))});if(db.manualHistory.length>100)db.manualHistory.shift();if(!save()){db.timetable=previous;db.manualHistory.pop();throw Error('فشل حفظ البيانات؛ أعيد الجدول السابق في الذاكرة')}pendingExcel=null;$('#masarExcelApply').disabled=true;report.textContent='نجح استيراد الجدول وحفظه. راجع مساحة عمل الجدول.';
  }catch(err){report.textContent='تعذر تطبيق التغييرات: '+(err.message||err)}};

 const scopeUI=`<section class="print-scope-panel"><h3>الطباعة الاحترافية حسب النطاق</h3><div class="grid"><div class="field"><label>الجدول المطلوب</label><select id="prScope"><option value="school">المدرسة كاملة — A3</option><option value="middle">المجموعة الأولى — A3</option>${stageGroups()[1]?'<option value="high">المجموعة الثانية — A3</option>':''}<option value="stage">مرحلة واحدة — A3 بخط أوضح</option><option value="section">شعبة واحدة — A4 أفقي</option><option value="teacher">مدرس واحد — بطاقة A4 أفقي</option></select></div><div class="field" id="prScopeEntityWrap" hidden><label>اختر المرحلة / الشعبة / المدرس</label><select id="prScopeEntity"></select></div></div><div class="actions"><button type="button" id="prScopePrint">طباعة النطاق المختار / حفظ PDF</button></div><p class="muted">الطباعة لا تغيّر أي حصة. اختر حفظ PDF من نافذة الطباعة. تتوفر ألوان المراحل حسب إعدادات الطباعة.</p></section>`;
 $('#workspace').insertAdjacentHTML('beforeend',scopeUI);
 const scopeSelect=$('#prScope'),scopeEntity=$('#prScopeEntity'),scopeWrap=$('#prScopeEntityWrap');
 function updateScopeOptions(){const mode=scopeSelect.value;scopeWrap.hidden=!['stage','section','teacher'].includes(mode);const items=mode==='stage'?db.stages.slice().sort((a,b)=>a.order-b.order):mode==='section'?db.sections.slice().sort((a,b)=>(db.stages.find(g=>g.id===a.stageId)?.order||0)-(db.stages.find(g=>g.id===b.stageId)?.order||0)||a.order-b.order):mode==='teacher'?db.teachers.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar')):[];scopeEntity.innerHTML=items.map(x=>`<option value="${esc(x.id)}">${esc(mode==='stage'?stageDisplayName(x):mode==='section'?exportSectionName(x.id):x.name)}</option>`).join('')}
 scopeSelect.onchange=updateScopeOptions;updateScopeOptions();
 $('#prScopePrint').onclick=()=>{store();openScopedPrint(scopeSelect.value,scopeEntity.value)};
 const designUI=`<section class="design-options"><h3>الهوية الرسمية وشعار المدرسة</h3><div class="grid"><div class="field"><label>النمط البصري</label><select id="prDesignTheme"><option value="formal">رسمي أكاديمي (كحلي وذهبي)</option><option value="minimal">رسمي مبسط</option><option value="soft">ألوان المراحل</option></select></div><div class="field"><label>موضع الشعار</label><select id="prLogoPosition"><option value="center">منتصف الرأس</option><option value="right">يمين الرأس</option><option value="left">يسار الرأس</option><option value="none">إخفاء الشعار</option></select></div><div class="field"><label>كثافة الخلايا</label><select id="prDensity"><option value="compact">مضغوط</option><option value="medium">متوسط</option><option value="wide">واسع</option></select></div></div><div class="field"><label>رفع شعار المدرسة (PNG أو JPG، بحد أقصى 1 ميغابايت)</label><input id="prLogoFile" type="file" accept="image/png,image/jpeg"><div id="prLogoPreview">${p.logo?`<img class="logo-preview" src="${p.logo}" alt="معاينة شعار المدرسة">`:'لا يوجد شعار مرفوع'}</div><button type="button" class="secondary" id="prRemoveLogo">إزالة الشعار</button></div><div class="design-toggles"><label><input type="checkbox" id="prTeachers"> إظهار أسماء المدرسين</label><label><input type="checkbox" id="prNotes"> إظهار الملاحظات</label><label><input type="checkbox" id="prSignatures"> إظهار التواقيع</label></div><div class="grid"><div class="field"><label>التوقيع الأول</label><input id="prSig1"></div><div class="field"><label>التوقيع الثاني</label><input id="prSig2"></div><div class="field"><label>التوقيع الثالث</label><input id="prSig3"></div></div><div class="notice">الإعدادات تُحفظ ضمن نسخة JSON الاحتياطية، ولا تؤثر في توزيع الحصص أو القيود.</div></section>`;
 $('#workspace').insertAdjacentHTML('afterbegin',designUI);
 const previewFrame=$('#printPreviewFrame');if(previewFrame){previewFrame.srcdoc='<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+printCSS()+premiumPrintCSS()+'</style></head><body>'+printDocument()+'</body></html>';}

 $('#prPrintMode').value=p.printMode==='bw'?'bw':'color';$('#prDesignTheme').value=p.theme||'formal';$('#prLogoPosition').value=p.logoPosition||'center';$('#prDensity').value=p.density||'compact';$('#prTeachers').checked=p.showTeachers!==false;$('#prNotes').checked=p.showNotes!==false;$('#prSignatures').checked=p.showSignatures!==false;$('#prSig1').value=p.signature1||'منظّم الجدول';$('#prSig2').value=p.signature2||'معاون المدير';$('#prSig3').value=p.signature3||'مدير المدرسة';
 $('#prLogoFile').onchange=()=>{const file=$('#prLogoFile').files[0];if(!file)return;if(!['image/png','image/jpeg'].includes(file.type)||file.size>1048576){alert('اختر صورة PNG أو JPG بحجم لا يتجاوز 1 ميغابايت');$('#prLogoFile').value='';return}const reader=new FileReader();reader.onload=()=>{p.logo=String(reader.result);$('#prLogoPreview').innerHTML=`<img class="logo-preview" src="${p.logo}" alt="معاينة الشعار">`;save()};reader.readAsDataURL(file)};
 $('#prRemoveLogo').onclick=()=>{p.logo='';$('#prLogoFile').value='';$('#prLogoPreview').textContent='لا يوجد شعار مرفوع';save()};
 const store=()=>{p.title=$('#prTitle').value.trim()||'جدول الحصص الأسبوعية';p.startDate=$('#prDate').value;p.changeReasons=$('#prReasons').value;p.footer=$('#prFooter').value;p.showColors=$('#prColors').checked;p.printMode=$('#prPrintMode').value;p.theme=$('#prDesignTheme').value;p.logoPosition=$('#prLogoPosition').value;p.density=$('#prDensity').value;p.showTeachers=$('#prTeachers').checked;p.showNotes=$('#prNotes').checked;p.showSignatures=$('#prSignatures').checked;p.signature1=$('#prSig1').value.trim();p.signature2=$('#prSig2').value.trim();p.signature3=$('#prSig3').value.trim();save()};
 $('#prPrintMode').onchange=()=>{const frame=$('#printPreviewFrame');if(frame){const previous=p.printMode;p.printMode=$('#prPrintMode').value;frame.srcdoc='<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>'+printCSS()+premiumPrintCSS()+'</style></head><body>'+printDocument()+'</body></html>';p.printMode=previous}};$('#prSave').onclick=()=>{store();printSetup()};$('#prPrint').onclick=()=>{store();openPrintSheets()};$('#prPDF').onclick=()=>{store();openPrintSheets();};
 const type=$('#imgType'),choice=$('#imgChoice'),wrap=$('#imgChoiceWrap');
 function refreshChoice(){const v=type.value;wrap.hidden=!['stage','teacher','section'].includes(v);let list=v==='stage'?db.stages.slice().sort((a,b)=>a.order-b.order):v==='teacher'?db.teachers.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar')):db.sections.slice().sort((a,b)=>(db.stages.find(g=>g.id===a.stageId)?.order||0)-(db.stages.find(g=>g.id===b.stageId)?.order||0)||a.order-b.order);choice.innerHTML=list.map(x=>`<option value="${x.id}">${esc(v==='stage'?stageDisplayName(x):v==='section'?exportSectionName(x.id):x.name)}</option>`).join('')};type.onchange=refreshChoice;refreshChoice();
 $('#imgSave').onclick=async()=>{store();if(!db.timetable.length)return alert('لا يوجد جدول للتصدير');const btn=$('#imgSave');btn.disabled=true;$('#imgStatus').textContent='جارٍ تجهيز الصورة...';try{await exportSchedulePNG(type.value,choice.value);$('#imgStatus').textContent='تم تجهيز الصورة؛ تحقق من التنزيلات أو قائمة المشاركة.'}catch(e){$('#imgStatus').textContent='تعذر التصدير: '+e.message}finally{btn.disabled=false}};
}
// Shared display helper: available to print setup and PNG renderer.
function exportSectionName(id){const sec=db.sections.find(x=>x.id===id);if(!sec)return '—';const stage=db.stages.find(g=>g.id===sec.stageId);return (stage?stageDisplayName(stage):'مرحلة')+' '+sec.name;}
const exportPalettes={g1:['#E7F0F9','#244E78','#587B9B'],g2:['#E8F3E9','#315F3B','#6F8F72'],g3:['#F7EEE3','#785332','#9A7B60'],g4:['#EEEAF7','#59477E','#7D7398'],g5:['#FAEBEF','#85445A','#A16F78'],g6:['#E4F2F1','#27616A','#557F83']};
async function exportSchedulePNG(mode,id){
 const stages=mode==='all'?db.stages.map(x=>x.id):mode==='middle'?(stageGroups()[0]?.ids||[]):mode==='high'?(stageGroups()[1]?.ids||[]):mode==='stage'?[id]:null;
 const sec=mode==='section'?db.sections.filter(x=>x.id===id):db.sections.filter(x=>!stages||stages.includes(x.stageId));
 const sections=mode==='teacher'?[]:sec.slice().sort((a,b)=>(db.stages.find(g=>g.id===a.stageId)?.order||0)-(db.stages.find(g=>g.id===b.stageId)?.order||0)||a.order-b.order);
 const focus=mode==='teacher'||mode==='section',days=db.days.filter(d=>d.active).sort((a,b)=>a.order-b.order);
 const timetableIndex=new Map(db.timetable.map(e=>[e.dayId+'|'+e.period+'|'+(mode==='teacher'?e.teacherId:e.sectionId),e]));
 if(!days.length)throw new Error('لا توجد أيام دوام مفعّلة للتصدير');
 if(!focus&&!sections.length)throw new Error('لا توجد شعب لهذا النوع من الجدول');
 const headings=focus?days:sections;
 const rows=focus?Array.from({length:Math.max(...days.map(d=>d.periods))},(_,i)=>({period:i+1})):days.flatMap(day=>Array.from({length:day.periods},(_,i)=>({day,period:i+1})));
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)throw new Error('المتصفح لا يدعم الرسم');ctx.direction='rtl';
 try{await Promise.all(['400 16px "IBM Plex Sans Arabic"','700 16px "IBM Plex Sans Arabic"','700 16px "El Messiri"'].map(f=>document.fonts.load(f,'أبجد 123')))}catch(_){}
 const font=(size,bold=false)=>`${bold?'700':'400'} ${size}px "IBM Plex Sans Arabic",Tahoma,Arial,sans-serif`;
 const measure=(str,size,bold=false)=>{ctx.font=font(size,bold);return ctx.measureText(String(str||'')).width};
 const wrap=(str,max,size,bold=false)=>{let lines=[''];for(const word of String(str||'—').split(/\s+/)){let i=lines.length-1,test=lines[i]?lines[i]+' '+word:word;if(measure(test,size,bold)<=max||!lines[i])lines[i]=test;else lines.push(word)}return lines};
 const focusW=focus?170:0,dayW=focus?0:34,periodW=focus?32:28,baseFont=focus?17:13,teacherFont=focus?14:11;
 const colWidths=headings.map(item=>{if(focus)return focusW;const entries=db.timetable.filter(e=>e.sectionId===item.id);const widest=Math.max(measure(exportSectionName(item.id),14,true),...entries.map(e=>Math.max(measure(db.subjects.find(s=>s.id===e.subjectId)?.name||'',baseFont,true),measure(teacherShort(db.teachers.find(t=>t.id===e.teacherId)?.name),teacherFont))));return Math.max(66,Math.min(110,Math.ceil(widest+10)))});
 const margin=24,tableW=dayW+periodW+colWidths.reduce((a,b)=>a+b,0),width=Math.max(tableW+margin*2,focus?940:620),headH=52,topH=150,footH=db.printSettings.showSignatures?112:70;
 const rowHeights=rows.map(r=>{let h=31;headings.forEach((item,ci)=>{const day=focus?item:r.day,sectionId=mode==='section'?id:item.id;const e=timetableIndex.get(day.id+'|'+r.period+'|'+(mode==='teacher'?id:sectionId));if(!e)return;const w=colWidths[ci]-14;const sub=db.subjects.find(s=>s.id===e.subjectId)?.name||'—',t=db.teachers.find(t=>t.id===e.teacherId)?.name||'—';const subLines=wrap(sub,w,baseFont,true).length,teachLines=db.printSettings.showTeachers===false?0:wrap(mode==='teacher'?exportSectionName(e.sectionId):teacherShort(t),w,teacherFont).length;h=Math.max(h,5+subLines*(baseFont+1)+teachLines*(teacherFont+1))});return h});
 const height=topH+headH+rowHeights.reduce((a,b)=>a+b,0)+footH;
 if(width>9000||height>9000||width*height>50000000)throw new Error('الصورة كبيرة لهذا الجهاز؛ جرّب تصدير مرحلة واحدة.');
 canvas.width=width;canvas.height=height;const c=canvas.getContext('2d');c.direction='rtl';c.fillStyle='#fff';c.fillRect(0,0,width,height);
 const box=(x,y,w,h,bg,border='#C9D4EA')=>{c.fillStyle=bg;c.fillRect(x,y,w,h);c.strokeStyle=border;c.lineWidth=1;c.strokeRect(x+.5,y+.5,w-1,h-1)};
 const text=(str,x,y,size=17,color='#0B1633',bold=false)=>{c.direction='rtl';c.font=font(size,bold);c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.fillText(String(str||'—'),x,y)};
 const lines=(str,x,y,w,size,bold,color,step)=>{const ls=wrap(str,w,size,bold);ls.forEach((line,i)=>text(line,x,y+i*step,size,color,bold));return ls.length*step};
 const title=mode==='all'?'المدرسة كاملة':mode==='middle'?schoolGroupName(0):mode==='high'?schoolGroupName(1):mode==='stage'?stageDisplayName(db.stages.find(x=>x.id===id)):mode==='teacher'?db.teachers.find(x=>x.id===id)?.name:exportSectionName(id);
 // Same premium navy/gold identity as the print/PDF document.
 c.fillStyle='#0F2A75';c.fillRect(margin,12,width-margin*2,topH-23);
 c.fillStyle='#C8A24A';c.fillRect(margin,topH-13,width-margin*2,4);
 text(db.school.name||'اسم المدرسة',width/2,39,Math.min(25,Math.max(17,width/32)),'#EAD6A4',true);
 text(db.printSettings.title||'جدول الحصص الأسبوعية',width/2,75,Math.min(23,Math.max(16,width/38)),'#FFFFFF',true);
 text(title,width/2,103,Math.min(17,Math.max(13,width/48)),'#F6F0E5',true);
 text(`العام الدراسي: ${db.school.year||'—'} | تاريخ بدء التطبيق: ${db.printSettings.startDate||'غير محدد'}`,width/2,125,Math.min(12,Math.max(9,width/75)),'#E6EDF5');
 if(db.printSettings.logo&&db.printSettings.logoPosition!=='none'){try{const img=new Image();img.src=db.printSettings.logo;await new Promise((resolve,reject)=>{if(img.complete&&img.naturalWidth)return resolve();img.onload=resolve;img.onerror=reject});const x=db.printSettings.logoPosition==='center'?width/2-22:db.printSettings.logoPosition==='right'?width-82:38;c.drawImage(img,x,5,44,44)}catch(e){/* Continue exporting without invalid logo */}}
 
 const tableTop=topH;let right=width-margin;
 if(!focus){right-=dayW;box(right,tableTop,dayW,headH,'#0F2A75','#C8A24A');c.save();c.translate(right+dayW/2,tableTop+headH/2);c.rotate(-Math.PI/2);text('اليوم',0,0,13,'#FFFFFF',true);c.restore()}
 right-=periodW;box(right,tableTop,periodW,headH,'#0F2A75','#C8A24A');c.save();c.translate(right+periodW/2,tableTop+headH/2);c.rotate(-Math.PI/2);text('الحصة',0,0,13,'#FFFFFF',true);c.restore();
 headings.forEach((item,i)=>{const w=colWidths[i];right-=w;const pal=focus?null:exportPalettes[item.stageId];box(right,tableTop,w,headH,'#244669','#C8A24A');lines(focus?item.name:exportSectionName(item.id),right+w/2,tableTop+headH/2-7,w-10,14,true,'#FFFFFF',17)});
 let yy=tableTop+headH;const dayColors=['#DCE9F8','#E2F1E5','#FFF0DA','#EEE7F9','#FBE8ED'];
 rows.forEach((r,ri)=>{const rh=rowHeights[ri];let xx=width-margin;
 if(!focus){xx-=dayW;if(r.period===1){const start=ri,total=rows.slice(start,start+r.day.periods).reduce((sum,_,j)=>sum+rowHeights[start+j],0);box(xx,yy,dayW,total,dayColors[days.findIndex(d=>d.id===r.day.id)]||'#EAF1F8');c.save();c.translate(xx+dayW/2,yy+total/2);c.rotate(-Math.PI/2);text(r.day.name,0,0,20,'#24466C',true);c.restore()}}
 xx-=periodW;box(xx,yy,periodW,rh,ri%2?'#F2F6FA':'#EAF0F6');text(String(r.period),xx+periodW/2,yy+rh/2,13,'#334155',true);
 headings.forEach((item,i)=>{const w=colWidths[i];xx-=w;const day=focus?item:r.day,secId=mode==='section'?id:item.id;const e=timetableIndex.get(day.id+'|'+r.period+'|'+(mode==='teacher'?id:secId));const section=mode==='teacher'?db.sections.find(s=>s.id===e?.sectionId):mode==='section'?db.sections.find(s=>s.id===id):item;const pal=db.printSettings.showColors===false?['#F4F7FA','#334155','#64748B']:(exportPalettes[section?.stageId]||['#F4F7FA','#334155','#64748B']);const off=mode==='teacher'?r.period>day.periods:r.period>sectionDayPeriods(section,day);box(xx,yy,w,rh,off?'#F1F3F6':e?(db.printSettings.theme==='contrast'?'#FFFFFF':pal[0]):ri%2?'#FAFBFC':'#FFFFFF',e?pal[2]:'#D4DCE5');if(e){const sub=db.subjects.find(s=>s.id===e.subjectId)?.name||'—',teacher=db.teachers.find(t=>t.id===e.teacherId)?.name||'—';const t=mode==='teacher'?exportSectionName(e.sectionId):teacherShort(teacher),subLines=wrap(sub,w-8,baseFont,true),tLines=db.printSettings.showTeachers===false?[]:wrap(t,w-8,teacherFont),total=subLines.length*(baseFont+1)+tLines.length*(teacherFont+3),first=yy+(rh-total)/2+baseFont/2+2;subLines.forEach((line,k)=>text(line,xx+w/2,first+k*(baseFont+1),baseFont,'#182D43',true));tLines.forEach((line,k)=>text(line,xx+w/2,first+subLines.length*(baseFont+1)+k*(teacherFont+1),teacherFont,'#475569'))}else if(off)text('—',xx+w/2,yy+rh/2,15,'#9AA5B1')});yy+=rh});
 if(db.printSettings.showNotes!==false){c.fillStyle='#FBFAF7';c.fillRect(margin,height-footH+5,width-2*margin,47);c.strokeStyle='#D4C29A';c.strokeRect(margin+.5,height-footH+5.5,width-2*margin-1,46);text(`أسباب تغيير الجدول: ${db.printSettings.changeReasons||'—'}`,width/2,height-footH+20,14,'#475569');if(db.printSettings.footer)text(db.printSettings.footer,width/2,height-footH+42,12,'#475569')}
 if(db.printSettings.showSignatures!==false){const labels=[db.printSettings.signature1||'منظّم الجدول',db.printSettings.signature2||'معاون المدير',db.printSettings.signature3||'مدير المدرسة'];labels.forEach((label,i)=>{const x=width*(i+1)/4;text(label,x,height-37,13,'#0B1633',true);text('التوقيع: __________',x,height-17,11,'#475569')})}
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('فشل إنشاء PNG')),'image/png'));const filename='masar-timetable-'+mode+(id?'-'+id:'')+'.png';const file=typeof File==='function'?new File([blob],filename,{type:'image/png'}):null;
 if(file&&navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:'جدول الحصص'});return}catch(e){if(e.name==='AbortError')throw new Error('أُلغيت مشاركة الصورة')}}
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
}

$('#exportBtn').onclick=exportSafeBackup;
// A real, associated file input/label is required for reliable iPad Safari picking.
const backupInput=document.getElementById('importFile');
backupInput.addEventListener('change',async function(){
 const file=this.files&&this.files[0];if(!file)return;
 try{
  if(!/\.json$/i.test(file.name))throw Error('اختر ملف نسخة احتياطية بصيغة JSON.');
  const raw=await file.text();let parsed;
  try{parsed=JSON.parse(raw)}catch(_){throw Error('الملف ليس JSON صالحاً.')} 
  // Recovery downloads wrap the actual school data in a data property.
  if(parsed&&parsed.data&&parsed.savedAt&&!parsed.sections)parsed=parsed.data;
  if(!parsed||typeof parsed!=='object'||!Array.isArray(parsed.sections)||!Array.isArray(parsed.assignments)||!Array.isArray(parsed.timetable)||!Array.isArray(parsed.days)||!Array.isArray(parsed.stages)||!Array.isArray(parsed.subjects)||!Array.isArray(parsed.teachers))throw Error('النسخة لا تحتوي بيانات مدرسة نيبور كاملة.');
  const incoming=migrate(structuredClone(parsed));
  const oldCount=db.timetable?.length||0,newCount=incoming.timetable.length;
  if(!(await masarConfirm('استيراد مدرسة: '+(incoming.school?.name||'بدون اسم')+'\nالحصص الحالية: '+oldCount+'\nالحصص المستوردة: '+newCount+'\nسيتم استبدال بيانات مساحة العمل الحالية. هل تريد المتابعة؟')))return;
  if(oldCount>0&&newCount===0&&!(await masarConfirm('تحذير: النسخة المستوردة خالية من الحصص الموزعة. هل تريد المتابعة؟')))return;
  if(!preserveTimetable('استيراد نسخة احتياطية'))return;
  const previous=db;db=incoming;
  if(!save()){db=previous;throw Error('تعذر حفظ البيانات المستوردة. لم يتم اعتماد الاستيراد.')} 
  render();alert('تم الاستيراد بنجاح — الحصص الموزعة: '+newCount);
 }catch(err){alert('تعذر استيراد النسخة: '+(err?.message||String(err)))}
 finally{this.value='';}
});
render();
// A non-blocking reminder after initial UI paint.
setTimeout(backupReminder,900);

// Explicit cloud transfer hooks: no automatic replacement of local data.
window.MASAR_CLOUD_BRIDGE={exportData:()=>structuredClone(db),importData:(data)=>{const incoming=migrate(structuredClone(data));if(!Array.isArray(incoming.sections)||!Array.isArray(incoming.assignments)||!Array.isArray(incoming.timetable))throw Error('بيانات غير مكتملة');if(!preserveTimetable('استيراد مدرسة من السحابة'))throw Error('أُلغي حفظ نسخة الأمان');db=incoming;if(!save())throw Error('فشل الحفظ المحلي');render();},refresh:()=>render()};

window.addEventListener('storage',ev=>{if(ev.key===KEY&&ev.newValue){try{db=migrate(JSON.parse(ev.newValue));render()}catch(err){console.warn('Masar sync failed',err)}}});

/* مسار — لوحة التخزين: السعة، التخزين الدائم، ربط ملف مشروع على الجهاز، وحفظ نسخة في الملفات */
(function(){
'use strict';
const fmt=n=>n>1048576?(n/1048576).toFixed(1)+' MB':Math.round(n/1024)+' KB';
let handle=null,fileState='none',lastWrite=null,timer=null;
const canPick=typeof window.showSaveFilePicker==='function';

/* تنبيه فشل الحفظ */
window.addEventListener('masar-storage-error',e=>{
  const d=document.createElement('div');d.setAttribute('role','alert');
  d.style.cssText='position:fixed;inset-inline:12px;top:12px;z-index:99999;padding:14px 18px;border-radius:14px;background:#B3261E;color:#fff;font-weight:700;text-align:center;box-shadow:0 10px 30px #0006';
  d.textContent='⚠ تعذر الحفظ في تخزين المتصفح ('+(e.detail||'')+'). صدّر نسخة JSON الآن من «إعدادات المدرسة» حتى لا تفقد عملك.';
  document.body.appendChild(d);setTimeout(()=>d.remove(),15000);
});

/* ملف المشروع المرتبط */
async function loadHandle(){try{handle=await MStore.rawGet('fileHandle')||null;if(handle)fileState=await perm(false)}catch(e){handle=null}}
async function perm(ask){
  if(!handle)return 'none';
  try{let p=await handle.queryPermission({mode:'readwrite'});if(p!=='granted'&&ask)p=await handle.requestPermission({mode:'readwrite'});return p==='granted'?'ok':'need'}
  catch(e){return 'need'}
}
async function writeFile(){
  if(!handle)return;
  if(fileState!=='ok')return;
  try{const w=await handle.createWritable();await w.write(JSON.stringify(db));await w.close();lastWrite=new Date();refresh()}
  catch(e){fileState='need';refresh()}
}
MStore.onWrite(k=>{if(k===KEY&&handle){clearTimeout(timer);timer=setTimeout(writeFile,2500)}});
async function link(){
  try{
    const h=await window.showSaveFilePicker({suggestedName:'nippur-project.json',types:[{description:'ملف مشروع نيبور',accept:{'application/json':['.json']}}]});
    handle=h;await MStore.rawSet('fileHandle',h);fileState='ok';await writeFile();refresh();
  }catch(e){if(e&&e.name!=='AbortError')alert('تعذر ربط الملف: '+(e.message||e))}
}
async function unlink(){handle=null;fileState='none';try{await MStore.rawSet('fileHandle',null)}catch(_){}refresh()}

/* حفظ نسخة في الملفات (يعمل على كل الأجهزة) */
async function saveCopy(){
  const name='masar-backup-'+new Date().toISOString().slice(0,10)+'.json',blob=new Blob([JSON.stringify(db)],{type:'application/json'});
  try{const f=new File([blob],name,{type:'application/json'});if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:'نسخة نيبور'});return}}catch(e){if(e&&e.name==='AbortError')return}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();
  try{MStore.setItem(BACKUP_DATE_KEY,new Date().toISOString())}catch(_){}
}

/* اللوحة */
async function info(){
  let est=null,persisted=null;
  try{if(navigator.storage&&navigator.storage.estimate)est=await navigator.storage.estimate()}catch(_){}
  try{if(navigator.storage&&navigator.storage.persisted)persisted=await navigator.storage.persisted()}catch(_){}
  return {est,persisted};
}
let panel=null;
async function refresh(){
  if(!panel||!document.body.contains(panel))return;
  const {est,persisted}=await info();
  const used=MStore.sizeBytes(),mode=MStore.mode==='idb';
  const q=est&&est.quota?est.quota:0,u=est&&est.usage?est.usage:0,pct=q?Math.min(100,Math.round(u/q*100)):0;
  panel.innerHTML=`<h3>التخزين على جهازك</h3>
  <div class="notice ${mode?'':'warning'}">${mode?'يعمل التطبيق على <b>IndexedDB</b> (سعة كبيرة، على جهازك).':'⚠ تعذر تشغيل IndexedDB في هذا المتصفح، فيستخدم التطبيق التخزين الصغير القديم ('+(window.__masarStorageFallback||'')+'). صدّر نسخاً بانتظام.'}</div>
  <div class="grid"><div class="field"><label>حجم بيانات نيبور</label><b>${fmt(used)}</b></div>
  <div class="field"><label>المتاح للموقع (تقدير المتصفح)</label><b>${q?fmt(u)+' من '+fmt(q)+' ('+pct+'%)':'غير معروف'}</b></div>
  <div class="field"><label>تخزين دائم</label><b>${persisted===true?'مفعّل ✓':persisted===false?'غير مفعّل':'غير مدعوم'}</b></div></div>
  ${pct>80?'<div class="notice error">المساحة قاربت على الامتلاء. صدّر نسخة واحذف النسخ القديمة.</div>':''}
  <div class="actions"><button id="stPersist" class="secondary">طلب تخزين دائم</button><button id="stSave">💾 حفظ نسخة في الملفات</button></div>
  <h4>ملف مشروع على جهازك</h4>
  ${canPick?`<p class="muted">اختر ملفاً مرة واحدة فيُحدَّث تلقائياً بعد كل تعديل (كروم/إيدج على الكمبيوتر).</p>
  <div class="notice">${fileState==='ok'?'مرتبط ✓ — آخر كتابة: '+(lastWrite?lastWrite.toLocaleTimeString('ar-IQ'):'—'):fileState==='need'?'مرتبط لكن يحتاج إذنك لمتابعة الحفظ.':'غير مرتبط.'}</div>
  <div class="actions">${fileState==='none'?'<button id="stLink">ربط ملف المشروع</button>':fileState==='need'?'<button id="stResume">متابعة الحفظ في الملف</button>':'<button id="stNow" class="secondary">حفظ الآن</button>'}${fileState!=='none'?'<button id="stUnlink" class="secondary">إلغاء الربط</button>':''}</div>`:`<p class="muted">هذا المتصفح لا يدعم الكتابة التلقائية في ملف (مثل سفاري على الآيباد). استخدم «حفظ نسخة في الملفات» بعد التعديلات المهمة.</p>`}`;
  const $=s=>panel.querySelector(s);
  $('#stSave').onclick=saveCopy;
  $('#stPersist').onclick=async()=>{try{const r=await navigator.storage.persist();alert(r?'تم تفعيل التخزين الدائم.':'لم يمنح المتصفح التخزين الدائم (قد يمنحه عند تثبيت التطبيق على الشاشة الرئيسية).')}catch(e){alert('غير مدعوم')}refresh()};
  if($('#stLink'))$('#stLink').onclick=link;
  if($('#stResume'))$('#stResume').onclick=async()=>{fileState=await perm(true);await writeFile();refresh()};
  if($('#stNow'))$('#stNow').onclick=writeFile;
  if($('#stUnlink'))$('#stUnlink').onclick=unlink;
}
const origSettings=window.schoolSettings;
window.schoolSettings=function(){
  origSettings();
  const w=document.querySelector('#workspace');if(!w)return;
  panel=document.createElement('section');panel.className='backup-protection glass-surface';
  const h=w.querySelector('h2');(h?h.after(panel):w.prepend(panel));refresh();
};
loadHandle().then(()=>{if(page==='schoolSettings')render()});
window.MASAR_STORAGE_UI={saveCopy,writeFile};
})();

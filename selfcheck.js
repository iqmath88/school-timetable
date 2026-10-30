'use strict';
/* مسار — فحص سلامة التطبيق على هذا الجهاز (إعداد المدرسة ← فحص سلامة التطبيق).
   يكشف الملفات الناقصة بعد الرفع، ومشاكل التخزين والمحرك، دون تغيير أي بيانات. */
(function(){
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const OPTIONAL=['cloud-config.js'];
async function check(name,fn){const t0=performance.now();try{const r=await fn();return {name,ok:r.ok!==false,warn:!!r.warn,msg:r.msg||'',ms:Math.round(performance.now()-t0)}}catch(e){return {name,ok:false,msg:String(e&&e.message||e),ms:Math.round(performance.now()-t0)}}}
async function files(){
 const t=await (await fetch('sw.js',{cache:'no-store'})).text();
 const blk=(t.match(/const FILES=\[([\s\S]*?)\]/)||[])[1]||'';
 const list=[...blk.matchAll(/"([^"]+)"/g)].map(m=>m[1]).filter(f=>f!=='./'&&!OPTIONAL.includes(f));
 const missing=[];
 await Promise.all(list.map(async f=>{try{let r=await fetch(f,{method:'HEAD',cache:'no-store'});if(!r.ok&&r.status!==405)missing.push(f);else if(r.status===405){r=await fetch(f,{cache:'no-store'});if(!r.ok)missing.push(f)}}catch(e){missing.push(f)}}));
 const v=(t.match(/const V='([^']+)'/)||[])[1]||'?';
 return missing.length?{ok:false,msg:'ملفات غير موجودة على الخادم: '+missing.join('، ')+' — ارفعها ثم حدّث الصفحة'}:{msg:list.length+' ملفاً موجودة (إصدار الخادم '+v+')'}
}
async function storage(){
 const k='masar-selfcheck-'+Date.now(),v=String(Math.random());
 MStore.setItem(k,v);const back=MStore.getItem(k);MStore.removeItem(k);
 if(back!==v)return {ok:false,msg:'تعذرت الكتابة/القراءة في تخزين المتصفح'};
 let per='';try{if(navigator.storage&&navigator.storage.persisted){per=(await navigator.storage.persisted())?' · تخزين دائم مفعّل':' · التخزين غير دائم (قد يمسحه المتصفح عند ضيق المساحة)'}}catch(e){}
 return {msg:'الكتابة والقراءة تعمل'+per,warn:/غير دائم/.test(per)}
}
async function engine(){
 const base=seed();const g=base.stages[0];
 base.stages=[g];base.sections=['أ','ب'].map((n,i)=>({id:'sc_s'+i,stageId:g.id,name:n,order:i+1}));
 base.subjects=['ر','ع','ف'].map((n,i)=>({id:'sc_u'+i,name:n,color:'#dde'}));
 base.teachers=['١','٢','٣'].map((n,i)=>({id:'sc_t'+i,name:'م'+n,specialty:'x'}));
 base.assignments=[];let k=0;base.sections.forEach((s,si)=>base.subjects.forEach((u,ui)=>base.assignments.push({id:'sc_a'+k++,teacherId:'sc_t'+((ui+si)%3),sectionId:s.id,subjectId:u.id,weeklyPeriods:3})));
 base.timetable=[];const d=migrate(base);
 const res=await new Promise((ok,no)=>{let w;try{w=new Worker('generator-worker.js?sc='+Date.now())}catch(e){return no(e)}
  const to=setTimeout(()=>{w.terminate();no(Error('انتهت المهلة (20 ثانية) دون نتيجة'))},20000);
  w.onmessage=e=>{if(e.data.type==='result'){clearTimeout(to);w.terminate();ok(e.data.result)}};
  w.onerror=e=>{clearTimeout(to);no(Error('تعذر تشغيل محرك التوليد: '+(e.message||'ملف generator-worker.js ناقص أو به خطأ')))};
  w.postMessage({type:'start',db:structuredClone(d),deadlineMs:10000})});
 if(!res.ok)return {ok:false,msg:'فشل توليد جدول تجريبي صغير: '+(res.message||res.reason||'')};
 /* تدقيق مستقل: نعيد الجدول إلى المحرك فيتحقق منه بمدققه (reused=true يعني اجتاز كل القيود) */
 const d2=structuredClone(d);d2.timetable=res.entries;
 const v=await new Promise((ok,no)=>{const w=new Worker('generator-worker.js?sc2='+Date.now());const to=setTimeout(()=>{w.terminate();no(Error('انتهت مهلة التدقيق'))},15000);
  w.onmessage=e=>{if(e.data.type==='result'){clearTimeout(to);w.terminate();ok(e.data.result)}};w.onerror=e=>{clearTimeout(to);no(Error(e.message||'خطأ في المدقق'))};w.postMessage({type:'start',db:d2,deadlineMs:5000})});
 return (v.ok&&v.reused)?{msg:'وُلّد جدول تجريبي ('+res.entries.length+' حصة) واجتاز التدقيق المستقل'}:{ok:false,msg:'التدقيق رفض الجدول التجريبي: '+(v.message||v.reason||'')};
}
async function mip(){
 const r=await fetch('highs.wasm',{method:'HEAD',cache:'no-store'});
 const r2=await fetch('mip-engine.js',{method:'HEAD',cache:'no-store'});const r3=await fetch('highs-engine.js',{method:'HEAD',cache:'no-store'});
 return (r.ok&&r2.ok&&r3.ok)?{msg:'ملفات المحرك الرياضي الاحتياطي موجودة'}:{ok:false,msg:'ملفات المحرك الرياضي الاحتياطي ناقصة (highs.wasm / mip-engine.js / highs-engine.js): لن يعمل الاحتياطي عند تعذر الحل'};
}
async function fonts(){
 await document.fonts.ready;
 const a=document.fonts.check('700 16px "El Messiri"'),b=document.fonts.check('400 16px "IBM Plex Sans Arabic"');
 return a&&b?{msg:'الخطان المدمجان محمّلان'}:{ok:false,warn:true,msg:'خط مفقود: '+(a?'':'El Messiri ')+(b?'':'IBM Plex Sans Arabic')+' — تحقق من رفع ملفات woff2 وfonts.css'};
}
async function sw(){
 if(!('serviceWorker' in navigator))return {warn:true,msg:'المتصفح لا يدعم العمل بلا إنترنت'};
 const reg=await navigator.serviceWorker.getRegistration();
 return reg?{msg:'العمل بلا إنترنت مفعّل'+(reg.waiting?' — يوجد إصدار أحدث بانتظار التحديث':'')}:{warn:true,msg:'العمل بلا إنترنت غير مسجّل بعد (يُسجَّل عبر https بعد أول زيارة)'};
}
async function data(){
 const reds=analyzeFeasibility().filter(x=>x.level==='red').length;
 let tt='لا يوجد جدول مولّد';
 if(db.timetable&&db.timetable.length){const v=await validateLocalCandidate(structuredClone(db.timetable));if(!v.ok)return {ok:false,msg:'الجدول الحالي لا يجتاز التدقيق: '+(v.reason||'')};tt='الجدول الحالي ('+db.timetable.length+' حصة) يجتاز التدقيق المستقل'}
 return reds?{ok:true,warn:true,msg:tt+' · '+reds+' خطأ مانع في فحص الجدوى (يمنع توليداً جديداً)'}:{msg:tt+' · لا أخطاء مانعة'};
}
async function cloud(){
 const s=window.MASAR_SYNC&&MASAR_SYNC.state();if(!s)return {warn:true,msg:'المزامنة السحابية غير مفعّلة على هذا الجهاز'};
 const st=s.sync||{};return st.school?{msg:'مرتبط بمدرسة سحابية بدور «'+({owner:'مالك',admin:'مدير',deputy:'وكيل',teacher:'مدرس'}[st.role]||st.role||'—')+'» — الحالة: '+s.status}:{warn:true,msg:'غير مرتبط بمدرسة سحابية (يعمل محلياً)'};
}
async function runAll(onRow){
 const steps=[['ملفات التطبيق',files],['تخزين المتصفح',storage],['محرك التوليد',engine],['المحرك الاحتياطي',mip],['الخطوط',fonts],['العمل بلا إنترنت',sw],['بيانات المدرسة',data],['المزامنة السحابية',cloud]];
 const out=[];for(const [n,f] of steps){const r=await check(n,f);out.push(r);onRow&&onRow(r)}return out;
}
function report(rows){
 const ver=(typeof APP_VERSION!=='undefined'?APP_VERSION:'?');
 return 'تقرير فحص نيبور — '+ver+' — '+new Date().toLocaleString('ar-IQ')+'\n'+rows.map(r=>(r.ok?(r.warn?'⚠':'✓'):'✗')+' '+r.name+': '+r.msg).join('\n')+'\nالمتصفح: '+navigator.userAgent;
}
function mount(){
 if(typeof page==='undefined'||page!=='schoolSettings')return;
 const ws=document.getElementById('workspace');if(!ws||document.getElementById('selfCheckBox'))return;
 const s=document.createElement('section');s.id='selfCheckBox';s.className='backup-protection glass-surface';
 s.innerHTML='<h3>🩺 فحص سلامة التطبيق</h3><p>يتحقق من اكتمال الملفات المرفوعة والتخزين ومحرك التوليد والخطوط والعمل بلا إنترنت، ويجرّب توليد جدول تجريبي صغير. لا يغيّر بياناتك. شغّله بعد كل تحديث، وأرسل التقرير عند حدوث مشكلة.</p><div class="actions"><button type="button" id="scRun">تشغيل الفحص</button><button type="button" id="scCopy" class="secondary" hidden>نسخ التقرير</button></div><div id="scOut" aria-live="polite"></div>';
 ws.appendChild(s);
 let rows=[];
 s.querySelector('#scRun').onclick=async e=>{const b=e.currentTarget;b.disabled=true;b.textContent='جارٍ الفحص…';const out=s.querySelector('#scOut');out.innerHTML='';rows=[];
  const all=await runAll(r=>{rows.push(r);out.insertAdjacentHTML('beforeend','<div class="notice '+(r.ok?(r.warn?'warning':''):'error')+'"><b>'+(r.ok?(r.warn?'⚠':'✓'):'✗')+' '+esc(r.name)+'</b> — '+esc(r.msg)+'</div>')});
  const bad=all.filter(r=>!r.ok).length,warn=all.filter(r=>r.ok&&r.warn).length;
  out.insertAdjacentHTML('afterbegin','<div class="notice '+(bad?'error':warn?'warning':'')+'"><b>'+(bad?'✗ '+bad+' مشكلة تحتاج معالجة':warn?'⚠ سليم مع '+warn+' تنبيه':'✓ كل الفحوص سليمة')+'</b></div>');
  window.__MASAR_SELFCHECK=all;b.disabled=false;b.textContent='إعادة الفحص';const c=s.querySelector('#scCopy');c.hidden=false;
  c.onclick=async()=>{const t=report(all);try{await navigator.clipboard.writeText(t);alert('نُسخ التقرير.')}catch(e){masarPrompt('انسخ التقرير:',t)}}};
}
function boot(){
 const o=window.schoolSettings;if(typeof o!=='function'||o.__scWrapped)return;
 const w=function(){const r=o.apply(this,arguments);try{mount()}catch(e){console.error(e)}return r};w.__scWrapped=true;window.schoolSettings=w;
}
window.MASAR_SELFCHECK={run:runAll,report};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();

'use strict';
/* مسار — صلاحيات الواجهة بحسب دور الحساب السحابي.
   تنبيه: هذه طبقة تجربة مستخدم. منع الكتابة الفعلي يتم في الخادم (Supabase RPC + RLS). */
(function(){
const ALLOWED_TEACHER=['school','liveBoard','workspaceTT'];
const EDIT_BTN=/تعديل متعدد|تراجع|المشكلات|إعادة توزيع|سجل|تشخيص|أخطاء|تحذيرات/;
let lastKey='';
function info(){
 let st=null;try{st=window.MASAR_SYNC&&MASAR_SYNC.state().sync}catch(e){}
 const role=st&&st.school?(st.role||''):'';
 return {role,teacherRef:(st&&st.teacherRef)||'',readOnly:role==='teacher'};
}
window.MASAR_ACCESS={get:info,can:a=>{const i=info();if(!i.role)return true;if(i.role==='teacher')return ['view','print'].includes(a);if(i.role==='deputy')return a!=='members';return true}};
function mine(){
 const i=info();if(!i.readOnly||!i.teacherRef||typeof db==='undefined')return false;
 if(!(db.teachers||[]).some(t=>t.id===i.teacherRef))return false;
 window.ttPreferred={mode:'teacher',id:i.teacherRef};try{page='workspaceTT'}catch(e){}
 return true;
}
window.MASAR_MY_TIMETABLE=mine;
function apply(){
 const i=info();document.body.classList.toggle('role-ro',i.readOnly);document.body.dataset.role=i.role||'local';
 const mn=document.querySelector('#mobileNav [data-mn=teachers],#mobileNav [data-mn=__mine]');
 if(mn){if(i.readOnly){mn.dataset.mn='__mine';mn.querySelector('.mn-t').textContent='جدولي';mn.querySelector('.mn-i').textContent='◉'}else if(mn.dataset.mn==='__mine'){mn.dataset.mn='teachers';mn.querySelector('.mn-t').textContent='المدرسون';mn.querySelector('.mn-i').textContent='♙'}}
 if(!i.readOnly)return;
 /* القائمة الجانبية والخطوات والإجراءات السريعة */
 document.querySelectorAll('[data-side-page]').forEach(b=>{if(!ALLOWED_TEACHER.includes(b.dataset.sidePage))b.remove()});
 document.querySelectorAll('.side-group').forEach(g=>{if(!g.querySelector('[data-side-page]'))g.remove()});
 document.querySelectorAll('#steps [data-p]').forEach(b=>{if(!ALLOWED_TEACHER.includes(b.dataset.p))b.remove()});
 document.querySelectorAll('[data-home-page]').forEach(b=>{if(!ALLOWED_TEACHER.includes(b.dataset.homePage))b.remove()});
 /* أزرار التعديل في مساحة العمل */
 document.querySelectorAll('#workspace .workspace-toolbar button').forEach(b=>{if(EDIT_BTN.test(b.textContent)||b.id==='ttProblems')b.style.display='none'});
 document.querySelectorAll('#workspace .notice').forEach(n=>{if(/التعديل اليدوي/.test(n.textContent))n.innerHTML='<b>عرض فقط:</b> حسابك بدور «مدرس»، يمكنك مشاهدة الجداول وطباعتها، ولا يمكن تعديلها.'});
 /* الصفحة الحالية غير مسموحة؟ */
 let cur;try{cur=page}catch(e){}
 if(cur&&!ALLOWED_TEACHER.includes(cur)&&!apply.busy){apply.busy=true;try{page='school';render()}finally{apply.busy=false}}
}
function boot(){
 apply();
 const o=window.render;
 if(typeof o==='function'&&!o.__accessWrapped){
  const w=function(){const i=info();
   if(i.readOnly){let cur;try{cur=page}catch(e){}
    if(cur&&!ALLOWED_TEACHER.includes(cur))try{page='school'}catch(e){}
    if(cur==='workspaceTT'&&!window.__roMine&&i.teacherRef){window.__roMine=true;mine()}}
   const r=o.apply(this,arguments);try{apply()}catch(e){console.error(e)}return r};
  w.__accessWrapped=true;window.render=w}
 window.addEventListener('masar-sync-state',()=>{const i=info(),k=i.role+'|'+i.teacherRef;if(k===lastKey)return;lastKey=k;window.__roMine=false;try{render()}catch(e){}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();

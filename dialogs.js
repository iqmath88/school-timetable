'use strict';
/* مسار — نوافذ داخل التطبيق بدل alert/confirm/prompt الأصلية.
   - masarConfirm(msg) و masarPrompt(msg,default): تُعيدان Promise (استخدمهما مع await).
   - alert(msg): أُعيد تعريفها كإشعار غير حاجب (لا تُوقف الصفحة ولا تتطلب ضغطاً).
   - للاختبارات الآلية فقط: window.__MASAR_AUTO={confirm:true|false|fn,prompt:fn} تتخطى النافذة، و window.__MASAR_ALERTS تسجّل رسائل التنبيه. */
(function(){
const BAD=/خطأ|تعذر|لا يمكن|فشل|تعارض|⚠|مرفوض|غير صالح|يمنع/;
const DANGER=/حذف|مسح|استبدال|إزالة|فك الربط|إعادة ضبط|استعادة/;
let root=null,stack=null;
function css(){
 if(document.getElementById('masar-dlg-css'))return;
 const s=document.createElement('style');s.id='masar-dlg-css';
 s.textContent=`
#masar-dlg-root{position:fixed;inset:0;z-index:10050;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(11,22,51,.46);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
#masar-dlg-root.on{display:flex}
.masar-dlg{width:min(460px,100%);max-height:86vh;overflow:auto;background:linear-gradient(160deg,rgba(255,255,255,.96),rgba(238,244,253,.94));border:1px solid rgba(255,255,255,.9);border-top:4px solid #C8A24A;border-radius:18px;box-shadow:0 24px 70px rgba(10,31,77,.35);padding:18px 18px 14px;font:15px/1.7 "IBM Plex Sans Arabic",Tajawal,Tahoma,sans-serif;color:#0B1633;direction:rtl}
.masar-dlg.warn{border-top-color:#D97706}.masar-dlg.danger{border-top-color:#B3261E}
.masar-dlg h3{margin:0 0 6px;font:700 18px/1.4 "El Messiri","IBM Plex Sans Arabic",Tajawal,sans-serif;color:#0F2A75}
.masar-dlg .body{white-space:pre-wrap;overflow-wrap:anywhere;margin:0 0 12px;color:#243256}
.masar-dlg input{width:100%;min-height:44px;border:1px solid #C9D4EA;border-radius:12px;padding:8px 12px;font:inherit;background:#fff;margin:0 0 12px}
.masar-dlg .row{display:flex;gap:8px;justify-content:flex-start;flex-wrap:wrap}
.masar-dlg button{min-height:44px;min-width:96px;padding:8px 16px;border-radius:12px;font-weight:700;font-size:15px;font-family:inherit;cursor:pointer;border:0;color:#fff;background:linear-gradient(135deg,#1E3FA3,#0F2A75)}
.masar-dlg button.ghost{background:#fff;color:#0F2A75;border:1.5px solid #1E3FA3}
.masar-dlg button.red{background:linear-gradient(135deg,#C0392B,#8F1D14)}
.masar-dlg button:focus-visible{outline:3px solid #C8A24A;outline-offset:2px}
#masar-notes{position:fixed;z-index:10060;top:12px;inset-inline:12px;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none}
.masar-note{pointer-events:auto;width:min(520px,100%);display:flex;gap:10px;align-items:flex-start;background:linear-gradient(150deg,rgba(255,255,255,.96),rgba(238,244,253,.94));-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.9);border-inline-start:5px solid #1E3FA3;border-radius:14px;box-shadow:0 12px 34px rgba(10,31,77,.28);padding:10px 12px;font:14px/1.7 "IBM Plex Sans Arabic",Tajawal,Tahoma,sans-serif;color:#0B1633;direction:rtl;max-height:42vh;overflow:auto}
.masar-note.bad{border-inline-start-color:#B3261E;background:linear-gradient(150deg,#fff,#FFF1EF)}
.masar-note .t{flex:1;white-space:pre-wrap;overflow-wrap:anywhere}
.masar-note button{all:unset;cursor:pointer;min-width:32px;min-height:32px;text-align:center;line-height:32px;border-radius:10px;color:#5B6B8C;font-size:20px}
.masar-note button:focus-visible{outline:2px solid #1E3FA3}
@media(max-width:780px){#masar-notes{top:8px}}`;
 document.head.appendChild(s);
}
function ensure(){
 css();
 if(!root){root=document.createElement('div');root.id='masar-dlg-root';root.setAttribute('role','presentation');document.body.appendChild(root)}
 if(!stack){stack=document.createElement('div');stack.id='masar-notes';stack.setAttribute('aria-live','polite');document.body.appendChild(stack)}
}
let chain=Promise.resolve();
function show(opts){
 /* النوافذ تُعرض واحدة بعد الأخرى */
 const run=()=>new Promise(resolve=>{
  ensure();
  const prevFocus=document.activeElement;
  const d=document.createElement('div');d.className='masar-dlg '+(opts.kind||'');d.setAttribute('role','alertdialog');d.setAttribute('aria-modal','true');
  const h=document.createElement('h3');h.textContent=opts.title;h.id='masar-dlg-t';d.setAttribute('aria-labelledby','masar-dlg-t');
  const b=document.createElement('p');b.className='body';b.textContent=opts.message;
  d.append(h,b);
  let inp=null;
  if(opts.prompt){inp=document.createElement('input');inp.type='text';inp.value=opts.value||'';inp.setAttribute('aria-label',opts.title);d.appendChild(inp)}
  const row=document.createElement('div');row.className='row';
  const ok=document.createElement('button');ok.type='button';ok.textContent=opts.okText;ok.dataset.ok='1';if(opts.kind==='danger')ok.className='red';
  const no=document.createElement('button');no.type='button';no.className='ghost';no.textContent='إلغاء';no.dataset.cancel='1';
  row.append(ok,no);d.appendChild(row);
  root.innerHTML='';root.appendChild(d);root.classList.add('on');
  const done=v=>{root.classList.remove('on');root.innerHTML='';document.removeEventListener('keydown',key,true);try{prevFocus&&prevFocus.focus&&prevFocus.focus()}catch(e){}resolve(v)};
  const val=()=>inp?inp.value:true;
  const key=e=>{
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();done(inp?null:false)}
   else if(e.key==='Enter'&&inp&&document.activeElement===inp){e.preventDefault();done(inp.value)}
   else if(e.key==='Tab'){const f=[...d.querySelectorAll('input,button')];const i=f.indexOf(document.activeElement);e.preventDefault();f[(i+(e.shiftKey?-1:1)+f.length)%f.length].focus()}
  };
  document.addEventListener('keydown',key,true);
  ok.onclick=()=>done(val());no.onclick=()=>done(inp?null:false);
  (inp||(opts.kind==='danger'?no:ok)).focus();if(inp)inp.select();
 });
 const p=chain.then(run,run);chain=p.catch(()=>{});return p;
}
window.masarConfirm=function(message,opts){
 message=String(message==null?'':message);
 const auto=window.__MASAR_AUTO;
 if(auto&&auto.confirm!==undefined){(window.__MASAR_CONFIRMS=window.__MASAR_CONFIRMS||[]).push(message);const a=auto.confirm;return Promise.resolve(typeof a==='function'?!!a(message):!!a)}
 const warn=/⚠|تحذير/.test(message),danger=DANGER.test(message);
 return show({title:(opts&&opts.title)||(danger?'تأكيد الإجراء':warn?'تنبيه قبل المتابعة':'تأكيد'),message,kind:danger?'danger':warn?'warn':'',okText:(opts&&opts.okText)||'متابعة'});
};
window.masarPrompt=function(message,value){
 message=String(message==null?'':message);
 const auto=window.__MASAR_AUTO;
 if(auto&&typeof auto.prompt==='function'){(window.__MASAR_PROMPTS=window.__MASAR_PROMPTS||[]).push(message);return Promise.resolve(auto.prompt(message,value))}
 return show({title:'إدخال',message,prompt:true,value:value||'',okText:'حفظ'});
};
function note(message){
 message=String(message==null?'':message);
 (window.__MASAR_ALERTS=window.__MASAR_ALERTS||[]).push(message);
 if(!document.body){try{console.warn(message)}catch(e){}return}
 ensure();
 const bad=BAD.test(message);
 const n=document.createElement('div');n.className='masar-note'+(bad?' bad':'');n.setAttribute('role',bad?'alert':'status');
 const t=document.createElement('div');t.className='t';t.textContent=message;
 const x=document.createElement('button');x.type='button';x.setAttribute('aria-label','إغلاق');x.textContent='×';
 n.append(t,x);stack.appendChild(n);
 const kill=()=>{if(n.parentNode)n.remove()};x.onclick=kill;
 /* الرسائل القصيرة العادية تختفي وحدها؛ الطويلة وأخطاء المنع تبقى حتى تُغلق */
 if(message.length<=90&&!bad)setTimeout(kill,6500);
 while(stack.children.length>4)stack.firstChild.remove();
}
window.alert=note;
window.masarNote=note;
})();

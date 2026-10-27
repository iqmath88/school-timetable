'use strict';
/* مسار — سجل الأخطاء المحلي: يلتقط أخطاء الصفحة والوعود المرفوضة وأخطاء المحرك، ويحفظها على الجهاز فقط.
   لا يُرسل شيء لأي خادم؛ يصدّره المستخدم يدوياً عند طلب المساعدة. */
(function(){
const KEY='masar-errlog',MAX=60;
const ls=(()=>{try{return window.localStorage}catch(e){return null}})();
let mem=[];
function read(){try{return ls?JSON.parse(ls.getItem(KEY)||'[]'):mem}catch(e){return mem}}
function write(a){mem=a;try{ls&&ls.setItem(KEY,JSON.stringify(a))}catch(e){}}
const ver=()=>{try{return typeof APP_VERSION!=='undefined'?APP_VERSION:(document.title.match(/v[\d.]+[-\w]*/)||[''])[0]}catch(e){return ''}};
function add(kind,msg,where){
 try{const a=read();const m=String(msg||'').slice(0,400),w=String(where||'').slice(0,200);
  const last=a[a.length-1];if(last&&last.m===m&&last.k===kind){last.n=(last.n||1)+1;last.t=Date.now()}
  else a.push({t:Date.now(),k:kind,m,w,n:1,v:ver()});
  write(a.slice(-MAX))}catch(e){}}
window.addEventListener('error',e=>{if(e.target&&e.target!==window&&(e.target.src||e.target.href)){const u=e.target.src||e.target.href;try{if(new URL(u,location.href).origin!==location.origin)return}catch(_){}add('resource','تعذر تحميل ملف',u);return}add('error',e.message,(e.filename||'').split('/').pop()+':'+e.lineno+':'+e.colno)},true);
window.addEventListener('unhandledrejection',e=>{const r=e.reason;add('promise',r&&r.message||r,r&&r.stack?String(r.stack).split('\n')[1]:'')});
window.MasarLog={add,read,clear(){write([])},
 exportText(){const a=read();return JSON.stringify({app:ver(),ua:navigator.userAgent,time:new Date().toISOString(),count:a.length,log:a.map(x=>({...x,t:new Date(x.t).toISOString()}))},null,1)}};
/* لوحة السجل داخل إعدادات المدرسة */
function panel(){
 const ws=document.getElementById('workspace');if(!ws||document.getElementById('errLogPanel'))return;
 const a=read().slice().reverse();
 const H=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const d=document.createElement('div');d.id='errLogPanel';d.className='panel';
 d.innerHTML='<h3>سجل الأخطاء</h3><p class="muted">يُحفظ على جهازك فقط. عند حدوث مشكلة صدّره وأرسله لي لأعرف السبب بدقة.</p>'+
  (a.length?'<div class="notice warning">'+a.length+' سجل — آخرها: '+H(new Date(a[0].t).toLocaleString('ar-IQ'))+'</div><div style="max-height:220px;overflow:auto;font-size:13px;line-height:1.7">'+a.slice(0,20).map(x=>'<div><b>'+H(x.k)+'</b> '+(x.n>1?'×'+x.n+' ':'')+H(x.m)+' <small class="muted">'+H(x.w)+'</small></div>').join('')+'</div>':'<div class="notice">لا توجد أخطاء مسجّلة ✓</div>')+
  '<div class="actions"><button id="elExport" class="secondary">تصدير السجل</button><button id="elClear" class="secondary">مسح السجل</button></div>';
 ws.appendChild(d);
 d.querySelector('#elExport').onclick=()=>{const b=new Blob([window.MasarLog.exportText()],{type:'application/json'}),u=URL.createObjectURL(b),l=document.createElement('a');l.href=u;l.download='masar-error-log.json';document.body.appendChild(l);l.click();setTimeout(()=>{l.remove();URL.revokeObjectURL(u)},500)};
 d.querySelector('#elClear').onclick=()=>{window.MasarLog.clear();d.remove();panel()};
}
let tries=0;const t=setInterval(()=>{tries++;if(window.schoolSettings&&!window.schoolSettings.__el){const o=window.schoolSettings;const w=function(){o.apply(this,arguments);try{panel()}catch(e){add('error','errlog panel: '+e.message)}};w.__el=1;window.schoolSettings=w;clearInterval(t)}if(tries>80)clearInterval(t)},250);
})();

'use strict';
/* نيبور — معاينة الطباعة داخل التطبيق.
   عند تشغيل التطبيق مثبّتاً على الشاشة الرئيسية (iPad/iPhone/Android) كانت نوافذ الطباعة تُفتح بملء الشاشة بلا زر رجوع ولا طباعة.
   هنا نعترض window.open('') في هذه الحالة فقط، ونعرض المستند داخل طبقة فوق التطبيق بشريط فيه «إغلاق» و«طباعة».
   في المتصفح العادي يبقى السلوك القديم كما هو. */
(function(){
const standalone=()=>{try{return navigator.standalone===true||matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches}catch(e){return false}};
const active=()=>window.__MASAR_PRINTVIEW===true||(window.__MASAR_PRINTVIEW!==false&&standalone());
const baseOpen=window.open;
let cur=null;
function css(){
 if(document.getElementById('masar-pv-css'))return;
 const s=document.createElement('style');s.id='masar-pv-css';
 s.textContent=`html.pv-open,html.pv-open body{overflow:hidden!important}
#masar-pv{position:fixed;inset:0;z-index:10040;display:flex;flex-direction:column;background:#E7ECF7;direction:rtl;font:15px/1.6 "IBM Plex Sans Arabic",Tajawal,Tahoma,sans-serif}
#masar-pv .pv-bar{flex:none;display:flex;align-items:center;gap:10px;padding:calc(8px + env(safe-area-inset-top)) 12px 8px;background:linear-gradient(135deg,#0B1F5C,#1E3FA3);color:#fff;border-bottom:3px solid #C8A24A}
#masar-pv .pv-title{flex:1;min-width:0;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#masar-pv .pv-hint{display:block;font-weight:400;font-size:12px;opacity:.85;white-space:normal}
#masar-pv button{min-height:44px;min-width:88px;padding:8px 16px;border-radius:12px;border:0;font:700 15px inherit;font-family:inherit;cursor:pointer;color:#0F2A75;background:#fff}
#masar-pv button.pv-print{background:linear-gradient(135deg,#E3C46E,#C8A24A);color:#0B1633}
#masar-pv button:focus-visible{outline:3px solid #C8A24A;outline-offset:2px}
#masar-pv iframe{flex:1;width:100%;border:0;background:#fff}`;
 document.head.appendChild(s);
}
function closeView(){
 if(!cur)return;const {ov,key,win}=cur;cur=null;
 document.removeEventListener('keydown',key,true);window.removeEventListener('message',onMsg);
 ov.remove();document.documentElement.classList.remove('pv-open');win.closed=true;
}
function onMsg(e){/* الطباعة التلقائية داخل المستند تُحوَّل إلى رسالة؛ لا نطبع تلقائياً على الأجهزة اللمسية */}
function openView(title){
 if(cur)closeView();css();
 const ov=document.createElement('div');ov.id='masar-pv';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-label','معاينة الطباعة');
 ov.innerHTML='<div class="pv-bar"><button type="button" class="pv-close" aria-label="إغلاق المعاينة">✕ إغلاق</button><div class="pv-title">معاينة الطباعة<span class="pv-hint">اضغط «طباعة» ثم اختر الطابعة، أو من خيارات الطباعة احفظه PDF.</span></div><button type="button" class="pv-print">🖨 طباعة</button></div><iframe title="معاينة الطباعة"></iframe>';
 document.body.appendChild(ov);document.documentElement.classList.add('pv-open');
 const ifr=ov.querySelector('iframe');let buf='';
 const doPrint=()=>{const w=ifr.contentWindow;if(!w)return;window.__MASAR_PV_PRINTS=(window.__MASAR_PV_PRINTS||0)+1;try{w.focus();(w.__realPrint||w.print).call(w)}catch(e){try{window.print()}catch(_){}}};
 const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeView()}};
 document.addEventListener('keydown',key,true);window.addEventListener('message',onMsg);
 ov.querySelector('.pv-close').onclick=closeView;ov.querySelector('.pv-print').onclick=doPrint;
 const inject='<script>window.__realPrint=window.print.bind(window);window.print=function(){try{parent.postMessage({masarPv:"autoprint"},"*")}catch(e){}};<\/script>';
 const flush=()=>{
  let h=buf;window.__MASAR_PV_LAST=h;
  if(/<head[^>]*>/i.test(h))h=h.replace(/<head[^>]*>/i,m=>m+inject);else if(/<html[^>]*>/i.test(h))h=h.replace(/<html[^>]*>/i,m=>m+inject);else h=inject+h;
  ifr.srcdoc=h;
 };
 const doc={open(){buf='';return doc},write(){buf+=[].join.call(arguments,'')},writeln(){buf+=[].join.call(arguments,'')+'\n'},close(){flush()}};
 const win={document:doc,closed:false,focus(){},blur(){},close:closeView,print:doPrint,addEventListener(){},removeEventListener(){},location:{href:'about:blank'}};
 cur={ov,key,win};ov.querySelector('.pv-close').focus();
 return win;
}
window.open=function(url){
 if((url===''||url==null)&&active()&&document.body)return openView();
 return baseOpen.apply(this,arguments);
};
window.MASAR_PRINTVIEW={close:closeView,isOpen:()=>!!cur};
})();

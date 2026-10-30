'use strict';
/* مسار — تطبيق ويب قابل للتثبيت: تسجيل Service Worker، إشعار بتوفر إصدار جديد، ودعوة للتثبيت. */
(function(){
const ls=(()=>{try{return window.localStorage}catch(e){return null}})();
const get=k=>{try{return ls&&ls.getItem(k)}catch(e){return null}},set=(k,v)=>{try{ls&&ls.setItem(k,v)}catch(e){}};
const standalone=()=>window.matchMedia&&matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
function bar(html,id){if(document.getElementById(id))return null;const d=document.createElement('div');d.id=id;d.setAttribute('role','status');
 d.style.cssText='position:fixed;inset-inline:12px;bottom:12px;z-index:9999;background:linear-gradient(145deg,rgba(255,255,255,.88),rgba(255,255,255,.66));-webkit-backdrop-filter:blur(22px) saturate(1.6);backdrop-filter:blur(22px) saturate(1.6);color:#0B1633;border:1px solid rgba(255,255,255,.9);border-top:3px solid #C8A24A;border-radius:14px;box-shadow:0 10px 30px #0A1F4D33;padding:12px 14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;font:14px/1.6 Tajawal,Tahoma,sans-serif';
 d.innerHTML=html;document.body.appendChild(d);return d}
const btn='style="background:#1E3FA3;color:#fff;border:0;border-radius:10px;padding:8px 14px;font:inherit;cursor:pointer"',ghost='style="background:#fff;color:#0F2A75;border:1.5px solid #1E3FA3;border-radius:10px;padding:8px 14px;font:inherit;cursor:pointer"';
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')){
 window.addEventListener('load',()=>{
  navigator.serviceWorker.register('sw.js').then(reg=>{
   const ready=w=>{const d=bar('<b style="flex:1">يتوفر إصدار أحدث من نيبور.</b><button '+btn+' id="pwaReload">تحديث الآن</button><button '+ghost+' id="pwaLater">لاحقاً</button>','pwaUpdate');if(!d)return;
    d.querySelector('#pwaReload').onclick=()=>{try{w.postMessage('skip')}catch(e){}setTimeout(()=>location.reload(),300)};d.querySelector('#pwaLater').onclick=()=>d.remove()};
   if(reg.waiting&&navigator.serviceWorker.controller)ready(reg.waiting);
   reg.addEventListener('updatefound',()=>{const w=reg.installing;if(!w)return;w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)ready(w)})});
   setInterval(()=>reg.update().catch(()=>{}),3600000);
  }).catch(e=>{window.MasarLog&&MasarLog.add('pwa','تعذر تسجيل العمل دون إنترنت: '+(e&&e.message))});
 });
}
let deferred=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;if(get('masar-install-dismissed')||standalone())return;
 const d=bar('<b style="flex:1">ثبّت نيبور على جهازك ليعمل بلا إنترنت كتطبيق.</b><button '+btn+' id="pwaInstall">تثبيت</button><button '+ghost+' id="pwaNo">ليس الآن</button>','pwaInstallBar');if(!d)return;
 d.querySelector('#pwaInstall').onclick=async()=>{d.remove();try{deferred.prompt();await deferred.userChoice}catch(_){}deferred=null};
 d.querySelector('#pwaNo').onclick=()=>{set('masar-install-dismissed','1');d.remove()}});
window.addEventListener('appinstalled',()=>{const d=document.getElementById('pwaInstallBar');if(d)d.remove()});
window.addEventListener('load',()=>{const ios=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 if(ios&&!standalone()&&!get('masar-ios-tip')){setTimeout(()=>{const d=bar('<span style="flex:1">للتثبيت على iPad: اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية».</span><button '+ghost+' id="pwaIosOk">حسناً</button>','pwaIosTip');if(d)d.querySelector('#pwaIosOk').onclick=()=>{set('masar-ios-tip','1');d.remove()}},4000)}});
})();

'use strict';
/* مسار — تحسينات الهاتف: شريط تنقل سفلي، إخفاء الشريط العلوي عند النزول، طيّ الفقرات الطويلة. لا يغيّر أي بيانات. */
(function(){
const mq=window.matchMedia?matchMedia('(max-width:780px)'):{matches:false};
const ITEMS=[['school','◈','الرئيسية'],['liveBoard','◷','الدوام'],['workspaceTT','▦','الجدول'],['teachers','♙','المدرسون'],['__more','☰','المزيد']];
let bar=null;
function build(){
 if(bar)return;bar=document.createElement('nav');bar.id='mobileNav';bar.setAttribute('aria-label','التنقل السريع');
 bar.innerHTML=ITEMS.map(i=>`<button type="button" data-mn="${i[0]}"><span class="mn-i" aria-hidden="true">${i[1]}</span><span class="mn-t">${i[2]}</span></button>`).join('');
 document.body.appendChild(bar);
 bar.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const id=b.dataset.mn;
  if(id==='__more'){const t=document.getElementById('menuToggle');if(t)t.click();return}
  document.body.classList.remove('sidebar-open');const sh=document.getElementById('sidebarBackdrop');if(sh)sh.hidden=true;
  try{window.page=id}catch(_){}
  try{page=id}catch(_){}
  try{render()}catch(err){console.error(err)}
  window.scrollTo({top:0});showTop()});
}
function mark(){
 if(!bar)return;let cur;try{cur=page}catch(_){cur=window.page}
 bar.querySelectorAll('button').forEach(b=>{const on=b.dataset.mn===cur;b.classList.toggle('on',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
}
/* طيّ الفقرات الطويلة: اضغط للتوسيع */
function clamp(){
 if(!mq.matches)return;
 document.querySelectorAll('#workspace .notice:not(.error):not(.warning):not(.m-clamp), #workspace > p.muted:not(.m-clamp)').forEach(n=>{
  if((n.textContent||'').trim().length>150&&!n.querySelector('button,input,select')){n.classList.add('m-clamp');n.setAttribute('role','button');n.setAttribute('tabindex','0');
   const tg=()=>n.classList.toggle('m-open');n.addEventListener('click',tg);n.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tg()}})}
 });
}
/* الشريط العلوي: يختفي عند النزول ويعود عند الصعود */
let lastY=0,ticking=false;const top=()=>document.querySelector('.topbar');
function showTop(){const t=top();if(t)t.classList.remove('topbar-hidden');lastY=window.scrollY}
function onScroll(){
 if(ticking)return;ticking=true;requestAnimationFrame(()=>{ticking=false;
  const t=top();if(!t||!mq.matches||document.body.classList.contains('sidebar-open'))return;
  const y=window.scrollY,d=y-lastY;
  if(y<80)t.classList.remove('topbar-hidden');
  else if(d>12){t.classList.add('topbar-hidden');lastY=y}
  else if(d<-8){t.classList.remove('topbar-hidden');lastY=y}
 });
}
function init(){
 build();mark();clamp();
 window.addEventListener('scroll',onScroll,{passive:true});
 const o=window.render;
 if(typeof o==='function'&&!o.__mobileWrapped){const w=function(){const r=o.apply(this,arguments);try{mark();clamp();showTop()}catch(_){}return r};w.__mobileWrapped=true;window.render=w}
 const ws=document.getElementById('workspace');
 if(ws&&window.MutationObserver)new MutationObserver(()=>{clamp()}).observe(ws,{childList:true});
 if(mq.addEventListener)mq.addEventListener('change',()=>{if(!mq.matches)showTop();clamp()});
 render&&0;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

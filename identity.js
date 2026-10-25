/* هوية «مسار» — الشعار + إعادة ترتيب الصفحة الرئيسية (v0.9.22.0) */
(function(){
'use strict';
const MARK=(size=44)=>`<svg class="masar-mark" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="شعار مسار"><defs><linearGradient id="mmG${size}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#561228"/><stop offset="1" stop-color="#9B2C50"/></linearGradient></defs><rect x="2" y="2" width="60" height="60" rx="17" fill="url(#mmG${size})"/><g fill="none" stroke="#F6E7C8" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" opacity=".95"><path d="M16 46h10V34h10V22h12"/></g><g fill="#D7A94B"><circle cx="16" cy="46" r="4.2"/><circle cx="36" cy="34" r="4.2" fill="#F6E7C8"/><circle cx="48" cy="22" r="4.6"/></g></svg>`;
window.MASAR_MARK=MARK;
/* شعار الرأس + أيقونة التبويب */
function brand(){
  const logo=document.querySelector('.topbar .brand .logo');
  if(logo&&!logo.dataset.masar){const w=document.createElement('span');w.className='masar-logo-wrap';w.dataset.masar='1';w.innerHTML=MARK(44);logo.replaceWith(w)}
  let l=document.querySelector('link[rel=icon]');if(!l){l=document.createElement('link');l.rel='icon';document.head.appendChild(l)}
  l.type='image/svg+xml';l.href='data:image/svg+xml,'+encodeURIComponent(MARK(64).replace('class="masar-mark"','xmlns="http://www.w3.org/2000/svg"'));
}
/* الصفحة الرئيسية: شريط «اليوم» أولاً، ثم الإجراءات، ثم حالة الجدول */
const origSchool=window.school;
window.school=function(){
  origSchool();
  const root=document.querySelector('.home-dash');if(!root||root.dataset.v2)return;root.dataset.v2='1';
  const q=s=>root.querySelector(s);
  const hero=q('.home-hero'),metrics=q('.home-metrics'),prog=q('.home-progress'),audit=q('.home-audit'),head=q('.home-section-head'),actions=q('.home-actions'),note=q('.home-note');
  const sym=q('.home-hero-symbol');if(sym)sym.innerHTML=MARK(92);
  // شريط اليوم
  const S=window.MASAR_SCHOOLDAY,info=S?S.nowInfo():{},today=document.createElement('section');today.className='today-strip glass-surface';
  const t=new Date(),hm=String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0');
  const abs=(db.absences||[]).filter(a=>info.day&&a.dayId===info.day.id&&a.date===t.toISOString().slice(0,10));
  const subs=(db.substitutions||[]).filter(s=>info.day&&s.dayId===info.day.id&&s.date===t.toISOString().slice(0,10));
  const open=subs.filter(s=>!s.coverId).length;
  const now=!info.day?'اليوم عطلة':info.cur?`الحصة ${info.cur.period} جارية · تنتهي ${S.toTxt(info.cur.end)}`:info.next?`الحصة القادمة ${info.next.period} · ${S.toTxt(info.next.start)}`:'انتهى الدوام';
  today.innerHTML=`<div class="today-time"><small>${esc(info.day?info.day.name:'')}</small><b>${hm}</b></div><div class="today-main"><span class="today-label">الآن</span><strong>${esc(now)}</strong></div><div class="today-facts"><span>غياب اليوم <b>${abs.length}</b></span><span>حصص بلا بديل <b class="${open?'warn':''}">${open}</b></span></div><div class="today-actions"><button type="button" data-home-page="liveBoard">لوحة الدوام</button><button type="button" class="secondary" data-home-page="substitution">سد الشاغر</button></div>`;
  // إعادة الترتيب
  hero.after(today);
  today.after(head,actions);
  const status=document.createElement('div');status.className='status-grid';
  status.append(prog,audit);
  actions.after(document.createElement('div'));
  const hd=document.createElement('div');hd.className='home-section-head';hd.innerHTML='<div><h3>حالة الجدول</h3><p>الأرقام والتدقيق</p></div>';
  actions.nextSibling.replaceWith(hd);hd.after(metrics,status);
  if(note)root.append(note);
  today.querySelectorAll('[data-home-page]').forEach(b=>b.onclick=()=>{page=b.dataset.homePage;render();window.scrollTo({top:0,behavior:'smooth'})});
};
brand();
const origRender=window.render;
window.render=function(){origRender.apply(this,arguments);brand()};
render();
})();

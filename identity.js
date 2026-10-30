/* هوية «نيبور» — الشعار + إعادة ترتيب الصفحة الرئيسية (v0.9.22.0) */
(function(){
'use strict';
/* شعار نيبور — لوح طيني بأسافين مسمارية. مصدر واحد للشعار يُستعمل في الواجهة والأيقونات. */
function NIPPUR_MARK(size,opt){
 opt=opt||{};const uid=opt.uid||String(size||'x'),simple=(size!=null&&size<=26);
 const V=(x,y,w,h)=>`<path d="M${(x-w/2).toFixed(2)} ${y.toFixed(2)}H${(x+w/2).toFixed(2)}L${x.toFixed(2)} ${(y+h).toFixed(2)}Z"/>`;
 const H=(x,y,w,h)=>`<path d="M${(x+w/2).toFixed(2)} ${(y-h/2).toFixed(2)}V${(y+h/2).toFixed(2)}L${(x-w/2).toFixed(2)} ${y.toFixed(2)}Z"/>`;
 let g='';
 if(simple){
  [24.5,39.5].forEach(cx=>{g+=H(cx,19,11,7)});
  [[24.5,34],[39.5,34],[24.5,45],[39.5,45]].forEach(([cx,y],i)=>{g+=(i%3===0)?V(cx,y-5,7,10):H(cx,y,11,7)});
 }else{
  [22.5,32,41.5].forEach(cx=>{g+=H(cx,19.5,7.4,4.8)});
  [33.5,41.5,49.5].forEach((y,ri)=>[22.5,32,41.5].forEach((cx,ci)=>{g+=((ri+ci)%2===0)?V(cx,y-3.5,4.8,7):H(cx,y,7.4,4.8)}));
 }
 const rule=simple?'':'<path d="M18 26.3H46" stroke="#8A6A1F" stroke-opacity=".7" stroke-width="1.3" stroke-linecap="round"/>';
 const ns=opt.ns?'xmlns="http://www.w3.org/2000/svg" ':'';
 const sz=size?` width="${size}" height="${size}"`:'';
 const bg=opt.bare?'':`<rect x="2" y="2" width="60" height="60" rx="17" fill="url(#nb${uid})"/>`;
 return `<svg ${ns}class="${opt.cls===undefined?'masar-mark nippur-mark':opt.cls}"${sz} viewBox="0 0 64 64" role="img" aria-label="شعار نيبور"><defs><linearGradient id="nb${uid}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#0B1F5C"/><stop offset="1" stop-color="#2F5FD0"/></linearGradient><linearGradient id="nt${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6E9BC"/><stop offset="1" stop-color="#D2AC55"/></linearGradient></defs>${bg}<rect x="14" y="9" width="36" height="46" rx="7" fill="url(#nt${uid})"/>${simple?'':'<rect x="16.2" y="11.2" width="31.6" height="41.6" rx="5.2" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1"/>'}${rule}<g fill="#0F2A75">${g}</g></svg>`;
}
const MARK=(size=44)=>NIPPUR_MARK(size,{uid:'m'+size});
window.MASAR_MARK=MARK;
/* شعار الرأس + أيقونة التبويب */
function brand(){
  const logo=document.querySelector('.topbar .brand .logo');
  if(logo&&!logo.dataset.masar){const w=document.createElement('span');w.className='masar-logo-wrap';w.dataset.masar='1';w.innerHTML=MARK(44);logo.replaceWith(w)}
  let l=document.querySelector('link[rel=icon]');if(!l){l=document.createElement('link');l.rel='icon';document.head.appendChild(l)}
  l.type='image/svg+xml';l.href='data:image/svg+xml,'+encodeURIComponent(NIPPUR_MARK(24,{uid:'fav',ns:true,cls:''}));
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

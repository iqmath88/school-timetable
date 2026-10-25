/* مسار — الدوام اليومي: التواقيت، التنبيهات، حالة المدرس، سد الشاغر، حجم الورق (v0.9.20.0) */
(function(){
'use strict';
const H=s=>esc(s);
const WD=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const pad=n=>String(n).padStart(2,'0');
const toMin=t=>{const m=/^(\d{1,2}):(\d{2})$/.exec(String(t||''));return m?(+m[1])*60+(+m[2]):null};
const toTxt=m=>pad(Math.floor(m/60)%24)+':'+pad(m%60);
const MAXP=12;

/* ---------- نموذج البيانات ---------- */
function bell(){
  const b=db.bell=db.bell||{};
  if(!toMin(b.start))b.start='07:30';
  b.duration=Math.max(10,Math.min(120,+b.duration||40));
  b.breaks=b.breaks&&typeof b.breaks==='object'?b.breaks:{};   // {"3":20} فرصة بعد الحصة 3 بالدقائق
  b.custom=b.custom&&typeof b.custom==='object'?b.custom:{};   // {"2":{start,end}} تخصيص حصة
  b.alerts=Object.assign({start:true,end:true,lead:0,sound:true,notify:true},b.alerts||{});
  return b;
}
function bellTimes(){
  const b=bell(),out=[];let t=toMin(b.start);
  for(let p=1;p<=MAXP;p++){
    const c=b.custom[p];let s=t,e=t+b.duration;
    if(c&&toMin(c.start)!=null&&toMin(c.end)!=null&&toMin(c.end)>toMin(c.start)){s=toMin(c.start);e=toMin(c.end)}
    out.push({period:p,start:s,end:e});
    t=e+(+b.breaks[p]||0);
  }
  return out;
}
function maxPeriods(){return Math.max(1,...db.days.filter(d=>d.active).map(d=>+d.periods||0))}
function dayByDate(date){return db.days.find(d=>d.active&&d.name===WD[date.getDay()])||null}
function nowInfo(date=new Date()){
  const day=dayByDate(date),mins=date.getHours()*60+date.getMinutes();
  const times=bellTimes();let cur=null,next=null;
  if(day){
    const lim=+day.periods||0;
    for(const x of times){if(x.period>lim)break;
      if(mins>=x.start&&mins<x.end){cur=x;break}
      if(mins<x.start){next=x;break}}
  }
  return {day,mins,cur,next};
}

/* ---------- حالة المدرس: مفرّغ / متعاقد / أيام التدريس ---------- */
const STATUS={regular:'ملاك (كل أيام الدوام)',released:'مفرّغ',contract:'متعاقد'};
function tStatus(tid){db.teacherStatus=db.teacherStatus||{};return db.teacherStatus[tid]||(db.teacherStatus[tid]={type:'regular',days:[]})}
function teachesOn(tid,dayId){const s=(db.teacherStatus||{})[tid];if(!s||s.type==='regular')return true;return (s.days||[]).includes(dayId)}
// يُترجم إلى قيد عدم إتاحة حتى يلتزم المحرّك به دون تعديله
function applyStatusToRules(){
  const touched=[];
  for(const t of db.teachers){
    const s=tStatus(t.id),r=rule(t.id);
    const prev=new Set(r.statusBlocked||[]);
    const nowBlocked=[];
    for(const d of db.days.filter(x=>x.active&&x.periods>0)){
      const all=Array.from({length:d.periods},(_,i)=>i+1);
      if(s.type!=='regular'&&!(s.days||[]).includes(d.id)){
        nowBlocked.push(d.id);
        const cur=new Set((r.unavailable[d.id]||[]).map(Number));
        if(all.some(p=>!cur.has(p))){all.forEach(p=>cur.add(p));r.unavailable[d.id]=[...cur].sort((a,b)=>a-b);touched.push(t.id)}
      }else if(prev.has(d.id)){ // كان محجوباً بسبب الحالة ولم يعد
        r.unavailable[d.id]=[];touched.push(t.id);
      }
    }
    r.statusBlocked=nowBlocked;
  }
  return [...new Set(touched)];
}
function lessonsOnBlockedDays(){
  return db.timetable.filter(e=>!teachesOn(e.teacherId,e.dayId));
}

/* ---------- الصفحات ---------- */
window.masarPages=window.masarPages||{};
const css=`<style>
.sd-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin:12px 0}
.sd-now{padding:16px;border-radius:16px;background:linear-gradient(135deg,rgba(15,118,110,.14),rgba(232,162,58,.14));border:1px solid var(--line,#cfe0dd);margin:12px 0}
.sd-now b{font-size:1.5rem;display:block;margin-top:4px}
.sd-banner{position:fixed;inset-inline:12px;top:12px;z-index:9999;padding:14px 18px;border-radius:14px;background:#0F766E;color:#fff;font-weight:700;box-shadow:0 10px 30px #0004;text-align:center}
.sd-chips{display:flex;flex-wrap:wrap;gap:6px}.sd-chip{padding:6px 10px;border-radius:10px;border:1px solid var(--line,#cdd7df);background:var(--surface,#f4f7f9)}
.sd-day{display:inline-flex;align-items:center;gap:4px;margin-inline-end:10px}
.sd-tbl td,.sd-tbl th{white-space:nowrap}
</style>`;

/* 1) التواقيت */
masarPages.bellSchedule=function(){
  const b=bell(),times=bellTimes(),mp=maxPeriods();
  $('#workspace').innerHTML=css+`<h2>أوقات الحصص (التواقيت)</h2><div class="notice">تُحسب بداية ونهاية كل حصة من وقت البدء ومدة الحصة والفرص. يمكن تخصيص حصة بعينها. تعتمد عليها لوحة الدوام الحالي والتنبيهات.</div>
  <div class="grid"><div class="field"><label>بداية الحصة الأولى</label><input type="time" id="bStart" value="${b.start}"></div><div class="field"><label>مدة الحصة (دقيقة)</label><input type="number" id="bDur" min="10" max="120" value="${b.duration}"></div></div>
  <div class="tt-wrap"><table class="sd-tbl"><thead><tr><th>الحصة</th><th>فرصة بعدها (د)</th><th>تخصيص البداية</th><th>تخصيص النهاية</th><th>الوقت الناتج</th></tr></thead><tbody>${times.slice(0,mp).map(x=>`<tr><td>${x.period}</td><td><input type="number" min="0" max="90" data-brk="${x.period}" value="${+b.breaks[x.period]||0}" style="width:80px"></td><td><input type="time" data-cs="${x.period}" value="${b.custom[x.period]?.start||''}"></td><td><input type="time" data-ce="${x.period}" value="${b.custom[x.period]?.end||''}"></td><td><b>${toTxt(x.start)} – ${toTxt(x.end)}</b></td></tr>`).join('')}</tbody></table></div>
  <h3>التنبيهات</h3><div class="notice warning">التنبيه يعمل <b>ما دام التطبيق مفتوحاً</b> في المتصفح (لا يعمل والصفحة مغلقة أو الجهاز نائم). على الآيباد/الأندرويد يلزم ضغطة واحدة على «تفعيل التنبيهات» لتسمح الجهة بالصوت والإشعار.</div>
  <div class="grid"><label class="sd-day"><input type="checkbox" id="aStart" ${b.alerts.start?'checked':''}> تنبيه عند بدء الحصة</label><label class="sd-day"><input type="checkbox" id="aEnd" ${b.alerts.end?'checked':''}> تنبيه عند انتهاء الحصة</label><label class="sd-day"><input type="checkbox" id="aSound" ${b.alerts.sound?'checked':''}> صوت</label><label class="sd-day"><input type="checkbox" id="aNotify" ${b.alerts.notify?'checked':''}> إشعار المتصفح</label><div class="field"><label>التنبيه قبل بالدقائق</label><input type="number" id="aLead" min="0" max="10" value="${b.alerts.lead}"></div></div>
  <div class="actions"><button id="bSave">حفظ التواقيت</button><button class="secondary" id="aEnable">تفعيل التنبيهات / تجربة</button><button class="secondary" id="bPrint">طباعة جدول التواقيت</button></div>`;
  $('#bSave').onclick=()=>{
    const nb=bell();nb.start=$('#bStart').value||'07:30';nb.duration=+$('#bDur').value||40;nb.breaks={};nb.custom={};
    document.querySelectorAll('[data-brk]').forEach(i=>{if(+i.value>0)nb.breaks[i.dataset.brk]=+i.value});
    document.querySelectorAll('[data-cs]').forEach(i=>{const p=i.dataset.cs,e=document.querySelector(`[data-ce="${p}"]`).value;if(i.value&&e&&toMin(e)>toMin(i.value))nb.custom[p]={start:i.value,end:e}});
    nb.alerts={start:$('#aStart').checked,end:$('#aEnd').checked,sound:$('#aSound').checked,notify:$('#aNotify').checked,lead:Math.max(0,+$('#aLead').value||0)};
    if(save()){scheduleAlerts();masarPages.bellSchedule()}
  };
  $('#aEnable').onclick=async()=>{try{if('Notification' in window&&Notification.permission==='default')await Notification.requestPermission()}catch(e){}beep();showBanner('تجربة التنبيه — تعمل والصفحة مفتوحة');};
  $('#bPrint').onclick=printBell;
};
function printBell(){
  const times=bellTimes().slice(0,maxPeriods());
  const rows=times.map(x=>`<tr><td>${x.period}</td><td>${toTxt(x.start)}</td><td>${toTxt(x.end)}</td><td>${x.end-x.start} د</td></tr>`).join('');
  const logo=db.printSettings?.logo?`<img src="${db.printSettings.logo}" style="height:22mm">`:'';
  openPrint(`<div style="text-align:center">${logo}<h1>${H(db.school.name||'المدرسة')}</h1><h2>جدول توقيت الحصص</h2><p>${H(db.school.year||'')}</p></div><table class="bt"><thead><tr><th>الحصة</th><th>البداية</th><th>النهاية</th><th>المدة</th></tr></thead><tbody>${rows}</tbody></table>`,
   `.bt{width:70%;margin:10mm auto;border-collapse:collapse;font-size:16pt}.bt th{background:#102C50;color:#fff}.bt th,.bt td{border:1px solid #444;padding:6px;text-align:center}`,'portrait');
}

/* مساعد للطباعة بحجم الورق المختار */
function paper(){return (db.printSettings&&db.printSettings.paper)==='A3'?'A3':'A4'}
function openPrint(body,extraCss,orient='landscape'){
  const w=window.open('','_blank');if(!w){alert('يرجى السماح بفتح نافذة الطباعة.');return}
  const p=paper();
  w.document.write(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>مسار</title><style>@page{size:${p} ${orient};margin:8mm}body{font-family:Tahoma,Arial,sans-serif;color:#142c46;direction:rtl}h1,h2{margin:4px 0}table{border-collapse:collapse}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}${extraCss||''}</style>${body}<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></html>`);
  w.document.close();
}

/* 2) لوحة الدوام الحالي (حسب الساعة) */
const origLive=window.liveBoard;
window.liveBoard=function(){
  window.liveBoardAuto=window.liveBoardAuto!==false;
  const info=nowInfo();
  if(window.liveBoardAuto&&info.day&&(info.cur||info.next)){window.liveBoardSelection={dayId:info.day.id,period:(info.cur||info.next).period}}
  origLive();
  const host=$('#workspace');if(!host||!db.timetable.length)return;
  const notice=host.querySelector('.notice');
  const t=new Date(),cur=info.cur;
  const msg=!info.day?'اليوم ليس يوم دوام حسب إعدادات الأيام.':cur?`الآن: <b>الحصة ${cur.period}</b> (${toTxt(cur.start)} – ${toTxt(cur.end)}) — متبقٍ ${cur.end-info.mins} دقيقة`:info.next?`الآن استراحة/قبل الدوام — القادمة: <b>الحصة ${info.next.period}</b> الساعة ${toTxt(info.next.start)}`:'انتهى الدوام لهذا اليوم — تعرض اللوحة الحصة الأولى كمعاينة فقط.';
  const box=document.createElement('div');box.className='sd-now';
  box.innerHTML=css+`${pad(t.getHours())}:${pad(t.getMinutes())} — ${H(WD[t.getDay()])}<b>${msg}</b><div class="actions" style="margin-top:10px"><label class="sd-day"><input type="checkbox" id="liveAuto" ${window.liveBoardAuto?'checked':''}> متابعة الحصة تلقائياً حسب الساعة</label><button class="secondary" id="liveBell">ضبط التواقيت</button></div>`;
  (notice||host.firstChild).before(box);
  if(notice)notice.innerHTML='الفترة المعروضة: '+notice.querySelector('strong').outerHTML+(window.liveBoardAuto?' (تلقائي حسب الساعة)':' (اختيار يدوي)');
  box.querySelector('#liveAuto').onchange=e=>{window.liveBoardAuto=e.target.checked;liveBoard()};
  box.querySelector('#liveBell').onclick=()=>{page='bellSchedule';render()};
  // إذا غيّر المستخدم اليوم/الحصة يدوياً أوقف التلقائي
  ['#liveDay','#livePeriod'].forEach(s=>{const el=host.querySelector(s);if(el){const old=el.onchange;el.onchange=ev=>{window.liveBoardAuto=false;old&&old.call(el,ev)}}});
  // استبعاد من لا يدرّس هذا اليوم (مفرّغ/متعاقد) من قائمة الشاغرين
  const sel=window.liveBoardSelection;if(sel){
    host.querySelectorAll('.live-chip').forEach(ch=>{
      const t0=db.teachers.find(x=>ch.firstChild&&x.name===ch.firstChild.textContent);
      if(t0&&!teachesOn(t0.id,sel.dayId)&&ch.querySelector('small')?.textContent.includes('متاح حسب الجدول')){ch.style.opacity='.45';ch.querySelector('small').textContent='لا يدرّس في هذا اليوم ('+STATUS[tStatus(t0.id).type]+')'}
    });
  }
};
// تحديث تلقائي للعرض كل دقيقة أثناء فتح الصفحة
setInterval(()=>{if(page==='liveBoard'&&window.liveBoardAuto!==false&&document.visibilityState==='visible'){const a=document.activeElement;if(a&&/SELECT|INPUT/.test(a.tagName))return;liveBoard()}},60000);

/* 3) حالة المدرس */
function fullBlockedDays(tid){
  const r=db.teacherRules?.[tid];if(!r)return [];
  return db.days.filter(d=>d.active&&d.periods>0&&Array.from({length:d.periods},(_,i)=>i+1).every(p=>(r.unavailable?.[d.id]||[]).map(Number).includes(p))).map(d=>d.id);
}
function dayText(list,all){return list.length===all.length&&all.length?'كل الأيام':list.map(d=>d.name).join('، ')}
function staffRows(){
  const days=db.days.filter(d=>d.active&&d.periods>0);
  return db.teachers.map(t=>{const st=tStatus(t.id);
    const blocked=fullBlockedDays(t.id);
    const teach=st.type==='regular'?days.filter(d=>!blocked.includes(d.id)):days.filter(d=>st.days.includes(d.id));
    const off=days.filter(d=>!teach.some(x=>x.id===d.id));
    const loads=db.timetable.filter(e=>e.teacherId===t.id).length||db.assignments.filter(a=>a.teacherId===t.id).reduce((n,a)=>n+(+a.weeklyPeriods||0),0);
    return {name:t.name,spec:t.specialty||'',status:STATUS[st.type].replace(' (كل أيام الدوام)',''),teach:dayText(teach,days),off:off.map(d=>d.name).join('، ')||'—',load:loads};
  });
}
function printStaff(){
  const rows=staffRows().map((r,i)=>`<tr><td class="n">${i+1}</td><td class="nm">${H(r.name)}</td><td>${H(r.spec)}</td><td><span class="st st-${r.status==='ملاك'?'a':r.status==='مفرّغ'?'b':'c'}">${H(r.status)}</span></td><td class="dy">${H(r.teach)}</td><td class="off">${H(r.off)}</td><td class="n">${r.load}</td></tr>`).join('');
  const logo=db.printSettings?.logo?`<img src="${db.printSettings.logo}" style="height:18mm">`:'';
  openPrint(`<div class="hd">${logo}<div><h1>${H(db.school.name||'المدرسة')}</h1><h2>كشف الكادر التدريسي وحالة الدوام</h2></div><span class="yr">${H(db.school.year||'')}</span></div><table class="bt"><colgroup><col style="width:5%"><col style="width:19%"><col style="width:12%"><col style="width:9%"><col style="width:31%"><col style="width:13%"><col style="width:11%"></colgroup><thead><tr class="sp"><td colspan="7"></td></tr><tr><th>ت</th><th>الاسم</th><th>التخصص</th><th>الحالة</th><th>أيام التدريس</th><th>يوم التفرغ</th><th>الحصص</th></tr></thead><tbody>${rows}</tbody></table>`,
   `*{-webkit-print-color-adjust:exact;print-color-adjust:exact}.hd{display:flex;align-items:center;gap:14px;border-bottom:2px solid #7B1E3A;padding-bottom:6px;margin-bottom:8px}.hd h1{font-size:17pt;color:#561228}.hd h2{font-size:12pt;font-weight:600;color:#444}.yr{margin-inline-start:auto;font-size:11pt;color:#555}
.bt{width:93%;margin:0 auto;table-layout:fixed;font-size:10pt}html,body{margin:0;padding:0;width:100%}body{padding:0 2mm;box-sizing:border-box}.bt thead{display:table-header-group}.bt tr.sp td{border:0!important;height:9mm;padding:0;background:#fff!important}.bt tr{break-inside:avoid;page-break-inside:avoid}
.bt th{background:#561228;color:#fff;padding:6px 2px;border:1px solid #561228;font-size:10pt;white-space:nowrap}.bt td{border:1px solid #cfc3b8;padding:4px 6px;text-align:center;vertical-align:middle;height:8.2mm}
.bt tbody tr:nth-child(even) td{background:#f7f1ea}.bt td.nm{text-align:right;font-weight:600}.bt td.dy{font-size:9pt;white-space:nowrap}.bt td.off{font-weight:700;color:#561228}.bt td.n{width:1%}
.st{display:inline-block;padding:1px 8px;border-radius:9px;font-size:9.5pt;font-weight:700}.st-a{background:#e5efe8;color:#245a3f}.st-b{background:#f4e3e8;color:#7B1E3A}.st-c{background:#f6ead2;color:#7a5410}
@page{margin:10mm 10mm 12mm}`,'landscape');
}
function csvStaff(){
  const q=v=>'"'+String(v).replace(/"/g,'""')+'"';
  const txt='\ufeff'+[['الاسم','التخصص','الحالة','أيام التدريس','يوم التفرغ','الحصص'].map(q).join(',')].concat(staffRows().map(r=>[r.name,r.spec,r.status,r.teach,r.off,r.load].map(q).join(','))).join('\r\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'text/csv;charset=utf-8'}));a.download='masar-staff-status.csv';document.body.appendChild(a);a.click();a.remove();
}
masarPages.teacherStatus=function(){
  const days=db.days.filter(d=>d.active&&d.periods>0);
  $('#workspace').innerHTML=css+`<h2>حالة المدرسين (مفرّغ / متعاقد)</h2><div class="notice">حدّد أيام تدريس المفرّغ أو المتعاقد. تُحجب بقية الأيام تلقائياً في التوليد، وتُستبعد من قوائم الشاغرين وسد الشاغر.</div>
  <div class="tt-wrap"><table class="sd-tbl"><thead><tr><th>المدرس</th><th>الحالة</th><th>أيام التدريس</th></tr></thead><tbody>${db.teachers.map(t=>{const s=tStatus(t.id);return `<tr><td>${H(t.name)}</td><td><select data-ts="${t.id}">${Object.entries(STATUS).map(([k,v])=>`<option value="${k}" ${s.type===k?'selected':''}>${v}</option>`).join('')}</select></td><td>${(()=>{const fb=fullBlockedDays(t.id).filter(x=>!(rule(t.id).statusBlocked||[]).includes(x));return s.type==='regular'&&fb.length?`<div class="muted">في القيود: محجوب كل اليوم في ${fb.map(x=>H(db.days.find(d=>d.id===x).name)).join('، ')}</div>`:''})()}${days.map(d=>`<label class="sd-day"><input type="checkbox" data-td="${t.id}|${d.id}" ${s.days.includes(d.id)?'checked':''} ${s.type==='regular'?'disabled':''}> ${H(d.name)}</label>`).join('')}</td></tr>`}).join('')||'<tr><td colspan="3" class="empty">لا يوجد مدرسون</td></tr>'}</tbody></table></div>
  <div class="actions"><button class="secondary" id="tsImport">استيراد الأيام من القيود الحالية</button><button id="tsSave">حفظ وتطبيق على القيود</button><button class="secondary" id="tsPrint">طباعة كشف الكادر</button><button class="secondary" id="tsCsv">تصدير Excel (CSV)</button></div><div id="tsMsg"></div>`;
  document.querySelectorAll('[data-ts]').forEach(sel=>sel.onchange=()=>{document.querySelectorAll(`[data-td^="${sel.dataset.ts}|"]`).forEach(c=>c.disabled=sel.value==='regular')});
  $('#tsPrint').onclick=printStaff;$('#tsCsv').onclick=csvStaff;
  $('#tsImport').onclick=()=>{
    let n=0;
    for(const t of db.teachers){
      const fb=fullBlockedDays(t.id);if(!fb.length)continue;
      const sel=document.querySelector(`[data-ts="${t.id}"]`);if(sel.value!=='regular')continue;
      sel.value='released';n++;
      document.querySelectorAll(`[data-td^="${t.id}|"]`).forEach(c=>{c.disabled=false;c.checked=!fb.includes(c.dataset.td.split('|')[1])});
    }
    $('#tsMsg').innerHTML=`<div class="notice">حُدّد ${n} مدرس (الحالة «مفرّغ» مبدئياً — غيّرها إلى متعاقد عند الحاجة) من أيام الحجب الكامل في القيود. راجع ثم اضغط «حفظ».</div>`;
  };
  $('#tsSave').onclick=()=>{
    const snap=structuredClone({s:db.teacherStatus||{},r:db.teacherRules});
    document.querySelectorAll('[data-ts]').forEach(sel=>{const s=tStatus(sel.dataset.ts);s.type=sel.value;s.days=[...document.querySelectorAll(`[data-td^="${sel.dataset.ts}|"]`)].filter(c=>c.checked).map(c=>c.dataset.td.split('|')[1])});
    const bad=lessonsOnBlockedDays();
    if(bad.length){
      const names=[...new Set(bad.map(e=>db.teachers.find(t=>t.id===e.teacherId)?.name))].join('، ');
      if(!invalidateTimetable('تغيير حالة المدرسين: '+names)){db.teacherStatus=snap.s;db.teacherRules=snap.r;return}
    }
    const touched=applyStatusToRules();
    if(save())$('#tsMsg').innerHTML=`<div class="notice">تم الحفظ. عُدّلت قيود ${touched.length} مدرس.${bad.length?' أعد توليد الجدول.':''}</div>`;
  };
};

/* 4) سد الشاغر */
function absentOn(dayId,date){return new Set((db.absences||[]).filter(a=>a.dayId===dayId&&(!date||a.date===date)).map(a=>a.teacherId))}
function coverCount(tid){return (db.substitutions||[]).filter(s=>s.coverId===tid).length}
function subjectOf(e){return db.subjects.find(s=>s.id===e.subjectId)}
function candidatesFor(lesson,absent,taken){
  const {dayId,period}=lesson;
  const busy=new Set(db.timetable.filter(e=>e.dayId===dayId&&+e.period===+period).map(e=>e.teacherId));
  const absTeacher=db.teachers.find(t=>t.id===lesson.teacherId);
  const rows=[];
  for(const t of db.teachers){
    if(absent.has(t.id)||busy.has(t.id)||taken.has(t.id+'|'+dayId+'|'+period))continue;
    if(!teachesOn(t.id,dayId))continue;
    if((db.teacherRules?.[t.id]?.unavailable?.[dayId]||[]).map(Number).includes(+period))continue;
    const sameSpec=absTeacher&&t.specialty&&absTeacher.specialty&&t.specialty===absTeacher.specialty;
    const daySubs=(db.substitutions||[]).filter(s=>s.coverId===t.id&&s.dayId===dayId).length+[...taken].filter(k=>k.startsWith(t.id+'|'+dayId+'|')).length;
    const dayLoad=db.timetable.filter(e=>e.teacherId===t.id&&e.dayId===dayId).length;
    rows.push({t,score:coverCount(t.id)*10+daySubs*6+(dayLoad>=5?3:0)-(sameSpec?4:0),sameSpec});
  }
  return rows.sort((a,b)=>a.score-b.score||String(a.t.name).localeCompare(String(b.t.name),'ar'));
}
function secLabel(id){const s=db.sections.find(x=>x.id===id),g=db.stages.find(x=>x.id===s?.stageId);return `${g?.name||''} ${s?.name||''}`.trim()}
masarPages.substitution=function(){
  db.absences=db.absences||[];db.substitutions=db.substitutions||[];
  const days=db.days.filter(d=>d.active&&d.periods>0);
  const today=new Date(),td=dayByDate(today);
  const sel=window.subSel=window.subSel||{dayId:td?.id||days[0]?.id,date:today.toISOString().slice(0,10)};
  const absent=db.absences.filter(a=>a.dayId===sel.dayId&&a.date===sel.date);
  const subs=db.substitutions.filter(s=>s.dayId===sel.dayId&&s.date===sel.date).sort((a,b)=>a.period-b.period);
  const times=bellTimes();
  $('#workspace').innerHTML=css+`<h2>سد الشاغر (الاحتياط)</h2><div class="notice">سجّل غياب المدرس، فيقترح التطبيق بديلاً لكل حصة من المدرسين الفارغين في تلك الحصة (غير غائب، لا تعارض، يدرّس في هذا اليوم)، مع توزيع عادل: الأقل احتياطاً أولاً.</div>
  ${db.timetable.length?'':'<div class="notice warning">لا يوجد جدول مولّد.</div>'}
  <div class="grid"><div class="field"><label>التاريخ</label><input type="date" id="sbDate" value="${sel.date}"></div><div class="field"><label>اليوم</label><select id="sbDay">${days.map(d=>`<option value="${d.id}" ${d.id===sel.dayId?'selected':''}>${H(d.name)}</option>`).join('')}</select></div><div class="field"><label>المدرس الغائب</label><select id="sbTeacher">${db.teachers.map(t=>`<option value="${t.id}">${H(t.name)}</option>`).join('')}</select></div></div>
  <div class="actions"><button id="sbAdd">تسجيل غياب</button><button class="secondary" id="sbAuto">اقتراح البدلاء تلقائياً</button><button class="secondary" id="sbPrint">طباعة جدول سد الشاغر</button><button class="danger" id="sbClear">مسح اليوم</button></div>
  <p>الغائبون: <span class="sd-chips">${absent.map(a=>`<span class="sd-chip">${H(db.teachers.find(t=>t.id===a.teacherId)?.name||'؟')} <button class="secondary" data-rm="${a.id}">✕</button></span>`).join('')||'لا أحد'}</span></p>
  <div class="tt-wrap"><table class="sd-tbl"><thead><tr><th>الحصة</th><th>الوقت</th><th>الشعبة</th><th>المادة</th><th>الغائب</th><th>البديل</th></tr></thead><tbody>${subs.map(s=>{const e=db.timetable.find(x=>x.id===s.lessonId)||{};const tm=times[s.period-1];
   const abs=new Set(absent.map(a=>a.teacherId));
   const opts=candidatesFor({dayId:s.dayId,period:s.period,teacherId:s.absentId},abs,new Set(subs.filter(x=>x.id!==s.id).map(x=>x.coverId+'|'+x.dayId+'|'+x.period)));
   return `<tr><td>${s.period}</td><td>${tm?toTxt(tm.start)+'–'+toTxt(tm.end):''}</td><td>${H(secLabel(s.sectionId))}</td><td>${H(subjectOf(e)?.name||'')}</td><td>${H(db.teachers.find(t=>t.id===s.absentId)?.name||'')}</td><td><select data-cv="${s.id}"><option value="">— بلا بديل —</option>${opts.map(o=>`<option value="${o.t.id}" ${o.t.id===s.coverId?'selected':''}>${H(o.t.name)}${o.sameSpec?' ★':''} (${coverCount(o.t.id)})</option>`).join('')}${s.coverId&&!opts.some(o=>o.t.id===s.coverId)?`<option value="${s.coverId}" selected>${H(db.teachers.find(t=>t.id===s.coverId)?.name||'')}</option>`:''}</select></td></tr>`}).join('')||'<tr><td colspan="6" class="empty">لا توجد حصص مغطاة بعد. سجّل غياباً ثم اضغط «اقتراح البدلاء».</td></tr>'}</tbody></table></div>
  <p class="muted">★ نفس التخصص. الرقم بين قوسين = عدد حصص الاحتياط المسجلة سابقاً للمدرس.</p>`;
  $('#sbDate').onchange=e=>{sel.date=e.target.value;const d=new Date(e.target.value+'T12:00:00'),dd=dayByDate(d);if(dd)sel.dayId=dd.id;masarPages.substitution()};
  $('#sbDay').onchange=e=>{sel.dayId=e.target.value;masarPages.substitution()};
  $('#sbAdd').onclick=()=>{const tid=$('#sbTeacher').value;if(!tid||db.absences.some(a=>a.teacherId===tid&&a.dayId===sel.dayId&&a.date===sel.date))return;db.absences.push({id:'ab'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),teacherId:tid,dayId:sel.dayId,date:sel.date});if(save())autoCover(sel)};
  document.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{const a=db.absences.find(x=>x.id===b.dataset.rm);db.absences=db.absences.filter(x=>x.id!==b.dataset.rm);db.substitutions=db.substitutions.filter(s=>!(s.absentId===a.teacherId&&s.dayId===sel.dayId&&s.date===sel.date));save();masarPages.substitution()});
  $('#sbAuto').onclick=()=>autoCover(sel);
  $('#sbClear').onclick=()=>{db.absences=db.absences.filter(a=>!(a.dayId===sel.dayId&&a.date===sel.date));db.substitutions=db.substitutions.filter(s=>!(s.dayId===sel.dayId&&s.date===sel.date));save();masarPages.substitution()};
  document.querySelectorAll('[data-cv]').forEach(s=>s.onchange=()=>{const x=db.substitutions.find(q=>q.id===s.dataset.cv);x.coverId=s.value;save();masarPages.substitution()});
  $('#sbPrint').onclick=()=>printSubstitution(sel);
};
function autoCover(sel){
  const abs=absentOn(sel.dayId,sel.date);
  // احتفظ بالتعيينات اليدوية، أعد حساب غير المعيّنة
  const keep=db.substitutions.filter(s=>s.dayId===sel.dayId&&s.date===sel.date&&s.coverId);
  db.substitutions=db.substitutions.filter(s=>!(s.dayId===sel.dayId&&s.date===sel.date)||s.coverId);
  const taken=new Set(keep.map(s=>s.coverId+'|'+s.dayId+'|'+s.period));
  const lessons=db.timetable.filter(e=>e.dayId===sel.dayId&&abs.has(e.teacherId)).sort((a,b)=>a.period-b.period);
  for(const e of lessons){
    if(db.substitutions.some(s=>s.lessonId===e.id&&s.date===sel.date))continue;
    const c=candidatesFor(e,abs,taken)[0];
    const rec={id:'sb'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),date:sel.date,dayId:sel.dayId,period:+e.period,lessonId:e.id,sectionId:e.sectionId,absentId:e.teacherId,coverId:c?c.t.id:''};
    if(c)taken.add(c.t.id+'|'+sel.dayId+'|'+e.period);
    db.substitutions.push(rec);
  }
  save();masarPages.substitution();
}
function printSubstitution(sel){
  const subs=db.substitutions.filter(s=>s.dayId===sel.dayId&&s.date===sel.date).sort((a,b)=>a.period-b.period||0);
  const times=bellTimes();const day=db.days.find(d=>d.id===sel.dayId);
  const rows=subs.map(s=>{const e=db.timetable.find(x=>x.id===s.lessonId)||{},tm=times[s.period-1];return `<tr><td>${s.period}</td><td>${tm?toTxt(tm.start)+' – '+toTxt(tm.end):''}</td><td>${H(secLabel(s.sectionId))}</td><td>${H(subjectOf(e)?.name||'')}</td><td>${H(db.teachers.find(t=>t.id===s.absentId)?.name||'')}</td><td><b>${H(db.teachers.find(t=>t.id===s.coverId)?.name||'—')}</b></td><td></td></tr>`}).join('');
  const logo=db.printSettings?.logo?`<img src="${db.printSettings.logo}" style="height:20mm">`:'';
  openPrint(`<div style="text-align:center">${logo}<h1>${H(db.school.name||'المدرسة')}</h1><h2>جدول سد الشاغر — ${H(day?.name||'')} ${H(sel.date)}</h2></div><table class="bt"><thead><tr><th>الحصة</th><th>الوقت</th><th>الشعبة</th><th>المادة</th><th>المدرس الغائب</th><th>المدرس البديل</th><th>التوقيع</th></tr></thead><tbody>${rows||'<tr><td colspan="7">لا توجد حصص</td></tr>'}</tbody></table><p style="margin-top:14mm">مدير المدرسة: ____________</p>`,
   `.bt{width:100%;margin:6mm 0;font-size:13pt}.bt th{background:#102C50;color:#fff}.bt th,.bt td{border:1px solid #444;padding:6px;text-align:center}`);
}

/* ---------- التنبيهات ---------- */
let timer=null,fired=new Set();
function beep(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=new C(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=880;g.gain.value=.2;o.start();o.stop(c.currentTime+.6)}catch(e){}}
function showBanner(txt){const d=document.createElement('div');d.className='sd-banner';d.setAttribute('role','alert');d.innerHTML=`<style>.sd-banner{position:fixed;inset-inline:12px;top:12px;z-index:9999;padding:14px 18px;border-radius:14px;background:#0F766E;color:#fff;font-weight:700;box-shadow:0 10px 30px #0004;text-align:center}</style>`+H(txt);document.body.appendChild(d);setTimeout(()=>d.remove(),9000)}
function notify(txt){
  const a=bell().alerts;showBanner(txt);if(a.sound)beep();
  try{if(a.notify&&'Notification' in window&&Notification.permission==='granted')new Notification('مسار',{body:txt})}catch(e){}
}
function tick(date=new Date()){
  const b=bell();const day=dayByDate(date);if(!day)return [];
  const mins=date.getHours()*60+date.getMinutes(),out=[];
  const stamp=date.toISOString().slice(0,10);
  for(const x of bellTimes()){
    if(x.period>(+day.periods||0))break;
    if(b.alerts.start&&mins===x.start-b.alerts.lead){const k=stamp+'s'+x.period;if(!fired.has(k)){fired.add(k);out.push(b.alerts.lead?`تبدأ الحصة ${x.period} بعد ${b.alerts.lead} د`:`بدأت الحصة ${x.period}`)}}
    if(b.alerts.end&&mins===x.end-b.alerts.lead){const k=stamp+'e'+x.period;if(!fired.has(k)){fired.add(k);out.push(b.alerts.lead?`تنتهي الحصة ${x.period} بعد ${b.alerts.lead} د`:`انتهت الحصة ${x.period}`)}}
  }
  out.forEach(notify);return out;
}
function scheduleAlerts(){clearInterval(timer);const a=bell().alerts;if(a.start||a.end)timer=setInterval(()=>tick(),15000)}
window.MASAR_SCHOOLDAY={staffRows,bellTimes,nowInfo,tick,candidatesFor,teachesOn,applyStatusToRules,autoCover,toTxt,toMin,paper,_fired:fired};

/* ---------- ورق الطباعة A4/A3 ---------- */
const origPS=window.printSetup;
window.printSetup=function(){
  origPS();
  const host=$('#workspace');if(!host)return;
  const p=db.printSettings=db.printSettings||{};
  const box=document.createElement('div');box.className='notice';
  box.innerHTML=`<label>حجم الورق للطباعة: <select id="sdPaper"><option value="A3" ${paper()==='A3'?'selected':''}>A3</option><option value="A4" ${paper()==='A4'?'selected':''}>A4 (تصغير تلقائي)</option></select></label> <button class="secondary" id="sdAllSec">طباعة كل الشعب</button> <button class="secondary" id="sdBell">طباعة التواقيت</button>`;
  host.querySelector('h2').after(box);
  $('#sdPaper').onchange=e=>{p.paper=e.target.value;save()};
  $('#sdBell').onclick=printBell;
  $('#sdAllSec').onclick=()=>{ if(typeof printDocument==='function'){try{printDocument()}catch(e){alert('تعذرت طباعة كل الشعب: '+e.message)}} };
};

/* ---------- تهيئة ---------- */
bell();scheduleAlerts();
if(typeof pages!=='undefined'){
  const add=(id,name,group)=>{if(!pages.some(p=>p[0]===id))pages.push([id,name]);const g=navigationGroups.find(x=>x[0]===group);if(g&&!g[1].includes(id))g[1].push(id)};
  add('bellSchedule','أوقات الحصص والتنبيهات','إدارة الدوام اليومي');
  add('substitution','سد الشاغر','إدارة الدوام اليومي');
  add('teacherStatus','حالة المدرسين (مفرّغ/متعاقد)','المدرسون والتكليفات');
  Object.assign(glassIcons,{bellSchedule:'⏰',substitution:'🔁',teacherStatus:'🪪'});
}
if(page&&masarPages[page])render();
})();

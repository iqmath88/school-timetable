function enforceStatusBlocked(d){
 /* حالة المدرس (مفرّغ/متعاقد + أيام التدريس) تُترجم إلى «عدم إتاحة». إن ضاعت الترجمة (بتعديل لاحق للقيود) تُستعاد هنا، فلا يُوضع مدرس في يوم لا يدرّس فيه. */
 let n=0;try{const rules=d&&d.teacherRules;if(!rules)return 0;const act=new Map((d.days||[]).filter(x=>x.active&&x.periods>0).map(x=>[x.id,x.periods]));
  for(const t of Object.keys(rules)){const r=rules[t];if(!r||!Array.isArray(r.statusBlocked)||!r.statusBlocked.length)continue;r.unavailable=r.unavailable||{};
   for(const day of r.statusBlocked){const per=act.get(day);if(!per)continue;const cur=new Set((r.unavailable[day]||[]).map(Number));let miss=false;for(let p=1;p<=per;p++)if(!cur.has(p)){cur.add(p);miss=true}
    if(miss){r.unavailable[day]=[...cur].sort((a,b)=>a-b);n++}}}}catch(e){}
 return n}
'use strict';
self.onmessage=async e=>{if(e.data.type!=='start')return;try{enforceStatusBlocked(e.data.db)}catch(_){}const diag=!!e.data.diagnosticOnly,limit=+e.data.deadlineMs||240000;try{
 const dfsMs=(!diag&&limit>=60000)?Math.min(30000,Math.round(limit*0.25)):limit;
 let res=generate(e.data.db,dfsMs,diag);
 if(!diag&&!res.ok&&limit>=60000&&['time','exhausted','validation-mismatch'].includes(res.reason)){
  const left=Math.max(10000,limit-dfsMs-5000);
  try{
   self.postMessage({type:'phase',phase:'البحث العادي لم ينجح؛ تشغيل المحرك الرياضي الاحتياطي'});
   if(typeof mipSolve!=='function')importScripts('mip-engine.js?v=0.9.26.0');
   const m=await mipSolve(e.data.db,left,x=>self.postMessage(x));
   if(m.ok){const chk=validateExistingSchedule({...e.data.db,timetable:m.entries});
    if(chk.ok)res={ok:true,entries:m.entries,nodes:0,bestDepth:m.entries.length,total:m.entries.length,engine:'mip',message:`تم توليد ${m.entries.length} حصة بالمحرك الرياضي الاحتياطي واجتاز الجدول فحصاً مستقلاً لجميع القيود.`};
    else{res.mipRejected=chk.reason;res.message=(res.message||'')+' | رفض الفحص نتيجة المحرك الاحتياطي: '+chk.reason}}else res.message=(res.message||'')+' | المحرك الاحتياطي لم يجد حلاً ('+(m.status||'؟')+')'
  }catch(err){res.mipError=String(err&&err.message||err);res.message=(res.message||'')+' | تعذر تشغيل المحرك الاحتياطي: '+res.mipError+' — تأكد من رفع الملفات mip-engine.js وhighs-engine.js وhighs.wasm إلى نفس مجلد التطبيق.'}
 }
 self.postMessage({type:'result',result:res})}catch(err){self.postMessage({type:'result',result:{ok:false,reason:'exception',message:String(err.stack||err)}})}};

function advancedMatch(r,a,sec,dayId,p){
 if(r.dayId&&r.dayId!==dayId)return false;
 if(r.stageId&&r.stageId!==sec.stageId)return false;
 if(r.sectionId&&r.sectionId!==sec.id)return false;
 if(r.target==='teacher'&&r.teacherId!==a.teacherId)return false;
 if(r.target==='subject'&&r.subjectId!==a.subjectId)return false;
 return true;
}
function advancedAllowed(db,a,sec,dayId,p){
 return !(db.advancedRules||[]).some(r=>r.strict!=='soft'&&advancedMatch(r,a,sec,dayId,p)&&(r.mode==='allow'?(p<r.from||p>r.to):(p>=r.from&&p<=r.to)));
}

function generate(db,limitMs,diagnosticOnly=false){
 const seed=diagnosticOnly?{ok:false,reason:"وضع التشخيص"}:validateExistingSchedule(db);
 if(seed.ok){return {ok:true,entries:seed.entries,reused:true,nodes:0,bestDepth:seed.entries.length,total:seed.entries.length,message:'تم التحقق من الجدول المحفوظ: جميع الحصص والقيود الإلزامية صحيحة. احتفظ المحرك بالحل المثبت بدلاً من إعادة البحث غير الضرورية.'};}
 self.postMessage({type:'phase',phase:'فحص الجدول المحفوظ: '+seed.reason+'؛ بدء البحث عن حل جديد'});
 const began=Date.now(),deadline=began+(+limitMs||240000);const days=db.days.filter(d=>d.active&&d.periods>0).sort((a,b)=>a.order-b.order),D=days.length;
 const sections=db.sections,teachers=db.teachers,assignments=db.assignments.filter(a=>+a.weeklyPeriods>0),A=assignments.length;
 const ti=new Map(teachers.map((x,i)=>[x.id,i])),si=new Map(sections.map((x,i)=>[x.id,i]));
 const at=assignments.map(a=>ti.get(a.teacherId)),as=assignments.map(a=>si.get(a.sectionId));
 const cap=sections.map(sec=>days.map(d=>Math.min(d.periods,Math.max(0,+(db.stageDayPeriods?.[sec.stageId]?.[d.id]??d.periods)))));
 const total=assignments.reduce((n,a)=>n+(+a.weeklyPeriods||0),0),remaining=assignments.map(a=>+a.weeklyPeriods),tRules=teachers.map(t=>db.teacherRules[t.id]||{});
 const maxDaily=tRules.map(r=>+r.maxDaily>0?+r.maxDaily:99),minDaily=tRules.map(r=>Math.max(0,+r.minDaily||0)),busy=new Set(),used=sections.map(()=>days.map(()=>new Set())),teacherDay=teachers.map(()=>new Int8Array(D)),assDay=assignments.map(()=>new Int8Array(D));
 // Necessary per-teacher and per-assignment capacity checks before expensive backtracking.
 for(let t=0;t<teachers.length;t++){
  const load=assignments.reduce((n,a,i)=>n+(at[i]===t?+a.weeklyPeriods:0),0);
  if(!load)continue;
  const r=tRules[t];let possible=0;
  for(let d=0;d<D;d++){
   let open=0;
   for(let period=1;period<=days[d].periods;period++)if(!(r.unavailable?.[days[d].id]||[]).includes(period))open++;
   possible+=Math.min(open,maxDaily[t]);
  }
  if(load>possible)return {ok:false,reason:'teacher-capacity',total,message:`لا يمكن توزيع نصاب المدرس ${teachers[t].name}: مطلوب ${load} حصة، والمتاح وفق أيامه وقيوده ${possible} فقط. لم تتغير البيانات.`};
 }
 // Diagnose impossible assignments using actual teacher, subject and advanced time windows.
 const assignmentDiagnostics=[];
 for(let i=0;i<A;i++){
  const a=assignments[i],t=at[i],sec=as[i],r=tRules[t];let open=0,daysOpen=0;
  for(let d=0;d<D;d++){
   let n=0;for(let p=1;p<=cap[sec][d];p++){
    const sr=db.subjectRules?.[a.subjectId]||{},hard=sr.strict!=='soft'&&(!sr.stageId||sr.stageId===sections[sec].stageId);
    if((r.unavailable?.[days[d].id]||[]).includes(p)||!advancedAllowed(db,a,sections[sec],days[d].id,p)||(hard&&((sr.noFirst&&p===1)||(sr.noLast&&p===cap[sec][d]))))continue;
    n++;
   }
   if(n)daysOpen++;
   open+=Math.min(n,maxDaily[t]);
  }
  if(open<+a.weeklyPeriods)assignmentDiagnostics.push({teacher:teachers[t]?.name,section:sections[sec]?.name,stage:sections[sec]?.stageId,subject:a.subjectId,required:+a.weeklyPeriods,available:open,assignmentId:a.id});
 }
 if(assignmentDiagnostics.length)return {ok:false,reason:'assignment-capacity',total,diagnostics:{assignmentDiagnostics},message:'تكليفات لا تمتلك عدداً كافياً من الخانات المسموحة وفق القيود الإلزامية. راجع التفاصيل واقتراحات الحل.'};
 // Teacher-level time-slot max-flow: detects joint assignment bottlenecks that
 // individual load and availability checks cannot see. This is a necessary
 // feasibility check, not a complete proof of schedule feasibility.
 function teacherFlow(t){
  const jobs=[];for(let i=0;i<A;i++)if(at[i]===t)jobs.push(i);
  if(!jobs.length)return null;
  const slots=[];for(let d=0;d<D;d++)for(let p=1;p<=days[d].periods;p++)if(!(tRules[t].unavailable?.[days[d].id]||[]).includes(p))slots.push({d,p});
  const source=0,jobBase=1,jobDayBase=jobBase+jobs.length,slotBase=jobDayBase+jobs.length*D,dayBase=slotBase+slots.length,sink=dayBase+D,N=sink+1;
  const graph=Array.from({length:N},()=>[]);
  function edge(u,v,c){const a={v,c,rev:graph[v].length},b={v:u,c:0,rev:graph[u].length};graph[u].push(a);graph[v].push(b)}
  let demand=0;
  jobs.forEach((i,j)=>{
   const a=assignments[i],sec=as[i],sr=db.subjectRules?.[a.subjectId]||{},hard=sr.strict!=='soft'&&(!sr.stageId||sr.stageId===sections[sec].stageId);
   demand+=+a.weeklyPeriods;edge(source,jobBase+j,+a.weeklyPeriods);
   let availableDays=0;
   for(let d=0;d<D;d++)if(slots.some(sl=>sl.d===d&&sl.p<=cap[sec][d]&&advancedAllowed(db,a,sections[sec],days[d].id,sl.p)&&!(hard&&((sr.noFirst&&sl.p===1)||(sr.noLast&&sl.p===cap[sec][d])))))availableDays++;
   const unavoidable=Math.max(0,+a.weeklyPeriods-availableDays);
   for(let d=0;d<D;d++){
    const jd=jobDayBase+j*D+d;
    edge(jobBase+j,jd,hard&&sr.noRepeat?1:1+unavoidable);
    slots.forEach((sl,k)=>{
     if(sl.d!==d||sl.p>cap[sec][d]||!advancedAllowed(db,a,sections[sec],days[d].id,sl.p))return;
     if(hard&&((sr.noFirst&&sl.p===1)||(sr.noLast&&sl.p===cap[sec][d])))return;
     edge(jd,slotBase+k,1);
    });
   }
  });
  slots.forEach((sl,k)=>edge(slotBase+k,dayBase+sl.d,1));
  for(let d=0;d<D;d++)edge(dayBase+d,sink,maxDaily[t]);
  let flow=0;
  while(flow<demand){const prev=Array(N).fill(null),q=[source];prev[source]=[-1,-1];
   for(let h=0;h<q.length&&prev[sink]===null;h++){const u=q[h];for(let k=0;k<graph[u].length;k++){const e=graph[u][k];if(e.c>0&&prev[e.v]===null){prev[e.v]=[u,k];q.push(e.v);if(e.v===sink)break}}}
   if(prev[sink]===null)break;
   let aug=demand-flow;for(let v=sink;v!==source;){const [u,k]=prev[v];aug=Math.min(aug,graph[u][k].c);v=u}
   for(let v=sink;v!==source;){const [u,k]=prev[v],e=graph[u][k];e.c-=aug;graph[v][e.rev].c+=aug;v=u}flow+=aug;
  }
  return flow<demand?{teacherId:teachers[t].id,teacher:teachers[t].name,required:demand,maximumFlow:flow,shortfall:demand-flow,assignmentIds:jobs.map(i=>assignments[i].id),suggestion:'راجع أيام عدم الإتاحة، والحد اليومي، وتكرار الحصص لكل تكليف. جرّب إتاحة يوم إضافي أو نقل تكليف بعد موافقة الإدارة.'}:null;
 }
 const flowFailures=[];for(let t=0;t<teachers.length;t++){const x=teacherFlow(t);if(x)flowFailures.push(x)}
 if(flowFailures.length)return {ok:false,reason:'teacher-time-flow',total,diagnostics:{flowFailures},message:`تعارض مؤكد في سعة التكليفات والأيام لدى ${flowFailures.length} مدرس: بعض تكليفاتهم تتنافس على خانات زمنية لا تكفي للجميع. لم تُعدّل أي قيود.`};
 // Independent per-section max-flow necessary-condition check. Unlike the teacher
 // flow, this detects competition among different teachers for the SAME section slots.
 // It deliberately relaxes cross-section teacher conflicts, so a failure is a
 // mathematically sound capacity conflict, not a search timeout.
 function sectionFlow(sectionIndex){
  const jobs=[];for(let i=0;i<A;i++)if(as[i]===sectionIndex)jobs.push(i);
  if(!jobs.length)return null;
  const slots=[];for(let d=0;d<D;d++)for(let p=1;p<=cap[sectionIndex][d];p++)slots.push({d,p});
  const source=0,jobBase=1,jobDayBase=jobBase+jobs.length,slotBase=jobDayBase+jobs.length*D,sink=slotBase+slots.length;
  const graph=Array.from({length:sink+1},()=>[]);
  function edge(u,v,c){graph[u].push({v,c,rev:graph[v].length});graph[v].push({v:u,c:0,rev:graph[u].length-1})}
  let demand=0;
  jobs.forEach((i,j)=>{
   const a=assignments[i],t=at[i],r=tRules[t],sr=db.subjectRules?.[a.subjectId]||{};
   const hard=sr.strict!=='soft'&&(!sr.stageId||sr.stageId===sections[sectionIndex].stageId);
   demand+=+a.weeklyPeriods;edge(source,jobBase+j,+a.weeklyPeriods);
   let openDays=0;
   for(let d=0;d<D;d++)if(slots.some(sl=>sl.d===d&&!(r.unavailable?.[days[d].id]||[]).includes(sl.p)&&advancedAllowed(db,a,sections[sectionIndex],days[d].id,sl.p)&&!(hard&&((sr.noFirst&&sl.p===1)||(sr.noLast&&sl.p===cap[sectionIndex][d])))))openDays++;
   const repeatAllowance=hard&&sr.noRepeat?0:Math.max(0,+a.weeklyPeriods-openDays);
   for(let d=0;d<D;d++){
    const jd=jobDayBase+j*D+d;edge(jobBase+j,jd,1+repeatAllowance);
    slots.forEach((sl,k)=>{if(sl.d!==d||(r.unavailable?.[days[d].id]||[]).includes(sl.p)||!advancedAllowed(db,a,sections[sectionIndex],days[d].id,sl.p)||(hard&&((sr.noFirst&&sl.p===1)||(sr.noLast&&sl.p===cap[sectionIndex][d]))))return;edge(jd,slotBase+k,1)});
   }
  });
  slots.forEach((sl,k)=>edge(slotBase+k,sink,1));
  let flow=0;
  while(flow<demand){const prev=Array(sink+1).fill(null),q=[source];prev[source]=[-1,-1];
   for(let h=0;h<q.length&&prev[sink]===null;h++){const u=q[h];for(let k=0;k<graph[u].length;k++){const e=graph[u][k];if(e.c>0&&prev[e.v]===null){prev[e.v]=[u,k];q.push(e.v);if(e.v===sink)break}}}
   if(prev[sink]===null)break;
   let aug=demand-flow;for(let v=sink;v!==source;){const [u,k]=prev[v];aug=Math.min(aug,graph[u][k].c);v=u}
   for(let v=sink;v!==source;){const [u,k]=prev[v],e=graph[u][k];e.c-=aug;graph[v][e.rev].c+=aug;v=u}flow+=aug;
  }
  return flow<demand?{sectionId:sections[sectionIndex].id,stageId:sections[sectionIndex].stageId,section:sections[sectionIndex].name,required:demand,maximumFlow:flow,shortfall:demand-flow,assignmentIds:jobs.map(i=>assignments[i].id),suggestion:'راجع أوقات المدرسين المسموحة لهذه الشعبة وقواعد عدم التكرار؛ لا تُعدّل أي قيد دون موافقة الإدارة.'}:null;
 }
 const sectionFlowFailures=[];for(let s=0;s<sections.length;s++){const f=sectionFlow(s);if(f)sectionFlowFailures.push(f)}
 if(sectionFlowFailures.length)return {ok:false,reason:'section-time-flow',total,diagnostics:{sectionFlowFailures},message:`تعارض سعة مثبت في ${sectionFlowFailures.length} شعبة: تكليفاتها لا يمكن توزيعها على الخانات المسموحة حتى قبل احتساب تعارض المدرسين مع الشعب الأخرى.`};
 if(diagnosticOnly)return {ok:true,diagnosticOnly:true,total,diagnostics:{},message:'اجتازت البيانات اختبارات السعة الضرورية؛ هذا لا يثبت إمكانية إنشاء الجدول الكامل.'};
 // Minimum repetition is based on days actually available to both teacher and section.
 const allowedRepeat=assignments.map((a,i)=>{
  let availableDays=0;const t=at[i],sec=as[i],r=tRules[t];
  for(let d=0;d<D;d++){
   let free=0;for(let p=1;p<=cap[sec][d];p++)if(!(r.unavailable?.[days[d].id]||[]).includes(p))free++;
   if(free>0&&maxDaily[t]>0&&Array.from({length:cap[sec][d]},(_,j)=>j+1).some(p=>!(r.unavailable?.[days[d].id]||[]).includes(p)&&advancedAllowed(db,a,sections[sec],days[d].id,p)))availableDays++;
  }
  return Math.max(0,+a.weeklyPeriods-availableDays);
 });
 for(let i=0;i<A;i++){const sr=subjectRule(i);if(sr.noRepeat&&+assignments[i].weeklyPeriods>days.length)return {ok:false,reason:'subject-no-repeat',message:`قيد منع تكرار المادة يمنع توزيع ${assignments[i].weeklyPeriods} حصة في ${days.length} أيام للتكليف ${assignments[i].id}.`};}
 function repeatOK(i,d){
  const sr=subjectRule(i);
  const extra=assDay[i].reduce((n,v)=>n+Math.max(0,v-1),0);
  return assDay[i][d]===0||(!sr.noRepeat&&extra<allowedRepeat[i]);
 }
 const fixed=new Map(),fixedMax=sections.map(()=>new Int8Array(D)),entries=[];let nodes=0,bestDepth=0,stop='';
 const key=(t,d,p)=>t+'|'+d+'|'+p;
 function subjectRule(i){const r=db.subjectRules?.[assignments[i].subjectId]||{};return r.stageId&&r.stageId!==sections[as[i]].stageId?{}:r.strict==='soft'?{}:r}
 function can(i,d,p,quota){const t=at[i],s=as[i],r=tRules[t],sr=subjectRule(i);if(t===undefined||s===undefined||p>quota[s][d]||p<1||remaining[i]<1)return false;if(busy.has(key(t,d,p))||used[s][d].has(p)||teacherDay[t][d]>=maxDaily[t])return false;if((r.unavailable?.[days[d].id]||[]).includes(p))return false;if(!advancedAllowed(db,assignments[i],sections[s],days[d].id,p))return false;const pin=fixed.get(s+'|'+d+'|'+p);if(pin!==undefined&&pin!==i)return false;if(sr.noFirst&&p===1||sr.noLast&&p===quota[s][d]||!repeatOK(i,d))return false;return true}
 function put(i,d,p,locked=false){remaining[i]--;teacherDay[at[i]][d]++;assDay[i][d]++;busy.add(key(at[i],d,p));used[as[i]][d].add(p);entries.push({assignmentId:assignments[i].id,teacherId:assignments[i].teacherId,sectionId:assignments[i].sectionId,subjectId:assignments[i].subjectId,dayId:days[d].id,period:p,locked,_i:i,_d:d,_p:p})}
 function undo(){const x=entries.pop(),i=x._i,d=x._d,p=x._p;remaining[i]++;teacherDay[at[i]][d]--;assDay[i][d]--;busy.delete(key(at[i],d,p));used[as[i]][d].delete(p)}
 for(const f of db.fixedLessons||[]){const i=assignments.findIndex(a=>a.id===f.assignmentId),d=days.findIndex(x=>x.id===f.dayId);if(i<0||d<0)return {ok:false,reason:'fixed-conflict',message:'حصة مثبتة غير صالحة'};const s=as[i],p=+f.period;if(p>cap[s][d])return {ok:false,reason:'fixed-conflict',message:'حصة مثبتة خارج سعة الشعبة'};fixed.set(s+'|'+d+'|'+p,i);fixedMax[s][d]=Math.max(fixedMax[s][d],p)}
 // Each section/day uses a contiguous prefix of its available periods. Explore balanced daily quota layouts.
 const needed=sections.map((_,s)=>assignments.reduce((n,a,i)=>n+(as[i]===s?+a.weeklyPeriods:0),0));
 for(let s=0;s<sections.length;s++)if(needed[s]>cap[s].reduce((a,b)=>a+b,0))return {ok:false,reason:'capacity',message:'نصاب إحدى الشعب يتجاوز طاقتها الأسبوعية'};
 self.postMessage({type:'phase',phase:'توزيع الحصص حسب سعة المراحل والقيود'});
 let best=0,attempt=0;let deadEndNoChoices=0,deadEndAssignment=0,deadEndTeacher=0;let lastValidationReason='';
 while(Date.now()<deadline&&attempt<2400){attempt++;
 // Daily quotas are selected using the teacher/assignment availability of each
 // section. Avoid cutting a period that is scarce for its assigned teachers.
 const quota=cap.map((row,s)=>{
  const q=row.slice(),missing=q.reduce((a,b)=>a+b,0)-needed[s];
  for(let j=0;j<missing;j++){
   const opts=[];
   for(let d=0;d<D;d++){
    const p=q[d];if(p<=fixedMax[s][d]||p<1)continue;
    let scarcity=0;
    for(let i=0;i<A;i++)if(as[i]===s){
     const t=at[i],r=tRules[t],a=assignments[i],sr=db.subjectRules?.[a.subjectId]||{};
     if((r.unavailable?.[days[d].id]||[]).includes(p)||!advancedAllowed(db,a,sections[s],days[d].id,p))continue;
     if(sr.strict!=='soft'&&(!sr.stageId||sr.stageId===sections[s].stageId)&&((sr.noFirst&&p===1)||(sr.noLast&&p===cap[s][d])))continue;
     let alternatives=0;
     for(let dd=0;dd<D;dd++)for(let pp=1;pp<=q[dd];pp++)if(!(r.unavailable?.[days[dd].id]||[]).includes(pp)&&advancedAllowed(db,a,sections[s],days[dd].id,pp))alternatives++;
     scarcity+=(+a.weeklyPeriods)/Math.max(1,alternatives);
    }
    // Mix an availability-first strategy with rotating alternatives so the
    // solver can recover when a heuristic quota proves unworkable.
    const rotate=((d*17+attempt*13+s*7+j*11)%19)/19;
    const score=(attempt%5===0?0:scarcity)+(attempt%3===0?-q[d]*0.2:q[d]*0.04)+rotate*(attempt%7===0?2:0.08);
    opts.push({d,score});
   }
   if(!opts.length)break;
   opts.sort((a,b)=>a.score-b.score||a.d-b.d);
   q[opts[0].d]--;
  }
  return q;
 });
 if(quota.some((q,s)=>q.reduce((a,b)=>a+b,0)!==needed[s]))continue;
 const slots=[];for(let s=0;s<sections.length;s++)for(let d=0;d<D;d++)for(let p=1;p<=quota[s][d];p++)slots.push({s,d,p});
 const ordered=slots.map((x,i)=>({...x,idx:i})),assignmentBySection=sections.map((_,s)=>assignments.map((a,i)=>as[i]===s?i:-1).filter(i=>i>=0));
 let failed=false;
 const tAss=teachers.map(()=>[]);for(let i=0;i<A;i++)tAss[at[i]].push(i);
 // قص مبكر للحد الأدنى اليومي: كل يوم فيه حصص أقل من الحد يحتاج حصصاً إضافية، فإن زاد المطلوب عن المتبقي للمدرس فالفرع مستحيل.
 function minOk(t){let need=0;const row=teacherDay[t];for(let d=0;d<D;d++){const n=row[d];if(n>0&&n<minDaily[t])need+=minDaily[t]-n}if(!need)return true;let rem=0;for(const i of tAss[t])rem+=remaining[i];return need<=rem}
 function dfs(left){if(!left)return teacherDay.every((row,t)=>row.every(n=>!n||n>=minDaily[t]));if(entries.length){const lt=at[entries[entries.length-1]._i];if(minDaily[lt]>1&&!minOk(lt)){deadEndTeacher++;return false}}if((++nodes&31)===0){if(Date.now()>deadline){stop='time';return false}if(nodes%2048===0)self.postMessage({type:'progress',nodes,bestDepth:best,placed:entries.length,total})}if(entries.length>best)best=entries.length;
 let chosen=null,choices=null;
 for(const sl of ordered){if(used[sl.s][sl.d].has(sl.p))continue;// MRV across all remaining slots: quota already guarantees a contiguous final day.
 const pinned=fixed.get(sl.s+'|'+sl.d+'|'+sl.p);const choicesHere=(pinned!==undefined?[pinned]:assignmentBySection[sl.s]).filter(i=>can(i,sl.d,sl.p,quota));
 if(!choicesHere.length){deadEndNoChoices++;return false;}
 if(!choices||choicesHere.length<choices.length||(choicesHere.length===choices.length&&((sl.idx+attempt*17)%31)<((chosen.idx+attempt*17)%31))){chosen=sl;choices=choicesHere;if(choices.length===1)break}}
 if(!chosen)return false;
 // Necessary-condition pruning: every remaining assignment must retain enough compatible free slots.
 // Run the expensive global check periodically; local can() still checks every placement.
 if(entries.length%3===0)
 // This catches impossible branches early instead of exploring millions of deeper permutations.
 for(let i=0;i<A;i++)if(remaining[i]>0){let free=0;const sec=as[i];for(let d=0;d<D;d++){if(teacherDay[at[i]][d]>=maxDaily[at[i]])continue;let dayFree=0;for(let p=1;p<=quota[sec][d];p++){const pinned=fixed.get(sec+'|'+d+'|'+p);if(pinned!==undefined&&pinned!==i)continue;if(can(i,d,p,quota))dayFree++;}const sr=subjectRule(i);free+=Math.min(dayFree,maxDaily[at[i]]-teacherDay[at[i]][d],Math.max(0,1+allowedRepeat[i]-assDay[i][d]));}if(free<remaining[i]){deadEndAssignment++;return false;}}
 // Forward-check each teacher's remaining demand against distinct available times.
 // A teacher can teach only one section in a given period, regardless of the
 // number of individually compatible section slots at that time.
 if(entries.length%12===0)for(let t=0;t<teachers.length;t++){
  let demand=0;for(let i=0;i<A;i++)if(at[i]===t)demand+=remaining[i];
  if(!demand)continue;
  let capacity=0;
  for(let d=0;d<D;d++){
   if(teacherDay[t][d]>=maxDaily[t])continue;
   let open=0;
   for(let p=1;p<=days[d].periods;p++){
    if(busy.has(key(t,d,p))||(tRules[t].unavailable?.[days[d].id]||[]).includes(p))continue;
    let usable=false;
    for(let i=0;i<A&&!usable;i++)if(at[i]===t&&remaining[i]>0){
     const sec=as[i];if(p<=quota[sec][d]&&!used[sec][d].has(p)&&can(i,d,p,quota))usable=true;
    }
    if(usable)open++;
   }
   capacity+=Math.min(open,maxDaily[t]-teacherDay[t][d]);
  }
  if(capacity<demand){deadEndTeacher++;return false;}
 }
 choices.sort((a,b)=>{const score=i=>{const r=tRules[at[i]],p=chosen.p,d=chosen.d;return (remaining[i]?1/remaining[i]:99)+(assDay[i][d]?12:0)-(teacherDay[at[i]][d]>0&&teacherDay[at[i]][d]<minDaily[at[i]]?6:0)+((r.avoid||[]).includes(p)?3:0)-((r.preferred||[]).includes(p)?1:0)+((db.advancedRules||[]).some(ar=>ar.strict==='soft'&&advancedMatch(ar,assignments[i],sections[as[i]],days[d].id,p)&&(ar.mode==='allow'?(p>=ar.from&&p<=ar.to):!(p>=ar.from&&p<=ar.to)))?1.5:0)};return score(a)-score(b)||((a*37+attempt*53)%101)-((b*37+attempt*53)%101)});
 for(const i of choices){put(i,chosen.d,chosen.p,fixed.has(chosen.s+'|'+chosen.d+'|'+chosen.p));if(dfs(left-1))return true;undo();if(stop)return false}return false}
 if(quota.some((row,s)=>row.some((v,d)=>v<fixedMax[s][d])))continue;
 let pre=0,preBad=null;for(const [k,i] of fixed){const parts=k.split('|').map(Number),d=parts[1],p=parts[2];if(can(i,d,p,quota)){put(i,d,p,true);pre++}else{preBad={i,d,p};break}}
if(preBad){while(entries.length)undo();return {ok:false,reason:'fixed-conflict',message:'لا يمكن تنفيذ حصة مثبتة مع بقية القيود.',fixedConflict:{assignmentId:assignments[preBad.i].id,dayId:days[preBad.d].id,period:preBad.p}}}
if(dfs(total-pre)){const resultEntries=entries.map(({_i,_d,_p,...x})=>x);const checked=validateExistingSchedule({...db,timetable:resultEntries});if(checked.ok)return {ok:true,entries:resultEntries,nodes,bestDepth:total,message:`تم توزيع ${total} حصة واجتاز الجدول فحصاً مستقلاً لجميع القيود.`};lastValidationReason=checked.reason;stop='validation-mismatch';self.postMessage({type:'phase',phase:'رفض نتيجة البحث: '+checked.reason});}
 while(entries.length)undo();if(stop)break;
 // Ensure all search state was undone before trying a different daily distribution.
 while(entries.length)undo();
 }
 return {ok:false,reason:stop||'exhausted',nodes,bestDepth:best,total,diagnostics:{deadEndNoChoices,deadEndAssignment,deadEndTeacher,attempts:attempt,lastValidationReason},message:`لم يُعثر على جدول متوافق خلال ${attempt} محاولة (${Math.round((Date.now()-began)/1000)} ثانية). انتهاء المهلة ليس دليلاً على استحالة الجدول. جرّب التشخيص التفصيلي أو توسيع وقت البحث. لم يتغير جدولك السابق.`};
}

// Strict reference-schedule validation. A successful reference is a constructive
// feasibility certificate, not a claim that a new search found a fresh solution.
function validateExistingSchedule(db){
 const entries=db.timetable||[],assignments=db.assignments.filter(a=>+a.weeklyPeriods>0),days=db.days.filter(d=>d.active&&d.periods>0);
 const byId=new Map(assignments.map(a=>[a.id,a])),sec=new Map(db.sections.map(s=>[s.id,s])),day=new Map(days.map(d=>[d.id,d]));
 const expected=assignments.reduce((n,a)=>n+(+a.weeklyPeriods),0);
 if(entries.length!==expected)return {ok:false,reason:'الجدول المرجعي غير مكتمل'};
 const assignmentDays=new Map(),counts=new Map(),busyT=new Set(),busyS=new Set(),perDay=new Map(),sectionDays=new Map(),dailySubjects=new Set();
 for(const e of entries){
  const a=byId.get(e.assignmentId),d=day.get(e.dayId),section=sec.get(e.sectionId);
  if(!a||!d||!section||a.teacherId!==e.teacherId||a.sectionId!==e.sectionId||a.subjectId!==e.subjectId)return {ok:false,reason:'تكليف محذوف أو معدل'};
  const cap=Math.min(d.periods,Math.max(0,+(db.stageDayPeriods?.[section.stageId]?.[d.id]??d.periods)));
  if(!Number.isInteger(+e.period)||+e.period<1||+e.period>cap)return {ok:false,reason:'حصة خارج ساعات الدوام'};
  const kt=e.teacherId+'|'+e.dayId+'|'+e.period,ks=e.sectionId+'|'+e.dayId+'|'+e.period;
  if(busyT.has(kt)||busyS.has(ks))return {ok:false,reason:'تعارض في التوقيت'};
  busyT.add(kt);busyS.add(ks);
  const r=db.teacherRules?.[e.teacherId]||{};
  if((r.unavailable?.[e.dayId]||[]).includes(+e.period))return {ok:false,reason:'مخالفة عدم إتاحة المدرس'};if(!advancedAllowed(db,a,section,e.dayId,+e.period))return {ok:false,reason:'مخالفة قيد متقدم'};
  const sr=db.subjectRules?.[e.subjectId]||{},hard=sr.strict!=='soft'&&(!sr.stageId||sr.stageId===section.stageId);
  if(hard&&(sr.noFirst&&+e.period===1||sr.noLast&&+e.period===cap))return {ok:false,reason:'مخالفة قيد المادة'};
  const subKey=e.sectionId+'|'+e.dayId+'|'+e.subjectId;
  if(true){const aDays=assignmentDays.get(a.id)||new Map();aDays.set(e.dayId,(aDays.get(e.dayId)||0)+1);assignmentDays.set(a.id,aDays);}
  dailySubjects.add(subKey);
  counts.set(a.id,(counts.get(a.id)||0)+1);
  const td=e.teacherId+'|'+e.dayId;perDay.set(td,(perDay.get(td)||0)+1);
  const sd=e.sectionId+'|'+e.dayId;if(!sectionDays.has(sd))sectionDays.set(sd,[]);sectionDays.get(sd).push(+e.period);
 }
 for(const a of assignments)if(counts.get(a.id)!==+a.weeklyPeriods)return {ok:false,reason:'نصاب تكليف غير مكتمل'};
 for(const a of assignments){const section=sec.get(a.sectionId),sr=db.subjectRules?.[a.subjectId]||{};
  if(sr.stageId&&sr.stageId!==section.stageId)continue;
  const rule=db.teacherRules?.[a.teacherId]||{};let availableDays=0;
  for(const d of days){const cap=Math.min(d.periods,Math.max(0,+(db.stageDayPeriods?.[section.stageId]?.[d.id]??d.periods)));
   if(Array.from({length:cap},(_,j)=>j+1).some(p=>!(rule.unavailable?.[d.id]||[]).includes(p)&&advancedAllowed(db,a,section,d.id,p)))availableDays++;
  }
  const actual=[...(assignmentDays.get(a.id)||new Map()).values()].reduce((n,v)=>n+Math.max(0,v-1),0);
  if(((sr.strict!=='soft'&&sr.noRepeat)&&actual>0)||(actual>Math.max(0,+a.weeklyPeriods-availableDays)))return {ok:false,reason:'تكرار المادة يتجاوز الضرورة'};
 }
 for(const [k,n] of perDay){const teacherId=k.split('|')[0],r=db.teacherRules?.[teacherId]||{};
  if(+r.maxDaily>0&&n>+r.maxDaily)return {ok:false,reason:'تجاوز الحد الأقصى اليومي'};
  if(+r.minDaily>0&&n<+r.minDaily)return {ok:false,reason:'أقل من الحد الأدنى اليومي'};
 }
 for(const arr of sectionDays.values()){arr.sort((a,b)=>a-b);if(arr[0]!==1||arr[arr.length-1]!==arr.length)return {ok:false,reason:'فراغ داخلي في الشعبة'};}
 for(const f of db.fixedLessons||[])if(!entries.some(e=>e.assignmentId===f.assignmentId&&e.dayId===f.dayId&&+e.period===+f.period))return {ok:false,reason:'حصة مثبتة مفقودة'};
 return {ok:true,entries:entries.map(({id,...e})=>e)};
}

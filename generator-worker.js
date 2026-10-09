'use strict';
self.onmessage=e=>{if(e.data.type!=='start')return;try{self.postMessage({type:'result',result:generate(e.data.db)})}catch(err){self.postMessage({type:'result',result:{ok:false,reason:'exception',message:String(err.stack||err)}})}};
function generate(db){
 const seed=validateExistingSchedule(db);
 if(seed.ok){return {ok:true,entries:seed.entries,reused:true,nodes:0,bestDepth:seed.entries.length,total:seed.entries.length,message:'تم التحقق من الجدول المحفوظ: جميع الحصص والقيود الإلزامية صحيحة. احتفظ المحرك بالحل المثبت بدلاً من إعادة البحث غير الضرورية.'};}
 self.postMessage({type:'phase',phase:'فحص الجدول المرجعي: '+seed.reason+'؛ بدء البحث عن حل جديد'});
 const began=Date.now(),deadline=began+55000;const days=db.days.filter(d=>d.active&&d.periods>0).sort((a,b)=>a.order-b.order),D=days.length;
 const sections=db.sections,teachers=db.teachers,assignments=db.assignments.filter(a=>+a.weeklyPeriods>0),A=assignments.length;
 const ti=new Map(teachers.map((x,i)=>[x.id,i])),si=new Map(sections.map((x,i)=>[x.id,i]));
 const at=assignments.map(a=>ti.get(a.teacherId)),as=assignments.map(a=>si.get(a.sectionId));
 const cap=sections.map(sec=>days.map(d=>Math.min(d.periods,Math.max(0,+(db.stageDayPeriods?.[sec.stageId]?.[d.id]??d.periods)))));
 const total=assignments.reduce((n,a)=>n+(+a.weeklyPeriods||0),0),remaining=assignments.map(a=>+a.weeklyPeriods),tRules=teachers.map(t=>db.teacherRules[t.id]||{});
 const maxDaily=tRules.map(r=>+r.maxDaily>0?+r.maxDaily:99),minDaily=tRules.map(r=>Math.max(0,+r.minDaily||0)),busy=new Set(),used=sections.map(()=>days.map(()=>new Set())),teacherDay=teachers.map(()=>new Int8Array(D)),assDay=assignments.map(()=>new Int8Array(D));
 const fixed=new Map(),entries=[];let nodes=0,bestDepth=0,stop='';
 const key=(t,d,p)=>t+'|'+d+'|'+p;
 function subjectRule(i){const r=db.subjectRules?.[assignments[i].subjectId]||{};return r.stageId&&r.stageId!==sections[as[i]].stageId?{}:r.strict==='soft'?{}:r}
 function can(i,d,p,quota){const t=at[i],s=as[i],r=tRules[t],sr=subjectRule(i);if(t===undefined||s===undefined||p>quota[s][d]||p<1||remaining[i]<1)return false;if(busy.has(key(t,d,p))||used[s][d].has(p)||teacherDay[t][d]>=maxDaily[t])return false;if((r.unavailable?.[days[d].id]||[]).includes(p))return false;const pin=fixed.get(s+'|'+d+'|'+p);if(pin!==undefined&&pin!==i)return false;if(sr.noFirst&&p===1||sr.noLast&&p===quota[s][d]||sr.noRepeat&&entries.some(x=>x.sectionId===assignments[i].sectionId&&x.subjectId===assignments[i].subjectId&&x.dayId===days[d].id))return false;return true}
 function put(i,d,p,locked=false){remaining[i]--;teacherDay[at[i]][d]++;assDay[i][d]++;busy.add(key(at[i],d,p));used[as[i]][d].add(p);entries.push({assignmentId:assignments[i].id,teacherId:assignments[i].teacherId,sectionId:assignments[i].sectionId,subjectId:assignments[i].subjectId,dayId:days[d].id,period:p,locked,_i:i,_d:d,_p:p})}
 function undo(){const x=entries.pop(),i=x._i,d=x._d,p=x._p;remaining[i]++;teacherDay[at[i]][d]--;assDay[i][d]--;busy.delete(key(at[i],d,p));used[as[i]][d].delete(p)}
 for(const f of db.fixedLessons||[]){const i=assignments.findIndex(a=>a.id===f.assignmentId),d=days.findIndex(x=>x.id===f.dayId);if(i<0||d<0)return {ok:false,reason:'fixed-conflict',message:'حصة مثبتة غير صالحة'};const s=as[i],p=+f.period;if(p>cap[s][d])return {ok:false,reason:'fixed-conflict',message:'حصة مثبتة خارج سعة الشعبة'};fixed.set(s+'|'+d+'|'+p,i)}
 // Each section/day uses a contiguous prefix of its available periods. Explore balanced daily quota layouts.
 const needed=sections.map((_,s)=>assignments.reduce((n,a,i)=>n+(as[i]===s?+a.weeklyPeriods:0),0));
 for(let s=0;s<sections.length;s++)if(needed[s]>cap[s].reduce((a,b)=>a+b,0))return {ok:false,reason:'capacity',message:'نصاب إحدى الشعب يتجاوز طاقتها الأسبوعية'};
 self.postMessage({type:'phase',phase:'توزيع الحصص حسب سعة المراحل والقيود'});
 let best=0,attempt=0;
 while(Date.now()<deadline&&attempt<300){attempt++;const quota=cap.map((row,s)=>{const q=row.slice(),missing=q.reduce((a,b)=>a+b,0)-needed[s];for(let j=0;j<missing;j++){let opts=q.map((v,d)=>({d,v,locked:[...fixed.keys()].some(k=>k.startsWith(s+'|'+d+'|')&&+k.split('|')[2]>=v)})).filter(x=>x.v>0&&!x.locked);if(!opts.length)break;opts.sort((a,b)=>((a.v+((a.d+attempt+s)%D)*.1)-(b.v+((b.d+attempt+s)%D)*.1)));q[opts[(j+attempt)%Math.min(opts.length,3)].d]--;}return q});
 if(quota.some((q,s)=>q.reduce((a,b)=>a+b,0)!==needed[s]))continue;
 const slots=[];for(let s=0;s<sections.length;s++)for(let d=0;d<D;d++)for(let p=1;p<=quota[s][d];p++)slots.push({s,d,p});
 const ordered=slots.map((x,i)=>({...x,idx:i})),assignmentBySection=sections.map((_,s)=>assignments.map((a,i)=>as[i]===s?i:-1).filter(i=>i>=0));
 let failed=false;
 function dfs(left){if(!left)return teacherDay.every((row,t)=>row.every(n=>!n||n>=minDaily[t]));if((++nodes&511)===0){if(Date.now()>deadline){stop='time';return false}if(nodes%4096===0)self.postMessage({type:'progress',nodes,bestDepth:best,placed:entries.length,total})}if(entries.length>best)best=entries.length;
 let chosen=null,choices=null;
 for(const sl of ordered){if(used[sl.s][sl.d].has(sl.p))continue;const prior=sl.p===1||used[sl.s][sl.d].has(sl.p-1);if(!prior)continue;
 const pinned=fixed.get(sl.s+'|'+sl.d+'|'+sl.p);const choicesHere=(pinned!==undefined?[pinned]:assignmentBySection[sl.s]).filter(i=>can(i,sl.d,sl.p,quota));
 if(!choicesHere.length)return false;
 if(!choices||choicesHere.length<choices.length){chosen=sl;choices=choicesHere;if(choices.length===1)break}}
 if(!chosen)return false;
 // Necessary-condition pruning: every remaining assignment must retain enough compatible free slots.
 // This catches impossible branches early instead of exploring millions of deeper permutations.
 for(let i=0;i<A;i++)if(remaining[i]>0){let free=0;const sec=as[i];for(let d=0;d<D;d++){if(teacherDay[at[i]][d]>=maxDaily[at[i]])continue;let dayFree=0;for(let p=1;p<=quota[sec][d];p++){const pinned=fixed.get(sec+'|'+d+'|'+p);if(pinned!==undefined&&pinned!==i)continue;if(can(i,d,p,quota))dayFree++;}const sr=subjectRule(i);const usedSame=sr.noRepeat&&entries.some(x=>x.sectionId===assignments[i].sectionId&&x.subjectId===assignments[i].subjectId&&x.dayId===days[d].id);free+=usedSame?0:Math.min(dayFree,maxDaily[at[i]]-teacherDay[at[i]][d],sr.noRepeat?1:99);}if(free<remaining[i])return false;}
 choices.sort((a,b)=>{const score=i=>{const r=tRules[at[i]],p=chosen.p,d=chosen.d;return (remaining[i]?1/remaining[i]:99)+(assDay[i][d]?12:0)-(teacherDay[at[i]][d]>0&&teacherDay[at[i]][d]<minDaily[at[i]]?6:0)+((r.avoid||[]).includes(p)?3:0)-((r.preferred||[]).includes(p)?1:0)};return score(a)-score(b)});
 for(const i of choices){put(i,chosen.d,chosen.p,fixed.has(chosen.s+'|'+chosen.d+'|'+chosen.p));if(dfs(left-1))return true;undo();if(stop)return false}return false}
 if([...fixed.keys()].some(k=>{const [s,d,p]=k.split('|').map(Number);return p>quota[s][d]}))continue;
 if(dfs(total)){return {ok:true,entries:entries.map(({_i,_d,_p,...x})=>x),nodes,bestDepth:total,message:`تم توزيع ${total} حصة دون فراغات داخلية، مع تطبيق قيود المواد الإلزامية.`}}
 if(stop)break;
 // Ensure all search state was undone before trying a different daily distribution.
 while(entries.length)undo();
 }
 return {ok:false,reason:stop||'exhausted',nodes,bestDepth:best,total,message:`لم يُعثر على جدول متوافق خلال ${attempt} محاولة. تحقق من قيود المدرسين والمواد، خاصة الحصص الأولى والأخيرة. لم يتغير جدولك السابق.`};
}

// Strict reference-schedule validation. A successful reference is a constructive
// feasibility certificate, not a claim that a new search found a fresh solution.
function validateExistingSchedule(db){
 const entries=db.timetable||[],assignments=db.assignments.filter(a=>+a.weeklyPeriods>0),days=db.days.filter(d=>d.active&&d.periods>0);
 const byId=new Map(assignments.map(a=>[a.id,a])),sec=new Map(db.sections.map(s=>[s.id,s])),day=new Map(days.map(d=>[d.id,d]));
 const expected=assignments.reduce((n,a)=>n+(+a.weeklyPeriods),0);
 if(entries.length!==expected)return {ok:false,reason:'الجدول المرجعي غير مكتمل'};
 const counts=new Map(),busyT=new Set(),busyS=new Set(),perDay=new Map(),sectionDays=new Map(),dailySubjects=new Set();
 for(const e of entries){
  const a=byId.get(e.assignmentId),d=day.get(e.dayId),section=sec.get(e.sectionId);
  if(!a||!d||!section||a.teacherId!==e.teacherId||a.sectionId!==e.sectionId||a.subjectId!==e.subjectId)return {ok:false,reason:'تكليف محذوف أو معدل'};
  const cap=Math.min(d.periods,Math.max(0,+(db.stageDayPeriods?.[section.stageId]?.[d.id]??d.periods)));
  if(!Number.isInteger(+e.period)||+e.period<1||+e.period>cap)return {ok:false,reason:'حصة خارج ساعات الدوام'};
  const kt=e.teacherId+'|'+e.dayId+'|'+e.period,ks=e.sectionId+'|'+e.dayId+'|'+e.period;
  if(busyT.has(kt)||busyS.has(ks))return {ok:false,reason:'تعارض في التوقيت'};
  busyT.add(kt);busyS.add(ks);
  const r=db.teacherRules?.[e.teacherId]||{};
  if((r.unavailable?.[e.dayId]||[]).includes(+e.period))return {ok:false,reason:'مخالفة عدم إتاحة المدرس'};
  const sr=db.subjectRules?.[e.subjectId]||{},hard=sr.strict!=='soft'&&(!sr.stageId||sr.stageId===section.stageId);
  if(hard&&(sr.noFirst&&+e.period===1||sr.noLast&&+e.period===cap))return {ok:false,reason:'مخالفة قيد المادة'};
  const subKey=e.sectionId+'|'+e.dayId+'|'+e.subjectId;
  if(hard&&sr.noRepeat&&dailySubjects.has(subKey))return {ok:false,reason:'تكرار مادة ممنوع'};
  dailySubjects.add(subKey);
  counts.set(a.id,(counts.get(a.id)||0)+1);
  const td=e.teacherId+'|'+e.dayId;perDay.set(td,(perDay.get(td)||0)+1);
  const sd=e.sectionId+'|'+e.dayId;if(!sectionDays.has(sd))sectionDays.set(sd,[]);sectionDays.get(sd).push(+e.period);
 }
 for(const a of assignments)if(counts.get(a.id)!==+a.weeklyPeriods)return {ok:false,reason:'نصاب تكليف غير مكتمل'};
 for(const [k,n] of perDay){const teacherId=k.split('|')[0],r=db.teacherRules?.[teacherId]||{};
  if(+r.maxDaily>0&&n>+r.maxDaily)return {ok:false,reason:'تجاوز الحد الأقصى اليومي'};
  if(+r.minDaily>0&&n<+r.minDaily)return {ok:false,reason:'أقل من الحد الأدنى اليومي'};
 }
 for(const arr of sectionDays.values()){arr.sort((a,b)=>a-b);if(arr[0]!==1||arr[arr.length-1]!==arr.length)return {ok:false,reason:'فراغ داخلي في الشعبة'};}
 for(const f of db.fixedLessons||[])if(!entries.some(e=>e.assignmentId===f.assignmentId&&e.dayId===f.dayId&&+e.period===+f.period))return {ok:false,reason:'حصة مثبتة مفقودة'};
 return {ok:true,entries:entries.map(({id,...e})=>e)};
}

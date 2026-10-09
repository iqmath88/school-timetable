'use strict';
self.onmessage=e=>{if(e.data.type!=='start')return;try{self.postMessage({type:'result',result:generate(e.data.db)})}catch(err){self.postMessage({type:'result',result:{ok:false,reason:'exception',message:String(err.stack||err)}})}};
function generate(db){
 const began=Date.now(),deadline=began+40000;const days=db.days.filter(d=>d.active&&d.periods>0).sort((a,b)=>a.order-b.order),D=days.length;
 const sections=db.sections,teachers=db.teachers,assignments=db.assignments.filter(a=>+a.weeklyPeriods>0),A=assignments.length;
 const ti=new Map(teachers.map((x,i)=>[x.id,i])),si=new Map(sections.map((x,i)=>[x.id,i]));
 const at=assignments.map(a=>ti.get(a.teacherId)),as=assignments.map(a=>si.get(a.sectionId));
 const cap=sections.map(sec=>days.map(d=>Math.min(d.periods,Math.max(0,+(db.stageDayPeriods?.[sec.stageId]?.[d.id]??d.periods)))));
 const total=assignments.reduce((n,a)=>n+(+a.weeklyPeriods||0),0),remaining=assignments.map(a=>+a.weeklyPeriods),tRules=teachers.map(t=>db.teacherRules[t.id]||{});
 const maxDaily=tRules.map(r=>+r.maxDaily>0?+r.maxDaily:99),busy=new Set(),used=sections.map(()=>days.map(()=>new Set())),teacherDay=teachers.map(()=>new Int8Array(D)),assDay=assignments.map(()=>new Int8Array(D));
 const fixed=new Map(),entries=[];let nodes=0,bestDepth=0,stop='';
 const key=(t,d,p)=>t+'|'+d+'|'+p;
 function subjectRule(i){const r=db.subjectRules?.[assignments[i].subjectId]||{};return r.stageId&&r.stageId!==sections[as[i]].stageId?{}:r.strict==='soft'?{}:r}
 function can(i,d,p,quota){const t=at[i],s=as[i],r=tRules[t],sr=subjectRule(i);if(t===undefined||s===undefined||p>quota[s][d]||p<1||remaining[i]<1)return false;if(busy.has(key(t,d,p))||used[s][d].has(p)||teacherDay[t][d]>=maxDaily[t])return false;if((r.unavailable?.[days[d].id]||[]).includes(p))return false;if(sr.noFirst&&p===1||sr.noLast&&p===quota[s][d]||sr.noRepeat&&entries.some(x=>x.sectionId===assignments[i].sectionId&&x.subjectId===assignments[i].subjectId&&x.dayId===days[d].id))return false;return true}
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
 function dfs(left){if(!left)return true;if((++nodes&511)===0){if(Date.now()>deadline){stop='time';return false}if(nodes%4096===0)self.postMessage({type:'progress',nodes,bestDepth:best,placed:entries.length,total})}if(entries.length>best)best=entries.length;
 let chosen=null,choices=null;
 for(const sl of ordered){if(used[sl.s][sl.d].has(sl.p))continue;const prior=sl.p===1||used[sl.s][sl.d].has(sl.p-1);if(!prior)continue;
 const pinned=fixed.get(sl.s+'|'+sl.d+'|'+sl.p);const choicesHere=(pinned!==undefined?[pinned]:assignmentBySection[sl.s]).filter(i=>can(i,sl.d,sl.p,quota));
 if(!choicesHere.length)return false;
 if(!choices||choicesHere.length<choices.length){chosen=sl;choices=choicesHere;if(choices.length===1)break}}
 if(!chosen)return false;
 choices.sort((a,b)=>{const ra=tRules[at[a]],rb=tRules[at[b]];const score=i=>{const r=tRules[at[i]],p=chosen.p,d=chosen.d;let available=0;for(let dd=0;dd<D;dd++)for(let pp=1;pp<=quota[as[i]][dd];pp++)if(!(r.unavailable?.[days[dd].id]||[]).includes(pp))available++;return available/(remaining[i]||1)+(assDay[i][d]?15:0)+((r.avoid||[]).includes(p)?3:0)-((r.preferred||[]).includes(p)?1:0)};return score(a)-score(b)});
 for(const i of choices){put(i,chosen.d,chosen.p,fixed.has(chosen.s+'|'+chosen.d+'|'+chosen.p));if(dfs(left-1))return true;undo();if(stop)return false}return false}
 if(dfs(total)){return {ok:true,entries:entries.map(({_i,_d,_p,...x})=>x),nodes,bestDepth:total,message:`تم توزيع ${total} حصة دون فراغات داخلية، مع تطبيق قيود المواد الإلزامية.`}}
 if(stop)break;
 // Ensure all search state was undone before trying a different daily distribution.
 while(entries.length)undo();
 }
 return {ok:false,reason:stop||'exhausted',nodes,bestDepth:best,total,message:`لم يُعثر على جدول متوافق خلال ${attempt} محاولة. تحقق من قيود المدرسين والمواد، خاصة الحصص الأولى والأخيرة. لم يتغير جدولك السابق.`};
}

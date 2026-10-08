 'use strict';
let db;
self.onmessage=e=>{if(e.data.type!=='start')return;db=e.data.db;try{self.postMessage({type:'result',result:generate()})}catch(err){self.postMessage({type:'result',result:{ok:false,reason:'exception',message:String(err.stack||err)}})}};
function generate(){
 const begin=Date.now(),deadline=begin+18000;
 const days=db.days.filter(d=>d.active&&d.periods>0).sort((a,b)=>a.order-b.order);
 const slots=[];for(let d=0;d<days.length;d++)for(let p=1;p<=days[d].periods;p++)slots.push({d,p,dayId:days[d].id,period:p});
 const assignments=db.assignments.filter(a=>+a.weeklyPeriods>0),A=assignments.length,S=slots.length;
 const teachers=[...new Set(assignments.map(a=>a.teacherId))],sections=[...new Set(assignments.map(a=>a.sectionId))];
 const ti=new Map(teachers.map((x,i)=>[x,i])),si=new Map(sections.map((x,i)=>[x,i]));
 const teacher=assignments.map(a=>ti.get(a.teacherId)),section=assignments.map(a=>si.get(a.sectionId));
 const remain=assignments.map(a=>+a.weeklyPeriods),placed=new Int16Array(A);
 const busyT=new Uint8Array(teachers.length*S),busyS=new Uint8Array(sections.length*S);
 const dayT=new Uint8Array(teachers.length*days.length),dayA=new Uint8Array(A*days.length);
 const rules=teachers.map(id=>db.teacherRules[id]||{});
 const max=rules.map(r=>Number.isFinite(+r.maxDaily)&&+r.maxDaily>0?+r.maxDaily:99);
 const available=teachers.map((id,t)=>slots.map((sl,k)=>(rules[t].unavailable?.[sl.dayId]||[]).includes(sl.period)?0:1));
 const candidates=assignments.map((a,i)=>slots.map((sl,k)=>available[teacher[i]][k]?k:-1).filter(k=>k>=0));
 const entries=[];let nodes=0,bestDepth=0,stop='',lastProgress=0;
 const valid=(i,k)=>{const sl=slots[k],t=teacher[i],sec=section[i];return !busyT[t*S+k]&&!busyS[sec*S+k]&&dayT[t*days.length+sl.d]<max[t]};
 function put(i,k,locked=false){const sl=slots[k],t=teacher[i],sec=section[i];busyT[t*S+k]=1;busyS[sec*S+k]=1;dayT[t*days.length+sl.d]++;dayA[i*days.length+sl.d]++;remain[i]--;placed[i]++;entries.push({assignmentId:assignments[i].id,teacherId:assignments[i].teacherId,sectionId:assignments[i].sectionId,subjectId:assignments[i].subjectId,dayId:sl.dayId,period:sl.period,locked,_i:i,_k:k});}
 function undo(){const e=entries.pop(),i=e._i,k=e._k,sl=slots[k],t=teacher[i],sec=section[i];busyT[t*S+k]=0;busyS[sec*S+k]=0;dayT[t*days.length+sl.d]--;dayA[i*days.length+sl.d]--;remain[i]++;placed[i]--;}
 for(const f of db.fixedLessons||[]){const i=assignments.findIndex(a=>a.id===f.assignmentId),k=slots.findIndex(s=>s.dayId===f.dayId&&s.period===f.period);if(i<0||k<0||!valid(i,k)||remain[i]<=0)return {ok:false,reason:'fixed-conflict',message:'تعارض في الحصص المثبتة أو في قيود المدرس.'};put(i,k,true)}
 const fixedCount=entries.length,total=remain.reduce((a,b)=>a+b,0)+fixedCount;
 function score(i,k){const sl=slots[k],t=teacher[i],r=rules[t],same=dayA[i*days.length+sl.d];let n=same*1000+dayT[t*days.length+sl.d]*7+sl.period*.3;
 if((r.preferred||[]).includes(sl.period))n-=35;if((r.avoid||[]).includes(sl.period))n+=35;
 if(r.consecutive==='prefer'||r.consecutive==='avoid'){let near=false;for(let j=0;j<slots.length;j++)if(sl.d===slots[j].d&&Math.abs(sl.period-slots[j].period)===1&&busyT[t*S+j]){near=true;break}if(near)n+=r.consecutive==='prefer'?-12:12}
 return n;
 }
 function dfs(left){if(left===0)return true;if(++nodes%256===0){if(Date.now()>=deadline){stop='time';return false}if(nodes-lastProgress>=2048){lastProgress=nodes;self.postMessage({type:'progress',nodes,placed:entries.length,total,elapsed:Date.now()-begin,bestDepth})}}
 if(entries.length>bestDepth)bestDepth=entries.length;
 let choice=-1,choiceSlots=null,best=Infinity;
 for(let i=0;i<A;i++)if(remain[i]>0){let opts=[];for(const k of candidates[i])if(valid(i,k))opts.push(k);
 if(opts.length<remain[i])return false;
 // slack per remaining lesson: choose most constrained group, not identical units
 const ratio=opts.length/remain[i];if(ratio<best){best=ratio;choice=i;choiceSlots=opts;if(ratio<=1)break}
 }
 if(choice<0)return true;
 choiceSlots.sort((a,b)=>score(choice,a)-score(choice,b));
 for(const k of choiceSlots){put(choice,k);if(dfs(left-1))return true;undo();if(stop)return false}
 return false;
 }
 const ok=dfs(total-fixedCount);
 if(ok){return {ok:true,entries:entries.map(({_i,_k,...x})=>x),nodes,bestDepth:total,message:`تم توزيع ${total} حصة مع احترام القيود الصلبة.`}}
 return {ok:false,reason:stop||'exhausted',nodes,bestDepth,total,message:stop?'انتهت مهلة البحث دون الوصول إلى جدول كامل. لم تتغير البيانات أو الجدول السابق.':'لم يجد المحرك حلاً ضمن البحث الحالي؛ افحص القيود والتكليفات.'};
}

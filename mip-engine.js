'use strict';
// محرك احتياطي: صياغة الجدول كمسألة برمجة صحيحة (MIP) وحلّها بـ HiGHS (WASM) محلياً داخل المتصفح.
// يُستدعى فقط حين يعجز البحث الخلفي (DFS) عن إيجاد حل ضمن حصته من الوقت.
let __highsP=null;
function loadHighs(){
 if(__highsP)return __highsP;
 __highsP=(async()=>{importScripts('highs-engine.js');return await Module({locateFile:f=>f})})();
 __highsP.catch(()=>{__highsP=null});
 return __highsP;
}
function mipBuild(db){
 const days=db.days.filter(d=>d.active&&d.periods>0).sort((a,b)=>a.order-b.order);
 const secs=new Map(db.sections.map(s=>[s.id,s]));
 const A=db.assignments.filter(a=>+a.weeklyPeriods>0);
 const cap=(s,d)=>{const v=db.stageDayPeriods?.[s.stageId]?.[d.id];return Math.min(d.periods,Math.max(0,v??d.periods))};
 const srule=(a,s)=>{const r=db.subjectRules?.[a.subjectId]||{};if(r.stageId&&r.stageId!==s.stageId)return {};if(r.strict==='soft')return {};return r};
 const adv=(a,s,d,p)=>advancedAllowed(db,a,s,d.id,p);
 const byT=new Map(),byS=new Map(),byA=A.map(()=>[]),byAD=new Map(),byTD=new Map(),allowedDays=[];
 const push=(m,k,v)=>{let l=m.get(k);if(!l)m.set(k,l=[]);l.push(v)};
 const names=new Map();const obj=[];const maxP=Math.max(...days.map(d=>d.periods));
 A.forEach((a,ai)=>{
  const s=secs.get(a.sectionId),r=db.teacherRules?.[a.teacherId]||{},sr=srule(a,s),av=new Set();
  for(const d of days){const c=cap(s,d);for(let p=1;p<=c;p++){
   if((r.unavailable?.[d.id]||[]).includes(p))continue;
   if(!adv(a,s,d,p))continue;
   if(sr.noFirst&&p===1)continue;if(sr.noLast&&p===c)continue;
   const n='x'+ai+'_'+d.id.replace(/\W/g,'_')+'_'+p;names.set(n,{ai,d:d.id,p});
   push(byT,a.teacherId+'|'+d.id+'|'+p,n);push(byS,a.sectionId+'|'+d.id+'|'+p,n);byA[ai].push(n);push(byAD,ai+'|'+d.id,n);push(byTD,a.teacherId+'|'+d.id,{n,p});av.add(d.id);
   let w=0;if((r.avoid||[]).includes(p))w+=1;if((r.preferred||[]).includes(p))w-=0.3;
   if(w)obj.push([w,n]);
  }}
  allowedDays[ai]=av.size;
 });
 const cons=[],bins=[...names.keys()],ints=[],conts=[],bounds=[];
 const sum=l=>l.join(' + ');
 for(const s of db.sections){const need=A.filter(a=>a.sectionId===s.id).reduce((n,a)=>n+ +a.weeklyPeriods,0);let tot=0;for(const d of days)tot+=cap(s,d);if(need>tot)throw new Error('capacity')}
 A.forEach((a,ai)=>{if(byA[ai].length<+a.weeklyPeriods)throw new Error('no-slots')});
 return {days,A,cap,srule,byT,byS,byA,byAD,byTD,allowedDays,names,obj,cons,bins,ints,conts,bounds,sum,maxP,secs};
}
async function mipSolveOnce(db,limitMs,post,opt){
 const M=mipBuild(db);if(!opt)M.obj.length=0;const {days,A,cap,srule,byS,byAD,byTD,allowedDays,names,obj,cons,bins,ints,conts,bounds,sum,maxP}=M;
 // الشعب غير الممتلئة: نستبدل = 1 بـ <= 1 ثم نفرض إجمالي الحصص (قيد الأسبوعي كافٍ)
 const need=new Map();for(const a of A)need.set(a.sectionId,(need.get(a.sectionId)||0)+ +a.weeklyPeriods);
 const looseSec=new Set();for(const s of db.sections){let tot=0;for(const d of days)tot+=cap(s,d);if((need.get(s.id)||0)<tot)looseSec.add(s.id)}
 // أعد قيود الأسبوعي (= عدد) كما هي لأنها لا تنتهي بـ = 1 إلا إذا كان العدد 1 — نعيدها صراحةً
 const final=[];
 A.forEach((a,ai)=>final.push(sum(M.byA[ai])+' = '+a.weeklyPeriods));
 for(const v of M.byT.values())if(v.length>1)final.push(sum(v)+' <= 1');
 for(const s of db.sections)for(const d of days)for(let p=1;p<=cap(s,d);p++){const v=byS.get(s.id+'|'+d.id+'|'+p);if(v)final.push(sum(v)+(looseSec.has(s.id)?' <= 1':' = 1'))}
 // أقصى/أدنى يومي للمدرس + فجوات
 let zc=0,fc=0;
 for(const [key,list] of byTD){
  const [tid,did]=key.split('|');const r=db.teacherRules?.[tid]||{};const mx=+r.maxDaily>0?+r.maxDaily:99,mn=Math.max(0,+r.minDaily||0);
  const ns=list.map(x=>x.n);
  final.push(sum(ns)+' <= '+mx);
  if(mn>1){const z='z'+(zc++);bins.push(z);final.push(sum(ns)+' - '+mn+' '+z+' >= 0');final.push(sum(ns)+' - '+ns.length+' '+z+' <= 0')}
  if(opt){const L='L'+fc,F='F'+fc,W='W'+fc;fc++;conts.push(L,F);bins.push(W);
  bounds.push(' 0 <= '+L+' <= '+maxP,' 0 <= '+F+' <= '+(maxP+maxP));
  final.push(F+' - '+L+' <= 0');
  for(const {n,p} of list){final.push(L+' - '+p+' '+n+' >= 0');final.push(F+' + '+maxP+' '+n+' <= '+(p+maxP));final.push(W+' - '+n+' >= 0')}
  obj.push([1,L],[-1,F],[1,W])}
 }
 // التكرار اليومي
 let ec=0;
 A.forEach((a,ai)=>{
  const s=M.secs.get(a.sectionId),sr=M.srule(a,s),es=[];
  for(const d of days){const v=byAD.get(ai+'|'+d.id);if(!v)continue;
   if(sr.noRepeat){if(v.length>1)final.push(sum(v)+' <= 1')}
   else if(v.length>1){const e='e'+(ec++);ints.push(e);bounds.push(' 0 <= '+e+' <= '+maxP);es.push(e);final.push(sum(v)+' - '+e+' <= 1');if(opt)obj.push([2,e])}}
  const ar=Math.max(0,+a.weeklyPeriods-allowedDays[ai]);
  if(es.length)final.push(sum(es)+' <= '+ar);
 });
 // الحصص المثبتة
 for(const f of db.fixedLessons||[]){
  const ai=A.findIndex(a=>a.id===f.assignmentId);if(ai<0)continue;
  const n=[...names.entries()].find(([k,v])=>v.ai===ai&&v.d===f.dayId&&v.p===+f.period);
  if(!n)throw new Error('fixed-conflict');
  final.push(n[0]+' = 1');
 }
 // حصص الشعب المقفلة من إعادة التوليد الجزئي تُمرر عبر fixedLessons أيضاً
 const lp='Minimize\n obj: '+(obj.length?obj.map(([w,n])=>(w<0?'- ':'+ ')+Math.abs(w)+' '+n).join(' '):'0 '+bins[0])+'\nSubject To\n'+final.map((c,i)=>' c'+i+': '+c).join('\n')+'\nBounds\n'+bounds.join('\n')+'\nGeneral\n '+(ints.length?ints.join(' '):'')+'\nBinary\n '+bins.join('\n ')+'\nEnd\n';
 post({type:'phase',phase:'تحميل المحرك الرياضي الاحتياطي (HiGHS) وحل النموذج'});
 const highs=await loadHighs();
 const secs=Math.max(5,Math.floor(limitMs/1000));
 const sol=highs.solve(lp,{time_limit:secs,mip_rel_gap:0.02,presolve:'on',threads:1});
 if(!sol||!sol.Columns)return {ok:false,status:sol&&sol.Status};
 const out=[];
 for(const [n,m] of names){const c=sol.Columns[n];if(c&&c.Primal>0.5){const a=A[m.ai];out.push({assignmentId:a.id,teacherId:a.teacherId,sectionId:a.sectionId,subjectId:a.subjectId,dayId:m.d,period:m.p,locked:false})}}
 return {ok:out.length>0,entries:out,status:sol.Status};
}

function mipGaps(entries){const m=new Map();for(const e of entries){const k=e.teacherId+'|'+e.dayId;let o=m.get(k);if(!o)m.set(k,o={a:99,b:0,n:0});o.a=Math.min(o.a,e.period);o.b=Math.max(o.b,e.period);o.n++}let g=0;for(const o of m.values())g+=o.b-o.a+1-o.n;return g}
async function mipSolve(db,limitMs,post){
 const t0=Date.now();
 const first=await mipSolveOnce(db,Math.min(limitMs,40000),post,false);
 if(!first.ok)return first;
 const left=limitMs-(Date.now()-t0)-3000;
 if(left>=8000){
  post({type:'phase',phase:'تم إيجاد جدول صالح؛ تحسينه لتقليل الفجوات والتكرار'});
  try{const better=await mipSolveOnce(db,Math.min(left,35000),post,true);
   if(better.ok&&mipGaps(better.entries)<=mipGaps(first.entries)&&validateExistingSchedule({...db,timetable:better.entries}).ok)return better}catch(e){}
 }
 return first;
}

'use strict';
let db;
function rule(tid){return db.teacherRules[tid]||{unavailable:{},preferred:[],avoid:[],maxDaily:7,consecutive:'neutral'};}
function slotKey(dayId,period){return dayId+'|'+period;}
self.onmessage=e=>{if(e.data.type!=='start')return;db=e.data.db;try{const result=generateTimetable();self.postMessage({type:'result',result});}catch(err){self.postMessage({type:'result',result:{ok:false,reason:'exception',message:'خطأ داخل المحرك: '+err.message}});}};
function generateTimetable(){
 const started=Date.now();


  const slots=[];
  db.days.filter(d=>d.active&&d.periods>0).sort((a,b)=>a.order-b.order).forEach(d=>{
    for(let p=1;p<=d.periods;p++)slots.push({dayId:d.id,period:p,dayOrder:d.order});
  });
  let nodes=0,limit=35000,deadline=Date.now()+12000,stopReason='';
  const entries=[],teacherBusy=new Set(),sectionBusy=new Set(),asgCount={},asgDays={};
  db.assignments.forEach(a=>{asgCount[a.id]=0;asgDays[a.id]={}});

  function canPlace(a,sl){
    const r=rule(a.teacherId),k=slotKey(sl.dayId,sl.period);
    if((r.unavailable[sl.dayId]||[]).includes(sl.period))return false;
    if(teacherBusy.has(a.teacherId+'|'+k)||sectionBusy.has(a.sectionId+'|'+k))return false;
    const daily=entries.filter(e=>e.teacherId===a.teacherId&&e.dayId===sl.dayId).length;
    if(daily>=Math.max(1,+r.maxDaily||99))return false;
    return true;
  }
  function place(a,sl,locked=false){
    const k=slotKey(sl.dayId,sl.period);
    entries.push({id:'ent_'+entries.length+'_'+nodes,assignmentId:a.id,teacherId:a.teacherId,subjectId:a.subjectId,sectionId:a.sectionId,dayId:sl.dayId,period:sl.period,locked});
    teacherBusy.add(a.teacherId+'|'+k);sectionBusy.add(a.sectionId+'|'+k);
    asgCount[a.id]++;asgDays[a.id][sl.dayId]=(asgDays[a.id][sl.dayId]||0)+1;
  }
  // fixed first
  for(const f of db.fixedLessons){
    const a=db.assignments.find(x=>x.id===f.assignmentId),d=db.days.find(x=>x.id===f.dayId);
    if(!a||!d)return {ok:false,message:'توجد حصة مثبتة غير صالحة.'};
    const sl={dayId:f.dayId,period:f.period,dayOrder:d.order};
    if(!canPlace(a,sl))return {ok:false,message:'تعذر تطبيق إحدى الحصص المثبتة بسبب تعارض أو قيد.'};
    place(a,sl,true);
  }

  // remaining lesson units, hardest first
  let units=[];
  db.assignments.forEach(a=>{
    for(let i=asgCount[a.id];i<a.weeklyPeriods;i++)units.push(a);
  });
  const possibleCount=a=>slots.filter(sl=>canPlace(a,sl)).length;
  units.sort((a,b)=>possibleCount(a)-possibleCount(b));

  function score(a,sl){
    const r=rule(a.teacherId); let s=0;
    const sameDay=asgDays[a.id][sl.dayId]||0;
    if(sameDay)s+=1000*sameDay; // strongly avoid repeated subject/section same day
    if(r.preferred.includes(sl.period))s-=35;
    if(r.avoid.includes(sl.period))s+=35;
    const teacherDay=entries.filter(e=>e.teacherId===a.teacherId&&e.dayId===sl.dayId);
    if(teacherDay.length){
      const adjacent=teacherDay.some(e=>Math.abs(e.period-sl.period)===1);
      if(r.consecutive==='prefer'&&adjacent)s-=20;
      if(r.consecutive==='avoid'&&adjacent)s+=20;
      const ps=teacherDay.map(e=>e.period).concat(sl.period).sort((x,y)=>x-y);
      s+=(Math.max(...ps)-Math.min(...ps)+1-ps.length)*12; // gaps
    }
    s+=teacherDay.length*4; // load spreading
    s+=sl.period*.2;
    return s;
  }

  function solve(idx){
    if(idx>=units.length)return true;
    if(++nodes>limit){stopReason='nodes';return false;}
    if((nodes&127)===0){if(Date.now()>deadline){stopReason='time';return false;} if((nodes&1023)===0)self.postMessage({type:'progress',nodes,placed:entries.length,total:units.length+db.fixedLessons.length,elapsed:Date.now()-started});}
    // dynamic MRV: choose remaining unit with fewest candidates
    let best=idx,bestC=null;
    for(let i=idx;i<units.length;i++){
      const a=units[i],c=slots.filter(sl=>canPlace(a,sl));
      if(!bestC||c.length<bestC.length){best=i;bestC=c;if(c.length===0)break}
    }
    [units[idx],units[best]]=[units[best],units[idx]];
    const a=units[idx],cands=(best===idx&&bestC?bestC:slots.filter(sl=>canPlace(a,sl))).sort((x,y)=>score(a,x)-score(a,y));
    for(const sl of cands){
      place(a,sl,false);
      if(solve(idx+1))return true;
      if(stopReason)return false;
      const e=entries.pop(),k=slotKey(e.dayId,e.period);
      teacherBusy.delete(a.teacherId+'|'+k);sectionBusy.delete(a.sectionId+'|'+k);
      asgCount[a.id]--;asgDays[a.id][sl.dayId]--; if(!asgDays[a.id][sl.dayId])delete asgDays[a.id][sl.dayId];
    }
    [units[idx],units[best]]=[units[best],units[idx]];
    return false;
  }
  const ok=solve(0);
  if(!ok)return {ok:false,reason:stopReason||'exhausted',message:stopReason?'توقف البحث عند حد الوقت أو عدد المحاولات؛ هذا لا يعني أن الجدول مستحيل.':'استُنفدت احتمالات البحث ضمن النموذج الحالي دون حل.',nodes};
  return {ok:true,message:`تم إنشاء ${entries.length} حصة بنجاح.`,nodes,entries};
}


'use strict';
/* نيبور — مقارنة نسختين من بيانات المدرسة (نسخة سحابية سابقة مقابل الحالية).
   MASAR_DIFF.compare(قديم, جديد) تُعيد ملخصاً: فروق الأعداد، المدرسون/الشعب المضافة والمحذوفة، والحصص المضافة/المحذوفة/المنقولة.
   دالة نقية لا تغيّر أي بيانات. */
(function(){
const arr=x=>Array.isArray(x)?x:[];
const nameMap=(s,k)=>new Map(arr(s&&s[k]).map(x=>[x.id,x.name||x.id]));
function names(a,b,k){
 const A=nameMap(a,k),B=nameMap(b,k);
 return {added:[...B].filter(([i])=>!A.has(i)).map(x=>x[1]),removed:[...A].filter(([i])=>!B.has(i)).map(x=>x[1])};
}
function compare(oldS,newS){
 oldS=oldS||{};newS=newS||{};
 const cnt=k=>({old:arr(oldS[k]).length,now:arr(newS[k]).length});
 const T=nameMap(newS,'teachers'),T0=nameMap(oldS,'teachers'),S=nameMap(newS,'sections'),S0=nameMap(oldS,'sections'),
  SU=nameMap(newS,'subjects'),SU0=nameMap(oldS,'subjects'),D=nameMap(newS,'days'),D0=nameMap(oldS,'days');
 const tn=(m,m0,id)=>m.get(id)||m0.get(id)||'؟';
 const A=new Map(arr(oldS.timetable).map(e=>[e.id,e])),B=new Map(arr(newS.timetable).map(e=>[e.id,e]));
 const desc=e=>tn(T,T0,e.teacherId)+' · '+tn(S,S0,e.sectionId)+' · '+tn(SU,SU0,e.subjectId);
 const slot=e=>tn(D,D0,e.dayId)+' ح'+e.period;
 const added=[],removed=[],moved=[];
 for(const [id,e] of B){const o=A.get(id);if(!o)added.push(desc(e)+' ← '+slot(e));else if(o.dayId!==e.dayId||+o.period!==+e.period)moved.push(desc(e)+': '+slot(o)+' ← '+slot(e))}
 for(const [id,e] of A)if(!B.has(id))removed.push(desc(e)+' ('+slot(e)+')');
 return {
  counts:{lessons:cnt('timetable'),teachers:cnt('teachers'),sections:cnt('sections'),subjects:cnt('subjects'),assignments:cnt('assignments')},
  teachers:names(oldS,newS,'teachers'),sections:names(oldS,newS,'sections'),
  lessons:{added,removed,moved},
  schoolName:{old:(oldS.school||{}).name||'',now:(newS.school||{}).name||''},
  same:!added.length&&!removed.length&&!moved.length&&cnt('teachers').old===cnt('teachers').now&&cnt('sections').old===cnt('sections').now&&
   JSON.stringify(oldS.teacherRules||{})===JSON.stringify(newS.teacherRules||{})&&JSON.stringify(oldS.teacherStatus||{})===JSON.stringify(newS.teacherStatus||{})
 };
}
window.MASAR_DIFF={compare};
})();

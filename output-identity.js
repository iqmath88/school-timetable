'use strict';
/* هوية مخرجات «مسار»: ورقة عاجية بترويسة بيضاء وشريط عنابي وخط ذهبي رفيع، وجداول بتدرجات دافئة.
   تُطبَّق فوق أنماط الطباعة القديمة دون تغيير في بيانات الجدول، ولا تمس وضع الأبيض والأسود. */
(function(){
const C={wine:'#0F2A75',wine2:'#1E3FA3',gold:'#C8A24A',ink:'#0B1633',muted:'#5B6B8C',ivory:'#F1F5FC',tint:'#E6EDFA',tint2:'#F4F7FD',line:'#C9D4EA'};

const U=n=>new URL(n,location.href).href;
const AR='U+0600-06FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE80-FEFC',LA='U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2212,U+FEFF,U+FFFD';
const FF=(fam,w,f,r)=>`@font-face{font-family:"${fam}";font-weight:${w};font-display:block;src:url(${U(f)}) format("woff2");unicode-range:${r}}`;
const FONT_CSS=[['El Messiri',500,'messiri',''],['El Messiri',700,'messiri',''],['IBM Plex Sans Arabic',400,'plex',''],['IBM Plex Sans Arabic',500,'plex',''],['IBM Plex Sans Arabic',700,'plex','']].map(([fam,w,k])=>FF(fam,w,'font-'+k+'-ar-'+w+'.woff2',AR)+FF(fam,w,'font-'+k+'-la-'+w+'.woff2',LA)).join('');
const BODYF='"IBM Plex Sans Arabic",Tahoma,Arial,sans-serif',HEADF='"El Messiri","IBM Plex Sans Arabic",Tahoma,serif';
const mark=(s=9)=>window.MASAR_MARK?window.MASAR_MARK(s):'';
const NB=':not(.print-bw)';
const CSS=FONT_CSS+`
/* ===== هوية مخرجات مسار ===== */
html,body,table,td,th{font-family:${BODYF}}
.formal-center h1,.formal-center h2,.formal-center h3,.tc-brand h1,.tc-school,.tc-person h2,.print-signatures b,.tc-signatures b{font-family:${HEADF}!important}
.formal-center h2,.tc-brand h1{font-weight:700}
html,body{color:${C.ink}!important}
@media screen{body{background:#E6ECF7!important}.print-sheet{filter:drop-shadow(0 10px 24px #0A1F4D14)!important}}
.school-print-page${NB} .formal-head{position:relative!important;background:#fff!important;box-shadow:none!important;border:0!important;border-top:1.6mm solid ${C.wine}!important;border-bottom:.45mm solid ${C.gold}!important;border-radius:0!important}
.school-print-page${NB} .formal-center h1{color:${C.wine}!important;font-weight:900!important;letter-spacing:0!important}
.school-print-page${NB} .formal-center h2{color:${C.ink}!important;font-weight:900!important}
.school-print-page${NB} .formal-center h3{color:${C.gold}!important;font-weight:800!important}
.school-print-page${NB} .formal-side,.school-print-page${NB} .formal-side small{color:${C.muted}!important}
.school-print-page${NB} .formal-side b{color:${C.wine}!important}
.mo-mark{display:inline-block;vertical-align:middle;margin-inline-end:2mm}
.mo-mark svg{width:8mm!important;height:8mm!important;display:block}
.school-print-page${NB} table.compact-timetable thead th,.school-print-page${NB} th.corner-cell{background:${C.wine}!important;color:#fff!important;border-color:${C.gold}!important}
.school-print-page${NB} table.compact-timetable thead tr.section-names th{background:${C.tint}!important;color:${C.wine}!important;border-color:${C.line}!important;font-weight:900!important}
.school-print-page${NB} table.compact-timetable tbody th,.school-print-page${NB} table.compact-timetable tbody td{border-color:${C.line}!important}
.school-print-page${NB} table.compact-timetable .period-number{background:${C.tint}!important;color:${C.wine}!important}
.school-print-page${NB} table.compact-timetable .day-label{background:${C.wine2}!important;color:#fff!important}
.school-print-page${NB} table.compact-timetable td.lesson .lesson-inline b{color:${C.ink}!important}
.school-print-page${NB} table.compact-timetable td.lesson small{color:${C.muted}!important}
.school-print-page${NB} table.compact-timetable tbody tr:has(.day-label)>td,.school-print-page${NB} table.compact-timetable tbody tr:has(.day-label)>th{border-top:.5mm solid ${C.gold}!important}
.school-print-page${NB} .print-footer{border-top:.5mm solid ${C.gold}!important;color:${C.ink}!important}
.school-print-page${NB} .print-reasons{background:${C.tint2}!important;border-color:${C.line}!important}
.school-print-page${NB} .print-signatures b{color:${C.wine}!important}
.print-sheet:not(.school-print-page) .formal-head{background:#fff!important;border-top:1.6mm solid ${C.wine}!important;border-bottom:.45mm solid ${C.gold}!important}
.print-sheet:not(.school-print-page) .formal-head *{color:${C.ink}!important}
.print-sheet:not(.school-print-page) .formal-center h1{color:${C.wine}!important}
.print-sheet:not(.school-print-page) .formal-center h3{color:${C.gold}!important}
.print-sheet:not(.school-print-page) thead th{background:${C.wine}!important;color:#fff!important;border-color:${C.gold}!important}
.print-sheet:not(.school-print-page) .period-number{background:${C.tint}!important;color:${C.wine}!important}
/* بطاقة المدرس */
.teacher-card:not(.tc-bw){border-top:1.6mm solid ${C.wine}!important;background:#fff}
.teacher-card:not(.tc-bw) .tc-head{background:#fff!important;border-bottom:.45mm solid ${C.gold}!important;color:${C.ink}!important}
.teacher-card:not(.tc-bw) .tc-head *{color:${C.muted}!important}
.teacher-card:not(.tc-bw) .tc-school{color:${C.gold}!important}
.teacher-card:not(.tc-bw) .tc-brand h1{color:${C.wine}!important}
.teacher-card:not(.tc-bw) .tc-side b{color:${C.wine}!important}
.teacher-card:not(.tc-bw) .tc-person{background:${C.tint2}!important;border-color:${C.line}!important}
.teacher-card:not(.tc-bw) .tc-person h2{color:${C.ink}!important}
.teacher-card:not(.tc-bw) .tc-stats>div{border-color:${C.line}!important}
.teacher-card:not(.tc-bw) .tc-stats b{color:${C.wine}!important}
.teacher-card:not(.tc-bw) .tc-table th,.teacher-card:not(.tc-bw) .tc-table td{border-color:${C.line}!important}
.teacher-card:not(.tc-bw) .tc-table thead th{background:${C.wine}!important;color:#fff!important;border-color:${C.gold}!important}
.teacher-card:not(.tc-bw) .tc-period{background:${C.tint}!important;color:${C.wine}!important}
.teacher-card:not(.tc-bw) .tc-lesson{background:${C.tint2}!important}
.teacher-card:not(.tc-bw) .tc-lesson strong{color:${C.ink}!important}
.teacher-card:not(.tc-bw) .tc-lesson span{color:${C.muted}!important}
.teacher-card:not(.tc-bw) .tc-off{background:#E9EEF8!important;color:#8F9BB5!important}
.teacher-card:not(.tc-bw) .tc-reasons{border-top-color:${C.gold}!important}
.teacher-card:not(.tc-bw) .tc-signatures b{color:${C.wine}!important}
.teacher-card:not(.tc-bw) .tc-bottom{color:${C.muted}!important}
.teacher-card{height:164mm!important;max-height:164mm!important;overflow:hidden!important;break-inside:avoid!important}
.teacher-card .tc-head{min-height:26mm!important;padding:2mm 6mm!important}
.teacher-card .tc-person{min-height:20mm!important;margin:2mm 0!important;padding:2mm 5mm!important}
.teacher-card .tc-signatures{min-height:12mm!important;padding:1mm 0!important}
.teacher-card .tc-signatures span{margin-top:2mm!important}
.teacher-card .tc-reasons{min-height:8mm!important}
.teacher-card .tc-table tbody tr{height:10.5mm!important}
.teacher-card .tc-bottom .mo-mark svg{width:4.5mm!important;height:4.5mm!important}
`;

/* ملاءمة تلقائية للطباعة (Safari/iPad): منع التفاف الحصص وإبقاء كل مرحلة في صفحة واحدة */
const FIT=`function masarFit(){
 var st=document.createElement('style');st.textContent='.school-print-page table.compact-timetable td.lesson .lesson-inline b,.school-print-page table.compact-timetable td.lesson small,.school-print-page table.compact-timetable td.lesson .lesson-sep{font-size:var(--lf,12px)!important}.school-print-page table.compact-timetable td.lesson{white-space:nowrap!important}';document.head.appendChild(st);
 var limit=Math.round(285*3.7795);
 document.querySelectorAll('.school-print-page').forEach(function(sh){
  var cells=[].slice.call(sh.querySelectorAll('td.lesson'));
  function over(){for(var i=0;i<cells.length;i++){if(cells[i].scrollWidth>cells[i].clientWidth+1)return true}return false}
  var size=12.4;sh.style.setProperty('--lf',size+'px');
  while(over()&&size>6){size-=.25;sh.style.setProperty('--lf',size+'px')}
  var rh=6.6;sh.style.setProperty('--row-h',rh+'mm');
  var hd=document.documentElement.style;
  while(sh.getBoundingClientRect().height>limit&&rh>4.2){rh-=.2;sh.style.setProperty('--row-h',rh+'mm')}
 });
}`;

/* ===== هوية جدول الحصص على الشاشة + ألوان مراحل متناغمة ===== */
const STAGE_PAL=['#1E3FA3','#C8A24A','#0E7490','#3B6FE0','#6D5BD0','#2F855A'];
window.MASAR_STAGE_PAL=STAGE_PAL;
const SCREEN=`@media screen{
.tt-wrap table.timetable{border-collapse:separate;border-spacing:0;background:#fff;border:1px solid ${C.line};border-radius:14px;overflow:hidden;box-shadow:0 8px 24px #0A1F4D12}
.tt-wrap table.timetable thead th{background:${C.wine}!important;color:#fff!important;border:0!important;border-inline-start:1px solid #ffffff26!important;font-weight:800}
.tt-wrap table.timetable thead tr.section-names th{background:${C.tint}!important;color:${C.wine}!important;border-bottom:2px solid ${C.gold}!important;border-inline-start:1px solid ${C.line}!important}
.tt-wrap table.timetable tbody th,.tt-wrap table.timetable tbody td{border-color:${C.line}!important}
.tt-wrap table.timetable td.lesson{color:${C.ink};background-color:${C.tint2};}
.tt-wrap table.timetable td.lesson b{color:${C.ink};font-weight:800}
.tt-wrap table.timetable td.lesson small{color:${C.muted};font-weight:600}
.tt-wrap table.timetable td.lesson .lesson-sep{display:none}
.tt-wrap table.timetable .day-label,.tt-wrap table.timetable th.day-label{background:${C.wine2}!important;color:#fff!important}
.tt-wrap table.timetable .period-number{background:${C.tint}!important;color:${C.wine}!important;font-weight:900}
.tt-wrap table.timetable td:not(.lesson){background:#fff}
}`;
const stl=document.createElement('style');stl.id='mo-screen';stl.textContent=SCREEN;document.head.appendChild(stl);
const otb=window.timetableTable;
if(typeof otb==='function')window.timetableTable=function(){let h=otb.apply(this,arguments);
 try{(db.stages||[]).slice().sort((a,b)=>(a.order||0)-(b.order||0)).forEach((g,i)=>{if(g.color){const re=new RegExp(g.color.replace(/[#.]/g,'\\$&'),'gi');h=h.replace(re,STAGE_PAL[i%STAGE_PAL.length])}})}catch(e){}
 return h};
window.MASAR_OUT={C,css:()=>CSS,fontCss:()=>FONT_CSS+`html,body{font-family:${BODYF}}h1,h2,h3{font-family:${HEADF}}`,mark,FIT};
const OPEN=window.open;
window.open=function(){const w=OPEN.apply(this,arguments);
 try{if(w&&w.document&&!w.__masarFit){w.__masarFit=1;const dw=w.document.write.bind(w.document);
  w.document.write=function(h){if(typeof h==='string'&&h.includes('window.print()')){const fit=h.includes('school-print-page');h=h.replace(/window\.onload=\(\)=>setTimeout\(\(\)=>window\.print\(\),(\d+)\)/,(m,n)=>'window.onload=()=>{var go=function(){setTimeout(function(){'+(fit?'try{masarFit()}catch(e){}':'')+'window.print()},'+n+')};try{document.fonts.ready.then(go)}catch(e){go()}}');if(fit)h=h.replace('<script>','<script>'+FIT+';',1)}return dw(h)}}}catch(e){}
 return w};
const wrap=(n)=>{const o=window[n];if(typeof o!=='function')return;window[n]=function(){return o.apply(this,arguments)+CSS}};
wrap('premiumPrintCSS');wrap('premiumTeacherCSS');
const oh=window.formalHeader;
if(typeof oh==='function')window.formalHeader=function(){const h=oh.apply(this,arguments);return h.replace('<div class="formal-side">','<div class="formal-side"><span class="mo-mark">'+mark(32)+'</span>')};
/* بطاقة المدرس: شعار مسار صغير أسفل البطاقة */
const ot=window.teacherCard;
if(typeof ot==='function')window.teacherCard=function(){const h=ot.apply(this,arguments);return h.replace(/<div class="tc-bottom">/,'<div class="tc-bottom"><span class="mo-mark" style="margin-inline-end:1mm">'+mark(16)+'</span>')};
})();

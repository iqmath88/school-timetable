'use strict';
/* هوية مخرجات «مسار»: ورقة عاجية بترويسة بيضاء وشريط عنابي وخط ذهبي رفيع، وجداول بتدرجات دافئة.
   تُطبَّق فوق أنماط الطباعة القديمة دون تغيير في بيانات الجدول، ولا تمس وضع الأبيض والأسود. */
(function(){
const C={wine:'#561228',wine2:'#7B1E3A',gold:'#B8893B',ink:'#2B1B22',muted:'#7A6A70',ivory:'#F6F1E8',tint:'#F3EBDD',tint2:'#FBF6EC',line:'#D8CDBE'};
const mark=(s=9)=>window.MASAR_MARK?window.MASAR_MARK(s):'';
const NB=':not(.print-bw)';
const CSS=`
/* ===== هوية مخرجات مسار ===== */
html,body{color:${C.ink}!important}
@media screen{body{background:#EDE6DA!important}.print-sheet{filter:drop-shadow(0 10px 24px #4a142414)!important}}
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
.teacher-card:not(.tc-bw) .tc-off{background:#EFE8DC!important;color:#A89C92!important}
.teacher-card:not(.tc-bw) .tc-reasons{border-top-color:${C.gold}!important}
.teacher-card:not(.tc-bw) .tc-signatures b{color:${C.wine}!important}
.teacher-card:not(.tc-bw) .tc-bottom{color:${C.muted}!important}
`;
window.MASAR_OUT={C,css:()=>CSS,mark};
const wrap=(n)=>{const o=window[n];if(typeof o!=='function')return;window[n]=function(){return o.apply(this,arguments)+CSS}};
wrap('premiumPrintCSS');wrap('premiumTeacherCSS');
const oh=window.formalHeader;
if(typeof oh==='function')window.formalHeader=function(){const h=oh.apply(this,arguments);return h.replace('<div class="formal-side">','<div class="formal-side"><span class="mo-mark">'+mark(32)+'</span>')};
/* بطاقة المدرس: شعار مسار صغير أسفل البطاقة */
const ot=window.teacherCard;
if(typeof ot==='function')window.teacherCard=function(){const h=ot.apply(this,arguments);return h.replace(/<div class="tc-bottom">/,'<div class="tc-bottom"><span class="mo-mark" style="margin-inline-end:1mm">'+mark(16)+'</span>')};
})();

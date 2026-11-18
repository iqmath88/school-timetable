'use strict';
/* هوية المخرجات الرسمية (v0.9.39.0): ورقة بيضاء، خط نسخ رسمي (Noto Naskh Arabic) وعناوين بخط أميري،
   ترويسة رسمية بلا خلفية ملونة وخط مزدوج أسفلها، جداول بحدود داكنة رفيعة ورؤوس رمادية فاتحة.
   لا شعار للتطبيق في أي مخرج، ولا رابط في ذيل الصفحة (هوامش الصفحة صفر فلا يطبع المتصفح الرابط والتاريخ).
   تُطبَّق فوق أنماط الطباعة القديمة دون تغيير في بيانات الجدول. */
(function(){
const C={navy:'#13294B',goldL:'#B8924A',ink:'#111111',ink2:'#1F2D3D',muted:'#3C4654',line:'#55606E',line2:'#8A939E',head:'#E3E8EE',head2:'#F1F4F7',soft:'#F7F8FA',
 /* أسماء قديمة يستعملها كود الشاشة أدناه */ wine:'#0F2A75',wine2:'#1E3FA3',gold:'#C8A24A',ivory:'#F1F5FC',tint:'#E6EDFA',tint2:'#F4F7FD'};

const U=n=>new URL(n,location.href).href;
/* Safari يطبع الرابط والتاريخ في رأس/ذيل الورقة دائماً ويحجز لهما مساحة، فنترك هامشاً أكبر حتى لا ينقسم الجدول على صفحتين */
const SAF=(()=>{try{const u=navigator.userAgent;return /Safari/.test(u)&&!/Chrome|Chromium|CriOS|FxiOS|EdgiOS|Android/.test(u)}catch(e){return false}})();
const AR='U+0600-06FF,U+0750-077F,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FEFC',LA='U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2212,U+FEFF,U+FFFD';
const FF=(fam,w,f,r)=>`@font-face{font-family:"${fam}";font-weight:${w};font-style:normal;font-display:block;src:url(${U(f)}) format("woff2");unicode-range:${r}}`;
const FONT_CSS=[['Noto Naskh Arabic',400,'naskh'],['Noto Naskh Arabic',700,'naskh'],['Amiri',700,'amiri']].map(([fam,w,k])=>FF(fam,w,'font-'+k+'-ar-'+w+'.woff2',AR)+FF(fam,w,'font-'+k+'-la-'+w+'.woff2',LA)).join('')
 /* خط الخلايا: Noto Sans Arabic — حروفه أطول وأوضح فيبدو أكبر عند الطباعة بالحجم نفسه */
 +`@font-face{font-family:"Noto Sans Arabic";font-weight:400 600;font-display:block;src:url(${U('font-nsans-ar-500.woff2')}) format("woff2");unicode-range:${AR}}@font-face{font-family:"Noto Sans Arabic";font-weight:700;font-display:block;src:url(${U('font-nsans-ar-700.woff2')}) format("woff2");unicode-range:${AR}}`;
const CELLF='"Noto Sans Arabic","Noto Naskh Arabic",Tahoma,sans-serif';
const BODYF='"Noto Naskh Arabic","Simplified Arabic","Traditional Arabic",Tahoma,serif',HEADF='"Amiri","Noto Naskh Arabic","Traditional Arabic",serif';
/* الخطوط متاحة في الصفحة الرئيسية أيضاً، لأن تصدير الصورة وPDF يرسم بها على لوحة canvas */
try{const fs=document.createElement('style');fs.id='mo-fonts';fs.textContent=FONT_CSS;document.head.appendChild(fs)}catch(e){}
const mark=()=>'';
const S='.school-print-page',T='table.compact-timetable';
const CSS=FONT_CSS+`
/* ===== المخرجات الرسمية ===== */
html,body,table,td,th,small,b,strong,span,div,p,h1,h2,h3,article{font-family:${BODYF}!important}
html,body{color:${C.ink}!important;background:#fff!important}
@media screen{body{background:#E9ECF0!important}.print-sheet,.teacher-card{filter:none!important;box-shadow:0 2px 14px #0000001f!important;background:#fff!important}}
.mo-mark{display:none!important}

/* --- الترويسة --- */
.print-sheet .formal-head{display:grid!important;grid-template-columns:1fr 2.6fr 1fr!important;align-items:center!important;background:#fff!important;box-shadow:none!important;border:0!important;border-bottom:1.1mm double ${C.ink2}!important;border-radius:0!important;color:${C.ink}!important;padding:1mm 3mm 1.2mm!important}
.print-sheet .formal-head *{color:${C.ink}!important;text-shadow:none!important}
.print-sheet .formal-center{text-align:center!important}
.print-sheet .formal-center h1{font-family:${HEADF}!important;font-weight:700!important;letter-spacing:0!important;color:${C.ink}!important}
.print-sheet .formal-center h2{font-weight:700!important;color:${C.ink2}!important}
.print-sheet .formal-center h3{font-weight:700!important;color:${C.muted}!important}
.print-sheet .formal-side{font-weight:700!important;line-height:1.55!important}
.print-sheet .formal-side small{font-weight:400!important}
.print-sheet .formal-side b{font-weight:700!important}
.print-sheet .formal-side:first-child{text-align:right!important}
.print-sheet .formal-side:last-child{text-align:left!important}
${S} .formal-head{height:24mm!important;min-height:24mm!important;max-height:24mm!important;margin:0 0 2mm!important}
${S} .formal-center h1{font-size:17pt!important;line-height:1.25!important}
${S} .formal-center h2{font-size:13pt!important;line-height:1.25!important}
${S} .formal-center h3{font-size:9.5pt!important;line-height:1.25!important}
${S} .formal-side,${S} .formal-side small{font-size:8.5px!important}

/* --- جدول المدرسة / المراحل --- */
${S} ${T} th,${S} ${T} td{border:.2mm solid ${C.line2}!important}
${S} ${T} thead th,${S} th.corner-cell{background:${C.head}!important;color:${C.ink}!important;border-color:${C.line}!important;font-weight:700!important}
${S} ${T} thead tr.stage-groups th{background:${C.head}!important;font-size:9.5px!important}
${S} ${T} thead tr.section-names th{background:${C.head2}!important;color:${C.ink}!important;border-color:${C.line}!important;font-weight:700!important}
${S} th.corner-cell{background:#fff!important}
${S} ${T} .day-label{background:${C.head2}!important;color:${C.ink}!important;border-color:${C.line}!important}
${S} ${T} .vertical-day{font-weight:700!important;font-size:11.5px!important}
${S} ${T} .period-number{background:${C.soft}!important;color:${C.ink}!important;font-weight:700!important}
${S} ${T} tbody tr:has(.day-label)>td,${S} ${T} tbody tr:has(.day-label)>th{border-top:.55mm solid ${C.ink2}!important}
${S} ${T} td.lesson{border-top:.2mm solid ${C.line2}!important;padding:0 .4mm!important}
${S} ${T} tbody tr:has(.day-label)>td.lesson{border-top:.55mm solid ${C.ink2}!important}
${S} ${T} td.lesson .lesson-inline{display:block!important;line-height:1.08!important}
${S} ${T} td.lesson .lesson-inline b,${S} ${T} td.lesson b{display:block!important;font-weight:700!important;color:${C.ink}!important;line-height:1.12!important}
${S} ${T} td.lesson small{display:block!important;font-weight:400!important;color:${C.muted}!important;line-height:1.12!important;margin-top:.1mm!important}
${S} ${T} td.lesson .lesson-sep{display:none!important}
${S} ${T} td.tt-off,${S} ${T} td.tt-empty{color:#A5ADB7!important}
.no-colors td.lesson{background:#fff!important}

/* --- التذييل: ملاحظات وتواقيع --- */
.print-sheet .print-footer{border-top:.3mm solid ${C.ink2}!important;color:${C.ink}!important}
${S} .print-footer{height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important;padding:1mm 2mm 0!important}
${S} .print-reasons{min-height:9mm!important;padding:1mm 2.4mm!important;margin-top:1.5mm!important;font-size:8.5px!important}
${S} .print-signatures{margin-top:2.5mm!important}
${S} .print-signatures b{font-size:10.5px!important}
${S} .print-signatures span{font-size:9px!important;margin-top:2.5mm!important}
.print-sheet .print-reasons{background:#fff!important;border:.2mm solid ${C.line2}!important;border-radius:0!important}
.print-sheet .print-reasons strong{font-weight:700!important}
.print-sheet .print-signatures b{color:${C.ink}!important;font-weight:700!important}
.print-sheet .print-signatures span{color:${C.muted}!important}

/* --- جدول شعبة واحدة (A4 أفقي) --- */
html .print-single-section .formal-head{height:auto!important;min-height:30mm!important;max-height:none!important;margin-bottom:5mm!important}
html .print-single-section .formal-center h1{font-size:25pt!important}
html .print-single-section .formal-center h2{font-size:18pt!important}
html .print-single-section .formal-center h3{font-size:15pt!important}
html .print-single-section .formal-side,html .print-single-section .formal-side small,html .print-single-section .formal-side b{font-size:14px!important}
html .print-single-section .tt-wrap{margin:0!important}
html .print-single-section table.timetable.focused{border-collapse:collapse!important;width:100%!important}
html .print-single-section table.timetable.focused th,html .print-single-section table.timetable.focused td{border:.3mm solid ${C.line}!important;color:${C.ink}!important;height:21mm!important;padding:1mm!important}
html .print-single-section table.timetable.focused thead th{background:${C.head}!important;color:${C.ink}!important;font-weight:700!important;font-size:19px!important;height:12mm!important}
html .print-single-section table.timetable.focused tbody th{background:${C.head2}!important;font-weight:700!important;font-size:17px!important;width:30mm!important}
html .print-single-section table.timetable.focused td.lesson{background:#fff!important}
html .print-single-section table.timetable.focused td.lesson b{display:block!important;font-size:21px!important;font-weight:700!important;line-height:1.35!important}
html .print-single-section table.timetable.focused td.lesson small{display:block!important;font-size:16.5px!important;font-weight:400!important;color:${C.muted}!important;line-height:1.35!important;margin-top:.8mm!important}
html .print-single-section table.timetable.focused td.tt-off,html .print-single-section table.timetable.focused td.tt-empty{color:#A5ADB7!important}
html .print-single-section .lock-mark{display:none!important}
html .print-single-section .print-reasons{font-size:12px!important;min-height:12mm!important}
html .print-single-section .print-signatures b{font-size:14px!important}
html .print-single-section .print-signatures span{font-size:12px!important;margin-top:4mm!important}

/* --- بطاقة المدرس --- */
.teacher-card{border:0!important;border-top:0!important;background:#fff!important}
.teacher-card .tc-head{display:grid!important;background:#fff!important;border-bottom:1.1mm double ${C.ink2}!important;box-shadow:none!important;color:${C.ink}!important;min-height:26mm!important;padding:1mm 3mm!important}
.teacher-card .tc-head *{color:${C.ink}!important;text-shadow:none!important}
.teacher-card .tc-side{font-weight:700!important;font-size:10.5px!important;line-height:1.6!important}
.teacher-card .tc-side small,.teacher-card .tc-subtitle{font-weight:400!important}
.teacher-card .tc-school{font-family:${HEADF}!important;font-size:19px!important;font-weight:700!important}
.teacher-card .tc-brand h1{font-size:17px!important;font-weight:700!important;margin:.5mm 0!important}
.teacher-card .tc-subtitle{font-size:10px!important;color:${C.muted}!important}
.teacher-card .tc-person{background:#fff!important;border:.25mm solid ${C.line2}!important;border-radius:0!important;margin:2.5mm 0!important;padding:2mm 4mm!important;min-height:20mm!important}
.teacher-card .tc-label{color:${C.muted}!important;font-size:10px!important}
.teacher-card .tc-person h2{font-family:${HEADF}!important;color:${C.ink}!important;font-size:21px!important;font-weight:700!important;margin:.5mm 0 1mm!important}
.teacher-card .tc-specialty{font-size:11px!important}
.teacher-card .tc-stats>div{border:.25mm solid ${C.line2}!important;border-radius:0!important;background:#fff!important}
.teacher-card .tc-stats b{color:${C.ink}!important;font-weight:700!important}
.teacher-card .tc-stats span{color:${C.muted}!important}
.teacher-card .tc-table th,.teacher-card .tc-table td{border:.25mm solid ${C.line}!important}
.teacher-card .tc-table thead th{background:${C.head}!important;color:${C.ink}!important;border-color:${C.line}!important;font-weight:700!important;font-size:13px!important;height:9mm!important}
.teacher-card .tc-period{background:${C.head2}!important;color:${C.ink}!important;font-weight:700!important}
.teacher-card .tc-lesson{background:#fff!important}
.teacher-card .tc-lesson strong{color:${C.ink}!important;font-weight:700!important;font-size:13.5px!important;line-height:1.3!important}
.teacher-card .tc-lesson span{color:${C.muted}!important;font-size:11px!important;margin-top:.5mm!important}
.teacher-card .tc-off{background:${C.soft}!important;color:#A5ADB7!important}
.teacher-card .tc-reasons{border-top:.3mm solid ${C.ink2}!important;font-size:10.5px!important}
.teacher-card .tc-reasons span{color:${C.ink}!important}
.teacher-card .tc-signatures b{color:${C.ink}!important;font-weight:700!important;font-size:11.5px!important}
.teacher-card .tc-signatures span{color:${C.muted}!important}
.teacher-card .tc-bottom{display:none!important}
.teacher-card{height:196mm!important;max-height:196mm!important;overflow:hidden!important;break-inside:avoid!important}
.teacher-card .tc-table tbody tr{height:auto!important}

/* ===== خط الخلايا الأوضح ===== */
table.compact-timetable td,table.compact-timetable th,table.compact-timetable td *,table.compact-timetable th *,
table.timetable.focused td,table.timetable.focused th,table.timetable.focused td *,
.teacher-card .tc-table td,.teacher-card .tc-table th,.teacher-card .tc-table td *{font-family:${CELLF}!important}
/* ===== مساحة أكبر للجدول في ورقة المدرسة: ترويسة وتذييل مضغوطان ===== */
${S}:not(.print-single-section) .formal-head{height:19mm!important;min-height:19mm!important;max-height:19mm!important;margin-bottom:1.5mm!important;padding-top:0!important;padding-bottom:.6mm!important}
${S}:not(.print-single-section) .formal-center h1{font-size:16pt!important;line-height:1.15!important}
${S}:not(.print-single-section) .formal-center h2{font-size:12pt!important;line-height:1.15!important}
${S}:not(.print-single-section) .formal-center h3{font-size:9pt!important;line-height:1.15!important}
${S}:not(.print-single-section) .print-footer{display:grid!important;grid-template-columns:1fr 2.2fr!important;gap:4mm!important;align-items:center!important;padding-top:1mm!important}
${S}:not(.print-single-section) .print-reasons{min-height:0!important;margin:0!important;padding:.8mm 2mm!important}
${S}:not(.print-single-section) .print-signatures{margin-top:0!important}
${S}:not(.print-single-section) .print-signatures span{margin-top:1.2mm!important}
${S} ${T} td.lesson{padding:.2mm .4mm!important}
${S} ${T} td.lesson .lesson-inline{line-height:1!important}
/* ===== لوحة الألوان الموحّدة (تطابق outputPalette في app.js) =====
   الكحلي لصف العناوين فقط، عمود الأيام فاتح، خط ذهبي أوضح، ونمط أبيض وأسود عبر print-bw / tc-bw */
*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
.print-sheet,.teacher-card{--nv:#13294B;--gd:#B8924A;--tc:#24364F;--dy:#E9EDF3;--pr:#F6F3EC;--sh:#E7ECF4}
.print-sheet.print-bw,.teacher-card.tc-bw{--nv:#1A1A1A;--gd:#8C8C8C;--tc:#2E2E2E;--dy:#EDEDED;--pr:#F6F6F6;--sh:#E6E6E6}
.print-sheet.print-bw td.lesson,.teacher-card.tc-bw .tc-lesson{background:#fff!important}
html .print-sheet.print-bw .formal-head,html .teacher-card.tc-bw .tc-head{background:#fff!important}
.print-sheet .formal-head{border-bottom:.9mm solid var(--nv)!important;box-shadow:0 1.8mm 0 -.9mm var(--gd)!important}
.print-sheet .formal-center h1{color:var(--nv)!important}
${S} ${T} thead tr.stage-groups th{background:var(--nv)!important;color:#fff!important;border-color:var(--nv)!important;font-size:11px!important;letter-spacing:.2px}
${S} ${T} thead tr.section-names th{background:var(--sh)!important;color:var(--nv)!important;font-size:10.5px!important}
${S} th.corner-cell{background:var(--nv)!important;border-color:var(--nv)!important}
${S} ${T} .day-label{background:var(--dy)!important;color:var(--nv)!important;border-color:${C.line2}!important}
${S} ${T} .day-label *{color:var(--nv)!important}
${S} ${T} .vertical-day{font-size:13px!important;letter-spacing:.3px;font-weight:700!important}
${S} ${T} .period-number{background:var(--pr)!important;color:var(--nv)!important;font-size:10.5px!important}
${S} ${T} tbody tr:has(.day-label)>td,${S} ${T} tbody tr:has(.day-label)>th,${S} ${T} tbody tr:has(.day-label)>td.lesson{border-top:.6mm solid var(--nv)!important}
${S} ${T} td.lesson b{color:#0E1726!important}
${S} ${T} td.lesson small{color:var(--tc)!important;font-weight:600!important;opacity:1!important}
html .print-single-section table.timetable.focused thead th{background:var(--nv)!important;color:#fff!important;border-color:var(--nv)!important}
html .print-single-section table.timetable.focused tbody th{background:var(--pr)!important;color:var(--nv)!important}
html .print-single-section table.timetable.focused td.lesson small{color:var(--tc)!important;font-weight:600!important;font-size:17.5px!important}
.teacher-card .tc-head{border-bottom:.9mm solid var(--nv)!important;box-shadow:0 1.8mm 0 -.9mm var(--gd)!important}
.teacher-card .tc-school,.teacher-card .tc-person h2{color:var(--nv)!important}
.teacher-card .tc-table thead th{background:var(--nv)!important;color:#fff!important;border-color:var(--nv)!important}
.teacher-card .tc-period{background:var(--pr)!important;color:var(--nv)!important}
.teacher-card .tc-lesson span{color:var(--tc)!important;font-weight:600!important;font-size:12px!important}
.teacher-card .tc-person{border-right:1.2mm solid var(--gd)!important}
`;

/* هوامش الصفحة صفر: بذلك لا يطبع المتصفح الرابط والتاريخ وعنوان الصفحة في الرأس والتذييل.
   الهامش الفعلي يُعاد داخل كل ورقة بحشوة، مع مراعاة تكبير/تصغير الورقة (zoom) المستعمل لتبديل A3/A4. */
function pageMarginCSS(h){
 const single=/class="[^"]*print-single-section/.test(h),m=/html\{zoom:([\d.]+)\}/.exec(h);
 /* جدول الشعبة يُطبع دائماً على A4 أفقي ومصمم بمقياس 0.7071، مهما كان حجم الورق المختار للجدول العام */
 const z=single?.7071:(m?+m[1]||1:1),mm=v=>(v/z).toFixed(2)+'mm';
 /* بطاقة المدرس مصممة على A4؛ عند A3 يكبّرها zoom كاملة، لذلك ارتفاعها بوحدات A4 دون قسمة على z */
 const cardH=SAF?178:204;
 return `<style id="mo-page">@page{margin:0}html,body{margin:0!important;padding:0!important}${single?'html{zoom:.7071!important}':''}
.print-sheet{padding:${mm(5)} ${mm(6)}!important;box-sizing:border-box!important}
.print-single-section{padding:${mm(8)} ${mm(9)}!important}
.teacher-card{padding:6mm 7mm!important;box-sizing:border-box!important;height:${cardH}mm!important;max-height:${cardH}mm!important}
tr,td,th{break-inside:avoid!important;page-break-inside:avoid!important}
@media print{.print-sheet,.teacher-card{box-shadow:none!important}}
@media screen{.print-sheet,.teacher-card{margin:0 auto 6mm!important}}</style>`;
}

/* ملاءمة تلقائية لجدول المدرسة: سطر للمادة وسطر للمدرس دون التفاف، وكل مجموعة مراحل في صفحة واحدة */
const FIT=`function masarFit(){
 /* أحجام صريحة بالبكسل (لا var/calc) لأن Safari لا يطبّقها دائماً عند الطباعة. القياس بـ Range لعرض النص الفعلي. */
 var z=parseFloat(getComputedStyle(document.documentElement).zoom)||1,limit=(297-${SAF?44:4}/z)*3.7795;
 document.querySelectorAll('.school-print-page').forEach(function(sh,ix){
  if(sh.classList.contains('print-single-section'))return;
  sh.setAttribute('data-fit',ix);
  var st=document.createElement('style');document.head.appendChild(st);
  var sel='html body .school-print-page[data-fit="'+ix+'"] table.compact-timetable tbody td.lesson';
  var cells=[].slice.call(sh.querySelectorAll('table.compact-timetable td.lesson'));
  var cols=sh.querySelectorAll('thead tr.section-names th').length;
  var size=cols&&cols<=8?22:19,rh=0;
  function apply(){st.textContent=sel+' b{font-size:'+size.toFixed(2)+'px!important;line-height:1.08!important}'+sel+' small{font-size:'+(size*.92).toFixed(2)+'px!important;line-height:1.08!important}'+sel+'{white-space:nowrap!important;height:'+(rh?rh.toFixed(2)+'mm':'auto')+'!important}'+'html body .school-print-page[data-fit="'+ix+'"] table.compact-timetable tbody tr,html body .school-print-page[data-fit="'+ix+'"] table.compact-timetable tbody td,html body .school-print-page[data-fit="'+ix+'"] table.compact-timetable tbody th{height:'+(rh?rh.toFixed(2)+'mm':'auto')+'!important;min-height:0!important;max-height:none!important}';sh.style.setProperty('--row-h',rh?rh.toFixed(2)+'mm':'0mm')}
  var rg=document.createRange();
  var cv=document.createElement('canvas').getContext('2d');function textW(el){if(!el)return 0;var cs=getComputedStyle(el);cv.font=cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;return cv.measureText(el.textContent||'').width}
  function wide(){for(var i=0;i<cells.length;i++){var c=cells[i],r=c.clientWidth-4;if(r<=0)continue;if(textW(c.querySelector('b'))>r||textW(c.querySelector('small'))>r)return true}return false}
  apply();
  /* 1) أكبر خط يتسع عرضاً وارتفاعاً (الصفوف بارتفاع المحتوى) */
  var n=0;while((wide()||sh.offsetHeight>limit)&&size>7&&n++<200){size-=.25;apply()}
  /* 2) توزيع المساحة الباقية على الصفوف ليملأ الجدول الورقة */
  var tr=sh.querySelector('table.compact-timetable tbody tr');
  if(tr){rh=tr.offsetHeight/3.7795;apply();n=0;while(sh.offsetHeight<=limit&&n++<300){rh+=.1;apply()}rh-=.1;apply()}
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
  w.document.write=function(h){if(typeof h==='string'&&h.includes('window.print()')){const fit=h.includes('school-print-page');
   h=h.replace(/window\.onload=\(\)=>setTimeout\(\(\)=>window\.print\(\),(\d+)\)/,(m,n)=>'window.onload=()=>{var go=function(){setTimeout(function(){'+(fit?'try{masarFit()}catch(e){}':'')+'window.print()},'+n+')};try{document.fonts.ready.then(go)}catch(e){go()}}');
   if(fit)h=h.replace('<script>','<script>'+FIT+';',1);
   if(/<\/head>/i.test(h))h=h.replace(/<\/head>/i,m=>pageMarginCSS(h)+m);else h=h.replace('<body>',pageMarginCSS(h)+'<body>');
  }return dw(h)}}}catch(e){}
 return w};
const wrap=(n)=>{const o=window[n];if(typeof o!=='function')return;window[n]=function(){return o.apply(this,arguments)+CSS}};
wrap('premiumPrintCSS');wrap('premiumTeacherCSS');
/* لا شعار للتطبيق في المخرجات: لم يعد يُحقن شعار في الترويسة أو أسفل بطاقة المدرس. */
})();

/* مسار 0.9.30 — الحساب السحابي مع مزامنة تلقائية بين الأجهزة.
   المبدأ: لا يُكتب فوق بيانات أحد بصمت. كل رفع مشروط برقم المراجعة (يرفضه الخادم إن تغيّرت السحابة)،
   وكل استبدال محلي يسبقه نسخة أمان، والتعارض يُعرض عليك لتختار. لا مفاتيح سرية في المتصفح. */
(()=>{'use strict';
const M=window.MStore;
const rd=k=>{try{return JSON.parse(M.getItem(k)||'null')}catch{return null}},wr=(k,v)=>{try{v==null?M.removeItem(k):M.setItem(k,JSON.stringify(v))}catch{}};
const cfg0=window.MASAR_CLOUD_CONFIG||{},cfgS=rd('masar-cloud-cfg')||{};
const base=String(cfg0.url||cfgS.url||'').replace(/\/$/,''),key=String(cfg0.anonKey||cfgS.anonKey||'');
const configured=/^https:\/\/[^/]+\.supabase\.co$/.test(base)&&key.length>20;
const SK='masar-cloud-session-v1',YK='masar-sync-state';
let session=rd(SK),sync=rd(YK)||{school:null,rev:null,hash:null,auto:true,last:0,name:'',role:''};
let schools=[],status='off',statusMsg='',conflict=null,pushing=false,pulling=false,timer=null,applying=false,historyOK=true;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const log=(k,m)=>{try{window.MasarLog&&MasarLog.add(k,m)}catch{}};
const saveSync=()=>{wr(YK,sync);try{window.dispatchEvent(new Event('masar-sync-state'))}catch(e){}},persist=()=>wr(SK,session);
const fnv=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)+s.length.toString(36)};
const bridge=()=>window.MASAR_CLOUD_BRIDGE;
const hashNow=()=>fnv(JSON.stringify(bridge().exportData()));
const ROLE_AR={owner:'مالك',admin:'مدير',deputy:'وكيل',teacher:'مدرس'};
const canWrite=()=>['owner','admin','deputy'].includes(sync.role);
const canManage=()=>sync.role==='owner'||sync.role==='admin';
const active=()=>configured&&session&&sync.school&&sync.auto&&!conflict;

const shell=document.createElement('div');shell.id='masar-cloud-panel';shell.hidden=true;document.body.appendChild(shell);
const openBtn=document.createElement('button');openBtn.id='cloudOpen';openBtn.type='button';document.querySelector('.topbar')?.appendChild(openBtn);openBtn.onclick=()=>show();
const toast=(t,bad)=>{const d=document.createElement('div');d.setAttribute('role','status');d.style.cssText='position:fixed;inset-inline:12px;bottom:14px;z-index:10000;background:'+(bad?'#FFF1EF':'#FFFDF9')+';color:#2B1B22;border:1px solid #E3D7CA;border-top:3px solid '+(bad?'#B3261E':'#B8893B')+';border-radius:12px;box-shadow:0 10px 30px #4a142433;padding:10px 14px;font:14px/1.6 Tajawal,Tahoma,sans-serif;max-width:560px;margin-inline:auto';d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),5200)};
function setStatus(s,m=''){status=s;statusMsg=m;
 const L={off:'☁ الحساب والمدارس',ok:'☁ متزامن ✓',busy:'☁ جارٍ المزامنة…',dirty:'☁ بانتظار الرفع',offline:'☁ غير متصل',conflict:'⚠ تعارض — اضغط للحل',err:'⚠ تعذرت المزامنة',login:'☁ سجّل الدخول',ro:'☁ قراءة فقط ✓'};
 openBtn.textContent=L[s]||L.off;openBtn.dataset.sync=s;openBtn.title=m||'';
 if(!shell.hidden&&shell.dataset.screen==='main')paintStatus()}
function paintStatus(){const e=shell.querySelector('#syncLine');if(!e)return;const T={ok:'متزامن مع السحابة',busy:'جارٍ المزامنة…',dirty:'توجد تعديلات ستُرفع خلال لحظات',offline:'غير متصل — سترفع التعديلات عند عودة الاتصال',conflict:'تعارض: تغيّر الجدول من جهاز آخر',err:'تعذرت المزامنة',ro:'حسابك للقراءة فقط: تصلك التحديثات ولا ترفع',off:'غير مرتبط'};e.textContent=(T[status]||'')+(statusMsg?' — '+statusMsg:'')+(sync.last?' · آخر مزامنة '+new Date(sync.last).toLocaleTimeString('ar-IQ'):'')}

async function req(path,method='GET',data,auth=true,extra={}){
 const headers={'apikey':key,'Content-Type':'application/json',...extra};if(auth&&session?.access_token)headers.Authorization='Bearer '+session.access_token;
 const res=await fetch(base+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data)});const raw=await res.text();let val;try{val=raw?JSON.parse(raw):null}catch{val=raw}
 if(!res.ok)throw Error(val?.msg||val?.error_description||val?.message||val?.error||('HTTP '+res.status));return {value:val,headers:res.headers}}
async function refresh(){if(!session?.refresh_token)throw Error('يرجى تسجيل الدخول');const r=await req('/auth/v1/token?grant_type=refresh_token','POST',{refresh_token:session.refresh_token},false);session=r.value;persist()}
async function authed(path,method='GET',data,extra={}){try{return await req(path,method,data,true,extra)}catch(e){
 if(/JWT expired|invalid JWT|token is expired/i.test(e.message)&&session?.refresh_token){try{await refresh()}catch(e2){session=null;persist();setStatus('login');throw Error('انتهت الجلسة، سجّل الدخول من جديد')}return req(path,method,data,true,extra)}throw e}}
const online=()=>navigator.onLine!==false;
const back=()=>encodeURIComponent(location.origin+location.pathname.replace(/[^/]*$/,''));

async function list(){const r=await authed('/rest/v1/school_members?select=school_id,role,teacher_ref,schools(id,name)&order=created_at.asc');
 schools=(r.value||[]).filter(x=>x.schools).map(x=>({id:x.school_id,name:x.schools.name,role:x.role,teacherRef:x.teacher_ref||''}));
 const cur=schools.find(x=>x.id===sync.school);if(cur){sync.role=cur.role;sync.name=cur.name;sync.teacherRef=cur.teacherRef;saveSync()}else if(sync.school&&schools.length&&online()){/* لم تعد عضواً */sync.school=null;sync.rev=null;sync.hash=null;saveSync()}}
async function remoteMeta(){const r=await authed('/rest/v1/school_states?school_id=eq.'+encodeURIComponent(sync.school)+'&select=revision,updated_at');return r.value?.[0]||null}
async function remoteFull(){const r=await authed('/rest/v1/school_states?school_id=eq.'+encodeURIComponent(sync.school)+'&select=payload,revision,updated_at');return r.value?.[0]||null}

/* ---------- الرفع ---------- */
function schedulePush(){if(applying||!active())return;if(!canWrite()){return}setStatus(online()?'dirty':'offline');clearTimeout(timer);timer=setTimeout(push,4000)}
async function push(){
 if(!active()||pushing||!canWrite())return;if(!online()){setStatus('offline');return}
 const data=bridge().exportData(),h=fnv(JSON.stringify(data));if(h===sync.hash){setStatus('ok');return}
 pushing=true;setStatus('busy');
 try{const r=await authed('/rest/v1/rpc/save_masar_school_state','POST',{p_school_id:sync.school,p_expected_revision:sync.rev,p_payload:data});
  sync.rev=r.value;sync.hash=h;sync.last=Date.now();saveSync();setStatus('ok')}
 catch(e){if(/Revision conflict/i.test(e.message))await raiseConflict();else{setStatus(online()?'err':'offline',e.message);log('sync','push: '+e.message)}}
 finally{pushing=false;if(active()&&canWrite()&&!conflict&&hashNow()!==sync.hash&&status==='ok')schedulePush()}}

/* ---------- السحب ---------- */
async function pull(){
 if(!configured||!session||!sync.school||pulling||pushing||applying)return;if(!online()){if(sync.auto)setStatus('offline');return}
 pulling=true;
 try{const rem=await remoteMeta();if(!rem){if(canWrite())schedulePush();return}
  if(rem.revision===sync.rev){if(canWrite()&&hashNow()!==sync.hash&&sync.auto&&!conflict)schedulePush();else if(!conflict)setStatus(canWrite()?'ok':'ro');return}
  if(!sync.auto)return;
  const dirty=sync.hash==null||hashNow()!==sync.hash;
  if(!dirty||!canWrite()){await applyRemote(true)}else{conflict={rev:rem.revision};setStatus('conflict');showConflict()}}
 catch(e){setStatus(online()?'err':'offline',e.message);log('sync','pull: '+e.message)}finally{pulling=false}}
async function applyRemote(announce){
 const rem=await remoteFull();if(!rem)throw Error('لا توجد بيانات سحابية');
 applying=true;try{bridge().importData(rem.payload)}finally{applying=false}
 sync.rev=rem.revision;sync.hash=hashNow();sync.last=Date.now();saveSync();conflict=null;setStatus(canWrite()?'ok':'ro');
 if(announce)toast('حُدّث الجدول من السحابة (تعديل من جهاز آخر). حُفظت نسخة أمان من بياناتك السابقة.')}

/* ---------- التعارض ---------- */
async function raiseConflict(){try{const rem=await remoteMeta();conflict={rev:rem?rem.revision:null}}catch{conflict={rev:null}}setStatus('conflict');showConflict()}
function ask(title,body,buttons){return new Promise(res=>{shell.hidden=false;shell.dataset.screen='ask';
 shell.innerHTML=`<div class="cloud-card"><h2>${esc(title)}</h2><div>${body}</div><div class="actions">${buttons.map((b,i)=>`<button data-i="${i}" class="${b.cls||''}">${esc(b.t)}</button>`).join('')}</div></div>`;
 shell.querySelectorAll('button[data-i]').forEach(b=>b.onclick=()=>res(+b.dataset.i))})}
async function showConflict(){
 const c=await ask('تعارض بين هذا الجهاز والسحابة','<p>تغيّر الجدول في السحابة من جهاز آخر، وفي هذا الجهاز تعديلات لم تُرفع بعد. لن يُكتب فوق أيٍّ منهما دون اختيارك.</p><p class="muted">اعتماد السحابة: تُحفظ نسخة من بيانات هذا الجهاز في «نسخ الجدول» قبل الاستبدال.<br>اعتماد نسختك: تحل محل السحابة (وتبقى نسخة السحابة السابقة في السجل السحابي إن فعّلت ملف الترقية).</p>',
  [{t:'اعتماد نسخة السحابة',cls:''},{t:'اعتماد نسختي (استبدال السحابة)',cls:'secondary'},{t:'قرر لاحقاً',cls:'secondary'}]);
 if(c===0){try{await applyRemote(false);toast('تم اعتماد نسخة السحابة.');shell.hidden=true}catch(e){toast(e.message,true);shell.hidden=true}}
 else if(c===1){try{const rem=await remoteMeta();sync.rev=rem?rem.revision:null;conflict=null;saveSync();shell.hidden=true;await push();toast('اعتُمدت نسختك ورُفعت إلى السحابة.')}catch(e){toast(e.message,true);shell.hidden=true}}
 else shell.hidden=true}

/* ---------- الربط ---------- */
async function linkSchool(id){
 sync={...sync,school:id,rev:null,hash:null,auto:true};const s=schools.find(x=>x.id===id);sync.role=s?.role||'';sync.name=s?.name||'';sync.teacherRef=s?.teacherRef||'';saveSync();conflict=null;
 let rem=null;try{rem=await remoteFull()}catch(e){toast(e.message,true);return}
 const localHas=(()=>{const d=bridge().exportData();return (d.timetable||[]).length>0||(d.sections||[]).length>0||(d.teachers||[]).length>0})();
 if(!rem){if(!canWrite()){toast('لا توجد بيانات سحابية بعد، وحسابك للقراءة فقط.',true);return}
  const c=await ask('رفع بيانات هذا الجهاز','<p>المدرسة السحابية فارغة. سترفع بيانات هذا الجهاز لتصير هي الأصل، وتتزامن بقية الأجهزة معها.</p>',[{t:'رفع بيانات هذا الجهاز'},{t:'إلغاء',cls:'secondary'}]);
  if(c!==0){sync.school=null;saveSync();shell.hidden=true;return}
  shell.hidden=true;await push();return}
 if(!localHas||!canWrite()){await applyRemote(false);toast('رُبط الجهاز وسُحبت بيانات المدرسة.');shell.hidden=true;return}
 const c=await ask('أي نسخة تعتمد؟','<p>في السحابة بيانات لهذه المدرسة، وفي هذا الجهاز بيانات أيضاً. اختر الأصل؛ الأخرى لن تضيع: تُحفظ نسخة محلية قبل السحب، أو يبقى سجل سحابي قبل الرفع.</p>',[{t:'اعتماد بيانات السحابة'},{t:'اعتماد بيانات هذا الجهاز',cls:'secondary'},{t:'إلغاء الربط',cls:'secondary'}]);
 if(c===0){await applyRemote(false);toast('رُبط الجهاز وسُحبت بيانات السحابة.');shell.hidden=true}
 else if(c===1){sync.rev=rem.revision;saveSync();shell.hidden=true;await push();toast('رُفعت بيانات هذا الجهاز.')}
 else{sync.school=null;sync.rev=null;sync.hash=null;saveSync();setStatus(session?'off':'login');shell.hidden=true}}
function unlink(){sync={school:null,rev:null,hash:null,auto:true,last:0,name:'',role:''};conflict=null;saveSync();setStatus(session?'off':'login')}

/* ---------- السجل السحابي ---------- */
const fmtT=t=>t?new Date(t).toLocaleString('ar-IQ'):'—';
async function loadHistory(){
 /* الأفضل: دالة السجل (مع الكاتب والملخص)؛ وإن لم تُركَّب ترقية 0.9.35 نرجع للاستعلام القديم */
 try{const r=await authed('/rest/v1/rpc/list_masar_history','POST',{p_school_id:sync.school});if(Array.isArray(r.value))return {rows:r.value,rich:true}}
 catch(e){if(!/list_masar_history|PGRST202|404|not find|Could not|Not permitted/i.test(String(e&&e.message)))throw e}
 const r=await authed('/rest/v1/school_state_history?school_id=eq.'+encodeURIComponent(sync.school)+'&select=id,revision,saved_at&order=revision.desc&limit=20');
 return {rows:(r.value||[]).map(x=>({id:x.id,revision:x.revision,is_current:false,author_email:null,at:null,replaced_at:x.saved_at})),rich:false}
}
async function showHistory(){
 let H;try{H=await loadHistory()}catch(e){historyOK=false;toast('السجل السحابي غير مفعّل: شغّل ملف SUPABASE_UPGRADE_0.9.30.sql',true);return}
 const rows=H.rows;
 shell.dataset.screen='hist';
 const line=r=>{
  const who=r.author_email?esc(r.author_email):'كاتب غير معروف';
  const when=r.is_current?fmtT(r.at):(r.at?fmtT(r.at):'استُبدلت '+fmtT(r.replaced_at));
  const sum=H.rich?` · ${esc(r.lessons)} حصة · ${esc(r.teachers)} مدرس · ${esc(r.sections)} شعبة`:'';
  return `<div class="hrow" style="border-bottom:1px solid #D9E1F2;padding:8px 0"><div><b>مراجعة ${esc(r.revision)}${r.is_current?' (الحالية)':''}</b><br><span class="muted">${who} — ${esc(when)}${sum}</span></div>${r.is_current?'':`<div class="actions"><button class="secondary" data-c="${esc(r.id)}">مقارنة بالحالية</button><button class="secondary" data-h="${esc(r.id)}">استعادة</button></div>`}</div>`};
 shell.innerHTML=`<div class="cloud-card"><h2>نسخ سحابية سابقة</h2><p class="muted">كل مرة تُستبدل فيها نسخة السحابة تُحفظ السابقة هنا (آخر 20) مع من حفظها ومتى. «مقارنة» تعرض الفروق بينها وبين بيانات هذا الجهاز دون تغيير أي شيء. الاستعادة تسحبها إلى هذا الجهاز بعد حفظ نسخة أمان.${H.rich?'':' <b>لعرض الكاتب والملخص شغّل ملف SUPABASE_UPGRADE_0.9.35.sql.</b>'}</p>${rows.length?`<div style="max-height:46vh;overflow:auto">${rows.map(line).join('')}</div>`:'<div class="notice">لا توجد نسخ سابقة بعد.</div>'}<div id="hDiff"></div><div class="actions"><button class="secondary" id="hBack">رجوع</button></div></div>`;
 shell.querySelector('#hBack').onclick=()=>show();
 const getPayload=async id=>{const r=await authed('/rest/v1/school_state_history?id=eq.'+encodeURIComponent(id)+'&select=payload');const p=r.value?.[0]?.payload;if(!p)throw Error('تعذر قراءة النسخة');return p};
 shell.querySelectorAll('[data-c]').forEach(b=>b.onclick=async()=>{try{
  const old=await getPayload(b.dataset.c),now=bridge().exportData(),d=window.MASAR_DIFF.compare(old,now),box=shell.querySelector('#hDiff');
  const list=(t,a)=>a.length?`<p><b>${t} (${a.length})</b></p><ul style="margin:0;padding-inline-start:18px;max-height:140px;overflow:auto">${a.slice(0,40).map(x=>`<li>${esc(x)}</li>`).join('')}${a.length>40?`<li>… و${a.length-40} أخرى</li>`:''}</ul>`:'';
  const c=d.counts;
  box.innerHTML=`<div class="notice" style="margin-top:10px"><b>مقارنة المراجعة المحددة (قديمة) ← بيانات هذا الجهاز (الحالية)</b><br>${d.same?'لا فروق في الحصص والمدرسين والشعب والقيود.':`الحصص: ${esc(c.lessons.old)} ← ${esc(c.lessons.now)} · المدرسون: ${esc(c.teachers.old)} ← ${esc(c.teachers.now)} · الشعب: ${esc(c.sections.old)} ← ${esc(c.sections.now)}`}${list('حصص أُضيفت',d.lessons.added)}${list('حصص حُذفت',d.lessons.removed)}${list('حصص نُقلت',d.lessons.moved)}${list('مدرسون أُضيفوا',d.teachers.added)}${list('مدرسون حُذفوا',d.teachers.removed)}${list('شعب أُضيفت',d.sections.added)}${list('شعب حُذفت',d.sections.removed)}</div>`;
  box.scrollIntoView({block:'nearest'})}catch(e){toast(e.message,true)}});
 shell.querySelectorAll('[data-h]').forEach(b=>b.onclick=async()=>{try{const p=await getPayload(b.dataset.h);if(!(await masarConfirm('استعادة هذه النسخة؟ تُحفظ نسخة أمان من بياناتك الحالية أولاً، ثم تُرفع المستعادة كمراجعة جديدة.')))return;
  applying=true;try{bridge().importData(p)}finally{applying=false}shell.hidden=true;await push();toast('تمت الاستعادة.')}catch(e){toast(e.message,true)}})}


/* ---------- الأعضاء والصلاحيات ---------- */
const ROLE_HELP={admin:'مدير: كل الصلاحيات عدا تغيير المالك',deputy:'وكيل: يعدّل الجدول ولا يدير الأعضاء',teacher:'مدرس: عرض فقط (جدوله والدوام)'};
const teacherOptions=sel=>'<option value="">— غير مرتبط بمدرس —</option>'+((typeof db!=='undefined'&&db&&db.teachers)||[]).slice().sort((a,b)=>String(a.name).localeCompare(String(b.name),'ar')).map(t=>`<option value="${esc(t.id)}" ${t.id===sel?'selected':''}>${esc(t.name)}</option>`).join('');
async function showMembers(){
 let rows=[];
 try{const r=await authed('/rest/v1/rpc/list_masar_members','POST',{p_school_id:sync.school});rows=r.value||[]}
 catch(e){toast(/function|schema cache|Could not find/i.test(e.message)?'ميزة الأعضاء غير مفعّلة: شغّل ملف SUPABASE_UPGRADE_0.9.32.sql':e.message,true);return}
 shell.dataset.screen='members';
 const me=sync.role,roleOpts=cur=>['admin','deputy','teacher'].filter(r=>me==='owner'||r!=='admin'||cur==='admin').map(r=>`<option value="${r}" ${r===cur?'selected':''}>${ROLE_AR[r]}</option>`).join('');
 shell.innerHTML=`<div class="cloud-card"><h2>👥 الأعضاء والصلاحيات</h2>
 <p class="muted">المدرس يدخل بحسابه فيرى جدوله والدوام اليومي فقط، ولا يستطيع التعديل. الوكيل يعدّل الجدول، والمدير يدير الأعضاء أيضاً. الصلاحيات تُفرض في الخادم عند الحفظ.</p>
 <div class="m-list">${rows.map(m=>{const own=m.role==='owner',lock=own||(me!=='owner'&&m.role==='admin');return `<div class="notice" data-u="${esc(m.user_id)}"><b>${esc(m.email)}</b> ${own?'<span class="tag">مالك</span>':''}
  ${lock?`<div class="muted">${esc(ROLE_AR[m.role]||m.role)}${m.teacher_ref?' · مرتبط بمدرس':''}</div>`:`<div class="actions m-row"><select data-f="role" aria-label="الدور">${roleOpts(m.role)}</select><select data-f="t" aria-label="المدرس">${teacherOptions(m.teacher_ref||'')}</select><button class="secondary" data-a="save">حفظ</button><button class="secondary danger" data-a="del">إزالة</button></div>`}</div>`}).join('')||'<div class="notice">لا أعضاء.</div>'}</div>
 <h3>إضافة عضو</h3><p class="muted">يجب أن ينشئ الشخص حساباً في نيبور أولاً (بالبريد نفسه) ثم تضيفه هنا.</p>
 <label>البريد الإلكتروني<input id="mEmail" type="email" autocomplete="off"></label>
 <label>الدور<select id="mRole">${['deputy','teacher'].concat(me==='owner'?['admin']:[]).map(r=>`<option value="${r}">${ROLE_AR[r]} — ${ROLE_HELP[r]}</option>`).join('')}</select></label>
 <label>ربط بمدرس (للدور «مدرس»)<select id="mTeacher">${teacherOptions('')}</select></label>
 <div class="actions"><button id="mAdd">إضافة</button><button id="mBack" class="secondary">رجوع</button></div><p id="cloudMsg" role="status"></p></div>`;
 shell.querySelector('#mBack').onclick=()=>show();
 shell.querySelector('#mAdd').onclick=async()=>{try{const email=shell.querySelector('#mEmail').value.trim(),role=shell.querySelector('#mRole').value,t=shell.querySelector('#mTeacher').value;
  if(!/^\S+@\S+\.\S+$/.test(email))throw Error('أدخل بريداً صحيحاً');
  await authed('/rest/v1/rpc/add_masar_member','POST',{p_school_id:sync.school,p_email:email,p_role:role,p_teacher_ref:role==='teacher'?t:null});toast('أُضيف العضو.');showMembers()}
  catch(e){msg(/User not found/.test(e.message)?'لا يوجد حساب بهذا البريد. اطلب منه إنشاء حساب في نيبور أولاً.':/Already/.test(e.message)?'هذا البريد عضو بالفعل.':e.message,true)}};
 shell.querySelectorAll('[data-u]').forEach(row=>{const uid=row.dataset.u;
  const sv=row.querySelector('[data-a=save]'),dl=row.querySelector('[data-a=del]');
  if(sv)sv.onclick=async()=>{try{const role=row.querySelector('[data-f=role]').value,t=row.querySelector('[data-f=t]').value;await authed('/rest/v1/rpc/update_masar_member','POST',{p_school_id:sync.school,p_user_id:uid,p_role:role,p_teacher_ref:role==='teacher'?t:null});toast('حُفظ.');showMembers()}catch(e){msg(e.message,true)}};
  if(dl)dl.onclick=async()=>{if(!(await masarConfirm('إزالة هذا العضو من المدرسة؟')))return;try{await authed('/rest/v1/rpc/remove_masar_member','POST',{p_school_id:sync.school,p_user_id:uid});toast('أُزيل العضو.');showMembers()}catch(e){msg(e.message,true)}}});
}

/* ---------- الواجهة ---------- */
function show(){shell.hidden=false;draw()}
function close(){shell.hidden=true}
function msg(t,bad=false){const e=shell.querySelector('#cloudMsg');if(e){e.className=bad?'error':'success';e.textContent=t}}
function draw(){
 shell.dataset.screen='main';
 if(!configured){shell.innerHTML=`<div class="cloud-card"><h2>ربط نيبور بالسحابة</h2><p>أدخل بيانات مشروع Supabase (انظر CLOUD_SETUP.md). تُحفظ على هذا الجهاز فلا تضيع عند تحديث الملفات. استخدم المفتاح العام (anon/publishable) فقط، لا السري أبداً.</p><label>Project URL<input id="cfgUrl" dir="ltr" placeholder="https://xxxx.supabase.co"></label><label>المفتاح العام (anon / publishable)<input id="cfgKey" dir="ltr"></label><div class="actions"><button id="cfgSave">حفظ وإعادة التحميل</button><button id="cloudClose" class="secondary">إغلاق</button></div><p id="cloudMsg" role="status"></p></div>`;
  shell.querySelector('#cloudClose').onclick=close;
  shell.querySelector('#cfgSave').onclick=()=>{const u=shell.querySelector('#cfgUrl').value.trim().replace(/\/$/,''),k=shell.querySelector('#cfgKey').value.trim();if(!/^https:\/\/[^/]+\.supabase\.co$/.test(u)||k.length<20){msg('الرابط أو المفتاح غير صحيح',true);return}if(/service_role|sb_secret/i.test(k)){msg('هذا مفتاح سري! لا تضعه في المتصفح. استخدم المفتاح العام.',true);return}wr('masar-cloud-cfg',{url:u,anonKey:k});location.reload()};return}
 if(!session?.access_token){shell.innerHTML=`<div class="cloud-card"><h2>نيبور — حساب المدرسة</h2><p>حساب لكل مستخدم وبيانات مستقلة لكل مدرسة. التسجيل يتطلب بريداً إلكترونياً.</p><label>البريد الإلكتروني<input id="cloudEmail" type="email" autocomplete="email"></label><label>كلمة المرور<input id="cloudPass" type="password" autocomplete="current-password" minlength="8"></label><div class="actions"><button id="cloudLogin">دخول</button><button id="cloudSignup">إنشاء حساب</button><button id="cloudReset" class="secondary">استعادة كلمة المرور</button><button id="cloudClose" class="secondary">متابعة محلياً</button></div><p id="cloudMsg" role="status"></p></div>`;
  const email=()=>shell.querySelector('#cloudEmail').value.trim(),password=()=>shell.querySelector('#cloudPass').value;
  shell.querySelector('#cloudClose').onclick=close;
  shell.querySelector('#cloudLogin').onclick=async()=>{try{const r=await req('/auth/v1/token?grant_type=password','POST',{email:email(),password:password()},false);session=r.value;persist();await list();setStatus(sync.school?'busy':'off');draw();startLoop()}catch(e){msg(e.message,true)}};
  shell.querySelector('#cloudSignup').onclick=async()=>{try{if(password().length<8)throw Error('كلمة المرور 8 أحرف على الأقل');await req('/auth/v1/signup?redirect_to='+back(),'POST',{email:email(),password:password()},false);msg('تم إرسال طلب إنشاء الحساب. تحقق من البريد الإلكتروني لتأكيده ثم سجّل الدخول.')}catch(e){msg(e.message,true)}};
  shell.querySelector('#cloudReset').onclick=async()=>{try{await req('/auth/v1/recover?redirect_to='+back(),'POST',{email:email()},false);msg('إذا كان البريد مسجلاً فستصلك رسالة استعادة كلمة المرور.')}catch(e){msg(e.message,true)}};return}
 const linked=!!sync.school;
 shell.innerHTML=`<div class="cloud-card"><h2>☁ حساب نيبور</h2><p>الحساب: ${esc(session.user?.email||'—')}</p>
 ${linked?`<div class="notice"><b>${esc(sync.name||'المدرسة')}</b> (${esc(ROLE_AR[sync.role]||'مدرس')})<br><span id="syncLine"></span></div>
 <label><input type="checkbox" id="autoSync" ${sync.auto?'checked':''}> مزامنة تلقائية (رفع التعديلات وسحب تعديلات الأجهزة الأخرى)</label>
 <div class="actions"><button id="syncNow">مزامنة الآن</button>${canManage()?'<button id="histBtn" class="secondary">نسخ سحابية سابقة</button><button id="memBtn" class="secondary">👥 الأعضاء والصلاحيات</button>':''}<button id="unlinkBtn" class="secondary">فك الربط</button></div>`
 :`<p class="warning">هذا الجهاز غير مرتبط بمدرسة. اختر مدرسة ثم اربط الجهاز فتتزامن بياناته تلقائياً مع بقية أجهزتك.</p>
 <label>المدرسة السحابية<select id="cloudSchools"><option value="">— اختر مدرسة —</option>${schools.map(x=>`<option value="${esc(x.id)}">${esc(x.name)} (${esc(ROLE_AR[x.role]||x.role)})</option>`).join('')}</select></label>
 <div class="actions"><button id="linkBtn">ربط هذا الجهاز بالمدرسة</button></div>
 <label>إنشاء مدرسة جديدة<input id="cloudNewSchool" maxlength="120" placeholder="اسم المدرسة"></label><div class="actions"><button id="cloudCreate" class="secondary">إنشاء مدرسة</button><button id="cloudRefresh" class="secondary">تحديث القائمة</button></div>`}
 <div class="actions"><button id="cloudLogout" class="secondary">خروج</button><button id="cloudClose" class="secondary">إغلاق</button></div><p id="cloudMsg" role="status"></p></div>`;
 const $=s=>shell.querySelector(s);$('#cloudClose').onclick=close;
 $('#cloudLogout').onclick=async()=>{try{await authed('/auth/v1/logout','POST',{})}catch{}session=null;persist();stopLoop();setStatus('login');draw()};
 if(linked){paintStatus();
  $('#autoSync').onchange=e=>{sync.auto=e.target.checked;saveSync();if(sync.auto){pull().then(push)}else setStatus('off','المزامنة التلقائية متوقفة')};
  $('#syncNow').onclick=async()=>{await pull();await push();paintStatus()};
  if($('#histBtn'))$('#histBtn').onclick=showHistory;
  if($('#memBtn'))$('#memBtn').onclick=showMembers;
  $('#unlinkBtn').onclick=async ()=>{if((await masarConfirm('فك الربط؟ تبقى بياناتك على هذا الجهاز كما هي، وتتوقف المزامنة.'))){unlink();draw()}}}
 else{
  $('#linkBtn').onclick=async()=>{const id=$('#cloudSchools').value;if(!id){msg('اختر مدرسة أولاً',true);return}await linkSchool(id);startLoop();draw()};
  $('#cloudRefresh').onclick=async()=>{try{await list();draw();msg('تم تحديث المدارس')}catch(e){msg(e.message,true)}};
  $('#cloudCreate').onclick=async()=>{try{const name=$('#cloudNewSchool').value.trim();if(name.length<2)throw Error('أدخل اسم مدرسة صحيحاً');await authed('/rest/v1/rpc/create_masar_school','POST',{school_name:name});await list();draw();msg('تم إنشاء المدرسة. اخترها ثم اربط الجهاز.')}catch(e){msg(e.message,true)}}}}

/* ---------- الحلقة ---------- */
let loop=null;
function startLoop(){if(loop||!configured)return;loop=setInterval(()=>{if(document.visibilityState==='visible'&&active())pull()},45000)}
function stopLoop(){clearInterval(loop);loop=null}
window.addEventListener('online',()=>{if(active())pull().then(push)});
window.addEventListener('offline',()=>{if(active())setStatus('offline')});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&active())pull()});
/* التقاط كل حفظ محلي */
const origSave=window.save;
if(typeof origSave==='function'){window.save=function(){const r=origSave.apply(this,arguments);try{if(r!==false)schedulePush()}catch(e){log('sync',e.message)}return r}}
if(configured&&session?.access_token){list().catch(()=>{}).finally(()=>{setStatus(sync.school?(online()?'busy':'offline'):'off');if(sync.school){startLoop();setTimeout(()=>pull().then(push),1200)}})}
else setStatus(configured?'login':'off');
window.MASAR_SYNC={push,pull,state:()=>({status,sync,conflict}),hashNow};
})();

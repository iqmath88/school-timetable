/* MASAR 0.9.19.0: explicit, isolated cloud account bridge. No secret keys in frontend. */
(()=>{'use strict';
const cfg=window.MASAR_CLOUD_CONFIG||{},base=String(cfg.url||'').replace(/\/$/,''),key=String(cfg.anonKey||'');
const configured=/^https:\/\/[^/]+\.supabase\.co$/.test(base)&&key.length>20;
let session=null,school=null,revision=null,schools=[];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const shell=document.createElement('div');shell.id='masar-cloud-panel';shell.hidden=true;document.body.appendChild(shell);
const openBtn=document.createElement('button');openBtn.id='cloudOpen';openBtn.type='button';openBtn.textContent='☁ الحساب والمدارس';document.querySelector('.topbar')?.appendChild(openBtn);openBtn.onclick=show;
const storeKey='masar-cloud-session-v1';try{session=JSON.parse(sessionStorage.getItem(storeKey)||'null')}catch{}
const persist=()=>{if(session)sessionStorage.setItem(storeKey,JSON.stringify(session));else sessionStorage.removeItem(storeKey)};
async function req(path,method='GET',data,auth=true,extra={}){
 const headers={'apikey':key,'Content-Type':'application/json',...extra};if(auth&&session?.access_token)headers.Authorization='Bearer '+session.access_token;
 const res=await fetch(base+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data)});const raw=await res.text();let val;try{val=raw?JSON.parse(raw):null}catch{val=raw}if(!res.ok)throw Error(val?.msg||val?.error_description||val?.message||val?.error||('HTTP '+res.status));return {value:val,headers:res.headers};
}
async function refresh(){if(!session?.refresh_token)throw Error('يرجى تسجيل الدخول');const r=await req('/auth/v1/token?grant_type=refresh_token','POST',{refresh_token:session.refresh_token},false);session=r.value;persist()}
async function authed(path,method='GET',data,extra={}){try{return await req(path,method,data,true,extra)}catch(e){if(/JWT expired|invalid JWT|token is expired/i.test(e.message)&&session?.refresh_token){await refresh();return req(path,method,data,true,extra)}throw e}}
function msg(t,bad=false){const e=shell.querySelector('#cloudMsg');if(e){e.className=bad?'error':'success';e.textContent=t}}
function show(){shell.hidden=false;draw()}
function close(){shell.hidden=true}
function draw(){if(!configured){shell.innerHTML=`<div class="cloud-card"><h2>إعداد منصة مسار السحابية</h2><p class="warning">لم يُربط التطبيق بمشروع Supabase بعد. أكمل إعداد <code>cloud-config.js</code> وشغّل ملف SQL المرفق. البيانات المحلية لم تتغير.</p><button id="cloudClose">إغلاق</button></div>`;shell.querySelector('#cloudClose').onclick=close;return}
 if(!session?.access_token){shell.innerHTML=`<div class="cloud-card"><h2>مسار — حساب المدرسة</h2><p>حساب لكل مستخدم وبيانات مستقلة لكل مدرسة. التسجيل يتطلب بريداً إلكترونياً.</p><label>البريد الإلكتروني<input id="cloudEmail" type="email" autocomplete="email"></label><label>كلمة المرور<input id="cloudPass" type="password" autocomplete="current-password" minlength="8"></label><div class="actions"><button id="cloudLogin">دخول</button><button id="cloudSignup">إنشاء حساب</button><button id="cloudReset" class="secondary">استعادة كلمة المرور</button><button id="cloudClose" class="secondary">متابعة محلياً</button></div><p id="cloudMsg" role="status"></p></div>`;
 const email=()=>shell.querySelector('#cloudEmail').value.trim(),password=()=>shell.querySelector('#cloudPass').value;
 shell.querySelector('#cloudClose').onclick=close;
 shell.querySelector('#cloudLogin').onclick=async()=>{try{const r=await req('/auth/v1/token?grant_type=password','POST',{email:email(),password:password()},false);session=r.value;persist();await list();draw()}catch(e){msg(e.message,true)}};
 shell.querySelector('#cloudSignup').onclick=async()=>{try{if(password().length<8)throw Error('كلمة المرور 8 أحرف على الأقل');await req('/auth/v1/signup','POST',{email:email(),password:password()},false);msg('تم إرسال طلب إنشاء الحساب. تحقق من البريد الإلكتروني لتأكيده ثم سجّل الدخول.')}catch(e){msg(e.message,true)}};
 shell.querySelector('#cloudReset').onclick=async()=>{try{await req('/auth/v1/recover','POST',{email:email()},false);msg('إذا كان البريد مسجلاً فستصلك رسالة استعادة كلمة المرور.')}catch(e){msg(e.message,true)}};return}
 shell.innerHTML=`<div class="cloud-card"><h2>☁ حساب مسار</h2><p>الحساب: ${esc(session.user?.email||'—')}</p><p class="warning">البيانات المحلية لا تُرفع تلقائياً. اختر مدرسة ثم استخدم الرفع أو التنزيل صراحةً. احفظ نسخة JSON قبل أي استبدال.</p><label>المدرسة السحابية<select id="cloudSchools"><option value="">— اختر مدرسة —</option>${schools.map(x=>`<option value="${esc(x.id)}" ${school===x.id?'selected':''}>${esc(x.name)} (${esc(x.role)})</option>`).join('')}</select></label><label>إنشاء مدرسة جديدة<input id="cloudNewSchool" maxlength="120" placeholder="اسم المدرسة"></label><div class="actions"><button id="cloudCreate">إنشاء مدرسة</button><button id="cloudUpload">رفع بيانات هذا الجهاز</button><button id="cloudDownload">تنزيل بيانات المدرسة</button><button id="cloudRefresh" class="secondary">تحديث القائمة</button><button id="cloudLogout" class="secondary">خروج</button><button id="cloudClose" class="secondary">إغلاق</button></div><p id="cloudMsg" role="status"></p></div>`;
 shell.querySelector('#cloudSchools').onchange=e=>{school=e.target.value||null;revision=null};shell.querySelector('#cloudClose').onclick=close;
 shell.querySelector('#cloudLogout').onclick=async()=>{try{await authed('/auth/v1/logout','POST',{})}catch{}session=null;school=null;revision=null;persist();draw()};
 shell.querySelector('#cloudRefresh').onclick=async()=>{try{await list();draw();msg('تم تحديث المدارس')}catch(e){msg(e.message,true)}};
 shell.querySelector('#cloudCreate').onclick=async()=>{try{const name=shell.querySelector('#cloudNewSchool').value.trim();if(name.length<2)throw Error('أدخل اسم مدرسة صحيحاً');const r=await authed('/rest/v1/rpc/create_masar_school','POST',{school_name:name});await list();school=r.value;draw();msg('تم إنشاء المدرسة بنجاح')}catch(e){msg(e.message,true)}};
 shell.querySelector('#cloudUpload').onclick=async()=>{try{if(!school)throw Error('اختر مدرسة أولاً');const data=window.MASAR_CLOUD_BRIDGE.exportData();if(!confirm('هل تريد رفع بيانات هذا الجهاز إلى المدرسة المختارة؟ سيُستبدل الجدول السحابي السابق إن وجد، ولن تتغير البيانات المحلية.'))return;
 // Compare-and-swap RPC: reject stale writes from another device.
 const r=await authed('/rest/v1/rpc/save_masar_school_state','POST',{p_school_id:school,p_expected_revision:revision,p_payload:data});revision=r.value;msg('تم الحفظ السحابي بنجاح. رقم المراجعة: '+revision)}catch(e){msg(e.message+' — حدّث/نزّل بيانات المدرسة قبل إعادة المحاولة.',true)}};
 shell.querySelector('#cloudDownload').onclick=async()=>{try{if(!school)throw Error('اختر مدرسة أولاً');const r=await authed('/rest/v1/school_states?school_id=eq.'+encodeURIComponent(school)+'&select=payload,revision');const item=r.value?.[0];if(!item)throw Error('لا توجد بيانات سحابية محفوظة لهذه المدرسة');if(!confirm('سيتم استبدال بيانات المدرسة المحلية ببيانات السحابة. صدّر نسخة JSON احتياطية أولاً. هل تريد المتابعة؟'))return;window.MASAR_CLOUD_BRIDGE.importData(item.payload);revision=item.revision;msg('تم تنزيل البيانات واستعادتها محلياً بنجاح')}catch(e){msg(e.message,true)}};
}
async function list(){const r=await authed('/rest/v1/school_members?select=school_id,role,schools(id,name)&order=created_at.asc');schools=(r.value||[]).filter(x=>x.schools).map(x=>({id:x.school_id,name:x.schools.name,role:x.role}));if(!schools.some(x=>x.id===school)){school=null;revision=null}}
// Never load or overwrite a local timetable at startup.
if(configured&&session?.access_token){list().catch(()=>{}).finally(()=>{});}
})();

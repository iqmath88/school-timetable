/* مسار — طبقة التخزين: IndexedDB بدل localStorage (سعة أكبر بكثير) مع نقل تلقائي آمن.
   تُحمَّل أولاً، وتحمّل بقية ملفات التطبيق بعد جاهزية التخزين. */
(function(){
'use strict';
const VER='09350';
const SCRIPTS=['dialogs.js','excel-export.js','word-export.js','excel-import.js','app.js','school-day.js','identity.js','output-identity.js','manual-editor.js','storage-ui.js','ui-enhancements.js','cloud-config.js','state-diff.js','cloud.js','mobile.js','access.js','selfcheck.js'];
const DB_NAME='masar-store',STORE='kv';
const cache=new Map();let idb=null,mode='localStorage',listeners=[],lastError=null,pending=0;
const ls=(()=>{try{return window.localStorage}catch(e){return null}})();
const isOurs=k=>/^(school-timetable-v01|masar-)/.test(k);

function openDB(){return new Promise((res,rej)=>{
  if(!window.indexedDB)return rej(new Error('no-idb'));
  const r=indexedDB.open(DB_NAME,1);
  r.onupgradeneeded=()=>{r.result.createObjectStore(STORE)};
  r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error||new Error('idb-open'));r.onblocked=()=>rej(new Error('idb-blocked'));
  setTimeout(()=>rej(new Error('idb-timeout')),6000);
})}
const tx=(m)=>idb.transaction(STORE,m).objectStore(STORE);
const reqP=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
async function readAll(){
  const out=new Map(),store=tx('readonly');
  await new Promise((res,rej)=>{const c=store.openCursor();c.onsuccess=()=>{const cur=c.result;if(cur){out.set(cur.key,cur.value);cur.continue()}else res()};c.onerror=()=>rej(c.error)});
  return out;
}
function fail(e){lastError=e;try{window.dispatchEvent(new CustomEvent('masar-storage-error',{detail:String(e&&e.message||e)}))}catch(_){}}
function persist(op){
  pending++;
  const done=()=>{pending--};
  try{const t=idb.transaction(STORE,'readwrite');op(t.objectStore(STORE));t.oncomplete=done;t.onerror=()=>{done();fail(t.error)};t.onabort=()=>{done();fail(t.error||new Error('idb-abort'))}}
  catch(e){done();fail(e)}
}
const MStore={
  getItem(k){k=String(k);if(mode==='idb')return cache.has(k)?cache.get(k):null;return ls?ls.getItem(k):null},
  setItem(k,v){k=String(k);v=String(v);
    if(mode==='idb'){cache.set(k,v);persist(s=>s.put(v,k))}else{if(!ls)throw new Error('no-storage');ls.setItem(k,v)}
    listeners.forEach(f=>{try{f(k)}catch(_){}})},
  removeItem(k){k=String(k);if(mode==='idb'){cache.delete(k);persist(s=>s.delete(k))}else if(ls)ls.removeItem(k)},
  get mode(){return mode},get lastError(){return lastError},get pending(){return pending},
  onWrite(f){listeners.push(f)},
  keys(){return mode==='idb'?[...cache.keys()]:(ls?Object.keys(ls):[])},
  sizeBytes(){let n=0;for(const k of this.keys()){const v=this.getItem(k);if(v!=null)n+=(k.length+String(v).length)*2}return n},
  /* قراءة/كتابة مباشرة بقيم غير نصية (مثل مقبض الملف) */
  async rawGet(k){if(mode!=='idb')return null;return reqP(tx('readonly').get('__raw:'+k))},
  async rawSet(k,v){if(mode!=='idb')return;return reqP(tx('readwrite').put(v,'__raw:'+k))}
};
window.MStore=MStore;

async function migrate(all){
  // نقل مرة واحدة من localStorage إلى IndexedDB مع تحقق، وحفظ نسخة أصلية داخل IndexedDB قبل أي حذف
  if(all.get('__meta:migrated'))return {done:false};
  if(!ls)return {done:false};
  const keys=Object.keys(ls).filter(isOurs);
  if(!keys.length){await reqP(tx('readwrite').put('1','__meta:migrated'));return {done:false,empty:true}}
  const backup={at:new Date().toISOString(),items:{}};keys.forEach(k=>backup.items[k]=ls.getItem(k));
  await reqP(tx('readwrite').put(JSON.stringify(backup),'__meta:ls-backup'));
  for(const k of keys){const v=ls.getItem(k);await reqP(tx('readwrite').put(v,k));all.set(k,v)}
  // تحقق: قراءة كل مفتاح من IndexedDB ومقارنته
  for(const k of keys){const back=await reqP(tx('readonly').get(k));if(back!==ls.getItem(k))throw new Error('verify-failed:'+k)}
  await reqP(tx('readwrite').put(new Date().toISOString(),'__meta:migrated'));
  keys.forEach(k=>{try{ls.removeItem(k)}catch(_){}});
  return {done:true,count:keys.length};
}

function loadScripts(){
  let i=0;const next=()=>{if(i>=SCRIPTS.length)return;const s=document.createElement('script');s.src=SCRIPTS[i++]+'?v='+VER;s.async=false;s.onload=next;s.onerror=()=>{console.error('failed',s.src);next()};document.head.appendChild(s)};next();
}
(async function boot(){
  try{
    idb=await openDB();
    const all=await readAll();
    await migrate(all);
    all.forEach((v,k)=>{if(typeof v==='string'&&!k.startsWith('__'))cache.set(k,v)});
    mode='idb';
    try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(_){}
  }catch(e){
    mode='localStorage';fail(e);
    window.__masarStorageFallback=String(e&&e.message||e);
  }
  loadScripts();
})();
})();

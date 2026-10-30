/* نيبور — Service Worker: يعمل التطبيق بلا إنترنت. الشبكة أولاً (لتصل التحديثات فور رفعها) ثم النسخة المخزنة. */
const V='nippur-0.9.36.0';
const FILES=[
  "./",
  "access.js",
  "app.js",
  "apple-touch-icon.png",
  "candidate-validator.js",
  "cloud-config.js",
  "cloud.css",
  "cloud.js",
  "dialogs.js",
  "errorlog.js",
  "excel-export.js",
  "excel-import.js",
  "font-messiri-ar-500.woff2",
  "font-messiri-ar-700.woff2",
  "font-messiri-la-500.woff2",
  "font-messiri-la-700.woff2",
  "font-plex-ar-400.woff2",
  "font-plex-ar-500.woff2",
  "font-plex-ar-700.woff2",
  "font-plex-la-400.woff2",
  "font-plex-la-500.woff2",
  "font-plex-la-700.woff2",
  "fonts.css",
  "generator-worker.js",
  "highs-engine.js",
  "highs.wasm",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "identity.css",
  "identity.js",
  "index.html",
  "manifest.json",
  "manual-editor.js",
  "mip-engine.js",
  "mobile.js",
  "output-identity.js",
  "privacy.html",
  "pwa.js",
  "school-day.js",
  "selfcheck.js",
  "state-diff.js",
  "storage-ui.js",
  "storage.js",
  "styles.css",
  "theme.css",
  "ui-enhancements.js",
  "word-export.js"
];
self.addEventListener('install',e=>{
  e.waitUntil((async()=>{
    const c=await caches.open(V);
    await Promise.all(FILES.map(async f=>{try{const r=await fetch(f,{cache:'reload'});if(r.ok)await c.put(f,r)}catch(_){}}));
  })());
});
self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    for(const k of await caches.keys())if((k.startsWith('masar-')||k.startsWith('nippur-'))&&k!==V)await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('message',e=>{if(e.data==='skip')self.skipWaiting()});
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin!==location.origin)return;
  e.respondWith((async()=>{
    const c=await caches.open(V);
    try{
      const net=await fetch(r);
      if(net&&net.ok&&net.type==='basic'){c.put(r,net.clone()).catch(()=>{})}
      return net;
    }catch(err){
      const hit=await c.match(r,{ignoreSearch:true});
      if(hit)return hit;
      if(r.mode==='navigate'){const idx=await c.match('./index.html',{ignoreSearch:true})||await c.match('./');if(idx)return idx}
      return new Response('غير متاح دون اتصال',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }
  })());
});

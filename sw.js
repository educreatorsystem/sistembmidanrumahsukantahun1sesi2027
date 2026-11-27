const PREFIX='skst-baju:'+self.registration.scope+':';
const CACHE=PREFIX+'v3.2';
const FILES=['./','./index.html','./style.css?v=3.2','./app.js?v=3.2','./students.js?v=3.2','./config.js?v=3.2','./manifest.webmanifest','./assets/lencana.png','./assets/panduan-saiz.jpg','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}return r;}).catch(async()=>{return await caches.match(e.request)||(e.request.mode==='navigate'?await caches.match('./index.html'):Response.error());}));});

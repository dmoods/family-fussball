const C="termine-kids-v14";
const STATIC=["manifest.webmanifest","icon.svg","apple-touch-icon.png","enhance.js"];
function patch(html){
  html=html.replace(/<div class="teamlinks"[\s\S]*?<\/div>/g,'');
  if(!html.includes('enhance.js')) html=html.replace('</body>','<script src="enhance.js?v=1"></script></body>');
  return html;
}
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(STATIC)))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
 const u=new URL(e.request.url);
 if(e.request.mode==="navigate"||u.pathname.endsWith("/index.html")){
   e.respondWith(fetch(e.request,{cache:"no-store"}).then(async r=>{if(!r.ok)return r;const h=patch(await r.text());return new Response(h,{status:r.status,statusText:r.statusText,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}})}).catch(()=>caches.match(e.request)));
   return;
 }
 if(u.pathname.endsWith(".json")||u.pathname.endsWith("enhance.js")){e.respondWith(fetch(e.request,{cache:"no-store"}).catch(()=>caches.match(e.request)));return;}
 e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
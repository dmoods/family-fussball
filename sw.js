const C="family-football-v2";
const STATIC=["manifest.webmanifest","icon.svg","apple-touch-icon.png"];

self.addEventListener("install",e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(C).then(c=>c.addAll(STATIC)));
});

self.addEventListener("activate",e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(
        keys.filter(k=>k!==C).map(k=>caches.delete(k))
      ))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);

  if(
    e.request.mode==="navigate" ||
    u.pathname.endsWith("/index.html") ||
    u.pathname.endsWith(".json")
  ){
    e.respondWith(
      fetch(e.request,{cache:"no-store"})
        .catch(()=>caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(r=>r||fetch(e.request))
  );
});

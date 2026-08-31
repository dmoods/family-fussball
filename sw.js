const C="family-football-v3";
const STATIC=["manifest.webmanifest","icon.svg","apple-touch-icon.png"];

const UI_FIX=`<style id="next-card-fix">
.dashboard{align-items:stretch!important}
.nextcard{display:block!important;height:100%!important;align-self:stretch!important;vertical-align:top!important;margin:0!important}
.nextcard.alicia{background:linear-gradient(135deg,#b00020,#e30613)!important}
.nextcard .nextlabel,.nextcard .nextname,.nextcard .nextwhen,.nextcard .nexttitle,.nextcard .nextloc{position:relative;top:0!important}
</style>`;

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

  if(e.request.mode==="navigate" || u.pathname.endsWith("/index.html")){
    e.respondWith(
      fetch(e.request,{cache:"no-store"})
        .then(async r=>{
          const text=await r.text();
          const html=text.includes('id="next-card-fix"')?text:text.replace("</head>",UI_FIX+"</head>");
          return new Response(html,{status:r.status,statusText:r.statusText,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}});
        })
        .catch(()=>caches.match(e.request))
    );
    return;
  }

  if(u.pathname.endsWith(".json")){
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
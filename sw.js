const C="termine-kids-v6";
const STATIC=["manifest.webmanifest","icon.svg","apple-touch-icon.png"];

const WEEK_CARD_FIX=`<style id="week-card-equal-v6">
#app .grid{align-items:stretch!important}
#app .kidcol{align-content:start!important}
#app .card{
  min-height:330px!important;
  height:330px!important;
  display:flex!important;
  flex-direction:column!important;
}
#app .card .maps{margin-top:auto!important}
#app .card .rsvp{margin-top:9px!important}
@media(max-width:560px){
  #app .card{
    min-height:350px!important;
    height:350px!important;
  }
}
</style>`;

self.addEventListener("install",e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(C).then(c=>c.addAll(STATIC)));
});

self.addEventListener("activate",e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==C).map(k=>caches.delete(k))))
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
          const html=text.includes('id="week-card-equal-v6"')
            ? text
            : text.replace("</head>",WEEK_CARD_FIX+"</head>");
          return new Response(html,{
            status:r.status,
            statusText:r.statusText,
            headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store, no-cache, must-revalidate"}
          });
        })
        .catch(()=>caches.match(e.request))
    );
    return;
  }

  if(u.pathname.endsWith(".json")){
    e.respondWith(fetch(e.request,{cache:"no-store"}).catch(()=>caches.match(e.request)));
    return;
  }

  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
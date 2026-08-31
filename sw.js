const C="termine-kids-v7";
const STATIC=["manifest.webmanifest","icon.svg","apple-touch-icon.png"];

const WEEK_CARD_FIX=`<style id="week-card-equal-v7">
/* Wochenansicht: alle Termin-Kacheln exakt gleich hoch */
#app .grid{align-items:start!important}
#app .kidcol{display:grid!important;grid-auto-rows:350px!important;gap:9px!important;align-content:start!important}
#app .card{box-sizing:border-box!important;height:350px!important;min-height:350px!important;max-height:350px!important;display:flex!important;flex-direction:column!important;overflow:hidden!important}
#app .card .maps{margin-top:auto!important;flex-shrink:0!important}
#app .card .rsvp{flex-shrink:0!important}
@media(min-width:561px){
  #app .kidcol{grid-auto-rows:330px!important}
  #app .card{height:330px!important;min-height:330px!important;max-height:330px!important}
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
          const html=text.includes('id="week-card-equal-v7"')
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
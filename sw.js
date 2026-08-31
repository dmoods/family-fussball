const C="family-football-v4";
const STATIC=["manifest.webmanifest","icon.svg","apple-touch-icon.png"];

const UI_FIX=`<style id="next-card-fix-v4">
.dashboard{align-items:stretch!important}
.nextcard{
  display:flex!important;
  flex-direction:column!important;
  justify-content:flex-start!important;
  height:100%!important;
  min-height:150px!important;
  align-self:stretch!important;
  vertical-align:top!important;
  margin:0!important;
  padding:12px!important;
}
.nextcard.luis{background:linear-gradient(135deg,#55208f,#7f3fd0)!important}
.nextcard.alicia{background:#d80027!important;color:#fff!important}
.nextcard .nextlabel,
.nextcard .nextname,
.nextcard .nextwhen,
.nextcard .nexttitle,
.nextcard .nextloc{
  position:static!important;
  transform:none!important;
  top:auto!important;
  margin-left:0!important;
}
.nextcard .nextlabel{margin-top:0!important}
.nextcard .nextname{margin-top:2px!important;margin-bottom:7px!important}
@media(max-width:560px){
  .nextcard{min-height:150px!important;padding:11px!important}
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
          const html=text.replace("</head>",UI_FIX+"</head>");
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
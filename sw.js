const C="termine-kids-v11";
const STATIC=["manifest.webmanifest","icon.svg","apple-touch-icon.png"];

const TEAM_LINKS_CSS=`<style id="team-links-style">
.teamlinks{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;margin:0 0 10px}.teamlink{display:flex;align-items:center;justify-content:center;min-height:44px;border-radius:14px;text-decoration:none;color:#fff;font-size:12px;font-weight:850;box-shadow:0 4px 14px rgba(0,0,0,.08)}.teamlink.luis{background:linear-gradient(135deg,#55208f,#7f3fd0)}.teamlink.alicia{background:#d80027}@media(max-width:560px){.teamlinks{gap:7px}.teamlink{font-size:11px;padding:8px 4px}}
</style>`;
const TEAM_LINKS_HTML=`<div class="teamlinks"><a class="teamlink luis" href="https://www.fussball.de/mannschaft/bsv-eintracht-mahlsdorf-3e--berliner-runde-u11-bsv-eintracht-mahlsdorf-berlin/-/saison/2627/team-id/011MIDR390000000VTVG0001VTR8C1K7" target="_blank" rel="noopener">🟣 Luis · Wettbewerb ↗</a><a class="teamlink alicia" href="https://www.fussball.de/mannschaft/1-fc-union-berlin-maedchen-dm-1fc-union-berlin-berlin/-/saison/2627/team-id/011MIBV3NC000000VTVG0001VTR8C1K7" target="_blank" rel="noopener">🔴 Alicia · Tabelle ↗</a></div>`;

function addTeamLinks(html){
  if(!html.includes('id="team-links-style"')) html=html.replace('</head>',TEAM_LINKS_CSS+'</head>');
  if(!html.includes('class="teamlinks"')) html=html.replace('<div id="dashboard" class="dashboard"></div>', '<div id="dashboard" class="dashboard"></div>'+TEAM_LINKS_HTML);
  return html;
}

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
          if(!r.ok)return r;
          const html=addTeamLinks(await r.text());
          return new Response(html,{status:r.status,statusText:r.statusText,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}});
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
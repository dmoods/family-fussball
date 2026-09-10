const C="termine-kids-v21";
function inject(html){try{
  html=html.replace(/<script src="smartinfo\.js\?v=\d+"><\/script>/g,'<script src="smartinfo.js?v=5"></script>');
  html=html.replace(/<script src="opponents\.js\?v=\d+"><\/script>/g,'');
  if(!html.includes('smartinfo.js?v=5'))html=html.replace('</body>','<script src="smartinfo.js?v=5"></script></body>');
  if(!html.includes('hourlyweather.js'))html=html.replace('</body>','<script src="hourlyweather.js?v=2"></script></body>');
  return html
}catch(_){return html}}
self.addEventListener("install",e=>{self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const u=new URL(e.request.url);if(e.request.mode==='navigate'||u.pathname.endsWith('/index.html')){e.respondWith(fetch(e.request,{cache:'no-store'}).then(async r=>{if(!r.ok)return r;const h=inject(await r.text());return new Response(h,{status:r.status,statusText:r.statusText,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})}).catch(()=>fetch(e.request)));return}e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match(e.request)))});
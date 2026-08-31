(()=>{
const WEATHER={};
const GAME_WINDOW_DAYS=7;
const css=`
.game.gameplus{outline:1px solid rgba(17,17,17,.08)}
.gameplus .gameextras{display:grid;gap:5px;margin-top:8px}
.gameplus .gameextra{font-size:11px;font-weight:800;background:rgba(255,255,255,.72);border-radius:9px;padding:6px 7px;line-height:1.25}
.gameplus .weatherline{font-weight:750}
.gameplus h3{padding-right:20px}
@media(max-width:560px){.gameplus .gameextra{font-size:10px;padding:5px 6px}}
`;
const style=document.createElement('style');style.id='premium-game-extras';style.textContent=css;document.head.appendChild(style);

function clockMinus(time,mins){const m=String(time||'').match(/(\d{1,2}):(\d{2})/);if(!m)return'';let total=Number(m[1])*60+Number(m[2])-mins;while(total<0)total+=1440;return String(Math.floor(total/60)%24).padStart(2,'0')+':'+String(total%60).padStart(2,'0')}
function departure(e){const meet=e.meetTime||e.meetingTime||e.treffzeit||'';const base=meet||e.time||'';if(!base)return'';const mins=meet?30:45;const t=clockMinus(base,mins);return t?`🚗 Abfahrt-Richtwert: ${t} Uhr <span style="font-weight:600;opacity:.7">(${mins} Min. vorher)</span>`:''}
function weatherKey(e){return e.date}
function weatherText(e){return WEATHER[weatherKey(e)]||''}
function wIcon(code){if(code===0)return'☀️';if([1,2].includes(code))return'🌤️';if(code===3)return'☁️';if([45,48].includes(code))return'🌫️';if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))return'🌧️';if([71,73,75,77,85,86].includes(code))return'🌨️';if([95,96,99].includes(code))return'⛈️';return'🌦️'}
function gameExtras(e){if(typeof isGame!=='function'||!isGame(e))return'';const dep=departure(e),wt=weatherText(e);if(!dep&&!wt)return'';return `<div class="gameextras">${dep?`<div class="gameextra">${dep}</div>`:''}${wt?`<div class="gameextra weatherline">${wt}</div>`:''}</div>`}

const oldCard=window.card;
if(typeof oldCard==='function'){
 window.card=function(e){let html=oldCard(e);if(typeof isGame==='function'&&isGame(e)){html=html.replace('class="card '+e.child+' game"','class="card '+e.child+' game gameplus"');const extras=gameExtras(e);if(extras)html=html.replace(/(<a class="maps"|<div class="rsvp")/,extras+'$1');}return html}
}
const oldModal=window.openModal;
if(typeof oldModal==='function'){
 window.openModal=function(e){oldModal(e);if(typeof isGame==='function'&&isGame(e)){const body=document.querySelector('#modalBody'),extras=gameExtras(e);if(body&&extras)body.insertAdjacentHTML('afterbegin',extras)}}
}

async function loadWeather(){try{
 const now=new Date();now.setHours(0,0,0,0);const end=new Date(now);end.setDate(end.getDate()+GAME_WINDOW_DAYS);
 if(typeof futureEvents!=='function'||typeof isGame!=='function')return;
 const dates=[...new Set(futureEvents().filter(e=>isGame(e)).map(e=>e.date).filter(ds=>{const d=new Date(ds+'T12:00:00');return d>=now&&d<=end}))];
 if(!dates.length)return;
 const r=await fetch('https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.405&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FBerlin&forecast_days=8',{cache:'no-store'});if(!r.ok)return;const j=await r.json();
 const d=j.daily||{};for(let i=0;i<(d.time||[]).length;i++){const ds=d.time[i];if(!dates.includes(ds))continue;const min=Math.round(d.temperature_2m_min[i]),max=Math.round(d.temperature_2m_max[i]),rain=d.precipitation_probability_max[i],code=d.weather_code[i];WEATHER[ds]=`${wIcon(code)} Spieltagswetter Berlin: ${min}–${max} °C${Number.isFinite(rain)?` · Regen ${rain}%`:''}`}
 if(typeof render==='function')render();
 }catch(e){console.warn('Wetter konnte nicht geladen werden',e)}}
setTimeout(loadWeather,600);
})();
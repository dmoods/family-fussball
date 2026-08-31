(()=>{
const WEATHER={};
const GAME_WINDOW_DAYS=7;
const css=`
.card.game.gameplus{outline:2px solid rgba(17,17,17,.08)}
.gameplus .gameextras{display:grid;gap:5px;margin-top:8px}
.gameplus .gameextra{font-size:11px;font-weight:800;background:rgba(255,255,255,.78);border-radius:9px;padding:6px 7px;line-height:1.25}
.gameplus .weatherline{font-weight:750}
.gameplus h3{padding-right:20px}
@media(max-width:560px){.gameplus .gameextra{font-size:10px;padding:5px 6px}}
`;
const style=document.createElement('style');style.id='premium-game-extras';style.textContent=css;document.head.appendChild(style);
function clockMinus(time,mins){const m=String(time||'').match(/(\d{1,2}):(\d{2})/);if(!m)return'';let total=Number(m[1])*60+Number(m[2])-mins;while(total<0)total+=1440;return String(Math.floor(total/60)%24).padStart(2,'0')+':'+String(total%60).padStart(2,'0')}
function departure(e){const meet=e.meetTime||e.meetingTime||e.treffzeit||'';const base=meet||e.time||'';if(!base)return'';const mins=meet?30:45;const t=clockMinus(base,mins);return t?`🚗 Abfahrt-Richtwert: ${t} Uhr <span style="font-weight:600;opacity:.7">(${mins} Min. vorher)</span>`:''}
function wIcon(code){if(code===0)return'☀️';if([1,2].includes(code))return'🌤️';if(code===3)return'☁️';if([45,48].includes(code))return'🌫️';if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))return'🌧️';if([71,73,75,77,85,86].includes(code))return'🌨️';if([95,96,99].includes(code))return'⛈️';return'🌦️'}
function gameExtras(e){if(typeof isGame!=='function'||!isGame(e))return'';const dep=departure(e),wt=WEATHER[e.date]||'';return `${dep?`<div class="gameextra">${dep}</div>`:''}${wt?`<div class="gameextra weatherline">${wt}</div>`:''}`}
let timer=0;
function patchCards(){clearTimeout(timer);timer=setTimeout(()=>{try{if(typeof rawEvents!=='function'||typeof eventKey!=='function'||typeof isGame!=='function')return;const events=rawEvents();document.querySelectorAll('.card[data-event-key]').forEach(el=>{const e=events.find(x=>eventKey(x)===el.dataset.eventKey);if(!e||!isGame(e))return;el.classList.add('gameplus');const desired=gameExtras(e);let box=el.querySelector('.gameextras');if(!desired){if(box)box.remove();return}if(!box){box=document.createElement('div');box.className='gameextras';const target=el.querySelector('.maps')||el.querySelector('.rsvp');if(target)target.before(box);else el.appendChild(box)}if(box.innerHTML!==desired)box.innerHTML=desired})}catch(err){console.warn('Spieltag-Erweiterung',err)}},40)}
const observer=new MutationObserver(mutations=>{if(mutations.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.card')||n.querySelector?.('.card')))))patchCards()});
['#app','#pastContent'].forEach(sel=>{const el=document.querySelector(sel);if(el)observer.observe(el,{childList:true,subtree:true})});
async function loadWeather(){try{const now=new Date();now.setHours(0,0,0,0);const end=new Date(now);end.setDate(end.getDate()+GAME_WINDOW_DAYS);if(typeof futureEvents!=='function'||typeof isGame!=='function')return;const dates=[...new Set(futureEvents().filter(e=>isGame(e)).map(e=>e.date).filter(ds=>{const d=new Date(ds+'T12:00:00');return d>=now&&d<=end}))];if(!dates.length)return;const r=await fetch('https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.405&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FBerlin&forecast_days=8',{cache:'no-store'});if(!r.ok)return;const j=await r.json(),d=j.daily||{};for(let i=0;i<(d.time||[]).length;i++){const ds=d.time[i];if(!dates.includes(ds))continue;const min=Math.round(d.temperature_2m_min[i]),max=Math.round(d.temperature_2m_max[i]),rain=d.precipitation_probability_max[i],code=d.weather_code[i];WEATHER[ds]=`${wIcon(code)} Spieltagswetter Berlin: ${min}–${max} °C${Number.isFinite(rain)?` · Regen ${rain}%`:''}`}patchCards()}catch(e){console.warn('Wetter konnte nicht geladen werden',e)}}
setTimeout(()=>{patchCards();loadWeather()},800);
})();
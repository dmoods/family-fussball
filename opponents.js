(()=>{
'use strict';
const style=document.createElement('style');
style.textContent=`
.opponentline{margin-top:7px;font-size:11px;font-weight:850;line-height:1.25;background:rgba(255,255,255,.78);border-radius:9px;padding:6px 7px}
.pairrow{align-items:stretch!important}.paircell{align-self:stretch}.paircell>.card{height:100%!important}
@media(max-width:560px){.opponentline{font-size:9px;padding:5px 6px;margin-top:6px}}
`;
document.head.appendChild(style);
function eventForCard(el){if(typeof rawEvents!=='function')return null;const all=rawEvents();if(typeof eventKey==='function'){const exact=all.find(e=>eventKey(e)===el.dataset.eventKey);if(exact)return exact}return null}
function opponentFor(e){if(!e||e.child!=='Alicia'||typeof isGame!=='function'||!isGame(e))return'';if(typeof source==='undefined'||!Array.isArray(source.games))return'';const g=source.games.find(x=>x.child==='Alicia'&&x.date===e.date&&String(x.time||'')===String(e.time||''));if(!g)return'';const t=String(g.title||'').trim();if(!t||/punktspiel|testspiel|spiel u13w fcu/i.test(t))return'';return t}
function patch(){document.querySelectorAll('.card.Alicia[data-event-key]').forEach(el=>{const e=eventForCard(el);const opp=opponentFor(e);let line=el.querySelector('.opponentline');if(!opp){if(line)line.remove();return}if(!line){line=document.createElement('div');line.className='opponentline';const loc=el.querySelector('.loc');if(loc)loc.before(line);else{const h=el.querySelector('h3');if(h)h.after(line);else el.appendChild(line)}}line.textContent='🆚 Gegner: '+opp});
}
setTimeout(patch,500);setInterval(patch,2500);document.addEventListener('click',()=>setTimeout(patch,120),{passive:true});
})();

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const STORAGE_KEY = "sdo-kicktipp-ai-v2";
const SETTINGS_KEY = "sdo-kicktipp-settings";
let appData = null;
let deferredPrompt = null;

function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]))}
function saveData(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(appData)); }
function loadSettings(){ return JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}"); }
function saveSettings(s){ localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

async function loadInitial(){
  const saved = localStorage.getItem(STORAGE_KEY);
  if(saved){ appData = JSON.parse(saved); render(); return; }
  const r = await fetch("data.json");
  appData = await r.json();
  saveData(); render();
}

function render(){
  $("#seasonLabel").textContent = appData.season || "Bundesliga";
  $("#matchdayTitle").textContent = appData.matchday || "Spieltag";
  $("#updatedLabel").textContent = "Stand: " + (appData.updated || "lokal");

  const alertBox=$("#alertBox");
  if(appData.alert){ alertBox.textContent="⚠️ "+appData.alert; alertBox.classList.remove("hidden"); }
  else alertBox.classList.add("hidden");

  $("#matches").innerHTML = appData.matches.map((m,i)=>`
    <div class="match-card">
      <div class="match">
        <div>
          <div class="teams">${esc(m.home)}<br>${esc(m.away)}</div>
          <div class="kickoff">${esc(m.kickoff||"")}</div>
        </div>
        <div class="score">
          <input inputmode="numeric" pattern="[0-9]*" value="${m.prediction?.[0] ?? ""}" data-i="${i}" data-side="0" aria-label="Heimtore">
          <span>:</span>
          <input inputmode="numeric" pattern="[0-9]*" value="${m.prediction?.[1] ?? ""}" data-i="${i}" data-side="1" aria-label="Auswärtstore">
        </div>
      </div>
      <div class="tags">
        <span class="tag ${m.confidence>=70?"good":m.confidence>=55?"warn":"red"}">${m.confidence||0}% Sicherheit</span>
        ${m.bank?'<span class="tag bank">🔒 Bank-Tipp</span>':''}
        ${m.surprise?'<span class="tag warn">⚠ Überraschung möglich</span>':''}
      </div>
    </div>`).join("");

  $$("#matches input").forEach(inp=>inp.addEventListener("input",e=>{
    const i=+e.target.dataset.i, side=+e.target.dataset.side;
    appData.matches[i].prediction[side]=e.target.value===""?"":Number(e.target.value);
    saveData();
  }));

  $("#analysisList").innerHTML = appData.matches.map(m=>`
    <div class="card analysis-card">
      <h3>${esc(m.home)} – ${esc(m.away)}</h3>
      <div class="muted">Prognose: <b>${m.prediction?.[0] ?? "-"}:${m.prediction?.[1] ?? "-"}</b> · Sicherheit ${m.confidence||0}%</div>
      <div class="meter"><span style="width:${Math.max(0,Math.min(100,m.confidence||0))}%"></span></div>
      <div class="detail-grid">
        <div class="detail"><b>Form</b><span>${esc(m.form||"—")}</span></div>
        <div class="detail"><b>Verletzungen</b><span>${esc(m.injuries||"—")}</span></div>
        <div class="detail"><b>Sperren</b><span>${esc(m.suspensions||"—")}</span></div>
        <div class="detail"><b>Startelf-Sicherheit</b><span>${esc(m.lineup||"—")}</span></div>
      </div>
    </div>`).join("");

  renderResults();
  const s=loadSettings();
  $("#kicktippUrl").value=s.kicktippUrl||"";
  $("#apiEndpoint").value=s.apiEndpoint||"";
  $("#apiKey").value=s.apiKey||"";
}

function tipsText(){
  return `${appData.season} – ${appData.matchday}\n\n` +
    appData.matches.map(m=>`${m.home} – ${m.away}: ${m.prediction?.[0] ?? "-"}:${m.prediction?.[1] ?? "-"}`).join("\n");
}

async function copyTips(){
  try{ await navigator.clipboard.writeText(tipsText()); toast("Tipps kopiert"); }
  catch{ prompt("Tipps kopieren:",tipsText()); }
}

function toast(msg){
  const el=document.createElement("div");
  el.textContent=msg;
  Object.assign(el.style,{position:"fixed",left:"50%",bottom:"100px",transform:"translateX(-50%)",padding:"10px 14px",background:"#fff",color:"#111",borderRadius:"12px",fontWeight:"800",zIndex:99});
  document.body.appendChild(el); setTimeout(()=>el.remove(),1700);
}

function openKicktipp(){
  const s=loadSettings();
  window.open(s.kicktippUrl || "https://www.kicktipp.de/","_blank");
}

async function refreshData(){
  const s=loadSettings();
  if(!s.apiEndpoint){ toast("Kein Live-Endpunkt hinterlegt"); return; }
  $("#refreshBtn").disabled=true; $("#refreshBtn").textContent="Lade…";
  try{
    const headers={}; if(s.apiKey) headers["Authorization"]="Bearer "+s.apiKey;
    const r=await fetch(s.apiEndpoint,{headers});
    if(!r.ok) throw new Error("HTTP "+r.status);
    const incoming=await r.json();
    if(!incoming.matches) throw new Error("Ungültiges Datenformat");
    appData=incoming;
    appData.updated = new Date().toLocaleString("de-DE");
    saveData(); render(); toast("Daten aktualisiert");
  }catch(e){ alert("Aktualisierung fehlgeschlagen: "+e.message); }
  finally{ $("#refreshBtn").disabled=false; $("#refreshBtn").textContent="↻ Daten aktualisieren"; }
}

function exportJson(){
  const blob=new Blob([JSON.stringify(appData,null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download="kicktipp-spieltag.json"; a.click(); URL.revokeObjectURL(a.href);
}

function importJson(file){
  const rd=new FileReader();
  rd.onload=()=>{ try{ appData=JSON.parse(rd.result); saveData(); render(); toast("JSON importiert"); }catch{ alert("Datei ist kein gültiges JSON."); } };
  rd.readAsText(file);
}

function renderResults(){
  $("#resultEditor").innerHTML = appData.matches.map((m,i)=>`
    <div class="result-row">
      <div><b>${esc(m.home)} – ${esc(m.away)}</b><div class="muted">Tipp ${m.prediction?.[0] ?? "-"}:${m.prediction?.[1] ?? "-"}</div></div>
      <div class="result-inputs">
        <input inputmode="numeric" value="${m.result?.[0] ?? ""}" data-r="${i}" data-side="0">
        <span>:</span>
        <input inputmode="numeric" value="${m.result?.[1] ?? ""}" data-r="${i}" data-side="1">
      </div>
    </div>`).join("");

  $$("#resultEditor input").forEach(inp=>inp.addEventListener("input",e=>{
    const i=+e.target.dataset.r, side=+e.target.dataset.side;
    appData.matches[i].result ??= ["",""];
    appData.matches[i].result[side] = e.target.value===""?"":Number(e.target.value);
    saveData(); calcStats();
  }));
  calcStats();
}

function tendency(a,b){ return a===b?0:(a>b?1:-1); }
function calcStats(){
  let pts=0, exact=0, tend=0, count=0;
  for(const m of appData.matches){
    if(!m.result || m.result[0]==="" || m.result[1]==="") continue;
    count++;
    const [ph,pa]=m.prediction, [rh,ra]=m.result;
    if(ph===rh && pa===ra){ pts+=4; exact++; }
    else if(tendency(ph,pa)===tendency(rh,ra)){ pts+=2; tend++; }
  }
  $("#statPoints").textContent=pts; $("#statExact").textContent=exact; $("#statTendency").textContent=tend; $("#statMatches").textContent=count;
}

$$(".tab").forEach(b=>b.addEventListener("click",()=>{
  $$(".tab").forEach(x=>x.classList.toggle("active",x===b));
  $$(".view").forEach(v=>v.classList.toggle("active",v.id===b.dataset.view));
  window.scrollTo({top:0,behavior:"smooth"});
}));

$("#copyBtn").addEventListener("click",copyTips);
$("#openKicktippBtn").addEventListener("click",openKicktipp);
$("#refreshBtn").addEventListener("click",refreshData);
$("#exportBtn").addEventListener("click",exportJson);
$("#saveSettingsBtn").addEventListener("click",()=>{
  saveSettings({kicktippUrl:$("#kicktippUrl").value.trim(),apiEndpoint:$("#apiEndpoint").value.trim(),apiKey:$("#apiKey").value.trim()});
  toast("Einstellungen gespeichert");
});
$("#importBtn").addEventListener("click",()=>$("#importFile").click());
$("#importFile").addEventListener("change",e=>e.target.files[0]&&importJson(e.target.files[0]));

window.addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); deferredPrompt=e; $("#installBtn").hidden=false; });
$("#installBtn").addEventListener("click",async()=>{ if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt=null; $("#installBtn").hidden=true; }});

if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
loadInitial();

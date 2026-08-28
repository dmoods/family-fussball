import csv, io, json, math, os, re, unicodedata
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo
import requests

OUT=Path('kicktipp-ai/live-data.json'); BERLIN=ZoneInfo('Europe/Berlin')
OL='https://api.openligadb.de'; API='https://v3.football.api-sports.io'; KEY=os.getenv('API_FOOTBALL_KEY','').strip(); LEAGUE=78; SEASON=2026
S=requests.Session(); S.headers.update({'User-Agent':'SternDesOstens-KicktippAI/2.0'})
ALIASES={'fc bayern munchen':'bayern munchen','bayern munich':'bayern munchen','1 fsv mainz 05':'mainz 05','sc paderborn 07':'sc paderborn','bayer 04 leverkusen':'bayer leverkusen','1 fc koln':'fc koln','cologne':'fc koln','tsg 1899 hoffenheim':'hoffenheim','1 fc union berlin':'union berlin','sv werder bremen':'werder bremen','fc schalke 04':'schalke 04'}
COORDS={'bayern munchen':(48.137,11.575),'vfb stuttgart':(48.775,9.182),'mainz 05':(49.993,8.247),'sc paderborn':(51.718,8.757),'sv elversberg':(49.317,7.127),'bayer leverkusen':(51.045,7.019),'fc koln':(50.938,6.960),'hoffenheim':(49.252,8.878),'rb leipzig':(51.340,12.375),'borussia monchengladbach':(51.181,6.442),'union berlin':(52.457,13.568),'eintracht frankfurt':(50.110,8.682),'borussia dortmund':(51.513,7.466),'hamburger sv':(53.551,9.994),'sc freiburg':(47.999,7.842),'werder bremen':(53.075,8.807),'fc augsburg':(48.370,10.898),'schalke 04':(51.518,7.085)}

def norm(x):
    x=unicodedata.normalize('NFKD',str(x or '')); x=''.join(c for c in x if not unicodedata.combining(c)).lower(); x=re.sub(r'[^a-z0-9]+',' ',x).strip(); return ALIASES.get(x,x)
def fl(x):
    try:return float(str(x).replace(',','.'))
    except:return None
def clamp(v,a,b): return max(a,min(b,v))
def req(url,params=None,headers=None):
    r=S.get(url,params=params,headers=headers,timeout=25); r.raise_for_status(); return r.json()
def soft(url,params=None,headers=None):
    try:return req(url,params,headers)
    except Exception as e: print('WARN',url,e); return None
def api(ep,params=None): return soft(API+ep,params,{'x-apisports-key':KEY}) if KEY else None

def old():
    try:return json.loads(OUT.read_text(encoding='utf-8'))
    except:return {}
def ol_matches(lg,yr):
    x=soft(f'{OL}/getmatchdata/{lg}/{yr}'); return x if isinstance(x,list) else []
def mtime(m):
    s=m.get('matchDateTimeUTC') or m.get('matchDateTime')
    if not s:return None
    try:
        d=datetime.fromisoformat(s.replace('Z','+00:00')); return (d if d.tzinfo else d.replace(tzinfo=BERLIN)).astimezone(timezone.utc)
    except:return None
def score(m):
    if not m.get('matchIsFinished'): return None
    rs=m.get('matchResults') or []
    if not rs:return None
    r=sorted(rs,key=lambda z:z.get('resultOrder') or 0)[-1]
    try:return int(r['pointsTeam1']),int(r['pointsTeam2'])
    except:return None

def games(team,sets,n=8):
    k=norm(team); out=[]
    for name,arr,tier in sets:
        for m in arr:
            a=norm((m.get('team1') or {}).get('teamName')); b=norm((m.get('team2') or {}).get('teamName'))
            if k not in (a,b):continue
            sc=score(m); dt=mtime(m)
            if not sc or not dt:continue
            gf,ga=sc if k==a else (sc[1],sc[0]); out.append((dt,gf,ga,tier,name))
    return sorted(out,reverse=True)[:n]
def form(gs):
    if not gs:return {'n':0,'ppg':1.35,'gf':1.45,'ga':1.45}
    ws=[1,.9,.82,.74,.67,.6,.54,.49]; sw=wp=wg=wga=0
    for i,g in enumerate(gs):
        _,gf,ga,tier,_=g; w=ws[i]*tier; sw+=w; wp+=(3 if gf>ga else 1 if gf==ga else 0)*w; wg+=gf*w; wga+=ga*w
    return {'n':len(gs),'ppg':wp/sw,'gf':wg/sw,'ga':wga/sw}

def matrix(hx,ax,mx=7):
    d={}
    for h in range(mx+1):
        ph=math.exp(-hx)*hx**h/math.factorial(h)
        for a in range(mx+1): d[(h,a)]=ph*(math.exp(-ax)*ax**a/math.factorial(a))
    s=sum(d.values()) or 1; return {k:v/s for k,v in d.items()}
def typ(s): return 'H' if s[0]>s[1] else 'D' if s[0]==s[1] else 'A'
def bestscore(hx,ax):
    d=matrix(hx,ax); p={'H':0,'D':0,'A':0}
    for s,v in d.items():p[typ(s)]+=v
    best=max(d,key=lambda s:4*d[s]+2*(p[typ(s)]-d[s])); ev=4*d[best]+2*(p[typ(best)]-d[best]); return list(best),p,ev

def fixture_map(now):
    x=api('/fixtures',{'league':LEAGUE,'season':SEASON,'from':(now.date()-timedelta(days=1)).isoformat(),'to':(now.date()+timedelta(days=8)).isoformat()}) or {}; out={}
    for r in x.get('response',[]):
        h=norm(((r.get('teams') or {}).get('home') or {}).get('name')); a=norm(((r.get('teams') or {}).get('away') or {}).get('name')); fid=(r.get('fixture') or {}).get('id')
        if h and a and fid:out[h+'|'+a]={'id':fid,'date':(r.get('fixture') or {}).get('date')}
    return out

def injuries():
    x=api('/injuries',{'league':LEAGUE,'season':SEASON}) or {}; out={}
    for r in x.get('response',[]):
        t=norm((r.get('team') or {}).get('name')); p=(r.get('player') or {}).get('name')
        if t and p:
            reason=r.get('reason') or r.get('type'); txt=p+(f' ({reason})' if reason else ''); out.setdefault(t,[])
            if txt not in out[t]:out[t].append(txt)
    return out

def pred(fid):
    x=api('/predictions',{'fixture':fid}) or {}
    if not x.get('response'):return {}
    p=(x['response'][0].get('predictions') or {}); pc=p.get('percent') or {}; g=p.get('goals') or {}
    return {'hp':fl(str(pc.get('home','')).replace('%','')),'dp':fl(str(pc.get('draw','')).replace('%','')),'ap':fl(str(pc.get('away','')).replace('%','')),'hg':fl(g.get('home')),'ag':fl(g.get('away')),'advice':p.get('advice')}
def odds(fid):
    x=api('/odds',{'fixture':fid}) or {}; rows=[]
    for page in x.get('response',[]):
      for b in page.get('bookmakers',[]):
       for bet in b.get('bets',[]):
        if 'winner' not in str(bet.get('name','')).lower() and str(bet.get('name','')).lower()!='1x2':continue
        raw={}
        for v in bet.get('values',[]):
            lab=str(v.get('value','')).lower(); o=fl(v.get('odd'))
            if not o or o<=1:continue
            if lab in ('home','1'):raw['H']=1/o
            elif lab in ('draw','x'):raw['D']=1/o
            elif lab in ('away','2'):raw['A']=1/o
        if len(raw)==3:
            s=sum(raw.values()); rows.append({k:raw[k]/s for k in raw})
    if not rows:return {}
    return {k:sum(r[k] for r in rows)/len(rows) for k in ('H','D','A')}|{'books':len(rows)}
def lineup(fid):
    x=api('/fixtures/lineups',{'fixture':fid}) or {}; out={}
    for r in x.get('response',[]):
        t=norm((r.get('team') or {}).get('name')); st=[(z.get('player') or {}).get('name') for z in r.get('startXI',[]) if (z.get('player') or {}).get('name')]
        if t:out[t]=st
    return out

def fd_market():
    try:
        r=S.get('https://www.football-data.co.uk/mmz4281/2627/D1.csv',timeout=20)
        if r.status_code!=200 or 'HomeTeam' not in r.text[:600]:return {}
        out={}
        for z in csv.DictReader(io.StringIO(r.text)):
            h,a=norm(z.get('HomeTeam')),norm(z.get('AwayTeam')); vals=[]
            for pre in ('Avg','B365','Max'):
                oh,od,oa=fl(z.get(pre+'H')),fl(z.get(pre+'D')),fl(z.get(pre+'A'))
                if oh and od and oa and min(oh,od,oa)>1:
                    q=[1/oh,1/od,1/oa]; s=sum(q); vals.append({'H':q[0]/s,'D':q[1]/s,'A':q[2]/s})
            if vals:out[h+'|'+a]={k:sum(v[k] for v in vals)/len(vals) for k in ('H','D','A')}
        return out
    except Exception as e:print('WARN football-data',e);return {}
def weather(home,dt):
    c=COORDS.get(norm(home))
    if not c:return {}
    p={'latitude':c[0],'longitude':c[1],'hourly':'temperature_2m,precipitation,wind_speed_10m','timezone':'Europe/Berlin','forecast_days':8}; x=soft('https://api.open-meteo.com/v1/forecast',p) or {}; H=x.get('hourly') or {}; times=H.get('time') or []
    target=dt.astimezone(BERLIN).replace(minute=0,second=0,microsecond=0).strftime('%Y-%m-%dT%H:%M')
    if target not in times:return {}
    i=times.index(target)
    try:return {'temp':fl(H['temperature_2m'][i]),'rain':fl(H['precipitation'][i]),'wind':fl(H['wind_speed_10m'][i])}
    except:return {}
def blend(a,b):
    arr=[x for x in (a,b) if x and all(k in x for k in ('H','D','A'))]
    if not arr:return {}
    w=[.65,.35][:len(arr)]; s=sum(w); return {k:sum(arr[i][k]*w[i] for i in range(len(arr)))/s for k in ('H','D','A')}

def calc(home,away,dt,sets,en):
    hf,af=form(games(home,sets)),form(games(away,sets)); hx=1.62*(clamp(hf['gf']/1.5,.55,1.65)**.58)*(clamp(af['ga']/1.45,.6,1.55)**.42); ax=1.28*(clamp(af['gf']/1.5,.55,1.65)**.58)*(clamp(hf['ga']/1.45,.6,1.55)**.42)
    hx+=(hf['ppg']-1.45)*.12; ax+=(af['ppg']-1.45)*.12
    inj=en['inj']; hi,ai=inj.get(norm(home),[]),inj.get(norm(away),[]); hx-=min(len(hi),6)*.025; ax-=min(len(ai),6)*.025
    pr=en['pred']
    if pr.get('hg') is not None and pr.get('ag') is not None:hx=.78*hx+.22*clamp(pr['hg'],.2,4); ax=.78*ax+.22*clamp(pr['ag'],.2,4)
    mk=blend(en['odds'],en['fd'])
    if mk:
        total=hx+ax; cur=(hx-ax)/max(total,.1); des=(mk['H']-mk['A'])*1.35; delta=clamp(des-cur,-.55,.55); hx+=delta*.45; ax-=delta*.45
    w=en['weather']; fac=1
    if (w.get('rain') or 0)>=2:fac*=.97
    if (w.get('wind') or 0)>=35:fac*=.95
    if w.get('temp') is not None and (w['temp']<=0 or w['temp']>=32):fac*=.98
    hx,ax=clamp(hx*fac,.25,4.2),clamp(ax*fac,.2,3.8); tip,probs,ev=bestscore(hx,ax)
    src={'openLigaDB':True,'apiFootballPrediction':bool(pr),'apiFootballOdds':bool(en['odds']),'footballDataOdds':bool(en['fd']),'apiFootballInjuries':bool(hi or ai),'apiFootballLineups':bool(en['lineup']),'openMeteo':bool(w)}
    conf=int(clamp(46+max(probs.values())*37+sum(src.values())*1.6,52,89))
    if pr.get('hp') is not None:
        ap={'H':pr['hp']/100,'D':(pr.get('dp') or 0)/100,'A':(pr.get('ap') or 0)/100}; conf+=3 if max(probs,key=probs.get)==max(ap,key=ap.get) else -4; conf=int(clamp(conf,50,90))
    injtxt='Keine verlässlichen aktuellen Ausfälle aus API-Football gemeldet'
    if hi or ai:
        q=[]
        if hi:q.append(home+': '+', '.join(hi[:5]))
        if ai:q.append(away+': '+', '.join(ai[:5]))
        injtxt=' | '.join(q)
    return {'prediction':tip,'confidence':conf,'bank':conf>=76 and max(probs.values())>=.58,'surprise':conf<=60 or (mk and max(mk,key=mk.get)!=max(probs,key=probs.get)),'form':f"{home}: {hf['ppg']:.2f} Pkt/Spiel, {hf['gf']:.2f}:{hf['ga']:.2f} Tore; {away}: {af['ppg']:.2f} Pkt/Spiel, {af['gf']:.2f}:{af['ga']:.2f} Tore.",'injuries':injtxt,'suspensions':'Ausfälle/Sperren werden berücksichtigt, soweit API-Football sie meldet.','lineup':'hoch' if en['lineup'] else 'niedrig','model':{'home_xg':round(hx,2),'away_xg':round(ax,2),'home_win':round(probs['H']*100,1),'draw':round(probs['D']*100,1),'away_win':round(probs['A']*100,1),'kicktipp_ev':round(ev,3)},'sources':src,'weather':w}

def main():
    now=datetime.now(timezone.utc); loc=now.astimezone(BERLIN); prev=old(); cache=prev.get('sourceCache',{}) if isinstance(prev.get('sourceCache'),dict) else {}
    cur=ol_matches('bl1',2026); p1=ol_matches('bl1',2025); p2=ol_matches('bl2',2025)
    if not cur:raise RuntimeError('OpenLigaDB liefert keine Bundesliga-2026/27-Spiele.')
    sets=[('BL26',cur,1.0),('BL25',p1,.94),('BL2-25',p2,.82)]; up=[]
    for m in cur:
        dt=mtime(m)
        if not m.get('matchIsFinished') and dt and dt>=now-timedelta(hours=2):up.append((dt,m))
    up.sort(key=lambda x:x[0])
    if not up:print('Keine kommenden Spiele');return
    grp=(up[0][1].get('group') or {}).get('groupOrderID'); md=[x for x in up if (x[1].get('group') or {}).get('groupOrderID')==grp] or up[:9]
    close=any(0<=(dt-now).total_seconds()/3600<=2.2 for dt,_ in md); refresh=loc.hour in {8,12,18}
    if KEY and (refresh or close or not cache.get('fixtureMap')):
        fm=fixture_map(loc)
        if fm:cache['fixtureMap']=fm
    fm=cache.get('fixtureMap',{})
    if KEY and (loc.hour in {8,12,18} or not cache.get('injuries')):
        ij=injuries()
        if ij:cache['injuries']=ij
    ij=cache.get('injuries',{})
    if refresh or not cache.get('fd'):
        fd=fd_market()
        if fd:cache['fd']=fd
    fd=cache.get('fd',{}); preds=cache.get('preds',{}); ods=cache.get('odds',{}); lus=cache.get('lineups',{}); ws=cache.get('weather',{})
    for dt,m in md:
        h=(m.get('team1') or {}).get('teamName',''); a=(m.get('team2') or {}).get('teamName',''); k=norm(h)+'|'+norm(a); fid=(fm.get(k) or {}).get('id'); hrs=(dt-now).total_seconds()/3600
        if KEY and fid:
            if loc.hour in {8,12} and 0<=hrs<=96:
                x=pred(fid)
                if x:preds[str(fid)]=x
            if loc.hour in {12,18} and 0<=hrs<=72:
                x=odds(fid)
                if x:ods[str(fid)]=x
            if 0<=hrs<=2.2:
                x=lineup(fid)
                if x:lus[str(fid)]=x
        if refresh or k not in ws or close:
            x=weather(h,dt)
            if x:ws[k]=x
    cache|={'preds':preds,'odds':ods,'lineups':lus,'weather':ws,'updatedUtc':now.isoformat()}
    matches=[]; active=set()
    for dt,m in md:
        h=(m.get('team1') or {}).get('teamName',''); a=(m.get('team2') or {}).get('teamName',''); k=norm(h)+'|'+norm(a); fid=(fm.get(k) or {}).get('id'); en={'inj':ij,'pred':preds.get(str(fid),{}) if fid else {},'odds':ods.get(str(fid),{}) if fid else {},'fd':fd.get(k,{}),'lineup':lus.get(str(fid),{}) if fid else {},'weather':ws.get(k,{})}; c=calc(h,a,dt,sets,en)
        active.update(s for s,v in c['sources'].items() if v); matches.append({'home':h,'away':a,'kickoff':dt.astimezone(BERLIN).strftime('%a %H:%M'),'prediction':c['prediction'],'confidence':c['confidence'],'bank':c['bank'],'surprise':c['surprise'],'form':c['form'],'injuries':c['injuries'],'suspensions':c['suspensions'],'lineup':c['lineup'],'model':c['model'],'sources':c['sources'],'weather':c['weather']})
    quality=min(100,35+len(active)*9+(10 if KEY else 0)); out={'season':'Bundesliga 2026/27','matchday':f'{grp}. Spieltag' if grp else 'Nächster Spieltag','updated':loc.strftime('%d.%m.%Y %H:%M'),'alert':f'Multi-Source-Analyse · Datenqualität {quality}% · {len(active)} aktive Quellen/Signale.','dataQuality':quality,'activeSources':sorted(active),'matches':matches,'sourceCache':cache}; OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8'); print(f'{len(matches)} Spiele | Qualität {quality}% | '+', '.join(sorted(active)))
if __name__=='__main__':main()

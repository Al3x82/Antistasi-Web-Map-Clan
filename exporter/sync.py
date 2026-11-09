#!/usr/bin/env python3
"""Read-only Antistasi exporter. Python standard library + OpenSSH only."""
import argparse, datetime as dt, fcntl, hashlib, json, math, os, pathlib, re, subprocess, tempfile, time
from front_support import enrich
BASE = pathlib.Path(__file__).resolve().parent

def extract(raw, campaign):
    candidates = []
    # The profile stores UTF-8 JSON strings terminated by NUL. Decode only
    # complete JSON objects; never interpret SQF or repair incomplete saves.
    for chunk in raw.split(b'\0'):
        for match in re.finditer(rb'\{\s*"(?:map|DLC)"\s*:', chunk):
            try:
                d = json.loads(chunk[match.start():])
            except (ValueError, UnicodeError):
                continue
            if isinstance(d, dict) and d.get('map') == 'Altis' and all(k in d for k in ('mrkSDK','mrkCSAT','cityData','resourcesFIA','hr','skillFIA','saveTime')):
                if not campaign or d.get('name','').strip() == campaign.strip():
                    candidates.append(d)
    unique = {json.dumps(d,sort_keys=True):d for d in candidates}
    if len(unique) != 1:
        raise ValueError(f'Atteso un salvataggio Altis univoco, trovati {len(unique)}. Controllare campaign_name; nessun dato pubblicato.')
    return next(iter(unique.values()))

def stable_read(path):
    p=pathlib.Path(path)
    for _ in range(3):
        a=p.read_bytes(); time.sleep(0.3); b=p.read_bytes()
        if a == b and a:
            return a
    raise ValueError('Salvataggio in scrittura: riprovare al prossimo aggiornamento')

def finite(v):
    if isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v):
        raise ValueError('Valore numerico non valido')
    return v

def position(p):
    x,y=map(finite,p[:2])
    if not (0<=x<=30720 and 0<=y<=30720): raise ValueError('Coordinate fuori Altis')
    return x,y

def build(d,cfg,markers,raw):
    if d.get('version') != cfg['expected_version']:
        raise ValueError('Versione Antistasi diversa: verificare il catalogo marker prima di aggiornare expected_version')
    for k in ('mrkSDK','mrkCSAT'):
        if not isinstance(d[k],list) or not all(isinstance(x,str) for x in d[k]): raise ValueError('Lista territori non valida')
    rebels,invaders=set(d['mrkSDK']),set(d['mrkCSAT'])
    if rebels & invaders: raise ValueError('Territorio assegnato a due fazioni')
    unknown=(rebels|invaders)-set(markers)-{'Synd_HQ'}
    if unknown: raise ValueError('Marker sconosciuti: '+', '.join(sorted(unknown)))
    sites=[]
    for name,m in markers.items():
        if m['type']=='city' and name not in d['cityData']: continue
        site=dict(m)
        site['side']='rebels' if name in rebels else 'invaders' if name in invaders else 'occupants'
        site['destroyed']=name in d.get('destroyedSites',[])
        position([site['x'],site['y']]); sites.append(site)
    counts={k:sum(s['side']==k for s in sites) for k in ('rebels','occupants','invaders')}
    if cfg.get('publish_hq') and d.get('posHQ'):
        x,y=position(d['posHQ'][0]); sites.append(dict(id='Synd_HQ',type='hq',x=x,y=y,side='rebels',destroyed=False))
    for i,post in enumerate(d.get('outpostsFIA',[])):
        x,y=position(post[0]); sites.append(dict(id=f'Avamposto ribelle {i+1}',type='rebpost',x=x,y=y,side='rebels',destroyed=False))
    minor_counts = {'roadblock': 0, 'camp': 0}
    for name, entry in d.get('minorSites', {}).items():
        if not isinstance(entry, list) or len(entry) < 3:
            raise ValueError('Postazione minore non valida: '+name)
        pos, kind, owner = entry[:3]
        if kind not in minor_counts or type(owner) is not int or owner not in (0,1,2):
            raise ValueError('Tipo o fazione postazione minore sconosciuti: '+name)
        x,y = position(pos)
        sites.append(dict(id=name, type=kind, x=x, y=y,
                          side={0:'rebels',1:'occupants',2:'invaders'}[owner], destroyed=False))
        minor_counts[kind] += 1
    enrich(sites,d,cfg)
    stamp=d['saveTime']; save=dt.datetime(*stamp[:6]).isoformat() # source timezone not declared
    return dict(schema=1,map='Altis',sample=False,save_time=save,save_timezone='orario del server',generated_at=dt.datetime.now(dt.timezone.utc).isoformat(),source_sha256=hashlib.sha256(raw).hexdigest(),version=d['version'],counts=counts,stats=dict(money=finite(d['resourcesFIA']),hr=finite(d['hr']),skill=finite(d['skillFIA'])),sites=sites,minor_sites_omitted=0,minor_counts=minor_counts)

def remote_quote(s):
    if any(c in s for c in ('\n','\r','"','\\')): raise ValueError('Percorso SFTP non valido')
    return '"'+s+'"'

def upload(local,cfg):
    if cfg.get('mode') == 'local':
        target=pathlib.Path(cfg['local_dir'])/'data'/'campaign.json'
        if not target.parent.is_dir(): raise ValueError('Creare la directory pubblica data prima della pubblicazione')
        fd,name=tempfile.mkstemp(dir=target.parent,prefix='.campaign-')
        try:
            with os.fdopen(fd,'wb') as f: f.write(pathlib.Path(local).read_bytes())
            os.chmod(name,0o644);os.replace(name,target)
        finally: pathlib.Path(name).unlink(missing_ok=True)
        return
    if cfg.get('mode') != 'sftp': raise ValueError('mode deve essere local o sftp')
    remote=cfg['remote_dir'].rstrip('/')+'/data/campaign.json'
    temp=remote+'.upload'
    batch='put '+remote_quote(str(local))+' '+remote_quote(temp)+'\nrename '+remote_quote(temp)+' '+remote_quote(remote)+'\n'
    subprocess.run(['sftp','-b','-','-oBatchMode=yes','-oIdentitiesOnly=yes','-oStrictHostKeyChecking=yes','-oConnectTimeout=20','-P',str(cfg.get('port',22)),'-i',cfg['key'],cfg['user']+'@'+cfg['host']],input=batch,text=True,check=True,timeout=90)

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--source'); ap.add_argument('--output'); ap.add_argument('--publish',action='store_true'); args=ap.parse_args()
    cfg=json.loads((BASE/'config.json').read_text()); markers=json.loads((BASE/'markers.json').read_text())
    state=BASE/'state'; state.mkdir(exist_ok=True)
    with (state/'sync.lock').open('w') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        raw=stable_read(args.source or cfg['source']); data=build(extract(raw,cfg['campaign_name']),cfg,markers,raw)
        target=pathlib.Path(args.output) if args.output else state/'campaign.json'; target.parent.mkdir(parents=True,exist_ok=True)
        fd,name=tempfile.mkstemp(dir=target.parent,prefix='.campaign-')
        try:
            with os.fdopen(fd,'w') as f: json.dump(data,f,ensure_ascii=False,allow_nan=False); f.write('\n')
            os.chmod(name,0o644); os.replace(name,target)
        finally:
            pathlib.Path(name).unlink(missing_ok=True)
        if args.publish: upload(target,cfg)
        print(f"OK: {len(data['sites'])} punti; salvataggio {data['save_time']}; "+('pubblicato' if args.publish else 'generato localmente'))

if __name__=='__main__':
    try: main()
    except Exception as exc: raise SystemExit(f'ERRORE: {exc}')

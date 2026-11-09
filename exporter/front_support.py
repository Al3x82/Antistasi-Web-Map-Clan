"""Estimated influence, not Antistasi combat simulation."""
import math
BASE_RADII={'city':900,'outpost':1200,'airport':2200,'resource':800,'factory':1000,'seaport':1300,'hq':1000,'rebpost':700,'roadblock':350,'camp':500}
def troop_count(entry,side):
    t=entry.get('troops') if isinstance(entry,dict) else None
    if not isinstance(t,list): return None
    if side=='rebels': return len(t) if all(isinstance(v,str) for v in t) else None
    if len(t)==2 and type(t[0]) in (int,float) and math.isfinite(t[0]) and t[0]>=0 and t[0]==int(t[0]): return int(t[0])
    return None

def enrich(sites,d,cfg):
    opt=cfg.get('front',{});bases={**BASE_RADII,**opt.get('base_m',{})}
    per=opt.get('meters_per_soldier',25);cap=opt.get('max_radius_m',4000)
    for v in [per,cap,*bases.values()]:
        if type(v) not in (int,float) or not math.isfinite(v) or not 0<=v<=10000: raise ValueError('Configurazione raggi non valida')
    g=d.get('newGarrison',{})
    for s in sites:
        n=troop_count(g.get(s['id']),s['side'])
        s['garrison_count']=n
        s['influence_radius_m']=0 if s['destroyed'] else min(cap,bases[s['type']]+per*(n or 0))

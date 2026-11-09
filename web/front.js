/* DRV_FRONT_V3: category totals and geometric influence. */
(()=>{
'use strict';
if(typeof L==='undefined'||!map)return;
const keys=Object.keys(sides),N=192,step=30720/N;
let cache='',owners,siteOwners,areas=[],front,internal,curves=[],showAreas=true,showFront=true,showInternal=false;
const box=document.createElement('section');box.style.cssText='border-top:1px solid #536461;margin-top:20px;padding-top:14px';
const title=document.createElement('h3');title.textContent='Categorie e fronte';box.append(title);
const summary=document.createElement('div');summary.style.overflowX='auto';box.append(summary);
const note=document.createElement('p');note.style.cssText='font-size:11px;line-height:1.5';note.textContent='Totali dell’intera campagna, comprese le postazioni minori. Aree stimate: raggio della categoria + soldati. I filtri dei punti non ricalcolano il controllo. Divisioni interne: confini stimati tra postazioni della stessa fazione, non settori ufficiali. Il fronte segue anche il limite verso le zone senza influenza, che restano trasparenti; le aree non sono ritagliate sulla costa.';box.append(note);
for(const [label,fn] of [['Aree delle fazioni',v=>showAreas=v],['Linea di fronte stimata',v=>showFront=v],['Divisioni interne stimate',v=>showInternal=v]]){
 const row=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=label==='Divisioni interne stimate'?showInternal:true;input.onchange=()=>{fn(input.checked);visibility();};row.append(input,document.createTextNode(' '+label));row.style.display='block';box.append(row);
}
$('coverage').insertAdjacentElement('afterend',box);
function visibility(){areas.forEach((a,i)=>{if(showAreas&&active.has(keys[i]))a.addTo(map);else a.remove();});if(front){if(showFront)front.addTo(map);else front.remove();}if(internal){if(showInternal)internal.addTo(map);else internal.remove();}}
function grid(sites){
 siteOwners=new Int32Array(N*N).fill(-1);let siteIndex=-1;
 const out=new Int8Array(N*N).fill(-1),scores=new Float64Array(N*N).fill(Infinity);
 // Stable tie-break avoids flickering on input order changes.
 for(const s of [...sites].sort((a,b)=>a.id.localeCompare(b.id))){siteIndex++;const r=s.influence_radius_m;if(!Number.isFinite(r)||r<=0)continue;
  const side=keys.indexOf(s.side);
  for(let y=Math.max(0,Math.floor((s.y-r)/step));y<Math.min(N,Math.ceil((s.y+r)/step));y++)for(let x=Math.max(0,Math.floor((s.x-r)/step));x<Math.min(N,Math.ceil((s.x+r)/step));x++){
   const score=(((x+.5)*step-s.x)**2+((y+.5)*step-s.y)**2)/(r*r),i=y*N+x;
   if(score<=1&&score<scores[i]){scores[i]=score;out[i]=side;siteOwners[i]=siteIndex;}
  }
 }return out;
}
function rebuild(){
 owners=grid(data.sites);areas.forEach(a=>a.remove());if(front)front.remove();areas=[];
 for(let f=0;f<keys.length;f++){
  const c=document.createElement('canvas');c.width=c.height=N;const ctx=c.getContext('2d');ctx.fillStyle=sides[keys[f]].color;
  for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(owners[y*N+x]===f)ctx.fillRect(x,N-1-y,1,1);
  areas.push(L.imageOverlay(c.toDataURL(),[[0,0],[30720,30720]],{opacity:.24,interactive:false}));
 }
 const {borders,divisions}=boundaries(owners,siteOwners,N);
 curves=chain(borders).map(smooth);
 const inner=[...divisions.values()].flatMap(chain).map(smooth);
 if(internal)internal.remove();
 internal=L.polyline(inner.map(toLatLng),{color:'#263331',weight:1.4,dashArray:'7 7',opacity:.7,interactive:false,smoothFactor:0});
 drawFront();visibility();
}
// Every occupied/neutral or inter-faction edge appears exactly once.
function boundaries(owners,siteOwners,size){
 const borders=[],divisions=new Map();
 function edge(i,j,a,b){
  const f=i<0?-1:owners[i],g=j<0?-1:owners[j];
  if(f!==g){borders.push([a,b]);return;}
  if(f<0||siteOwners[i]===siteOwners[j])return;
  const key=[siteOwners[i],siteOwners[j]].sort((a,b)=>a-b).join(':');
  if(!divisions.has(key))divisions.set(key,[]);divisions.get(key).push([a,b]);
 }
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*size+x;
  edge(i,x+1<size?i+1:-1,[x+1,y],[x+1,y+1]);
  edge(i,y+1<size?i+size:-1,[x,y+1],[x+1,y+1]);
  if(x===0)edge(i,-1,[0,y],[0,y+1]);
  if(y===0)edge(i,-1,[x,0],[x+1,0]);
 }return {borders,divisions};
}
function staggeredTicks(pts){
 const ticks=[];let remaining=11,side=1;
 for(let i=1;i<pts.length;i++){
  const a=pts[i-1],b=pts[i],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(!len)continue;
  let at=remaining;
  for(;at<=len;at+=11){
   const x=a.x+dx*at/len,y=a.y+dy*at/len;
   ticks.push([{x,y},{x:x-dy/len*7*side,y:y+dx/len*7*side}]);side=-side;
  }remaining=at-len;
 }return ticks;
}
// Join cell edges into paths, terminating at junctions rather than bridging branches.
function chain(edges){
 const adj=new Map(),used=new Set(),out=[];
 const key=p=>p.join(',');
 edges.forEach((e,i)=>e.forEach(p=>{const k=key(p);if(!adj.has(k))adj.set(k,[]);adj.get(k).push(i);}));
 function walk(start,index){const pts=[start];let at=start;
  while(index!==undefined&&!used.has(index)){
   used.add(index);const e=edges[index];at=key(e[0])===key(at)?e[1]:e[0];pts.push(at);
   const next=adj.get(key(at));if(next.length!==2)break;index=next.find(i=>!used.has(i));
  }if(pts.length>1)out.push(pts);
 }
 for(const [k,ids] of adj)if(ids.length!==2)for(const i of ids)if(!used.has(i))walk(k.split(',').map(Number),i);
 edges.forEach((e,i)=>{if(!used.has(i))walk(e[0],i);});return out;
}
function smooth(points){
 let p=points;
 const closed=p[0][0]===p[p.length-1][0]&&p[0][1]===p[p.length-1][1];
 if(closed)p=p.slice(0,-1);
 for(let pass=0;pass<3;pass++){
  const next=closed?[]:[p[0]];
  for(let i=0;i<(closed?p.length:p.length-1);i++){
   const a=p[i],b=p[(i+1)%p.length];next.push([.75*a[0]+.25*b[0],.75*a[1]+.25*b[1]],[.25*a[0]+.75*b[0],.25*a[1]+.75*b[1]]);
  }if(!closed)next.push(p[p.length-1]);p=next;
 }if(closed)p.push(p[0]);return p;
}
function toLatLng(points){return points.map(p=>[p[1]*step,p[0]*step]);}
function drawFront(){
 if(front)front.remove();
 const ticks=[];
 for(const curve of curves){
  const pts=toLatLng(curve).map(p=>map.latLngToLayerPoint(p));
  ticks.push(...staggeredTicks(pts).map(pair=>pair.map(p=>map.layerPointToLatLng(L.point(p.x,p.y)))));
 }

 front=L.layerGroup([L.polyline(curves.map(toLatLng),{color:'#202825',weight:1.5,opacity:.45,interactive:false,smoothFactor:0,lineCap:'round',lineJoin:'round'}),L.polyline(ticks,{color:'#202825',weight:1,opacity:.45,interactive:false})]);
 visibility();
}
map.on('zoomend',()=>{if(curves.length)drawFront();});

function update(){if(!data)return;
 const table=document.createElement('table');table.style.cssText='width:100%;font-size:11px;text-align:right;border-collapse:collapse';
 const head=table.createTHead().insertRow();for(const label of ['Categoria',...keys.map(k=>sides[k].name),'Tot.']){const th=document.createElement('th');th.textContent=label;th.style.cssText='padding:5px 3px;font-size:10px';head.append(th);}
 for(const [kind,label] of Object.entries(types)){
  const sites=data.sites.filter(s=>s.type===kind);if(!sites.length)continue;
  const row=table.insertRow();[label,...keys.map(k=>sites.filter(s=>s.side===k).length),sites.length].forEach((v,i)=>{const td=row.insertCell();td.textContent=v;td.style.padding='5px 3px';if(!i)td.style.textAlign='left';else if(i<4)td.style.color=sides[keys[i-1]].color;});
 }
 summary.replaceChildren(table);
 const signature=JSON.stringify(data.sites.map(s=>[s.id,s.side,s.x,s.y,s.influence_radius_m]));
 if(signature!==cache){rebuild();cache=signature;}else visibility();
}
const previous=render;render=function(){previous();update();};
update();
})();

'use strict';
const $=id=>document.getElementById(id);
const sides={rebels:{name:'Resistenza',color:'#48a783'},occupants:{name:'Occupanti',color:'#4389cf'},invaders:{name:'Invasori',color:'#df695b'}};
const types={roadblock:'Posto di blocco',camp:'Campo',city:'Città',outpost:'Avamposto',airport:'Aeroporto',resource:'Risorse',factory:'Fabbrica',seaport:'Porto',hq:'Quartier generale',rebpost:'Avamposto ribelle'};
let map,layer,data,busy=false;const active=new Set(Object.keys(sides));
const minorVisible={roadblock:true,camp:true}; // DRV_MINOR_V1
function message(s){$('status').textContent=s;}
function init(){
 if(!window.L){message('Libreria della mappa non disponibile. Verifica la connessione e ricarica.');return;}
 const crs=L.extend({},L.CRS.Simple,{transformation:new L.Transformation(0.006839,0,-0.006836,212)});
 map=L.map('map',{crs,minZoom:0,maxZoom:6,zoomControl:true}).setView([15000,15000],3);
 L.tileLayer('https://jetelain.github.io/Arma3Map/maps/altis/{z}/{x}/{y}.png',{tileSize:212,noWrap:true,attribution:'© Bohemia Interactive · Arma3Map',bounds:[[0,0],[30720,30720]]}).on('tileerror',()=>{$('map-warning').hidden=false;$('map-warning').textContent='Alcune parti della cartografia non sono disponibili. I dati della campagna restano consultabili.';}).addTo(map);
 layer=L.layerGroup().addTo(map);L.control.scale({imperial:false}).addTo(map);
 Object.entries(sides).forEach(([key,v])=>{const label=document.createElement('label'),input=document.createElement('input'),dot=document.createElement('i'),count=document.createElement('b');input.type='checkbox';input.checked=true;input.setAttribute('aria-label',v.name);input.onchange=()=>{input.checked?active.add(key):active.delete(key);render();};dot.style.background=v.color;count.id='count-'+key;count.textContent='—';label.append(input,dot,document.createTextNode(v.name),count);$('legend').append(label);});
 $('search').oninput=render;$('type').onchange=render;$('refresh').onclick=refresh;$('reset').onclick=()=>map.setView([15000,15000],3);
 const filters=document.createElement('fieldset');filters.style.cssText='border:1px solid #536461;margin:15px 0;padding:10px';
 const heading=document.createElement('legend');heading.textContent='Postazioni minori';filters.append(heading);
 for(const [kind,label] of [['roadblock','■ Posti di blocco'],['camp','▲ Campi']]){
   const option=document.createElement('option');option.value=kind;option.textContent=types[kind];$('type').append(option);
   const row=document.createElement('label'),check=document.createElement('input'),count=document.createElement('span');
   check.type='checkbox';check.checked=true;check.onchange=()=>{minorVisible[kind]=check.checked;render();};
   count.id='minor-count-'+kind;row.append(check,document.createTextNode(' '+label+' '),count);filters.append(row);
 }
 $('type').insertAdjacentElement('afterend',filters);
 refresh();setInterval(refresh,60000);
}
function render(){if(!data)return;layer.clearLayers();$('results').replaceChildren();let n=0;
 const query=$('search').value.trim().toLowerCase(),kind=$('type').value;
 data.sites.forEach(site=>{if(minorVisible[site.type]===false||!active.has(site.side)||(kind!=='all'&&site.type!==kind)||(query&&!site.id.toLowerCase().includes(query)))return;
 n++;const color=sides[site.side].color;
 const marker=(site.type==='roadblock'||site.type==='camp')?L.marker([site.y,site.x],{icon:L.divIcon({className:'drv-minor-icon',html:'<span style="display:block;text-align:center;font-size:17px;line-height:20px;color:'+color+';text-shadow:0 0 2px white,1px 1px 1px #111">'+(site.type==='camp'?'▲':'■')+'</span>',iconSize:[20,20],iconAnchor:[10,10]})}).addTo(layer):L.circleMarker([site.y,site.x],{radius:site.type==='hq'?10:site.type==='city'?7:6,color:site.destroyed?'#222':color,weight:2,fillColor:color,fillOpacity:.85,dashArray:site.destroyed?'3 3':null}).addTo(layer);
 const popup=document.createElement('div'),title=document.createElement('strong');title.textContent=site.id;popup.append(title,document.createElement('br'),document.createTextNode(types[site.type]+' · '+sides[site.side].name),document.createElement('br'),document.createTextNode('X '+Math.round(site.x)+' / Y '+Math.round(site.y)));
 if(site.destroyed)popup.append(document.createElement('br'),document.createTextNode('Sito distrutto'));
 // DRV_FRONT_POPUP_V1
 popup.append(document.createElement('br'),document.createTextNode('Guarnigione: '+(site.garrison_count==null?'non disponibile':site.garrison_count+' soldati')),document.createElement('br'),document.createTextNode('Raggio stimato: '+(site.influence_radius_m??'—')+' m'));
 marker.bindPopup(popup);const tip=document.createElement('span');tip.textContent=site.id;marker.bindTooltip(tip);
 if(query){const b=document.createElement('button');b.textContent=site.id+' · '+sides[site.side].name;b.onclick=()=>{map.setView([site.y,site.x],5);marker.openPopup();};$('results').append(b);}
 });$('visible').textContent=n+' posizioni';if(query&&!n)$('results').textContent='Nessun risultato.';
}
function validate(d){if(d.schema!==1||d.map!=='Altis'||!Array.isArray(d.sites)||!d.counts||!d.stats||!Number.isFinite(Date.parse(d.generated_at)))throw Error('Formato dati non valido');for(const s of d.sites){if(!sides[s.side]||!types[s.type]||typeof s.id!=='string'||![s.x,s.y].every(v=>Number.isFinite(v)&&v>=0&&v<=30720))throw Error('Posizione non valida');}return d;}
async function refresh(){if(busy)return;busy=true;$('refresh').disabled=true;try{const r=await fetch('data/campaign.json?t='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP '+r.status);const next=validate(await r.json());data=next;
 const fmt=new Intl.NumberFormat('it-IT',{maximumFractionDigits:0});$('money').textContent=fmt.format(data.stats.money);$('hr').textContent=fmt.format(data.stats.hr);$('skill').textContent=data.stats.skill;
 $('bar').replaceChildren();const total=Object.values(data.counts).reduce((a,b)=>a+b,0);Object.entries(sides).forEach(([k,v])=>{$('count-'+k).textContent=data.counts[k];const span=document.createElement('span');span.style.background=v.color;span.style.width=(total?data.counts[k]/total*100:0)+'%';$('bar').append(span);});
 $('save').textContent='Salvataggio: '+data.save_time.replace('T',' ')+' ('+data.save_timezone+')';$('sync').textContent='Sincronizzazione: '+new Date(data.generated_at).toLocaleString('it-IT',{timeZone:'Europe/Rome'})+' · Roma';$('coverage').textContent=data.minor_counts?'Postazioni minori incluse. Conteggi territoriali riferiti ai soli siti principali.':'Postazioni minori: in attesa del primo invio aggiornato.';for(const kind of ['roadblock','camp']){$('minor-count-'+kind).textContent='('+data.sites.filter(s=>s.type===kind).length+')';}
 const old=(Date.now()-Date.parse(data.generated_at))>7200000;
 message(data.sample?'ANTEPRIMA · salvataggio di esempio, sincronizzazione non attiva':old?'Dati non aggiornati da oltre 2 ore':'Ultimo invio ricevuto · aggiornamento orario');render();
 }catch(e){message(data?'Aggiornamento non riuscito: resta visibile l’ultimo stato valido.':'Dati non disponibili. Attendere il primo invio da Contabo.');}finally{busy=false;$('refresh').disabled=false;}}
init();

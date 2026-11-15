/* PLANETREX: self-contained Moon/Mars -> Earth explorer.
 * Planetary images are illustrative, not scientific base layers.
 * Navigation landmarks never become scientific references automatically.
 */
'use strict';
const $ = id => document.getElementById(id);
const canvas = $('globe');
const ctx = canvas.getContext('2d', {alpha:false});
const W = canvas.width, H = canvas.height;
const mapCanvas = document.createElement('canvas');
mapCanvas.width=1024;mapCanvas.height=512;
const mapCtx=mapCanvas.getContext('2d', {willReadFrequently:true});
const texture = {earth:null,moon:null,mars:null};
const texturesReady = {earth:false,moon:false,mars:false};
let earthGridNames = {};
const state = {target:'moon',view:'planet',lon:20*Math.PI/180,pitch:0,zoom:1,sites:[],planetProfiles:[],earthProfiles:[],cells:[],candidates:[],selection:null,planetSelection:null,reference:null,loading:false,requestId:0, pointer:null,hoverPoint:null};
const rad = n => n*Math.PI/180;
const deg = n => n*180/Math.PI;
const coord = n => `${Math.abs(n).toFixed(2)}°`;
const humanCoords = (lat,lon) => `${coord(lat)}${lat>=0?'N':'S'} · ${coord(lon)}${lon>=0?'E':'W'}`;
const escaped = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cap = s => s[0].toUpperCase()+s.slice(1);
const api = async url => {const r=await fetch(url);if(!r.ok)throw Error(`${r.status} ${r.statusText}`);return r.json();};
function loadTexture(body){
  const im=new Image();im.onload=()=>{
    mapCtx.clearRect(0,0,1024,512);mapCtx.drawImage(im,0,0,1024,512);
    texture[body]=new Uint8ClampedArray(mapCtx.getImageData(0,0,1024,512).data);
    texturesReady[body]=true;requestDraw();
  };
  im.onerror=()=>{texturesReady[body]=false;requestDraw();};
  im.src=`/explorer-assets/${body}.jpg`;
}
['earth','moon','mars'].forEach(loadTexture);
function currentBody(){return state.view==='earth'?'earth':state.target;}
function radius(){return 213*state.zoom;}
function project(point){
  const lon=rad(point.longitude),lat=rad(point.latitude),
    xw=Math.cos(lat)*Math.sin(lon),zw=Math.cos(lat)*Math.cos(lon),yw=Math.sin(lat),
    q=yw*Math.sin(state.pitch)+zw*Math.cos(state.pitch),
    nx=xw*Math.cos(state.lon)-q*Math.sin(state.lon),
    nz=xw*Math.sin(state.lon)+q*Math.cos(state.lon),
    ny=yw*Math.cos(state.pitch)-zw*Math.sin(state.pitch);
  return {x:W/2+nx*radius(),y:H/2-ny*radius(),visible:nz>.008};
}
function unproject(x,y){
  const nx=(x-W/2)/radius(),ny=(H/2-y)/radius(),rr=nx*nx+ny*ny;
  if(rr>1)return null;
  const nz=Math.sqrt(1-rr);
  const q=nz*Math.cos(state.lon)-nx*Math.sin(state.lon);
  const xw=nx*Math.cos(state.lon)+nz*Math.sin(state.lon);
  const yw=ny*Math.cos(state.pitch)+q*Math.sin(state.pitch);
  const zw=q*Math.cos(state.pitch)-ny*Math.sin(state.pitch);
  return {latitude:deg(Math.asin(Math.max(-1,Math.min(1,yw)))),longitude:deg(Math.atan2(xw,zw))};
}
function globeMarkers(){
  if(state.view==='earth'){
    if(state.candidates.length){return state.candidates.map((r,i)=>{
      const p=state.earthProfiles.find(q=>q.id===r.earth_id);
      return p?{...p,rank:i+1,scientific:true}:null;
    }).filter(Boolean);}
    if(state.earthProfiles.length)return state.earthProfiles.map(p=>({...p,scientific:false}));
    return state.cells.map((p,i)=>({...p,name:earthGridNames[p.id]||`Earth region · ${humanCoords(p.latitude,p.longitude)}`,id:p.id,scientific:false,unassessed:true}));
  }
  const saved=state.planetProfiles.map(p=>({...p,kind:'measured_reference',mission:'Imported scientific reference'}));
  return [...state.sites,...saved.filter(p=>!state.sites.some(site=>Math.abs(site.latitude-p.latitude)<.05&&Math.abs(site.longitude-p.longitude)<.05))];
}
function render(){
  const body=currentBody();const t=texture[body];const img=ctx.createImageData(W,H),data=img.data,r=radius();
  const cr=Math.cos(state.lon),sr=Math.sin(state.lon),cp=Math.cos(state.pitch),sp=Math.sin(state.pitch);
  for(let y=0;y<H;y++){
    const ny=(H/2-y)/r;
    for(let x=0;x<W;x++){
      const i=(y*W+x)*4,nx=(x-W/2)/r,v=nx*nx+ny*ny;
      if(v>1){data[i]=8;data[i+1]=13;data[i+2]=22;data[i+3]=255;continue;}
      const nz=Math.sqrt(1-v),q=nz*cr-nx*sr,xw=nx*cr+nz*sr,
        yw=ny*cp+q*sp,zw=q*cp-ny*sp,
        lon=Math.atan2(xw,zw),lat=Math.asin(Math.max(-1,Math.min(1,yw)));
      const u=(Math.floor((lon/(2*Math.PI)+.5)*1024)+1024)%1024;
      const vv=Math.max(0,Math.min(511,Math.floor((.5-lat/Math.PI)*512)));
      const index=(vv*1024+u)*4;
      const light=.34+.66*Math.max(0,nx*(-.25)+ny*.15+nz*.94);
      const base=body==='mars'?[160,75,48]:body==='moon'?[125,127,132]:[17,81,132];
      data[i]=Math.min(255,(t?t[index]:base[0])*light);
      data[i+1]=Math.min(255,(t?t[index+1]:base[1])*light);
      data[i+2]=Math.min(255,(t?t[index+2]:base[2])*light);
      data[i+3]=255;
    }
  }
  ctx.putImageData(img,0,0);
  ctx.beginPath();ctx.arc(W/2,H/2,r,0,2*Math.PI);ctx.lineWidth=1.5;
  ctx.strokeStyle=body==='mars'?'#a87b64':body==='earth'?'#5287a5':'#a9afbd';ctx.stroke();
  const markers=globeMarkers();
  let visibleMarkerCount=0;
  markers.forEach((p,i)=>{
    const pos=project(p);if(!pos.visible)return;
    visibleMarkerCount++;
    const isSelected=state.selection?.id===p.id;
    ctx.beginPath();ctx.arc(pos.x,pos.y,isSelected?7:4.5,0,2*Math.PI);
    ctx.fillStyle=isSelected?'#fff0c3':body==='mars'?'#f1ba86':body==='earth'?'#78d8d0':'#c5d6f3';ctx.fill();
    ctx.strokeStyle='#142333';ctx.lineWidth=2;ctx.stroke();
    if(isSelected||visibleMarkerCount<=12){
      const label=p.name||humanCoords(p.latitude,p.longitude);
      ctx.font='11px system-ui';const text=label.length>22?label.slice(0,19)+'…':label;
      const measure=ctx.measureText(text).width;
      let lx=pos.x+9,ly=pos.y-12;
      if(lx+measure+12>W)lx=pos.x-measure-18;
      if(ly<18)ly=pos.y+18;
      ctx.fillStyle='rgba(6,14,22,.8)';ctx.fillRect(lx-4,ly-12,measure+8,16);
      ctx.fillStyle='#e4edf6';ctx.fillText(text,lx,ly);
    }
  });
}
let drawQueued=false;
function requestDraw(){if(drawQueued)return;drawQueued=true;requestAnimationFrame(()=>{drawQueued=false;render();});}
function resetCamera(){state.zoom=1;state.lon=state.view==='earth'?rad(20):rad(state.target==='mars'?85:15);state.pitch=0;requestDraw();}
function focusPoint(point){state.lon=rad(point.longitude);state.pitch=rad(-point.latitude);state.zoom=1;requestDraw();}
function canvasLocation(e){const rect=canvas.getBoundingClientRect();return {x:(e.clientX-rect.left)*W/rect.width,y:(e.clientY-rect.top)*H/rect.height};}
canvas.addEventListener('pointerdown',e=>{const p=canvasLocation(e);state.pointer={...p,startX:p.x,startY:p.y,dragged:false};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{
  const p=canvasLocation(e);
  if(!state.pointer){const hovered=unproject(p.x,p.y);$('hover-coords').textContent=hovered?humanCoords(hovered.latitude,hovered.longitude)+' · click to select':'Drag to rotate · Scroll to zoom';return;}
  if(Math.hypot(p.x-state.pointer.startX,p.y-state.pointer.startY)>5)state.pointer.dragged=true;
  if(state.pointer.dragged){state.lon-=(p.x-state.pointer.x)*.006;state.pitch=Math.max(-1.24,Math.min(1.24,state.pitch+(p.y-state.pointer.y)*.005));requestDraw();}
  state.pointer.x=p.x;state.pointer.y=p.y;
});
canvas.addEventListener('pointerup',e=>{
  if(!state.pointer)return;
  const p=canvasLocation(e),wasDrag=state.pointer.dragged;state.pointer=null;
  if(wasDrag)return;
  const picked=globeMarkers().map(item=>({item,pos:project(item)})).filter(e=>e.pos.visible&&Math.hypot(e.pos.x-p.x,e.pos.y-p.y)<14).sort((a,b)=>Math.hypot(a.pos.x-p.x,a.pos.y-p.y)-Math.hypot(b.pos.x-p.x,b.pos.y-p.y))[0];
  if(picked){selectLocation(picked.item);return;}
  const point=unproject(p.x,p.y);
  if(point&&state.view==='planet')selectLocation({...point,id:`custom:${point.latitude.toFixed(4)}:${point.longitude.toFixed(4)}`,name:`Selected ${cap(state.target)} region`,kind:'custom_region'});
});
canvas.addEventListener('pointercancel',()=>state.pointer=null);
canvas.addEventListener('wheel',e=>{e.preventDefault();state.zoom=Math.max(.6,Math.min(1.08,state.zoom-e.deltaY*.00035));requestDraw();},{passive:false});
$('reset-camera').addEventListener('click',resetCamera);
function setText(id,value){$(id).textContent=value;}
function setPlanet(target){
  state.requestId++;state.error=null;state.target=target;state.view='planet';state.selection=null;state.planetSelection=null;state.reference=null;state.candidates=[];state.planetProfiles=[];state.sites=[];
  $('moon-tab').setAttribute('aria-pressed',String(target==='moon'));
  $('mars-tab').setAttribute('aria-pressed',String(target==='mars'));
  $('region-search').value='';
  setText('section-label',`SELECT A ${target==='moon'?'LUNAR':'MARTIAN'} REGION`);
  setText('page-heading',`Explore ${target==='moon'?'the Moon':'Mars'}`);
  setText('page-subtitle','Select a named landing site or click anywhere on the planet to search for Earth counterparts.');
  setText('globe-name',target.toUpperCase());setText('side-target',cap(target));
  setText('sidebar-eyebrow','DOCUMENTED LOCATIONS');setText('sidebar-heading',cap(target)+' mission sites');
  setText('sidebar-description','Choose a named site, or click a custom region directly on the globe.');
  setText('step-caption','01 / SELECT PLANETARY REGION');setText('reference-caption','Mission sites locate regions; they do not imply known Earth matches.');
  setText('asset-note',`Illustrative ${target} imagery, not a science-grade surface map`);
  setText('result-kind','NAVIGATION');$('back-button').classList.add('hidden');
  $('selection-panel').innerHTML='<div class="eyebrow">SELECT A REGION</div><p>Choose a marked site on the planet or in the list. The explorer will switch to Earth and display stored candidate evidence.</p>';
  resetCamera();renderList();loadPlanetSites();
}
async function loadPlanetSites(){
  const requestId=++state.requestId;state.loading=true;renderList();
  try{
    const [sites,profileResponse]=await Promise.all([api('/exploration/sites?body='+state.target),api('/science/profiles?body='+state.target+'&limit=200')]);
    if(requestId!==state.requestId)return;
    state.sites=sites.sites;state.planetProfiles=profileResponse.profiles;
  }catch(err){if(requestId===state.requestId){state.error=String(err);}}
  if(requestId===state.requestId){state.loading=false;renderList();requestDraw();}
}
function findReference(point){
  if(point.kind==='measured_reference')return point;
  // Only use an independently sourced, already-imported measurement located
  // within 0.1 degrees. Never generate a measured profile from a site name.
  return state.planetProfiles.find(p=>Math.abs(p.latitude-point.latitude)<=.1&&Math.abs(p.longitude-point.longitude)<=.1) || null;
}
async function selectLocation(point){
  if(state.view==='earth'){state.selection=point;focusPoint(point);renderDetails();renderList();return;}
  state.selection=null;state.planetSelection=point;state.reference=findReference(point);state.view='earth';state.candidates=[];state.earthProfiles=[];state.cells=[];
  setText('section-label',`${state.target.toUpperCase()} → EARTH`);
  setText('page-heading','Explore Earth counterparts');
  setText('page-subtitle',`${point.name} · ${humanCoords(point.latitude,point.longitude)}. Only scientifically supported comparisons are ranked.`);
  setText('globe-name','EARTH');setText('sidebar-eyebrow','EARTH LOCATIONS');setText('sidebar-heading','Earth search results');
  setText('sidebar-description',state.reference?'Available terrain-screening results, if Earth profiles have been processed.':'This planetary region has no imported measured reference. Explore mapped Earth cells without fabricated matches.');
  setText('step-caption','02 / INSPECT EARTH EVIDENCE');setText('reference-caption','No similarity percentages without validated scientific calculations.');
  setText('asset-note','Earth imagery · local texture');setText('result-kind','EARTH SEARCH');
  $('back-label').textContent=cap(state.target);$('back-button').classList.remove('hidden');
  $('region-search').value='';state.loading=true;state.error=null;resetCamera();renderList();renderDetails();
  const req=++state.requestId;
  try{
    const [earth,grid,names]=await Promise.all([api('/science/profiles?body=earth&limit=200'),api('/discovery/grid?step=30'),api('/explorer-assets/earth_region_names.json')]);
    if(req!==state.requestId)return;
    state.earthProfiles=earth.profiles;state.cells=grid.cells;earthGridNames=names.labels||{};
    if(state.reference){
      const data=await api('/science/candidates?reference_id='+encodeURIComponent(state.reference.id)+'&limit=200');
      if(req!==state.requestId)return;
      state.candidates=data.results;
    }
  }catch(err){if(req===state.requestId)state.error=String(err);}
  if(req===state.requestId){state.loading=false;renderList();renderDetails();requestDraw();}
}
function renderList(){
  const list=$('region-list');list.replaceChildren();
  if(state.loading){list.innerHTML='<div class="empty loading">Loading locations…</div>';setText('list-counter','LOADING');return;}
  if(state.error){const box=document.createElement('div');box.className='empty error';box.textContent='Unable to load data: '+state.error;list.append(box);return;}
  const query=$('region-search').value.trim().toLowerCase();const items=globeMarkers().filter(p=>(p.name||'').toLowerCase().includes(query)||humanCoords(p.latitude,p.longitude).toLowerCase().includes(query)||(p.mission||'').toLowerCase().includes(query));
  setText('list-counter',`${items.length} ${state.view==='planet'?'MAPPED LOCATIONS':state.candidates.length?'SCREENED PROFILES':state.earthProfiles.length?'PROCESSED PROFILES':'UNASSESSED GRID CELLS'}`);
  if(!items.length){const box=document.createElement('div');box.className='empty';box.textContent=state.view==='planet'?'No matching planetary locations. Click any point on the globe instead.':'No matching Earth regions for this search.';list.append(box);return;}
  items.forEach((item,i)=>{
    const button=document.createElement('button');button.className='region';button.type='button';
    if(state.selection?.id===item.id)button.classList.add('active');
    const index=document.createElement('span');index.className='index';index.textContent=String(i+1).padStart(2,'0');
    const content=document.createElement('span');content.className='region-body';
    const title=document.createElement('strong');title.textContent=item.name;
    const subtitle=document.createElement('small');
    if(state.view==='planet')subtitle.textContent=`${item.mission||'Scientific reference'} · ${humanCoords(item.latitude,item.longitude)}`;
    else subtitle.textContent=humanCoords(item.latitude,item.longitude)+(item.unassessed?' · not analyzed':' · stored terrain profile');
    content.append(title,subtitle);button.append(index,content);
    if(state.view==='earth'&&state.candidates.length){const r=state.candidates.find(r=>r.earth_id===item.id);if(r){const score=document.createElement('span');score.className='status';score.textContent=`d=${r.normalized_distance}`;button.append(score);}}
    button.addEventListener('click',()=>selectLocation(item));list.append(button);
  });
}
function renderDetails(){
  const panel=$('selection-panel');panel.replaceChildren();
  const heading=document.createElement('div');heading.className='eyebrow';heading.textContent='SELECTED PLANETARY REGION';panel.append(heading);
  const name=document.createElement('strong');name.textContent=state.reference?.name||state.planetSelection?.name||'No region';panel.append(name);
  const desc=document.createElement('p');desc.textContent=state.planetSelection?`${humanCoords(state.planetSelection.latitude,state.planetSelection.longitude)} on ${cap(state.target)}.`:'Select a location.';panel.append(desc);
  const note=document.createElement('p');note.className='info';
  if(!state.reference){note.textContent='No source-backed planetary terrain measurements have been imported for this region. No scientifically valid Earth matches can be claimed yet.';}
  else if(!state.candidates.length){note.textContent='Measured reference available. No comparable stored Earth profiles were found with both required terrain features.';}
  else{note.textContent=`${state.candidates.length} Earth terrain-screening records found. Lower normalized distance is closer under an UNVALIDATED two-feature model—not a similarity percentage.`;}
  panel.append(note);
  if(state.planetSelection?.source_url&&state.view==='earth'){
    const link=document.createElement('a');link.href=state.planetSelection.source_url;link.textContent='View planetary site source ↗';link.target='_blank';link.rel='noopener noreferrer';panel.append(link);
  }
  if(state.view==='earth'&&state.selection){
    const selectedTitle=document.createElement('h3');selectedTitle.textContent=state.selection.name;panel.append(selectedTitle);
    const h=document.createElement('p');h.textContent='Earth evidence: '+(state.selection.source_product||'Not measured');panel.append(h);
    if(state.selection.features){Object.entries(state.selection.features).forEach(([key,val])=>{
      const row=document.createElement('div');row.className='data-row';const title=document.createElement('span');title.textContent=key;const value=document.createElement('span');value.textContent=`${val.value} ${val.unit}`;row.append(title,value);panel.append(row);
    });}
  }
}
$('moon-tab').addEventListener('click',()=>{state.error=null;setPlanet('moon');});
$('mars-tab').addEventListener('click',()=>{state.error=null;setPlanet('mars');});
$('back-button').addEventListener('click',()=>{state.error=null;setPlanet(state.target);});
$('region-search').addEventListener('input',renderList);
setPlanet('moon');

import {useEffect,useMemo,useState} from 'react';
import {Activity,ArrowLeft,ChevronRight,Compass,Database,Globe2,Info,Layers3,MapPin,RefreshCcw,Search,SlidersHorizontal} from 'lucide-react';
import {DiscoveryGlobe} from './DiscoveryGlobe';
import {ScientificResults} from './ScientificResults';
import {GLOBAL_BOUNDS,applyElevations,requestGrid,requestStoredElevations} from './api';
import type {Bounds,Cell,PlanetTarget} from './api';
import './discovery.css';

type Level={bounds:Bounds;step:number;label:string};
const WORLD:Level={bounds:GLOBAL_BOUNDS,step:30,label:'Entire Earth'};
const format=(n:number)=>`${n>=0?'+':''}${n.toFixed(2)}°`;
function coordinateName(c:Cell){return `${Math.abs(c.latitude).toFixed(1)}°${c.latitude>=0?'N':'S'} · ${Math.abs(c.longitude).toFixed(1)}°${c.longitude>=0?'E':'W'}`;}
export function DiscoveryPage(){
 const [target,setTarget]=useState<PlanetTarget>('moon');
 const [level,setLevel]=useState<Level>(WORLD);
 const [history,setHistory]=useState<Level[]>([]);
 const [cells,setCells]=useState<Cell[]>([]);
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [filter,setFilter]=useState('all');
 const [search,setSearch]=useState('');
 const [loading,setLoading]=useState(false);
 const [sampling,setSampling]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [banner,setBanner]=useState<string|null>(null);
 const [resetSignal,setResetSignal]=useState(0);
 const [mobileOpen,setMobileOpen]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();setCells([]);setSelectedId(null);setFilter('all');setLoading(true);setError(null);setBanner(null);
  requestGrid(level.bounds,level.step,controller.signal).then(async grid=>{
   try{const stored=await requestStoredElevations(controller.signal);if(!controller.signal.aborted)setCells(applyElevations(grid,stored));}
   catch{if(!controller.signal.aborted)setCells(grid);}
  }).catch(e=>{if(!controller.signal.aborted)setError(String(e instanceof Error?e.message:e));}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[level]);
 const selected=cells.find(c=>c.id===selectedId)??null;
 const visible=useMemo(()=>cells.filter(c=>{
  if(filter==='sampled'&&c.status!=='sampled')return false;
  if(filter==='unassessed'&&c.status!=='unassessed')return false;
  if(search&& !`${c.latitude} ${c.longitude} ${coordinateName(c)}`.toLowerCase().includes(search.toLowerCase()))return false;
  return true;
 }),[cells,filter,search]);
 const sampled=cells.filter(c=>c.status==='sampled').length;
 const missing=cells.filter(c=>c.status==='missing').length;
 const screen=async()=>{
  setSampling(true);setError(null);setBanner(null);
  try{
   const observations=await requestStoredElevations();
   setCells(previous=>applyElevations(previous,observations));
   setBanner(`Reloaded ${observations.length} previously saved center-point elevation readings. New scientific processing is developer-controlled in the backend.`);
  }catch(e){setError(e instanceof Error?e.message:String(e));}
  finally{setSampling(false);}
 };
 const refine=()=>{
  if(!selected)return;
  const nextStep=Math.max(0.25,Math.round((level.step/3)*100)/100);
  setHistory(h=>[...h,level]);setLevel({bounds:selected.bounds,step:nextStep,label:`Region ${coordinateName(selected)}`});setResetSignal(n=>n+1);setMobileOpen(false);
 };
 const goBack=()=>{if(!history.length)return;setLevel(history[history.length-1]);setHistory(h=>h.slice(0,-1));setResetSignal(n=>n+1);};
 const reset=()=>{setHistory([]);setLevel(WORLD);setResetSignal(n=>n+1);setSelectedId(null);};
 return <div className={`scan-app target-${target}`}>
 <header className="scan-topbar"><div className="scan-brand"><span className="scan-logo"><Globe2 size={23}/></span><div><strong>PLANETREX</strong><small>PLANETARY ANALOG RESEARCH</small></div></div><nav className="scan-nav"><span className="active"><Compass size={15}/> Global Discovery</span><span><Database size={15}/> Scientific Screening</span></nav><div className="scan-planets" role="group" aria-label="Reference target"><button aria-pressed={target==='moon'} className={target==='moon'?'selected':''} onClick={()=>setTarget('moon')}>☾ MOON</button><button aria-pressed={target==='mars'} className={target==='mars'?'selected':''} onClick={()=>setTarget('mars')}>◌ MARS</button></div></header>
 <div className="scan-layout"><section className="scan-main"><div className="scan-heading"><div className="scan-eyebrow"><span className="scan-live-dot"/> GEOGRAPHIC SEARCH / {target.toUpperCase()} TARGET</div><h1>Discover the <em>unexplored.</em></h1><p>Screen a grid covering any part of Earth—not a catalog of previously named analog sites. Investigate promising regions as evidence becomes available.</p></div>
 <div className="scan-stage"><DiscoveryGlobe cells={visible} selected={selected} target={target} onSelect={id=>setSelectedId(id)} resetSignal={resetSignal}/><div className="scan-stage-top"><span><Layers3 size={13}/> {level.label}</span><span>{level.step}° RESOLUTION</span></div><div className="scan-stage-actions"><button onClick={()=>{setResetSignal(n=>n+1);setSelectedId(null);}}><RefreshCcw size={14}/> Reset camera</button></div></div>
 <div className="scan-summary"><div><span>GEOGRAPHIC CELLS</span><strong>{cells.length}</strong><small>Current search region</small></div><div><span>POINTS SAMPLED</span><strong>{sampled}</strong><small>{missing} missing readings</small></div><div><span>SIMILARITY</span><strong>—</strong><small>Not computed</small></div><div><span>REFERENCE</span><strong className="scan-ref">{target==='moon'?'Moon':'Mars'}</strong><small>Target only</small></div></div>
 <ScientificResults target={target} onLocate={(lat,lon)=>{const nearest=cells.reduce<Cell|null>((best,c)=>!best || (c.latitude-lat)**2+(c.longitude-lon)**2 < (best.latitude-lat)**2+(best.longitude-lon)**2?c:best,null);if(nearest)setSelectedId(nearest.id);}}/>
 <div className="scan-notice"><Info size={17}/><span><b>Geographic coverage ≠ scientific discovery.</b> Grid cells are unassessed search areas, not analog matches. Live terrain sampling retrieves actual elevation-model estimates at cell centers. There are no fabricated similarity percentages.</span></div>
 {error&&<div className="scan-error" role="alert">{error} — Check that the updated FastAPI backend is running on port 8000.</div>}
 {banner&&<div className="scan-success" role="status">{banner}</div>}
 <button className="scan-mobile-toggle" onClick={()=>setMobileOpen(true)}>Browse {visible.length} grid cells <ChevronRight size={16}/></button>
 </section>
 <aside className={`scan-side ${mobileOpen?'mobile-open':''}`}><div className="scan-side-header"><div className="scan-eyebrow">EARTH-WIDE CANDIDATE SCREENING</div><h2>Search regions</h2><p>Every grid cell is considered—not only known sites.</p><button className="scan-side-close" onClick={()=>setMobileOpen(false)}>Close</button></div>
 <div className="scan-control-block"><div className="scan-scope"><span>SEARCH SCOPE</span><strong>{level.label}</strong></div><div className="scan-controls-row"><button onClick={goBack} disabled={!history.length}><ArrowLeft size={14}/> Back</button><button onClick={reset} disabled={history.length===0&&level===WORLD}><Globe2 size={14}/> Whole Earth</button></div><button className="scan-primary" onClick={screen} disabled={sampling||loading||cells.length===0}><Activity size={16}/>{sampling?'Reading saved data…':'Reload saved elevation points'}</button><small className="scan-subnote">No public scientific download or recalculation. Operators use the documented backend batch command.</small></div>
 <div className="scan-filter-block"><label className="scan-search"><Search size={15}/><input aria-label="Search coordinates" placeholder="Find coordinates…" value={search} onChange={e=>setSearch(e.target.value)}/></label><label className="scan-filter"><SlidersHorizontal size={14}/> STATUS<select aria-label="Filter status" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All cells</option><option value="unassessed">Not sampled</option><option value="sampled">Elevation sampled</option></select></label></div>
 <div className="scan-list-title"><span>GRID CELLS</span><span>{visible.length} shown</span></div><div className="scan-list" id="rankings">{loading&&<div className="scan-empty">Generating worldwide grid…</div>}{!loading&&visible.length===0&&<div className="scan-empty">No cells match the current filter.</div>}{visible.map((c,index)=><button className={`scan-cell ${selectedId===c.id?'active':''}`} key={c.id} onClick={()=>{setSelectedId(c.id);setMobileOpen(false);}}><span className="scan-index">{String(index+1).padStart(2,'0')}</span><span className="scan-cell-body"><strong>{coordinateName(c)}</strong><small><MapPin size={11}/> {c.status==='sampled'?`${c.elevation_m?.toLocaleString()} m DEM elevation` :c.status==='missing'?'No elevation returned':'Unassessed · No measurements'}</small></span><span className={`scan-status ${c.status}`} title={c.status}/></button>)}</div>
 {selected&&<div className="scan-selection"><div className="scan-selection-title"><span>SELECTED SEARCH CELL</span><button onClick={()=>setSelectedId(null)}>×</button></div><strong>{coordinateName(selected)}</strong><p>Lat {format(selected.bounds.south)} to {format(selected.bounds.north)} / Lon {format(selected.bounds.west)} to {format(selected.bounds.east)}</p><div className="scan-measures"><span>DEM elevation at center</span><b>{selected.elevation_m===null?'Not available':`${selected.elevation_m} m`}</b><span>Moon/Mars similarity</span><b>Not assessed</b><span>Evidence</span><b>{selected.status==='sampled'?'Modeled DEM estimate':'Not collected'}</b></div><button className="scan-primary" onClick={refine} disabled={level.step<=.25}>Refine this region <ChevronRight size={15}/></button><small>Refining divides this entire region into smaller cells; it does not rank unknown places without evidence.</small></div>}
 <footer className="scan-side-footer"><span className="scan-live-dot"/> WGS84 / GLOBAL GRID / EVIDENCE-SAFE</footer></aside></div>
 </div>;
}

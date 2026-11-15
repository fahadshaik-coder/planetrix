import {useEffect,useState} from 'react';
import type {PlanetTarget} from './api';

type Measurement={value:number;unit:string;uncertainty:number|null};
type Profile={id:string;name:string;body:string;latitude:number;longitude:number;source_url:string;source_product:string;source_version:string;features:Record<string,Measurement>;quality_note:string};
type Comparison={earth_id:string;normalized_distance:number;feature_differences:Record<string,{absolute_difference:number;normalized_difference:number;scale:number;unit:string}>;similarity_percent:null;scientific_status:string};
const BASE=(import.meta.env.VITE_API_BASE_URL||'http://127.0.0.1:8000').replace(/\/$/,'');

async function fetchJson<T>(url:string,signal:AbortSignal):Promise<T>{
 const response=await fetch(BASE+url,{signal});
 if(!response.ok)throw new Error(`Backend HTTP ${response.status}`);
 return response.json() as Promise<T>;
}
export function ScientificResults({target,onLocate}:{target:PlanetTarget;onLocate:(lat:number,lon:number)=>void}){
 const [references,setReferences]=useState<Profile[]>([]);
 const [selected,setSelected]=useState('');
 const [results,setResults]=useState<Comparison[]>([]);
 const [profiles,setProfiles]=useState<Record<string,Profile>>({});
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();setError('');setReferences([]);setSelected('');setResults([]);
  fetchJson<{profiles:Profile[]}>(`/science/profiles?body=${target}&limit=200`,controller.signal)
   .then(data=>{setReferences(data.profiles);if(data.profiles[0])setSelected(data.profiles[0].id);})
   .catch(err=>{if(!controller.signal.aborted)setError(String(err));});
  return()=>controller.abort();
 },[target]);
 useEffect(()=>{
  if(!selected){setResults([]);return;}
  const controller=new AbortController();setBusy(true);setError('');
  Promise.all([
    fetchJson<{results:Comparison[]}>(`/science/candidates?reference_id=${encodeURIComponent(selected)}&limit=100`,controller.signal),
    fetchJson<{profiles:Profile[]}>('/science/profiles?body=earth&limit=200',controller.signal),
  ]).then(([matches,earth])=>{
    setResults(matches.results);
    setProfiles(Object.fromEntries(earth.profiles.map(p=>[p.id,p])));
  }).catch(err=>{if(!controller.signal.aborted)setError(String(err));})
   .finally(()=>{if(!controller.signal.aborted)setBusy(false);});
  return()=>controller.abort();
 },[selected]);
 const ref=references.find(r=>r.id===selected);
 return <section className="science-panel" aria-label="Stored planetary scientific profiles">
  <div className="science-panel-head"><div><span>SCIENTIFIC SCREENING</span><h2>{target==='moon'?'Moon':'Mars'} → Earth</h2></div><small>Stored data only · No fabricated rankings</small></div>
  <p>Terrain pilot: compare documented slope and detrended roughness from imported planetary references with locally processed Earth DEM profiles. Lower normalized distance means closer under the stated scales, not confirmed analog similarity.</p>
  {error&&<div role="alert" className="scan-error">{error}</div>}
  {!error&&references.length===0&&<div className="science-empty">No verified {target} reference has been imported. This is correct: PLANETREX will not create comparison scores without real comparable measurements. See <code>docs/SCIENTIFIC_PIPELINE.md</code> for the manual import workflow.</div>}
  {references.length>0&&<><label className="science-reference">Reference region <select value={selected} onChange={e=>setSelected(e.target.value)}>{references.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
  {ref&&<small className="science-source">Source: <a href={ref.source_url} target="_blank" rel="noreferrer">{ref.source_product}</a> · {ref.source_version} · {ref.quality_note}</small>}
  {busy?<div className="science-empty">Loading stored candidate profiles…</div>:results.length===0?<div className="science-empty">No eligible Earth profiles with both comparable terrain features. Run a manual DEM screening batch to populate this result list.</div>:<div className="science-results">{results.map((result,index)=>{const earth=profiles[result.earth_id];return <button className="science-result" key={result.earth_id} onClick={()=>earth&&onLocate(earth.latitude,earth.longitude)}><span>{index+1}.</span><span><strong>{earth?.name||result.earth_id}</strong><small>{earth?`${earth.latitude.toFixed(3)}°, ${earth.longitude.toFixed(3)}° · `:''}Slope diff {result.feature_differences.slope_deg.absolute_difference.toFixed(2)}° · Roughness diff {result.feature_differences.residual_roughness_m.absolute_difference.toFixed(2)}m</small></span><span className="science-distance">Distance {result.normalized_distance.toFixed(3)}<small>No validated similarity %</small></span></button>;})}</div>}
  </>}
 </section>;
}

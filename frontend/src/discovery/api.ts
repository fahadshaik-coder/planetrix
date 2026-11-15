export type PlanetTarget = 'moon' | 'mars';
export type Bounds = {south:number;north:number;west:number;east:number};
export type Cell = {id:string;bounds:Bounds;latitude:number;longitude:number;status:'unassessed'|'sampled'|'missing';elevation_m:number|null;similarity_percent:null;evidence:null};
export type Elevation = {latitude:number;longitude:number;elevation_m:number|null;status:'sampled'|'missing';retrieved_at:string;provenance:{source:string;url:string;citation:string;unit:string;method:string}};
const BASE=(import.meta.env.VITE_API_BASE_URL||'http://127.0.0.1:8000').replace(/\/$/,'');
async function getJson(url:string,options?:RequestInit):Promise<unknown>{
 const r=await fetch(`${BASE}${url}`,options);
 if(!r.ok){let extra='';try{const body=await r.json() as {detail?:unknown};if(typeof body.detail==='string')extra=` — ${body.detail}`;}catch{/* keep HTTP error */}throw new Error(`HTTP ${r.status}${extra}`);}
 return r.json();
}
export async function requestGrid(bounds:Bounds,step:number,signal?:AbortSignal):Promise<Cell[]>{
 const query=new URLSearchParams({...Object.fromEntries(Object.entries(bounds).map(([k,v])=>[k,String(v)])),step:String(step)});
 const response=await getJson(`/discovery/grid?${query}`,{signal});
 if(typeof response!=='object'||response===null||!('cells' in response)||!Array.isArray(response.cells))throw new Error('Invalid discovery-grid response');
 return (response.cells as Cell[]).map(c=>({ ...c, similarity_percent:null, elevation_m:null, status:'unassessed'}));
}
export async function requestStoredElevations(signal?:AbortSignal):Promise<Elevation[]>{
 const result=await getJson('/discovery/observations',{signal});
 if(typeof result!=='object'||result===null||!('samples' in result)||!Array.isArray(result.samples))throw new Error('Invalid saved-observations response');
 return result.samples as Elevation[];
}
export const GLOBAL_BOUNDS:Bounds={south:-90,north:90,west:-180,east:180};
export function applyElevations(cells:Cell[],samples:Elevation[]):Cell[]{
 const map=new Map(samples.map(s=>[`${s.latitude}:${s.longitude}`,s]));
 return cells.map(c=>{const s=map.get(`${c.latitude}:${c.longitude}`);return s?{...c,status:s.status,elevation_m:s.elevation_m}:c;});
}

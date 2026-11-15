// Official-source metadata only. Neither feed contains computed analog similarity.
export interface EarthEvent { id:string; title:string; latitude:number; longitude:number; crs:string; date:string|null; categories:string[]; source_url:string; }
export interface PdsProduct { id:string; title:string; product_class:string; source_url:string; target:string; }
export interface EarthEventFeed { source:string; source_url:string; retrieved_at:string; kind:string; analog_results:false; events:EarthEvent[]; }
export interface PdsFeed { source:string; source_url:string; retrieved_at:string; target:string; kind:string; analog_results:false; products:PdsProduct[]; warning:string; }
const BASE=(import.meta.env.VITE_API_BASE_URL||'http://127.0.0.1:8000').replace(/\/$/,'');
async function request(path:string, signal?:AbortSignal):Promise<unknown>{
 const response=await fetch(`${BASE}${path}`,{signal});
 if(!response.ok){let message=`HTTP ${response.status}`;try{const data:unknown=await response.json();if(data&&typeof data==='object'&&'detail' in data&&typeof data.detail==='string')message=data.detail;}catch{/* preserve HTTP status */}throw new Error(message);}
 return response.json();
}
export async function fetchEarthEvents(signal?:AbortSignal):Promise<EarthEventFeed>{
 const data=await request('/scientific/earth-events?limit=40',signal);
 if(!data||typeof data!=='object'||!('events' in data)||!Array.isArray(data.events)||!data.events.every(e=>e&&typeof e.id==='string'&&typeof e.title==='string'&&typeof e.latitude==='number'&&Math.abs(e.latitude)<=90&&typeof e.longitude==='number'&&Math.abs(e.longitude)<=180))throw new Error('Invalid Earth events response');
 return data as EarthEventFeed;
}
export async function fetchPdsProducts(target:'moon'|'mars',signal?:AbortSignal):Promise<PdsFeed>{
 const data=await request(`/scientific/planetary-products?target=${target}&limit=15`,signal);
 if(!data||typeof data!=='object'||!('products' in data)||!Array.isArray(data.products)||!data.products.every(p=>p&&typeof p.id==='string'&&typeof p.title==='string'))throw new Error('Invalid PDS archive response');
 return data as PdsFeed;
}

import type {DiscoveryResult,PlanetaryBody} from '../types/scientific';
export interface AnalogFiltersState {search:string;minScore:number;minCoverage:number;}
export function percent(value: number|null|undefined): string {return value==null?'Not available':`${Math.round(value)}%`;}
export function coverage(value:number|null|undefined):string {return value==null?'Not available':`${Math.round(value*100)}%`;}
export function rankAnalogs(records:DiscoveryResult[],target:PlanetaryBody,filters:AnalogFiltersState):DiscoveryResult[] {
 return records.filter(r=>r.reference.body===target && r.earth.name.toLowerCase().includes(filters.search.toLowerCase().trim()) && (r.similarity.percent??-1)>=filters.minScore && ((r.completeness.fraction??-1)*100)>=filters.minCoverage).sort((a,b)=>(b.similarity.percent??-1)-(a.similarity.percent??-1));
}
export function validateRecords(payload:unknown): DiscoveryResult[] {
 if(!Array.isArray(payload))throw new Error('API response must be an array.');
 return payload.map((row,i)=>{
  if(!row||typeof row!=='object')throw new Error(`Invalid record ${i}`);
  const r=row as Partial<DiscoveryResult>;
  if(typeof r.id!=='string'||!r.earth||typeof r.earth.name!=='string'||!r.earth.coordinates||typeof r.earth.coordinates.latitude!=='number'||typeof r.earth.coordinates.longitude!=='number'||Math.abs(r.earth.coordinates.latitude)>90||Math.abs(r.earth.coordinates.longitude)>180||!r.reference||!['moon','mars'].includes(r.reference.body)||!r.similarity||!r.completeness||!Array.isArray(r.categories))throw new Error(`Invalid scientific record ${i}`);
  if(r.similarity.percent!==null&&(typeof r.similarity.percent!=='number'||r.similarity.percent<0||r.similarity.percent>100))throw new Error(`Invalid similarity score in record ${i}`);
  if(r.completeness.fraction!==null&&(typeof r.completeness.fraction!=='number'||r.completeness.fraction<0||r.completeness.fraction>1))throw new Error(`Invalid completeness in record ${i}`);
  if(!r.demonstration && r.similarity.percent!==null && (!r.similarity.normalized || !r.similarity.method))throw new Error(`Unverified similarity methodology in record ${i}`);
  return r as DiscoveryResult;
 });
}

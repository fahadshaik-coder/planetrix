import type {DiscoveryResult,PlanetaryBody} from '../types/scientific';
import {validateRecords} from '../utils/analogs';
const BASE=(import.meta.env.VITE_API_BASE_URL||'http://127.0.0.1:8000').replace(/\/$/,'');
export async function fetchAnalogs(target:PlanetaryBody,signal?:AbortSignal):Promise<DiscoveryResult[]> {
 const response=await fetch(`${BASE}/analogs?target=${encodeURIComponent(target)}`,{signal});
 if(!response.ok)throw new Error(response.status===404?'Analog endpoint not implemented yet (HTTP 404).':`Backend error: HTTP ${response.status}`);
 return validateRecords(await response.json());
}
// Future, not currently called: GET /locations/{id}; GET /comparisons?earth_id=...&reference_id=...

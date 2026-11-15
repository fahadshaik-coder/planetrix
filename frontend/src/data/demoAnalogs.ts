import type {CategoryKey, DiscoveryResult, PlanetaryBody, ScientificCategory} from '../types/scientific';
// TEST FIXTURES ONLY. All scores and coverage below are fictional, not scientific findings.
// Coordinates are approximate for geographic interface testing; no scientific measurements are invented.
const definitions: {id:string;name:string;region:string;lat:number;lon:number;target:PlanetaryBody;reference:string;score:number;coverage:number}[] = [
  {id:'m1',name:'Lanzarote Volcanic Fields',region:'Canary Islands, Spain',lat:29.03,lon:-13.61,target:'moon',reference:'Illustrative lunar mare reference',score:92,coverage:81},
  {id:'m2',name:'Mauna Kea',region:'Hawaiʻi, United States',lat:19.82,lon:-155.47,target:'moon',reference:'Illustrative lunar highland reference',score:88,coverage:72},
  {id:'m3',name:'Atacama Desert',region:'Northern Chile',lat:-23.86,lon:-69.13,target:'moon',reference:'Illustrative lunar regolith reference',score:83,coverage:68},
  {id:'m4',name:'Laki Lava Field',region:'Southern Iceland',lat:64.08,lon:-18.23,target:'moon',reference:'Illustrative lunar volcanic reference',score:77,coverage:64},
  {id:'m5',name:'Ladakh Cold Desert',region:'India',lat:34.17,lon:77.58,target:'moon',reference:'Illustrative lunar surface reference',score:73,coverage:58},
  {id:'r1',name:'Atacama Desert',region:'Northern Chile',lat:-23.86,lon:-69.13,target:'mars',reference:'Illustrative Martian arid reference',score:94,coverage:79},
  {id:'r2',name:'Wadi Rum',region:'Jordan',lat:29.58,lon:35.42,target:'mars',reference:'Illustrative Martian sedimentary reference',score:90,coverage:76},
  {id:'r3',name:'McMurdo Dry Valleys',region:'Antarctica',lat:-77.5,lon:162,target:'mars',reference:'Illustrative Martian cold-desert reference',score:86,coverage:67},
  {id:'r4',name:'Bardenas Reales',region:'Navarre, Spain',lat:42.18,lon:-1.48,target:'mars',reference:'Illustrative Martian erosion reference',score:81,coverage:63},
  {id:'r5',name:'Danakil Depression',region:'Afar, Ethiopia',lat:14.24,lon:40.3,target:'mars',reference:'Illustrative Martian extreme-environment reference',score:74,coverage:55}
];
export const CATEGORY_NAMES: Record<CategoryKey,string> = {geology:'Geology & mineralogy',terrain:'Terrain & topography',environment:'Environmental conditions',resources:'Water, ice & resources',processes:'Surface processes',biology:'Biology & habitability',subsurface:'Subsurface features',engineering:'Exploration & engineering'};
const crs='EPSG:4326 (Earth / WGS 84)';
function categories(): ScientificCategory[] {return (Object.entries(CATEGORY_NAMES) as [CategoryKey,string][]).map(([key,name])=>({key,name,similarity:{percent:null,method:null,normalized:false},completeness:{fraction:null,assessed:null,expected:null},measurements:[],limitation:'Not available — no validated scientific comparison has been computed.'}));}
export const demoAnalogs: DiscoveryResult[] = definitions.map((row)=>({
 id:row.id,earth:{id:row.id,name:row.name,region:row.region,coordinates:{latitude:row.lat,longitude:row.lon,crs}},
 reference:{id:`demo-${row.target}-${row.id}`,body:row.target,name:row.reference,coordinates:null},
 similarity:{percent:row.score,method:'Fictional UI fixture — no normalization performed',normalized:false},
 completeness:{fraction:row.coverage/100,assessed:null,expected:null},
 evidence:{status:'demonstration',description:'Fictional interface test result, NOT an observed scientific similarity.'},
 categories:categories(),provenance:[],demonstration:true
}));

import {Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {OrbitControls,Stars} from '@react-three/drei';
import * as THREE from 'three';
import type {OrbitControls as OrbitControlsImpl} from 'three-stdlib';
import type {DiscoveryResult,PlanetaryBody} from '../../types/scientific';
import {positionFromLatLon} from './geo';
import {GlobeMarker} from './GlobeMarker';
import {EarthEventMarker} from './EarthEventMarker';
import type {EarthEvent} from '../../services/liveScience';
import {Loader2,RotateCcw} from 'lucide-react';
interface Props {records:DiscoveryResult[];selected:DiscoveryResult|null;target:PlanetaryBody;onSelect:(id:string)=>void;resetSignal:number;events?:EarthEvent[];selectedEvent?:EarthEvent|null;onSelectEvent?:(id:string)=>void;}
const NASA_TEXTURE='https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_2048.jpg';
const LOCAL_TEXTURE='/earth_naturalearth.jpg';
// NASA Earth Observatory Blue Marble, NASA imagery generally public domain; see frontend/README.md.
function EarthSurface(){const [texture,setTexture]=useState<THREE.Texture|null>(null);const [failed,setFailed]=useState(false);
 useEffect(()=>{let current=true;const loader=new THREE.TextureLoader();const accept=(tex:THREE.Texture)=>{if(!current){tex.dispose();return;}tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;setTexture(tex)};loader.load(NASA_TEXTURE,accept,undefined,()=>{if(current)loader.load(LOCAL_TEXTURE,accept,undefined,()=>{if(current)setFailed(true)})});return()=>{current=false};},[]);
 useEffect(()=>()=>{texture?.dispose()},[texture]);
 return <group><mesh rotation={[0,Math.PI,0]}><sphereGeometry args={[2,80,56]}/><meshStandardMaterial map={texture??undefined} color={texture?'white':'#255d7b'} roughness={.96} metalness={0}/></mesh><mesh><sphereGeometry args={[2.052,64,48]}/><meshBasicMaterial color="#519ed4" transparent opacity={.065} side={THREE.BackSide} depthWrite={false}/></mesh>{failed&&<HtmlFallback/>}</group>;
}
function HtmlFallback(){return null;}
function GlobeScene({records,selected,target,onSelect,resetSignal,events=[],selectedEvent=null,onSelectEvent}:Props){const orbit=useRef<OrbitControlsImpl|null>(null);const {camera}=useThree();const interrupted=useRef(false);const targetVec=useRef<THREE.Vector3|null>(null);const lastReset=useRef(resetSignal);
 useEffect(()=>{if(lastReset.current!==resetSignal){lastReset.current=resetSignal;targetVec.current=new THREE.Vector3(0,0,6.7);interrupted.current=false}},[resetSignal]);
 useEffect(()=>{const lat=selectedEvent?.latitude??selected?.earth.coordinates.latitude;const lon=selectedEvent?.longitude??selected?.earth.coordinates.longitude;if(lat!==undefined&&lon!==undefined){const p=positionFromLatLon(lat,lon,6.7);targetVec.current=new THREE.Vector3(...p);interrupted.current=false;}},[selected,selectedEvent]);
 useFrame((_,delta)=>{if(!targetVec.current||interrupted.current)return;camera.position.lerp(targetVec.current,Math.min(1,delta*2.4));camera.lookAt(0,0,0);if(camera.position.distanceTo(targetVec.current)<.012)targetVec.current=null;});
 const reduced=useMemo(()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false,[]);
 return <><color attach="background" args={['#070d17']}/><ambientLight intensity={1.1}/><directionalLight position={[5,3,7]} intensity={2.35}/><Stars radius={80} depth={30} count={700} factor={2.3} saturation={0} fade speed={0}/><EarthSurface/>{records.map(r=><GlobeMarker key={r.id} record={r} selected={selected?.id===r.id} target={target} onSelect={onSelect}/>)}{events.map(event=><EarthEventMarker key={event.id} event={event} selected={selectedEvent?.id===event.id} onSelect={onSelectEvent??(()=>{})}/>)}<OrbitControls ref={orbit} enablePan={false} minDistance={3.25} maxDistance={11} enableDamping dampingFactor={.08} autoRotate={!reduced} autoRotateSpeed={.28} onStart={()=>{interrupted.current=true;targetVec.current=null}} /></>;
}
export function EarthGlobe(props:Props){const [ready,setReady]=useState(false);return <div className="globe-container" aria-label="Interactive 3D Earth globe"><div className="globe-caption"><span className="live-dot"/> EARTH / WGS 84 <span className="cap-divider">·</span> INTERACTIVE VIEW</div>{!ready&&<div className="globe-loading"><Loader2 className="spin" size={22}/> Preparing Earth visualization</div>}<Canvas onCreated={()=>setReady(true)} camera={{position:[0,0,6.7],fov:42}} dpr={[1,1.6]} gl={{antialias:true,powerPreference:'low-power'}}><Suspense fallback={null}><GlobeScene {...props}/></Suspense></Canvas><div className="globe-bottom"><span>DRAG TO ORBIT <span className="cap-divider">/</span> SCROLL TO ZOOM</span><button className="reset-button" onClick={()=>props.onSelect('')} title="Reset selection and camera"><RotateCcw size={14}/> RESET VIEW</button></div></div>}

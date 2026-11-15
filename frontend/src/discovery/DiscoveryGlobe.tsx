import {Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {Canvas,useFrame,useLoader,useThree} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import * as THREE from 'three';
import type {OrbitControls as OrbitControlsImpl} from 'three-stdlib';
import {positionFromLatLon} from '../components/globe/geo';
import type {Cell,PlanetTarget} from './api';

const RADIUS=2;
function Earth(){
 const texture=useLoader(THREE.TextureLoader,'/earth_naturalearth.jpg');
 useEffect(()=>{texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;texture.needsUpdate=true;},[texture]);
 // Local texture is bundled; never depend on a remote imagery server for the basic globe.
 return <><mesh rotation={[0,Math.PI,0]}><sphereGeometry args={[RADIUS,64,48]}/><meshStandardMaterial map={texture} color="#ffffff" roughness={1} metalness={0}/></mesh>
 <mesh><sphereGeometry args={[2.085,48,32]}/><meshBasicMaterial color="#4e98d7" transparent opacity={0.10} side={THREE.BackSide} depthWrite={false}/></mesh></>;
}
function ScanPins({cells,selectedId,onSelect,target}:{cells:Cell[];selectedId:string|null;onSelect:(id:string)=>void;target:PlanetTarget}){
 const ref=useRef<THREE.InstancedMesh>(null);
 const matrix=useMemo(()=>new THREE.Matrix4(),[]);
 useEffect(()=>{
  if(!ref.current)return;
  cells.forEach((cell,index)=>{
   const pos=new THREE.Vector3(...positionFromLatLon(cell.latitude,cell.longitude,2.035));
   matrix.makeTranslation(pos.x,pos.y,pos.z);ref.current!.setMatrixAt(index,matrix);
   const color=cell.id===selectedId?'#fff0b2':cell.status==='sampled'?'#65e1b5':cell.status==='missing'?'#b0a4ad':target==='mars'?'#f3a67f':'#99c5ff';
   ref.current!.setColorAt(index,new THREE.Color(color));
  });
  ref.current.instanceMatrix.needsUpdate=true;
  if(ref.current.instanceColor)ref.current.instanceColor.needsUpdate=true;
 },[cells,selectedId,matrix,target]);
 return <instancedMesh ref={ref} args={[undefined,undefined,cells.length]} onClick={event=>{
  event.stopPropagation();const index=event.instanceId;
  if(index===undefined)return;
  // Ignore pins behind the globe surface.
  const pos=new THREE.Vector3(...positionFromLatLon(cells[index].latitude,cells[index].longitude,2.035));
  if(pos.clone().normalize().dot(event.camera.position.clone().sub(pos).normalize())<=0.025)return;
  onSelect(cells[index].id);
 }}><sphereGeometry args={[0.035,8,8]}/><meshBasicMaterial toneMapped={false} depthTest={true}/></instancedMesh>;
}
function Focus({selected,resetSignal}:{selected:Cell|null;resetSignal:number}){
 const {camera}=useThree();const next=useRef<THREE.Vector3|null>(null);
 useEffect(()=>{next.current=selected?new THREE.Vector3(...positionFromLatLon(selected.latitude,selected.longitude,6.0)):new THREE.Vector3(0,0,6.7);},[selected,resetSignal]);
 useFrame((_,delta)=>{if(!next.current)return;camera.position.lerp(next.current,Math.min(1,delta*2.0));camera.lookAt(0,0,0);if(camera.position.distanceTo(next.current)<0.025)next.current=null;});
 return null;
}
function World({cells,selected,target,onSelect,resetSignal}:{cells:Cell[];selected:Cell|null;target:PlanetTarget;onSelect:(id:string)=>void;resetSignal:number}){
 const controls=useRef<OrbitControlsImpl>(null);
 const reduced=useMemo(()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false,[]);
 const [interacted,setInteracted]=useState(false);
 useEffect(()=>setInteracted(false),[resetSignal]);
 return <><color attach="background" args={['#07101d']}/><ambientLight intensity={0.85}/><directionalLight position={[6,3,7]} intensity={1.55}/><Suspense fallback={<mesh><sphereGeometry args={[2,36,24]}/><meshStandardMaterial color="#164a73"/></mesh>}><Earth/></Suspense><ScanPins cells={cells} selectedId={selected?.id??null} onSelect={onSelect} target={target}/><Focus selected={selected} resetSignal={resetSignal}/><OrbitControls ref={controls} enablePan={false} enableDamping dampingFactor={.06} minDistance={3.3} maxDistance={9} enableZoom autoRotate={!reduced&&!interacted&&!selected} autoRotateSpeed={.26} onStart={()=>setInteracted(true)}/></>;
}
export function DiscoveryGlobe({cells,selected,target,onSelect,resetSignal}:{cells:Cell[];selected:Cell|null;target:PlanetTarget;onSelect:(id:string)=>void;resetSignal:number}){
 const [ready,setReady]=useState(false);
 return <div className="discovery-globe" aria-label="Interactive 3D Earth with global sampling cells">
  <Canvas style={{width:'100%',height:'100%',display:'block'}} camera={{position:[0,0,6.7],fov:44}} onCreated={()=>setReady(true)} dpr={[1,1.5]} gl={{antialias:true,powerPreference:'low-power'}}><World cells={cells} selected={selected} target={target} onSelect={onSelect} resetSignal={resetSignal}/></Canvas>
  {!ready&&<div className="globe-wait">Starting 3D globe…</div>}
  <div className="globe-label">EARTH <span>·</span> WGS 84 <span>·</span> {cells.length} CELLS</div>
  <div className="globe-hint">Drag to rotate · Scroll to zoom · Select a dot</div>
 </div>;
}

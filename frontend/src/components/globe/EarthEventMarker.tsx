import {useRef,useState} from 'react';
import {Html} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import type {EarthEvent} from '../../services/liveScience';
import {positionFromLatLon} from './geo';
export function EarthEventMarker({event,selected,onSelect}:{event:EarthEvent;selected:boolean;onSelect:(id:string)=>void}){
 const ref=useRef<THREE.Group>(null);const [visible,setVisible]=useState(true);
 const pos=positionFromLatLon(event.latitude,event.longitude,2.04);
 const point=new THREE.Vector3();
 useFrame(({camera})=>{if(ref.current){ref.current.getWorldPosition(point);const show=point.clone().normalize().dot(camera.position.clone().sub(point).normalize())>0.03;setVisible(previous=>previous===show?previous:show);}});
 return <group ref={ref} position={pos}><mesh onClick={e=>{e.stopPropagation();onSelect(event.id)}}><sphereGeometry args={[selected?.05:.028,12,12]}/><meshBasicMaterial color="#6ce6b3"/></mesh>{visible&&<Html center distanceFactor={7} zIndexRange={[8,0]}><button className={`globe-marker ${selected?'active':''}`} style={{background:'#6ce6b3',borderColor:'#6ce6b3'}} title={event.title} aria-label={`Show event ${event.title}`} onClick={e=>{e.stopPropagation();onSelect(event.id)}}>{selected?event.title:''}</button></Html>}</group>;
}

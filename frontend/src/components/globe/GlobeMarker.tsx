import {useState} from 'react';
import {Html} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {useRef} from 'react';
import * as THREE from 'three';
import type {DiscoveryResult,PlanetaryBody} from '../../types/scientific';
import {positionFromLatLon} from './geo';
interface Props {record:DiscoveryResult;selected:boolean;target:PlanetaryBody;onSelect:(id:string)=>void;}
export function GlobeMarker({record,selected,target,onSelect}:Props){
 const [visible,setVisible]=useState(true);const ref=useRef<THREE.Group>(null);const v=new THREE.Vector3();const normal=new THREE.Vector3();
 const pos=positionFromLatLon(record.earth.coordinates.latitude,record.earth.coordinates.longitude,2.025);
 useFrame(({camera})=>{if(!ref.current)return;ref.current.getWorldPosition(v);normal.copy(v).normalize();const dot=normal.dot(camera.position.clone().sub(v).normalize());const show=dot>0.03;setVisible(old=>old===show?old:show);});
 return <group ref={ref} position={pos}><mesh onClick={e=>{e.stopPropagation();onSelect(record.id)}}><sphereGeometry args={[selected?.047:.028,12,12]}/><meshBasicMaterial color={target==='moon'?'#b5dfff':'#ff985b'} depthTest /></mesh>{visible&&<Html center distanceFactor={7} zIndexRange={[8,0]}><button className={`globe-marker ${selected?'active':''} ${target}`} aria-label={`Select ${record.earth.name}`} onClick={e=>{e.stopPropagation();onSelect(record.id)}} title={record.earth.name}>{selected?record.earth.name:''}</button></Html>}</group>;
}

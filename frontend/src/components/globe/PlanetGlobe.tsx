import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { RotateCcw, Compass, Eye } from 'lucide-react';
import { positionFromLatLon } from './geo';
import type { PlanetaryBody, PlanetaryReferenceSite, AnalogMatchResult } from '../../types/scientific';

interface PlanetGlobeProps {
  body: 'earth' | PlanetaryBody;
  referenceSites?: PlanetaryReferenceSite[];
  selectedReference?: PlanetaryReferenceSite | null;
  onSelectReference?: (site: PlanetaryReferenceSite) => void;
  analogSites?: AnalogMatchResult[];
  selectedAnalog?: AnalogMatchResult | null;
  onSelectAnalog?: (site: AnalogMatchResult) => void;
  onSelectCoordinate?: (lat: number, lon: number) => void;
  resetSignal: number;
  autoRotate?: boolean;
}

// NASA Visual Configuration (High Definition & Clean Monochrome / NASA Blue)
const BODY_CONFIG = {
  earth: {
    name: 'EARTH',
    sub: 'WGS 84 SATELLITE BASMAP',
    texture: '/earth_naturalearth.jpg',
    fallbackColor: '#0b2545',
    atmosphereColor: '#1a6fd8', // NASA Blue limb
    atmosphereOpacity: 0.22,
    radius: 2.3,
    cameraDist: 6.6,
  },
  moon: {
    name: 'THE MOON',
    sub: 'NASA LRO LOLA TOPOGRAPHY',
    texture: '/moon.jpg',
    fallbackColor: '#2d3748',
    atmosphereColor: '#718096',
    atmosphereOpacity: 0.04,
    radius: 2.3,
    cameraDist: 6.6,
  },
  mars: {
    name: 'MARS',
    sub: 'NASA MOLA / VIKING MDIM',
    texture: '/mars.jpg',
    fallbackColor: '#5c2d1f',
    atmosphereColor: '#9c4221',
    atmosphereOpacity: 0.12,
    radius: 2.3,
    cameraDist: 6.6,
  },
};

function CelestialSphere({
  body,
  radius,
  onClickCoords,
}: {
  body: 'earth' | PlanetaryBody;
  radius: number;
  onClickCoords?: (lat: number, lon: number) => void;
}) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const cfg = BODY_CONFIG[body];

  useEffect(() => {
    let active = true;
    const loader = new THREE.TextureLoader();
    loader.load(
      cfg.texture,
      (tex) => {
        if (!active) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.anisotropy = 16;
        setTexture(tex);
      },
      undefined,
      () => {
        if (active) setTexture(null);
      }
    );
    return () => {
      active = false;
      texture?.dispose();
    };
  }, [cfg.texture]);

  const handlePointerDown = (e: any) => {
    if (!onClickCoords || !e.point) return;
    const p = e.point.clone().normalize();
    const lat = 90 - (Math.acos(Math.max(-1, Math.min(1, p.y))) * 180) / Math.PI;
    const lon = (Math.atan2(p.x, p.z) * 180) / Math.PI;
    onClickCoords(parseFloat(lat.toFixed(4)), parseFloat(lon.toFixed(4)));
  };

  return (
    <group>
      {/* High-Resolution Planetary Sphere (128x96 subdivisions) */}
      <mesh rotation={[0, Math.PI, 0]} onPointerDown={handlePointerDown}>
        <sphereGeometry args={[radius, 128, 96]} />
        <meshStandardMaterial
          map={texture ?? undefined}
          color={texture ? '#ffffff' : cfg.fallbackColor}
          roughness={0.84}
          metalness={0.06}
        />
      </mesh>

      {/* Atmospheric Scattering Glow Shell */}
      <mesh>
        <sphereGeometry args={[radius * 1.022, 96, 64]} />
        <meshBasicMaterial
          color={cfg.atmosphereColor}
          transparent
          opacity={cfg.atmosphereOpacity}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function SiteMarker3D({
  lat,
  lon,
  radius,
  title,
  subtitle,
  badge,
  selected,
  color,
  onClick,
}: {
  lat: number;
  lon: number;
  radius: number;
  title: string;
  subtitle: string;
  badge?: string;
  selected: boolean;
  color: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const pos = useMemo(() => positionFromLatLon(lat, lon, radius * 1.018), [lat, lon, radius]);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ringRef.current && (hovered || selected)) {
      const scale = 1 + Math.sin(clock.getElapsedTime() * 4.5) * 0.25;
      ringRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group position={pos}>
      {/* Central Tactical Dot */}
      <mesh
        ref={ringRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[selected ? 0.06 : 0.042, 16, 16]} />
        <meshBasicMaterial color={selected ? '#ffffff' : color} />
      </mesh>

      {/* Pulsing Outer Tactical Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.065, 0.085, 32]} />
        <meshBasicMaterial color={color} transparent opacity={selected ? 0.9 : 0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* Minimalist NASA Telemetry Label Tooltip */}
      {(hovered || selected) && (
        <Html distanceFactor={10} position={[0, 0.1, 0]} center style={{ pointerEvents: 'none' }}>
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.92)',
              border: `1px solid ${selected ? '#ffffff' : '#0b3d91'}`,
              borderRadius: '4px',
              padding: '5px 8px',
              color: '#ffffff',
              whiteSpace: 'nowrap',
              fontFamily: 'monospace, system-ui, sans-serif',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.8)',
            }}
          >
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#3b82f6', letterSpacing: '0.1em' }}>
              {badge || 'TARGET'}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, margin: '2px 0', color: '#ffffff' }}>{title}</div>
            <div style={{ fontSize: '9px', color: '#94a3b8' }}>{subtitle}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

function Scene({
  body,
  referenceSites = [],
  selectedReference,
  onSelectReference,
  analogSites = [],
  selectedAnalog,
  onSelectAnalog,
  onSelectCoordinate,
  resetSignal,
  autoRotate = false,
}: PlanetGlobeProps) {
  const { camera } = useThree();
  const orbitRef = useRef<OrbitControlsImpl>(null);
  const targetVec = useRef<THREE.Vector3 | null>(null);
  const lastReset = useRef(resetSignal);
  const cfg = BODY_CONFIG[body];

  useEffect(() => {
    if (lastReset.current !== resetSignal) {
      lastReset.current = resetSignal;
      targetVec.current = new THREE.Vector3(0, 0, cfg.cameraDist);
    }
  }, [resetSignal, cfg.cameraDist]);

  useEffect(() => {
    const lat = selectedAnalog?.latitude ?? selectedReference?.latitude;
    const lon = selectedAnalog?.longitude ?? selectedReference?.longitude;
    if (lat !== undefined && lon !== undefined) {
      const p = positionFromLatLon(lat, lon, cfg.cameraDist);
      targetVec.current = new THREE.Vector3(...p);
    }
  }, [selectedReference, selectedAnalog, cfg.cameraDist]);

  useFrame((_, delta) => {
    if (!targetVec.current) return;
    camera.position.lerp(targetVec.current, Math.min(1, delta * 2.8));
    camera.lookAt(0, 0, 0);
    if (camera.position.distanceTo(targetVec.current) < 0.02) {
      targetVec.current = null;
    }
  });

  return (
    <>
      <color attach="background" args={['#000000']} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[7, 5, 8]} intensity={3.0} />
      <directionalLight position={[-7, -3, -5]} intensity={0.25} color="#1e293b" />
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.3} />

      <CelestialSphere body={body} radius={cfg.radius} onClickCoords={onSelectCoordinate} />

      {/* Moon/Mars Reference Markers (NASA Blue / White) */}
      {body !== 'earth' &&
        referenceSites.map((site) => (
          <SiteMarker3D
            key={site.id}
            lat={site.latitude}
            lon={site.longitude}
            radius={cfg.radius}
            title={site.name}
            subtitle={`${Math.abs(site.latitude).toFixed(2)}°${site.latitude >= 0 ? 'N' : 'S'}, ${Math.abs(site.longitude).toFixed(2)}°${site.longitude >= 0 ? 'E' : 'W'}`}
            badge={body === 'moon' ? 'LUNAR' : 'MARS'}
            selected={selectedReference?.id === site.id}
            color="#0b3d91"
            onClick={() => onSelectReference && onSelectReference(site)}
          />
        ))}

      {/* Earth Analog Markers (NASA Blue / White) */}
      {body === 'earth' &&
        analogSites.map((site, index) => (
          <SiteMarker3D
            key={site.earth_id}
            lat={site.latitude}
            lon={site.longitude}
            radius={cfg.radius}
            title={site.name}
            subtitle={`${site.similarity_percent}% SIMILARITY`}
            badge={`#${index + 1} ANALOG`}
            selected={selectedAnalog?.earth_id === site.earth_id}
            color={selectedAnalog?.earth_id === site.earth_id ? '#ffffff' : '#0b3d91'}
            onClick={() => onSelectAnalog && onSelectAnalog(site)}
          />
        ))}

      <OrbitControls
        ref={orbitRef}
        enablePan={false}
        minDistance={3.2}
        maxDistance={12}
        enableDamping
        dampingFactor={0.06}
        autoRotate={autoRotate}
        autoRotateSpeed={0.3}
        onStart={() => {
          targetVec.current = null;
        }}
      />
    </>
  );
}

export function PlanetGlobe(props: PlanetGlobeProps) {
  const [ready, setReady] = useState(false);
  void ready;
  const cfg = BODY_CONFIG[props.body];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000000' }}>
      {/* Top HUD Telemetry Coordinates */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 18,
          zIndex: 10,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#0b3d91',
              boxShadow: '0 0 8px #3b82f6',
            }}
          />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.12em',
              color: '#ffffff',
              fontFamily: 'monospace, sans-serif',
            }}
          >
            {cfg.name} // 3D SATELLITE
          </span>
        </div>
        <div style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '0.06em', fontFamily: 'monospace' }}>
          {cfg.sub}
        </div>
      </div>

      {/* Bottom Camera Reset Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 14,
          left: 18,
          right: 18,
          zIndex: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontSize: '9px',
            color: '#64748b',
            letterSpacing: '0.08em',
            display: 'flex',
            gap: 12,
            fontFamily: 'monospace',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Compass size={11} color="#0b3d91" /> DRAG ROTATE
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Eye size={11} color="#0b3d91" /> SCROLL ZOOM
          </span>
        </div>
        <button
          onClick={() => {
            if (props.onSelectReference) props.onSelectReference(null as any);
            if (props.onSelectAnalog) props.onSelectAnalog(null as any);
          }}
          style={{
            pointerEvents: 'auto',
            background: 'rgba(0, 0, 0, 0.85)',
            border: '1px solid #1e293b',
            borderRadius: 4,
            color: '#ffffff',
            fontSize: '10px',
            padding: '5px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            cursor: 'pointer',
            fontFamily: 'monospace',
          }}
        >
          <RotateCcw size={11} /> RESET CAMERA
        </button>
      </div>

      <Canvas
        onCreated={() => setReady(true)}
        camera={{ position: [0, 0, cfg.cameraDist], fov: 42 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
      >
        <Suspense fallback={null}>
          <Scene {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}

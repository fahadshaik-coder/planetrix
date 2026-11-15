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

const BODY_CONFIG = {
  earth: {
    name: 'EARTH',
    sub: 'WGS 84 SATELLITE BASMAP',
    texture: '/earth_naturalearth.jpg',
    fallbackColor: '#1d4a66',
    atmosphereColor: '#63b3ed',
    atmosphereOpacity: 0.12,
    radius: 2.2,
    cameraDist: 6.8,
  },
  moon: {
    name: 'THE MOON',
    sub: 'NASA LRO LOLA SCIENTIFIC TEXTURE',
    texture: '/moon.jpg',
    fallbackColor: '#7a7e85',
    atmosphereColor: '#a0aec0',
    atmosphereOpacity: 0.03,
    radius: 2.2,
    cameraDist: 6.8,
  },
  mars: {
    name: 'MARS',
    sub: 'NASA MOLA / VIKING MDIM2.1',
    texture: '/mars.jpg',
    fallbackColor: '#a24b2f',
    atmosphereColor: '#ed8936',
    atmosphereOpacity: 0.09,
    radius: 2.2,
    cameraDist: 6.8,
  },
};

function CelestialSphere({ body, radius, onClickCoords }: { body: 'earth' | PlanetaryBody; radius: number; onClickCoords?: (lat: number, lon: number) => void }) {
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
        tex.anisotropy = 8;
        setTexture(tex);
      },
      undefined,
      () => {
        // Fallback if texture fails
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
    // Convert cartesian back to lat/lon
    const lat = 90 - (Math.acos(Math.max(-1, Math.min(1, p.y))) * 180) / Math.PI;
    const lon = (Math.atan2(p.x, p.z) * 180) / Math.PI;
    onClickCoords(parseFloat(lat.toFixed(4)), parseFloat(lon.toFixed(4)));
  };

  return (
    <group>
      {/* Planetary Surface Mesh */}
      <mesh rotation={[0, Math.PI, 0]} onPointerDown={handlePointerDown}>
        <sphereGeometry args={[radius, 96, 64]} />
        <meshStandardMaterial
          map={texture ?? undefined}
          color={texture ? '#ffffff' : cfg.fallbackColor}
          roughness={0.92}
          metalness={0.05}
        />
      </mesh>

      {/* Atmospheric Rim Glow */}
      <mesh>
        <sphereGeometry args={[radius * 1.025, 64, 48]} />
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
      const scale = 1 + Math.sin(clock.getElapsedTime() * 4) * 0.22;
      ringRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group position={pos}>
      {/* Pulse Beacon Disk */}
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
        <sphereGeometry args={[selected ? 0.065 : 0.045, 16, 16]} />
        <meshBasicMaterial color={selected ? '#ffffff' : color} />
      </mesh>

      {/* Outer Pulse Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.07, 0.09, 32]} />
        <meshBasicMaterial color={color} transparent opacity={selected ? 0.85 : 0.45} side={THREE.DoubleSide} />
      </mesh>

      {/* Label Tooltip */}
      {(hovered || selected) && (
        <Html distanceFactor={11} position={[0, 0.12, 0]} center style={{ pointerEvents: 'none' }}>
          <div
            style={{
              background: 'rgba(8, 14, 24, 0.92)',
              border: `1px solid ${selected ? '#63b3ed' : color}`,
              borderRadius: '6px',
              padding: '6px 10px',
              color: '#ffffff',
              whiteSpace: 'nowrap',
              fontFamily: 'system-ui, sans-serif',
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              transform: 'translateY(-10px)',
            }}
          >
            <div style={{ fontSize: '10px', fontWeight: 800, color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {badge || 'SITE'}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, margin: '2px 0' }}>{title}</div>
            <div style={{ fontSize: '10px', color: '#a0aec0' }}>{subtitle}</div>
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

  // Camera reset
  useEffect(() => {
    if (lastReset.current !== resetSignal) {
      lastReset.current = resetSignal;
      targetVec.current = new THREE.Vector3(0, 0, cfg.cameraDist);
    }
  }, [resetSignal, cfg.cameraDist]);

  // Center camera on selected reference or analog
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
      <color attach="background" args={['#05080f']} />
      <ambientLight intensity={1.25} />
      <directionalLight position={[6, 4, 8]} intensity={2.8} />
      <directionalLight position={[-6, -2, -4]} intensity={0.4} color="#4a5568" />
      <Stars radius={90} depth={40} count={2200} factor={3.5} saturation={0} fade speed={0.4} />

      {/* Celestial Globe */}
      <CelestialSphere body={body} radius={cfg.radius} onClickCoords={onSelectCoordinate} />

      {/* Moon/Mars Reference Markers */}
      {body !== 'earth' &&
        referenceSites.map((site) => (
          <SiteMarker3D
            key={site.id}
            lat={site.latitude}
            lon={site.longitude}
            radius={cfg.radius}
            title={site.name}
            subtitle={`${Math.abs(site.latitude).toFixed(2)}°${site.latitude >= 0 ? 'N' : 'S'}, ${Math.abs(site.longitude).toFixed(2)}°${site.longitude >= 0 ? 'E' : 'W'}`}
            badge={body === 'moon' ? 'LUNAR MISSION' : 'MARS EXPLORER'}
            selected={selectedReference?.id === site.id}
            color={body === 'moon' ? '#ecc94b' : '#f56565'}
            onClick={() => onSelectReference && onSelectReference(site)}
          />
        ))}

      {/* Earth Analog Markers */}
      {body === 'earth' &&
        analogSites.map((site, index) => {
          const topExp = site.experiments?.[0];
          const badgeText = `RANK #${index + 1} · ${site.similarity_percent}% MATCH`;
          const markerColor =
            site.similarity_percent >= 80 ? '#48bb78' : site.similarity_percent >= 65 ? '#4299e1' : '#ed8936';

          return (
            <SiteMarker3D
              key={site.earth_id}
              lat={site.latitude}
              lon={site.longitude}
              radius={cfg.radius}
              title={site.name}
              subtitle={`${topExp?.name ?? 'Analogue'}: ${topExp?.suitability ?? 'Evaluated'}`}
              badge={badgeText}
              selected={selectedAnalog?.earth_id === site.earth_id}
              color={markerColor}
              onClick={() => onSelectAnalog && onSelectAnalog(site)}
            />
          );
        })}

      <OrbitControls
        ref={orbitRef}
        enablePan={false}
        minDistance={3.5}
        maxDistance={12}
        enableDamping
        dampingFactor={0.06}
        autoRotate={autoRotate}
        autoRotateSpeed={0.35}
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
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#05080f' }}>
      {/* Top HUD Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 20,
          zIndex: 10,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: props.body === 'earth' ? '#48bb78' : props.body === 'moon' ? '#ecc94b' : '#f56565',
              boxShadow: `0 0 10px ${props.body === 'earth' ? '#48bb78' : props.body === 'moon' ? '#ecc94b' : '#f56565'}`,
            }}
          />
          <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.14em', color: '#e2e8f0' }}>
            {cfg.name} · 3D ORBITAL VIEW
          </span>
        </div>
        <div style={{ fontSize: '10px', color: '#718096', letterSpacing: '0.06em' }}>{cfg.sub}</div>
      </div>

      {/* Bottom Controls */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 20,
          right: 20,
          zIndex: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontSize: '10px', color: '#a0aec0', letterSpacing: '0.08em', display: 'flex', gap: 14 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Compass size={12} color="#63b3ed" /> DRAG TO ROTATE
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Eye size={12} color="#63b3ed" /> SCROLL TO ZOOM
          </span>
        </div>
        <button
          onClick={() => {
            if (props.onSelectReference) props.onSelectReference(null as any);
            if (props.onSelectAnalog) props.onSelectAnalog(null as any);
          }}
          style={{
            pointerEvents: 'auto',
            background: 'rgba(26, 36, 51, 0.85)',
            border: '1px solid #2d3748',
            borderRadius: 6,
            color: '#e2e8f0',
            fontSize: '11px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
          }}
        >
          <RotateCcw size={12} /> RESET CAMERA
        </button>
      </div>

      {/* Canvas */}
      <Canvas
        onCreated={() => setReady(true)}
        camera={{ position: [0, 0, cfg.cameraDist], fov: 42 }}
        dpr={[1, 1.8]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <Scene {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}

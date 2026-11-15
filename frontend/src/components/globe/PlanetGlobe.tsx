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

// Realistic Planetary Configurations with Graticule & Multi-Layer Lighting
const BODY_CONFIG = {
  earth: {
    name: 'EARTH',
    sub: 'WGS 84 SATELLITE BASMAP',
    texture: '/earth.jpg',
    fallbackColor: '#1d4e78',
    atmosphereColor: '#7dd3fc',
    atmosphereOpacity: 0.16,
    radius: 2.35,
    cameraDist: 6.4,
    showGraticule: true,
  },
  moon: {
    name: 'THE MOON',
    sub: 'NASA LRO LOLA TOPOGRAPHY',
    texture: '/moon.jpg',
    fallbackColor: '#475569',
    atmosphereColor: '#94a3b8',
    atmosphereOpacity: 0.04,
    radius: 2.35,
    cameraDist: 6.4,
    showGraticule: true,
  },
  mars: {
    name: 'MARS',
    sub: 'NASA MOLA / VIKING MDIM',
    texture: '/mars.jpg',
    fallbackColor: '#8c3d25',
    atmosphereColor: '#fdba74',
    atmosphereOpacity: 0.12,
    radius: 2.35,
    cameraDist: 6.4,
    showGraticule: true,
  },
};

function CelestialSphere({
  body,
  radius,
  showGraticule,
  onClickCoords,
}: {
  body: 'earth' | PlanetaryBody;
  radius: number;
  showGraticule?: boolean;
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
        // Fallback to /explorer-assets path if root fails
        loader.load(`/explorer-assets/${body}.jpg`, (tex) => {
          if (!active) {
            tex.dispose();
            return;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 16;
          setTexture(tex);
        });
      }
    );
    return () => {
      active = false;
      texture?.dispose();
    };
  }, [cfg.texture, body]);

  const handlePointerDown = (e: any) => {
    if (!onClickCoords || !e.point) return;
    const p = e.point.clone().normalize();
    const lat = 90 - (Math.acos(Math.max(-1, Math.min(1, p.y))) * 180) / Math.PI;
    const lon = (Math.atan2(p.x, p.z) * 180) / Math.PI;
    onClickCoords(parseFloat(lat.toFixed(4)), parseFloat(lon.toFixed(4)));
  };

  return (
    <group>
      {/* High-Resolution Planetary Sphere */}
      <mesh rotation={[0, Math.PI, 0]} onPointerDown={handlePointerDown}>
        <sphereGeometry args={[radius, 128, 96]} />
        <meshStandardMaterial
          map={texture ?? undefined}
          color={texture ? '#ffffff' : cfg.fallbackColor}
          roughness={body === 'earth' ? 0.65 : 0.85}
          metalness={body === 'earth' ? 0.12 : 0.04}
        />
      </mesh>

      {/* Elegant Scientific Graticule (Latitude/Longitude Grid Lines like in NASA imagery) */}
      {showGraticule && (
        <mesh rotation={[0, Math.PI, 0]}>
          <sphereGeometry args={[radius * 1.001, 36, 18]} />
          <meshBasicMaterial
            color="#94a3b8"
            wireframe
            transparent
            opacity={0.12}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Atmospheric Rim Glow */}
      <mesh>
        <sphereGeometry args={[radius * 1.018, 96, 64]} />
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
  selected,
  onClick,
}: {
  lat: number;
  lon: number;
  radius: number;
  title: string;
  subtitle: string;
  selected: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const pos = useMemo(() => positionFromLatLon(lat, lon, radius * 1.015), [lat, lon, radius]);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ringRef.current && (hovered || selected)) {
      const scale = 1 + Math.sin(clock.getElapsedTime() * 4.5) * 0.22;
      ringRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group position={pos}>
      {/* Pin Dot (White / Crisp Grey) */}
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
        <sphereGeometry args={[selected ? 0.055 : 0.038, 16, 16]} />
        <meshBasicMaterial color={selected ? '#ffffff' : '#e2e8f0'} />
      </mesh>

      {/* Tactical Outer Pulse Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.06, 0.08, 32]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={selected ? 0.95 : 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Minimalist White & Grey Label Card */}
      {(hovered || selected) && (
        <Html distanceFactor={9.5} position={[0, 0.1, 0]} center style={{ pointerEvents: 'none' }}>
          <div
            style={{
              background: 'rgba(9, 9, 11, 0.94)',
              border: `1px solid ${selected ? '#ffffff' : '#52525b'}`,
              borderRadius: '4px',
              padding: '5px 8px',
              color: '#ffffff',
              whiteSpace: 'nowrap',
              fontFamily: "'Space Grotesk', monospace, sans-serif",
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.9)',
              transform: 'translateY(-6px)',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff' }}>{title}</div>
            <div style={{ fontSize: '9px', color: '#a1a1aa', marginTop: '2px' }}>{subtitle}</div>
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

      {/* Balanced, Vibrant Natural Lighting (Ensures continents and details are clearly visible) */}
      <ambientLight intensity={1.5} />
      <directionalLight position={[6, 4, 7]} intensity={2.2} />
      <directionalLight position={[-6, 3, -4]} intensity={1.1} />
      <directionalLight position={[0, -5, 4]} intensity={0.6} />

      <Stars radius={110} depth={60} count={3500} factor={3.5} saturation={0} fade speed={0.2} />

      <CelestialSphere
        body={body}
        radius={cfg.radius}
        showGraticule={cfg.showGraticule}
        onClickCoords={onSelectCoordinate}
      />

      {/* Moon/Mars Reference Markers (White / Grey) */}
      {body !== 'earth' &&
        referenceSites.map((site) => (
          <SiteMarker3D
            key={site.id}
            lat={site.latitude}
            lon={site.longitude}
            radius={cfg.radius}
            title={site.name}
            subtitle={`${Math.abs(site.latitude).toFixed(2)}°${site.latitude >= 0 ? 'N' : 'S'}, ${Math.abs(site.longitude).toFixed(2)}°${site.longitude >= 0 ? 'E' : 'W'}`}
            selected={selectedReference?.id === site.id}
            onClick={() => onSelectReference && onSelectReference(site)}
          />
        ))}

      {/* Earth Analog Markers (White / Grey) */}
      {body === 'earth' &&
        analogSites.map((site) => (
          <SiteMarker3D
            key={site.earth_id}
            lat={site.latitude}
            lon={site.longitude}
            radius={cfg.radius}
            title={site.name}
            subtitle={`${site.similarity_percent}% SIMILARITY`}
            selected={selectedAnalog?.earth_id === site.earth_id}
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
      {/* Top HUD Telemetry Tag */}
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
              background: '#ffffff',
              boxShadow: '0 0 6px #ffffff',
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
        <div style={{ fontSize: '9px', color: '#a1a1aa', letterSpacing: '0.06em', fontFamily: 'monospace' }}>
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
            color: '#71717a',
            letterSpacing: '0.08em',
            display: 'flex',
            gap: 12,
            fontFamily: 'monospace',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Compass size={11} color="#a1a1aa" /> DRAG ROTATE
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Eye size={11} color="#a1a1aa" /> SCROLL ZOOM
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
            border: '1px solid #27272a',
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
          <RotateCcw size={11} /> RESET VIEW
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

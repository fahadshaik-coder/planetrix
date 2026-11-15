import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { RotateCcw, Compass, Eye } from 'lucide-react';
import { positionFromLatLon } from './geo';
import type { PlanetaryBody, PlanetaryReferenceSite, AnalogMatchResult } from '../../types/scientific';

export interface PlanetGlobeProps {
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
  headerBadge?: string;
  subBadge?: string;
  compactControls?: boolean;
}

// Photorealistic Planetary Configurations with Natural NASA Colors
const BODY_CONFIG = {
  earth: {
    name: 'EARTH',
    sub: 'WGS 84 SATELLITE BASEMAP',
    texture: '/earth.jpg',
    color: '#ffffff',
    roughness: 0.65,
    metalness: 0.05,
    showGraticule: true,
    atmosphereColor: '#38bdf8',
    atmosphereOpacity: 0.12,
    radius: 1.85,
    cameraDist: 5.6,
  },
  moon: {
    name: 'THE MOON',
    sub: 'NASA LRO LOLA TOPOGRAPHY',
    texture: '/moon.jpg',
    color: '#ffffff',
    roughness: 0.88,
    metalness: 0.0,
    showGraticule: false,
    atmosphereColor: '#000000',
    atmosphereOpacity: 0.0,
    radius: 1.85,
    cameraDist: 5.6,
  },
  mars: {
    name: 'MARS',
    sub: 'NASA MOLA / VIKING MDIM',
    texture: '/mars.jpg',
    color: '#ffffff',
    roughness: 0.82,
    metalness: 0.0,
    showGraticule: false,
    atmosphereColor: '#fb923c',
    atmosphereOpacity: 0.04,
    radius: 1.85,
    cameraDist: 5.6,
  },
};

// Global Texture Cache: preloads textures immediately on app start to prevent late rendering
const TEXTURE_CACHE: Record<string, THREE.Texture> = {};

function getPreloadedTexture(url: string, fallbackUrl?: string): THREE.Texture {
  if (TEXTURE_CACHE[url]) return TEXTURE_CACHE[url];
  const loader = new THREE.TextureLoader();
  const tex = loader.load(
    url,
    (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.needsUpdate = true;
    },
    undefined,
    () => {
      if (fallbackUrl) {
        loader.load(fallbackUrl, (fbTex) => {
          fbTex.colorSpace = THREE.SRGBColorSpace;
          TEXTURE_CACHE[url] = fbTex;
        });
      }
    }
  );
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  TEXTURE_CACHE[url] = tex;
  return tex;
}

// Preload all 3 planet textures immediately into browser memory
if (typeof window !== 'undefined') {
  getPreloadedTexture('/earth.jpg', '/explorer-assets/earth.jpg');
  getPreloadedTexture('/moon.jpg', '/explorer-assets/moon.jpg');
  getPreloadedTexture('/mars.jpg', '/explorer-assets/mars.jpg');
}

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
  const cfg = BODY_CONFIG[body];
  const texture = useMemo(
    () => getPreloadedTexture(cfg.texture, `/explorer-assets/${body}.jpg`),
    [cfg.texture, body]
  );

  const fallbackColor = body === 'mars' ? '#8a3a22' : body === 'moon' ? '#3a3c42' : '#12365a';

  const handlePointerDown = (e: any) => {
    if (!onClickCoords || !e.point) return;
    const p = e.point.clone().normalize();
    const lat = 90 - (Math.acos(Math.max(-1, Math.min(1, p.y))) * 180) / Math.PI;
    const lon = (Math.atan2(p.x, p.z) * 180) / Math.PI;
    onClickCoords(parseFloat(lat.toFixed(4)), parseFloat(lon.toFixed(4)));
  };

  return (
    <group>
      {/* High-Resolution Natural Celestial Sphere (Instant Texture Binding) */}
      <mesh rotation={[0, Math.PI, 0]} onPointerDown={handlePointerDown}>
        <sphereGeometry args={[radius, 128, 96]} />
        <meshStandardMaterial
          map={texture}
          color={texture ? '#ffffff' : fallbackColor}
          roughness={cfg.roughness}
          metalness={cfg.metalness}
        />
      </mesh>

      {/* Subtle Graticule Grid Lines (Rendered for Earth like in reference screenshot) */}
      {showGraticule && (
        <mesh rotation={[0, Math.PI, 0]}>
          <sphereGeometry args={[radius * 1.0008, 36, 18]} />
          <meshBasicMaterial
            color="#38bdf8"
            wireframe
            transparent
            opacity={0.09}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Atmospheric Rim Glow */}
      {cfg.atmosphereOpacity > 0 && (
        <mesh>
          <sphereGeometry args={[radius * 1.015, 96, 64]} />
          <meshBasicMaterial
            color={cfg.atmosphereColor}
            transparent
            opacity={cfg.atmosphereOpacity}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

function SiteMarker3D({
  lat,
  lon,
  radius,
  title,
  selected,
  body,
  onClick,
}: {
  lat: number;
  lon: number;
  radius: number;
  title: string;
  selected: boolean;
  body: 'earth' | PlanetaryBody;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const pos = useMemo(() => positionFromLatLon(lat, lon, radius * 1.01), [lat, lon, radius]);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ringRef.current && (hovered || selected)) {
      const scale = 1 + Math.sin(clock.getElapsedTime() * 4.0) * 0.22;
      ringRef.current.scale.set(scale, scale, scale);
    }
  });

  const pinColor = selected ? '#ffffff' : body === 'mars' ? '#f59e0b' : '#38bdf8';

  return (
    <group position={pos}>
      {/* Circular Pin Dot with Precision Contrast */}
      <mesh
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
        <sphereGeometry args={[selected ? 0.038 : 0.026, 16, 16]} />
        <meshBasicMaterial color={pinColor} />
      </mesh>

      {/* Outer Glow / Pulse Ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.036, 0.05, 32]} />
        <meshBasicMaterial
          color={pinColor}
          transparent
          opacity={selected ? 0.95 : 0.35}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Precision Label Pill (Matches Reference Screenshots) */}
      <Html
        position={[0.045, 0.015, 0]}
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
          transform: 'translateY(-50%)',
        }}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          style={{
            pointerEvents: 'auto',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            background: selected ? 'rgba(15, 23, 42, 0.94)' : 'rgba(6, 14, 22, 0.82)',
            border: `1px solid ${selected ? '#ffffff' : 'rgba(255, 255, 255, 0.22)'}`,
            borderRadius: '2px',
            padding: '1px 6px',
            fontSize: '10px',
            fontWeight: selected ? 700 : 500,
            color: selected ? '#ffffff' : '#e4edf6',
            whiteSpace: 'nowrap',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            textShadow: '0 1px 3px rgba(0,0,0,0.95)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.85)',
          }}
        >
          {title}
        </div>
      </Html>
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
      const [x, y, z] = positionFromLatLon(lat, lon, cfg.cameraDist);
      targetVec.current = new THREE.Vector3(x, y, z);
    }
  }, [selectedReference, selectedAnalog, cfg.cameraDist]);

  useFrame((_, delta) => {
    if (!targetVec.current) return;
    camera.position.lerp(targetVec.current, Math.min(1, delta * 3.0));
    camera.lookAt(0, 0, 0);
    if (camera.position.distanceTo(targetVec.current) < 0.02) {
      targetVec.current = null;
    }
  });

  return (
    <>
      {/* Deep Space Ambiance matching original NASA Explorer (RGB: 8, 14, 22) */}
      <color attach="background" args={['#080e16']} />

      {/* NASA Natural Front-Lit Illumination: Saturated, Vivid, No Pitch-Black Darkness */}
      <ambientLight intensity={0.92} />
      <directionalLight position={[3, 2, 7]} intensity={1.05} />
      <directionalLight position={[-3, -1, -4]} intensity={0.3} />

      <Stars radius={110} depth={60} count={3000} factor={3.2} saturation={0} fade speed={0.2} />

      <group>
        <CelestialSphere
          body={body}
          radius={cfg.radius}
          showGraticule={cfg.showGraticule}
          onClickCoords={onSelectCoordinate}
        />

        {/* Moon/Mars Reference Markers with Direct Visible Place Labels */}
        {body !== 'earth' &&
          referenceSites.map((site) => (
            <SiteMarker3D
              key={site.id}
              lat={site.latitude}
              lon={site.longitude}
              radius={cfg.radius}
              title={site.name}
              body={body}
              selected={selectedReference?.id === site.id}
              onClick={() => onSelectReference && onSelectReference(site)}
            />
          ))}

        {/* Earth Analog Markers with Direct Visible Place Labels */}
        {body === 'earth' &&
          analogSites.map((site) => (
            <SiteMarker3D
              key={site.earth_id}
              lat={site.latitude}
              lon={site.longitude}
              radius={cfg.radius}
              title={site.name}
              body={body}
              selected={selectedAnalog?.earth_id === site.earth_id}
              onClick={() => onSelectAnalog && onSelectAnalog(site)}
            />
          ))}
      </group>

      <OrbitControls
        ref={orbitRef}
        enablePan={false}
        minDistance={2.8}
        maxDistance={11}
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
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#080e16', overflow: 'hidden' }}>
      {/* Top HUD Telemetry Tag */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 14,
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
              background: props.body === 'mars' ? '#f59e0b' : '#38bdf8',
              boxShadow: `0 0 6px ${props.body === 'mars' ? '#f59e0b' : '#38bdf8'}`,
            }}
          />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.12em',
              color: '#ffffff',
              fontFamily: 'system-ui, monospace, sans-serif',
            }}
          >
            {props.headerBadge || `${cfg.name} // 3D OBSERVATORY`}
          </span>
        </div>
        <div style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '0.06em', fontFamily: 'monospace' }}>
          {props.subBadge || cfg.sub}
        </div>
      </div>

      {/* Bottom Camera Reset Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 14,
          right: 14,
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
            letterSpacing: '0.06em',
            display: 'flex',
            gap: 10,
            fontFamily: 'monospace',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Compass size={10} color="#a1a1aa" /> DRAG ROTATE
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Eye size={10} color="#a1a1aa" /> SCROLL ZOOM
          </span>
        </div>
        <button
          onClick={() => {
            if (props.onSelectReference) props.onSelectReference(null as any);
            if (props.onSelectAnalog) props.onSelectAnalog(null as any);
          }}
          style={{
            pointerEvents: 'auto',
            background: 'rgba(6, 14, 22, 0.85)',
            border: '1px solid #27272a',
            borderRadius: 3,
            color: '#e4edf6',
            fontSize: '9px',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
            fontFamily: 'monospace',
          }}
        >
          <RotateCcw size={10} /> RESET
        </button>
      </div>

      <Canvas
        onCreated={() => setReady(true)}
        camera={{ position: [0, 0, cfg.cameraDist], fov: 42 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.NoToneMapping,
        }}
      >
        <Suspense fallback={null}>
          <Scene {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}

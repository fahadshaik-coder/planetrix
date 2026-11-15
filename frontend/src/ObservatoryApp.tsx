import { useEffect, useMemo, useState } from 'react';
import {
  Globe2,
  Search,
  Activity,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Columns,
} from 'lucide-react';
import { PlanetGlobe } from './components/globe/PlanetGlobe';
import {
  fetchPlanetaryReferences,
  fetchAnalogMatches,
  fetchLiveTerrain,
} from './services/api';
import type {
  PlanetaryBody,
  PlanetaryReferenceSite,
  AnalogMatchResult,
  LiveDEMResponse,
} from './types/scientific';

export function ObservatoryApp() {
  // Navigation & View Mode State
  const [selectedTarget, setSelectedTarget] = useState<PlanetaryBody>('moon');
  const [viewMode, setViewMode] = useState<'dual' | 'target' | 'earth'>('dual');
  const [drawerOpen, setDrawerOpen] = useState(true);

  // Scientific Reference Sites & Analogs
  const [references, setReferences] = useState<PlanetaryReferenceSite[]>([]);
  const [selectedReference, setSelectedReference] = useState<PlanetaryReferenceSite | null>(null);

  const [analogResults, setAnalogResults] = useState<AnalogMatchResult[]>([]);
  const [selectedAnalog, setSelectedAnalog] = useState<AnalogMatchResult | null>(null);
  const [selectedExperimentFilter, setSelectedExperimentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Live Copernicus 90m DEM State
  const [liveDemLoading, setLiveDemLoading] = useState(false);
  const [liveDemData, setLiveDemData] = useState<LiveDEMResponse | null>(null);
  const [liveDemError, setLiveDemError] = useState<string | null>(null);

  // Globe Signals
  const [targetResetSignal, setTargetResetSignal] = useState(0);
  const [earthResetSignal, setEarthResetSignal] = useState(0);
  const [autoRotate, setAutoRotate] = useState(false);

  // 1. Load verified reference sites on target body switch
  useEffect(() => {
    let active = true;
    fetchPlanetaryReferences(selectedTarget)
      .then((data) => {
        if (!active) return;
        setReferences(data);
        if (data.length > 0) {
          setSelectedReference(data[0]);
        }
      })
      .catch((err) => console.error(err));

    return () => {
      active = false;
    };
  }, [selectedTarget]);

  // 2. Compute Earth analog candidates whenever selected reference changes
  useEffect(() => {
    if (!selectedReference) return;
    let active = true;
    fetchAnalogMatches(selectedReference.id)
      .then((data) => {
        if (!active) return;
        setAnalogResults(data.analog_candidates);
        if (data.analog_candidates.length > 0) {
          setSelectedAnalog(data.analog_candidates[0]);
          setLiveDemData(null);
        }
      })
      .catch((err) => console.error(err));

    return () => {
      active = false;
    };
  }, [selectedReference]);

  const handleSelectPlanet = (planet: PlanetaryBody) => {
    setSelectedTarget(planet);
    setSelectedReference(null);
    setSelectedAnalog(null);
    setLiveDemData(null);
    setTargetResetSignal((s) => s + 1);
    setEarthResetSignal((s) => s + 1);
  };

  const handleQueryLiveDEM = async (lat: number, lon: number) => {
    setLiveDemLoading(true);
    setLiveDemError(null);
    try {
      const data = await fetchLiveTerrain(lat, lon, 1000);
      setLiveDemData(data);
    } catch (err: any) {
      setLiveDemError(err.message || 'Failed to interrogate live Copernicus DEM');
    } finally {
      setLiveDemLoading(false);
    }
  };

  const filteredAnalogs = useMemo(() => {
    return analogResults.filter((site) => {
      const matchesSearch =
        site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.environment_summary.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (selectedExperimentFilter === 'all') return true;
      return site.experiments.some(
        (exp) => exp.id === selectedExperimentFilter && (exp.suitability === 'High' || exp.suitability === 'Moderate')
      );
    });
  }, [analogResults, searchQuery, selectedExperimentFilter]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        background: '#080e16',
        color: '#ffffff',
        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 1. TOP RESPONSIVE HEADER BAR */}
      <header
        style={{
          height: 48,
          background: 'rgba(8, 14, 22, 0.96)',
          borderBottom: '1px solid #1f2937',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 40,
          backdropFilter: 'blur(12px)',
          flexShrink: 0,
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 4,
              background: '#111827',
              border: '1px solid #374151',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Globe2 size={15} color="#38bdf8" />
          </div>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.12em', color: '#ffffff' }}>
              PLANETRIX
            </span>
            <span
              style={{
                fontSize: '9px',
                color: '#94a3b8',
                letterSpacing: '0.08em',
                marginLeft: 8,
                fontFamily: 'monospace',
              }}
            >
              PLANETARY ANALOG MISSION OBSERVATORY
            </span>
          </div>
        </div>

        {/* Center Target & View Mode Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Target Body Switcher */}
          <div
            style={{
              display: 'flex',
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: 5,
              padding: 2,
              gap: 2,
            }}
          >
            <button
              onClick={() => handleSelectPlanet('moon')}
              style={{
                border: 0,
                background: selectedTarget === 'moon' ? '#ffffff' : 'transparent',
                color: selectedTarget === 'moon' ? '#000000' : '#94a3b8',
                fontWeight: 700,
                fontSize: '10px',
                padding: '4px 12px',
                borderRadius: 3,
                cursor: 'pointer',
                letterSpacing: '0.05em',
                transition: 'all 0.15s ease',
              }}
            >
              MOON
            </button>
            <button
              onClick={() => handleSelectPlanet('mars')}
              style={{
                border: 0,
                background: selectedTarget === 'mars' ? '#ffffff' : 'transparent',
                color: selectedTarget === 'mars' ? '#000000' : '#94a3b8',
                fontWeight: 700,
                fontSize: '10px',
                padding: '4px 12px',
                borderRadius: 3,
                cursor: 'pointer',
                letterSpacing: '0.05em',
                transition: 'all 0.15s ease',
              }}
            >
              MARS
            </button>
          </div>

          {/* View Mode Switcher: Dual Comparison vs Single View */}
          <div
            style={{
              display: 'flex',
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: 5,
              padding: 2,
              gap: 2,
            }}
          >
            <button
              onClick={() => setViewMode('dual')}
              title="Dual View: Compare Target Planet & Earth Analog side-by-side"
              style={{
                border: 0,
                background: viewMode === 'dual' ? '#38bdf8' : 'transparent',
                color: viewMode === 'dual' ? '#080e16' : '#94a3b8',
                fontWeight: 700,
                fontSize: '10px',
                padding: '4px 10px',
                borderRadius: 3,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Columns size={11} /> DUAL VIEW
            </button>
            <button
              onClick={() => setViewMode('target')}
              style={{
                border: 0,
                background: viewMode === 'target' ? '#ffffff' : 'transparent',
                color: viewMode === 'target' ? '#080e16' : '#94a3b8',
                fontWeight: 700,
                fontSize: '10px',
                padding: '4px 10px',
                borderRadius: 3,
                cursor: 'pointer',
              }}
            >
              {selectedTarget.toUpperCase()}
            </button>
            <button
              onClick={() => setViewMode('earth')}
              style={{
                border: 0,
                background: viewMode === 'earth' ? '#ffffff' : 'transparent',
                color: viewMode === 'earth' ? '#080e16' : '#94a3b8',
                fontWeight: 700,
                fontSize: '10px',
                padding: '4px 10px',
                borderRadius: 3,
                cursor: 'pointer',
              }}
            >
              EARTH
            </button>
          </div>

          {/* Orbit Toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            title="Toggle Celestial Orbit Rotation"
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: 4,
              color: autoRotate ? '#38bdf8' : '#94a3b8',
              padding: '4px 8px',
              fontSize: '9px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: 'monospace',
            }}
          >
            <RefreshCw size={10} className={autoRotate ? 'spin' : ''} />
            {autoRotate ? 'ORBIT: ON' : 'ORBIT: OFF'}
          </button>
        </div>

        {/* NASA Telemetry Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '9px',
            color: '#94a3b8',
            fontFamily: 'monospace',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 5px #10b981',
            }}
          />
          <span>COPERNICUS DEM 90M · LRO/MOLA</span>
        </div>
      </header>

      {/* 2. DUAL / SINGLE PLANETARY STAGE */}
      <main
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'row',
          width: '100%',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* LEFT STAGE: TARGET PLANET (MOON OR MARS) */}
        {(viewMode === 'dual' || viewMode === 'target') && (
          <div
            style={{
              flex: 1,
              height: '100%',
              position: 'relative',
              borderRight: viewMode === 'dual' ? '1px solid #1f2937' : 'none',
              minWidth: 0,
            }}
          >
            <PlanetGlobe
              body={selectedTarget}
              referenceSites={references}
              selectedReference={selectedReference}
              onSelectReference={(site) => setSelectedReference(site)}
              resetSignal={targetResetSignal}
              autoRotate={autoRotate}
              headerBadge={`TARGET // ${selectedTarget.toUpperCase()}`}
              subBadge={
                selectedReference
                  ? `${selectedReference.name} (${selectedReference.latitude.toFixed(2)}°, ${selectedReference.longitude.toFixed(2)}°)`
                  : 'CLICK ANY LANDMARK TO SELECT TARGET SITE'
              }
            />

            {/* Floating Target Telemetry Overlay */}
            {selectedReference && (
              <div
                style={{
                  position: 'absolute',
                  top: 50,
                  left: 14,
                  background: 'rgba(8, 14, 22, 0.88)',
                  border: '1px solid #1e293b',
                  borderRadius: 4,
                  padding: '6px 10px',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  color: '#ffffff',
                  pointerEvents: 'none',
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.8)',
                }}
              >
                <div style={{ fontWeight: 800, color: selectedTarget === 'mars' ? '#f59e0b' : '#38bdf8' }}>
                  {selectedReference.name}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '9px', marginTop: 2 }}>
                  Slope: <strong>{selectedReference.features.slope_deg.value}°</strong> · Roughness:{' '}
                  <strong>{selectedReference.features.residual_roughness_m.value}m</strong>
                </div>
              </div>
            )}
          </div>
        )}

        {/* RIGHT STAGE: EARTH ANALOG CANDIDATES */}
        {(viewMode === 'dual' || viewMode === 'earth') && (
          <div
            style={{
              flex: 1,
              height: '100%',
              position: 'relative',
              minWidth: 0,
            }}
          >
            <PlanetGlobe
              body="earth"
              analogSites={filteredAnalogs}
              selectedAnalog={selectedAnalog}
              onSelectAnalog={(site) => {
                setSelectedAnalog(site);
                setLiveDemData(null);
              }}
              onSelectCoordinate={(lat, lon) => handleQueryLiveDEM(lat, lon)}
              resetSignal={earthResetSignal}
              autoRotate={autoRotate}
              headerBadge="EARTH // ANALOG LOCATIONS"
              subBadge={
                selectedAnalog
                  ? `${selectedAnalog.name} · ${selectedAnalog.similarity_percent}% SIMILARITY MATCH`
                  : 'CLICK ANY ANALOG PIN OR SURFACE TO QUERY ELEVATION'
              }
            />

            {/* Floating Earth Analog Telemetry Overlay */}
            {selectedAnalog && (
              <div
                style={{
                  position: 'absolute',
                  top: 50,
                  left: 14,
                  background: 'rgba(8, 14, 22, 0.88)',
                  border: '1px solid #1e293b',
                  borderRadius: 4,
                  padding: '6px 10px',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  color: '#ffffff',
                  pointerEvents: 'none',
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.8)',
                }}
              >
                <div style={{ fontWeight: 800, color: '#38bdf8' }}>
                  {selectedAnalog.name} ({selectedAnalog.similarity_percent}% MATCH)
                </div>
                <div style={{ color: '#94a3b8', fontSize: '9px', marginTop: 2 }}>
                  DEM Slope: <strong>{selectedAnalog.features.slope_deg}°</strong> · Roughness:{' '}
                  <strong>{selectedAnalog.features.residual_roughness_m}m</strong>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 3. SCIENTIFIC EXPERIMENT SUITABILITY & COMPARISON DRAWER */}
      <footer
        style={{
          background: 'rgba(8, 14, 22, 0.98)',
          borderTop: '1px solid #1f2937',
          zIndex: 35,
          display: 'flex',
          flexDirection: 'column',
          backdropFilter: 'blur(16px)',
          transition: 'height 0.2s ease',
          height: drawerOpen ? 270 : 36,
          flexShrink: 0,
        }}
      >
        {/* Drawer Header Toggle Bar */}
        <div
          onClick={() => setDrawerOpen(!drawerOpen)}
          style={{
            height: 36,
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            borderBottom: drawerOpen ? '1px solid #1e293b' : 'none',
            background: '#0b1320',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '11px', fontWeight: 700 }}>
            <Activity size={13} color="#38bdf8" />
            <span>
              SCIENTIFIC COMPARISON & 5-DOMAIN EXPERIMENT SUITABILITY MATRIX
            </span>
            {selectedReference && selectedAnalog && (
              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 400, fontFamily: 'monospace' }}>
                [{selectedReference.name} ➔ {selectedAnalog.name} ({selectedAnalog.similarity_percent}% SIMILARITY)]
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '10px', color: '#94a3b8' }}>
            <span>{drawerOpen ? 'HIDE SCIENTIFIC DETAILS' : 'EXPAND SCIENTIFIC DETAILS'}</span>
            {drawerOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </div>
        </div>

        {/* Drawer Content (Rendered when expanded) */}
        {drawerOpen && (
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px 16px',
              display: 'grid',
              gridTemplateColumns: 'minmax(280px, 320px) minmax(360px, 1fr) minmax(280px, 320px)',
              gap: 16,
            }}
          >
            {/* COLUMN 1: TARGET SITE VS EARTH ANALOG MEASUREMENTS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em' }}>
                PHYSICAL TOPOGRAPHY DELTA
              </div>

              {selectedReference && selectedAnalog && (
                <div
                  style={{
                    background: '#0d1624',
                    border: '1px solid #1e293b',
                    borderRadius: 5,
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                    <span style={{ color: '#94a3b8' }}>Target Body:</span>
                    <strong style={{ color: '#ffffff' }}>{selectedTarget.toUpperCase()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                    <span style={{ color: '#94a3b8' }}>Slope Match:</span>
                    <strong style={{ color: '#ffffff' }}>
                      Target {selectedReference.features.slope_deg.value}° vs Analog {selectedAnalog.features.slope_deg}° (Δ{selectedAnalog.differences.slope_delta_deg}°)
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                    <span style={{ color: '#94a3b8' }}>Roughness Match:</span>
                    <strong style={{ color: '#ffffff' }}>
                      Target {selectedReference.features.residual_roughness_m.value}m vs Analog {selectedAnalog.features.residual_roughness_m}m (Δ{selectedAnalog.differences.roughness_delta_m}m)
                    </strong>
                  </div>

                  {/* Query Live Copernicus DEM 90m Button */}
                  <button
                    onClick={() => handleQueryLiveDEM(selectedAnalog.latitude, selectedAnalog.longitude)}
                    disabled={liveDemLoading}
                    style={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: 3,
                      color: '#ffffff',
                      fontSize: '9px',
                      fontWeight: 700,
                      padding: '5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                      marginTop: 4,
                      fontFamily: 'monospace',
                    }}
                  >
                    <RefreshCw size={10} className={liveDemLoading ? 'spin' : ''} />
                    {liveDemLoading ? 'QUERYING COPERNICUS DEM...' : 'QUERY LIVE COPERNICUS 90M ELEVATION'}
                  </button>

                  {liveDemData && (
                    <div style={{ fontSize: '9px', color: '#10b981', fontFamily: 'monospace', marginTop: 2 }}>
                      ✓ Copernicus DEM Elevation: <strong>{liveDemData.center_elevation_m}m</strong>
                    </div>
                  )}
                  {liveDemError && (
                    <div style={{ fontSize: '9px', color: '#ef4444', marginTop: 2 }}>
                      {liveDemError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* COLUMN 2: 5-DOMAIN MISSION EXPERIMENT SUITABILITY MATRIX */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em' }}>
                  MISSION EXPERIMENT SUITABILITY MATRIX
                </span>
                <span style={{ fontSize: '9px', color: '#38bdf8', fontFamily: 'monospace' }}>
                  ACCURATE NASA ANALOG ASSESSMENT
                </span>
              </div>

              {selectedAnalog && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {selectedAnalog.experiments.map((exp) => (
                    <div
                      key={exp.id}
                      style={{
                        background: '#0d1624',
                        border: '1px solid #1e293b',
                        borderRadius: 4,
                        padding: '6px 8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#ffffff' }}>
                          {exp.name}
                        </span>
                        <span
                          style={{
                            fontSize: '8px',
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: 2,
                            background: exp.suitability === 'High' ? '#065f46' : exp.suitability === 'Moderate' ? '#854d0e' : '#1f2937',
                            color: exp.suitability === 'High' ? '#34d399' : exp.suitability === 'Moderate' ? '#fde047' : '#94a3b8',
                            fontFamily: 'monospace',
                          }}
                        >
                          {exp.suitability.toUpperCase()} ({exp.readiness_score}%)
                        </span>
                      </div>

                      {/* Readiness Progress Bar */}
                      <div style={{ height: 2, background: '#1e293b', borderRadius: 1, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${exp.readiness_score}%`,
                            height: '100%',
                            background: exp.suitability === 'High' ? '#10b981' : exp.suitability === 'Moderate' ? '#f59e0b' : '#6b7280',
                          }}
                        />
                      </div>

                      <div style={{ fontSize: '8px', color: '#94a3b8', lineHeight: 1.3 }}>
                        {exp.scientific_rationale}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* COLUMN 3: CANDIDATE ANALOG SITE SWITCHER */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em' }}>
                  MATCHED EARTH ANALOGS ({filteredAnalogs.length})
                </span>
                <span style={{ fontSize: '9px', color: '#94a3b8', fontFamily: 'monospace' }}>
                  CLICK TO FOCUS
                </span>
              </div>

              {/* Compact Search & Filter */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#0d1624',
                  border: '1px solid #1e293b',
                  borderRadius: 3,
                  padding: '3px 6px',
                  gap: 4,
                }}
              >
                <Search size={10} color="#94a3b8" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter analog sites..."
                  style={{
                    background: 'transparent',
                    border: 0,
                    outline: 'none',
                    color: '#ffffff',
                    fontSize: '10px',
                    width: '100%',
                  }}
                />
              </div>

              {/* Experiment Domain Filter Pills */}
              <div style={{ display: 'flex', gap: 3, overflowX: 'auto', paddingBottom: 2 }}>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'habitat_construction', label: 'Habitat' },
                  { id: 'rover_movements', label: 'Rover' },
                  { id: 'resource_extraction', label: 'ISRU' },
                  { id: 'life_detection', label: 'Life' },
                  { id: 'subsurface_exploration', label: 'Drill' },
                ].map((f) => {
                  const active = selectedExperimentFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setSelectedExperimentFilter(f.id)}
                      style={{
                        background: active ? '#38bdf8' : '#0d1624',
                        border: `1px solid ${active ? '#38bdf8' : '#1e293b'}`,
                        color: active ? '#080e16' : '#94a3b8',
                        fontSize: '8px',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: 2,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              {/* Candidate List */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 150 }}>
                {filteredAnalogs.map((item, index) => {
                  const isSelected = selectedAnalog?.earth_id === item.earth_id;
                  return (
                    <div
                      key={item.earth_id}
                      onClick={() => {
                        setSelectedAnalog(item);
                        setLiveDemData(null);
                      }}
                      style={{
                        background: isSelected ? '#1e293b' : 'rgba(13, 22, 36, 0.6)',
                        border: `1px solid ${isSelected ? '#38bdf8' : '#1e293b'}`,
                        borderRadius: 3,
                        padding: '4px 7px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          #{index + 1} {item.name}
                        </div>
                        <div style={{ fontSize: '8px', color: '#94a3b8', fontFamily: 'monospace' }}>
                          Slope {item.features.slope_deg}° · Roughness {item.features.residual_roughness_m}m
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: '9px',
                          fontWeight: 800,
                          color: '#38bdf8',
                          background: '#0f172a',
                          padding: '1px 5px',
                          borderRadius: 2,
                          fontFamily: 'monospace',
                          marginLeft: 6,
                          flexShrink: 0,
                        }}
                      >
                        {item.similarity_percent}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}

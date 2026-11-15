import { useEffect, useMemo, useState } from 'react';
import {
  Globe2,
  Search,
  Activity,
  RefreshCw,
  ArrowLeft,
  ChevronRight,
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
  const [activeBody, setActiveBody] = useState<'moon' | 'mars' | 'earth'>('moon');
  const [selectedTarget, setSelectedTarget] = useState<PlanetaryBody>('moon');
  const [references, setReferences] = useState<PlanetaryReferenceSite[]>([]);
  const [selectedReference, setSelectedReference] = useState<PlanetaryReferenceSite | null>(null);

  const [analogResults, setAnalogResults] = useState<AnalogMatchResult[]>([]);
  const [selectedAnalog, setSelectedAnalog] = useState<AnalogMatchResult | null>(null);
  const [selectedExperimentFilter, setSelectedExperimentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [liveDemLoading, setLiveDemLoading] = useState(false);
  const [liveDemData, setLiveDemData] = useState<LiveDEMResponse | null>(null);
  const [liveDemError, setLiveDemError] = useState<string | null>(null);

  const [resetSignal, setResetSignal] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);

  // Load verified references on body switch
  useEffect(() => {
    let active = true;
    fetchPlanetaryReferences(selectedTarget)
      .then((data) => {
        if (!active) return;
        setReferences(data);
        if (data.length > 0 && !selectedReference) {
          setSelectedReference(data[0]);
        }
      })
      .catch((err) => console.error(err));

    return () => {
      active = false;
    };
  }, [selectedTarget]);

  // Compute Earth analog candidates when reference changes
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
    setActiveBody(planet);
    setSelectedReference(null);
    setSelectedAnalog(null);
    setLiveDemData(null);
    setResetSignal((s) => s + 1);
  };

  const handleScanEarth = () => {
    setActiveBody('earth');
    setResetSignal((s) => s + 1);
  };

  const handleBackToPlanet = () => {
    setActiveBody(selectedTarget);
    setResetSignal((s) => s + 1);
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
        background: '#000000',
        color: '#ffffff',
        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* 1. TOP MINIMALIST HEADER (PURE WHITE & GREY / ZERO BLUE) */}
      <header
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 50,
          background: 'rgba(9, 9, 11, 0.94)',
          borderBottom: '1px solid #27272a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          zIndex: 30,
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 4,
              background: '#27272a',
              border: '1px solid #3f3f46',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Globe2 size={15} color="#ffffff" />
          </div>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.12em', color: '#ffffff' }}>
              PLANETRIX
            </span>
            <span style={{ fontSize: '9px', color: '#a1a1aa', letterSpacing: '0.1em', marginLeft: 8 }}>
              PLANETARY ANALOG MISSION OBSERVATORY
            </span>
          </div>
        </div>

        {/* Planet Navigation Pills (White & Grey) */}
        <div
          style={{
            display: 'flex',
            background: '#18181b',
            border: '1px solid #27272a',
            borderRadius: 6,
            padding: 2,
            gap: 2,
          }}
        >
          <button
            onClick={() => handleSelectPlanet('moon')}
            style={{
              border: 0,
              background: activeBody === 'moon' ? '#ffffff' : 'transparent',
              color: activeBody === 'moon' ? '#000000' : '#a1a1aa',
              fontWeight: 700,
              fontSize: '10px',
              padding: '5px 14px',
              borderRadius: 4,
              cursor: 'pointer',
              letterSpacing: '0.06em',
              transition: 'all 0.15s ease',
            }}
          >
            MOON
          </button>
          <button
            onClick={() => handleSelectPlanet('mars')}
            style={{
              border: 0,
              background: activeBody === 'mars' ? '#ffffff' : 'transparent',
              color: activeBody === 'mars' ? '#000000' : '#a1a1aa',
              fontWeight: 700,
              fontSize: '10px',
              padding: '5px 14px',
              borderRadius: 4,
              cursor: 'pointer',
              letterSpacing: '0.06em',
              transition: 'all 0.15s ease',
            }}
          >
            MARS
          </button>
          <button
            onClick={() => setActiveBody('earth')}
            style={{
              border: 0,
              background: activeBody === 'earth' ? '#ffffff' : 'transparent',
              color: activeBody === 'earth' ? '#000000' : '#a1a1aa',
              fontWeight: 700,
              fontSize: '10px',
              padding: '5px 14px',
              borderRadius: 4,
              cursor: 'pointer',
              letterSpacing: '0.06em',
              transition: 'all 0.15s ease',
            }}
          >
            EARTH ANALOGS ({analogResults.length})
          </button>
        </div>

        {/* Status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '9px', color: '#a1a1aa', fontFamily: 'monospace' }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#ffffff',
              boxShadow: '0 0 5px #ffffff',
            }}
          />
          <span>LRO / MOLA · COPERNICUS DEM 90M</span>
        </div>
      </header>

      {/* 2. FULL-VIEWPORT 3D CELESTIAL STAGE */}
      <div style={{ width: '100%', height: '100%', paddingTop: 50, position: 'relative' }}>
        <PlanetGlobe
          body={activeBody}
          referenceSites={references}
          selectedReference={selectedReference}
          onSelectReference={(site) => setSelectedReference(site)}
          analogSites={filteredAnalogs}
          selectedAnalog={selectedAnalog}
          onSelectAnalog={(site) => {
            setSelectedAnalog(site);
            setLiveDemData(null);
          }}
          onSelectCoordinate={(lat, lon) => {
            if (activeBody === 'earth') {
              handleQueryLiveDEM(lat, lon);
            }
          }}
          resetSignal={resetSignal}
          autoRotate={autoRotate}
        />

        {/* Floating Quick Controls (Top-Left) */}
        <div
          style={{
            position: 'absolute',
            top: 64,
            left: 20,
            zIndex: 15,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div
            style={{
              background: 'rgba(9, 9, 11, 0.90)',
              border: '1px solid #27272a',
              borderRadius: 4,
              padding: '5px 9px',
              fontSize: '10px',
              fontFamily: 'monospace',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Activity size={12} color="#ffffff" />
            <span>
              {activeBody === 'earth'
                ? `REF: ${selectedReference?.name ?? 'Selected Target'}`
                : `CLICK LANDMARK PIN OR SURFACE TO SELECT`}
            </span>
          </div>

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            style={{
              background: 'rgba(9, 9, 11, 0.90)',
              border: '1px solid #27272a',
              borderRadius: 4,
              color: autoRotate ? '#ffffff' : '#71717a',
              padding: '4px 8px',
              fontSize: '9px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              alignSelf: 'flex-start',
              fontFamily: 'monospace',
            }}
          >
            <RefreshCw size={10} className={autoRotate ? 'spin' : ''} />
            {autoRotate ? 'ORBIT: ON' : 'ORBIT: OFF'}
          </button>
        </div>

        {/* 3. COMPACT FLOATING TELEMETRY DRAWER (WHITE & GREY ONLY / DECREASED CARD SIZES) */}
        <aside
          style={{
            position: 'absolute',
            top: 64,
            right: 20,
            bottom: 20,
            width: 350,
            background: 'rgba(9, 9, 11, 0.94)',
            border: '1px solid #27272a',
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 20,
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.9)',
          }}
        >
          {/* MODE A: MOON / MARS SITE SELECTOR */}
          {activeBody !== 'earth' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid #27272a' }}>
                <div style={{ fontSize: '9px', fontWeight: 800, color: '#a1a1aa', letterSpacing: '0.12em' }}>
                  STEP 1 // TARGET SELECTION
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', margin: '3px 0' }}>
                  {activeBody === 'moon' ? 'Lunar Reference Locations' : 'Martian Surface Regions'}
                </div>
              </div>

              {/* Compact Site List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {references.map((site) => {
                  const isSelected = selectedReference?.id === site.id;
                  return (
                    <div
                      key={site.id}
                      onClick={() => setSelectedReference(site)}
                      style={{
                        background: isSelected ? '#18181b' : 'rgba(9, 9, 11, 0.6)',
                        border: `1px solid ${isSelected ? '#ffffff' : '#27272a'}`,
                        borderRadius: 6,
                        padding: '8px 10px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff' }}>{site.name}</span>
                        <span style={{ fontSize: '8px', color: '#a1a1aa', fontFamily: 'monospace' }}>
                          {site.latitude.toFixed(2)}°, {site.longitude.toFixed(2)}°
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: '9px', color: '#a1a1aa', fontFamily: 'monospace' }}>
                        <span>SLOPE: <strong style={{ color: '#ffffff' }}>{site.features.slope_deg.value}°</strong></span>
                        <span>ROUGHNESS: <strong style={{ color: '#ffffff' }}>{site.features.residual_roughness_m.value}m</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Button: Scan Earth */}
              <div style={{ padding: '10px 12px', borderTop: '1px solid #27272a', background: '#09090b' }}>
                <button
                  disabled={!selectedReference}
                  onClick={handleScanEarth}
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid #ffffff',
                    borderRadius: 4,
                    color: '#000000',
                    fontWeight: 700,
                    fontSize: '11px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    letterSpacing: '0.06em',
                  }}
                >
                  SCAN EARTH ANALOGS <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* MODE B: EARTH ANALOG MATCHES & COMPACT EXPERIMENT MATRIX */}
          {activeBody === 'earth' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Header Context */}
              <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid #27272a' }}>
                <button
                  onClick={handleBackToPlanet}
                  style={{
                    background: 'none',
                    border: 0,
                    color: '#a1a1aa',
                    fontSize: '10px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    padding: 0,
                    marginBottom: 6,
                  }}
                >
                  <ArrowLeft size={11} /> BACK TO {selectedTarget.toUpperCase()}
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>Earth Analog Sites</span>
                  <span style={{ fontSize: '10px', color: '#a1a1aa', fontFamily: 'monospace' }}>
                    {filteredAnalogs.length} MATCHES
                  </span>
                </div>

                {/* Compact Search Box */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: 4,
                    padding: '4px 8px',
                    marginTop: 6,
                    gap: 6,
                  }}
                >
                  <Search size={12} color="#71717a" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search site or region..."
                    style={{
                      background: 'transparent',
                      border: 0,
                      outline: 'none',
                      color: '#ffffff',
                      fontSize: '11px',
                      width: '100%',
                    }}
                  />
                </div>

                {/* Compact Filter Pills (White & Grey) */}
                <div style={{ display: 'flex', gap: 4, marginTop: 6, overflowX: 'auto', paddingBottom: 2 }}>
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'habitat_construction', label: 'Habitat' },
                    { id: 'rover_movements', label: 'Rover' },
                    { id: 'resource_extraction', label: 'ISRU' },
                    { id: 'life_detection', label: 'Life' },
                    { id: 'subsurface_exploration', label: 'Drill' },
                  ].map((filter) => {
                    const active = selectedExperimentFilter === filter.id;
                    return (
                      <button
                        key={filter.id}
                        onClick={() => setSelectedExperimentFilter(filter.id)}
                        style={{
                          background: active ? '#ffffff' : '#18181b',
                          border: `1px solid ${active ? '#ffffff' : '#27272a'}`,
                          color: active ? '#000000' : '#a1a1aa',
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 3,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scrollable Body: Selected Analog Details + Candidates List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Selected Analog Details (Decreased Card Sizes) */}
                {selectedAnalog && (
                  <div
                    style={{
                      background: '#18181b',
                      border: '1px solid #3f3f46',
                      borderRadius: 6,
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                          {selectedAnalog.name}
                        </div>
                        <div style={{ fontSize: '9px', color: '#a1a1aa', fontFamily: 'monospace' }}>
                          {selectedAnalog.latitude.toFixed(2)}°N, {selectedAnalog.longitude.toFixed(2)}°E
                        </div>
                      </div>
                      <div
                        style={{
                          background: '#27272a',
                          border: '1px solid #3f3f46',
                          borderRadius: 4,
                          padding: '2px 6px',
                          fontSize: '11px',
                          fontWeight: 800,
                          color: '#ffffff',
                          fontFamily: 'monospace',
                        }}
                      >
                        {selectedAnalog.similarity_percent}%
                      </div>
                    </div>

                    <div style={{ fontSize: '10px', color: '#d4d4d8', margin: '6px 0', lineHeight: 1.4 }}>
                      {selectedAnalog.environment_summary}
                    </div>

                    {/* Compact Physical Slope & Roughness */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, margin: '6px 0' }}>
                      <div style={{ background: '#09090b', border: '1px solid #27272a', padding: '5px 7px', borderRadius: 4 }}>
                        <span style={{ fontSize: '8px', color: '#71717a', display: 'block', fontFamily: 'monospace' }}>
                          SLOPE (DEM 90M)
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff' }}>
                          {selectedAnalog.features.slope_deg}° (Δ{selectedAnalog.differences.slope_delta_deg}°)
                        </span>
                      </div>
                      <div style={{ background: '#09090b', border: '1px solid #27272a', padding: '5px 7px', borderRadius: 4 }}>
                        <span style={{ fontSize: '8px', color: '#71717a', display: 'block', fontFamily: 'monospace' }}>
                          ROUGHNESS
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff' }}>
                          {selectedAnalog.features.residual_roughness_m}m (Δ{selectedAnalog.differences.roughness_delta_m}m)
                        </span>
                      </div>
                    </div>

                    {/* Query Live DEM Button */}
                    <button
                      onClick={() => handleQueryLiveDEM(selectedAnalog.latitude, selectedAnalog.longitude)}
                      disabled={liveDemLoading}
                      style={{
                        width: '100%',
                        background: '#09090b',
                        border: '1px solid #3f3f46',
                        borderRadius: 4,
                        color: '#ffffff',
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        margin: '6px 0',
                        fontFamily: 'monospace',
                      }}
                    >
                      <RefreshCw size={10} className={liveDemLoading ? 'spin' : ''} />
                      {liveDemLoading ? 'QUERYING LIVE COPERNICUS DEM...' : 'QUERY LIVE COPERNICUS 90m ELEVATION'}
                    </button>

                    {liveDemData && (
                      <div
                        style={{
                          background: '#09090b',
                          border: '1px solid #3f3f46',
                          borderRadius: 4,
                          padding: '6px 8px',
                          fontSize: '9px',
                          fontFamily: 'monospace',
                          marginBottom: 8,
                          color: '#ffffff',
                        }}
                      >
                        ✓ LIVE DEM ELEVATION: {liveDemData.center_elevation_m}m
                      </div>
                    )}
                    {liveDemError && (
                      <div style={{ color: '#ffffff', fontSize: '9px', marginBottom: 6 }}>{liveDemError}</div>
                    )}

                    {/* 5-Domain Mission Experiment Suitability Matrix (White & Grey) */}
                    <div style={{ borderTop: '1px solid #27272a', paddingTop: 8 }}>
                      <div style={{ fontSize: '9px', fontWeight: 800, color: '#a1a1aa', letterSpacing: '0.1em', marginBottom: 6 }}>
                        MISSION EXPERIMENT SUITABILITY
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {selectedAnalog.experiments.map((exp) => (
                          <div
                            key={exp.id}
                            style={{
                              background: '#09090b',
                              border: '1px solid #27272a',
                              borderRadius: 4,
                              padding: '6px 8px',
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
                                  background: '#27272a',
                                  border: '1px solid #3f3f46',
                                  color: '#ffffff',
                                  fontFamily: 'monospace',
                                }}
                              >
                                {exp.suitability.toUpperCase()} ({exp.readiness_score}%)
                              </span>
                            </div>

                            {/* Slim White Progress Line */}
                            <div
                              style={{
                                height: 2,
                                background: '#27272a',
                                borderRadius: 1,
                                margin: '4px 0',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${exp.readiness_score}%`,
                                  height: '100%',
                                  background: '#ffffff',
                                }}
                              />
                            </div>

                            <div style={{ fontSize: '9px', color: '#a1a1aa', lineHeight: 1.3 }}>
                              {exp.scientific_rationale}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Ranked List of Other Candidates (Decreased Card Size) */}
                <div style={{ fontSize: '9px', fontWeight: 800, color: '#71717a', letterSpacing: '0.1em' }}>
                  CANDIDATES
                </div>

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
                        background: isSelected ? '#18181b' : 'rgba(9, 9, 11, 0.6)',
                        border: `1px solid ${isSelected ? '#ffffff' : '#27272a'}`,
                        borderRadius: 4,
                        padding: '6px 8px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff' }}>
                          #{index + 1} {item.name}
                        </div>
                        <div style={{ fontSize: '8px', color: '#71717a', fontFamily: 'monospace' }}>
                          Slope {item.features.slope_deg}° · Roughness {item.features.residual_roughness_m}m
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          color: '#ffffff',
                          background: '#27272a',
                          border: '1px solid #3f3f46',
                          padding: '1px 5px',
                          borderRadius: 3,
                          fontFamily: 'monospace',
                        }}
                      >
                        {item.similarity_percent}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

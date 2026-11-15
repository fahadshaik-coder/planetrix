import { useEffect, useMemo, useState } from 'react';
import {
  Globe2,
  Search,
  Activity,
  RefreshCw,
  ArrowLeft,
  Beaker,
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
  // Navigation & State
  const [activeBody, setActiveBody] = useState<'moon' | 'mars' | 'earth'>('moon');
  const [selectedTarget, setSelectedTarget] = useState<PlanetaryBody>('moon');
  const [references, setReferences] = useState<PlanetaryReferenceSite[]>([]);
  const [selectedReference, setSelectedReference] = useState<PlanetaryReferenceSite | null>(null);

  // Earth Analog Matching State
  const [analogResults, setAnalogResults] = useState<AnalogMatchResult[]>([]);
  const [selectedAnalog, setSelectedAnalog] = useState<AnalogMatchResult | null>(null);
  const [selectedExperimentFilter, setSelectedExperimentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Live DEM Interrogation State
  const [liveDemLoading, setLiveDemLoading] = useState(false);
  const [liveDemData, setLiveDemData] = useState<LiveDEMResponse | null>(null);
  const [liveDemError, setLiveDemError] = useState<string | null>(null);

  // General Loading & Camera Controls
  const [loading, setLoading] = useState(false);
  void loading;
  const [resetSignal, setResetSignal] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);

  // Load verified references on body switch
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchPlanetaryReferences(selectedTarget)
      .then((data) => {
        if (!active) return;
        setReferences(data);
        if (data.length > 0 && !selectedReference) {
          setSelectedReference(data[0]);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedTarget]);

  // When selected reference changes, compute Earth analog candidates
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

  // Handle switching target between Moon and Mars
  const handleSelectPlanet = (planet: PlanetaryBody) => {
    setSelectedTarget(planet);
    setActiveBody(planet);
    setSelectedReference(null);
    setSelectedAnalog(null);
    setLiveDemData(null);
    setResetSignal((s) => s + 1);
  };

  // Transition to Earth view
  const handleScanEarth = () => {
    setActiveBody('earth');
    setResetSignal((s) => s + 1);
  };

  // Back to Moon/Mars
  const handleBackToPlanet = () => {
    setActiveBody(selectedTarget);
    setResetSignal((s) => s + 1);
  };

  // Live DEM Query for selected Earth Analog
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

  // Filtered Earth Analogs
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
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        background: '#05080f',
        color: '#e2e8f0',
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* 1. TOP HEADER / NASA COMMAND BAR */}
      <header
        style={{
          height: 64,
          background: 'rgba(9, 14, 24, 0.95)',
          borderBottom: '1px solid #1a2536',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          zIndex: 20,
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(2, 132, 199, 0.5)',
            }}
          >
            <Globe2 size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.12em', color: '#ffffff' }}>
              PLANETRIX
            </div>
            <div style={{ fontSize: '9px', letterSpacing: '0.18em', color: '#718096', fontWeight: 600 }}>
              PLANETARY ANALOG MISSION OBSERVATORY
            </div>
          </div>
        </div>

        {/* Planet Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(17, 24, 39, 0.8)',
            border: '1px solid #1f293d',
            borderRadius: 8,
            padding: 3,
            gap: 4,
          }}
        >
          <button
            onClick={() => handleSelectPlanet('moon')}
            style={{
              border: 0,
              background: activeBody === 'moon' ? '#253549' : 'transparent',
              color: activeBody === 'moon' ? '#f6e05e' : '#a0aec0',
              fontWeight: 700,
              fontSize: '11px',
              padding: '7px 16px',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s ease',
            }}
          >
            <span>☾</span> THE MOON
          </button>
          <button
            onClick={() => handleSelectPlanet('mars')}
            style={{
              border: 0,
              background: activeBody === 'mars' ? '#3e241e' : 'transparent',
              color: activeBody === 'mars' ? '#f56565' : '#a0aec0',
              fontWeight: 700,
              fontSize: '11px',
              padding: '7px 16px',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s ease',
            }}
          >
            <span>♂</span> MARS
          </button>
          <button
            onClick={() => setActiveBody('earth')}
            style={{
              border: 0,
              background: activeBody === 'earth' ? '#1c3d33' : 'transparent',
              color: activeBody === 'earth' ? '#48bb78' : '#a0aec0',
              fontWeight: 700,
              fontSize: '11px',
              padding: '7px 16px',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s ease',
            }}
          >
            <span>⊕</span> EARTH ANALOGS ({analogResults.length})
          </button>
        </div>

        {/* Live Data Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '11px', color: '#a0aec0' }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#48bb78',
              boxShadow: '0 0 10px #48bb78',
            }}
          />
          <span style={{ letterSpacing: '0.06em', fontSize: '10px', color: '#cbd5e0' }}>
            COPERNICUS DEM 90m · NASA LRO/MOLA LIVE
          </span>
        </div>
      </header>

      {/* 2. MAIN BODY (LEFT 3D GLOBE + RIGHT SCIENTIFIC MISSION SIDEBAR) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 440px', flex: 1, minHeight: 0 }}>
        {/* LEFT VIEWPORT: 3D CELESTIAL STAGE */}
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <PlanetGlobe
            body={activeBody}
            referenceSites={references}
            selectedReference={selectedReference}
            onSelectReference={(site) => {
              setSelectedReference(site);
            }}
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

          {/* Quick Floating Controls (Auto-Rotate & Status HUD) */}
          <div
            style={{
              position: 'absolute',
              top: 70,
              left: 20,
              zIndex: 15,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div
              style={{
                background: 'rgba(10, 16, 26, 0.85)',
                border: '1px solid #1a273b',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: '11px',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Activity size={14} color="#63b3ed" />
              <span>
                {activeBody === 'earth'
                  ? `Comparing against: ${selectedReference?.name ?? 'Selected Reference'}`
                  : `Select a planetary mission site or inspect coordinates`}
              </span>
            </div>

            <button
              onClick={() => setAutoRotate(!autoRotate)}
              style={{
                background: 'rgba(10, 16, 26, 0.85)',
                border: '1px solid #1a273b',
                borderRadius: 6,
                color: autoRotate ? '#63b3ed' : '#718096',
                padding: '6px 10px',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                alignSelf: 'flex-start',
                backdropFilter: 'blur(8px)',
              }}
            >
              <RefreshCw size={11} className={autoRotate ? 'spin' : ''} />
              {autoRotate ? 'AUTO-ORBIT: ON' : 'AUTO-ORBIT: OFF'}
            </button>
          </div>
        </div>

        {/* RIGHT SIDEBAR: MISSION CONTROL & EXPERIMENT ANALYTICS */}
        <aside
          style={{
            background: 'rgba(11, 17, 28, 0.98)',
            borderLeft: '1px solid #1a273b',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 10,
          }}
        >
          {/* SIDEBAR MODE A: MOON / MARS SITE SELECTION */}
          {activeBody !== 'earth' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ padding: '20px 22px 14px', borderBottom: '1px solid #1a273b' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#63b3ed', letterSpacing: '0.14em' }}>
                  STEP 1 / PLANETARY SELECTION
                </div>
                <h2 style={{ fontSize: '20px', margin: '6px 0 4px', fontWeight: 700, color: '#f7fafc' }}>
                  {activeBody === 'moon' ? 'Lunar Mission Sites' : 'Martian Surface Regions'}
                </h2>
                <p style={{ fontSize: '12px', color: '#a0aec0', margin: 0, lineHeight: 1.5 }}>
                  Choose a documented NASA landing site with validated LRO LOLA / MOLA topography to search for Earth
                  analogs.
                </p>
              </div>

              {/* Reference Sites List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {references.map((site) => {
                  const isSelected = selectedReference?.id === site.id;
                  return (
                    <div
                      key={site.id}
                      onClick={() => setSelectedReference(site)}
                      style={{
                        background: isSelected ? 'rgba(29, 44, 66, 0.9)' : 'rgba(15, 23, 38, 0.7)',
                        border: `1px solid ${isSelected ? (activeBody === 'moon' ? '#f6e05e' : '#f56565') : '#1e293b'}`,
                        borderRadius: 8,
                        padding: '14px 16px',
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>{site.name}</div>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: isSelected ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255,255,255,0.05)',
                            color: activeBody === 'moon' ? '#f6e05e' : '#f56565',
                          }}
                        >
                          {site.crs}
                        </span>
                      </div>

                      <div style={{ fontSize: '11px', color: '#718096', margin: '6px 0 10px' }}>
                        {site.latitude.toFixed(3)}°{site.latitude >= 0 ? 'N' : 'S'} · {site.longitude.toFixed(3)}°
                        {site.longitude >= 0 ? 'E' : 'W'}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '11px' }}>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: 4 }}>
                          <span style={{ color: '#a0aec0', fontSize: '9px', display: 'block' }}>SURFACE SLOPE</span>
                          <strong style={{ color: '#e2e8f0' }}>{site.features.slope_deg.value}°</strong>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: 4 }}>
                          <span style={{ color: '#a0aec0', fontSize: '9px', display: 'block' }}>ROUGHNESS</span>
                          <strong style={{ color: '#e2e8f0' }}>{site.features.residual_roughness_m.value} m</strong>
                        </div>
                      </div>

                      <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: 10, lineHeight: 1.4 }}>
                        {site.quality_note}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action: Scan Earth Analogs */}
              <div style={{ padding: '16px 20px', borderTop: '1px solid #1a273b', background: 'rgba(9, 14, 24, 0.95)' }}>
                <button
                  disabled={!selectedReference}
                  onClick={handleScanEarth}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    border: 0,
                    borderRadius: 8,
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '13px',
                    padding: '13px 18px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                    letterSpacing: '0.06em',
                  }}
                >
                  <Globe2 size={16} /> SEARCH & SCAN EARTH ANALOGS ➔
                </button>
              </div>
            </div>
          )}

          {/* SIDEBAR MODE B: EARTH ANALOG MATCHES & 5-DOMAIN MISSION EXPERIMENTS */}
          {activeBody === 'earth' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Header with Reference Context */}
              <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #1a273b' }}>
                <button
                  onClick={handleBackToPlanet}
                  style={{
                    background: 'none',
                    border: 0,
                    color: '#63b3ed',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    padding: 0,
                    marginBottom: 8,
                  }}
                >
                  <ArrowLeft size={13} /> BACK TO {selectedTarget.toUpperCase()} SELECTION
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 700, color: '#f7fafc' }}>Earth Analogs</h2>
                  <span style={{ fontSize: '11px', color: '#48bb78', fontWeight: 700 }}>
                    {filteredAnalogs.length} SITES FOUND
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: 4 }}>
                  Matching against: <strong style={{ color: '#edf2f7' }}>{selectedReference?.name}</strong>
                </div>

                {/* Search Box */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid #1e293b',
                    borderRadius: 6,
                    padding: '7px 10px',
                    marginTop: 10,
                    gap: 8,
                  }}
                >
                  <Search size={14} color="#718096" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search analog by name or environment..."
                    style={{
                      background: 'transparent',
                      border: 0,
                      outline: 'none',
                      color: '#ffffff',
                      fontSize: '12px',
                      width: '100%',
                    }}
                  />
                </div>

                {/* Experiment Filter Chips */}
                <div style={{ display: 'flex', gap: 6, marginTop: 10, overflowX: 'auto', paddingBottom: 4 }}>
                  {[
                    { id: 'all', label: 'All Experiments' },
                    { id: 'habitat_construction', label: 'Habitat' },
                    { id: 'rover_movements', label: 'Rover Mobility' },
                    { id: 'resource_extraction', label: 'ISRU Extraction' },
                    { id: 'life_detection', label: 'Life Detection' },
                    { id: 'subsurface_exploration', label: 'Drilling/GPR' },
                  ].map((filter) => {
                    const active = selectedExperimentFilter === filter.id;
                    return (
                      <button
                        key={filter.id}
                        onClick={() => setSelectedExperimentFilter(filter.id)}
                        style={{
                          background: active ? '#253549' : 'rgba(15, 23, 42, 0.7)',
                          border: `1px solid ${active ? '#63b3ed' : '#1e293b'}`,
                          color: active ? '#63b3ed' : '#a0aec0',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '4px 8px',
                          borderRadius: 4,
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

              {/* Scrollable List of Candidates & Deep Inspector */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Selected Analog Deep Inspector Card */}
                {selectedAnalog && (
                  <div
                    style={{
                      background: 'rgba(16, 26, 44, 0.95)',
                      border: '1px solid #2b4365',
                      borderRadius: 10,
                      padding: '16px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 800,
                            letterSpacing: '0.1em',
                            color: '#48bb78',
                            background: 'rgba(72, 187, 120, 0.15)',
                            padding: '2px 6px',
                            borderRadius: 4,
                          }}
                        >
                          TOP ANALOGUE MATCH
                        </span>
                        <h3 style={{ fontSize: '16px', margin: '6px 0 2px', fontWeight: 800, color: '#ffffff' }}>
                          {selectedAnalog.name}
                        </h3>
                        <div style={{ fontSize: '11px', color: '#a0aec0' }}>
                          {selectedAnalog.latitude.toFixed(3)}°N, {selectedAnalog.longitude.toFixed(3)}°E
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#48bb78' }}>
                          {selectedAnalog.similarity_percent}%
                        </div>
                        <span style={{ fontSize: '9px', color: '#718096' }}>SIMILARITY</span>
                      </div>
                    </div>

                    <div style={{ fontSize: '11px', color: '#cbd5e0', margin: '12px 0', lineHeight: 1.5 }}>
                      {selectedAnalog.environment_summary}
                    </div>

                    {/* Physical Terrain Stencil Metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '12px 0' }}>
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: 6 }}>
                        <span style={{ fontSize: '9px', color: '#718096', display: 'block' }}>SLOPE (DEM 90m)</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                          <strong style={{ fontSize: '14px', color: '#ffffff' }}>
                            {selectedAnalog.features.slope_deg}°
                          </strong>
                          <span style={{ fontSize: '10px', color: '#a0aec0' }}>
                            (Δ {selectedAnalog.differences.slope_delta_deg}°)
                          </span>
                        </div>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: 6 }}>
                        <span style={{ fontSize: '9px', color: '#718096', display: 'block' }}>RESIDUAL ROUGHNESS</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                          <strong style={{ fontSize: '14px', color: '#ffffff' }}>
                            {selectedAnalog.features.residual_roughness_m} m
                          </strong>
                          <span style={{ fontSize: '10px', color: '#a0aec0' }}>
                            (Δ {selectedAnalog.differences.roughness_delta_m}m)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Live Copernicus DEM Interrogation Button */}
                    <button
                      onClick={() => handleQueryLiveDEM(selectedAnalog.latitude, selectedAnalog.longitude)}
                      disabled={liveDemLoading}
                      style={{
                        width: '100%',
                        background: 'rgba(43, 108, 176, 0.25)',
                        border: '1px solid #3182ce',
                        borderRadius: 6,
                        color: '#63b3ed',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        marginTop: 4,
                        marginBottom: 12,
                      }}
                    >
                      <RefreshCw size={12} className={liveDemLoading ? 'spin' : ''} />
                      {liveDemLoading
                        ? 'QUERYING LIVE COPERNICUS DEM...'
                        : 'QUERY LIVE COPERNICUS 90m ELEVATION STENCIL'}
                    </button>

                    {/* Live DEM Data Card if fetched */}
                    {liveDemData && (
                      <div
                        style={{
                          background: 'rgba(10, 20, 35, 0.9)',
                          border: '1px solid #2b6cb0',
                          borderRadius: 6,
                          padding: '10px',
                          marginBottom: 14,
                          fontSize: '11px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#48bb78', fontWeight: 700 }}>
                          <span>✓ LIVE COPERNICUS DEM CONFIRMED</span>
                          <span>{liveDemData.center_elevation_m} m ELEVATION</span>
                        </div>
                        <div style={{ fontSize: '10px', color: '#a0aec0', marginTop: 4 }}>
                          3x3 Local Stencil Elevations: {liveDemData.elevation_stencil_m.slice(0, 5).join('m, ')}m...
                        </div>
                      </div>
                    )}
                    {liveDemError && (
                      <div style={{ color: '#fc8181', fontSize: '10px', marginBottom: 10 }}>{liveDemError}</div>
                    )}

                    {/* 5-DOMAIN MISSION EXPERIMENT SUITABILITY MATRIX */}
                    <div style={{ borderTop: '1px solid #2d3748', paddingTop: 12 }}>
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          letterSpacing: '0.08em',
                          color: '#e2e8f0',
                          marginBottom: 10,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Beaker size={13} color="#63b3ed" /> MISSION EXPERIMENT SUITABILITY MATRIX
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {selectedAnalog.experiments.map((exp) => {
                          const isHigh = exp.suitability === 'High';
                          const isMod = exp.suitability === 'Moderate';
                          const statusColor = isHigh ? '#48bb78' : isMod ? '#ecc94b' : '#a0aec0';

                          return (
                            <div
                              key={exp.id}
                              style={{
                                background: 'rgba(0,0,0,0.25)',
                                border: `1px solid ${isHigh ? 'rgba(72, 187, 120, 0.3)' : 'rgba(255,255,255,0.06)'}`,
                                borderRadius: 6,
                                padding: '10px 12px',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#f7fafc' }}>{exp.name}</div>
                                <span
                                  style={{
                                    fontSize: '9px',
                                    fontWeight: 800,
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    background: isHigh
                                      ? 'rgba(72, 187, 120, 0.2)'
                                      : isMod
                                      ? 'rgba(236, 201, 75, 0.2)'
                                      : 'rgba(160, 174, 192, 0.1)',
                                    color: statusColor,
                                  }}
                                >
                                  {exp.suitability.toUpperCase()} ({exp.readiness_score}%)
                                </span>
                              </div>

                              {/* Progress bar */}
                              <div
                                style={{
                                  height: 4,
                                  background: 'rgba(255,255,255,0.08)',
                                  borderRadius: 2,
                                  margin: '7px 0',
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    width: `${exp.readiness_score}%`,
                                    height: '100%',
                                    background: statusColor,
                                    borderRadius: 2,
                                  }}
                                />
                              </div>

                              <p style={{ fontSize: '11px', color: '#a0aec0', margin: '4px 0 6px', lineHeight: 1.4 }}>
                                {exp.scientific_rationale}
                              </p>

                              {/* Key Experiments Bullet Points */}
                              <div style={{ fontSize: '10px', color: '#cbd5e0' }}>
                                <span style={{ color: '#718096', fontWeight: 700 }}>VERIFIED EXPERIMENTS:</span>
                                <ul style={{ margin: '4px 0 0 16px', padding: 0, color: '#90cdf4' }}>
                                  {exp.key_experiments.map((k, i) => (
                                    <li key={i} style={{ marginBottom: 2 }}>
                                      {k}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Ranked List of Other Earth Analogs */}
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#718096', letterSpacing: '0.08em' }}>
                  ALL RANKED TERRESTRIAL CANDIDATES
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
                        background: isSelected ? 'rgba(30, 58, 92, 0.6)' : 'rgba(15, 23, 42, 0.7)',
                        border: `1px solid ${isSelected ? '#63b3ed' : '#1e293b'}`,
                        borderRadius: 8,
                        padding: '12px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#63b3ed' }}>#{index + 1}</span>
                          <strong style={{ fontSize: '13px', color: '#ffffff' }}>{item.name}</strong>
                        </div>
                        <div style={{ fontSize: '10px', color: '#718096', marginTop: 3 }}>
                          Slope {item.features.slope_deg}° · Roughness {item.features.residual_roughness_m}m
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#48bb78' }}>
                          {item.similarity_percent}%
                        </div>
                        <span style={{ fontSize: '9px', color: '#718096' }}>MATCH</span>
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

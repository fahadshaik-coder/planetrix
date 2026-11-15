// Legacy types for compatibility
export type PlanetaryBody = 'moon' | 'mars';
export type DataMode = 'demo' | 'backend';
export type EvidenceStatus = 'demonstration' | 'observed' | 'inferred' | 'modeled' | 'unverified';
export type CategoryKey = 'geology' | 'terrain' | 'environment' | 'resources' | 'processes' | 'biology' | 'subsurface' | 'engineering';
export interface Coordinates { latitude: number; longitude: number; crs: string; }
export interface Provenance { sourceName: string; sourceUrl?: string; datasetVersion?: string; retrievedAt?: string; }
export interface ScientificMeasurement { name: string; value: number | string | null; unit: string | null; evidence: EvidenceStatus; uncertainty: string | null; provenance: Provenance | null; }
export interface Completeness { fraction: number | null; assessed: number | null; expected: number | null; }
export interface SimilarityScore { percent: number | null; method: string | null; normalized: boolean; }
export interface ScientificCategory { key: CategoryKey; name: string; similarity: SimilarityScore; completeness: Completeness; measurements: ScientificMeasurement[]; limitation: string; }
export interface PlanetaryReference { id: string; body: PlanetaryBody; name: string; coordinates: Coordinates | null; }
export interface EarthLocation { id: string; name: string; region: string; coordinates: Coordinates; }
export interface ScientificEvidence { status: EvidenceStatus; description: string; }
export interface DiscoveryResult { id: string; earth: EarthLocation; reference: PlanetaryReference; similarity: SimilarityScore; completeness: Completeness; evidence: ScientificEvidence; categories: ScientificCategory[]; provenance: Provenance[]; demonstration: boolean; }

// Modern 3D Observatory & Multi-Domain Experiment Types
export type ViewMode = 'planet' | 'earth';
export type ExperimentDomainKey =
  | 'habitat_construction'
  | 'rover_movements'
  | 'resource_extraction'
  | 'life_detection'
  | 'subsurface_exploration';

export interface TerrainMeasurement {
  value: number;
  unit: string;
  uncertainty?: number | null;
}

export interface PlanetaryReferenceSite {
  id: string;
  body: PlanetaryBody;
  latitude: number;
  longitude: number;
  name: string;
  crs: string;
  resolution_m?: number;
  source_url: string;
  source_product: string;
  source_version: string;
  retrieved_at: string;
  observation_kind: string;
  quality_note: string;
  features: {
    slope_deg: TerrainMeasurement;
    residual_roughness_m: TerrainMeasurement;
  };
  target_experiments?: ExperimentDomainKey[];
}

export interface ExperimentSuitability {
  id: ExperimentDomainKey;
  name: string;
  suitability: 'High' | 'Moderate' | 'Low';
  readiness_score: number;
  scientific_rationale: string;
  key_experiments: string[];
}

export interface AnalogMatchResult {
  earth_id: string;
  name: string;
  latitude: number;
  longitude: number;
  normalized_distance: number;
  similarity_percent: number;
  features: {
    slope_deg: number;
    residual_roughness_m: number;
  };
  reference_features: {
    slope_deg: number;
    residual_roughness_m: number;
  };
  differences: {
    slope_delta_deg: number;
    roughness_delta_m: number;
  };
  environment_summary: string;
  source_product: string;
  source_url: string;
  experiments: ExperimentSuitability[];
}

export interface LiveDEMResponse {
  latitude: number;
  longitude: number;
  center_elevation_m: number;
  elevation_stencil_m: number[];
  spacing_m: number;
  features: {
    slope_deg: TerrainMeasurement;
    residual_roughness_m: TerrainMeasurement;
  };
  source: string;
  source_citation: string;
}

export interface ExperimentDomainInfo {
  id: ExperimentDomainKey;
  name: string;
  description: string;
  ideal_conditions: string;
}

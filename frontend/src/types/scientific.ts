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

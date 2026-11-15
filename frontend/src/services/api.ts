import type {
  PlanetaryBody,
  PlanetaryReferenceSite,
  AnalogMatchResult,
  LiveDEMResponse,
  ExperimentDomainInfo,
  DiscoveryResult,
} from '../types/scientific';
import { validateRecords } from '../utils/analogs';

const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export async function fetchAnalogs(target: PlanetaryBody, signal?: AbortSignal): Promise<DiscoveryResult[]> {
  const response = await fetch(`${BASE}/analogs?target=${encodeURIComponent(target)}`, { signal });
  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? 'Analog endpoint not implemented yet (HTTP 404).'
        : `Backend error: HTTP ${response.status}`
    );
  }
  return validateRecords(await response.json());
}

export async function fetchPlanetaryReferences(
  body: PlanetaryBody,
  signal?: AbortSignal
): Promise<PlanetaryReferenceSite[]> {
  const response = await fetch(`${BASE}/science/references?body=${encodeURIComponent(body)}`, { signal });
  if (!response.ok) {
    throw new Error(`Failed to load planetary references: HTTP ${response.status}`);
  }
  const data = await response.json();
  return data.references || [];
}

export async function fetchAnalogMatches(
  referenceId: string,
  limit: number = 15,
  signal?: AbortSignal
): Promise<{ reference: PlanetaryReferenceSite; target_body: PlanetaryBody; analog_candidates: AnalogMatchResult[] }> {
  const response = await fetch(
    `${BASE}/science/analog-matches?reference_id=${encodeURIComponent(referenceId)}&limit=${limit}`,
    { signal }
  );
  if (!response.ok) {
    throw new Error(`Failed to calculate Earth analogs: HTTP ${response.status}`);
  }
  return response.json();
}

export async function fetchLiveTerrain(
  latitude: number,
  longitude: number,
  spacingM: number = 1000,
  signal?: AbortSignal
): Promise<LiveDEMResponse> {
  const response = await fetch(
    `${BASE}/science/live-terrain?latitude=${latitude}&longitude=${longitude}&spacing_m=${spacingM}`,
    { signal }
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Live DEM interrogation error (${response.status}): ${errorText}`);
  }
  return response.json();
}

export async function fetchExperimentDomains(
  signal?: AbortSignal
): Promise<ExperimentDomainInfo[]> {
  const response = await fetch(`${BASE}/science/experiments`, { signal });
  if (!response.ok) {
    throw new Error(`Failed to load experiment domains: HTTP ${response.status}`);
  }
  return response.json();
}

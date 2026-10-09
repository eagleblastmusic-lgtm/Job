/** OSM data, map rendering, geocoding and routing are separate capabilities. */
export const OSM_ATTRIBUTION = Object.freeze({
  text: '© OpenStreetMap contributors', url: 'https://www.openstreetmap.org/copyright', license: 'ODbL-1.0'
});
export interface Coordinates { latitude: number; longitude: number }
export interface GeoProvenance { provider: string; datasetVersion: string; observedAt: string }
export interface MapDataProvider { attribution: typeof OSM_ATTRIBUTION; styleUrl: string; version: string }
export interface GeocodingProvider {
  search(query: string, signal: AbortSignal): Promise<Array<{ label: string; point: Coordinates; provenance: GeoProvenance }>>;
}
export interface RoutingProvider {
  route(from: Coordinates, to: Coordinates, mode: 'WALK' | 'BICYCLE' | 'CAR', signal: AbortSignal): Promise<{
    distanceMeters: number; durationSeconds: number; provenance: GeoProvenance;
  } | null>;
}
export function coordinates(value: unknown): Coordinates {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_COORDINATES');
  const { latitude, longitude } = value as Record<string, unknown>;
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || Math.abs(latitude) > 90
    || typeof longitude !== 'number' || !Number.isFinite(longitude) || Math.abs(longitude) > 180) throw new Error('INVALID_COORDINATES');
  return { latitude, longitude };
}
/** Spherical distance is explicitly not a route or a commute-time estimate. */
export function straightLineDistance(from: unknown, to: unknown) {
  const a = coordinates(from), b = coordinates(to), radians = (degrees: number) => degrees * Math.PI / 180;
  const h = Math.sin(radians(b.latitude - a.latitude) / 2) ** 2
    + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(radians(b.longitude - a.longitude) / 2) ** 2;
  return { distanceMeters: Math.round(6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))))),
    method: 'SPHERICAL_STRAIGHT_LINE_V1', routeDistanceMeters: null, commuteMinutes: null, transitFare: null };
}
export function geographyCapabilities() {
  return { dataBasis: 'OPENSTREETMAP', attribution: OSM_ATTRIBUTION, map: 'UNCONFIGURED', geocoding: 'UNCONFIGURED',
    routing: 'UNCONFIGURED', publicServiceRequestsEnabled: false, manualEconomicsAvailable: true };
}

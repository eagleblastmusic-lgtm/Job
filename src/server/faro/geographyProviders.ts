import { coordinates, OSM_ATTRIBUTION, type Coordinates, type GeoProvenance, type GeocodingProvider, type RoutingProvider } from '../../domain/faro/geography.js';

export interface GeographyProviderConfig {
  /** Operator-selected private/self-hosted origin. No endpoint comes from an HTTP body. */
  endpoint: string; provider: string; datasetVersion: string; userAgent: string;
  timeoutMs: number; minIntervalMs: number; maxDailyRequests: number;
}
type Transport = (url: URL, options: RequestInit) => Promise<Response>;
class GeographyError extends Error {}
const fail = (code: string): never => { throw new GeographyError(code); };
const machineToken = (value: unknown) => typeof value === 'string' && /^[A-Za-z0-9_.:/-]{1,120}$/.test(value);
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('GEO_INVALID_RESPONSE');
  return value as Record<string, unknown>;
}

/** Bounded transport, no retries, redirects, cookies, query logging or default public service. */
class GeographyTransport {
  readonly origin: URL;
  private readonly config: GeographyProviderConfig;
  private active = false;
  private lastAttempt = -Infinity;
  private day = '';
  private attempts = 0;
  constructor(config: GeographyProviderConfig, private readonly fetcher: Transport, private readonly now: () => number) {
    this.config = Object.freeze({ ...config });
    try { this.origin = new URL(config.endpoint); } catch { throw new GeographyError('GEO_CONFIGURATION'); }
    if (this.origin.protocol !== 'https:' || this.origin.username || this.origin.password || this.origin.search || this.origin.hash
      || !['', '/'].includes(this.origin.pathname)
      || ['nominatim.openstreetmap.org', 'router.project-osrm.org'].includes(this.origin.hostname.replace(/\.$/, ''))
      || !machineToken(config.provider) || !machineToken(config.datasetVersion)
      || typeof config.userAgent !== 'string' || !/^[\x20-\x7e]{5,200}$/.test(config.userAgent)
      || !Number.isSafeInteger(config.timeoutMs) || config.timeoutMs < 1 || config.timeoutMs > 10000
      || !Number.isSafeInteger(config.minIntervalMs) || config.minIntervalMs < 1000 || config.minIntervalMs > 3600000
      || !Number.isSafeInteger(config.maxDailyRequests) || config.maxDailyRequests < 1 || config.maxDailyRequests > 10000) fail('GEO_CONFIGURATION');
  }
  provenance(): GeoProvenance {
    return { provider: this.config.provider, datasetVersion: this.config.datasetVersion, observedAt: new Date(this.now()).toISOString() };
  }
  async json(url: URL, signal: AbortSignal): Promise<unknown> {
    if (signal.aborted) return fail('GEO_CANCELLED');
    const now = this.now(), day = new Date(now).toISOString().slice(0, 10);
    if (day !== this.day) { this.day = day; this.attempts = 0; }
    if (this.active || now - this.lastAttempt < this.config.minIntervalMs) return fail('GEO_RATE_LIMIT');
    if (this.attempts >= this.config.maxDailyRequests) return fail('GEO_DAILY_BUDGET');
    this.attempts++; this.lastAttempt = now; this.active = true;
    const controller = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let rejectDeadline: (error: Error) => void = () => {};
    const deadline = new Promise<never>((_resolve, reject) => { rejectDeadline = reject; });
    const abort = (code: string) => { controller.abort(); rejectDeadline(new GeographyError(code)); };
    const cancelled = () => abort('GEO_CANCELLED');
    signal.addEventListener('abort', cancelled, { once: true });
    const timer = setTimeout(() => abort('GEO_TIMEOUT'), this.config.timeoutMs);
    const work = async () => {
      const response = await this.fetcher(url, { method: 'GET', redirect: 'error', credentials: 'omit',
        headers: { accept: 'application/json', 'user-agent': this.config.userAgent }, signal: controller.signal });
      if (controller.signal.aborted || !response.ok) {
        void response.body?.cancel().catch(() => {});
        return fail(controller.signal.aborted ? 'GEO_CANCELLED' : response.status === 429 ? 'GEO_PROVIDER_RATE_LIMIT' : 'GEO_PROVIDER_UNAVAILABLE');
      }
      if (!response.body) return fail('GEO_INVALID_RESPONSE');
      reader = response.body.getReader();
      let bytes = 0; const chunks: Uint8Array[] = [];
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 65536) return fail('GEO_RESPONSE_TOO_LARGE');
        chunks.push(chunk.value);
      }
      try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown; } catch { return fail('GEO_INVALID_RESPONSE'); }
    };
    try { return await Promise.race([work(), deadline]); }
    catch (error) { if (error instanceof GeographyError) throw error; return fail('GEO_TRANSPORT'); }
    finally {
      clearTimeout(timer); signal.removeEventListener('abort', cancelled); controller.abort(); this.active = false;
      // Cleanup must never extend the response deadline if a transport is uncooperative.
      if (reader) void reader.cancel().catch(() => {});
    }
  }
}

/** Search is a deliberate submitted query, not autocomplete. Returned private fields are allowlisted. */
export class NominatimGeocoder implements GeocodingProvider {
  readonly attribution = OSM_ATTRIBUTION;
  private readonly transport: GeographyTransport;
  constructor(config: GeographyProviderConfig, fetcher: Transport = fetch, now: () => number = Date.now) { this.transport = new GeographyTransport(config, fetcher, now); }
  async search(query: string, signal: AbortSignal) {
    if (typeof query !== 'string' || query.trim().length < 2 || query.trim().length > 200 || /[\x00-\x1f\x7f]/.test(query)) return fail('GEO_INVALID_QUERY');
    const url = new URL('/search', this.transport.origin);
    url.search = new URLSearchParams({ q: query.trim(), format: 'jsonv2', limit: '5', countrycodes: 'pl', 'accept-language': 'pl', addressdetails: '0', extratags: '0', namedetails: '0' }).toString();
    const data = await this.transport.json(url, signal);
    if (!Array.isArray(data) || data.length > 5) return fail('GEO_INVALID_RESPONSE');
    return data.map(value => {
      const row = record(value);
      if (typeof row.display_name !== 'string' || !row.display_name.trim() || row.display_name.length > 500
        || /[\x00-\x1f\x7f]/.test(row.display_name)
        || typeof row.lat !== 'string' || typeof row.lon !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(row.lat) || !/^-?\d+(?:\.\d+)?$/.test(row.lon)) return fail('GEO_INVALID_RESPONSE');
      let point: Coordinates;
      try { point = coordinates({ latitude: Number(row.lat), longitude: Number(row.lon) }); } catch { return fail('GEO_INVALID_RESPONSE'); }
      return { label: row.display_name.trim(), point, provenance: this.transport.provenance() };
    });
  }
}

/** Profile names are operator-declared capabilities; CAR data never simulates a walking route. */
export class OsrmRouter implements RoutingProvider {
  readonly attribution = OSM_ATTRIBUTION;
  private readonly transport: GeographyTransport;
  private readonly profiles: Partial<Record<'WALK' | 'BICYCLE' | 'CAR', string>>;
  constructor(config: GeographyProviderConfig, profiles: Partial<Record<'WALK' | 'BICYCLE' | 'CAR', string>>, fetcher: Transport = fetch, now: () => number = Date.now) {
    if (!Object.keys(profiles).length || Object.entries(profiles).some(([mode, profile]) => !['WALK', 'BICYCLE', 'CAR'].includes(mode) || typeof profile !== 'string' || !/^[a-z0-9_-]{1,40}$/.test(profile))) fail('GEO_CONFIGURATION');
    this.profiles = { ...profiles }; this.transport = new GeographyTransport(config, fetcher, now);
  }
  async route(from: Coordinates, to: Coordinates, mode: 'WALK' | 'BICYCLE' | 'CAR', signal: AbortSignal) {
    let a: Coordinates, b: Coordinates;
    try { a = coordinates(from); b = coordinates(to); } catch { return fail('GEO_INVALID_COORDINATES'); }
    const profile = this.profiles[mode]; if (!profile) return fail('GEO_MODE_UNSUPPORTED');
    const url = new URL(`/route/v1/${profile}/${a.longitude},${a.latitude};${b.longitude},${b.latitude}`, this.transport.origin);
    url.search = new URLSearchParams({ overview: 'false', steps: 'false', alternatives: 'false' }).toString();
    const data = record(await this.transport.json(url, signal));
    if (data.code === 'NoRoute') return null;
    if (data.code !== 'Ok' || !Array.isArray(data.routes) || data.routes.length !== 1) return fail('GEO_INVALID_RESPONSE');
    const route = record(data.routes[0]);
    if (typeof route.distance !== 'number' || !Number.isFinite(route.distance) || route.distance < 0 || route.distance > 40075000
      || typeof route.duration !== 'number' || !Number.isFinite(route.duration) || route.duration < 0 || route.duration > 31536000) return fail('GEO_INVALID_RESPONSE');
    return { distanceMeters: route.distance, durationSeconds: route.duration, provenance: this.transport.provenance() };
  }
}

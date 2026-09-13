import type { JobDatabase } from './db.js';
import type { AppStore } from './store.js';
import { JobFeedService, JobSourceRegistryService } from './jobFeedService.js';
import type { JobSearchCriteria } from '../domain/jobSearch.js';
import { buildJobSearchProviders } from '../domain/jobSearch.js';
import type { JobSourceConnector, JobSourceHealth, JobSourceInput, JobSourceTermsMetadata, NormalizedSourceJob } from '../domain/jobSources.js';
import { normalizeSourceUrl } from '../domain/jobSources.js';
import {
  criteriaCacheKey,
  extractDetailLinks,
  extractJobPostingJsonLd,
  fallbackDetailToSourceInput,
  jobPostingToSourceInput,
  publicSourceKeys,
  type PublicJobBoardKey
} from '../domain/publicJobWeb.js';

export type LiveSourceRefreshStatus = 'IMPORTED' | 'NO_RESULTS' | 'BLOCKED' | 'FAILED' | 'DISABLED';

export interface LiveSourceRefreshResult {
  sourceKey: PublicJobBoardKey;
  status: LiveSourceRefreshStatus;
  fetchedCount: number;
  canonicalCount: number;
  message: string;
}

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

interface CacheEntry {
  expiresAt: number;
  items: JobSourceInput[];
}

const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_DETAIL_PAGES = 8;
const MAX_HTML_BYTES = 2_000_000;

class SourceBlockedError extends Error {}

function sourceLabel(key: PublicJobBoardKey): string {
  return ({
    pracuj: 'Pracuj.pl',
    rocketjobs: 'RocketJobs',
    justjoinit: 'Just Join IT',
    olx: 'OLX Praca',
    indeed: 'Indeed',
    linkedin: 'LinkedIn Jobs'
  } as const)[key];
}

function uniqueInputs(items: JobSourceInput[]): JobSourceInput[] {
  const seen = new Set<string>();
  const output: JobSourceInput[] = [];
  for (const item of items) {
    const key = item.externalId?.trim() || normalizeSourceUrl(item.sourceUrl) || item.rawText.slice(0, 500);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

async function responseTextBounded(response: Response): Promise<string> {
  const text = await response.text();
  return text.slice(0, MAX_HTML_BYTES);
}

class PublicWebJobConnector implements JobSourceConnector {
  readonly kind = 'PARTNERSHIP' as const;
  readonly label: string;
  private health: JobSourceHealth = { status: 'UNKNOWN', message: null, checkedAt: null };

  constructor(
    readonly key: PublicJobBoardKey,
    private readonly criteria: JobSearchCriteria,
    private readonly fetchImpl: FetchLike
  ) {
    this.label = sourceLabel(key);
  }

  async fetch(): Promise<JobSourceInput[]> {
    const cacheKey = criteriaCacheKey(this.key, this.criteria);
    const cached = CACHE.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      this.health = { status: 'HEALTHY', message: `Użyto cache publicznego źródła (${cached.items.length} ofert).`, checkedAt: new Date().toISOString() };
      return cached.items;
    }

    const provider = buildJobSearchProviders(this.criteria).find(item => item.key === this.key);
    if (!provider?.searchUrl) throw new Error(`Brak URL wyszukiwania dla źródła ${this.key}.`);
    const searchUrl = provider.searchUrl;

    try {
      const searchHtml = await this.fetchHtml(searchUrl);
      const directPostings = extractJobPostingJsonLd(searchHtml)
        .map(posting => jobPostingToSourceInput(posting, searchUrl))
        .filter((item): item is JobSourceInput => item !== null);

      const links = extractDetailLinks(searchHtml, searchUrl, this.key, MAX_DETAIL_PAGES);
      const detailResults = await Promise.allSettled(links.map(async link => {
        const html = await this.fetchHtml(link);
        const structured = extractJobPostingJsonLd(html)
          .map(posting => jobPostingToSourceInput(posting, link))
          .find((item): item is JobSourceInput => item !== null);
        return structured ?? fallbackDetailToSourceInput(html, link);
      }));
      const detailItems = detailResults
        .filter((result): result is PromiseFulfilledResult<JobSourceInput | null> => result.status === 'fulfilled')
        .map(result => result.value)
        .filter((item): item is JobSourceInput => item !== null);

      const items = uniqueInputs([...directPostings, ...detailItems]).slice(0, 20);
      CACHE.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, items });
      this.health = {
        status: items.length ? 'HEALTHY' : 'DEGRADED',
        message: items.length ? `Pobrano ${items.length} publicznych ofert.` : 'Źródło odpowiedziało, ale nie udało się wyodrębnić ofert z bieżącej struktury strony.',
        checkedAt: new Date().toISOString()
      };
      return items;
    } catch (error) {
      const checkedAt = new Date().toISOString();
      if (error instanceof SourceBlockedError) {
        this.health = { status: 'DEGRADED', message: error.message, checkedAt };
        throw error;
      }
      this.health = { status: 'DEGRADED', message: error instanceof Error ? error.message : 'Nieznany błąd źródła.', checkedAt };
      throw error;
    }
  }

  normalize(input: JobSourceInput): NormalizedSourceJob {
    return {
      rawText: input.rawText.trim().slice(0, 50_000),
      sourceUrl: normalizeSourceUrl(input.sourceUrl),
      externalId: input.externalId?.trim() || null,
      publishedAt: input.publishedAt?.trim() || null,
      provenance: this.provenance(input)
    };
  }

  provenance(input: JobSourceInput): Record<string, unknown> {
    return {
      connector: this.key,
      accessMode: 'PUBLIC_WEB_PAGE',
      sourceUrl: normalizeSourceUrl(input.sourceUrl),
      externalId: input.externalId?.trim() || null,
      query: this.criteria.query,
      location: this.criteria.location,
      radiusKm: this.criteria.radiusKm,
      fetchedAt: new Date().toISOString()
    };
  }

  termsMetadata(): JobSourceTermsMetadata {
    const provider = buildJobSearchProviders(this.criteria).find(item => item.key === this.key);
    return {
      basis: this.kind,
      referenceUrl: provider?.homepageUrl ?? null,
      notes: 'Automatyczny odczyt dotyczy wyłącznie publicznie dostępnych stron WWW, bez logowania, omijania CAPTCHA, obchodzenia limitów lub dostępu do prywatnych endpointów. Źródło może zostać wyłączone administracyjnie.',
      checkedAt: new Date().toISOString()
    };
  }

  healthStatus(): JobSourceHealth {
    return this.health;
  }

  private async fetchHtml(url: string): Promise<string> {
    const response = await this.fetchImpl(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(8_000),
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'pl-PL,pl;q=0.9,en;q=0.7',
        'user-agent': 'Mozilla/5.0 (compatible; JobCareerNavigator/0.1; public-job-indexer)'
      }
    });
    if ([401, 403, 429].includes(response.status)) throw new SourceBlockedError(`Źródło ${this.label} zablokowało automatyczny odczyt (HTTP ${response.status}). Job nie obchodzi tej blokady.`);
    if (!response.ok) throw new Error(`Źródło ${this.label} zwróciło HTTP ${response.status}.`);
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      throw new Error(`Źródło ${this.label} zwróciło nieobsługiwany typ danych: ${contentType}.`);
    }
    const html = await responseTextBounded(response);
    if (/captcha|verify you are human|access denied|robot check/i.test(html.slice(0, 30_000))) {
      throw new SourceBlockedError(`Źródło ${this.label} wymaga weryfikacji człowieka/CAPTCHA. Job nie próbuje jej omijać.`);
    }
    return html;
  }
}

export class PublicJobIngestionService {
  private readonly feed: JobFeedService;
  private readonly registry: JobSourceRegistryService;

  constructor(
    database: JobDatabase,
    store: AppStore,
    private readonly fetchImpl: FetchLike = fetch
  ) {
    this.feed = new JobFeedService(database, store);
    this.registry = new JobSourceRegistryService(database);
  }

  async refresh(userId: string, criteria: JobSearchCriteria): Promise<LiveSourceRefreshResult[]> {
    return Promise.all(publicSourceKeys().map(async sourceKey => {
      if (!this.registry.isEnabled(sourceKey)) {
        return { sourceKey, status: 'DISABLED', fetchedCount: 0, canonicalCount: 0, message: 'Źródło jest wyłączone administracyjnie.' } as const;
      }
      const connector = new PublicWebJobConnector(sourceKey, criteria, this.fetchImpl);
      try {
        const results = await this.feed.importFromConnector(userId, connector);
        const canonicalCount = results.filter(result => result.createdCanonicalJob).length;
        return {
          sourceKey,
          status: results.length ? 'IMPORTED' : 'NO_RESULTS',
          fetchedCount: results.length,
          canonicalCount,
          message: results.length ? `Pobrano ${results.length} ofert; ${canonicalCount} nowych po deduplikacji.` : 'Brak ofert do importu z bieżącej odpowiedzi źródła.'
        } as const;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Nieznany błąd źródła.';
        return {
          sourceKey,
          status: error instanceof SourceBlockedError ? 'BLOCKED' : 'FAILED',
          fetchedCount: 0,
          canonicalCount: 0,
          message
        } as const;
      }
    }));
  }
}

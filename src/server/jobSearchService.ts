import type { AppConfig } from './config.js';
import type { JobDatabase } from './db.js';
import type { AppStore } from './store.js';
import { JobFeedService, type JobFeedCard } from './jobFeedService.js';
import { PublicJobIngestionService, type LiveSourceRefreshResult } from './publicJobIngestionService.js';
import { JoobleJobIngestionService, type JoobleRefreshResult } from './joobleJobService.js';
import { buildJobSearchProviders, validateJobSearchCriteria, type JobSearchCriteria, type JobSearchProvider } from '../domain/jobSearch.js';
import { normalizeText } from '../domain/ontology.js';

export interface FederatedJobSearchResult {
  criteria: JobSearchCriteria;
  providers: JobSearchProvider[];
  localJobs: JobFeedCard[];
  sourceRefresh: Array<LiveSourceRefreshResult | JoobleRefreshResult>;
  externalSearchCount: number;
  automaticIngestionCount: number;
  importedCount: number;
  newCanonicalCount: number;
  boundary: string;
}

function matchesQuery(job: JobFeedCard, query: string): boolean {
  const haystack = normalizeText([job.title, job.company, job.location].filter(Boolean).join(' '));
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
  return tokens.length === 0 || tokens.every(token => haystack.includes(token));
}

function matchesLocation(job: JobFeedCard, location: string | null): boolean {
  if (!location) return true;
  const normalizedLocation = normalizeText(location);
  return normalizeText(job.location ?? '').includes(normalizedLocation);
}

export class JobSearchService {
  private readonly feed: JobFeedService;
  private readonly publicIngestion: PublicJobIngestionService;
  private readonly joobleIngestion: JoobleJobIngestionService;
  private readonly joobleApiConfigured: boolean;

  constructor(database: JobDatabase, store: AppStore, config: AppConfig) {
    this.feed = new JobFeedService(database, store);
    this.publicIngestion = new PublicJobIngestionService(database, store);
    this.joobleApiConfigured = Boolean(config.joobleApiKeyPl);
    this.joobleIngestion = new JoobleJobIngestionService(database, store, config.joobleApiKeyPl, config.joobleTimeoutMs);
  }

  async search(userId: string, input: JobSearchCriteria): Promise<FederatedJobSearchResult> {
    const criteria = validateJobSearchCriteria(input);
    const providers = buildJobSearchProviders(criteria, { joobleApiConfigured: this.joobleApiConfigured });
    const [joobleRefresh, publicRefresh] = await Promise.all([
      this.joobleIngestion.refresh(userId, criteria),
      this.publicIngestion.refresh(userId, criteria)
    ]);
    const sourceRefresh: Array<LiveSourceRefreshResult | JoobleRefreshResult> = [joobleRefresh, ...publicRefresh];
    const localJobs = this.feed.list(userId, 50, 0).filter(job => matchesQuery(job, criteria.query) && matchesLocation(job, criteria.location));
    const importedCount = sourceRefresh.reduce((sum, source) => sum + source.fetchedCount, 0);
    const newCanonicalCount = sourceRefresh.reduce((sum, source) => sum + source.canonicalCount, 0);
    return {
      criteria,
      providers,
      localJobs,
      sourceRefresh,
      externalSearchCount: providers.filter(provider => provider.searchUrl !== null).length,
      automaticIngestionCount: providers.filter(provider => provider.canIngestAutomatically).length,
      importedCount,
      newCanonicalCount,
      boundary: 'Job preferuje oficjalne API i dozwolone feedy, a wyniki ze wszystkich źródeł trafiają do jednej normalizacji i deduplikacji. Bezpośredni odczyt publicznych stron pozostaje dodatkowym kanałem fail-closed: 403, 429, CAPTCHA albo logowanie nie są obchodzone i nie zatrzymują wyników z oficjalnych źródeł.'
    };
  }
}

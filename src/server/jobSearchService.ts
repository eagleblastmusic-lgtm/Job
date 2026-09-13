import type { JobDatabase } from './db.js';
import type { AppStore } from './store.js';
import { JobFeedService, type JobFeedCard } from './jobFeedService.js';
import { PublicJobIngestionService, type LiveSourceRefreshResult } from './publicJobIngestionService.js';
import { buildJobSearchProviders, validateJobSearchCriteria, type JobSearchCriteria, type JobSearchProvider } from '../domain/jobSearch.js';
import { normalizeText } from '../domain/ontology.js';

export interface FederatedJobSearchResult {
  criteria: JobSearchCriteria;
  providers: JobSearchProvider[];
  localJobs: JobFeedCard[];
  sourceRefresh: LiveSourceRefreshResult[];
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
  private readonly ingestion: PublicJobIngestionService;

  constructor(database: JobDatabase, store: AppStore) {
    this.feed = new JobFeedService(database, store);
    this.ingestion = new PublicJobIngestionService(database, store);
  }

  async search(userId: string, input: JobSearchCriteria): Promise<FederatedJobSearchResult> {
    const criteria = validateJobSearchCriteria(input);
    const providers = buildJobSearchProviders(criteria);
    const sourceRefresh = await this.ingestion.refresh(userId, criteria);
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
      boundary: 'Job automatycznie próbuje pobrać publiczne oferty z każdego aktywnego źródła, normalizuje je i przepuszcza przez istniejącą deduplikację. Jeśli serwis zwraca blokadę, CAPTCHA lub wymaga logowania, to źródło zostaje pominięte bez obchodzenia zabezpieczeń; pozostałe źródła nadal działają.'
    };
  }
}

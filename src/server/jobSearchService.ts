import type { JobDatabase } from './db.js';
import type { AppStore } from './store.js';
import { JobFeedService, type JobFeedCard } from './jobFeedService.js';
import { buildJobSearchProviders, validateJobSearchCriteria, type JobSearchCriteria, type JobSearchProvider } from '../domain/jobSearch.js';
import { normalizeText } from '../domain/ontology.js';

export interface FederatedJobSearchResult {
  criteria: JobSearchCriteria;
  providers: JobSearchProvider[];
  localJobs: JobFeedCard[];
  externalSearchCount: number;
  automaticIngestionCount: number;
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

  constructor(database: JobDatabase, store: AppStore) {
    this.feed = new JobFeedService(database, store);
  }

  search(userId: string, input: JobSearchCriteria): FederatedJobSearchResult {
    const criteria = validateJobSearchCriteria(input);
    const providers = buildJobSearchProviders(criteria);
    const localJobs = this.feed.list(userId, 50, 0).filter(job => matchesQuery(job, criteria.query) && matchesLocation(job, criteria.location));
    return {
      criteria,
      providers,
      localJobs,
      externalSearchCount: providers.filter(provider => provider.searchUrl !== null).length,
      automaticIngestionCount: providers.filter(provider => provider.canIngestAutomatically).length,
      boundary: 'Wyniki zapisane już w Job są filtrowane lokalnie. Zewnętrzne serwisy są otwierane przez oficjalne wyszukiwarki; automatyczne pobieranie pozostaje wyłączone bez potwierdzonego API, feedu, licencji albo zgody.'
    };
  }
}

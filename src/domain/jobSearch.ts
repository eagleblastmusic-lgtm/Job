export type JobSearchProviderKey = 'pracuj' | 'linkedin' | 'olx' | 'indeed' | 'rocketjobs' | 'justjoinit' | 'employer_careers';
export type JobSearchMode = 'OUTBOUND_SEARCH' | 'DIRECT_CAREER_PAGES';
export type JobIngestionStatus = 'PARTNER_REQUIRED' | 'PERMITTED_SOURCE_REQUIRED';

export interface JobSearchCriteria {
  query: string;
  location: string | null;
  radiusKm: number | null;
}

export interface JobSearchProvider {
  key: JobSearchProviderKey;
  label: string;
  homepageUrl: string;
  searchMode: JobSearchMode;
  ingestionStatus: JobIngestionStatus;
  searchUrl: string | null;
  canIngestAutomatically: boolean;
  notes: string;
  checkedAt: string;
}

interface ProviderDefinition {
  key: JobSearchProviderKey;
  label: string;
  homepageUrl: string;
  searchMode: JobSearchMode;
  ingestionStatus: JobIngestionStatus;
  notes: string;
  checkedAt: string;
  buildSearchUrl: (criteria: JobSearchCriteria) => string | null;
}

const CHECKED_AT = '2026-09-13';

function urlWithParams(base: string, params: Record<string, string | number | null>): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && String(value).trim()) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function pathToken(value: string): string {
  return encodeURIComponent(value.trim().replace(/\s+/g, '-'));
}

function pracujUrl(criteria: JobSearchCriteria): string {
  const keyword = pathToken(criteria.query);
  const location = criteria.location ? `/${pathToken(criteria.location)};wp` : '';
  return `https://www.pracuj.pl/praca/${keyword};kw${location}`;
}

function linkedinUrl(criteria: JobSearchCriteria): string {
  return urlWithParams('https://www.linkedin.com/jobs/search/', {
    keywords: criteria.query,
    location: criteria.location,
    distance: criteria.radiusKm
  });
}

function olxUrl(criteria: JobSearchCriteria): string {
  const keyword = pathToken(criteria.query).toLowerCase();
  const url = new URL(`https://www.olx.pl/praca/q-${keyword}/`);
  if (criteria.radiusKm !== null) url.searchParams.set('search[dist]', String(criteria.radiusKm));
  return url.toString();
}

function indeedUrl(criteria: JobSearchCriteria): string {
  return urlWithParams('https://pl.indeed.com/jobs', {
    q: criteria.query,
    l: criteria.location,
    radius: criteria.radiusKm
  });
}

function rocketJobsUrl(criteria: JobSearchCriteria): string {
  return urlWithParams('https://rocketjobs.pl/', {
    keyword: criteria.query,
    location: criteria.location
  });
}

function justJoinItUrl(criteria: JobSearchCriteria): string {
  return urlWithParams('https://justjoin.it/job-offers/all-locations', {
    keyword: criteria.query
  });
}

const DEFINITIONS: readonly ProviderDefinition[] = [
  {
    key: 'pracuj',
    label: 'Pracuj.pl',
    homepageUrl: 'https://www.pracuj.pl/',
    searchMode: 'OUTBOUND_SEARCH',
    ingestionStatus: 'PARTNER_REQUIRED',
    notes: 'Wyszukiwanie otwiera oficjalny serwis. Automatyczny import wymaga uzgodnionego, dozwolonego kanału danych; aplikacja nie uruchamia nieautoryzowanego scrapingu.',
    checkedAt: CHECKED_AT,
    buildSearchUrl: pracujUrl
  },
  {
    key: 'linkedin',
    label: 'LinkedIn Jobs',
    homepageUrl: 'https://www.linkedin.com/jobs/',
    searchMode: 'OUTBOUND_SEARCH',
    ingestionStatus: 'PARTNER_REQUIRED',
    notes: 'LinkedIn ogranicza Jobs API do zatwierdzonych integracji partnerskich. W Job dostępne jest bezpieczne wyszukiwanie wychodzące do serwisu.',
    checkedAt: CHECKED_AT,
    buildSearchUrl: linkedinUrl
  },
  {
    key: 'olx',
    label: 'OLX Praca',
    homepageUrl: 'https://www.olx.pl/praca/',
    searchMode: 'OUTBOUND_SEARCH',
    ingestionStatus: 'PARTNER_REQUIRED',
    notes: 'OLX Developer API wymaga zatwierdzenia aplikacji, a publiczne API nie służy do pobierania ogłoszeń innych użytkowników. Job nie obchodzi tego ograniczenia.',
    checkedAt: CHECKED_AT,
    buildSearchUrl: olxUrl
  },
  {
    key: 'indeed',
    label: 'Indeed',
    homepageUrl: 'https://pl.indeed.com/',
    searchMode: 'OUTBOUND_SEARCH',
    ingestionStatus: 'PARTNER_REQUIRED',
    notes: 'Automatyczna integracja jest przeznaczona dla partnerów Indeed. Do czasu uzyskania dostępu Job kieruje użytkownika do oficjalnego wyszukiwania.',
    checkedAt: CHECKED_AT,
    buildSearchUrl: indeedUrl
  },
  {
    key: 'rocketjobs',
    label: 'RocketJobs',
    homepageUrl: 'https://rocketjobs.pl/',
    searchMode: 'OUTBOUND_SEARCH',
    ingestionStatus: 'PARTNER_REQUIRED',
    notes: 'Źródło jest obecne w federated search. Automatyczny import pozostaje wyłączony do czasu potwierdzenia dozwolonego feedu/API lub partnerstwa.',
    checkedAt: CHECKED_AT,
    buildSearchUrl: rocketJobsUrl
  },
  {
    key: 'justjoinit',
    label: 'Just Join IT',
    homepageUrl: 'https://justjoin.it/',
    searchMode: 'OUTBOUND_SEARCH',
    ingestionStatus: 'PARTNER_REQUIRED',
    notes: 'Źródło jest obecne w federated search. Automatyczny import pozostaje wyłączony do czasu potwierdzenia dozwolonego feedu/API lub partnerstwa.',
    checkedAt: CHECKED_AT,
    buildSearchUrl: justJoinItUrl
  },
  {
    key: 'employer_careers',
    label: 'Strony karier pracodawców',
    homepageUrl: 'about:blank',
    searchMode: 'DIRECT_CAREER_PAGES',
    ingestionStatus: 'PERMITTED_SOURCE_REQUIRED',
    notes: 'Docelowo obejmuje bezpośrednie strony karier dodane do jawnej allowlisty, gdy regulamin/zgoda pozwala na pobieranie. Brak automatycznego skanowania całego internetu.',
    checkedAt: CHECKED_AT,
    buildSearchUrl: () => null
  }
] as const;

export function validateJobSearchCriteria(input: JobSearchCriteria): JobSearchCriteria {
  const query = input.query.trim();
  if (query.length < 2 || query.length > 120) throw new Error('Fraza wyszukiwania musi mieć od 2 do 120 znaków.');
  const location = input.location?.trim() || null;
  if (location && location.length > 120) throw new Error('Lokalizacja może mieć maksymalnie 120 znaków.');
  const radiusKm = input.radiusKm === null ? null : Math.floor(input.radiusKm);
  if (radiusKm !== null && (!Number.isFinite(radiusKm) || radiusKm < 0 || radiusKm > 300)) throw new Error('Promień wyszukiwania musi mieścić się w zakresie 0–300 km.');
  return { query, location, radiusKm };
}

export function buildJobSearchProviders(input: JobSearchCriteria): JobSearchProvider[] {
  const criteria = validateJobSearchCriteria(input);
  return DEFINITIONS.map(definition => ({
    key: definition.key,
    label: definition.label,
    homepageUrl: definition.homepageUrl,
    searchMode: definition.searchMode,
    ingestionStatus: definition.ingestionStatus,
    searchUrl: definition.buildSearchUrl(criteria),
    canIngestAutomatically: false,
    notes: definition.notes,
    checkedAt: definition.checkedAt
  }));
}

export function jobSearchProviderKeys(): JobSearchProviderKey[] {
  return DEFINITIONS.map(definition => definition.key);
}

import type { JobSourceInput } from './jobSources.js';
import type { JobSearchCriteria, JobSearchProviderKey } from './jobSearch.js';

export type PublicJobBoardKey = Exclude<JobSearchProviderKey, 'employer_careers'>;

const ENTITY_MAP: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' '
};

function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos|nbsp);/gi, (_match, token: string) => {
    const named = ENTITY_MAP[token.toLowerCase()];
    if (named !== undefined) return named;
    if (token.startsWith('#x') || token.startsWith('#X')) {
      const code = Number.parseInt(token.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    }
    if (token.startsWith('#')) {
      const code = Number.parseInt(token.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    }
    return '';
  });
}

export function htmlToText(value: string): string {
  return decodeEntities(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function jobPostingType(value: unknown): boolean {
  if (typeof value === 'string') return value.toLowerCase() === 'jobposting';
  return Array.isArray(value) && value.some(item => typeof item === 'string' && item.toLowerCase() === 'jobposting');
}

function collectJobPostings(value: unknown, output: Array<Record<string, unknown>>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectJobPostings(item, output);
    return;
  }
  const object = objectValue(value);
  if (!object) return;
  if (jobPostingType(object['@type'])) output.push(object);
  if (object['@graph'] !== undefined) collectJobPostings(object['@graph'], output);
}

export function extractJobPostingJsonLd(html: string): Array<Record<string, unknown>> {
  const output: Array<Record<string, unknown>> = [];
  const pattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      collectJobPostings(JSON.parse(raw) as unknown, output);
    } catch {
      // Invalid JSON-LD from one script must not break the source refresh.
    }
  }
  return output;
}

function locationText(value: unknown): string | null {
  const values = Array.isArray(value) ? value : [value];
  const locations: string[] = [];
  for (const item of values) {
    const location = objectValue(item);
    if (!location) continue;
    const address = objectValue(location.address) ?? location;
    const parts = [address.addressLocality, address.addressRegion, address.addressCountry]
      .map(stringValue)
      .filter((part): part is string => Boolean(part));
    if (parts.length) locations.push(parts.join(', '));
  }
  return locations.length ? [...new Set(locations)].join(' / ') : null;
}

function companyText(value: unknown): string | null {
  const organization = objectValue(value);
  return organization ? stringValue(organization.name) : stringValue(value);
}

function salaryText(value: unknown): string | null {
  const salary = objectValue(value);
  if (!salary) return stringValue(value);
  const currency = stringValue(salary.currency) ?? '';
  const nested = objectValue(salary.value);
  const min = nested?.minValue ?? salary.minValue;
  const max = nested?.maxValue ?? salary.maxValue;
  const unit = stringValue(nested?.unitText ?? salary.unitText) ?? '';
  if (typeof min === 'number' || typeof max === 'number' || typeof min === 'string' || typeof max === 'string') {
    const range = min !== undefined && max !== undefined ? `${String(min)}-${String(max)}` : String(min ?? max ?? '');
    return [range, currency, unit].filter(Boolean).join(' ');
  }
  return null;
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(stringValue).filter((item): item is string => Boolean(item));
  const single = stringValue(value);
  return single ? [single] : [];
}

function postingUrl(posting: Record<string, unknown>, fallback: string): string {
  return stringValue(posting.url) ?? stringValue(posting.sameAs) ?? fallback;
}

function postingId(posting: Record<string, unknown>, sourceUrl: string): string | null {
  const identifier = objectValue(posting.identifier);
  const explicit = identifier ? stringValue(identifier.value) ?? stringValue(identifier.name) : stringValue(posting.identifier);
  if (explicit) return explicit;
  try {
    const url = new URL(sourceUrl);
    return url.pathname.split('/').filter(Boolean).at(-1) ?? null;
  } catch {
    return null;
  }
}

export function jobPostingToSourceInput(posting: Record<string, unknown>, fallbackUrl: string): JobSourceInput | null {
  const title = stringValue(posting.title) ?? stringValue(posting.name);
  const company = companyText(posting.hiringOrganization);
  if (!title && !company) return null;
  const sourceUrl = postingUrl(posting, fallbackUrl);
  const description = htmlToText(stringValue(posting.description) ?? '');
  const responsibilities = htmlToText(stringValue(posting.responsibilities) ?? '');
  const qualifications = htmlToText(stringValue(posting.qualifications) ?? '');
  const skills = stringList(posting.skills).join(', ');
  const employment = stringList(posting.employmentType).join(', ');
  const location = locationText(posting.jobLocation);
  const salary = salaryText(posting.baseSalary);
  const rawText = [
    title ? `Stanowisko: ${title}` : null,
    company ? `Firma: ${company}` : null,
    location ? `Miejsce pracy: ${location}` : null,
    employment ? `Rodzaj zatrudnienia: ${employment}` : null,
    salary ? `Wynagrodzenie: ${salary}` : null,
    skills ? `Umiejętności: ${skills}` : null,
    qualifications ? `Wymagania: ${qualifications}` : null,
    responsibilities ? `Obowiązki: ${responsibilities}` : null,
    description ? `Opis: ${description}` : null
  ].filter((line): line is string => Boolean(line)).join('\n').slice(0, 50_000);
  if (rawText.length < 20) return null;
  return {
    rawText,
    sourceUrl,
    externalId: postingId(posting, sourceUrl),
    publishedAt: stringValue(posting.datePosted)
  };
}

export function fallbackDetailToSourceInput(html: string, sourceUrl: string): JobSourceInput | null {
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const descriptionMatch = /<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i.exec(html)
    ?? /<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i.exec(html);
  const title = titleMatch?.[1] ? htmlToText(titleMatch[1]) : '';
  const description = descriptionMatch?.[1] ? decodeEntities(descriptionMatch[1]) : '';
  const body = htmlToText(html).slice(0, 25_000);
  const rawText = [`Stanowisko/oferta: ${title}`, description ? `Opis skrócony: ${description}` : '', body]
    .filter(Boolean)
    .join('\n')
    .slice(0, 50_000);
  if (rawText.length < 120) return null;
  return { rawText, sourceUrl, externalId: sourceUrl.split('/').filter(Boolean).at(-1) ?? null, publishedAt: null };
}

function canonicalLink(raw: string, baseUrl: string): string | null {
  const decoded = decodeEntities(raw.trim());
  if (!decoded || decoded.startsWith('#') || decoded.startsWith('javascript:') || decoded.startsWith('mailto:')) return null;
  try {
    const url = new URL(decoded, baseUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function isDetailUrl(source: PublicJobBoardKey, value: string): boolean {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();
  if (source === 'pracuj') return host.endsWith('pracuj.pl') && path.startsWith('/praca/') && path.includes('oferta');
  if (source === 'rocketjobs') return host.endsWith('rocketjobs.pl') && path.startsWith('/oferta-pracy/');
  if (source === 'justjoinit') return host.endsWith('justjoin.it') && path.startsWith('/job-offer/');
  if (source === 'olx') return host.endsWith('olx.pl') && path.includes('/d/oferta/');
  if (source === 'indeed') return host.endsWith('indeed.com') && (path.includes('/viewjob') || url.searchParams.has('jk'));
  return host.endsWith('linkedin.com') && path.includes('/jobs/view/');
}

export function extractDetailLinks(html: string, baseUrl: string, source: PublicJobBoardKey, limit = 8): string[] {
  const links: string[] = [];
  const seen = new Set<string>();
  const pattern = /<a\b[^>]*href\s*=\s*(["'])(.*?)\1/gi;
  for (const match of html.matchAll(pattern)) {
    const raw = match[2];
    if (!raw) continue;
    const link = canonicalLink(raw, baseUrl);
    if (!link || seen.has(link) || !isDetailUrl(source, link)) continue;
    seen.add(link);
    links.push(link);
    if (links.length >= limit) break;
  }
  return links;
}

export function publicSourceKeys(): PublicJobBoardKey[] {
  return ['pracuj', 'rocketjobs', 'justjoinit', 'olx', 'indeed', 'linkedin'];
}

export function criteriaCacheKey(source: PublicJobBoardKey, criteria: JobSearchCriteria): string {
  return `${source}|${criteria.query.trim().toLowerCase()}|${criteria.location?.trim().toLowerCase() ?? ''}|${criteria.radiusKm ?? ''}`;
}

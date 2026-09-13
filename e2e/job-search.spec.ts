import { test, expect, type Page } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

async function mockAuthenticatedUser(page: Page): Promise<void> {
  await page.route('**/api/me', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      user: { id: 'search-ui-user', email: 'search-ui@example.pl', name: 'Tester Search', role: 'USER', locale: 'pl-PL', timezone: 'Europe/Warsaw' },
      profile: { desiredRoles: ['magazynier'], location: 'Puck', commuteKm: 30, remotePreferences: ['ONSITE'], salaryMin: 5500, contractPreferences: ['UOP'], shiftPreferences: { nights: null, weekends: null }, availability: 'od zaraz' },
      subscription: { plan: 'TRIAL', status: 'TRIALING' }
    })
  }));
  await page.route('**/api/career-truth', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ facts: [], experiences: [], education: [] }) }));
  await page.route('**/api/features', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ features: { job_feed: true, today: false, notifications: false, interview_pack: false, bottleneck: false, local_labour: false, effective_wage: false, skill_roi: false, just_in_time_learning: false, career_transition: false, outcome_inbox: false, strategy_engine: false } })
  }));
}

test('job search auto-imports source results, pre-fills Career Truth and shows per-source health', async ({ page }) => {
  await mockAuthenticatedUser(page);
  await page.route('**/api/job-feed**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ jobs: [], limit: 25, offset: 0 }) }));
  const autoProvider = (key: string, label: string, searchUrl: string) => ({
    key, label, homepageUrl: searchUrl, searchMode: 'AUTO_IMPORT', ingestionStatus: 'PUBLIC_WEB_ACTIVE', searchUrl,
    canIngestAutomatically: true, notes: 'Automatyczny odczyt publicznych stron.', checkedAt: '2026-09-13'
  });
  const providers = [
    autoProvider('pracuj', 'Pracuj.pl', 'https://www.pracuj.pl/praca/magazynier;kw/Puck;wp'),
    autoProvider('linkedin', 'LinkedIn Jobs', 'https://www.linkedin.com/jobs/search/?keywords=magazynier&location=Puck&distance=30'),
    autoProvider('olx', 'OLX Praca', 'https://www.olx.pl/praca/puck/q-magazynier/'),
    autoProvider('indeed', 'Indeed', 'https://pl.indeed.com/jobs?q=magazynier&l=Puck&radius=30'),
    autoProvider('rocketjobs', 'RocketJobs', 'https://rocketjobs.pl/oferty-pracy/wszystkie-lokalizacje?keyword=magazynier&location=Puck'),
    autoProvider('justjoinit', 'Just Join IT', 'https://justjoin.it/job-offers/all-locations?q=magazynier%40keyword'),
    { key: 'employer_careers', label: 'Strony karier pracodawców', homepageUrl: 'about:blank', searchMode: 'DIRECT_CAREER_PAGES', ingestionStatus: 'PERMITTED_SOURCE_REQUIRED', searchUrl: null, canIngestAutomatically: false, notes: 'Tylko jawnie dozwolone źródła.', checkedAt: '2026-09-13' }
  ];
  const sourceRefresh = [
    { sourceKey: 'pracuj', status: 'IMPORTED', fetchedCount: 8, canonicalCount: 5, message: 'Pobrano 8 ofert; 5 nowych po deduplikacji.' },
    { sourceKey: 'linkedin', status: 'BLOCKED', fetchedCount: 0, canonicalCount: 0, message: 'Źródło LinkedIn Jobs zablokowało automatyczny odczyt (HTTP 403).' },
    { sourceKey: 'olx', status: 'NO_RESULTS', fetchedCount: 0, canonicalCount: 0, message: 'Brak ofert do importu z bieżącej odpowiedzi źródła.' },
    { sourceKey: 'indeed', status: 'FAILED', fetchedCount: 0, canonicalCount: 0, message: 'Źródło Indeed zwróciło HTTP 503.' },
    { sourceKey: 'rocketjobs', status: 'IMPORTED', fetchedCount: 7, canonicalCount: 4, message: 'Pobrano 7 ofert; 4 nowych po deduplikacji.' },
    { sourceKey: 'justjoinit', status: 'IMPORTED', fetchedCount: 6, canonicalCount: 3, message: 'Pobrano 6 ofert; 3 nowe po deduplikacji.' }
  ];
  await page.route('**/api/job-search**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      criteria: { query: 'magazynier', location: 'Puck', radiusKm: 30 },
      providers,
      localJobs: [{ jobId: 'job-1', title: 'Magazynier', company: 'Port Logistics', location: 'Puck', sourceKeys: ['pracuj', 'rocketjobs'], sourceUrl: 'https://jobs.example.pl/puck', freshness: '2026-09-13T08:00:00.000Z', decisionState: { recommendation: 'APPLY', override: null } }],
      sourceRefresh,
      externalSearchCount: 6,
      automaticIngestionCount: 6,
      importedCount: 21,
      newCanonicalCount: 12,
      boundary: 'Job automatycznie próbuje pobrać publiczne oferty; źródła z blokadą są pomijane bez obchodzenia zabezpieczeń.'
    })
  }));

  await page.goto('/');
  await expect(page.locator('#appView')).not.toHaveClass(/hidden/);
  await page.locator('[data-view="job-search"]:visible').first().click();
  await expect(page.getByRole('heading', { name: 'Wyszukiwarka ofert' })).toBeVisible();
  await expect(page.locator('#federatedSearchForm input[name="q"]')).toHaveValue('magazynier');
  await expect(page.locator('#federatedSearchForm input[name="location"]')).toHaveValue('Puck');
  await expect(page.locator('#federatedSearchForm input[name="radiusKm"]')).toHaveValue('30');
  await page.getByRole('button', { name: 'Pobierz oferty ze wszystkich źródeł' }).click();

  await expect(page.locator('#jobSearchSummary')).toContainText('pobrano 21 rekordów');
  await expect(page.locator('#jobSearchSummary')).toContainText('12 nowych po deduplikacji');
  await expect(page.locator('#jobSearchProviders')).toContainText('Pracuj.pl');
  await expect(page.locator('#jobSearchProviders')).toContainText('pobrano 8');
  await expect(page.locator('#jobSearchProviders')).toContainText('LinkedIn Jobs');
  await expect(page.locator('#jobSearchProviders')).toContainText('źródło blokuje odczyt');
  await expect(page.locator('#jobSearchProviders')).toContainText('RocketJobs');
  await expect(page.locator('#jobSearchProviders')).toContainText('Just Join IT');
  await expect(page.locator('#jobSearchProviders')).toContainText('Strony karier pracodawców');
  await expect(page.locator('#jobSearchLocalJobs')).toContainText('Port Logistics');
  await expect(page.locator('#jobSearchLocalJobs')).toContainText('pracuj, rocketjobs');

  const results = await new AxeBuilder({ page }).include('[data-screen="job-search"]').analyze();
  expect(results.violations).toEqual([]);
});

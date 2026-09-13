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

test('federated search shows all providers, pre-fills Career Truth and exposes honest integration boundaries', async ({ page }) => {
  await mockAuthenticatedUser(page);
  await page.route('**/api/job-feed**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ jobs: [], limit: 25, offset: 0 }) }));
  await page.route('**/api/job-search**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      criteria: { query: 'magazynier', location: 'Puck', radiusKm: 30 },
      providers: [
        ['pracuj', 'Pracuj.pl', 'https://www.pracuj.pl/praca/magazynier;kw/Puck;wp'],
        ['linkedin', 'LinkedIn Jobs', 'https://www.linkedin.com/jobs/search/?keywords=magazynier&location=Puck&distance=30'],
        ['olx', 'OLX Praca', 'https://www.olx.pl/praca/q-magazynier/'],
        ['indeed', 'Indeed', 'https://pl.indeed.com/jobs?q=magazynier&l=Puck&radius=30'],
        ['rocketjobs', 'RocketJobs', 'https://rocketjobs.pl/?keyword=magazynier&location=Puck'],
        ['justjoinit', 'Just Join IT', 'https://justjoin.it/job-offers/all-locations?keyword=magazynier']
      ].map(([key, label, searchUrl]) => ({ key, label, homepageUrl: searchUrl, searchMode: 'OUTBOUND_SEARCH', ingestionStatus: 'PARTNER_REQUIRED', searchUrl, canIngestAutomatically: false, notes: 'Import wymaga potwierdzonego dostępu.', checkedAt: '2026-09-13' })).concat([{ key: 'employer_careers', label: 'Strony karier pracodawców', homepageUrl: 'about:blank', searchMode: 'DIRECT_CAREER_PAGES', ingestionStatus: 'PERMITTED_SOURCE_REQUIRED', searchUrl: null, canIngestAutomatically: false, notes: 'Tylko jawnie dozwolone źródła.', checkedAt: '2026-09-13' }]),
      localJobs: [{ jobId: 'job-1', title: 'Magazynier', company: 'Port Logistics', location: 'Puck', sourceKeys: ['user_provided'], sourceUrl: 'https://jobs.example.pl/puck', freshness: '2026-09-13T08:00:00.000Z', decisionState: { recommendation: 'APPLY', override: null } }],
      externalSearchCount: 6,
      automaticIngestionCount: 0,
      boundary: 'Zewnętrzne serwisy są otwierane przez oficjalne wyszukiwarki; automatyczne pobieranie wymaga potwierdzonego dostępu.'
    })
  }));

  await page.goto('/');
  await expect(page.locator('#appView')).not.toHaveClass(/hidden/);
  await page.locator('[data-view="job-search"]:visible').first().click();
  await expect(page.getByRole('heading', { name: 'Wyszukiwarka ofert' })).toBeVisible();
  await expect(page.locator('#federatedSearchForm input[name="q"]')).toHaveValue('magazynier');
  await expect(page.locator('#federatedSearchForm input[name="location"]')).toHaveValue('Puck');
  await expect(page.locator('#federatedSearchForm input[name="radiusKm"]')).toHaveValue('30');
  await page.getByRole('button', { name: 'Szukaj we wszystkich źródłach' }).click();

  await expect(page.locator('#jobSearchProviders')).toContainText('Pracuj.pl');
  await expect(page.locator('#jobSearchProviders')).toContainText('LinkedIn Jobs');
  await expect(page.locator('#jobSearchProviders')).toContainText('OLX Praca');
  await expect(page.locator('#jobSearchProviders')).toContainText('Indeed');
  await expect(page.locator('#jobSearchProviders')).toContainText('RocketJobs');
  await expect(page.locator('#jobSearchProviders')).toContainText('Just Join IT');
  await expect(page.locator('#jobSearchProviders')).toContainText('Strony karier pracodawców');
  await expect(page.locator('#jobSearchProviders')).toContainText('import wymaga partnerstwa/API');
  await expect(page.locator('#jobSearchLocalJobs')).toContainText('Port Logistics');
  await expect(page.locator('#jobSearchSummary')).toContainText('6 gotowych wyszukiwań zewnętrznych');

  const results = await new AxeBuilder({ page }).include('[data-screen="job-search"]').analyze();
  expect(results.violations).toEqual([]);
});

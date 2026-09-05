import { test, expect } from '@playwright/test';

const uniqueEmail = (prefix: string): string => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.pl`;

async function register(page: import('@playwright/test').Page, email: string, name: string): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Załóż konto', exact: true }).click();
  await page.locator('#registerForm input[name="name"]').fill(name);
  await page.locator('#registerForm input[name="email"]').fill(email);
  await page.locator('#registerForm input[name="password"]').fill('Bezpieczne123');
  await page.locator('#registerForm input[name="acceptTerms"]').check();
  await page.locator('#registerForm input[name="acceptPrivacy"]').check();
  await page.locator('#registerForm').getByRole('button', { name: /Załóż konto i rozpocznij/ }).click();
  await expect(page.locator('#appView')).not.toHaveClass(/hidden/);
  await expect(page.locator('#welcomeTitle')).toContainText(name);
}

test('critical user flow reaches Decision Card, application and outcome', async ({ page }) => {
  await register(page, uniqueEmail('browser-flow'), 'Anna Testowa');

  await page.locator('[data-view="profile"]:visible').first().click();
  await page.locator('#profileForm input[name="desiredRoles"]').fill('magazynier');
  await page.locator('#profileForm input[name="location"]').fill('Gdynia');
  await page.locator('#profileForm input[name="commuteKm"]').fill('25');
  await page.locator('#profileForm input[name="salaryMin"]').fill('5500');
  await page.locator('#profileForm input[name="contract"][value="UOP"]').check();
  await page.locator('#profileForm input[name="remote"][value="ONSITE"]').check();
  await page.getByRole('button', { name: 'Zapisz profil' }).click();

  await page.locator('#factForm select[name="type"]').selectOption('CREDENTIAL');
  await page.locator('#factForm input[name="value"]').fill('UDT');
  await page.locator('#factForm').getByRole('button', { name: 'Dodaj jako potwierdzone' }).click();
  await expect(page.locator('#factsList')).toContainText('UDT');

  await page.locator('[data-view="job"]:visible').first().click();
  await page.locator('#jobForm textarea[name="text"]').fill('Magazynier\nFirma: Logistyka ABC\nMiejsce pracy: Gdynia\nUmowa o pracę\nWynagrodzenie 6000 - 7000 PLN brutto\nWymagania: UDT. Mile widziane WMS.\nPraca stacjonarna.');
  await page.getByRole('button', { name: 'Sprawdź, czy warto aplikować' }).click();
  await expect(page.locator('#decisionArea')).toContainText(/WARTO APLIKOWAĆ|APLIKUJ TERAZ|ROZWAŻ/);
  await expect(page.locator('#decisionArea')).toContainText('UDT');

  await page.getByRole('button', { name: 'Przygotuj aplikację' }).click();
  await expect(page.locator('#packageArea')).toContainText('Logistyka ABC');
  await expect(page.getByRole('link', { name: 'Pobierz CV PDF' })).toHaveAttribute('href', /\/api\/cv\/base\.pdf/);
  await page.getByRole('button', { name: 'Oznacz jako wysłane' }).click();

  await expect(page.locator('[data-screen="applications"]')).not.toHaveClass(/hidden/);
  const outcome = page.locator('[data-outcome]').first();
  await outcome.selectOption('INTERVIEW');
  await expect(page.locator('#toast')).toContainText('Wynik zapisany');
});

test('required consents block registration until explicitly accepted and optional analytics can be changed', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Załóż konto', exact: true }).click();
  await page.locator('#registerForm input[name="name"]').fill('Zofia Zgoda');
  await page.locator('#registerForm input[name="email"]').fill(uniqueEmail('consent'));
  await page.locator('#registerForm input[name="password"]').fill('Bezpieczne123');
  await page.locator('#registerForm').getByRole('button', { name: /Załóż konto i rozpocznij/ }).click();
  await expect(page.locator('#appView')).toHaveClass(/hidden/);
  await page.locator('#registerForm input[name="acceptTerms"]').check();
  await page.locator('#registerForm input[name="acceptPrivacy"]').check();
  await page.locator('#registerForm').getByRole('button', { name: /Załóż konto i rozpocznij/ }).click();
  await expect(page.locator('#appView')).not.toHaveClass(/hidden/);

  await page.locator('[data-view="privacy"]:visible').first().click();
  await expect(page.locator('#consentStatus')).toContainText('Warunki: zaakceptowane');
  await expect(page.locator('#consentStatus')).toContainText('Prywatność: potwierdzona');
  await page.locator('#analyticsConsent').check();
  await page.getByRole('button', { name: 'Zapisz zgodę analityczną' }).click();
  await expect(page.locator('#toast')).toContainText('Zgoda została zapisana');
  await expect(page.locator('#analyticsConsent')).toBeChecked();
});

test('layout does not overflow the viewport', async ({ page }) => {
  await page.goto('/');
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
  await expect(page.getByRole('heading', { name: 'Wklej ofertę i sprawdź, czy warto aplikować.' })).toBeVisible();
});
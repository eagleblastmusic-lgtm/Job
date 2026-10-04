import { test, expect } from '@playwright/test';
import { faroFixture } from '../src/tests/faro-fixture.js';

test('required registration consent and optional analytics persist through the real Canonical workspace', async ({ page }) => {
  const f = await faroFixture(); f.app.config.appOrigin = f.base;
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  let registrationRequests = 0;
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/auth/register') registrationRequests += 1; });
  try {
    await page.goto(f.base);
    await page.getByRole('button', { name: 'Załóż konto', exact: true }).click();
    const form = page.locator('#registerForm');
    await form.locator('[name=name]').fill('Zofia');
    await form.locator('[name=email]').fill('browser-consent@example.pl');
    await form.locator('[name=password]').fill('Bezpieczne123');
    const terms = form.locator('[name=acceptTerms]'), privacy = form.locator('[name=acceptPrivacy]');
    const analytics = form.locator('[name=analyticsConsent]');
    await expect(terms).not.toBeChecked(); await expect(privacy).not.toBeChecked(); await expect(analytics).not.toBeChecked();
    const submit = form.getByRole('button', { name: 'Załóż bezpłatne konto', exact: true });
    await submit.click();
    expect(await terms.evaluate(input => (input as HTMLInputElement).validity.valueMissing)).toBe(true);
    await expect(page.locator('#authView')).toBeVisible();
    await terms.check(); await submit.click();
    expect(await privacy.evaluate(input => (input as HTMLInputElement).validity.valueMissing)).toBe(true);
    expect(registrationRequests).toBe(0);
    await privacy.check();
    const registered = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/register');
    await submit.click(); expect((await registered).status()).toBe(201);
    await expect(page.locator('.f-brand')).toBeVisible();
    expect(registrationRequests).toBe(1);

    const consents = async () => {
      const response = await page.request.get(f.base + '/api/consents'); expect(response.status()).toBe(200);
      return await response.json() as { legalVersion: string; consents: Array<{ type: string; granted: boolean; version: string }> };
    };
    const initial = await consents();
    for (const type of ['TERMS', 'PRIVACY']) expect(initial.consents.find(consent => consent.type === type)).toMatchObject({ granted: true, version: initial.legalVersion });
    expect(initial.consents.find(consent => consent.type === 'ANALYTICS')?.granted).toBe(false);
    await page.getByRole('link', { name: 'Prywatność', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Twoje dane i wybory' })).toBeVisible();
    const choice = page.locator('[data-form=analytics] [name=granted]');
    for (const granted of [true, false]) {
      await choice.setChecked(granted);
      const saved = page.waitForResponse(response => new URL(response.url()).pathname === '/api/consents/analytics' && response.request().method() === 'PUT');
      await page.getByRole('button', { name: 'Zapisz wybór', exact: true }).click();
      expect((await saved).status()).toBe(200);
      await expect(page.locator('#f-status')).toHaveText('Zapisano.');
      expect((await consents()).consents.find(consent => consent.type === 'ANALYTICS')?.granted).toBe(granted);
      await page.reload();
      await expect(page.locator('#f-content')).toHaveAttribute('aria-busy', 'false');
      await expect(choice).toBeChecked({ checked: granted });
    }
    expect(errors).toEqual([]);
  } finally { await f.close(); }
});

test('locked public login and registration reflow at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  for (const selector of ['#loginForm', '#registerForm']) {
    if (selector === '#registerForm') await page.getByRole('button', { name: 'Załóż konto', exact: true }).click();
    await expect(page.locator(selector)).toBeVisible();
    const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
  }
});

import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

const uniqueEmail = (): string => `today-ui-${Date.now()}-${Math.random().toString(16).slice(2)}@example.pl`;

test('Today screen is feature-gated, calm, actionable and accessible', async ({ page }) => {
  let accepted = false;
  let completed = false;
  const action = () => ({
    id: 'action-1', key: 'prepare-cv:base', type: 'PREPARE_CV', title: 'Dopracuj bazowe CV',
    reason: 'Krótka aktualizacja potwierdzonych faktów i CV przygotuje następny krok.', estimatedMinutes: 10,
    priorityScore: 0.36, accepted, completed, outcome: completed ? 'Oznaczone jako wykonane przez użytkownika.' : null,
    recommendedFor: '2026-09-13', payload: {}
  });

  await page.route('**/api/features', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ features: { today: true } }) }));
  await page.route('**/api/today**', async route => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.pathname === '/api/today/recommendations' && method === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ actions: [action()], timeBudgetMinutes: 30 }) }); return;
    }
    if (url.pathname.endsWith('/accept') && method === 'PATCH') {
      accepted = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ action: action() }) }); return;
    }
    if (url.pathname.endsWith('/complete') && method === 'PATCH') {
      accepted = true; completed = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ action: action() }) }); return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ actions: [action()] }) });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Załóż konto', exact: true }).click();
  await page.locator('#registerForm input[name="name"]').fill('Tester Today');
  await page.locator('#registerForm input[name="email"]').fill(uniqueEmail());
  await page.locator('#registerForm input[name="password"]').fill('Bezpieczne123');
  await page.locator('#registerForm input[name="acceptTerms"]').check();
  await page.locator('#registerForm input[name="acceptPrivacy"]').check();
  await page.locator('#registerForm').getByRole('button', { name: /Załóż konto i rozpocznij/ }).click();
  await expect(page.locator('#appView')).not.toHaveClass(/hidden/);

  await expect(page.locator('[data-view="today"]:visible').first()).toBeVisible();
  await page.locator('[data-view="today"]:visible').first().click();
  await expect(page.getByRole('heading', { name: 'DZISIAJ' })).toBeVisible();
  await page.getByRole('button', { name: '30 min' }).click();
  await expect(page.locator('#todayActions')).toContainText('Dopracuj bazowe CV');
  await expect(page.locator('#todayActions')).toContainText('około 10 min');
  await expect(page.locator('#todayActions')).not.toContainText(/streak|przegapiłeś|musisz/i);

  await page.getByRole('button', { name: 'Wybieram to' }).click();
  await expect(page.locator('#todayMessage')).toContainText('Działanie wybrane');
  await page.getByRole('button', { name: 'Zrobione' }).click();
  await expect(page.locator('#todayActions')).toContainText('Gotowe');
  await expect(page.locator('#todayMessage')).toContainText('Działanie oznaczone jako wykonane');

  const results = await new AxeBuilder({ page }).include('[data-screen="today"]').analyze();
  expect(results.violations).toEqual([]);
});

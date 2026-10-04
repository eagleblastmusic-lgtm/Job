import { test, expect, type Page } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectNoWcagViolations(page: Page, surface: string): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze();
  const details = results.violations.map(violation => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map(node => ({ target: node.target, failureSummary: node.failureSummary }))
  }));
  expect(results.violations, surface + ': ' + JSON.stringify(details, null, 2)).toEqual([]);
}

test('public surfaces have no automatically detectable WCAG 2.2 A/AA violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#loginForm')).toBeVisible();
  await expectNoWcagViolations(page, 'landing/login');
  await page.getByRole('button', { name: 'Załóż konto', exact: true }).click();
  await expect(page.locator('#registerForm')).toBeVisible();
  await expectNoWcagViolations(page, 'registration');
  for (const surface of ['privacy', 'terms']) {
    const response = await page.goto('/' + surface + '.html'); expect(response?.status()).toBe(200);
    await expectNoWcagViolations(page, surface);
  }
});

import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import { faroPgFixture } from '../src/tests/faro-pg-fixture.js';
import { faroFixture } from '../src/tests/faro-fixture.js';

test('Canonical offline retry and real expired session clear private workspace without replaying writes',async({page,context})=>{
  const f=process.env.FARO_PG_BROWSER==='1'?await faroPgFixture():await faroFixture();f.app.config.appOrigin=f.base;
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  try {
    const candidate=await f.user('SessionBoundary');
    await f.request('/api/faro/profile',candidate.cookie,'PUT',{firstName:'PrywatnaAnna',availability:{kind:'IMMEDIATE'},expectedVersion:0});
    await page.goto(f.base);
    await page.locator('#loginForm [name=email]').fill(candidate.email);
    await page.locator('#loginForm [name=password]').fill('Bezpieczne123');
    await page.getByRole('button',{name:'Zaloguj się',exact:true}).click();
    await expect(page.locator('#f-content')).toHaveAttribute('aria-busy','false');
    await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>undefined));
    await page.locator('.f-skip').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#f-content')).toBeFocused();
    await page.getByRole('link',{name:'Profil',exact:true}).click();
    await expect(page.locator('[name=firstName]')).toHaveValue('PrywatnaAnna');
    // Actual Chromium network loss, rather than a synthetic API error response.
    await context.setOffline(true);
    await expect(page.locator('#f-status')).toContainText('Jesteś offline');
    await page.locator('[name=firstName]').fill('NiezapisanaZmiana');
    await page.locator('[data-form=profile]').getByRole('button',{name:'Zapisz profil',exact:true}).click();
    await expect(page.locator('[data-form=profile] .f-form-message')).toContainText('Jesteś offline');
    await context.setOffline(false);
    const persisted=await f.request<{firstName:string}>('/api/faro/profile',candidate.cookie);
    expect(persisted.firstName).toBe('PrywatnaAnna');
    // Retry reloads a read; it never replays the failed form command.
    await context.setOffline(true);
    await page.getByRole('link',{name:'Moje procesy',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Nie udało się wczytać danych'})).toBeVisible();
    await expect(page.locator('#f-content')).toHaveAttribute('aria-busy','false');
    await expect(page.locator('#f-content')).toBeFocused();
    await context.setOffline(false);
    await page.getByRole('button',{name:'Spróbuj ponownie',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Moje procesy',exact:true})).toBeVisible();
    await page.getByRole('link',{name:'Profil',exact:true}).click();
    await expect(page.locator('[name=firstName]')).toHaveValue('PrywatnaAnna');
    const cached=await page.evaluate(async()=>{const urls:string[]=[];for(const key of await caches.keys())for(const request of await (await caches.open(key)).keys())urls.push(new URL(request.url).pathname);return urls;});
    expect(cached).toContain('/');
    expect(cached.some(path=>path.startsWith('/api/'))).toBe(false);
    // Expire the actual session row used by Chromium, not a mocked 401.
    if('query' in f.app.db)await f.app.db.query("UPDATE sessions SET expires_at='2000-01-01T00:00:00.000Z' WHERE user_id=$1",[candidate.id]);else f.app.db.db.prepare("UPDATE sessions SET expires_at='2000-01-01T00:00:00.000Z' WHERE user_id=?").run(candidate.id);
    await page.getByRole('link',{name:'Moje procesy',exact:true}).click();
    await expect(page.locator('#loginForm')).toBeVisible();
    await expect(page.locator('#authMessage')).toHaveText('Sesja wygasła. Zaloguj się ponownie.');
    await expect(page.locator('#appView')).toBeEmpty();
    await expect(page.locator('#loginForm [name=password]')).toHaveValue('');
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
    await f.request('/api/faro/profile',candidate.cookie,'GET',undefined,401);
    await page.locator('#loginForm [name=email]').fill(candidate.email);
    await page.locator('#loginForm [name=password]').fill('Bezpieczne123');
    await page.getByRole('button',{name:'Zaloguj się',exact:true}).click();
    await page.getByRole('link',{name:'Prywatność',exact:true}).click();
    const revoke=page.locator('[data-form=revoke-sessions]');
    await revoke.locator('[name=password]').fill('BledneHaslo123');
    await revoke.locator('[name=confirmed]').check();
    await revoke.getByRole('button',{name:'Wyloguj wszystkie urządzenia',exact:true}).click();
    await expect(revoke.locator('.f-form-message')).toContainText('poprawne aktualne hasło');
    await expect(page.locator('.f-brand')).toBeVisible();
    await revoke.locator('[name=password]').fill('Bezpieczne123');
    await revoke.getByRole('button',{name:'Wyloguj wszystkie urządzenia',exact:true}).click();
    await expect(page.locator('#loginForm')).toBeVisible();
    await expect(page.locator('#authMessage')).toHaveText('Wszystkie sesje zostały wylogowane.');
    await expect(page.locator('#appView')).toBeEmpty();
    expect(errors).toEqual([]);
  }finally{await context.setOffline(false);if(!page.isClosed())await page.goto('about:blank');await f.close();}
});

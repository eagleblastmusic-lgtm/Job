import { test,expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import { faroFixture,offerInput } from '../src/tests/faro-fixture.js';
import { faroPgFixture } from '../src/tests/faro-pg-fixture.js';
test('real employment offer pins concrete conditions and owning candidate explicitly accepts same revision with accessible workspace',async({page})=>{
  const f=process.env.FARO_PG_BROWSER==='1'?await faroPgFixture():await faroFixture();f.app.config.appOrigin=f.base;const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  try {
    const employer=await f.user('EmploymentEmployer'),candidate=await f.user('EmploymentCandidate');
    await f.request('/api/faro/profile',candidate.cookie,'PUT',{firstName:'Anna',expectedVersion:0,availability:{kind:'IMMEDIATE'}});
    const org=await f.request<{id:string}>('/api/faro/organizations',employer.cookie,'POST',{name:'Syntetyczna firma zatrudnienia'},201);
    if('query' in f.app.db)await f.app.db.query("UPDATE faro_organizations SET verification='VERIFIED' WHERE id=$1",[org.id]);else f.app.db.db.prepare("UPDATE faro_organizations SET verification='VERIFIED' WHERE id=?").run(org.id);
    const offer=await f.request<{id:string}>(`/api/faro/organizations/${org.id}/offers`,employer.cookie,'POST',offerInput(employer.id),201);
    await f.request(`/api/faro/offers/${offer.id}/lifecycle`,employer.cookie,'POST',{action:'REVIEW',expectedVersion:1});await f.request(`/api/faro/offers/${offer.id}/lifecycle`,employer.cookie,'POST',{action:'PUBLISH',expectedVersion:2,confirmed:true});
    const preview=await f.request<{confirmationToken:string}>('/api/faro/profile/preview-confirmation',candidate.cookie);
    const process=await f.request<{id:string}>(`/api/faro/offers/${offer.id}/interest`,candidate.cookie,'POST',{offerVersion:1,projectionConfirmed:true,confirmationToken:preview.confirmationToken,idempotencyKey:'browser-employment-interest'},201);
    await f.request(`/api/faro/processes/${process.id}/commands`,employer.cookie,'POST',{command:'ADVANCE',expectedVersion:1,idempotencyKey:'browser-employment-advance',nextAction:'Uzgodnienie warunków współpracy',dueAt:new Date(Date.now()+86400000).toISOString()});
    const login=async(u:typeof employer,hash:string)=>{await page.goto(f.base);await page.locator('#loginForm [name=email]').fill(u.email);await page.locator('#loginForm [name=password]').fill('Bezpieczne123');await page.getByRole('button',{name:'Zaloguj się',exact:true}).click();await expect(page.getByRole('button',{name:'Wyloguj',exact:true})).toBeVisible();await page.goto(`${f.base}/#${hash}`);};
    await login(employer,`processes/${process.id}`);
    // Select the existing employer role before opening the private assigned process.
    await page.locator('#f-role').selectOption('employer');await page.goto(`${f.base}/#processes/${process.id}`);
    const form=page.locator('[data-form=process-command]');await expect(form).toBeVisible();await form.locator('[name=command]').selectOption('OFFER');await form.locator('[name=employmentAmount]').fill('6000');await form.locator('[name=employmentStartsAt]').fill('2030-01-10T09:00');await form.locator('[name=nextAction]').fill('Potwierdź pokazane warunki współpracy');await form.locator('[name=dueAt]').fill('2030-01-05T09:00');await form.locator('[name=confirmed]').check();await form.getByRole('button',{name:'Zapisz działanie',exact:true}).click();await expect(page.getByRole('heading',{name:'Przypięta oferta zatrudnienia'})).toBeVisible();
    await page.setViewportSize({width:320,height:880});expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.getByRole('button',{name:'Wyloguj',exact:true}).click();await login(candidate,`processes/${process.id}`);await expect(page.getByRole('heading',{name:'Przypięta oferta zatrudnienia'})).toBeVisible();
    await page.setViewportSize({width:320,height:880});expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const accept=page.locator('[data-form=process-command]');await accept.locator('[name=command]').selectOption('ACCEPT_OFFER');await accept.locator('[name=confirmed]').check();await accept.getByRole('button',{name:'Zapisz działanie',exact:true}).click();await expect(page.getByLabel('Szczegóły',{exact:true}).getByText('Przyjęcie oferty potwierdzone',{exact:true})).toBeVisible();await expect(page.locator('[data-form=process-command]')).toHaveCount(0);const view=await f.request<{status:string;employmentOffer:{amount:number}}>(`/api/faro/processes/${process.id}`,candidate.cookie);expect(view.employmentOffer.amount).toBe(600000);expect(view.status).toBe('HIRED');const count='query' in f.app.db?(await f.app.db.readBatch([{text:"SELECT COUNT(*) n FROM analytics_events WHERE event_name='FARO_MUTUAL_STAGE_COMPLETED'",values:[]}]))[0]![0]!.n:f.app.db.db.prepare("SELECT COUNT(*) n FROM analytics_events WHERE event_name='FARO_MUTUAL_STAGE_COMPLETED'").get()!.n;expect(count).toBe(0);expect(errors).toEqual([]);
  } finally {await f.close();}
});

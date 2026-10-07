import { faroPgFixture } from '../src/tests/faro-pg-fixture.js';
import {test,expect,type Page} from '@playwright/test';
import {AxeBuilder} from '@axe-core/playwright';
import {faroFixture,offerInput} from '../src/tests/faro-fixture.js';
async function login(page:Page,base:string,email:string) {
  await page.goto(base);await page.locator('#loginForm [name=email]').fill(email);await page.locator('#loginForm [name=password]').fill('Bezpieczne123');await page.getByRole('button',{name:'Zaloguj się',exact:true}).click();await expect(page.locator('.f-brand')).toBeVisible();
}
test('real human restriction, organization appeal and independent restoration retain paused vacancies and accessible private boundaries',async({page},info)=>{
  const f=process.env.FARO_PG_BROWSER==='1'?await faroPgFixture():await faroFixture();f.app.config.appOrigin=f.base;
  try {
    const owner=await f.user('RestrictionUiOwner'),candidate=await f.user('RestrictionUiCandidate'),moderator=await f.user('RestrictionUiModerator');
    if('query' in f.app.db)await f.app.db.query("UPDATE users SET role='ADMIN' WHERE id=$1",[moderator.id]);else f.app.db.db.prepare("UPDATE users SET role='ADMIN' WHERE id=?").run(moderator.id);
    const org=await f.request<{id:string}>('/api/faro/organizations',owner.cookie,'POST',{name:'Przegląd ograniczenia UI'},201);
    await f.request(`/api/faro/organizations/${org.id}/verify`,moderator.cookie,'POST',{note:'Syntetyczne sprawdzenie organizacji.'});
    await f.request('/api/faro/profile',candidate.cookie,'PUT',{firstName:'Anna',expectedVersion:0,availability:{kind:'IMMEDIATE'}});
    const offer=await f.request<{id:string}>(`/api/faro/organizations/${org.id}/offers`,owner.cookie,'POST',offerInput(owner.id),201);
    await f.request(`/api/faro/offers/${offer.id}/lifecycle`,owner.cookie,'POST',{action:'REVIEW',expectedVersion:1});await f.request(`/api/faro/offers/${offer.id}/lifecycle`,owner.cookie,'POST',{action:'PUBLISH',expectedVersion:2,confirmed:true});
    const preview=await f.request<{confirmationToken:string}>('/api/faro/profile/preview-confirmation',candidate.cookie);
    const process=await f.request<{id:string}>(`/api/faro/offers/${offer.id}/interest`,candidate.cookie,'POST',{offerVersion:1,projectionConfirmed:true,confirmationToken:preview.confirmationToken,idempotencyKey:'restriction-ui-interest'},201);
    const report=await f.request<{id:string}>(`/api/faro/processes/${process.id}/reports`,candidate.cookie,'POST',{kind:'PROCESS',statement:'Prywatny opis nie może trafić do organizacji.',idempotencyKey:'restriction-ui-report'},201);
    await f.request(`/api/faro/cases/${report.id}/review`,moderator.cookie,'POST',{state:'EVIDENCE_REVIEW',decision:'Ręczny syntetyczny przegląd.',reviewAt:new Date(Date.now()+86400000).toISOString(),expectedVersion:1,idempotencyKey:'restriction-ui-evidence'});
    if(info.project.name.includes('mobile'))await page.setViewportSize({width:320,height:740});
    await login(page,f.base,moderator.email);await page.goto(`${f.base}/#cases`);const review=page.locator('[data-form=case-review]');
    await review.locator('[name=state]').selectOption('ACTION');await review.locator('[name=decision]').fill('Sprawdzono dowody syntetycznego naruszenia.');await review.locator('[name=reviewAt]').fill(new Date(Date.now()+86400000).toISOString().slice(0,16));
    await review.locator('[name=restorationCondition]').fill('Potwierdzenie usunięcia naruszenia w ręcznym przeglądzie.');await review.locator('[name=restrict]').check();await review.getByRole('button',{name:'Zapisz przegląd'}).click();await expect(page.locator('#f-status')).toHaveText('Zapisano.');expect((await f.request<{status:string}>(`/api/faro/offers/${offer.id}`,owner.cookie)).status).toBe('PAUSED');
    await page.getByRole('button',{name:'Wyloguj',exact:true}).click();await login(page,f.base,owner.email);await page.goto(`${f.base}/#restrictions/${org.id}`);
    await expect(page.getByRole('heading',{name:'Wstrzymane nowe zgłoszenia'})).toBeVisible();await expect(page.locator('#f-content')).not.toContainText('Prywatny opis');await expect(page.locator('[data-form=restriction-restore]')).toHaveCount(0);
    const appeal=page.locator('[data-form=restriction-appeal]');await appeal.locator('[name=reason]').fill('Proces poprawiono. Prosimy o niezależny przegląd.');await appeal.getByRole('button',{name:'Przekaż odwołanie'}).click();await expect(page.locator('[data-form=restriction-appeal]')).toHaveCount(0);
    expect((await new AxeBuilder({page}).include('#appView').analyze()).violations).toEqual([]);
    await page.getByRole('button',{name:'Wyloguj',exact:true}).click();await login(page,f.base,moderator.email);await page.goto(`${f.base}/#restrictions/${org.id}`);
    const restore=page.locator('[data-form=restriction-restore]');await restore.locator('[name=reason]').fill('Warunki przywrócenia sprawdzono niezależnie.');await restore.locator('[name=confirmed]').check();await restore.getByRole('button',{name:'Zakończ to ograniczenie'}).click();await expect(page.getByRole('heading',{name:'Ograniczenie zakończone'})).toBeVisible();
    expect((await f.request<{status:string}>(`/api/faro/offers/${offer.id}`,owner.cookie)).status).toBe('PAUSED');expect('query' in f.app.db?(await f.app.db.readBatch([{text:'SELECT verification FROM faro_organizations WHERE id=$1',values:[org.id]}]))[0]![0]!.verification:f.app.db.db.prepare('SELECT verification FROM faro_organizations WHERE id=?').get(org.id)!.verification).toBe('PENDING');expect((await f.request<{revision:number}>(`/api/faro/processes/${process.id}`,owner.cookie)).revision).toBe(1);
    expect((await new AxeBuilder({page}).include('#appView').analyze()).violations).toEqual([]);const widths=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));expect(widths.scroll).toBeLessThanOrEqual(widths.client+1);
  }finally{await f.close();}
});

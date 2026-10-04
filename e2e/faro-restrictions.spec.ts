import {test,expect,type Page} from '@playwright/test';
import {AxeBuilder} from '@axe-core/playwright';
import {faroFixture,offerInput} from '../src/tests/faro-fixture.js';
import {ProfileService} from '../src/server/faro/profileService.js';
import {OfferService} from '../src/server/faro/offerService.js';
import {RecruitmentService} from '../src/server/faro/recruitmentService.js';
import {TrustService} from '../src/server/faro/trustService.js';
async function login(page:Page,base:string,email:string) {
  await page.goto(base);await page.locator('#loginForm [name=email]').fill(email);await page.locator('#loginForm [name=password]').fill('Bezpieczne123');await page.getByRole('button',{name:'Zaloguj się',exact:true}).click();await expect(page.locator('.f-brand')).toBeVisible();
}
test('real human restriction, organization appeal and independent restoration retain paused vacancies and accessible private boundaries',async({page},info)=>{
  const f=await faroFixture();f.app.config.appOrigin=f.base;
  try {
    const owner=await f.user('RestrictionUiOwner'),candidate=await f.user('RestrictionUiCandidate'),moderator=await f.user('RestrictionUiModerator');
    f.app.db.db.prepare("UPDATE users SET role='ADMIN' WHERE id=?").run(moderator.id);
    const p=new ProfileService(f.app.db),o=new OfferService(f.app.db),r=new RecruitmentService(f.app.db),t=new TrustService(f.app.db);
    const org=p.organization(owner.id,{name:'Przegląd ograniczenia UI'});p.verify(moderator.id,org.id,'Syntetyczne sprawdzenie organizacji.');p.save(candidate.id,{firstName:'Anna',expectedVersion:0,availability:{kind:'IMMEDIATE'}});
    const offer=o.create(owner.id,org.id,offerInput(owner.id));o.lifecycle(owner.id,offer.id,{action:'REVIEW',expectedVersion:1});o.lifecycle(owner.id,offer.id,{action:'PUBLISH',expectedVersion:2,confirmed:true});
    const process=r.interest(candidate.id,offer.id,{offerVersion:1,projectionConfirmed:true,confirmationToken:p.previewConfirmation(candidate.id).confirmationToken,idempotencyKey:'restriction-ui-interest'});
    const report=t.report(candidate.id,process.id,{kind:'PROCESS',statement:'Prywatny opis nie może trafić do organizacji.',idempotencyKey:'restriction-ui-report'});
    t.review(moderator.id,report.id,{state:'EVIDENCE_REVIEW',decision:'Ręczny syntetyczny przegląd.',reviewAt:new Date(Date.now()+86400000).toISOString(),expectedVersion:1,idempotencyKey:'restriction-ui-evidence'});
    if(info.project.name.includes('mobile'))await page.setViewportSize({width:320,height:740});
    await login(page,f.base,moderator.email);await page.goto(`${f.base}/#cases`);const review=page.locator('[data-form=case-review]');
    await review.locator('[name=state]').selectOption('ACTION');await review.locator('[name=decision]').fill('Sprawdzono dowody syntetycznego naruszenia.');await review.locator('[name=reviewAt]').fill(new Date(Date.now()+86400000).toISOString().slice(0,16));
    await review.locator('[name=restorationCondition]').fill('Potwierdzenie usunięcia naruszenia w ręcznym przeglądzie.');await review.locator('[name=restrict]').check();await review.getByRole('button',{name:'Zapisz przegląd'}).click();await expect(page.locator('#f-status')).toHaveText('Zapisano.');expect(o.get(offer.id).status).toBe('PAUSED');
    await page.getByRole('button',{name:'Wyloguj',exact:true}).click();await login(page,f.base,owner.email);await page.goto(`${f.base}/#restrictions/${org.id}`);
    await expect(page.getByRole('heading',{name:'Wstrzymane nowe zgłoszenia'})).toBeVisible();await expect(page.locator('#f-content')).not.toContainText('Prywatny opis');await expect(page.locator('[data-form=restriction-restore]')).toHaveCount(0);
    const appeal=page.locator('[data-form=restriction-appeal]');await appeal.locator('[name=reason]').fill('Proces poprawiono. Prosimy o niezależny przegląd.');await appeal.getByRole('button',{name:'Przekaż odwołanie'}).click();await expect(page.locator('[data-form=restriction-appeal]')).toHaveCount(0);
    expect((await new AxeBuilder({page}).include('#appView').analyze()).violations).toEqual([]);
    await page.getByRole('button',{name:'Wyloguj',exact:true}).click();await login(page,f.base,moderator.email);await page.goto(`${f.base}/#restrictions/${org.id}`);
    const restore=page.locator('[data-form=restriction-restore]');await restore.locator('[name=reason]').fill('Warunki przywrócenia sprawdzono niezależnie.');await restore.locator('[name=confirmed]').check();await restore.getByRole('button',{name:'Zakończ to ograniczenie'}).click();await expect(page.getByRole('heading',{name:'Ograniczenie zakończone'})).toBeVisible();
    expect(o.get(offer.id).status).toBe('PAUSED');expect(f.app.db.db.prepare('SELECT verification FROM faro_organizations WHERE id=?').get(org.id)!.verification).toBe('PENDING');expect(r.row(process.id).revision).toBe(1);
    expect((await new AxeBuilder({page}).include('#appView').analyze()).violations).toEqual([]);const widths=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));expect(widths.scroll).toBeLessThanOrEqual(widths.client+1);
  }finally{await f.close();}
});

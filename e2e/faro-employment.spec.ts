import { test,expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import { faroFixture,offerInput } from '../src/tests/faro-fixture.js';
import { ProfileService } from '../src/server/faro/profileService.js';
import { OfferService } from '../src/server/faro/offerService.js';
import { RecruitmentService } from '../src/server/faro/recruitmentService.js';
test('real employment offer pins concrete conditions and owning candidate explicitly accepts same revision with accessible workspace',async({page})=>{
  const f=await faroFixture();f.app.config.appOrigin=f.base;const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  try {
    const employer=await f.user('EmploymentEmployer'),candidate=await f.user('EmploymentCandidate'),profiles=new ProfileService(f.app.db),offers=new OfferService(f.app.db),r=new RecruitmentService(f.app.db);
    profiles.save(candidate.id,{firstName:'Anna',expectedVersion:0,availability:{kind:'IMMEDIATE'}});
    const org=profiles.organization(employer.id,{name:'Syntetyczna firma zatrudnienia'});f.app.db.db.prepare("UPDATE faro_organizations SET verification='VERIFIED' WHERE id=?").run(org.id);
    const offer=offers.create(employer.id,org.id,offerInput(employer.id));offers.lifecycle(employer.id,offer.id,{action:'REVIEW',expectedVersion:1});offers.lifecycle(employer.id,offer.id,{action:'PUBLISH',expectedVersion:2,confirmed:true});
    const process=r.interest(candidate.id,offer.id,{offerVersion:1,projectionConfirmed:true,confirmationToken:profiles.previewConfirmation(candidate.id).confirmationToken,idempotencyKey:'browser-employment-interest'});
    r.change(employer.id,process.id,{command:'ADVANCE',expectedVersion:1,idempotencyKey:'browser-employment-advance',nextAction:'Uzgodnienie warunków współpracy',dueAt:new Date(Date.now()+86400000).toISOString()});
    const login=async(u:typeof employer,hash:string)=>{await page.goto(f.base);await page.locator('#loginForm [name=email]').fill(u.email);await page.locator('#loginForm [name=password]').fill('Bezpieczne123');await page.getByRole('button',{name:'Zaloguj się',exact:true}).click();await expect(page.getByRole('button',{name:'Wyloguj',exact:true})).toBeVisible();await page.goto(`${f.base}/#${hash}`);};
    await login(employer,`processes/${process.id}`);
    // Select the existing employer role before opening the private assigned process.
    await page.locator('#f-role').selectOption('employer');await page.goto(`${f.base}/#processes/${process.id}`);
    const form=page.locator('[data-form=process-command]');await expect(form).toBeVisible();await form.locator('[name=command]').selectOption('OFFER');await form.locator('[name=employmentAmount]').fill('6000');await form.locator('[name=employmentStartsAt]').fill('2030-01-10T09:00');await form.locator('[name=nextAction]').fill('Potwierdź pokazane warunki współpracy');await form.locator('[name=dueAt]').fill('2030-01-05T09:00');await form.locator('[name=confirmed]').check();await form.getByRole('button',{name:'Zapisz działanie',exact:true}).click();await expect(page.getByRole('heading',{name:'Przypięta oferta zatrudnienia'})).toBeVisible();
    await page.setViewportSize({width:320,height:880});expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.getByRole('button',{name:'Wyloguj',exact:true}).click();await login(candidate,`processes/${process.id}`);await expect(page.getByRole('heading',{name:'Przypięta oferta zatrudnienia'})).toBeVisible();
    await page.setViewportSize({width:320,height:880});expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const accept=page.locator('[data-form=process-command]');await accept.locator('[name=command]').selectOption('ACCEPT_OFFER');await accept.locator('[name=confirmed]').check();await accept.getByRole('button',{name:'Zapisz działanie',exact:true}).click();await expect(page.getByLabel('Szczegóły',{exact:true}).getByText('Przyjęcie oferty potwierdzone',{exact:true})).toBeVisible();await expect(page.locator('[data-form=process-command]')).toHaveCount(0);expect(r.employmentOffer(process.id)!.amount).toBe(600000);expect(r.row(process.id).status).toBe('HIRED');expect(errors).toEqual([]);
  } finally {await f.close();}
});

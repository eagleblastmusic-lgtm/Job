import { test, expect, type Page } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import { faroFixture, offerInput } from '../src/tests/faro-fixture.js';
import { faroPgFixture } from '../src/tests/faro-pg-fixture.js';
import { attemptReadQuery,attemptFromRows } from '../src/server/faro/assessmentAttemptReadModel.js';
import { processReadQuery,processFromRows } from '../src/server/faro/processReadModel.js';

async function login(page:Page,base:string,email:string) {
  await page.goto(base);await page.locator('#loginForm [name=email]').fill(email);await page.locator('#loginForm [name=password]').fill('Bezpieczne123');
  await page.getByRole('button',{name:'Zaloguj się',exact:true}).click();await expect(page.locator('.f-brand')).toBeVisible();
}

test('real attempt incident is shared for human review without resetting time or exposing draft answers',async({page},info)=>{
  const f=process.env.FARO_PG_BROWSER==='1'?await faroPgFixture():await faroFixture();f.app.config.appOrigin=f.base;
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  try {
    const employer=await f.user('IncidentEmployer'),candidate=await f.user('IncidentCandidate');
    const org=await f.request<{id:string}>('/api/faro/organizations',employer.cookie,'POST',{name:'Syntetyczna pracownia prób'},201);
    if('query' in f.app.db)await f.app.db.query("UPDATE faro_organizations SET verification='VERIFIED' WHERE id=$1",[org.id]);else f.app.db.db.prepare("UPDATE faro_organizations SET verification='VERIFIED' WHERE id=?").run(org.id);
    await f.request('/api/faro/profile',candidate.cookie,'PUT',{firstName:'Anna',expectedVersion:0,availability:{kind:'IMMEDIATE'}});
    const offer=await f.request<{id:string}>(`/api/faro/organizations/${org.id}/offers`,employer.cookie,'POST',offerInput(employer.id),201);
    await f.request(`/api/faro/offers/${offer.id}/lifecycle`,employer.cookie,'POST',{action:'REVIEW',expectedVersion:1});
    await f.request(`/api/faro/offers/${offer.id}/lifecycle`,employer.cookie,'POST',{action:'PUBLISH',expectedVersion:2,confirmed:true});
    const preview=await f.request<{confirmationToken:string}>('/api/faro/profile/preview-confirmation',candidate.cookie);
    const process=await f.request<{id:string}>(`/api/faro/offers/${offer.id}/interest`,candidate.cookie,'POST',{offerVersion:1,projectionConfirmed:true,confirmationToken:preview.confirmationToken,idempotencyKey:'incident-interest'},201);
    await f.request(`/api/faro/processes/${process.id}/commands`,employer.cookie,'POST',{command:'ADVANCE',expectedVersion:1,idempotencyKey:'incident-advance',nextAction:'Syntetyczna próba',dueAt:new Date(Date.now()+86400000).toISOString()});
    const d=await f.request<{id:string}>(`/api/faro/offers/${offer.id}/assessments`,employer.cookie,'POST',{title:'Próba techniczna UI',timeLimitMinutes:5,expectedMinutes:2,rubricVersion:'ui-incident-1',tasks:[{prompt:'Jak odpowiadasz?',options:['Sprawdzam','Zgaduję'],answer:0,points:1}]},201);
    await f.request(`/api/faro/assessments/${d.id}/versions/1`,employer.cookie,'POST',{action:'REVIEW'});await f.request(`/api/faro/assessments/${d.id}/versions/1`,employer.cookie,'POST',{action:'APPROVE',confirmed:true});
    const a=await f.request<{id:string}>(`/api/faro/processes/${process.id}/assessment`,employer.cookie,'POST',{assessmentId:d.id,version:1,deadline:new Date(Date.now()+86400000).toISOString(),expectedVersion:2,idempotencyKey:'ui-incident-assign'},201);
    const rows=async(query:{text:string;values:readonly unknown[]})=>'query' in f.app.db?(await f.app.db.readBatch([query]))[0]!:f.app.db.db.prepare(query.text).all({$1:query.values[0] as string});
    const attemptRow=async(id:string)=>attemptFromRows(await rows(attemptReadQuery(id)));
    const processRow=async()=>processFromRows(await rows(processReadQuery(process.id)));
    if(info.project.name.includes('mobile'))await page.setViewportSize({width:320,height:740});
    await login(page,f.base,candidate.email);await page.goto(`${f.base}/#attempts/${a.id}`);
    await page.getByRole('button',{name:'Rozpocznij assessment',exact:true}).click();
    await page.getByLabel('Sprawdzam',{exact:true}).check();await page.getByRole('button',{name:'Zapisz',exact:true}).click();
    await expect(page.locator('#f-status')).toHaveText('Zapisano.');
    const before=(await attemptRow(a.id)),first=(await processRow()).first_response_at;
    await page.getByText('Zgłoś problem techniczny tej próby',{exact:true}).click();
    const report=page.locator('[data-form=attempt-incident]');await report.locator('[name=category]').selectOption('ANSWER_SAVE');
    await report.locator('[name=statement]').fill('Syntetyczna awaria zapisu; proszę sprawdzić tę próbę.');await report.locator('[name=confirmed]').check();
    await report.getByRole('button',{name:'Zapisz zgłoszenie techniczne'}).click();
    await expect(page.getByRole('heading',{name:'Zgłoszenie techniczne tej próby'})).toBeVisible();
    await expect(page.getByText(/Czeka na ręczny przegląd/)).toBeVisible();
    expect((await attemptRow(a.id)).expires_at).toBe(before.expires_at);expect((await attemptRow(a.id)).answers).toBe(before.answers);
    expect((await new AxeBuilder({page}).include('#appView').analyze()).violations).toEqual([]);
    await page.getByRole('button',{name:'Wyloguj',exact:true}).click();await login(page,f.base,employer.email);await page.locator('#f-role').selectOption('employer');await page.goto(`${f.base}/#attempts/${a.id}`);
    await expect(page.getByRole('heading',{name:'Odpowiedzi do przeglądu'})).toHaveCount(0);
    const resolution=page.locator('[data-form=attempt-incident-resolve]');await resolution.locator('[name=reason]').fill('Potwierdzono awarię. Kolejny krok ustalimy ręcznie.');await resolution.locator('[name=confirmed]').check();
    await resolution.getByRole('button',{name:'Zapisz rozstrzygnięcie techniczne'}).click();
    await expect(page.getByText('Próba z problemem technicznym',{exact:true})).toBeVisible();
    expect((await new AxeBuilder({page}).include('#appView').analyze()).violations).toEqual([]);
    const retry=page.locator('[data-form=attempt-retry]');await retry.locator('[name=deadline]').fill(new Date(Date.now()+172800000).toISOString().slice(0,16));
    await retry.locator('[name=reason]').fill('Potwierdzona awaria; zapraszamy do osobnej próby tej samej wersji.');await retry.locator('[name=confirmed]').check();
    await retry.getByRole('button',{name:'Zaproś do osobnej próby'}).click();
    await expect(page.getByRole('heading',{name:'Ponowienie próby 2'})).toBeVisible();
    const next=(await f.request<{attempts:Array<{id:string;retryOf:string;state:string;startedAt:string|null;expiresAt:string|null}>}>(`/api/faro/processes/${process.id}/assessment`,employer.cookie)).attempts.find(attempt=>attempt.retryOf===a.id)!;expect(next.state).toBe('INVITED');expect(next.startedAt).toBeNull();expect(next.expiresAt).toBeNull();
    expect((await new AxeBuilder({page}).include('#appView').analyze()).violations).toEqual([]);
    await page.getByRole('button',{name:'Wyloguj',exact:true}).click();await login(page,f.base,candidate.email);await page.goto(`${f.base}/#attempts/${a.id}`);
    await expect(page.getByText(/Uzasadnienie przeglądu: Potwierdzono awarię/)).toBeVisible();
    await expect(page.locator('[data-form=attempt-answers]')).toHaveCount(0);await expect(page.getByRole('heading',{name:'Wynik w tej rekrutacji'})).toHaveCount(0);
    const after=(await attemptRow(a.id));expect(after.started_at).toBe(before.started_at);expect(after.expires_at).toBe(before.expires_at);expect(after.answers).toBe(before.answers);expect((await processRow()).first_response_at).toBe(first);
    await page.getByRole('link',{name:'Zobacz powiązane ponowienie'}).click();await expect(page.getByRole('heading',{name:'Ponowienie próby 2'})).toBeVisible();
    await page.getByRole('button',{name:'Rozpocznij assessment',exact:true}).click();await expect(page.locator('[data-form=attempt-answers]')).toBeVisible();expect((await attemptRow(next.id)).answers).toBe('{}');
    await page.getByRole('link',{name:'Zobacz pierwotną próbę i zachowane terminy'}).click();await expect(page.locator('[data-form=attempt-answers]')).toHaveCount(0);
    const widths=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));expect(widths.scroll).toBeLessThanOrEqual(widths.client+1);expect(errors).toEqual([]);
  }finally{await f.close();}
});

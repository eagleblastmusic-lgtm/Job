import { faroPgFixture } from '../src/tests/faro-pg-fixture.js';
import { test,expect,type Page } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import { faroFixture,offerInput } from '../src/tests/faro-fixture.js';
async function login(page:Page,base:string,email:string) {
  await page.goto(base);await page.locator('#loginForm [name=email]').fill(email);await page.locator('#loginForm [name=password]').fill('Bezpieczne123');
  await page.getByRole('button',{name:'Zaloguj się',exact:true}).click();await expect(page.locator('#f-content')).toHaveAttribute('aria-busy','false');
}
test('real open answer draft, pinned manual rubric, private save and human score remain accessible without automatic grading',async({page})=>{
  const f=process.env.FARO_PG_BROWSER==='1'?await faroPgFixture():await faroFixture();f.app.config.appOrigin=f.base;const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  try {
    const employer=await f.user('OpenEmployer'),candidate=await f.user('OpenCandidate');
    const org=await f.request<{id:string}>('/api/faro/organizations',employer.cookie,'POST',{name:'Syntetyczna pracownia odpowiedzi'},201);
    if('query' in f.app.db)await f.app.db.query("UPDATE faro_organizations SET verification='VERIFIED' WHERE id=$1",[org.id]);else f.app.db.db.prepare("UPDATE faro_organizations SET verification='VERIFIED' WHERE id=?").run(org.id);
    const offer=await f.request<{id:string}>(`/api/faro/organizations/${org.id}/offers`,employer.cookie,'POST',offerInput(employer.id),201);
    await f.request(`/api/faro/offers/${offer.id}/lifecycle`,employer.cookie,'POST',{action:'REVIEW',expectedVersion:1});await f.request(`/api/faro/offers/${offer.id}/lifecycle`,employer.cookie,'POST',{action:'PUBLISH',expectedVersion:2,confirmed:true});
    await f.request('/api/faro/profile',candidate.cookie,'PUT',{firstName:'Anna',availability:{kind:'IMMEDIATE'},expectedVersion:0});
    const preview=await f.request<{confirmationToken:string}>('/api/faro/profile/preview-confirmation',candidate.cookie);
    const process=await f.request<{id:string}>(`/api/faro/offers/${offer.id}/interest`,candidate.cookie,'POST',{offerVersion:1,projectionConfirmed:true,confirmationToken:preview.confirmationToken,idempotencyKey:'open-interest'},201);
    await f.request(`/api/faro/processes/${process.id}/commands`,employer.cookie,'POST',{command:'ADVANCE',expectedVersion:1,nextAction:'Opisz proponowany krok.',dueAt:new Date(Date.now()+86400000).toISOString(),idempotencyKey:'open-advance'});
    await login(page,f.base,employer.email);await page.locator('#f-role').selectOption('employer');await page.goto(`${f.base}/#assessment-create/${offer.id}`);
    const draft=page.locator('[data-form=assessment-open-create]');
    await draft.locator('[name=title]').fill('Otwarte zadanie');await draft.locator('[name=prompt]').fill('Opisz następny krok.');
    await draft.locator('[name=evaluationCriteria]').fill('0: brak uzasadnienia; 1: krok; 2: krok i uzasadnienie.');await draft.locator('[name=points]').fill('2');
    await draft.getByRole('button',{name:'Zapisz szkic odpowiedzi otwartej'}).click();
    await expect(page.locator('#f-status')).toHaveText('Zapisano.');
    const row=(await f.request<{assessments:Array<{id:string;content:string}>}>(`/api/faro/offers/${offer.id}/assessments`,employer.cookie)).assessments[0]!,definition={id:String(row.id),content:String(row.content)};expect(JSON.parse(definition.content).type).toBe('OPEN_ANSWER');
    await page.goto(`${f.base}/#assessment-edit/${definition.id}/1`);
    await expect(page.getByRole('textbox',{name:'Kryteria ręcznej oceny',exact:true})).toHaveValue('0: brak uzasadnienia; 1: krok; 2: krok i uzasadnienie.');
    await page.getByRole('button',{name:'Dodaj zadanie',exact:true}).click();
    await page.getByRole('textbox',{name:'Treść zadania',exact:true}).last().fill('Opisz alternatywę.');await page.getByRole('textbox',{name:'Kryteria ręcznej oceny',exact:true}).last().fill('0: nieadekwatna; 1: adekwatna alternatywa.');
    await page.getByRole('button',{name:'Zapisz nowy szkic'}).click();await expect(page.getByRole('heading',{name:'Assessmenty rekrutacji'})).toBeVisible();
    expect((await f.request<{state:string}>(`/api/faro/assessments/${definition.id}/versions/2`,employer.cookie)).state).toBe('DRAFT');
    await f.request(`/api/faro/assessments/${definition.id}/versions/2`,employer.cookie,'POST',{action:'REVIEW'});await f.request(`/api/faro/assessments/${definition.id}/versions/2`,employer.cookie,'POST',{action:'APPROVE',confirmed:true});
    const a=await f.request<{id:string}>(`/api/faro/processes/${process.id}/assessment`,employer.cookie,'POST',{assessmentId:definition.id,version:2,deadline:new Date(Date.now()+86400000).toISOString(),expectedVersion:2,idempotencyKey:'open-assign'},201);
    await page.getByRole('button',{name:'Wyloguj',exact:true}).click();await login(page,f.base,candidate.email);await page.goto(`${f.base}/#attempts/${a.id}`);
    await expect(page.getByText('Odpowiedzi otwarte',{exact:true})).toBeVisible();await expect(page.locator('[name=task-1]')).toHaveCount(0);
    await page.getByRole('button',{name:'Rozpocznij assessment'}).click();
    await page.locator('[name=task-1]').fill('<script>niewykonywalny tekst</script> Proponuję krok z uzasadnieniem.');
    await page.getByRole('button',{name:'Zapisz',exact:true}).click();await expect(page.locator('#f-status')).toHaveText('Zapisano.');await expect(page.locator('[name=task-1]')).toHaveValue(/niewykonywalny/);
    expect((await f.request<{reviewTasks:unknown[]}>(`/api/faro/attempts/${a.id}`,employer.cookie)).reviewTasks).toEqual([]);
    await page.reload();await expect(page.locator('[name=task-1]')).toHaveValue(/niewykonywalny/);
    await page.locator('[name=operation]').selectOption('Prześlij do oceny');await page.getByRole('button',{name:'Zapisz',exact:true}).click();
    await expect(page.getByText('Wynik czeka na review',{exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Wynik w tej rekrutacji'})).toHaveCount(0);
    await page.getByRole('button',{name:'Wyloguj',exact:true}).click();await login(page,f.base,employer.email);await page.locator('#f-role').selectOption('employer');await page.goto(`${f.base}/#attempts/${a.id}`);
    await expect(page.getByText(/Odpowiedź kandydata: <script>niewykonywalny/)).toBeVisible();
    const review=page.locator('[data-form=attempt-review]');await review.locator('[name=task-1]').fill('1');
    await review.locator('[name=note]').fill('Ręczna ocena przypisanej rubryki: krok bez pełnego uzasadnienia.');await review.locator('[name=confirmed]').check();
    await page.setViewportSize({width:320,height:880});expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await review.getByRole('button',{name:'Udostępnij wynik kandydatowi'}).click();
    await expect(page.getByText('1 / 3 punktów. Bez odpowiedzi: 1.',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Wyloguj',exact:true}).click();await login(page,f.base,candidate.email);await page.goto(`${f.base}/#attempts/${a.id}`);
    await expect(page.getByText('1 / 3 punktów. Bez odpowiedzi: 1.',{exact:true})).toBeVisible();expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);expect(errors).toEqual([]);
  }finally{if(!page.isClosed())await page.goto('about:blank');await f.close();}
});

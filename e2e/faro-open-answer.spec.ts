import { faroPgFixture } from '../src/tests/faro-pg-fixture.js';
import { test,expect,type Page } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import { faroFixture,offerInput } from '../src/tests/faro-fixture.js';
import type {Attempt} from '../src/client/faroTypes.js';
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

async function autosaveFixture(page:Page){
  const f=process.env.FARO_PG_BROWSER==='1'?await faroPgFixture():await faroFixture();f.app.config.appOrigin=f.base;
  const owner=await f.user('AutosaveOwner'),candidate=await f.user('AutosaveCandidate');
  const org=await f.request<{id:string}>('/api/faro/organizations',owner.cookie,'POST',{name:'Synthetic autosave fixture'},201);
  if('query' in f.app.db)await f.app.db.query("UPDATE faro_organizations SET verification='VERIFIED' WHERE id=$1",[org.id]);else f.app.db.db.prepare("UPDATE faro_organizations SET verification='VERIFIED' WHERE id=?").run(org.id);
  const offer=await f.request<{id:string}>(`/api/faro/organizations/${org.id}/offers`,owner.cookie,'POST',offerInput(owner.id),201);
  await f.request(`/api/faro/offers/${offer.id}/lifecycle`,owner.cookie,'POST',{action:'REVIEW',expectedVersion:1});await f.request(`/api/faro/offers/${offer.id}/lifecycle`,owner.cookie,'POST',{action:'PUBLISH',expectedVersion:2,confirmed:true});
  await f.request('/api/faro/profile',candidate.cookie,'PUT',{firstName:'Anna',availability:{kind:'IMMEDIATE'},expectedVersion:0});
  const preview=await f.request<{confirmationToken:string}>('/api/faro/profile/preview-confirmation',candidate.cookie);
  const recruitment=await f.request<{id:string}>(`/api/faro/offers/${offer.id}/interest`,candidate.cookie,'POST',{offerVersion:1,projectionConfirmed:true,confirmationToken:preview.confirmationToken,idempotencyKey:'autosave-interest'},201);
  await f.request(`/api/faro/processes/${recruitment.id}/commands`,owner.cookie,'POST',{command:'ADVANCE',expectedVersion:1,nextAction:'Synthetic autosave',dueAt:new Date(Date.now()+86400000).toISOString(),idempotencyKey:'autosave-advance'});
  const definition=await f.request<{id:string}>(`/api/faro/offers/${offer.id}/assessments`,owner.cookie,'POST',{type:'OPEN_ANSWER',title:'Autosave assessment',timeLimitMinutes:5,expectedMinutes:3,rubricVersion:'autosave-r1',tasks:[{prompt:'Opisz następny krok.',evaluationCriteria:'Jasny krok i uzasadnienie.',points:2}]},201);
  for(const action of ['REVIEW','APPROVE'])await f.request(`/api/faro/assessments/${definition.id}/versions/1`,owner.cookie,'POST',{action,confirmed:true});
  const ack=await f.request<{id:string}>(`/api/faro/processes/${recruitment.id}/assessment`,owner.cookie,'POST',{assessmentId:definition.id,version:1,deadline:new Date(Date.now()+86400000).toISOString(),expectedVersion:2,idempotencyKey:'autosave-assign'},201),url=`/api/faro/attempts/${ack.id}`;
  await f.request(url,candidate.cookie,'POST',{});await login(page,f.base,candidate.email);await page.goto(`${f.base}/#attempts/${ack.id}`);await expect(page.locator('[name=task-1]')).toBeVisible();
  return {...f,owner,candidate,recruitment,url,read:()=>f.request<Attempt>(url,candidate.cookie)};
}
async function closeAutosave(page:Page,f:Awaited<ReturnType<typeof autosaveFixture>>){
  if(!page.isClosed()){page.on('dialog',dialog=>{void dialog.accept();});await page.goto('about:blank');}await f.close();
}

test('FARO-AUDIT-003: no-click autosave confirms a revision, exact private text survives reload and expiry is unchanged',async({page})=>{
  const f=await autosaveFixture(page);try{
    const before=await f.read(),answer='  FARO_PRIVATE_AUTOSAVE_SENTINEL\nDokładna odpowiedź: żółć.  ';
    let writes=0;page.on('request',request=>{if(request.method()==='PUT'&&request.url().endsWith('/answers'))writes++;});
    await page.locator('[name=task-1]').fill(answer);
    await expect(page.locator('#f-answer-save-status')).toHaveAttribute('data-save-state','saved');
    const saved=await f.read();expect(saved.answers['task-1']).toBe(answer);expect(saved.revision).toBeGreaterThan(before.revision);expect(saved.expiresAt).toBe(before.expiresAt);expect(writes).toBe(1);
    expect((await f.request<Attempt>(f.url,f.owner.cookie)).reviewTasks).toEqual([]);
    await page.reload();await expect(page.locator('[name=task-1]')).toHaveValue(answer);expect((await f.read()).expiresAt).toBe(before.expiresAt);
    expect(await page.evaluate(()=>JSON.stringify({local:{...localStorage},session:{...sessionStorage}}))).not.toContain('FARO_PRIVATE_AUTOSAVE_SENTINEL');
    const cached=await page.evaluate(async()=>{await navigator.serviceWorker.ready;const bodies:string[]=[],urls:string[]=[];for(const name of await caches.keys()){const cache=await caches.open(name);for(const key of await cache.keys()){urls.push(key.url);const response=await cache.match(key);if(response)bodies.push(await response.text());}}return {text:bodies.join(''),urls};});
    expect(cached.text).not.toContain('FARO_PRIVATE_AUTOSAVE_SENTINEL');expect(cached.urls.some(url=>new URL(url).pathname==='/assessmentAutosave.js')).toBe(true);expect(cached.urls.some(url=>new URL(url).pathname.startsWith('/api/'))).toBe(false);
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  }finally{await closeAutosave(page,f);}
});

test('autosave serializes delayed snapshots with newer edits and submit; stale response never repaints the draft',async({page})=>{
  const f=await autosaveFixture(page);let release=()=>{};const held=new Promise<void>(resolve=>{release=resolve;});
  const inputs:Array<{answers:Record<string,string>;expectedVersion:number}>=[];let committed=false;
  try{
    await page.route('**/answers',async route=>{inputs.push(route.request().postDataJSON() as typeof inputs[number]);const response=await route.fetch();if(inputs.length===1){committed=true;await held;}await route.fulfill({response});});
    await page.locator('[name=task-1]').fill('Starsza odpowiedź A.');await expect.poll(()=>committed).toBe(true);
    await page.locator('[name=task-1]').fill('Nowsza odpowiedź B — musi pozostać.');await page.locator('[name=operation]').selectOption('Prześlij do oceny');
    await page.getByRole('button',{name:'Zapisz',exact:true}).click();expect(inputs.length).toBe(1);
    release();await expect(page.getByText('Wynik czeka na review',{exact:true})).toBeVisible();
    const saved=await f.read();expect(saved.state).toBe('SCORED_PENDING_REVIEW');expect(saved.answers['task-1']).toBe('Nowsza odpowiedź B — musi pozostać.');expect(inputs.length).toBe(2);expect(inputs[1]!.expectedVersion).toBe(inputs[0]!.expectedVersion+1);
    const process=await f.request<{events:Array<{kind:string}>}>(`/api/faro/processes/${f.recruitment.id}`,f.candidate.cookie);expect(process.events.filter(e=>e.kind==='ATTEMPT_SUBMITTED')).toHaveLength(1);
  }finally{release();await closeAutosave(page,f);}
});

test('autosave offline/reconnect and uncertain committed response preserve the draft; navigation waits for confirmation',async({page,context})=>{
  const f=await autosaveFixture(page);try{
    const expiry=(await f.read()).expiresAt;
    await context.setOffline(true);await page.locator('[name=task-1]').fill('Odpowiedź wpisana offline.');
    await expect(page.locator('#f-answer-save-status')).toHaveAttribute('data-save-state','offline');
    await page.getByRole('link',{name:'Wróć do procesu',exact:true}).click();await expect(page.locator('[name=task-1]')).toHaveValue('Odpowiedź wpisana offline.');expect(page.url()).toContain('#attempts/');
    expect((await f.read()).answers).toEqual({});await context.setOffline(false);
    await expect(page.locator('#f-answer-save-status')).toHaveAttribute('data-save-state','saved');expect((await f.read()).answers['task-1']).toBe('Odpowiedź wpisana offline.');expect((await f.read()).expiresAt).toBe(expiry);
    let lost=false;await page.route('**/answers',async route=>{await route.fetch();lost=true;await route.abort('failed');});
    await page.locator('[name=task-1]').fill('Zapis przyjęty — odpowiedź sieci utracona.');await expect.poll(()=>lost).toBe(true);await expect(page.locator('#f-answer-save-status')).toHaveAttribute('data-save-state','error');
    const accepted=await f.read();await page.unroute('**/answers');await page.getByRole('button',{name:'Ponów zapis',exact:true}).click();await expect(page.locator('#f-answer-save-status')).toHaveAttribute('data-save-state','saved');expect((await f.read()).revision).toBe(accepted.revision);
    await page.locator('[name=task-1]').fill('Odpowiedź przed nawigacją.');await page.getByRole('link',{name:'Wróć do procesu',exact:true}).click();await expect(page.locator('[data-form=attempt-answers]')).toHaveCount(0);expect((await f.read()).answers['task-1']).toBe('Odpowiedź przed nawigacją.');
  }finally{await context.setOffline(false);await closeAutosave(page,f);}
});

test('autosave 409 requires a choice between concurrent answers; server timeout stops saving and submission',async({page})=>{
  const f=await autosaveFixture(page);try{
    const initial=await f.read();await f.request(f.url+'/answers',f.candidate.cookie,'PUT',{answers:{'task-1':'Odpowiedź z innej karty.'},expectedVersion:initial.revision});
    await page.locator('[name=task-1]').fill('Moja odpowiedź po konflikcie.');await expect(page.locator('#f-answer-save-status')).toHaveAttribute('data-save-state','conflict');
    expect((await f.read()).answers['task-1']).toBe('Odpowiedź z innej karty.');await expect(page.locator('[name=task-1]')).toHaveValue('Moja odpowiedź po konflikcie.');
    await page.getByRole('button',{name:'Zachowaj moją odpowiedź',exact:true}).click();await expect(page.locator('#f-answer-save-status')).toHaveAttribute('data-save-state','saved');expect((await f.read()).answers['task-1']).toBe('Moja odpowiedź po konflikcie.');
    const version=await f.read();await f.request(f.url+'/answers',f.candidate.cookie,'PUT',{answers:{'task-1':'Druga zmiana w innej karcie.'},expectedVersion:version.revision});
    await page.locator('[name=task-1]').fill('Zmiana do odrzucenia.');await expect(page.locator('#f-answer-save-status')).toHaveAttribute('data-save-state','conflict');
    await page.getByRole('button',{name:'Wczytaj zapisaną odpowiedź',exact:true}).click();await expect(page.locator('[name=task-1]')).toHaveValue('Druga zmiana w innej karcie.');
    const past=new Date(Date.now()-1000).toISOString(),id=f.url.split('/').pop()!;
    if('query' in f.app.db)await f.app.db.query('UPDATE faro_attempts SET expires_at=$1 WHERE id=$2',[past,id]);else f.app.db.db.prepare('UPDATE faro_attempts SET expires_at=? WHERE id=?').run(past,id);
    await page.locator('[name=task-1]').fill('Zmiana po serwerowym terminie.');await expect(page.locator('#f-answer-save-status')).toHaveAttribute('data-save-state','expired');
    const expired=await f.read();expect(expired.state).toBe('EXPIRED');expect(expired.answers['task-1']).toBe('Druga zmiana w innej karcie.');await expect(page.getByRole('button',{name:'Zapisz',exact:true})).toBeDisabled();
    await f.request(f.url+'/submit',f.candidate.cookie,'POST',{expectedVersion:expired.revision,answers:{'task-1':'Spóźniony submit'}},409);expect((await f.read()).answers).toEqual(expired.answers);
  }finally{await closeAutosave(page,f);}
});

test('autosave confirmation arriving after the timer expires cannot reactivate editing or submit',async({page})=>{
  const f=await autosaveFixture(page);let release=()=>{};const held=new Promise<void>(resolve=>{release=resolve;});let committed=false;
  try{
    const end=new Date(Date.now()+3000).toISOString(),id=f.url.split('/').pop()!;
    if('query' in f.app.db)await f.app.db.query('UPDATE faro_attempts SET expires_at=$1 WHERE id=$2',[end,id]);else f.app.db.db.prepare('UPDATE faro_attempts SET expires_at=? WHERE id=?').run(end,id);
    await page.reload();await expect(page.locator('[name=task-1]')).toBeVisible();
    await page.route('**/answers',async route=>{const response=await route.fetch();committed=true;await held;await route.fulfill({response});});
    await page.locator('[name=task-1]').fill('Odpowiedź przyjęta przed upływem czasu.');await expect.poll(()=>committed).toBe(true);
    await expect(page.locator('#f-answer-save-status')).toHaveAttribute('data-save-state','expired');release();
    await expect(page.locator('#f-answer-save-status')).toContainText('Potwierdzono ostatni zapis');
    await expect(page.locator('[name=task-1]')).toBeDisabled();await expect(page.getByRole('button',{name:'Zapisz',exact:true})).toBeDisabled();
    const saved=await f.read();expect(saved.answers['task-1']).toBe('Odpowiedź przyjęta przed upływem czasu.');expect(saved.expiresAt).toBe(end);
    const process=await f.request<{events:Array<{kind:string}>}>(`/api/faro/processes/${f.recruitment.id}`,f.candidate.cookie);expect(process.events.filter(e=>e.kind==='ATTEMPT_SUBMITTED')).toHaveLength(0);
  }finally{release();await closeAutosave(page,f);}
});

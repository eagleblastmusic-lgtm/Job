import {test,expect,type Page,type Locator} from '@playwright/test';
import {AxeBuilder} from '@axe-core/playwright';
import {faroFixture,offerInput} from '../src/tests/faro-fixture.js';
import {faroPgFixture} from '../src/tests/faro-pg-fixture.js';

// Real keyboard events. No programmatic focus, click, injected successful API body or screen-reader claim.
async function tabTo(page:Page,target:Locator,backwards=false){
  for(let i=0;i<180;i++){
    if(await target.evaluate(el=>el===document.activeElement)){
      const focus=await target.evaluate(el=>{const style=getComputedStyle(el),r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {outline:style.outlineStyle,width:parseFloat(style.outlineWidth),visible:r.width>0&&r.height>0&&r.top>=0&&r.bottom<=innerHeight&&Boolean(hit&&(hit===el||el.contains(hit)))};});
      expect(focus.outline).not.toBe('none');expect(focus.width).toBeGreaterThan(0);expect(focus.visible).toBe(true);return;
    }
    await page.keyboard.press(backwards?'Shift+Tab':'Tab');
  }
  throw new Error('Keyboard target unreachable within bounded traversal');
}
async function keyboardLogin(page:Page,base:string,email:string,settle=true){
  await page.goto(base);await tabTo(page,page.locator('#loginForm [name=email]'));await page.keyboard.type(email);
  await page.keyboard.press('Tab');await expect(page.locator('#loginForm [name=password]')).toBeFocused();await page.keyboard.type('Bezpieczne123');
  await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Zaloguj się',exact:true})).toBeFocused();await page.keyboard.press('Enter');
  if(settle){await expect(page.locator('#f-content')).toHaveAttribute('aria-busy','false');await expect(page.locator('#f-content')).toBeFocused();}
}
async function keyboardLink(page:Page,name:string){await tabTo(page,page.getByRole('link',{name,exact:true}),true);await page.keyboard.press('Enter');await expect(page.locator('#f-content')).toBeFocused();}

test('K062: candidate keyboard login, navigation, server error recovery, disclosure and own privacy controls',async({page},info)=>{
  const f=process.env.FARO_PG_BROWSER==='1'?await faroPgFixture():await faroFixture();f.app.config.appOrigin=f.base;
  try{
    const candidate=await f.user('KeyboardCandidate');await keyboardLogin(page,f.base,candidate.email);
    await keyboardLink(page,'Profil');const profile=page.locator('[data-form=profile]'),name=profile.locator('[name=firstName]');
    await tabTo(page,name);await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type('   ');
    await tabTo(page,profile.getByRole('button',{name:'Zapisz profil',exact:true}));await page.keyboard.press('Enter');
    const error=profile.locator('.f-form-message');await expect(error).not.toBeEmpty();await expect(error).toHaveAttribute('role','alert');await expect(error).toBeFocused();
    await tabTo(page,name,true);await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type('Anna');
    await tabTo(page,profile.getByRole('button',{name:'Zapisz profil',exact:true}));await page.keyboard.press('Enter');await expect(page.locator('#f-status')).toHaveText('Zapisano.');
    const summary=page.getByText('Dodaj kompetencję',{exact:true});await tabTo(page,summary);await page.keyboard.press('Enter');await expect(page.locator('[data-form=claim]')).toBeVisible();
    await expect(page.locator('[data-form=claim]').getByRole('searchbox',{name:'Szukaj kompetencji',exact:true})).toBeVisible();
    await keyboardLink(page,'Prywatność');await expect(page.getByRole('heading',{name:'Twoje dane i wybory',exact:true})).toBeVisible();
    await tabTo(page,page.getByRole('button',{name:'Pobierz moje dane',exact:true}));
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
    await info.attach('keyboard-coverage',{body:JSON.stringify({scope:'ENGINEERING_ONLY',backend:process.env.FARO_PG_BROWSER==='1'?'postgresql':'sqlite',keyboard:'real Tab/Shift+Tab/Enter/text',screenReader:'NOT_TESTED',independentAcceptance:'MISSING'}),contentType:'application/json'});
  }finally{await page.goto('about:blank');await f.close();}
});

test('K062: employer keyboard role switch, offer editor and 320 CSS-pixel reflow with enlarged text',async({page},info)=>{
  const f=process.env.FARO_PG_BROWSER==='1'?await faroPgFixture():await faroFixture();f.app.config.appOrigin=f.base;
  try{
    const employer=await f.user('KeyboardEmployer');const org=await f.request<{id:string}>('/api/faro/organizations',employer.cookie,'POST',{name:'Synthetic keyboard employer'},201);
    const offer=await f.request<{id:string}>(`/api/faro/organizations/${org.id}/offers`,employer.cookie,'POST',offerInput(employer.id),201);
    await keyboardLogin(page,f.base,employer.email);await tabTo(page,page.locator('#f-role'),true);await page.keyboard.press('End');await page.keyboard.press('Tab');
    await expect(page.locator('#f-role')).toHaveValue('employer');await expect(page.locator('#f-content')).toHaveAttribute('aria-busy','false');
    await page.goto(`${f.base}/#offer-edit/${offer.id}`);await expect(page.locator('[data-form=offer]')).toBeVisible();await expect(page.locator('#f-content')).toHaveAttribute('aria-busy','false');
    // 320 CSS px is the reflow viewport equivalent to a 1280px desktop at 400% zoom.
    // Text scaling is a separate injected stylesheet, not a claim of native browser zoom/AT testing.
    await page.setViewportSize({width:320,height:880});
    await page.addStyleTag({content:'.faro {font-size:30px !important;line-height:1.6 !important}.faro label {font-size:28px !important}.faro h1 {font-size:50px !important}.faro h2 {font-size:46px !important}'});
    const clipped=await page.locator('.faro input:not([type=checkbox]):not([type=radio]),.faro select').evaluateAll(fields=>fields.filter(field=>{const r=field.getBoundingClientRect(),s=getComputedStyle(field);return r.width>0&&r.height>0&&r.height+.5<parseFloat(s.fontSize)+parseFloat(s.paddingTop)+parseFloat(s.paddingBottom)+parseFloat(s.borderTopWidth)+parseFloat(s.borderBottomWidth);}).map(field=>field.getAttribute('name')??field.id));
    expect(clipped).toEqual([]);
    await page.locator('.f-header').screenshot({path:info.outputPath('header-textscale.png')});
    await info.attach('offer-reflow',{body:await page.screenshot({path:info.outputPath('offer-reflow.png'),fullPage:true}),contentType:'image/png'});
    const overflow=await page.evaluate(()=>Array.from(document.querySelectorAll('.faro *')).filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left<0)&&!el.closest('.f-nav');}).map(el=>({tag:el.tagName,cls:el.className,text:el.textContent?.slice(0,80)})));
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),JSON.stringify(overflow)).toBe(true);
    await tabTo(page,page.getByRole('link',{name:'Organizacja',exact:true}),true);await page.keyboard.press('Enter');await expect(page.locator('#f-content')).toHaveAttribute('aria-busy','false');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
    await info.attach('reflow',{body:await page.screenshot({path:info.outputPath('organization-reflow.png'),fullPage:true}),contentType:'image/png'});
  }finally{await page.goto('about:blank');await f.close();}
});

test('K062: projection dialog has an accessible name, contains keyboard focus and Escape returns to its trigger',async({page})=>{
  const f=process.env.FARO_PG_BROWSER==='1'?await faroPgFixture():await faroFixture();f.app.config.appOrigin=f.base;
  try{
    const owner=await f.user('DialogOwner'),candidate=await f.user('DialogCandidate');
    const org=await f.request<{id:string}>('/api/faro/organizations',owner.cookie,'POST',{name:'Synthetic dialog employer'},201);
    if('query' in f.app.db)await f.app.db.query("UPDATE faro_organizations SET verification='VERIFIED' WHERE id=$1",[org.id]);else f.app.db.db.prepare("UPDATE faro_organizations SET verification='VERIFIED' WHERE id=?").run(org.id);
    const offer=await f.request<{id:string}>(`/api/faro/organizations/${org.id}/offers`,owner.cookie,'POST',offerInput(owner.id),201);
    await f.request(`/api/faro/offers/${offer.id}/lifecycle`,owner.cookie,'POST',{action:'REVIEW',expectedVersion:1});await f.request(`/api/faro/offers/${offer.id}/lifecycle`,owner.cookie,'POST',{action:'PUBLISH',expectedVersion:2,confirmed:true});
    await f.request('/api/faro/profile',candidate.cookie,'PUT',{firstName:'Anna',expectedVersion:0,availability:{kind:'IMMEDIATE'}});
    await keyboardLogin(page,f.base,candidate.email);await page.goto(`${f.base}/#offers/${offer.id}`);const trigger=page.getByRole('button',{name:'Zgłoś zainteresowanie',exact:true});await expect(trigger).toBeVisible();
    await tabTo(page,trigger);await page.keyboard.press('Enter');const dialog=page.getByRole('dialog',{name:'Tak wygląda Twój profil dla pracodawcy',exact:true});await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button',{name:'Zamknij',exact:true})).toBeFocused();
    for(let i=0;i<8;i++){
      await page.keyboard.press('Tab');
      // Native modal dialogs allow leaving the document for browser chrome.
      // BODY is that boundary; the next Tab must return to the modal, never background controls.
      if(await page.evaluate(()=>document.activeElement===document.body))await page.keyboard.press('Tab');
      expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);
    }
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
    await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(trigger).toBeFocused();
    expect((await f.request<{processes:unknown[]}>('/api/faro/processes',candidate.cookie)).processes).toHaveLength(0);
  }finally{await page.goto('about:blank');await f.close();}
});

test('K062: a delayed anonymous session read cannot erase a newer successful keyboard login',async({page})=>{
  const f=process.env.FARO_PG_BROWSER==='1'?await faroPgFixture():await faroFixture();f.app.config.appOrigin=f.base;
  let release=()=>{},releaseCurrent=()=>{};const held=new Promise<void>(resolve=>{release=resolve;}),heldCurrent=new Promise<void>(resolve=>{releaseCurrent=resolve;});let first=true,anonymousStatus=0,authenticatedStatus=0,released=false;
  try{
    const candidate=await f.user('KeyboardRaceCandidate');await f.request('/api/faro/profile',candidate.cookie,'PUT',{firstName:'Anna',expectedVersion:0,availability:{kind:'IMMEDIATE'}});
    await page.route('**/api/me',async route=>{
      const initial=first;first=false;const response=await route.fetch();
      if(initial){anonymousStatus=response.status();await held;}else{authenticatedStatus=response.status();await heldCurrent;}
      try{await route.fulfill({response});}catch{/* Either delayed request can be aborted by session replacement. */}finally{if(initial)released=true;}
    });
    await keyboardLogin(page,f.base,candidate.email,false);await expect.poll(()=>authenticatedStatus).toBe(200);expect(anonymousStatus).toBe(401);release();await expect.poll(()=>released).toBe(true);
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
    releaseCurrent();await expect(page.locator('#f-content')).toHaveAttribute('aria-busy','false');
    await keyboardLink(page,'Profil');await expect(page.locator('[data-form=profile] [name=firstName]')).toHaveValue('Anna');
    await expect(page.locator('#authView')).toBeHidden();
  }finally{release();releaseCurrent();await page.goto('about:blank');await f.close();}
});

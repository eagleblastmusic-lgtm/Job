import { test,expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import { faroFixture } from '../src/tests/faro-fixture.js';
import { totp } from '../src/server/faro/mfaService.js';
function decode(value:string){let bits=0,acc=0;const out:number[]=[];for(const c of value){acc=(acc<<5)|'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c);bits+=5;if(bits>=8){bits-=8;out.push((acc>>>bits)&255);}}return Buffer.from(out);}
test('real privileged MFA enrollment, private-data gate and one-use recovery preserve locked login and accessible security workspace',async({page,context})=>{
  const f=await faroFixture({faroMfaEncryptionKey:'11'.repeat(32),faroRequirePrivilegedMfa:true});f.app.config.appOrigin=f.base;const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  try {
    const user=await f.user('MfaBrowser');f.app.db.db.prepare("UPDATE users SET role='ADMIN' WHERE id=?").run(user.id);
    const login=async()=>{await page.goto(f.base);await page.locator('#loginForm [name=email]').fill(user.email);await page.locator('#loginForm [name=password]').fill('Bezpieczne123');await page.getByRole('button',{name:'Zaloguj się',exact:true}).click();await expect(page.getByRole('heading',{name:'Bezpieczeństwo dostępu'})).toBeVisible();};
    await login();await expect(page.getByText('Dostęp wymaga drugiego składnika.',{exact:false})).toBeVisible();
    const setup=page.locator('[data-form=mfa-setup]');await setup.locator('[name=password]').fill('Bezpieczne123');await setup.getByRole('button',{name:'Rozpocznij konfigurację MFA'}).click();
    const secret=decode((await page.locator('.f-mfa-secret').textContent())!);
    await page.locator('[data-form=mfa-confirm] [name=code]').fill(totp(secret,Math.floor(Date.now()/30000)));await page.getByRole('button',{name:'Włącz MFA',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Zapisz kody odzyskiwania'})).toBeVisible();const codes=(await page.locator('.f-mfa-codes').textContent())!.split('\n');expect(codes).toHaveLength(8);
    await page.setViewportSize({width:320,height:880});expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.getByRole('link',{name:'Wróć do przestrzeni',exact:true}).click();await expect(page.getByRole('heading',{name:'Zobacz, dokąd prowadzą Twoje umiejętności.',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Wyloguj',exact:true}).click();await login();await expect(page.locator('.f-mfa-codes')).toHaveCount(0);await expect(page.locator('.f-mfa-secret')).toHaveCount(0);
    const cookies=await context.cookies(f.base),cookie=cookies.find(c=>c.name==='job_session')!;await f.request('/api/export',`job_session=${cookie.value}`,'GET',undefined,403);
    const recovery=page.locator('[data-form=mfa-recover]');await recovery.locator('[name=password]').fill('Bezpieczne123');await recovery.locator('[name=code]').fill(codes[0]!);await recovery.getByRole('button',{name:'Użyj kodu odzyskiwania'}).click();await expect(page.getByText('Pozostałe kody odzyskiwania: 7.',{exact:true})).toBeVisible();
    await recovery.locator('[name=password]').fill('Bezpieczne123');await recovery.locator('[name=code]').fill(codes[0]!);await recovery.getByRole('button',{name:'Użyj kodu odzyskiwania'}).click();await expect(page.locator('[data-form=mfa-recover] .f-form-message')).toContainText('Nieprawidłowe potwierdzenie');
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);expect(errors).toEqual([]);
  }finally{if(!page.isClosed())await page.goto('about:blank');await f.close();}
});

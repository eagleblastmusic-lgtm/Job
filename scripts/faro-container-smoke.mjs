import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const i=process.argv.indexOf('--base'),base=process.argv[i+1];
if(i<0||!base)throw new Error('Wymagane --base dla izolowanego kontenera testowego.');
const target=new URL(base);
if(!['127.0.0.1','localhost','[::1]'].includes(target.hostname)||target.username||target.password)throw new Error('Ten smoke tworzy konto syntetyczne tylko na lokalnym kontenerze.');
let ready=false;
for(let attempt=0;attempt<30;attempt++) {
  try {if((await fetch(new URL('/api/health',target),{signal:AbortSignal.timeout(2000)})).status===200){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,1000));
}
assert.equal(ready,true,'Kontener nie uzyskał readiness.');
const response=await fetch(new URL('/api/auth/register',target),{method:'POST',headers:{'content-type':'application/json',origin:target.origin},body:JSON.stringify({name:'ContainerFixture',email:`faro-container-${randomUUID()}@example.pl`,password:'SyntheticContainer123',acceptTerms:true,acceptPrivacy:true})});
assert.equal(response.status,201);
const cookie=response.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie);
assert.match(response.headers.get('set-cookie'),/HttpOnly/);assert.match(response.headers.get('set-cookie'),/Secure/);
const headers={cookie,origin:target.origin};
const me=await fetch(new URL('/api/me',target),{headers}).then(r=>r.json());assert.equal(me.subscription.plan,'FREE');assert.equal(me.subscription.status,'ACTIVE');
const profile=await fetch(new URL('/api/faro/profile',target),{headers});assert.equal(profile.status,503);assert.equal((await profile.json()).error.code,'RELEASE_GATES_OPEN');
for(const path of ['/api/cv/base.pdf','/api/effective-wage','/api/billing','/api/job-search']) {
  const retired=await fetch(new URL(path,target),{headers});assert.equal(retired.status,410,path);assert.equal(retired.headers.get('cache-control'),'no-store');
}
const html=await fetch(target).then(r=>r.text());assert.match(html,/Załóż bezpłatne konto/);
console.log('Canonical container: PASS (readiness, free-first auth, secure session, retirement, production release gate).');

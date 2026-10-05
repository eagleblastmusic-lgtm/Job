import type { User, Profile, Skill, Offer, OfferData, Process, Organization, Attempt, Economics, Projection, Interview, AssessmentDefinition, Reliability } from './faroTypes.js';
import { esc, label, salary, scenarioSalary, money, date, chip, empty, input, select, area, check, form, button, projection } from './faroUi.js';
import { profileView, offerForm, offerDetail, processDetail, economicsView, attemptView, assessmentEditor, assessmentTask, assessmentReview, reliabilityView } from './faroViews.js';

const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const root = $('#appView');
let user: User | null = null, skills: Skill[] = [], organizations: Organization[] = [];
let role: 'candidate' | 'employer' = 'candidate', orgId = '', filter = '', modelFilter = '';
let includeUnknown=false;
interface KeyPreview {token:string;blocked:boolean;manualCount:number;affected:number;attempts:Array<{id:string;state:string;validity:string|null;individualAmendment:boolean;before:number|null;after:number|null}>;}
let keyDraft:{id:string;version:number;reason:string;acceptedOptions:Record<string,number[]>;preview:KeyPreview}|null=null;
let epoch = 0, controller = new AbortController(), timer: ReturnType<typeof setInterval> | undefined;
let offers: Offer[] = [], currentOffer: Offer | null = null, currentProcess: Process | null = null, currentAttempt: Attempt | null = null;
const compared = new Set<string>();
let watchIds = new Set<string>();
let watchAlerts = new Map<string,boolean>();
let interviews:Interview[]=[];
const value = (f: FormData, name: string) => String(f.get(name) ?? '').trim();
const number = (f: FormData, name: string) => Number(value(f, name));
const practice = (f: FormData) => ({ quantity: value(f, 'quantity') ? number(f, 'quantity') : null, unit: value(f, 'unit') });
const claim = (f: FormData) => ({ skillId: value(f, 'skillId'), level: value(f, 'level'), source: value(f, 'source'), practice: practice(f), confirmed: f.has('confirmed') });
const toDate = (text: string) => { const d = new Date(text); if (!Number.isFinite(d.getTime())) throw new Error('Podaj prawidłowy termin.'); return d.toISOString(); };

async function api<T>(path: string, method = 'GET', body?: unknown, signal = controller.signal): Promise<T> {
  let r: Response;
  try {
    r = await fetch(path.startsWith('/api/') ? path : `/api/faro${path}`, { method, signal, credentials: 'same-origin', headers: body === undefined ? {} : { 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: 'no-store' });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error(navigator.onLine ? 'Nie można połączyć się z serwerem. Sprawdź połączenie i spróbuj ponownie.' : 'Jesteś offline. Zmiany wymagają połączenia z serwerem.');
  }
  const data = await r.json() as T & { error?: { message?: string; code?: string } };
  if (r.status === 401 && data.error?.code !== 'REAUTH_FAILED') { loggedOut(); $('#authMessage').textContent='Sesja wygasła. Zaloguj się ponownie.'; throw new Error('Sesja wygasła. Zaloguj się ponownie.'); }
  if (!r.ok) throw new Error(data.error?.message ?? `Błąd ${r.status}`);
  return data;
}
function interviewView(i:Interview,p:Process) {
  const active=p.status==='ACTIVE'&&['PROPOSED','CONFIRMED'].includes(i.state);
  const ownCompleted=p.viewer==='CANDIDATE'?i.candidateCompleted:i.employerCompleted;
  const zoneDate=(value:string)=>new Intl.DateTimeFormat('pl-PL',{timeZone:i.timezone,dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
  const commands=[...(i.state==='PROPOSED'&&p.viewer==='CANDIDATE'?['CONFIRM']:[]),'CANCEL',...(i.state==='CONFIRMED'&&Date.parse(i.endsAt)<=Date.now()?['DISPUTE',...(!ownCompleted?['COMPLETE']:[])]:[])];
  return `<article class="f-row"><h4>${esc(label(i.state))}</h4><p>${esc(zoneDate(i.startsAt))} – ${esc(zoneDate(i.endsAt))} · ${esc(i.timezone)}</p><p>${esc(i.location)}</p>${i.meetingUrl?`<a href="${esc(i.meetingUrl)}" target="_blank" rel="noopener noreferrer">Otwórz spotkanie</a>`:''}<p>Potwierdzenie do: ${esc(zoneDate(i.confirmBy))}</p>${i.state==='CONFIRMED'?button('interview-calendar','Dodaj do kalendarza',i.id):''}${active?form('interview-change',select('command','Działanie dotyczące rozmowy',commands)+select('reason','Powód anulowania lub rozbieżności',['RESCHEDULE','UNAVAILABLE','TECHNICAL_ISSUE','NO_SHOW','OTHER_DISCREPANCY'])+check('confirmed','Potwierdzam działanie dotyczące rozmowy.'),'Zapisz rozmowę',i.id):''}${ownCompleted&&i.state==='CONFIRMED'?'<p>Twoje potwierdzenie odbycia rozmowy jest zapisane. Czekamy na drugą stronę.</p>':''}</article>`;
}
function notify(text: string, error = false) {
  const status = $('#f-status');
  if (status) { status.textContent = text; status.classList.toggle('f-error', error); }
}
function loggedOut() { includeUnknown=false;keyDraft=null;
  epoch++; controller.abort(); controller = new AbortController(); clearInterval(timer);
  user = null; skills = []; organizations = []; offers = []; compared.clear(); watchIds.clear(); watchAlerts.clear();
  currentOffer = null; currentProcess = null; currentAttempt = null; interviews=[]; role = 'candidate'; orgId = ''; filter = ''; modelFilter = '';
  root.replaceChildren(); root.className = 'hidden'; document.body.classList.remove('faro-session');
  $('#authView').classList.remove('hidden'); $('#logoutButton').classList.add('hidden');
  document.querySelectorAll<HTMLFormElement>('#loginForm,#registerForm').forEach(f => f.reset());
}
function shell() {
  root.className = 'faro'; document.body.classList.add('faro-session'); $('#authView').classList.add('hidden');
  root.innerHTML = `<a class="f-skip" href="#f-content">Przejdź do treści</a><header class="f-header"><a class="f-brand" href="#offers" aria-label="Faro — możliwości"><span aria-hidden="true">↗</span> FARO<span class="f-brand-note">Twój następny krok.</span></a><div class="f-session"><label class="f-role-label">Przestrzeń<select id="f-role"><option value="candidate" ${role === 'candidate' ? 'selected' : ''}>Kandydat</option><option value="employer" ${role === 'employer' ? 'selected' : ''}>Pracodawca</option></select></label>${button('logout', 'Wyloguj')}</div></header>
  <div class="f-shell"><nav class="f-nav" aria-label="Workspace Faro">${(role === 'candidate' ? [['offers','Możliwości'],['watches','Obserwowane'],['processes','Moje procesy'],['profile','Profil'],['compare','Porównanie'],['attempts','Assessmenty']] : [['employer','Oferty'],['organization','Organizacja']]).concat([['notifications','Dzisiaj'],['cases','Zgłoszenia'],['privacy','Prywatność']]).map(([path,title]) => `<a href="#${path}" ${location.hash.split('/')[0] === `#${path}` ? 'aria-current="page"' : ''}>${title}</a>`).join('')}<p class="f-nav-note">Cała Polska.<br>Kompetencje przede wszystkim.<br><strong>Bezpłatnie.</strong></p></nav><div class="f-main"><p id="f-status" role="status" aria-live="polite"></p><div id="f-content" tabindex="-1" aria-busy="true"><p class="f-loading">Wczytuję Twoją przestrzeń…</p></div></div></div>`;
}
function navigate(path: string) { if (location.hash === `#${path}`) void render(); else location.hash = path; }
async function bootstrap() {
  try {
    const me = await api<{ user: User }>('/api/me'); user = me.user;
    await render();
  } catch (e) { if ((e as Error).name !== 'AbortError') { loggedOut(); $('#authMessage').textContent = (e as Error).message; } }
}
function split(list: string, detail: string, selected: boolean, back: string) {
  return `<div class="f-split ${selected ? 'f-selected' : ''}"><aside class="f-list" aria-label="Lista">${list}</aside><section class="f-detail" aria-label="Szczegóły">${selected ? `<a class="f-back" href="#${esc(back)}">← Wróć do listy</a>` : ''}${detail}</section></div>`;
}
function card(o: Offer, base: string, selected: string) {
  return `<a class="f-offer-card ${selected === o.id ? 'f-active' : ''}" href="#${base}/${o.id}" ${selected === o.id ? 'aria-current="true"' : ''}><span class="f-company-mark" aria-hidden="true">${esc(o.company.slice(0,1))}</span><div><p class="f-muted">${esc(o.company)}</p><h2>${esc(o.data.role)}</h2><p class="f-card-money">${esc(salary(o.data.salary[0]!))}</p><div class="f-chips">${chip(label(o.data.workModel))}${o.hasUnknownConditions?chip('Warunki częściowo nieznane'):''}${chip(o.data.location)}${role === 'employer' ? chip(label(o.status)) : ''}</div></div><span aria-hidden="true">↗</span></a>`;
}
async function render() {
  if (!user) return;
  const mine = ++epoch; controller.abort(); controller = new AbortController(); clearInterval(timer); shell();
  currentOffer = null; currentProcess = null; currentAttempt = null; interviews=[];
  const [page = 'offers', id = '', version = ''] = location.hash.slice(1).split('/');
  try {
    const [catalog, orgs] = await Promise.all([api<{skills:Skill[]}>('/catalog'), api<{organizations:Organization[]}>('/organizations')]);
    if (mine !== epoch) return;
    skills = catalog.skills; organizations = orgs.organizations;
    if (!organizations.some(o => o.id === orgId)) orgId = organizations[0]?.id ?? '';
    let html = '';
    if (['offers','watches','employer'].includes(page)) {
      const employer = page === 'employer';
      if (employer && !orgId) html = empty('Załóż swoją organizację', 'Najpierw utwórz organizację, potem przygotuj transparentną ofertę.') + '<a class="f-button f-primary" href="#organization">Przejdź do organizacji</a>';
      else {
        const [list, watches] = await Promise.all([api<{offers:Offer[]}>(page === 'watches' ? '/watches' : `/offers${employer ? `?organizationId=${encodeURIComponent(orgId)}` : includeUnknown?'?includeUnknown=true':''}`), api<{offers:Offer[]}>('/watches')]);
        offers = list.offers; watchIds = new Set(watches.offers.map(o => o.id)); watchAlerts=new Map(watches.offers.map(o=>[o.id,o.watchAlerts!==false]));
        const chosen = id ? await api<Offer>(`/offers/${encodeURIComponent(id)}`) : null;
        if (mine !== epoch) return;
        currentOffer = chosen;
        const filtered = offers.filter(o => `${o.data.role} ${o.company} ${o.data.location}`.toLocaleLowerCase('pl').includes(filter.toLocaleLowerCase('pl')) && (!modelFilter || o.data.workModel === modelFilter));
        html = `<div class="f-page-heading"><p class="f-kicker">${employer ? 'PRZESTRZEŃ PRACODAWCY' : 'MOŻLIWOŚCI · CAŁA POLSKA'}</p><h1>${employer ? 'Dobra rekrutacja zaczyna się od jasnych warunków.' : 'Zobacz, dokąd prowadzą Twoje umiejętności.'}</h1><p>${employer ? 'Oferty, ludzie i kolejne kroki w jednym miejscu.' : 'Jawne wynagrodzenie. Konkretne kompetencje. Miejsce na naukę.'}</p>${employer ? `<a class="f-button f-primary" href="#offer-create">Utwórz ofertę</a>` : '<a href="#profile">Ustaw prywatne granice warunków pracy</a>'}</div>
        <form class="f-filter" data-form="filter"><label>Szukaj ofert<input name="query" value="${esc(filter)}" placeholder="Rola, firma lub miejscowość"></label><label>Model pracy<select name="model"><option value="">Wszystkie</option>${['REMOTE','HYBRID','ONSITE'].map(m => `<option value="${m}" ${modelFilter === m ? 'selected' : ''}>${esc(label(m))}</option>`).join('')}</select></label>${!employer&&page==='offers'?check('includeUnknown','Pokaż też oferty z nieznanymi warunkami',includeUnknown):''}<button type="submit">Filtruj</button><span>${filtered.length} ofert · od najnowszych</span></form>` + split(filtered.map(o => card(o,page,id)).join('') || empty('Jeszcze nic tutaj nie ma', 'Zmień filtry lub wróć później. Pokazujemy wyłącznie rzeczywiste oferty.'), chosen ? offerDetail(chosen, skills, employer, watchIds.has(chosen.id),watchAlerts.get(chosen.id)!==false) : empty('Wybierz swój następny krok', 'Otwórz ofertę, by poznać warunki, wymagania i drogę do tej pracy.'), Boolean(id),page);
      }
    } else if (page === 'profile') html = profileView(await api<Profile>('/profile'), skills);
    else if (page === 'offer-create' || page === 'offer-edit') {
      if (!orgId) throw new Error('Najpierw utwórz organizację.');
      const o = id ? await api<Offer>(`/offers/${id}`) : undefined; currentOffer = o ?? null;
      html = offerForm(skills, user.id, o);
    } else if (page === 'organization') {
      html = `<h1>Twoja organizacja</h1><p>Publikacja jest dostępna po weryfikacji organizacji. Wybór przestrzeni nie nadaje uprawnień do danych innych firm.</p>${organizations.length ? `<label>Aktywna organizacja<select id="f-org">${organizations.map(o => `<option value="${esc(o.id)}" ${orgId === o.id ? 'selected' : ''}>${esc(o.name)} · ${esc(label(o.verification))} · ${esc(label(o.role))}</option>`).join('')}</select></label>` : ''}<div class="f-grid"><section class="f-card"><h2>Utwórz organizację</h2>${form('organization',input('name','Nazwa organizacji','','text','required maxlength="150"'),'Utwórz')}</section><section class="f-card"><h2>Dołącz z zaproszenia</h2>${form('accept-invite',input('token','Kod zaproszenia'),'Dołącz')}</section>${orgId ? `<section class="f-card"><h2>Zaproś współpracownika</h2>${form('invite', input('email','E-mail','','email') + select('role','Rola',['RECRUITER','HIRING_MANAGER','ADMIN']),'Utwórz kod zaproszenia',orgId)}</section>` : ''}${user.role === 'ADMIN' ? `<section class="f-card"><h2>Weryfikacja organizacji</h2>${form('verify-org',input('organizationId','Identyfikator organizacji',orgId) + area('note','Uzasadnienie weryfikacji','','required minlength="10"'),'Potwierdź weryfikację')}</section>` : ''}</div><p class="f-muted">Identyfikator wybranej organizacji: ${esc(orgId)}</p><a href="#restrictions/${esc(orgId)}">Ograniczenia i ręczne przywrócenie</a>`;
      if (orgId && ['OWNER','ADMIN'].includes(organizations.find(o=>o.id===orgId)?.role ?? '')) {
        html+=reliabilityView(await api<Reliability>(`/organizations/${orgId}/reliability`));
        const {members} = await api<{members:Array<{user_id:string;email:string;role:string;active:number}>}>(`/organizations/${orgId}/members`);
        html += `<section class="f-card"><h2>Członkowie organizacji</h2>${members.filter(m=>m.active).map(m=>`<div class="f-row"><p>${esc(m.email)} · ${esc(label(m.role))}</p>${m.role !== 'OWNER' ? button('revoke-member','Odbierz dostęp',m.user_id) : ''}</div>`).join('')}${organizations.find(o=>o.id===orgId)?.role === 'OWNER' ? form('transfer-owner',`<label>Nowy właściciel<select name="successorId">${members.filter(m=>m.active && m.user_id!==user?.id).map(m=>`<option value="${esc(m.user_id)}">${esc(m.email)}</option>`).join('')}</select></label>` + input('password','Potwierdź aktualnym hasłem','','password','required autocomplete="current-password"') + check('confirmed','Przekazuję własność wybranemu członkowi.'),'Przekaż własność',orgId) : ''}</section>`;
      }
    } else if (page === 'processes' || page === 'recruitments') {
      if (page === 'recruitments') { currentOffer = await api<Offer>(`/offers/${id}`); }
      const list = await api<{processes:Process[]}>(`/processes${page === 'recruitments' ? `?offerId=${encodeURIComponent(id)}` : ''}`);
      const selectedId = page === 'processes' ? id : location.hash.slice(1).split('/')[2] ?? '';
      const p = selectedId ? await api<Process>(`/processes/${selectedId}`) : null; currentProcess = p;
      const base = page === 'recruitments' ? `recruitments/${id}` : 'processes';
      html = `<h1>${page === 'recruitments' ? 'Zgłoszenia do rekrutacji' : 'Moje procesy'}</h1>` + split(list.processes.map(p => `<a class="f-offer-card" href="#${base}/${p.id}"><div><h3>${esc(page === 'recruitments' ? p.projection.firstName : p.role)}</h3><p>${esc(p.company)}</p>${chip(label(p.status))}<p>${esc(label(p.stage))}</p></div></a>`).join('') || empty('Brak zgłoszeń', 'Zgłoszenie zainteresowania rozpoczyna proces.'), p ? processDetail(p,skills) : empty('Każdy krok ma swoje miejsce', 'Wybierz proces, aby zobaczyć terminy, historię i dostępne działania.'), Boolean(p),base);
      if (mine !== epoch) return;
      $('#f-content').innerHTML = html;
      if (p) {
        const [attempts,meetings] = await Promise.all([api<{attempts:Attempt[]}>(`/processes/${p.id}/assessment`),api<{interviews:Interview[]}>(`/processes/${p.id}/interviews`)]);
        if (mine !== epoch) return;
        $('#f-attempt-list').innerHTML = attemptLinks(attempts.attempts);
        interviews=meetings.interviews;
        $('#f-interview-list').innerHTML=interviews.map(i=>interviewView(i,p)).join('')||'<p>Nie ustalono jeszcze terminu rozmowy.</p>';
      }
      finish(mine); return;
    } else if (page === 'economics') {
      currentOffer = await api<Offer>(`/offers/${id}`);
      html = economicsView(currentOffer, await api<Economics|null>(`/offers/${id}/economics`));
    } else if (page === 'compare') {
      const data = await Promise.all([...compared].map(async id => ({ offer: await api<Offer>(`/offers/${id}`), economics: await api<Economics|null>(`/offers/${id}/economics`) })));
      const rows: Array<[string, (o:Offer,e:Economics|null)=>string]> = [
        ['Aktualne warianty płacy',o=>o.data.salary.map(s=>salary(s)).join(' | ')],
        ['Wariant prywatnego scenariusza',(o,e)=>e?`${typeof e.scenario.salaryOptionIndex==='number'?e.scenario.salaryOptionIndex+1:'Nie ustalono wariantu'} · wersja oferty ${e.offerVersion}${e.offerVersion!==o.version?' — wcześniejsze warunki':' — aktualne warunki'}`:'Nie wybrano — Brutto / faktura pokazuje pierwszy wariant oferty'],
        ['Brutto / faktura',(o,e)=>e?scenarioSalary(e):salary(o.data.salary[0]!)], ['Szacowane netto',(_,e)=>e?.result.estimatedNetRange ? `${money(e.result.estimatedNetRange.min)} – ${money(e.result.estimatedNetRange.max)} / ${label(e.result.period)}` : 'Nie oszacowano'],
        ['Po kosztach dojazdu',(_,e)=>e?.result.netAfterCommute ? `${money(e.result.netAfterCommute.min)} – ${money(e.result.netAfterCommute.max)} / ${label(e.result.period)}` : 'Nie oszacowano'], ['Dojazd — koszt',(_,e)=>e&&e.result.commuteCost!==null?`${money(e.result.commuteCost)} / ${label(e.result.period)}`:'Nie oszacowano'], ['Dojazd — minuty dziennie',(_,e)=>e?.result.commuteTimeMinutes?.toString() ?? 'Nie oszacowano'],
        ['Transport scenariusza',(_,e)=>e?label(String(e.scenario.transport??'UNKNOWN')):'Nie określono'],
        ['Źródło prywatnego szacunku',(_,e)=>e?.result.source??'Nie oszacowano'],['Data źródła szacunku',(_,e)=>e?date(e.result.sourceDate):'Nie oszacowano'],['Założenia szacunku',(_,e)=>e?.result.assumptions??'Nie oszacowano'],['Wersja kalkulacji',(_,e)=>e?.result.calculationVersion??'Nie oszacowano'],
        ['Wersja aktualnej oferty',o=>String(o.version)],['Model pracy',o=>label(o.data.workModel)],['Lokalizacja',o=>o.data.location],['Godziny pracy',o=>o.data.hours],['Dni zdalne',o=>String(o.data.remoteDays)],['Zmiany',o=>o.data.shifts],['Praca nocna',o=>o.data.nights===null?'Nie określono':o.data.nights?'Tak':'Nie'],['Weekendy',o=>o.data.weekends === null ? 'Nie określono' : o.data.weekends ? 'Tak':'Nie'],['Wsparcie nauki',o=>o.data.learningSupport],['Etapy',o=>o.data.stages.join(' → ')],['Liczba rozmów',o=>String(o.data.interviewCount)],['Assessment',o=>`${o.data.assessmentMinutes} min`],['Pierwsza odpowiedź',o=>`${o.data.responseHours} h kalendarzowych`],['Decyzja po etapie',o=>`${o.data.decisionHours} h kalendarzowych`],['Zamknięcie oferty',o=>date(o.data.closesAt)]
      ];
      html = `<h1>Porównaj warunki, wybierz swój kierunek.</h1><p>Nie sumujemy pieniędzy i czasu w ocenę życia. Sprawdź podstawę i okres wynagrodzenia; nie każdy wariant jest bezpośrednio porównywalny.</p>${data.length ? `<div class="f-table-wrap" tabindex="0" aria-label="Porównanie ofert"><table><thead><tr><th scope="col">Warunek</th>${data.map(({offer:o})=>`<th scope="col">${esc(o.data.role)}<br>${esc(o.company)}${button('compare-remove','Usuń',o.id)}</th>`).join('')}</tr></thead><tbody>${rows.map(([title,render])=>`<tr><th scope="row">${title}</th>${data.map(({offer:o,economics:e})=>`<td>${esc(render(o,e))}${e && e.offerVersion !== o.version && ['Brutto / faktura','Szacowane netto','Po kosztach dojazdu','Dojazd — koszt','Dojazd — minuty dziennie','Transport scenariusza','Źródło prywatnego szacunku','Data źródła szacunku','Założenia szacunku','Wersja kalkulacji'].includes(title) ? '<small>Scenariusz dotyczy wcześniejszej wersji.</small>' : ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : empty('Wybierz oferty do porównania','Dodawaj je ze szczegółów oferty. Wybór pozostaje w tej sesji.')}`;
    } else if (page === 'attempts') {
      if (id) { const a = await api<Attempt>(`/attempts/${id}`); currentAttempt = a; html = attemptView(a); }
      else html = `<h1>Twoje assessmenty</h1>${attemptLinks((await api<{attempts:Attempt[]}>('/attempts')).attempts)}`;
    } else if(page==='assessment-edit') {
      const d=await api<{id:string;version:number;content:string;offer_id:string}>(`/assessments/${id}/versions/${version}`);
      html=assessmentEditor(d.id,d.version,JSON.parse(d.content) as AssessmentDefinition,d.offer_id)+`<p><a href="#assessment-correction/${esc(d.id)}/${d.version}">Przejrzyj wspólną korektę klucza tej wersji</a></p>`;
    } else if(page==='assessment-correction') {
      const d=await api<{id:string;version:number;content:string;state:string}>(`/assessments/${id}/versions/${version}`),content=JSON.parse(d.content) as AssessmentDefinition;
      const draft=keyDraft?.id===id&&keyDraft.version===d.version?keyDraft:null;
      html=`<h1>Wspólna korekta klucza</h1><p>Zachowa oryginalny test, odpowiedzi, wyniki i decyzje. Przeliczy wszystkie aktualne zatwierdzone wyniki tej wersji według wspólnego klucza. Nieważne wyniki pozostaną nieważne. Nowe próby wymagają potem nowej zatwierdzonej wersji.</p>${form('key-preview',`<input type="hidden" name="version" value="${d.version}">`+(content.tasks as Array<AssessmentDefinition['tasks'][number]&{id:string}>).map(t=>`<fieldset><legend>${esc(t.prompt)}</legend><ol>${t.options.map(o=>`<li>${esc(o)}</li>`).join('')}</ol>${input(t.id,'Numery uznanych odpowiedzi (od 1), oddzielone przecinkami',draft?.acceptedOptions[t.id]?.map(n=>n+1).join(',')??String(t.answer+1),'text','required')}</fieldset>`).join('')+area('reason','Uzasadnienie wspólnej korekty widoczne dla kandydatów',draft?.reason??'','required minlength="10" maxlength="1000"'),'Pokaż skutki korekty',id)}${draft?`<section class="f-card"><h2>Podgląd całej grupy</h2><p>Wyników do korekty: ${draft.preview.affected}. Indywidualnych korekt: ${draft.preview.manualCount}.</p>${draft.preview.attempts.map((a,i)=>`<p>Próba ${i+1}: ${esc(label(a.state))}, ${esc(a.validity??'bez wyniku')} · ${a.before??'brak'} → ${a.after??'bez zmiany'}${a.individualAmendment?' · indywidualna korekta':''}</p>`).join('')}${draft.preview.blocked?'<p role="status">Istnieją aktywne lub nieprzejrzane próby. Korekta jest zablokowana do ich rozpatrzenia.</p>':form('key-apply',check('confirmed','Potwierdzam wspólny klucz i skutki dla pokazanej grupy.')+(draft.preview.manualCount?check('replaceIndividualAmendments','Potwierdzam zastąpienie indywidualnych korekt wspólnym kluczem; historia pozostanie.'):'')+'<p>Zmiana grupy po podglądzie wymaga ponownego przeglądu.</p>','Zastosuj wspólną korektę',id)}</section>`:''}`;
    } else if (page === 'assessment-create' || page === 'assessment-assign') {
      const process = page === 'assessment-assign' ? await api<Process>(`/processes/${id}`) : null;
      const offerId = process?.offerId ?? id;
      const definitions = (await api<{assessments:Array<{id:string;version:number;state:string;content:string}>}>(`/offers/${offerId}/assessments`)).assessments;
      const latest=new Map<string,number>(); for(const d of definitions)latest.set(d.id,Math.max(latest.get(d.id)??0,d.version));
      html = `<h1>${process ? 'Przypisz assessment' : 'Assessmenty rekrutacji'}</h1><p>Każda wersja wymaga review. Kandydat pozna liczbę zadań, limit i deadline przed rozpoczęciem.</p>${definitions.map(d=>`<section class="f-card"><h2>${esc((JSON.parse(d.content) as {title:string}).title)}</h2>${chip(label(d.state))}<p>Wersja ${d.version}</p>${!process?assessmentReview(JSON.parse(d.content) as AssessmentDefinition):''}${!process&&latest.get(d.id)===d.version?`<a class="f-button" href="#assessment-edit/${esc(d.id)}/${d.version}">Utwórz nową wersję</a>`:''}${process && d.state === 'APPROVED' && latest.get(d.id)===d.version ? form('assessment-assign', `<input type="hidden" name="expectedVersion" value="${process.revision}"><input type="hidden" name="assessmentId" value="${esc(d.id)}"><input type="hidden" name="version" value="${d.version}">` + input('deadline','Termin wykonania','','datetime-local'), 'Przypisz',process.id) : !process && d.state !== 'APPROVED' && latest.get(d.id)===d.version ? form('assessment-approve', `<input type="hidden" name="version" value="${d.version}"><input type="hidden" name="action" value="${d.state === 'DRAFT' ? 'REVIEW' : 'APPROVE'}">` + check('confirmed','Sprawdziłem treść, klucz odpowiedzi, limit czasu i prawa do zadania.'),d.state === 'DRAFT' ? 'Przekaż do review' : 'Zatwierdź',d.id) : ''}</section>`).join('') || '<p>Nie ma jeszcze assessmentów.</p>'}${!process ? `<section class="f-card"><h2>Nowy quiz — szkic</h2>${form('assessment-create', input('title','Nazwa') + input('timeLimitMinutes','Limit czasu (minuty)',15,'number','required min="1" max="480"') + input('expectedMinutes','Przewidywany czas (minuty)',10,'number','required min="1" max="480"') + input('rubricVersion','Oznaczenie kryteriów oceny','1') + area('prompt','Treść zadania') + area('options','Odpowiedzi — jedna w wierszu') + input('answer','Numer poprawnej odpowiedzi (od 1)',1,'number','required min="1" max="8"') + input('points','Punkty',1,'number','required min="1" max="100"'),'Zapisz szkic',offerId)}</section>` : ''}`;
    } else if (page === 'notifications') {
      const data = await api<{notifications:Array<{message:string;created_at:string;entity_type:string;entity_id:string}>}>('/notifications');
      html = `<h1>Dzisiaj w Twoim Faro</h1>${data.notifications.map(n=>`<article class="f-card"><p>${esc(n.message)}</p><small>${esc(date(n.created_at))}</small><br><a href="#${n.entity_type === 'offer' ? 'offers':n.entity_type==='case'?'cases':n.entity_type==='organization'?'restrictions':'processes'}/${esc(n.entity_id)}">Otwórz szczegóły</a></article>`).join('') || empty('Jesteś na bieżąco','Aktualizacje pojawią się tutaj, gdy zmieni się oferta lub Twój proces.')}`;
    } else if (page === 'cases') {
      const data = await api<{cases:Array<{id:string;kind:string;state:string;revision:number;statement:string|null;decision:string|null;canModerate:boolean;explanation_due_at:string|null;explanations:Array<{participant:string;statement:string;created_at:string}>}>}>('/cases');
      html = `<h1>Zgłoszenia i przegląd</h1><p>Wyjaśnienia są prywatne. Moderator widzi materiał obu stron; druga strona otrzymuje stan i ustrukturyzowany powód decyzji.</p>${data.cases.map(c=>{
        const version=`<input type="hidden" name="expectedVersion" value="${c.revision}">`,bilateral=['NO_SHOW_CASE','INTERVIEW_DISCREPANCY'].includes(c.kind);
        const reviewStates=({OPEN:['EVIDENCE_REVIEW'],EVIDENCE_REVIEW:['ACTION','NO_ACTION'],APPEAL:['RESOLVED'],ACTION:['RESOLVED'],NO_ACTION:['RESOLVED']} as Record<string,string[]>)[c.state]??[];
        const explanation=bilateral&&['OPEN','EVIDENCE_REVIEW','APPEAL'].includes(c.state)&&!c.canModerate?form('case-explain',version+area('statement','Twoje prywatne wyjaśnienie dla moderatora','','required minlength="10" maxlength="2000"'),'Przekaż wyjaśnienie',c.id):'';
        const appeal=['ACTION','NO_ACTION'].includes(c.state)&&!c.canModerate?form('appeal',version+area('statement','Prywatne uzasadnienie odwołania','','required minlength="10" maxlength="2000"'),'Zapisz odwołanie',c.id):'';
        const review=c.canModerate&&reviewStates.length?form('case-review',version+select('state','Etap przeglądu',reviewStates)+area('decision','Prywatne uzasadnienie decyzji','','required minlength="10" maxlength="1500"')+select('decisionCode','Powód udostępniany stronom',['PROCESS_VIOLATION_CONFIRMED','INSUFFICIENT_EVIDENCE','TECHNICAL_ISSUE','NO_VIOLATION_CONFIRMED','CASE_RESOLVED'])+input('reviewAt','Termin ponownego przeglądu','','datetime-local')+(bilateral?input('explanationDueAt','Termin na wyjaśnienia (przy rozpoczęciu review)','','datetime-local',''):'')+area('restorationCondition','Warunki ręcznego przywrócenia — przy ograniczeniu','','maxlength="1000"')+check('restrict','Wstrzymaj przyjmowanie nowych zgłoszeń przez organizację',false),'Zapisz przegląd',c.id):'';
        return `<article class="f-card"><h2>${esc(label(c.kind))}</h2>${chip(c.state)}<p>${esc(c.statement)}</p><p>${esc(label(c.decision??''))}</p>${c.explanation_due_at?`<p>Termin na wyjaśnienia: ${esc(date(c.explanation_due_at))}</p>`:''}${c.explanations.map(e=>`<details><summary>${esc(label(e.participant))} · ${esc(date(e.created_at))}</summary><p>${esc(e.statement)}</p></details>`).join('')}${explanation}${appeal}${review}</article>`;
      }).join('') || '<p>Brak zgłoszeń.</p>'}`;
    } else if (page === 'restrictions') {
      const selected=id||orgId;
      html=`<h1>Ograniczenia organizacji</h1><p>Przywrócenie wymaga niezależnego ręcznego przeglądu. Nie publikuje ofert ani nie zastępuje ponownej weryfikacji organizacji.</p>${form('restriction-open',input('organizationId','Identyfikator organizacji',selected),'Otwórz ograniczenia')}`;
      if(selected) {
        const result=await api<{restrictions:Array<{id:string;state:string;scope:string;revision:number;reasonCode:string;restorationCondition:string|null;reviewAt:string|null;appeal:string|null;restorationReason:string|null;canAppeal:boolean;canReview:boolean}>}>(`/organizations/${encodeURIComponent(selected)}/restrictions`);
        html+=result.restrictions.map(r=>`<section class="f-card"><h2>${r.state==='ACTIVE'?'Wstrzymane nowe zgłoszenia':'Ograniczenie zakończone'}</h2><p>${esc(r.reasonCode)}</p><p>Warunki przywrócenia: ${esc(r.restorationCondition??'Wymaga odtworzenia warunków w ręcznym przeglądzie historycznego ograniczenia.')}</p><p>Termin przeglądu: ${esc(date(r.reviewAt))}</p>${r.appeal?`<p>Odwołanie: ${esc(r.appeal)}</p>`:''}${r.restorationReason?`<p>Uzasadnienie przywrócenia: ${esc(r.restorationReason)}</p>`:''}${r.canAppeal?form('restriction-appeal',`<input type="hidden" name="expectedVersion" value="${r.revision}">`+area('reason','Uzasadnienie odwołania — bez danych osobowych','','required minlength="10" maxlength="1500"'),'Przekaż odwołanie',r.id):''}${r.canReview?form('restriction-restore',`<input type="hidden" name="expectedVersion" value="${r.revision}">`+area('reason','Uzasadnienie ręcznego przywrócenia — bez danych osobowych','','required minlength="10" maxlength="1500"')+check('confirmed','Potwierdzam niezależny przegląd dowodów i warunków przywrócenia.'),'Zakończ to ograniczenie',r.id):''}</section>`).join('')||'<p>Brak ograniczeń.</p>';
      }
    } else if (page === 'privacy') {
      const consent=await api<{consents:Array<{type:string;granted:boolean}>}>('/api/consents');
      html = `<h1>Twoje dane i wybory</h1><section class="f-card"><h2>Udostępnienie pod Twoją kontrolą</h2><p>Obserwowane oferty i kalkulacje pozostają prywatne. Telefon udostępniasz osobno w konkretnym procesie i możesz cofnąć zgodę.</p><p>Faro jest bezpłatne dla obu stron. Plan rozliczeń nie wpływa na kolejność ofert ani matching.</p><a href="/privacy.html">Informacja o prywatności</a><div class="f-actions">${button('export','Pobierz moje dane')}</div></section><section class="f-card"><h2>Opcjonalna analityka</h2>${form('analytics',`<label class="f-check"><input type="checkbox" name="granted" ${consent.consents.some(c=>c.type==='ANALYTICS' && c.granted)?'checked':''}>Zgadzam się na opcjonalną analitykę produktu.</label>`,'Zapisz wybór')}</section><section class="f-card"><h2>Wyloguj wszystkie urządzenia</h2><p>Unieważnisz wszystkie sesje, także tę. Zapisane dane pozostaną.</p>${form('revoke-sessions',input('password','Aktualne hasło','','password','required autocomplete="current-password"')+check('confirmed','Potwierdzam wylogowanie wszystkich urządzeń.'),'Wyloguj wszystkie urządzenia')}</section><section class="f-card"><h2>Usuń konto</h2><p>Usuniemy Twoje konto, profil, zgłoszenia, odpowiedzi, obserwowane oferty i kalkulacje. Operacja jest nieodwracalna. Jeśli zarządzasz zespołem, najpierw przekaż własność organizacji. Oferty organizacji, której jesteś jedynym członkiem, zostaną zamknięte.</p>${form('delete-account',input('confirmation','Wpisz USUŃ KONTO','','text','required autocomplete="off"') + input('password','Aktualne hasło','','password','required autocomplete="current-password"') + check('confirmed','Rozumiem skutki usunięcia konta.'),'Usuń moje konto')}</section>`;
    } else html = empty('Nie znaleziono widoku','Wybierz pozycję w nawigacji.');
    if (mine !== epoch) return;
    $('#f-content').innerHTML = html; finish(mine);
    if (currentAttempt?.state === 'STARTED' && currentAttempt.expiresAt) {
      const end = Date.parse(currentAttempt.expiresAt), server = Date.parse(currentAttempt.serverNow), started = performance.now();
      const tick = () => { const element = $('#f-timer'); if (!element) return; const seconds = Math.max(0,Math.ceil((end-server-(performance.now()-started))/1000)); element.textContent = seconds ? `Pozostało ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}` : 'Czas upłynął. Serwer zweryfikuje zapis.'; };
      tick(); timer = setInterval(tick,1000);
    }
  } catch (e) {
    if (mine !== epoch || (e as Error).name === 'AbortError') return;
    $('#f-content').innerHTML = empty('Nie udało się wczytać danych',(e as Error).message) + button('retry','Spróbuj ponownie'); finish(mine);
  }
}
function finish(mine: number) { if (mine !== epoch) return; $('#f-content').setAttribute('aria-busy','false'); $('#f-content').focus({preventScroll:true}); }
function attemptLinks(items: Attempt[]) { return items.map(a=>`<a class="f-offer-card" href="#attempts/${a.id}"><div><h3>${esc(a.title)}</h3>${chip(label(a.state))}<p>Termin: ${esc(date(a.deadline))}</p></div></a>`).join('') || '<p>Brak zaproszeń do assessmentów.</p>'; }

root.addEventListener('change', event => {
  const el = event.target as HTMLSelectElement;
  if (el.id === 'f-role') { role = el.value === 'employer' ? 'employer' : 'candidate'; filter=''; modelFilter=''; navigate(role === 'employer' ? 'employer':'offers'); }
  if (el.id === 'f-org') { orgId=el.value; void render(); }
});
root.addEventListener('click', event => {
  if ((event.target as Element).closest('.f-skip')) { event.preventDefault(); $('#f-content').focus(); return; }
  const el = (event.target as Element).closest<HTMLButtonElement>('button[data-action]');
  if (!el || el.disabled) return;
  const action = el.dataset.action!, id = el.dataset.id!, mine = epoch; el.disabled = true;
  void (async () => {
    try {
      if(action==='assessment-add-task') {
        const tasks=$('#f-assessment-tasks'),items=Array.from(tasks.querySelectorAll<HTMLElement>('[data-assessment-task]'));
        if(items.length>=50)throw new Error('Assessment może zawierać do 50 zadań.');
        const index=Math.max(-1,...items.map(t=>Number(t.dataset.assessmentTask)))+1;
        tasks.insertAdjacentHTML('beforeend',assessmentTask(index));tasks.querySelector(`[name="prompt:${index}"]`)?.scrollIntoView({block:'nearest'});return;
      }
      if(action==='assessment-remove-task') {
        const task=el.closest('[data-assessment-task]');if(task?.parentElement?.children.length===1)throw new Error('Assessment wymaga przynajmniej jednego zadania.');task?.remove();return;
      }
      if (action === 'logout') { await api('/api/auth/logout','POST',{}); loggedOut(); location.hash=''; return; }
      if (action === 'retry') { await render(); return; }
      if (action === 'compare-add') { if (compared.size >= 4 && !compared.has(id)) throw new Error('Porównuj do 4 ofert jednocześnie.'); compared.add(id); notify('Oferta dodana. Otwórz Porównanie.'); return; }
      if (action === 'compare-remove') compared.delete(id);
      if(action==='watch-mute'||action==='watch-enable')await api(`/offers/${id}/watch`,'PUT',{alerts:action==='watch-enable'});
      if (action === 'watch' || action === 'unwatch') await api(`/offers/${id}/watch`,action === 'watch' ? 'POST':'DELETE',{});
      if (action === 'revoke-claim') await api(`/claims/${id}`,'DELETE',{});
      if (action === 'revoke-member') await api(`/organizations/${orgId}/members/${id}`,'DELETE',{});
      if (action === 'export') {
        const data=await api('/api/export'); if(mine!==epoch)return;
        const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
        const link=document.createElement('a'); link.href=url; link.download='faro-moje-dane.json'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); notify('Przygotowano eksport Twoich danych.'); return;
      }
      if(action==='interview-calendar') {
        const data=await api<{filename:string;content:string}>(`/interviews/${id}/calendar`);if(mine!==epoch)return;
        const url=URL.createObjectURL(new Blob([data.content],{type:'text/calendar;charset=utf-8'}));
        const link=document.createElement('a');link.href=url;link.download=data.filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
      }
      if (action === 'reject-proposal') await api(`/proposals/${id}`,'POST',{status:'REJECTED'});
      if (action === 'preview' || action === 'interest-preview') {
        const p = await api<{projection:Projection;confirmationToken:string}>('/profile/preview-confirmation'); if (mine !== epoch) return;
        const previous=currentOffer?.ownInterest;
        const content = `<h2>Tak wygląda Twój profil dla pracodawcy</h2>${projection(p.projection)}${action === 'interest-preview' ? form('interest',`<input type="hidden" name="confirmationToken" value="${esc(p.confirmationToken)}">`+check('projectionConfirmed','Potwierdzam udostępnienie powyższych danych w tej rekrutacji.')+(previous?`<input type="hidden" name="previousInterestId" value="${esc(previous.id)}">`+check('renewalConfirmed','Rozpoczynam nowy proces. Poprzednie zgłoszenie i historia pozostają zapisane.'):'') ,'Zgłoś zainteresowanie',id) : ''}`;
        const dialog = document.createElement('dialog'); dialog.className='faro f-dialog'; dialog.innerHTML = `<div>${button('close-dialog','Zamknij')}${content}</div>`; root.append(dialog); dialog.showModal(); dialog.addEventListener('close',()=>dialog.remove(),{once:true}); return;
      }
      if (action === 'close-dialog') { el.closest('dialog')?.close(); return; }
      if(action==='grant-phone') {
        const p=await api<{phone:string;confirmationToken:string}>(`/processes/${id}/phone-preview`);if(mine!==epoch)return;
        const dialog=document.createElement('dialog');dialog.className='faro f-dialog';dialog.setAttribute('aria-labelledby','f-phone-title');
        dialog.innerHTML=`<div>${button('close-dialog','Zamknij')}<h2 id="f-phone-title">Udostępnij telefon tej rekrutacji</h2><p>Pracodawca otrzyma numer: <strong>${esc(p.phone)}</strong></p><p>Możesz cofnąć dostęp. Zmiana numeru w profilu wycofa dotychczasowe zgody; nowy numer wymaga osobnego potwierdzenia.</p>${form('phone-grant',`<input type="hidden" name="confirmationToken" value="${esc(p.confirmationToken)}">`+check('phoneConfirmed','Potwierdzam udostępnienie powyższego numeru w tej rekrutacji.'),'Potwierdź udostępnienie',id)}</div>`;
        root.append(dialog);dialog.showModal();dialog.addEventListener('close',()=>dialog.remove(),{once:true});return;
      }
      if(action==='revoke-phone')await api(`/processes/${id}/phone-grant`,'DELETE',{});
      if (action === 'read-phone') { const data = await api<{phone:string}>(`/processes/${id}/phone`); if (mine === epoch) notify(`Udostępniony numer: ${data.phone}`); return; }
      if (action === 'attempt-start') await api(`/attempts/${id}`,'POST',{});
      if (mine === epoch) await render();
    } catch (e) { if (mine === epoch && (e as Error).name !== 'AbortError') notify((e as Error).message,true); }
    finally { el.disabled=false; }
  })();
});
root.addEventListener('submit', event => {
  const el = event.target as HTMLFormElement; if (!el.dataset.form) return; event.preventDefault();
  const f = new FormData(el), action = el.dataset.form, id = el.dataset.id ?? '', mine = epoch;
  const fields = el.querySelector('fieldset'); if (fields?.disabled) return; if (fields) fields.disabled=true;
  void (async () => {
    try {
      let destination = '';
      if (action === 'filter') { filter=value(f,'query'); modelFilter=value(f,'model');includeUnknown=f.has('includeUnknown'); }
      else if (action === 'profile') await api('/profile','PUT',{firstName:value(f,'firstName'),phone:value(f,'phone'),expectedVersion:number(f,'version'),availability:{kind:value(f,'availability'),value:value(f,'availabilityValue')}});
      else if(action==='constraints')await api('/profile/constraints','PUT',{expectedVersion:number(f,'expectedVersion'),constraints:{active:f.has('active'),workModels:f.getAll('workModels'),contracts:f.getAll('contracts'),noNights:f.has('noNights'),noWeekends:f.has('noWeekends'),maxCommuteMinutes:f.has('commuteEnabled')?number(f,'maxCommuteMinutes'):null,salaryMinimum:f.has('salaryEnabled')?{amount:Math.round(number(f,'salaryMinimum')*100),currency:'PLN',basis:value(f,'salaryBasis'),period:value(f,'salaryPeriod'),hoursPerPeriod:number(f,'salaryHours'),ftePercent:number(f,'salaryFte')}:null}});
      else if(action==='phone-grant') {await api(`/processes/${id}/phone-grant`,'POST',{phoneConfirmed:f.has('phoneConfirmed'),confirmationToken:f.get('confirmationToken')});el.closest('dialog')?.close();}
      else if (action === 'claim') await api('/claims','POST',claim(f));
      else if (action === 'learning') await api('/learning','POST',{skillId:value(f,'skillId'),mode:value(f,'mode'),practice:practice(f)});
      else if (action === 'activity') await api('/activities','POST',{description:value(f,'description'),source:value(f,'source')});
      else if (action === 'proposal') await api(`/proposals/${id}`,'POST',{...claim(f),status:'ACCEPTED'});
      else if (action === 'organization') { const o = await api<{id:string}>('/organizations','POST',{name:value(f,'name')}); orgId=o.id; }
      else if (action === 'accept-invite') await api('/invites/accept','POST',{token:value(f,'token')});
      else if (action === 'invite') { const data = await api<{token:string}>(`/organizations/${id}/invites`,'POST',{email:value(f,'email'),role:value(f,'role')}); if (mine === epoch) el.querySelector('.f-form-message')!.textContent=`Kod ważny 72 godziny: ${data.token}`; return; }
      else if (action === 'verify-org') await api(`/organizations/${encodeURIComponent(value(f,'organizationId'))}/verify`,'POST',{note:value(f,'note')});
      else if (action === 'transfer-owner') await api(`/organizations/${id}/owner`,'POST',{successorId:value(f,'successorId'),password:value(f,'password')});
      else if (action === 'analytics') await api('/api/consents/analytics','PUT',{granted:f.has('granted')});
      else if(action==='revoke-sessions') {await api('/sessions/revoke-all','POST',{password:String(f.get('password')??''),confirmed:f.has('confirmed')});loggedOut();location.hash='';$('#authMessage').textContent='Wszystkie sesje zostały wylogowane.';return;}
      else if (action === 'delete-account') { await api('/api/account','DELETE',{confirmation:value(f,'confirmation'),password:value(f,'password')}); loggedOut(); location.hash=''; $('#authMessage').textContent='Konto i dane zostały usunięte.'; return; }
      else if (action === 'offer') {
        const prior=currentOffer, contract=value(f,'contract');
        const data: OfferData = { role:value(f,'role'), responsibilities:value(f,'responsibilities').split('\n').filter(Boolean), location:value(f,'location'), workModel:value(f,'workModel'), remoteDays:number(f,'remoteDays'), salary:[{ contract, basis:({UOP:'GROSS_EMPLOYMENT',CIVIL:'GROSS_CIVIL',B2B:'B2B_NET_INVOICE_EXCL_VAT'} as Record<string,string>)[contract]!, min:Math.round(number(f,'salaryMin')*100),max:Math.round(number(f,'salaryMax')*100),currency:'PLN',period:value(f,'period'),variable:value(f,'variable'),hoursPerPeriod:number(f,'hoursPerPeriod'),ftePercent:number(f,'ftePercent')},...(prior?.data.salary.slice(1)??[])], requirements:skills.filter(s=>value(f,`kind:${s.id}`)!=='Pomijam').map(s=>({id:prior?.data.requirements.find(r=>r.skillId===s.id)?.id ?? crypto.randomUUID(),skillId:s.id,kind:value(f,`kind:${s.id}`),level:value(f,`level:${s.id}`),rationale:value(f,`why:${s.id}`)})), hours:value(f,'hours'),shifts:value(f,'shifts'),nights:value(f,'nights')==='Nie określono'?null:value(f,'nights')==='Tak',weekends:value(f,'weekends')==='Nie określono'?null:value(f,'weekends')==='Tak',learningSupport:value(f,'learningSupport'),responseHours:number(f,'responseHours'),decisionHours:number(f,'decisionHours'),stages:value(f,'stages').split('\n').filter(Boolean),assessmentMinutes:number(f,'assessmentMinutes'),interviewCount:number(f,'interviewCount'),closesAt:toDate(value(f,'closesAt')),recruiterId:value(f,'recruiterId') };
        const o=await api<Offer>(id?`/offers/${id}`:`/organizations/${orgId}/offers`,id?'PUT':'POST',id?{data,expectedVersion:prior?.revision}:data); destination=`employer/${o.id}`;
      } else if (action === 'lifecycle') await api(`/offers/${id}/lifecycle`,'POST',{action:value(f,'action'),confirmed:f.has('confirmed'),expectedVersion:currentOffer?.revision});
      else if (action === 'interest') { const p=await api<{id:string}>(`/offers/${id}/interest`,'POST',{offerVersion:currentOffer?.version,projectionConfirmed:f.has('projectionConfirmed'),confirmationToken:f.get('confirmationToken'),previousInterestId:f.get('previousInterestId'),renewalConfirmed:f.has('renewalConfirmed'),idempotencyKey:crypto.randomUUID()}); destination=`processes/${p.id}`; }
      else if (action === 'process-command') { const command=value(f,'command'); await api(`/processes/${id}/commands`,'POST',{command,expectedVersion:currentProcess?.revision,idempotencyKey:crypto.randomUUID(),reason:{code:value(f,'reason'),requirementId:value(f,'requirementId')},nextAction:value(f,'nextAction'),dueAt:value(f,'dueAt')?toDate(value(f,'dueAt')):null,question:{topic:value(f,'questionTopic'),requirementId:value(f,'questionRequirementId')},response:{kind:value(f,'responseKind'),level:value(f,'level'),source:value(f,'source'),practice:practice(f),availability:{kind:value(f,'availabilityKind'),value:value(f,'availabilityKind')==='AFTER_PERIOD'?number(f,'availabilityValue'):value(f,'availabilityValue')}},confirmed:f.has('confirmed'),explanation:value(f,'explanation')}); }
      else if(action==='interview-propose') await api(`/processes/${id}/interviews`,'POST',{startsAt:toDate(value(f,'startsAt')),endsAt:toDate(value(f,'endsAt')),confirmBy:toDate(value(f,'confirmBy')),timezone:'Europe/Warsaw',location:value(f,'location'),meetingUrl:value(f,'meetingUrl'),confirmed:f.has('confirmed'),expectedVersion:currentProcess?.revision,idempotencyKey:crypto.randomUUID()});
      else if(action==='interview-change') await api(`/interviews/${id}`,'POST',{command:value(f,'command'),reason:value(f,'reason'),confirmed:f.has('confirmed'),expectedVersion:interviews.find(i=>i.id===id)?.revision,processVersion:currentProcess?.revision,idempotencyKey:crypto.randomUUID()});
      else if (action === 'report') await api(`/processes/${id}/reports`,'POST',{kind:value(f,'kind'),statement:value(f,'statement'),idempotencyKey:crypto.randomUUID()});
      else if (action === 'appeal'||action==='case-explain') await api(`/cases/${id}/${action==='appeal'?'appeal':'explanations'}`,'POST',{statement:value(f,'statement'),expectedVersion:number(f,'expectedVersion'),idempotencyKey:crypto.randomUUID()});
      else if (action === 'case-review') await api(`/cases/${id}/review`,'POST',{state:value(f,'state'),decision:value(f,'decision'),decisionCode:value(f,'decisionCode'),reviewAt:toDate(value(f,'reviewAt')),explanationDueAt:value(f,'explanationDueAt')?toDate(value(f,'explanationDueAt')):null,restrict:f.has('restrict'),restorationCondition:value(f,'restorationCondition'),expectedVersion:number(f,'expectedVersion'),idempotencyKey:crypto.randomUUID()});
      else if (action === 'economics') await api(`/offers/${id}/economics`,'PUT',{salaryOptionIndex:number(f,'salaryOptionIndex'),netPeriod:currentOffer?.data.salary[number(f,'salaryOptionIndex')]?.period,commuteCostPeriod:currentOffer?.data.salary[number(f,'salaryOptionIndex')]?.period,commuteTimeBasis:'ROUND_TRIP_MINUTES_PER_WORK_DAY',netMin:value(f,'netMin')?Math.round(number(f,'netMin')*100):null,netMax:value(f,'netMax')?Math.round(number(f,'netMax')*100):null,commuteCost:value(f,'commuteCost')?Math.round(number(f,'commuteCost')*100):null,commuteMinutes:value(f,'commuteMinutes')?number(f,'commuteMinutes'):null,transport:value(f,'transport'),source:value(f,'source'),observedAt:toDate(value(f,'observedAt')),assumptions:value(f,'assumptions')});
      else if (action === 'assessment-create') await api(`/offers/${id}/assessments`,'POST',{title:value(f,'title'),timeLimitMinutes:number(f,'timeLimitMinutes'),expectedMinutes:number(f,'expectedMinutes'),rubricVersion:value(f,'rubricVersion'),tasks:[{prompt:value(f,'prompt'),options:value(f,'options').split('\n').filter(Boolean),answer:number(f,'answer')-1,points:number(f,'points')}]});
      else if(action==='assessment-edit') {
        const tasks=Array.from(el.querySelectorAll<HTMLElement>('[data-assessment-task]')).map(t=>{const n=t.dataset.assessmentTask!;return {prompt:value(f,`prompt:${n}`),options:value(f,`options:${n}`).split('\n').filter(Boolean),answer:number(f,`answer:${n}`)-1,points:number(f,`points:${n}`)};});
        await api<{id:string;version:number;state:string}>(`/assessments/${id}/versions/${number(f,'expectedVersion')}`,'PUT',{expectedVersion:number(f,'expectedVersion'),idempotencyKey:crypto.randomUUID(),data:{title:value(f,'title'),timeLimitMinutes:number(f,'timeLimitMinutes'),expectedMinutes:number(f,'expectedMinutes'),rubricVersion:value(f,'rubricVersion'),tasks}});
        destination=`assessment-create/${value(f,'offerId')}`;
      }
      else if (action === 'assessment-approve') await api(`/assessments/${id}/versions/${number(f,'version')}`,'POST',{action:value(f,'action'),confirmed:f.has('confirmed')});
      else if (action === 'assessment-assign') { await api(`/processes/${id}/assessment`,'POST',{assessmentId:value(f,'assessmentId'),version:number(f,'version'),deadline:toDate(value(f,'deadline')),expectedVersion:number(f,'expectedVersion'),idempotencyKey:crypto.randomUUID()}); destination=`processes/${id}`; }
      else if (action === 'attempt-answers') {
        const answers:Record<string,number>={}; for(const task of currentAttempt?.tasks ?? []) if(f.has(task.id)) answers[task.id]=number(f,task.id);
        const submit=value(f,'operation')==='Prześlij do oceny'; await api(`/attempts/${id}/${submit?'submit':'answers'}`,submit?'POST':'PUT',{answers,expectedVersion:currentAttempt?.revision});
      } else if (action === 'attempt-review') await api(`/attempts/${id}/review`,'POST',{note:value(f,'note'),confirmed:f.has('confirmed'),expectedVersion:currentAttempt?.revision,processVersion:currentAttempt?.processVersion,idempotencyKey:crypto.randomUUID()});
      if(action==='attempt-incident')await api(`/attempts/${id}/incident`,'POST',{category:value(f,'category'),statement:value(f,'statement'),confirmed:f.has('confirmed'),expectedVersion:currentAttempt?.revision,processVersion:currentAttempt?.processVersion,idempotencyKey:crypto.randomUUID()});
      if(action==='restriction-open')destination=`restrictions/${encodeURIComponent(value(f,'organizationId'))}`;
      if(action==='restriction-appeal'||action==='restriction-restore')await api(`/restrictions/${id}/${action==='restriction-appeal'?'appeal':'restore'}`,'POST',{expectedVersion:number(f,'expectedVersion'),reason:value(f,'reason'),confirmed:f.has('confirmed'),idempotencyKey:crypto.randomUUID()});
      if(action==='attempt-incident-resolve')await api(`/attempts/${id}/incident/resolve`,'POST',{resolution:value(f,'resolution'),reason:value(f,'reason'),confirmed:f.has('confirmed'),expectedVersion:currentAttempt?.revision,processVersion:currentAttempt?.processVersion,incidentVersion:currentAttempt?.incident?.revision,idempotencyKey:crypto.randomUUID()});
      if(action==='attempt-retry') { const next=await api<Attempt>(`/attempts/${id}/retry`,'POST',{reason:value(f,'reason'),deadline:toDate(value(f,'deadline')),confirmed:f.has('confirmed'),expectedVersion:currentAttempt?.revision,processVersion:currentAttempt?.processVersion,idempotencyKey:crypto.randomUUID()});destination=`attempts/${next.id}`; }
      if(action==='attempt-invalidate')await api(`/attempts/${id}/invalidate-result`,'POST',{reasonCode:value(f,'reasonCode'),reason:value(f,'reason'),confirmed:f.has('confirmed'),expectedVersion:currentAttempt?.revision,processVersion:currentAttempt?.processVersion,idempotencyKey:crypto.randomUUID()});
      if(action==='attempt-amend') {const scores:Record<string,number|null>={};for(const t of currentAttempt?.reviewTasks??[])scores[t.id]=t.chosenOption===null?null:number(f,t.id);await api(`/attempts/${id}/amend-result`,'POST',{scores,reason:value(f,'reason'),confirmed:f.has('confirmed'),expectedVersion:currentAttempt?.revision,processVersion:currentAttempt?.processVersion,idempotencyKey:crypto.randomUUID()});}
      if(action==='key-preview') {const acceptedOptions:Record<string,number[]>={};for(const [name,v] of f.entries())if(name.startsWith('task-'))acceptedOptions[name]=String(v).split(',').map(n=>Number(n.trim())-1);const version=number(f,'version'),reason=value(f,'reason'),preview=await api<KeyPreview>(`/assessments/${id}/versions/${version}/key-correction/preview`,'POST',{acceptedOptions,reason});keyDraft={id,version,reason,acceptedOptions,preview};}
      if(action==='key-apply') {if(!keyDraft||keyDraft.id!==id)throw new Error('Najpierw wykonaj podgląd.');await api(`/assessments/${id}/versions/${keyDraft.version}/key-correction`,'POST',{reason:keyDraft.reason,acceptedOptions:keyDraft.acceptedOptions,previewToken:keyDraft.preview.token,confirmed:f.has('confirmed'),replaceIndividualAmendments:f.has('replaceIndividualAmendments'),idempotencyKey:crypto.randomUUID()});keyDraft=null;destination='attempts';}
      if (mine !== epoch) return;
      if(destination) navigate(destination); else { await render(); notify('Zapisano.'); }
    } catch(e) { if(mine === epoch && (e as Error).name !== 'AbortError') { const message=el.querySelector('.f-form-message'); if(message) message.textContent=(e as Error).message; else notify((e as Error).message,true); } }
    finally { if(fields) fields.disabled=false; }
  })();
});
document.querySelectorAll<HTMLElement>('[data-auth-tab]').forEach(tab=>tab.addEventListener('click',()=>{
  const register=tab.dataset.authTab==='register'; $('#registerForm').classList.toggle('hidden',!register); $('#loginForm').classList.toggle('hidden',register);
  document.querySelectorAll('[data-auth-tab]').forEach(t=>t.classList.toggle('active',t===tab)); $('#authMessage').textContent='';
}));
for(const id of ['loginForm','registerForm']) $<HTMLFormElement>(`#${id}`).addEventListener('submit',event=>{
  event.preventDefault(); const el=event.currentTarget as HTMLFormElement, f=new FormData(el), submit=el.querySelector<HTMLButtonElement>('button[type=submit]')!;
  if(submit.disabled)return; submit.disabled=true; $('#authMessage').textContent='Trwa logowanie…';
  void (async()=>{try{await api(`/api/auth/${id==='loginForm'?'login':'register'}`,'POST',{email:value(f,'email'),password:value(f,'password'),name:value(f,'name'),acceptTerms:f.has('acceptTerms'),acceptPrivacy:f.has('acceptPrivacy'),analyticsConsent:f.has('analyticsConsent')}); el.reset(); $('#authMessage').textContent=''; await bootstrap();}catch(e){$('#authMessage').textContent=(e as Error).message;}finally{submit.disabled=false;}})();
});
window.addEventListener('hashchange',()=>{if(user)void render();});
window.addEventListener('offline',()=>notify('Jesteś offline. Zmiany wymagają połączenia z serwerem.',true));
window.addEventListener('pagehide',()=>{controller.abort();clearInterval(timer);});
if('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js').catch(()=>{});
root.replaceChildren(); void bootstrap();

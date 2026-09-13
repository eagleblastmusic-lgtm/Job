export {};

type FeatureResponse = { features: { job_feed?: boolean } };
type MeResponse = { profile?: { desiredRoles?: string[]; location?: string | null; commuteKm?: number | null } };
type SearchProvider = {
  key: string;
  label: string;
  homepageUrl: string;
  searchMode: 'OUTBOUND_SEARCH' | 'DIRECT_CAREER_PAGES';
  ingestionStatus: 'PARTNER_REQUIRED' | 'PERMITTED_SOURCE_REQUIRED';
  searchUrl: string | null;
  canIngestAutomatically: boolean;
  notes: string;
  checkedAt: string;
};
type SearchJob = {
  jobId: string;
  title: string | null;
  company: string | null;
  location: string | null;
  sourceKeys: string[];
  sourceUrl: string | null;
  freshness: string;
  decisionState: { recommendation: string | null; override: string | null };
};
type SearchResponse = {
  criteria: { query: string; location: string | null; radiusKm: number | null };
  providers: SearchProvider[];
  localJobs: SearchJob[];
  externalSearchCount: number;
  automaticIngestionCount: number;
  boundary: string;
};

async function api<T>(path: string): Promise<T> {
  const response = await fetch(path);
  const data = await response.json().catch(() => ({})) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message ?? `HTTP ${response.status}`);
  return data;
}

function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));
}

function formatDate(value: string | null): string {
  if (!value) return 'brak daty';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium' }).format(date);
}

function ingestionLabel(provider: SearchProvider): string {
  if (provider.canIngestAutomatically) return 'automatyczny import aktywny';
  return provider.ingestionStatus === 'PARTNER_REQUIRED' ? 'import wymaga partnerstwa/API' : 'import tylko z dozwolonego źródła';
}

function ensureUi(): HTMLElement {
  let screen = document.querySelector<HTMLElement>('[data-screen="job-search"]');
  if (screen) return screen;
  const mobile = document.querySelector('.mobile-nav');
  const sidebar = document.querySelector('.sidebar');
  const content = document.querySelector('.content');
  if (!mobile || !sidebar || !content) throw new Error('Brak kontenera aplikacji.');

  const mobileButton = document.createElement('button');
  mobileButton.type = 'button';
  mobileButton.className = 'nav-item';
  mobileButton.dataset.view = 'job-search';
  mobileButton.textContent = 'Szukaj';
  mobile.append(mobileButton);

  const sideButton = document.createElement('button');
  sideButton.type = 'button';
  sideButton.className = 'side-link';
  sideButton.dataset.view = 'job-search';
  sideButton.textContent = 'Wyszukiwarka ofert';
  sidebar.append(sideButton);

  screen = document.createElement('section');
  screen.className = 'screen hidden';
  screen.dataset.screen = 'job-search';
  screen.innerHTML = `
    <div class="screen-heading">
      <p class="eyebrow">Wiele źródeł, jedna decyzja</p>
      <h2>Wyszukiwarka ofert</h2>
      <p>Wpisz stanowisko i lokalizację. Job przeszuka zapisane już oferty oraz przygotuje to samo wyszukiwanie w największych serwisach.</p>
    </div>
    <form id="federatedSearchForm" class="card form-grid">
      <label class="span-2">Stanowisko, firma lub słowo kluczowe<input name="q" required minlength="2" maxlength="120" placeholder="np. magazynier, Java developer"></label>
      <label>Lokalizacja<input name="location" maxlength="120" placeholder="np. Puck"></label>
      <label>Promień (km)<input name="radiusKm" type="number" min="0" max="300" step="1" placeholder="30"></label>
      <button class="button button-primary span-2" type="submit">Szukaj we wszystkich źródłach</button>
    </form>
    <div id="jobSearchMessage" class="message" aria-live="polite"></div>
    <div id="jobSearchSummary" class="section-gap"></div>
    <section class="section-gap" aria-labelledby="jobSearchProvidersHeading">
      <div class="row-between"><div><h3 id="jobSearchProvidersHeading">Źródła</h3><p class="hint">Automatyczny import jest uruchamiany tylko tam, gdzie mamy potwierdzone prawo i techniczny kanał dostępu.</p></div></div>
      <div id="jobSearchProviders" class="grid two"></div>
    </section>
    <section class="section-gap" aria-labelledby="jobSearchLocalHeading">
      <div class="row-between"><div><h3 id="jobSearchLocalHeading">Oferty już w Job</h3><p class="hint">To kanoniczne, zdeduplikowane rekordy, które system już zna.</p></div><button id="openJobFeed" class="button button-secondary" type="button">Otwórz pełny feed</button></div>
      <div id="jobSearchLocalJobs" class="stack"></div>
    </section>`;
  content.append(screen);

  for (const button of [mobileButton, sideButton]) button.addEventListener('click', () => {
    location.hash = 'job-search';
    show();
    void prefill();
  });
  screen.querySelector<HTMLFormElement>('#federatedSearchForm')?.addEventListener('submit', event => {
    event.preventDefault();
    void search();
  });
  screen.querySelector<HTMLButtonElement>('#openJobFeed')?.addEventListener('click', () => { location.hash = 'job-feed'; });
  return screen;
}

function show(): void {
  document.querySelectorAll<HTMLElement>('[data-screen]').forEach(element => element.classList.toggle('hidden', element.dataset.screen !== 'job-search'));
  document.querySelectorAll<HTMLElement>('[data-view]').forEach(element => element.classList.toggle('active', element.dataset.view === 'job-search'));
}

function message(text: string, error = false): void {
  const element = document.querySelector<HTMLElement>('#jobSearchMessage');
  if (!element) return;
  element.textContent = text;
  element.className = `message ${error ? 'error' : 'success'}`;
}

function render(result: SearchResponse): void {
  const summary = document.querySelector<HTMLElement>('#jobSearchSummary');
  const providers = document.querySelector<HTMLElement>('#jobSearchProviders');
  const jobs = document.querySelector<HTMLElement>('#jobSearchLocalJobs');
  if (!summary || !providers || !jobs) return;
  summary.innerHTML = `<div class="card status-card"><strong>${esc(result.providers.length)} źródeł</strong> · ${esc(result.externalSearchCount)} gotowych wyszukiwań zewnętrznych · ${esc(result.localJobs.length)} ofert już w Job<p class="hint">${esc(result.boundary)}</p></div>`;
  providers.innerHTML = result.providers.map(provider => `
    <article class="card">
      <div class="row-between"><h3>${esc(provider.label)}</h3><span class="badge">${esc(ingestionLabel(provider))}</span></div>
      <p class="hint">${esc(provider.notes)}</p>
      <p class="hint">Stan dostępu sprawdzony: ${esc(provider.checkedAt)}</p>
      ${provider.searchUrl ? `<a class="button button-secondary" href="${esc(provider.searchUrl)}" target="_blank" rel="noopener noreferrer">Szukaj w ${esc(provider.label)}</a>` : '<span class="hint">Strony karier będą dodawane z jawnej allowlisty pracodawców.</span>'}
    </article>`).join('');
  jobs.innerHTML = result.localJobs.length ? result.localJobs.map(job => `
    <article class="card">
      <div class="row-between"><div><span class="badge">${esc(job.decisionState.override ?? job.decisionState.recommendation ?? 'bez decyzji')}</span><h3>${esc(job.title ?? 'Oferta bez rozpoznanego tytułu')}</h3></div><span class="hint">${esc(formatDate(job.freshness))}</span></div>
      <p><strong>${esc(job.company ?? 'Firma nieustalona')}</strong>${job.location ? ` · ${esc(job.location)}` : ''}</p>
      <p class="hint">Źródła: ${esc(job.sourceKeys.join(', '))}</p>
      ${job.sourceUrl ? `<a href="${esc(job.sourceUrl)}" target="_blank" rel="noopener noreferrer">Otwórz źródło</a>` : ''}
    </article>`).join('') : '<div class="card"><strong>Brak zapisanych ofert pasujących do tego wyszukiwania.</strong><p class="hint">Użyj źródeł powyżej. Po dodaniu/importowaniu oferty Job połączy duplikaty i wykona analizę dopasowania.</p></div>';
}

async function prefill(): Promise<void> {
  const form = document.querySelector<HTMLFormElement>('#federatedSearchForm');
  if (!form) return;
  const q = form.elements.namedItem('q') as HTMLInputElement;
  if (q.value.trim()) return;
  try {
    const me = await api<MeResponse>('/api/me');
    const locationInput = form.elements.namedItem('location') as HTMLInputElement;
    const radiusInput = form.elements.namedItem('radiusKm') as HTMLInputElement;
    q.value = me.profile?.desiredRoles?.[0] ?? '';
    locationInput.value = me.profile?.location ?? '';
    radiusInput.value = me.profile?.commuteKm?.toString() ?? '';
  } catch { /* auth state is owned by the main app */ }
}

async function search(): Promise<void> {
  const form = document.querySelector<HTMLFormElement>('#federatedSearchForm');
  if (!form) return;
  const data = new FormData(form);
  const q = String(data.get('q') ?? '').trim();
  const searchLocation = String(data.get('location') ?? '').trim();
  const radius = String(data.get('radiusKm') ?? '').trim();
  const params = new URLSearchParams({ q });
  if (searchLocation) params.set('location', searchLocation);
  if (radius) params.set('radiusKm', radius);
  try {
    message('Szukam…');
    const result = await api<SearchResponse>(`/api/job-search?${params.toString()}`);
    render(result);
    message(`Gotowe. Przygotowano wyszukiwanie w ${result.externalSearchCount} zewnętrznych źródłach.`);
  } catch (error) {
    message((error as Error).message, true);
  }
}

let enabled = false;
async function refreshFeature(): Promise<void> {
  try {
    const data = await api<FeatureResponse>('/api/features');
    enabled = data.features.job_feed === true;
    if (!enabled) return;
    ensureUi();
    if (location.hash === '#job-search') { show(); await prefill(); }
  } catch { enabled = false; }
}

window.addEventListener('hashchange', () => { if (enabled && location.hash === '#job-search') { show(); void prefill(); } });
const appView = document.querySelector('#appView');
if (appView) new MutationObserver(() => { if (!appView.classList.contains('hidden')) void refreshFeature(); }).observe(appView, { attributes: true, attributeFilter: ['class'] });
void refreshFeature();

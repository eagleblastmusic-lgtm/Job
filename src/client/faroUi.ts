import type { Skill, Projection, Salary, Economics } from './faroTypes.js';
export const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export function levelGuidance(skill:Skill|undefined) {
  const guidance=skill?.levelGuidance;if(!guidance)return '';
  return `<details><summary>Przykłady zadań dla poziomów: ${esc(skill!.label)}</summary><p>Autorskie wskazówki FARO do walidacji z użytkownikami. To pomoc w opisaniu praktyki, nie test, certyfikat ani ocena wcześniejszej deklaracji.</p><dl>${(['BASICS','INDEPENDENT','FLUENT'] as const).map(level=>`<dt>${esc(label(level))}</dt><dd>${esc(guidance[level])}</dd>`).join('')}</dl></details>`;
}
export const labels: Record<string, string> = {
  ACCESS:'Dostęp do próby',CONNECTION:'Połączenie',ANSWER_SAVE:'Zapis odpowiedzi',OTHER_TECHNICAL:'Inny problem techniczny',TECHNICAL_ISSUE:'Próba z problemem technicznym',ISSUE_CONFIRMED:'Potwierdzono problem',NOT_ESTABLISHED:'Nie potwierdzono problemu',ATTEMPT_INCIDENT_REPORTED:'Zgłoszono problem techniczny próby',ATTEMPT_INCIDENT_RESOLVED:'Rozpatrzono problem techniczny próby',
  GROSS_EMPLOYMENT:'Brutto — umowa o pracę',GROSS_CIVIL:'Brutto — umowa cywilnoprawna',B2B_NET_INVOICE_EXCL_VAT:'Kwota faktury B2B bez VAT',
  KEY_ERROR:'Błąd klucza odpowiedzi',AMBIGUOUS_TASK:'Niejednoznaczne zadanie',TECHNICAL_INCIDENT:'Potwierdzony problem techniczny',ASSESSMENT_RESULT_INVALIDATED:'Oznaczono wynik jako nieważny',
  NO_SHOW_CASE:'Nieobecność do wyjaśnienia',INTERVIEW_DISCREPANCY:'Rozbieżność po rozmowie',CANDIDATE:'Kandydat',EMPLOYER:'Pracodawca',
  PROCESS_VIOLATION_CONFIRMED:'Potwierdzone naruszenie procesu',INSUFFICIENT_EVIDENCE:'Za mało dowodów',NO_VIOLATION_CONFIRMED:'Nie potwierdzono naruszenia',CASE_RESOLVED:'Sprawa rozstrzygnięta',
  REQUIREMENT:'Kompetencja z oferty',AVAILABILITY:'Dostępność',DECLARE_SKILL:'Deklaruję kompetencję',NOT_YET:'Jeszcze tego nie potrafię',
  PROPOSED:'Termin zaproponowany', CONFIRMED:'Rozmowa potwierdzona', COMPLETED:'Rozmowa odbyta', DISPUTED:'Rozbieżność do wyjaśnienia',
  INTERVIEW_PROPOSED:'Propozycja rozmowy', INTERVIEW_CONFIRMED:'Rozmowa potwierdzona', INTERVIEW_COMPLETED:'Rozmowa odbyta',
  CONFIRM:'Potwierdź termin', COMPLETE:'Potwierdź odbycie rozmowy', DISPUTE:'Zgłoś rozbieżność', RESCHEDULE:'Potrzebny nowy termin', UNAVAILABLE:'Brak dostępności', NO_SHOW:'Nieobecność do wyjaśnienia', OTHER_DISCREPANCY:'Inna rozbieżność',
  BASICS: 'znam podstawy', INDEPENDENT: 'wykonuję samodzielnie', FLUENT: 'używam swobodnie',
  WORK: 'praktyka w pracy', SELF_LEARNING: 'samodzielna nauka', HOBBY: 'hobby', SCHOOL: 'edukacja', VOLUNTEERING: 'wolontariat',
  SELF_DEVELOPING: 'rozwijam samodzielnie', WANTS_TO_LEARN: 'chcę się nauczyć', DECLARED: 'deklaracja kandydata',
  MONTHS: 'miesięcy', PROJECTS: 'projektów', TASKS: 'zadań', UNKNOWN: 'nie określono', IMMEDIATE: 'od zaraz', AFTER_PERIOD: 'po okresie (dni)', ON_DATE: 'od daty',
  REMOTE: 'zdalnie', HYBRID: 'hybrydowo', ONSITE: 'na miejscu', UOP: 'umowa o pracę', CIVIL: 'umowa cywilnoprawna', B2B: 'B2B',
  MONTH: 'miesiąc', HOUR: 'godzinę', DAY: 'dzień', YEAR: 'rok', MUST_HAVE: 'Wymagane', NICE_TO_HAVE: 'Mile widziane', WILL_TEACH: 'Firma nauczy',
  SATISFIED: 'deklarujesz wymagany poziom', NOT_DEMONSTRATED: 'brak deklaracji — nie wiemy', KNOWN_NOT_MET: 'poziom do rozwinięcia', NOT_APPLICABLE: 'nauka w firmie',
  DRAFT: 'Szkic', IN_REVIEW: 'Do zatwierdzenia', PUBLISHED: 'Opublikowana', PAUSED: 'Wstrzymana', CLOSED: 'Zamknięta', ARCHIVED: 'Archiwum',
  INTERESTED: 'Zainteresowanie zgłoszone', ACTIVE: 'W toku', OFFERED: 'Propozycja zatrudnienia', HIRED: 'Przyjęcie oferty potwierdzone', REJECTED: 'Odmowa', WITHDRAWN: 'Wycofane', CANCELLED: 'Anulowane',
  AWAITING_EMPLOYER: 'Czekamy na pracodawcę', CLARIFICATION_REQUESTED: 'Pytanie do kandydata', ACCEPTED_TO_NEXT_STAGE: 'Kolejny etap',
  ASSESSMENT_REQUESTED: 'Zaproszenie do assessmentu', ASSESSMENT_COMPLETED: 'Assessment przesłany', TERMINAL: 'Proces zakończony',
  INVITED: 'Zaproszenie', STARTED: 'Rozpoczęty', SCORED_PENDING_REVIEW: 'Wynik czeka na review', FINALIZED: 'Wynik zatwierdzony', EXPIRED: 'Czas upłynął', APPROVED: 'Zatwierdzony',
  REQUIREMENT_NOT_DEMONSTRATED: 'Brak potwierdzenia wymagania', REQUIREMENT_NOT_MET: 'Wymaganie niespełnione', OTHER_CANDIDATE_BETTER_MATCH: 'Inny kandydat lepiej spełnia konkretne wymaganie', POSITION_FILLED: 'Miejsce obsadzone', RECRUITMENT_CANCELLED: 'Rekrutacja anulowana',
  PENDING: 'Oczekuje na weryfikację', VERIFIED: 'Zweryfikowana', RESTRICTED: 'Ograniczona',
  OWNER: 'Właściciel', ADMIN: 'Administrator', RECRUITER: 'Rekruter', HIRING_MANAGER: 'Osoba oceniająca',
  INTEREST_CREATED: 'Zgłoszono zainteresowanie', ADVANCE: 'Zaproszono do kolejnego etapu', CLARIFY: 'Zadano pytanie', ANSWER: 'Udzielono odpowiedzi', REJECT: 'Przekazano odmowę', WITHDRAW: 'Wycofano zainteresowanie', OFFER: 'Przekazano propozycję zatrudnienia', ACCEPT_OFFER: 'Przyjęto propozycję', CANCEL: 'Anulowano proces',
  ASSESSMENT_ASSIGNED: 'Przypisano assessment', ATTEMPT_SUBMITTED: 'Przesłano odpowiedzi', ATTEMPT_EXPIRED: 'Upłynął termin assessmentu', ASSESSMENT_FINALIZED: 'Zatwierdzono wynik',
  ATTEMPT_RETRY_AUTHORIZED:'Zaproszono do osobnej próby po problemie technicznym',
  role: 'Rola', salary: 'Wynagrodzenie', requirements: 'Wymagania', location: 'Lokalizacja', workModel: 'Model pracy', stages: 'Etapy', closesAt: 'Zamknięcie', responsibilities: 'Zadania', responseHours: 'Czas odpowiedzi', decisionHours: 'Czas decyzji', shifts: 'Zmiany', weekends: 'Weekendy', hours: 'Godziny'
};
export const label = (value: string) => labels[value] ?? value;
export const money = (value: number | null) => value === null ? 'Nie oszacowano' : new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(value / 100);
export const date = (value: string | null) => value ? new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Warsaw' }).format(new Date(value)) : 'Nie ustalono';
export const salary = (s: Salary) => `${money(s.min)} – ${money(s.max)} ${s.contract === 'B2B' ? 'na fakturze bez VAT' : 'brutto'} / ${label(s.period)}`;
export const scenarioSalary=(e:Economics)=>`${money(e.result.grossOrInvoiceMin)} – ${money(e.result.grossOrInvoiceMax)} ${e.result.basis==='B2B_NET_INVOICE_EXCL_VAT'?'na fakturze bez VAT':'brutto'} / ${label(e.result.period)}`;
export const chip = (value: string, tone = '') => `<span class="f-chip ${esc(tone)}">${esc(value)}</span>`;
export const empty = (title: string, description: string) => `<div class="f-empty"><span aria-hidden="true">↗</span><h2>${esc(title)}</h2><p>${esc(description)}</p></div>`;
export const options = (items: string[], selected = '') => items.map(item => `<option value="${esc(item)}" ${item === selected ? 'selected' : ''}>${esc(label(item))}</option>`).join('');
export const select = (name: string, title: string, items: string[], selected = '') => `<label>${esc(title)}<select name="${esc(name)}">${options(items, selected)}</select></label>`;
export const input = (name: string, title: string, value: unknown = '', type = 'text', extra = 'required') => `<label>${esc(title)}<input name="${esc(name)}" type="${type}" value="${esc(value)}" ${extra}></label>`;
export const area = (name: string, title: string, value = '', extra = 'required') => `<label class="f-wide">${esc(title)}<textarea name="${esc(name)}" rows="3" ${extra}>${esc(value)}</textarea></label>`;
export const check = (name: string, title: string, required = true) => `<label class="f-check f-wide"><input type="checkbox" name="${esc(name)}" ${required ? 'required' : ''}>${esc(title)}</label>`;
export const button = (action: string, title: string, id = '', primary = false) => `<button type="button" class="${primary ? 'f-primary' : ''}" data-action="${esc(action)}" data-id="${esc(id)}">${esc(title)}</button>`;
export const form = (action: string, content: string, submit: string, id = '') => `<form data-form="${esc(action)}" data-id="${esc(id)}"><fieldset class="f-fields">${content}<div class="f-wide"><button class="f-primary" type="submit">${esc(submit)}</button></div><p class="f-form-message f-wide" role="status"></p></fieldset></form>`;
export const skillSelect = (skills: Skill[], name = 'skillId', selected = '') => `<label>Kompetencja<select name="${esc(name)}">${skills.map(s => `<option value="${esc(s.id)}" ${s.id === selected ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}</select></label>`;
export const practiceFields = () => input('quantity', 'Ile praktyki? (opcjonalnie)', '', 'number', 'min="0" max="10000"') + select('unit', 'Jednostka praktyki', ['MONTHS','PROJECTS','TASKS']);
export const claimFields = () => select('level', 'Poziom', ['BASICS','INDEPENDENT','FLUENT']) + select('source', 'Źródło', ['WORK','SELF_LEARNING','HOBBY','SCHOOL','VOLUNTEERING']) + practiceFields() + check('confirmed', 'Potwierdzam, że opis odpowiada temu, co potrafię.');
export function projection(p: Projection) {
  return `<h3>${esc(p.firstName)}</h3><p class="f-muted">Dostępność: ${esc(label(p.availability.kind))} ${esc(p.availability.value)}</p>
    <h4>Co potrafię</h4>${p.skillClaims.map(c => `<div class="f-row"><strong>${esc(c.skill.label)}</strong><p>${esc(label(c.level))} · ${esc(label(c.source))} · ${esc(label(c.verification))}</p><small>${c.practice.quantity ?? 'Nie określono'} ${esc(label(c.practice.unit))}</small></div>`).join('') || '<p>Brak deklaracji.</p>'}
    <h4>Mam doświadczenie w…</h4>${p.taskExperience.map(t => chip(t.task)).join('') || '<p>Brak potwierdzonych czynności.</p>'}
    <h4>Kierunek nauki</h4>${p.learningIntents.map(l => `<p>${esc(l.skill.label)} · ${esc(label(l.mode))}</p>`).join('') || '<p>Nie określono.</p>'}`;
}

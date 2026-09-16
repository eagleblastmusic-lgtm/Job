import { randomUUID } from 'node:crypto';
import { FaroStore } from './base.js';
import { RecruitmentService } from './recruitmentService.js';
import { OfferService } from './offerService.js';
import { HttpError } from '../http.js';
import { text, integer, array, object, choice, date } from './validation.js';
import { TERMINAL } from '../../domain/faro/recruitment.js';
interface Task { id: string; prompt: string; options: string[]; answer: number; points: number; }
interface Definition { title: string; type: 'QUIZ'; tasks: Task[]; timeLimitMinutes: number; expectedMinutes: number; rubricVersion: string; scoringMode: 'OBJECTIVE'; }
interface DefinitionRow { id: string; version: number; offer_id: string; state: 'DRAFT' | 'IN_REVIEW' | 'APPROVED'; content: string; origin: string; }
interface AttemptRow { id: string; process_id: string; assessment_id: string; assessment_version: number; state: string; deadline: string; started_at: string | null; expires_at: string | null; answers: string; revision: number; result: string | null; }
export class AssessmentService extends FaroStore {
  get recruitment() { return new RecruitmentService(this.database, this.clock); }
  definition(id: string, version: number) {
    const row = this.db.prepare('SELECT * FROM faro_assessments WHERE id=? AND version=?').get(id, version) as unknown as DefinitionRow | undefined;
    if (!row) throw new HttpError(404, 'Nie znaleziono wersji assessmentu.'); return row;
  }
  list(userId: string, offerId: string) {
    new OfferService(this.database, this.clock).assigned(userId, offerId);
    return this.db.prepare('SELECT id,version,state,origin,content,approved_at FROM faro_assessments WHERE offer_id=? ORDER BY created_at DESC').all(offerId);
  }
  parse(body: Record<string, unknown>): Definition {
    const tasks = array(body.tasks, 50).map((raw, index) => {
      const task = object(raw), options = array(task.options, 8).map(option => text(option, 500));
      if (options.length < 2) throw new HttpError(400, 'Zadanie wymaga przynajmniej dwóch odpowiedzi.');
      return { id: `task-${index + 1}`, prompt: text(task.prompt, 1500), options, answer: integer(task.answer, 0, options.length - 1), points: integer(task.points, 1, 100) };
    });
    if (!tasks.length) throw new HttpError(400, 'Dodaj zadanie.');
    for (const forbidden of ['internetAllowed','aiAllowed','globalSkillExpiry','cumulativeTestTimeLimit']) if (forbidden in body) throw new HttpError(400, 'Pole nie należy do Canonical.');
    return { title: text(body.title, 150), type: 'QUIZ', tasks, timeLimitMinutes: integer(body.timeLimitMinutes, 1, 480), expectedMinutes: integer(body.expectedMinutes, 1, 480), rubricVersion: text(body.rubricVersion, 80), scoringMode: 'OBJECTIVE' };
  }
  create(userId: string, offerId: string, body: Record<string, unknown>, previousId?: string) {
    const offers = new OfferService(this.database, this.clock), offer = offers.assigned(userId, offerId);
    this.member(userId, offer.organizationId, ['OWNER','ADMIN','RECRUITER','HIRING_MANAGER']);
    const definition = this.parse(body), id = previousId ?? randomUUID();
    const prior = this.db.prepare('SELECT MAX(version) version FROM faro_assessments WHERE id=? AND offer_id=?').get(id, offerId) as { version: number | null };
    if (previousId && !prior.version) throw new HttpError(404, 'Nie znaleziono assessmentu w tej rekrutacji.');
    const version = (prior.version ?? 0) + 1;
    this.db.prepare("INSERT INTO faro_assessments(id,version,offer_id,state,content,origin,created_at) VALUES(?,?,?,'DRAFT',?,?,?)").run(id, version, offerId, JSON.stringify(definition), body.origin === 'AI' ? 'AI' : 'HUMAN', this.now());
    this.audit(userId, 'ASSESSMENT_DRAFT_CREATED', id);
    return { id, version, state: 'DRAFT' };
  }
  approve(userId: string, id: string, body: Record<string, unknown>) {
    const version = integer(body.version, 1), row = this.definition(id, version);
    const offer = new OfferService(this.database, this.clock).assigned(userId, row.offer_id);
    this.member(userId, offer.organizationId, ['OWNER','ADMIN','RECRUITER','HIRING_MANAGER']);
    const action = choice(body.action, ['REVIEW','APPROVE'] as const);
    if ((action === 'REVIEW' && row.state !== 'DRAFT') || (action === 'APPROVE' && row.state !== 'IN_REVIEW')) throw new HttpError(409, 'Assessment wymaga właściwego etapu review.');
    if (action === 'APPROVE' && body.confirmed !== true) throw new HttpError(400, 'Zatwierdź treść, rubrykę, czas i prawa do zadań.');
    this.db.prepare('UPDATE faro_assessments SET state=?,approved_by=?,approved_at=? WHERE id=? AND version=?').run(action === 'REVIEW' ? 'IN_REVIEW' : 'APPROVED', action === 'APPROVE' ? userId : null, action === 'APPROVE' ? this.now() : null, id, version);
    this.audit(userId, `ASSESSMENT_${action}`, id); return { id, version, state: action === 'REVIEW' ? 'IN_REVIEW' : 'APPROVED' };
  }
  assign(userId: string, processId: string, body: Record<string, unknown>) {
    const process = this.recruitment.row(processId);
    const offer = new OfferService(this.database, this.clock).assigned(userId, process.offer_id);
    this.member(userId, offer.organizationId, ['OWNER','ADMIN','RECRUITER']);
    const definitionId = text(body.assessmentId, 100), version = integer(body.version, 1), definition = this.definition(definitionId, version);
    if (definition.offer_id !== process.offer_id) throw new HttpError(404, 'Nie znaleziono assessmentu.');
    if (definition.state !== 'APPROVED') throw new HttpError(409, 'Przypisanie wymaga zatwierdzonej wersji.', 'ASSESSMENT_NOT_APPROVED');
    if (process.status !== 'ACTIVE' || process.stage !== 'ACCEPTED_TO_NEXT_STAGE') throw new HttpError(409, 'Najpierw przyjmij do kolejnego etapu.');
    const deadline = date(body.deadline); if (deadline <= this.now()) throw new HttpError(400, 'Deadline musi być w przyszłości.');
    const id = randomUUID();
    this.transaction(() => {
      this.db.prepare("INSERT INTO faro_attempts(id,process_id,assessment_id,assessment_version,state,deadline) VALUES(?,?,?,?,'INVITED',?)").run(id, processId, definitionId, version, deadline);
      this.db.prepare("UPDATE faro_interests SET stage='ASSESSMENT_REQUESTED',stage_due_at=?,revision=revision+1 WHERE id=?").run(deadline, processId);
      this.recruitment.event(process, userId, 'ASSESSMENT_ASSIGNED', { attemptId: id, deadline });
    }); return { id };
  }
  row(id: string) {
    const row = this.db.prepare('SELECT * FROM faro_attempts WHERE id=?').get(id) as unknown as AttemptRow | undefined;
    if (!row) throw new HttpError(404, 'Nie znaleziono próby.'); return row;
  }
  overview(userId: string, id: string) {
    const row = this.row(id), process = this.recruitment.authorize(userId, row.process_id), content = JSON.parse(this.definition(row.assessment_id, row.assessment_version).content) as Definition;
    const candidate = process.candidate_id === userId;
    return { id, processId: row.process_id, state: row.state, title: content.title, type: content.type, taskCount: content.tasks.length, timeLimitMinutes: content.timeLimitMinutes, expectedMinutes: content.expectedMinutes, deadline: row.deadline, startedAt: row.started_at, expiresAt: row.expires_at, serverNow: this.now(), revision: row.revision, rubricVersion: content.rubricVersion, scoringMode: content.scoringMode,
      tasks: candidate && row.started_at ? content.tasks.map(task => ({ id: task.id, prompt: task.prompt, options: task.options, points: task.points })) : [],
      answers: candidate ? JSON.parse(row.answers) as Record<string, number> : {}, result: row.result && (row.state === 'FINALIZED' || !candidate) ? JSON.parse(row.result) as Record<string, unknown> : null };
  }
  attempts(userId: string, processId?: string) {
    if (processId) this.recruitment.authorize(userId, processId);
    const rows = (processId ? this.db.prepare('SELECT id FROM faro_attempts WHERE process_id=?').all(processId) : this.db.prepare('SELECT a.id FROM faro_attempts a JOIN faro_interests p ON p.id=a.process_id WHERE p.candidate_id=?').all(userId)) as Array<{ id: string }>;
    return rows.map(row => this.overview(userId, row.id));
  }
  candidate(userId: string, row: AttemptRow) {
    const process = this.recruitment.row(row.process_id);
    if (process.candidate_id !== userId) throw new HttpError(404, 'Nie znaleziono próby.');
    if (TERMINAL.includes(process.status)) throw new HttpError(409, 'Proces został zakończony.');
    return process;
  }
  start(userId: string, id: string) {
    return this.transaction(() => {
      const row = this.row(id); this.candidate(userId, row);
      if (row.started_at) return this.overview(userId, id);
      if (row.state !== 'INVITED' || row.deadline <= this.now()) throw new HttpError(409, 'Zaproszenie nie jest już aktywne.', 'ATTEMPT_EXPIRED');
      const definition = JSON.parse(this.definition(row.assessment_id, row.assessment_version).content) as Definition;
      const expires = new Date(Math.min(Date.parse(row.deadline), this.clock().getTime() + definition.timeLimitMinutes * 60000)).toISOString();
      this.db.prepare("UPDATE faro_attempts SET state='STARTED',started_at=?,expires_at=?,revision=revision+1 WHERE id=?").run(this.now(), expires, id);
      this.audit(userId, 'ATTEMPT_STARTED', id); return this.overview(userId, id);
    });
  }
  save(userId: string, id: string, body: Record<string, unknown>, submit: boolean) {
    const row = this.row(id), process = this.candidate(userId, row);
    if (row.state !== 'STARTED') throw new HttpError(409, 'Próba nie jest aktywna.');
    if (!row.expires_at || row.expires_at <= this.now()) {
      this.db.prepare("UPDATE faro_attempts SET state='EXPIRED',revision=revision+1 WHERE id=?").run(id);
      throw new HttpError(409, 'Czas próby upłynął.', 'ATTEMPT_EXPIRED');
    }
    if (integer(body.expectedVersion, 1) !== row.revision) throw new HttpError(409, 'Odpowiedzi zmieniły się.', 'VERSION_CONFLICT');
    const definition = JSON.parse(this.definition(row.assessment_id, row.assessment_version).content) as Definition;
    const raw = object(body.answers), answers: Record<string, number> = {};
    for (const [key, value] of Object.entries(raw)) {
      const task = definition.tasks.find(t => t.id === key); if (!task) throw new HttpError(400, 'Nieznane zadanie.');
      answers[key] = integer(value, 0, task.options.length - 1);
    }
    const breakdown = definition.tasks.map(task => ({ taskId: task.id, earned: answers[task.id] === undefined ? null : answers[task.id] === task.answer ? task.points : 0, possible: task.points }));
    const result = { breakdown, earned: breakdown.reduce((sum, task) => sum + (task.earned ?? 0), 0), possible: breakdown.reduce((sum, task) => sum + task.possible, 0), unanswered: breakdown.filter(task => task.earned === null).length, assessmentVersion: row.assessment_version, rubricVersion: definition.rubricVersion, review: 'PENDING' };
    this.transaction(() => {
      this.db.prepare('UPDATE faro_attempts SET answers=?,revision=revision+1,state=?,result=? WHERE id=?').run(JSON.stringify(answers), submit ? 'SCORED_PENDING_REVIEW' : 'STARTED', submit ? JSON.stringify(result) : null, id);
      if (submit) {
        this.db.prepare("UPDATE faro_interests SET stage='ASSESSMENT_COMPLETED',stage_due_at=NULL,revision=revision+1 WHERE id=?").run(row.process_id);
        this.recruitment.event(process, userId, 'ATTEMPT_SUBMITTED', { attemptId: id });
      }
    }); return this.overview(userId, id);
  }
  finalize(userId: string, id: string, body: Record<string, unknown>) {
    const row = this.row(id), process = this.recruitment.row(row.process_id);
    new OfferService(this.database, this.clock).assigned(userId, process.offer_id);
    if (row.state !== 'SCORED_PENDING_REVIEW' || !row.result || body.confirmed !== true) throw new HttpError(409, 'Wynik wymaga świadomego review.');
    const note = text(body.note, 1000, 10), result = { ...JSON.parse(row.result) as Record<string, unknown>, review: 'FINALIZED', reviewNote: note };
    this.transaction(() => {
      this.db.prepare("UPDATE faro_attempts SET state='FINALIZED',result=?,reviewer_id=?,reviewed_at=?,revision=revision+1 WHERE id=?").run(JSON.stringify(result), userId, this.now(), id);
      this.recruitment.event(process, userId, 'ASSESSMENT_FINALIZED', { attemptId: id });
    }); return this.overview(userId, id);
  }
}

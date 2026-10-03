import { FaroStore } from './base.js';
import { OfferService } from './offerService.js';
import { integer, text, date, choice } from './validation.js';
import { HttpError } from '../http.js';
import { calculateEconomics, type EconomicsInput } from '../../domain/faro/economics.js';
export class EconomicsService extends FaroStore {
  get(userId: string, offerId: string) {
    new OfferService(this.database, this.clock).detail(userId, offerId);
    const row = this.db.prepare('SELECT scenario,result,offer_version FROM faro_economics WHERE candidate_id=? AND offer_id=?').get(userId, offerId) as { scenario: string; result: string; offer_version: number } | undefined;
    return row ? { scenario: JSON.parse(row.scenario) as EconomicsInput, result: JSON.parse(row.result) as ReturnType<typeof calculateEconomics>, offerVersion: row.offer_version } : null;
  }
  save(userId: string, offerId: string, body: Record<string, unknown>) {
    const offer = new OfferService(this.database, this.clock).detail(userId, offerId);
    const value = (key: string) => body[key] === null ? null : integer(body[key]);
    const input: EconomicsInput = { salaryOptionIndex: integer(body.salaryOptionIndex, 0, 7), netMin: value('netMin'), netMax: value('netMax'), commuteCost: value('commuteCost'), commuteMinutes: value('commuteMinutes'), transport: choice(body.transport, ['CAR','TRANSIT','MIXED','NONE'] as const), source: text(body.source, 300), observedAt: date(body.observedAt), assumptions: text(body.assumptions, 1500) };
    if ((input.netMin === null) !== (input.netMax === null) || (input.netMin !== null && input.netMax !== null && input.netMin > input.netMax)) throw new HttpError(400, 'Podaj prawidłowy zakres szacowanego netto.');
    const salary = offer.data.salary[input.salaryOptionIndex]; if (!salary) throw new HttpError(400, 'Nieznany wariant wynagrodzenia.');
    if(body.netPeriod!==undefined&&body.netPeriod!==salary.period)throw new HttpError(400,'Netto musi dotyczyć okresu wybranego wynagrodzenia.','ECONOMICS_UNIT_MISMATCH');
    if(body.commuteCostPeriod!==undefined&&body.commuteCostPeriod!==salary.period)throw new HttpError(400,'Koszt dojazdu musi dotyczyć okresu wybranego wynagrodzenia.','ECONOMICS_UNIT_MISMATCH');
    if(body.commuteTimeBasis!==undefined&&body.commuteTimeBasis!=='ROUND_TRIP_MINUTES_PER_WORK_DAY')throw new HttpError(400,'Czas dojazdu podaj w minutach w obie strony na dzień pracy.','ECONOMICS_UNIT_MISMATCH');
    const result = calculateEconomics(salary, input, this.now());
    this.db.prepare('INSERT INTO faro_economics(candidate_id,offer_id,offer_version,scenario,result,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(candidate_id,offer_id) DO UPDATE SET offer_version=excluded.offer_version,scenario=excluded.scenario,result=excluded.result,updated_at=excluded.updated_at').run(userId, offerId, offer.version, JSON.stringify(input), JSON.stringify(result), this.now());
    return this.get(userId, offerId);
  }
}

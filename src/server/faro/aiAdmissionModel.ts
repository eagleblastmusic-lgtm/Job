import type { JobDatabase } from '../db.js';
import type { PgJobDatabase } from '../postgresDb.js';

export interface AiAdmission {
  id: string; userId: string | null; taskType: string; model: string; promptVersion: string;
  inputHash: string; outputSchema: string; createdAt: string; maxDailyRequests: number;
}
export interface AiAdmissionStore {
  reserve(input: AiAdmission): boolean | Promise<boolean>;
  finish(id: string, latencyMs: number, tokenUsage: number | null, success: number, errorCode: string | null): void | Promise<void>;
}
function admissionQuery(input: AiAdmission) {
  return { text: `INSERT INTO ai_requests(id,user_id,task_type,model,prompt_version,input_hash,output_schema,latency_ms,token_usage,estimated_cost,success,error_code,created_at)
    SELECT $1,$2,$3,$4,$5,$6,$7,0,NULL,NULL,0,'AI_IN_FLIGHT',$8 WHERE (SELECT COUNT(*) FROM ai_requests WHERE created_at>=$9)<$10`,
  values: [input.id, input.userId, input.taskType, input.model, input.promptVersion, input.inputHash, input.outputSchema, input.createdAt, input.createdAt.slice(0, 10) + 'T00:00:00.000Z', input.maxDailyRequests] };
}
function finishQuery(id: string, latencyMs: number, tokenUsage: number | null, success: number, errorCode: string | null) {
  return { text: 'UPDATE ai_requests SET latency_ms=$1,token_usage=$2,success=$3,error_code=$4 WHERE id=$5', values: [latencyMs, tokenUsage, success, errorCode, id] };
}
const bindings = (values: Array<string | number | null>) => Object.fromEntries(values.map((value, index) => [`$${index + 1}`, value]));

export function sqliteAiAdmission(database: JobDatabase): AiAdmissionStore {
  return {
    reserve(input) { const query = admissionQuery(input); return Number(database.db.prepare(query.text).run(bindings(query.values)).changes) === 1; },
    finish(...args) { const query = finishQuery(...args); if (Number(database.db.prepare(query.text).run(bindings(query.values)).changes) !== 1) throw new Error('AI_AUDIT_UNAVAILABLE'); }
  };
}
/** SERIALIZABLE admission commits before egress; retry storage conflicts only, never model calls. */
export function postgresAiAdmission(database: PgJobDatabase): AiAdmissionStore {
  return {
    async reserve(input) {
      const query = admissionQuery(input);
      for (let retry = 0; ; retry++) {
        try { return await database.transaction(async () => (await database.query(query.text, query.values)).rowCount === 1); }
        catch (error) { const code = (error as { code?: string }).code; if (retry < 2 && (code === '40001' || code === '40P01')) continue; throw error; }
      }
    },
    async finish(...args) { const query = finishQuery(...args); if ((await database.query(query.text, query.values)).rowCount !== 1) throw new Error('AI_AUDIT_UNAVAILABLE'); }
  };
}

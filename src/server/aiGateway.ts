import { createHash, randomUUID } from 'node:crypto';
import type { JobDatabase } from './db.js';
import type { AppConfig } from './config.js';

export interface AiRequest<T> {
  userId: string | null;
  taskType: string;
  promptVersion: string;
  outputSchemaName: string;
  system: string;
  input: string;
  validate: (value: unknown) => T;
  maxOutputTokens?:number;
}

class AiGatewayError extends Error {}
const MAX_AI_RESPONSE_BYTES=128*1024;

export class AiGateway {
  constructor(private readonly db: JobDatabase, private readonly config: AppConfig) {}

  isConfigured(): boolean {
    return Boolean(this.config.aiBaseUrl && this.config.aiApiKey && this.config.aiModel);
  }

  async structured<T>(request: AiRequest<T>): Promise<T> {
    if (!this.config.aiBaseUrl || !this.config.aiApiKey || !this.config.aiModel) throw new Error('AI provider nie jest skonfigurowany.');
    const maxTokens=request.maxOutputTokens??2048;
    if(!Number.isSafeInteger(maxTokens)||maxTokens<1||maxTokens>4096||!Number.isSafeInteger(this.config.aiTimeoutMs)||this.config.aiTimeoutMs<1||this.config.aiTimeoutMs>60000||Buffer.byteLength(request.input)>32768||Buffer.byteLength(request.system)>32768)throw new AiGatewayError('AI_REQUEST_LIMIT');
    const started = Date.now();
    const inputHash = createHash('sha256').update(request.input).digest('hex');
    let success = 0;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.aiTimeoutMs);
    try {
      const response = await fetch(`${this.config.aiBaseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        redirect:'error',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.config.aiApiKey}` },
        body: JSON.stringify({
          model: this.config.aiModel,
          temperature: 0,
          max_tokens:maxTokens,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: request.input }
          ]
        }),
        signal: controller.signal
      });
      if (!response.ok) {await response.body?.cancel();throw new AiGatewayError(`AI_HTTP_${response.status}`);}
      const reader=response.body?.getReader();if(!reader)throw new AiGatewayError('AI_EMPTY_OUTPUT');
      const chunks:Uint8Array[]=[];let bytes=0;
      try {
        while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>MAX_AI_RESPONSE_BYTES){await reader.cancel();throw new AiGatewayError('AI_RESPONSE_TOO_LARGE');}chunks.push(chunk.value);}
      }finally{reader.releaseLock();}
      let payload:{ choices?: Array<{ message?: { content?: string } }>; usage?: { total_tokens?: number } };
      try {const parsed:unknown=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error();payload=parsed as typeof payload;}catch{throw new AiGatewayError('AI_INVALID_RESPONSE');}
      const content = payload.choices?.[0]?.message?.content;
      if (typeof content!=='string'||!content.trim()) throw new AiGatewayError('AI_EMPTY_OUTPUT');
      let validated:T;
      try {const parsed:unknown=JSON.parse(content);validated=request.validate(parsed);}catch{throw new AiGatewayError('AI_INVALID_OUTPUT');}
      success = 1;
      const usage=payload.usage?.total_tokens;
      this.log(request, inputHash, Date.now() - started, typeof usage==='number'&&Number.isSafeInteger(usage)&&usage>=0?usage:null, success, null);
      return validated;
    } catch (error) {
      const errorCode = controller.signal.aborted?'AI_TIMEOUT':error instanceof AiGatewayError?error.message:'AI_TRANSPORT';
      this.log(request, inputHash, Date.now() - started, null, success, errorCode);
      throw new AiGatewayError(errorCode);
    }finally{clearTimeout(timeout);}
  }

  private log<T>(request: AiRequest<T>, inputHash: string, latencyMs: number, tokenUsage: number | null, success: number, errorCode: string | null): void {
    this.db.db.prepare(`INSERT INTO ai_requests(id,user_id,task_type,model,prompt_version,input_hash,output_schema,latency_ms,token_usage,estimated_cost,success,error_code,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      randomUUID(), request.userId, request.taskType, this.config.aiModel ?? 'unconfigured', request.promptVersion, inputHash, request.outputSchemaName, latencyMs, tokenUsage, null, success, errorCode, new Date().toISOString()
    );
  }
}

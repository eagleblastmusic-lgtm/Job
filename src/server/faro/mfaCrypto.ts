import { createCipheriv,createDecipheriv,createHash,createHmac,randomBytes,timingSafeEqual } from 'node:crypto';
import type { AppConfig } from '../config.js';
import { HttpError } from '../http.js';
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32(buffer:Buffer) {let bits=0,value=0,result='';for(const byte of buffer){value=(value<<8)|byte;bits+=8;while(bits>=5){bits-=5;result+=alphabet[(value>>>bits)&31];}}if(bits)result+=alphabet[(value<<(5-bits))&31];return result;}
/** RFC6238/HOTP dynamic truncation; 64-bit counter, explicit algorithm/digits for published vectors. */
export function totp(secret:Buffer,counter:number,digits=6,algorithm='sha1') {
  const moving=Buffer.alloc(8);moving.writeBigUInt64BE(BigInt(counter));const hash=createHmac(algorithm,secret).update(moving).digest(),offset=hash.at(-1)!&15;
  return String((hash.readUInt32BE(offset)&0x7fffffff)%10**digits).padStart(digits,'0');
}
export class MfaCodec {
  constructor(readonly config:Pick<AppConfig,'faroMfaEncryptionKey'>){}
  key(){if(!this.config.faroMfaEncryptionKey)throw new HttpError(503,'MFA wymaga skonfigurowanego chronionego klucza serwera.','MFA_UNAVAILABLE');return Buffer.from(this.config.faroMfaEncryptionKey,'hex');}
  encrypt(userId:string,secret:Buffer){const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.key(),nonce);cipher.setAAD(Buffer.from(`faro-mfa-v1:${userId}`));const payload=Buffer.concat([cipher.update(secret),cipher.final()]);return [nonce,cipher.getAuthTag(),payload].map(b=>b.toString('hex')).join('.');}
  decrypt(userId:string,value:string){const [nonce,tag,payload]=value.split('.');try{const cipher=createDecipheriv('aes-256-gcm',this.key(),Buffer.from(nonce!,'hex'));cipher.setAAD(Buffer.from(`faro-mfa-v1:${userId}`));cipher.setAuthTag(Buffer.from(tag!,'hex'));return Buffer.concat([cipher.update(Buffer.from(payload!,'hex')),cipher.final()]);}catch(error){if(error instanceof HttpError)throw error;throw new HttpError(503,'Nie można odczytać chronionego sekretu MFA.','MFA_UNAVAILABLE');}}
}
export function mfaRecoveryHash(userId:string,code:string){return createHash('sha256').update(`faro-mfa-recovery-v1:${userId}:${code}`).digest('hex');}
export function mfaRecoveryCodes(){return Array.from({length:8},()=>randomBytes(16).toString('hex'));}
export function mfaCounter(codec:MfaCodec,userId:string,cipher:string,code:unknown,asOf:string,last=-1){if(typeof code!=='string'||!/^\d{6}$/.test(code))return null;const secret=codec.decrypt(userId,cipher),now=Math.floor(Date.parse(asOf)/30000);for(const counter of [now,now-1,now+1])if(counter>=0&&counter>last&&timingSafeEqual(Buffer.from(code),Buffer.from(totp(secret,counter))))return counter;return null;}

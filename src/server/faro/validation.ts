import { HttpError } from '../http.js';
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'Oczekiwano obiektu.', 'VALIDATION_ERROR');
  return value as Record<string, unknown>;
}
export function text(value: unknown, max = 500, min = 1): string {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw new HttpError(400, `Tekst musi mieć od ${min} do ${max} znaków.`, 'VALIDATION_ERROR');
  return value.trim();
}
export function integer(value: unknown, min = 0, max = 1_000_000_000): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) throw new HttpError(400, 'Nieprawidłowa liczba całkowita.', 'VALIDATION_ERROR');
  return value;
}
export function choice<T extends string>(value: unknown, options: readonly T[]): T {
  if (typeof value !== 'string' || !options.includes(value as T)) throw new HttpError(400, 'Nieprawidłowa wartość pola.', 'VALIDATION_ERROR');
  return value as T;
}
export function array(value: unknown, max = 100): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new HttpError(400, 'Nieprawidłowa lista.', 'VALIDATION_ERROR');
  return value;
}
export function date(value: unknown): string {
  const raw = text(value, 40);
  const parts=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(raw);
  if(!parts)throw new HttpError(400,'Podaj datę z godziną i strefą.','VALIDATION_ERROR');
  const year=Number(parts[1]),month=Number(parts[2]),day=Number(parts[3]);
  const leap=year%4===0&&(year%100!==0||year%400===0),days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
  if(month<1||month>12||day<1||day>days[month-1]!||Number(parts[4])>23||Number(parts[5])>59||Number(parts[6])>59||Number(parts[8]??0)>23||Number(parts[9]??0)>59||!Number.isFinite(Date.parse(raw)))throw new HttpError(400,'Podaj istniejącą datę, godzinę i strefę.','VALIDATION_ERROR');
  return new Date(raw).toISOString();
}
export function nullableBoolean(value: unknown): boolean | null {
  if (value === null || typeof value === 'boolean') return value;
  throw new HttpError(400, 'Oczekiwano tak, nie lub brak informacji.', 'VALIDATION_ERROR');
}

export interface PersistedEnvelope<T> {
  schemaVersion: 1;
  kind: string;
  collaboratorId: string;
  updatedAt: string;
  data: T;
}

export type RuntimeValidator<T> = (value: unknown) => value is T;

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_INSTANT.test(value)) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

export function isIsoDay(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DAY.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function createEnvelope<T>(
  kind: string,
  collaboratorId: string,
  data: T,
  updatedAt = new Date().toISOString(),
): PersistedEnvelope<T> {
  return { schemaVersion: 1, kind, collaboratorId, updatedAt, data };
}

export function parseEnvelope<T>(
  raw: string,
  expected: { kind: string; collaboratorId: string; validate: RuntimeValidator<T> },
): PersistedEnvelope<T> | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !isRecord(value)
      || value.schemaVersion !== 1
      || value.kind !== expected.kind
      || value.collaboratorId !== expected.collaboratorId
      || !isIsoDate(value.updatedAt)
      || !expected.validate(value.data)
    ) return null;
    return value as unknown as PersistedEnvelope<T>;
  } catch {
    return null;
  }
}

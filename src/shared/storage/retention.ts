export interface TimestampedRecord {
  id: string;
  timestamp: string;
}

export interface ContextRetentionRecord extends TimestampedRecord {
  collaboratorId: string;
  questionId: string;
  dayKey: string;
}

export type ContextTracePlan = 'free' | 'pro' | 'enterprise';

export const CONTEXT_TRACE_RETENTION_LIMITS = {
  free: {
    monthlyLimit: 90,
    retentionMonths: 12,
    maxRecords: 1080,
  },
  pro: {
    monthlyLimit: null,
    retentionMonths: null,
    maxRecords: 3000,
  },
  enterprise: {
    monthlyLimit: null,
    retentionMonths: null,
    maxRecords: 3000,
  },
} as const;

export const RETENTION_LIMITS = {
  contextTraces: CONTEXT_TRACE_RETENTION_LIMITS.free.maxRecords,
  measurements: 1080,
  sleepRecords: 1080,
} as const;

function validateLimit(maxRecords: number) {
  if (!Number.isSafeInteger(maxRecords) || maxRecords < 0) {
    throw new Error('Limite de retenção inválido.');
  }
}

export function keepLatestUniqueBy<T extends TimestampedRecord>(
  records: T[],
  maxRecords: number,
  keyOf: (record: T) => string,
): T[] {
  validateLimit(maxRecords);
  const byKey = new Map<string, T>();
  records
    .filter((record) => Number.isFinite(Date.parse(record.timestamp)))
    .forEach((record) => {
      const key = keyOf(record);
      const current = byKey.get(key);
      if (!current || Date.parse(record.timestamp) >= Date.parse(current.timestamp)) {
        byKey.set(key, record);
      }
    });
  return [...byKey.values()]
    .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp))
    .slice(0, maxRecords)
    .reverse();
}

export function keepLatestUnique<T extends TimestampedRecord>(records: T[], maxRecords: number): T[] {
  return keepLatestUniqueBy(records, maxRecords, (record) => record.id);
}

const contextDomainKey = (record: ContextRetentionRecord) => (
  `${record.collaboratorId}:${record.questionId}:${record.dayKey}`
);

export function retainContextTraces<T extends ContextRetentionRecord>(
  records: T[],
  plan: ContextTracePlan,
  now = new Date(),
): T[] {
  const policy = CONTEXT_TRACE_RETENTION_LIMITS[plan];
  if (!policy) throw new Error('Plano de retenção inválido.');
  const nowTime = now.getTime();
  if (!Number.isFinite(nowTime)) throw new Error('Data de referência inválida.');

  if (plan !== 'free') {
    return keepLatestUniqueBy(records, policy.maxRecords, contextDomainKey);
  }

  const freePolicy = CONTEXT_TRACE_RETENTION_LIMITS.free;
  const cutoff = new Date(nowTime);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - freePolicy.retentionMonths);
  const cutoffDay = Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth(), cutoff.getUTCDate());
  const nowDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const withinWindow = records.filter((record) => {
    const timestamp = Date.parse(record.timestamp);
    const representedDay = Date.parse(`${record.dayKey}T00:00:00.000Z`);
    return Number.isFinite(timestamp)
      && Number.isFinite(representedDay)
      && timestamp >= cutoff.getTime()
      && timestamp <= nowTime
      && representedDay >= cutoffDay
      && representedDay <= nowDay;
  });
  const deduplicated = keepLatestUniqueBy(withinWindow, withinWindow.length, contextDomainKey);

  const byMonth = new Map<string, T[]>();
  deduplicated.forEach((record) => {
    const monthKey = record.dayKey.slice(0, 7);
    byMonth.set(monthKey, [...(byMonth.get(monthKey) ?? []), record]);
  });

  const withinMonthlyLimit = [...byMonth.values()].flatMap((monthlyRecords) => (
    keepLatestUniqueBy(monthlyRecords, freePolicy.monthlyLimit, contextDomainKey)
  ));
  return keepLatestUniqueBy(withinMonthlyLimit, freePolicy.maxRecords, contextDomainKey);
}

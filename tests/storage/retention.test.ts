import { describe, expect, it } from 'vitest';
import {
  keepLatestUnique,
  retainContextTraces,
  type ContextRetentionRecord,
} from '../../src/shared/storage/retention';

describe('keepLatestUnique', () => {
  const record = (id: string, day: number) => ({
    id,
    timestamp: new Date(Date.UTC(2026, 0, day)).toISOString(),
  });

  it('deduplicates by id and keeps the most recent version', () => {
    expect(keepLatestUnique([record('a', 1), record('a', 3), record('b', 2)], 10)).toEqual([
      record('b', 2),
      record('a', 3),
    ]);
  });

  it('keeps only the newest records at the configured limit', () => {
    expect(keepLatestUnique([record('a', 1), record('b', 2), record('c', 3)], 2)).toEqual([
      record('b', 2),
      record('c', 3),
    ]);
  });

  it('rejects invalid limits and ignores invalid timestamps', () => {
    expect(() => keepLatestUnique([], -1)).toThrow('Limite de retenção inválido');
    expect(keepLatestUnique([{ id: 'bad', timestamp: 'not-a-date' }], 5)).toEqual([]);
  });

  it('does not let an invalid duplicate hide a valid record', () => {
    expect(keepLatestUnique([
      { id: 'same', timestamp: 'not-a-date' },
      record('same', 2),
    ], 5)).toEqual([record('same', 2)]);
  });
});

describe('retainContextTraces', () => {
  const collaboratorId = 'a'.repeat(64);
  const contextRecord = (
    id: string,
    timestamp: string,
    overrides: Partial<ContextRetentionRecord> = {},
  ): ContextRetentionRecord => ({
    id,
    collaboratorId,
    questionId: `question-${id}`,
    dayKey: timestamp.slice(0, 10),
    timestamp,
    ...overrides,
  });

  it('keeps at most 90 free records per month and replaces the oldest first', () => {
    const monthStart = Date.parse('2026-01-01T00:00:00.000Z');
    const records = Array.from({ length: 92 }, (_, index) => contextRecord(
      `record-${index}`,
      new Date(monthStart + index * 60_000).toISOString(),
    ));

    const retained = retainContextTraces(records, 'free', new Date('2026-01-31T23:59:59.000Z'));
    expect(retained).toHaveLength(90);
    expect(retained[0].id).toBe('record-2');
    expect(retained.at(-1)?.id).toBe('record-91');
  });

  it('removes free records outside the rolling 12-month window', () => {
    const retained = retainContextTraces([
      contextRecord('stale', '2024-12-31T12:00:00.000Z'),
      contextRecord('recent', '2025-12-31T12:00:00.000Z'),
    ], 'free', new Date('2026-01-31T12:00:00.000Z'));

    expect(retained.map((record) => record.id)).toEqual(['recent']);
  });

  it('filters future and stale represented days before choosing the latest duplicate', () => {
    const domain = { questionId: 'energy', dayKey: '2026-01-10' };
    const retained = retainContextTraces([
      contextRecord('valid', '2026-01-10T08:00:00.000Z', domain),
      contextRecord('future', '2026-02-01T08:00:00.000Z', domain),
      contextRecord('old-day-updated', '2026-01-20T08:00:00.000Z', { questionId: 'sleep', dayKey: '2024-12-01' }),
    ], 'free', new Date('2026-01-31T12:00:00.000Z'));

    expect(retained.map((record) => record.id)).toEqual(['valid']);
  });

  it('deduplicates by collaborator, question and day while keeping the latest answer', () => {
    const domain = { questionId: 'energy', dayKey: '2026-01-10' };
    const retained = retainContextTraces([
      contextRecord('old-id', '2026-01-10T08:00:00.000Z', domain),
      contextRecord('new-id', '2026-01-10T09:00:00.000Z', domain),
    ], 'free', new Date('2026-01-31T12:00:00.000Z'));

    expect(retained).toHaveLength(1);
    expect(retained[0].id).toBe('new-id');
  });

  it.each(['pro', 'enterprise'] as const)(
    'keeps the latest 3000 total records for the %s plan',
    (plan) => {
      const start = Date.parse('2026-01-01T00:00:00.000Z');
      const records = Array.from({ length: 3001 }, (_, index) => contextRecord(
        `record-${index}`,
        new Date(start + index * 1_000).toISOString(),
      ));

      const retained = retainContextTraces(records, plan, new Date('2026-02-01T00:00:00.000Z'));
      expect(retained).toHaveLength(3000);
      expect(retained[0].id).toBe('record-1');
      expect(retained.at(-1)?.id).toBe('record-3000');
    },
  );
});

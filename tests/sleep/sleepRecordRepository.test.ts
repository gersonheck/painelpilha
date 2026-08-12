import { beforeEach, describe, expect, it } from 'vitest';
import { sleepRecordRepository } from '../../src/features/sleep/data/sleepRecordRepository';
import type { SleepRecord } from '../../src/shared/contracts/sleep';

describe('sleepRecordRepository', () => {
  const firstId = 'a'.repeat(64);
  const secondId = 'b'.repeat(64);
  const sleepRecord = (id: string, collaboratorId: string): SleepRecord => ({
    id,
    collaboratorId,
    dayKey: '2026-08-10',
    timestamp: '2026-08-10T09:00:00.000Z',
    sleepHours: 7.5,
    bedTime: '23:00',
    wakeTime: '06:30',
    source: 'manual',
    confidence: 1,
  });

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('persists sleep records in a collaborator scoped envelope', () => {
    sleepRecordRepository.add(firstId, sleepRecord('sleep-1', firstId));

    expect(sleepRecordRepository.list(firstId)).toEqual([sleepRecord('sleep-1', firstId)]);
    expect(sleepRecordRepository.list(secondId)).toEqual([]);
  });

  it('rejects records from another collaborator', () => {
    expect(() => sleepRecordRepository.add(firstId, sleepRecord('sleep-1', secondId))).toThrow(
      'outro colaborador',
    );
  });

  it('fails closed when persisted sleep data is malformed', () => {
    window.localStorage.setItem(`pa_sleep_records_collaborator_${firstId}`, '{broken');

    expect(sleepRecordRepository.list(firstId)).toEqual([]);
  });
});

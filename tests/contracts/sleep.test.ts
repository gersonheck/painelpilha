import { describe, expect, it } from 'vitest';
import { isClockTime, isSleepRecord, type SleepRecord } from '../../src/shared/contracts/sleep';

describe('sleep contract', () => {
  const collaboratorId = 'a'.repeat(64);
  const validRecord: SleepRecord = {
    id: 'sleep-1',
    collaboratorId,
    dayKey: '2026-08-10',
    timestamp: '2026-08-10T09:00:00.000Z',
    sleepHours: 7.5,
    bedTime: '23:00',
    wakeTime: '06:30',
    source: 'manual',
    confidence: 1,
    perceivedQuality: 4,
  };

  it('accepts strict clock times only', () => {
    expect(isClockTime('00:00')).toBe(true);
    expect(isClockTime('23:59')).toBe(true);
    expect(isClockTime('24:00')).toBe(false);
    expect(isClockTime('6:30')).toBe(false);
  });

  it('accepts a complete sleep record', () => {
    expect(isSleepRecord(validRecord)).toBe(true);
  });

  it('rejects calendar dates that do not round-trip', () => {
    expect(isSleepRecord({ ...validRecord, dayKey: '2026-02-30' })).toBe(false);
  });

  it('requires paired bed and wake times', () => {
    expect(isSleepRecord({ ...validRecord, wakeTime: undefined })).toBe(false);
  });

  it('rejects untrusted identifiers, sources and confidence', () => {
    expect(isSleepRecord({ ...validRecord, collaboratorId: '../global' })).toBe(false);
    expect(isSleepRecord({ ...validRecord, source: 'unknown' })).toBe(false);
    expect(isSleepRecord({ ...validRecord, confidence: 1.5 })).toBe(false);
  });

  it('keeps implausible manual corrections possible but bounded', () => {
    expect(isSleepRecord({ ...validRecord, sleepHours: 2.5 })).toBe(true);
    expect(isSleepRecord({ ...validRecord, sleepHours: 18 })).toBe(false);
  });
});

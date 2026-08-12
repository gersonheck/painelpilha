import { describe, expect, it } from 'vitest';
import type { SleepRecord } from '../../src/shared/contracts/sleep';
import {
  calculateSleepDurationHours,
  classifySleepDuration,
  estimateSleepDebt,
  evaluatePassiveWakeDecision,
  getSuggestedSleepTimes,
  isSleepDurationPlausible,
  minutesToClockTime,
  summarizeSleepPatterns,
  selectRecentSleepNights,
  timeToMinutes,
} from '../../src/features/sleep/domain/sleepTracking';

describe('sleep tracking domain', () => {
  const collaboratorId = 'a'.repeat(64);
  const record = (id: string, dayKey: string, sleepHours: number, overrides: Partial<SleepRecord> = {}): SleepRecord => ({
    id,
    collaboratorId,
    dayKey,
    timestamp: `${dayKey}T09:00:00.000Z`,
    sleepHours,
    bedTime: '23:00',
    wakeTime: '06:30',
    source: 'manual',
    confidence: 1,
    ...overrides,
  });

  it('calculates overnight durations and clock conversions', () => {
    expect(timeToMinutes('06:30')).toBe(390);
    expect(minutesToClockTime(-60)).toBe('23:00');
    expect(calculateSleepDurationHours('23:15', '06:45')).toBe(7.5);
    expect(calculateSleepDurationHours('18:00', '09:00')).toBe(15);
  });

  it('suggests times from recent bed and wake history first', () => {
    const suggestion = getSuggestedSleepTimes([
      { timestamp: '2026-08-10T09:00:00.000Z', bedTime: '23:30', wakeTime: '06:30' },
      { timestamp: '2026-08-09T09:00:00.000Z', bedTime: '22:30', wakeTime: '06:30' },
    ]);

    expect(suggestion).toEqual({
      bedTime: '23:00',
      wakeTime: '06:30',
      sleepHours: 7.5,
      source: 'history',
    });
  });

  it('averages wake times across midnight without shifting the suggestion to noon', () => {
    expect(getSuggestedSleepTimes([
      { timestamp: '2026-08-10T09:00:00.000Z', bedTime: '23:00', wakeTime: '23:50' },
      { timestamp: '2026-08-09T09:00:00.000Z', bedTime: '23:00', wakeTime: '00:10' },
    ])).toMatchObject({ wakeTime: '00:00', source: 'history' });
  });

  it('falls back to recent duration and then default schedule', () => {
    expect(getSuggestedSleepTimes([{ sleepHours: 6 }, { sleepHours: 8 }])).toEqual({
      bedTime: '23:30',
      wakeTime: '06:30',
      sleepHours: 7,
      source: 'duration',
    });
    expect(getSuggestedSleepTimes([])).toEqual({
      bedTime: '23:00',
      wakeTime: '06:30',
      sleepHours: 7.5,
      source: 'default',
    });
  });

  it('classifies duration zones without hiding implausible values', () => {
    expect(isSleepDurationPlausible(2.5)).toBe(false);
    expect(classifySleepDuration(4.5)).toMatchObject({ zone: 'insufficient', color: 'red' });
    expect(classifySleepDuration(6.5)).toMatchObject({ zone: 'below-target', color: 'yellow' });
    expect(classifySleepDuration(8)).toMatchObject({ zone: 'target', color: 'green' });
    expect(classifySleepDuration(10)).toMatchObject({ zone: 'long', color: 'blue' });
  });

  it('summarizes sleep debt and pattern status with distinct nights only', () => {
    const records = [
      record('s1', '2026-08-10', 5.5),
      record('s1-edit', '2026-08-10', 8, { timestamp: '2026-08-10T10:00:00.000Z' }),
      record('s2', '2026-08-09', 6),
      record('s3', '2026-08-08', 6.5),
    ];

    expect(estimateSleepDebt(records, 7.5)).toMatchObject({
      days: 4,
      averageHours: 6.5,
    });
    expect(selectRecentSleepNights(records).map((item) => item.dayKey)).toEqual([
      '2026-08-10', '2026-08-09', '2026-08-08',
    ]);
    expect(summarizeSleepPatterns(records, { targetSleepHours: 7.5 })).toMatchObject({
      days: 3,
      observedHours: 20.5,
      status: 'sleep-debt',
    });
  });

  it('keeps passive wake detection conservative during likely sleep windows', () => {
    expect(evaluatePassiveWakeDecision({
      wakeProbability: 0.8,
      concordantSignals: 1,
      consecutiveWakeSeconds: 90,
      likelySleepWindow: true,
    })).toMatchObject({ decision: 'micro-arousal' });

    expect(evaluatePassiveWakeDecision({
      wakeProbability: 0.75,
      concordantSignals: 3,
      consecutiveWakeSeconds: 60,
      likelySleepWindow: true,
    })).toMatchObject({ decision: 'confirmed-wake' });

    expect(evaluatePassiveWakeDecision({
      wakeProbability: 0.6,
      activePhoneUse: true,
      concordantSignals: 1,
      consecutiveWakeSeconds: 30,
      likelySleepWindow: true,
    })).toMatchObject({ decision: 'probable-wake' });

    expect(evaluatePassiveWakeDecision({
      wakeProbability: 0.6,
      activePhoneUse: 'false' as unknown as boolean,
      concordantSignals: 1,
      consecutiveWakeSeconds: 30,
      likelySleepWindow: true,
    })).toMatchObject({ decision: 'micro-arousal' });

    expect(evaluatePassiveWakeDecision({
      wakeProbability: 0.8,
      concordantSignals: 1,
      consecutiveWakeSeconds: 90,
      likelySleepWindow: 'false' as unknown as boolean,
    })).toMatchObject({ decision: 'sleep' });

    expect(evaluatePassiveWakeDecision({
      wakeProbability: Number.NaN,
      concordantSignals: 3,
      consecutiveWakeSeconds: 60,
    })).toMatchObject({ decision: 'sleep', confidence: 0 });
  });
});

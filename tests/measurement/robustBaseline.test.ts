import { describe, expect, it } from 'vitest';
import {
  calculateRobustBaseline,
  classifyIndividualDeviation,
  type BaselineProtocol,
  type BaselineSample,
} from '../../src/features/measurement/domain/robustBaseline';

const NOW = new Date('2026-07-20T12:00:00.000Z');
const PROTOCOL: BaselineProtocol = {
  posture: 'seated',
  captureMode: 'finger-ppg',
  timeBand: 'morning',
};

const sample = (
  day: number,
  rmssd: number,
  overrides: Partial<BaselineSample> = {},
): BaselineSample => ({
  timestamp: new Date(Date.UTC(2026, 6, day, 9)).toISOString(),
  posture: 'seated',
  captureMode: 'finger-ppg',
  timeBand: 'morning',
  rmssd,
  accepted: true,
  ...overrides,
});

const calculate = (
  samples: BaselineSample[],
  options: Parameters<typeof calculateRobustBaseline>[2] = {},
) => calculateRobustBaseline(samples, PROTOCOL, { now: NOW, ...options });

describe('robust individual baseline', () => {
  it('uses only accepted samples from the selected protocol', () => {
    const baseline = calculate([
      sample(1, 40), sample(2, 42), sample(3, 41), sample(4, 43), sample(5, 40),
      sample(6, 200, { posture: 'standing' }),
      sample(7, 200, { accepted: false }),
    ]);
    expect(baseline?.sampleSize).toBe(5);
    expect(Math.exp(baseline!.medianLogRmssd)).toBeCloseTo(41, 5);
  });

  it('does not mix capture modes or collection time bands', () => {
    const baseline = calculate([
      sample(1, 40), sample(2, 42), sample(3, 41), sample(4, 43), sample(5, 40),
      sample(6, 200, { captureMode: 'facial-rppg' }),
      sample(7, 200, { timeBand: 'evening' }),
    ]);
    expect(baseline?.sampleSize).toBe(5);
    expect(baseline).toMatchObject(PROTOCOL);
  });

  it('returns insufficient baseline instead of mixing postures', () => {
    expect(calculate([
      sample(1, 40), sample(2, 41), sample(3, 42, { posture: 'lying' }),
    ])).toBeNull();
  });

  it('rejects samples outside the maximum age window', () => {
    const staleSamples = [40, 41, 42, 43, 44].map((rmssd, index) => sample(index + 1, rmssd, {
      timestamp: new Date(Date.UTC(2026, 4, index + 1, 9)).toISOString(),
    }));
    expect(calculate(staleSamples)).toBeNull();
  });

  it('requires samples from at least three distinct days', () => {
    const sameDay = Array.from({ length: 5 }, (_, index) => sample(10, 40 + index, {
      timestamp: new Date(Date.UTC(2026, 6, 10, 8 + index)).toISOString(),
    }));
    expect(calculate(sameDay)).toBeNull();
  });

  it('requires accepted to be the boolean true', () => {
    const malformed = sample(5, 44, { accepted: 'false' as unknown as boolean });
    expect(calculate([
      sample(1, 40), sample(2, 41), sample(3, 42), sample(4, 43), malformed,
    ])).toBeNull();
  });

  it('uses a dispersion floor and classifies bilateral deviations', () => {
    const baseline = calculate([
      sample(1, 40), sample(2, 40), sample(3, 40), sample(4, 40), sample(5, 40),
    ], { sigmaFloor: 0.05 })!;
    expect(baseline.dispersion).toBe(0.05);
    expect(classifyIndividualDeviation(40, baseline).classification).toBe('expected');
    expect(classifyIndividualDeviation(20, baseline).classification).toBe('outside');
    expect(classifyIndividualDeviation(80, baseline).classification).toBe('outside');
  });

  it('rejects invalid configuration and measurements', () => {
    expect(() => calculate([], { minimumSamples: 0 })).toThrow();
    expect(() => calculate([], { maximumAgeDays: 0 })).toThrow();
    expect(() => calculate([], { maxSamples: Number.NaN })).toThrow();
    expect(() => calculate([], { sigmaFloor: Number.POSITIVE_INFINITY })).toThrow();
    expect(() => calculate([], { minimumDistinctDays: 6, minimumSamples: 5 })).toThrow();
    const baseline = calculate([
      sample(1, 40), sample(2, 41), sample(3, 42), sample(4, 43), sample(5, 44),
    ])!;
    expect(() => classifyIndividualDeviation(0, baseline)).toThrow();
    expect(() => classifyIndividualDeviation(40, {
      ...baseline,
      medianLogRmssd: Number.NaN,
    })).toThrow();
  });
});

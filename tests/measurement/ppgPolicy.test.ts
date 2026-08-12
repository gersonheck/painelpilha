import { describe, expect, it } from 'vitest';
import { evaluateSignalQuality, type SignalQualityInput } from '../../src/features/measurement/domain/ppgPolicy';

const validSample = (overrides: Partial<SignalQualityInput> = {}): SignalQualityInput => ({
  analyzableSeconds: 60,
  monotonicTimestamps: true,
  postureMaintained: true,
  validIntervals: 60,
  signalSaturated: false,
  artifactRatio: 0.02,
  traceQuality: 0.9,
  motionAbsence: 0.9,
  segmentStability: 0.9,
  protocolAdherence: 1,
  ...overrides,
});

describe('evaluateSignalQuality', () => {
  it('accepts a sample only when hard gates and confidence pass', () => {
    expect(evaluateSignalQuality(validSample())).toMatchObject({
      status: 'accepted',
      reasons: [],
    });
  });

  it('requires a repeat when posture changes even with a high weighted score', () => {
    const result = evaluateSignalQuality(validSample({ postureMaintained: false }));
    expect(result.status).toBe('repeat-required');
    expect(result.reasons).toContain('A postura mudou durante a coleta.');
  });

  it('requires a repeat for short, artifact-heavy or low-confidence samples', () => {
    const result = evaluateSignalQuality(validSample({
      analyzableSeconds: 59,
      artifactRatio: 0.2,
      traceQuality: 0.2,
      motionAbsence: 0.2,
    }));
    expect(result.status).toBe('repeat-required');
    expect(result.reasons.length).toBeGreaterThanOrEqual(3);
  });

  it('rejects negative artifact ratios', () => {
    const result = evaluateSignalQuality(validSample({ artifactRatio: -0.01 }));
    expect(result.status).toBe('repeat-required');
    expect(result.reasons).toContain('Excesso de artefatos ou movimento.');
  });

  it.each([
    ['monotonicTimestamps', 'false'],
    ['postureMaintained', 'false'],
    ['signalSaturated', 'false'],
  ] as const)('rejects a non-boolean %s gate', (field, value) => {
    const malformed = { ...validSample(), [field]: value } as unknown as SignalQualityInput;
    expect(evaluateSignalQuality(malformed).status).toBe('repeat-required');
  });

  it('rejects a fractional number of valid intervals', () => {
    expect(evaluateSignalQuality(validSample({ validIntervals: 30.5 })).status).toBe('repeat-required');
  });

  it.each([
    ['traceQuality', -0.01],
    ['motionAbsence', 1.01],
    ['segmentStability', Number.NaN],
    ['protocolAdherence', Number.POSITIVE_INFINITY],
  ] as const)('rejects an invalid %s confidence component', (field, value) => {
    const result = evaluateSignalQuality(validSample({ [field]: value }));
    expect(result.status).toBe('repeat-required');
    expect(result.reasons).toContain('Componentes de confiança fora do intervalo válido.');
  });
});

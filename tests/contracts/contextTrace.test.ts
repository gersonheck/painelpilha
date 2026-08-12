import { describe, expect, it } from 'vitest';
import { isContextTrace } from '../../src/shared/contracts/contextTrace';

const validTrace = {
  id: 'trace-1',
  collaboratorId: 'a'.repeat(64),
  questionId: 'energy-level',
  dayKey: '2026-08-04',
  timestamp: '2026-08-04T12:00:00.000Z',
  answer: 4,
};

describe('isContextTrace', () => {
  it('accepts a valid context trace', () => {
    expect(isContextTrace(validTrace)).toBe(true);
  });

  it('rejects a dayKey that only becomes valid after string coercion', () => {
    expect(isContextTrace({ ...validTrace, dayKey: ['2026-08-04'] })).toBe(false);
  });

  it('rejects a dayKey that is not a real calendar date', () => {
    expect(isContextTrace({ ...validTrace, dayKey: '2026-13-40' })).toBe(false);
    expect(isContextTrace({ ...validTrace, dayKey: '2026-02-29' })).toBe(false);
  });
});

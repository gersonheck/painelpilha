import { describe, expect, it } from 'vitest';
import {
  createEnvelope,
  isIsoDate,
  isIsoDay,
  parseEnvelope,
} from '../../src/shared/contracts/persistence';

describe('persistence envelope', () => {
  const collaboratorId = 'a'.repeat(64);
  const isName = (value: unknown): value is { name: string } => (
    Boolean(value) && typeof value === 'object' && typeof (value as { name?: unknown }).name === 'string'
  );

  it('round-trips valid versioned data', () => {
    const raw = JSON.stringify(createEnvelope('example', collaboratorId, { name: 'PilhA+' }));
    expect(parseEnvelope(raw, { kind: 'example', collaboratorId, validate: isName })?.data).toEqual({
      name: 'PilhA+',
    });
  });

  it('rejects another collaborator, kind, malformed JSON or invalid data', () => {
    const raw = JSON.stringify(createEnvelope('example', collaboratorId, { name: 'PilhA+' }));
    expect(parseEnvelope(raw, { kind: 'other', collaboratorId, validate: isName })).toBeNull();
    expect(parseEnvelope(raw, { kind: 'example', collaboratorId: 'b'.repeat(64), validate: isName })).toBeNull();
    expect(parseEnvelope('{broken', { kind: 'example', collaboratorId, validate: isName })).toBeNull();
  });

  it('accepts only canonical and real ISO instants', () => {
    expect(isIsoDate('2026-08-04T12:30:00.000Z')).toBe(true);
    expect(isIsoDate('1')).toBe(false);
    expect(isIsoDate('2026-02-31T12:30:00.000Z')).toBe(false);
    expect(isIsoDate('2026-08-04T12:30:00Z')).toBe(false);
  });

  it('accepts only real calendar day keys', () => {
    expect(isIsoDay('2026-08-04')).toBe(true);
    expect(isIsoDay('2026-02-29')).toBe(false);
    expect(isIsoDay('2026-13-40')).toBe(false);
  });

  it('rejects envelopes with noncanonical timestamps', () => {
    const raw = JSON.stringify({
      ...createEnvelope('example', collaboratorId, { name: 'PilhA+' }),
      updatedAt: '2026-02-31T12:30:00.000Z',
    });
    expect(parseEnvelope(raw, { kind: 'example', collaboratorId, validate: isName })).toBeNull();
  });
});

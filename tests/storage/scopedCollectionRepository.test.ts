import { beforeEach, describe, expect, it } from 'vitest';
import { measurementRepository } from '../../src/features/measurement/data/measurementRepository';
import type { Measurement } from '../../src/shared/contracts/measurement';

describe('scopedCollectionRepository', () => {
  const firstId = 'a'.repeat(64);
  const secondId = 'b'.repeat(64);
  const measurement = (id: string, collaboratorId: string): Measurement => ({
    id,
    collaboratorId,
    timestamp: '2026-07-30T12:00:00.000Z',
    pilhaScore: 72,
    mood: 4,
  });

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('persists a versioned envelope scoped to one collaborator', () => {
    measurementRepository.add(firstId, measurement('m1', firstId));
    expect(measurementRepository.list(firstId)).toEqual([measurement('m1', firstId)]);
    expect(measurementRepository.list(secondId)).toEqual([]);
  });

  it('rejects records belonging to a different collaborator', () => {
    expect(() => measurementRepository.add(firstId, measurement('m1', secondId))).toThrow(
      'outro colaborador',
    );
  });

  it('fails closed when persisted data does not match the envelope contract', () => {
    window.localStorage.setItem(`pa_history_collaborator_${firstId}`, '{broken');
    expect(measurementRepository.list(firstId)).toEqual([]);
  });

  it('fails closed when an envelope mixes collaborators', () => {
    window.localStorage.setItem(
      `pa_history_collaborator_${firstId}`,
      JSON.stringify({
        schemaVersion: 1,
        kind: 'measurement-history',
        collaboratorId: firstId,
        updatedAt: '2026-07-30T12:00:00.000Z',
        data: [measurement('m1', secondId)],
      }),
    );
    expect(measurementRepository.list(firstId)).toEqual([]);
  });
});

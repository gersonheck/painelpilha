import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultProfile, isProfile } from '../../src/shared/contracts/profile';
import { profileRepository } from '../../src/features/profile/data/profileRepository';

describe('profileRepository', () => {
  const firstId = 'a'.repeat(64);
  const secondId = 'b'.repeat(64);

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('keeps profiles isolated by collaborator identifier', () => {
    profileRepository.save({ ...createDefaultProfile(firstId), name: 'Ana', role: 'Produto' });
    profileRepository.save({ ...createDefaultProfile(secondId), name: 'Bia', role: 'Operações' });

    expect(profileRepository.get(firstId).name).toBe('Ana');
    expect(profileRepository.get(secondId).name).toBe('Bia');
  });

  it('does not accept a profile stored under another collaborator', () => {
    window.localStorage.setItem(
      `pa_profile_collaborator_${firstId}`,
      JSON.stringify({ ...createDefaultProfile(secondId), name: 'Perfil incorreto' }),
    );
    expect(profileRepository.get(firstId)).toEqual(createDefaultProfile(firstId));
  });

  it('rejects profile statuses that only match after string coercion', () => {
    expect(isProfile({ ...createDefaultProfile(firstId), leaveStatus: ['active'] })).toBe(false);
    expect(isProfile({ ...createDefaultProfile(firstId), newJobStatus: ['yes'] })).toBe(false);
  });

  it('migrates a valid unwrapped scoped profile to the versioned envelope', () => {
    const key = `pa_profile_collaborator_${firstId}`;
    const legacy = { ...createDefaultProfile(firstId), name: 'Legado', role: 'Produto' };
    window.localStorage.setItem(key, JSON.stringify(legacy));

    expect(profileRepository.get(firstId)).toEqual(legacy);
    expect(JSON.parse(window.localStorage.getItem(key) ?? '{}')).toMatchObject({
      schemaVersion: 1,
      kind: 'profile',
      collaboratorId: firstId,
      data: legacy,
    });
  });
});

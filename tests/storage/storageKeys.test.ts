import { describe, expect, it } from 'vitest';
import { collaboratorStorageKey } from '../../src/shared/storage/storageKeys';

describe('collaboratorStorageKey', () => {
  const collaboratorId = 'a'.repeat(64);

  it('builds an isolated key from a pseudonymous identifier', () => {
    expect(collaboratorStorageKey('profile', collaboratorId)).toBe(
      `pa_profile_collaborator_${collaboratorId}`,
    );
  });

  it('builds an isolated key for sleep records', () => {
    expect(collaboratorStorageKey('sleep_records', collaboratorId)).toBe(
      `pa_sleep_records_collaborator_${collaboratorId}`,
    );
  });

  it('rejects identifiers that could collide with storage namespaces', () => {
    expect(() => collaboratorStorageKey('history', '../global')).toThrow(
      'Identificador de colaborador inválido',
    );
  });
});

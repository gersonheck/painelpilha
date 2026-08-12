import { beforeEach, describe, expect, it } from 'vitest';
import { localAuthRepository } from '../../src/features/access/data/localAuthRepository';
import { STORAGE_KEYS } from '../../src/shared/storage/storageKeys';

describe('localAuthRepository', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('registers without persisting raw email or password', async () => {
    const session = await localAuthRepository.register('pessoa@exemplo.com', 'senha-segura');
    const persisted = [
      window.localStorage.getItem(STORAGE_KEYS.credentialRegistry),
      window.localStorage.getItem(STORAGE_KEYS.accessSession),
    ].join('');
    expect(session.collaboratorId).toMatch(/^[a-f0-9]{64}$/);
    expect(persisted).not.toContain('pessoa@exemplo.com');
    expect(persisted).not.toContain('senha-segura');
    expect(localAuthRepository.getSession()).toEqual(session);
  });

  it('keeps credentials but removes the session on logout', async () => {
    await localAuthRepository.register('logout@exemplo.com', 'senha-segura');
    localAuthRepository.logout();
    expect(localAuthRepository.getSession()).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEYS.credentialRegistry)).not.toBeNull();
  });

  it('does not overwrite a corrupted credential registry', async () => {
    window.localStorage.setItem(STORAGE_KEYS.credentialRegistry, '{invalid');
    await expect(
      localAuthRepository.register('novo@exemplo.com', 'senha-segura'),
    ).rejects.toThrow('dados de acesso locais estão corrompidos');
    expect(window.localStorage.getItem(STORAGE_KEYS.credentialRegistry)).toBe('{invalid');
  });
});

import { describe, expect, it } from 'vitest';
import {
  constantTimeEqual,
  createPasswordSalt,
  deriveCollaboratorId,
  derivePasswordHash,
} from '../../src/shared/security/localIdentity';

describe('localIdentity', () => {
  it('creates the same opaque identifier for equivalent emails', async () => {
    const first = await deriveCollaboratorId(' Pessoa@Exemplo.com ');
    const second = await deriveCollaboratorId('pessoa@exemplo.com');
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain('pessoa');
  });

  it('derives distinct password hashes with different salts', async () => {
    const firstSalt = createPasswordSalt();
    const secondSalt = createPasswordSalt();
    const first = await derivePasswordHash('senha-segura', firstSalt);
    const second = await derivePasswordHash('senha-segura', secondSalt);
    expect(first).not.toBe(second);
    expect(constantTimeEqual(first, first)).toBe(true);
  });

  it('rejects short passwords', async () => {
    await expect(derivePasswordHash('curta', createPasswordSalt())).rejects.toThrow(
      'pelo menos 8 caracteres',
    );
  });
});

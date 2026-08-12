import { describe, expect, it } from 'vitest';
import {
  activateOrganizationInvitation,
  createOrganizationIdentity,
  createOrganizationInvitation,
  createOrganizationPrefix,
  createUserSerial,
  getInvitationDisplayStatus,
  markInvitationEmailPrepared,
  PILHA_ORGANIZATION,
  renewOrganizationInvitation,
  revokeInvitation,
} from '../../src/features/management/domain/organizationInvitation';

describe('organization invitations', () => {
  it('builds the prefix from the first five normalized letters', () => {
    expect(createOrganizationPrefix('Pilha')).toBe('PILHA');
    expect(createOrganizationPrefix('Árvore Saúde')).toBe('ARVOR');
    expect(() => createOrganizationPrefix('ABC')).toThrow('cinco letras');
  });

  it('represents preparation, expiration and revocation as explicit lifecycle states', async () => {
    const now = new Date('2026-08-03T12:00:00.000Z');
    const created = await createOrganizationInvitation({
      organization: PILHA_ORGANIZATION, sequence: 7, name: 'Maria Silva', email: 'maria@example.com',
      activationBaseUrl: 'https://app.pilha.test', now,
    });
    expect(getInvitationDisplayStatus(created.invitation, now)).toBe('pending');
    expect(markInvitationEmailPrepared(created.invitation, now)).toMatchObject({ status: 'email-prepared', emailPreparedAt: now.toISOString() });
    expect(getInvitationDisplayStatus(created.invitation, new Date('2026-08-06T12:00:00.000Z'))).toBe('expired');
    expect(revokeInvitation(created.invitation, now)).toMatchObject({ status: 'revoked', revokedAt: now.toISOString() });
  });

  it('treats malformed expiration timestamps as expired', async () => {
    const created = await createOrganizationInvitation({
      organization: PILHA_ORGANIZATION, sequence: 8, name: 'Rita Lima', email: 'rita@example.com',
      activationBaseUrl: 'https://app.pilha.test', now: new Date('2026-08-03T12:00:00.000Z'),
    });
    const malformed = { ...created.invitation, expiresAt: 'not-a-date' };
    expect(getInvitationDisplayStatus(malformed)).toBe('expired');
    const token = new URL(created.activationUrl).searchParams.get('token') ?? '';
    await expect(activateOrganizationInvitation(malformed, token)).rejects.toThrow('expirou');
  });

  it('rotates the activation secret while preserving the person serial on resend', async () => {
    const created = await createOrganizationInvitation({
      organization: PILHA_ORGANIZATION, sequence: 9, name: 'Ana Lima', email: 'ana@example.com',
      activationBaseUrl: 'https://app.pilha.test', now: new Date('2026-08-03T12:00:00.000Z'),
    });
    const renewed = await renewOrganizationInvitation(created.invitation, 'https://app.pilha.test', new Date('2026-08-04T12:00:00.000Z'));
    expect(renewed.invitation.userSerial).toBe(created.invitation.userSerial);
    expect(renewed.invitation.id).toBe(created.invitation.id);
    expect(renewed.invitation.tokenDigest).not.toBe(created.invitation.tokenDigest);
    expect(renewed.activationUrl).not.toBe(created.activationUrl);
  });

  it('validates the secret and consumes an activation invitation only once', async () => {
    const now = new Date('2026-08-03T12:00:00.000Z');
    const created = await createOrganizationInvitation({
      organization: PILHA_ORGANIZATION, sequence: 10, name: 'João Luz', email: 'joao@example.com',
      activationBaseUrl: 'https://app.pilha.test', now,
    });
    const token = new URL(created.activationUrl).searchParams.get('token') ?? '';
    await expect(activateOrganizationInvitation(created.invitation, 'token-incorreto', now)).rejects.toThrow('inválido');

    const activated = await activateOrganizationInvitation(created.invitation, token, now);
    expect(activated).toMatchObject({ status: 'activated', activatedAt: now.toISOString() });
    await expect(activateOrganizationInvitation(activated, token, now)).rejects.toThrow('já foi utilizado');
  });

  it('does not reopen an activated invitation when preparing email', async () => {
    const now = new Date('2026-08-03T12:00:00.000Z');
    const created = await createOrganizationInvitation({
      organization: PILHA_ORGANIZATION, sequence: 12, name: 'Lia Souza', email: 'lia@example.com',
      activationBaseUrl: 'https://app.pilha.test', now,
    });
    const token = new URL(created.activationUrl).searchParams.get('token') ?? '';
    const activated = await activateOrganizationInvitation(created.invitation, token, now);

    expect(() => markInvitationEmailPrepared(activated, now)).toThrow('já foi utilizado');
    expect(activated.status).toBe('activated');
  });

  it('rejects activation after expiration or revocation', async () => {
    const created = await createOrganizationInvitation({
      organization: PILHA_ORGANIZATION, sequence: 11, name: 'Bia Luz', email: 'bia@example.com',
      activationBaseUrl: 'https://app.pilha.test', now: new Date('2026-08-03T12:00:00.000Z'),
    });
    const token = new URL(created.activationUrl).searchParams.get('token') ?? '';
    await expect(activateOrganizationInvitation(created.invitation, token, new Date('2026-08-06T12:00:00.000Z'))).rejects.toThrow('expirou');
    await expect(activateOrganizationInvitation(revokeInvitation(created.invitation), token)).rejects.toThrow('revogado');
  });

  it('formats organization and user serial numbers', () => {
    expect(PILHA_ORGANIZATION).toEqual({ name: 'Pilha', prefix: 'PILHA', id: '00001' });
    expect(createUserSerial(PILHA_ORGANIZATION, 1)).toBe('PILHA-00001-000001');
    expect(createUserSerial(PILHA_ORGANIZATION, 42)).toBe('PILHA-00001-000042');
    expect(() => createOrganizationIdentity('Pilha', 100_000)).toThrow();
  });

  it('creates a 48-hour invitation without putting email in the activation URL', async () => {
    const created = await createOrganizationInvitation({
      organization: PILHA_ORGANIZATION,
      sequence: 1,
      name: ' Pessoa Convidada ',
      email: ' PESSOA@EXEMPLO.COM ',
      activationBaseUrl: 'https://app.pilha.test',
      now: new Date('2026-08-03T12:00:00.000Z'),
    });
    expect(created.invitation).toMatchObject({
      userSerial: 'PILHA-00001-000001',
      name: 'Pessoa Convidada',
      email: 'pessoa@exemplo.com',
      status: 'pending',
      expiresAt: '2026-08-05T12:00:00.000Z',
    });
    expect(created.invitation.tokenDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(created.activationUrl).toContain('/ativar-conta?token=');
    expect(created.activationUrl).not.toContain('pessoa%40exemplo.com');
    expect(created.activationUrl).not.toContain(created.invitation.tokenDigest);
  });

  it('requires only a valid name and email and rejects invalid sequences', async () => {
    await expect(createOrganizationInvitation({
      organization: PILHA_ORGANIZATION,
      sequence: 1,
      name: 'A',
      email: 'invalid',
      activationBaseUrl: 'https://app.pilha.test',
    })).rejects.toThrow('nome');
    expect(() => createUserSerial(PILHA_ORGANIZATION, 0)).toThrow();
  });
});

import { describe, expect, it, vi } from 'vitest';
import {
  createOrganizationAccessService,
  InMemoryOrganizationAccessRepository,
  type OrganizationActor,
} from '../../src/features/management/domain/organizationAccessService';
import { PILHA_ORGANIZATION } from '../../src/features/management/domain/organizationInvitation';

const administrator: OrganizationActor = {
  id: 'admin-1', organizationId: PILHA_ORGANIZATION.id, role: 'organization-admin',
};

const createService = () => createOrganizationAccessService(
  new InMemoryOrganizationAccessRepository([PILHA_ORGANIZATION]),
);

describe('organization access service', () => {
  it('serializes concurrent invitations without duplicating organization sequences', async () => {
    const service = createService();
    const invitations = await Promise.all(Array.from({ length: 20 }, (_, index) => service.invite(administrator, {
      name: `Pessoa ${index}`,
      email: `pessoa-${index}@example.com`,
      activationBaseUrl: 'https://app.pilha.test',
    })));
    expect(new Set(invitations.map(({ invitation }) => invitation.userSerial)).size).toBe(20);
    expect(invitations.map(({ invitation }) => invitation.userSerial).sort()).toEqual(
      Array.from({ length: 20 }, (_, index) => `PILHA-00001-${String(index + 1).padStart(6, '0')}`),
    );
  });

  it('enforces administration and active-email uniqueness', async () => {
    const service = createService();
    await service.invite(administrator, { name: 'Ana', email: 'ana@example.com', activationBaseUrl: 'https://app.test' });
    await expect(service.invite(administrator, { name: 'Outra Ana', email: ' ANA@example.com ', activationBaseUrl: 'https://app.test' }))
      .rejects.toThrow('convite ativo');
    await expect(service.list({ ...administrator, role: 'collaborator' })).rejects.toThrow('não autorizada');
    await expect(service.list({ ...administrator, organizationId: '00002' })).rejects.toThrow('não encontrada');
  });

  it('returns activation links only when issuing or renewing a token', async () => {
    const service = createService();
    const created = await service.invite(administrator, {
      name: 'Lia', email: 'lia@example.com', activationBaseUrl: 'https://app.pilha.test',
    });
    const token = new URL(created.activationUrl).searchParams.get('token') ?? '';
    const stored = await service.list(administrator);

    expect(stored).toHaveLength(1);
    expect(stored[0]).toEqual(created.invitation);
    expect(stored[0]).not.toHaveProperty('activationUrl');
    expect(JSON.stringify(stored)).not.toContain(token);
  });

  it('allows a replacement invite after the previous one expires', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-04T12:00:00.000Z'));
    try {
      const service = createService();
      await service.invite(administrator, {
        name: 'Ana', email: 'ana@example.com', activationBaseUrl: 'https://app.test',
      });
      vi.advanceTimersByTime(49 * 60 * 60 * 1000);
      await expect(service.invite(administrator, {
        name: 'Ana novamente', email: 'ana@example.com', activationBaseUrl: 'https://app.test',
      })).resolves.toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not renew an old invitation when a replacement is active', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-04T12:00:00.000Z'));
    try {
      const service = createService();
      const original = await service.invite(administrator, {
        name: 'Ana', email: 'ana@example.com', activationBaseUrl: 'https://app.test',
      });
      vi.advanceTimersByTime(49 * 60 * 60 * 1000);
      await service.invite(administrator, {
        name: 'Ana nova', email: 'ana@example.com', activationBaseUrl: 'https://app.test',
      });
      await expect(service.resend(administrator, original.invitation.id, 'https://app.test'))
        .rejects.toThrow('convite ativo');
    } finally {
      vi.useRealTimers();
    }
  });

  it('activates once and persists the consumed state atomically', async () => {
    const service = createService();
    const created = await service.invite(administrator, {
      name: 'Bia', email: 'bia@example.com', activationBaseUrl: 'https://app.pilha.test',
    });
    const token = new URL(created.activationUrl).searchParams.get('token') ?? '';
    await expect(service.activate('token-inexistente')).rejects.toThrow('inválido ou indisponível');
    await expect(service.activate(token)).resolves.toMatchObject({ status: 'activated' });
    await expect(service.activate(token)).rejects.toThrow('já foi utilizado');
    await expect(service.revoke(administrator, created.invitation.id)).rejects.toThrow('conta ativada');
  });

  it('does not issue another invitation for an email with an activated account', async () => {
    const service = createService();
    const created = await service.invite(administrator, {
      name: 'Bia', email: 'bia@example.com', activationBaseUrl: 'https://app.pilha.test',
    });
    const token = new URL(created.activationUrl).searchParams.get('token') ?? '';
    await service.activate(token);

    await expect(service.invite(administrator, {
      name: 'Bia novamente', email: 'bia@example.com', activationBaseUrl: 'https://app.pilha.test',
    })).rejects.toThrow('convite ativo');
  });

  it('persists preparation, revocation and resend through the service', async () => {
    const service = createService();
    const created = await service.invite(administrator, {
      name: 'Caio', email: 'caio@example.com', activationBaseUrl: 'https://app.pilha.test',
    });
    await expect(service.markEmailPrepared(administrator, created.invitation.id))
      .resolves.toMatchObject({ status: 'email-prepared' });
    await expect(service.revoke(administrator, created.invitation.id))
      .resolves.toMatchObject({ status: 'revoked' });
    const renewed = await service.resend(administrator, created.invitation.id, 'https://app.pilha.test');
    expect(renewed.invitation.status).toBe('pending');
    expect(renewed.invitation.tokenDigest).not.toBe(created.invitation.tokenDigest);
    await expect(service.list(administrator)).resolves.toEqual([renewed.invitation]);
  });
});

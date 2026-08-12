import { describe, expect, it, vi } from 'vitest';
import { ApiError, createOrganizationAccessApi } from '../../src/shared/api/organizationAccessApi';

const invitation = {
  id: 'invite-1', organizationId: '00001', userSerial: 'PILHA-00001-000001', name: 'Pessoa', email: 'pessoa@example.com',
  status: 'pending', createdAt: '2026-08-03T12:00:00.000Z', expiresAt: '2026-08-05T12:00:00.000Z',
};
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('organization access API', () => {
  it('uses cookie credentials and CSRF without placing personal data in the URL', async () => {
    const request = vi.fn(async () => response({ invitation, activationUrl: 'https://app.test/ativar-conta?token=secret' }));
    const api = createOrganizationAccessApi({ fetch: request as typeof fetch, csrfToken: () => 'csrf-value' });
    await api.createInvitation({ name: 'Pessoa', email: 'pessoa@example.com' });
    expect(request).toHaveBeenCalledWith('/api/v1/organization/invitations', expect.objectContaining({
      method: 'POST', credentials: 'include', headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf-value' }),
    }));
    expect(request.mock.calls[0][0]).not.toContain('pessoa@example.com');
  });

  it('rejects malformed success responses instead of trusting server payloads', async () => {
    const api = createOrganizationAccessApi({ fetch: (async () => response({ status: 'pending' })) as typeof fetch });
    await expect(api.listInvitations()).rejects.toMatchObject({ status: 502 });
  });

  it('rejects a non-string invitation status from a successful response', async () => {
    const api = createOrganizationAccessApi({
      fetch: (async () => response({ items: [{ ...invitation, status: ['pending'] }] })) as typeof fetch,
    });
    await expect(api.listInvitations()).rejects.toMatchObject({ status: 502 });
  });

  it('maps rate limiting to a safe actionable message', async () => {
    const api = createOrganizationAccessApi({ fetch: (async () => response({}, 429)) as typeof fetch });
    await expect(api.activateAccount({ token: 'secret', password: 'password' })).rejects.toEqual(
      new ApiError(429, 'Muitas tentativas. Aguarde antes de tentar novamente.'),
    );
  });
});

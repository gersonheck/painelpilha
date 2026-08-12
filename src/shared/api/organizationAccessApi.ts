import type { OrganizationInvitation } from '../../features/management/domain/organizationInvitation';

export type OrganizationInvitationView = Omit<OrganizationInvitation, 'tokenDigest'>;
export interface CreatedInvitationView { invitation: OrganizationInvitationView; activationUrl: string }

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); this.name = 'ApiError'; }
}

export interface OrganizationAccessApi {
  listInvitations(): Promise<OrganizationInvitationView[]>;
  createInvitation(input: { name: string; email: string }): Promise<CreatedInvitationView>;
  markEmailPrepared(invitationId: string): Promise<OrganizationInvitationView>;
  revokeInvitation(invitationId: string): Promise<OrganizationInvitationView>;
  resendInvitation(invitationId: string): Promise<CreatedInvitationView>;
  activateAccount(input: { token: string; password: string }): Promise<{ userSerial: string }>;
}

type Fetch = typeof fetch;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

function isInvitation(value: unknown): value is OrganizationInvitationView {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string' && typeof value.organizationId === 'string'
    && typeof value.userSerial === 'string' && typeof value.name === 'string'
    && typeof value.email === 'string' && !('tokenDigest' in value)
    && typeof value.createdAt === 'string' && typeof value.expiresAt === 'string'
    && typeof value.status === 'string'
    && ['pending', 'email-prepared', 'activated', 'revoked'].includes(value.status);
}

function parseInvitation(value: unknown) {
  if (!isInvitation(value)) throw new ApiError(502, 'Resposta inválida do serviço de acessos.');
  return value;
}

function parseCreatedInvitation(value: unknown): CreatedInvitationView {
  if (!isRecord(value) || typeof value.activationUrl !== 'string') throw new ApiError(502, 'Resposta inválida do serviço de acessos.');
  return { invitation: parseInvitation(value.invitation), activationUrl: value.activationUrl };
}

export function createOrganizationAccessApi(options: { baseUrl?: string; fetch?: Fetch; csrfToken?: () => string | undefined } = {}): OrganizationAccessApi {
  const request = options.fetch ?? fetch;
  const baseUrl = options.baseUrl ?? '';
  async function call(path: string, init: RequestInit = {}) {
    const csrfToken = options.csrfToken?.();
    const response = await request(`${baseUrl}${path}`, {
      ...init, credentials: 'include',
      headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}), ...init.headers },
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message = response.status === 429 ? 'Muitas tentativas. Aguarde antes de tentar novamente.'
        : isRecord(body) && typeof body.message === 'string' ? body.message : 'Não foi possível concluir a operação.';
      throw new ApiError(response.status, message);
    }
    return body;
  }
  const post = (path: string, body?: unknown) => call(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
  return {
    async listInvitations() { const result = await call('/api/v1/organization/invitations'); if (!isRecord(result) || !Array.isArray(result.items)) throw new ApiError(502, 'Resposta inválida do serviço de acessos.'); return result.items.map(parseInvitation); },
    async createInvitation(input) { return parseCreatedInvitation(await post('/api/v1/organization/invitations', input)); },
    async markEmailPrepared(id) { return parseInvitation(await post(`/api/v1/organization/invitations/${encodeURIComponent(id)}/email-prepared`)); },
    async revokeInvitation(id) { return parseInvitation(await post(`/api/v1/organization/invitations/${encodeURIComponent(id)}/revoke`)); },
    async resendInvitation(id) { return parseCreatedInvitation(await post(`/api/v1/organization/invitations/${encodeURIComponent(id)}/resend`)); },
    async activateAccount(input) { const result = await post('/api/v1/access/activate', input); if (!isRecord(result) || typeof result.userSerial !== 'string') throw new ApiError(502, 'Resposta inválida do serviço de acessos.'); return { userSerial: result.userSerial }; },
  };
}

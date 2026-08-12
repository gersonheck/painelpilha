import {
  activateOrganizationInvitation,
  createOrganizationInvitation,
  digestActivationToken,
  getInvitationDisplayStatus,
  markInvitationEmailPrepared,
  normalizeInvitationEmail,
  renewOrganizationInvitation,
  revokeInvitation,
  type OrganizationIdentity,
  type OrganizationInvitation,
} from './organizationInvitation';

export type OrganizationRole = 'organization-admin' | 'collaborator';

export interface OrganizationActor {
  id: string;
  organizationId: string;
  role: OrganizationRole;
}

export interface OrganizationAccessState {
  organization: OrganizationIdentity;
  nextUserSequence: number;
  invitations: OrganizationInvitation[];
}

export interface OrganizationAccessRepository {
  transaction<T>(organizationId: string, operation: (state: OrganizationAccessState) => Promise<T>): Promise<T>;
  findInvitationByDigest(tokenDigest: string): Promise<OrganizationInvitation | null>;
}

const clone = <T>(value: T): T => structuredClone(value);

/** Adapter determinístico local; produção deve implementar o contrato com transações e índices únicos. */
export class InMemoryOrganizationAccessRepository implements OrganizationAccessRepository {
  private readonly states = new Map<string, OrganizationAccessState>();
  private queue: Promise<void> = Promise.resolve();

  constructor(organizations: OrganizationIdentity[]) {
    organizations.forEach((organization) => {
      this.states.set(organization.id, { organization: clone(organization), nextUserSequence: 1, invitations: [] });
    });
  }

  async transaction<T>(organizationId: string, operation: (state: OrganizationAccessState) => Promise<T>): Promise<T> {
    let release = () => {};
    const previous = this.queue;
    this.queue = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      const current = this.states.get(organizationId);
      if (!current) throw new Error('Organização não encontrada.');
      const draft = clone(current);
      const result = await operation(draft);
      this.states.set(organizationId, draft);
      return clone(result);
    } finally {
      release();
    }
  }

  async findInvitationByDigest(tokenDigest: string) {
    await this.queue;
    for (const state of this.states.values()) {
      const found = state.invitations.find((invitation) => invitation.tokenDigest === tokenDigest);
      if (found) return clone(found);
    }
    return null;
  }
}

function assertAdministrator(actor: OrganizationActor) {
  if (actor.role !== 'organization-admin') throw new Error('Ação não autorizada.');
}

function replaceInvitation(state: OrganizationAccessState, invitation: OrganizationInvitation) {
  const index = state.invitations.findIndex((item) => item.id === invitation.id);
  if (index < 0) throw new Error('Convite não encontrado.');
  state.invitations[index] = invitation;
}

export function createOrganizationAccessService(repository: OrganizationAccessRepository) {
  return {
    async invite(actor: OrganizationActor, input: { name: string; email: string; activationBaseUrl: string }) {
      assertAdministrator(actor);
      return repository.transaction(actor.organizationId, async (state) => {
        const email = normalizeInvitationEmail(input.email);
        const duplicate = state.invitations.some((invitation) => {
          const status = getInvitationDisplayStatus(invitation);
          return invitation.email === email && (status === 'pending' || status === 'email-prepared' || status === 'activated');
        });
        if (duplicate) throw new Error('Já existe um convite ativo para este e-mail.');
        const created = await createOrganizationInvitation({
          organization: state.organization,
          sequence: state.nextUserSequence,
          name: input.name,
          email,
          activationBaseUrl: input.activationBaseUrl,
        });
        state.nextUserSequence += 1;
        state.invitations.push(created.invitation);
        return created;
      });
    },

    async list(actor: OrganizationActor) {
      assertAdministrator(actor);
      return repository.transaction(actor.organizationId, async (state) => clone(state.invitations));
    },

    async revoke(actor: OrganizationActor, invitationId: string) {
      assertAdministrator(actor);
      return repository.transaction(actor.organizationId, async (state) => {
        const invitation = state.invitations.find((item) => item.id === invitationId);
        if (!invitation) throw new Error('Convite não encontrado.');
        if (invitation.status === 'activated') throw new Error('Uma conta ativada não pode ser revogada como convite.');
        const updated = revokeInvitation(invitation);
        replaceInvitation(state, updated);
        return updated;
      });
    },

    async markEmailPrepared(actor: OrganizationActor, invitationId: string) {
      assertAdministrator(actor);
      return repository.transaction(actor.organizationId, async (state) => {
        const invitation = state.invitations.find((item) => item.id === invitationId);
        if (!invitation) throw new Error('Convite não encontrado.');
        const updated = markInvitationEmailPrepared(invitation);
        replaceInvitation(state, updated);
        return updated;
      });
    },

    async resend(actor: OrganizationActor, invitationId: string, activationBaseUrl: string) {
      assertAdministrator(actor);
      return repository.transaction(actor.organizationId, async (state) => {
        const invitation = state.invitations.find((item) => item.id === invitationId);
        if (!invitation) throw new Error('Convite não encontrado.');
        if (invitation.status === 'activated') throw new Error('Uma conta ativada não pode receber novo convite.');
        const hasReplacement = state.invitations.some((other) => (
          other.id !== invitation.id
          && other.email === invitation.email
          && (getInvitationDisplayStatus(other) === 'pending' || getInvitationDisplayStatus(other) === 'email-prepared')
        ));
        if (hasReplacement) throw new Error('Já existe um convite ativo para este e-mail.');
        const renewed = await renewOrganizationInvitation(invitation, activationBaseUrl);
        replaceInvitation(state, renewed.invitation);
        return renewed;
      });
    },

    async activate(token: string): Promise<OrganizationInvitation> {
      const tokenDigest = await digestActivationToken(token);
      const located = await repository.findInvitationByDigest(tokenDigest);
      if (!located) throw new Error('Convite inválido ou indisponível.');
      return repository.transaction(located.organizationId, async (state) => {
        const current = state.invitations.find((item) => item.id === located.id);
        if (!current) throw new Error('Convite inválido ou indisponível.');
        const activated = await activateOrganizationInvitation(current, token);
        replaceInvitation(state, activated);
        return activated;
      });
    },
  };
}

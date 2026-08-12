export interface OrganizationIdentity {
  id: string;
  name: string;
  prefix: string;
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  userSerial: string;
  name: string;
  email: string;
  status: 'pending' | 'email-prepared' | 'activated' | 'revoked';
  tokenDigest: string;
  createdAt: string;
  expiresAt: string;
  emailPreparedAt?: string;
  activatedAt?: string;
  revokedAt?: string;
}

export interface CreatedInvitation {
  invitation: OrganizationInvitation;
  activationUrl: string;
}

export type InvitationDisplayStatus = OrganizationInvitation['status'] | 'expired';

const encoder = new TextEncoder();

const bytesToBase64Url = (bytes: Uint8Array) => {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const bytesToHex = (bytes: ArrayBuffer) => (
  [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
);

async function createActivationSecret(activationBaseUrl: string) {
  const token = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const tokenDigest = bytesToHex(await crypto.subtle.digest('SHA-256', encoder.encode(token)));
  const url = new URL('/ativar-conta', activationBaseUrl);
  url.searchParams.set('token', token);
  return { activationUrl: url.toString(), tokenDigest };
}

export async function digestActivationToken(token: string) {
  return bytesToHex(await crypto.subtle.digest('SHA-256', encoder.encode(token)));
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export function createOrganizationPrefix(name: string) {
  const letters = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase();
  if (letters.length < 5) throw new Error('O nome da organização precisa ter pelo menos cinco letras.');
  return letters.slice(0, 5);
}

export function createOrganizationIdentity(name: string, numericId: number): OrganizationIdentity {
  if (!Number.isSafeInteger(numericId) || numericId < 1 || numericId > 99_999) {
    throw new Error('Número de organização inválido.');
  }
  return { name: name.trim(), prefix: createOrganizationPrefix(name), id: String(numericId).padStart(5, '0') };
}

export function createUserSerial(organization: OrganizationIdentity, sequence: number) {
  if (!Number.isSafeInteger(sequence) || sequence < 1 || sequence > 999_999) {
    throw new Error('Sequência de usuário inválida.');
  }
  return `${organization.prefix}-${organization.id}-${String(sequence).padStart(6, '0')}`;
}

export function normalizeInvitationEmail(email: string) {
  return email.trim().toLocaleLowerCase('en-US');
}

export function isInvitationEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeInvitationEmail(email));
}

export async function createOrganizationInvitation(input: {
  organization: OrganizationIdentity;
  sequence: number;
  name: string;
  email: string;
  activationBaseUrl: string;
  now?: Date;
}): Promise<CreatedInvitation> {
  const name = input.name.trim();
  const email = normalizeInvitationEmail(input.email);
  if (name.length < 2) throw new Error('Informe o nome da pessoa.');
  if (!isInvitationEmail(email)) throw new Error('Informe um e-mail válido.');

  const { activationUrl, tokenDigest } = await createActivationSecret(input.activationBaseUrl);
  const createdAt = input.now ?? new Date();
  const expiresAt = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000);
  const userSerial = createUserSerial(input.organization, input.sequence);
  return {
    invitation: {
      id: crypto.randomUUID(),
      organizationId: input.organization.id,
      userSerial,
      name,
      email,
      status: 'pending',
      tokenDigest,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    },
    activationUrl,
  };
}

export function getInvitationDisplayStatus(invitation: OrganizationInvitation, now = new Date()): InvitationDisplayStatus {
  if (invitation.status === 'revoked') return 'revoked';
  if (invitation.status === 'activated') return 'activated';
  const expirationTime = new Date(invitation.expiresAt).getTime();
  const nowTime = now.getTime();
  if (!Number.isFinite(expirationTime) || !Number.isFinite(nowTime) || expirationTime <= nowTime) {
    return 'expired';
  }
  return invitation.status;
}

export async function activateOrganizationInvitation(
  invitation: OrganizationInvitation,
  token: string,
  now = new Date(),
): Promise<OrganizationInvitation> {
  const status = getInvitationDisplayStatus(invitation, now);
  if (status === 'activated') throw new Error('Este convite já foi utilizado.');
  if (status === 'revoked') throw new Error('Este convite foi revogado.');
  if (status === 'expired') throw new Error('Este convite expirou.');
  if (!token) throw new Error('Token de ativação inválido.');

  const suppliedDigest = await digestActivationToken(token);
  if (!constantTimeEqual(suppliedDigest, invitation.tokenDigest)) {
    throw new Error('Token de ativação inválido.');
  }
  return { ...invitation, status: 'activated', activatedAt: now.toISOString() };
}

export function markInvitationEmailPrepared(invitation: OrganizationInvitation, now = new Date()): OrganizationInvitation {
  const status = getInvitationDisplayStatus(invitation, now);
  if (status === 'activated') throw new Error('Este convite já foi utilizado.');
  if (status === 'revoked') throw new Error('O convite foi revogado.');
  if (status === 'expired') {
    throw new Error('O convite expirou. Reenvie para gerar um novo link.');
  }
  return { ...invitation, status: 'email-prepared', emailPreparedAt: now.toISOString() };
}

export function revokeInvitation(invitation: OrganizationInvitation, now = new Date()): OrganizationInvitation {
  if (invitation.status === 'revoked') return invitation;
  return { ...invitation, status: 'revoked', revokedAt: now.toISOString() };
}

export async function renewOrganizationInvitation(
  invitation: OrganizationInvitation,
  activationBaseUrl: string,
  now = new Date(),
): Promise<CreatedInvitation> {
  const { activationUrl, tokenDigest } = await createActivationSecret(activationBaseUrl);
  const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  return {
    activationUrl,
    invitation: {
      ...invitation,
      status: 'pending',
      tokenDigest,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      emailPreparedAt: undefined,
      activatedAt: undefined,
      revokedAt: undefined,
    },
  };
}

export const PILHA_ORGANIZATION = createOrganizationIdentity('Pilha', 1);

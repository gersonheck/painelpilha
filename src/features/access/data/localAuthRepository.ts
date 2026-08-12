import type { AccessSession, LocalCredential } from '../../../shared/contracts/session';
import { SafeStorage } from '../../../shared/storage/SafeStorage';
import { STORAGE_KEYS } from '../../../shared/storage/storageKeys';
import {
  constantTimeEqual,
  createPasswordSalt,
  deriveCollaboratorId,
  derivePasswordHash,
} from '../../../shared/security/localIdentity';

type CredentialRegistry = Record<string, LocalCredential>;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = SafeStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function readRegistry() {
  const raw = SafeStorage.getItem(STORAGE_KEYS.credentialRegistry);
  if (!raw) return {};
  try {
    const registry = JSON.parse(raw) as CredentialRegistry;
    if (!registry || Array.isArray(registry) || typeof registry !== 'object') throw new Error();
    return registry;
  } catch {
    throw new Error('Os dados de acesso locais estão corrompidos. Limpe os dados deste site.');
  }
}

function persistDurably(key: string, value: string) {
  if (SafeStorage.setItem(key, value) !== 'durable') {
    throw new Error('Não foi possível salvar o acesso de forma permanente neste dispositivo.');
  }
}

function createSession(collaboratorId: string) : AccessSession {
  const session: AccessSession = {
    schemaVersion: 1,
    collaboratorId,
    createdAt: new Date().toISOString(),
  };
  persistDurably(STORAGE_KEYS.accessSession, JSON.stringify(session));
  return session;
}

export const localAuthRepository = {
  getSession(): AccessSession | null {
    const session = readJson<AccessSession | null>(STORAGE_KEYS.accessSession, null);
    if (session?.schemaVersion !== 1 || !/^[a-f0-9]{64}$/.test(session.collaboratorId)) return null;
    return session;
  },

  async register(email: string, password: string) {
    const collaboratorId = await deriveCollaboratorId(email);
    const registry = readRegistry();
    if (registry[collaboratorId]) throw new Error('Já existe um acesso local para este e-mail.');

    const passwordSalt = createPasswordSalt();
    const credential: LocalCredential = {
      schemaVersion: 1,
      collaboratorId,
      passwordSalt,
      passwordHash: await derivePasswordHash(password, passwordSalt),
      createdAt: new Date().toISOString(),
    };
    persistDurably(
      STORAGE_KEYS.credentialRegistry,
      JSON.stringify({ ...registry, [collaboratorId]: credential }),
    );
    return createSession(collaboratorId);
  },

  async login(email: string, password: string) {
    const collaboratorId = await deriveCollaboratorId(email);
    const credential = readRegistry()[collaboratorId];
    if (
      !credential
      || credential.schemaVersion !== 1
      || credential.collaboratorId !== collaboratorId
      || !credential.passwordSalt
      || !credential.passwordHash
    ) throw new Error('E-mail ou senha não conferem.');
    const candidate = await derivePasswordHash(password, credential.passwordSalt);
    if (!constantTimeEqual(candidate, credential.passwordHash)) {
      throw new Error('E-mail ou senha não conferem.');
    }
    return createSession(collaboratorId);
  },

  logout() {
    SafeStorage.removeItem(STORAGE_KEYS.accessSession);
  },
};

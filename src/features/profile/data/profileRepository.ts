import { createDefaultProfile, isProfile, type Profile } from '../../../shared/contracts/profile';
import { createEnvelope, parseEnvelope } from '../../../shared/contracts/persistence';
import { SafeStorage } from '../../../shared/storage/SafeStorage';
import { collaboratorStorageKey } from '../../../shared/storage/storageKeys';

function saveProfile(profile: Profile) {
  if (!isProfile(profile)) throw new Error('Perfil inválido.');
  const key = collaboratorStorageKey('profile', profile.collaboratorId);
  if (SafeStorage.setItem(key, JSON.stringify(createEnvelope('profile', profile.collaboratorId, profile))) !== 'durable') {
    throw new Error('Não foi possível salvar o perfil de forma permanente neste dispositivo.');
  }
  return profile;
}

export const profileRepository = {
  get(collaboratorId: string): Profile {
    const key = collaboratorStorageKey('profile', collaboratorId);
    try {
      const raw = SafeStorage.getItem(key);
      if (!raw) return createDefaultProfile(collaboratorId);
      const envelope = parseEnvelope(raw, { kind: 'profile', collaboratorId, validate: isProfile });
      if (envelope && envelope.data.collaboratorId === collaboratorId) return envelope.data;

      // Migração segura do formato v1 sem envelope, já isolado pelo mesmo collaboratorId.
      const legacy: unknown = JSON.parse(raw);
      if (isProfile(legacy) && legacy.collaboratorId === collaboratorId) {
        saveProfile(legacy);
        return legacy;
      }
    } catch {
      // Invalid local data is replaced by a safe default for this collaborator.
    }
    return createDefaultProfile(collaboratorId);
  },

  save(profile: Profile) {
    return saveProfile(profile);
  },
};

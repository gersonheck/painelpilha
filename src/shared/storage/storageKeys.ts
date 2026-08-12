export const STORAGE_KEYS = {
  accessSession: 'pa_access_session',
  credentialRegistry: 'pa_local_credentials_v1',
  contextTraces: 'pa_context_traces',
  das21History: 'pa_das21_history',
  history: 'pa_history',
  profile: 'pa_profile',
  scaleHistory: 'pa_scale_history',
  sleepRecords: 'pa_sleep_records',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

const SAFE_IDENTIFIER = /^[a-f0-9]{64}$/;

export function collaboratorStorageKey(
  domain: 'profile' | 'history' | 'context_traces' | 'das21_history' | 'scale_history' | 'sleep_records',
  collaboratorId: string,
) {
  if (!SAFE_IDENTIFIER.test(collaboratorId)) {
    throw new Error('Identificador de colaborador inválido.');
  }
  return `pa_${domain}_collaborator_${collaboratorId}`;
}

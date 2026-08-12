import { isIsoDate, isRecord } from './persistence';

export interface Measurement {
  id: string;
  collaboratorId: string;
  timestamp: string;
  pilhaScore: number | null;
  mood: number | null;
  biometryData?: Record<string, unknown>;
}

export function isMeasurement(value: unknown): value is Measurement {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string' && value.id.length > 0
    && typeof value.collaboratorId === 'string' && /^[a-f0-9]{64}$/.test(value.collaboratorId)
    && isIsoDate(value.timestamp)
    && (value.pilhaScore === null || (
      typeof value.pilhaScore === 'number'
      && Number.isFinite(value.pilhaScore)
      && value.pilhaScore >= 0
      && value.pilhaScore <= 100
    ))
    && (value.mood === null || (
      typeof value.mood === 'number'
      && Number.isSafeInteger(value.mood)
      && value.mood >= 1
      && value.mood <= 5
    ))
    && (value.biometryData === undefined || isRecord(value.biometryData));
}

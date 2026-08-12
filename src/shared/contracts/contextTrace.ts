import { isIsoDate, isIsoDay, isRecord } from './persistence';

export interface ContextTrace {
  id: string;
  collaboratorId: string;
  questionId: string;
  dayKey: string;
  timestamp: string;
  answer: string | number | boolean;
}

export function isContextTrace(value: unknown): value is ContextTrace {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string' && value.id.length > 0
    && typeof value.collaboratorId === 'string' && /^[a-f0-9]{64}$/.test(value.collaboratorId)
    && typeof value.questionId === 'string' && value.questionId.length > 0
    && isIsoDay(value.dayKey)
    && isIsoDate(value.timestamp)
    && (
      typeof value.answer === 'string'
      || typeof value.answer === 'boolean'
      || (typeof value.answer === 'number' && Number.isFinite(value.answer))
    );
}

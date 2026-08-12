import { isIsoDate, isIsoDay, isRecord } from './persistence';

export const SLEEP_RECORD_SOURCES = ['manual', 'passive-smartphone', 'wearable', 'hybrid'] as const;

export type SleepRecordSource = (typeof SLEEP_RECORD_SOURCES)[number];

export interface SleepRecord {
  id: string;
  collaboratorId: string;
  dayKey: string;
  timestamp: string;
  sleepHours: number;
  source: SleepRecordSource;
  confidence: number;
  bedTime?: string;
  wakeTime?: string;
  perceivedQuality?: 1 | 2 | 3 | 4 | 5;
  notes?: Record<string, unknown>;
}

const SAFE_IDENTIFIER = /^[a-f0-9]{64}$/;
const CLOCK_TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function isClockTime(value: unknown): value is string {
  return typeof value === 'string' && CLOCK_TIME.test(value);
}

function isSleepRecordSource(value: unknown): value is SleepRecordSource {
  return typeof value === 'string' && SLEEP_RECORD_SOURCES.includes(value as SleepRecordSource);
}

function isPerceivedQuality(value: unknown): value is SleepRecord['perceivedQuality'] {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5;
}

function isSleepDuration(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0.5 && value <= 16;
}

function isConfidence(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function isSleepRecord(value: unknown): value is SleepRecord {
  if (!isRecord(value)) return false;

  const hasBedTime = value.bedTime !== undefined;
  const hasWakeTime = value.wakeTime !== undefined;
  const hasPairedTimes = (!hasBedTime && !hasWakeTime)
    || (isClockTime(value.bedTime) && isClockTime(value.wakeTime));

  return (
    typeof value.id === 'string'
    && value.id.length > 0
    && typeof value.collaboratorId === 'string'
    && SAFE_IDENTIFIER.test(value.collaboratorId)
    && isIsoDay(value.dayKey)
    && isIsoDate(value.timestamp)
    && isSleepDuration(value.sleepHours)
    && isSleepRecordSource(value.source)
    && isConfidence(value.confidence)
    && hasPairedTimes
    && (value.perceivedQuality === undefined || isPerceivedQuality(value.perceivedQuality))
    && (value.notes === undefined || isRecord(value.notes))
  );
}

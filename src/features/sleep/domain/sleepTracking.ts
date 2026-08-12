import type { SleepRecord } from '../../../shared/contracts/sleep';
import { isClockTime } from '../../../shared/contracts/sleep';

export type SleepSuggestionSource = 'history' | 'duration' | 'default';
export type SleepDurationZone = 'insufficient' | 'below-target' | 'target' | 'long';
export type SleepPatternStatus = 'insufficient-data' | 'stable' | 'sleep-debt' | 'irregular';
export type WakeDecision = 'sleep' | 'micro-arousal' | 'probable-wake' | 'confirmed-wake';

export interface SleepTimeSuggestion {
  bedTime: string;
  wakeTime: string;
  sleepHours: number;
  source: SleepSuggestionSource;
}

export interface SleepHistoryEntry {
  timestamp?: string;
  sleepHours?: number;
  bedTime?: string;
  wakeTime?: string;
}

export interface SleepDurationClassification {
  zone: SleepDurationZone;
  label: string;
  color: 'red' | 'yellow' | 'green' | 'blue';
  isPlausible: boolean;
}

export interface SleepDebtSummary {
  days: number;
  averageHours: number;
  targetHours: number;
  observedHours: number;
  debtHours: number;
}

export interface SleepPatternSummary extends SleepDebtSummary {
  status: SleepPatternStatus;
  shortSleepCount: number;
  longSleepCount: number;
  lowConfidenceCount: number;
  irregularityMinutes: number | null;
  recommendation: string;
}

export interface WakeDecisionInput {
  wakeProbability: number;
  activePhoneUse?: boolean;
  concordantSignals: number;
  consecutiveWakeSeconds: number;
  likelySleepWindow?: boolean;
}

export interface WakeDecisionResult {
  decision: WakeDecision;
  confidence: number;
  reason: string;
}

const DEFAULT_SLEEP_SUGGESTION: SleepTimeSuggestion = {
  bedTime: '23:00',
  wakeTime: '06:30',
  sleepHours: 7.5,
  source: 'default',
};

const WAKE_THRESHOLD = 0.7;
const ISOLATED_WAKE_THRESHOLD = 0.55;
const MIN_CONFIRMED_WAKE_SECONDS = 60;
const MIN_PROBABLE_WAKE_SECONDS = 30;

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sortRecentFirst<T extends { timestamp?: string }>(records: T[]): T[] {
  return [...records].sort((left, right) => {
    const leftTime = left.timestamp ? Date.parse(left.timestamp) : Number.NaN;
    const rightTime = right.timestamp ? Date.parse(right.timestamp) : Number.NaN;
    if (!Number.isFinite(leftTime) && !Number.isFinite(rightTime)) return 0;
    if (!Number.isFinite(leftTime)) return 1;
    if (!Number.isFinite(rightTime)) return -1;
    return rightTime - leftTime;
  });
}

function latestDistinctNights<T extends { dayKey?: string; timestamp?: string }>(records: T[]): T[] {
  const byDay = new Map<string, T>();
  sortRecentFirst(records).forEach((record) => {
    if (!record.dayKey || byDay.has(record.dayKey)) return;
    byDay.set(record.dayKey, record);
  });
  return [...byDay.values()].sort((left, right) => right.dayKey!.localeCompare(left.dayKey!));
}

export function selectRecentSleepNights(records: SleepRecord[], days = 7): SleepRecord[] {
  return latestDistinctNights(records).slice(0, days);
}

function averageCircularClockTime(times: string[]): string {
  const minutes = times.map(timeToMinutes);
  const reference = minutes[0];
  const unwrapped = minutes.map((value) => (
    value - reference > 12 * 60 ? value - 1440
      : reference - value > 12 * 60 ? value + 1440
        : value
  ));
  return minutesToClockTime(average(unwrapped));
}

export function timeToMinutes(time: string): number {
  if (!isClockTime(time)) throw new Error('Horário de sono inválido.');
  const [hours, minutes] = time.split(':').map(Number);
  return (hours * 60) + minutes;
}

export function minutesToClockTime(minutes: number): string {
  if (!Number.isFinite(minutes)) throw new Error('Minutos de sono inválidos.');
  const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60).toString().padStart(2, '0');
  const mins = (normalized % 60).toString().padStart(2, '0');
  return `${hours}:${mins}`;
}

export function calculateSleepDurationHours(bedTime: string, wakeTime: string): number {
  const start = timeToMinutes(bedTime);
  let end = timeToMinutes(wakeTime);
  if (end <= start) end += 1440;
  return roundToTenth(Math.min(16, Math.max(0.5, (end - start) / 60)));
}

export function getSuggestedSleepTimes(history: SleepHistoryEntry[]): SleepTimeSuggestion {
  const recent = sortRecentFirst(history);
  const withTimes = recent
    .filter((entry) => isClockTime(entry.bedTime) && isClockTime(entry.wakeTime))
    .slice(0, 14);

  if (withTimes.length >= 2) {
    const bedMinutes = withTimes.map((entry) => {
      const minutes = timeToMinutes(entry.bedTime!);
      return minutes < 12 * 60 ? minutes + 1440 : minutes;
    });
    const bedTime = minutesToClockTime(average(bedMinutes));
    const wakeTime = averageCircularClockTime(withTimes.map((entry) => entry.wakeTime!));

    return {
      bedTime,
      wakeTime,
      sleepHours: calculateSleepDurationHours(bedTime, wakeTime),
      source: 'history',
    };
  }

  const withDuration = recent
    .filter((entry) => typeof entry.sleepHours === 'number' && Number.isFinite(entry.sleepHours))
    .slice(0, 7);

  if (withDuration.length >= 2) {
    const sleepHours = roundToTenth(average(withDuration.map((entry) => entry.sleepHours!)));
    const wakeTime = '06:30';
    const bedTime = minutesToClockTime(timeToMinutes(wakeTime) - (sleepHours * 60));
    return { bedTime, wakeTime, sleepHours, source: 'duration' };
  }

  return DEFAULT_SLEEP_SUGGESTION;
}

export function isSleepDurationPlausible(hours: number): boolean {
  return Number.isFinite(hours) && hours >= 3 && hours <= 12;
}

export function classifySleepDuration(hours: number): SleepDurationClassification {
  const isPlausible = isSleepDurationPlausible(hours);
  if (hours < 5) {
    return { zone: 'insufficient', label: 'Sono insuficiente', color: 'red', isPlausible };
  }
  if (hours < 7) {
    return { zone: 'below-target', label: 'Abaixo do alvo', color: 'yellow', isPlausible };
  }
  if (hours <= 9) {
    return { zone: 'target', label: 'Faixa recomendada', color: 'green', isPlausible };
  }
  return { zone: 'long', label: 'Sono prolongado', color: 'blue', isPlausible };
}

export function estimateSleepDebt(
  records: SleepHistoryEntry[],
  targetSleepHours = 7.5,
  days = 7,
): SleepDebtSummary {
  const recent = sortRecentFirst(records)
    .filter((entry) => typeof entry.sleepHours === 'number' && Number.isFinite(entry.sleepHours))
    .slice(0, days);
  const observedHours = roundToTenth(recent.reduce((sum, entry) => sum + entry.sleepHours!, 0));
  const targetHours = roundToTenth(targetSleepHours * recent.length);
  return {
    days: recent.length,
    averageHours: recent.length ? roundToTenth(observedHours / recent.length) : 0,
    targetHours,
    observedHours,
    debtHours: roundToTenth(Math.max(0, targetHours - observedHours)),
  };
}

function calculateClockIrregularity(records: SleepHistoryEntry[]): number | null {
  const bedTimes = records
    .filter((entry) => isClockTime(entry.bedTime))
    .map((entry) => {
      const minutes = timeToMinutes(entry.bedTime!);
      return minutes < 12 * 60 ? minutes + 1440 : minutes;
    });
  if (bedTimes.length < 2) return null;

  const mean = average(bedTimes);
  const variance = average(bedTimes.map((minutes) => (minutes - mean) ** 2));
  return Math.round(Math.sqrt(variance));
}

export function summarizeSleepPatterns(
  records: SleepRecord[],
  options: { targetSleepHours?: number; days?: number } = {},
): SleepPatternSummary {
  const targetSleepHours = options.targetSleepHours ?? 7.5;
  const days = options.days ?? 7;
  const recent = latestDistinctNights(records).slice(0, days);
  const debt = estimateSleepDebt(recent, targetSleepHours, days);
  const shortSleepCount = recent.filter((record) => record.sleepHours < 6.5).length;
  const longSleepCount = recent.filter((record) => record.sleepHours > 9).length;
  const lowConfidenceCount = recent.filter((record) => record.confidence < 0.6).length;
  const irregularityMinutes = calculateClockIrregularity(recent);

  let status: SleepPatternStatus = 'stable';
  let recommendation = 'Manter o padrão atual e observar tendência semanal.';

  if (recent.length < 3) {
    status = 'insufficient-data';
    recommendation = 'Coletar pelo menos três noites para estimar um padrão inicial.';
  } else if (debt.debtHours >= 2 || debt.averageHours < targetSleepHours - 0.5) {
    status = 'sleep-debt';
    recommendation = 'Priorizar uma janela de sono maior nos próximos dias.';
  } else if (irregularityMinutes !== null && irregularityMinutes > 75) {
    status = 'irregular';
    recommendation = 'Buscar horários de dormir mais consistentes para reduzir variabilidade.';
  }

  return {
    ...debt,
    status,
    shortSleepCount,
    longSleepCount,
    lowConfidenceCount,
    irregularityMinutes,
    recommendation,
  };
}

export function evaluatePassiveWakeDecision(input: WakeDecisionInput): WakeDecisionResult {
  if (!Number.isFinite(input.wakeProbability)) {
    return {
      decision: 'sleep',
      confidence: 0,
      reason: 'Observação inválida; não classificar vigília sem sinais utilizáveis.',
    };
  }

  const wakeProbability = Math.max(0, Math.min(1, input.wakeProbability));
  const signals = Number.isFinite(input.concordantSignals)
    ? Math.max(0, Math.floor(input.concordantSignals))
    : 0;
  const duration = Number.isFinite(input.consecutiveWakeSeconds)
    ? Math.max(0, input.consecutiveWakeSeconds)
    : 0;
  const hasConfirmedPersistence = duration >= MIN_CONFIRMED_WAKE_SECONDS;
  const hasProbablePersistence = duration >= MIN_PROBABLE_WAKE_SECONDS;
  const likelySleepWindow = input.likelySleepWindow === true;

  if (input.activePhoneUse === true && wakeProbability >= ISOLATED_WAKE_THRESHOLD && hasProbablePersistence) {
    return {
      decision: hasConfirmedPersistence ? 'confirmed-wake' : 'probable-wake',
      confidence: wakeProbability,
      reason: 'Uso ativo do aparelho durante a janela analisada.',
    };
  }

  if (likelySleepWindow && signals < 2) {
    return {
      decision: 'micro-arousal',
      confidence: Math.min(wakeProbability, 0.54),
      reason: 'Sinal isolado durante janela provável de sono; tratar como microdespertar.',
    };
  }

  if (wakeProbability >= WAKE_THRESHOLD && signals >= 3 && hasConfirmedPersistence) {
    return {
      decision: 'confirmed-wake',
      confidence: wakeProbability,
      reason: 'Probabilidade alta, múltiplos sinais concordantes e persistência mínima.',
    };
  }

  if (wakeProbability >= WAKE_THRESHOLD && signals >= 2) {
    return {
      decision: hasConfirmedPersistence ? 'confirmed-wake' : 'probable-wake',
      confidence: wakeProbability,
      reason: 'Probabilidade alta com sinais concordantes.',
    };
  }

  if (wakeProbability >= ISOLATED_WAKE_THRESHOLD && signals >= 2 && !likelySleepWindow) {
    return {
      decision: 'probable-wake',
      confidence: wakeProbability,
      reason: 'Evidência moderada fora de uma janela provável de sono.',
    };
  }

  return {
    decision: 'sleep',
    confidence: 1 - wakeProbability,
    reason: 'Evidência insuficiente para classificar vigília.',
  };
}

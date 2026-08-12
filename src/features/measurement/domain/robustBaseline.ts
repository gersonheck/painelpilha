import { isIsoDate } from '../../../shared/contracts/persistence';
import type { MeasurementPosture } from './ppgPolicy';

export type CaptureMode = 'finger-ppg' | 'facial-rppg';
export type CollectionTimeBand = 'morning' | 'afternoon' | 'evening' | 'night';

export interface BaselineSample {
  timestamp: string;
  posture: MeasurementPosture;
  captureMode: CaptureMode;
  timeBand: CollectionTimeBand;
  rmssd: number;
  accepted: boolean;
}

export interface BaselineProtocol {
  posture: MeasurementPosture;
  captureMode: CaptureMode;
  timeBand: CollectionTimeBand;
}

export interface RobustBaseline extends BaselineProtocol {
  sampleSize: number;
  medianLogRmssd: number;
  scaledMad: number;
  dispersion: number;
  windowStartedAt: string;
  windowEndedAt: string;
}

export interface DeviationResult {
  robustZ: number;
  classification: 'expected' | 'attention' | 'outside';
  lowerLimit: number;
  upperLimit: number;
}

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

const median = (values: number[]) => {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
};

export function calculateRobustBaseline(
  samples: BaselineSample[],
  protocol: BaselineProtocol,
  options: {
    maxSamples?: number;
    minimumSamples?: number;
    minimumDistinctDays?: number;
    sigmaFloor?: number;
    maximumAgeDays?: number;
    now?: Date;
  } = {},
): RobustBaseline | null {
  const maxSamples = options.maxSamples ?? 14;
  const minimumSamples = options.minimumSamples ?? 5;
  const minimumDistinctDays = options.minimumDistinctDays ?? 3;
  const sigmaFloor = options.sigmaFloor ?? 0.05;
  const maximumAgeDays = options.maximumAgeDays ?? 28;
  const now = options.now ?? new Date();
  const nowTime = now.getTime();
  if (
    !Number.isSafeInteger(minimumSamples)
    || !Number.isSafeInteger(maxSamples)
    || !Number.isSafeInteger(minimumDistinctDays)
    || !Number.isSafeInteger(maximumAgeDays)
    || minimumDistinctDays < 1
    || minimumSamples < minimumDistinctDays
    || maxSamples < minimumSamples
    || !Number.isFinite(sigmaFloor)
    || sigmaFloor <= 0
    || maximumAgeDays <= 0
    || !Number.isFinite(nowTime)
  ) {
    throw new Error('Configuração de baseline inválida.');
  }
  const cutoffTime = nowTime - maximumAgeDays * DAY_IN_MILLISECONDS;

  const eligible = samples
    .filter((sample) => {
      const timestamp = Date.parse(sample.timestamp);
      return sample.accepted === true
        && sample.posture === protocol.posture
        && sample.captureMode === protocol.captureMode
        && sample.timeBand === protocol.timeBand
        && Number.isFinite(sample.rmssd)
        && sample.rmssd > 0
        && isIsoDate(sample.timestamp)
        && timestamp >= cutoffTime
        && timestamp <= nowTime;
    })
    .sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp))
    .slice(-maxSamples);
  if (eligible.length < minimumSamples) return null;
  if (new Set(eligible.map((sample) => sample.timestamp.slice(0, 10))).size < minimumDistinctDays) {
    return null;
  }

  const logs = eligible.map((sample) => Math.log(sample.rmssd));
  const medianLogRmssd = median(logs);
  const mad = median(logs.map((value) => Math.abs(value - medianLogRmssd)));
  const scaledMad = 1.4826 * mad;
  return {
    ...protocol,
    sampleSize: eligible.length,
    medianLogRmssd,
    scaledMad,
    dispersion: Math.max(scaledMad, sigmaFloor),
    windowStartedAt: eligible[0].timestamp,
    windowEndedAt: eligible.at(-1)!.timestamp,
  };
}

export function classifyIndividualDeviation(
  rmssd: number,
  baseline: RobustBaseline,
  toleranceFactor = 2,
): DeviationResult {
  if (
    !Number.isFinite(rmssd)
    || rmssd <= 0
    || !Number.isFinite(toleranceFactor)
    || toleranceFactor <= 0
    || !Number.isFinite(baseline.medianLogRmssd)
    || !Number.isFinite(baseline.dispersion)
    || baseline.dispersion <= 0
  ) {
    throw new Error('Medição ou tolerância inválida.');
  }
  const logRmssd = Math.log(rmssd);
  const robustZ = (logRmssd - baseline.medianLogRmssd) / baseline.dispersion;
  const absoluteZ = Math.abs(robustZ);
  return {
    robustZ,
    classification: absoluteZ <= 1 ? 'expected' : absoluteZ <= 2 ? 'attention' : 'outside',
    lowerLimit: Math.exp(baseline.medianLogRmssd - toleranceFactor * baseline.dispersion),
    upperLimit: Math.exp(baseline.medianLogRmssd + toleranceFactor * baseline.dispersion),
  };
}

export type MeasurementPosture = 'lying' | 'seated' | 'standing';

export interface SignalQualityInput {
  analyzableSeconds: number;
  monotonicTimestamps: boolean;
  postureMaintained: boolean;
  validIntervals: number;
  signalSaturated: boolean;
  artifactRatio: number;
  traceQuality: number;
  motionAbsence: number;
  segmentStability: number;
  protocolAdherence: number;
}

export interface SignalQualityDecision {
  status: 'accepted' | 'repeat-required';
  sampleConfidenceScore: number;
  reasons: string[];
}

export const PPG_POLICY = {
  analyzableSeconds: 60,
  minimumValidIntervals: 30,
  maximumArtifactRatio: 0.1,
  acceptedConfidence: 0.8,
  weights: {
    traceQuality: 0.35,
    motionAbsence: 0.3,
    segmentStability: 0.2,
    protocolAdherence: 0.15,
  },
} as const;

const clamp01 = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
const isUnitInterval = (value: number) => Number.isFinite(value) && value >= 0 && value <= 1;

export function evaluateSignalQuality(input: SignalQualityInput): SignalQualityDecision {
  const reasons: string[] = [];
  if (!Number.isFinite(input.analyzableSeconds) || input.analyzableSeconds < PPG_POLICY.analyzableSeconds) {
    reasons.push('Duração analisável insuficiente.');
  }
  if (input.monotonicTimestamps !== true) reasons.push('A captura apresentou timestamps instáveis.');
  if (input.postureMaintained !== true) reasons.push('A postura mudou durante a coleta.');
  if (!Number.isSafeInteger(input.validIntervals) || input.validIntervals < PPG_POLICY.minimumValidIntervals) {
    reasons.push('Poucos intervalos válidos.');
  }
  if (typeof input.signalSaturated !== 'boolean') {
    reasons.push('Indicador de saturação inválido.');
  } else if (input.signalSaturated) {
    reasons.push('O sinal permaneceu saturado.');
  }
  if (!isUnitInterval(input.artifactRatio) || input.artifactRatio > PPG_POLICY.maximumArtifactRatio) {
    reasons.push('Excesso de artefatos ou movimento.');
  }

  const confidenceComponents = [
    input.traceQuality,
    input.motionAbsence,
    input.segmentStability,
    input.protocolAdherence,
  ];
  if (confidenceComponents.some((value) => !isUnitInterval(value))) {
    reasons.push('Componentes de confiança fora do intervalo válido.');
  }

  const { weights } = PPG_POLICY;
  const sampleConfidenceScore = clamp01(
    clamp01(input.traceQuality) * weights.traceQuality
    + clamp01(input.motionAbsence) * weights.motionAbsence
    + clamp01(input.segmentStability) * weights.segmentStability
    + clamp01(input.protocolAdherence) * weights.protocolAdherence,
  );
  if (sampleConfidenceScore < PPG_POLICY.acceptedConfidence) {
    reasons.push('Confiança da amostra abaixo do mínimo provisório.');
  }

  return {
    status: reasons.length ? 'repeat-required' : 'accepted',
    sampleConfidenceScore,
    reasons,
  };
}

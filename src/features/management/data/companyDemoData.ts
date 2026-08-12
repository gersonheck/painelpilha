import type { TeamIndicatorInput } from '../domain/companyIndicators';

export const companyDemoData: TeamIndicatorInput[] = [
  { id: 'operations', name: 'Operações', eligiblePeople: 48, participants: 38, averageScore: 74, acceptedSamples: 132, totalSamples: 145, weeklyTrend: 4 },
  { id: 'product', name: 'Produto', eligiblePeople: 32, participants: 27, averageScore: 81, acceptedSamples: 96, totalSamples: 102, weeklyTrend: 7 },
  { id: 'support', name: 'Atendimento', eligiblePeople: 56, participants: 41, averageScore: 62, acceptedSamples: 118, totalSamples: 139, weeklyTrend: -5 },
  { id: 'sales', name: 'Comercial', eligiblePeople: 40, participants: 29, averageScore: 69, acceptedSamples: 101, totalSamples: 112, weeklyTrend: 1 },
  { id: 'leadership', name: 'Liderança executiva', eligiblePeople: 4, participants: 4, averageScore: 88, acceptedSamples: 14, totalSamples: 15, weeklyTrend: 3 },
];

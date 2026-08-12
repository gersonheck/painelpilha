import { describe, expect, it } from 'vitest';
import {
  calculateCompanyIndicators,
  MINIMUM_VISIBLE_GROUP_SIZE,
  type TeamIndicatorInput,
} from '../../src/features/management/domain/companyIndicators';

const team = (overrides: Partial<TeamIndicatorInput> = {}): TeamIndicatorInput => ({
  id: 'team-a',
  name: 'Equipe A',
  eligiblePeople: 10,
  participants: 8,
  averageScore: 75,
  acceptedSamples: 16,
  totalSamples: 20,
  weeklyTrend: 2,
  ...overrides,
});

describe('calculateCompanyIndicators', () => {
  it('calculates simple weighted indicators', () => {
    const result = calculateCompanyIndicators([
      team(),
      team({ id: 'team-b', name: 'Equipe B', participants: 6, averageScore: 55, acceptedSamples: 9, totalSamples: 10 }),
    ]);
    expect(result.participationRate).toBe(70);
    expect(result.averageScore).toBe(66);
    expect(result.acceptedSampleRate).toBe(83);
    expect(result.attentionTeams).toBe(1);
  });

  it('protects groups below the minimum participant threshold', () => {
    const result = calculateCompanyIndicators([
      team(),
      team({ id: 'small', name: 'Grupo pequeno', eligiblePeople: 4, participants: MINIMUM_VISIBLE_GROUP_SIZE - 1 }),
    ]);
    expect(result.visibleTeams.map(({ id }) => id)).toEqual(['team-a']);
    expect(result.protectedTeams).toBe(1);
    expect(result.eligiblePeople).toBe(10);
    expect(result.participants).toBe(8);
    expect(result.averageScore).toBe(75);
  });

  it('rejects impossible or empty inputs', () => {
    expect(() => calculateCompanyIndicators([])).toThrow('Indicadores empresariais inválidos');
    expect(() => calculateCompanyIndicators([team({ participants: 11 })])).toThrow();
    expect(() => calculateCompanyIndicators([team({ averageScore: 101 })])).toThrow();
    expect(() => calculateCompanyIndicators([team({ acceptedSamples: 21 })])).toThrow();
  });
});

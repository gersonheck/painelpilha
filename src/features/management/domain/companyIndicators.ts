export const MINIMUM_VISIBLE_GROUP_SIZE = 5;

export interface TeamIndicatorInput {
  id: string;
  name: string;
  eligiblePeople: number;
  participants: number;
  averageScore: number;
  acceptedSamples: number;
  totalSamples: number;
  weeklyTrend: number;
}

export interface CompanyIndicators {
  eligiblePeople: number;
  participants: number;
  participationRate: number;
  averageScore: number;
  acceptedSampleRate: number;
  visibleTeams: TeamIndicatorInput[];
  protectedTeams: number;
  attentionTeams: number;
}

const percentage = (part: number, total: number) => total > 0 ? Math.round((part / total) * 100) : 0;

function isValidTeam(team: TeamIndicatorInput) {
  return team.id.length > 0
    && team.name.length > 0
    && Number.isSafeInteger(team.eligiblePeople) && team.eligiblePeople >= 0
    && Number.isSafeInteger(team.participants) && team.participants >= 0
    && team.participants <= team.eligiblePeople
    && Number.isFinite(team.averageScore) && team.averageScore >= 0 && team.averageScore <= 100
    && Number.isSafeInteger(team.acceptedSamples) && team.acceptedSamples >= 0
    && Number.isSafeInteger(team.totalSamples) && team.totalSamples >= 0
    && team.acceptedSamples <= team.totalSamples
    && Number.isFinite(team.weeklyTrend);
}

export function calculateCompanyIndicators(teams: TeamIndicatorInput[]): CompanyIndicators {
  if (!teams.length || teams.some((team) => !isValidTeam(team))) {
    throw new Error('Indicadores empresariais inválidos.');
  }

  const visibleTeams = teams.filter((team) => team.participants >= MINIMUM_VISIBLE_GROUP_SIZE);
  const protectedTeams = teams.length - visibleTeams.length;
  const eligiblePeople = visibleTeams.reduce((total, team) => total + team.eligiblePeople, 0);
  const participants = visibleTeams.reduce((total, team) => total + team.participants, 0);
  const visibleParticipants = participants;
  const weightedScore = visibleTeams.reduce(
    (total, team) => total + team.averageScore * team.participants,
    0,
  );
  const acceptedSamples = visibleTeams.reduce((total, team) => total + team.acceptedSamples, 0);
  const totalSamples = visibleTeams.reduce((total, team) => total + team.totalSamples, 0);

  return {
    eligiblePeople,
    participants,
    participationRate: percentage(participants, eligiblePeople),
    averageScore: visibleParticipants ? Math.round(weightedScore / visibleParticipants) : 0,
    acceptedSampleRate: percentage(acceptedSamples, totalSamples),
    visibleTeams,
    protectedTeams,
    attentionTeams: visibleTeams.filter((team) => team.averageScore < 65).length,
  };
}

import { isRecord } from './persistence';

export interface Profile {
  schemaVersion: 1;
  collaboratorId: string;
  name: string;
  role: string;
  bio: string;
  targetSleep: number;
  targetMeasures: number;
  notifications: boolean;
  occupationCount: number;
  leaveStatus: 'none' | 'active' | 'returned';
  newJobStatus: 'no' | 'yes';
  routineStart: string;
  configured: boolean;
}

export const createDefaultProfile = (collaboratorId: string): Profile => ({
  schemaVersion: 1,
  collaboratorId,
  name: '',
  role: '',
  bio: '',
  targetSleep: 7.5,
  targetMeasures: 5,
  notifications: true,
  occupationCount: 1,
  leaveStatus: 'none',
  newJobStatus: 'no',
  routineStart: '',
  configured: false,
});

export function isProfile(value: unknown): value is Profile {
  if (!isRecord(value)) return false;
  return value.schemaVersion === 1
    && typeof value.collaboratorId === 'string' && /^[a-f0-9]{64}$/.test(value.collaboratorId)
    && typeof value.name === 'string'
    && typeof value.role === 'string'
    && typeof value.bio === 'string'
    && typeof value.targetSleep === 'number' && Number.isFinite(value.targetSleep)
    && value.targetSleep >= 6 && value.targetSleep <= 9
    && typeof value.targetMeasures === 'number' && Number.isSafeInteger(value.targetMeasures)
    && typeof value.notifications === 'boolean'
    && typeof value.occupationCount === 'number' && Number.isSafeInteger(value.occupationCount)
    && typeof value.leaveStatus === 'string'
    && ['none', 'active', 'returned'].includes(value.leaveStatus)
    && typeof value.newJobStatus === 'string'
    && ['no', 'yes'].includes(value.newJobStatus)
    && typeof value.routineStart === 'string'
    && typeof value.configured === 'boolean';
}

import { SafeStorage } from '../../../shared/storage/SafeStorage';

export type NotificationPermissionState = NotificationPermission | 'unsupported';
export type ReminderScheduleMode = 'interval' | 'fixed';

export interface NotificationPreferences {
  enabled: boolean;
  scheduleMode: ReminderScheduleMode;
  intervalHours: 3 | 6 | 8 | 12;
  preferredTimes: string[];
  quietStart: string;
  quietEnd: string;
  timezone: string;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: false,
  scheduleMode: 'interval',
  intervalHours: 6,
  preferredTimes: ['09:00', '15:00', '21:00'],
  quietStart: '22:00',
  quietEnd: '07:00',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
};

function storageKey(collaboratorId: string) {
  if (!/^[a-f0-9]{64}$/.test(collaboratorId)) throw new Error('Identificador de colaborador inválido.');
  return `pa_notification_preferences_collaborator_${collaboratorId}`;
}

function isClockTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function getNotificationPermissionState(): NotificationPermissionState {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.requestPermission();
}

export function loadNotificationPreferences(collaboratorId: string): NotificationPreferences {
  const raw = SafeStorage.getItem(storageKey(collaboratorId));
  if (!raw) return { ...DEFAULT_PREFERENCES, preferredTimes: [...DEFAULT_PREFERENCES.preferredTimes] };
  try {
    const value = JSON.parse(raw) as Partial<NotificationPreferences>;
    if (
      typeof value.enabled !== 'boolean'
      || (value.scheduleMode !== 'interval' && value.scheduleMode !== 'fixed')
      || ![3, 6, 8, 12].includes(value.intervalHours as number)
      || !Array.isArray(value.preferredTimes)
      || !value.preferredTimes.every(isClockTime)
      || !isClockTime(value.quietStart)
      || !isClockTime(value.quietEnd)
      || typeof value.timezone !== 'string'
    ) throw new Error();
    return {
      enabled: value.enabled,
      scheduleMode: value.scheduleMode,
      intervalHours: value.intervalHours as NotificationPreferences['intervalHours'],
      preferredTimes: [...value.preferredTimes],
      quietStart: value.quietStart,
      quietEnd: value.quietEnd,
      timezone: value.timezone,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES, preferredTimes: [...DEFAULT_PREFERENCES.preferredTimes] };
  }
}

export function saveNotificationPreferences(collaboratorId: string, preferences: NotificationPreferences): void {
  if (
    ![3, 6, 8, 12].includes(preferences.intervalHours)
    || !preferences.preferredTimes.every(isClockTime)
    || !isClockTime(preferences.quietStart)
    || !isClockTime(preferences.quietEnd)
  ) throw new Error('Preferências de lembrete inválidas.');
  if (SafeStorage.setItem(storageKey(collaboratorId), JSON.stringify(preferences)) !== 'durable') {
    throw new Error('Não foi possível salvar as preferências de forma permanente neste dispositivo.');
  }
}

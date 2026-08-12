import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
} from '../../src/features/notifications/domain/notificationPreferences';

const collaboratorId = 'a'.repeat(64);

describe('notification preferences', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('persists preferences scoped to the collaborator', () => {
    saveNotificationPreferences(collaboratorId, {
      enabled: true,
      scheduleMode: 'fixed',
      intervalHours: 6,
      preferredTimes: ['08:00', '18:00'],
      quietStart: '22:00',
      quietEnd: '07:00',
      timezone: 'America/Sao_Paulo',
    });

    expect(loadNotificationPreferences(collaboratorId)).toMatchObject({
      enabled: true,
      scheduleMode: 'fixed',
      preferredTimes: ['08:00', '18:00'],
      timezone: 'America/Sao_Paulo',
    });
    expect(loadNotificationPreferences('b'.repeat(64)).enabled).toBe(false);
  });

  it('returns safe defaults for malformed local data', () => {
    window.localStorage.setItem(
      `pa_notification_preferences_collaborator_${collaboratorId}`,
      JSON.stringify({ enabled: true, intervalHours: 4 }),
    );

    expect(loadNotificationPreferences(collaboratorId)).toMatchObject({
      enabled: false,
      intervalHours: 6,
      quietStart: '22:00',
    });
  });
});

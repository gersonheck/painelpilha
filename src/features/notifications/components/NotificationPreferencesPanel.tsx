import { FormEvent, useState } from 'react';
import {
  getNotificationPermissionState,
  loadNotificationPreferences,
  requestNotificationPermission,
  saveNotificationPreferences,
  type NotificationPermissionState,
} from '../domain/notificationPreferences';

interface NotificationPreferencesPanelProps {
  collaboratorId: string;
}

const permissionLabel: Record<NotificationPermissionState, string> = {
  default: 'Ainda não autorizado',
  granted: 'Lembretes permitidos',
  denied: 'Lembretes bloqueados no navegador',
  unsupported: 'Não disponível neste navegador',
};

export function NotificationPreferencesPanel({ collaboratorId }: NotificationPreferencesPanelProps) {
  const [preferences, setPreferences] = useState(() => loadNotificationPreferences(collaboratorId));
  const [permission, setPermission] = useState<NotificationPermissionState>(() => getNotificationPermissionState());
  const [message, setMessage] = useState('');

  async function enableNotifications() {
    const nextPermission = await requestNotificationPermission();
    setPermission(nextPermission);
    if (nextPermission === 'granted') {
      const next = { ...preferences, enabled: true };
      try {
        saveNotificationPreferences(collaboratorId, next);
        setPreferences(next);
        setMessage('Permissão concedida. Suas preferências foram salvas neste dispositivo.');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Não foi possível salvar suas preferências.');
      }
      return;
    }
    setMessage(nextPermission === 'denied'
      ? 'Você pode liberar os lembretes nas configurações do navegador quando quiser.'
      : 'Este navegador não pode receber notificações.');
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      saveNotificationPreferences(collaboratorId, preferences);
      setMessage('Preferências de lembrete salvas neste dispositivo.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar suas preferências.');
    }
  }

  return (
    <section className="notification-panel profile-card" aria-labelledby="notification-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">LEMBRETES</p>
          <h2 id="notification-title">Seu ritmo de check-in</h2>
        </div>
        <span className="phase">{permissionLabel[permission]}</span>
      </div>
      <p className="hero__copy">
        Você decide se quer receber lembretes e em quais horários. Nunca pedimos permissão automaticamente.
      </p>

      {permission === 'default' && (
        <button className="button button--primary" onClick={() => void enableNotifications()} type="button">
          Ativar lembretes
        </button>
      )}
      {permission === 'denied' && <p className="form-error" role="status">Os lembretes estão bloqueados. Altere a permissão nas configurações do navegador para ativá-los.</p>}
      {permission === 'unsupported' && <p className="form-error" role="status">Use um navegador compatível ou instale o PilhA+ na tela inicial do celular.</p>}

      <form className="notification-form" onSubmit={save}>
        <fieldset disabled={permission === 'unsupported'}>
          <legend>Frequência preferida</legend>
          <label className="notification-choice">
            <input checked={preferences.scheduleMode === 'interval'} name="schedule" onChange={() => setPreferences({ ...preferences, scheduleMode: 'interval' })} type="radio" />
            <span>A cada intervalo</span>
          </label>
          <label className="field">
            <span>Intervalo</span>
            <select disabled={preferences.scheduleMode !== 'interval'} onChange={(event) => setPreferences({ ...preferences, intervalHours: Number(event.target.value) as 3 | 6 | 8 | 12 })} value={preferences.intervalHours}>
              <option value={3}>A cada 3 horas</option><option value={6}>A cada 6 horas</option><option value={8}>A cada 8 horas</option><option value={12}>A cada 12 horas</option>
            </select>
          </label>
          <label className="notification-choice">
            <input checked={preferences.scheduleMode === 'fixed'} name="schedule" onChange={() => setPreferences({ ...preferences, scheduleMode: 'fixed' })} type="radio" />
            <span>Em horários fixos</span>
          </label>
          <label className="field">
            <span>Horários (separados por vírgula)</span>
            <input disabled={preferences.scheduleMode !== 'fixed'} onChange={(event) => setPreferences({ ...preferences, preferredTimes: event.target.value.split(',').map((time) => time.trim()).filter(Boolean) })} placeholder="09:00, 15:00, 21:00" value={preferences.preferredTimes.join(', ')} />
          </label>
          <div className="notification-form__quiet">
            <label className="field"><span>Silêncio a partir de</span><input onChange={(event) => setPreferences({ ...preferences, quietStart: event.target.value })} type="time" value={preferences.quietStart} /></label>
            <label className="field"><span>Silêncio até</span><input onChange={(event) => setPreferences({ ...preferences, quietEnd: event.target.value })} type="time" value={preferences.quietEnd} /></label>
          </div>
        </fieldset>
        <p className="local-notice">Fuso horário: {preferences.timezone}. O disparo automático será ativado quando o serviço seguro de notificações estiver conectado.</p>
        <button className="button button--ghost" type="submit">Salvar preferências</button>
      </form>
      {message && <p className="save-success" role="status">{message}</p>}
    </section>
  );
}

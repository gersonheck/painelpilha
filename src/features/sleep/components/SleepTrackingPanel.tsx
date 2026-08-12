import { FormEvent, useMemo, useState } from 'react';
import type { SleepRecord } from '../../../shared/contracts/sleep';
import { isClockTime } from '../../../shared/contracts/sleep';
import { sleepRecordRepository } from '../data/sleepRecordRepository';
import {
  calculateSleepDurationHours,
  classifySleepDuration,
  getSuggestedSleepTimes,
  isSleepDurationPlausible,
  summarizeSleepPatterns,
  selectRecentSleepNights,
} from '../domain/sleepTracking';

interface SleepTrackingPanelProps {
  collaboratorId: string;
  targetSleepHours?: number;
}

const STATUS_LABELS = {
  'insufficient-data': 'Padrão em formação',
  stable: 'Padrão estável',
  'sleep-debt': 'Atenção à dívida de sono',
  irregular: 'Horários irregulares',
} as const;

function createRecordId() {
  const id = globalThis.crypto?.randomUUID?.();
  return id ? id.replace(/-/g, '') : `sleep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function localDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDay(dayKey: string) {
  const [year, month, day] = dayKey.split('-');
  return `${day}/${month}/${year.slice(2)}`;
}

export function SleepTrackingPanel({ collaboratorId, targetSleepHours }: SleepTrackingPanelProps) {
  const initialRecords = useMemo(
    () => sleepRecordRepository.list(collaboratorId),
    [collaboratorId],
  );
  const initialSuggestion = useMemo(
    () => getSuggestedSleepTimes(initialRecords),
    [initialRecords],
  );
  const [records, setRecords] = useState(initialRecords);
  const [bedTime, setBedTime] = useState(initialSuggestion.bedTime);
  const [wakeTime, setWakeTime] = useState(initialSuggestion.wakeTime);
  const [quality, setQuality] = useState(3);
  const [confirmImplausible, setConfirmImplausible] = useState(false);
  const [timeError, setTimeError] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasCompleteTimes = isClockTime(bedTime) && isClockTime(wakeTime);
  const sleepHours = hasCompleteTimes ? calculateSleepDurationHours(bedTime, wakeTime) : null;
  const classification = sleepHours === null ? null : classifySleepDuration(sleepHours);
  const summary = summarizeSleepPatterns(records, { targetSleepHours });
  const recentNights = selectRecentSleepNights(records);
  const requiresConfirmation = sleepHours !== null && !isSleepDurationPlausible(sleepHours);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sleepHours === null) {
      setTimeError(true);
      setSaved(false);
      return;
    }
    if (requiresConfirmation && !confirmImplausible) {
      setConfirmImplausible(true);
      setSaved(false);
      return;
    }

    const now = new Date();
    const record: SleepRecord = {
      id: createRecordId(),
      collaboratorId,
      dayKey: localDayKey(now),
      timestamp: now.toISOString(),
      sleepHours,
      bedTime,
      wakeTime,
      perceivedQuality: quality as 1 | 2 | 3 | 4 | 5,
      source: 'manual',
      confidence: 1,
    };
    const nextRecords = [record, ...records.filter((item) => item.dayKey !== record.dayKey)];
    sleepRecordRepository.replace(collaboratorId, nextRecords);
    setRecords(nextRecords);
    setConfirmImplausible(false);
    setTimeError(false);
    setSaved(true);
  }

  return (
    <section className="profile-card sleep-panel" aria-labelledby="sleep-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">SONO E RECUPERAÇÃO</p>
          <h2 id="sleep-title">Registro de sono</h2>
        </div>
        <span className="phase">{sleepHours === null ? '—' : `${sleepHours.toFixed(1).replace('.', ',')} h`}</span>
      </div>

      <p className="hero__copy">
        Registre sua última noite para acompanhar consistência e recuperação. Este recurso é informativo e não substitui avaliação clínica.
      </p>

      <form className="profile-form" noValidate onSubmit={save}>
        <label className="field">
          <span>Horário de deitar</span>
          <input aria-label="Horário de deitar" onChange={(event) => { setBedTime(event.target.value); setSaved(false); setTimeError(false); setConfirmImplausible(false); }} required type="time" value={bedTime} />
        </label>
        <label className="field">
          <span>Horário de acordar</span>
          <input aria-label="Horário de acordar" onChange={(event) => { setWakeTime(event.target.value); setSaved(false); setTimeError(false); setConfirmImplausible(false); }} required type="time" value={wakeTime} />
        </label>
        <label className="field field--wide">
          <span>Como você percebeu a qualidade do sono?</span>
          <select aria-label="Qualidade percebida do sono" onChange={(event) => { setQuality(Number(event.target.value)); setSaved(false); }} value={quality}>
            <option value={1}>1 — Muito ruim</option>
            <option value={2}>2 — Ruim</option>
            <option value={3}>3 — Regular</option>
            <option value={4}>4 — Boa</option>
            <option value={5}>5 — Muito boa</option>
          </select>
        </label>
        <div className="profile-actions field--wide">
          <button className="button button--primary" type="submit">
            {confirmImplausible ? 'Confirmar mesmo assim' : 'Registrar sono'}
          </button>
          {classification && (
            <span aria-live="polite" className={classification.color === 'green' ? 'save-success' : 'phase'}>
              {classification.label}
            </span>
          )}
          {saved && <span className="save-success" role="status">✓ Sono registrado neste dispositivo</span>}
        </div>
        {timeError && <p className="form-error field--wide" role="alert">Informe os dois horários para calcular a duração.</p>}
        {confirmImplausible && (
          <p className="form-error field--wide" role="alert">
            Essa duração parece incomum. Confirme o registro se os horários estiverem corretos.
          </p>
        )}
      </form>

      <section aria-label="Resumo semanal" className="sleep-summary">
        <div className="sleep-summary__heading">
          <div>
            <p className="eyebrow">ÚLTIMAS SETE NOITES</p>
            <h3>Seu padrão recente</h3>
          </div>
          <span className="phase">{STATUS_LABELS[summary.status]}</span>
        </div>
        <div className="sleep-summary__metrics">
          <div><span>Noites analisadas</span><strong>{summary.days}</strong></div>
          <div><span>Média por noite</span><strong>{summary.averageHours.toFixed(1).replace('.', ',')} h</strong></div>
          <div><span>Dívida estimada</span><strong>{summary.debtHours.toFixed(1).replace('.', ',')} h</strong></div>
        </div>
        <p className="local-notice">{summary.recommendation}</p>

        {recentNights.length > 0 && (
          <ol className="sleep-history" aria-label="Histórico recente de sono">
            {recentNights.map((night) => (
              <li key={night.id}>
                <span>{formatDay(night.dayKey)}</span>
                <strong>{night.sleepHours.toFixed(1).replace('.', ',')} h</strong>
                <small>{night.bedTime} → {night.wakeTime}</small>
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}

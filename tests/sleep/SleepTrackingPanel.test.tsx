import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { SleepTrackingPanel } from '../../src/features/sleep/components/SleepTrackingPanel';
import { sleepRecordRepository } from '../../src/features/sleep/data/sleepRecordRepository';

describe('SleepTrackingPanel', () => {
  const collaboratorId = 'a'.repeat(64);

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('registers a manual sleep record that remains in the scoped repository', () => {
    render(<SleepTrackingPanel collaboratorId={collaboratorId} />);

    fireEvent.change(screen.getByLabelText('Horário de deitar'), { target: { value: '23:30' } });
    fireEvent.change(screen.getByLabelText('Horário de acordar'), { target: { value: '07:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar sono' }));

    expect(screen.getByRole('status')).toHaveTextContent('Sono registrado');
    expect(sleepRecordRepository.list(collaboratorId)).toMatchObject([
      {
        collaboratorId,
        bedTime: '23:30',
        wakeTime: '07:00',
        sleepHours: 7.5,
        source: 'manual',
        confidence: 1,
      },
    ]);
  });

  it('requires a second confirmation for an implausible duration', () => {
    render(<SleepTrackingPanel collaboratorId={collaboratorId} />);

    fireEvent.change(screen.getByLabelText('Horário de deitar'), { target: { value: '23:00' } });
    fireEvent.change(screen.getByLabelText('Horário de acordar'), { target: { value: '01:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar sono' }));

    expect(screen.getByRole('alert')).toHaveTextContent('parece incomum');
    expect(sleepRecordRepository.list(collaboratorId)).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar mesmo assim' }));
    expect(sleepRecordRepository.list(collaboratorId)).toHaveLength(1);
  });
  it('shows the weekly summary and recent night history', () => {
    sleepRecordRepository.replace(collaboratorId, [
      {
        id: 'sleep-1',
        collaboratorId,
        dayKey: '2026-08-10',
        timestamp: '2026-08-10T09:00:00.000Z',
        sleepHours: 6,
        bedTime: '00:00',
        wakeTime: '06:00',
        source: 'manual',
        confidence: 1,
      },
      {
        id: 'sleep-2',
        collaboratorId,
        dayKey: '2026-08-09',
        timestamp: '2026-08-09T09:00:00.000Z',
        sleepHours: 6.5,
        bedTime: '23:30',
        wakeTime: '06:00',
        source: 'manual',
        confidence: 1,
      },
      {
        id: 'sleep-3',
        collaboratorId,
        dayKey: '2026-08-08',
        timestamp: '2026-08-08T09:00:00.000Z',
        sleepHours: 7,
        bedTime: '23:00',
        wakeTime: '06:00',
        source: 'manual',
        confidence: 1,
      },
    ]);

    render(<SleepTrackingPanel collaboratorId={collaboratorId} />);

    const summary = screen.getByRole('region', { name: 'Resumo semanal' });
    expect(within(summary).getByText('Atenção à dívida de sono')).toBeInTheDocument();
    expect(within(summary).getByText('10/08/26')).toBeInTheDocument();
    expect(within(summary).getByText('6,0 h')).toBeInTheDocument();
  });
  it('keeps the panel usable when a time field is temporarily empty', () => {
    render(<SleepTrackingPanel collaboratorId={collaboratorId} />);

    fireEvent.change(screen.getByLabelText('Horário de deitar'), { target: { value: '' } });

    expect(screen.getByRole('heading', { name: 'Registro de sono' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar sono' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Informe os dois horários');
  });
  it('uses the profile target when estimating sleep debt', () => {
    sleepRecordRepository.replace(collaboratorId, [
      { id: 's1', collaboratorId, dayKey: '2026-08-10', timestamp: '2026-08-10T09:00:00.000Z', sleepHours: 6, bedTime: '00:00', wakeTime: '06:00', source: 'manual', confidence: 1 },
      { id: 's2', collaboratorId, dayKey: '2026-08-09', timestamp: '2026-08-09T09:00:00.000Z', sleepHours: 6.5, bedTime: '23:30', wakeTime: '06:00', source: 'manual', confidence: 1 },
      { id: 's3', collaboratorId, dayKey: '2026-08-08', timestamp: '2026-08-08T09:00:00.000Z', sleepHours: 7, bedTime: '23:00', wakeTime: '06:00', source: 'manual', confidence: 1 },
    ]);

    render(<SleepTrackingPanel collaboratorId={collaboratorId} targetSleepHours={6} />);

    const summary = screen.getByRole('region', { name: 'Resumo semanal' });
    expect(within(summary).getByText('Padrão estável')).toBeInTheDocument();
    expect(within(summary).getByText('0,0 h')).toBeInTheDocument();
  });
});

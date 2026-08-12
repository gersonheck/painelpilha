import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OrganizationUsersPanel } from '../../src/features/management/components/OrganizationUsersPanel';

describe('OrganizationUsersPanel invitation expiry', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-08-04T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('refreshes actions when an invitation expires while the page stays open', async () => {
    render(<OrganizationUsersPanel />);

    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Maria Silva' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'maria@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar convite' }));

    await waitFor(() => expect(screen.getByText('Pendente')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Copiar link' })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(48 * 60 * 60 * 1000 + 1);
    });

    expect(screen.getByText('Expirado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copiar link' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gerar novo link' })).toBeInTheDocument();
  });
});

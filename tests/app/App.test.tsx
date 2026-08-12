import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../src/app/App';
import { profileRepository } from '../../src/features/profile/data/profileRepository';
import { createDefaultProfile } from '../../src/shared/contracts/profile';
import { STORAGE_KEYS } from '../../src/shared/storage/storageKeys';

describe('App session synchronization', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('returns to the access screen when another tab removes the session', () => {
    const session = {
      schemaVersion: 1,
      collaboratorId: 'a'.repeat(64),
      createdAt: '2026-08-04T12:00:00.000Z',
    };
    window.localStorage.setItem(STORAGE_KEYS.accessSession, JSON.stringify(session));

    render(<App />);
    expect(screen.getByText('Sessão ativa')).toBeInTheDocument();

    window.localStorage.removeItem(STORAGE_KEYS.accessSession);
    fireEvent(window, new StorageEvent('storage', {
      key: STORAGE_KEYS.accessSession,
      oldValue: JSON.stringify(session),
      newValue: null,
      storageArea: window.localStorage,
    }));

    expect(screen.getByRole('heading', { name: 'Comece pelo seu acesso.' })).toBeInTheDocument();
  });

  it('remounts profile state when another collaborator session arrives', () => {
    const firstSession = {
      schemaVersion: 1,
      collaboratorId: 'a'.repeat(64),
      createdAt: '2026-08-04T12:00:00.000Z',
    };
    const secondSession = {
      schemaVersion: 1,
      collaboratorId: 'b'.repeat(64),
      createdAt: '2026-08-04T12:05:00.000Z',
    };
    profileRepository.save({
      ...createDefaultProfile(firstSession.collaboratorId),
      name: 'Ana',
      role: 'Produto',
      configured: true,
    });
    profileRepository.save({
      ...createDefaultProfile(secondSession.collaboratorId),
      name: 'Bia',
      role: 'Operações',
      configured: true,
    });
    window.localStorage.setItem(STORAGE_KEYS.accessSession, JSON.stringify(firstSession));

    render(<App />);
    expect(screen.getByRole('heading', { name: 'Olá, Ana.' })).toBeInTheDocument();

    window.localStorage.setItem(STORAGE_KEYS.accessSession, JSON.stringify(secondSession));
    fireEvent(window, new StorageEvent('storage', {
      key: STORAGE_KEYS.accessSession,
      oldValue: JSON.stringify(firstSession),
      newValue: JSON.stringify(secondSession),
      storageArea: window.localStorage,
    }));

    expect(screen.getByRole('heading', { name: 'Olá, Bia.' })).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Ana')).not.toBeInTheDocument();
  });
});

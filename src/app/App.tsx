import { useEffect, useState } from 'react';
import type { AccessSession } from '../shared/contracts/session';
import { AccessPanel } from '../features/access/components/AccessPanel';
import { localAuthRepository } from '../features/access/data/localAuthRepository';
import { ProfileDashboard } from '../features/profile/components/ProfileDashboard';
import { STORAGE_KEYS } from '../shared/storage/storageKeys';

export function App() {
  const [session, setSession] = useState<AccessSession | null>(() => localAuthRepository.getSession());

  useEffect(() => {
    function synchronizeSession(event: StorageEvent) {
      if (event.key === STORAGE_KEYS.accessSession || event.key === null) {
        setSession(localAuthRepository.getSession());
      }
    }

    window.addEventListener('storage', synchronizeSession);
    return () => window.removeEventListener('storage', synchronizeSession);
  }, []);

  function logout() {
    localAuthRepository.logout();
    setSession(null);
  }

  return (
    <>
      <a className="skip-link" href="#main-content">Ir para o conteúdo principal</a>
      {session
        ? <ProfileDashboard key={session.collaboratorId} onLogout={logout} session={session} />
        : <main className="shell" id="main-content" tabIndex={-1}><AccessPanel onAuthenticated={setSession} /></main>}
    </>
  );
}

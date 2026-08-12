import { FormEvent, useMemo, useState } from 'react';
import type { AccessSession } from '../../../shared/contracts/session';
import { CompanyDashboard } from '../../management/components/CompanyDashboard';
import { PostureSelector } from '../../measurement/components/PostureSelector';
import type { MeasurementPosture } from '../../measurement/domain/ppgPolicy';
import { SleepTrackingPanel } from '../../sleep/components/SleepTrackingPanel';
import { NotificationPreferencesPanel } from '../../notifications/components/NotificationPreferencesPanel';
import { profileRepository } from '../data/profileRepository';

interface ProfileDashboardProps {
  session: AccessSession;
  onLogout(): void;
}

export function ProfileDashboard({ session, onLogout }: ProfileDashboardProps) {
  const initialProfile = useMemo(
    () => profileRepository.get(session.collaboratorId),
    [session.collaboratorId],
  );
  const [profile, setProfile] = useState(initialProfile);
  const [saved, setSaved] = useState(false);
  const [posture, setPosture] = useState<MeasurementPosture | null>(null);
  const [showCompanyDemo, setShowCompanyDemo] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = { ...profile, configured: Boolean(profile.name.trim() && profile.role.trim()) };
    profileRepository.save(next);
    setProfile(next);
    setSaved(true);
  }

  if (showCompanyDemo) {
    return <CompanyDashboard onBack={() => setShowCompanyDemo(false)} onLogout={onLogout} />;
  }

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div className="brand" aria-label="PilhA+">
          <span className="brand__mark" aria-hidden="true">P+</span>
          <span>PilhA+</span>
        </div>
        <div className="dashboard-header__actions">
          <button className="button button--company" onClick={() => setShowCompanyDemo(true)} type="button">Painel empresa <span>demo</span></button>
          <button className="button button--ghost" onClick={onLogout} type="button">Sair</button>
        </div>
      </header>

      <main className="dashboard-main" id="main-content" tabIndex={-1}>
        <section className="welcome-card">
          <div>
            <p className="eyebrow">PERFIL PROTEGIDO</p>
            <h1>{profile.configured ? `Olá, ${profile.name}.` : 'Vamos completar seu perfil?'}</h1>
            <p className="hero__copy">
              Este conteúdo está isolado no espaço <strong>{session.collaboratorId.slice(0, 8)}</strong>.
              Seus registros futuros usarão o mesmo identificador pseudônimo.
            </p>
          </div>
          <span className="security-badge">Sessão ativa</span>
        </section>

        <section className="profile-card" aria-labelledby="profile-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">DADOS ESSENCIAIS</p>
              <h2 id="profile-title">Seu perfil</h2>
            </div>
            <span className="phase">{profile.configured ? 'Configurado' : 'Pendente'}</span>
          </div>

          <form className="profile-form" onSubmit={submit}>
            <label className="field">
              <span>Como devemos chamar você?</span>
              <input
                onChange={(event) => { setProfile({ ...profile, name: event.target.value }); setSaved(false); }}
                placeholder="Seu nome"
                required
                value={profile.name}
              />
            </label>
            <label className="field">
              <span>Qual é sua função atual?</span>
              <input
                onChange={(event) => { setProfile({ ...profile, role: event.target.value }); setSaved(false); }}
                placeholder="Ex.: Analista, liderança, atendimento"
                required
                value={profile.role}
              />
            </label>
            <label className="field field--wide">
              <span>O que você gostaria de acompanhar?</span>
              <textarea
                onChange={(event) => { setProfile({ ...profile, bio: event.target.value }); setSaved(false); }}
                placeholder="Conte um pouco sobre sua rotina e seus objetivos."
                rows={4}
                value={profile.bio}
              />
            </label>
            <div className="profile-actions field--wide">
              <button className="button button--primary" type="submit">Salvar perfil</button>
              {saved && <span className="save-success" role="status">✓ Perfil salvo neste dispositivo</span>}
            </div>
          </form>
        </section>

        <NotificationPreferencesPanel collaboratorId={session.collaboratorId} />

        <SleepTrackingPanel collaboratorId={session.collaboratorId} targetSleepHours={profile.targetSleep} />

        <section className="measurement-preflight" aria-labelledby="measurement-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">NOVA MEDIÇÃO</p>
              <h2 id="measurement-title">Prepare sua postura</h2>
            </div>
            <span className="phase">Protocolo de 60 s</span>
          </div>
          <PostureSelector onChange={setPosture} value={posture} />
        </section>
      </main>
    </div>
  );
}

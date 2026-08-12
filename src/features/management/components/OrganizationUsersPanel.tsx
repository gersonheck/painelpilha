import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  getInvitationDisplayStatus,
  PILHA_ORGANIZATION,
  type OrganizationInvitation,
} from '../domain/organizationInvitation';
import {
  createOrganizationAccessService,
  InMemoryOrganizationAccessRepository,
  type OrganizationActor,
} from '../domain/organizationAccessService';

const DEMO_ADMINISTRATOR: OrganizationActor = {
  id: 'demo-admin',
  organizationId: PILHA_ORGANIZATION.id,
  role: 'organization-admin',
};

const MAX_TIMER_DELAY = 2_147_483_647;

export function OrganizationUsersPanel() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [activationUrls, setActivationUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const submitting = useRef(false);
  const [accessService] = useState(() => createOrganizationAccessService(
    new InMemoryOrganizationAccessRepository([PILHA_ORGANIZATION]),
  ));

  useEffect(() => {
    const nextExpiration = invitations
      .filter((invitation) => invitation.status === 'pending' || invitation.status === 'email-prepared')
      .map((invitation) => new Date(invitation.expiresAt).getTime())
      .filter((expiration) => Number.isFinite(expiration) && expiration > currentTime)
      .sort((left, right) => left - right)[0];

    if (nextExpiration === undefined) return undefined;
    const delay = Math.min(Math.max(nextExpiration - Date.now() + 1, 0), MAX_TIMER_DELAY);
    const timeout = window.setTimeout(() => setCurrentTime(Date.now()), delay);
    return () => window.clearTimeout(timeout);
  }, [currentTime, invitations]);

  async function refreshInvitations() {
    setInvitations(await accessService.list(DEMO_ADMINISTRATOR));
    setCurrentTime(Date.now());
  }

  function rememberActivationUrl(invitationId: string, activationUrl: string) {
    setActivationUrls((current) => ({ ...current, [invitationId]: activationUrl }));
  }

  function forgetActivationUrl(invitationId: string) {
    setActivationUrls((current) => {
      const next = { ...current };
      delete next[invitationId];
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError('');
    setSuccess('');
    submitting.current = true;
    setBusy(true);
    try {
      const created = await accessService.invite(DEMO_ADMINISTRATOR, {
        name,
        email,
        activationBaseUrl: window.location.origin,
      });
      rememberActivationUrl(created.invitation.id, created.activationUrl);
      await refreshInvitations();
      setName('');
      setEmail('');
      setSuccess(`Convite ${created.invitation.userSerial} criado. Prepare o e-mail para enviar.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível criar o convite.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function prepareEmail(invitation: OrganizationInvitation) {
    const activationUrl = activationUrls[invitation.id];
    if (!activationUrl) {
      setError('O link original não está mais disponível. Gere um novo link.');
      return;
    }
    try {
      await accessService.markEmailPrepared(DEMO_ADMINISTRATOR, invitation.id);
      await refreshInvitations();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível preparar o e-mail.');
      return;
    }
    const subject = encodeURIComponent('Ative sua conta no PilhA+');
    const body = encodeURIComponent(
      `Olá, ${invitation.name}!\n\nVocê foi convidado(a) para a organização Pilha no PilhA+.\n\nCódigo: ${invitation.userSerial}\nAtive sua conta em até 48 horas:\n${activationUrl}\n\nSe você não esperava este convite, ignore esta mensagem.`,
    );
    window.location.href = `mailto:${encodeURIComponent(invitation.email)}?subject=${subject}&body=${body}`;
  }

  async function revoke(invitation: OrganizationInvitation) {
    setError('');
    try {
      await accessService.revoke(DEMO_ADMINISTRATOR, invitation.id);
      forgetActivationUrl(invitation.id);
      await refreshInvitations();
      setSuccess(`Convite de ${invitation.name} revogado.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível revogar o convite.');
    }
  }

  async function resend(invitation: OrganizationInvitation) {
    setError('');
    try {
      const renewed = await accessService.resend(DEMO_ADMINISTRATOR, invitation.id, window.location.origin);
      rememberActivationUrl(invitation.id, renewed.activationUrl);
      await refreshInvitations();
      setSuccess(`Novo link gerado para ${invitation.name}. O link anterior não deve mais ser usado.`);
    } catch {
      setError('Não foi possível renovar o convite.');
    }
  }

  async function copyActivationLink(invitation: OrganizationInvitation) {
    const status = getInvitationDisplayStatus(invitation, new Date());
    if (status !== 'pending' && status !== 'email-prepared') {
      setCurrentTime(Date.now());
      setSuccess('');
      setError('Este convite não está mais ativo. Gere um novo link quando disponível.');
      return;
    }
    const activationUrl = activationUrls[invitation.id];
    if (!activationUrl) {
      setError('O link original não está mais disponível. Gere um novo link.');
      return;
    }
    try {
      await navigator.clipboard.writeText(activationUrl);
      setError('');
      setSuccess(`Link de ${invitation.name} copiado.`);
    } catch {
      setError('Não foi possível copiar. Use o botão de preparar e-mail.');
    }
  }

  return (
    <section className="company-panel organization-users" aria-labelledby="organization-users-title">
      <div className="company-panel__heading organization-users__heading">
        <div>
          <p className="eyebrow">PESSOAS E ACESSOS</p>
          <h2 id="organization-users-title">Convidar novo usuário</h2>
          <p>Informe somente nome e e-mail. O código e o link seguro são gerados automaticamente.</p>
        </div>
        <span className="organization-code">Organização {PILHA_ORGANIZATION.prefix}-{PILHA_ORGANIZATION.id}</span>
      </div>

      <div className="organization-users__layout">
        <form className="invite-form" onSubmit={submit}>
          <label className="field"><span>Nome completo</span><input autoComplete="name" onChange={(event) => setName(event.target.value)} placeholder="Nome da pessoa" required value={name} /></label>
          <label className="field"><span>E-mail</span><input autoComplete="email" onChange={(event) => setEmail(event.target.value)} placeholder="pessoa@empresa.com" required type="email" value={email} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {success && <p className="invite-success" role="status">✓ {success}</p>}
          <button className="button button--primary" disabled={busy} type="submit">{busy ? 'Criando convite…' : 'Criar convite'}</button>
          <small>O convite expira em 48 horas. Nesta demonstração, o envio abre o aplicativo de e-mail da sua máquina.</small>
        </form>

        <div className="invitation-list" aria-live="polite">
          <div className="invitation-list__title"><strong>Convites desta sessão</strong><span>{invitations.length}</span></div>
          {!invitations.length && <div className="invitation-empty"><span aria-hidden="true">✉</span><p>Nenhum convite criado. O primeiro código será <strong>PILHA-00001-000001</strong>.</p></div>}
          {invitations.map((invitation) => {
            const displayStatus = getInvitationDisplayStatus(invitation, new Date(currentTime));
            const inactive = displayStatus === 'expired' || displayStatus === 'revoked' || displayStatus === 'activated';
            const hasActivationUrl = Boolean(activationUrls[invitation.id]);
            const renewable = displayStatus === 'expired'
              || displayStatus === 'revoked'
              || (!inactive && !hasActivationUrl);
            const statusLabels = { pending: 'Pendente', 'email-prepared': 'E-mail preparado', activated: 'Ativado', expired: 'Expirado', revoked: 'Revogado' };
            return (
            <article className={`invitation-row${inactive ? ' invitation-row--inactive' : ''}`} key={invitation.id}>
              <div><strong>{invitation.name}</strong><span>{invitation.email}</span><code>{invitation.userSerial}</code></div>
              <div className="invitation-row__actions">
                <span className={`invitation-status invitation-status--${displayStatus}`}>{statusLabels[displayStatus]}</span>
                {!inactive && hasActivationUrl && <button className="link-button" onClick={() => copyActivationLink(invitation)} type="button">Copiar link</button>}
                {!inactive && hasActivationUrl && <button className="link-button link-button--primary" onClick={() => prepareEmail(invitation)} type="button">Preparar e-mail</button>}
                {!inactive && <button className="link-button link-button--danger" onClick={() => revoke(invitation)} type="button">Revogar</button>}
                {renewable && <button className="link-button link-button--primary" onClick={() => resend(invitation)} type="button">Gerar novo link</button>}
              </div>
            </article>
          );})}
        </div>
      </div>

      <p className="invite-demo-warning"><strong>Modo demonstração:</strong> convites são mantidos apenas nesta tela e não comprovam envio. Em produção, sequência, token, expiração e envio serão controlados pelo backend.</p>
    </section>
  );
}

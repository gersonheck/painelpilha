import { FormEvent, useState } from 'react';
import type { AccessSession } from '../../../shared/contracts/session';
import { localAuthRepository } from '../data/localAuthRepository';

interface AccessPanelProps {
  onAuthenticated(session: AccessSession): void;
}

export function AccessPanel({ onAuthenticated }: AccessPanelProps) {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const session = mode === 'register'
        ? await localAuthRepository.register(email, password)
        : await localAuthRepository.login(email, password);
      onAuthenticated(session);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível concluir o acesso.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="access-layout" aria-labelledby="access-title">
      <div className="access-intro">
        <div className="brand" aria-label="PilhA+">
          <span className="brand__mark" aria-hidden="true">P+</span>
          <span>PilhA+</span>
        </div>
        <p className="eyebrow">SEU ESPAÇO PESSOAL</p>
        <h1 id="access-title">Comece pelo seu acesso.</h1>
        <p className="hero__copy">
          Use seu e-mail para criar um identificador privado. Ele não fica salvo em texto aberto e
          separa os seus dados dos demais perfis neste dispositivo.
        </p>
        <ul className="trust-list" aria-label="Proteções do acesso local">
          <li><span aria-hidden="true">✓</span> E-mail transformado em identificador pseudônimo</li>
          <li><span aria-hidden="true">✓</span> Senha derivada com salt e PBKDF2</li>
          <li><span aria-hidden="true">✓</span> Sessão mantida até você escolher sair</li>
        </ul>
      </div>

      <div className="access-card">
        <div className="segmented" aria-label="Tipo de acesso">
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')} type="button">
            Criar acesso
          </button>
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">
            Já tenho acesso
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="form-heading">
            <span className="form-heading__icon" aria-hidden="true">{mode === 'register' ? '+' : '→'}</span>
            <div>
              <h2>{mode === 'register' ? 'Crie seu perfil local' : 'Acesse seu perfil'}</h2>
              <p>{mode === 'register' ? 'Não enviaremos validação por e-mail nesta etapa.' : 'Use os mesmos dados informados no cadastro.'}</p>
            </div>
          </div>

          <label className="field">
            <span>E-mail</span>
            <input
              autoComplete="email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@exemplo.com"
              required
              type="email"
              value={email}
            />
          </label>
          <label className="field">
            <span>Senha</span>
            <input
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo de 8 caracteres"
              required
              type="password"
              value={password}
            />
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button--primary submit-button" disabled={busy} type="submit">
            {busy ? 'Protegendo seus dados…' : mode === 'register' ? 'Criar e continuar' : 'Entrar no PilhA+'}
          </button>
        </form>

        <p className="local-notice">
          Este acesso é local e não substitui autenticação de servidor. Evite dispositivos compartilhados.
        </p>
      </div>
    </section>
  );
}

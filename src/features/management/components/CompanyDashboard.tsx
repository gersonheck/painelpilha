import { useState } from 'react';
import { companyDemoData } from '../data/companyDemoData';
import { calculateCompanyIndicators, MINIMUM_VISIBLE_GROUP_SIZE } from '../domain/companyIndicators';
import { OrganizationUsersPanel } from './OrganizationUsersPanel';

interface CompanyDashboardProps {
  onBack(): void;
  onLogout(): void;
}

const indicators = calculateCompanyIndicators(companyDemoData);

function MetricCard({ label, value, detail, tone = 'blue' }: {
  label: string;
  value: string;
  detail: string;
  tone?: 'blue' | 'green' | 'yellow';
}) {
  return (
    <article className={`company-metric company-metric--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export function CompanyDashboard({ onBack, onLogout }: CompanyDashboardProps) {
  const [activeSection, setActiveSection] = useState<'overview' | 'people'>('overview');
  return (
    <div className="company-shell">
      <header className="company-header">
        <div className="brand" aria-label="PilhA+">
          <span className="brand__mark" aria-hidden="true">P+</span>
          <span>PilhA+ Empresas</span>
        </div>
        <div className="company-header__actions">
          <button className="button button--ghost" onClick={onBack} type="button">Voltar ao perfil</button>
          <button className="button button--ghost" onClick={onLogout} type="button">Sair</button>
        </div>
      </header>

      <main className="company-main" id="main-content" tabIndex={-1}>
        <nav aria-label="Seções do painel empresarial" className="company-tabs">
          <button aria-current={activeSection === 'overview' ? 'page' : undefined} onClick={() => setActiveSection('overview')} type="button">Panorama</button>
          <button aria-current={activeSection === 'people' ? 'page' : undefined} onClick={() => setActiveSection('people')} type="button">Pessoas e acessos</button>
        </nav>

        <div className="company-section" hidden={activeSection !== 'overview'}>
        <section className="company-hero">
          <div>
            <div className="company-kicker"><span>DEMONSTRAÇÃO</span> Visão agregada · últimos 7 dias</div>
            <h1>Panorama de bem-estar</h1>
            <p>Indicadores simples para acompanhar adesão e qualidade, sem expor resultados individuais.</p>
          </div>
          <label className="company-period">
            <span>Período</span>
            <select aria-label="Período do painel" defaultValue="7d">
              <option value="7d">Últimos 7 dias</option>
              <option value="30d" disabled>Últimos 30 dias — em breve</option>
            </select>
          </label>
        </section>

        <section aria-label="Indicadores principais" className="company-metrics">
          <MetricCard label="Participação" value={`${indicators.participationRate}%`} detail={`${indicators.participants} de ${indicators.eligiblePeople} pessoas`} tone="green" />
          <MetricCard label="PilhA Score médio" value={String(indicators.averageScore)} detail="Média ponderada dos grupos visíveis" />
          <MetricCard label="Amostras aceitas" value={`${indicators.acceptedSampleRate}%`} detail="Após os critérios técnicos de qualidade" tone="yellow" />
          <MetricCard label="Equipes em atenção" value={String(indicators.attentionTeams)} detail="Score agregado abaixo de 65" tone="yellow" />
        </section>

        <div className="company-content-grid">
          <section className="company-panel" aria-labelledby="teams-title">
            <div className="company-panel__heading">
              <div>
                <p className="eyebrow">EQUIPES</p>
                <h2 id="teams-title">Visão por grupo</h2>
              </div>
              <span>{indicators.visibleTeams.length} grupos visíveis</span>
            </div>
            <div className="company-table-wrap">
              <table>
                <thead><tr><th>Equipe</th><th>Participação</th><th>Score</th><th>Tendência</th></tr></thead>
                <tbody>
                  {indicators.visibleTeams.map((team) => (
                    <tr key={team.id}>
                      <td><strong>{team.name}</strong><small>{team.participants} participantes</small></td>
                      <td><div className="company-progress"><span style={{ width: `${Math.round(team.participants / team.eligiblePeople * 100)}%` }} /></div>{Math.round(team.participants / team.eligiblePeople * 100)}%</td>
                      <td><span className={`score-pill ${team.averageScore < 65 ? 'attention' : ''}`}>{team.averageScore}</span></td>
                      <td className={team.weeklyTrend < 0 ? 'trend-down' : 'trend-up'}>{team.weeklyTrend > 0 ? '+' : ''}{team.weeklyTrend} pts</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="company-panel company-insights" aria-labelledby="insights-title">
            <div className="company-panel__heading"><div><p className="eyebrow">LEITURA RÁPIDA</p><h2 id="insights-title">Destaques</h2></div></div>
            <div className="insight insight--positive"><span aria-hidden="true">↗</span><div><strong>Produto avançou 7 pontos</strong><p>Maior evolução agregada no período.</p></div></div>
            <div className="insight insight--attention"><span aria-hidden="true">!</span><div><strong>Atendimento pede observação</strong><p>Queda agregada de 5 pontos; investigue contexto, não indivíduos.</p></div></div>
            <div className="privacy-note"><span aria-hidden="true">◉</span><p><strong>Privacidade por padrão</strong> Grupos com menos de {MINIMUM_VISIBLE_GROUP_SIZE} participantes não são exibidos. {indicators.protectedTeams} grupo protegido neste período.</p></div>
          </aside>
        </div>
        </div>
        <div className="company-section" hidden={activeSection !== 'people'}>
          <section className="company-hero company-hero--people">
            <div>
              <div className="company-kicker"><span>DEMONSTRAÇÃO</span> Gestão de convites</div>
              <h1>Pessoas e acessos</h1>
              <p>Crie convites com código organizacional sem misturar gestão de acesso com indicadores de bem-estar.</p>
            </div>
          </section>
          <OrganizationUsersPanel />
        </div>

        <p className="company-disclaimer">Dados demonstrativos. Este painel não realiza diagnóstico e não deve orientar decisões individuais de trabalho ou saúde.</p>
      </main>
    </div>
  );
}

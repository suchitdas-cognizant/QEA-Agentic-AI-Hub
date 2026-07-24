const AUTONOMY_LABEL = {
  L1: 'Assistive',
  L2: 'Supervised',
  L3: 'Conditional',
  L4: 'High autonomy',
};

export default function AgentCard({ agent, onOpen, index = 0 }) {
  const status = agent.status || 'Active';
  const auto = agent.autonomyLevel;
  const tier = agent.tier || 'Free';

  return (
    <article
      className="card"
      style={{ '--i': index }}
      role="button"
      tabIndex={0}
      aria-label={`Open details for ${agent.name}`}
      onClick={() => onOpen(agent)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(agent);
        }
      }}
    >
      <div className="card-top">
        <span className="card-icon-tile" aria-hidden="true">
          {agent.icon || '🤖'}
        </span>
        <span className="card-badges">
          {tier === 'Premium' && <span className="tier-badge tier-premium">★ Premium</span>}
          <span className={`status-badge status-${status.toLowerCase()}`}>
            <span className="status-dot" />
            {status}
          </span>
        </span>
      </div>

      <h3 className="card-title">{agent.name}</h3>
      <p className="card-tagline">{agent.tagline}</p>

      {auto && (
        <div className="card-meta">
          <span className={`autonomy-chip autonomy-${auto.toLowerCase()}`} title="Autonomy level (ARA)">
            <span className="autonomy-level">{auto}</span>
            {AUTONOMY_LABEL[auto] || 'Autonomy'}
          </span>
        </div>
      )}

      <div className="card-foot">
        {agent.industry ? <span className="card-industry">{agent.industry}</span> : <span />}
        {agent.smeEmail ? (
          <a
            className="connect-sme"
            href={`mailto:${agent.smeEmail}?subject=${encodeURIComponent(
              `Connect SME — ${agent.name}`
            )}`}
            onClick={(e) => e.stopPropagation()}
          >
            ✉ Connect SME
          </a>
        ) : (
          <span className="connect-sme">✉ Connect SME</span>
        )}
      </div>
    </article>
  );
}

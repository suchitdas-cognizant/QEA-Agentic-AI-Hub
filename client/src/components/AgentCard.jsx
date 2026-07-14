export default function AgentCard({ agent, onOpen, index = 0 }) {
  const status = agent.status || 'Active';

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
        <span className={`status-badge status-${status.toLowerCase()}`}>
          <span className="status-dot" />
          {status}
        </span>
      </div>

      <h3 className="card-title">{agent.name}</h3>
      <p className="card-tagline">{agent.tagline}</p>

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

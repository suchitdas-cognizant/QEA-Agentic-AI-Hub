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
  const rating = Number(agent.rating) || 0;
  const ratingCount = Number(agent.ratingCount) || 0;
  const techs = Array.isArray(agent.techStacks) ? agent.techStacks.filter(Boolean) : [];

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
      <p className="card-tagline">{agent.tagline || 'No description provided yet.'}</p>

      {(auto || techs.length > 0) && (
        <div className="card-meta">
          {auto && (
            <span className={`autonomy-chip autonomy-${auto.toLowerCase()}`} title="Autonomy level (ARA)">
              <span className="autonomy-level">{auto}</span>
              {AUTONOMY_LABEL[auto] || 'Autonomy'}
            </span>
          )}
          {techs.slice(0, 3).map((t) => (
            <span className="card-tech" key={t}>{t}</span>
          ))}
          {techs.length > 3 && <span className="card-tech card-tech-more">+{techs.length - 3}</span>}
        </div>
      )}

      <div className="card-foot">
        <span className="card-rating" aria-label={ratingCount ? `Rated ${rating.toFixed(1)} out of 5` : 'No reviews yet'}>
          {ratingCount > 0 ? (
            <>
              <span className="card-rating-star">★</span>
              <b>{rating.toFixed(1)}</b>
              <em>({ratingCount})</em>
            </>
          ) : (
            <span className="card-rating-none">No reviews yet</span>
          )}
        </span>

        {agent.smeEmail ? (
          <a
            className="connect-sme"
            href={`mailto:${agent.smeEmail}?subject=${encodeURIComponent(`Connect SME — ${agent.name}`)}`}
            onClick={(e) => e.stopPropagation()}
          >
            ✉ Connect SME
          </a>
        ) : agent.industry ? (
          <span className="card-industry">{agent.industry}</span>
        ) : (
          <span className="card-open">View →</span>
        )}
      </div>
    </article>
  );
}

import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { STATUSES } from '../constants.js';
import AgentCard from './AgentCard.jsx';
import AgentModal from './AgentModal.jsx';

export default function AgentGrid({ embedded = false }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [active, setActive] = useState(null); // currently opened agent

  // Debounced load whenever filters change.
  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        setAgents(await api.listAgents({ q, status }));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, status]);

  return (
    <section className={embedded ? 'agent-catalog' : 'section'} id="solutions">
      <div className={embedded ? '' : 'container'}>
        <div className="section-head">
          <div>
            {!embedded && <h2>Agents</h2>}
            <p className="section-sub">
              Diverse AI agents for industry-specific automation needs along with
              extensible process accelerators
            </p>
          </div>
          <span className="view-all">{agents.length} agents</span>
        </div>

        <div className="toolbar">
          <div className="search">
            <span aria-hidden="true">🔍</span>
            <input
              aria-label="Search agents"
              placeholder="Search agents, tech stacks…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="loading">Loading agents…</div>
        ) : agents.length === 0 ? (
          <div className="empty">No agents found. Try a different search or filter.</div>
        ) : (
          <div className="grid">
            {agents.map((a, i) => (
              <AgentCard key={a._id} agent={a} onOpen={setActive} index={i} />
            ))}
          </div>
        )}
      </div>

      {active && (
        <AgentModal
          agent={active}
          onClose={() => setActive(null)}
          onRated={(rating, ratingCount) =>
            setActive((a) => ({ ...a, rating, ratingCount }))
          }
        />
      )}
    </section>
  );
}

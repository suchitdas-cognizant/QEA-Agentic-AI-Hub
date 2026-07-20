import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import AgentGrid from '../components/AgentGrid.jsx';
import RequestForm from '../components/RequestForm.jsx';
import BrandMark from '../components/BrandMark.jsx';
import AgentAssistant from '../components/AgentAssistant.jsx';

const BASE_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '▚' },
  { id: 'agents', label: 'Agents', icon: '◧' },
  { id: 'requests', label: 'Request an agent', icon: '✎' },
];
const REVIEW_NAV = { id: 'review', label: 'Agent requests', icon: '✉' };

export default function Hub() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState('dashboard');
  const [navOpen, setNavOpen] = useState(false);
  const [agentCount, setAgentCount] = useState(null);
  const [activeCount, setActiveCount] = useState(null);
  const [queriesEmail, setQueriesEmail] = useState('');

  useEffect(() => {
    api.listAgents().then((a) => {
      setAgentCount(a.length);
      setActiveCount(a.filter((x) => (x.status || 'Active') === 'Active').length);
    }).catch(() => {});
    api.getConfig().then((c) => setQueriesEmail(c.queriesEmail)).catch(() => {});
  }, []);

  const initials = useMemo(() => {
    const name = user?.displayName || user?.username || '?';
    return name.trim().slice(0, 1).toUpperCase();
  }, [user]);

  const canReview = role === 'admin' || role === 'associate';
  const nav = (canReview ? [...BASE_NAV, REVIEW_NAV] : [...BASE_NAV]).map((n) =>
    n.id === 'requests' && role === 'user' ? { ...n, label: 'Share an idea' } : n
  );

  const go = (id) => {
    setView(id);
    setNavOpen(false);
  };

  const title = nav.find((n) => n.id === view)?.label || 'Dashboard';

  return (
    <div className="hub">
      {/* ---- Sidebar ---- */}
      <aside className={`hub-rail ${navOpen ? 'open' : ''}`}>
        <button className="hub-brand" onClick={() => go('dashboard')} type="button">
          <BrandMark className="hub-logo" />
          <span className="hub-brand-text">
            <small>COGNIZANT</small>
            <b>QE Agentic Hub</b>
          </span>
        </button>

        <nav className="hub-nav">
          {nav.map((item) => (
            <button
              key={item.id}
              className={`hub-nav-item ${view === item.id ? 'active' : ''}`}
              onClick={() => go(item.id)}
              type="button"
            >
              <span className="hub-nav-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          ))}
          {role === 'admin' && (
            <Link to="/admin" className="hub-nav-item">
              <span className="hub-nav-icon" aria-hidden="true">⚙</span>
              Admin console
            </Link>
          )}
        </nav>

        <div className="hub-rail-foot">
          <div className="hub-user">
            <span className="hub-avatar" aria-hidden="true">{initials}</span>
            <span className="hub-user-meta">
              <b>{user?.displayName || user?.username}</b>
              <small>{role}</small>
            </span>
          </div>
          <button className="hub-signout" onClick={() => { logout(); navigate('/'); }} type="button">
            Sign out
          </button>
        </div>
      </aside>

      {navOpen && <div className="hub-scrim" onClick={() => setNavOpen(false)} />}

      {/* ---- Main ---- */}
      <div className="hub-main">
        <header className="hub-topbar">
          <button
            className="hub-burger"
            aria-label="Toggle navigation"
            onClick={() => setNavOpen((v) => !v)}
            type="button"
          >
            ☰
          </button>
          <h1 className="hub-title">{title}</h1>
          <span className="hub-topbar-user">{user?.displayName || user?.username}</span>
        </header>

        <div className="hub-content">
          {view === 'dashboard' && (
            <>
              <Dashboard
                name={user?.displayName || user?.username}
                agentCount={agentCount}
                activeCount={activeCount}
                onGo={go}
              />
              {role === 'user' && <RequestAccessCard />}
            </>
          )}

          {view === 'agents' && <AgentGrid embedded />}

          {view === 'requests' && (
            <section className="hub-request">
              <div className="hub-panel-head">
                <h2>{role === 'user' ? 'Share an innovation idea' : 'Submit an agent'}</h2>
                <p>
                  {role === 'user'
                    ? 'Have an idea for an AI agent? Pitch it here — the QEA team will review it, and associates can build it into the hub.'
                    : 'Submit a full agent — description, key benefits, docs, demo video and code — for admin review and publishing.'}
                </p>
              </div>

              <div className="hub-request-card hub-request-single">
                <RequestForm />
                {queriesEmail && (
                  <p className="hub-queries">
                    ✉ Questions? <a href={`mailto:${queriesEmail}`}>{queriesEmail}</a>
                  </p>
                )}
              </div>
            </section>
          )}

          {view === 'review' && canReview && (
            <RequestsInbox canDelete={role === 'admin'} />
          )}
        </div>
      </div>

      <AgentAssistant />
    </div>
  );
}

function RequestAccessCard() {
  const [state, setState] = useState('idle'); // idle | form | pending
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.myAccess().then((d) => { if (d.pending) setState('pending'); }).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.requestAccess(message.trim());
      setState('pending');
    } catch (err) {
      setError(err.message || 'Could not submit request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`hub-access-card ${state === 'pending' ? 'is-pending' : ''}`}>
      <div className="hub-access-icon" aria-hidden="true">{state === 'pending' ? '⏳' : '🛡️'}</div>
      {state === 'pending' ? (
        <div className="hub-access-body">
          <b>Associate access requested</b>
          <p>Your request is pending. An admin will review and approve it — you'll get associate access on your next sign-in once approved.</p>
        </div>
      ) : state === 'form' ? (
        <form className="hub-access-body" onSubmit={submit}>
          <b>Request associate access</b>
          <p>Tell the admin why you need to review agent requests (optional).</p>
          <textarea
            className="input"
            rows={2}
            placeholder="e.g. I triage incoming agent requests for the Banking QA team."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          {error && <span className="note err">{error}</span>}
          <div className="hub-access-actions">
            <button className="btn btn-primary btn-sm" disabled={busy} type="submit">
              {busy ? 'Sending…' : 'Send request'}
            </button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setState('idle')}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className="hub-access-body">
          <b>Become an associate</b>
          <p>Associates can review agent requests submitted across the platform. Request access and an admin will approve it.</p>
          <button className="btn btn-primary btn-sm" type="button" onClick={() => setState('form')}>Request access</button>
        </div>
      )}
    </section>
  );
}

const REQUEST_STATUSES = ['New', 'In Review', 'Approved', 'Rejected'];

function RequestsInbox({ canDelete }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await api.listRequests());
    } catch (err) {
      setError(err.message || 'Could not load requests.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id, status) => {
    await api.updateRequestStatus(id, status);
    load();
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this request?')) return;
    await api.deleteRequest(id);
    load();
  };

  return (
    <section className="hub-inbox">
      <div className="hub-panel-head">
        <h2>Agent requests {rows.length > 0 && <span className="hub-count">{rows.length}</span>}</h2>
        <p>Submissions from the request form. Review and move each through its status.</p>
      </div>

      {loading ? (
        <div className="loading">Loading requests…</div>
      ) : error ? (
        <div className="empty">{error}</div>
      ) : rows.length === 0 ? (
        <div className="empty">No requests submitted yet.</div>
      ) : (
        <div className="hub-table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Requester</th>
                <th>Use case</th>
                <th>Status</th>
                {canDelete && <th aria-label="Actions" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td>
                    <strong>{r.agentName}</strong>
                    <span className={`type-tag type-${r.type || 'submission'}`}>
                      {r.type === 'idea' ? '💡 Idea' : '📦 Full'}
                    </span>
                    {r.description && <div className="sub">{r.description}</div>}
                  </td>
                  <td>
                    {r.submittedByUsername || r.requesterName || '—'}
                    {r.submittedByRole && <div className="sub">{r.submittedByRole}</div>}
                  </td>
                  <td>{r.useCase || '—'}</td>
                  <td>
                    <select
                      className={`input status-${r.status.replace(/ /g, '-')}`}
                      value={r.status}
                      onChange={(e) => setStatus(r._id, e.target.value)}
                      style={{ padding: '6px 10px' }}
                    >
                      {REQUEST_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  {canDelete && (
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(r._id)} type="button">
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Dashboard({ name, agentCount, activeCount, onGo }) {
  return (
    <div className="hub-dash">
      <div className="hub-welcome">
        <h2>Welcome back, {name?.split(' ')[0] || name} 👋</h2>
        <p>Discover live agents, review them, and request what your team needs next.</p>
      </div>

      <div className="hub-stats">
        <button className="hub-stat" onClick={() => onGo('agents')} type="button">
          <b>{agentCount === null ? '—' : agentCount}</b>
          <span>Agents available</span>
        </button>
        <div className="hub-stat">
          <b>{activeCount === null ? '—' : activeCount}</b>
          <span>Active agents</span>
        </div>
        <div className="hub-stat">
          <b>24/7</b>
          <span>Automation</span>
        </div>
      </div>

      <div className="hub-quick">
        <button className="hub-quick-card" onClick={() => onGo('agents')} type="button">
          <span className="hub-quick-icon" aria-hidden="true">◧</span>
          <b>Browse the catalog</b>
          <small>Search, filter and open any agent to see details, demo videos and reviews.</small>
          <span className="hub-quick-cta">Open catalog →</span>
        </button>
        <button className="hub-quick-card" onClick={() => onGo('requests')} type="button">
          <span className="hub-quick-icon" aria-hidden="true">✎</span>
          <b>Request an agent</b>
          <small>Can't find what you need? Submit a request and the team will take it forward.</small>
          <span className="hub-quick-cta">New request →</span>
        </button>
      </div>
    </div>
  );
}

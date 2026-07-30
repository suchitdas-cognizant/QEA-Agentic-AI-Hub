import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
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
          {role === 'user' && <AccessIconButton />}
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

// Compact associate-access control shown as a small icon in the user profile.
// Clicking it opens a popup where a note is required before sending.
function AccessIconButton() {
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.myAccess().then((d) => setPending(Boolean(d.pending))).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!note.trim()) {
      setError('Please add a note explaining why you need associate access.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.requestAccess(note.trim());
      setPending(true);
      setOpen(false);
      setNote('');
    } catch (err) {
      setError(err.message || 'Could not submit request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        className={`access-req-btn ${pending ? 'is-pending' : ''}`}
        onClick={() => !pending && setOpen(true)}
        disabled={pending}
        title={pending ? 'Pending admin approval' : 'Ask an admin for associate access to review agent requests'}
        type="button"
      >
        <span aria-hidden="true">{pending ? '⏳' : '🛡'}</span>
        {pending ? 'Access requested' : 'Request associate access'}
      </button>

      {open && createPortal(
        <div className="req-modal-overlay" onClick={() => setOpen(false)}>
          <form className="access-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
            <button className="req-modal-close" type="button" aria-label="Close" onClick={() => setOpen(false)}>×</button>
            <div className="access-modal-head">
              <span className="access-modal-icon" aria-hidden="true">🛡</span>
              <div>
                <h3>Request associate access</h3>
                <p className="sub">Associates can review and build out agent ideas.</p>
              </div>
            </div>
            <div className="access-modal-field">
              <label className="fb-label" htmlFor="access-note">Note <span className="req-star">*</span></label>
              <textarea
                id="access-note"
                className="textarea"
                rows={4}
                autoFocus
                value={note}
                maxLength={500}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="access-modal-hint">
                <span>{error ? <span className="note err">{error}</span> : 'Required — an admin will read this.'}</span>
                <span className="access-modal-count">{note.length}/500</span>
              </div>
            </div>
            <div className="access-modal-actions">
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" type="submit" disabled={busy || !note.trim()}>
                {busy ? 'Sending…' : 'Send request'}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </>
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
        <h2>Innovation ideas {rows.length > 0 && <span className="hub-count">{rows.length}</span>}</h2>
        <p>Ideas an admin forwarded to you to build into agents. Review each and move it through its status.</p>
      </div>

      {loading ? (
        <div className="loading">Loading requests…</div>
      ) : error ? (
        <div className="empty">{error}</div>
      ) : rows.length === 0 ? (
        <div className="empty">No ideas forwarded to you yet.</div>
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

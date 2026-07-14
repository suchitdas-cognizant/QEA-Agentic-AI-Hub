import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, attachmentUrl } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import AgentForm from '../components/AgentForm.jsx';
import AgentGrid from '../components/AgentGrid.jsx';
import BrandMark from '../components/BrandMark.jsx';
import AgentAssistant from '../components/AgentAssistant.jsx';

/* ---------------- Agents tab ---------------- */
function AgentsTab() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // agent being edited
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setAgents(await api.listAgents());
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const remove = async (a) => {
    if (!confirm(`Delete "${a.name}"? This also removes its video.`)) return;
    await api.deleteAgent(a._id);
    load();
  };

  if (adding) {
    return (
      <div className="panel">
        <h3>Add a new agent</h3>
        <AgentForm onSaved={() => { setAdding(false); load(); }} onCancel={() => setAdding(false)} />
      </div>
    );
  }
  if (editing) {
    return (
      <div className="panel">
        <h3>Edit agent</h3>
        <AgentForm agent={editing} onSaved={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />
      </div>
    );
  }

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Agents ({agents.length})</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>＋ Add agent</button>
      </div>
      {loading ? (
        <div className="loading">Loading…</div>
      ) : agents.length === 0 ? (
        <div className="empty">No agents yet — add your first one.</div>
      ) : (
        agents.map((a) => {
          return (
            <div className="admin-agent-row" key={a._id}>
              <span className="card-icon">{a.icon || '🤖'}</span>
              <div>
                <div className="name">{a.name}</div>
                <div className="sub">{a.tagline}</div>
              </div>
              {a.priority ? <span className="prio-badge" title="Priority (higher shows first)">★ {a.priority}</span> : null}
              <span className={`status-badge status-${(a.status || 'Active').toLowerCase()}`} style={{ marginLeft: 10 }}>
                <span className="status-dot" />
                {a.status || 'Active'}
              </span>
              {a.hasVideo && <span title="Has video">🎬</span>}
              <span className="row-spacer" />
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(a)}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={() => remove(a)}>Delete</button>
            </div>
          );
        })
      )}
    </div>
  );
}

/* ---------------- Requests tab ---------------- */
const STATUSES = ['New', 'In Review', 'Approved', 'Rejected'];

const ATTACH_ICON = { video: '🎬', md: '📄', code: '💻', other: '📎' };
const roleLabel = (role) => ({ admin: 'Admin', associate: 'Associate', user: 'User' }[role] || 'User');

// Focused, read + act view for a single request.
function RequestDetail({ req, busy, onClose, onStatus, onPublish, onDelete }) {
  if (!req) return null;
  const r = req;
  return (
    <div className="req-modal-overlay" onClick={onClose}>
      <div className="req-modal" onClick={(e) => e.stopPropagation()}>
        <button className="req-modal-close" onClick={onClose} aria-label="Close">×</button>
        <div className="req-modal-tags">
          <span className={`type-tag type-${r.type || 'submission'}`}>
            {r.type === 'idea' ? '💡 Idea' : '📦 Full submission'}
          </span>
          <span className={`role-tag role-${r.submittedByRole || 'user'}`}>{roleLabel(r.submittedByRole)}</span>
        </div>
        <h3 style={{ margin: '4px 0 2px' }}>{r.agentName}</h3>
        <p className="sub">by {r.submittedByUsername || r.requesterName || 'unknown'}</p>

        {r.useCase && (<><div className="req-label">Use case</div><p>{r.useCase}</p></>)}
        {r.description && (<><div className="req-label">Description</div><p style={{ whiteSpace: 'pre-line' }}>{r.description}</p></>)}

        {r.keyBenefits?.length > 0 && (
          <>
            <div className="req-label">Key benefits</div>
            <ul className="req-benefits">
              {r.keyBenefits.map((b, i) => (
                <li key={i}><strong>{b.title}</strong>{b.description ? ` — ${b.description}` : ''}</li>
              ))}
            </ul>
          </>
        )}

        {(r.attachments?.length > 0 || r.repoUrl) && (
          <>
            <div className="req-label">Attachments</div>
            <div className="req-attach">
              {r.attachments?.map((a, i) => (
                <a
                  key={i}
                  className="attach-chip"
                  href={attachmentUrl(a.fileId, { download: a.kind === 'code' || a.kind === 'other' })}
                  target="_blank"
                  rel="noreferrer"
                >
                  {ATTACH_ICON[a.kind] || '📎'} {a.filename || a.kind}
                </a>
              ))}
              {r.repoUrl && <a className="attach-chip" href={r.repoUrl} target="_blank" rel="noreferrer">🔗 Repository</a>}
            </div>
          </>
        )}

        {r.type === 'idea' && !r.description && !r.useCase && (
          <p className="sub">No extra detail provided — this is an innovation idea.</p>
        )}

        <div className="req-modal-actions">
          <select
            className={`input status-${r.status.replace(/ /g, '-')}`}
            value={r.status}
            onChange={(e) => onStatus(r._id, e.target.value)}
            style={{ padding: '6px 10px', maxWidth: 160 }}
          >
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          {r.publishedAgent ? (
            <span className="note ok">✓ Published as a live agent</span>
          ) : (
            <button className="btn btn-primary btn-sm" disabled={busy === r._id} onClick={() => onPublish(r._id)}>
              {busy === r._id ? 'Publishing…' : 'Approve & publish'}
            </button>
          )}
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(r._id)}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function RequestsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [detailId, setDetailId] = useState(null);

  // Deriving the open request from `rows` keeps the modal in sync after reloads.
  const detail = rows.find((r) => r._id === detailId) || null;

  const load = async () => {
    setLoading(true);
    try {
      setRows(await api.listRequests());
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
    if (!confirm('Delete this request?')) return;
    await api.deleteRequest(id);
    setDetailId(null);
    load();
  };
  const publish = async (id) => {
    if (!confirm('Approve and publish this submission as a live agent?')) return;
    setBusy(id);
    try {
      await api.publishRequest(id);
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="panel">
      <h3>Agent requests ({rows.length})</h3>
      {loading ? (
        <div className="loading">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="empty">No requests submitted yet.</div>
      ) : (
        <div className="req-rows">
          {rows.map((r) => (
            <button className="req-row" key={r._id} onClick={() => setDetailId(r._id)}>
              <span className={`type-tag type-${r.type || 'submission'}`}>
                {r.type === 'idea' ? '💡 Idea' : '📦 Full'}
              </span>
              <span className="req-row-main">
                <strong>{r.agentName}</strong>
                <span className="sub">by {r.submittedByUsername || r.requesterName || 'unknown'}</span>
              </span>
              <span className={`role-tag role-${r.submittedByRole || 'user'}`}>{roleLabel(r.submittedByRole)}</span>
              <span className={`req-status status-${r.status.replace(/ /g, '-')}`}>{r.status}</span>
              {r.publishedAgent && <span className="req-published" title="Published">✓</span>}
              <span className="req-row-open">View →</span>
            </button>
          ))}
        </div>
      )}

      <RequestDetail
        req={detail}
        busy={busy}
        onClose={() => setDetailId(null)}
        onStatus={setStatus}
        onPublish={publish}
        onDelete={remove}
      />
    </div>
  );
}

/* ---------------- Access (associates) tab ---------------- */
function AccessTab() {
  const [requests, setRequests] = useState([]);
  const [associates, setAssociates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: '', name: '' });
  const [note, setNote] = useState({ type: '', msg: '' });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [r, a] = await Promise.all([api.listAccessRequests(), api.listAssociates()]);
      setRequests(r);
      setAssociates(a);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const decide = async (id, status) => {
    await api.decideAccessRequest(id, status);
    load();
  };

  const addAssociate = async (e) => {
    e.preventDefault();
    setNote({ type: '', msg: '' });
    setBusy(true);
    try {
      await api.addAssociate({ email: form.email.trim(), name: form.name.trim() });
      setForm({ email: '', name: '' });
      setNote({ type: 'ok', msg: 'Associate access granted.' });
      load();
    } catch (err) {
      setNote({ type: 'err', msg: err.message });
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (a) => {
    if (!confirm(`Revoke associate access for ${a.email}?`)) return;
    await api.removeAssociate(a._id);
    load();
  };

  const pending = requests.filter((r) => r.status === 'Pending');

  return (
    <>
      <div className="panel">
        <h3>Grant associate access</h3>
        <p className="section-sub" style={{ marginTop: 4, marginBottom: 16 }}>
          Add someone directly by email. On their next sign-in they'll have associate access
          (view &amp; review agent requests).
        </p>
        <form className="access-add" onSubmit={addAssociate}>
          <input
            className="input"
            type="email"
            placeholder="name@cognizant.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
          <input
            className="input"
            placeholder="Name (optional)"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Adding…' : '＋ Add associate'}
          </button>
        </form>
        {note.msg && <span className={`note ${note.type}`} style={{ display: 'inline-block', marginTop: 10 }}>{note.msg}</span>}
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3>Access requests {pending.length > 0 && <span className="count-pill">{pending.length} pending</span>}</h3>
        {loading ? (
          <div className="loading">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="empty">No access requests yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Requester</th><th>Message</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r._id}>
                  <td>
                    <strong>{r.name || r.email}</strong>
                    <div className="sub"><a href={`mailto:${r.email}`}>{r.email}</a></div>
                  </td>
                  <td>{r.message || '—'}</td>
                  <td><span className={`pill pill-${r.status.toLowerCase()}`}>{r.status}</span></td>
                  <td>
                    {r.status === 'Pending' ? (
                      <div className="row-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => decide(r._id, 'Approved')}>Approve</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => decide(r._id, 'Rejected')}>Reject</button>
                      </div>
                    ) : (
                      <span className="sub">{r.decidedBy ? `by ${r.decidedBy}` : ''}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3>Associates ({associates.length})</h3>
        {loading ? (
          <div className="loading">Loading…</div>
        ) : associates.length === 0 ? (
          <div className="empty">No associates yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Email</th><th>Name</th><th>Granted</th><th></th></tr>
            </thead>
            <tbody>
              {associates.map((a) => (
                <tr key={a._id}>
                  <td><strong>{a.email}</strong></td>
                  <td>{a.name || '—'}</td>
                  <td><span className="sub">{a.grantedVia === 'request' ? 'via request' : 'by admin'}</span></td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => revoke(a)}>Revoke</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

/* ---------------- Admin dashboard ---------------- */
function AdminDashboard({ stats, onGo }) {
  const S = (v) => (v === null || v === undefined ? '—' : v);
  return (
    <div className="hub-dash">
      <div className="hub-welcome">
        <h2>Admin console</h2>
        <p>Manage agents, review requests and control associate access — all in one place.</p>
      </div>

      <div className="hub-stats admin-stats">
        <button className="hub-stat" onClick={() => onGo('catalog')} type="button">
          <b>{S(stats.agents)}</b><span>Agents</span>
        </button>
        <button className="hub-stat" onClick={() => onGo('requests')} type="button">
          <b>{S(stats.agentReq)}</b><span>Open agent requests</span>
        </button>
        <button className="hub-stat" onClick={() => onGo('access')} type="button">
          <b>{S(stats.accessReq)}</b><span>Pending access requests</span>
        </button>
        <button className="hub-stat" onClick={() => onGo('access')} type="button">
          <b>{S(stats.associates)}</b><span>Associates</span>
        </button>
      </div>

      <div className="hub-quick">
        <button className="hub-quick-card" onClick={() => onGo('manage')} type="button">
          <span className="hub-quick-icon" aria-hidden="true">⚙</span>
          <b>Manage agents</b>
          <small>Add, edit or remove agents and upload demo videos.</small>
          <span className="hub-quick-cta">Open →</span>
        </button>
        <button className="hub-quick-card" onClick={() => onGo('access')} type="button">
          <span className="hub-quick-icon" aria-hidden="true">⚑</span>
          <b>Manage access</b>
          <small>Grant associate access or approve pending requests.</small>
          <span className="hub-quick-cta">Open →</span>
        </button>
      </div>
    </div>
  );
}

/* ---------------- Page shell (portal layout) ---------------- */
const ADMIN_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '▚' },
  { id: 'catalog', label: 'Agents', icon: '◧' },
  { id: 'manage', label: 'Manage agents', icon: '⚙' },
  { id: 'requests', label: 'Agent requests', icon: '✉' },
  { id: 'access', label: 'Access', icon: '⚑' },
];

export default function Admin() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState('dashboard');
  const [navOpen, setNavOpen] = useState(false);
  const [stats, setStats] = useState({ agents: null, agentReq: null, accessReq: null, associates: null });

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.listAgents().catch(() => []),
      api.listRequests().catch(() => []),
      api.listAccessRequests().catch(() => []),
      api.listAssociates().catch(() => []),
    ]).then(([ag, req, acc, assoc]) => {
      if (!alive) return;
      setStats({
        agents: ag.length,
        agentReq: req.filter((r) => r.status === 'New' || r.status === 'In Review').length,
        accessReq: acc.filter((r) => r.status === 'Pending').length,
        associates: assoc.length,
      });
    });
    return () => { alive = false; };
  }, [view]);

  const initials = (user?.displayName || user?.username || '?').trim().slice(0, 1).toUpperCase();
  const go = (id) => { setView(id); setNavOpen(false); };
  const title = ADMIN_NAV.find((n) => n.id === view)?.label || 'Dashboard';

  return (
    <div className="hub">
      <aside className={`hub-rail ${navOpen ? 'open' : ''}`}>
        <button className="hub-brand" onClick={() => go('dashboard')} type="button">
          <BrandMark className="hub-logo" />
          <span className="hub-brand-text">
            <small>COGNIZANT</small>
            <b>QE Agentic Hub</b>
          </span>
        </button>

        <nav className="hub-nav">
          {ADMIN_NAV.map((item) => (
            <button
              key={item.id}
              className={`hub-nav-item ${view === item.id ? 'active' : ''}`}
              onClick={() => go(item.id)}
              type="button"
            >
              <span className="hub-nav-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
              {item.id === 'requests' && stats.agentReq > 0 && <span className="hub-nav-badge">{stats.agentReq}</span>}
              {item.id === 'access' && stats.accessReq > 0 && <span className="hub-nav-badge">{stats.accessReq}</span>}
            </button>
          ))}
          <Link to="/" className="hub-nav-item">
            <span className="hub-nav-icon" aria-hidden="true">↩</span>
            Public site
          </Link>
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

      <div className="hub-main">
        <header className="hub-topbar">
          <button className="hub-burger" aria-label="Toggle navigation" onClick={() => setNavOpen((v) => !v)} type="button">☰</button>
          <h1 className="hub-title">{title}</h1>
          <span className="hub-topbar-user">{user?.displayName || user?.username}</span>
        </header>

        <div className="hub-content">
          {view === 'dashboard' && <AdminDashboard stats={stats} onGo={go} />}
          {view === 'catalog' && <AgentGrid embedded />}
          {view === 'manage' && <AgentsTab />}
          {view === 'requests' && <RequestsTab />}
          {view === 'access' && <AccessTab />}
        </div>
      </div>

      <AgentAssistant />
    </div>
  );
}

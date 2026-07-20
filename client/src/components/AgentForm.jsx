import { useState } from 'react';
import { api } from '../api.js';
import { STATUSES, TIERS } from '../constants.js';

function initialState(agent) {
  return {
    name: agent?.name || '',
    tagline: agent?.tagline || '',
    description: agent?.description || '',
    keyBenefits: (agent?.keyBenefits || []).map((b) => ({
      title: b.title || '',
      description: b.description || '',
    })),
    status: agent?.status || 'Active',
    tier: agent?.tier || 'Free',
    autonomyLevel: agent?.autonomyLevel || '',
    priority: agent?.priority ?? 0,
    industry: agent?.industry || '',
    techStacks: (agent?.techStacks || []).join(', '),
    smeEmail: agent?.smeEmail || '',
    icon: agent?.icon || '🤖',
    externalVideoUrl: agent?.externalVideoUrl || '',
    repoUrl: agent?.repoUrl || '',
  };
}

export default function AgentForm({ agent = null, onSaved, onCancel }) {
  const isEdit = Boolean(agent);
  const [form, setForm] = useState(() => initialState(agent));
  const [file, setFile] = useState(null);
  const [removeVideo, setRemoveVideo] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [saving, setSaving] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Key-benefit list editing
  const addBenefit = () =>
    setForm((f) => ({ ...f, keyBenefits: [...f.keyBenefits, { title: '', description: '' }] }));
  const updateBenefit = (i, key, val) =>
    setForm((f) => ({
      ...f,
      keyBenefits: f.keyBenefits.map((b, idx) => (idx === i ? { ...b, [key]: val } : b)),
    }));
  const removeBenefit = (i) =>
    setForm((f) => ({ ...f, keyBenefits: f.keyBenefits.filter((_, idx) => idx !== i) }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus({ type: '', msg: '' });

    const fd = new FormData();
    // keyBenefits is an array of objects — send it as JSON; everything else is a scalar.
    Object.entries(form).forEach(([k, v]) =>
      fd.append(k, k === 'keyBenefits' ? JSON.stringify(v) : v)
    );
    if (file) fd.append('video', file);
    if (isEdit && removeVideo) fd.append('removeVideo', 'true');

    try {
      const saved = isEdit
        ? await api.updateAgent(agent._id, fd)
        : await api.createAgent(fd);
      setStatus({ type: 'ok', msg: `Agent ${isEdit ? 'updated' : 'created'} ✓` });
      onSaved?.(saved);
    } catch (err) {
      setStatus({ type: 'err', msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-row">
        <div className="field">
          <label>Agent name *</label>
          <input className="input" value={form.name} onChange={update('name')} required />
        </div>
        <div className="field">
          <label>Icon (emoji)</label>
          <input className="input" value={form.icon} onChange={update('icon')} maxLength={4} />
        </div>
      </div>

      <div className="field">
        <label>Tagline (card sub-text)</label>
        <input className="input" value={form.tagline} onChange={update('tagline')} />
      </div>

      <div className="field">
        <label>Description (About)</label>
        <textarea className="textarea" value={form.description} onChange={update('description')} />
      </div>

      <div className="field">
        <label>Key benefits</label>
        <div className="benefit-editor">
          {form.keyBenefits.length === 0 && (
            <p className="sub">No benefits yet — add a few titled points that describe the value of this agent.</p>
          )}
          {form.keyBenefits.map((b, i) => (
            <div className="benefit-row" key={i}>
              <div className="benefit-row-head">
                <input
                  className="input"
                  placeholder="Benefit title (e.g. Catches problems early)"
                  value={b.title}
                  onChange={(e) => updateBenefit(i, 'title', e.target.value)}
                />
                <button type="button" className="btn btn-danger btn-sm" onClick={() => removeBenefit(i)}>
                  Remove
                </button>
              </div>
              <textarea
                className="textarea"
                placeholder="Short supporting line for this benefit"
                value={b.description}
                onChange={(e) => updateBenefit(i, 'description', e.target.value)}
              />
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={addBenefit}>
            ＋ Add benefit
          </button>
        </div>
      </div>


      <div className="form-row">
        <div className="field">
          <label>Status</label>
          <select className="input" value={form.status} onChange={update('status')}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Access tier</label>
          <select className="input" value={form.tier} onChange={update('tier')}>
            {TIERS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label>Priority (higher shows first)</label>
          <input
            className="input"
            type="number"
            value={form.priority}
            onChange={update('priority')}
          />
        </div>
        <div className="field">
          <label>Autonomy level</label>
          <select className="input" value={form.autonomyLevel} onChange={update('autonomyLevel')}>
            <option value="">Not assessed</option>
            <option value="L1">L1 — Assistive (human-driven)</option>
            <option value="L2">L2 — Supervised (human approves actions)</option>
            <option value="L3">L3 — Conditional (acts, human on exceptions)</option>
            <option value="L4">L4 — High (autonomous within bounds)</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label>Industry</label>
          <input className="input" value={form.industry} onChange={update('industry')} />
        </div>
        <div className="field">
          <label>SME email (Connect SME)</label>
          <input className="input" type="email" value={form.smeEmail} onChange={update('smeEmail')} />
        </div>
      </div>

      <div className="field">
        <label>Tech stacks (comma separated)</label>
        <input
          className="input"
          value={form.techStacks}
          onChange={update('techStacks')}
          placeholder="GenAI, Python, React"
        />
      </div>

      <div className="field">
        <label>Demo video — upload a file</label>
        <input
          className="file-input"
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        {isEdit && agent.videoFileId && (
          <label style={{ fontWeight: 400, marginTop: 4 }}>
            <input
              type="checkbox"
              checked={removeVideo}
              onChange={(e) => setRemoveVideo(e.target.checked)}
            />{' '}
            Remove the current uploaded video
          </label>
        )}
      </div>

      <div className="field">
        <label>…or paste an external video URL (YouTube etc.)</label>
        <input
          className="input"
          value={form.externalVideoUrl}
          onChange={update('externalVideoUrl')}
          placeholder="https://www.youtube.com/watch?v=…"
        />
      </div>

      <div className="field">
        <label>Repository URL (optional)</label>
        <input
          className="input"
          value={form.repoUrl}
          onChange={update('repoUrl')}
          placeholder="https://github.com/…"
        />
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create agent'}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        {status.msg && <span className={`note ${status.type}`}>{status.msg}</span>}
      </div>
    </form>
  );
}

import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const EMPTY = { agentName: '', useCase: '', description: '', repoUrl: '' };

// Per-file size limits (MB). Kept below the server's 200 MB cap so the browser
// never resets mid-upload — instead we show a clear message before sending.
const LIMITS = {
  video: { max: 150, label: 'video' },
  md: { max: 10, label: 'documentation file' },
  code: { max: 50, label: 'code / file' },
};

// Returns an array of human-readable messages for any file over its limit.
function oversizedFiles(files) {
  const errs = [];
  for (const kind of Object.keys(LIMITS)) {
    const { max, label } = LIMITS[kind];
    for (const f of files[kind] || []) {
      const mb = f.size / (1024 * 1024);
      if (mb > max) errs.push(`“${f.name}” is ${mb.toFixed(1)} MB — over the ${max} MB ${label} limit`);
    }
  }
  return errs;
}

export default function RequestForm() {
  const { isAuthed, user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [benefits, setBenefits] = useState([]);
  const [files, setFiles] = useState({ md: [], video: [], code: [] });
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [submitting, setSubmitting] = useState(false);

  // Users can only pitch an idea; associates/admins submit a full agent with docs.
  const isIdea = (user?.role || 'user') === 'user';

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const addBenefit = () => setBenefits((b) => [...b, { title: '', description: '' }]);
  const updateBenefit = (i, k, v) =>
    setBenefits((b) => b.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));
  const removeBenefit = (i) => setBenefits((b) => b.filter((_, idx) => idx !== i));
  const onFiles = (kind) => (e) =>
    setFiles((f) => ({ ...f, [kind]: Array.from(e.target.files || []) }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.agentName.trim()) {
      setStatus({ type: 'err', msg: isIdea ? 'Please enter an idea title.' : 'Please enter the agent name.' });
      return;
    }
    if (!isIdea) {
      const tooBig = oversizedFiles(files);
      if (tooBig.length) {
        setStatus({ type: 'err', msg: `${tooBig.join('. ')}. Please attach a smaller file.` });
        return;
      }
    }
    setSubmitting(true);
    setStatus({ type: '', msg: '' });
    try {
      const fd = new FormData();
      fd.append('agentName', form.agentName);
      fd.append('useCase', form.useCase);
      fd.append('description', form.description);
      if (!isIdea) {
        fd.append('repoUrl', form.repoUrl);
        fd.append('keyBenefits', JSON.stringify(benefits.filter((b) => b.title || b.description)));
        files.md.forEach((f) => fd.append('md', f));
        files.video.slice(0, 1).forEach((f) => fd.append('video', f));
        files.code.forEach((f) => fd.append('code', f));
      }

      await api.submitRequest(fd);
      setStatus({
        type: 'ok',
        msg: isIdea ? 'Idea submitted — thank you! The QEA team will review it.' : 'Submitted for admin review — thank you!',
      });
      setForm(EMPTY);
      setBenefits([]);
      setFiles({ md: [], video: [], code: [] });
      e.target.reset();
    } catch (err) {
      const msg =
        err.message === 'Failed to fetch'
          ? 'Submit failed — the server may be unavailable, or a file may be too large. Please try again.'
          : err.message;
      setStatus({ type: 'err', msg });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthed) {
    return <p className="note">Please sign in to submit.</p>;
  }

  return (
    <form className="form" onSubmit={submit}>
      <p className="note" style={{ opacity: 0.8 }}>
        {isIdea ? (
          <>Sharing an idea as <strong>{user?.displayName || user?.username}</strong>. The QEA team will review it — associates can then build it out.</>
        ) : (
          <>Submitting as <strong>{user?.displayName || user?.username}</strong> — an admin will review it.</>
        )}
      </p>

      <div className="field">
        <label>{isIdea ? 'Idea title *' : 'Agent name *'}</label>
        <input
          className="input"
          value={form.agentName}
          onChange={update('agentName')}
          placeholder={isIdea ? 'e.g. Auto-summarize release notes' : ''}
          required
        />
      </div>

      <div className="field">
        <label>{isIdea ? 'Problem it solves (optional)' : 'Use case / one-line summary'}</label>
        <input className="input" value={form.useCase} onChange={update('useCase')} />
      </div>

      <div className="field">
        <label>{isIdea ? 'Describe your idea' : 'Description'}</label>
        <textarea
          className="textarea"
          value={form.description}
          onChange={update('description')}
          placeholder={isIdea ? 'What should this agent do, and who would use it?' : ''}
        />
      </div>

      {/* Full-submission fields — associates & admins only */}
      {!isIdea && (
        <>
          <div className="field">
            <label>Key benefits</label>
            <div className="benefit-editor">
              {benefits.length === 0 && (
                <p className="sub">Add a few titled points that describe the value of this agent.</p>
              )}
              {benefits.map((b, i) => (
                <div className="benefit-row" key={i}>
                  <div className="benefit-row-head">
                    <input
                      className="input"
                      placeholder="Benefit title (e.g. Saves hours of manual work)"
                      value={b.title}
                      onChange={(e) => updateBenefit(i, 'title', e.target.value)}
                    />
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeBenefit(i)}>
                      Remove
                    </button>
                  </div>
                  <textarea
                    className="textarea"
                    placeholder="Short supporting line"
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

          <div className="field">
            <label>Documentation (.md files)</label>
            <input className="file-input" type="file" accept=".md,.markdown,text/markdown,text/plain" multiple onChange={onFiles('md')} />
            <small className="sub">Max {LIMITS.md.max} MB each.</small>
          </div>

          <div className="field">
            <label>Demo video</label>
            <input className="file-input" type="file" accept="video/*" onChange={onFiles('video')} />
            <small className="sub">Max {LIMITS.video.max} MB. For a larger video, add a repository or hosting link below.</small>
          </div>

          <div className="field">
            <label>Code / files (zip or any file)</label>
            <input className="file-input" type="file" multiple onChange={onFiles('code')} />
            <small className="sub">Max {LIMITS.code.max} MB each.</small>
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
        </>
      )}

      <div className="form-actions">
        <button className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Submitting…' : isIdea ? 'Submit idea' : 'Submit for review'}
        </button>
        {status.msg && <span className={`note ${status.type}`}>{status.msg}</span>}
      </div>
    </form>
  );
}

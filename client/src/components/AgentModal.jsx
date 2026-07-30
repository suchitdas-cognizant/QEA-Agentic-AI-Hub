import { useEffect, useState } from 'react';
import { api, videoUrl } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

// Convert well-known video URLs into an embeddable form. Returns null when the
// link can't be safely iframed (most sites block it via X-Frame-Options) — the
// caller then shows a "watch in a new tab" link instead.
function toEmbed(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = u.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === 'youtu.be') return `https://www.youtube.com/embed${u.pathname}`;
    if (host === 'vimeo.com') return `https://player.vimeo.com/video${u.pathname}`;
    return null;
  } catch {
    return null;
  }
}

function VideoPlayer({ agent }) {
  if (agent.videoFileId) {
    return (
      <div className="video-wrap">
        <video src={videoUrl(agent.videoFileId)} controls preload="metadata" />
      </div>
    );
  }
  if (agent.externalVideoUrl) {
    const embed = toEmbed(agent.externalVideoUrl);
    if (embed) {
      return (
        <div className="video-wrap">
          <iframe
            src={embed}
            title={`${agent.name} demo`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
    // Not embeddable — offer a redirect to the hosted video.
    return (
      <div className="video-wrap">
        <a className="video-link-card" href={agent.externalVideoUrl} target="_blank" rel="noopener noreferrer">
          <span className="video-link-play">▶</span>
          <span>
            Watch the demo video
            <small>Opens {(() => { try { return new URL(agent.externalVideoUrl).hostname.replace(/^www\./, ''); } catch { return 'the link'; } })()} in a new tab ↗</small>
          </span>
        </a>
      </div>
    );
  }
  return (
    <div className="video-wrap">
      <div className="video-placeholder">
        ▶ Demo video coming soon
        <br />
        <small>An admin can upload one from the Admin page.</small>
      </div>
    </div>
  );
}

// Read-only when no onChange is passed; interactive star picker when it is.
function Stars({ value = 0, onChange }) {
  const [hover, setHover] = useState(0);
  const interactive = typeof onChange === 'function';
  return (
    <div className={`stars${interactive ? ' stars-input' : ''}`} role="img" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) =>
        interactive ? (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            {(hover || value) >= n ? '★' : '☆'}
          </button>
        ) : (
          <span key={n} aria-hidden="true">{value >= n ? '★' : '☆'}</span>
        )
      )}
    </div>
  );
}

function formatDate(d) {
  try {
    return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function AgentModal({ agent, onClose, onRated }) {
  const { role } = useAuth();
  const canReview = role === 'admin' || role === 'associate';
  const [feedback, setFeedback] = useState([]);
  const [avg, setAvg] = useState({ rating: agent.rating || 0, count: agent.ratingCount || 0 });
  const [form, setForm] = useState({ rating: 0, name: '', comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Load existing feedback for this agent.
  useEffect(() => {
    api.getFeedback(agent._id).then(setFeedback).catch(() => {});
  }, [agent._id]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.rating) {
      setMsg({ type: 'err', text: 'Please pick a star rating first.' });
      return;
    }
    setSubmitting(true);
    setMsg({ type: '', text: '' });
    try {
      const res = await api.submitFeedback(agent._id, form);
      setAvg({ rating: res.rating, count: res.ratingCount });
      onRated?.(res.rating, res.ratingCount);
      setFeedback((list) => [res.feedback, ...list]);
      setForm({ rating: 0, name: '', comment: '' });
      setMsg({ type: 'ok', text: 'Thanks for your feedback!' });
    } catch (err) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const shortId = agent._id ? agent._id.slice(-6).toUpperCase() : '—';

  return (
    <div className="overlay" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <button className="drawer-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <p className="drawer-brand">Cognizant</p>
        <h2>{agent.name}</h2>
        <div className="drawer-meta">
          {agent.tier === 'Premium' && <span className="tier-badge tier-premium">★ Premium</span>}
          <span className={`status-badge status-${(agent.status || 'Active').toLowerCase()}`}>
            <span className="status-dot" />
            {agent.status || 'Active'}
          </span>
          <span className="solution-id">Agent ID : {shortId}</span>
        </div>

        <div className="rating-inline">
          <Stars value={Math.round(avg.rating)} />
          <span>
            {avg.rating > 0
              ? `${avg.rating} / 5 · ${avg.count} review${avg.count !== 1 ? 's' : ''}`
              : 'No ratings yet'}
          </span>
        </div>

        <VideoPlayer agent={agent} />

        {agent.description && (
          <>
            <div className="drawer-section-title">About</div>
            <p style={{ whiteSpace: 'pre-line' }}>{agent.description}</p>
          </>
        )}

        {agent.keyBenefits?.length > 0 && (
          <>
            <div className="drawer-section-title">Key benefits</div>
            <ul className="benefits">
              {agent.keyBenefits.map((b, i) => (
                <li key={i}>
                  {b.title && <span className="benefit-title">{b.title}</span>}
                  {b.description && <span className="benefit-desc">{b.description}</span>}
                </li>
              ))}
            </ul>
          </>
        )}

        {agent.techStacks?.length > 0 && (
          <>
            <div className="drawer-section-title">Tech stack</div>
            <div className="tech-list">
              {agent.techStacks.map((t) => (
                <span className="tech-pill" key={t}>{t}</span>
              ))}
            </div>
          </>
        )}

        {agent.industry && (
          <>
            <div className="drawer-section-title">Industry</div>
            <p>{agent.industry}</p>
          </>
        )}

        {(agent.smeEmail || agent.repoUrl) && (
          <div className="drawer-actions">
            {agent.smeEmail && (
              <a
                className="btn btn-primary"
                href={`mailto:${agent.smeEmail}?subject=${encodeURIComponent(
                  `Connect SME — ${agent.name}`
                )}`}
              >
                ✉ Connect SME
              </a>
            )}
            {agent.repoUrl && (
              <a className="btn btn-ghost" href={agent.repoUrl} target="_blank" rel="noopener noreferrer">
                ⧉ View repository
              </a>
            )}
          </div>
        )}

        {/* ---------- Ratings & feedback ---------- */}
        <div className="drawer-section-title">Ratings &amp; feedback</div>

        <div className="feedback-summary">
          <b>{avg.rating > 0 ? avg.rating.toFixed(1) : '—'}</b>
          <div>
            <Stars value={Math.round(avg.rating)} />
            <span className="feedback-count">
              {avg.count} review{avg.count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {canReview && (
          <form className="feedback-form" onSubmit={submit}>
            <span className="fb-label">Your rating</span>
            <Stars value={form.rating} onChange={(n) => setForm((f) => ({ ...f, rating: n }))} />
            <input
              className="input"
              placeholder="Your name (optional)"
              value={form.name}
              maxLength={80}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <textarea
              className="textarea"
              placeholder="Share your experience with this agent…"
              value={form.comment}
              maxLength={1000}
              onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
            />
            <div className="fb-actions">
              <button className="btn btn-primary btn-sm" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit feedback'}
              </button>
              {msg.text && <span className={`note ${msg.type}`}>{msg.text}</span>}
            </div>
          </form>
        )}

        {feedback.length > 0 && (
          <ul className="feedback-list">
            {feedback.map((f) => (
              <li key={f._id}>
                <div className="fb-head">
                  <span className="fb-name">{f.name}</span>
                  <Stars value={f.rating} />
                  <span className="fb-date">{formatDate(f.createdAt)}</span>
                </div>
                {f.comment && <p className="fb-comment">{f.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

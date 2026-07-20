import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import CognizantLogo from '../components/CognizantLogo.jsx';

/* Reveal-on-scroll: adds `.in` to any element with `data-reveal` once it
   enters the viewport. One observer for the whole page. */
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

const CAPABILITIES = [
  {
    icon: '🧠',
    title: 'Reason & plan',
    body: 'Agents break down goals, plan multi-step work and adapt as context changes — not just single prompts.',
  },
  {
    icon: '🔗',
    title: 'Act across systems',
    body: 'Securely connect to your tools, data and APIs to actually get work done end-to-end.',
  },
  {
    icon: '🛡️',
    title: 'Governed & observable',
    body: 'Every action is traceable, permissioned and reviewable — enterprise trust by design.',
  },
  {
    icon: '⚡',
    title: 'Always on',
    body: 'Automate work 24/7, scaling from a single task to entire operational workflows.',
  },
];

// The real journey an agent takes through this hub.
const PROCESS = [
  {
    step: '01',
    title: 'Propose an agent',
    body: 'Any associate submits an agent from the hub — name, description, key benefits, plus documentation (.md), a demo video and the code or files.',
  },
  {
    step: '02',
    title: 'Admin review',
    body: 'An admin reviews the submission and its attachments, checks quality, and approves or sends it back. Nothing goes live without sign-off.',
  },
  {
    step: '03',
    title: 'Publish to the hub',
    body: 'Approved agents are published as live cards — with their demo video, benefits and SME contact — instantly discoverable by everyone.',
  },
  {
    step: '04',
    title: 'Discover, rate & connect',
    body: 'Teams find the right agent, watch the demo, read real feedback and reach the SME — or ask the built-in assistant which agent fits a task.',
  },
];

// Where agentic AI on the hub is heading.
const FUTURE = [
  {
    icon: '🤝',
    title: 'Agents that collaborate',
    body: 'Specialized agents will hand off to one another — one plans, another executes, a third verifies — orchestrated into complete workflows.',
  },
  {
    icon: '🧭',
    title: 'One goal, many steps',
    body: 'Describe an outcome in plain language and a lead agent assembles the right sub-agents to reach it, end to end.',
  },
  {
    icon: '📈',
    title: 'Self-improving from feedback',
    body: 'Ratings and real outcomes feed back in, so agents get measurably better with every run — quality that compounds.',
  },
  {
    icon: '🛡️',
    title: 'Governed autonomy',
    body: 'More independence, never less oversight — every action stays traceable, permissioned and human-approvable.',
  },
];

export default function Landing() {
  const { isAuthed, logout } = useAuth();
  const [count, setCount] = useState(null);
  const [activeCount, setActiveCount] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef(null);
  useScrollReveal();

  // Leaving the portal for the public landing ends the session — re-entering
  // the hub then requires signing in again.
  useEffect(() => {
    if (isAuthed) logout();
  }, [isAuthed, logout]);

  useEffect(() => {
    api.listAgents().then((a) => {
      setCount(a.length);
      setActiveCount(a.filter((x) => (x.status || 'Active') === 'Active').length);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="lp">
      {/* ---- Top nav ---- */}
      <header className={`lp-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="lp-container lp-nav-inner">
          <a className="lp-brand" href="#top">
            <CognizantLogo className="lp-brand-logo" />
          </a>
          <nav className="lp-nav-links">
            <a href="#capabilities">What are agents</a>
            <a href="#process">How it works</a>
            <a href="#future">The future</a>
          </nav>
          <div className="lp-nav-actions">
            <Link to="/login" className="lp-btn lp-btn-primary">Sign in</Link>
          </div>
        </div>
      </header>

      {/* ---- Hero ---- */}
      <section className="lp-hero" id="top" ref={heroRef}>
        <div className="lp-hero-bg" aria-hidden="true">
          <div className="lp-beam" />
          <span className="lp-orb lp-orb-1" />
          <span className="lp-orb lp-orb-2" />
          <span className="lp-orb lp-orb-3" />
          <div className="lp-grid-lines" />
        </div>

        <div className="lp-container lp-hero-inner">
          <span className="lp-eyebrow" data-reveal>
            <span className="lp-pulse" /> Cognizant · Quality Engineering &amp; Assurance
          </span>
          <h1 className="lp-hero-title" data-reveal>
            The enterprise home for
            <br />
            <span className="lp-grad">agentic AI</span>
          </h1>
          <p className="lp-hero-sub" data-reveal>
            Discover, review and adopt autonomous AI agents — submitted by teams,
            approved by admins, and published to one governed hub.
          </p>
          <div className="lp-hero-cta" data-reveal>
            <Link to="/hub" className="lp-btn lp-btn-primary lp-btn-lg">
              Explore the Hub →
            </Link>
            <a href="#process" className="lp-btn lp-btn-ghost lp-btn-lg">
              How it works
            </a>
          </div>

          <ul className="lp-hero-tags" data-reveal>
            <li>Reason &amp; plan</li>
            <li>Act across systems</li>
            <li>Governed &amp; observable</li>
            <li>Always on</li>
          </ul>

          <div className="lp-hero-stats" data-reveal>
            <div className="lp-stat">
              <b>{count === null ? '—' : `${count}+`}</b>
              <span>Agents live</span>
            </div>
            <div className="lp-stat">
              <b>{activeCount === null ? '—' : activeCount}</b>
              <span>Active agents</span>
            </div>
            <div className="lp-stat">
              <b>100%</b>
              <span>Human-reviewed</span>
            </div>
            <div className="lp-stat">
              <b>24/7</b>
              <span>Automation</span>
            </div>
          </div>
        </div>

        <a className="lp-scroll" href="#capabilities" aria-label="Scroll down">
          <span />
        </a>
      </section>

      {/* ---- What are agents ---- */}
      <section className="lp-section" id="capabilities">
        <div className="lp-container">
          <div className="lp-section-head" data-reveal>
            <span className="lp-kicker">What are agents</span>
            <h2>Beyond chatbots — software that gets work done</h2>
            <p>
              Agentic AI moves from answering questions to completing outcomes. Here is
              what makes the agents in this hub different.
            </p>
          </div>
          <div className="lp-cap-grid">
            {CAPABILITIES.map((c, i) => (
              <article className="lp-cap-card" data-reveal style={{ '--d': `${i * 80}ms` }} key={c.title}>
                <span className="lp-cap-icon" aria-hidden="true">{c.icon}</span>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---- How it works (the real hub process) ---- */}
      <section className="lp-section lp-section-alt" id="process">
        <div className="lp-container">
          <div className="lp-section-head" data-reveal>
            <span className="lp-kicker">How it works</span>
            <h2>From idea to a live, governed agent</h2>
            <p>
              Every agent on the hub follows the same simple, human-approved path — so
              what you find here is trustworthy by the time it reaches you.
            </p>
          </div>
          <div className="lp-timeline" data-reveal>
            <span className="lp-tl-track" aria-hidden="true" />
            <span className="lp-tl-progress" aria-hidden="true" />
            {PROCESS.map((s, i) => (
              <div className="lp-tl-step" style={{ '--i': i }} key={s.step}>
                <span className="lp-tl-dot">{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
          <div className="lp-section-cta" data-reveal>
            <Link to="/hub" className="lp-btn lp-btn-ghost lp-btn-lg">
              Submit an agent from the Hub →
            </Link>
          </div>
        </div>
      </section>

      {/* ---- The future ---- */}
      <section className="lp-section" id="future">
        <div className="lp-container">
          <div className="lp-section-head" data-reveal>
            <span className="lp-kicker">The road ahead</span>
            <h2>How agents will work next</h2>
            <p>
              Today agents automate tasks. Next, they orchestrate entire workflows —
              collaborating, self-improving, and staying fully under human governance.
            </p>
          </div>
          <div className="lp-cap-grid">
            {FUTURE.map((c, i) => (
              <article className="lp-cap-card" data-reveal style={{ '--d': `${i * 80}ms` }} key={c.title}>
                <span className="lp-cap-icon" aria-hidden="true">{c.icon}</span>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Final CTA ---- */}
      <section className="lp-cta">
        <div className="lp-container lp-cta-inner" data-reveal>
          <h2>Step into the Agentic Hub</h2>
          <p>Browse live agents, review them, and submit the next one your team needs.</p>
          <div className="lp-cta-actions">
            <Link to="/hub" className="lp-btn lp-btn-primary lp-btn-lg">Enter the Hub →</Link>
          </div>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div className="lp-brand">
            <CognizantLogo className="lp-brand-logo" />
          </div>
          <span className="lp-footer-legal">
            © 2026 Cognizant Technology Solutions. Internal use only.
          </span>
        </div>
      </footer>
    </div>
  );
}

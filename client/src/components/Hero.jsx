import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { CATEGORY_CODES } from '../constants.js';
import HeroVisual from './HeroVisual.jsx';

export default function Hero() {
  const [count, setCount] = useState(null);

  useEffect(() => {
    api.listAgents().then((a) => setCount(a.length)).catch(() => {});
  }, []);

  return (
    <section className="hero">
      <div className="hero-orbs" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="container hero-grid">
        <div className="hero-content">
          <p className="hero-eyebrow">Cognizant · QEA</p>
          <h1>
            QEA <span className="grad">Agentic AI</span> Hub
          </h1>
          <p className="hero-tagline">
            Reimagine business models &amp; operations with AI agents. Discover,
            explore and deploy intelligent agents automating work across the
            enterprise — from HR and retail to insurance, banking and legal.
          </p>

          <div className="hero-cta">
            <a className="btn btn-primary" href="#solutions">
              Explore agents →
            </a>
            <a className="btn btn-hero-ghost" href="#request">
              Request an agent
            </a>
          </div>

          <div className="hero-stats">
            <div className="stat">
              <b>{count === null ? '—' : count}</b>
              <span>AI agents</span>
            </div>
            <div className="stat">
              <b>{CATEGORY_CODES.length}</b>
              <span>Categories</span>
            </div>
            <div className="stat">
              <b>24/7</b>
              <span>Automation</span>
            </div>
          </div>
        </div>

        <HeroVisual />
      </div>

      <a className="hero-scroll" href="#solutions" aria-label="Scroll to agents">
        <span className="hero-scroll-dot" />
        Explore
      </a>
    </section>
  );
}

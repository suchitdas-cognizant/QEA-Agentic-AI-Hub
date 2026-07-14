// Futuristic "agentic AI" hero visual: a floating robot head built in SVG,
// wrapped in rotating orbit rings + floating capability chips. Pure vector +
// CSS animation — crisp at any size, no external image assets.
export default function HeroVisual() {
  return (
    <div className="hero-visual" aria-hidden="true">
      <div className="hero-halo" />

      {/* rotating orbit rings, each carrying a glowing node */}
      <div className="orbit orbit-1"><span className="node" /></div>
      <div className="orbit orbit-2"><span className="node" /></div>
      <div className="orbit orbit-3"><span className="node" /></div>

      {/* floating capability chips */}
      <span className="hero-chip chip-1">⚡ Automate</span>
      <span className="hero-chip chip-2">🧠 Reason</span>
      <span className="hero-chip chip-3">✅ Resolve</span>

      <svg className="robot" viewBox="0 0 300 300" role="img" aria-label="AI agent robot">
        <defs>
          <linearGradient id="headGrad" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0" stopColor="#1b2f63" />
            <stop offset="1" stopColor="#0a1430" />
          </linearGradient>
          <linearGradient id="edgeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3aa0ff" />
            <stop offset="0.5" stopColor="#7b5cff" />
            <stop offset="1" stopColor="#21d4fd" />
          </linearGradient>
          <radialGradient id="eyeGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#d8fbff" />
            <stop offset="0.5" stopColor="#37e0ff" />
            <stop offset="1" stopColor="#1aa6e6" />
          </radialGradient>
          <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* soft platform glow under the bot */}
        <ellipse cx="150" cy="252" rx="86" ry="14" fill="#1b6bf0" opacity="0.22" />

        <g className="robot-head">
          {/* antenna */}
          <line x1="150" y1="70" x2="150" y2="50" stroke="url(#edgeGrad)" strokeWidth="4" strokeLinecap="round" />
          <circle className="robot-antenna" cx="150" cy="44" r="6" fill="url(#eyeGlow)" filter="url(#glow)" />

          {/* ears / side modules */}
          <rect x="72" y="120" width="13" height="40" rx="6" fill="#0e1f45" stroke="url(#edgeGrad)" strokeWidth="1.5" />
          <rect x="215" y="120" width="13" height="40" rx="6" fill="#0e1f45" stroke="url(#edgeGrad)" strokeWidth="1.5" />

          {/* head shell */}
          <rect x="84" y="76" width="132" height="126" rx="34" fill="url(#headGrad)" stroke="url(#edgeGrad)" strokeWidth="2" />
          {/* top sheen */}
          <rect x="98" y="86" width="104" height="20" rx="10" fill="#ffffff" opacity="0.05" />

          {/* visor */}
          <rect x="100" y="104" width="100" height="62" rx="26" fill="#060f24" stroke="rgba(120,160,255,0.35)" strokeWidth="1.5" />

          {/* eyes */}
          <rect className="robot-eye" x="122" y="120" width="22" height="28" rx="11" fill="url(#eyeGlow)" filter="url(#glow)" />
          <rect className="robot-eye eye-2" x="156" y="120" width="22" height="28" rx="11" fill="url(#eyeGlow)" filter="url(#glow)" />

          {/* mouth — animated equalizer bars */}
          <g fill="url(#eyeGlow)">
            <rect className="robot-bar" x="129" y="176" width="6" height="12" rx="3" />
            <rect className="robot-bar" x="141" y="176" width="6" height="12" rx="3" />
            <rect className="robot-bar" x="153" y="176" width="6" height="12" rx="3" />
            <rect className="robot-bar" x="165" y="176" width="6" height="12" rx="3" />
          </g>

          {/* neck + chest core */}
          <rect x="138" y="200" width="24" height="20" fill="#0e1f45" />
          <path d="M104 256 Q104 220 150 218 Q196 220 196 256 Z" fill="url(#headGrad)" stroke="url(#edgeGrad)" strokeWidth="2" />
          <circle className="robot-core" cx="150" cy="240" r="9" fill="url(#eyeGlow)" filter="url(#glow)" />
        </g>
      </svg>
    </div>
  );
}

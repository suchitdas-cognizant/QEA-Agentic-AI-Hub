/* Cognizant QE Agentic Hub logo mark — an "agentic network" hexagon:
   a central node linked to three outer nodes, rendered on the brand tile. */
export default function BrandMark({ className = '' }) {
  return (
    <span className={className} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
        <path
          d="M12 2.6 20.1 7.3 V16.7 L12 21.4 L3.9 16.7 V7.3 Z"
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <g stroke="rgba(255,255,255,0.9)" strokeWidth="1.3">
          <line x1="12" y1="12" x2="12" y2="3.4" />
          <line x1="12" y1="12" x2="19.4" y2="16.3" />
          <line x1="12" y1="12" x2="4.6" y2="16.3" />
        </g>
        <circle cx="12" cy="12" r="2.4" fill="#fff" />
        <circle cx="12" cy="3.4" r="1.5" fill="#fff" />
        <circle cx="19.4" cy="16.3" r="1.5" fill="#fff" />
        <circle cx="4.6" cy="16.3" r="1.5" fill="#fff" />
      </svg>
    </span>
  );
}

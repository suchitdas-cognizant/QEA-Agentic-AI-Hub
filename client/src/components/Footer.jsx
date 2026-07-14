import RequestForm from './RequestForm.jsx';

export default function Footer({ queriesEmail }) {
  const year = 2026;
  return (
    <>
      {/* CTA banner — leads into the request form */}
      <section className="cta">
        <div className="container cta-inner">
          <h2>
            Want a new agent on the dashboard? Tell us about it and our team will
            take it forward.
          </h2>
          <a href="#request" className="btn btn-light">
            Request an Agent ↓
          </a>
        </div>
      </section>

      <footer className="footer" id="request">
        <div className="container">
          <div className="footer-grid">
            <div>
              <div className="footer-brand">QEA Agentic AI Hub</div>
              <h3 style={{ marginTop: 16 }}>Request a new agent</h3>
              <p>
                Have an idea for an AI agent that should live on this dashboard?
                Fill in the form and the team will review your request.
              </p>
              {queriesEmail && (
                <p className="queries">
                  ✉ For any queries, write to{' '}
                  <a href={`mailto:${queriesEmail}`}>{queriesEmail}</a>
                </p>
              )}
            </div>
            <div>
              <RequestForm />
            </div>
          </div>

          <div className="footer-bottom">
            <span>© {year} Cognizant · QEA Agentic AI Hub</span>
            <span>Intuitive Operations &amp; Automation</span>
          </div>
        </div>
      </footer>
    </>
  );
}

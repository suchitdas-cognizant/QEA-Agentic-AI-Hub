import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

/* Floating "Agent Assistant" — grounded entirely in the platform's own agent
   database (via POST /api/assistant). It reports how many agents exist, gives
   analysis, and when asked about a task tells the user which agent to use. */

const GREETING = {
  role: 'bot',
  text: "Hi! I'm your Agent Assistant. I only know the agents on this platform — ask me how many there are, for an analysis, or which agent to use for a task.",
};

const SUGGESTIONS = [
  'How many agents are there?',
  'Give me an analysis of the agents',
  'Which agent generates test cases?',
];

function AgentMatch({ agent }) {
  return (
    <div className="asst-agent">
      <span className="asst-agent-icon" aria-hidden="true">{agent.icon || '🤖'}</span>
      <div className="asst-agent-body">
        <b>{agent.name}</b>
        {agent.tagline && <span className="asst-agent-tag">{agent.tagline}</span>}
        <div className="asst-agent-meta">
          {agent.stage && <span>{agent.stage}</span>}
          {agent.status && <span>{agent.status}</span>}
          {agent.ratingCount > 0 && <span>{agent.rating.toFixed(1)}★</span>}
        </div>
        {agent.smeEmail && (
          <a
            className="asst-agent-sme"
            href={`mailto:${agent.smeEmail}?subject=${encodeURIComponent(`Query — ${agent.name}`)}`}
          >
            ✉ Connect SME
          </a>
        )}
      </div>
    </div>
  );
}

export default function AgentAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy, open]);

  // Refocus the input whenever the panel opens and after each reply finishes,
  // so the next message can be typed immediately.
  useEffect(() => {
    if (open && !busy) inputRef.current?.focus();
  }, [open, busy]);

  const send = async (text) => {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: message }]);
    setBusy(true);
    try {
      const data = await api.askAssistant(message);
      setMessages((m) => [
        ...m,
        { role: 'bot', text: data.reply || 'No answer returned.', matches: data.matches || [] },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: 'bot',
          text: "I couldn't reach the platform right now. Please make sure the API is running and try again.",
          error: true,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    send();
  };

  return (
    <>
      <button
        className={`asst-fab ${open ? 'hidden' : ''}`}
        onClick={() => setOpen(true)}
        aria-label="Open Agent Assistant"
        type="button"
      >
        <span className="asst-fab-icon" aria-hidden="true">✦</span>
        Ask the Assistant
      </button>

      <div className={`asst-panel ${open ? 'open' : ''}`} role="dialog" aria-label="Agent Assistant">
        <header className="asst-head">
          <div className="asst-head-title">
            <span className="asst-avatar" aria-hidden="true">✦</span>
            <div>
              <b>Agent Assistant</b>
              <small>Grounded in this platform's agents</small>
            </div>
          </div>
          <button className="asst-close" onClick={() => setOpen(false)} aria-label="Close" type="button">
            ✕
          </button>
        </header>

        <div className="asst-body" ref={scrollRef}>
          {messages.map((m, i) => (
            <div key={i} className="asst-turn">
              <div className={`asst-msg ${m.role} ${m.error ? 'error' : ''}`}>{m.text}</div>
              {m.matches && m.matches.length > 0 && (
                <div className="asst-agents">
                  {m.matches.map((a) => <AgentMatch key={a.id} agent={a} />)}
                </div>
              )}
            </div>
          ))}
          {busy && (
            <div className="asst-msg bot">
              <span className="asst-typing"><span /><span /><span /></span>
            </div>
          )}

          {messages.length === 1 && !busy && (
            <div className="asst-suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="asst-chip" onClick={() => send(s)} type="button">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <form className="asst-input" onSubmit={onSubmit}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your task…"
            aria-label="Message the Agent Assistant"
          />
          <button className="asst-send" disabled={busy || !input.trim()} aria-label="Send" type="submit">
            ↑
          </button>
        </form>
      </div>
    </>
  );
}

import express from 'express';
import Agent from '../models/Agent.js';

const router = express.Router();

// Words that carry no signal for matching an agent to a task.
const STOPWORDS = new Set([
  'the', 'a', 'an', 'to', 'of', 'for', 'and', 'or', 'in', 'on', 'is', 'are',
  'do', 'does', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'it', 'that',
  'this', 'with', 'can', 'could', 'should', 'would', 'need', 'needs', 'want',
  'help', 'please', 'which', 'what', 'who', 'how', 'there', 'any', 'some',
  'agent', 'agents', 'use', 'using', 'find', 'looking', 'look', 'get', 'have',
  'has', 'about', 'tell', 'show', 'give', 'me', 'am', 'be', 'from', 'by',
]);

const tokenize = (text = '') =>
  (text.toLowerCase().match(/[a-z0-9]+/g) || []).filter((t) => t.length > 1);

const keywords = (text) => tokenize(text).filter((t) => !STOPWORDS.has(t));

// Count how many of `tokens` appear in `field` (as a lowercased haystack).
function hits(tokens, field) {
  if (!field) return 0;
  const hay = String(field).toLowerCase();
  let n = 0;
  for (const t of tokens) if (hay.includes(t)) n += 1;
  return n;
}

// Score one agent against the query tokens. Name/tagline/tech weigh most.
function scoreAgent(agent, tokens) {
  const tech = (agent.techStacks || []).join(' ');
  const benefits = (agent.keyBenefits || [])
    .map((b) => `${b.title} ${b.description}`)
    .join(' ');
  return (
    hits(tokens, agent.name) * 6 +
    hits(tokens, agent.tagline) * 4 +
    hits(tokens, tech) * 3 +
    hits(tokens, agent.industry) * 3 +
    hits(tokens, agent.description) * 2 +
    hits(tokens, benefits) * 1
  );
}

const ANALYSIS_RE =
  /(how many|how much|\btotal\b|\bcount\b|number of|no of|overview|summary|analys|analyz|analytic|\bstats?\b|statistic|breakdown|all agents|list agents|list the agents|what agents)/i;
const GREETING_RE = /^\s*(hi|hello|hey|yo|help|what can you do)\b/i;

// Words that signal "analysis" intent — stripped before matching a specific
// agent, so "analysis"/"overview" alone don't accidentally match an agent.
const ANALYSIS_WORDS = new Set([
  'analysis', 'analyse', 'analyze', 'analytics', 'analytic', 'overview', 'summary',
  'summarise', 'summarize', 'details', 'detail', 'profile', 'breakdown', 'stats',
  'statistics', 'statistic', 'info', 'information', 'report', 'insight', 'insights',
  'describe', 'explain', 'define', 'definition', 'purpose',
]);

// "what is / who is / tell me about / describe / explain <agent>" — an
// info request about a named agent (answered with that agent's analysis).
const INFO_RE = /\b(what|whats|what's|who|about|describe|explain|define|definition|purpose)\b/i;

// A detailed, single-agent profile ("analysis of <agent>").
function agentAnalysis(a) {
  const lines = [`${a.name} — ${a.status || 'Active'}${a.industry ? ` · ${a.industry}` : ''}`];
  if (a.tagline) lines.push(a.tagline);
  if (a.description) lines.push('', a.description);
  if (a.techStacks?.length) lines.push('', `Tech stack: ${a.techStacks.join(', ')}`);
  if (a.keyBenefits?.length) {
    lines.push('', 'Key benefits:');
    a.keyBenefits.forEach((b) => lines.push(`• ${b.title}${b.description ? ` — ${b.description}` : ''}`));
  }
  lines.push(
    '',
    a.ratingCount > 0
      ? `Rating: ${a.rating.toFixed(1)}★ from ${a.ratingCount} review${a.ratingCount !== 1 ? 's' : ''}.`
      : 'No ratings yet.'
  );
  return lines.join('\n');
}

function tally(items, key) {
  const out = {};
  for (const it of items) {
    const v = (it[key] || '').toString().trim();
    if (!v) continue;
    out[v] = (out[v] || 0) + 1;
  }
  return out;
}

const fmtTally = (obj) =>
  Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} (${v})`)
    .join(', ');

// Trim an agent doc to just what the widget needs.
const publicAgent = (a) => ({
  id: a._id,
  name: a.name,
  tagline: a.tagline,
  stage: a.stage,
  status: a.status,
  industry: a.industry,
  techStacks: a.techStacks || [],
  rating: a.rating,
  ratingCount: a.ratingCount,
  smeEmail: a.smeEmail,
  icon: a.icon,
});

// POST /api/assistant  — grounded entirely in the platform's own agents.
router.post('/', async (req, res) => {
  const message = (req.body?.message || '').trim();
  const agents = await Agent.find().lean();
  const total = agents.length;

  if (!message || GREETING_RE.test(message)) {
    return res.json({
      reply:
        `Hi! I can help you find the right agent. There ${total === 1 ? 'is' : 'are'} ` +
        `currently ${total} agent${total === 1 ? '' : 's'} on the platform. ` +
        `Ask me things like “how many agents are there?”, “give me an analysis”, ` +
        `or “is there an agent to generate test cases?”`,
      matches: [],
      meta: { total },
    });
  }

  // Does the message clearly name one specific agent? (analysis words stripped
  // so "analysis"/"describe" etc. don't count toward the match.)
  const focus = keywords(message).filter((t) => !ANALYSIS_WORDS.has(t));
  const ranked = focus.length
    ? agents
        .map((a) => ({ a, score: scoreAgent(a, focus) }))
        .filter((x) => x.score > 0)
        .sort((x, y) => y.score - x.score)
    : [];
  const namedAgent = ranked[0] && ranked[0].score >= 6 ? ranked[0].a : null;

  // "analysis of <agent>", "what is <agent>", "tell me about/describe/explain <agent>"
  // -> a detailed profile of that specific agent.
  if (namedAgent && (ANALYSIS_RE.test(message) || INFO_RE.test(message))) {
    return res.json({ reply: agentAnalysis(namedAgent), matches: [publicAgent(namedAgent)], meta: { total } });
  }

  // --- Analysis / count intent (platform-wide) ---------------------------
  if (ANALYSIS_RE.test(message)) {
    if (total === 0) {
      return res.json({ reply: 'There are no agents on the platform yet.', matches: [], meta: { total } });
    }

    // A platform-wide analysis — describe the catalog only. It does
    // NOT single out an agent; recommendations happen only when the user asks
    // "which agent should I use for <task>".
    const byStatus = tally(agents, 'status');
    const byIndustry = tally(agents, 'industry');

    const lines = [
      `There ${total === 1 ? 'is' : 'are'} ${total} agent${total === 1 ? '' : 's'} on the platform.`,
      `• Status: ${fmtTally(byStatus) || '—'}`,
    ];
    if (Object.keys(byIndustry).length) lines.push(`• Industry: ${fmtTally(byIndustry)}`);
    lines.push('Tell me the task you want to solve and I’ll point you to the right agent.');

    // A count/analysis question isn't about one agent — return the summary text
    // only, with NO agent cards (the top-rated names are already named in the text).
    return res.json({ reply: lines.join('\n'), matches: [], meta: { total } });
  }

  // --- Recommendation / existence intent ---------------------------------
  const tokens = keywords(message);
  if (tokens.length === 0) {
    return res.json({
      reply: `Could you describe the task in a few words? I’ll check the ${total} agents on the platform for a match.`,
      matches: [],
      meta: { total },
    });
  }

  const scored = agents
    .map((a) => ({ a, score: scoreAgent(a, tokens) }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score);

  if (scored.length === 0) {
    return res.json({
      reply:
        `I couldn’t find an agent for that among the ${total} on the platform. ` +
        `If you need it, submit it under “Request an agent” and the team will review it.`,
      matches: [],
      meta: { total, found: false },
    });
  }

  // Keep the clear winners: the top score, plus any within 60% of it (max 3).
  const best = scored[0].score;
  const picks = scored.filter((x) => x.score >= best * 0.6).slice(0, 3);

  const reply =
    picks.length === 1
      ? `Yes — for that, use ${picks[0].a.name}.`
      : `Yes — a few agents fit. The best match is ${picks[0].a.name}:`;

  return res.json({
    reply,
    matches: picks.map((x) => publicAgent(x.a)),
    meta: { total, found: true },
  });
});

export default router;

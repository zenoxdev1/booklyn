// Booklyn AI quiz pipeline (pure logic, no Cloudflare imports, so it can be tested in Node).
// Steps: 1 analyse the material  2 write candidate questions  3 check every candidate (rules + a second, strict AI pass)
// 4 if too few survive, write replacements once. Weak questions are dropped, never shown.

export const MAX_MATERIAL = 6500;

export function norm(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9äöüß]+/g, ' ').trim();
}
// True when `quote` (copied from the material) really occurs in it. Whitespace, case and punctuation are ignored.
export function quoteInMaterial(quote, material) {
  const q = norm(quote);
  if (q.length < 20) return false;
  return norm(material).includes(q);
}
function words(s) { return norm(s).split(' ').filter((w) => w.length >= 4); }

export function extractJson(raw, open = '[', close = ']') {
  let data = raw;
  if (typeof raw === 'string') {
    const a = raw.indexOf(open), b = raw.lastIndexOf(close);
    if (a < 0 || b <= a) return null;
    try { data = JSON.parse(raw.slice(a, b + 1)); } catch { return null; }
  }
  return data;
}

const BAD_OPTION = /^(all|none) of the above|^both\b|^(alle|keine) (der|oben)|^beide\b|^a and b\b|^a und b\b/i;
const REFERS_TO_TEXT = /\b(according to (the|this) (text|slide|slides|material|lecture|document|script|passage)|in (the|this) (text|slide|slides|passage|lecture|script)|laut (dem )?(text|skript|folie)|im (text|skript))\b/i;
const TRIVIA = /\b(on|which|what) (page|slide) (number )?\d+|\bwho (wrote|authored|presented)\b|\bwhat is the (title|name) of (the|this) (lecture|slide|chapter)\b/i;

// Rules every question must pass, whatever an AI says. `material` is the text the question is grounded in.
export function checkQuestion(c, material) {
  const q = String(c.q || '').trim();
  const o = Array.isArray(c.options) ? c.options.map((x) => String(x).trim()) : [];
  const a = Number(c.answer);
  if (q.length < 20 || q.length > 320) return 'question length';
  if (REFERS_TO_TEXT.test(q) || TRIVIA.test(q)) return 'refers to the document or asks trivia';
  if (o.length !== 4 || o.some((x) => x.length < 1 || x.length > 220)) return 'needs 4 options';
  if (new Set(o.map((x) => norm(x))).size !== 4) return 'duplicate options';
  if (o.some((x) => BAD_OPTION.test(x))) return 'all/none of the above';
  if (!Number.isInteger(a) || a < 0 || a > 3) return 'answer index';
  const right = o[a], others = o.filter((_, i) => i !== a);
  if (right.length >= 6 && norm(q).includes(norm(right))) return 'answer appears in the question';
  const maxOther = Math.max(...others.map((x) => x.length));
  if (right.length > 60 && right.length > 1.8 * maxOther) return 'correct option much longer than the others';
  if (!quoteInMaterial(c.quote, material)) return 'supporting quote not found in the material';
  const ws = words(right);
  if (ws.length >= 3) {
    const m = ' ' + norm(material) + ' ';
    const hit = ws.filter((w) => m.includes(' ' + w.slice(0, Math.max(4, w.length - 2)))).length;
    if (hit / ws.length < 0.4) return 'correct answer is not supported by the material';
  }
  const ex = String(c.explain || '').trim();
  if (ex.length < 12 || ex.length > 500) return 'explanation length';
  return '';
}

function sectionsToText(sections) {
  return sections.map((s) => (s.title ? '### ' + s.title + '\n' : '') + s.text).join('\n\n');
}

function analysePrompt(material) {
  return `Material from a university lecture. Parts are introduced by ### headings where the file has them.\n"""\n${material}\n"""\n\nBefore any question is written, analyse the material. Reply with one JSON object only:\n{"readable":true or false,"reason":"if the material is unreadable, garbled, or too incomplete to ask good questions: say why in one sentence","language":"en or de or other","subject":"subject area in a few words","concepts":[{"name":"","meaning":"one sentence","quote":"an exact quote copied from the material that supports it, at most 200 characters"}],"relations":["how two concepts relate, one sentence"],"objectives":["what a student should be able to do after this material"]}\nUse at most 8 concepts. Quotes must be copied exactly, never reworded.`;
}
function generatePrompt(material, analysis, n, avoid) {
  const concepts = (analysis.concepts || []).map((c) => `- ${c.name}: ${c.meaning}`).join('\n');
  const rel = (analysis.relations || []).slice(0, 5).map((r) => '- ' + r).join('\n');
  const obj = (analysis.objectives || []).slice(0, 4).map((r) => '- ' + r).join('\n');
  return `Subject: ${analysis.subject || 'unknown'}\nLanguage of the material: ${analysis.language || 'same as the material'}\nConcepts:\n${concepts}\nRelations:\n${rel || '-'}\nLearning objectives:\n${obj || '-'}\n\nMaterial:\n"""\n${material}\n"""\n\nWrite ${n} multiple-choice questions in the language of the material.\nRules:\n- Test understanding or application (why, how, which case fits, what follows), not single words or trivia (no page numbers, authors or dates unless they are the point).\n- Each question must make sense on its own, without the material in front of the student. Never write "according to the text" or "in the slide".\n- Exactly 4 options: one clearly correct, three plausible but wrong (typical misconceptions or neighbouring concepts). Similar length and style. Never "all of the above" or "none of the above".\n- The correct answer must be supported by the material. You may use subject knowledge to understand it, but never ask about something the material does not support.\n- "quote": copy the sentence from the material that supports the correct answer, exactly, at most 220 characters.\n- "explain": one or two sentences on why the answer is right and, if useful, why a tempting wrong option is wrong.${avoid && avoid.length ? '\n- Avoid these problems from an earlier attempt: ' + avoid.slice(0, 5).join('; ') : ''}\nReply with a JSON array only: [{"q":"","options":["","","",""],"answer":0,"explain":"","quote":"","concept":""}]`;
}
function validatePrompt(material, cands) {
  const list = cands.map((c, i) => ({ id: i, q: c.q, options: c.options, answer: c.answer }));
  return `Material:\n"""\n${material}\n"""\n\nYou are a strict reviewer of study questions. Questions:\n${JSON.stringify(list)}\n\nFor each question check: (1) it is clear and understandable on its own, (2) exactly one option is correct according to the material, (3) the other three are plausible but clearly wrong, (4) it is factually correct, (5) it tests understanding rather than trivia. Be strict: when in doubt, reject.\nReply with a JSON array only: [{"id":0,"ok":true or false,"issue":"short reason if not ok"}]`;
}

async function callJson(ai, model, system, user, maxTokens, temperature, open, close) {
  const res = await ai.run(model, { messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: maxTokens, temperature });
  return extractJson(res && (res.response ?? res), open, close);
}
const SYS = 'You are a careful university teaching assistant. You output only valid JSON.';

export function cleanAnalysis(raw, material) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const concepts = (Array.isArray(raw.concepts) ? raw.concepts : [])
    .map((c) => ({ name: String(c && c.name || '').trim().slice(0, 80), meaning: String(c && c.meaning || '').trim().slice(0, 240), quote: String(c && c.quote || '') }))
    .filter((c) => c.name && c.meaning && quoteInMaterial(c.quote, material))
    .slice(0, 8);
  return {
    readable: raw.readable !== false,
    reason: String(raw.reason || '').slice(0, 240),
    language: String(raw.language || '').slice(0, 20),
    subject: String(raw.subject || '').slice(0, 120),
    concepts,
    relations: (Array.isArray(raw.relations) ? raw.relations : []).map((x) => String(x).slice(0, 240)).slice(0, 6),
    objectives: (Array.isArray(raw.objectives) ? raw.objectives : []).map((x) => String(x).slice(0, 240)).slice(0, 5),
  };
}

function shuffleOptions(c) {
  const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
  return { o: order.map((i) => c.options[i].trim()), a: order.indexOf(Number(c.answer)) };
}

// Runs the whole pipeline. ai = { run(model, input) }. Returns { questions, rejected, reason, subject }.
export async function runPipeline({ ai, model, sections, n = 5 }) {
  const material = sectionsToText(sections).slice(0, MAX_MATERIAL);
  const title = (sections[0] && sections[0].title) || '';
  const ref = (sections[0] && sections[0].ref) || '';
  const out = { questions: [], rejected: 0, reason: '', subject: '' };

  let analysis = null;
  try { analysis = cleanAnalysis(await callJson(ai, model, SYS, analysePrompt(material), 900, 0.1, '{', '}'), material); } catch { analysis = null; }
  if (!analysis) { out.reason = 'The analysis step failed.'; return out; }
  out.subject = analysis.subject;
  if (!analysis.readable) { out.reason = analysis.reason || 'The material could not be read well enough.'; return out; }
  if (analysis.concepts.length < 2) { out.reason = analysis.reason || 'This part of the material is too short or unclear to ask good questions.'; return out; }

  const seen = new Set();
  let avoid = [];
  for (let round = 0; round < 2 && out.questions.length < n; round++) {
    let raw = null;
    try { raw = await callJson(ai, model, SYS, generatePrompt(material, analysis, n + 3 - out.questions.length, avoid), 1800, 0.4, '[', ']'); } catch { raw = null; }
    if (!Array.isArray(raw)) { avoid = ['the reply was not a valid JSON array']; continue; }
    const passed = [];
    avoid = [];
    for (const c of raw) {
      if (!c || typeof c !== 'object') continue;
      const key = norm(c.q);
      if (seen.has(key)) continue;
      seen.add(key);
      const why = checkQuestion(c, material);
      if (why) { out.rejected++; avoid.push(why); continue; }
      passed.push(c);
    }
    if (!passed.length) continue;
    let verdicts = null;
    try { verdicts = await callJson(ai, model, SYS, validatePrompt(material, passed), 900, 0, '[', ']'); } catch { verdicts = null; }
    if (!Array.isArray(verdicts)) { out.rejected += passed.length; avoid.push('the review step failed'); continue; }   // never show unchecked questions
    passed.forEach((c, i) => {
      const v = verdicts.find((x) => x && Number(x.id) === i);
      if (!v || v.ok !== true) { out.rejected++; if (v && v.issue) avoid.push(String(v.issue).slice(0, 120)); return; }
      if (out.questions.length >= n) return;
      const sh = shuffleOptions(c);
      out.questions.push({ q: String(c.q).trim(), o: sh.o, a: sh.a, e: String(c.explain).trim(), evidence: String(c.quote).trim().slice(0, 240), concept: String(c.concept || '').slice(0, 80), title, ref });
    });
  }
  if (!out.questions.length) out.reason = 'No question passed the quality check for this part of the material.';
  return out;
}

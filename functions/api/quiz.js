import { json, currentUser, sameOrigin } from './_lib.js';

// POST /api/quiz { text, n }  ->  { ok, questions: [{ q, o: [4 options], a: index, e }] }
// Uses a small Workers AI model. Limited per user and per day so the free allowance is never exceeded.
const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8-fast';
const USER_DAILY = 25;
const GLOBAL_DAILY = 250;

export function parseQuestions(raw, n) {
  let data = raw;
  if (typeof raw === 'string') {
    const a = raw.indexOf('['), b = raw.lastIndexOf(']');
    if (a < 0 || b <= a) return [];
    try { data = JSON.parse(raw.slice(a, b + 1)); } catch { return []; }
  }
  if (!Array.isArray(data)) return [];
  const out = [];
  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const q = String(item.q || item.question || '').trim();
    const options = (item.options || item.o || []).map((x) => String(x).trim());
    const answer = Number(item.answer ?? item.a);
    const explain = String(item.explain || item.e || '').trim();
    if (q.length < 10 || q.length > 300) continue;
    if (options.length !== 4 || options.some((o) => !o || o.length > 200)) continue;
    if (new Set(options.map((o) => o.toLowerCase())).size !== 4) continue;
    if (!Number.isInteger(answer) || answer < 0 || answer > 3) continue;
    if (explain.length > 400) continue;
    // shuffle so the correct answer is not always in the same slot
    const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    out.push({ q, o: order.map((i) => options[i]), a: order.indexOf(answer), e: explain || 'See your material.' });
    if (out.length >= n) break;
  }
  return out;
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ ok: false, error: 'origin' }, 403);
  const user = await currentUser(env, request);
  if (!user) return json({ ok: false, error: 'auth' }, 401);
  if (!env.AI) return json({ ok: false, error: 'ai-not-configured' }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'json' }, 400); }
  const text = String(body && body.text || '').trim();
  const n = Math.min(5, Math.max(3, Number(body && body.n) || 4));
  if (text.length < 300 || text.length > 6000) return json({ ok: false, error: 'text' }, 400);

  const day = new Date().toISOString().slice(0, 10);
  await env.DB.prepare('INSERT INTO ai_usage (user_id, day, n) VALUES (?, ?, 1) ON CONFLICT(user_id, day) DO UPDATE SET n = n + 1').bind(user.id, day).run();
  const mine = await env.DB.prepare('SELECT n FROM ai_usage WHERE user_id = ? AND day = ?').bind(user.id, day).first();
  const all = await env.DB.prepare('SELECT SUM(n) AS n FROM ai_usage WHERE day = ?').bind(day).first();
  if (mine.n > USER_DAILY || (all.n || 0) > (Number(env.AI_DAILY_CAP) || GLOBAL_DAILY)) return json({ ok: false, error: 'limit' }, 429);

  const prompt = `Text from a lecture:\n"""\n${text}\n"""\n\nWrite ${n} multiple-choice study questions in the same language as the text. Use only facts stated in the text. Each question has exactly 4 different options and exactly one correct option. Reply with a JSON array only, in this shape: [{"q":"question","options":["a","b","c","d"],"answer":0,"explain":"one short sentence from the text"}]`;
  let result;
  try {
    result = await env.AI.run(env.AI_MODEL || DEFAULT_MODEL, {
      messages: [
        { role: 'system', content: 'You write short, accurate study questions. You output only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 800,
      temperature: 0.3,
    });
  } catch {
    return json({ ok: false, error: 'ai' }, 502);
  }
  const questions = parseQuestions(result && (result.response ?? result), n);
  if (!questions.length) return json({ ok: false, error: 'empty' }, 502);
  return json({ ok: true, questions });
}

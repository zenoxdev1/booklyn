import { json, currentUser, sameOrigin } from './_lib.js';
import { runPipeline, MAX_MATERIAL } from './_quizlib.mjs';

// POST /api/quiz { sections: [{ title, text, ref }], n }
//   -> { ok, questions: [{ q, o: [4 options], a: index, e, evidence, concept, title, ref }], rejected, reason, subject }
// The pipeline (analyse, write, check, replace) lives in _quizlib.mjs. One request is limited per user and per day
// so the free allowance is never exceeded; each request makes 3 to 5 model calls.
const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8-fast';
const USER_DAILY = 30;
const GLOBAL_DAILY = 250;

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ ok: false, error: 'origin' }, 403);
  const user = await currentUser(env, request);
  if (!user) return json({ ok: false, error: 'auth' }, 401);
  if (!env.AI) return json({ ok: false, error: 'ai-not-configured' }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'json' }, 400); }
  let sections = Array.isArray(body && body.sections) ? body.sections : (body && body.text ? [{ title: '', text: body.text, ref: '' }] : []);
  sections = sections.slice(0, 4).map((s) => ({ title: String(s && s.title || '').slice(0, 120), text: String(s && s.text || '').trim(), ref: String(s && s.ref || '').slice(0, 40) })).filter((s) => s.text);
  const total = sections.reduce((a, s) => a + s.text.length, 0);
  const n = Math.min(5, Math.max(3, Number(body && body.n) || 5));
  if (total < 300 || total > MAX_MATERIAL) return json({ ok: false, error: 'text' }, 400);

  const day = new Date().toISOString().slice(0, 10);
  await env.DB.prepare('INSERT INTO ai_usage (user_id, day, n) VALUES (?, ?, 1) ON CONFLICT(user_id, day) DO UPDATE SET n = n + 1').bind(user.id, day).run();
  const mine = await env.DB.prepare('SELECT n FROM ai_usage WHERE user_id = ? AND day = ?').bind(user.id, day).first();
  const all = await env.DB.prepare('SELECT SUM(n) AS n FROM ai_usage WHERE day = ?').bind(day).first();
  if (mine.n > USER_DAILY || (all.n || 0) > (Number(env.AI_DAILY_CAP) || GLOBAL_DAILY)) return json({ ok: false, error: 'limit' }, 429);

  let result;
  try {
    result = await runPipeline({ ai: env.AI, model: env.AI_MODEL || DEFAULT_MODEL, sections, n });
  } catch {
    return json({ ok: false, error: 'ai' }, 502);
  }
  // 200 even when nothing passed: the app shows the reason instead of inventing questions.
  return json({ ok: true, questions: result.questions, rejected: result.rejected, reason: result.reason, subject: result.subject });
}

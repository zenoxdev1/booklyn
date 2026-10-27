import test from 'node:test';
import assert from 'node:assert/strict';
import { runPipeline, checkQuestion, quoteInMaterial, cleanAnalysis } from '../../functions/api/_quizlib.mjs';

const MATERIAL = [
  'The TCP protocol provides reliable delivery. TCP uses sequence numbers and acknowledgements so that lost segments are retransmitted by the sender.',
  'The UDP protocol is connectionless. UDP does not retransmit lost datagrams, which keeps latency low for streaming and games.',
  'A router forwards packets between networks by looking up the destination address in its routing table and choosing the longest matching prefix.',
].join('\n\n');
const sections = [{ title: 'Transport layer', text: MATERIAL, ref: 'p. 3' }];

const analysis = (over = {}) => ({ readable: true, reason: '', language: 'en', subject: 'Computer networks', concepts: [
  { name: 'TCP', meaning: 'reliable transport', quote: 'TCP uses sequence numbers and acknowledgements so that lost segments are retransmitted by the sender' },
  { name: 'UDP', meaning: 'unreliable transport', quote: 'UDP does not retransmit lost datagrams, which keeps latency low for streaming and games' }], relations: ['TCP trades latency for reliability'], objectives: ['choose a transport protocol'], ...over });
const good = (over = {}) => ({ q: 'A video call tolerates a few lost packets but not delay. Which transport protocol fits it better, and why?', options: ['UDP, because it does not retransmit lost datagrams and so keeps latency low', 'TCP, because it retransmits every lost segment', 'TCP, because acknowledgements reduce delay', 'UDP, because it guarantees ordered delivery'], answer: 0, explain: 'UDP skips retransmission, which keeps latency low. TCP would wait for lost segments.', quote: 'UDP does not retransmit lost datagrams, which keeps latency low for streaming and games', concept: 'UDP', ...over });

// scripted AI: replies in order; the call type is recognised from the prompt
function fakeAi(script) {
  const calls = [];
  return { calls, async run(model, input) {
    const user = input.messages[1].content;
    const kind = user.includes('analyse the material') ? 'analyse' : user.includes('strict reviewer') ? 'validate' : 'generate';
    calls.push(kind);
    const next = script[kind].shift();
    if (next instanceof Error) throw next;
    return { response: typeof next === 'string' ? next : JSON.stringify(next) };
  } };
}

test('happy path: analyse, write, check, return only checked questions with evidence', async () => {
  const ai = fakeAi({ analyse: [analysis()], generate: [[good(), good({ q: 'Why does a router use the longest matching prefix when it forwards a packet?', options: ['It selects the most specific route to the destination', 'It selects the shortest address', 'It avoids routing tables', 'It always uses the first entry'], answer: 0, explain: 'The longest prefix is the most specific route, so it is chosen first.', quote: 'choosing the longest matching prefix' })]], validate: [[{ id: 0, ok: true }, { id: 1, ok: true }]] });
  const r = await runPipeline({ ai, model: 'm', sections, n: 5 });
  assert.equal(r.questions.length, 1 + (checkQuestion({ ...good(), quote: 'choosing the longest matching prefix' }, MATERIAL) ? 0 : 1));
  assert.ok(r.questions.length >= 1);
  const q = r.questions[0];
  assert.equal(q.o.length, 4); assert.ok(q.a >= 0 && q.a < 4);
  assert.ok(q.evidence.length > 20); assert.equal(q.title, 'Transport layer'); assert.equal(q.ref, 'p. 3');
  assert.deepEqual(ai.calls.slice(0, 3), ['analyse', 'generate', 'validate']);
});

test('a question whose quote is not in the material is rejected', async () => {
  const ai = fakeAi({ analyse: [analysis()], generate: [[good({ quote: 'This sentence was invented by the model and is not in the lecture at all.' })], []], validate: [] });
  const r = await runPipeline({ ai, model: 'm', sections, n: 5 });
  assert.equal(r.questions.length, 0);
  assert.ok(r.rejected >= 1);
  assert.match(r.reason, /No question passed/);
});

test('the strict review can reject a question', async () => {
  const ai = fakeAi({ analyse: [analysis()], generate: [[good()], []], validate: [[{ id: 0, ok: false, issue: 'two options could be correct' }]] });
  const r = await runPipeline({ ai, model: 'm', sections, n: 5 });
  assert.equal(r.questions.length, 0);
  assert.equal(r.rejected, 1);
});

test('if the review step fails, nothing unchecked is shown', async () => {
  const ai = fakeAi({ analyse: [analysis()], generate: [[good()], [good()]], validate: [new Error('down'), new Error('down')] });
  const r = await runPipeline({ ai, model: 'm', sections, n: 5 });
  assert.equal(r.questions.length, 0);
});

test('weak questions are replaced in a second round', async () => {
  const bad = good({ q: 'According to the text, which protocol is reliable and ordered in delivery?' });
  const ai = fakeAi({ analyse: [analysis()], generate: [[bad], [good()]], validate: [[{ id: 0, ok: true }]] });
  const r = await runPipeline({ ai, model: 'm', sections, n: 5 });
  assert.equal(r.questions.length, 1);
  assert.deepEqual(ai.calls, ['analyse', 'generate', 'generate', 'validate']);
});

test('unreadable or too thin material is explained, no questions are invented', async () => {
  let ai = fakeAi({ analyse: [analysis({ readable: false, reason: 'The text is garbled.' })], generate: [], validate: [] });
  let r = await runPipeline({ ai, model: 'm', sections, n: 5 });
  assert.equal(r.questions.length, 0); assert.equal(r.reason, 'The text is garbled.'); assert.deepEqual(ai.calls, ['analyse']);
  ai = fakeAi({ analyse: [analysis({ concepts: [{ name: 'X', meaning: 'y', quote: 'not in the material, invented quote text here' }] })], generate: [], validate: [] });
  r = await runPipeline({ ai, model: 'm', sections, n: 5 });
  assert.equal(r.questions.length, 0); assert.ok(r.reason); assert.deepEqual(ai.calls, ['analyse']);
});

test('quote check ignores case, punctuation and spacing but not content', () => {
  assert.equal(quoteInMaterial('udp  DOES not retransmit lost datagrams which keeps latency low', MATERIAL), true);
  assert.equal(quoteInMaterial('UDP guarantees ordered delivery of every packet always', MATERIAL), false);
  assert.equal(quoteInMaterial('short', MATERIAL), false);
});

test('rule checks catch the typical weak questions', () => {
  const m = MATERIAL;
  assert.equal(checkQuestion(good(), m), '');
  assert.match(checkQuestion(good({ q: 'In the slide, which protocol keeps latency low for streaming?' }), m), /refers to the document/);
  assert.match(checkQuestion(good({ options: ['UDP, because it does not retransmit lost datagrams and so keeps latency low', 'TCP', 'All of the above', 'None of the above'] }), m), /above/);
  assert.match(checkQuestion(good({ options: ['UDP', 'UDP', 'TCP', 'Ethernet'] }), m), /duplicate/);
  assert.match(checkQuestion(good({ q: 'Which protocol does not retransmit lost datagrams, which keeps latency low?', options: ['does not retransmit lost datagrams', 'TCP', 'IP', 'ARP'], answer: 0 }), m), /appears in the question/);
  assert.match(checkQuestion(good({ options: ['UDP, because it does not retransmit lost datagrams and so keeps latency low for streaming and games', 'TCP', 'IP', 'ARP'] }), m), /longer/);
  assert.match(checkQuestion(good({ answer: 7 }), m), /answer index/);
  assert.match(checkQuestion(good({ explain: '' }), m), /explanation/);
  assert.match(checkQuestion(good({ options: ['Quantum entanglement distributes cryptographic keys', 'TCP', 'IP', 'ARP'], answer: 0 }), m), /not supported/);
});

test('analysis keeps only concepts with a verifiable quote', () => {
  const a = cleanAnalysis({ readable: true, concepts: [{ name: 'A', meaning: 'm', quote: 'UDP does not retransmit lost datagrams, which keeps latency low' }, { name: 'B', meaning: 'm', quote: 'completely invented sentence that is nowhere in it' }] }, MATERIAL);
  assert.deepEqual(a.concepts.map((c) => c.name), ['A']);
});

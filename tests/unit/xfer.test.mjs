import test from 'node:test';
import assert from 'node:assert/strict';
import { planSend, batches, newId, deviceId } from '../../app/js/xfer.js';

const f = (id, hash, sem, size) => ({ id, hash, sem, size });

test('only files the other device lacks, in semesters it has, are planned', () => {
  const files = [f('1', 'aa', 's1', 10), f('2', 'bb', 's1', 20), f('3', 'cc', 's2', 30), f('4', null, 's1', 5)];
  const p = planSend(files, ['aa'], ['s1']);
  assert.deepEqual(p.send.map((x) => x.id), ['2', '4']);
  assert.equal(p.skipHave, 1); assert.equal(p.skipSem, 1); assert.equal(p.bytes, 25);
});
test('nothing to send when the other device has everything', () => {
  const p = planSend([f('1', 'aa', 's1', 10)], ['aa'], ['s1']);
  assert.equal(p.send.length, 0); assert.equal(p.bytes, 0);
});
test('batches split a list without losing items', () => {
  assert.deepEqual(batches([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(batches([], 50), []);
});
test('ids and device ids fit the server rules', () => {
  const re = /^[A-Za-z0-9_-]{8,48}$/;
  assert.match(newId(12), re);
  assert.match(deviceId(), re);
});
test('the privacy page explains the device transfer', async () => {
  const { readFileSync } = await import('node:fs');
  const h = readFileSync(new URL('../../privacy/index.html', import.meta.url), 'utf8');
  assert.ok(h.includes('Moving files between your devices') && h.includes('10 minutes'));
});
test('the transfer module is cached for offline use', async () => {
  const { readFileSync } = await import('node:fs');
  assert.ok(readFileSync(new URL('../../app/sw.js', import.meta.url), 'utf8').includes("'js/xfer.js'"));
});

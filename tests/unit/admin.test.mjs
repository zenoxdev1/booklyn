import test from 'node:test';
import assert from 'node:assert/strict';
import { isAdmin } from '../../functions/api/_lib.js';

test('admin comes only from the server settings', () => {
  const env = { ADMIN_EMAILS: ' Boss@Example.com , other@x.ch', ADMIN_UIDS: '7, 12' };
  assert.equal(isAdmin(env, { id: 1, email: 'boss@example.com' }), true, 'email match ignores case and spaces');
  assert.equal(isAdmin(env, { id: 12, email: 'nobody@x.ch' }), true, 'uid match');
  assert.equal(isAdmin(env, { id: 2, email: 'nobody@x.ch' }), false);
  assert.equal(isAdmin(env, { id: 7, email: 'code:abc' }), true, 'sync-code accounts can be admins by uid');
});

test('nothing configured means nobody is admin', () => {
  assert.equal(isAdmin({}, { id: 1, email: 'a@b.ch' }), false);
  assert.equal(isAdmin(undefined, { id: 1, email: 'a@b.ch' }), false);
  assert.equal(isAdmin({ ADMIN_EMAILS: '', ADMIN_UIDS: '' }, { id: 1, email: 'a@b.ch' }), false);
  assert.equal(isAdmin({ ADMIN_EMAILS: 'a@b.ch' }, null), false);
});

test('a sync-code account never matches an email entry', () => {
  assert.equal(isAdmin({ ADMIN_EMAILS: 'code:abc' }, { id: 3, email: 'code:abc' }), false);
});

test('uid must match exactly, not as a prefix', () => {
  assert.equal(isAdmin({ ADMIN_UIDS: '12' }, { id: 1, email: 'a@b.ch' }), false);
  assert.equal(isAdmin({ ADMIN_UIDS: '1' }, { id: 12, email: 'a@b.ch' }), false);
});

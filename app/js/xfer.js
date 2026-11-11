import { _t } from './i18n.js';
/* Booklyn device transfer: moves the files of one device to another device of the SAME account.
   The files go straight from device to device (WebRTC data channel, encrypted). The server only passes short-lived
   connection messages (see functions/api/rtc). Nothing is stored there.

   Roles:  receiver  presses "Receive files" and announces itself ("hello").
           sender    presses "Send my files", finds the hello, opens the connection.
   Protocol on the data channel (text messages are JSON, file content is binary chunks):
     R > S  hi {sems}, have {hashes, last}            what the receiver already has
     S > R  plan {n, bytes}, meta {files}, planEnd    what would be sent (only files that are missing)
     R > S  go | no                                   the receiver confirms
     S > R  file {id,size}, <chunks>, end {id}        one file at a time
     R > S  ack {id, ok, err}                         stored and checked (size and SHA-256)
     S > R  done      R > S  bye                      */

export var CHUNK = 16 * 1024;
var MAXBUF = 1024 * 1024;
var FRESH_HELLO_MS = 45 * 1000;
var CONNECT_MS = 40 * 1000;
var IDLE_MS = 60 * 1000;
var WAIT_MS = 5 * 60 * 1000;

export function newId(n) {
  var a = new Uint8Array(n || 12); crypto.getRandomValues(a);
  var s = ''; a.forEach(function (b) { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function deviceId() {
  var k = 'booklyn:device', v = '';
  try { v = localStorage.getItem(k) || ''; } catch (e) { /* private mode */ }
  if (!/^[A-Za-z0-9_-]{8,48}$/.test(v)) { v = 'd' + newId(12); try { localStorage.setItem(k, v); } catch (e) { /* fine */ } }
  return v;
}

/* What the sender would send: files the receiver does not have (same SHA-256) and whose semester exists there. */
export function planSend(files, have, semIds) {
  var haveSet = {}, sems = {}, send = [], skipHave = 0, skipSem = 0, bytes = 0;
  (have || []).forEach(function (h) { haveSet[h] = 1; });
  (semIds || []).forEach(function (s) { sems[s] = 1; });
  files.forEach(function (f) {
    if (f.hash && haveSet[f.hash]) { skipHave++; return; }
    if (!sems[f.sem]) { skipSem++; return; }
    send.push(f); bytes += f.size || 0;
  });
  return { send: send, skipHave: skipHave, skipSem: skipSem, bytes: bytes };
}
export function batches(list, n) { var out = []; for (var i = 0; i < list.length; i += n) out.push(list.slice(i, i + n)); return out; }

/* o = { role: 'send'|'recv', api(method, path, body), dev, RTC (RTCPeerConnection),
         on(event, data),            events: status, progress, ask, done, error
         send: { files(), blob(id), sems? }       (sender)
         recv: { have(), sems(), store(meta, blob) -> {ok, err}, hashOf(blob), confirm({n, bytes}) -> Promise<bool> } } */
export function createLink(o) {
  var S = { dead: false, finished: false, since: 0, session: '', peer: '', pc: null, ch: null, ice: [], remoteSet: false, started: false,
            pollT: null, helloT: null, connT: null, idleT: null, waitT: null, iceServers: null, queue: Promise.resolve() };
  var R = { have: [], haveDone: false, sems: [], plan: null, files: {}, cur: null, got: 0, failed: 0, bytesDone: 0 };   // as receiver / sender bookkeeping
  var waiters = {};

  function emit(ev, d) { try { o.on(ev, d || {}); } catch (e) { /* UI errors must not stop the transfer */ } }
  function fail(code) { if (S.dead || S.finished) return; teardown(); emit('error', { code: code }); }
  function teardown(keepSignals) {
    S.dead = true;
    [S.pollT, S.helloT, S.connT, S.idleT, S.waitT].forEach(function (t) { clearTimeout(t); clearInterval(t); });
    try { if (S.ch && S.ch.readyState === 'open') S.ch.send(JSON.stringify({ t: 'bye' })); } catch (e) { /* closing anyway */ }
    setTimeout(function () { try { if (S.ch) S.ch.close(); } catch (e) { /* done */ } try { if (S.pc) S.pc.close(); } catch (e) { /* done */ } }, 400);
    if (!keepSignals) o.api('DELETE', '/api/rtc/signal', { device: o.dev });
  }
  function post(kind, to, payload) {
    return o.api('POST', '/api/rtc/signal', { from: o.dev, to: to || null, session: S.session, kind: kind, payload: JSON.stringify(payload || {}) });
  }
  function bumpIdle() { clearTimeout(S.idleT); S.idleT = setTimeout(function () { fail('dropped'); }, IDLE_MS); }

  /* ---------- signalling ---------- */
  var errs = 0;
  async function poll() {
    if (S.dead) return;
    var r = await o.api('GET', '/api/rtc/signal?device=' + encodeURIComponent(o.dev) + '&since=' + S.since);
    if (S.dead) return;
    if (!r.ok) {
      if (r.status === 401) return fail('signin');
      if (r.status && r.status !== 429) return fail('unavailable');
      if (++errs > 8) return fail(r.offline ? 'offline' : 'unavailable');
    } else {
      errs = 0;
      var hello = null;
      try {
      for (var i = 0; i < r.rows.length; i++) {
        var row = r.rows[i]; S.since = Math.max(S.since, row.id);
        var body = {}; try { body = JSON.parse(row.payload); } catch (e) { body = {}; }
        if (row.kind === 'hello') { if (o.role === 'send' && !S.started && r.now - row.created_at <= FRESH_HELLO_MS) hello = row; }
        else if (row.session !== S.session) { /* a message for another attempt */ }
        else if (row.kind === 'offer' && o.role === 'recv') await onOffer(row, body);
        else if (row.kind === 'answer' && o.role === 'send') await onAnswer(body);
        else if (row.kind === 'ice') await addIce(body);
        else if (row.kind === 'bye' && !S.finished) return fail('peerleft');
      }
      if (hello) await startSending(hello);
      } catch (e) { return fail('internal'); }
    }
    S.pollT = setTimeout(poll, 1200);
  }
  async function iceServers() {
    if (S.iceServers) return S.iceServers;
    var r = await o.api('GET', '/api/rtc/ice');
    S.iceServers = r.ok && r.iceServers && r.iceServers.length ? r.iceServers : [{ urls: ['stun:stun.cloudflare.com:3478'] }];
    return S.iceServers;
  }
  async function makePc() {
    var pc = new o.RTC({ iceServers: await iceServers() });
    S.pc = pc;
    pc.onicecandidate = function (e) { if (e.candidate) post('ice', S.peer, { c: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate }); };
    pc.onconnectionstatechange = function () {
      if (pc.connectionState === 'failed') fail('connect');
      else if ((pc.connectionState === 'disconnected' || pc.connectionState === 'closed') && !S.finished && !S.dead) setTimeout(function () { if (!S.finished && !S.dead && pc.connectionState !== 'connected') fail('dropped'); }, 6000);
    };
    return pc;
  }
  async function addIce(b) {
    if (!b || !b.c) return;
    if (!S.remoteSet) { S.ice.push(b.c); return; }
    try { await S.pc.addIceCandidate(b.c); } catch (e) { /* a stray candidate is harmless */ }
  }
  async function flushIce() { S.remoteSet = true; var l = S.ice; S.ice = []; for (var i = 0; i < l.length; i++) { try { await S.pc.addIceCandidate(l[i]); } catch (e) { /* ignore */ } } }
  function armConnect() { clearTimeout(S.connT); S.connT = setTimeout(function () { if (!S.ch || S.ch.readyState !== 'open') fail('connect'); }, CONNECT_MS); }

  /* receiver: announces itself, then answers the offer */
  function announce() {
    o.api('DELETE', '/api/rtc/signal', { device: o.dev }).then(function () { if (!S.dead && !S.started) post('hello', null, {}); });
  }
  async function onOffer(row, b) {
    if (S.started) return;
    S.started = true; S.peer = row.from_dev; clearInterval(S.helloT); clearTimeout(S.waitT);
    emit('status', { phase: 'connecting' }); armConnect();
    var pc = await makePc();
    pc.ondatachannel = function (e) { bind(e.channel); };
    await pc.setRemoteDescription(b.sdp); await flushIce();
    var ans = await pc.createAnswer(); await pc.setLocalDescription(ans);
    await post('answer', S.peer, { sdp: { type: ans.type, sdp: ans.sdp } });
  }
  /* sender: opens the connection to the receiver that said hello */
  async function startSending(row) {
    S.started = true; S.peer = row.from_dev; S.session = row.session; clearTimeout(S.waitT);
    emit('status', { phase: 'connecting' }); armConnect();
    var pc = await makePc();
    bind(pc.createDataChannel('files', { ordered: true }));
    var off = await pc.createOffer(); await pc.setLocalDescription(off);
    await post('offer', S.peer, { sdp: { type: off.type, sdp: off.sdp } });
  }
  async function onAnswer(b) { if (S.remoteSet) return; await S.pc.setRemoteDescription(b.sdp); await flushIce(); }

  /* ---------- data channel ---------- */
  function sendJ(obj) { S.ch.send(JSON.stringify(obj)); }
  function drain() {
    return new Promise(function (res) {
      if (S.ch.bufferedAmount <= MAXBUF) return res();
      var h = function () { S.ch.removeEventListener('bufferedamountlow', h); res(); };
      S.ch.addEventListener('bufferedamountlow', h);
    });
  }
  function waitFor(name) { return new Promise(function (res) { waiters[name] = res; }); }
  function resolveWaiter(name, v) { var w = waiters[name]; if (w) { delete waiters[name]; w(v); } }
  function bind(ch) {
    S.ch = ch; ch.binaryType = 'arraybuffer'; ch.bufferedAmountLowThreshold = 512 * 1024;
    ch.onopen = function () { clearTimeout(S.connT); bumpIdle(); emit('status', { phase: 'connected' }); if (o.role === 'recv') recvStart(); };
    ch.onclose = function () { if (!S.finished && !S.dead) fail('dropped'); };
    ch.onmessage = function (e) { bumpIdle(); S.queue = S.queue.then(function () { return onMessage(e.data); }).catch(function () { fail('internal'); }); };
  }
  async function onMessage(d) {
    if (typeof d !== 'string') { if (R.cur) { R.cur.chunks.push(d); R.cur.got += d.byteLength; R.bytesDone += d.byteLength; emit('progress', progress()); } return; }
    var m = JSON.parse(d);
    if (o.role === 'recv') return recvMsg(m);
    return sendMsg(m);
  }
  function progress() { return { done: R.got + R.failed, total: R.plan ? R.plan.n : 0, bytesDone: R.bytesDone, bytes: R.plan ? R.plan.bytes : 0, name: R.cur ? R.cur.meta.name : '' }; }

  /* ----- receiver side ----- */
  function recvStart() {
    sendJ({ t: 'hi', sems: o.recv.sems() });
    var hs = batches(o.recv.have(), 200); if (!hs.length) hs = [[]];
    hs.forEach(function (h, i) { sendJ({ t: 'have', hashes: h, last: i === hs.length - 1 }); });
  }
  async function recvMsg(m) {
    if (m.t === 'plan') { R.plan = { n: m.n, bytes: m.bytes, files: [] }; R.files = {}; return; }
    if (m.t === 'meta') { m.files.forEach(function (f) { R.plan.files.push(f); R.files[f.id] = f; }); return; }
    if (m.t === 'planEnd') {
      if (!R.plan.n) return finish({ got: 0, failed: 0, none: true });
      emit('status', { phase: 'ask' });
      var yes = await o.recv.confirm({ n: R.plan.n, bytes: R.plan.bytes });
      sendJ({ t: yes ? 'go' : 'no' });
      if (!yes) return finish({ got: 0, failed: 0, declined: true });
      emit('status', { phase: 'transfer' }); return;
    }
    if (m.t === 'file') { R.cur = { meta: R.files[m.id], chunks: [], got: 0, size: m.size }; emit('progress', progress()); return; }
    if (m.t === 'miss') { R.failed++; emit('progress', progress()); return; }
    if (m.t === 'end') {
      var c = R.cur; R.cur = null; var ok = false, err = '';
      if (!c || !c.meta) { err = 'unknown'; }
      else {
        var blob = new Blob(c.chunks, { type: c.meta.type || 'application/octet-stream' });
        if (blob.size !== c.size || (c.meta.size && blob.size !== c.meta.size)) err = _t("The file arrived incomplete.");
        else {
          var h = c.meta.hash ? await o.recv.hashOf(blob) : null;
          if (c.meta.hash && h !== c.meta.hash) err = _t("The file did not match its checksum.");
          else { var r = await o.recv.store(c.meta, blob); ok = !!r.ok; err = r.ok ? '' : (r.err || _t("Could not be saved.")); }
        }
      }
      if (ok) R.got++; else R.failed++;
      sendJ({ t: 'ack', id: m.id, ok: ok, err: err });
      emit('progress', progress()); return;
    }
    if (m.t === 'done') return finish({ got: R.got, failed: R.failed });
    if (m.t === 'bye' && !S.finished) return fail('peerleft');
  }

  /* ----- sender side ----- */
  async function sendMsg(m) {
    if (m.t === 'hi') { R.sems = m.sems || []; return; }
    if (m.t === 'have') { R.have = R.have.concat(m.hashes || []); if (m.last) { R.haveDone = true; sendPlan().catch(function () { fail('internal'); }); } return; }
    if (m.t === 'go') return resolveWaiter('go', true);
    if (m.t === 'no') return resolveWaiter('go', false);
    if (m.t === 'ack') return resolveWaiter('ack:' + m.id, m);
    if (m.t === 'bye' && !S.finished) { if (waiters.bye) return resolveWaiter('bye', true); return fail('peerleft'); }
  }
  async function sendPlan() {
    var files = o.send.files();
    var p = planSend(files, R.have, R.sems);
    R.skip = p;
    sendJ({ t: 'plan', n: p.send.length, bytes: p.bytes });
    batches(p.send, 50).forEach(function (b) { sendJ({ t: 'meta', files: JSON.parse(JSON.stringify(b)) }); });
    sendJ({ t: 'planEnd' });
    if (!p.send.length) { sendJ({ t: 'done' }); return finish({ sent: 0, failed: 0, none: true, skipHave: p.skipHave, skipSem: p.skipSem }); }
    emit('status', { phase: 'ask-wait', n: p.send.length, bytes: p.bytes });
    var go = await waitFor('go');
    if (!go) return finish({ sent: 0, failed: 0, declined: true });
    emit('status', { phase: 'transfer' });
    R.plan = { n: p.send.length, bytes: p.bytes }; R.got = 0; R.failed = 0; R.bytesDone = 0;
    for (var i = 0; i < p.send.length; i++) {
      if (S.dead) return;
      var f = p.send[i], blob = await o.send.blob(f.id);
      R.cur = { meta: f };
      emit('progress', { done: i, total: p.send.length, bytesDone: R.bytesDone, bytes: p.bytes, name: f.name });
      if (!blob) { sendJ({ t: 'miss', id: f.id }); R.failed++; continue; }
      sendJ({ t: 'file', id: f.id, size: blob.size });
      var ackP = waitFor('ack:' + f.id);
      for (var off = 0; off < blob.size; off += CHUNK) {
        var buf = await blob.slice(off, off + CHUNK).arrayBuffer();
        await drain(); if (S.dead) return;
        S.ch.send(buf); R.bytesDone += buf.byteLength;
        if ((off / CHUNK) % 32 === 0) { bumpIdle(); emit('progress', { done: i, total: p.send.length, bytesDone: R.bytesDone, bytes: p.bytes, name: f.name }); }
      }
      sendJ({ t: 'end', id: f.id });
      var a = await ackP;
      if (a.ok) R.got++; else R.failed++;
    }
    sendJ({ t: 'done' });
    var bye = waitFor('bye'); await Promise.race([bye, new Promise(function (r) { setTimeout(r, 4000); })]);
    finish({ sent: R.got, failed: R.failed, skipHave: p.skipHave, skipSem: p.skipSem });
  }

  function finish(result) {
    if (S.finished || S.dead) return;
    S.finished = true;
    if (o.role === 'recv') { try { sendJ({ t: 'bye' }); } catch (e) { /* closed already */ } }
    teardown();
    emit('done', result);
  }

  /* ---------- start ---------- */
  S.session = o.role === 'recv' ? 'S' + newId(12) : '';
  emit('status', { phase: 'waiting' });
  S.waitT = setTimeout(function () { if (!S.started) fail('timeout'); }, WAIT_MS);
  if (o.role === 'recv') { announce(); S.helloT = setInterval(announce, 20000); }
  poll();
  return { cancel: function () { if (S.dead) return; S.finished = true; teardown(); emit('error', { code: 'cancelled' }); } };
}

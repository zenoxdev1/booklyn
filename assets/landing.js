/* Interactive mini city for the landing page. Nothing here is stored or sent anywhere. */
(function () {
  'use strict';
  var host = document.getElementById('demo-city');
  if (!host) return;
  var CX = 30, CY = 17, FH = 14, SIZE = 1.4;
  var BLD = [
    { code: 'BSCM', gx: 1.25, gy: 5.75, h: 20, f: ['lit', 'lit', 'lit', 'ready', 'wait', 'wait'] },
    { code: 'PROFU', gx: 1.75, gy: 3.25, h: 270, f: ['lit', 'lit', 'ready', 'ready', 'wait', 'wait', 'wait'] },
    { code: 'STCSB', gx: 4.25, gy: 2.75, h: 330, f: ['lit', 'ready', 'wait', 'wait', 'wait'] },
    { code: 'CNB', gx: 4.75, gy: .25, h: 215, f: ['lit', 'lit', 'lit', 'lit', 'ready', 'wait'] }
  ];
  var QS = {
    BSCM: [
      { q: 'In BPMN, a(n) ___ gateway lets only one outgoing path be taken.', o: ['exclusive', 'parallel', 'message'] },
      { q: 'A business model describes how a company creates, delivers and captures ___.', o: ['value', 'taxes', 'luck'] },
      { q: 'A customer ___ maps the steps a customer goes through.', o: ['journey', 'ledger', 'firewall'] }
    ],
    PROFU: [
      { q: 'In Java, an object is created from a class with the keyword ___.', o: ['new', 'void', 'final'] },
      { q: 'A method that returns nothing has the return type ___.', o: ['void', 'null', 'empty'] },
      { q: 'To hide a field from other classes, declare it ___.', o: ['private', 'static', 'void'] }
    ],
    STCSB: [
      { q: 'The mean of 2, 4 and 9 is ___.', o: ['5', '6', '4'] },
      { q: 'The most frequent value in a data set is the ___.', o: ['mode', 'median', 'range'] },
      { q: 'A fair coin is flipped twice. The probability of two heads is ___.', o: ['1/4', '1/2', '1/3'] }
    ],
    CNB: [
      { q: 'A /24 IPv4 mask is 255.255.255.___.', o: ['0', '24', '255'] },
      { q: 'The ___ layer of the OSI model deals with IP addresses.', o: ['network', 'physical', 'application'] },
      { q: 'The binary number 1010 equals ___ in decimal.', o: ['10', '8', '12'] }
    ]
  };
  var st, qn = {}, pending = null;
  var el = {
    stats: document.getElementById('d-stats'), bar: document.getElementById('d-bar'), coins: document.getElementById('d-coins'),
    day: document.getElementById('d-day'), rent: document.getElementById('d-rent'), msg: document.getElementById('d-msg'),
    quiz: document.getElementById('d-quiz'), ff: document.getElementById('d-ff'), reset: document.getElementById('d-reset')
  };

  function fresh() {
    st = { coins: 0, day: 1, rent: 5 * 3600 + 12 * 60 + 44, b: BLD.map(function (b) {
      return b.f.map(function (k) { return { k: k === 'lit' ? 'lit' : k, age: k === 'lit' ? 2 : 0 }; });
    }) };
    pending = null;
  }
  function disp(f) {
    if (f.k !== 'lit') return f.k;
    return f.age < 7 ? 'lit' : f.age < 14 ? 'fading' : 'ready';
  }
  function iso(x, y, z) { return [(x - y) * CX, (x + y) * CY - z]; }
  function pts(a) { return a.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function draw() {
    var order = BLD.map(function (b, i) { return i; }).sort(function (a, b) { return (BLD[a].gx + BLD[a].gy) - (BLD[b].gx + BLD[b].gy); });
    var s = '<polygon fill="#1b2142" stroke="#2a3160" points="' + pts([iso(-.2, -.4, 0), iso(6.6, -.4, 0), iso(6.6, 7.2, 0), iso(-.2, 7.2, 0)]) + '"/>';
    s += '<polygon fill="#24402f" points="' + pts([iso(.1, -.1, 0), iso(6.3, -.1, 0), iso(6.3, 6.9, 0), iso(.1, 6.9, 0)]) + '"/>';
    order.forEach(function (bi) {
      var b = BLD[bi], x0 = b.gx, x1 = b.gx + SIZE, y0 = b.gy, y1 = b.gy + SIZE, n = b.f.length;
      s += '<g>';
      for (var u = 0; u < n; u++) {
        var z0 = u * FH, z1 = z0 + FH, d = disp(st.b[bi][u]), wait = d === 'wait';
        var lc = wait ? 'hsl(' + b.h + ' 6% 31%)' : 'hsl(' + b.h + ' 32% 43%)', rc = wait ? 'hsl(' + b.h + ' 6% 21%)' : 'hsl(' + b.h + ' 30% 28%)';
        var label = b.code + ' floor ' + (u + 1) + ', ' + ({ lit: 'lights on', fading: 'fading', ready: 'ready', wait: 'waiting for files' })[d] + (d === 'ready' || d === 'fading' ? '. Press to check.' : '');
        s += '<g class="fl" tabindex="0" role="button" data-b="' + bi + '" data-f="' + u + '" aria-label="' + label + '">';
        s += '<polygon fill="' + lc + '" stroke="rgba(0,0,0,.25)" stroke-width=".4" points="' + pts([iso(x0, y1, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x0, y1, z1)]) + '"/>';
        s += '<polygon fill="' + rc + '" stroke="rgba(0,0,0,.25)" stroke-width=".4" points="' + pts([iso(x1, y1, z0), iso(x1, y0, z0), iso(x1, y0, z1), iso(x1, y1, z1)]) + '"/>';
        if (!wait) {
          var cls = 'w w-' + d;
          [[.16, .42], [.58, .84]].forEach(function (t) {
            s += '<polygon class="' + cls + '" points="' + pts([iso(lerp(x0, x1, t[0]), y1, z0 + 3), iso(lerp(x0, x1, t[1]), y1, z0 + 3), iso(lerp(x0, x1, t[1]), y1, z1 - 3), iso(lerp(x0, x1, t[0]), y1, z1 - 3)]) + '"/>';
            s += '<polygon class="' + cls + '" points="' + pts([iso(x1, lerp(y1, y0, t[0]), z0 + 3), iso(x1, lerp(y1, y0, t[1]), z0 + 3), iso(x1, lerp(y1, y0, t[1]), z1 - 3), iso(x1, lerp(y1, y0, t[0]), z1 - 3)]) + '"/>';
          });
        }
        s += '</g>';
      }
      var zt = n * FH;
      s += '<polygon fill="hsl(' + b.h + ' 34% 54%)" stroke="rgba(0,0,0,.25)" stroke-width=".4" points="' + pts([iso(x0, y0, zt), iso(x1, y0, zt), iso(x1, y1, zt), iso(x0, y1, zt)]) + '"/>';
      var lp = iso((x0 + x1) / 2, y1 + .35, 0);
      s += '<text x="' + lp[0].toFixed(1) + '" y="' + (lp[1] + 13).toFixed(1) + '" text-anchor="middle" class="blab">' + b.code + '</text>';
      s += '</g>';
    });
    host.innerHTML = s;
    var lit = 0, tot = 0;
    st.b.forEach(function (fl) { fl.forEach(function (f) { tot++; var d = disp(f); if (d === 'lit' || d === 'fading') lit++; }); });
    el.stats.textContent = lit + ' of ' + tot + ' floors lit';
    el.bar.style.width = Math.round(lit / tot * 100) + '%';
    el.coins.textContent = st.coins;
    el.day.textContent = 'Day ' + st.day;
    return lit;
  }
  function say(t) { el.msg.textContent = t; }
  function litCount() { var n = 0; st.b.forEach(function (fl) { fl.forEach(function (f) { var d = disp(f); if (d === 'lit' || d === 'fading') n++; }); }); return n; }
  function hms(s) { function p(n) { return n < 10 ? '0' + n : '' + n; } return p(Math.floor(s / 3600)) + ':' + p(Math.floor(s % 3600 / 60)) + ':' + p(s % 60); }

  function showQuiz(bi, u) {
    var code = BLD[bi].code, list = QS[code]; qn[code] = (qn[code] || 0); var q = list[qn[code]++ % list.length], opts = q.o.map(function (t, i) { return { t: t, ok: i === 0 }; });
    opts.sort(function () { return Math.random() - .5; });
    pending = { bi: bi, u: u };
    el.quiz.hidden = false;
    el.quiz.innerHTML = '<p class="qh">' + BLD[bi].code + ' · floor ' + (u + 1) + ' check</p><p class="qq"></p><div class="qo"></div>';
    el.quiz.querySelector('.qq').textContent = q.q;
    var box = el.quiz.querySelector('.qo');
    opts.forEach(function (o) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'btn ghost small'; b.textContent = o.t;
      b.addEventListener('click', function () {
        if (!pending) return;
        if (o.ok) {
          var f = st.b[pending.bi][pending.u], was = disp(f);
          f.k = 'lit'; f.age = 0;
          var gain = was === 'fading' ? 5 : 10; st.coins += gain;
          el.quiz.hidden = true; pending = null; el.ff.disabled = false; draw();
          say('Correct. The light is on and a guest moves in. +' + gain + ' coins.');
        } else { b.disabled = true; say('Not quite. Try another answer.'); }
      });
      box.appendChild(b);
    });
    el.quiz.querySelector('button').focus();
  }

  function act(t) {
    var g = t.closest ? t.closest('.fl') : null; if (!g) return;
    var bi = +g.getAttribute('data-b'), u = +g.getAttribute('data-f'), f = st.b[bi][u], d = disp(f);
    if (d === 'lit') say(BLD[bi].code + ' floor ' + (u + 1) + ' is on for about ' + (7 - f.age) + ' more days. Your guest pays rent while it is lit.');
    else if (d === 'wait') say('Waiting for files. In the real app, add a file for this week and the floor becomes Ready.');
    else showQuiz(bi, u);
  }
  host.addEventListener('click', function (e) { act(e.target); });
  host.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(e.target); } });

  el.ff.addEventListener('click', function () {
    var before = litCount(), pay = before * 3;
    st.day += 8; st.coins += pay;
    st.b.forEach(function (fl) { fl.forEach(function (f) { if (f.k === 'lit') f.age += 8; }); });
    el.quiz.hidden = true; pending = null;
    draw();
    var left = litCount();
    el.ff.disabled = left === 0;
    say('8 days later. Rent collected: +' + pay + ' coins (rent stores up to 3 days). Lights older than 7 days are fading, older than 14 days are out.' + (left ? ' Study a fading floor to save it.' : ' Every light is out, so there is nothing left to fast-forward. Study a floor to light it again.'));
  });
  el.reset.addEventListener('click', function () { fresh(); el.ff.disabled = false; el.quiz.hidden = true; draw(); say('Back to the start. Tap a floor that is not lit.'); });

  setInterval(function () {
    st.rent--;
    if (st.rent <= 0) { var n = litCount(); st.coins += n; st.rent = 86400; draw(); say('Rent day: +' + n + ' coins, one per lit floor.'); }
    el.rent.textContent = hms(st.rent);
  }, 1000);

  fresh(); draw(); el.rent.textContent = hms(st.rent);
})();

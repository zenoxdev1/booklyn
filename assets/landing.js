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
  var LANG = (document.documentElement.lang || 'en').slice(0, 2);
  var TX = {
    en: { stats: '{n} of {t} floors lit', day: 'Day {n}', code: '{c} floor {u}', lit: 'lights on', fading: 'fading', ready: 'ready', wait: 'waiting for files', press: '. Press to check.',
      chk: '{c} · floor {u} check', ok: 'Correct. The light is on and a guest moves in. +{g} coins.', no: 'Not quite. Try another answer.',
      on: '{c} floor {u} is on for about {d} more days. Your guest pays rent while it is lit.', waitmsg: 'Waiting for files. In the real app, add a file for this week and the floor becomes Ready.',
      ff: '8 days later. Rent collected: +{p} coins (rent stores up to 3 days). Lights older than 7 days are fading, older than 14 days are out.', ffmore: ' Study a fading floor to save it.', ffnone: ' Every light is out, so there is nothing left to fast-forward. Study a floor to light it again.',
      reset: 'Back to the start. Tap a floor that is not lit.', rentday: 'Rent day: +{n} coins, one per lit floor.' },
    de: { stats: '{n} von {t} Stockwerken leuchten', day: 'Tag {n}', code: '{c} Stockwerk {u}', lit: 'Licht an', fading: 'verblasst', ready: 'bereit', wait: 'wartet auf Dateien', press: '. Tippen zum Prüfen.',
      chk: '{c} · Check Stockwerk {u}', ok: 'Richtig. Das Licht ist an und ein Gast zieht ein. +{g} Münzen.', no: 'Nicht ganz. Versuch eine andere Antwort.',
      on: '{c} Stockwerk {u} bleibt noch etwa {d} Tage an. Dein Gast zahlt Miete, solange es leuchtet.', waitmsg: 'Wartet auf Dateien. In der echten App fügst du eine Datei für diese Woche hinzu, und das Stockwerk wird bereit.',
      ff: '8 Tage später. Miete eingesammelt: +{p} Münzen (die Miete lagert bis zu 3 Tage). Lichter über 7 Tage verblassen, über 14 Tage sind sie aus.', ffmore: ' Lerne ein verblassendes Stockwerk, um es zu retten.', ffnone: ' Alle Lichter sind aus, also gibt es nichts mehr vorzuspulen. Lerne ein Stockwerk, um es wieder zu entzünden.',
      reset: 'Zurück am Anfang. Tippe auf ein Stockwerk, das nicht leuchtet.', rentday: 'Miettag: +{n} Münzen, eine pro leuchtendem Stockwerk.' },
    es: { stats: '{n} de {t} plantas iluminadas', day: 'Día {n}', code: '{c} planta {u}', lit: 'luz encendida', fading: 'apagándose', ready: 'lista', wait: 'esperando archivos', press: '. Pulsa para comprobar.',
      chk: '{c} · comprobación de la planta {u}', ok: 'Correcto. La luz está encendida y se muda un huésped. +{g} monedas.', no: 'Casi. Prueba otra respuesta.',
      on: '{c} planta {u} seguirá encendida unos {d} días más. Tu huésped paga alquiler mientras esté iluminada.', waitmsg: 'Esperando archivos. En la aplicación real, añade un archivo de esta semana y la planta pasa a Lista.',
      ff: 'Ocho días después. Alquiler cobrado: +{p} monedas (el alquiler se acumula hasta 3 días). Las luces de más de 7 días se apagan poco a poco; las de más de 14, ya están apagadas.', ffmore: ' Estudia una planta que se apaga para salvarla.', ffnone: ' Todas las luces están apagadas, así que no queda nada que avanzar. Estudia una planta para encenderla de nuevo.',
      reset: 'De vuelta al principio. Toca una planta apagada.', rentday: 'Día de alquiler: +{n} monedas, una por planta iluminada.' },
    fr: { stats: '{n} étages allumés sur {t}', day: 'Jour {n}', code: '{c} étage {u}', lit: 'allumé', fading: 's’éteint', ready: 'prêt', wait: 'en attente de fichiers', press: '. Touche pour contrôler.',
      chk: '{c} · contrôle de l’étage {u}', ok: 'Correct. La lumière est allumée et un invité emménage. +{g} pièces.', no: 'Presque. Essaie une autre réponse.',
      on: '{c} étage {u} reste allumé encore environ {d} jours. Ton invité paie un loyer tant qu’il est allumé.', waitmsg: 'En attente de fichiers. Dans la vraie appli, ajoute un fichier pour cette semaine et l’étage devient Prêt.',
      ff: '8 jours plus tard. Loyer récolté : +{p} pièces (le loyer s’accumule jusqu’à 3 jours). Les lumières de plus de 7 jours s’éteignent doucement, celles de plus de 14 jours sont éteintes.', ffmore: ' Étudie un étage qui s’éteint pour le sauver.', ffnone: ' Toutes les lumières sont éteintes, il n’y a donc plus rien à avancer. Étudie un étage pour le rallumer.',
      reset: 'Retour au début. Touche un étage éteint.', rentday: 'Jour de loyer : +{n} pièces, une par étage allumé.' }
  };
  var T = TX[LANG] || TX.en;
  function fmt(str, o) { return str.replace(/\{(\w+)\}/g, function (m, k) { return o[k]; }); }
  var QSL = {
    en: {
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
  },
    de: {
      BSCM: [
        { q: 'In BPMN lässt ein ___-Gateway nur einen ausgehenden Pfad zu.', o: ['exklusives', 'paralleles', 'Nachrichten-'] },
        { q: 'Ein Geschäftsmodell beschreibt, wie ein Unternehmen ___ schafft, liefert und abschöpft.', o: ['Wert', 'Steuern', 'Glück'] },
        { q: 'Eine Customer ___ zeigt die Schritte, die ein Kunde durchläuft.', o: ['Journey', 'Ledger', 'Firewall'] }
      ],
      PROFU: [
        { q: 'In Java wird ein Objekt mit dem Schlüsselwort ___ aus einer Klasse erzeugt.', o: ['new', 'void', 'final'] },
        { q: 'Eine Methode ohne Rückgabe hat den Rückgabetyp ___.', o: ['void', 'null', 'empty'] },
        { q: 'Um ein Feld vor anderen Klassen zu verbergen, deklariert man es ___.', o: ['private', 'static', 'void'] }
      ],
      STCSB: [
        { q: 'Der Mittelwert von 2, 4 und 9 ist ___.', o: ['5', '6', '4'] },
        { q: 'Der häufigste Wert eines Datensatzes heisst ___.', o: ['Modus', 'Median', 'Spannweite'] },
        { q: 'Eine faire Münze wird zweimal geworfen. Die Wahrscheinlichkeit für zweimal Kopf ist ___.', o: ['1/4', '1/2', '1/3'] }
      ],
      CNB: [
        { q: 'Eine IPv4-Maske /24 ist 255.255.255.___.', o: ['0', '24', '255'] },
        { q: 'Die ___-Schicht des OSI-Modells befasst sich mit IP-Adressen.', o: ['Vermittlungs', 'Bitübertragungs', 'Anwendungs'] },
        { q: 'Die Binärzahl 1010 entspricht ___ im Dezimalsystem.', o: ['10', '8', '12'] }
      ]
    },
    es: {
      BSCM: [
        { q: 'En BPMN, una pasarela ___ solo permite seguir uno de los caminos de salida.', o: ['exclusiva', 'paralela', 'de mensaje'] },
        { q: 'Un modelo de negocio describe cómo una empresa crea, entrega y captura ___.', o: ['valor', 'impuestos', 'suerte'] },
        { q: 'Un ___ del cliente (customer journey) muestra los pasos que sigue un cliente.', o: ['mapa de recorrido', 'libro mayor', 'cortafuegos'] }
      ],
      PROFU: [
        { q: 'En Java, un objeto se crea a partir de una clase con la palabra clave ___.', o: ['new', 'void', 'final'] },
        { q: 'Un método que no devuelve nada tiene el tipo de retorno ___.', o: ['void', 'null', 'empty'] },
        { q: 'Para ocultar un campo a otras clases se declara ___.', o: ['private', 'static', 'void'] }
      ],
      STCSB: [
        { q: 'La media de 2, 4 y 9 es ___.', o: ['5', '6', '4'] },
        { q: 'El valor más frecuente de un conjunto de datos es la ___.', o: ['moda', 'mediana', 'amplitud'] },
        { q: 'Se lanza dos veces una moneda justa. La probabilidad de dos caras es ___.', o: ['1/4', '1/2', '1/3'] }
      ],
      CNB: [
        { q: 'Una máscara IPv4 /24 es 255.255.255.___.', o: ['0', '24', '255'] },
        { q: 'La capa de ___ del modelo OSI se ocupa de las direcciones IP.', o: ['red', 'física', 'aplicación'] },
        { q: 'El número binario 1010 equivale a ___ en decimal.', o: ['10', '8', '12'] }
      ]
    },
    fr: {
      BSCM: [
        { q: 'En BPMN, une passerelle ___ n’autorise qu’un seul chemin de sortie.', o: ['exclusive', 'parallèle', 'de message'] },
        { q: 'Un modèle d’affaires décrit comment une entreprise crée, délivre et capte de la ___.', o: ['valeur', 'taxe', 'chance'] },
        { q: 'Un parcours client (customer ___) montre les étapes que traverse un client.', o: ['journey', 'ledger', 'firewall'] }
      ],
      PROFU: [
        { q: 'En Java, on crée un objet à partir d’une classe avec le mot-clé ___.', o: ['new', 'void', 'final'] },
        { q: 'Une méthode qui ne retourne rien a le type de retour ___.', o: ['void', 'null', 'empty'] },
        { q: 'Pour cacher un champ aux autres classes, on le déclare ___.', o: ['private', 'static', 'void'] }
      ],
      STCSB: [
        { q: 'La moyenne de 2, 4 et 9 est ___.', o: ['5', '6', '4'] },
        { q: 'La valeur la plus fréquente d’un jeu de données est le ___.', o: ['mode', 'médiane', 'étendue'] },
        { q: 'On lance deux fois une pièce équilibrée. La probabilité d’obtenir deux fois face est ___.', o: ['1/4', '1/2', '1/3'] }
      ],
      CNB: [
        { q: 'Un masque IPv4 /24 est 255.255.255.___.', o: ['0', '24', '255'] },
        { q: 'La couche ___ du modèle OSI s’occupe des adresses IP.', o: ['réseau', 'physique', 'application'] },
        { q: 'Le nombre binaire 1010 vaut ___ en décimal.', o: ['10', '8', '12'] }
      ]
    }
  };
  var QS = QSL[LANG] || QSL.en;
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
        var label = fmt(T.code, { c: b.code, u: u + 1 }) + ', ' + T[d] + (d === 'ready' || d === 'fading' ? T.press : '');
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
    el.stats.textContent = fmt(T.stats, { n: lit, t: tot });
    el.bar.style.width = Math.round(lit / tot * 100) + '%';
    el.coins.textContent = st.coins;
    el.day.textContent = fmt(T.day, { n: st.day });
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
    el.quiz.innerHTML = '<p class="qh"></p><p class="qq"></p><div class="qo"></div>';
    el.quiz.querySelector('.qh').textContent = fmt(T.chk, { c: BLD[bi].code, u: u + 1 });
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
          say(fmt(T.ok, { g: gain }));
        } else { b.disabled = true; say(T.no); }
      });
      box.appendChild(b);
    });
    el.quiz.querySelector('button').focus();
  }

  function act(t) {
    var g = t.closest ? t.closest('.fl') : null; if (!g) return;
    var bi = +g.getAttribute('data-b'), u = +g.getAttribute('data-f'), f = st.b[bi][u], d = disp(f);
    if (d === 'lit') say(fmt(T.on, { c: BLD[bi].code, u: u + 1, d: 7 - f.age }));
    else if (d === 'wait') say(T.waitmsg);
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
    say(fmt(T.ff, { p: pay }) + (left ? T.ffmore : T.ffnone));
  });
  el.reset.addEventListener('click', function () { fresh(); el.ff.disabled = false; el.quiz.hidden = true; draw(); say(T.reset); });

  setInterval(function () {
    st.rent--;
    if (st.rent <= 0) { var n = litCount(); st.coins += n; st.rent = 86400; draw(); say(fmt(T.rentday, { n: n })); }
    el.rent.textContent = hms(st.rent);
  }, 1000);

  fresh(); draw(); el.rent.textContent = hms(st.rent);
})();

/* Booklyn "Study today": picks one clear task and groups the rest. Pure logic, no page access.
   floors: [{k:'module:unit', st:'lit'|'fading'|'progress'|'ready'|'empty', until, left}, ...] in module order
   nextKey: the floor the deadline logic recommends ('' if none). pickKey: a floor the student chose today ('' if none).
   Returns {lead, why, review, other, counts}. why: 'pick' | 'urgent' (light fades within 3 days) | 'next' | 'review' | 'order'. */
export var URGENT_DAYS = 3;

export function plan(floors, nextKey, pickKey) {
  var counts = { lit: 0, fading: 0, progress: 0, ready: 0 }, fading = [], rest = [], byKey = {};
  (floors || []).forEach(function (f) {
    if (counts[f.st] !== undefined) counts[f.st]++;
    if (f.st === 'fading') { fading.push(f); byKey[f.k] = f; }
    else if (f.st === 'ready' || f.st === 'progress') { rest.push(f); byKey[f.k] = f; }
  });
  fading.sort(function (a, b) { return a.until - b.until; });
  var lead = null, why = '';
  if (pickKey && byKey[pickKey]) { lead = byKey[pickKey]; why = 'pick'; }
  else if (fading.length && fading[0].left <= URGENT_DAYS) { lead = fading[0]; why = 'urgent'; }
  else if (nextKey && byKey[nextKey]) { lead = byKey[nextKey]; why = 'next'; }
  else if (fading.length) { lead = fading[0]; why = 'review'; }
  else if (rest.length) { lead = rest[0]; why = 'order'; }
  return {
    lead: lead, why: why, counts: counts,
    review: fading.filter(function (f) { return f !== lead; }),
    other: rest.filter(function (f) { return f !== lead; })
  };
}

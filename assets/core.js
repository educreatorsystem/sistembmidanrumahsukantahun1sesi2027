/* Pure calculations, validation and seeded allocation. No health categories. */
var BMI_CORE = (function () {
  var HOUSES = ['BIRU', 'KUNING', 'HIJAU', 'MERAH'];
  var CONDITIONS = ['Asma', 'Alahan', 'Sawan / epilepsi', 'Masalah jantung', 'Keadaan menjejaskan pergerakan', 'Keadaan kesihatan lain'];
  function fail(message) { throw new Error(message); }
  function text(value, label, required) {
    var s = typeof value === 'string' ? value.trim() : '';
    if (required && !s) fail('Sila isi ' + label + '.');
    if (s.length > 1500) fail(label + ' terlalu panjang (maksimum 1500 aksara).');
    return s;
  }
  function suspicious(w, h) { return w < 10 || w > 80 || h < 80 || h > 160; }
  function validate(p, today) {
    if (!p || typeof p !== 'object') fail('Maklumat tidak sah.');
    var w = Number(p.weight), h = Number(p.height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || w > 250 || h < 30 || h > 250) fail('Semak berat dan tinggi; gunakan kg dan cm yang sah.');
    if (suspicious(w, h) && p.measurementConfirmed !== true) fail('Ukuran luar julat biasa. Sila semak dan sahkan ukuran.');
    var date = text(p.measuredOn, 'tarikh pengukuran', true);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || date > today) fail('Tarikh pengukuran tidak sah atau melebihi hari ini.');
    var raw = p.medical || {}, m = { status: raw.status, conditions: [], detail: '' };
    if (m.status !== 'none' && m.status !== 'yes') fail('Sila jawab sejarah perubatan.');
    if (m.status === 'yes') {
      m.conditions = Array.isArray(raw.conditions) ? Array.from(new Set(raw.conditions)) : [];
      if (!m.conditions.length || m.conditions.some(function (x) { return CONDITIONS.indexOf(x) < 0; })) fail('Pilih keadaan kesihatan yang berkaitan.');
      m.detail = text(raw.detail, 'penerangan sejarah perubatan', true);
    }
    ['medication', 'monitoring', 'restriction'].forEach(function (key) {
      if (raw[key] !== 'yes' && raw[key] !== 'no') fail('Sila jawab semua soalan susulan kesihatan.');
      m[key] = raw[key];
      m[key + 'Detail'] = raw[key] === 'yes' ? text(raw[key + 'Detail'], 'penerangan ' + ({medication:'ubat berkala',monitoring:'pemantauan',restriction:'sekatan aktiviti'})[key], true) : '';
    });
    if (p.consent !== true) fail('Pengakuan wajib ditandakan.');
    return { weight: w, height: h, bmi: w / Math.pow(h / 100, 2), measuredOn: date, medical: m, consent: true, measurementConfirmed: !!p.measurementConfirmed };
  }
  function complete(record, today) { try { validate(record, today); return true; } catch (_) { return false; } }
  function ready(roster, records, today) {
    return roster.length > 0 && roster.every(function (s) { return records[s.id] && complete(records[s.id], today); });
  }
  function median(v) { if (!v.length) return null; var a = v.slice().sort(function (a, b) { return a - b; }), n = a.length; return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2; }
  function quantile(a, p) { if (!a.length) return null; var i = (a.length - 1) * p, b = Math.floor(i); return a[b] + (a[Math.min(b + 1, a.length - 1)] - a[b]) * (i - b); }
  function random(seed) {
    var x = 2166136261;
    for (var i = 0; i < seed.length; i++) x = Math.imul(x ^ seed.charCodeAt(i), 16777619);
    return function () { x += 0x6D2B79F5; var t = Math.imul(x ^ x >>> 15, 1 | x); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function prepare(rows) {
    var values = rows.map(function (s) { return s.bmi; }).sort(function (a, b) { return a - b; });
    var cuts = [quantile(values, .25), quantile(values, .5), quantile(values, .75)];
    return { cuts: cuts, items: rows.map(function (r) {
      var m = r.medical, q = r.bmi <= cuts[0] ? 0 : r.bmi <= cuts[1] ? 1 : r.bmi <= cuts[2] ? 2 : 3;
      return { id: r.id, bmi: r.bmi, group: r.group, q: q, medical: m.status === 'yes' ? 1 : 0, support: m.monitoring === 'yes' || m.restriction === 'yes' ? 1 : 0 };
    }) };
  }
  function allocate(rows, seed) {
    if (!rows.length || new Set(rows.map(function (r) { return r.id; })).size !== rows.length) fail('Senarai agihan kosong atau mempunyai StudentID pendua.');
    var rng = random(seed), p = prepare(rows), n = rows.length, order = HOUSES.slice();
    for (var i = 3; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), z = order[i]; order[i] = order[j]; order[j] = z; }
    var cap = {}, states = {}, totals = { bmi: 0, medical: 0, support: 0, q: [0, 0, 0, 0], groups: {} };
    order.forEach(function (h, i) { cap[h] = Math.floor(n / 4) + (i < n % 4 ? 1 : 0); states[h] = { n: 0, bmi: 0, medical: 0, support: 0, q: [0, 0, 0, 0], groups: {} }; });
    p.items.forEach(function (r) { totals.bmi += r.bmi; totals.medical += r.medical; totals.support += r.support; totals.q[r.q]++; totals.groups[r.group] = (totals.groups[r.group] || 0) + 1; r.tie = rng(); });
    var mean = totals.bmi / n, scale = Math.max(1, Math.sqrt(p.items.reduce(function (s, r) { return s + Math.pow(r.bmi - mean, 2); }, 0) / n));
    function change(s, r, d) { s.n += d; s.bmi += r.bmi * d; s.medical += r.medical * d; s.support += r.support * d; s.q[r.q] += d; s.groups[r.group] = (s.groups[r.group] || 0) + d; }
    function score(h) {
      var s = states[h], ratio = cap[h] / n;
      var v = Math.pow((s.bmi - totals.bmi * ratio) / scale, 2) * .04 + 5 * Math.pow(s.support - totals.support * ratio, 2) + 3 * Math.pow(s.medical - totals.medical * ratio, 2);
      for (var q = 0; q < 4; q++) v += 3 * Math.pow(s.q[q] - totals.q[q] * ratio, 2);
      Object.keys(totals.groups).forEach(function (g) { v += 1.5 * Math.pow((s.groups[g] || 0) - totals.groups[g] * ratio, 2); });
      return v;
    }
    p.items.sort(function (a, b) { return b.support - a.support || b.medical - a.medical || a.q - b.q || a.tie - b.tie; });
    var assigned = {};
    p.items.forEach(function (r) {
      var best, lowest = Infinity;
      order.forEach(function (h) { if (states[h].n >= cap[h]) return; var old = score(h); change(states[h], r, 1); var delta = score(h) - old; change(states[h], r, -1); if (delta < lowest) { lowest = delta; best = h; } });
      assigned[r.id] = best; change(states[best], r, 1);
    });
    var before = HOUSES.reduce(function (s, h) { return s + score(h); }, 0), swaps = 0;
    for (var k = 0; k < 20000; k++) {
      var a = p.items[Math.floor(rng() * n)], b = p.items[Math.floor(rng() * n)], ha = assigned[a.id], hb = assigned[b.id];
      if (ha === hb) continue;
      var oldScore = score(ha) + score(hb);
      change(states[ha], a, -1); change(states[hb], b, -1); change(states[ha], b, 1); change(states[hb], a, 1);
      if (score(ha) + score(hb) < oldScore - 1e-9) { assigned[a.id] = hb; assigned[b.id] = ha; swaps++; }
      else { change(states[ha], b, -1); change(states[hb], a, -1); change(states[ha], a, 1); change(states[hb], b, 1); }
    }
    if (Object.keys(assigned).length !== n || HOUSES.some(function (h) { return states[h].n !== cap[h]; })) fail('Pengesahan kapasiti agihan gagal.');
    return { assignments: assigned, capacities: cap, seed: seed, version: 'stratified-greedy-pair-v1', before: before, after: HOUSES.reduce(function (s, h) { return s + score(h); }, 0), swaps: swaps, cuts: p.cuts };
  }
  function analyse(rows, assignments) {
    var p = prepare(rows), buckets = {};
    HOUSES.forEach(function (h) { buckets[h] = { house: h, count: 0, mean: null, median: null, medical: 0, support: 0, quartiles: [0, 0, 0, 0], groups: {}, values: [] }; });
    p.items.forEach(function (r) { var s = buckets[assignments[r.id]]; if (!s) return; s.count++; s.values.push(r.bmi); s.medical += r.medical; s.support += r.support; s.quartiles[r.q]++; s.groups[r.group] = (s.groups[r.group] || 0) + 1; });
    HOUSES.forEach(function (h) { var s = buckets[h]; s.mean = s.count ? s.values.reduce(function (a, b) { return a + b; }, 0) / s.count : null; s.median = median(s.values); delete s.values; });
    return { houses: HOUSES.map(function (h) { return buckets[h]; }), cuts: p.cuts };
  }
  return { houses: HOUSES, conditions: CONDITIONS, validate: validate, complete: complete, ready: ready, suspicious: suspicious, median: median, quantile: quantile, allocate: allocate, analyse: analyse };
})();

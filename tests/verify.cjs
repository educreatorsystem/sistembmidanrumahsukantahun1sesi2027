/* Runs without dependencies: node tests/verify.cjs. All writes use an in-memory Sheet. */
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const files = ['Core.gs', 'Data.gs', 'Code.gs'].map(f => fs.readFileSync(path.join(root, 'apps-script', f), 'utf8')).join('\n');
function environment() {
  const sheets = {}, properties = new Map([['ADMIN_INITIAL_PASSWORD', 'TestingOnly!2027']]), cache = new Map();
  let fault = '', locks = 0;
  function range(s, row, col, n = 1, m = 1) {
    const obj = {
      getValues() { return Array.from({ length: n }, (_, i) => Array.from({ length: m }, (_, j) => s.data[row + i - 1]?.[col + j - 1] ?? '')); },
      setValues(values) { if (fault && s.name.endsWith(fault)) { fault = ''; throw new Error('Simulated write failure'); } values.forEach((r, i) => { s.data[row + i - 1] ||= []; r.forEach((v, j) => s.data[row + i - 1][col + j - 1] = v); }); return obj; },
      setValue(value) { return obj.setValues([[value]]); }, setBackground() { return obj; }, setFontColor() { return obj; }, setFontWeight() { return obj; }
    }; return obj;
  }
  const db = { getSheetByName(name) { return sheets[name]; }, insertSheet(name) { return sheets[name] = { name, data: [], maxRows: 1000, getMaxRows() { return this.maxRows; }, insertRowsAfter(at, n) { this.maxRows += n; }, getName() { return name; }, getLastRow() { return this.data.length; }, getRange(...args) { return range(this, ...args); }, setFrozenRows() {} }; }, setSpreadsheetTimeZone() {} };
  const p = { getProperty: k => properties.get(k) ?? null, setProperty(k, v) { properties.set(k, String(v)); return p; }, setProperties(values) { Object.entries(values).forEach(([k, v]) => p.setProperty(k, v)); }, deleteProperty(k) { properties.delete(k); } };
  const ctx = vm.createContext({ console: { log() {} }, Date, JSON, Set, Math, Number, String, Object, Array, Error, PropertiesService: { getScriptProperties: () => p }, SpreadsheetApp: { openById: () => db, flush() {} }, LockService: { getScriptLock: () => ({ tryLock() { locks++; return true; }, releaseLock() {} }) }, CacheService: { getScriptCache: () => ({ put(k, v, ttl) { cache.set(k, { v, until: Date.now() + ttl * 1000 }); }, get(k) { const r = cache.get(k); return r?.until > Date.now() ? r.v : null; }, remove(k) { cache.delete(k); } }) }, Utilities: { getUuid: crypto.randomUUID, computeHmacSha256Signature: (v, key) => [...crypto.createHmac('sha256', key).update(v).digest()], formatDate: () => '2026-11-27' }, ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType() { return text; } }) } });
  vm.runInContext(files, ctx);
  const post = (action, values = {}) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ action, ...values }) } }));
  const get = action => JSON.parse(ctx.doGet({ parameter: { action } }));
  return { ctx, post, get, sheets, properties, setFault: value => { fault = value; }, locks: () => locks };
}
const payload = (i = 0) => ({ weight: 25 + i % 27, height: 125 + i % 23, bmi: 999, measuredOn: '2026-11-27', consent: true, measurementConfirmed: true, medical: { status: i % 5 === 0 ? 'yes' : 'none', conditions: i % 5 === 0 ? ['Asma'] : [], detail: i % 5 === 0 ? 'Maklumat ujian sahaja' : '', medication: 'no', monitoring: i % 7 === 0 ? 'yes' : 'no', monitoringDetail: i % 7 === 0 ? 'Pemantauan ujian' : '', restriction: 'no' } });
let checks = 0;
function test(name, run) { run(); checks++; console.log('PASS', name); }
const e = environment(), c = e.ctx.BMI_CORE, roster = e.ctx.SKST_STUDENTS;
test('Missing or empty initial password property installs requested default admin account', () => {
  for (const empty of [false, true]) {
    const isolated = environment();
    if (empty) isolated.properties.set('ADMIN_INITIAL_PASSWORD', '');
    else isolated.properties.delete('ADMIN_INITIAL_PASSWORD');
    isolated.ctx.sediakanSistem();
    assert.equal(isolated.sheets.SKST27_MURID.data.length, 315);
    assert.ok(isolated.post('login', { username: 'admin', password: 'skst@1234' }).ok);
    assert.equal(isolated.get('health').data.build, 'setup-fix-1');
    assert.equal(isolated.get('health').data.version, '3.0.0-pin');
  }
});
test('Rerunning setup preserves existing custom admin password, pupil PINs and saved records', () => {
  const isolated = environment(); isolated.ctx.sediakanSistem();
  const oldHash = isolated.properties.get('SKST27_ADMIN_HASH');
  const oldPins = JSON.stringify(isolated.sheets.SKST27_PIN_EDARAN.data);
  const record = [roster[0].id, JSON.stringify(c.validate(payload(1), '2026-11-27')), '2026-11-27'];
  isolated.ctx.append_('REKOD', [record]);
  const oldRecords = JSON.stringify(isolated.sheets.SKST27_REKOD.data);
  isolated.properties.set('ADMIN_INITIAL_PASSWORD', 'DifferentPassword2027');
  isolated.ctx.sediakanSistem();
  assert.equal(isolated.properties.get('SKST27_ADMIN_HASH'), oldHash);
  assert.equal(JSON.stringify(isolated.sheets.SKST27_PIN_EDARAN.data), oldPins);
  assert.equal(JSON.stringify(isolated.sheets.SKST27_REKOD.data), oldRecords);
  assert.ok(isolated.post('login', { username: 'admin', password: 'TestingOnly!2027' }).ok);
  assert.equal(isolated.post('login', { username: 'admin', password: 'DifferentPassword2027' }).ok, false);
  assert.equal(isolated.post('login', { username: 'admin', password: 'skst@1234' }).ok, false);
});
test('Explicit short custom password is rejected with clear recovery instructions', () => {
  const isolated = environment(); isolated.properties.set('ADMIN_INITIAL_PASSWORD', 'short');
  assert.throws(() => isolated.ctx.sediakanSistem(), /minimum 8 aksara/);
  assert.equal(isolated.properties.has('SKST27_ADMIN_HASH'), false);
  isolated.properties.delete('ADMIN_INITIAL_PASSWORD');
  isolated.ctx.sediakanSistem();
  assert.ok(isolated.post('login', { username: 'admin', password: 'skst@1234' }).ok);
});
test('Actual roster: 314 unique IDs; exact group counts; public fields only', () => {
  assert.equal(roster.length, 314); assert.equal(new Set(roster.map(s => s.id)).size, 314);
  assert.deepEqual(Array.from({ length: 8 }, (_, i) => roster.filter(s => s.group === 'KUMPULAN ' + (i + 1)).length), [40, 40, 39, 39, 39, 39, 39, 39]);
  roster.forEach(s => assert.deepEqual(Object.keys(s).sort(), ['group', 'id', 'name']));
});
test('BMI computed on backend: 25 kg / 125 cm = 16; submitted BMI ignored', () => assert.equal(c.validate(payload(), '2026-11-27').bmi, 16));
test('Medical answer and all conditional explanations enforced; none is complete', () => {
  const good = payload(1); assert.ok(c.complete(good, '2026-11-27'));
  const missing = structuredClone(good); missing.medical.status = ''; assert.throws(() => c.validate(missing, '2026-11-27'));
  const detail = payload(); detail.medical.detail = ''; assert.throws(() => c.validate(detail, '2026-11-27'));
  const follow = payload(); follow.medical.monitoringDetail = ''; assert.throws(() => c.validate(follow, '2026-11-27'));
  const zero = payload(); zero.height = 0; assert.throws(() => c.validate(zero, '2026-11-27'));
  const date = payload(); date.measuredOn = '2026-02-30'; assert.throws(() => c.validate(date, '2026-11-27'));
  const future = payload(); future.measuredOn = '2027-01-01'; assert.throws(() => c.validate(future, '2026-11-27'));
  const unusual = payload(); unusual.weight = 100; unusual.measurementConfirmed = false; assert.throws(() => c.validate(unusual, '2026-11-27'));
});
test('Owner setup stages roster; rerunning preserves PINs and records', () => {
  e.ctx.sediakanSistem(); assert.equal(e.get('roster').data.length, 0); const pins = JSON.stringify(e.sheets.SKST27_PIN_EDARAN.data);
  e.ctx.sediakanSistem(); assert.equal(JSON.stringify(e.sheets.SKST27_PIN_EDARAN.data), pins); assert.equal(e.sheets.SKST27_AKSES.data.length, 315);
  assert.ok(!e.properties.has('ADMIN_INITIAL_PASSWORD'));
});
let adminToken;
test('Backend verifies admin login; no unauthenticated medical or PIN reads', () => {
  assert.equal(e.post('adminData').ok, false); assert.equal(e.post('pins').ok, false); assert.equal(e.get('adminData').ok, false);
  assert.equal(e.post('login', { username: 'admin', password: 'wrong' }).ok, false);
  const r = e.post('login', { username: 'admin', password: 'TestingOnly!2027' }); assert.ok(r.ok); adminToken = r.data.token;
  assert.ok(e.post('activate', { token: adminToken, expectedCount: 314 }).ok); assert.equal(e.get('roster').data.length, 314);
});
const pins = e.post('pins', { token: adminToken }).data;
let guardianToken;
test('Guardian PIN gates own record; PIN always 6 characters mixing letters and numbers', () => {
  pins.forEach(s => { assert.match(s.pin, /^[A-Z0-9]{6}$/); assert.match(s.pin, /[A-Z]/); assert.match(s.pin, /[0-9]/); });
  const r = e.post('unlock', { studentId: roster[0].id, pin: pins[0].pin.toLowerCase() }); assert.ok(r.ok); guardianToken = r.data.token;
  const save = e.post('save', { token: guardianToken, studentId: roster[1].id, payload: payload() }); assert.ok(save.ok);
  const rec = e.ctx.records_(); assert.ok(rec[roster[0].id]); assert.equal(rec[roster[1].id], undefined);
  assert.equal(e.post('adminData', { token: guardianToken }).ok, false);
  assert.equal(e.get('save').ok, false);
});
test('Five failed PINs lock further attempts, even with correct PIN', () => {
  for (let i = 0; i < 5; i++) assert.equal(e.post('unlock', { studentId: roster[3].id, pin: 'AAAAAA' }).ok, false);
  assert.match(e.post('unlock', { studentId: roster[3].id, pin: pins[3].pin }).error, /15 minit/);
});
test('313/314 complete has no allocation; duplicate save is an upsert', () => {
  for (let i = 1; i < 313; i++) { const r = e.post('adminSave', { token: adminToken, studentId: roster[i].id, payload: payload(i), reason: 'Ujian pengisian' }); assert.ok(r.ok, r.error); }
  e.post('save', { token: guardianToken, payload: payload() });
  assert.equal(e.get('progress').data.complete, 313); assert.equal(e.sheets.SKST27_REKOD.data.length, 314); assert.equal(e.ctx.state_().currentRun, undefined);
});
let firstRun;
test('314/314 creates exactly one complete allocation with sizes 79/79/78/78', () => {
  const r = e.post('adminSave', { token: adminToken, studentId: roster[313].id, payload: payload(313), reason: 'Rekod terakhir' }); assert.ok(r.ok, r.error);
  firstRun = e.ctx.state_().currentRun; assert.ok(firstRun);
  const map = e.ctx.assignments_(firstRun); assert.equal(Object.keys(map).length, 314);
  assert.deepEqual(Array.from(c.houses, h => Object.values(map).filter(x => x === h).length).sort(), [78, 78, 79, 79]);
  const runs = e.sheets.SKST27_PROSES.data.length; e.post('save', { token: guardianToken, payload: payload() }); assert.equal(e.sheets.SKST27_PROSES.data.length, runs); assert.equal(e.ctx.state_().currentRun, firstRun);
  assert.equal(e.post('guardianRead', { token: guardianToken }).data.house, null);
});
test('Allocation reproducible from snapshot and seed; optimization improves or preserves score', () => {
  const run = e.ctx.run_(firstRun), rows = e.ctx.dataRows_(e.ctx.roster_(false), e.ctx.records_()), a = c.allocate(rows, run.seed);
  assert.deepEqual(JSON.parse(JSON.stringify(a.assignments)), JSON.parse(JSON.stringify(e.ctx.assignments_(firstRun)))); assert.ok(a.after <= a.before + 1e-7);
  const b = c.allocate(rows, 'another-seed'); assert.deepEqual(Object.values(b.capacities).sort(), [78, 78, 79, 79]);
  const tiny = c.allocate(rows.slice(0, 3), 'tiny'); assert.equal(Object.keys(tiny.assignments).length, 3);
});
test('Publishing requires review after changes; guardian sees only published assignment', () => {
  assert.equal(e.post('publish', { token: adminToken }).ok, false);
  assert.ok(e.post('review', { token: adminToken, reason: 'Analisis telah disemak' }).ok); assert.ok(e.post('publish', { token: adminToken }).ok);
  const house = e.post('guardianRead', { token: guardianToken }).data.house; assert.ok(c.houses.includes(house));
  const mapBefore = JSON.stringify(e.ctx.assignments_(firstRun)); e.post('save', { token: guardianToken, payload: payload(10) });
  assert.equal(JSON.stringify(e.ctx.assignments_(firstRun)), mapBefore); assert.equal(e.post('publish', { token: adminToken }).ok, false);
});
test('Manual pair swap preserves capacity, retains published run, requires fresh review', () => {
  const map = e.ctx.assignments_(firstRun), left = roster[0].id, right = roster.find(s => map[s.id] !== map[left]).id;
  assert.ok(e.post('swap', { token: adminToken, left, right, reason: 'Semakan sokongan murid' }).ok);
  const st = e.ctx.state_(), next = e.ctx.assignments_(st.currentRun); assert.notEqual(st.currentRun, firstRun); assert.equal(st.publishedRun, firstRun); assert.equal(next[left], map[right]); assert.equal(next[right], map[left]);
  c.houses.forEach(h => assert.equal(Object.values(next).filter(x => x === h).length, Object.values(map).filter(x => x === h).length));
  assert.equal(e.post('publish', { token: adminToken }).ok, false);
});
test('Failed generation never replaces committed draft; admin can retry safely', () => {
  const old = e.ctx.state_().currentRun; e.setFault('AGIHAN'); const failed = e.post('generate', { token: adminToken, reason: 'Ujian kegagalan tulis' }); assert.equal(failed.ok, false); assert.equal(e.ctx.state_().currentRun, old);
  const retry = e.post('generate', { token: adminToken, reason: 'Ujian cuba semula' }); assert.ok(retry.ok, retry.error); assert.notEqual(e.ctx.state_().currentRun, old);
});
test('Failure during final automatic allocation preserves saved record and exposes no partial run', () => {
  const isolated = environment(); isolated.ctx.sediakanSistem();
  const token = isolated.post('login', { username: 'admin', password: 'TestingOnly!2027' }).data.token;
  isolated.post('activate', { token, expectedCount: 314 });
  const names = isolated.ctx.SKST_STUDENTS;
  isolated.ctx.append_('REKOD', Array.from(names).slice(0, 313).map((s, i) => [s.id, JSON.stringify(isolated.ctx.BMI_CORE.validate(payload(i), '2026-11-27')), '2026-11-27']));
  isolated.setFault('AGIHAN');
  const last = isolated.post('adminSave', { token, studentId: names[313].id, payload: payload(313), reason: 'Rekod akhir' });
  assert.ok(last.ok); assert.equal(last.data.allocation.status, 'failed'); assert.equal(isolated.get('progress').data.complete, 314);
  assert.equal(isolated.ctx.state_().currentRun, undefined); assert.equal(isolated.ctx.state_().publishedRun, undefined);
  assert.ok(isolated.post('generate', { token, reason: 'Cuba semula selepas gagal' }).ok);
  assert.equal(Object.keys(isolated.ctx.assignments_(isolated.ctx.state_().currentRun)).length, 314);
});
test('PIN reset revokes guardian session and old PIN; changes audited', () => {
  const reset = e.post('resetPin', { token: adminToken, studentId: roster[0].id, reason: 'Penjaga terlupa PIN' }); assert.ok(reset.ok);
  assert.equal(e.post('guardianRead', { token: guardianToken }).ok, false); assert.equal(e.post('unlock', { studentId: roster[0].id, pin: pins[0].pin }).ok, false);
  assert.ok(e.post('unlock', { studentId: roster[0].id, pin: reset.data.pin }).ok);
  assert.ok(e.post('audit', { token: adminToken }).data.some(x => x.action === 'RESET_PIN')); assert.ok(e.locks() > 314);
});
test('Frontend and backend use same validation; credentials not embedded in browser files', () => {
  assert.equal(fs.readFileSync(path.join(root, 'assets/core.js'), 'utf8'), fs.readFileSync(path.join(root, 'apps-script/Core.gs'), 'utf8'));
  ['index.html', 'app.js', 'config.js', 'assets/students.json'].forEach(f => assert.ok(!/skst@1234|TestingOnly!2027|HashPIN|ADMIN_HASH/.test(fs.readFileSync(path.join(root, f), 'utf8')), f));
});
console.log(`\n${checks} meaningful checks passed. Real Google Sheet was not modified by these tests.`);

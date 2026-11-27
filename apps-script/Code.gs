/* SKST 2027. Install all three .gs files in the SAME private Apps Script project. */
var SKST = { version: '4.0.0-tanpa-pin', build: 'nama-dan-jenis-penyakit', sheetId: '1aIVl4toXjKncxGT75oV-GNKwdVEOFMUINIu0Lc2lUAI', prefix: 'SKST27_' };
var TABLES = {
  MURID: ['StudentID', 'Nama', 'Kumpulan', 'Aktif'],
  REKOD: ['StudentID', 'PayloadJSON', 'DikemasKini'],
  AGIHAN: ['RunID', 'StudentID', 'Rumah'],
  PROSES: ['RunID', 'Tarikh', 'Status', 'Seed', 'VersiAlgoritma', 'Revision', 'RingkasanJSON', 'Ralat'],
  SNAPSHOT: ['RunID', 'StudentID', 'PayloadJSON'],
  AUDIT: ['Tarikh', 'Pelaku', 'Tindakan', 'StudentID', 'Sebab', 'ButiranJSON']
};
function props_() { return PropertiesService.getScriptProperties(); }
function db_() { return SpreadsheetApp.openById(SKST.sheetId); }
function table_(key) { var s = db_().getSheetByName(SKST.prefix + key); if (!s) throw new Error('Pemasangan belum lengkap. Jalankan sediakanSistem dahulu.'); return s; }
function rows_(key) { var s = table_(key); return s.getLastRow() < 2 ? [] : s.getRange(2, 1, s.getLastRow() - 1, TABLES[key].length).getValues(); }
function append_(key, values) { if (!values.length) return; var s = table_(key), start = s.getLastRow() + 1, end = start + values.length - 1; if (end > s.getMaxRows()) s.insertRowsAfter(s.getMaxRows(), end - s.getMaxRows()); s.getRange(start, 1, values.length, TABLES[key].length).setValues(values); }
function now_() { return new Date().toISOString(); }
function today_() { return Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd'); }
function state_() { return JSON.parse(props_().getProperty('SKST27_STATE') || '{"revision":0}'); }
function setState_(s) { props_().setProperty('SKST27_STATE', JSON.stringify(s)); }
function locked_(fn) { var lock = LockService.getScriptLock(); if (!lock.tryLock(30000)) throw new Error('Sistem sedang memproses rekod lain. Sila cuba semula.'); try { return fn(); } finally { lock.releaseLock(); } }
function uuid_() { return Utilities.getUuid().replace(/-/g, ''); }
function hash_(value) { return Utilities.computeHmacSha256Signature(String(value), props_().getProperty('SKST27_PEPPER')).map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join(''); }
function equal_(a, b) { a = String(a || ''); b = String(b || ''); var diff = a.length ^ b.length; for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i % Math.max(1, b.length)); return diff === 0; }
function audit_(actor, action, id, reason, details) { append_('AUDIT', [[now_(), actor, action, id || '', reason || '', JSON.stringify(details || {})]]); }

/** Run ONCE as owner. Creates new prefixed tabs; leaves all old tabs untouched. */
function sediakanSistem() {
  if (typeof BMI_CORE === 'undefined' || BMI_CORE.schema !== 'disease-only-v2') throw new Error('Core.gs belum dikemas kini. Salin Core.gs daripada pakej versi 4 sebelum menjalankan pemasangan.');
  return locked_(function () {
    var p = props_(), ss = db_();
    if (!p.getProperty('SKST27_PEPPER')) p.setProperty('SKST27_PEPPER', uuid_() + uuid_());
    if (!p.getProperty('SKST27_ADMIN_HASH')) {
      // First installation only. An existing admin hash is never reset here.
      // Keep this server file in the school's private Apps Script project.
      var initial = p.getProperty('ADMIN_INITIAL_PASSWORD') || 'skst@1234';
      if (initial.length < 8) throw new Error('Nilai ADMIN_INITIAL_PASSWORD terlalu pendek. Isi minimum 8 aksara, atau padam property itu untuk menggunakan akaun awal.');
      var salt = uuid_(); p.setProperties({ SKST27_ADMIN_SALT: salt, SKST27_ADMIN_HASH: hash_(salt + '|' + initial) }); p.deleteProperty('ADMIN_INITIAL_PASSWORD');
    }
    Object.keys(TABLES).forEach(function (k) {
      var s = ss.getSheetByName(SKST.prefix + k) || ss.insertSheet(SKST.prefix + k), head = TABLES[k];
      if (s.getLastRow() && JSON.stringify(s.getRange(1, 1, 1, head.length).getValues()[0]) !== JSON.stringify(head)) throw new Error('Struktur tab ' + s.getName() + ' tidak sepadan. Tiada data ditindih.');
      if (!s.getLastRow()) s.getRange(1, 1, 1, head.length).setValues([head]);
      s.setFrozenRows(1); s.getRange(1, 1, 1, head.length).setBackground('#123d92').setFontColor('#ffffff').setFontWeight('bold');
    });
    if (!rows_('MURID').length) append_('MURID', SKST_STUDENTS.map(function (s) { return [s.id, s.name, s.group, false]; }));
    var st = state_(); st.installed = true; setState_(st);
    ss.setSpreadsheetTimeZone('Asia/Kuala_Lumpur');
    audit_('pemilik', 'PEMASANGAN', '', '', { count: rows_('MURID').length, version: SKST.version });
    SpreadsheetApp.flush();
    console.log('Pemasangan selesai. Log masuk admin, semak pratonton dan aktifkan senarai.');
  });
}
function roster_(all) { return rows_('MURID').filter(function (r) { return all || r[3] === true || String(r[3]).toLowerCase() === 'true'; }).map(function (r) { return { id: String(r[0]), name: String(r[1]), group: String(r[2]), active: r[3] === true || String(r[3]).toLowerCase() === 'true' }; }); }
function records_() { var out = {}; rows_('REKOD').forEach(function (r) { if (r[0]) { try { out[r[0]] = JSON.parse(r[1]); } catch (_) {} } }); return out; }
function session_() {
  var token = uuid_() + uuid_(), ttl = 7200;
  CacheService.getScriptCache().put('session:' + hash_(token), JSON.stringify({ role: 'admin', expires: Date.now() + ttl * 1000 }), ttl);
  return { token: token, expiresIn: ttl };
}
function require_(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) throw new Error('Sila log masuk admin semula.');
  var value = CacheService.getScriptCache().get('session:' + hash_(token)), s = value && JSON.parse(value);
  if (!s || s.role !== 'admin' || s.expires < Date.now()) throw new Error('Sesi admin tamat. Sila log masuk semula.');
  return s;
}
function throttle_(key, valid) {
  var p = props_(), k = 'SKST27_LIMIT_' + key, item = JSON.parse(p.getProperty(k) || '{"count":0,"until":0}');
  if (item.until > Date.now() && item.count >= 5) throw new Error('Terlalu banyak cubaan. Sila tunggu 15 minit.');
  if (valid) { p.deleteProperty(k); return; }
  if (item.until < Date.now()) item = { count: 0, until: Date.now() + 900000 };
  item.count++; p.setProperty(k, JSON.stringify(item)); throw new Error('Nama pengguna atau kata laluan tidak sah.');
}
function assignments_(runId) { var map = {}; if (runId) rows_('AGIHAN').forEach(function (r) { if (r[0] === runId) map[r[1]] = r[2]; }); return map; }
function run_(runId) { var r = rows_('PROSES').find(function (r) { return r[0] === runId; }); return r ? { id: r[0], created: r[1], status: r[2], seed: r[3], version: r[4], revision: Number(r[5]), result: JSON.parse(r[6] || '{}'), error: r[7] } : null; }
function dataRows_(roster, records) { return roster.map(function (s) { return Object.assign({}, s, records[s.id]); }); }
function progress_() { var roster = roster_(false), rec = records_(), done = roster.filter(function (s) { return rec[s.id] && BMI_CORE.complete(rec[s.id], today_()); }).length; return { total: roster.length, complete: done, percent: roster.length ? done / roster.length * 100 : 0 }; }
function generation_(force, actor, reason) {
  var st = state_(), roster = roster_(false), rec = records_();
  if (st.currentRun && !force) return { status: 'existing' };
  if (!BMI_CORE.ready(roster, rec, today_())) { if (force) throw new Error('Semua murid aktif perlu melengkapkan maklumat dahulu.'); return { status: 'waiting' }; }
  var runId = 'RUN-' + uuid_(), seed = uuid_(), row = table_('PROSES').getLastRow() + 1;
  append_('PROSES', [[runId, now_(), 'MEMPROSES', seed, 'stratified-medical-pair-v2', st.revision, '{}', '']]);
  try {
    var snapshot = dataRows_(roster, rec), result = BMI_CORE.allocate(snapshot, seed);
    append_('SNAPSHOT', snapshot.map(function (s) { return [runId, s.id, JSON.stringify(s)]; }));
    append_('AGIHAN', roster.map(function (s) { return [runId, s.id, result.assignments[s.id]]; }));
    SpreadsheetApp.flush();
    var persisted = assignments_(runId);
    if (Object.keys(persisted).length !== roster.length || roster.some(function (s) { return BMI_CORE.houses.indexOf(persisted[s.id]) < 0; })) throw new Error('Semakan akhir agihan gagal.');
    var summary = { capacities: result.capacities, before: result.before, after: result.after, swaps: result.swaps, cuts: result.cuts };
    table_('PROSES').getRange(row, 3, 1, 6).setValues([['DRAF', seed, result.version, st.revision, JSON.stringify(summary), '']]);
    audit_(actor, force ? 'JANA_SEMULA' : 'JANA_AUTOMATIK', '', reason, { runId: runId, seed: seed, revision: st.revision });
    SpreadsheetApp.flush();
    // Only this final pointer exposes a complete run. Incomplete runs remain invisible.
    st.currentRun = runId; st.acceptedRevision = st.revision; st.generationError = ''; setState_(st);
    return { status: 'draft', runId: runId };
  } catch (e) {
    table_('PROSES').getRange(row, 3).setValue('GAGAL'); table_('PROSES').getRange(row, 8).setValue(String(e.message).slice(0, 1000));
    st.generationError = 'Proses agihan gagal. Admin boleh cuba semula.'; setState_(st);
    return { status: 'failed' };
  }
}
function studentInfo_(id) {
  var s = roster_(false).find(function (s) { return s.id === id; });
  if (!s) throw new Error('Murid tiada dalam senarai induk aktif.');
  var st = state_();
  // Name lookup never returns weight, height, medical history or earlier submissions.
  return { student: { id: s.id, name: s.name, group: s.group }, house: assignments_(st.publishedRun)[s.id] || null };
}
function save_(id, payload, actor, reason) {
  if (!roster_(false).some(function (s) { return s.id === id; })) throw new Error('Murid tiada dalam senarai induk aktif.');
  var valid = BMI_CORE.validate(payload, today_()), old = records_()[id];
  valid.updatedAt = now_(); valid.id = id;
  audit_(actor, 'SIMPAN_REKOD', id, reason, { previous: old || null, updated: valid });
  var rows = rows_('REKOD'), index = rows.findIndex(function (r) { return r[0] === id; }), values = [[id, JSON.stringify(valid), valid.updatedAt]];
  if (index < 0) append_('REKOD', values); else table_('REKOD').getRange(index + 2, 1, 1, 3).setValues(values);
  var st = state_(); st.revision = (st.revision || 0) + 1; setState_(st); SpreadsheetApp.flush();
  var allocation = generation_(false, actor, 'Semua rekod lengkap');
  return { saved: true, record: valid, allocation: allocation, message: 'Maklumat berjaya dihantar. Pembahagian rumah sukan akan dijana selepas semua murid melengkapkan maklumat.' };
}
function adminData_() {
  var st = state_(), all = roster_(true), roster = all.filter(function (s) { return s.active; }), records = records_(), map = assignments_(st.currentRun), run = run_(st.currentRun);
  return { roster: all, records: records, assignments: map, state: st, run: run, analysis: run ? BMI_CORE.analyse(dataRows_(roster, records).filter(function (r) { return BMI_CORE.complete(r, today_()); }), map) : null, progress: progress_(), version: SKST.version };
}
function reason_(p) { var s = String(p.reason || '').trim(); if (s.length < 3 || s.length > 1000) throw new Error('Catatan sebab diperlukan (3–1000 aksara).'); return s; }
function route_(p) {
  var a = p.action;
  if (a === 'login') {
    var ok = p.username === 'admin' && equal_(hash_(props_().getProperty('SKST27_ADMIN_SALT') + '|' + String(p.password || '')), props_().getProperty('SKST27_ADMIN_HASH'));
    throttle_('ADMIN', ok); return session_('admin');
  }
  if (a === 'studentInfo') return studentInfo_(String(p.studentId || ''));
  if (a === 'submitRecord') {
    var id = String(p.studentId || ''), saved = save_(id, p.payload, 'borang_awam', 'Pengisian melalui pilihan nama');
    // Return the save receipt only. Never reveal an earlier record through a public route.
    return { saved: saved.saved, studentId: id, bmi: saved.record.bmi, updatedAt: saved.record.updatedAt, allocation: saved.allocation, message: saved.message };
  }
  if (a === 'logout') {
    if (typeof p.token === 'string') CacheService.getScriptCache().remove('session:' + hash_(p.token)); return { loggedOut: true };
  }
  require_(p.token, 'admin');
  if (a === 'adminData') return adminData_();
  if (a === 'activate') {
    var all = roster_(true), st = state_();
    if (all.some(function (s) { return s.active; }) || Object.keys(records_()).length) throw new Error('Senarai sudah aktif; pengaktifan semula dihalang.');
    if (Number(p.expectedCount) !== all.length || new Set(all.map(function (s) { return s.id; })).size !== all.length || !all.length) throw new Error('Jumlah pratonton tidak sepadan.');
    audit_('admin', 'AKTIFKAN_DAFTAR', '', 'Pratonton senarai disahkan', { count: all.length });
    table_('MURID').getRange(2, 4, all.length, 1).setValues(all.map(function () { return [true]; })); st.revision++; setState_(st); return adminData_();
  }
  if (a === 'adminSave') return save_(String(p.studentId), p.payload, 'admin', reason_(p));
  if (a === 'generate') { var result = generation_(true, 'admin', reason_(p)); if (result.status === 'failed') throw new Error('Penjanaan gagal. Draf terdahulu dikekalkan; cuba semula.'); return result; }
  if (a === 'review') {
    var st = state_(); if (!st.currentRun || !BMI_CORE.ready(roster_(false), records_(), today_())) throw new Error('Semua rekod dan draf agihan mesti lengkap.');
    audit_('admin', 'SAHKAN_SEMAKAN', '', reason_(p), { runId: st.currentRun, revision: st.revision }); st.acceptedRevision = st.revision; setState_(st); return { reviewed: true };
  }
  if (a === 'publish') {
    var st = state_(), rs = roster_(false), map = assignments_(st.currentRun);
    if (!st.currentRun || st.acceptedRevision !== st.revision || !BMI_CORE.ready(rs, records_(), today_()) || Object.keys(map).length !== rs.length || rs.some(function (s) { return !map[s.id]; })) throw new Error('Sila lengkapkan rekod dan sahkan semakan analisis terlebih dahulu.');
    audit_('admin', 'TERBITKAN', '', 'Disahkan admin', { runId: st.currentRun, revision: st.revision }); st.publishedRun = st.currentRun; setState_(st); return { published: true };
  }
  if (a === 'swap') {
    var reason = reason_(p), st = state_(), map = assignments_(st.currentRun), left = String(p.left), right = String(p.right);
    if (!map[left] || !map[right] || left === right || map[left] === map[right]) throw new Error('Pilih dua murid daripada rumah berbeza.');
    // Copy-on-write run: even a failed swap cannot expose half of a change.
    var roster = roster_(false), rec = records_(), newId = 'RUN-' + uuid_(), current = run_(st.currentRun);
    var temp = map[left]; map[left] = map[right]; map[right] = temp;
    append_('AGIHAN', roster.map(function (s) { return [newId, s.id, map[s.id]]; }));
    append_('SNAPSHOT', dataRows_(roster, rec).map(function (s) { return [newId, s.id, JSON.stringify(s)]; }));
    append_('PROSES', [[newId, now_(), 'DRAF', current.seed, current.version + '+swap', st.revision, JSON.stringify({ parentRun: st.currentRun, manualSwap: [left, right] }), '']]);
    audit_('admin', 'TUKAR_PASANGAN', '', reason, { left: left, right: right, parentRun: st.currentRun, runId: newId }); SpreadsheetApp.flush();
    st.currentRun = newId; st.acceptedRevision = -1; setState_(st); return { swapped: true };
  }
  if (a === 'audit') return rows_('AUDIT').slice(-300).reverse().map(function (r) { return { date: r[0], actor: r[1], action: r[2], id: r[3], reason: r[4] }; });
  throw new Error('Tindakan tidak sah.');
}
function json_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
function doGet(e) {
  try {
    var a = (e && e.parameter && e.parameter.action) || 'health';
    if (a === 'health') return json_({ ok: true, data: { api: 'SKST_BMI', version: SKST.version, build: SKST.build, configured: state_().installed === true && typeof BMI_CORE !== 'undefined' && BMI_CORE.schema === 'disease-only-v2' } });
    if (a === 'roster') return json_({ ok: true, data: roster_(false).map(function (s) { return { id: s.id, name: s.name, group: s.group }; }) });
    if (a === 'progress') return json_({ ok: true, data: progress_() });
    throw new Error('Akses bacaan awam tidak dibenarkan untuk tindakan ini.');
  } catch (e) { return json_({ ok: false, error: e.message }); }
}
function doPost(e) {
  try {
    if (typeof BMI_CORE === 'undefined' || BMI_CORE.schema !== 'disease-only-v2') throw new Error('Core.gs belum dikemas kini. Gunakan Core.gs daripada pakej versi 4.');
    if (!state_().installed) throw new Error('Pemasangan belum lengkap. Jalankan sediakanSistem.');
    var raw = e && e.postData && e.postData.contents; if (!raw || raw.length > 24000) throw new Error('Saiz permintaan tidak sah.');
    var p = JSON.parse(raw); return json_({ ok: true, data: locked_(function () { return route_(p); }) });
  } catch (e) { return json_({ ok: false, error: String(e.message || 'Permintaan gagal.') }); }
}

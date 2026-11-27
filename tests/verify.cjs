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
const payload = (i = 0) => ({ weight: 25 + i % 27, height: 125 + i % 23, bmi: 999, measuredOn: '2026-11-27', consent: true, measurementConfirmed: true, medical: { status: i % 5 === 0 ? 'yes' : 'none', disease: i % 5 === 0 ? 'Asma' : '' } });
const legacy = () => ({ ...payload(), medical: { status: 'yes', conditions: ['Asma'], detail: 'Maklumat terdahulu', medication: 'no', monitoring: 'yes', monitoringDetail: 'Catatan lama', restriction: 'no' } });
let checks = 0;
function test(name, run) { run(); checks++; console.log('PASS', name); }
const e = environment(), core = e.ctx.BMI_CORE, roster = e.ctx.SKST_STUDENTS;
test('Actual roster retains 314 unique permanent IDs and exact group counts', () => {
  assert.equal(roster.length, 314); assert.equal(new Set(roster.map(s => s.id)).size, 314);
  assert.deepEqual(Array.from({ length: 8 }, (_, i) => roster.filter(s => s.group === 'KUMPULAN ' + (i + 1)).length), [40,40,39,39,39,39,39,39]);
  roster.forEach(s => assert.deepEqual(Object.keys(s).sort(), ['group','id','name']));
});
test('First setup works without password property and no longer creates pupil access/PIN tables', () => {
  const isolated = environment(); isolated.properties.delete('ADMIN_INITIAL_PASSWORD'); isolated.ctx.sediakanSistem();
  assert.equal(isolated.sheets.SKST27_MURID.data.length, 315);
  assert.equal(isolated.sheets.SKST27_AKSES, undefined); assert.equal(isolated.sheets.SKST27_PIN_EDARAN, undefined);
  assert.ok(isolated.post('login', { username:'admin', password:'skst@1234' }).ok);
  assert.equal(isolated.get('health').data.version, '4.0.0-tanpa-pin');
});
test('Upgrade and repeated setup preserve existing admin password, active roster, old records and allocation', () => {
  const isolated = environment(); isolated.ctx.sediakanSistem();
  const token = isolated.post('login', {username:'admin',password:'TestingOnly!2027'}).data.token;
  isolated.post('activate', {token,expectedCount:314});
  isolated.ctx.append_('REKOD', [[roster[0].id,JSON.stringify(legacy()),'2026-11-27']]);
  isolated.ctx.append_('AGIHAN', [['OLD-RUN',roster[0].id,'BIRU']]);
  const hash = isolated.properties.get('SKST27_ADMIN_HASH'), records = JSON.stringify(isolated.sheets.SKST27_REKOD.data), names = JSON.stringify(isolated.sheets.SKST27_MURID.data), houses = JSON.stringify(isolated.sheets.SKST27_AGIHAN.data);
  isolated.properties.set('ADMIN_INITIAL_PASSWORD','DifferentPassword2027'); isolated.ctx.sediakanSistem();
  assert.equal(isolated.properties.get('SKST27_ADMIN_HASH'),hash);
  assert.equal(JSON.stringify(isolated.sheets.SKST27_REKOD.data),records); assert.equal(JSON.stringify(isolated.sheets.SKST27_MURID.data),names); assert.equal(JSON.stringify(isolated.sheets.SKST27_AGIHAN.data),houses);
  assert.ok(isolated.post('login',{username:'admin',password:'TestingOnly!2027'}).ok);
  assert.equal(isolated.post('login',{username:'admin',password:'DifferentPassword2027'}).ok,false);
});
test('Partial installation with an old Core.gs is detected before any submission', () => {
  const isolated = environment(); isolated.ctx.sediakanSistem(); isolated.ctx.BMI_CORE.schema = 'old';
  assert.equal(isolated.get('health').data.configured,false);
  assert.match(isolated.post('submitRecord',{studentId:roster[0].id,payload:payload()}).error,/Core.gs/);
  assert.throws(()=>isolated.ctx.sediakanSistem(),/Core.gs/);
});
test('BMI recomputed to 16.00 and medical input only needs the selected disease type', () => {
  const r = core.validate(payload(),'2026-11-27'); assert.equal(r.bmi,16); assert.equal(r.medical.disease,'Asma');
  assert.deepEqual(Object.keys(r.medical).sort(),['disease','status']);
  assert.equal(r.medical.medication,undefined); assert.equal(r.medical.monitoring,undefined);
});
test('Tiada option is complete without a disease; choosing Ada requires a disease', () => {
  const none = payload(1); none.medical.disease = ''; assert.ok(core.complete(none,'2026-11-27'));
  assert.equal(core.validate(none,'2026-11-27').medical.disease,'Tiada');
  none.medical.disease = 'Asma'; assert.equal(core.validate(none,'2026-11-27').medical.disease,'Tiada');
  const missing = payload(); missing.medical.status = ''; assert.throws(()=>core.validate(missing,'2026-11-27'));
  const yes = payload(); yes.medical.disease = ''; assert.throws(()=>core.validate(yes,'2026-11-27'),/jenis penyakit/);
  yes.medical.disease = 'Alahan, ekzema'; assert.ok(core.complete(yes,'2026-11-27'));
});
test('Invalid measurements, future dates, empty consent and excessive disease text rejected', () => {
  for(const change of [{weight:0},{height:0},{measuredOn:'2026-02-30'},{measuredOn:'2027-01-01'},{consent:false},{weight:100,measurementConfirmed:false},{medical:{status:'yes',disease:'a'.repeat(1501)}}]) assert.throws(()=>core.validate({...payload(),...change},'2026-11-27'));
});
test('Legacy medical records stay complete without mandatory follow-up questions', () => {
  assert.ok(core.complete(legacy(),'2026-11-27')); assert.equal(core.medicalText(legacy().medical),'Asma');
  assert.equal(core.hasDisease(legacy().medical),true);
  assert.ok(core.complete({...legacy(),medical:{status:'none'}},'2026-11-27'));
});
let token;
test('Inactive/unknown pupils blocked; admin still requires backend authentication', () => {
  e.ctx.sediakanSistem();
  assert.equal(e.post('submitRecord',{studentId:roster[0].id,payload:payload()}).ok,false);
  assert.equal(e.post('studentInfo',{studentId:roster[0].id}).ok,false);
  assert.equal(e.post('adminData').ok,false); assert.equal(e.get('adminData').ok,false);
  assert.equal(e.post('login',{username:'admin',password:'wrong'}).ok,false);
  token=e.post('login',{username:'admin',password:'TestingOnly!2027'}).data.token; assert.ok(token);
  assert.ok(e.post('activate',{token,expectedCount:314}).ok);
  assert.equal(e.post('submitRecord',{studentId:'NOT-A-PUPIL',payload:payload()}).ok,false);
});
test('Name-selected submission succeeds with no PIN or guardian token and returns a receipt only', () => {
  const result=e.post('submitRecord',{studentId:roster[0].id,payload:payload()}); assert.ok(result.ok,result.error);
  assert.equal(result.data.bmi,16); assert.equal(result.data.saved,true);
  assert.equal(result.data.record,undefined); assert.equal(result.data.medical,undefined);
  assert.equal(e.get('progress').data.complete,1);
});
test('Name lookup never reveals an earlier health record, measurements, or submission status', () => {
  const info=e.post('studentInfo',{studentId:roster[0].id}); assert.ok(info.ok);
  assert.deepEqual(Object.keys(info.data).sort(),['house','student']);
  assert.deepEqual(Object.keys(info.data.student).sort(),['group','id','name']);
  assert.ok(!JSON.stringify(info.data).includes('Asma'));
  assert.equal(e.post('guardianRead',{studentId:roster[0].id}).ok,false);
  assert.equal(e.post('unlock',{studentId:roster[0].id}).ok,false);
  assert.equal(e.post('pins',{token}).ok,false); assert.equal(e.post('resetPin',{token,studentId:roster[0].id,reason:'Test'}).ok,false);
  e.get('roster').data.forEach(s=>assert.deepEqual(Object.keys(s).sort(),['group','id','name']));
});
test('Repeated submissions update the same StudentID; 313/314 does not allocate', () => {
  e.post('submitRecord',{studentId:roster[0].id,payload:payload()}); assert.equal(e.sheets.SKST27_REKOD.data.length,2);
  for(let i=1;i<313;i++){const r=e.post('submitRecord',{studentId:roster[i].id,payload:payload(i)});assert.ok(r.ok,r.error);}
  assert.equal(e.get('progress').data.complete,313);assert.equal(e.sheets.SKST27_REKOD.data.length,314);assert.equal(e.ctx.state_().currentRun,undefined);
});
let firstRun;
test('314/314 triggers exactly one complete seeded allocation with capacities 79/79/78/78', () => {
  const last=e.post('submitRecord',{studentId:roster[313].id,payload:payload(313)});assert.ok(last.ok,last.error);
  firstRun=e.ctx.state_().currentRun; assert.ok(firstRun);
  const map=e.ctx.assignments_(firstRun);assert.equal(Object.keys(map).length,314);
  assert.deepEqual(Array.from(core.houses,h=>Object.values(map).filter(x=>x===h).length).sort(),[78,78,79,79]);
  const runs=e.sheets.SKST27_PROSES.data.length;
  e.post('submitRecord',{studentId:roster[0].id,payload:payload()});assert.equal(e.sheets.SKST27_PROSES.data.length,runs);assert.equal(e.ctx.state_().currentRun,firstRun);
});
test('Allocation reproducible, pair optimization preserves capacity and improves score', () => {
  const run=e.ctx.run_(firstRun),rows=e.ctx.dataRows_(e.ctx.roster_(false),e.ctx.records_()),result=core.allocate(rows,run.seed);
  assert.deepEqual(JSON.parse(JSON.stringify(result.assignments)),JSON.parse(JSON.stringify(e.ctx.assignments_(firstRun)))); assert.ok(result.after<=result.before+1e-7);
  assert.equal(core.allocate(rows.slice(0,3),'tiny').assignments?true:false,true);
});
test('Only reviewed/published houses become visible through name lookup', () => {
  assert.equal(e.post('studentInfo',{studentId:roster[0].id}).data.house,null);
  assert.equal(e.post('publish',{token}).ok,false);assert.ok(e.post('review',{token,reason:'Analisis disemak'}).ok);assert.ok(e.post('publish',{token}).ok);
  const info=e.post('studentInfo',{studentId:roster[0].id}).data;assert.ok(core.houses.includes(info.house));assert.equal(info.record,undefined);
  const before=JSON.stringify(e.ctx.assignments_(firstRun));e.post('submitRecord',{studentId:roster[0].id,payload:payload(10)});
  assert.equal(JSON.stringify(e.ctx.assignments_(firstRun)),before);assert.equal(e.post('publish',{token}).ok,false);
});
test('Manual swap preserves capacity, existing publication and requires fresh review', () => {
  const map=e.ctx.assignments_(firstRun),left=roster[0].id,right=roster.find(s=>map[s.id]!==map[left]).id;
  assert.ok(e.post('swap',{token,left,right,reason:'Semakan pasangan murid'}).ok);
  const st=e.ctx.state_(),next=e.ctx.assignments_(st.currentRun);assert.equal(next[left],map[right]);assert.equal(next[right],map[left]);assert.equal(st.publishedRun,firstRun);
  core.houses.forEach(h=>assert.equal(Object.values(map).filter(x=>x===h).length,Object.values(next).filter(x=>x===h).length));
  assert.equal(e.post('publish',{token}).ok,false);
});
test('Failed regeneration cannot replace committed allocation; retry is safe', () => {
  const old=e.ctx.state_().currentRun;e.setFault('AGIHAN');assert.equal(e.post('generate',{token,reason:'Ujian kegagalan'}).ok,false);assert.equal(e.ctx.state_().currentRun,old);
  assert.ok(e.post('generate',{token,reason:'Ujian cuba semula'}).ok);assert.notEqual(e.ctx.state_().currentRun,old);
});
test('Automatic allocation failure retains final saved submission and no partial run is exposed', () => {
  const isolated=environment();isolated.ctx.sediakanSistem();const t=isolated.post('login',{username:'admin',password:'TestingOnly!2027'}).data.token;
  isolated.post('activate',{token:t,expectedCount:314});
  isolated.ctx.append_('REKOD',Array.from(roster).slice(0,313).map((s,i)=>[s.id,JSON.stringify(core.validate(payload(i),'2026-11-27')),'2026-11-27']));
  isolated.setFault('AGIHAN');const last=isolated.post('submitRecord',{studentId:roster[313].id,payload:payload(313)});
  assert.ok(last.ok);assert.equal(last.data.allocation.status,'failed');assert.equal(isolated.get('progress').data.complete,314);assert.equal(isolated.ctx.state_().currentRun,undefined);
  assert.ok(isolated.post('generate',{token:t,reason:'Cuba semula'}).ok);
});
test('Old guardian sessions cannot read admin data; logout revokes admin session', () => {
  const old='a'.repeat(64);e.ctx.CacheService.getScriptCache().put('session:'+e.ctx.hash_(old),JSON.stringify({role:'guardian',expires:Date.now()+100000}),1000);
  assert.equal(e.post('adminData',{token:old}).ok,false);assert.equal(e.post('audit',{token:old}).ok,false);
  assert.ok(e.post('audit',{token}).data.some(x=>x.action==='SIMPAN_REKOD'));
  assert.ok(e.locks()>314);assert.ok(e.post('logout',{token}).ok);assert.equal(e.post('adminData',{token}).ok,false);
});
test('Frontend/schema versions match and browser files contain no PIN UI or admin credentials', () => {
  assert.equal(fs.readFileSync(path.join(root,'assets/core.js'),'utf8'),fs.readFileSync(path.join(root,'apps-script/Core.gs'),'utf8'));
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.ok(!/pinForm|guardianPin|resetPin|exportPins|guardianToken/.test(html+app));
  assert.ok(!/skst@1234|TestingOnly!2027|ADMIN_HASH/.test(html+app));
  assert.match(app,/>Tiada<\/option>/);assert.match(app,/data-medical="disease"/);assert.ok(!/data-medical="(medication|restriction|monitoring)"/.test(app));
  assert.ok(fs.readFileSync(path.join(root,'config.js'),'utf8').includes('4.0.0-tanpa-pin'));
});
console.log(`\n${checks} meaningful checks passed. All database writes were isolated in memory.`);

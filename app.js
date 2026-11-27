/* Browser contains no admin password, PIN hashes or private medical database. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = value => Number.isFinite(value) ? value.toFixed(2) : '—';
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const dateLabel = value => value ? new Date(value).toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur', dateStyle: 'short', timeStyle: 'short' }) : '—';
  let roster = [], selected = null, guardianToken = '', adminToken = '', admin = null, editing = null, online = false, currentAction = '', suggestionIndex = -1, matches = [], guardianTimer, adminTimer;
  const message = (id, text, kind = '') => { $(id).innerHTML = text ? `<div class="message ${esc(kind)}">${esc(text)}</div>` : ''; };
  const houseBadge = h => h ? `<span class="badge house-badge ${({ BIRU: 'blue', KUNING: 'yellow', HIJAU: 'green', MERAH: 'red' })[h]}">${esc(h)}</span>` : '—';
  async function api(action, values = {}, get = false) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 95000);
    try {
      const response = await fetch(SKST_CONFIG.apiUrl + (get && action !== 'health' ? `?action=${encodeURIComponent(action)}` : ''), get ? { signal: controller.signal, cache: 'no-store', credentials: 'omit' } : { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, ...values }), signal: controller.signal, redirect: 'follow', credentials: 'omit', cache: 'no-store' });
      if (!response.ok) throw new Error('Sambungan gagal. Sila cuba semula.');
      let result; try { result = await response.json(); } catch (_) { throw new Error('Sambungan sekolah belum sedia. Admin perlu menyemak deployment Apps Script.'); }
      if (!result.ok) throw new Error(typeof result.error === 'string' ? result.error : result.error?.message || 'Permintaan gagal. Admin perlu menyemak sambungan sistem.');
      return result.data;
    } catch (e) { if (e.name === 'AbortError') throw new Error('Pengesahan belum diterima. Input dikekalkan; cuba semula dengan PIN yang sama.'); if (e instanceof TypeError) throw new Error('Sambungan internet atau pelayan tidak dapat dicapai. Sila cuba semula.'); throw e; }
    finally { clearTimeout(timer); }
  }
  async function busy(button, work) { const old = button.textContent; button.disabled = true; button.textContent = 'Sedang diproses…'; try { return await work(); } finally { button.disabled = false; button.textContent = old; } }
  const adminApi = (action, values = {}) => api(action, { token: adminToken, ...values });
  function closeSuggestions() { $('suggestions').hidden = true; $('studentSearch').setAttribute('aria-expanded', 'false'); $('studentSearch').removeAttribute('aria-activedescendant'); }
  function clearGuardian(clearSelection = false) {
    const token = guardianToken; guardianToken = ''; clearTimeout(guardianTimer);
    if (token) api('logout', { token }).catch(() => {});
    $('recordForm').reset(); $('recordForm').hidden = true; $('parentFields').innerHTML = ''; $('houseResult').innerHTML = ''; $('houseResult').hidden = true;
    $('lockedNote').hidden = false; $('guardianPin').value = ''; message('guardianStatus', ''); message('saveStatus', '');
    if (clearSelection) { selected = null; $('selectedStudent').hidden = true; $('pinForm').hidden = true; }
    else $('pinForm').hidden = !selected;
  }
  function chooseStudent(s) {
    clearGuardian(true); selected = s; $('studentSearch').value = s.name; $('selectedName').textContent = s.name; $('selectedGroup').textContent = s.group;
    $('selectedStudent').hidden = false; $('pinForm').hidden = false; $('unlockButton').disabled = !online; closeSuggestions(); $('guardianPin').focus();
  }
  function showSuggestions() {
    const q = $('studentSearch').value.trim().toLocaleUpperCase();
    if (q.length < 2) return closeSuggestions();
    matches = roster.filter(s => s.name.toLocaleUpperCase().includes(q)).slice(0, 30); suggestionIndex = -1;
    $('suggestions').innerHTML = matches.length ? matches.map((s, i) => `<button type="button" role="option" aria-selected="false" id="suggestion-${i}" data-index="${i}">${esc(s.name)}<small>${esc(s.group)}</small></button>`).join('') : '<div class="empty">Tiada padanan. Cuba bahagian nama yang lain.</div>';
    $('suggestions').hidden = false; $('studentSearch').setAttribute('aria-expanded', 'true');
  }
  function fields(prefix) {
    return `<div class="three-cols"><label for="${prefix}-weight">Berat badan (kg)<input id="${prefix}-weight" data-field="weight" type="number" step="any" min="1" max="250" inputmode="decimal" placeholder="Contoh: 25.0" required></label><label for="${prefix}-height">Tinggi (cm)<input id="${prefix}-height" data-field="height" type="number" step="any" min="30" max="250" inputmode="decimal" placeholder="Contoh: 125.0" required></label><label for="${prefix}-date">Tarikh pengukuran<input id="${prefix}-date" data-field="measuredOn" type="date" max="${today()}" required></label></div>
    <p class="hint">Ukur tanpa kasut, di atas permukaan rata. Gunakan penimbang dan alat pengukur tinggi yang sesuai.</p>
    <div class="bmi-preview"><div><b id="${prefix}-bmi">—</b><span>Nilai BMI</span></div><p>Berat ÷ tinggi dalam meter².<br>Nilai ini tidak menentukan tahap kecergasan atau diagnosis kesihatan anak.</p></div>
    <label id="${prefix}-suspicious" class="check-row" hidden><input data-field="measurementConfirmed" type="checkbox">Ukuran ini di luar julat biasa. Saya telah menyemak semula unit dan mengesahkan ukuran yang diisi adalah betul.</label>
    <section class="field-section"><h3>Sejarah perubatan</h3><label for="${prefix}-medical">Adakah anak mempunyai sejarah perubatan, alahan atau keperluan kesihatan yang perlu diketahui pihak sekolah?</label><select id="${prefix}-medical" data-medical="status" required><option value="">Sila pilih jawapan</option><option value="none">Tiada yang diketahui</option><option value="yes">Ada</option></select>
    <div id="${prefix}-conditions" hidden><label>Keadaan yang berkaitan (boleh pilih lebih daripada satu)</label><div class="condition-grid">${BMI_CORE.conditions.map((c, i) => `<label class="check-row"><input type="checkbox" data-condition="${i}" value="${esc(c)}">${esc(c)}</label>`).join('')}</div><label for="${prefix}-detail">Penerangan ringkas bagi semua keadaan yang dipilih</label><textarea id="${prefix}-detail" data-medical="detail" maxlength="1500" placeholder="Nyatakan keadaan, alahan atau maklumat penting untuk sekolah."></textarea></div>
    ${[['medication', 'Adakah anak mengambil ubat secara berkala?'], ['monitoring', 'Adakah anak memerlukan pemantauan atau bantuan khusus?'], ['restriction', 'Adakah terdapat sekatan aktiviti yang telah dimaklumkan doktor?']].map(([key, label]) => `<label for="${prefix}-${key}">${label}</label><select id="${prefix}-${key}" data-medical="${key}" required><option value="">Sila pilih jawapan</option><option value="no">Tidak</option><option value="yes">Ya</option></select><div id="${prefix}-${key}Explanation" hidden><label for="${prefix}-${key}Detail">Penerangan berkaitan</label><textarea id="${prefix}-${key}Detail" data-medical="${key}Detail" maxlength="1500"></textarea></div>`).join('')}</section>
    <label class="check-row consent"><input data-field="consent" type="checkbox" required>Saya mengesahkan maklumat yang diberikan adalah benar dan membenarkan pihak sekolah menggunakannya untuk pengurusan kesihatan murid dan pembahagian rumah sukan.</label>`;
  }
  function readFields(container) {
    const root = $(container), p = { medical: { conditions: [] } };
    root.querySelectorAll('[data-field]').forEach(e => { p[e.dataset.field] = e.type === 'checkbox' ? e.checked : e.value; });
    root.querySelectorAll('[data-medical]').forEach(e => { p.medical[e.dataset.medical] = e.value; });
    p.medical.conditions = [...root.querySelectorAll('[data-condition]:checked')].map(e => e.value);
    return p;
  }
  function fillFields(container, record) {
    if (!record) return;
    const root = $(container);
    root.querySelectorAll('[data-field]').forEach(e => { if (e.type === 'checkbox') e.checked = !!record[e.dataset.field]; else e.value = record[e.dataset.field] ?? ''; });
    root.querySelectorAll('[data-medical]').forEach(e => e.value = record.medical?.[e.dataset.medical] ?? '');
    root.querySelectorAll('[data-condition]').forEach(e => e.checked = record.medical?.conditions?.includes(e.value));
  }
  function syncFields(prefix, container) {
    const p = readFields(container), w = Number(p.weight), h = Number(p.height);
    $(prefix + '-bmi').textContent = w > 0 && h > 0 ? fmt(w / (h / 100) ** 2) : '—';
    $(prefix + '-suspicious').hidden = !(w > 0 && h > 0 && BMI_CORE.suspicious(w, h));
    const yes = p.medical.status === 'yes'; $(prefix + '-conditions').hidden = !yes; $(prefix + '-detail').required = yes;
    ['medication', 'monitoring', 'restriction'].forEach(key => { const yes = p.medical[key] === 'yes'; $(prefix + '-' + key + 'Explanation').hidden = !yes; $(prefix + '-' + key + 'Detail').required = yes; });
    if (prefix === 'parent') { let valid = true; try { BMI_CORE.validate(p, today()); } catch (_) { valid = false; } $('submitRecord').disabled = !valid || !guardianToken || !online; }
  }
  function showGuardian(data) {
    $('parentFields').innerHTML = fields('parent'); fillFields('parentFields', data.record); syncFields('parent', 'parentFields');
    $('pinForm').hidden = true; $('lockedNote').hidden = true; $('recordForm').hidden = false;
    message('guardianStatus', data.record ? 'Maklumat terdahulu telah dimuatkan. Semak atau kemas kini jika diperlukan.' : 'PIN disahkan. Sila lengkapkan maklumat anak.', 'success');
    $('houseResult').hidden = false;
    $('houseResult').innerHTML = data.house ? `<div class="house-result ${({ BIRU: 'blue', KUNING: 'yellow', HIJAU: 'green', MERAH: 'red' })[data.house]}"><span>Rumah sukan anak</span><b>${esc(data.house)}</b><p>Keputusan telah disahkan oleh pihak sekolah.</p></div>` : '<div class="house-result"><b style="font-size:1rem">Keputusan belum diterbitkan</b><p>Rumah sukan akan dipaparkan selepas semua maklumat lengkap dan keputusan disahkan admin.</p></div>';
  }
  $('studentSearch').addEventListener('input', () => { if (selected) clearGuardian(true); showSuggestions(); });
  $('studentSearch').addEventListener('focus', () => { if (!selected) showSuggestions(); });
  $('suggestions').addEventListener('click', e => { const b = e.target.closest('[data-index]'); if (b) chooseStudent(matches[Number(b.dataset.index)]); });
  $('studentSearch').addEventListener('keydown', e => {
    if (e.key === 'Escape') return closeSuggestions();
    if ($('suggestions').hidden || !matches.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); suggestionIndex = (suggestionIndex + (e.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length; $('suggestions').querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-selected', String(i === suggestionIndex))); $('studentSearch').setAttribute('aria-activedescendant', 'suggestion-' + suggestionIndex); $('suggestion-' + suggestionIndex).scrollIntoView({ block: 'nearest' }); }
    if (e.key === 'Enter' && suggestionIndex >= 0) { e.preventDefault(); chooseStudent(matches[suggestionIndex]); }
  });
  document.addEventListener('click', e => { if (!e.target.closest('.search-wrap')) closeSuggestions(); });
  $('changeStudent').onclick = () => { clearGuardian(true); $('studentSearch').value = ''; $('studentSearch').focus(); };
  $('guardianLogout').onclick = () => clearGuardian(false);
  $('pinForm').onsubmit = async e => {
    e.preventDefault(); if (!selected || !online) return;
    await busy($('unlockButton'), async () => { try {
      const requestedId = selected.id, data = await api('unlock', { studentId: requestedId, pin: $('guardianPin').value });
      if (selected?.id !== requestedId) { api('logout', { token: data.token }).catch(() => {}); return; }
      guardianToken = data.token; $('guardianPin').value = '';
      clearTimeout(guardianTimer); guardianTimer = setTimeout(() => { clearGuardian(false); message('guardianStatus', 'Sesi tamat. Masukkan PIN semula.', 'warning'); }, data.expiresIn * 1000);
      showGuardian(data);
    } catch (e) { message('guardianStatus', e.message, 'error'); } });
  };
  $('parentFields').addEventListener('input', () => syncFields('parent', 'parentFields'));
  $('parentFields').addEventListener('change', () => syncFields('parent', 'parentFields'));
  $('recordForm').onsubmit = async e => {
    e.preventDefault();
    await busy($('submitRecord'), async () => { try {
      const payload = readFields('parentFields'), savedToken = guardianToken; BMI_CORE.validate(payload, today());
      const data = await api('save', { token: savedToken, payload });
      if (guardianToken !== savedToken) return;
      message('saveStatus', data.message, 'success');
      if (data.allocation?.status === 'failed') message('saveStatus', 'Maklumat telah disimpan. Agihan rumah sedang menunggu semakan teknikal admin.', 'success');
    } catch (e) { message('saveStatus', e.message + ' Maklumat pada borang dikekalkan.', 'error'); } });
    if ($('parentFields').children.length) syncFields('parent', 'parentFields');
  };
  function tab(name) { const isAdmin = name === 'admin'; $('parentPanel').hidden = isAdmin; $('adminPanel').hidden = !isAdmin; $('parentTab').classList.toggle('active', !isAdmin); $('adminTab').classList.toggle('active', isAdmin); $('parentTab').setAttribute('aria-current', isAdmin ? 'false' : 'page'); $('adminTab').setAttribute('aria-current', isAdmin ? 'page' : 'false'); }
  $('parentTab').onclick = () => tab('parent'); $('adminTab').onclick = () => tab('admin');
  function dropAdmin() { const token = adminToken; adminToken = ''; admin = null; editing = null; clearTimeout(adminTimer); $('dashboard').hidden = true; $('loginCard').hidden = false; ['metrics', 'groupProgress', 'bmiStats', 'recordsTable', 'houseAnalysis', 'importPreview', 'auditContent', 'editFields', 'swapLeft', 'swapRight', 'allocationInfo', 'printArea', 'editStatus', 'adminStatus', 'editTitle', 'editStudentGroup'].forEach(id => $(id).innerHTML = ''); $('editReason').value = ''; $('actionReason').value = ''; ['recordDialog', 'actionDialog', 'auditDialog'].forEach(id => $(id).close()); if (token) api('logout', { token }).catch(() => {}); }
  $('logoutAdmin').onclick = dropAdmin;
  $('loginForm').onsubmit = async e => {
    e.preventDefault(); if (!online) return message('loginStatus', 'Keperluan pemasangan belum lengkap. Sila lihat semakan pemasangan.', 'error');
    await busy($('loginButton'), async () => { try { const data = await api('login', { username: $('username').value.trim(), password: $('password').value }); adminToken = data.token; $('password').value = ''; clearTimeout(adminTimer); adminTimer = setTimeout(() => { dropAdmin(); message('loginStatus', 'Sesi tamat. Sila log masuk semula.', 'warning'); }, data.expiresIn * 1000); await refresh(); $('loginCard').hidden = true; $('dashboard').hidden = false; message('loginStatus', ''); } catch (e) { message('loginStatus', e.message, 'error'); } });
  };
  async function refresh() { const token = adminToken, data = await adminApi('adminData'); if (!token || token !== adminToken) return; admin = data; renderAdmin(); }
  $('refreshAdmin').onclick = async () => { await busy($('refreshAdmin'), async () => { try { await refresh(); message('adminStatus', 'Paparan telah dikemas kini.', 'success'); } catch (e) { message('adminStatus', e.message, 'error'); } }); };
  function activeRows() { return admin.roster.filter(s => s.active).map(s => ({ ...s, record: admin.records[s.id], house: admin.assignments[s.id], complete: admin.records[s.id] ? BMI_CORE.complete(admin.records[s.id], today()) : false })); }
  function renderAdmin() {
    const rows = activeRows(), complete = rows.filter(s => s.complete), total = rows.length, progress = admin.progress;
    $('metrics').innerHTML = [[total, 'Murid aktif', ''], [progress.complete, 'Rekod lengkap', ''], [total - progress.complete, 'Belum lengkap', 'accent'], [fmt(progress.percent) + '%', 'Pengisian keseluruhan', '']].map(([n, l, c]) => `<div class="metric ${c}"><span class="metric-number">${n}</span><small>${l}</small></div>`).join('');
    const staged = admin.roster.filter(s => !s.active);
    $('importPreview').hidden = !staged.length;
    if (staged.length) { const groups = [...new Set(staged.map(s => s.group))]; $('importPreview').innerHTML = `<span class="eyebrow blue-text">PRATONTON DAFTAR INDUK</span><h3>${staged.length} murid sedia untuk disahkan</h3><p>${groups.map(g => esc(g) + ': ' + staged.filter(s => s.group === g).length).join(' · ')}</p><div class="preview-list"><table><thead><tr><th>Nama</th><th>Kumpulan</th></tr></thead><tbody>${staged.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(s.group)}</td></tr>`).join('')}</tbody></table></div><p class="hint">Semak senarai ini sebelum mengaktifkan borang ibu bapa.</p><button type="button" id="activateRoster" class="button">Sahkan & Aktifkan ${staged.length} Murid</button>`; $('activateRoster').onclick = async () => { await busy($('activateRoster'), async () => { try { admin = await adminApi('activate', { expectedCount: staged.length }); renderAdmin(); roster = await api('roster', {}, true); message('adminStatus', 'Senarai murid telah diaktifkan. PIN boleh diedarkan secara peribadi.', 'success'); } catch (e) { message('adminStatus', e.message, 'error'); } }); }; }
    const groups = [...new Set(rows.map(s => s.group))].sort();
    $('groupProgress').innerHTML = groups.map(g => { const a = rows.filter(s => s.group === g), done = a.filter(s => s.complete).length; return `<div class="group-row"><span>${esc(g)}</span><div class="bar"><span style="width:${done / a.length * 100}%"></span></div><b>${done} / ${a.length}</b></div>`; }).join('') || '<p class="hint">Aktifkan senarai induk terlebih dahulu.</p>';
    $('completionLabel').textContent = `${progress.complete} / ${total}`;
    const values = complete.map(s => s.record.bmi).sort((a, b) => a - b), cuts = [.25, .5, .75].map(p => BMI_CORE.quantile(values, p));
    const bins = [0, 0, 0, 0]; values.forEach(v => bins[v <= cuts[0] ? 0 : v <= cuts[1] ? 1 : v <= cuts[2] ? 2 : 3]++);
    const health = complete.filter(s => s.record.medical.status === 'yes').length, support = complete.filter(s => s.record.medical.monitoring === 'yes' || s.record.medical.restriction === 'yes').length;
    $('bmiStats').innerHTML = `<div class="stat-row"><div><b>${values.length ? fmt(values.reduce((a, b) => a + b, 0) / values.length) : '—'}</b><span>Purata BMI</span></div><div><b>${fmt(BMI_CORE.median(values))}</b><span>Median BMI</span></div></div>${bins.map((count, i) => `<div class="quartile-row"><span>Q${i + 1}</span><div class="bar"><span style="width:${values.length ? count / values.length * 100 : 0}%"></span></div><small>${count} murid</small></div>`).join('')}<p class="hint">Sempadan Q1 / Q2 / Q3: ${cuts.map(fmt).join(' / ')}. Nilai seri boleh menyebabkan bilangan kuartil berbeza.</p><p class="hint"><b>${health}</b> melaporkan sejarah perubatan · <b>${support}</b> memerlukan pemantauan atau sekatan aktiviti.</p>`;
    const st = admin.state, pendingReview = st.acceptedRevision !== st.revision;
    $('allocationTag').textContent = admin.run ? (st.currentRun === st.publishedRun ? 'Telah diterbitkan' : 'Draf untuk semakan') : 'Menunggu maklumat';
    $('allocationInfo').innerHTML = admin.run ? `<p>Agihan: <b>${esc(admin.run.id)}</b><br><span class="hint">Benih: ${esc(admin.run.seed)} · Algoritma: ${esc(admin.run.version)}</span></p>${pendingReview ? '<div class="message warning">Data atau agihan berubah. Semak analisis terkini dan sahkan semakan sebelum menerbitkan keputusan.</div>' : '<p class="hint">Draf telah melepasi semakan kelengkapan. Semak perbandingan rumah sebelum diterbitkan.</p>'}` : `<p>Agihan automatik bermula selepas <b>semua ${total} murid aktif</b> melengkapkan maklumat. Setakat ini: ${progress.complete} lengkap.</p>${st.generationError ? `<div class="message error">${esc(st.generationError)}</div>` : ''}`;
    $('generate').disabled = !total || progress.complete !== total; $('review').disabled = !admin.run || progress.complete !== total; $('publish').disabled = !admin.run || pendingReview || progress.complete !== total; $('swap').disabled = !admin.run;
    const analysis = admin.analysis;
    if (analysis) {
      const h = analysis.houses, gap = key => Math.max(...h.map(s => s[key])) - Math.min(...h.map(s => s[key]));
      $('houseAnalysis').innerHTML = `<table><thead><tr><th>Rumah</th><th>Ahli</th><th>Purata BMI</th><th>Median BMI</th><th>Q1 / Q2 / Q3 / Q4</th><th>Sejarah perubatan</th><th>Perlu sokongan</th><th>Pecahan kumpulan</th></tr></thead><tbody>${h.map(s => `<tr><td>${houseBadge(s.house)}</td><td>${s.count}</td><td>${fmt(s.mean)}</td><td>${fmt(s.median)}</td><td>${s.quartiles.join(' / ')}</td><td>${s.medical}</td><td>${s.support}</td><td>${Object.keys(s.groups).sort().map(g => esc(g.replace('KUMPULAN ', 'K')) + ': ' + s.groups[g]).join(' · ')}</td></tr>`).join('')}</tbody></table><p class="hint">Perbezaan maksimum antara rumah: ${gap('count')} ahli · ${fmt(gap('mean'))} purata BMI · ${gap('medical')} sejarah perubatan · ${gap('support')} keperluan sokongan. Sempadan kuartil semasa: ${analysis.cuts.map(fmt).join(' / ')}. Keseimbangan sempurna mungkin tidak dapat dicapai.</p>`;
    } else $('houseAnalysis').innerHTML = '';
    const oldGroup = $('groupFilter').value; $('groupFilter').innerHTML = '<option value="">Semua kumpulan</option>' + groups.map(g => `<option>${esc(g)}</option>`).join(''); $('groupFilter').value = oldGroup;
    renderRows();
  }
  function filteredRows() {
    const q = $('adminSearch').value.toUpperCase(), g = $('groupFilter').value, status = $('statusFilter').value, support = $('supportFilter').value, house = $('houseFilter').value;
    return activeRows().filter(s => { const needs = s.record?.medical?.monitoring === 'yes' || s.record?.medical?.restriction === 'yes'; return s.name.toUpperCase().includes(q) && (!g || s.group === g) && (!status || s.complete === (status === 'complete')) && (!support || (support === 'yes' ? needs : s.complete && !needs)) && (!house || s.house === house); });
  }
  function renderRows() {
    const rows = filteredRows(); $('rowCount').textContent = `${rows.length} murid`;
    $('recordsTable').innerHTML = `<table><thead><tr><th>Nama murid</th><th>Kumpulan</th><th>Berat (kg)</th><th>Tinggi (cm)</th><th>BMI</th><th>Pengisian</th><th>Kesihatan</th><th>Rumah</th><th>Kemas kini</th></tr></thead><tbody>${rows.map(s => `<tr><td><button type="button" class="text-button" data-edit="${esc(s.id)}">${esc(s.name)}</button></td><td>${esc(s.group)}</td><td>${s.record ? esc(s.record.weight) : '—'}</td><td>${s.record ? esc(s.record.height) : '—'}</td><td>${fmt(s.record?.bmi)}</td><td><span class="badge ${s.complete ? 'complete' : 'pending'}">${s.complete ? 'Lengkap' : 'Belum lengkap'}</span></td><td>${s.record ? (s.record.medical.status === 'yes' ? 'Ada sejarah' : 'Tiada diketahui') + (s.record.medical.monitoring === 'yes' || s.record.medical.restriction === 'yes' ? ' · Perlu sokongan' : '') : '—'}</td><td>${houseBadge(s.house)}</td><td>${dateLabel(s.record?.updatedAt)}</td></tr>`).join('')}</tbody></table>${rows.length ? '' : '<p class="hint">Tiada rekod sepadan dengan penapis.</p>'}`;
  }
  ['adminSearch', 'groupFilter', 'statusFilter', 'supportFilter', 'houseFilter'].forEach(id => $(id).addEventListener('input', renderRows));
  $('recordsTable').onclick = e => {
    const b = e.target.closest('[data-edit]'); if (!b) return; editing = b.dataset.edit;
    const s = admin.roster.find(s => s.id === editing); $('editTitle').textContent = s.name; $('editStudentGroup').textContent = s.group; $('editFields').innerHTML = fields('edit'); fillFields('editFields', admin.records[editing]); syncFields('edit', 'editFields'); $('editReason').value = ''; message('editStatus', ''); $('recordDialog').showModal();
  };
  $('editFields').addEventListener('input', () => syncFields('edit', 'editFields')); $('editFields').addEventListener('change', () => syncFields('edit', 'editFields'));
  $('editForm').onsubmit = async e => { e.preventDefault(); await busy(e.submitter, async () => { try { await adminApi('adminSave', { studentId: editing, payload: readFields('editFields'), reason: $('editReason').value }); await refresh(); $('recordDialog').close(); message('adminStatus', 'Pembetulan disimpan dan direkodkan dalam log audit.', 'success'); } catch (e) { message('editStatus', e.message, 'error'); } }); };
  $('resetPin').onclick = async () => { await busy($('resetPin'), async () => { try { const result = await adminApi('resetPin', { studentId: editing, reason: $('editReason').value }); message('editStatus', `PIN baharu: ${result.pin}. Edarkan hanya kepada penjaga murid ini. PIN terdahulu tidak lagi sah.`, 'success'); } catch (e) { message('editStatus', e.message, 'error'); } }); };
  document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => $(b.dataset.close).close());
  function showAction(action) {
    currentAction = action; const descriptions = { generate: ['Jana agihan rumah', 'Agihan baharu akan disimpan sebagai draf. Keputusan sedia terbit kekal sehingga draf baharu diterbitkan.'], review: ['Sahkan semakan analisis', 'Sahkan bahawa rekod, taburan BMI dan keperluan sokongan setiap rumah telah disemak.'], publish: ['Terbitkan keputusan', 'Rumah sukan yang disahkan akan boleh dilihat oleh penjaga menggunakan PIN masing-masing.'], swap: ['Tukar pasangan murid', 'Pilih dua murid daripada rumah berbeza. Kapasiti rumah dikekalkan dan draf baharu memerlukan semakan.'] };
    $('actionTitle').textContent = descriptions[action][0]; $('actionDescription').textContent = descriptions[action][1]; $('actionReason').value = ''; message('actionStatus', ''); $('swapFields').hidden = action !== 'swap';
    if (action === 'swap') { const options = activeRows().map(s => `<option value="${esc(s.id)}">${esc(s.name)} · ${esc(s.house)}</option>`).join(''); $('swapLeft').innerHTML = options; $('swapRight').innerHTML = options; }
    $('actionDialog').showModal();
  }
  ['generate', 'review', 'publish', 'swap'].forEach(action => $(action).onclick = () => showAction(action));
  $('actionForm').onsubmit = async e => { e.preventDefault(); await busy(e.submitter, async () => { try { await adminApi(currentAction, { reason: $('actionReason').value, left: $('swapLeft').value, right: $('swapRight').value }); await refresh(); $('actionDialog').close(); message('adminStatus', 'Tindakan berjaya disimpan.', 'success'); } catch (e) { message('actionStatus', e.message, 'error'); } }); };
  function csv(name, headers, rows) {
    const cell = v => { let s = String(v ?? ''); if (/^[\s]*[=+@-]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const blob = new Blob(['\ufeff' + [headers, ...rows].map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $('exportRecords').onclick = () => csv('SKST_2027_REKOD_TERHAD.csv', ['StudentID', 'Nama', 'Kumpulan', 'Berat kg', 'Tinggi cm', 'BMI', 'Tarikh ukur', 'Status', 'Rumah', 'Sejarah perubatan', 'Keadaan', 'Penerangan', 'Ubat', 'Ubat detail', 'Pemantauan', 'Pemantauan detail', 'Sekatan', 'Sekatan detail', 'Dikemas kini'], filteredRows().map(s => { const r = s.record || {}, m = r.medical || {}; return [s.id, s.name, s.group, r.weight, r.height, r.bmi, r.measuredOn, s.complete ? 'Lengkap' : 'Belum lengkap', s.house, m.status, (m.conditions || []).join('; '), m.detail, m.medication, m.medicationDetail, m.monitoring, m.monitoringDetail, m.restriction, m.restrictionDetail, r.updatedAt]; }));
  $('exportHouses').onclick = () => { if (!admin.run) return message('adminStatus', 'Agihan belum dijana.', 'warning'); csv('SKST_2027_SENARAI_RUMAH.csv', ['Nama', 'Kumpulan', 'Rumah Sukan'], filteredRows().map(s => [s.name, s.group, s.house])); };
  $('exportPins').onclick = async () => { await busy($('exportPins'), async () => { try { const pins = await adminApi('pins'); csv('SKST_2027_PIN_PENJAGA_SULIT.csv', ['Nama', 'Kumpulan', 'PIN'], pins.map(s => [s.name, s.group, s.pin])); message('adminStatus', 'Fail PIN dimuat turun. Edarkan setiap PIN hanya kepada penjaga yang berkenaan.', 'success'); } catch (e) { message('adminStatus', e.message, 'error'); } }); };
  $('printHouses').onclick = () => {
    if (!admin.run) return message('adminStatus', 'Agihan belum dijana.', 'warning');
    const rows = filteredRows(); $('printArea').innerHTML = `<img src="assets/lencana-skst.png" alt="Lencana SKST"><h1>Senarai Rumah Sukan Tahun 1 Sesi 2027</h1><p>SK Sungai Tiram · ${admin.state.publishedRun === admin.state.currentRun ? 'Keputusan disahkan' : 'DRAF UNTUK SEMAKAN'} · ${new Date().toLocaleDateString('ms-MY')}</p>${BMI_CORE.houses.map(h => `<h2>RUMAH ${h} (${rows.filter(s => s.house === h).length} murid)</h2><table><thead><tr><th>Bil.</th><th>Nama Murid</th><th>Kumpulan</th><th>Rumah</th></tr></thead><tbody>${rows.filter(s => s.house === h).map((s, i) => `<tr><td>${i + 1}</td><td>${esc(s.name)}</td><td>${esc(s.group)}</td><td>${h}</td></tr>`).join('')}</tbody></table>`).join('')}`;
    window.print();
  };
  $('viewAudit').onclick = async () => { await busy($('viewAudit'), async () => { try { const rows = await adminApi('audit'); $('auditContent').innerHTML = `<p class="hint">300 tindakan terkini. Rekod penuh dan butiran perubahan berada di tab SKST27_AUDIT.</p><table><thead><tr><th>Tarikh</th><th>Pelaku</th><th>Tindakan</th><th>Murid</th><th>Sebab</th></tr></thead><tbody>${rows.map(r => `<tr><td>${dateLabel(r.date)}</td><td>${esc(r.actor)}</td><td>${esc(r.action)}</td><td>${esc(admin.roster.find(s => s.id === r.id)?.name || r.id)}</td><td>${esc(r.reason)}</td></tr>`).join('')}</tbody></table>`; $('auditDialog').showModal(); } catch (e) { message('adminStatus', e.message, 'error'); } }); };
  async function start() {
    $('unlockButton').disabled = true;
    const local = fetch('assets/students.json', { cache: 'no-cache' }).then(r => r.json()).then(data => { roster = data; }).catch(() => {});
    try { const status = await api('health', {}, true); online = status.api === 'SKST_BMI' && status.version === SKST_CONFIG.requiredVersion && status.configured === true;
      $('backendDetails').textContent = `Versi backend: ${status.version || 'tidak diketahui'}. Versi diperlukan: ${SKST_CONFIG.requiredVersion}. Pemasangan: ${status.configured ? 'sedia' : 'belum lengkap'}.`;
      if (!online) throw new Error('Sistem belum diaktifkan oleh pihak sekolah. Carian nama tersedia; penghantaran dibuka selepas pemasangan selesai.');
      const current = await api('roster', {}, true); await local; roster = current;
      if (!roster.length) { $('connection').className = 'connection warning'; $('connection').textContent = 'Senarai murid menunggu pengesahan admin. Borang akan dibuka selepas senarai diaktifkan.'; }
      else { $('connection').className = 'connection ready'; $('connection').textContent = 'Sistem sedia · Maklumat anak dilindungi dengan PIN penjaga.'; }
    } catch (e) { $('connection').className = 'connection warning'; $('connection').textContent = e.message; if ($('backendDetails').textContent === 'Sambungan sedang disemak.') $('backendDetails').textContent = e.message; }
    await local; $('unlockButton').disabled = !online;
  }
  start();
})();

'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function newRequestId(){return window.crypto?.randomUUID?window.crypto.randomUUID():'req-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);}
const money=n=>n===null||n===undefined||n===''||S.preorder?'N/A':'RM '+Number(n).toFixed(2);
const studentKey=o=>String(o.name||'').trim().replace(/\s+/g,' ').toUpperCase();
const active=o=>o.status!=='Dibatalkan';
const delivered=o=>o.items.length>0&&o.items.every(i=>i.delivered);
let S={school:'SK Sungai Tiram',logo:'',price:null,preorder:true,priceStatus:'pending',classes:[],sizes:['28','30','32','34','36','38','40','42','44','46'].map(size=>({size,active:true})),products:[{id:'krmj',name:'Baju KRMJ',price:null,priceStatus:'pending',active:true}],isOpen:false,allowEdit:true},orders=[],token='',editing=null,teacherNew=false,wanted='teacher',deliveryFilter='all',requestId=newRequestId(),lastActive=Date.now(),currentView='order',lookupOrders=[];
let orderBusy=false,backendReady=false,connectionError='',publicRequest=null,pendingReview=null;
const ROSTER=Array.isArray(window.STUDENT_ROSTER?.groups)?window.STUDENT_ROSTER.groups:[];
const ROSTER_GROUPS=ROSTER.map(g=>g.name);
const STUDENTS=ROSTER.flatMap(g=>g.students.map((name,n)=>({name,group:g.name,number:n+1})));
function groupOptions(){return [...new Set([...ROSTER_GROUPS,...S.classes,'Belum ditetapkan'])];}
function nameKey(name){return String(name||'').trim().replace(/\s+/g,' ').toUpperCase();}
function exactPupil(name){return STUDENTS.find(s=>nameKey(s.name)===nameKey(name));}
function createNamePicker(inputId,listId,groupId,wrapperId,onChange){
 const input=$('#'+inputId),list=$('#'+listId),group=$('#'+groupId),wrapper=$('#'+wrapperId);
 let selected=null,matches=[],cursor=-1;
 function hide(){list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');}
 function choose(student){selected=student;input.value=student.name;group.value=student.group;wrapper.hidden=false;hide();if(onChange)onChange(student);}
 function clearSelection(){selected=null;group.value='';wrapper.hidden=true;if(onChange)onChange(null);}
 function draw(){
  clearSelection();const q=nameKey(input.value);cursor=-1;
  if(q.length<2){hide();return;}
  matches=STUDENTS.filter(s=>nameKey(s.name).includes(q)).slice(0,20);
  list.innerHTML=matches.length?matches.map((s,n)=>'<button type="button" role="option" aria-selected="false" id="'+listId+'-'+n+'" data-suggestion="'+n+'">'+esc(s.name)+'</button>').join(''):'<p>Tiada nama sepadan. Cuba taip sebahagian nama lain.</p>';
  list.hidden=false;input.setAttribute('aria-expanded','true');
  list.querySelectorAll('[data-suggestion]').forEach(b=>{b.onmousedown=e=>e.preventDefault();b.onclick=()=>choose(matches[Number(b.dataset.suggestion)]);});
 }
 input.addEventListener('input',draw);
 input.addEventListener('change',()=>{const s=exactPupil(input.value);if(s)choose(s);});
 input.addEventListener('keydown',e=>{
  if(e.key==='Escape'){hide();return;}
  if(list.hidden)return;
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
   e.preventDefault();if(!matches.length)return;cursor=(cursor+(e.key==='ArrowDown'?1:-1)+matches.length)%matches.length;
   list.querySelectorAll('[data-suggestion]').forEach((b,n)=>b.setAttribute('aria-selected',String(n===cursor)));input.setAttribute('aria-activedescendant',listId+'-'+cursor);return;
  }
  if(e.key==='Enter'){e.preventDefault();if(cursor>=0)choose(matches[cursor]);else if(matches.length===1)choose(matches[0]);}
 });
 document.addEventListener('click',e=>{if(!input.closest('.name-picker').contains(e.target))hide();});
 return {get:()=>selected,set:(name,legacyGroup)=>{const s=exactPupil(name);if(s)choose(s);else if(name&&legacyGroup)choose({name,group:legacyGroup,legacy:true});else {input.value='';clearSelection();hide();}},reset:()=>{input.value='';clearSelection();hide();},acceptExact:()=>{const s=exactPupil(input.value);if(s)choose(s);return selected;}};
}
const orderPicker=createNamePicker('studentName','studentSuggestions','classes','groupField',()=>{if(!orderBusy){closeReview();orderFeedback('');}});
const lookupPicker=createNamePicker('lookupStudent','lookupSuggestions','lookupClass','lookupGroupField',()=>{$('#lookupResults').innerHTML='';$('#receipt').innerHTML='';});

function normalize(o){return {...o,studentId:o.studentId||studentKey(o),revision:Number(o.revision||0),paymentMethod:o.paymentMethod||'',items:o.items.map((i,n)=>({...i,id:i.id||'line-'+n,productId:['sukan','krmj'].includes(i.productId)||!i.productId?'krmj':i.productId,productName:['sukan','krmj'].includes(i.productId)||!i.productId?'Baju KRMJ':i.productName,unitPrice:i.unitPrice===null?null:i.unitPrice??o.unitPrice??null,paid:!!i.paid,delivered:!!i.delivered}))};}
function message(s){$('#notice').textContent=s;if(s)$('#notice').scrollIntoView({behavior:'smooth',block:'nearest'});}
async function api(action,data={}){
 if(!APP_CONFIG.apiUrl)throw Error('Sambungan sistem belum ditetapkan.');
 if(!navigator.onLine)throw Error('Tiada internet. Sambung internet dan cuba semula. Maklumat borang dikekalkan.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try{
  const response=await fetch(APP_CONFIG.apiUrl,{method:'POST',body:new URLSearchParams({payload:JSON.stringify({action,token,...data})}),redirect:'follow',signal:controller.signal});
  const raw=await response.text();let r;
  try{r=JSON.parse(raw);}catch{throw Error('Sambungan Apps Script belum sedia. Sila hubungi admin sekolah.');}
  if(!r.ok){if(/Sesi admin/.test(r.error))logoutLocal();throw Error(r.error||'Permintaan gagal.');}
  return r.data;
 }catch(e){
  if(e.name==='AbortError')throw Error('Sambungan mengambil masa terlalu lama. Cuba semula. Maklumat borang dikekalkan.');
  if(e instanceof TypeError)throw Error('Tidak dapat menyambung. Semak internet dan cuba semula. Maklumat borang dikekalkan.');
  throw e;
 }finally{clearTimeout(timer);}
}
function orderFeedback(text){const el=$('#submitFeedback');el.textContent=text;el.hidden=!text;if(text){el.focus();el.scrollIntoView({behavior:'smooth',block:'center'});}}
function availabilityReason(){
 if(!backendReady)return connectionError||'Status tempahan belum dapat disahkan. Tekan Semak Semula Sambungan.';
 if(S.isOpen)return 'Tempahan dibuka. Pilih saiz dan lengkapkan borang untuk membuat tempahan.';
 if(!S.open)return 'Tempahan sedang ditutup oleh pihak sekolah. Hubungi sekolah atau semak semula kemudian.';
 if(!S.sizesReady)return 'Tempahan belum dibuka: carta ukuran sedang disahkan oleh pihak sekolah.';
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 if(S.opens&&today<S.opens)return 'Tempahan akan dibuka pada '+S.opens+'.';
 if(S.closes&&today>S.closes)return 'Tempahan telah ditutup pada '+S.closes+'.';
 return 'Tempahan belum dibuka atau telah ditutup. Hubungi pihak sekolah.';
}
function syncOrderControls(){
 $('#submitOrder').disabled=orderBusy;
 $('#confirmSubmit').disabled=orderBusy;
 $('#backToEdit').disabled=orderBusy;
 $('#cancelEdit').disabled=orderBusy;
 $('#addItem').disabled=orderBusy;
 $('#retryConnection').disabled=orderBusy;
 $('#openOrderSettings').hidden=!token;
 $('#availabilityText').textContent=availabilityReason();
 $('#orderAvailability').classList.toggle('available',backendReady&&S.isOpen);
 if(!orderBusy)$('#submitOrder').textContent=editing?'Semak Pembetulan':'Semak & Hantar Tempahan';
 $('#confirmSubmit').textContent=orderBusy?'Sedang Memproses...':'Sahkan & Hantar Tempahan';
}
function setOrderBusy(value,label){orderBusy=value;syncOrderControls();if(value&&label)$('#submitOrder').textContent=label;$('#orderForm').setAttribute('aria-busy',String(value));}
async function refreshPublic(){
 if(publicRequest)return publicRequest;
 publicRequest=(async()=>{try{
  const r=await api('public');
  if(Number(r?.version)!==4||!Array.isArray(r.products)||!Array.isArray(r.sizes))throw Error('Kemas kini Code.gs kepada versi 4 dan deploy versi baharu untuk preorder tanpa nombor pengenalan.');
  S=r;backendReady=true;connectionError='';populate();return r;
 }catch(e){backendReady=false;connectionError=e.message;syncOrderControls();throw e;}})();
 try{return await publicRequest;}finally{publicRequest=null;}
}
$('#retryConnection').onclick=async()=>{if(orderBusy)return;setOrderBusy(true,'Menyemak Sambungan...');try{await refreshPublic();orderFeedback(S.isOpen?'Sambungan berjaya. Tempahan dibuka.':availabilityReason());}catch(e){orderFeedback(e.message);}finally{setOrderBusy(false);}};
$('#openOrderSettings').onclick=()=>{go('reports');const f=$('#settingsForm');f.closest('details').open=true;f.elements.open.focus();f.scrollIntoView({behavior:'smooth',block:'start'});};
function validateOrder(){
 const f=$('#orderForm');f.querySelectorAll('[aria-invalid]').forEach(e=>e.removeAttribute('aria-invalid'));
 if(!orderPicker.get()&&!orderPicker.acceptExact()){orderFeedback('Taip dan pilih nama murid daripada cadangan terlebih dahulu.');$('#studentName').focus();return false;}
 for(const el of f.elements){
  if(el.willValidate&&!el.checkValidity()){
   const label=el.closest('label')?.firstChild?.textContent?.trim()||'maklumat borang';
   const text=el.id==='orderConsent'?'Sila tandakan pengesahan maklumat dan saiz tempahan.':'Sila lengkapkan '+label.toLowerCase()+' dengan maklumat yang sah.';
   el.setAttribute('aria-invalid','true');orderFeedback(text);el.focus();el.scrollIntoView({behavior:'smooth',block:'center'});return false;
  }
 }
 const phone=f.elements.phone.value.replace(/\D/g,'').replace(/^60/,'0');
 if(!/^0\d{8,11}$/.test(phone)){orderFeedback('Sila masukkan nombor telefon penjaga yang sah. Contoh: 0123456789.');f.elements.phone.setAttribute('aria-invalid','true');f.elements.phone.focus();return false;}
 return true;
}
function setOptions(el,values,placeholder,keep=true){const val=el.value;el.innerHTML=(placeholder?'<option value="">'+esc(placeholder)+'</option>':'')+values.map(v=>typeof v==='string'?'<option>'+esc(v)+'</option>':'<option value="'+esc(v.id)+'">'+esc(v.name)+'</option>').join('');if(keep&&val){el.value=[...el.options].some(o=>o.value===val)?val:'';}}
function table(headers,rows){return '<div class="scroll"><table><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
function go(id){if(['teacher','records','reports'].includes(id)&&!token){wanted=id;id='admin';}currentView=id;document.querySelectorAll('.view').forEach(e=>e.hidden=e.id!==id);document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===id));message('');}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>go(b.dataset.view));$('#adminBtn').onclick=()=>go(token?'reports':'admin');$('#showPassword').onchange=e=>$('#password').type=e.target.checked?'text':'password';
$('#openChart').onclick=()=>$('#chartDialog').showModal();
function populate(){
 $('#schoolName').textContent=S.school;$('#schoolLogo').src=S.logo||'assets/lencana.png';const classes=groupOptions();
 for(const id of ['teacherClass','recordClass','reportClass'])setOptions($('#'+id),classes,'Semua Kumpulan / Kelas');setOptions($('#reportProduct'),S.products,'Semua Item');
 $('#priceInfo').innerHTML='<p>'+esc(S.instructions||'')+'</p>'+table(['Item','Harga sehelai'],S.products.filter(p=>p.active).map(p=>[esc(p.name),money(p.price)]))+'<p class="muted">'+(S.isOpen?'Tempahan dibuka.':'Tempahan belum dibuka atau telah ditutup.')+(S.closes?' Tarikh tutup: '+esc(S.closes):'')+'</p>';
 if(!$('#items').children.length)addItem();
 else {$('#items').querySelectorAll('.line').forEach(line=>{setOptions(line.querySelector('.product'),S.products.filter(p=>p.active));setOptions(line.querySelector('.size'),S.sizes.filter(z=>z.active).map(z=>z.size));});total();}
 syncOrderControls();
}
function addItem(item){
 closeReview();
 const line=document.createElement('div');line.className='line';line.innerHTML='<label>Item<select class="product" required></select></label><label>Saiz<select class="size" required></select></label><label>Kuantiti<input class="qty" type="number" min="1" max="100" step="1" value="1" required></label><button type="button" aria-label="Buang item">Buang</button>';
 setOptions(line.querySelector('.product'),S.products.filter(p=>p.active));setOptions(line.querySelector('.size'),S.sizes.filter(s=>s.active).map(s=>s.size));$('#items').append(line);if(item){line.querySelector('.product').value=item.productId;line.querySelector('.size').value=item.size;line.querySelector('.qty').value=item.qty;}
 line.oninput=total;line.querySelector('button').onclick=()=>{if($('#items').children.length>1){closeReview();line.remove();total();}};total();
}
function getItems(){return [...document.querySelectorAll('#items .line')].map(l=>({productId:l.querySelector('.product').value,size:l.querySelector('.size').value,qty:Number(l.querySelector('.qty').value)}));}
function total(){const a=getItems(),qty=a.reduce((n,i)=>n+i.qty,0),cost=a.reduce((n,i)=>n+i.qty*(S.products.find(p=>p.id===i.productId)?.price||0),0);$('#total').textContent=qty+' helai · '+money(cost);}
$('#addItem').onclick=()=>addItem();
function resetOrder(){pendingReview=null;$('#reviewPanel').hidden=true;orderFeedback('');$('#items').innerHTML='';editing=null;teacherNew=false;requestId=newRequestId();$('#orderForm').reset();orderPicker.reset();$('#studentName').readOnly=false;$('#formTitle').textContent='Tempahan Baju KRMJ Tahun 1 2027';$('#submitOrder').textContent='Semak & Hantar Tempahan';$('#cancelEdit').hidden=true;populate();}
function editOrder(o,admin){editing={...o,admin};teacherNew=false;go('order');orderPicker.set(o.name,o.className);for(const k of ['guardian','phone','notes'])$('#orderForm').elements[k].value=o[k]||'';$('#studentName').readOnly=!admin;$('#items').innerHTML='';o.items.forEach(addItem);$('#formTitle').textContent='Sunting Preorder '+o.ref;syncOrderControls();$('#cancelEdit').hidden=false;message('Harga N/A semasa preorder. Semak saiz dan kuantiti sebelum menyimpan pembetulan.');}
$('#teacherCreate').onclick=()=>{resetOrder();teacherNew=true;go('order');$('#formTitle').textContent='Tempahan Murid oleh Guru';syncOrderControls();$('#cancelEdit').hidden=false;};$('#cancelEdit').onclick=()=>{resetOrder();go(token?'teacher':'order');};
async function busy(element,fn){const buttons=[...element.querySelectorAll('button')],old=buttons.map(b=>b.disabled);buttons.forEach(b=>b.disabled=true);try{await fn();}catch(e){message(e.message);}finally{buttons.forEach((b,i)=>{if(b.isConnected)b.disabled=old[i];});}}
function closeReview(){pendingReview=null;$('#reviewPanel').hidden=true;}
$('#backToEdit').onclick=()=>{if(orderBusy)return;closeReview();$('#submitOrder').focus();};
$('#orderForm').addEventListener('input',()=>{if(!orderBusy){closeReview();orderFeedback('');}});
$('#orderForm').onsubmit=async e=>{
 e.preventDefault();if(orderBusy)return;closeReview();orderFeedback('');if(!validateOrder())return;
 setOrderBusy(true,'Menyemak Tempahan...');
 try{
  await refreshPublic();if(!validateOrder())return;
  if(!(teacherNew||editing?.admin)&&!S.isOpen){orderFeedback(availabilityReason());return;}
  const d={...Object.fromEntries(new FormData(e.target)),items:getItems()};
  pendingReview={data:d,editing:editing?{...editing}:null,teacherNew,requestId};
  $('#reviewSummary').innerHTML=table(['Maklumat','Butiran'],[['Nama murid',esc(d.name)],['Kumpulan / kelas',esc(d.className)],['Penjaga',esc(d.guardian)],['Telefon',esc(d.phone)]])+table(['Item','Saiz','Kuantiti','Jumlah'],d.items.map(i=>{const p=S.products.find(p=>p.id===i.productId);return [esc(p?.name||''),esc(i.size),i.qty,money(i.qty*(p?.price||0))];}))+'<p class="total">'+esc($('#total').textContent)+'</p>';
  $('#reviewPanel').hidden=false;$('#reviewTitle').focus();$('#reviewPanel').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){orderFeedback(e.message);}finally{setOrderBusy(false);}
};
$('#confirmSubmit').onclick=async()=>{
 if(orderBusy||!pendingReview)return;
 const snapshot=pendingReview;setOrderBusy(true,'Sedang Menghantar...');orderFeedback('');
 try{
  const ed=snapshot.editing;let o;
  if(ed)o=await api(ed.admin?'adminEdit':'parentEdit',{ref:ed.ref,phone:ed.phone,revision:ed.revision,order:snapshot.data});
  else o=await api(snapshot.teacherNew?'adminCreate':'create',{...snapshot.data,requestId:snapshot.requestId});
  if(!o?.ref||!Array.isArray(o.items))throw Error('Pengesahan simpanan belum diterima. Cuba semula menggunakan borang yang sama.');
  o=normalize(o);resetOrder();go('lookup');showReceipt(o);message('Tempahan berjaya disimpan. Nombor rujukan: '+o.ref);
  if(token){try{await loadAdmin();}catch{message('Tempahan berjaya disimpan: '+o.ref+'. Muat semula tab admin untuk mendapatkan rekod terkini.');}}
 }catch(e){orderFeedback(e.message);}finally{setOrderBusy(false);}
};
function receiptHTML(o){return '<div class="receipt-card"><h2>'+esc(S.school)+'</h2><h3>Tempahan Baju KRMJ Tahun 1 2027</h3><p><b>'+esc(o.ref)+'</b><br>'+esc(new Date(o.created).toLocaleString('ms-MY'))+'<br>Status tempahan: '+esc(o.status)+'</p>'+table(['Maklumat','Butiran'],[['Nama murid',esc(o.name)],['Kumpulan / kelas',esc(o.className)],['Penjaga',esc(o.guardian)],['Telefon',esc(o.phone)]])+table(['Item','Saiz','Kuantiti','Bayar','Serah'],o.items.map(i=>[esc(i.productName),esc(i.size),i.qty,S.preorder?'N/A':i.paid?'Sudah Bayar':'Belum Bayar',i.delivered?'Sudah Serah':'Belum Serah']))+'<h3>'+o.qty+' helai · '+money(o.amount)+'</h3><p>Cara bayaran: '+esc(S.preorder?'N/A':o.paymentMethod||'Belum ditetapkan')+'</p><p>'+esc(o.notes)+'</p><small>Preorder sahaja. Harga belum ditetapkan dan bayaran belum diperlukan.</small></div>';}
function showReceipt(o){$('#receipt').innerHTML=receiptHTML(o)+'<div class="actions"><button id="printReceipt">Cetak / Simpan PDF</button>'+((S.allowEdit&&S.isOpen&&active(o)&&!o.items.some(i=>i.paid||i.delivered))?'<button id="editMine">Betulkan Tempahan</button>':'')+'</div>';$('#printReceipt').onclick=()=>printPage(receiptHTML(o));if($('#editMine'))$('#editMine').onclick=()=>editOrder(o,false);}
$('#lookupNameForm').onsubmit=e=>{e.preventDefault();if(!lookupPicker.get()&&!lookupPicker.acceptExact()){message('Taip dan pilih nama anak daripada cadangan.');$('#lookupStudent').focus();return;}busy(e.target,async()=>{lookupOrders=(await api('lookupName',Object.fromEntries(new FormData(e.target)))).map(normalize);$('#receipt').innerHTML='';$('#lookupResults').innerHTML=lookupOrders.length?table(['Nama / rujukan','Kumpulan / kelas','Status','Tindakan'],lookupOrders.map((o,n)=>[esc(o.name)+'<br>'+esc(o.ref),esc(o.className),esc(o.status),'<button data-receipt="'+n+'">Lihat Tempahan</button>'])):'<p>Tiada tempahan sepadan. Semak nama, kelas dan telefon.</p>';$('#lookupResults').querySelectorAll('[data-receipt]').forEach(b=>b.onclick=()=>showReceipt(lookupOrders[Number(b.dataset.receipt)]));if(lookupOrders.length===1)showReceipt(lookupOrders[0]);});};
$('#lookupForm').onsubmit=e=>{e.preventDefault();busy(e.target,async()=>{const o=normalize(await api('lookup',Object.fromEntries(new FormData(e.target))));$('#lookupResults').innerHTML='';showReceipt(o);});};
function printPage(html){const w=window.open('','_blank');if(!w){message('Benarkan popup untuk cetakan.');return;}w.document.write('<!doctype html><html lang="ms"><meta charset="utf-8"><title>Laporan SKST</title><style>@page{size:A4 landscape;margin:12mm}body{font:12px Arial;color:#29354b}table{width:100%;border-collapse:collapse;margin:15px 0}th,td{text-align:left;border-bottom:1px solid #ccc;padding:9px}tr{break-inside:avoid}h2{color:#245ab0}.scroll{overflow:visible}small{font-size:10px}</style><body>'+html+'</body></html>');w.document.close();w.focus();setTimeout(()=>w.print(),300);}
$('#loginForm').onsubmit=e=>{e.preventDefault();busy(e.target,async()=>{const r=await api('login',Object.fromEntries(new FormData(e.target)));token=r.token;lastActive=Date.now();e.target.reset();try{await loadAdmin();}catch(e){logoutLocal();throw e;}$('#adminBtn').textContent='Tetapan Admin';$('#logout').hidden=false;document.querySelectorAll('nav span').forEach(s=>s.hidden=true);go(wanted);});};
function logoutLocal(){token='';orders=[];lookupOrders=[];['teacherOrders','purchaseRecords','preorders','stats','analysis','bars','receipt','lookupResults'].forEach(id=>$('#'+id).innerHTML='');$('#settingsForm').reset();$('#logout').hidden=true;$('#adminBtn').textContent='Log Masuk Admin';document.querySelectorAll('nav span').forEach(s=>s.hidden=false);resetOrder();go('admin');}
$('#logout').onclick=async()=>{try{await api('logout');}catch{}logoutLocal();message('Anda telah log keluar.');};
['pointerdown','keydown','touchstart'].forEach(t=>document.addEventListener(t,()=>lastActive=Date.now(),{passive:true}));setInterval(()=>{if(token&&Date.now()-lastActive>1800000){logoutLocal();message('Sesi admin tamat selepas 30 minit tidak aktif.');}},30000);
async function loadAdmin(){const r=await api('adminData');orders=r.orders.map(normalize);S={...r.settings};backendReady=true;connectionError='';if(Number(S.version)!==4||!S.products)throw Error('Sila kemas kini backend kepada versi 4.');populate();renderTeacher();renderRecords();renderReports();fillSettings();}
function refreshFromServer(element){return busy(element,async()=>{await loadAdmin();message('Data terkini berjaya dimuatkan.');});}
$('#reloadRecords').onclick=()=>refreshFromServer($('#records'));$('#reloadReports').onclick=()=>refreshFromServer($('#reports'));
function itemText(o,productId){return o.items.filter(i=>!productId||i.productId===productId).map(i=>esc(i.productName)+' · '+esc(i.size)+' ('+i.qty+')').join('<br>');}
function renderTeacher(){const cl=$('#teacherClass').value,q=$('#teacherSearch').value.toLowerCase();const a=orders.filter(o=>(!cl||cl===o.className)&&(!q||(o.name+' '+o.ref).toLowerCase().includes(q)));$('#teacherOrders').innerHTML=a.length?table(['Nama / rujukan','Kumpulan / kelas','Item / saiz (kuantiti)','Jumlah','Status','Tindakan'],a.map(o=>[esc(o.name)+'<br><small>'+esc(o.ref)+'</small>',esc(o.className),itemText(o),money(o.amount),esc(o.status),'<button data-edit="'+esc(o.ref)+'">Sunting</button> '+(active(o)?'<button data-status="Disahkan" data-ref="'+esc(o.ref)+'">Sahkan</button> <button data-status="Dibatalkan" data-ref="'+esc(o.ref)+'">Batal</button>':'')])):'<p>Tiada tempahan ditemui. Gunakan Tambah Tempahan Murid untuk merekod tempahan baharu.</p>';$('#teacherOrders').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editOrder(orders.find(o=>o.ref===b.dataset.edit),true));$('#teacherOrders').querySelectorAll('[data-status]').forEach(b=>b.onclick=()=>{if(confirm(b.dataset.status+' tempahan '+b.dataset.ref+'?'))mutateOrder(b.dataset.ref,'status',{status:b.dataset.status});});}
async function mutateOrder(ref,action,d){const o=orders.find(o=>o.ref===ref);const pane=$('#'+currentView);await busy(pane,async()=>{try{const updated=normalize(await api(action,{ref,revision:o.revision,...d}));orders=orders.map(x=>x.ref===ref?updated:x);renderTeacher();renderRecords();renderReports();message('Perubahan berjaya disimpan.');}catch(e){try{await loadAdmin();}catch{}throw e;}});}
function renderRecords(){const cl=$('#recordClass').value,q=$('#recordSearch').value.toLowerCase();const a=orders.filter(o=>active(o)&&(!cl||cl===o.className)&&(!q||o.name.toLowerCase().includes(q))&&(deliveryFilter==='all'||(deliveryFilter==='yes'?delivered(o):!delivered(o))));const products=[...new Map([...S.products,...a.flatMap(o=>o.items.map(i=>({id:i.productId,name:i.productName})))].map(p=>[p.id,p])).values()];
 $('#purchaseRecords').innerHTML=a.length?table(['Nama murid','Kumpulan / kelas',...products.map(p=>p.name),'Jumlah harga','Cara bayaran','Status'],a.map(o=>[esc(o.name)+'<br><small>'+esc(o.ref)+'</small>',esc(o.className),...products.map(p=>o.items.filter(i=>i.productId===p.id).map(i=>'<div class="item-box"><b>'+esc(i.size)+' ('+i.qty+')</b><label class="check"><input type="checkbox" data-ref="'+esc(o.ref)+'" data-item="'+esc(i.id)+'" data-field="paid" '+(S.preorder?'disabled ':'')+(i.paid?'checked':'')+'> Bayar</label><label class="check"><input type="checkbox" data-ref="'+esc(o.ref)+'" data-item="'+esc(i.id)+'" data-field="delivered" '+(i.delivered?'checked':'')+'> Serah</label></div>').join('')||'—'),money(o.amount),'<select class="inline-select" data-method="'+esc(o.ref)+'" '+(S.preorder?'disabled':'')+'>'+['','Tunai','Pindahan Bank','QR','Lain-lain'].map(m=>'<option value="'+esc(m)+'" '+(m===o.paymentMethod?'selected':'')+'>'+esc(m||(S.preorder?'N/A — Preorder':'Belum dipilih'))+'</option>').join('')+'</select>','<span class="'+(delivered(o)?'green':'orange')+'">'+(delivered(o)?'✓ Sudah Serah':'Belum Serah')+'</span><br><small>'+ (S.preorder?'N/A — Preorder':o.items.every(i=>i.paid)?'Sudah Bayar':o.items.some(i=>i.paid)?'Bayaran Sebahagian':'Belum Bayar')+'</small>'])):'<p>Tiada rekod sepadan dengan penapis.</p>';
 $('#purchaseRecords').querySelectorAll('[data-field]').forEach(c=>c.onchange=()=>mutateOrder(c.dataset.ref,'itemState',{itemId:c.dataset.item,field:c.dataset.field,value:c.checked}));$('#purchaseRecords').querySelectorAll('[data-method]').forEach(c=>c.onchange=()=>mutateOrder(c.dataset.method,'paymentMethod',{method:c.value}));
}
$('#deliveryFilters').querySelectorAll('button').forEach(b=>b.onclick=()=>{deliveryFilter=b.dataset.delivery;$('#deliveryFilters').querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));renderRecords();});
['teacherClass','teacherSearch'].forEach(id=>$('#'+id).oninput=renderTeacher);['recordClass','recordSearch'].forEach(id=>$('#'+id).oninput=renderRecords);['reportClass','reportProduct'].forEach(id=>$('#'+id).oninput=renderReports);
function reportOrders(){const cl=$('#reportClass').value,p=$('#reportProduct').value;return orders.filter(o=>active(o)&&(!cl||cl===o.className)&&(!p||o.items.some(i=>i.productId===p))).map(o=>{const items=o.items.filter(i=>!p||i.productId===p);return {...o,items,qty:items.reduce((n,i)=>n+i.qty,0),amount:items.reduce((n,i)=>n+i.qty*i.unitPrice,0)};});}
function analysis(){const a=reportOrders(),qty=a.reduce((n,o)=>n+o.qty,0),groups=new Map();a.forEach(o=>o.items.forEach(i=>{const k=i.productId+'|'+i.size;if(!groups.has(k))groups.set(k,{productId:i.productId,name:i.productName,size:i.size,qty:0,paid:0,delivered:0,students:new Set()});const r=groups.get(k);r.qty+=i.qty;r.paid+=i.paid?i.qty:0;r.delivered+=i.delivered?i.qty:0;r.students.add(studentKey(o));}));const rows=[...groups.values()].sort((a,b)=>a.name.localeCompare(b.name)||a.size.localeCompare(b.size,undefined,{numeric:true})).map(r=>({...r,students:r.students.size,percent:qty?r.qty/qty*100:0}));return {active:a,rows,qty};}
function analysisHTML(a){return table(['Item','Saiz','Murid','Jumlah helai','Sudah bayar','Sudah serah','Peratus'],a.rows.map(r=>[esc(r.name),esc(r.size),r.students,r.qty,r.paid,r.delivered,r.percent.toFixed(1)+'%']))+'<p><b>Jumlah: '+a.qty+' helai.</b> Murid unik keseluruhan: '+new Set(a.active.map(studentKey)).size+'.</p><small>Seorang murid boleh muncul pada beberapa saiz. Tempahan dibatalkan dikecualikan.</small>';}
function preorderHTML(a){const products=[...new Map(a.flatMap(o=>o.items.map(i=>({id:i.productId,name:i.productName}))).map(p=>[p.id,p])).values()];return table(['Nama murid','Kumpulan / kelas',...products.map(p=>p.name),'Jumlah harga','Cara bayaran'],a.map(o=>[esc(o.name),esc(o.className),...products.map(p=>o.items.filter(i=>i.productId===p.id).map(i=>esc(i.size)+' ('+i.qty+')').join('<br>')||'—'),money(o.amount),esc(S.preorder?'N/A':o.paymentMethod||'—')]));}
function renderReports(){const a=analysis(),paid=a.active.reduce((n,o)=>n+o.items.reduce((n,i)=>n+(i.paid?i.qty*i.unitPrice:0),0),0);$('#stats').innerHTML=[['Murid unik',new Set(a.active.map(studentKey)).size],['Jumlah helai',a.qty],['Harga sehelai','N/A'],['Status','Preorder']].map(([k,v])=>'<div class="stat"><small>'+k+'</small><b>'+v+'</b></div>').join('');$('#updated').textContent='Data dimuatkan: '+new Date().toLocaleString('ms-MY')+' · Mengikut penapis kumpulan / kelas dan item.';$('#preorders').innerHTML=a.active.length?preorderHTML(a.active):'<p>Belum ada tempahan aktif.</p>';$('#analysis').innerHTML=analysisHTML(a);$('#bars').innerHTML=a.rows.map(r=>'<div class="bar"><span>'+esc(r.name)+' · '+esc(r.size)+'</span><div><i style="width:'+r.percent+'%"></i></div><b>'+r.qty+'</b></div>').join('');}
function csv(name,rows){const cell=v=>'"'+String(/^[=+\-@\t\r]/.test(String(v))?"'"+v:v).replace(/"/g,'""')+'"';const blob=new Blob(['\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
$('#exportOrders').onclick=()=>csv('Tempahan_SKST_2027.csv',[['Rujukan','Nama','Kumpulan / kelas','Item','Saiz','Kuantiti','Harga sehelai','Jumlah item','Bayar','Serah','Cara bayaran'],...reportOrders().flatMap(o=>o.items.map(i=>[o.ref,o.name,o.className,i.productName,i.size,i.qty,money(i.unitPrice),money(i.unitPrice==null?null:i.qty*i.unitPrice),S.preorder?'N/A':i.paid?'Sudah':'Belum',i.delivered?'Sudah':'Belum',S.preorder?'N/A':o.paymentMethod]))]);
$('#exportSizes').onclick=()=>csv('Pembekal_SKST_2027.csv',[['Item','Saiz','Jumlah helai'],...analysis().rows.map(r=>[r.name,r.size,r.qty]),['JUMLAH','',analysis().qty]]);
function reportHead(title){return '<h2>'+esc(S.school)+'</h2><h3>'+esc(title)+' · Tahun 1 2027</h3><p>'+esc(new Date().toLocaleString('ms-MY'))+' · Kumpulan / kelas: '+esc($('#reportClass').value||'Semua')+' · Item: '+esc(S.products.find(p=>p.id===$('#reportProduct').value)?.name||'Semua')+'</p>';}
$('#printPreorders').onclick=()=>printPage(reportHead('Senarai Pre-order')+preorderHTML(reportOrders()));$('#printAnalysis').onclick=()=>printPage(reportHead('Analisis Saiz')+analysisHTML(analysis()));$('#printSupplier').onclick=()=>{const a=analysis();printPage(reportHead('Rumusan Pembekal')+table(['Item','Saiz','Jumlah helai'],a.rows.map(r=>[esc(r.name),esc(r.size),r.qty]))+'<h3>Jumlah: '+a.qty+' helai</h3>');};
function fillSettings(){const f=$('#settingsForm');for(const k of ['school','logo','opens','closes','instructions'])f.elements[k].value=S[k]||'';for(const k of ['open','allowEdit','sizesReady'])f.elements[k].checked=!!S[k];f.elements.classes.value=S.classes.join('\n');f.elements.sizes.value=S.sizes.map(z=>z.size+' | '+(z.active?'ya':'tidak')).join('\n');}
$('#settingsForm').onsubmit=e=>{e.preventDefault();busy(e.target,async()=>{const f=e.target,n={...Object.fromEntries(new FormData(f)),image:'',unit:'inci'};for(const k of ['open','allowEdit','sizesReady'])n[k]=f.elements[k].checked;n.classes=n.classes.split('\n').map(x=>x.trim()).filter(Boolean);n.sizes=n.sizes.split('\n').filter(x=>x.trim()).map(l=>{const [size,on]=l.split('|').map(x=>x.trim());if(!['ya','tidak'].includes(on))throw Error('Format saiz: 28 | ya');return {size,active:on==='ya'};});n.products=[{id:'krmj',name:'Baju KRMJ',price:null,active:true,priceStatus:'pending'}];n.preorder=true;n.price=null;n.priceStatus='pending';n.schemaVersion=4;await api('settings',{settings:n});await loadAdmin();message('Tetapan berjaya disimpan.');});};
let installPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('#install').hidden=false;});$('#install').onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;$('#install').hidden=true;}};if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});window.addEventListener('offline',()=>message('Anda di luar talian. Sambung internet untuk tempahan, semakan atau perubahan rekod.'));
(async()=>{populate();try{await refreshPublic();}catch(e){message(e.message);}})();

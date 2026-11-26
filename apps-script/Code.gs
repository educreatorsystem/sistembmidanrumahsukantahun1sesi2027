/* BACKEND SAHAJA. Jangan muat naik fail ini ke repositori GitHub awam. */
const P=PropertiesService.getScriptProperties();
function setup(){
 if(P.getProperty('PASSWORD'))throw Error('Sistem telah disediakan.');
 const password=P.getProperty('INITIAL_PASSWORD');if(!password||password.length<8)throw Error('Tetapkan INITIAL_PASSWORD dalam Script Properties (minimum 8 aksara).');
 const ss=SpreadsheetApp.create('Tempahan Baju Sukan SK Sungai Tiram 2027');
 ss.getSheets()[0].setName('Orders').appendRow(['Reference','JSON']);
 P.setProperty('SHEET_ID',ss.getId());setPassword_(password);P.deleteProperty('INITIAL_PASSWORD');
 P.setProperty('SETTINGS',JSON.stringify({school:'SK Sungai Tiram',logo:'',image:'',price:0,open:false,sizesReady:false,allowEdit:true,opens:'',closes:'',unit:'cm',classes:[],instructions:'Sila pilih saiz mengikut ukuran pembekal.',sizes:['24','26','28','30','32','34','36'].map(s=>({size:s,chest:'',length:'',active:true}))}));
 console.log('Pangkalan data: '+ss.getUrl());
}
function sha_(s){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s,Utilities.Charset.UTF_8).map(x=>('0'+((x+256)%256).toString(16)).slice(-2)).join('')}
function hash_(pw,salt){let h=salt+pw;for(let i=0;i<2000;i++)h=sha_(h+salt);return h}
function setPassword_(pw){const salt=Utilities.getUuid();P.setProperty('SALT',salt);P.setProperty('PASSWORD',hash_(pw,salt));P.setProperty('AUTH_VERSION',Utilities.getUuid())}
function password_(pw){return hash_(String(pw||''),P.getProperty('SALT'))===P.getProperty('PASSWORD')}
function cache_(){return CacheService.getScriptCache()}
function throttle_(key,max){const c=cache_(),k='rate:'+sha_(key),n=Number(c.get(k)||0);if(n>=max)throw Error('Terlalu banyak cubaan. Cuba semula selepas 10 minit.');c.put(k,String(n+1),600)}
function auth_(t){const c=cache_(),k='session:'+sha_(String(t||''));if(c.get(k)!==P.getProperty('AUTH_VERSION'))throw Error('Sesi admin tamat. Sila log masuk semula.');c.put(k,P.getProperty('AUTH_VERSION'),1800)}
function sheet_(){return SpreadsheetApp.openById(P.getProperty('SHEET_ID')).getSheetByName('Orders')}
function all_(){const s=sheet_();return s.getLastRow()<2?[]:s.getRange(2,2,s.getLastRow()-1,1).getValues().map(r=>JSON.parse(r[0]))}
function save_(o){const s=sheet_(),n=s.getLastRow();if(n>1){const rows=s.getRange(2,1,n-1,1).getValues();for(let i=0;i<rows.length;i++)if(rows[i][0]===o.ref){s.getRange(i+2,2).setValue(JSON.stringify(o));return}}s.appendRow([o.ref,JSON.stringify(o)])}
function settings_(){if(!P.getProperty('SETTINGS'))throw Error('Backend belum disediakan. Jalankan setup.');return JSON.parse(P.getProperty('SETTINGS'))}
function phone_(x){return String(x||'').replace(/\D/g,'').replace(/^60/,'0')}
function required_(x,n,max){x=String(x||'').trim();if(!x||x.length>(max||120))throw Error(n+' tidak sah.');return x}
function open_(s){const d=Utilities.formatDate(new Date(),'Asia/Kuala_Lumpur','yyyy-MM-dd');return s.open&&s.sizesReady&&(!s.opens||d>=s.opens)&&(!s.closes||d<=s.closes)}
function checked_(d,s){
 const o={name:required_(d.name,'Nama murid'),mykid:required_(d.mykid,'MyKid',12),className:required_(d.className,'Kelas'),guardian:required_(d.guardian,'Nama penjaga'),phone:phone_(d.phone),notes:String(d.notes||'').slice(0,500)};
 if(!/^\d{12}$/.test(o.mykid)||!/^0\d{8,11}$/.test(o.phone))throw Error('MyKid atau telefon tidak sah.');
 if(!['Belum ditetapkan'].concat(s.classes).includes(o.className))throw Error('Kelas tidak sah.');
 if(!Array.isArray(d.items)||!d.items.length||d.items.length>30)throw Error('Pilih saiz dan kuantiti.');
 const m={};d.items.forEach(i=>{if(!s.sizes.some(z=>z.active&&z.size===i.size)||!Number.isInteger(Number(i.qty))||i.qty<1||i.qty>100)throw Error('Saiz atau kuantiti tidak sah.');m[i.size]=(m[i.size]||0)+Number(i.qty);if(m[i.size]>100)throw Error('Maksimum 100 helai bagi setiap saiz.');});
 o.items=Object.keys(m).map(size=>({size,qty:m[size]}));o.qty=o.items.reduce((a,i)=>a+i.qty,0);o.unitPrice=s.price;o.amount=Math.round(o.qty*s.price*100)/100;return o;
}
function doPost(e){let result;const lock=LockService.getScriptLock();try{if(!lock.tryLock(30000))throw Error('Sistem sibuk. Sila cuba semula.');const d=JSON.parse(e.parameter.payload||'{}');result={ok:true,data:route_(d)}}catch(err){result={ok:false,error:err.message||'Permintaan gagal.'}}finally{if(lock.hasLock())lock.releaseLock()}return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON)}
function route_(d){
 const s=settings_();
 if(d.action==='public')return {...s,isOpen:open_(s)};
 if(d.action==='login'){throttle_('login',15);if(d.username!=='admin'||!password_(d.password))throw Error('Username atau kata laluan tidak sah');const token=Utilities.getUuid()+Utilities.getUuid();cache_().put('session:'+sha_(token),P.getProperty('AUTH_VERSION'),1800);return {token}}
 if(d.action==='create'){
 if(!open_(s))throw Error('Tempahan belum dibuka atau telah ditutup.');
 const o=checked_(d,s),orders=all_();const duplicate=orders.find(x=>x.mykid===o.mykid&&x.status!=='Dibatalkan');
 if(duplicate){if(duplicate.requestId===d.requestId&&duplicate.phone===o.phone)return duplicate;throw Error('MyKid ini mempunyai tempahan aktif. Gunakan Semak Tempahan atau hubungi sekolah.');}
 o.ref='SKST-'+Utilities.getUuid().replace(/-/g,'').slice(0,12).toUpperCase();o.created=new Date().toISOString();o.updated=o.created;o.status='Baharu';o.requestId=required_(d.requestId,'ID permintaan');save_(o);return o;
 }
 if(d.action==='lookup'||d.action==='parentEdit'){
 throttle_('lookup:'+String(d.ref),30);const o=all_().find(x=>x.ref===String(d.ref||'').toUpperCase()&&x.phone===phone_(d.phone));if(!o)throw Error('Tempahan tidak ditemui. Semak nombor rujukan dan telefon.');
 if(d.action==='lookup')return o;
 if(!s.allowEdit||!open_(s)||o.status==='Dibatalkan')throw Error('Pembetulan tidak dibenarkan. Hubungi sekolah.');
 const edited=checked_(d.order,s);if(edited.mykid!==o.mykid)throw Error('MyKid tidak boleh ditukar.');Object.assign(o,edited,{updated:new Date().toISOString(),status:'Baharu'});save_(o);return o;
 }
 auth_(d.token);
 if(d.action==='logout'){cache_().remove('session:'+sha_(d.token));return true}
 if(d.action==='adminData')return {settings:s,orders:all_()};
 if(d.action==='password'){if(!password_(d.oldPassword))throw Error('Kata laluan semasa salah.');if(String(d.newPassword||'').length<10)throw Error('Minimum 10 aksara.');setPassword_(d.newPassword);return true}
 if(d.action==='status'){const o=all_().find(x=>x.ref===d.ref);if(!o||!['Baharu','Disahkan','Dibatalkan'].includes(d.status))throw Error('Status tidak sah.');if(d.status!=='Dibatalkan'&&all_().some(x=>x.ref!==o.ref&&x.mykid===o.mykid&&x.status!=='Dibatalkan'))throw Error('Murid mempunyai tempahan aktif lain.');o.status=d.status;o.updated=new Date().toISOString();save_(o);return o}
 if(d.action==='adminEdit'){const old=all_().find(x=>x.ref===d.ref);if(!old)throw Error('Rekod tidak ditemui.');const o=checked_(d.order,s);if(old.status!=='Dibatalkan'&&all_().some(x=>x.ref!==old.ref&&x.mykid===o.mykid&&x.status!=='Dibatalkan'))throw Error('MyKid mempunyai tempahan lain.');Object.assign(old,o,{updated:new Date().toISOString()});save_(old);return old}
 if(d.action==='settings'){
 const n=d.settings;if(!n||!Number.isFinite(n.price)||n.price<0||n.price>10000||!Array.isArray(n.sizes)||!n.sizes.length||n.sizes.length>40)throw Error('Harga atau saiz tidak sah.');n.school=required_(n.school,'Nama sekolah');if(!['cm','inci'].includes(n.unit))throw Error('Unit tidak sah.');
 n.classes=Array.from(new Set(n.classes.map(x=>required_(x,'Kelas'))));const seen=new Set();n.sizes.forEach(z=>{z.size=required_(z.size,'Saiz',20);if(seen.has(z.size))throw Error('Saiz berulang.');seen.add(z.size);if(n.sizesReady&&z.active&&(!(Number(z.chest)>0)||!(Number(z.length)>0)))throw Error('Isi ukuran dada dan panjang untuk saiz aktif.');});
 ['logo','image'].forEach(k=>{if(n[k]&&!/^https:\/\//.test(n[k]))throw Error('URL mesti menggunakan https.');});['opens','closes'].forEach(k=>{if(n[k]&&!/^\d{4}-\d{2}-\d{2}$/.test(n[k]))throw Error('Tarikh tidak sah.');});if(n.opens&&n.closes&&n.opens>n.closes)throw Error('Tarikh tutup mendahului tarikh mula.');
 P.setProperty('SETTINGS',JSON.stringify(n));return n;
 }
 throw Error('Tindakan tidak sah.');
}

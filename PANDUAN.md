# Panduan Pemasangan SKST 2027

## 1. Sambungan yang telah ditetapkan

**Sheet ID**

`1aIVl4toXjKncxGT75oV-GNKwdVEOFMUINIu0Lc2lUAI`

[Buka Google Sheet](https://docs.google.com/spreadsheets/d/1aIVl4toXjKncxGT75oV-GNKwdVEOFMUINIu0Lc2lUAI/edit)

**URL Apps Script** telah dimasukkan dalam `config.js`:

[Buka endpoint Apps Script](https://script.google.com/macros/s/AKfycbyO9SCh2dlFiM7SoxIFw9PeJaUkan0WVYFFBuB3fkvhIAWkrOQxTT-RajHdCty-Wk0T/exec)

Pautan CSV yang diberi mempunyai teks paparan `gid=0` tetapi sasaran pautannya menggunakan `gid=197358140`. Sasaran sebenar tersebut kosong semasa diperiksa. Pakej ini menggunakan daftar sebenar daripada Excel dan API terhad; CSV awam tidak diperlukan untuk simpanan atau pembacaan data kesihatan.

**Sebelum menerima data kesihatan**, pastikan fail database persendirian. Pada Google Sheets, semak **File → Share → Publish to web** dan hentikan penerbitan fail database jika masih aktif. Jangan terbitkan keseluruhan workbook, tab REKOD, AKSES, PIN_EDARAN, SNAPSHOT atau AUDIT. Akses web app dikawal oleh backend dan PIN; ia tidak memerlukan Sheet dikongsi secara awam.

## 2. Pasang backend pada akaun pemilik

Gunakan akaun Google yang boleh menyunting Sheet di atas. Akses sambungan yang digunakan untuk menghasilkan pakej ditolak, jadi pemasangan ini perlu dijalankan oleh pemilik/editor yang diberi akses.

1. Buka projek Apps Script yang digunakan oleh URL `/exec` sedia ada. Jika perlu, buka Sheet → **Extensions → Apps Script** dan pastikan ini projek deployment yang betul.
2. Simpan salinan kod lama sebelum menggantikannya.
3. Dalam projek **yang sama**, sediakan tiga fail script berikut. Pilih **+ → Script**, kemudian gunakan nama tanpa sambungan `.gs` apabila diminta:

   | Nama fail di editor | Kandungan daripada pakej |
   | --- | --- |
   | `Code.gs` | `apps-script/Code.gs` |
   | `Core.gs` | `apps-script/Core.gs` |
   | `Data.gs` | `apps-script/Data.gs` |

4. Pastikan tiada `doGet` / `doPost` lama yang berulang dalam fail script lain. Ketiga-tiga fail ini mesti wujud bersama; menampal Code.gs sahaja tidak mencukupi.
5. Di **Project Settings**, aktifkan paparan `appsscript.json` jika perlu, kemudian salin kandungan `apps-script/appsscript.json`. Tetapan masa ialah Asia/Kuala_Lumpur dan runtime V8.
6. Untuk pemasangan biasa, teruskan ke langkah 7. Jika akaun admin belum wujud, sistem menggunakan nama pengguna **admin** dan kata laluan awal **skst@1234**. Tiada Script Property wajib ditambah.

   Jika mahu kata laluan awal sendiri, sebelum pemasangan pertama tambah `ADMIN_INITIAL_PASSWORD` dalam **Project Settings → Script Properties**, dengan nilai minimum 8 aksara. Pilihan ini tidak menukar akaun admin yang sudah dipasang. Selepas pemasangan, backend menyimpan hash bersalt dan memadam property awal yang telah digunakan. Kata laluan tidak diletakkan dalam fail HTML atau JavaScript laman.

7. Simpan semua fail. Pilih fungsi **sediakanSistem** pada dropdown editor dan klik **Run**.
8. Benarkan akses yang diminta Google untuk projek sekolah ini. Jika organisasi menyekat akses, pentadbir Google Workspace sekolah perlu membenarkan penggunaan yang berkenaan; jangan memintas sekatan akaun.
9. Selepas berjaya, tab dengan awalan `SKST27_` akan muncul dalam Sheet. **314 nama sebenar** dimasukkan sebagai daftar menunggu pengesahan dan PIN dijana secara peribadi.

Pemasangan tidak memadam tab lama. Data dalam struktur sistem lama tidak dimigrasikan secara automatik ke struktur baharu. Jangan padam tab lama jika ada rekod yang masih diperlukan. Menjalankan semula `sediakanSistem` mengekalkan daftar dan PIN yang telah diwujudkan; ia bukan fungsi reset.

## 3. Kemas kini deployment dengan betul

Menyimpan kod dalam editor **tidak mengemas kini** deployment `/exec` secara automatik.

1. Klik **Deploy → Manage deployments**.
2. Pilih deployment yang mempunyai ID dalam URL `/exec` sedia ada.
3. Klik ikon pensel **Edit**.
4. Dalam **Version**, pilih **New version**.
5. Tetapkan **Execute as: Me** (akaun pemilik yang boleh mengakses Sheet).
6. Tetapkan akses web app kepada **Anyone** jika pilihan ini dibenarkan organisasi, supaya penjaga tidak perlu akaun Google. Endpoint tetap mengesahkan PIN atau sesi admin sebelum memberikan data peribadi.
7. Klik **Deploy**.
8. Buka URL `/exec`. Respons yang dijangka ialah:

```json
{"ok":true,"data":{"api":"SKST_BMI","version":"3.0.0-pin","build":"setup-fix-1","configured":true}}
```

Jika masih `1.1.0`, deployment lama masih digunakan atau projek yang disunting berlainan. Ulang semakan pada deployment dengan URL yang betul. Gunakan URL `/exec`, bukan `/dev`.

Jika membuat deployment baharu dan URL berubah, salin URL baharu ke `apiUrl` dalam `config.js` dan muat naik semula fail itu ke GitHub. Jangan salin URL sementara `script.googleusercontent.com`.

## 4. Muat naik ke GitHub Pages

1. Ekstrak ZIP ini.
2. Dalam repository GitHub, muat naik `index.html`, `styles.css`, `app.js`, `config.js`, folder `assets` dan `.nojekyll` ke root. Pastikan `index.html` berada terus di root repository, bukan dalam folder ZIP tambahan.
3. Buka **Settings → Pages** dan pilih deployment daripada branch yang digunakan, dengan folder **/ (root)**.
4. Buka alamat Pages selepas GitHub selesai membinanya.
5. Muat semula halaman. Apabila backend betul, sistem menyatakan sambungan sedia atau daftar menunggu pengesahan admin.

Laman ini tidak memerlukan npm, build atau hosting berbayar. Membuka `index.html` terus sebagai fail tempatan mungkin menyekat pembacaan JSON; gunakan Pages atau pelayan HTTP untuk semakan.

## 5. Semak senarai dan edarkan PIN

1. Buka **Ruangan Admin**. Log masuk sebagai **admin** menggunakan kata laluan awal **skst@1234**, atau kata laluan sendiri jika telah ditetapkan sebelum pemasangan pertama.
2. Semak pratonton daftar:

   | Kumpulan | Murid |
   | --- | ---: |
   | 1 | 40 |
   | 2 | 40 |
   | 3 | 39 |
   | 4 | 39 |
   | 5 | 39 |
   | 6 | 39 |
   | 7 | 39 |
   | 8 | 39 |
   | **Jumlah** | **314** |

3. Klik **Sahkan & Aktifkan 314 Murid**.
4. Klik **Muat Turun PIN Penjaga**. Edarkan setiap PIN hanya kepada penjaga murid berkenaan. Fail keseluruhan PIN dan tab `SKST27_PIN_EDARAN` adalah sulit; jangan upload ke GitHub atau hantar ke kumpulan WhatsApp kelas.
5. PIN terdiri daripada 6 aksara gabungan huruf dan nombor. Huruf I/O serta angka 0/1 dielakkan. Contoh format sahaja: **AB2345**; contoh ini bukan PIN sebenar mana-mana murid.
6. Jika terlupa, admin klik nama murid, isi sebab dan gunakan **Jana PIN Baharu**. PIN dan sesi penjaga lama dibatalkan. Ini tidak menukar kata laluan akaun admin.

Tiada borang upload Excel di dashboard. Daftar semasa sudah disediakan. `tools/import_roster.py` ialah utiliti luar talian untuk pembangun menyediakan sumber roster pada masa akan datang; jangan jalankan untuk menimpa daftar aktif.

## 6. Aliran penjaga

1. Taip sekurang-kurangnya 2 huruf nama, kemudian pilih nama daripada cadangan.
2. Kumpulan asal dipaparkan secara automatik.
3. Masukkan PIN yang diberikan sekolah. Selepas pengesahan, hanya rekod anak berkenaan boleh dilihat atau dipinda.
4. Isi berat (kg), tinggi (cm), tarikh dan semua soalan kesihatan. Jika memilih “Ada” atau “Ya”, lengkapkan penerangan yang berkaitan.
5. Semak nilai BMI dan tandakan pengakuan. Butang hantar aktif apabila semua medan wajib lengkap.
6. Klik **Hantar Maklumat** dan tunggu pengesahan. Jika sambungan gagal, input dikekalkan; penghantaran semula mengemas kini StudentID yang sama.

Jika nama ditukar sebelum penghantaran, maklumat anak sebelumnya dikosongkan. PIN dan sesi tidak dimasukkan dalam URL. Lima cubaan akses gagal dikunci selama 15 minit. Sesi penjaga tamat selepas 20 minit; sesi admin selepas 2 jam. Sesi juga boleh tamat lebih awal jika cache Google digugurkan; log masuk semula apabila diminta.

## 7. Agihan dan keputusan

- Sasaran menggunakan bilangan StudentID aktif, bukan jumlah baris penghantaran.
- 313/314 lengkap: tiada agihan. 314/314 lengkap: satu draf dijana secara automatik tanpa dashboard perlu dibuka.
- Penghantaran dikawal `LockService` supaya proses serentak tidak menggandakan agihan.
- Bagi 314 murid, kapasiti ialah 79, 79, 78 dan 78. Cabutan berbenih menentukan rumah yang menerima lebihan.
- Algoritma menyeimbangkan taburan BMI mengikut kuartil, sejarah perubatan, keperluan pemantauan/sekatan dan kumpulan asal. Pengoptimuman pertukaran pasangan mengekalkan kapasiti.
- Nilai BMI dan keadaan kesihatan tidak digunakan untuk memberi markah kebolehan sukan atau mengecualikan murid.
- Semak baki perbezaan dalam jadual analisis. Keseimbangan sempurna tidak dijamin.
- Klik **Sahkan Semakan**, kemudian **Terbitkan Keputusan**. Penjaga hanya melihat rumah daripada keputusan yang diterbitkan.
- Selepas perubahan rekod, rumah semua murid tidak berubah sendiri. Analisis perlu disemak dan disahkan semula. Penjanaan semula memerlukan tindakan admin dan sebab.
- Pertukaran dua murid menghasilkan draf baharu. Keputusan sedia terbit dikekalkan sehingga draf baharu diterbitkan.
- Jika proses gagal, draf separuh siap tidak diterbitkan. Admin boleh menggunakan **Jana / Jana Semula** selepas semua maklumat lengkap.

**Eksport Rekod Terhad** mengandungi maklumat kesihatan dan hanya untuk pegawai sekolah yang diberi akses. **Eksport/Cetak Senarai Rumah** hanya mengandungi nama, kumpulan dan rumah. Kedua-duanya mengikut penapis semasa.

## 8. Struktur database

| Tab | Kandungan |
| --- | --- |
| `SKST27_MURID` | StudentID kekal, nama, kumpulan asal, status aktif |
| `SKST27_REKOD` | Satu rekod aktif setiap StudentID; ukuran, BMI dan maklumat kesihatan dalam JSON |
| `SKST27_AKSES` | Salt, hash PIN dan versi akses |
| `SKST27_PIN_EDARAN` | PIN untuk edaran peribadi oleh sekolah |
| `SKST27_AGIHAN` | RunID, StudentID dan rumah; setiap proses disimpan berasingan |
| `SKST27_PROSES` | Benih, versi algoritma, status, revision dan ringkasan proses |
| `SKST27_SNAPSHOT` | Salinan data setiap proses untuk jejak semakan |
| `SKST27_AUDIT` | Masa, pelaku, sebab dan butiran perubahan |

Status proses semasa dan keputusan terbit disimpan dalam Script Properties. Jangan padam properties, sunting ID, hash atau JSON secara manual. Simpan kumpulan asal dan rumah sukan sebagai maklumat berasingan.

## 9. Rujukan teknikal

- [Google Apps Script Web Apps](https://developers.google.com/apps-script/guides/web)
- [Google Apps Script Content Service](https://developers.google.com/apps-script/guides/content)
- [Google Apps Script LockService](https://developers.google.com/apps-script/reference/lock/lock-service)

Frontend menghantar JSON melalui POST `text/plain` untuk mengelakkan preflight yang tidak diperlukan dan mengikuti redirect ContentService. Ia tidak menggunakan `no-cors`, tidak menyimpan rekod dalam localStorage dan tidak memaparkan kejayaan sebelum respons simpanan diterima.

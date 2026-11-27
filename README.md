# Sistem BMI & Pembahagian Rumah Sukan SKST 2027

Pakej lengkap GitHub Pages + Google Apps Script untuk Tahun 1 SK Sungai Tiram.
Versi frontend dan backend: **3.0.0-pin**. Pembaikan pemasangan: **setup-fix-1**.

## Apa yang disediakan

- Tema biru merah, lencana asal sekolah dan ilustrasi header yang diberikan.
- Daftar sebenar **314 murid** daripada tab **RUJUKAN IBU BAPA** sahaja.
- Carian nama: taip sekurang-kurangnya dua huruf, kemudian pilih cadangan.
- PIN peribadi **6 aksara huruf besar dan nombor**, dijana sekolah; huruf kecil juga diterima semasa masuk.
- Pengiraan BMI di browser dan pengiraan semula pada backend.
- Rekod kesihatan bersyarat, pengakuan wajib dan simpanan berpusat.
- Dashboard, analisis kuartil, penapis, pembetulan bersebab, eksport, cetakan dan log audit.
- Agihan selepas semua rekod lengkap; semakan dan penerbitan oleh admin.
- Tiada ruangan tukar kata laluan atau upload fail murid di tab admin.

## Mula di sini

Baca **[PANDUAN_MUDAH_SKST_BMI_2027.txt](PANDUAN_MUDAH_SKST_BMI_2027.txt)** untuk langkah mudah atau **[PANDUAN.md](PANDUAN.md)** untuk butiran pemasangan.

1. Pasang tiga fail dalam `apps-script/` pada projek Apps Script milik sekolah.
2. Jalankan `sediakanSistem`. Akaun awal admin disediakan jika belum pernah dipasang.
3. Kemas kini deployment kepada **New version**.
4. Muat naik fail laman ke GitHub dan aktifkan Pages.
5. Log masuk admin, semak pratonton 314 murid, aktifkan senarai dan edarkan PIN secara peribadi.

**Status semasa penyerahan:** akses terus ke Sheet ditolak. Daftar disertakan dalam Data.gs dan akan dimasukkan ke Sheet apabila pemilik menjalankan pemasangan. Endpoint yang diperiksa pada 27 November 2026 masih melaporkan versi 1.1.0. Backend baharu belum dideploy ke akaun Google oleh pembangun pakej ini.

## Fail untuk laman GitHub Pages

Muat naik fail ini ke root repository dengan struktur asal:

| Fail / folder | Kegunaan |
| --- | --- |
| `index.html` | Laman utama |
| `styles.css` | Tema dan paparan responsif |
| `app.js` | Borang dan dashboard |
| `config.js` | URL Apps Script |
| `assets/` | Lencana, ilustrasi header, daftar nama awam minimum dan pengiraan |
| `.nojekyll` | Fail penanda Pages |

Folder `apps-script/`, `tests/` dan `tools/` ialah sumber pemasangan/pembangunan; tidak perlu dimuat naik untuk laman berfungsi. Fail Excel asal, rekod kesihatan dan senarai PIN tidak dimasukkan dalam pakej awam ini.

## Pengesahan

Jalankan `node tests/verify.cjs` untuk semakan automatik pada pangkalan data dalam memori. Ujian ini tidak menghantar data ke Google Sheet sebenar. Lihat [SEMAKAN.md](SEMAKAN.md) untuk skop pengesahan dan batasannya.

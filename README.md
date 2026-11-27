# Sistem BMI & Rumah Sukan SKST Tahun 1 2027

Versi **4.0.0-tanpa-pin**. Pakej baharu menggunakan carian nama untuk terus mengisi borang.

- PIN penjaga, edaran PIN dan reset PIN telah dikeluarkan.
- Sejarah perubatan: **Tiada** atau **Ada penyakit**. Jika Ada, isi jenis penyakit sahaja.
- Header ilustrasi, lencana, warna biru merah dan daftar sebenar 314 murid dikekalkan.
- Backend menyemak ukuran dan mengira semula BMI. Penghantaran berulang mengemas kini StudentID yang sama.
- Nama yang dipilih membuka borang kosong; rekod kesihatan terdahulu hanya untuk admin.
- Dashboard, pembetulan bersebab, audit, eksport, cetakan dan agihan selepas semua rekod lengkap diteruskan.
- Database, akaun admin dan data lama dikekalkan apabila pemasangan dijalankan semula.

Mulakan dengan [PANDUAN_MUDAH_SKST_BMI_2027.txt](PANDUAN_MUDAH_SKST_BMI_2027.txt).

Fail laman: `index.html`, `styles.css`, `app.js`, `config.js` dan `assets/`.
Backend: `apps-script/Code.gs`, `apps-script/Core.gs`, `apps-script/Data.gs` dan manifest.

**Penting:** gantikan Code.gs DAN Core.gs, kemudian Deploy → Manage deployments → Edit → New version → Deploy. Pastikan `apiUrl` dalam config.js menunjuk kepada deployment anda dan `requiredVersion` bernilai 4.0.0-tanpa-pin.

Ujian: `node tests/verify.cjs`. Semua tulisannya menggunakan emulator Sheet dalam memori.

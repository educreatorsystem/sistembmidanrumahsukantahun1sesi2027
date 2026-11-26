# Semakan pakej

Lulus semakan sintaks JavaScript untuk frontend dan Apps Script.

Ujian logik Node dengan perkhidmatan Google yang disimulasi meliputi:
- Akaun awal menerima password yang diminta; property password awal dipadam selepas setup.
- Akses dashboard dan perubahan status ditolak tanpa token admin.
- Tempahan tidak boleh dibuat ketika ditutup.
- 2 helai + 1 helai = 3 helai; harga RM25 menghasilkan RM75.
- Penghantaran semula ID permintaan yang sama tidak menggandakan rekod.
- MyKid aktif berganda ditolak; tempahan baharu dibenarkan selepas pembatalan.
- Semakan memerlukan rujukan dan telefon yang betul.
- Pertukaran password membatalkan sesi admin lama.
- Analisis mengira jumlah helai, murid unik bagi saiz, peratus dan mengecualikan pembatalan.
- Analisis kosong memaparkan sifar tanpa pembahagian dengan sifar.

Ujian ini tidak menggantikan ujian deployment Google sebenar. Semakan visual pelayar automatik tidak dapat dijalankan kerana executable Chromium tiada dalam runtime.

## Ujian penerimaan selepas pemasangan

1. Sambungkan config.js dan pastikan tiada mesej “belum disambungkan”.
2. Login admin dan tetapkan dua saiz dengan carta ukuran pembekal sebenar.
3. Tetapkan harga dan buka tempahan.
4. Hantar tempahan percubaan 2 helai saiz A dan 1 helai saiz B; simpan rujukan.
5. Buka telefon lain: semak rekod dengan rujukan + telefon.
6. Cuba telefon salah dan cubaan mengakses admin tanpa login.
7. Betulkan kuantiti, kemudian semak analisis admin pada peranti lain.
8. Batalkan rekod percubaan dan pastikan analisis kembali sifar.
9. Cuba CSV dan cetakan PDF resit, analisis serta pembekal.
10. Pasang PWA Android/iPhone; semak paparan dan notis luar talian.
11. Tutup tempahan dan pastikan backend menolak penghantaran baharu.
12. Tukar password awal sebelum digunakan secara meluas.

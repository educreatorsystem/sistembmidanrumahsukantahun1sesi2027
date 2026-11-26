# Tempahan Baju Sukan Tahun 1 2027 — SK Sungai Tiram

Pakej PWA untuk GitHub Pages + Google Apps Script + Google Sheets. Tiada rumah sukan. Lencana sekolah yang diberikan telah disertakan sebagai fail tempatan.

## Kandungan

- `github/`: fail awam untuk dimuat naik ke GitHub Pages.
- `apps-script/Code.gs`: kod backend untuk Google Apps Script sahaja.
- `UJIAN.md`: semakan yang dilakukan dan ujian penerimaan pemasangan.

## 1. Sediakan backend (sekali sahaja)

1. Buka https://script.google.com dan cipta projek baharu menggunakan akaun sekolah/pemilik.
2. Gantikan kandungan Code.gs dengan kod daripada `apps-script/Code.gs`.
3. Buka Project Settings → Script Properties → Add script property.
4. Nama property: `INITIAL_PASSWORD`. Nilai: `skst@1234`.
5. Simpan property, pilih fungsi `setup`, kemudian Run dan benarkan akses Google yang diminta.
6. Setup mencipta Google Sheet secara automatik. Pautan Sheet dipaparkan dalam Execution log. Jangan kongsi Sheet secara awam.
7. Akaun awal ialah username `admin`, password `skst@1234`. Password disimpan dalam bentuk hash bersalt; INITIAL_PASSWORD dipadam selepas setup.
8. Deploy → New deployment → Web app. Execute as: **Me**. Who has access: **Anyone**. Deploy dan salin URL yang berakhir `/exec`.
9. Jika pilihan Anyone tidak tersedia, pentadbir Google Workspace perlu membenarkan web app awam. Halaman GitHub tidak dapat menyambung kepada deployment yang mewajibkan login Google.
10. Jangan jalankan setup sekali lagi. Untuk kemas kini kod backend, Edit deployment → New version → Deploy; kekalkan URL.

## 2. Sambungkan dan publish GitHub Pages

1. Buka `github/config.js`. Isi URL `/exec` dalam `apiUrl`, contohnya:

   `window.APP_CONFIG = { apiUrl: "https://script.google.com/macros/s/ID_DEPLOYMENT/exec" };`

2. Cipta repository GitHub. Muat naik **kandungan di dalam folder `github/`** ke root repository. Pastikan index.html di root dan folder assets disertakan.
3. Jangan muat naik folder apps-script atau panduan yang mengandungi maklumat login ke repository awam. Maklumat login tidak terkandung dalam fail frontend.
4. Repository Settings → Pages → Deploy from a branch → main → /(root) → Save.
5. Buka URL GitHub Pages melalui HTTPS. Gunakan URL Pages, bukannya pautan fail mentah GitHub.

## 3. Tetapan sebelum ibu bapa membuat tempahan

1. Klik Admin, login dengan akaun awal.
2. Buka Tetapan sistem. Tetapkan harga sebenar, kelas, tarikh mula/tutup, gambar baju rasmi jika ada dan arahan sekolah.
3. Senarai saiz asal 24–36 hanyalah senarai permulaan. Gantikan dengan saiz pembekal sebenar.
4. Setiap baris saiz mengikut format: `28 | 40 | 55 | ya` (saiz | lebar dada | panjang | aktif).
5. Pilih unit cm/inci. Isi ukuran pembekal bagi SEMUA saiz aktif; jangan gunakan contoh ukuran di atas sebagai ukuran rasmi.
6. Tandakan “Saiz dan carta ukuran telah disahkan dengan pembekal”. Tandakan “Buka tempahan” dan simpan.
7. Tarikh dikira mengikut Malaysia. Tarikh tutup termasuk sepanjang hari tersebut. Kotak buka tempahan masih perlu ditandakan walaupun tarikh telah diisi.
8. Tukar kata laluan melalui panel admin. Semua sesi sedia ada tamat selepas perubahan kata laluan.

## Penggunaan

- Ibu bapa boleh membuat tempahan pelbagai saiz, menyemak dengan rujukan + telefon dan mencetak resit.
- Simpan nombor rujukan; jika terlupa, hubungi sekolah. Tiada carian awam berdasarkan nama/MyKid.
- Satu MyKid hanya mempunyai satu tempahan aktif. Rekod dibatalkan dikecualikan dalam analisis.
- Suntingan ibu bapa dibenarkan hanya ketika tempahan dibuka dan setting pembetulan dibenarkan. MyKid tidak boleh diubah oleh ibu bapa.
- Admin boleh menyunting butiran, mengesahkan atau membatalkan tempahan. Suntingan menggunakan harga semasa; jumlah pada rekod lama kekal sehingga rekod itu disunting.
- Analisis menjumlahkan HELAI bagi setiap saiz. Contoh: 2 helai + 1 helai saiz sama = 3 helai.
- Murid unik dikira menggunakan MyKid. Murid yang menempah dua saiz dikira dalam kedua-dua baris saiz, sekali sahaja dalam jumlah keseluruhan.
- CSV tempahan mengandungi satu baris bagi setiap saiz. “Jumlah rekod” berulang untuk tempahan pelbagai saiz; jangan jumlahkan lajur itu untuk mendapatkan nilai keseluruhan.
- CSV pembekal dan PDF pembekal hanya mengandungi saiz dan jumlah, tanpa maklumat peribadi.
- Untuk PDF, klik Cetak / PDF dan pilih Save as PDF pada dialog pelayar. Benarkan popup jika disekat.
- Sistem ini tidak memproses bayaran. Resit ialah resit tempahan, bukan bukti pembayaran.

## PWA dan luar talian

Android Chrome/Edge: gunakan “Pasang aplikasi” jika tersedia atau menu pelayar → Install/Add to Home Screen. iPhone Safari: Share → Add to Home Screen.

Buka sekali dengan internet supaya fail aplikasi dicache. Paparan asas boleh dibuka luar talian, tetapi penghantaran, semakan, tetapan dan analisis memerlukan internet. Data tempahan tidak dicache oleh service worker. Tiada penghantaran automatik luar talian.

Apabila mengubah aset aplikasi, naikkan nama versi CACHE dalam sw.js. Muat semula aplikasi selepas publish. Jika cache lama berterusan, tutup/buka semula aplikasi atau padam data laman.

## Akses dan keselamatan

Semua tindakan admin disahkan pada backend, termasuk membaca senarai, mengubah rekod dan tetapan. Sesi tamat selepas 30 minit tidak aktif. Token admin hanya dalam memori dan hilang apabila halaman dimuat semula. Login dan semakan mempunyai had cubaan. Semua perubahan rekod menggunakan Script Lock bagi mengelakkan tempahan serentak menghasilkan pendua. Password asal tidak berada dalam kod frontend.

Kekalkan Google Sheet dan projek Apps Script terhad kepada petugas berkenaan. Muat turun CSV mengandungi maklumat peribadi; simpan dengan selamat. Salinan sandaran Google Sheet boleh dibuat oleh pemilik. Kuota Google Apps Script terpakai; pakej ini sesuai bagi urusan tempahan sekolah, bukan trafik besar tanpa had.

Jika API tidak dapat dibaca: semak URL /exec, akses Anyone dan deployment terkini; pastikan akaun Workspace membenarkan aplikasi awam. Cuba tetingkap peribadi tanpa sambungan pelayar yang menyekat permintaan silang domain.

## Had pengesahan

Pakej telah disemak secara tempatan. Deployment Google Apps Script, kebenaran akaun, penulisan Google Sheet dan pemasangan PWA pada telefon sebenar perlu diuji selepas penyambungan. Tiada deployment atau repository dibuat bagi pihak pengguna.

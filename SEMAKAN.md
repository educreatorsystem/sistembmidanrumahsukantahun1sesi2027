# Rekod Semakan Pakej

Tarikh: 27 November 2026. Versi: 3.0.0-pin. Pembaikan: setup-fix-1.

## Sumber murid

Fail sebenar `AGIHAN KUMPULAN - TERKINI(2).xlsx`, tab `RUJUKAN IBU BAPA`, telah dibaca sekali untuk import. Hanya baris senarai sah di bawah tajuk kumpulan digunakan. Tab lain tidak digabungkan. Hasil ialah 314 StudentID unik dengan bilangan 40/40/39/39/39/39/39/39. Data awam hanya StudentID, nama dan kumpulan.

## Ujian automatik

`node tests/verify.cjs` menjalankan 19 semakan pada kod backend sebenar menggunakan emulator Google Sheet dalam memori:

1. Jumlah dan padanan kumpulan daripada daftar sebenar.
2. Pengiraan 25 kg / 125 cm = BMI 16.00; BMI daripada klien diabaikan.
3. Medan wajib, jawapan perubatan kosong, penerangan bersyarat, tarikh dan ukuran mencurigakan.
4. Pemasangan berulang mengekalkan daftar dan PIN.
5. Pengesahan admin serta sekatan bacaan kesihatan dan PIN tanpa sesi.
6. PIN 6 aksara dan pemadanan sesi penjaga kepada anak sendiri.
7. Kunci selepas lima cubaan PIN gagal.
8. 313/314 belum mencetuskan agihan; penghantaran berulang mengemas kini rekod sama.
9. 314/314 menjana satu draf lengkap dengan kapasiti 79/79/78/78.
10. Kebolehulangan agihan dengan benih dan snapshot sama; pengoptimuman tidak memburukkan skor.
11. Penerbitan memerlukan semakan; penjaga hanya melihat rumah yang telah diterbitkan.
12. Pertukaran pasangan mengekalkan kapasiti dan keputusan terbit terdahulu.
13. Kegagalan penjanaan semula tidak menggantikan draf yang lengkap.
14. Kegagalan agihan automatik terakhir mengekalkan rekod tersimpan tanpa mendedahkan agihan separuh siap; percubaan semula selamat.
15. Reset PIN membatalkan PIN/sesi lama dan dicatat dalam audit.
16. Validasi frontend sepadan dengan backend; tiada kata laluan admin atau hash PIN dalam fail browser.
17. Pemasangan tanpa property atau dengan property kosong berjaya menggunakan akaun awal yang diminta.
18. Menjalankan semula pemasangan mengekalkan kata laluan admin sedia ada, PIN dan rekod murid.
19. Kata laluan pilihan sendiri yang terlalu pendek ditolak dengan arahan pemulihan yang jelas.

## Paparan pelayar

Semakan visual desktop dan viewport iframe 390px telah dibuat. Lencana, tema biru merah, medan carian, cadangan nama, kumpulan selepas pilihan, pintu akses PIN dan mesej versi lama dipaparkan dengan betul. Fixture visual terasing digunakan untuk melihat keadaan sambungan sedia; fixture itu tidak termasuk dalam ZIP.

## Batas pengesahan langsung

- Endpoint asal memberikan respons kesihatan dengan versi 1.1.0 ketika disemak.
- URL CSV sasaran `gid=197358140` memberikan kandungan kosong.
- Akses terus ke database Google Sheet ditolak; tiada data ditulis ke Sheet sebenar dalam sesi penyediaan ini.
- Ujian simpanan, sesi, penjanaan dan kegagalan dibuat secara setempat, bukan pada deployment Google baharu. Had/quota Google dan beban pengguna serentak sebenar belum diuji secara langsung.
- Pemilik perlu menjalankan pemasangan, membuat deployment versi baharu dan mengaktifkan senarai. Selepas itu, uji satu penghantaran sebenar dengan ukuran yang disahkan penjaga dan semak tab REKOD sebelum edaran kepada semua penjaga.

PIN dan data kesihatan tidak disertakan dalam pakej sumber. PIN sebenar hanya dijana oleh pemilik semasa pemasangan pada Sheet persendirian.


## Kemas kini ilustrasi header

Ilustrasi Malaysian Primary School BMI Showcase(1).png disertakan sebagai assets/ilustrasi-header-bmi.png tanpa mengubah piksel asal. Header menggunakan susunan dua kolum pada desktop dan ilustrasi di atas penerangan pada telefon. Nisbah imej dikekalkan tanpa memotong tajuk atau watak. Perubahan fungsi, konfigurasi sambungan dan kod backend tidak diperlukan.

Semakan header dibuat dalam pelayar pada desktop dan iframe telefon 390px. Ilustrasi dimuatkan penuh, nisbah 1536:1024 dikekalkan dan paparan telefon tiada limpahan mendatar.

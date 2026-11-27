# Pengesahan Versi 4.0.0-tanpa-pin

20 semakan setempat telah lulus melalui `node tests/verify.cjs`:

- Daftar sebenar 314 murid dan StudentID asal.
- Pemasangan awal tanpa tetapan tambahan; tiada jadual akses penjaga baharu.
- Pemasangan semula mengekalkan akaun admin, daftar aktif, rekod lama dan agihan.
- Core.gs lama dikesan sebelum penghantaran dibenarkan.
- BMI 25 kg / 125 cm = 16.00, dikira semula pada backend.
- Pilihan Tiada lengkap tanpa jenis penyakit; Ada mewajibkan jenis penyakit.
- Validasi ukuran, tarikh, pengakuan dan panjang teks.
- Keserasian rekod perubatan lama.
- Hanya murid aktif boleh menerima penghantaran; admin mesti log masuk.
- Penghantaran tanpa PIN atau sesi penjaga, dengan respons resit sahaja.
- Carian nama tidak mendedahkan rekod kesihatan terdahulu atau ukuran.
- Penghantaran berganda tidak menambah murid lengkap; 313/314 belum diagih.
- 314/314 mencetuskan satu draf lengkap dengan saiz 79/79/78/78.
- Agihan boleh diulang daripada benih dan snapshot yang sama.
- Keputusan hanya dipaparkan selepas semakan dan penerbitan admin.
- Pertukaran pasangan mengekalkan kapasiti dan memerlukan semakan baharu.
- Kegagalan penjanaan semula mengekalkan agihan yang telah lengkap.
- Kegagalan agihan automatik tidak membatalkan penghantaran terakhir.
- Sesi penjaga lama tidak boleh membaca rekod admin; logout membatalkan sesi admin.
- Versi frontend/backend sepadan; tiada PIN atau kata laluan admin dalam fail browser.

Ujian tidak menulis ke Google Sheet sebenar. Deployment Google baharu belum dibuat dalam sesi penyediaan pakej ini.

Semakan pelayar menggunakan fixture terasing: nama membuka borang tanpa PIN, BMI 16.00, Tiada membenarkan penghantaran tanpa jenis penyakit, Ada mewajibkan jenis penyakit, pertukaran nama mengosongkan input dan paparan telefon 390px tiada limpahan mendatar. Tiada penghantaran ujian dibuat ke Sheet sebenar.

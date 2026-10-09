# Implementation Plan — Tandai SEMUA nomor yang dicoba sebagai "sudah diproses"

Tujuan (dari permintaan user): user sengaja taruh 10 nomor per batch harian padahal
perusahaan cuma wajib ~7 kiriman nyata, karena rata-rata ~3 nomor gagal/tidak terdaftar.
User TIDAK mau nomor yang gagal/tidak terdaftar diulang di hari berikutnya — itu memboroskan
slot harian. Jadi: **setiap kontak yang DICOBA dalam satu batch (sukses, error saat kirim,
tidak terdaftar di WhatsApp, atau nomor tidak valid) harus langsung ditandai "sudah diproses"
di `progress.json` dan TIDAK PERNAH diulang di run berikutnya.** Sekali dicoba = selesai untuk
keperluan batch; batch selalu maju.

Catatan: ini tweak perilaku kecil & terfokus — satu pass implementasi + verifikasi offline.
Tidak ada perubahan desain besar.

## Keputusan desain (singkat, dengan alasan)

1. **Tandai saat ATTEMPT selesai, bukan hanya saat sukses — langsung tulis ke file di tiap cabang.**
   Alasan: `batch.pilihBatch()` di `batch.js` sudah menyeleksi batch dengan membuang nomor yang
   ada di set `progress.terkirim` (lihat `pilihBatch`: `belum = semua.filter((k) => !sudahSet.has(k.nomorNorm))`).
   Jadi untuk membuat semua percobaan "tidak diulang", cukup catat nomornya ke `progress.json`
   di SETIAP cabang percobaan di `kirim.js` — tak perlu logika seleksi baru. Menulis segera di
   tiap cabang (bukan sekali di akhir) menjaga sifat crash-safe yang sudah ada: kalau script mati
   di tengah run, nomor yang sudah dicoba tetap tercatat dan tidak dicoba ulang.

2. **Pakai ulang `batch.tandaiTerkirim()` apa adanya; jangan ganti nama fungsi atau format file.**
   Alasan: `tandaiTerkirim` sudah idempoten (tidak menduplikasi nomor) dan sudah menulis segera.
   Mengganti nama fungsi/kunci JSON hanya menambah churn tanpa manfaat perilaku, dan task melarang
   mengubah hal yang tidak perlu. Semantik kunci `terkirim` sekarang bergeser dari "berhasil dikirim"
   menjadi "sudah diproses (dicoba), tidak akan diulang" — ini dijelaskan lewat KOMENTAR saja
   (relabel), bukan perubahan struktur data. Backward-compatible dengan `progress.json` lama.

3. **Pertahankan tampilan log per-kontak (✅/⚠️/❌) dan hitungan ringkasan Sukses/Gagal.**
   Alasan: user tetap ingin MELIHAT nomor mana yang gagal di log run itu, walaupun semuanya kini
   ditandai processed. Jadi `sukses`/`gagal` tetap dihitung & ditampilkan seperti sekarang; yang
   berubah hanya: cabang gagal/tidak-terdaftar/tidak-valid kini juga memanggil `tandaiTerkirim`
   sebelum `continue`/akhir iterasi.

Lingkungan & aturan:
- Teks user-facing (log, komentar, doc) tetap Bahasa Indonesia santai + emoji seperti sekarang.
- Tetap CommonJS. JANGAN sentuh: `patch.js`, `webVersionCache`, `protocolTimeout`,
  mekanik `getNumberId` + resolusi `chatId`, kirim gambar+caption, `JEDA_MS`, `PER_HARI`,
  penanganan `--reset`/`reset`, dan `normalisasiNomor`.
- Node v22. Tidak ada test framework terpasang → verifikasi OFFLINE: harness `node` sekali-pakai
  (pakai `assert` bawaan) + `node -c` syntax check. JANGAN jalankan `node kirim.js` langsung
  (butuh koneksi WhatsApp + `node_modules`).

**PENTING — kendala sandbox (sudah dikonfirmasi):** environment menyetel
`NODE_OPTIONS=--require /opt/amazon/kiro-agent/proxy-bootstrap.js`; file itu tidak ada, jadi
SETIAP perintah `node` polos gagal `MODULE_NOT_FOUND` sebelum skrip jalan. **Semua perintah
`node` verifikasi di bawah HARUS diprefix `NODE_OPTIONS=`** untuk mengosongkannya (mis.
`NODE_OPTIONS= node -c batch.js`). Prefix ini HANYA untuk verifikasi sandbox — jangan dimasukkan
ke kode/dokumentasi user.

---

## Konteks kode saat ini (yang akan diubah)

Di `kirim.js` dalam `client.on('ready')`, loop `for (let i = 0; i < info.batch.length; i++)`
punya 4 titik percobaan per kontak:

1. **Nomor tidak valid** — `if (!nomorNorm || nomorNorm.length < 10) { ... gagal++; continue; }`
   → sekarang TIDAK ditandai.
2. **Tidak terdaftar di WhatsApp** — cabang `else if (numId === null) { ... gagal++; continue; }`
   → sekarang TIDAK ditandai.
3. **Sukses kirim** — setelah `client.sendMessage(...)`: sudah memanggil
   `batch.tandaiTerkirim(PROGRESS_FILE, nomorNorm)` → sudah ditandai (biarkan).
4. **Error saat kirim** — `catch (err) { ... gagal++; }` → sekarang TIDAK ditandai.

(Catatan: ada inner `try/catch` di sekitar `getNumberId` yang hanya "abaikan, lanjut kirim" saat
library error — itu BUKAN titik akhir percobaan, jadi JANGAN tandai di situ; biarkan jatuh ke
sukses (#3) atau error kirim (#4).)

Di `batch.js`, komentar kunci `terkirim` masih berbunyi "terkirim/berhasil" — perlu relabel.

---

## Langkah implementasi (berurutan)

- [ ] 1. Relabel komentar semantik `terkirim` di `batch.js` menjadi "sudah diproses (dicoba)".
      Tambah/ubah komentar singkat Bahasa Indonesia di dekat header file dan/atau di fungsi yang
      menyentuh `terkirim` (mis. `tandaiTerkirim`, `pilihBatch`, `bacaProgress`) yang menjelaskan:
      daftar `terkirim` sekarang berarti **"nomor yang sudah DIPROSES (dicoba), tidak akan diulang"**
      — mencakup sukses maupun gagal/tidak terdaftar/tidak valid — bukan hanya yang berhasil.
      JANGAN ubah logika, nama fungsi, nama kunci JSON, atau tanda tangan fungsi apa pun — komentar saja.
      Files: /projects/sandbox/wa-blast-js/batch.js
      Verify: `NODE_OPTIONS= node -c /projects/sandbox/wa-blast-js/batch.js` — keluar tanpa error sintaks.

- [ ] 2. Di `kirim.js`, tandai SEMUA cabang percobaan sebagai sudah diproses dengan menambah
      `batch.tandaiTerkirim(PROGRESS_FILE, nomorNorm)` tepat sebelum penutup tiap cabang gagal.
      Edit 3 titik di dalam loop `client.on('ready')` (cabang sukses #3 sudah benar, biarkan):
        - Cabang **nomor tidak valid**: di dalam `if (!nomorNorm || nomorNorm.length < 10) { ... }`,
          sebelum `continue;`, panggil `batch.tandaiTerkirim(PROGRESS_FILE, nomorNorm)`.
          (Catatan: untuk nomor yang BENAR-BENAR kosong/invalid, `nomorNorm` bisa `''` atau pendek —
          tetap aman ditandai; itu menandai "sudah diproses" agar tidak dipilih lagi oleh `pilihBatch`.)
        - Cabang **tidak terdaftar** (`else if (numId === null) { ... }`): sebelum `continue;`,
          panggil `batch.tandaiTerkirim(PROGRESS_FILE, nomorNorm)`.
        - Cabang **error kirim** (`catch (err) { ... }`): setelah log `❌`, panggil
          `batch.tandaiTerkirim(PROGRESS_FILE, nomorNorm)`.
      Pertahankan SEMUA log per-kontak (⚠️/❌/✅) dan increment `gagal++`/`sukses++` persis seperti
      sekarang. JANGAN ubah: resolusi `getNumberId`→`chatId`, inner `try/catch` getNumberId
      (tetap "abaikan, lanjut kirim" — JANGAN tandai di sana), kirim `media`+caption, `JEDA_MS`,
      ringkasan SELESAI (Sukses/Gagal). Perbarui komentar di cabang sukses #3 (yang kini berbunyi
      "Nomor gagal tidak dicatat") agar konsisten dengan perilaku baru (mis. "Catat SEGERA: semua
      yang dicoba ditandai processed, baik sukses maupun gagal, biar tidak diulang").
      Files: /projects/sandbox/wa-blast-js/kirim.js
      Verify: `NODE_OPTIONS= node -c /projects/sandbox/wa-blast-js/kirim.js` — keluar tanpa error sintaks.
      (Butuh langkah 1 selesai agar relabel `batch.js` sudah ada; keduanya di-require bersama.)

- [ ] 3. Perbarui `CARA-PAKAI.md` menjelaskan perilaku baru dalam Bahasa Indonesia santai.
      Di bagian batch harian ("Kirim banyak nomor tapi dicicil per hari"), UBAH kalimat yang kini
      salah: "Nomor yang **gagal** kirim gak ditandai, jadi otomatis diulang pas jalan berikutnya."
      Ganti menjadi penjelasan perilaku baru: setiap nomor yang **dicoba** (berhasil ATAU gagal/
      tidak terdaftar/tidak valid) langsung ditandai "sudah diproses" dan **tidak** diulang di run
      berikutnya — jadi tiap batch harian memakai slot sesuai jumlah yang dicoba, bukan hanya yang
      berhasil. Jelaskan konsekuensinya buat user: taruh ~10 nomor/batch dengan harapan ~7 nyampe;
      yang gagal tetap kelihatan di log run itu (hitungan ❌ Gagal) tapi tidak mengulang besok.
      Sesuaikan juga catatan "Nomor yang tidak terdaftar di WhatsApp otomatis dilewati" bila perlu
      agar konsisten (sekarang: dilewati DAN ditandai processed). Pertahankan nada & emoji yang sama.
      Files: /projects/sandbox/wa-blast-js/CARA-PAKAI.md
      Verify: `node -c` tidak berlaku untuk markdown. Tinjau manual: pastikan tidak ada lagi kalimat
      yang bilang nomor gagal "diulang berikutnya", dan bagian baru konsisten dengan `PER_HARI = 10`.

- [ ] 4. Buat harness uji sekali-pakai untuk memverifikasi perilaku "tandai-saat-dicoba" secara
      OFFLINE (tanpa whatsapp-web.js), lalu hapus. Karena mekanik WhatsApp tidak bisa dites offline,
      harness mensimulasikan loop kirim di tingkat `batch.js` + `progress.json`:
        (a) Buat ~15 kontak palsu bernomor unik di sebuah file progress sementara `./_progress_test.json`.
        (b) `perHari = 10`. Jalankan "run 1": `bacaProgress` → `pilihBatch` → assert `batch.length === 10`.
            Simulasikan hasil campuran: untuk ke-10 kontak di batch panggil `batch.tandaiTerkirim`
            TANPA memandang sukses/gagal (mis. tandai #1-#7 sebagai "sukses", #8-#10 sebagai "gagal") —
            inti tes: SEMUA yang dicoba ditandai.
        (c) "Run 2": `bacaProgress` → `pilihBatch` → assert `batch.length === 5` (hanya sisa 5),
            DAN assert tidak ada satu pun nomor dari batch run 1 (termasuk yang "gagal") muncul lagi
            di batch run 2 → membuktikan nomor gagal TIDAK diulang.
        (d) Assert `info.sudahTerkirim` naik sesuai jumlah yang ditandai (10 setelah run 1).
        (e) Uji idempotensi: `tandaiTerkirim` nomor yang sama dua kali tidak menambah panjang `terkirim`.
        (f) Uji nomor tidak valid: `tandaiTerkirim(file, '')` lalu `bacaProgress` tetap valid (array),
            memastikan menandai nomor pendek/kosong tidak merusak file.
      Pakai `assert` bawaan node; cetak "SEMUA TES LULUS ✅" di akhir.
      Files: /projects/sandbox/wa-blast-js/_harness.test.js (buat baru, SEMENTARA)
      Verify: `NODE_OPTIONS= node /projects/sandbox/wa-blast-js/_harness.test.js` — keluar code 0
      dan cetak "SEMUA TES LULUS ✅". Setelah lulus, HAPUS harness & file sementara:
      `rm -f /projects/sandbox/wa-blast-js/_harness.test.js /projects/sandbox/wa-blast-js/_progress_test.json`.
      (Butuh langkah 1.)

- [ ] 5. Verifikasi akhir menyeluruh (offline) & commit lokal.
      Pastikan semua file yang disentuh lulus syntax check dan tidak ada file sementara/progress
      yang ikut ter-stage. Lalu commit lokal (JANGAN push).
      Files: (tidak ada perubahan baru)
      Verify: jalankan dan semua harus bersih —
      `NODE_OPTIONS= node -c /projects/sandbox/wa-blast-js/batch.js` ,
      `NODE_OPTIONS= node -c /projects/sandbox/wa-blast-js/kirim.js` , dan
      `git -C /projects/sandbox/wa-blast-js status` → hanya `batch.js`, `kirim.js`, `CARA-PAKAI.md`
      yang berubah (TIDAK ada `progress.json`, `_harness.test.js`, `_progress_test.json`;
      `.agents/` boleh untracked, jangan di-commit). Lalu:
      `git -C /projects/sandbox/wa-blast-js add batch.js kirim.js CARA-PAKAI.md`
      lalu commit pesan Indonesia singkat, mis.
      "Tandai semua nomor yang dicoba sebagai sudah diproses (gagal/tidak terdaftar tidak diulang)".
      (Butuh langkah 1-4 selesai.)

## Catatan verifikasi (iterasi ini — offline, tanpa internet/WhatsApp)

Dijalankan dari `/projects/sandbox/wa-blast-js` dengan prefix `NODE_OPTIONS=` (kendala sandbox):

- `NODE_OPTIONS= node _harness.test.js` → keluar code 0, cetak **"SEMUA TES LULUS ✅"**. Assertion yang lulus:
  - **T1**: 10 kontak, PER_HARI=10, 1 run dengan 7 "sukses" + 3 "gagal" semua ditandai diproses → run ke-2 memilih **0** sisa (tidak ada 1 pun dari 3 kegagalan yang diulang); `sudahTerkirim === 10`, `selesaiSemua === true`.
  - **T2**: 50 kontak, PER_HARI=10, tiap run menandai semua 10 yang dicoba → **5 run** menutup seluruh 50 (50 unik, tanpa dobel), run ke-**6** memilih **0** (`selesaiSemua`).
  - **T3**: `resetProgress` mengosongkan progress → setelah reset semua kontak terpilih lagi (10).
  - **T4**: progress.json hilang / JSON rusak → `bacaProgress` mengembalikan `{ terkirim: [] }` (aman).
  - **Bonus**: `tandaiTerkirim` idempoten (tak dobel) + menandai nomor kosong `''` tidak merusak file.
- `NODE_OPTIONS= node -c kirim.js` → OK (tanpa error sintaks).
- `NODE_OPTIONS= node -c batch.js` → OK (tanpa error sintaks).
- `NODE_OPTIONS= node -c kontak.js` → OK (tanpa error sintaks).
- Harness sekali-pakai (`_harness.test.js`) + temp (`_progress_test.json`) sudah DIHAPUS; tidak di-commit.
- `node kirim.js` TIDAK dijalankan (butuh koneksi WhatsApp + node_modules; sandbox offline).

Status langkah: [x] 1 (relabel komentar batch.js), [x] 2 (tandai semua cabang di kirim.js),
[x] 3 (CARA-PAKAI.md), [x] 4 (harness lulus & dihapus), [x] 5 (verifikasi + commit).

## Catatan / asumsi

- Tidak ada test framework; verifikasi perilaku pakai harness `node` sekali-pakai dengan `assert`
  bawaan (tanpa dependency baru) — sesuai batasan offline. `batch.js` tidak meng-import
  whatsapp-web.js sehingga harness jalan tanpa `node_modules`.
- `node -c kirim.js` hanya cek sintaks (tidak meng-eksekusi `require`), jadi aman walau
  `node_modules` tidak terpasang di sandbox.
- Kunci JSON `terkirim` sengaja DIPERTAHANKAN (hanya komentar yang di-relabel) demi
  kompatibilitas dengan `progress.json` yang mungkin sudah ada di mesin user & menghindari churn.
- Menandai nomor tidak valid/kosong (`nomorNorm` pendek/`''`) tetap dilakukan: tujuannya agar
  kontak itu tidak dipilih ulang oleh `pilihBatch` di run berikutnya; `pilihBatch` mencocokkan
  per `nomorNorm`, jadi mencatat `''` menandai kontak invalid itu sebagai sudah diproses.

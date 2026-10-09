# 📣 WA Blast (Node.js) — Kirim Gambar + Teks Otomatis

Script ini kirim pesan **+ gambar** ke banyak nomor WhatsApp **otomatis** —
gak perlu klik Send, gak perlu Cmd+V, gak ada drama pop-up.

---

## ✅ Yang kamu butuhkan (di Mac kamu)

1. **Node.js** terinstall
2. **HP** dengan WhatsApp aktif (buat scan QR sekali)

---

## 🔧 Langkah 1 — Install Node.js (kalau belum punya)

Buka aplikasi **Terminal** di Mac (cari lewat Spotlight: `Cmd+Space` → ketik "Terminal").

Cek dulu apakah Node sudah ada:

```bash
node -v
```

- Kalau muncul angka (misal `v20.11.0`) → **sudah ada, lanjut ke Langkah 2**.
- Kalau muncul "command not found" → install dulu:
  - Cara termudah: buka https://nodejs.org → download versi **LTS** → install seperti app biasa.
  - Setelah install, tutup & buka ulang Terminal, lalu cek lagi `node -v`.

---

## 📁 Langkah 2 — Siapkan folder

1. Taruh folder `wa-blast-js` ini di tempat yang gampang, misal di **Downloads**.
2. Masukkan **gambar** yang mau dikirim ke dalam folder ini, kasih nama `gambar.jpg`
   (atau nama lain, nanti sesuaikan di Langkah 4).

Struktur foldernya:

```
wa-blast-js/
├── kirim.js
├── kontak.js
├── package.json
├── gambar.jpg      <-- taruh gambar kamu di sini
└── CARA-PAKAI.md
```

---

## ✍️ Langkah 3 — Edit daftar nomor

Buka file `kontak.js` pakai TextEdit (atau editor apa pun), isi nama + nomor:

```js
module.exports = [
  { nama: 'Budi', nomor: '081394947474' },
  { nama: 'Siti', nomor: '08129506774'  },
  // ... dst (boleh lebih/kurang dari 7)
];
```

- Format nomor bebas: `08xxx` atau `62xxx` — otomatis dinormalkan.
- `nama` boleh dikosongkan `''` kalau gak perlu personalisasi.

---

## ✏️ Langkah 4 — Edit pesan & nama gambar

Buka file `kirim.js`, cari bagian **ATUR DI SINI** di atas:

```js
const PESAN  = `Halo {nama}, ini pesan broadcast dari kami. Terima kasih! 🙏`;
const GAMBAR = 'gambar.jpg';   // kosongkan ('') kalau mau teks saja
const JEDA_MS = 5000;          // jeda antar kirim (ms). 5000 = 5 detik
```

- `{nama}` otomatis diganti nama tiap kontak.
- Kalau nama file gambar kamu beda, ganti `'gambar.jpg'` sesuai nama aslinya.
- Mau kirim **teks saja** (tanpa gambar)? Set `const GAMBAR = '';`

---

## 🚀 Langkah 5 — Jalankan

Di Terminal, masuk ke folder ini. Contoh kalau folder ada di Downloads:

```bash
cd ~/Downloads/wa-blast-js
```

Install dependency (sekali saja, pertama kali):

```bash
npm install
```

Jalankan:

```bash
node kirim.js
```

Akan muncul **QR code** di Terminal.

---

## 📱 Langkah 6 — Scan QR

Di HP:
1. Buka **WhatsApp**
2. **Settings** → **Linked Devices** → **Link a Device**
3. Scan QR code yang muncul di Terminal

Setelah tersambung, script langsung mulai kirim satu per satu. Kamu akan lihat:

```
✅ [1/7] Budi - 6281394947474 -> terkirim.
✅ [2/7] Siti - 628129506774 -> terkirim.
...
===== SELESAI =====
✅ Sukses: 7
❌ Gagal : 0
```

Selesai! Semua pesan + gambar terkirim otomatis. 🎉

(Scan QR cuma sekali — berikutnya sesi tersimpan, langsung jalan.)

---

## 📦 Kirim banyak nomor tapi dicicil per hari (batch harian)

Punya banyak nomor (misal **50**) tapi gak mau kirim semua sekaligus biar aman?
Script ini bisa kirim **sedikit-sedikit tiap hari** dan otomatis inget sampai mana.

**Caranya:**

1. Taruh **semua** nomor sekaligus di `kontak.js` (boleh 50 nomor langsung, gak masalah).
2. Buka `kirim.js`, di bagian **ATUR DI SINI** ada:

   ```js
   const PER_HARI = 10;   // berapa kontak yang dikirim tiap kali jalan
   ```

   Angka ini = berapa kontak yang dikirim **tiap kali** kamu jalanin script.
   Mau 5 per hari? Ganti jadi `5`. Mau 20? Ganti jadi `20`.

3. Jalankan sekali per hari:

   ```bash
   node kirim.js
   ```

   - Hari 1 → kirim ke kontak **1–10**.
   - Hari 2 → jalankan lagi, otomatis kirim ke **11–20** (yang kemarin dilewati).
   - Begitu seterusnya sampai habis.

Script akan nampilin ringkasan tiap jalan:

```
📒 Total kontak        : 50
📨 Sudah terkirim      : 10
📤 Dikirim hari ini    : 10 (maksimal 10)
```

Kalau semua sudah terkirim, muncul:

```
🎉 SEMUA KONTAK SUDAH TERKIRIM. Gak ada yang perlu dikirim lagi.
```

**Progress diingat otomatis** di file `progress.json` (dibuat sendiri). Catatannya
pakai **nomor**, bukan urutan — jadi kamu aman mengubah urutan, nambah, atau hapus
baris di `kontak.js` tanpa risiko ada yang kekirim dobel atau kelewat.

**Penting soal batch:** setiap nomor yang **dicoba** dalam satu batch dihitung
**sudah diproses** — baik yang berhasil, yang **gagal** kirim, yang **tidak terdaftar**
di WhatsApp, maupun nomor yang **tidak valid**. Semuanya **gak akan diulang** besok.
Jadi batch selalu maju: kalau kamu isi **10** nomor dan misalnya **~3 gagal**, besok
tetap lanjut ke **10 berikutnya** (gak nyangkut ngulang-ngulang nomor rusak). Nomor
yang gagal tetap **kelihatan di log** run itu (lihat hitungan `❌ Gagal`) — cuma gak
diulang. Makanya aman taruh ~10 nomor per batch dengan harapan ~7 beneran nyampe.

**Mau mulai ulang dari awal** (anggap semua belum terkirim)? Jalankan:

```bash
node kirim.js --reset
```

---

## ⚠️ Catatan penting

- **Pakai dengan bijak.** Ini WhatsApp Web tidak resmi. Untuk belasan nomor ke
  kontak yang kamu kenal, risiko sangat rendah. Jangan dipakai spam massal ke
  nomor asing — bisa kena pembatasan dari WhatsApp.
- **Jeda (`JEDA_MS`)** sengaja ada biar natural. Jangan di-nol-kan.
- Nomor yang tidak terdaftar di WhatsApp otomatis dilewati (ditandai di log) DAN
  dihitung sudah diproses, jadi gak diulang di run berikutnya.
- Kalau mau logout sesi: hapus folder `.wwebjs_auth` yang muncul otomatis.

---

## ❓ Masalah umum

| Masalah | Solusi |
|---|---|
| `node: command not found` | Node belum terinstall / Terminal belum di-restart. Ulangi Langkah 1. |
| QR code gak kebaca | Perbesar jendela Terminal, kecilkan font, atau coba lagi. |
| `Cannot find module ...` | Belum jalan `npm install`. Jalankan dulu. |
| Pengiriman error di tengah | Biasanya koneksi internet. Jalankan ulang `node kirim.js`. |
| Chrome/puppeteer error | Jalankan `npm install` ulang; pastikan koneksi internet lancar saat install. |
| `Data passed to getter must include an id property ... memoize` | Bug library saat kirim media. Sudah di-fix otomatis oleh `patch.js` (jalan sendiri setelah `npm install`). Kalau masih muncul, jalankan `node patch.js` manual lalu `node kirim.js` lagi. |
| `ProtocolError: ... timed out` | Sudah ditangani: timeout dinaikkan + versi WhatsApp Web di-pin. Kalau masih, jalankan ulang `node kirim.js` (koneksi internet harus stabil). |

---

## 🔧 Soal patch otomatis (`patch.js`)

Versi WhatsApp Web terbaru sempat mematahkan fitur **kirim gambar/media** di
library ini (error "memoize id property"). File `patch.js` memperbaikinya
otomatis dengan menyisipkan satu baris ke dalam library setelah `npm install`.

- Jalan **otomatis** lewat `postinstall` saat kamu `npm install`.
- Kalau perlu jalankan manual: `node patch.js`
- Kalau kamu `npm install` ulang / hapus `node_modules`, patch otomatis dipasang lagi.

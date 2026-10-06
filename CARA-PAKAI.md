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

## ⚠️ Catatan penting

- **Pakai dengan bijak.** Ini WhatsApp Web tidak resmi. Untuk belasan nomor ke
  kontak yang kamu kenal, risiko sangat rendah. Jangan dipakai spam massal ke
  nomor asing — bisa kena pembatasan dari WhatsApp.
- **Jeda (`JEDA_MS`)** sengaja ada biar natural. Jangan di-nol-kan.
- Nomor yang tidak terdaftar di WhatsApp otomatis dilewati (ditandai di log).
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

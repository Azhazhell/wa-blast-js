// =====================================================================
//  WA BLAST - Kirim pesan + gambar OTOMATIS ke banyak nomor
//  Pakai whatsapp-web.js (unofficial WhatsApp Web)
// =====================================================================
//
//  Cara pakai:
//    1. Edit file  kontak.js   -> isi nomor + nama
//    2. Edit bagian PESAN & GAMBAR di bawah
//    3. Jalankan:  node kirim.js
//    4. Scan QR code yang muncul pakai WhatsApp di HP (sekali aja)
//
// =====================================================================

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const kontak = require('./kontak');

// ---------------------------------------------------------------------
//  >>>>>>>>>>>>>>>>  ATUR DI SINI  <<<<<<<<<<<<<<<<
// ---------------------------------------------------------------------

// Pesan / caption. Pakai {nama} untuk personalisasi otomatis.
const PESAN = `Halo {nama}, ini pesan broadcast dari kami. Terima kasih! 🙏`;

// Nama file gambar (taruh di folder yang sama). Kosongkan ('') kalau mau teks saja.
const GAMBAR = 'gambar.jpg';

// Jeda antar pengiriman (milidetik). Jangan terlalu cepat biar aman dari spam-detection.
// 4000 = 4 detik. Untuk aman, pakai 4000-8000.
const JEDA_MS = 5000;

// ---------------------------------------------------------------------
//  >>>>>>>>>>>>>>>>  JANGAN DIUBAH DI BAWAH INI  <<<<<<<<<<<<<<<<
// ---------------------------------------------------------------------

function normalisasiNomor(raw) {
  let n = String(raw).replace(/[^0-9]/g, '');
  if (!n) return '';
  if (n.startsWith('0')) n = '62' + n.slice(1);
  else if (n.startsWith('620')) n = '62' + n.slice(3);
  else if (!n.startsWith('62')) n = '62' + n;
  return n;
}

function tidur(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

const client = new Client({
  authStrategy: new LocalAuth(), // simpan sesi -> gak perlu scan QR tiap kali
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    protocolTimeout: 120000, // naikin timeout 120s -> fix "ProtocolError: ... timed out"
  },
  // Pin versi WhatsApp Web yang stabil (fix bug kirim media versi terbaru)
  webVersionCache: {
    type: 'remote',
    remotePath:
      'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1023017062.html',
  },
});

client.on('qr', (qr) => {
  console.log('\n📱 Scan QR code ini pakai WhatsApp di HP kamu:');
  console.log('   (WhatsApp > Settings > Linked Devices > Link a Device)\n');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  console.log('\n✅ Berhasil login! Sesi tersimpan.\n');
});

client.on('auth_failure', (msg) => {
  console.error('❌ Gagal autentikasi:', msg);
});

client.on('ready', async () => {
  console.log('🚀 WhatsApp siap. Mulai mengirim...\n');

  // Siapkan media kalau ada gambar
  let media = null;
  if (GAMBAR && GAMBAR.trim() !== '') {
    const imgPath = path.join(__dirname, GAMBAR);
    if (!fs.existsSync(imgPath)) {
      console.error(`❌ File gambar "${GAMBAR}" tidak ditemukan di folder ini. Hentikan.`);
      process.exit(1);
    }
    media = MessageMedia.fromFilePath(imgPath);
    console.log(`🖼️  Gambar dimuat: ${GAMBAR}\n`);
  }

  let sukses = 0;
  let gagal = 0;

  for (let i = 0; i < kontak.length; i++) {
    const { nama, nomor } = kontak[i];
    const nomorNorm = normalisasiNomor(nomor);
    const label = `[${i + 1}/${kontak.length}] ${nama || '(tanpa nama)'} - ${nomorNorm}`;

    if (!nomorNorm || nomorNorm.length < 10) {
      console.log(`⚠️  ${label} -> nomor tidak valid, dilewati.`);
      gagal++;
      continue;
    }

    // Pakai getNumberId untuk dapat chatId yang valid (lebih andal dari isRegisteredUser)
    const teks = PESAN.replace(/\{nama\}/g, nama || '');

    try {
      let chatId = `${nomorNorm}@c.us`;

      // Coba resolve nomor -> id resmi WhatsApp. Kalau gagal/null, tetap kirim pakai chatId default.
      try {
        const numId = await client.getNumberId(nomorNorm);
        if (numId && numId._serialized) {
          chatId = numId._serialized;
        } else if (numId === null) {
          console.log(`⚠️  ${label} -> nomor tidak terdaftar di WhatsApp, dilewati.`);
          gagal++;
          continue;
        }
      } catch (e) {
        // getNumberId error (bug library) -> abaikan, lanjut kirim pakai chatId default
      }

      if (media) {
        await client.sendMessage(chatId, media, { caption: teks });
      } else {
        await client.sendMessage(chatId, teks);
      }
      console.log(`✅ ${label} -> terkirim.`);
      sukses++;
    } catch (err) {
      console.log(`❌ ${label} -> gagal: ${err.message}`);
      gagal++;
    }

    // Jeda sebelum nomor berikutnya (kecuali yang terakhir)
    if (i < kontak.length - 1) {
      await tidur(JEDA_MS);
    }
  }

  console.log(`\n===== SELESAI =====`);
  console.log(`✅ Sukses: ${sukses}`);
  console.log(`❌ Gagal : ${gagal}`);
  console.log(`\nTekan Ctrl+C untuk keluar.`);

  // Beri waktu agar pesan benar-benar terkirim sebelum menutup
  await tidur(3000);
  await client.destroy();
  process.exit(0);
});

console.log('⏳ Memulai... tunggu QR code muncul.');
client.initialize();

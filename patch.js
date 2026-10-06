// =====================================================================
//  PATCH OTOMATIS untuk whatsapp-web.js
//  Memperbaiki bug: "Data passed to getter must include an id property
//  (it's how we memoize) but got undefined" saat kirim gambar/media.
//
//  Caranya: menyisipkan `delete message.__x_id;` di dalam fungsi
//  WWebJS.sendMessage pada file node_modules/.../Utils.js
//
//  Script ini jalan OTOMATIS setelah `npm install` (lihat package.json),
//  tapi bisa juga dijalankan manual:  node patch.js
// =====================================================================

const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  'node_modules',
  'whatsapp-web.js',
  'src',
  'util',
  'Injected',
  'Utils.js'
);

try {
  if (!fs.existsSync(target)) {
    console.log('ℹ️  patch: file Utils.js belum ada (jalankan npm install dulu). Lewati.');
    process.exit(0);
  }

  let src = fs.readFileSync(target, 'utf8');

  if (src.includes('delete message.__x_id;')) {
    console.log('✅ patch: sudah terpasang sebelumnya. Aman.');
    process.exit(0);
  }

  // Cari deklarasi object `const message = {` di dalam window.WWebJS.sendMessage
  // lalu sisipkan `delete message.__x_id;` setelah object itu ditutup.
  // Pola paling andal: setelah baris "const message = await window.Store..." ATAU
  // setelah object message dibuat. Kita pakai anchor pada pemanggilan addAndSendMsgToChat / return.
  //
  // Strategi: sisipkan tepat sebelum message dikirim/di-serialize.
  // Anchor umum pada berbagai versi: "const msg = await window.Store.SendMessage" tidak selalu ada,
  // jadi kita cari "window.Store.AddonReactionTable" tidak relevan. Gunakan anchor generic:
  // sisipkan setelah kemunculan pertama "message.id = " ATAU setelah "const message = {".

  let patched = false;

  // Pola 1: object literal "const message = {\n ... \n};" (ambil penutup pertama "};" setelahnya)
  const anchor1 = 'const message = {';
  const idx1 = src.indexOf(anchor1);
  if (idx1 !== -1) {
    // cari penutup object "};" setelah anchor
    const closeIdx = src.indexOf('};', idx1);
    if (closeIdx !== -1) {
      const insertPos = closeIdx + 2; // setelah "};"
      const sisipan =
        '\n\n        // [PATCH] fix bug "memoize id property" saat kirim media' +
        '\n        if (message.__x_id) {\n            delete message.__x_id;\n        }';
      src = src.slice(0, insertPos) + sisipan + src.slice(insertPos);
      patched = true;
    }
  }

  if (!patched) {
    console.log('⚠️  patch: tidak menemukan anchor "const message = {".');
    console.log('    Kemungkinan versi library berbeda. Kirim gambar mungkin tetap error.');
    console.log('    Solusi manual: buka file berikut dan tambahkan `delete message.__x_id;`');
    console.log('    tepat setelah object `const message = { ... };` di fungsi WWebJS.sendMessage:');
    console.log('    ' + target);
    process.exit(0);
  }

  fs.writeFileSync(target, src, 'utf8');
  console.log('✅ patch: berhasil menyisipkan `delete message.__x_id;` ke Utils.js');
  console.log('   Kirim gambar/media sekarang seharusnya berfungsi. 🎉');
} catch (err) {
  console.log('⚠️  patch: gagal (' + err.message + '). Lewati, lanjut jalan.');
  process.exit(0);
}

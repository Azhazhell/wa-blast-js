// =====================================================================
//  batch.js — logika BATCH HARIAN + simpan progress
//  Modul murni (CommonJS). SENGAJA tidak meng-import whatsapp-web.js
//  biar gampang dites tanpa koneksi WhatsApp.
//
//  Progress disimpan BERDASARKAN NOMOR (ter-normalisasi 62xxx), bukan
//  posisi/urutan. Jadi kamu bebas acak-acak urutan kontak.js, nambah
//  atau hapus baris, tanpa risiko kirim dobel atau ada yang kelewat.
// =====================================================================

const fs = require('fs');

// Normalisasi nomor Indonesia ke bentuk stabil 62xxx.
// (Satu-satunya sumber kebenaran normalisasi — dipakai juga oleh kirim.js.)
function normalisasiNomor(raw) {
  let n = String(raw).replace(/[^0-9]/g, '');
  if (!n) return '';
  if (n.startsWith('0')) n = '62' + n.slice(1);
  else if (n.startsWith('620')) n = '62' + n.slice(3);
  else if (!n.startsWith('62')) n = '62' + n;
  return n;
}

// Baca progress.json. Kalau file belum ada atau isinya rusak,
// anggap belum ada yang terkirim -> kembalikan { terkirim: [] }.
function bacaProgress(filePath) {
  try {
    const isi = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(isi);
    if (data && Array.isArray(data.terkirim)) return { terkirim: data.terkirim };
    return { terkirim: [] };
  } catch (e) {
    // file belum ada / JSON rusak -> mulai dari kosong
    return { terkirim: [] };
  }
}

// Tulis objek progress ke file (JSON rapi biar enak dibaca manusia).
function tulisProgress(filePath, progressObj) {
  const data = { terkirim: Array.isArray(progressObj.terkirim) ? progressObj.terkirim : [] };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Tandai satu nomor (sudah ter-normalisasi) sebagai terkirim, lalu
// simpan SEGERA ke file. Idempoten: nomor yang sudah ada tidak diduplikasi.
function tandaiTerkirim(filePath, nomorNorm) {
  const progress = bacaProgress(filePath);
  if (!progress.terkirim.includes(nomorNorm)) {
    progress.terkirim.push(nomorNorm);
    tulisProgress(filePath, progress);
  }
  return progress;
}

// Hapus file progress (buat --reset). Aman kalau file belum ada.
function resetProgress(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch (e) {
    // file memang belum ada -> tidak masalah
  }
}

// Inti seleksi batch. Dari semua kontak, buang yang nomornya sudah
// tercatat terkirim, lalu ambil maksimal `perHari` kontak pertama
// yang belum terkirim.
function pilihBatch(semuaKontak, progressObj, perHari) {
  const sudahSet = new Set((progressObj && progressObj.terkirim) || []);

  // Lampirkan nomorNorm ke tiap kontak biar kirim.js tinggal pakai.
  const semua = semuaKontak.map((k) => ({
    nama: k.nama,
    nomor: k.nomor,
    nomorNorm: normalisasiNomor(k.nomor),
  }));

  const belum = semua.filter((k) => !sudahSet.has(k.nomorNorm));
  const batch = belum.slice(0, perHari);

  return {
    total: semua.length,
    sudahTerkirim: semua.length - belum.length,
    sisa: belum.length,
    batch,
    selesaiSemua: belum.length === 0,
  };
}

module.exports = {
  normalisasiNomor,
  bacaProgress,
  tulisProgress,
  tandaiTerkirim,
  resetProgress,
  pilihBatch,
};

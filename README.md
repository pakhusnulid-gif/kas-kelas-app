# Kas Kelas

Aplikasi pencatatan kas kelas untuk bendahara. Mobile-first, tanpa server, tanpa login.
Semua data tersimpan di HP (localStorage) dan tetap bisa dibuka tanpa internet (PWA).

**Live:** https://kas-kelas-app.netlify.app

Dikembangkan oleh [pakhusnul.id](https://pakhusnul.id).

## Cara pakai

1. Buka `index.html` lewat browser (bisa langsung double-click).
2. Isi **Atur → Identitas** (nama kelas, bendahara, saldo awal).
3. Isi **Atur → Anggota**, bisa tempel banyak nama sekaligus, satu per baris.
4. Catat uang masuk/keluar dari **Beranda**.
5. Buat **Iuran**, lalu centang nama yang sudah bayar → uang masuk tercatat otomatis.
6. Akhir bulan: **Atur → Laporan → Salin laporan**, tempel di grup WhatsApp.

## Untuk mencoba cepat

Atur → **Isi contoh** memuat 6 anggota, 3 transaksi, dan 1 iuran.

## Fitur

- Catat transaksi dengan keypad angka (3 ketukan, tanpa keyboard).
- Saldo selalu dihitung ulang dari riwayat, jadi tidak bisa "melenceng".
- Riwayat per bulan, bisa diubah/dihapus.
- Iuran per periode + status lunas per anggota.
- **Salin tunggakan** → teks siap tempel di grup WhatsApp.
- **Cek uang fisik** → deteksi selisih antara catatan dan uang tunai.
- Laporan bulanan (masuk, keluar, per kategori, status iuran) siap dibagikan.
- PIN opsional untuk membuka aplikasi.
- Backup/restore `.json`, dengan opsi menyertakan atau mengosongkan PIN.

## Struktur

```
index.html            kerangka halaman
css/styles.css        tampilan (mobile-first, terang & gelap)
js/store.js           data & logika (localStorage)
js/app.js             tampilan & interaksi
manifest.webmanifest  metadata PWA
sw.js                 service worker (offline)
_headers              aturan cache Netlify
icons/                ikon aplikasi
test/store.test.js    cek logika uang
```

Tidak ada build step. Ubah file, refresh browser.

Cek logika setelah mengubah perhitungan:

```powershell
node test/store.test.js
```

## Deploy ulang

Setelah mengubah file:

```powershell
.\deploy.ps1
```

Skrip itu menyalin hanya file aplikasi ke `dist/` (folder `.agents` dan catatan
internal tidak ikut terpublish), lalu mengunggahnya ke Netlify.
Login Netlify sekali saja: `npx netlify-cli@latest login`.

## Menjalankan sebagai PWA

Service worker butuh `http://` atau `https://` (tidak jalan di `file://`).

```powershell
python -m http.server 8123
```

Lalu buka `http://localhost:8123`. Di HP, buka lewat jaringan lokal
(`http://IP-KOMPUTER:8123`) atau deploy ke Netlify/GitHub Pages supaya bisa
"Tambahkan ke layar utama".

## Pasang di HP

Buka https://kas-kelas-app.netlify.app di HP.

- **Android (Chrome/Edge):** ketuk **Pasang di HP** saat ajakan muncul, atau menu titik tiga > **Instal aplikasi**.
- **iPhone/iPad (Safari):** ketuk **Bagikan** > **Tambahkan ke Layar Utama** > **Tambah**.
- **Browser dalam aplikasi** (WhatsApp, Instagram): salin link dulu, buka di Chrome atau Safari.

Ajakan otomatis muncul sekali dan bisa ditutup. Tombol **Atur > Aplikasi > Pasang di HP** tetap tersedia kapan saja.

## Penting soal data

Data hanya ada di browser HP yang dipakai. Kalau cache dibersihkan atau ganti HP,
data hilang. Lakukan **Backup (.json)** secara berkala dan simpan filenya
(drive pribadi / chat sendiri).

## Batasan yang disengaja

Satu bendahara, satu perangkat. Tidak ada sinkronisasi multi-user, tidak ada
akuntansi double-entry, tidak ada approval. Tambah fitur itu hanya kalau benar-benar
dibutuhkan.

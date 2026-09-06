# Pengamanan dan aktivasi Infra-Map

Perubahan ini harus diaktifkan bersama migrasi database. Mengganti kode saja belum
menutup akses langsung pada Supabase atau deployment Apps Script yang lama.
Panduan ini tidak menyatakan produksi sudah dimigrasikan atau sistem bebas celah.

## Hak akses dan alur pengguna

Petugas yang sudah login tetap boleh melihat dan mengedit seluruh inventaris
survei. Identitas pembuat diambil dari sesi server dan tidak dapat diganti melalui
payload. Admin menangani penghapusan massal, perbaikan kode, master wilayah,
sinkronisasi administratif, dan perubahan lisensi. Pelacakan petugas mengikuti
tim akun di database, bukan parameter yang dikirim browser.

Login tetap menerima email, nomor telepon, atau alias yang terdaftar. Password
diverifikasi memakai scrypt; akun fallback tanpa database sudah dinonaktifkan.
Cookie sesi acak bersifat HttpOnly, SameSite=Lax dan Secure di produksi, berlaku
maksimal tujuh hari. Server memeriksa status akun setiap permintaan. Logout
mencabut sesi; perubahan password membatalkan sesi perangkat lain. Pengguna dapat
mengubah password sendiri melalui Profil > Ubah password (minimal 15 karakter).

Sesi kedaluwarsa meminta login kembali. Antrean IndexedDB tidak dihapus, dan
sinkronisasi hanya memproses draf pemilik akun yang sedang masuk. Profil offline
adalah tampilan lokal, bukan bukti autentikasi server. Hindari berbagi profil
browser karena draf lokal belum dienkripsi. Halaman formulir baru dan aset statis
disimpan service worker; halaman inventaris dan respons API tidak dicache olehnya.

## Aktivasi terkoordinasi

1. Siapkan waktu pemeliharaan singkat. Backup database dan verifikasi pemulihan
   pada database uji. Catat target koneksi tanpa menyalin kredensial ke log.
2. Ganti semua password/key yang pernah ditanam dalam source atau riwayat Git:
   database, Supabase secret/service role, OpenRouter, dan kredensial integrasi
   terkait. Penghapusan literal dari source tidak mencabut key lama. Batasi key
   Maps browser berdasarkan domain dan API; jangan menaruh secret server pada
   variabel `NEXT_PUBLIC_*`.
3. Isi `APP_ORIGIN` dengan origin HTTPS yang diakses pengguna, tanpa path. Isi
   `DATABASE_URL`, atau Supabase server key `SUPABASE_SECRET_KEY` /
   `SUPABASE_SERVICE_ROLE_KEY` dan `SUPABASE_URL`. Public/anon key tidak digunakan
   lagi untuk akses data aplikasi. Untuk migrasi Supabase tetap gunakan koneksi
   PostgreSQL project tersebut. TLS memverifikasi sertifikat; gunakan
   `DATABASE_CA_CERT` bila perlu.
4. Pada checkout rilis dengan dependensi development terpasang, jalankan
   `npm run security:prepare` untuk laporan baca saja. Setelah target dan backup
   benar, jalankan `npm run security:prepare -- --apply --rotate-passwords`.
   Script menjalankan `supabase/security_migration.sql`, membuat tabel sesi/rate
   limit, menghapus policy publik pada tabel aplikasi, dan mengacak password
   akun. Kredensial disimpan hanya dalam `.security-bootstrap/accounts-*.json`;
   bagikan secara privat, lalu pindahkan ke penyimpanan rahasia yang aman.
   Jangan commit atau unggah file tersebut. Di Windows periksa ACL folder secara
   langsung karena mode POSIX 0600 bukan pengganti ACL Windows.
5. Akun yang tidak ada dalam database tidak dibuat otomatis. Hanya jika memang
   diperlukan, opsi eksplisit `--seed-legacy-accounts` menambahkan akun direktori
   lama. Tinjau daftar sebelum menggunakannya. Status akun nonaktif dipertahankan.
6. Pasang `google-apps-script/Code.gs` yang baru, tambahkan Script Property
   `APPS_SCRIPT_SHARED_SECRET`, dan isi nilai sama pada environment server.
   Redeploy Web App dan cabut deployment lama. API baca/tulis sekarang melalui
   POST terautentikasi; login, daftar password, dan inisialisasi publik ditutup.
   Script CLI lama yang memanggil GET Apps Script perlu diperbarui sebelum dipakai.
7. Jalankan `npm run check`, `npm run test:security`, `npm run build`, lalu
   `node --env-file=.env.local scripts/security-preflight.mjs`. Deployment VPS
   menjalankan preflight sebelum pengalihan release; tidak merotasi akun otomatis.
8. Aktifkan rilis lalu uji login admin/petugas, edit data bersama, foto, peta,
   ekspor, logout, dan antrean offline pada perangkat nyata. Jika aktivasi gagal,
   jangan mengaktifkan kembali kode login plaintext terhadap database yang sudah
   dimigrasikan; pertahankan maintenance dan perbaiki rilis aman.

Migrasi harus dijalankan oleh pemilik tabel/DBA. Pengguna runtime PostgreSQL perlu
hak tabel yang sesuai; untuk Supabase digunakan service role server. Tidak ada
perubahan otomatis pada database produksi oleh pengujian lokal.

## Pemeriksaan otomatis

`npm run test:security` menjalankan handler asli pada PostgreSQL terisolasi
(PGlite) dan IndexedDB uji. Skenario mencakup autentikasi setiap API, pemalsuan
sesi, akses admin, CSRF Origin, perubahan role, kepemilikan atribusi, pengeditan
bersama, rate limit, pencabutan sesi, RLS, dan antrean offline saat login berakhir.

Workflow Security analysis menambahkan CodeQL dan Gitleaks untuk riwayat Git,
dengan output secret disamarkan. CodeQL memerlukan dukungan GitHub Code Security
untuk repository privat. Pemeriksaan riwayat bisa tetap gagal karena secret lama;
tindak lanjuti rotasi, jangan mengabaikan seluruh temuan atau force-push riwayat.
Workflow ini terpisah dari deploy; pengaturan required checks/branch protection
di GitHub belum diubah. Deploy menjalankan regresi dan audit dependensi high.

## Batasan yang perlu ditindaklanjuti

- Link foto Google Drive yang sebelumnya dibagikan publik masih dapat dibuka
  pemilik link. Perlu migrasi penyimpanan privat dan proxy foto terautentikasi
  untuk kerahasiaan penuh; mencabut link langsung dapat merusak foto lama.
- Belum ada verifikasi firewall VPS, SSH, backup terjadwal, log akses produksi,
  ataupun penetrasi langsung layanan eksternal.
- CSP saat ini membatasi embedding/form/object; belum merupakan CSP script nonce
  menyeluruh. Popup Leaflet disanitasi DOMPurify. Validasi gambar memeriksa ukuran
  dan signature, bukan pemindaian malware atau decoder gambar lengkap.
- Fallback pembacaan mirror masih dapat menyajikan data lama ketika penyimpanan
  primer bermasalah. Pantau kegagalan sinkronisasi. Data kosong yang valid pada
  penyimpanan primer tidak lagi memicu fallback inventaris.
- Jalur login Supabase mencari maksimal 1.000 akun; untuk skala lebih besar gunakan
  PostgreSQL utama atau indeks identitas terpisah.

Referensi: [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html),
[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[Gitleaks](https://github.com/gitleaks/gitleaks),
[CodeQL Action](https://github.com/github/codeql-action).

## Hasil pemeriksaan lokal (6 September 2026)

- Format, TypeScript, dan build produksi Next.js lulus.
- Dua belas skenario regresi keamanan lulus (13 hasil termasuk suite induk).
- Audit npm dependensi produksi: nol kerentanan yang dikenal saat pemeriksaan.
- Gitleaks source aplikasi dan Apps Script: tanpa temuan. Riwayat 156 commit:
  20 temuan (19 generic API key, satu private key); perlu klasifikasi dan rotasi
  di penyedia, bukan bukti bahwa semua nilai masih aktif atau telah disalahgunakan.
- Tidak ada migrasi, rotasi kredensial, atau deployment produksi yang dilakukan
  oleh rangkaian pemeriksaan ini. CI CodeQL belum dijalankan di GitHub.

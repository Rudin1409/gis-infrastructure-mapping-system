# Infrastructure Mapping System — Infra-Map

Aplikasi Web GIS untuk pendataan tiang dan jalur jaringan infrastruktur di Kota
Lubuklinggau. Aplikasi menggabungkan survei lapangan, GPS, foto, inventaris provider,
kondisi tiang, jaringan kabel, dan ringkasan data untuk petugas serta admin.
Kategori infrastruktur mencakup FO/WiFi, PJU mandiri, PLN dengan PJU, dan PLN murni.

README ini menjelaskan implementasi repository, termasuk pilihan database,
integrasi lama, pengembangan, deployment, dan batasan operasional. Jumlah data
serta status layanan produksi dapat berubah; keduanya bukan konstanta proyek.

## Daftar isi

- [Fitur dan halaman](#fitur-dan-halaman)
- [Teknologi dan struktur proyek](#teknologi-dan-struktur-proyek)
- [Arsitektur dan alur data](#arsitektur-dan-alur-data)
- [Menjalankan proyek](#menjalankan-proyek)
- [Konfigurasi lingkungan](#konfigurasi-lingkungan)
- [Database dan model data](#database-dan-model-data)
- [Referensi API](#referensi-api)
- [Survei offline dan pembaruan data](#survei-offline-dan-pembaruan-data)
- [Integrasi Google dan AI](#integrasi-google-dan-ai)
- [Script pemeliharaan](#script-pemeliharaan)
- [Deployment VPS](#deployment-vps)
- [Panduan perubahan dan verifikasi](#panduan-perubahan-dan-verifikasi)
- [Pemecahan masalah](#pemecahan-masalah)
- [Batasan implementasi](#batasan-implementasi)

## Fitur dan halaman

| Halaman            | Fungsi                                                                             |
| ------------------ | ---------------------------------------------------------------------------------- |
| `/`                | Dashboard jumlah tiang, kondisi, provider, wilayah, dan estimasi panjang jaringan. |
| `/login`           | Masuk melalui email, nomor telepon, atau alias yang didukung fallback akun.        |
| `/map`             | Peta GIS, marker tiang, filter, jalur jaringan, dan alat pemetaan.                 |
| `/poles`           | Daftar inventaris dengan pencarian dan filter.                                     |
| `/poles/new`       | Survei baru: koordinat, wilayah, provider, kondisi, kategori, dan foto.            |
| `/poles/[id]`      | Detail tiang dan tindakan terkait data tersebut.                                   |
| `/poles/[id]/edit` | Penyuntingan data tiang.                                                           |
| `/segments`        | Informasi segmen jaringan kabel.                                                   |
| `/providers`       | Ringkasan inventaris menurut provider.                                             |
| `/districts`       | Pengelolaan master kelurahan dan kecamatan terkait.                                |
| `/surveyor`        | Portal petugas survei.                                                             |
| `/mobile`          | Tampilan untuk penggunaan perangkat seluler.                                       |
| `/profile`         | Informasi profil pengguna.                                                         |
| `/ai`              | Asisten GIS yang terhubung ke layanan AI.                                          |
| `/admin`           | Ringkasan administrasi, sumber data, wilayah, dan informasi pengaturan.            |
| `/system-gateway`  | Pengaturan kunci akses modul pemetaan.                                             |

Navigasi dan tampilan mengikuti konteks pengguna serta mode layar. Tipe peran yang
tersedia adalah `ADMIN_KOMINFO`, `SURVEYOR`, dan `SUPER_ADMIN`; tim petugas mencakup
KOMINFO dan BAPENDA. Informasi pengaturan pada admin tidak semuanya merupakan
pengaturan server yang dapat diedit; lihat handler halaman untuk tindakan aktifnya.

## Teknologi dan struktur proyek

| Bagian            | Implementasi                                                            |
| ----------------- | ----------------------------------------------------------------------- |
| Web dan API       | Next.js 14 App Router, React 18, TypeScript                             |
| Antarmuka         | Tailwind CSS, Lucide React, `clsx`, `tailwind-merge`                    |
| GIS               | Leaflet, utilitas spasial internal, Google Maps/Street View, OSRM       |
| Validasi          | Zod pada jalur CRUD tiang                                               |
| Database          | PostgreSQL melalui `pg`, atau Supabase melalui `@supabase/supabase-js`  |
| Foto dan cadangan | Google Drive, Google Sheets, Google Apps Script, `googleapis`           |
| Offline           | IndexedDB, service worker, manifest aplikasi                            |
| Pengembangan      | TypeScript, Prettier; versi dependency pasti ada di `package-lock.json` |
| Deployment        | GitHub Actions, SSH, Bash, PM2                                          |

```text
src/
  app/                   Halaman App Router, layout, loading, dan API
    api/                 Handler HTTP aplikasi
  components/            UI per fitur: map, survey, common, districts, dll.
  config/                Master wilayah Lubuklinggau dan normalisasi provider
  context/               Status autentikasi dan mode tampilan
  hooks/                 Penyegaran inventaris dan kehadiran surveyor
  lib/
    ai/                  Aturan fitur berdasarkan lingkungan
    gis/                 Jarak, alamat, batas wilayah, rute, ekspor, Street View
    google/              Client Sheets, Drive, dan Apps Script
    offline/             Antrean survei IndexedDB
    utils/               Format, ID, gambar, dan kelas CSS
    validation/          Schema input tiang
    postgres.ts          Pool PostgreSQL dan helper SQL
    supabase.ts          Client Supabase yang dibuat saat diperlukan
    systemLicense.ts     Penyimpanan status kunci modul peta
  repositories/
    interfaces/          Kontrak akses data
    *Repository.ts       Implementasi penyimpanan dan adapter lama
    *Factory.ts          Pintu masuk pemilihan repository
  services/              Aturan bisnis tiang, statistik, dan mirror Sheets
  types/                 Kontrak data domain
public/                  Aset, ikon, manifest, dan sumber service worker
supabase/                Schema awal dan migrasi SQL
google-apps-script/      Backend Apps Script (Code.gs)
scripts/                 Setup, migrasi, pemeriksaan integrasi, deployment
.github/workflows/       Workflow deploy VPS
```

Alias `@/*` menunjuk ke `src/*`. `.next/`, `node_modules/`, arsip deployment, dan
`*.tsbuildinfo` merupakan hasil proses atau dependency, bukan sumber aplikasi.

## Arsitektur dan alur data

Alur umum penulisan data tiang:

```text
SurveyForm / EditPoleForm
  → /api/poles atau /api/poles/[id]
  → validasi Zod
  → PoleService (normalisasi provider dan perhitungan jarak)
  → getPoleRepository()
  → PostgreSQL jika koneksi terisi; Supabase jika tidak
  → respons ke pengguna + mirror Google Sheets secara asinkron
```

Halaman server juga dapat membaca service/repository secara langsung. Dashboard
menggabungkan tiang, provider, dan segmen. Perhitungan survei hari ini menggunakan
zona waktu `Asia/Jakarta`.

### Pemilihan penyimpanan

1. `src/lib/postgres.ts` membaca koneksi dengan urutan `DATABASE_URL`, `POSTGRES_URL`,
   `POSTGRESQL_URL`, lalu `PG_CONNECTION_STRING`.
2. Jika salah satunya terisi, repository aktif memakai PostgreSQL.
3. Jika semuanya kosong, jalur aktif menggunakan Supabase.
4. Koneksi PostgreSQL yang salah tetap memilih mode PostgreSQL; ini bukan perpindahan
   otomatis ke Supabase setiap kali query gagal.

`SupabasePoleRepository` dan `SupabaseDistrictRepository` merupakan nama historis:
keduanya juga menangani PostgreSQL langsung. Factory provider dan segmen berada di
`GoogleSheetsProviderRepository.ts` dan `GoogleSheetsSegmentRepository.ts`, tetapi
mengembalikan implementasi aktif PostgreSQL/Supabase. Adapter Sheets, Apps Script,
dan mock tetap tersedia; factory tiang tidak otomatis memilih mock ketika env kosong.

`GET /api/system/data-source` menampilkan backend aktif dan jumlah data. Gunakan
endpoint ini untuk memastikan lingkungan yang dibaca aplikasi. URL database pada
respons disamarkan, tetapi tetap memuat metadata koneksi.

### Aturan bisnis utama

- Provider dinormalisasi melalui `src/config/providers.ts`.
- Pada pembuatan tiang PLN murni atau gabungan PLN/PJU, kepemilikan kosong atau
  `SENDIRI` disesuaikan menjadi `BERSAMA_PLN`.
- Koordinat pin disimpan terpisah dari koordinat perangkat. Jarak dihitung memakai
  Haversine jika koordinat perangkat tersedia dan jarak belum diberikan.
- QC lokasi memberi peringatan pada jarak lebih dari 50 m dan status berlebih pada
  jarak lebih dari 100 m untuk membantu pemeriksaan posisi lapangan.
- Estimasi jaringan merupakan hasil perhitungan spasial, bukan pengukuran kabel fisik.
- Lingkungan Vercel dideteksi melalui flag/hostname; AI dan jalur mutasi yang memakai
  guard dinonaktifkan. Tersedia cutoff data demo `2026-08-29T14:15:00.000Z`.
  Guard belum diterapkan seragam di seluruh endpoint.

## Menjalankan proyek

Gunakan Node.js 22 agar sama dengan workflow CI, npm, serta database development.
GPS, kamera, peta daring, dan integrasi eksternal bergantung pada izin browser,
jaringan, dan konfigurasi layanan masing-masing.

```bash
npm ci
```

Salin konfigurasi contoh sesuai terminal:

```powershell
# PowerShell
Copy-Item .env.local.example .env.local
```

```bash
# Bash
cp .env.local.example .env.local
```

Jika `.env.local` sudah ada, pertahankan isinya dan lengkapi variabel yang diperlukan.
Isi koneksi development sendiri sebelum menguji penulisan. Integrasi lama memiliki
fallback konfigurasi; env kosong belum tentu berarti tidak ada koneksi eksternal.

```bash
npm run dev
```

Buka [aplikasi lokal](http://localhost:3000), lalu masuk dengan akun lingkungan
tersebut. Urutan autentikasi dijelaskan di [batasan implementasi](#batasan-implementasi).
Restart setelah mengubah environment. Perubahan `NEXT_PUBLIC_*` memerlukan build
ulang produksi karena nilainya dapat masuk ke bundle browser.

### Perintah harian

| Perintah               | Kegunaan                                                |
| ---------------------- | ------------------------------------------------------- |
| `npm run dev`          | Server pengembangan.                                    |
| `npm run format`       | Merapikan sumber/dokumentasi yang didukung Prettier.    |
| `npm run format:check` | Memeriksa format tanpa mengubah file.                   |
| `npm run lint`         | Alias pemeriksaan format; bukan analisis aturan ESLint. |
| `npm run typecheck`    | Pemeriksaan TypeScript tanpa menghasilkan JavaScript.   |
| `npm run check`        | Pemeriksaan format dilanjutkan TypeScript.              |
| `npm run build`        | Membuat bundle produksi Next.js.                        |
| `npm run start`        | Menjalankan bundle yang sudah dibangun.                 |

`next.config.mjs` melewati pemeriksaan ESLint dan TypeScript saat build. Karena itu,
keberhasilan build saja belum mencakup pemeriksaan tipe; jalankan `npm run check`.

## Konfigurasi lingkungan

Contoh ada di [`.env.local.example`](.env.local.example). Jangan memasukkan secret
ke README, commit, atau variabel berawalan `NEXT_PUBLIC_`.

| Variabel                                                       | Fungsi dan prioritas                                                  |
| -------------------------------------------------------------- | --------------------------------------------------------------------- |
| `DATABASE_URL`                                                 | Koneksi PostgreSQL utama; alias dijelaskan di atas.                   |
| `DATABASE_SSL`                                                 | `true`: SSL aktif; `false`: nonaktif; kosong: deteksi hostname.       |
| `DATABASE_POOL_MAX`                                            | Batas pool, default 10.                                               |
| `DATABASE_IDLE_TIMEOUT_MS`                                     | Timeout koneksi idle, default 30000 ms.                               |
| `DATABASE_CONNECTION_TIMEOUT_MS`                               | Timeout pembukaan koneksi, default 10000 ms.                          |
| `NEXT_PUBLIC_SUPABASE_URL`                                     | URL project Supabase fallback.                                        |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`                         | Key Supabase yang diprioritaskan.                                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`                                | Alternatif jika publishable key kosong.                               |
| `NEXT_PUBLIC_APPS_SCRIPT_URL`, `APPS_SCRIPT_URL`               | URL Web App Apps Script; variabel public diprioritaskan.              |
| `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID` | Ketiganya diperlukan untuk deteksi konfigurasi Google langsung.       |
| `GOOGLE_DRIVE_FOLDER_ID`                                       | Folder tujuan upload Drive langsung.                                  |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`                              | Key browser Maps/Street View.                                         |
| `GOOGLE_MAPS_API_KEY`                                          | Key server foto Street View; fallback ke key browser.                 |
| `LOCATIONIQ_API_KEY`                                           | Reverse geocoding melalui endpoint server.                            |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`                       | Key/model AI; default model ada di contoh env dan handler.            |
| `MASTER_SECURITY_PIN`                                          | PIN perubahan status kunci sistem.                                    |
| `VERCEL`, `NEXT_PUBLIC_VERCEL_ENV`                             | Deteksi lingkungan demo; biarkan mati untuk development penuh.        |
| `NEXT_PUBLIC_APP_URL`                                          | Metadata contoh env; belum dibaca runtime `src/`.                     |
| `GIS_DEPLOY_ROOT`                                              | Root PM2/deploy; script membatasi lokasi ke `/home/admin/gis-deploy`. |

Script lama juga memakai `SUPABASE_URL`, `SUPABASE_KEY`, `DB_PASSWORD`, dan
`PROJECT_REF`. Itu bukan pengganti otomatis `NEXT_PUBLIC_SUPABASE_*` pada aplikasi.
Baca konfigurasi script sebelum menggunakannya.

## Database dan model data

| Tabel                | Isi                                                                 |
| -------------------- | ------------------------------------------------------------------- |
| `poles`              | Titik tiang, kategori, provider, kondisi, lokasi, foto, dan survei. |
| `providers`          | Master penyedia jaringan dan informasi visual.                      |
| `segments`           | Hubungan titik awal/akhir dan atribut jaringan kabel.               |
| `users`              | Akun petugas; juga record khusus status kunci sistem.               |
| `subdistricts`       | Master kelurahan, kecamatan, kode, dan urutan.                      |
| `surveyor_locations` | Posisi terbaru petugas, tim, akurasi, dan waktu pembaruan.          |

Schema awal ada di [`supabase/schema.sql`](supabase/schema.sql), master kelurahan
di [`supabase/subdistricts_migration.sql`](supabase/subdistricts_migration.sql),
dan migrasi lokasi petugas di
[`supabase/surveyor_locations_migration.sql`](supabase/surveyor_locations_migration.sql).
Schema utama sudah mendefinisikan tabel lokasi petugas; pilih migrasi tambahan sesuai
kondisi database, jangan menjalankan seluruh file berulang tanpa pemeriksaan.

Untuk database development baru, jalankan schema utama lalu schema kelurahan melalui
SQL editor atau `psql`. SQL tersebut juga berisi policy dan seed, bukan sekadar tabel.
`CREATE POLICY` pada file awal tidak seluruhnya idempoten: eksekusi ulang dapat gagal
karena policy sudah ada. Schema awal tidak mengisi seluruh inventaris tiang/provider/
segmen; data tersebut berasal dari survei atau migrasi terpisah.

Objek TypeScript/API memakai `camelCase`, kolom SQL memakai `snake_case`, dan repository
mengonversi keduanya. Kontrak lengkap ada di [`src/types/pole.ts`](src/types/pole.ts),
[`src/types/segment.ts`](src/types/segment.ts), dan `src/repositories/interfaces/`.

| Atribut           | Nilai domain                                            |
| ----------------- | ------------------------------------------------------- |
| Kondisi           | `GOOD`, `NEEDS_REPAIR`, `DAMAGED`, `UNKNOWN`            |
| Validasi          | `DRAFT`, `SUBMITTED`, `VERIFIED`, `REJECTED`            |
| Metode lokasi     | `MANUAL_MAP_PIN`, `GPS_DEVICE`, `IMPORT_DATA`           |
| Kategori          | `FO_WIFI`, `PJU_MANDIRI`, `GABUNG_PLN_PJU`, `PLN_MURNI` |
| Material          | `BETON`, `BESI`, `KAYU`, `LAINNYA`, `TIDAK_DIKETAHUI`   |
| Kabel tiang       | `UDARA`, `BAWAH_TANAH`, `TRANSISI_RISER`                |
| Pemasangan segmen | `AERIAL`, `UNDERGROUND`, `OTHER`                        |

Union TypeScript tidak selalu berarti validasi runtime sama ketatnya: beberapa field
Zod masih menerima string umum. Rujukan payload runtime adalah
[`src/lib/validation/poleSchema.ts`](src/lib/validation/poleSchema.ts).

## Referensi API

Mayoritas endpoint mengembalikan JSON dengan `success`, lalu `data`/`count` atau
`error`. Payload dan kode status mengikuti handler masing-masing; ekspor dan foto
Street View dapat mengembalikan konten selain JSON.

| Method                 | Endpoint                    | Fungsi                                                       |
| ---------------------- | --------------------------- | ------------------------------------------------------------ |
| POST                   | `/api/auth/login`           | Verifikasi kredensial dan profil.                            |
| GET, POST              | `/api/poles`                | Daftar/pencarian dan pembuatan satu tiang.                   |
| GET, PUT, DELETE       | `/api/poles/[id]`           | Baca, ubah, hapus satu tiang.                                |
| POST                   | `/api/poles/batch`          | Membuat beberapa tiang dan opsional segmen.                  |
| POST                   | `/api/poles/batch-delete`   | Menghapus beberapa ID tiang.                                 |
| GET                    | `/api/poles/codes`          | Referensi kode tiang.                                        |
| POST                   | `/api/poles/fix-codes`      | Pemeliharaan kode tiang tersimpan.                           |
| GET                    | `/api/poles/export`         | Unduh KML, CSV, atau GeoJSON.                                |
| GET                    | `/api/providers`            | Daftar provider.                                             |
| GET, POST              | `/api/segments`             | Daftar dan pembuatan segmen.                                 |
| GET                    | `/api/dashboard`            | Statistik inventaris.                                        |
| GET, POST, PUT, DELETE | `/api/districts`            | CRUD wilayah; update dapat mengubah referensi tiang terkait. |
| POST                   | `/api/districts/reset`      | Reset master wilayah.                                        |
| POST                   | `/api/upload`               | Upload multipart dengan field `photo`.                       |
| GET, POST              | `/api/surveyors/active`     | Membaca/memperbarui kehadiran dan lokasi petugas.            |
| GET                    | `/api/gis/reverse-geocode`  | Informasi alamat dari koordinat.                             |
| GET                    | `/api/streetview/photo`     | Proxy foto Street View.                                      |
| POST                   | `/api/ai/chat`              | Permintaan asisten GIS.                                      |
| GET                    | `/api/system/data-source`   | Backend aktif dan jumlah record.                             |
| GET, POST              | `/api/system/license`       | Baca/ubah status kunci modul peta.                           |
| POST                   | `/api/admin/sync-to-sheets` | Menulis ulang mirror tiang, provider, segmen di Sheets.      |

### Filter dan contoh payload

`GET /api/poles` menerima `providerId`, `condition`, `kecamatan`, `kelurahan`,
`poleType`, dan `search`. Jika `lat`/`lng` valid diberikan, pencarian terdekat memakai
`radius` default 75 m (batas 10–500 m) dan `limit` default 20 (batas 1–100).
Tanpa koordinat, `limit` tersebut bukan pagination daftar umum.

```text
GET /api/poles?condition=GOOD&search=merdeka
GET /api/poles?lat=-3.3&lng=102.86&radius=100&limit=10
GET /api/poles/export?format=geojson
```

Contoh pembuatan di database uji; sesuaikan provider dan wilayah dengan master:

```json
{
  "poleLatitude": -3.3,
  "poleLongitude": 102.86,
  "providerId": "ID_PROVIDER_UJI",
  "poleType": "BETON",
  "condition": "GOOD",
  "road": "Jalan Contoh",
  "kelurahan": "Air Kuti",
  "kecamatan": "Lubuklinggau Timur I",
  "locationMethod": "MANUAL_MAP_PIN",
  "infrastructureCategory": "FO_WIFI"
}
```

Pembuatan berhasil menghasilkan HTTP 201; validasi gagal menghasilkan HTTP 400 dengan
`details` per field. Batch memakai objek berisi array `poles` dan opsi `createSegments`;
batch-delete memakai `{ "ids": ["ID_TIANG_UJI"] }`. Batch bukan jaminan transaksi
atomik; periksa respons sebelum mengulang pengiriman.

## Survei offline dan pembaruan data

Survei tertunda disimpan di IndexedDB `InfraMapOfflineDB`, object store `pole_outbox`,
melalui [`src/lib/offline/offlineQueue.ts`](src/lib/offline/offlineQueue.ts). Item
menyimpan payload, foto bila ada, status `PENDING`/`SYNCING`/`FAILED`, jumlah retry,
dan kesalahan terakhir. ID persisten membantu retry memakai identitas record yang sama.
Item dihapus setelah respons penyimpanan sukses; periksa indikator sinkronisasi sebelum
menutup pekerjaan atau menghapus data browser.

Antrean bergantung pada penyimpanan browser. Menghapus site data, pindah browser,
atau kehilangan perangkat dapat menghilangkan item yang belum terkirim. Antrean tidak
menjamin semua tile peta, Street View, AI, dan halaman tersedia tanpa internet.

Sumber worker adalah [`public/sw.js`](public/sw.js); `src/app/sw.js/route.ts` juga
menyajikannya dengan header tanpa cache. Worker melewati API dan non-GET; penulisan
offline ditangani outbox, bukan cache HTTP.

`useSupabaseRealtimePoles` memakai polling `/api/poles` setiap 20 detik dan event
`gis:hard-refresh`, bukan subscription Supabase Realtime. Hook mempertahankan snapshot
lama jika respons kosong datang setelah daftar berisi data. Penghapusan seluruh
inventaris karena itu tidak selalu langsung tercermin pada snapshot client.

## Integrasi Google dan AI

Upload foto mencoba Apps Script, lalu Drive langsung via service account, kemudian
fallback URL base64 dengan ID lokal. Respons fallback tidak berarti foto berhasil
diunggah ke Google Drive.

1. Siapkan spreadsheet/folder Drive dan sesuaikan konfigurasi
   [`google-apps-script/Code.gs`](google-apps-script/Code.gs).
2. Deploy sebagai Web App, lalu isi URL endpoint Apps Script pada env.
3. Untuk akses Google langsung, isi service account, private key, spreadsheet ID,
   folder ID, serta berikan akses spreadsheet/folder kepada service account.
4. Isi key Maps browser dan opsional key server Street View. Pembatasan key harus
   sesuai domain/lingkungan aplikasi.
5. Isi LocationIQ untuk endpoint alamat dan OpenRouter untuk AI.

Mirror CRUD dipanggil tanpa menunggu hasil supaya kegagalannya tidak membatalkan
penyimpanan utama. Full sync menunggu hasil per kategori dan menulis ulang sheet tujuan.
Mirror dapat tertinggal jika jaringan gagal atau proses berhenti; periksa hasil
sinkronisasi ketika melakukan pemulihan.

Geocoding juga memiliki jalur Nominatim; rute jalan memakai OSRM. Kegagalan provider
dapat mengurangi kelengkapan alamat atau visualisasi rute. AI memakai OpenRouter
melalui handler server dan mengikuti guard lingkungan Vercel.

## Script pemeliharaan

`scripts/` mencakup utilitas operasional lama dengan asumsi target tersendiri.
Nama `test_*` tidak berarti unit test terisolasi: beberapa script mengakses layanan
eksternal atau menulis data. Script tersebut tidak dijalankan oleh `npm run check`.

| Script/kelompok                                                                                  | Tujuan dan dampak                                                                |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `setup-sheets.mjs` / `npm run setup:sheets`                                                      | Menulis header/master provider dan petugas ke sheet tujuan.                      |
| `migrate_supabase_to_postgres.mjs` / `npm run migrate:vps-db`                                    | Membaca Supabase, menjalankan schema, upsert ke PostgreSQL.                      |
| `verify_postgres_data.mjs` / `npm run verify:vps-db`                                             | Memeriksa data PostgreSQL.                                                       |
| `verify_supabase_data.mjs`, `test_supabase_speed.mjs`, `test_repo.mjs`                           | Pemeriksaan data/koneksi/performa Supabase.                                      |
| `sync_supabase_to_sheets.mjs`, `sync_sheets_to_supabase.mjs`                                     | Sinkronisasi antarpenyimpanan; menulis tujuan.                                   |
| `migrate_to_supabase.mjs`                                                                        | Diagnostik koneksi dan jumlah tiang Supabase; nama historis, bukan migrasi data. |
| `migrate_all_exact_sheets_data.mjs`                                                              | Migrasi data dari jalur Sheets/Apps Script ke Supabase.                          |
| `auto_migrate_supabase_pg.mjs`                                                                   | Setup schema melalui koneksi PostgreSQL Supabase dan impor data Apps Script.     |
| `setup_subdistricts.mjs`, `migrate_subdistricts_pg.mjs`, `clean_seed_subdistricts.mjs`           | Setup/migrasi/seed wilayah; pembersihan dapat mengganti data.                    |
| `seed_supabase.mjs`, `setup_supabase_segments.mjs`                                               | Seed/setup data Supabase.                                                        |
| `enable_supabase_realtime.mjs`                                                                   | Pengaturan realtime lama; hook inventaris aktif memakai polling API.             |
| `test_crud.mjs`                                                                                  | Uji operasi data backend; bukan pemeriksaan aman untuk produksi.                 |
| `test_geocode.mjs`, `test_locationiq_geocode.mjs`, `test_centroids.mjs`, `test_subdistricts.mjs` | Diagnostik geocoding/wilayah.                                                    |
| `fetch-kelurahan-details.js`                                                                     | Pengumpulan informasi wilayah.                                                   |
| `setup_vps.sh`, `vps-deploy.sh`                                                                  | Provisioning lama dan aktivasi release VPS.                                      |

Pemanggilan `node` langsung tidak otomatis memuat `.env.local` seperti Next.js.
Sebagian script membaca env sendiri, sebagian mengandalkan `process.env`.
Pada Node.js 22, pemuatan eksplisit dapat dilakukan seperti ini:

```bash
node --env-file=.env.local scripts/verify_postgres_data.mjs
```

Siapkan cadangan dan verifikasi sumber/tujuan sebelum migrasi, seed, reset, full sync,
atau uji CRUD. Perapian kode tidak membutuhkan script yang menulis database.

## Deployment VPS

[`.github/workflows/deploy-vps.yml`](.github/workflows/deploy-vps.yml) berjalan saat
push ke `main` atau dipicu manual. Workflow memakai Node.js 22, memasang dependency,
memeriksa format dan TypeScript, mengemas source yang sudah di-commit, mengunggah via SSH, lalu
menjalankan `scripts/vps-deploy.sh` di VPS.

Secret GitHub: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, dan `VPS_PORT` (default 22).
Environment produksi tidak dibundel dalam `git archive`.

```text
/home/admin/gis-deploy/
  incoming/             Arsip source masuk
  releases/<commit>/    Source, dependency, build per release
  shared/.env.local     Environment produksi bersama
  current               Symlink ke release aktif
  logs/                 Direktori yang disiapkan deployment
```

Deploy menghubungkan env bersama, menjalankan `npm ci`, membangun Next.js,
menghapus devDependencies release, mengalihkan `current`, dan memulai PM2 `gis-app`
pada port 3000. Jika env bersama belum ada, script mencoba menyalinnya dari
`/home/admin/gis-app/.env.local`.

Health check memanggil `http://127.0.0.1:3000/`. Kegagalan startup/health check memicu
rollback ke release sebelumnya jika tersedia. Ini hanya memeriksa respons root,
bukan seluruh login, CRUD, dan integrasi. Script menyimpan hingga lima direktori
release terbaru berdasarkan waktu direktori.

Jalankan `npm run check` dan `npm run build` sebelum rilis. CI saat ini memeriksa
format dan tipe; build produksi dilakukan di VPS. Push ke `main` memicu deployment nyata.

## Panduan perubahan dan verifikasi

[`.prettierrc.json`](.prettierrc.json) menetapkan indentasi dua spasi, petik tunggal
JS/TS, semicolon, lebar target 100 karakter, dan LF. [`.editorconfig`](.editorconfig)
membantu editor mengikuti aturan tersebut; SQL memakai empat spasi. Apps Script `.gs`
memakai parser Babel. Prettier bawaan tidak memformat SQL dan Bash secara otomatis.

`.prettierignore` mengecualikan dependency, build, env privat, state lokal, dan arsip.
Embedded language formatting dimatikan agar string HTML/SQL/template tidak ikut
ditulis ulang sebagai bahasa terpisah.

Tempatkan UI di komponen, aturan bisnis di service, akses penyimpanan di repository,
dan kontrak data di types/schema. Komentar menjelaskan alasan atau fallback. Hindari
mengubah ID, kode wilayah, kolom SQL, storage key, event browser, dan urutan fallback
hanya demi kerapian.

```bash
npm run check
npm run build
```

Untuk perubahan format besar, `npx prettier . --debug-check` memeriksa konsistensi
parse/print formatter. Pemeriksaan struktur ini tidak menggantikan pengujian perilaku.

Belum ada suite unit/E2E terisolasi pada package scripts. Sebelum rilis perubahan
perilaku, lakukan pemeriksaan manual dengan database uji:

1. Login/logout dan navigasi sesuai peran, pada desktop dan mobile.
2. Dashboard, daftar, peta, provider, wilayah, pencarian, dan filter.
3. Buat tiang uji, buka detail, edit, ekspor CSV/KML/GeoJSON, lalu hapus.
4. GPS, perpindahan pin, koordinat perangkat, jarak, alamat, dan foto.
5. Simpan survei offline, sambungkan kembali, pastikan antrean terkirim tanpa duplikasi.
6. Segmen, indikator petugas aktif, dan refresh inventaris.
7. Street View, AI, serta mirror Sheets dengan kredensial/data uji sendiri.
8. Backend aktif dan log setelah startup bila deployment berubah.

## Pemecahan masalah

| Gejala                                  | Pemeriksaan                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| Memakai Supabase padahal seharusnya VPS | Periksa `DATABASE_URL` proses aktif, restart, baca `/api/system/data-source`. |
| PostgreSQL gagal tersambung             | Host, port, database, kredensial, SSL, dan schema.                            |
| Tabel kelurahan tidak ditemukan         | Migrasi `subdistricts_migration.sql` dan koneksi yang dipilih.                |
| `policy already exists`                 | SQL sudah pernah dijalankan; pilih statement yang diperlukan.                 |
| GPS tidak muncul                        | Izin lokasi dan secure context browser: HTTPS atau localhost.                 |
| Peta/Street View kosong                 | Jaringan, key, pembatasan domain, provider, dan kunci modul peta.             |
| Alamat tidak lengkap                    | LocationIQ/Nominatim dan koordinat; koreksi manual bila diperlukan.           |
| Foto memiliki ID `local_...`            | Upload cloud gagal/tidak tersedia; respons merupakan fallback base64.         |
| Sheets belum berubah                    | Konfigurasi Apps Script, log backup, hasil per kategori full sync.            |
| Antrean offline tertahan                | Jaringan, error item, foto, respons API; pertahankan IndexedDB.               |
| Daftar lama setelah semua data dihapus  | Hook menahan snapshot pada respons kosong; muat ulang untuk pemeriksaan.      |
| AI/tambah tiang ditolak di demo         | Flag Vercel dan guard `src/lib/ai/aiConfig.ts`.                               |
| Build sukses tetapi tipe bermasalah     | Jalankan `npm run typecheck`; build melewatinya.                              |
| Format gagal                            | `npm run format`, tinjau diff, ulangi `npm run check`.                        |

## Batasan implementasi

Login mencoba database utama, Apps Script, kemudian akun fallback `src/types/auth.ts`.
Status browser disimpan pada localStorage `infra_map_auth_user`. Ini belum merupakan
session server berbasis cookie yang memverifikasi otorisasi setiap endpoint.
Password database masih dibandingkan langsung dan schema awal memiliki policy
akses publik yang luas.

Beberapa integrasi/script masih memiliki URL, key, atau kredensial fallback dalam
source. Nilainya tidak disalin ke README. Env kosong tidak otomatis menonaktifkannya.
Perubahan autentikasi, policy, dan secret perlu diperlakukan sebagai perubahan
fungsional tersendiri dengan migrasi dan pengujian.

Kunci peta memakai record `_SYSTEM_LICENSE_` pada tabel `users` serta fallback file
`.system_license_state.json`. Ini pengaturan aplikasi, bukan pembacaan otomatis
kuota resmi provider peta.

Dokumentasi ini tidak menyatakan integrasi produksi selalu tersedia atau sudah diuji
langsung. Format, tipe, dan build memeriksa aspek berbeda; verifikasi operasional
lengkap memerlukan uji alur dengan database serta layanan uji.

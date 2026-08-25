import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// Read .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const firstEq = trimmed.indexOf('=');
      if (firstEq !== -1) {
        const key = trimmed.slice(0, firstEq).trim();
        let value = trimmed.slice(firstEq + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
  });
}

// 1. DATA_TIANG
const POLE_SHEET_NAME = 'DATA_TIANG';
const POLE_HEADERS = [
  'ID_Tiang',
  'Kode_Fisik_Tiang',
  'Latitude_GIS',
  'Longitude_GIS',
  'Latitude_GPS_Device',
  'Longitude_GPS_Device',
  'Akurasi_GPS_Meter',
  'Jarak_Deviasi_Meter',
  'Metode_Penentuan_Lokasi',
  'ID_Provider',
  'Nama_Provider_Operator',
  'Jenis_Tiang',
  'Kondisi_Tiang',
  'Nama_Jalan_Lokasi',
  'Kelurahan',
  'Kecamatan',
  'Kota_Kabupaten',
  'Patokan_Lokasi',
  'Sisi_Jalan',
  'Tinggi_Tiang',
  'Status_Kepemilikan',
  'Bahaya_Tiang_Miring',
  'Bahaya_Kabel_Semrawut',
  'Bahaya_Kabel_Rendah',
  'Bahaya_Karat_Retak',
  'Mengganggu_Jalan_Trotoar',
  'Potensi_Bahaya_Lain',
  'Catatan_Keterangan_Lapangan',
  'ID_File_Google_Drive',
  'Link_Foto_Google_Drive',
  'ID_Surveyor',
  'Nama_Petugas_Surveyor',
  'Tanggal_Survey',
  'Waktu_Survey',
  'Status_Validasi',
  'Catatan_Validasi',
  'Waktu_Dibuat',
  'Waktu_Diperbarui',
  'Kategori_Infrastruktur',
  'Tipe_Lampu_PJU',
  'Daya_Lampu_Watt',
  'Kondisi_Lampu_PJU',
  'Ada_Kwh_Meter',
];

// 2. DATA_PROVIDER (Master 20+ Operator Provider)
const PROVIDER_SHEET_NAME = 'DATA_PROVIDER';
const PROVIDER_HEADERS = [
  'ID_Provider',
  'Nama_Provider',
  'Kode_Singkatan',
  'Kode_Warna_Hex',
  'Status_Aktif',
  'Karakteristik_Visual_Warna',
];

const MASTER_PROVIDERS = [
  ['PRV_TELKOM', '1. TELKOM INDONESIA', 'TLKM', '#ef4444', 'ACTIVE', 'No. 1: Tiang hitam sabuk Merah & Abu-abu di tengah'],
  ['PRV_MNC_1', '2. MNC PLAY (Tipe A)', 'MNC', '#475569', 'ACTIVE', 'No. 2: Tiang hitam berundak dengan 2 garis strip putih di bawah'],
  ['PRV_FIRSTMEDIA', '3. FIRST MEDIA', 'FM', '#16a34a', 'ACTIVE', 'No. 3: Tiang galvanis abu-abu polos dengan pucuk Hijau cerah'],
  ['PRV_MNC_2', '4. MNC PLAY (Tipe B)', 'MNC', '#475569', 'ACTIVE', 'No. 4: Tiang hitam panjang dengan 2 garis strip putih di bawah'],
  ['PRV_BIZNET', '5. BIZNET NETWORKS', 'BIZ', '#f97316', 'ACTIVE', 'No. 5: Tiang hitam dengan gelang Kuning & Hitam di pucuk'],
  ['PRV_MORATEL_1', '6. MORATELINDO (Bawah Kuning)', 'MORA', '#eab308', 'ACTIVE', 'No. 6: Tiang hitam berundak dengan blok Kuning di bagian bawah'],
  ['PRV_IFORTE', '7. IFORTE', 'IFORTE', '#3b82f6', 'ACTIVE', 'No. 7: Tiang hitam gelang kombinasi Biru - Putih - Biru di pucuk'],
  ['PRV_LINTASARTA', '8. LINTASARTA (LA)', 'LA', '#0ea5e9', 'ACTIVE', 'No. 8: Tiang hitam blok Biru Muda di tengah & label teks LA di bawah'],
  ['PRV_MSA', '9. MSA (Megasurya Angkasa)', 'MSA', '#38bdf8', 'ACTIVE', 'No. 9: Tiang hitam strip Biru di pucuk & label teks MSA'],
  ['PRV_FIBERSTAR', '10. FIBERSTAR', 'FSTAR', '#06b6d4', 'ACTIVE', 'No. 10: Tiang hitam blok Biru Langit di tengah & label teks FS'],
  ['PRV_XL_1', '11. XL AXIATA (Biru Polos)', 'XL', '#2563eb', 'ACTIVE', 'No. 11: Tiang hitam dengan blok Biru XL di tengah'],
  ['PRV_INDOSAT', '12. INDOSAT OOREDOO', 'ISAT', '#eab308', 'ACTIVE', 'No. 12: Tiang hitam sabuk Kuning Indosat di tengah'],
  ['PRV_TBG', '13. TBG (Tower Bersama Group)', 'TBG', '#22c55e', 'ACTIVE', 'No. 13: Tiang hitam dengan sabuk Hijau Muda di bagian bawah'],
  ['PRV_MORATEL_2', '14. MORATELINDO (Sabuk Kuning)', 'MORA', '#eab308', 'ACTIVE', 'No. 14: Tiang hitam dengan sabuk Kuning Moratel di tengah'],
  ['PRV_SMARTFREN', '15. SMARTFREN TELECOM', 'SMART', '#ec4899', 'ACTIVE', 'No. 15: Tiang hitam pucuk Merah Muda / Magenta Smartfren'],
  ['PRV_CBN', '16. CBN FIBER', 'CBN', '#f97316', 'ACTIVE', 'No. 16: Tiang hitam blok Oranye Terang CBN di tengah'],
  ['PRV_BALITOWER', '17. BALI TOWERINDO', 'BALI', '#8b5cf6', 'ACTIVE', 'No. 17: Tiang hitam blok Ungu Bali Tower di tengah'],
  ['PRV_PLN_ICON', '18. PLN ICON PLUS (ICONNET)', 'ICON', '#0284c7', 'ACTIVE', 'No. 18: Tiang beton/besi PLN Iconnet gelang Biru PLN'],
  ['PRV_XL_2', '19. XL HOME FIBER (Sabuk Kuning)', 'XL', '#2563eb', 'ACTIVE', 'No. 19: Tiang hitam gelang Biru XL & Kuning di pucuk'],
  ['PRV_MYREPUBLIC', '20. MYREPUBLIC INDONESIA', 'MYREP', '#9333ea', 'ACTIVE', 'No. 20: Tiang hitam gelang Ungu Magenta di pucuk'],
  ['PRV_PJU_PEMKOT', 'PJU PEMERINTAH KOTA LUBUKLINGGAU', 'PJU', '#f59e0b', 'ACTIVE', 'Tiang Penerangan Jalan Umum (PJU) Mandiri milik Pemkot Lubuklinggau'],
  ['PRV_PLN_PJU_GABUNG', 'PLN + PJU (TIANG GABUNGAN)', 'PLN+PJU', '#0ea5e9', 'ACTIVE', 'Tiang distribusi listrik PLN yang ditumpangi instalasi lampu PJU jalan'],
  ['PRV_PLN_DISTRIBUSI', 'PT PLN (PERSERO) DISTRIBUSI', 'PLN', '#0284c7', 'ACTIVE', 'Tiang distribusi jaringan kabel listrik tegangan rendah/menengah PLN'],
];

// 3. JALUR_KABEL_FO
const SEGMENT_SHEET_NAME = 'JALUR_KABEL_FO';
const SEGMENT_HEADERS = [
  'ID_Segmen',
  'Kode_Segmen_Kabel',
  'ID_Tiang_Pangkal',
  'ID_Tiang_Ujung',
  'ID_Provider',
  'Nama_Provider',
  'Jenis_Jaringan',
  'Tipe_Pemasangan',
  'Estimasi_Jarak_Meter',
  'Status_Jalur',
  'Keterangan_Jalur',
  'Waktu_Dibuat',
  'Waktu_Diperbarui',
];

// 4. DATA_SURVEYOR
const USER_SHEET_NAME = 'DATA_SURVEYOR';
const USER_HEADERS = [
  'ID_Pengguna',
  'Nama_Lengkap',
  'Email',
  'Password',
  'Peran_Role',
  'Instansi_Dinas',
  'No_Handphone',
  'Status_Akun',
  'Waktu_Terdaftar',
];

const MASTER_USERS = [
  ['USR-KOMINFO-ADMIN', 'Admin DISKOMINFO', 'admin.kominfo@lubuklinggaukota.go.id', 'kominfo123', 'ADMIN_KOMINFO', 'Dinas Komunikasi, Informatika, Statistik dan Persandian Kota Lubuklinggau', '0812-7890-1234', 'AKTIF', '2026-08-25'],
  ['USR-BAPENDA-ADMIN', 'Admin BAPENDA', 'admin.bapenda@lubuklinggaukota.go.id', 'bapenda123', 'ADMIN_BAPENDA', 'Badan Pendapatan Daerah Kota Lubuklinggau', '0813-6789-5678', 'AKTIF', '2026-08-25'],
  ['USR-SURVEYOR-01', 'Surveyor 1 (Kominfo)', 'surveyor1@lubuklinggaukota.go.id', 'surveyor123', 'SURVEYOR', 'Dinas Kominfo Lubuklinggau', '0852-1122-3344', 'AKTIF', '2026-08-25'],
  ['USR-SURVEYOR-02', 'Surveyor 2 (Bapenda)', 'surveyor2@lubuklinggaukota.go.id', 'surveyor123', 'SURVEYOR', 'Badan Pendapatan Daerah Lubuklinggau', '0853-9988-7766', 'AKTIF', '2026-08-25'],
];

async function initializeGoogleSpreadsheet() {
  console.log('🚀 Memulai Inisialisasi Data Master (Provider & Surveyor) ke Google Sheets...\n');

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    console.error('❌ ERROR: Konfigurasi Google Cloud belum lengkap di .env.local!');
    process.exit(1);
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = meta.data.sheets?.map((s) => s.properties?.title) || [];
    console.log('📄 Lembar kerja saat ini di Google Sheets:', existingSheets);

    // 1. Pastikan Sheet DATA_PROVIDER dan Tulis 20 Provider
    console.log('📝 Mengisi data master ke sheet DATA_PROVIDER...');
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${PROVIDER_SHEET_NAME}!A1:F1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [PROVIDER_HEADERS],
      },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${PROVIDER_SHEET_NAME}!A2:F${MASTER_PROVIDERS.length + 1}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: MASTER_PROVIDERS,
      },
    });
    console.log(`✅ Sukses memasukkan ${MASTER_PROVIDERS.length} Provider ke DATA_PROVIDER!`);

    // 2. Pastikan Sheet DATA_SURVEYOR dan Tulis 4 Akun
    console.log('📝 Mengisi data akun ke sheet DATA_SURVEYOR...');
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${USER_SHEET_NAME}!A1:I1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [USER_HEADERS],
      },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${USER_SHEET_NAME}!A2:I${MASTER_USERS.length + 1}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: MASTER_USERS,
      },
    });
    console.log(`✅ Sukses memasukkan ${MASTER_USERS.length} Akun Dinas ke DATA_SURVEYOR!`);

    console.log('\n🎉 SELURUH DATA MASTER TELAH BERHASIL MASUK KE GOOGLE SPREADSHEET!');
  } catch (error) {
    console.error('❌ Gagal menginisialisasi spreadsheet:', error.message || error);
  }
}

initializeGoogleSpreadsheet();

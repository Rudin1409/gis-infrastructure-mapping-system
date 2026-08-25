import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// Read .env.local manually without extra dependencies
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

// 1. DATA_TIANG (Tabel Utama Tiang Utilitas GIS)
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
];

// 2. DATA_PROVIDER (Master Operator Telekomunikasi)
const PROVIDER_SHEET_NAME = 'DATA_PROVIDER';
const PROVIDER_HEADERS = [
  'ID_Provider',
  'Nama_Provider',
  'Kode_Singkatan',
  'Kode_Warna_Hex',
  'Status_Aktif',
];

// 3. JALUR_KABEL_FO (Master Topologi Bentangan Kabel FO)
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

// 4. DATA_SURVEYOR (Data Akun Surveyor & Petugas)
const USER_SHEET_NAME = 'DATA_SURVEYOR';
const USER_HEADERS = [
  'ID_Pengguna',
  'Nama_Lengkap',
  'Email',
  'Peran_Role',
  'Instansi_Dinas',
  'No_Handphone',
  'Status_Akun',
  'Waktu_Terdaftar',
];

async function initializeGoogleSpreadsheet() {
  console.log('🚀 Memulai Inisialisasi Google Spreadsheet GIS Lubuklinggau (Bahasa Indonesia)...\n');

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    console.error('❌ ERROR: Konfigurasi Google Cloud belum lengkap di .env.local!');
    console.error('Pastikan GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, dan GOOGLE_SHEET_ID sudah diisi.');
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

    const requiredSheets = [
      { title: POLE_SHEET_NAME, headers: POLE_HEADERS },
      { title: PROVIDER_SHEET_NAME, headers: PROVIDER_HEADERS },
      { title: SEGMENT_SHEET_NAME, headers: SEGMENT_HEADERS },
      { title: USER_SHEET_NAME, headers: USER_HEADERS },
    ];

    const addSheetRequests = [];
    for (const req of requiredSheets) {
      if (!existingSheets.includes(req.title)) {
        console.log(`➕ Menambahkan sheet baru: ${req.title}`);
        addSheetRequests.push({
          addSheet: {
            properties: {
              title: req.title,
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
        });
      }
    }

    if (addSheetRequests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: addSheetRequests,
        },
      });
    }

    for (const req of requiredSheets) {
      console.log(`📝 Menulis header untuk sheet: ${req.title}`);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${req.title}!A1:${String.fromCharCode(65 + Math.min(req.headers.length - 1, 25))}1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [req.headers],
        },
      });
    }

    console.log('\n✅ SEMUA LEMBAR KERJA BERHASIL DIINISIALISASI DENGAN BAHASA INDONESIA:');
    console.log('1. DATA_TIANG     -> Data seluruh tiang fisik, koordinat GIS, & kondisi bahaya');
    console.log('2. DATA_PROVIDER  -> Data master 20+ operator telekomunikasi');
    console.log('3. JALUR_KABEL_FO -> Data bentangan kabel FO udara / bawah tanah');
    console.log('4. DATA_SURVEYOR  -> Data akun surveyor & dinas');
  } catch (error) {
    console.error('❌ Gagal menginisialisasi spreadsheet:', error.message || error);
  }
}

initializeGoogleSpreadsheet();

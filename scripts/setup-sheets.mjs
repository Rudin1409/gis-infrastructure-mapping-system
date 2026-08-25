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

const POLE_HEADERS = [
  'id',
  'poleCode',
  'poleLatitude',
  'poleLongitude',
  'deviceLatitude',
  'deviceLongitude',
  'gpsAccuracy',
  'distanceFromDevice',
  'locationMethod',
  'providerId',
  'providerName',
  'poleType',
  'condition',
  'road',
  'kelurahan',
  'kecamatan',
  'kota',
  'patokanLokasi',
  'sisiJalan',
  'height',
  'ownershipStatus',
  'isTilted',
  'isMessyCable',
  'isLowCable',
  'isHazardous',
  'isCorroded',
  'isObstructing',
  'description',
  'photoFileId',
  'photoUrl',
  'surveyorId',
  'surveyorName',
  'surveyDate',
  'surveyTime',
  'validationStatus',
  'validationNote',
  'createdAt',
  'updatedAt',
];

const PROVIDER_HEADERS = [
  'id',
  'name',
  'code',
  'colorHex',
  'status',
];

const SEGMENT_HEADERS = [
  'id',
  'segmentCode',
  'fromNodeId',
  'toNodeId',
  'providerId',
  'providerName',
  'networkType',
  'installationType',
  'estimatedDistance',
  'status',
  'description',
  'createdAt',
  'updatedAt',
];

const USER_HEADERS = [
  'id',
  'name',
  'email',
  'role',
  'agency',
  'phone',
  'status',
  'createdAt',
];

async function initializeGoogleSpreadsheet() {
  console.log('🚀 Memulai Inisialisasi Google Spreadsheet GIS Lubuklinggau...\n');

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
    // 1. Ambil info spreadsheet saat ini
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = meta.data.sheets?.map((s) => s.properties?.title) || [];
    console.log('📄 Lembar kerja saat ini di Google Sheets:', existingSheets);

    const requiredSheets = [
      { title: 'POLES', headers: POLE_HEADERS },
      { title: 'PROVIDERS', headers: PROVIDER_HEADERS },
      { title: 'NETWORK_SEGMENTS', headers: SEGMENT_HEADERS },
      { title: 'USERS', headers: USER_HEADERS },
    ];

    // 2. Buat sheet yang belum ada
    const addSheetRequests = [];
    for (const req of requiredSheets) {
      if (!existingSheets.includes(req.title)) {
        console.log(`➕ Menambahkan sheet baru: ${req.title}`);
        addSheetRequests.push({
          addSheet: {
            properties: {
              title: req.title,
              gridProperties: {
                frozenRowCount: 1, // Freeze header row
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

    // 3. Tulis header baris 1 untuk setiap sheet
    for (const req of requiredSheets) {
      console.log(`📝 Menulis header untuk sheet: ${req.title}`);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${req.title}!A1:${String.fromCharCode(65 + req.headers.length - 1)}1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [req.headers],
        },
      });
    }

    console.log('\n✅ SEMUA LEMBAR KERJA BERHASIL DIINISIALISASI DENGAN RAPI:');
    console.log('1. POLES             -> Data seluruh tiang fisik, GPS, & kondisi bahaya');
    console.log('2. PROVIDERS         -> Data master 20+ operator telekomunikasi');
    console.log('3. NETWORK_SEGMENTS  -> Data bentangan kabel FO udara / bawah tanah');
    console.log('4. USERS             -> Data akun surveyor & dinas');
    console.log('\n🎉 Sistem siap digunakan untuk menyimpan data survei lapangan secara real-time!');
  } catch (error) {
    console.error('❌ Gagal menginisialisasi spreadsheet:', error.message || error);
  }
}

initializeGoogleSpreadsheet();

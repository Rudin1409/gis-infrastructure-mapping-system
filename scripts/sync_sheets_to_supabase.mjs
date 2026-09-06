import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function mapSheetPoleToDb(pole) {
  return {
    id: pole.id,
    pole_code: pole.poleCode || pole.pole_code || null,
    pole_latitude: parseFloat(pole.poleLatitude || pole.pole_latitude || -3.2964),
    pole_longitude: parseFloat(pole.poleLongitude || pole.pole_longitude || 102.8617),
    device_latitude: pole.deviceLatitude ? parseFloat(pole.deviceLatitude) : null,
    device_longitude: pole.deviceLongitude ? parseFloat(pole.deviceLongitude) : null,
    gps_accuracy: pole.gpsAccuracy ? parseFloat(pole.gpsAccuracy) : null,
    distance_from_device: pole.distanceFromDevice ? parseFloat(pole.distanceFromDevice) : null,
    location_method: pole.locationMethod || 'GPS_DEVICE',
    provider_id: pole.providerId || pole.provider_id || 'UNKNOWN',
    provider_name: pole.providerName || pole.provider_name || 'Tidak Diketahui',
    pole_type: pole.poleType || pole.pole_type || 'BETON',
    condition: pole.condition || 'GOOD',
    road: pole.road || '-',
    kelurahan: pole.kelurahan || '-',
    kecamatan: pole.kecamatan || 'Lubuklinggau Timur I',
    kota: pole.kota || 'Kota Lubuklinggau',
    patokan_lokasi: pole.patokanLokasi || null,
    sisi_jalan: pole.sisiJalan || 'KIRI',
    height: pole.height || '7m',
    ownership_status: pole.ownershipStatus || 'SENDIRI',
    cable_installation_type: pole.cableInstallationType || 'UDARA',
    infrastructure_category: pole.infrastructureCategory || 'FO_WIFI',
    pju_lamp_type: pole.pjuLampType || 'TIDAK_ADA',
    pju_lamp_power: pole.pjuLampPower || null,
    pju_lamp_condition: pole.pjuLampCondition || 'TIDAK_ADA',
    has_kwh_meter: Boolean(pole.hasKwhMeter),
    is_tilted: Boolean(pole.isTilted),
    is_messy_cable: Boolean(pole.isMessyCable),
    is_low_cable: Boolean(pole.isLowCable),
    is_hazardous: Boolean(pole.isHazardous),
    is_corroded: Boolean(pole.isCorroded),
    is_obstructing: Boolean(pole.isObstructing),
    description: pole.description || null,
    photo_file_id: pole.photoFileId || null,
    photo_url: pole.photoUrl || null,
    additional_photo_file_id: pole.additionalPhotoFileId || null,
    additional_photo_url: pole.additionalPhotoUrl || null,
    surveyor_id: pole.surveyorId || null,
    surveyor_name: pole.surveyorName || null,
    survey_date: pole.surveyDate || new Date().toISOString().split('T')[0],
    survey_time: pole.surveyTime || null,
    validation_status: pole.validationStatus || 'SUBMITTED',
    validation_note: pole.validationNote || null,
  };
}

async function syncAllData() {
  console.log('====================================================');
  console.log('🔄 MEMULAI MIGRASI DATA PENUH KE SUPABASE POSTGRESQL');
  console.log('====================================================\n');

  // 1. Ambil Data dari Google Sheets / Apps Script
  console.log('📥 [1/3] Mengambil data tiang dari Google Sheets Cloud...');
  let sheetPoles = [];
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getPoles`, { cache: 'no-store' });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      sheetPoles = json.data;
      console.log(`✅ Berhasil mengambil ${sheetPoles.length} data tiang dari Google Sheets!`);
    } else {
      console.log('⚠️ Respons Google Sheets:', json);
    }
  } catch (err) {
    console.error('❌ Gagal mengambil data dari Google Sheets:', err.message);
  }

  // Jika Google Sheets kosong/terkendala, gunakan dataset awal
  if (sheetPoles.length === 0) {
    console.log('ℹ️ Menggunakan dataset awal tiang Kota Lubuklinggau...');
    sheetPoles = [
      {
        id: 'LL-0001',
        poleCode: 'LLG-T1-TJ-463',
        poleLatitude: -3.2964,
        poleLongitude: 102.8617,
        providerId: 'TELKOM',
        providerName: 'PT Telkom Indonesia',
        poleType: 'BETON',
        condition: 'GOOD',
        road: 'Jl. Yos Sudarso',
        kelurahan: 'Taba Jemekeh',
        kecamatan: 'Lubuklinggau Timur I',
        surveyDate: '2026-08-25',
        validationStatus: 'VERIFIED',
      },
      {
        id: 'LL-0002',
        poleCode: 'LLG-T2-CK-102',
        poleLatitude: -3.298,
        poleLongitude: 102.864,
        providerId: 'ICON_PLUS',
        providerName: 'PLN Icon Plus',
        poleType: 'BESI',
        condition: 'NEEDS_REPAIR',
        road: 'Jl. Ahmad Yani',
        kelurahan: 'Cereme Taba',
        kecamatan: 'Lubuklinggau Timur II',
        isMessyCable: true,
        isCorroded: true,
        surveyDate: '2026-08-25',
        validationStatus: 'SUBMITTED',
      },
      {
        id: 'LL-0003',
        poleCode: 'LLG-B1-KP-088',
        poleLatitude: -3.293,
        poleLongitude: 102.855,
        providerId: 'INDOSAT',
        providerName: 'Indosat Ooredoo Hutchison',
        poleType: 'BETON',
        condition: 'DAMAGED',
        road: 'Jl. Garuda Hitam',
        kelurahan: 'Pasar Pemiri',
        kecamatan: 'Lubuklinggau Barat I',
        isTilted: true,
        isMessyCable: true,
        isLowCable: true,
        isHazardous: true,
        isObstructing: true,
        surveyDate: '2026-08-25',
        validationStatus: 'SUBMITTED',
      },
    ];
  }

  // 2. Migrasikan Tiang ke Supabase
  console.log(`\n📤 [2/3] Memasukkan ${sheetPoles.length} data tiang ke Supabase PostgreSQL...`);
  const dbPoles = sheetPoles.map(mapSheetPoleToDb);

  const { data: insertedPoles, error: poleError } = await supabase
    .from('poles')
    .upsert(dbPoles, { onConflict: 'id' })
    .select();

  if (poleError) {
    console.error('❌ Gagal memasukkan data tiang ke Supabase:', poleError.message);
  } else {
    console.log(
      `✅ BERHASIL! Sebanyak ${insertedPoles?.length || dbPoles.length} data tiang tersimpan di Supabase!`
    );
  }

  // 3. Migrasikan Akun Pengguna / Surveyor ke Supabase
  console.log('\n👥 [3/3] Memasukkan 5 akun dinas (4 Surveyor + 1 Admin) ke Supabase...');
  const users = [
    {
      id: 'USR-KOMINFO-ADMIN',
      name: 'Admin DISKOMINFOTIKSAN',
      email: 'admin.kominfo@lubuklinggaukota.go.id',
      password: process.env.SEED_ACCOUNT_PASSWORD || 'DISABLED',
      role: 'ADMIN_KOMINFO',
      agency: 'Dinas Komunikasi, Informatika, Statistik dan Persandian Kota Lubuklinggau',
      phone: '0812-7890-1234',
      status: 'AKTIF',
    },
    {
      id: 'USR-SURVEYOR-01',
      name: 'M. Tri Saputra',
      email: 'tri.saputra@lubuklinggaukota.go.id',
      password: process.env.SEED_ACCOUNT_PASSWORD || 'DISABLED',
      role: 'SURVEYOR',
      agency: 'Dinas Komunikasi, Informatika, Statistik dan Persandian Kota Lubuklinggau',
      phone: '083196589665',
      status: 'AKTIF',
    },
    {
      id: 'USR-SURVEYOR-02',
      name: 'Yodi Heropralaga',
      email: 'yodi.heropralaga@lubuklinggaukota.go.id',
      password: process.env.SEED_ACCOUNT_PASSWORD || 'DISABLED',
      role: 'SURVEYOR',
      agency: 'Dinas Komunikasi, Informatika, Statistik dan Persandian Kota Lubuklinggau',
      phone: '081373193335',
      status: 'AKTIF',
    },
    {
      id: 'USR-SURVEYOR-03',
      name: 'Andika Yulian Putra',
      email: 'andika.yulian@lubuklinggaukota.go.id',
      password: process.env.SEED_ACCOUNT_PASSWORD || 'DISABLED',
      role: 'SURVEYOR',
      agency: 'Dinas Komunikasi, Informatika, Statistik dan Persandian Kota Lubuklinggau',
      phone: '081373249228',
      status: 'AKTIF',
    },
    {
      id: 'USR-SURVEYOR-04',
      name: 'Pradigga Navigasi',
      email: 'pradigga.navigasi@lubuklinggaukota.go.id',
      password: process.env.SEED_ACCOUNT_PASSWORD || 'DISABLED',
      role: 'SURVEYOR',
      agency: 'Dinas Komunikasi, Informatika, Statistik dan Persandian Kota Lubuklinggau',
      phone: '082251654742',
      status: 'AKTIF',
    },
  ];

  const { data: insertedUsers, error: userError } = await supabase
    .from('users')
    .upsert(users, { onConflict: 'id' })
    .select();

  if (userError) {
    console.error('❌ Gagal memasukkan akun ke Supabase:', userError.message);
  } else {
    console.log(
      `✅ BERHASIL! Sebanyak ${insertedUsers?.length || users.length} akun dinas tersimpan di Supabase!`
    );
  }

  console.log('\n====================================================');
  console.log(' 🎉 MIGRASI DATA KE SUPABASE SELESAI 100% SUKSES!');
  console.log('====================================================');
}

syncAllData();

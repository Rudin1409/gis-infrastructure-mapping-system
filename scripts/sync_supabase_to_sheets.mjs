/**
 * ============================================================
 * FULL SYNC: SUPABASE → GOOGLE SHEETS (BACKUP CADANGAN)
 * ============================================================
 *
 * Script ini mengambil SEMUA data dari Supabase (poles, providers, segments)
 * dan menulisnya ke Google Sheets sebagai backup cadangan.
 *
 * Google Sheets akan di-clear dulu (kecuali header), lalu diisi ulang
 * dengan data terbaru dari Supabase.
 *
 * Cara pakai:
 *   node scripts/sync_supabase_to_sheets.mjs
 *
 * ============================================================
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qdiswcejzxwrrbirzstv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JXBAQ-tsjCWcD7iOjWvuBA_JJ_EFf7y';
const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbyUyNmERJNTJ26-M76Lg1PO7ul0HBakMTV9p3YrxJdN64s3mFTOMEyvVz2br29A4HUH/exec';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Map Supabase DB row (snake_case) to Pole object (camelCase) for Apps Script
 */
function mapDbPoleToAppScript(row) {
  return {
    id: row.id,
    poleCode: row.pole_code || '',
    poleLatitude: parseFloat(row.pole_latitude) || 0,
    poleLongitude: parseFloat(row.pole_longitude) || 0,
    deviceLatitude: row.device_latitude ? parseFloat(row.device_latitude) : undefined,
    deviceLongitude: row.device_longitude ? parseFloat(row.device_longitude) : undefined,
    gpsAccuracy: row.gps_accuracy ? parseFloat(row.gps_accuracy) : undefined,
    distanceFromDevice: row.distance_from_device ? parseFloat(row.distance_from_device) : undefined,
    locationMethod: row.location_method || 'GPS_DEVICE',
    providerId: row.provider_id || 'UNKNOWN',
    providerName: row.provider_name || '',
    poleType: row.pole_type || 'BETON',
    condition: row.condition || 'GOOD',
    road: row.road || '',
    kelurahan: row.kelurahan || '',
    kecamatan: row.kecamatan || '',
    kota: row.kota || 'Kota Lubuklinggau',
    patokanLokasi: row.patokan_lokasi || '',
    sisiJalan: row.sisi_jalan || 'KIRI',
    height: row.height || '7m',
    ownershipStatus: row.ownership_status || 'SENDIRI',
    isTilted: Boolean(row.is_tilted),
    isMessyCable: Boolean(row.is_messy_cable),
    isLowCable: Boolean(row.is_low_cable),
    isCorroded: Boolean(row.is_corroded),
    isObstructing: Boolean(row.is_obstructing),
    isHazardous: Boolean(row.is_hazardous),
    description: row.description || '',
    photoFileId: row.photo_file_id || '',
    photoUrl: row.photo_url || '',
    surveyorId: row.surveyor_id || 'USR-KOMINFO-ADMIN',
    surveyorName: row.surveyor_name || 'Admin DISKOMINFO (Admin Teknis & Jaringan)',
    surveyDate: row.survey_date || '',
    surveyTime: row.survey_time || '',
    validationStatus: row.validation_status || 'SUBMITTED',
    validationNote: row.validation_note || '',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    infrastructureCategory: row.infrastructure_category || 'FO_WIFI',
    pjuLampType: row.pju_lamp_type || '',
    pjuLampPower: row.pju_lamp_power || '',
    pjuLampCondition: row.pju_lamp_condition || '',
    hasKwhMeter: Boolean(row.has_kwh_meter),
    cableInstallationType: row.cable_installation_type || 'UDARA',
  };
}

/**
 * Map Supabase provider row to Apps Script format
 */
function mapDbProviderToAppScript(row) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    colorHex: row.color_hex || '#3b82f6',
    status: row.status || 'ACTIVE',
  };
}

/**
 * Map Supabase segment row to Apps Script format
 */
function mapDbSegmentToAppScript(row) {
  return {
    id: row.id,
    segmentCode: row.segment_code || '',
    fromNodeId: row.from_node_id || '',
    toNodeId: row.to_node_id || '',
    providerId: row.provider_id || '',
    providerName: row.provider_name || '',
    networkType: row.network_type || 'FIBER_OPTIC',
    installationType: row.installation_type || 'AERIAL',
    estimatedDistance: row.estimated_distance || 0,
    status: row.status || 'ACTIVE',
    description: row.description || '',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

async function syncPolesFromSupabaseToSheets() {
  console.log('\n📥 [1/3] Mengambil data TIANG dari Supabase...');
  const { data: poles, error } = await supabase
    .from('poles')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Gagal ambil poles dari Supabase:', error.message);
    return false;
  }

  console.log(`   ✅ Ditemukan ${poles.length} data tiang di Supabase`);

  if (poles.length === 0) {
    console.log('   ℹ️ Tidak ada data tiang untuk di-sync');
    return true;
  }

  // Map to camelCase for Apps Script
  const mappedPoles = poles.map(mapDbPoleToAppScript);

  console.log(`   📤 Mengirim ${mappedPoles.length} tiang ke Google Sheets (clearAndWrite)...`);

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'clearAndWritePoles',
        data: mappedPoles,
      }),
    });

    const json = await res.json();
    if (json.success) {
      console.log(`   ✅ BERHASIL! ${mappedPoles.length} data tiang di-sync ke Google Sheets`);
      return true;
    } else {
      console.error('   ❌ Gagal sync poles:', json.error);
      return false;
    }
  } catch (err) {
    console.error('   ❌ Error sync poles:', err.message);
    return false;
  }
}

async function syncProvidersFromSupabaseToSheets() {
  console.log('\n📥 [2/3] Mengambil data PROVIDER dari Supabase...');
  const { data: providers, error } = await supabase
    .from('providers')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('❌ Gagal ambil providers dari Supabase:', error.message);
    return false;
  }

  console.log(`   ✅ Ditemukan ${providers.length} data provider di Supabase`);

  if (providers.length === 0) {
    console.log('   ℹ️ Tidak ada data provider untuk di-sync');
    return true;
  }

  const mappedProviders = providers.map(mapDbProviderToAppScript);

  console.log(
    `   📤 Mengirim ${mappedProviders.length} provider ke Google Sheets (clearAndWrite)...`
  );

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'clearAndWriteProviders',
        data: mappedProviders,
      }),
    });

    const json = await res.json();
    if (json.success) {
      console.log(
        `   ✅ BERHASIL! ${mappedProviders.length} data provider di-sync ke Google Sheets`
      );
      return true;
    } else {
      console.error('   ❌ Gagal sync providers:', json.error);
      return false;
    }
  } catch (err) {
    console.error('   ❌ Error sync providers:', err.message);
    return false;
  }
}

async function syncSegmentsFromSupabaseToSheets() {
  console.log('\n📥 [3/3] Mengambil data SEGMEN KABEL dari Supabase...');
  const { data: segments, error } = await supabase
    .from('segments')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Gagal ambil segments dari Supabase:', error.message);
    return false;
  }

  console.log(`   ✅ Ditemukan ${segments.length} data segmen di Supabase`);

  if (segments.length === 0) {
    console.log('   ℹ️ Tidak ada data segmen untuk di-sync');
    return true;
  }

  const mappedSegments = segments.map(mapDbSegmentToAppScript);

  console.log(`   📤 Mengirim ${mappedSegments.length} segmen ke Google Sheets (clearAndWrite)...`);

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'clearAndWriteSegments',
        data: mappedSegments,
      }),
    });

    const json = await res.json();
    if (json.success) {
      console.log(`   ✅ BERHASIL! ${mappedSegments.length} data segmen di-sync ke Google Sheets`);
      return true;
    } else {
      console.error('   ❌ Gagal sync segments:', json.error);
      return false;
    }
  } catch (err) {
    console.error('   ❌ Error sync segments:', err.message);
    return false;
  }
}

async function main() {
  console.log('════════════════════════════════════════════════════════');
  console.log('🔄 FULL SYNC: SUPABASE → GOOGLE SHEETS (BACKUP)');
  console.log('════════════════════════════════════════════════════════');
  console.log(`📅 Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`);
  console.log(`📊 Supabase: ${SUPABASE_URL}`);
  console.log(`📑 Apps Script: ${APPS_SCRIPT_URL.substring(0, 60)}...`);

  const results = {
    poles: await syncPolesFromSupabaseToSheets(),
    providers: await syncProvidersFromSupabaseToSheets(),
    segments: await syncSegmentsFromSupabaseToSheets(),
  };

  console.log('\n════════════════════════════════════════════════════════');
  console.log('📊 HASIL SINKRONISASI:');
  console.log(`   Tiang:    ${results.poles ? '✅ SUKSES' : '❌ GAGAL'}`);
  console.log(`   Provider: ${results.providers ? '✅ SUKSES' : '❌ GAGAL'}`);
  console.log(`   Segmen:   ${results.segments ? '✅ SUKSES' : '❌ GAGAL'}`);

  const allSuccess = results.poles && results.providers && results.segments;
  if (allSuccess) {
    console.log('\n🎉 SEMUA DATA BERHASIL DI-SYNC KE GOOGLE SHEETS!');
    console.log('   Google Sheets sekarang menjadi backup cadangan dari Supabase.');
  } else {
    console.log('\n⚠️ Beberapa data gagal di-sync. Periksa error di atas.');
  }
  console.log('════════════════════════════════════════════════════════');
}

main();

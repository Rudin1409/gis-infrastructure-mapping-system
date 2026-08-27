import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qdiswcejzxwrrbirzstv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JXBAQ-tsjCWcD7iOjWvuBA_JJ_EFf7y';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const INITIAL_POLES = [
  {
    id: "LL-0001",
    pole_code: "LLG-T1-TJ-463",
    pole_latitude: -3.2964,
    pole_longitude: 102.8617,
    device_latitude: -3.2964,
    device_longitude: 102.8617,
    gps_accuracy: 3.5,
    distance_from_device: 0,
    location_method: "GPS_DEVICE",
    provider_id: "TELKOM",
    provider_name: "PT Telkom Indonesia",
    pole_type: "BETON",
    condition: "GOOD",
    road: "Jl. Yos Sudarso",
    kelurahan: "Taba Jemekeh",
    kecamatan: "Lubuklinggau Timur I",
    kota: "Kota Lubuklinggau",
    patokan_lokasi: "Samping JM Plaza",
    sisi_jalan: "KIRI",
    height: "9m",
    ownership_status: "SENDIRI",
    cable_installation_type: "UDARA",
    infrastructure_category: "FO_WIFI",
    pju_lamp_type: "TIDAK_ADA",
    pju_lamp_condition: "TIDAK_ADA",
    is_tilted: false,
    is_messy_cable: false,
    is_low_cable: false,
    is_hazardous: false,
    is_corroded: false,
    is_obstructing: false,
    survey_date: "2026-08-25",
    validation_status: "VERIFIED"
  },
  {
    id: "LL-0002",
    pole_code: "LLG-T2-CK-102",
    pole_latitude: -3.2980,
    pole_longitude: 102.8640,
    device_latitude: -3.2980,
    device_longitude: 102.8640,
    gps_accuracy: 4.2,
    distance_from_device: 0,
    location_method: "GPS_DEVICE",
    provider_id: "ICON_PLUS",
    provider_name: "PLN Icon Plus",
    pole_type: "BESI",
    condition: "NEEDS_REPAIR",
    road: "Jl. Ahmad Yani",
    kelurahan: "Cereme Taba",
    kecamatan: "Lubuklinggau Timur II",
    kota: "Kota Lubuklinggau",
    patokan_lokasi: "Depan Ruko Simpang Periuk",
    sisi_jalan: "KANAN",
    height: "7m",
    ownership_status: "BERSAMA_PLN",
    cable_installation_type: "UDARA",
    infrastructure_category: "GABUNG_PLN_PJU",
    pju_lamp_type: "LED",
    pju_lamp_power: "60W",
    pju_lamp_condition: "MENYALA_NORMAL",
    has_kwh_meter: true,
    is_tilted: false,
    is_messy_cable: true,
    is_low_cable: false,
    is_hazardous: false,
    is_corroded: true,
    is_obstructing: false,
    survey_date: "2026-08-25",
    validation_status: "SUBMITTED"
  },
  {
    id: "LL-0003",
    pole_code: "LLG-B1-KP-088",
    pole_latitude: -3.2930,
    pole_longitude: 102.8550,
    device_latitude: -3.2930,
    device_longitude: 102.8550,
    gps_accuracy: 2.8,
    distance_from_device: 0,
    location_method: "GPS_DEVICE",
    provider_id: "INDOSAT",
    provider_name: "Indosat Ooredoo Hutchison",
    pole_type: "BETON",
    condition: "DAMAGED",
    road: "Jl. Garuda Hitam",
    kelurahan: "Pasar Pemiri",
    kecamatan: "Lubuklinggau Barat I",
    kota: "Kota Lubuklinggau",
    patokan_lokasi: "Tikungan Jembatan Kelingi",
    sisi_jalan: "KIRI",
    height: "9m",
    ownership_status: "SENDIRI",
    cable_installation_type: "UDARA",
    infrastructure_category: "FO_WIFI",
    pju_lamp_type: "TIDAK_ADA",
    pju_lamp_condition: "TIDAK_ADA",
    is_tilted: true,
    is_messy_cable: true,
    is_low_cable: true,
    is_hazardous: true,
    is_corroded: false,
    is_obstructing: true,
    survey_date: "2026-08-25",
    validation_status: "SUBMITTED"
  }
];

async function seed() {
  console.log('🌱 Menyuntikkan data master ke tabel poles Supabase...');
  const { data, error } = await supabase.from('poles').upsert(INITIAL_POLES);
  if (error) {
    console.error('❌ Gagal seed:', error.message);
  } else {
    console.log('✅ SUKSES SEED TIANG KE SUPABASE!');
  }
}

seed();

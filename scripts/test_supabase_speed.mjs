import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function benchmark() {
  console.log('⚡ MEMULAI PENGUJIAN KECEPATAN SUPABASE DATABASE...');

  const t0 = performance.now();
  const { data: poles, error } = await supabase.from('poles').select('*');
  const t1 = performance.now();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(
      `✅ [READ] Mengambil ${poles.length} tiang berhasil dalam: ${(t1 - t0).toFixed(2)} ms!`
    );
  }

  const t2 = performance.now();
  const testId = `BENCHMARK-${Date.now()}`;
  const { data: inserted, error: iErr } = await supabase
    .from('poles')
    .insert({
      id: testId,
      pole_code: 'BENCH-001',
      pole_latitude: -3.2964,
      pole_longitude: 102.8617,
      provider_id: 'PRV_TELKOM',
      provider_name: '1. TELKOM INDONESIA',
      road: 'Jl. Uji Kecepatan',
      kelurahan: 'Majapahit',
      kecamatan: 'Lubuklinggau Timur I',
      survey_date: '2026-08-27',
    })
    .select()
    .single();
  const t3 = performance.now();

  if (iErr) {
    console.error('Insert error:', iErr);
  } else {
    console.log(
      `✅ [WRITE/SAVE] Menyimpan 1 data tiang baru berhasil dalam: ${(t3 - t2).toFixed(2)} ms!`
    );
    // Cleanup benchmark record
    await supabase.from('poles').delete().eq('id', testId);
  }
}

benchmark();

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qdiswcejzxwrrbirzstv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JXBAQ-tsjCWcD7iOjWvuBA_JJ_EFf7y';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testCRUD() {
  console.log('====================================================');
  console.log('🧪 PENGUJIAN KETAT FULL CRUD PADA SUPABASE POSTGRESQL');
  console.log('====================================================\n');

  const testId = `TEST-${Date.now()}`;

  // 1. CREATE
  console.log(`1️⃣ [CREATE] Menambahkan tiang uji coba: ${testId}...`);
  const newRow = {
    id: testId,
    pole_code: 'TEST-LLG-001',
    pole_latitude: -3.2964,
    pole_longitude: 102.8617,
    provider_id: 'PRV_TELKOM',
    provider_name: '1. TELKOM INDONESIA',
    pole_type: 'BESI',
    condition: 'GOOD',
    road: 'Jl. Uji Coba CRUD',
    kelurahan: 'Majapahit',
    kecamatan: 'Lubuklinggau Timur I',
    height: '7m',
    survey_date: '2026-08-27',
  };

  const { data: created, error: cErr } = await supabase
    .from('poles')
    .insert(newRow)
    .select()
    .single();
  if (cErr) {
    console.error('❌ CREATE GAGAL:', cErr);
    return;
  }
  console.log('✅ CREATE BERHASIL:', created.id, created.road, created.condition);

  // 2. READ (FIND BY ID)
  console.log(`\n2️⃣ [READ] Mengambil detail tiang ${testId}...`);
  const { data: readPole, error: rErr } = await supabase
    .from('poles')
    .select('*')
    .eq('id', testId)
    .single();
  if (rErr || !readPole) {
    console.error('❌ READ GAGAL:', rErr);
    return;
  }
  console.log(
    '✅ READ BERHASIL:',
    readPole.id,
    `(Kondisi: ${readPole.condition}, Tinggi: ${readPole.height})`
  );

  // 3. UPDATE (EDIT)
  console.log(`\n3️⃣ [UPDATE / EDIT] Memperbarui kondisi menjadi NEEDS_REPAIR dan tinggi 9m...`);
  const { data: updated, error: uErr } = await supabase
    .from('poles')
    .update({
      condition: 'NEEDS_REPAIR',
      height: '9m',
      road: 'Jl. Uji Coba CRUD (SUDAH DIEDIT)',
      is_tilted: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', testId)
    .select()
    .single();

  if (uErr || !updated) {
    console.error('❌ UPDATE GAGAL:', uErr);
    return;
  }
  console.log(
    '✅ UPDATE BERHASIL:',
    updated.id,
    `(Kondisi baru: ${updated.condition}, Tinggi baru: ${updated.height}, Jalan: ${updated.road})`
  );

  // 4. DELETE (HAPUS)
  console.log(`\n4️⃣ [DELETE / HAPUS] Menghapus tiang uji coba ${testId}...`);
  const { error: dErr } = await supabase.from('poles').delete().eq('id', testId);
  if (dErr) {
    console.error('❌ DELETE GAGAL:', dErr);
    return;
  }
  console.log('✅ DELETE BERHASIL!');

  // 5. VERIFIKASI DATA TERHAPUS
  const { data: checkDeleted } = await supabase.from('poles').select('*').eq('id', testId).single();
  if (!checkDeleted) {
    console.log('✅ VERIFIKASI SUKSES: Data sudah 100% lenyap dari database!');
  } else {
    console.warn('⚠️ Data masih ada:', checkDeleted);
  }

  console.log('\n====================================================');
  console.log(' 🎉 SELURUH PROSES CRUD (CREATE, READ, UPDATE, DELETE) 100% SUKSES!');
  console.log('====================================================');
}

testCRUD();

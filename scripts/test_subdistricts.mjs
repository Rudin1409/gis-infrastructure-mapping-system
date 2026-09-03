import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qdiswcejzxwrrbirzstv.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_JXBAQ-tsjCWcD7iOjWvuBA_JJ_EFf7y';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  console.log('🧪 Memulai Pengujian Fitur Kelurahan & Kecamatan...');

  // 1. Read all
  const { data: all, error: readErr } = await supabase.from('subdistricts').select('*');
  if (readErr) throw readErr;
  console.log(`✅ 1. Berhasil membaca ${all.length} kelurahan dari database.`);

  // 2. Add temporary test kelurahan
  const testId = `KEL-TEST-${Date.now()}`;
  const { error: insErr } = await supabase.from('subdistricts').insert({
    id: testId,
    name: 'Kelurahan Uji Coba',
    kecamatan: 'Lubuklinggau Timur I',
    code: 'UC',
    order_index: 99
  });
  if (insErr) throw insErr;
  console.log('✅ 2. Berhasil menambahkan kelurahan uji coba.');

  // 3. Edit test kelurahan
  const { error: updErr } = await supabase.from('subdistricts').update({
    name: 'Kelurahan Uji Coba (Edited)',
    code: 'UCE'
  }).eq('id', testId);
  if (updErr) throw updErr;
  console.log('✅ 3. Berhasil mengedit nama kelurahan uji coba.');

  // 4. Delete test kelurahan
  const { error: delErr } = await supabase.from('subdistricts').delete().eq('id', testId);
  if (delErr) throw delErr;
  console.log('✅ 4. Berhasil menghapus kelurahan uji coba.');

  console.log('\n🎉 SEMUA PENGUJIAN DATABASE CRUD KELURAHAN BERHASIL 100%!');
}

test().catch(err => {
  console.error('❌ Error test:', err);
  process.exit(1);
});

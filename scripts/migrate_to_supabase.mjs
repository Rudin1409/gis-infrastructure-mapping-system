import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testConnection() {
  console.log('🚀 Menguji koneksi ke Supabase Project: qdiswcejzxwrrbirzstv...');
  try {
    const { data, error } = await supabase
      .from('poles')
      .select('count', { count: 'exact', head: true });
    if (error) {
      console.log(
        '⚠️ Tabel poles belum dibuat atau memerlukan eksekusi SQL di Supabase SQL Editor:',
        error.message
      );
      return false;
    }
    console.log('✅ KONEKSI SUPABASE BERHASIL! Total data saat ini:', data);
    return true;
  } catch (err) {
    console.error('Error:', err);
    return false;
  }
}

testConnection();

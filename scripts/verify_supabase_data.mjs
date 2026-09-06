import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verify() {
  console.log('🔍 Memverifikasi data tabel di Supabase...');

  const { data: poles, error: pErr } = await supabase
    .from('poles')
    .select('id, pole_code, road, kelurahan, kecamatan, provider_name, condition');
  if (pErr) console.error('Poles error:', pErr);
  else console.log(`📍 TOTAL TIANG DI SUPABASE: ${poles.length} tiang`, poles);

  const { data: users, error: uErr } = await supabase
    .from('users')
    .select('id, name, email, role, phone, status');
  if (uErr) console.error('Users error:', uErr);
  else console.log(`👥 TOTAL AKUN DI SUPABASE: ${users.length} akun`, users);
}

verify();

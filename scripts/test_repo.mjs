import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  const { data, error } = await supabase.from('poles').select('*');
  if (error) console.error(error);
  else {
    console.log(`TOTAL TIANG DI SUPABASE SEKARANG: ${data.length} tiang`);
    data.forEach((p) => console.log(`- ${p.id} : ${p.pole_code} (${p.road}, ${p.kelurahan})`));
  }
}

test();

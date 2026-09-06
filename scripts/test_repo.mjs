import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qdiswcejzxwrrbirzstv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JXBAQ-tsjCWcD7iOjWvuBA_JJ_EFf7y';

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

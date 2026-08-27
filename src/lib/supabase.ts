import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qdiswcejzxwrrbirzstv.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_JXBAQ-tsjCWcD7iOjWvuBA_JJ_EFf7y';

export const supabase = createClient(supabaseUrl, supabaseKey);

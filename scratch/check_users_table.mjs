import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Querying public.users...");
  const { data: usersData, error: usersError } = await supabase.from('users').select('*').limit(5);
  console.log("users table data:", usersData, "Error:", usersError?.message);

  console.log("Querying public.profiles...");
  const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('*').limit(5);
  console.log("profiles table data:", profilesData, "Error:", profilesError?.message);
}

check();

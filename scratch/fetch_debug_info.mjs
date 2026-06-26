import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchDebug() {
  console.log("Fetching DB debug info...");
  const { data, error } = await supabase.rpc('get_auth_debug_info');
  if (error) {
    console.error("RPC Error:", error.message);
  } else {
    const emailToFind = 'bo4a@openlms.edu';
    console.log("--- SPECIFIC USER DEBUG ---");
    console.log("User in auth.users:", data.users.find(u => u.email === emailToFind));
    console.log("Identity in auth.identities:", data.identities.find(i => i.identity_data && i.identity_data.email === emailToFind));
    console.log("Profile in public.profiles:", data.profiles.find(p => p.email === emailToFind));
  }
}

fetchDebug();

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function compare() {
  console.log("Comparing user records in auth.users...");
  const { data, error } = await supabase.rpc('compare_users');
  if (error) {
    console.error("RPC Error:", error.message);
  } else {
    console.log("Chau Phan User Record:", JSON.stringify(data.chau, null, 2));
    console.log("Bo User Record:", JSON.stringify(data.bo, null, 2));
  }
}

compare();

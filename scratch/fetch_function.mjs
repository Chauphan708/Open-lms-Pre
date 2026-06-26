import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function viewFunc() {
  console.log("Fetching definition of handle_new_user...");
  const { data, error } = await supabase.rpc('get_function_definition', { func_name: 'handle_new_user' });
  if (error) {
    console.error("RPC Error:", error.message);
  } else {
    console.log("handle_new_user definition:\n", data);
  }
}

viewFunc();

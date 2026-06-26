import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function list() {
  console.log("Listing all triggers in database...");
  const { data, error } = await supabase.rpc('list_all_triggers');
  if (error) {
    console.error("RPC Error:", error.message);
  } else {
    console.log("Triggers:", JSON.stringify(data, null, 2));
  }
}

list();

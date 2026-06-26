import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFields() {
  console.log("Checking user auth fields for bo4a@openlms.edu...");
  const { data, error } = await supabase.rpc('check_user_auth_fields', { p_email: 'bo4a@openlms.edu' });
  if (error) {
    console.error("RPC Error:", error.message);
  } else {
    console.log("User Auth Fields:", JSON.stringify(data, null, 2));
  }
}

checkFields();

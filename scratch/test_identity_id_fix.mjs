import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log("Fixing identity id to a unique random UUID for bo4a...");
  const { error: rpcErr } = await supabase.rpc('fix_identity_id_random', { p_user_id: 'bbcd0cb2-5337-467a-9f20-5bd72968b163' });
  if (rpcErr) {
    console.error("RPC Error:", rpcErr.message);
    return;
  }
  
  console.log("Identity ID fixed! Attempting login...");
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'bo4a@openlms.edu',
    password: '123456'
  });

  if (authErr) {
    console.error("Login failed:", authErr.message);
  } else {
    console.log("Login successful! User ID:", authData.user.id);
  }
}

runTest();

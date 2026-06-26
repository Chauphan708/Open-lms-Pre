import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log("Changing email to bo4a_test@gmail.com...");
  const { error: rpcErr } = await supabase.rpc('change_user_email_test', { p_old_email: 'bo4a@openlms.edu', p_new_email: 'bo4a_test@gmail.com' });
  if (rpcErr) {
    console.error("RPC Error:", rpcErr.message);
    return;
  }
  
  console.log("Email updated! Attempting login...");
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'bo4a_test@gmail.com',
    password: '123456'
  });

  if (authErr) {
    console.error("Login failed:", authErr.message);
  } else {
    console.log("Login successful! User ID:", authData.user.id);
  }

  // Restore email back to bo4a@openlms.edu
  console.log("Restoring email back...");
  await supabase.rpc('change_user_email_test', { p_old_email: 'bo4a_test@gmail.com', p_new_email: 'bo4a@openlms.edu' });
}

runTest();

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  console.log("Verifying password '123456' in DB...");
  const { data: v1, error: e1 } = await supabase.rpc('verify_user_password', { p_email: 'bo4a@openlms.edu', p_pass: '123456' });
  console.log("Password '123456' match:", v1, "Error:", e1?.message);

  console.log("Verifying password '12345678' in DB...");
  const { data: v2, error: e2 } = await supabase.rpc('verify_user_password', { p_email: 'bo4a@openlms.edu', p_pass: '12345678' });
  console.log("Password '12345678' match:", v2, "Error:", e2?.message);
}

verify();

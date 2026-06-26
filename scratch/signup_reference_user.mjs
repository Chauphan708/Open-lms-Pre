import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function signupRef() {
  const email = `test_${Date.now()}@gmail.com`;
  console.log(`Signing up reference user ${email}...`);
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email,
    password: 'password123',
    options: {
      data: {
        name: 'Test Reference',
        role: 'STUDENT'
      }
    }
  });

  if (signUpErr) {
    console.error("SignUp Error:", signUpErr.message);
    return;
  }

  const userId = signUpData.user.id;
  console.log("SignUp successful! User ID:", userId);

  // Now create an RPC to query this reference user
  const { data: refUser, error: refErr } = await supabase.rpc('get_specific_user_record', { p_id: userId });
  if (refErr) {
    console.error("RPC Error:", refErr.message);
  } else {
    console.log("Reference User Record in auth.users:", JSON.stringify(refUser.user, null, 2));
    console.log("Reference Identity in auth.identities:", JSON.stringify(refUser.identity, null, 2));
  }
}

signupRef();

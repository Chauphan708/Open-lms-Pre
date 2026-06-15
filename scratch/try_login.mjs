import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFullLogin() {
  console.log("Testing full auth flow...");
  
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'chauphan@gmail.com',
    password: 'ChauPhan@2026!'
  });

  if (authErr) {
    console.error("Auth error:", authErr.message);
    return;
  }

  console.log("Auth successful! User ID:", authData.user.id);

  // Now query profiles as the authenticated user
  // We need to set the authorization header since we are using the same client but it should have session now.
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileErr) {
    console.error("Profile query error:", profileErr.message, profileErr.details);
  } else {
    console.log("Profile retrieved:", profile);
  }
}

testFullLogin();

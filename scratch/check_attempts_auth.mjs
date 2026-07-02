import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qukuafjaqkcmcegksovp.supabase.co';
const supabaseKey = 'sb_publishable_zqSS0rC6GYDEsLXXP4O0mQ_Hblm7NWT';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Login
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'chauphan@gmail.com',
    password: 'ChauPhan@2026!'
  });

  if (authErr) {
    console.error("Login failed:", authErr);
    return;
  }

  console.log("Logged in successfully. User ID:", authData.user.id);

  // Fetch count
  const { count, error: countErr } = await supabase
    .from('arena_tower_attempts')
    .select('id', { count: 'exact', head: true });

  if (countErr) {
    console.error("Count failed:", countErr);
  } else {
    console.log("Authenticated Count of arena_tower_attempts:", count);
  }

  // Fetch some rows
  const { data, error: fetchErr } = await supabase
    .from('arena_tower_attempts')
    .select('*')
    .limit(5);

  if (fetchErr) {
    console.error("Fetch failed:", fetchErr);
  } else {
    console.log("Fetch sample:", data);
  }
}

run();

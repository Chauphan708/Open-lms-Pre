import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Custom UUID generator v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function testNewStudent() {
  const email = `test_std_${Date.now()}@openlms.edu`;
  const uuid = generateUUID();

  console.log(`Step 1: Inserting new student ${email} (ID: ${uuid}) into public.profiles...`);
  
  const { error: insertErr } = await supabase.from('profiles').insert({
    id: uuid,
    name: 'Test Student Auto',
    email: email,
    role: 'STUDENT',
    password: '123456',
    avatar: 'https://ui-avatars.com/api/?name=TestStudent'
  });

  if (insertErr) {
    console.error("Step 1 failed: Insert error:", insertErr.message);
    return;
  }

  console.log("Insert successful! Waiting 3 seconds for sync trigger...");
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log("Step 2: Testing login...");
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email,
    password: '123456'
  });

  if (authErr) {
    console.error("Login failed:", authErr.message, authErr);
  } else {
    console.log("Login successful! User ID:", authData.user.id);
  }

  // Cleanup
  console.log("Cleaning up...");
  await supabase.from('profiles').delete().eq('id', uuid);
}

testNewStudent();

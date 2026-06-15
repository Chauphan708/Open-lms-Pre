import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log("Checking schema on:", supabaseUrl);
  
  // Try querying arena_questions
  const { data: q, error: errQ } = await supabase
    .from('arena_questions')
    .select('*')
    .limit(1);

  if (errQ) {
    console.error("Error querying arena_questions:", errQ);
  } else {
    console.log("arena_questions structure:", q ? Object.keys(q[0] || {}) : "No rows");
  }

  // Try querying arena_profiles
  const { data: p, error: errP } = await supabase
    .from('arena_profiles')
    .select('*')
    .limit(1);

  if (errP) {
    console.error("Error querying arena_profiles:", errP);
  } else {
    console.log("arena_profiles structure:", p ? Object.keys(p[0] || {}) : "No rows");
  }
}

checkSchema();

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('e:/antigravity_projects/ptchau1708/Open-lms-Pre/.env', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('arena_questions')
    .select('*')
    .ilike('content', '%Mùa đông%');

  if (error) {
    console.error("Lỗi:", error);
    return;
  }

  console.log("Specific question data:", data);
}

check();

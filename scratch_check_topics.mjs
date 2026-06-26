import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('e:/antigravity_projects/ptchau1708/Open-lms-Pre/.env', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: questions, error } = await supabase
    .from('arena_questions')
    .select('topic, subject, grade');

  if (error) {
    console.error("Lỗi:", error);
    return;
  }

  const unique = {};
  questions.forEach(q => {
    const key = `${q.subject} | ${q.topic} | ${q.grade}`;
    unique[key] = (unique[key] || 0) + 1;
  });

  console.log("Unique questions in DB:", unique);

  const { data: topics, error: err2 } = await supabase
    .from('arena_topics')
    .select('*');
  
  console.log("Custom Topics in DB:", topics, "Error:", err2);
}

check();

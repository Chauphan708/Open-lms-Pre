import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: teacher, error: errT } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'teacher@openlms.edu')
    .maybeSingle();

  console.log("Teacher Profile:", teacher, "Error:", errT);

  const { data: chauphan, error: errC } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'chauphan@gmail.com')
    .maybeSingle();

  console.log("ChauPhan Profile:", chauphan, "Error:", errC);
}

check();

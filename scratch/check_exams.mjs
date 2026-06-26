import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env file from project root
const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
        env[key] = value;
    }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("=== EXAMS ===");
    const { data: exams, error: examsErr } = await supabase.from('exams').select('title, topic, grade, subject, status');
    if (examsErr) {
        console.error("Error fetching exams:", examsErr);
        return;
    }
    console.log(JSON.stringify(exams, null, 2));
}

run();

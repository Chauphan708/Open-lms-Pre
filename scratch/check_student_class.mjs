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
    console.log("=== PROFILES (STUDENTS) ===");
    // Get profiles with className
    const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, name, email, role, class_name')
        .eq('role', 'STUDENT');
    
    if (pErr) {
        console.error("Error fetching profiles:", pErr);
        return;
    }
    console.log(JSON.stringify(profiles, null, 2));
}

run();

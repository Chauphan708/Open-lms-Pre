const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const doCheck = async () => {
    const env = fs.readFileSync('.env', 'utf-8');
    const url = env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim();
    const key = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim();
    const supabase = createClient(url, key);
    const { data: cData } = await supabase.from('classes').select('*').limit(1);
    console.log('--- CLASSES ---');
    console.log(JSON.stringify(cData, null, 2));

    const { data: pData } = await supabase.from('profiles').select('*').limit(1);
    console.log('--- PROFILES ---');
    console.log(JSON.stringify(pData, null, 2));
};
doCheck();

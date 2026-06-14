import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    const res = {
        id: 'test_id',
        title: 'Test',
        url: 'http://test.com',
        type: 'LINK',
        topic: 'Chung',
        description: 'test',
        addedBy: 'user1',
        createdAt: new Date().toISOString()
    };

    // Test the first insert what kind of error it gets
    const { error: err1 } = await supabase.from('resources').insert({
        id: res.id,
        title: res.title,
        url: res.url,
        type: res.type,
        topic: res.topic,
        description: res.description,
        addedBy: res.addedBy,
        added_by: res.addedBy,
        createdAt: res.createdAt,
        created_at: res.createdAt
    });

    console.log("Error 1 (both):", err1);

    const { error: err2 } = await supabase.from('resources').insert({
        id: res.id,
        title: res.title,
        url: res.url,
        type: res.type,
        topic: res.topic,
        description: res.description,
        addedBy: res.addedBy,
        createdAt: res.createdAt
    });
    console.log("Error 2 (camel):", err2);

    const { error: err3 } = await supabase.from('resources').insert({
        id: res.id,
        title: res.title,
        url: res.url,
        type: res.type,
        topic: res.topic,
        description: res.description,
        addedby: res.addedBy,
        createdat: res.createdAt
    });
    console.log("Error 3 (lower):", err3);

    const { data: cols } = await supabase.from('resources').select('*').limit(1);
    console.log("Sample rows:", cols);
}

check();

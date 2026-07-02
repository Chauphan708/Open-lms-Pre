import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qukuafjaqkcmcegksovp.supabase.co';
const supabaseKey = 'sb_publishable_zqSS0rC6GYDEsLXXP4O0mQ_Hblm7NWT';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: exam } = await supabase
        .from('exams')
        .select('*')
        .eq('id', 'exam_1782221216823')
        .single();

    const targetIndices = [55, 58, 83, 91, 92]; // 1-indexed

    targetIndices.forEach(idx => {
        const q = exam.questions[idx - 1];
        console.log(`=== Q${idx} ===`);
        console.log("Content:", q.content);
        console.log("Type:", q.type);
        console.log("Options:", q.options);
        console.log("CorrectOptionIndex:", q.correctOptionIndex);
        console.log("CorrectOptionIndices:", q.correctOptionIndices);
        console.log("Solution:", q.solution);
    });
}

main().catch(console.error);

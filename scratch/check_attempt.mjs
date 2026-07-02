import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qukuafjaqkcmcegksovp.supabase.co';
const supabaseKey = 'sb_publishable_zqSS0rC6GYDEsLXXP4O0mQ_Hblm7NWT';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Fetching attempt...");
    const { data: attempt } = await supabase
        .from('attempts')
        .select('*')
        .eq('id', 'ad396428-2d3b-4b99-9ed2-54bb9626639f')
        .single();

    console.log("Fetching exam...");
    const { data: exam } = await supabase
        .from('exams')
        .select('*')
        .eq('id', 'exam_1782221216823')
        .single();

    let correctCount = 0;
    let scoredQuestionCount = 0;
    const incorrectQuestions = [];

    const normalizeMath = (str) => {
        return str
            .replace(/\s+/g, ' ')
            .replace(/\\frac{([^}]+)}{([^}]+)}/g, '$1/$2')
            .replace(/{([^}]+)}\/([^{]+)/g, '$1/$2')
            .trim();
    };

    exam.questions.forEach((q, idx) => {
        if (!q.isNotScored) {
            scoredQuestionCount++;
        }

        const userAns = attempt.answers[q.id];
        let isCorrect = false;

        if (q.type === 'MCQ') {
            if (userAns === q.correctOptionIndex) {
                isCorrect = true;
            }
        } else if (q.type === 'MCQ_MULTIPLE') {
            const correctArray = q.correctOptionIndices || [];
            const userArray = Array.isArray(userAns) ? userAns : [];
            if (correctArray.length > 0 && correctArray.length === userArray.length && correctArray.every(val => userArray.includes(val))) {
                isCorrect = true;
            }
        } else if (q.type === 'SHORT_ANSWER') {
            const sAns = normalizeMath(String(userAns || '').trim().toLowerCase().replace(/\s+/g, ''));
            const solString = String(q.solution || '').trim();
            const isSolutionShort = solString !== '' && solString.split(/\s+/).length < 10;

            isCorrect = (q.options && q.options.length > 0)
                ? q.options.some(opt => {
                    const optStr = normalizeMath(String(opt || '').trim().toLowerCase().replace(/\s+/g, ''));
                    return optStr === sAns;
                })
                : (isSolutionShort && sAns === normalizeMath(solString.toLowerCase().replace(/\s+/g, '')));
        } else if (['MATCHING', 'ORDERING', 'DRAG_DROP', 'SENTENCE_SCRAMBLE'].includes(q.type)) {
            if (Array.isArray(userAns) && userAns.length === q.options.length) {
                let isAllCorrect = true;
                for (let i = 0; i < q.options.length; i++) {
                    const expected = q.options[i];
                    const actual = userAns[i];
                    
                    const normExpected = String(expected || '').trim().toLowerCase().replace(/\s*\|\|\|\s*/g, '|||');
                    const normActual = String(actual || '').trim().toLowerCase().replace(/\s*\|\|\|\s*/g, '|||');
                    
                    if (normActual !== normExpected) {
                        isAllCorrect = false;
                        break;
                    }
                }
                if (isAllCorrect) {
                    isCorrect = true;
                }
            }
        }

        if (isCorrect) {
            if (!q.isNotScored) correctCount++;
        } else {
            incorrectQuestions.push({
                index: idx + 1,
                id: q.id,
                content: q.content,
                type: q.type,
                userAnswer: userAns,
                options: q.options,
                solution: q.solution,
                correctOptionIndices: q.correctOptionIndices
            });
        }
    });

    console.log(`LOCAL GRADING: ${correctCount} / ${scoredQuestionCount} correct.`);
    console.log("INCORRECT QUESTIONS:");
    incorrectQuestions.forEach(iq => {
        console.log(`- Q${iq.index} (${iq.type}): "${iq.content.substring(0, 80)}..."`);
        console.log(`  User Answer:`, iq.userAnswer);
        console.log(`  Options:`, iq.options);
        console.log(`  Solution:`, iq.solution);
        console.log(`  CorrectIndices:`, iq.correctOptionIndices);
    });
}

main().catch(console.error);

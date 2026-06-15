import fs from 'fs';

const filePath = 'e:/antigravity_projects/ptchau1708/Open-lms-Pre/pages/arena/TowerMode.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add supabase import
content = "import { supabase } from '../../services/supabaseClient';\n" + content;

// 2. Add customTopics state hook
const stateHookTarget = `  const navigate = useNavigate();`;
const stateHookReplacement = `  const navigate = useNavigate();
  const [customTopics, setCustomTopics] = useState<{ id: string; subject: string; topic: string }[]>([]);`;
content = content.replace(stateHookTarget, stateHookReplacement);

// 3. Fetch customTopics on mount
const fetchTarget = `        fetchArenaProfile(user.id),
        fetchArenaQuestions()
      ]).then(() => setLoading(false));`;

const fetchReplacement = `        fetchArenaProfile(user.id),
        fetchArenaQuestions(),
        supabase.from('arena_topics').select('*').then(({ data }) => { if (data) setCustomTopics(data); })
      ]).then(() => setLoading(false));`;
content = content.replace(fetchTarget, fetchReplacement);

// 4. Merge customTopics in useEffect
const mergeTarget = `    // Merge default presets and dynamic ones`;
const mergeReplacement = `    // Look in customTopics
    customTopics.forEach(ct => {
      const exists = dynamicTopics.some(t => t.topic.toLowerCase() === ct.topic.toLowerCase());
      if (!exists) {
        dynamicTopics.push({
          topic: ct.topic,
          label: \`📋 Chuyên đề: \${ct.topic}\`,
          subject: ct.subject
        });
      }
    });

    // Merge default presets and dynamic ones`;
content = content.replace(mergeTarget, mergeReplacement);

// 5. Update difficulty label mappings (diffLabel)
const diffLabelTarget = `const diffLabel = targetDiff === 3 ? 'Vận dụng (Khó)' : targetDiff === 2 ? 'Thông hiểu (Trung bình)' : 'Nhận biết (Dễ)';`;
const diffLabelReplacement = `const diffLabel = targetDiff === 4 ? 'Mức nâng cao' : targetDiff === 3 ? 'Mức 3' : targetDiff === 2 ? 'Mức 2' : 'Mức 1';`;
content = content.replace(diffLabelTarget, diffLabelReplacement);

// 6. Update adaptation indicators in HUD
const hudTarget = `{currentDifficulty === 1 ? 'Mức 1: Nhận biết (Dễ)' : currentDifficulty === 2 ? 'Mức 2: Thông hiểu' : 'Mức 3: Vận dụng (Khó)'}`;
const hudReplacement = `{currentDifficulty === 4 ? 'Mức nâng cao' : currentDifficulty === 3 ? 'Mức 3' : currentDifficulty === 2 ? 'Mức 2' : 'Mức 1'}`;
content = content.replace(hudTarget, hudReplacement);

// 7. Update ceiling limit for adaptive level up from < 3 to < 4
const ceilingTarget = `        if (currentDifficulty < 3) {
          finalDifficulty = currentDifficulty + 1;`;
const ceilingReplacement = `        if (currentDifficulty < 4) {
          finalDifficulty = currentDifficulty + 1;`;
content = content.replace(ceilingTarget, ceilingReplacement);

// 8. Update baseXP calculation to include difficulty 4
const xpTarget = `      const baseXP = currentDifficulty === 1 ? 10 : currentDifficulty === 2 ? 15 : 20;`;
const xpReplacement = `      const baseXP = currentDifficulty === 1 ? 10 : currentDifficulty === 2 ? 15 : currentDifficulty === 3 ? 20 : 30;`;
content = content.replace(xpTarget, xpReplacement);

fs.writeFileSync(filePath, content, 'utf-8');
console.log("Successfully updated TowerMode.tsx!");

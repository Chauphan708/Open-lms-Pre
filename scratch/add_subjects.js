import fs from 'fs';

// 1. UPDATE ArenaAdmin.tsx SUBJECTS list
const adminPath = 'e:/antigravity_projects/ptchau1708/Open-lms-Pre/pages/arena/ArenaAdmin.tsx';
let adminContent = fs.readFileSync(adminPath, 'utf-8');

const adminSubjectsTarget = `const SUBJECTS = [
    { value: 'math', label: '📐 Toán' },
    { value: 'science', label: '🔬 Khoa học' },
    { value: 'technology', label: '💻 Công nghệ' },
    { value: 'vietnamese', label: '📝 Tiếng Việt' },
    { value: 'english', label: '🌐 Tiếng Anh' },
];`;

const adminSubjectsReplacement = `const SUBJECTS = [
    { value: 'math', label: '📐 Toán' },
    { value: 'science', label: '🔬 Khoa học' },
    { value: 'technology', label: '💻 Công nghệ' },
    { value: 'vietnamese', label: '📝 Tiếng Việt' },
    { value: 'english', label: '🌐 Tiếng Anh' },
    { value: 'history_geography', label: '⏳ Lịch sử & Địa lí' },
];`;
adminContent = adminContent.replace(adminSubjectsTarget, adminSubjectsReplacement);
fs.writeFileSync(adminPath, adminContent, 'utf-8');
console.log("Updated ArenaAdmin.tsx subjects!");

// 2. UPDATE TowerMode.tsx DEFAULT_TOPICS_BY_SUBJECT and selections
const towerPath = 'e:/antigravity_projects/ptchau1708/Open-lms-Pre/pages/arena/TowerMode.tsx';
let towerContent = fs.readFileSync(towerPath, 'utf-8');

// Update DEFAULT_TOPICS_BY_SUBJECT
const defaultTopicsTarget = `  technology: [
    { topic: 'Phần cứng', label: '💻 Thiết bị máy tính' },
    { topic: 'Phần mềm', label: '💻 Phần mềm soạn thảo & Trình chiếu' },
    { topic: 'Internet', label: '💻 Mạng máy tính thế giới' },
  ]
};`;

const defaultTopicsReplacement = `  technology: [
    { topic: 'Phần cứng', label: '💻 Thiết bị máy tính' },
    { topic: 'Phần mềm', label: '💻 Phần mềm soạn thảo & Trình chiếu' },
    { topic: 'Internet', label: '💻 Mạng máy tính thế giới' },
  ],
  vietnamese: [
    { topic: 'Luyện từ và câu', label: '📝 Luyện từ và câu' },
    { topic: 'Tập làm văn', label: '📝 Tập làm văn' },
    { topic: 'Chính tả', label: '📝 Quy tắc chính tả' }
  ],
  english: [
    { topic: 'Vocabulary', label: '🌐 English Vocabulary' },
    { topic: 'Grammar', label: '🌐 Grammar & Tenses' }
  ],
  history_geography: [
    { topic: 'Địa lí Việt Nam', label: '⏳ Địa lí tự nhiên & Dân cư' },
    { topic: 'Lịch sử thế kỉ XX', label: '⏳ Lịch sử Việt Nam hiện đại' },
    { topic: 'Triều Nguyễn', label: '⏳ Lịch sử triều Nguyễn' }
  ]
};`;
towerContent = towerContent.replace(defaultTopicsTarget, defaultTopicsReplacement);

// Update AI prompt subject label mapping
const aiSubjectTarget = `\`Môn học \${selectedSubject === 'math' ? 'Toán' : selectedSubject === 'science' ? 'Khoa học' : 'Công nghệ'}. Hãy đặt các phương án A, B, C, D rõ ràng.\``;
const aiSubjectReplacement = `\`Môn học \${selectedSubject === 'math' ? 'Toán' : selectedSubject === 'science' ? 'Khoa học' : selectedSubject === 'technology' ? 'Công nghệ' : selectedSubject === 'vietnamese' ? 'Tiếng Việt' : selectedSubject === 'english' ? 'Tiếng Anh' : 'Lịch sử và Địa lí'}. Hãy đặt các phương án A, B, C, D rõ ràng.\``;
towerContent = towerContent.replace(aiSubjectTarget, aiSubjectReplacement);

// Update Subject buttons in HUD
const subjectButtonsTarget = `              <button 
                onClick={() => {
                  setSelectedSubject('technology');
                  const list = availableTopics.filter(t => t.subject === 'technology');
                  if (list.length > 0) setSelectedTopic(list[0].topic);
                }}
                className={\`py-2 rounded-xl text-xs font-black transition-all \${selectedSubject === 'technology' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:bg-white/10'}\`}
              >
                💻 Công nghệ
              </button>
            </div>`;

const subjectButtonsReplacement = `              <button 
                onClick={() => {
                  setSelectedSubject('technology');
                  const list = availableTopics.filter(t => t.subject === 'technology');
                  if (list.length > 0) setSelectedTopic(list[0].topic);
                }}
                className={\`py-2 rounded-xl text-xs font-black transition-all \${selectedSubject === 'technology' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:bg-white/10'}\`}
              >
                💻 Công nghệ
              </button>
              <button 
                onClick={() => {
                  setSelectedSubject('vietnamese');
                  const list = availableTopics.filter(t => t.subject === 'vietnamese');
                  if (list.length > 0) setSelectedTopic(list[0].topic);
                }}
                className={\`py-2 rounded-xl text-xs font-black transition-all \${selectedSubject === 'vietnamese' ? 'bg-rose-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:bg-white/10'}\`}
              >
                📝 Tiếng Việt
              </button>
              <button 
                onClick={() => {
                  setSelectedSubject('english');
                  const list = availableTopics.filter(t => t.subject === 'english');
                  if (list.length > 0) setSelectedTopic(list[0].topic);
                }}
                className={\`py-2 rounded-xl text-xs font-black transition-all \${selectedSubject === 'english' ? 'bg-teal-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:bg-white/10'}\`}
              >
                🌐 Tiếng Anh
              </button>
              <button 
                onClick={() => {
                  setSelectedSubject('history_geography');
                  const list = availableTopics.filter(t => t.subject === 'history_geography');
                  if (list.length > 0) setSelectedTopic(list[0].topic);
                }}
                className={\`py-2 rounded-xl text-xs font-black transition-all \${selectedSubject === 'history_geography' ? 'bg-amber-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:bg-white/10'}\`}
              >
                ⏳ Lịch sử & Địa lí
              </button>
            </div>`;
towerContent = towerContent.replace(subjectButtonsTarget, subjectButtonsReplacement);

// Update Header subject title display mapping
const titleTarget = `\`\${selectedSubject === 'math' ? '📐 Toán' : selectedSubject === 'science' ? '🔬 Khoa học' : '💻 Công nghệ'}\``;
const titleReplacement = `\`\${selectedSubject === 'math' ? '📐 Toán' : selectedSubject === 'science' ? '🔬 Khoa học' : selectedSubject === 'technology' ? '💻 Công nghệ' : selectedSubject === 'vietnamese' ? '📝 Tiếng Việt' : selectedSubject === 'english' ? '🌐 Tiếng Anh' : '⏳ Lịch sử & Địa lí'}\``;
towerContent = towerContent.replace(titleTarget, titleReplacement);

fs.writeFileSync(towerPath, towerContent, 'utf-8');
console.log("Updated TowerMode.tsx subjects!");

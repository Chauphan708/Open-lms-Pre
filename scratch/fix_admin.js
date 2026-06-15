import fs from 'fs';

const filePath = 'e:/antigravity_projects/ptchau1708/Open-lms-Pre/pages/arena/ArenaAdmin.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add supabase import
content = "import { supabase } from '../../services/supabaseClient';\n" + content;

// 2. Update DIFFICULTIES list
const diffTarget = `const DIFFICULTIES = [
    { value: 1, label: 'Dễ' },
    { value: 2, label: 'Trung bình' },
    { value: 3, label: 'Khó' },
];`;
const diffReplacement = `const DIFFICULTIES = [
    { value: 1, label: 'Mức 1' },
    { value: 2, label: 'Mức 2' },
    { value: 3, label: 'Mức 3' },
    { value: 4, label: 'Mức nâng cao' },
];`;
content = content.replace(diffTarget, diffReplacement);

// 3. Add custom topics state hooks
const hooksTarget = `    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);`;
const hooksReplacement = `    const navigate = useNavigate();

    // Custom Topics States
    const [showTopicManager, setShowTopicManager] = useState(false);
    const [customTopics, setCustomTopics] = useState<{ id: string; subject: string; topic: string }[]>([]);
    const [newTopicName, setNewTopicName] = useState('');
    const [newTopicSubject, setNewTopicSubject] = useState('math');

    const [loading, setLoading] = useState(true);`;
content = content.replace(hooksTarget, hooksReplacement);

// 4. Add custom topic fetching and handlers
const handlersTarget = `    useEffect(() => {
        fetchArenaQuestions().then(() => setLoading(false));
    }, []);`;
const handlersReplacement = `    const fetchCustomTopics = async () => {
        const { data } = await supabase.from('arena_topics').select('*').order('created_at', { ascending: false });
        if (data) setCustomTopics(data);
    };

    const handleAddTopic = async () => {
        if (!newTopicName.trim()) return;
        const { error } = await supabase.from('arena_topics').insert({
            subject: newTopicSubject,
            topic: newTopicName.trim()
        });
        if (error) {
            alert("Lỗi khi thêm chuyên đề: " + error.message);
        } else {
            setNewTopicName('');
            fetchCustomTopics();
        }
    };

    const handleDeleteTopic = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa chuyên đề này?")) return;
        const { error } = await supabase.from('arena_topics').delete().eq('id', id);
        if (error) {
            alert("Lỗi khi xóa chuyên đề: " + error.message);
        } else {
            fetchCustomTopics();
        }
    };

    useEffect(() => {
        fetchArenaQuestions().then(() => setLoading(false));
        fetchCustomTopics();
    }, []);`;
content = content.replace(handlersTarget, handlersReplacement);

// 5. Update handleExportCSV to support difficulty 1-4 and add handleDownloadTemplate
const exportTarget = `    // Export CSV function supporting UTF-8 BOM and type options
    const handleExportCSV = () => {
        const headers = ['Câu hỏi', 'Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D', 'Đáp án đúng (A/B/C/D)', 'Độ khó (1-3)', 'Môn (math/science/technology/vietnamese/english)', 'Chủ đề', 'Thời gian làm bài (giây)', 'XP thưởng', 'Loại (MCQ/MCQ_MULTIPLE/SHORT_ANSWER)', 'Các đáp án đúng (tách nhau bằng dấu gạch ngang dọc VD: 0|2 cho A và C)', 'Chuỗi đáp án điền từ'];
        
        const rows = filteredQuestions.map(q => {
            const correctLetter = q.type === 'MCQ' ? String.fromCharCode(65 + (q.correct_index ?? 0)) : '';
            const correctIndicesStr = q.type === 'MCQ_MULTIPLE' && q.correct_indices ? q.correct_indices.join('|') : '';
            const shortAnswerStr = q.type === 'SHORT_ANSWER' ? q.correct_answer_string || '' : '';
            return [
                \`"\${q.content.replace(/"/g, '""')}"\`,
                \`"\${(q.answers?.[0] || '').replace(/"/g, '""')}"\`,
                \`"\${(q.answers?.[1] || '').replace(/"/g, '""')}"\`,
                \`"\${(q.answers?.[2] || '').replace(/"/g, '""')}"\`,
                \`"\${(q.answers?.[3] || '').replace(/"/g, '""')}"\`,
                correctLetter,
                q.difficulty,
                q.subject,
                \`"\${(q.topic || 'general').replace(/"/g, '""')}"\`,
                q.time_limit_seconds || 30,
                q.xp_reward || 10,
                q.type || 'MCQ',
                \`"\${correctIndicesStr}"\`,
                \`"\${shortAnswerStr.replace(/"/g, '""')}"\`
            ];
        });

        const csvContent = "\\ufeff" + [headers.join(","), ...rows.map(e => e.join(","))].join("\\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", \`ngan_hang_dau_tri_\${new Date().toLocaleDateString('vi-VN').replace(/\\//g, '-')}.csv\`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };`;

const exportReplacement = `    // Export CSV function supporting UTF-8 BOM and type options
    const handleExportCSV = () => {
        const headers = ['Câu hỏi', 'Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D', 'Đáp án đúng (A/B/C/D)', 'Độ khó (1-4)', 'Môn (math/science/technology/vietnamese/english)', 'Chủ đề', 'Thời gian làm bài (giây)', 'XP thưởng', 'Loại (MCQ/MCQ_MULTIPLE/SHORT_ANSWER)', 'Các đáp án đúng (tách nhau bằng dấu gạch ngang dọc VD: 0|2 cho A và C)', 'Chuỗi đáp án điền từ'];
        
        const rows = filteredQuestions.map(q => {
            const correctLetter = q.type === 'MCQ' ? String.fromCharCode(65 + (q.correct_index ?? 0)) : '';
            const correctIndicesStr = q.type === 'MCQ_MULTIPLE' && q.correct_indices ? q.correct_indices.join('|') : '';
            const shortAnswerStr = q.type === 'SHORT_ANSWER' ? q.correct_answer_string || '' : '';
            return [
                \`"\${q.content.replace(/"/g, '""')}"\`,
                \`"\${(q.answers?.[0] || '').replace(/"/g, '""')}"\`,
                \`"\${(q.answers?.[1] || '').replace(/"/g, '""')}"\`,
                \`"\${(q.answers?.[2] || '').replace(/"/g, '""')}"\`,
                \`"\${(q.answers?.[3] || '').replace(/"/g, '""')}"\`,
                correctLetter,
                q.difficulty,
                q.subject,
                \`"\${(q.topic || 'general').replace(/"/g, '""')}"\`,
                q.time_limit_seconds || 30,
                q.xp_reward || 10,
                q.type || 'MCQ',
                \`"\${correctIndicesStr}"\`,
                \`"\${shortAnswerStr.replace(/"/g, '""')}"\`
            ];
        });

        const csvContent = "\\ufeff" + [headers.join(","), ...rows.map(e => e.join(","))].join("\\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", \`ngan_hang_dau_tri_\${new Date().toLocaleDateString('vi-VN').replace(/\\//g, '-')}.csv\`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadTemplate = () => {
        const headers = ['Câu hỏi', 'Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D', 'Đáp án đúng (A/B/C/D)', 'Độ khó (1-4)', 'Môn (math/science/technology/vietnamese/english)', 'Chủ đề', 'Thời gian làm bài (giây)', 'XP thưởng', 'Loại (MCQ/MCQ_MULTIPLE/SHORT_ANSWER)', 'Các đáp án đúng (tách nhau bằng dấu gạch ngang dọc VD: 0|2 cho A và C)', 'Chuỗi đáp án điền từ'];
        const csvContent = "\\ufeff" + [
            headers.join(","),
            [
                '"Phân số 3/4 viết dưới dạng số thập phân là bao nhiêu?"', '"0,25"', '"0,5"', '"0,75"', '"0,34"', 'C', '1', 'math', '"Phân số & Số thập phân"', '30', '10', 'MCQ', '',''
            ].join(","),
            [
                '"Các số nguyên tố nhỏ hơn 10 là các số nào?"', '"2, 3, 5, 7"', '"1, 2, 3, 5, 7"', '"2, 3, 5, 7, 9"', '"2, 4, 6, 8"', 'A|B', '2', 'math', '"Số học"', '30', '15', 'MCQ_MULTIPLE', '0|1',''
            ].join(","),
            [
                '"Chất nào chiếm phần lớn trong không khí?"', '', '', '', '', '', '3', 'science', '"Không khí"', '30', '20', 'SHORT_ANSWER', '', '"Nitơ|nito|nitrogen"'
            ].join(",")
        ].join("\\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "ngan_hang_dau_tri_mau.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };`;
content = content.replace(exportTarget, exportReplacement);

// 6. Update CSV Parse Difficulty Check limit
const csvCheckTarget = `            const difficulty = parseInt(diffStr?.trim());
            if (isNaN(difficulty) || difficulty < 1 || difficulty > 3) {
                errors.push(\`Dòng \${i + 1}: Độ khó phải là 1-3 (nhận "\${diffStr}")\`);
                continue;
            }`;

const csvCheckReplacement = `            const difficulty = parseInt(diffStr?.trim());
            if (isNaN(difficulty) || difficulty < 1 || difficulty > 4) {
                errors.push(\`Dòng \${i + 1}: Độ khó phải là 1-4 (nhận "\${diffStr}")\`);
                continue;
            }`;
content = content.replace(csvCheckTarget, csvCheckReplacement);

// 7. Add Topic Manager button to Header
const btnHeaderTarget = `                    <button onClick={() => navigate('/arena/tournament/host')} className="px-4 py-2 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 flex items-center gap-2 shadow-md transition-all hover:scale-105">
                        <Trophy className="h-4 w-4" /> Tổ chức Giải đấu
                    </button>`;
const btnHeaderReplacement = `                    <button onClick={() => navigate('/arena/tournament/host')} className="px-4 py-2 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 flex items-center gap-2 shadow-md transition-all hover:scale-105">
                        <Trophy className="h-4 w-4" /> Tổ chức Giải đấu
                    </button>
                    <button onClick={() => setShowTopicManager(true)} className="px-4 py-2 bg-purple-50 text-purple-700 rounded-xl font-bold text-sm hover:bg-purple-100 flex items-center gap-2 transition-colors">
                        <BookOpen className="h-4 w-4" /> Quản lý chuyên đề
                    </button>`;
content = content.replace(btnHeaderTarget, btnHeaderReplacement);

// 8. Update Quick Stats mapping (colors, bgColors, loop)
const statsTarget = `                {DIFFICULTIES.map(d => {
                    const count = arenaQuestions.filter(q => q.difficulty === d.value).length;
                    const colors = ['', 'text-emerald-600', 'text-amber-600', 'text-red-600'];
                    const bgColors = ['', 'bg-emerald-50/55', 'bg-amber-50/55', 'bg-red-50/55'];
                    return (
                        <div key={d.value} className={\`bg-white rounded-2xl border p-4 shadow-sm text-center transition-all \${bgColors[d.value]}\`}>
                            <div className={\`text-3xl font-black \${colors[d.value]}\`}>{count}</div>
                            <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">{d.label}</div>
                        </div>
                    );
                })}`;

const statsReplacement = `                {DIFFICULTIES.map(d => {
                    const count = arenaQuestions.filter(q => q.difficulty === d.value).length;
                    const colors = ['', 'text-emerald-600', 'text-amber-600', 'text-red-600', 'text-fuchsia-600'];
                    const bgColors = ['', 'bg-emerald-50/55', 'bg-amber-50/55', 'bg-red-50/55', 'bg-fuchsia-50/55'];
                    return (
                        <div key={d.value} className={\`bg-white rounded-2xl border p-4 shadow-sm text-center transition-all \${bgColors[d.value] || 'bg-gray-50/55'}\`}>
                            <div className={\`text-3xl font-black \${colors[d.value] || 'text-gray-600'}\`}>{count}</div>
                            <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">{d.label}</div>
                        </div>
                    );
                })}`;
content = content.replace(statsTarget, statsReplacement);

// 9. Add "File mẫu" button to Import instructions
const instructionsTarget = `                                    {/* Instructions */}
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-700">
                                        <p className="font-bold mb-1">📋 Hướng dẫn:</p>
                                        <ol className="list-decimal pl-5 space-y-1 text-xs">
                                            <li>Tải file mẫu CSV bằng nút "File mẫu" ở trên</li>
                                            <li>Điền câu hỏi vào file theo mẫu</li>
                                            <li>Chọn file dưới đây để import</li>
                                        </ol>
                                    </div>`;

const instructionsReplacement = `                                    {/* Instructions */}
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-700 flex justify-between items-start">
                                        <div>
                                            <p className="font-bold mb-1">📋 Hướng dẫn:</p>
                                            <ol className="list-decimal pl-5 space-y-1 text-xs">
                                                <li>Tải file mẫu CSV bằng nút bên phải</li>
                                                <li>Điền câu hỏi vào file theo mẫu</li>
                                                <li>Chọn file dưới đây để import</li>
                                            </ol>
                                        </div>
                                        <button onClick={handleDownloadTemplate} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-1 transition-colors whitespace-nowrap">
                                            <Download className="h-3.5 w-3.5" /> File mẫu
                                        </button>
                                    </div>`;
content = content.replace(instructionsTarget, instructionsReplacement);

// 10. Inject showTopicManager Modal before the end of the root container
const rootEndTarget = `            {showEditingPreview && (`;
const rootEndReplacement = `            {/* Topic Manager Modal */}
            {showTopicManager && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowTopicManager(false)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b flex items-center justify-between">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-purple-500" /> Quản lý chuyên đề tùy chỉnh
                            </h3>
                            <button onClick={() => setShowTopicManager(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Add Topic Form */}
                            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 space-y-3">
                                <h4 className="font-bold text-xs text-purple-800 uppercase tracking-wider">Thêm chuyên đề mới</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1 font-bold">Môn học</label>
                                        <select value={newTopicSubject} onChange={e => setNewTopicSubject(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm font-bold bg-white">
                                            {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1 font-bold">Tên chuyên đề</label>
                                        <input type="text" value={newTopicName} onChange={e => setNewTopicName(e.target.value)} placeholder="VD: Phân số, Từ vựng..." className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 font-medium" />
                                    </div>
                                </div>
                                <button onClick={handleAddTopic} className="w-full py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-colors shadow-md shadow-purple-100 flex items-center justify-center gap-1.5">
                                    <Plus className="h-4 w-4" /> Thêm vào danh sách
                                </button>
                            </div>

                            {/* Topics List */}
                            <div className="space-y-2">
                                <h4 className="font-bold text-xs text-gray-500 uppercase tracking-wider">Danh sách chuyên đề tùy chỉnh ({customTopics.length})</h4>
                                {customTopics.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-6">Chưa có chuyên đề tùy chỉnh nào được tạo.</p>
                                ) : (
                                    <div className="divide-y max-h-[40vh] overflow-y-auto border rounded-xl pr-1">
                                        {customTopics.map(t => (
                                            <div key={t.id} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                                <div>
                                                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase mr-2">
                                                        {SUBJECTS.find(s => s.value === t.subject)?.label || t.subject}
                                                    </span>
                                                    <span className="text-sm font-semibold text-gray-800">{t.topic}</span>
                                                </div>
                                                <button onClick={() => handleDeleteTopic(t.id)} className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showEditingPreview && (`;
content = content.replace(rootEndTarget, rootEndReplacement);

fs.writeFileSync(filePath, content, 'utf-8');
console.log("ArenaAdmin.tsx has been perfectly updated!");

import { supabase } from '../../services/supabaseClient';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import mammoth from 'mammoth';
import { useNavigate } from 'react-router-dom';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { useStore } from '../../store';
import { ArenaQuestion } from '../../types';
import { generateQuestionsByTopic, parseArenaQuestionsFromText } from '../../services/geminiService';
import { Brain, Plus, Pencil, Trash2, Save, X, BookOpen, Filter, ArrowLeft, Upload, Download, FileText, CheckCircle, AlertTriangle, Sparkles, Loader2, Trophy, Search } from 'lucide-react';
import MathText from '../../components/MathText';

const SUBJECTS = [
    { value: 'math', label: '📐 Toán' },
    { value: 'science', label: '🔬 Khoa học' },
    { value: 'technology', label: '💻 Công nghệ' },
    { value: 'vietnamese', label: '📝 Tiếng Việt' },
    { value: 'english', label: '🌐 Tiếng Anh' },
    { value: 'history_geography', label: '⏳ Lịch sử và Địa lí' },
];

const DIFFICULTIES = [
    { value: 1, label: 'Mức 1' },
    { value: 2, label: 'Mức 2' },
    { value: 3, label: 'Mức 3' },
    { value: 4, label: 'Mức nâng cao' },
];

export const normalizeSubject = (sub: string): string => {
    if (!sub) return '';
    const s = sub.trim().toLowerCase();
    if (s === 'vietnamese' || s === 'tiếng việt' || s === 'tieng viet') return 'vietnamese';
    if (s === 'math' || s === 'toán' || s === 'toan') return 'math';
    if (s === 'science' || s === 'khoa học' || s === 'khoa hoc') return 'science';
    if (s === 'technology' || s === 'công nghệ' || s === 'cong nghe' || s === 'tin học' || s === 'tin hoc') return 'technology';
    if (s === 'english' || s === 'tiếng anh' || s === 'tieng anh') return 'english';
    if (s === 'history_geography' || s === 'lịch sử và địa lí' || s === 'lich su va dia li' || s === 'lịch sử & địa lí' || s === 'lịch sử' || s === 'địa lí') return 'history_geography';
    return s;
};

export const ArenaAdmin: React.FC = () => {
    const { arenaQuestions, arenaQuestionsHasMore, fetchArenaQuestions, loadMoreArenaQuestions, addArenaQuestion, updateArenaQuestion, deleteArenaQuestion, bulkDeleteArenaQuestions, bulkAddArenaQuestions, questionBank, exams, arenaTotalCount, arenaDifficultyCounts, arenaFilteredCount } = useStore();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // Custom Topics States
    const [showTopicManager, setShowTopicManager] = useState(false);
    const [customTopics, setCustomTopics] = useState<{ id: string; subject: string; topic: string }[]>([]);
    const [newTopicName, setNewTopicName] = useState('');
    const [newTopicSubject, setNewTopicSubject] = useState('math');
    
    // Filters & Search
    const [filterSubject, setFilterSubject] = useState('');
    const [filterDifficulty, setFilterDifficulty] = useState(0);
    const [filterGrade, setFilterGrade] = useState('');
    const [filterTopic, setFilterTopic] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [editing, setEditing] = useState<ArenaQuestion | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

    // Import state
    const [showImport, setShowImport] = useState(false);
    const [showBankImport, setShowBankImport] = useState(false);
    const [importPreview, setImportPreview] = useState<Omit<ArenaQuestion, 'id'>[]>([]);
    const [importErrors, setImportErrors] = useState<string[]>([]);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ count: number, skipped?: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [validParsedQuestions, setValidParsedQuestions] = useState<Omit<ArenaQuestion, 'id'>[]>([]);
    const [invalidQuestionsText, setInvalidQuestionsText] = useState('');

    // Bank import filter
    const [bankFilterSubject, setBankFilterSubject] = useState('');
    const [bankSelectedIds, setBankSelectedIds] = useState<Set<string>>(new Set());

    // AI Generate & Preview
    const [showAiGen, setShowAiGen] = useState(false);
    const [aiGenSubject, setAiGenSubject] = useState('math');
    const [aiGenTopic, setAiGenTopic] = useState('');
    const [aiGenCount, setAiGenCount] = useState(5);
    const [aiGenDifficulty, setAiGenDifficulty] = useState(1);
    const [aiGenerating, setAiGenerating] = useState(false);
    
    // New: AI Preview & Edit list before saving
    const [aiPreviewList, setAiPreviewList] = useState<Omit<ArenaQuestion, 'id'>[]>([]);
    const [showAiPreviewModal, setShowAiPreviewModal] = useState(false);
    const [editingPreviewIndex, setEditingPreviewIndex] = useState<number | null>(null);

    // AI Scan state variables
    const [showAiScan, setShowAiScan] = useState(false);
    const [aiScanText, setAiScanText] = useState('');
    const [aiScanFileLoading, setAiScanFileLoading] = useState(false);
    const [aiScanning, setAiScanning] = useState(false);

    // Edit form
    const [formContent, setFormContent] = useState('');
    const [formAnswers, setFormAnswers] = useState(['', '', '', '']);
    const [formCorrect, setFormCorrect] = useState(0);
    const [formDifficulty, setFormDifficulty] = useState(1);
    const [formSubject, setFormSubject] = useState('math');
    const [formTopic, setFormTopic] = useState('');
    const [formTimeLimit, setFormTimeLimit] = useState(30);
    const [formXpReward, setFormXpReward] = useState(10);
    const [formGrade, setFormGrade] = useState('4');
    
    // New types support: MCQ_MULTIPLE and SHORT_ANSWER
    const [formType, setFormType] = useState<'MCQ' | 'MCQ_MULTIPLE' | 'SHORT_ANSWER'>('MCQ');
    const [formCorrectIndices, setFormCorrectIndices] = useState<number[]>([]);
    const [formCorrectAnswerString, setFormCorrectAnswerString] = useState('');
    const [formGuide, setFormGuide] = useState('');
    const [formExplanation, setFormExplanation] = useState('');
    const [formCaseSensitive, setFormCaseSensitive] = useState(false);

    const [dbTopics, setDbTopics] = useState<{ topic: string; subject: string; grade: string }[]>([]);

    const fetchDbTopics = async () => {
        try {
            const { data } = await supabase
                .from('arena_questions')
                .select('topic, subject, grade');
            if (data) {
                const filtered = data
                    .filter(q => q.topic && q.topic.trim() && q.topic !== 'general')
                    .map(q => ({
                        topic: q.topic.trim(),
                        subject: q.subject || 'math',
                        grade: q.grade || '4'
                    }));
                const unique = Array.from(new Set(filtered.map(x => JSON.stringify(x)))).map(s => JSON.parse(s) as { topic: string; subject: string; grade: string });
                setDbTopics(unique);
            }
        } catch (err) {
            console.error("Error fetching db topics:", err);
        }
    };

    const fetchCustomTopics = async () => {
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

    // Load questions on start and when filters/search changes
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchArenaQuestions({
                subject: filterSubject || undefined,
                difficulty: filterDifficulty || undefined,
                grade: filterGrade || undefined,
                topic: filterTopic || undefined,
                search: searchQuery || undefined
            }).then(() => setLoading(false));
        }, 300); // 300ms debounce to avoid spamming database on text typing

        return () => clearTimeout(delayDebounceFn);
    }, [filterSubject, filterDifficulty, filterGrade, filterTopic, searchQuery]);

    useEffect(() => {
        fetchCustomTopics();
        fetchDbTopics();
    }, []);

    useEffect(() => {
        fetchDbTopics();
    }, [arenaQuestions]);

    // Extract unique topics for filtering
    const uniqueTopics = useMemo(() => {
        const topics = new Set<string>();
        
        // 1. Add from custom topics
        customTopics.forEach(t => {
            if (filterSubject && normalizeSubject(t.subject) !== normalizeSubject(filterSubject)) return;
            topics.add(t.topic.trim());
        });

        // 2. Add from all questions in DB (unpaginated)
        dbTopics.forEach(q => {
            if (filterGrade && q.grade !== filterGrade) return;
            if (filterSubject && normalizeSubject(q.subject) !== normalizeSubject(filterSubject)) return;
            topics.add(q.topic.trim());
        });

        return Array.from(topics).sort();
    }, [dbTopics, customTopics, filterGrade, filterSubject]);

    const handleGradeChange = (grade: string) => {
        setFilterGrade(grade);
        if (filterTopic && grade) {
            const hasTopicInGrade = dbTopics.some(q => q.grade === grade && q.topic === filterTopic) ||
                                     customTopics.some(t => t.topic === filterTopic);
            if (!hasTopicInGrade) {
                setFilterTopic('');
            }
        }
    };

    const handleSubjectChange = (subject: string) => {
        setFilterSubject(subject);
        if (filterTopic && subject) {
            const hasTopicInSubject = dbTopics.some(q => normalizeSubject(q.subject) === normalizeSubject(subject) && q.topic === filterTopic) ||
                                       customTopics.some(t => normalizeSubject(t.subject) === normalizeSubject(subject) && t.topic === filterTopic);
            if (!hasTopicInSubject) {
                setFilterTopic('');
            }
        }
    };

    // Extended Filter and Search logic
    const filteredQuestions = arenaQuestions.filter(q => {
        const matchesSubject = !filterSubject || normalizeSubject(q.subject) === normalizeSubject(filterSubject);
        const matchesDifficulty = !filterDifficulty || q.difficulty === filterDifficulty;
        const matchesGrade = !filterGrade || q.grade === filterGrade;
        const matchesTopic = !filterTopic || q.topic === filterTopic;
        
        const qContent = q.content || '';
        const qTopic = q.topic || '';
        const matchesSearch = !searchQuery.trim() || 
            qContent.toLowerCase().includes(searchQuery.toLowerCase()) || 
            (qTopic.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesSubject && matchesDifficulty && matchesGrade && matchesTopic && matchesSearch;
    });

    // Ngân hàng đề: gộp MCQ, MCQ_MULTIPLE, SHORT_ANSWER từ cả questionBank VÀ exams
    const bankMCQs = useMemo(() => {
        // Nguồn 1: từ bảng question_bank
        const fromBank = questionBank.filter(q =>
            q.type === 'MCQ' || q.type === 'MCQ_MULTIPLE' || q.type === 'SHORT_ANSWER'
        ).map(q => ({ ...q, _source: 'bank' as const }));

        // Nguồn 2: từ các bài tập (exams) - trích xuất câu hỏi MCQ, MCQ_MULTIPLE, SHORT_ANSWER
        const fromExams: (typeof fromBank[number])[] = [];
        const seenIds = new Set(fromBank.map(q => q.id));
        for (const exam of exams) {
            if (exam.deletedAt || !exam.questions) continue;
            for (const q of exam.questions) {
                if ((q.type === 'MCQ' || q.type === 'MCQ_MULTIPLE' || q.type === 'SHORT_ANSWER') && !seenIds.has(q.id)) {
                    seenIds.add(q.id);
                    fromExams.push({
                        ...q,
                        subject: exam.subject || '',
                        grade: exam.grade || '',
                        _source: 'bank' as const,
                    } as any);
                }
            }
        }

        const all = [...fromBank, ...fromExams];
        // Lọc theo môn nếu có
        if (bankFilterSubject) {
            return all.filter(q => q.subject === bankFilterSubject);
        }
        return all;
    }, [questionBank, exams, bankFilterSubject]);

    const subjectMap: Record<string, string> = {
        'Toán': 'math', 'Khoa học': 'science', 'Công nghệ': 'technology',
        'Tiếng Việt': 'vietnamese', 'Tiếng Anh': 'english', 'Tin học': 'technology',
        'Lịch sử và Địa lí': 'history_geography'
    };

    const levelToDifficulty = (level?: string) => {
        if (level === 'NHAN_BIET') return 1;
        if (level === 'KET_NOI') return 2;
        return 3;
    };

    const handleBankImport = async () => {
        if (bankSelectedIds.size === 0) return;
        setImporting(true);
        const selected = bankMCQs.filter(q => bankSelectedIds.has(q.id));
        const converted: Omit<ArenaQuestion, 'id'>[] = selected.map(q => ({
            content: q.content,
            answers: q.type === 'SHORT_ANSWER' ? [] : q.options?.slice(0, 4) || [],
            correct_index: q.correctOptionIndex ?? 0,
            correct_indices: q.correctOptionIndices || [],
            correct_answer_string: q.type === 'SHORT_ANSWER' 
                ? (q.options && q.options.length > 0 ? q.options[0] : (q.solution || ''))
                : '',
            difficulty: levelToDifficulty(q.level),
            subject: subjectMap[q.subject] || 'math',
            topic: q.topic || 'general',
            time_limit_seconds: 30,
            xp_reward: 10,
            type: q.type as any || 'MCQ'
        }));
        const count = await bulkAddArenaQuestions(converted);
        setImportResult({ count, skipped: converted.length - count });
        setImporting(false);
        setBankSelectedIds(new Set());
    };

    const toggleBankSelect = (id: string) => {
        setBankSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAllBank = () => {
        if (bankSelectedIds.size === bankMCQs.length) {
            setBankSelectedIds(new Set());
        } else {
            setBankSelectedIds(new Set(bankMCQs.map(q => q.id)));
        }
    };

    // Export CSV function supporting UTF-8 BOM and type options
    const handleExportCSV = () => {
        const headers = ['Câu hỏi', 'Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D', 'Đáp án đúng (A/B/C/D)', 'Độ khó (1-3)', 'Môn (math/science/technology/vietnamese/english)', 'Chủ đề', 'Thời gian làm bài (giây)', 'XP thưởng', 'Loại (MCQ/MCQ_MULTIPLE/SHORT_ANSWER)', 'Các đáp án đúng (tách nhau bằng dấu gạch ngang dọc VD: 0|2 cho A và C)', 'Chuỗi đáp án điền từ'];
        
        const rows = filteredQuestions.map(q => {
            const correctLetter = q.type === 'MCQ' ? String.fromCharCode(65 + (q.correct_index ?? 0)) : '';
            const correctIndicesStr = q.type === 'MCQ_MULTIPLE' && q.correct_indices ? q.correct_indices.join('|') : '';
            const shortAnswerStr = q.type === 'SHORT_ANSWER' ? q.correct_answer_string || '' : '';
            return [
                `"${q.content.replace(/"/g, '""')}"`,
                `"${(q.answers?.[0] || '').replace(/"/g, '""')}"`,
                `"${(q.answers?.[1] || '').replace(/"/g, '""')}"`,
                `"${(q.answers?.[2] || '').replace(/"/g, '""')}"`,
                `"${(q.answers?.[3] || '').replace(/"/g, '""')}"`,
                correctLetter,
                q.difficulty,
                q.subject,
                `"${(q.topic || 'general').replace(/"/g, '""')}"`,
                q.time_limit_seconds || 30,
                q.xp_reward || 10,
                q.type || 'MCQ',
                `"${correctIndicesStr}"`,
                `"${shortAnswerStr.replace(/"/g, '""')}"`
            ];
        });

        const csvContent = "\ufeff" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `ngan_hang_dau_tri_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // AI Generate handler with Preview transition
    const handleAiGenerate = async () => {
        if (!aiGenTopic.trim()) return;
        setAiGenerating(true);
        try {
            const subjectLabel = SUBJECTS.find(s => s.value === aiGenSubject)?.label || 'Toán';
            const diffLabel = aiGenDifficulty === 1 ? 'Mức 1 (Nhận biết)' : aiGenDifficulty === 2 ? 'Mức 2 (Kết nối)' : 'Mức 3 (Vận dụng)';
            
            // Generates questions using Gemini
            const questions = await generateQuestionsByTopic(
                `${subjectLabel}: ${aiGenTopic}`,
                '5', 'MCQ', diffLabel, aiGenCount,
                'Tạo câu hỏi cho trò chơi Đấu Trí, ngắn gọn, rõ ràng, hấp dẫn.'
            );
            // Convert to ArenaQuestion list
            const converted: Omit<ArenaQuestion, 'id'>[] = questions.map(q => ({
                content: q.content,
                answers: q.options.slice(0, 4),
                correct_index: q.correctOptionIndex ?? 0,
                difficulty: aiGenDifficulty,
                subject: aiGenSubject,
                topic: aiGenTopic.trim(),
                time_limit_seconds: aiGenDifficulty === 3 ? 45 : aiGenDifficulty === 2 ? 30 : 20,
                xp_reward: aiGenDifficulty === 3 ? 20 : aiGenDifficulty === 2 ? 15 : 10,
                type: 'MCQ'
            }));
            
            setAiPreviewList(converted);
            setShowAiGen(false);
            setShowAiPreviewModal(true);
            setImportResult(null);
        } catch (e: any) {
            alert('Lỗi AI: ' + (e.message || 'Không thể tạo câu hỏi.'));
        } finally {
            setAiGenerating(false);
        }
    };

    // AI Preview Modal Actions
    const handleSaveAiPreview = async () => {
        if (aiPreviewList.length === 0) return;
        setImporting(true);
        try {
            const count = await bulkAddArenaQuestions(aiPreviewList);
            setImportResult({ count, skipped: aiPreviewList.length - count });
            setAiPreviewList([]);
            setShowAiPreviewModal(false);
            await fetchArenaQuestions();
        } catch (err: any) {
            console.error("Lỗi khi lưu câu hỏi từ AI:", err);
            alert(`Lỗi khi lưu câu hỏi: ${err.message || err}`);
        } finally {
            setImporting(false);
        }
    };

    const handleDownloadDocxTemplate = () => {
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "FILE MẪU SOẠN ĐỀ ĐẤU TRÍ (.DOCX)",
                                bold: true,
                                size: 28,
                                color: "4F46E5"
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 300 }
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Môn: Toán\nLớp: 4\nChủ đề: Phân số & Số thập phân\n\n",
                                bold: true,
                                size: 24
                            })
                        ],
                        spacing: { after: 200 }
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Câu 1: Phân số 3/4 viết dưới dạng số thập phân là bao nhiêu? (Chú ý: Có thể viết phân số kiểu thường '3/4' hoặc dùng LaTeX '$\\frac{3}{4}$', hệ thống đều tự động hiển thị đẹp dạng dọc)\nA. 0,75\nB. 0,5\nC. 0,25\nD. 0,8\nĐáp án: A\nĐộ khó: 1\nThời gian: 30\nXP: 10\nHướng dẫn: Ta lấy tử số chia cho mẫu số.\nLời giải chi tiết: Bước 1: Thực hiện phép chia 3 : 4.\nBước 2: Kết quả thu được là 0,75.\nChọn đáp án A.\n\n",
                                size: 22
                            })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Câu 2: Chọn các số nguyên tố nhỏ hơn 10.\nA. 2\nB. 4\nC. 7\nD. 9\nĐáp án: A, C\nĐộ khó: 2\nThời gian: 30\nXP: 15\nLoại: MCQ_MULTIPLE\nHướng dẫn: Số nguyên tố chỉ chia hết cho 1 và chính nó.\nLời giải chi tiết: Các số 2 và 7 chỉ chia hết cho 1 và chính nó nên là số nguyên tố. Số 4 chia hết cho 2; số 9 chia hết cho 3 nên không phải.\nChọn đáp án A và C.\n\n",
                                size: 22
                            })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Câu 3: Thủ đô của Việt Nam là thành phố nào?\nĐáp án: Hà Nội|Thành phố Hà Nội\nĐộ khó: 1\nThời gian: 30\nXP: 10\nLoại: SHORT_ANSWER\nHướng dẫn: Đây là thành phố nằm ở đồng bằng sông Hồng, có bề dày lịch sử ngàn năm văn hiến.\nLời giải chi tiết: Thủ đô chính thức của Việt Nam là thành phố Hà Nội.\n",
                                size: 22
                            })
                        ]
                    })
                ]
            }]
        });

        Packer.toBlob(doc).then(blob => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', 'arena_questions_template.docx');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    };

    const handleWordFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAiScanFileLoading(true);
        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const arrayBuffer = event.target?.result as ArrayBuffer;
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    setAiScanText(prev => (prev ? prev + '\n' : '') + result.value);
                } catch (err) {
                    console.error("Lỗi đọc file Word:", err);
                    alert("Không thể giải nén file Word. Vui lòng kiểm tra lại định dạng file.");
                } finally {
                    setAiScanFileLoading(false);
                }
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            console.error("Lỗi FileReader:", error);
            setAiScanFileLoading(false);
        }
    };

    const parseQuestionsFromRawText = (rawText: string) => {
        const lines = rawText.split('\n').map(l => l.trim());
        const questions: Omit<ArenaQuestion, 'id'>[] = [];
        const errors: string[] = [];
        const validQuestions: Omit<ArenaQuestion, 'id'>[] = [];
        const invalidQuestions: { q: any, index: number, errors: string[] }[] = [];
        const globalLines: string[] = [];

        let currentSubject = 'math';
        let currentTopic = 'general';
        let currentGrade = filterGrade || '4';
        let currentQuestion: any = null;
        let questionCounter = 0;

        const subjectMapping: Record<string, string> = {
            'toán': 'math',
            'khoa học': 'science',
            'công nghệ': 'technology',
            'tiếng việt': 'vietnamese',
            'tiếng anh': 'english',
            'lịch sử và địa lí': 'history_geography',
            'lịch sử & địa lí': 'history_geography',
            'lịch sử': 'history_geography',
            'địa lí': 'history_geography'
        };

        const cleanDivision = (text: string, subject: string): string => {
            if (!text) return '';
            if (subject === 'math') {
                let processed = text.replace(/÷/g, ':').replace(/\\div/g, ':');
                // Replace plain fractions (e.g. 3/4) with LaTeX equivalent ($\frac{3}{4}$)
                processed = processed.replace(/(?<![\d/])(\d+)\/(\d+)(?![\d/])/g, '$\\frac{$1}{$2}$');
                return processed;
            }
            return text;
        };

        const validateAndPushQuestionLocal = (
            q: any,
            index: number,
            questionsList: Omit<ArenaQuestion, 'id'>[],
            errorsList: string[]
        ) => {
            // Deferred parsing of raw_answer
            if (q.raw_answer !== undefined && q.raw_answer !== null && q.raw_answer.trim() !== '') {
                const rawAns = q.raw_answer.trim();
                const ansVal = cleanDivision(rawAns, q.subject);

                // Auto-detect question type if not explicitly set
                if (!q.has_explicit_type) {
                    const hasOptions = q.answers && q.answers.filter(Boolean).length > 0;
                    if (!hasOptions) {
                        q.type = 'SHORT_ANSWER';
                    } else {
                        const isOptionList = /^[A-D\s,|]+$/i.test(rawAns);
                        if (!isOptionList) {
                            q.type = 'SHORT_ANSWER';
                        } else {
                            const chars = rawAns.toUpperCase().replace(/[^A-D]/g, '').split('');
                            if (chars.length > 1) {
                                q.type = 'MCQ_MULTIPLE';
                            } else {
                                q.type = 'MCQ';
                            }
                        }
                    }
                }

                // Actually parse and assign answer fields based on resolved type
                if (q.type === 'SHORT_ANSWER') {
                    q.correct_answer_string = ansVal;
                } else {
                    const chars = rawAns.toUpperCase().replace(/[^A-D]/g, '').split('');
                    if (chars.length > 1) {
                        q.type = 'MCQ_MULTIPLE';
                        q.correct_indices = chars.map((c: string) => c.charCodeAt(0) - 65).sort();
                    } else if (chars.length === 1) {
                        q.type = 'MCQ';
                        q.correct_index = chars[0].charCodeAt(0) - 65;
                    } else {
                        q.correct_answer_string = ansVal;
                    }
                }
            }

            if (q.answers.length > 0 && q.type === 'MCQ' && q.correct_indices && q.correct_indices.length > 1) {
                q.type = 'MCQ_MULTIPLE';
            }
            if (q.answers.length === 0 && q.correct_answer_string) {
                q.type = 'SHORT_ANSWER';
            }

            const qErrors: string[] = [];

            if (!q.content.trim()) {
                qErrors.push(`Câu ${index}: Thân câu hỏi không được trống.`);
                errorsList.push(`Câu ${index}: Thân câu hỏi không được trống.`);
                return;
            }

            if (q.type === 'SHORT_ANSWER') {
                if (!q.correct_answer_string.trim()) {
                    qErrors.push(`Câu ${index}: Dạng Điền từ (SHORT_ANSWER) yêu cầu nhập đáp án đúng.`);
                }
            } else {
                if (q.answers.length < 4) {
                    qErrors.push(`Câu ${index}: Dạng Trắc nghiệm yêu cầu nhập đầy đủ 4 tùy chọn A, B, C, D.`);
                }
                if (q.type === 'MCQ') {
                    if (q.correct_index === undefined || q.correct_index < 0 || q.correct_index > 3) {
                        qErrors.push(`Câu ${index}: Dạng Trắc nghiệm 1 đáp án yêu cầu chỉ định đáp án đúng hợp lệ (A, B, C hoặc D).`);
                    }
                } else {
                    if (!q.correct_indices || q.correct_indices.length === 0) {
                        qErrors.push(`Câu ${index}: Dạng Trắc nghiệm nhiều đáp án yêu cầu chỉ định ít nhất 1 đáp án đúng (ví dụ: A, C).`);
                    }
                }
            }

            if (qErrors.length > 0) {
                errorsList.push(...qErrors);
                invalidQuestions.push({ q, index, errors: qErrors });
            } else {
                validQuestions.push(q);
            }

            questionsList.push(q);
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line) continue;

            if (!currentQuestion) {
                if (!line.match(/^Câu\s+(\d+)\s*[:.-]?\s*(.*)$/i)) {
                    globalLines.push(line);
                }
            }

            if (line.toLowerCase().startsWith('môn:')) {
                const subStr = line.substring(4).trim();
                const normalizedSubStr = subStr.toLowerCase();
                
                // Extract grade number if present (e.g. "Toán 3", "Toán lớp 3", "Khoa học khối 4")
                const gradeMatch = normalizedSubStr.match(/(?:lớp|khối)?\s*([1-5])/);
                if (gradeMatch) {
                    currentGrade = gradeMatch[1];
                    if (currentQuestion) {
                        currentQuestion.grade = gradeMatch[1];
                    }
                }
                
                // Clean grade details out to get the base subject name (e.g. "toán 3" -> "toán")
                const baseSubStr = normalizedSubStr
                    .replace(/(?:lớp|khối)?\s*[1-5]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
                
                const matched = subjectMapping[baseSubStr];
                if (matched) {
                    currentSubject = matched;
                    if (currentQuestion) {
                        currentQuestion.subject = matched;
                    }
                } else {
                    errors.push(`Dòng ${i + 1}: Không nhận diện được môn "${subStr}". Hệ thống tự động đặt là Toán.`);
                }
                continue;
            }

            if (line.toLowerCase().startsWith('chủ đề:')) {
                currentTopic = line.substring(7).trim();
                if (currentQuestion) {
                    currentQuestion.topic = currentTopic;
                }
                continue;
            }

            if (line.toLowerCase().startsWith('lớp:') || line.toLowerCase().startsWith('khối lớp:')) {
                const prefixLength = line.toLowerCase().startsWith('lớp:') ? 4 : 9;
                const gradeVal = line.substring(prefixLength).replace(/[^0-9]/g, '').trim();
                if (gradeVal) {
                    currentGrade = gradeVal;
                    if (currentQuestion) {
                        currentQuestion.grade = gradeVal;
                    }
                }
                continue;
            }

            const matchQuestion = line.match(/^Câu\s+(\d+)\s*[:.-]?\s*(.*)$/i);
            if (matchQuestion) {
                if (currentQuestion) {
                    validateAndPushQuestionLocal(currentQuestion, questionCounter, questions, errors);
                }

                questionCounter++;
                const questionContent = matchQuestion[2].trim();
                currentQuestion = {
                    content: cleanDivision(questionContent, currentSubject),
                    answers: [],
                    correct_index: 0,
                    correct_indices: [],
                    correct_answer_string: '',
                    difficulty: 1,
                    subject: currentSubject,
                    topic: currentTopic || 'general',
                    grade: currentGrade,
                    time_limit_seconds: 30,
                    xp_reward: 10,
                    type: 'MCQ',
                    guide: '',
                    explanation: '',
                    raw_answer: '',
                    has_explicit_type: false,
                    raw_lines: [line]
                };
                continue;
            }

            if (!currentQuestion) continue;
            currentQuestion.raw_lines.push(line);

            const matchOption = line.match(/^([A-D])\s*[:.-]\s*(.*)$/i);
            if (matchOption) {
                const optionIndex = matchOption[1].toUpperCase().charCodeAt(0) - 65;
                const optionText = cleanDivision(matchOption[2].trim(), currentQuestion.subject);
                currentQuestion.answers[optionIndex] = optionText;
                continue;
            }

            if (line.toLowerCase().startsWith('đáp án đúng:') || line.toLowerCase().startsWith('đáp án:')) {
                const prefixLength = line.toLowerCase().startsWith('đáp án đúng:') ? 12 : 7;
                currentQuestion.raw_answer = line.substring(prefixLength).trim();
                continue;
            }

            if (line.toLowerCase().startsWith('độ khó:')) {
                const val = parseInt(line.substring(7).replace(/[^0-9]/g, ''));
                if (!isNaN(val) && val >= 1 && val <= 4) {
                    currentQuestion.difficulty = val;
                } else {
                    errors.push(`Câu ${questionCounter}: Độ khó "${line.substring(7)}" không hợp lệ. Phải là số từ 1 đến 4.`);
                }
                continue;
            }

            if (line.toLowerCase().startsWith('thời gian:')) {
                const val = parseInt(line.substring(10).replace(/[^0-9]/g, ''));
                if (!isNaN(val)) {
                    currentQuestion.time_limit_seconds = val;
                }
                continue;
            }

            if (line.toLowerCase().startsWith('xp:')) {
                const val = parseInt(line.substring(3).replace(/[^0-9]/g, ''));
                if (!isNaN(val)) {
                    currentQuestion.xp_reward = val;
                }
                continue;
            }

            if (line.toLowerCase().startsWith('loại:') || line.toLowerCase().startsWith('dạng câu hỏi:') || line.toLowerCase().startsWith('dạng:')) {
                let valStr = '';
                if (line.toLowerCase().startsWith('loại:')) valStr = line.substring(5).trim();
                else if (line.toLowerCase().startsWith('dạng câu hỏi:')) valStr = line.substring(13).trim();
                else valStr = line.substring(5).trim();

                const normalizedVal = valStr.toUpperCase();
                if (normalizedVal === 'SHORT_ANSWER' || normalizedVal.includes('TỰ LUẬN') || normalizedVal.includes('ĐIỀN KHUYẾT')) {
                    currentQuestion.type = 'SHORT_ANSWER';
                    currentQuestion.has_explicit_type = true;
                } else if (normalizedVal === 'MCQ_MULTIPLE' || normalizedVal.includes('NHIỀU ĐÁP ÁN') || normalizedVal.includes('CHỌN NHIỀU')) {
                    currentQuestion.type = 'MCQ_MULTIPLE';
                    currentQuestion.has_explicit_type = true;
                } else if (normalizedVal === 'MCQ' || normalizedVal.includes('TRẮC NGHIỆM') || normalizedVal.includes('1 ĐÁP ÁN')) {
                    currentQuestion.type = 'MCQ';
                    currentQuestion.has_explicit_type = true;
                }
                continue;
            }

            if (line.toLowerCase().startsWith('hướng dẫn:') || line.toLowerCase().startsWith('gợi ý:') || line.toLowerCase().startsWith('gợi ý:')) {
                const prefixLength = line.toLowerCase().startsWith('hướng dẫn:') ? 10 : 6;
                const text = line.substring(prefixLength).trim();
                
                const expIndex = text.toLowerCase().indexOf('lời giải chi tiết:');
                const expIndex2 = text.toLowerCase().indexOf('lời giải:');
                
                if (expIndex !== -1) {
                    currentQuestion.guide = text.substring(0, expIndex).trim();
                    const newExp = text.substring(expIndex + 18).trim();
                    currentQuestion.explanation = currentQuestion.explanation 
                        ? currentQuestion.explanation + '\n' + newExp 
                        : newExp;
                } else if (expIndex2 !== -1) {
                    currentQuestion.guide = text.substring(0, expIndex2).trim();
                    const newExp = text.substring(expIndex2 + 9).trim();
                    currentQuestion.explanation = currentQuestion.explanation 
                        ? currentQuestion.explanation + '\n' + newExp 
                        : newExp;
                } else {
                    currentQuestion.guide = text;
                }
                continue;
            }

            if (line.toLowerCase().startsWith('lời giải chi tiết:')) {
                const newExp = line.substring(18).trim();
                currentQuestion.explanation = currentQuestion.explanation 
                    ? currentQuestion.explanation + '\n' + newExp 
                    : newExp;
                continue;
            }

            if (line.toLowerCase().startsWith('lời giải:')) {
                const newExp = line.substring(9).trim();
                currentQuestion.explanation = currentQuestion.explanation 
                    ? currentQuestion.explanation + '\n' + newExp 
                    : newExp;
                continue;
            }

            // If it's a normal line that starts with 'lời giải chi tiết:' or 'lời giải:' case-insensitively, we process it.
            // Some docx text lines might contain special Unicode formatting or non-breaking spaces, so we check using substring.
            const cleanLine = line.toLowerCase();
            if (cleanLine.startsWith('lời giải chi tiết:')) {
                const newExp = line.substring(18).trim();
                currentQuestion.explanation = currentQuestion.explanation 
                    ? currentQuestion.explanation + '\n' + newExp 
                    : newExp;
                continue;
            }
            if (cleanLine.startsWith('lời giải:')) {
                const newExp = line.substring(9).trim();
                currentQuestion.explanation = currentQuestion.explanation 
                    ? currentQuestion.explanation + '\n' + newExp 
                    : newExp;
                continue;
            }
            if (cleanLine.startsWith('gợi ý:') || cleanLine.startsWith('gợi ý:')) {
                const text = line.substring(6).trim();
                const expIndex = text.toLowerCase().indexOf('lời giải chi tiết:');
                const expIndex2 = text.toLowerCase().indexOf('lời giải:');
                
                if (expIndex !== -1) {
                    currentQuestion.guide = text.substring(0, expIndex).trim();
                    const newExp = text.substring(expIndex + 18).trim();
                    currentQuestion.explanation = currentQuestion.explanation 
                        ? currentQuestion.explanation + '\n' + newExp 
                        : newExp;
                } else if (expIndex2 !== -1) {
                    currentQuestion.guide = text.substring(0, expIndex2).trim();
                    const newExp = text.substring(expIndex2 + 9).trim();
                    currentQuestion.explanation = currentQuestion.explanation 
                        ? currentQuestion.explanation + '\n' + newExp 
                        : newExp;
                } else {
                    currentQuestion.guide = text;
                }
                continue;
            }

            const isKeywordLine = 
                line.toLowerCase().startsWith('môn:') ||
                line.toLowerCase().startsWith('chủ đề:') ||
                line.toLowerCase().startsWith('lớp:') ||
                line.toLowerCase().startsWith('khối lớp:') ||
                line.toLowerCase().startsWith('đáp án đúng:') ||
                line.toLowerCase().startsWith('đáp án:') ||
                line.toLowerCase().startsWith('độ khó:') ||
                line.toLowerCase().startsWith('thời gian:') ||
                line.toLowerCase().startsWith('xp:') ||
                line.toLowerCase().startsWith('loại:') ||
                line.toLowerCase().startsWith('hướng dẫn:') ||
                line.toLowerCase().startsWith('gợi ý:') ||
                line.toLowerCase().startsWith('gợi ý:') ||
                line.toLowerCase().startsWith('lời giải chi tiết:') ||
                line.toLowerCase().startsWith('lời giải:');

            if (!line.match(/^[A-D]\s*[:.-]/i) && !isKeywordLine) {
                currentQuestion.content += '\n' + cleanDivision(line, currentQuestion.subject);
            }
        }

        if (currentQuestion) {
            validateAndPushQuestionLocal(currentQuestion, questionCounter, questions, errors);
        }

        return { questions, errors, validQuestions, invalidQuestions, globalLines };
    };

    const handleStartDeterministicScan = () => {
        if (!aiScanText.trim()) {
            alert("Vui lòng nhập văn bản đề thi hoặc chọn file Word trước.");
            return;
        }
        setAiScanning(true);
        try {
            const { questions, errors, validQuestions, invalidQuestions, globalLines } = parseQuestionsFromRawText(aiScanText);
            if (errors.length > 0) {
                setImportErrors(errors);
                setImportPreview([]);
                setValidParsedQuestions(validQuestions);

                // Reconstruct invalid questions text with global lines kept at the top
                const header = globalLines.join('\n');
                const body = invalidQuestions.map(iq => iq.q.raw_lines.join('\n')).join('\n\n');
                const remainingText = header ? header + '\n\n' + body : body;
                setInvalidQuestionsText(remainingText);

                alert(`⚠️ Phát hiện ${errors.length} lỗi định dạng cú pháp câu hỏi. Bạn có thể nhấn nút xanh ở góc dưới bên trái để chỉ đẩy ${validQuestions.length} câu đúng lên hệ thống, hoặc sửa trực tiếp trong khung soạn đề.`);
            } else if (questions.length === 0) {
                alert("Không phát hiện câu hỏi nào đúng định dạng (Câu 1: ...) trong tài liệu của bạn.");
                setValidParsedQuestions([]);
                setInvalidQuestionsText('');
            } else {
                setImportErrors([]);
                setValidParsedQuestions([]);
                setInvalidQuestionsText('');
                setAiPreviewList(questions);
                setShowAiScan(false);
                setShowAiPreviewModal(true);
                setAiScanText('');
            }
        } catch (error: any) {
            console.error("Lỗi bóc tách đề:", error);
            alert("Đã xảy ra lỗi không xác định khi bóc tách đề.");
        } finally {
            setAiScanning(false);
        }
    };

    const handleImportOnlyValid = async () => {
        if (validParsedQuestions.length === 0) return;
        setImporting(true);
        try {
            const count = await bulkAddArenaQuestions(validParsedQuestions);
            alert(`📥 Đã thêm thành công ${count} câu hỏi hợp lệ vào Đấu Trí${validParsedQuestions.length - count > 0 ? ` (đã bỏ qua ${validParsedQuestions.length - count} câu trùng lặp)` : ''}.`);
            
            // Reconstruct text to keep only invalid questions for correction
            setAiScanText(invalidQuestionsText);
            
            // Clear lists
            setValidParsedQuestions([]);
            setImportErrors([]);
            await fetchArenaQuestions();
        } catch (error: any) {
            console.error("Lỗi import câu hỏi đúng:", error);
            alert("Lỗi khi thêm câu hỏi: " + (error.message || error));
        } finally {
            setImporting(false);
        }
    };

    const handleRemovePreviewItem = (index: number) => {
        setAiPreviewList(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleStartEditPreviewItem = (index: number) => {
        const item = aiPreviewList[index];
        setFormContent(item.content);
        setFormAnswers(item.answers ? [...item.answers] : ['', '', '', '']);
        setFormCorrect(item.correct_index ?? 0);
        setFormCorrectIndices(item.correct_indices ? [...item.correct_indices] : []);
        setFormCorrectAnswerString(item.correct_answer_string || '');
        setFormType(item.type || 'MCQ');
        setFormDifficulty(item.difficulty);
        setFormSubject(item.subject);
        setFormTopic(item.topic || '');
        setFormGrade(item.grade || '4');
        setFormTimeLimit(item.time_limit_seconds || 30);
        setFormXpReward(item.xp_reward || 10);
        setFormGuide(item.guide || '');
        setFormExplanation(item.explanation || '');
        setFormCaseSensitive(item.case_sensitive || false);
        setEditingPreviewIndex(index);
    };

    const handleSavePreviewItem = () => {
        if (editingPreviewIndex === null) return;
        setAiPreviewList(prev => {
            const next = [...prev];
            next[editingPreviewIndex] = {
                content: formContent.trim(),
                answers: formType !== 'SHORT_ANSWER' ? formAnswers : [],
                correct_index: formType === 'MCQ' ? formCorrect : 0,
                correct_indices: formType === 'MCQ_MULTIPLE' ? formCorrectIndices : [],
                correct_answer_string: formType === 'SHORT_ANSWER' ? formCorrectAnswerString.trim() : '',
                case_sensitive: formType === 'SHORT_ANSWER' ? formCaseSensitive : false,
                difficulty: formDifficulty,
                subject: formSubject,
                topic: formTopic.trim() || 'general',
                grade: formGrade,
                time_limit_seconds: formTimeLimit,
                xp_reward: formXpReward,
                type: formType,
                guide: formGuide.trim(),
                explanation: formExplanation.trim()
            };
            return next;
        });
        setEditingPreviewIndex(null);
    };

    const openNew = () => {
        setIsNew(true);
        setFormContent('');
        setFormAnswers(['', '', '', '']);
        setFormCorrect(0);
        setFormCorrectIndices([]);
        setFormCorrectAnswerString('');
        setFormType('MCQ');
        setFormDifficulty(1);
        setFormSubject('math');
        setFormTopic('');
        setFormTimeLimit(30);
        setFormXpReward(10);
        setFormGrade(filterGrade || '4');
        setFormGuide('');
        setFormExplanation('');
        setFormCaseSensitive(false);
        setEditing({} as ArenaQuestion);
    };

    const openEdit = (q: ArenaQuestion) => {
        setIsNew(false);
        setFormContent(q.content);
        setFormAnswers(q.answers && q.answers.length > 0 ? [...q.answers] : ['', '', '', '']);
        setFormCorrect(q.correct_index ?? 0);
        setFormCorrectIndices(q.correct_indices ? [...q.correct_indices] : []);
        setFormCorrectAnswerString(q.correct_answer_string || '');
        setFormType(q.type || 'MCQ');
        setFormDifficulty(q.difficulty);
        setFormSubject(q.subject);
        setFormTopic(q.topic || '');
        setFormTimeLimit(q.time_limit_seconds || 30);
        setFormXpReward(q.xp_reward || 10);
        setFormGrade(q.grade || '4');
        setFormGuide(q.guide || '');
        setFormExplanation(q.explanation || '');
        setFormCaseSensitive(q.case_sensitive || false);
        setEditing(q);
    };

    const handleSave = async () => {
        if (!formContent.trim()) return;
        if (formType !== 'SHORT_ANSWER' && formAnswers.some(a => !a.trim())) return;
        if (formType === 'SHORT_ANSWER' && !formCorrectAnswerString.trim()) return;

        const payload: any = {
            content: formContent.trim(),
            difficulty: formDifficulty,
            subject: formSubject,
            topic: formTopic.trim() || 'general',
            grade: formGrade,
            time_limit_seconds: formTimeLimit,
            xp_reward: formXpReward,
            type: formType,
            correct_index: formType === 'MCQ' ? formCorrect : 0,
            correct_indices: formType === 'MCQ_MULTIPLE' ? formCorrectIndices : null,
            correct_answer_string: formType === 'SHORT_ANSWER' ? formCorrectAnswerString.trim() : null,
            case_sensitive: formType === 'SHORT_ANSWER' ? formCaseSensitive : false,
            answers: formType !== 'SHORT_ANSWER' ? formAnswers : [],
            guide: formGuide.trim(),
            explanation: formExplanation.trim()
        };

        if (isNew) {
            await addArenaQuestion(payload);
        } else if (editing) {
            await updateArenaQuestion({
                ...editing,
                ...payload
            });
        }
        setEditing(null);
    };

    const handleDelete = async (id: string) => {
        await deleteArenaQuestion(id);
        setDeleteConfirm(null);
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAll = (visibleQuestions: ArenaQuestion[]) => {
        if (selectedIds.size === visibleQuestions.length && visibleQuestions.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(visibleQuestions.map(q => q.id)));
        }
    };

    const handleBulkDelete = async () => {
        const ids = Array.from(selectedIds);
        await bulkDeleteArenaQuestions(ids);
        setSelectedIds(new Set());
        setBulkDeleteConfirm(false);
    };

    const handleToggleCorrectIndex = (idx: number) => {
        setFormCorrectIndices(prev => {
            if (prev.includes(idx)) {
                return prev.filter(i => i !== idx);
            } else {
                return [...prev, idx].sort();
            }
        });
    };

    const handleDownloadTemplate = () => {
        const headers = [
            'Câu hỏi',
            'Đáp án A',
            'Đáp án B',
            'Đáp án C',
            'Đáp án D',
            'Đáp án đúng (A/B/C/D)',
            'Độ khó (1-4)',
            'Môn (math/science/technology/vietnamese/english/history_geography)',
            'Chủ đề',
            'Thời gian làm bài (giây)',
            'XP thưởng',
            'Loại (MCQ/MCQ_MULTIPLE/SHORT_ANSWER)',
            'Các đáp án đúng (tách nhau bằng dấu gạch ngang dọc VD: 0|2 cho A và C)',
            'Chuỗi đáp án điền từ',
            'Hướng dẫn',
            'Lời giải chi tiết'
        ];
        const sampleRows = [
            [
                'Phân số 3/4 viết dưới dạng số thập phân là bao nhiêu?',
                '0,75',
                '0,5',
                '0,25',
                '0,8',
                'A',
                '1',
                'math',
                'Phân số & Số thập phân',
                '30',
                '10',
                'MCQ',
                '',
                '',
                'Ta lấy tử số chia cho mẫu số.',
                'Bước 1: Thực hiện phép chia 3 : 4.\nBước 2: Kết quả thu được là 0,75.\nChọn đáp án A.'
            ],
            [
                'Chọn các số nguyên tố nhỏ hơn 10',
                '2',
                '4',
                '7',
                '9',
                '',
                '2',
                'math',
                'Số nguyên tố',
                '30',
                '15',
                'MCQ_MULTIPLE',
                '0|2',
                '',
                'Số nguyên tố chỉ chia hết cho 1 và chính nó.',
                'Kiểm tra: 2 và 7 là số nguyên tố; 4 chia hết cho 2; 9 chia hết cho 3.\nChọn đáp án A và C.'
            ],
            [
                'Thủ đô của Việt Nam là thành phố nào?',
                '',
                '',
                '',
                '',
                '',
                '1',
                'history_geography',
                'Địa lí Việt Nam',
                '30',
                '10',
                'SHORT_ANSWER',
                '',
                'Hà Nội|Thành phố Hà Nội',
                'Thành phố nằm ở đồng bằng sông Hồng có lịch sử ngàn năm văn hiến.',
                'Thủ đô chính thức của Việt Nam là Hà Nội.'
            ]
        ];
        
        const csvContent = [
            headers.join(','),
            ...sampleRows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'arena_questions_template.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // CSV Import parsing
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            parseCSV(text);
        };
        reader.readAsText(file, 'UTF-8');
    };

    const parseCSV = (text: string) => {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) {
            setImportErrors(['File rỗng hoặc chỉ có dòng tiêu đề']);
            return;
        }

        const questions: Omit<ArenaQuestion, 'id'>[] = [];
        const errors: string[] = [];

        // Skip header
        for (let i = 1; i < lines.length; i++) {
            const cols = parseCSVLine(lines[i]);
            if (cols.length < 7) {
                errors.push(`Dòng ${i + 1}: Thiếu cột (cần ít nhất 7, có ${cols.length})`);
                continue;
            }

            const [content, ansA, ansB, ansC, ansD, correctStr, diffStr, subject, topic, timeLimitStr, xpRewardStr, typeStr, correctIndicesStr, shortAnswerStr, guide, explanation] = cols;

            if (!content?.trim()) { errors.push(`Dòng ${i + 1}: Thiếu nội dung câu hỏi`); continue; }
            
            const type = (typeStr?.trim() || 'MCQ') as 'MCQ' | 'MCQ_MULTIPLE' | 'SHORT_ANSWER';
            
            if (type !== 'SHORT_ANSWER' && (!ansA?.trim() || !ansB?.trim() || !ansC?.trim() || !ansD?.trim())) {
                errors.push(`Dòng ${i + 1}: Thiếu đáp án lựa chọn đối với câu hỏi trắc nghiệm`); 
                continue;
            }

            let correctIndex = 0;
            let correctIndices: number[] = [];
            let correctShortAnswer = '';

            if (type === 'MCQ') {
                const correctMap: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
                correctIndex = correctMap[correctStr?.trim()] ?? 0;
            } else if (type === 'MCQ_MULTIPLE') {
                correctIndices = (correctIndicesStr || '').split('|').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
            } else if (type === 'SHORT_ANSWER') {
                correctShortAnswer = shortAnswerStr?.trim() || '';
            }

            const difficulty = parseInt(diffStr?.trim());
            if (isNaN(difficulty) || difficulty < 1 || difficulty > 4) {
                errors.push(`Dòng ${i + 1}: Độ khó phải là 1-4 (nhận "${diffStr}")`);
                continue;
            }

            const timeLimit = timeLimitStr ? parseInt(timeLimitStr.trim()) : 30;
            const xpReward = xpRewardStr ? parseInt(xpRewardStr.trim()) : 10;

            questions.push({
                content: content.trim(),
                answers: type === 'SHORT_ANSWER' ? [] : [ansA.trim(), ansB.trim(), ansC.trim(), ansD.trim()],
                correct_index: correctIndex,
                correct_indices: correctIndices,
                correct_answer_string: correctShortAnswer,
                difficulty,
                subject: normalizeSubject(subject?.trim() || 'math'),
                topic: topic?.trim() || 'general',
                time_limit_seconds: isNaN(timeLimit) ? 30 : timeLimit,
                xp_reward: isNaN(xpReward) ? 10 : xpReward,
                type,
                guide: guide?.trim() || '',
                explanation: explanation?.trim() || ''
            });
        }

        setImportPreview(questions);
        setImportErrors(errors);
    };

    const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    };

    const handleImport = async () => {
        if (importPreview.length === 0) return;
        setImporting(true);
        const count = await bulkAddArenaQuestions(importPreview);
        setImportResult({ count, skipped: importPreview.length - count });
        setImporting(false);
        setImportPreview([]);
        await fetchArenaQuestions();
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mx-auto mb-4" />
                    <p className="mt-4 text-gray-500 font-medium">Đang tải câu hỏi...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/arena')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                            <Brain className="h-7 w-7 text-indigo-500" /> Ngân Hàng Bài Tập Đấu Trí
                        </h1>
                        <p className="text-sm text-gray-500 font-medium mt-0.5">Soạn thảo, quản lý và tổ chức kho tài nguyên đấu trí đỉnh cao.</p>
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setShowAiGen(true)} className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold text-sm hover:shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
                        <Sparkles className="h-4 w-4" /> AI Tạo
                    </button>
                    <button onClick={() => { setShowAiScan(true); setAiScanText(''); }} className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-bold text-sm hover:shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
                        <FileText className="h-4 w-4" /> Nhập từ Word / Văn bản
                    </button>
                    <button onClick={() => { setShowBankImport(true); setImportResult(null); }} className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-sm hover:bg-indigo-100 flex items-center gap-2 transition-colors">
                        <BookOpen className="h-4 w-4" /> Lấy từ Ngân hàng đề
                    </button>
                    <button onClick={() => setShowImport(true)} className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-sm hover:bg-emerald-100 flex items-center gap-2 transition-colors">
                        <Upload className="h-4 w-4" /> Nhập CSV
                    </button>
                    <button onClick={handleExportCSV} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-100 flex items-center gap-2 transition-colors">
                        <Download className="h-4 w-4" /> Xuất CSV
                    </button>
                    <button onClick={openNew} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 flex items-center gap-2 shadow-md shadow-indigo-100 hover:scale-105 active:scale-95 transition-all">
                        <Plus className="h-4 w-4" /> Thêm câu hỏi
                    </button>
                    <button onClick={() => navigate('/arena/tournament/host')} className="px-4 py-2 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 flex items-center gap-2 shadow-md transition-all hover:scale-105">
                        <Trophy className="h-4 w-4" /> Tổ chức Giải đấu
                    </button>
                    <button onClick={() => setShowTopicManager(true)} className="px-4 py-2 bg-purple-50 text-purple-700 rounded-xl font-bold text-sm hover:bg-purple-100 flex items-center gap-2 transition-colors">
                        <BookOpen className="h-4 w-4" /> Quản lý chuyên đề
                    </button>
                    {selectedIds.size > 0 && (
                        <button
                            onClick={() => setBulkDeleteConfirm(true)}
                            className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 flex items-center gap-2 shadow-md animate-in slide-in-from-right"
                        >
                            <Trash2 className="h-4 w-4" /> Xoá đã chọn ({selectedIds.size})
                        </button>
                    )}
                </div>
            </div>

            {/* B2: Thống kê nhanh */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
                <div className="bg-white rounded-2xl border p-4 shadow-sm text-center">
                    <div className="text-3xl font-black text-indigo-600">{arenaTotalCount}</div>
                    <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Tổng câu hỏi</div>
                </div>
                {DIFFICULTIES.map(d => {
                    const count = arenaDifficultyCounts[d.value] || 0;
                    const colors = ['', 'text-emerald-600', 'text-amber-600', 'text-orange-600', 'text-red-600'];
                    const bgColors = ['', 'bg-emerald-50/55', 'bg-amber-50/55', 'bg-orange-50/55', 'bg-red-50/55'];
                    return (
                        <div key={d.value} className={`bg-white rounded-2xl border p-4 shadow-sm text-center transition-all ${bgColors[d.value]}`}>
                            <div className={`text-3xl font-black ${colors[d.value]}`}>{count}</div>
                            <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">{d.label}</div>
                        </div>
                    );
                })}
            </div>

            {/* Filters & Keyword Search Bar */}
            <div className="flex flex-col gap-4 mb-6 bg-white rounded-2xl border p-5 shadow-sm">
                {/* Search Input - Full Width */}
                <div className="relative w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input 
                        type="text"
                        placeholder="Tìm kiếm theo từ khoá câu hỏi hoặc chủ đề..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-10 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 bg-gray-50/30 hover:bg-gray-50/60 transition-all font-medium"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-200 transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-2.5 border-t pt-4 border-gray-100">
                    <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200/50 text-gray-500 text-[10px] font-black uppercase tracking-wider">
                        Bộ lọc
                    </div>

                    <select value={filterSubject} onChange={e => handleSubjectChange(e.target.value)} className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-gray-700 cursor-pointer hover:border-gray-300">
                        <option value="">Tất cả môn</option>
                        {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
 
                    <select value={filterDifficulty} onChange={e => setFilterDifficulty(Number(e.target.value))} className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-gray-700 cursor-pointer hover:border-gray-300">
                        <option value={0}>Tất cả độ khó</option>
                        {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
 
                    <select value={filterGrade} onChange={e => handleGradeChange(e.target.value)} className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-gray-700 cursor-pointer hover:border-gray-300">
                        <option value="">Tất cả lớp</option>
                        {['1', '2', '3', '4', '5'].map(g => <option key={g} value={g}>Lớp {g}</option>)}
                    </select>

                    <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)} className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-gray-700 cursor-pointer hover:border-gray-300 max-w-[150px] truncate">
                        <option value="">Tất cả chủ đề</option>
                        {uniqueTopics.map(topic => <option key={topic} value={topic}>{topic}</option>)}
                    </select>

                    <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors bg-white text-xs font-bold text-gray-600 select-none">
                        <input
                            type="checkbox"
                            className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            checked={selectedIds.size === filteredQuestions.length && filteredQuestions.length > 0}
                            onChange={() => handleSelectAll(filteredQuestions)}
                        />
                        <span>Chọn tất cả</span>
                    </label>

                    <span className="text-xs font-black text-indigo-600 bg-indigo-50/80 border border-indigo-100/50 px-3.5 py-1.5 rounded-lg ml-auto">
                        Đang hiển thị {filteredQuestions.length} / {arenaFilteredCount} kết quả
                    </span>
                </div>
            </div>

            {/* Question List */}
            <div className="space-y-4">
                {filteredQuestions.map(q => (
                    <div key={q.id} className={`bg-white rounded-2xl border p-5 hover:border-indigo-200 transition-all hover:shadow-md group flex gap-4 ${selectedIds.has(q.id) ? 'border-indigo-500 bg-indigo-50/10' : ''}`}>
                        <div className="flex-shrink-0 pt-1.5">
                            <input
                                type="checkbox"
                                className="w-4.5 h-4.5 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                checked={selectedIds.has(q.id)}
                                onChange={() => toggleSelect(q.id)}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex-1">
                                    <div className="flex gap-1.5 mb-1.5 flex-wrap">
                                        <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                                            {SUBJECTS.find(s => s.value === normalizeSubject(q.subject))?.label || q.subject}
                                        </span>
                                        <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                                            {DIFFICULTIES.find(d => d.value === q.difficulty)?.label || 'N/A'}
                                        </span>
                                        {q.topic && q.topic !== 'general' && (
                                            <span className="bg-purple-50 text-purple-600 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                                                {q.topic}
                                            </span>
                                        )}
                                        {/* Display question type */}
                                        <span className="bg-pink-50 text-pink-700 px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider">
                                            {q.type === 'SHORT_ANSWER' ? '📝 Điền Từ' : q.type === 'MCQ_MULTIPLE' ? '🗂️ Chọn Nhiều' : '🔘 MCQ'}
                                        </span>
                                        <span className="bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                                            ⏱️ {q.time_limit_seconds || 30}s
                                        </span>
                                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                                            ⚡ +{q.xp_reward || 10} XP
                                        </span>
                                    </div>
                                    <MathText className="font-bold text-gray-900 text-sm md:text-base leading-relaxed" inline>{q.content}</MathText>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(q)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Sửa câu hỏi"><Pencil className="h-4.5 w-4.5" /></button>
                                    <button onClick={() => setDeleteConfirm(q.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Xóa câu hỏi"><Trash2 className="h-4.5 w-4.5" /></button>
                                </div>
                            </div>

                            {/* Render answer details dynamically by type */}
                            {q.type === 'SHORT_ANSWER' ? (
                                <div className="mt-2 bg-emerald-55/10 border border-emerald-200/50 p-3 rounded-xl max-w-md">
                                    <p className="text-xs font-black text-emerald-800 uppercase tracking-widest">Đáp án đúng điền từ:</p>
                                    <p className="text-sm font-bold text-emerald-950 mt-1 italic">"{q.correct_answer_string}"</p>
                                </div>
                            ) : q.type === 'MCQ_MULTIPLE' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                                    {q.answers?.map((a, i) => {
                                        const isCorrect = q.correct_indices?.includes(i);
                                        return (
                                            <div key={i} className={`text-xs md:text-sm px-3.5 py-2.5 rounded-xl flex items-center gap-2 border transition-all ${isCorrect ? 'bg-green-50 text-green-800 font-bold border-green-200 shadow-sm' : 'bg-gray-50 text-gray-400 border-transparent opacity-60'}`}>
                                                <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[9px] border text-white ${isCorrect ? 'bg-green-500 border-green-400' : 'bg-white border-gray-200 text-gray-400'}`}>
                                                    {String.fromCharCode(65 + i)}
                                                </span>
                                                <MathText inline>{a}</MathText>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                                    {q.answers?.map((a, i) => (
                                        <div key={i} className={`text-xs md:text-sm px-3.5 py-2.5 rounded-xl flex items-center gap-2 transition-all ${i === q.correct_index ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 shadow-sm shadow-emerald-50' : 'bg-gray-50 text-gray-600 border border-transparent'}`}>
                                            <span className="flex-shrink-0 bg-white shadow-xs rounded-md w-5 h-5 flex items-center justify-center font-bold text-[10px] uppercase border tracking-wider">
                                                {String.fromCharCode(65 + i)}
                                            </span>
                                            <MathText inline>{a}</MathText>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Render Guide and Explanation if available */}
                            {(q.guide || q.explanation) && (
                                <div className="mt-3 bg-indigo-50/20 border border-indigo-100/30 p-3 rounded-xl space-y-2 text-xs">
                                    {q.guide && (
                                        <div className="text-gray-700">
                                            <span className="font-bold text-indigo-750">💡 Hướng dẫn: </span>
                                            <MathText inline>{q.guide}</MathText>
                                        </div>
                                    )}
                                    {q.explanation && (
                                        <div className="text-gray-700">
                                            <span className="font-bold text-indigo-750">📖 Lời giải chi tiết: </span>
                                            <MathText inline>{q.explanation}</MathText>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                
                {filteredQuestions.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm">
                        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400 font-medium italic">Không tìm thấy câu hỏi đấu trí nào phù hợp với bộ lọc hiện tại.</p>
                    </div>
                )}
            </div>

            {/* Load More Button */}
            {arenaQuestionsHasMore && (
                <div className="flex justify-center mt-8">
                    <button
                        onClick={async () => {
                            setLoadingMore(true);
                            await loadMoreArenaQuestions({
                                subject: filterSubject || undefined,
                                difficulty: filterDifficulty || undefined,
                                grade: filterGrade || undefined,
                                topic: filterTopic || undefined,
                                search: searchQuery || undefined
                            });
                            setLoadingMore(false);
                        }}
                        disabled={loadingMore}
                        className="px-6 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl disabled:opacity-50 transition-all flex items-center gap-2 active:scale-95 shadow-sm"
                    >
                        {loadingMore ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang tải...</> : 'Tải thêm câu hỏi'}
                    </button>
                </div>
            )}

            {/* Bulk Delete Confirm */}
            {bulkDeleteConfirm && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setBulkDeleteConfirm(false)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
                        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Xoá {selectedIds.size} câu hỏi đã chọn?</h3>
                        <p className="text-sm text-gray-500 mb-6">Hành động này sẽ xoá vĩnh viễn các câu hỏi này và không thể hoàn tác.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setBulkDeleteConfirm(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold">Quay lại</button>
                            <button onClick={handleBulkDelete} className="flex-1 py-2 bg-red-600 text-white rounded-xl font-bold">Xác nhận xoá</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit / New Modal */}
            {editing && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
                            <h3 className="font-bold text-lg">{isNew ? '➕ Thêm Câu Hỏi Đấu Trí' : '✏️ Cấu Hình Câu Hỏi'}</h3>
                            <button onClick={() => setEditing(null)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-full transition-colors"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Question Type Selection */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Loại câu hỏi *</label>
                                <select 
                                    value={formType} 
                                    onChange={e => setFormType(e.target.value as any)}
                                    className="w-full border rounded-xl px-3 py-2.5 text-sm font-bold text-indigo-700 bg-indigo-50/50 cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="MCQ">🔘 Trắc nghiệm chọn một đáp án (MCQ)</option>
                                    <option value="MCQ_MULTIPLE">🗂️ Trắc nghiệm chọn nhiều đáp án đúng (MCQ Multiple)</option>
                                    <option value="SHORT_ANSWER">📝 Điền khuyết / Trả lời ngắn (Short Answer)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nội dung câu hỏi *</label>
                                <textarea value={formContent} onChange={e => setFormContent(e.target.value)} rows={3} className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium" placeholder="Nhập nội dung câu hỏi..." />
                            </div>

                            {/* Render different answer options by selected type */}
                            {formType === 'SHORT_ANSWER' ? (
                                <div className="bg-emerald-50/30 border border-emerald-100 p-4 rounded-xl space-y-3">
                                    <div>
                                        <label className="block text-xs font-black text-emerald-800 uppercase tracking-widest mb-1.5">Đáp án chính xác (Điền từ) *</label>
                                        <input 
                                            type="text"
                                            value={formCorrectAnswerString}
                                            onChange={e => setFormCorrectAnswerString(e.target.value)}
                                            placeholder="Nhập chuỗi/từ đáp án đúng chính xác..."
                                            className="w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-bold text-emerald-950"
                                        />
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input 
                                            type="checkbox" 
                                            checked={formCaseSensitive} 
                                            onChange={e => setFormCaseSensitive(e.target.checked)}
                                            className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4" 
                                        />
                                        <span className="text-xs font-bold text-emerald-900">Phân biệt chữ hoa / chữ thường (Case Sensitive)</span>
                                    </label>
                                    <p className="text-[10px] text-emerald-700 mt-1 italic font-medium">
                                        {formCaseSensitive 
                                            ? "* Lưu ý: Học sinh phải viết hoa/thường khớp 100% với đáp án (rất cần thiết cho các câu hỏi chính tả)."
                                            : "* Lưu ý: Hệ thống sẽ tự động chuyển về dạng chữ thường và bỏ dấu cách thừa khi đối chiếu kết quả của học sinh."}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {formAnswers.map((a, i) => (
                                            <div key={i} className="relative">
                                                <label className="block text-xs font-bold text-gray-500 mb-1">Đáp án {String.fromCharCode(65 + i)} *</label>
                                                <input value={a} onChange={e => {
                                                    const cp = [...formAnswers]; cp[i] = e.target.value; setFormAnswers(cp);
                                                }} className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium" />
                                                
                                                {/* If MCQ_MULTIPLE, render checkboxes next to input */}
                                                {formType === 'MCQ_MULTIPLE' && (
                                                    <label className="absolute right-3.5 bottom-2.5 flex items-center gap-1.5 cursor-pointer select-none">
                                                        <input 
                                                            type="checkbox"
                                                            checked={formCorrectIndices.includes(i)}
                                                            onChange={() => handleToggleCorrectIndex(i)}
                                                            className="w-4 h-4 rounded text-green-600 focus:ring-green-500 cursor-pointer"
                                                        />
                                                        <span className="text-[10px] font-black text-green-700">Đúng</span>
                                                    </label>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* MCQ single correct dropdown */}
                                    {formType === 'MCQ' && (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Đáp án đúng</label>
                                            <select value={formCorrect} onChange={e => setFormCorrect(Number(e.target.value))} className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-700 bg-white">
                                                {[0, 1, 2, 3].map(i => <option key={i} value={i}>{String.fromCharCode(65 + i)}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="grid grid-cols-4 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Độ khó</label>
                                    <select value={formDifficulty} onChange={e => setFormDifficulty(Number(e.target.value))} className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-700 bg-white">
                                        {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Môn học</label>
                                    <select value={formSubject} onChange={e => setFormSubject(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-700 bg-white">
                                        {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Chủ đề</label>
                                    <input value={formTopic} onChange={e => setFormTopic(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium" placeholder="VD: Phân số, Hình học..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Lớp</label>
                                    <select value={formGrade} onChange={e => setFormGrade(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-700 bg-white">
                                        {['1', '2', '3', '4', '5'].map(g => <option key={g} value={g}>Lớp {g}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 bg-gray-50 border p-3 rounded-xl">
                                <div>
                                    <label className="block text-xs font-bold text-indigo-700 mb-1">⏱️ Giới hạn thời gian (giây)</label>
                                    <input 
                                        type="number" 
                                        min="5" 
                                        max="300"
                                        value={formTimeLimit} 
                                        onChange={e => setFormTimeLimit(Number(e.target.value))}
                                        className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-700 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-emerald-700 mb-1">⚡ Điểm kinh nghiệm XP thưởng</label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="500"
                                        value={formXpReward} 
                                        onChange={e => setFormXpReward(Number(e.target.value))}
                                        className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-700 bg-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 border p-3 rounded-xl bg-gray-50/50">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">💡 Hướng dẫn (Chỉ gợi ý cách tính, cách làm, không nêu đáp án)</label>
                                    <textarea 
                                        value={formGuide} 
                                        onChange={e => setFormGuide(e.target.value)} 
                                        rows={2} 
                                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium bg-white" 
                                        placeholder="Nhập gợi ý cách giải..." 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">📖 Lời giải chi tiết (Ghi ra từng bước kèm đáp án)</label>
                                    <textarea 
                                        value={formExplanation} 
                                        onChange={e => setFormExplanation(e.target.value)} 
                                        rows={3} 
                                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium bg-white" 
                                        placeholder="Nhập lời giải chi tiết..." 
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-5 border-t flex gap-3 sticky bottom-0 bg-white">
                            <button onClick={() => setEditing(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200">Huỷ</button>
                            <button onClick={handleSave} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-md shadow-indigo-100">
                                <Save className="h-4 w-4" /> Lưu câu hỏi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
                        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Xoá câu hỏi này?</h3>
                        <p className="text-sm text-gray-500 mb-6">Hành động này không thể hoàn tác</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold">Hủy</button>
                            <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2 bg-red-600 text-white rounded-xl font-bold">Xoá</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImport && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setShowImport(false); setImportPreview([]); setImportErrors([]); setImportResult(null); }}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b flex items-center justify-between">
                            <h3 className="font-bold text-lg flex items-center gap-2"><Upload className="h-5 w-5 text-emerald-500" /> Import câu hỏi từ CSV</h3>
                            <button onClick={() => { setShowImport(false); setImportPreview([]); setImportErrors([]); setImportResult(null); }} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            {importResult ? (
                                <div className="text-center py-8">
                                    <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Import thành công!</h3>
                                    <p className="text-gray-500">
                                        Đã thêm <strong className="text-emerald-600">{importResult.count}</strong> câu hỏi
                                        {importResult.skipped !== undefined && importResult.skipped > 0 && (
                                            <> (đã tự động bỏ qua <strong className="text-amber-600">{importResult.skipped}</strong> câu trùng lặp)</>
                                        )}
                                    </p>
                                    <button onClick={() => { setShowImport(false); setImportResult(null); }} className="mt-6 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold">Đóng</button>
                                </div>
                            ) : (
                                <>
                                    {/* Instructions */}
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-700 flex flex-col gap-2.5">
                                        <div>
                                            <p className="font-bold mb-1">📋 Hướng dẫn:</p>
                                            <ol className="list-decimal pl-5 space-y-1 text-xs">
                                                <li>Nhấn nút "Tải file mẫu CSV" bên dưới để lấy file chuẩn</li>
                                                <li>Điền câu hỏi vào file theo định dạng mẫu</li>
                                                <li>Chọn file dưới đây để import vào hệ thống</li>
                                            </ol>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleDownloadTemplate}
                                            className="self-start px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                                        >
                                            <Download className="h-3.5 w-3.5" /> Tải file mẫu CSV
                                        </button>
                                    </div>

                                    {/* File input */}
                                    <div>
                                        <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileSelect} className="hidden" />
                                        <button onClick={() => fileInputRef.current?.click()}
                                            className="w-full py-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all text-center">
                                            <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                            <p className="text-sm font-bold text-gray-700">Chọn file CSV</p>
                                            <p className="text-xs text-gray-400 mt-1">Hỗ trợ .csv, .txt (UTF-8)</p>
                                        </button>
                                    </div>

                                    {/* Errors */}
                                    {importErrors.length > 0 && (
                                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 max-h-32 overflow-y-auto">
                                            <p className="text-xs font-bold text-red-700 mb-1">⚠️ Lỗi ({importErrors.length}):</p>
                                            {importErrors.map((e, i) => (
                                                <p key={i} className="text-xs text-red-600">{e}</p>
                                            ))}
                                        </div>
                                    )}

                                    {/* Preview */}
                                    {importPreview.length > 0 && (
                                        <div>
                                            <p className="text-sm font-bold text-gray-700 mb-2">✅ Preview ({importPreview.length} câu hỏi hợp lệ)</p>
                                            <div className="border rounded-xl divide-y max-h-48 overflow-y-auto">
                                                {importPreview.slice(0, 10).map((q, i) => (
                                                    <div key={i} className="p-2.5 text-xs">
                                                        <div className="flex gap-1.5 mb-1">
                                                            <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">{q.subject}</span>
                                                            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">Lv.{q.difficulty}</span>
                                                            {q.topic && q.topic !== 'general' && <span className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">{q.topic}</span>}
                                                            <span className="bg-pink-50 text-pink-700 px-1.5 py-0.5 rounded font-black tracking-wider">{q.type}</span>
                                                        </div>
                                                        <p className="text-gray-800 font-medium">{q.content}</p>
                                                    </div>
                                                ))}
                                                {importPreview.length > 10 && <div className="p-2.5 text-xs text-gray-400 text-center">... và {importPreview.length - 10} câu nữa</div>}
                                            </div>
                                            <button onClick={handleImport} disabled={importing}
                                                className="w-full mt-4 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                                {importing ? '⏳ Đang import...' : `📥 Import ${importPreview.length} câu hỏi`}
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Word / Text Import Modal (Deterministic Parser) */}
            {showAiScan && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { if (!aiScanning) setShowAiScan(false); }}>
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b flex items-center justify-between bg-purple-50/50 rounded-t-3xl">
                            <h3 className="font-black text-lg text-purple-950 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-purple-600" /> Nhập từ file Word (.docx) / Văn bản
                            </h3>
                            <button disabled={aiScanning} onClick={() => setShowAiScan(false)} className="text-gray-400 hover:text-gray-600 disabled:opacity-50"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-5 flex-1 overflow-y-auto space-y-4">
                            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-xs text-purple-800 space-y-2">
                                <p className="font-bold">📋 Hướng dẫn soạn đề chuẩn:</p>
                                <p>1. Tải file Word (.docx) mẫu về máy để tham khảo cấu trúc soạn đề.</p>
                                <p>2. Dán đề hoặc tải file Word lên, hệ thống sẽ tự động kiểm tra cú pháp tự động và không dùng AI.</p>
                                <p className="font-bold text-indigo-700">📌 Chú ý: Toàn bộ dấu chia trong môn Toán sẽ được tự động chuẩn hóa thành dấu ":" theo chuẩn sư phạm tiểu học.</p>
                                
                                <button
                                    type="button"
                                    onClick={handleDownloadDocxTemplate}
                                    className="mt-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center gap-1.5 w-fit shadow-xs transition-all text-[11px]"
                                >
                                    <Download className="h-3.5 w-3.5" /> Tải file mẫu Word (.docx)
                                </button>
                            </div>

                            <div className="flex gap-2 items-center">
                                <label className="cursor-pointer px-4 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors">
                                    <input type="file" accept=".docx" onChange={handleWordFileSelect} className="hidden" />
                                    {aiScanFileLoading ? '⏳ Đang đọc file...' : <><FileText className="h-4 w-4" /> Tải lên File Word (.docx)</>}
                                </label>
                                <span className="text-[10px] text-gray-400">Đọc nội dung và dán trực tiếp vào ô nhập bên dưới</span>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-500">Nội dung câu hỏi soạn thảo:</label>
                                <textarea
                                    disabled={aiScanning}
                                    value={aiScanText}
                                    onChange={e => setAiScanText(e.target.value)}
                                    placeholder="Soạn theo mẫu:&#10;Môn: Toán&#10;Chủ đề: Phân số & Số thập phân&#10;&#10;Câu 1: Phân số 3/4 viết dưới dạng số thập phân là bao nhiêu?&#10;A. 0,75&#10;B. 0,5&#10;C. 0,25&#10;D. 0,8&#10;Đáp án: A&#10;Độ khó: 1"
                                    className="w-full h-64 border rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50/50 resize-none font-mono"
                                />
                            </div>

                            {/* Errors list for direct correction */}
                            {importErrors.length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 max-h-40 overflow-y-auto">
                                    <p className="text-xs font-bold text-red-700 mb-1 flex items-center gap-1">
                                        <AlertTriangle className="h-3.5 w-3.5" /> Phát hiện lỗi định dạng ({importErrors.length}):
                                    </p>
                                    <div className="space-y-1">
                                        {importErrors.map((e, i) => (
                                            <p key={i} className="text-xs text-red-600 font-medium font-mono">- {e}</p>
                                        ))}
                                    </div>
                                    {validParsedQuestions.length > 0 && (
                                        <p className="text-[11px] text-emerald-700 mt-2 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                                            💡 Gợi ý: Bạn có {validParsedQuestions.length} câu hỏi hợp lệ. Bạn có thể nhấn nút màu xanh bên dưới để chỉ đẩy các câu hợp lệ lên hệ thống. Các câu lỗi sẽ được giữ lại trong khung nhập liệu để bạn tiếp tục chỉnh sửa.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t bg-gray-50/50 flex justify-end gap-2 rounded-b-3xl">
                            {importErrors.length > 0 && validParsedQuestions.length > 0 && (
                                <button
                                    disabled={importing || aiScanning}
                                    onClick={handleImportOnlyValid}
                                    className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 text-sm active:scale-95 transition-all mr-auto"
                                >
                                    {importing ? '⏳ Đang lưu...' : `📥 Chỉ đẩy ${validParsedQuestions.length} câu đúng`}
                                </button>
                            )}
                            <button
                                disabled={aiScanning}
                                onClick={() => { setShowAiScan(false); setImportErrors([]); setValidParsedQuestions([]); }}
                                className="px-5 py-2 bg-white border text-gray-700 rounded-xl font-bold hover:bg-gray-50 text-sm active:scale-95 transition-all"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                disabled={aiScanning || !aiScanText.trim()}
                                onClick={handleStartDeterministicScan}
                                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-bold hover:shadow-md disabled:opacity-50 flex items-center gap-2 text-sm active:scale-95 transition-all"
                            >
                                {aiScanning ? (
                                    <>⏳ Đang kiểm tra...</>
                                ) : (
                                    <><CheckCircle className="h-4.5 w-4.5" /> Bắt đầu đọc & kiểm tra đề</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bank Import Modal */}
            {showBankImport && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setShowBankImport(false); setImportResult(null); }}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
                            <h3 className="font-bold text-lg flex items-center gap-2"><BookOpen className="h-5 w-5 text-purple-500" /> Import từ Ngân hàng đề</h3>
                            <button onClick={() => { setShowBankImport(false); setImportResult(null); }} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            {importResult ? (
                                <div className="text-center py-8">
                                    <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Import thành công!</h3>
                                    <p className="text-gray-500">
                                        Đã thêm <strong className="text-emerald-600">{importResult.count}</strong> câu hỏi vào Đấu Trí
                                        {importResult.skipped !== undefined && importResult.skipped > 0 && (
                                            <> (đã tự động bỏ qua <strong className="text-amber-600">{importResult.skipped}</strong> câu trùng lặp)</>
                                        )}
                                    </p>
                                    <button onClick={() => { setShowBankImport(false); setImportResult(null); }} className="mt-6 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold">Đóng</button>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-sm text-purple-700">
                                        <p>Chọn câu hỏi trắc nghiệm (MCQ, MCQ Multiple hoặc Điền từ Short Answer) từ Ngân hàng đề để thêm vào kho Đấu Trí. Hệ thống sẽ tự động đồng bộ hóa cấu trúc.</p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <select value={bankFilterSubject} onChange={e => setBankFilterSubject(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm bg-white cursor-pointer font-medium text-gray-700">
                                            <option value="">Tất cả môn</option>
                                            <option value="Toán">Toán</option>
                                            <option value="Tiếng Việt">Tiếng Việt</option>
                                            <option value="Khoa học">Khoa học</option>
                                            <option value="Tiếng Anh">Tiếng Anh</option>
                                            <option value="Lịch sử và Địa lí">Lịch sử và Địa lí</option>
                                            <option value="Công nghệ">Công nghệ</option>
                                            <option value="Tin học">Tin học</option>
                                        </select>
                                        <button onClick={selectAllBank} className="text-xs text-purple-600 font-bold hover:underline">
                                            {bankSelectedIds.size === bankMCQs.length && bankMCQs.length > 0 ? 'Bỏ chọn tất cả' : `Chọn tất cả (${bankMCQs.length})`}
                                        </button>
                                        <span className="text-xs text-gray-400 ml-auto">Đã chọn: <strong className="text-purple-600">{bankSelectedIds.size}</strong></span>
                                    </div>

                                    <div className="border rounded-xl divide-y max-h-[40vh] overflow-y-auto bg-gray-50/50">
                                        {bankMCQs.length === 0 ? (
                                            <div className="p-6 text-center text-gray-400 bg-white">
                                                <p className="font-medium">Ngân hàng đề chưa có câu hỏi phù hợp.</p>
                                                <p className="text-xs mt-1">Hãy tạo bài tập trước rồi quay lại đây.</p>
                                            </div>
                                        ) : (
                                            bankMCQs.map(q => (
                                                <label key={q.id} className={`flex gap-3 p-3 text-sm cursor-pointer hover:bg-purple-50 transition-colors bg-white ${bankSelectedIds.has(q.id) ? 'bg-purple-50/40 border-l-4 border-purple-500' : ''}`}>
                                                    <input type="checkbox" checked={bankSelectedIds.has(q.id)} onChange={() => toggleBankSelect(q.id)} className="w-4 h-4 mt-0.5 text-purple-600 rounded cursor-pointer" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex gap-1.5 mb-1 flex-wrap font-bold">
                                                            {q.subject && <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px]">{q.subject}</span>}
                                                            {q.level && <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px]">{q.level}</span>}
                                                            <span className="bg-pink-50 text-pink-700 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider">{q.type === 'SHORT_ANSWER' ? 'Điền Từ' : q.type === 'MCQ_MULTIPLE' ? 'Chọn Nhiều' : 'MCQ'}</span>
                                                            {q.topic && <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[10px]">{q.topic}</span>}
                                                        </div>
                                                        <p className="text-gray-800 text-xs font-medium truncate">{q.content}</p>
                                                    </div>
                                                </label>
                                            ))
                                        )}
                                    </div>

                                    {bankSelectedIds.size > 0 && (
                                        <button onClick={handleBankImport} disabled={importing}
                                            className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                            {importing ? '⏳ Đang import...' : `📥 Import ${bankSelectedIds.size} câu vào Đấu Trí`}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* AI Generate Modal */}
            {showAiGen && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAiGen(false)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b flex items-center justify-between">
                            <h3 className="font-bold text-lg flex items-center gap-2"><Sparkles className="h-5 w-5 text-purple-500 animate-pulse" /> AI Tạo Câu Hỏi Đấu Trí</h3>
                            <button onClick={() => setShowAiGen(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-full transition-colors"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Môn học</label>
                                <select value={aiGenSubject} onChange={e => setAiGenSubject(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-700 bg-white cursor-pointer">
                                    {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Chủ đề *</label>
                                <input value={aiGenTopic} onChange={e => setAiGenTopic(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium" placeholder="VD: Phân số, Từ vựng Unit 5..." />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Số câu</label>
                                    <input type="number" min="1" max="20" value={aiGenCount} onChange={e => setAiGenCount(Number(e.target.value))} className="w-full border rounded-xl px-3 py-2 text-sm font-bold" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Độ khó</label>
                                    <select value={aiGenDifficulty} onChange={e => setAiGenDifficulty(Number(e.target.value))} className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-700">
                                        {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="p-5 border-t flex gap-3">
                            <button onClick={() => setShowAiGen(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200">Hủy</button>
                            <button onClick={handleAiGenerate} disabled={aiGenerating || !aiGenTopic.trim()}
                                className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all">
                                {aiGenerating ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang tạo...</> : <><Sparkles className="h-4 w-4" /> Tạo {aiGenCount} câu</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Preview & Edit Modal */}
            {showAiPreviewModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs" onClick={() => setShowAiPreviewModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b flex justify-between items-center bg-indigo-50/50 rounded-t-3xl">
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-100 p-2 rounded-2xl text-indigo-600">
                                    <Sparkles className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-black text-indigo-900 text-lg">AI Preview: Xem trước câu hỏi đấu trí</h3>
                                    <p className="text-xs text-indigo-600 font-medium">Bạn có thể sửa trực tiếp hoặc loại bỏ những câu không đạt chuẩn của AI trước khi chèn vào database.</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAiPreviewModal(false)} className="text-gray-400 hover:bg-gray-200 p-2 rounded-full transition-all"><X className="h-6 w-6" /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30 custom-scrollbar">
                            {aiPreviewList.map((item, index) => (
                                <div key={index} className="bg-white rounded-2xl border p-4 shadow-sm relative group hover:border-indigo-100 transition-colors">
                                    <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                                        <div className="flex gap-1.5 flex-wrap">
                                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase">{item.subject}</span>
                                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg text-[10px] font-bold">Cấp độ {item.difficulty}</span>
                                            {item.topic && <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded-lg text-[10px] font-bold">{item.topic}</span>}
                                            <span className="bg-pink-50 text-pink-700 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider">{item.type || 'MCQ'}</span>
                                            <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg text-[10px] font-bold">⏱️ {item.time_limit_seconds || 30}s</span>
                                            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg text-[10px] font-bold">⚡ +{item.xp_reward || 10} XP</span>
                                            {item.grade && (
                                                <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg text-[10px] font-bold">🏫 Lớp {item.grade}</span>
                                            )}
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleStartEditPreviewItem(index)} className="px-2.5 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all flex items-center gap-1">
                                                <Pencil className="h-3 w-3" /> Sửa nhanh
                                            </button>
                                            <button onClick={() => handleRemovePreviewItem(index)} className="px-2.5 py-1 text-xs font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-all flex items-center gap-1">
                                                <Trash2 className="h-3 w-3" /> Loại bỏ
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <p className="font-bold text-gray-800 text-sm mb-3">{item.content}</p>
                                    
                                    {item.type === 'SHORT_ANSWER' ? (
                                        <div className="bg-emerald-50 border p-3 rounded-xl text-xs max-w-sm">
                                            <span className="font-black text-emerald-800 uppercase block tracking-wider">Đáp án điền từ:</span>
                                            <span className="font-bold text-emerald-950 block mt-1">"{item.correct_answer_string}"</span>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {item.answers?.map((ans, ansIdx) => {
                                                const isCorrect = item.type === 'MCQ_MULTIPLE'
                                                    ? item.correct_indices?.includes(ansIdx)
                                                    : ansIdx === item.correct_index;
                                                return (
                                                    <div key={ansIdx} className={`text-xs px-3 py-2 rounded-xl flex items-center gap-2 border ${isCorrect ? 'bg-emerald-50 text-emerald-800 font-bold border-emerald-200' : 'bg-gray-50 text-gray-500 border-transparent'}`}>
                                                        <span className="bg-white border rounded shadow-xs w-4 h-4 flex items-center justify-center font-bold text-[9px]">{String.fromCharCode(65 + ansIdx)}</span>
                                                        <span>{ans}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {aiPreviewList.length === 0 && (
                                <div className="text-center py-16 bg-white border rounded-2xl border-dashed">
                                    <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-400 font-medium italic">Danh sách xem trước trống.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t bg-gray-50/50 flex justify-between items-center rounded-b-3xl">
                            <span className="text-xs font-bold text-gray-500 ml-2">Tổng số: {aiPreviewList.length} câu hỏi hợp lệ</span>
                            <div className="flex gap-2">
                                <button onClick={() => { setAiPreviewList([]); setShowAiPreviewModal(false); }} className="px-5 py-2.5 bg-white border text-gray-700 rounded-xl font-bold hover:bg-gray-50 shadow-sm active:scale-95 transition-all text-sm">Hủy bỏ</button>
                                <button onClick={handleSaveAiPreview} disabled={importing || aiPreviewList.length === 0} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-md shadow-indigo-100 active:scale-95 transition-all text-sm">
                                    {importing ? '⏳ Đang lưu...' : <><CheckCircle className="h-4.5 w-4.5" /> Xác nhận chèn {aiPreviewList.length} câu vào Đấu Trí</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Nested Preview Item Editor Modal */}
            {editingPreviewIndex !== null && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                            <h4 className="font-black text-gray-800 flex items-center gap-2"><Pencil className="h-5 w-5 text-indigo-600" /> Hiệu Chỉnh Câu Hỏi AI</h4>
                            <button onClick={() => setEditingPreviewIndex(null)} className="text-gray-400 hover:bg-gray-200 p-2 rounded-full"><X className="h-5 w-5" /></button>
                        </div>
                        
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Loại câu hỏi *</label>
                                <select 
                                    value={formType} 
                                    onChange={e => setFormType(e.target.value as any)}
                                    className="w-full border rounded-xl px-3 py-2.5 text-sm font-bold text-indigo-700 bg-indigo-50/50 cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="MCQ">🔘 Trắc nghiệm chọn một đáp án (MCQ)</option>
                                    <option value="MCQ_MULTIPLE">🗂️ Trắc nghiệm chọn nhiều đáp án đúng (MCQ Multiple)</option>
                                    <option value="SHORT_ANSWER">📝 Điền khuyết / Trả lời ngắn (Short Answer)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nội dung câu hỏi *</label>
                                <textarea value={formContent} onChange={e => setFormContent(e.target.value)} rows={3} className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium" />
                            </div>

                            {formType === 'SHORT_ANSWER' ? (
                                <div className="bg-emerald-50 border p-3 rounded-xl space-y-3">
                                    <div>
                                        <label className="block text-xs font-black text-emerald-800 uppercase tracking-widest mb-1.5">Đáp án đúng điền từ *</label>
                                        <input 
                                            type="text"
                                            value={formCorrectAnswerString}
                                            onChange={e => setFormCorrectAnswerString(e.target.value)}
                                            className="w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-bold text-emerald-950"
                                        />
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input 
                                            type="checkbox" 
                                            checked={formCaseSensitive} 
                                            onChange={e => setFormCaseSensitive(e.target.checked)}
                                            className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4" 
                                        />
                                        <span className="text-xs font-bold text-emerald-900">Phân biệt chữ hoa / chữ thường (Case Sensitive)</span>
                                    </label>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {formAnswers.map((a, i) => (
                                            <div key={i} className="relative">
                                                <label className="block text-xs font-bold text-gray-500 mb-1">Đáp án {String.fromCharCode(65 + i)} *</label>
                                                <input value={a} onChange={e => {
                                                    const cp = [...formAnswers]; cp[i] = e.target.value; setFormAnswers(cp);
                                                }} className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium" />
                                                
                                                {formType === 'MCQ_MULTIPLE' && (
                                                    <label className="absolute right-3.5 bottom-2.5 flex items-center gap-1.5 cursor-pointer select-none">
                                                        <input 
                                                            type="checkbox"
                                                            checked={formCorrectIndices.includes(i)}
                                                            onChange={() => handleToggleCorrectIndex(i)}
                                                            className="w-4 h-4 rounded text-green-600 focus:ring-green-500 cursor-pointer"
                                                        />
                                                        <span className="text-[10px] font-black text-green-700">Đúng</span>
                                                    </label>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {formType === 'MCQ' && (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Đáp án đúng</label>
                                            <select value={formCorrect} onChange={e => setFormCorrect(Number(e.target.value))} className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-700">
                                                {[0, 1, 2, 3].map(i => <option key={i} value={i}>{String.fromCharCode(65 + i)}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="grid grid-cols-4 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Độ khó</label>
                                    <select value={formDifficulty} onChange={e => setFormDifficulty(Number(e.target.value))} className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-700 bg-white">
                                        {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Môn học</label>
                                    <select value={formSubject} onChange={e => setFormSubject(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-700 bg-white">
                                        {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Chủ đề</label>
                                    <input value={formTopic} onChange={e => setFormTopic(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Lớp</label>
                                    <select value={formGrade} onChange={e => setFormGrade(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-700 bg-white">
                                        {['1', '2', '3', '4', '5'].map(g => <option key={g} value={g}>Lớp {g}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 bg-gray-50 border p-3 rounded-xl">
                                <div>
                                    <label className="block text-xs font-bold text-indigo-700 mb-1">⏱️ Thời gian làm bài (giây)</label>
                                    <input 
                                        type="number" 
                                        min="5" 
                                        max="300"
                                        value={formTimeLimit} 
                                        onChange={e => setFormTimeLimit(Number(e.target.value))}
                                        className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-emerald-700 mb-1">⚡ Kinh nghiệm XP thưởng</label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="500"
                                        value={formXpReward} 
                                        onChange={e => setFormXpReward(Number(e.target.value))}
                                        className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-700"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 border p-3 rounded-xl bg-gray-50/50">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">💡 Hướng dẫn (Chỉ gợi ý cách tính, cách làm, không nêu đáp án)</label>
                                    <textarea 
                                        value={formGuide} 
                                        onChange={e => setFormGuide(e.target.value)} 
                                        rows={2} 
                                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium bg-white text-gray-900" 
                                        placeholder="Nhập gợi ý cách giải..." 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">📖 Lời giải chi tiết (Ghi ra từng bước kèm đáp án)</label>
                                    <textarea 
                                        value={formExplanation} 
                                        onChange={e => setFormExplanation(e.target.value)} 
                                        rows={3} 
                                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium bg-white text-gray-900" 
                                        placeholder="Nhập lời giải chi tiết..." 
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-5 border-t flex gap-3 sticky bottom-0 bg-white">
                            <button onClick={() => setEditingPreviewIndex(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200">Quay lại</button>
                            <button onClick={handleSavePreviewItem} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-md shadow-indigo-100">
                                <CheckCircle className="h-4.5 w-4.5" /> Áp dụng thay đổi
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Topic Manager Modal */}
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
                                                        {SUBJECTS.find(s => s.value === normalizeSubject(t.subject))?.label || t.subject}
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
        </div>
    );
};

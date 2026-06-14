import { supabase } from '../../services/supabaseClient';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { ArenaQuestion } from '../../types';
import { generateQuestionsByTopic } from '../../services/geminiService';
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

export const ArenaAdmin: React.FC = () => {
    const { arenaQuestions, arenaQuestionsHasMore, fetchArenaQuestions, loadMoreArenaQuestions, addArenaQuestion, updateArenaQuestion, deleteArenaQuestion, bulkDeleteArenaQuestions, bulkAddArenaQuestions, questionBank, exams } = useStore();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    
    // Filters & Search
    const [filterSubject, setFilterSubject] = useState('');
    const [filterDifficulty, setFilterDifficulty] = useState(0);
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
    const [importResult, setImportResult] = useState<{ count: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Edit form
    const [formContent, setFormContent] = useState('');
    const [formAnswers, setFormAnswers] = useState(['', '', '', '']);
    const [formCorrect, setFormCorrect] = useState(0);
    const [formDifficulty, setFormDifficulty] = useState(1);
    const [formSubject, setFormSubject] = useState('math');
    const [formTopic, setFormTopic] = useState('');
    const [formTimeLimit, setFormTimeLimit] = useState(30);
    const [formXpReward, setFormXpReward] = useState(10);
    
    // New types support: MCQ_MULTIPLE and SHORT_ANSWER
    const [formType, setFormType] = useState<'MCQ' | 'MCQ_MULTIPLE' | 'SHORT_ANSWER'>('MCQ');
    const [formCorrectIndices, setFormCorrectIndices] = useState<number[]>([]);
    const [formCorrectAnswerString, setFormCorrectAnswerString] = useState('');

    useEffect(() => {
        fetchArenaQuestions().then(() => setLoading(false));
    }, []);

    // Extended Filter and Search logic
    const filteredQuestions = arenaQuestions.filter(q => {
        const matchesSubject = !filterSubject || q.subject === filterSubject;
        const matchesDifficulty = !filterDifficulty || q.difficulty === filterDifficulty;
        const matchesSearch = !searchQuery.trim() || 
            q.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
            (q.topic && q.topic.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesSubject && matchesDifficulty && matchesSearch;
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
        setImportResult({ count });
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
        const count = await bulkAddArenaQuestions(aiPreviewList);
        setImportResult({ count });
        setImporting(false);
        setAiPreviewList([]);
        setShowAiPreviewModal(false);
        await fetchArenaQuestions();
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
        setFormTimeLimit(item.time_limit_seconds || 30);
        setFormXpReward(item.xp_reward || 10);
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
                difficulty: formDifficulty,
                subject: formSubject,
                topic: formTopic.trim() || 'general',
                time_limit_seconds: formTimeLimit,
                xp_reward: formXpReward,
                type: formType
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
            time_limit_seconds: formTimeLimit,
            xp_reward: formXpReward,
            type: formType,
            correct_index: formType === 'MCQ' ? formCorrect : 0,
            correct_indices: formType === 'MCQ_MULTIPLE' ? formCorrectIndices : null,
            correct_answer_string: formType === 'SHORT_ANSWER' ? formCorrectAnswerString.trim() : null,
            answers: formType !== 'SHORT_ANSWER' ? formAnswers : []
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

            const [content, ansA, ansB, ansC, ansD, correctStr, diffStr, subject, topic, timeLimitStr, xpRewardStr, typeStr, correctIndicesStr, shortAnswerStr] = cols;

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
                subject: (subject?.trim() || 'math').toLowerCase(),
                topic: topic?.trim() || 'general',
                time_limit_seconds: isNaN(timeLimit) ? 30 : timeLimit,
                xp_reward: isNaN(xpReward) ? 10 : xpReward,
                type
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
        setImportResult({ count });
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
                    <div className="text-3xl font-black text-indigo-600">{arenaQuestions.length}</div>
                    <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Tổng câu hỏi</div>
                </div>
                {DIFFICULTIES.map(d => {
                    const count = arenaQuestions.filter(q => q.difficulty === d.value).length;
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
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mb-6 bg-white rounded-2xl border p-4 shadow-sm">
                <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                        type="text"
                        placeholder="Tìm kiếm theo từ khoá câu hỏi hoặc chủ đề..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50/50 hover:bg-gray-50/80 transition-all font-medium"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-200">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 text-gray-500 text-xs font-bold">
                        <Filter className="h-3.5 w-3.5 text-gray-400" /> Môn:
                    </div>
                    <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-gray-700 cursor-pointer">
                        <option value="">Tất cả môn</option>
                        {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>

                    <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 text-gray-500 text-xs font-bold">
                        <Filter className="h-3.5 w-3.5 text-gray-400" /> Độ khó:
                    </div>
                    <select value={filterDifficulty} onChange={e => setFilterDifficulty(Number(e.target.value))} className="border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-gray-700 cursor-pointer">
                        <option value={0}>Tất cả độ khó</option>
                        {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>

                    <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-4 py-2 rounded-xl border transition-colors bg-white">
                        <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            checked={selectedIds.size === filteredQuestions.length && filteredQuestions.length > 0}
                            onChange={() => handleSelectAll(filteredQuestions)}
                        />
                        <span className="text-xs font-bold text-gray-600">Chọn tất cả</span>
                    </label>

                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-xl ml-auto">
                        {filteredQuestions.length} kết quả
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
                                            {SUBJECTS.find(s => s.value === q.subject)?.label || q.subject}
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
                            await loadMoreArenaQuestions();
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
                                <div className="bg-emerald-50/30 border border-emerald-100 p-4 rounded-xl">
                                    <label className="block text-xs font-black text-emerald-800 uppercase tracking-widest mb-1.5">Đáp án chính xác (Điền từ) *</label>
                                    <input 
                                        type="text"
                                        value={formCorrectAnswerString}
                                        onChange={e => setFormCorrectAnswerString(e.target.value)}
                                        placeholder="Nhập chuỗi/từ đáp án đúng chính xác..."
                                        className="w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-bold text-emerald-950"
                                    />
                                    <p className="text-[10px] text-emerald-700 mt-2 italic font-medium">* Lưu ý: Hệ thống Đấu trí sẽ tự động loại bỏ khoảng trắng và chuyển chữ thường khi chấm bài học sinh để đảm bảo chính xác.</p>
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

                            <div className="grid grid-cols-3 gap-3">
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
                                    <p className="text-gray-500">Đã thêm <strong className="text-emerald-600">{importResult.count}</strong> câu hỏi</p>
                                    <button onClick={() => { setShowImport(false); setImportResult(null); }} className="mt-6 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold">Đóng</button>
                                </div>
                            ) : (
                                <>
                                    {/* Instructions */}
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-700">
                                        <p className="font-bold mb-1">📋 Hướng dẫn:</p>
                                        <ol className="list-decimal pl-5 space-y-1 text-xs">
                                            <li>Tải file mẫu CSV bằng nút "File mẫu" ở trên</li>
                                            <li>Điền câu hỏi vào file theo mẫu</li>
                                            <li>Chọn file dưới đây để import</li>
                                        </ol>
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
                                    <p className="text-gray-500">Đã thêm <strong className="text-emerald-600">{importResult.count}</strong> câu hỏi vào Đấu Trí</p>
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
                                <div className="bg-emerald-50 border p-3 rounded-xl">
                                    <label className="block text-xs font-black text-emerald-800 uppercase tracking-widest mb-1.5">Đáp án đúng điền từ *</label>
                                    <input 
                                        type="text"
                                        value={formCorrectAnswerString}
                                        onChange={e => setFormCorrectAnswerString(e.target.value)}
                                        className="w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-bold text-emerald-950"
                                    />
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

                            <div className="grid grid-cols-3 gap-3">
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
        </div>
    );
};

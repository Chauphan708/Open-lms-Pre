import React, { useState } from 'react';
import { useStore } from '../store';
import { useLocation, useNavigate } from 'react-router-dom';
import { Question, QuestionType } from '../types';
import { MatrixConfig } from '../components/MatrixConfig';
import { PrintableContent } from '../components/PrintableContent';
import { exportToDocx } from '../services/docxExport';
import { Save, Trash2, Edit2, X, Plus, Printer, ChevronDown, BarChart3, Lightbulb, BrainCircuit, FileText, AlertCircle, Shuffle, Timer, Download, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

type PrintType = 'MATRIX' | 'EXAM' | 'ALL';

export const ExamMatrix: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { addExam, updateExam, exams, questionBank } = useStore();

    const searchParams = new URLSearchParams(location.search);
    const editExamId = searchParams.get('edit');
    const [isEditMode, setIsEditMode] = React.useState(false);

    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('Toán');
    const [grade, setGrade] = useState('5');
    const [duration, setDuration] = useState(35);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [examCategory, setExamCategory] = useState<'EXAM' | 'TASK'>('EXAM');
    const [error, setError] = useState<string | null>(null);
    const [printType, setPrintType] = useState<PrintType | null>(null);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    // C1: Exam variant
    const [examVariant, setExamVariant] = useState('A');
    // C3: Timer
    const [timerEnabled, setTimerEnabled] = useState(false);

    React.useEffect(() => {
        if (editExamId) {
            const examToEdit = exams.find(e => e.id === editExamId);
            if (examToEdit) {
                setIsEditMode(true);
                setTitle(examToEdit.title);
                setSubject(examToEdit.subject);
                setGrade(examToEdit.grade || '5');
                setDuration(examToEdit.durationMinutes);
                setQuestions(JSON.parse(JSON.stringify(examToEdit.questions)));
                setExamCategory(examToEdit.category || 'EXAM');
            }
        }
    }, [editExamId, exams]);

    const SUBJECTS = ['Toán', 'Tiếng Việt', 'Khoa học', 'Lịch sử và Địa lí', 'Công nghệ', 'Tiếng Anh', 'Tin học'];
    const GRADES = ['1', '2', '3', '4', '5'];

    const handlePrint = (type: PrintType) => {
        setPrintType(type);
        setTimeout(() => { window.print(); }, 500);
    };

    const removeQuestion = (id: string) => {
        setQuestions(questions.filter(q => q.id !== id));
    };

    const openEditModal = (q: Question) => {
        setEditingQuestion({ ...q });
    };

    const saveEditedQuestion = () => {
        if (!editingQuestion) return;
        setQuestions(questions.map(q => q.id === editingQuestion.id ? editingQuestion : q));
        setEditingQuestion(null);
    };
    const handleSaveExam = () => {
        if (!title.trim() || questions.length === 0) {
            setError("Vui lòng nhập tên đề kiểm tra và có ít nhất 1 câu hỏi.");
            return;
        }

        if (isEditMode && editExamId) {
            const updatedExam = exams.find(e => e.id === editExamId);
            if (updatedExam) {
                updateExam({
                    ...updatedExam,
                    title,
                    subject,
                    grade,
                    durationMinutes: duration,
                    questionCount: questions.length,
                    category: examCategory,
                    questions
                });
                alert(`Đã cập nhật ${examCategory === 'EXAM' ? 'đề KT' : 'nhiệm vụ'} thành công!`);
                navigate('/exams');
                return;
            }
        }

        const newExam = {
            id: `exam_matrix_${Date.now()}`,
            title,
            subject,
            grade,
            difficulty: 'NHAN_BIET' as const,
            durationMinutes: duration,
            questionCount: questions.length,
            createdAt: new Date().toISOString(),
            status: 'PUBLISHED' as const,
            category: examCategory,
            questions
        };

        addExam(newExam);
        setError(null);
        alert(`Đã lưu ${examCategory === 'EXAM' ? 'đề KT' : 'nhiệm vụ'} thành công!`);
        navigate('/exams');
    };

    // C1: Trộn đề - tạo bản shuffled
    const shuffleQuestions = () => {
        const shuffled = [...questions].sort(() => Math.random() - 0.5).map(q => {
            if (q.type === 'MCQ' && q.options.length > 0) {
                const correctAnswer = q.options[q.correctOptionIndex ?? 0];
                const shuffledOpts = [...q.options].sort(() => Math.random() - 0.5);
                return { ...q, id: `${q.id}_v${Date.now()}`, options: shuffledOpts, correctOptionIndex: shuffledOpts.indexOf(correctAnswer) };
            }
            return { ...q, id: `${q.id}_v${Date.now()}` };
        });
        setQuestions(shuffled);
        setExamVariant(prev => prev === 'A' ? 'B' : prev === 'B' ? 'C' : 'A');
    };

    const handleReRollQuestion = (currentQ: Question) => {
        // Find alternative from bank
        const availableQuestions = questionBank.filter(q =>
            q.subject === subject &&
            q.grade === grade &&
            q.level === currentQ.level &&
            q.type === currentQ.type &&
            q.id !== currentQ.id && // Don't pick same question
            !questions.some(existingQ => existingQ.id === q.id) // Don't pick one already in exam
        );

        if (availableQuestions.length === 0) {
            setError(`Không tìm thấy câu hỏi thay thế phù hợp trong ngân hàng (Môn: ${subject}, Lớp: ${grade}, Mức độ: ${currentQ.level || 'Không xác định'}, Loại: ${currentQ.type}).`);
            return;
        }

        // Pick a random alternative
        const randomAlternative = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];

        // Replace in questions array
        setQuestions(questions.map(q => q.id === currentQ.id ? { ...randomAlternative, id: `reroll_${Date.now()}_${randomAlternative.id}` } : q));
        setError(null);
    };

    const sortByLevel = () => {
        const levelOrder: Record<string, number> = { 'NHAN_BIET': 1, 'KET_NOI': 2, 'VAN_DUNG': 3 };
        const sorted = [...questions].sort((a, b) => {
            const levelDiff = (levelOrder[a.level || ''] || 99) - (levelOrder[b.level || ''] || 99);
            if (levelDiff !== 0) return levelDiff;
            // Nếu cùng mức độ, giữ nguyên thứ tự hoặc sắp theo ID
            return 0;
        });
        setQuestions(sorted);
    };

    const sortByType = () => {
        const TN_TYPES = ['MCQ', 'MATCHING', 'ORDERING', 'DRAG_DROP'];
        const levelOrder: Record<string, number> = { 'NHAN_BIET': 1, 'KET_NOI': 2, 'VAN_DUNG': 3 };
        
        const sorted = [...questions].sort((a, b) => {
            const isATN = TN_TYPES.includes(a.type);
            const isBTN = TN_TYPES.includes(b.type);
            
            // Ưu tiên TN trước TL
            if (isATN && !isBTN) return -1;
            if (!isATN && isBTN) return 1;
            
            // Nếu cùng "Loại" (cùng TN hoặc cùng TL), sắp theo mức độ
            return (levelOrder[a.level || ''] || 99) - (levelOrder[b.level || ''] || 99);
        });
        setQuestions(sorted);
    };

    // C2: Xuất text file
    const exportTextFile = () => {
        let text = `ĐỀ KIỂM TRA - ${title || 'Chưa đặt tên'}\nMôn: ${subject} - Lớp ${grade} - Thời gian: ${duration} phút\nĐề: ${examVariant}\n${'='.repeat(50)}\n\n`;
        questions.forEach((q, i) => {
            text += `Câu ${i + 1}: ${q.content}\n`;
            if (q.options?.length) {
                q.options.forEach((opt, j) => { text += `  ${String.fromCharCode(65 + j)}. ${opt}\n`; });
            }
            text += '\n';
        });
        text += `\n${'='.repeat(50)}\nĐÁP ÁN\n`;
        questions.forEach((q, i) => {
            if (q.type === 'MCQ' && q.correctOptionIndex !== undefined) {
                text += `Câu ${i + 1}: ${String.fromCharCode(65 + q.correctOptionIndex)}\n`;
            } else {
                text += `Câu ${i + 1}: ${q.solution || '(Tự luận)'}\n`;
            }
        });
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `De_${examVariant}_${subject}_Lop${grade}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const getTypeLabel = (type: QuestionType) => {
        const TN_TYPES = ['MCQ', 'MATCHING', 'ORDERING', 'DRAG_DROP'];
        if (TN_TYPES.includes(type)) return 'TN';
        if (type === 'SHORT_ANSWER') return 'TL';
        return type;
    };

    const wrapMath = (text: string) => {
        if (!text) return '';
        if ((text.includes('\\frac') || text.includes('\\sqrt') || text.includes('^') || text.includes('\\times')) && !text.includes('$')) {
            return text.replace(/(\\frac\{[^{}]*\}\{[^{}]*\}|\\sqrt\{[^{}]*\}|cm\^[23]|m\^[23]|\\times|\\div)/g, '$$$1$$');
        }
        return text;
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="h-6 w-6 text-emerald-600" /> Tạo Đề Kiểm Tra (Ma Trận)
                    </h1>
                    <p className="text-gray-500 text-sm">Cấu hình ma trận → Bốc câu từ Ngân hàng → In đề chuẩn A4</p>
                </div>
                <div className="flex gap-2">
                    {questions.length > 0 && (
                        <>
                             {/* C1: Trộn đề */}
                             <button onClick={shuffleQuestions} className="flex items-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-lg hover:bg-amber-600 font-bold shadow-md transform hover:scale-105 transition-all">
                                 <Shuffle className="h-5 w-5" /> Trộn đề {examVariant === 'A' ? '→ B' : examVariant === 'B' ? '→ C' : '→ A'}
                             </button>
                            <div className="relative group">
                                <button className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm">
                                    <Printer className="h-4 w-4" /> Xuất File <ChevronDown className="h-3 w-3" />
                                </button>
                                <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                                    <div className="px-4 py-2 text-xs font-bold text-gray-400 bg-gray-50 border-b">Tùy chọn In (PDF)</div>
                                    <button onClick={() => handlePrint('MATRIX')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2"><BarChart3 className="h-4 w-4" /> 1. In Ma trận</button>
                                    <button onClick={() => handlePrint('EXAM')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2"><FileText className="h-4 w-4" /> 2. In Đề KT</button>
                                    <button onClick={() => handlePrint('ALL')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2"><Printer className="h-4 w-4" /> 3. In Ma trận & Đề</button>
                                    
                                    <div className="px-4 py-2 text-xs font-bold text-gray-400 bg-gray-50 border-t border-b">Tùy chọn Word (.docx)</div>
                                    <button onClick={() => exportToDocx({ questions, title, subject, grade, duration, includeMatrix: true, includeSolution: false })} className="w-full text-left px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 flex items-center gap-2"><Download className="h-4 w-4" /> 1. Word Ma trận</button>
                                    <button onClick={() => exportToDocx({ questions, title, subject, grade, duration, includeMatrix: false, includeSolution: true })} className="w-full text-left px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 flex items-center gap-2"><FileText className="h-4 w-4" /> 2. Word Đề KT</button>
                                    <button onClick={() => exportToDocx({ questions, title, subject, grade, duration, includeMatrix: true, includeSolution: true })} className="w-full text-left px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 flex items-center gap-2"><Download className="h-4 w-4" /> 3. Word Ma trận & Đề</button>
                                </div>
                            </div>
                        </>
                    )}
                    <button onClick={handleSaveExam} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium shadow-sm">
                        <Save className="h-4 w-4" /> {isEditMode ? 'Cập nhật Đề KT' : 'Lưu Đề KT'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 mb-3 text-sm animate-fade-in">
                    <AlertCircle className="h-4 w-4" /> {error}
                </div>
            )}

            <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto pr-1">
                {/* TOP: Config */}
                <div className="flex flex-col gap-3">
                    {/* Info */}
                    <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tên đề kiểm tra</label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                                placeholder="VD: Kiểm tra Giữa Kì 1 Toán Lớp 5"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none" />
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Loại bài</label>
                                <select value={examCategory} onChange={e => setExamCategory(e.target.value as any)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-900 text-sm font-bold">
                                    <option value="EXAM">ĐỀ KT</option>
                                    <option value="TASK">NHIỆM VỤ</option>
                                </select>
                            </div>
                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Môn</label>
                                <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-900 text-sm">
                                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Lớp</label>
                                <select value={grade} onChange={e => setGrade(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-900 text-sm">
                                    {GRADES.map(g => <option key={g} value={g}>Lớp {g}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian</label>
                                <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-900 text-sm" />
                            </div>
                        </div>
                    </div>

                    {/* Matrix Config */}
                    <div className="flex-1 bg-white p-4 rounded-xl border shadow-sm flex flex-col">
                        <MatrixConfig onGenerate={(qs) => setQuestions(prev => [...prev, ...qs])} subject={subject} grade={grade} />
                    </div>
                </div>

                {/* BOTTOM: Preview */}
                <div className="bg-white rounded-xl border shadow-sm flex flex-col min-h-[500px] overflow-hidden">
                    <div className="p-4 border-b bg-white flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <h3 className="font-bold text-gray-700">Đề {examVariant} ({questions.length} câu)</h3>
                            {/* C3: Timer toggle */}
                            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                                <input type="checkbox" checked={timerEnabled} onChange={e => setTimerEnabled(e.target.checked)} className="rounded text-indigo-500" />
                                <Timer className="h-3.5 w-3.5" /> {duration} phút
                            </label>
                            {questions.length > 0 && (
                                 <div className="flex items-center gap-3 ml-4 border-l-2 border-emerald-100 pl-4 bg-emerald-50/30 py-1 px-3 rounded-lg">
                                     <span className="text-[11px] font-black text-emerald-700 uppercase tracking-wider">Sắp xếp theo:</span>
                                     <button onClick={sortByLevel} className="text-[11px] font-bold bg-white hover:bg-indigo-50 px-3 py-1.5 rounded-full border-2 border-indigo-100 text-indigo-700 flex items-center gap-1.5 transition-all shadow-sm hover:border-indigo-300">
                                         <BarChart3 className="h-3.5 w-3.5" /> Mức độ
                                     </button>
                                     <button onClick={sortByType} className="text-[11px] font-bold bg-white hover:bg-purple-50 px-3 py-1.5 rounded-full border-2 border-purple-100 text-purple-700 flex items-center gap-1.5 transition-all shadow-sm hover:border-purple-300">
                                         <FileText className="h-3.5 w-3.5" /> Loại câu (TN-TL)
                                     </button>
                                 </div>
                             )}
                        </div>
                        {questions.length > 0 && (
                            <button onClick={() => setQuestions([])} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                                <Trash2 className="h-3 w-3" /> Xóa hết
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                        {questions.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <BarChart3 className="h-16 w-16 mb-4 opacity-30" />
                                <p className="font-medium">Chưa có câu hỏi nào.</p>
                                <p className="text-sm mt-1">Cấu hình ma trận bên trái rồi bấm "Rút câu hỏi".</p>
                            </div>
                        ) : (
                            questions.map((q, idx) => (
                                <div key={q.id} className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative group">
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleReRollQuestion(q)} className="text-gray-300 hover:text-amber-500 p-1" title="Đổi câu khác cùng mức độ"><RefreshCw className="h-3.5 w-3.5" /></button>
                                        <button onClick={() => openEditModal(q)} className="text-gray-300 hover:text-indigo-600 p-1" title="Sửa câu hỏi này"><Edit2 className="h-3.5 w-3.5" /></button>
                                        <button onClick={() => removeQuestion(q.id)} className="text-gray-300 hover:text-red-500 p-1" title="Xóa bỏ"><Trash2 className="h-3.5 w-3.5" /></button>
                                    </div>
                                    <div className="flex gap-2 items-start">
                                        <span className="flex-shrink-0 w-7 h-7 bg-emerald-50 rounded-full flex items-center justify-center font-bold text-emerald-600 text-xs">{idx + 1}</span>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start pr-12 mb-1">
                                                 <p className="text-gray-900 text-sm font-medium">
                                                     <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{wrapMath(q.content)}</ReactMarkdown>
                                                 </p>
                                                <div className="flex gap-1">
                                                    {q.level && <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{q.level}</span>}
                                                    <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{getTypeLabel(q.type)}</span>
                                                </div>
                                            </div>
                                            {q.options && q.options.length > 0 && (
                                                <div className="grid grid-cols-2 gap-1.5 mt-1">
                                                    {q.options.map((opt, i) => (
                                                        <div key={i} className={`px-2 py-1 rounded text-xs ${q.correctOptionIndex === i ? 'bg-green-50 border border-green-200 text-green-800 font-bold' : 'bg-gray-50 text-gray-600'}`}>
                                                            <div className="flex gap-1">
                                                                <span className="flex-shrink-0">{String.fromCharCode(65 + i)}.</span>
                                                                 <div className="flex-1">
                                                                     <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{wrapMath(opt)}</ReactMarkdown>
                                                                 </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {editingQuestion && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                            <h3 className="font-bold text-lg text-gray-800">Chỉnh sửa câu hỏi</h3>
                            <button onClick={() => setEditingQuestion(null)} className="hover:bg-gray-100 p-2 rounded-full"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nội dung câu hỏi</label>
                                <textarea value={editingQuestion.content}
                                    onChange={e => setEditingQuestion({ ...editingQuestion, content: e.target.value })}
                                    className="w-full border rounded-lg p-3 bg-white text-gray-900 h-24 focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Các lựa chọn</label>
                                {editingQuestion.options.map((opt, i) => (
                                    <div key={i} className="flex items-center gap-2 mb-2">
                                        <input type="radio" name="correctOpt" checked={editingQuestion.correctOptionIndex === i}
                                            onChange={() => setEditingQuestion({ ...editingQuestion, correctOptionIndex: i })}
                                            className="w-4 h-4 text-green-600" />
                                        <span className="font-bold w-6">{String.fromCharCode(65 + i)}.</span>
                                            <div className="flex-1 space-y-1">
                                                <input value={opt}
                                                    onChange={e => {
                                                        const newOpts = [...editingQuestion.options];
                                                        newOpts[i] = e.target.value;
                                                        setEditingQuestion({ ...editingQuestion, options: newOpts });
                                                    }}
                                                    className="w-full border rounded-lg p-2 text-sm bg-white focus:ring-1 focus:ring-emerald-500 outline-none" />
                                                 <div className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-dashed truncate max-w-full">
                                                     Xem trước: <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{wrapMath(opt)}</ReactMarkdown>
                                                 </div>
                                            </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-5 border-t flex justify-end gap-2 bg-gray-50">
                            <button onClick={() => setEditingQuestion(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">Hủy</button>
                            <button onClick={saveEditedQuestion} className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700">Lưu</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Print */}
            {printType && (
                <PrintableContent type={printType} questions={questions} title={title} subject={subject} grade={grade} duration={duration} />
            )}
        </div>
    );
};

import React, { useState } from 'react';
import { useStore } from '../store';
import { parseQuestionsFromText, generateQuestionsByTopic } from '../services/geminiService';
import { parseQuestionsLocal } from '../utils/localParser';
import { Question, QuestionType, ExamDifficulty } from '../types';
import { Save, AlertCircle, FileText, Printer, ChevronDown, BarChart3, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PrintableContent } from '../components/PrintableContent';
import { ExamGeneralConfig } from '../components/exam/ExamGeneralConfig';
import { ExamContentInput } from '../components/exam/ExamContentInput';
import { ExamQuestionPreview } from '../components/exam/ExamQuestionPreview';
import { ExamQuestionEditModal } from '../components/exam/ExamQuestionEditModal';

type CreateMode = 'PARSE' | 'GENERATE' | 'MATRIX';
type PrintType = 'MATRIX' | 'EXAM' | 'ALL';

export const ExamCreate: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addExam, updateExam, exams } = useStore();

  const searchParams = new URLSearchParams(location.search);
  const editExamId = searchParams.get('edit');
  const [isEditMode, setIsEditMode] = useState(false);

  // Basic Info - Default for Primary School
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(35); // Default 35 mins
  const [subject, setSubject] = useState('Toán'); // Default Toán
  const [topic, setTopic] = useState(''); // New topic field
  const [grade, setGrade] = useState('5'); // Default Grade 5
  const [difficulty, setDifficulty] = useState<ExamDifficulty>('NHAN_BIET');
  const [examCategory, setExamCategory] = useState<'EXAM' | 'TASK'>('TASK');

  // Save Settings
  const [saveTarget, setSaveTarget] = useState<'BANK' | 'CLASS'>('BANK');
  const [targetClassId, setTargetClassId] = useState('');

  // Mode & Data
  const [mode, setMode] = useState<CreateMode>('PARSE');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit Question State
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Print Mode
  const [printType, setPrintType] = useState<PrintType | null>(null);

  // Save to Bank checkbox
  const [saveToBank, setSaveToBank] = useState(true);

  // Parse Mode State
  const [rawText, setRawText] = useState('');

  // Generate Mode State
  const [aiQuestionType, setAiQuestionType] = useState<QuestionType>('MCQ');
  const [aiCount, setAiCount] = useState(5);
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');

  // Helper to map enum to readable string for AI
  const getDifficultyDescription = (diff: ExamDifficulty) => {
    switch (diff) {
      case 'NHAN_BIET': return 'Mức 1 (Nhận biết - Nhắc lại)';
      case 'KET_NOI': return 'Mức 2 (Kết nối)';
      case 'VAN_DUNG': return 'Mức 3 (Vận dụng - Giải quyết vấn đề)';
      default: return 'Mức 1 (Nhận biết)';
    }
  };

  React.useEffect(() => {
    if (editExamId) {
      const examToEdit = exams.find(e => e.id === editExamId);
      if (examToEdit) {
        setIsEditMode(true);
        setTitle(examToEdit.title);
        setSubject(examToEdit.subject || 'Toán');
        setTopic(examToEdit.topic || '');
        setGrade(examToEdit.grade || '5');
        setDifficulty(examToEdit.difficulty || 'NHAN_BIET');
        setExamCategory(examToEdit.category || 'EXAM');
        setDuration(examToEdit.durationMinutes);
        setQuestions(JSON.parse(JSON.stringify(examToEdit.questions))); // Deep copy

        // Also figure out save target based on classId
        if (examToEdit.classId) {
          setSaveTarget('CLASS');
          setTargetClassId(examToEdit.classId);
        } else {
          setSaveTarget('BANK');
        }
      }
    }
  }, [editExamId, exams]);

  // Handlers
  // --- Tách câu hỏi LOCAL (regex, không cần AI) ---
  const handleParseLocal = () => {
    if (!rawText.trim()) return;
    setError(null);
    const parsed = parseQuestionsLocal(rawText);
    if (parsed.length === 0) {
      setError("Không tìm thấy câu hỏi theo format chuẩn. Hãy thử nút \"✨ AI Tách\" hoặc kiểm tra lại định dạng (Câu 1:, A., B., C., D., Đáp án: X).");
    } else {
      setQuestions(prev => [...prev, ...parsed]);
    }
  };

  // --- Tách câu hỏi bằng AI (cần API Key + Internet) ---
  const handleParseAI = async () => {
    if (!rawText.trim()) return;
    setIsProcessing(true);
    setError(null);
    try {
      const parsed = await parseQuestionsFromText(rawText);
      if (parsed.length === 0) {
        setError("AI không tìm thấy câu hỏi nào trong văn bản. Vui lòng kiểm tra định dạng nhập liệu.");
      } else {
        setQuestions(prev => [...prev, ...parsed]);
      }
    } catch (err: any) {
      const detail = err?.message || '';
      if (detail.includes('API Key') || detail.includes('API_KEY') || detail.includes('Chưa cấu hình')) {
        setError("Lỗi API Key: Vui lòng vào Cài đặt → tab 🔑 API Key để nhập Google Gemini API Key.");
      } else if (detail.includes('quota') || detail.includes('429') || detail.includes('RESOURCE_EXHAUSTED')) {
        setError("AI đang quá tải (hết quota). Vui lòng thử lại sau vài phút hoặc dùng nút \"Tách câu hỏi\" (không cần AI).");
      } else if (detail.includes('network') || detail.includes('fetch') || detail.includes('Failed to fetch')) {
        setError("Lỗi mạng: Không thể kết nối đến AI. Kiểm tra kết nối internet hoặc dùng nút \"Tách câu hỏi\" (không cần AI).");
      } else {
        setError(`Không thể tách câu hỏi: ${detail || 'Lỗi không xác định. Vui lòng thử lại.'}`);
      }
      console.error("[ExamCreate] handleParseAI error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Vui lòng nhập Chủ đề / Nội dung kiến thức ở phần Cấu hình chung.");
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      // Append Subject to Topic for better context
      const fullTopic = `${subject}: ${topic}`;
      const diffDesc = getDifficultyDescription(difficulty);

      const generated = await generateQuestionsByTopic(
        fullTopic,
        grade, // Use Global Grade
        aiQuestionType,
        diffDesc, // Use Global Difficulty
        aiCount,
        aiCustomPrompt
      );
      setQuestions(prev => [...prev, ...generated]);
    } catch (err: any) {
      const detail = err?.message || '';
      if (detail.includes('API Key') || detail.includes('API_KEY')) {
        setError("Lỗi API Key: Vui lòng kiểm tra cài đặt API Key trong Cài đặt.");
      } else if (detail.includes('quota') || detail.includes('429')) {
        setError("AI đang quá tải (hết quota). Vui lòng thử lại sau vài phút.");
      } else if (detail.includes('network') || detail.includes('fetch')) {
        setError("Lỗi mạng: Không thể kết nối đến AI. Kiểm tra kết nối internet.");
      } else {
        setError(`AI không thể tạo câu hỏi: ${detail || 'Lỗi không xác định. Vui lòng thử lại.'}`);
      }
      console.error("[ExamCreate] handleGenerate error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveExam = async () => {
    if (!title.trim() || questions.length === 0) {
      setError("Vui lòng nhập tên bài tập và có ít nhất 1 câu hỏi.");
      return;
    }
    if (!subject || !grade) {
      setError("Vui lòng chọn Môn học và Khối lớp.");
      return;
    }

    if (saveTarget === 'CLASS' && !targetClassId) {
      setError("Vui lòng chọn lớp để giao bài.");
      return;
    }

    // Check for duplicate title
    const isDuplicate = exams.some(e => 
      e.title.trim().toLowerCase() === title.trim().toLowerCase() && 
      (!isEditMode || e.id !== editExamId) &&
      !e.deletedAt
    );

    if (isDuplicate) {
      const confirmSave = window.confirm(`Tên bài tập "${title.trim()}" đã tồn tại trong kho đề của bạn. Bạn có chắc chắn muốn lưu trùng tên không?`);
      if (!confirmSave) return;
    }

    if (isEditMode && editExamId) {
      // Update logic
      const updatedExam = exams.find(e => e.id === editExamId);
      if (updatedExam) {
        updateExam({
          ...updatedExam,
          title,
          subject,
          topic: topic.trim() || undefined,
          grade,
          difficulty,
          category: examCategory,
          durationMinutes: duration,
          questionCount: questions.length,
          classId: saveTarget === 'CLASS' ? targetClassId : undefined,
          questions
        });
        navigate('/exams');
        return;
      }
    }

    const newExam = {
      id: `exam_${Date.now()}`,
      title,
      subject,
      topic: topic.trim() || undefined,
      grade,
      difficulty,
      category: examCategory,
      durationMinutes: duration,
      questionCount: questions.length,
      createdAt: new Date().toISOString(),
      status: 'PUBLISHED' as const,
      classId: saveTarget === 'CLASS' ? targetClassId : undefined, // undefined = Public Bank
      questions
    };

    await addExam(newExam);
    navigate('/exams');
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const openEditModal = (q: Question) => {
    setEditingQuestion({ ...q }); // clone to avoid direct mutation
  };

  const saveEditedQuestion = () => {
    if (!editingQuestion) return;
    setQuestions(questions.map(q => q.id === editingQuestion.id ? editingQuestion : q));
    setEditingQuestion(null);
  };

  const addManualQuestion = () => {
    const newQ: Question = {
      id: `manual_${Date.now()}`,
      type: 'MCQ',
      content: 'Câu hỏi mới...',
      options: ['A', 'B', 'C', 'D'],
      correctOptionIndex: 0,
      solution: '',
      hint: '',
      level: undefined,
      topic: topic || undefined
    };
    setQuestions(prev => [...prev, newQ]);
    setEditingQuestion(newQ);
  };

  const handlePrint = (type: PrintType) => {
    setPrintType(type);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Chỉnh sửa Bài Tập' : 'Tạo Bài Tập Mới'}</h1>
          <p className="text-gray-500">{isEditMode ? 'Quản lý nội dung câu hỏi và cấu hình Bài Tập.' : 'Soạn thảo, upload file hoặc nhờ AI tạo Bài Tập tự động.'}</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-gray-200 p-1 rounded-lg">
            <button
              onClick={() => setMode('PARSE')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all ${mode === 'PARSE' ? 'bg-white shadow text-indigo-700' : 'text-gray-600'}`}
            >
              <FileText className="h-4 w-4" /> Tách từ File
            </button>
            <button
              onClick={() => setMode('GENERATE')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all ${mode === 'GENERATE' ? 'bg-white shadow text-purple-700' : 'text-gray-600'}`}
            >
              <Sparkles className="h-4 w-4" /> AI Tạo Bài Tập
            </button>
          </div>

          {/* Nút Xuất File */}
          {questions.length > 0 && (
            <div className="relative group">
              <button className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm">
                <Printer className="h-4 w-4" />
                Xuất File <ChevronDown className="h-3 w-3" />
              </button>
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                <button onClick={() => handlePrint('MATRIX')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2"><BarChart3 className="h-4 w-4" /> 1. In Ma trận</button>
                <button onClick={() => handlePrint('EXAM')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2"><FileText className="h-4 w-4" /> 2. In Đề KT</button>
                <button onClick={() => handlePrint('ALL')} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-bold flex items-center gap-2"><Printer className="h-4 w-4" /> 3. In Ma trận & Đề</button>
              </div>
            </div>
          )}

          <button
            onClick={handleSaveExam}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm"
          >
            <Save className="h-4 w-4" />
            Lưu & Xuất Bản
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 mb-4 text-sm animate-fade-in">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* LEFT COLUMN: Config & Input */}
        <div className="lg:col-span-5 flex flex-col gap-4 h-full overflow-y-auto pr-1">

          {/* 1. General Info */}
          <ExamGeneralConfig
            title={title} setTitle={setTitle}
            subject={subject} setSubject={setSubject}
            grade={grade} setGrade={setGrade}
            topic={topic} setTopic={setTopic}
            difficulty={difficulty} setDifficulty={setDifficulty}
            examCategory={examCategory} setExamCategory={setExamCategory}
            duration={duration} setDuration={setDuration}
            saveTarget={saveTarget} setSaveTarget={setSaveTarget}
            targetClassId={targetClassId} setTargetClassId={setTargetClassId}
            saveToBank={saveToBank} setSaveToBank={setSaveToBank}
          />

          {/* 2. Content Input (Parse or Generate) */}
          <ExamContentInput
            mode={mode}
            rawText={rawText} setRawText={setRawText}
            aiQuestionType={aiQuestionType} setAiQuestionType={setAiQuestionType}
            aiCount={aiCount} setAiCount={setAiCount}
            aiCustomPrompt={aiCustomPrompt} setAiCustomPrompt={setAiCustomPrompt}
            isProcessing={isProcessing}
            topic={topic}
            grade={grade}
            difficulty={difficulty}
            handleParseLocal={handleParseLocal}
            handleParseAI={handleParseAI}
            handleGenerate={handleGenerate}
          />
        </div>

        {/* RIGHT COLUMN: Preview */}
        <div className="lg:col-span-7 bg-white rounded-xl border shadow-sm flex flex-col h-full overflow-hidden">
          <ExamQuestionPreview
            questions={questions}
            setQuestions={setQuestions}
            openEditModal={openEditModal}
            removeQuestion={removeQuestion}
            addManualQuestion={addManualQuestion}
          />
        </div>
      </div>

      {/* Edit Modal */}
      {editingQuestion && (
        <ExamQuestionEditModal
          editingQuestion={editingQuestion}
          setEditingQuestion={setEditingQuestion}
          saveEditedQuestion={saveEditedQuestion}
        />
      )}

      {/* Vùng in ẩn, chỉ xuất hiện trên giấy */}
      {printType && (
        <PrintableContent
          type={printType}
          questions={questions}
          title={title}
          subject={subject}
          grade={grade}
          duration={duration}
          schoolName={undefined}
          academicYear={undefined}
        />
      )}
    </div>
  );
};
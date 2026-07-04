import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, FileText, ChevronRight, Send, Radio, Search, Filter, Calendar, BookOpen, GraduationCap, X, Layers, BarChart3, HelpCircle, LineChart, Edit2, Trash2, RotateCcw, Save, Plus, AlertCircle, BrainCircuit, Lightbulb, Bookmark, Share2 } from 'lucide-react';
import { AssignModal } from '../components/AssignModal';
import { ShareExamModal } from '../components/ShareExamModal';
import { Exam, LiveSession, QuestionType, ExamDifficulty, Question } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';



export const ExamList: React.FC = () => {
  const { exams, assignments, user, classes, attempts, createLiveSession, updateExam, softDeleteExam, restoreExam, bulkUpdateTopic, bulkDeleteTopic, customTopics, addCustomTopic, fetchExams, fetchClasses, fetchAssignments, fetchAttempts } = useStore();

  useEffect(() => {
    if (user) {
      fetchExams();
      fetchClasses();
      fetchAssignments();
      fetchAttempts();
    }
  }, [user, fetchExams, fetchClasses, fetchAssignments, fetchAttempts]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<{ old: string, new: string } | null>(null);
  const [newTopicName, setNewTopicName] = useState('');
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [importCode, setImportCode] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const { importExamByCode } = useStore();
  const navigate = useNavigate();

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterDuration, setFilterDuration] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterQuestionType, setFilterQuestionType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showTrash, setShowTrash] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const subjects = ['Toán', 'Tiếng Việt', 'Khoa học', 'Lịch sử và Địa lí', 'Công nghệ', 'Tiếng Anh', 'Tin học'];
  const grades = ['1', '2', '3', '4', '5'];
  const allTopics = useMemo(() => {
    const examTopics = exams
      .filter(e => !e.deletedAt && (filterSubject ? e.subject === filterSubject : true))
      .map(e => e.topic)
      .filter(Boolean);
    return Array.from(new Set([...examTopics, ...customTopics])) as string[];
  }, [exams, customTopics, filterSubject]);

  const handleOpenAssign = (exam: Exam) => {
    setSelectedExam(exam);
    setAssignModalOpen(true);
  };

  const handleHostLive = (exam: Exam) => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6 digit PIN
    const newSession: LiveSession = {
      id: pin,
      examId: exam.id,
      teacherId: user?.id || '',
      status: 'WAITING',
      participants: [],
      createdAt: new Date().toISOString()
    };
    createLiveSession(newSession);
    navigate(`/live/host/${pin}`);
  };

  const handleOpenShare = (exam: Exam) => {
    setSelectedExam(exam);
    setShareModalOpen(true);
  };

  const handleImport = async () => {
    if (!importCode.trim()) return;
    setIsImporting(true);
    const newId = await importExamByCode(importCode.trim());
    setIsImporting(false);
    if (newId) {
      setImportModalOpen(false);
      setImportCode('');
      // Show success or just let the list refresh
    } else {
      alert("Mã chia sẻ không hợp lệ hoặc đã hết hạn.");
    }
  };

  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      // Exclude soft-deleted exams from main view
      if (exam.deletedAt) return false;

      const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSubject = filterSubject ? exam.subject === filterSubject : true;
      const matchesGrade = filterGrade ? exam.grade === filterGrade : true;
      const matchesTopic = filterTopic ? exam.topic === filterTopic : true;
      const matchesDate = filterDate ? exam.createdAt.startsWith(filterDate) : true;
      const matchesDifficulty = filterDifficulty ? exam.difficulty === filterDifficulty : true;
      const matchesCategory = filterCategory ? exam.category === filterCategory : true;

      let matchesDuration = true;
      if (filterDuration) {
        if (filterDuration === '<15') matchesDuration = exam.durationMinutes < 15;
        else if (filterDuration === '15-45') matchesDuration = exam.durationMinutes >= 15 && exam.durationMinutes <= 45;
        else if (filterDuration === '>45') matchesDuration = exam.durationMinutes > 45;
      }

      let matchesType = true;
      if (filterQuestionType) {
        // Check if any question in exam matches the selected type
        matchesType = exam.questions.some(q => q.type === filterQuestionType);
      }

      return matchesSearch && matchesSubject && matchesGrade && matchesTopic && matchesDate && matchesDuration && matchesDifficulty && matchesType && matchesCategory;
    });
  }, [exams, searchTerm, filterSubject, filterGrade, filterTopic, filterDate, filterDuration, filterDifficulty, filterQuestionType, filterCategory]);

  const trashedExams = useMemo(() => exams.filter(e => e.deletedAt), [exams]);

  const getDifficultyLabel = (diff: ExamDifficulty | undefined) => {
    switch (diff) {
      case 'NHAN_BIET': return { label: 'Mức 1', color: 'bg-green-100 text-green-700' };
      case 'KET_NOI': return { label: 'Mức 2', color: 'bg-yellow-100 text-yellow-700' };
      case 'VAN_DUNG': return { label: 'Mức 3', color: 'bg-red-100 text-red-700' };
      default: return { label: 'Khác', color: 'bg-gray-100 text-gray-500' };
    }
  };

  const getCategoryLabel = (cat: 'EXAM' | 'TASK' | undefined) => {
    if (cat === 'TASK') return { label: 'NHIỆM VỤ', color: 'bg-amber-500 text-white shadow-sm' };
    return { label: 'ĐỀ KT', color: 'bg-indigo-600 text-white shadow-sm' };
  };

  const handleStartEdit = (exam: Exam) => {
    if (exam.category === 'EXAM') {
      navigate(`/exam-matrix?edit=${exam.id}`);
    } else {
      navigate(`/create-exam?edit=${exam.id}`);
    }
  };

  // --- STUDENT VIEW: Show Assignments ---
  if (user?.role === 'STUDENT') {
    // 1. Get student's classes
    const myClassIds = classes
      .filter(c => c.studentIds.includes(user.id))
      .map(c => c.id);

    // 2. Filter assignments for these classes AND specific student
    const myAssignments = assignments
      .filter(a => myClassIds.includes(a.classId) && (!a.studentIds || a.studentIds.length === 0 || a.studentIds.includes(user.id)))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Bài tập & Thi cử</h1>
          <Link to="/live/join" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-indigo-700 flex items-center gap-2 whitespace-nowrap">
            <Radio className="h-4 w-4" /> Nhập mã PIN (Thi Live)
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800 shadow-sm overflow-hidden">
          {myAssignments.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-slate-400">
              Bạn chưa có bài tập nào được giao.
            </div>
          ) : (
            <div className="divide-y dark:divide-slate-800">
              {myAssignments.map((assign) => {
                const exam = exams.find(e => e.id === assign.examId);
                const cls = classes.find(c => c.id === assign.classId);
                if (!exam) return null;

                // Check Time
                const now = new Date();
                const start = assign.startTime ? new Date(assign.startTime) : null;
                const end = assign.endTime ? new Date(assign.endTime) : null;

                const isUpcoming = start && now < start;
                const isExpired = end && now > end;
                const isAvailable = !isUpcoming && !isExpired;

                // Count attempts for this assignment
                const myAttemptsForAssign = attempts.filter(att => att.assignmentId === assign.id && att.studentId === user!.id);
                const attemptCount = myAttemptsForAssign.length;
                const maxAttempts = assign.settings?.maxAttempts || 0;
                const isExhausted = maxAttempts > 0 && attemptCount >= maxAttempts;

                return (
                  <div key={assign.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex gap-4">
                      <div className={`h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0
                        ${isAvailable ? 'bg-indigo-500' : isUpcoming ? 'bg-yellow-500' : 'bg-gray-400'}
                      `}>
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-slate-100">{exam.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {(assign.durationMinutes || exam.durationMinutes || 0)} phút
                          </span>
                          <span>• Lớp {cls?.name}</span>
                          {assign.settings && typeof assign.settings.maxAttempts === 'number' && (
                            <span>• {assign.settings.maxAttempts === 0 ? 'Làm vô số lần' : `Được làm ${assign.settings.maxAttempts} lần`}</span>
                          )}
                          {assign.endTime && (
                            <span className={isExpired ? 'text-red-500 dark:text-red-400 font-medium' : ''}>
                              • Hạn chót: {new Date(assign.endTime).toLocaleString('vi-VN')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isAvailable ? (
                      isExhausted ? (
                        <Link
                          to="/student/history"
                          className="flex items-center justify-center gap-1 px-4 py-2 text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 shadow-sm whitespace-nowrap"
                        >
                          Hết lượt, xem kết quả <ChevronRight className="h-4 w-4" />
                        </Link>
                      ) : (
                        <Link
                          to={`/exam/${exam.id}/take?assign=${assign.id}`}
                          className="flex items-center justify-center gap-1 px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm whitespace-nowrap"
                        >
                          Làm bài ngay <ChevronRight className="h-4 w-4" />
                        </Link>
                      )
                    ) : (
                      <button disabled className="px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 rounded-lg whitespace-nowrap">
                        {isUpcoming ? 'Chưa mở' : 'Đã kết thúc'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- TEACHER / ADMIN VIEW: Show Question Bank + Assign Button ---
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Kho Đề KT & Nhiệm vụ</h1>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Tìm kiếm bài tập..."
              className="w-full pl-10 pr-4 py-2 border dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border transition-colors ${showFilters ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-800'}`}
            title="Lọc bài tập"
          >
            <Filter className="h-5 w-5" />
          </button>
          <button
            onClick={() => setTopicModalOpen(true)}
            className="p-2 rounded-lg border bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-800"
            title="Quản lý chủ đề"
          >
            <Layers className="h-5 w-5" />
          </button>
          <button
            onClick={() => setImportModalOpen(true)}
            className="p-2 rounded-lg border bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1 text-sm font-bold border-indigo-600"
            title="Nhập đề từ mã chia sẻ"
          >
            <Plus className="h-4 w-4" /> Nhập đề
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border dark:border-slate-800 shadow-sm mb-6 animate-in slide-in-from-top-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
            {/* 1. Subject */}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">Môn học</label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                <select
                  value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 border dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 outline-none focus:border-indigo-500 appearance-none"
                >
                  <option value="">Tất cả</option>
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            {/* 2. Grade */}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">Khối lớp</label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                <select
                  value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 border dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 outline-none focus:border-indigo-500 appearance-none"
                >
                  <option value="">Tất cả</option>
                  {grades.map(g => <option key={g} value={g}>Lớp {g}</option>)}
                </select>
              </div>
            </div>
            {/* 3. Difficulty */}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">Mức độ</label>
              <div className="relative">
                <BarChart3 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                <select
                  value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 border dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 outline-none focus:border-indigo-500 appearance-none"
                >
                  <option value="">Tất cả</option>
                  <option value="NHAN_BIET">Mức 1</option>
                  <option value="KET_NOI">Mức 2</option>
                  <option value="VAN_DUNG">Mức 3</option>
                </select>
              </div>
            </div>
            {/* 3.5 Topic */}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">C.Đề / Nội dung</label>
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                <select
                  value={filterTopic} onChange={e => setFilterTopic(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 border dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 outline-none focus:border-indigo-500 appearance-none"
                >
                  <option value="">Tất cả</option>
                  {allTopics.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            {/* 4. Duration */}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">Thời gian</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                <select
                  value={filterDuration} onChange={e => setFilterDuration(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 border dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 outline-none focus:border-indigo-500 appearance-none"
                >
                  <option value="">Tất cả</option>
                  <option value="<15">&lt; 15 phút</option>
                  <option value="15-45">15 - 45 phút</option>
                  <option value=">45">&gt; 45 phút</option>
                </select>
              </div>
            </div>
            {/* 5. Question Type */}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">Loại câu hỏi</label>
              <div className="relative">
                <HelpCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                <select
                  value={filterQuestionType} onChange={e => setFilterQuestionType(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 border dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 outline-none focus:border-indigo-500 appearance-none"
                >
                  <option value="">Tất cả</option>
                  <option value="MCQ">Trắc nghiệm (4 LC)</option>
                  <option value="MATCHING">Nối cột</option>
                  <option value="ORDERING">Sắp xếp</option>
                  <option value="SHORT_ANSWER">Tự luận</option>
                  <option value="WORD_CLASSIFY">Phân loại từ</option>
                  <option value="FILL_IN_PASSAGE">Điền vào đoạn văn</option>
                </select>
              </div>
            </div>
            {/* 6. Date */}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">Ngày tạo</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                <input
                  type="date"
                  value={filterDate} onChange={e => setFilterDate(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 border dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            {/* 7. Category */}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">Loại bộ đề</label>
              <div className="relative">
                <Bookmark className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                <select
                  value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 border dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 outline-none focus:border-indigo-500 appearance-none font-bold"
                >
                  <option value="">Tất cả</option>
                  <option value="EXAM" className="text-indigo-600 dark:text-indigo-400">ĐỀ KT</option>
                  <option value="TASK" className="text-amber-600 dark:text-amber-400">NHIỆM VỤ</option>
                </select>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t dark:border-slate-800 flex justify-end">
            <button
              onClick={() => {
                setFilterSubject(''); setFilterGrade(''); setFilterDate(''); setFilterTopic('');
                setSearchTerm(''); setFilterDuration(''); setFilterDifficulty(''); setFilterQuestionType('');
              }}
              className="text-xs text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
            >
              <X className="h-3 w-3" /> Xóa bộ lọc
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredExams.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-slate-400">
            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-slate-600" />
            <p className="text-lg font-medium">Không tìm thấy bài tập nào.</p>
            <p className="text-sm">Thử thay đổi bộ lọc hoặc tạo bài tập mới.</p>
          </div>
        ) : (
          <div className="divide-y dark:divide-slate-800">
            {filteredExams.map((exam) => {
                const examAssignments = assignments.filter(a => a.examId === exam.id);
                // Tìm bản giao bài mới nhất
                const latestAssign = examAssignments.length > 0 
                  ? [...examAssignments].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
                  : null;

                const assignCount = examAssignments.length;
                const now = new Date();
                const isCurrentlyAssigning = examAssignments.some(a => {
                  const start = a.startTime ? new Date(a.startTime) : null;
                  const end = a.endTime ? new Date(a.endTime) : null;
                  return (!start || now >= start) && (!end || now <= end);
                });

                return (
                  <div key={exam.id} className="p-5 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between group gap-4">
                    <div className="flex gap-4">
                      <div className="h-14 w-14 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl flex flex-col items-center justify-center text-indigo-700 dark:text-indigo-300 flex-shrink-0">
                        <span className="text-xs font-bold uppercase">{exam.grade ? `Lớp ${exam.grade}` : 'K.Hợp'}</span>
                        <span className="text-[10px] text-gray-500 dark:text-slate-400">{exam.subject?.substring(0, 6) || 'Chung'}</span>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {(() => {
                            const { label, color } = getCategoryLabel(exam.category);
                            return (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider ${color}`}>
                                {label}
                              </span>
                            );
                          })()}
                          <h3 className="font-bold text-gray-900 dark:text-slate-100 text-lg hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer">{exam.title}</h3>
                          
                          {/* Assignment Status Badges */}
                          <div className="flex items-center gap-1">
                            {assignCount === 0 ? (
                              <span className="bg-pink-50 text-pink-700 px-2 py-0.5 rounded text-[10px] font-bold border border-pink-200">
                                CHƯA GIAO
                              </span>
                            ) : (
                              <>
                                <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold border border-green-200">
                                  ĐÃ GIAO {assignCount} LẦN
                                </span>
                                {latestAssign && latestAssign.settings && typeof latestAssign.settings.maxAttempts === 'number' && (
                                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-200" title="Số lần làm bài ở lần giao gần nhất">
                                    {latestAssign.settings.maxAttempts === 0 ? 'LÀM VÔ SỐ LẦN' : `${latestAssign.settings.maxAttempts} LẦN LÀM`}
                                  </span>
                                )}
                                {isCurrentlyAssigning && (
                                  <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm animate-pulse">
                                    ĐANG GIAO
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {(exam.durationMinutes || 0)} phút
                          </span>
                          <span className="flex items-center gap-1">
                            <Layers className="h-3 w-3" /> {exam.questionCount} câu
                          </span>
                          
                          {/* Hiển thị mốc thời gian Giao/Mở bài */}
                          {latestAssign ? (
                            <>
                              <span className="flex items-center gap-1.5" title="Mốc thời gian bạn thực hiện giao bài">
                                <Send className="h-3 w-3 text-indigo-500 dark:text-indigo-400" /> 
                                <span className="font-bold text-gray-700 dark:text-slate-300">Giao:</span> 
                                {new Date(latestAssign.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {latestAssign.startTime && (
                                <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded" title="Thời điểm bài thi bắt đầu mở cho học sinh">
                                  <Calendar className="h-3 w-3" /> 
                                  <span className="font-bold">Mở:</span> 
                                  {new Date(latestAssign.startTime).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="flex items-center gap-1" title="Ngày tạo đề thi">
                              <Calendar className="h-3 w-3" /> 
                              <span className="font-bold text-gray-700 dark:text-slate-300">Tạo:</span> {new Date(exam.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                          )}

                          {exam.subject && <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 px-2 py-0.5 rounded text-xs">{exam.subject}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto">
                  {(user?.role === 'TEACHER' || user?.role === 'ADMIN') && (
                    <>
                      {/* New Results Button */}
                      {/* New Results Button */}
                      <Link
                        to={`/exam/${exam.id}/results`}
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors border border-green-100 dark:border-green-900/30"
                        title="Xem kết quả và thống kê"
                      >
                        <LineChart className="h-4 w-4" /> <span className="hidden sm:inline">Kết quả</span>
                      </Link>

                      <button
                        onClick={() => handleHostLive(exam)}
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-pink-700 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/30 rounded-lg hover:bg-pink-100 dark:hover:bg-pink-900/40 transition-colors border border-pink-100 dark:border-pink-900/30"
                        title="Tổ chức thi Live (Tại lớp)"
                      >
                        <Radio className="h-4 w-4" /> <span className="hidden sm:inline">Tổ chức KT</span>
                      </button>
                      <button
                        onClick={() => handleOpenAssign(exam)}
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors border border-indigo-100 dark:border-indigo-900/30"
                        title="Giao bài tập về nhà"
                      >
                        <Send className="h-4 w-4" /> <span className="hidden sm:inline">Giao bài</span>
                      </button>
                      
                      {/* Sharing Button */}
                      <button
                        onClick={() => handleOpenShare(exam)}
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors border border-amber-100 dark:border-amber-900/30 shrink-0"
                        title="Chia sẻ đề thi"
                      >
                        <Share2 className="h-4 w-4" /> <span className="hidden sm:inline text-xs font-bold uppercase">Chia sẻ</span>
                      </button>
                    </>
                  )}
                  {/* Teachers/Admins can preview/try the exam */}
                  <Link
                    to={`/exam/${exam.id}/take`}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
                  >
                    Xem thử
                  </Link>
                  {(user?.role === 'TEACHER' || user?.role === 'ADMIN') && (
                    <>
                      <button
                        onClick={() => handleStartEdit(exam)}
                        className="p-2 text-gray-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                        title="Chỉnh sửa bài tập"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {deletingId === exam.id ? (
                        <div className="flex items-center gap-1 animate-fade-in">
                          <button onClick={() => { softDeleteExam(exam.id); setDeletingId(null); }}
                            className="px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-lg hover:bg-red-600">Xoá</button>
                          <button onClick={() => setDeletingId(null)}
                            className="px-2 py-1 text-xs text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">Huỷ</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(exam.id)}
                          className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                          title="Xoá bài tập (vào thùng rác)"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </>
                  )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Trash Section */}
      {(user?.role === 'TEACHER' || user?.role === 'ADMIN') && (
        <div className="mt-6">
          <button
            onClick={() => setShowTrash(!showTrash)}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 mb-3"
          >
            <Trash2 className="h-4 w-4" />
            Thùng rác ({trashedExams.length})
          </button>
          {showTrash && trashedExams.length > 0 && (
            <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 divide-y dark:divide-slate-800">
              {trashedExams.map(exam => (
                <div key={exam.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-500 dark:text-slate-400 truncate">{exam.title}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">Xoá: {new Date(exam.deletedAt!).toLocaleString('vi-VN')} • {exam.questionCount} câu</p>
                    </div>
                  </div>
                  <button
                    onClick={() => restoreExam(exam.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-900/30 whitespace-nowrap"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Khôi phục
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedExam && (
        <ShareExamModal
          exam={selectedExam}
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
        />
      )}

      {/* Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-2xl shadow-2xl w-full max-w-md animate-fade-in overflow-hidden border dark:border-slate-800">
              <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-950/50">
                 <h2 className="text-lg font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2">
                    <Plus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> Nhập đề từ mã chia sẻ
                 </h2>
                 <button onClick={() => setImportModalOpen(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg text-gray-500 dark:text-slate-400">
                    <X className="h-5 w-5" />
                 </button>
              </div>
              <div className="p-6 space-y-4">
                 <div className="bg-indigo-50 dark:bg-indigo-950/30 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-sm text-indigo-800 dark:text-indigo-300 flex gap-3">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <p>Nhập mã chia sẻ được đồng nghiệp cung cấp (Vd: AZ-123456) để tạo một bản sao đề thi vào tài khoản của bạn.</p>
                 </div>
                 
                 <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Mã chia sẻ (Share Code)</label>
                    <input 
                      type="text"
                      placeholder="AZ-XXXXXX"
                      className="w-full px-4 py-3 border-2 dark:border-slate-800 rounded-xl text-center font-mono text-xl font-black bg-white dark:bg-slate-950 text-indigo-700 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                      value={importCode}
                      onChange={(e) => setImportCode(e.target.value)}
                    />
                 </div>
                 
                 <button
                   onClick={handleImport}
                   disabled={isImporting || !importCode.trim()}
                   className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg transition-all disabled:opacity-50"
                 >
                   {isImporting ? 'Đang nhập đề...' : 'Tiếp tục'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Topic Management Modal */}
      {topicModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh] text-gray-900 dark:text-slate-100">
            <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-950/50">
              <h2 className="text-lg font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> Quản lý Chủ đề
              </h2>
              <button onClick={() => setTopicModalOpen(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg text-gray-500 dark:text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 italic">* Các thay đổi sẽ áp dụng cho tất cả bài tập thuộc chủ đề đó.</p>
              
              {/* Add New Topic Input */}
              <div className="flex gap-2 mb-4 p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                <input
                  type="text"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  placeholder="Nhập tên chủ đề mới..."
                  className="flex-1 px-3 py-2 border dark:border-slate-800 rounded-lg text-sm bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTopicName.trim()) {
                      addCustomTopic(newTopicName.trim());
                      setNewTopicName('');
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (newTopicName.trim()) {
                      addCustomTopic(newTopicName.trim());
                      setNewTopicName('');
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-1 shadow-sm"
                >
                  <Plus className="h-4 w-4" /> Thêm
                </button>
              </div>

              <div className="space-y-2">
                {allTopics.length === 0 ? (
                  <p className="text-center py-8 text-gray-400 dark:text-slate-500">Chưa có chủ đề nào.</p>
                ) : (
                  allTopics.map((topic: string) => (
                    <div key={topic} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-950/40 rounded-xl border border-gray-100 dark:border-slate-800 group">
                      {editingTopic?.old === topic ? (
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            value={editingTopic?.new || ''}
                            onChange={e => {
                                if (editingTopic) {
                                    setEditingTopic({ ...editingTopic, new: e.target.value });
                                }
                            }}
                            className="flex-1 px-3 py-1 border dark:border-slate-800 rounded-lg text-sm bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                            autoFocus
                          />
                          <button
                            onClick={async () => {
                              if (editingTopic && editingTopic.new.trim() && editingTopic.new !== topic) {
                                await bulkUpdateTopic(topic, editingTopic.new.trim());
                              }
                              setEditingTopic(null);
                            }}
                            className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg"
                          >
                            Lưu
                          </button>
                          <button onClick={() => setEditingTopic(null)} className="px-3 py-1 bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-300 text-xs font-bold rounded-lg">
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium text-gray-700 dark:text-slate-300">{topic}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditingTopic({ old: topic, new: topic })}
                              className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg"
                              title="Sửa tên chủ đề"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Bạn có chắc chắn muốn xóa chủ đề "${topic}"? (Chủ đề sẽ bị gỡ khỏi tất cả bài thi)`)) {
                                  await bulkDeleteTopic(topic);
                                }
                              }}
                              className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                              title="Xóa chủ đề"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="p-4 border-t dark:border-slate-800 bg-gray-50 dark:bg-slate-950/50 text-right">
              <button
                onClick={() => setTopicModalOpen(false)}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}



      {selectedExam && (
        <AssignModal
          exam={selectedExam}
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
        />
      )}
    </div>
  );
};
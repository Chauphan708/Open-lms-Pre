
import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { QuestionBankItem, QuestionType, ExamDifficulty } from '../types';
import { supabase } from '../services/supabaseClient';
import { 
  Search, Filter, Plus, Trash2, Edit2, Download, RefreshCw, 
  CheckCircle2, AlertCircle, Bookmark, Layers, GraduationCap, 
  HelpCircle, ChevronDown, Check, X, Save
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

const TYPE_LABELS: Record<QuestionType, string> = {
  MCQ: 'Trắc nghiệm',
  MATCHING: 'Nối cột',
  ORDERING: 'Sắp xếp',
  DRAG_DROP: 'Kéo thả',
  SHORT_ANSWER: 'Tự luận ngắn',
  MCQ_MULTIPLE: 'Trắc nghiệm nhiều đáp án'
};

const LEVEL_LABELS: Record<ExamDifficulty, string> = {
  NHAN_BIET: 'Nhận biết',
  KET_NOI: 'Kết nối',
  VAN_DUNG: 'Vận dụng'
};

const QuestionBank: React.FC = () => {
  const { questionBank, exams, customTopics, syncQuestionsFromExams, deleteQuestionFromBank, updateQuestionInBank, fetchInitialData } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterTopic, setFilterTopic] = useState('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ count: number; show: boolean }>({ count: 0, show: false });
  
  // Server-side State
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [topics, setTopics] = useState<string[]>([]);
  const itemsPerPage = 50;

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<QuestionBankItem>>({});

  const subjects = ['Toán', 'Tiếng Việt', 'Khoa học', 'Lịch sử và Địa lí', 'Công nghệ', 'Tiếng Anh', 'Tin học'];
  const grades = ['1', '2', '3', '4', '5'];

  // Fetch unique topics based on current subject filter
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        let query = supabase.from('question_bank').select('topic');
        if (filterSubject !== 'all') {
          query = query.eq('subject', filterSubject);
        }
        const { data } = await query;
        if (data) {
          const uniqueTopics = Array.from(new Set(data.map(d => d.topic).filter(Boolean))) as string[];
          setTopics(uniqueTopics.sort());
        }
      } catch (err) {
        console.error('Lỗi khi tải chủ đề:', err);
      }
    };
    fetchTopics();
  }, [filterSubject]);

  // Main questions fetcher
  const fetchQuestions = async () => {
    setLoading(true);
    try {
      let query = supabase.from('question_bank').select('*', { count: 'exact' });

      if (searchTerm) {
        query = query.ilike('content', `%${searchTerm}%`);
      }
      if (filterSubject !== 'all') {
        query = query.eq('subject', filterSubject);
      }
      if (filterGrade !== 'all') {
        query = query.eq('grade', filterGrade);
      }
      if (filterLevel !== 'all') {
        query = query.eq('level', filterLevel);
      }
      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }
      if (filterTopic !== 'all') {
        query = query.eq('topic', filterTopic);
      }

      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage - 1;
      query = query.range(start, end).order('created_at', { ascending: false });

      const { data, count, error } = await query;
      if (error) throw error;

      setQuestions((data as QuestionBankItem[]) || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Lỗi khi tải câu hỏi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [searchTerm, filterSubject, filterGrade, filterLevel, filterType, filterTopic, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterSubject, filterGrade, filterLevel, filterType, filterTopic]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const count = await syncQuestionsFromExams();
      setSyncResult({ count, show: true });
      fetchQuestions(); // Refresh list after sync
      setTimeout(() => setSyncResult(prev => ({ ...prev, show: false })), 3000);
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa câu hỏi này?")) {
      await deleteQuestionFromBank(id);
      fetchQuestions(); // Refresh current page
    }
  };

  const startEdit = (q: QuestionBankItem) => {
    setEditingId(q.id);
    setEditValues({ ...q });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleSaveEdit = async () => {
    if (editingId && editValues) {
      const success = await updateQuestionInBank(editValues as QuestionBankItem);
      if (success) {
        setEditingId(null);
        setEditValues({});
        fetchQuestions(); // Refresh current page after editing
      } else {
        alert("Lỗi khi cập nhật câu hỏi.");
      }
    }
  };

  const cleanMath = (text: string) => {
    if (!text) return '';
    return text
      .replace(/\$\$/g, '')
      .replace(/\$/g, '')
      .replace(/\\times/g, '×')
      .replace(/\\div/g, '÷')
      .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2')
      .replace(/\\sqrt\{([^{}]*)\}/g, '√($1)')
      .replace(/\^([23])/g, (match, p1) => p1 === '2' ? '²' : '³')
      .replace(/\\le/g, '≤')
      .replace(/\\ge/g, '≥')
      .replace(/\\neq/g, '≠')
      .replace(/\{,\}/g, ',') // Fix for decimal comma like 2{,}5
      .trim();
  };

  const handleDownloadDocx = async () => {
    if (questions.length === 0) {
      alert("Không có câu hỏi nào để tải về.");
      return;
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "NGÂN HÀNG CÂU HỎI",
                bold: true,
                size: 32,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Môn: ${filterSubject === 'all' ? 'Tất cả' : filterSubject} | Khối: ${filterGrade === 'all' ? 'Tất cả' : 'Lớp ' + filterGrade}`,
                italics: true,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          ...questions.flatMap((q, index) => {
            const elements: any[] = [];
            
            // Question main content
            elements.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `Câu ${index + 1}: `, bold: true }),
                  new TextRun({ text: cleanMath(q.content) }),
                ],
                spacing: { before: 200, after: 120 },
              })
            );

            // Handle different question types
            if (q.type === 'MCQ' && q.options) {
              elements.push(
                new Paragraph({
                  children: q.options.flatMap((opt, optIndex) => [
                    new TextRun({ 
                      text: `${String.fromCharCode(65 + optIndex)}. `, 
                      bold: true,
                      break: optIndex > 0 ? 1 : 0
                    }),
                    new TextRun({ text: cleanMath(opt) }),
                  ]),
                  indent: { left: 720 },
                  spacing: { after: 120 },
                })
              );
            } else if (q.type === 'MATCHING' && q.options) {
              const rows = q.options.map((opt) => {
                const [left, right] = opt.split('|||');
                return new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: cleanMath(left?.trim() || '') })] })],
                      width: { size: 40, type: WidthType.PERCENTAGE },
                      borders: {
                        top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
                        left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }
                      }
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: "" })], alignment: AlignmentType.CENTER })],
                      width: { size: 20, type: WidthType.PERCENTAGE },
                      borders: {
                        top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
                        left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }
                      }
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: cleanMath(right?.trim() || '') })], alignment: AlignmentType.RIGHT })],
                      width: { size: 40, type: WidthType.PERCENTAGE },
                      borders: {
                        top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
                        left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }
                      }
                    }),
                  ]
                });
              });

              elements.push(new Table({
                rows: rows,
                width: { size: 90, type: WidthType.PERCENTAGE },
                alignment: AlignmentType.CENTER,
                borders: {
                  top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
                  insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE }
                }
              }));

              elements.push(new Paragraph({ text: "", spacing: { after: 200 } }));
            } else if ((q.type === 'ORDERING' || q.type === 'DRAG_DROP') && q.options) {
              elements.push(
                new Paragraph({
                  children: [
                    new TextRun({ text: "Các phương án: ", italics: true }),
                    new TextRun({ text: q.options.map(o => cleanMath(o)).join('; ') }),
                  ],
                  indent: { left: 720 },
                })
              );
            } else if (q.type === 'SHORT_ANSWER') {
                elements.push(
                  new Paragraph({
                    children: [
                      new TextRun({ text: "(Tự luận: Học sinh ghi câu trả lời bên dưới)", italics: true, color: "999999" }),
                    ],
                    indent: { left: 720 },
                    spacing: { before: 100, after: 400 }
                  })
                );
            }

            // Topic info (Metadata)
            elements.push(
              new Paragraph({
                children: [
                  new TextRun({ 
                    text: `[Chủ đề: ${q.topic || 'Chưa phân loại'} | Loại: ${TYPE_LABELS[q.type]} | Mức độ: ${LEVEL_LABELS[q.level as ExamDifficulty] || 'N/A'}]`, 
                    size: 18, 
                    color: "666666" 
                  })
                ],
                spacing: { before: 100, after: 200 }
              })
            );

            return elements;
          }),
        ],
      }],
    });

    try {
      const blob = await Packer.toBlob(doc);
      const fileName = `NganHangCauHoi_${filterSubject !== 'all' ? filterSubject : 'TongHop'}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.docx`;
      saveAs(blob, fileName);
    } catch (error) {
      console.error("Export DOCX failed:", error);
      alert("Có lỗi xảy ra khi xuất file Word.");
    }
  };

  return (
    <div className="h-full flex flex-col p-4 space-y-4 bg-gray-50/50 dark:bg-slate-950/20">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
            <Layers className="h-6 w-6 text-emerald-600" /> Ngân hàng Câu hỏi
          </h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm">Quản lý và đồng bộ tập trung tất cả câu hỏi trong hệ thống</p>
          
          <div className="flex items-center gap-4 mt-2 text-xs font-medium">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-900/50">
              Hiển thị {questions.length} / {totalCount} câu hỏi
            </div>
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5" /> Đã lưu đám mây
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {syncResult.show && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 animate-bounce">
              <CheckCircle2 className="h-4 w-4" /> Đã đồng bộ thêm {syncResult.count} câu mới
            </div>
          )}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-white dark:bg-slate-900 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-50 dark:hover:bg-slate-800 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ từ Bài tập'}
          </button>
          <button
            onClick={handleDownloadDocx}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md"
          >
            <Download className="h-4 w-4" />
            Tải file Word
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="relative col-span-1 md:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo nội dung, chủ đề..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none text-gray-900 dark:text-slate-100"
          />
        </div>

        <select
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 text-gray-700 dark:text-slate-200 rounded-xl text-sm px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">Tất cả Môn</option>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={filterGrade}
          onChange={(e) => setFilterGrade(e.target.value)}
          className="bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 text-gray-700 dark:text-slate-200 rounded-xl text-sm px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">Tất cả</option>
          {grades.map(g => <option key={g} value={g}>Lớp {g}</option>)}
        </select>

              <label className="block text-xs font-bold text-gray-500 mb-1.5 dark:text-slate-400">Chủ đề</label>
              <select
                value={filterTopic}
                onChange={(e) => setFilterTopic(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Tất cả chủ đề</option>
                {topics.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 text-gray-700 dark:text-slate-200 rounded-xl text-sm px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">Tất cả Mức độ</option>
          <option value="NHAN_BIET">Nhận biết</option>
          <option value="KET_NOI">Kết nối</option>
          <option value="VAN_DUNG">Vận dụng</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 text-gray-700 dark:text-slate-200 rounded-xl text-sm px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">Tất cả Loại câu</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Main Table */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/80 dark:bg-slate-950/50 text-gray-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider sticky top-0 z-10 border-b dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Câu hỏi / Nội dung</th>
                <th className="px-4 py-4 w-32">Thông tin</th>
                <th className="px-4 py-4 w-32">Chủ đề</th>
                <th className="px-4 py-4 w-32 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800 text-gray-900 dark:text-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400 dark:text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="h-10 w-10 animate-spin text-emerald-600" />
                      <p>Đang tải dữ liệu từ máy chủ...</p>
                    </div>
                  </td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400 dark:text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <HelpCircle className="h-10 w-10 opacity-20" />
                      <p>Không tìm thấy câu hỏi nào phù hợp</p>
                    </div>
                  </td>
                </tr>
              ) : (
                questions.map((q) => {
                  const isEditing = editingId === q.id;
                  
                  return (
                    <tr key={q.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 align-top">
                        {isEditing ? (
                          <div className="space-y-3">
                            <textarea
                              value={editValues.content}
                              onChange={(e) => setEditValues({ ...editValues, content: e.target.value })}
                              className="w-full border dark:border-slate-800 rounded-lg p-2 text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100"
                            />
                            {(q.type === 'MCQ' || q.type === 'MCQ_MULTIPLE') && (
                              <div className="grid grid-cols-2 gap-2">
                                {editValues.options?.map((opt, i) => (
                                  <div key={i} className={`flex items-center gap-2 border dark:border-slate-800 rounded-lg p-2 ${
                                    q.type === 'MCQ_MULTIPLE'
                                      ? (editValues.correctOptionIndices?.includes(i) ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50' : '')
                                      : (editValues.correctOptionIndex === i ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50' : '')
                                  }`}>
                                    {q.type === 'MCQ_MULTIPLE' ? (
                                      <input
                                        type="checkbox"
                                        checked={editValues.correctOptionIndices?.includes(i) ?? false}
                                        onChange={() => {
                                          const cur = editValues.correctOptionIndices || [];
                                          const next = cur.includes(i) ? cur.filter(x => x !== i) : [...cur, i].sort();
                                          setEditValues({ ...editValues, correctOptionIndices: next });
                                        }}
                                      />
                                    ) : (
                                      <input
                                        type="radio"
                                        checked={editValues.correctOptionIndex === i}
                                        onChange={() => setEditValues({ ...editValues, correctOptionIndex: i })}
                                      />
                                    )}
                                    <input
                                      value={opt}
                                      onChange={(e) => {
                                        const newOpts = [...(editValues.options || [])];
                                        newOpts[i] = e.target.value;
                                        setEditValues({ ...editValues, options: newOpts });
                                      }}
                                      className="bg-transparent border-0 text-xs w-full outline-none text-gray-900 dark:text-slate-100"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2 mb-1">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      q.type === 'MCQ' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' : 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400'
                                  }`}>
                                      {TYPE_LABELS[q.type]}
                                  </span>
                                  {q.level && (
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                          q.level === 'NHAN_BIET' ? 'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400' : 
                                          q.level === 'KET_NOI' ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400' : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                                      }`}>
                                          {LEVEL_LABELS[q.level as ExamDifficulty] || q.level}
                                      </span>
                                  )}
                              </div>
                              <div className="text-gray-800 dark:text-slate-200 text-sm font-medium prose prose-sm dark:prose-invert max-w-none">
                                  <ReactMarkdown 
                                      remarkPlugins={[remarkMath]} 
                                      rehypePlugins={[rehypeKatex]}
                                  >
                                      {q.content}
                                  </ReactMarkdown>
                              </div>
                              {(q.type === 'MCQ' || q.type === 'MCQ_MULTIPLE') && (
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                {q.options?.map((opt, i) => {
                                  const isCorrectSingle = q.type === 'MCQ' && q.correctOptionIndex === i;
                                  const isCorrectMulti = q.type === 'MCQ_MULTIPLE' && (q.correctOptionIndices?.includes(i) ?? false);
                                  const isCorrect = isCorrectSingle || isCorrectMulti;
                                  return (
                                  <div key={i} className={`flex items-start gap-2 text-[11px] p-2 rounded-lg ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 font-medium ring-1 ring-emerald-300 dark:ring-emerald-800' : 'bg-gray-50 dark:bg-slate-950/40 text-gray-600 dark:text-slate-400'}`}>
                                    <span className="font-bold shrink-0 flex items-center gap-0.5">
                                      {String.fromCharCode(65 + i)}.
                                      {isCorrect && <span className="text-emerald-500">✓</span>}
                                    </span>
                                    <div className="prose prose-xs dark:prose-invert max-w-none">
                                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                            {opt}
                                        </ReactMarkdown>
                                    </div>
                                  </div>
                                  );
                                })}
                              </div>
                            )}
                            {q.type === 'MATCHING' && q.options && (
                              <div className="space-y-1 mt-2">
                                {q.options.map((opt, i) => {
                                  const [l, r] = opt.split('|||');
                                  return (
                                    <div key={i} className="flex items-center gap-3 text-[11px] bg-gray-50 dark:bg-slate-950/40 p-2 rounded-lg">
                                      <div className="flex-1 text-center border-r border-dashed border-gray-300 dark:border-slate-700 pr-2 prose prose-xs dark:prose-invert max-w-none">
                                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                            {l?.trim() || ''}
                                        </ReactMarkdown>
                                      </div>
                                      <div className="text-gray-400 dark:text-slate-500 shrink-0">... nối với ...</div>
                                      <div className="flex-1 text-center pl-2 prose prose-xs dark:prose-invert max-w-none">
                                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                            {r?.trim() || ''}
                                        </ReactMarkdown>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top text-xs">
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              placeholder="Môn"
                              value={editValues.subject}
                              onChange={(e) => setEditValues({ ...editValues, subject: e.target.value })}
                              className="w-full border dark:border-slate-800 rounded p-1 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100"
                            />
                            <input
                              placeholder="Lớp"
                              value={editValues.grade}
                              onChange={(e) => setEditValues({ ...editValues, grade: e.target.value })}
                              className="w-full border dark:border-slate-800 rounded p-1 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100"
                            />
                          </div>
                        ) : (
                          <div className="space-y-1 text-gray-500 dark:text-slate-400">
                            <div className="flex items-center gap-1"><BookMarked className="h-3 w-3" /> {q.subject}</div>
                            <div className="flex items-center gap-1"><GraduationCap className="h-3 w-3" /> Lớp {q.grade}</div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top">
                        {isEditing ? (
                          <input
                            placeholder="Chủ đề"
                            value={editValues.topic}
                            onChange={(e) => setEditValues({ ...editValues, topic: e.target.value })}
                            className="w-full border dark:border-slate-800 rounded p-1 text-xs bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100"
                          />
                        ) : (
                          <div className="text-xs text-gray-600 dark:text-slate-400 font-medium italic">{q.topic || '(Chưa phân loại)'}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-center justify-center gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={handleSaveEdit}
                                className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                title="Lưu"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-2 text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                title="Hủy"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(q)}
                                className="p-2 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                title="Sửa"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(q.id)}
                                className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                title="Xóa"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          
          {/* Pagination Controls */}
          {Math.ceil(totalCount / itemsPerPage) > 1 && (
            <div className="flex justify-between items-center px-6 py-4 bg-gray-50/50 dark:bg-slate-900/30 border-t dark:border-slate-800">
              <div className="text-xs text-gray-500 dark:text-slate-400">
                Hiển thị {Math.min(totalCount, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(totalCount, currentPage * itemsPerPage)} trong số {totalCount} câu hỏi
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || loading}
                  className="px-3.5 py-1.5 text-xs font-bold bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 text-gray-750 dark:text-slate-200 transition-colors"
                >
                  Trước
                </button>
                <span className="text-xs self-center font-bold text-gray-700 dark:text-slate-300">
                  Trang {currentPage} / {Math.ceil(totalCount / itemsPerPage)}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / itemsPerPage), prev + 1))}
                  disabled={currentPage === Math.ceil(totalCount / itemsPerPage) || loading}
                  className="px-3.5 py-1.5 text-xs font-bold bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 text-gray-750 dark:text-slate-200 transition-colors"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Simple Icon fallback logic
const BookMarked = Bookmark;

export default QuestionBank;

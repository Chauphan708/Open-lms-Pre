
import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { QuestionBankItem, QuestionType, ExamDifficulty } from '../types';
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
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<QuestionBankItem>>({});

  const subjects = ['Toán', 'Tiếng Việt', 'Khoa học', 'Lịch sử và Địa lí', 'Công nghệ', 'Tiếng Anh', 'Tin học'];
  const grades = ['1', '2', '3', '4', '5'];
  const allTopics = React.useMemo(() => {
    const qBankTopics = questionBank
      .filter(q => filterSubject === 'all' || q.subject === filterSubject)
      .map(q => q.topic)
      .filter(Boolean);
    const examTopics = (exams || [])
      .filter(e => !e.deletedAt && (filterSubject === 'all' || e.subject === filterSubject))
      .map(e => e.topic)
      .filter(Boolean);
    return Array.from(new Set([...qBankTopics, ...examTopics, ...(customTopics || [])])).sort() as string[];
  }, [questionBank, exams, customTopics, filterSubject]);

  const filteredQuestions = questionBank.filter(q => {
    const matchesSearch = q.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = filterSubject === 'all' || q.subject === filterSubject;
    const matchesGrade = filterGrade === 'all' || q.grade === filterGrade;
    const matchesLevel = filterLevel === 'all' || q.level === filterLevel;
    const matchesType = filterType === 'all' || q.type === filterType;
    const matchesTopic = filterTopic === 'all' || q.topic === filterTopic;
    return matchesSearch && matchesSubject && matchesGrade && matchesLevel && matchesType && matchesTopic;
  });

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const count = await syncQuestionsFromExams();
      setSyncResult({ count, show: true });
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
    if (filteredQuestions.length === 0) {
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
          ...filteredQuestions.flatMap((q, index) => {
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
    <div className="h-full flex flex-col p-4 space-y-4 bg-gray-50/50">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Layers className="h-6 w-6 text-emerald-600" /> Ngân hàng Câu hỏi
          </h1>
          <p className="text-gray-500 text-sm">Quản lý và đồng bộ tập trung tất cả câu hỏi trong hệ thống</p>
          
          <div className="flex items-center gap-4 mt-2 text-xs font-medium">
            <div className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md border border-emerald-100">
              Hiển thị {filteredQuestions.length} / {questionBank.length} câu hỏi
            </div>
            <div className="flex items-center gap-1 text-emerald-600">
              <Check className="h-3.5 w-3.5" /> Đã lưu đám mây
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {syncResult.show && (
            <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 animate-bounce">
              <CheckCircle2 className="h-4 w-4" /> Đã đồng bộ thêm {syncResult.count} câu mới
            </div>
          )}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-white border-2 border-emerald-500 text-emerald-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ từ Bài tập'}
          </button>
          <button
            onClick={handleDownloadDocx}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-md"
          >
            <Download className="h-4 w-4" />
            Tải file Word
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="relative col-span-1 md:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo nội dung, chủ đề..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
          />
        </div>

        <select
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="bg-gray-50 border-0 rounded-xl text-sm px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">Tất cả Môn</option>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={filterGrade}
          onChange={(e) => setFilterGrade(e.target.value)}
          className="bg-gray-50 border-0 rounded-xl text-sm px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">Tất cả</option>
          {grades.map(g => <option key={g} value={g}>Lớp {g}</option>)}
        </select>

        <select
          value={filterTopic}
          onChange={(e) => setFilterTopic(e.target.value)}
          className="bg-gray-50 border-0 rounded-xl text-sm px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">Tất cả Chủ đề</option>
          {allTopics.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="bg-gray-50 border-0 rounded-xl text-sm px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">Tất cả Mức độ</option>
          <option value="NHAN_BIET">Nhận biết</option>
          <option value="KET_NOI">Kết nối</option>
          <option value="VAN_DUNG">Vận dụng</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-gray-50 border-0 rounded-xl text-sm px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">Tất cả Loại câu</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Main Table */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/80 text-gray-500 text-xs font-bold uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 border-b">Câu hỏi / Nội dung</th>
                <th className="px-4 py-4 border-b w-32">Thông tin</th>
                <th className="px-4 py-4 border-b w-32">Chủ đề</th>
                <th className="px-4 py-4 border-b w-32 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredQuestions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <HelpCircle className="h-10 w-10 opacity-20" />
                      <p>Không tìm thấy câu hỏi nào phù hợp</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredQuestions.map((q) => {
                  const isEditing = editingId === q.id;
                  
                  return (
                    <tr key={q.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 align-top">
                        {isEditing ? (
                          <div className="space-y-3">
                            <textarea
                              value={editValues.content}
                              onChange={(e) => setEditValues({ ...editValues, content: e.target.value })}
                              className="w-full border rounded-lg p-2 text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            {(q.type === 'MCQ' || q.type === 'MCQ_MULTIPLE') && (
                              <div className="grid grid-cols-2 gap-2">
                                {editValues.options?.map((opt, i) => (
                                  <div key={i} className={`flex items-center gap-2 border rounded-lg p-2 ${
                                    q.type === 'MCQ_MULTIPLE'
                                      ? (editValues.correctOptionIndices?.includes(i) ? 'bg-emerald-50 border-emerald-200' : '')
                                      : (editValues.correctOptionIndex === i ? 'bg-emerald-50 border-emerald-200' : '')
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
                                      className="bg-transparent border-0 text-xs w-full outline-none"
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
                                      q.type === 'MCQ' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                                  }`}>
                                      {TYPE_LABELS[q.type]}
                                  </span>
                                  {q.level && (
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                          q.level === 'NHAN_BIET' ? 'bg-green-50 text-green-600' : 
                                          q.level === 'KET_NOI' ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'
                                      }`}>
                                          {LEVEL_LABELS[q.level as ExamDifficulty] || q.level}
                                      </span>
                                  )}
                              </div>
                              <div className="text-gray-800 text-sm font-medium prose prose-sm max-w-none">
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
                                  <div key={i} className={`flex items-start gap-2 text-[11px] p-2 rounded-lg ${isCorrect ? 'bg-emerald-50 text-emerald-700 font-medium ring-1 ring-emerald-300' : 'bg-gray-50 text-gray-600'}`}>
                                    <span className="font-bold shrink-0 flex items-center gap-0.5">
                                      {String.fromCharCode(65 + i)}.
                                      {isCorrect && <span className="text-emerald-500">✓</span>}
                                    </span>
                                    <div className="prose prose-xs max-w-none">
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
                                    <div key={i} className="flex items-center gap-3 text-[11px] bg-gray-50 p-2 rounded-lg">
                                      <div className="flex-1 text-center border-r border-dashed border-gray-300 pr-2 prose prose-xs max-w-none">
                                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                            {l?.trim() || ''}
                                        </ReactMarkdown>
                                      </div>
                                      <div className="text-gray-400 shrink-0">... nối với ...</div>
                                      <div className="flex-1 text-center pl-2 prose prose-xs max-w-none">
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
                              className="w-full border rounded p-1"
                            />
                            <input
                              placeholder="Lớp"
                              value={editValues.grade}
                              onChange={(e) => setEditValues({ ...editValues, grade: e.target.value })}
                              className="w-full border rounded p-1"
                            />
                          </div>
                        ) : (
                          <div className="space-y-1 text-gray-500">
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
                            className="w-full border rounded p-1 text-xs"
                          />
                        ) : (
                          <div className="text-xs text-gray-600 font-medium italic">{q.topic || '(Chưa phân loại)'}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-center justify-center gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={handleSaveEdit}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Lưu"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors"
                                title="Hủy"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(q)}
                                className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Sửa"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(q.id)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
        </div>
      </div>
    </div>
  );
};

// Simple Icon fallback logic
const BookMarked = Bookmark;

export default QuestionBank;

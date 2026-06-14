import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../../store';
import {
  useEvaluationStore,
  SUBJECT_LIST,
  COMPETENCY_LIST,
  QUALITY_LIST,
  SUBJECT_RATING_OPTIONS,
  COMPETENCY_RATING_OPTIONS,
  createEmptyEvaluation,
} from '../../services/evaluationStore';
import { useClassFunStore } from '../../services/classFunStore';
import { SubjectEvaluation, type DailyEvaluation as DailyEvaluationType } from '../../types';
import {
  FileText,
  Calendar,
  CheckCircle,
  Users,
  X,
  Save,
  ChevronDown,
  Search,
  CheckSquare,
  Square,
  Loader2,
  BookOpen,
  Lightbulb,
  Heart,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

// ============================================
// CONSTANTS
// ============================================

const TABS = [
  { key: 'subjects', label: 'Môn học', icon: BookOpen, count: SUBJECT_LIST.length },
  { key: 'competencies', label: 'Năng lực', icon: Lightbulb, count: COMPETENCY_LIST.length },
  { key: 'qualities', label: 'Phẩm chất', icon: Heart, count: QUALITY_LIST.length },
] as const;

type TabKey = typeof TABS[number]['key'];

// ============================================
// Comment Suggestion Dropdown
// ============================================
const CommentInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  suggestions: string[];
}> = ({ value, onChange, placeholder, suggestions }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.trim().length > 0) {
      const lower = value.toLowerCase();
      setFilteredSuggestions(
        suggestions.filter(s => s.toLowerCase().includes(lower)).slice(0, 8)
      );
    } else {
      setFilteredSuggestions(suggestions.slice(0, 8));
    }
  }, [value, suggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        placeholder={placeholder || 'Nhập nhận xét...'}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition-all"
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto"
        >
          {filteredSuggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onChange(s);
                setShowSuggestions(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors truncate flex items-center gap-2"
            >
              <Sparkles className="h-3 w-3 text-indigo-400 flex-shrink-0" />
              <span className="truncate">{s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// Rating Selector
// ============================================
const RatingSelect: React.FC<{
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string; color: string }[];
}> = ({ value, onChange, options }) => {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-400 outline-none bg-white font-medium min-w-[120px]"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};

// ============================================
// Rating Badge
// ============================================
const RatingBadge: React.FC<{ rating: string; isSubject?: boolean }> = ({ rating, isSubject }) => {
  if (rating === 'None') return null;
  const options = isSubject ? SUBJECT_RATING_OPTIONS : COMPETENCY_RATING_OPTIONS;
  const opt = options.find(o => o.value === rating);
  if (!opt) return null;

  const bgMap: Record<string, string> = {
    T: 'bg-green-100 text-green-700 border-green-200',
    H: 'bg-blue-100 text-blue-700 border-blue-200',
    'Đ': 'bg-amber-100 text-amber-700 border-amber-200',
    C: 'bg-red-100 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${bgMap[rating] || 'bg-gray-100 text-gray-600'}`}>
      {opt.value}
    </span>
  );
};

// ============================================
// Evaluation Modal
// ============================================
const EvaluationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  studentNames: string[];
  studentIds: string[];
  classId: string;
  teacherId: string;
  evaluationDate: string;
  existingEvaluation?: DailyEvaluationType | null;
  isBatch: boolean;
  onSave: () => void;
}> = ({ isOpen, onClose, studentNames, studentIds, classId, teacherId, evaluationDate, existingEvaluation, isBatch, onSave }) => {
  const { saveEvaluation, saveBatchEvaluation, commentSuggestions } = useEvaluationStore();

  const [activeTab, setActiveTab] = useState<TabKey>('subjects');
  const [subjects, setSubjects] = useState<Record<string, SubjectEvaluation>>({});
  const [competencies, setCompetencies] = useState<Record<string, SubjectEvaluation>>({});
  const [qualities, setQualities] = useState<Record<string, SubjectEvaluation>>({});
  const [generalComment, setGeneralComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (existingEvaluation && !isBatch) {
        setSubjects(existingEvaluation.subjects || createEmptyEvaluation().subjects);
        setCompetencies(existingEvaluation.competencies || createEmptyEvaluation().competencies);
        setQualities(existingEvaluation.qualities || createEmptyEvaluation().qualities);
        setGeneralComment(existingEvaluation.general_comment || '');
      } else {
        const empty = createEmptyEvaluation();
        setSubjects(empty.subjects);
        setCompetencies(empty.competencies);
        setQualities(empty.qualities);
        setGeneralComment('');
      }
      setActiveTab('subjects');
    }
  }, [isOpen, existingEvaluation, isBatch]);

  const updateItem = (
    group: 'subjects' | 'competencies' | 'qualities',
    key: string,
    field: 'rating' | 'comment',
    value: string
  ) => {
    const setter = group === 'subjects' ? setSubjects : group === 'competencies' ? setCompetencies : setQualities;
    setter(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let success: boolean;
      if (isBatch) {
        success = await saveBatchEvaluation(studentIds, {
          teacher_id: teacherId,
          class_id: classId,
          evaluation_date: evaluationDate,
          subjects,
          competencies,
          qualities,
          general_comment: generalComment,
        });
      } else {
        success = await saveEvaluation({
          student_id: studentIds[0],
          teacher_id: teacherId,
          class_id: classId,
          evaluation_date: evaluationDate,
          subjects,
          competencies,
          qualities,
          general_comment: generalComment,
        });
      }

      if (success) {
        onSave();
        onClose();
      } else {
        alert('Lỗi khi lưu nhận xét. Vui lòng thử lại.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getItemsByTab = () => {
    switch (activeTab) {
      case 'subjects': return { list: SUBJECT_LIST, data: subjects, group: 'subjects' as const };
      case 'competencies': return { list: COMPETENCY_LIST, data: competencies, group: 'competencies' as const };
      case 'qualities': return { list: QUALITY_LIST, data: qualities, group: 'qualities' as const };
    }
  };

  if (!isOpen) return null;
  const items = getItemsByTab();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-2xl">
          <div className="text-white">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {isBatch ? `Nhận xét hàng loạt (${studentIds.length} HS)` : `Nhận xét: ${studentNames[0]}`}
            </h2>
            <p className="text-sm text-white/80 mt-1">Ngày: {evaluationDate}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white bg-white/10 rounded-full p-2 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Student Names (for batch) */}
        {isBatch && (
          <div className="px-5 py-3 bg-indigo-50 border-b flex flex-wrap gap-1.5">
            {studentNames.map((name, i) => (
              <span key={i} className="bg-white px-2 py-1 rounded-lg text-xs font-medium text-indigo-700 border border-indigo-200 shadow-sm">
                {name}
              </span>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-all border-b-2
                  ${activeTab === tab.key
                    ? 'border-indigo-600 text-indigo-700 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                <span className="text-[10px] bg-gray-200 text-gray-600 rounded-full px-1.5">{tab.count}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {items.list.map(item => (
            <div key={item.key} className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-2 hover:border-indigo-200 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <label className="text-sm font-bold text-gray-800 min-w-[160px]">{item.label}</label>
                <RatingSelect
                  value={items.data[item.key]?.rating || 'None'}
                  onChange={val => updateItem(items.group, item.key, 'rating', val)}
                  options={items.group === 'subjects' ? SUBJECT_RATING_OPTIONS : COMPETENCY_RATING_OPTIONS}
                />
              </div>
              <CommentInput
                value={items.data[item.key]?.comment || ''}
                onChange={val => updateItem(items.group, item.key, 'comment', val)}
                placeholder={`Nhận xét ${item.label}...`}
                suggestions={commentSuggestions}
              />
            </div>
          ))}

          {/* General comment */}
          <div className="mt-6 bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-2">
            <label className="text-sm font-bold text-indigo-800 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Nhận xét chung
            </label>
            <CommentInput
              value={generalComment}
              onChange={setGeneralComment}
              placeholder="Nhận xét tổng quát cho học sinh..."
              suggestions={commentSuggestions}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isBatch ? `Lưu cho ${studentIds.length} HS` : 'Lưu nhận xét'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export const DailyEvaluation: React.FC = () => {
  const { user, classes, users } = useStore();
  const { evaluations, isLoading, fetchEvaluations, loadCommentSuggestions } = useEvaluationStore();
  const { groups, groupMembers, fetchClassFunData } = useClassFunStore();

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStudentIds, setModalStudentIds] = useState<string[]>([]);
  const [modalIsBatch, setModalIsBatch] = useState(false);

  // Lấy lớp của GV
  const teacherClasses = useMemo(() =>
    classes.filter(c => c.teacherId === user?.id),
    [classes, user]
  );

  // Tự động chọn lớp đầu tiên
  useEffect(() => {
    if (teacherClasses.length > 0 && !selectedClassId) {
      setSelectedClassId(teacherClasses[0].id);
    }
  }, [teacherClasses, selectedClassId]);

  // Load evaluations khi chọn lớp/ngày
  useEffect(() => {
    if (selectedClassId && selectedDate && user) {
      fetchEvaluations(selectedClassId, selectedDate);
      fetchClassFunData(selectedClassId, user.id);
    }
  }, [selectedClassId, selectedDate, fetchEvaluations, fetchClassFunData, user]);

  // Load comment suggestions
  useEffect(() => {
    loadCommentSuggestions();
  }, [loadCommentSuggestions]);

  // Lấy danh sách HS trong lớp
  const selectedClass = classes.find(c => c.id === selectedClassId);
  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return users
      .filter(u => u.role === 'STUDENT' && selectedClass.studentIds.includes(u.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [selectedClass, users]);

  // Phân bổ HS theo Tổ
  const studentsByGroup = useMemo(() => {
    const map: Record<string, typeof classStudents> = {};
    
    // Khởi tạo các tổ hiện có
    groups.forEach(g => { map[g.id] = []; });
    const UNGROUPED = 'ungrouped';
    map[UNGROUPED] = [];

    classStudents.forEach(s => {
      const gMember = groupMembers.find(gm => gm.student_id === s.id);
      if (gMember && map[gMember.group_id]) {
        // Gắn sort_order vào object student tạm thời để sắp xếp
        (s as any)._sort_order = gMember.sort_order;
        map[gMember.group_id].push(s);
      } else {
        map[UNGROUPED].push(s);
      }
    });

    // Sắp xếp từng group theo sort_order
    Object.keys(map).forEach(gid => {
      if (gid !== UNGROUPED) {
        map[gid].sort((a, b) => (a as any)._sort_order - (b as any)._sort_order);
      } else {
        // Ungrouped vẫn sắp xếp A-Z
        map[gid].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
      }
    });

    return map;
  }, [classStudents, groups, groupMembers]);

  // Lọc theo tìm kiếm
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return classStudents;
    const lower = searchQuery.toLowerCase();
    return classStudents.filter(s => s.name.toLowerCase().includes(lower));
  }, [classStudents, searchQuery]);

  // Map đánh giá theo student_id
  const evaluationMap = useMemo(() => {
    const map: Record<string, DailyEvaluationType> = {};
    evaluations.forEach(e => { map[e.student_id] = e; });
    return map;
  }, [evaluations]);

  // Toggle chọn HS
  const toggleStudent = (id: string) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleAllStudents = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id));
    }
  };

  // Mở modal cho 1 HS
  const openSingleModal = (studentId: string) => {
    setModalStudentIds([studentId]);
    setModalIsBatch(false);
    setIsModalOpen(true);
  };

  // Mở modal hàng loạt
  const openBatchModal = () => {
    if (selectedStudents.length === 0) return;
    setModalStudentIds(selectedStudents);
    setModalIsBatch(true);
    setIsModalOpen(true);
  };

  // Sau khi lưu xong
  const handleSaveComplete = () => {
    fetchEvaluations(selectedClassId, selectedDate);
    setSelectedStudents([]);
  };

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = classStudents.length;
    const evaluated = classStudents.filter(s => evaluationMap[s.id]).length;
    return { total, evaluated, remaining: total - evaluated };
  }, [classStudents, evaluationMap]);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-indigo-200">
            <FileText className="h-6 w-6 text-white" />
          </div>
          Nhận xét Thường xuyên
        </h1>
        <p className="text-gray-500 mt-1 text-sm">Đánh giá học sinh theo Thông tư 27/2021/TT-BGDĐT</p>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl shadow-sm border p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Chọn lớp */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <select
              value={selectedClassId}
              onChange={e => { setSelectedClassId(e.target.value); setSelectedStudents([]); }}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
            >
              <option value="">Chọn lớp...</option>
              {teacherClasses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Chọn ngày */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>

          {/* Tìm kiếm */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm học sinh..."
              className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
        </div>

        {/* Progress stats */}
        {selectedClassId && (
          <div className="flex items-center gap-4 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Đã nhận xét</p>
                <p className="text-sm font-bold text-green-700">{stats.evaluated}/{stats.total}</p>
              </div>
            </div>
            <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-400 to-green-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.total > 0 ? (stats.evaluated / stats.total) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs font-bold text-gray-500">{stats.total > 0 ? Math.round((stats.evaluated / stats.total) * 100) : 0}%</span>
          </div>
        )}
      </div>

      {/* Batch Action Bar */}
      {selectedStudents.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 mb-4 flex items-center justify-between animate-in slide-in-from-top">
          <p className="text-sm font-bold text-indigo-800">
            Đã chọn <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-full text-xs mx-1">{selectedStudents.length}</span> học sinh
          </p>
          <button
            onClick={openBatchModal}
            className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Nhận xét hàng loạt
          </button>
        </div>
      )}

      {/* Student List */}
      {!selectedClassId ? (
        <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Chọn một lớp để bắt đầu nhận xét</p>
        </div>
      ) : isLoading ? (
        <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Đang tải dữ liệu...</p>
        </div>
      ) : filteredStudents.length === 0 && searchQuery.trim() ? (
        <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            Không tìm thấy học sinh phù hợp với từ khóa "{searchQuery}"
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Lặp qua 4 tổ chính */}
          {groups.slice(0, 4).map((group) => {
            const studentsInGroup = (studentsByGroup[group.id] || []).filter(s => 
              !searchQuery.trim() || s.name.toLowerCase().includes(searchQuery.toLowerCase())
            );

            return (
              <div key={group.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col max-h-[600px] hover:border-indigo-300 transition-colors">
                <div className="bg-gray-50 px-4 py-2.5 border-b flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color || '#6366f1' }} />
                    {group.name}
                  </span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold">
                    {studentsInGroup.length}
                  </span>
                </div>
                
                <div className="flex-1 divide-y divide-gray-50 overflow-y-auto">
                  {studentsInGroup.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-xs italic">Trống</div>
                  ) : (
                    studentsInGroup.map(student => {
                      const hasEval = !!evaluationMap[student.id];
                      const isChecked = selectedStudents.includes(student.id);
                      return (
                        <div key={student.id} className={`p-3 group transition-colors hover:bg-indigo-50/30 ${isChecked ? 'bg-indigo-50' : ''}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <button onClick={() => toggleStudent(student.id)} className="flex-shrink-0">
                              {isChecked ? (
                                <CheckSquare className="h-4 w-4 text-indigo-600" />
                              ) : (
                                <Square className="h-4 w-4 text-gray-300" />
                              )}
                            </button>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-gray-900 truncate" title={student.name}>{student.name}</p>
                              {hasEval && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  <RatingBadge rating={evaluationMap[student.id].subjects.toan?.rating} isSubject />
                                  <RatingBadge rating={evaluationMap[student.id].subjects.tieng_viet?.rating} isSubject />
                                </div>
                              )}
                            </div>
                            {hasEval ? (
                               <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                            ) : (
                               <div className="w-3.5 h-3.5 bg-gray-100 rounded-full flex-shrink-0" />
                            )}
                          </div>
                          
                          <button
                            onClick={() => openSingleModal(student.id)}
                            className="w-full py-1 text-[10px] font-bold text-center text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100 rounded-lg transition-all"
                          >
                            {hasEval ? 'Sửa' : '+ Nhận xét'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}

          {/* Cột cho HS chưa phân tổ (nếu có) */}
          {studentsByGroup['ungrouped']?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-dashed overflow-hidden flex flex-col max-h-[600px] hover:border-gray-400 transition-colors">
               <div className="bg-gray-50 px-4 py-2.5 border-b">
                  <span className="text-[10px] font-extrabold text-gray-500 uppercase">Chưa phân tổ</span>
               </div>
               <div className="flex-1 divide-y divide-gray-50 overflow-y-auto">
                 {studentsByGroup['ungrouped'].filter(s => !searchQuery.trim() || s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(student => {
                   const hasEval = !!evaluationMap[student.id];
                   const isChecked = selectedStudents.includes(student.id);
                   return (
                    <div key={student.id} className={`p-3 group ${isChecked ? 'bg-indigo-50' : ''}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <button onClick={() => toggleStudent(student.id)}>
                          {isChecked ? <CheckSquare className="h-4 w-4 text-indigo-600" /> : <Square className="h-4 w-4 text-gray-300" />}
                        </button>
                        <p className="text-sm font-bold text-gray-800 truncate flex-1">{student.name}</p>
                      </div>
                      <button onClick={() => openSingleModal(student.id)} className="w-full py-1 text-[10px] font-bold text-indigo-500 bg-gray-50 rounded-lg">
                        {hasEval ? 'Sửa' : '+ Nhận xét'}
                      </button>
                    </div>
                   );
                 })}
               </div>
            </div>
          )}
        </div>
      )}

      {/* Evaluation Modal */}
      <EvaluationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        studentNames={modalStudentIds.map(id => users.find(u => u.id === id)?.name || 'HS')}
        studentIds={modalStudentIds}
        classId={selectedClassId}
        teacherId={user?.id || ''}
        evaluationDate={selectedDate}
        existingEvaluation={!modalIsBatch && modalStudentIds.length === 1 ? evaluationMap[modalStudentIds[0]] || null : null}
        isBatch={modalIsBatch}
        onSave={handleSaveComplete}
      />
    </div>
  );
};

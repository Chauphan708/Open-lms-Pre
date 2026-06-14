import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store';
import {
  useEvaluationStore,
  SUBJECT_LIST,
  COMPETENCY_LIST,
  QUALITY_LIST,
  SUBJECT_RATING_OPTIONS,
  COMPETENCY_RATING_OPTIONS,
} from '../../services/evaluationStore';
import { DailyEvaluation, EvaluationRating } from '../../types';
import {
  History,
  Calendar,
  Users,
  Search,
  Loader2,
  ChevronDown,
  ChevronRight,
  FileText,
  BarChart3,
  Eye,
  X,
  BookOpen,
  Lightbulb,
  Heart,
  MessageSquare,
  Filter,
} from 'lucide-react';

// ============================================
// Pie Chart Component (SVG thuần)
// ============================================
const PieChart: React.FC<{
  data: { label: string; value: number; color: string }[];
  size?: number;
}> = ({ data, size = 180 }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <p className="text-xs text-gray-400">Chưa có dữ liệu</p>
      </div>
    );
  }

  const r = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;
  let startAngle = -90;

  const slices = data.filter(d => d.value > 0).map(d => {
    const angle = (d.value / total) * 360;
    const endAngle = startAngle + angle;
    const largeArc = angle > 180 ? 1 : 0;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    // Label position
    const midAngle = ((startAngle + endAngle) / 2 * Math.PI) / 180;
    const labelR = r * 0.6;
    const lx = cx + labelR * Math.cos(midAngle);
    const ly = cy + labelR * Math.sin(midAngle);

    const pct = Math.round((d.value / total) * 100);

    startAngle = endAngle;

    return { ...d, path, lx, ly, pct };
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => (
          <g key={i}>
            <path
              d={s.path}
              fill={s.color}
              stroke="white"
              strokeWidth="2"
              className="transition-all hover:opacity-80 cursor-pointer"
            />
            {s.pct >= 8 && (
              <text
                x={s.lx}
                y={s.ly}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize="11"
                fontWeight="bold"
                className="pointer-events-none"
              >
                {s.pct}%
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap gap-2 justify-center">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-gray-600 font-medium">{d.label}: {d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// Rating Badge
// ============================================
const RatingBadge: React.FC<{ rating: string; isSubject?: boolean }> = ({ rating, isSubject }) => {
  if (rating === 'None' || !rating) return null;
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
// Student Detail Modal
// ============================================
const StudentDetailModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  evaluations: DailyEvaluation[];
}> = ({ isOpen, onClose, studentName, evaluations }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-2xl">
          <div className="text-white">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Chi tiết nhận xét: {studentName}
            </h2>
            <p className="text-sm text-white/80 mt-1">{evaluations.length} lần nhận xét</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white bg-white/10 rounded-full p-2 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {evaluations.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>Chưa có nhận xét nào</p>
            </div>
          ) : (
            evaluations.map(ev => (
              <div key={ev.id} className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-indigo-700 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(ev.evaluation_date).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </span>
                </div>

                {/* Môn học */}
                {ev.subjects && Object.keys(ev.subjects).length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><BookOpen className="h-3 w-3" /> Môn học</p>
                    <div className="flex flex-wrap gap-1.5">
                      {SUBJECT_LIST.map(s => {
                        const val = ev.subjects[s.key];
                        if (!val) return null;
                        return (
                          <div key={s.key} className="flex items-center gap-1" title={val.comment || ''}>
                            <span className="text-[10px] text-gray-500">{s.label}:</span>
                            <RatingBadge rating={val.rating} isSubject />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Năng lực */}
                {ev.competencies && Object.keys(ev.competencies).length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Lightbulb className="h-3 w-3" /> Năng lực</p>
                    <div className="flex flex-wrap gap-1.5">
                      {COMPETENCY_LIST.map(c => {
                        const val = ev.competencies[c.key];
                        if (!val) return null;
                        return (
                          <div key={c.key} className="flex items-center gap-1" title={val.comment || ''}>
                            <span className="text-[10px] text-gray-500">{c.label}:</span>
                            <RatingBadge rating={val.rating} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Phẩm chất */}
                {ev.qualities && Object.keys(ev.qualities).length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Heart className="h-3 w-3" /> Phẩm chất</p>
                    <div className="flex flex-wrap gap-1.5">
                      {QUALITY_LIST.map(q => {
                        const val = ev.qualities[q.key];
                        if (!val) return null;
                        return (
                          <div key={q.key} className="flex items-center gap-1" title={val.comment || ''}>
                            <span className="text-[10px] text-gray-500">{q.label}:</span>
                            <RatingBadge rating={val.rating} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Nhận xét chung */}
                {ev.general_comment && (
                  <div className="bg-white border border-indigo-100 rounded-lg p-3">
                    <p className="text-xs font-bold text-indigo-600 mb-1 flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Nhận xét chung</p>
                    <p className="text-sm text-gray-700">{ev.general_comment}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="w-full py-2.5 text-sm font-bold text-gray-600 bg-white border rounded-xl hover:bg-gray-50">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export const EvaluationHistory: React.FC = () => {
  const { user, classes, users } = useStore();
  const { evaluations, isLoading, fetchEvaluationsByRange } = useEvaluationStore();

  const [selectedClassId, setSelectedClassId] = useState('');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [filterRating, setFilterRating] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail modal
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null);

  const teacherClasses = useMemo(() =>
    classes.filter(c => c.teacherId === user?.id),
    [classes, user]
  );

  useEffect(() => {
    if (teacherClasses.length > 0 && !selectedClassId) {
      setSelectedClassId(teacherClasses[0].id);
    }
  }, [teacherClasses, selectedClassId]);

  useEffect(() => {
    if (selectedClassId && dateFrom && dateTo) {
      fetchEvaluationsByRange(selectedClassId, dateFrom, dateTo);
    }
  }, [selectedClassId, dateFrom, dateTo, fetchEvaluationsByRange]);

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return users
      .filter(u => u.role === 'STUDENT' && selectedClass.studentIds.includes(u.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [selectedClass, users]);

  // Group evaluations by student
  const studentEvalMap = useMemo(() => {
    const map: Record<string, DailyEvaluation[]> = {};
    evaluations.forEach(e => {
      if (!map[e.student_id]) map[e.student_id] = [];
      map[e.student_id].push(e);
    });
    // Sort by date desc
    Object.values(map).forEach(arr => arr.sort((a, b) => b.evaluation_date.localeCompare(a.evaluation_date)));
    return map;
  }, [evaluations]);

  // Thống kê pie chart (dựa trên tổng hợp tất cả đánh giá)
  const pieData = useMemo(() => {
    const counts: Record<string, number> = { T: 0, H: 0, 'Đ': 0, C: 0, 'None': 0 };

    const getItems = (category: string, ev: DailyEvaluation) => {
      if (category === 'subjects' || category === 'all') {
        Object.values(ev.subjects || {}).forEach(v => { if (v.rating) counts[v.rating] = (counts[v.rating] || 0) + 1; });
      }
      if (category === 'competencies' || category === 'all') {
        Object.values(ev.competencies || {}).forEach(v => { if (v.rating) counts[v.rating] = (counts[v.rating] || 0) + 1; });
      }
      if (category === 'qualities' || category === 'all') {
        Object.values(ev.qualities || {}).forEach(v => { if (v.rating) counts[v.rating] = (counts[v.rating] || 0) + 1; });
      }
    };

    evaluations.forEach(ev => getItems(filterCategory, ev));

    // Gom tất cả các options để lấy label/color
    const allOptions = [...SUBJECT_RATING_OPTIONS, ...COMPETENCY_RATING_OPTIONS];
    const uniqueOptions: Record<string, { value: string; label: string; color: string }> = {};
    allOptions.forEach(o => { 
      if (!uniqueOptions[o.value]) uniqueOptions[o.value] = o; 
    });

    return Object.entries(uniqueOptions)
      .filter(([val]) => val !== 'None') // Không hiển thị "None" trên biểu đồ tròn để tập trung vào kết quả
      .map(([val, opt]) => ({
        label: opt.label,
        value: counts[val] || 0,
        color: opt.color,
      }));
  }, [evaluations, filterCategory]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    let result = classStudents;
    if (searchQuery.trim()) {
      const lower = searchQuery.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(lower));
    }
    return result;
  }, [classStudents, searchQuery]);

  // Get last evaluation rating summary for a student
  const getStudentSummary = (studentId: string) => {
    const evals = studentEvalMap[studentId];
    if (!evals || evals.length === 0) return null;
    const latest = evals[0];
    return latest;
  };

  // Detail modal data
  const detailStudent = detailStudentId ? users.find(u => u.id === detailStudentId) : null;
  const detailEvals = detailStudentId ? (studentEvalMap[detailStudentId] || []) : [];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
          <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-2.5 rounded-xl shadow-lg shadow-teal-200">
            <History className="h-6 w-6 text-white" />
          </div>
          Lịch sử Nhận xét
        </h1>
        <p className="text-gray-500 mt-1 text-sm">Tổng hợp nhận xét thường xuyên theo lớp và khoảng thời gian</p>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl shadow-sm border p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          <div className="flex items-center gap-2 min-w-[200px]">
            <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-teal-400 outline-none bg-white"
            >
              <option value="">Chọn lớp...</option>
              {teacherClasses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-400 outline-none"
            />
            <span className="text-gray-400 text-sm">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-400 outline-none"
            />
          </div>

          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm học sinh..."
              className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-400 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Stats & Chart */}
      {selectedClassId && evaluations.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Pie Chart */}
          <div className="bg-white rounded-2xl shadow-sm border p-5 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-4 w-full">
              <BarChart3 className="h-4 w-4 text-teal-600" />
              <h3 className="text-sm font-bold text-gray-800">Phân bố đánh giá</h3>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-3.5 w-3.5 text-gray-400" />
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="text-xs border rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-teal-400"
              >
                <option value="all">Tất cả</option>
                <option value="subjects">Môn học</option>
                <option value="competencies">Năng lực</option>
                <option value="qualities">Phẩm chất</option>
              </select>
            </div>

            <PieChart data={pieData} size={180} />
          </div>

          {/* Summary Cards */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { value: 'T', label: 'Tốt / HT Tốt', color: '#22c55e' },
              { value: 'H', label: 'Hoàn thành', color: '#3b82f6' },
              { value: 'Đ', label: 'Đạt', color: '#f59e0b' },
              { value: 'C', label: 'Chưa đạt / CHT', color: '#ef4444' }
            ].map(opt => {
              const count = pieData.find(p => p.label.includes(opt.value))?.value || 0; // Find by key approximation
              // Actually better to count by key again for clarity here
              const keyCount = evaluations.reduce((sum, ev) => {
                let current = 0;
                if (filterCategory === 'subjects' || filterCategory === 'all') {
                   current += Object.values(ev.subjects || {}).filter(v => v.rating === opt.value).length;
                }
                if (filterCategory === 'competencies' || filterCategory === 'all') {
                   current += Object.values(ev.competencies || {}).filter(v => v.rating === opt.value).length;
                }
                if (filterCategory === 'qualities' || filterCategory === 'all') {
                   current += Object.values(ev.qualities || {}).filter(v => v.rating === opt.value).length;
                }
                return sum + current;
              }, 0);

              const totalCount = pieData.reduce((s, p) => s + p.value, 0);
              const pct = totalCount > 0 ? Math.round((keyCount / totalCount) * 100) : 0;
              
              return (
                <div key={opt.value} className="bg-white rounded-2xl shadow-sm border p-4 text-center">
                  <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: opt.color }}>
                    {opt.value}
                  </div>
                  <p className="text-[10px] text-gray-500 font-medium">{opt.label}</p>
                  <p className="text-xl font-extrabold text-gray-800 mt-1">{keyCount}</p>
                  <p className="text-[10px] text-gray-400">{pct}%</p>
                </div>
              );
            })}

            {/* Quick stats */}
            <div className="col-span-2 sm:col-span-4 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl border border-teal-100 p-4 flex items-center justify-around">
              <div className="text-center">
                <p className="text-xs text-teal-600 font-medium">Tổng HS</p>
                <p className="text-xl font-extrabold text-teal-800">{classStudents.length}</p>
              </div>
              <div className="h-8 w-px bg-teal-200" />
              <div className="text-center">
                <p className="text-xs text-teal-600 font-medium">Có nhận xét</p>
                <p className="text-xl font-extrabold text-teal-800">{Object.keys(studentEvalMap).length}</p>
              </div>
              <div className="h-8 w-px bg-teal-200" />
              <div className="text-center">
                <p className="text-xs text-teal-600 font-medium">Tổng lần NX</p>
                <p className="text-xl font-extrabold text-teal-800">{evaluations.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Table */}
      {!selectedClassId ? (
        <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Chọn một lớp để xem lịch sử nhận xét</p>
        </div>
      ) : isLoading ? (
        <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
          <Loader2 className="h-8 w-8 text-teal-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Đang tải dữ liệu...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-3 bg-gray-50 border-b text-xs font-bold text-gray-500 uppercase tracking-wider">
            <span>Học sinh</span>
            <span className="text-center">Số lần NX</span>
            <span className="text-center">Đánh giá gần nhất</span>
            <span className="text-center">Chi tiết</span>
          </div>

          <div className="divide-y divide-gray-50">
            {filteredStudents.map((student, idx) => {
              const evals = studentEvalMap[student.id] || [];
              const latest = evals.length > 0 ? evals[0] : null;

              return (
                <div key={student.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-3.5 hover:bg-gray-50/80 transition-all group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                      {student.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{student.name}</p>
                      <p className="text-xs text-gray-400">{student.email || `STT: ${idx + 1}`}</p>
                    </div>
                  </div>

                  <div className="text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${evals.length > 0 ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-400'}`}>
                      {evals.length}
                    </span>
                  </div>

                  <div className="text-center">
                    {latest ? (
                      <div className="flex flex-wrap gap-1 justify-center max-w-[200px]">
                        {Object.values(latest.subjects || {}).slice(0, 3).map((v, i) => (
                          <RatingBadge key={i} rating={v.rating} isSubject />
                        ))}
                        {Object.keys(latest.subjects || {}).length > 3 && (
                          <span className="text-[10px] text-gray-400 font-medium">+{Object.keys(latest.subjects || {}).length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>

                  <div className="text-center">
                    <button
                      onClick={() => setDetailStudentId(student.id)}
                      disabled={evals.length === 0}
                      className="px-3 py-2 text-xs font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Xem
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredStudents.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm">
                {searchQuery ? 'Không tìm thấy học sinh phù hợp' : 'Lớp chưa có học sinh'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      <StudentDetailModal
        isOpen={!!detailStudentId}
        onClose={() => setDetailStudentId(null)}
        studentName={detailStudent?.name || ''}
        evaluations={detailEvals}
      />
    </div>
  );
};

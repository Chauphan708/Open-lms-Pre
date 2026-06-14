import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import {
  TrendingUp, TrendingDown, Minus, BookOpen, Brain, Target, AlertTriangle,
  Star, Zap, Clock, ChevronDown, Sparkles, RefreshCw, Award, BarChart3, Printer, Users, School, ArrowLeft, MessageSquare
} from 'lucide-react';
import { computeStudentAnalytics, TIME_PERIODS, TimePeriod, StudentAnalytics } from '../../utils/analyticsEngine';
import { getRecommendations, getRecentExamIds } from '../../utils/recommendationEngine';
import { generateTeacherStudentAnalysis } from '../../services/geminiService';

// ============================================================
// SUB COMPONENTS (Reused from LearningAnalytics or adapted)
// ============================================================

const ComboChart: React.FC<{ data: { label: string; avg: number; count: number; max: number; min: number }[] }> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm italic">
        Chưa có đủ dữ liệu để vẽ biểu đồ.
      </div>
    );
  }

  const W = 600;
  const H = 220;
  const padL = 36, padR = 16, padT = 20, padB = 40;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const maxScore = 10;
  const maxCount = Math.max(...data.map(d => d.count), 5);
  
  // Cột to hơn: Tăng giới hạn tối đa (40px) và giảm khoảng cách (gap = 8)
  const barWidth = Math.max(8, Math.min(40, (chartW / data.length) - 8));

  const xPos = (i: number) => padL + (i + 0.5) * (chartW / data.length);
  const yPosScore = (v: number) => padT + chartH - (v / maxScore) * chartH;
  const yPosCount = (v: number) => padT + chartH - (v / maxCount) * chartH;

  const linePoints = data.map((d, i) => `${xPos(i)},${yPosScore(d.avg)}`).join(' ');
  const maxPoints = data.map((d, i) => `${xPos(i)},${yPosScore(d.max)}`).join(' ');

  const getBarColor = (avg: number) => {
    if (avg >= 8.5) return '#10b981';
    if (avg >= 6.5) return '#6366f1';
    if (avg >= 5) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <svg 
        viewBox={`0 0 ${W} ${H}`} 
        className="w-full" 
        style={{ minWidth: Math.max(500, data.length * 45) + 'px' }}
      >
        {/* Grid lines (Score) */}
        {[0, 2, 4, 6, 8, 10].map(v => (
          <g key={v}>
            <line x1={padL} y1={yPosScore(v)} x2={W - padR} y2={yPosScore(v)} stroke="#f0f0f0" strokeWidth="1" />
            <text x={padL - 4} y={yPosScore(v) + 4} textAnchor="end" fontSize="9" fill="#9ca3af">{v}</text>
          </g>
        ))}
        {/* Bars (Count) */}
        {data.map((d, i) => {
          const bx = xPos(i) - barWidth / 2;
          const bh = (d.count / maxCount) * chartH;
          return (
            <g key={i}>
              <rect x={bx} y={yPosCount(d.count)} width={barWidth} height={bh} fill="#e0e7ff" stroke="#c7d2fe" strokeWidth="1" rx="3" opacity="0.85" />
              {d.count > 0 && <text x={xPos(i)} y={yPosCount(d.count) - 3} textAnchor="middle" fontSize="8" fill="#6366f1" fontWeight="bold">{d.count} bài</text>}
            </g>
          );
        })}
        {/* Lines */}
        <polyline points={maxPoints} fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.6" />
        <polyline points={linePoints} fill="none" stroke="#6366f1" strokeWidth="2.5" />
        {/* Dots */}
        {data.map((d, i) => <circle key={i} cx={xPos(i)} cy={yPosScore(d.avg)} r="4" fill={getBarColor(d.avg)} stroke="white" strokeWidth="1.5" />)}
        {/* Labels */}
        {data.map((d, i) => (
          <text key={i} x={xPos(i)} y={H - padB + 14} textAnchor="middle" fontSize="9" fill="#6b7280">
            {d.label.length > 10 ? d.label.slice(0, 9) + '…' : d.label}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
          <span>Điểm TB (Đường)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 border-t border-dashed border-emerald-500" />
          <span>Điểm cao nhất</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-indigo-100 border border-indigo-200" />
          <span>Số bài nộp (Cột)</span>
        </div>
      </div>
    </div>
  );
};

const RateBar: React.FC<{ label: string; rate: number; color: string }> = ({ label, rate, color }) => (
  <div>
    <div className="flex justify-between text-sm mb-1">
      <span className="font-medium text-gray-700">{label}</span>
      <span className="font-bold text-gray-900">{rate}%</span>
    </div>
    <div className="w-full bg-gray-100 rounded-full h-3">
      <div className={`h-3 rounded-full transition-all duration-700 ${color}`} style={{ width: `${rate}%` }} />
    </div>
  </div>
);

const WeakTopicCard: React.FC<{ topic: string; subject: string; rate: number; attempts: number }> = ({ topic, subject, rate, attempts }) => (
  <div className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-xl">
    <div className="min-w-0">
      <div className="font-bold text-red-800 text-sm truncate">{topic}</div>
      <div className="text-xs text-red-600">{subject} • {attempts} lần làm</div>
    </div>
    <div className="ml-3 flex-shrink-0">
      <span className="inline-block bg-red-100 text-red-700 font-bold text-xs px-2 py-1 rounded-full">{rate}% sai</span>
    </div>
  </div>
);

const ComparisonView: React.FC<{ 
  data: { student: any; stats: StudentAnalytics }[];
  exams: any[];
  questionBank: any[];
  attempts: any[];
}> = ({ data, exams, questionBank, attempts }) => {
  const fmt = (n: number) => n.toFixed(1).replace('.', ',');

  // Aggregate recommendations for the group
  const groupRecs = useMemo(() => {
    return data.map(item => {
      const recentExamIds = getRecentExamIds(item.student.id, attempts, 7);
      const recs = getRecommendations(item.stats, exams, questionBank, recentExamIds, 2);
      return { student: item.student, recs };
    }).filter(r => r.recs.recommendedExams.length > 0);
  }, [data, exams, questionBank, attempts]);
  
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Comparison Table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-500" /> Bảng so sánh chỉ số năng lực
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Học sinh</th>
                <th className="px-6 py-4 text-center">Số bài làm</th>
                <th className="px-6 py-4 text-center">Điểm TB</th>
                <th className="px-6 py-4 text-center">Điểm Cao Nhất</th>
                <th className="px-6 py-4 text-center">Thứ hạng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                        {item.student.name.charAt(0)}
                      </div>
                      <div className="font-bold text-gray-900 text-sm">{item.student.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-medium text-gray-600">{item.stats.totalAttempts}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      item.stats.avgScore >= 8 ? 'bg-emerald-100 text-emerald-700' :
                      item.stats.avgScore >= 5 ? 'bg-indigo-100 text-indigo-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {fmt(item.stats.avgScore)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-bold text-gray-700">{fmt(item.stats.maxScore)}</td>
                  <td className="px-6 py-4 text-center text-sm font-medium text-gray-500">#{i + 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid of charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.map((item, i) => (
          <div key={i} className="bg-white rounded-2xl border shadow-sm p-6 flex flex-col h-full">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2"><Target className="h-4 w-4 text-indigo-400" /> {item.student.name}</span>
              <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">TB: {fmt(item.stats.avgScore)}</span>
            </h3>
            <div className="flex-1">
               <ComboChart data={item.stats.chartData} />
            </div>
          </div>
        ))}
      </div>

      {/* Group Recommendations */}
      {groupRecs.length > 0 && (
        <div className="bg-white rounded-2xl border shadow-sm p-6 no-print">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" /> Đề xuất bài tập can thiệp cho nhóm
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupRecs.map((gr, idx) => (
              <div key={idx} className="space-y-3">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[10px] font-bold">
                    {gr.student.name.charAt(0)}
                  </div>
                  <span className="text-sm font-bold text-gray-700">{gr.student.name}</span>
                </div>
                {gr.recs.recommendedExams.slice(0, 2).map((rec, rIdx) => (
                  <div key={rIdx} className="p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-purple-200 transition-all">
                    <div className="text-xs font-bold text-gray-900 mb-1 line-clamp-1">{rec.exam.title}</div>
                    <div className="text-[10px] text-purple-600 font-medium uppercase mb-1">{rec.exam.subject}</div>
                    <div className="text-[10px] text-gray-500 italic line-clamp-2">"{rec.reasons[0]}"</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// MAIN PAGE
// ============================================================

export const TeacherAnalytics: React.FC = () => {
  const { user: currentUser, classes, users, attempts, exams, questionBank } = useStore();
  
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(TIME_PERIODS[1]);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [teacherComment, setTeacherComment] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const { addNotification } = useStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsStudentDropdownOpen(false);
      }
    };
    if (isStudentDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStudentDropdownOpen]);

  // Filter classes taught by this teacher
  const myClasses = useMemo(() => classes.filter(c => c.teacherId === currentUser?.id), [classes, currentUser]);

  // Students in selected class
  const studentsInClass = useMemo(() => {
    const cls = classes.find(c => c.id === selectedClassId);
    if (!cls) return [];
    return users.filter(u => cls.studentIds.includes(u.id));
  }, [selectedClassId, classes, users]);

  // Reset student selection when class changes
  useEffect(() => {
    setSelectedStudentIds([]);
    setAiInsight(null);
  }, [selectedClassId]);

  // Formatting helper
  const fmt = (n: number) => n.toFixed(1).replace('.', ',');

  // Analytics calculation for a single student (when length === 1)
  const analytics: StudentAnalytics | null = useMemo(() => {
    if (selectedStudentIds.length !== 1) return null;
    return computeStudentAnalytics(selectedStudentIds[0], attempts, exams, questionBank, selectedPeriod.days);
  }, [selectedStudentIds, attempts, exams, questionBank, selectedPeriod]);

  // Analytics for ALL selected students (for comparison)
  const comparisonAnalytics = useMemo(() => {
    if (selectedStudentIds.length <= 1) return [];
    return selectedStudentIds.map(id => ({
      student: users.find(u => u.id === id),
      stats: computeStudentAnalytics(id, attempts, exams, questionBank, selectedPeriod.days)
    })).filter((item): item is { student: any; stats: StudentAnalytics } => item.student !== undefined && item.stats !== null);
  }, [selectedStudentIds, attempts, exams, questionBank, selectedPeriod, users]);

  // Selected student object (only if 1 selected)
  const selectedStudent = useMemo(() => 
    selectedStudentIds.length === 1 ? users.find(u => u.id === selectedStudentIds[0]) : null
  , [selectedStudentIds, users]);

  // Recommendation calculation
  const recommendations = useMemo(() => {
    if (!analytics || selectedStudentIds.length !== 1) return null;
    const sid = selectedStudentIds[0];
    const recentExamIds = getRecentExamIds(sid, attempts, 7);
    return getRecommendations(analytics, exams, questionBank, recentExamIds, 6, 8);
  }, [analytics, selectedStudentIds, attempts, exams, questionBank]);

  // AI Insight handle
  const handleGetAIInsight = useCallback(async () => {
    if (!analytics || !selectedStudent) return;
    setIsLoadingAI(true);
    try {
      const result = await generateTeacherStudentAnalysis(selectedStudent.name, analytics);
      setAiInsight(result);
      setTeacherComment(result); // Auto-fill comment with AI insight
    } catch (e: any) {
      setAiInsight(`Lỗi AI: ${e.message}`);
    } finally {
      setIsLoadingAI(false);
    }
  }, [analytics, selectedStudent]);

  const handleSendComment = useCallback(async () => {
    if (selectedStudentIds.length !== 1 || !teacherComment.trim()) return;
    const sid = selectedStudentIds[0];
    setIsSending(true);
    try {
      await addNotification({
        id: `notif_ana_${Date.now()}`,
        userId: sid,
        type: 'INFO',
        title: 'Nhận xét từ Giáo viên (Phân tích học tập)',
        message: teacherComment.trim(),
        isRead: false,
        createdAt: new Date().toISOString(),
        link: '/student/analytics'
      });
      alert('Đã gửi nhận xét đến học sinh thành công!');
    } catch (e: any) {
      alert(`Lỗi khi gửi: ${e.message}`);
    } finally {
      setIsSending(false);
    }
  }, [selectedStudentIds, teacherComment, addNotification]);

  const renderMainContent = () => {
    if (selectedStudentIds.length === 0) {
      return (
        <div className="bg-gray-50 rounded-2xl border border-dashed p-16 text-center no-print">
          <BarChart3 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-600">Phân tích học tập chi tiết</h3>
          <p className="text-gray-400">Vui lòng chọn lớp và ít nhất một học sinh để bắt đầu xem báo cáo.</p>
        </div>
      );
    }

    if (selectedStudentIds.length > 1) {
      return (
        <ComparisonView 
          data={comparisonAnalytics} 
          exams={exams} 
          questionBank={questionBank} 
          attempts={attempts} 
        />
      );
    }

    if (analytics && selectedStudent) {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          {/* STUDENT INFO HEADER */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold border-2 border-white/30">
                {selectedStudent.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{selectedStudent.name}</h1>
                <p className="text-indigo-100 text-sm flex items-center gap-2">
                  {selectedStudent.email} • {selectedPeriod.label} qua
                </p>
              </div>
            </div>
          </div>

          {/* STATS CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Target, label: 'Bài đã nộp', value: analytics.totalAttempts, color: 'bg-indigo-100 text-indigo-600' },
              { icon: Star, label: 'Điểm TB', value: `${fmt(analytics.avgScore)}/10`, color: 'bg-amber-100 text-amber-600' },
              { icon: TrendingUp, label: 'Điểm cao nhất', value: `${fmt(analytics.maxScore)}/10`, color: 'bg-emerald-100 text-emerald-600' },
              { icon: Zap, label: 'Chuỗi ngày học', value: `${analytics.studyStreak} ngày`, color: 'bg-purple-100 text-purple-600' },
            ].map((card, i) => (
              <div key={i} className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-3">
                <div className={`p-3 rounded-xl ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-medium">{card.label}</div>
                  <div className="text-xl font-bold text-gray-900">{card.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* TWO COLUMN CONTENT */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col: Chart & AI */}
            <div className="lg:col-span-2 space-y-6">
              {/* CHART */}
              <div className="bg-white rounded-2xl border shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-500" /> Tiến độ học tập
                </h2>
                <ComboChart data={analytics.chartData} />
              </div>

              {/* AI ANALYSIS */}
              <div className="bg-white rounded-2xl border shadow-sm p-6 border-l-4 border-l-purple-500">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" /> AI Nhận xét Sư phạm
                  </h2>
                  <button
                    onClick={handleGetAIInsight}
                    disabled={isLoadingAI}
                    className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-100 transition-all no-print"
                  >
                    {isLoadingAI ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Phân tích qua AI
                  </button>
                </div>
                {aiInsight ? (
                  <div className="bg-purple-50 rounded-xl p-4 text-sm text-gray-800 leading-relaxed italic">
                    {aiInsight}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm text-center py-6 border border-dashed rounded-xl no-print">
                    Nhấn nút "Phân tích qua AI" để xem nhận xét chuyên sâu về học sinh này.
                  </p>
                )}

                {/* TEACHER COMMENT BOX */}
                <div className="mt-6 pt-6 border-t space-y-3 no-print">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-indigo-500" /> Nhận xét & Gợi ý gửi học sinh
                  </label>
                  <textarea
                    value={teacherComment}
                    onChange={(e) => setTeacherComment(e.target.value)}
                    placeholder="Nhập nhận xét hoặc chỉnh sửa gợi ý từ AI để gửi cho học sinh..."
                    className="w-full p-4 border border-gray-200 rounded-xl text-sm min-h-[120px] focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSendComment}
                      disabled={isSending || !teacherComment.trim()}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
                    >
                      {isSending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                      Gửi nhận xét cho học sinh
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Weak Topics & Subjects */}
            <div className="space-y-6">
              {/* WEAK TOPICS */}
              <div className="bg-white rounded-2xl border shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" /> Kiến thức cần lưu ý
                </h2>
                {analytics.weakTopics.length === 0 ? (
                  <p className="text-gray-400 text-xs italic">Học sinh này đang làm rất tốt, chưa có chủ đề yếu cụ thể.</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.weakTopics.slice(0, 5).map((t, i) => (
                      <WeakTopicCard key={i} topic={t.topic} subject={t.subject} rate={t.incorrectRate} attempts={t.attempts} />
                    ))}
                  </div>
                )}
              </div>

              {/* SUBJECT BREAKDOWN */}
              <div className="bg-white rounded-2xl border shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-500" /> Kết quả theo môn
                </h2>
                <div className="space-y-4">
                  {analytics.bySubject.map(s => (
                    <div key={s.subject}>
                      <div className="flex justify-between items-center mb-1 text-sm">
                        <span className="font-bold text-gray-700">{s.subject}</span>
                        <span className="font-bold">{fmt(s.avgScore)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${s.avgScore >= 8 ? 'bg-emerald-500' : s.avgScore >= 5 ? 'bg-indigo-500' : 'bg-red-500'}`}
                          style={{ width: `${(s.avgScore / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RECOMMENDATIONS */}
          {recommendations && recommendations.recommendedExams.length > 0 && (
            <div className="bg-white rounded-2xl border shadow-sm p-6 no-print">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" /> Bài tập can thiệp đề xuất
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.recommendedExams.slice(0, 3).map((rec, i) => (
                  <div key={rec.exam.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                    <h4 className="font-bold text-sm text-gray-900 mb-1">{rec.exam.title}</h4>
                    <p className="text-[10px] text-indigo-600 font-bold mb-2 uppercase">{rec.exam.subject} • {rec.difficulty}</p>
                    <div className="text-xs text-gray-500 italic mb-2">
                      "{rec.reasons[0]}"
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  if (!currentUser || currentUser.role !== 'TEACHER') {
    return <div className="p-8 text-center text-gray-500">Trang này dành cho giáo viên.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10 relative">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
          .max-w-6xl { max-width: 100% !important; margin: 0 !important; }
          .shadow-sm, .shadow-md, .shadow-xl { border: 1px solid #eee !important; box-shadow: none !important; }
          .bg-gradient-to-r { background: #4f46e5 !important; color: white !important; -webkit-print-color-adjust: exact; }
          .animate-in { animation: none !important; }
        }
        .print-only { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
      `}</style>

      {/* PRINT HEADER */}
      <div className="print-only mb-8 text-center border-b-2 border-indigo-600 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">BÁO CÁO PHÂN TÍCH HỌC TẬP</h1>
        <p className="text-gray-600">Lớp: {myClasses.find(c => c.id === selectedClassId)?.name || 'N/A'}</p>
        <p className="text-gray-500 text-xs">Ngày xuất: {new Date().toLocaleDateString('vi-VN')}</p>
      </div>
      
      {/* SELECTION HEADER */}
      <div className="bg-white rounded-2xl border shadow-sm p-6 no-print">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <School className="h-4 w-4" /> Chọn Lớp học
            </label>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">-- Chọn lớp --</option>
              {myClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="flex-1 space-y-2">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Users className="h-4 w-4" /> Chọn Học sinh
            </label>
            <div className="relative" ref={dropdownRef}>
              <button
                disabled={!selectedClassId}
                onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)}
                className="w-full flex items-center justify-between p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-gray-50 text-sm h-[46px]"
              >
                <div className="flex flex-wrap gap-1 max-w-[90%] overflow-hidden">
                  {selectedStudentIds.length === 0 ? (
                    <span className="text-gray-400">-- Chọn học sinh (dạng lưới) --</span>
                  ) : (
                    <span className="font-bold text-indigo-600 truncate">Đã chọn {selectedStudentIds.length} học sinh</span>
                  )}
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isStudentDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isStudentDropdownOpen && (
                <div className="absolute z-50 mt-2 w-[300px] md:w-[600px] right-0 md:left-0 bg-white border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center p-4 bg-gray-50 border-b">
                    <h4 className="font-bold text-gray-700 text-sm">Danh sách học sinh</h4>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setSelectedStudentIds(studentsInClass.map(s => s.id))}
                        className="text-xs text-indigo-600 font-bold hover:underline"
                      >
                        Chọn tất cả
                      </button>
                      <button 
                        onClick={() => setSelectedStudentIds([])}
                        className="text-xs text-red-600 font-bold hover:underline"
                      >
                        Bỏ chọn hết
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto p-4 custom-scrollbar">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                      {studentsInClass.map(s => (
                        <label 
                          key={s.id} 
                          className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer border transition-all duration-200 ${
                            selectedStudentIds.includes(s.id) 
                              ? 'bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-200' 
                              : 'bg-white border-gray-100 hover:border-indigo-100 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(s.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentIds([...selectedStudentIds, s.id]);
                              } else {
                                setSelectedStudentIds(selectedStudentIds.filter(id => id !== s.id));
                              }
                            }}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs font-semibold text-gray-700 truncate" title={s.name}>{s.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {selectedStudentIds.length > 0 && (
                    <div className="p-3 bg-indigo-600 text-white text-center text-xs font-bold">
                       ĐÃ CHỌN {selectedStudentIds.length} HỌC SINH
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 space-y-2 min-w-[150px]">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Thời gian
            </label>
            <div className="flex gap-2">
              <select
                value={selectedPeriod.days}
                onChange={e => {
                  const p = TIME_PERIODS.find(t => t.days === Number(e.target.value));
                  if (p) setSelectedPeriod(p);
                }}
                className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white h-[46px]"
              >
                {TIME_PERIODS.map(p => <option key={p.days} value={p.days}>{p.label}</option>)}
              </select>
              <button 
                onClick={() => window.print()}
                disabled={selectedStudentIds.length === 0}
                className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:bg-gray-400 no-print transition-all"
                title="In báo cáo (PDF)"
              >
                <Printer className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {renderMainContent()}
    </div>
  );
};

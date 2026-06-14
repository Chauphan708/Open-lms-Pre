import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { useClassFunStore } from '../../services/classFunStore';
import { useEvaluationStore } from '../../services/evaluationStore';
import { computeStudentAnalytics } from '../../utils/analyticsEngine';
import { generatePortfolioAnalysis } from '../../services/geminiService';
import { supabase } from '../../services/supabaseClient';
import { exportPortfolioToWord } from '../../utils/portfolioExport';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  ArrowLeft, User, BookOpen, MessageSquare, Zap, Trophy, StickyNote, Brain,
  TrendingUp, TrendingDown, Minus, Target, Award, Calendar, Plus, Trash2, Save,
  Loader2, ChevronRight, FileText, Download, Sparkles, AlertTriangle, CheckCircle,
  XCircle, Clock, Printer, Share2
} from 'lucide-react';

// ============================================
// TYPES
// ============================================
interface PortfolioNote {
  id: string;
  student_id: string;
  teacher_id: string;
  category: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const NOTE_CATEGORIES = [
  { key: 'general', label: '📝 Ghi chú chung', color: '#6366f1' },
  { key: 'health', label: '🏥 Sức khoẻ', color: '#ef4444' },
  { key: 'family', label: '🏠 Hoàn cảnh gia đình', color: '#f59e0b' },
  { key: 'talent', label: '⭐ Năng khiếu', color: '#10b981' },
  { key: 'external_award', label: '🏅 Giải thưởng bên ngoài', color: '#8b5cf6' },
  { key: 'concern', label: '⚠️ Vấn đề cần chú ý', color: '#f97316' },
];

const TABS = [
  { key: 'study', label: 'Học tập', icon: BookOpen },
  { key: 'evaluation', label: 'Nhận xét GV', icon: MessageSquare },
  { key: 'behavior', label: 'Hành vi', icon: Zap },
  { key: 'arena', label: 'Đấu trường', icon: Trophy },
  { key: 'notes', label: 'Ghi chú GV', icon: StickyNote },
] as const;
type TabKey = typeof TABS[number]['key'];

// ============================================
// MAIN COMPONENT
// ============================================
export const StudentPortfolio: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { user, users, attempts, exams, questionBank, classes } = useStore();
  const { logs: behaviorLogs, fetchStudentLogs, attendance, fetchAttendance } = useClassFunStore();
  const { fetchStudentEvaluations } = useEvaluationStore();

  const [activeTab, setActiveTab] = useState<TabKey>('study');
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [arenaProfile, setArenaProfile] = useState<any>(null);
  const [arenaMatches, setArenaMatches] = useState<any[]>([]);
  const [notes, setNotes] = useState<PortfolioNote[]>([]);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState({ category: 'general', title: '', content: '' });
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  const student = users.find(u => u.id === studentId);

  // Fetch all data on mount
  useEffect(() => {
    if (!studentId) return;
    const load = async () => {
      setIsLoadingData(true);
      try {
        // Behavior logs
        fetchStudentLogs(studentId);
        // Evaluations
        const evals = await fetchStudentEvaluations(studentId);
        setEvaluations(evals);
        // Arena profile
        const { data: ap } = await supabase.from('arena_profiles').select('*').eq('id', studentId).maybeSingle();
        setArenaProfile(ap);
        // Arena matches
        const { data: am } = await supabase.from('arena_matches').select('*')
          .or(`player1_id.eq.${studentId},player2_id.eq.${studentId}`)
          .eq('status', 'finished')
          .order('created_at', { ascending: false }).limit(10);
        setArenaMatches(am || []);
        // Portfolio notes
        const { data: pn } = await supabase.from('portfolio_notes').select('*')
          .eq('student_id', studentId).order('created_at', { ascending: false });
        setNotes(pn || []);
        // Attendance
        const today = new Date().toISOString().split('T')[0];
        const studentClass = classes.find(c => c.studentIds?.includes(studentId));
        if (studentClass) {
          fetchAttendance(studentClass.id, today);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingData(false);
      }
    };
    load();
  }, [studentId]);

  // Analytics
  const analytics = useMemo(() => {
    if (!studentId) return null;
    return computeStudentAnalytics(studentId, attempts, exams, questionBank, 90);
  }, [studentId, attempts, exams, questionBank]);

  // Behavior summary
  const behaviorSummary = useMemo(() => {
    const studentLogs = behaviorLogs.filter(l => l.student_id === studentId);
    const totalScore = studentLogs.reduce((sum, l) => sum + l.points, 0);
    const positive = studentLogs.filter(l => l.points > 0).length;
    const negative = studentLogs.filter(l => l.points < 0).length;
    return { totalScore, positive, negative, logs: studentLogs };
  }, [behaviorLogs, studentId]);

  // Attendance summary
  const attendanceSummary = useMemo(() => {
    const studentAtt = attendance.filter((a: any) => a.student_id === studentId);
    const present = studentAtt.filter((a: any) => a.status === 'present').length;
    const absent = studentAtt.filter((a: any) => a.status !== 'present').length;
    return { present, absent, total: studentAtt.length };
  }, [attendance, studentId]);

  // AI Analysis
  const handleAiAnalysis = async () => {
    if (!student || !analytics) return;
    setIsLoadingAi(true);
    try {
      const recentEvals = evaluations.slice(0, 5);
      const evalSummary = recentEvals.length > 0
        ? recentEvals.map(e => {
          const ratings = Object.entries(e.subjects || {}).filter(([, v]: any) => v.rating !== 'None').map(([k, v]: any) => `${k}: ${v.rating}`).join(', ');
          return `${e.evaluation_date}: ${ratings}${e.general_comment ? ' | ' + e.general_comment : ''}`;
        }).join('\n')
        : 'Chưa có nhận xét TT27';

      const notesSummary = notes.length > 0
        ? notes.map(n => `[${n.category}] ${n.title}: ${n.content}`).join('\n')
        : '';

      const result = await generatePortfolioAnalysis(student.name, {
        avgScore: analytics.avgScore,
        totalAttempts: analytics.totalAttempts,
        weakTopics: analytics.weakTopics.slice(0, 5),
        behaviorScore: behaviorSummary.totalScore,
        behaviorPositiveCount: behaviorSummary.positive,
        behaviorNegativeCount: behaviorSummary.negative,
        attendancePresent: attendanceSummary.present,
        attendanceAbsent: attendanceSummary.absent,
        attendanceTotal: attendanceSummary.total,
        evaluationSummary: evalSummary,
        arenaElo: arenaProfile?.elo_rating || 0,
        arenaWins: arenaProfile?.wins || 0,
        arenaLosses: arenaProfile?.losses || 0,
        towerFloor: arenaProfile?.tower_floor || 0,
        teacherNotes: notesSummary,
      });
      setAiResult(result);
    } catch (err: any) {
      setAiResult("⚠️ Lỗi AI: " + (err.message || "Không thể kết nối."));
    } finally {
      setIsLoadingAi(false);
    }
  };

  // Add note
  const handleAddNote = async () => {
    if (!newNote.title.trim() || !studentId || !user) return;
    const payload = {
      id: `pn_${Date.now()}`,
      student_id: studentId,
      teacher_id: user.id,
      category: newNote.category,
      title: newNote.title,
      content: newNote.content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('portfolio_notes').insert(payload);
    if (!error) {
      setNotes(prev => [payload, ...prev]);
      setNewNote({ category: 'general', title: '', content: '' });
      setShowAddNote(false);
    }
  };

  // Delete note
  const handleDeleteNote = async (id: string) => {
    const { error } = await supabase.from('portfolio_notes').delete().eq('id', id);
    if (!error) setNotes(prev => prev.filter(n => n.id !== id));
  };

  // Share to Parent
  const handleShare = async () => {
    if (!studentId || !user) return;
    setIsSharing(true);
    try {
      const { error: shareError } = await supabase
        .from('portfolio_shares')
        .upsert({
          student_id: studentId,
          shared_by: user.id,
          shared_at: new Date().toISOString(),
          is_shared: true,
          teacher_message: shareMessage
        });

      if (shareError) throw shareError;

      await supabase.from('notifications').insert({
        id: `notif_${Date.now()}`,
        user_id: studentId,
        type: 'INFO',
        title: 'Hồ sơ học tập của con đã được cập nhật',
        message: shareMessage || `Thầy/cô ${user.name} đã gửi hồ sơ học tập mới nhất.`,
        is_read: false,
        created_at: new Date().toISOString(),
        link: '/student/portfolio'
      });

      alert('✅ Đã gửi hồ sơ thành công!');
      setIsShareModalOpen(false);
      setShareMessage('');
    } catch (err: any) {
      alert('❌ Lỗi: ' + err.message);
    } finally {
      setIsSharing(false);
    }
  };

  if (!student) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Không tìm thấy học sinh</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-indigo-600 font-bold hover:underline">← Quay lại</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .anim-slide { animation: slideUp 0.4s ease-out forwards; }
        .markdown-body ul { list-style-type: disc !important; padding-left: 1.5rem !important; }
        .markdown-body p { margin-bottom: 0.5rem !important; }
        .markdown-body h3 { font-weight: 800 !important; margin-top: 1rem !important; color: #1e293b; }
      `}</style>

      {/* Back + Title */}
      <div className="flex items-center gap-3 mb-6 no-print">
        <button 
          onClick={() => navigate('/', { state: { openPortfolioModal: true } })} 
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          title="Quay lại danh sách"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-black text-gray-900">Hồ Sơ Học Tập</h1>
      </div>

      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-2xl mb-6 p-6 text-white anim-slide no-print" style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81, #4c1d95)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)' }}></div>
        <div className="relative flex flex-col md:flex-row md:items-center gap-5">
          <img src={student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=6366f1&color=fff&size=80`}
            alt="" className="w-20 h-20 rounded-2xl shadow-lg border-2 border-white/20 mx-auto md:mx-0" />
          <div className="flex-1 text-center md:text-left">
            <p className="text-purple-300 text-sm">{student.className || 'Chưa phân lớp'}</p>
            <h2 className="text-2xl font-black">{student.name}</h2>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-3">
              <span className="bg-white/10 px-3 py-1 rounded-full text-sm flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-blue-300" />
                <b className="text-blue-300">{analytics?.avgScore?.toFixed(1) || '—'}</b> TB
              </span>
              <span className="bg-white/10 px-3 py-1 rounded-full text-sm flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-300" />
                <b className={`${behaviorSummary.totalScore >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{behaviorSummary.totalScore >= 0 ? '+' : ''}{behaviorSummary.totalScore}</b> Hành vi
              </span>
              {arenaProfile && (
                <span className="bg-white/10 px-3 py-1 rounded-full text-sm flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5 text-yellow-300" />
                  <b className="text-yellow-300">{arenaProfile.elo_rating}</b> Elo
                </span>
              )}
            </div>
          </div>
          {/* Export Buttons */}
          <div className="flex flex-row md:flex-col gap-2">
            <button 
              onClick={() => window.print()}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold transition-all border border-white/10"
            >
              <Printer className="h-4 w-4" /> Xuất PDF
            </button>
            <button 
              onClick={() => {
                if (!analytics) return;
                exportPortfolioToWord(student.name, student.className || 'Chưa rõ', {
                  avgScore: analytics.avgScore,
                  totalAttempts: analytics.totalAttempts,
                  studyStreak: analytics.studyStreak,
                  behaviorScore: behaviorSummary.totalScore,
                  behaviorPositive: behaviorSummary.positive,
                  behaviorNegative: behaviorSummary.negative,
                  arenaElo: arenaProfile?.elo_rating || 0,
                  arenaWins: arenaProfile?.wins || 0,
                  arenaLosses: arenaProfile?.losses || 0,
                  towerFloor: arenaProfile?.tower_floor || 0,
                  attendance: attendanceSummary,
                  weakTopics: analytics.weakTopics.slice(0, 5),
                  aiAnalysis: aiResult,
                  teacherNotes: notes.map(n => ({
                    category: n.category,
                    title: n.title,
                    content: n.content,
                    date: new Date(n.created_at).toLocaleDateString('vi-VN')
                  }))
                });
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-900/20"
            >
              <Download className="h-4 w-4" /> Xuất Word
            </button>
            <button 
              onClick={() => setIsShareModalOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-900/20"
            >
              <Share2 className="h-4 w-4" /> Gửi PHHS
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto no-print">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="anim-slide no-print" key={activeTab}>
        {/* ===== TAB: HỌC TẬP ===== */}
        {activeTab === 'study' && analytics && (
          <div className="space-y-6">
            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Điểm TB', value: analytics.avgScore.toFixed(1), color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'Điểm cao nhất', value: analytics.maxScore.toFixed(1), color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Tổng bài làm', value: String(analytics.totalAttempts), color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Chuỗi ngày học', value: analytics.studyStreak + ' ngày', color: 'text-amber-600', bg: 'bg-amber-50' },
              ].map((s, i) => (
                <div key={i} className={`${s.bg} rounded-xl p-4 border`}>
                  <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                  <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Weak Topics */}
            {analytics.weakTopics.length > 0 && (
              <div className="bg-white rounded-xl p-5 border shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Target className="h-5 w-5 text-red-500" />Chủ đề yếu nhất</h3>
                <div className="space-y-3">
                  {analytics.weakTopics.slice(0, 5).map((t: any, i: number) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{t.topic} <span className="text-gray-400">({t.subject})</span></span>
                        <span className="text-red-600 font-bold">Sai {t.incorrectRate}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full" style={{ width: `${t.incorrectRate}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* By Subject */}
            {analytics.bySubject.length > 0 && (
              <div className="bg-white rounded-xl p-5 border shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><BookOpen className="h-5 w-5 text-indigo-500" />Kết quả theo Môn</h3>
                <div className="space-y-3">
                  {analytics.bySubject.map((s: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-800">{s.subject}</span>
                        {s.trend === 'UP' ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : s.trend === 'DOWN' ? <TrendingDown className="h-4 w-4 text-red-500" /> : <Minus className="h-4 w-4 text-gray-400" />}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{s.attempts} bài</span>
                        <span className={`text-sm font-black ${s.avgScore >= 7 ? 'text-emerald-600' : s.avgScore >= 5 ? 'text-amber-600' : 'text-red-600'}`}>{s.avgScore}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* By Difficulty */}
            <div className="bg-white rounded-xl p-5 border shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Award className="h-5 w-5 text-purple-500" />Theo mức độ</h3>
              <div className="grid grid-cols-3 gap-3">
                {analytics.byDifficulty.map((d: any) => (
                  <div key={d.level} className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">{d.label}</p>
                    <p className={`text-xl font-black ${d.correctRate > 70 ? 'text-emerald-600' : d.correctRate > 40 ? 'text-amber-600' : 'text-red-600'}`}>{d.correctRate}%</p>
                    <p className="text-[10px] text-gray-400">{d.correctQuestions}/{d.totalQuestions}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== TAB: NHẬN XÉT GV ===== */}
        {activeTab === 'evaluation' && (
          <div className="space-y-4">
            {evaluations.length === 0 ? (
              <div className="bg-white rounded-xl p-12 border text-center">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Chưa có nhận xét TT27 nào cho học sinh này.</p>
              </div>
            ) : (
              evaluations.slice(0, 20).map((ev: any) => (
                <div key={ev.id} className="bg-white rounded-xl p-5 border shadow-sm hover:border-indigo-200 transition-colors">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-indigo-500" />
                    <span className="text-sm font-bold text-indigo-700">{ev.evaluation_date}</span>
                  </div>
                  {/* Subject ratings */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {Object.entries(ev.subjects || {}).filter(([, v]: any) => v.rating !== 'None').map(([key, val]: any) => (
                      <span key={key} className={`text-xs font-bold px-2 py-1 rounded-full border ${val.rating === 'T' ? 'bg-green-50 text-green-700 border-green-200' : val.rating === 'H' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {key}: {val.rating}
                      </span>
                    ))}
                  </div>
                  {ev.general_comment && <p className="text-sm text-gray-600 italic">💬 {ev.general_comment}</p>}
                </div>
              ))
            )}
          </div>
        )}

        {/* ===== TAB: HÀNH VI ===== */}
        {activeTab === 'behavior' && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-5 border text-center">
                <p className="text-xs text-gray-500 mb-1">Tổng điểm</p>
                <p className={`text-3xl font-black ${behaviorSummary.totalScore >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {behaviorSummary.totalScore >= 0 ? '+' : ''}{behaviorSummary.totalScore}
                </p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100 text-center">
                <p className="text-xs text-gray-500 mb-1">Tích cực</p>
                <p className="text-3xl font-black text-emerald-600">{behaviorSummary.positive}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-5 border border-red-100 text-center">
                <p className="text-xs text-gray-500 mb-1">Cần cải thiện</p>
                <p className="text-3xl font-black text-red-600">{behaviorSummary.negative}</p>
              </div>
            </div>
            {/* Logs */}
            <div className="bg-white rounded-xl p-5 border shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4">Lịch sử ghi nhận</h3>
              {behaviorSummary.logs.length === 0 ? (
                <p className="text-gray-400 text-center py-6">Chưa có dữ liệu hành vi.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {behaviorSummary.logs.slice(0, 30).map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${log.points >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {log.points > 0 ? '+' : ''}{log.points}
                        </div>
                        <span className="text-sm text-gray-700">{log.reason || 'Ghi nhận'}</span>
                      </div>
                      <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(log.created_at).toLocaleDateString('vi-VN')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== TAB: ĐẤU TRƯỜNG ===== */}
        {activeTab === 'arena' && (
          <div className="space-y-6">
            {!arenaProfile ? (
              <div className="bg-white rounded-xl p-12 border text-center">
                <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Học sinh chưa tham gia Đấu Trường Arena.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Elo Rating', value: arenaProfile.elo_rating, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                    { label: 'Tổng XP', value: arenaProfile.total_xp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Thắng / Thua', value: `${arenaProfile.wins}W / ${arenaProfile.losses}L`, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Tầng Tháp', value: arenaProfile.tower_floor, color: 'text-purple-600', bg: 'bg-purple-50' },
                  ].map((s, i) => (
                    <div key={i} className={`${s.bg} rounded-xl p-4 border`}>
                      <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                      <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {arenaMatches.length > 0 && (
                  <div className="bg-white rounded-xl p-5 border shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4">10 trận gần nhất</h3>
                    <div className="space-y-2">
                      {arenaMatches.map((m: any) => {
                        const isP1 = m.player1_id === studentId;
                        const won = m.winner_id === studentId;
                        return (
                          <div key={m.id} className={`flex items-center justify-between p-3 rounded-lg ${won ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
                            <div className="flex items-center gap-2">
                              {won ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                              <span className={`text-sm font-bold ${won ? 'text-emerald-700' : 'text-red-700'}`}>{won ? 'Thắng' : 'Thua'}</span>
                            </div>
                            <span className="text-sm text-gray-500">{isP1 ? m.player1_score : m.player2_score} điểm</span>
                            <span className="text-xs text-gray-400">{new Date(m.created_at).toLocaleDateString('vi-VN')}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ===== TAB: GHI CHÚ GV ===== */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">Ghi chú bổ sung từ Giáo viên (hoàn cảnh GĐ, sức khoẻ, năng khiếu, giải thưởng...)</p>
              <button onClick={() => setShowAddNote(true)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200">
                <Plus className="h-4 w-4" /> Thêm ghi chú
              </button>
            </div>

            {/* Add Note Form */}
            {showAddNote && (
              <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100 space-y-3 anim-slide">
                <select value={newNote.category} onChange={e => setNewNote(p => ({ ...p, category: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-medium">
                  {NOTE_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
                <input value={newNote.title} onChange={e => setNewNote(p => ({ ...p, title: e.target.value }))}
                  placeholder="Tiêu đề ghi chú..." className="w-full border rounded-lg px-3 py-2 text-sm" />
                <textarea value={newNote.content} onChange={e => setNewNote(p => ({ ...p, content: e.target.value }))}
                  placeholder="Nội dung chi tiết..." rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowAddNote(false)} className="px-4 py-2 text-sm text-gray-600 bg-white border rounded-lg">Hủy</button>
                  <button onClick={handleAddNote} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg flex items-center gap-1"><Save className="h-4 w-4" />Lưu</button>
                </div>
              </div>
            )}

            {/* Notes list */}
            {notes.length === 0 && !showAddNote ? (
              <div className="bg-white rounded-xl p-12 border text-center">
                <StickyNote className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Chưa có ghi chú nào. Hãy thêm ghi chú để bổ sung thông tin cho hồ sơ HS.</p>
              </div>
            ) : (
              notes.map(note => {
                const cat = NOTE_CATEGORIES.find(c => c.key === note.category);
                return (
                  <div key={note.id} className="bg-white rounded-xl p-5 border shadow-sm hover:border-indigo-200 transition-colors group">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: cat?.color + '15', color: cat?.color }}>{cat?.label || note.category}</span>
                        <h4 className="font-bold text-gray-900 mt-2">{note.title}</h4>
                        {note.content && <p className="text-sm text-gray-600 mt-1">{note.content}</p>}
                        <p className="text-xs text-gray-400 mt-2">{new Date(note.created_at).toLocaleDateString('vi-VN')}</p>
                      </div>
                      <button onClick={() => handleDeleteNote(note.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* === AI ANALYSIS PANEL (always visible at bottom) === */}
      <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 no-print">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-black text-gray-900">AI Phân tích Toàn diện</h3>
            <p className="text-xs text-blue-600">Gemini 2.5 Flash • Phân tích tổng hợp 7 nguồn dữ liệu</p>
          </div>
        </div>

        {!aiResult && !isLoadingAi && (
          <button onClick={handleAiAnalysis}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 group">
            <Sparkles className="h-5 w-5 group-hover:rotate-12 transition-transform" />
            🧠 Yêu cầu AI Phân tích Toàn diện
          </button>
        )}

        {isLoadingAi && (
          <div className="py-8 flex flex-col items-center">
            <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-3" />
            <p className="text-indigo-600 font-medium animate-pulse">AI đang phân tích hồ sơ từ 7 nguồn dữ liệu...</p>
          </div>
        )}

        {aiResult && !isLoadingAi && (
          <div className="bg-white/80 backdrop-blur rounded-xl p-6 border border-white markdown-body">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{aiResult}</ReactMarkdown>
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400 italic">Sinh bởi AI OpenLMS • Gemini 2.5 Flash</span>
              <button onClick={handleAiAnalysis} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg font-bold">✨ Phân tích lại</button>
            </div>
          </div>
        )}
      </div>

      {/* === PRINTABLE CONTENT (Hidden on screen, shown on print) === */}
      <div className="only-print font-serif p-10 bg-white text-black" style={{ fontSize: '12pt', lineHeight: 1.6 }}>
        <div className="text-center border-b-2 border-black pb-4 mb-8">
          <h1 className="text-2xl font-bold uppercase">HỒ SƠ HỌC TẬP TOÀN DIỆN</h1>
          <p className="text-lg">Học sinh: <span className="font-bold underline">{student.name}</span> — Lớp: <span className="font-bold underline">{student.className || '...'}</span></p>
          <p className="italic">Thời gian xuất: {new Date().toLocaleString('vi-VN')}</p>
        </div>

        {/* Quick Stats Grid for Print */}
        <div className="grid grid-cols-4 border border-black mb-8 text-center bg-gray-50">
          <div className="border-r border-black p-2">
            <p className="font-bold text-xs uppercase">Điểm TB</p>
            <p className="text-xl font-bold">{analytics?.avgScore.toFixed(1) || '—'}</p>
          </div>
          <div className="border-r border-black p-2">
            <p className="font-bold text-xs uppercase">Hành vi</p>
            <p className="text-xl font-bold">{behaviorSummary.totalScore >= 0 ? '+' : ''}{behaviorSummary.totalScore}</p>
          </div>
          <div className="border-r border-black p-2">
            <p className="font-bold text-xs uppercase">Arena Elo</p>
            <p className="text-xl font-bold">{arenaProfile?.elo_rating || '1000'}</p>
          </div>
          <div className="p-2">
            <p className="font-bold text-xs uppercase">Tầng Tháp</p>
            <p className="text-xl font-bold">{arenaProfile?.tower_floor || '1'}</p>
          </div>
        </div>

        <h3 className="text-lg font-bold border-l-4 border-black pl-2 mb-4">1. CHI TIẾT HỌC TẬP</h3>
        <table className="w-full border-collapse border border-black mb-6">
          <thead className="bg-gray-100 font-bold">
            <tr>
              <th className="border border-black p-2 text-left">Môn học</th>
              <th className="border border-black p-2">Số bài nộp</th>
              <th className="border border-black p-2">Điểm Trung bình</th>
              <th className="border border-black p-2">Xu hướng</th>
            </tr>
          </thead>
          <tbody>
            {analytics?.bySubject.map((s: any) => (
              <tr key={s.subject}>
                <td className="border border-black p-2 font-bold">{s.subject}</td>
                <td className="border border-black p-2 text-center">{s.attempts}</td>
                <td className="border border-black p-2 text-center font-bold">{s.avgScore}</td>
                <td className="border border-black p-2 text-center">{s.trend === 'UP' ? '📈 Tăng' : s.trend === 'DOWN' ? '📉 Giảm' : '➖ Ổn định'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {analytics && analytics.weakTopics.length > 0 && (
          <>
            <h3 className="text-lg font-bold border-l-4 border-black pl-2 mb-4">2. KIẾN THỨC CẦN LƯU Ý</h3>
            <div className="mb-8 pl-4">
              {analytics.weakTopics.slice(0, 5).map((t: any, i: number) => (
                <p key={i}>• <span className="font-bold">[{t.subject}] {t.topic}</span>: Tỷ lệ sai {t.incorrectRate}%</p>
              ))}
            </div>
          </>
        )}

        {notes.length > 0 && (
          <>
            <h3 className="text-lg font-bold border-l-4 border-black pl-2 mb-4">3. GHI CHÚ TỪ GIÁO VIÊN</h3>
            <div className="mb-8 pl-4 space-y-2">
              {notes.map(n => (
                <div key={n.id}>
                  <p className="font-bold">[{new Date(n.created_at).toLocaleDateString('vi-VN')}] {n.title}:</p>
                  <p className="italic ml-4">{n.content}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {aiResult && (
          <>
            <div className="page-break" />
            <h3 className="text-lg font-bold border-l-4 border-black pl-2 mb-4 mt-10">4. PHÂN TÍCH TỔNG HỢP (AI OPENLMS)</h3>
            <div className="bg-gray-50 p-6 rounded border border-black markdown-body">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{aiResult}</ReactMarkdown>
            </div>
          </>
        )}

        <div className="mt-20 flex justify-between">
          <div className="text-center w-64">
            <p className="font-bold">XÁC NHẬN CỦA PHỤ HUYNH</p>
            <p className="text-xs italic">(Ký và ghi rõ họ tên)</p>
          </div>
          <div className="text-center w-64">
            <p className="font-bold">GIÁO VIÊN CHỦ NHIỆM</p>
            <p className="text-xs italic">(Ký và ghi rõ họ tên)</p>
            <div className="h-20" />
            <p className="font-bold">{user?.name}</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .anim-slide { animation: slideUp 0.4s ease-out forwards; }
        .markdown-body ul { list-style-type: disc !important; padding-left: 1.5rem !important; }
        .markdown-body p { margin-bottom: 0.5rem !important; }
        .markdown-body h3 { font-weight: 800 !important; margin-top: 1rem !important; color: #1e293b; }
        
        .only-print { display: none; }
        @media print {
          .no-print { display: none !important; }
          .only-print { display: block !important; }
          body { background: white !important; }
          .max-w-5xl { max-width: 100% !important; border: none !important; margin: 0 !important; padding: 0 !important; }
          @page { margin: 15mm; size: A4; }
          .page-break { page-break-after: always; }
          .markdown-body h3 { color: black !important; border-bottom: 1px solid #eee; }
        }
      `}</style>

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-indigo-50 border-b">
              <h2 className="text-xl font-black text-indigo-900 flex items-center gap-2">
                <Share2 className="h-6 w-6" />
                Gửi hồ sơ cho Phụ huynh
              </h2>
              <p className="text-sm text-indigo-600 mt-1">Gửi dữ liệu học tập và phân tích AI của <b>{student.name}</b></p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Lời nhắn kèm theo (tùy chọn):</label>
                <textarea 
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  placeholder="Ví dụ: Thầy gửi kết quả học tập tháng 3 của con, mời bố mẹ xem qua..."
                  className="w-full border border-gray-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[120px] transition-all"
                />
              </div>
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3">
                <Brain className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  <b>Lưu ý:</b> Toàn bộ dữ liệu bao gồm kết quả học tập, hành vi, và phần <b>AI Phân tích</b> sẽ được chia sẻ cho Phụ huynh.
                </p>
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-t flex gap-3">
              <button 
                onClick={() => setIsShareModalOpen(false)}
                className="flex-1 py-3 px-4 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-all"
                disabled={isSharing}
              >
                Hủy
              </button>
              <button 
                onClick={handleShare}
                className="flex-[2] py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2"
                disabled={isSharing}
              >
                {isSharing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Đang gửi...
                  </>
                ) : (
                  <>Gửi ngay</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { useClassFunStore } from '../../services/classFunStore';
import { useEvaluationStore } from '../../services/evaluationStore';
import { computeStudentAnalytics } from '../../utils/analyticsEngine';
import { supabase } from '../../services/supabaseClient';
import {
  User, BookOpen, MessageSquare, Zap, Trophy, Brain,
  TrendingUp, TrendingDown, Minus, Target, Award, Calendar,
  FileText, CheckCircle, XCircle, Clock, ChevronRight, Sparkles
} from 'lucide-react';

export const MyPortfolio: React.FC = () => {
  const navigate = useNavigate();
  const { user, attempts, exams, questionBank, classes } = useStore();
  const { logs: behaviorLogs, fetchStudentLogs, attendance, fetchAttendance } = useClassFunStore();
  const { fetchStudentEvaluations } = useEvaluationStore();

  const [activeTab, setActiveTab] = useState<'study' | 'evaluation' | 'behavior' | 'arena'>('study');
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [arenaProfile, setArenaProfile] = useState<any>(null);
  const [arenaMatches, setArenaMatches] = useState<any[]>([]);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);

  const studentId = user?.id;

  useEffect(() => {
    if (!studentId) return;
    const load = async () => {
      fetchStudentLogs(studentId);
      const evals = await fetchStudentEvaluations(studentId);
      setEvaluations(evals);
      const { data: ap } = await supabase.from('arena_profiles').select('*').eq('id', studentId).maybeSingle();
      setArenaProfile(ap);
      const { data: am } = await supabase.from('arena_matches').select('*')
        .or(`player1_id.eq.${studentId},player2_id.eq.${studentId}`)
        .eq('status', 'finished')
        .order('created_at', { ascending: false }).limit(10);
      setArenaMatches(am || []);
      const studentClass = classes.find(c => c.studentIds?.includes(studentId));
      if (studentClass) fetchAttendance(studentClass.id, new Date().toISOString().split('T')[0]);
      
      // Fetch portfolio notes
      const { data: pn } = await supabase.from('portfolio_notes').select('*')
        .eq('student_id', studentId).order('created_at', { ascending: false });
      setNotes(pn || []);
    };
    load();
  }, [studentId]);

  const analytics = useMemo(() => {
    if (!studentId) return null;
    return computeStudentAnalytics(studentId, attempts, exams, questionBank, 90);
  }, [studentId, attempts, exams, questionBank]);

  const behaviorSummary = useMemo(() => {
    const logs = behaviorLogs.filter(l => l.student_id === studentId);
    return {
      totalScore: logs.reduce((s, l) => s + l.points, 0),
      positive: logs.filter(l => l.points > 0).length,
      negative: logs.filter(l => l.points < 0).length,
      logs,
    };
  }, [behaviorLogs, studentId]);

  const attendanceSummary = useMemo(() => {
    const studentAtt = attendance.filter((a: any) => a.student_id === studentId);
    return {
      present: studentAtt.filter((a: any) => a.status === 'present').length,
      absent: studentAtt.filter((a: any) => a.status !== 'present').length,
      total: studentAtt.length
    };
  }, [attendance, studentId]);

  const handleAiAnalysis = async () => {
    if (!user || !analytics) return;
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

      const { generatePortfolioAnalysis } = await import('../../services/geminiService');
      const result = await generatePortfolioAnalysis(user.name, {
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
        arenaElo: arenaProfile?.elo_rating || 1000,
        arenaWins: arenaProfile?.wins || 0,
        arenaLosses: arenaProfile?.losses || 0,
        towerFloor: arenaProfile?.tower_floor || 1,
        teacherNotes: notesSummary,
      });
      setAiResult(result);
    } catch (err: any) {
      setAiResult("⚠️ Lỗi AI: " + (err.message || "Không thể kết nối."));
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleShare = async () => {
    if (!studentId || !user) return;
    setIsSharing(true);
    try {
      await supabase
        .from('portfolio_shares')
        .upsert({
          student_id: studentId,
          shared_by: user.id,
          shared_at: new Date().toISOString(),
          is_shared: true
        });

      alert('✅ Đã gửi kết quả cho cha mẹ thành công!');
      setIsShareModalOpen(false);
    } catch (err: any) {
      alert('❌ Lỗi: ' + err.message);
    } finally {
      setIsSharing(false);
    }
  };

  if (!user) return null;

  const TABS = [
    { key: 'study' as const, label: 'Học tập', icon: BookOpen },
    { key: 'evaluation' as const, label: 'Nhận xét', icon: MessageSquare },
    { key: 'behavior' as const, label: 'Hành vi', icon: Zap },
    { key: 'arena' as const, label: 'Đấu trường', icon: Trophy },
  ];

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .anim-slide { animation: slideUp 0.4s ease-out forwards; }
      `}</style>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-indigo-200">
            <User className="h-6 w-6 text-white" />
          </div>
          Hồ Sơ Của Em
        </h1>
        <p className="text-gray-500 mt-1 text-sm">Tổng hợp toàn bộ kết quả học tập, đánh giá, và hoạt động của em.</p>
      </div>

      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-2xl mb-6 p-6 text-white anim-slide" style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81, #4c1d95)' }}>
        <div className="relative flex items-center gap-5">
          <img src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff&size=80`}
            alt="" className="w-20 h-20 rounded-2xl shadow-lg border-2 border-white/20" />
          <div className="flex-1">
            <p className="text-purple-300 text-sm">{user.className || ''}</p>
            <h2 className="text-2xl font-black">{user.name}</h2>
            <div className="flex flex-wrap gap-3 mt-3">
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
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setIsShareModalOpen(true)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold transition-all border border-white/10 flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" /> Gửi cho Cha Mẹ
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto">
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
      <div className="anim-slide" key={activeTab}>
        {/* STUDY TAB */}
        {activeTab === 'study' && analytics && (
          <div className="space-y-6">
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

            {analytics.weakTopics.length > 0 && (
              <div className="bg-white rounded-xl p-5 border shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Target className="h-5 w-5 text-red-500" />Chủ đề cần ôn tập</h3>
                <div className="space-y-3">
                  {analytics.weakTopics.slice(0, 5).map((t: any, i: number) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{t.topic}</span>
                        <span className="text-red-600 font-bold">Sai {t.incorrectRate}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full" style={{ width: `${t.incorrectRate}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate('/arena/dashboard')}
                  className="mt-4 w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 group hover:from-blue-700 hover:to-indigo-700 transition-all">
                  <Sparkles className="h-4 w-4" /> Nhờ AI hướng dẫn ôn tập <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}

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
                      <span className={`text-sm font-black ${s.avgScore >= 7 ? 'text-emerald-600' : s.avgScore >= 5 ? 'text-amber-600' : 'text-red-600'}`}>{s.avgScore}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* EVALUATION TAB */}
        {activeTab === 'evaluation' && (
          <div className="space-y-4">
            {evaluations.length === 0 ? (
              <div className="bg-white rounded-xl p-12 border text-center">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Chưa có nhận xét từ Giáo viên.</p>
              </div>
            ) : evaluations.slice(0, 20).map((ev: any) => (
              <div key={ev.id} className="bg-white rounded-xl p-5 border shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm font-bold text-indigo-700">{ev.evaluation_date}</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {Object.entries(ev.subjects || {}).filter(([, v]: any) => v.rating !== 'None').map(([key, val]: any) => (
                    <span key={key} className={`text-xs font-bold px-2 py-1 rounded-full border ${val.rating === 'T' ? 'bg-green-50 text-green-700 border-green-200' : val.rating === 'H' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                      {key}: {val.rating}
                    </span>
                  ))}
                </div>
                {ev.general_comment && <p className="text-sm text-gray-600 italic">💬 {ev.general_comment}</p>}
              </div>
            ))}
          </div>
        )}

        {/* BEHAVIOR TAB */}
        {activeTab === 'behavior' && (
          <div className="space-y-6">
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
            <div className="bg-white rounded-xl p-5 border shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4">Lịch sử</h3>
              {behaviorSummary.logs.length === 0 ? <p className="text-gray-400 text-center py-6">Chưa có dữ liệu.</p> : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {behaviorSummary.logs.slice(0, 30).map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${log.points >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {log.points > 0 ? '+' : ''}{log.points}
                        </div>
                        <span className="text-sm text-gray-700">{log.reason || 'Ghi nhận'}</span>
                      </div>
                      <span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleDateString('vi-VN')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ARENA TAB */}
        {activeTab === 'arena' && (
          <div className="space-y-6">
            {!arenaProfile ? (
              <div className="bg-white rounded-xl p-12 border text-center">
                <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Em chưa tham gia Đấu Trường Arena.</p>
                <button onClick={() => navigate('/arena')} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700">Tham gia ngay →</button>
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
                    <h3 className="font-bold text-gray-800 mb-4">Trận đấu gần đây</h3>
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
      </div>

      {/* AI ANALYSIS PANEL */}
      <div className="mt-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-black text-gray-900">Thông thái OpenLMS (AI)</h3>
            <p className="text-xs text-indigo-600 font-medium">Phân tích kết quả và gợi ý lộ trình học tập</p>
          </div>
        </div>

        {!aiResult && !isLoadingAi && (
          <button onClick={handleAiAnalysis}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 group">
            <Sparkles className="h-5 w-5 group-hover:rotate-12 transition-transform" />
            Nhờ AI phân tích hồ sơ của em
          </button>
        )}

        {isLoadingAi && (
          <div className="py-8 flex flex-col items-center">
            <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-indigo-600 font-bold animate-pulse">Thông thái đang đọc hồ sơ của em...</p>
          </div>
        )}

        {aiResult && !isLoadingAi && (
          <div className="bg-white rounded-xl p-6 border border-indigo-100 shadow-sm relative overflow-hidden prose prose-indigo max-w-none">
            <div className="absolute top-0 right-0 p-3 opacity-10"><Sparkles className="h-12 w-12 text-indigo-600" /></div>
            <div className="relative text-sm text-gray-700 leading-relaxed">
              {/* Note: In a real app we'd use ReactMarkdown here, but for simplicity we show text */}
              {aiResult.split('\n').map((line, i) => (
                <p key={i} className={line.startsWith('#') ? 'font-black text-indigo-900 text-base mb-2 mt-4' : 'mb-2'}>
                  {line}
                </p>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              <span>Gemini 2.5 Flash • OpenLMS AI Intelligence</span>
              <button onClick={handleAiAnalysis} className="text-indigo-600 hover:text-indigo-800">Cập nhật lại</button>
            </div>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-indigo-50 text-center border-b">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-indigo-600" />
              </div>
              <h2 className="text-xl font-black text-indigo-900">Gửi cho Cha Mẹ</h2>
              <p className="text-sm text-indigo-600 mt-1 italic">"Ba mẹ ơi, xem kết quả của con nè!"</p>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 text-center">Toàn bộ hồ sơ học tập và phần <b>Phân tích AI</b> sẽ được gửi cho cha mẹ xem.</p>
              <button 
                onClick={handleShare}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2"
                disabled={isSharing}
              >
                {isSharing ? 'Đang gửi...' : 'Xác nhận Gửi ngay'}
              </button>
              <button 
                onClick={() => setIsShareModalOpen(false)}
                className="w-full py-3 text-gray-400 font-bold hover:text-gray-600 transition-all"
                disabled={isSharing}
              >
                Để sau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

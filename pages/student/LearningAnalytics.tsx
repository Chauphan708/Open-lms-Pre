import React, { useMemo, useState, useCallback } from 'react';
import { useStore } from '../../store';
import {
  TrendingUp, TrendingDown, Minus, BookOpen, Brain, Target, AlertTriangle,
  Star, Zap, Clock, ChevronDown, Sparkles, RefreshCw, Award, BarChart3, Printer, Share2, Download
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { computeStudentAnalytics, TIME_PERIODS, TimePeriod, StudentAnalytics } from '../../utils/analyticsEngine';
import { getRecommendations, getRecentExamIds } from '../../utils/recommendationEngine';
import { generatePersonalizedRecommendation } from '../../services/geminiService';

// ============================================================
// SUB COMPONENTS
// ============================================================

// Biểu đồ cột kết hợp đường (SVG thuần)
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
  const barWidth = Math.max(8, Math.min(40, chartW / data.length - 6));

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
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: Math.max(300, data.length * 60) + 'px' }}>
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
              <rect
                x={bx} y={yPosCount(d.count)} width={barWidth} height={bh}
                fill="#e0e7ff" stroke="#c7d2fe" strokeWidth="1" rx="3" opacity="0.8"
              />
              {/* Count label on bar */}
              {d.count > 0 && (
                <text x={xPos(i)} y={yPosCount(d.count) - 3} textAnchor="middle" fontSize="8" fill="#6366f1" fontWeight="bold">
                  {d.count} bài
                </text>
              )}
            </g>
          );
        })}

        {/* Max score line */}
        <polyline points={maxPoints} fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.6" />

        {/* Avg score line */}
        <polyline points={linePoints} fill="none" stroke="#6366f1" strokeWidth="2.5" />

        {/* Dots on avg line */}
        {data.map((d, i) => (
          <circle key={i} cx={xPos(i)} cy={yPosScore(d.avg)} r="4" fill={getBarColor(d.avg)} stroke="white" strokeWidth="1.5" />
        ))}

        {/* X axis labels */}
        {data.map((d, i) => (
          <text key={i} x={xPos(i)} y={H - padB + 14} textAnchor="middle" fontSize="9" fill="#6b7280">
            {d.label.length > 10 ? d.label.slice(0, 9) + '…' : d.label}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-indigo-500" />
          <span>Điểm TB (Đường)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 border-t-2 border-dashed border-emerald-500" />
          <span>Điểm cao nhất</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-indigo-100 border border-indigo-200" />
          <span>Số bài (Cột)</span>
        </div>
      </div>
    </div>
  );
};

// Thanh tiến độ tỉ lệ đúng
const RateBar: React.FC<{ label: string; rate: number; color: string }> = ({ label, rate, color }) => (
  <div>
    <div className="flex justify-between text-sm mb-1">
      <span className="font-medium text-gray-700">{label}</span>
      <span className="font-bold text-gray-900">{rate}%</span>
    </div>
    <div className="w-full bg-gray-100 rounded-full h-3">
      <div
        className={`h-3 rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${rate}%` }}
      />
    </div>
  </div>
);

// Card điểm yếu
const WeakTopicCard: React.FC<{ topic: string; subject: string; rate: number; attempts: number }> = ({ topic, subject, rate, attempts }) => (
  <div className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-colors">
    <div className="min-w-0">
      <div className="font-bold text-red-800 text-sm truncate">{topic}</div>
      <div className="text-xs text-red-600">{subject} • {attempts} lần làm</div>
    </div>
    <div className="ml-3 flex-shrink-0">
      <span className="inline-block bg-red-100 text-red-700 font-bold text-xs px-2 py-1 rounded-full">
        {rate}% sai
      </span>
    </div>
  </div>
);

// ============================================================
// MAIN PAGE
// ============================================================

export const LearningAnalytics: React.FC = () => {
  const { user, attempts, exams, questionBank } = useStore();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(TIME_PERIODS[1]); // Mặc định 1 tháng
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showAllWeakTopics, setShowAllWeakTopics] = useState(false);
  const [showAllRecommended, setShowAllRecommended] = useState(false);

  if (!user || user.role !== 'STUDENT') {
    return <div className="p-8 text-center text-gray-500">Trang này chỉ dành cho học sinh.</div>;
  }

  // Định dạng số: 10.0 -> 10,0
  const fmt = (n: number) => n.toFixed(1).replace('.', ',');

  // Tính toán analytics
  const analytics: StudentAnalytics = useMemo(() => {
    return computeStudentAnalytics(
      user.id,
      attempts,
      exams,
      questionBank,
      selectedPeriod.days
    );
  }, [user.id, attempts, exams, questionBank, selectedPeriod]);

  // Tính toán gợi ý
  const recentExamIds = useMemo(() => getRecentExamIds(user.id, attempts, 7), [user.id, attempts]);

  const recommendations = useMemo(() => {
    return getRecommendations(analytics, exams, questionBank, recentExamIds, 6, 8);
  }, [analytics, exams, questionBank, recentExamIds]);

  // Lấy AI insight theo yêu cầu
  const handleGetAIInsight = useCallback(async () => {
    setIsLoadingAI(true);
    try {
      const result = await generatePersonalizedRecommendation(analytics);
      setAiInsight(result);
    } catch (e: any) {
      setAiInsight(`Không thể lấy gợi ý AI: ${e.message}`);
    } finally {
      setIsLoadingAI(false);
    }
  }, [analytics]);

  const handlePrint = () => {
    window.print();
  };

  const trendIcon = (trend: string) => {
    if (trend === 'UP') return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (trend === 'DOWN') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const visibleWeakTopics = showAllWeakTopics ? analytics.weakTopics : analytics.weakTopics.slice(0, 4);
  const visibleRecommended = showAllRecommended ? recommendations.recommendedExams : recommendations.recommendedExams.slice(0, 4);

  const avgScoreColor = analytics.avgScore >= 8.5 ? 'text-emerald-600' : analytics.avgScore >= 6.5 ? 'text-indigo-600' : analytics.avgScore >= 5 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">

      {/* HEADER */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-7 w-7" /> Phân tích học tập cá nhân
            </h1>
            <p className="text-indigo-200 mt-1 text-sm">Dữ liệu dựa trên lịch sử nộp bài của bạn</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handlePrint}
              className="bg-white/20 text-white border border-white/30 rounded-xl px-4 py-2 text-sm font-bold flex items-center gap-2 hover:bg-white/30 transition-all no-print"
            >
              <Printer className="h-4 w-4" /> In báo cáo
            </button>
            {/* Bộ lọc thời gian */}
            <div className="relative no-print">
              <select
                value={selectedPeriod.days}
                onChange={e => {
                  const p = TIME_PERIODS.find(t => t.days === Number(e.target.value));
                  if (p) setSelectedPeriod(p);
                }}
                className="bg-white text-gray-900 border border-white/30 rounded-xl px-4 py-2 text-sm font-bold outline-none appearance-none cursor-pointer hover:bg-gray-100 transition-all pr-8"
              >
                {TIME_PERIODS.map(p => (
                  <option key={p.days} value={p.days}>
                    {p.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Tóm tắt */}
        {analytics.totalAttempts > 0 && (
          <div className="mt-4 bg-white/10 rounded-xl p-3 text-sm text-indigo-100">
            {recommendations.summary}
          </div>
        )}
      </div>

      {analytics.totalAttempts === 0 ? (
        <div className="bg-white rounded-2xl border p-16 text-center shadow-sm">
          <BookOpen className="h-16 w-16 mx-auto text-gray-200 mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">Chưa có dữ liệu học tập</h3>
          <p className="text-gray-500 mb-6">Hãy làm và nộp bài để hệ thống phân tích kết quả của bạn.</p>
          <Link to="/exams" className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition">
            Làm bài ngay
          </Link>
        </div>
      ) : (
        <>
          {/* =================== STATS CARDS =================== */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Target, label: 'Số bài đã làm', value: analytics.totalAttempts, color: 'bg-indigo-100 text-indigo-600' },
              { icon: Star, label: 'Điểm TB', value: `${fmt(analytics.avgScore)}/10`, color: 'bg-amber-100 text-amber-600' },
              { icon: TrendingUp, label: 'Cao nhất', value: `${fmt(analytics.maxScore)}/10`, color: 'bg-emerald-100 text-emerald-600' },
              { icon: Zap, label: 'Chuỗi ngày học', value: `${analytics.studyStreak} ngày`, color: 'bg-purple-100 text-purple-600' },
            ].map((card, i) => (
              <div key={i} className="bg-white rounded-xl border shadow-sm p-5 flex items-center gap-3">
                <div className={`p-3 rounded-xl ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">{card.label}</div>
                  <div className={`text-xl font-bold ${i === 1 ? avgScoreColor : 'text-gray-900'}`}>{card.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* =================== BIỂU ĐỒ =================== */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" /> Xu hướng điểm số
            </h2>
            <p className="text-xs text-gray-500 mb-4">Điểm trung bình theo thời gian trong {selectedPeriod.label} qua</p>
            <ComboChart data={analytics.chartData} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* =================== THEO MÔN =================== */}
            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-500" /> Theo môn học
              </h2>
              {analytics.bySubject.length === 0 ? (
                <p className="text-gray-400 text-sm italic">Chưa có dữ liệu.</p>
              ) : (
                <div className="space-y-4">
                  {analytics.bySubject.map(s => (
                    <div key={s.subject}>
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          {trendIcon(s.trend)}
                          <span className="font-medium text-gray-800 text-sm">{s.subject}</span>
                          <span className="text-xs text-gray-400">({s.attempts} bài)</span>
                        </div>
                        <span className={`font-bold text-sm ${s.avgScore >= 6.5 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {fmt(s.avgScore)}/10
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-700 ${s.avgScore >= 8 ? 'bg-emerald-500' : s.avgScore >= 6.5 ? 'bg-indigo-500' : s.avgScore >= 5 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${(s.avgScore / 10) * 100}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{s.correctRate}% câu đúng</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* =================== THEO MỨC ĐỘ =================== */}
            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" /> Theo mức độ (Thông tư 27)
              </h2>
              <div className="space-y-4">
                {analytics.byDifficulty.map(d => (
                  <div key={d.level}>
                    <RateBar
                      label={`${d.label} (${d.correctQuestions}/${d.totalQuestions} câu)`}
                      rate={d.correctRate}
                      color={d.correctRate >= 70 ? 'bg-emerald-500' : d.correctRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}
                    />
                  </div>
                ))}
                {analytics.byDifficulty.every(d => d.totalQuestions === 0) && (
                  <p className="text-gray-400 text-sm italic">Chưa đủ dữ liệu phân tích theo mức độ.</p>
                )}
              </div>
            </div>
          </div>

          {/* =================== ĐIỂM YẾU =================== */}
          {analytics.weakTopics.length > 0 && (
            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" /> Chủ đề cần cải thiện
                  <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    {analytics.weakTopics.length}
                  </span>
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {visibleWeakTopics.map((t, i) => (
                  <WeakTopicCard
                    key={i}
                    topic={t.topic}
                    subject={t.subject}
                    rate={t.incorrectRate}
                    attempts={t.attempts}
                  />
                ))}
              </div>
              {analytics.weakTopics.length > 4 && (
                <button
                  onClick={() => setShowAllWeakTopics(!showAllWeakTopics)}
                  className="mt-3 text-sm text-indigo-600 font-bold hover:underline flex items-center gap-1"
                >
                  {showAllWeakTopics ? 'Thu gọn' : `Xem thêm ${analytics.weakTopics.length - 4} chủ đề`}
                  <ChevronDown className={`h-4 w-4 transition-transform ${showAllWeakTopics ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
          )}

          {/* =================== GỢI Ý BÀI TẬP =================== */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-500" /> Bài tập được gợi ý
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">Hệ thống tự động phân tích và chọn bài phù hợp năng lực của bạn</p>
              </div>
              <button
                onClick={handleGetAIInsight}
                disabled={isLoadingAI}
                className="flex items-center gap-2 bg-purple-50 text-purple-700 border border-purple-100 px-3 py-2 rounded-xl text-sm font-bold hover:bg-purple-100 transition-all disabled:opacity-50"
              >
                {isLoadingAI ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Gợi ý từ AI
              </button>
            </div>

            {/* AI Insight */}
            {aiInsight && (
              <div className="mb-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-white border border-purple-100 rounded-2xl p-5 shadow-inner animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-indigo-700">
                    <Sparkles className="h-5 w-5 text-purple-600" /> AI Phân tích cá nhân hóa
                  </div>
                  <div className="text-[10px] text-purple-400 font-medium uppercase tracking-wider bg-purple-100/50 px-2 py-0.5 rounded">Gemini Optimized</div>
                </div>
                <div className="text-sm text-gray-800 leading-relaxed italic border-l-4 border-purple-300 pl-4 py-1">
                  "{aiInsight}"
                </div>
              </div>
            )}

            {recommendations.recommendedExams.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Chưa có bài tập phù hợp trong kho đề.</p>
                <Link to="/exams" className="text-indigo-600 text-sm font-bold hover:underline mt-2 block">
                  Xem tất cả bài tập →
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {visibleRecommended.map((rec, i) => (
                    <div
                      key={rec.exam.id}
                      className="border border-gray-100 rounded-xl p-4 hover:shadow-md hover:border-indigo-100 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition truncate">
                            {rec.exam.title}
                          </h4>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{rec.exam.subject}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${rec.difficulty === 'Vận dụng' ? 'bg-red-50 text-red-600' : rec.difficulty === 'Kết nối' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                              {rec.difficulty}
                            </span>
                          </div>
                        </div>
                        <span className="flex-shrink-0 bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded-lg">
                          #{i + 1}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mb-3 space-y-0.5">
                        {rec.reasons.map((r, ri) => (
                          <div key={ri} className="flex items-start gap-1">
                            <span className="text-indigo-400 mt-0.5">•</span>
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {rec.exam.durationMinutes} phút • {rec.exam.questionCount} câu
                        </div>
                        <Link
                          to={`/exam/${rec.exam.id}/take`}
                          className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-700 transition"
                        >
                          Làm ngay →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                {recommendations.recommendedExams.length > 4 && (
                  <button
                    onClick={() => setShowAllRecommended(!showAllRecommended)}
                    className="mt-4 text-sm text-indigo-600 font-bold hover:underline flex items-center gap-1"
                  >
                    {showAllRecommended ? 'Thu gọn' : 'Xem thêm bài tập gợi ý'}
                    <ChevronDown className={`h-4 w-4 transition-transform ${showAllRecommended ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

/**
 * analyticsEngine.ts
 * Engine phân tích dữ liệu học tập của học sinh từ lịch sử nộp bài (attempts).
 * Hoạt động hoàn toàn ở phía client (pure JS), không cần API.
 */

import { Attempt, Exam, Question, QuestionBankItem, ExamDifficulty } from '../types';

// ============================================================
// TYPES
// ============================================================

export interface TimePeriod {
  label: string;
  days: number;
}

// 14 mốc thời gian theo yêu cầu
export const TIME_PERIODS: TimePeriod[] = [
  { label: '0,5 tháng', days: 15 },
  { label: '1 tháng',   days: 30 },
  { label: '1,5 tháng', days: 45 },
  { label: '2 tháng',   days: 60 },
  { label: '2,5 tháng', days: 75 },
  { label: '3 tháng',   days: 90 },
  { label: '3,5 tháng', days: 105 },
  { label: '4 tháng',   days: 120 },
  { label: '4,5 tháng', days: 135 },
  { label: '5 tháng',   days: 150 },
  { label: '6 tháng',   days: 180 },
  { label: '7 tháng',   days: 210 },
  { label: '8 tháng',   days: 240 },
  { label: '9 tháng',   days: 270 },
];

export interface ScoreDataPoint {
  label: string;  // Nhãn thời gian (ngày / tuần / tháng)
  avg: number;    // Điểm trung bình
  count: number;  // Số bài nộp
  max: number;    // Điểm cao nhất
  min: number;    // Điểm thấp nhất
}

export interface SubjectAnalytics {
  subject: string;
  avgScore: number;
  attempts: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  lastScore: number;
  correctRate: number; // % câu đúng toàn bộ
}

export interface WeakTopic {
  topic: string;
  subject: string;
  avgScore: number;
  attempts: number;
  incorrectRate: number; // % sai
  wrongQuestionIds: string[];
}

export interface WeakQuestion {
  questionId: string;
  content: string;
  correctRate: number;
  wrongCount: number;
  totalCount: number;
  level: ExamDifficulty | undefined;
  topic: string | undefined;
  subject: string;
}

export interface DifficultyAnalytics {
  level: ExamDifficulty;
  label: string;
  correctRate: number;
  totalQuestions: number;
  correctQuestions: number;
}

export interface StudentAnalytics {
  studentId: string;
  periodDays: number;
  totalAttempts: number;
  avgScore: number;
  maxScore: number;
  minScore: number;
  studyStreak: number;            // Số ngày liên tục có bài
  totalStudyMinutes: number;

  // Dữ liệu biểu đồ (cột + đường)
  chartData: ScoreDataPoint[];

  // Phân tích theo môn
  bySubject: SubjectAnalytics[];

  // Điểm yếu theo chủ đề
  weakTopics: WeakTopic[];

  // Câu hỏi hay sai nhất (top 10)
  weakQuestions: WeakQuestion[];

  // Phân tích theo mức độ TT27
  byDifficulty: DifficultyAnalytics[];
}

// ============================================================
// HELPERS
// ============================================================

function isCorrect(q: Question, userAns: any): boolean {
  if (userAns === undefined || userAns === null || userAns === '') return false;
  if (!q.type || q.type === 'MCQ') {
    return userAns === q.correctOptionIndex;
  }
  if (q.type === 'SHORT_ANSWER') {
    const sAns = String(userAns).trim().toLowerCase();
    if (q.options && q.options.length > 0) {
      return q.options.some(opt => String(opt).trim().toLowerCase() === sAns);
    }
    const sol = String(q.solution || '').trim();
    return sol !== '' && sol.split(/\s+/).length < 10 && sAns === sol.toLowerCase();
  }
  if (['MATCHING', 'ORDERING', 'DRAG_DROP'].includes(q.type)) {
    if (!Array.isArray(userAns) || userAns.length !== q.options.length) return false;
    return q.options.every((expected, i) => {
      const ne = String(expected || '').trim().toLowerCase().replace(/\s*\|\|\|\s*/g, '|||');
      const na = String(userAns[i] || '').trim().toLowerCase().replace(/\s*\|\|\|\s*/g, '|||');
      return ne === na;
    });
  }
  return false;
}

function filterByPeriod(attempts: Attempt[], days: number): Attempt[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return attempts.filter(a => new Date(a.submittedAt) >= cutoff);
}

function calcStreak(attempts: Attempt[]): number {
  if (attempts.length === 0) return 0;
  const uniqueDays = Array.from(
    new Set(attempts.map(a => new Date(a.submittedAt).toDateString()))
  ).map(d => new Date(d)).sort((a, b) => b.getTime() - a.getTime());

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const diff = Math.round((uniqueDays[i - 1].getTime() - uniqueDays[i].getTime()) / 86400000);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

/**
 * Tạo nhãn bucket cho biểu đồ dựa trên khoảng thời gian
 */
function buildChartData(attempts: Attempt[], exams: Exam[], days: number): ScoreDataPoint[] {
  if (attempts.length === 0) return [];

  // 1. Sắp xếp từ cũ nhất đến mới nhất để biểu đồ tăng dần từ trái sang phải
  const sortedByDate = [...attempts].sort((a, b) => 
    new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
  );

  const getBucketKey = (date: Date): string => {
    // Nếu chọn khoảng thời gian <= 3 tháng (90 ngày), hiển thị chi tiết từng ngày theo yêu cầu
    if (days <= 90) {
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    }
    // Còn lại hiển thị theo tháng (ví dụ cho 6, 9 tháng)
    return `T${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`;
  };

  const buckets: Map<string, number[]> = new Map();
  const bucketOrder: string[] = [];

  sortedByDate.forEach(att => {
    const d = new Date(att.submittedAt);
    const key = getBucketKey(d);
    if (!buckets.has(key)) {
      buckets.set(key, []);
      bucketOrder.push(key);
    }
    buckets.get(key)!.push(att.score || 0);
  });

  return bucketOrder.map(key => {
    const scores = buckets.get(key)!;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return {
      label: key,
      avg: Math.round(avg * 10) / 10,
      count: scores.length,
      max: Math.max(...scores),
      min: Math.min(...scores),
    };
  });
}

// ============================================================
// MAIN FUNCTION: computeStudentAnalytics
// ============================================================

export function computeStudentAnalytics(
  studentId: string,
  allAttempts: Attempt[],
  exams: Exam[],
  questionBank: QuestionBankItem[],
  periodDays: number
): StudentAnalytics {
  const myAttempts = filterByPeriod(
    allAttempts.filter(a => a.studentId === studentId),
    periodDays
  );

  if (myAttempts.length === 0) {
    return {
      studentId,
      periodDays,
      totalAttempts: 0,
      avgScore: 0,
      maxScore: 0,
      minScore: 0,
      studyStreak: 0,
      totalStudyMinutes: 0,
      chartData: [],
      bySubject: [],
      weakTopics: [],
      weakQuestions: [],
      byDifficulty: [],
    };
  }

  const scores = myAttempts.map(a => a.score || 0);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);

  // Tổng giờ học (dựa trên duration của exam)
  const totalStudyMinutes = myAttempts.reduce((sum, att) => {
    const exam = exams.find(e => e.id === att.examId);
    return sum + (exam?.durationMinutes || 0);
  }, 0);

  // Chart data
  const chartData = buildChartData(myAttempts, exams, periodDays);

  // Streak
  const studyStreak = calcStreak(myAttempts);

  // ============
  // BY SUBJECT
  // ============
  const subjectMap: Map<string, Attempt[]> = new Map();
  myAttempts.forEach(att => {
    const exam = exams.find(e => e.id === att.examId);
    const subject = exam?.subject || 'Chưa phân loại';
    if (!subjectMap.has(subject)) subjectMap.set(subject, []);
    subjectMap.get(subject)!.push(att);
  });

  const bySubject: SubjectAnalytics[] = Array.from(subjectMap.entries()).map(([subject, atts]) => {
    const attScores = atts.map(a => a.score || 0);
    const avgS = attScores.reduce((a, b) => a + b, 0) / attScores.length;
    const sorted = atts.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
    const last = sorted[sorted.length - 1];
    const first = sorted[0];

    let trend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
    if (sorted.length >= 2) {
      const diff = (last.score || 0) - (first.score || 0);
      if (diff > 0.5) trend = 'UP';
      else if (diff < -0.5) trend = 'DOWN';
    }

    // Tỉ lệ câu đúng tổng thể
    let correctTotal = 0, totalQ = 0;
    atts.forEach(att => {
      const exam = exams.find(e => e.id === att.examId);
      if (!exam || !Array.isArray(exam.questions)) return;
      exam.questions.forEach(q => {
        totalQ++;
        if (isCorrect(q, att.answers[q.id])) correctTotal++;
      });
    });

    return {
      subject,
      avgScore: Math.round(avgS * 10) / 10,
      attempts: atts.length,
      trend,
      lastScore: last.score || 0,
      correctRate: totalQ > 0 ? Math.round((correctTotal / totalQ) * 100) : 0,
    };
  }).sort((a, b) => a.avgScore - b.avgScore); // Yếu nhất lên đầu

  // ============
  // WEAK TOPICS
  // ============
  const topicMap: Map<string, { subject: string; scores: number[]; wrongQIds: string[]; incorrectCount: number; totalCount: number }> = new Map();

  myAttempts.forEach(att => {
    const exam = exams.find(e => e.id === att.examId);
    if (!exam || !Array.isArray(exam.questions)) return;

    exam.questions.forEach(q => {
      const topic = q.topic || 'Chưa phân loại';
      if (!topicMap.has(topic)) {
        topicMap.set(topic, { subject: exam.subject, scores: [], wrongQIds: [], incorrectCount: 0, totalCount: 0 });
      }
      const entry = topicMap.get(topic)!;
      entry.totalCount++;
      if (!isCorrect(q, att.answers[q.id])) {
        entry.incorrectCount++;
        if (!entry.wrongQIds.includes(q.id)) entry.wrongQIds.push(q.id);
      }
    });

    // Điểm trung bình cho chủ đề (dùng điểm bài)
    const topicsInExam = new Set(exam.questions.map(q => q.topic || 'Chưa phân loại'));
    topicsInExam.forEach(topic => {
      if (topicMap.has(topic)) {
        topicMap.get(topic)!.scores.push(att.score || 0);
      }
    });
  });

  const weakTopics: WeakTopic[] = Array.from(topicMap.entries())
    .map(([topic, data]) => ({
      topic,
      subject: data.subject,
      avgScore: data.scores.length > 0
        ? Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 10) / 10
        : 0,
      attempts: data.scores.length,
      incorrectRate: data.totalCount > 0
        ? Math.round((data.incorrectCount / data.totalCount) * 100)
        : 0,
      wrongQuestionIds: data.wrongQIds,
    }))
    .filter(t => t.incorrectRate > 0)
    .sort((a, b) => b.incorrectRate - a.incorrectRate) // Sai nhiều nhất lên đầu
    .slice(0, 10);

  // ============
  // WEAK QUESTIONS (Top 10 câu hay sai nhất)
  // ============
  const questionMap: Map<string, { q: Question; wrongCount: number; totalCount: number; subject: string }> = new Map();

  myAttempts.forEach(att => {
    const exam = exams.find(e => e.id === att.examId);
    if (!exam || !Array.isArray(exam.questions)) return;

    exam.questions.forEach(q => {
      if (!questionMap.has(q.id)) {
        questionMap.set(q.id, { q, wrongCount: 0, totalCount: 0, subject: exam.subject });
      }
      const entry = questionMap.get(q.id)!;
      entry.totalCount++;
      if (!isCorrect(q, att.answers[q.id])) {
        entry.wrongCount++;
      }
    });
  });

  const weakQuestions: WeakQuestion[] = Array.from(questionMap.values())
    .filter(e => e.wrongCount > 0)
    .map(e => ({
      questionId: e.q.id,
      content: e.q.content,
      correctRate: Math.round(((e.totalCount - e.wrongCount) / e.totalCount) * 100),
      wrongCount: e.wrongCount,
      totalCount: e.totalCount,
      level: e.q.level,
      topic: e.q.topic,
      subject: e.subject,
    }))
    .sort((a, b) => a.correctRate - b.correctRate) // Tỉ lệ đúng thấp nhất lên đầu
    .slice(0, 10);

  // ============
  // BY DIFFICULTY
  // ============
  const difficultyLabels: Record<ExamDifficulty, string> = {
    NHAN_BIET: 'Nhận biết',
    KET_NOI: 'Kết nối',
    VAN_DUNG: 'Vận dụng',
  };

  const diffMap: Map<ExamDifficulty, { correct: number; total: number }> = new Map([
    ['NHAN_BIET', { correct: 0, total: 0 }],
    ['KET_NOI', { correct: 0, total: 0 }],
    ['VAN_DUNG', { correct: 0, total: 0 }],
  ]);

  myAttempts.forEach(att => {
    const exam = exams.find(e => e.id === att.examId);
    if (!exam || !Array.isArray(exam.questions)) return;
    exam.questions.forEach(q => {
      const level = q.level;
      if (!level || !diffMap.has(level)) return;
      const entry = diffMap.get(level)!;
      entry.total++;
      if (isCorrect(q, att.answers[q.id])) entry.correct++;
    });
  });

  const byDifficulty: DifficultyAnalytics[] = (Object.keys(difficultyLabels) as ExamDifficulty[]).map(level => {
    const data = diffMap.get(level) || { correct: 0, total: 0 };
    return {
      level,
      label: difficultyLabels[level],
      correctRate: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      totalQuestions: data.total,
      correctQuestions: data.correct,
    };
  });

  return {
    studentId,
    periodDays,
    totalAttempts: myAttempts.length,
    avgScore: Math.round(avgScore * 10) / 10,
    maxScore: Math.round(maxScore * 10) / 10,
    minScore: Math.round(minScore * 10) / 10,
    studyStreak,
    totalStudyMinutes,
    chartData,
    bySubject,
    weakTopics,
    weakQuestions,
    byDifficulty,
  };
}

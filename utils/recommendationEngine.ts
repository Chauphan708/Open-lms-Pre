/**
 * recommendationEngine.ts
 * Engine gợi ý bài tập thông minh dựa trên kết quả phân tích học sinh.
 * Sử dụng Rule-based làm chính, có thể kết hợp Gemini AI.
 */

import { Exam, QuestionBankItem, ExamDifficulty } from '../types';
import { StudentAnalytics } from './analyticsEngine';

// ============================================================
// TYPES
// ============================================================

export type RecommendReason =
  | 'WEAK_TOPIC'       // Chủ đề đang yếu
  | 'WEAK_SUBJECT'     // Môn học đang yếu
  | 'IMPROVE_LEVEL'    // Nâng cao mức độ đang làm tốt
  | 'PRACTICE_AGAIN'   // Ôn luyện câu hay sai
  | 'EXPLORE_NEW'      // Khám phá chủ đề mới
  | 'CHALLENGE'        // Thách thức (HS giỏi)
  | 'MAINTAIN';        // Duy trì phong độ

export interface RecommendedExam {
  exam: Exam;
  score: number;           // Điểm ưu tiên (cao hơn = gợi ý trước)
  reasons: string[];       // Lý do gợi ý bằng tiếng Việt
  reasonCode: RecommendReason;
  matchedTopics: string[]; // Chủ đề liên quan
  difficulty: string;
}

export interface RecommendedQuestion {
  question: QuestionBankItem;
  score: number;
  reasons: string[];
  reasonCode: RecommendReason;
}

export interface RecommendationResult {
  recommendedExams: RecommendedExam[];
  recommendedQuestions: RecommendedQuestion[];
  summary: string; // Tóm tắt bằng tiếng Việt
}

// ============================================================
// HELPERS
// ============================================================

const DIFFICULTY_ORDER: ExamDifficulty[] = ['NHAN_BIET', 'KET_NOI', 'VAN_DUNG'];

function getDifficultyLabel(level?: ExamDifficulty): string {
  switch (level) {
    case 'NHAN_BIET': return 'Nhận biết';
    case 'KET_NOI': return 'Kết nối';
    case 'VAN_DUNG': return 'Vận dụng';
    default: return 'Tổng hợp';
  }
}

/**
 * Xác định mức độ phù hợp để gợi ý cho HS dựa trên correctRate
 */
function getTargetDifficulty(analytics: StudentAnalytics): ExamDifficulty {
  // Nếu NHAN_BIET < 70%: ưu tiên ôn lại NHAN_BIET
  const nb = analytics.byDifficulty.find(d => d.level === 'NHAN_BIET');
  if (nb && nb.correctRate < 70) return 'NHAN_BIET';

  // Nếu KET_NOI < 60%: ưu tiên luyện KET_NOI
  const kn = analytics.byDifficulty.find(d => d.level === 'KET_NOI');
  if (kn && kn.correctRate < 60) return 'KET_NOI';

  // Ổn: thách thức VAN_DUNG
  return 'VAN_DUNG';
}

// ============================================================
// MAIN FUNCTION
// ============================================================

export function getRecommendations(
  analytics: StudentAnalytics,
  allExams: Exam[],
  questionBank: QuestionBankItem[],
  recentAttemptExamIds: Set<string>, // Bài đã làm gần đây (7 ngày)
  maxExams: number = 6,
  maxQuestions: number = 10
): RecommendationResult {
  if (analytics.totalAttempts === 0) {
    // Chưa làm bài nào: gợi ý bài dễ nhất để bắt đầu
    const starterExams = allExams
      .filter(e => !e.deletedAt && e.status === 'PUBLISHED')
      .slice(0, maxExams)
      .map(exam => ({
        exam,
        score: 10,
        reasons: ['Bắt đầu hành trình học tập của bạn với bài tập này!'],
        reasonCode: 'EXPLORE_NEW' as RecommendReason,
        matchedTopics: [],
        difficulty: 'Tổng hợp',
      }));
    return {
      recommendedExams: starterExams,
      recommendedQuestions: [],
      summary: 'Chưa có dữ liệu học tập. Hãy bắt đầu bằng một bài tập!',
    };
  }

  const targetDifficulty = getTargetDifficulty(analytics);
  const weakSubjects = new Set(analytics.bySubject.filter(s => s.avgScore < 6.5).map(s => s.subject));
  const weakTopicNames = new Set(analytics.weakTopics.map(t => t.topic));

  // ============
  // SCORE CÁC ĐỀ
  // ============
  const scoredExams: RecommendedExam[] = allExams
    .filter(e => !e.deletedAt && e.status === 'PUBLISHED')
    .map(exam => {
      let score = 0;
      const reasons: string[] = [];
      let reasonCode: RecommendReason = 'EXPLORE_NEW';

      // Trừ điểm nếu đã làm gần đây
      if (recentAttemptExamIds.has(exam.id)) score -= 20;

      // Cộng điểm nếu môn học trùng với môn yếu
      if (weakSubjects.has(exam.subject)) {
        score += 30;
        reasons.push(`Môn ${exam.subject} đang cần cải thiện`);
        reasonCode = 'WEAK_SUBJECT';
      }

      // Cộng điểm nếu chủ đề của exam trùng với chủ đề yếu
      const examTopics: Set<string> = new Set();
      if (Array.isArray(exam.questions)) {
        exam.questions.forEach(q => { if (q.topic) examTopics.add(q.topic); });
      }
      const matchedTopics = [...examTopics].filter(t => weakTopicNames.has(t));
      if (matchedTopics.length > 0) {
        score += 40 * matchedTopics.length;
        reasons.push(`Bao gồm chủ đề yếu: ${matchedTopics.slice(0, 2).join(', ')}`);
        reasonCode = 'WEAK_TOPIC';
      }

      // Cộng điểm nếu mức độ phù hợp
      const examDifficulty = exam.difficulty;
      if (examDifficulty === targetDifficulty) {
        score += 20;
        reasons.push(`Mức độ ${getDifficultyLabel(targetDifficulty)} phù hợp với năng lực hiện tại`);
        if (reasonCode === 'EXPLORE_NEW') reasonCode = 'IMPROVE_LEVEL';
      }

      // Thách thức nếu HS giỏi (avgScore >= 8.5)
      if (analytics.avgScore >= 8.5 && examDifficulty === 'VAN_DUNG') {
        score += 15;
        reasons.push('Thách thức bản thân với bài vận dụng nâng cao');
        reasonCode = 'CHALLENGE';
      }

      // Duy trì phong độ nếu không có vấn đề gì
      if (reasons.length === 0) {
        reasons.push('Luyện tập thêm để duy trì phong độ học tập');
        reasonCode = 'MAINTAIN';
      }

      return {
        exam,
        score,
        reasons: reasons.slice(0, 2),
        reasonCode,
        matchedTopics,
        difficulty: getDifficultyLabel(examDifficulty),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxExams);

  // ============
  // SCORE CÂU HỎI TỪ NGÂN HÀNG
  // ============
  const weakQIds = new Set(analytics.weakQuestions.map(q => q.questionId));

  const scoredQuestions: RecommendedQuestion[] = questionBank.map(q => {
    let score = 0;
    const reasons: string[] = [];
    let reasonCode: RecommendReason = 'EXPLORE_NEW';

    // Câu trong danh sách hay sai
    if (weakQIds.has(q.id)) {
      score += 50;
      reasons.push('Câu hỏi tương tự bạn hay làm sai');
      reasonCode = 'PRACTICE_AGAIN';
    }

    // Chủ đề yếu
    if (q.topic && weakTopicNames.has(q.topic)) {
      score += 35;
      reasons.push(`Chủ đề "${q.topic}" đang cần củng cố`);
      if (reasonCode === 'EXPLORE_NEW') reasonCode = 'WEAK_TOPIC';
    }

    // Môn yếu
    if (weakSubjects.has(q.subject)) {
      score += 20;
      if (reasons.length === 0) reasons.push(`Môn ${q.subject} cần luyện thêm`);
    }

    // Mức độ phù hợp
    if (q.level === targetDifficulty) {
      score += 15;
    }

    if (reasons.length === 0) {
      reasons.push('Mở rộng kiến thức');
      reasonCode = 'EXPLORE_NEW';
    }

    return { question: q, score, reasons: reasons.slice(0, 2), reasonCode };
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxQuestions);

  // ============
  // SUMMARY
  // ============
  let summary = '';
  const weakSubjectList = [...weakSubjects];
  const weakTopicList = [...weakTopicNames].slice(0, 3);

  if (analytics.avgScore >= 8.5) {
    summary = `🌟 Tuyệt vời! Bạn đang học rất tốt (TB: ${analytics.avgScore}/10). Thử thách bản thân với bài vận dụng nâng cao.`;
  } else if (analytics.avgScore >= 6.5) {
    summary = `📈 Bạn đang ở mức khá (TB: ${analytics.avgScore}/10).${weakSubjectList.length > 0 ? ` Cần cải thiện: ${weakSubjectList.join(', ')}.` : ''} Hãy tiếp tục luyện tập!`;
  } else if (weakTopicList.length > 0) {
    summary = `📚 Điểm TB hiện tại: ${analytics.avgScore}/10. Hệ thống phát hiện bạn đang yếu ở: ${weakTopicList.join(', ')}. Hãy luyện tập các bài được gợi ý.`;
  } else {
    summary = `📖 Điểm TB: ${analytics.avgScore}/10. Hãy thực hành thêm để củng cố kiến thức.`;
  }

  return {
    recommendedExams: scoredExams,
    recommendedQuestions: scoredQuestions,
    summary,
  };
}

/**
 * Lấy danh sách examId đã làm trong N ngày gần nhất
 */
export function getRecentExamIds(
  studentId: string,
  allAttempts: import('../types').Attempt[],
  days: number = 7
): Set<string> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return new Set(
    allAttempts
      .filter(a => a.studentId === studentId && new Date(a.submittedAt) >= cutoff)
      .map(a => a.examId)
  );
}

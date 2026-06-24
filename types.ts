
export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';

export interface SiteSettings {
  slogan: string;
  hotline: string;
  email: string;
  facebook: string;
  zalo: string;
  address: string;
}

export interface CustomToolMenu {
  id: string;
  title: string;
  url?: string; // Optional if it's just a grouping header
  children?: CustomToolMenu[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  password?: string;
  className?: string; // For students
  class_name?: string; // For students (db mapped)
  hidden_topics?: string[]; // For students (topics hidden by teacher)
  gender?: 'MALE' | 'FEMALE' | 'OTHER'; // For grouping
  savedPrompts?: string[];
  customTools?: CustomToolMenu[]; // For teachers/admins
}

export interface AcademicYear {
  id: string;
  name: string;
  isActive: boolean;
  semesters: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  }[];
}

export interface Class {
  id: string;
  name: string;
  academicYearId: string;
  teacherId: string;
  studentIds: string[];
}

export type QuestionType = 'MCQ' | 'MATCHING' | 'ORDERING' | 'DRAG_DROP' | 'SHORT_ANSWER' | 'MCQ_MULTIPLE';
export type ExamDifficulty = 'NHAN_BIET' | 'KET_NOI' | 'VAN_DUNG';

export interface Question {
  id: string;
  type: QuestionType;
  content: string;
  imageUrl?: string;
  options: string[];
  correctOptionIndex?: number; // For MCQ
  correctOptionIndices?: number[]; // For MCQ_MULTIPLE
  solution?: string;
  hint?: string;
  level?: ExamDifficulty;
  topic?: string;
  isArenaEligible?: boolean;
  isNotScored?: boolean;
}

export interface QuestionBankItem extends Question {
  subject: string;
  grade: string;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  topic?: string;
  grade: string;
  difficulty: ExamDifficulty;
  durationMinutes: number;
  questionCount: number;
  createdAt: string;
  status: 'DRAFT' | 'PUBLISHED';
  classId?: string; // If assigned to a specific class directly (or null for bank)
  questions: Question[];
  category: 'EXAM' | 'TASK';
  deletedAt?: string; // Soft delete timestamp (thùng rác)
  
  // Sharing Features
  isPublic?: boolean;
  shareCode?: string;
  isCodeRequired?: boolean;
  originalAuthorId?: string;
  originalAuthorName?: string;
  contributors?: string[];
  parentExamId?: string;
  downloads?: number;
}

export interface AssignmentSettings {
  viewScore: boolean;
  viewPassFail: boolean;
  viewSolution: boolean;
  viewHint: boolean;
  maxAttempts: number;
  requireCamera?: boolean;
  requireFullscreen?: boolean;
  preventTabSwitch?: boolean;
  preventCopy?: boolean;
  viewSolutionOnLastAttemptOnly?: boolean;
  caseSensitiveShortAnswer?: boolean;
}

export interface Assignment {
  id: string;
  examId: string;
  classId: string;
  teacherId: string;
  createdAt: string;
  startTime?: string;
  endTime?: string;
  durationMinutes: number;
  settings: AssignmentSettings;
  mode?: 'exam' | 'practice';
  studentIds?: string[]; // Danh sách HS được giao bài. Nếu rỗng/undefined thì mặc định giao cho cả lớp.
}

export interface Attempt {
  id: string;
  examId: string;
  assignmentId?: string;
  studentId: string;
  answers: Record<string, any>; // Sửa thành any để hỗ trợ mảng (Matching/Ordering), chuỗi (Short Answer)
  score: number | null;
  submittedAt: string;
  teacherFeedback?: string;
  feedbackAllowViewSolution?: boolean;
  totalTimeSpentSec?: number;
  timeSpentPerQuestion?: Record<string, number>;
  cheatWarnings?: number;
}

export interface Notification {
  id: string;
  userId: string;
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
  payload?: any; // To store exam_id or other interaction data
}

export type WebResourceType = 'LINK' | 'EMBED';

export interface WebResource {
  id: string;
  title: string;
  url: string;
  type: WebResourceType;
  topic?: string;
  description?: string;
  addedBy: string;
  createdAt: string;
}

export type LiveSessionStatus = 'WAITING' | 'RUNNING' | 'FINISHED';

export interface LiveParticipant {
  studentId: string;
  name: string;
  progress: {
    answeredCount: number;
    correctCount: number;
    wrongCount: number;
    score: number;
  };
}

export interface LiveSession {
  id: string;
  examId: string;
  teacherId: string;
  status: LiveSessionStatus;
  participants: LiveParticipant[];
  createdAt: string;
}

// Discussion Types

export type ChatMessageType = 'TEXT' | 'STICKER' | 'IMAGE' | 'SYSTEM';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  type: ChatMessageType;
  timestamp: string;
  roomId: string; // 'MAIN' or breakout room ID
  roundId: string;
}

export interface PollOption {
  id: string;
  text: string;
  voteCount: number;
  voterIds: string[];
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  isAnonymous: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface BreakoutRoom {
  id: string;
  name: string;
}

export interface DiscussionRound {
  id: string;
  name: string;
  createdAt: string;
}

export interface DiscussionParticipant {
  studentId: string;
  name: string;
  isHandRaised: boolean;
  currentRoomId: string; // 'MAIN' or breakout room ID
}

export type MessageVisibility = 'FULL' | 'HIDDEN_ALL' | 'NAME_ONLY' | 'CONTENT_ONLY';
export type DiscussionStatus = 'ACTIVE' | 'FINISHED';

export interface DiscussionSession {
  id: string;
  title: string;
  teacherId: string;
  status: DiscussionStatus;
  participants: DiscussionParticipant[];
  messages: ChatMessage[];
  polls: Poll[];
  breakoutRooms: BreakoutRoom[];
  createdAt: string;
  rounds: DiscussionRound[];
  activeRoundId: string;
  visibility: MessageVisibility;
}

export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  meanings: {
    partOfSpeech: string;
    definitions: {
      definition: string;
      example?: string;
    }[];
  }[];
}

// ============================================
// EDUQUEST ARENA TYPES
// ============================================

export type AvatarClass = 'scholar' | 'scientist' | 'artist' | 'explorer';
export type MatchStatus = 'waiting' | 'challenged' | 'playing' | 'finished';

export interface ArenaProfile {
  id: string;
  avatar_class: AvatarClass;
  elo_rating: number;
  total_xp: number;
  wins: number;
  losses: number;
  tower_floor: number;
  daily_quests?: any[];
  unlocked_badges?: string[];
  active_title?: string;
  topic_mastery?: Record<string, number>;
}

export interface ArenaQuestion {
  id: string;
  content: string;
  answers: string[]; // 4 đáp án (rỗng đối với SHORT_ANSWER)
  correct_index?: number; // 0-3 (hoặc default, tùy chọn)
  difficulty: number; // 1-3
  subject: string;
  topic?: string; // Chủ đề (VD: 'Phân số', 'Hình học')
  time_limit_seconds?: number;
  xp_reward?: number;
  type?: 'MCQ' | 'MCQ_MULTIPLE' | 'SHORT_ANSWER';
  correct_indices?: number[];
  correct_answer_string?: string;
  grade?: string; // Khối lớp (ví dụ: '1', '2', '3', '4', '5')
  guide?: string; // Hướng dẫn (gợi ý cách làm, không nêu đáp án)
  explanation?: string; // Lời giải chi tiết (chi tiết các bước và đáp án)
  case_sensitive?: boolean;
}

export interface ArenaMatch {
  id: string;
  player1_id: string;
  player2_id: string | null;
  status: MatchStatus;
  question_ids: string[];
  current_question: number;
  player1_hp: number;
  player2_hp: number;
  player1_score: number;
  player2_score: number;
  winner_id: string | null;
  created_at: string;
  source?: 'exam' | 'arena'; // Nguồn câu hỏi
  filter_subject?: string;
  filter_grade?: string;
}

export interface ArenaMatchFilters {
  source: 'exam' | 'arena';
  subject?: string;
  grade?: string;
  topic?: string;
  providedQuestionIds?: string[];
  count?: number;
}

export type TournamentStatus = 'waiting' | 'active' | 'finished';
export type ParticipantStatus = 'active' | 'fighting' | 'eliminated' | 'champion';

export interface ArenaTournament {
  id: string;
  teacher_id: string;
  title: string;
  status: TournamentStatus;
  question_source: 'arena' | 'exam';
  question_ids: string[];
  filter_subject?: string;
  filter_grade?: string;
  questions_per_match: number;
  time_per_question: number;
  current_round?: number;
  round_questions?: Record<number, string[]>;
  created_at: string;
}

export interface TournamentParticipant {
  id: string;
  tournament_id: string;
  student_id: string;
  alias: string;
  alias_emoji: string;
  status: ParticipantStatus;
  wins: number;
  current_match_id?: string;
  eliminated_at?: string;
  joined_at: string;
}

export interface ArenaMatchEvent {
  id: string;
  match_id: string;
  player_id: string;
  event_type: string; // 'answer_correct', 'answer_wrong', 'timeout', 'finish'
  payload: {
    question_index?: number;
    damage?: number;
    time_taken?: number;
    answer_index?: number;
  };
  created_at: string;
}

// ============================================
// SEATING CHART TYPES
// ============================================

export interface ClassSeat {
  row: number;
  col: number;
  studentId: string | null;
}

export interface ClassSeatingChart {
  id: string;
  classId: string;
  rows: number;
  columns: number;
  seats: ClassSeat[];
  createdAt: string;
  updatedAt: string;
}

export interface AppState {
  isDataLoading: boolean;
  fetchInitialData: () => Promise<void>;
  fetchExams: () => Promise<void>;
  fetchClasses: () => Promise<void>;
  fetchAssignments: () => Promise<void>;
  fetchResources: () => Promise<void>;
  fetchDiscussions: () => Promise<void>;

  user: User | null;
  setUser: (user: User | null) => void;

  users: User[];
  addUser: (user: User, assignedClassId?: string) => void;
  updateUser: (user: User) => void;
  deleteUser: (userId: string) => Promise<boolean>;
  saveUserPrompt: (prompt: string) => void;
  updateUserCustomTools: (tools: CustomToolMenu[]) => void;
  changePassword: (userId: string, newPass: string) => Promise<boolean>;

  academicYears: AcademicYear[];
  addAcademicYear: (year: AcademicYear) => void;
  updateAcademicYear: (year: AcademicYear) => void;

  classes: Class[];
  addClass: (cls: Class) => void;
  updateClass: (cls: Class) => void;
  deleteClass: (classId: string) => Promise<boolean>;

  exams: Exam[];
  addExam: (exam: Exam) => void;
  updateExam: (exam: Exam) => void;
  softDeleteExam: (id: string) => void;
  restoreExam: (id: string) => void;
  bulkUpdateTopic: (oldName: string, newName: string) => Promise<boolean>;
  bulkDeleteTopic: (topicName: string) => Promise<boolean>;
  toggleExamShare: (id: string, isPublic: boolean, isCodeRequired: boolean) => Promise<boolean | string>;
  importExamByCode: (code: string, customMetadata?: { title?: string, subject?: string, grade?: string, topic?: string }) => Promise<string | null>;
  fetchPublicExams: () => Promise<Exam[]>;
  sendDirectShare: (examId: string, targetTeacherIds: string[]) => Promise<boolean>;
  respondToShare: (notificationId: string, examId: string, accept: boolean, customMetadata?: { title?: string, subject?: string, grade?: string, topic?: string }) => Promise<boolean>;

  questionBank: QuestionBankItem[];
  fetchQuestionBank: () => Promise<void>;
  syncQuestionsFromExams: () => Promise<number>;
  addQuestionToBank: (q: QuestionBankItem) => Promise<boolean>;
  updateQuestionInBank: (q: QuestionBankItem) => Promise<boolean>;
  deleteQuestionFromBank: (id: string) => Promise<boolean>;

  assignments: Assignment[];
  addAssignment: (assign: Assignment) => void;
  deleteAssignment: (id: string) => Promise<boolean>;
  updateAssignment: (updated: Assignment) => Promise<boolean>;

  attempts: Attempt[];
  totalAttemptsCount: number;
  fetchAttempts: (examIds?: string[]) => Promise<void>;
  addAttempt: (attempt: Attempt) => Promise<boolean>;
  updateAttemptFeedback: (attemptId: string, feedback: string, allowViewSolution: boolean) => void;

  customTopics: string[];
  addCustomTopic: (topic: string) => Promise<void>;
  fetchCustomTopics: () => Promise<void>;

  notifications: Notification[];
  addNotification: (notif: Notification) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId: string) => void;

  resources: WebResource[];
  addResource: (res: WebResource) => Promise<boolean>;
  deleteResource: (id: string) => Promise<boolean>;

  liveSessions: LiveSession[];
  createLiveSession: (session: LiveSession) => void;
  joinLiveSession: (pin: string, user: User) => boolean;
  updateLiveSessionStatus: (id: string, status: LiveSessionStatus) => void;
  updateLiveParticipantProgress: (sessionId: string, studentId: string, progress: any) => void;

  discussionSessions: DiscussionSession[];
  createDiscussion: (session: DiscussionSession) => Promise<void>;
  joinDiscussion: (pin: string, user: User) => Promise<boolean>;
  fetchDiscussionMessages: (sessionId: string, limitCount?: number) => Promise<void>;
  sendDiscussionMessage: (sessionId: string, message: ChatMessage) => Promise<void>;
  toggleHandRaise: (sessionId: string, userId: string) => Promise<void>;
  createPoll: (sessionId: string, poll: Poll) => Promise<void>;
  votePoll: (sessionId: string, pollId: string, optionId: string, userId: string) => Promise<void>;
  togglePollStatus: (sessionId: string, pollId: string, isActive: boolean) => Promise<void>;
  createBreakoutRooms: (sessionId: string, rooms: BreakoutRoom[]) => Promise<void>;
  assignToRoom: (sessionId: string, userId: string, roomId: string) => Promise<void>;
  createDiscussionRound: (sessionId: string, name: string) => Promise<void>;
  setActiveRound: (sessionId: string, roundId: string) => Promise<void>;
  setDiscussionVisibility: (sessionId: string, visibility: MessageVisibility) => Promise<void>;
  endDiscussionSession: (sessionId: string) => Promise<void>;
  deleteDiscussionSession: (pin: string) => Promise<boolean>;

  // ============================================
  // ARENA STATE & ACTIONS
  // ============================================
  arenaProfile: ArenaProfile | null;
  arenaQuestions: ArenaQuestion[];
  arenaQuestionsHasMore: boolean;
  arenaMatches: ArenaMatch[];
  arenaTotalCount: number;
  arenaDifficultyCounts: Record<number, number>;
  arenaFilteredCount: number;

  fetchArenaProfile: (userId: string) => Promise<void>;
  createArenaProfile: (userId: string, avatarClass: AvatarClass) => Promise<void>;
  updateArenaProfile: (profile: Partial<ArenaProfile> & { id: string }) => Promise<void>;
  fetchArenaQuestions: (filters?: { subject?: string; difficulty?: number; grade?: string; topic?: string; search?: string }) => Promise<void>;
  loadMoreArenaQuestions: (filters?: { subject?: string; difficulty?: number; grade?: string; topic?: string; search?: string }) => Promise<void>;
  addArenaQuestion: (q: Omit<ArenaQuestion, 'id'>) => Promise<boolean>;
  updateArenaQuestion: (q: ArenaQuestion) => Promise<boolean>;
  deleteArenaQuestion: (id: string) => Promise<boolean>;
  bulkDeleteArenaQuestions: (ids: string[]) => Promise<boolean>;

  // New Matchmaking logic
  fetchWaitingMatches: () => Promise<ArenaMatch[]>;
  createMatch: (playerId: string, filters?: ArenaMatchFilters) => Promise<ArenaMatch | null>;
  bulkAddArenaQuestions: (questions: Omit<ArenaQuestion, 'id'>[]) => Promise<number>;
  cancelMatchmaking: (matchId: string) => Promise<void>;
  challengeMatch: (matchId: string, challengerId: string) => Promise<boolean>;
  acceptMatch: (matchId: string) => Promise<boolean>;
  rejectMatch: (matchId: string) => Promise<void>;

  submitArenaAnswer: (matchId: string, playerId: string, questionIndex: number, answerIndex: number, timeTaken: number, isCorrect: boolean) => Promise<void>;
  finishMatch: (matchId: string, winnerId: string | null) => Promise<void>;
  updateMatchHp: (matchId: string, player1Hp: number, player2Hp: number) => Promise<void>;
  fetchLeaderboard: () => Promise<ArenaProfile[]>;

  // ============================================
  // SITE SETTINGS STATE & ACTIONS
  // ============================================
  siteSettings: SiteSettings | null;
  fetchSiteSettings: () => Promise<void>;
  updateSiteSettings: (settings: SiteSettings) => Promise<boolean>;

  // ============================================
  // TOURNAMENT STATE & ACTIONS
  // ============================================
  tournaments: ArenaTournament[];
  fetchTournaments: () => Promise<void>;
  createTournament: (t: Omit<ArenaTournament, 'id' | 'created_at' | 'status'>) => Promise<ArenaTournament | null>;
  updateTournament: (id: string, updates: Partial<ArenaTournament>) => Promise<void>;
  joinTournament: (tournamentId: string, studentId: string) => Promise<TournamentParticipant | null>;
  fetchTournamentParticipants: (tournamentId: string) => Promise<TournamentParticipant[]>;
  updateParticipant: (id: string, updates: Partial<TournamentParticipant>) => Promise<void>;
  eliminateParticipant: (id: string) => Promise<void>;
  
  // ============================================
  // ONE-CLICK SYNC SYSTEM (LOCAL -> SUPABASE)
  // ============================================
  syncLocalAttemptsToCloud: () => Promise<{ success: boolean; count: number }>;
}


/**
 * Represent a submission consisting of image/pdf uploaded by Student/Teacher
 * and stored specifically in the EXTERNAL storage to save the Main DB's space.
 */
export interface AISubmission {
    id: string;                         // UUID
    student_id: string;                 // Lien ket voi bang students
    class_id: string;                   // Lien ket voi bang classes
    teacher_id: string;                 // Giao vien quan ly cham bai
    exam_id?: string;                   // Optional: Link to a specific exam or assignment

    title: string;                      // Vd: "BTVN Đạo Hàm Tuần 2" (Bắt buộc)
    category: string;                   // Vd: "Bài Tập Nhà", "Kiểm tra 15p" (Bắt buộc)

    external_file_url: string;          // Duong link anh tu External Supabase
    file_type: 'image' | 'pdf';         // Loai file

    status: 'pending' | 'graded';       // Trang thai cham (Moi Nop / Da Cham)
    created_at: string;                 // Thoi gian nop
}

/**
 * Represents the AI generated review corresponding to a submission.
 */
export interface AIGradingReview {
    id: string;                         // UUID
    submission_id: string;              // Lien ket bang submissions
    teacher_id: string;                 // Giao vien xac nhan vao ban danh gia nay

    // Phan danh gia bang chu
    advantages: string;                 // Uu diem
    limitations: string;                // Han che
    improvements: string;               // Huong cai thien

    // Phan Diem so (Optional)
    score_optional?: number;            // Diem so de xuat hoac duoc giao vien luu lai (0-100)

    custom_ai_prompt?: string;          // Giao vien da chi dao AI dieu gi (VD: "Tim loi chinh ta")
    raw_ai_response?: string;           // JSON goc tu tra loi cua AI (de fix loi neu can)

    is_published_to_student: boolean;   // HS da duoc phep xem chua
    updated_at: string;                 // Thoi gian danh gia
}

// ============================================
// NHẬN XÉT THƯỜNG XUYÊN (TT27/2021)
// ============================================

export type EvaluationRating = 'T' | 'H' | 'Đ' | 'C' | 'None'; // Tốt, Hoàn thành tốt, Đạt, Chưa hoàn thành, Không đánh giá

export interface SubjectEvaluation {
  rating: EvaluationRating;
  comment: string;
}

export interface DailyEvaluation {
  id: string;
  student_id: string;
  teacher_id: string;
  class_id: string;
  evaluation_date: string; // YYYY-MM-DD
  subjects: Record<string, SubjectEvaluation>;
  competencies: Record<string, SubjectEvaluation>;
  qualities: Record<string, SubjectEvaluation>;
  general_comment: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// PARENT PORTAL (PHHS)
// ============================================

export interface Parent {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  password?: string;
  link_code?: string;
  created_at: string;
}

export interface ParentStudentLink {
  id: string;
  parent_id: string;
  student_id: string;
  linked_by?: string;
  created_at: string;
}

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  BookOpen, Search, Trophy, Sparkles, Clock, Star, Plus,
  ChevronRight, Users, CheckCircle, Loader2, GraduationCap,
  Flame, Award, Timer, BookMarked, ArrowRight, Zap, Target, Download, Medal, RotateCcw
} from 'lucide-react';
import { useStore } from '../../store';
import { ELCourse, ELStudentProgress, Class } from '../../types';
import { generateCertificatePDF } from '../../utils/certificateGenerator';

// ─── Helpers ────────────────────────────────────────────────────
function formatStudyTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m > 0 ? `${m}p` : ''}`;
  return `${m} phút`;
}

function deadlineMeta(deadline?: string): { label: string; color: string } | null {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
  if (diff < 0) return { label: 'Đã quá hạn', color: 'text-red-500 dark:text-red-400' };
  if (diff < 3) return { label: `Còn ${diff} ngày`, color: 'text-red-500 dark:text-red-400' };
  if (diff <= 7) return { label: `Còn ${diff} ngày`, color: 'text-amber-500 dark:text-amber-400' };
  return { label: `Còn ${diff} ngày`, color: 'text-emerald-600 dark:text-emerald-400' };
}

const SUBJECTS = ['Toán', 'Tiếng Việt', 'Khoa học', 'Lịch sử và Địa lí', 'Công nghệ', 'Tiếng Anh', 'Tin học'];

const SUBJECT_COLORS: Record<string, { bg: string; text: string }> = {
  'Toán': { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300' },
  'Tiếng Việt': { bg: 'bg-rose-100 dark:bg-rose-900/40', text: 'text-rose-700 dark:text-rose-300' },
  'Khoa học': { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300' },
  'Lịch sử và Địa lí': { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300' },
  'Công nghệ': { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-700 dark:text-violet-300' },
  'Tiếng Anh': { bg: 'bg-sky-100 dark:bg-sky-900/40', text: 'text-sky-700 dark:text-sky-300' },
  'Tin học': { bg: 'bg-indigo-100 dark:bg-indigo-900/40', text: 'text-indigo-700 dark:text-indigo-300' },
};

function subjectStyle(subject?: string) {
  if (!subject) return { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300' };
  return SUBJECT_COLORS[subject] ?? { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300' };
}

// ─── Loading skeleton ───────────────────────────────────────────
const Skeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-10 w-64 rounded-xl bg-slate-200 dark:bg-slate-700" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl bg-slate-100 dark:bg-slate-800 h-52" />
      ))}
    </div>
  </div>
);

// ─── Subject badge ──────────────────────────────────────────────
const SubjectBadge: React.FC<{ subject?: string }> = ({ subject }) => {
  if (!subject) return null;
  const s = subjectStyle(subject);
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      {subject}
    </span>
  );
};

// ─── Progress bar ───────────────────────────────────────────────
const ProgressBar: React.FC<{ value: number; max: number }> = ({ value, max }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums w-10 text-right">
        {pct}%
      </span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// STUDENT TABS
// ═══════════════════════════════════════════════════════════════

// ── Tab 1: My Courses ───────────────────────────────────────────
const MyCoursesTab: React.FC<{
  courses: ELCourse[];
  progress: ELStudentProgress[];
  elLessons: { courseId: string }[];
}> = ({ courses, progress, elLessons }) => {
  const navigate = useNavigate();
  const { elStudyHistory, elLessons: allLessons } = useStore();

  const reviewItems = useMemo(() => {
    const completions = new Map<string, { date: Date; lessonId: string; courseId: string; title: string; courseName: string }>();
    
    elStudyHistory.forEach(history => {
      if (history.actionType === 'LESSON_COMPLETE') {
        const lesson = (allLessons as any[]).find(l => l.id === history.lessonId);
        if (!lesson) return;
        const course = courses.find(c => c.id === lesson.courseId);
        if (!course) return;

        const date = new Date((history as any).completedAt || history.createdAt);
        const existing = completions.get(lesson.id);
        if (!existing || date > existing.date) {
          completions.set(lesson.id, {
            date, lessonId: lesson.id, courseId: course.id,
            title: lesson.title, courseName: course.title
          });
        }
      }
    });

    const now = new Date();
    const intervals = [1, 3, 7, 30];
    const items: any[] = [];

    for (const comp of completions.values()) {
      const diffDays = (now.getTime() - comp.date.getTime()) / (1000 * 3600 * 24);
      for (const interval of intervals) {
        if (Math.abs(diffDays - interval) <= 1) {
          items.push({ ...comp, daysSince: Math.round(diffDays), targetInterval: interval });
          break;
        }
      }
    }
    
    return items.sort((a, b) => a.targetInterval - b.targetInterval).slice(0, 5);
  }, [elStudyHistory, allLessons, courses]);

  const enrolled = progress.map(p => {
    const course = courses.find(c => c.id === p.courseId);
    if (!course) return null;
    const totalLessons = elLessons.filter(l => l.courseId === course.id).length;
    return { course, progress: p, totalLessons };
  }).filter(Boolean) as { course: ELCourse; progress: ELStudentProgress; totalLessons: number }[];

  if (enrolled.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
          <BookMarked className="w-8 h-8 text-slate-400" />
        </div>
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">
          Chưa có khóa học nào
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
          Hãy khám phá và ghi danh vào các khóa học để bắt đầu hành trình học tập.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviewItems.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-3">
            <RotateCcw className="w-5 h-5 text-indigo-500" />
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                💡 Bài cần ôn tập
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nhắc lại kiến thức theo phương pháp lặp lại ngắt quãng
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {reviewItems.map(item => {
              const color = item.targetInterval === 1 ? 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-900/30 dark:border-blue-800' :
                            item.targetInterval === 3 ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-800' :
                            item.targetInterval === 7 ? 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-900/30 dark:border-amber-800' :
                            'text-purple-700 bg-purple-50 border-purple-200 dark:text-purple-300 dark:bg-purple-900/30 dark:border-purple-800';
              return (
                <div key={item.lessonId} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${color}`}>
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-sm font-bold truncate">{item.title}</p>
                    <p className="text-xs opacity-80 truncate">{item.courseName} • Học cách đây {item.daysSince} ngày</p>
                  </div>
                  <button
                    onClick={() => navigate(`/elearning/learn/${item.courseId}`)}
                    className="shrink-0 p-2 rounded-lg bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 transition-colors"
                    title="Ôn tập ngay"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {enrolled.map(({ course, progress: prog, totalLessons }, idx) => {
        const dl = deadlineMeta(course.deadline);
        const isComplete = !!prog.completedAt;
        return (
          <div
            key={course.id}
            className={`
              group relative rounded-2xl bg-white dark:bg-slate-900
              border border-slate-200 dark:border-slate-800
              p-5 transition-all duration-300
              hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50
              ${idx === 0 ? 'md:flex md:gap-6' : ''}
            `}
          >
            {/* Featured first item gets larger layout */}
            <div className={idx === 0 ? 'md:flex-1' : ''}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SubjectBadge subject={course.subject} />
                    {isComplete && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle className="w-3 h-3" /> Hoàn thành
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-snug">
                    {course.title}
                  </h3>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    <Zap className="w-3.5 h-3.5" /> {course.xpReward} XP
                  </span>
                  {dl && (
                    <span className={`flex items-center gap-1 text-xs font-medium ${dl.color}`}>
                      <Timer className="w-3 h-3" /> {dl.label}
                    </span>
                  )}
                </div>
              </div>

              <ProgressBar value={prog.completedLessons.length} max={totalLessons || 1} />

              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {prog.completedLessons.length}/{totalLessons} bài học · {formatStudyTime(prog.totalStudyTime)}
                </span>
                <button
                  onClick={() => navigate(`/elearning/course/${course.id}`)}
                  className="
                    inline-flex items-center gap-1.5 px-4 py-2 rounded-xl
                    text-sm font-semibold
                    bg-indigo-600 text-white
                    hover:bg-indigo-700 active:scale-[0.97]
                    transition-all duration-200
                  "
                >
                  {isComplete ? 'Xem lại' : 'Tiếp tục học'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Tab 2: Explore ──────────────────────────────────────────────
const ExploreTab: React.FC<{
  courses: ELCourse[];
  progress: ELStudentProgress[];
  users: { id: string; name: string }[];
  userId: string;
  userClassName?: string;
  onEnroll: (courseId: string) => void;
  enrolling: string | null;
}> = ({ courses, progress, users, userId, userClassName, onEnroll, enrolling }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  const enrolledIds = useMemo(() => new Set(progress.map(p => p.courseId)), [progress]);

  const filtered = useMemo(() => {
    return courses
      .filter(c => c.isPublished)
      .filter(c => {
        // Match student's class if available
        if (userClassName && c.assignedClassIds.length > 0) {
          // Loose matching: check if any assigned class name contains the student's className
          return true; // We show all published courses, filtering by class is optional
        }
        return true;
      })
      .filter(c => {
        if (search) {
          const q = search.toLowerCase();
          return c.title.toLowerCase().includes(q) || (c.subject || '').toLowerCase().includes(q);
        }
        return true;
      })
      .filter(c => !subjectFilter || c.subject === subjectFilter);
  }, [courses, search, subjectFilter, userClassName]);

  return (
    <div className="space-y-6">
      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm khóa học..."
            className="
              w-full pl-10 pr-4 py-2.5 rounded-xl
              bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700
              text-sm text-slate-800 dark:text-slate-100
              placeholder:text-slate-400
              focus:outline-none focus:ring-2 focus:ring-indigo-500/40
              transition-shadow
            "
          />
        </div>
        <select
          value={subjectFilter}
          onChange={e => setSubjectFilter(e.target.value)}
          className="
            px-4 py-2.5 rounded-xl
            bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700
            text-sm text-slate-700 dark:text-slate-200
            focus:outline-none focus:ring-2 focus:ring-indigo-500/40
            transition-shadow
          "
        >
          <option value="">Tất cả môn</option>
          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Course grid — intentionally uses auto-fit for natural sizing */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            <Search className="w-7 h-7 text-slate-400" />
          </div>
          <p className="font-semibold text-slate-600 dark:text-slate-300">Không tìm thấy khóa học</p>
          <p className="text-sm text-slate-400 mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(course => {
            const teacher = users.find(u => u.id === course.createdBy);
            const isEnrolled = enrolledIds.has(course.id);

            return (
              <div
                key={course.id}
                className="
                  group rounded-2xl bg-white dark:bg-slate-900
                  border border-slate-200 dark:border-slate-800
                  overflow-hidden transition-all duration-300
                  hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50
                "
              >
                {/* Color band header */}
                <div className={`h-2 ${subjectStyle(course.subject).bg.replace('bg-', 'bg-')}`} />

                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <SubjectBadge subject={course.subject} />
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                      <Zap className="w-3.5 h-3.5" /> {course.xpReward} XP
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2">
                    {course.title}
                  </h3>

                  {course.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>{teacher?.name || 'Giáo viên'}</span>
                  </div>

                  {isEnrolled ? (
                    <button
                      onClick={() => navigate(`/elearning/course/${course.id}`)}
                      className="
                        w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                        text-sm font-semibold
                        bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300
                        border border-emerald-200 dark:border-emerald-800
                        cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/50
                        transition-colors
                      "
                    >
                      <CheckCircle className="w-4 h-4" /> Đã ghi danh — Vào học
                    </button>
                  ) : (
                    <button
                      onClick={() => onEnroll(course.id)}
                      disabled={enrolling === course.id}
                      className="
                        w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                        text-sm font-semibold
                        bg-indigo-600 text-white
                        hover:bg-indigo-700 active:scale-[0.97]
                        disabled:opacity-60 disabled:cursor-not-allowed
                        transition-all duration-200
                      "
                    >
                      {enrolling === course.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <BookOpen className="w-4 h-4" />
                      )}
                      {enrolling === course.id ? 'Đang ghi danh...' : 'Ghi danh'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Tab 3: Achievements ─────────────────────────────────────────
const AchievementsTab: React.FC<{
  progress: ELStudentProgress[];
  courses: ELCourse[];
}> = ({ progress, courses }) => {
  const { users, user, elStudentProgress, fetchELStudentProgress } = useStore();
  const totalCompleted = progress.filter(p => !!p.completedAt).length;
  const totalLessons = progress.reduce((sum, p) => sum + p.completedLessons.length, 0);
  const totalTime = progress.reduce((sum, p) => sum + p.totalStudyTime, 0);
  const totalXP = progress.reduce((sum, p) => {
    const course = courses.find(c => c.id === p.courseId);
    return sum + (p.completedAt ? (course?.xpReward || 0) : 0);
  }, 0);

  // Fetch all progress for leaderboard
  useEffect(() => {
    fetchELStudentProgress();
  }, []);

  // Weekly study "chart" — divide totalTime into 5 proportional bars
  const barValues = useMemo(() => {
    const sorted = [...progress].sort((a, b) => b.totalStudyTime - a.totalStudyTime);
    const bars = [0, 0, 0, 0, 0];
    sorted.forEach((p, i) => { bars[i % 5] += p.totalStudyTime; });
    const max = Math.max(...bars, 1);
    return bars.map(v => ({ value: v, pct: (v / max) * 100 }));
  }, [progress]);

  const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6'];

  // Badges logic
  const badges = useMemo(() => {
    const result: { icon: React.ReactNode; label: string; earned: boolean; desc: string }[] = [
      { icon: <Flame className="w-5 h-5" />, label: 'Khởi đầu', earned: totalLessons >= 1, desc: 'Hoàn thành bài học đầu tiên' },
      { icon: <BookOpen className="w-5 h-5" />, label: '10 bài học', earned: totalLessons >= 10, desc: 'Hoàn thành 10 bài học' },
      { icon: <Trophy className="w-5 h-5" />, label: '1 khóa học', earned: totalCompleted >= 1, desc: 'Hoàn thành 1 khóa học' },
      { icon: <Star className="w-5 h-5" />, label: 'Học 1 giờ', earned: totalTime >= 3600, desc: 'Tích lũy 1 giờ học tập' },
      { icon: <Award className="w-5 h-5" />, label: '5 khóa học', earned: totalCompleted >= 5, desc: 'Hoàn thành 5 khóa học' },
      { icon: <Target className="w-5 h-5" />, label: '50 bài học', earned: totalLessons >= 50, desc: 'Hoàn thành 50 bài học' },
      { icon: <Zap className="w-5 h-5" />, label: '100 XP', earned: totalXP >= 100, desc: 'Tích lũy 100 XP từ E-Learning' },
      { icon: <Medal className="w-5 h-5" />, label: 'Học 10 giờ', earned: totalTime >= 36000, desc: 'Tích lũy 10 giờ học tập' },
    ];
    return result;
  }, [totalCompleted, totalLessons, totalTime, totalXP]);

  // Completed courses for certificates
  const completedCourses = useMemo(() => {
    return progress
      .filter(p => !!p.completedAt)
      .map(p => {
        const course = courses.find(c => c.id === p.courseId);
        const teacher = users.find(u => u.id === course?.createdBy);
        return { progress: p, course, teacherName: teacher?.name || 'Giáo viên' };
      })
      .filter(item => !!item.course);
  }, [progress, courses, users]);

  // Leaderboard — rank all students by total completed lessons
  const leaderboard = useMemo(() => {
    const studentMap = new Map<string, { studentId: string; totalLessons: number; totalCourses: number; totalTime: number }>();
    for (const p of elStudentProgress) {
      const existing = studentMap.get(p.studentId);
      if (existing) {
        existing.totalLessons += p.completedLessons.length;
        existing.totalCourses += p.completedAt ? 1 : 0;
        existing.totalTime += p.totalStudyTime;
      } else {
        studentMap.set(p.studentId, {
          studentId: p.studentId,
          totalLessons: p.completedLessons.length,
          totalCourses: p.completedAt ? 1 : 0,
          totalTime: p.totalStudyTime,
        });
      }
    }
    return Array.from(studentMap.values())
      .sort((a, b) => b.totalLessons - a.totalLessons || b.totalTime - a.totalTime)
      .slice(0, 10);
  }, [elStudentProgress]);

  const handleDownloadCertificate = (courseId: string) => {
    const item = completedCourses.find(c => c.course?.id === courseId);
    if (!item || !item.course || !user) return;
    generateCertificatePDF({
      studentName: user.name || 'Học sinh',
      courseName: item.course.title,
      teacherName: item.teacherName,
      completionDate: item.progress.completedAt || new Date().toISOString(),
      totalXP: item.course.xpReward,
      totalStudyTime: item.progress.totalStudyTime,
    });
    toast.success('Đã tải chứng chỉ!');
  };

  return (
    <div className="space-y-8">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: <Trophy className="w-5 h-5" />, label: 'Khóa hoàn thành', value: totalCompleted, accent: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' },
          { icon: <BookOpen className="w-5 h-5" />, label: 'Bài học đã xong', value: totalLessons, accent: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
          { icon: <Clock className="w-5 h-5" />, label: 'Tổng thời gian', value: formatStudyTime(totalTime), accent: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
          { icon: <Zap className="w-5 h-5" />, label: 'Tổng XP', value: totalXP, accent: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
        ].map((stat, i) => (
          <div
            key={i}
            className="
              rounded-2xl bg-white dark:bg-slate-900
              border border-slate-200 dark:border-slate-800
              p-5 flex items-center gap-4
            "
          >
            <div className={`w-11 h-11 rounded-xl ${stat.bg} flex items-center justify-center ${stat.accent}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">{stat.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Two-column: Study chart + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly study chart */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-5">
            Phân bổ thời gian học
          </h3>
          <div className="flex items-end gap-3 h-36">
            {barValues.map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-[10px] font-medium text-slate-400 tabular-nums">
                  {bar.value > 0 ? formatStudyTime(bar.value) : '—'}
                </span>
                <div className="w-full flex flex-col justify-end h-24">
                  <div
                    className="
                      w-full rounded-lg
                      bg-indigo-500 dark:bg-indigo-400
                      transition-all duration-700 ease-out
                    "
                    style={{ height: `${Math.max(bar.pct, 4)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{WEEKDAYS[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
            <Medal className="w-4 h-4 text-amber-500" />
            Bảng xếp hạng E-Learning
          </h3>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 py-8 text-center">Chưa có dữ liệu xếp hạng</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, idx) => {
                const entryUser = users.find(u => u.id === entry.studentId);
                const isMe = entry.studentId === user?.id;
                const rankColor = idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-500 dark:text-slate-400';
                return (
                  <div
                    key={entry.studentId}
                    className={`
                      flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors
                      ${isMe
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }
                    `}
                  >
                    <span className={`text-sm font-bold w-6 text-center tabular-nums ${rankColor}`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isMe ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>
                        {entryUser?.name || 'Học sinh'}
                        {isMe && <span className="text-xs font-normal text-indigo-500 ml-1">(Bạn)</span>}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                      {entry.totalLessons} bài
                    </span>
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 tabular-nums w-16 text-right">
                      {formatStudyTime(entry.totalTime)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Badges */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
          Huy hiệu
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {badges.map((badge, i) => (
            <div
              key={i}
              className={`
                flex flex-col items-center gap-2 p-4 rounded-2xl text-center
                border transition-all duration-300
                ${badge.earned
                  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-50'
                }
              `}
              title={badge.desc}
            >
              <div className={`
                w-10 h-10 rounded-xl flex items-center justify-center
                ${badge.earned
                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                }
              `}>
                {badge.icon}
              </div>
              <span className={`text-xs font-semibold ${badge.earned ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                {badge.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Certificates */}
      {completedCourses.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-indigo-500" />
            Chứng chỉ hoàn thành ({completedCourses.length})
          </h3>
          <div className="space-y-3">
            {completedCourses.map(item => (
              <div
                key={item.course!.id}
                className="
                  flex items-center gap-4 p-4 rounded-2xl
                  bg-white dark:bg-slate-900
                  border border-slate-200 dark:border-slate-800
                "
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {item.course!.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Hoàn thành: {formatDate(item.progress.completedAt!)} • GV: {item.teacherName} • {item.course!.xpReward} XP
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadCertificate(item.course!.id)}
                  className="
                    inline-flex items-center gap-2 px-4 py-2 rounded-xl
                    text-sm font-semibold
                    bg-indigo-50 dark:bg-indigo-900/30
                    text-indigo-600 dark:text-indigo-400
                    hover:bg-indigo-100 dark:hover:bg-indigo-900/50
                    active:scale-[0.97] transition-all duration-200
                  "
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Tải chứng chỉ</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('vi-VN'); } catch { return iso; }
}

// ═══════════════════════════════════════════════════════════════
// TEACHER VIEW
// ═══════════════════════════════════════════════════════════════
const TeacherView: React.FC<{
  courses: ELCourse[];
  progress: ELStudentProgress[];
  users: { id: string; name: string }[];
  userId: string;
  classes: Class[];
  onCreateCourse: (data: Omit<ELCourse, 'id' | 'createdAt' | 'updatedAt'>) => void;
}> = ({ courses, progress, users, userId, classes, onCreateCourse }) => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const myCourses = useMemo(
    () => courses.filter(c => c.createdBy === userId),
    [courses, userId],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Khóa học của bạn
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {myCourses.length} khóa học
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="
            inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
            text-sm font-semibold
            bg-indigo-600 text-white
            hover:bg-indigo-700 active:scale-[0.97]
            transition-all duration-200
          "
        >
          <Plus className="w-4 h-4" /> Tạo khóa học
        </button>
      </div>

      {/* Course list */}
      {myCourses.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">Chưa có khóa học</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Bấm "Tạo khóa học" để bắt đầu.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myCourses.map((course, idx) => {
            const studentCount = progress.filter(p => p.courseId === course.id).length;
            return (
              <div
                key={course.id}
                className={`
                  group rounded-2xl bg-white dark:bg-slate-900
                  border border-slate-200 dark:border-slate-800
                  p-5 transition-all duration-300
                  hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50
                  ${idx === 0 ? 'sm:flex sm:items-center sm:gap-6' : ''}
                `}
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SubjectBadge subject={course.subject} />
                    <span className={`
                      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
                      ${course.isPublished
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }
                    `}>
                      {course.isPublished ? 'Đã xuất bản' : 'Bản nháp'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{course.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {studentCount} học sinh
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" /> {course.xpReward} XP
                    </span>
                    {course.deadline && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Hạn: {new Date(course.deadline).toLocaleDateString('vi-VN')}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/elearning/manage/${course.id}`)}
                  className="
                    mt-3 sm:mt-0
                    inline-flex items-center gap-1.5 px-4 py-2 rounded-xl
                    text-sm font-semibold
                    bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200
                    hover:bg-slate-200 dark:hover:bg-slate-700
                    transition-colors
                  "
                >
                  Quản lý <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <CreateCourseModal
          classes={classes}
          userId={userId}
          onClose={() => setShowModal(false)}
          onCreate={onCreateCourse}
        />
      )}
    </div>
  );
};

// ── Create Course Modal ─────────────────────────────────────────
const CreateCourseModal: React.FC<{
  classes: Class[];
  userId: string;
  onClose: () => void;
  onCreate: (data: Omit<ELCourse, 'id' | 'createdAt' | 'updatedAt'>) => void;
}> = ({ classes, userId, onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [xpReward, setXpReward] = useState(50);
  const [deadline, setDeadline] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const toggleClass = (id: string) => {
    setSelectedClassIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Vui lòng nhập tên khóa học');
      return;
    }
    setSubmitting(true);
    await onCreate({
      title: title.trim(),
      description: description.trim(),
      subject: subject.trim(),
      coverImage: '',
      createdBy: userId,
      assignedClassIds: selectedClassIds,
      isPublished,
      deadline: deadline || undefined,
      xpReward,
      orderIndex: 0,
    });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <form
        onSubmit={handleSubmit}
        className="
          relative w-full max-w-lg rounded-2xl
          bg-white dark:bg-slate-900
          border border-slate-200 dark:border-slate-800
          shadow-2xl p-6 space-y-5
          max-h-[90vh] overflow-y-auto
        "
      >
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Tạo khóa học mới
        </h2>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Tên khóa học <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="VD: Toán lớp 5 — Phân số"
            className="
              w-full px-4 py-2.5 rounded-xl
              bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700
              text-sm text-slate-800 dark:text-slate-100
              placeholder:text-slate-400
              focus:outline-none focus:ring-2 focus:ring-indigo-500/40
            "
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Mô tả
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Mô tả ngắn gọn nội dung khóa học..."
            className="
              w-full px-4 py-2.5 rounded-xl resize-none
              bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700
              text-sm text-slate-800 dark:text-slate-100
              placeholder:text-slate-400
              focus:outline-none focus:ring-2 focus:ring-indigo-500/40
            "
          />
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Môn học
          </label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="VD: Toán, Tiếng Việt..."
            className="
              w-full px-4 py-2.5 rounded-xl
              bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700
              text-sm text-slate-800 dark:text-slate-100
              placeholder:text-slate-400
              focus:outline-none focus:ring-2 focus:ring-indigo-500/40
            "
          />
        </div>

        {/* Assigned classes */}
        {classes.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Lớp học được chỉ định
            </label>
            <div className="flex flex-wrap gap-2">
              {classes.map(cls => {
                const selected = selectedClassIds.includes(cls.id);
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => toggleClass(cls.id)}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
                      ${selected
                        ? 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                      }
                    `}
                  >
                    {cls.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* XP & Deadline row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              XP thưởng
            </label>
            <input
              type="number"
              value={xpReward}
              onChange={e => setXpReward(Number(e.target.value))}
              min={0}
              className="
                w-full px-4 py-2.5 rounded-xl
                bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                text-sm text-slate-800 dark:text-slate-100
                focus:outline-none focus:ring-2 focus:ring-indigo-500/40
              "
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Hạn nộp
            </label>
            <input
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className="
                w-full px-4 py-2.5 rounded-xl
                bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                text-sm text-slate-800 dark:text-slate-100
                focus:outline-none focus:ring-2 focus:ring-indigo-500/40
              "
            />
          </div>
        </div>

        {/* Publish toggle */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={e => setIsPublished(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500/40"
          />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Xuất bản ngay</span>
        </label>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="
              inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
              text-sm font-semibold
              bg-indigo-600 text-white
              hover:bg-indigo-700 active:scale-[0.97]
              disabled:opacity-60 disabled:cursor-not-allowed
              transition-all duration-200
            "
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Đang tạo...' : 'Tạo khóa học'}
          </button>
        </div>
      </form>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
const STUDENT_TABS = [
  { key: 'my', label: 'Khóa học của tôi', icon: BookMarked },
  { key: 'explore', label: 'Khám phá', icon: Sparkles },
  { key: 'achievements', label: 'Thành tích', icon: Trophy },
] as const;

type StudentTabKey = typeof STUDENT_TABS[number]['key'];

export const CourseDashboard: React.FC = () => {
  const {
    user, elCourses, elStudentProgress, elLessons,
    fetchELCourses, fetchELStudentProgress,
    enrollCourse, addELCourse,
    users, classes, fetchClasses, elLoading,
  } = useStore();

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<StudentTabKey>('my');
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  const isStudent = user?.role === 'STUDENT';
  const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN';

  useEffect(() => {
    fetchELCourses();
    if (user?.role === 'STUDENT') fetchELStudentProgress(user.id);
    if (user?.role === 'TEACHER' || user?.role === 'ADMIN') fetchClasses();
  }, []);

  // ── Handlers ──────────────────────────────────────────────────
  const handleEnroll = async (courseId: string) => {
    if (!user) return;
    setEnrollingId(courseId);
    try {
      const ok = await enrollCourse(user.id, courseId);
      if (ok) {
        toast.success('Ghi danh thành công!');
        await fetchELStudentProgress(user.id);
      } else {
        toast.error('Không thể ghi danh. Vui lòng thử lại.');
      }
    } catch {
      toast.error('Đã xảy ra lỗi khi ghi danh.');
    }
    setEnrollingId(null);
  };

  const handleCreateCourse = async (data: Omit<ELCourse, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const result = await addELCourse(data);
      if (result) {
        toast.success(`Đã tạo khóa học "${result.title}"`);
      } else {
        toast.error('Không thể tạo khóa học. Vui lòng thử lại.');
      }
    } catch {
      toast.error('Đã xảy ra lỗi khi tạo khóa học.');
    }
  };

  // ── Render ────────────────────────────────────────────────────
  if (elLoading && elCourses.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Skeleton />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight" style={{ textWrap: 'balance' as any }}>
          E-Learning
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {isStudent ? 'Học tập, khám phá và theo dõi thành tích của bạn.' : 'Quản lý các khóa học trực tuyến của bạn.'}
        </p>
      </div>

      {/* ── Student view ─────────────────────────────────── */}
      {isStudent && (
        <>
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 w-fit">
            {STUDENT_TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
                    transition-all duration-200
                    ${isActive
                      ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          {activeTab === 'my' && (
            <MyCoursesTab
              courses={elCourses}
              progress={elStudentProgress}
              elLessons={elLessons}
            />
          )}
          {activeTab === 'explore' && (
            <ExploreTab
              courses={elCourses}
              progress={elStudentProgress}
              users={users}
              userId={user!.id}
              userClassName={user?.className || (user as any)?.class_name}
              onEnroll={handleEnroll}
              enrolling={enrollingId}
            />
          )}
          {activeTab === 'achievements' && (
            <AchievementsTab
              progress={elStudentProgress}
              courses={elCourses}
            />
          )}
        </>
      )}

      {/* ── Teacher / Admin view ─────────────────────────── */}
      {isTeacher && user && (
        <TeacherView
          courses={elCourses}
          progress={elStudentProgress}
          users={users}
          userId={user.id}
          classes={classes}
          onCreateCourse={handleCreateCourse}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Play,
  Lock,
  FileText,
  Clock,
  Send,
  ExternalLink,
  Loader2,
  BookOpen,
  Award,
  MessageCircle,
  CornerDownRight,
  Trash2,
} from 'lucide-react';
import { useStore } from '../../store';
import { ELVideoQuestion } from '../../types';

/* ================================================================
   HELPERS
   ================================================================ */

function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

function extractYouTubeId(url: string): string | null {
  const short = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (short) return short[1];
  const long = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (long) return long[1];
  const embed = url.match(/embed\/([a-zA-Z0-9_-]{11})/);
  if (embed) return embed[1];
  return null;
}

function toDriveEmbedUrl(url: string): string {
  const fileMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  const docsMatch = url.match(
    /docs\.google\.com\/(document|presentation|spreadsheets)\/d\/([a-zA-Z0-9_-]+)/,
  );
  if (docsMatch) return `https://docs.google.com/${docsMatch[1]}/d/${docsMatch[2]}/preview`;
  return url;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/* ================================================================
   COMPONENT
   ================================================================ */

export const CourseLearn: React.FC = () => {
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    user,
    elCourses,
    elChapters,
    elLessons,
    elStudentProgress,
    elLessonComments,
    fetchELCourseDetail,
    fetchELStudentProgress,
    markLessonComplete,
    logStudyActivity,
    fetchELComments,
    addELComment,
    deleteELComment,
    enrollCourse,
    elLoading,
  } = useStore();

  /* ---- local state ---- */
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [driveError, setDriveError] = useState(false);

  // Video tracking
  const watchTimeRef = useRef(0);
  const [watchTime, setWatchTime] = useState(0);
  const [studyTimeOnPage, setStudyTimeOnPage] = useState(0);

  // Video question overlay
  const [activeVideoQuestion, setActiveVideoQuestion] = useState<ELVideoQuestion | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [wrongAnswer, setWrongAnswer] = useState(false);

  /* ---- derived data ---- */
  const course = elCourses.find((c) => c.id === courseId);
  const chapters = useMemo(
    () => elChapters.filter((ch) => ch.courseId === courseId && !ch.isHidden).sort((a, b) => a.orderIndex - b.orderIndex),
    [elChapters, courseId],
  );
  const visibleLessons = useMemo(
    () => elLessons.filter((l) => l.courseId === courseId && !l.isHidden).sort((a, b) => a.orderIndex - b.orderIndex),
    [elLessons, courseId],
  );
  const selectedLesson = visibleLessons.find((l) => l.id === selectedLessonId);

  const progress = elStudentProgress.find(
    (p) => p.studentId === user?.id && p.courseId === courseId,
  );
  const completedSet = useMemo(() => new Set(progress?.completedLessons ?? []), [progress]);
  const completedCount = completedSet.size;
  const totalCount = visibleLessons.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const isLessonCompleted = selectedLessonId ? completedSet.has(selectedLessonId) : false;

  /* ---- lesson lock logic ---- */
  function isLessonLocked(lessonId: string): boolean {
    const lesson = visibleLessons.find((l) => l.id === lessonId);
    if (!lesson || !lesson.requiresPrevious) return false;
    const chapterLessons = visibleLessons.filter((l) => l.chapterId === lesson.chapterId);
    const idx = chapterLessons.findIndex((l) => l.id === lessonId);
    if (idx <= 0) return false;
    const prev = chapterLessons[idx - 1];
    return !completedSet.has(prev.id);
  }

  /* ---- requirements met? ---- */
  const requirementsMet = useMemo(() => {
    if (!selectedLesson) return false;
    if (selectedLesson.videoUrl && selectedLesson.videoDuration > 0) {
      return watchTime >= selectedLesson.videoDuration * 0.8;
    }
    return studyTimeOnPage >= selectedLesson.minStudyTime;
  }, [selectedLesson, watchTime, studyTimeOnPage]);

  /* ================================================================
     EFFECTS
     ================================================================ */

  // Fetch course detail & progress
  useEffect(() => {
    if (courseId) {
      fetchELCourseDetail(courseId);
      if (user) fetchELStudentProgress(user.id, courseId);
    }
  }, [courseId]);

  // Auto-enroll
  useEffect(() => {
    if (user && courseId && elLessons.length > 0) {
      const hasProgress = elStudentProgress.some(
        (p) => p.studentId === user.id && p.courseId === courseId,
      );
      if (!hasProgress) enrollCourse(user.id, courseId);
    }
  }, [user, courseId, elLessons]);

  // Auto-select first lesson & expand all chapters
  useEffect(() => {
    if (visibleLessons.length > 0 && !selectedLessonId) {
      setSelectedLessonId(visibleLessons[0].id);
    }
    if (chapters.length > 0 && expandedChapters.size === 0) {
      setExpandedChapters(new Set(chapters.map((ch) => ch.id)));
    }
  }, [visibleLessons, chapters]);

  // Fetch comments when lesson changes
  useEffect(() => {
    if (selectedLessonId) {
      fetchELComments(selectedLessonId);
      setDriveError(false);
    }
  }, [selectedLessonId]);

  // Reset watch time when lesson changes
  useEffect(() => {
    watchTimeRef.current = 0;
    setWatchTime(0);
    setStudyTimeOnPage(0);
    setActiveVideoQuestion(null);
    setAnsweredQuestions(new Set());
    setWrongAnswer(false);
  }, [selectedLessonId]);

  // Watch time + study time tracking
  useEffect(() => {
    if (!selectedLesson) return;
    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return;

      // Study time always ticks
      setStudyTimeOnPage((prev) => prev + 1);

      // Video watch time only if lesson has video
      if (selectedLesson.videoUrl) {
        watchTimeRef.current += 1;
        const wt = watchTimeRef.current;
        setWatchTime(wt);

        // Check for unanswered video questions
        if (selectedLesson.videoQuestions?.length > 0 && !activeVideoQuestion) {
          const nextQ = selectedLesson.videoQuestions.find(
            (q) => wt >= q.timestamp && !answeredQuestions.has(q.id),
          );
          if (nextQ) setActiveVideoQuestion(nextQ);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedLesson, activeVideoQuestion, answeredQuestions]);

  /* ================================================================
     HANDLERS
     ================================================================ */

  function toggleChapter(chapterId: string) {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  }

  function selectLesson(lessonId: string) {
    if (isLessonLocked(lessonId)) return;
    setSelectedLessonId(lessonId);
    setSidebarOpen(false);
  }

  function handleVideoAnswer(optionIndex: number) {
    if (!activeVideoQuestion) return;
    if (optionIndex === activeVideoQuestion.correctIndex) {
      setAnsweredQuestions((prev) => new Set(prev).add(activeVideoQuestion.id));
      setActiveVideoQuestion(null);
      setWrongAnswer(false);
    } else {
      setWrongAnswer(true);
      setTimeout(() => setWrongAnswer(false), 1500);
    }
  }

  async function handleComplete() {
    if (!user || !courseId || !selectedLessonId) return;
    const ok = await markLessonComplete(user.id, courseId, selectedLessonId);
    if (ok) {
      if (selectedLesson?.videoUrl && watchTime > 0) {
        logStudyActivity({
          studentId: user.id,
          courseId,
          lessonId: selectedLessonId,
          actionType: 'VIDEO_WATCH',
          timeSpent: watchTime,
        });
      }
      toast.success('Hoàn thành bài học!');
      // Auto-select next lesson
      const idx = visibleLessons.findIndex((l) => l.id === selectedLessonId);
      if (idx >= 0 && idx < visibleLessons.length - 1) {
        const next = visibleLessons[idx + 1];
        if (!isLessonLocked(next.id)) setSelectedLessonId(next.id);
      }
    } else {
      toast.error('Không thể đánh dấu hoàn thành. Vui lòng thử lại.');
    }
  }

  async function handleAddComment() {
    if (!commentText.trim() || !user || !selectedLessonId) return;
    const ok = await addELComment({
      lessonId: selectedLessonId,
      userId: user.id,
      userName: user.name,
      content: commentText.trim(),
    });
    if (ok) {
      setCommentText('');
    } else {
      toast.error('Không thể gửi bình luận.');
    }
  }

  async function handleReplySubmit(parentId: string) {
    if (!replyText.trim() || !user || !selectedLessonId) return;
    const ok = await addELComment({
      lessonId: selectedLessonId,
      userId: user.id,
      userName: user.name,
      content: replyText.trim(),
      parentCommentId: parentId,
    });
    if (ok) {
      setReplyText('');
      setReplyingTo(null);
    } else {
      toast.error('Không thể gửi câu trả lời.');
    }
  }

  /* ================================================================
     RENDER HELPERS
     ================================================================ */

  function renderVideoPlayer() {
    if (!selectedLesson?.videoUrl) return null;
    const url = selectedLesson.videoUrl;
    const duration = selectedLesson.videoDuration;

    let embedSrc = '';
    if (isYouTubeUrl(url)) {
      const ytId = extractYouTubeId(url);
      if (ytId) embedSrc = `https://www.youtube.com/embed/${ytId}?enablejsapi=1`;
    } else {
      embedSrc = toDriveEmbedUrl(url);
    }

    const watchPct = duration > 0 ? Math.min(Math.round((watchTime / duration) * 100), 100) : 0;

    return (
      <div className="mb-6">
        {/* 16:9 container */}
        <div className="relative w-full overflow-hidden rounded-xl bg-gray-950" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={embedSrc}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={selectedLesson.title}
          />

          {/* Video question overlay */}
          {activeVideoQuestion && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="mx-4 w-full max-w-lg rounded-2xl bg-white p-6 dark:bg-gray-800">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                  Câu hỏi kiểm tra
                </p>
                <p className="mb-5 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {activeVideoQuestion.question}
                </p>
                <div className="space-y-2.5">
                  {activeVideoQuestion.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleVideoAnswer(i)}
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700 transition-colors hover:border-indigo-400 hover:bg-indigo-50 dark:border-gray-600 dark:text-gray-200 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/30"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {wrongAnswer && (
                  <p className="mt-3 text-center text-sm font-medium text-red-600 dark:text-red-400">
                    Sai rồi! Thử lại
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Watch progress */}
        {duration > 0 && (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Đã xem: {formatDuration(watchTime)} / {formatDuration(duration)} ({watchPct}%)
              </span>
              {watchPct >= 80 && (
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  ✓ Đủ điều kiện
                </span>
              )}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-500 dark:bg-indigo-500"
                style={{ width: `${watchPct}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderDriveDocument() {
    if (!selectedLesson?.driveUrl) return null;
    // Skip if the driveUrl is the same as videoUrl (already rendered as video)
    if (selectedLesson.videoUrl && selectedLesson.driveUrl === selectedLesson.videoUrl) return null;

    const embedUrl = toDriveEmbedUrl(selectedLesson.driveUrl);

    if (driveError) {
      return (
        <div className="mb-6 flex flex-col items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-8 dark:border-amber-800 dark:bg-amber-900/20">
          <FileText className="h-10 w-10 text-amber-500" />
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Không thể hiển thị tài liệu
          </p>
          <button
            onClick={() => window.open(selectedLesson.driveUrl, '_blank')}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700"
          >
            <ExternalLink className="h-4 w-4" />
            Mở trong tab mới
          </button>
        </div>
      );
    }

    return (
      <div className="mb-6">
        <div
          className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
          style={{ paddingBottom: '75%', position: 'relative' }}
        >
          <iframe
            src={embedUrl}
            className="absolute inset-0 h-full w-full"
            title="Tài liệu"
            onError={() => setDriveError(true)}
          />
        </div>
      </div>
    );
  }

  function renderMarkdownContent() {
    if (!selectedLesson?.content) return null;
    return (
      <div className="prose prose-sm mb-6 max-w-none dark:prose-invert prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-indigo-600 dark:prose-headings:text-gray-100 dark:prose-p:text-gray-300 dark:prose-a:text-indigo-400">
        <ReactMarkdown>{selectedLesson.content}</ReactMarkdown>
      </div>
    );
  }

  function renderQuizLink() {
    if (!selectedLesson?.quizId) return null;
    return (
      <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800/50">
        <div className="flex items-center gap-3 mb-3">
          <Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Kiểm tra đầu ra
          </h3>
        </div>
        {!requirementsMet ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Hoàn thành bài học để mở khóa bài kiểm tra.
          </p>
        ) : null}
        <button
          disabled={!requirementsMet}
          onClick={() => navigate(`/exam/${selectedLesson.quizId}/take`)}
          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          <BookOpen className="h-4 w-4" />
          Làm kiểm tra
        </button>
      </div>
    );
  }

  function renderCompleteButton() {
    if (!selectedLesson) return null;
    if (isLessonCompleted) {
      return (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 dark:border-emerald-800 dark:bg-emerald-900/20">
          <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Đã hoàn thành
          </span>
        </div>
      );
    }
    return (
      <div className="mb-6">
        <button
          disabled={!requirementsMet}
          onClick={handleComplete}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-emerald-500 dark:hover:bg-emerald-600"
        >
          <CheckCircle className="h-4.5 w-4.5" />
          Đánh dấu Hoàn thành
        </button>
        {!requirementsMet && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {selectedLesson.videoUrl && selectedLesson.videoDuration > 0
              ? `Xem ít nhất 80% video (${formatDuration(Math.ceil(selectedLesson.videoDuration * 0.8))})`
              : `Học ít nhất ${formatDuration(selectedLesson.minStudyTime)}`}
          </p>
        )}
      </div>
    );
  }

  function renderComments() {
    const lessonComments = elLessonComments.filter((c) => c.lessonId === selectedLessonId);
    const topLevelComments = lessonComments.filter((c) => !c.parentCommentId);
    
    const repliesByParent = new Map<string, typeof lessonComments>();
    lessonComments.forEach((c) => {
      if (c.parentCommentId) {
        const list = repliesByParent.get(c.parentCommentId) || [];
        list.push(c);
        repliesByParent.set(c.parentCommentId, list);
      }
    });

    const renderCommentNode = (c: any, isReply: boolean = false) => {
      const isOwner = user?.id === c.userId;
      const isTeacher = user?.role === 'TEACHER';
      const canDelete = isOwner || isTeacher;

      return (
        <div key={c.id} className={`${isReply ? 'ml-8 border-l border-gray-200 pl-4 mt-3 dark:border-gray-700' : ''}`}>
          <div className={`rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-900/50 ${isReply ? '' : 'mb-3'}`}>
            <div className="mb-1 flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {c.userName}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(c.createdAt).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {!isReply && (
                  <button
                    onClick={() => {
                      setReplyingTo(replyingTo === c.id ? null : c.id);
                      setReplyText('');
                    }}
                    className="flex items-center gap-1 text-xs text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    <CornerDownRight className="h-3.5 w-3.5" />
                    Trả lời
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => deleteELComment(c.id)}
                    className="text-xs text-red-400 transition-colors hover:text-red-600 dark:hover:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{c.content}</p>
          </div>

          {!isReply && replyingTo === c.id && (
            <div className="ml-8 mb-3 flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReplySubmit(c.id)}
                placeholder="Viết câu trả lời..."
                className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-400 focus:bg-white focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-500 dark:focus:bg-gray-800"
              />
              <button
                onClick={() => handleReplySubmit(c.id)}
                disabled={!replyText.trim()}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-white transition-colors hover:bg-indigo-700 disabled:opacity-40 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {!isReply && repliesByParent.has(c.id) && (
            <div className="space-y-0">
              {repliesByParent.get(c.id)!.map((reply) => renderCommentNode(reply, true))}
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Bình luận ({lessonComments.length})
          </h3>
        </div>

        {/* Comment input */}
        <div className="mb-5 flex gap-2">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
            placeholder="Viết bình luận..."
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-400 focus:bg-white focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-500 dark:focus:bg-gray-800"
          />
          <button
            onClick={handleAddComment}
            disabled={!commentText.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-white transition-colors hover:bg-indigo-700 disabled:opacity-40 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        {/* Comments list */}
        {lessonComments.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
            Chưa có bình luận nào.
          </p>
        ) : (
          <div className="space-y-4">
            {topLevelComments.map((c) => renderCommentNode(c, false))}
          </div>
        )}
      </div>
    );
  }

  /* ================================================================
     SIDEBAR
     ================================================================ */

  function renderSidebar() {
    return (
      <nav className="flex h-full flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Nội dung khóa học
          </span>
          {/* Close button for mobile overlay */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 md:hidden dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {chapters.map((chapter) => {
            const chapterLessons = visibleLessons.filter((l) => l.chapterId === chapter.id);
            const isExpanded = expandedChapters.has(chapter.id);
            const chapterCompleted = chapterLessons.every((l) => completedSet.has(l.id));

            return (
              <div key={chapter.id} className="mb-1">
                <button
                  onClick={() => toggleChapter(chapter.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                  )}
                  <span
                    className={`flex-1 font-medium ${
                      chapterCompleted
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {chapter.title}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {chapterLessons.filter((l) => completedSet.has(l.id)).length}/{chapterLessons.length}
                  </span>
                </button>

                {isExpanded && (
                  <div className="ml-3 border-l border-gray-200 pl-2 dark:border-gray-700">
                    {chapterLessons.map((lesson) => {
                      const isCurrent = lesson.id === selectedLessonId;
                      const isCompleted = completedSet.has(lesson.id);
                      const isLocked = isLessonLocked(lesson.id);

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => selectLesson(lesson.id)}
                          disabled={isLocked}
                          className={`mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            isCurrent
                              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                              : isLocked
                                ? 'cursor-not-allowed text-gray-400 dark:text-gray-600'
                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/50'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle
                              className={`h-4 w-4 shrink-0 ${
                                isCurrent ? 'text-white' : 'text-emerald-500 dark:text-emerald-400'
                              }`}
                            />
                          ) : isCurrent ? (
                            <Play className="h-4 w-4 shrink-0 text-white" />
                          ) : isLocked ? (
                            <Lock className="h-4 w-4 shrink-0" />
                          ) : (
                            <div className="h-4 w-4 shrink-0 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                          )}
                          <span className="flex-1 truncate">{lesson.title}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>
    );
  }

  /* ================================================================
     LOADING STATE
     ================================================================ */

  if (elLoading && visibleLessons.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Đang tải khóa học...</p>
        </div>
      </div>
    );
  }

  /* ================================================================
     MAIN RENDER
     ================================================================ */

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
      {/* ---- Header ---- */}
      <header className="z-20 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <button
          onClick={() => navigate('/elearning')}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 md:hidden dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
            {course?.title ?? 'Khóa học'}
          </h1>
        </div>

        {/* Progress indicator */}
        <div className="hidden items-center gap-3 sm:flex">
          <div className="text-right">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {completedCount}/{totalCount} bài
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-500 dark:bg-indigo-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{pct}%</span>
          </div>
        </div>
      </header>

      {/* ---- Body ---- */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Mobile overlay backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar — desktop: static, mobile: overlay drawer */}
        <aside
          className={`
            absolute inset-y-0 left-0 z-40 w-72 border-r border-gray-200 bg-white transition-transform duration-300 md:relative md:z-auto md:translate-x-0
            dark:border-gray-700 dark:bg-gray-800
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          {renderSidebar()}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {selectedLesson ? (
            <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
              {/* Lesson title */}
              <h2 className="mb-5 text-xl font-bold text-gray-900 dark:text-gray-100">
                {selectedLesson.title}
              </h2>

              {renderVideoPlayer()}
              {renderDriveDocument()}
              {renderMarkdownContent()}
              {renderQuizLink()}
              {renderCompleteButton()}
              {renderComments()}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <BookOpen className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Chọn một bài học để bắt đầu
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ---- Mobile progress bar (visible on small screens) ---- */}
      <div className="border-t border-gray-200 bg-white px-4 py-2 sm:hidden dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            {completedCount}/{totalCount} bài
          </span>
          <span className="font-medium text-indigo-600 dark:text-indigo-400">{pct}%</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-500 dark:bg-indigo-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
};

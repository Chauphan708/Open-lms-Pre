import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { ELLesson, ELVideoQuestion, ELStudentProgress, ELStudyHistory } from '../../types';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Save, Trash2, Plus, Pencil, Eye, EyeOff,
  Lock, X, Loader2, BookOpen, Settings, GripVertical,
  ChevronDown, ChevronRight, Video, FileText, Check,
  BarChart3, Download, AlertTriangle, Sparkles, Wand2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { generateLessonContent, generateVideoQuestions } from '../../services/geminiService';

/* ================================================================
   COURSE MANAGE – Teacher's course editor
   Route: /elearning/manage/:id
   ================================================================ */

export const CourseManage: React.FC = () => {
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    user, elCourses, elChapters, elLessons,
    fetchELCourseDetail, updateELCourse, deleteELCourse,
    addELChapter, updateELChapter, deleteELChapter,
    addELLesson, updateELLesson, deleteELLesson,
    classes, fetchClasses, exams, fetchExams, elLoading,
    elStudentProgress, elStudyHistory,
    fetchELStudentProgress, fetchELStudyHistory, users,
  } = useStore();

  // ── data ──────────────────────────────────────────────────────
  const course = elCourses.find(c => c.id === courseId);
  const courseChapters = useMemo(
    () => elChapters.filter(ch => ch.courseId === courseId).sort((a, b) => a.orderIndex - b.orderIndex),
    [elChapters, courseId],
  );
  const lessonsByChapter = useMemo(() => {
    const map: Record<string, ELLesson[]> = {};
    for (const ch of courseChapters) {
      map[ch.id] = elLessons
        .filter(l => l.chapterId === ch.id)
        .sort((a, b) => a.orderIndex - b.orderIndex);
    }
    return map;
  }, [elLessons, courseChapters]);

  // ── tabs ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'info' | 'curriculum' | 'reports'>('info');

  // ── Tab 1 form state ──────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [assignedClassIds, setAssignedClassIds] = useState<string[]>([]);
  const [deadline, setDeadline] = useState('');
  const [xpReward, setXpReward] = useState(50);
  const [isPublished, setIsPublished] = useState(false);

  // ── Chapter inline create ─────────────────────────────────────
  const [addingChapter, setAddingChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');

  // ── Chapter inline rename ─────────────────────────────────────
  const [renamingChapterId, setRenamingChapterId] = useState<string | null>(null);
  const [renameChapterTitle, setRenameChapterTitle] = useState('');

  // ── Lesson inline create (per chapter) ────────────────────────
  const [addingLessonChapterId, setAddingLessonChapterId] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');

  // ── Lesson edit modal ─────────────────────────────────────────
  const [editingLesson, setEditingLesson] = useState<ELLesson | null>(null);
  const [lessonForm, setLessonForm] = useState<Partial<ELLesson>>({});
  const [videoQuestions, setVideoQuestions] = useState<ELVideoQuestion[]>([]);

  // ── Collapsed chapters ────────────────────────────────────────
  const [collapsedChapters, setCollapsedChapters] = useState<Set<string>>(new Set());

  // ── Confirm delete ────────────────────────────────────────────
  const [confirmDeleteCourse, setConfirmDeleteCourse] = useState(false);

  // ── AI state ──────────────────────────────────────────────────
  const [aiLoading, setAiLoading] = useState<'lesson' | 'video' | null>(null);
  const [aiRawInput, setAiRawInput] = useState('');

  // ── init ──────────────────────────────────────────────────────
  useEffect(() => {
    if (courseId) {
      fetchELCourseDetail(courseId!);
      fetchClasses();
      fetchExams();
      fetchELStudentProgress(undefined, courseId);
      fetchELStudyHistory(courseId!);
    }
  }, [courseId]);

  // Sync form when course loads
  useEffect(() => {
    if (course) {
      setTitle(course.title);
      setDescription(course.description || '');
      setSubject(course.subject || '');
      setAssignedClassIds(course.assignedClassIds || []);
      setDeadline(course.deadline || '');
      setXpReward(course.xpReward);
      setIsPublished(course.isPublished);
    }
  }, [course?.id]);

  // ── teacher classes ───────────────────────────────────────────
  const teacherClasses = useMemo(
    () => classes.filter(c => c.teacherId === user?.id),
    [classes, user?.id],
  );

  // ────────────────────────────────────────────────────────────
  // HANDLERS
  // ────────────────────────────────────────────────────────────

  const handleSaveInfo = async () => {
    if (!courseId) return;
    const ok = await updateELCourse(courseId, {
      title: title.trim(),
      description: description.trim(),
      subject: subject.trim(),
      assignedClassIds,
      deadline: deadline || undefined,
      xpReward,
      isPublished,
    });
    if (ok) toast.success('Đã lưu thông tin khóa học');
    else toast.error('Lưu thất bại, vui lòng thử lại');
  };

  const handleDeleteCourse = async () => {
    if (!courseId) return;
    const ok = await deleteELCourse(courseId);
    if (ok) {
      toast.success('Đã xóa khóa học');
      navigate('/elearning');
    } else {
      toast.error('Không thể xóa khóa học');
    }
  };

  const handleAddChapter = async () => {
    if (!courseId || !newChapterTitle.trim()) return;
    const ch = await addELChapter({
      courseId,
      title: newChapterTitle.trim(),
      isHidden: false,
      orderIndex: courseChapters.length,
    });
    if (ch) {
      toast.success('Đã thêm chương mới');
      setNewChapterTitle('');
      setAddingChapter(false);
    } else toast.error('Thêm chương thất bại');
  };

  const handleRenameChapter = async (id: string) => {
    if (!renameChapterTitle.trim()) return;
    const ok = await updateELChapter(id, { title: renameChapterTitle.trim() });
    if (ok) {
      toast.success('Đã đổi tên chương');
      setRenamingChapterId(null);
    } else toast.error('Đổi tên thất bại');
  };

  const handleDeleteChapter = async (id: string) => {
    if (!confirm('Xóa chương này? Tất cả bài học bên trong cũng sẽ bị xóa.')) return;
    const ok = await deleteELChapter(id);
    if (ok) toast.success('Đã xóa chương');
    else toast.error('Xóa chương thất bại');
  };

  const handleToggleChapterHidden = async (id: string, isHidden: boolean) => {
    await updateELChapter(id, { isHidden: !isHidden });
  };

  const handleAddLesson = async (chapterId: string) => {
    if (!courseId || !newLessonTitle.trim()) return;
    const chapterLessons = lessonsByChapter[chapterId] || [];
    const lesson = await addELLesson({
      chapterId,
      courseId,
      title: newLessonTitle.trim(),
      content: '',
      driveUrl: '',
      videoUrl: '',
      videoDuration: 0,
      minStudyTime: 60,
      requiresPrevious: true,
      isHidden: false,
      quizId: undefined,
      videoQuestions: [],
      xpReward: 10,
      orderIndex: chapterLessons.length,
    });
    if (lesson) {
      toast.success('Đã thêm bài học');
      setNewLessonTitle('');
      setAddingLessonChapterId(null);
    } else toast.error('Thêm bài học thất bại');
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm('Xóa bài học này?')) return;
    const ok = await deleteELLesson(id);
    if (ok) toast.success('Đã xóa bài học');
    else toast.error('Xóa bài học thất bại');
  };

  const handleToggleLessonHidden = async (id: string, isHidden: boolean) => {
    await updateELLesson(id, { isHidden: !isHidden });
  };

  // ── Lesson modal ──────────────────────────────────────────────
  const openLessonModal = (lesson: ELLesson) => {
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title,
      content: lesson.content || '',
      driveUrl: lesson.driveUrl || '',
      videoUrl: lesson.videoUrl || '',
      videoDuration: lesson.videoDuration,
      minStudyTime: lesson.minStudyTime,
      requiresPrevious: lesson.requiresPrevious,
      quizId: lesson.quizId || '',
      xpReward: lesson.xpReward,
    });
    setVideoQuestions(lesson.videoQuestions?.map(q => ({ ...q })) || []);
  };

  const handleSaveLesson = async () => {
    if (!editingLesson) return;
    const ok = await updateELLesson(editingLesson.id, {
      ...lessonForm,
      quizId: lessonForm.quizId || undefined,
      videoQuestions,
    });
    if (ok) {
      toast.success('Đã cập nhật bài học');
      setEditingLesson(null);
    } else toast.error('Cập nhật thất bại');
  };

  const addVideoQuestion = () => {
    setVideoQuestions(prev => [
      ...prev,
      {
        id: `vq-${Date.now()}`,
        timestamp: 0,
        question: '',
        options: ['', '', '', ''],
        correctIndex: 0,
      },
    ]);
  };

  const updateVideoQuestion = (idx: number, field: string, value: any) => {
    setVideoQuestions(prev =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)),
    );
  };

  const updateVideoQuestionOption = (qIdx: number, optIdx: number, value: string) => {
    setVideoQuestions(prev =>
      prev.map((q, i) =>
        i === qIdx
          ? { ...q, options: q.options.map((o, j) => (j === optIdx ? value : o)) }
          : q,
      ),
    );
  };

  const removeVideoQuestion = (idx: number) => {
    setVideoQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleCollapse = (chapterId: string) => {
    setCollapsedChapters(prev => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  };

  // ────────────────────────────────────────────────────────────
  // LOADING / NOT FOUND
  // ────────────────────────────────────────────────────────────

  if (elLoading && !course) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <p className="text-gray-500 dark:text-gray-400 text-lg">Không tìm thấy khóa học.</p>
        <button
          onClick={() => navigate('/elearning')}
          className="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Quay lại
        </button>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────

  const tabs: { key: 'info' | 'curriculum' | 'reports'; label: string; icon: React.ReactNode }[] = [
    { key: 'info', label: 'Thông tin chung', icon: <Settings className="w-4 h-4" /> },
    { key: 'curriculum', label: 'Cấu trúc bài học', icon: <BookOpen className="w-4 h-4" /> },
    { key: 'reports', label: 'Báo cáo', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/elearning')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800
                     text-gray-600 dark:text-gray-300 transition-colors"
          aria-label="Quay lại"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50 truncate">
          QUẢN LÝ: {course.title}
        </h1>
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <nav className="flex gap-1 bg-gray-100 dark:bg-gray-800/60 p-1 rounded-xl" role="tablist">
        {tabs.map(t => (
          <button
            key={t.key}
            role="tab"
            aria-selected={activeTab === t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg
              text-sm font-medium transition-all duration-200
              ${activeTab === t.key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>

      {/* ═══════════════════════════════════════════════════════
          TAB 1 – Thông tin chung
          ═══════════════════════════════════════════════════════ */}
      {activeTab === 'info' && (
        <section className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/60 p-6 space-y-5">
          {/* Title */}
          <Field label="Tên khóa học">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={inputCls}
              placeholder="Nhập tên khóa học…"
            />
          </Field>

          {/* Description */}
          <Field label="Mô tả">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className={inputCls + ' resize-y'}
              placeholder="Mô tả nội dung khóa học…"
            />
          </Field>

          {/* Subject */}
          <Field label="Môn học">
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className={inputCls}
              placeholder="Ví dụ: Toán, Lý, Hóa…"
            />
          </Field>

          {/* Assigned Classes */}
          <Field label="Lớp được phân công">
            {teacherClasses.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                Bạn chưa quản lý lớp nào.
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {teacherClasses.map(c => {
                  const checked = assignedClassIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer
                        transition-colors text-sm
                        ${checked
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-500/70 text-blue-700 dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() =>
                          setAssignedClassIds(prev =>
                            checked ? prev.filter(id => id !== c.id) : [...prev, c.id],
                          )
                        }
                      />
                      <span className={`w-4 h-4 rounded flex items-center justify-center border
                        ${checked
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'border-gray-300 dark:border-gray-500'
                        }`}>
                        {checked && <Check className="w-3 h-3" />}
                      </span>
                      {c.name}
                    </label>
                  );
                })}
              </div>
            )}
          </Field>

          {/* Deadline */}
          <Field label="Hạn chót">
            <input
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className={inputCls + ' max-w-xs'}
            />
          </Field>

          {/* XP */}
          <Field label="Phần thưởng XP">
            <input
              type="number"
              min={0}
              value={xpReward}
              onChange={e => setXpReward(Number(e.target.value))}
              className={inputCls + ' max-w-[160px]'}
            />
          </Field>

          {/* Published */}
          <Field label="Trạng thái">
            <div className="flex gap-4">
              {([
                { value: true, label: 'Xuất bản' },
                { value: false, label: 'Nháp' },
              ] as const).map(opt => (
                <label key={String(opt.value)} className="inline-flex items-center gap-2 cursor-pointer">
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
                    ${isPublished === opt.value
                      ? 'border-blue-500'
                      : 'border-gray-300 dark:border-gray-500'
                    }`}>
                    {isPublished === opt.value && (
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </span>
                  <input
                    type="radio"
                    className="sr-only"
                    name="publishStatus"
                    checked={isPublished === opt.value}
                    onChange={() => setIsPublished(opt.value)}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
                </label>
              ))}
            </div>
          </Field>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700/50">
            <button
              onClick={handleSaveInfo}
              disabled={elLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm
                transition-colors disabled:opacity-50"
            >
              {elLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Lưu thông tin
            </button>

            {!confirmDeleteCourse ? (
              <button
                onClick={() => setConfirmDeleteCourse(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                  text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20
                  text-sm font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Xóa khóa học
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600 dark:text-red-400">Xác nhận?</span>
                <button
                  onClick={handleDeleteCourse}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
                >
                  Xóa
                </button>
                <button
                  onClick={() => setConfirmDeleteCourse(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600
                    text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Hủy
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 2 – Cấu trúc bài học
          ═══════════════════════════════════════════════════════ */}
      {activeTab === 'curriculum' && (
        <section className="space-y-4">
          {courseChapters.length === 0 && !addingChapter && (
            <div className="text-center py-16 bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/60">
              <BookOpen className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Chưa có chương nào. Hãy bắt đầu bằng cách thêm chương đầu tiên.</p>
            </div>
          )}

          {courseChapters.map((ch, chIdx) => {
            const lessons = lessonsByChapter[ch.id] || [];
            const isCollapsed = collapsedChapters.has(ch.id);

            return (
              <div
                key={ch.id}
                className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/60 overflow-hidden"
              >
                {/* ── Chapter header ────────────────────────── */}
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800/80">
                  <button
                    onClick={() => toggleCollapse(ch.id)}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 transition-colors"
                    aria-label={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
                  >
                    {isCollapsed
                      ? <ChevronRight className="w-4 h-4" />
                      : <ChevronDown className="w-4 h-4" />
                    }
                  </button>

                  <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />

                  {renamingChapterId === ch.id ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <input
                        type="text"
                        value={renameChapterTitle}
                        onChange={e => setRenameChapterTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleRenameChapter(ch.id); if (e.key === 'Escape') setRenamingChapterId(null); }}
                        className={inputCls + ' flex-1'}
                        autoFocus
                      />
                      <button onClick={() => handleRenameChapter(ch.id)} className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setRenamingChapterId(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="flex-1 font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">
                      Chương {chIdx + 1}: {ch.title}
                    </span>
                  )}

                  <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums flex-shrink-0">
                    {lessons.length} bài
                  </span>

                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => handleToggleChapterHidden(ch.id, ch.isHidden)}
                      className={`p-1.5 rounded-lg transition-colors ${ch.isHidden ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                      title={ch.isHidden ? 'Đang ẩn — nhấn để hiện' : 'Đang hiện — nhấn để ẩn'}
                    >
                      {ch.isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {renamingChapterId !== ch.id && (
                      <button
                        onClick={() => { setRenamingChapterId(ch.id); setRenameChapterTitle(ch.title); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title="Đổi tên"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteChapter(ch.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Xóa chương"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* ── Lessons list ──────────────────────────── */}
                {!isCollapsed && (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700/40">
                    {lessons.map(lesson => (
                      <div
                        key={lesson.id}
                        className="flex items-center gap-3 px-4 py-2.5 pl-12 hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors group"
                      >
                        {lesson.videoUrl
                          ? <Video className="w-4 h-4 text-purple-400 flex-shrink-0" />
                          : <FileText className="w-4 h-4 text-teal-400 flex-shrink-0" />
                        }

                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                          {lesson.title}
                        </span>

                        {lesson.requiresPrevious && (
                          <span title="Yêu cầu hoàn thành bài trước" className="flex items-center flex-shrink-0">
                            <Lock className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                          </span>
                        )}

                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button
                            onClick={() => handleToggleLessonHidden(lesson.id, lesson.isHidden)}
                            className={`p-1 rounded transition-colors ${lesson.isHidden ? 'text-amber-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                            title={lesson.isHidden ? 'Đang ẩn' : 'Đang hiện'}
                          >
                            {lesson.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => openLessonModal(lesson)}
                            className="p-1 rounded text-gray-400 hover:text-blue-500 transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteLesson(lesson.id)}
                            className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {lessons.length === 0 && (
                      <p className="px-12 py-4 text-sm text-gray-400 dark:text-gray-500 italic">
                        Chưa có bài học trong chương này.
                      </p>
                    )}

                    {/* Add lesson inline */}
                    {addingLessonChapterId === ch.id ? (
                      <div className="flex items-center gap-2 px-4 py-3 pl-12 bg-blue-50/50 dark:bg-blue-900/10">
                        <input
                          type="text"
                          value={newLessonTitle}
                          onChange={e => setNewLessonTitle(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddLesson(ch.id); if (e.key === 'Escape') setAddingLessonChapterId(null); }}
                          placeholder="Tên bài học mới…"
                          className={inputCls + ' flex-1'}
                          autoFocus
                        />
                        <button
                          onClick={() => handleAddLesson(ch.id)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                          Thêm
                        </button>
                        <button
                          onClick={() => { setAddingLessonChapterId(null); setNewLessonTitle(''); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAddingLessonChapterId(ch.id); setNewLessonTitle(''); }}
                        className="flex items-center gap-2 w-full px-4 py-2.5 pl-12 text-sm text-blue-600 dark:text-blue-400
                          hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Thêm Bài học
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Add chapter ────────────────────────────────── */}
          {addingChapter ? (
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800/50 p-4 rounded-2xl border border-dashed border-blue-300 dark:border-blue-600">
              <input
                type="text"
                value={newChapterTitle}
                onChange={e => setNewChapterTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddChapter(); if (e.key === 'Escape') setAddingChapter(false); }}
                placeholder="Tên chương mới…"
                className={inputCls + ' flex-1'}
                autoFocus
              />
              <button
                onClick={handleAddChapter}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Thêm
              </button>
              <button
                onClick={() => { setAddingChapter(false); setNewChapterTitle(''); }}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingChapter(true)}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-dashed
                border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400
                hover:border-blue-400 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400
                text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Thêm Chương
            </button>
          )}
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          LESSON EDIT MODAL
          ═══════════════════════════════════════════════════════ */}
      {editingLesson && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setEditingLesson(null)}
          />

          {/* panel */}
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto
            bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">

            {/* modal header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4
              bg-white/95 dark:bg-gray-800/95 backdrop-blur border-b border-gray-100 dark:border-gray-700/60 rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">Chỉnh sửa bài học</h2>
              <button
                onClick={() => setEditingLesson(null)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Title */}
              <Field label="Tên bài học">
                <input
                  type="text"
                  value={lessonForm.title || ''}
                  onChange={e => setLessonForm(p => ({ ...p, title: e.target.value }))}
                  className={inputCls}
                />
              </Field>

              {/* Content */}
              <Field label="Nội dung bài giảng (Markdown)">
                <textarea
                  value={lessonForm.content || ''}
                  onChange={e => setLessonForm(p => ({ ...p, content: e.target.value }))}
                  rows={6}
                  className={inputCls + ' resize-y font-mono text-sm'}
                />
              </Field>

              {/* Drive URL */}
              <Field label="Google Drive URL" helper="Dán link Google Drive">
                <input
                  type="text"
                  value={lessonForm.driveUrl || ''}
                  onChange={e => setLessonForm(p => ({ ...p, driveUrl: e.target.value }))}
                  className={inputCls}
                  placeholder="https://drive.google.com/..."
                />
              </Field>

              {/* Video URL */}
              <Field label="Video URL" helper="Dán link YouTube hoặc Google Drive video">
                <input
                  type="text"
                  value={lessonForm.videoUrl || ''}
                  onChange={e => setLessonForm(p => ({ ...p, videoUrl: e.target.value }))}
                  className={inputCls}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </Field>

              {/* Two-col numeric fields */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Thời lượng video (giây)">
                  <input
                    type="number"
                    min={0}
                    value={lessonForm.videoDuration ?? 0}
                    onChange={e => setLessonForm(p => ({ ...p, videoDuration: Number(e.target.value) }))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Thời gian đọc tối thiểu (giây)">
                  <input
                    type="number"
                    min={0}
                    value={lessonForm.minStudyTime ?? 60}
                    onChange={e => setLessonForm(p => ({ ...p, minStudyTime: Number(e.target.value) }))}
                    className={inputCls}
                  />
                </Field>
              </div>

              {/* Requires previous */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <span className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors
                  ${lessonForm.requiresPrevious
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 dark:border-gray-500 group-hover:border-blue-400'
                  }`}>
                  {lessonForm.requiresPrevious && <Check className="w-3.5 h-3.5" />}
                </span>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={!!lessonForm.requiresPrevious}
                  onChange={e => setLessonForm(p => ({ ...p, requiresPrevious: e.target.checked }))}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Yêu cầu hoàn thành bài trước</span>
              </label>

              {/* Quiz link */}
              <Field label="Liên kết bài kiểm tra">
                <select
                  value={lessonForm.quizId || ''}
                  onChange={e => setLessonForm(p => ({ ...p, quizId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Không liên kết</option>
                  {exams.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.title}</option>
                  ))}
                </select>
              </Field>

              {/* XP */}
              <Field label="Phần thưởng XP">
                <input
                  type="number"
                  min={0}
                  value={lessonForm.xpReward ?? 10}
                  onChange={e => setLessonForm(p => ({ ...p, xpReward: Number(e.target.value) }))}
                  className={inputCls + ' max-w-[160px]'}
                />
              </Field>

              {/* ── AI Trợ lý ──────────────────────────────── */}
              <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700/40">
                <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> AI Trợ lý
                </h3>

                {/* AI: Generate lesson content */}
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Dán tài liệu thô (copy từ sách/PDF) để AI soạn bài giảng Markdown:
                  </p>
                  <textarea
                    value={aiRawInput}
                    onChange={e => setAiRawInput(e.target.value)}
                    placeholder="Dán nội dung tài liệu thô vào đây..."
                    rows={4}
                    className={inputCls + ' resize-y'}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!aiRawInput.trim() || aiLoading !== null}
                      onClick={async () => {
                        setAiLoading('lesson');
                        try {
                          const md = await generateLessonContent(
                            aiRawInput,
                            course?.subject,
                            undefined,
                          );
                          setLessonForm(p => ({ ...p, content: md }));
                          toast.success('Đã soạn bài giảng bằng AI!');
                          setAiRawInput('');
                        } catch (err: any) {
                          toast.error(err.message || 'Lỗi AI. Thử lại sau.');
                        } finally {
                          setAiLoading(null);
                        }
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                        bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400
                        hover:bg-indigo-100 dark:hover:bg-indigo-900/50
                        disabled:opacity-50 transition-colors"
                    >
                      {aiLoading === 'lesson' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Soạn bài giảng
                    </button>

                    <button
                      type="button"
                      disabled={!(lessonForm.content || '').trim() || aiLoading !== null || !lessonForm.videoDuration}
                      onClick={async () => {
                        setAiLoading('video');
                        try {
                          const result = await generateVideoQuestions(
                            lessonForm.content || '',
                            lessonForm.videoDuration || 300,
                            3,
                          );
                          const newVQs: ELVideoQuestion[] = result.map(q => ({
                            id: crypto.randomUUID(),
                            timestamp: q.timestamp,
                            question: q.question,
                            options: q.options,
                            correctIndex: q.correctIndex,
                          }));
                          setVideoQuestions(prev => [...prev, ...newVQs]);
                          toast.success(`Đã tạo ${newVQs.length} câu hỏi video bằng AI!`);
                        } catch (err: any) {
                          toast.error(err.message || 'Lỗi AI. Thử lại sau.');
                        } finally {
                          setAiLoading(null);
                        }
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                        bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400
                        hover:bg-violet-100 dark:hover:bg-violet-900/50
                        disabled:opacity-50 transition-colors"
                    >
                      {aiLoading === 'video' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                      Tạo câu hỏi video
                    </button>
                  </div>
                  {aiLoading && (
                    <p className="text-xs text-indigo-500 dark:text-indigo-400 flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {aiLoading === 'lesson' ? 'Đang soạn bài giảng...' : 'Đang tạo câu hỏi video...'}
                    </p>
                  )}
                </div>
              </div>

              {/* ── Video Questions Editor ────────────────── */}
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Câu hỏi trong video ({videoQuestions.length})
                </h3>

                {videoQuestions.map((vq, qIdx) => (
                  <div
                    key={vq.id}
                    className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/40 space-y-3 border border-gray-100 dark:border-gray-600/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">
                        #{qIdx + 1}
                      </span>
                      <button
                        onClick={() => removeVideoQuestion(qIdx)}
                        className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
                        title="Xóa câu hỏi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 items-center">
                      <label className="text-xs text-gray-500 dark:text-gray-400 text-right">Giây</label>
                      <input
                        type="number"
                        min={0}
                        value={vq.timestamp}
                        onChange={e => updateVideoQuestion(qIdx, 'timestamp', Number(e.target.value))}
                        className={inputCls + ' max-w-[120px]'}
                      />

                      <label className="text-xs text-gray-500 dark:text-gray-400 text-right">Câu hỏi</label>
                      <input
                        type="text"
                        value={vq.question}
                        onChange={e => updateVideoQuestion(qIdx, 'question', e.target.value)}
                        className={inputCls}
                        placeholder="Nội dung câu hỏi…"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {['A', 'B', 'C', 'D'].map((letter, optIdx) => (
                        <div key={letter} className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-400 w-4">{letter}</span>
                          <input
                            type="text"
                            value={vq.options[optIdx] || ''}
                            onChange={e => updateVideoQuestionOption(qIdx, optIdx, e.target.value)}
                            placeholder={`Đáp án ${letter}`}
                            className={inputCls + ' flex-1'}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Đáp án đúng:</label>
                      <select
                        value={vq.correctIndex}
                        onChange={e => updateVideoQuestion(qIdx, 'correctIndex', Number(e.target.value))}
                        className={inputCls + ' max-w-[80px]'}
                      >
                        {['A', 'B', 'C', 'D'].map((letter, i) => (
                          <option key={letter} value={i}>{letter}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addVideoQuestion}
                  className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400
                    hover:text-blue-700 dark:hover:text-blue-300 transition-colors font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Thêm câu hỏi
                </button>
              </div>
            </div>

            {/* modal footer */}
            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 px-6 py-4
              bg-white/95 dark:bg-gray-800/95 backdrop-blur border-t border-gray-100 dark:border-gray-700/60 rounded-b-2xl">
              <button
                onClick={() => setEditingLesson(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600
                  text-gray-600 dark:text-gray-300 text-sm font-medium
                  hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveLesson}
                disabled={elLoading}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl
                  bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium
                  transition-colors disabled:opacity-50"
              >
                {elLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu bài học
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 3 – Báo cáo & Thống kê
          ═══════════════════════════════════════════════════════ */}
      {activeTab === 'reports' && course && (
        <ReportsTab
          courseId={courseId!}
          course={course}
          lessons={Object.values(lessonsByChapter).flat()}
          progress={elStudentProgress.filter(p => p.courseId === courseId)}
          history={elStudyHistory}
          users={users}
          classes={classes}
        />
      )}
    </div>
  );
};

/* ================================================================
   TAB 3 — BÁO CÁO & THỐNG KÊ (extracted component for clarity)
   ================================================================ */

function ReportsTab({
  courseId,
  course,
  lessons,
  progress,
  history,
  users,
  classes: teacherClasses,
}: {
  courseId: string;
  course: { title: string; assignedClassIds: string[] };
  lessons: ELLesson[];
  progress: ELStudentProgress[];
  history: ELStudyHistory[];
  users: { id: string; name: string; className?: string }[];
  classes: { id: string; name: string }[];
}) {
  const [filterClassId, setFilterClassId] = useState<string>('all');

  // Filter progress by selected class
  const filteredProgress = useMemo(() => {
    if (filterClassId === 'all') return progress;
    const classStudentIds = new Set(
      users.filter(u => (u as any).classId === filterClassId || (u as any).class_id === filterClassId).map(u => u.id)
    );
    return progress.filter(p => classStudentIds.has(p.studentId));
  }, [progress, filterClassId, users]);

  const visibleLessons = lessons.filter(l => !l.isHidden);
  const totalStudents = filteredProgress.length;
  const completedStudents = filteredProgress.filter(p => !!p.completedAt).length;
  const completionRate = totalStudents > 0 ? Math.round((completedStudents / totalStudents) * 100) : 0;
  const avgStudyTime = totalStudents > 0 ? Math.round(filteredProgress.reduce((s, p) => s + p.totalStudyTime, 0) / totalStudents) : 0;

  // Quiz score stats
  const quizScores = useMemo(() => {
    const scores: number[] = [];
    for (const p of filteredProgress) {
      for (const val of Object.values(p.bestQuizScores)) {
        if (typeof val === 'number') scores.push(val);
      }
    }
    return scores;
  }, [filteredProgress]);
  const avgQuizScore = quizScores.length > 0 ? Math.round(quizScores.reduce((s, v) => s + v, 0) / quizScores.length) : 0;

  // Per-lesson completion rate
  const lessonCompletionRates = useMemo(() => {
    return visibleLessons.map(lesson => {
      const count = filteredProgress.filter(p => p.completedLessons.includes(lesson.id)).length;
      return {
        lessonId: lesson.id,
        title: lesson.title,
        count,
        pct: totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0,
      };
    });
  }, [visibleLessons, filteredProgress, totalStudents]);

  // Score distribution
  const scoreDistribution = useMemo(() => {
    const buckets = { excellent: 0, good: 0, pass: 0, fail: 0 };
    for (const score of quizScores) {
      if (score >= 90) buckets.excellent++;
      else if (score >= 70) buckets.good++;
      else if (score >= 50) buckets.pass++;
      else buckets.fail++;
    }
    return buckets;
  }, [quizScores]);

  // Student detail rows
  const studentRows = useMemo(() => {
    return filteredProgress.map(p => {
      const student = users.find(u => u.id === p.studentId);
      const completedCount = p.completedLessons.length;
      const quizAvg = Object.values(p.bestQuizScores).length > 0
        ? Math.round(Object.values(p.bestQuizScores).reduce((s, v) => s + (v as number), 0) / Object.values(p.bestQuizScores).length)
        : null;
      return {
        studentId: p.studentId,
        name: student?.name || 'Học sinh',
        className: student?.className || (student as any)?.class_name || '',
        completedCount,
        totalLessons: visibleLessons.length,
        pct: visibleLessons.length > 0 ? Math.round((completedCount / visibleLessons.length) * 100) : 0,
        studyTime: p.totalStudyTime,
        quizAvg,
        completed: !!p.completedAt,
      };
    }).sort((a, b) => b.pct - a.pct || b.studyTime - a.studyTime);
  }, [filteredProgress, users, visibleLessons]);

  // Alerts
  const alerts = useMemo(() => {
    const result: { name: string; message: string }[] = [];
    for (const row of studentRows) {
      if (row.quizAvg !== null && row.quizAvg < 50) {
        result.push({ name: row.name, message: `ĐTB Quiz thấp (${row.quizAvg}đ)` });
      }
      if (row.completedCount === 0 && row.studyTime < 60) {
        result.push({ name: row.name, message: 'Chưa học bài nào' });
      }
    }
    return result.slice(0, 5);
  }, [studentRows]);

  // Format time
  const fmt = (s: number) => {
    if (s < 60) return `${s}s`;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h${m > 0 ? ` ${m}p` : ''}` : `${m}p`;
  };

  // Export Excel
  const handleExportExcel = () => {
    const wsData = [
      ['Học sinh', 'Lớp', 'Bài hoàn thành', 'Tổng bài', 'Tiến độ %', 'Thời gian học (s)', 'ĐTB Quiz', 'Trạng thái'],
      ...studentRows.map(r => [
        r.name, r.className, r.completedCount, r.totalLessons, r.pct,
        r.studyTime, r.quizAvg ?? '', r.completed ? 'Hoàn thành' : 'Đang học',
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo');
    XLSX.writeFile(wb, `Baocao_${course.title.substring(0, 30)}.xlsx`);
    toast.success('Đã xuất file Excel!');
  };

  // Export PDF
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Báo cáo: ${course.title}`, 14, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Sĩ số: ${totalStudents} | Tỉ lệ HT: ${completionRate}% | DTB Quiz: ${avgQuizScore}`, 14, 28);

    let y = 38;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    ['STT', 'Học sinh', 'Lớp', 'Tiến độ', 'TG học', 'Quiz', 'Trạng thái'].forEach((h, i) => {
      doc.text(h, 14 + i * 38, y);
    });
    y += 6;
    doc.setFont('helvetica', 'normal');
    for (const [idx, r] of studentRows.entries()) {
      if (y > 190) { doc.addPage(); y = 20; }
      const row = [
        String(idx + 1), r.name.substring(0, 18), r.className.substring(0, 8),
        `${r.pct}%`, fmt(r.studyTime), r.quizAvg !== null ? String(r.quizAvg) : '-',
        r.completed ? 'HT' : 'ĐH',
      ];
      row.forEach((cell, i) => doc.text(cell, 14 + i * 38, y));
      y += 5;
    }
    doc.save(`Baocao_${course.title.substring(0, 30)}.pdf`);
    toast.success('Đã xuất file PDF!');
  };

  const assignedClasses = teacherClasses.filter(c => course.assignedClassIds.includes(c.id));

  return (
    <section className="space-y-6">
      {/* Filter + Export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Lọc lớp:</label>
          <select
            value={filterClassId}
            onChange={e => setFilterClassId(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600
              bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-100"
          >
            <option value="all">Tất cả ({totalStudents})</option>
            {assignedClasses.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
              bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400
              hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
          >
            <Download className="w-4 h-4" /> Excel
          </button>
          <button onClick={handleExportPDF}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
              bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400
              hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
          >
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Sĩ số tham gia', value: `${totalStudents}`, accent: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
          { label: 'Tỉ lệ hoàn thành', value: `${completionRate}%`, accent: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
          { label: 'ĐTB Quiz', value: `${avgQuizScore}`, accent: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' },
          { label: 'TG học TB', value: fmt(avgStudyTime), accent: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
        ].map((stat, i) => (
          <div key={i} className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
            <p className={`text-2xl font-bold tabular-nums ${stat.accent}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Per-lesson progress + Score distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lesson progress bars */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Tiến độ theo bài</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {lessonCompletionRates.map(lr => (
              <div key={lr.lessonId}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 dark:text-gray-300 truncate max-w-[70%]">{lr.title}</span>
                  <span className="text-gray-500 dark:text-gray-400 tabular-nums">{lr.pct}% ({lr.count}/{totalStudents})</span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 transition-all duration-500"
                    style={{ width: `${lr.pct}%` }}
                  />
                </div>
              </div>
            ))}
            {lessonCompletionRates.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Chưa có bài học</p>
            )}
          </div>
        </div>

        {/* Score distribution + Alerts */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Phân bố điểm Quiz</h3>
            <div className="space-y-2">
              {[
                { label: 'Giỏi (90-100)', count: scoreDistribution.excellent, color: 'bg-emerald-500' },
                { label: 'Khá (70-89)', count: scoreDistribution.good, color: 'bg-blue-500' },
                { label: 'Đạt (50-69)', count: scoreDistribution.pass, color: 'bg-amber-500' },
                { label: 'Chưa đạt (<50)', count: scoreDistribution.fail, color: 'bg-red-500' },
              ].map(b => {
                const total = quizScores.length || 1;
                const pct = Math.round((b.count / total) * 100);
                return (
                  <div key={b.label} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 dark:text-gray-300 w-28">{b.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                      <div className={`h-2 rounded-full ${b.color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 tabular-nums w-16 text-right">{b.count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>

          {alerts.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800/60 p-5">
              <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Cảnh báo
              </h3>
              <ul className="space-y-1.5">
                {alerts.map((a, i) => (
                  <li key={i} className="text-xs text-gray-600 dark:text-gray-300">
                    <span className="font-semibold">{a.name}:</span> {a.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Student detail table */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Nhật ký chi tiết ({studentRows.length} HS)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                <th className="px-5 py-3">STT</th>
                <th className="px-5 py-3">Học sinh</th>
                <th className="px-5 py-3">Tiến độ</th>
                <th className="px-5 py-3">TG học</th>
                <th className="px-5 py-3">Quiz</th>
                <th className="px-5 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {studentRows.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Chưa có học sinh tham gia</td></tr>
              ) : (
                studentRows.map((r, idx) => (
                  <tr key={r.studentId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3 tabular-nums text-gray-500">{idx + 1}</td>
                    <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-100">{r.name}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
                          <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${r.pct}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-gray-500">{r.pct}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 tabular-nums text-gray-600 dark:text-gray-300">{fmt(r.studyTime)}</td>
                    <td className="px-5 py-3 tabular-nums">
                      {r.quizAvg !== null ? (
                        <span className={r.quizAvg >= 70 ? 'text-emerald-600 dark:text-emerald-400' : r.quizAvg >= 50 ? 'text-amber-600' : 'text-red-500'}>
                          {r.quizAvg}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {r.completed ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3.5 h-3.5" /> Hoàn thành
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Đang học</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   SHARED UI HELPERS
   ================================================================ */

const inputCls = `w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600
  bg-white dark:bg-gray-700/50 text-sm text-gray-900 dark:text-gray-100
  placeholder:text-gray-400 dark:placeholder:text-gray-500
  focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500
  transition-colors`;

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {helper && (
        <p className="text-xs text-gray-400 dark:text-gray-500">{helper}</p>
      )}
      {children}
    </div>
  );
}

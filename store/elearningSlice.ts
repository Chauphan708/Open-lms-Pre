import { StateCreator } from 'zustand';
import { AppState, ELCourse, ELChapter, ELLesson, ELStudentProgress, ELStudyHistory, ELLessonComment } from '../types';
import { supabase } from '../services/supabaseClient';

export type ELearningSliceState = Pick<AppState,
  | 'elCourses' | 'elChapters' | 'elLessons' | 'elStudentProgress' | 'elStudyHistory' | 'elLessonComments' | 'elLoading'
  | 'fetchELCourses' | 'fetchELCourseDetail'
  | 'addELCourse' | 'updateELCourse' | 'deleteELCourse'
  | 'addELChapter' | 'updateELChapter' | 'deleteELChapter'
  | 'addELLesson' | 'updateELLesson' | 'deleteELLesson'
  | 'enrollCourse' | 'markLessonComplete' | 'logStudyActivity' | 'fetchELStudentProgress' | 'fetchELStudyHistory'
  | 'fetchELComments' | 'addELComment' | 'deleteELComment'
>;

// =====================================================
// MAPPING HELPERS (snake_case DB → camelCase App)
// =====================================================
const mapCourse = (c: any): ELCourse => ({
  id: String(c.id),
  title: c.title,
  description: c.description || '',
  subject: c.subject || '',
  coverImage: c.cover_image || c.coverImage || '',
  createdBy: String(c.created_by || c.createdBy),
  assignedClassIds: Array.isArray(c.assigned_class_ids || c.assignedClassIds) ? (c.assigned_class_ids || c.assignedClassIds) : [],
  isPublished: !!c.is_published,
  deadline: c.deadline || undefined,
  xpReward: Number(c.xp_reward || c.xpReward || 50),
  orderIndex: Number(c.order_index || c.orderIndex || 0),
  createdAt: c.created_at || c.createdAt || new Date().toISOString(),
  updatedAt: c.updated_at || c.updatedAt || new Date().toISOString(),
});

const mapChapter = (ch: any): ELChapter => ({
  id: String(ch.id),
  courseId: String(ch.course_id || ch.courseId),
  title: ch.title,
  isHidden: !!ch.is_hidden,
  orderIndex: Number(ch.order_index || ch.orderIndex || 0),
  createdAt: ch.created_at || ch.createdAt || new Date().toISOString(),
});

const mapLesson = (l: any): ELLesson => ({
  id: String(l.id),
  chapterId: String(l.chapter_id || l.chapterId),
  courseId: String(l.course_id || l.courseId),
  title: l.title,
  content: l.content || '',
  driveUrl: l.drive_url || l.driveUrl || '',
  videoUrl: l.video_url || l.videoUrl || '',
  videoDuration: Number(l.video_duration || l.videoDuration || 0),
  minStudyTime: Number(l.min_study_time || l.minStudyTime || 60),
  requiresPrevious: l.requires_previous !== undefined ? !!l.requires_previous : true,
  isHidden: !!l.is_hidden,
  quizId: l.quiz_id || l.quizId || undefined,
  videoQuestions: Array.isArray(l.video_questions || l.videoQuestions) ? (l.video_questions || l.videoQuestions) : [],
  xpReward: Number(l.xp_reward || l.xpReward || 10),
  orderIndex: Number(l.order_index || l.orderIndex || 0),
  createdAt: l.created_at || l.createdAt || new Date().toISOString(),
  updatedAt: l.updated_at || l.updatedAt || new Date().toISOString(),
});

const mapProgress = (p: any): ELStudentProgress => ({
  id: String(p.id),
  studentId: String(p.student_id || p.studentId),
  courseId: String(p.course_id || p.courseId),
  completedLessons: Array.isArray(p.completed_lessons || p.completedLessons) ? (p.completed_lessons || p.completedLessons) : [],
  currentLessonId: p.current_lesson_id || p.currentLessonId || undefined,
  totalStudyTime: Number(p.total_study_time || p.totalStudyTime || 0),
  bestQuizScores: (p.best_quiz_scores || p.bestQuizScores || {}) as Record<string, number>,
  enrolledAt: p.enrolled_at || p.enrolledAt || new Date().toISOString(),
  completedAt: p.completed_at || p.completedAt || undefined,
});

const mapHistory = (h: any): ELStudyHistory => ({
  id: String(h.id),
  studentId: String(h.student_id || h.studentId),
  courseId: String(h.course_id || h.courseId),
  lessonId: String(h.lesson_id || h.lessonId),
  actionType: h.action_type || h.actionType,
  score: h.score !== null && h.score !== undefined ? Number(h.score) : undefined,
  timeSpent: Number(h.time_spent || h.timeSpent || 0),
  metadata: h.metadata || {},
  createdAt: h.created_at || h.createdAt || new Date().toISOString(),
});

const mapComment = (c: any): ELLessonComment => ({
  id: String(c.id),
  lessonId: String(c.lesson_id || c.lessonId),
  userId: String(c.user_id || c.userId),
  userName: c.user_name || c.userName || 'Ẩn danh',
  content: c.content,
  parentCommentId: c.parent_comment_id || c.parentCommentId || undefined,
  createdAt: c.created_at || c.createdAt || new Date().toISOString(),
});

// =====================================================
// SLICE IMPLEMENTATION
// =====================================================
export const createELearningSlice: StateCreator<AppState, [], [], ELearningSliceState> = (set, get) => ({
  elCourses: [],
  elChapters: [],
  elLessons: [],
  elStudentProgress: [],
  elStudyHistory: [],
  elLessonComments: [],
  elLoading: false,

  // =====================================================
  // COURSES CRUD
  // =====================================================
  fetchELCourses: async () => {
    set({ elLoading: true });
    try {
      const { data, error } = await supabase.from('el_courses').select('*').order('order_index', { ascending: true });
      if (error) { console.error('fetchELCourses error:', error); return; }
      set({ elCourses: (data || []).map(mapCourse) });
    } catch (e) { console.error('fetchELCourses exception:', e); }
    finally { set({ elLoading: false }); }
  },

  fetchELCourseDetail: async (courseId: string) => {
    set({ elLoading: true });
    try {
      const [chaptersRes, lessonsRes] = await Promise.all([
        supabase.from('el_chapters').select('*').eq('course_id', courseId).order('order_index', { ascending: true }),
        supabase.from('el_lessons').select('*').eq('course_id', courseId).order('order_index', { ascending: true }),
      ]);
      if (chaptersRes.data) set({ elChapters: chaptersRes.data.map(mapChapter) });
      if (lessonsRes.data) set({ elLessons: lessonsRes.data.map(mapLesson) });
    } catch (e) { console.error('fetchELCourseDetail error:', e); }
    finally { set({ elLoading: false }); }
  },

  addELCourse: async (course) => {
    const payload = {
      title: course.title,
      description: course.description || '',
      subject: course.subject || '',
      cover_image: course.coverImage || '',
      created_by: course.createdBy,
      assigned_class_ids: course.assignedClassIds || [],
      is_published: course.isPublished ?? false,
      deadline: course.deadline || null,
      xp_reward: course.xpReward ?? 50,
      order_index: course.orderIndex ?? 0,
    };
    const { data, error } = await supabase.from('el_courses').insert(payload).select().single();
    if (error || !data) { console.error('addELCourse error:', error); return null; }
    const mapped = mapCourse(data);
    set(s => ({ elCourses: [...s.elCourses, mapped] }));
    return mapped;
  },

  updateELCourse: async (id, updates) => {
    const payload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.subject !== undefined) payload.subject = updates.subject;
    if (updates.coverImage !== undefined) payload.cover_image = updates.coverImage;
    if (updates.assignedClassIds !== undefined) payload.assigned_class_ids = updates.assignedClassIds;
    if (updates.isPublished !== undefined) payload.is_published = updates.isPublished;
    if (updates.deadline !== undefined) payload.deadline = updates.deadline || null;
    if (updates.xpReward !== undefined) payload.xp_reward = updates.xpReward;
    if (updates.orderIndex !== undefined) payload.order_index = updates.orderIndex;

    const { error } = await supabase.from('el_courses').update(payload).eq('id', id);
    if (error) { console.error('updateELCourse error:', error); return false; }
    set(s => ({ elCourses: s.elCourses.map(c => c.id === id ? { ...c, ...updates, updatedAt: payload.updated_at } : c) }));
    return true;
  },

  deleteELCourse: async (id) => {
    set(s => ({ elCourses: s.elCourses.filter(c => c.id !== id) }));
    const { error } = await supabase.from('el_courses').delete().eq('id', id);
    if (error) { console.error('deleteELCourse error:', error); return false; }
    return true;
  },

  // =====================================================
  // CHAPTERS CRUD
  // =====================================================
  addELChapter: async (chapter) => {
    const payload = {
      course_id: chapter.courseId,
      title: chapter.title,
      is_hidden: chapter.isHidden ?? false,
      order_index: chapter.orderIndex ?? 0,
    };
    const { data, error } = await supabase.from('el_chapters').insert(payload).select().single();
    if (error || !data) { console.error('addELChapter error:', error); return null; }
    const mapped = mapChapter(data);
    set(s => ({ elChapters: [...s.elChapters, mapped] }));
    return mapped;
  },

  updateELChapter: async (id, updates) => {
    const payload: Record<string, any> = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.isHidden !== undefined) payload.is_hidden = updates.isHidden;
    if (updates.orderIndex !== undefined) payload.order_index = updates.orderIndex;

    const { error } = await supabase.from('el_chapters').update(payload).eq('id', id);
    if (error) { console.error('updateELChapter error:', error); return false; }
    set(s => ({ elChapters: s.elChapters.map(ch => ch.id === id ? { ...ch, ...updates } : ch) }));
    return true;
  },

  deleteELChapter: async (id) => {
    set(s => ({ elChapters: s.elChapters.filter(ch => ch.id !== id) }));
    const { error } = await supabase.from('el_chapters').delete().eq('id', id);
    if (error) { console.error('deleteELChapter error:', error); return false; }
    return true;
  },

  // =====================================================
  // LESSONS CRUD
  // =====================================================
  addELLesson: async (lesson) => {
    const payload = {
      chapter_id: lesson.chapterId,
      course_id: lesson.courseId,
      title: lesson.title,
      content: lesson.content || '',
      drive_url: lesson.driveUrl || '',
      video_url: lesson.videoUrl || '',
      video_duration: lesson.videoDuration ?? 0,
      min_study_time: lesson.minStudyTime ?? 60,
      requires_previous: lesson.requiresPrevious ?? true,
      is_hidden: lesson.isHidden ?? false,
      quiz_id: lesson.quizId || null,
      video_questions: lesson.videoQuestions || [],
      xp_reward: lesson.xpReward ?? 10,
      order_index: lesson.orderIndex ?? 0,
    };
    const { data, error } = await supabase.from('el_lessons').insert(payload).select().single();
    if (error || !data) { console.error('addELLesson error:', error); return null; }
    const mapped = mapLesson(data);
    set(s => ({ elLessons: [...s.elLessons, mapped] }));
    return mapped;
  },

  updateELLesson: async (id, updates) => {
    const payload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.content !== undefined) payload.content = updates.content;
    if (updates.driveUrl !== undefined) payload.drive_url = updates.driveUrl;
    if (updates.videoUrl !== undefined) payload.video_url = updates.videoUrl;
    if (updates.videoDuration !== undefined) payload.video_duration = updates.videoDuration;
    if (updates.minStudyTime !== undefined) payload.min_study_time = updates.minStudyTime;
    if (updates.requiresPrevious !== undefined) payload.requires_previous = updates.requiresPrevious;
    if (updates.isHidden !== undefined) payload.is_hidden = updates.isHidden;
    if (updates.quizId !== undefined) payload.quiz_id = updates.quizId || null;
    if (updates.videoQuestions !== undefined) payload.video_questions = updates.videoQuestions;
    if (updates.xpReward !== undefined) payload.xp_reward = updates.xpReward;
    if (updates.orderIndex !== undefined) payload.order_index = updates.orderIndex;

    const { error } = await supabase.from('el_lessons').update(payload).eq('id', id);
    if (error) { console.error('updateELLesson error:', error); return false; }
    set(s => ({ elLessons: s.elLessons.map(l => l.id === id ? { ...l, ...updates, updatedAt: payload.updated_at } : l) }));
    return true;
  },

  deleteELLesson: async (id) => {
    set(s => ({ elLessons: s.elLessons.filter(l => l.id !== id) }));
    const { error } = await supabase.from('el_lessons').delete().eq('id', id);
    if (error) { console.error('deleteELLesson error:', error); return false; }
    return true;
  },

  // =====================================================
  // STUDENT PROGRESS & HISTORY
  // =====================================================
  enrollCourse: async (studentId, courseId) => {
    // Check if already enrolled
    const existing = get().elStudentProgress.find(p => p.studentId === studentId && p.courseId === courseId);
    if (existing) return true;

    const payload = {
      student_id: studentId,
      course_id: courseId,
      completed_lessons: [],
      total_study_time: 0,
      best_quiz_scores: {},
    };
    const { data, error } = await supabase.from('el_student_progress').insert(payload).select().single();
    if (error) { console.error('enrollCourse error:', error); return false; }
    if (data) set(s => ({ elStudentProgress: [...s.elStudentProgress, mapProgress(data)] }));
    return true;
  },

  markLessonComplete: async (studentId, courseId, lessonId, quizScore) => {
    const progress = get().elStudentProgress.find(p => p.studentId === studentId && p.courseId === courseId);
    if (!progress) return false;
    if (progress.completedLessons.includes(lessonId)) return true; // Already complete

    const newCompleted = [...progress.completedLessons, lessonId];
    const newQuizScores = { ...progress.bestQuizScores };
    if (quizScore !== undefined) {
      const prev = newQuizScores[lessonId] || 0;
      newQuizScores[lessonId] = Math.max(prev, quizScore);
    }

    // Check if course is fully completed
    const allLessons = get().elLessons.filter(l => l.courseId === courseId && !l.isHidden);
    const isFullyComplete = allLessons.length > 0 && allLessons.every(l => newCompleted.includes(l.id));

    const updatePayload: Record<string, any> = {
      completed_lessons: newCompleted,
      best_quiz_scores: newQuizScores,
    };
    if (isFullyComplete) updatePayload.completed_at = new Date().toISOString();

    const { error } = await supabase.from('el_student_progress').update(updatePayload).eq('id', progress.id);
    if (error) { console.error('markLessonComplete error:', error); return false; }

    set(s => ({
      elStudentProgress: s.elStudentProgress.map(p =>
        p.id === progress.id
          ? { ...p, completedLessons: newCompleted, bestQuizScores: newQuizScores, completedAt: isFullyComplete ? updatePayload.completed_at : p.completedAt }
          : p
      )
    }));

    // Log study history
    await get().logStudyActivity({
      studentId, courseId, lessonId,
      actionType: 'LESSON_COMPLETE',
      score: quizScore,
      timeSpent: 0,
    });

    // If course fully complete, log course completion + award XP
    if (isFullyComplete) {
      await get().logStudyActivity({
        studentId, courseId, lessonId,
        actionType: 'COURSE_COMPLETE',
        timeSpent: 0,
      });

      // Award XP via Arena profile
      const course = get().elCourses.find(c => c.id === courseId);
      if (course && get().arenaProfile) {
        const newXp = (get().arenaProfile!.total_xp || 0) + course.xpReward;
        await get().updateArenaProfile({ id: get().arenaProfile!.id, total_xp: newXp });
      }

      // Notify parents
      try {
        const { data: parentLinks } = await supabase.from('parent_student_links').select('parent_id').eq('student_id', studentId);
        if (parentLinks) {
          const user = get().users.find(u => u.id === studentId) || get().user;
          for (const link of parentLinks) {
            await get().addNotification({
              id: `el-complete-${courseId}-${Date.now()}`,
              userId: link.parent_id,
              type: 'SUCCESS',
              title: '🎓 Hoàn thành khóa học!',
              message: `${user?.name || 'Con bạn'} đã hoàn thành khóa học "${course?.title}" và nhận được ${course?.xpReward || 0} XP!`,
              isRead: false,
              createdAt: new Date().toISOString(),
              link: '/parent/dashboard',
            });
          }
        }
      } catch (e) { console.warn('Error notifying parents:', e); }
    }

    return true;
  },

  logStudyActivity: async (entry) => {
    const payload = {
      student_id: entry.studentId,
      course_id: entry.courseId,
      lesson_id: entry.lessonId,
      action_type: entry.actionType,
      score: entry.score ?? null,
      time_spent: entry.timeSpent || 0,
      metadata: entry.metadata || {},
    };
    const { data, error } = await supabase.from('el_study_history').insert(payload).select().single();
    if (error) { console.warn('logStudyActivity error:', error); return; }
    if (data) set(s => ({ elStudyHistory: [mapHistory(data), ...s.elStudyHistory] }));

    // Update total study time in progress
    if (entry.timeSpent > 0) {
      const progress = get().elStudentProgress.find(p => p.studentId === entry.studentId && p.courseId === entry.courseId);
      if (progress) {
        const newTime = progress.totalStudyTime + entry.timeSpent;
        await supabase.from('el_student_progress').update({ total_study_time: newTime }).eq('id', progress.id);
        set(s => ({
          elStudentProgress: s.elStudentProgress.map(p => p.id === progress.id ? { ...p, totalStudyTime: newTime } : p)
        }));
      }
    }
  },

  fetchELStudentProgress: async (studentId, courseId) => {
    let query = supabase.from('el_student_progress').select('*');
    if (studentId) query = query.eq('student_id', studentId);
    if (courseId) query = query.eq('course_id', courseId);
    const { data, error } = await query;
    if (error) { console.error('fetchELStudentProgress error:', error); return; }
    set({ elStudentProgress: (data || []).map(mapProgress) });
  },

  fetchELStudyHistory: async (courseId) => {
    const { data, error } = await supabase.from('el_study_history')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) { console.error('fetchELStudyHistory error:', error); return; }
    set({ elStudyHistory: (data || []).map(mapHistory) });
  },

  // =====================================================
  // LESSON COMMENTS
  // =====================================================
  fetchELComments: async (lessonId) => {
    const { data, error } = await supabase.from('el_lesson_comments')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: true });
    if (error) { console.error('fetchELComments error:', error); return; }
    set({ elLessonComments: (data || []).map(mapComment) });
  },

  addELComment: async (comment) => {
    const payload = {
      lesson_id: comment.lessonId,
      user_id: comment.userId,
      user_name: comment.userName,
      content: comment.content,
      parent_comment_id: comment.parentCommentId || null,
    };
    const { data, error } = await supabase.from('el_lesson_comments').insert(payload).select().single();
    if (error) { console.error('addELComment error:', error); return false; }
    if (data) set(s => ({ elLessonComments: [...s.elLessonComments, mapComment(data)] }));
    return true;
  },

  deleteELComment: async (id) => {
    set(s => ({ elLessonComments: s.elLessonComments.filter(c => c.id !== id) }));
    const { error } = await supabase.from('el_lesson_comments').delete().eq('id', id);
    if (error) { console.error('deleteELComment error:', error); return false; }
    return true;
  },
});

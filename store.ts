import { create } from 'zustand';
import { createArenaSlice } from './store/arenaSlice';
import { createAuthSlice } from './store/authSlice';
import { createExamSlice } from './store/examSlice';
import { createClassSlice } from './store/classSlice';
import { createAppSlice } from './store/appSlice';
import { createDiscussionSlice } from './store/discussionSlice';
import { AppState, Exam, Attempt, User, AcademicYear, Class, Assignment, LiveSession, DiscussionSession, DiscussionRound, Notification, WebResource, ChatMessage, CustomToolMenu, Poll, BreakoutRoom, ArenaMatchFilters, QuestionBankItem, SiteSettings } from './types';
import { supabase } from './services/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

// Fallback Mock Data in case Supabase is empty (for seeding first time)
const SEED_USERS: User[] = [
  {
    id: 'admin1',
    name: 'Quản Trị Viên',
    email: 'admin@school.edu',
    role: 'ADMIN',
    avatar: 'https://ui-avatars.com/api/?name=Admin&background=000&color=fff',
    password: '123456'
  }
];

export const useStore = create<AppState>((set, get, api) => ({
  ...createArenaSlice(set, get, api),
  ...createAuthSlice(set, get, api),
  ...createExamSlice(set, get, api),
  ...createClassSlice(set, get, api),
  ...createAppSlice(set, get, api),
  ...createDiscussionSlice(set, get, api),

  isDataLoading: false,

  // --- INITIAL DATA FETCHING (LAZY LOADING STANDARD) ---
  fetchInitialData: async () => {
    const { user } = get();
    
    // Tải dữ liệu đệm từ LocalStorage để hiện giao diện ngay lập tức
    try {
      const cachedUsers = localStorage.getItem('cache_initial_users');
      const cachedYears = localStorage.getItem('cache_initial_years');
      
      if (cachedUsers) set({ users: JSON.parse(cachedUsers) });
      if (cachedYears) set({ academicYears: JSON.parse(cachedYears) });
      
      // Nếu đã có cache thì không cần màn hình block loading toàn màn hình
      if (cachedUsers && cachedYears) {
        set({ isDataLoading: false });
      } else {
        set({ isDataLoading: true });
      }
    } catch {
      set({ isDataLoading: true });
    }

    // Định nghĩa các promise chạy song song
    const fetchPromises: PromiseLike<any>[] = [];

    // 1. Tải Profiles (Chỉ tải nếu là Admin/Teacher)
    let usersPromise: PromiseLike<any> = Promise.resolve(null);
    if (user && (user.role === 'ADMIN' || user.role === 'TEACHER')) {
      usersPromise = supabase.from('profiles').select('*').then(({ data }) => {
        if (data && data.length > 0) {
          set({ users: data as User[] });
          localStorage.setItem('cache_initial_users', JSON.stringify(data));
        }
      });
      fetchPromises.push(usersPromise);
    } else {
      set({ users: [] });
    }

    // 2. Tải Academic Years
    const yearsPromise = supabase.from('academic_years').select('*').then(({ data }) => {
      if (data) {
        set({ academicYears: data as AcademicYear[] });
        localStorage.setItem('cache_initial_years', JSON.stringify(data));
      }
    });
    fetchPromises.push(yearsPromise);

    // Nếu chưa đăng nhập, dọn dẹp các state chuyên biệt
    if (!user) {
      set({ exams: [], assignments: [], classes: [], questionBank: [], notifications: [], attempts: [], resources: [], discussionSessions: [] });
      set({ isDataLoading: false });
      return;
    }

    const isAdmin = user.role === 'ADMIN';
    const isTeacher = user.role === 'TEACHER';
    const isStudent = user.role === 'STUDENT';

    // 3. Tải Notifications
    const notificationsPromise = supabase.from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) {
          set({ notifications: data.map(n => ({
            id: String(n.id),
            userId: String(n.user_id),
            type: n.type || 'INFO',
            title: n.title,
            message: n.message,
            isRead: !!n.is_read,
            createdAt: n.created_at,
            link: n.link,
            payload: n.payload
          })) });
        }
      });
    fetchPromises.push(notificationsPromise);

    // 4. Tải Cài Đặt Trang (Site Settings)
    const settingsPromise = get().fetchSiteSettings();
    fetchPromises.push(settingsPromise);

    // 5. Tải Custom Topics
    const topicsPromise = get().fetchCustomTopics();
    fetchPromises.push(topicsPromise);

    // Đăng ký Realtime
    try {
      // Attempts Realtime
      supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'attempts' },
          (payload) => {
            const a = payload.new;
            if (isAdmin || isTeacher || (isStudent && a.student_id === user.id)) {
                const mappedAttempt: Attempt = {
                  id: String(a.id),
                  answers: (a.answers as Record<string, any>) || {},
                  examId: String(a.exam_id || a.examId),
                  assignmentId: String(a.assignment_id || a.assignmentId),
                  studentId: String(a.student_id || a.studentId),
                  submittedAt: String(a.submitted_at || a.submittedAt || new Date().toISOString()),
                  score: (a.score !== undefined && a.score !== null) ? Number(a.score) : 0,
                  teacherFeedback: a.teacher_feedback,
                  totalTimeSpentSec: Number(a.total_time_spent_sec || 0)
                };
                set((state) => {
                   if (state.attempts.some(att => att.id === mappedAttempt.id)) return state;
                   return { attempts: [...state.attempts, mappedAttempt] };
                });
            }
          }
        )
        .subscribe();

      // Notifications Realtime
      supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          (payload) => {
            const n = payload.new;
            if (n.user_id === user.id) {
                const newNotif = {
                  id: String(n.id),
                  userId: String(n.user_id),
                  type: n.type || 'INFO',
                  title: n.title,
                  message: n.message,
                  isRead: !!n.is_read,
                  createdAt: n.created_at,
                  link: n.link,
                  payload: n.payload
                };
                set((state) => {
                  if (state.notifications.some(notif => notif.id === newNotif.id)) return state;
                  return { notifications: [newNotif, ...state.notifications] };
                });
            }
          }
        )
        .subscribe();
    } catch (realtimeErr) {
      console.warn("Realtime channel failed to initialize:", realtimeErr);
    }

    // Chạy đồng thời toàn bộ các Promises
    try {
      await Promise.all(fetchPromises);
    } catch (e) {
      console.error("Error fetching initial data (Global Promise.all):", e);
      if (get().users.length === 0) set({ users: SEED_USERS });
    } finally {
      set({ isDataLoading: false });
    }
  },

  // --- CÁC PHƯƠNG THỨC TẢI DỮ LIỆU LAZY LOADING (CHỈ TẢI KHI CẦN) ---
  fetchExams: async () => {
    const { user } = get();
    if (!user) return;
    const isTeacher = user.role === 'TEACHER';
    let examQuery = supabase.from('exams').select('*');
    if (isTeacher) examQuery = examQuery.eq('teacher_id', user.id);
    
    let { data: exams, error: examErr } = await examQuery;
    if (isTeacher && (examErr || !exams || exams.length === 0)) {
        const fallback = await supabase.from('exams').select('*').eq('teacherId', user.id);
        if (!fallback.error && fallback.data && fallback.data.length > 0) {
            exams = fallback.data;
            examErr = null;
        }
    }

    if (!examErr && exams) {
      const sortedExams = [...exams].sort((a, b) => {
        const timeA = new Date(a.created_at || a.createdAt || a.createdat || 0).getTime();
        const timeB = new Date(b.created_at || b.createdAt || b.createdat || 0).getTime();
        return timeB - timeA;
      });

      const mappedExams = sortedExams.map((e: any) => ({
        ...e,
        id: String(e.id),
        teacherId: String(e.teacherId || e.teacher_id || e.teacherid || ''),
        createdAt: e.createdAt || e.created_at || e.createdat,
        updatedAt: e.updatedAt || e.updated_at || e.updatedat,
        durationMinutes: Number(e.durationMinutes || e.duration_minutes || e.durationminutes || 0),
        questionCount: e.questionCount || e.question_count || e.questioncount,
        category: e.category || (String(e.id).startsWith('exam_matrix_') ? 'EXAM' : 'TASK'),
        classId: String(e.classId || e.class_id || e.classid || '')
      }));
      set({ exams: mappedExams as Exam[] });
    }
  },

  fetchClasses: async () => {
    const { user } = get();
    if (!user) return;
    const isTeacher = user.role === 'TEACHER';
    const isStudent = user.role === 'STUDENT';
    
    let classQuery = supabase.from('classes').select('*');
    if (isTeacher) classQuery = classQuery.eq('teacher_id', user.id);
    if (isStudent && user.className) classQuery = classQuery.eq('name', user.className);

    let { data: rawClasses, error: classErr } = await classQuery;
    if (isTeacher && (classErr || !rawClasses || rawClasses.length === 0)) {
        const fallback = await supabase.from('classes').select('*').eq('teacherId', user.id);
        if (!fallback.error && fallback.data && fallback.data.length > 0) {
            rawClasses = fallback.data;
            classErr = null;
        }
    }

    if (rawClasses) {
      const mappedClasses = rawClasses.map(c => ({
        id: String(c.id),
        name: c.name,
        academicYearId: String(c.academicYearId || c.academic_year_id || c.academicyearid),
        teacherId: String(c.teacherId || c.teacher_id || c.teacherid),
        studentIds: Array.isArray(c.studentIds || c.student_ids || c.studentids) ? (c.studentIds || c.student_ids || c.studentids).map((sid: any) => String(sid)) : []
      }));
      set({ classes: mappedClasses as Class[] });
    }
  },

  fetchAssignments: async () => {
    const { user } = get();
    if (!user) return;
    const isTeacher = user.role === 'TEACHER';
    const isStudent = user.role === 'STUDENT';
    
    let assignQuery = supabase.from('assignments').select('*');
    if (isTeacher) assignQuery = assignQuery.eq('teacher_id', user.id);
    
    let { data: assignments, error: assignErr } = await assignQuery;
    if (isTeacher && (assignErr || !assignments || assignments.length === 0)) {
        const fallback = await supabase.from('assignments').select('*').eq('teacherId', user.id);
        if (!fallback.error && fallback.data && fallback.data.length > 0) {
            assignments = fallback.data;
            assignErr = null;
        }
    }

    if (assignments) {
      const sortedAssign = [...assignments].sort((a, b) => {
        const timeA = new Date(a.created_at || a.createdAt || a.createdat || 0).getTime();
        const timeB = new Date(b.created_at || b.createdAt || b.createdat || 0).getTime();
        return timeB - timeA;
      });

      const mappedAssignments = sortedAssign.map((a: any) => ({
        ...a,
        id: String(a.id),
        examId: String(a.examId || a.exam_id || a.examid),
        classId: String(a.classId || a.class_id || a.classid),
        teacherId: String(a.teacherId || a.teacher_id || a.teacherid || ''),
        durationMinutes: Number(a.durationMinutes || a.duration_minutes || a.durationminutes || 0),
        studentIds: Array.isArray(a.studentIds || a.student_ids || a.studentids) 
          ? (a.studentIds || a.student_ids || a.studentids).map((sid: any) => String(sid)) 
          : [],
        createdAt: a.createdAt || a.created_at || a.createdat,
        startTime: a.startTime || a.start_time || a.starttime,
        endTime: a.endTime || a.end_time || a.endtime,
        status: a.status || 'active'
      }));
      
      if (isStudent) {
          const classIds = get().classes.map(c => c.id);
          const filtered = mappedAssignments.filter(a => 
              classIds.includes(a.classId) && (!a.studentIds || a.studentIds.length === 0 || a.studentIds.includes(user.id))
          );
          set({ assignments: filtered });
      } else {
          set({ assignments: mappedAssignments as Assignment[] });
      }
    }
  },

  fetchResources: async () => {
    const { data: rawResources } = await supabase.from('resources').select('*');
    if (rawResources) {
      const resources = rawResources.map(r => ({
        ...r,
        createdAt: r.createdAt || r.created_at || r.createdat,
        addedBy: r.addedBy || r.added_by || r.addedby
      }));
      set({ resources: resources as WebResource[] });
    }
  },

  fetchDiscussions: async () => {
    const { user } = get();
    if (!user) return;
    const isTeacher = user.role === 'TEACHER';
    
    let discussionQuery = supabase.from('discussion_sessions').select(`
          *,
          rounds:discussion_rounds(*),
          participants:discussion_participants(*),
          polls:discussion_polls(*),
          breakoutRooms:discussion_breakout_rooms(*)
      `);
    if (isTeacher) discussionQuery = discussionQuery.eq('teacher_id', user.id);

    const { data: sessions } = await discussionQuery;
    if (sessions) {
      const formattedSessions: DiscussionSession[] = sessions.map((s: any) => ({
        id: s.id,
        teacherId: s.teacher_id,
        title: s.title,
        status: s.status,
        visibility: s.visibility,
        activeRoundId: s.active_round_id,
        createdAt: s.created_at,
        rounds: s.rounds || [],
        participants: s.participants.map((p: any) => ({
          studentId: p.student_id,
          name: p.name,
          isHandRaised: p.is_hand_raised,
          currentRoomId: p.current_room_id
        })),
        polls: s.polls?.map((p: any) => ({
          ...p,
          isActive: p.is_active,
          isAnonymous: p.is_anonymous
        })) || [],
        messages: [], // Chat messages loaded lazily on demand
        breakoutRooms: s.breakoutRooms || []
      }));
      set({ discussionSessions: formattedSessions });
    }
  },

  // ============================================
  // ONE-CLICK SYNC SYSTEM (LOCAL -> SUPABASE)
  // ============================================
  syncLocalAttemptsToCloud: async () => {
    const { attempts, user } = get();
    if (!user) return { success: false, count: 0 };
    
    console.log("[Sync Cloud] Starting manual sync for user:", user.id);
    console.log("[Sync Cloud] Total local attempts in memory:", attempts.length);

    if (attempts.length === 0) {
      return { success: true, count: 0 };
    }

    let successCount = 0;

    for (const att of attempts) {
      // 1. Kiểm tra sự tồn tại của record này trên database cloud
      const { data: existing } = await supabase
        .from('attempts')
        .select('id')
        .eq('id', att.id)
        .maybeSingle();

      if (existing) {
        console.log(`[Sync Cloud] Attempt ${att.id} already exists on cloud. Skipping.`);
        continue;
      }

      // 2. Nếu chưa có, tiến hành chèn an toàn
      const snakePayload = {
        id: att.id,
        exam_id: att.examId,
        assignment_id: att.assignmentId || null,
        student_id: att.studentId,
        answers: att.answers,
        score: att.score,
        submitted_at: att.submittedAt,
        teacher_feedback: att.teacherFeedback || null,
        feedback_allow_view_solution: att.feedbackAllowViewSolution ?? true,
        total_time_spent_sec: att.totalTimeSpentSec || null,
        time_spent_per_question: att.timeSpentPerQuestion || null,
        cheat_warnings: att.cheatWarnings || null
      };

      const { error } = await supabase.from('attempts').insert(snakePayload);
      
      if (!error) {
        successCount++;
        console.log(`[Sync Cloud] Successfully synced attempt ${att.id}`);
      } else {
        console.warn(`[Sync Cloud] Failed to sync ${att.id} using standard format. Trying minified...`, error.message);
        
        // Hỗ trợ cấu trúc database cũ (tương thích ngược)
        const snakeMinPayload = { ...snakePayload };
        delete (snakeMinPayload as any).total_time_spent_sec;
        delete (snakeMinPayload as any).time_spent_per_question;
        delete (snakeMinPayload as any).cheat_warnings;

        const { error: err2 } = await supabase.from('attempts').insert(snakeMinPayload);
        if (!err2) {
          successCount++;
          console.log(`[Sync Cloud] Synced ${att.id} in minified format.`);
        } else {
          console.error(`[Sync Cloud] Permanent failure syncing attempt ${att.id}:`, err2.message);
        }
      }
    }

    // Refresh lại danh sách attempts từ database sau khi sync thành công
    await get().fetchAttempts();

    return { success: true, count: successCount };
  }

}));


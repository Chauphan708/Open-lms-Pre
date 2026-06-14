import { StateCreator } from 'zustand';
import { AppState, Exam, QuestionBankItem, Assignment, Attempt, Notification } from '../types';
import { supabase } from '../services/supabaseClient';

export type ExamSliceState = Pick<AppState,
  | 'exams' | 'addExam' | 'updateExam' | 'softDeleteExam' | 'restoreExam'
  | 'bulkUpdateTopic' | 'bulkDeleteTopic'
  | 'toggleExamShare' | 'importExamByCode' | 'fetchPublicExams' | 'sendDirectShare' | 'respondToShare'
  | 'customTopics' | 'addCustomTopic' | 'fetchCustomTopics'
  | 'questionBank' | 'fetchQuestionBank' | 'syncQuestionsFromExams' 
  | 'addQuestionToBank' | 'updateQuestionInBank' | 'deleteQuestionFromBank'
  | 'assignments' | 'addAssignment' | 'deleteAssignment' | 'updateAssignment'
  | 'attempts' | 'totalAttemptsCount' | 'fetchAttempts' | 'addAttempt' | 'updateAttemptFeedback'
>;

export const createExamSlice: StateCreator<AppState, [], [], ExamSliceState> = (set, get) => ({
  exams: [],
  customTopics: [],
  questionBank: [],
  assignments: [],
  attempts: [],
  totalAttemptsCount: 0,

  // Exams
  addExam: async (exam) => {
    const { user } = get();
    // Optimistic: add to local state immediately so user sees it
    set((state) => ({ exams: [exam, ...state.exams] }));
    const payload: any = {
      id: String(exam.id),
      title: exam.title,
      subject: exam.subject,
      topic: exam.topic,
      grade: exam.grade,
      difficulty: exam.difficulty,
      duration_minutes: Number(exam.durationMinutes),
      question_count: Number(exam.questionCount),
      created_at: exam.createdAt,
      status: exam.status,
      class_id: String(exam.classId || ''),
      description: (exam as any).description,
      questions: exam.questions,
      category: exam.category || 'EXAM',
      deleted_at: exam.deletedAt,
      // Default sharing fields
      is_public: exam.isPublic || false,
      share_code: exam.shareCode || null,
      is_code_required: exam.isCodeRequired || false,
      original_author_id: user?.id || null,
      original_author_name: user?.name || null,
      contributors: [],
      parent_exam_id: null,
      downloads: 0
    };

    // Only add teacher_id if user exists (proactive ownership)
    if (user?.id) {
        payload.teacher_id = user.id;
    }

    const { error } = await supabase.from('exams').insert(payload);
    if (error) {
      console.error("DEBUG: addExam Supabase error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        payload
      });
      alert(`⚠️ Lỗi lưu bài tập lên server: ${error.message}\nBài tập vẫn hiện tạm thời nhưng sẽ mất khi tải lại trang.`);
    }
  },
  bulkUpdateTopic: async (oldName, newName) => {
    const { user } = get();
    if (!user) return false;

    // 1. Update Exams table
    const { error: examErr } = await supabase.from('exams').update({ topic: newName }).eq('topic', oldName).eq('teacher_id', user.id);
    
    // 2. Update Question Bank table
    const { error: qBankErr } = await supabase.from('question_bank').update({ topic: newName }).eq('topic', oldName).eq('teacher_id', user.id);
    
    // 3. Update Custom Topics table
    const { error: customErr } = await supabase.from('custom_topics').update({ name: newName }).eq('name', oldName).eq('teacher_id', user.id);

    if (examErr || qBankErr) {
      console.error("bulkUpdateTopic Error:", { examErr, qBankErr, customErr });
    }

    set(state => ({
      exams: state.exams.map(e => e.topic === oldName ? { ...e, topic: newName } : e),
      questionBank: state.questionBank.map(q => q.topic === oldName ? { ...q, topic: newName } : q),
      customTopics: state.customTopics.map(t => t === oldName ? newName : t)
    }));
    return true;
  },
  bulkDeleteTopic: async (topicName) => {
    const { user } = get();
    if (!user) return false;

    // 1. Update Exams (unset topic)
    await supabase.from('exams').update({ topic: null }).eq('topic', topicName).eq('teacher_id', user.id);
    
    // 2. Update Question Bank (unset topic)
    await supabase.from('question_bank').update({ topic: null }).eq('topic', topicName).eq('teacher_id', user.id);
    
    // 3. Delete from Custom Topics table
    await supabase.from('custom_topics').delete().eq('name', topicName).eq('teacher_id', user.id);

    set(state => ({
      exams: state.exams.map(e => e.topic === topicName ? { ...e, topic: undefined } : e),
      questionBank: state.questionBank.map(q => q.topic === topicName ? { ...q, topic: undefined } : q),
      customTopics: state.customTopics.filter(t => t !== topicName)
    }));
    return true;
  },
  updateExam: async (updatedExam) => {
    const { user } = get();
    const payload: any = {
      title: updatedExam.title,
      subject: updatedExam.subject,
      topic: updatedExam.topic,
      grade: updatedExam.grade,
      difficulty: updatedExam.difficulty,
      duration_minutes: Number(updatedExam.durationMinutes),
      question_count: Number(updatedExam.questionCount),
      status: updatedExam.status,
      class_id: String(updatedExam.classId || ''),
      description: (updatedExam as any).description,
      questions: updatedExam.questions,
      category: updatedExam.category || (String(updatedExam.id).startsWith('exam_matrix_') ? 'EXAM' : 'TASK'),
      deleted_at: updatedExam.deletedAt
    };

    if (user?.id) {
        payload.teacher_id = user.id;
    }

    const { error } = await supabase.from('exams').update(payload).eq('id', updatedExam.id);
    if (!error) set((state) => ({
      exams: state.exams.map((e) => e.id === updatedExam.id ? updatedExam : e)
    }));
  },
  softDeleteExam: async (id) => {
    const deletedAt = new Date().toISOString();
    set((state) => ({
      exams: state.exams.map(e => e.id === id ? { ...e, deletedAt } : e)
    }));
    await supabase.from('exams').update({ deleted_at: deletedAt }).eq('id', id);
  },
  restoreExam: async (id) => {
    set((state) => ({
      exams: state.exams.map(e => e.id === id ? { ...e, deletedAt: undefined } : e)
    }));
    await supabase.from('exams').update({ deleted_at: null }).eq('id', id);
  },

  toggleExamShare: async (id, isPublic, isCodeRequired) => {
    const exam = get().exams.find(e => e.id === id);
    if (!exam) return false;

    // Generate code if turning on sharing and no code exists
    let shareCode = exam.shareCode;
    if ((isPublic || isCodeRequired) && !shareCode) {
      shareCode = `AZ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }

    const { user } = get();
    const { error } = await supabase.from('exams').update({
      is_public: isPublic,
      is_code_required: isCodeRequired,
      share_code: shareCode,
      original_author_id: exam.originalAuthorId || user?.id,
      original_author_name: exam.originalAuthorName || user?.name || 'Giáo viên'
    }).eq('id', id);

    if (!error) {
      set(state => ({
        exams: state.exams.map(e => e.id === id ? { 
          ...e, 
          isPublic, 
          isCodeRequired, 
          shareCode, 
          originalAuthorId: exam.originalAuthorId || user?.id,
          originalAuthorName: exam.originalAuthorName || user?.name || 'Giáo viên'
        } : e)
      }));
      return shareCode || true;
    }
    return false;
  },

  importExamByCode: async (code, customMetadata) => {
    const { user } = get();
    if (!user) return null;

    // 1. Fetch the exam by share code
    const { data: sourceExam, error } = await supabase
      .from('exams')
      .select('*')
      .eq('share_code', code)
      .maybeSingle();

    if (error || !sourceExam) {
      console.error("Import failed: Code not found", error);
      return null;
    }

    // 2. Prepare the clone
    const newId = `clone_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const contributors = Array.isArray(sourceExam.contributors) ? [...sourceExam.contributors] : [];
    
    // Add current teacher to contributors if it's not the original author
    if (sourceExam.teacher_id !== user.id) {
        // Find teacher name if possible or use "Giáo viên mới"
        contributors.push(user.name || 'Một giáo viên');
    }

    const payload: any = {
      id: newId,
      title: customMetadata?.title || sourceExam.title,
      subject: customMetadata?.subject || sourceExam.subject,
      topic: customMetadata?.topic || sourceExam.topic,
      grade: customMetadata?.grade || sourceExam.grade,
      difficulty: sourceExam.difficulty,
      duration_minutes: sourceExam.duration_minutes,
      question_count: sourceExam.question_count,
      created_at: new Date().toISOString(),
      status: 'PUBLISHED',
      teacher_id: user.id,
      description: sourceExam.description,
      questions: sourceExam.questions,
      category: sourceExam.category,
      // Sharing heritage
      original_author_id: sourceExam.original_author_id || sourceExam.teacher_id,
      original_author_name: sourceExam.original_author_name || 'Tác giả gốc',
      contributors: contributors,
      parent_exam_id: sourceExam.id,
      is_public: false, // Clone is private by default
      share_code: null
    };

    const { error: insErr } = await supabase.from('exams').insert(payload);
    if (insErr) {
      console.error("Import failed: Database error", insErr);
      return null;
    }

    // Increment download count on source
    await supabase.rpc('increment_downloads', { exam_id: sourceExam.id });

    const newExam: Exam = {
      id: payload.id,
      title: payload.title,
      subject: payload.subject,
      topic: payload.topic,
      grade: payload.grade,
      difficulty: payload.difficulty,
      durationMinutes: payload.duration_minutes,
      questionCount: payload.question_count,
      createdAt: payload.created_at,
      status: payload.status as any,
      questions: payload.questions,
      category: payload.category,
      originalAuthorId: payload.original_author_id,
      originalAuthorName: payload.original_author_name,
      contributors: payload.contributors,
      parentExamId: payload.parent_exam_id
    };

    set(state => ({ exams: [newExam, ...state.exams] }));
    return newId;
  },

  fetchPublicExams: async () => {
    const { data, error } = await supabase
      .from('exams')
      .select('*, profiles(name)')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) return [];
    
    return (data || []).map((e: any) => ({
      id: e.id,
      title: e.title,
      subject: e.subject,
      topic: e.topic,
      grade: e.grade,
      difficulty: e.difficulty,
      durationMinutes: e.duration_minutes,
      questionCount: e.question_count,
      createdAt: e.created_at,
      status: e.status,
      questions: e.questions,
      category: e.category,
      isPublic: e.is_public,
      shareCode: e.share_code,
      originalAuthorName: e.original_author_name || e.profiles?.name || 'Giáo viên ẩn danh',
      contributors: e.contributors,
      downloads: e.downloads
    } as Exam));
  },

  sendDirectShare: async (examId, targetTeacherIds) => {
    const { user, exams } = get();
    if (!user) return false;
    const exam = exams.find(e => e.id === examId);
    if (!exam) return false;

    const notifs = targetTeacherIds.map(tid => ({
      id: `share_${Date.now()}_${tid}`,
      user_id: tid,
      type: 'INFO',
      title: 'Đề thi được chia sẻ',
      message: `Giáo viên ${user.name} đã chia sẻ trực tiếp đề thi: ${exam.title}`,
      is_read: false,
      created_at: new Date().toISOString(),
      payload: { examId, type: 'EXAM_SHARE' }
    }));

    const { error } = await supabase.from('notifications').insert(notifs);
    if (error) {
        console.error("Direct share failed:", error);
        return false;
    }
    return true;
  },

  respondToShare: async (notificationId, examId, accept, customMetadata) => {
    const { user, markNotificationRead } = get();
    if (!user) return false;

    // 1. Get sender info from notification/exam if needed (or assume from notification message)
    if (accept) {
      // Import the exam
      const { data: sourceExam } = await supabase.from('exams').select('share_code').eq('id', examId).single();
      if (sourceExam?.share_code) {
        await get().importExamByCode(sourceExam.share_code, customMetadata);
      } else {
        // If no share code, we might need a direct ID import logic (similar to importExamByCode but by ID)
        // For simplicity, let's assume we can generate a temporary code or use a common clone logic
      }
    } else {
      // Notify sender that it was declined
      const { data: sourceExam } = await supabase.from('exams').select('teacher_id, title').eq('id', examId).single();
      if (sourceExam) {
        await supabase.from('notifications').insert({
          id: `refuse_${Date.now()}`,
          user_id: sourceExam.teacher_id,
          type: 'WARNING',
          title: 'Đề thi bị từ chối',
          message: `Giáo viên ${user.name} đã từ chối nhận đề thi: ${sourceExam.title}`,
          is_read: false,
          created_at: new Date().toISOString()
        });
      }
    }

    // Mark current notification as read
    await markNotificationRead(notificationId);
    return true;
  },

  addCustomTopic: async (topic) => {
    const { user, customTopics } = get();
    if (!user) return;
    
    // Optimistic UI
    if (!customTopics.includes(topic)) {
      set((state) => ({
        customTopics: Array.from(new Set([...state.customTopics, topic]))
      }));
    }

    // Persist to DB
    const { error } = await supabase.from('custom_topics').upsert({
       name: topic,
       teacher_id: user.id
    }, { onConflict: 'name, teacher_id' });

    if (error) console.error("addCustomTopic Persistence error:", error);
  },

  fetchCustomTopics: async () => {
    const { user } = get();
    if (!user) return;

    const { data, error } = await supabase.from('custom_topics')
      .select('name')
      .eq('teacher_id', user.id);
    
    if (!error && data) {
      set({ customTopics: data.map(item => item.name) });
    }
  },

  // Question Bank
  fetchQuestionBank: async () => {
    const { data } = await supabase.from('question_bank').select('*');
    if (data) set({ questionBank: data as QuestionBankItem[] });
  },
  syncQuestionsFromExams: async () => {
    const { exams, questionBank, user } = get();
    if (!user) {
      console.error("[Sync] No user found in store, sync aborted");
      return 0;
    }

    let newQuestions: QuestionBankItem[] = [];
    
    // Create a set of existing question contents to avoid duplicates
    const existingContents = new Set(questionBank.map(q => q.content.trim()));

    console.log("[Sync] Current User ID:", user.id);
    console.log("[Sync] Existing questions in bank:", existingContents.size);

    console.log("[Sync] Start syncing from", exams.length, "exams");
    
    exams.forEach(exam => {
      let qList = exam.questions;
      if (!qList) return;
      
      // Handle potential stringified JSON
      if (typeof qList === 'string') {
        try { qList = JSON.parse(qList); } catch (e) { return; }
      }
      
      if (!Array.isArray(qList)) return;

      qList.forEach(q => {
        if (!q || !q.content) return;
        const content = String(q.content).trim();
        
        // Simple duplicate check: by content
        if (existingContents.has(content)) return;

        const newItem: QuestionBankItem = {
          ...q,
          content,
          id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          subject: exam.subject || 'Chưa rõ',
          grade: exam.grade || 'Chưa rõ',
          topic: q.topic || exam.topic || '',
          level: q.level as any
        };
        newQuestions.push(newItem);
        existingContents.add(content); // Prevent duplicates within the same sync
      });
    });

    console.log("[Sync] Found", newQuestions.length, "new questions to sync");

    if (newQuestions.length === 0) return 0;

    // Push to Supabase in chunks to avoid payload size limits
    const CHUNK_SIZE = 50;
    let successCount = 0;
    for (let i = 0; i < newQuestions.length; i += CHUNK_SIZE) {
      const chunk = newQuestions.slice(i, i + CHUNK_SIZE);
      const payload = chunk.map(q => ({
        content: q.content,
        type: q.type,
        options: q.options,
        correct_option_index: q.correctOptionIndex,
        solution: q.solution,
        hint: q.hint,
        image_url: q.imageUrl,
        level: q.level,
        topic: q.topic,
        subject: q.subject,
        grade: q.grade,
        is_arena_eligible: q.isArenaEligible,
        teacher_id: get().user?.id
      }));

      console.log(`[Sync] Sending chunk ${i / CHUNK_SIZE + 1}...`, payload);
      
      const { error } = await supabase.from('question_bank').insert(payload);
      if (!error) {
        successCount += chunk.length;
        console.log(`[Sync] Chunk ${i / CHUNK_SIZE + 1} success!`);
      } else {
        console.error("[Sync] Chunk error details:", {
          error,
          payloadSample: payload[0]
        });
      }
    }

    // Refresh local state
    await get().fetchQuestionBank();
    return successCount;
  },
  addQuestionToBank: async (q) => {
    const payload = {
      content: q.content,
      type: q.type,
      options: q.options,
      correct_option_index: q.correctOptionIndex,
      solution: q.solution,
      hint: q.hint,
      image_url: q.imageUrl,
      level: q.level,
      topic: q.topic,
      subject: q.subject,
      grade: q.grade,
      is_arena_eligible: q.isArenaEligible,
      teacher_id: get().user?.id
    };
    const { error } = await supabase.from('question_bank').insert(payload);
    if (error) return false;
    await get().fetchQuestionBank(); // Refresh to get proper IDs or just trust UI
    return true;
  },
  updateQuestionInBank: async (q) => {
    const payload = {
      content: q.content,
      type: q.type,
      options: q.options,
      correct_option_index: q.correctOptionIndex,
      solution: q.solution,
      hint: q.hint,
      image_url: q.imageUrl,
      level: q.level,
      topic: q.topic,
      subject: q.subject,
      grade: q.grade,
      is_arena_eligible: q.isArenaEligible
    };
    const { error } = await supabase.from('question_bank').update(payload).eq('id', q.id);
    if (error) return false;
    set((state) => ({
      questionBank: state.questionBank.map((item) => item.id === q.id ? q : item)
    }));
    return true;
  },
  deleteQuestionFromBank: async (id) => {
    const { error } = await supabase.from('question_bank').delete().eq('id', id);
    if (error) return false;
    set((state) => ({ questionBank: state.questionBank.filter((q) => q.id !== id) }));
    return true;
  },

  // Assignments
  addAssignment: async (assign) => {
    // Optimistic: add to local state immediately
    set((state) => ({ assignments: [assign, ...state.assignments] }));

    const payload = {
      id: String(assign.id),
      exam_id: String(assign.examId),
      class_id: String(assign.classId),
      teacher_id: String(assign.teacherId),
      duration_minutes: Number(assign.durationMinutes),
      start_time: assign.startTime,
      end_time: assign.endTime,
      settings: assign.settings,
      mode: assign.mode,
      student_ids: Array.isArray(assign.studentIds) ? assign.studentIds.map((sid: any) => String(sid)) : [],
      created_at: assign.createdAt || new Date().toISOString()
    };

    const { error } = await supabase.from('assignments').insert(payload);
    if (error) {
      console.error("DEBUG: addAssignment Supabase error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        payload
      });
      alert(`⚠️ Lỗi giao bài tập lên server (Vercel): ${error.message}\nCó thể do lỗi mạng hoặc cấu hình bảng. Bài giao vẫn hiện tạm thời.`);
      return;
    }

    const state = get();
    const targetClass = state.classes.find(c => c.id === assign.classId);
    const exam = state.exams.find(e => e.id === assign.examId);

    if (targetClass && exam) {
      const assignAny = assign as any;
      const notifyIds: string[] = assignAny.studentIds && assignAny.studentIds.length > 0 ? assignAny.studentIds : targetClass.studentIds;
      
      const newNotifsRaw = notifyIds.map((sid: string) => {
        const id = `notif_${Date.now()}_${sid}`;
        const createdAt = new Date().toISOString();
        const link = `/exam/${exam.id}/take?assign=${assign.id}`;
        
        return {
          id,
          user_id: sid,
          type: 'INFO',
          title: 'Bài đề KT mới',
          message: `Giáo viên đã giao bài đề KT: ${exam.title}`,
          is_read: false,
          created_at: createdAt,
          link
        };
      });

      await supabase.from('notifications').insert(newNotifsRaw);
      
      // Update local state (mapped to camelCase)
      const newNotifsMapped: Notification[] = newNotifsRaw.map(n => ({
        id: n.id,
        userId: n.user_id,
        type: n.type as any,
        title: n.title,
        message: n.message,
        isRead: n.is_read,
        createdAt: n.created_at,
        link: n.link
      }));
      
      set((state: AppState) => ({ notifications: [...newNotifsMapped, ...state.notifications] }));
    }
  },

  deleteAssignment: async (id) => {
    const { error } = await supabase.from('assignments').delete().eq('id', id);
    if (error) {
      console.error("Delete assignment error:", error);
      return false;
    }
    set((state) => ({
      assignments: state.assignments.filter(a => a.id !== id)
    }));
    return true;
  },

  updateAssignment: async (updated) => {
    const { error } = await supabase.from('assignments').update({
      start_time: updated.startTime,
      end_time: updated.endTime,
      duration_minutes: updated.durationMinutes,
      settings: updated.settings,
      student_ids: (updated as any).studentIds,
      mode: updated.mode
    }).eq('id', updated.id);
    if (error) {
      console.error("Update assignment error:", error);
      return false;
    }
    set((state) => ({
      assignments: state.assignments.map(a => a.id === updated.id ? updated : a)
    }));
    return true;
  },

  // Attempts
  fetchAttempts: async (examIds?: string[]) => {
    // Try ordering by different potential columns to handle various schema versions
    const orderColumns = ['submitted_at', 'created_at', 'submittedAt'];
    let data: any[] | null = null;
    let lastError: any = null;

    for (const col of orderColumns) {
      let query = supabase.from('attempts').select('*');
      
      // Filter by examIds if provided (for teacher isolation)
      if (examIds && examIds.length > 0) {
        query = query.in('exam_id', examIds);
      }

      const { data: result, error } = await query.order(col, { ascending: false });
      
      if (!error) {
        data = result;
        break;
      }
      lastError = error;
    }

    if (data) {
      // Also fetch total count for dashboard stats (filtered by examIds)
      let countQuery = supabase.from('attempts').select('*', { count: 'exact', head: true });
      if (examIds && examIds.length > 0) {
        countQuery = countQuery.in('exam_id', examIds);
      }
      const { count } = await countQuery;
      
      const mappedAttempts: Attempt[] = data.map((a: any) => ({
        id: String(a.id),
        answers: (a.answers as Record<string, any>) || {},
        examId: String(a.examId || a.exam_id || a.examid),
        assignmentId: String(a.assignmentId || a.assignment_id || a.assignmentid || ''),
        studentId: String(a.studentId || a.student_id || a.studentid),
        submittedAt: String(a.submittedAt || a.submitted_at || a.submittedat || new Date().toISOString()),
        score: (a.score !== undefined && a.score !== null) ? Number(a.score) : Number(a.score_achieved || 0),
        teacherFeedback: a.teacherFeedback || a.teacher_feedback || a.teacherfeedback,
        feedbackAllowViewSolution: !!(a.feedbackAllowViewSolution ?? a.feedback_allow_view_solution ?? a.feedbackallowviewsolution ?? true),
        totalTimeSpentSec: Number(a.totalTimeSpentSec ?? a.total_time_spent_sec ?? a.totaltimespentsec ?? 0),
        timeSpentPerQuestion: (a.timeSpentPerQuestion || a.time_spent_per_question || a.timespentperquestion || {}) as Record<string, number>,
        cheatWarnings: Number(a.cheatWarnings ?? a.cheat_warnings ?? a.cheatwarnings ?? 0)
      }));
      set({ attempts: mappedAttempts, totalAttemptsCount: count || mappedAttempts.length });
    } else if (lastError) {
      console.error("fetchAttempts failed on all order columns:", lastError);
    }
  },

  addAttempt: async (attempt) => {
    console.log("DEBUG: addAttempt starting with payload:", attempt);
    
    // First Priority: Standard Snake Case (New Schema)
    const snakePayload = {
      id: attempt.id,
      exam_id: attempt.examId,
      assignment_id: attempt.assignmentId || null,
      student_id: attempt.studentId,
      answers: attempt.answers,
      score: attempt.score,
      submitted_at: attempt.submittedAt,
      teacher_feedback: attempt.teacherFeedback || null,
      feedback_allow_view_solution: attempt.feedbackAllowViewSolution ?? true,
      total_time_spent_sec: attempt.totalTimeSpentSec || null,
      time_spent_per_question: attempt.timeSpentPerQuestion || null,
      cheat_warnings: attempt.cheatWarnings || null
    };

    let { error } = await supabase.from('attempts').insert(snakePayload);
    
    if (error) {
      console.warn("DEBUG: addAttempt Snake Case failed, trying Snake Min...", error.message);
      
      // Second Priority: Snake Case without stats columns (Compatibility)
      const snakeMinPayload = { ...snakePayload };
      delete (snakeMinPayload as any).total_time_spent_sec;
      delete (snakeMinPayload as any).time_spent_per_question;
      delete (snakeMinPayload as any).cheat_warnings;

      const { error: err2 } = await supabase.from('attempts').insert(snakeMinPayload);
      
      if (err2) {
        console.warn("DEBUG: addAttempt Snake Min failed, trying Camel Case...", err2.message);
        
        // Third Priority: Old Camel Case
        const camelPayload = {
          id: attempt.id,
          examId: attempt.examId,
          assignmentId: attempt.assignmentId || null,
          studentId: attempt.studentId,
          answers: attempt.answers,
          score: attempt.score,
          submittedAt: attempt.submittedAt,
          teacherFeedback: attempt.teacherFeedback || null,
          feedbackAllowViewSolution: attempt.feedbackAllowViewSolution ?? true
        };

        const { error: err3 } = await supabase.from('attempts').insert(camelPayload);
        
        if (err3) {
           console.error("DEBUG: addAttempt failed on ALL levels:", {
             snakeError: error.message,
             snakeMinError: err2.message,
             camelError: err3.message
           });
           alert(`❌ LỖI NỘP BÀI: ${err3.message}\n\nVui lòng CHỤP ẢNH MÀN HÌNH kết quả này và gửi cho giáo viên ngay!`);
           return false;
        }
      }
    }

    // Success if we reached here
    set((state) => ({ attempts: [...state.attempts, attempt] }));
    return true;
  },
  updateAttemptFeedback: async (attemptId, feedback, allowViewSolution) => {
    const { error } = await supabase.from('attempts').update({
      teacher_feedback: feedback,
      feedback_allow_view_solution: allowViewSolution
    }).eq('id', attemptId);

    if (error) return;

    set((state) => ({
      attempts: state.attempts.map(a => a.id === attemptId ? {
        ...a,
        teacherFeedback: feedback,
        feedbackAllowViewSolution: allowViewSolution
      } : a)
    }));

    const state = get();
    const attempt = state.attempts.find(a => a.id === attemptId);
    const exam = state.exams.find(e => e.id === attempt?.examId);

    if (attempt && exam) {
      const createdAt = new Date().toISOString();
      const newNotifRaw = {
        id: `notif_fb_${Date.now()}`,
        user_id: attempt.studentId,
        type: 'SUCCESS',
        title: 'Nhận xét mới',
        message: `Giáo viên đã gửi nhận xét cho bài thi: ${exam.title}`,
        is_read: false,
        created_at: createdAt,
        link: `/exam/${exam.id}/take`
      };

      await supabase.from('notifications').insert(newNotifRaw);

      // Local update
      const newNotif: Notification = {
        id: newNotifRaw.id,
        userId: newNotifRaw.user_id,
        type: 'SUCCESS',
        title: newNotifRaw.title,
        message: newNotifRaw.message,
        isRead: false,
        createdAt: newNotifRaw.created_at,
        link: newNotifRaw.link
      };
      set(s => ({ notifications: [newNotif, ...s.notifications] }));
    }
  }
});

import { StateCreator } from 'zustand';
import { AppState, AvatarClass, ArenaMatchFilters } from '../types';
import { supabase } from '../services/supabaseClient';

type ArenaSliceState = Pick<AppState, 
  | 'arenaProfile' | 'arenaQuestions' | 'arenaQuestionsHasMore' | 'arenaMatches'
  | 'fetchArenaProfile' | 'createArenaProfile' | 'updateArenaProfile'
  | 'fetchArenaQuestions' | 'loadMoreArenaQuestions' | 'addArenaQuestion'
  | 'updateArenaQuestion' | 'deleteArenaQuestion' | 'bulkDeleteArenaQuestions'
  | 'fetchWaitingMatches' | 'createMatch' | 'bulkAddArenaQuestions'
  | 'cancelMatchmaking' | 'challengeMatch' | 'acceptMatch' | 'rejectMatch'
  | 'submitArenaAnswer' | 'finishMatch' | 'updateMatchHp' | 'fetchLeaderboard'
  | 'tournaments' | 'fetchTournaments' | 'createTournament' | 'updateTournament'
  | 'joinTournament' | 'fetchTournamentParticipants' | 'updateParticipant' | 'eliminateParticipant'
>;
export const createArenaSlice: StateCreator<AppState, [], [], ArenaSliceState> = (set, get) => ({
  // ============================================
  // EDUQUEST ARENA
  // ============================================
  arenaProfile: null,
  arenaQuestions: [],
  arenaQuestionsHasMore: false,
  arenaMatches: [],

  fetchArenaProfile: async (userId) => {
    const { data, error } = await supabase.from('arena_profiles').select('*').eq('id', userId).single();
    if (data) {
      set({ arenaProfile: data as any });
    } else {
      set({ arenaProfile: null });
    }
  },

  createArenaProfile: async (userId, avatarClass) => {
    const profile = { 
      id: userId, 
      avatar_class: avatarClass, 
      elo_rating: 1000, 
      total_xp: 0, 
      wins: 0, 
      losses: 0, 
      tower_floor: 1,
      daily_quests: [
        { id: 'q1', text: 'Vượt tháp thích ứng: Trả lời đúng 5 câu liên tiếp', target: 5, current: 0, reward_xp: 30, completed: false, type: 'correct_streak' },
        { id: 'q2', text: 'Tích lũy tri thức: Đạt 100% Mastery ở chuyên đề bất kỳ', target: 1, current: 0, reward_xp: 50, completed: false, type: 'mastery_100' },
        { id: 'q3', text: 'Quyết chiến võ đài: Tham gia 1 trận PvP 1v1', target: 1, current: 0, reward_xp: 30, completed: false, type: 'pvp_match' }
      ],
      unlocked_badges: [],
      active_title: 'Học Giả Tập Sự',
      topic_mastery: {}
    };
    const { error } = await supabase.from('arena_profiles').insert(profile);
    if (error) {
      console.warn('Lỗi tạo Arena Profile với cột mới, đang thử lại với các cột tối giản...', error.message);
      const minProfile = { id: userId, avatar_class: avatarClass, elo_rating: 1000, total_xp: 0, wins: 0, losses: 0, tower_floor: 1 };
      const { error: err2 } = await supabase.from('arena_profiles').insert(minProfile);
      if (err2) {
        console.error('Lỗi tạo Arena Profile tối giản:', err2);
        alert(`Lỗi tạo hồ sơ Arena: ${err2.message}`);
        return;
      }
      set({ arenaProfile: minProfile as any });
      return;
    }
    set({ arenaProfile: profile as any });
  },

  updateArenaProfile: async (profile) => {
    const { error } = await supabase.from('arena_profiles').update(profile).eq('id', profile.id);
    if (!error) {
      set(state => ({
        arenaProfile: state.arenaProfile ? { ...state.arenaProfile, ...profile } : null
      }));
    }
  },

  fetchArenaQuestions: async () => {
    const { data } = await supabase.from('arena_questions').select('*').order('created_at', { ascending: false }).limit(50);
    if (data) {
      set({
        arenaQuestions: data.map((q: any) => ({ 
          ...q, 
          answers: typeof q.answers === 'string' ? JSON.parse(q.answers) : q.answers,
          correct_indices: typeof q.correct_indices === 'string' ? JSON.parse(q.correct_indices) : q.correct_indices
        })),
        arenaQuestionsHasMore: data.length === 50
      });
    }
  },

  loadMoreArenaQuestions: async () => {
    const state = get();
    if (!state.arenaQuestionsHasMore || state.arenaQuestions.length === 0) return;

    const currentLength = state.arenaQuestions.length;
    const { data } = await supabase.from('arena_questions').select('*').order('created_at', { ascending: false }).range(currentLength, currentLength + 49);

    if (data && data.length > 0) {
      const parsed = data.map((q: any) => ({ 
        ...q, 
        answers: typeof q.answers === 'string' ? JSON.parse(q.answers) : q.answers,
        correct_indices: typeof q.correct_indices === 'string' ? JSON.parse(q.correct_indices) : q.correct_indices
      }));
      set({
        arenaQuestions: [...state.arenaQuestions, ...parsed],
        arenaQuestionsHasMore: data.length === 50
      });
    } else {
      set({ arenaQuestionsHasMore: false });
    }
  },

  addArenaQuestion: async (q) => {
    const id = `aq_${Date.now()}`;
    const rowFull = { 
      id, 
      content: q.content, 
      answers: q.answers || [], 
      correct_index: q.correct_index ?? 0, 
      difficulty: q.difficulty, 
      subject: q.subject, 
      topic: q.topic || 'general', 
      time_limit_seconds: q.time_limit_seconds || 30, 
      xp_reward: q.xp_reward || 10,
      type: q.type || 'MCQ',
      correct_indices: q.correct_indices || null,
      correct_answer_string: q.correct_answer_string || null,
      guide: q.guide || null,
      explanation: q.explanation || null,
      grade: q.grade || null
    };
    
    let { error } = await supabase.from('arena_questions').insert(rowFull);
    if (error) {
      console.warn("Retrying insert without custom time, xp, and new type columns...", error.message);
      const rowMin = { id, content: q.content, answers: q.answers || [], correct_index: q.correct_index ?? 0, difficulty: q.difficulty, subject: q.subject, topic: q.topic || 'general', grade: q.grade || null };
      const { error: err2 } = await supabase.from('arena_questions').insert(rowMin);
      if (err2) {
        console.error("Supabase insert error:", err2);
        alert(`Không thể chèn câu hỏi: ${err2.message}`);
        return false;
      }
      set(state => ({ arenaQuestions: [...state.arenaQuestions, { ...rowMin, answers: typeof rowMin.answers === 'string' ? JSON.parse(rowMin.answers as any) : rowMin.answers } as any] }));
      return true;
    }
    set(state => ({ arenaQuestions: [...state.arenaQuestions, { ...rowFull, answers: typeof rowFull.answers === 'string' ? JSON.parse(rowFull.answers as any) : rowFull.answers } as any] }));
    return true;
  },

  updateArenaQuestion: async (q) => {
    const payloadFull = { 
      content: q.content, 
      answers: q.answers || [], 
      correct_index: q.correct_index ?? 0, 
      difficulty: q.difficulty, 
      subject: q.subject, 
      topic: q.topic || 'general', 
      time_limit_seconds: q.time_limit_seconds || 30, 
      xp_reward: q.xp_reward || 10,
      type: q.type || 'MCQ',
      correct_indices: q.correct_indices || null,
      correct_answer_string: q.correct_answer_string || null,
      guide: q.guide || null,
      explanation: q.explanation || null,
      grade: q.grade || null
    };
    let { error } = await supabase.from('arena_questions').update(payloadFull).eq('id', q.id);
    if (error) {
      console.warn("Retrying update without custom columns...");
      const payloadMin = { content: q.content, answers: q.answers || [], correct_index: q.correct_index ?? 0, difficulty: q.difficulty, subject: q.subject, topic: q.topic || 'general', grade: q.grade || null };
      const { error: err2 } = await supabase.from('arena_questions').update(payloadMin).eq('id', q.id);
      if (err2) return false;
      set(state => ({ arenaQuestions: state.arenaQuestions.map(x => x.id === q.id ? { ...x, ...payloadMin } : x) }));
      return true;
    }
    set(state => ({ arenaQuestions: state.arenaQuestions.map(x => x.id === q.id ? q : x) }));
    return true;
  },

  deleteArenaQuestion: async (id) => {
    const { error } = await supabase.from('arena_questions').delete().eq('id', id);
    if (error) return false;
    set(state => ({ arenaQuestions: state.arenaQuestions.filter(x => x.id !== id) }));
    return true;
  },

  bulkDeleteArenaQuestions: async (ids: string[]) => {
    const { error } = await supabase.from('arena_questions').delete().in('id', ids);
    if (error) {
      console.error('Bulk delete error:', error);
      return false;
    }
    set(state => ({ arenaQuestions: state.arenaQuestions.filter(x => !ids.includes(x.id)) }));
    return true;
  },

  fetchWaitingMatches: async () => {
    const { data } = await supabase
      .from('arena_matches')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false });
    return (data || []) as any[];
  },

  createMatch: async (playerId, filters) => {
    let questionIds: string[] = [];
    const count = filters?.count || 5;

    if (filters?.providedQuestionIds && filters.providedQuestionIds.length > 0) {
      // Use the pool provided, pick 'count' number of questions randomly from it
      questionIds = [...filters.providedQuestionIds]
        .sort(() => Math.random() - 0.5)
        .slice(0, count);
    } else if (filters?.source === 'exam') {
      // Lấy câu hỏi MCQ từ ngân hàng đề Exam
      const state = get();
      const allMcqQuestions: { id: string }[] = [];

      state.exams
        .filter(exam => exam.status === 'PUBLISHED')
        .filter(exam => !filters.subject || exam.subject === filters.subject)
        .filter(exam => !filters.grade || exam.grade === filters.grade)
        .forEach(exam => {
          exam.questions
            .filter(q => q.type === 'MCQ' && q.options.length >= 4 && q.correctOptionIndex !== undefined)
            .forEach(q => {
              allMcqQuestions.push({ id: `exam_${exam.id}_${q.id}` });
            });
        });

      questionIds = allMcqQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, count)
        .map(q => q.id);
    } else {
      // Lấy từ bảng arena_questions
      let query = supabase.from('arena_questions').select('id');
      if (filters?.subject) query = query.eq('subject', filters.subject);
      if (filters?.topic) query = query.eq('topic', filters.topic);
      const { data: questions } = await query;
      const allIds = questions?.map((q: any) => q.id) || [];
      questionIds = allIds.sort(() => Math.random() - 0.5).slice(0, count);
    }

    if (questionIds.length === 0) {
      // Fallback: lấy tất cả arena_questions
      const { data: questions } = await supabase.from('arena_questions').select('id');
      questionIds = (questions?.map((q: any) => q.id) || []).sort(() => Math.random() - 0.5).slice(0, count);
    }

    const matchId = `match_${Date.now()}`;
    const newMatch = {
      id: matchId,
      player1_id: playerId,
      player2_id: null,
      status: 'waiting',
      question_ids: questionIds,
      current_question: 0,
      player1_hp: 100,
      player2_hp: 100,
      player1_score: 0,
      player2_score: 0,
      winner_id: null,
      source: filters?.source || 'arena',
      filter_subject: filters?.subject || null,
      filter_grade: filters?.grade || null
    };

    const { error } = await supabase.from('arena_matches').insert(newMatch);
    if (error) {
      console.error("Match creation error", error);
      return null;
    }

    // Send notification to related students
    const state = get();
    const currentUser = state.users.find((u: any) => u.id === playerId);

    if (currentUser) {
      // Find classes this user belongs to
      const relatedClasses = state.classes.filter(c =>
        c.teacherId === playerId || c.studentIds.includes(playerId)
      );

      // Gather all unique student IDs from these classes
      const studentIdsToNotify = new Set<string>();
      relatedClasses.forEach(c => {
        c.studentIds.forEach(sid => {
          if (sid !== playerId) studentIdsToNotify.add(sid);
        });
      });

      // Send notifications
      studentIdsToNotify.forEach(sid => {
        state.addNotification({
          id: `notif_arena_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId: sid,
          type: 'INFO',
          title: 'Thách Đấu Mới',
          message: `${currentUser.name} vừa tạo phòng Đấu Trí mới. Vào sảnh để tham gia ngay!`,
          link: '/arena/pvp',
          isRead: false,
          createdAt: new Date().toISOString()
        });
      });
    }

    return newMatch as any;
  },

  cancelMatchmaking: async (matchId) => {
    await supabase.from('arena_matches').delete().eq('id', matchId).in('status', ['waiting', 'challenged']);
  },

  challengeMatch: async (matchId, challengerId) => {
    const { error } = await supabase.from('arena_matches')
      .update({ player2_id: challengerId, status: 'challenged' })
      .eq('id', matchId)
      .eq('status', 'waiting');
    if (error) {
      console.error('challengeMatch error:', error);
      alert(`Lỗi gửi thách đấu: ${error.message}`);
      return false;
    }
    return true;
  },

  acceptMatch: async (matchId) => {
    const { error } = await supabase.from('arena_matches')
      .update({ status: 'playing' })
      .eq('id', matchId)
      .eq('status', 'challenged');
    if (error) {
      console.error('acceptMatch error:', error);
      alert(`Lỗi chấp nhận: ${error.message}`);
      return false;
    }
    return true;
  },

  rejectMatch: async (matchId) => {
    await supabase.from('arena_matches')
      .update({ player2_id: null, status: 'waiting' })
      .eq('id', matchId)
      .eq('status', 'challenged');
  },

  submitArenaAnswer: async (matchId, playerId, questionIndex, answerIndex, timeTaken, isCorrect) => {
    const damage = isCorrect ? 20 + Math.max(0, Math.round((15 - timeTaken) * 0.7)) : 0;
    const eventType = isCorrect ? 'answer_correct' : 'answer_wrong';
    await supabase.from('arena_match_events').insert({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      match_id: matchId,
      player_id: playerId,
      event_type: eventType,
      payload: { question_index: questionIndex, damage, time_taken: timeTaken, answer_index: answerIndex }
    });
  },

  finishMatch: async (matchId, winnerId) => {
    await supabase.from('arena_matches').update({ status: 'finished', winner_id: winnerId }).eq('id', matchId);

    // Update Elo for both players
    const { data: match } = await supabase.from('arena_matches').select('*').eq('id', matchId).single();
    if (!match) return;

    const { data: p1Profile } = await supabase.from('arena_profiles').select('*').eq('id', match.player1_id).single();
    const { data: p2Profile } = await supabase.from('arena_profiles').select('*').eq('id', match.player2_id).single();
    if (!p1Profile || !p2Profile) return;

    const K = 32;
    const expected1 = 1 / (1 + Math.pow(10, (p2Profile.elo_rating - p1Profile.elo_rating) / 400));
    const expected2 = 1 - expected1;

    let score1 = 0.5, score2 = 0.5; // draw
    if (winnerId === match.player1_id) { score1 = 1; score2 = 0; }
    else if (winnerId === match.player2_id) { score1 = 0; score2 = 1; }

    const newElo1 = Math.round(p1Profile.elo_rating + K * (score1 - expected1));
    const newElo2 = Math.round(p2Profile.elo_rating + K * (score2 - expected2));

    await supabase.from('arena_profiles').update({
      elo_rating: newElo1,
      total_xp: p1Profile.total_xp + (score1 === 1 ? 50 : 10),
      wins: p1Profile.wins + (score1 === 1 ? 1 : 0),
      losses: p1Profile.losses + (score1 === 0 ? 1 : 0)
    }).eq('id', match.player1_id);

    await supabase.from('arena_profiles').update({
      elo_rating: newElo2,
      total_xp: p2Profile.total_xp + (score2 === 1 ? 50 : 10),
      wins: p2Profile.wins + (score2 === 1 ? 1 : 0),
      losses: p2Profile.losses + (score2 === 0 ? 1 : 0)
    }).eq('id', match.player2_id);

    // Update local if current user
    const state = get();
    if (state.arenaProfile && (state.arenaProfile.id === match.player1_id || state.arenaProfile.id === match.player2_id)) {
      const isP1 = state.arenaProfile.id === match.player1_id;
      const won = winnerId === state.arenaProfile.id;
      set({
        arenaProfile: {
          ...state.arenaProfile,
          elo_rating: isP1 ? newElo1 : newElo2,
          total_xp: state.arenaProfile.total_xp + (won ? 50 : 10),
          wins: state.arenaProfile.wins + (won ? 1 : 0),
          losses: state.arenaProfile.losses + (!won && winnerId ? 1 : 0)
        }
      });
    }
  },

  updateMatchHp: async (matchId, player1Hp, player2Hp) => {
    await supabase.from('arena_matches').update({ player1_hp: player1Hp, player2_hp: player2Hp }).eq('id', matchId);
  },

  fetchLeaderboard: async () => {
    const { data } = await supabase.from('arena_profiles').select('*').order('elo_rating', { ascending: false }).limit(50);
    return (data || []) as any[];
  },

  bulkAddArenaQuestions: async (questions) => {
    const rowsFull = questions.map((q, i) => ({
      id: `aq_bulk_${Date.now()}_${i}`,
      content: q.content,
      answers: q.answers || [],
      correct_index: q.correct_index ?? 0,
      difficulty: q.difficulty,
      subject: q.subject,
      topic: q.topic || 'general',
      time_limit_seconds: q.time_limit_seconds || 30,
      xp_reward: q.xp_reward || 10,
      type: q.type || 'MCQ',
      correct_indices: q.correct_indices || null,
      correct_answer_string: q.correct_answer_string || null,
      guide: q.guide || null,
      explanation: q.explanation || null,
      grade: q.grade || null
    }));
    
    let { error } = await supabase.from('arena_questions').insert(rowsFull);
    if (error) {
      console.warn("Retrying bulk insert without custom time, xp, and new columns...", error.message);
      const rowsMin = questions.map((q, i) => ({
        id: `aq_bulk_${Date.now()}_${i}`,
        content: q.content,
        answers: q.answers || [],
        correct_index: q.correct_index ?? 0,
        difficulty: q.difficulty,
        subject: q.subject,
        topic: q.topic || 'general',
        grade: q.grade || null
      }));
      const { error: err2 } = await supabase.from('arena_questions').insert(rowsMin);
      if (err2) {
        console.error('Bulk insert error:', err2);
        alert(`Không thể chèn loạt câu hỏi: ${err2.message}`);
        return 0;
      }
      const parsed = rowsMin.map(r => ({ ...r, answers: typeof r.answers === 'string' ? JSON.parse(r.answers as any) : r.answers }));
      set(state => ({ arenaQuestions: [...state.arenaQuestions, ...parsed as any[]] }));
      return rowsMin.length;
    }
    
    const parsed = rowsFull.map(r => ({ ...r, answers: typeof r.answers === 'string' ? JSON.parse(r.answers as any) : r.answers }));
    set(state => ({ arenaQuestions: [...state.arenaQuestions, ...parsed as any[]] }));
    return rowsFull.length;
  },

  // ============================================
  // TOURNAMENT ACTIONS
  // ============================================
  tournaments: [],

  fetchTournaments: async () => {
    const { data } = await supabase.from('arena_tournaments').select('*').order('created_at', { ascending: false });
    set({ tournaments: (data || []) as any[] } as any);
  },

  createTournament: async (t: any) => {
    const id = `tour_${Date.now()}`;
    const row = { id, ...t, status: 'waiting' };
    const { error } = await supabase.from('arena_tournaments').insert(row);
    if (error) { 
      console.error('Create tournament error:', error); 
      alert("Lỗi database: " + error.message);
      return null; 
    }
    set((state: any) => ({ tournaments: [row as any, ...state.tournaments] }));
    return row as any;
  },

  updateTournament: async (id: string, updates: any) => {
    await supabase.from('arena_tournaments').update(updates).eq('id', id);
    set((state: any) => ({ tournaments: state.tournaments.map((t: any) => t.id === id ? { ...t, ...updates } : t) }));
  },

  joinTournament: async (tournamentId, studentId) => {
    // Generate alias
    const ADJECTIVES = ['Dũng Cảm', 'Nhanh Trí', 'Thông Minh', 'Vui Vẻ', 'Bí Ẩn', 'Siêu Tốc', 'Mạnh Mẽ', 'Lanh Lợi', 'Tài Giỏi', 'Phi Thường', 'Oai Phong', 'Huyền Bí', 'Lẫm Liệt', 'Kiên Cường', 'Sáng Suốt'];
    const ANIMALS = ['Rồng', 'Phượng Hoàng', 'Sư Tử', 'Đại Bàng', 'Kỳ Lân', 'Ninja', 'Hổ', 'Sói', 'Cáo', 'Gấu Trúc', 'Cá Mập', 'Bạch Tuộc', 'Diều Hâu', 'Báo Đen', 'Rắn Hổ Mang'];
    const EMOJIS = ['🐉', '🦁', '🦅', '🦄', '🐯', '🐺', '🦊', '🐼', '🦈', '🐙', '🦅', '🐆', '🦇', '🐲', '🦂'];
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    const alias = `${animal} ${adj}`;

    const row = {
      id: `tp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      tournament_id: tournamentId,
      student_id: studentId,
      alias,
      alias_emoji: emoji,
      status: 'active',
      wins: 0,
    };
    const { error } = await supabase.from('arena_tournament_participants').insert(row);
    if (error) {
      if (error.code === '23505') return null; // Already joined
      console.error('Join tournament error:', error);
      return null;
    }
    return row as any;
  },

  fetchTournamentParticipants: async (tournamentId: string) => {
    const { data } = await supabase.from('arena_tournament_participants').select('*').eq('tournament_id', tournamentId).order('eliminated_at', { ascending: false, nullsFirst: true });
    return (data || []) as any[];
  },

  updateParticipant: async (id: string, updates: any) => {
    await supabase.from('arena_tournament_participants').update(updates).eq('id', id);
  },

  eliminateParticipant: async (id: string) => {
    await supabase.from('arena_tournament_participants').update({ status: 'eliminated', eliminated_at: new Date().toISOString() }).eq('id', id);
  },

});

import { StateCreator } from 'zustand';
import { AppState, LiveSession, DiscussionSession, ChatMessage, Poll, BreakoutRoom, DiscussionRound, LiveSessionStatus, MessageVisibility } from '../types';
import { supabase } from '../services/supabaseClient';

export type DiscussionSliceState = Pick<AppState,
  | 'liveSessions' | 'createLiveSession' | 'joinLiveSession' | 'updateLiveSessionStatus' | 'updateLiveParticipantProgress'
  | 'discussionSessions' | 'createDiscussion' | 'joinDiscussion' | 'fetchDiscussionMessages' | 'sendDiscussionMessage' 
  | 'toggleHandRaise' | 'createPoll' | 'votePoll' | 'togglePollStatus' | 'createBreakoutRooms' 
  | 'assignToRoom' | 'createDiscussionRound' | 'setActiveRound' | 'setDiscussionVisibility' 
  | 'endDiscussionSession' | 'deleteDiscussionSession'
>;

export const createDiscussionSlice: StateCreator<AppState, [], [], DiscussionSliceState> = (set, get) => ({
  discussionSessions: [],
  createDiscussion: async (session) => {
    const { error: sErr } = await supabase.from('discussion_sessions').insert({
      id: session.id,
      teacher_id: session.teacherId,
      title: session.title,
      status: session.status,
      visibility: session.visibility,
      active_round_id: session.activeRoundId
    });
    if (sErr) { console.error(sErr); return; }

    if (session.rounds.length > 0) {
      const roundsData = session.rounds.map(r => ({
        id: r.id,
        session_id: session.id,
        name: r.name,
        created_at: r.createdAt
      }));
      await supabase.from('discussion_rounds').insert(roundsData);
    }

    set(state => ({ discussionSessions: [...state.discussionSessions, session] }));
  },

  joinDiscussion: async (pin: string, student: any) => {
    const state = get();
    const session = state.discussionSessions.find(s => s.id === pin);
    if (!session) return false; 

    const isJoined = session.participants.some(p => p.studentId === student.id);
    if (isJoined) return true;

    const { error } = await supabase.from('discussion_participants').insert({
      session_id: pin,
      student_id: student.id,
      name: student.name,
      current_room_id: 'MAIN'
    });

    if (error) {
      console.error("Join error:", error);
      return false;
    }

    const newParticipant = { studentId: student.id, name: student.name, isHandRaised: false, currentRoomId: 'MAIN' };
    set(state => ({
      discussionSessions: state.discussionSessions.map(s =>
        s.id === pin ? { ...s, participants: [...s.participants, newParticipant] } : s
      )
    }));
    return true;
  },

  fetchDiscussionMessages: async (pin: string, limitCount = 50) => {
    const { data, error } = await supabase
      .from('discussion_messages')
      .select('*')
      .eq('session_id', pin)
      .order('created_at', { ascending: false })
      .limit(limitCount);
      
    if (!error && data) {
      const mappedMessages: ChatMessage[] = data.map((m: any) => ({
        id: m.id,
        sessionId: m.session_id,
        senderId: m.sender_id,
        senderName: m.sender_name,
        content: m.content,
        type: m.type as any,
        roomId: m.room_id,
        roundId: m.round_id,
        timestamp: m.created_at
      })).reverse();

      set(state => ({
        discussionSessions: state.discussionSessions.map(s => 
          s.id === pin ? { ...s, messages: mappedMessages } : s
        )
      }));
    }
  },

  sendDiscussionMessage: async (pin, message) => {
    const { error } = await supabase.from('discussion_messages').insert({
      id: message.id,
      session_id: pin,
      sender_id: message.senderId,
      sender_name: message.senderName,
      content: message.content,
      type: message.type,
      round_id: message.roundId,
      room_id: message.roomId,
      created_at: message.timestamp
    });

    if (!error) {
      set(state => ({
        discussionSessions: state.discussionSessions.map(s =>
          s.id === pin ? { ...s, messages: [...s.messages, message] } : s
        )
      }));
    }
  },

  toggleHandRaise: async (pin, studentId) => {
    const state = get();
    const session = state.discussionSessions.find(s => s.id === pin);
    if (!session) return;
    const participant = session.participants.find(p => p.studentId === studentId);
    if (!participant) return;

    const newVal = !participant.isHandRaised;

    await supabase.from('discussion_participants').update({ is_hand_raised: newVal })
      .eq('session_id', pin).eq('student_id', studentId);

    set(state => ({
      discussionSessions: state.discussionSessions.map(s =>
        s.id === pin ? {
          ...s,
          participants: s.participants.map(p => p.studentId === studentId ? { ...p, isHandRaised: newVal } : p)
        } : s
      )
    }));
  },

  createPoll: async (pin, poll) => {
    const payload = {
      id: poll.id,
      session_id: pin,
      question: poll.question,
      options: poll.options,
      is_anonymous: poll.isAnonymous,
      is_active: poll.isActive,
      created_at: poll.createdAt
    };
    const { error } = await supabase.from('discussion_polls').insert(payload);
    if (!error) {
      set(state => ({
        discussionSessions: state.discussionSessions.map(s => s.id === pin ? { ...s, polls: [poll, ...s.polls] } : s)
      }));
    }
  },

  votePoll: async (pin, pollId, optionId, studentId) => {
    const state = get();
    const session = state.discussionSessions.find(s => s.id === pin);
    const poll = session?.polls.find(p => p.id === pollId);
    if (!poll) return;

    const newOptions = poll.options.map(o =>
      o.id === optionId ? { ...o, voteCount: o.voteCount + 1, voterIds: [...o.voterIds, studentId] } : o
    );

    await supabase.from('discussion_polls').update({ options: newOptions }).eq('id', pollId);

    set(state => ({
      discussionSessions: state.discussionSessions.map(s => {
        if (s.id !== pin) return s;
        return {
          ...s,
          polls: s.polls.map(p => p.id === pollId ? { ...p, options: newOptions } : p)
        };
      })
    }));
  },

  togglePollStatus: async (pin, pollId, isActive) => {
    await supabase.from('discussion_polls').update({ is_active: isActive }).eq('id', pollId);

    set(state => ({
      discussionSessions: state.discussionSessions.map(s => {
        if (s.id !== pin) return s;
        return {
          ...s,
          polls: s.polls.map(p => p.id === pollId ? { ...p, isActive } : p)
        };
      })
    }));
  },

  createBreakoutRooms: async (pin, rooms) => {
    const { error: delErr } = await supabase.from('discussion_breakout_rooms').delete().eq('session_id', pin);
    if (delErr) console.error(delErr);

    if (rooms.length > 0) {
      const payload = rooms.map(r => ({
        id: r.id,
        session_id: pin,
        name: r.name
      }));
      await supabase.from('discussion_breakout_rooms').insert(payload);
    }

    set(state => ({
      discussionSessions: state.discussionSessions.map(s => s.id === pin ? { ...s, breakoutRooms: rooms } : s)
    }));
  },

  assignToRoom: async (pin, studentId, roomId) => {
    await supabase.from('discussion_participants').update({ current_room_id: roomId })
      .eq('session_id', pin).eq('student_id', studentId);

    set(state => ({
      discussionSessions: state.discussionSessions.map(s => {
        if (s.id !== pin) return s;
        return {
          ...s,
          participants: s.participants.map(p => p.studentId === studentId ? { ...p, currentRoomId: roomId } : p)
        };
      })
    }));
  },

  setDiscussionVisibility: async (pin, visibility) => {
    await supabase.from('discussion_sessions').update({ visibility }).eq('id', pin);

    set(state => ({
      discussionSessions: state.discussionSessions.map(s => s.id === pin ? { ...s, visibility } : s)
    }));
  },

  createDiscussionRound: async (pin, roundName) => {
    const newRound = {
      id: `round_${Date.now()}`,
      session_id: pin,
      name: roundName,
      created_at: new Date().toISOString()
    };

    await supabase.from('discussion_rounds').insert(newRound);
    await supabase.from('discussion_sessions').update({ active_round_id: newRound.id }).eq('id', pin);

    set(state => ({
      discussionSessions: state.discussionSessions.map(s => {
        if (s.id !== pin) return s;
        const r: DiscussionRound = { id: newRound.id, name: roundName, createdAt: newRound.created_at };
        return {
          ...s,
          rounds: [...s.rounds, r],
          activeRoundId: newRound.id
        };
      })
    }));
  },

  setActiveRound: async (pin, roundId) => {
    await supabase.from('discussion_sessions').update({ active_round_id: roundId }).eq('id', pin);

    set(state => ({
      discussionSessions: state.discussionSessions.map(s => s.id === pin ? { ...s, activeRoundId: roundId } : s)
    }));
  },

  endDiscussionSession: async (pin) => {
    await supabase.from('discussion_sessions').update({ status: 'FINISHED' }).eq('id', pin);

    set(state => ({
      discussionSessions: state.discussionSessions.map(s => s.id === pin ? { ...s, status: 'FINISHED' } : s)
    }));
  },

  deleteDiscussionSession: async (pin) => {
    const { error } = await supabase.from('discussion_sessions').delete().eq('id', pin);
    if (error) {
      console.error("Failed to delete session:", error);
      return false;
    }

    set(state => ({
      discussionSessions: state.discussionSessions.filter(s => s.id !== pin)
    }));
    return true;
  },

  // LIVE SESSIONS
  liveSessions: [],
  createLiveSession: (session) => set((state) => ({ liveSessions: [...state.liveSessions, session] })),
  updateLiveSessionStatus: (pin, status) => set((state) => ({ liveSessions: state.liveSessions.map(s => s.id === pin ? { ...s, status } : s) })),
  joinLiveSession: (pin, student) => { return true; }, // Mock
  updateLiveParticipantProgress: (pin, studentId, progress) => { },
});

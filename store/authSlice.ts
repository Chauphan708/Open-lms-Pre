import { StateCreator } from 'zustand';
import { AppState, User, CustomToolMenu } from '../types';
import { supabase } from '../services/supabaseClient';

export type AuthSliceState = Pick<AppState, 
  | 'user' | 'setUser'
  | 'users' | 'addUser' | 'updateUser' | 'deleteUser'
  | 'saveUserPrompt' | 'updateUserCustomTools' | 'changePassword'
>;

export const createAuthSlice: StateCreator<AppState, [], [], AuthSliceState> = (set, get) => ({
  // Session
  user: (() => {
    try {
      const stored = localStorage.getItem('user_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })(),
  setUser: (user) => {
    if (user) {
      localStorage.setItem('user_session', JSON.stringify(user));
    } else {
      localStorage.removeItem('user_session');
    }
    set({ user });
    get().fetchInitialData(); // Trigger refetch with new user context
  },

  // Users
  users: [],
  addUser: async (user: User, assignedClassId?: string) => {
    // Đảm bảo tạo UUID chuẩn ở Client và email định dạng hợp lệ để đồng bộ an toàn với Supabase Auth
    const cleanEmail = user.email.trim().toLowerCase();
    const formattedEmail = cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@openlms.edu`;
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const newUser = {
      ...user,
      id: newId,
      email: formattedEmail
    };

    const payload = {
      id: newId,
      name: newUser.name,
      email: formattedEmail,
      role: newUser.role,
      avatar: newUser.avatar,
      password: newUser.password,
      class_name: newUser.className,
      gender: newUser.gender,
      saved_prompts: newUser.savedPrompts,
      custom_tools: newUser.customTools
    };
    
    let { error } = await supabase.from('profiles').insert(payload);

    if (error) {
      console.error("Error creating user ultimate:", error);
      alert("Lỗi tạo người dùng: " + error.message);
      return;
    }

    set((state) => ({ users: [...state.users, newUser] }));

    if (assignedClassId && newUser.role === 'STUDENT') {
      const state = get();
      const targetClass = state.classes.find(c => c.id === assignedClassId);

      if (targetClass) {
        const updatedStudentIds = [...targetClass.studentIds, newUser.id];
        const updatedClass = { ...targetClass, studentIds: updatedStudentIds };

        let { error: clsError } = await supabase.from('classes')
          .update({ student_ids: updatedStudentIds })
          .eq('id', assignedClassId);

        if (!clsError) {
          set(s => ({
            classes: s.classes.map(c => c.id === assignedClassId ? updatedClass : c)
          }));
        } else {
          console.error("Error updating class student list:", clsError);
        }
      }
    }
  },

  updateUser: async (updatedUser) => {
    const payload = {
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      avatar: updatedUser.avatar,
      password: updatedUser.password,
      class_name: updatedUser.className,
      gender: updatedUser.gender,
      saved_prompts: updatedUser.savedPrompts,
      custom_tools: updatedUser.customTools
    };
    const { error } = await supabase.from('profiles').update(payload).eq('id', updatedUser.id);
    if (!error) {
      set((state) => ({
        users: state.users.map(u => u.id === updatedUser.id ? updatedUser : u),
        user: state.user && state.user.id === updatedUser.id ? updatedUser : state.user
      }));
    }
  },

  deleteUser: async (userId) => {
    const state = get();
    const affectedClass = state.classes.find(c => c.studentIds?.includes(userId));
    if (affectedClass) {
      const updatedStudentIds = affectedClass.studentIds.filter(id => id !== userId);
      let { error: clsError } = await supabase.from('classes')
        .update({ studentIds: updatedStudentIds })
        .eq('id', affectedClass.id);

      if (!clsError) {
        set(s => ({
          classes: s.classes.map(c => c.id === affectedClass.id ? { ...c, studentIds: updatedStudentIds } : c)
        }));
      } else {
        console.error("Failed to remove student from class before deletion", clsError);
      }
    }

    await Promise.all([
      supabase.from('attempts').delete().eq('studentId', userId),
      supabase.from('notifications').delete().eq('userId', userId),
      supabase.from('arena_matches').delete().eq('player1_id', userId),
      supabase.from('arena_matches').delete().eq('player2_id', userId),
      supabase.from('arena_match_events').delete().eq('player_id', userId),
    ]);

    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) {
      console.error("Delete user error", error);
      return false;
    }

    set((state) => ({
      users: state.users.filter(u => u.id !== userId)
    }));

    return true;
  },

  changePassword: async (userId, newPass) => {
    const { error } = await supabase.from('profiles').update({ password: newPass }).eq('id', userId);
    if (error) return false;
    set(state => ({
      users: state.users.map(u => u.id === userId ? { ...u, password: newPass } : u),
      user: state.user && state.user.id === userId ? { ...state.user, password: newPass } : state.user
    }));
    return true;
  },

  saveUserPrompt: (prompt) => set(state => {
    if (!state.user) return state;
    const isTeacherInfo = state.user.id !== 'admin1' && state.user.id !== 'teacher1' && state.user.id !== 'student1';

    if (isTeacherInfo && state.user.id) {
      supabase.from('profiles').update({
        savedPrompts: [...(state.user.savedPrompts || []), prompt]
      }).eq('id', state.user.id).then();
    }

    const updatedUser = {
      ...state.user,
      savedPrompts: [...(state.user.savedPrompts || []), prompt]
    };
    localStorage.setItem('user_session', JSON.stringify(updatedUser));
    return { user: updatedUser, users: state.users.map(u => u.id === updatedUser.id ? updatedUser : u) };
  }),

  updateUserCustomTools: (tools: CustomToolMenu[]) => set(state => {
    if (!state.user) return state;
    const isTeacherInfo = state.user.id !== 'admin1' && state.user.id !== 'teacher1' && state.user.id !== 'student1';

    if (isTeacherInfo && state.user.id) {
      supabase.from('profiles').update({ customTools: tools }).eq('id', state.user.id).then();
    }

    const updatedUser = {
      ...state.user,
      customTools: tools
    };

    const updatedUsers = state.users.map(u =>
      u.id === state.user!.id ? { ...u, customTools: tools } : u
    );

    localStorage.setItem('user_session', JSON.stringify(updatedUser));
    return { user: updatedUser, users: updatedUsers };
  })
});

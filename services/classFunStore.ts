import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

// --- Types ---
export interface ClassGroup {
  id: string;
  class_id: string;
  name: string;
  color: string;
  sort_order: number;
}

export interface Behavior {
  id: string;
  teacher_id: string;
  description: string;
  type: 'POSITIVE' | 'NEGATIVE';
  points: number;
}

export interface BehaviorLog {
  id: string;
  student_id: string;
  class_id: string;
  behavior_id: string | null;
  points: number;
  reason: string | null;
  recorded_by: string | null;
  created_at: string;
  // Joined fields
  student_name?: string;
  group_name?: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: 'present' | 'excused' | 'unexcused';
}

export interface GroupMember {
  group_id: string;
  student_id: string;
  sort_order: number;
}

import { ClassSeatingChart } from '../types';

// --- Store Interface ---
interface ClassFunState {
  // Data
  groups: ClassGroup[];
  behaviors: Behavior[];
  logs: BehaviorLog[];
  attendance: AttendanceRecord[];
  groupMembers: GroupMember[];
  seatingChart: ClassSeatingChart | null;
  isLoading: boolean;
  hasMoreLogs: boolean;
  autoPointThresholds: { id: string; percentage: number; points: number }[];

  // Actions - Groups
  fetchClassFunData: (classId: string, teacherId: string) => Promise<void>;
  addGroup: (group: Omit<ClassGroup, 'id'>) => Promise<void>;
  updateGroup: (id: string, data: Partial<ClassGroup>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  addStudentToGroup: (groupId: string, studentId: string) => Promise<void>;
  removeStudentFromGroup: (groupId: string, studentId: string) => Promise<void>;

  // Actions - Behaviors
  addBehavior: (behavior: Omit<Behavior, 'id'>) => Promise<void>;
  updateBehavior: (id: string, data: Partial<Behavior>) => Promise<void>;
  deleteBehavior: (id: string) => Promise<void>;

  // Actions - Logs (Points)
  addBehaviorLog: (log: Omit<BehaviorLog, 'id' | 'created_at'>) => Promise<void>;
  batchAddBehaviorLogs: (logs: Omit<BehaviorLog, 'id' | 'created_at'>[]) => Promise<void>;
  fetchStudentLogs: (studentId: string) => Promise<void>;
  fetchAllBehaviorLogs: (classId: string) => Promise<void>;
  loadMoreBehaviorLogs: (classId: string) => Promise<void>;
  deleteBehaviorLog: (id: string) => Promise<void>;

  // Actions - Attendance
  saveAttendance: (records: Omit<AttendanceRecord, 'id'>[]) => Promise<void>;
  fetchAttendance: (classId: string, date: string) => Promise<void>;

  // Actions - Seating Chart
  fetchSeatingChart: (classId: string) => Promise<void>;
  saveSeatingChart: (chart: Omit<ClassSeatingChart, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;

  // Actions - Auto Point Settings
  fetchPointThresholds: (teacherId: string) => Promise<void>;
  savePointThresholds: (teacherId: string, thresholds: { percentage: number, points: number }[]) => Promise<void>;
  updateBehaviorLog: (id: string, data: Partial<BehaviorLog>) => Promise<void>;
  updateStudentOrder: (groupId: string, orders: { student_id: string; sort_order: number }[]) => Promise<void>;
  moveStudentToGroup: (fromGroupId: string, toGroupId: string, studentId: string, newPosition?: number) => Promise<void>;
}

export const useClassFunStore = create<ClassFunState>((set, get) => ({
  groups: [],
  behaviors: [],
  logs: [],
  attendance: [],
  groupMembers: [],
  seatingChart: null,
  isLoading: false,
  hasMoreLogs: true,
  autoPointThresholds: [],

  // --- Fetch all data for a class ---
  fetchClassFunData: async (classId, teacherId) => {
    set({ isLoading: true });
    try {
      // Fetch groups
      const { data: groups } = await supabase
        .from('class_groups')
        .select('*')
        .eq('class_id', classId)
        .order('sort_order');

      // Fetch behaviors for this teacher
      const { data: behaviors } = await supabase
        .from('behaviors')
        .select('*')
        .eq('teacher_id', teacherId);

      // Fetch behavior logs for this class (last 100 entries instead of 500)
      const { data: logs } = await supabase
        .from('behavior_logs')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: false })
        .limit(100);

      // Fetch group members
      const groupIds = (groups || []).map(g => g.id);
      let groupMembers: GroupMember[] = [];
      if (groupIds.length > 0) {
        const { data: members } = await supabase
          .from('class_group_members')
          .select('*')
          .in('group_id', groupIds)
          .order('sort_order', { ascending: true });
        groupMembers = (members || []) as GroupMember[];
      }

      set({
        groups: (groups || []) as ClassGroup[],
        behaviors: (behaviors || []) as Behavior[],
        logs: (logs || []) as BehaviorLog[],
        groupMembers,
        hasMoreLogs: (logs || []).length === 100,
      });
    } catch (e) {
      console.error('Error fetching ClassFun data:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  // --- Groups ---
  addGroup: async (group) => {
    const newId = `grp_${Date.now()}`;
    const newGroup = { ...group, id: newId };
    const { error } = await supabase.from('class_groups').insert(newGroup);
    if (!error) set(s => ({ groups: [...s.groups, newGroup as ClassGroup] }));
  },

  updateGroup: async (id, data) => {
    const { error } = await supabase.from('class_groups').update(data).eq('id', id);
    if (!error) set(s => ({ groups: s.groups.map(g => g.id === id ? { ...g, ...data } : g) }));
  },

  deleteGroup: async (id) => {
    const { error } = await supabase.from('class_groups').delete().eq('id', id);
    if (!error) set(s => ({
      groups: s.groups.filter(g => g.id !== id),
      groupMembers: s.groupMembers.filter(m => m.group_id !== id),
    }));
  },

  addStudentToGroup: async (groupId, studentId) => {
    // Get current max sort_order
    const currentMembers = get().groupMembers.filter(m => m.group_id === groupId);
    const maxSort = currentMembers.length > 0 ? Math.max(...currentMembers.map(m => m.sort_order)) : -1;
    const newSortOrder = maxSort + 1;

    const { error } = await supabase.from('class_group_members').insert({ 
      group_id: groupId, 
      student_id: studentId,
      sort_order: newSortOrder
    });
    
    if (!error) set(s => ({ 
      groupMembers: [...s.groupMembers, { group_id: groupId, student_id: studentId, sort_order: newSortOrder }] 
    }));
  },

  removeStudentFromGroup: async (groupId, studentId) => {
    const { error } = await supabase.from('class_group_members').delete()
      .eq('group_id', groupId).eq('student_id', studentId);
    if (!error) set(s => ({
      groupMembers: s.groupMembers.filter(m => !(m.group_id === groupId && m.student_id === studentId)),
    }));
  },

  // --- Behaviors ---
  addBehavior: async (behavior) => {
    const newId = `beh_${Date.now()}`;
    const newBehavior = { ...behavior, id: newId };
    const { error } = await supabase.from('behaviors').insert(newBehavior);
    if (!error) set(s => ({ behaviors: [...s.behaviors, newBehavior as Behavior] }));
  },

  updateBehavior: async (id, data) => {
    const { error } = await supabase.from('behaviors').update(data).eq('id', id);
    if (!error) set(s => ({ behaviors: s.behaviors.map(b => b.id === id ? { ...b, ...data } : b) }));
  },

  deleteBehavior: async (id) => {
    const { error } = await supabase.from('behaviors').delete().eq('id', id);
    if (!error) set(s => ({ behaviors: s.behaviors.filter(b => b.id !== id) }));
  },

  // --- Logs (Points) ---
  addBehaviorLog: async (log) => {
    const newId = `log_${Date.now()}`;
    const newLog = { ...log, id: newId, created_at: new Date().toISOString() };
    const { error } = await supabase.from('behavior_logs').insert(newLog);
    if (!error) set(s => ({ logs: [newLog as BehaviorLog, ...s.logs] }));
  },

  batchAddBehaviorLogs: async (logs) => {
    const newLogs = logs.map((log, i) => ({
      ...log,
      id: `log_${Date.now()}_${i}`,
      created_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('behavior_logs').insert(newLogs);
    if (!error) set(s => ({ logs: [...(newLogs as BehaviorLog[]), ...s.logs] }));
  },

  fetchStudentLogs: async (studentId) => {
    const { data } = await supabase
      .from('behavior_logs')
      .select('*, behaviors(*)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    if (data) {
      // Map behavior description if joined
      const mappedLogs = data.map(d => ({
        ...d,
        reason: d.reason || d.behaviors?.description || 'Ghi nhận hành vi'
      }));
      set({ logs: mappedLogs as BehaviorLog[] });
    }
  },

  fetchAllBehaviorLogs: async (classId) => {
    const { data } = await supabase
      .from('behavior_logs')
      .select('*, behaviors(*)')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });
    if (data) {
      // Map behavior description if joined
      const mappedLogs = data.map(d => ({
        ...d,
        reason: d.reason || d.behaviors?.description || 'Ghi nhận hành vi'
      }));
      set({ logs: mappedLogs as BehaviorLog[] });
    }
  },

  loadMoreBehaviorLogs: async (classId) => {
    const currentLogs = get().logs;
    const lastLog = currentLogs[currentLogs.length - 1];
    if (!lastLog) return;

    // Convert current logs' max length safely
    const fetchLimit = 100;

    const { data } = await supabase
      .from('behavior_logs')
      .select('*, behaviors(*)')
      .eq('class_id', classId)
      .lt('created_at', lastLog.created_at) // Pagination key
      .order('created_at', { ascending: false })
      .limit(fetchLimit);

    if (data && data.length > 0) {
      const mappedLogs = data.map(d => ({
        ...d,
        reason: d.reason || d.behaviors?.description || 'Ghi nhận hành vi'
      }));
      set(s => ({
        logs: [...s.logs, ...(mappedLogs as BehaviorLog[])],
        hasMoreLogs: data.length === fetchLimit
      }));
    } else {
      set({ hasMoreLogs: false });
    }
  },

  deleteBehaviorLog: async (id) => {
    const { error } = await supabase.from('behavior_logs').delete().eq('id', id);
    if (!error) set(s => ({ logs: s.logs.filter(l => l.id !== id) }));
  },

  // --- Attendance ---
  saveAttendance: async (records) => {
    // Upsert: nếu đã tồn tại thì cập nhật, chưa có thì thêm mới
    const upsertData = records.map(r => ({
      ...r,
      id: `att_${r.student_id}_${r.date}`,
    }));
    const { error } = await supabase.from('attendance').upsert(upsertData, {
      onConflict: 'student_id,class_id,date',
    });
    if (!error) {
      // Refresh attendance for the date
      const date = records[0]?.date;
      const classId = records[0]?.class_id;
      if (date && classId) {
        const { data } = await supabase.from('attendance').select('*')
          .eq('class_id', classId).eq('date', date);
        if (data) set({ attendance: data as AttendanceRecord[] });
      }
    }
  },

  fetchAttendance: async (classId, date) => {
    const { data } = await supabase.from('attendance').select('*')
      .eq('class_id', classId).eq('date', date);
    if (data) set({ attendance: data as AttendanceRecord[] });
  },

  // --- Seating Chart ---
  fetchSeatingChart: async (classId) => {
    const { data } = await supabase
      .from('class_seating_charts')
      .select('*')
      .eq('class_id', classId)
      .single();

    if (data) {
      set({
        seatingChart: {
          id: data.id,
          classId: data.class_id,
          rows: data.rows,
          columns: data.columns,
          seats: data.seats,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        } as ClassSeatingChart
      });
    } else {
      set({ seatingChart: null });
    }
  },

  saveSeatingChart: async (chart) => {
    const dbChart = {
      class_id: chart.classId,
      rows: chart.rows,
      columns: chart.columns,
      seats: chart.seats
    };

    // Upsert equivalent: check if exists
    const { data: existing } = await supabase
      .from('class_seating_charts')
      .select('id')
      .eq('class_id', chart.classId)
      .single();

    if (existing) {
      const { data, error } = await supabase
        .from('class_seating_charts')
        .update(dbChart)
        .eq('class_id', chart.classId)
        .select()
        .single();

      if (!error && data) {
        set({
          seatingChart: {
            id: data.id,
            classId: data.class_id,
            rows: data.rows,
            columns: data.columns,
            seats: data.seats,
            createdAt: data.created_at,
            updatedAt: data.updated_at
          } as ClassSeatingChart
        });
      }
    } else {
      const { data, error } = await supabase
        .from('class_seating_charts')
        .insert(dbChart)
        .select()
        .single();

      if (!error && data) {
        set({
          seatingChart: {
            id: data.id,
            classId: data.class_id,
            rows: data.rows,
            columns: data.columns,
            seats: data.seats,
            createdAt: data.created_at,
            updatedAt: data.updated_at
          } as ClassSeatingChart
        });
      }
    }
  },

  // --- Auto Point Settings & Manual Log Updates ---
  fetchPointThresholds: async (teacherId) => {
    const { data } = await supabase
      .from('teacher_auto_point_settings')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('percentage', { ascending: true });
    
    if (data) {
      set({ autoPointThresholds: data });
    } else {
      // Default thresholds if none exist
      set({ autoPointThresholds: [
        { id: 'def_1', percentage: 0, points: 1 },
        { id: 'def_2', percentage: 50, points: 3 },
        { id: 'def_3', percentage: 100, points: 5 }
      ]});
    }
  },

  savePointThresholds: async (teacherId, thresholds) => {
    // Delete existing
    await supabase.from('teacher_auto_point_settings').delete().eq('teacher_id', teacherId);
    
    // Insert new
    const toInsert = thresholds.map((t, idx) => ({
      teacher_id: teacherId,
      percentage: t.percentage,
      points: t.points,
      id: `pt_${Date.now()}_${idx}`
    }));
    
    const { error } = await supabase.from('teacher_auto_point_settings').insert(toInsert);
    if (!error) {
      set({ autoPointThresholds: toInsert as any });
    }
  },

  updateBehaviorLog: async (id, data) => {
    const { error } = await supabase
      .from('behavior_logs')
      .update(data)
      .eq('id', id);
    
    if (!error) {
      set(s => ({
        logs: s.logs.map(l => l.id === id ? { ...l, ...data } : l)
      }));
    }
  },

  updateStudentOrder: async (groupId, orders) => {
    // Optimistic update
    const currentMembers = get().groupMembers;
    const updatedMembers = currentMembers.map(m => {
      if (m.group_id === groupId) {
        const orderInfo = orders.find(o => o.student_id === m.student_id);
        if (orderInfo) return { ...m, sort_order: orderInfo.sort_order };
      }
      return m;
    });
    set({ groupMembers: updatedMembers });

    // Update DB
    for (const order of orders) {
      await supabase.from('class_group_members')
        .update({ sort_order: order.sort_order })
        .eq('group_id', groupId)
        .eq('student_id', order.student_id);
    }
  },

  moveStudentToGroup: async (fromGroupId, toGroupId, studentId, newPosition) => {
    // 1. Remove from old group
    await supabase.from('class_group_members').delete()
      .eq('group_id', fromGroupId).eq('student_id', studentId);
    
    // 2. Add to new group with specified or default position
    const membersInToGroup = get().groupMembers.filter(m => m.group_id === toGroupId);
    const maxSort = membersInToGroup.length > 0 ? Math.max(...membersInToGroup.map(m => m.sort_order)) : -1;
    const finalOrder = newPosition !== undefined ? newPosition : maxSort + 1;

    await supabase.from('class_group_members').insert({
      group_id: toGroupId,
      student_id: studentId,
      sort_order: finalOrder
    });

    // Update local state
    set(s => ({
      groupMembers: [
        ...s.groupMembers.filter(m => !(m.group_id === fromGroupId && m.student_id === studentId)),
        { group_id: toGroupId, student_id: studentId, sort_order: finalOrder }
      ]
    }));
  }
}));

import { StateCreator } from 'zustand';
import { AppState, AcademicYear, Class } from '../types';
import { supabase } from '../services/supabaseClient';

export type ClassSliceState = Pick<AppState,
  | 'academicYears' | 'addAcademicYear' | 'updateAcademicYear'
  | 'classes' | 'addClass' | 'updateClass' | 'deleteClass'
>;

export const createClassSlice: StateCreator<AppState, [], [], ClassSliceState> = (set, get) => ({
  academicYears: [],
  addAcademicYear: async (year) => {
    const { error } = await supabase.from('academic_years').insert(year);
    if (!error) set((state) => ({ academicYears: [...state.academicYears, year] }));
  },
  updateAcademicYear: async (updatedYear) => {
    const { error } = await supabase.from('academic_years').update(updatedYear).eq('id', updatedYear.id);
    if (!error) set((state) => ({
      academicYears: state.academicYears.map(y => y.id === updatedYear.id ? updatedYear : y)
    }));
  },

  classes: [],
  addClass: async (cls) => {
    const payload = {
      id: String(cls.id),
      name: cls.name,
      academic_year_id: String(cls.academicYearId),
      teacher_id: String(cls.teacherId),
      student_ids: Array.isArray(cls.studentIds) ? cls.studentIds.map((sid: any) => String(sid)) : []
    };

    const { error } = await supabase.from('classes').insert(payload);

    if (!error) {
      set((state) => ({ classes: [...state.classes, cls] }));
    } else {
      console.error("addClass ultimate error", error);
      alert("Lỗi tạo lớp học: " + error.message);
    }
  },
  updateClass: async (updatedClass) => {
    const oldClass = get().classes.find(c => c.id === updatedClass.id);
    const oldName = oldClass?.name;

    const payload = {
      name: updatedClass.name,
      academic_year_id: updatedClass.academicYearId,
      teacher_id: updatedClass.teacherId,
      student_ids: updatedClass.studentIds
    };
    const { error } = await supabase.from('classes').update(payload).eq('id', updatedClass.id);

    if (!error) {
      // 1. Cập nhật cơ sở dữ liệu supabase cho cột class_name của học sinh
      if (oldName && oldName !== updatedClass.name) {
        await supabase
          .from('profiles')
          .update({ class_name: updatedClass.name })
          .eq('class_name', oldName);
      }

      if (updatedClass.studentIds && updatedClass.studentIds.length > 0) {
        await supabase
          .from('profiles')
          .update({ class_name: updatedClass.name })
          .in('id', updatedClass.studentIds);
      }

      // 2. Cập nhật local state cho cả classes và users
      set((state: any) => {
        const nextClasses = state.classes.map((c: any) => c.id === updatedClass.id ? updatedClass : c);
        const nextUsers = state.users.map((u: any) => {
          const isExplicitStudent = updatedClass.studentIds?.includes(u.id);
          const matchesOldName = oldName && u.role === 'STUDENT' && (u.class_name || '').trim().toLowerCase() === oldName.trim().toLowerCase();
          
          if (isExplicitStudent || matchesOldName) {
            return { ...u, class_name: updatedClass.name, className: updatedClass.name };
          }
          return u;
        });
        return { classes: nextClasses, users: nextUsers };
      });
    } else {
      console.error("updateClass ultimate error", error);
      alert("Lỗi cập nhật lớp học: " + error.message);
    }
  },
  deleteClass: async (classId) => {
    const oldClass = get().classes.find(c => c.id === classId);
    const oldName = oldClass?.name;

    const { error } = await supabase.from('classes').delete().eq('id', classId);
    if (!error) {
      if (oldName) {
        await supabase
          .from('profiles')
          .update({ class_name: null })
          .eq('class_name', oldName);
      }

      set((state: any) => {
        const nextClasses = state.classes.filter((c: any) => c.id !== classId);
        const nextUsers = state.users.map((u: any) => {
          if (oldName && u.role === 'STUDENT' && (u.class_name || '').trim().toLowerCase() === oldName.trim().toLowerCase()) {
            return { ...u, class_name: '', className: '' };
          }
          return u;
        });
        return { classes: nextClasses, users: nextUsers };
      });
      return true;
    } else {
      console.error("deleteClass ultimate error", error);
      alert("Lỗi xóa lớp học: " + error.message);
      return false;
    }
  }
});

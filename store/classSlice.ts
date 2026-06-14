import { StateCreator } from 'zustand';
import { AppState, AcademicYear, Class } from '../types';
import { supabase } from '../services/supabaseClient';

export type ClassSliceState = Pick<AppState,
  | 'academicYears' | 'addAcademicYear' | 'updateAcademicYear'
  | 'classes' | 'addClass' | 'updateClass'
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
    const payload = {
      name: updatedClass.name,
      academic_year_id: updatedClass.academicYearId,
      teacher_id: updatedClass.teacherId,
      student_ids: updatedClass.studentIds
    };
    const { error } = await supabase.from('classes').update(payload).eq('id', updatedClass.id);

    if (!error) {
      set((state) => ({
        classes: state.classes.map(c => c.id === updatedClass.id ? updatedClass : c)
      }));
    } else {
      console.error("updateClass ultimate error", error);
      alert("Lỗi cập nhật lớp học: " + error.message);
    }
  }
});

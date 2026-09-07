import { StateCreator } from 'zustand';
import { AppState, AcademicYear, Class } from '../types';
import { supabase } from '../services/supabaseClient';

export type ClassSliceState = Pick<AppState,
  | 'academicYears' | 'addAcademicYear' | 'updateAcademicYear' | 'setActiveAcademicYear' | 'deleteAcademicYear'
  | 'classes' | 'addClass' | 'updateClass' | 'deleteClass'
>;

export const createClassSlice: StateCreator<AppState, [], [], ClassSliceState> = (set, get) => ({
  academicYears: [],
  addAcademicYear: async (year) => {
    const payload: any = {
      id: year.id,
      name: year.name,
      isActive: Boolean(year.isActive),
      semesters: year.semesters
    };
    let { error } = await supabase.from('academic_years').insert(payload);
    if (error && error.message?.toLowerCase().includes('isactive')) {
      const fallbackPayload = {
        id: year.id,
        name: year.name,
        is_active: Boolean(year.isActive),
        semesters: year.semesters
      };
      const res = await supabase.from('academic_years').insert(fallbackPayload);
      error = res.error;
    }

    if (!error) {
      if (year.isActive) {
        await supabase.from('academic_years').update({ isActive: false }).neq('id', year.id);
        set((state) => {
          const next = [...state.academicYears.map(y => ({ ...y, isActive: false })), year];
          localStorage.setItem('cache_initial_years', JSON.stringify(next));
          return { academicYears: next };
        });
      } else {
        set((state) => {
          const next = [...state.academicYears, year];
          localStorage.setItem('cache_initial_years', JSON.stringify(next));
          return { academicYears: next };
        });
      }
    } else {
      console.error("addAcademicYear error", error);
      alert("Lỗi thêm năm học: " + error.message);
    }
  },
  updateAcademicYear: async (updatedYear) => {
    const payload: any = {
      name: updatedYear.name,
      isActive: Boolean(updatedYear.isActive),
      semesters: updatedYear.semesters
    };
    let { error } = await supabase.from('academic_years').update(payload).eq('id', updatedYear.id);
    if (error && error.message?.toLowerCase().includes('isactive')) {
      const fallbackPayload = {
        name: updatedYear.name,
        is_active: Boolean(updatedYear.isActive),
        semesters: updatedYear.semesters
      };
      const res = await supabase.from('academic_years').update(fallbackPayload).eq('id', updatedYear.id);
      error = res.error;
    }

    if (!error) {
      if (updatedYear.isActive) {
        await supabase.from('academic_years').update({ isActive: false }).neq('id', updatedYear.id);
        set((state) => {
          const next = state.academicYears.map(y => y.id === updatedYear.id ? updatedYear : { ...y, isActive: false });
          localStorage.setItem('cache_initial_years', JSON.stringify(next));
          return { academicYears: next };
        });
      } else {
        set((state) => {
          const next = state.academicYears.map(y => y.id === updatedYear.id ? updatedYear : y);
          localStorage.setItem('cache_initial_years', JSON.stringify(next));
          return { academicYears: next };
        });
      }
    } else {
      console.error("updateAcademicYear error", error);
      alert("Lỗi cập nhật năm học: " + error.message);
    }
  },
  setActiveAcademicYear: async (yearId: string) => {
    try {
      let { error } = await supabase.from('academic_years').update({ isActive: true }).eq('id', yearId);
      if (error && error.message?.toLowerCase().includes('isactive')) {
        await supabase.from('academic_years').update({ is_active: false }).neq('id', yearId);
        const res = await supabase.from('academic_years').update({ is_active: true }).eq('id', yearId);
        error = res.error;
      } else if (!error) {
        await supabase.from('academic_years').update({ isActive: false }).neq('id', yearId);
      }

      if (!error) {
        set((state) => {
          const next = state.academicYears.map(y => ({
            ...y,
            isActive: y.id === yearId
          }));
          localStorage.setItem('cache_initial_years', JSON.stringify(next));
          return { academicYears: next };
        });
        return true;
      } else {
        console.error("setActiveAcademicYear error", error);
        alert("Lỗi kích hoạt năm học: " + error.message);
        return false;
      }
    } catch (e: any) {
      console.error("setActiveAcademicYear error", e);
      return false;
    }
  },
  deleteAcademicYear: async (yearId: string) => {
    // Kiểm tra trực tiếp trong CSDL toàn trường
    const { data: dbClasses } = await supabase.from('classes').select('id, name').eq('academic_year_id', yearId).limit(1);
    if (dbClasses && dbClasses.length > 0) {
      alert(`Không thể xóa năm học này vì đang có lớp học trực thuộc trong trường (VD: lớp ${dbClasses[0].name}). Vui lòng chuyển hoặc xóa các lớp liên quan trước.`);
      return false;
    }

    const classesUsingYear = get().classes.filter(c => c.academicYearId === yearId);
    if (classesUsingYear.length > 0) {
      alert(`Không thể xóa năm học này vì đang có ${classesUsingYear.length} lớp học trực thuộc. Vui lòng chuyển hoặc xóa các lớp liên quan trước.`);
      return false;
    }
    const { error } = await supabase.from('academic_years').delete().eq('id', yearId);
    if (!error) {
      set((state) => {
        const next = state.academicYears.filter(y => y.id !== yearId);
        localStorage.setItem('cache_initial_years', JSON.stringify(next));
        return { academicYears: next };
      });
      return true;
    } else {
      console.error("deleteAcademicYear error", error);
      alert("Lỗi xóa năm học: " + error.message);
      return false;
    }
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

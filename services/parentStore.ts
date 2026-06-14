import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './supabaseClient';
import { Parent, ParentStudentLink, User } from '../types';

interface ParentState {
  currentParent: Parent | null;
  linkedStudents: User[];
  isParentLoading: boolean;

  // Actions
  parentRegister: (name: string, email: string, password: string, phone?: string) => Promise<{ success: boolean; message: string }>;
  parentLogin: (linkCodeOrEmail: string, password?: string) => Promise<{ success: boolean; message: string }>;
  parentLogout: () => void;
  fetchLinkedStudents: () => Promise<void>;
  linkStudent: (studentEmailOrUsername: string) => Promise<{ success: boolean; message: string }>;
}

export const useParentStore = create<ParentState>()(
  persist(
    (set, get) => ({
      currentParent: null,
      linkedStudents: [],
      isParentLoading: false,

      parentRegister: async (name, email, password, phone) => {
        set({ isParentLoading: true });
        try {
          const cleanEmail = email.toLowerCase().trim();
          
          // 1. Kiểm tra xem email đã tồn tại chưa
          const { data: existingParent } = await supabase
            .from('parents')
            .select('id')
            .eq('email', cleanEmail)
            .maybeSingle();

          if (existingParent) {
            return { success: false, message: 'Email này đã được đăng ký tài khoản phụ huynh.' };
          }

          // 2. Tạo ID và Link Code ngẫu nhiên
          const parentId = `par_${Date.now()}`;
          const linkCode = 'P' + Math.floor(10000 + Math.random() * 90000).toString(); // e.g. P18342

          // 3. Chèn vào bảng public.parents (trigger tr_parents_insert_sync_auth tự động tạo auth.users)
          const { error: insertErr } = await supabase
            .from('parents')
            .insert({
              id: parentId,
              name: name.trim(),
              email: cleanEmail,
              phone: phone ? phone.trim() : null,
              password, // trigger will encrypt this in auth.users
              link_code: linkCode
            });

          if (insertErr) {
            console.error('Insert parents error:', insertErr);
            return { success: false, message: 'Lỗi đăng ký tài khoản: ' + insertErr.message };
          }

          return { success: true, message: 'Đăng ký thành công! Bạn có thể đăng nhập ngay.' };
        } catch (e: any) {
          console.error('Lỗi đăng ký phụ huynh:', e);
          return { success: false, message: 'Lỗi hệ thống khi đăng ký.' };
        } finally {
          set({ isParentLoading: false });
        }
      },

      parentLogin: async (linkCodeOrEmail, password) => {
        set({ isParentLoading: true });
        try {
          let parentData: Parent | null = null;

          // Hỗ trợ Đăng nhập bằng Email & Mật khẩu
          if (linkCodeOrEmail.includes('@')) {
            const cleanEmail = linkCodeOrEmail.toLowerCase().trim();
            // Đăng nhập bảo mật qua Supabase Auth
            const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password: password || ''
            });

            if (authErr || !authData.user) {
              return { success: false, message: 'Email hoặc mật khẩu không chính xác.' };
            }

            // Lấy thông tin profile phụ huynh tương ứng
            const { data, error } = await supabase
              .from('parents')
              .select('*')
              .eq('email', cleanEmail)
              .maybeSingle();

            if (error || !data) {
              return { success: false, message: 'Không tìm thấy hồ sơ phụ huynh.' };
            }
            parentData = data as Parent;
          } else {
            // Đăng nhập bằng mã liên kết tĩnh cũ (demo)
            const { data, error } = await supabase
              .from('parents')
              .select('*')
              .eq('link_code', linkCodeOrEmail.trim().toUpperCase())
              .maybeSingle();

            if (error || !data) {
              return { success: false, message: 'Mã liên kết không hợp lệ.' };
            }

            if (data.password && password && data.password !== password) {
              return { success: false, message: 'Mật khẩu không chính xác.' };
            }
            parentData = data as Parent;
          }

          // Cập nhật thời gian đăng nhập cuối
          const lastLogin = new Date().toISOString();
          await supabase.from('parents').update({ last_login_at: lastLogin }).eq('id', parentData.id);

          set({ currentParent: { ...parentData, last_login_at: lastLogin } as Parent });
          
          // Tải danh sách con liên kết
          await get().fetchLinkedStudents();

          return { success: true, message: 'Đăng nhập thành công.' };
        } catch (e: any) {
          console.error('Lỗi khi đăng nhập phụ huynh:', e);
          return { success: false, message: 'Lỗi hệ thống. Vui lòng thử lại sau.' };
        } finally {
          set({ isParentLoading: false });
        }
      },

      parentLogout: () => {
        set({ currentParent: null, linkedStudents: [] });
      },

      fetchLinkedStudents: async () => {
        const parent = get().currentParent;
        if (!parent) return;

        set({ isParentLoading: true });
        try {
          const { data: links } = await supabase
            .from('parent_student_links')
            .select('student_id')
            .eq('parent_id', parent.id);

          if (links && links.length > 0) {
            const studentIds = links.map(l => l.student_id);
            const { data: students } = await supabase
              .from('profiles')
              .select('*')
              .in('id', studentIds);

            if (students) {
              set({ linkedStudents: students as User[] });
            }
          } else {
            set({ linkedStudents: [] });
          }
        } catch (e) {
          console.error('Lỗi khi lấy danh sách học sinh liên kết:', e);
        } finally {
          set({ isParentLoading: false });
        }
      },

      linkStudent: async (studentEmailOrUsername) => {
        const parent = get().currentParent;
        if (!parent) return { success: false, message: 'Vui lòng đăng nhập.' };

        set({ isParentLoading: true });
        try {
          let searchEmail = studentEmailOrUsername.toLowerCase().trim();
          if (!searchEmail.includes('@')) {
            searchEmail = searchEmail + '@openlms.edu';
          }

          // 1. Tìm học sinh trong public.profiles
          const { data: student, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', searchEmail)
            .eq('role', 'STUDENT')
            .maybeSingle();

          if (error || !student) {
            return { success: false, message: 'Không tìm thấy học sinh với email hoặc username này.' };
          }

          // 2. Kiểm tra xem đã liên kết chưa
          const { data: existing } = await supabase
            .from('parent_student_links')
            .select('*')
            .eq('parent_id', parent.id)
            .eq('student_id', student.id)
            .maybeSingle();

          if (existing) {
            return { success: false, message: 'Học sinh này đã được liên kết từ trước.' };
          }

          // 3. Tạo liên kết mới
          const linkId = `link_${Date.now()}`;
          const { error: insertErr } = await supabase
            .from('parent_student_links')
            .insert({
              id: linkId,
              parent_id: parent.id,
              student_id: student.id,
              linked_by: parent.id
            });

          if (insertErr) {
            return { success: false, message: 'Lỗi khi tạo liên kết: ' + insertErr.message };
          }

          await get().fetchLinkedStudents();
          return { success: true, message: `Liên kết thành công với học sinh ${student.name}!` };
        } catch (e: any) {
          console.error('Lỗi liên kết học sinh:', e);
          return { success: false, message: 'Lỗi hệ thống.' };
        } finally {
          set({ isParentLoading: false });
        }
      }
    }),
    {
      name: 'openlms-parent-storage',
      // Khi load dữ liệu từ storage lên, ta sẽ tự động fetch lại danh sách con để đảm bảo dữ liệu mới nhất
      onRehydrateStorage: (state) => {
        return (state, error) => {
          if (!error && state?.currentParent) {
            state.fetchLinkedStudents();
          }
        }
      }
    }
  )
);

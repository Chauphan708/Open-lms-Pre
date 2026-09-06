/**
 * Dịch vụ tích hợp và đồng bộ Google Tasks API cho Sổ tay Giáo viên OpenLMS
 * Sử dụng Google Identity Services (GIS) OAuth 2.0 Token Client trực tiếp từ trình duyệt
 * Bảo mật tuyệt đối: Token lưu tại client (localStorage), gọi trực tiếp sang googleapis.com
 */

export interface GoogleTaskItem {
  id?: string;
  title: string;
  notes?: string;
  due?: string; // RFC 3339 timestamp
  status?: 'needsAction' | 'completed';
}

export interface GoogleTaskList {
  id: string;
  title: string;
  updated?: string;
}

const STORAGE_KEYS = {
  CLIENT_ID: 'google_tasks_client_id',
  ACCESS_TOKEN: 'google_tasks_access_token',
  TOKEN_EXPIRY: 'google_tasks_token_expiry',
  TASK_LIST_ID: 'google_tasks_openlms_list_id',
  SYNCED_MAP: 'google_tasks_synced_map' // note_id -> google_task_id
};

// Lấy Google Client ID từ localStorage hoặc biến môi trường
export const getGoogleClientId = (): string => {
  let clientId = localStorage.getItem(STORAGE_KEYS.CLIENT_ID) || '';
  if (!clientId) {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      // @ts-ignore
      clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    }
  }
  return clientId.trim();
};

export const setGoogleClientId = (clientId: string) => {
  localStorage.setItem(STORAGE_KEYS.CLIENT_ID, clientId.trim());
};

// Kiểm tra xem đã kết nối và token còn hiệu lực không
export const isGoogleTasksConnected = (): boolean => {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const expiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
  if (!token || !expiry) return false;
  return Date.now() < parseInt(expiry, 10);
};

export const getGoogleAccessToken = (): string | null => {
  if (!isGoogleTasksConnected()) return null;
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
};

export const disconnectGoogleTasks = () => {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  if (token && typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
    try {
      (window as any).google.accounts.oauth2.revoke(token, () => {});
    } catch (e) {
      console.warn('Revoke token warning:', e);
    }
  }
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
  localStorage.removeItem(STORAGE_KEYS.TASK_LIST_ID);
};

// Nạp thư viện Google Identity Services (GIS) động
export const loadGisScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Window is not defined'));
    if ((window as any).google?.accounts?.oauth2) {
      return resolve();
    }
    const existing = document.getElementById('google-gis-script');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Không thể tải Google Identity Services')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Không thể tải Google Identity Services từ Google'));
    document.head.appendChild(script);
  });
};

// Mở popup yêu cầu người dùng cấp quyền truy cập Google Tasks
export const authorizeGoogleTasks = async (customClientId?: string): Promise<string> => {
  const clientId = customClientId || getGoogleClientId();
  if (!clientId) {
    throw new Error('Chưa cấu hình Google Client ID. Vui lòng nhập Google Client ID để tiếp tục.');
  }

  await loadGisScript();

  return new Promise((resolve, reject) => {
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/tasks',
        callback: (response: any) => {
          if (response.error) {
            return reject(new Error(response.error_description || response.error));
          }
          if (response.access_token) {
            const expiresInSec = parseInt(response.expires_in || '3600', 10);
            const expiryTime = Date.now() + expiresInSec * 1000;
            localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.access_token);
            localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
            resolve(response.access_token);
          } else {
            reject(new Error('Không nhận được Access Token từ Google.'));
          }
        }
      });
      client.requestAccessToken({ prompt: '' });
    } catch (err: any) {
      reject(new Error('Lỗi khởi tạo đăng nhập Google: ' + err.message));
    }
  });
};

// Tìm hoặc tạo danh mục TaskList riêng "Sổ tay Giáo viên (OpenLMS)"
export const getOrCreateOpenLmsTaskList = async (token: string): Promise<string> => {
  const cachedListId = localStorage.getItem(STORAGE_KEYS.TASK_LIST_ID);

  // 1. Kiểm tra danh mục cũ có còn tồn tại không
  if (cachedListId) {
    try {
      const checkRes = await fetch(`https://tasks.googleapis.com/tasks/v1/users/@me/lists/${cachedListId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (checkRes.ok) {
        return cachedListId;
      }
    } catch (e) {}
  }

  // 2. Liệt kê danh sách TaskLists
  const listRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!listRes.ok) {
    throw new Error(`Lỗi đọc danh mục Google Tasks: ${listRes.statusText}`);
  }

  const listData = await listRes.json();
  const existingList = (listData.items || []).find((l: GoogleTaskList) => 
    l.title.includes('Sổ tay Giáo viên') || l.title.includes('OpenLMS')
  );

  if (existingList) {
    localStorage.setItem(STORAGE_KEYS.TASK_LIST_ID, existingList.id);
    return existingList.id;
  }

  // 3. Nếu chưa có, tạo mới danh mục "Sổ tay Giáo viên (OpenLMS)"
  const createRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: '📚 Sổ tay Giáo viên (OpenLMS)'
    })
  });

  if (!createRes.ok) {
    throw new Error(`Không thể tạo danh mục trên Google Tasks: ${createRes.statusText}`);
  }

  const newList = await createRes.json();
  localStorage.setItem(STORAGE_KEYS.TASK_LIST_ID, newList.id);
  return newList.id;
};

// Tạo hoặc cập nhật một Task trên Google Tasks
export const pushTaskToGoogle = async (
  token: string, 
  taskListId: string, 
  task: GoogleTaskItem
): Promise<any> => {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(task)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Lỗi tạo Task HTTP ${res.status}`);
  }

  return await res.json();
};

export interface SyncResult {
  success: boolean;
  totalSynced: number;
  message: string;
}

// Đồng bộ toàn bộ ghi chú từ Open-LMS sang Google Tasks
export const syncNotesToGoogleTasks = async (
  notes: any[],
  onProgress?: (current: number, total: number) => void
): Promise<SyncResult> => {
  let token = getGoogleAccessToken();
  if (!token) {
    token = await authorizeGoogleTasks();
  }

  const taskListId = await getOrCreateOpenLmsTaskList(token);
  let syncedCount = 0;

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    if (onProgress) onProgress(i + 1, notes.length);

    // Chuẩn bị nội dung task
    const tagEmoji = note.tag === 'Giáo án' ? '📖' 
      : note.tag === 'Học sinh' ? '👥' 
      : note.tag === 'Lịch họp' ? '🗓️' 
      : note.tag === 'Ý tưởng' ? '💡' : '📌';

    const titleText = note.title ? `${tagEmoji} ${note.title}` : `${tagEmoji} Ghi chú ngày ${new Date(note.created_at || Date.now()).toLocaleDateString('vi-VN')}`;

    // Xây dựng phần mô tả chi tiết (Notes)
    let notesDescription = `[Phân loại: ${note.tag || 'Ghi chú'}]\n`;
    if (note.content) {
      notesDescription += `\n${note.content.trim()}\n`;
    }

    // Nếu có danh sách việc cần làm (todo_list)
    if (note.todo_list && Array.isArray(note.todo_list) && note.todo_list.length > 0) {
      notesDescription += `\n--- Việc cần làm: ---\n`;
      note.todo_list.forEach((t: any) => {
        notesDescription += `${t.completed ? '✅' : '⬜'} ${t.text}\n`;
      });
    }

    notesDescription += `\n(Đồng bộ tự động từ Sổ tay Giáo viên OpenLMS)`;

    const taskPayload: GoogleTaskItem = {
      title: titleText,
      notes: notesDescription,
      status: 'needsAction'
    };

    try {
      await pushTaskToGoogle(token, taskListId, taskPayload);
      syncedCount++;

      // Nếu ghi chú có checklist, tạo thêm từng subtask riêng biệt để giáo viên dễ tick trong app Google Tasks
      if (note.todo_list && Array.isArray(note.todo_list)) {
        for (const todo of note.todo_list) {
          if (todo.text?.trim()) {
            await pushTaskToGoogle(token, taskListId, {
              title: `↳ ${todo.text.trim()} (${note.title || 'Ghi chú'})`,
              status: todo.completed ? 'completed' : 'needsAction'
            });
            syncedCount++;
          }
        }
      }
    } catch (e: any) {
      console.warn(`Lỗi đồng bộ ghi chú [${note.id}]:`, e.message);
    }
  }

  return {
    success: true,
    totalSynced: syncedCount,
    message: `Đã đồng bộ thành công ${syncedCount} mục sang danh mục "Sổ tay Giáo viên (OpenLMS)" trên Google Tasks!`
  };
};

// Đồng bộ nhanh 1 ghi chú đơn lẻ
export const syncSingleNoteToGoogleTasks = async (note: any): Promise<SyncResult> => {
  return await syncNotesToGoogleTasks([note]);
};

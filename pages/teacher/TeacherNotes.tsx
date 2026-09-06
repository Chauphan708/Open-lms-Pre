import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store';
import { supabase } from '../../services/supabaseClient';
import {
  StickyNote, Search, Plus, Pin, Trash2, Edit3, Save, X, Tag,
  Grid, List, CheckSquare, Calendar, Users, BookOpen, AlertCircle, Bookmark, CheckCircle2,
  RefreshCw, Check, HelpCircle, ExternalLink, Sparkles, Settings, LogOut, Key, Copy, CheckCheck
} from 'lucide-react';
import {
  isGoogleTasksConnected,
  getGoogleClientId,
  setGoogleClientId,
  authorizeGoogleTasks,
  disconnectGoogleTasks,
  syncNotesToGoogleTasks,
  syncSingleNoteToGoogleTasks
} from '../../services/googleTasksService';

interface TeacherNote {
  id: string;
  teacher_id: string;
  title: string;
  content: string;
  tag: string;
  color: string; // Tailwind bg color class or hex
  is_pinned: boolean;
  todo_list?: { text: string; completed: boolean }[];
  created_at: string;
  updated_at: string;
}

const TAG_OPTIONS = [
  { value: 'Giáo án', label: '📖 Giáo án & Bài giảng', icon: BookOpen, color: 'text-blue-500 bg-blue-50 border-blue-200' },
  { value: 'Học sinh', label: '👥 Theo dõi Học sinh', icon: Users, color: 'text-emerald-500 bg-emerald-50 border-emerald-200' },
  { value: 'Lịch họp', label: '🗓️ Lịch họp & Sự kiện', icon: Calendar, color: 'text-amber-500 bg-amber-50 border-amber-200' },
  { value: 'Ý tưởng', label: '💡 Ý tưởng & Sáng kiến', icon: Bookmark, color: 'text-purple-500 bg-purple-50 border-purple-200' },
  { value: 'Khác', label: '📌 Ghi chú khác', icon: StickyNote, color: 'text-gray-500 bg-gray-50 border-gray-200' }
];

const PASTEL_COLORS = [
  { hex: '#fef3c7', label: 'Vàng Pastel', text: '#78350f', border: '#fde68a' }, // Amber
  { hex: '#dcfce7', label: 'Xanh Lá', text: '#065f46', border: '#bbf7d0' }, // Green
  { hex: '#e0f2fe', label: 'Xanh Dương', text: '#075985', border: '#bae6fd' }, // Blue
  { hex: '#fce7f3', label: 'Hồng', text: '#9d174d', border: '#fbcfe8' }, // Pink
  { hex: '#f3e8ff', label: 'Tím', text: '#6b21a8', border: '#e9d5ff' }, // Purple
  { hex: '#f3f4f6', label: 'Xám', text: '#374151', border: '#e5e7eb' }  // Gray
];

const GEMINI_PROMPTS = [
  {
    category: '📅 Lập kế hoạch & Công việc',
    title: 'Tổng hợp việc cần làm hôm nay',
    prompt: '@Google Tasks Hãy xem danh mục "Sổ tay Giáo viên" và liệt kê tất cả các việc cần làm, chuẩn bị giáo án hoặc cuộc họp hôm nay.'
  },
  {
    category: '📖 Soạn giáo án & bài giảng',
    title: 'Phát triển dàn ý bài giảng từ ghi chú',
    prompt: '@Google Tasks Từ ghi chú giáo án mới nhất của tôi trong Google Tasks, hãy mở rộng thành kế hoạch bài dạy 45 phút chi tiết theo định hướng phát triển phẩm chất năng lực học sinh.'
  },
  {
    category: '👥 Quản lý & Theo dõi học sinh',
    title: 'Nhắc nhở học sinh cần quan tâm',
    prompt: '@Google Tasks Hãy lọc các ghi chú liên quan đến học sinh trong Sổ tay Giáo viên và tóm tắt những trường hợp tôi cần kiểm tra, động viên hoặc trao đổi với phụ huynh trong tuần này.'
  },
  {
    category: '💡 Ý tưởng & Đổi mới dạy học',
    title: 'Gợi ý giải pháp từ ý tưởng sư phạm',
    prompt: '@Google Tasks Đọc các ghi chú ý tưởng của tôi trong Google Tasks và gợi ý 3 cách áp dụng thực tế vào lớp học tuần này để tạo sự hứng khởi cho học sinh.'
  }
];

export const TeacherNotes: React.FC = () => {
  const { user: currentUser } = useStore();
  const [notes, setNotes] = useState<TeacherNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [useLocalStorageFallback, setUseLocalStorageFallback] = useState(false);

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('Tất cả');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modal Note states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Partial<TeacherNote> | null>(null);

  // Todo input state inside modal
  const [newTodoText, setNewTodoText] = useState('');

  // Google Tasks Integration States
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [syncingNoteId, setSyncingNoteId] = useState<string | null>(null);
  const [showClientIdModal, setShowClientIdModal] = useState<boolean>(false);
  const [clientIdInput, setClientIdInput] = useState<string>('');
  const [showGeminiGuideModal, setShowGeminiGuideModal] = useState<boolean>(false);
  const [copiedPromptIdx, setCopiedPromptIdx] = useState<number | null>(null);

  // Load Notes
  useEffect(() => {
    if (!currentUser) return;

    const loadNotes = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('teacher_notes')
          .select('*')
          .eq('teacher_id', currentUser.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setNotes(data || []);
      } catch (err) {
        console.warn("teacher_notes table not found or error. Using local storage fallback.");
        setUseLocalStorageFallback(true);
        const cached = localStorage.getItem(`notes_${currentUser.id}`);
        if (cached) {
          setNotes(JSON.parse(cached));
        }
      } finally {
        setLoading(false);
      }
    };

    loadNotes();
  }, [currentUser]);

  // Persist local storage fallback if enabled
  const saveToLocalStorage = (updatedNotes: TeacherNote[]) => {
    if (useLocalStorageFallback && currentUser) {
      localStorage.setItem(`notes_${currentUser.id}`, JSON.stringify(updatedNotes));
    }
  };

  // Check Google Tasks initial connection status and load client ID
  useEffect(() => {
    setIsGoogleConnected(isGoogleTasksConnected());
    setClientIdInput(getGoogleClientId());
  }, []);

  // Handle Google Tasks Authorization
  const handleConnectGoogle = async () => {
    const currentClientId = getGoogleClientId();
    if (!currentClientId) {
      setShowClientIdModal(true);
      return;
    }
    try {
      setIsSyncing(true);
      setSyncFeedback({ type: 'info', message: 'Đang kết nối tài khoản Google...' });
      await authorizeGoogleTasks(currentClientId);
      setIsGoogleConnected(true);
      setSyncFeedback({ type: 'success', message: 'Kết nối Google Tasks thành công! Bây giờ bạn có thể đồng bộ ghi chú.' });
    } catch (err: any) {
      console.error('Google Tasks connect error:', err);
      setSyncFeedback({ type: 'error', message: err.message || 'Không thể kết nối Google Tasks. Vui lòng kiểm tra lại Google Client ID.' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle Save Client ID
  const handleSaveClientId = () => {
    if (!clientIdInput.trim()) {
      alert('Vui lòng nhập Google Client ID.');
      return;
    }
    setGoogleClientId(clientIdInput.trim());
    setShowClientIdModal(false);
    setTimeout(() => {
      handleConnectGoogle();
    }, 250);
  };

  // Handle Disconnect
  const handleDisconnectGoogle = () => {
    if (window.confirm('Bạn có muốn ngắt kết nối với Google Tasks trên máy tính này?')) {
      disconnectGoogleTasks();
      setIsGoogleConnected(false);
      setSyncFeedback({ type: 'info', message: 'Đã ngắt kết nối với Google Tasks.' });
    }
  };

  // Handle Sync All Notes
  const handleSyncAllNotes = async () => {
    if (notes.length === 0) {
      setSyncFeedback({ type: 'info', message: 'Hiện chưa có ghi chú nào để đồng bộ.' });
      return;
    }

    const currentClientId = getGoogleClientId();
    if (!currentClientId) {
      setShowClientIdModal(true);
      return;
    }

    try {
      setIsSyncing(true);
      setSyncProgress({ current: 0, total: notes.length });
      setSyncFeedback({ type: 'info', message: 'Đang chuẩn bị đồng bộ sang Google Tasks...' });

      const result = await syncNotesToGoogleTasks(notes, (current, total) => {
        setSyncProgress({ current, total });
      });

      setIsGoogleConnected(true);
      setSyncFeedback({ type: 'success', message: result.message });
    } catch (err: any) {
      console.error('Sync all error:', err);
      if (err.message && err.message.includes('Chưa cấu hình Google Client ID')) {
        setShowClientIdModal(true);
      } else {
        setSyncFeedback({ type: 'error', message: err.message || 'Lỗi khi đồng bộ sang Google Tasks.' });
      }
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  // Handle Sync Single Note
  const handleSyncSingleNote = async (note: TeacherNote) => {
    const currentClientId = getGoogleClientId();
    if (!currentClientId) {
      setShowClientIdModal(true);
      return;
    }

    try {
      setSyncingNoteId(note.id);
      setSyncFeedback({ type: 'info', message: `Đang đẩy ghi chú "${note.title}" sang Google Tasks...` });

      await syncSingleNoteToGoogleTasks(note);
      setIsGoogleConnected(true);
      setSyncFeedback({ type: 'success', message: `Đã đẩy "${note.title}" sang Google Tasks thành công!` });
    } catch (err: any) {
      console.error('Sync single note error:', err);
      if (err.message && err.message.includes('Chưa cấu hình Google Client ID')) {
        setShowClientIdModal(true);
      } else {
        setSyncFeedback({ type: 'error', message: err.message || 'Lỗi khi đẩy ghi chú sang Google Tasks.' });
      }
    } finally {
      setSyncingNoteId(null);
    }
  };

  // Actions
  const handleOpenAddModal = () => {
    setEditingNote({
      title: '',
      content: '',
      tag: 'Giáo án',
      color: PASTEL_COLORS[0].hex,
      is_pinned: false,
      todo_list: []
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (note: TeacherNote) => {
    setEditingNote({ ...note });
    setIsModalOpen(true);
  };

  const handleSaveNote = async () => {
    if (!currentUser || !editingNote) return;

    const isNew = !editingNote.id;
    const noteId = editingNote.id || `note_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const notePayload: TeacherNote = {
      id: noteId,
      teacher_id: currentUser.id,
      title: editingNote.title || 'Không có tiêu đề',
      content: editingNote.content || '',
      tag: editingNote.tag || 'Giáo án',
      color: editingNote.color || PASTEL_COLORS[0].hex,
      is_pinned: !!editingNote.is_pinned,
      todo_list: editingNote.todo_list || [],
      created_at: editingNote.created_at || timestamp,
      updated_at: timestamp
    };

    if (useLocalStorageFallback) {
      const updatedNotes = isNew 
        ? [notePayload, ...notes]
        : notes.map(n => n.id === noteId ? notePayload : n);
      
      setNotes(updatedNotes);
      saveToLocalStorage(updatedNotes);
    } else {
      try {
        if (isNew) {
          const { error } = await supabase.from('teacher_notes').insert(notePayload);
          if (error) throw error;
          setNotes([notePayload, ...notes]);
        } else {
          const { error } = await supabase.from('teacher_notes').update(notePayload).eq('id', noteId);
          if (error) throw error;
          setNotes(notes.map(n => n.id === noteId ? notePayload : n));
        }
      } catch (err: any) {
        console.error("Error saving note to Cloud, falling back to LocalStorage:", err);
        alert("Lỗi lưu đám mây. Đã tự động sao lưu vào trình duyệt của bạn.");
        setUseLocalStorageFallback(true);
        const updatedNotes = isNew 
          ? [notePayload, ...notes]
          : notes.map(n => n.id === noteId ? notePayload : n);
        
        setNotes(updatedNotes);
        saveToLocalStorage(updatedNotes);
      }
    }

    setIsModalOpen(false);
    setEditingNote(null);
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa ghi chú này?")) return;

    if (useLocalStorageFallback) {
      const updatedNotes = notes.filter(n => n.id !== id);
      setNotes(updatedNotes);
      saveToLocalStorage(updatedNotes);
    } else {
      try {
        const { error } = await supabase.from('teacher_notes').delete().eq('id', id);
        if (error) throw error;
        setNotes(notes.filter(n => n.id !== id));
      } catch (err) {
        console.error("Error deleting note from Cloud:", err);
        const updatedNotes = notes.filter(n => n.id !== id);
        setNotes(updatedNotes);
        saveToLocalStorage(updatedNotes);
      }
    }
  };

  const handleTogglePin = async (note: TeacherNote) => {
    const updatedNote = { ...note, is_pinned: !note.is_pinned, updated_at: new Date().toISOString() };

    if (useLocalStorageFallback) {
      const updatedNotes = notes.map(n => n.id === note.id ? updatedNote : n);
      setNotes(updatedNotes);
      saveToLocalStorage(updatedNotes);
    } else {
      try {
        const { error } = await supabase.from('teacher_notes').update({ is_pinned: updatedNote.is_pinned }).eq('id', note.id);
        if (error) throw error;
        setNotes(notes.map(n => n.id === note.id ? updatedNote : n));
      } catch (err) {
        console.error("Error updating pin state on Cloud:", err);
        const updatedNotes = notes.map(n => n.id === note.id ? updatedNote : n);
        setNotes(updatedNotes);
        saveToLocalStorage(updatedNotes);
      }
    }
  };

  const handleToggleTodo = async (note: TeacherNote, index: number) => {
    const updatedTodoList = (note.todo_list || []).map((t, idx) => 
      idx === index ? { ...t, completed: !t.completed } : t
    );
    const updatedNote = { ...note, todo_list: updatedTodoList, updated_at: new Date().toISOString() };

    if (useLocalStorageFallback) {
      const updatedNotes = notes.map(n => n.id === note.id ? updatedNote : n);
      setNotes(updatedNotes);
      saveToLocalStorage(updatedNotes);
    } else {
      try {
        const { error } = await supabase.from('teacher_notes').update({ todo_list: updatedTodoList }).eq('id', note.id);
        if (error) throw error;
        setNotes(notes.map(n => n.id === note.id ? updatedNote : n));
      } catch (err) {
        console.error("Error updating todo on Cloud:", err);
        const updatedNotes = notes.map(n => n.id === note.id ? updatedNote : n);
        setNotes(updatedNotes);
        saveToLocalStorage(updatedNotes);
      }
    }
  };

  // Add/Remove Todo items in modal editingNote
  const handleAddTodoItem = () => {
    if (!newTodoText.trim() || !editingNote) return;
    const currentList = editingNote.todo_list || [];
    setEditingNote({
      ...editingNote,
      todo_list: [...currentList, { text: newTodoText.trim(), completed: false }]
    });
    setNewTodoText('');
  };

  const handleRemoveTodoItem = (index: number) => {
    if (!editingNote || !editingNote.todo_list) return;
    setEditingNote({
      ...editingNote,
      todo_list: editingNote.todo_list.filter((_, idx) => idx !== index)
    });
  };

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const matchesSearch = 
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag = selectedTag === 'Tất cả' || n.tag === selectedTag;
      return matchesSearch && matchesTag;
    });
  }, [notes, searchQuery, selectedTag]);

  // Separate pinned and unpinned
  const pinnedNotes = useMemo(() => filteredNotes.filter(n => n.is_pinned), [filteredNotes]);
  const unpinnedNotes = useMemo(() => filteredNotes.filter(n => !n.is_pinned), [filteredNotes]);

  if (!currentUser) {
    return <div className="p-8 text-center text-gray-500">Đang tải hồ sơ giáo viên...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <StickyNote className="h-8 w-8 text-violet-200 animate-pulse" /> Sổ tay Giáo viên
            </h1>
            <p className="text-indigo-100 text-sm md:text-base max-w-xl">
              "Người thầy tốt nhất là người truyền cảm hứng." Ghi lại những lưu ý, giáo án giảng dạy hoặc nhắc nhở học sinh để tối ưu hóa buổi học của bạn.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            <button
              onClick={handleSyncAllNotes}
              disabled={isSyncing}
              className="flex items-center gap-2 bg-indigo-500/40 hover:bg-indigo-500/60 border border-white/20 text-white px-4 py-3 rounded-2xl font-bold text-sm transition-all shadow-md active:scale-95 backdrop-blur-xs disabled:opacity-50"
              title="Đồng bộ toàn bộ ghi chú sang danh mục Sổ tay Giáo viên trên Google Tasks"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? (syncProgress ? `Đang đồng bộ (${syncProgress.current}/${syncProgress.total})...` : 'Đang xử lý...') : 'Đồng bộ Google Tasks'}</span>
              {isGoogleConnected && <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-xs"></span>}
            </button>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 bg-white text-indigo-700 hover:bg-indigo-50 px-5 py-3 rounded-2xl font-black text-sm transition-all shadow-md active:scale-95"
            >
              <Plus className="h-5 w-5" /> Thêm ghi chú mới
            </button>
          </div>
        </div>
      </div>

      {/* GOOGLE TASKS & GEMINI AI INTEGRATION CARD */}
      <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-4 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl flex items-center justify-center ${
              isGoogleConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
            }`}>
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">Google Tasks & Gemini AI</span>
                {isGoogleConnected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                    Đã kết nối
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
                    Chưa kết nối
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Đồng bộ vào danh mục "📚 Sổ tay Giáo viên (OpenLMS)" trên Google Tasks để Google Gemini AI tự động lập kế hoạch và nhắc việc.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
            <button
              onClick={() => setShowGeminiGuideModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 transition-colors"
              title="Xem các câu lệnh mẫu dùng với Google Gemini"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Mẫu lệnh Gemini</span>
            </button>

            <button
              onClick={() => setShowClientIdModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              title="Cấu hình Google OAuth Client ID"
            >
              <Settings className="h-3.5 w-3.5 text-gray-500" />
              <span>Cấu hình API</span>
            </button>

            {isGoogleConnected && (
              <button
                onClick={handleDisconnectGoogle}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                title="Ngắt kết nối Google Tasks"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Ngắt</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress bar during sync */}
        {isSyncing && syncProgress && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex justify-between text-xs text-indigo-700 font-medium mb-1">
              <span>Đang đồng bộ ghi chú sang Google Tasks...</span>
              <span>{syncProgress.current} / {syncProgress.total}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.round((syncProgress.current / syncProgress.total) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* SYNC FEEDBACK BANNER */}
      {syncFeedback && (
        <div className={`px-4 py-3 rounded-2xl flex items-center justify-between text-xs md:text-sm font-semibold transition-all ${
          syncFeedback.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            : syncFeedback.type === 'error'
            ? 'bg-rose-50 border border-rose-200 text-rose-800'
            : 'bg-indigo-50 border border-indigo-200 text-indigo-800'
        }`}>
          <div className="flex items-center gap-2.5">
            {syncFeedback.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />}
            {syncFeedback.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />}
            {syncFeedback.type === 'info' && <RefreshCw className="h-5 w-5 text-indigo-600 animate-spin flex-shrink-0" />}
            <span>{syncFeedback.message}</span>
          </div>
          <button 
            onClick={() => setSyncFeedback(null)}
            className="p-1 rounded-lg hover:bg-black/5 text-gray-500 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* CLOUD STATUS INDICATOR */}
      {useLocalStorageFallback && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-2xl flex items-center gap-3 text-xs md:text-sm font-semibold">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <span>Hệ thống đang hoạt động ở chế độ Offline (Sao lưu trình duyệt LocalStorage). Mọi ghi chú của bạn vẫn được lưu trữ cực kỳ an toàn trên máy tính này.</span>
        </div>
      )}

      {/* FILTER & CONTROL BAR */}
      <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm nội dung ghi chú..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50/50"
          />
        </div>

        {/* Categories / Tags filter */}
        <div className="flex flex-wrap gap-1.5 items-center w-full md:w-auto">
          <button
            onClick={() => setSelectedTag('Tất cả')}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
              selectedTag === 'Tất cả'
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Tất cả
          </button>
          {TAG_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSelectedTag(opt.value)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                selectedTag === opt.value
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <opt.icon className="h-3.5 w-3.5" />
              <span>{opt.value}</span>
            </button>
          ))}
        </div>

        {/* View mode toggle */}
        <div className="flex bg-gray-100 p-1 rounded-xl border flex-shrink-0 select-none">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-xs text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
            title="Dạng lưới"
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-xs text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
            title="Dạng danh sách"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* NOTE CONTAINER */}
      {loading ? (
        <div className="text-center py-20 text-gray-500 font-medium">Đang tải sổ tay của giáo viên...</div>
      ) : filteredNotes.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed p-16 text-center shadow-sm">
          <StickyNote className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-600">Sổ tay trống</h3>
          <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">Bạn chưa ghi chú nội dung nào. Hãy nhấn nút "Thêm ghi chú mới" để lưu trữ ý tưởng đầu tiên của bạn.</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* PINNED SECTION */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Pin className="h-3.5 w-3.5 rotate-45 text-indigo-500" /> Ghi chú đã ghim ({pinnedNotes.length})
              </h2>
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                {pinnedNotes.map(n => renderNoteCard(n))}
              </div>
            </div>
          )}

          {/* UNPINNED SECTION */}
          {unpinnedNotes.length > 0 && (
            <div className="space-y-4">
              {pinnedNotes.length > 0 && (
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  Khác ({unpinnedNotes.length})
                </h2>
              )}
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                {unpinnedNotes.map(n => renderNoteCard(n))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      {isModalOpen && editingNote && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <StickyNote className="h-5 w-5 text-indigo-600" />
                {editingNote.id ? 'Chỉnh sửa Ghi chú' : 'Thêm Ghi chú Mới'}
              </h3>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingNote(null);
                }} 
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
              
              {/* Note Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tiêu đề</label>
                <input
                  type="text"
                  placeholder="Ghi nhớ công việc, cuộc họp..."
                  value={editingNote.title}
                  onChange={e => setEditingNote({ ...editingNote, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Note Tag & Color Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tag Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Phân loại nhãn</label>
                  <select
                    value={editingNote.tag}
                    onChange={e => setEditingNote({ ...editingNote, tag: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {TAG_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Color Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Màu sắc thẻ</label>
                  <div className="flex gap-1.5 items-center h-[42px] px-1 border border-gray-100 rounded-xl bg-gray-50/50 justify-center">
                    {PASTEL_COLORS.map(c => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setEditingNote({ ...editingNote, color: c.hex })}
                        className="w-6 h-6 rounded-full border shadow-xs relative transition-transform hover:scale-110"
                        style={{ backgroundColor: c.hex, borderColor: c.border }}
                        title={c.label}
                      >
                        {editingNote.color === c.hex && (
                          <span className="absolute inset-0 flex items-center justify-center text-[10px]" style={{ color: c.text }}>✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Note Content */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nội dung ghi chú</label>
                <textarea
                  placeholder="Nhập nội dung chi tiết cần nhớ..."
                  value={editingNote.content}
                  onChange={e => setEditingNote({ ...editingNote, content: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm min-h-[120px] focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Pinned toggle inside modal */}
              <label className="flex items-center gap-2 cursor-pointer py-1 select-none">
                <input
                  type="checkbox"
                  checked={!!editingNote.is_pinned}
                  onChange={e => setEditingNote({ ...editingNote, is_pinned: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <span className="text-sm font-bold text-gray-700 flex items-center gap-1">
                  <Pin className="h-4 w-4 text-indigo-500 rotate-45" /> Ghim ghi chú này lên đầu trang
                </span>
              </label>

              {/* Todo List section inside modal */}
              <div className="pt-4 border-t space-y-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="h-4 w-4 text-indigo-600" /> Danh sách việc cần làm (To-Do)
                </label>
                
                {/* Input new todo */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Thêm nhiệm vụ cụ thể cần hoàn thành..."
                    value={newTodoText}
                    onChange={e => setNewTodoText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTodoItem();
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTodoItem}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-xs"
                  >
                    Thêm
                  </button>
                </div>

                {/* Render current todo list */}
                {editingNote.todo_list && editingNote.todo_list.length > 0 && (
                  <div className="space-y-1 bg-gray-50 p-3 rounded-xl border border-gray-100 max-h-[150px] overflow-y-auto custom-scrollbar">
                    {editingNote.todo_list.map((todo, idx) => (
                      <div key={idx} className="flex justify-between items-center gap-2 p-1.5 hover:bg-white rounded-lg transition-colors group">
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={todo.completed}
                            onChange={() => {
                              const updated = (editingNote.todo_list || []).map((t, tIdx) => 
                                tIdx === idx ? { ...t, completed: !t.completed } : t
                              );
                              setEditingNote({ ...editingNote, todo_list: updated });
                            }}
                            className="h-3.5 w-3.5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                          />
                          <span className={`text-xs font-medium text-gray-700 truncate ${todo.completed ? 'line-through text-gray-400' : ''}`}>
                            {todo.text}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTodoItem(idx)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 transition-opacity"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-gray-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingNote(null);
                }}
                className="px-4 py-2 border text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-bold transition-all"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                className="px-5 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
              >
                <Save className="h-4 w-4" />
                Lưu ghi chú
              </button>
            </div>

          </div>
        </div>
      )}

      {/* GOOGLE CLIENT ID CONFIGURATION MODAL */}
      {showClientIdModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Key className="h-5 w-5 text-indigo-600" />
                Cấu hình Google Client ID (OAuth 2.0)
              </h3>
              <button
                onClick={() => setShowClientIdModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-sm text-gray-700 custom-scrollbar">
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-900 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-indigo-700">
                  <Sparkles className="h-4 w-4" /> 4 bước đơn giản để lấy Client ID miễn phí từ Google:
                </div>
                <ol className="list-decimal pl-4 space-y-1.5 text-indigo-800 leading-relaxed">
                  <li>
                    Truy cập{' '}
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noreferrer"
                      className="underline font-bold text-indigo-600 inline-flex items-center gap-0.5"
                    >
                      Google Cloud Credentials <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                  <li>
                    Vào <b>Enabled APIs & Services</b> và tìm bật API <b>Google Tasks API</b>.
                  </li>
                  <li>
                    Nhấn <b>Create Credentials</b> &rarr; <b>OAuth client ID</b> &rarr; Chọn Loại ứng dụng: <b>Web application</b>.
                  </li>
                  <li>
                    Tại mục <b>Authorized JavaScript origins</b>, thêm URL:
                    <code className="block mt-1 p-1.5 bg-white border border-indigo-200 rounded text-[11px] font-mono text-indigo-900 select-all">
                      {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'}
                    </code>
                  </li>
                  <li>Nhấn <b>Create</b> và sao chép <b>Client ID</b> dán vào ô bên dưới.</li>
                </ol>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Google Client ID (.apps.googleusercontent.com)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 1234567890-abcdefg.apps.googleusercontent.com"
                  value={clientIdInput}
                  onChange={e => setClientIdInput(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="text-[11px] text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <b>Cam kết bảo mật 100%:</b> Mã Client ID và Token xác thực được lưu trữ trực tiếp tại trình duyệt trên máy của bạn (LocalStorage) và gửi trực tiếp bằng giao thức mã hóa HTTPS tới máy chủ chính thức của Google (googleapis.com). Tuyệt đối không qua bất kỳ bên thứ 3 nào.
                </span>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowClientIdModal(false)}
                className="px-4 py-2 border text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-bold transition-all"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleSaveClientId}
                className="px-5 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
              >
                <Save className="h-4 w-4" />
                Lưu & Kết nối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GEMINI AI PROMPTS GUIDE MODAL */}
      {showGeminiGuideModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b flex justify-between items-center bg-gradient-to-r from-indigo-50 to-purple-50">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                  Hướng dẫn tự động hóa với Google Gemini AI (@Tasks)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Cách ra lệnh cho Gemini đọc và xử lý ghi chú Sổ tay Giáo viên của bạn
                </p>
              </div>
              <button
                onClick={() => setShowGeminiGuideModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <HelpCircle className="h-4 w-4" /> Cách kích hoạt tiện ích Google Tasks trong Gemini:
                </div>
                <p className="leading-relaxed">
                  1. Mở ứng dụng <b>Google Gemini</b> trên điện thoại hoặc trang web{' '}
                  <a
                    href="https://gemini.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-bold text-indigo-600 inline-flex items-center gap-0.5"
                  >
                    gemini.google.com <ExternalLink className="h-3 w-3" />
                  </a>.<br />
                  2. Đảm bảo bạn đăng nhập cùng tài khoản Google đã đồng bộ.<br />
                  3. Khi hỏi Gemini, chỉ cần gõ <b>@Google Tasks</b> hoặc <b>@Tasks</b> (hoặc ra lệnh giọng nói), Gemini sẽ tự động truy cập danh mục <i>"📚 Sổ tay Giáo viên (OpenLMS)"</i>.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Mẫu câu lệnh thực tế cho Giáo viên (Nhấn để sao chép)
                </h4>

                <div className="grid grid-cols-1 gap-3">
                  {GEMINI_PROMPTS.map((item, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 hover:border-indigo-300 rounded-2xl p-4 bg-gray-50/50 hover:bg-white transition-all shadow-xs space-y-2"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                            {item.category}
                          </span>
                          <h5 className="text-xs font-bold text-gray-900 mt-1.5">{item.title}</h5>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(item.prompt);
                            setCopiedPromptIdx(idx);
                            setTimeout(() => setCopiedPromptIdx(null), 2000);
                          }}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            copiedPromptIdx === idx
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {copiedPromptIdx === idx ? (
                            <>
                              <CheckCheck className="h-3.5 w-3.5" /> Đã chép
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" /> Sao chép
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs font-mono bg-white p-3 rounded-xl border border-gray-100 text-gray-700 select-all">
                        {item.prompt}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <a
                  href="https://gemini.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline"
                >
                  Mở Gemini Web <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <span className="text-gray-300">|</span>
                <a
                  href="https://tasks.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline"
                >
                  Mở Google Tasks Web <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <button
                type="button"
                onClick={() => setShowGeminiGuideModal(false)}
                className="w-full sm:w-auto px-5 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  // Helper render note card (grid or list)
  function renderNoteCard(note: TeacherNote) {
    const isGrid = viewMode === 'grid';
    
    // Find Tag Style
    const tagInfo = TAG_OPTIONS.find(t => t.value === note.tag) || TAG_OPTIONS[4];
    const TagIcon = tagInfo.icon;

    // Color Details
    const colorInfo = PASTEL_COLORS.find(c => c.hex === note.color) || PASTEL_COLORS[5];

    return (
      <div
        key={note.id}
        className={`border rounded-2xl shadow-xs relative transition-all hover:-translate-y-1 hover:shadow-md flex flex-col justify-between overflow-hidden ${
          isGrid ? 'min-h-[220px]' : 'p-4 flex-row items-center gap-4'
        }`}
        style={{ 
          backgroundColor: note.color, 
          borderColor: colorInfo.border
        }}
      >
        
        {/* Card Main Body */}
        <div className={`p-5 flex-1 flex flex-col justify-between ${isGrid ? 'space-y-3' : 'space-y-0 w-full min-w-0'}`}>
          <div className="space-y-2">
            
            {/* Header: Title, Pin Action, Edit Actions */}
            <div className="flex justify-between items-start gap-4">
              <div className="font-extrabold text-sm line-clamp-1" style={{ color: colorInfo.text }}>
                {note.title}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 no-print">
                {/* Sync to Google Tasks button */}
                <button
                  onClick={() => handleSyncSingleNote(note)}
                  disabled={syncingNoteId === note.id}
                  className={`p-1.5 rounded-lg transition-colors hover:bg-white/40 ${
                    syncingNoteId === note.id ? 'text-indigo-600' : 'text-gray-400 hover:text-indigo-600'
                  }`}
                  title="Đẩy ghi chú này sang Google Tasks (để Gemini AI đọc)"
                >
                  <Sparkles className={`h-4 w-4 ${syncingNoteId === note.id ? 'animate-spin text-indigo-600' : ''}`} />
                </button>
                {/* Pin Action */}
                <button
                  onClick={() => handleTogglePin(note)}
                  className={`p-1.5 rounded-lg transition-colors hover:bg-white/40 ${
                    note.is_pinned ? 'text-indigo-600' : 'text-gray-400'
                  }`}
                  title={note.is_pinned ? "Bỏ ghim" : "Ghim lên đầu"}
                >
                  <Pin className={`h-4 w-4 ${note.is_pinned ? 'rotate-0' : 'rotate-45'}`} />
                </button>
                {/* Edit Action */}
                <button
                  onClick={() => handleOpenEditModal(note)}
                  className="p-1.5 rounded-lg transition-colors hover:bg-white/40 text-gray-600"
                  title="Chỉnh sửa"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                {/* Delete Action */}
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="p-1.5 rounded-lg transition-colors hover:bg-white/40 text-red-600"
                  title="Xóa"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Note Content */}
            <div 
              className={`text-xs leading-relaxed break-words whitespace-pre-line text-gray-700 ${
                isGrid ? 'line-clamp-4' : 'line-clamp-2'
              }`}
            >
              {note.content}
            </div>

            {/* Todo checklist inside note card */}
            {note.todo_list && note.todo_list.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-black/5">
                {note.todo_list.map((todo, idx) => (
                  <label 
                    key={idx} 
                    className="flex items-start gap-2 cursor-pointer select-none"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => handleToggleTodo(note, idx)}
                      className="mt-0.5 h-3.5 w-3.5 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <span className={`text-[11px] font-medium leading-tight ${todo.completed ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                      {todo.text}
                    </span>
                  </label>
                ))}
              </div>
            )}

          </div>

          {/* Footer Info: Category Tag, Date */}
          <div className="flex justify-between items-center pt-3 border-t border-black/5 mt-4">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${tagInfo.color}`}>
              <TagIcon className="h-3 w-3" />
              <span>{note.tag}</span>
            </span>
            <span className="text-[10px] text-gray-500 font-medium">
              {new Date(note.updated_at || note.created_at).toLocaleDateString('vi-VN')}
            </span>
          </div>

        </div>

      </div>
    );
  }
};

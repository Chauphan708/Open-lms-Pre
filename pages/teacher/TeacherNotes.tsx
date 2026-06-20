import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store';
import { supabase } from '../../services/supabaseClient';
import {
  StickyNote, Search, Plus, Pin, Trash2, Edit3, Save, X, Tag,
  Grid, List, CheckSquare, Calendar, Users, BookOpen, AlertCircle, Bookmark, CheckCircle2
} from 'lucide-react';

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
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-white text-indigo-700 hover:bg-indigo-50 px-5 py-3 rounded-2xl font-black text-sm transition-all shadow-md active:scale-95 flex-shrink-0"
          >
            <Plus className="h-5 w-5" /> Thêm ghi chú mới
          </button>
        </div>
      </div>

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

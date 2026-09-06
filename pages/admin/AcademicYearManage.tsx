import React, { useState } from 'react';
import { useStore } from '../../store';
import { AcademicYear } from '../../types';
import { CalendarRange, Plus, Save, Edit2, Trash2, Star, CheckCircle2, AlertCircle, X, Clock, Info } from 'lucide-react';

interface TimeStatus {
  label: string;
  badgeClass: string;
  dotClass: string;
  detail?: string;
}

const getYearTimeStatus = (year: AcademicYear): TimeStatus => {
  const today = new Date().toISOString().split('T')[0];
  const sem1 = year.semesters?.[0];
  const sem2 = year.semesters?.[1];

  const start = sem1?.startDate || '';
  const end = sem2?.endDate || sem1?.endDate || '';

  if (!start) {
    return {
      label: 'Chưa thiết lập',
      badgeClass: 'bg-gray-100 text-gray-700 border border-gray-300',
      dotClass: 'bg-gray-400'
    };
  }

  if (today < start) {
    return {
      label: 'Sắp diễn ra',
      badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
      dotClass: 'bg-blue-500'
    };
  }

  if (end && today > end) {
    return {
      label: 'Đã kết thúc',
      badgeClass: 'bg-gray-100 text-gray-600 border border-gray-300',
      dotClass: 'bg-gray-400'
    };
  }

  // Đang trong thời gian năm học
  if (sem1?.startDate && sem1?.endDate && today >= sem1.startDate && today <= sem1.endDate) {
    return {
      label: 'Đang diễn ra',
      detail: 'Học kì 1',
      badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-300',
      dotClass: 'bg-emerald-600'
    };
  }

  if (sem2?.startDate && sem2?.endDate && today >= sem2.startDate && today <= sem2.endDate) {
    return {
      label: 'Đang diễn ra',
      detail: 'Học kì 2',
      badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-300',
      dotClass: 'bg-emerald-600'
    };
  }

  if (sem1?.endDate && sem2?.startDate && today > sem1.endDate && today < sem2.startDate) {
    return {
      label: 'Đang diễn ra',
      detail: 'Nghỉ giữa kỳ',
      badgeClass: 'bg-amber-50 text-amber-800 border border-amber-300',
      dotClass: 'bg-amber-500'
    };
  }

  return {
    label: 'Đang diễn ra',
    badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-300',
    dotClass: 'bg-emerald-600'
  };
};

export const AcademicYearManage: React.FC = () => {
  const { 
    academicYears, 
    classes, 
    addAcademicYear, 
    updateAcademicYear, 
    setActiveAcademicYear, 
    deleteAcademicYear 
  } = useStore();

  const [isCreating, setIsCreating] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State for Creating
  const [name, setName] = useState('');
  const [sem1Start, setSem1Start] = useState('');
  const [sem1End, setSem1End] = useState('');
  const [sem2Start, setSem2Start] = useState('');
  const [sem2End, setSem2End] = useState('');
  const [isDefaultActive, setIsDefaultActive] = useState(true);

  // Form State for Editing
  const [editName, setEditName] = useState('');
  const [editSem1Start, setEditSem1Start] = useState('');
  const [editSem1End, setEditSem1End] = useState('');
  const [editSem2Start, setEditSem2Start] = useState('');
  const [editSem2End, setEditSem2End] = useState('');
  const [editIsActive, setEditIsActive] = useState(false);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  const resetForm = () => {
    setName('');
    setSem1Start('');
    setSem1End('');
    setSem2Start('');
    setSem2End('');
    setIsDefaultActive(true);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      showNotification('error', 'Vui lòng nhập tên năm học (VD: 2026-2027)');
      return;
    }
    if (!sem1Start || !sem1End) {
      showNotification('error', 'Vui lòng chọn ngày bắt đầu và kết thúc của Học kì 1');
      return;
    }

    const newYear: AcademicYear = {
      id: `ay_${Date.now()}`,
      name: name.trim(),
      isActive: isDefaultActive,
      semesters: [
        { id: `s1_${Date.now()}`, name: 'Học kì 1', startDate: sem1Start, endDate: sem1End },
        { id: `s2_${Date.now()}`, name: 'Học kì 2', startDate: sem2Start || sem1End, endDate: sem2End || sem1End },
      ]
    };
    
    await addAcademicYear(newYear);
    setIsCreating(false);
    resetForm();
    showNotification('success', `Đã thêm thành công năm học ${newYear.name}`);
  };

  const startEdit = (year: AcademicYear) => {
    setEditingYear(year);
    setEditName(year.name);
    setEditSem1Start(year.semesters?.[0]?.startDate || '');
    setEditSem1End(year.semesters?.[0]?.endDate || '');
    setEditSem2Start(year.semesters?.[1]?.startDate || '');
    setEditSem2End(year.semesters?.[1]?.endDate || '');
    setEditIsActive(Boolean(year.isActive));
  };

  const handleSaveEdit = async () => {
    if (!editingYear) return;
    if (!editName.trim()) {
      showNotification('error', 'Vui lòng nhập tên năm học');
      return;
    }

    const updated: AcademicYear = {
      ...editingYear,
      name: editName.trim(),
      isActive: editIsActive,
      semesters: [
        { 
          id: editingYear.semesters?.[0]?.id || `s1_${Date.now()}`, 
          name: 'Học kì 1', 
          startDate: editSem1Start, 
          endDate: editSem1End 
        },
        { 
          id: editingYear.semesters?.[1]?.id || `s2_${Date.now()}`, 
          name: 'Học kì 2', 
          startDate: editSem2Start || editSem1End, 
          endDate: editSem2End || editSem1End 
        },
      ]
    };

    await updateAcademicYear(updated);
    setEditingYear(null);
    showNotification('success', `Đã cập nhật thông tin năm học ${updated.name}`);
  };

  const handleToggleActive = async (year: AcademicYear) => {
    if (year.isActive) {
      showNotification('error', `Năm học ${year.name} đang là năm học hiện hành. Hãy chọn kích hoạt một năm học khác để thay thế.`);
      return;
    }

    const success = await setActiveAcademicYear(year.id);
    if (success) {
      showNotification('success', `Đã kích hoạt năm học ${year.name} làm năm học hiện hành toàn trường.`);
    }
  };

  const handleDelete = async (year: AcademicYear) => {
    const linked = classes.filter(c => c.academicYearId === year.id);
    if (linked.length > 0) {
      showNotification('error', `Không thể xóa năm học ${year.name} vì đang có ${linked.length} lớp học trực thuộc.`);
      return;
    }

    if (window.confirm(`Bạn có chắc chắn muốn xóa năm học "${year.name}"?`)) {
      const success = await deleteAcademicYear(year.id);
      if (success) {
        showNotification('success', `Đã xóa thành công năm học ${year.name}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarRange className="w-7 h-7 text-indigo-600" /> Quản lý Năm Học
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý niên khóa, phân kỳ thời gian và thiết lập năm học hiện hành cho toàn trường
          </p>
        </div>
        <button 
          onClick={() => { setIsCreating(true); setEditingYear(null); }}
          className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Thêm Năm Học Mới
        </button>
      </div>

      {/* Notification Banner */}
      {statusMessage && (
        <div className={`p-4 rounded-xl flex items-center justify-between border ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        } transition-all`}>
          <div className="flex items-center gap-2 font-medium text-sm">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Info Callout */}
      <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-indigo-900 leading-relaxed">
          <p className="font-semibold text-indigo-950 mb-0.5">Cách hệ thống tính toán trạng thái năm học:</p>
          <ul className="list-disc list-inside space-y-1 text-indigo-800">
            <li><strong>Tiến độ thời gian:</strong> Tự động tính theo ngày thực tế của Học kì 1 & Học kì 2 (<em>Sắp diễn ra</em>, <em>Đang diễn ra</em>, <em>Đã kết thúc</em>).</li>
            <li><strong>Năm học hiện hành:</strong> Năm học chính thức được chọn để làm mặc định khi tạo lớp, phân công giảng dạy và thống kê kết quả học tập.</li>
          </ul>
        </div>
      </div>

      {/* Create Modal / Form */}
      {isCreating && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md animate-fade-in space-y-5">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" /> Thêm mới năm học
            </h3>
            <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tên năm học <span className="text-rose-500">*</span></label>
              <input 
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium" 
                placeholder="VD: 2026-2027"
                value={name} 
                onChange={e => setName(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Định dạng khuyên dùng: Năm Bắt Đầu - Năm Kết Thúc</p>
            </div>

            <div className="flex items-center pt-2 md:pt-7">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={isDefaultActive} 
                  onChange={e => setIsDefaultActive(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-sm font-semibold text-gray-800">
                  ⭐ Đặt làm năm học hiện hành cho toàn trường
                </span>
              </label>
            </div>
             
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
              <p className="font-bold text-sm text-indigo-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" /> Thời gian Học kì 1
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Ngày bắt đầu:</span>
                  <input 
                    type="date" 
                    className="border border-gray-300 p-2 rounded-lg w-full bg-white text-gray-900 text-sm focus:ring-2 focus:ring-indigo-500" 
                    value={sem1Start} 
                    onChange={e => setSem1Start(e.target.value)} 
                  />
                </div>
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Ngày kết thúc:</span>
                  <input 
                    type="date" 
                    className="border border-gray-300 p-2 rounded-lg w-full bg-white text-gray-900 text-sm focus:ring-2 focus:ring-indigo-500" 
                    value={sem1End} 
                    onChange={e => setSem1End(e.target.value)} 
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
              <p className="font-bold text-sm text-indigo-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" /> Thời gian Học kì 2
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Ngày bắt đầu:</span>
                  <input 
                    type="date" 
                    className="border border-gray-300 p-2 rounded-lg w-full bg-white text-gray-900 text-sm focus:ring-2 focus:ring-indigo-500" 
                    value={sem2Start} 
                    onChange={e => setSem2Start(e.target.value)} 
                  />
                </div>
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Ngày kết thúc:</span>
                  <input 
                    type="date" 
                    className="border border-gray-300 p-2 rounded-lg w-full bg-white text-gray-900 text-sm focus:ring-2 focus:ring-indigo-500" 
                    value={sem2End} 
                    onChange={e => setSem2End(e.target.value)} 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 flex gap-2.5 justify-end border-t border-gray-100">
            <button 
              onClick={() => setIsCreating(false)} 
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl font-semibold text-sm transition-colors"
            >
              Hủy
            </button>
            <button 
              onClick={handleCreate} 
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl flex items-center gap-2 font-bold text-sm shadow-sm hover:bg-indigo-700 transition-colors"
            >
              <Save className="h-4 w-4" /> Lưu Năm Học
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal / Form */}
      {editingYear && (
        <div className="bg-white p-6 rounded-2xl border border-indigo-200 shadow-md animate-fade-in space-y-5">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-indigo-600" /> Chỉnh sửa năm học: {editingYear.name}
            </h3>
            <button onClick={() => setEditingYear(null)} className="text-gray-400 hover:text-gray-600 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tên năm học <span className="text-rose-500">*</span></label>
              <input 
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium" 
                value={editName} 
                onChange={e => setEditName(e.target.value)}
              />
            </div>

            <div className="flex items-center pt-2 md:pt-7">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={editIsActive} 
                  onChange={e => setEditIsActive(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-sm font-semibold text-gray-800">
                  ⭐ Đặt làm năm học hiện hành cho toàn trường
                </span>
              </label>
            </div>
             
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
              <p className="font-bold text-sm text-indigo-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" /> Thời gian Học kì 1
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Ngày bắt đầu:</span>
                  <input 
                    type="date" 
                    className="border border-gray-300 p-2 rounded-lg w-full bg-white text-gray-900 text-sm focus:ring-2 focus:ring-indigo-500" 
                    value={editSem1Start} 
                    onChange={e => setEditSem1Start(e.target.value)} 
                  />
                </div>
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Ngày kết thúc:</span>
                  <input 
                    type="date" 
                    className="border border-gray-300 p-2 rounded-lg w-full bg-white text-gray-900 text-sm focus:ring-2 focus:ring-indigo-500" 
                    value={editSem1End} 
                    onChange={e => setEditSem1End(e.target.value)} 
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
              <p className="font-bold text-sm text-indigo-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" /> Thời gian Học kì 2
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Ngày bắt đầu:</span>
                  <input 
                    type="date" 
                    className="border border-gray-300 p-2 rounded-lg w-full bg-white text-gray-900 text-sm focus:ring-2 focus:ring-indigo-500" 
                    value={editSem2Start} 
                    onChange={e => setEditSem2Start(e.target.value)} 
                  />
                </div>
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Ngày kết thúc:</span>
                  <input 
                    type="date" 
                    className="border border-gray-300 p-2 rounded-lg w-full bg-white text-gray-900 text-sm focus:ring-2 focus:ring-indigo-500" 
                    value={editSem2End} 
                    onChange={e => setEditSem2End(e.target.value)} 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 flex gap-2.5 justify-end border-t border-gray-100">
            <button 
              onClick={() => setEditingYear(null)} 
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl font-semibold text-sm transition-colors"
            >
              Hủy
            </button>
            <button 
              onClick={handleSaveEdit} 
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl flex items-center gap-2 font-bold text-sm shadow-sm hover:bg-indigo-700 transition-colors"
            >
              <Save className="h-4 w-4" /> Cập Nhật Năm Học
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-bold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Tên năm học</th>
                <th className="px-6 py-4">Tiến độ thời gian</th>
                <th className="px-6 py-4">Năm học hiện hành</th>
                <th className="px-6 py-4">Học kì 1</th>
                <th className="px-6 py-4">Học kì 2</th>
                <th className="px-6 py-4">Lớp học</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {academicYears.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400">
                    Chưa có năm học nào. Hãy bấm "Thêm Năm Học Mới" để bắt đầu.
                  </td>
                </tr>
              ) : (
                academicYears.map(year => {
                  const timeStatus = getYearTimeStatus(year);
                  const linkedClasses = classes.filter(c => c.academicYearId === year.id);

                  return (
                    <tr key={year.id} className={`hover:bg-gray-50/80 transition-colors ${year.isActive ? 'bg-amber-50/20' : ''}`}>
                      {/* Name */}
                      <td className="px-6 py-4 font-bold text-gray-900">
                        <div className="flex items-center gap-2">
                          <span>{year.name}</span>
                          {year.isActive && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Hiện hành
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Smart Time Status */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${timeStatus.badgeClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${timeStatus.dotClass}`}></span>
                            {timeStatus.label}
                          </span>
                          {timeStatus.detail && (
                            <span className="text-[11px] text-gray-500 font-medium ml-1">
                              ({timeStatus.detail})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Active Status & Quick Toggle */}
                      <td className="px-6 py-4">
                        {year.isActive ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Đang áp dụng
                          </div>
                        ) : (
                          <button
                            onClick={() => handleToggleActive(year)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-gray-200 transition-colors"
                            title="Đặt làm năm học hiện hành cho toàn trường"
                          >
                            <Star className="w-3.5 h-3.5 text-gray-400 hover:text-indigo-600" />
                            Đặt làm hiện hành
                          </button>
                        )}
                      </td>

                      {/* HK1 */}
                      <td className="px-6 py-4 font-medium text-gray-800 text-xs">
                        {year.semesters?.[0]?.startDate ? (
                          <span>
                            {year.semesters[0].startDate} &rarr; {year.semesters[0].endDate}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Chưa đặt</span>
                        )}
                      </td>

                      {/* HK2 */}
                      <td className="px-6 py-4 font-medium text-gray-800 text-xs">
                        {year.semesters?.[1]?.startDate ? (
                          <span>
                            {year.semesters[1].startDate} &rarr; {year.semesters[1].endDate}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Chưa đặt</span>
                        )}
                      </td>

                      {/* Linked Classes Count */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">
                          {linkedClasses.length} lớp
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => startEdit(year)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Chỉnh sửa thông tin năm học"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(year)}
                            disabled={linkedClasses.length > 0}
                            className={`p-1.5 rounded-lg transition-colors ${
                              linkedClasses.length > 0 
                                ? 'text-gray-300 cursor-not-allowed' 
                                : 'text-gray-500 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                            title={
                              linkedClasses.length > 0 
                                ? `Không thể xóa vì có ${linkedClasses.length} lớp trực thuộc` 
                                : 'Xóa năm học này'
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
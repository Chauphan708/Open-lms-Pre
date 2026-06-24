import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { useClassFunStore } from '../../services/classFunStore';
import { Class, User } from '../../types';
import { School, Plus, Users, ChevronDown, UserPlus, Dices, CheckSquare, Square, Zap, LayoutGrid, ArrowDownAZ, SortAsc, GripVertical } from 'lucide-react';
import { DuckRace } from '../../components/classfun/DuckRace';
import { RandomRoulette } from '../../components/classfun/RandomRoulette';
import { GroupManageModal } from '../../components/classfun/GroupManageModal';
import { RandomGroupModal } from '../../components/classfun/RandomGroupModal';
import { ClassSeatingModal } from '../../components/classfun/ClassSeatingModal';
import { ClassParentTab } from '../../components/parents/ClassParentTab';

export const ClassManage: React.FC = () => {
  const { classes, academicYears, users, user: currentUser, addClass, updateClass, deleteClass, fetchClasses } = useStore();

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'students' | 'parents'>('students');

  // Filter lists
  const myClasses = classes.filter(c => c.teacherId === currentUser?.id);
  const allStudents = users.filter(u => u.role === 'STUDENT');

  // Form State
  const [newClassName, setNewClassName] = useState('');
  const [selectedYear, setSelectedYear] = useState(academicYears[0]?.id || '');

  // Add Student State
  const [studentsToAdd, setStudentsToAdd] = useState<string[]>([]);
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  const handleCreateClass = () => {
    if (!newClassName || !selectedYear) return;
    const newClass: Class = {
      id: `cls_${Date.now()}`,
      name: newClassName,
      academicYearId: selectedYear,
      teacherId: currentUser?.id || '',
      studentIds: []
    };
    addClass(newClass);
    setIsCreating(false);
    setNewClassName('');
  };

  const handleAddStudentsToClass = (classId: string) => {
    if (studentsToAdd.length === 0) return;
    const cls = classes.find(c => c.id === classId);
    if (cls) {
      const newStudents = studentsToAdd.filter(id => !cls.studentIds.includes(id));
      if (newStudents.length > 0) {
        const updated = { ...cls, studentIds: [...cls.studentIds, ...newStudents] };
        updateClass(updated);
      }
      setStudentsToAdd([]);
      setIsAddDropdownOpen(false);
      setStudentSearchTerm('');
    }
  };

  const { groups, groupMembers, fetchClassFunData, updateStudentOrder, moveStudentToGroup, addStudentToGroup } = useClassFunStore();
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [showDuckRace, setShowDuckRace] = useState(false);
  const [duckRacePool, setDuckRacePool] = useState<User[]>([]);

  useEffect(() => {
    if (selectedClassId && currentUser?.id) {
      fetchClassFunData(selectedClassId, currentUser.id);
    }
  }, [selectedClassId, currentUser?.id, fetchClassFunData]);

  const selectedClassData = classes.find(c => c.id === selectedClassId);
  const studentsInClass = allStudents.filter(s => {
    if (!selectedClassData) return false;
    // Condition 1: Exists in studentIds array
    const inStudentIds = selectedClassData.studentIds?.includes(s.id);
    // Condition 2: Has matching class name (e.g. s.class_name matches class name)
    const sClassName = (s.className || s.class_name || '').trim().toLowerCase();
    const classNameMatch = sClassName && sClassName === selectedClassData.name.trim().toLowerCase();
    return inStudentIds || classNameMatch;
  });

  // Random Selection Logic
  const [showRoulette, setShowRoulette] = useState(false);

  const handleRouletteComplete = (winners: User[]) => {
    setSelectedStudentIds(winners.map(w => w.id));
    setShowRoulette(false);
  };

  const startDuckRace = () => {
    if (studentsInClass.length > 0) {
      setDuckRacePool(studentsInClass);
      setShowDuckRace(true);
    }
  };

  const handleDuckRaceComplete = (winner: User) => {
    setSelectedStudentIds([winner.id]);
    setShowDuckRace(false);
  };

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showRandomGroup, setShowRandomGroup] = useState(false);
  const [showSeatingModal, setShowSeatingModal] = useState(false);

  // Group students
  const groupedStudents = React.useMemo(() => {
    const result = {
      groups: groups.map(g => ({ ...g, students: [] as User[] })).sort((a, b) => a.sort_order - b.sort_order),
      ungrouped: [] as User[]
    };

    const map: { [key: string]: (User & { _sort_order?: number })[] } = {};
    result.groups.forEach(g => (map[g.id] = g.students));

    studentsInClass.forEach(s => {
      const gMember = groupMembers.find(gm => gm.student_id === s.id);
      if (gMember && map[gMember.group_id]) {
        // Gán sort_order vào để sắp xếp
        map[gMember.group_id].push({ ...s, _sort_order: gMember.sort_order });
      } else {
        result.ungrouped.push(s);
      }
    });

    // Sắp xếp các tổ theo sort_order
    result.groups.forEach(g => {
      g.students.sort((a: any, b: any) => (a._sort_order || 0) - (b._sort_order || 0));
    });

    // Sắp xếp chưa phân tổ theo tên A-Z
    result.ungrouped.sort((a, b) => a.name.localeCompare(b.name, 'vi'));

    return result;
  }, [studentsInClass, groups, groupMembers]);

  // --- Drag and Drop Logic ---
  const handleDragStart = (e: React.DragEvent, studentId: string, fromGroupId: string) => {
    e.dataTransfer.setData('studentId', studentId);
    e.dataTransfer.setData('fromGroupId', fromGroupId);
  };

  const handleDrop = async (e: React.DragEvent, toGroupId: string) => {
    e.preventDefault();
    const studentId = e.dataTransfer.getData('studentId');
    const fromGroupId = e.dataTransfer.getData('fromGroupId');

    if (!studentId || fromGroupId === toGroupId) return;

    if (fromGroupId === 'ungrouped') {
      await addStudentToGroup(toGroupId, studentId);
    } else {
      await moveStudentToGroup(fromGroupId, toGroupId, studentId);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // --- Sorting Logic ---
  const sortGroupByName = async (groupId: string, type: 'first' | 'last') => {
    const group = groupedStudents.groups.find(g => g.id === groupId);
    if (!group || group.students.length <= 1) return;

    const sorted = [...group.students].sort((a, b) => {
      const nameA = a.name.trim().split(' ');
      const nameB = b.name.trim().split(' ');
      
      if (type === 'first') {
        const firstA = nameA[nameA.length - 1];
        const firstB = nameB[nameB.length - 1];
        return firstA.localeCompare(firstB, 'vi');
      } else {
        const lastA = nameA[0];
        const lastB = nameB[0];
        return lastA.localeCompare(lastB, 'vi');
      }
    });

    const newOrders = sorted.map((s, idx) => ({
      student_id: s.id,
      sort_order: idx
    }));

    await updateStudentOrder(groupId, newOrders);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-100px)]">

      {/* List Classes */}
      <div className="bg-white rounded-xl border shadow-sm flex flex-col h-full">
        <div className="p-4 border-b flex justify-between items-center bg-white rounded-t-xl">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <School className="h-5 w-5" /> Lớp của tôi
          </h2>
          <button onClick={() => setIsCreating(true)} className="p-1 hover:bg-gray-100 rounded">
            <Plus className="h-5 w-5 text-indigo-600" />
          </button>
        </div>

        {isCreating && (
          <div className="p-4 border-b bg-white border-indigo-100 space-y-3 shadow-inner">
            <label className="block text-xs font-bold text-gray-700">Tên lớp mới</label>
            <input
              className="w-full p-2 border border-gray-300 rounded text-sm bg-white text-gray-900"
              placeholder="VD: 10A1"
              value={newClassName}
              onChange={e => setNewClassName(e.target.value)}
            />
            <label className="block text-xs font-bold text-gray-700">Năm học</label>
            <select
              className="w-full p-2 border border-gray-300 rounded text-sm bg-white text-gray-900"
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
            >
              {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setIsCreating(false)} className="flex-1 bg-gray-100 text-gray-600 text-xs py-2 rounded font-medium">Hủy</button>
              <button onClick={handleCreateClass} className="flex-1 bg-indigo-600 text-white text-xs py-2 rounded font-medium">Lưu Lớp</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-white">
          {myClasses.length === 0 && <p className="text-center text-gray-400 text-sm mt-4">Chưa có lớp nào</p>}
          {myClasses.map(c => (
            <div
              key={c.id}
              onClick={() => setSelectedClassId(c.id)}
              className={`p-3 rounded-lg cursor-pointer border transition-colors
                  ${selectedClassId === c.id ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white hover:border-indigo-300'}
                `}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-800">{c.name}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation(); // Ngăn kích hoạt hành động chọn lớp
                      if (confirm(`Bạn có chắc chắn muốn xóa lớp ${c.name}? Hành động này sẽ không thể hoàn tác.`)) {
                        const success = await deleteClass(c.id);
                        if (success && selectedClassId === c.id) {
                          setSelectedClassId(null);
                        }
                      }
                    }}
                    className="p-1.5 text-red-500 hover:text-red-700 bg-red-50/50 hover:bg-red-100/70 rounded-lg transition-colors flex items-center justify-center"
                    title="Xóa lớp học"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 flex items-center gap-1">
                    <Users className="h-3 w-3" /> {
                      allStudents.filter(s => {
                        const inStudentIds = c.studentIds?.includes(s.id);
                        const sClassName = (s.className || s.class_name || '').trim().toLowerCase();
                        const classNameMatch = sClassName && sClassName === c.name.trim().toLowerCase();
                        return inStudentIds || classNameMatch;
                      }).length
                    }
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {academicYears.find(y => y.id === c.academicYearId)?.name}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Class Details */}
      <div className="md:col-span-2 bg-white rounded-xl border shadow-sm flex flex-col h-full min-h-0 relative">
        {!selectedClassData ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 flex-col">
            <School className="h-12 w-12 mb-2 opacity-50" />
            <p>Chọn một lớp để quản lý</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b flex justify-between items-center bg-white rounded-t-xl flex-wrap gap-2">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-900">{selectedClassData.name}</h2>
                  <button 
                    onClick={async () => {
                      if (confirm(`Bạn có chắc chắn muốn xóa lớp ${selectedClassData.name}? Hành động này sẽ không thể hoàn tác.`)) {
                        const success = await deleteClass(selectedClassData.id);
                        if (success) {
                          setSelectedClassId(null);
                        }
                      }
                    }} 
                    className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors"
                    title="Xóa lớp học này"
                  >
                    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
                  <button 
                    onClick={() => setActiveTab('students')}
                    className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${activeTab === 'students' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Danh sách Học sinh
                  </button>
                  <button 
                    onClick={() => setActiveTab('parents')}
                    className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${activeTab === 'parents' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Phụ huynh Lớp
                  </button>
                </div>
              </div>

              {/* Random Controls & Group Manage (chỉ hiện bên tab Học sinh) */}
              {activeTab === 'students' && (
              <div className="flex items-center flex-wrap gap-2 mt-2 md:mt-0">
                <button onClick={() => setShowRandomGroup(true)} className="text-sm bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg hover:bg-emerald-100 font-bold transition border border-emerald-100 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Chia Nhóm
                </button>
                <div className="w-px h-5 bg-gray-200 mx-1 hidden sm:block"></div>
                <button onClick={() => setShowGroupModal(true)} className="text-sm bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-100 font-bold transition border border-indigo-100 flex items-center gap-2">
                  <span className="flex items-center gap-2 leading-none"><Users className="h-4 w-4" /> Quản lý Tổ</span>
                </button>
                <div className="w-px h-5 bg-gray-200 mx-1 hidden sm:block"></div>
                <button onClick={() => setShowRoulette(true)} className="text-sm bg-purple-50 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-100 font-bold transition border border-purple-100 flex items-center gap-2">
                  <Dices className="h-4 w-4" /> Gọi Ngẫu Nhiên
                </button>
                <div className="w-px h-5 bg-gray-200 mx-1 hidden sm:block"></div>
                <button onClick={startDuckRace} className="text-sm bg-amber-100 text-amber-700 px-4 py-2 rounded-lg hover:bg-amber-200 font-bold flex items-center gap-2 transition shadow-sm border border-amber-200">
                  <span className="text-lg leading-none">🦆</span> Đua Vịt
                </button>
                <div className="w-px h-5 bg-gray-200 mx-1 hidden sm:block"></div>
                <button onClick={() => setShowSeatingModal(true)} className="text-sm bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 font-bold flex items-center gap-2 transition shadow-sm border border-blue-200">
                  <LayoutGrid className="h-4 w-4" /> Sơ đồ Lớp
                </button>
              </div>
              )}

              {activeTab === 'students' && (
              <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0 relative">
                <div className="relative flex-1 md:w-64">
                  <button
                    onClick={() => setIsAddDropdownOpen(!isAddDropdownOpen)}
                    className="w-full bg-white border border-gray-300 rounded-lg text-sm px-3 py-2 text-left flex justify-between items-center text-gray-700 hover:border-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <span className="truncate">
                      {studentsToAdd.length === 0
                        ? "Chọn học sinh để thêm..."
                        : `Đã chọn ${studentsToAdd.length} học sinh`}
                    </span>
                    <ChevronDown className="h-4 w-4 ml-2 text-gray-400" />
                  </button>

                  {isAddDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsAddDropdownOpen(false)}
                      ></div>
                      <div className="absolute z-20 w-full md:w-80 right-0 mt-1 bg-white border rounded-lg shadow-xl overflow-hidden flex flex-col">
                        <div className="p-2 border-b bg-gray-50">
                          <input
                            type="text"
                            className="w-full px-3 py-1.5 text-sm border rounded outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 mb-2"
                            placeholder="Tìm kiếm..."
                            value={studentSearchTerm}
                            onChange={(e) => setStudentSearchTerm(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const availableStudents = allStudents
                                  .filter(s => {
                                    const inStudentIds = selectedClassData.studentIds?.includes(s.id);
                                    const sClassName = (s.className || s.class_name || '').trim().toLowerCase();
                                    const classNameMatch = sClassName && sClassName === selectedClassData.name.trim().toLowerCase();
                                    return !inStudentIds && !classNameMatch;
                                  })
                                  .filter(s => s.name.toLowerCase().includes(studentSearchTerm.toLowerCase()) || s.email.toLowerCase().includes(studentSearchTerm.toLowerCase()));
                                setStudentsToAdd(availableStudents.map(s => s.id));
                              }}
                              className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs py-1.5 rounded font-medium border border-indigo-200 transition-colors"
                            >
                              Chọn tất cả
                            </button>
                            <button
                              onClick={() => setStudentsToAdd([])}
                              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-1.5 rounded font-medium border border-gray-300 transition-colors"
                            >
                              Bỏ chọn
                            </button>
                          </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto p-1 bg-white">
                          {allStudents
                            .filter(s => {
                              const inStudentIds = selectedClassData.studentIds?.includes(s.id);
                              const sClassName = (s.className || s.class_name || '').trim().toLowerCase();
                              const classNameMatch = sClassName && sClassName === selectedClassData.name.trim().toLowerCase();
                              return !inStudentIds && !classNameMatch;
                            })
                            .filter(s => s.name.toLowerCase().includes(studentSearchTerm.toLowerCase()) || s.email.toLowerCase().includes(studentSearchTerm.toLowerCase()))
                            .map(s => {
                              const isSelected = studentsToAdd.includes(s.id);
                              return (
                                <label
                                  key={s.id}
                                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded cursor-pointer transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setStudentsToAdd(prev => [...prev, s.id]);
                                      } else {
                                        setStudentsToAdd(prev => prev.filter(id => id !== s.id));
                                      }
                                    }}
                                  />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-medium text-gray-900 truncate">{s.name}</span>
                                    <span className="text-xs text-gray-500 truncate font-mono">{s.email}</span>
                                  </div>
                                </label>
                              );
                            })
                          }
                          {allStudents.filter(s => {
                            const inStudentIds = selectedClassData.studentIds?.includes(s.id);
                            const sClassName = (s.className || s.class_name || '').trim().toLowerCase();
                            const classNameMatch = sClassName && sClassName === selectedClassData.name.trim().toLowerCase();
                            return !inStudentIds && !classNameMatch;
                          }).length === 0 && (
                            <div className="p-4 text-sm text-center text-gray-500 italic">
                              Đã thêm tất cả học sinh vào lớp.
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <button
                  disabled={studentsToAdd.length === 0}
                  onClick={() => handleAddStudentsToClass(selectedClassData.id)}
                  className="bg-indigo-600 text-white px-3 py-2 rounded-lg disabled:bg-gray-300 hover:bg-indigo-700 flex-shrink-0 transition shadow-sm"
                  title="Thêm vào lớp"
                >
                  <UserPlus className="h-5 w-5" />
                </button>
              </div>
              )}
            </div>

            {activeTab === 'students' ? (
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
                {studentsInClass.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">Lớp chưa có học sinh nào.</div>
                ) : (
                  <div className="space-y-6">
                    {groupedStudents.groups.map(g => g.students.length > 0 && (
                      <div 
                        key={g.id} 
                        className="bg-white border rounded-xl overflow-hidden shadow-sm hover:border-indigo-200 transition-colors"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, g.id)}
                      >
                        <div className="px-4 py-3 bg-gray-50 border-b flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color || '#6366f1' }}></div>
                            <h3 className="font-bold text-gray-800">{g.name} <span className="text-gray-500 font-normal">({g.students.length})</span></h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); sortGroupByName(g.id, 'first'); }} 
                              className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-indigo-600 transition-colors" title="Sắp xếp theo Tên (A-Z)">
                              <ArrowDownAZ className="h-4 w-4" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); sortGroupByName(g.id, 'last'); }}
                              className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-indigo-600 transition-colors" title="Sắp xếp theo Họ (A-Z)">
                              <SortAsc className="h-4 w-4" />
                            </button>
                            <div className="w-px h-4 bg-gray-200 mx-1"></div>
                            <span className="text-[10px] text-gray-400 font-medium hidden sm:inline uppercase tracking-tight">Kéo thả để di chuyển</span>
                          </div>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {g.students.map(s => {
                            const selected = selectedStudentIds.includes(s.id);
                            return (
                              <div 
                                key={s.id} 
                                draggable
                                onDragStart={(e) => handleDragStart(e, s.id, g.id)}
                                onClick={() => setSelectedStudentIds(p => p.includes(s.id) ? p.filter(id => id !== s.id) : [...p, s.id])}
                                className={`p-3 flex items-center gap-3 cursor-grab active:cursor-grabbing transition-colors group ${selected ? 'bg-indigo-50/70 border-l-4 border-indigo-500' : 'hover:bg-gray-50 border-l-4 border-transparent'}`}>
                                <GripVertical className="h-4 w-4 text-gray-300 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0" />
                                {selected ? <CheckSquare className="h-5 w-5 text-indigo-600 flex-shrink-0" /> : <div className="h-5 w-5 border-2 rounded text-transparent flex-shrink-0" />}
                                <div className="flex-1 min-w-0">
                                  <p className={`font-bold text-sm truncate ${selected ? 'text-indigo-900' : 'text-gray-900'}`}>{s.name}</p>
                                  <p className="text-xs text-gray-500 truncate font-mono">{s.email}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Ungrouped */}
                    {groupedStudents.ungrouped.length > 0 && (
                      <div className="bg-white border rounded-xl overflow-hidden shadow-sm border-dashed">
                        <div className="px-4 py-3 bg-gray-50/50 border-b">
                          <h3 className="font-bold text-gray-500 italic">Chưa phân tổ <span className="font-normal">({groupedStudents.ungrouped.length})</span></h3>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {groupedStudents.ungrouped.map(s => {
                            const selected = selectedStudentIds.includes(s.id);
                            return (
                              <div 
                                key={s.id} 
                                draggable
                                onDragStart={(e) => handleDragStart(e, s.id, 'ungrouped')}
                                onClick={() => setSelectedStudentIds(p => p.includes(s.id) ? p.filter(id => id !== s.id) : [...p, s.id])}
                                className={`p-3 flex items-center gap-3 cursor-grab active:cursor-grabbing transition-colors group ${selected ? 'bg-indigo-50/70 border-l-4 border-indigo-500' : 'hover:bg-gray-50 border-l-4 border-transparent'}`}>
                                <GripVertical className="h-4 w-4 text-gray-300 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0" />
                                {selected ? <CheckSquare className="h-5 w-5 text-indigo-600 flex-shrink-0" /> : <div className="h-5 w-5 border-2 rounded text-transparent flex-shrink-0" />}
                                <div className="flex-1">
                                  <p className={`font-bold text-sm ${selected ? 'text-indigo-900' : 'text-gray-800'}`}>{s.name}</p>
                                  <p className="text-xs text-gray-400 font-mono">{s.email}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <ClassParentTab classId={selectedClassId!} students={studentsInClass} teacherId={currentUser!.id} />
            )}
          </>
        )}
      </div>

      {showRoulette && (
        <RandomRoulette
          students={studentsInClass}
          groups={groups}
          groupMembers={groupMembers}
          onComplete={handleRouletteComplete}
          onClose={() => setShowRoulette(false)}
        />
      )}

      {showDuckRace && (
        <DuckRace
          students={duckRacePool}
          onClose={() => setShowDuckRace(false)}
          onComplete={handleDuckRaceComplete}
        />
      )}

      {showRandomGroup && (
        <RandomGroupModal
          students={studentsInClass}
          onClose={() => setShowRandomGroup(false)}
        />
      )}

      {showGroupModal && selectedClassId && (
        <GroupManageModal classId={selectedClassId} onClose={() => setShowGroupModal(false)} />
      )}

      {showSeatingModal && selectedClassId && (
        <ClassSeatingModal classId={selectedClassId} students={studentsInClass} onClose={() => setShowSeatingModal(false)} />
      )}
    </div>
  );
};
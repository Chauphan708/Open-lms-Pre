import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store';
import { useClassFunStore, ClassGroup } from '../../services/classFunStore';
import {
    Users, Plus, Trash2, Edit2, Save, X, GripVertical, UserPlus, UserMinus, Palette,
    ArrowDownAZ, SortAsc, MoveVertical
} from 'lucide-react';

const GROUP_COLORS = [
    'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
    'bg-violet-500', 'bg-teal-500', 'bg-orange-500', 'bg-pink-500',
    'bg-indigo-500', 'bg-cyan-500', 'bg-lime-500', 'bg-fuchsia-500',
];

interface GroupManageModalProps {
    classId: string;
    onClose: () => void;
}

export const GroupManageModal: React.FC<GroupManageModalProps> = ({ classId, onClose }) => {
    const { user, classes, users } = useStore();
    const {
        groups, groupMembers, isLoading, fetchClassFunData,
        addGroup, updateGroup, deleteGroup, addStudentToGroup, removeStudentFromGroup,
        updateStudentOrder, moveStudentToGroup
    } = useClassFunStore();

    const [showAddForm, setShowAddForm] = useState(false);
    const [newGroupName, setNewGroupName] = useState('Tổ 1');
    const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0]);
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [assigningGroupId, setAssigningGroupId] = useState<string | null>(null);

    // Students
    const selectedClass = classes.find(c => c.id === classId);
    const classStudents = useMemo(() => {
        if (!selectedClass) return [];
        return users.filter(u => selectedClass.studentIds.includes(u.id));
    }, [selectedClass, users]);

    // Members per group
    const getMembersOfGroup = (groupId: string) => {
        const members = groupMembers.filter(m => m.group_id === groupId)
            .sort((a, b) => a.sort_order - b.sort_order);
        
        return members.map(m => {
            const student = classStudents.find(s => s.id === m.student_id);
            return student ? { ...student, sort_order: m.sort_order } : null;
        }).filter(Boolean) as (any)[];
    };

    // Unassigned students
    const assignedIds = new Set(groupMembers.map(m => m.student_id));
    const unassignedStudents = classStudents.filter(s => !assignedIds.has(s.id));

    // Add group
    const handleAddGroup = async () => {
        if (!newGroupName.trim()) return;
        await addGroup({
            class_id: classId,
            name: newGroupName,
            color: newGroupColor,
            sort_order: groups.length,
        });
        setNewGroupName('Tổ ' + (groups.length + 2)); // Auto advance
        setShowAddForm(false);
    };

    // Delete group
    const handleDeleteGroup = async (id: string) => {
        if (!confirm('Xóa tổ này? Học sinh sẽ trở thành chưa phân tổ.')) return;
        await deleteGroup(id);
    };

    // Save edit
    const handleSaveEdit = async () => {
        if (!editingGroupId || !editName.trim()) return;
        await updateGroup(editingGroupId, { name: editName });
        setEditingGroupId(null);
    };

    // Auto-assign (random shuffle)
    const autoAssign = async () => {
        if (groups.length === 0 || unassignedStudents.length === 0) return;
        const shuffled = [...unassignedStudents].sort(() => Math.random() - 0.5);
        for (let i = 0; i < shuffled.length; i++) {
            const group = groups[i % groups.length];
            await addStudentToGroup(group.id, shuffled[i].id);
        }
    };

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

        await moveStudentToGroup(fromGroupId, toGroupId, studentId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    // --- Sorting Logic ---
    const sortGroupByName = async (groupId: string, type: 'first' | 'last') => {
        const members = getMembersOfGroup(groupId);
        if (members.length <= 1) return;

        const sorted = [...members].sort((a, b) => {
            const nameA = a.name.trim().split(' ');
            const nameB = b.name.trim().split(' ');
            
            if (type === 'first') {
                // Vietnamese "Tên" is the last word
                const firstA = nameA[nameA.length - 1];
                const firstB = nameB[nameB.length - 1];
                return firstA.localeCompare(firstB, 'vi');
            } else {
                // Vietnamese "Họ" is the first word
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-gray-50 w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col relative overflow-hidden">
                {/* Header */}
                <div className="bg-white border-b p-4 flex justify-between items-center sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-700">
                            <Users className="h-6 w-6" /> Quản Lý Tổ / Nhóm ({selectedClass?.name})
                        </h2>
                        <p className="text-sm text-gray-500">Tạo tổ, kéo thả hoặc chọn nút dấu + để thêm học sinh vào tổ.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition relative z-10 text-gray-500">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <button onClick={() => setShowAddForm(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition shadow-sm">
                            <Plus className="h-4 w-4" /> Thêm Tổ
                        </button>

                        {/* Auto-assign bar */}
                        {unassignedStudents.length > 0 && groups.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-row justify-between items-center gap-4 shadow-sm w-full sm:w-auto">
                                <p className="text-sm text-amber-800 hidden sm:block">
                                    <strong>{unassignedStudents.length}</strong> học sinh chưa tổ.
                                </p>
                                <button onClick={autoAssign}
                                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 transition flex-1 sm:flex-none justify-center">
                                    <UserPlus className="h-4 w-4" /> Chia ngẫu nhiên
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Add Group Form */}
                    {showAddForm && (
                        <div className="bg-white rounded-xl shadow-sm border p-5 animate-in slide-in-from-top-4">
                            <h3 className="font-bold text-gray-800 mb-3">Tạo tổ mới</h3>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <select
                                    value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                                    className="flex-1 px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    {[...Array(10)].map((_, i) => (
                                        <option key={i} value={`Tổ ${i + 1}`}>Tổ {i + 1}</option>
                                    ))}
                                </select>
                                <div className="flex gap-1 items-center flex-wrap">
                                    {GROUP_COLORS.map(c => (
                                        <button key={c} onClick={() => setNewGroupColor(c)}
                                            className={`w-7 h-7 rounded-full ${c} transition-all ${newGroupColor === c ? 'scale-125 ring-2 ring-offset-2 ring-indigo-400' : 'hover:scale-110'}`} />
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleAddGroup} className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition whitespace-nowrap">
                                        <Save className="h-4 w-4" /> Lưu
                                    </button>
                                    <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition">
                                        Hủy
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Groups Grid */}
                    {groups.length === 0 ? (
                        <div className="text-center p-16 text-gray-400 bg-white rounded-xl border border-dashed">
                            <Users className="h-16 w-16 mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-semibold">Chưa có tổ nào.</p>
                            <p className="text-sm mt-1">Nhấn "Thêm Tổ" để bắt đầu.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {groups.map(g => {
                                const members = getMembersOfGroup(g.id);
                                const isEditing = editingGroupId === g.id;
                                const isAssigning = assigningGroupId === g.id;

                                return (
                                    <div key={g.id} className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col h-[400px]">
                                        {/* Group header */}
                                        <div className={`${g.color} p-3 text-white`}>
                                            <div className="flex items-center justify-between">
                                                {isEditing ? (
                                                    <div className="flex gap-2 flex-1">
                                                        <input value={editName} onChange={e => setEditName(e.target.value)}
                                                            className="flex-1 px-2 py-1 rounded text-gray-800 text-sm font-medium" autoFocus />
                                                        <button onClick={handleSaveEdit} className="p-1 bg-white/20 rounded hover:bg-white/30"><Save className="h-4 w-4" /></button>
                                                        <button onClick={() => setEditingGroupId(null)} className="p-1 bg-white/20 rounded hover:bg-white/30"><X className="h-4 w-4" /></button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <h3 className="text-base font-bold flex items-center gap-2">
                                                            {g.name}
                                                            <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">{members.length} HS</span>
                                                        </h3>
                                                        <div className="flex gap-1">
                                                            <button onClick={() => sortGroupByName(g.id, 'first')}
                                                                className="p-1.5 bg-white/20 rounded-md hover:bg-white/30 transition" title="Sắp xếp theo Tên (A-Z)">
                                                                <ArrowDownAZ className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button onClick={() => sortGroupByName(g.id, 'last')}
                                                                className="p-1.5 bg-white/20 rounded-md hover:bg-white/30 transition" title="Sắp xếp theo Họ (A-Z)">
                                                                <SortAsc className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button onClick={() => { setEditingGroupId(g.id); setEditName(g.name); }}
                                                                className="p-1.5 bg-white/20 rounded-md hover:bg-white/30 transition"><Edit2 className="h-3.5 w-3.5" /></button>
                                                            <button onClick={() => handleDeleteGroup(g.id)}
                                                                className="p-1.5 bg-white/20 rounded-md hover:bg-white/30 transition"><Trash2 className="h-3.5 w-3.5" /></button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Group members list */}
                                        <div 
                                            className="flex-1 overflow-y-auto p-2 bg-gray-50 border-t border-white/20"
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, g.id)}
                                        >
                                            {isAssigning ? (
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-center mb-2 px-1">
                                                        <span className="text-xs font-bold text-gray-500 uppercase">Chọn HS thêm vào</span>
                                                        <button onClick={() => setAssigningGroupId(null)} className="text-xs text-indigo-600 font-medium">Đóng</button>
                                                    </div>
                                                    {unassignedStudents.length === 0 ? (
                                                        <p className="text-xs text-gray-400 text-center py-4">Hết học sinh trống</p>
                                                    ) : (
                                                        unassignedStudents.map(s => (
                                                            <div key={s.id} className="flex justify-between items-center p-2 text-sm bg-white rounded border border-gray-100 shadow-sm">
                                                                <span className="truncate flex-1">{s.name}</span>
                                                                <button onClick={() => addStudentToGroup(g.id, s.id)}
                                                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Plus className="h-4 w-4" /></button>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-1">
                                                    {members.length === 0 ? (
                                                        <div className="text-center p-8 text-gray-400">
                                                            <p className="text-sm">Trống</p>
                                                        </div>
                                                    ) : (
                                                        members.map((s, idx) => (
                                                            <div 
                                                                key={s.id} 
                                                                draggable
                                                                onDragStart={(e) => handleDragStart(e, s.id, g.id)}
                                                                className="group flex justify-between items-center p-2 text-sm bg-white rounded border border-transparent hover:border-indigo-200 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing"
                                                            >
                                                                <div className="flex items-center gap-2 overflow-hidden">
                                                                    <GripVertical className="h-4 w-4 text-gray-300 group-hover:text-indigo-400 group-hover:opacity-100" />
                                                                    <span className="truncate font-medium text-gray-700">{s.name}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => removeStudentFromGroup(g.id, s.id)}
                                                                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded" title="Xóa khỏi tổ"><X className="h-3.5 w-3.5" /></button>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Add student button */}
                                        {!isAssigning && (
                                            <div className="p-2 bg-white border-t">
                                                <button onClick={() => setAssigningGroupId(g.id)}
                                                    className="w-full py-2 text-sm text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 font-medium rounded-lg transition-colors flex items-center justify-center gap-1 border border-dashed border-gray-300 hover:border-indigo-300">
                                                    <Plus className="h-4 w-4" /> Thêm HS vào tổ
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

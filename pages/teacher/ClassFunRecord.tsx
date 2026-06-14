import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store';
import { useClassFunStore, Behavior } from '../../services/classFunStore';
import {
    ThumbsUp, ThumbsDown, Search, Plus, X, CheckSquare, Square, Zap,
    Edit2, Trash2, Save, ChevronDown, ChevronUp, Users, Sparkles,
    List, Download, Clock
} from 'lucide-react';

// --- Default behaviors for seeding ---
const DEFAULT_POSITIVE: Omit<Behavior, 'id' | 'teacher_id'>[] = [
    { description: 'Phát biểu xây dựng bài', type: 'POSITIVE', points: 5 },
    { description: 'Hoàn thành bài tập tốt', type: 'POSITIVE', points: 5 },
    { description: 'Giúp đỡ bạn bè', type: 'POSITIVE', points: 3 },
    { description: 'Giữ trật tự tốt', type: 'POSITIVE', points: 3 },
    { description: 'Tham gia tích cực', type: 'POSITIVE', points: 5 },
    { description: 'Sáng tạo, đổi mới', type: 'POSITIVE', points: 10 },
];
const DEFAULT_NEGATIVE: Omit<Behavior, 'id' | 'teacher_id'>[] = [
    { description: 'Nói chuyện riêng', type: 'NEGATIVE', points: -3 },
    { description: 'Không làm bài tập', type: 'NEGATIVE', points: -5 },
    { description: 'Đi trễ', type: 'NEGATIVE', points: -3 },
    { description: 'Thiếu tập trung', type: 'NEGATIVE', points: -2 },
    { description: 'Vi phạm nội quy', type: 'NEGATIVE', points: -5 },
];

export const ClassFunRecord: React.FC = () => {
    const { user, classes, users } = useStore();
    const {
        behaviors, logs, groupMembers, groups, isLoading,
        fetchClassFunData, addBehavior, updateBehavior, deleteBehavior, batchAddBehaviorLogs,
        attendance, fetchAttendance, deleteBehaviorLog,
        autoPointThresholds, fetchPointThresholds, savePointThresholds, updateBehaviorLog
    } = useClassFunStore();

    // --- States ---
    const myClasses = classes.filter(c => c.teacherId === user?.id);
    const [selectedClassId, setSelectedClassId] = useState(myClasses[0]?.id || '');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [customReason, setCustomReason] = useState('');
    const [showManageBehaviors, setShowManageBehaviors] = useState(false);
    const [showAutoPointConfig, setShowAutoPointConfig] = useState(false);
    const [showSuccess, setShowSuccess] = useState<{ points: number; count: number } | null>(null);
    const [showAllHistory, setShowAllHistory] = useState(false);

    const handleExportHistory = () => {
        const headers = ['Học sinh', 'Hành vi/Lý do', 'Điểm', 'Thời gian'];
        const csvData = (logs || []).map(log => {
            const student = users.find(u => u.id === log.student_id);
            return [
                `"${student?.name || 'HS ẩn'}"`,
                `"${log.reason || 'Khen ngợi/Nhắc nhở'}"`,
                log.points,
                new Date(log.created_at).toLocaleString('vi-VN')
            ];
        });

        const csvContent = [headers, ...csvData].map(e => e.join(",")).join("\n");
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `lich_su_diem_${selectedClass?.name || 'class'}_${new Date().toLocaleDateString()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // New behavior form
    const [newBehavior, setNewBehavior] = useState({ description: '', type: 'POSITIVE' as 'POSITIVE' | 'NEGATIVE', points: 5 });
    const [editingBehavior, setEditingBehavior] = useState<{ id: string; description: string; type: 'POSITIVE' | 'NEGATIVE'; points: number } | null>(null);
    const [editingLogId, setEditingLogId] = useState<string | null>(null);
    const [editLogData, setEditLogData] = useState({ points: 0, reason: '' });

    const [tempThresholds, setTempThresholds] = useState(autoPointThresholds);

    useEffect(() => {
        setTempThresholds(autoPointThresholds);
    }, [autoPointThresholds]);

    // Load data
    useEffect(() => {
        if (selectedClassId && user?.id) {
            fetchClassFunData(selectedClassId, user.id);
            fetchPointThresholds(user.id);
        }
    }, [selectedClassId, user?.id, fetchClassFunData, fetchPointThresholds]);

    const todayStr = new Date().toLocaleDateString('en-CA');
    useEffect(() => {
        if (selectedClassId) {
            fetchAttendance(selectedClassId, todayStr);
        }
    }, [selectedClassId, todayStr, fetchAttendance]);

    useEffect(() => {
        if (!selectedClassId && myClasses.length > 0) setSelectedClassId(myClasses[0].id);
    }, [myClasses, selectedClassId]);

    // Students in class
    const selectedClass = classes.find(c => c.id === selectedClassId);
    const classStudents = useMemo(() => {
        if (!selectedClass) return [];
        return users.filter(u => selectedClass.studentIds.includes(u.id));
    }, [selectedClass, users]);

    // Check attendance status
    const currentAttendance = useMemo(() => {
        const map: Record<string, 'present' | 'excused' | 'unexcused'> = {};
        (attendance || []).forEach((a: any) => { map[a.student_id] = a.status; });
        return map;
    }, [attendance]);

    // Filter students
    const filteredStudents = useMemo(() => {
        if (!searchQuery) return classStudents;
        const q = searchQuery.toLowerCase();
        return classStudents.filter(s => s.name.toLowerCase().includes(q));
    }, [classStudents, searchQuery]);

    // Group students by group
    const groupedStudents = useMemo(() => {
        const result = {
            groups: (groups || []).map((g: any) => ({ ...g, students: [] as typeof filteredStudents })).sort((a: any, b: any) => a.sort_order - b.sort_order),
            ungrouped: [] as typeof filteredStudents
        };

        filteredStudents.forEach((s: any) => {
            const member = (groupMembers || []).find((m: any) => m.student_id === s.id);
            if (member) {
                const group = result.groups.find((g: any) => g.id === member.group_id);
                if (group) group.students.push(s);
                else result.ungrouped.push(s);
            } else {
                result.ungrouped.push(s);
            }
        });

        return result;
    }, [filteredStudents, groups, groupMembers]);

    // Student scores
    const studentScores = useMemo(() => {
        const scores = new Map<string, number>();
        logs.forEach(l => { scores.set(l.student_id, (scores.get(l.student_id) || 0) + l.points); });
        return scores;
    }, [logs]);

    // Toggle student selection
    const toggleStudent = (id: string) => {
        if (currentAttendance[id] === 'excused' || currentAttendance[id] === 'unexcused') return;
        setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };
    const selectAll = () => setSelectedStudentIds(classStudents.filter(s => currentAttendance[s.id] !== 'excused' && currentAttendance[s.id] !== 'unexcused').map(s => s.id));
    const deselectAll = () => setSelectedStudentIds([]);
    const selectGroup = (groupId: string) => {
        const memberIds = groupMembers.filter(m => m.group_id === groupId).map(m => m.student_id);
        const validIds = memberIds.filter(id => currentAttendance[id] !== 'excused' && currentAttendance[id] !== 'unexcused');
        setSelectedStudentIds(prev => [...new Set([...prev, ...validIds])]);
    };

    // Apply behavior
    const applyBehavior = async (behavior: Behavior) => {
        if (selectedStudentIds.length === 0) return;
        const reason = customReason || behavior.description;
        const logsToAdd = selectedStudentIds.map(sid => ({
            student_id: sid,
            class_id: selectedClassId,
            behavior_id: behavior.id,
            points: behavior.points,
            reason: reason,
            recorded_by: user?.id || null,
        }));
        await batchAddBehaviorLogs(logsToAdd);

        // Notify students
        if (selectedClass) {
            // Recalculate scores including the new points
            const newScores = new Map<string, number>(studentScores);
            selectedStudentIds.forEach(sid => {
                newScores.set(sid, (newScores.get(sid) || 0) + behavior.points);
            });

            // Calculate ranks
            const sortedStudents = [...classStudents].sort((a, b) => (newScores.get(b.id) || 0) - (newScores.get(a.id) || 0));
            const totalStudents = sortedStudents.length;

            selectedStudentIds.forEach(async (sid) => {
                const rank = sortedStudents.findIndex(s => s.id === sid) + 1;

                // Normal point notification
                useStore.getState().addNotification({
                    id: `notif_beh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    userId: sid,
                    type: behavior.points > 0 ? 'SUCCESS' : 'WARNING',
                    title: behavior.points > 0 ? 'Tích cực' : 'Cần cố gắng',
                    message: `Bạn vừa được ${behavior.points > 0 ? 'cộng' : 'trừ'} ${Math.abs(behavior.points)} điểm. Lý do: ${reason}.`,
                    link: '/',
                    isRead: false,
                    createdAt: new Date().toISOString()
                });

                // Top 10 notification
                if (rank > 0 && rank <= 10) {
                    useStore.getState().addNotification({
                        id: `notif_top10_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                        userId: sid,
                        type: 'INFO',
                        title: 'Bảng Vàng',
                        message: `🎉 Chúc mừng! Bạn đang đạt Hạng ${rank}/${totalStudents} trong bảng vàng của môn học!`,
                        link: '/',
                        isRead: false,
                        createdAt: new Date().toISOString()
                    });
                }
            });
        }

        setShowSuccess({ points: behavior.points, count: selectedStudentIds.length });
        setSelectedStudentIds([]);
        setCustomReason('');
        setTimeout(() => setShowSuccess(null), 2000);
    };

    // Add custom behavior
    const handleAddBehavior = async () => {
        if (!newBehavior.description.trim() || !user?.id) return;
        await addBehavior({
            teacher_id: user.id,
            description: newBehavior.description,
            type: newBehavior.type,
            points: newBehavior.type === 'NEGATIVE' ? -Math.abs(newBehavior.points) : Math.abs(newBehavior.points),
        });
        setNewBehavior({ description: '', type: 'POSITIVE', points: 5 });
    };

    // Save edited behavior
    const handleSaveEditBehavior = async () => {
        if (!editingBehavior || !editingBehavior.description.trim()) return;
        await updateBehavior(editingBehavior.id, {
            description: editingBehavior.description,
            type: editingBehavior.type,
            points: editingBehavior.type === 'NEGATIVE' ? -Math.abs(editingBehavior.points) : Math.abs(editingBehavior.points),
        });
        setEditingBehavior(null);
    };

    // Seed default behaviors
    const seedDefaults = async () => {
        if (!user?.id) return;
        for (const b of [...DEFAULT_POSITIVE, ...DEFAULT_NEGATIVE]) {
            await addBehavior({ ...b, teacher_id: user.id });
        }
    };

    const positiveBehaviors = behaviors.filter(b => b.type === 'POSITIVE');
    const negativeBehaviors = behaviors.filter(b => b.type === 'NEGATIVE');

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Success Toast */}
            {showSuccess && (
                <div className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-2xl text-white font-bold flex items-center gap-3 animate-bounce ${showSuccess.points > 0 ? 'bg-emerald-500' : 'bg-red-500'
                    }`}>
                    <Sparkles className="h-6 w-6" />
                    {showSuccess.points > 0 ? '+' : ''}{showSuccess.points} điểm cho {showSuccess.count} học sinh!
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                        <Zap className="h-8 w-8 text-amber-500" />
                        Ghi Nhận Hành Vi
                    </h1>
                    <p className="text-gray-500 mt-1">Chọn học sinh → Chọn hành vi → Cộng/trừ điểm</p>
                </div>
                <div className="flex gap-3">
                    {myClasses.length > 1 && (
                        <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
                            className="border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none">
                            {myClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    )}
                    <button onClick={() => setShowManageBehaviors(!showManageBehaviors)}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition ${showManageBehaviors ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white hover:bg-gray-50'}`}>
                        <Edit2 className="h-4 w-4" /> Quản lý hành vi
                    </button>
                    <button onClick={() => { setShowAutoPointConfig(!showAutoPointConfig); setShowManageBehaviors(false); }}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition ${showAutoPointConfig ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white hover:bg-gray-50'}`}>
                        <Zap className="h-4 w-4" /> Điểm cộng tự động
                    </button>
                </div>
            </div>

            {/* Auto Point Config Panel */}
            {showAutoPointConfig && (
                <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4 animate-in slide-in-from-top-2">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-800">Cấu hình mốc điểm bài tập</h2>
                        <p className="text-xs text-gray-500 italic">* Hệ thống sẽ cộng thêm điểm chênh lệch khi HS đạt mốc cao hơn.</p>
                    </div>
                    
                    <div className="space-y-3">
                        {tempThresholds.map((t, idx) => (
                            <div key={t.id || idx} className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <div className="flex-1 flex items-center gap-2">
                                    <span className="text-sm font-bold text-gray-600 min-w-20">Đúng từ:</span>
                                    <div className="relative flex-1 max-w-[120px]">
                                        <input 
                                            type="number" 
                                            value={t.percentage} 
                                            onChange={(e) => {
                                                const newThresholds = [...tempThresholds];
                                                newThresholds[idx] = { ...newThresholds[idx], percentage: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) };
                                                setTempThresholds(newThresholds);
                                            }}
                                            className="w-full pl-3 pr-8 py-2 border rounded-lg text-sm font-black"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                                    </div>
                                </div>
                                <div className="flex-1 flex items-center gap-2">
                                    <span className="text-sm font-bold text-gray-600 min-w-20">Tổng điểm:</span>
                                    <input 
                                        type="number" 
                                        value={t.points} 
                                        onChange={(e) => {
                                            const newThresholds = [...tempThresholds];
                                            newThresholds[idx] = { ...newThresholds[idx], points: parseInt(e.target.value) || 0 };
                                            setTempThresholds(newThresholds);
                                        }}
                                        className="w-full max-w-[80px] px-3 py-2 border rounded-lg text-sm font-black text-indigo-600"
                                    />
                                </div>
                                <button 
                                    onClick={() => {
                                        setTempThresholds(tempThresholds.filter((_, i) => i !== idx));
                                    }}
                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t">
                        <button 
                            onClick={() => {
                                setTempThresholds([...tempThresholds, { id: `new_${Date.now()}`, percentage: 0, points: 0 }]);
                            }}
                            className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-50 transition"
                        >
                            <Plus className="h-4 w-4" /> Thêm mốc mới
                        </button>
                        <button 
                            onClick={() => {
                                if (user?.id) savePointThresholds(user.id, tempThresholds);
                                setShowAutoPointConfig(false);
                            }}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-md shadow-indigo-100 transition"
                        >
                            Lưu cấu hình
                        </button>
                    </div>
                </div>
            )}

            {/* Manage Behaviors Panel */}
            {showManageBehaviors && (
                <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-800">Danh sách hành vi</h2>
                        {behaviors.length === 0 && (
                            <button onClick={seedDefaults} className="text-sm text-indigo-600 hover:underline font-medium">
                                + Dùng mẫu mặc định
                            </button>
                        )}
                    </div>

                    {/* Add new */}
                    <div className="flex flex-col sm:flex-row gap-2 p-4 bg-gray-50 rounded-lg border">
                        <input value={newBehavior.description} onChange={e => setNewBehavior(p => ({ ...p, description: e.target.value }))}
                            placeholder="Mô tả hành vi..." className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                        <select value={newBehavior.type} onChange={e => setNewBehavior(p => ({ ...p, type: e.target.value as 'POSITIVE' | 'NEGATIVE' }))}
                            className="px-3 py-2 border rounded-lg text-sm">
                            <option value="POSITIVE">Tích cực</option>
                            <option value="NEGATIVE">Tiêu cực</option>
                        </select>
                        <input type="number" value={newBehavior.points} onChange={e => setNewBehavior(p => ({ ...p, points: parseInt(e.target.value) || 0 }))}
                            className="w-20 px-3 py-2 border rounded-lg text-sm" />
                        <button onClick={handleAddBehavior}
                            className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
                            <Plus className="h-4 w-4" /> Thêm
                        </button>
                    </div>

                    {/* List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h3 className="text-sm font-bold text-emerald-700 mb-2 flex items-center gap-1"><ThumbsUp className="h-4 w-4" /> Tích cực</h3>
                            {positiveBehaviors.map(b => (
                                <div key={b.id} className="flex flex-col p-2 rounded-lg hover:bg-emerald-50 group">
                                    {editingBehavior?.id === b.id ? (
                                        <div className="flex flex-col gap-2 w-full mt-1">
                                            <input autoFocus value={editingBehavior.description} onChange={e => setEditingBehavior({ ...editingBehavior, description: e.target.value })}
                                                className="w-full px-2 py-1 text-sm border rounded outline-none focus:border-indigo-500" placeholder="Mô tả" />
                                            <div className="flex gap-2">
                                                <input type="number" value={editingBehavior.points} onChange={e => setEditingBehavior({ ...editingBehavior, points: parseInt(e.target.value) || 0 })}
                                                    className="w-16 px-2 py-1 text-sm border rounded outline-none focus:border-indigo-500" />
                                                <button onClick={handleSaveEditBehavior} className="px-2 py-1 bg-emerald-600 text-white rounded text-xs flex items-center gap-1 hover:bg-emerald-700"><Save className="w-3 h-3" /> Lưu</button>
                                                <button onClick={() => setEditingBehavior(null)} className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs flex items-center gap-1 hover:bg-gray-300"><X className="w-3 h-3" /> Hủy</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between w-full">
                                            <span className="text-sm">{b.description} <span className="text-emerald-600 font-bold">+{b.points}</span></span>
                                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 transition">
                                                <button onClick={() => setEditingBehavior({ id: b.id, description: b.description, type: b.type, points: Math.abs(b.points) })} className="text-blue-500 hover:text-blue-700" title="Sửa">
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => deleteBehavior(b.id)} className="text-red-400 hover:text-red-600" title="Xóa">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-red-700 mb-2 flex items-center gap-1"><ThumbsDown className="h-4 w-4" /> Tiêu cực</h3>
                            {negativeBehaviors.map(b => (
                                <div key={b.id} className="flex flex-col p-2 rounded-lg hover:bg-red-50 group">
                                    {editingBehavior?.id === b.id ? (
                                        <div className="flex flex-col gap-2 w-full mt-1">
                                            <input autoFocus value={editingBehavior.description} onChange={e => setEditingBehavior({ ...editingBehavior, description: e.target.value })}
                                                className="w-full px-2 py-1 text-sm border rounded outline-none focus:border-indigo-500" placeholder="Mô tả" />
                                            <div className="flex gap-2">
                                                <input type="number" value={editingBehavior.points} onChange={e => setEditingBehavior({ ...editingBehavior, points: parseInt(e.target.value) || 0 })}
                                                    className="w-16 px-2 py-1 text-sm border rounded outline-none focus:border-indigo-500" />
                                                <button onClick={handleSaveEditBehavior} className="px-2 py-1 bg-red-600 text-white rounded text-xs flex items-center gap-1 hover:bg-red-700"><Save className="w-3 h-3" /> Lưu</button>
                                                <button onClick={() => setEditingBehavior(null)} className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs flex items-center gap-1 hover:bg-gray-300"><X className="w-3 h-3" /> Hủy</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between w-full">
                                            <span className="text-sm">{b.description} <span className="text-red-600 font-bold">{b.points}</span></span>
                                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 transition">
                                                <button onClick={() => setEditingBehavior({ id: b.id, description: b.description, type: b.type, points: Math.abs(b.points) })} className="text-blue-500 hover:text-blue-700" title="Sửa">
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => deleteBehavior(b.id)} className="text-red-400 hover:text-red-600" title="Xóa">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Student Selection Panel */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-800">Chọn Học Sinh</h2>
                        <span className="text-sm text-indigo-600 font-bold bg-indigo-50 px-3 py-1 rounded-full">
                            {selectedStudentIds.length} đã chọn
                        </span>
                    </div>

                    {/* Search */}
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Tìm học sinh..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>

                    {/* Quick select */}
                    <div className="flex flex-wrap gap-2 mb-3">
                        <button onClick={selectAll} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-medium hover:bg-indigo-100 transition">
                            Chọn tất cả
                        </button>
                        <button onClick={deselectAll} className="text-xs bg-gray-50 text-gray-600 px-3 py-1 rounded-full font-medium hover:bg-gray-100 transition">
                            Bỏ chọn
                        </button>
                        {groups.map(g => (
                            <button key={g.id} onClick={() => selectGroup(g.id)}
                                className="text-xs bg-sky-50 text-sky-700 px-3 py-1 rounded-full font-medium hover:bg-sky-100 transition flex items-center gap-1">
                                <Users className="h-3 w-3" /> {g.name}
                            </button>
                        ))}
                    </div>

                    {/* Student list */}
                    <div className="max-h-[900px] overflow-y-auto pr-1 space-y-4">
                        {groupedStudents.groups.map(g => g.students.length > 0 && (
                            <div key={g.id} className="bg-gray-50/50 rounded-xl overflow-hidden border border-gray-100">
                                <div className="px-3 py-2 bg-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color || '#6366f1' }}></div>
                                        <h3 className="font-bold text-gray-700 text-sm">{g.name} <span className="font-normal text-gray-400">({g.students.length})</span></h3>
                                    </div>
                                    <button onClick={() => selectGroup(g.id)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">Chọn cả tổ</button>
                                </div>
                                <div className="p-1 space-y-1">
                                    {g.students.map((s: any) => {
                                        const selected = selectedStudentIds.includes(s.id);
                                        const score = studentScores.get(s.id) || 0;
                                        const isAbsent = currentAttendance[s.id] === 'excused' || currentAttendance[s.id] === 'unexcused';

                                        return (
                                            <button key={s.id} onClick={() => toggleStudent(s.id)}
                                                disabled={isAbsent}
                                                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left 
                                                    ${isAbsent ? 'opacity-50 cursor-not-allowed bg-gray-50' :
                                                        (selected ? 'bg-indigo-50 border-2 border-indigo-300 shadow-sm' : 'hover:bg-gray-50 border-2 border-transparent')}
                                                `}>
                                                {selected ? <CheckSquare className="h-4 w-4 text-indigo-600 flex-shrink-0" /> : <Square className={`h-4 w-4 flex-shrink-0 ${isAbsent ? 'text-gray-200' : 'text-gray-300'}`} />}
                                                <img src={s.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=6366f1&color=fff&size=40`}
                                                    alt="" className={`w-8 h-8 rounded-full flex-shrink-0 ${isAbsent ? 'grayscale' : ''}`} />
                                                <div className="flex-1 min-w-0">
                                                    <span className={`text-sm font-semibold ${selected ? 'text-indigo-800' : 'text-gray-800'}`}>{s.name} {isAbsent && '(Vắng)'}</span>
                                                </div>
                                                <span className={`text-sm font-bold ${score >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {score > 0 ? '+' : ''}{score}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {/* Ungrouped */}
                        {groupedStudents.ungrouped.length > 0 && (
                            <div className="bg-gray-50/50 rounded-xl overflow-hidden border border-dashed border-gray-200">
                                <div className="px-3 py-2 bg-gray-50/80 border-b border-dashed border-gray-200">
                                    <h3 className="font-bold text-gray-500 text-sm italic">Chưa xếp tổ <span className="font-normal text-gray-400">({groupedStudents.ungrouped.length})</span></h3>
                                </div>
                                <div className="p-1 space-y-1">
                                    {groupedStudents.ungrouped.map(s => {
                                        const selected = selectedStudentIds.includes(s.id);
                                        const score = studentScores.get(s.id) || 0;
                                        const isAbsent = currentAttendance[s.id] === 'excused' || currentAttendance[s.id] === 'unexcused';

                                        return (
                                            <button key={s.id} onClick={() => toggleStudent(s.id)}
                                                disabled={isAbsent}
                                                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left 
                                                    ${isAbsent ? 'opacity-50 cursor-not-allowed bg-gray-50' :
                                                        (selected ? 'bg-indigo-50 border-2 border-indigo-300 shadow-sm' : 'hover:bg-gray-50 border-2 border-transparent')}
                                                `}>
                                                {selected ? <CheckSquare className="h-4 w-4 text-indigo-600 flex-shrink-0" /> : <Square className={`h-4 w-4 flex-shrink-0 ${isAbsent ? 'text-gray-200' : 'text-gray-300'}`} />}
                                                <img src={s.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=6366f1&color=fff&size=40`}
                                                    alt="" className={`w-8 h-8 rounded-full flex-shrink-0 ${isAbsent ? 'grayscale' : ''}`} />
                                                <div className="flex-1 min-w-0">
                                                    <span className={`text-sm font-semibold ${selected ? 'text-indigo-800' : 'text-gray-800'}`}>{s.name} {isAbsent && '(Vắng)'}</span>
                                                </div>
                                                <span className={`text-sm font-bold ${score >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {score > 0 ? '+' : ''}{score}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Behavior Selection Panel */}
                <div className="lg:col-span-3 space-y-5">
                    {/* Custom reason */}
                    <div className="bg-white rounded-xl shadow-sm border p-5">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Ghi chú riêng (không bắt buộc)</label>
                        <input value={customReason} onChange={e => setCustomReason(e.target.value)}
                            placeholder="VD: Hăng hái phát biểu tiết Toán"
                            className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>

                    {/* Positive behaviors */}
                    <div className="bg-white rounded-xl shadow-sm border p-5">
                        <h2 className="text-lg font-bold text-emerald-700 mb-4 flex items-center gap-2">
                            <ThumbsUp className="h-5 w-5" /> Hành vi tích cực
                        </h2>
                        {positiveBehaviors.length === 0 ? (
                            <p className="text-center text-gray-400 text-sm py-6">Chưa có hành vi nào. Nhấn "Quản lý hành vi" để thêm.</p>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {positiveBehaviors.map(b => (
                                    <button key={b.id} onClick={() => applyBehavior(b)}
                                        disabled={selectedStudentIds.length === 0}
                                        className={`group relative p-4 rounded-xl border-2 text-left transition-all duration-200 ${selectedStudentIds.length > 0
                                            ? 'border-emerald-200 hover:border-emerald-400 hover:shadow-md hover:scale-[1.02] active:scale-95 bg-emerald-50/50'
                                            : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                                            }`}>
                                        <div className="text-2xl font-extrabold text-emerald-600">+{b.points}</div>
                                        <div className="text-sm font-medium text-gray-700 mt-1 line-clamp-2">{b.description}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Negative behaviors */}
                    <div className="bg-white rounded-xl shadow-sm border p-5">
                        <h2 className="text-lg font-bold text-red-700 mb-4 flex items-center gap-2">
                            <ThumbsDown className="h-5 w-5" /> Hành vi cần nhắc nhở
                        </h2>
                        {negativeBehaviors.length === 0 ? (
                            <p className="text-center text-gray-400 text-sm py-6">Chưa có hành vi nào.</p>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {negativeBehaviors.map(b => (
                                    <button key={b.id} onClick={() => applyBehavior(b)}
                                        disabled={selectedStudentIds.length === 0}
                                        className={`group relative p-4 rounded-xl border-2 text-left transition-all duration-200 ${selectedStudentIds.length > 0
                                            ? 'border-red-200 hover:border-red-400 hover:shadow-md hover:scale-[1.02] active:scale-95 bg-red-50/50'
                                            : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                                            }`}>
                                        <div className="text-2xl font-extrabold text-red-600">{b.points}</div>
                                        <div className="text-sm font-medium text-gray-700 mt-1 line-clamp-2">{b.description}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent History */}
                    <div className="bg-white rounded-xl shadow-sm border p-5">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                Lịch sử cộng/trừ điểm (Hôm nay)
                            </h2>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleExportHistory}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-50 border rounded-lg hover:bg-gray-100 transition-all"
                                    title="Xuất danh sách ra CSV"
                                >
                                    <Download className="h-3.5 w-3.5" /> Xuất file
                                </button>
                                <button 
                                    onClick={() => setShowAllHistory(true)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-all"
                                >
                                    <List className="h-3.5 w-3.5" /> Xem toàn bộ
                                </button>
                            </div>
                        </div>
                        {logs.filter(l => l.created_at.startsWith(todayStr)).length === 0 ? (
                            <p className="text-center text-gray-400 text-sm py-4">Chưa có bản ghi nào.</p>
                        ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {logs.filter(l => l.created_at.startsWith(todayStr)).map(log => {
                                    const student = users.find(u => u.id === log.student_id);
                                    const isEditing = editingLogId === log.id;

                                    return (
                                        <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-gray-50 border gap-2 hover:bg-gray-100 transition group/log">
                                            <div className="flex items-center gap-3 flex-1">
                                                <img src={student?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student?.name || '')}&background=6366f1&color=fff&size=32`} className="w-8 h-8 rounded-full" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-gray-800">{student?.name}</p>
                                                    {isEditing ? (
                                                        <input 
                                                            value={editLogData.reason} 
                                                            onChange={e => setEditLogData({ ...editLogData, reason: e.target.value })}
                                                            className="text-xs w-full mt-1 px-2 py-1 border rounded"
                                                        />
                                                    ) : (
                                                        <p className="text-xs text-gray-500 line-clamp-1">{log.reason}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 self-end sm:self-auto">
                                                {isEditing ? (
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="number" 
                                                            value={editLogData.points} 
                                                            onChange={e => setEditLogData({ ...editLogData, points: parseInt(e.target.value) || 0 })}
                                                            className="w-16 px-2 py-1 text-sm border rounded font-bold"
                                                        />
                                                        <button onClick={() => {
                                                            updateBehaviorLog(log.id, editLogData);
                                                            setEditingLogId(null);
                                                        }} className="p-1 px-2 bg-indigo-600 text-white rounded text-xs">Lưu</button>
                                                        <button onClick={() => setEditingLogId(null)} className="p-1 px-2 bg-gray-200 text-gray-600 rounded text-xs">Hủy</button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className={`text-sm font-bold ${log.points >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                            {log.points > 0 ? '+' : ''}{log.points}
                                                        </span>
                                                        <span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>

                                                        <div className="flex items-center gap-1">
                                                            <button 
                                                                onClick={() => {
                                                                    setEditingLogId(log.id);
                                                                    setEditLogData({ points: log.points, reason: log.reason || '' });
                                                                }} 
                                                                className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition" title="Sửa bản ghi này"
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                            </button>
                                                            <button 
                                                                onClick={() => deleteBehaviorLog(log.id)} 
                                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Xóa lịch sử này"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- ALL HISTORY MODAL --- */}
            {showAllHistory && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50/50 sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-200">
                                    <List className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900">Toàn bộ lịch sử điểm</h2>
                                    <p className="text-sm text-gray-500">Lớp: <span className="font-bold text-indigo-600">{selectedClass?.name}</span></p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={handleExportHistory}
                                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 shadow-sm transition-all"
                                >
                                    <Download className="h-5 w-5 text-indigo-500" /> Xuất CSV
                                </button>
                                <button onClick={() => setShowAllHistory(false)} className="hover:bg-gray-100 p-2.5 rounded-full transition-colors">
                                    <X className="h-7 w-7 text-gray-400" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-gray-50/30">
                            {(logs || []).length === 0 ? (
                                <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                                    <Sparkles className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                                    <p className="text-gray-400 font-medium italic">Chưa có lịch sử ghi nhận điểm nào.</p>
                                </div>
                            ) : (
                                (logs || []).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((log: any) => {
                                    const student = users.find(u => u.id === log.student_id);
                                    return (
                                        <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-lg
                                                    ${log.points >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                    {log.points > 0 ? `+${log.points}` : log.points}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-black text-gray-900 truncate group-hover:text-indigo-600 transition-colors uppercase text-sm tracking-wide">
                                                        {student?.name || 'HS ẩn'}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-sm text-gray-600 font-medium italic">"{log.reason || 'Khen ngợi/Nhắc nhở'}"</span>
                                                        <span className="text-[10px] text-gray-300">•</span>
                                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                                            <Clock className="h-3 w-3" /> {new Date(log.created_at).toLocaleString('vi-VN')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-4 sm:mt-0 flex items-center gap-2 self-end sm:self-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                                 <button 
                                                    onClick={() => deleteBehaviorLog(log.id)} 
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition" title="Xóa"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        <div className="p-6 border-t bg-gray-50/50 text-center rounded-b-3xl">
                            <button 
                                onClick={() => setShowAllHistory(false)} 
                                className="bg-indigo-600 text-white px-12 py-3 rounded-2xl font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95"
                            >
                                ĐÓNG
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

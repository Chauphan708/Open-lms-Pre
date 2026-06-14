import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store';
import { useClassFunStore, AttendanceRecord } from '../../services/classFunStore';
import { supabase } from '../../services/supabaseClient';
import {
    ClipboardCheck, CheckCircle, XCircle, AlertCircle, Save, Calendar, Users, ChevronLeft, ChevronRight
} from 'lucide-react';

const StatusConfig = {
    present: { label: 'Có mặt', icon: CheckCircle, color: 'bg-emerald-100 text-emerald-700 border-emerald-300', badge: 'bg-emerald-500' },
    excused: { label: 'Có phép', icon: AlertCircle, color: 'bg-amber-100 text-amber-700 border-amber-300', badge: 'bg-amber-500' },
    unexcused: { label: 'Vắng KP', icon: XCircle, color: 'bg-red-100 text-red-700 border-red-300', badge: 'bg-red-500' },
};

export const ClassFunAttendance: React.FC = () => {
    const { user, classes, users } = useStore();
    const { attendance, fetchAttendance, saveAttendance, batchAddBehaviorLogs, isLoading } = useClassFunStore();

    const myClasses = classes.filter(c => c.teacherId === user?.id);
    const [selectedClassId, setSelectedClassId] = useState(myClasses[0]?.id || '');
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    });
    const [localStatuses, setLocalStatuses] = useState<Record<string, 'present' | 'excused' | 'unexcused'>>({});
    const [saving, setSaving] = useState(false);
    const [showSaved, setShowSaved] = useState(false);

    // Students
    const selectedClass = classes.find(c => c.id === selectedClassId);
    const classStudents = useMemo(() => {
        if (!selectedClass) return [];
        return users.filter(u => selectedClass.studentIds.includes(u.id)).sort((a, b) => a.name.localeCompare(b.name));
    }, [selectedClass, users]);

    // Fetch attendance for selectedDate
    useEffect(() => {
        if (selectedClassId && selectedDate) {
            fetchAttendance(selectedClassId, selectedDate);
        }
    }, [selectedClassId, selectedDate, fetchAttendance]);

    // Sync local statuses when attendance data arrives
    useEffect(() => {
        const map: Record<string, 'present' | 'excused' | 'unexcused'> = {};
        classStudents.forEach(s => {
            const record = attendance.find(a => a.student_id === s.id);
            map[s.id] = record ? record.status : 'present'; // default is present
        });
        setLocalStatuses(map);
    }, [attendance, classStudents]);

    useEffect(() => {
        if (!selectedClassId && myClasses.length > 0) setSelectedClassId(myClasses[0].id);
    }, [myClasses, selectedClassId]);

    // Date navigation
    const changeDate = (offset: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + offset);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    // Toggle status
    const cycleStatus = (studentId: string) => {
        setLocalStatuses(prev => {
            const current = prev[studentId] || 'present';
            const next: Record<string, 'present' | 'excused' | 'unexcused'> = {
                present: 'excused', excused: 'unexcused', unexcused: 'present',
            };
            return { ...prev, [studentId]: next[current] };
        });
    };

    const setAllStatus = (status: 'present' | 'excused' | 'unexcused') => {
        const updated: Record<string, 'present' | 'excused' | 'unexcused'> = {};
        classStudents.forEach(s => updated[s.id] = status);
        setLocalStatuses(updated);
    };

    // Save
    const handleSave = async () => {
        setSaving(true);
        const records: Omit<AttendanceRecord, 'id'>[] = Object.entries(localStatuses).map(([studentId, status]) => ({
            student_id: studentId,
            class_id: selectedClassId,
            date: selectedDate,
            status,
        }));
        await saveAttendance(records);

        // Auto +2 points for 'present' students (only for today's date)
        const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
        if (selectedDate === todayStr) {
            const presentStudentIds = records.filter(r => r.status === 'present').map(r => r.student_id);
            if (presentStudentIds.length > 0) {
                // Check if existing "Có mặt" logs were already given today
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);

                const { data: existingLogs } = await supabase
                    .from('behavior_logs')
                    .select('student_id')
                    .eq('class_id', selectedClassId)
                    .eq('reason', 'Có mặt (Điểm danh)')
                    .gte('created_at', startOfDay.toISOString());

                const alreadyGivenIds = new Set((existingLogs || []).map(l => l.student_id));
                const toGiveIds = presentStudentIds.filter(id => !alreadyGivenIds.has(id));

                if (toGiveIds.length > 0) {
                    const logsToAdd = toGiveIds.map(sid => ({
                        student_id: sid,
                        class_id: selectedClassId,
                        behavior_id: null,
                        points: 2,
                        reason: 'Có mặt (Điểm danh)',
                        recorded_by: user?.id || null,
                    }));
                    await batchAddBehaviorLogs(logsToAdd);
                }
            }
        }

        setSaving(false);
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 2000);
    };

    // Stats
    const stats = useMemo(() => {
        const counts = { present: 0, excused: 0, unexcused: 0 };
        Object.values(localStatuses).forEach(s => counts[s]++);
        return counts;
    }, [localStatuses]);

    const dateLabel = new Date(selectedDate).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
    const isToday = selectedDate === new Date().toISOString().split('T')[0];

    return (
        <div className="space-y-6">
            {/* Saved Toast */}
            {showSaved && (
                <div className="fixed top-6 right-6 z-50 bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-2xl font-bold flex items-center gap-2 animate-bounce">
                    <CheckCircle className="h-5 w-5" /> Đã lưu điểm danh!
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                        <ClipboardCheck className="h-8 w-8 text-indigo-600" />
                        Điểm Danh
                    </h1>
                    <p className="text-gray-500 mt-1">Nhấn vào trạng thái để chuyển đổi</p>
                </div>
                <div className="flex gap-3 items-center">
                    <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50">
                        {saving ? (
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        {saving ? 'Đang lưu...' : 'Lưu'}
                    </button>
                    {myClasses.length > 1 && (
                        <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
                            className="border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none">
                            {myClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    )}
                </div>
            </div>

            {/* Date Picker + Stats */}
            <div className="bg-white rounded-xl shadow-sm border p-5 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition"><ChevronLeft className="h-5 w-5" /></button>
                    <div className="text-center">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-indigo-500" />
                            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                                className="border-0 text-lg font-bold text-gray-800 focus:outline-none cursor-pointer" />
                        </div>
                        <p className="text-sm text-gray-500 capitalize">{dateLabel}</p>
                    </div>
                    <button onClick={() => changeDate(1)} className="p-2 hover:bg-gray-100 rounded-lg transition"><ChevronRight className="h-5 w-5" /></button>
                    {!isToday && (
                        <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                            className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-bold hover:bg-indigo-100 transition">
                            Hôm nay
                        </button>
                    )}
                </div>

                {/* Stats Badges */}
                <div className="flex gap-3">
                    {Object.entries(StatusConfig).map(([key, cfg]) => (
                        <div key={key} className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${cfg.color}`}>
                            <cfg.icon className="h-4 w-4" />
                            <span className="text-sm font-bold">{stats[key as keyof typeof stats]}</span>
                            <span className="text-xs font-medium">{cfg.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
                <button onClick={() => setAllStatus('present')}
                    className="text-sm bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg font-medium hover:bg-emerald-100 border border-emerald-200 transition">
                    ✓ Tất cả Có mặt
                </button>
                <button onClick={() => setAllStatus('excused')}
                    className="text-sm bg-amber-50 text-amber-700 px-4 py-2 rounded-lg font-medium hover:bg-amber-100 border border-amber-200 transition">
                    ⚠ Tất cả Có phép
                </button>
                <button onClick={() => setAllStatus('unexcused')}
                    className="text-sm bg-red-50 text-red-700 px-4 py-2 rounded-lg font-medium hover:bg-red-100 border border-red-200 transition">
                    ✕ Tất cả Vắng KP
                </button>
            </div>

            {/* Student List */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="grid grid-cols-1 divide-y">
                    {classStudents.length === 0 ? (
                        <div className="p-10 text-center text-gray-400">
                            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p className="font-semibold">Chưa có học sinh trong lớp.</p>
                        </div>
                    ) : classStudents.map((s, idx) => {
                        const status = localStatuses[s.id] || 'present';
                        const cfg = StatusConfig[status];
                        return (
                            <div key={s.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                                <span className="w-8 text-center text-sm font-bold text-gray-400">{idx + 1}</span>
                                <img src={s.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=6366f1&color=fff&size=40`}
                                    alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
                                <span className="flex-1 font-semibold text-gray-800">{s.name}</span>

                                {/* Status buttons */}
                                <div className="flex gap-2">
                                    {(Object.entries(StatusConfig) as [string, typeof StatusConfig.present][]).map(([key, sc]) => (
                                        <button key={key} onClick={() => setLocalStatuses(prev => ({ ...prev, [s.id]: key as any }))}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${status === key
                                                ? `${sc.color} border-current shadow-sm scale-105`
                                                : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                                }`}>
                                            <sc.icon className="h-4 w-4" />
                                            <span className="hidden sm:inline">{sc.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Save Button */}
            <div className="sticky bottom-6 flex justify-center">
                <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl hover:bg-indigo-700 hover:shadow-2xl transition-all active:scale-95 disabled:opacity-50">
                    {saving ? (
                        <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Save className="h-5 w-5" />
                    )}
                    {saving ? 'Đang lưu...' : 'Lưu Điểm Danh'}
                </button>
            </div>
        </div>
    );
};

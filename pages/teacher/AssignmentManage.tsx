import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../store';
import { Assignment } from '../../types';
import { Trash2, Edit2, X, Clock, Calendar, Search, Filter, CheckCircle, AlertTriangle, Send, Users, FileText, Save, Link2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AssignModal } from '../../components/AssignModal';

export const AssignmentManage: React.FC = () => {
    const { assignments, exams, classes, user, deleteAssignment, updateAssignment, updateExam, attempts, fetchAssignments, fetchExams, fetchClasses, fetchAttempts } = useStore();

    useEffect(() => {
        if (user) {
            fetchAssignments();
            fetchExams();
            fetchClasses();
            fetchAttempts();
        }
    }, [user, fetchAssignments, fetchExams, fetchClasses, fetchAttempts]);
    const navigate = useNavigate();

    const handleCopyLink = (examId: string, assignmentId: string) => {
        const link = `${window.location.origin}/exam/${examId}/take?assign=${assignmentId}`;
        navigator.clipboard.writeText(link).then(() => {
            alert("Đã sao chép đường dẫn làm bài vào bộ nhớ tạm!");
        }).catch(err => {
            console.error("Copy failed:", err);
            alert("Không thể sao chép đường dẫn. Bạn hãy copy thủ công từ trình duyệt.");
        });
    };

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [filterClassId, setFilterClassId] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // Edit modal
    const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
    const [editStartTime, setEditStartTime] = useState('');
    const [editEndTime, setEditEndTime] = useState('');
    const [editDuration, setEditDuration] = useState(0);
    const [editTitle, setEditTitle] = useState('');

    // Delete confirm
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Assign modal for re-assigning
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [selectedExamForAssign, setSelectedExamForAssign] = useState<any | null>(null);

    const teacherClasses = useMemo(() =>
        classes.filter(c => c.teacherId === user?.id),
        [classes, user]
    );

    // Filter assignments by this teacher (exclude ones with soft-deleted exams)
    const myAssignments = useMemo(() => {
        return assignments
            .filter(a => a.teacherId === user?.id)
            .filter(a => {
                const exam = exams.find(e => e.id === a.examId);
                // Only exclude if exam is found AND soft-deleted
                if (exam && exam.deletedAt) return false;
                return true;
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [assignments, user, exams]);

    const getStatus = (a: Assignment) => {
        const now = new Date();
        const start = a.startTime ? new Date(a.startTime) : null;
        const end = a.endTime ? new Date(a.endTime) : null;

        if (start && now < start) return 'upcoming';
        if (end && now > end) return 'expired';
        return 'active';
    };

    const filteredAssignments = useMemo(() => {
        return myAssignments.filter(a => {
            const exam = exams.find(e => e.id === a.examId);
            const matchesSearch = !searchTerm || exam?.title.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesClass = !filterClassId || a.classId === filterClassId;
            const matchesStatus = !filterStatus || getStatus(a) === filterStatus;
            return matchesSearch && matchesClass && matchesStatus;
        });
    }, [myAssignments, searchTerm, filterClassId, filterStatus, exams]);

    const handleDelete = async (id: string) => {
        const ok = await deleteAssignment(id);
        if (ok) {
            setDeletingId(null);
        } else {
            alert('Lỗi khi xoá bài tập. Vui lòng thử lại.');
        }
    };

    const formatForDatetimeLocal = (dateStr: string | undefined): string => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) {
            // Try secondary formats or return current date if critical
            return '';
        }
        const tzOffset = d.getTimezoneOffset() * 60000; // offset in milliseconds
        const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
        return localISOTime;
    };

    const openEdit = (a: Assignment) => {
        const exam = exams.find(e => e.id === a.examId);
        setEditingAssignment(a);
        setEditStartTime(formatForDatetimeLocal(a.startTime));
        setEditEndTime(formatForDatetimeLocal(a.endTime));
        setEditDuration(a.durationMinutes);
        setEditTitle(exam?.title || '');
    };

    const handleSaveEdit = async () => {
        if (!editingAssignment) return;

        // Check for duplicate title if changed
        if (editTitle.trim()) {
            const isDuplicate = exams.some(e => 
                e.title.trim().toLowerCase() === editTitle.trim().toLowerCase() && 
                e.id !== editingAssignment.examId &&
                !e.deletedAt
            );
            if (isDuplicate) {
                const confirmSave = window.confirm(`Tên bài tập "${editTitle.trim()}" đã tồn tại. Bạn có chắc chắn muốn lưu trùng tên không?`);
                if (!confirmSave) return;
            }
        }

        const updated: Assignment = {
            ...editingAssignment,
            startTime: editStartTime ? new Date(editStartTime).toISOString() : undefined,
            endTime: editEndTime ? new Date(editEndTime).toISOString() : undefined,
            durationMinutes: editDuration
        };
        const ok = await updateAssignment(updated);
        if (ok) {
            // Also update exam title if changed
            const exam = exams.find(e => e.id === editingAssignment.examId);
            if (exam && editTitle.trim() && editTitle !== exam.title) {
                updateExam({ ...exam, title: editTitle.trim() });
            }
            setEditingAssignment(null);
        } else {
            alert('Lỗi khi cập nhật. Vui lòng thử lại.');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300"><CheckCircle className="h-3 w-3" /> Đang mở</span>;
            case 'upcoming': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-350"><Clock className="h-3 w-3" /> Chưa mở</span>;
            case 'expired': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"><AlertTriangle className="h-3 w-3" /> Đã kết thúc</span>;
            default: return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"><Send className="h-3 w-3" /> Vĩnh viễn</span>;
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Quản lý bài tập đã giao</h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Xem, chỉnh sửa thời hạn và xoá các bài tập đã giao cho học sinh.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/exams')}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md transition-all text-sm"
                    >
                        <Send className="h-4 w-4" /> Giao bài mới
                    </button>
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/40 rounded-lg px-4 py-2 shadow-sm">
                        <Send className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{myAssignments.length} bài đã giao</span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800 shadow-sm mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative md:col-span-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm theo tên bài tập..."
                            className="w-full pl-10 pr-4 py-2.5 border dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-105 text-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <select
                            value={filterClassId}
                            onChange={e => setFilterClassId(e.target.value)}
                            className="w-full pl-10 pr-2 py-2.5 border dark:border-slate-800 rounded-lg text-sm bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 outline-none focus:border-indigo-500 appearance-none"
                        >
                            <option value="">Tất cả lớp</option>
                            {teacherClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className="w-full pl-10 pr-2 py-2.5 border dark:border-slate-800 rounded-lg text-sm bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 outline-none focus:border-indigo-500 appearance-none"
                        >
                            <option value="">Mọi trạng thái</option>
                            <option value="active">Đang mở</option>
                            <option value="upcoming">Chưa mở</option>
                            <option value="expired">Đã kết thúc</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800 shadow-sm overflow-hidden">
                {filteredAssignments.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 dark:text-slate-500">
                        <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium text-gray-500 dark:text-slate-400">Chưa có bài tập nào được giao.</p>
                        <p className="text-sm mt-1 text-gray-400">Vào <strong>Ngân hàng bài tập</strong> → nhấn <strong>Giao bài</strong> để bắt đầu.</p>
                    </div>
                ) : (
                    <div className="divide-y dark:divide-slate-800">
                        {filteredAssignments.map(a => {
                            const exam = exams.find(e => e.id === a.examId);
                            const cls = classes.find(c => c.id === a.classId);
                            const status = getStatus(a);
                            const submittedCount = attempts.filter(att => String(att.assignmentId) === String(a.id)).length;
                            const totalStudents = cls ? cls.studentIds.length : 0;

                            if (!exam) return null;

                            return (
                                <div key={a.id} className="p-5 hover:bg-gray-50 dark:hover:bg-slate-955 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 group">
                                    {/* Left info */}
                                    <div className="flex gap-4 flex-1 min-w-0">
                                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 ${status === 'active' ? 'bg-green-500' : status === 'upcoming' ? 'bg-yellow-500' : 'bg-gray-400'
                                            }`}>
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <h3 className="font-bold text-gray-900 dark:text-slate-100 truncate">{exam.title}</h3>
                                                {getStatusBadge(status)}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <Users className="h-3 w-3" /> {cls?.name || 'N/A'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" /> {a.durationMinutes} phút
                                                </span>
                                                <span>• Giao: {new Date(a.createdAt).toLocaleDateString('vi-VN')}</span>
                                                {a.endTime ? (
                                                    <span className={status === 'expired' ? 'text-red-500 dark:text-red-400 font-medium' : ''}>
                                                        • Hạn: {new Date(a.endTime).toLocaleString('vi-VN')}
                                                    </span>
                                                ) : (
                                                    <span className="text-orange-500 font-medium">• Không giới hạn thời gian</span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    • <CheckCircle className="h-3 w-3" /> {submittedCount}/{totalStudents} đã nộp
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 self-end lg:self-auto flex-shrink-0">
                                        <Link
                                            to={`/exam/${exam.id}/results?assign=${a.id}`}
                                            className="px-3 py-2 text-sm font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-950/40 transition-colors border border-green-100 dark:border-green-900/40"
                                            title="Xem kết quả"
                                        >
                                            Kết quả
                                        </Link>
                                        <button
                                            onClick={() => handleCopyLink(exam.id, a.id)}
                                            className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-lg transition-colors border border-transparent hover:border-amber-100 dark:hover:border-amber-900/40"
                                            title="Sao chép link làm bài"
                                        >
                                            <Link2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedExamForAssign(exam);
                                                setAssignModalOpen(true);
                                            }}
                                            className="px-3 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-950/40 transition-colors border border-indigo-100 dark:border-indigo-900/40"
                                            title="Giao bài này cho lớp khác"
                                        >
                                            Giao bài
                                        </button>
                                        <button
                                            onClick={() => openEdit(a)}
                                            className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg transition-colors border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/40"
                                            title="Chỉnh sửa thời hạn"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        {deletingId === a.id ? (
                                            <div className="flex items-center gap-1 animate-fade-in">
                                                <button
                                                    onClick={() => handleDelete(a.id)}
                                                    className="px-3 py-1.5 text-xs font-bold text-white bg-red-500 rounded-lg hover:bg-red-600"
                                                >
                                                    Xác nhận xoá
                                                </button>
                                                <button
                                                    onClick={() => setDeletingId(null)}
                                                    className="px-2 py-1.5 text-xs text-gray-505 dark:text-slate-400 hover:bg-gray-105 dark:hover:bg-slate-800 rounded-lg"
                                                >
                                                    Huỷ
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setDeletingId(a.id)}
                                                className="p-2 text-red-405 dark:text-red-400 hover:text-red-605 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/40"
                                                title="Xoá bài tập đã giao"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingAssignment && (() => {
                const exam = exams.find(e => e.id === editingAssignment.examId);
                const cls = classes.find(c => c.id === editingAssignment.classId);
                return (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md animate-fade-in border dark:border-slate-800">
                            <div className="p-5 border-b dark:border-slate-800 flex justify-between items-center">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Chỉnh sửa bài tập</h2>
                                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{exam?.title} — Lớp {cls?.name}</p>
                                </div>
                                <button onClick={() => setEditingAssignment(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full">
                                    <X className="h-5 w-5 text-gray-500 dark:text-slate-400" />
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-indigo-600" /> Tên bài tập
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full border dark:border-slate-800 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100"
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        placeholder="Nhập tên bài tập..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-indigo-600" /> Bắt đầu
                                        </label>
                                        <input
                                            type="datetime-local"
                                            className="w-full border dark:border-slate-800 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100"
                                            value={editStartTime}
                                            onChange={e => setEditStartTime(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-indigo-600" /> Kết thúc
                                        </label>
                                        <input
                                            type="datetime-local"
                                            className="w-full border dark:border-slate-800 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100"
                                            value={editEndTime}
                                            onChange={e => setEditEndTime(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-indigo-600" /> Thời gian làm bài (phút)
                                    </label>
                                    <input
                                        type="number"
                                        className="w-full border dark:border-slate-800 rounded-lg p-2.5 outline-none focus:border-indigo-500 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100"
                                        value={editDuration}
                                        onChange={e => setEditDuration(Number(e.target.value))}
                                    />
                                </div>

                                {!editEndTime && (
                                    <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 rounded-lg p-3 text-sm text-orange-700 dark:text-orange-300 flex items-start gap-2">
                                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                        <span>Bài tập <strong>không có thời hạn kết thúc</strong> sẽ luôn mở cho học sinh. Bạn có thể đặt thời hạn hoặc xoá bài tập.</span>
                                    </div>
                                )}
                            </div>

                            <div className="p-5 border-t dark:border-slate-800 flex justify-end gap-3 bg-gray-50 dark:bg-slate-900">
                                <button onClick={() => setEditingAssignment(null)} className="px-4 py-2 text-gray-655 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg font-medium">
                                    Huỷ
                                </button>
                                <button onClick={handleSaveEdit} className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md flex items-center gap-2">
                                    <Save className="h-4 w-4" /> Lưu thay đổi
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {selectedExamForAssign && (
                <AssignModal
                    exam={selectedExamForAssign}
                    isOpen={assignModalOpen}
                    onClose={() => setAssignModalOpen(false)}
                />
            )}
        </div>
    );
};

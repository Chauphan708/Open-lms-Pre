import React, { useMemo, useState } from 'react';
import { useStore } from '../../store';
import { ArrowLeft, Zap, Users, Search, TrendingUp, TrendingDown, Award, Crown, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const StudentXPStats: React.FC = () => {
    const { user, users, attempts, classes, exams } = useStore();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
    const [sortField, setSortField] = useState<'xp' | 'name' | 'level' | 'attempts'>('xp');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    // Get teacher's classes
    const teacherClasses = useMemo(() => {
        if (!user) return [];
        return classes.filter(c => c.teacherId === user.id);
    }, [user, classes]);

    // Compute XP data for all students in the selected class(es)
    interface StudentXPData {
        id: string;
        name: string;
        avatar: string;
        className: string;
        totalXP: number;
        level: number;
        currentLevelXP: number;
        attemptCount: number;
        avgScore: number;
        bestScore: number;
    }

    const studentsXP = useMemo((): StudentXPData[] => {
        const allStudents = users.filter(u => u.role === 'STUDENT');

        // Filter by class
        let filteredStudentIds: string[];
        if (selectedClassId === 'ALL') {
            const allClassStudentIds = new Set<string>();
            teacherClasses.forEach(c => c.studentIds.forEach(sid => allClassStudentIds.add(sid)));
            filteredStudentIds = Array.from(allClassStudentIds);
        } else {
            const cls = classes.find(c => c.id === selectedClassId);
            filteredStudentIds = cls ? cls.studentIds : [];
        }

        return filteredStudentIds.map(studentId => {
            const student = allStudents.find(s => s.id === studentId);
            if (!student) return null;

            const studentAttempts = attempts.filter(a => a.studentId === studentId);
            const totalXP = Math.round(studentAttempts.reduce((acc, curr) => acc + ((curr.score || 0) * 10), 0));
            const level = Math.floor(totalXP / 100) + 1;
            const currentLevelXP = totalXP % 100;
            const attemptCount = studentAttempts.length;
            const avgScore = attemptCount > 0 ? studentAttempts.reduce((acc, curr) => acc + (curr.score || 0), 0) / attemptCount : 0;
            const bestScore = attemptCount > 0 ? Math.max(...studentAttempts.map(a => a.score || 0)) : 0;

            // Find which class this student belongs to
            const studentClass = teacherClasses.find(c => c.studentIds.includes(studentId));

            return {
                id: studentId,
                name: student.name,
                avatar: student.avatar,
                className: studentClass?.name || 'N/A',
                totalXP,
                level,
                currentLevelXP,
                attemptCount,
                avgScore,
                bestScore
            } as StudentXPData;
        }).filter((s): s is StudentXPData => s !== null);
    }, [users, attempts, classes, teacherClasses, selectedClassId]);

    // Search & sort
    const filteredStudents = useMemo(() => {
        let result = [...studentsXP];

        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            result = result.filter(s => s.name.toLowerCase().includes(q));
        }

        // Sort
        result.sort((a, b) => {
            let cmp = 0;
            if (sortField === 'xp') cmp = a.totalXP - b.totalXP;
            else if (sortField === 'name') cmp = a.name.localeCompare(b.name);
            else if (sortField === 'level') cmp = a.level - b.level;
            else if (sortField === 'attempts') cmp = a.attemptCount - b.attemptCount;
            return sortDir === 'desc' ? -cmp : cmp;
        });

        return result;
    }, [studentsXP, searchQuery, sortField, sortDir]);

    // Summary stats
    const summaryStats = useMemo(() => {
        if (studentsXP.length === 0) return { avgXP: 0, maxXP: 0, minXP: 0, totalStudents: 0 };
        const xps = studentsXP.map(s => s.totalXP);
        return {
            avgXP: Math.round(xps.reduce((a, b) => a + b, 0) / xps.length),
            maxXP: Math.max(...xps),
            minXP: Math.min(...xps),
            totalStudents: studentsXP.length
        };
    }, [studentsXP]);

    const handleSort = (field: typeof sortField) => {
        if (sortField === field) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    const SortIcon = ({ field }: { field: typeof sortField }) => {
        if (sortField !== field) return null;
        return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 inline ml-1" /> : <ChevronDown className="h-3 w-3 inline ml-1" />;
    };

    const fmt = (n: number) => n.toFixed(1).replace('.', ',');

    return (
        <div className="max-w-6xl mx-auto pb-10">
            {/* Header */}
            <div className="mb-6">
                <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-900 flex items-center gap-2 mb-2 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Quay lại Dashboard
                </button>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Zap className="h-6 w-6 text-yellow-500" /> Thống kê XP Học sinh
                        </h1>
                        <p className="text-gray-500 text-sm">Theo dõi, đôn đốc, nhắc nhở và khen thưởng học sinh</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
                <select
                    value={selectedClassId}
                    onChange={e => setSelectedClassId(e.target.value)}
                    className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                >
                    <option value="ALL">Tất cả lớp ({teacherClasses.length} lớp)</option>
                    {teacherClasses.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.studentIds.length} HS)</option>
                    ))}
                </select>

                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm học sinh..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                    />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-5 rounded-xl border shadow-sm">
                    <p className="text-sm font-medium text-gray-500 mb-1">Tổng học sinh</p>
                    <p className="text-3xl font-bold text-gray-900">{summaryStats.totalStudents}</p>
                    <div className="mt-2 text-xs text-gray-400 flex items-center gap-1"><Users className="h-3 w-3" /> Trong lớp</div>
                </div>
                <div className="bg-white p-5 rounded-xl border shadow-sm">
                    <p className="text-sm font-medium text-gray-500 mb-1">XP Trung bình</p>
                    <p className="text-3xl font-bold text-indigo-600">{summaryStats.avgXP}</p>
                    <div className="mt-2 text-xs text-gray-400">Điểm kinh nghiệm</div>
                </div>
                <div className="bg-white p-5 rounded-xl border shadow-sm">
                    <p className="text-sm font-medium text-gray-500 mb-1">XP Cao nhất</p>
                    <p className="text-3xl font-bold text-green-600">{summaryStats.maxXP}</p>
                    <div className="mt-2 text-xs text-gray-400 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Xuất sắc</div>
                </div>
                <div className="bg-white p-5 rounded-xl border shadow-sm">
                    <p className="text-sm font-medium text-gray-500 mb-1">XP Thấp nhất</p>
                    <p className="text-3xl font-bold text-red-500">{summaryStats.minXP}</p>
                    <div className="mt-2 text-xs text-gray-400 flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Cần đôn đốc</div>
                </div>
            </div>

            {/* Student Table */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 border-b">
                            <tr>
                                <th className="px-4 py-3 font-medium w-10 text-center">#</th>
                                <th className="px-4 py-3 font-medium cursor-pointer hover:text-indigo-600" onClick={() => handleSort('name')}>
                                    Học sinh <SortIcon field="name" />
                                </th>
                                <th className="px-4 py-3 font-medium">Lớp</th>
                                <th className="px-4 py-3 font-medium text-center cursor-pointer hover:text-indigo-600" onClick={() => handleSort('level')}>
                                    Level <SortIcon field="level" />
                                </th>
                                <th className="px-4 py-3 font-medium text-center cursor-pointer hover:text-indigo-600" onClick={() => handleSort('xp')}>
                                    Tổng XP <SortIcon field="xp" />
                                </th>
                                <th className="px-4 py-3 font-medium text-center">Tiến độ Level</th>
                                <th className="px-4 py-3 font-medium text-center cursor-pointer hover:text-indigo-600" onClick={() => handleSort('attempts')}>
                                    Số bài <SortIcon field="attempts" />
                                </th>
                                <th className="px-4 py-3 font-medium text-center">ĐTB</th>
                                <th className="px-4 py-3 font-medium text-center">Cao nhất</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                                        <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                        Không tìm thấy học sinh nào.
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((s, idx) => {
                                    const rank = idx + 1;
                                    let rankBg = 'bg-gray-100 text-gray-600';
                                    if (sortField === 'xp' && sortDir === 'desc') {
                                        if (rank === 1) rankBg = 'bg-yellow-100 text-yellow-700';
                                        else if (rank === 2) rankBg = 'bg-gray-200 text-gray-700';
                                        else if (rank === 3) rankBg = 'bg-orange-100 text-orange-700';
                                    }

                                    // XP status colors
                                    let xpColor = 'text-gray-900';
                                    if (s.totalXP >= 300) xpColor = 'text-emerald-600';
                                    else if (s.totalXP >= 100) xpColor = 'text-indigo-600';
                                    else if (s.totalXP < 50) xpColor = 'text-red-500';

                                    return (
                                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-center">
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs mx-auto ${rankBg}`}>
                                                    {sortField === 'xp' && sortDir === 'desc' && rank <= 3 ? (
                                                        rank === 1 ? <Crown className="h-4 w-4 text-yellow-600" /> : rank
                                                    ) : rank}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <img src={s.avatar} alt="" className="w-8 h-8 rounded-full border bg-gray-100" />
                                                    <span className="font-medium text-gray-900">{s.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 text-xs">{s.className}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                                                    Lv.{s.level}
                                                </span>
                                            </td>
                                            <td className={`px-4 py-3 text-center font-bold text-lg ${xpColor}`}>
                                                {s.totalXP}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-[100px]">
                                                        <div
                                                            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all"
                                                            style={{ width: `${s.currentLevelXP}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 whitespace-nowrap">{s.currentLevelXP}/100</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center text-gray-700">{s.attemptCount}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`font-medium ${s.avgScore >= 8 ? 'text-green-600' : s.avgScore >= 5 ? 'text-yellow-600' : 'text-red-500'}`}>
                                                    {fmt(s.avgScore)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="font-bold text-green-600">{fmt(s.bestScore)}</span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Legend */}
            <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-800">
                <p className="font-bold mb-1 flex items-center gap-2"><Award className="h-4 w-4" /> Cách tính XP:</p>
                <p>Mỗi 1 điểm bài tập = 10 XP. Mỗi 100 XP tăng 1 Level. Học sinh có XP thấp (đỏ) cần được đôn đốc, nhắc nhở.</p>
            </div>
        </div>
    );
};

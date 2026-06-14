import React, { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { useClassFunStore } from '../../services/classFunStore';
import {
    AlertTriangle,
    Brain,
    Bot,
    History,
    MessageSquare,
    Loader2,
    RefreshCw,
    Info
} from 'lucide-react';
import { generateBehaviorAdvice } from '../../services/geminiService';
import ReactMarkdown from 'react-markdown';

export const ClassFunWarning: React.FC = () => {
    const { classes, users, user: currentUser } = useStore();
    const { logs, fetchAllBehaviorLogs } = useClassFunStore();

    const [isLoading, setIsLoading] = useState(true);
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);
    const [adviceData, setAdviceData] = useState<Record<string, string>>({});
    const [customPrompts, setCustomPrompts] = useState<Record<string, string>>({});

    const myClasses = classes.filter(c => c.teacherId === currentUser?.id);
    const [selectedClassId, setSelectedClassId] = useState(myClasses[0]?.id || '');

    useEffect(() => {
        if (myClasses.length > 0 && !selectedClassId) {
            setSelectedClassId(myClasses[0].id);
        }
    }, [myClasses, selectedClassId]);

    useEffect(() => {
        const loadData = async () => {
            if (!selectedClassId) return;
            setIsLoading(true);
            await fetchAllBehaviorLogs(selectedClassId);
            setIsLoading(false);
        };
        loadData();
    }, [selectedClassId, fetchAllBehaviorLogs]);

    const selectedClass = classes.find(c => c.id === selectedClassId);
    const studentsInClass = users.filter(u => selectedClass?.studentIds.includes(u.id));

    // Phân tích Logs
    // Tìm học sinh có >= 3 lỗi tiêu cực (points < 0) trong phần logs
    const warningList = React.useMemo(() => {
        const stats: Record<string, typeof logs> = {};

        logs.forEach((log: any) => {
            if (log.points < 0) {
                if (!stats[log.student_id]) stats[log.student_id] = [];
                stats[log.student_id].push(log);
            }
        });

        const flagged: { studentId: string; logs: typeof logs; reason: string }[] = [];

        Object.entries(stats).forEach(([studentId, studentLogs]) => {
            if (studentLogs.length >= 3) {
                flagged.push({
                    studentId,
                    logs: studentLogs,
                    reason: `Vi phạm ${studentLogs.length} lần tiêu cực gần đây`
                });
            }
        });

        return flagged.sort((a, b) => b.logs.length - a.logs.length);
    }, [logs]);

    const handleAskAI = async (studentId: string, studentName: string, studentLogs: typeof logs) => {
        setAnalyzingId(studentId);

        // Tạo tóm tắt lịch sử lỗi
        const logSummary = studentLogs.map((l: any) => `- ${new Date(l.created_at).toLocaleDateString()}: ${l.reason} (${l.points} điểm)`).join('\n');
        const customPrompt = customPrompts[studentId] || '';

        const advice = await generateBehaviorAdvice(
            studentName,
            "Lớp " + (selectedClass?.name || "N/A"),
            logSummary,
            customPrompt
        );

        setAdviceData(prev => ({ ...prev, [studentId]: advice }));
        setAnalyzingId(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                        <AlertTriangle className="h-8 w-8 text-rose-500" />
                        Cảnh Báo Hành Vi
                    </h1>
                    <p className="text-gray-500 mt-1">Phân tích học sinh có nhiều vi phạm tiêu cực & AI Tư vấn tâm lý</p>
                </div>
                <div className="flex gap-3">
                    {myClasses.length > 1 && (
                        <select
                            value={selectedClassId}
                            onChange={e => setSelectedClassId(e.target.value)}
                            className="border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm"
                        >
                            {myClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center p-20">
                    <Loader2 className="h-10 w-10 text-rose-500 animate-spin" />
                </div>
            ) : warningList.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border p-12 text-center flex flex-col items-center">
                    <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                        <History className="h-10 w-10 text-emerald-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Lớp học rất ngoan!</h3>
                    <p className="text-gray-500">Tuyệt vời! Hiện không có học sinh nào dính chuỗi vi phạm tiêu cực đáng lưu ý.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {warningList.map(item => {
                        const student = studentsInClass.find(s => s.id === item.studentId);
                        if (!student) return null;

                        return (
                            <div key={item.studentId} className="bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden">
                                <div className="p-4 border-b bg-rose-50 flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <img src={student.avatar || "https://via.placeholder.com/40"} alt={student.name} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" />
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-lg">{student.name}</h3>
                                            <p className="text-rose-600 text-sm font-medium flex items-center gap-1">
                                                <AlertTriangle className="h-3.5 w-3.5" />
                                                {item.reason}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-white border text-gray-500 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                                        Mã: {student.id.substring(0, 6)}
                                    </div>
                                </div>

                                <div className="p-4 flex-1 bg-gray-50">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Chi tiết vi phạm:</h4>
                                    <ul className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300 transition-colors">
                                        {item.logs.map((log: any) => (
                                            <li key={log.id} className="text-sm bg-white p-2 rounded border border-gray-100 shadow-sm flex items-start justify-between gap-2">
                                                <span className="text-gray-700 leading-snug">{log.reason}</span>
                                                <span className="text-rose-500 font-bold whitespace-nowrap shrink-0">{log.points}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* AI Section */}
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                                        <div className="font-bold text-indigo-800 mb-2 flex items-center justify-between">
                                            <span className="flex items-center gap-2"><Brain className="h-4 w-4" /> Chuyên gia Tâm lý AI</span>
                                        </div>

                                        {!adviceData[item.studentId] && analyzingId !== item.studentId && (
                                            <>
                                                <div className="mb-3">
                                                    <label className="text-xs font-medium text-indigo-700 mb-1 block">Context cá nhân hóa (GV ghi chú thêm):</label>
                                                    <textarea
                                                        className="w-full text-sm p-2 rounded border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                                        placeholder="VD: Gia đình em dạo này có chuyện buồn, em hay ngủ gục..."
                                                        rows={2}
                                                        value={customPrompts[item.studentId] || ''}
                                                        onChange={e => setCustomPrompts(prev => ({ ...prev, [item.studentId]: e.target.value }))}
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => handleAskAI(item.studentId, student.name, item.logs)}
                                                    className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition shadow-sm"
                                                >
                                                    <Bot className="h-4 w-4" /> Xin lời khuyên giáo dục
                                                </button>
                                            </>
                                        )}

                                        {analyzingId === item.studentId && (
                                            <div className="flex items-center justify-center p-6 text-indigo-600">
                                                <Loader2 className="h-6 w-6 animate-spin" />
                                                <span className="ml-2 text-sm font-medium">AI đang phân tích tâm lý...</span>
                                            </div>
                                        )}

                                        {adviceData[item.studentId] && (
                                            <div className="relative">
                                                <div className="prose prose-sm prose-indigo max-w-none bg-white p-4 rounded border text-gray-800 max-h-60 overflow-y-auto shadow-inner text-sm leading-relaxed">
                                                    <ReactMarkdown>{adviceData[item.studentId]}</ReactMarkdown>
                                                </div>
                                                <button
                                                    onClick={() => handleAskAI(item.studentId, student.name, item.logs)}
                                                    className="absolute text-xs top-2 right-2 p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded"
                                                    title="Phân tích lại"
                                                >
                                                    <RefreshCw className="h-3 w-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

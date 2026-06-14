import React, { useState } from 'react';
import { useStore } from '../store';
import { BarChart3, Download, Upload, Database, RefreshCw, CheckCircle, AlertCircle, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export const AIStats: React.FC = () => {
    const { exams, questionBank, arenaQuestions, classes, users } = useStore();
    const [importJson, setImportJson] = useState('');
    const [importResult, setImportResult] = useState<string | null>(null);

    const totalQuestions = questionBank.length;
    const totalExams = exams.length;
    const totalArena = arenaQuestions.length;
    const totalClasses = classes.length;
    const totalStudents = users.filter(u => u.role === 'STUDENT').length;

    // D3: Export all data as JSON
    const handleExport = () => {
        const data = {
            exportDate: new Date().toISOString(),
            version: '1.0',
            questionBank,
            arenaQuestions,
            exams,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Đã tải file backup!');
    };

    // D3: Import from JSON
    const handleImport = () => {
        if (!importJson.trim()) return toast.error('Hãy dán nội dung JSON vào ô nhập.');
        try {
            const data = JSON.parse(importJson);
            const { addQuestionToBank, bulkAddArenaQuestions, addExam } = useStore.getState();
            let count = 0;
            if (data.questionBank?.length) {
                data.questionBank.forEach((q: any) => { addQuestionToBank(q); count++; });
            }
            if (data.arenaQuestions?.length) {
                bulkAddArenaQuestions(data.arenaQuestions);
                count += data.arenaQuestions.length;
            }
            if (data.exams?.length) {
                data.exams.forEach((e: any) => { addExam(e); count++; });
            }
            setImportResult(`Đã import ${count} mục thành công!`);
            setImportJson('');
            toast.success(`Import ${count} mục!`);
        } catch (e) {
            toast.error('JSON không hợp lệ. Vui lòng kiểm tra lại.');
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <BarChart3 className="h-7 w-7 text-indigo-500" /> Dashboard Thống Kê & Quản Lý Dữ Liệu
                </h1>
                <p className="text-gray-500 mt-1 text-sm">Tổng quan ngân hàng câu hỏi, đề kiểm tra, và công cụ backup/restore.</p>
            </div>

            {/* D2: Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 rounded-xl text-white shadow-lg">
                    <div className="text-3xl font-black">{totalQuestions}</div>
                    <div className="text-indigo-200 text-sm font-medium">Ngân hàng câu hỏi</div>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-xl text-white shadow-lg">
                    <div className="text-3xl font-black">{totalExams}</div>
                    <div className="text-emerald-200 text-sm font-medium">Đề kiểm tra</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl text-white shadow-lg">
                    <div className="text-3xl font-black">{totalArena}</div>
                    <div className="text-purple-200 text-sm font-medium">Câu hỏi Đấu Trí</div>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-4 rounded-xl text-white shadow-lg">
                    <div className="text-3xl font-black">{totalClasses}</div>
                    <div className="text-amber-200 text-sm font-medium">Lớp học</div>
                </div>
                <div className="bg-gradient-to-br from-pink-500 to-pink-600 p-4 rounded-xl text-white shadow-lg">
                    <div className="text-3xl font-black">{totalStudents}</div>
                    <div className="text-pink-200 text-sm font-medium">Học sinh</div>
                </div>
            </div>

            {/* D2: Question Bank breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-xl border shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <Database className="h-5 w-5 text-indigo-500" /> Phân bố Ngân hàng
                    </h3>
                    {questionBank.length === 0 ? (
                        <p className="text-gray-400 text-sm">Chưa có câu hỏi.</p>
                    ) : (
                        <div className="space-y-2">
                            {Array.from(new Set(questionBank.map(q => q.subject))).map(subj => {
                                const count = questionBank.filter(q => q.subject === subj).length;
                                const pct = Math.round((count / questionBank.length) * 100);
                                return (
                                    <div key={subj}>
                                        <div className="flex justify-between text-sm mb-0.5">
                                            <span className="font-medium text-gray-700">{subj}</span>
                                            <span className="text-gray-500">{count} câu ({pct}%)</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="bg-white p-5 rounded-xl border shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-purple-500" /> Phân bố Đấu Trí
                    </h3>
                    {arenaQuestions.length === 0 ? (
                        <p className="text-gray-400 text-sm">Chưa có câu hỏi.</p>
                    ) : (
                        <div className="space-y-2">
                            {Array.from(new Set(arenaQuestions.map(q => q.subject))).map(subj => {
                                const count = arenaQuestions.filter(q => q.subject === subj).length;
                                const pct = Math.round((count / arenaQuestions.length) * 100);
                                return (
                                    <div key={subj}>
                                        <div className="flex justify-between text-sm mb-0.5">
                                            <span className="font-medium text-gray-700">{subj}</span>
                                            <span className="text-gray-500">{count} câu ({pct}%)</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* D3: Backup / Restore */}
            <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                    <RefreshCw className="h-5 w-5 text-emerald-500" /> Backup & Restore Dữ Liệu
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Export */}
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                        <h4 className="font-bold text-emerald-800 mb-2 flex items-center gap-2">
                            <Download className="h-4 w-4" /> Xuất Backup
                        </h4>
                        <p className="text-sm text-emerald-700 mb-3">Tải toàn bộ Ngân hàng câu hỏi + Đấu Trí + Đề KT dưới dạng file JSON.</p>
                        <button onClick={handleExport} className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 flex items-center justify-center gap-2">
                            <Download className="h-4 w-4" /> Tải Backup JSON
                        </button>
                    </div>

                    {/* Import */}
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                            <Upload className="h-4 w-4" /> Nhập Restore
                        </h4>
                        <textarea
                            value={importJson}
                            onChange={e => setImportJson(e.target.value)}
                            rows={3}
                            className="w-full border rounded-lg p-2 text-xs font-mono focus:ring-blue-500 focus:border-blue-500 mb-2"
                            placeholder="Dán nội dung file backup JSON vào đây..."
                        />
                        <button onClick={handleImport} disabled={!importJson.trim()} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50">
                            <Upload className="h-4 w-4" /> Import Dữ Liệu
                        </button>
                        {importResult && (
                            <div className="mt-2 text-sm text-green-700 flex items-center gap-1">
                                <CheckCircle className="h-4 w-4" /> {importResult}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

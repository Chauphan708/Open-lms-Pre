import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { supabase } from '../../services/supabaseClient';
import { externalSupabase, uploadToExternalStorage, deleteFromExternalStorage } from '../../services/externalStorageClient';
import { analyzeStudentMaterial, analyzeStudentText } from '../../services/geminiService';
import { AISubmission, AIGradingReview, Class, User } from '../../types';
import imageCompression from 'browser-image-compression';
import {
    Upload, Search, FileImage, FileText, Bot, Check, X,
    Save, Filter, Star, Eye, Download, Trash2, Zap, AlertCircle, Type, BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';

export const AIGrading: React.FC = () => {
    const { user, classes, users, fetchClasses } = useStore();

    useEffect(() => {
        if (user) {
            fetchClasses();
        }
    }, [user, fetchClasses]);

    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    // Dynamically calculate students for the selected class
    const selectedClass = classes.find(c => c.id === selectedClassId);
    const classStudents = selectedClass
        ? users.filter(u => u.role === 'STUDENT' && selectedClass.studentIds?.includes(u.id))
        : [];

    // Form states
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('Toán');
    const [category, setCategory] = useState('Bài tập về nhà');
    const [customPrompt, setCustomPrompt] = useState('Hãy tìm những lỗi tính toán nhỏ nhất và dùng lời nhận xét khích lệ.');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);

    // AI Processing state
    const [isScanning, setIsScanning] = useState(false);
    const [aiResult, setAiResult] = useState<any>(null);
    const [score, setScore] = useState<number>(0);
    const [isScoreOptional, setIsScoreOptional] = useState(false);

    // Input mode: IMAGE or TEXT
    const [inputMode, setInputMode] = useState<'IMAGE' | 'TEXT'>('IMAGE');
    const [studentText, setStudentText] = useState('');
    const [referenceExam, setReferenceExam] = useState('');
    const [rubric, setRubric] = useState('');

    // Grading History (A4)
    interface GradingRecord {
        studentName: string; title: string; category: string; score: number;
        advantages: string; limitations: string; improvements: string; timestamp: string;
    }
    const [gradingHistory, setGradingHistory] = useState<GradingRecord[]>([]);
    const [historySearch, setHistorySearch] = useState('');
    const [expandedHistory, setExpandedHistory] = useState<number | null>(null);

    // Batch Scan (A2)
    const [batchScanning, setBatchScanning] = useState(false);
    const [batchProgress, setBatchProgress] = useState(0);

    // My Classes
    const myClasses = classes.filter(c => c.teacherId === user?.id);

    useEffect(() => {
        if (myClasses.length > 0 && !selectedClassId) {
            setSelectedClassId(myClasses[0].id);
        }
    }, [myClasses, selectedClassId]);

    // Handle File Selection and Compression
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIsLoading(true);
            const newFiles: File[] = [];
            const newUrls: string[] = [];

            try {
                for (let i = 0; i < e.target.files.length; i++) {
                    const file = e.target.files[i];
                    if (file.type.startsWith('image/')) {
                        const options = {
                            maxSizeMB: 0.8,
                            maxWidthOrHeight: 1920,
                            useWebWorker: true
                        };
                        const compressedFile = await imageCompression(file, options);
                        newFiles.push(compressedFile);
                        newUrls.push(URL.createObjectURL(compressedFile));
                    } else {
                        newFiles.push(file);
                        newUrls.push('');
                    }
                }
                setSelectedFiles(prev => [...prev, ...newFiles]);
                setPreviewUrls(prev => [...prev, ...newUrls]);
            } catch (error) {
                console.error('Lỗi nén ảnh:', error);
                toast.error("Không thể xử lý hình ảnh.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleRemoveFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    };

    const convertFileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                // Remove the prefix (e.g., data:image/png;base64,) for Gemini
                const base64Data = result.split(',')[1];
                resolve(base64Data);
            };
            reader.onerror = error => reject(error);
        });
    };

    const handleScanWithAI = async () => {
        if (inputMode === 'IMAGE') {
            if (selectedFiles.length === 0) return toast.error("Vui lòng tải lên ảnh bài làm trước khi quét.");
            const imageFiles = selectedFiles.filter(f => f.type.startsWith('image/'));
            if (imageFiles.length === 0) return toast.error("Hiện tại AI chỉ hỗ trợ quét tệp Hình ảnh (JPG, PNG).");

            setIsScanning(true);
            try {
                toast.loading("AI đang phân tích các trang bài làm...", { id: 'ai_scan' });
                const base64Images = await Promise.all(imageFiles.map(convertFileToBase64));
                const fullPrompt = [customPrompt, rubric ? `\nTIÊU CHÍ ĐÁNH GIÁ: ${rubric}` : '', referenceExam ? `\nĐỀ BÀI GỐC: ${referenceExam}` : ''].filter(Boolean).join('\n');
                const result = await analyzeStudentMaterial(
                    base64Images.map((b64, idx) => ({ data: b64, mimeType: imageFiles[idx].type })),
                    fullPrompt
                );
                setAiResult(result);
                setScore(result.suggested_score || 0);
                toast.success("Quét AI thành công!", { id: 'ai_scan' });
            } catch (error: any) {
                toast.error(error.message || "Quét thất bại.", { id: 'ai_scan' });
            } finally {
                setIsScanning(false);
            }
        } else {
            // TEXT mode
            if (!studentText.trim()) return toast.error("Vui lòng nhập nội dung bài làm.");
            setIsScanning(true);
            try {
                toast.loading("AI đang phân tích bài làm dạng text...", { id: 'ai_scan' });
                const result = await analyzeStudentText(studentText, referenceExam, customPrompt, rubric);
                setAiResult(result);
                setScore(result.suggested_score || 0);
                toast.success("Chấm AI thành công!", { id: 'ai_scan' });
            } catch (error: any) {
                toast.error(error.message || "Quét thất bại.", { id: 'ai_scan' });
            } finally {
                setIsScanning(false);
            }
        }
    };

    const handleSubmitAndSave = async () => {
        if (!selectedClassId || !selectedStudentId) return toast.error("Vui lòng chọn Lớp và Học Sinh.");
        if (!title.trim()) return toast.error("Vui lòng nhập Tiêu đề bài thu.");
        if (selectedFiles.length === 0) return toast.error("Vui lòng tải ảnh lên.");
        if (!aiResult) return toast.error("Vui lòng cho AI quét bài trước khi lưu.");

        setIsLoading(true);
        toast.loading("Đang đẩy file lên External Storage...", { id: 'save_db' });

        try {
            // 1. Upload multiple files to External Storage
            const publicUrls: string[] = [];
            for (const file of selectedFiles) {
                const fileExt = file.name.split('.').pop();
                const fileName = `submission_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const publicUrl = await uploadToExternalStorage(file, fileName);
                if (publicUrl) publicUrls.push(publicUrl);
            }

            if (publicUrls.length === 0) throw new Error("Tải file lên Storage Phụ thất bại.");

            // 2. Insert into Main Database (ai_submissions)
            const { data: submissionData, error: subError } = await supabase
                .from('ai_submissions')
                .insert({
                    student_id: selectedStudentId,
                    class_id: selectedClassId,
                    teacher_id: user?.id,
                    title,
                    subject, // Added subject to database call
                    category,
                    external_file_url: JSON.stringify(publicUrls),
                    file_type: selectedFiles[0].type.startsWith('image/') ? 'image' : 'pdf',
                    status: 'graded'
                })
                .select()
                .single();

            if (subError) throw subError;

            // 3. Insert into Main Database (ai_grading_reviews)
            const { error: revError } = await supabase
                .from('ai_grading_reviews')
                .insert({
                    submission_id: submissionData.id,
                    teacher_id: user?.id,
                    advantages: aiResult.advantages,
                    limitations: aiResult.limitations,
                    improvements: aiResult.improvements,
                    score_optional: isScoreOptional ? null : score,
                    custom_ai_prompt: customPrompt,
                    raw_ai_response: JSON.stringify(aiResult),
                    is_published_to_student: true
                });

            if (revError) throw revError;

            toast.success("Lưu & Gửi kết quả thành công!", { id: 'save_db' });

            // Auto-save to grading history (A4)
            const studentObj = classStudents.find(s => s.id === selectedStudentId);
            setGradingHistory(prev => [{
                studentName: studentObj?.name || 'N/A',
                title, category, score,
                advantages: aiResult.advantages,
                limitations: aiResult.limitations,
                improvements: aiResult.improvements,
                timestamp: new Date().toISOString(),
            }, ...prev]);

            // Notification to student (D1)
            if (selectedStudentId) {
                const { addNotification } = useStore.getState();
                addNotification({
                    id: `grade_${Date.now()}`,
                    userId: selectedStudentId,
                    type: 'SUCCESS',
                    title: '📝 Bài đã được chấm!',
                    message: `GV đã chấm bài "${title}" — Điểm: ${isScoreOptional ? 'Không ghi điểm' : `${score}/100`}`,
                    isRead: false,
                    createdAt: new Date().toISOString(),
                    link: '/student/history',
                });
            }

            // Reset form
            setSelectedFiles([]);
            setPreviewUrls([]);
            setAiResult(null);
            setTitle('');
            setStudentText('');
        } catch (error: any) {
            console.error("Lỗi khi lưu bài:", error);
            toast.error("Đã xảy ra lỗi khi lưu vào Database chính.", { id: 'save_db' });
        } finally {
            setIsLoading(false);
        }
    };

    // Batch Scan: scan toàn bộ HS trong lớp (A2) - dùng text mode
    const handleBatchScan = async () => {
        if (classStudents.length === 0 || !studentText.trim()) {
            toast.error("Vui lòng nhập bài mẫu/text chung ở tab 'Nhập bài dạng Text' trước khi scan cả lớp.");
            return;
        }
        setBatchScanning(true);
        setBatchProgress(0);
        const batchTitle = title || `Chấm hàng loạt ${new Date().toLocaleString('vi-VN')}`;

        for (let i = 0; i < classStudents.length; i++) {
            setBatchProgress(i + 1);
            try {
                const result = await analyzeStudentText(
                    `${studentText}\n\n(Bài của HS: ${classStudents[i].name})`,
                    referenceExam, customPrompt, rubric
                );
                setGradingHistory(prev => [{
                    studentName: classStudents[i].name,
                    title: batchTitle,
                    category,
                    score: result.suggested_score || 0,
                    advantages: result.advantages || '',
                    limitations: result.limitations || '',
                    improvements: result.improvements || '',
                    timestamp: new Date().toISOString(),
                }, ...prev]);
            } catch (e) {
                console.error(`Scan failed for ${classStudents[i].name}:`, e);
            }
        }
        setBatchScanning(false);
        toast.success(`Đã chấm ${classStudents.length} HS!`);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-indigo-100">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                        <Bot className="h-8 w-8 text-indigo-500" />
                        Trợ Lý Chấm Bài Bằng AI
                    </h1>
                    <p className="text-gray-500 mt-2">EduQuest AI quét chữ viết tay, phân tích điểm mạnh yếu theo chỉ đạo của Giáo viên.</p>
                </div>
                <div className="w-1/3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chọn Lớp</label>
                    <select
                        value={selectedClassId}
                        onChange={e => setSelectedClassId(e.target.value)}
                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
                    >
                        {myClasses.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Khu Vực Tải Ảnh & Thiết lập AI */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                        <h2 className="text-xl font-bold flex items-center gap-2 border-b pb-3">
                            <FileImage className="h-5 w-5 text-indigo-500" /> Hồ sơ Nộp Bài
                        </h2>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Chọn Học Sinh *</label>
                            <select
                                value={selectedStudentId}
                                onChange={e => setSelectedStudentId(e.target.value)}
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">-- Thuộc về Học Sinh --</option>
                                {classStudents.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Chủ đề Môn học *</label>
                            <select
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                {['Toán', 'Tiếng Việt', 'Khoa học', 'Lịch sử và Địa lí', 'Công nghệ', 'Tiếng Anh', 'Tin học'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề bài làm *</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Vd: Bài tập về nhà Hệ Tọa Độ..."
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phân loại (Tag) *</label>
                                <select
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="Bài tập về nhà">Bài tập về nhà</option>
                                    <option value="Bài kiểm tra">Bài kiểm tra</option>
                                    <option value="Bài ôn tập">Bài ôn tập</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Lời nhắc AI (Custom Prompt)</label>
                            <textarea
                                value={customPrompt}
                                onChange={e => setCustomPrompt(e.target.value)}
                                rows={2}
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                placeholder="Vd: Lưu ý cẩn thận phần dấu âm dương..."
                            />
                        </div>

                        {/* Đề bài gốc */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                <BookOpen className="h-4 w-4 text-blue-500" /> Đề bài gốc / Đáp án chuẩn (Tùy chọn)
                            </label>
                            <textarea
                                value={referenceExam}
                                onChange={e => setReferenceExam(e.target.value)}
                                rows={3}
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                                placeholder="Dán đề bài và/hoặc đáp án chuẩn ở đây. AI sẽ so sánh bài HS với nội dung này để chấm chính xác hơn."
                            />
                        </div>

                        {/* Custom Rubric */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tiêu chí Rubric (Tùy chọn)</label>
                            <textarea
                                value={rubric}
                                onChange={e => setRubric(e.target.value)}
                                rows={2}
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-amber-500 focus:border-amber-500 text-sm"
                                placeholder="VD: Trình bày 20đ, Nội dung 60đ, Sáng tạo 20đ"
                            />
                        </div>

                        {/* Tab chuyển đổi Ảnh / Text */}
                        <div className="flex gap-2 mb-2">
                            <button onClick={() => setInputMode('IMAGE')}
                                className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${inputMode === 'IMAGE' ? 'bg-indigo-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                <FileImage className="h-4 w-4" /> Ảnh bài làm
                            </button>
                            <button onClick={() => setInputMode('TEXT')}
                                className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${inputMode === 'TEXT' ? 'bg-purple-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                <Type className="h-4 w-4" /> Nhập bài dạng Text
                            </button>
                        </div>

                        {inputMode === 'IMAGE' ? (
                            <div className="mt-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tải Ảnh / PDF Bài Làm</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:bg-gray-50 transition relative">
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*, application/pdf"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    {selectedFiles.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 relative z-20 pointer-events-none">
                                            {selectedFiles.map((file, idx) => (
                                                <div key={idx} className="relative group pointer-events-auto">
                                                    {previewUrls[idx] ? (
                                                        <img src={previewUrls[idx]} alt="Preview" className="h-28 w-full object-cover rounded-lg shadow-sm border border-gray-200" />
                                                    ) : (
                                                        <div className="h-28 w-full flex items-center justify-center bg-gray-100 rounded-lg shadow-sm border border-gray-200">
                                                            <FileText className="h-8 w-8 text-indigo-400" />
                                                        </div>
                                                    )}
                                                    <button onClick={(e) => { e.stopPropagation(); handleRemoveFile(idx); }} className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition shadow-md">
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                    <div className="text-xs text-gray-500 font-medium text-center mt-1 truncate px-1">Trang {idx + 1}</div>
                                                </div>
                                            ))}
                                            <div className="h-28 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg text-gray-400 pointer-events-none">
                                                <Upload className="h-6 w-6 mb-1" />
                                                <span className="text-xs font-semibold">Thêm mặt sau</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center pointer-events-none py-4 text-center">
                                            <Upload className="h-10 w-10 text-gray-400 mb-2" />
                                            <p className="text-sm font-medium text-gray-700">Nhấp hoặc quét chọn nhiều File cùng lúc</p>
                                            <p className="text-xs text-gray-500 mt-1">Gộp mặt trước/mặt sau làm 1 bài AI chấm</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="mt-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                    <Type className="h-4 w-4 text-purple-500" /> Nội dung bài làm của HS (dạng text)
                                </label>
                                <textarea
                                    value={studentText}
                                    onChange={e => setStudentText(e.target.value)}
                                    rows={10}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-sm font-mono"
                                    placeholder={"Dán hoặc gõ nội dung bài làm của học sinh vào đây...\n\nVD:\nCâu 1: 3+5=8 (đúng)\nCâu 2: 7x3=22 (sai, đáp án đúng 21)\nCâu 3: Viết đoạn văn..."}
                                    style={{ minHeight: '200px' }}
                                />
                            </div>
                        )}

                        <button
                            onClick={handleScanWithAI}
                            disabled={(inputMode === 'IMAGE' ? selectedFiles.length === 0 : !studentText.trim()) || isScanning}
                            className="w-full mt-4 flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isScanning ? (
                                <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div> Đang quét & Phân Tích...</>
                            ) : (
                                <><Zap className="h-5 w-5 mr-2" /> Quét AI Trợ Lý</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Khu Vực Kết Quả AI & Chỉnh Sửa */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex flex-col h-full">
                        <h2 className="text-xl font-bold flex items-center gap-2 border-b pb-3 mb-4 text-emerald-800">
                            <Star className="h-5 w-5 text-emerald-500" /> Kết Quả Phân Tích & Chấm Điểm
                        </h2>

                        {!aiResult ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-12 text-center">
                                <Bot className="h-16 w-16 mb-4 opacity-20" />
                                <p>Tải ảnh và nhấn "Quét AI" để lấy kết quả phân tích tự động.</p>
                            </div>
                        ) : (
                            <div className="flex-1 space-y-5 overflow-y-auto pr-2">
                                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-emerald-800">Điểm Đánh Giá (Thang 100)</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <input
                                                type="checkbox"
                                                id="optionalScore"
                                                checked={isScoreOptional}
                                                onChange={e => setIsScoreOptional(e.target.checked)}
                                                className="rounded text-emerald-500 focus:ring-emerald-500"
                                            />
                                            <label htmlFor="optionalScore" className="text-sm font-medium text-emerald-700 cursor-pointer">Không ghi điểm (Chỉ nhận xét)</label>
                                        </div>
                                    </div>
                                    {!isScoreOptional && (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="0" max="100"
                                                value={score}
                                                onChange={e => setScore(Number(e.target.value))}
                                                className="w-20 text-center font-black text-2xl text-emerald-600 border-emerald-200 rounded-lg focus:ring-emerald-500"
                                            />
                                            <span className="font-bold text-gray-400">/ 100</span>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block font-bold text-indigo-700 mb-1 flex items-center gap-1"><Check className="h-4 w-4" /> Ưu Điểm Đáng Khen</label>
                                    <textarea
                                        value={aiResult.advantages}
                                        onChange={e => setAiResult({ ...aiResult, advantages: e.target.value })}
                                        rows={4}
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-red-600 mb-1 flex items-center gap-1"><X className="h-4 w-4" /> Lỗi Cần Chú Ý</label>
                                    <textarea
                                        value={aiResult.limitations}
                                        onChange={e => setAiResult({ ...aiResult, limitations: e.target.value })}
                                        rows={4}
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-red-500"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-amber-600 mb-1 flex items-center gap-1"><AlertCircle className="h-4 w-4" /> Hướng Dẫn Cải Thiện</label>
                                    <textarea
                                        value={aiResult.improvements}
                                        onChange={e => setAiResult({ ...aiResult, improvements: e.target.value })}
                                        rows={4}
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-amber-500"
                                    />
                                </div>

                                <button
                                    onClick={handleSubmitAndSave}
                                    disabled={isLoading}
                                    className="w-full mt-4 flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                                >
                                    <Save className="h-5 w-5 mr-2" /> {isLoading ? 'Đang Lưu...' : 'Lưu Điểm & Gửi Cho Học Sinh'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Lịch Sử Chấm Bài (A4) + Scan Hàng Loạt (A2) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mt-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Filter className="h-5 w-5 text-gray-500" /> Lịch Sử Chấm Bài ({gradingHistory.length})
                    </h2>
                    <div className="flex gap-2 items-center">
                        <div className="relative">
                            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" value={historySearch} onChange={e => setHistorySearch(e.target.value)}
                                placeholder="Tìm Tên, Tiêu đề..."
                                className="pl-9 pr-4 py-2 border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 w-64 text-sm" />
                        </div>
                        <button onClick={handleBatchScan} disabled={batchScanning || classStudents.length === 0}
                            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-bold text-sm hover:shadow-lg disabled:opacity-50 flex items-center gap-2 whitespace-nowrap">
                            <Zap className="h-4 w-4" />
                            {batchScanning ? `Đang chấm (${batchProgress}/${classStudents.length})...` : `⚡ Scan cả lớp (${classStudents.length} HS)`}
                        </button>
                    </div>
                </div>

                {gradingHistory.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <Bot className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p className="font-medium">Chưa có bài nào được chấm.</p>
                        <p className="text-sm mt-1">Upload ảnh hoặc nhập text bài HS rồi bấm "Quét AI" để bắt đầu.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Học sinh</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bài làm</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Điểm</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thời gian</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Chi tiết</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {gradingHistory.filter(h =>
                                    !historySearch || h.studentName.toLowerCase().includes(historySearch.toLowerCase()) || h.title.toLowerCase().includes(historySearch.toLowerCase())
                                ).map((h, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                                    {h.studentName.split(' ').map(w => w[0]).join('').slice(-2)}
                                                </div>
                                                <span className="text-sm font-medium">{h.studentName}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">{h.title}</p>
                                            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{h.category}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="text-lg font-black text-emerald-600">{h.score}</span>
                                            <span className="text-xs text-gray-400">/100</span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(h.timestamp).toLocaleString('vi-VN')}</td>
                                        <td className="px-4 py-3 text-center">
                                            <button onClick={() => { setExpandedHistory(expandedHistory === i ? null : i); }}
                                                className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded transition">
                                                <Eye className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {/* Expanded detail */}
                        {expandedHistory !== null && gradingHistory[expandedHistory] && (
                            <div className="mt-3 p-4 bg-gray-50 rounded-xl border space-y-2 text-sm">
                                <div><strong className="text-green-700">✅ Ưu điểm:</strong> <span className="text-gray-700">{gradingHistory[expandedHistory].advantages}</span></div>
                                <div><strong className="text-red-600">❌ Hạn chế:</strong> <span className="text-gray-700">{gradingHistory[expandedHistory].limitations}</span></div>
                                <div><strong className="text-amber-600">💡 Cải thiện:</strong> <span className="text-gray-700">{gradingHistory[expandedHistory].improvements}</span></div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

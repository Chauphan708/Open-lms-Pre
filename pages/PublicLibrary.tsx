import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { Search, Globe, Filter, BookOpen, GraduationCap, Download, Eye, Clock, Layers, Star, Info, CheckCircle, ChevronRight, AlertCircle } from 'lucide-react';
import { Exam } from '../types';
import { ExamPreviewModal } from '../components/exam/ExamPreviewModal';

export const PublicLibrary: React.FC = () => {
  const { fetchPublicExams, importExamByCode, user } = useStore();
  const [publicExams, setPublicExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  
  // Preview State
  const [previewExam, setPreviewExam] = useState<Exam | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Import State
  const [isImporting, setIsImporting] = useState<string | null>(null);

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    setIsLoading(true);
    const data = await fetchPublicExams();
    setPublicExams(data);
    setIsLoading(false);
  };

  const filteredExams = useMemo(() => {
    return publicExams.filter(e => {
      const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            e.originalAuthorName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSubject = selectedSubject ? e.subject === selectedSubject : true;
      const matchesGrade = selectedGrade ? e.grade === selectedGrade : true;
      return matchesSearch && matchesSubject && matchesGrade;
    });
  }, [publicExams, searchTerm, selectedSubject, selectedGrade]);

  const subjects = ['Toán', 'Tiếng Việt', 'Khoa học', 'Lịch sử và Địa lí', 'Công nghệ', 'Tiếng Anh', 'Tin học'];
  const grades = ['1', '2', '3', '4', '5'];

  const handleImport = async (exam: Exam) => {
    if (!exam.shareCode) return;
    setIsImporting(exam.id);
    const newId = await importExamByCode(exam.shareCode);
    setIsImporting(null);
    if (newId) {
      alert(`Đã nhập đề "${exam.title}" về kho của bạn thành công!`);
    }
  };

  const handlePreview = (exam: Exam) => {
    setPreviewExam(exam);
    setIsPreviewOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Hero Section */}
      <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 group">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 group-hover:opacity-30 transition-opacity"></div>
         <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 mb-2">
               <Globe className="h-8 w-8 text-indigo-200" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">Thư viện Cộng đồng</h1>
            <p className="text-indigo-100 max-w-xl text-lg font-medium opacity-90">
               Khám phá hàng ngàn đề thi và câu hỏi chất lượng từ đồng nghiệp khắp cả nước. Chia sẻ kiến thức, cùng nhau phát triển.
            </p>
         </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-1">
            <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
               <BookOpen className="h-6 w-6" />
            </div>
            <div>
               <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Đề thi</p>
               <p className="text-xl font-black text-gray-900">{publicExams.length}</p>
            </div>
         </div>
         {/* More stats if needed */}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 sticky top-4 z-10">
         <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Tìm kiếm đề thi, tên giáo viên..." 
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-transparent border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-indigo-600 outline-none transition-all font-medium text-gray-700"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
         </div>
         
         <div className="flex gap-3">
            <select 
              className="px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-indigo-600 outline-none transition-all font-bold text-gray-700 text-sm appearance-none min-w-[140px]"
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
            >
               <option value="">Tất cả môn</option>
               {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select 
              className="px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-indigo-600 outline-none transition-all font-bold text-gray-700 text-sm appearance-none min-w-[140px]"
              value={selectedGrade}
              onChange={e => setSelectedGrade(e.target.value)}
            >
               <option value="">Tất cả</option>
               {grades.map(g => <option key={g} value={g}>Lớp {g}</option>)}
            </select>
         </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center gap-4">
           <div className="h-12 w-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
           <p className="text-gray-400 font-medium animate-pulse">Đang nạp dữ liệu cộng đồng...</p>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="py-20 bg-white rounded-3xl border border-dashed border-gray-300 text-center space-y-4">
           <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
              <Globe className="h-8 w-8" />
           </div>
           <p className="text-gray-500 font-bold">Không tìm thấy tài liệu phù hợp</p>
           <button onClick={() => { setSearchTerm(''); setSelectedSubject(''); setSelectedGrade(''); }} className="text-indigo-600 font-bold text-sm hover:underline">Xóa bộ lọc</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam) => (
            <div key={exam.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group h-full">
               <div className="p-6 flex-1 space-y-4">
                  <div className="flex justify-between items-start">
                     <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-wider">
                        {exam.grade ? `Lớp ${exam.grade}` : 'K.Hợp'}
                     </span>
                     <div className="flex items-center gap-1.5 text-amber-500">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="text-xs font-bold text-gray-600">4.9</span>
                     </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-tight">
                    {exam.title}
                  </h3>

                  <div className="flex flex-wrap gap-2">
                     <span className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium border border-gray-100">
                        <Clock className="h-3.5 w-3.5" /> {exam.durationMinutes} ph
                     </span>
                     <span className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium border border-gray-100">
                        <Layers className="h-3.5 w-3.5" /> {exam.questionCount} câu
                     </span>
                     <span className="px-2.5 py-1 bg-indigo-50/50 text-indigo-600 rounded-lg text-xs font-bold">
                        {exam.subject}
                     </span>
                  </div>

                  <div className="pt-4 border-t border-gray-50 flex items-center gap-3">
                     <div className="h-8 w-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-[10px] font-black font-mono">
                        {(exam.originalAuthorName || 'AZ').charAt(0)}
                     </div>
                     <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{exam.originalAuthorName || 'Giáo viên ẩn danh'}</p>
                        <p className="text-[10px] text-gray-400 font-medium">Tác giả gốc</p>
                     </div>
                  </div>
               </div>

               <div className="px-6 py-5 bg-gray-50/80 border-t border-gray-100 flex items-center gap-3">
                  <button 
                    onClick={() => handlePreview(exam)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-gray-700 rounded-2xl font-bold text-sm border border-gray-200 hover:bg-gray-50 transition-all shadow-sm active:scale-95"
                  >
                     <Eye className="h-4 w-4" /> Xem thử
                  </button>
                  <button 
                    onClick={() => handleImport(exam)}
                    disabled={isImporting === exam.id}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm border border-indigo-500 hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 active:scale-95 disabled:opacity-50"
                  >
                     {isImporting === exam.id ? (
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                     ) : (
                        <Download className="h-4 w-4" />
                     )}
                     Nhập về kho
                  </button>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {previewExam && (
        <ExamPreviewModal
          exam={previewExam}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Save, BookOpen, GraduationCap, Layers, Tag, Info, Eye } from 'lucide-react';
import { useStore } from '../store';
import { Exam } from '../types';
import { supabase } from '../services/supabaseClient';
import { ExamPreviewModal } from './exam/ExamPreviewModal';

interface Props {
  notificationId: string;
  examId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AcceptShareModal: React.FC<Props> = ({ notificationId, examId, isOpen, onClose }) => {
  const { respondToShare, customTopics } = useStore();
  
  // Data State
  const [sourceExam, setSourceExam] = useState<Exam | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [topic, setTopic] = useState('');
  
  // UI State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (isOpen && examId) {
      loadSourceExam();
    }
  }, [isOpen, examId]);

  const loadSourceExam = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('exams').select('*').eq('id', examId).single();
    if (data) {
      setSourceExam(data);
      setNewTitle(data.title);
      setSubject(data.subject || '');
      setGrade(data.grade || '');
      setTopic(data.topic || '');
    }
    setIsLoading(false);
  };

  const handleAction = async (accept: boolean) => {
    setIsProcessing(true);
    const metadata = accept ? { title: newTitle, subject, grade, topic } : undefined;
    const success = await respondToShare(notificationId, examId, accept, metadata);
    setIsProcessing(false);
    if (success) onClose();
    else alert("Đã có lỗi xảy ra. Vui lòng thử lại.");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-fade-in overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="p-5 border-b flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                <CheckCircle className="h-5 w-5" />
             </div>
             <h2 className="text-lg font-bold text-gray-900">Nhận đề thi chia sẻ</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-10 text-center">
             <div className="h-8 w-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
             <p className="text-sm text-gray-500 font-medium">Đang tải thông tin đề thi...</p>
          </div>
        ) : !sourceExam ? (
          <div className="p-10 text-center space-y-4">
             <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
             <p className="text-gray-900 font-bold">Không tìm thấy đề thi</p>
             <p className="text-sm text-gray-500">Đề thi này có thể đã bị tác giả gỡ bỏ hoặc quyền truy cập đã hết hạn.</p>
             <button onClick={onClose} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">Đóng</button>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex gap-3 text-sm text-indigo-800">
               <Info className="h-5 w-5 flex-shrink-0" />
               <p>Bạn đã nhận được đề thi từ đồng nghiệp. Hãy thiết lập cách lưu trữ đề thi này trong kho của bạn.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Tên đề thi mới</label>
                <div className="relative group">
                   <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                   <input 
                     type="text"
                     className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-gray-800"
                     value={newTitle}
                     onChange={e => setNewTitle(e.target.value)}
                   />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Môn học</label>
                    <div className="relative">
                       <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                       <input 
                         type="text"
                         className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                         value={subject}
                         onChange={e => setSubject(e.target.value)}
                       />
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Khối lớp</label>
                    <div className="relative">
                       <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                       <input 
                         type="text"
                         className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                         value={grade}
                         onChange={e => setGrade(e.target.value)}
                       />
                    </div>
                 </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Chủ đề / Nội dung</label>
                <div className="relative">
                   <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                   <select 
                     className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm appearance-none bg-white"
                     value={topic}
                     onChange={e => setTopic(e.target.value)}
                   >
                     <option value="">Chọn chủ đề...</option>
                     {customTopics.map(t => <option key={t} value={t}>{t}</option>)}
                     <option value="khac">Khác (Giữ nguyên gốc)</option>
                   </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
               <button 
                 onClick={() => setIsPreviewOpen(true)}
                 className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all text-sm"
               >
                  <Eye className="h-4 w-4" /> Xem trước
               </button>
               <button 
                 onClick={() => handleAction(false)}
                 disabled={isProcessing}
                 className="flex-1 py-3 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-all text-sm border border-transparent hover:border-red-100"
               >
                  Từ chối
               </button>
               <button 
                 onClick={() => handleAction(true)}
                 disabled={isProcessing}
                 className="flex-[1.5] flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg transition-all text-sm disabled:opacity-50"
               >
                  {isProcessing ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isProcessing ? 'Đang lưu...' : 'Đồng ý & Lưu'}
               </button>
            </div>
          </div>
        )}
      </div>

      {sourceExam && (
        <ExamPreviewModal
          exam={sourceExam}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </div>
  );
};

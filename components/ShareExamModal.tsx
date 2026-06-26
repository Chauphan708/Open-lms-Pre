import React, { useState, useEffect, useMemo } from 'react';
import { X, Globe, Lock, Share2, Users, Search, CheckCircle, Copy, AlertCircle, Send, Info } from 'lucide-react';
import { useStore } from '../store';
import { Exam } from '../types';

interface Props {
  exam: Exam;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareExamModal: React.FC<Props> = ({ exam, isOpen, onClose }) => {
  const { user, users, toggleExamShare, sendDirectShare } = useStore();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'public' | 'direct'>('public');
  
  // Mode 1: Public/Code State
  const [isPublic, setIsPublic] = useState(exam.isPublic || false);
  const [isCodeRequired, setIsCodeRequired] = useState(exam.isCodeRequired || false);
  const [shareCode, setShareCode] = useState(exam.shareCode || '');
  
  // Mode 2: Direct Share State
  const [teacherSearch, setTeacherSearch] = useState('');
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  
  // UI State
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsPublic(exam.isPublic || false);
      setIsCodeRequired(exam.isCodeRequired || false);
      setShareCode(exam.shareCode || '');
      setSelectedTeacherIds([]);
      setTeacherSearch('');
      setShowSuccess(false);
      setIsSaving(false);
    }
  }, [isOpen, exam]);

  // Filter teachers (excluding current user)
  const availableTeachers = useMemo(() => {
    return users.filter(u => u.role === 'TEACHER' && u.id !== user?.id && 
      (u.name.toLowerCase().includes(teacherSearch.toLowerCase()) || 
       u.email.toLowerCase().includes(teacherSearch.toLowerCase()))
    );
  }, [users, user, teacherSearch]);

  const handleSavePublic = async () => {
    setIsSaving(true);
    const result = await toggleExamShare(exam.id, isPublic, isCodeRequired);
    if (result) {
      if (typeof result === 'string') {
        setShareCode(result);
      }
      setShowSuccess(true);
    } else {
      alert("Đã có lỗi xảy ra khi lưu trạng thái chia sẻ. Vui lòng thử lại.");
    }
    setIsSaving(false);
  };

  const handleSendDirect = async () => {
    if (selectedTeacherIds.length === 0) {
      alert("Vui lòng chọn ít nhất một giáo viên!");
      return;
    }
    setIsSaving(true);
    const success = await sendDirectShare(exam.id, selectedTeacherIds);
    if (success) {
      setShowSuccess(true);
    } else {
      alert("Gửi đề thi thất bại. Có thể do lỗi cơ sở dữ liệu (vui lòng chạy script cập nhật cột payload).");
    }
    setIsSaving(false);
  };

  if (!isOpen) return null;

  const shareUrl = shareCode ? `${window.location.origin}/import/${shareCode}` : '';

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in overflow-hidden border border-gray-100 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 rounded-lg">
                <Share2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
             </div>
             <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Chia sẻ đề thi</h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium truncate max-w-[250px]">{exam.title}</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition-colors text-gray-500 dark:text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success View */}
        {showSuccess ? (
          <div className="p-10 text-center space-y-6 animate-in zoom-in-95 duration-300 dark:bg-slate-900">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-950/40 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                {activeTab === 'public' ? 'Đã cập nhật trạng thái chia sẻ!' : 'Đã gửi đề thi thành công!'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
                {activeTab === 'public' 
                  ? 'Đồng nghiệp của bạn có thể tìm thấy đề thi này trong thư viện chung hoặc sử dụng mã chia sẻ bên dưới.' 
                  : 'Thông báo đã được gửi đến các giáo viên được chọn. Bạn sẽ nhận được thông báo nếu họ chấp nhận hoặc từ chối.'}
              </p>
            </div>

            {(isPublic || isCodeRequired || shareCode) && activeTab === 'public' && (
              <div className="bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 space-y-3">
                <div className="flex justify-between items-center">
                   <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Mã chia sẻ</span>
                   <span className="text-lg font-mono font-black text-indigo-900 dark:text-indigo-300">{shareCode}</span>
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-slate-950 p-2 rounded-lg border border-indigo-200 dark:border-indigo-900/40">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 bg-transparent border-none outline-none text-xs text-gray-600 dark:text-slate-300 font-mono truncate"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl || shareCode);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                    title="Sao chép đường dẫn"
                  >
                    {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <button 
              onClick={onClose}
              className="w-full py-3 bg-gray-900 dark:bg-indigo-600 text-white rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-indigo-700 transition-all shadow-lg"
            >
              Hoàn tất
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex p-1 bg-gray-100 dark:bg-slate-950 mx-5 mt-5 rounded-xl border border-gray-200 dark:border-slate-800">
              <button
                onClick={() => setActiveTab('public')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'public' ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'}`}
              >
                <Globe className="h-4 w-4" /> Thư viện chung
              </button>
              <button
                onClick={() => setActiveTab('direct')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'direct' ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'}`}
              >
                <Users className="h-4 w-4" /> Gửi trực tiếp
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 max-h-[60vh] bg-white dark:bg-slate-900">
              {activeTab === 'public' ? (
                <div className="space-y-6">
                  <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 p-4 rounded-xl text-indigo-800 dark:text-indigo-300 text-sm flex gap-3">
                    <Info className="h-5 w-5 flex-shrink-0" />
                    <p className="leading-relaxed">
                      Chia sẻ đề thi giúp xây dựng kho học liệu phong phú. Bạn vẫn giữ <strong>bản quyền tác giả gốc</strong> và các bản sao sẽ ghi nhận sự đóng góp của đồng nghiệp.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <label className="flex items-start gap-4 p-4 rounded-xl border-2 dark:border-slate-800 cursor-pointer transition-all hover:border-indigo-200 dark:hover:border-indigo-850 bg-white dark:bg-slate-950 group select-none">
                      <div className={`mt-1 p-2 rounded-lg ${isPublic ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400' : 'bg-gray-100 dark:bg-slate-900 text-gray-400 dark:text-slate-500'}`}>
                        <Globe className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                           <span className="font-bold text-gray-900 dark:text-slate-100">Chia sẻ lên Thư viện chung</span>
                           <input 
                             type="checkbox" 
                             checked={isPublic} 
                             onChange={e => setIsPublic(e.target.checked)}
                             className="w-5 h-5 rounded-full border-gray-300 dark:border-slate-700 text-indigo-600 dark:bg-slate-900 focus:ring-indigo-500" 
                           />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Mọi giáo viên trong hệ thống đều có thể tìm thấy và sử dụng đề thi này.</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-4 p-4 rounded-xl border-2 dark:border-slate-800 cursor-pointer transition-all hover:border-indigo-200 dark:hover:border-indigo-850 bg-white dark:bg-slate-950 group select-none">
                      <div className={`mt-1 p-2 rounded-lg ${isCodeRequired ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' : 'bg-gray-100 dark:bg-slate-900 text-gray-400 dark:text-slate-500'}`}>
                        <Lock className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                           <span className="font-bold text-gray-900 dark:text-slate-100">Cho phép tìm theo Mã chia sẻ</span>
                           <input 
                             type="checkbox" 
                             checked={isCodeRequired} 
                             onChange={e => setIsCodeRequired(e.target.checked)}
                             className="w-5 h-5 rounded-full border-gray-300 dark:border-slate-700 text-indigo-600 dark:bg-slate-900 focus:ring-indigo-500" 
                           />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Người có mã có thể tìm thấy đề thi ngay cả khi không hiện ở thư viện chung.</p>
                      </div>
                    </label>
                  </div>

                  {shareCode && (
                    <div className="p-4 border-t border-dashed dark:border-slate-800 space-y-2">
                       <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Mã chia sẻ của bạn</p>
                       <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-950 p-3 rounded-lg border dark:border-slate-800">
                          <span className="font-mono text-xl font-black text-indigo-700 dark:text-indigo-400">{shareCode}</span>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(shareCode);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 px-3 py-1.5 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded shadow-sm"
                          >
                            {copied ? <CheckCircle className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            {copied ? 'Đã chép' : 'Sao chép mã'}
                          </button>
                       </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Tìm tên giáo viên..."
                      className="w-full pl-10 pr-4 py-2.5 border dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={teacherSearch}
                      onChange={e => setTeacherSearch(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {availableTeachers.length === 0 ? (
                      <div className="text-center py-8">
                         <div className="w-12 h-12 bg-gray-100 dark:bg-slate-850 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-300 dark:text-slate-650">
                            <Users className="h-6 w-6" />
                         </div>
                         <p className="text-sm text-gray-400 dark:text-slate-500 italic">Không tìm thấy giáo viên phù hợp.</p>
                      </div>
                    ) : (
                      availableTeachers.map(teacher => (
                        <label key={teacher.id} className="flex items-center justify-between p-3 border dark:border-slate-850 rounded-xl hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 cursor-pointer transition-colors group">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-350 rounded-full flex items-center justify-center font-bold">
                                 {teacher.name.charAt(0)}
                              </div>
                              <div>
                                 <p className="text-sm font-bold text-gray-900 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-400">{teacher.name}</p>
                                 <p className="text-xs text-gray-500 dark:text-slate-400">{teacher.email}</p>
                              </div>
                           </div>
                           <input
                             type="checkbox"
                             checked={selectedTeacherIds.includes(teacher.id)}
                             onChange={(e) => {
                               if (e.target.checked) setSelectedTeacherIds(prev => [...prev, teacher.id]);
                               else setSelectedTeacherIds(prev => prev.filter(id => id !== teacher.id));
                             }}
                             className="w-5 h-5 rounded-full text-indigo-600 dark:bg-slate-900 border-gray-300 dark:border-slate-700 focus:ring-indigo-500"
                           />
                        </label>
                      ))
                    )}
                  </div>

                  {selectedTeacherIds.length > 0 && (
                     <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-100 dark:border-amber-900/40 flex gap-2 text-[10px] text-amber-850 dark:text-amber-300">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <p>Đề thi sẽ được gửi trực tiếp vào mục "Thông báo" của giáo viên đã chọn. Họ có thể chấp nhận hoặc từ chối đề này.</p>
                     </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="p-5 border-t dark:border-slate-800 bg-gray-50 dark:bg-slate-900 flex justify-end gap-3">
              <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-xl transition-colors">Hủy</button>
              <button
                onClick={activeTab === 'public' ? handleSavePublic : handleSendDirect}
                disabled={isSaving || (activeTab === 'direct' && selectedTeacherIds.length === 0)}
                className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              >
                {isSaving ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {activeTab === 'public' ? <Globe className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    {activeTab === 'public' ? 'Lưu chia sẻ' : `Gửi ngay (${selectedTeacherIds.length})`}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

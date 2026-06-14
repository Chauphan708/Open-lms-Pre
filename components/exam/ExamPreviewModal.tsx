import React from 'react';
import { X, Clock, Layers, HelpCircle, FileText, Info } from 'lucide-react';
import { Exam } from '../../types';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface Props {
  exam: Exam;
  isOpen: boolean;
  onClose: () => void;
}

export const ExamPreviewModal: React.FC<Props> = ({ exam, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[90vh] animate-fade-in overflow-hidden border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-4">
             <div className="h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <FileText className="h-6 w-6" />
             </div>
             <div>
                <h2 className="text-xl font-black text-gray-900 leading-tight">{exam.title}</h2>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 font-medium">
                   <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {exam.durationMinutes} phút</span>
                   <span>•</span>
                   <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {exam.questionCount} câu hỏi</span>
                   <span>•</span>
                   <span className="text-indigo-600 font-bold">{exam.subject} - Lớp {exam.grade || 'K.Hợp'}</span>
                </div>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30 custom-scrollbar">
           <div className="max-w-3xl mx-auto space-y-12">
              
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3 text-amber-800 text-sm italic">
                  <Info className="h-5 w-5 flex-shrink-0" />
                  <p>Chế độ xem trước chỉ hiển thị đề bài. Đáp án và lời giải chi tiết sẽ được hiển thị đầy đủ sau khi bạn <strong>"Nhập về kho"</strong>.</p>
              </div>

              {exam.questions.map((q, idx) => (
                <div key={idx} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6 relative overflow-hidden group hover:border-indigo-200 transition-all">
                  <div className="flex justify-between items-start">
                     <span className="px-4 py-1 bg-gray-900 text-white rounded-full text-xs font-black uppercase tracking-widest">Câu {idx + 1}</span>
                     <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">ID: {q.type}</span>
                  </div>
                  
                  <div className="prose prose-indigo max-w-none text-gray-800 font-medium text-lg leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {q.content}
                    </ReactMarkdown>
                  </div>

                  {q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-start gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100 group-hover:bg-white transition-colors">
                          <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-xs font-black text-gray-500 shadow-sm">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <div className="pt-1 text-sm text-gray-600 font-medium">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {opt}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === 'MATCHING' && (
                     <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100/50 text-center py-10">
                        <HelpCircle className="h-8 w-8 text-indigo-300 mx-auto mb-2" />
                        <p className="text-sm font-bold text-indigo-400">Câu hỏi nối cột (Mở rộng để xem chi tiết)</p>
                     </div>
                  )}
                </div>
              ))}
           </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-white flex justify-end">
           <button 
             onClick={onClose}
             className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-black text-sm hover:bg-gray-800 transition-all shadow-xl active:scale-95"
           >
             Đóng xem trước
           </button>
        </div>
      </div>
    </div>
  );
};

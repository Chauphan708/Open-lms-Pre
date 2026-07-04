import React from 'react';
import { Wand2, Sparkles, FileText, GraduationCap, MessageSquarePlus, Image as ImageIcon } from 'lucide-react';
import { QuestionType, ExamDifficulty } from '../../types';

export interface ExamContentInputProps {
  mode: 'PARSE' | 'GENERATE' | 'MATRIX';
  rawText: string; setRawText: (v: string) => void;
  aiQuestionType: QuestionType; setAiQuestionType: (v: QuestionType) => void;
  aiCount: number; setAiCount: (v: number) => void;
  aiCustomPrompt: string; setAiCustomPrompt: (v: string) => void;
  isProcessing: boolean;
  topic: string;
  grade: string;
  difficulty: ExamDifficulty;
  handleParseLocal: () => void;
  handleParseAI: () => void;
  handleGenerate: () => void;
  handleParseImage?: (file: File) => void;
}

export const ExamContentInput: React.FC<ExamContentInputProps> = ({
  mode, rawText, setRawText, aiQuestionType, setAiQuestionType,
  aiCount, setAiCount, aiCustomPrompt, setAiCustomPrompt,
  isProcessing, topic, grade, difficulty,
  handleParseLocal, handleParseAI, handleGenerate, handleParseImage
}) => {
  return (
    <div className="flex-1 bg-white dark:bg-slate-900 p-5 rounded-xl border dark:border-slate-800 shadow-sm flex flex-col text-gray-900 dark:text-slate-100">
      {mode === 'PARSE' && (
        <>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2">
              <FileText className="h-4 w-4" /> Nội dung bài tập (Copy/Paste)
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleParseLocal}
                disabled={isProcessing || !rawText}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all
                        ${isProcessing || !rawText ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-md'}
                        `}
                title="Tách bằng regex (nhanh, miễn phí, không cần AI)"
              >
                <Wand2 className="h-3 w-3" /> Tách câu hỏi
              </button>
              <button
                onClick={handleParseAI}
                disabled={isProcessing || !rawText}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all
                        ${isProcessing || !rawText ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-md'}
                        `}
                title="Tách bằng AI (cần API Key, nhận dạng format linh hoạt hơn)"
              >
                {isProcessing ? 'AI đang xử lý...' : <><Sparkles className="h-3 w-3" /> AI Tách</>}
              </button>
            </div>
          </div>

          {/* OCR Image Upload Dropzone */}
          <div className="border-2 border-dashed border-gray-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-xl p-4 mb-3 text-center bg-gray-50/50 dark:bg-slate-950/20 hover:bg-indigo-50/10 transition-all cursor-pointer relative group">
             <input 
                type="file" 
                accept="image/*" 
                onChange={e => {
                   const file = e.target.files?.[0];
                   if (file && handleParseImage) handleParseImage(file);
                }} 
                disabled={isProcessing}
                className="absolute inset-0 opacity-0 cursor-pointer" 
             />
             <div className="flex flex-col items-center justify-center gap-1.5">
                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                   <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                   <span className="text-xs font-bold text-indigo-600 dark:text-indigo-450 hover:text-indigo-700">Tải ảnh đề thi lên (OCR AI)</span>
                   <span className="text-xs text-gray-500 dark:text-slate-400"> hoặc kéo thả vào đây</span>
                </div>
                <span className="text-[10px] text-gray-400 dark:text-slate-500">Hỗ trợ JPG, PNG (AI tự động chuyển thành câu hỏi)</span>
             </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/25 border border-blue-100 dark:border-blue-900/35 rounded-lg p-3 mb-2 text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <p className="font-bold text-blue-800 dark:text-blue-200">📋 Hướng dẫn format nhập liệu:</p>
            <p>• Mỗi câu bắt đầu bằng: <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded text-blue-800 dark:text-blue-200">Câu 1:</code> hoặc <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded text-blue-800 dark:text-blue-200">Bài 1:</code></p>
            <p>• Mức độ (tùy chọn): <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded text-blue-800 dark:text-blue-200">Mức độ: Nhận biết</code>, <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded text-blue-800 dark:text-blue-200">Kết nối</code>, <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded text-blue-800 dark:text-blue-200">Vận dụng</code></p>
            <p>• Đáp án: <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded text-blue-800 dark:text-blue-200">A.</code> <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded text-blue-800 dark:text-blue-200">B.</code> <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded text-blue-800 dark:text-blue-200">C.</code> <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded text-blue-800 dark:text-blue-200">D.</code> (mỗi đáp án 1 dòng)</p>
            <p>• Đáp án đúng: <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded text-blue-800 dark:text-blue-200">Đáp án: B</code></p>
            <p>• Lời giải: <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded text-blue-800 dark:text-blue-200">Giải thích:</code> hoặc <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded text-blue-800 dark:text-blue-200">Hướng dẫn:</code></p>
            <p className="text-blue-500 dark:text-blue-400 italic">💡 AI sẽ tự động nhận dạng cả khi format không chuẩn.</p>
          </div>

          <textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder={`Dán nội dung từ Word/PDF vào đây...\n\nVí dụ:\nCâu 1: 1+1=?\nMức độ: Nhận biết\nA. 1\nB. 2\nC. 3\nD. 4\nĐáp án: B`}
            className="flex-1 w-full border border-gray-300 dark:border-slate-800 rounded-lg p-3 font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100"
            style={{ minHeight: '500px' }}
          />
        </>
      )}

      {mode === 'GENERATE' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" /> AI Tạo bài tập (Thông minh)
            </h3>
          </div>

          <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 rounded-lg p-3 mb-4 flex items-center gap-3 text-sm text-purple-800 dark:text-purple-300">
            <div className="flex items-center gap-1">
              <GraduationCap className="h-4 w-4" /> Khối lớp sẽ được lấy tự động từ Cấu hình chung ({grade})
            </div>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-350 mb-1">Loại câu hỏi</label>
                <select
                  value={aiQuestionType} onChange={e => setAiQuestionType(e.target.value as QuestionType)}
                  className="w-full border border-gray-300 dark:border-slate-800 rounded-lg p-2 text-sm bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 outline-none"
                >
                  <option value="MCQ">Trắc nghiệm 4 lựa chọn (ABCD)</option>
                  <option value="MCQ_MULTIPLE">Trắc nghiệm nhiều lựa chọn (ABCD)</option>
                  <option value="MATCHING">Nối cột (Ghép đôi)</option>
                  <option value="ORDERING">Sắp xếp theo thứ tự</option>
                  <option value="SENTENCE_SCRAMBLE">Xếp từ thành câu</option>
                  <option value="WORD_CLASSIFY">Phân loại từ</option>
                  <option value="FILL_IN_PASSAGE">Điền vào đoạn văn</option>
                  <option value="INLINE_DROPDOWN">Trắc nghiệm thả xuống (Inline Dropdown)</option>
                  <option value="DRAG_DROP">Kéo thả / Điền khuyết</option>
                  <option value="SHORT_ANSWER">Tự luận ngắn</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-350 mb-1">Mức độ (khớp cấu hình chung)</label>
                <select
                  value={difficulty} disabled
                  className="w-full border border-gray-300 dark:border-slate-800 rounded-lg p-2 text-sm bg-gray-100 dark:bg-slate-900 text-gray-500 dark:text-slate-400"
                >
                  <option value="NHAN_BIET">Mức 1 (Nhận biết)</option>
                  <option value="KET_NOI">Mức 2 (Kết nối)</option>
                  <option value="VAN_DUNG">Mức 3 (Vận dụng)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-350 mb-1">Số lượng câu</label>
                <input
                  type="number" min="1" max="20"
                  value={aiCount} onChange={e => setAiCount(Number(e.target.value))}
                  className="w-full border border-gray-300 dark:border-slate-800 rounded-lg p-2 text-sm bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <GraduationCap className="h-3 w-3" /> Mẫu chỉ dẫn AI (Prompt sẵn)
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[
                  { label: '🧒 Thân thiện HS', prompt: 'Dùng ngôn ngữ vui tươi, thân thiện, phù hợp với học sinh tiểu học. Sử dụng các tình huống gần gũi trong cuộc sống hàng ngày.' },
                  { label: '🎯 Bẫy sai phổ biến', prompt: 'Tập trung vào các lỗi sai thường gặp của học sinh. Đáp án sai (distractors) phải là những lỗi tính toán mà hay mắc phải.' },
                  { label: '📖 Theo SGK', prompt: 'Bám sát nội dung sách giáo khoa hiện hành. Dùng ví dụ và thuật ngữ giống SGK.' },
                  { label: '🌟 Thực tiễn', prompt: 'Tạo câu hỏi gắn với tình huống thực tế: đi chợ, đo đạc sân trường, chia bánh... để HS thấy toán học hữu ích.' },
                  { label: '🔢 Tính nhẩm', prompt: 'Tạo các bài tập rèn kỹ năng tính nhẩm nhanh, không cần nháp. Số liệu đơn giản, ưu tiên phép tính.' },
                ].map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => setAiCustomPrompt(aiCustomPrompt ? `${aiCustomPrompt}\n${tpl.prompt}` : tpl.prompt)}
                    className="px-2 py-1 text-xs bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/30 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                    title={tpl.prompt}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <MessageSquarePlus className="h-3 w-3" /> Yêu cầu khác (Cá nhân hóa)
              </label>
              <textarea
                value={aiCustomPrompt} onChange={e => setAiCustomPrompt(e.target.value)}
                placeholder="VD: Hãy dùng tên các nhân vật trong truyện Doraemon. Tập trung vào các lỗi sai thường gặp..."
                className="w-full h-24 border border-gray-300 dark:border-slate-800 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isProcessing || !topic.trim()}
              className={`w-full py-3 rounded-lg text-sm font-bold text-white transition-all flex items-center justify-center gap-2
                      ${isProcessing ? 'bg-gray-400' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg'}
                      `}
            >
              {isProcessing ? 'AI đang viết bài tập...' : <><Sparkles className="h-4 w-4" /> Tạo câu hỏi ngay</>}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

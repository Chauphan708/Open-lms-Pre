import React from 'react';
import { Wand2, Sparkles, FileText, GraduationCap, MessageSquarePlus } from 'lucide-react';
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
}

export const ExamContentInput: React.FC<ExamContentInputProps> = ({
  mode, rawText, setRawText, aiQuestionType, setAiQuestionType,
  aiCount, setAiCount, aiCustomPrompt, setAiCustomPrompt,
  isProcessing, topic, grade, difficulty,
  handleParseLocal, handleParseAI, handleGenerate
}) => {
  return (
    <div className="flex-1 bg-white p-5 rounded-xl border shadow-sm flex flex-col">
      {mode === 'PARSE' && (
        <>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
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

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-2 text-xs text-blue-700 space-y-1">
            <p className="font-bold">📋 Hướng dẫn format nhập liệu:</p>
            <p>• Mỗi câu bắt đầu bằng: <code className="bg-blue-100 px-1 rounded">Câu 1:</code> hoặc <code className="bg-blue-100 px-1 rounded">Bài 1:</code></p>
            <p>• Mức độ (tùy chọn): <code className="bg-blue-100 px-1 rounded">Mức độ: Nhận biết</code>, <code className="bg-blue-100 px-1 rounded">Kết nối</code>, <code>Vận dụng</code></p>
            <p>• Đáp án: <code className="bg-blue-100 px-1 rounded">A.</code> <code className="bg-blue-100 px-1 rounded">B.</code> <code className="bg-blue-100 px-1 rounded">C.</code> <code className="bg-blue-100 px-1 rounded">D.</code> (mỗi đáp án 1 dòng)</p>
            <p>• Đáp án đúng: <code className="bg-blue-100 px-1 rounded">Đáp án: B</code></p>
            <p>• Lời giải: <code className="bg-blue-100 px-1 rounded">Giải thích:</code> hoặc <code className="bg-blue-100 px-1 rounded">Hướng dẫn:</code></p>
            <p className="text-blue-500 italic">💡 AI sẽ tự động nhận dạng cả khi format không chuẩn.</p>
          </div>

          <textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder={`Dán nội dung từ Word/PDF vào đây...\n\nVí dụ:\nCâu 1: 1+1=?\nMức độ: Nhận biết\nA. 1\nB. 2\nC. 3\nD. 4\nĐáp án: B`}
            className="flex-1 w-full border border-gray-300 rounded-lg p-3 font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-white text-gray-900"
            style={{ minHeight: '500px' }}
          />
        </>
      )}

      {mode === 'GENERATE' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" /> AI Tạo bài tập (Thông minh)
            </h3>
          </div>

          <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 mb-4 flex items-center gap-3 text-sm text-purple-800">
            <div className="flex items-center gap-1">
              <GraduationCap className="h-4 w-4" /> Khối lớp sẽ được lấy tự động từ Cấu hình chung ({grade})
            </div>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại câu hỏi</label>
                <select
                  value={aiQuestionType} onChange={e => setAiQuestionType(e.target.value as QuestionType)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white text-gray-900"
                >
                  <option value="MCQ">Trắc nghiệm 4 lựa chọn (ABCD)</option>
                  <option value="MCQ_MULTIPLE">Trắc nghiệm nhiều lựa chọn (ABCD)</option>
                  <option value="MATCHING">Nối cột (Ghép đôi)</option>
                  <option value="ORDERING">Sắp xếp theo thứ tự</option>
                  <option value="DRAG_DROP">Kéo thả / Điền khuyết</option>
                  <option value="SHORT_ANSWER">Tự luận ngắn</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ (khớp cấu hình chung)</label>
                <select
                  value={difficulty} disabled
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-100 text-gray-500"
                >
                  <option value="NHAN_BIET">Mức 1 (Nhận biết)</option>
                  <option value="KET_NOI">Mức 2 (Kết nối)</option>
                  <option value="VAN_DUNG">Mức 3 (Vận dụng)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng câu</label>
                <input
                  type="number" min="1" max="20"
                  value={aiCount} onChange={e => setAiCount(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white text-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
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
                    className="px-2 py-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-full hover:bg-purple-100 transition-colors"
                    title={tpl.prompt}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <MessageSquarePlus className="h-3 w-3" /> Yêu cầu khác (Cá nhân hóa)
              </label>
              <textarea
                value={aiCustomPrompt} onChange={e => setAiCustomPrompt(e.target.value)}
                placeholder="VD: Hãy dùng tên các nhân vật trong truyện Doraemon. Tập trung vào các lỗi sai thường gặp..."
                className="w-full h-24 border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none bg-white text-gray-900"
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

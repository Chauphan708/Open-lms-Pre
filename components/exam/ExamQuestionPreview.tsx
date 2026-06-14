import React from 'react';
import { Plus, Trash2, Edit2, FilePlus, BrainCircuit, Lightbulb, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Question, QuestionType, ExamDifficulty } from '../../types';

export interface ExamQuestionPreviewProps {
  questions: Question[];
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  openEditModal: (q: Question) => void;
  removeQuestion: (id: string) => void;
  addManualQuestion: () => void;
}

export const ExamQuestionPreview: React.FC<ExamQuestionPreviewProps> = ({
  questions, setQuestions, openEditModal, removeQuestion, addManualQuestion
}) => {
  const getTypeLabel = (type: QuestionType) => {
    switch (type) {
      case 'MCQ': return 'Trắc nghiệm (ABCD)';
      case 'MCQ_MULTIPLE': return 'Trắc nghiệm (Nhiều lựa chọn)';
      case 'MATCHING': return 'Nối cột';
      case 'ORDERING': return 'Sắp xếp';
      case 'DRAG_DROP': return 'Kéo thả / Điền khuyết';
      case 'SHORT_ANSWER': return 'Tự luận ngắn';
      default: return type;
    }
  };

  return (
    <>
      <div className="p-4 border-b bg-white flex justify-between items-center rounded-t-xl">
        <h3 className="font-bold text-gray-700">Xem trước ({questions.length} câu)</h3>
        <button onClick={addManualQuestion} className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1">
          <Plus className="h-3 w-3" /> Thêm thủ công
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {questions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <FilePlus className="h-16 w-16 mb-4 opacity-30" />
            <p className="font-medium">Chưa có câu hỏi nào.</p>
            <p className="text-sm mt-1">Hãy nhập nội dung bên trái để bắt đầu.</p>
          </div>
        ) : (
          questions.map((q, idx) => (
            <div key={q.id} className="bg-white border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow relative group">
              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  onClick={() => openEditModal(q)}
                  className="text-gray-300 hover:text-indigo-600 transition-colors"
                  title="Chỉnh sửa"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => removeQuestion(q.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors"
                  title="Xóa"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center font-bold text-indigo-600 text-sm">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2 pr-16">
                    <div className="flex-1">
                      <div className="text-gray-900 font-medium text-base whitespace-pre-wrap prose prose-p:my-0">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {q.content}
                        </ReactMarkdown>
                      </div>
                      {q.imageUrl && (
                        <img 
                          src={q.imageUrl} 
                          alt="Question" 
                          className="mt-3 max-w-full h-auto rounded-lg border border-gray-200 max-h-64 object-contain" 
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {q.isNotScored && (
                        <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200 uppercase whitespace-nowrap font-bold">
                          Không tính điểm
                        </span>
                      )}
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded border uppercase whitespace-nowrap">
                        {getTypeLabel(q.type)}
                      </span>
                      <select
                        value={q.level || ''}
                        onChange={(e) => {
                          const newLevel = e.target.value as any;
                          setQuestions(prev => prev.map(item => 
                            item.id === q.id ? { ...item, level: newLevel || undefined } : item
                          ));
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded border uppercase font-medium outline-none cursor-pointer appearance-none ${
                            q.level === 'NHAN_BIET' ? 'bg-green-100 text-green-700 border-green-200' :
                            q.level === 'KET_NOI' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                            q.level === 'VAN_DUNG' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                            'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        <option value="">-- Mức độ --</option>
                        <option value="NHAN_BIET">Nhận biết</option>
                        <option value="KET_NOI">Kết nối</option>
                        <option value="VAN_DUNG">Vận dụng</option>
                      </select>
                    </div>
                  </div>

                  {(q.type === 'MCQ' || q.type === 'MCQ_MULTIPLE') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      {q.options.map((opt, i) => (
                        <div
                          key={i}
                          className={`p-2.5 rounded-lg border text-sm flex items-center gap-3 transition-colors
                            ${(q.type === 'MCQ' && q.correctOptionIndex === i) || (q.type === 'MCQ_MULTIPLE' && q.correctOptionIndices?.includes(i)) ? 'bg-green-50 border-green-200 text-green-900' : 'bg-white border-gray-200 text-gray-600'}
                          `}
                        >
                          <span className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold ${(q.type === 'MCQ' && q.correctOptionIndex === i) || (q.type === 'MCQ_MULTIPLE' && q.correctOptionIndices?.includes(i)) ? 'bg-green-200 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="prose prose-p:my-0">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {opt}
                            </ReactMarkdown>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === 'MATCHING' && (
                    <div className="mt-3 space-y-2">
                      {q.options.map((opt, i) => {
                        const [left, right] = opt.split('|||');
                        return (
                            <div key={i} className="p-2.5 rounded-lg border bg-blue-50/30 border-blue-100 text-sm flex items-center gap-3">
                              <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded bg-blue-100 text-blue-700 text-xs font-bold">
                                {i + 1}
                              </span>
                              <div className="flex-1 flex items-center gap-4">
                                <div className="flex-1 text-gray-800">
                                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{left?.trim() || ''}</ReactMarkdown>
                                </div>
                                <div className="text-blue-400">
                                    <ArrowRight className="h-4 w-4" />
                                </div>
                                <div className="flex-1 text-gray-800">
                                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{right?.trim() || ''}</ReactMarkdown>
                                </div>
                              </div>
                            </div>
                        );
                      })}
                    </div>
                  )}

                  {['ORDERING', 'DRAG_DROP'].includes(q.type) && (
                    <div className="mt-3 space-y-2">
                      {q.options.map((opt, i) => (
                        <div key={i} className="p-2.5 rounded-lg border bg-gray-50 border-gray-200 text-sm flex items-center gap-3">
                          <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded bg-gray-200 text-gray-700 text-xs font-bold">
                            {i + 1}
                          </span>
                          <span className="prose prose-p:my-0 text-gray-800">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {opt}
                            </ReactMarkdown>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === 'SHORT_ANSWER' && (
                    <div className="mt-3 space-y-2">
                      <div className="p-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500 italic">
                        Học sinh sẽ trả lời bằng đoạn văn bản vào ô nhập liệu ở phần thi.
                      </div>
                      {q.options && q.options.length > 0 && (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-xs font-bold text-green-700 mb-2">✅ Đáp án chấm tự động ({q.options.length}):</p>
                          <div className="flex flex-wrap gap-2">
                            {q.options.map((ans, i) => (
                              <span key={i} className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full border border-green-200">
                                {ans}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {(q.solution || q.hint) && (
                    <div className="mt-4 space-y-2">
                      {q.hint && (
                        <div className="p-3 bg-orange-50 rounded-lg border border-orange-100 text-sm text-orange-800 flex gap-2 items-start">
                          <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <div className="prose prose-sm prose-p:my-0 text-orange-800">
                            <strong>Gợi ý: </strong>
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {q.hint}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                      {q.solution && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-800 flex gap-2 items-start">
                          <BrainCircuit className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <div className="prose prose-sm prose-p:my-0 text-blue-800">
                            <strong>Đáp án/Lời giải: </strong>
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {q.solution}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
};

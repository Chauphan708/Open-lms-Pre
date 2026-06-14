import React, { useState, useCallback } from 'react';
import { Trash2, X, Image as ImageIcon, AlertTriangle, ExternalLink } from 'lucide-react';
import { Question, QuestionType, ExamDifficulty } from '../../types';

export interface ExamQuestionEditModalProps {
  editingQuestion: Question;
  setEditingQuestion: (q: Question | null) => void;
  saveEditedQuestion: () => void;
}

/**
 * Convert popular image hosting page URLs to direct image URLs.
 * Many users paste the "share" link (webpage) instead of the direct image link.
 */
function convertToDirectImageUrl(url: string): string {
  if (!url) return url;
  const trimmed = url.trim();

  // ibb.co: https://ibb.co/xxxxx -> https://i.ibb.co/xxxxx/image.png (not reliable)
  // Best approach: try adding .png or use the i.ibb.co format
  // ibb.co page links like https://ibb.co/ymQG7dq4 don't work as img src
  // The direct link format is https://i.ibb.co/{id}/{filename}
  // Since we can't know the filename, we try the /i.ibb.co redirect
  const ibbMatch = trimmed.match(/^https?:\/\/ibb\.co\/([a-zA-Z0-9]+)\/?$/);
  if (ibbMatch) {
    return `https://i.ibb.co/${ibbMatch[1]}/image.png`;
  }

  // Imgur: https://imgur.com/xxxxx -> https://i.imgur.com/xxxxx.png
  const imgurMatch = trimmed.match(/^https?:\/\/imgur\.com\/([a-zA-Z0-9]+)\/?$/);
  if (imgurMatch) {
    return `https://i.imgur.com/${imgurMatch[1]}.png`;
  }

  // Imgur album/gallery link: https://imgur.com/a/xxxxx (can't convert, keep as-is)

  // Google Drive: https://drive.google.com/file/d/{id}/view -> direct download link
  const driveMatch = trimmed.match(/^https?:\/\/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) {
    return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
  }

  // Dropbox: change dl=0 to dl=1
  if (trimmed.includes('dropbox.com') && trimmed.includes('dl=0')) {
    return trimmed.replace('dl=0', 'raw=1');
  }

  return trimmed;
}

export const ExamQuestionEditModal: React.FC<ExamQuestionEditModalProps> = ({
  editingQuestion, setEditingQuestion, saveEditedQuestion
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageUrlChange = useCallback((rawUrl: string) => {
    setImageError(false);
    setImageLoaded(false);
    const directUrl = convertToDirectImageUrl(rawUrl);
    setEditingQuestion({ ...editingQuestion, imageUrl: directUrl });
  }, [editingQuestion, setEditingQuestion]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="font-bold text-lg text-gray-800">Chỉnh sửa câu hỏi</h3>
          <button onClick={() => setEditingQuestion(null)} className="hover:bg-gray-100 p-2 rounded-full"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nội dung câu hỏi</label>
            <textarea
              value={editingQuestion.content}
              onChange={e => setEditingQuestion({ ...editingQuestion, content: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none h-24"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Loại câu hỏi</label>
              <select
                value={editingQuestion.type}
                onChange={e => {
                  const newType = e.target.value as QuestionType;
                  let newOpts = [...editingQuestion.options];
                  let newIdx = editingQuestion.correctOptionIndex;
                  let newIndices = editingQuestion.correctOptionIndices;

                  if ((newType === 'MCQ' || newType === 'MCQ_MULTIPLE') && newOpts.length === 0) {
                    newOpts = ['A', 'B', 'C', 'D'];
                    if (newType === 'MCQ') newIdx = 0;
                    if (newType === 'MCQ_MULTIPLE') newIndices = [0];
                  } else if (newType === 'SHORT_ANSWER') {
                    newOpts = [];
                    newIdx = undefined;
                    newIndices = undefined;
                  }

                  setEditingQuestion({
                    ...editingQuestion,
                    type: newType,
                    options: newOpts,
                    correctOptionIndex: newIdx,
                    correctOptionIndices: newIndices
                  });
                }}
                className="w-full border border-gray-300 rounded-lg p-3 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              >
                <option value="MCQ">Trắc nghiệm (ABCD)</option>
                <option value="MCQ_MULTIPLE">Trắc nghiệm nhiều lựa chọn (ABCD)</option>
                <option value="MATCHING">Nối cột (Trái ||| Phải)</option>
                <option value="ORDERING">Sắp xếp thứ tự đúng</option>
                <option value="DRAG_DROP">Kéo thả / Điền khuyết</option>
                <option value="SHORT_ANSWER">Tự luận ngắn</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> Link ảnh minh họa (Tùy chọn)
              </label>
              <input
                type="text"
                value={editingQuestion.imageUrl || ''}
                onChange={e => handleImageUrlChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                placeholder="https://i.ibb.co/xxxxx/image.png"
              />
              <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                <ExternalLink className="h-3 w-3" /> Dùng link trực tiếp đến ảnh (đuôi .jpg, .png, .webp). Link ibb.co, imgur sẽ tự chuyển đổi.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Mức độ (Tùy chọn)</label>
              <select
                value={editingQuestion.level || ''}
                onChange={e => setEditingQuestion({ ...editingQuestion, level: (e.target.value as ExamDifficulty) || undefined })}
                className="w-full border border-gray-300 rounded-lg p-3 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              >
                <option value="NHAN_BIET">Mức 1 (Nhận biết)</option>
                <option value="KET_NOI">Mức 2 (Kết nối)</option>
                <option value="VAN_DUNG">Mức 3 (Vận dụng)</option>
              </select>
            </div>
            
            <div className="flex items-center mt-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={!!editingQuestion.isNotScored} 
                  onChange={e => setEditingQuestion({ ...editingQuestion, isNotScored: e.target.checked })} 
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" 
                />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900">Không tính điểm phần này</span>
                  <span className="text-[10px] text-gray-500 italic block mt-0.5">Dành cho câu hỏi khảo sát, thu thập thông tin</span>
                </div>
              </label>
            </div>
          </div>

          {editingQuestion.imageUrl && (
            <div className="mt-2 p-2 border rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500 mb-1">Xem trước:</p>
              {imageError ? (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-red-700">Không tải được ảnh!</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      Hãy dùng link ảnh trực tiếp (đuôi .jpg, .png, .webp). 
                      Nếu dùng ibb.co, hãy bấm vào ảnh rồi copy link ảnh (chuột phải → "Copy image address").
                    </p>
                  </div>
                </div>
              ) : (
                <img 
                  src={editingQuestion.imageUrl} 
                  alt="Preview" 
                  className={`h-32 object-contain rounded border bg-white transition-opacity ${imageLoaded ? 'opacity-100' : 'opacity-30'}`}
                  onLoad={() => setImageLoaded(true)} 
                  onError={() => setImageError(true)} 
                />
              )}
            </div>
          )}

          {(editingQuestion.type === 'MCQ' || editingQuestion.type === 'MCQ_MULTIPLE') && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center justify-between">
                Các lựa chọn
                <button onClick={() => setEditingQuestion({ ...editingQuestion, options: [...editingQuestion.options, 'Lựa chọn mới'] })} className="text-xs text-indigo-600 font-medium hover:underline">+ Thêm tùy chọn</button>
              </label>
              {editingQuestion.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2 mb-2 group">
                  {editingQuestion.type === 'MCQ_MULTIPLE' ? (
                    <input
                      type="checkbox"
                      checked={editingQuestion.correctOptionIndices?.includes(i) || false}
                      onChange={(e) => {
                        const currentIndices = editingQuestion.correctOptionIndices || [];
                        let newIndices;
                        if (e.target.checked) {
                          newIndices = [...currentIndices, i];
                        } else {
                          newIndices = currentIndices.filter(idx => idx !== i);
                        }
                        setEditingQuestion({ ...editingQuestion, correctOptionIndices: newIndices });
                      }}
                      className="w-4 h-4 text-green-600 focus:ring-green-500 cursor-pointer rounded"
                      title="Đánh dấu đáp án đúng"
                    />
                  ) : (
                    <input
                      type="radio"
                      name="correctOpt"
                      checked={editingQuestion.correctOptionIndex === i}
                      onChange={() => setEditingQuestion({ ...editingQuestion, correctOptionIndex: i })}
                      className="w-4 h-4 text-green-600 focus:ring-green-500 cursor-pointer"
                      title="Đánh dấu đáp án đúng"
                    />
                  )}
                  <span className="font-bold w-6 text-gray-500 text-center">{String.fromCharCode(65 + i)}</span>
                  <input
                    value={opt}
                    onChange={e => {
                      const newOpts = [...editingQuestion.options];
                      newOpts[i] = e.target.value;
                      setEditingQuestion({ ...editingQuestion, options: newOpts });
                    }}
                    className="flex-1 border border-gray-300 rounded-lg p-2 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button onClick={() => {
                    const newOpts = [...editingQuestion.options];
                    newOpts.splice(i, 1);
                    let newIdx = editingQuestion.correctOptionIndex;
                    let newIndices = editingQuestion.correctOptionIndices;
                    
                    if (newIdx === i) newIdx = 0;
                    else if (newIdx !== undefined && newIdx > i) newIdx--;

                    if (newIndices && newIndices.length > 0) {
                      newIndices = newIndices.filter(idx => idx !== i).map(idx => idx > i ? idx - 1 : idx);
                    }

                    setEditingQuestion({ ...editingQuestion, options: newOpts, correctOptionIndex: newIdx, correctOptionIndices: newIndices });
                  }} className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {['MATCHING', 'ORDERING', 'DRAG_DROP'].includes(editingQuestion.type) && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center justify-between">
                {editingQuestion.type === 'MATCHING' && "Các cặp nối (Format: Nửa trái ||| Nửa phải)"}
                {editingQuestion.type === 'ORDERING' && "Các mục cần sắp xếp (Nhập theo thứ tự ĐÚNG)"}
                {editingQuestion.type === 'DRAG_DROP' && "Các từ/phần điền khuyết (Bao gồm cả đáp án đúng và gây nhiễu)"}
                <button onClick={() => setEditingQuestion({ ...editingQuestion, options: [...editingQuestion.options, editingQuestion.type === 'MATCHING' ? 'Vế Trái ||| Vế Phải' : 'Mục mới'] })} className="text-xs text-indigo-600 font-medium hover:underline">+ Thêm mục</button>
              </label>
              {editingQuestion.type === 'DRAG_DROP' && (
                <p className="text-xs text-gray-500 mb-2 italic">Ghi chú: Trong phần "Nội dung câu hỏi" ở trên, dùng <code className="bg-gray-100 px-1 rounded">[__]</code> để đánh dấu ô trống học sinh cần kéo thả/điền chữ vào.</p>
              )}
              {editingQuestion.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2 mb-2 group">
                  <span className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">{i + 1}</span>
                  <input
                    value={opt}
                    onChange={e => {
                      const newOpts = [...editingQuestion.options];
                      newOpts[i] = e.target.value;
                      setEditingQuestion({ ...editingQuestion, options: newOpts });
                    }}
                    className="flex-1 border border-gray-300 rounded-lg p-2 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button onClick={() => {
                    const newOpts = [...editingQuestion.options];
                    newOpts.splice(i, 1);
                    setEditingQuestion({ ...editingQuestion, options: newOpts });
                  }} className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {editingQuestion.type === 'SHORT_ANSWER' && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center justify-between">
                Các đáp án đúng được chấp nhận (Dùng cho máy chấm tự động)
                <button onClick={() => setEditingQuestion({ ...editingQuestion, options: [...editingQuestion.options, 'Đáp án'] })} className="text-xs text-indigo-600 font-medium hover:underline">+ Thêm đáp án</button>
              </label>
              <p className="text-xs text-gray-500 mb-2 italic">Hệ thống sẽ lấy danh sách này để so khớp tự động. Nếu trống, máy sẽ so khớp với nội dung Lời giải chi tiết.</p>
              {editingQuestion.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2 mb-2 group">
                  <span className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">{i + 1}</span>
                  <input
                    value={opt}
                    onChange={e => {
                      const newOpts = [...editingQuestion.options];
                      newOpts[i] = e.target.value;
                      setEditingQuestion({ ...editingQuestion, options: newOpts });
                    }}
                    placeholder="Nhập 1 đáp án được chấp nhận (VD: 3300)"
                    className="flex-1 border border-indigo-300 rounded-lg p-2 bg-indigo-50 text-indigo-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button onClick={() => {
                    const newOpts = [...editingQuestion.options];
                    newOpts.splice(i, 1);
                    setEditingQuestion({ ...editingQuestion, options: newOpts });
                  }} className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {editingQuestion.options.length === 0 && (
                <div className="p-3 bg-yellow-50 text-yellow-800 text-sm rounded-lg border border-yellow-200">
                  Chưa có đáp án tự động nào. Hãy "Thêm đáp án" để máy chấm chính xác.
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Gợi ý (Cách làm)</label>
              <textarea
                value={editingQuestion.hint || ''}
                onChange={e => setEditingQuestion({ ...editingQuestion, hint: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-3 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none h-24 text-sm"
                placeholder="Hướng dẫn phương pháp giải..."
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Lời giải chi tiết</label>
              <textarea
                value={editingQuestion.solution || ''}
                onChange={e => setEditingQuestion({ ...editingQuestion, solution: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-3 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none h-24 text-sm"
                placeholder="Các bước giải chi tiết..."
              />
            </div>
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-2 bg-gray-50 rounded-b-xl">
          <button onClick={() => setEditingQuestion(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">Hủy</button>
          <button onClick={saveEditedQuestion} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Lưu thay đổi</button>
        </div>
      </div>
    </div>
  );
};

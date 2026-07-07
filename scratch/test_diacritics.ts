import { parseQuestionsLocal } from '../utils/localParser';

const testCases = [
  {
    name: '1. Định dạng hashtag mới (#...) có chứa ký tự dấu phụ',
    input: `Câu 1: Xếp các cụm từ vào nhóm thích hợp để giải thích mối quan hệ ngữ nghĩa của từ bụng:
Từ bụng trong bụng trống mang nghĩa chuyển dựa trên sự tương đồng về [__] với bụng người.
Cả người và bụng trống đều có đặc điểm [__] ở giữa.
Tuy nhiên, bụng người dùng để tiêu hóa thức ăn, còn bụng trống thì [__] bên trong để tạo âm vang.

#loại câu hỏi# Kéo thả - DRAG_DROP
#mức độ# Thông hiểu
A. hình dáng
B\u0323. phình to
C\u0327. rỗng tuếch
D. chức năng
E. màu sắc
F\u0323. độ nhọn
#đáp án# A, B\u0323, C\u0327, còn lại D, E, F\u0323 là từ nhiễu.
#gợi ý# Hãy đối chiếu sự giống nhau về hình thức phình to của cái bụng trống với bụng của người.
#lời giải# Bụng trống được chuyển nghĩa dựa trên tương đồng hình dáng (A). Cả hai đều có đặc điểm phình to ở giữa (B). Điểm khác biệt là bụng người chứa cơ quan tiêu hóa còn bụng trống thì rỗng tuếch (C) để tạo độ vang âm thanh.`,
    expectedType: 'DRAG_DROP',
    expectedOptionsCount: 6,
    expectedCorrectIndices: [0, 1, 2],
    expectedHasBlanks: true,
  },
  {
    name: '2. Định dạng cũ (Legacy) để đảm bảo tương thích ngược',
    input: `Câu 2: Trái Đất quay quanh Mặt Trời mất bao nhiêu ngày?
Mức độ: Nhận biết
A. 360 ngày
B. 365 ngày
C. 366 ngày
Đáp án: B
Hướng dẫn: Trái Đất quay quanh Mặt Trời mất khoảng 365 ngày để hoàn thành một vòng quay.`,
    expectedType: 'MCQ',
    expectedOptionsCount: 3,
    expectedCorrectIndices: [1],
    expectedHasBlanks: false,
  }
];

console.log('--- CHẠY KIỂM THỬ BỘ PHÂN TÍCH LOCAL ---');

testCases.forEach((tc, idx) => {
  console.log(`\nCase ${idx + 1}: ${tc.name}`);
  const questions = parseQuestionsLocal(tc.input);
  if (questions.length === 0) {
    console.error('❌ Thất bại: Không phân tích được câu hỏi nào.');
    process.exit(1);
  }
  const q = questions[0];
  
  // Verify Question Type
  if (q.type !== tc.expectedType) {
    console.error(`❌ Thất bại: Loại câu hỏi sai. Mong muốn: ${tc.expectedType}, Nhận được: ${q.type}`);
    process.exit(1);
  }
  
  // Verify Options count
  if (q.options.length !== tc.expectedOptionsCount) {
    console.error(`❌ Thất bại: Số lựa chọn sai. Mong muốn: ${tc.expectedOptionsCount}, Nhận được: ${q.options.length}`);
    process.exit(1);
  }
  
  // Verify Correct Indices
  const correctIndicesStr = JSON.stringify(q.correctOptionIndices || (q.correctOptionIndex !== undefined ? [q.correctOptionIndex] : []));
  const expectedIndicesStr = JSON.stringify(tc.expectedCorrectIndices);
  if (correctIndicesStr !== expectedIndicesStr) {
    console.error(`❌ Thất bại: Chỉ số đáp án đúng sai. Mong muốn: ${expectedIndicesStr}, Nhận được: ${correctIndicesStr}`);
    process.exit(1);
  }

  // Verify Blanks in content (for DRAG_DROP)
  if (tc.expectedHasBlanks && !q.content.includes('[__]')) {
    console.error(`❌ Thất bại: Nội dung câu hỏi bị cắt cụt, không chứa các ô trống [__].\nContent: "${q.content}"`);
    process.exit(1);
  }
  
  console.log('✅ Thành công!');
  console.log(`  - Loại: ${q.type}`);
  console.log(`  - Số lựa chọn: ${q.options.length}`);
  console.log(`  - Đáp án đúng: ${correctIndicesStr}`);
  console.log(`  - Độ dài nội dung: ${q.content.length} ký tự`);
  console.log(`  - Lời giải: "${(q.solution || '').slice(0, 50)}..."`);
});

console.log('\n🎉 TẤT CẢ CÁC CA KIỂM THỬ ĐÃ THÀNH CÔNG RỰC RỠ!');

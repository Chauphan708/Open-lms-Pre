import { GoogleGenAI, Type } from "@google/genai";
import fs from 'fs';

const GEMINI_KEY_STORAGE = 'gemini_api_key';

// In Node env, read from process.env since we don't have localStorage
const apiKey = process.env.VITE_API_KEY || process.env.API_KEY || "";
if (!apiKey) {
    console.error("Please set VITE_API_KEY or API_KEY environment variable.");
    process.exit(1);
}
const ai = new GoogleGenAI({ apiKey });

const prompt = `
Bạn là một giáo viên Tiểu học dạy giỏi Toán lớp 4 tại Việt Nam.
Nhiệm vụ của bạn là soạn bộ câu hỏi gồm 40 câu hỏi trắc nghiệm và tự luận ngắn từ Chương trình Toán 4 Tập 1.
Chủ đề: "Ôn tập các phép tính trong phạm vi 100 000" và "Biểu thức số", "Giải toán có ba bước tính".

Hãy tuân thủ CHÍNH XÁC cơ cấu số lượng và mức độ sau:
- Mức 1 (Nhận biết): 13 câu
- Mức 2 (Kết nối): 11 câu
- Mức 3 (Vận dụng): 9 câu
- Mức nâng cao (Vận dụng cao - Hãy tìm kiếm hoặc tự sáng tạo các bài toán hay, phức tạp cùng chủ đề): 7 câu

Dạng câu hỏi được phân bổ:
- Trắc nghiệm 1 đáp án (MCQ)
- Trắc nghiệm nhiều đáp án (MCQ_MULTIPLE) - Với các câu này, thêm "(chọn nhiều đáp án)" vào cuối câu hỏi.
- Tự luận ngắn (SHORT_ANSWER)

YÊU CẦU ĐỊNH DẠNG:
Từng câu hỏi trả về phải tuân thủ định dạng chuỗi text thuần túy (không được dùng in đậm ** hay * cho các tiêu đề/nhãn như "Câu 1:", "Mức độ:", "Đáp án:", "Hướng dẫn:", "Độ khó:", "Thời gian:", "XP:", "chủ đề:", "Môn:").
Xuống dòng cách nhau đúng 1 line, không bỏ dòng trống giữa các trường của một câu hỏi.
Toàn bộ biểu thức toán học, phân số, phép tính phải bọc trong kí tự $ (LaTeX), số thập phân dùng dấu phẩy bọc ngoặc nhọn VD: 2{,}5. Khoảng cách số và đơn vị đo phải có dấu cách, VD: 4,3 m. Số lớn hơn 1000 dùng khoảng trắng ngăn cách lớp số, VD: 36 782.
Cấm bài tập tìm x (thay bằng điền số vào ô vuông hoặc dấu ...).
Mỗi câu hỏi phải có phần "Hướng dẫn: Gợi ý: [Chỉ gợi ý cách làm, không cho biết đáp án]. Lời giải chi tiết: [Trình bày chi tiết các bước tính và đáp án cuối cùng]".

Hãy sinh ra danh sách câu hỏi dạng văn bản thuần túy theo đúng format này. Đặt một đoạn tóm tắt ngắn ở đầu tiên.
Bắt đầu soạn đề:
`;

async function run() {
    try {
        console.log("Generating 40 questions...");
        // Split into 2 API calls if needed, or ask for a very long response using gemini-2.0-flash
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-lite",
            contents: prompt,
            config: {
                maxOutputTokens: 8192
            }
        });
        
        fs.writeFileSync('E:/antigravity_projects/ptchau1708/Open-lms-Pre/scratch/result_questions.txt', response.text || "");
        console.log("Completed! Saved to scratch/result_questions.txt");
    } catch (e) {
        console.error(e);
    }
}

run();

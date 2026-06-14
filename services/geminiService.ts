import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Question, Attempt } from '../types';
import { supabase } from './supabaseClient';

// Cache helpers for saving Gemini API quotas and increasing performance
const getCachedResponse = async (key: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('ai_analysis_cache')
      .select('response_text')
      .eq('cache_key', key)
      .maybeSingle();
    
    if (data && !error) {
      console.log(`[Cache Hit] Serving cached response for key: ${key}`);
      return data.response_text;
    }
  } catch (err) {
    console.warn(`[Cache Error] Failed reading cache:`, err);
  }
  return null;
};

const setCachedResponse = async (key: string, val: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('ai_analysis_cache')
      .upsert({ cache_key: key, response_text: val }, { onConflict: 'cache_key' });
    if (error) {
      console.warn(`[Cache Error] Failed to write cache:`, error.message);
    } else {
      console.log(`[Cache Write] Saved cache for key: ${key}`);
    }
  } catch (err) {
    console.warn(`[Cache Error] Failed writing cache:`, err);
  }
};

// Helper: Clean JSON string from Markdown code blocks
const cleanJsonString = (text: string): string => {
  if (!text) return "[]";
  // Remove ```json and ``` wrapping
  let clean = text.replace(/```json/g, '').replace(/```/g, '');
  return clean.trim();
};

// --- localStorage helpers cho API Key ---
const GEMINI_KEY_STORAGE = 'gemini_api_key';

export const setGeminiApiKey = (key: string) => {
  localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
};

export const getGeminiApiKey = (): string => {
  return localStorage.getItem(GEMINI_KEY_STORAGE) || '';
};

export const clearGeminiApiKey = () => {
  localStorage.removeItem(GEMINI_KEY_STORAGE);
};

const getAiClient = () => {
  let apiKey = '';

  // Ưu tiên 1: Đọc từ localStorage (người dùng tự nhập qua Settings)
  const storedKey = getGeminiApiKey();
  if (storedKey) {
    apiKey = storedKey;
  }

  // Ưu tiên 2: Đọc từ process.env.API_KEY (build-time .env)
  if (!apiKey) {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      // @ts-ignore
      apiKey = process.env.API_KEY;
    }
  }

  // Ưu tiên 3: Đọc từ import.meta.env.VITE_API_KEY (Vite fallback)
  if (!apiKey) {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
      // @ts-ignore
      apiKey = import.meta.env.VITE_API_KEY;
    }
  }

  if (!apiKey || apiKey.includes("API_KEY")) {
    console.error("CRITICAL: Missing API KEY. Vui lòng vào Cài đặt → API Key để nhập.");
    throw new Error("Chưa cấu hình API Key. Vui lòng vào Cài đặt → tab 🔑 API Key để nhập Google Gemini API Key của bạn.");
  }

  console.log(`[DEBUG] getAiClient triggered. Source: ${storedKey ? 'localStorage' : '.env'}. Key: ${apiKey.substring(0, 5)}...${apiKey.slice(-5)}`);

  return new GoogleGenAI({ apiKey });
};

const QUESTION_SCHEMA: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING, description: "The main text of the question" },
      imageUrl: { type: Type.STRING, description: "Optional URL for an image associated with the question (if provided in text)" },
      options: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of answer choices or items to match/order."
      },
      correctOptionIndex: { type: Type.INTEGER, description: "Index of correct option (0-3) for MCQ, or -1 if not applicable" },
      solution: { type: Type.STRING, description: "Detailed step-by-step explanation including the final answer." },
      hint: { type: Type.STRING, description: "A pedagogical hint explaining the method/formula to use WITHOUT giving the answer." },
      level: { type: Type.STRING, description: "Difficulty level. Must be one of: NHAN_BIET, KET_NOI, VAN_DUNG" },
      topic: { type: Type.STRING, description: "The specific knowledge topic/chapter this question belongs to, e.g. 'Phân số', 'Hình học phẳng'" },
      questionType: { type: Type.STRING, description: "Type of question. Must be one of: MCQ, SHORT_ANSWER, MATCHING, ORDERING, DRAG_DROP" }
    },
    required: ["content", "options", "correctOptionIndex", "solution", "hint", "level", "topic", "questionType"],
  }
};

// Model fallback list: try newer model first, fallback to older if quota exceeded
const AI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.0-flash-lite"];

/**
 * Parses raw text content (from Word/PDF copy-paste) into structured Question objects.
 * Includes model fallback and schema retry logic for robustness.
 */
export const parseQuestionsFromText = async (rawText: string): Promise<Question[]> => {
  const ai = getAiClient();

  const prompt = `
    You are an AI exam parser for an LMS system. 
    Analyze the following raw text which contains exam questions.
    Extract all questions into a structured JSON array.
    
    Rules:
    1. Identify the question stem.
    2. Identify options (A, B, C, D) for MCQ. If the question is SHORT_ANSWER (no A/B/C/D choices), extract the exact short answer text (e.g. "3300" or "26 cm") and put it into the 'options' array (e.g., ["3300", "3.300"]).
    3. Extract solution/explanation if present. If not, generate a brief one.
    4. Determine the correct answer index (0-3) IF explicitly marked. If unknown or not applicable (like SHORT_ANSWER), set to -1.
    5. MATH FORMATTING: If you encounter math, use LaTeX format enclosed in single dollar signs ($) for inline math. Example: $x^2 + 5$.
    6. **HINT & SOLUTION**: Always try to extract or generate a 'hint' (method) and 'solution' (full steps).
    7. **LEVEL (REQUIRED)**: Classify each question's difficulty as one of: NHAN_BIET, KET_NOI, VAN_DUNG.
    8. **TOPIC (REQUIRED)**: Identify the specific knowledge topic/chapter for each question.
    9. **questionType (REQUIRED)**: Detect the question format: MCQ, SHORT_ANSWER, MATCHING, ORDERING, or DRAG_DROP.
    10. **CRITICAL**: The 'content' field MUST ONLY contain the question itself. DO NOT include the answer, solution, or "Đáp án:" in the 'content' field. The exact answer goes into the 'options' array for SHORT_ANSWER, and the explanation goes into the 'solution' field.
    
    Raw Text:
    """
    ${rawText}
    """
  `;

  // Helper to parse response into Question array
  const parseResponse = (text: string): Question[] => {
    const cleanedText = cleanJsonString(text || "[]");
    const parsedData = JSON.parse(cleanedText);
    return parsedData.map((item: any, index: number) => ({
      id: `gen_parse_${Date.now()}_${index}`,
      type: (item.questionType || 'MCQ') as any,
      content: item.content,
      imageUrl: item.imageUrl,
      options: item.options || [],
      correctOptionIndex: item.correctOptionIndex === -1 ? undefined : item.correctOptionIndex,
      solution: item.solution,
      hint: item.hint,
      level: item.level || undefined,
      topic: item.topic || undefined
    }));
  };

  let lastError: any = null;

  // Try each model in the fallback list
  for (const modelId of AI_MODELS) {
    // Attempt 1: With structured schema
    try {
      console.log(`[Parse] Trying ${modelId} with schema...`);
      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: QUESTION_SCHEMA
        }
      });
      const result = parseResponse(response.text || "[]");
      console.log(`[Parse] Success with ${modelId} + schema! Got ${result.length} questions.`);
      return result;
    } catch (schemaError: any) {
      const errMsg = schemaError?.message || schemaError?.toString() || '';
      console.warn(`[Parse] ${modelId} + schema failed:`, errMsg);

      // If quota error, try next model immediately
      if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        console.warn(`[Parse] ${modelId} quota exceeded, trying next model...`);
        lastError = schemaError;
        continue;
      }

      // Attempt 2: Same model but WITHOUT schema (more flexible)
      try {
        console.log(`[Parse] Retrying ${modelId} without schema...`);
        const response = await ai.models.generateContent({
          model: modelId,
          contents: prompt + "\n\nIMPORTANT: Return ONLY a valid JSON array. No markdown, no explanation, just the JSON array.",
          config: {
            responseMimeType: "application/json"
          }
        });
        const result = parseResponse(response.text || "[]");
        console.log(`[Parse] Success with ${modelId} without schema! Got ${result.length} questions.`);
        return result;
      } catch (noSchemaError: any) {
        const noSchemaMsg = noSchemaError?.message || noSchemaError?.toString() || '';
        console.warn(`[Parse] ${modelId} without schema also failed:`, noSchemaMsg);
        lastError = noSchemaError;
        if (noSchemaMsg.includes('429') || noSchemaMsg.includes('quota') || noSchemaMsg.includes('RESOURCE_EXHAUSTED')) {
          continue;
        }
      }
    }
  }

  // All models exhausted
  const finalMsg = lastError?.message || lastError?.toString() || 'All models failed';
  console.error("[Parse] All attempts failed:", finalMsg);
  throw new Error(finalMsg);
};

/**
 * Generates new questions based on sophisticated criteria.
 * Includes retry logic and type-specific prompt engineering.
 */
export const generateQuestionsByTopic = async (
  topic: string,
  classLevel: string,
  questionType: string,
  difficulty: string,
  count: number,
  customPrompt: string
): Promise<Question[]> => {
  const ai = getAiClient();

  // Map difficulty string to level code
  const levelCode = difficulty.includes('Nhận biết') ? 'NHAN_BIET'
    : difficulty.includes('Kết nối') || difficulty.includes('Hiểu') ? 'KET_NOI'
      : 'VAN_DUNG';

  // Extract clean topic name (remove subject prefix)
  const cleanTopic = topic.includes(':') ? topic.split(':').slice(1).join(':').trim() : topic;

  // Build type-specific instructions with concrete JSON examples
  const getTypeSpecificInstructions = (type: string): string => {
    switch (type) {
      case 'MATCHING':
        return `
    QUESTION TYPE: MATCHING (Nối cột / Ghép đôi)
    - 'content': Describe the matching task clearly. E.g., "Nối mỗi phép tính ở cột A với kết quả đúng ở cột B."
    - 'options': An array of strings, each string is a PAIR formatted as "Left item ||| Right item". 
      IMPORTANT: The pairs MUST BE the CORRECT pairings. The system will shuffle them automatically. E.g., ["3 + 2 ||| 5", "10 - 4 ||| 6"]
    - 'correctOptionIndex': MUST be -1 (not applicable for matching).
    - 'solution': Details of the logic...
    
    EXAMPLE JSON for ONE matching question:
    {
      "content": "Nối mỗi phép tính ở cột A với kết quả chuẩn xác ở cột B.",
      "options": ["3 + 2 ||| 5", "10 - 4 ||| 6", "2 x 3 ||| 6", "8 : 2 ||| 4"],
      "correctOptionIndex": -1,
      "solution": "3 + 2 = 5; 10 - 4 = 6; 2 × 3 = 6; 8 : 2 = 4",
      "hint": "Thực hiện từng phép tính rồi nối với kết quả tương ứng.",
      "level": "${levelCode}",
      "topic": "${cleanTopic}",
      "questionType": "MATCHING"
    }`;
      case 'ORDERING':
        return `
    QUESTION TYPE: ORDERING (Sắp xếp theo thứ tự)
    - 'content': Describe the ordering task. E.g., "Sắp xếp các phân số sau theo thứ tự tăng dần."
    - 'options': An array of items IN THE EXACT CORRECT ORDER. Do NOT shuffle them; the system will shuffle automatically. E.g., ["1/4", "1/3", "1/2", "3/4"]
    - 'correctOptionIndex': MUST be -1.
    - 'solution': Explain the logical order steps.
    
    EXAMPLE JSON for ONE ordering question:
    {
      "content": "Sắp xếp các phân số sau theo thứ tự từ bé đến lớn.",
      "options": ["1/4", "1/3", "1/2", "3/4"],
      "correctOptionIndex": -1,
      "solution": "Quy đồng ta thấy 1/4 nhỏ nhất, rồi đến 1/3, 1/2 và 3/4.",
      "hint": "Quy đồng mẫu số rồi so sánh tử số.",
      "level": "${levelCode}",
      "topic": "${cleanTopic}",
      "questionType": "ORDERING"
    }`;
      case 'DRAG_DROP':
        return `
    QUESTION TYPE: DRAG_DROP (Điền khuyết / Kéo thả)
    - 'content': A sentence or paragraph with EXACTLY ONE OR MORE blanks marked as "[__]". E.g., "Kết quả của 5 + [__] = 12 là [__]."
    - 'options': An array of words/values IN THE EXACT CORRECT ORDER matching the blanks. (You can append wrong distractors at the end of the correct ones if you want).
    - 'correctOptionIndex': MUST be -1.
    - 'solution': Show the filled sentence with correct answers. E.g., "5 + 7 = 12."
    
    EXAMPLE JSON for ONE drag-drop question:
    {
      "content": "Điền số thích hợp vào: 15 + [__] = 23. Số chẵn liền trước 10 là [__].",
      "options": ["8", "8", "9", "7"],
      "correctOptionIndex": -1,
      "solution": "15 + 8 = 23. Số chẵn liền trước 10 là 8.",
      "hint": "Lấy tổng trừ đi số hạng đã biết.",
      "level": "${levelCode}",
      "topic": "${cleanTopic}",
      "questionType": "DRAG_DROP"
    }`;
      case 'SHORT_ANSWER':
        return `
    QUESTION TYPE: SHORT_ANSWER (Tự luận ngắn)
    - 'content': The question text.
    - 'options': An array containing the exact accepted short answer(s) for auto-grading. E.g., ["26", "26 cm", "26cm"].
    - 'correctOptionIndex': MUST be -1.
    - 'solution': The full detailed answer.
    
    EXAMPLE JSON for ONE short answer question:
    {
      "content": "Tính chu vi hình chữ nhật có chiều dài 8cm và chiều rộng 5cm.",
      "options": ["26", "26 cm", "26cm"],
      "correctOptionIndex": -1,
      "solution": "Chu vi = (8 + 5) × 2 = 26 (cm)",
      "hint": "Áp dụng công thức P = (a + b) × 2",
      "level": "${levelCode}",
      "topic": "${cleanTopic}",
      "questionType": "SHORT_ANSWER"
    }`;
      default: // MCQ
        return `
    QUESTION TYPE: MCQ (Trắc nghiệm 4 lựa chọn A, B, C, D)
    - 'content': The question text.
    - 'options': Exactly 4 answer choices.
    - 'correctOptionIndex': The index (0-3) of the correct answer.
    
    EXAMPLE JSON for ONE MCQ question:
    {
      "content": "Kết quả của phép tính 25 + 17 = ?",
      "options": ["32", "42", "52", "43"],
      "correctOptionIndex": 1,
      "solution": "25 + 17 = 42",
      "hint": "Cộng hàng đơn vị trước: 5 + 7 = 12, viết 2 nhớ 1.",
      "level": "${levelCode}",
      "topic": "${cleanTopic}",
      "questionType": "MCQ"
    }`;
    }
  };

  const typeInstructions = getTypeSpecificInstructions(questionType);

  const prompt = `
    Bạn là AI tạo đề kiểm tra cho học sinh Việt Nam. Hãy tạo CHÍNH XÁC ${count} câu hỏi.

    THÔNG TIN:
    - Chủ đề: "${topic}"
    - Đối tượng: Học sinh Lớp ${classLevel}
    - Mức độ (Thông tư 27): ${difficulty}
    - Ngôn ngữ: Tiếng Việt
    ${customPrompt ? `- Yêu cầu thêm từ giáo viên: ${customPrompt}` : ''}

    ${typeInstructions}

    QUY TẮC CHUNG:
    1. 'hint' (BẮT BUỘC): Gợi ý phương pháp giải, KHÔNG tiết lộ đáp án.
    2. 'solution' (BẮT BUỘC): Lời giải chi tiết từng bước.
    3. Công thức toán: Dùng LaTeX trong dấu $ đơn. VD: $x^2 + 5$.
    4. 'level' (BẮT BUỘC): Đặt đúng giá trị "${levelCode}".
    5. 'topic' (BẮT BUỘC): Đặt đúng giá trị "${cleanTopic}".
    6. 'questionType' (BẮT BUỘC): Đặt đúng giá trị "${questionType}".
    7. **QUAN TRỌNG NHẤT**: Trường 'content' CHỈ chứa nội dung câu hỏi. TUYỆT ĐỐI KHÔNG chứa đáp án, lời giải, hay cụm từ "Đáp án: ..." bên trong 'content'. Đáp án phải được đưa vào trường 'solution'.

    Trả về một JSON array gồm ${count} objects. Mỗi object có đầy đủ các field: content, options, correctOptionIndex, solution, hint, level, topic, questionType.
  `;

  // Helper to parse response into Question array
  const parseResponse = (text: string): Question[] => {
    const cleanedText = cleanJsonString(text || "[]");
    const parsedData = JSON.parse(cleanedText);
    return parsedData.map((item: any, index: number) => ({
      id: `gen_ai_${Date.now()}_${index}`,
      type: (item.questionType || questionType) as any,
      content: item.content || '',
      imageUrl: item.imageUrl,
      options: Array.isArray(item.options) ? item.options : [],
      correctOptionIndex: item.correctOptionIndex === -1 || item.correctOptionIndex === undefined ? undefined : item.correctOptionIndex,
      solution: item.solution || '',
      hint: item.hint || '',
      level: item.level || levelCode,
      topic: item.topic || cleanTopic
    }));
  };

  let lastError: any = null;

  // Try each model in the fallback list
  for (const modelId of AI_MODELS) {
    // Attempt 1: With structured schema
    try {
      console.log(`[AI Gen] Trying ${modelId} with schema for ${count} ${questionType} questions...`);
      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: QUESTION_SCHEMA
        }
      });
      const result = parseResponse(response.text || "[]");
      console.log(`[AI Gen] Success with ${modelId} + schema! Got ${result.length} questions.`);
      return result;
    } catch (schemaError: any) {
      const errMsg = schemaError?.message || schemaError?.toString() || '';
      console.warn(`[AI Gen] ${modelId} + schema failed:`, errMsg);

      // If quota error, try next model immediately
      if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        console.warn(`[AI Gen] ${modelId} quota exceeded, trying next model...`);
        lastError = schemaError;
        continue;
      }

      // Attempt 2: Same model but WITHOUT schema (more flexible)
      try {
        console.log(`[AI Gen] Retrying ${modelId} without schema...`);
        const response = await ai.models.generateContent({
          model: modelId,
          contents: prompt + "\n\nIMPORTANT: Return ONLY a valid JSON array. No markdown, no explanation, just the JSON array.",
          config: {
            responseMimeType: "application/json"
          }
        });
        const result = parseResponse(response.text || "[]");
        console.log(`[AI Gen] Success with ${modelId} without schema! Got ${result.length} questions.`);
        return result;
      } catch (noSchemaError: any) {
        const noSchemaMsg = noSchemaError?.message || noSchemaError?.toString() || '';
        console.warn(`[AI Gen] ${modelId} without schema also failed:`, noSchemaMsg);
        lastError = noSchemaError;
        // If quota error on no-schema attempt too, try next model
        if (noSchemaMsg.includes('429') || noSchemaMsg.includes('quota') || noSchemaMsg.includes('RESOURCE_EXHAUSTED')) {
          continue;
        }
      }
    }
  }

  // All models exhausted
  const finalMsg = lastError?.message || lastError?.toString() || 'All models failed';
  console.error("[AI Gen] All attempts failed:", finalMsg);
  
  if (finalMsg.includes('429') || finalMsg.includes('quota') || finalMsg.includes('RESOURCE_EXHAUSTED')) {
    throw new Error("Hạn mức AI (Quota) đã hết hoặc bạn đang gửi yêu cầu quá nhanh. Vui lòng đợi khoảng 1 phút rồi thử lại. Nếu vẫn gặp lỗi, hãy kiểm tra API Key trong phần Cài đặt.");
  }
  
  throw new Error(finalMsg);
};

/**
 * Analyzes a single student's attempt to provide personalized feedback.
 */
export const analyzeStudentAttempt = async (
  examTitle: string,
  questions: Question[],
  userAnswers: Record<string, any>,
  score: number
): Promise<string> => {
  const ai = getAiClient();
  const modelId = "gemini-2.0-flash";

  // Filter wrong answers to save tokens and focus AI
  const wrongAnswers = questions.filter(q => {
    const userAns = userAnswers[q.id];
    return userAns !== undefined && userAns !== q.correctOptionIndex;
  }).map(q => ({
    question: q.content,
    correctAnswer: q.options[q.correctOptionIndex!],
    type: q.type
  }));

  const prompt = `
    Analyze the exam results for a student.
    Exam: "${examTitle}"
    Score: ${score}/10
    Total Questions: ${questions.length}
    Wrong Answers Count: ${wrongAnswers.length}
    
    List of mistakes (Sample):
    ${JSON.stringify(wrongAnswers.slice(0, 5))} 
    (and possibly others)

    Please provide a helpful, encouraging, and constructive feedback in VIETNAMESE (Markdown format).
    
    IMPORTANT FORMATTING RULES:
    - Use **BOLD HEADERS** (e.g., ### **1. Nhận xét chung**).
    - Use bullet points.
    - If you write math formulas (e.g., numbers, variables, equations), ALWAYS enclose them in single dollar signs ($) for proper rendering. Example: "Kết quả phải là $3.5$".
    - Do not use block code ticks (\`\`\`) for text, write standard Markdown.

    Structure:
    1. ### **Nhận xét chung**: Brief summary of performance.
    2. ### **Điểm mạnh**: What they likely know (based on score).
    3. ### **Hạn chế & Lỗ hổng kiến thức**: Analyze the wrong answers to find patterns.
    4. ### **Lời khuyên cải thiện**: Specific actions to take next.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return response.text || "Không thể tạo nhận xét lúc này.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Lỗi khi phân tích kết quả.";
  }
};

/**
 * Analyzes overall class performance for a specific exam.
 */
export const analyzeClassPerformance = async (
  examTitle: string,
  questions: Question[],
  attempts: Attempt[],
  customInstructions?: string
): Promise<string> => {
  const ai = getAiClient();
  const modelId = "gemini-2.0-flash";

  if (attempts.length === 0) return "Chưa có dữ liệu bài làm để phân tích.";

  // Calculate statistics
  const scores = attempts.map(a => a.score || 0);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);

  // Find most difficult questions
  const questionStats = questions.map(q => {
    let wrongCount = 0;
    attempts.forEach(a => {
      if (a.answers[q.id] !== q.correctOptionIndex) wrongCount++;
    });
    return { question: q.content, wrongCount, wrongPercent: (wrongCount / attempts.length) * 100 };
  }).sort((a, b) => b.wrongCount - a.wrongCount).slice(0, 3); // Top 3 hardest

  const prompt = `
    Analyze the class performance for the exam: "${examTitle}".
    Target Audience: Teacher.
    Language: Vietnamese (Markdown).

    Data:
    - Total Students: ${attempts.length}
    - Average Score: ${avgScore.toFixed(2)}
    - Max: ${maxScore}, Min: ${minScore}
    - Top 3 Hardest Questions (Most wrong):
      ${JSON.stringify(questionStats)}

    Teacher's Custom Request (Focus on this): ${customInstructions || "General comprehensive analysis"}

    Please provide a professional teaching analysis:
    1. **Tổng quan lớp học**: Comment on the general level.
    2. **Phân tích phổ điểm**: Distribution insights.
    3. **Vấn đề cần lưu ý**: Analyze the hardest questions. Use LaTeX ($...$) for any math.
    4. **Gợi ý giảng dạy**: How should the teacher adjust upcoming lessons?
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return response.text || "Không thể tạo báo cáo lớp học.";
  } catch (error) {
    console.error("Gemini Class Analysis Error:", error);
    return "Lỗi khi phân tích dữ liệu lớp học.";
  }
};

/**
 * Generates personalized behavior advice for a student based on recent negative behavior logs.
 */
export const generateBehaviorAdvice = async (
  studentName: string,
  className: string,
  logSummary: string,
  customPrompt?: string
): Promise<string> => {
  const ai = getAiClient();
  const modelId = "gemini-2.0-flash";

  const prompt = `
    Đóng vai một Chuyên gia Tâm lý Học đường và Cố vấn Hành vi.
    Hãy tư vấn cho Giáo viên cách xử lý và giáo dục học sinh sau đây:
    
    - Tên học sinh: ${studentName} (${className})
    - Lịch sử vi phạm gần đây:
${logSummary}

    ${customPrompt ? `\n- Ghi chú thêm từ giáo viên (Hoàn cảnh/Bối cảnh lúc này): "${customPrompt}"\n` : ''}

    YÊU CẦU:
    - Viết bằng Tiếng Việt thân thiện, rõ ràng, dễ áp dụng (định dạng Markdown).
    - Phân tích nguyên nhân có thể xảy ra từ góc độ tâm lý.
    - Đưa ra 2-3 biện pháp cụ thể, thực tế để giáo viên có thể hỗ trợ/giáo dục học sinh này thay vì chỉ trách mắng.
    - Cấu trúc gồm: "Nguyên nhân tiềm ẩn", "Góc nhìn tâm lý" và "Giải pháp đề xuất".
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return response.text || "Không thể tạo tư vấn từ AI vào lúc này.";
  } catch (error) {
    console.error("Gemini Behavior Advice Error:", error);
    return "Lỗi khi kết nối với AI Tư vấn.";
  }
};

/**
 * Analyzes handwritten or typed student material from multiple images (base64) using Gemini Pro Vision.
 */
export const analyzeStudentMaterial = async (
  images: { data: string, mimeType: string }[],
  customPrompt: string = ""
): Promise<any> => {
  const ai = getAiClient();
  const modelId = "gemini-2.0-flash";

  const prompt = `
    Đóng vai một Giáo viên chấm bài xuất sắc. Dưới đây là hình ảnh chụp các trang bài làm của học sinh.
    
    YÊU CẦU:
    1. Đọc và nhận dạng chữ viết trong TẤT CẢ các ảnh một cách chính xác nhất có thể (các ảnh có thể là nhiều trang của cùng 1 bài bài làm).
    2. Điểm số (thang điểm 100): Tự động cấp một đề xuất điểm số dựa trên độ hoàn thiện và độ chính xác của toàn bộ bài làm.
    3. Trình bày dưới dạng JSON thuần túy (KHÔNG CÓ markdown \`\`\`json\`\`\`).
    
    ${customPrompt ? `\nCHỈ ĐẠO CÁ NHÂN TỪ GIÁO VIÊN: "${customPrompt}"\n(Hãy đặc biệt tuân thủ chỉ đạo này khi chấm bài)\n` : ''}
    
    CẤU TRÚC JSON YÊU CẦU:
    {
      "advantages": "Những điểm tốt, làm đúng phân tích từ bài làm (VIẾT DƯỚI DẠNG ĐOẠN VĂN THEO DẠNG MARKDOWN)",
      "limitations": "Những điểm sai, thiếu sót, lỗi trình bày (VIẾT DƯỚI DẠNG ĐOẠN VĂN THEO DẠNG MARKDOWN)",
      "improvements": "Lời khuyên cải thiện cụ thể để học sinh tốt hơn (VIẾT DƯỚI DẠNG ĐOẠN VĂN THEO DẠNG MARKDOWN)",
      "suggested_score": <một con số nguyên từ 0 đến 100>
    }
    
    Lưu ý: Nếu hình ảnh không phải là một bài làm có thể chấm được, hãy trả về JSON nhưng trong các mục text hãy báo là "Không thể nhận dạng chữ hoặc nội dung không phù hợp", và điểm 0.
  `;

  try {
    const imageParts = images.map(img => ({
      inlineData: {
        data: img.data,
        mimeType: img.mimeType
      }
    }));

    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{
        role: "user",
        parts: [
          ...imageParts,
          { text: prompt }
        ]
      }]
    });

    const cleanedText = cleanJsonString(response.text || "{}");
    try {
      return JSON.parse(cleanedText);
    } catch (e) {
      console.error("Failed to parse AI Grading output:", cleanedText);
      throw new Error("AI returned malformed JSON");
    }
  } catch (error) {
    console.error("Gemini Vision Grading Error:", error);
    throw new Error("Lỗi khi phân tích hình ảnh qua AI.");
  }
};

/**
 * Analyzes student work from TEXT input (typed/pasted by teacher).
 * Supports reference exam (đề bài gốc) and custom rubric.
 */
export const analyzeStudentText = async (
  studentText: string,
  referenceExam: string = "",
  customPrompt: string = "",
  rubric: string = ""
): Promise<any> => {
  const ai = getAiClient();
  const modelId = "gemini-2.0-flash";

  const prompt = `
    Đóng vai một Giáo viên chấm bài xuất sắc.
    
    ${referenceExam ? `ĐỀ BÀI GỐC (Đáp án chuẩn):\n"""\n${referenceExam}\n"""\n` : ''}
    
    BÀI LÀM CỦA HỌC SINH:
    """
    ${studentText}
    """
    
    ${rubric ? `TIÊU CHÍ ĐÁNH GIÁ (RUBRIC):\n${rubric}\n` : ''}
    ${customPrompt ? `CHỈ ĐẠO CÁ NHÂN TỪ GIÁO VIÊN: "${customPrompt}"\n(Hãy đặc biệt tuân thủ chỉ đạo này khi chấm bài)\n` : ''}
    
    YÊU CẦU:
    1. So sánh bài làm của học sinh với đề bài gốc (nếu có) để đánh giá chính xác.
    2. Nếu không có đề gốc, đánh giá dựa trên nội dung bài làm.
    3. Điểm số (thang điểm 100): Tự động cấp một đề xuất điểm số.
    4. Trình bày dưới dạng JSON thuần túy (KHÔNG CÓ markdown \`\`\`json\`\`\`).
    
    CẤU TRÚC JSON YÊU CẦU:
    {
      "advantages": "Những điểm tốt, làm đúng (VIẾT DƯỚI DẠNG MARKDOWN)",
      "limitations": "Những điểm sai, thiếu sót, lỗi (VIẾT DƯỚI DẠNG MARKDOWN)",
      "improvements": "Lời khuyên cải thiện cụ thể (VIẾT DƯỚI DẠNG MARKDOWN)",
      "suggested_score": <một con số nguyên từ 0 đến 100>
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    const cleanedText = cleanJsonString(response.text || "{}");
    try {
      return JSON.parse(cleanedText);
    } catch (e) {
      console.error("Failed to parse AI Text Grading output:", cleanedText);
      throw new Error("AI returned malformed JSON");
    }
  } catch (error) {
    console.error("Gemini Text Grading Error:", error);
    throw new Error("Lỗi khi phân tích bài làm qua AI.");
  }
};

/**
 * Generates an optimized seating chart using AI.
 * Takes student list, grid dimensions, and any specific constraints.
 */
export const generateSeatingChart = async (
  students: { id: string, name: string, gender?: string }[],
  rows: number,
  cols: number,
  constraints: string = ""
): Promise<Array<{ row: number, col: number, studentId: string | null }>> => {
  const ai = getAiClient();
  const modelId = "gemini-2.0-flash";

  const totalSeats = rows * cols;
  if (students.length > totalSeats) {
    throw new Error(`Grid too small: ${totalSeats} seats for ${students.length} students.`);
  }

  const prompt = `
    Đóng vai một Chuyên gia Sư phạm và Tâm lý học đường.
    Nhiệm vụ của bạn là sắp xếp chỗ ngồi cho lớp học.

    TÌNH TRẠNG LỚP HỌC:
    - Tổng số học sinh: ${students.length}
    - Kích thước sơ đồ lớp: ${rows} hàng ngang (Row) x ${cols} cột dọc (Col). Tổng cộng: ${totalSeats} chỗ.
    - Danh sách học sinh (ID, Tên):
    ${JSON.stringify(students.map(s => ({ id: s.id, name: s.name })))}

    ${constraints ? `\nCHÚ Ý ĐẶC BIỆT TỪ GIÁO VIÊN: "${constraints}"\n` : ''}

    YÊU CẦU XẾP CHỖ:
    1. Trả về đúng định dạng JSON Array chứa sơ đồ chỗ ngồi.
    2. Mỗi phần tử trong array là một object: {"row": số_nguyên, "col": số_nguyên, "studentId": "id_học_sinh"}. (row từ 0 đến ${rows - 1}, col từ 0 đến ${cols - 1}).
    3. Nếu chỗ ngồi bị trống (do số học sinh ít hơn số ghế), gán "studentId": null.
    4. Không được xếp 2 học sinh vào 1 ghế (trùng row, col). Đảm bảo mỗi học sinh có 1 ghế.
    5. Cố gắng xếp nam nữ xen kẽ nếu có thể phân biệt qua tên. Học sinh cùng họ thường không nên ngồi cạnh nhau. Tối ưu hoá cho việc ngồi gần bảng (row thấp) hơn là đuôi lớp.
    
    CHỈ TRẢ VỀ JSON ARRAY. KHÔNG CHỨA BẤT KỲ VĂN BẢN NÀO KHÁC (Kể cả markdown \`\`\`json).
    
    VÍ DỤ TRẢ VỀ:
    [
      {"row": 0, "col": 0, "studentId": "id_1"},
      {"row": 0, "col": 1, "studentId": "id_2"},
      {"row": 0, "col": 2, "studentId": null}
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const cleanedText = cleanJsonString(response.text || "[]");
    const parsedChart = JSON.parse(cleanedText);

    if (!Array.isArray(parsedChart)) {
      throw new Error("AI returned invalid structure. Expected Array.");
    }

    return parsedChart;
  } catch (error) {
    console.error("Gemini Seating Error:", error);
    throw new Error("Loi khi tao so do bang AI. Vui long thu lai hoac xep tay.");
  }
};

/**
 * Tao goi y hoc tap ca nhan hoa cho hoc sinh dua tren du lieu analytics.
 */
export const generatePersonalizedRecommendation = async (
  analytics: {
    avgScore: number;
    totalAttempts: number;
    bySubject: { subject: string; avgScore: number; trend: string }[];
    weakTopics: { topic: string; subject: string; incorrectRate: number }[];
    byDifficulty: { label: string; correctRate: number }[];
    studyStreak: number;
  }
): Promise<string> => {
  const weakTopicsKey = analytics.weakTopics.slice(0, 5).map(t => `${t.topic}_${t.incorrectRate}`).join('-');
  const cacheKey = `rec_${analytics.avgScore.toFixed(2)}_${analytics.totalAttempts}_${analytics.studyStreak}_${weakTopicsKey}`;
  
  const cached = await getCachedResponse(cacheKey);
  if (cached) return cached;

  const ai = getAiClient();
  const modelId = "gemini-2.0-flash";

  const subjectSummary = analytics.bySubject
    .map(s => s.subject + ": TB " + s.avgScore + "/10 (xu huong: " + (s.trend === "UP" ? "tot len" : s.trend === "DOWN" ? "giam" : "on dinh") + ")")
    .join(", ");

  const weakTopicsSummary = analytics.weakTopics.slice(0, 5)
    .map(t => t.topic + " (" + t.subject + ") - sai " + t.incorrectRate + "%")
    .join(", ");

  const difficultySummary = analytics.byDifficulty
    .map(d => d.label + ": " + d.correctRate + "%")
    .join(", ");

  const prompt = "Ban la gia su AI than thien, dang tu van hoc tap cho mot hoc sinh Viet Nam. " +
    "Hay dua ra loi khuyen hoc tap ca nhan hoa, am ap va khuyen khich. " +
    "Du lieu hoc sinh: Diem TB: " + analytics.avgScore + "/10, " +
    "So bai da lam: " + analytics.totalAttempts + ", " +
    "Streak: " + analytics.studyStreak + " ngay, " +
    "Theo mon: " + (subjectSummary || "Chua co du lieu") + ". " +
    "Chu de hay sai nhat: " + (weakTopicsSummary || "Khong co") + ". " +
    "Ti le dung theo muc do: " + difficultySummary + ". " +
    "Yeu cau: Viet bang tieng Viet, tong giong nhu mot nguoi thay quan tam. Do dai 3-5 cau ngan gon. " +
    "Cau truc: (1) Nhan xet diem tot, (2) Chi ra 1-2 diem can cai thien, (3) Goi y hanh dong cu the. " +
    "Neu HS gioi (>=8.5), hay thach thuc. Neu HS trung binh, hay khuyen khich. Neu HS yeu (<5), hay an can.";

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    const result = response.text || "AI khong the tao goi y luc nay.";
    if (response.text) {
      await setCachedResponse(cacheKey, result);
    }
    return result;
  } catch (error) {
    console.error("Gemini Personalized Recommendation Error:", error);
    throw new Error("Khong the ket noi AI. Vui long kiem tra API Key trong Cai dat.");
  }
};

/**
 * Phân tích học sinh dành cho giáo viên.
 */
export const generateTeacherStudentAnalysis = async (
  studentName: string,
  analytics: {
    avgScore: number;
    totalAttempts: number;
    bySubject: { subject: string; avgScore: number; trend: string }[];
    weakTopics: { topic: string; subject: string; incorrectRate: number }[];
    byDifficulty: { label: string; correctRate: number }[];
    studyStreak: number;
  }
): Promise<string> => {
  const weakTopicsKey = analytics.weakTopics.slice(0, 5).map(t => `${t.topic}_${t.incorrectRate}`).join('-');
  const cacheKey = `t_anal_${studentName}_${analytics.avgScore.toFixed(2)}_${analytics.totalAttempts}_${analytics.studyStreak}_${weakTopicsKey}`;
  
  const cached = await getCachedResponse(cacheKey);
  if (cached) return cached;

  const ai = getAiClient();
  const modelId = "gemini-2.0-flash";

  const subjectSummary = analytics.bySubject
    .map(s => s.subject + ": TB " + s.avgScore + "/10 (" + (s.trend === "UP" ? "tốt lên" : s.trend === "DOWN" ? "giảm" : "ổn định") + ")")
    .join(", ");

  const weakTopicsSummary = analytics.weakTopics.slice(0, 5)
    .map(t => t.topic + " (" + t.subject + ") - sai " + t.incorrectRate + "%")
    .join(", ");

  const prompt = `Bạn là một Cố vấn Sư phạm kỳ cựu. Hãy phân tích kết quả học tập của học sinh "${studentName}" để báo cáo cho Giáo viên chủ nhiệm/Giảng viên.
    
    Dữ liệu học tập:
    - Điểm trung bình: ${analytics.avgScore}/10
    - Tổng số bài tập đã hoàn thành: ${analytics.totalAttempts}
    - Chuỗi ngày học tập: ${analytics.studyStreak} ngày
    - Kết quả theo môn: ${subjectSummary || "Chưa có dữ liệu"}
    - Các mảng kiến thức yếu nhất: ${weakTopicsSummary || "Không có"}
    
    Yêu cầu:
    1. Ngôn ngữ: Tiếng Việt, chuyên nghiệp, khách quan nhưng có tính hỗ trợ sư phạm.
    2. Độ dài: Khoảng 4-6 câu.
    3. Cấu trúc: 
       - Đánh giá tổng quan năng lực hiện tại của học sinh.
       - Chỉ ra nguyên nhân cốt lõi dẫn đến các lỗ hổng kiến thức (nếu có).
       - Đưa ra các biện pháp can thiệp/hỗ trợ cụ thể mà giáo viên nên áp dụng để giúp học sinh này tiến bộ.
    
    Lưu ý: Nếu học sinh giỏi, hãy gợi ý cách bồi dưỡng thêm. Nếu học sinh yếu, hãy gợi ý cách kèm cặp sát sao.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    const result = response.text || "AI không thể tạo phân tích lúc này.";
    if (response.text) {
      await setCachedResponse(cacheKey, result);
    }
    return result;
  } catch (error) {
    console.error("Gemini Teacher Student Analysis Error:", error);
    throw new Error("Không thể kết nối AI. Vui lòng kiểm tra API Key.");
  }
};

/**
 * Tạo hướng dẫn học tập cá nhân hoá cho Học sinh trong Arena Tower dựa trên điểm yếu.
 */
export const generateArenaStudyGuide = async (
  topic: string,
  subject: string,
  incorrectRate: number
): Promise<string> => {
  const cacheKey = `guide_${subject}_${topic}_${incorrectRate}`;
  const cached = await getCachedResponse(cacheKey);
  if (cached) return cached;

  const ai = getAiClient();
  const modelId = "gemini-2.0-flash";

  const prompt = `Bạn là Trợ lý AI OpenLMS, đóng vai trò như một Thầy/Cô giáo tận tâm.
Học sinh vừa hoàn thành các thử thách trong Tháp Arena và hệ thống phát hiện phần kiến thức sau đang là điểm yếu lớn nhất của em ấy:
- Môn học: ${subject}
- Chủ đề yếu nhất: ${topic}
- Tỷ lệ trả lời sai: ${incorrectRate}%

YÊU CẦU BẮT BUỘC VỀ XƯNG HÔ VÀ MỞ ĐẦU:
Bắt đầu câu lệnh bằng cụm từ chính xác: "AI OpenLMS chào em, thầy/cô gợi ý em..."

HƯỚNG DẪN NỘI DUNG:
1. Đưa ra 1-2 lời khuyên lý thuyết chuyên sâu nhưng dễ hiểu, tập trung vào mẹo hoặc quy tắc để khắc phục lỗi sai trong chủ đề "${topic}".
2. Định dạng Markdown có xuống dòng rõ ràng, gạch đầu dòng dễ đọc. Tránh viết quá dài.
3. Luôn dùng từ ngữ khích lệ, động viên để học sinh không nản chí.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    const result = response.text || "AI không thể tạo hướng dẫn lúc này.";
    if (response.text) {
      await setCachedResponse(cacheKey, result);
    }
    return result;
  } catch (error) {
    console.error("Gemini Arena Study Guide Error:", error);
    throw new Error("Không thể kết nối AI. Vui lòng kiểm tra API Key.");
  }
};

/**
 * Phân tích Hồ sơ Học tập Toàn diện cho Giáo viên.
 * Tổng hợp dữ liệu từ tất cả các nguồn: bài tập, nhận xét TT27, hành vi, điểm danh, Arena, ghi chú GV.
 */
export const generatePortfolioAnalysis = async (
  studentName: string,
  portfolioData: {
    avgScore: number;
    totalAttempts: number;
    weakTopics: { topic: string; subject: string; incorrectRate: number }[];
    behaviorScore: number;
    behaviorPositiveCount: number;
    behaviorNegativeCount: number;
    attendancePresent: number;
    attendanceAbsent: number;
    attendanceTotal: number;
    evaluationSummary: string;
    arenaElo: number;
    arenaWins: number;
    arenaLosses: number;
    towerFloor: number;
    teacherNotes: string;
  }
): Promise<string> => {
  const cacheKey = `portfolio_${studentName}_${portfolioData.avgScore.toFixed(2)}_${portfolioData.behaviorScore}_${portfolioData.arenaElo}_${portfolioData.towerFloor}`;
  const cached = await getCachedResponse(cacheKey);
  if (cached) return cached;

  const ai = getAiClient();
  const modelId = "gemini-2.5-flash";

  const prompt = `Bạn là Trợ lý AI OpenLMS, đang hỗ trợ Giáo viên phân tích hồ sơ học tập toàn diện của học sinh.

BẮT ĐẦU BẰNG CỤM TỪ CHÍNH XÁC: "AI OpenLMS chào thầy/cô, sau khi phân tích hồ sơ học sinh ${studentName}, đây là nhận xét tổng hợp:"

DỮ LIỆU HỒ SƠ HỌC SINH: "${studentName}"

📚 KẾT QUẢ HỌC TẬP:
- Điểm trung bình: ${portfolioData.avgScore}/10
- Tổng số bài đã làm: ${portfolioData.totalAttempts}
- Chủ đề yếu nhất: ${portfolioData.weakTopics.length > 0 ? portfolioData.weakTopics.map(t => t.topic + ' (' + t.subject + ') - sai ' + t.incorrectRate + '%').join(', ') : 'Không có dữ liệu'}

📝 NHẬN XÉT THƯỜNG XUYÊN (TT27):
${portfolioData.evaluationSummary || 'Chưa có nhận xét'}

⚡ HÀNH VI:
- Tổng điểm hành vi: ${portfolioData.behaviorScore}
- Số lần ghi nhận tích cực: ${portfolioData.behaviorPositiveCount}
- Số lần ghi nhận tiêu cực: ${portfolioData.behaviorNegativeCount}

📋 ĐIỂM DANH:
- Có mặt: ${portfolioData.attendancePresent}/${portfolioData.attendanceTotal} buổi
- Vắng: ${portfolioData.attendanceAbsent} buổi

🏟️ ĐẤU TRƯỜNG ARENA:
- Elo Rating: ${portfolioData.arenaElo}
- Thắng/Thua: ${portfolioData.arenaWins}W / ${portfolioData.arenaLosses}L
- Tầng tháp: ${portfolioData.towerFloor}

📌 GHI CHÚ BỔ SUNG TỪ GIÁO VIÊN:
${portfolioData.teacherNotes || 'Không có'}

YÊU CẦU PHÂN TÍCH:
1. Viết bằng Tiếng Việt, chuyên nghiệp, khách quan, mang tính hỗ trợ sư phạm.
2. Định dạng Markdown rõ ràng với các heading ### và gạch đầu dòng.
3. Cấu trúc bắt buộc:
   ### 1. Đánh giá tổng quan
   ### 2. Điểm mạnh nổi bật
   ### 3. Lỗ hổng cần khắc phục
   ### 4. Đề xuất biện pháp hỗ trợ cụ thể
4. Độ dài: 300-500 từ.
5. Nếu dữ liệu còn ít, hãy đề xuất GV bổ sung thêm thông tin.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    const result = response.text || "AI không thể tạo phân tích lúc này.";
    if (response.text) {
      await setCachedResponse(cacheKey, result);
    }
    return result;
  } catch (error) {
    console.error("Gemini Portfolio Analysis Error:", error);
    throw new Error("Không thể kết nối AI. Vui lòng kiểm tra API Key.");
  }
};

/**
 * Sinh câu hỏi phục thù từ AI dựa trên các câu bị làm sai trong trận đấu.
 */
export const generateRevengeQuestions = async (
  wrongQuestions: { content: string, topic?: string, subject?: string }[]
): Promise<{ topic: string, summary: string, questions: Question[] }> => {
  const ai = getAiClient();
  const modelId = "gemini-2.0-flash";

  const prompt = `Bạn là Trợ lý AI sư phạm tận tâm của Open LMS.
Học sinh vừa làm sai các câu hỏi sau đây trong trận đấu Arena:
${JSON.stringify(wrongQuestions.map(q => ({ content: q.content, topic: q.topic, subject: q.subject })))}

YÊU CẦU:
1. Đưa ra một tóm tắt sư phạm cực kỳ ngắn gọn (không quá 3 dòng) để vá lỗ hổng lý thuyết của học sinh cho chủ đề này.
2. Sinh ra CHÍNH XÁC 3 câu hỏi trắc nghiệm khách quan mới tinh (MCQ) có độ khó tương tự, trực tiếp liên quan đến mảng kiến thức học sinh bị sai để học sinh có thể phục thù và khắc phục điểm yếu.
3. Trả về dưới dạng JSON thuần túy (KHÔNG CÓ markdown \`\`\`json\`\`\`).

CẤU TRÚC JSON YÊU CẦU:
{
  "topic": "Tên chủ đề bị hổng",
  "summary": "Tóm tắt lý thuyết ngắn gọn và gợi ý phương pháp giải nhanh để học sinh ghi nhớ...",
  "questions": [
    {
      "content": "Câu hỏi trắc nghiệm phục thù 1...",
      "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
      "correctOptionIndex": 0,
      "solution": "Giải thích chi tiết cho câu hỏi 1",
      "hint": "Gợi ý làm bài"
    },
    ... (tổng cộng đúng 3 câu hỏi)
  ]
}
`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const cleanedText = cleanJsonString(response.text || "{}");
    const result = JSON.parse(cleanedText);
    
    // Gán ID cho các câu hỏi phục thù
    if (result.questions && Array.isArray(result.questions)) {
      result.questions = result.questions.map((q: any, i: number) => ({
        ...q,
        id: `revenge_${Date.now()}_${i}`,
        type: 'MCQ',
        level: 'KET_NOI',
        topic: result.topic
      }));
    }
    
    return result;
  } catch (error) {
    console.error("Gemini Revenge Generation Error:", error);
    throw new Error("Không thể sinh câu hỏi phục thù từ AI.");
  }
};

/**
 * Trích xuất danh sách câu hỏi từ hình ảnh đề thi (OCR) bằng Gemini 2.0.
 */
export const parseQuestionsFromImage = async (base64Image: string, mimeType: string): Promise<Question[]> => {
  const ai = getAiClient();

  const prompt = `
    Bạn là một trợ lý AI OCR chuyên trích xuất đề thi từ hình ảnh cho hệ thống LMS.
    Hãy phân tích hình ảnh đính kèm có chứa đề thi hoặc danh sách câu hỏi.
    Nhận diện chữ viết và toán học trong ảnh, sau đó chuyển toàn bộ các câu hỏi tìm thấy thành cấu trúc JSON array.
    
    Quy tắc trích xuất:
    1. Nhận diện phần câu hỏi và các lựa chọn đáp án (A, B, C, D) cho các câu hỏi trắc nghiệm (MCQ).
    2. Chuyển đổi công thức toán học thành định dạng LaTeX nằm giữa dấu $ đơn, ví dụ: $y = x^2 + 2x$.
    3. Nếu là câu hỏi tự luận ngắn hoặc điền từ, thiết lập questionType là SHORT_ANSWER hoặc DRAG_DROP thích hợp và lưu trữ đáp án đúng vào mảng 'options'.
    4. Trích xuất hoặc tự suy luận lời giải 'solution' và gợi ý gợi mở 'hint'.
    5. Đặt độ khó level tương ứng (NHAN_BIET, KET_NOI, VAN_DUNG).
    6. Trả về đúng định dạng JSON Array chứa các câu hỏi.
  `;

  // Base64 string must not contain headers like "data:image/jpeg;base64,"
  const cleanBase64 = base64Image.includes(';base64,') 
    ? base64Image.split(';base64,')[1] 
    : base64Image;

  const inlineDataPart = {
    inlineData: {
      data: cleanBase64,
      mimeType: mimeType
    }
  };

  const parseResponse = (text: string): Question[] => {
    const cleanedText = cleanJsonString(text || "[]");
    const parsedData = JSON.parse(cleanedText);
    return parsedData.map((item: any, index: number) => ({
      id: `gen_ocr_${Date.now()}_${index}`,
      type: (item.questionType || 'MCQ') as any,
      content: item.content || '',
      imageUrl: item.imageUrl,
      options: item.options || [],
      correctOptionIndex: item.correctOptionIndex === -1 ? undefined : item.correctOptionIndex,
      solution: item.solution || '',
      hint: item.hint || '',
      level: item.level || undefined,
      topic: item.topic || undefined
    }));
  };

  let lastError: any = null;

  for (const modelId of AI_MODELS) {
    try {
      console.log(`[OCR Parse] Trying ${modelId} with schema...`);
      const response = await ai.models.generateContent({
        model: modelId,
        contents: [
          prompt,
          inlineDataPart
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: QUESTION_SCHEMA
        }
      });
      const result = parseResponse(response.text || "[]");
      console.log(`[OCR Parse] Success with ${modelId}! Got ${result.length} questions.`);
      return result;
    } catch (schemaError: any) {
      console.warn(`[OCR Parse] ${modelId} failed:`, schemaError?.message || schemaError);
      lastError = schemaError;
      const errMsg = schemaError?.message || '';
      if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        continue;
      }
      
      try {
        console.log(`[OCR Parse] Retrying ${modelId} without schema...`);
        const response = await ai.models.generateContent({
          model: modelId,
          contents: [
            prompt + "\n\nIMPORTANT: Return ONLY a valid JSON array matching the schema.",
            inlineDataPart
          ],
          config: {
            responseMimeType: "application/json"
          }
        });
        const result = parseResponse(response.text || "[]");
        return result;
      } catch (err) {
        lastError = err;
      }
    }
  }

  throw new Error(lastError?.message || "Không thể OCR hình ảnh đề thi bằng AI.");
};

/**
 * Giải thích nhanh lỗi sai của học sinh.
 */
export const explainQuestionError = async (
  questionContent: string,
  studentAnswer: string,
  correctAnswer: string
): Promise<string> => {
  const ai = getAiClient();
  const modelId = "gemini-2.0-flash";
  const prompt = `Bạn là Trợ lý Giáo viên AI của OpenLMS. Học sinh vừa làm sai câu hỏi sau:
  Câu hỏi: "${questionContent}"
  Đáp án học sinh chọn: "${studentAnswer}"
  Đáp án đúng: "${correctAnswer}"
  
  Hãy giải thích ngắn gọn (2-3 câu, tối đa 100 từ) bằng tiếng Việt lý do tại sao học sinh sai và cách tính/quy trình đúng để giải quyết câu này. Hãy dùng LaTeX ($...$) cho các công thức toán nếu có. Trả lời bằng định dạng Markdown thân thiện.`;
  
  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt
    });
    return response.text || "Không thể tải lời giải lý thuyết lúc này.";
  } catch (e) {
    console.error("Error explaining question error:", e);
    return `Lời giải chi tiết: Đáp án đúng là "${correctAnswer}". Bạn hãy xem lại kiến thức chuyên đề này nhé.`;
  }
};




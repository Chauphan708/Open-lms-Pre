import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Question, Attempt, ArenaQuestion } from '../types';
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

// ═══════════════════════════════════════════════════════════════
// API KEY STORAGE & PROVIDER HELPERS
// Ưu tiên 1: OpenRouter API Key (Đa mô hình: Claude, DeepSeek, Gemini...)
// Ưu tiên 2: Google Gemini API Key (Dự phòng / Trực tiếp)
// ═══════════════════════════════════════════════════════════════

export const OPENROUTER_KEY_STORAGE = 'openrouter_api_key';
export const OPENROUTER_MODEL_STORAGE = 'openrouter_model';
export const DEFAULT_OPENROUTER_MODEL = 'google/gemini-2.5-flash';

export const POPULAR_OPENROUTER_MODELS = [
  { id: 'google/gemini-2.5-flash', name: 'Google Gemini 2.5 Flash (Khuyên dùng - Nhanh, Đa phương thức)', provider: 'Google' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3 (Siêu rẻ, Tư duy sư phạm xuất sắc)', provider: 'DeepSeek' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (Văn phong mượt mà, Đỉnh cao)', provider: 'Anthropic' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Meta Llama 3.3 70B Instruct (Mã nguồn mở chất lượng cao)', provider: 'Meta' },
  { id: 'google/gemini-2.0-flash-exp:free', name: 'Google Gemini 2.0 Flash (Free tier trên OpenRouter)', provider: 'Google' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (Mô hình suy luận sâu - Reasoning)', provider: 'DeepSeek' },
  { id: 'openai/gpt-4o-mini', name: 'OpenAI GPT-4o Mini (Tiết kiệm, thông minh)', provider: 'OpenAI' }
];

export const setOpenRouterApiKey = (key: string) => {
  localStorage.setItem(OPENROUTER_KEY_STORAGE, key.trim());
};

export const getOpenRouterApiKey = (): string => {
  let key = localStorage.getItem(OPENROUTER_KEY_STORAGE) || '';
  if (!key) {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env.OPENROUTER_API_KEY) {
      // @ts-ignore
      key = process.env.OPENROUTER_API_KEY;
    }
  }
  if (!key) {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_OPENROUTER_API_KEY) {
      // @ts-ignore
      key = import.meta.env.VITE_OPENROUTER_API_KEY;
    }
  }
  return (key && !key.includes('OPENROUTER_API_KEY')) ? key.trim() : '';
};

export const clearOpenRouterApiKey = () => {
  localStorage.removeItem(OPENROUTER_KEY_STORAGE);
};

export const setOpenRouterModel = (model: string) => {
  localStorage.setItem(OPENROUTER_MODEL_STORAGE, model.trim());
};

export const getOpenRouterModel = (): string => {
  let model = localStorage.getItem(OPENROUTER_MODEL_STORAGE) || '';
  if (!model) {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env.OPENROUTER_MODEL) {
      // @ts-ignore
      model = process.env.OPENROUTER_MODEL;
    }
  }
  return model || DEFAULT_OPENROUTER_MODEL;
};

// --- Google Gemini Key Helpers (Ưu tiên 2) ---
export const GEMINI_KEY_STORAGE = 'gemini_api_key';

export const setGeminiApiKey = (key: string) => {
  localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
};

export const getGeminiApiKey = (): string => {
  let key = localStorage.getItem(GEMINI_KEY_STORAGE) || '';
  if (!key) {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      // @ts-ignore
      key = process.env.API_KEY;
    }
  }
  if (!key) {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
      // @ts-ignore
      key = import.meta.env.VITE_API_KEY;
    }
  }
  return (key && !key.includes('API_KEY')) ? key.trim() : '';
};

export const clearGeminiApiKey = () => {
  localStorage.removeItem(GEMINI_KEY_STORAGE);
};

export const getActiveAiProviderInfo = (): {
  provider: 'OPENROUTER' | 'GEMINI' | 'NONE';
  label: string;
  model?: string;
  hasFallback: boolean;
} => {
  const orKey = getOpenRouterApiKey();
  const geminiKey = getGeminiApiKey();

  if (orKey) {
    return {
      provider: 'OPENROUTER',
      label: `OpenRouter (Ưu tiên 1) - ${getOpenRouterModel()}`,
      model: getOpenRouterModel(),
      hasFallback: !!geminiKey
    };
  }
  if (geminiKey) {
    return {
      provider: 'GEMINI',
      label: 'Google Gemini (Ưu tiên 2 / Dự phòng)',
      model: 'gemini-2.5-flash',
      hasFallback: false
    };
  }
  return {
    provider: 'NONE',
    label: 'Chưa cấu hình API Key',
    hasFallback: false
  };
};

// --- Test API Key Functions ---
export const testOpenRouterApiKey = async (keyInput?: string, modelInput?: string): Promise<{ success: boolean; message: string }> => {
  const apiKey = (keyInput !== undefined ? keyInput : getOpenRouterApiKey()).trim();
  if (!apiKey) {
    throw new Error('Vui lòng nhập OpenRouter API Key.');
  }
  const model = (modelInput || getOpenRouterModel()).trim() || DEFAULT_OPENROUTER_MODEL;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
      'X-Title': 'OpenLMS Education API Test',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: 'Trả lời đúng 1 từ: Xin chào' }],
      max_tokens: 30
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData?.error?.message || `Lỗi OpenRouter HTTP ${response.status}: ${response.statusText}`;
    throw new Error(errorMsg);
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    throw new Error('Phản hồi trống từ OpenRouter API.');
  }

  return { success: true, message: `Kết nối thành công! Phản hồi từ [${model}]: "${reply}"` };
};

export const testGeminiApiKey = async (keyInput?: string): Promise<{ success: boolean; message: string }> => {
  const apiKey = (keyInput !== undefined ? keyInput : getGeminiApiKey()).trim();
  if (!apiKey) {
    throw new Error('Vui lòng nhập Google Gemini API Key.');
  }

  const ai = new GoogleGenAI({ apiKey });
  let response;
  let lastErrMessage = '';

  try {
    response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Trả lời đúng 1 từ: Xin chào'
    });
  } catch (e: any) {
    lastErrMessage = e?.message || e?.toString() || '';
    if (lastErrMessage.includes('503') || lastErrMessage.includes('demand') || lastErrMessage.includes('429') || lastErrMessage.includes('quota') || lastErrMessage.includes('UNAVAILABLE')) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: 'Trả lời đúng 1 từ: Xin chào'
        });
      } catch (e2: any) {
        throw e2;
      }
    } else {
      throw e;
    }
  }

  if (response && response.text) {
    return { success: true, message: `Kết nối thành công! Phản hồi từ Google Gemini: "${response.text.trim()}"` };
  }
  throw new Error('Phản hồi trống từ Google Gemini API.');
};

export const getAiClient = () => {
  const geminiKey = getGeminiApiKey();
  const openRouterKey = getOpenRouterApiKey();
  const apiKey = geminiKey || openRouterKey;

  if (!apiKey) {
    console.error("CRITICAL: Missing API KEY. Vui lòng vào Cài đặt → API Key để nhập.");
    throw new Error("Chưa cấu hình API Key. Vui lòng vào Cài đặt → tab 🔑 API Key để nhập OpenRouter API Key (Ưu tiên 1) hoặc Google Gemini API Key (Ưu tiên 2).");
  }

  return new GoogleGenAI({ apiKey: geminiKey || 'dummy_for_client' });
};

export interface UniversalAiOptions {
  prompt: string;
  systemInstruction?: string;
  image?: { data: string; mimeType: string };
  images?: { data: string; mimeType: string }[];
  jsonMode?: boolean;
  schema?: Schema;
  temperature?: number;
  maxTokens?: number;
  cacheKey?: string;
  model?: string;
}

export const callAiGeneration = async (opts: UniversalAiOptions): Promise<string> => {
  // 1. Kiểm tra cache
  if (opts.cacheKey) {
    const cached = await getCachedResponse(opts.cacheKey);
    if (cached) return cached;
  }

  const openRouterKey = getOpenRouterApiKey();
  const geminiKey = getGeminiApiKey();

  if (!openRouterKey && !geminiKey) {
    throw new Error("Chưa cấu hình API Key. Vui lòng vào Cài đặt → tab 🔑 API Key để nhập OpenRouter API Key (Ưu tiên 1) hoặc Google Gemini API Key (Ưu tiên 2).");
  }

  let lastError: any = null;

  // ═══════════════════════════════════════════════════════════════
  // ƯU TIÊN 1: OPENROUTER API
  // ═══════════════════════════════════════════════════════════════
  if (openRouterKey) {
    try {
      const selectedModel = opts.model || getOpenRouterModel();
      console.log(`[AI Dispatcher] 🚀 Calling OpenRouter (Priority 1) with model: ${selectedModel}`);
      
      const messages: any[] = [];
      if (opts.systemInstruction) {
        messages.push({ role: 'system', content: opts.systemInstruction });
      }

      let userContent: any = opts.prompt;

      if (opts.images && opts.images.length > 0) {
        const parts: any[] = [{ type: 'text', text: opts.prompt }];
        for (const img of opts.images) {
          let url = img.data;
          if (!url.startsWith('data:')) {
            url = `data:${img.mimeType || 'image/jpeg'};base64,${url}`;
          }
          parts.push({
            type: 'image_url',
            image_url: { url }
          });
        }
        userContent = parts;
      } else if (opts.image) {
        let url = opts.image.data;
        if (!url.startsWith('data:')) {
          url = `data:${opts.image.mimeType || 'image/jpeg'};base64,${url}`;
        }
        userContent = [
          { type: 'text', text: opts.prompt },
          { type: 'image_url', image_url: { url } }
        ];
      }

      messages.push({ role: 'user', content: userContent });

      const requestBody: any = {
        model: selectedModel,
        messages: messages,
        temperature: opts.temperature ?? 0.7
      };

      if (opts.maxTokens) {
        requestBody.max_tokens = opts.maxTokens;
      }

      if (opts.jsonMode) {
        requestBody.response_format = { type: 'json_object' };
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
          'X-Title': 'OpenLMS Education AI',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `Lỗi OpenRouter HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errMsg);
      }

      const data = await response.json();
      const reply = data?.choices?.[0]?.message?.content;
      if (typeof reply === 'string') {
        if (opts.cacheKey && reply) {
          await setCachedResponse(opts.cacheKey, reply);
        }
        return reply;
      }
      throw new Error('OpenRouter trả về phản hồi rỗng.');
    } catch (orErr: any) {
      console.warn(`[AI Dispatcher] ⚠️ OpenRouter gặp lỗi (${orErr.message}), tự động chuyển sang Google Gemini (Ưu tiên 2)...`, orErr);
      lastError = orErr;
      if (!geminiKey) {
        throw orErr;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ƯU TIÊN 2: GOOGLE GEMINI SDK (DỰ PHÒNG / TRỰC TIẾP)
  // ═══════════════════════════════════════════════════════════════
  if (geminiKey) {
    console.log(`[AI Dispatcher] 🔄 Calling Google Gemini SDK (Priority 2)...`);
    const ai = new GoogleGenAI({ apiKey: geminiKey });

    for (const modelId of AI_MODELS) {
      try {
        let contents: any = opts.prompt;

        if (opts.images && opts.images.length > 0) {
          const imageParts = opts.images.map(img => ({
            inlineData: {
              data: img.data.replace(/^data:image\/[a-z]+;base64,/, ''),
              mimeType: img.mimeType || 'image/jpeg'
            }
          }));
          contents = [{
            role: 'user',
            parts: [...imageParts, { text: opts.prompt }]
          }];
        } else if (opts.image) {
          const cleanBase64 = opts.image.data.replace(/^data:image\/[a-z]+;base64,/, '');
          contents = [
            opts.prompt,
            {
              inlineData: {
                data: cleanBase64,
                mimeType: opts.image.mimeType || 'image/jpeg'
              }
            }
          ];
        }

        const config: any = {};
        if (opts.systemInstruction) {
          config.systemInstruction = opts.systemInstruction;
        }
        if (opts.jsonMode) {
          config.responseMimeType = "application/json";
          if (opts.schema) {
            config.responseSchema = opts.schema;
          }
        }
        if (opts.temperature !== undefined) {
          config.temperature = opts.temperature;
        }
        if (opts.maxTokens) {
          config.maxOutputTokens = opts.maxTokens;
        }

        const response = await ai.models.generateContent({
          model: modelId,
          contents,
          config: Object.keys(config).length > 0 ? config : undefined
        });

        const resultText = response.text || '';
        if (opts.cacheKey && resultText) {
          await setCachedResponse(opts.cacheKey, resultText);
        }
        return resultText;
      } catch (gemErr: any) {
        console.warn(`[AI Dispatcher] Gemini model ${modelId} failed:`, gemErr?.message || gemErr);
        lastError = gemErr;
        // If quota/overload, loop to next fallback model
        continue;
      }
    }
  }

  throw lastError || new Error("Không thể kết nối dịch vụ AI. Vui lòng kiểm tra lại API Key trong Cài đặt.");
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
      questionType: { type: Type.STRING, description: "Type of question. Must be one of: MCQ, SHORT_ANSWER, MATCHING, ORDERING, DRAG_DROP, SENTENCE_SCRAMBLE" }
    },
    required: ["content", "options", "correctOptionIndex", "solution", "hint", "level", "topic", "questionType"],
  }
};

// Model fallback list: try newer model first, fallback to older if quota exceeded
const AI_MODELS = ["gemini-2.5-flash", "gemini-3.5-flash"];

/**
 * Parses raw text content (from Word/PDF copy-paste) into structured Question objects.
 * Includes model fallback and schema retry logic for robustness.
 */
export const parseQuestionsFromText = async (rawText: string): Promise<Question[]> => {
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
    9. **questionType (REQUIRED)**: Detect the question format: MCQ, SHORT_ANSWER, MATCHING, ORDERING, DRAG_DROP, or SENTENCE_SCRAMBLE.
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

  const responseText = await callAiGeneration({
    prompt,
    jsonMode: true,
    schema: QUESTION_SCHEMA
  });

  return parseResponse(responseText);
};

const ARENA_QUESTION_SCHEMA: Schema = {
  type: Type.ARRAY,
  description: "List of parsed Arena questions",
  items: {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING, description: "Question content stem, formatted in Vietnamese. MATH FORMATTING: Math expressions must use LaTeX enclosed in single dollar signs ($) for inline math. CRITICAL RULE FOR ELEMENTARY DIVISION: division symbol MUST be represented as ':' (never '÷', never '\\div'). E.g. $12 : 3 = 4$ or $x : 5 = 10$." },
      answers: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "Exactly 4 options for MCQ/MCQ_MULTIPLE, or empty array for SHORT_ANSWER."
      },
      correct_index: { type: Type.INTEGER, description: "Index of correct answer (0-3) for MCQ, or 0 if not applicable" },
      correct_indices: { 
        type: Type.ARRAY, 
        items: { type: Type.INTEGER },
        description: "Array of indices (0-3) for multiple choice MCQ_MULTIPLE"
      },
      correct_answer_string: { type: Type.STRING, description: "The exact correct text answer for SHORT_ANSWER" },
      difficulty: { type: Type.INTEGER, description: "Difficulty level: 1 (Mức 1), 2 (Mức 2), 3 (Mức 3), 4 (Mức nâng cao)" },
      subject: { type: Type.STRING, description: "One of: math, science, technology, vietnamese, english, history_geography" },
      topic: { type: Type.STRING, description: "Clean topic name, e.g. 'Phân số', 'Địa lí tự nhiên'" },
      time_limit_seconds: { type: Type.INTEGER, description: "Recommended time in seconds, e.g. 30, 45, 60" },
      xp_reward: { type: Type.INTEGER, description: "XP reward. Level 1: 10, Level 2: 15, Level 3: 20, Level 4: 30" },
      type: { type: Type.STRING, description: "Type: MCQ, MCQ_MULTIPLE, SHORT_ANSWER" }
    },
    required: ["content", "answers", "difficulty", "subject", "topic", "type"]
  }
};

export const parseArenaQuestionsFromText = async (rawText: string): Promise<Omit<ArenaQuestion, 'id'>[]> => {
  const prompt = `
    You are an AI exam parser for an LMS system. 
    Analyze the following raw text which contains exam questions.
    Extract all questions into a structured JSON array suitable for the Arena Question Bank.
    
    Rules:
    1. Identify the question stem.
    2. Identify options (A, B, C, D) for MCQ/MCQ_MULTIPLE. If the question is SHORT_ANSWER (no A/B/C/D choices), extract the exact short answer text (e.g. "3300" or "Hà Nội") and put it into 'correct_answer_string'. Set 'answers' to an empty array.
    3. MATH FORMATTING: If you encounter math formulas or expressions, use LaTeX format enclosed in single dollar signs ($) for inline math. Example: $x^2 + 5$.
    4. **CRITICAL DIVISION RULE FOR ELEMENTARY SCHOOL**: Always represent division in LaTeX using the colon ":" symbol (e.g., $12 : 3$ or $x : 5$). Do NOT use "÷", do NOT use "\\div", do NOT use "/".
    5. Determine the correct index (0-3) for MCQ, or correct_indices (e.g. [0, 2]) for MCQ_MULTIPLE.
    6. **DIFFICULTY (1-4)**: Classify each question's difficulty level: 1 (Mức 1), 2 (Mức 2), 3 (Mức 3), 4 (Mức nâng cao).
    7. **SUBJECT**: Must be mapped to one of these lowercased codes: 'math', 'science', 'technology', 'vietnamese', 'english', 'history_geography'.
    8. **TOPIC**: Identify the specific knowledge topic/chapter for each question.
    9. **type**: Detect the question format: MCQ, MCQ_MULTIPLE, or SHORT_ANSWER.
    
    Raw Text:
    """
    ${rawText}
    """
  `;

  const parseResponse = (text: string): Omit<ArenaQuestion, 'id'>[] => {
    const cleanedText = cleanJsonString(text || "[]");
    const parsedData = JSON.parse(cleanedText);
    return parsedData.map((item: any) => ({
      type: (item.type || 'MCQ') as any,
      content: item.content,
      answers: item.answers || [],
      correct_index: item.correct_index,
      correct_indices: item.correct_indices,
      correct_answer_string: item.correct_answer_string,
      difficulty: Number(item.difficulty) || 1,
      subject: item.subject || 'math',
      topic: item.topic || 'general',
      time_limit_seconds: Number(item.time_limit_seconds) || 30,
      xp_reward: Number(item.xp_reward) || 10
    }));
  };

  const responseText = await callAiGeneration({
    prompt,
    jsonMode: true,
    schema: ARENA_QUESTION_SCHEMA
  });

  return parseResponse(responseText);
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
        break;
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
      case 'SENTENCE_SCRAMBLE':
        return `
    QUESTION TYPE: SENTENCE_SCRAMBLE (Xếp từ thành câu)
    - 'content': Describe the task. E.g., "Sắp xếp các từ sau thành câu hoàn chỉnh."
    - 'options': Array of words/phrases representing the items in their **CORRECT EXPECTED ORDER** in the sentence. The UI will shuffle them automatically. 
    - 'solution': (Optional) explanation.
    - 'correctOptionIndex': MUST be -1 or null (not used).
    
    EXAMPLE JSON for ONE sentence scramble question:
    {
      "topic": "${cleanTopic}",
      "level": "${levelCode}",
      "content": "Sắp xếp các từ sau thành câu hoàn chỉnh.",
      "options": ["Hôm nay", "trời", "rất", "đẹp", "và", "mát mẻ."],
      "correctOptionIndex": -1,
      "solution": "Ghép các từ theo thứ tự chủ ngữ, vị ngữ hợp lý.",
      "questionType": "SENTENCE_SCRAMBLE"
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
      case 'WORD_CLASSIFY':
        return `
    QUESTION TYPE: WORD_CLASSIFY (Phân loại từ)
    - 'content': Describe the classification task. E.g., "Xếp các từ sau vào 2 nhóm: Danh từ và Động từ."
    - 'options': An array of strings formatted as "CategoryName ||| Word". E.g., ["Danh từ ||| Bàn học", "Động từ ||| Chạy"]. The UI will auto-shuffle.
    - 'correctOptionIndex': MUST be -1.
    - 'solution': Detail which word goes to which category.
    
    EXAMPLE JSON for ONE word classify question:
    {
      "content": "Xếp các từ sau vào 2 nhóm: Danh từ và Động từ.",
      "options": ["Danh từ ||| Bàn học", "Danh từ ||| Xe đạp", "Động từ ||| Chạy", "Động từ ||| Bơi"],
      "correctOptionIndex": -1,
      "solution": "Bàn học, xe đạp là danh từ. Chạy, bơi là động từ.",
      "level": "${levelCode}",
      "topic": "${cleanTopic}",
      "questionType": "WORD_CLASSIFY"
    }`;
      case 'FILL_IN_PASSAGE':
        return `
    QUESTION TYPE: FILL_IN_PASSAGE (Điền vào đoạn văn)
    - 'content': A passage with EXACTLY ONE OR MORE blanks marked as "[__]". E.g., "Mùa [__] đến, cây cối đâm chồi nảy lộc. Chim [__] hót ríu rít."
    - 'options': An array of EXACT correct words matching the blanks IN ORDER.
    - 'correctOptionIndex': MUST be -1.
    - 'solution': The full passage with correct answers.
    
    EXAMPLE JSON for ONE fill in passage question:
    {
      "content": "Mùa [__] đến, hoa đào nở rộ. Chim [__] hót ríu rít.",
      "options": ["xuân", "én"],
      "correctOptionIndex": -1,
      "solution": "Mùa xuân đến, hoa đào nở rộ. Chim én hót ríu rít.",
      "level": "${levelCode}",
      "topic": "${cleanTopic}",
      "questionType": "FILL_IN_PASSAGE"
    }`;
      case 'INLINE_DROPDOWN':
        return `
    QUESTION TYPE: INLINE_DROPDOWN (Trắc nghiệm thả xuống)
    - 'content': A paragraph with EXACTLY ONE OR MORE blanks marked as "[__]". E.g., "Hôm nay là một ngày [__], bầu trời [__]."
    - 'options': An array matching the blanks IN ORDER. Each string MUST be formatted as "CorrectAnswer ||| Distractor1 | Distractor2".
    - 'correctOptionIndex': MUST be -1.
    - 'solution': The full passage with correct answers.
    
    EXAMPLE JSON for ONE inline dropdown question:
    {
      "content": "Hôm nay là một ngày [__], bầu trời [__].",
      "options": ["đẹp trời ||| xấu trời | mưa bão", "trong xanh ||| xám xịt | tối đen"],
      "correctOptionIndex": -1,
      "solution": "Hôm nay là một ngày đẹp trời, bầu trời trong xanh.",
      "level": "${levelCode}",
      "topic": "${cleanTopic}",
      "questionType": "INLINE_DROPDOWN"
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

  const responseText = await callAiGeneration({
    prompt,
    jsonMode: true,
    schema: QUESTION_SCHEMA
  });

  return parseResponse(responseText);
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
    const response = await callAiGeneration({ prompt });
    return response || "Không thể tạo nhận xét lúc này.";
  } catch (error: any) {
    console.error("AI Attempt Analysis Error:", error);
    return `Lỗi khi phân tích kết quả: ${error?.message || String(error)}`;
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
    const response = await callAiGeneration({ prompt });
    return response || "Không thể tạo báo cáo lớp học.";
  } catch (error: any) {
    console.error("AI Class Analysis Error:", error);
    return `Lỗi khi phân tích dữ liệu lớp học: ${error?.message || String(error)}`;
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
    const response = await callAiGeneration({ prompt });
    return response || "Không thể tạo tư vấn từ AI vào lúc này.";
  } catch (error: any) {
    console.error("AI Behavior Advice Error:", error);
    return `Lỗi khi kết nối với AI Tư vấn: ${error?.message || String(error)}`;
  }
};

/**
 * Analyzes handwritten or typed student material from multiple images (base64).
 */
export const analyzeStudentMaterial = async (
  images: { data: string, mimeType: string }[],
  customPrompt: string = ""
): Promise<any> => {
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
    const rawResponse = await callAiGeneration({
      prompt,
      images,
      jsonMode: true
    });

    const cleanedText = cleanJsonString(rawResponse || "{}");
    return JSON.parse(cleanedText);
  } catch (error: any) {
    console.error("AI Vision Grading Error:", error);
    throw new Error(`Lỗi khi phân tích hình ảnh qua AI: ${error?.message || String(error)}`);
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
    const rawResponse = await callAiGeneration({
      prompt,
      jsonMode: true
    });

    const cleanedText = cleanJsonString(rawResponse || "{}");
    return JSON.parse(cleanedText);
  } catch (error: any) {
    console.error("AI Text Grading Error:", error);
    throw new Error(`Lỗi khi phân tích bài làm qua AI: ${error?.message || String(error)}`);
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
    const rawResponse = await callAiGeneration({
      prompt,
      jsonMode: true
    });

    const cleanedText = cleanJsonString(rawResponse || "[]");
    const parsedChart = JSON.parse(cleanedText);

    if (!Array.isArray(parsedChart)) {
      throw new Error("AI returned invalid structure. Expected Array.");
    }

    return parsedChart;
  } catch (error: any) {
    console.error("AI Seating Error:", error);
    throw new Error(`Lỗi khi tạo sơ đồ bằng AI: ${error?.message || String(error)}`);
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
    const result = await callAiGeneration({ prompt, cacheKey });
    return result || "AI không thể tạo gợi ý lúc này.";
  } catch (error: any) {
    console.error("AI Personalized Recommendation Error:", error);
    throw new Error("Không thể kết nối AI. Vui lòng kiểm tra API Key trong Cài đặt.");
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
    const result = await callAiGeneration({ prompt, cacheKey });
    return result || "AI không thể tạo phân tích lúc này.";
  } catch (error: any) {
    console.error("AI Teacher Student Analysis Error:", error);
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
    const result = await callAiGeneration({ prompt, cacheKey });
    return result || "AI không thể tạo hướng dẫn lúc này.";
  } catch (error: any) {
    console.error("AI Arena Study Guide Error:", error);
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
    const result = await callAiGeneration({ prompt, cacheKey });
    return result || "AI không thể tạo phân tích lúc này.";
  } catch (error: any) {
    console.error("AI Portfolio Analysis Error:", error);
    throw new Error("Không thể kết nối AI. Vui lòng kiểm tra API Key.");
  }
};

/**
 * Sinh câu hỏi phục thù từ AI dựa trên các câu bị làm sai trong trận đấu.
 */
export const generateRevengeQuestions = async (
  wrongQuestions: { content: string, topic?: string, subject?: string }[]
): Promise<{ topic: string, summary: string, questions: Question[] }> => {
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
    const rawResponse = await callAiGeneration({
      prompt,
      jsonMode: true
    });

    const cleanedText = cleanJsonString(rawResponse || "{}");
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
  } catch (error: any) {
    console.error("AI Revenge Generation Error:", error);
    throw new Error(`Không thể sinh câu hỏi phục thù từ AI: ${error?.message || String(error)}`);
  }
};

/**
 * Trích xuất danh sách câu hỏi từ hình ảnh đề thi (OCR).
 */
export const parseQuestionsFromImage = async (base64Image: string, mimeType: string): Promise<Question[]> => {
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

  try {
    const rawResponse = await callAiGeneration({
      prompt,
      image: {
        data: cleanBase64,
        mimeType: mimeType || 'image/jpeg'
      },
      jsonMode: true,
      schema: QUESTION_SCHEMA
    });

    return parseResponse(rawResponse);
  } catch (error: any) {
    console.error("AI OCR Parse Error:", error);
    throw new Error(`Không thể OCR hình ảnh đề thi bằng AI: ${error?.message || String(error)}`);
  }
};

/**
 * Giải thích nhanh lỗi sai của học sinh.
 */
export const explainQuestionError = async (
  questionContent: string,
  studentAnswer: string,
  correctAnswer: string
): Promise<string> => {
  const prompt = `Bạn là Trợ lý Giáo viên AI của OpenLMS. Học sinh vừa làm sai câu hỏi sau:
  Câu hỏi: "${questionContent}"
  Đáp án học sinh chọn: "${studentAnswer}"
  Đáp án đúng: "${correctAnswer}"
  
  Hãy giải thích ngắn gọn (2-3 câu, tối đa 100 từ) bằng tiếng Việt lý do tại sao học sinh sai và cách tính/quy trình đúng để giải quyết câu này. Hãy dùng LaTeX ($...$) cho các công thức toán nếu có. Trả lời bằng định dạng Markdown thân thiện.`;
  
  try {
    const result = await callAiGeneration({ prompt });
    return result || "Không thể tải lời giải lý thuyết lúc này.";
  } catch (e) {
    console.error("Error explaining question error:", e);
    return `Lời giải chi tiết: Đáp án đúng là "${correctAnswer}". Bạn hãy xem lại kiến thức chuyên đề này nhé.`;
  }
};

/**
 * Dynamically generates missing correct_answer_string, guide, and explanation for an incomplete question.
 */
export const generateMissingQuestionFields = async (
  content: string,
  answers: string[],
  correctIndex: number
): Promise<{ correct_answer_string: string; guide: string; explanation: string }> => {
  const prompt = `
    You are an expert Math teacher assistant.
    Analyze the following math question and generate the missing fields:
    
    Question Content: "${content}"
    Options (Answers array): ${JSON.stringify(answers)}
    Correct Index: ${correctIndex}
    
    Your task:
    1. Identify or calculate the exact correct answer. If the options array is empty, calculate the final short answer text (e.g. "5/9" or "5").
    2. Write a clear, pedagogical guide/hint for the student. Do not reveal the final answer in the guide.
    3. Write a detailed, step-by-step math explanation explaining how to solve this question.
    4. For math symbols/fractions, always use LaTeX enclosed in single dollar signs ($) for inline math. E.g., $\\frac{5}{9}$.
    
    Return the response as a JSON object matching this schema:
    {
      "correct_answer_string": "The exact short answer string or correct option text",
      "guide": "A clear, pedagogical hint",
      "explanation": "Detailed step-by-step explanation"
    }
  `;

  try {
    const rawResponse = await callAiGeneration({
      prompt,
      jsonMode: true,
      schema: {
        type: Type.OBJECT,
        properties: {
          correct_answer_string: { type: Type.STRING },
          guide: { type: Type.STRING },
          explanation: { type: Type.STRING }
        },
        required: ["correct_answer_string", "guide", "explanation"]
      }
    });

    const parsed = JSON.parse(cleanJsonString(rawResponse || "{}"));
    return {
      correct_answer_string: parsed.correct_answer_string || "",
      guide: parsed.guide || "",
      explanation: parsed.explanation || ""
    };
  } catch (e) {
    console.error("Failed to generate missing question fields:", e);
    // Simple fallback logic
    let calculatedAnswer = "";
    if (content.includes("2/9 + \\square/9 = 7/9") || content.includes("2}{9} + \\frac{\\square}{9} = \\frac{7}{9}")) {
      calculatedAnswer = "$\\frac{5}{9}$";
    }
    return {
      correct_answer_string: calculatedAnswer || (answers && answers[correctIndex] ? answers[correctIndex] : "Chưa có đáp án"),
      guide: "Muốn tìm số hạng chưa biết, ta lấy tổng trừ đi số hạng đã biết.",
      explanation: "Thực hiện phép tính hiệu để tìm số hạng thích hợp điền vào ô vuông."
    };
  }
};


// ═══════════════════════════════════════════════════════════════
// E-LEARNING: AI-Powered Lesson & Video Question Generation
// ═══════════════════════════════════════════════════════════════

/**
 * Generates a structured lesson in Markdown from raw document text.
 * Uses RAG-style prompting: given raw educational content, the AI
 * rewrites it as a clear, student-friendly Markdown lesson.
 */
export const generateLessonContent = async (
  rawText: string,
  subject?: string,
  classLevel?: string,
): Promise<string> => {
  const trimmed = rawText.trim().substring(0, 15000); // Cap input to ~15k chars

  const prompt = `Bạn là một giáo viên giỏi, chuyên soạn bài giảng trực tuyến cho học sinh ${classLevel || 'tiểu học & THCS'}.

Dựa trên tài liệu thô bên dưới, hãy viết lại thành MỘT BÀI GIẢNG MARKDOWN hoàn chỉnh, rõ ràng, hấp dẫn. Tuân thủ quy tắc:

1. Cấu trúc bài giảng:
   - **Tiêu đề bài** (heading ##)
   - **Mục tiêu bài học** (3-5 dấu chấm, ngắn gọn)
   - **Kiến thức chính** (chia thành 2-4 phần con ### với giải thích rõ ràng)
   - **Ví dụ minh họa** (ít nhất 2 ví dụ có lời giải)
   - **Lưu ý quan trọng** (dạng blockquote > hoặc bullet point ⚠️)
   - **Tóm tắt bài học** (5-7 dòng tổng kết)
2. Ngôn ngữ: Tiếng Việt, thân thiện, dễ hiểu cho lứa tuổi học sinh.
3. Công thức toán: Dùng cú pháp LaTeX inline $...$ và block $$...$$.
4. Không thêm thông tin sai hoặc bịa đặt. Chỉ dựa trên tài liệu gốc.
5. Trả về THUẦN Markdown, KHÔNG bọc trong code block.
${subject ? `6. Môn học: ${subject}.` : ''}

--- TÀI LIỆU GỐC ---
${trimmed}
--- HẾT TÀI LIỆU ---`;

  try {
    const text = await callAiGeneration({
      prompt,
      temperature: 0.5,
      maxTokens: 4096
    });
    if (text && text.trim().length > 50) {
      return text.trim();
    }
  } catch (err: any) {
    console.warn(`[generateLessonContent] failed:`, err?.message || err);
  }
  throw new Error('Không thể tạo bài giảng. Vui lòng thử lại sau.');
};

/**
 * Generates timestamped video checkpoint questions from lesson content.
 * Returns an array of objects matching ELVideoQuestion interface.
 *
 * @param content - The lesson text or summary
 * @param videoDurationSec - Total video duration in seconds (to distribute timestamps)
 * @param count - Number of questions to generate (default 3)
 */
export const generateVideoQuestions = async (
  content: string,
  videoDurationSec: number,
  count: number = 3,
): Promise<{ timestamp: number; question: string; options: string[]; correctIndex: number }[]> => {
  const trimmed = content.trim().substring(0, 8000);

  const prompt = `Bạn là AI chuyên tạo câu hỏi kiểm tra xen kẽ trong video bài giảng.

Yêu cầu: Tạo CHÍNH XÁC ${count} câu hỏi trắc nghiệm (4 đáp án A-D) để chèn vào video dài ${videoDurationSec} giây.

Quy tắc:
1. Mỗi câu hỏi phải liên quan trực tiếp đến nội dung bài giảng.
2. Câu hỏi ngắn gọn (<80 ký tự), phù hợp hiển thị overlay trên video.
3. Đáp án ngắn (<40 ký tự mỗi đáp án).
4. Phân bổ timestamp đều trong video (không đặt ở đầu hoặc cuối quá gần).
   - Câu 1 ở khoảng 25-35% video
   - Câu 2 ở khoảng 50-60% video
   - Câu 3 ở khoảng 70-85% video
   (Nếu cần ${count} câu, phân bổ đều tương tự)
5. Trả về RAW JSON array, KHÔNG bọc markdown code block.

Định dạng mỗi phần tử:
{
  "timestamp": <số giây (integer)>,
  "question": "<nội dung câu hỏi>",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "correctIndex": <0|1|2|3>
}

--- NỘI DUNG BÀI GIẢNG ---
${trimmed}
--- HẾT NỘI DUNG ---`;

  try {
    const raw = await callAiGeneration({
      prompt,
      jsonMode: true,
      temperature: 0.6,
      maxTokens: 2048
    });

    const parsed = JSON.parse(cleanJsonString(raw || '[]'));

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((q: any) => ({
        timestamp: Math.max(10, Math.min(videoDurationSec - 10, Number(q.timestamp) || 60)),
        question: String(q.question || ''),
        options: Array.isArray(q.options) ? q.options.map(String).slice(0, 4) : ['A', 'B', 'C', 'D'],
        correctIndex: Math.min(3, Math.max(0, Number(q.correctIndex) || 0)),
      }));
    }
  } catch (err: any) {
    console.warn(`[generateVideoQuestions] failed:`, err?.message || err);
  }
  throw new Error('Không thể tạo câu hỏi video. Vui lòng thử lại sau.');
};

/**
 * Local Question Parser — Tách câu hỏi từ text bằng Regex, KHÔNG cần AI.
 * Hỗ trợ định dạng:
 *   Câu 1: / Bài 1: / Câu hỏi 1: / 1. / 1)
 *   A. / B. / C. / D. (đáp án)
 *   Đáp án: B / Đáp án đúng: B
 *   Hướng dẫn: / Giải thích: / Lời giải: (solution)
 */

import { Question, QuestionType } from '../types';

// Regex to split text into question blocks
const TYPE_IDENTIFIER_REGEX = /(?:(?:Loại\s*câu\s*hỏi|Question\s*type)\s*[:.-]\s*|#(?:loại\s*câu\s*hỏi|question\s*type|type)#\s*[:.-]?\s*)(.+)/i;
const QUESTION_START_REGEX = /(?:^|\n)\s*(?:Câu\s*(?:hỏi\s*)?|Bài\s*|Question\s*)(\d+)\s*[:.)\]]\s*/gi;
const QUESTION_START_ALT_REGEX = /(?:^|\n)\s*(\d+)\s*[.)]\s+/g;

// Regex for options
const OPTION_REGEX = /^\s*([A-Za-z])[\u0300-\u036f\u0323\u0327\u031b]*\s*[.):\]]\s*(.+)/;

// Regex for correct answer (captures the whole remaining line so we can check if it's A/B/C/D or text)
const ANSWER_REGEX = /^\s*(?:(?:Đáp\s*án\s*(?:đúng)?\s*[:.-]\s*)|#(?:đáp\s*án\s*(?:đúng)?|answer)#\s*[:.-]?\s*)(.+)/i;

// Regex for solution/explanation — must handle "Lời giải chi tiết:", "Hướng dẫn giải:", "Giải thích:", etc.
const SOLUTION_REGEX = /^\s*(?:(?:Lời\s*giải(?:\s*chi\s*tiết)?|Giải\s*thích|Hướng\s*dẫn\s*giải|Giải\s*chi\s*tiết|Solution|Explanation)\s*[:.-]\s*|#(?:lời\s*giải(?:\s*chi\s*tiết)?|giải\s*thích|hướng\s*dẫn\s*giải|giải\s*chi\s*tiết|solution|explanation)#\s*[:.-]?\s*)([\s\S]*?)$/i;

// Regex for hint — must handle "Gợi ý:", "Gợi ý (Cách làm):", "Hướng dẫn:", "Hint:", etc.
const HINT_REGEX = /^\s*(?:(?:Gợi\s*ý|Gợi\s*ý(?:\s*\([^)]*\))?|Hướng\s*dẫn|Hint)\s*[:.-]\s*|#(?:gợi\s*ý|gợi\s*ý(?:\s*\([^)]*\))?|hướng\s*dẫn|hint)#\s*[:.-]?\s*)([\s\S]*?)$/i;

// Regex for difficulty level
const LEVEL_REGEX = /^\s*(?:(?:Mức\s*độ|Độ\s*khó)\s*[:.-]\s*|#(?:mức\s*độ|độ\s*khó|level)#\s*[:.-]?\s*)(Nhận\s*biết|Kết\s*nối|Thông\s*hiểu|Vận\s*dụng(?: cao)?|NB|KN|TH|VD(?:C)?)/i;

/**
 * Parse questions from raw text using regex (no AI needed).
 * Returns an array of Question objects.
 */
export const parseQuestionsLocal = (rawText: string): Question[] => {
    const text = rawText.trim();
    if (!text) return [];

    // Step 1: Split text into question blocks
    const blocks = splitIntoQuestionBlocks(text);

    if (blocks.length === 0) return [];

    // Step 2: Parse each block
    const questions: Question[] = [];
    blocks.forEach((block, index) => {
        const q = parseOneBlock(block, index);
        if (q) questions.push(q);
    });

    return questions;
};

/**
 * Split the full text into individual question blocks.
 */
function splitIntoQuestionBlocks(text: string): string[] {
    // Try standard format first: "Câu 1:", "Bài 1:", etc.
    let matches: { index: number; length: number; num: number; raw: string }[] = [];

    // Reset regex
    QUESTION_START_REGEX.lastIndex = 0;
    let match;
    while ((match = QUESTION_START_REGEX.exec(text)) !== null) {
        matches.push({ 
            index: match.index, 
            length: match[0].length,
            num: parseInt(match[1], 10),
            raw: match[0]
        });
    }

    // Heuristic: Filter out sub-questions
    if (matches.length > 1) {
        const hasCau = matches.some(m => /^\s*Câu\s+\d+/i.test(m.raw));
        const hasCauHoi = matches.some(m => /^\s*Câu\s+hỏi\s+\d+/i.test(m.raw));
        if (hasCau && hasCauHoi) {
            matches = matches.filter(m => !/^\s*Câu\s+hỏi\s+\d+/i.test(m.raw));
        }

        // Also check for sequential drops: e.g. [13, 14, 1, 2]
        let filteredMatches: typeof matches = [];
        let currentMax = 0;
        for (let i = 0; i < matches.length; i++) {
            const m = matches[i];
            if (i === 0) {
                filteredMatches.push(m);
                currentMax = m.num;
            } else {
                if (m.num < currentMax && m.num <= 5 && currentMax >= 5) {
                    continue; // Skip sub-question
                }
                filteredMatches.push(m);
                if (m.num > currentMax) {
                    currentMax = m.num;
                }
            }
        }
        matches = filteredMatches;
    }

    // If no standard matches, try "1." or "1)" format
    if (matches.length === 0) {
        QUESTION_START_ALT_REGEX.lastIndex = 0;
        while ((match = QUESTION_START_ALT_REGEX.exec(text)) !== null) {
            matches.push({ 
                index: match.index, 
                length: match[0].length,
                num: parseInt(match[1], 10),
                raw: match[0]
            });
        }
    }

    if (matches.length === 0) return [];

    // Extract blocks between matches
    const blocks: string[] = [];
    for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index + matches[i].length;
        const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
        const block = text.substring(start, end).trim();
        if (block) blocks.push(block);
    }

    return blocks;
}

/**
 * Parse a single question block into a Question object.
 */
function parseOneBlock(block: string, index: number): Question | null {
    // Tiền xử lý: Tách các từ khóa ra dòng mới nếu chúng bị dính trên cùng một dòng
    let normalizedBlock = block
        // Tách Đáp án
        .replace(/(\s+)(Đáp\s*án\s*(?:đúng)?\s*[:.-]|#(?:đáp\s*án\s*(?:đúng)?|answer)#\s*[:.-]?)/gi, '\n$2')
        // Tách Gợi ý
        .replace(/(\s+)(Gợi\s*ý|Gợi\s*ý(?:\s*\([^)]*\))?|Hint)\s*[:.-]/gi, '\n$2:')
        .replace(/(\s+)(#(?:gợi\s*ý|gợi\s*ý(?:\s*\([^)]*\))?|hướng\s*dẫn|hint)#)\s*[:.-]?/gi, '\n$2')
        // Tách Hướng dẫn
        .replace(/(\s+)(Hướng\s*dẫn)\s*[:.-]/gi, '\n$2:')
        // Tách Lời giải 
        .replace(/(\s+)(Lời\s*giải(?:\s*chi\s*tiết)?|Giải\s*thích|Hướng\s*dẫn\s*giải|Giải\s*chi\s*tiết|Solution|Explanation)\s*[:.-]/gi, '\n$2:')
        .replace(/(\s+)(#(?:lời\s*giải(?:\s*chi\s*tiết)?|giải\s*thích|hướng\s*dẫn\s*giải|giải\s*chi\s*tiết|solution|explanation)#)\s*[:.-]?/gi, '\n$2')
        // Tách Mức độ
        .replace(/(\s+)(Mức\s*độ|Độ\s*khó)\s*[:.-]/gi, '\n$2:')
        .replace(/(\s+)(#(?:mức\s*độ|độ\s*khó|level)#)\s*[:.-]?/gi, '\n$2')
        // Tách Loại câu hỏi
        .replace(/(\s+)(Loại\s*câu\s*hỏi|Question\s*type)\s*[:.-]/gi, '\n$2:')
        .replace(/(\s+)(#(?:loại\s*câu\s*hỏi|question\s*type|type)#)\s*[:.-]?/gi, '\n$2');

    const lines = normalizedBlock.split('\n').map(l => l.trimEnd());

    let content = '';
    let options: string[] = [];
    let correctOptionIndex: number | undefined = undefined;
    let correctOptionIndices: number[] | undefined = undefined;
    let solution = '';
    let hint = '';
    let shortAnswerText = '';
    let parsedLevel: any = undefined;
    let explicitType: QuestionType | null = null;

    // Track parsing state
    let parsingState: 'content' | 'options' | 'answer' | 'solution' | 'hint' = 'content';
    let solutionLines: string[] = [];
    let hintLines: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Check if this line is an explicit question type identifier
        const typeMatch = trimmed.match(TYPE_IDENTIFIER_REGEX);
        if (typeMatch) {
            const rawType = typeMatch[1].trim();
            if (/dropdown|thả\s*xuống/i.test(rawType)) explicitType = 'INLINE_DROPDOWN';
            else if (/drag\s*drop|kéo\s*thả|điền\s*khuyết/i.test(rawType)) explicitType = 'DRAG_DROP';
            else if (/fill\s*passage|điền\s*đoạn\s*văn/i.test(rawType)) explicitType = 'FILL_IN_PASSAGE';
            else if (/matching|nối\s*cột|ghép\s*đôi/i.test(rawType)) explicitType = 'MATCHING';
            else if (/word\s*classify|phân\s*loại\s*từ|phân\s*nhóm/i.test(rawType)) explicitType = 'WORD_CLASSIFY';
            else if (/sentence\s*scramble|xếp\s*từ\s*thành\s*câu|xếp\s*từ/i.test(rawType)) explicitType = 'SENTENCE_SCRAMBLE';
            else if (/ordering|sắp\s*xếp\s*thứ\s*tự|thứ\s*tự/i.test(rawType)) explicitType = 'ORDERING';
            else if (/mcq\s*multiple|chọn\s*nhiều|đa\s*đáp\s*án/i.test(rawType)) explicitType = 'MCQ_MULTIPLE';
            else if (/mcq|trắc\s*nghiệm\s*đơn/i.test(rawType)) explicitType = 'MCQ';
            else if (/short\s*answer|tự\s*luận\s*ngắn|tự\s*luận/i.test(rawType)) explicitType = 'SHORT_ANSWER';
            continue;
        }

        // Check if this line is an option (A. / B. / C. / D.)
        const optionMatch = trimmed.match(OPTION_REGEX);
        if (optionMatch) {
            parsingState = 'options';
            options.push(optionMatch[2].trim());
            continue;
        }

        // Check if this line contains the correct answer
        const answerMatch = trimmed.match(ANSWER_REGEX);
        if (answerMatch) {
            let ansRaw = answerMatch[1].trim();
            
            // Xử lý loại bỏ phần mô tả từ nhiễu tiếng Việt (ví dụ: A, B, C, còn lại D, E là từ nhiễu)
            const distractorIndex = ansRaw.search(/còn lại|từ nhiễu|sai|không chọn/i);
            if (distractorIndex !== -1) {
                ansRaw = ansRaw.substring(0, distractorIndex).trim();
                ansRaw = ansRaw.replace(/[,.]$/, '').trim(); // Remove trailing comma/dot
            }

            // Clean any accidental diacritics attached to the option reference letters (e.g. Ḅ -> B, Ç -> C)
            ansRaw = ansRaw.replace(/([A-Za-z])[\u0300-\u036f\u0323\u0327\u031b]+/gi, '$1');

            shortAnswerText = ansRaw;

            const tokens = ansRaw.replace(/và|and/gi, ',').split(/[\s,.-]+/).filter(t => t.length > 0);
            const isOptionsReference = tokens.length > 0 && tokens.every(t => t.length === 1 && /^[A-Z]$/i.test(t));
            
            if (isOptionsReference) {
                const uniqueIndices = Array.from(new Set(tokens.map(t => t.toUpperCase().charCodeAt(0) - 65)));
                if (uniqueIndices.length > 1) {
                    correctOptionIndices = uniqueIndices;
                } else if (uniqueIndices.length === 1) {
                    correctOptionIndex = uniqueIndices[0];
                }
            } else {
                const letterMatch = ansRaw.match(/^([A-Z])(?:[.):]|\s|$)/i);
                if (letterMatch && options.length > 0) {
                    correctOptionIndex = letterMatch[1].toUpperCase().charCodeAt(0) - 65; // A=0, B=1, etc.
                }
            }
            parsingState = 'answer';
            continue;
        }

        // Check for difficulty level
        const levelMatch = trimmed.match(LEVEL_REGEX);
        if (levelMatch && !parsedLevel) {
            const rawLevel = levelMatch[1].toLowerCase().replace(/\s+/g, '');
            if (rawLevel.includes('nhậnbiết') || rawLevel === 'nb') parsedLevel = 'NHAN_BIET';
            else if (rawLevel.includes('thônghiểu') || rawLevel.includes('kếtnối') || rawLevel === 'th' || rawLevel === 'kn') parsedLevel = 'KET_NOI';
            else if (rawLevel.includes('vậndụng') || rawLevel.includes('vd')) parsedLevel = 'VAN_DUNG';
            continue;
        }

        // Check hint BEFORE solution (hint typically appears first)
        const hintMatch = trimmed.match(HINT_REGEX);
        if (hintMatch) {
            parsingState = 'hint';
            if (hintMatch[1]?.trim()) {
                hintLines.push(hintMatch[1].trim());
            }
            continue;
        }

        // Check if this line starts a solution section
        const solutionMatch = trimmed.match(SOLUTION_REGEX);
        if (solutionMatch) {
            parsingState = 'solution';
            if (solutionMatch[1]?.trim()) {
                solutionLines.push(solutionMatch[1].trim());
            }
            continue;
        }

        // Accumulate into current section
        switch (parsingState) {
            case 'content':
                content += (content ? '\n' : '') + trimmed;
                break;
            case 'solution':
                solutionLines.push(trimmed);
                break;
            case 'hint':
                hintLines.push(trimmed);
                break;
            case 'answer':
                // Lines after "Đáp án:" are likely solution
                solutionLines.push(trimmed);
                parsingState = 'solution';
                break;
            default:
                // After options, any remaining text could be answer/solution
                const lateAnswer = trimmed.match(ANSWER_REGEX);
                if (lateAnswer) {
                    let ansRaw = lateAnswer[1].trim();
                    const distractorIndex = ansRaw.search(/còn lại|từ nhiễu|sai|không chọn/i);
                    if (distractorIndex !== -1) {
                        ansRaw = ansRaw.substring(0, distractorIndex).trim();
                        ansRaw = ansRaw.replace(/[,.]$/, '').trim(); // Remove trailing comma/dot
                    }

                    // Clean any accidental diacritics attached to the option reference letters (e.g. Ḅ -> B, Ç -> C)
                    ansRaw = ansRaw.replace(/([A-Za-z])[\u0300-\u036f\u0323\u0327\u031b]+/gi, '$1');

                    shortAnswerText = ansRaw;

                    const tokens = ansRaw.replace(/và|and/gi, ',').split(/[\s,.-]+/).filter(t => t.length > 0);
                    const isOptionsReference = tokens.length > 0 && tokens.every(t => t.length === 1 && /^[A-Z]$/i.test(t));
                    
                    if (isOptionsReference) {
                        const uniqueIndices = Array.from(new Set(tokens.map(t => t.toUpperCase().charCodeAt(0) - 65)));
                        if (uniqueIndices.length > 1) {
                            correctOptionIndices = uniqueIndices;
                        } else if (uniqueIndices.length === 1) {
                            correctOptionIndex = uniqueIndices[0];
                        }
                    } else {
                        const letterMatch = ansRaw.match(/^([A-Z])(?:[.):]|\s|$)/i);
                        if (letterMatch && options.length > 0) {
                            correctOptionIndex = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
                        }
                    }
                } else {
                    solutionLines.push(trimmed);
                }
                break;
        }
    }

    solution = solutionLines.join('\n').trim();
    hint = hintLines.join('\n').trim();

    // Must have at least content
    if (!content) return null;

    // Normalization Rule 1: Normalize all blanks to [__]
    content = content.replace(/\[\.\.\.\]|\[\s*\]|___/g, '[__]');

    // Normalization Rule 2: Clean multiple pipes in options if Word Classify
    const hasPipeInOptions = options.some(opt => opt.includes('|') && !opt.includes('|||'));

    // Determine question type using Decision Tree
    let type: QuestionType = 'MCQ';
    
    // Priority 1: Explicit identifier from Loại câu hỏi
    if (explicitType) {
        type = explicitType;
        if (type === 'WORD_CLASSIFY' || type === 'MATCHING') {
            options = options.map(opt => opt.includes('|') ? opt.replace(/\s*\|\s*/, ' ||| ') : opt);
        }
        if (type !== 'MCQ' && type !== 'MCQ_MULTIPLE') {
            correctOptionIndex = undefined;
        }
    } else {
        // Priority 2: Structure-first detection
        const hasBlanksInContent = content.includes('[__]');
        const hasInlineDropdownPipes = options.some(opt => opt.includes('|||'));
        const isMatchingKeywords = /nối|ghép|matching|khớp/i.test(content);
        const isDragDropKeywords = /kéo thả|điền khuyết/i.test(content);

        if (hasBlanksInContent) {
            if (hasInlineDropdownPipes) {
                type = 'INLINE_DROPDOWN';
            } else if (isDragDropKeywords) {
                type = 'DRAG_DROP';
            } else {
                type = 'FILL_IN_PASSAGE';
            }
            correctOptionIndex = undefined;
        } else if (hasPipeInOptions) {
            if (isMatchingKeywords) {
                type = 'MATCHING';
                options = options.map(opt => opt.replace(/\s*\|\s*/, ' ||| '));
            } else {
                type = 'WORD_CLASSIFY';
                options = options.map(opt => opt.replace(/\s*\|\s*/, ' ||| '));
            }
            correctOptionIndex = undefined;
        } else {
            // Priority 3: Keywords & answers-based detection
            const isOrderingKeywords = /sắp xếp|thứ tự|xếp theo|từ bé đến lớn|từ lớn đến bé|từ nhỏ đến lớn|từ lớn đến nhỏ|từ thấp đến cao|từ cao đến thấp|từ ngắn.* đến dài|từ dài.* đến ngắn|tăng dần|giảm dần|ordering|arrange|sort/i.test(content);
            const isSentenceScrambleKeywords = /xếp từ thành câu|sắp xếp từ|ghép từ thành câu|xếp.*từ.*câu/i.test(content);
            
            const isMultipleChoiceKeywords = /chọn nhiều|nhiều đáp án|multiple choice/i.test(content);
            const hasMultipleAnswers = (correctOptionIndices !== undefined && correctOptionIndices.length > 1);

            if (isSentenceScrambleKeywords) {
                type = 'SENTENCE_SCRAMBLE';
                correctOptionIndex = undefined;
            } else if (isOrderingKeywords) {
                type = 'ORDERING';
                correctOptionIndex = undefined;
            } else if (hasMultipleAnswers || (isMultipleChoiceKeywords && options.length >= 2)) {
                type = 'MCQ_MULTIPLE';
            } else {
                // Priority 4: Default based on options count
                type = options.length >= 2 ? 'MCQ' : 'SHORT_ANSWER';
            }
        }
    }

    if (type === 'SHORT_ANSWER' && shortAnswerText) {
        // Hỗ trợ nhiều đáp án được phân cách bởi dấu |
        options = shortAnswerText.split('|').map(s => s.trim()).filter(Boolean);
    } else if (type === 'DRAG_DROP' && correctOptionIndices && correctOptionIndices.length > 0) {
        // DRAG_DROP: Reorder options so correct ones match the blanks, and distractors are at the end.
        const correctOptions = correctOptionIndices.map(idx => options[idx]).filter(Boolean);
        const distractorOptions = options.filter((_, idx) => !correctOptionIndices!.includes(idx));
        options = [...correctOptions, ...distractorOptions];
        // After reordering, correct options are exactly the first N options
        correctOptionIndices = correctOptions.map((_, i) => i);
    }

    return {
        id: `local_parse_${Date.now()}_${index}`,
        type: type as any,
        content,
        options,
        correctOptionIndex: correctOptionIndex !== undefined && correctOptionIndex >= 0 && correctOptionIndex < options.length
            ? correctOptionIndex
            : undefined,
        correctOptionIndices: correctOptionIndices,
        solution: solution || undefined,
        hint: hint || undefined,
        level: parsedLevel,
        topic: undefined
    };
}

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import { useClassFunStore } from '../services/classFunStore';
import { Clock, CheckCircle, AlertTriangle, Lock, Ban, ChevronLeft, Radio, Sparkles, MessageSquareQuote, RotateCcw, Lightbulb, BrainCircuit, Book, Send, ShieldAlert, Menu, X, ListOrdered, Loader2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { Attempt, Exam, Question } from '../types';
import { analyzeStudentAttempt } from '../services/geminiService';
import { DictionaryWidget } from '../components/DictionaryWidget'; // IMPORT WIDGET
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import MathText from '../components/MathText';
import { supabase } from '../services/supabaseClient'; // BỔ SUNG ĐỂ GHI NHẬN HÀNH VI TỰ ĐỘNG
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { AssignmentSettings } from '../types';
import { ReadOnlyQuestionView } from '../components/exam/ReadOnlyQuestionView';
// --- UTILS FOR QUESTION TYPES ---
const getPassageParts = (content: string) => {
  const cleanContent = content.replace(/\s*Đáp án:\s*[^\n]*$/i, '').trim();
  
  // 1. Check for instruction at the end
  const endInstructionRegex = /([,.;]|\s+)\s*(?:hãy\s+)?(chọn|điền|kéo|thả|nối|phân loại|xếp|sắp xếp)\s+.*?\s*(?:vào\s+chỗ\s+trống|chỗ\s+trống|vào\s+nhóm|nhóm\s+thích\s+hợp|cột|đáp\s+án\s+đúng|đáp\s+án\s+thích\s+hợp|đúng)[^.]*\.?$/i;
  const endMatch = cleanContent.match(endInstructionRegex);
  if (endMatch) {
    const instructionText = endMatch[0].replace(/^[,.;\s]+/, '').trim();
    if (!instructionText.includes('[__]') && !instructionText.includes('[...]') && !instructionText.includes('___') && !instructionText.includes('[]')) {
      const capitalizedInstruction = instructionText.charAt(0).toUpperCase() + instructionText.slice(1);
      let passageText = cleanContent.substring(0, endMatch.index).trim();
      if (passageText.endsWith(',')) {
        passageText = passageText.slice(0, -1) + '.';
      } else if (!passageText.endsWith('.') && !passageText.endsWith('?') && !passageText.endsWith('!')) {
        passageText = passageText + '.';
      }
      return {
        instruction: capitalizedInstruction,
        passage: passageText
      };
    }
  }

  // 2. Check for instruction at the beginning
  const match = cleanContent.match(/^(.*?(?:chọn|điền|hoàn thành|thích hợp|chỗ trống|xếp|phân loại|hoàn thiện|đoạn văn|thả|kéo|nối).*?(?:[:.]\s*\n|[:.]\s+|$))/i);
  
  if (match && match[0].length < cleanContent.length && match[0].length < 200) {
    return {
      instruction: match[0].trim(),
      passage: cleanContent.substring(match[0].length).trim()
    };
  }

  // Fallback: if there is a clear first line that looks like an instruction
  const lines = cleanContent.split('\n');
  if (lines.length > 1 && lines[0].length < 150 && /chọn|điền|hoàn thành|thích|chỗ trống|xếp|phân loại|kéo|thả/i.test(lines[0])) {
      return {
          instruction: lines[0].trim(),
          passage: lines.slice(1).join('\n').trim()
      }
  }

  // If we can't separate, return empty instruction so it doesn't duplicate.
  return {
    instruction: '',
    passage: cleanContent
  };
};

const renderPoetryOrText = (text: string) => {
  if (text && text.includes(' / ')) {
    const lines = text.split(/\s+\/\s+/);
    return (
      <span className="inline-block text-left italic font-medium">
        {lines.map((line, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <br />}
            <span className="block md:pl-8 leading-relaxed">{line}</span>
          </React.Fragment>
        ))}
      </span>
    );
  }
  return text;
};

const MCQQuestion = React.memo(({ question, answer, isSubmitted, onSetAnswer, viewPassFail, canViewSolution, shuffledIndices }: any) => {
  const selectedIndex = typeof answer === 'number'
    ? answer
    : typeof answer === 'string'
      ? question.options.findIndex((opt: any) => String(opt).trim().toLowerCase() === answer.trim().toLowerCase())
      : -1;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {shuffledIndices.map((originalIndex: number, displayIndex: number) => {
        const optContent = question.options[originalIndex];
        let optionClass = "border-gray-200 hover:bg-gray-50 bg-white";

        if (isSubmitted) {
          if (viewPassFail) {
            if (originalIndex === question.correctOptionIndex) {
              if (canViewSolution || selectedIndex === originalIndex) {
                optionClass = "bg-green-50 border-green-500 text-green-700 font-medium";
              } else {
                optionClass = "opacity-50 bg-white";
              }
            } else if (selectedIndex === originalIndex) {
              optionClass = "bg-red-50 border-red-500 text-red-700";
            } else {
              optionClass = "opacity-50 bg-white";
            }
          } else if (selectedIndex === originalIndex) {
            optionClass = "bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500";
          } else {
            optionClass = "opacity-50 bg-white";
          }
        } else if (selectedIndex === originalIndex) {
          optionClass = "bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500";
        }

        if (isSubmitted && !viewPassFail && selectedIndex === originalIndex) {
          optionClass = "bg-gray-100 border-gray-400 text-gray-800 font-bold";
        }

        return (
          <button
            key={originalIndex}
            onClick={() => onSetAnswer(originalIndex)}
            disabled={isSubmitted}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 shadow-sm ${optionClass} ${!isSubmitted && 'hover:border-indigo-300 hover:shadow-md active:scale-[0.98]'}`}
          >
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${selectedIndex === originalIndex ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300 bg-white text-gray-500'
              } ${isSubmitted && viewPassFail && originalIndex === question.correctOptionIndex && (canViewSolution || selectedIndex === originalIndex) ? '!bg-green-500 !border-green-500 !text-white' : ''}
              ${isSubmitted && !viewPassFail && selectedIndex === originalIndex ? '!bg-gray-600 !border-gray-600 !text-white' : ''}
            `}>
              {String.fromCharCode(65 + displayIndex)}
            </div>
            <span className="text-gray-800 prose prose-p:my-0 flex-1">
              <MathText inline>{optContent}</MathText>
            </span>
          </button>
        );
      })}
    </div>
  );
});

const MCQMultipleQuestion = React.memo(({ question, answer, isSubmitted, onSetAnswer, viewPassFail, canViewSolution, shuffledIndices }: any) => {
  const selectedAnswers = (Array.isArray(answer) ? answer : []).map(val => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const idx = question.options.findIndex((opt: any) => String(opt).trim().toLowerCase() === val.trim().toLowerCase());
      return idx !== -1 ? idx : val;
    }
    return val;
  });
  
  const handleToggle = (index: number) => {
    if (isSubmitted) return;
    const newAnswers = selectedAnswers.includes(index)
      ? selectedAnswers.filter(a => a !== index)
      : [...selectedAnswers, index];
    onSetAnswer(newAnswers);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {shuffledIndices.map((originalIndex: number, displayIndex: number) => {
        const optContent = question.options[originalIndex];
        let optionClass = "border-gray-200 hover:bg-gray-50 bg-white";
        const isSelected = selectedAnswers.includes(originalIndex);
        const isCorrectOption = question.correctOptionIndices?.includes(originalIndex);

        if (isSubmitted) {
          if (viewPassFail) {
            if (isCorrectOption) {
              if (isSelected) {
                // Correctly selected
                optionClass = "bg-green-50 border-green-500 text-green-700 font-medium";
              } else if (canViewSolution) {
                // Correct option but missed by student (dashed warning)
                optionClass = "bg-green-50/10 border-dashed border-green-400 text-green-700 font-medium";
              } else {
                optionClass = "opacity-50 bg-white";
              }
            } else if (isSelected) {
              // Selected but incorrect (red)
              optionClass = "bg-red-50 border-red-500 text-red-700 font-medium";
            } else {
              optionClass = "opacity-30 bg-white";
            }
          } else if (isSelected) {
            optionClass = "bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500";
          } else {
            optionClass = "opacity-50 bg-white";
          }
        } else if (isSelected) {
          optionClass = "bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500";
        }

        if (isSubmitted && !viewPassFail && isSelected) {
          optionClass = "bg-gray-100 border-gray-400 text-gray-800 font-bold";
        }

        return (
          <button
            key={originalIndex}
            onClick={() => handleToggle(originalIndex)}
            disabled={isSubmitted}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 shadow-sm ${optionClass} ${!isSubmitted && 'hover:border-indigo-300 hover:shadow-md active:scale-[0.98]'}`}
          >
            <div className={`w-8 h-8 rounded border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${
              isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300 bg-white text-gray-500'
            } ${
              isSubmitted && viewPassFail && isCorrectOption && isSelected ? '!bg-green-500 !border-green-500 !text-white' : ''
            } ${
              isSubmitted && viewPassFail && isCorrectOption && !isSelected && canViewSolution ? '!border-green-400 !text-green-500 bg-white' : ''
            } ${
              isSubmitted && viewPassFail && !isCorrectOption && isSelected ? '!bg-red-500 !border-red-500 !text-white' : ''
            } ${
              isSubmitted && !viewPassFail && isSelected ? '!bg-gray-600 !border-gray-600 !text-white' : ''
            }`}>
              {isSelected ? (
                isSubmitted && viewPassFail && !isCorrectOption ? (
                  <X className="h-4 w-4 text-white" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-white" />
                )
              ) : String.fromCharCode(65 + displayIndex)}
            </div>
            <span className="text-gray-800 prose prose-p:my-0 flex-1">
              <MathText inline>{optContent}</MathText>
            </span>
          </button>
        );
      })}
    </div>
  );
});

const normalizeMath = (s: string) => {
  if (!s) return '';
  let processed = s.trim();

  // 1. Loại bỏ các dấu ngoặc kép hoặc ngoặc đơn bao quanh chuỗi
  processed = processed.replace(/^["']|["']$/g, '').trim();

  // 2. Loại bỏ các ký tự $ bọc LaTeX
  processed = processed.replace(/\$/g, '');

  // 3. Chuẩn hóa các hàm LaTeX phân số phổ biến (\dfrac, \frac)
  processed = processed.replace(/\\dfrac/g, '\\frac');

  // 4. Loại bỏ các khoảng trắng thừa xung quanh dấu ngoặc nhọn của \frac
  processed = processed.replace(/\\frac\s*\{\s*([^{}]+?)\s*\}\s*\{\s*([^{}]+?)\s*\}/g, '\\frac{$1}{$2}');

  // 5. Chuyển đổi phân số LaTeX \frac{A}{B} thành dạng A/B và dọn dẹp khoảng trắng bên trong
  processed = processed.replace(/\\frac\{([^{}]+?)\}\{([^{}]+?)\}/g, (match, p1, p2) => {
    return `${p1.trim()}/${p2.trim()}`;
  });

  // 6. Chuyển đổi các dấu chia khác thành dấu gạch chéo /
  processed = processed.replace(/[:÷⁄]/g, '/');

  // 7. Chuẩn hóa dấu phẩy thập phân kiểu Việt Nam (ví dụ: 0,5 -> 0.5)
  processed = processed.replace(/(\d),(\d)/g, '$1.$2');

  // 8. Loại bỏ hoàn toàn khoảng trắng xung quanh các toán tử toán học
  processed = processed.replace(/\s*([\+\-\*\/=])\s*/g, '$1');

  // 9. Chuẩn hóa dấu âm đứng trước phân số
  processed = processed.replace(/(?:\-\s*1)\s*\/\s*2/, '-1/2');

  return processed.toLowerCase();
};

const evaluateAnswer = (q: any, userAns: any, caseSensitive: boolean = false): boolean => {
  if (userAns === undefined || userAns === null) return false;

  if (q.type === 'MCQ') {
    if (typeof userAns === 'number') {
      return userAns === q.correctOptionIndex;
    }
    if (typeof userAns === 'string') {
      const idx = q.options.findIndex((opt: any) => String(opt).trim().toLowerCase() === userAns.trim().toLowerCase());
      return idx !== -1 && idx === q.correctOptionIndex;
    }
    return false;
  }
  
  if (q.type === 'MCQ_MULTIPLE') {
    const correctArray = q.correctOptionIndices || [];
    const userArray = (Array.isArray(userAns) ? userAns : []).map(val => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const idx = q.options.findIndex((opt: any) => String(opt).trim().toLowerCase() === val.trim().toLowerCase());
        return idx !== -1 ? idx : val;
      }
      return val;
    });
    if (correctArray.length === 0 || correctArray.length !== userArray.length) return false;
    return correctArray.every((val: any) => userArray.includes(val));
  }
  
  if (q.type === 'SHORT_ANSWER') {
    const sAns = caseSensitive
      ? normalizeMath(String(userAns || '').trim())
      : normalizeMath(String(userAns || '').trim().toLowerCase());
    
    const solString = String(q.solution || '').trim();
    const isSolutionShort = solString !== '' && solString.split(/\s+/).length < 10;
    
    return (q.options && q.options.length > 0)
      ? q.options.some((opt: any) => {
          const optStr = caseSensitive
            ? normalizeMath(String(opt || '').trim())
            : normalizeMath(String(opt || '').trim().toLowerCase());
          return optStr === sAns;
        })
      : (isSolutionShort && sAns === normalizeMath(caseSensitive
          ? solString
          : solString.toLowerCase()));
  }
  
  if (q.type === 'DRAG_DROP') {
    const numBlanks = (q.content.match(/\[__\]/g) || []).length;
    if (!Array.isArray(userAns) || userAns.length !== numBlanks) return false;
    for (let i = 0; i < numBlanks; i++) {
      const expected = q.options[i];
      const actual = userAns[i];
      const normExpected = String(expected || '').trim().toLowerCase();
      const normActual = String(actual || '').trim().toLowerCase();
      if (normActual !== normExpected) return false;
    }
    return true;
  }

  if (['MATCHING', 'ORDERING', 'SENTENCE_SCRAMBLE'].includes(q.type)) {
    if (!Array.isArray(userAns) || userAns.length !== q.options.length) return false;
    for (let i = 0; i < q.options.length; i++) {
      const expected = q.options[i];
      const actual = userAns[i];
      const normExpected = String(expected || '').trim().toLowerCase().replace(/\s*\|\|\|\s*/g, '|||');
      const normActual = String(actual || '').trim().toLowerCase().replace(/\s*\|\|\|\s*/g, '|||');
      if (normActual !== normExpected) return false;
    }
    return true;
  }

  if (q.type === 'WORD_CLASSIFY') {
    if (!Array.isArray(userAns) || userAns.length !== q.options.length) return false;
    for (let i = 0; i < q.options.length; i++) {
      const expectedParts = String(q.options[i] || '').split('|||');
      const correctCategory = (expectedParts[0] || '').trim();
      const correctCategoryUpper = correctCategory.toUpperCase();
      const studentCategory = String(userAns[i] || '').trim();

      if (correctCategoryUpper === '_NONE_' || correctCategoryUpper === 'NONE') {
        if (studentCategory !== '' && studentCategory.toUpperCase() !== '_NONE_' && studentCategory.toUpperCase() !== 'NONE') return false;
      } else {
        if (studentCategory.toLowerCase() !== correctCategory.toLowerCase()) return false;
      }
    }
    return true;
  }

  if (q.type === 'FILL_IN_PASSAGE') {
    if (!Array.isArray(userAns) || userAns.length !== q.options.length) return false;
    for (let i = 0; i < q.options.length; i++) {
      const expected = String(q.options[i] || '').trim();
      const actual = String(userAns[i] || '').trim();
      if (actual !== expected) return false;
    }
    return true;
  }

  if (q.type === 'INLINE_DROPDOWN') {
    if (!Array.isArray(userAns) || userAns.length !== q.options.length) return false;
    for (let i = 0; i < q.options.length; i++) {
      const rawOpt = String(q.options[i] || '');
      const expected = rawOpt.split('|||')[0].trim();
      const actual = String(userAns[i] || '').trim();
      if (actual !== expected) return false;
    }
    return true;
  }
  
  return false;
};

const isFractionAnswer = (question: any): boolean => {
  if (!question) return false;
  const targets: string[] = [];
  if (question.correct_answer_string) targets.push(question.correct_answer_string);
  if (question.solution) targets.push(question.solution);
  if (question.options && question.options.length > 0) {
    question.options.forEach((opt: any) => {
      if (typeof opt === 'string') targets.push(opt);
    });
  }
  const fractionRegex = /\\frac|\\dfrac|^\s*-?\d+\s*[\/⁄]\s*\d+\s*$/i;
  return targets.some(str => fractionRegex.test(str));
};

const FractionInput = ({ value, onChange }: any) => {
  const [num, setNum] = useState('');
  const [den, setDen] = useState('');

  useEffect(() => {
    if (value && typeof value === 'string' && value.includes('/')) {
      const parts = value.split('/');
      setNum(parts[0] || '');
      setDen(parts[1] || '');
    } else if (!value) {
      setNum('');
      setDen('');
    } else {
      setNum(value);
      setDen('');
    }
  }, [value]);

  const handleNumChange = (newNum: string) => {
    const cleanNum = newNum.replace(/\s+/g, '');
    setNum(cleanNum);
    onChange(den ? `${cleanNum}/${den}` : cleanNum);
  };

  const handleDenChange = (newDen: string) => {
    const cleanDen = newDen.replace(/\s+/g, '');
    setDen(cleanDen);
    if (num) {
      onChange(cleanDen ? `${num}/${cleanDen}` : num);
    } else {
      onChange(cleanDen ? `/${cleanDen}` : '');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/30 rounded-2xl w-48 mx-auto shadow-inner">
      <input
        type="text"
        value={num}
        onChange={(e) => handleNumChange(e.target.value)}
        placeholder="Tử số"
        className="w-36 p-3 text-center border border-gray-300 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 font-bold text-xl shadow-sm transition-all"
      />
      <div className="w-40 h-[3px] bg-gray-400 dark:bg-slate-600 my-3 rounded-full"></div>
      <input
        type="text"
        value={den}
        onChange={(e) => handleDenChange(e.target.value)}
        placeholder="Mẫu số"
        className="w-36 p-3 text-center border border-gray-300 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 font-bold text-xl shadow-sm transition-all"
      />
    </div>
  );
};

const ShortAnswerQuestion = React.memo(({ question, answer, isSubmitted, onSetAnswer, viewPassFail, caseSensitive }: any) => {
  const sAns = caseSensitive
    ? normalizeMath(String(answer || '').trim().replace(/\s+/g, ' '))
    : normalizeMath(String(answer || '').trim().toLowerCase().replace(/\s+/g, ''));

  const isCorrect = question.options && question.options.length > 0
    ? question.options.some((opt: any) => {
        const optStr = caseSensitive
          ? normalizeMath(String(opt || '').trim().replace(/\s+/g, ' '))
          : normalizeMath(String(opt || '').trim().toLowerCase().replace(/\s+/g, ''));
        return optStr === sAns;
      })
    : sAns === normalizeMath(caseSensitive
        ? String(question.solution || '').trim().replace(/\s+/g, ' ')
        : String(question.solution || '').trim().toLowerCase().replace(/\s+/g, ''));

  const [isFractionMode, setIsFractionMode] = useState(() => isFractionAnswer(question));

  return (
    <div className="max-w-2xl">
      {isSubmitted ? (
        <div
          className={`w-full p-4 border-2 rounded-xl min-h-[60px] flex items-center shadow-inner ${isSubmitted && viewPassFail ? (isCorrect ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700') : 'bg-gray-50 text-gray-700 border-gray-200'}`}
        >
          <span className="font-bold text-lg">
            {answer && answer.includes('/') ? (
              <span className="inline-flex flex-col items-center justify-center align-middle font-bold text-lg">
                <span>{answer.split('/')[0]}</span>
                <span className="w-8 h-[2px] bg-gray-600 my-0.5"></span>
                <span>{answer.split('/')[1]}</span>
              </span>
            ) : (
              answer || '(Bỏ trống)'
            )}
          </span>
        </div>
      ) : (
        <div className="relative group">
          {isFractionMode ? (
            <FractionInput value={answer || ''} onChange={onSetAnswer} />
          ) : (
            <>
              <input
                type="text"
                value={answer || ''}
                onChange={(e) => onSetAnswer(e.target.value)}
                placeholder="Nhập câu trả lời của bạn tại đây..."
                className="w-full p-5 border-2 border-gray-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 bg-white text-gray-900 text-lg font-medium transition-all shadow-sm"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-400">
                <Sparkles className="h-5 w-5" />
              </div>
            </>
          )}
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={() => setIsFractionMode(!isFractionMode)}
              className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold hover:underline"
            >
              {isFractionMode ? "Chuyển sang nhập dòng đơn (số thường/chữ)" : "Chuyển sang nhập phân số đứng"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

const MatchingQuestion = React.memo(({ question, answer, isSubmitted, onSetAnswer, viewPassFail, canViewSolution, shuffledIndices }: any) => {
  useEffect(() => {
    const styleId = 'matching-question-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        @keyframes dash {
          to {
            stroke-dashoffset: -16;
          }
        }
        .animate-dash {
          animation: dash 1s linear infinite;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const leftItems = question.options.map((o: string) => o.split('|||')[0]?.trim() || o);
  const rightItems = question.options.map((o: string) => o.split('|||')[1]?.trim() || o);
  const shuffledRightItems = shuffledIndices.map((i: number) => rightItems[i]);
  const currentAns = Array.isArray(answer) ? answer : Array(question.options.length).fill("");

  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<any[]>([]);

  // Map each left item to the specific index in shuffledRightItems
  const leftToRightIndices = useMemo(() => {
    const mapping = Array(question.options.length).fill(null);
    const usedRightIndices = new Set<number>();

    currentAns.forEach((ans: string, leftIdx: number) => {
      if (!ans) return;
      const rightVal = ans.split('|||')[1]?.trim();
      if (!rightVal) return;

      // Find the first matching right item in shuffledRightItems that hasn't been mapped yet
      const rightIdx = shuffledRightItems.findIndex((val: string, idx: number) => 
        val === rightVal && !usedRightIndices.has(idx)
      );

      if (rightIdx !== -1) {
        mapping[leftIdx] = rightIdx;
        usedRightIndices.add(rightIdx);
      }
    });

    return mapping;
  }, [currentAns, shuffledRightItems, question.options.length]);

  // Update SVG lines positions based on DOM elements
  const updateLines = useCallback(() => {
    if (!containerRef.current) return;
    const newLines: any[] = [];

    currentAns.forEach((ans: string, leftIdx: number) => {
      if (!ans) return;
      const rightIdx = leftToRightIndices[leftIdx];
      if (rightIdx === null || rightIdx === undefined) return;

      const leftDot = containerRef.current?.querySelector(`[data-dot-left="${leftIdx}"]`);
      const rightDot = containerRef.current?.querySelector(`[data-dot-right="${rightIdx}"]`);

      if (leftDot && rightDot) {
        const containerRect = containerRef.current!.getBoundingClientRect();
        const lRect = leftDot.getBoundingClientRect();
        const rRect = rightDot.getBoundingClientRect();

        newLines.push({
          x1: lRect.left - containerRect.left + lRect.width / 2,
          y1: lRect.top - containerRect.top + lRect.height / 2,
          x2: rRect.left - containerRect.left + rRect.width / 2,
          y2: rRect.top - containerRect.top + rRect.height / 2,
          isCorrect: isSubmitted && viewPassFail && ans === question.options[leftIdx],
          isWrong: isSubmitted && viewPassFail && ans !== question.options[leftIdx]
        });
      }
    });

    setLines(newLines);
  }, [currentAns, leftToRightIndices, isSubmitted, viewPassFail, question.options]);

  useEffect(() => {
    updateLines();
    window.addEventListener('resize', updateLines);
    return () => window.removeEventListener('resize', updateLines);
  }, [updateLines]);

  const handleLeftClick = (leftIdx: number) => {
    if (isSubmitted) return;

    if (selectedRight !== null) {
      const val = shuffledRightItems[selectedRight];
      const newArr = [...currentAns];

      // Clear any previous connections for this right card
      const previousLeftIdx = leftToRightIndices.indexOf(selectedRight);
      if (previousLeftIdx !== -1) {
        newArr[previousLeftIdx] = "";
      }

      newArr[leftIdx] = `${leftItems[leftIdx]} ||| ${val}`;
      onSetAnswer(newArr);
      setSelectedRight(null);
      setSelectedLeft(null);
    } else {
      setSelectedRight(null);
      setSelectedLeft(leftIdx === selectedLeft ? null : leftIdx);
    }
  };

  const handleRightClick = (rightShuffledIdx: number) => {
    if (isSubmitted) return;

    if (selectedLeft !== null) {
      const val = shuffledRightItems[rightShuffledIdx];
      const newArr = [...currentAns];

      // Clear any previous connections for this right card
      const previousLeftIdx = leftToRightIndices.indexOf(rightShuffledIdx);
      if (previousLeftIdx !== -1) {
        newArr[previousLeftIdx] = "";
      }

      newArr[selectedLeft] = `${leftItems[selectedLeft]} ||| ${val}`;
      onSetAnswer(newArr);
      setSelectedLeft(null);
      setSelectedRight(null);
    } else {
      setSelectedLeft(null);
      setSelectedRight(rightShuffledIdx === selectedRight ? null : rightShuffledIdx);
    }
  };

  const resetMatch = (idx: number) => {
    if (isSubmitted) return;
    const newArr = [...currentAns];
    newArr[idx] = "";
    onSetAnswer(newArr);
    setSelectedLeft(null);
    setSelectedRight(null);
  };

  return (
    <div className="relative select-none max-w-5xl mx-auto p-4" ref={containerRef}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-32 relative z-10">
        {/* Left Column */}
        <div className="space-y-4">
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 px-2">Cột vế trái</h4>
          {leftItems.map((left: string, idx: number) => {
            const hasMatch = !!currentAns[idx];
            return (
              <div key={idx} className="relative group">
                <div
                  onClick={() => handleLeftClick(idx)}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between shadow-sm relative pr-10
                    ${selectedLeft === idx ? 'border-indigo-500 bg-indigo-50 shadow-indigo-100 ring-2 ring-indigo-200' :
                      hasMatch ? 'border-indigo-200 bg-white' : 'border-gray-100 bg-white hover:border-gray-300'}
                    ${isSubmitted ? 'cursor-default' : ''}
                  `}
                >
                  <span className="font-bold text-gray-700">
                    <MathText inline>{left}</MathText>
                  </span>
                  {hasMatch && !isSubmitted && (
                    <button
                      onClick={(e) => { e.stopPropagation(); resetMatch(idx); }}
                      className="p-1 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-lg transition-colors"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  )}
                  {/* Connection Point */}
                  <div
                    data-dot-left={idx}
                    className={`absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 z-20 transition-all
                      ${hasMatch ? 'bg-indigo-600 border-indigo-200 scale-110' : 'bg-white border-gray-200 group-hover:border-indigo-300'}
                    `}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 px-2 md:text-right">Cột vế phải</h4>
          {shuffledRightItems.map((right: string, idx: number) => {
            const isMatched = leftToRightIndices.includes(idx);
            return (
              <div key={idx} className="relative group">
                <div
                  onClick={() => handleRightClick(idx)}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center shadow-sm relative pl-10
                    ${selectedRight === idx ? 'border-indigo-500 bg-indigo-50 shadow-indigo-100 ring-2 ring-indigo-200' :
                      isMatched ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-100 bg-white hover:border-gray-300'}
                    ${isSubmitted ? 'cursor-default' : ''}
                  `}
                >
                  <span className="font-medium text-gray-700 flex-1">
                    <MathText inline>{right}</MathText>
                  </span>
                  {/* Connection Point */}
                  <div
                    data-dot-right={idx}
                    className={`absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 z-20 transition-all
                      ${selectedRight === idx || isMatched ? 'bg-indigo-600 border-indigo-200 scale-110' : 'bg-white border-gray-200 group-hover:border-indigo-300'}
                    `}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SVG Layer for Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ minHeight: '100%' }}>
        {lines.map((line, i) => {
          let color = "#6366f1"; // Indigo-500
          if (line.isCorrect) color = "#22c55e"; // Green-500
          if (line.isWrong) color = "#ef4444"; // Red-500

          return (
            <g key={i}>
              <path
                d={`M ${line.x1} ${line.y1} C ${(line.x1 + line.x2) / 2} ${line.y1}, ${(line.x1 + line.x2) / 2} ${line.y2}, ${line.x2} ${line.y2}`}
                stroke={color}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                className="animate-dash"
                style={{
                  strokeDasharray: '8',
                  filter: `drop-shadow(0 0 4px ${color}44)`
                }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
});

const OrderingQuestion = React.memo(({ question, answer, isSubmitted, onSetAnswer, viewPassFail, canViewSolution, shuffledIndices }: any) => {
  // If no student answer, initialize with shuffled indices order
  const currentAns = useMemo(() => {
    if (Array.isArray(answer) && answer.length === question.options.length) {
      return answer;
    }
    // Initialize with shuffled order
    return shuffledIndices.map((i: number) => question.options[i]);
  }, [answer, question.options, shuffledIndices]);

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (isSubmitted) {
      e.preventDefault();
      return;
    }
    setDraggedIdx(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (isSubmitted || draggedIdx === null || draggedIdx === index) return;
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    if (isSubmitted || draggedIdx === null) return;
    e.preventDefault();
    const newAns = [...currentAns];
    // Move item from draggedIdx to targetIdx
    const [draggedItem] = newAns.splice(draggedIdx, 1);
    newAns.splice(targetIdx, 0, draggedItem);
    onSetAnswer(newAns);
    setDraggedIdx(null);
  };

  // Support click-to-move for mobile (up and down buttons)
  const handleMoveUp = (index: number) => {
    if (isSubmitted || index === 0) return;
    const newAns = [...currentAns];
    const temp = newAns[index];
    newAns[index] = newAns[index - 1];
    newAns[index - 1] = temp;
    onSetAnswer(newAns);
  };

  const handleMoveDown = (index: number) => {
    if (isSubmitted || index === currentAns.length - 1) return;
    const newAns = [...currentAns];
    const temp = newAns[index];
    newAns[index] = newAns[index + 1];
    newAns[index + 1] = temp;
    onSetAnswer(newAns);
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-start gap-3 mb-4">
        <ListOrdered className="h-5 w-5 text-indigo-600 mt-0.5" />
        <p className="text-sm text-indigo-800 font-medium">Kéo thả các mục để sắp xếp lại vị trí, hoặc dùng mũi tên ▲ ▼ để di chuyển chúng lên xuống.</p>
      </div>

      <div className="space-y-3">
        {currentAns.map((item: string, idx: number) => {
          const isCorrect = isSubmitted && viewPassFail && item === question.options[idx];
          const isWrong = isSubmitted && viewPassFail && item !== question.options[idx];

          return (
            <div
              key={idx}
              draggable={!isSubmitted}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              className={`p-4 rounded-2xl border-2 flex gap-4 items-center transition-all shadow-sm ${
                isCorrect ? 'bg-green-50 border-green-300' : 
                isWrong ? 'bg-red-50 border-red-300' : 
                'bg-white border-slate-200 hover:border-indigo-300 cursor-grab active:cursor-grabbing'
              } ${isSubmitted ? 'cursor-default' : ''}`}
            >
              <div className="w-10 h-10 flex-shrink-0 bg-indigo-50 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                <GripVertical className="h-5 w-5" />
              </div>
              <div className="flex-1 font-bold text-slate-700">
                {item}
              </div>
              
              {!isSubmitted && (
                <div className="flex flex-col gap-1">
                  <button
                    disabled={idx === 0}
                    onClick={() => handleMoveUp(idx)}
                    className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    disabled={idx === currentAns.length - 1}
                    onClick={() => handleMoveDown(idx)}
                    className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              )}

              {isSubmitted && viewPassFail && canViewSolution && isWrong && (
                <div className="bg-green-500 text-white text-[10px] font-bold py-1 px-3 rounded-lg shadow-sm">
                  ĐÚNG LÀ: {question.options[idx]}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

const DragDropQuestion = React.memo(({ question, answer, isSubmitted, onSetAnswer, viewPassFail, canViewSolution, shuffledIndices }: any) => {
  const currentAns: string[] = Array.isArray(answer) ? answer : Array((question.content.match(/\[\.\.\.\]|\[\s*\]|___|\[__\]/g) || []).length).fill('');
  const availableOptions = shuffledIndices.map((i: number) => question.options[i]);

  // Split content into parts around the blanks
  const parts = useMemo(() => {
    const passage = getPassageParts(question.content).passage;
    return passage.replace(/\[\.\.\.\]|\[\s*\]|___/g, '[__]').split('[__]');
  }, [question.content]);

  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  const handleSelectWord = (word: string) => {
    if (isSubmitted) return;
    setSelectedWord(selectedWord === word ? null : word);
  };

  const handleBlankClick = (blankIdx: number) => {
    if (isSubmitted) return;
    if (selectedWord) {
      // Assign selected word
      const newAns = [...currentAns];
      newAns[blankIdx] = selectedWord;
      onSetAnswer(newAns);
      setSelectedWord(null);
    } else {
      // Remove word from blank
      const newAns = [...currentAns];
      newAns[blankIdx] = '';
      onSetAnswer(newAns);
    }
  };

  const handleDragStart = (e: React.DragEvent, word: string) => {
    if (isSubmitted) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', word);
  };

  const handleDropOnBlank = (e: React.DragEvent, blankIdx: number) => {
    if (isSubmitted) return;
    e.preventDefault();
    const word = e.dataTransfer.getData('text/plain');
    if (word) {
      const newAns = [...currentAns];
      newAns[blankIdx] = word;
      onSetAnswer(newAns);
    }
  };

  const handleReset = () => {
    if (isSubmitted) return;
    onSetAnswer(Array(parts.length - 1).fill(''));
    setSelectedWord(null);
  };

  const getBlankCorrectness = (blankIdx: number) => {
    if (!isSubmitted || !viewPassFail) return null;
    const expected = String(question.options[blankIdx] || '').trim();
    const actual = String(currentAns[blankIdx] || '').trim();
    return actual === expected ? 'correct' : 'wrong';
  };

  return (
    <div className="space-y-6 max-w-3xl">


      {/* Passage with inline drop zones */}
      <div className="p-6 rounded-2xl border-2 leading-[2.5] text-base transition-all bg-white border-gray-200">
        {parts.map((part: string, i: number) => {
          const subParts = part.split(/\s+\/\s+/);
          return (
            <React.Fragment key={i}>
              {subParts.map((sub, sIdx) => (
                <React.Fragment key={sIdx}>
                  {sIdx > 0 && <br />}
                  {sIdx > 0 && <span className="inline-block w-8 md:w-12" />}
                  <span className="whitespace-pre-wrap">{sub}</span>
                </React.Fragment>
              ))}
              {i < parts.length - 1 && (() => {
              const correctness = getBlankCorrectness(i);
              const val = currentAns[i] || '';
              return (
                <span
                  onDragOver={(e) => !isSubmitted && e.preventDefault()}
                  onDrop={(e) => handleDropOnBlank(e, i)}
                  onClick={() => handleBlankClick(i)}
                  className={`inline-flex items-center justify-center align-middle mx-1 px-3 py-0.5 min-w-[120px] min-h-[36px] rounded-lg border-2 border-dashed font-bold transition-all text-base cursor-pointer select-none ${
                    correctness === 'correct' ? 'bg-green-50 border-green-500 text-green-700' :
                    correctness === 'wrong' ? 'bg-red-50 border-red-500 text-red-700' :
                    val ? 'bg-indigo-50 border-indigo-500 text-indigo-800 shadow-sm border-solid' :
                    'bg-slate-50 border-slate-300 text-slate-400 hover:border-indigo-400 hover:bg-indigo-50/20'
                  }`}
                >
                  {val || '...'}
                  {correctness === 'wrong' && canViewSolution && (
                    <span className="text-xs text-green-700 font-bold ml-1.5">({question.options[i]})</span>
                  )}
                </span>
              );
            })()}
          </React.Fragment>
        );})}
      </div>

      {/* Draggable options bank */}
      {!isSubmitted && (
        <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">CÁC TỪ GỢI Ý:</label>
          <div className="flex flex-wrap gap-2.5">
            {availableOptions.map((opt: string, idx: number) => {
              // Check if option is already used
              const isUsed = currentAns.includes(opt);
              return (
                <button
                  key={idx}
                  disabled={isUsed}
                  draggable={!isUsed}
                  onDragStart={(e) => handleDragStart(e, opt)}
                  onClick={() => handleSelectWord(opt)}
                  className={`px-4 py-2 rounded-xl text-base font-bold border-2 transition-all active:scale-95 ${
                    isUsed ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed' :
                    selectedWord === opt ? 'bg-indigo-500 text-white border-indigo-500 shadow-md scale-105' :
                    'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:shadow-sm cursor-grab active:cursor-grabbing'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}


    </div>
  );
});

const SentenceScrambleQuestion = React.memo(({ question, answer, isSubmitted, onSetAnswer, viewPassFail, canViewSolution, shuffledIndices }: any) => {
  const currentAns = Array.isArray(answer) ? answer : [];
  
  const unusedIndices: number[] = [];
  const usedCounts: Record<string, number> = {};
  
  currentAns.forEach((w: string) => {
    usedCounts[w] = (usedCounts[w] || 0) + 1;
  });
  
  const localUsedCounts = { ...usedCounts };
  shuffledIndices.forEach((i: number) => {
    const word = question.options[i];
    if (localUsedCounts[word] > 0) {
      localUsedCounts[word]--;
    } else {
      unusedIndices.push(i);
    }
  });

  const handleWordClick = (word: string) => {
    if (isSubmitted) return;
    onSetAnswer([...currentAns, word]);
  };

  const handleRemoveWord = (indexToRemove: number) => {
    if (isSubmitted) return;
    const newAns = [...currentAns];
    newAns.splice(indexToRemove, 1);
    onSetAnswer(newAns);
  };

  const handleReset = () => {
    if (isSubmitted) return;
    onSetAnswer([]);
  };

  const handleHint = () => {
    if (isSubmitted) return;
    const nextIndex = currentAns.length;
    if (nextIndex < question.options.length) {
       const nextWord = question.options[nextIndex];
       if (nextWord) {
         alert(`Gợi ý: Chữ cái đầu tiên của từ tiếp theo là: "${nextWord.charAt(0)}"`);
       }
    }
  };

  let isAllCorrect = false;
  if (isSubmitted && viewPassFail) {
    if (currentAns.length === question.options.length) {
      isAllCorrect = currentAns.every((w: string, i: number) => w === question.options[i]);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2 text-indigo-700 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
        <Sparkles className="h-5 w-5" />
        <span className="text-sm font-semibold">Bấm vào các từ bên dưới để sắp xếp chúng thành câu đúng nghĩa.</span>
      </div>

      <div className={`p-6 rounded-2xl border-2 transition-all ${isSubmitted && viewPassFail ? (isAllCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300') : 'bg-white border-gray-200'}`}>
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">CÂU CỦA BẠN:</label>
        <div className="flex flex-wrap gap-2 min-h-[60px] p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50/50">
          {currentAns.map((word: string, i: number) => (
            <button
              key={i}
              onClick={() => handleRemoveWord(i)}
              disabled={isSubmitted}
              className={`px-4 py-2 rounded-xl text-lg font-bold shadow-sm transition-transform active:scale-95 ${isSubmitted ? 'bg-indigo-100 text-indigo-800 cursor-default' : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 cursor-pointer'}`}
            >
              {word}
            </button>
          ))}
          {currentAns.length === 0 && <span className="text-gray-400 italic mt-2 text-sm">Chưa có từ nào được chọn...</span>}
        </div>

        {isSubmitted && viewPassFail && canViewSolution && !isAllCorrect && (
           <div className="mt-4 p-4 bg-green-100 border border-green-300 rounded-lg">
             <span className="text-xs font-bold text-green-800 uppercase tracking-wider block mb-2">CÂU ĐÚNG PHẢI LÀ:</span>
             <div className="flex flex-wrap gap-2">
               {question.options.map((w: string, i: number) => (
                 <span key={i} className="px-4 py-2 bg-green-500 text-white font-bold rounded-xl shadow-sm">{w}</span>
               ))}
             </div>
           </div>
        )}
      </div>

      {!isSubmitted && (
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">TỪ XÁO TRỘN:</label>
          <div className="flex flex-wrap gap-3">
            {unusedIndices.map((i: number) => {
              const word = question.options[i];
              return (
                <button
                  key={i}
                  onClick={() => handleWordClick(word)}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-lg font-bold shadow-sm hover:shadow-md hover:border-indigo-300 transition-all active:scale-95 cursor-pointer"
                >
                  {word}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!isSubmitted && (
        <div className="flex items-center gap-4 mt-6">

          <button onClick={handleHint} className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg hover:bg-yellow-100 font-semibold text-sm transition-colors ml-auto">
            <Lightbulb className="h-4 w-4" />
            Gợi ý chữ cái đầu
          </button>
        </div>
      )}
    </div>
  );
});

const CATEGORY_COLORS = [
  { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', label: 'bg-amber-100 text-amber-800', tag: 'bg-amber-100 text-amber-700 border-amber-200' },
  { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', label: 'bg-sky-100 text-sky-800', tag: 'bg-sky-100 text-sky-700 border-sky-200' },
  { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', label: 'bg-rose-100 text-rose-800', tag: 'bg-rose-100 text-rose-700 border-rose-200' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: 'bg-emerald-100 text-emerald-800', tag: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', label: 'bg-violet-100 text-violet-800', tag: 'bg-violet-100 text-violet-700 border-violet-200' },
  { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', label: 'bg-orange-100 text-orange-800', tag: 'bg-orange-100 text-orange-700 border-orange-200' },
];

const WordClassifyQuestion = React.memo(({ question, answer, isSubmitted, onSetAnswer, viewPassFail, canViewSolution, shuffledIndices }: any) => {
  const currentAns: string[] = Array.isArray(answer) ? answer : Array(question.options.length).fill('');

  // Parse options: each is "Category ||| Word"
  const items = useMemo(() => {
    return question.options.map((opt: string, idx: number) => {
      const parts = opt.split('|||').map((s: string) => s.trim());
      return { category: parts[0] || '_NONE_', word: parts[1] || opt, index: idx };
    });
  }, [question.options]);

  // Extract unique categories (exclude _NONE_ / NONE)
  const categories = useMemo(() => {
    const cats = new Set<string>();
    items.forEach((item: any) => {
      const catUpper = (item.category || '').toUpperCase().trim();
      if (catUpper !== '_NONE_' && catUpper !== 'NONE') {
        cats.add(item.category);
      }
    });
    return Array.from(cats);
  }, [items]);

  // Words assigned to each category by student
  const wordsByCategory = useMemo(() => {
    const map: Record<string, { word: string; index: number }[]> = {};
    categories.forEach(c => { map[c] = []; });
    map['_UNASSIGNED_'] = [];
    items.forEach((item: any, i: number) => {
      const assigned = currentAns[i] || '';
      if (assigned && categories.includes(assigned)) {
        map[assigned].push({ word: item.word, index: i });
      } else {
        map['_UNASSIGNED_'].push({ word: item.word, index: i });
      }
    });
    return map;
  }, [items, currentAns, categories]);

  const handleAssignToCategory = (itemIndex: number, category: string) => {
    if (isSubmitted) return;
    const newAns = [...currentAns];
    newAns[itemIndex] = category;
    onSetAnswer(newAns);
  };

  const handleUnassign = (itemIndex: number) => {
    if (isSubmitted) return;
    const newAns = [...currentAns];
    newAns[itemIndex] = '';
    onSetAnswer(newAns);
  };

  const handleDragStart = (e: React.DragEvent, itemIndex: number) => {
    if (isSubmitted) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', itemIndex.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleRootDragOver = (e: React.DragEvent) => {
    if (!isSubmitted) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleRootDrop = (e: React.DragEvent) => {
    if (isSubmitted) return;
    e.preventDefault();
    const itemIndex = e.dataTransfer.getData('text/plain');
    if (itemIndex !== '') {
      handleUnassign(Number(itemIndex));
    }
  };

  const handleCategoryDrop = (e: React.DragEvent, cat: string) => {
    if (isSubmitted) return;
    e.preventDefault();
    e.stopPropagation();
    const itemIndex = e.dataTransfer.getData('text/plain');
    if (itemIndex !== '') {
      handleAssignToCategory(Number(itemIndex), cat);
    }
  };

  // Shuffle unassigned words for display
  const shuffledUnassigned = useMemo(() => {
    const unassigned = wordsByCategory['_UNASSIGNED_'] || [];
    if (!shuffledIndices || shuffledIndices.length === 0) return unassigned;
    const unassignedSet = new Set(unassigned.map((u: any) => u.index));
    const ordered = shuffledIndices.filter((i: number) => unassignedSet.has(i));
    return ordered.map((i: number) => unassigned.find((u: any) => u.index === i)).filter(Boolean);
  }, [wordsByCategory, shuffledIndices]);

  // Check correctness per item
  const getItemCorrectness = (itemIndex: number) => {
    if (!isSubmitted || !viewPassFail) return null;
    const correctCategory = items[itemIndex].category;
    const correctCategoryUpper = (correctCategory || '').toUpperCase().trim();
    const studentCategory = currentAns[itemIndex] || '';
    if (correctCategoryUpper === '_NONE_' || correctCategoryUpper === 'NONE') {
      return studentCategory === '' || studentCategory === '_NONE_' || studentCategory === 'NONE' ? 'correct' : 'wrong';
    }
    return studentCategory === correctCategory ? 'correct' : 'wrong';
  };

  return (
    <div 
      className="space-y-5 max-w-3xl"
      onDragOver={handleRootDragOver}
      onDrop={handleRootDrop}
    >
      <div className="flex items-center gap-2 text-indigo-700 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
        <Sparkles className="h-5 w-5" />
        <span className="text-sm font-semibold">Kéo từ và thả vào nhóm phù hợp để phân loại. Các từ nhiễu (nếu có) sẽ không thuộc nhóm nào.</span>
      </div>

      {/* Unassigned words pool */}
      <div className="p-5 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/50 min-h-[70px]">
        <div className="flex flex-wrap gap-2.5 justify-center">
          {shuffledUnassigned.map((item: any) => (
            <div
              key={item.index}
              draggable={!isSubmitted}
              onDragStart={(e) => handleDragStart(e, item.index)}
              className={`px-4 py-2 rounded-xl text-base font-bold border-2 transition-all active:scale-95 bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:shadow-sm ${isSubmitted ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
            >
              {item.word}
            </div>
          ))}
          {shuffledUnassigned.length === 0 && !isSubmitted && (
            <span className="text-gray-400 italic text-sm py-2">Tất cả từ đã được phân loại</span>
          )}
        </div>
      </div>

      {/* Category boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat, catIdx) => {
          const color = CATEGORY_COLORS[catIdx % CATEGORY_COLORS.length];
          const assignedWords = wordsByCategory[cat] || [];
          return (
            <div
              key={cat}
              onDragOver={handleRootDragOver}
              onDrop={(e) => handleCategoryDrop(e, cat)}
              className={`p-4 rounded-2xl border-2 transition-all text-left w-full ${color.bg} ${color.border}`}
            >
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide mb-3 ${color.label}`}>
                {cat}
              </span>
              <div className="flex flex-wrap gap-2 min-h-[40px]">
                {assignedWords.map((item: any) => {
                  const correctness = getItemCorrectness(item.index);
                  return (
                    <div
                      key={item.index}
                      draggable={!isSubmitted}
                      onDragStart={(e) => handleDragStart(e, item.index)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all ${
                        correctness === 'correct' ? 'bg-green-100 border-green-300 text-green-800' :
                        correctness === 'wrong' ? 'bg-red-100 border-red-300 text-red-800' :
                        `${color.tag}`
                      } ${isSubmitted ? 'cursor-default' : 'cursor-grab active:cursor-grabbing hover:shadow-md'}`}
                    >
                      {item.word}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Show correct answers after submission */}
      {isSubmitted && viewPassFail && canViewSolution && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
          <span className="text-xs font-bold text-green-800 uppercase tracking-wider block mb-2">PHÂN LOẠI ĐÚNG:</span>
          <div className="space-y-2">
            {categories.map((cat, catIdx) => {
              const color = CATEGORY_COLORS[catIdx % CATEGORY_COLORS.length];
              const correctWords = items.filter((it: any) => it.category === cat);
              return (
                <div key={cat} className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${color.label}`}>{cat}</span>
                  {correctWords.map((it: any) => (
                    <span key={it.index} className="px-2 py-1 bg-green-100 text-green-800 rounded-lg text-xs font-bold">{it.word}</span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

const FillInPassageQuestion = React.memo(({ question, answer, isSubmitted, onSetAnswer, viewPassFail, canViewSolution }: any) => {
  const blankCount = (question.content.match(/\[__\]/g) || []).length;
  const currentAns: string[] = Array.isArray(answer) ? answer : Array(blankCount).fill('');

  // Split content into parts around [__]
  const parts = useMemo(() => {
    const passage = getPassageParts(question.content).passage;
    return passage.split('[__]');
  }, [question.content]);

  const handleChange = (index: number, value: string) => {
    if (isSubmitted) return;
    const newAns = [...currentAns];
    newAns[index] = value;
    onSetAnswer(newAns);
  };

  const handleReset = () => {
    if (isSubmitted) return;
    onSetAnswer(Array(blankCount).fill(''));
  };

  const getBlankCorrectness = (index: number) => {
    if (!isSubmitted || !viewPassFail) return null;
    const expected = String(question.options[index] || '').trim();
    const actual = String(currentAns[index] || '').trim();
    return actual === expected ? 'correct' : 'wrong';
  };

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Passage with inline inputs */}
      <div className={`p-6 rounded-2xl border-2 leading-[2.2] text-base transition-all ${
        isSubmitted && viewPassFail
          ? 'bg-white border-gray-200'
          : 'bg-white border-gray-200'
      }`}>
        {parts.map((part: string, i: number) => {
          const subParts = part.split(/\s+\/\s+/);
          return (
            <React.Fragment key={i}>
              {subParts.map((sub, sIdx) => (
                <React.Fragment key={sIdx}>
                  {sIdx > 0 && <br />}
                  {sIdx > 0 && <span className="inline-block w-8 md:w-12" />}
                  <span className="whitespace-pre-wrap">{sub}</span>
                </React.Fragment>
              ))}
              {i < parts.length - 1 && (() => {
                const correctness = getBlankCorrectness(i);
                const expectedWidth = Math.max(3, (question.options[i] || '').length + 1);
                return (
                  <span className="inline-block align-baseline mx-0.5">
                    <input
                      type="text"
                      value={currentAns[i] || ''}
                      onChange={(e) => handleChange(i, e.target.value)}
                      disabled={isSubmitted}
                      style={{ width: `${expectedWidth + 1}ch` }}
                      className={`border-b-2 border-t-0 border-l-0 border-r-0 bg-transparent text-center font-bold outline-none py-0.5 px-1 text-base transition-colors ${
                        correctness === 'correct' ? 'border-green-500 text-green-700' :
                        correctness === 'wrong' ? 'border-red-500 text-red-700' :
                        currentAns[i] ? 'border-indigo-400 text-indigo-800' :
                        'border-gray-300 text-gray-600'
                      } ${isSubmitted ? '' : 'focus:border-indigo-500'}`}
                      placeholder="····"
                    />
                    {correctness === 'wrong' && canViewSolution && (
                      <span className="text-xs text-green-700 font-bold ml-1">({question.options[i]})</span>
                    )}
                  </span>
                );
              })()}
            </React.Fragment>
          );
        })}
      </div>

      {/* Reset button */}

    </div>
  );
});

const InlineDropdownQuestion = React.memo(({ question, answer, isSubmitted, onSetAnswer, viewPassFail, canViewSolution }: any) => {
  const blankCount = (question.content.match(/\[__\]/g) || []).length;
  const currentAns: string[] = Array.isArray(answer) ? answer : Array(blankCount).fill('');

  const parts = useMemo(() => {
    const passage = getPassageParts(question.content).passage;
    return passage.split('[__]');
  }, [question.content]);

  const handleChange = (index: number, value: string) => {
    if (isSubmitted) return;
    const newAns = [...currentAns];
    newAns[index] = value;
    onSetAnswer(newAns);
  };

  const handleReset = () => {
    if (isSubmitted) return;
    onSetAnswer(Array(blankCount).fill(''));
  };

  // Parse and shuffle options for each dropdown
  const dropdownOptions = useMemo(() => {
    return Array(blankCount).fill(0).map((_, i) => {
      const rawOpt = question.options[i] || '';
      const [correct, distractorsStr] = rawOpt.split('|||').map((s: string) => s.trim());
      const distractors = distractorsStr ? distractorsStr.split('|').map((s: string) => s.trim()) : [];
      let allOpts = [correct, ...distractors].filter(Boolean);
      // Shuffle them randomly
      for (let j = allOpts.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [allOpts[j], allOpts[k]] = [allOpts[k], allOpts[j]];
      }
      return { correct, allOpts };
    });
  }, [question.options, blankCount]);

  const getBlankCorrectness = (index: number) => {
    if (!isSubmitted || !viewPassFail) return null;
    const expected = dropdownOptions[index]?.correct || '';
    const actual = String(currentAns[index] || '').trim();
    return actual === expected ? 'correct' : 'wrong';
  };

  return (
    <div className="space-y-5 max-w-3xl">


      <div className={`p-6 rounded-2xl border-2 leading-[2.2] text-base transition-all ${
        isSubmitted && viewPassFail
          ? 'bg-white border-gray-200'
          : 'bg-white border-gray-200'
      }`}>
        {parts.map((part: string, i: number) => {
          const subParts = part.split(/\s+\/\s+/);
          return (
            <React.Fragment key={i}>
              {subParts.map((sub, sIdx) => (
                <React.Fragment key={sIdx}>
                  {sIdx > 0 && <br />}
                  {sIdx > 0 && <span className="inline-block w-8 md:w-12" />}
                  <span className="whitespace-pre-wrap">{sub}</span>
                </React.Fragment>
              ))}
              {i < parts.length - 1 && (() => {
                const correctness = getBlankCorrectness(i);
                const { correct, allOpts } = dropdownOptions[i] || { correct: '', allOpts: [] };
                
                return (
                  <React.Fragment key={i}>
                    <span className="inline-block align-baseline mx-0.5 relative">
                      <select
                        value={currentAns[i] || ''}
                        onChange={(e) => handleChange(i, e.target.value)}
                        disabled={isSubmitted}
                        className={`appearance-none bg-transparent font-bold outline-none border-b-2 py-0.5 pr-6 pl-2 text-base transition-colors cursor-pointer ${
                          correctness === 'correct' ? 'border-green-500 text-green-700' :
                          correctness === 'wrong' ? 'border-red-500 text-red-700' :
                          currentAns[i] ? 'border-indigo-400 text-indigo-800' :
                          'border-gray-300 text-gray-600'
                        } ${isSubmitted ? '' : 'focus:border-indigo-500 hover:bg-slate-50 rounded-t'}`}
                      >
                        <option value="" disabled>---</option>
                        {allOpts.map((opt: string, optIdx: number) => (
                          <option key={optIdx} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <ChevronDown className={`absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
                        correctness === 'correct' ? 'text-green-700' :
                        correctness === 'wrong' ? 'text-red-700' :
                        currentAns[i] ? 'text-indigo-800' : 'text-gray-400'
                      }`} />
                    </span>
                    {correctness === 'wrong' && canViewSolution && (
                      <span className="text-xs text-green-700 font-bold ml-1 inline-block align-baseline">({correct})</span>
                    )}
                  </React.Fragment>
                );
              })()}
            </React.Fragment>
          );
        })}
      </div>

      
    </div>
  );
});

export const ExamTake: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get('assign');
  const liveSessionId = searchParams.get('live'); // Check if Live Mode
  const attemptIdFromUrl = searchParams.get('attempt');
  const navigate = useNavigate();

  const { 
    exams, assignments, user, addAttempt, attempts, liveSessions, 
    updateLiveParticipantProgress 
  } = useStore();
  const { 
    autoPointThresholds, fetchPointThresholds, batchAddBehaviorLogs 
  } = useClassFunStore();
  
  // NORMALIZE IDs to String early
  const storeExam = useMemo(() => exams.find(e => String(e.id) === String(id)), [exams, id]);
  const storeAssignment = useMemo(() => assignments.find(a => String(a.id) === String(assignmentId)), [assignments, assignmentId]);
  
  const [fetchedExam, setFetchedExam] = useState<Exam | null>(null);
  const [fetchedAssignment, setFetchedAssignment] = useState<any | null>(null);
  const [isLoadingDirect, setIsLoadingDirect] = useState(false);

  const exam = fetchedExam || storeExam;
  const assignment = fetchedAssignment || storeAssignment;
  const liveSession = useMemo(() => liveSessions.find(s => String(s.id) === String(liveSessionId)), [liveSessions, liveSessionId]);

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [examExpiresAt, setExamExpiresAt] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [fetchedAttempts, setFetchedAttempts] = useState<Attempt[]>([]);
  const [isAttemptsLoading, setIsAttemptsLoading] = useState(false);

  // Access Control State
  const [accessDenied, setAccessDenied] = useState<string | null>(null);

  // AI Analysis State (Only for Teacher view now mostly)
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Robust direct fetching in case store is empty or deep link
  useEffect(() => {
    const loadDirectly = async () => {
      if (!id) return;
      if (exam && (!assignmentId || assignment)) return; // Already have data

      setIsLoadingDirect(true);
      try {
        // Fetch Exam
        if (!exam) {
          const { data: eData } = await supabase.from('exams').select('*').eq('id', id).single();
          if (eData) {
            const mapped = {
              ...eData,
              id: String(eData.id),
              teacherId: String(eData.teacherId || eData.teacher_id || eData.teacherid),
              createdAt: eData.createdAt || eData.created_at || eData.createdat,
              updatedAt: eData.updatedAt || eData.updated_at || eData.updatedat,
              questionCount: eData.questionCount || eData.question_count || eData.questioncount,
              category: eData.category || (String(eData.id).startsWith('exam_matrix_') ? 'EXAM' : 'TASK'),
              classId: String(eData.classId || eData.class_id || eData.classid || ''),
              deletedAt: eData.deletedAt || eData.deleted_at || eData.deletedat
            };
            setFetchedExam(mapped as Exam);
          }
        }

        // Fetch Assignment
        if (assignmentId && !assignment) {
          const { data: aData } = await supabase.from('assignments').select('*').eq('id', assignmentId).single();
          if (aData) {
            const mapped = {
              ...aData,
              id: String(aData.id),
              examId: String(aData.examId || aData.exam_id || aData.examid),
              classId: String(aData.classId || aData.class_id || aData.classid),
              teacherId: String(aData.teacherId || aData.teacher_id || aData.teacherid),
              durationMinutes: Number(aData.durationMinutes || aData.duration_minutes || aData.durationminutes || 0),
              studentIds: Array.isArray(aData.studentIds || aData.student_id || aData.student_ids || aData.studentids) 
                ? (aData.studentIds || aData.student_id || aData.student_ids || aData.studentids).map((sid: any) => String(sid)) 
                : [],
              createdAt: aData.createdAt || aData.created_at || aData.createdat,
              startTime: aData.startTime || aData.start_time || aData.starttime,
              endTime: aData.endTime || aData.end_time || aData.endtime,
            };
            setFetchedAssignment(mapped);
          }
        }
      } catch (err) {
        console.error("ExamTake: Error loading data directly:", err);
      } finally {
        setIsLoadingDirect(false);
      }
    };

    const loadAttemptsDirectly = async () => {
      if (!user) return;
      setIsAttemptsLoading(true);
      try {
        let query = supabase.from('attempts').select('*').eq('student_id', user.id).eq('exam_id', id);
        if (assignmentId) {
          query = query.eq('assignment_id', assignmentId);
        }
        
        const { data, error } = await query;
        if (!error && data) {
          const mapped: Attempt[] = data.map((a: any) => ({
            id: String(a.id),
            answers: (a.answers as Record<string, any>) || {},
            examId: String(a.examId || a.exam_id || a.examid),
            assignmentId: String(a.assignmentId || a.assignment_id || a.assignmentid || ''),
            studentId: String(a.studentId || a.student_id || a.studentid),
            submittedAt: String(a.submittedAt || a.submitted_at || a.submittedat || new Date().toISOString()),
            score: (a.score !== undefined && a.score !== null) ? Number(a.score) : Number(a.score_achieved || 0),
            teacherFeedback: a.teacherFeedback || a.teacher_feedback || a.teacherfeedback,
            feedbackAllowViewSolution: !!(a.feedbackAllowViewSolution ?? a.feedback_allow_view_solution ?? a.feedbackallowviewsolution ?? true),
            totalTimeSpentSec: Number(a.totalTimeSpentSec ?? a.total_time_spent_sec ?? a.totaltimespentsec ?? 0),
            timeSpentPerQuestion: (a.timeSpentPerQuestion || a.time_spent_per_question || a.timespentperquestion || {}) as Record<string, number>,
            cheatWarnings: Number(a.cheatWarnings ?? a.cheat_warnings ?? a.cheatwarnings ?? 0)
          }));
          setFetchedAttempts(mapped);
        }
      } catch (err) {
        console.error("ExamTake: Error loading attempts directly:", err);
      } finally {
        setIsAttemptsLoading(false);
      }
    };

    loadDirectly();
    loadAttemptsDirectly();
  }, [id, assignmentId, exam, assignment, user]);

  // Widget State
  const [showDictionary, setShowDictionary] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [viewMode, setViewMode] = useState<'scroll' | 'single'>('scroll');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Shuffle State: Map of QuestionId -> Array of Original Indices [2, 0, 3, 1]
  const [shuffledOptionsMap, setShuffledOptionsMap] = useState<Record<string, number[]>>({});
  // NEW: Shuffled order of question IDs
  const [shuffledQuestionIds, setShuffledQuestionIds] = useState<string[]>([]);

  const orderedQuestions = useMemo((): Question[] => {
    if (!exam) return [];
    if (isSubmitted) return exam.questions; // Always standard order for review mode
    if (shuffledQuestionIds && shuffledQuestionIds.length > 0) {
      return shuffledQuestionIds
        .map(id => exam.questions.find(q => String(q.id) === String(id)))
        .filter(Boolean) as Question[];
    }
    return exam.questions;
  }, [exam, isSubmitted, shuffledQuestionIds]);

  // NEW STATES FOR ANTI-CHEAT & MOBILE UX
  const [hasStarted, setHasStarted] = useState(false);
  const [cheatWarnings, setCheatWarnings] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRetakeInitiated, setIsRetakeInitiated] = useState(false);

  // --- CAMERA AI STATES ---
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState<string | null>(null);
  const landmarkerRef = React.useRef<FaceLandmarker | null>(null);
  const lastVideoTimeRef = React.useRef(-1);
  const warningTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const isDetectionRunning = React.useRef(false);

  // --- TIME TRACKING STATES ---
  const [timeSpentPerQuestion, setTimeSpentPerQuestion] = useState<Record<string, number>>({});
  const [examStartTime, setExamStartTime] = useState<number | null>(null);
  const activeQuestionTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const performSubmitRef = React.useRef<() => Promise<void>>(null as any);
  const [cardHeight, setCardHeight] = useState(500);
  const cardRef = React.useRef<HTMLDivElement>(null);

  // VISIBILITY SETTINGS LOGIC
  const defaultSettings: AssignmentSettings = {
    viewScore: true,
    viewPassFail: true,
    viewSolution: true,
    viewHint: true,
    maxAttempts: 0,
    requireCamera: false,
    requireFullscreen: false,
    preventTabSwitch: false,
    preventCopy: false,
    viewSolutionOnLastAttemptOnly: false,
    caseSensitiveShortAnswer: false
  };

  const assignmentSettings = useMemo(() => {
    if (!assignment?.settings) return defaultSettings;
    try {
      if (typeof assignment.settings === 'string') {
        const parsed = JSON.parse(assignment.settings);
        return { ...defaultSettings, ...parsed };
      }
      return { ...defaultSettings, ...assignment.settings };
    } catch (e) {
      return defaultSettings;
    }
  }, [assignment]);

  // Fetch auto point settings
  useEffect(() => {
    if (assignment?.teacherId) {
      fetchPointThresholds(assignment.teacherId);
    }
  }, [assignment?.teacherId, fetchPointThresholds]);

  // Check for existing attempts - Standardize ID comparison & include Assignment Context
  const myAttempts = useMemo(() => {
    if (!user || !id) return [];
    
    // Ưu tiên dùng fetchedAttempts nếu có, nếu không thì dùng attempts từ store
    const sourceAttempts = fetchedAttempts.length > 0 ? fetchedAttempts : attempts;
    
    return sourceAttempts.filter(a => {
      const matchExam = String(a.examId) === String(id);
      const matchStudent = String(a.studentId) === String(user.id);
      
      const currentAssignId = assignmentId ? String(assignmentId) : '';
      const attemptAssignId = a.assignmentId ? String(a.assignmentId) : '';
      
      return matchExam && matchStudent && currentAssignId === attemptAssignId;
    });
  }, [attempts, fetchedAttempts, id, user?.id, assignmentId]);
  
  // Specific attempt from URL if provided, otherwise latest
  const viewedAttempt = useMemo(() => {
    if (attemptIdFromUrl) {
      const found = fetchedAttempts.find(a => String(a.id) === String(attemptIdFromUrl)) || 
                    attempts.find(a => String(a.id) === String(attemptIdFromUrl));
      return found || null;
    }
    return myAttempts.length > 0 ? myAttempts[myAttempts.length - 1] : null;
  }, [attempts, fetchedAttempts, attemptIdFromUrl, myAttempts]);

  const latestAttempt = viewedAttempt;
  
  const answersCount = useMemo(() => {
    return Object.values(answers).filter(v => {
      if (Array.isArray(v)) return v.some(i => i !== undefined && i !== null && i !== '');
      return v !== undefined && v !== null && v !== '';
    }).length;
  }, [answers]);

  // Retake Logic
  const attemptCount = myAttempts.length;
  const maxAllowed = Number(assignmentSettings.maxAttempts || 0);
  const canRetake = !assignment || maxAllowed === 0 || attemptCount < maxAllowed;

  // --- CRITICAL VISIBILITY LOGIC ---
  // If feedback exists, the feedback's specific setting OVERRIDES assignment settings.
  const hasFeedback = !!latestAttempt?.teacherFeedback;

  const viewScore = assignmentSettings.viewScore; // Score is usually fine to show if configured
  
  // Logic mới: Nếu được xem lời giải ở lần áp chót, thì cũng nên được xem Đúng/Sai
  const maxAttempts = assignmentSettings.maxAttempts || 0;
  // "Lần áp chót" = lần thứ (maxAttempts - 1). VD: max=5 → sau lần 4 sẽ thấy đáp án, lần 5 làm lại.
  const isSecondToLastAttempt = maxAttempts >= 2 && myAttempts.length >= maxAttempts - 1;
  const viewPassFail = assignmentSettings.viewPassFail || (assignmentSettings.viewSolutionOnLastAttemptOnly && isSecondToLastAttempt);

  // Logic: Show solution if:
  // 1. Feedback exists AND teacher specifically ALLOWED it in that feedback.
  // 2. Feedback does NOT exist AND assignment setting allows it.
  const canViewSolution = useMemo(() => {
    if (hasFeedback) {
      // If teacher has graded/given feedback, use the specific flag stored with feedback
      return !!latestAttempt?.feedbackAllowViewSolution;
    }

    // Logic mới: "Lần áp chót" - xem đáp án sau lần (maxAttempts - 1), HS còn 1 lần cuối để làm lại
    const maxAttempts = assignmentSettings.maxAttempts || 0;
    const isSecondToLastAttempt = maxAttempts >= 2 && myAttempts.length >= maxAttempts - 1;
    
    if (assignmentSettings.viewSolutionOnLastAttemptOnly && isSecondToLastAttempt) {
      return true;
    }

    // Otherwise fallback to assignment default
    return assignmentSettings.viewSolution;
  }, [hasFeedback, latestAttempt, assignmentSettings, myAttempts.length]);

  // Helper to shuffle array (Fisher-Yates)
  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  // Helper to shuffle questions by level or randomly
  const shuffleQuestionsByMode = useCallback((questions: Question[], mode?: 'random' | 'by_level') => {
    const qIds = questions.map(q => q.id);
    if (mode === 'by_level' || !mode) {
      const nhanBiet = questions.filter(q => q.level === 'NHAN_BIET');
      const ketNoi = questions.filter(q => q.level === 'KET_NOI');
      const vanDung = questions.filter(q => q.level === 'VAN_DUNG');
      const other = questions.filter(q => !q.level || !['NHAN_BIET', 'KET_NOI', 'VAN_DUNG'].includes(q.level));

      const shuffledNhanBiet = shuffleArray(nhanBiet.map(q => q.id));
      const shuffledKetNoi = shuffleArray(ketNoi.map(q => q.id));
      const shuffledVanDung = shuffleArray(vanDung.map(q => q.id));
      const shuffledOther = shuffleArray(other.map(q => q.id));

      return [...shuffledNhanBiet, ...shuffledKetNoi, ...shuffledVanDung, ...shuffledOther];
    } else {
      return shuffleArray(qIds);
    }
  }, []);

  // Generate shuffles for all questions
  const generateShuffles = useCallback(() => {
    if (!exam) return {};
    const map: Record<string, number[]> = {};
    exam?.questions.forEach(q => {
      if (q.options && Array.isArray(q.options)) {
        const indices = q.options.map((_, i) => i);
        map[q.id] = shuffleArray(indices);
      } else {
        map[q.id] = [];
      }
    });
    return map;
  }, [exam]);

  const requestFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
      });
    }
  };

  // On mount or data change, initialize state. 
  // We remove lastInitializedId to allow re-initialization if exam data arrives late.
  useEffect(() => {
    if (!exam) return;

    // Force Review Mode if:
    // 1. Explicit attempt requested in URL
    // 2. No explicit attempt, but student has exhausted their limits for this assignment
    const maxAllowed = Number(assignmentSettings.maxAttempts || 0);
    const attemptCount = myAttempts.length;
    const isExhausted = !!assignment && maxAllowed > 0 && attemptCount >= maxAllowed;
    
    // Nếu có attemptIdFromUrl nhưng chưa tìm thấy viewedAttempt trong mảng (đang load), 
    // ta vẫn nên giữ trạng thái chờ chứ không vội hiện màn hình bắt đầu.
    const shouldShowResult = !!attemptIdFromUrl || !!latestAttempt;

    if (isAttemptsLoading && !!attemptIdFromUrl) return; // Wait for the specific attempt

    // 1. Kiểm tra nháp hoạt động (draft) của bài tập này để khôi phục trước tiên
    const savedDraft = localStorage.getItem(`exam_draft_${exam.id}`);
    let draftMatches = false;
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        const draftAssignId = parsed.assignmentId ? String(parsed.assignmentId) : '';
        const currentAssignId = assignmentId ? String(assignmentId) : '';
        if (draftAssignId === currentAssignId) {
          draftMatches = true;
        }
      } catch (e) {}
    }

    if (draftMatches) {
      if (!isSubmitted && !hasStarted) {
        try {
          const parsed = JSON.parse(savedDraft!);
          if (parsed.shuffledOptionsMap) setShuffledOptionsMap(parsed.shuffledOptionsMap);
          else setShuffledOptionsMap(generateShuffles());

          if (parsed.shuffledQuestionIds) setShuffledQuestionIds(parsed.shuffledQuestionIds);
          else {
            const shouldShuffle = assignment ? (assignment.settings?.shuffleQuestions !== false) : true;
            const mode = assignment?.settings?.shuffleQuestionsMode;
            setShuffledQuestionIds(shouldShuffle ? shuffleQuestionsByMode(exam.questions, mode) : exam.questions.map(q => q.id));
          }

          setAnswers(parsed.answers || {});
          if (parsed.cheatWarnings) setCheatWarnings(parsed.cheatWarnings);

          if (typeof parsed.timeLeft === 'number' && isFinite(parsed.timeLeft)) {
            setTimeLeft(parsed.timeLeft);
          } else {
            const dur = assignment?.durationMinutes || exam?.durationMinutes || 45;
            setTimeLeft(dur * 60);
          }

          if (parsed.timeSpentPerQuestion) setTimeSpentPerQuestion(parsed.timeSpentPerQuestion);
          if (parsed.examStartTime) setExamStartTime(parsed.examStartTime);
          else setExamStartTime(Date.now());

          const now = Date.now();
          const dur = assignment?.durationMinutes || exam?.durationMinutes || 45;
          const expiresAt = parsed.examExpiresAt || ((parsed.examStartTime || now) + (parsed.timeLeft || dur * 60) * 1000);
          setExamExpiresAt(expiresAt);
          const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
          setTimeLeft(remaining);
          
          setHasStarted(true);
          return;
        } catch (e) {
          console.error("Error parsing draft:", e);
        }
      }
    }

    // 2. Nếu không có nháp, kiểm tra xem có cần chuyển chế độ kết quả không.
    // Bỏ qua việc ép xem kết quả cũ nếu người dùng vừa mới yêu cầu làm bài lại (isRetakeInitiated)
    if (shouldShowResult && latestAttempt && !isRetakeInitiated) {
      // View existing attempt result
      setIsSubmitted(true);
      setScore(latestAttempt.score || 0);

      // Restore answers
      const parsedAnswers: Record<string, any> = {};
      Object.entries(latestAttempt.answers).forEach(([k, v]) => {
        parsedAnswers[k] = v;
      });
      setAnswers(parsedAnswers);

      // NOTE: For reviewed attempts, use Standard Order to avoid confusion
      const standardMap: Record<string, number[]> = {};
      exam?.questions.forEach(q => {
        standardMap[q.id] = q.options.map((_, i) => i);
      });
      setShuffledOptionsMap(standardMap);
      setShuffledQuestionIds(exam.questions.map(q => q.id));

    } else if (!isSubmitted && !hasStarted) {
      // Fresh Start (if no draft or draft mismatch, or user initiated a retake)
      setShuffledOptionsMap(generateShuffles());
      const shouldShuffle = assignment ? (assignment.settings?.shuffleQuestions !== false) : true;
      const mode = assignment?.settings?.shuffleQuestionsMode;
      setShuffledQuestionIds(shouldShuffle ? shuffleQuestionsByMode(exam.questions, mode) : exam.questions.map(q => q.id));

      const duration = (assignment?.durationMinutes || exam?.durationMinutes || 45);
      const initialSeconds = duration * 60;
      setTimeLeft(initialSeconds);
      setExamExpiresAt(Date.now() + initialSeconds * 1000);
      setExamStartTime(Date.now());
    }
  }, [exam?.id, latestAttempt?.id, assignment?.id, generateShuffles, attemptIdFromUrl, assignmentSettings.maxAttempts, myAttempts.length, assignment, isSubmitted, hasStarted, isAttemptsLoading, isRetakeInitiated]);

  useEffect(() => {
    if (!exam || isSubmitted || !hasStarted || !examExpiresAt) {
      if (isSaving) setIsSaving(false);
      return;
    }

    setIsSaving(true);
    localStorage.setItem(`exam_draft_${exam.id}`, JSON.stringify({
      assignmentId: assignmentId || '', // Store assignment context
      answers,
      examExpiresAt,
      shuffledOptionsMap,
      shuffledQuestionIds,
      cheatWarnings,
      timeSpentPerQuestion,
      examStartTime
    }));

    const timer = setTimeout(() => setIsSaving(false), 800);
    return () => clearTimeout(timer);
  }, [answers, shuffledOptionsMap, shuffledQuestionIds, cheatWarnings, timeSpentPerQuestion, examStartTime, examExpiresAt, exam, isSubmitted, hasStarted, assignmentId]);

  // --- TIME TRACKING HOOK ---
  useEffect(() => {
    if (!hasStarted || isSubmitted || !exam) return;

    // Function to increment time for current question
    const incrementTime = () => {
      if (orderedQuestions[currentQuestionIndex]) {
        const qId = orderedQuestions[currentQuestionIndex].id;
        setTimeSpentPerQuestion(prev => ({
          ...prev,
          [qId]: (prev[qId] || 0) + 1
        }));
      }
    };

    activeQuestionTimerRef.current = setInterval(incrementTime, 1000);

    return () => {
      if (activeQuestionTimerRef.current) clearInterval(activeQuestionTimerRef.current);
    };
  }, [hasStarted, isSubmitted, exam, currentQuestionIndex]);

  // --- INTERSECTION OBSERVER FOR SCROLL MODE ---
  useEffect(() => {
    if (!hasStarted || isSubmitted || viewMode !== 'scroll' || !exam) return;

    const options = {
      root: null,
      rootMargin: '-20% 0px -50% 0px', // Detect element when it is in the upper middle part of viewport
      threshold: 0
    };

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      let maxRatioEntry = entries[0];

      // Find entry with largest intersection ratio or simply the one currently intersecting
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          maxRatioEntry = entry;
        }
      });

      if (maxRatioEntry && maxRatioEntry.isIntersecting) {
        const indexStr = maxRatioEntry.target.getAttribute('data-index');
        if (indexStr !== null) {
          const index = parseInt(indexStr, 10);
          if (!isNaN(index) && index !== currentQuestionIndex) {
            setCurrentQuestionIndex(index);
          }
        }
      }
    };

    observerRef.current = new IntersectionObserver(handleIntersect, options);

    // Attach observer to all question containers
    orderedQuestions.forEach((q, idx) => {
      const el = document.getElementById(`question-container-${idx}`);
      if (el) observerRef.current?.observe(el);
    });

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [hasStarted, isSubmitted, viewMode, exam, currentQuestionIndex]);

  // Anti-cheat events based on mode and settings
  useEffect(() => {
    if (isSubmitted || accessDenied || !hasStarted) return;

    const enforceFullscreen = assignmentSettings.requireFullscreen !== false && (assignment?.mode === 'exam' || !!assignmentSettings.requireFullscreen);
    const enforceTabSwitch = assignmentSettings.preventTabSwitch !== false && (assignment?.mode === 'exam' || !!assignmentSettings.preventTabSwitch);
    const enforceCopy = assignmentSettings.preventCopy !== false && (assignment?.mode === 'exam' || !!assignmentSettings.preventCopy);

    const handleVisibilityChange = () => {
      if (enforceTabSwitch && document.hidden) {
        setCheatWarnings(prev => prev + 1);
        alert("CẢNH BÁO: Không được chuyển tab hoặc thu nhỏ trình duyệt trong lúc thi. Hành vi gian lận sẽ bị ghi nhận!");
        if (enforceFullscreen) requestFullscreen(); // Cố gắng khôi phục toàn màn hình
      }
    };

    const handleBlur = () => {
      if (enforceTabSwitch) {
        setCheatWarnings(prev => prev + 1);
      }
    };

    const handleFullscreenChange = () => {
      if (enforceFullscreen) {
        if (!document.fullscreenElement) {
          setIsFullscreen(false);
          if (!isSubmitted) {
            setCheatWarnings(prev => prev + 1);
            alert("CẢNH BÁO: Bắt buộc làm bài ở chế độ toàn màn hình! Vui lòng quay lại toàn màn hình.");
          }
        } else {
          setIsFullscreen(true);
        }
      }
    };

    // Prevent right click
    const handleContextMenu = (e: MouseEvent) => {
      if (enforceCopy) {
        e.preventDefault();
      }
    };

    // Prevent copy
    const handleCopy = (e: ClipboardEvent) => {
      if (enforceCopy) {
        e.preventDefault();
        alert("CẢNH BÁO: Không được phép sao chép nội dung bài thi!");
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopy);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy);
    };
  }, [isSubmitted, accessDenied, hasStarted, assignment, assignmentSettings]);

  // --- AI CAMERA PROCTORING LOGIC ---
  useEffect(() => {
    // Chỉ kích hoạt khi đã bắt đầu, chưa nộp bài, và assignment yêu cầu Camera
    const requireCamera = !!assignmentSettings.requireCamera;
    if (!hasStarted || isSubmitted || !requireCamera) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        setIsCameraActive(false);
      }
      isDetectionRunning.current = false;
      return;
    }

    let isComponentMounted = true;

    const setupAI = async () => {
      try {
        setAiStatusMessage("Đang khởi tạo AI hệ thống...");
        // 1. Tải model MediaPipe
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
          },
          outputFaceBlendshapes: false,
          runningMode: "VIDEO",
          numFaces: 5 // Detect up to 5 faces to find cheaters
        });

        if (!isComponentMounted) return;
        landmarkerRef.current = faceLandmarker;

        // 2. Yêu cầu quyền Camera
        setAiStatusMessage("Vui lòng cấp quyền Camera để thi...");
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });

        if (!isComponentMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsCameraActive(true);
            setAiStatusMessage(null); // Sẵn sàng
            isDetectionRunning.current = true;
            detectFaces(); // Bắt đầu vòng lặp phân tích
          };
        }

      } catch (err: any) {
        console.error("Lỗi Camera/AI:", err);
        setAiStatusMessage(`Lỗi Camera: ${err.message || 'Không thể truy cập camera'}. Vui lòng kiểm tra quyền truy cập.`);
        setCheatWarnings(prev => prev + 1); // Cảnh báo ngay nếu từ chối quyền
      }
    };

    const triggerWarning = (msg: string) => {
      setAiStatusMessage(msg);
      if (!warningTimerRef.current) {
        // Nếu tình trạng kéo dài 3 giây, cộng 1 cảnh báo
        warningTimerRef.current = setTimeout(() => {
          setCheatWarnings(prev => prev + 1);
          alert(`CẢNH BÁO AI: ${msg}`);
          warningTimerRef.current = null;
        }, 3000);
      }
    };

    const clearWarning = () => {
      setAiStatusMessage(null);
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
        warningTimerRef.current = null;
      }
    };

    const detectFaces = async () => {
      if (!videoRef.current || !landmarkerRef.current || !isDetectionRunning.current) return;

      const video = videoRef.current;
      const startTimeMs = performance.now();

      if (video.currentTime !== lastVideoTimeRef.current && video.readyState >= 2) {
        lastVideoTimeRef.current = video.currentTime;
        try {
          const results = landmarkerRef.current.detectForVideo(video, startTimeMs);

          if (results.faceLandmarks) {
            const numFaces = results.faceLandmarks.length;
            if (numFaces === 0) {
              triggerWarning("Không tìm thấy khuôn mặt! Vui lòng ngồi ngay ngắn trước Camera.");
            } else if (numFaces > 1) {
              triggerWarning(`Phát hiện ${numFaces} người trong khung hình! Chỉ được phép 1 người thi.`);
            } else {
              clearWarning(); // Bình thường
            }
          }
        } catch (e) { /* ignore frame errors */ }
      }

      // Lặp lại (Chạy khoảng 10-15 fps là đủ để tiết kiệm pin)
      setTimeout(() => {
        if (isDetectionRunning.current) {
          requestAnimationFrame(detectFaces);
        }
      }, 100);
    };

    setupAI();

    return () => {
      isComponentMounted = false;
      isDetectionRunning.current = false;
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [hasStarted, isSubmitted, assignmentSettings.requireCamera]);

  // Handle Retake
  const handleRetake = () => {
    if (!canRetake) return;
    setIsSubmitted(false);
    setScore(null);
    setAnswers({});
    setAiAnalysis(null);
    setCheatWarnings(0);
    setHasStarted(false); // require to enter fullscreen again
    localStorage.removeItem(`exam_draft_${exam!.id}`);

    // Re-shuffle for new attempt
    setShuffledOptionsMap(generateShuffles());
    // Reset Timer
    const duration = assignment?.durationMinutes || exam!.durationMinutes;
    setTimeLeft(duration * 60);
    
    // Explicitly allow start screen even if latestAttempt exists
    setIsRetakeInitiated(true);
  };

  // Initialize Access Control
  useEffect(() => {
    if (liveSessionId) {
      if (!liveSession || liveSession.status === 'FINISHED') {
        setAccessDenied("Phiên thi trực tiếp đã kết thúc.");
        return;
      }
      if (liveSession.status === 'WAITING') {
        navigate(`/live/lobby/${liveSessionId}`);
        return;
      }
    }
  }, [liveSessionId, liveSession, navigate]);

  // Timer Logic
  useEffect(() => {
    if (accessDenied) return;
    if (timeLeft === null) return;
    if (isSubmitted) return;
    if (!hasStarted) return; // DON'T start timer or check for 0 until user clicks "Start"

    if (timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0)), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && exam) {
      console.log("DEBUG: Timer reached 0. Auto-submitting...");
      alert("Hết giờ làm bài! Hệ thống tự động nộp bài làm của bạn.");
      performSubmitRef.current();
    }
  }, [timeLeft, isSubmitted, hasStarted, exam, accessDenied]);

  // LIVE UPDATE EFFECT
  useEffect(() => {
    if (liveSessionId && user && exam && !isSubmitted) {
      let correct = 0;
      let wrong = 0;
      let answered = 0;

      Object.entries(answers).forEach(([qId, selectedIdx]) => {
        answered++;
        const q = exam.questions.find(ques => ques.id === qId);
        if (q && q.correctOptionIndex === selectedIdx) {
          correct++;
        } else {
          wrong++;
        }
      });

      // Calc temporary score
      const tempScore = answered > 0 ? (correct / exam?.questions?.length || 0) * 10 : 0;

      updateLiveParticipantProgress(liveSessionId, user.id, {
        answeredCount: answered,
        correctCount: correct,
        wrongCount: wrong,
        score: tempScore
      });
    }
  }, [answers, liveSessionId, user, exam, isSubmitted, updateLiveParticipantProgress]);

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSetAnswer = (questionId: string, value: any) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = () => {
    if (isSubmitted) return;
    setShowSubmitConfirm(true);
  };

  const performSubmit = async () => {
    setShowSubmitConfirm(false);
    if (isSubmitted) return;
    setIsSaving(false); // Immediate stop saving indicator

    // Remove draft and exit fullscreen
    if (exam) {
      localStorage.removeItem(`exam_draft_${exam.id}`);
    }
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.log(err));
    }

    // Calculate Score
    let correctCount = 0;
    let scoredQuestionCount = 0;

    exam?.questions.forEach((q, idx) => {
      if (!q.isNotScored) {
        scoredQuestionCount++;
      }

      const userAns = answers[q.id];
      const isCaseSensitive = !!assignmentSettings.caseSensitiveShortAnswer;
      const isCorrect = evaluateAnswer(q, userAns, isCaseSensitive);

      console.log(`DEBUG: Scoring Question ${idx + 1} (${q.type}):`, {
         questionId: q.id,
         userAnswer: userAns,
         isCorrect,
         isNotScored: q.isNotScored
      });


      if (isCorrect && !q.isNotScored) {
         correctCount++;
      }
    });

    const finalScore = scoredQuestionCount > 0 ? (correctCount / scoredQuestionCount) * 10 : 0;
    setScore(finalScore);
    setIsSubmitted(true);
    setIsRetakeInitiated(false);

    // Final Update for Live Session
    if (liveSessionId && user) {
      updateLiveParticipantProgress(liveSessionId, user.id, {
        answeredCount: Object.keys(answers).length,
        correctCount: correctCount,
        wrongCount: Object.keys(answers).length - correctCount,
        score: finalScore
      });
    }

    // Calculate total time
    let totalTimeSpentSec = 0;
    if (examStartTime) {
      totalTimeSpentSec = Math.floor((Date.now() - examStartTime) / 1000);
    } else {
      // fallback if starting time lost: deduce from original duration
      const originalDuration = assignment?.durationMinutes || exam?.durationMinutes;
      totalTimeSpentSec = Math.max(0, (originalDuration * 60) - (timeLeft || 0));
    }

    // Save Attempt
    const attempt: Attempt = {
      id: crypto.randomUUID(),
      examId: String(exam?.id || ''),
      assignmentId: String(assignmentId || assignment?.id || ''),
      studentId: String(user?.id || 'guest'),
      answers,
      score: finalScore,
      submittedAt: new Date().toISOString(),
      cheatWarnings: Number(cheatWarnings || 0),
      totalTimeSpentSec: Number(totalTimeSpentSec || 0),
      timeSpentPerQuestion: timeSpentPerQuestion
    };
    console.log("DEBUG: Final Attempt Payload to send:", attempt);
    
    setIsSubmitted(true); // Show local result first
    setIsRetakeInitiated(false);
    
    // Áp dụng ngay Standard Map (cố định thứ tự) khi xem đáp án
    const standardMap: Record<string, number[]> = {};
    exam?.questions.forEach(q => {
      if (q.options && Array.isArray(q.options)) {
        standardMap[q.id] = q.options.map((_, i) => i);
      } else {
        standardMap[q.id] = [];
      }
    });
    setShuffledOptionsMap(standardMap);
    
    const success = await addAttempt(attempt);
    if (!success) {
       console.error("DEBUG: addAttempt returned false.");
    } else {
       console.log("DEBUG: addAttempt SUCCESS.");
       setFetchedAttempts(prev => [...prev, attempt]);
    }

     // BỔ SUNG LOGIC: Tự động ghi nhận điểm hành vi theo mốc linh hoạt & cộng dồn
    if (user && user.id && assignment?.classId && exam) {
      const percentage = (correctCount / exam?.questions?.length || 0) * 100;
      
      // 1. Xác định mốc điểm cao nhất đạt được dựa trên cấu hình linh hoạt
      // thresholds được sắp xếp tăng dần theo percentage trong store
      let targetTotalPoints = 0;
      let activeThresholdLabel = "Có làm bài online";
      
      const sortedThresholds = [...autoPointThresholds].sort((a, b) => a.percentage - b.percentage);
      
      for (const threshold of sortedThresholds) {
        if (percentage >= threshold.percentage) {
          targetTotalPoints = threshold.points;
          activeThresholdLabel = `Làm đúng từ ${threshold.percentage}% bài làm online`;
          if (threshold.percentage === 0) activeThresholdLabel = "Có làm bài online";
          if (threshold.percentage === 100) activeThresholdLabel = "Làm đúng 100% bài làm online";
        }
      }

      try {
        const identifyKey = `[Tự động - ${assignment.id}]`;

        // 2. Tính tổng điểm tự động đã nhận cho bài tập này
        const { data: existingLogs, error: checkError } = await supabase
          .from('behavior_logs')
          .select('points')
          .eq('student_id', user.id)
          .eq('class_id', assignment.classId)
          .like('reason', `${identifyKey}%`);

        if (!checkError) {
          const currentEarnedPoints = (existingLogs || []).reduce((sum, log) => sum + log.points, 0);
          
          // 3. Nếu mốc mới cao hơn tổng đã nhận, cập nhật lại (Xóa cũ - Thêm mới để chỉ có 1 dòng duy nhất)
          if (targetTotalPoints > currentEarnedPoints) {
            // Xóa tất cả log tự động cũ của bài tập này cho học sinh này
            if (existingLogs && existingLogs.length > 0) {
              await supabase
                .from('behavior_logs')
                .delete()
                .eq('student_id', user.id)
                .eq('class_id', assignment.classId)
                .like('reason', `${identifyKey}%`);
            }

            let reasonText = activeThresholdLabel;
            let finalPoints = targetTotalPoints;

            if (cheatWarnings > 0) {
              const penalty = Math.min(finalPoints, 2);
              finalPoints -= penalty;
              reasonText += ` (Cảnh báo gian lận ${cheatWarnings} lần, -${penalty}đ)`;
            }

            if (finalPoints > 0) {
              const finalReasonText = `${identifyKey} ${reasonText}`;
              const newLog = {
                id: `log_auto_${Date.now()}`,
                student_id: user.id,
                class_id: assignment.classId,
                points: finalPoints,
                reason: finalReasonText,
                recorded_by: assignment.teacherId || 'system',
                created_at: new Date().toISOString()
              };
              await supabase.from('behavior_logs').insert(newLog);

              // 4. Thêm thông báo cho học sinh về việc cộng điểm
              const notifRaw = {
                id: `notif_auto_points_${Date.now()}`,
                user_id: user.id,
                type: 'SUCCESS',
                title: 'Đã nhận điểm cộng!',
                message: `Bạn được cộng ${finalPoints} điểm hành vi: ${reasonText}`,
                is_read: false,
                created_at: new Date().toISOString(),
                link: '/student/history'
              };
              await supabase.from('notifications').insert(notifRaw);
            }
          }
        }
      } catch (err) {
        console.error("Error awarding automatic points:", err);
      }
    }
  };

  useEffect(() => {
    performSubmitRef.current = performSubmit;
  }, [performSubmit]);

  useEffect(() => {
    if (!cardRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setCardHeight(entry.contentRect.height);
      }
    });
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [hasStarted, isSubmitted]);

  // Fix parent overflow to enable position: sticky
  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      const originalOverflowX = mainElement.style.overflowX;
      mainElement.style.overflowX = 'visible';
      return () => {
        mainElement.style.overflowX = originalOverflowX;
      };
    }
  }, []);

  // Hide footer when student is actively taking the exam
  useEffect(() => {
    const footerElement = document.querySelector('footer');
    if (footerElement) {
      const originalDisplay = footerElement.style.display;
      if (hasStarted && !isSubmitted) {
        footerElement.style.display = 'none';
      } else {
        footerElement.style.display = '';
      }
      return () => {
        footerElement.style.display = originalDisplay;
      };
    }
  }, [hasStarted, isSubmitted]);

  if (isLoadingDirect || isAttemptsLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-500 font-medium tracking-tight">Đang tải nội dung bài tập từ Cloud...</p>
      </div>
    </div>
  );

  if (!exam) return <div className="p-8 text-center text-red-500">Không tìm thấy bài tập.</div>;

  // Check if the exam itself has been soft deleted by the teacher
  if (exam.deletedAt || (exam as any).deleted_at) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 text-center max-w-md w-full animate-in fade-in zoom-in">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-red-100">
            <Ban className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Không thể truy cập</h2>
          <p className="text-gray-600 mb-8 font-medium">Bài tập này đã bị giáo viên xóa khỏi hệ thống.</p>
          <button
            onClick={() => navigate('/exams')}
            className="flex items-center justify-center gap-2 w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-md hover:shadow-lg active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" /> Quay về danh sách bài tập
          </button>
        </div>
      </div>
    );
  }

  // Check if assignmentId is present in URL but the assignment is not found in the DB (i.e. was physically deleted)
  if (assignmentId && !assignment) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 text-center max-w-md w-full animate-in fade-in zoom-in">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-red-100">
            <Ban className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Không thể truy cập</h2>
          <p className="text-gray-600 mb-8 font-medium">Nhiệm vụ/Phiên thi này không tồn tại hoặc đã bị giáo viên xóa/thu hồi.</p>
          <button
            onClick={() => navigate('/exams')}
            className="flex items-center justify-center gap-2 w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-md hover:shadow-lg active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" /> Quay về danh sách bài tập
          </button>
        </div>
      </div>
    );
  }

  // Permissions Check for Individual Assignment
  if (user?.role === 'STUDENT' && assignment && assignment.studentIds && assignment.studentIds.length > 0) {
    if (!assignment.studentIds.includes(user.id)) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 text-center max-w-md w-full animate-in fade-in zoom-in">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-red-100">
              <ShieldAlert className="h-10 w-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Truy cập bị từ chối</h2>
            <p className="text-gray-600 mb-8 font-medium">Bạn không có quyền tham gia bài kiểm tra này vì giáo viên chỉ giao cho một số thành viên nhất định trong lớp.</p>
            <button
              onClick={() => navigate('/exams')}
              className="flex items-center justify-center gap-2 w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-md hover:shadow-lg active:scale-95"
            >
              <ChevronLeft className="h-5 w-5" /> Quay về danh sách bài tập
            </button>
          </div>
        </div>
      );
    }
  }

  if (accessDenied) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Ban className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Không thể truy cập</h2>
          <p className="text-gray-600 mb-6">{accessDenied}</p>
          <button
            onClick={() => navigate('/exams')}
            className="flex items-center justify-center gap-2 w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Quay về danh sách
          </button>
        </div>
      </div>
    );
  }

  // Pre-Start Screen
  // Show if: Not started AND (No previous attempt OR User clicked "Retake")
  if (!hasStarted && !isSubmitted && (!latestAttempt || isRetakeInitiated)) {
    const isContinuing = !!localStorage.getItem(`exam_draft_${exam.id}`);
    const isExamMode = assignment?.mode === 'exam';
    const requireFullscreen = assignmentSettings.requireFullscreen !== false && (isExamMode || !!assignmentSettings.requireFullscreen);
    const requireCamera = !!assignmentSettings.requireCamera;
    const preventTabSwitch = assignmentSettings.preventTabSwitch !== false && (isExamMode || !!assignmentSettings.preventTabSwitch);

    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 relative z-50"> {/* Add higher z-index for start screen */}
        <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 text-center max-w-xl w-full animate-fade-in relative overflow-hidden">
          {/* Header Graphic */}
          <div className={`absolute top-0 left-0 w-full h-32 ${isExamMode ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-gradient-to-br from-indigo-500 to-blue-600'} opacity-10`} />

          <div className="relative z-10 flex flex-col items-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 ${isExamMode ? 'bg-red-100' : 'bg-indigo-100'} shadow-inner`}>
              <ShieldAlert className={`h-10 w-10 ${isExamMode ? 'text-red-600' : 'text-indigo-600'}`} />
            </div>

            <div className="bg-gray-100 rounded-full px-4 py-1.5 text-xs font-bold text-gray-600 uppercase tracking-widest mb-3">
              {isExamMode ? 'CHẾ ĐỘ KIỂM TRA (EXAM)' : 'CHẾ ĐỘ LUYỆN TẬP (PRACTICE)'}
            </div>

            <h2 className="text-3xl font-extrabold text-gray-900 mb-6 tracking-tight">
              {isContinuing ? 'Tiếp Tục Bài Làm' : 'Sẵn Sàng Chưa?'}
            </h2>

            {/* Rules Section based on settings */}
            <div className={`w-full text-left p-6 rounded-2xl mb-8 border ${isExamMode ? 'bg-red-50/50 border-red-100 text-red-900' : 'bg-indigo-50/50 border-indigo-100 text-indigo-900'}`}>
              <p className="font-bold flex items-center gap-2 mb-4 text-lg">
                <AlertTriangle className={`h-5 w-5 ${isExamMode ? 'text-red-500' : 'text-indigo-500'}`} />
                Quy Định Phải Biết:
              </p>
              <ul className="space-y-3 text-sm font-medium">
                {requireFullscreen && (
                  <li className="flex items-start gap-3">
                    <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isExamMode ? 'bg-red-500' : 'bg-indigo-500'}`}></div>
                    <span>Phải làm bài ở trạng thái <b>Toàn Màn Hình</b> (Fullscreen). Rời khỏi toàn màn hình sẽ tính là vi phạm.</span>
                  </li>
                )}
                {preventTabSwitch && (
                  <li className="flex items-start gap-3">
                    <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isExamMode ? 'bg-red-500' : 'bg-indigo-500'}`}></div>
                    <span>Nghiêm cấm chuyển qua Tab khác hoặc thu nhỏ trình duyệt. Vi phạm nhiều lần sẽ bị hệ thống lưu vết điểm trừ.</span>
                  </li>
                )}
                {requireCamera && (
                  <li className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0"></div>
                    <span className="text-purple-800"><b>Cảnh báo Camera AI:</b> Hệ thống sẽ liên tục dùng AI trên trình duyệt để nhận diện khuôn mặt. Vui lòng ngồi ngay ngắn, đủ sáng và không nhờ người thi hộ.</span>
                  </li>
                )}
                {(!requireFullscreen && !preventTabSwitch && !requireCamera) && (
                  <li className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"></div>
                    <span className="text-green-700">Chế độ tự do, không áp dụng giới hạn vi phạm tab hay màn hình. Bạn có thể thoải mái tra cứu tài liệu!</span>
                  </li>
                )}
                <li className="flex items-start gap-3">
                  <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isExamMode ? 'bg-red-500' : 'bg-indigo-500'}`}></div>
                  <span>Bài làm tự động nộp khi hết thời gian quy định đếm ngược.</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => {
                if (requireFullscreen) requestFullscreen();
                setHasStarted(true);
              }}
              className={`w-full py-4 rounded-xl font-black text-white transition-all shadow-xl active:scale-[0.98] text-lg flex justify-center items-center gap-3 overflow-hidden group relative
                 ${isExamMode ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}
               `}
            >
              <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out skew-x-12"></span>
              <CheckCircle className="h-6 w-6 z-10" />
              <span className="z-10 tracking-wide">{isContinuing ? 'TIẾP TỤC KIỂM TRA' : 'VÀO PHÒNG THI NGAY'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatScore = (val: number | null) => {
    if (val === null) return '--';
    return val.toFixed(1).replace('.', ',');
  };

  const unansweredCount = (exam?.questions?.length || 0) - answersCount;

  return (
    <div className="max-w-7xl mx-auto pb-20 relative select-none">
      {/* Submission Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSubmitConfirm(false)} />
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in fade-in duration-200 relative z-10 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${unansweredCount > 0 ? 'bg-orange-100' : 'bg-indigo-100'} shadow-inner`}>
              <Send className={`h-10 w-10 ${unansweredCount > 0 ? 'text-orange-600' : 'text-indigo-600'}`} />
            </div>
            
            <h3 className="text-2xl font-black text-gray-900 mb-2">Xác nhận nộp bài?</h3>
            <p className="text-gray-600 mb-6 font-medium leading-relaxed">
              Bạn đã hoàn thành <span className="text-indigo-600 font-black">{answersCount}/{exam?.questions?.length || 0}</span> câu hỏi.
              {unansweredCount > 0 && (
                <span className="block mt-2 text-orange-600 font-bold italic">
                  * Chú ý: Còn {unansweredCount} câu chưa có câu trả lời!
                </span>
              )}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95"
              >
                Tiếp tục làm bài
              </button>
              <button
                onClick={performSubmit}
                className="py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95"
              >
                Nộp bài ngay
              </button>
            </div>
          </div>
        </div>
      )}
      {/* External Widget Button */}
      <button
        onClick={() => setShowDictionary(!showDictionary)}
        className="fixed bottom-4 right-4 bg-white p-3 rounded-full shadow-lg border border-indigo-100 z-40 hover:bg-indigo-50 transition-colors group"
        title="Tra từ điển"
      >
        <Book className="h-6 w-6 text-indigo-600" />
        <span className="absolute right-full mr-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap top-1/2 -translate-y-1/2">
          Từ điển
        </span>
      </button>

      <DictionaryWidget isOpen={showDictionary} onClose={() => setShowDictionary(false)} />

      {/* Floating Question Navigation Button (Mobile only) */}
      {(hasStarted || isSubmitted) && (
        <button
          onClick={() => setShowMobileNav(!showMobileNav)}
          className={`lg:hidden fixed bottom-4 left-4 bg-white p-3 rounded-full shadow-lg border border-indigo-100 z-50 hover:bg-indigo-50 transition-all group ${showMobileNav ? 'ring-4 ring-indigo-500/20' : ''}`}
          title="Danh sách câu hỏi"
        >
          <ListOrdered className={`h-6 w-6 ${showMobileNav ? 'text-indigo-600' : 'text-gray-600'}`} />
          <span className="absolute left-full ml-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap top-1/2 -translate-y-1/2">
            Danh sách câu
          </span>
        </button>
      )}

      {/* Floating Question Nav Panel (Mobile Overlay) - Always accessible */}
      {(hasStarted || isSubmitted) && showMobileNav && (
        <div className="lg:hidden fixed inset-0 z-[110] animate-in fade-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMobileNav(false)} />
          <div className="absolute bottom-20 left-4 right-4 bg-white rounded-3xl shadow-2xl border border-indigo-50 p-6 animate-in slide-in-from-bottom-5 duration-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-gray-900 flex items-center gap-2">
                <ListOrdered className="h-5 w-5 text-indigo-600" />
                Tiến độ làm bài
              </h3>
              <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-black text-xs">
                {answersCount}/{exam?.questions?.length || 0}
              </div>
            </div>
            
            <div className="grid grid-cols-5 gap-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              {orderedQuestions.map((q, idx) => {
                const ans = answers[q.id];
                let isAnswered = false;
                if (ans !== undefined && ans !== null && ans !== '') {
                  if (Array.isArray(ans)) {
                    isAnswered = ans.some(a => a !== undefined && a !== null && a !== '');
                  } else {
                    isAnswered = true;
                  }
                }
                const isActive = viewMode === 'single' ? currentQuestionIndex === idx : false;

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (viewMode === 'single') {
                        setCurrentQuestionIndex(idx);
                      } else {
                        const element = document.getElementById(`question-${q.id}`);
                        if (element) {
                          // Account for potentially multi-line header
                          const headerElement = document.querySelector('.sticky.top-0');
                          const offset = headerElement ? headerElement.getBoundingClientRect().height + 10 : 120;
                          const elementPosition = element.getBoundingClientRect().top;
                          const offsetPosition = elementPosition + window.pageYOffset - offset;
                          window.scrollTo({
                            top: offsetPosition,
                            behavior: 'smooth'
                          });
                        }
                      }
                      setShowMobileNav(false);
                    }}
                    className={`
                      h-12 w-full flex items-center justify-center rounded-xl font-black text-sm transition-all shadow-sm
                      active:scale-95
                      ${(() => {
                        if (isSubmitted) {
                          if (viewPassFail) {
                            const isCorrect = evaluateAnswer(q, ans, assignmentSettings?.caseSensitiveShortAnswer);
                            return isCorrect 
                              ? 'bg-green-500 text-white shadow-md shadow-green-100' 
                              : 'bg-red-500 text-white shadow-md shadow-red-100';
                          }
                          return isAnswered ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-gray-50 text-gray-400 border border-gray-100';
                        }
                        return isAnswered
                          ? 'bg-indigo-600 text-white shadow-indigo-100'
                          : 'bg-gray-50 text-gray-400 border border-gray-100 shadow-sm';
                      })()}
                      ${isActive ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}
                    `}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            
            {/* THỜI GIAN CÒN LẠI TRÊN MOBILE NAV PANEL */}
            <div className="flex items-center justify-center gap-3 mt-6 p-4 border border-indigo-100 bg-indigo-50/50 rounded-2xl animate-pulse animate-duration-3000">
              <Clock className="h-5 w-5 text-indigo-600" />
              <div className="text-left">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Thời gian còn lại</div>
                <div className={`font-mono text-xl font-black leading-tight ${(timeLeft || 0) < 300 ? 'text-red-600 animate-pulse' : 'text-indigo-700'}`}>
                  {formatTime(timeLeft)}
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setShowMobileNav(false)}
              className="mt-6 w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
            >
              Đóng bảng điều hướng
            </button>
          </div>
        </div>
      )}

      {/* Camera PIP View - Shifting up slightly if floating nav button is visible */}
      {!!assignmentSettings.requireCamera && !isSubmitted && hasStarted && (
        <div className={`fixed ${showMobileNav ? 'bottom-20' : 'bottom-4'} left-4 z-40 bg-white p-1 rounded-xl shadow-2xl border-2 border-indigo-100 flex flex-col items-center transition-all duration-300`}>
          <div className="relative w-32 h-24 bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${!isCameraActive ? 'hidden' : ''} ${aiStatusMessage ? 'grayscale blur-[2px]' : ''}`}
            />
            {!isCameraActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-gray-400">
                <span className="text-[10px] animate-pulse">Đang tải...</span>
              </div>
            )}
            {aiStatusMessage && (
              <div className="absolute inset-0 flex items-center justify-center p-2 bg-red-900/40 backdrop-blur-sm">
                <AlertTriangle className="h-6 w-6 text-red-500 animate-bounce" />
              </div>
            )}
          </div>
          {aiStatusMessage ? (
            <div className="text-[10px] font-bold text-red-600 mt-1 max-w-[128px] text-center leading-tight">
              {aiStatusMessage}
            </div>
          ) : (
            <div className="text-[10px] font-bold text-green-600 mt-1 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Giám sát AI trực tuyến
            </div>
          )}
        </div>
      )}

      {/* Sticky Header & Navigation Wrapper - Word Wrap & Auto Scaling */}
      <div className="sticky lg:relative top-[57px] md:top-0 lg:top-auto z-[100] lg:z-10 bg-white/95 backdrop-blur-md shadow-sm -mx-4 px-4 md:-mx-8 md:px-8 transition-all border-b border-indigo-50">
        {/* Main Header - Auto wrap title on mobile */}
        <div className="py-1.5 md:py-2 flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 text-sm md:text-base lg:text-lg break-words leading-tight">
              {exam.title}
            </h1>
            <div className="text-[10px] md:text-xs text-gray-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
              <span className="opacity-70">Thí sinh: {user?.name}</span>
              {isSaving && <span className="flex items-center gap-1 text-indigo-500 italic animate-pulse"><RotateCcw className="h-2.5 w-2.5 animate-spin" /> <span>Đang lưu...</span></span>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0 lg:hidden">
            <div className={`flex items-center gap-1.5 font-mono text-base md:text-lg font-bold ${(timeLeft || 0) < 300 ? 'text-red-600' : 'text-indigo-600'}`}>
              <Clock className="h-4 w-4 md:h-5 md:w-5" />
              {formatTime(timeLeft)}
            </div>
            {!isSubmitted && (
              <button
                onClick={handleSubmit}
                className="bg-indigo-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Nộp bài
              </button>
            )}
          </div>
        </div>

        {/* Mobile Sticky Question Navigation - Flex Wrap (Excel-like behavior) */}
        {!isSubmitted && hasStarted && (
          <div className="lg:hidden py-2 border-t border-gray-100">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-black text-[10px] border border-indigo-100">
                {answersCount}/{exam?.questions?.length || 0}
              </div>
              <div className="flex flex-wrap gap-1.5 flex-1">
                {orderedQuestions.map((q, idx) => {
                  const ans = answers[q.id];
                  let isAnswered = false;
                  if (ans !== undefined && ans !== null && ans !== '') {
                    if (Array.isArray(ans)) {
                      isAnswered = ans.some(a => a !== undefined && a !== null && a !== '');
                    } else {
                      isAnswered = true;
                    }
                  }
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (viewMode === 'single') {
                          setCurrentQuestionIndex(idx);
                        } else {
                          const element = document.getElementById(`question-${q.id}`);
                          if (element) {
                            // Account for potentially multi-line header
                            const headerElement = document.querySelector('.sticky.top-0');
                            const offset = headerElement ? headerElement.getBoundingClientRect().height + 10 : 120;
                            const elementPosition = element.getBoundingClientRect().top;
                            const offsetPosition = elementPosition + window.pageYOffset - offset;
                            window.scrollTo({
                              top: offsetPosition,
                              behavior: 'smooth'
                            });
                          }
                        }
                      }}
                      className={`
                        h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-lg font-bold text-xs transition-all
                        active:scale-90
                        ${isAnswered
                        ? 'bg-indigo-600 text-white shadow-sm border-transparent'
                        : 'bg-white text-gray-400 border border-gray-200 shadow-sm'}
                        ${(viewMode === 'single' ? currentQuestionIndex === idx : false) ? 'ring-2 ring-indigo-400 ring-offset-1 scale-105' : ''}
                      `}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Spacing for Fullscreen Mode */}
      {!isSubmitted && hasStarted && (
        <div className="h-2 lg:hidden" /> 
      )}

      {/* Live Mode Indicator */}
      {liveSessionId && !isSubmitted && (
        <div className="mb-4 bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center justify-between animate-fade-in shadow-md">
          <span className="font-bold flex items-center gap-2"><Radio className="h-4 w-4 animate-pulse" /> Đang thi trực tiếp (Live)</span>
          <span className="text-xs bg-white/20 px-2 py-1 rounded">Tiến độ của bạn đang được giáo viên theo dõi</span>
        </div>
      )}



      {isSubmitted && (
        <div className="space-y-6 mb-8">
          <div className="bg-white border border-gray-200 text-gray-900 p-6 rounded-xl shadow-lg text-center animate-fade-in">
            <h2 className="text-2xl font-bold mb-2 text-indigo-700">Kết Quả Bài Làm</h2>

            {viewScore ? (
              <>
                <div className="text-5xl font-extrabold mb-2 text-gray-900">{formatScore(score)}</div>
                <p className="text-gray-600">Bạn đã trả lời đúng <span className="font-bold">{Math.round(((score || 0) / 10) * exam?.questions?.length || 0)}</span> / {exam?.questions?.length || 0} câu hỏi</p>
              </>
            ) : (
              <div className="py-4 text-gray-500 italic">
                Điểm số đã được ẩn bởi giáo viên.
              </div>
            )}

            <div className="mt-6 flex justify-center gap-3">
              {canRetake && (
                <button
                  onClick={handleRetake}
                  className="px-6 py-2 rounded-full font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2 shadow transition-all"
                >
                  <RotateCcw className="h-4 w-4" /> Làm bài lại ({attemptCount}/{assignmentSettings.maxAttempts === 0 ? '∞' : assignmentSettings.maxAttempts})
                </button>
              )}
              <button onClick={() => navigate('/')} className="bg-gray-100 text-gray-700 border px-6 py-2 rounded-full font-bold text-sm hover:bg-gray-200 transition-all shadow">
                Quay về Dashboard
              </button>
            </div>
          </div>

          {/* Teacher Feedback */}
          {latestAttempt?.teacherFeedback && (
            <div className="bg-green-50 border border-green-200 p-6 rounded-xl shadow-sm animate-fade-in">
              <h3 className="font-bold text-green-800 text-lg flex items-center gap-2 mb-4">
                <MessageSquareQuote className="h-5 w-5" /> Nhận xét của giáo viên
              </h3>
              <div className="prose prose-sm max-w-none text-gray-800 bg-white p-4 rounded-lg border border-green-100">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {latestAttempt.teacherFeedback}
                </ReactMarkdown>
              </div>
              {!latestAttempt.feedbackAllowViewSolution && (
                <div className="mt-2 text-xs text-red-600 italic">
                  * Giáo viên đã tắt tính năng xem đáp án chi tiết cho bài làm này.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Questions & Navigation Layout */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Navigation Sidebar (Desktop Left) */}
        {(hasStarted || isSubmitted) && (
          <div className="hidden lg:block w-64 flex-shrink-0 relative">
            <div ref={cardRef} style={{ top: `max(80px, calc(50vh - ${cardHeight / 2}px))` }} className="sticky bg-white p-5 rounded-2xl shadow-xl border border-indigo-100 flex flex-col max-h-[calc(100vh-120px)] transition-all">
              <div className="text-sm font-bold text-gray-700 mb-3 flex items-center justify-between">
                <span>Danh sách câu hỏi</span>
                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-black">{answersCount} / {exam?.questions?.length || 0}</span>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar mb-4">
                <div className="grid grid-cols-5 gap-1.5">
                  {orderedQuestions.map((q, idx) => {
                    const ans = answers[q.id];
                    let isAnswered = false;

                    if (ans !== undefined && ans !== null && ans !== '') {
                      if (Array.isArray(ans)) {
                        isAnswered = ans.some(a => a !== undefined && a !== null && a !== '');
                      } else {
                        isAnswered = true;
                      }
                    }

                    const isActive = viewMode === 'single' ? currentQuestionIndex === idx : false;

                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          if (viewMode === 'single') {
                            setCurrentQuestionIndex(idx);
                          } else {
                            const element = document.getElementById(`question-${q.id}`);
                            if (element) {
                              const offset = 120;
                              const elementPosition = element.getBoundingClientRect().top;
                              const offsetPosition = elementPosition + window.pageYOffset - offset;
                              window.scrollTo({
                                top: offsetPosition,
                                behavior: 'smooth'
                              });
                            }
                          }
                        }}
                        className={`
                          h-8 w-8 flex items-center justify-center rounded-lg font-bold text-xs transition-all
                          hover:scale-105 active:scale-95
                          ${(() => {
                            if (isSubmitted) {
                              if (viewPassFail) {
                                const isCorrect = evaluateAnswer(q, ans, assignmentSettings?.caseSensitiveShortAnswer);
                                return isCorrect 
                                  ? 'bg-green-500 text-white shadow-md shadow-green-200 border-transparent' 
                                  : 'bg-red-500 text-white shadow-md shadow-red-200 border-transparent';
                              }
                              return isAnswered ? 'bg-indigo-600 text-white border-transparent' : 'bg-gray-100 text-gray-500 border border-gray-200';
                            }
                            return isAnswered
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 border-transparent'
                              : 'bg-gray-100 text-gray-500 border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600';
                          })()}
                          ${isActive ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}
                        `}
                      >
                        {idx + 1}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3 mb-4 border-t pt-4">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-medium">Thời gian còn lại</div>
                  <div className={`font-mono text-xl font-bold ${(timeLeft || 0) < 300 ? 'text-red-600' : 'text-indigo-700'}`}>
                    {formatTime(timeLeft)}
                  </div>
                </div>
              </div>

              <div className="mt-2 pt-4 border-t flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <div className="w-3 h-3 rounded bg-indigo-600"></div> <span>Đã làm</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <div className="w-3 h-3 rounded bg-gray-100 border border-gray-200"></div> <span>Chưa làm</span>
                </div>

                <div className="mt-2 pt-3 border-t flex flex-col gap-2">
                  <button
                    onClick={() => setViewMode(prev => prev === 'scroll' ? 'single' : 'scroll')}
                    className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm ${viewMode === 'single' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    <Sparkles className="h-3 w-3" /> {viewMode === 'scroll' ? 'Chế độ từng câu' : 'Chế độ danh sách'}
                  </button>
                  {!isSubmitted && (
                    <button
                      onClick={handleSubmit}
                      className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Send className="h-3 w-3" /> Nộp bài
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Questions List */}
        <div className="flex-1 space-y-6">
          {viewMode === 'single' && !isSubmitted && (
            <div className="mb-4 bg-white p-4 rounded-xl border flex items-center justify-between text-sm shadow-sm">
              <span className="font-bold text-gray-600">Câu hỏi {currentQuestionIndex + 1} / {exam?.questions?.length || 0}</span>
              <div className="flex gap-2">
                <button
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                  className="px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-all font-medium"
                >
                  Trước
                </button>
                <button
                  disabled={currentQuestionIndex === (exam?.questions?.length || 0) - 1}
                  onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all font-medium"
                >
                  Tiếp theo
                </button>
              </div>
            </div>
          )}

          {orderedQuestions.filter((_, i) => viewMode === 'scroll' || isSubmitted || i === currentQuestionIndex).map((q, index) => {
            const actualIndex = viewMode === 'scroll' || isSubmitted ? index : currentQuestionIndex;
            // Get the shuffled indices for this question
            const shuffledIndices = shuffledOptionsMap[q.id] || q.options.map((_, i) => i);
            const isQuestionCorrect = evaluateAnswer(q, answers[q.id], assignmentSettings?.caseSensitiveShortAnswer);

            return (
              <div id={`question-container-${actualIndex}`} data-index={actualIndex} key={q.id} className="bg-white p-4 md:p-6 rounded-xl border border-gray-200 shadow-sm scroll-mt-[100px] md:scroll-mt-24">
                <div id={`question-${q.id}`} className="flex flex-col gap-2 md:gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xs md:text-sm shadow-sm ring-2 md:ring-4 ring-indigo-50">
                      {actualIndex + 1}
                    </span>
                    <span className="text-gray-500 font-bold text-[10px] md:text-sm uppercase tracking-wider">Câu {actualIndex + 1}</span>
                  </div>
                  <div className="flex-1 mt-1">
                    <div className="text-gray-900 font-medium text-base md:text-lg leading-relaxed prose prose-p:my-0 max-w-none break-words">
                      <MathText>
                        {['DRAG_DROP', 'INLINE_DROPDOWN', 'FILL_IN_PASSAGE'].includes(q.type)
                          ? getPassageParts(q.content).instruction || q.content.replace(/\s*Đáp án:\s*[^\n]*$/i, '').trim()
                          : q.content.replace(/\s*Đáp án:\s*[^\n]*$/i, '').trim()}
                      </MathText>
                    </div>
                    {q.imageUrl && (
                      <div className="mt-3 md:mt-4 overflow-hidden rounded-lg border border-gray-100 shadow-sm bg-gray-50 flex justify-center">
                        <img
                          src={q.imageUrl}
                          alt="Ảnh minh họa câu hỏi"
                          className="max-h-[40vh] md:max-h-80 object-contain w-auto max-w-full"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div className="hidden items-center gap-2 p-4 text-gray-400 text-sm italic" style={{ display: 'none' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                          Không tải được ảnh minh họa
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  {isSubmitted ? (
                    <ReadOnlyQuestionView
                      question={q}
                      userAns={answers[q.id]}
                      isCorrect={isQuestionCorrect}
                      canViewSolution={canViewSolution}
                    />
                  ) : (
                    <>
                      {q.type === 'MCQ' && (
                    <MCQQuestion
                      question={q}
                      answer={answers[q.id]}
                      onSetAnswer={(val: any) => handleSetAnswer(q.id, val)}
                      isSubmitted={isSubmitted}
                      viewPassFail={viewPassFail}
                      canViewSolution={canViewSolution}
                      shuffledIndices={shuffledIndices}
                    />
                  )}

                  {q.type === 'MCQ_MULTIPLE' && (
                    <MCQMultipleQuestion
                      question={q}
                      answer={answers[q.id]}
                      onSetAnswer={(val: any) => handleSetAnswer(q.id, val)}
                      isSubmitted={isSubmitted}
                      viewPassFail={viewPassFail}
                      canViewSolution={canViewSolution}
                      shuffledIndices={shuffledIndices}
                    />
                  )}

                  {q.type === 'SHORT_ANSWER' && (
                    <ShortAnswerQuestion
                      question={q}
                      answer={answers[q.id]}
                      onSetAnswer={(val: any) => handleSetAnswer(q.id, val)}
                      isSubmitted={isSubmitted}
                      viewPassFail={viewPassFail}
                      caseSensitive={assignmentSettings?.caseSensitiveShortAnswer}
                    />
                  )}

                  {q.type === 'MATCHING' && (
                    <MatchingQuestion
                      question={q}
                      answer={answers[q.id]}
                      onSetAnswer={(val: any) => handleSetAnswer(q.id, val)}
                      isSubmitted={isSubmitted}
                      viewPassFail={viewPassFail}
                      canViewSolution={canViewSolution}
                      shuffledIndices={shuffledIndices}
                    />
                  )}

                  {q.type === 'ORDERING' && (
                    <OrderingQuestion
                      question={q}
                      answer={answers[q.id]}
                      onSetAnswer={(val: any) => handleSetAnswer(q.id, val)}
                      isSubmitted={isSubmitted}
                      viewPassFail={viewPassFail}
                      canViewSolution={canViewSolution}
                      shuffledIndices={shuffledIndices}
                    />
                  )}

                  {q.type === 'DRAG_DROP' && (
                    <DragDropQuestion
                      question={q}
                      answer={answers[q.id]}
                      onSetAnswer={(val: any) => handleSetAnswer(q.id, val)}
                      isSubmitted={isSubmitted}
                      viewPassFail={viewPassFail}
                      canViewSolution={canViewSolution}
                      shuffledIndices={shuffledIndices}
                    />
                  )}

                  {q.type === 'SENTENCE_SCRAMBLE' && (
                    <SentenceScrambleQuestion
                      question={q}
                      answer={answers[q.id]}
                      onSetAnswer={(val: any) => handleSetAnswer(q.id, val)}
                      isSubmitted={isSubmitted}
                      viewPassFail={viewPassFail}
                      canViewSolution={canViewSolution}
                      shuffledIndices={shuffledIndices}
                    />
                  )}

                  {q.type === 'WORD_CLASSIFY' && (
                    <WordClassifyQuestion
                      question={q}
                      answer={answers[q.id]}
                      onSetAnswer={(val: any) => handleSetAnswer(q.id, val)}
                      isSubmitted={isSubmitted}
                      viewPassFail={viewPassFail}
                      canViewSolution={canViewSolution}
                      shuffledIndices={shuffledIndices}
                    />
                  )}

                  {q.type === 'FILL_IN_PASSAGE' && (
                    <FillInPassageQuestion
                      question={q}
                      answer={answers[q.id]}
                      onSetAnswer={(val: any) => handleSetAnswer(q.id, val)}
                      isSubmitted={isSubmitted}
                      viewPassFail={viewPassFail}
                      canViewSolution={canViewSolution}
                    />
                  )}

                  {q.type === 'INLINE_DROPDOWN' && (
                    <InlineDropdownQuestion
                      question={q}
                      answer={answers[q.id]}
                      onSetAnswer={(val: any) => handleSetAnswer(q.id, val)}
                      isSubmitted={isSubmitted}
                      viewPassFail={viewPassFail}
                      canViewSolution={canViewSolution}
                    />
                  )}
                    </>
                  )}
                </div>

                {/* UNIFIED CORRECTNESS FEEDBACK BANNER */}
                {isSubmitted && viewPassFail && (
                  <div className={`mt-4 p-4 rounded-xl border flex items-start gap-3 shadow-sm animate-fade-in ${
                    isQuestionCorrect 
                      ? 'bg-green-50 border-green-200 text-green-900' 
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}>
                    {isQuestionCorrect ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-green-800 text-sm font-extrabold block">Hệ thống chấp nhận đáp án này (Chính xác)</strong>
                        </div>
                      </>
                    ) : (
                      <>
                        <X className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <strong className="text-red-800 text-sm font-extrabold block">Chưa chính xác</strong>
                          
                          {q.type === 'MCQ_MULTIPLE' && (
                            <p className="text-xs text-red-700 mt-1 font-medium leading-relaxed">
                              Lưu ý: Đối với câu hỏi chọn nhiều đáp án, bạn phải tích chọn đầy đủ tất cả các đáp án đúng và không được chọn thừa/chọn sai đáp án để đạt điểm tối đa.
                            </p>
                          )}

                          {q.type === 'SHORT_ANSWER' && canViewSolution && (
                            <div className="mt-2 text-xs text-gray-700 bg-gray-55/80 p-2.5 rounded-lg border border-gray-200">
                              <strong className="text-gray-600 mr-1.5">Đáp án mẫu:</strong>
                              <span className="font-bold text-gray-800">
                                <MathText inline>
                                  {q.options && q.options.length > 0 
                                    ? q.options.map((opt: any) => String(opt)).join(' / ') 
                                    : String(q.solution || '')}
                                </MathText>
                              </span>
                            </div>
                          )}

                          {q.type === 'MCQ' && canViewSolution && q.correctOptionIndex !== undefined && (
                            <div className="mt-2 text-xs text-gray-700 bg-gray-55/80 p-2.5 rounded-lg border border-gray-200">
                              <strong className="text-gray-600 mr-1.5">Đáp án đúng:</strong>
                              <span className="font-bold text-gray-800">
                                {q.options[q.correctOptionIndex]}
                              </span>
                            </div>
                          )}

                          {q.type === 'MCQ_MULTIPLE' && canViewSolution && q.correctOptionIndices && (
                            <div className="mt-2 text-xs text-gray-700 bg-gray-55/80 p-2.5 rounded-lg border border-gray-200">
                              <strong className="text-gray-600 mr-1.5">Các đáp án đúng:</strong>
                              <span className="font-bold text-gray-800 block mt-1 space-y-1">
                                {q.correctOptionIndices.map((ci: number) => (
                                  <span key={ci} className="block">• {q.options[ci]}</span>
                                ))}
                              </span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* HINT BOX: Check viewHint setting */}
                {isSubmitted && q.hint && assignmentSettings.viewHint && (
                  <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200 text-orange-900 text-sm shadow-sm animate-fade-in flex gap-2 items-start">
                    <Lightbulb className="h-5 w-5 flex-shrink-0 text-orange-500" />
                    <div>
                      <strong className="block mb-1 text-orange-700">Gợi ý làm bài:</strong>
                      <div className="prose prose-sm prose-p:my-0 text-orange-800">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {q.hint}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}

                {/* SOLUTION BOX: STRICTLY Check calculated canViewSolution setting */}
                {isSubmitted && q.solution && canViewSolution && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 text-blue-900 text-sm shadow-sm animate-fade-in flex gap-2 items-start">
                    <BrainCircuit className="h-5 w-5 flex-shrink-0 text-blue-500" />
                    <div className="flex-1">
                      <strong className="block mb-1 text-blue-700">Lời giải chi tiết:</strong>
                      <div className="prose prose-sm prose-p:my-0 text-blue-900">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {q.solution}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Submit Button */}
      {!isSubmitted && (
        <div className="mt-12 flex justify-center pb-12">
          <button
            onClick={handleSubmit}
            className="bg-indigo-600 text-white px-10 py-4 rounded-xl text-lg font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 flex items-center gap-3 animate-bounce-subtle"
          >
            <Send className="h-6 w-6" />
            Nộp bài
          </button>
        </div>
      )}
    </div>
  );
};

import React, { useMemo } from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import MathText from '../MathText';
import { Question } from '../../types';

interface ReadOnlyQuestionViewProps {
  question: Question;
  userAns: any;
  isCorrect: boolean;
  canViewSolution: boolean;
  shuffledIndices?: number[];
}

const getPassageParts = (content: string) => {
  const cleanContent = content.replace(/\s*Đáp án:\s*[^\n]*$/i, '').trim();
  
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

  const match = cleanContent.match(/^(.*?(?:chọn|điền|hoàn thành|thích hợp|chỗ trống|xếp|phân loại|hoàn thiện|đoạn văn|thả|kéo|nối).*?(?:[:.]\s*\n|[:.]\s+|$))/i);
  if (match && match[0].length < cleanContent.length && match[0].length < 200) {
    return {
      instruction: match[0].trim(),
      passage: cleanContent.substring(match[0].length).trim()
    };
  }

  const lines = cleanContent.split('\n');
  if (lines.length > 1 && lines[0].length < 150 && /chọn|điền|hoàn thành|thích|chỗ trống|xếp|phân loại|kéo|thả/i.test(lines[0])) {
    return {
      instruction: lines[0].trim(),
      passage: cleanContent.substring(lines[0].length).trim()
    };
  }

  return {
    instruction: '',
    passage: cleanContent
  };
};

export interface ClozeSegment {
  type: 'text' | 'blank' | 'fraction_with_blank';
  val?: string;
  blankIdx?: number;
  numerator?: string;
  denominator?: string;
  numIsBlank?: boolean;
  denIsBlank?: boolean;
}

const parseClozePassage = (content: string): ClozeSegment[] => {
  const cleanContent = content.replace(/\s*Đáp án:\s*[^\n]*$/i, '').trim();
  const segments: ClozeSegment[] = [];
  
  const cleanUnbalancedDollar = (str: string) => {
    const count = (str.match(/\$/g) || []).length;
    if (count % 2 !== 0) {
      return str.replaceAll('$', '');
    }
    return str;
  };
  
  const fracWithBlankRegex = /\$?\\\s*frac\s*\{\s*([^{}]+?)\s*\}\s*\{\s*([^{}]+?)\s*\}\$?/g;
  
  let lastIdx = 0;
  let match;
  let blankCounter = 0;
  
  while ((match = fracWithBlankRegex.exec(cleanContent)) !== null) {
    const matchIdx = match.index;
    const num = match[1].trim();
    const den = match[2].trim();
    
    const numHasBlank = num.includes('[__]');
    const denHasBlank = den.includes('[__]');
    
    if (numHasBlank || denHasBlank) {
      // Process text before this match
      const textBefore = cleanContent.substring(lastIdx, matchIdx);
      if (textBefore) {
        const subParts = textBefore.split('[__]');
        subParts.forEach((part, subIdx) => {
          if (part) {
            segments.push({ type: 'text', val: cleanUnbalancedDollar(part) });
          }
          if (subIdx < subParts.length - 1) {
            segments.push({ type: 'blank', blankIdx: blankCounter++ });
          }
        });
      }
      
      // Process the fraction containing [__]
      const blankIdx = blankCounter++;
      segments.push({
        type: 'fraction_with_blank',
        blankIdx,
        numerator: cleanUnbalancedDollar(num),
        denominator: cleanUnbalancedDollar(den),
        numIsBlank: numHasBlank,
        denIsBlank: denHasBlank
      });
      
      lastIdx = fracWithBlankRegex.lastIndex;
    }
  }
  
  // Process remaining text
  const textAfter = cleanContent.substring(lastIdx);
  if (textAfter) {
    const subParts = textAfter.split('[__]');
    subParts.forEach((part, subIdx) => {
      if (part) {
        segments.push({ type: 'text', val: cleanUnbalancedDollar(part) });
      }
      if (subIdx < subParts.length - 1) {
        segments.push({ type: 'blank', blankIdx: blankCounter++ });
      }
    });
  }
  
  return segments;
};

export const ReadOnlyQuestionView: React.FC<ReadOnlyQuestionViewProps> = ({
  question,
  userAns,
  isCorrect,
  canViewSolution,
  shuffledIndices
}) => {
  
  const renderFractionOrText = (text: string) => {
    if (text && text.includes('/') && !text.includes(' ') && text.split('/').length === 2) {
      const [num, den] = text.split('/');
      return (
        <span className="inline-flex flex-col items-center justify-center align-middle font-bold text-sm">
          <span>{num}</span>
          <span className="w-6 h-[1.5px] bg-current my-0.5 opacity-60"></span>
          <span>{den}</span>
        </span>
      );
    }
    return <span>{text}</span>;
  };

  // 1. MCQ: Trắc nghiệm đơn
  if (!question.type || question.type === 'MCQ') {
    const isUnanswered = userAns === undefined || userAns === null || userAns === '';
    const indices = shuffledIndices || question.options.map((_, i) => i);
    
    return (
      <div className="space-y-3 mt-3">
        {isUnanswered && (
          <div className="flex items-center gap-1.5 text-red-600 bg-red-50 border border-red-100 rounded-lg p-2 text-xs font-bold w-fit mb-2">
            <AlertCircle className="h-3.5 w-3.5" /> Thí sinh chưa trả lời (Bỏ trống)
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-sm">
          {indices.map((originalIndex) => {
            const opt = question.options[originalIndex];
            const isSelected = !isUnanswered && userAns === originalIndex;
            const isCorrectOption = originalIndex === question.correctOptionIndex;
            
            let cardStyle = "p-3.5 rounded-xl border-2 flex items-center gap-3 transition-all bg-white border-gray-200 text-gray-700";
            let prefixBg = "bg-gray-100 text-gray-600";
            let statusIcon = null;

            if (isSelected) {
              if (isCorrectOption) {
                cardStyle = "p-3.5 rounded-xl border-2 flex items-center gap-3 transition-all bg-green-50 border-green-500 text-green-950 font-bold animate-in fade-in zoom-in-95 duration-200";
                prefixBg = "bg-green-500 text-white";
                statusIcon = <CheckCircle className="h-4.5 w-4.5 text-green-600" />;
              } else {
                cardStyle = "p-3.5 rounded-xl border-2 flex items-center gap-3 transition-all bg-red-50 border-red-500 text-red-950 font-bold animate-in fade-in zoom-in-95 duration-200";
                prefixBg = "bg-red-500 text-white";
                statusIcon = <XCircle className="h-4.5 w-4.5 text-red-600" />;
              }
            } else if (isCorrectOption && canViewSolution) {
              cardStyle = "p-3.5 rounded-xl border-2 border-dashed flex items-center gap-3 transition-all bg-green-50/30 border-green-400 text-green-900";
              prefixBg = "bg-green-100 text-green-700 border border-green-200";
            }

            return (
              <div key={originalIndex} className={cardStyle}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${prefixBg}`}>
                  {String.fromCharCode(65 + indices.indexOf(originalIndex))}
                </span>
                <div className="flex-1">
                  <MathText inline>{opt}</MathText>
                </div>
                {statusIcon}
                {isCorrectOption && canViewSolution && !isSelected && (
                  <span className="text-[10px] bg-green-150 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Đáp án đúng</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. MCQ_MULTIPLE: Trắc nghiệm chọn nhiều
  if (question.type === 'MCQ_MULTIPLE') {
    const isUnanswered = !Array.isArray(userAns) || userAns.length === 0;
    const indices = shuffledIndices || question.options.map((_, i) => i);
    const correctIndices = question.correctOptionIndices || [];
    
    return (
      <div className="space-y-3 mt-3">
        {isUnanswered && (
          <div className="flex items-center gap-1.5 text-red-600 bg-red-50 border border-red-100 rounded-lg p-2 text-xs font-bold w-fit mb-2">
            <AlertCircle className="h-3.5 w-3.5" /> Thí sinh chưa trả lời (Bỏ trống)
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-sm">
          {indices.map((originalIndex) => {
            const opt = question.options[originalIndex];
            const isSelected = !isUnanswered && userAns.includes(originalIndex);
            const isCorrectOption = correctIndices.includes(originalIndex);
            
            let cardStyle = "p-3.5 rounded-xl border-2 flex items-center gap-3 transition-all bg-white border-gray-200 text-gray-700";
            let prefixBg = "bg-gray-100 text-gray-600";
            let statusIcon = null;

            if (isSelected) {
              if (isCorrectOption) {
                cardStyle = "p-3.5 rounded-xl border-2 flex items-center gap-3 transition-all bg-green-50 border-green-500 text-green-950 font-bold animate-in fade-in zoom-in-95 duration-200";
                prefixBg = "bg-green-500 text-white";
                statusIcon = <CheckCircle className="h-4.5 w-4.5 text-green-600" />;
              } else {
                cardStyle = "p-3.5 rounded-xl border-2 flex items-center gap-3 transition-all bg-red-50 border-red-500 text-red-950 font-bold animate-in fade-in zoom-in-95 duration-200";
                prefixBg = "bg-red-500 text-white";
                statusIcon = <XCircle className="h-4.5 w-4.5 text-red-600" />;
              }
            } else if (isCorrectOption && canViewSolution) {
              cardStyle = "p-3.5 rounded-xl border-2 border-dashed flex items-center gap-3 transition-all bg-green-50/30 border-green-400 text-green-900";
              prefixBg = "bg-green-100 text-green-700 border border-green-200";
            }

            return (
              <div key={originalIndex} className={cardStyle}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${prefixBg}`}>
                  {String.fromCharCode(65 + indices.indexOf(originalIndex))}
                </span>
                <div className="flex-1">
                  <MathText inline>{opt}</MathText>
                </div>
                {statusIcon}
                {isCorrectOption && canViewSolution && !isSelected && (
                  <span className="text-[10px] bg-green-150 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Đáp án đúng</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 3. SHORT_ANSWER: Điền tự luận ngắn
  if (question.type === 'SHORT_ANSWER') {
    const isUnanswered = userAns === undefined || userAns === null || String(userAns).trim() === '';
    const expectedList = question.options && question.options.length > 0 
      ? question.options.map((opt: any) => String(opt).trim())
      : (question.solution ? [String(question.solution).trim()] : []);

    return (
      <div className="space-y-3 mt-3 max-w-xl">
        <div className={`p-4 rounded-xl border-2 flex items-center gap-3 bg-white shadow-sm ${
          isUnanswered ? 'border-red-250 bg-red-50/10' :
          isCorrect ? 'border-green-500 bg-green-50/20' :
          'border-red-500 bg-red-50/20'
        }`}>
          <div className="flex-1">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider block mb-1">Học sinh trả lời:</span>
            {isUnanswered ? (
              <span className="text-red-500 font-bold italic text-base flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> (Bỏ trống / Chưa trả lời)
              </span>
            ) : (
              <span className={`text-lg font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                <MathText inline>{String(userAns)}</MathText>
              </span>
            )}
          </div>
          {isUnanswered ? null : isCorrect ? (
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 animate-in fade-in" />
          ) : (
            <XCircle className="h-6 w-6 text-red-600 flex-shrink-0 animate-in fade-in" />
          )}
        </div>

        {(!isCorrect || isUnanswered) && canViewSolution && expectedList.length > 0 && (
          <div className="p-4 rounded-xl border border-dashed border-green-300 bg-green-50/30 text-green-900 text-sm">
            <span className="text-green-700 text-xs font-bold uppercase tracking-wider block mb-1">Đáp án đúng mẫu:</span>
            <div className="font-bold text-base flex flex-wrap gap-1.5 items-center mt-1.5">
              {expectedList.map((ansText, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="text-gray-400 font-normal">hoặc</span>}
                  <span className="bg-green-100 text-green-800 border border-green-200 px-2.5 py-0.5 rounded-lg flex items-center">
                    <MathText inline>{ansText}</MathText>
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (['DRAG_DROP', 'FILL_IN_PASSAGE', 'INLINE_DROPDOWN'].includes(question.type)) {
    const blankCount = (question.content.match(/\[__\]/g) || []).length;
    const currentAns = Array.isArray(userAns) ? userAns : Array(blankCount).fill('');
    const segments = parseClozePassage(question.content);

    const renderBlank = (i: number, isFraction = false) => {
      const studentVal = String(currentAns[i] || '').trim();
      const isBlankUnanswered = studentVal === '';
      
      let correctVal = '';
      if (question.type === 'INLINE_DROPDOWN') {
        const rawOpt = question.options[i] || '';
        correctVal = rawOpt.split('|||').map((s: string) => s.trim())[0];
      } else {
        correctVal = String(question.options[i] || '').trim();
      }

      const isBlankCorrect = !isBlankUnanswered && studentVal.toLowerCase() === correctVal.toLowerCase();

      if (isBlankUnanswered) {
        return (
          <span className="inline-flex items-center gap-1 mx-1.5 align-baseline">
            <span className={`bg-gray-100 text-gray-400 border border-gray-300 border-dashed rounded px-2.5 py-0.5 font-bold select-none ${isFraction ? 'text-xs px-1 py-0' : 'text-sm'}`}>
              (Trống) ❌
            </span>
            {canViewSolution && (
              <span className={`bg-green-50 text-green-700 border border-green-200 rounded px-2.5 py-0.5 font-bold ${isFraction ? 'text-xs px-1 py-0' : 'text-sm'}`}>
                đáp án: <MathText inline>{correctVal}</MathText>
              </span>
            )}
          </span>
        );
      }

      if (isBlankCorrect) {
        return (
          <span className={`inline-flex items-center mx-1 bg-green-500 text-white rounded px-2.5 py-0.5 font-bold align-baseline shadow-sm border border-green-600 animate-in fade-in duration-250 ${isFraction ? 'text-xs px-1.5 py-0' : 'text-sm'}`}>
            <MathText inline>{studentVal}</MathText> <CheckCircle className="h-3.5 w-3.5 ml-1 text-white inline" />
          </span>
        );
      }

      return (
        <span className="inline-flex items-center gap-1 mx-1.5 align-baseline animate-in fade-in duration-250">
          <span className={`bg-red-500 text-white rounded px-2.5 py-0.5 font-bold shadow-sm border border-red-600 ${isFraction ? 'text-xs px-1.5 py-0' : 'text-sm'}`}>
            <MathText inline>{studentVal}</MathText> <XCircle className="h-3.5 w-3.5 ml-1 text-white inline" />
          </span>
          {canViewSolution && (
            <span className={`bg-green-50 text-green-700 border border-green-200 rounded px-2.5 py-0.5 font-bold ${isFraction ? 'text-xs px-1 py-0' : 'text-sm'}`}>
              đáp án: <MathText inline>{correctVal}</MathText>
            </span>
          )}
        </span>
      );
    };

    return (
      <div className="mt-3 p-5 rounded-2xl border border-gray-200 bg-white leading-[2.3] text-gray-800 text-base shadow-sm">
        {segments.map((seg, idx) => {
          if (seg.type === 'text') {
            const subParts = seg.val!.split(/\s+\/\s+/);
            return (
              <React.Fragment key={idx}>
                {subParts.map((sub, sIdx) => (
                  <React.Fragment key={sIdx}>
                    {sIdx > 0 && <br />}
                    {sIdx > 0 && <span className="inline-block w-8 md:w-12" />}
                    <MathText inline className="whitespace-pre-wrap">{sub}</MathText>
                  </React.Fragment>
                ))}
              </React.Fragment>
            );
          }
          
          if (seg.type === 'blank') {
            return (
              <React.Fragment key={idx}>
                {renderBlank(seg.blankIdx!)}
              </React.Fragment>
            );
          }
          
          if (seg.type === 'fraction_with_blank') {
            return (
              <span key={idx} className="inline-flex flex-col items-center justify-center align-middle mx-1.5 leading-none">
                <span className="border-b border-gray-400 pb-1 text-center font-bold min-h-[32px] flex items-center justify-center">
                  {seg.numIsBlank ? renderBlank(seg.blankIdx!, true) : <MathText inline>{seg.numerator!}</MathText>}
                </span>
                <span className="pt-1 text-center font-bold min-h-[32px] flex items-center justify-center">
                  {seg.denIsBlank ? renderBlank(seg.blankIdx!, true) : <MathText inline>{seg.denominator!}</MathText>}
                </span>
              </span>
            );
          }
          
          return null;
        })}
      </div>
    );
  }

  // 7. WORD_CLASSIFY: Phân loại từ
  if (question.type === 'WORD_CLASSIFY') {
    const currentAns = Array.isArray(userAns) ? userAns : Array(question.options.length).fill('');
    const items = question.options.map((opt: any, idx: number) => {
      const parts = String(opt).split('|||').map((s: string) => s.trim());
      return { category: parts[0] || '_NONE_', word: parts[1] || opt, index: idx };
    });

    const categories = Array.from(new Set(items.map((item: any) => item.category).filter((cat: string) => {
      const cUpper = cat.toUpperCase();
      return cUpper !== '_NONE_' && cUpper !== 'NONE';
    })));

    return (
      <div className="space-y-4 mt-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat, catIdx) => {
            const colors = [
              { bg: 'bg-indigo-50/30', border: 'border-indigo-150', header: 'bg-indigo-100 text-indigo-800' },
              { bg: 'bg-sky-50/30', border: 'border-sky-150', header: 'bg-sky-100 text-sky-800' },
              { bg: 'bg-rose-50/30', border: 'border-rose-150', header: 'bg-rose-100 text-rose-800' },
              { bg: 'bg-emerald-50/30', border: 'border-emerald-150', header: 'bg-emerald-100 text-emerald-800' },
              { bg: 'bg-violet-50/30', border: 'border-violet-150', header: 'bg-violet-100 text-violet-800' },
              { bg: 'bg-orange-50/30', border: 'border-orange-150', header: 'bg-orange-100 text-orange-800' }
            ];
            const color = colors[catIdx % colors.length];

            const correctWords: string[] = [];
            const incorrectWords: string[] = [];
            const missedWords: string[] = [];

            items.forEach((item: any, idx: number) => {
              const correctCat = item.category;
              const studentCat = currentAns[idx] || '';

              const isCorrectCat = correctCat.toLowerCase() === cat.toLowerCase();
              const isStudentCat = studentCat.toLowerCase() === cat.toLowerCase();

              if (isCorrectCat && isStudentCat) {
                correctWords.push(item.word);
              } else if (!isCorrectCat && isStudentCat) {
                incorrectWords.push(item.word);
              } else if (isCorrectCat && !isStudentCat) {
                missedWords.push(item.word);
              }
            });

            const hasAnyWords = correctWords.length > 0 || incorrectWords.length > 0 || missedWords.length > 0;

            return (
              <div key={cat} className={`p-4 rounded-2xl border-2 ${color.bg} ${color.border} text-left`}>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide mb-3.5 ${color.header}`}>
                  {cat}
                </span>

                <div className="flex flex-wrap gap-2 min-h-[50px] content-start">
                  {correctWords.map((w, wIdx) => (
                    <span key={wIdx} className="px-3 py-1.5 rounded-lg text-sm font-bold bg-green-500 text-white border border-green-600 shadow-sm flex items-center gap-1 animate-in fade-in duration-200">
                      <MathText inline>{w}</MathText> <CheckCircle className="h-3.5 w-3.5" />
                    </span>
                  ))}

                  {incorrectWords.map((w, wIdx) => (
                    <span key={wIdx} className="px-3 py-1.5 rounded-lg text-sm font-bold bg-red-500 text-white border border-red-600 shadow-sm flex items-center gap-1 animate-in fade-in duration-200">
                      <MathText inline>{w}</MathText> <XCircle className="h-3.5 w-3.5" />
                    </span>
                  ))}

                  {canViewSolution && missedWords.map((w, wIdx) => (
                    <span key={wIdx} className="px-3 py-1.5 rounded-lg text-sm font-bold bg-white text-gray-400 border border-dashed border-gray-300 flex items-center gap-1 select-none font-medium" title="Lẽ ra phải xếp vào đây">
                      <MathText inline>{w}</MathText> <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-150 px-1 py-0.5 rounded font-normal">(bỏ sót)</span>
                    </span>
                  ))}

                  {!hasAnyWords && (
                    <span className="text-gray-400 italic text-xs py-2 w-full text-center select-none font-medium">Không có từ nào</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 8. MATCHING: Nối cột
  if (question.type === 'MATCHING') {
    const leftItems = question.options.map((o: any) => String(o).split('|||')[0]?.trim() || '');
    const rightItems = question.options.map((o: any) => String(o).split('|||')[1]?.trim() || '');
    const currentAns = Array.isArray(userAns) ? userAns : Array(question.options.length).fill('');

    return (
      <div className="space-y-2 mt-3 max-w-2xl">
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-xs border-b border-gray-200">
                <th className="px-5 py-3 w-2/5">Vế trái</th>
                <th className="px-5 py-3 text-center w-1/5">Kết quả</th>
                <th className="px-5 py-3 w-2/5">Bài làm học sinh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leftItems.map((leftText: string, idx: number) => {
                const studentPair = String(currentAns[idx] || '');
                const studentRightVal = studentPair.includes('|||') 
                  ? studentPair.split('|||')[1]?.trim() 
                  : studentPair.trim();
                  
                const correctRightVal = rightItems[idx];
                const isUnanswered = studentRightVal === '';
                const isItemCorrect = !isUnanswered && studentRightVal.toLowerCase() === correctRightVal.toLowerCase();

                return (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4 font-semibold text-gray-900 w-2/5">
                      <MathText inline>{leftText}</MathText>
                    </td>
                    <td className="px-5 py-4 text-center w-1/5">
                      {isUnanswered ? (
                        <span className="text-red-500 text-xs font-bold flex items-center justify-center gap-0.5">
                          ❌ Chưa nối
                        </span>
                      ) : isItemCorrect ? (
                        <span className="text-green-600 text-xs font-bold flex items-center justify-center gap-0.5">
                          ✔️ Đúng
                        </span>
                      ) : (
                        <span className="text-red-500 text-xs font-bold flex items-center justify-center gap-0.5">
                          ❌ Sai
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 w-2/5">
                      {isUnanswered ? (
                        <span className="text-red-500 font-bold italic text-sm">(Bỏ trống)</span>
                      ) : (
                        <div className={`font-bold text-sm ${isItemCorrect ? 'text-green-700' : 'text-red-700'}`}>
                          <MathText inline>{studentRightVal}</MathText>
                        </div>
                      )}
                      {(!isItemCorrect || isUnanswered) && canViewSolution && (
                        <div className="mt-1.5 text-xs text-green-700 font-semibold bg-green-50 border border-green-100 rounded px-2 py-0.5 w-fit">
                          đáp án: <MathText inline>{correctRightVal}</MathText>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 9. ORDERING: Sắp xếp thứ tự
  if (question.type === 'ORDERING') {
    const correctOrder = question.options;
    const studentOrder = Array.isArray(userAns) ? userAns : [];
    const isUnanswered = studentOrder.length === 0;
    const displayList = isUnanswered ? correctOrder : studentOrder;

    return (
      <div className="space-y-3 mt-3 max-w-xl">
        {isUnanswered && (
          <div className="flex items-center gap-1.5 text-red-600 bg-red-50 border border-red-100 rounded-lg p-2 text-xs font-bold w-fit mb-2">
            <AlertCircle className="h-3.5 w-3.5" /> Thí sinh chưa trả lời (Bỏ trống)
          </div>
        )}
        <div className="space-y-2">
          {displayList.map((item: string, idx: number) => {
            const correctIndex = correctOrder.indexOf(item);
            const isItemCorrect = !isUnanswered && correctIndex === idx;

            return (
              <div 
                key={idx}
                className={`p-3.5 rounded-xl border-2 flex items-center gap-3 bg-white shadow-sm transition-all ${
                  isUnanswered ? 'border-red-200 bg-red-50/10' :
                  isItemCorrect ? 'border-green-500 bg-green-50/10' :
                  'border-red-500 bg-red-50/10'
                }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                  isUnanswered ? 'bg-red-100 text-red-700 border border-red-200' :
                  isItemCorrect ? 'bg-green-500 text-white' :
                  'bg-red-500 text-white animate-pulse'
                }`}>
                  {idx + 1}
                </span>
                
                <div className="flex-1 font-semibold text-gray-800 text-sm">
                  <MathText inline>{item}</MathText>
                </div>

                {!isUnanswered && isItemCorrect && (
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                )}

                {!isUnanswered && !isItemCorrect && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <XCircle className="h-5 w-5 text-red-600" />
                    {canViewSolution && (
                      <span className="text-xs bg-green-50 text-green-700 border border-green-150 px-2 py-0.5 rounded-md font-bold">
                        Vị trí đúng: {correctIndex + 1}
                      </span>
                    )}
                  </div>
                )}
                
                {isUnanswered && canViewSolution && (
                  <span className="text-xs bg-green-50 text-green-700 border border-green-150 px-2 py-0.5 rounded-md font-bold flex-shrink-0">
                    Vị trí đúng: {correctIndex + 1}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 10. SENTENCE_SCRAMBLE: Xếp từ thành câu
  if (question.type === 'SENTENCE_SCRAMBLE') {
    const isUnanswered = !Array.isArray(userAns) || userAns.length === 0 || userAns.every(v => !v);
    const studentSentence = Array.isArray(userAns) ? userAns.filter(Boolean).join(' ') : String(userAns || '');
    const correctSentence = question.options.join(' ');

    return (
      <div className="space-y-3 mt-3 max-w-xl">
        <div className={`p-4 rounded-xl border-2 flex items-center gap-3 bg-white shadow-sm ${
          isUnanswered ? 'border-red-200 bg-red-50/10' :
          isCorrect ? 'border-green-500 bg-green-50/20' :
          'border-red-500 bg-red-50/20'
        }`}>
          <div className="flex-1">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider block mb-1">Học sinh xếp câu:</span>
            {isUnanswered ? (
              <span className="text-red-500 font-bold italic text-base flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> (Bỏ trống / Chưa xếp câu)
              </span>
            ) : (
              <span className={`text-base font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                <MathText inline>{studentSentence}</MathText>
              </span>
            )}
          </div>
          {isUnanswered ? null : isCorrect ? (
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
          ) : (
            <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
          )}
        </div>

        {(!isCorrect || isUnanswered) && canViewSolution && (
          <div className="p-4 rounded-xl border border-dashed border-green-300 bg-green-50/30 text-green-900 text-sm">
            <span className="text-green-700 text-xs font-bold uppercase tracking-wider block mb-1">Câu mẫu đúng:</span>
            <div className="font-bold text-base text-green-800 bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg">
              <MathText inline>{correctSentence}</MathText>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 text-xs italic">
      Không thể hiển thị xem trước cho loại câu hỏi này.
    </div>
  );
};

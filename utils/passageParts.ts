/**
 * Utility function to separate a question's passage text from its trailing or leading instructions.
 * Used across ExamTake, ExamResults, and ReadOnlyQuestionView.
 */
export const getPassageParts = (content: string): { instruction: string; passage: string } => {
  if (!content) return { instruction: '', passage: '' };
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

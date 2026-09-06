export const normalizeMath = (s: string): string => {
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

export const isValueMatchingOption = (actual: string, expectedOption: string, caseSensitive = false): boolean => {
  const normActual = caseSensitive ? actual.trim() : actual.trim().toLowerCase();
  const alternatives = expectedOption.split('|||').map(alt => caseSensitive ? alt.trim() : alt.trim().toLowerCase());
  return alternatives.includes(normActual);
};

export const getCommutativeGroups = (content: string, optionsLength: number): number[][] => {
  const cleanContent = content.replace(/\s*Đáp án:\s*[^\n]*$/i, '').trim();
  const parts = cleanContent.split(/\[__\]/);
  const numBlanks = parts.length - 1;
  const transitions: string[] = [];
  for (let i = 0; i < numBlanks - 1; i++) {
    transitions.push(parts[i + 1] || '');
  }
  
  const getOpType = (text: string) => {
    const clean = text.replace(/[\s$.:;?!)()]/g, '').toLowerCase();
    if (['nhân', '×', 'x', '*', '\\times', '\\cdot'].includes(clean)) {
      return 'M';
    }
    if (['cộng', '+'].includes(clean)) {
      return 'A';
    }
    return null;
  };
  
  const multLinks = new Set<number>();
  const addLinks = new Set<number>();
  
  for (let i = 0; i < transitions.length; i++) {
    const op = getOpType(transitions[i]);
    if (op === 'M') {
      multLinks.add(i);
    } else if (op === 'A') {
      addLinks.add(i);
    }
  }
  
  const parent = Array.from({ length: numBlanks }, (_, i) => i);
  const find = (i: number): number => {
    if (parent[i] === i) return i;
    return parent[i] = find(parent[i]);
  };
  const union = (i: number, j: number) => {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) {
      parent[rootI] = rootJ;
    }
  };
  
  multLinks.forEach(i => union(i, i + 1));
  
  const inMultGroup = new Set<number>();
  multLinks.forEach(i => {
    inMultGroup.add(i);
    inMultGroup.add(i + 1);
  });
  
  addLinks.forEach(i => {
    if (!inMultGroup.has(i) && !inMultGroup.has(i + 1)) {
      union(i, i + 1);
    }
  });
  
  const groupsMap = new Map<number, number[]>();
  for (let i = 0; i < numBlanks; i++) {
    const root = find(i);
    if (!groupsMap.has(root)) {
      groupsMap.set(root, []);
    }
    groupsMap.get(root)!.push(i);
  }
  
  const groups: number[][] = [];
  groupsMap.forEach(indices => {
    if (indices.length > 1) {
      groups.push(indices);
    }
  });
  return groups;
};

export const checkPermutationMatch = (actuals: string[], expecteds: string[], caseSensitive = false): boolean => {
  if (actuals.length !== expecteds.length) return false;
  const n = actuals.length;
  const visited = Array(n).fill(false);
  
  const match = (idx: number): boolean => {
    if (idx === n) return true;
    for (let j = 0; j < n; j++) {
      if (!visited[j]) {
        if (isValueMatchingOption(actuals[idx], expecteds[j], caseSensitive)) {
          visited[j] = true;
          if (match(idx + 1)) return true;
          visited[j] = false;
        }
      }
    }
    return false;
  };
  return match(0);
};

export const evaluateAnswer = (q: any, userAns: any, caseSensitive: boolean = false): boolean => {
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
    if (!Array.isArray(userAns)) return false;
    
    const groups = getCommutativeGroups(q.content, q.options.length);
    const checked = new Set<number>();
    
    for (const group of groups) {
      const expectedVals = group.map(idx => String(q.options[idx] || ''));
      const actualVals = group.map(idx => String(userAns[idx] || ''));
      if (!checkPermutationMatch(actualVals, expectedVals, false)) return false;
      group.forEach(idx => checked.add(idx));
    }
    
    for (let i = 0; i < numBlanks; i++) {
      if (checked.has(i)) continue;
      const expected = q.options[i];
      const actual = userAns[i];
      if (!isValueMatchingOption(String(actual || ''), String(expected || ''), false)) return false;
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
    if (!Array.isArray(userAns) || userAns.length < q.options.length) return false;
    for (let i = 0; i < q.options.length; i++) {
      const expectedParts = String(q.options[i] || '').split('|||');
      const correctCategory = (expectedParts[0] || '').trim().toLowerCase();
      const studentCategory = String(userAns[i] || '').trim().toLowerCase();

      if (correctCategory === '_none_' || correctCategory === 'none' || correctCategory === '') {
        if (studentCategory !== '' && studentCategory !== '_none_' && studentCategory !== 'none') return false;
      } else {
        if (studentCategory !== correctCategory) return false;
      }
    }
    return true;
  }

  if (q.type === 'FILL_IN_PASSAGE') {
    const numBlanks = (q.content.match(/\[__\]/g) || []).length;
    if (!Array.isArray(userAns)) return false;
    
    const groups = getCommutativeGroups(q.content, q.options.length);
    const checked = new Set<number>();
    
    for (const group of groups) {
      const expectedVals = group.map(idx => String(q.options[idx] || ''));
      const actualVals = group.map(idx => String(userAns[idx] || ''));
      if (!checkPermutationMatch(actualVals, expectedVals, caseSensitive)) return false;
      group.forEach(idx => checked.add(idx));
    }
    
    for (let i = 0; i < numBlanks; i++) {
      if (checked.has(i)) continue;
      const expected = q.options[i];
      const actual = userAns[i];
      if (!isValueMatchingOption(String(actual || ''), String(expected || ''), caseSensitive)) return false;
    }
    return true;
  }

  if (q.type === 'INLINE_DROPDOWN') {
    const numBlanks = (q.content.match(/\[__\]/g) || []).length;
    if (!Array.isArray(userAns)) return false;
    for (let i = 0; i < numBlanks; i++) {
      const rawOpt = String(q.options[i] || '');
      const expected = rawOpt.split('|||')[0].trim().toLowerCase();
      const actual = String(userAns[i] || '').trim().toLowerCase();
      if (actual !== expected) return false;
    }
    return true;
  }
  
  return false;
};

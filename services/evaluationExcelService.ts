import * as XLSX from 'xlsx';
import { User, DailyEvaluation, SubjectEvaluation, EvaluationRating } from '../types';
import { SUBJECT_LIST, COMPETENCY_LIST, QUALITY_LIST } from './evaluationStore';

// ============================================
// DATE RANGE PRESETS HELPER
// ============================================

export type TimeFilterPreset = 'single_date' | 'this_week' | 'this_month' | 'semester_1' | 'semester_2' | 'full_year' | 'custom';

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  label: string;
}

export const getDateRangePreset = (preset: TimeFilterPreset, refDateStr?: string, customFrom?: string, customTo?: string): DateRange => {
  const refDate = refDateStr ? new Date(refDateStr) : new Date();
  const year = refDate.getFullYear();
  const month = refDate.getMonth(); // 0-indexed

  // Format helper YYYY-MM-DD
  const formatIso = (d: Date): string => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  switch (preset) {
    case 'single_date': {
      const dateStr = refDateStr || formatIso(new Date());
      return { from: dateStr, to: dateStr, label: `Ngày ${dateStr.split('-').reverse().join('/')}` };
    }
    case 'this_week': {
      // Monday to Sunday of refDate
      const dayOfWeek = refDate.getDay(); // 0 is Sunday, 1 is Monday...
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(refDate);
      monday.setDate(refDate.getDate() + diffToMonday);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      return {
        from: formatIso(monday),
        to: formatIso(sunday),
        label: `Tuần này (${formatIso(monday).split('-').reverse().join('/')} - ${formatIso(sunday).split('-').reverse().join('/')})`,
      };
    }
    case 'this_month': {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      return {
        from: formatIso(firstDay),
        to: formatIso(lastDay),
        label: `Tháng ${month + 1}/${year}`,
      };
    }
    case 'semester_1': {
      // HK1: 05/09 to 15/01
      const academicStartYear = month < 6 ? year - 1 : year;
      const start = new Date(academicStartYear, 8, 5); // 05/09
      const end = new Date(academicStartYear + 1, 0, 15); // 15/01
      return {
        from: formatIso(start),
        to: formatIso(end),
        label: `Học kì 1 (${academicStartYear} - ${academicStartYear + 1})`,
      };
    }
    case 'semester_2': {
      // HK2: 16/01 to 31/05
      const academicStartYear = month < 6 ? year - 1 : year;
      const start = new Date(academicStartYear + 1, 0, 16); // 16/01
      const end = new Date(academicStartYear + 1, 4, 31); // 31/05
      return {
        from: formatIso(start),
        to: formatIso(end),
        label: `Học kì 2 (${academicStartYear} - ${academicStartYear + 1})`,
      };
    }
    case 'full_year': {
      const academicStartYear = month < 6 ? year - 1 : year;
      const start = new Date(academicStartYear, 8, 5); // 05/09
      const end = new Date(academicStartYear + 1, 4, 31); // 31/05
      return {
        from: formatIso(start),
        to: formatIso(end),
        label: `Cả năm học (${academicStartYear} - ${academicStartYear + 1})`,
      };
    }
    case 'custom': {
      const f = customFrom || formatIso(new Date());
      const t = customTo || formatIso(new Date());
      return {
        from: f,
        to: t,
        label: `Từ ${f.split('-').reverse().join('/')} đến ${t.split('-').reverse().join('/')}`,
      };
    }
    default:
      return { from: formatIso(new Date()), to: formatIso(new Date()), label: 'Hôm nay' };
  }
};

// ============================================
// NORMALIZE RATING HELPER
// ============================================

export const normalizeRating = (val: any, isSubject = false): EvaluationRating => {
  if (!val) return 'None';
  const str = String(val).trim().toUpperCase();

  // Subject ratings: T, H, C, None
  if (isSubject) {
    if (['T', 'TỐT', 'HOÀN THÀNH TỐT', 'HTT', 'TOT'].includes(str)) return 'T';
    if (['H', 'HT', 'HOÀN THÀNH', 'HOAN THANH', 'ĐẠT', 'DAT', 'Đ'].includes(str)) return 'H';
    if (['C', 'CHT', 'CHƯA HOÀN THÀNH', 'CHUA HOAN THANH', 'CHƯA ĐẠT', 'CHUA DAT'].includes(str)) return 'C';
    return 'None';
  }

  // Competencies / Qualities ratings: T, Đ, C, None
  if (['T', 'TỐT', 'TOT'].includes(str)) return 'T';
  if (['Đ', 'D', 'ĐẠT', 'DAT', 'H', 'HOÀN THÀNH'].includes(str)) return 'Đ';
  if (['C', 'CĐ', 'CD', 'CHƯA ĐẠT', 'CHUA DAT', 'CHƯA HOÀN THÀNH', 'CHT'].includes(str)) return 'C';
  return 'None';
};

// ============================================
// 1. EXPORT EVALUATION TEMPLATE (.xlsx)
// ============================================

export const exportEvaluationTemplate = (
  className: string,
  students: User[],
  targetDate?: string
) => {
  const dateFormatted = (targetDate || new Date().toISOString().split('T')[0]).split('-').reverse().join('/');

  // Row 1: Group Headers
  const row1 = [
    'THÔNG TIN HỌC SINH', '', '', '', 'ĐÁNH GIÁ CHUNG',
    ...Array(SUBJECT_LIST.length * 2).fill('MÔN HỌC VÀ HOẠT ĐỘNG GIÁO DỤC (TT27)'),
    ...Array(COMPETENCY_LIST.length * 2).fill('NĂNG LỰC CỐT LÕI (TT27)'),
    ...Array(QUALITY_LIST.length * 2).fill('PHẨM CHẤT CHỦ YẾU (TT27)'),
  ];

  // Row 2: Detailed Column Names
  const row2: string[] = [
    'STT',
    'Mã HS (Không sửa)',
    'Họ và tên',
    'Ngày nhận xét (DD/MM/YYYY)',
    'Nhận xét chung',
  ];

  SUBJECT_LIST.forEach(sub => {
    row2.push(`${sub.label} (Mức T/H/C)`);
    row2.push(`${sub.label} (Nhận xét)`);
  });

  COMPETENCY_LIST.forEach(comp => {
    row2.push(`${comp.label} (Mức T/Đ/C)`);
    row2.push(`${comp.label} (Nhận xét)`);
  });

  QUALITY_LIST.forEach(qual => {
    row2.push(`${qual.label} (Mức T/Đ/C)`);
    row2.push(`${qual.label} (Nhận xét)`);
  });

  // Data rows with students
  const dataRows = students.map((s, idx) => {
    const row: any[] = [
      idx + 1,
      s.id,
      s.name,
      dateFormatted,
      '', // Nhận xét chung
    ];
    // Empty cells for each subject, competency, quality
    const totalCols = (SUBJECT_LIST.length + COMPETENCY_LIST.length + QUALITY_LIST.length) * 2;
    for (let i = 0; i < totalCols; i++) {
      row.push('');
    }
    return row;
  });

  const wsData = [row1, row2, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  const colWidths = [
    { wch: 6 },  // STT
    { wch: 20 }, // Mã HS
    { wch: 25 }, // Họ tên
    { wch: 25 }, // Ngày
    { wch: 35 }, // Nhận xét chung
  ];
  for (let i = 0; i < (SUBJECT_LIST.length + COMPETENCY_LIST.length + QUALITY_LIST.length) * 2; i++) {
    colWidths.push(i % 2 === 0 ? { wch: 18 } : { wch: 32 });
  }
  ws['!cols'] = colWidths;

  // Sheet 2: Hướng dẫn quy ước
  const guideData = [
    ['HƯỚNG DẪN QUY ƯỚC ĐIỀN FILE NHẬN XÉT THƯỜNG XUYÊN (THÔNG TƯ 27/2021/TT-BGDĐT)'],
    [''],
    ['1. THÔNG TIN HỌC SINH:'],
    ['- Mã HS: Giữ nguyên mã HS được tạo tự động để hệ thống khớp đúng học sinh 100%.'],
    ['- Ngày nhận xét: Điền theo định dạng DD/MM/YYYY (ví dụ: 28/08/2026).'],
    [''],
    ['2. QUY ƯỚC MỨC ĐÁNH GIÁ MÔN HỌC (Toán, Tiếng Việt, Khoa học, LS&ĐL, Công nghệ, Đạo đức, HĐTN):'],
    ['- T: Hoàn thành tốt (Có thể viết T, Hoàn thành tốt, Tốt)'],
    ['- H: Hoàn thành (Có thể viết H, Hoàn thành, Đạt)'],
    ['- C: Chưa hoàn thành (Có thể viết C, Chưa hoàn thành)'],
    ['- Bỏ trống: Không đánh giá môn đó'],
    [''],
    ['3. QUY ƯỚC MỨC ĐÁNH GIÁ NĂNG LỰC & PHẨM CHẤT:'],
    ['- T: Tốt'],
    ['- Đ: Đạt (hoặc viết H, Hoàn thành)'],
    ['- C: Chưa đạt (hoặc Chưa hoàn thành)'],
    ['- Bỏ trống: Không đánh giá'],
    [''],
    ['4. LƯU Ý KHI NHẬP:'],
    ['- Giáo viên không nhất thiết phải nhận xét tất cả các môn/năng lực mỗi ngày.'],
    ['- Chỉ cần điền những mục cần nhận xét, các ô để trống hệ thống sẽ giữ nguyên.'],
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
  wsGuide['!cols'] = [{ wch: 80 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Danh Sách Nhận Xét');
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Hướng Dẫn Quy Ước');

  const cleanClassName = className.replace(/[^a-zA-Z0-9_\-]/g, '_');
  XLSX.writeFile(wb, `Mau_Nhan_Xet_${cleanClassName}_${Date.now()}.xlsx`);
};

// ============================================
// 2. EXPORT EVALUATIONS REPORT TO EXCEL (.xlsx)
// ============================================

export const exportEvaluationsToExcel = (
  className: string,
  timeFilterLabel: string,
  students: User[],
  evaluations: DailyEvaluation[]
) => {
  // Map student evaluations
  const studentEvalMap: Record<string, DailyEvaluation[]> = {};
  evaluations.forEach(ev => {
    if (!studentEvalMap[ev.student_id]) {
      studentEvalMap[ev.student_id] = [];
    }
    studentEvalMap[ev.student_id].push(ev);
  });

  // Sheet 1: Tổng hợp danh sách học sinh
  const row1 = [
    'THÔNG TIN HỌC SINH', '', '', 'TỔNG HỢP NHẬN XÉT', 'ĐÁNH GIÁ CHUNG',
    ...Array(SUBJECT_LIST.length * 2).fill('MÔN HỌC VÀ HOẠT ĐỘNG GIÁO DỤC (TT27)'),
    ...Array(COMPETENCY_LIST.length * 2).fill('NĂNG LỰC CỐT LÕI (TT27)'),
    ...Array(QUALITY_LIST.length * 2).fill('PHẨM CHẤT CHỦ YẾU (TT27)'),
  ];

  const row2: string[] = [
    'STT',
    'Mã HS',
    'Họ và tên',
    'Số lần nhận xét',
    'Nhận xét chung gần nhất',
  ];

  SUBJECT_LIST.forEach(sub => {
    row2.push(`${sub.label} (Mức)`);
    row2.push(`${sub.label} (Nhận xét)`);
  });

  COMPETENCY_LIST.forEach(comp => {
    row2.push(`${comp.label} (Mức)`);
    row2.push(`${comp.label} (Nhận xét)`);
  });

  QUALITY_LIST.forEach(qual => {
    row2.push(`${qual.label} (Mức)`);
    row2.push(`${qual.label} (Nhận xét)`);
  });

  const dataRows = students.map((s, idx) => {
    const sEvals = studentEvalMap[s.id] || [];
    const latestEval = sEvals.length > 0 ? sEvals[sEvals.length - 1] : null;

    const row: any[] = [
      idx + 1,
      s.id,
      s.name,
      sEvals.length,
      latestEval?.general_comment || '',
    ];

    // Môn học
    SUBJECT_LIST.forEach(sub => {
      const subEval = latestEval?.subjects?.[sub.key];
      row.push(subEval && subEval.rating !== 'None' ? subEval.rating : '');
      row.push(subEval?.comment || '');
    });

    // Năng lực
    COMPETENCY_LIST.forEach(comp => {
      const compEval = latestEval?.competencies?.[comp.key];
      row.push(compEval && compEval.rating !== 'None' ? compEval.rating : '');
      row.push(compEval?.comment || '');
    });

    // Phẩm chất
    QUALITY_LIST.forEach(qual => {
      const qualEval = latestEval?.qualities?.[qual.key];
      row.push(qualEval && qualEval.rating !== 'None' ? qualEval.rating : '');
      row.push(qualEval?.comment || '');
    });

    return row;
  });

  const wsSummary = XLSX.utils.aoa_to_sheet([row1, row2, ...dataRows]);

  // Sheet 2: Nhật ký chi tiết từng ngày
  const detailHeaders = [
    'STT',
    'Ngày nhận xét',
    'Mã HS',
    'Họ và tên học sinh',
    'Nhận xét chung',
    ...SUBJECT_LIST.flatMap(s => [`${s.label} (Mức)`, `${s.label} (Nhận xét)`]),
    ...COMPETENCY_LIST.flatMap(c => [`${c.label} (Mức)`, `${c.label} (Nhận xét)`]),
    ...QUALITY_LIST.flatMap(q => [`${q.label} (Mức)`, `${q.label} (Nhận xét)`]),
  ];

  const detailRows: any[] = [];
  evaluations.forEach((ev, idx) => {
    const student = students.find(s => s.id === ev.student_id);
    const dateFormatted = ev.evaluation_date.split('-').reverse().join('/');

    const row: any[] = [
      idx + 1,
      dateFormatted,
      ev.student_id,
      student?.name || 'Chưa rõ',
      ev.general_comment || '',
    ];

    SUBJECT_LIST.forEach(sub => {
      const subEval = ev.subjects?.[sub.key];
      row.push(subEval && subEval.rating !== 'None' ? subEval.rating : '');
      row.push(subEval?.comment || '');
    });

    COMPETENCY_LIST.forEach(comp => {
      const compEval = ev.competencies?.[comp.key];
      row.push(compEval && compEval.rating !== 'None' ? compEval.rating : '');
      row.push(compEval?.comment || '');
    });

    QUALITY_LIST.forEach(qual => {
      const qualEval = ev.qualities?.[qual.key];
      row.push(qualEval && qualEval.rating !== 'None' ? qualEval.rating : '');
      row.push(qualEval?.comment || '');
    });

    detailRows.push(row);
  });

  const wsDetails = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Bảng Tổng Hợp');
  XLSX.utils.book_append_sheet(wb, wsDetails, 'Nhật Ký Chi Tiết');

  const cleanClassName = className.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const cleanFilterLabel = timeFilterLabel.replace(/[^a-zA-Z0-9_\-]/g, '_');
  XLSX.writeFile(wb, `Bao_Cao_Nhan_Xet_${cleanClassName}_${cleanFilterLabel}_${Date.now()}.xlsx`);
};

// ============================================
// 3. PARSE EVALUATION EXCEL FILE (.xlsx, .xls, .csv)
// ============================================

export interface ParsedStudentEvaluation {
  student_id: string;
  student_name: string;
  isMatched: boolean;
  evaluation_date: string;
  general_comment: string;
  subjects: Record<string, SubjectEvaluation>;
  competencies: Record<string, SubjectEvaluation>;
  qualities: Record<string, SubjectEvaluation>;
  hasContent: boolean;
  error?: string;
}

export const parseEvaluationExcelFile = async (
  file: File,
  students: User[],
  defaultDate: string
): Promise<{ success: boolean; results: ParsedStudentEvaluation[]; error?: string }> => {
  try {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });

    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      return { success: false, results: [], error: 'File Excel không có dữ liệu bảng tính.' };
    }

    // Read first sheet
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });

    if (!rawData || rawData.length < 2) {
      return { success: false, results: [], error: 'File không đủ dữ liệu hoặc thiếu dòng tiêu đề.' };
    }

    // Find header row (either row 0 or row 1)
    let headerRowIdx = 0;
    for (let r = 0; r < Math.min(5, rawData.length); r++) {
      const row = rawData[r] || [];
      const rowText = row.join(' ').toLowerCase();
      if (rowText.includes('họ và tên') || rowText.includes('họ tên') || rowText.includes('mã hs') || rowText.includes('toán')) {
        headerRowIdx = r;
        break;
      }
    }

    const headers: string[] = (rawData[headerRowIdx] || []).map((h: any) => String(h).trim().toLowerCase());

    // Map column indices
    const colMap = {
      id: headers.findIndex(h => h.includes('mã hs') || h.includes('mã học sinh') || h === 'id' || h.includes('id hs')),
      name: headers.findIndex(h => h.includes('họ và tên') || h.includes('họ tên') || h.includes('tên học sinh') || h === 'tên'),
      date: headers.findIndex(h => h.includes('ngày nhận xét') || h.includes('ngày') || h === 'date'),
      generalComment: headers.findIndex(h => h.includes('nhận xét chung') || h.includes('đánh giá chung') || h.includes('nhận xét tổng quát')),
      subjects: {} as Record<string, { ratingCol: number; commentCol: number }>,
      competencies: {} as Record<string, { ratingCol: number; commentCol: number }>,
      qualities: {} as Record<string, { ratingCol: number; commentCol: number }>,
    };

    // Helper to find column index by matching aliases
    const findCol = (aliases: string[]): number => {
      return headers.findIndex(h => aliases.some(alias => h.includes(alias)));
    };

    // Map Subjects
    SUBJECT_LIST.forEach(sub => {
      const subLower = sub.label.toLowerCase();
      let ratingCol = -1;
      let commentCol = -1;

      headers.forEach((h, idx) => {
        if (h.includes(subLower) || (sub.key === 'hdtn' && (h.includes('hđtn') || h.includes('trải nghiệm')))) {
          if (h.includes('mức') || h.includes('đánh giá') || h.includes('rating') || h.includes('t/h/c')) {
            ratingCol = idx;
          } else if (h.includes('nhận xét') || h.includes('lời nhận xét') || h.includes('comment')) {
            commentCol = idx;
          } else if (ratingCol === -1) {
            ratingCol = idx;
          }
        }
      });

      if (ratingCol !== -1 || commentCol !== -1) {
        colMap.subjects[sub.key] = { ratingCol, commentCol };
      }
    });

    // Map Competencies
    COMPETENCY_LIST.forEach(comp => {
      const compLower = comp.label.toLowerCase();
      let ratingCol = -1;
      let commentCol = -1;

      headers.forEach((h, idx) => {
        if (h.includes(compLower) || (comp.key === 'tu_chu_tu_hoc' && h.includes('tự chủ')) || (comp.key === 'giao_tiep_hop_tac' && h.includes('giao tiếp')) || (comp.key === 'gqvd_sang_tao' && (h.includes('giải quyết') || h.includes('gqvd')))) {
          if (h.includes('mức') || h.includes('đánh giá') || h.includes('rating') || h.includes('t/đ/c')) {
            ratingCol = idx;
          } else if (h.includes('nhận xét') || h.includes('lời nhận xét') || h.includes('comment')) {
            commentCol = idx;
          } else if (ratingCol === -1) {
            ratingCol = idx;
          }
        }
      });

      if (ratingCol !== -1 || commentCol !== -1) {
        colMap.competencies[comp.key] = { ratingCol, commentCol };
      }
    });

    // Map Qualities
    QUALITY_LIST.forEach(qual => {
      const qualLower = qual.label.toLowerCase();
      let ratingCol = -1;
      let commentCol = -1;

      headers.forEach((h, idx) => {
        if (h.includes(qualLower)) {
          if (h.includes('mức') || h.includes('đánh giá') || h.includes('rating') || h.includes('t/đ/c')) {
            ratingCol = idx;
          } else if (h.includes('nhận xét') || h.includes('lời nhận xét') || h.includes('comment')) {
            commentCol = idx;
          } else if (ratingCol === -1) {
            ratingCol = idx;
          }
        }
      });

      if (ratingCol !== -1 || commentCol !== -1) {
        colMap.qualities[qual.key] = { ratingCol, commentCol };
      }
    });

    // Parse data rows
    const results: ParsedStudentEvaluation[] = [];

    for (let r = headerRowIdx + 1; r < rawData.length; r++) {
      const row = rawData[r] || [];
      if (!row || row.every((c: any) => c === '' || c === undefined || c === null)) {
        continue;
      }

      const rawId = colMap.id !== -1 ? String(row[colMap.id] || '').trim() : '';
      const rawName = colMap.name !== -1 ? String(row[colMap.name] || '').trim() : '';
      const rawDate = colMap.date !== -1 ? String(row[colMap.date] || '').trim() : '';
      const generalComment = colMap.generalComment !== -1 ? String(row[colMap.generalComment] || '').trim() : '';

      if (!rawId && !rawName) continue;

      // Match student in class
      let matchedStudent = students.find(s => rawId && String(s.id).trim() === rawId);
      if (!matchedStudent && rawName) {
        const normRawName = rawName.toLowerCase().replace(/\s+/g, ' ');
        matchedStudent = students.find(s => s.name.toLowerCase().replace(/\s+/g, ' ') === normRawName);
      }

      // Parse Date (support DD/MM/YYYY or YYYY-MM-DD or defaultDate)
      let evalDate = defaultDate;
      if (rawDate) {
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(rawDate)) {
          const [d, m, y] = rawDate.split('/');
          evalDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        } else if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(rawDate)) {
          evalDate = rawDate;
        }
      }

      const subjects: Record<string, SubjectEvaluation> = {};
      let hasSubjectContent = false;
      SUBJECT_LIST.forEach(sub => {
        const mapping = colMap.subjects[sub.key];
        const ratingRaw = mapping && mapping.ratingCol !== -1 ? row[mapping.ratingCol] : '';
        const commentRaw = mapping && mapping.commentCol !== -1 ? row[mapping.commentCol] : '';
        const rating = normalizeRating(ratingRaw, true);
        const comment = String(commentRaw || '').trim();
        if (rating !== 'None' || comment) hasSubjectContent = true;
        subjects[sub.key] = { rating, comment };
      });

      const competencies: Record<string, SubjectEvaluation> = {};
      let hasCompContent = false;
      COMPETENCY_LIST.forEach(comp => {
        const mapping = colMap.competencies[comp.key];
        const ratingRaw = mapping && mapping.ratingCol !== -1 ? row[mapping.ratingCol] : '';
        const commentRaw = mapping && mapping.commentCol !== -1 ? row[mapping.commentCol] : '';
        const rating = normalizeRating(ratingRaw, false);
        const comment = String(commentRaw || '').trim();
        if (rating !== 'None' || comment) hasCompContent = true;
        competencies[comp.key] = { rating, comment };
      });

      const qualities: Record<string, SubjectEvaluation> = {};
      let hasQualContent = false;
      QUALITY_LIST.forEach(qual => {
        const mapping = colMap.qualities[qual.key];
        const ratingRaw = mapping && mapping.ratingCol !== -1 ? row[mapping.ratingCol] : '';
        const commentRaw = mapping && mapping.commentCol !== -1 ? row[mapping.commentCol] : '';
        const rating = normalizeRating(ratingRaw, false);
        const comment = String(commentRaw || '').trim();
        if (rating !== 'None' || comment) hasQualContent = true;
        qualities[qual.key] = { rating, comment };
      });

      const hasContent = !!(generalComment || hasSubjectContent || hasCompContent || hasQualContent);

      results.push({
        student_id: matchedStudent ? matchedStudent.id : rawId,
        student_name: matchedStudent ? matchedStudent.name : rawName || 'Không rõ tên',
        isMatched: !!matchedStudent,
        evaluation_date: evalDate,
        general_comment: generalComment,
        subjects,
        competencies,
        qualities,
        hasContent,
        error: !matchedStudent ? 'Không tìm thấy học sinh này trong lớp' : undefined,
      });
    }

    return { success: true, results };
  } catch (err: any) {
    console.error('Lỗi khi đọc file Excel nhận xét:', err);
    return { success: false, results: [], error: err.message || 'Lỗi định dạng khi xử lý file Excel.' };
  }
};

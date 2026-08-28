import React, { useState, useRef, useMemo } from 'react';
import { User, DailyEvaluation } from '../../types';
import { useEvaluationStore } from '../../services/evaluationStore';
import {
  parseEvaluationExcelFile,
  ParsedStudentEvaluation,
} from '../../services/evaluationExcelService';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  X,
  Loader2,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  Sparkles,
} from 'lucide-react';

interface EvaluationImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  classId: string;
  teacherId: string;
  students: User[];
  currentSelectedDate: string;
  onImportSuccess: () => void;
}

export const EvaluationImportModal: React.FC<EvaluationImportModalProps> = ({
  isOpen,
  onClose,
  className,
  classId,
  teacherId,
  students,
  currentSelectedDate,
  onImportSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedStudentEvaluation[]>([]);
  
  // Date assignment mode
  const [dateMode, setDateMode] = useState<'use_file_date' | 'selected_date' | 'custom_date'>('use_file_date');
  const [customDate, setCustomDate] = useState(currentSelectedDate);
  
  // Overwrite mode
  const [overwriteMode, setOverwriteMode] = useState<'merge' | 'overwrite'>('merge');

  // Preview filter
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { saveEvaluation, saveBatchEvaluation } = useEvaluationStore();

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsParsing(true);
    setParseError(null);

    try {
      const res = await parseEvaluationExcelFile(file, students, currentSelectedDate);
      if (!res.success) {
        setParseError(res.error || 'Không thể đọc nội dung file Excel.');
        setParsedRows([]);
      } else {
        setParsedRows(res.results);
      }
    } catch (err: any) {
      setParseError(err.message || 'Lỗi khi xử lý file Excel.');
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Stats
  const validRows = parsedRows.filter(r => r.isMatched);
  const invalidRows = parsedRows.filter(r => !r.isMatched);

  const filteredPreviewRows = useMemo(() => {
    if (previewFilter === 'valid') return validRows;
    if (previewFilter === 'invalid') return invalidRows;
    return parsedRows;
  }, [parsedRows, validRows, invalidRows, previewFilter]);

  const handleConfirmImport = async () => {
    if (validRows.length === 0) {
      alert('Không có học sinh nào hợp lệ để nhập nhận xét.');
      return;
    }

    setIsSaving(true);
    try {
      let successCount = 0;

      for (const row of validRows) {
        let targetEvalDate = currentSelectedDate;
        if (dateMode === 'use_file_date' && row.evaluation_date) {
          targetEvalDate = row.evaluation_date;
        } else if (dateMode === 'custom_date') {
          targetEvalDate = customDate;
        }

        const payload: Omit<DailyEvaluation, 'id' | 'created_at' | 'updated_at'> = {
          student_id: row.student_id,
          teacher_id: teacherId,
          class_id: classId,
          evaluation_date: targetEvalDate,
          subjects: row.subjects,
          competencies: row.competencies,
          qualities: row.qualities,
          general_comment: row.general_comment,
        };

        const ok = await saveEvaluation(payload);
        if (ok) successCount++;
      }

      alert(`Đã nhập thành công nhận xét cho ${successCount}/${validRows.length} học sinh.`);
      onImportSuccess();
      onClose();
    } catch (err) {
      console.error('Lỗi khi lưu nhận xét từ Excel:', err);
      alert('Có lỗi xảy ra trong quá trình lưu dữ liệu. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-850 dark:to-slate-850">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-sm">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 dark:text-slate-100 text-base">
                Tải lên File Nhận xét Excel
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">Lớp: {className} • Thông tư 27</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* File Upload Zone */}
          {!selectedFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 hover:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/10 rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group"
            >
              <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-md text-indigo-600 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="h-8 w-8" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-gray-800 dark:text-slate-200">
                  Nhấn để chọn file hoặc kéo thả vào đây
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  Hỗ trợ định dạng file: <span className="font-bold text-indigo-600">.xlsx, .xls, .csv</span>
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/20 rounded-2xl border border-indigo-200 dark:border-indigo-900/40 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <FileSpreadsheet className="h-6 w-6 text-indigo-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 dark:text-slate-100 truncate">{selectedFile.name}</p>
                  <p className="text-[11px] text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB • {parsedRows.length} dòng dữ liệu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all"
              >
                Chọn file khác
              </button>
            </div>
          )}

          {isParsing && (
            <div className="p-8 text-center space-y-2">
              <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs font-bold text-gray-600">Đang phân tích cấu trúc file Excel...</p>
            </div>
          )}

          {parseError && (
            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-2xl flex items-start gap-3 text-red-700 dark:text-red-300 text-xs">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Lỗi đọc file</p>
                <p className="mt-0.5">{parseError}</p>
              </div>
            </div>
          )}

          {/* Options & Preview after Parsing */}
          {parsedRows.length > 0 && !isParsing && (
            <div className="space-y-4">
              {/* Target Date Selector */}
              <div className="p-4 bg-gray-50 dark:bg-slate-850 rounded-2xl border border-gray-200 dark:border-slate-800 space-y-2.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                  Thời điểm ghi nhận nhận xét
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    dateMode === 'use_file_date'
                      ? 'border-indigo-500 bg-white dark:bg-slate-900 font-bold text-indigo-700 shadow-sm'
                      : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="dateMode"
                      checked={dateMode === 'use_file_date'}
                      onChange={() => setDateMode('use_file_date')}
                      className="text-indigo-600"
                    />
                    <span>Lấy ngày từ file Excel</span>
                  </label>

                  <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    dateMode === 'selected_date'
                      ? 'border-indigo-500 bg-white dark:bg-slate-900 font-bold text-indigo-700 shadow-sm'
                      : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="dateMode"
                      checked={dateMode === 'selected_date'}
                      onChange={() => setDateMode('selected_date')}
                      className="text-indigo-600"
                    />
                    <span>Ngày đang chọn ({currentSelectedDate.split('-').reverse().join('/')})</span>
                  </label>

                  <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    dateMode === 'custom_date'
                      ? 'border-indigo-500 bg-white dark:bg-slate-900 font-bold text-indigo-700 shadow-sm'
                      : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="dateMode"
                      checked={dateMode === 'custom_date'}
                      onChange={() => setDateMode('custom_date')}
                      className="text-indigo-600"
                    />
                    <span>Chọn ngày khác</span>
                  </label>
                </div>

                {dateMode === 'custom_date' && (
                  <div className="pt-2">
                    <input
                      type="date"
                      value={customDate}
                      onChange={e => setCustomDate(e.target.value)}
                      className="border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Preview Summary Bar */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      previewFilter === 'all'
                        ? 'bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-600'
                    }`}
                  >
                    Tất cả ({parsedRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('valid')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                      previewFilter === 'valid'
                        ? 'bg-green-600 text-white'
                        : 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                    }`}
                  >
                    <CheckCircle className="h-3 w-3" /> Hợp lệ ({validRows.length})
                  </button>
                  {invalidRows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPreviewFilter('invalid')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                        previewFilter === 'invalid'
                          ? 'bg-amber-600 text-white'
                          : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      <AlertTriangle className="h-3 w-3" /> Chưa khớp ({invalidRows.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 dark:bg-slate-850 sticky top-0 border-b border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Học sinh</th>
                      <th className="py-2.5 px-3">Ngày</th>
                      <th className="py-2.5 px-3">Nhận xét chung</th>
                      <th className="py-2.5 px-3 text-center">Môn / Năng lực</th>
                      <th className="py-2.5 px-3 text-right">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {filteredPreviewRows.map((r, idx) => {
                      // Count evaluated subjects/comps
                      const activeSubjects = Object.values(r.subjects).filter(s => s.rating !== 'None' || s.comment).length;
                      const activeComps = Object.values(r.competencies).filter(c => c.rating !== 'None' || c.comment).length;
                      const activeQuals = Object.values(r.qualities).filter(q => q.rating !== 'None' || q.comment).length;
                      const totalItems = activeSubjects + activeComps + activeQuals;

                      return (
                        <tr key={idx} className={`hover:bg-slate-50 dark:hover:bg-slate-850/50 ${!r.isMatched ? 'bg-amber-50/30' : ''}`}>
                          <td className="py-2 px-3">
                            <p className="font-bold text-gray-900 dark:text-slate-100">{r.student_name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{r.student_id}</p>
                          </td>
                          <td className="py-2 px-3 text-gray-600 dark:text-slate-400 whitespace-nowrap">
                            {r.evaluation_date.split('-').reverse().join('/')}
                          </td>
                          <td className="py-2 px-3 max-w-[180px] truncate text-gray-700 dark:text-slate-300" title={r.general_comment}>
                            {r.general_comment || <span className="text-gray-400 italic">Trống</span>}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {totalItems > 0 ? (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 dark:border-indigo-900/30">
                                {totalItems} mục
                              </span>
                            ) : (
                              <span className="text-gray-400 text-[10px]">Chỉ NX chung</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {r.isMatched ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-600">
                                <CheckCircle className="h-3.5 w-3.5" /> Khớp HS
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600" title="Không tìm thấy HS này trong lớp">
                                <AlertTriangle className="h-3.5 w-3.5" /> Bỏ qua
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-850 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {validRows.length > 0 && (
              <span>Sẵn sàng nhập <strong className="text-indigo-600">{validRows.length}</strong> học sinh</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={validRows.length === 0 || isSaving}
              className="px-5 py-2.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Xác nhận nhập dữ liệu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

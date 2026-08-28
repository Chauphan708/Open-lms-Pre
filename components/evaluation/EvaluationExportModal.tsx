import React, { useState, useEffect, useMemo } from 'react';
import { User, DailyEvaluation } from '../../types';
import { useEvaluationStore } from '../../services/evaluationStore';
import {
  TimeFilterPreset,
  getDateRangePreset,
  exportEvaluationTemplate,
  exportEvaluationsToExcel,
} from '../../services/evaluationExcelService';
import {
  Download,
  FileSpreadsheet,
  Calendar,
  Filter,
  CheckCircle,
  X,
  Loader2,
  Clock,
  BookOpen,
  FileText,
} from 'lucide-react';

interface EvaluationExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  classId: string;
  students: User[];
  currentSelectedDate: string;
}

export const EvaluationExportModal: React.FC<EvaluationExportModalProps> = ({
  isOpen,
  onClose,
  className,
  classId,
  students,
  currentSelectedDate,
}) => {
  const [exportType, setExportType] = useState<'template' | 'data'>('data');
  const [timePreset, setTimePreset] = useState<TimeFilterPreset>('this_month');
  const [customFrom, setCustomFrom] = useState(currentSelectedDate);
  const [customTo, setCustomTo] = useState(currentSelectedDate);
  const [isExporting, setIsExporting] = useState(false);
  const [fetchedEvaluations, setFetchedEvaluations] = useState<DailyEvaluation[]>([]);
  const [isLoadingEvals, setIsLoadingEvals] = useState(false);

  const { evaluations, fetchEvaluationsByRange } = useEvaluationStore();

  // Compute actual date range based on preset
  const dateRange = useMemo(() => {
    return getDateRangePreset(timePreset, currentSelectedDate, customFrom, customTo);
  }, [timePreset, currentSelectedDate, customFrom, customTo]);

  // Fetch evaluations when date range changes
  useEffect(() => {
    if (!isOpen || !classId || exportType === 'template') return;

    let isMounted = true;
    setIsLoadingEvals(true);

    const loadData = async () => {
      try {
        await fetchEvaluationsByRange(classId, dateRange.from, dateRange.to);
      } catch (err) {
        console.error('Lỗi khi tải nhận xét theo khoảng thời gian:', err);
      } finally {
        if (isMounted) setIsLoadingEvals(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [isOpen, classId, dateRange.from, dateRange.to, exportType, fetchEvaluationsByRange]);

  if (!isOpen) return null;

  const handleDownload = () => {
    setIsExporting(true);
    try {
      if (exportType === 'template') {
        exportEvaluationTemplate(className, students, currentSelectedDate);
      } else {
        exportEvaluationsToExcel(className, dateRange.label, students, evaluations);
      }
      onClose();
    } catch (error) {
      console.error('Lỗi khi xuất file Excel:', error);
      alert('Không thể xuất file Excel. Vui lòng thử lại.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-850 dark:to-slate-850">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-sm">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 dark:text-slate-100 text-base">
                Tải về File Nhận xét Excel
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">Lớp: {className} • {students.length} học sinh</p>
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
          {/* 1. Chọn loại file cần tải */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              1. Chọn loại file xuất
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportType('data')}
                className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1.5 transition-all ${
                  exportType === 'data'
                    ? 'border-emerald-500 bg-emerald-50/60 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-600 dark:text-emerald-200 shadow-sm ring-2 ring-emerald-500/20'
                    : 'border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <FileText className={`h-5 w-5 ${exportType === 'data' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`} />
                  {exportType === 'data' && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                </div>
                <span className="font-bold text-sm">Xuất dữ liệu nhận xét</span>
                <span className="text-[11px] text-gray-500 dark:text-slate-400">Bảng tổng hợp & nhật ký chi tiết các đánh giá</span>
              </button>

              <button
                type="button"
                onClick={() => setExportType('template')}
                className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1.5 transition-all ${
                  exportType === 'template'
                    ? 'border-emerald-500 bg-emerald-50/60 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-600 dark:text-emerald-200 shadow-sm ring-2 ring-emerald-500/20'
                    : 'border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <FileSpreadsheet className={`h-5 w-5 ${exportType === 'template' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`} />
                  {exportType === 'template' && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                </div>
                <span className="font-bold text-sm">File mẫu nhập liệu</span>
                <span className="text-[11px] text-gray-500 dark:text-slate-400">Có sẵn danh sách học sinh để điền offline</span>
              </button>
            </div>
          </div>

          {/* 2. Bộ lọc thời gian (Chỉ hiện khi chọn xuất dữ liệu) */}
          {exportType === 'data' && (
            <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-emerald-600" />
                  2. Bộ lọc mốc thời gian
                </label>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                  {dateRange.label}
                </span>
              </div>

              {/* Presets Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {[
                  { key: 'single_date', label: 'Ngày chọn' },
                  { key: 'this_week', label: 'Tuần này' },
                  { key: 'this_month', label: 'Tháng này' },
                  { key: 'semester_1', label: 'Học kì 1' },
                  { key: 'semester_2', label: 'Học kì 2' },
                  { key: 'full_year', label: 'Cả năm' },
                  { key: 'custom', label: 'Tùy chỉnh' },
                ].map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setTimePreset(p.key as TimeFilterPreset)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border text-center ${
                      timePreset === p.key
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Inputs */}
              {timePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-200 dark:border-slate-700 animate-in fade-in">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-slate-400 mb-1">Từ ngày:</label>
                    <input
                      type="date"
                      value={customFrom}
                      onChange={e => setCustomFrom(e.target.value)}
                      className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-slate-400 mb-1">Đến ngày:</label>
                    <input
                      type="date"
                      value={customTo}
                      onChange={e => setCustomTo(e.target.value)}
                      className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Quick Summary Banner */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-gray-600 dark:text-slate-300">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  <span>Dữ liệu nhận xét tìm thấy:</span>
                </div>
                {isLoadingEvals ? (
                  <span className="flex items-center gap-1 text-gray-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang đếm...
                  </span>
                ) : (
                  <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                    {evaluations.length} bản ghi
                  </span>
                )}
              </div>
            </div>
          )}

          {exportType === 'template' && (
            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-xs text-emerald-800 dark:text-emerald-300 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-600" /> File mẫu đã tích hợp:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-[11px] text-gray-600 dark:text-slate-400">
                <li>Danh sách {students.length} học sinh của lớp {className}.</li>
                <li>Đầy đủ các cột Môn học, Năng lực, Phẩm chất theo TT27.</li>
                <li>Sheet hướng dẫn quy ước ký hiệu đánh giá chi tiết.</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-850 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isExporting}
            className="px-5 py-2.5 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exportType === 'template' ? 'Tải File Mẫu (.xlsx)' : 'Tải File Nhận Xét (.xlsx)'}
          </button>
        </div>
      </div>
    </div>
  );
};
